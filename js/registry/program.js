// SPDX-License-Identifier: AGPL-3.0-only
// The program registry (Phase 3): the twelve sessions and their checklists, every number's levels, the weights that
// make the Picture %, the pace expected by session, and what each calculator needs before it unlocks. One place:
// js/math/picture.js and js/program.js read these, the spreadsheet's Assumptions tab lists the numbers, and the
// spec's Program tab mirrors the words. Change a weight here and every screen, the sheet and the tests follow.

// Each number's level, in points. Missing: nothing typed. Gut: a guess (a starter line, Not sure, or the gut
// spending number). Rough: marked Roughly. Estimate: typed and marked Know it. Actual: confirmed (a month of actuals
// on a Budget line, a balance from a statement or the bank, or locked by the coach).
export const LEVELS = { Missing: 0, Gut: 25, Rough: 50, Estimate: 75, Actual: 100 }; // Know it is Actual (batch 6, item 11); Estimate is a computed number
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
// Answer 122 (batch 2): a gut number or a Rough spending unlocks the FI date at Low confidence, shown as a year range;
// it stays locked, with the plain reason, only while a number is missing altogether.
export const UNLOCKS = {
  fi: { label: 'FI date', needs: [
    { group: 'income', min: LEVELS.Gut, label: 'income is in' },
    { group: 'spending', min: LEVELS.Gut, label: 'spending is in (a gut number is enough)' },
    { group: 'invested', min: LEVELS.Gut, label: 'an invested balance is in' }] },
  coastFi: { label: 'Coast FI', needs: [
    { group: 'income', min: LEVELS.Gut, label: 'income is in' },
    { group: 'spending', min: LEVELS.Gut, label: 'spending is in (a gut number is enough)' },
    { group: 'invested', min: LEVELS.Gut, label: 'an invested balance is in' },
    { group: 'age', min: LEVELS.Actual, label: 'your age is in' }] },
  payoff: { label: 'Debt payoff', needs: [{ group: 'debt', min: LEVELS.Estimate, label: 'debts reach Estimate' }] },
};
// Confidence of an unlocked number: the weighted level of its inputs (High at or over 90, Medium at or over 75,
// else Low); any input older than the aged-check days (js/checks.js) drops it one step.
export const CONFIDENCE = { high: 90, medium: 75 };
// How the FI date shows at each confidence: a year range from spending minus and plus this share (Low 15%, Medium 5%,
// collapsing to one year when both ends land in it), a month at High.
export const FI_RANGE = { Low: 0.15, Medium: 0.05, High: 0 };

// The twelve sessions. An item with auto is ticked from the data (js/program.js autoChecks); the rest are
// checkboxes. A hole session (S6 to S8, S10, S11) pulls the top hole on the Scorecard when it starts and is done
// when that hole is OK or Strong; S10 and S11 switch to itemsWhenClear (the next chapter) once no hole is left.
const HOLE = { name: 'Fill holes', hole: true, items: [{ id: 'hole', label: 'The top hole filled (OK or Strong)', auto: 'holeFilled' }] };
const CHAPTER = [{ id: 'chapter', label: 'Next chapter named, with an amount and a date', auto: 'nextChapter' }];
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
    { id: 'picture', label: 'Whole picture about 90% (see Whole picture on Home)', auto: 'picture90' }] }, // item 9: the item says which part it needs
  { id: 'S4', name: 'Goals', items: [
    { id: 'short', label: 'Three short-term goals, each with an amount, a date and a need, want or wish tag', auto: 'shortGoals' },
    { id: 'long', label: 'Three long-term goals, each with an amount, a date and a need, want or wish tag', auto: 'longGoals' }] },
  { id: 'S5', name: 'Full analysis', items: [
    { id: 'rated', label: 'Every area rated', auto: 'allRated' },
    { id: 'ranked', label: 'Holes ranked (a payoff and an effort on each)', auto: 'holesRanked' },
    { id: 'foo', label: 'FOO step confirmed', auto: 'fooConfirmed' },
    { id: 'top3', label: 'Top 3 holes chosen', auto: 'top3Chosen' }] },
  { id: 'S6', ...HOLE }, { id: 'S7', ...HOLE }, { id: 'S8', ...HOLE },
  { id: 'S9', name: 'Revisit', items: [
    { id: 'compare', label: 'Day 0 vs now compared', auto: 'day0Compared' },
    { id: 'rescore', label: 'Re-scored and re-ranked', auto: 'rescored' }] },
  { id: 'S10', ...HOLE, name: 'Fill holes, or the next chapter', itemsWhenClear: CHAPTER },
  { id: 'S11', ...HOLE, name: 'Fill holes, or the next chapter', itemsWhenClear: CHAPTER },
  { id: 'S12', name: 'Graduation', items: [
    { id: 'report', label: 'Day 0 vs graduation report made', auto: 'graduationReport' },
    { id: 'notes', label: 'Next-year plan notes written', auto: 'planNotes' },
    { id: 'review', label: 'Yearly review date set', auto: 'reviewDate' },
    { id: 'cadence', label: 'Monthly money date cadence set', auto: 'moneyDate' },
    { id: 'final', label: 'Final snapshot saved', auto: 'finalSnapshot' }] },
];
// The key numbers each session reviews before it ends (the review gate): groups of picture items (js/math/picture.js).
// A session not listed reviews the big four. Every row: the value and its level, Looks right (locks it to Actual) or Edit.
export const REVIEW = {
  groups: { S1: ['income', 'spending', 'account'], S2: ['spending', 'debt', 'account'], S3: ['income', 'spending', 'debt', 'account'] },
  fallback: ['income', 'spending', 'debt', 'account'],
};
// The agenda (batch 3): Must do is the session's checklist; Going over is what the coach adds; each item can link to a
// page or field, a homework item, a parking-lot question or a Scorecard hole. Suggested for today: carried-over items,
// homework the client says is done, open parking-lot questions, the top hole, and numbers older than staleDays.
// During a session it is a slim docked bar on every tab, collapsed by default (coach only).
export const AGENDA = { staleDays: 60, suggestionKinds: ['carried', 'homework', 'parking', 'hole', 'stale', 'category'], collapsed: true };
// Homework statuses: the coach sets Client says done for now; a client-side I did this can set it later (by: 'client').
export const HOMEWORK_STATUSES = ['To do', 'Client says done', 'Confirmed'];
// The monthly money date, a cadence picked on Home in the Game plan session (S12).
export const MONEY_DATES = ['The 1st of the month', 'The 15th of the month', 'The last day of the month', 'The first Sunday', 'Every payday'];
