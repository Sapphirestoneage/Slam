// SPDX-License-Identifier: AGPL-3.0-only
// Quantum Collapse, measured (Eli's thesis: an age alone gives a plan, and each answer shrinks the uncertainty).
// Made-up households answer the first questions in every possible combination. For each combination the plan is built
// the way the page builds it (planOf) and two things are read: how wide the FI date range is, and how far the plan's
// FI date sits from where it lands once everything is answered. From all 32 combinations per household comes each
// question's fair share of the shrinking (its average effect over every order it could be asked in), and the order
// that shrinks the most soonest. Usage: node tools/collapse/measure.mjs [households, default 300] [seed] [out.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { Store, newHousehold } from '../../js/records.js';
import { QUESTIONS, answer, planOf } from '../../js/journey.js';

const read = f => JSON.parse(readFileSync(new URL(`../../data/${f}`, import.meta.url)));
const ref = read('reference-2026.json'), priors = read('priors-2026.json'), flags = read('flags.json');
const [nArg = '300', seedArg = '20261115', out = null] = process.argv.slice(2);
const N = Number(nArg), now = new Date(2026, 10, 15), CAP = 840; // months: a date past 70 years out counts as 70 years
let s = Number(seedArg) >>> 0;
const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const between = (lo, hi) => lo + rnd() * (hi - lo), round = (v, to) => Math.round(v / to) * to;
const logn = (lo, hi) => Math.exp(between(Math.log(lo), Math.log(hi)));

// A made-up person. Spending is a share of pay, savings and investments grow with age, debts come with their usual odds.
function person() {
  const age = Math.floor(between(22, 56)), takeHome = round(logn(2200, 12000), 50), spending = round(takeHome * between(0.5, 1.02), 50);
  const years = age - 22, saved = Math.max(0, takeHome - spending);
  const debts = {}; if (rnd() < 0.45) debts['Credit card'] = round(logn(500, 20000), 100); if (rnd() < 0.35) debts['Student loan'] = round(logn(5000, 80000), 500); if (rnd() < 0.15) debts['Personal loan'] = round(logn(1000, 25000), 500);
  return { birthYear: 2026 - age, age, answers: {
    income: { takeHome }, spending: { gut: spending },
    cash: { checking: round(logn(200, 6000), 100), savings: rnd() < 0.25 ? 0 : round(logn(500, 40000), 100) },
    invested: { invested: rnd() < 0.2 ? 0 : round((saved * 12 * years * between(0.1, 0.8) + logn(500, 20000)), 500) },
    card: debts } };
}
const KEYS = QUESTIONS.map(q => q.key), K = KEYS.length;
function read1(p, mask) {
  const st = new Store(newHousehold({ name: 'Me' })); st.setDoc('profile', { birthYear: p.birthYear, state: 'NY', nyc: true });
  KEYS.forEach((k, i) => { if (mask & (1 << i)) { const a = p.answers[k]; if (k === 'card' && !Object.keys(a).length) answer(st, 'card', {}, { none: true }); else if (k === 'invested' && !a.invested) answer(st, 'invested', {}, { none: true }); else answer(st, k, a); } });
  const plan = planOf(st.doc, ref, priors, { flags, now }), r = plan.fi.range;
  // no range at all ("Past 70 years") is not certainty: it counts as the full width, and as not holding any date
  const none = r?.low == null && r?.high == null, lo = none ? 0 : Math.min(CAP, r.low ?? 0), hi = none ? CAP : Math.min(CAP, r.high ?? CAP), months = Math.min(CAP, plan.fi.months ?? CAP);
  return { width: Math.max(0, hi - lo), months, none, lo: r?.low ?? null, hi: r?.high ?? null, step: plan.step?.id ?? null };
}
const perms = (a => { const res = []; const go = (rest, acc) => { if (!rest.length) res.push(acc); rest.forEach((v, i) => go([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, v])); }; go(a, []); return res; })([...Array(K).keys()]);
const FULL = (1 << K) - 1;
const sumW = new Float64Array(1 << K), sumE = new Float64Array(1 << K), sumIn = new Float64Array(1 << K), sumStep = new Float64Array(1 << K), wider = new Float64Array(K), asked = new Float64Array(K); let done = 0, skipped = 0, never = 0;
const t0 = Date.now();
for (let n = 0; n < N; n++) {
  const p = person(); let rows;
  try { rows = Array.from({ length: 1 << K }, (_, mask) => read1(p, mask)); } catch { skipped++; continue; }
  const truth = rows[FULL].months;
  if (truth >= CAP) { never++; done++; continue; } // no FI date on these answers (spending at or over pay): counted apart
  const stepTruth = rows[FULL].step;
  rows.forEach((r, mask) => { sumW[mask] += r.width; sumE[mask] += Math.abs(r.months - truth); sumIn[mask] += !r.none && (r.lo == null || truth >= r.lo - 0.5) && (r.hi == null || truth <= r.hi + 0.5) ? 1 : 0; sumStep[mask] += r.step === stepTruth ? 1 : 0; });
  // how often one more answer makes the stated range wider, not narrower (in today's order)
  { let mask = 0; KEYS.forEach((_, i) => { const before = rows[mask].width; mask |= 1 << i; asked[i]++; if (rows[mask].width > before + 0.5) wider[i]++; }); }
  done++;
}
const measured = done - never;
const W = Array.from(sumW, v => v / measured), E = Array.from(sumE, v => v / measured), IN = Array.from(sumIn, v => v / measured), STEP = Array.from(sumStep, v => 1 - v / measured);
// each question's fair share: its average marginal effect over all 120 orders
const share = M => KEYS.map((_, i) => { let tot = 0; for (const o of perms) { let mask = 0; for (const j of o) { if (j === i) { tot += M[mask] - M[mask | (1 << i)]; break; } mask |= 1 << j; } } return tot / perms.length; });
const curve = (o, M) => { let mask = 0; return [M[0], ...o.map(j => M[mask |= 1 << j])]; };
const area = (o, M) => curve(o, M).reduce((a, v) => a + v, 0); // smaller is better: less uncertainty carried along the way
const best = M => perms.reduce((b, o) => (area(o, M) < area(b, M) ? o : b));
const today = [...Array(K).keys()], bestE = best(E), bestW = best(W);
const both = o => area(o, E) / E[0] + area(o, STEP) / STEP[0], bestBoth = perms.reduce((b, o) => (both(o) < both(b) ? o : b));
const moved = [0, 1, 3, 4, 2]; // today's order with cash moved to the end
const pairFirst = { error: E[3], width: W[3], inside: IN[3], stepWrong: STEP[3] }; // pay and spending answered together
const result = { households: measured, byMask: { error: E, stepWrong: STEP, width: W, inside: IN }, bothBest: { order: bestBoth.map(i => KEYS[i]), error: curve(bestBoth, E), stepWrong: curve(bestBoth, STEP), score: both(bestBoth), scoreToday: both(today) }, pairFirst, inside: { today: curve(today, IN) }, stepWrong: { start: STEP[0], share: share(STEP), today: curve(today, STEP), best: best(STEP).map(i => KEYS[i]) }, cashLast: { error: curve(moved, E), stepWrong: curve(moved, STEP), areaError: area(moved, E), areaStep: area(moved, STEP), areaStepToday: area(today, STEP) }, skipped, never, widerShare: Array.from(wider, (v, i) => v / asked[i]), seed: Number(seedArg), capMonths: CAP, questions: KEYS,
  width: { start: W[0], end: W[FULL], share: share(W), today: curve(today, W), best: bestW.map(i => KEYS[i]), bestCurve: curve(bestW, W) },
  error: { start: E[0], end: E[FULL], share: share(E), today: curve(today, E), best: bestE.map(i => KEYS[i]), bestCurve: curve(bestE, E), areaToday: area(today, E), areaBest: area(bestE, E) },
  seconds: (Date.now() - t0) / 1000 };
if (out) writeFileSync(out, JSON.stringify(result, null, 1));
const yrs = m => (m / 12).toFixed(1);
console.log(`${measured} households measured, ${never} more with no FI date on their answers, ${skipped} skipped, ${result.seconds.toFixed(0)}s`);
console.log('How far the plan\'s FI date is from where it lands (years), after each answer, in today\'s order:');
console.log('  age only ' + yrs(E[0]) + today.map((j, i) => `  +${KEYS[j]} ${yrs(result.error.today[i + 1])}`).join(''));
console.log('Each question\'s share of closing that gap (years): ' + KEYS.map((k, i) => `${k} ${yrs(result.error.share[i])}`).join(', '));
console.log('Order that closes it soonest: ' + result.error.best.join(', ') + `  (carried gap ${yrs(result.error.areaBest)} against ${yrs(result.error.areaToday)} today)`);
console.log('Width of the stated range (years): age only ' + yrs(W[0]) + today.map((j, i) => `  +${KEYS[j]} ${yrs(result.width.today[i + 1])}`).join(''));
console.log('Each question\'s share of narrowing it (years): ' + KEYS.map((k, i) => `${k} ${yrs(result.width.share[i])}`).join(', '));
console.log('Order that narrows it soonest: ' + result.width.best.join(', '));
console.log('How often the stated range holds the date it lands on: age only ' + Math.round(IN[0] * 100) + '%' + today.map((j, i) => `  +${KEYS[j]} ${Math.round(result.inside.today[i + 1] * 100)}%`).join(''));
console.log('How often the next step named is not the one it lands on: age only ' + Math.round(STEP[0] * 100) + '%' + today.map((j, i) => `  +${KEYS[j]} ${Math.round(result.stepWrong.today[i + 1] * 100)}%`).join(''));
console.log('Each question\'s share of getting the next step right (points): ' + KEYS.map((k, i) => `${k} ${Math.round(result.stepWrong.share[i] * 100)}`).join(', ') + '. Soonest order: ' + result.stepWrong.best.join(', '));
console.log(`Pay and spending answered together first: ${yrs(pairFirst.error)} years off, next step off ${Math.round(pairFirst.stepWrong * 100)}%`);
console.log(`Cash moved to the end: gap carried ${yrs(result.cashLast.areaError)} (today ${yrs(result.error.areaToday)}); wrong next step carried ${result.cashLast.areaStep.toFixed(2)} (today ${result.cashLast.areaStepToday.toFixed(2)})`);
console.log(`Best order for the date and the next step together: ${result.bothBest.order.join(', ')}. Years off after each: ${result.bothBest.error.map(yrs).join(' ')}. Next step off after each: ${result.bothBest.stepWrong.map(v => Math.round(v * 100) + '%').join(' ')}`);
console.log('How often an answer made the stated range wider: ' + KEYS.map((k, i) => `${k} ${Math.round(result.widerShare[i] * 100)}%`).join(', '));
