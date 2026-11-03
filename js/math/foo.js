// SPDX-License-Identifier: AGPL-3.0-only
// The SLAM financial order of operations (Phase 3.5 section 4): M69 placement, M70 Quiet Quitting FI, M71 flags.
// Pure: reads the household file and the metrics; no DOM. Each step: Done, In progress, Next or Later, the dollars
// left, a projected date and what it is made of.
import { metrics } from './metrics.js';
import { matchFromTiers } from './portfolio.js';
import { layersOf } from './layers.js';
import { monthsTo } from '../plan.js';
import { addMonths, ymOf, instances } from '../month.js';
import { yearItems, sinkingOf } from '../year.js';
import { RULES, LISTS } from '../registry/assumptions.js';

const sum = (list, f = x => x) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const HIGH = new Set(LISTS.heavyDebt);
const HIGH_APR = RULES.heavyApr;
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
  const heavy = debts.filter(d => (HIGH.has(d.type) || (d.apr ?? 0) >= HIGH_APR) && !forgiveness(d.rec) && (d.balance ?? 0) > 0);
  const low = debts.filter(d => !heavy.includes(d) && !forgiveness(d.rec) && (d.balance ?? 0) > 0);
  const order = set.debtOrder ?? 'stress';
  const sortDebt = list => [...list].sort((a, b) => (order === 'snowball' ? (a.balance - b.balance) : order === 'avalanche' ? (b.apr ?? 0) - (a.apr ?? 0) : (b.stress ?? 0) - (a.stress ?? 0) || (b.apr ?? 0) - (a.apr ?? 0)));
  const layer = id => L.layers.find(l => l.id === id);
  const bigE = L.layers.filter(l => l.id.startsWith('big-e'));
  const soonGaps = L.layers.filter(l => l.id.startsWith('gap:') && l.step === 1), laterGaps = L.layers.filter(l => l.id.startsWith('gap:') && l.step === 8);
  // A late bill: a bill or debt payment more than 5 days past its day this month and still not marked paid.
  const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000).toISOString().slice(0, 10);
  const late = instances(doc, ref, ymOf(now), { now }).filter(i => (i.kind === 'bill' || i.kind === 'debt') && i.status === 'Planned' && i.date < fiveDaysAgo && !i.onCard);
  const paydayDebt = debts.filter(d => PAYDAY.has(d.type) && (d.balance ?? 0) > 0);
  const roth = x.accounts.filter(a => a.type === 'Roth IRA');
  const rothRec = roth.map(a => recOf(a.id));
  const rothThisYear = sum(rothRec, r => sum((r?.values.rothLog || []).filter(e => e.taxYear === now.getFullYear()), e => e.amount) || (r?.values.contribution ?? 0) * (r?.values.contributionPer === 'Paycheck' ? 26 : 1));
  const hsa = x.accounts.filter(a => a.type === 'HSA');
  const hsaLimit = ref.limits.hsa[x.gates.couple ? 'family' : 'self'];
  const hsaIn = sum(hsa.map(a => recOf(a.id)), r => r?.values.contributionsYtd ?? r?.values.contribution ?? 0) + (x.gates.hsa ? sum(x.income, i => (i.r.values.hsaFsa ?? 0) * n) : 0);
  const sink = yearItems(doc.records, now).all.filter(i => i.rec.values.sinking).map(i => ({ ...sinkingOf(i, { records: doc.records, now }), name: i.name }));
  const give = p.giving?.on ? p.giving : null;
  const giveMonthly = !give ? 0 : give.mode === 'amount' ? give.amount ?? 0 : (give.pct ?? 0) * ((give.base === 'net' ? x.takeHome : (x.grossAnnual ?? 0) / 12) ?? 0);
  const givingLines = sum(x.lines.filter(l => /giv|tithe|maaser|charit|donat/i.test(`${l.name} ${l.category ?? ''}`)), l => l.amount);
  const joy = x.lines.filter(l => l.joy === true || l.values?.joy === true);

  const steps = [];
  const add = s => steps.push({ left: 0, parts: [], note: null, ...s });
  if (give && !giveMonthly) add({ id: '0a', name: 'Give', done: false, started: false, left: null, note: 'Set a percent or an amount to give first.' });
  else if (give) add({ id: '0a', name: 'Give', done: givingLines >= giveMonthly - 0.5, started: givingLines > 0, left: Math.max(0, giveMonthly - givingLines), monthly: true,
    note: `${give.mode === 'amount' ? `$${Math.round(give.amount ?? 0)} a month` : `${Math.round((give.pct ?? 0) * 100)}% of ${give.base === 'net' ? 'take-home' : 'gross'}`}, first, before everything else.` });
  add({ id: '0b', name: 'Bedazzle your basic life', done: joy.length > 0 && joy.every(l => (l.amount ?? 0) > 0), started: joy.length > 0, optional: !joy.length, parts: joy.map(l => ({ name: l.name, value: l.amount })),
    note: joy.length ? 'Your joy lines are funded in the plan.' : 'Pick the lines that bring you joy (Budget, a line\'s More).' });
  const e = layer('little-e');
  const bleed = [{ name: 'No late bills', done: !late.length }, { name: 'Payday and cash-advance debt at $0', done: !paydayDebt.length, left: sum(paydayDebt, d => d.balance) },
    { name: 'little e full', done: e.full, left: e.left }, ...soonGaps.map(g => ({ name: `${g.name} covered`, done: g.full, left: g.left }))];
  add({ id: '1', name: 'Stop the bleeding', done: bleed.every(b => b.done), started: bleed.some(b => b.done), left: sum(bleed, b => b.left ?? 0), parts: bleed });
  const matchOffered = (x.link.incomeTiers || []).length > 0;
  add({ id: '2', name: 'Take the free money', done: !matchOffered || !mt?.leftOnTable, started: (pctIn ?? 0) > 0, left: matchOffered && mt?.leftOnTable ? Math.max(0, (fullMatchAt - (pctIn ?? 0)) * (gross ?? 0)) : 0,
    note: !matchOffered ? 'No match on file.' : mt?.leftOnTable ? `Put in ${(fullMatchAt * 100).toFixed(1)}% to get the full match.` : 'You get the full match.',
    parts: x.accounts.filter(a => a.unvested).map(a => ({ name: `${a.name}: unvested`, value: a.unvested })), parallel: true });
  add({ id: '3', name: 'Clear the heavy debt', done: !heavy.length, started: heavy.some(d => d.payment > 0), left: sum(heavy, d => d.balance),
    parts: sortDebt(heavy).map(d => ({ name: d.name, value: d.balance, apr: d.apr })), note: debts.some(d => forgiveness(d.rec)) ? 'A loan marked PSLF or forgiveness skips this step.' : `In your payoff order (${order}).`, parallel: true });
  add({ id: '4', name: 'big e', done: bigE.length > 0 && bigE.every(l => l.full), started: bigE.some(l => l.filled > 0), left: sum(bigE, l => l.left ?? 0), parts: bigE.map(l => ({ name: l.name, value: l.filled, target: l.target })) });
  add({ id: '5', name: 'Roth and HSA', done: rothThisYear >= iraLimit - 0.5 && (!x.gates.hsa || hsaIn >= hsaLimit - 0.5), started: rothThisYear > 0 || hsaIn > 0,
    left: Math.max(0, iraLimit - rothThisYear) + (x.gates.hsa ? Math.max(0, hsaLimit - hsaIn) : 0), note: (x.grossAnnual ?? 0) > (ref.limits.rothIncome?.[x.gates.couple ? 'joint' : 'single'] ?? Infinity) ? 'Over the Roth IRA income limit: a backdoor Roth (a traditional IRA contribution, then a conversion) still works.' : 'A Roth IRA and an invested HSA, maxed for the year.' });
  const pastCoast = coast != null && invested >= coast;
  const pastQQ = qq.value != null && invested >= qq.value;
  // Step 7 opens at Coast FI, or at Quiet Quitting FI when that toggle is on; step 6 is done the moment 7 opens.
  add({ id: '6', name: 'Prepay retirement', done: pastCoast || (!!set.qqOpensLaunch && pastQQ), started: qq.value != null && invested >= qq.value, left: coast == null ? null : Math.max(0, coast - invested),
    parts: [{ name: 'Quiet Quitting FI', value: qq.value, done: qq.value != null && invested >= qq.value, text: qq.text }, { name: 'Coast FI', value: coast, done: pastCoast }],
    note: 'Maxing the 401(k) is the lever inside this step.' });
  const opensAt = set.qqOpensLaunch ? 'qq' : 'coast';
  const open = opensAt === 'qq' ? qq.value != null && invested >= qq.value : pastCoast;
  const launch = p.launch?.move && p.launch?.date ? p.launch : null;
  add({ id: '7', name: 'SPARKS launch window', done: open && !!launch, started: open, gate: !open, note: open ? (launch ? `${launch.move}, ${launch.date}. Only the Roth keeps being topped up.` : 'Open: pick a launch move and date.') : `Opens at ${opensAt === 'qq' ? 'Quiet Quitting FI' : 'Coast FI'}.` });
  const future = [...sink.map(s => ({ name: s.name, done: s.funded != null && s.funded >= 1, left: s.target == null ? 0 : Math.max(0, s.target - (s.saved ?? 0)) })), ...laterGaps.map(g => ({ name: g.name, done: g.full, left: g.left }))];
  add({ id: '8', name: 'Fund the future', done: future.every(f => f.done), started: future.some(f => f.done), left: sum(future, f => f.left), parts: future });
  add({ id: '9', name: 'Low-rate debt, then FI', done: !low.length && fiN != null && invested >= fiN, started: !low.length, left: sum(low, d => d.balance) + (fiN == null ? 0 : Math.max(0, fiN - invested)),
    parts: [...sortDebt(low).map(d => ({ name: d.name, value: d.balance })), { name: 'FI', value: fiN, done: fiN != null && invested >= fiN }, { name: 'True FI (after tax)', value: fiN == null ? null : fiN / (1 - TRUE_FI_TAX), text: `The FI number grossed up for about ${TRUE_FI_TAX * 100}% tax on what you take out (a rough rate until retirement taxes are in).` }] });

  // Status: Done; the first step not done is where you are; 2 and 3 run together; 6 and 7 never overlap.
  let here = null, nextSet = false;
  for (const s of steps) {
    if (s.done) { s.status = 'Done'; continue; }
    if (s.optional) { s.status = 'Optional'; continue; } // Bedazzle waits until joy lines are picked; it never blocks
    if (s.id === '7') { s.status = s.gate ? 'Later' : 'In progress'; continue; } // a window: open or not, wherever you are
    if (!here) { here = s.id; s.status = 'In progress'; continue; }
    const pair = (here === '2' && s.id === '3') || (here === '3' && s.id === '2');
    if (pair) { s.status = 'In progress'; continue; }
    s.status = nextSet ? 'Later' : 'Next'; nextSet = true; // one Next: the step after the one you are on
  }
  // Projected dates: the surplus works through the steps in order (dollars left divided by the surplus a month).
  let months = 0;
  for (const s of steps) {
    if (s.status === 'Done' || s.status === 'Optional' || s.left == null) { s.date = null; continue; }
    if (s.id === '6' && coast != null) { const t = monthsTo(m, coast, { now }); s.months = t.value; }
    else if (s.id === '9' && fiN != null) { // low-rate debt from the surplus in order, FI on the growth path: whichever lands later
      months += surplus ? sum(low, d => d.balance) / surplus : (low.length ? Infinity : 0);
      const t = monthsTo(m, fiN, { now }).value;
      s.months = Number.isFinite(months) && t != null ? Math.max(Math.ceil(months), t) : null;
    } else if (s.id === '7' && s.status !== 'In progress') { s.months = steps.find(x => x.id === '6')?.months ?? null; } // the window opens when step 6 is done
    else { months += surplus ? (s.monthly ? 0 : s.left / surplus) : Infinity; s.months = Number.isFinite(months) ? Math.ceil(months) : null; }
    s.date = s.months == null ? null : addMonths(ymOf(now), s.months);
  }
  const facts = factsOf({ x, m, steps, L, coast, qq, invested, debts, low, doc, k401Limit: ref.limits['401k'].base });
  const raised = flags.filter(f => (f.all || []).length && f.all.every(k => facts[k]));
  for (const f of raised) { const s = steps.find(st => st.id === String(f.step)); if (s) (s.flags ||= []).push(f); }
  return { steps, here, qq, coast, yearlyMinimum, keepJob, flags: raised, facts, path: pathOf({ steps, debts, m, doc, now, coast, qq }) };
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
    pastQuietQuitting: qq.value != null && invested >= qq.value,
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
  for (const d of m.debts) { const months = d.payoff?.value; if (months != null && months > 0) out.push({ ym: at(months), name: `${d.name} paid off at today's payment`, step: '3' }); }
  for (const r of doc.records.filter(r => r.kind === 'debt' && r.values.promoEnd)) out.push({ ym: String(r.values.promoEnd).slice(0, 7), name: `${r.name || r.type}: promo APR ends`, step: '3' });
  for (const r of doc.records.filter(r => r.kind === 'account' && r.values.vestYears && r.values.vestingSchedule && r.values.vestingSchedule !== 'Immediate')) out.push({ ym: addMonths(base, Math.round(r.values.vestYears * 12)), name: `${r.name || r.type}: fully vested`, step: '2' });
  const y = now.getUTCFullYear();
  out.push({ ym: `${now.getUTCMonth() >= 3 ? y + 1 : y}-04`, name: 'Roth IRA and HSA deadline (April 15)', step: '5' });
  const coastM = coast != null ? monthsTo(m, coast, { now }).value : null, fiM = m.monthsToFi.value;
  if (coastM != null) out.push({ ym: at(coastM), name: 'Coast FI', step: '6' });
  if (fiM != null) out.push({ ym: at(fiM), name: 'FI', step: '9' });
  return out.filter(o => o.ym).sort((a, b) => a.ym.localeCompare(b.ym));
}
