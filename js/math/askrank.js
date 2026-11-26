// SPDX-License-Identifier: AGPL-3.0-only
// Asking fewer questions (run "Finish everything partly built", Part 17, Nov 26 2026; M8Y). ONE ranking of open
// questions for both apps: js/math/nextbest.js (Ask me next, M9Q) sorts its questions with arRank, and
// tools/game_askrank_build.mjs copies this file word for word into game/core/askrank.js, where the game ranks its
// blanks with the same functions. Pure, and with no import on purpose. Every name starts with ar or AR_ because the
// game has one global scope. Empty is not zero: a missing number gives null, never 0.
//
// THREE TOOLS, each a plain function on plain numbers that the caller works out with its own engine:
// 1. The cost of not knowing (arYearOn, arSwing): a blank is set to the low end and the high end of its range, and the
//    caller's engine reads "your money a year from now" at both ends: net worth + 12 x (money in a month - money out a
//    month). The swing is the distance between the two, in dollars: what the blank could move.
// 2. The ranking (arRank): score = what the answer buys / the seconds the question takes (a tap is 1). The higher
//    score goes first; on a near tie (AR_RULES.tie, 2%) a preferred kind goes first (the caller's `first` test), then
//    the caller's own order.
// 3. The stopping rule (arStop): walk the ranked questions and ask until the ones asked cover AR_RULES.stopShare (80%)
//    of all that could move; the rest together move the other 20% or less, so the game stops asking and says so. It
//    is the 80/20 rule (the Pareto principle) on the dollars a blank could move: scale-free, so it fits a small
//    household and a large one alike. A question with no number yet that the plan cannot run without (value
//    Infinity) is always asked.

export const AR_RULES = { tie: 0.02, stopShare: 0.8 };
export const AR_SOURCE = 'SLAM design rule (Eli, run Finish everything partly built, Part 17, Nov 26 2026): the 80/20 rule (Pareto principle, after Vilfredo Pareto, 1896, and Joseph Juran) on the dollars each blank could move; the 2% near tie is the one of Ask me next (docs/engines/next-best.md, batch 43)';

// Your money a year from now: net worth today plus a year of what is left each month. null when a number is missing.
export function arYearOn(nw, inMonth, outMonth) {
  if (nw == null || inMonth == null || outMonth == null) return null;
  if (!Number.isFinite(+nw) || !Number.isFinite(+inMonth) || !Number.isFinite(+outMonth)) return null;
  return +nw + 12 * (+inMonth - +outMonth);
}
// The swing between the two ends of a blank, in dollars (null when an end is missing).
export function arSwing(atLow, atHigh) {
  if (atLow == null || atHigh == null) return null;
  return Math.abs(+atHigh - +atLow);
}
// What a question scores: its own score when it has one, else what it buys over its seconds (a tap is 1 second).
export function arScore(it) {
  if (it == null) return 0;
  if (it.score != null) return it.score;
  const v = it.value == null ? 0 : +it.value, s = it.seconds > 0 ? +it.seconds : 1;
  return v / s;
}
// The questions, top first. first: a test that names the kind preferred on a near tie (or null).
export function arRank(items, { tie = AR_RULES.tie, first = null } = {}) {
  return (items || []).slice().sort((a, b) => {
    const sa = arScore(a), sb = arScore(b);
    const close = sa === sb || Math.abs(sa - sb) <= tie * Math.max(sa, sb);
    if (!close) return sb - sa;
    if (first) {
      const fa = !!first(a), fb = !!first(b);
      if (fa !== fb) return fa ? -1 : 1;
    }
    return (a.order ?? 0) - (b.order ?? 0);
  });
}
// The stopping rule on ranked questions (top first). ask: the questions worth asking; rest: the ones that together move
// at most 1 - share of the total; total, asked and restValue in the questions' own unit (dollars in the game);
// stop: true when there is a rest to leave as it is.
export function arStop(ranked, share = AR_RULES.stopShare) {
  const list = (ranked || []).filter(it => it && it.value != null && +it.value >= 0);
  const must = list.filter(it => it.value === Infinity), open = list.filter(it => it.value !== Infinity);
  const total = open.reduce((t, it) => t + +it.value, 0);
  const ask = must.slice(), rest = [];
  let asked = 0;
  for (const it of open) {
    if (total > 0 && asked < share * total) { ask.push(it); asked += +it.value; }
    else rest.push(it);
  }
  return { ask, rest, total, asked, restValue: total - asked, cover: total > 0 ? asked / total : null, stop: rest.length > 0 };
}
