// SPDX-License-Identifier: AGPL-3.0-only
// Sharpen it: levels 2 to 10 of the self-serve journey (level 1 is the five questions in js/journey.js). Each level is
// a few taps, says which numbers it unlocks, and writes fields the coach app already has, so the engines in js/math
// read them with no new math and nothing is asked twice. Levels can be done in any order; nothing is locked.
// Pure: no DOM. A level is:
//   { n, id, title, why, unlocks: [words], fields(doc, ref) -> [field], read(doc, ref) -> { id: value },
//     write(store, values, ref), done(doc), skip(doc) -> words when there is nothing to answer (it counts as done) }
// A field is { id, label, type: 'money' | 'pct' | 'pick', options (pick: [[value, label]]; pct: [numbers]),
//   picks (money: one-tap amounts), when(values) -> shown }.
import { applyFastTrack, fastTrackAnswers } from './fasttrack.js';

const has = v => v !== null && v !== undefined && v !== '';
const num = v => (has(v) && Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : null);
const recs = (doc, pred) => (doc.records || []).filter(pred);
const job = doc => recs(doc, r => r.kind === 'income')[0] ?? null;
const owed = doc => recs(doc, r => r.kind === 'debt' && (r.values?.balance ?? 0) > 0 && !r.linkedTo); // a loan on a home or car is asked with it, in level 7
const loanOn = (doc, type) => { const a = recs(doc, r => r.kind === 'asset' && r.type === type)[0]; return a ? recs(doc, r => r.kind === 'debt' && r.linkedTo === a.id)[0] ?? null : null; };
const invested = doc => recs(doc, r => r.kind === 'account' && r.values?.group === 'investment');
const WEEKS = 52 / 12; // hours are asked by the week and kept by the month, as the coach app keeps them

// Level 2: the three needs, as lines beside the gut number (the gut number stays the total).
const NEEDS = [['Accommodation', 'rent', 'Rent or mortgage', [800, 1200, 1600, 2000, 2500]], ['Food', 'food', 'Food, in and out', [300, 500, 700, 900]], ['Transportation', 'transport', 'Getting around', [100, 200, 400, 600]]];
const needLine = (doc, letter) => recs(doc, r => r.kind === 'bill' && r.values?.draftt === letter && has(r.amount))[0] ?? null;
const NEED_LINE = { Accommodation: ['Rent', 'Rent or mortgage'], Food: ['Food', 'Groceries'], Transportation: ['Getting around', 'Transit'] }; // one plain line for each need

// Level 5: where the invested money sits.
export const BUCKETS = [['401(k)', 'k401', 'Work plan, 401(k) or similar'], ['Roth IRA', 'roth', 'Roth IRA'], ['Traditional IRA', 'ira', 'Traditional or rollover IRA'], ['Brokerage', 'brokerage', 'Brokerage (a regular investing account)'], ['HSA', 'hsa', 'HSA']];
export const BUCKET_KIND = { '401(k)': 'Taxed later', '403(b)': 'Taxed later', 457: 'Taxed later', TSP: 'Taxed later', 'Traditional IRA': 'Taxed later', 'Rollover IRA': 'Taxed later', SEP: 'Taxed later', 'Solo 401(k)': 'Taxed later', 'Roth IRA': 'Never taxed again', HSA: 'Never taxed again', Brokerage: 'Reachable any time', Crypto: 'Reachable any time' };

export const LEVELS = [
  { n: 2, id: 'where', title: 'Where it goes', why: 'Three needs: housing, food and getting around.', unlocks: ['Housing share of your pay', 'Lean FI'],
    fields: () => NEEDS.map(([, id, label, picks]) => ({ id, label, type: 'money', picks })),
    read: doc => Object.fromEntries(NEEDS.map(([letter, id]) => [id, needLine(doc, letter)?.amount ?? null])),
    write(store, v, ref) {
      store.transaction('Where it goes', () => {
        for (const [letter, id] of NEEDS) {
          const amount = num(v[id]); if (amount === null) continue;
          const line = needLine(store.doc, letter), [name, category] = NEED_LINE[letter];
          if (line) store.update(line.id, { amount });
          else store.add('bill', { name, amount, status: 'Roughly', values: { category, draftt: letter } });
        }
      });
    },
    done: doc => NEEDS.every(([letter]) => needLine(doc, letter)), skip: () => null },

  { n: 3, id: 'owe', title: 'What your debt costs', why: 'The rate and the payment on each debt.', unlocks: ['Your real debt-free date', 'Interest you will pay'],
    fields: doc => owed(doc).flatMap(d => [
      { id: `apr:${d.id}`, label: `${d.name.replace(/ \(total\)$/, '')}: interest rate`, type: 'pct', options: d.type === 'Credit card' ? [0, 0.18, 0.22, 0.25, 0.29] : [0.03, 0.05, 0.07, 0.09, 0.12] },
      { id: `pay:${d.id}`, label: `${d.name.replace(/ \(total\)$/, '')}: what you pay a month`, type: 'money', picks: [50, 100, 200, 300, 500] }]),
    read: doc => Object.fromEntries(owed(doc).flatMap(d => [[`apr:${d.id}`, d.fieldStatus?.apr === 'Not sure' ? null : d.values.apr ?? null], [`pay:${d.id}`, d.values.payment ?? null]])),
    write(store, v) {
      store.transaction('What your debt costs', () => {
        for (const d of owed(store.doc)) {
          const apr = num(v[`apr:${d.id}`]), payment = num(v[`pay:${d.id}`]);
          if (apr !== null) { store.update(d.id, { apr }); store.setFieldStatus(d.id, 'apr', 'Know it'); }
          if (payment !== null) store.update(d.id, { payment, ...(d.type === 'Credit card' ? { payChoice: 'Custom' } : {}) });
        }
      });
    },
    done: doc => owed(doc).every(d => has(d.values.apr) && d.fieldStatus?.apr !== 'Not sure' && has(d.values.payment)),
    skip: doc => (owed(doc).length ? null : 'No debt on file, so there is nothing to answer here.') },

  { n: 4, id: 'work', title: 'Your plan at work', why: 'What you put into a 401(k), and what your job adds.', unlocks: ['Your true savings rate', 'Free money from a match'],
    fields: (doc, ref) => [
      { id: 'contributionPct', label: 'How much of your pay goes into a 401(k)?', type: 'pct', options: [0, 0.03, 0.05, 0.06, 0.1, 0.15] },
      { id: 'match', label: 'Does your job match it?', type: 'pick', options: [['none', 'No match'], ...(ref.lists?.matchPicks || []).map((m, i) => [`m${i}`, m.label]), ['unknown', 'Not sure']] }],
    read(doc, ref) {
      const v = job(doc)?.values || {}, picks = ref.lists?.matchPicks || [];
      const at = picks.findIndex(m => m.rate === v.matchPct && m.upTo === v.matchCapPct);
      return { contributionPct: v.contributionPct ?? null, match: v.hasMatch === 'No' ? 'none' : v.hasMatch === "Don't know" ? 'unknown' : v.hasMatch === 'Yes' && at >= 0 ? `m${at}` : null };
    },
    write(store, v, ref) {
      const j = job(store.doc); if (!j) return;
      const m = /^m\d+$/.test(v.match ?? '') ? ref.lists.matchPicks[Number(v.match.slice(1))] : null;
      store.update(j.id, { ...(num(v.contributionPct) !== null ? { contributionPct: num(v.contributionPct) } : {}),
        ...(m ? { hasMatch: 'Yes', matchPct: m.rate, matchCapPct: m.upTo } : v.match === 'none' ? { hasMatch: 'No', matchPct: null, matchCapPct: null } : v.match === 'unknown' ? { hasMatch: "Don't know" } : {}) });
    },
    done: doc => has(job(doc)?.values?.hasMatch) && has(job(doc)?.values?.contributionPct),
    skip: () => null },

  { n: 5, id: 'accounts', title: 'Where your investments sit', why: 'Split what you have invested by account.', unlocks: ['Your tax buckets', 'Money you can reach before 59 and a half'],
    fields: () => BUCKETS.map(([, id, label]) => ({ id, label, type: 'money', picks: null })),
    read: doc => Object.fromEntries(BUCKETS.map(([type, id]) => { const rows = invested(doc).filter(r => r.type === type || (type === 'Traditional IRA' && r.type === 'Rollover IRA')); return [id, rows.length ? rows.reduce((s, r) => s + (r.values.balance ?? 0), 0) : null]; })),
    write(store, v) {
      const typed = BUCKETS.filter(([, id]) => num(v[id]) !== null);
      if (!typed.length) return;
      store.transaction('Where your investments sit', () => {
        for (const r of invested(store.doc).filter(x => x.type === 'All investments')) store.remove(r.id);
        for (const [type, id] of typed) {
          const row = invested(store.doc).find(r => r.type === type);
          if (row) store.update(row.id, { balance: num(v[id]) });
          else if (num(v[id]) > 0) store.add('account', { name: type, values: { group: 'investment', balance: num(v[id]) } }, { type });
        }
      });
    },
    done: doc => invested(doc).length > 0 && !invested(doc).some(r => r.type === 'All investments' && (r.values.balance ?? 0) > 0),
    skip: doc => (invested(doc).some(r => (r.values.balance ?? 0) > 0) ? null : 'Nothing invested yet, so there is nothing to split.') },

  { n: 6, id: 'time', title: 'Your time', why: 'The hours your job really takes.', unlocks: ['Your real hourly wage', 'Any price in hours of your life'],
    fields: () => [
      { id: 'paid', label: 'Hours you work in a usual week', type: 'pick', options: [20, 30, 40, 45, 50, 60].map(h => [h, String(h)]) },
      { id: 'commute', label: 'Hours a week getting there and back', type: 'pick', options: [0, 2, 5, 8, 10].map(h => [h, String(h)]) },
      { id: 'costs', label: 'What work costs you a month (commute, clothes, lunches)', type: 'money', picks: [0, 100, 200, 400] }],
    read(doc) { const h = doc.profile?.hours || {}; const wk = v => (has(v) ? Math.round(v / WEEKS) : null); return { paid: wk(h.paidHours), commute: wk(h.commuteHours), costs: h.workCosts ?? null }; },
    write(store, v) {
      const h = { ...(store.doc.profile?.hours || {}) };
      if (num(v.paid) !== null) h.paidHours = num(v.paid) * WEEKS;
      if (num(v.commute) !== null) h.commuteHours = num(v.commute) * WEEKS;
      if (num(v.costs) !== null) h.workCosts = num(v.costs);
      store.setDoc('profile', { hours: h });
    },
    done: doc => has(doc.profile?.hours?.paidHours), skip: () => null },

  { n: 7, id: 'own', title: 'What you own', why: 'A home and a car, and what is owed on them.', unlocks: ['Your full net worth'],
    fields: () => [
      { id: 'housing', label: 'Your home', type: 'pick', options: [['Rent', 'I rent'], ['Own', 'I own'], ['Family', 'I live with family']] },
      { id: 'homeValue', label: 'What the home is worth', type: 'money', picks: null, when: v => v.housing === 'Own' },
      { id: 'mortgageBalance', label: 'What is left on the mortgage', type: 'money', picks: [0], when: v => v.housing === 'Own' },
      { id: 'mortgageApr', label: 'Mortgage interest rate', type: 'pct', options: [0.03, 0.04, 0.05, 0.06, 0.07], when: v => v.housing === 'Own' && num(v.mortgageBalance) > 0 },
      { id: 'mortgagePayment', label: 'Mortgage payment a month', type: 'money', picks: null, when: v => v.housing === 'Own' && num(v.mortgageBalance) > 0 },
      { id: 'hasCar', label: 'Do you have a car?', type: 'pick', options: [[true, 'Yes'], [false, 'No']] },
      { id: 'carValue', label: 'What the car is worth', type: 'money', picks: [5000, 10000, 20000, 30000], when: v => v.hasCar === true },
      { id: 'carLoanBalance', label: 'What is left on the car loan', type: 'money', picks: [0], when: v => v.hasCar === true },
      { id: 'carLoanApr', label: 'Car loan interest rate', type: 'pct', options: [0.03, 0.05, 0.07, 0.09, 0.12], when: v => v.hasCar === true && num(v.carLoanBalance) > 0 },
      { id: 'carLoanPayment', label: 'Car payment a month', type: 'money', picks: [200, 300, 400, 500, 600], when: v => v.hasCar === true && num(v.carLoanBalance) > 0 }],
    read(doc) { const a = fastTrackAnswers(doc); return { housing: a.housing, homeValue: a.homeValue, mortgageBalance: a.mortgageBalance ?? (a.homeLoan === 'Paid off' ? 0 : null), hasCar: a.hasCar, carValue: a.carValue, carLoanBalance: a.carLoanBalance,
      mortgageApr: loanOn(doc, 'Home')?.values.apr ?? null, mortgagePayment: a.mortgagePayment ?? null, carLoanApr: loanOn(doc, 'Car')?.values.apr ?? null, carLoanPayment: a.carLoanPayment ?? null }; },
    write(store, v) {
      const pos = k => (num(v[k]) > 0 ? num(v[k]) : null);
      applyFastTrack(store, { housing: v.housing ?? null, hasCar: v.hasCar ?? null, homeValue: num(v.homeValue), mortgageBalance: pos('mortgageBalance'), homeLoan: v.housing === 'Own' && num(v.mortgageBalance) === 0 ? 'Paid off' : null, carValue: num(v.carValue), carLoanBalance: pos('carLoanBalance'),
        mortgagePayment: pos('mortgageBalance') ? num(v.mortgagePayment) : null, carLoanPayment: pos('carLoanBalance') ? num(v.carLoanPayment) : null });
      for (const [type, key] of [['Home', 'mortgageApr'], ['Car', 'carLoanApr']]) { const loan = loanOn(store.doc, type); if (loan && num(v[key]) !== null) { store.update(loan.id, { apr: num(v[key]) }); store.setFieldStatus(loan.id, 'apr', 'Know it'); } }
    },
    done: doc => has(doc.profile?.housing) && (doc.profile?.hasCar === true || doc.profile?.hasCar === false), skip: () => null },

  { n: 8, id: 'taxes', title: 'Taxes', why: 'How you file.', unlocks: ['Your tax rate', 'What your next dollar is taxed at'],
    fields: () => [{ id: 'filingStatus', label: 'How do you file your taxes?', type: 'pick', options: [['Single', 'Single'], ['Married jointly', 'Married, together'], ['Married separately', 'Married, separately'], ['Head of household', 'Head of household']] }],
    read: doc => ({ filingStatus: doc.taxes?.filingStatus ?? null }),
    write(store, v) { if (has(v.filingStatus)) store.setDoc('taxes', { filingStatus: v.filingStatus }); },
    done: doc => has(doc.taxes?.filingStatus), skip: () => null },

  { n: 9, id: 'safety', title: 'Your safety net', why: 'How steady your pay is, and your health cover.', unlocks: ['big e sized to how steady your pay is'],
    fields: () => [
      { id: 'incomeStability', label: 'Your pay, month to month', type: 'pick', options: [['Steady', 'About the same'], ['Varies', 'It moves around'], ['Unpredictable', 'Hard to predict']] },
      { id: 'healthCoverage', label: 'Your health cover', type: 'pick', options: [['Employer', 'Through work'], ['ACA', 'Marketplace'], ["Parent's plan", "A parent's plan"], ['Medicaid', 'Medicaid'], ['None', 'None right now']] }],
    read: doc => ({ incomeStability: doc.profile?.incomeStability ?? null, healthCoverage: doc.profile?.healthCoverage ?? null }),
    write(store, v) { store.setDoc('profile', { ...(has(v.incomeStability) ? { incomeStability: v.incomeStability } : {}), ...(has(v.healthCoverage) ? { healthCoverage: v.healthCoverage } : {}) }); },
    done: doc => has(doc.profile?.incomeStability) && has(doc.profile?.healthCoverage), skip: () => null },

  { n: 10, id: 'finish', title: 'The finish line', why: 'What life after work looks like.', unlocks: ['An FI number built on your later spending', 'Barista FI with your own part-time pay', 'A Social Security estimate'],
    fields: () => [
      { id: 'fiAge', label: 'The latest you want work to be optional', type: 'pick', options: [45, 50, 55, 60, 65].map(a => [a, `Age ${a}`]) },
      { id: 'retirementSpending', label: 'Spending a month once work is optional', type: 'money', picks: null },
      { id: 'partTimeIncome', label: 'Part-time pay a month you would enjoy earning', type: 'money', picks: [0, 500, 1000, 2000] }],
    read: doc => ({ fiAge: doc.assumptions?.fiAge ?? null, retirementSpending: doc.assumptions?.retirementSpending ?? null, partTimeIncome: doc.assumptions?.partTimeIncome ?? null }),
    write(store, v) { store.setDoc('assumptions', { ...(has(v.fiAge) ? { fiAge: Number(v.fiAge) } : {}), ...(num(v.retirementSpending) !== null ? { retirementSpending: num(v.retirementSpending) } : {}), ...(num(v.partTimeIncome) !== null ? { partTimeIncome: num(v.partTimeIncome) } : {}) }); },
    done: doc => has(doc.assumptions?.fiAge), skip: () => null },
];

export const levelOf = id => LEVELS.find(l => l.id === id || l.n === id) ?? null;
// Where each level stands: { n, id, title, why, unlocks, state: 'done' | 'skip' | 'open', note }. A level with nothing
// to answer (no debt, nothing invested) counts as done and says why.
export function levelsOf(doc) {
  return LEVELS.map(l => { const note = l.skip(doc), done = !note && l.done(doc); return { n: l.n, id: l.id, title: l.title, why: l.why, unlocks: l.unlocks, state: note ? 'skip' : done ? 'done' : 'open', note }; });
}
// Levels finished out of ten (level 1 is the five questions).
export function sharpnessOf(doc, firstDone) {
  const L = levelsOf(doc), done = L.filter(l => l.state !== 'open').length + (firstDone ? 1 : 0);
  return { done, total: LEVELS.length + 1, next: L.find(l => l.state === 'open') ?? null };
}
