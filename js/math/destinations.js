// SPDX-License-Identifier: AGPL-3.0-only
// The FI destinations (run of Nov 25 2026). Pure: no DOM. Every number here comes from a function that already
// works it out: the FI numbers from fiTargets (js/plan.js), each date from monthsTo (the plan's own path), the stress
// table from fiStress (M9X), the pod from metrics() in the Everyone view and each adult's view (the household
// engine, M9N), and the Coast date from the Coast FI number (M54).
import { metrics } from './metrics.js';
import { fiNumber, fiDate, baristaGap, fiStress } from './fi.js';
import { fiTargets, monthsTo, fatExtrasOf, FAT_FACTOR } from '../plan.js';
import { addMonths, ymOf, monthName } from '../month.js';
import { fmt } from './result.js';
import { adultsOf, personLabels } from '../registry/couples.js';
import { DESTINATIONS, DESTINATION_WORDS, FOO_BY_DESTINATION } from '../registry/destinations.js';

const pctWords = v => `${+(v * 100).toFixed(2)}%`;

// M9G: each destination as one view: its number, its date on the plan's own path, and what it assumes, in words.
export function destinationsOf(m, doc, { now = new Date() } = {}) {
  const x = m.inputs, T = fiTargets(m, doc), w = x.withdrawalRate;
  const going = m.investing?.monthly ?? m.surplus?.value ?? null;
  const spend = x.retirementSpending, base = ymOf(now);
  const common = [
    w == null ? null : `A ${pctWords(w)} withdrawal rate: each year you take out that share of what is invested.`,
    x.realReturn == null ? null : `Growth of ${pctWords(x.realReturn)} a year after inflation.`,
    going == null ? null : `${fmt.money(going)} going in each month, as it does today.`,
  ].filter(Boolean);
  const partTime = doc.assumptions?.partTimeIncome ?? null, health = doc.assumptions?.lifeHealth ?? null;
  const extras = fatExtrasOf(doc);
  const lean = T['Lean FI'].value == null || w == null ? null : T['Lean FI'].value * w / 12;
  const gap = spend == null || partTime == null ? null : baristaGap({ annualSpending: spend * 12, partTimeIncome: partTime * 12, healthAnnual: health == null ? null : health * 12, withdrawalRate: w });
  const own = {
    'Lean FI': { spending: lean, assumes: [lean == null ? 'Your food, housing and transportation lines, once they are in.' : `Only food, housing and transportation: ${fmt.money(lean)} a month${spend != null ? ` of the ${fmt.money(spend)} you spend today` : ''}.`, 'Everything else is paid from work you choose to do, or goes.'] },
    'Barista FI': { spending: spend == null || partTime == null ? null : Math.max(0, spend - partTime), assumes: [partTime == null ? 'Part-time pay a month, once you tap it.' : `Part-time pay of ${fmt.money(partTime)} a month, for as long as the plan needs it.`, health == null ? 'What health insurance costs a month, once you tap it.' : `Health insurance of ${fmt.money(health)} a month, paid from that pay first.`, spend == null ? null : `The rest of the ${fmt.money(spend)} a month comes from investments.`].filter(Boolean) },
    'Regular FI': { spending: spend, assumes: [spend == null ? 'Your monthly spending, once it is in.' : `The life you live today: ${fmt.money(spend)} a month, for good.`] },
    'Chubby FI': { spending: T['Chubby FI'].value == null || w == null ? null : T['Chubby FI'].value * w / 12, assumes: ['Halfway between Regular and Fat.', extras == null ? `Fat is ${FAT_FACTOR} times your spending until you tap your own extras.` : `Half of the ${fmt.money(extras)} a month on your Fat list.`] },
    'Fat FI': { spending: T['Fat FI'].value == null || w == null ? null : T['Fat FI'].value * w / 12, assumes: [extras == null ? `${FAT_FACTOR} times your spending, a stand-in until you tap your own extras on the Fat list.` : `Today's spending plus the ${fmt.money(extras)} a month on your Fat list.`] },
  };
  return DESTINATIONS.map(key => {
    const number = T[key], v = number?.value ?? null;
    const t = v == null ? null : monthsTo(m, v, { now });
    const months = t?.reached ? 0 : t?.value ?? null;
    return { key, short: DESTINATION_WORDS[key].short, what: DESTINATION_WORDS[key].what, number, value: v, spending: own[key].spending,
      months, reached: !!t?.reached, never: !!t?.never || (key === 'Barista FI' && !!number?.never), ym: months == null ? null : addMonths(base, months), date: t ?? null,
      when: t?.reached ? 'Reached' : months != null ? monthName(addMonths(base, months), 'short') : t?.never ? 'Not on this path' : null,
      share: v && x.invested != null ? x.invested / v : null,
      needs: v == null ? (number?.needs || []) : (t?.needs || []),
      assumes: [...own[key].assumes, ...common], guess: !!number?.guess,
      gap: key === 'Barista FI' ? gap : null };
  });
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
    return { id: a.id, name: names[a.id] ?? a.name ?? a.id, spending: m.inputs.retirementSpending, invested: m.inputs.invested, number: m.fiNumber.value };
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
export function coastReachedOf(m, doc) {
  const coast = m.coastFi?.value ?? null, inv = m.inputs.invested;
  const reached = coast != null && inv != null && !!m.inputs.investedKnown && inv >= coast;
  const seen = doc.program?.destinations?.coastSeen ?? null;
  return { reached, show: reached && !seen, seen, coast, invested: inv, retireAge: m.inputs.retireAge ?? null, over: reached ? inv - coast : null,
    text: reached ? `${fmt.money(inv)} invested is at or over your Coast number, ${fmt.money(coast)}. ${m.coastFi.text}` : null };
}

// The FOO by destination: the same steps (js/math/foo.js), in the order for where you are going, and the finish line
// at that destination's number and date. F is foo()'s result; view is the destination's view from destinationsOf.
export function fooFor(F, view) {
  const key = view?.key && FOO_BY_DESTINATION[view.key] ? view.key : 'Regular FI', D = FOO_BY_DESTINATION[key];
  const byId = new Map(F.steps.map(s => [s.id, s]));
  const standard = F.steps.map(s => s.id);
  const steps = D.order.filter(id => byId.has(id)).map(id => {
    const s = byId.get(id);
    const finish = id === '9' && key !== 'Regular FI' && view?.value != null;
    return { id, name: finish ? `Reach your ${view.short} number` : s.name, status: finish ? (view.reached ? 'Done' : s.status === 'Done' ? 'Later' : s.status) : s.status,
      date: finish ? view.ym : s.date ?? null, target: finish ? view.value : null, moved: standard.indexOf(id) !== D.order.filter(x => byId.has(x)).indexOf(id), why: D.why[id] ?? null };
  });
  const here = steps.find(s => !['Done', 'Locked', 'Off', 'Optional'].includes(s.status))?.id ?? null;
  return { key, short: view?.short ?? 'Regular', steps, here, changed: steps.some(s => s.why) };
}
