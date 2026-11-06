// SPDX-License-Identifier: AGPL-3.0-only
// The SLAM financial order of operations (Phase 3.5 section 4): M69 placement, M70 Quiet Quitting FI, M71 flags.
// Pure: reads the household file and the metrics; no DOM. Each step: Done, In progress, Next or Later, the dollars
// left, a projected date and what it is made of.
import { metrics } from './metrics.js';
import { isHeavyDebt } from './debt.js';
import { matchFromTiers } from './portfolio.js';
import { layersOf } from './layers.js';
import { taxFreeRoom, matchRoom, nextBest } from './flow.js';
import { gapOf } from './gap.js';
import { monthsTo } from '../plan.js';
import { addMonths, ymOf, instances } from '../month.js';
import { yearItems, sinkingOf } from '../year.js';
import { RULES, LISTS } from '../registry/assumptions.js';

const sum = (list, f = x => x) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
import { PREREQS, CONDITIONS, ORDER, stepHeadline } from '../registry/foo.js';
const PAYDAY = new Set(['Payday or cash advance']);
const TRUE_FI_TAX = RULES.trueFiTax; // a rough tax on withdrawals until retirement taxes are modelled
export const forgiveness = r => r?.values?.pslf === 'Yes' || r?.values?.forgiveness === true || r?.values?.forgiveness === 'Yes';

// M70: the invested amount today after which the yearly minimum alone reaches the FI number by the FI age.
export function quietQuittingFi({ fiNumber, realReturn, age, fiAge, yearlyMinimum }) {
  if ([fiNumber, realReturn, age, fiAge, yearlyMinimum].some(v => v == null)) return { value: null, needs: ['FI number, age and FI age'] };
  const n = Math.max(0, fiAge - age), r = realReturn, g = (1 + r) ** n;
  const fvOfMinimum = r ? yearlyMinimum * (g - 1) / r : yearlyMinimum * n;
  const v = Math.max(0, (fiNumber - fvOfMinimum) / g);
  return { value: v, years: n, text: `(${Math.round(fiNumber).toLocaleString()} FI number minus ${Math.round(yearlyMinimum).toLocaleString()} a year for ${n} years grown at ${(r * 100).toFixed(1)}%) divided by ${g.toFixed(2)} = ${Math.round(v).toLocaleString()}. With that invested today, the yearly minimum alone gets you to FI at ${fiAge}.` };
}
export const coastFiNumber = ({ fiNumber, realReturn, age, fiAge }) => (fiNumber == null || age == null || fiAge == null ? null : fiNumber / (1 + realReturn) ** Math.max(0, fiAge - age));

// The nine steps of the original order (The Money Guy Show), for the comparison toggle.
export const ORIGINAL = ['Deductibles covered', 'Employer match', 'High-interest debt', 'Emergency reserves', 'Roth IRA and HSA', 'Max out retirement', 'Hyper-accumulation', 'Prepaid future assets', 'Low-interest debt'];

export function foo(doc, ref, { now = new Date(), flags = [] } = {}) {
  const m = metrics(doc, ref, { now });
  const x = m.inputs, p = doc.profile || {}, set = doc.settings || {};
  const L = layersOf(doc, ref, now);
  const recOf = id => doc.records.find(r => r.id === id);
  const surplus = Math.max(0, m.surplus.value ?? 0);
  const age = x.age, fiAge = doc.assumptions?.fiAge ?? x.retireAge;
  const keepJob = p.keepJobAfterLaunch ?? null; // asked once; feeds Quiet Quitting FI and Barista FI
  // The match and how much of it is taken.
  const job = x.income.find(i => i.r === x.link.job);
  const gross = job?.gross ?? null, n = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 }[job?.r.values.payFrequency] ?? 26;
  const pctIn = x.link.incomePct ?? (x.link.incomePerPaycheck != null && gross ? x.link.incomePerPaycheck * n / gross : 0);
  const mt = gross ? matchFromTiers({ contributionPct: pctIn ?? 0, tiers: x.link.incomeTiers, gross }) : null;
  const matchYearly = mt?.dollars ?? 0;
  const fullMatchAt = mt?.fullMatchAt ?? 0;
  const iraLimit = ref.limits.ira.base;
  const yearlyMinimum = iraLimit + (keepJob === 'Yes' ? matchYearly : 0);
  const fiN = m.fiNumber.value;
  const qq = quietQuittingFi({ fiNumber: fiN, realReturn: x.realReturn, age, fiAge, yearlyMinimum });
  const coast = coastFiNumber({ fiNumber: fiN, realReturn: x.realReturn, age, fiAge });
  const invested = x.invested ?? 0;
  const debts = x.debts.map(d => ({ ...d, rec: recOf(d.id) }));
  const heavy = debts.filter(d => isHeavyDebt({ ...d, forgiven: forgiveness(d.rec) }));
  const low = debts.filter(d => !heavy.includes(d) && !forgiveness(d.rec) && (d.balance ?? 0) > 0);
  const order = set.debtOrder ?? 'stress';
  const sortDebt = list => [...list].sort((a, b) => (order === 'snowball' ? (a.balance - b.balance) : order === 'avalanche' ? (b.apr ?? 0) - (a.apr ?? 0) : (b.stress ?? 0) - (a.stress ?? 0) || (b.apr ?? 0) - (a.apr ?? 0)));
  const layer = id => L.layers.find(l => l.id === id);
  const bigE = L.layers.filter(l => l.id.startsWith('big-e'));
  const soonGaps = L.layers.filter(l => l.id.startsWith('gap:') && l.step === 1), laterGaps = L.layers.filter(l => l.id.startsWith('gap:') && l.step === 8);
  // A late bill: a bill or debt payment more than 5 days past its real due day this month and still not marked paid,
  // counted only in a month the client is tracking (at least one payment marked). A guessed day (no due day yet) or a
  // spread weekly amount is never late, and an untracked month says nothing about lateness (finding F-LATE).
  const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000).toISOString().slice(0, 10);
  const monthList = instances(doc, ref, ymOf(now), { now });
  const tracking = monthList.some(i => i.status !== 'Planned');
  const late = !tracking ? [] : monthList.filter(i => (i.kind === 'bill' || i.kind === 'debt') && i.status === 'Planned' && i.date < fiveDaysAgo && !i.onCard && !i.guessDate && !i.spread);
  const paydayDebt = debts.filter(d => PAYDAY.has(d.type) && (d.balance ?? 0) > 0);
  const room = m.fooFlow?.room ?? taxFreeRoom(doc, x, ref, now); // one definition with the freed-money flow (js/math/flow.js)
  const { rothThisYear, hsaLimit, hsaIn } = room;
  const sink = yearItems(doc.records, now).all.filter(i => i.rec.values.sinking).map(i => ({ ...sinkingOf(i, { records: doc.records, now }), name: i.name }));
  const give = p.giving?.on ? p.giving : null;
  const giveMonthly = !give ? 0 : give.mode === 'amount' ? give.amount ?? 0 : (give.pct ?? 0) * ((give.base === 'net' ? x.takeHome : (x.grossAnnual ?? 0) / 12) ?? 0);
  const givingLines = sum(x.lines.filter(l => /giv|tithe|maaser|charit|donat/i.test(`${l.name} ${l.category ?? ''}`)), l => l.amount);
  const joy = x.lines.filter(l => l.joy === true || l.values?.joy === true);

  const steps = [];
  const add = s => steps.push({ left: 0, parts: [], note: null, ...s });
  add({ id: '0b', name: stepHeadline('0b'), done: joy.length > 0 && joy.every(l => (l.amount ?? 0) > 0), started: joy.length > 0, optional: !joy.length, parts: joy.map(l => ({ name: l.name, value: l.amount })),
    note: joy.length ? 'Your joy lines are funded in the plan.' : 'Pick the lines that bring you joy (Budget, a line\'s More).' });
  const e = layer('little-e'), buf = layer('buffer');
  const G = gapOf(doc, m); // batch 12 (item 5, M81): a month that is short is where step 1 starts
  const bleed = [...(G ? [{ name: 'Spend less than you make: the month is short', done: false, left: G.short, gap: true }] : []), { name: 'No late bills', done: !late.length }, { name: 'Payday and cash-advance debt at $0', done: !paydayDebt.length, left: sum(paydayDebt, d => d.balance) },
    { name: 'Buffer full', done: !!buf?.full, left: buf?.left ?? 0 }, { name: 'little e full', done: e.full, left: e.left }, ...soonGaps.map(g => ({ name: `${g.name} covered`, done: g.full, left: g.left }))];
  add({ id: '1', name: stepHeadline('1'), done: bleed.every(b => b.done), started: bleed.some(b => b.done), left: G ? G.short : sum(bleed, b => b.left ?? 0), parts: bleed, ...(G ? { monthly: true, gap: G.short } : {}) }); // batch 12: in a gap, the gap is what is left
  const matchOffered = (x.link.incomeTiers || []).length > 0;
  add({ id: '2', name: stepHeadline('2'), done: !matchOffered || !mt?.leftOnTable, started: (pctIn ?? 0) > 0, left: matchOffered && mt?.leftOnTable ? Math.max(0, (fullMatchAt - (pctIn ?? 0)) * (gross ?? 0)) : 0,
    note: !matchOffered ? 'No match on file.' : mt?.leftOnTable ? `Put in ${(fullMatchAt * 100).toFixed(1)}% to get the full match.` : 'You get the full match.',
    parts: x.accounts.filter(a => a.unvested).map(a => ({ name: `${a.name}: unvested`, value: a.unvested })), parallel: true });
  add({ id: '3', name: stepHeadline('3'), done: !heavy.length, started: heavy.some(d => d.payment > 0), left: sum(heavy, d => d.balance),
    parts: sortDebt(heavy).map(d => ({ name: d.name, value: d.balance, apr: d.apr })), note: debts.some(d => forgiveness(d.rec)) ? 'A loan marked PSLF or forgiveness skips this step.' : `In your payoff order (${order}).`, parallel: true });
  add({ id: '4', name: stepHeadline('4'), done: bigE.length > 0 && bigE.every(l => l.full), started: bigE.some(l => l.filled > 0), left: sum(bigE, l => l.left ?? 0), parts: bigE.map(l => ({ name: l.name, value: l.filled, target: l.target })) });
  add({ id: '5', name: stepHeadline('5'), done: rothThisYear >= iraLimit - 0.5 && (!x.gates.hsa || hsaIn >= hsaLimit - 0.5), started: rothThisYear > 0 || hsaIn > 0,
    left: Math.max(0, iraLimit - rothThisYear) + (x.gates.hsa ? Math.max(0, hsaLimit - hsaIn) : 0), note: (x.grossAnnual ?? 0) > (ref.limits.rothIncome?.[x.gates.couple ? 'joint' : 'single'] ?? Infinity) ? 'Over the Roth IRA income limit: a backdoor Roth (a traditional IRA contribution, then a conversion) still works.' : 'A Roth IRA and an invested HSA, maxed for the year.' });
  // Giving (batch 3, superseding the Nov 3 giving-first rule): off by default; at the Roth IRA step, never first in line.
  if (!give) add({ id: '5b', name: stepHeadline('5b'), done: false, started: false, off: true, left: null, note: 'Off. Turn it on under Giving once heavy debt is paid off: a percent or an amount. Oxygen mask on you first.' });
  else if (!giveMonthly) add({ id: '5b', name: stepHeadline('5b'), done: false, started: false, left: null, note: 'Set a percent or an amount to give.' });
  else add({ id: '5b', name: stepHeadline('5b'), done: givingLines >= giveMonthly - 0.5, started: givingLines > 0, left: Math.max(0, giveMonthly - givingLines), monthly: true,
    note: `${give.mode === 'amount' ? `$${Math.round(give.amount ?? 0)} a month` : `${Math.round((give.pct ?? 0) * 100)}% of ${give.base === 'net' ? 'take-home' : 'gross'}`}, beside the tax-free step.`, giveMonthly });
  const pastCoast = coast != null && !!x.investedKnown && invested >= coast;
  const pastQQ = qq.value != null && x.investedKnown && invested >= qq.value; // a blank balance is not known yet
  // Batch 15, item 8 (the flag rule, MATH.md): past Quiet Quitting FI means invested today is at or over M70, so the
  // yearly minimum alone (the Roth IRA, plus the match when a job is kept) reaches FI by the FI age. Said plainly.
  if (pastQQ) { qq.reached = true; qq.reachedText = `You've already reached Quiet Quitting FI: just the Roth IRA${keepJob === 'Yes' && matchYearly ? ' and the match from the job you keep' : ''} each year gets you there.`; }
  // Step 7 opens at Coast FI, or at Quiet Quitting FI when that toggle is on; step 6 is done the moment 7 opens.
  add({ id: '6', name: stepHeadline('6'), done: pastCoast || (!!set.qqOpensLaunch && pastQQ), started: pastQQ, left: coast == null ? null : Math.max(0, coast - invested),
    parts: [{ name: 'Quiet Quitting FI', value: qq.value, done: pastQQ, text: qq.text }, { name: 'Coast FI', value: coast, done: pastCoast }],
    note: pastQQ ? `${qq.reachedText} Maxing the 401(k) is the lever for Coast FI.` : 'Maxing the 401(k) is the lever inside this step.' });
  const opensAt = set.qqOpensLaunch ? 'qq' : 'coast';
  const open = opensAt === 'qq' ? pastQQ : pastCoast;
  const launch = p.launch?.move && p.launch?.date ? p.launch : null;
  add({ id: '7', name: stepHeadline('7'), done: open && !!launch, started: open, note: open ? (launch ? `${launch.move}, ${launch.date}. Only the Roth keeps being topped up.` : 'Open: pick a launch move and date.') : `Opens at ${opensAt === 'qq' ? 'Quiet Quitting FI' : 'Coast FI'}.` });
  const future = [...sink.map(s => ({ name: s.name, done: s.funded != null && s.funded >= 1, left: s.target == null ? 0 : Math.max(0, s.target - (s.saved ?? 0)) })), ...laterGaps.map(g => ({ name: g.name, done: g.full, left: g.left }))];
  // Item 33 (batch 6): with nothing to fund yet the step waits (optional), it is not Done; the old every() on an empty list read Done and drew a full green bar.
  add({ id: '8', name: stepHeadline('8'), done: future.length > 0 && future.every(f => f.done), started: future.some(f => f.done), left: sum(future, f => f.left), parts: future, optional: future.length === 0, note: future.length ? null : 'Nothing to fund yet: add a sinking fund on an event, or a later income gap.' });
  add({ id: '9', name: stepHeadline('9'), done: !low.length && fiN != null && invested >= fiN, started: !low.length, left: sum(low, d => d.balance) + (fiN == null ? 0 : Math.max(0, fiN - invested)),
    parts: [...sortDebt(low).map(d => ({ name: d.name, value: d.balance })), { name: 'FI', value: fiN, done: fiN != null && invested >= fiN }, { name: 'True FI (after tax)', value: fiN == null ? null : fiN / (1 - TRUE_FI_TAX), text: `The FI number grossed up for about ${TRUE_FI_TAX * 100}% tax on what you take out (a rough rate until retirement taxes are in).` }] });

  // Prerequisites (js/registry/foo.js): a step is reached when every step before it that counts is done; a locked step
  // shows its reason and is never where you are. A coach's override (doc.program.overrides, with a note) opens it.
  const overrides = doc.program?.overrides || {};
  const counts = s => !s.optional && !s.off && !s.locked;
  const condFacts = { heavy };
  // Answer 175: the Roth is never locked behind the match; the step carries the cost line instead.
  { const s2 = steps.find(s => s.id === '2'), s5 = steps.find(s => s.id === '5'); if (s2 && !s2.done && s2.left > 0 && s5 && !s5.done && m.annualSpending) s5.skipCost = { dollars: s2.left, fiDays: s2.left / (m.annualSpending / 365), text: `Skipping $${Math.round(s2.left).toLocaleString('en-US')} of match a year (about ${Math.round(s2.left / (m.annualSpending / 365))} FI days) while this comes before the full match.` }; }
  for (const s of steps) {
    const p = PREREQS[s.id];
    if (!p || s.done) continue;
    const at = p.after ? steps.findIndex(x => x.id === p.after) : -1;
    const reached = at < 0 || steps.slice(0, at + 1).filter(counts).every(x => x.done); // no after: only the conditions lock it
    const failed = (p.conditions || []).filter(k => !CONDITIONS[k].test(condFacts));
    const wouldLock = !reached || failed.length > 0;
    s.prereq = { after: p.after ?? null, reached, failed: failed.map(k => CONDITIONS[k].label), text: `${p.label}${failed.length ? ` Needs ${failed.map(k => CONDITIONS[k].label).join(' and ')}.` : ''}` };
    if (s.off) continue; // off: nothing to lock yet
    if (wouldLock && overrides[s.id]?.note) { s.override = overrides[s.id]; s.cost = overrideCost(s, { heavy, m, x, steps, coast, invested }); }
    else if (wouldLock) s.locked = true;
  }
  // No age: big e has no target, so step 4 is locked with the plain reason (the Rule of 5 needs the age).
  if (L.needsAge) { const s4 = steps.find(s => s.id === '4'); s4.done = false; s4.locked = true; s4.left = null; s4.prereq = { after: null, reached: true, failed: [], needsAge: true, text: 'Add your age to set big e (the Rule of 5: your age divided by 5 months of spending).' }; delete s4.override; }
  // Status: Done; the first step not done is where you are; 2 and 3 run together; 6 and 7 never overlap.
  let here = null, nextSet = false;
  for (const s of steps) {
    if (s.done) { s.status = 'Done'; continue; }
    if (s.locked) { s.status = 'Locked'; continue; } // waits for its prerequisite; never blocks the path
    if (s.off) { s.status = 'Off'; continue; } // giving, until it is turned on
    if (s.optional) { s.status = 'Optional'; continue; } // Spend on what you love waits until joy lines are picked; it never blocks
    if (s.id === '7') { s.status = s.started ? 'In progress' : 'Later'; continue; } // a window: open or not, wherever you are
    if (s.id === '5b') { s.status = s.started ? 'In progress' : 'Next'; continue; } // giving sits beside the Roth step; it never blocks
    if (!here) { here = s.id; s.status = 'In progress'; continue; }
    const pair = (here === '2' && s.id === '3') || (here === '3' && s.id === '2');
    if (pair) { s.status = 'In progress'; continue; }
    s.status = nextSet ? 'Later' : 'Next'; nextSet = true; // one Next: the step after the one you are on
  }
  // Item 33: how far along each step is, for the partial bar on its tile (0 to 1).
  for (const s of steps) {
    if (s.done) { s.progress = 1; continue; }
    const withTarget = (s.parts || []).filter(pt => pt.target != null && pt.target > 0);
    if (withTarget.length) { s.progress = Math.min(1, sum(withTarget, pt => Math.min(pt.value ?? 0, pt.target)) / sum(withTarget, pt => pt.target)); continue; }
    const flags = (s.parts || []).filter(pt => typeof pt.done === 'boolean');
    if (flags.length) { s.progress = flags.filter(pt => pt.done).length / flags.length; continue; }
    if (s.id === '9' && fiN) { s.progress = Math.min(1, invested / fiN); continue; }
    if (s.id === '6' && coast) { s.progress = Math.min(1, invested / coast); continue; }
    s.progress = s.started ? 0.4 : 0;
  }
  // Projected dates: the surplus works through the steps in order (dollars left divided by the surplus a month).
  let months = 0;
  for (const s of steps) {
    if (['Done', 'Optional', 'Locked', 'Off'].includes(s.status) || s.left == null) { s.date = null; continue; }
    if (s.id === '6' && coast != null) { const t = monthsTo(m, coast, { now }); s.months = t.value; }
    else if (s.id === '9' && fiN != null) { // low-rate debt from the surplus in order, FI on the growth path: whichever lands later
      months += surplus ? sum(low, d => d.balance) / surplus : (low.length ? Infinity : 0);
      const t = monthsTo(m, fiN, { now }).value;
      s.months = Number.isFinite(months) && t != null ? Math.max(Math.ceil(months), t) : null;
    } else if (s.id === '7' && s.status !== 'In progress') { s.months = steps.find(x => x.id === '6')?.months ?? null; } // the window opens when step 6 is done
    else if (s.id === '3' && m.debtPlan?.debts.some(d => d.heavy)) { // batch 11: the one debt plan (the surplus to heavy debt first, M34)
      const hm = m.debtPlan.heavyMonths; s.months = G ? null : hm; months = hm == null || G ? Infinity : Math.max(months, hm); // batch 12: in a gap the payments are not funded yet
      if (G) s.ifPaid = hm;
      s.minimumMonths = m.debtPlanMinimum?.heavyMonths ?? null; // the same debt at its own payment only, for the one-line note
    } else if ((s.id === '4' || s.id === '5') && m.fooFlow && (s.id === '5' || !L.needsAge)) { // batch 12 (M79): freed money follows the FOO, one flow for every screen
      const fs = m.fooFlow.steps.find(q => q.id === s.id);
      s.months = fs?.to ?? null; s.flowMonthly = fs?.monthly ?? null; if (s.months != null) months = Math.max(months, s.months);
    } else { months += surplus ? (s.monthly ? 0 : s.left / surplus) : Infinity; s.months = Number.isFinite(months) ? Math.ceil(months) : null; }
    s.date = s.months == null ? null : addMonths(ymOf(now), s.months);
  }
  // Batch 12 (M80): the next best opportunity. On each step the money goes to, the best alternative by its yearly value;
  // when it beats the step, a one-line note ("Worth a look"). The order never changes.
  const mRoom = matchRoom(x), heavyTarget = (m.debtPlan?.debts || []).find(d => d.heavy && d.paidOffMonth !== 0) ?? null;
  const flowMonthly = m.fooFlow?.monthly ?? surplus;
  const shown = new Set();
  const rateOf = { '3': heavyTarget?.apr ?? 0, '4': 0, '5': x.realReturn, '6': x.realReturn };
  for (const s of steps) {
    if (!(s.id in rateOf) || ['Done', 'Locked', 'Off', 'Optional'].includes(s.status)) continue;
    const monthly = s.id === '3' ? (m.debtRule?.toDebt ?? 0) : flowMonthly;
    const from = s.id === '3' ? 0 : s.id === '6' ? (m.fooFlow?.taxFreeEnd ?? 0) : (m.fooFlow?.steps.find(q => q.id === s.id)?.from ?? 0);
    const nb = nextBest({ id: s.id, rate: rateOf[s.id], monthly, target: s.id === '3' ? heavyTarget?.id : null, from }, { debts: x.debts, match: mRoom, realReturn: x.realReturn, now });
    const key = nb ? `${nb.kind}:${nb.id ?? ''}` : null;
    if (nb && !shown.has(key)) { s.worthALook = nb; shown.add(key); } // the same alternative shows once, on the first step it beats
  }
  const facts = factsOf({ x, m, steps, L, coast, qq, invested, debts, low, doc, k401Limit: ref.limits['401k'].base });
  const raised = flags.filter(f => (f.all || []).length && f.all.every(k => facts[k]));
  for (const f of raised) { const s = steps.find(st => st.id === String(f.step)); if (s) (s.flags ||= []).push(f); }
  return { steps, here, qq, coast, yearlyMinimum, keepJob, flags: raised, facts, gap: G, debtText: m.debtPlan?.text ?? null, heavyPayments: m.debtPlan?.heavyPayments ?? 0, path: pathOf({ steps, debts, m, doc, now, coast, qq }) };
}

// What an override costs, in FI days a year: giving while carrying heavy debt costs that debt's APR on the money; any
// other early step costs the real return it would have earned.
// Answer 150 (batch 5): SPARKS before Coast FI costs the growth the gap to Coast FI would have earned a year (the Roth
// before the match is not locked, answer 175: its cost sits on the step as skipCost).
function overrideCost(s, { heavy, m, x, steps = [], coast = null, invested = null }) {
  if (!m.annualSpending) return null;
  const fiDaysOf = dollars => dollars / (m.annualSpending / 365);
  if (s.id === '7') { const gap = coast != null && invested != null ? Math.max(0, coast - invested) : 0; if (!gap) return null; const dollars = gap * x.realReturn; return { dollars, fiDays: fiDaysOf(dollars), rate: x.realReturn, text: `Launching before Coast FI gives up the growth on the $${Math.round(gap).toLocaleString('en-US')} still to invest: about ${Math.round(fiDaysOf(dollars))} FI days a year at ${(x.realReturn * 100).toFixed(1)}%.` }; }
  const monthly = s.giveMonthly ?? 0;
  if (!monthly) return null;
  const apr = heavy.length ? Math.max(...heavy.map(d => d.apr ?? 0)) : null;
  const rate = apr ?? x.realReturn;
  const dollars = monthly * 12 * rate;
  const fiDays = dollars / (m.annualSpending / 365);
  return { dollars, fiDays, rate, text: `${s.id === '5b' ? 'Giving' : s.name} $${Math.round(monthly).toLocaleString('en-US')} a month ${apr != null ? `while carrying ${(apr * 100).toFixed(0)}% debt` : 'before the step opens'} costs about ${Math.round(fiDays)} FI days a year.` };
}

// M71: the facts the flags in data/flags.json test. A new flag needs only a new combination of these.
function factsOf({ x, m, steps, L, coast, qq, invested, debts, low, doc, k401Limit }) {
  const st = id => steps.find(s => s.id === id);
  const k401 = x.accounts.filter(a => ['401(k)', '403(b)', '457', 'TSP', 'Solo 401(k)'].includes(a.type));
  const savingYearly = ((m.pretaxSaving ?? 0) + (x.afterTaxSaving ?? 0)) * 12;
  return {
    maxing401k: k401.length > 0 && (m.pretaxSaving ?? 0) * 12 >= k401Limit - 1,
    pastCoast: coast != null && invested >= coast,
    launchWaiting: st('7')?.status !== 'Done',
    extraOnLowRateDebt: low.some(d => (d.rec?.values.extra ?? 0) > 0),
    bigENotFull: !st('4')?.done,
    pastQuietQuitting: qq.value != null && x.investedKnown && invested >= qq.value,
    contributingPastNeed: savingYearly > 0,
    noGoalForExtra: !doc.records.some(r => r.kind === 'milestone'),
    forgivenessLoanExtra: debts.some(d => forgiveness(d.rec) && ((d.rec?.values.extra ?? 0) > 0 || (d.rec?.values.payment ?? 0) > (d.rec?.values.minimum ?? Infinity))),
    cashAboveLayers: L.extra > 100,
  };
}

// The path: every dated thing on the way, in date order.
function pathOf({ steps, debts, m, doc, now, coast, qq }) {
  const base = ymOf(now), out = [];
  const at = n => (n == null ? null : addMonths(base, Math.ceil(n)));
  for (const s of steps) if (s.date) out.push({ ym: s.date, name: `${s.name}${s.status === 'Done' ? ' (done)' : ''}`, step: s.id });
  for (const d of m.inputs.debts) { const months = d.planMonths; if (months != null && months > 0) out.push({ ym: at(months), name: `${d.name} paid off`, step: d.heavy ? '3' : '9' }); } // batch 11: one payoff date per debt, from the one plan
  for (const r of doc.records.filter(r => r.kind === 'debt' && r.values.promoEnd)) out.push({ ym: String(r.values.promoEnd).slice(0, 7), name: `${r.name || r.type}: promo APR ends`, step: '3' });
  for (const r of doc.records.filter(r => r.kind === 'account' && r.values.vestYears && r.values.vestingSchedule && r.values.vestingSchedule !== 'Immediate')) out.push({ ym: addMonths(base, Math.round(r.values.vestYears * 12)), name: `${r.name || r.type}: fully vested`, step: '2' });
  const y = now.getUTCFullYear();
  out.push({ ym: `${now.getUTCMonth() >= 3 ? y + 1 : y}-04`, name: 'Roth IRA and HSA deadline (April 15)', step: '5' });
  const coastM = coast != null ? monthsTo(m, coast, { now }).value : null, fiM = m.monthsToFi.value;
  if (coastM != null) out.push({ ym: at(coastM), name: 'Coast FI', step: '6' });
  if (fiM != null) out.push({ ym: at(fiM), name: 'FI', step: '9' });
  return out.filter(o => o.ym).sort((a, b) => a.ym.localeCompare(b.ym));
}
