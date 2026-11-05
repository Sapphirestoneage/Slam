// SPDX-License-Identifier: AGPL-3.0-only
// The program registry (Phase 3): the twelve sessions and their checklists, every number's levels, the weights that
// make the Picture %, the pace expected by session, and what each calculator needs before it unlocks. One place:
// js/math/picture.js and js/program.js read these, the spreadsheet's Assumptions tab lists the numbers, and the
// spec's Program tab mirrors the words. Change a weight here and every screen, the sheet and the tests follow.

// Each number's level, in points. Missing: nothing typed. Gut: a guess (a starter line, Not sure, or the gut
// spending number). Rough: marked Roughly. Estimate: typed and marked Know it. Actual: confirmed (a month of actuals
// on a Budget line, a balance from a statement or the bank, or locked by the coach).
export const LEVELS = { Missing: 0, Gut: 25, Rough: 50, Estimate: 75, Actual: 100 };
export const LEVEL_WORDS = Object.keys(LEVELS);
export const levelWord = level => (level === null || level === undefined ? null : LEVEL_WORDS.filter(k => LEVELS[k] <= level).at(-1));

// Weights: big items count more. Income rows, debt balances and account balances weigh 3; each DRAFTT category of
// Budget lines weighs 2; the gut spending number stands in for the categories (6) until the lines are used.
export const WEIGHTS = { income: 3, debtBalance: 3, debtApr: 1, account: 3, thing: 1, gut: 6, draftt: 2, otherLines: 1, age: 1, areas: 1 };

// The Picture % expected by the end of each session (points); later sessions hold the session 3 mark. Within the
// margin counts as on track.
export const PACE = { expected: { 1: 40, 2: 70, 3: 90 }, hold: 90, margin: 5 };

// What a calculator needs before it unlocks: every item in the group at or above the level. A group with no items
// (no debts, per About you) has nothing to wait for.
export const UNLOCKS = {
  fi: { label: 'FI date', needs: [
    { group: 'income', min: LEVELS.Estimate, label: 'income reaches Estimate' },
    { group: 'spending', min: LEVELS.Estimate, label: 'spending reaches Estimate' },
    { group: 'invested', min: LEVELS.Gut, label: 'an invested balance is in' }] },
  coastFi: { label: 'Coast FI', needs: [
    { group: 'income', min: LEVELS.Estimate, label: 'income reaches Estimate' },
    { group: 'spending', min: LEVELS.Estimate, label: 'spending reaches Estimate' },
    { group: 'invested', min: LEVELS.Gut, label: 'an invested balance is in' },
    { group: 'age', min: LEVELS.Actual, label: 'your age is in' }] },
  payoff: { label: 'Debt payoff', needs: [{ group: 'debt', min: LEVELS.Estimate, label: 'debts reach Estimate' }] },
};
// Confidence of an unlocked number: the weighted level of its inputs (High at or over 90, Medium at or over 75,
// else Low); any input older than the aged-check days (js/checks.js) drops it one step.
export const CONFIDENCE = { high: 90, medium: 75 };

// The twelve sessions. An item with auto is ticked from the data (js/program.js autoChecks); the rest are
// checkboxes. placeholder sessions can be renamed and their checklists edited on Home.
const MINDSET = { name: 'Goals and mindset', placeholder: true, items: [{ id: 'goal', label: "This session's goal set" }, { id: 'review', label: "Last session's steps reviewed" }] };
export const SESSIONS = [
  { id: 'S1', name: 'First picture', items: [
    { id: 'accounts', label: 'Accounts set up', auto: 'accountsSetUp' },
    { id: 'topline', label: 'Top-line numbers entered (Gut is OK)', auto: 'topLine' },
    { id: 'oneLine', label: 'Money in one line generated', auto: 'moneyInOneLine' },
    { id: 'day0', label: 'Day 0 snapshot saved', auto: 'day0' }] },
  { id: 'S2', name: 'Real numbers', items: [
    { id: 'categories', label: 'Big categories at Estimate or better', auto: 'bigCategories' },
    { id: 'goals', label: 'Goals named', auto: 'goalsNamed' },
    { id: 'foo', label: 'FOO step identified', auto: 'fooStep' }] },
  { id: 'S3', name: 'Lock it', items: [
    { id: 'actuals', label: 'One month of Actuals', auto: 'monthOfActuals' },
    { id: 'locked', label: 'Key numbers locked', auto: 'keyNumbersLocked' },
    { id: 'picture', label: 'Picture about 90%', auto: 'picture90' }] },
  { id: 'S4', ...MINDSET }, { id: 'S5', ...MINDSET }, { id: 'S6', ...MINDSET }, { id: 'S7', ...MINDSET }, { id: 'S8', ...MINDSET },
  { id: 'S9', name: 'Revisit', items: [{ id: 'report', label: 'Day 0 vs now report shared' }] },
  { id: 'S10', ...MINDSET }, { id: 'S11', ...MINDSET },
  { id: 'S12', name: 'Graduation', placeholder: true, items: [{ id: 'graduate', label: 'Graduated' }] },
];
