// SPDX-License-Identifier: AGPL-3.0-only
// M9Q (Phase 4, Track 1, docs/engines/next-best.md): Ask me next and the certainty meter. Built on the ranges (M9R,
// js/math/ranges.js): each key output's low, likely and high, and the drivers that widen it.
//
// The certainty meter: for each key output, 1 minus its width over the width a plan from the age alone has (batch 46,
// QUESTIONS 371: agestart.js ageOnlyRangesOf, passed in as zero), else over the width it would have with every input on
// file read as a guess (no age yet, or no priors), clamped 0 to 1; the meter is their
// weighted average (RULES certaintyWeight*). Everything a guess reads 0%, everything at Know it near 100%. A date that
// could run on and never come counts as RULES.certaintyOpenMonths wide. It answers "how sure is this plan", which the
// Picture % ("how many boxes are filled") does not.
//
// Ask me next: the one input whose answer narrows the key ranges most per second of a call, and the runner-up. Its
// first inputs are the Picture %'s next small things (M73: an item the plan cannot run without comes first) and These
// are big deals (M56: on a near tie, the input behind the assumption that moves the FI date most wins). Then for each
// input not at Know it: read it at the level its answer reaches (the gut number read off a statement or an app reaches
// Estimate; a statements total built from the lines, any other number, Know it), run that one input again with the rest
// as they are, and add up each key output's drop in width over its all-guess width, by the output's weight; settling the
// FOO step counts too. Score = that over the seconds the question takes (RULES askSeconds*). Skipped: anything marked
// Will get it (it is homework already) or Not now (parked). Pure: reads a household, never the DOM, never saves.
import { metrics } from './metrics.js';
import { knobsOf, runsOf, rangeFromRuns, readOut, fooRangeOf, DATE, OUTPUTS } from './ranges.js';
import { pictureOf, nextSmallThings } from './picture.js';
import { statusOf } from '../records.js';
import { LEVELS } from '../registry/program.js';
import { RULES } from '../registry/assumptions.js';
import { fmt } from './result.js';

export const KEYS = Object.keys(OUTPUTS); // fi, debtFree, efMonths, surplus, netWorth
export const WEIGHTS = () => ({ fi: RULES.certaintyWeightFi, debtFree: RULES.certaintyWeightDebtFree, surplus: RULES.certaintyWeightSurplus, efMonths: RULES.certaintyWeightEf, netWorth: RULES.certaintyWeightNetWorth, foo: RULES.certaintyWeightFoo });
const SKIP = new Set(['Will email', 'Not now']);

// How wide a range counts: its width, or certaintyOpenMonths for a date that could run on and never come.
export function spanOf(key, r) {
  if (!r) return null;
  if (r.width === Infinity) return DATE.has(key) ? RULES.certaintyOpenMonths : null;
  return r.width;
}
// One output's certainty: 1 minus its width over its all-guess width, 0 to 1 (null when nothing could move it).
export function certaintyOf(key, r, guess) {
  const w = spanOf(key, r), g = spanOf(key, guess);
  if (w == null || g == null || g <= 0) return null;
  return Math.max(0, Math.min(1, 1 - w / g));
}

// The level a question's answer reaches, and how many seconds it takes on a call.
export function answerOf(k) {
  if (k.gut && k.level < LEVELS.Estimate) return { level: LEVELS.Estimate, seconds: RULES.askSecondsLookup };
  if (k.gut) return { level: LEVELS.Actual, seconds: RULES.askSecondsBuild };
  if (k.kind === 'spending') return { level: LEVELS.Actual, seconds: Math.min(RULES.askSecondsBuild, RULES.askSecondsNumber * (k.lines ?? 1)) };
  return { level: LEVELS.Actual, seconds: k.prior ? RULES.askSecondsLookup : RULES.askSecondsNumber };
}

// The question in plain words, from the client's side.
export function questionWords(k) {
  const label = k.label.replace(/ (balance|value|APR|pay|line)$/, '');
  if (k.gut) return k.level < LEVELS.Estimate ? 'What you spend a month, read off a bank or card app' : 'Your spending, built from the lines on the Budget';
  if (k.kind === 'spending') return k.lines > 1 ? 'The spending lines that are still a guess' : `${label}: the real amount`;
  if (k.kind === 'apr') return k.prior ? `The interest rate (APR) on ${label}` : `The exact interest rate (APR) on ${label}`;
  if (k.kind === 'income') return `${k.label}: the amount on a pay stub`;
  if (k.kind === 'variable') return `What ${label} brings in, from the last few months`;
  if (k.field === 'value') return `What the ${label.toLowerCase()} is worth today`;
  if (/net-worth\/(debt|credit)/.test(k.route ?? '')) return `What you owe on ${label} today`;
  return `What is in ${label} today`;
}
// Why it matters, in one line: what the answer pins down ("Pins your FI date to within about 2 years").
export function whyWords(n) {
  if (!n) return null;
  if (n.key === 'foo') return 'Settles which step of your plan you are on';
  if (n.missing) return 'Your plan needs this before it can show a range';
  const what = { fi: 'your FI date', debtFree: 'your debt-free date', efMonths: 'your emergency fund', surplus: 'what you keep each month', netWorth: 'your net worth' }[n.key];
  const to = n.to;
  if (to == null || to === Infinity) return `Narrows ${what}`;
  if (DATE.has(n.key)) {
    if (to < 1.5) return `Pins ${what} to the month`;
    if (to < 18) return `Pins ${what} to within about ${Math.round(to)} months`;
    const y = Math.round(to / 12);
    return `Pins ${what} to within about ${y} ${y === 1 ? 'year' : 'years'}`;
  }
  if (n.key === 'efMonths') { const mo = Math.max(0.5, Math.round(to * 2) / 2); return `Pins ${what} to within about ${mo} ${mo === 1 ? 'month' : 'months'} of spending`; }
  const step = 10 ** Math.max(1, Math.floor(Math.log10(Math.max(10, to))) - 1);
  return to < 1 ? `Pins ${what} to the dollar` : `Pins ${what} to within about ${fmt.money(Math.max(step, Math.round(to / step) * step))}${n.key === 'surplus' ? ' a month' : ''}`;
}

// Everything for Home: the meter, the next question and the runner-up. R: rangesOf for the same metrics; F: the FOO
// step's range (fooRangeOf), or null to leave the FOO out; flags: the FOO's flags (as the FOO screen reads them).
// zero (QUESTIONS 371, batch 46): the ranges of the plan from the age alone (agestart.js ageOnlyRangesOf), the meter's
// 0% and the width each answer's drop is measured against; without it (no age, or no priors) the all-guess widths stand.
export function askNextOf(doc, ref, { now = new Date(), person = null, m = null, R = null, F = null, flags = [], zero = null } = {}) {
  const base = m ?? metrics(doc, ref, { now, person });
  const b = readOut(base);
  if (!R) return { meter: null, questions: [], top: null, runnerUp: null };
  const W = WEIGHTS();
  // The all-guess widths: every input on file read as a guess (a typical amount stays typical).
  const guessKnobs = knobsOf(doc, ref, { force: (id, level, prior) => (prior ? null : LEVELS.Gut) });
  const guessRuns = runsOf(doc, ref, guessKnobs, { now, person }).map(({ k, low, high }) => ({ id: k.id, low, high }));
  const guess = Object.fromEntries(KEYS.map(k => [k, (zero && spanOf(k, zero[k]) ? zero[k] : null) ?? rangeFromRuns(k, b[k], guessRuns)]));
  // The meter.
  const parts = KEYS.map(k => ({ key: k, weight: W[k], value: certaintyOf(k, R[k], guess[k]) })).filter(p => p.value != null);
  const wsum = parts.reduce((s, p) => s + p.weight, 0);
  const meter = { value: wsum ? parts.reduce((s, p) => s + p.weight * p.value, 0) / wsum : 0, parts, none: !parts.length };
  // The candidates: every input still below Know it (or typical, not the client's own yet).
  const picture = pictureOf(doc, ref, { now });
  const small = nextSmallThings(picture, picture.items.length);
  const order = id => { const i = small.findIndex(it => it.id === id || (id === 'spending' && (it.id === 'gut' || it.group === 'spending'))); return i < 0 ? small.length : i; };
  const recOf = id => doc.records.find(r => r.id === id);
  const knobs = knobsOf(doc, ref);
  const out = [];
  for (const k of knobs) {
    if (!k.prior && k.level >= LEVELS.Actual) continue;
    const rec = recOf(k.recId);
    if (rec && SKIP.has(statusOf(rec, k.field))) continue;
    const ans = answerOf(k);
    const answered = knobsOf(doc, ref, { force: id => (id === k.id ? ans.level : null) }).find(x => x.id === k.id) ?? null;
    const swapped = answered ? runsOf(doc, ref, [answered], { now, person }).map(({ k: x, low, high }) => ({ id: x.id, low, high })) : [];
    const runs = [...R.runs.filter(r => r.id !== k.id), ...swapped];
    let value = 0, best = null;
    for (const key of KEYS) {
      if (!R[key] || b[key] == null) continue;
      const g = spanOf(key, guess[key]);
      if (!g) continue;
      const after = rangeFromRuns(key, b[key], runs);
      const drop = (spanOf(key, R[key]) ?? 0) - (spanOf(key, after) ?? 0);
      if (drop <= 1e-9) continue;
      const v = W[key] * drop / g;
      value += v;
      if (!best || v > best.v) best = { v, key, from: R[key].width, to: after?.width ?? null };
    }
    // Settling the FOO step: the step could move on this input now, and its answer keeps it put.
    if (F?.moves && F.drivers.some(d => d.id === k.id)) {
      const F2 = fooRangeOf(doc, ref, { now, flags, knobs: [...knobs.filter(x => x.id !== k.id), ...(answered ? [answered] : [])], ...(person ? { person } : {}) });
      if (F2 && !F2.moves) { value += W.foo; if (!best || W.foo > best.v) best = { v: W.foo, key: 'foo' }; }
    }
    if (value <= 1e-9) continue;
    out.push({ id: k.id, recId: k.recId, field: k.field, route: k.route, focus: k.gut && ans.level === LEVELS.Estimate ? 'gut:from' : k.focus ?? `${k.recId}:${k.field}`, kind: k.kind, label: k.label, level: k.level, prior: !!k.prior,
      question: questionWords(k), narrows: best, why: whyWords(best), value, seconds: ans.seconds, answer: ans.level, score: value / ans.seconds, order: order(k.id) });
  }
  // M56: on a near tie, the input behind the assumption that moves the FI date most goes first (Spending: the spending input).
  const deal = base.bigDeals?.value === 'Spending' ? 'spending' : null;
  out.sort((a, b2) => {
    const tie = Math.abs(a.score - b2.score) <= 0.02 * Math.max(a.score, b2.score);
    if (!tie) return b2.score - a.score;
    if (deal && (a.kind === 'spending') !== (b2.kind === 'spending')) return a.kind === 'spending' ? -1 : 1;
    return a.order - b2.order;
  });
  // M73 first: an item the plan cannot run without (nothing typed yet) comes before any narrowing.
  const missing = small.filter(it => it.level === LEVELS.Missing && !knobs.some(k => k.id === it.id) && !(it.recId && SKIP.has(statusOf(recOf(it.recId) ?? {}, it.field))))
    .map(it => ({ id: it.id, recId: it.recId ?? null, field: it.field ?? null, route: it.route, focus: it.focus ?? (it.recId && it.field ? `${it.recId}:${it.field}` : null), kind: 'missing', label: it.label, level: it.level, prior: false,
      question: `${it.label} (nothing in yet)`, narrows: { key: it.group, missing: true }, why: whyWords({ missing: true }), value: null, seconds: RULES.askSecondsNumber, answer: LEVELS.Rough, score: Infinity, order: order(it.id), missing: true }));
  const questions = [...missing, ...out];
  return { meter, guess, questions, top: questions[0] ?? null, runnerUp: questions[1] ?? null };
}
