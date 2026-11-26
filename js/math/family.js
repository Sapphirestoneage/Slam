// SPDX-License-Identifier: AGPL-3.0-only
// M8F, family money (run Not built, groups 1 to 5, Part 8). One engine for the web app's small pages (sandwich,
// boomerang and tuition .html, drawn by js/solo/calc.js) and the game's sheet "Family money" (game/features/family.js).
// Three parts:
// (1) the sandwich years: money to parents and to kids at the same time, for as long as each lasts, as monthly
//     changes ("flows") that each app runs through its own FI date (the web app's M53 by fiMoveOf, the game's goalSim
//     by freeAt), so there is one FI date in each app;
// (2) living at home (a boomerang kid): the rent saved each month next to the time it takes to reach a moving-out
//     goal, and what the stay asks of the household;
// (3) kids and tuition: childcare from a dated source row (or the person's own number), school or yeshiva tuition
//     for each year and each child, what to put away a month before it starts, the New York 529 deduction, and the
//     New York rule on K-12 tuition paid from a 529.
// No imports, so tools/game_family_build.mjs copies this file word for word into game/core/family.js. Every name
// starts with fm or FM_ because the game has one global scope. Empty is not zero: an answer not given yet is null,
// and a result that needs one says ready: false with the answers it needs in `needs`. Amounts are whole dollars, in
// today's money. Every outside number (the childcare row, the 529 limits) is passed in from data/reference-2026.json.

const fmNum = v => typeof v === 'number' && Number.isFinite(v);
const fmMonthly = rate => (1 + (rate ?? 0)) ** (1 / 12) - 1;

// Where the outside numbers come from, in the words each page shows under them. The numbers themselves are in
// data/reference-2026.json (childcare.NY, limits.ny529, limits.k12From529), with the same sources in
// js/registry/assumptions.js.
export const FM_SOURCES = {
  care: 'New York State Comptroller, Lingering Challenges in the Child Care Sector (February 2025): the statewide median market rate for a center, from the state\'s 2023 market rate survey (OCFS). Prices in New York City and nearby counties run higher.',
  careNone: 'No dated published number for this state is in the app yet, so the number is yours: a quote from a center or a sitter near you.',
  ny529: 'New York Tax Law section 612(c)(32): money the account owner puts into New York\'s own 529 plan comes off New York taxable income, up to a yearly limit (one limit single, a higher one married filing jointly). Checked November 25, 2026.',
  k12: 'Federal law lets a 529 pay K-12 tuition up to a yearly limit per child, raised for 2026 on (Public Law 119-21). New York does not count it as a qualified use: New York takes back the deductions on that money and taxes the earnings (New York Tax Department, TSB-M-18(6)I).',
};

// ---------- (1) the sandwich years ----------
// parents, kids: what goes to each a month (null: not answered; 0 is an answer). parentsYears, kidsYears: how long
// each lasts (null: no end in sight, so it stays in for as long as the plan runs). parentsFrom, kidsFrom: the years
// from now each one starts (0 is now). inSpending: true when the money is already in the monthly spending, so the
// plan has it already and nothing moves. left: what is left each month after spending (take-home less spending), for
// the share of it the family takes; with no left given, takeHome less spending when both are known. Returns the monthly total, the months both run at once, the total over the years
// (null while one has no end), the flows for the FI date and the goal dates, and what is left for the person's own goals.
export function fmSandwich({ parents = null, kids = null, parentsYears = null, kidsYears = null, parentsFrom = 0, kidsFrom = 0, inSpending = false, left = null, takeHome = null, spending = null } = {}) {
  const needs = [];
  if (!fmNum(parents) && !fmNum(kids)) needs.push('what goes to your parents or your kids a month');
  if ((parents ?? 0) < 0 || (kids ?? 0) < 0) needs.push('an amount of $0 or more');
  if (needs.length) return { ready: false, needs };
  const sides = [['parents', parents ?? 0, parentsYears, parentsFrom ?? 0], ['kids', kids ?? 0, kidsYears, kidsFrom ?? 0]]
    .map(([id, monthly, years, from]) => ({ id, monthly, years: fmNum(years) && years > 0 ? years : null, from: Math.max(0, from), start: Math.round(Math.max(0, from) * 12) }))
    .map(s => ({ ...s, end: s.years == null ? null : s.start + Math.round(s.years * 12), total: s.years == null ? null : s.monthly * Math.round(s.years * 12) }));
  const on = sides.filter(s => s.monthly > 0), total = on.filter(s => s.start === 0).reduce((a, s) => a + s.monthly, 0);
  const peak = on.reduce((a, s) => a + s.monthly, 0);
  // the months when both get money at once: the overlap of the two stretches
  let both = 0;
  if (on.length === 2) {
    const [a, b] = on, lo = Math.max(a.start, b.start), hi = Math.min(a.end ?? Infinity, b.end ?? Infinity);
    both = hi === Infinity ? null : Math.max(0, hi - lo);
  }
  const flows = inSpending ? [] : on.flatMap(s => [{ at: s.start, monthly: -s.monthly, name: s.id }, ...(s.end == null ? [] : [{ at: s.end, monthly: s.monthly, name: s.id }])]);
  const all = on.every(s => s.total != null) ? on.reduce((a, s) => a + s.total, 0) : null;
  const L = fmNum(left) ? left : fmNum(takeHome) && fmNum(spending) ? takeHome - spending : null;
  return { ready: true, sides, parents: parents ?? 0, kids: kids ?? 0, total, peak, year: peak * 12, both, all, flows, inSpending: !!inSpending,
    left: L, leftAfter: L == null ? null : inSpending ? L : L - peak, share: L != null && L > 0 ? peak / L : null };
}

// ---------- (2) living at home ----------
// rent: what a place of one's own would cost a month (the person's own number, or the first apartment's rent). payHome:
// what they pay the household a month (0 is an answer). savePct: the part of the rent saved that really goes to
// savings (0 to 1). months: how long the stay is meant to last. target: the moving-out goal (the cash to get the keys,
// from the first apartment page, or a down payment). have: saved already. homeCost: what the household spends more a
// month with them at home (food, utilities), for the household's side; null when not answered.
export function fmBoomerang({ rent = null, payHome = 0, savePct = 1, months = null, target = null, have = 0, homeCost = null } = {}) {
  const needs = [];
  if (!fmNum(rent) || rent <= 0) needs.push('the rent of a place of your own');
  if (!fmNum(months) || months <= 0) needs.push('how long you plan to stay');
  if (needs.length) return { ready: false, needs };
  const pay = Math.max(0, payHome ?? 0), share = Math.min(1, Math.max(0, savePct ?? 1)), h = Math.max(0, have ?? 0);
  const saved = Math.max(0, rent - pay), saving = saved * share, byPlan = h + saving * months;
  const goal = fmNum(target) && target > 0 ? target : null, gap = goal == null ? null : Math.max(0, goal - h);
  const reach = goal == null ? null : gap === 0 ? 0 : saving > 0 ? Math.ceil(gap / saving) : null;
  return { ready: true, rent, payHome: pay, savePct: share, months, have: h, saved, saving, savedAll: saved * months, byPlan,
    target: goal, reach, never: goal != null && reach == null, extra: reach == null ? null : Math.max(0, reach - months), spare: reach == null ? null : Math.max(0, months - reach),
    perMonthFor: goal == null ? null : gap / months, short: goal == null ? null : Math.max(0, goal - byPlan),
    homeCost: fmNum(homeCost) ? homeCost : null, household: fmNum(homeCost) ? homeCost - pay : null };
}

// ---------- (3) kids and tuition ----------
// The kinds of school cost, in the order the pages tap them. k12: tuition for kindergarten to grade 12 (New York counts
// a 529 withdrawal for it as not qualified; see fm529).
export const FM_KINDS = [
  { id: 'care', name: 'Childcare', k12: false },
  { id: 'school', name: 'Private school tuition', k12: true },
  { id: 'yeshiva', name: 'Yeshiva or day school tuition', k12: true },
  { id: 'college', name: 'College', k12: false },
];
// The childcare row for a state and an age, from the dated rows passed in (reference-2026.json, childcare). null when
// the state has no sourced row: the person types their own number.
export function fmCareRow(rows, state, age) {
  const s = rows?.[state];
  if (!s || !fmNum(s[age])) return null;
  return { state, age, yearly: s[age], dataYear: s.dataYear ?? null };
}
// A year of school for each child, for a number of years, starting in a number of years. yearly: the cost of a year
// for one child (null: not answered). kids: how many children (sibling discounts: the person's own lower yearly
// number). rise: how much faster than prices in general the cost goes up each year (0 keeps it in today's dollars).
// have: saved for it already. ret: the plan's return after inflation, for what is put away a month before it starts.
// share: the part of the cost to save ahead (1 all, 0.5 half, 0 none: paid from the month as it comes).
export function fmTuition({ yearly = null, kids = 1, years = null, startIn = 0, rise = 0, have = 0, ret = 0, share = 1 } = {}) {
  const needs = [];
  if (!fmNum(yearly) || yearly < 0) needs.push('the cost of a year');
  if (!fmNum(years) || years <= 0) needs.push('how many years');
  if (needs.length) return { ready: false, needs };
  const n = Math.max(1, Math.round(kids ?? 1)), start = Math.max(0, startIn ?? 0), up = rise ?? 0;
  const rows = Array.from({ length: Math.round(years) }, (_, y) => ({ year: start + y, cost: yearly * n * (1 + up) ** (start + y) }));
  const total = rows.reduce((a, r) => a + r.cost, 0), first = rows[0].cost;
  const part = Math.min(1, Math.max(0, share ?? 1)), months = Math.round(start * 12), g = fmMonthly(ret);
  const grownHave = Math.max(0, have ?? 0) * (1 + g) ** months, want = total * part, need = Math.max(0, want - grownHave);
  const monthly = months === 0 ? null : need === 0 ? 0 : g === 0 ? need / months : need * g / ((1 + g) ** months - 1);
  const covered = months === 0 ? Math.min(total, Math.max(0, have ?? 0)) : Math.min(total, Math.max(want, grownHave)), payGo = (total - covered) / (rows.length * 12);
  return { ready: true, yearly, kids: n, years: rows.length, startIn: start, rise: up, rows, total, first, firstMonth: first / 12, share: part,
    months, have: Math.max(0, have ?? 0), grownHave, want, need, monthly, covered, payGo, now: months === 0 };
}
// The New York 529 deduction: what goes in a year, up to the limit (single, or married filing jointly), times the
// person's own New York tax rate. rules: { single, joint } from reference-2026.json (limits.ny529). k12: the money is
// for K-12 tuition, which New York counts as a withdrawal that is not qualified: the deductions taken on the money
// come back as income (recapture) and the earnings are taxed.
export function fm529({ yearly = null, joint = false, rate = null, k12 = false, rules = null } = {}) {
  if (!rules || !fmNum(yearly) || yearly < 0) return { ready: false, needs: ['what goes into the 529 a year'] };
  const limit = joint ? rules.joint : rules.single, deducted = Math.min(yearly, limit);
  return { ready: true, yearly, joint: !!joint, limit, deducted, over: Math.max(0, yearly - limit), rate: fmNum(rate) ? rate : null,
    saved: fmNum(rate) ? deducted * rate : null, k12: !!k12, recapture: !!k12 };
}
// Kids and tuition in one answer, for the pages: the childcare row (when it is childcare in a sourced state and the
// person has not typed their own number), the years of cost (fmTuition), and the 529 on what goes in a year (the
// monthly put away, times 12), with the New York K-12 rule. plan529: 'none', 'single' or 'joint'. rules: { childcare,
// ny529 } from reference-2026.json.
export function fmSchool({ kind = null, state = null, careAge = null, yearly = null, plan529 = 'none', nyRate = null, rules = null, ...rest } = {}) {
  const K = FM_KINDS.find(k => k.id === kind) ?? null;
  if (!K) return { ready: false, needs: ['what the money is for'] };
  const row = K.id === 'care' ? fmCareRow(rules?.childcare, state, careAge) : null;
  const T = fmTuition({ ...rest, yearly: fmNum(yearly) ? yearly : row?.yearly ?? null });
  if (!T.ready) return { ...T, kind: K, row };
  const on = plan529 === 'single' || plan529 === 'joint', inYear = T.monthly != null ? T.monthly * 12 : null;
  const P = on && K.id !== 'care' && inYear != null ? fm529({ yearly: inYear, joint: plan529 === 'joint', rate: nyRate, k12: K.k12, rules: rules?.ny529 }) : null;
  return { ...T, kind: K, row, fromRow: !fmNum(yearly) && row != null, plan529: on ? plan529 : 'none', p529: P };
}
// The community presets of a tuition goal (data/community-tuition.json): only the rows with both ends filled in.
export const fmPresetRows = presets => (presets?.rows || []).filter(r => r && r.label && fmNum(r.low) && fmNum(r.high) && r.high >= r.low);
