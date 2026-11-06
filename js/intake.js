// SPDX-License-Identifier: AGPL-3.0-only
// Import intake: read the Google Form's responses CSV (one row per response), map each answer through the intake
// registry (js/registry/intake.js), list what SLAM would do with it for the coach to review (Yes or No on each
// line, as with Bring a spreadsheet back), and apply what was kept as one undo step, after a snapshot. Money lands
// through Fast Track (js/fasttrack.js applyFastTrack), so the records are the same ones a Fast Track run makes.
// Status rules: a range is its midpoint, marked Gut (stored Not sure, shown as Guess); a typed number is Roughly;
// a tap that answers a gate is Know it; "I'll find it and tell you" goes on the Homework list (Will get it);
// "I'm not sure" lands nowhere and goes into one parking-lot note, to ask on the call. Pure: no DOM.
import { parseCsv, money as moneyOf } from './import/csv.js';
import { SECTIONS, QUESTIONS, WHY, STATUS_IN_SLAM, ACCOUNT_COLUMNS } from './registry/intake.js';
import { applyFastTrack, fastTrackAnswers, FT_DEBTS, firstWord } from './fasttrack.js';
import { setHouseholdMode } from './couples.js';
import { syncCount, LOAN_FOR } from './gates.js';
import { LATER } from './homework.js';
import { SAVINGS_TYPES } from './registry/fields.js';

const blank = v => v === null || v === undefined || String(v).trim() === '';
export const norm = s => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();

// The column a question's answer sits in: its title (a grid row: "title [row]"), or any older title in aka.
const titlesOf = q => [q.title, ...(q.aka || [])].map(norm);
export function columnsOf(headers) {
  const at = new Map(headers.map((h, i) => [norm(h), i]));
  const cols = {};
  const used = new Set();
  for (const q of Object.values(QUESTIONS)) {
    if (q.type === 'grid') {
      for (const [type, label] of q.rows) {
        const i = titlesOf(q).map(t => at.get(norm(`${t} [${label}]`))).find(x => x !== undefined);
        if (i !== undefined) { (cols[q.id] ??= {})[type] = i; used.add(i); }
      }
      continue;
    }
    const i = titlesOf(q).map(t => at.get(t)).find(x => x !== undefined);
    if (i !== undefined) { cols[q.id] = i; used.add(i); }
  }
  const time = headers.findIndex(h => /^timestamp$/i.test(String(h).trim()));
  if (time >= 0) used.add(time);
  const email = headers.findIndex(h => /^email address$/i.test(String(h).trim()));
  if (email >= 0) used.add(email);
  const unknown = headers.map((h, i) => ({ h, i })).filter(x => !used.has(x.i) && !blank(x.h)).map(x => x.h);
  return { cols, time, unknown };
}

// Every response in the file, newest first, each with its name and when it was sent (the coach picks one).
export function readIntake(text) {
  const rows = parseCsv(text);
  if (!rows.length) return { responses: [], unknown: [], problem: 'The file is empty.' };
  const [headers, ...body] = rows;
  const { cols, time, unknown } = columnsOf(headers);
  if (!Object.keys(cols).length) return { responses: [], unknown, problem: 'No column in this file matches an intake question. Download the responses from the intake form\'s Sheet: File, Download, Comma-separated values (.csv).' };
  const responses = body.map((row, n) => {
    const answers = {};
    for (const [id, c] of Object.entries(cols)) {
      if (typeof c === 'object') { const g = {}; for (const [type, i] of Object.entries(c)) if (!blank(row[i])) g[type] = row[i].trim(); if (Object.keys(g).length) answers[id] = g; }
      else if (!blank(row[c])) answers[id] = row[c].trim();
    }
    return { row: n + 2, at: time >= 0 ? row[time] ?? null : null, name: answers['about.name'] ?? null, answers };
  }).filter(r => Object.keys(r.answers).length);
  return { responses: responses.reverse(), unknown, problem: responses.length ? null : 'The file has the intake columns but no answers yet.' };
}

// One answer to the choice it names. A checkbox answer is several labels joined with ", " (labels can hold commas
// themselves), so the known labels are taken out longest first and what is left is the Other box's words.
const choiceOf = (q, raw) => q.choices.find(c => norm(c.label) === norm(raw)) ?? null;
export function checkedOf(q, raw) {
  let rest = ` ${String(raw ?? '')} `;
  const picked = [];
  for (const c of [...q.choices].sort((a, b) => b.label.length - a.label.length)) {
    const i = rest.indexOf(c.label);
    if (i < 0) continue;
    picked.push(c);
    rest = `${rest.slice(0, i)}${rest.slice(i + c.label.length)}`;
  }
  const other = rest.split(',').map(s => s.trim()).filter(Boolean).join(', ') || null;
  return { picked: q.choices.filter(c => picked.includes(c)), other };
}

// What one answer means: { kind, value, status, said }. kind: range, exact, tap, none, find or unsure.
export function meaningOf(q, raw) {
  if (q.type === 'number') {
    const n = moneyOf(raw);
    return n === null ? { kind: 'unsure', value: null, status: null, said: raw } : { kind: 'exact', value: Math.abs(n), status: 'Roughly', said: raw };
  }
  if (q.type === 'text' || q.type === 'paragraph') return { kind: 'tap', value: String(raw).trim(), status: 'Know it', said: raw };
  if (q.type === 'checkbox') {
    const { picked, other } = checkedOf(q, raw);
    const unsure = picked.some(c => c.kind === 'unsure');
    return { kind: unsure && picked.length === 1 && !other ? 'unsure' : 'tap', value: picked.filter(c => c.kind !== 'unsure').map(c => c.value), other, status: 'Know it', said: raw };
  }
  if (q.type === 'grid') {
    const counts = {};
    for (const [type, cell] of Object.entries(raw)) { const col = ACCOUNT_COLUMNS.find(([l]) => norm(l) === norm(cell)); if (col) counts[type] = col[1]; }
    return { kind: 'tap', value: counts, status: 'Know it', said: Object.entries(counts).map(([t, n]) => `${t}: ${n}`).join(', ') };
  }
  const c = choiceOf(q, raw);
  if (!c) return { kind: 'unknown', value: null, status: null, said: raw };
  const status = c.kind === 'range' ? 'Gut' : c.kind === 'find' ? 'homework' : c.kind === 'unsure' ? null : q.status === 'Gut' && c.kind === 'tap' && c.value === null ? null : 'Know it';
  return { kind: c.kind, value: c.value, status, said: c.label, choice: c };
}

// What each money target is called in SLAM, for the review and the homework list.
const FT_WORDS = { takeHome: 'Take-home pay', gut: 'Monthly spending, all in', checking: 'Checking balance', savings: 'Savings balance', invested: 'Invested, all accounts',
  homeValue: 'Home value', mortgageBalance: 'Mortgage owed', mortgagePayment: 'Mortgage payment a month', carValue: 'Car value', carLoanBalance: 'Car loan owed',
  carLoanPayment: 'Car loan payment a month', housing: 'Housing', gutIncludesDebt: 'Spending includes debt payments' };
const DEBT_WORDS = Object.fromEntries(FT_DEBTS.map(([t, l]) => [t, l]));
const PROFILE_WORDS = { birthYear: 'Birth year', state: 'State', dependents: 'Dependents', hasPets: 'Pets', workSituation: 'Work situation' };
const OTHER_WORDS = { value: 'Other property value', owed: 'Other property loan owed', payment: 'Other property loan a month' };
export function slamLabel(q) {
  const t = q.to;
  if (t.name) return 'Client name';
  if (t.ft) return FT_WORDS[t.ft];
  if (t.debt) return `${DEBT_WORDS[t.debt[0]]}: ${t.debt[1] === 'balance' ? 'owed' : 'paying a month'}`;
  if (t.profile) return PROFILE_WORDS[t.profile] ?? t.profile;
  if (t.mode) return 'Household';
  if (t.why) return { whyNow: 'Why now: what prompted this', worry: 'Why now: biggest worry', goalWords: 'Why now: goal' }[t.why];
  if (t.words) return { whyNow: 'What prompted this, in their words', worry: 'Biggest worry, in their words', goalWords: 'Goal, in their words' }[t.words];
  if (t.pay) return 'Take-home is per';
  if (t.benefits) return 'HSA-eligible plan, FSA, equity pay';
  if (t.otherIncome) return t.otherIncome === 'amount' ? 'Other income a month' : 'Other income: from';
  if (t.property) return OTHER_WORDS[t.property];
  if (t.counts) return 'Investment accounts: how many of each';
  if (t.assume) return 'FI age';
  if (t.note) return 'Anything else (a parking-lot note)';
  return q.id;
}

// The Fast Track value SLAM has now for a target, so the review can say what it would replace.
function nowOf(q, ft, doc) {
  const t = q.to;
  if (t.ft === 'gutIncludesDebt') return ft.gut === null ? null : ft.gutIncludesDebt; // a default, until there is a gut number
  if (t.ft) return ft[t.ft] ?? null;
  if (t.debt) return ft.debts?.[t.debt[0]]?.[t.debt[1]] ?? null;
  if (t.profile) return doc.profile?.[t.profile] ?? null;
  if (t.mode) return doc.profile?.mode ?? null;
  if (t.name) return null;
  if (t.assume) return doc.assumptions?.[t.assume] ?? null;
  return null;
}

// The review: one line per answer that would change something, grouped by the form's sections. A line whose number
// SLAM already has starts at No (a typed number is never replaced by a guess unless the coach says Yes).
export function planIntake(response, doc) {
  const ft = fastTrackAnswers(doc);
  const lines = [];
  const unsure = [];
  for (const s of SECTIONS) for (const q of s.questions) {
    const raw = response.answers[q.id];
    if (raw === undefined) continue;
    const m = meaningOf(q, raw);
    if (m.kind === 'unknown') { lines.push({ qid: q.id, section: s.title, label: slamLabel(q), said: m.said, kind: 'unknown', decision: 'skip', note: 'Not one of the form\'s answers (was the question edited?). Left out.' }); continue; }
    if (m.kind === 'unsure' && q.type !== 'checkbox') { unsure.push(slamLabel(q)); continue; }
    if (q.to.otherIncome === 'type' && !m.value.length) continue;
    if (m.kind === 'tap' && m.value === null) continue; // Just show me when I could: nothing to set
    if (q.type === 'checkbox' && !m.value.length && !m.other) { unsure.push(slamLabel(q)); continue; }
    const was = nowOf(q, ft, doc);
    const same = was !== null && JSON.stringify(was) === JSON.stringify(m.value);
    if (same) continue;
    lines.push({ qid: q.id, section: s.title, label: slamLabel(q), said: m.said, kind: m.kind, value: m.value, other: m.other ?? null, status: m.status, choice: m.choice ?? null,
      was: was === '' ? null : was, decision: was !== null && m.kind !== 'find' && !q.to.why && !q.to.words ? 'skip' : 'keep' });
  }
  if (unsure.length) lines.push({ qid: 'unsure', section: 'To ask on the call', label: 'A parking-lot note', said: `Not sure yet: ${unsure.join(', ')}`, kind: 'note', value: unsure, decision: 'keep' });
  return { name: response.name, at: response.at, lines };
}
export const keptLines = plan => plan.lines.filter(l => l.decision === 'keep' && l.kind !== 'unknown');

// Why now (batch 10's chips): the form's labels are the chips, word for word; Other's words go to chipOther and the
// chip Other is turned on; the "in your own words" box goes to the question's own words (profile.whyNow, worry,
// goalWords), kept with anything already typed there. Chips already on stay on.
export function whyPatch(p, key, chips = [], other = null, words = null) {
  const had = Array.isArray(p?.chips?.[key]) ? p.chips[key] : [];
  const add = [...chips.filter(c => WHY[key].includes(c)), ...(other ? ['Other'] : [])];
  const patch = {};
  if (add.length) patch.chips = { ...(p?.chips || {}), [key]: [...had, ...add.filter(c => !had.includes(c))] };
  if (other) { const was = p?.chipOther?.[key]; patch.chipOther = { ...(p?.chipOther || {}), [key]: was && !was.includes(other) ? `${was}; ${other}` : was || other }; }
  if (words) { const was = p?.[key]; patch[key] = was && !String(was).includes(words) ? `${was}; ${words}` : was || words; }
  return patch;
}

// Apply the kept lines to a client, as one undo step, after a snapshot. Returns how many lines were applied.
export function applyIntake(store, plan, { ref, metrics = null, now = new Date().toISOString(), sid = 'S1' } = {}) {
  const list = keptLines(plan);
  if (!list.length) return 0;
  const by = Object.fromEntries(list.map(l => [l.qid, l]));
  const val = id => (by[id] ? by[id].value : undefined);
  store.snapshot('Before intake import', metrics);
  const was = store.source;
  store.source = 'intake';
  try {
    store.transaction('Intake import', () => {
      const before = new Map(store.doc.records.map(r => [r.id, JSON.stringify(r)]));
      // About you
      const prof = {};
      const name = val('about.name');
      if (name) {
        const parts = name.trim().split(/\s+/);
        if (!store.doc.client?.name || /^(new client|from (the )?intake)/i.test(store.doc.client.name)) store.setDoc('client', { name });
        prof.firstName = firstWord(name);
        if (parts.length > 1) prof.lastName = parts.slice(1).join(' ');
      }
      for (const l of list) if (QUESTIONS[l.qid]?.to.profile) prof[QUESTIONS[l.qid].to.profile] = l.value;
      if (by['work.benefits']?.value === false) Object.assign(prof, { hsaEligible: false, fsa: false, equityPay: false });
      if (by['benefits.which']) { const on = by['benefits.which'].value; for (const k of ['hsaEligible', 'fsa', 'equityPay']) prof[k] = on.includes(k); }
      for (const key of Object.keys(WHY)) {
        const chipQ = Object.values(QUESTIONS).find(q => q.to.why === key), wordQ = Object.values(QUESTIONS).find(q => q.to.words === key);
        const c = by[chipQ.id], w = by[wordQ.id];
        if (c || w) { const x = whyPatch({ ...store.doc.profile, ...prof }, key, c?.value ?? [], c?.other ?? null, w?.value ?? null); Object.assign(prof, x); }
      }
      if (by['about.household']) setHouseholdMode(store, by['about.household'].value);

      // Money, through Fast Track: only what was kept, so nothing else moves.
      const a = { debts: Object.fromEntries(FT_DEBTS.map(([t]) => [t, { balance: null, payment: null }])) };
      const homework = [];
      const mark = [];
      const paidOff = new Set();
      for (const l of list) {
        const q = QUESTIONS[l.qid];
        if (!q) continue;
        const target = q.to.ft ? { ft: q.to.ft } : q.to.debt ? { debt: q.to.debt } : null;
        if (!target) continue;
        if (l.choice?.paidOff) { paidOff.add(q.to.ft); continue; }
        if (l.choice?.noCar) { a.hasCar = false; continue; }
        if (l.kind === 'none' && ['savings', 'invested'].includes(target.ft)) continue; // none: no row (the area says so)
        const v = l.kind === 'find' ? null : l.value;
        if (target.ft) a[target.ft] = v; else if (l.kind !== 'none') a.debts[target.debt[0]][target.debt[1]] = v;
        if (l.kind === 'find') homework.push(target); else if (l.status === 'Gut' || l.status === 'Roughly') mark.push({ ...target, status: STATUS_IN_SLAM[l.status] });
      }
      if (paidOff.has('mortgageBalance')) a.mortgagePayment = null;
      if (paidOff.has('carLoanBalance')) a.carLoanPayment = null;
      if (by['car.value'] && !by['car.value'].choice?.noCar) a.hasCar = true;
      if (by['pay.per']?.kind === 'tap') Object.assign(a, by['pay.per'].value);
      if (by['pay.per']?.kind === 'find' && !by['pay.takeHome']) homework.push({ ft: 'takeHome' });
      const debtNone = ['debt.cards', 'debt.student', 'debt.other'].filter(id => by[id]?.kind === 'none').length;
      if (debtNone === 3 && !a.carLoanBalance && !a.mortgageBalance) a.noDebts = true;
      if (val('fi.age') != null) a.fiAge = val('fi.age');
      store.setDoc('profile', prof);
      applyFastTrack(store, a, { now });
      if (store.doc.settings?.fastTrack) store.setDoc('settings', { fastTrack: { ...store.doc.settings.fastTrack, from: 'intake' } });

      // Each target's row: made when the client will find the number (so Will get it has a row to sit on).
      const one = pred => store.find(pred)[0] ?? null;
      const asset = type => one(r => r.kind === 'asset' && r.type === type) ?? store.add('asset', { name: type, values: { value: null } }, { type });
      const loan = type => { const as = asset(type); return one(r => r.kind === 'debt' && r.linkedTo === as.id) ?? (store.update(as.id, { financed: 'Financed' }), store.add('debt', { name: `${type} loan`, linkedTo: as.id, values: { balance: null } }, { type: LOAN_FOR[type] })); };
      const ROW = {
        takeHome: () => [one(r => r.kind === 'income') ?? store.add('income', { name: 'Take-home pay', values: { basis: 'Take-home' } }, { type: 'Job' }), 'amount'],
        gut: () => [one(r => r.kind === 'spending' && r.type === 'All in') ?? store.add('spending', { name: 'Monthly spending, all in', values: { pass: 'Gut' } }, { type: 'All in' }), 'amount'],
        checking: () => [one(r => r.kind === 'account' && r.type === 'Checking') ?? store.add('account', { name: 'Checking', values: { group: 'cash' } }, { type: 'Checking' }), 'balance'],
        savings: () => [one(r => r.kind === 'account' && SAVINGS_TYPES.includes(r.type)) ?? store.add('account', { name: 'Savings', values: { group: 'cash' } }, { type: 'Savings' }), 'balance'],
        invested: () => [one(r => r.kind === 'account' && r.values.group === 'investment') ?? store.add('account', { name: 'Investments (all accounts)', values: { group: 'investment' } }, { type: 'All investments' }), 'balance'],
        homeValue: () => [asset('Home'), 'value'], carValue: () => [asset('Car'), 'value'],
        mortgageBalance: () => [loan('Home'), 'balance'], mortgagePayment: () => [loan('Home'), 'payment'],
        carLoanBalance: () => [loan('Car'), 'balance'], carLoanPayment: () => [loan('Car'), 'payment'],
      };
      const rowOf = t => (t.ft ? ROW[t.ft]?.() : [one(r => r.kind === 'debt' && r.type === t.debt[0]) ?? store.add('debt', { name: `${DEBT_WORDS[t.debt[0]]} (total)`, values: { balance: null } }, { type: t.debt[0] }), t.debt[1]]);
      for (const t of mark) { const x = rowOf(t); if (x) store.setFieldStatus(x[0].id, x[1], t.status); }
      for (const t of homework) { const x = rowOf(t); if (x) store.setFieldStatus(x[0].id, x[1], LATER); }
      for (const t of paidOff) { const as = one(r => r.kind === 'asset' && r.type === (t === 'mortgageBalance' ? 'Home' : 'Car')); if (as) store.update(as.id, { financed: 'Paid off' }); }

      // Other income: one row, its type from the first source picked (a side gig unless they said).
      const oi = by['income.other'];
      if (oi && oi.kind !== 'none') {
        const type = by['income.otherFrom']?.value?.[0] ?? 'Side hustle';
        const r = store.add('income', { name: 'Other income', amount: oi.kind === 'range' ? oi.value : null, per: 'month', values: { basis: 'Take-home' } }, { type });
        store.setFieldStatus(r.id, 'amount', oi.kind === 'find' ? LATER : STATUS_IN_SLAM.Gut);
      }
      // Other property, with its loan on the same record as Debt.
      const pv = by['property.value'];
      if (pv && pv.kind !== 'none') {
        const as = store.add('asset', { name: 'Other property', values: { value: pv.kind === 'range' ? pv.value : null } }, { type: 'Other property' });
        store.setFieldStatus(as.id, 'value', pv.kind === 'find' ? LATER : STATUS_IN_SLAM.Gut);
        const po = by['property.owed'], pp = by['property.payment'];
        if (po?.choice?.paidOff) store.update(as.id, { financed: 'Paid off' });
        else if (po || pp) {
          store.update(as.id, { financed: 'Financed' });
          const d = store.add('debt', { name: 'Other property loan', linkedTo: as.id, values: { balance: po?.kind === 'range' ? po.value : null, payment: pp?.kind === 'range' ? pp.value : null } }, { type: 'Mortgage' });
          if (po) store.setFieldStatus(d.id, 'balance', po.kind === 'find' ? LATER : STATUS_IN_SLAM.Gut);
          if (pp) store.setFieldStatus(d.id, 'payment', pp.kind === 'find' ? LATER : STATUS_IN_SLAM.Gut);
        }
      }
      // The accounts gate: blank rows by type (count first, then rows), as on About you.
      if (by['invest.accounts']) for (const [type, n] of Object.entries(by['invest.accounts'].value)) syncCount(store, type, n, ref);
      // Which areas they have, from what the form answered (only a 'no' takes an area away).
      const areas = { ...(store.doc.profile.areas || {}) };
      const cashNone = ['cash.checking', 'cash.savings'].every(id => by[id]?.kind === 'none');
      if (by['cash.checking'] || by['cash.savings']) areas.cash = !cashNone || areas.cash === true;
      if (by['invest.total']) areas.investments = by['invest.total'].kind !== 'none';
      const hasReal = a.hasCar === true || a.housing === 'Own' || (pv && pv.kind !== 'none') || store.find(r => r.kind === 'asset').length > 0;
      const noReal = by['car.value']?.choice?.noCar && by['home.housing'] && a.housing !== 'Own' && by['property.value']?.kind === 'none';
      if (hasReal) areas.real = true; else if (noReal) areas.real = areas.real === true;
      if (debtNone === 3) areas.debt = store.find(r => r.kind === 'debt').length > 0;
      else if (['debt.cards', 'debt.student', 'debt.other'].some(id => by[id] && by[id].kind !== 'none')) areas.debt = true;
      store.setDoc('profile', { areas });
      // Notes for the call.
      if (by.unsure) store.addNote(`From the intake, not sure yet: ${by.unsure.value.join(', ')}`);
      if (val('anything.else')) store.addNote(`From the intake: ${val('anything.else')}`);
      store.setDoc('settings', { intake: { at: now, sentAt: plan.at ?? null, lines: list.length, sid } });
      // Each row the intake made or changed says so (From the intake form), as a spreadsheet import does.
      for (const r of store.doc.records) if (before.get(r.id) !== JSON.stringify(r) && r.source === 'manual') store.update(r.id, { source: 'intake' });
    });
  } finally { store.source = was; }
  return list.length;
}

// What a line becomes in SLAM, in words, for the review (the view only shows this).
const STATUS_WORDS = { Gut: 'a guess (Gut)', Roughly: 'Roughly', 'Know it': 'Know it' };
const fmtMoney = v => `$${Math.round(v).toLocaleString('en-US')}`;
export function landsAs(l) {
  const q = QUESTIONS[l.qid];
  if (l.kind === 'note') return 'One note in the parking lot, to ask on the call';
  if (l.kind === 'unknown') return l.note;
  if (l.kind === 'find') return 'Will get it: on the Homework list, with where to look';
  if (l.choice?.paidOff) return 'Paid off';
  if (l.choice?.noCar) return 'No car: car rows and lines hide';
  if (q.to.why) return [...l.value, ...(l.other ? [`Other: ${l.other}`] : [])].join('; ');
  if (q.to.counts) return Object.entries(l.value).map(([t, n]) => `${n} ${t}`).join(', ') + ' (blank rows to fill)';
  if (q.to.pay) return l.said;
  if (q.to.benefits === 'gate') return l.value ? 'Asks which next' : 'No HSA-eligible plan, FSA or equity pay';
  if (l.kind === 'none') return q.to.debt ? 'None' : '$0';
  const money = typeof l.value === 'number' && (q.to.ft || q.to.debt || q.to.property || q.to.otherIncome === 'amount') && q.to.ft !== 'housing';
  const v = money ? fmtMoney(l.value) : Array.isArray(l.value) ? l.value.join(', ') : l.value === true ? 'Yes' : l.value === false ? 'No' : String(l.value);
  const range = l.kind === 'range' && l.choice?.lo != null ? ` (the middle of ${l.said})` : '';
  return `${v}${range}${l.status && l.status !== 'Know it' ? `, ${STATUS_WORDS[l.status]}` : ''}`;
}
export const wasWords = l => (l.was === null || l.was === undefined ? null : typeof l.was === 'number' && !['about.born', 'about.kids', 'fi.age'].includes(l.qid) ? fmtMoney(l.was) : l.was === true ? 'Yes' : l.was === false ? 'No' : String(l.was));
