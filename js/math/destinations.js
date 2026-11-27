// SPDX-License-Identifier: AGPL-3.0-only
// The FI variants and the FIRE statuses (run of Nov 25 2026; statuses Nov 27 2026). Pure: no DOM. Every number here comes from a function that already
// works it out: the FI numbers from fiTargets (js/plan.js), each date from monthsTo (the plan's own path), the stress
// table from fiStress (M9X), the pod from metrics() in the Everyone view and each adult's view (the household
// engine, M9N), and the Coast date from the Coast FI number (M54).
import { metrics } from './metrics.js';
import { fiNumber, fiDate, baristaGap, fiStress, changeAt } from './fi.js';
import { rcCoast, rcCoastWords } from './recalc.js';
import { myShare } from './spending.js';
import { fiTargets, monthsTo, fatExtrasOf, baristaHealthOf, FAT_FACTOR } from '../plan.js';
import { addMonths, ymOf, monthName } from '../month.js';
import { fmt } from './result.js';
import { adultsOf, personLabels } from '../registry/couples.js';
import { DESTINATIONS, DESTINATION_WORDS } from '../registry/destinations.js';
import { stList, stMarkers, stCard, stBelow, stLine, stWeave } from './statuses.js';

const pctWords = v => `${+(v * 100).toFixed(2)}%`;

// M9G: each destination as one view: its number, its date on the plan's own path, and what it assumes, in words.
// extra and realReturn (run Finish everything partly built, Part 18, the FIRE dashboard's pace taps): a what-if on the
// same path, more a month and another return; the numbers stay, only the dates move. Both default to the plan as it is.
export function destinationsOf(m, doc, { now = new Date(), extra = 0, realReturn = null } = {}) {
  const x = m.inputs, T = fiTargets(m, doc), w = x.withdrawalRate;
  const r = realReturn ?? x.realReturn;
  const going0 = m.investing?.monthly ?? m.surplus?.value ?? null, going = going0 == null ? null : going0 + extra;
  const spend = x.retirementSpending, base = ymOf(now);
  const common = [
    w == null ? null : `A ${pctWords(w)} withdrawal rate: each year you take out that share of what is invested.`,
    r == null ? null : `Growth of ${pctWords(r)} a year after inflation.`,
    going == null ? null : extra ? `${fmt.money(going)} going in each month: today's ${fmt.money(going0)} plus ${fmt.money(extra)}.` : `${fmt.money(going)} going in each month, as it does today.`,
  ].filter(Boolean);
  const partTime = doc.assumptions?.partTimeIncome ?? null, health = baristaHealthOf(doc), jobHealth = doc.program?.destinations?.jobHealth === true;
  const extras = fatExtrasOf(doc);
  const lean = T['Lean FI'].value == null || w == null ? null : T['Lean FI'].value * w / 12;
  const gap = spend == null || partTime == null ? null : baristaGap({ annualSpending: spend * 12, partTimeIncome: partTime * 12, healthAnnual: health == null ? null : health * 12, withdrawalRate: w });
  const own = {
    'Lean FI': { spending: lean, assumes: [lean == null ? 'Your food, housing and transportation lines, once they are in.' : `Only food, housing and transportation: ${fmt.money(lean)} a month${spend != null ? ` of the ${fmt.money(spend)} you spend today` : ''}.`, 'Everything else is paid from work you choose to do, or goes.'] },
    'Barista FI': { spending: spend == null || partTime == null ? null : Math.max(0, spend + (health ?? 0) - partTime), assumes: [partTime == null ? 'Part-time pay a month, once you tap it.' : `Part-time pay of ${fmt.money(partTime)} a month, for as long as the plan needs it.`, jobHealth ? 'The part-time job covers health insurance, so no cost for it is added.' : health == null ? 'No health insurance cost is in this number yet. Tap what it costs a month, or tap that the job covers it.' : `Health insurance of ${fmt.money(health)} a month is added to your spending, because the full-time job no longer pays for it.`, spend == null ? null : `What the pay does not cover of ${fmt.money(spend + (health ?? 0))} a month comes from investments.`].filter(Boolean) },
    'Regular FI': { spending: spend, assumes: [spend == null ? 'Your monthly spending, once it is in.' : `The life you live today: ${fmt.money(spend)} a month, for good.`] },
    'Chubby FI': { spending: T['Chubby FI'].value == null || w == null ? null : T['Chubby FI'].value * w / 12, assumes: ['Halfway between Regular and Fat.', extras == null ? `Fat is ${FAT_FACTOR} times your spending until you tap your own extras.` : `Half of the ${fmt.money(extras)} a month on your Fat list.`] },
    'Fat FI': { spending: T['Fat FI'].value == null || w == null ? null : T['Fat FI'].value * w / 12, assumes: [extras == null ? `${FAT_FACTOR} times your spending, a stand-in until you tap your own extras on the Fat list.` : `Today's spending plus the ${fmt.money(extras)} a month on your Fat list.`] },
  };
  return DESTINATIONS.map(key => {
    const number = T[key], v = number?.value ?? null;
    const t = v == null ? null : monthsTo(m, v, { now, extra, realReturn: r });
    const months = t?.reached ? 0 : t?.value ?? null;
    return { key, short: DESTINATION_WORDS[key].short, what: DESTINATION_WORDS[key].what, number, value: v, spending: own[key].spending,
      months, reached: !!t?.reached, never: !!t?.never || (key === 'Barista FI' && !!number?.never), ym: months == null ? null : addMonths(base, months), date: t ?? null,
      when: t?.reached ? 'Reached' : months != null ? monthName(addMonths(base, months), 'short') : t?.never ? 'Not on this path' : null,
      share: v && x.invested != null ? x.invested / v : null,
      needs: v == null ? (number?.needs || []) : (t?.needs || []),
      assumes: [...own[key].assumes, ...common], guess: !!number?.guess,
      gap: key === 'Barista FI' ? gap : null, jobHealth: key === 'Barista FI' ? jobHealth : null, healthOpen: key === 'Barista FI' ? health == null : null };
  });
}

// The FIRE dashboard (run Finish everything partly built, Part 18): every destination at one pace, next to the plan as
// it is, with Coast, and the share of each number already invested. Nothing new is worked out: the views are
// destinationsOf at the pace (M9G on M53), Coast is coastReachedOf (M54).
export function fireBoardOf(m, doc, { now = new Date(), extra = 0, realReturn = null } = {}) {
  const base = destinationsOf(m, doc, { now });
  const pace = extra || realReturn != null ? destinationsOf(m, doc, { now, extra, realReturn }) : base;
  const views = pace.map(v => {
    const b = base.find(x => x.key === v.key);
    return { ...v, sooner: b?.months != null && v.months != null ? b.months - v.months : null, baseWhen: b?.when ?? null };
  });
  const coast = coastReachedOf(m, doc, { now });
  const regular = views.find(v => v.key === 'Regular FI');
  return { views, coast: { value: coast.coast, reached: coast.reached, invested: coast.invested, retireAge: coast.retireAge, gap: coast.coast != null && coast.invested != null && !coast.reached ? coast.coast - coast.invested : null, text: m.coastFi?.text ?? null },
    invested: m.inputs.invested ?? null, going: (m.investing?.monthly ?? m.surplus?.value ?? null), extra, realReturn: realReturn ?? m.inputs.realReturn ?? null,
    nearest: views.filter(v => v.months != null && !v.reached).sort((a, b) => a.months - b.months)[0] ?? null, regular: regular ?? null };
}

// What Barista closes, in months: the Regular date less the Barista date on the same path.
export function baristaSooner(views) {
  const b = views.find(v => v.key === 'Barista FI'), r = views.find(v => v.key === 'Regular FI');
  return b?.months != null && r?.months != null ? r.months - b.months : null;
}

// M9X: the stress table on the plan's own path. The grid (withdrawal rates and returns) is in Reference data.
export function stressOf(m, ref, { now = new Date() } = {}) {
  const x = m.inputs, g = ref.fiStress;
  return fiStress({ invested: x.invested, monthlyInvesting: m.investing?.monthly ?? null, annualSpending: x.retirementSpending == null ? null : x.retirementSpending * 12 },
    { rates: g.withdrawalRates, returns: g.returns }, { before: m.investing?.before ?? null, changes: m.investing?.changes ?? null, from: now });
}

// M9Y, living apart (Eli, Nov 25 2026): what one person of the pod would need alone, as a range. The low end is
// their own month as the pod counts it today (their rows and their part of each shared row). The high end is the
// same month with every shared row they take part in paid whole (the rent of the same home, alone). The app cannot
// know what a smaller home would cost, so it gives both ends and says so. m: the person's view; all: the Everyone view.
export function apartOf(m, all) {
  const x = m.inputs, w = x.withdrawalRate, spend = x.retirementSpending;
  if (spend == null || w == null) return { low: null, high: null, sharedMore: null, needs: ['spending'] };
  const part = l => myShare(l, { roommates: x.roommates }).value ?? 0;
  const whole = new Map(all.inputs.lines.map(l => [l.id, myShare(l, { roommates: all.inputs.roommates }).value ?? 0]));
  const sharedMore = x.lines.reduce((s, l) => s + Math.max(0, (whole.get(l.id) ?? part(l)) - part(l)), 0);
  const low = spend * 12 / w, high = (spend + sharedMore) * 12 / w;
  return { low, high, sharedMore, spending: spend, needs: [],
    text: sharedMore > 0
      ? `Low end: ${fmt.money(spend)} a month, your rows and your part of each shared row, times 12, divided by ${pctWords(w)} = ${fmt.money(low)}. High end: the same month plus ${fmt.money(sharedMore)}, the other people's parts of the rows you share, so ${fmt.money(spend + sharedMore)} a month times 12, divided by ${pctWords(w)} = ${fmt.money(high)}. A smaller home or plan of your own lands between the two.`
      : `${fmt.money(spend)} a month times 12, divided by ${pctWords(w)} = ${fmt.money(low)}. No row is shared with anyone, so living apart changes nothing here.` };
}

// M9Y: one FI number for a pod, people who pool costs (a chosen family, housemates, siblings). The household engine
// already reads the pod: metrics() in the Everyone view counts every shared row once, whole, and each adult's view
// counts their own rows and their part of the shared ones (M9N). The pod's date is the pod's invested money growing
// with what the pod puts in each month. Each person's line is the part of the pod's month that they carry.
export function podFiOf(doc, ref, { now = new Date() } = {}) {
  const adults = adultsOf(doc);
  if (adults.length < 2) return { id: 'M9Y', value: null, needs: ['a second adult on About you'], people: [], text: 'A pod is two or more adults who share costs. Add the people on About you, then mark the rows you share.' };
  const names = personLabels(doc);
  const all = metrics(doc, ref, { now, person: 'all' });
  const w = all.inputs.withdrawalRate, spend = all.inputs.retirementSpending;
  const each = adults.map(a => {
    const m = metrics(doc, ref, { now, person: a.id });
    return { id: a.id, name: names[a.id] ?? a.name ?? a.id, spending: m.inputs.retirementSpending, invested: m.inputs.invested, number: m.fiNumber.value, apart: apartOf(m, all) };
  });
  if (spend == null || w == null) return { id: 'M9Y', value: null, needs: ['spending for the pod'], people: each, text: 'Needs the pod\'s spending.' };
  const pod = fiNumber({ annualSpending: spend * 12, withdrawalRate: w });
  const invested = all.inputs.invested;
  const date = invested == null || all.investing?.monthly == null ? null : fiDate({ invested, monthlyInvesting: all.investing.monthly, realReturn: all.inputs.realReturn, target: pod.value }, { from: now, before: all.investing.before ?? null, changes: all.investing.changes ?? null });
  const months = invested != null && invested >= pod.value ? 0 : date?.value ?? null;
  return { id: 'M9Y', value: pod.value, needs: [], unit: 'money', guess: false, people: each.map(p => ({ ...p, share: p.spending == null || !spend ? null : p.spending / spend })),
    spending: spend, invested, months, reached: months === 0, never: !!date?.never, ym: months == null ? null : addMonths(ymOf(now), months),
    share: invested == null ? null : invested / pod.value,
    text: `The pod spends ${fmt.money(spend)} a month together (every shared cost counted once). ${fmt.money(spend * 12)} a year divided by ${pctWords(w)} = ${fmt.money(pod.value)}. ${each.filter(p => p.spending != null).map(p => `${p.name} carries ${fmt.money(p.spending)} a month of it`).join('; ')}.` };
}

// The day the Coast date is reached: invested (a known balance) is at or over the Coast FI number (M54). The card
// shows one time: seen is the day it was closed (program.destinations.coastSeen).
export function coastReachedOf(m, doc, { now = new Date() } = {}) {
  const coast = m.coastFi?.value ?? null, inv = m.inputs.invested;
  const reached = coast != null && inv != null && !!m.inputs.investedKnown && inv >= coast;
  const seen = doc.program?.destinations?.coastSeen ?? null;
  // Back under Coast after the card was closed (Eli, Nov 25 2026): one quiet Recalculating card with the gap and the
  // new Coast date on the plan's own path (the debt-first months and the known changes ahead). Hidden for the month
  // it is closed in (coastBelowSeen). Never on a guessed balance.
  const going = m.investing?.monthly ?? null, bf = m.investing?.before ?? null, x = m.inputs;
  const left = x.age != null && x.retireAge != null ? Math.max(0, Math.round((x.retireAge - x.age) * 12)) : 840;
  const k = seen && !reached && coast != null && inv != null && !!x.investedKnown
    ? rcCoast({ invested: inv, coast, realReturn: x.realReturn, nowAt: now, maxMonths: left, monthly: going == null ? null : n => (bf && n < bf.months ? bf.monthly : going + changeAt(m.investing?.changes, n)) }) : null;
  const ym = ymOf(now);
  return { reached, show: reached && !seen, seen, coast, invested: inv, retireAge: m.inputs.retireAge ?? null, over: reached ? inv - coast : null,
    below: k?.below ? { ...k, words: rcCoastWords(k), show: doc.program?.destinations?.coastBelowSeen !== ym, month: ym,
      text: `Your Coast number is ${fmt.money(coast)} and ${fmt.money(inv)} is invested: ${fmt.money(coast)} less ${fmt.money(inv)} = ${fmt.money(k.by)}. The Coast number grows each month at the same return as your money, so the date is the month what you put in closes that gap.` } : null,
    text: reached ? `${fmt.money(inv)} invested is at or over your Coast number, ${fmt.money(coast)}. ${m.coastFi.text}` : null };
}

// The FIRE statuses of one person (run FIRE statuses and the life timeline, Nov 27 2026, Part 1; Eli: the FIRE types are
// statuses on the FOO timeline, not goals). One list for every screen: Coast, Lean, Barista, FI, Chubby and Fat, each
// with its number, whether it is reached, its date at today's pace, Guess / Close / Exact and its math. Nothing new is
// worked out: the numbers and dates are destinationsOf (M9G on M53), the Coast number is M54 and its date is rcCoast
// (the Coast number grows each month, so only what goes in closes the gap). stList (js/math/statuses.js, the one
// function both apps call) decides what is reached and puts the list in order.
// level: 'Guess', 'Close' or 'Exact' (the FI date's own confidence, from the screen's gate). options: the statuses of
// data/library/status-options.json (the draft words of each card). The taps are kept on the plan
// (program.destinations): coastSeen and statusSeen (the day a card was closed), coastBelowSeen and statusBelow (the
// month a Recalculating line was closed for).
const STATUS_OF = { 'Lean FI': 'Lean', 'Barista FI': 'Barista', 'Regular FI': 'FI', 'Chubby FI': 'Chubby', 'Fat FI': 'Fat' };
export function statusesOf(m, doc, { now = new Date(), level = 'Guess', options = null } = {}) {
  const x = m.inputs, D = doc.program?.destinations || {}, ym = ymOf(now);
  const items = destinationsOf(m, doc, { now }).map(v => ({ key: STATUS_OF[v.key], value: v.value, months: v.months, never: v.never, needs: v.needs,
    note: v.spending != null ? `${fmt.money(v.spending)} a month from investments` : null, math: [v.number?.text, v.date?.text].filter(Boolean) }));
  const coast = m.coastFi?.value ?? null, going = m.investing?.monthly ?? null, bf = m.investing?.before ?? null;
  const left = x.age != null && x.retireAge != null ? Math.max(0, Math.round((x.retireAge - x.age) * 12)) : 840;
  const k = coast == null || x.invested == null ? null : rcCoast({ invested: x.invested, coast, realReturn: x.realReturn, nowAt: now, maxMonths: left, monthly: going == null ? null : n => (bf && n < bf.months ? bf.monthly : going + changeAt(m.investing?.changes, n)) });
  items.unshift({ key: 'Coast', value: coast, months: k?.months ?? null, never: !!k && k.months == null, needs: m.coastFi?.needs || [],
    math: [m.coastFi?.text, k?.below && k.months != null ? 'The Coast number grows each month at the same return as your money, so the date is the month what you put in closes the gap.' : null].filter(Boolean) });
  const list = stList({ invested: x.invested, known: !!x.investedKnown, level, nowYm: ym, items, options: options?.statuses || null, money: fmt.money,
    seen: { ...(D.statusSeen || {}), ...(D.coastSeen ? { Coast: D.coastSeen } : {}) } });
  return { list, markers: stMarkers(list), card: stCard(list), line: stLine(list, { money: fmt.money }),
    below: stBelow(list, { hidden: { ...(D.statusBelow || {}), ...(D.coastBelowSeen ? { Coast: D.coastBelowSeen } : {}) }, month: ym, money: fmt.money }) };
}
// What to save when a card is closed, as a patch for setDestinations (js/plan.js). Coast keeps its own keys (the
// cards closed before this run stay closed).
export function statusSeenPatch(doc, key, day) {
  const D = doc.program?.destinations || {};
  return key === 'Coast' ? { coastSeen: day } : { statusSeen: { ...(D.statusSeen || {}), [key]: day } };
}
export function statusBelowPatch(doc, key, month) {
  const D = doc.program?.destinations || {};
  return key === 'Coast' ? { coastBelowSeen: month } : { statusBelow: { ...(D.statusBelow || {}), [key]: month } };
}
// The FOO steps with the status markers between them, in date order. No step moves or changes (one FOO order for
// everyone). F is foo()'s result; markers come from statusesOf.
export function fooWithStatuses(F, markers, { now = new Date() } = {}) {
  const base = ymOf(now), months = ym => { const [y, mo] = ym.split('-').map(Number), [by, bm] = base.split('-').map(Number); return (y - by) * 12 + (mo - bm); };
  return stWeave(F.steps, markers, s => (s.status === 'Done' ? 'done' : s.date ? Math.max(0, months(s.date)) : F.here === s.id ? 0 : null));
}
