// SPDX-License-Identifier: AGPL-3.0-only
// Skin: the FI Address as a tap quiz. Seven taps, four characters. The characters and their words are Eli's own
// (js/registry/identity.js: FAMILIARITY, ROUTE, STATE, CEILING, ROUTE_LINES). On Coach tools > Discovery the address is
// read from the household's numbers (js/math/identity.js addressOf); here, with no numbers, each character is a tap.
//
// HOW THE TAPS MAKE EACH CHARACTER (the same rules as addressOf, said as points):
//   1 Familiarity  nothing invested N; some invested, or a goal to invest or reach FI, L; a year of spending invested F.
//   2 Route        a job J or W, an own business B or O, between incomes P, retired R. W and O (aiming at work
//                  optional) when FI is a named goal or the numbers are already ahead.
//   3 State        where the numbers are (below zero, building, ahead) and how it feels (calm or not): U Z G K A C.
//   4 Ceiling      can earn more and can spend less: both, one, or neither.
// HOW IT MAPS: this lens does not lean on an element. ON THE CHARACTER SHEET: one line, "FI Address", with the code.
import { FAMILIARITY, ROUTE, STATE, CEILING, ROUTE_LINES } from '../../registry/identity.js';

const stateLine = { under: ROUTE_LINES.under, building: ROUTE_LINES.building, ahead: ROUTE_LINES.aheadSteady };
const stateNext = {
  under: { label: 'List every debt in one place', skill: 'debt-leverage-inventory-every-debt' },
  building: { label: 'Fund the job-loss fund', skill: 'cash-safety-net-fund-the-true-emergency-fund' },
  ahead: { label: 'Name your next milestones', skill: 'the-long-game-define-your-milestone-ladder' },
};
const stateLight = {
  U: 'You are looking straight at it. That is the part most people put off.', Z: 'Calm under pressure keeps your choices clear.',
  G: 'Feeling the pressure means you care where this goes.', K: 'Calm and building is the steady way up.',
  A: 'The care that got you here is still working for you.', C: 'You can enjoy what you built.',
};
const routeLine = { P: ROUTE_LINES.paused, R: ROUTE_LINES.retired, B: ROUTE_LINES.business, O: ROUTE_LINES.business, W: ROUTE_LINES.optionalLater };
const tr = (table, group) => Object.entries(table).map(([id, v]) => ({ id, name: v.word, group }));

// (the JSON round trip drops the empty keys, so the skin is plain data)
export const ADDRESS = JSON.parse(JSON.stringify({
  id: 'address', name: 'FI Address', blurb: 'Seven taps. Four characters that say where you are on the way to work being optional.',
  note: 'A game lens, not a test. It reads only your taps here, not your real numbers.',
  intro: ['Seven taps about work, what is invested, and how money feels right now.', 'You end on a four-character address and the route it points to.'],
  scoring: 'sum',
  traits: [...tr(FAMILIARITY, 'fam'), ...tr(ROUTE, 'route'), ...tr(STATE, 'state'), ...tr(CEILING, 'ceiling')],
  questions: [
    { id: 'work', axis: 'route', ask: 'How does money come in right now?', options: [
      { id: 'job', label: 'A paycheck job', add: { J: 1.5, W: 1 } }, { id: 'own', label: 'My own business, or a mix', add: { B: 1.5, O: 1 } },
      { id: 'between', label: 'Between incomes, or in school', add: { P: 9 } }, { id: 'retired', label: 'Retired', add: { R: 9 } }] },
    { id: 'invested', axis: 'fam', ask: 'What is invested so far?', options: [
      { id: 'none', label: 'Nothing yet', add: { N: 2 } }, { id: 'some', label: 'Some', add: { L: 4 } }, { id: 'year', label: 'A year of my spending, or more', add: { F: 8 } }] },
    { id: 'goal', axis: 'fam', ask: 'Is investing, or work being optional one day, a goal you have named?', options: [
      { id: 'fi', label: 'Yes: work being optional', add: { L: 3, W: 2, O: 2 } }, { id: 'invest', label: 'Yes: to start or catch up on investing', add: { L: 3 } }, { id: 'no', label: 'Not yet', add: {} }] },
    { id: 'numbers', axis: 'state', ask: 'Where are the numbers today?', options: [
      { id: 'under', label: 'Heavy debt, and little cash', add: { U: 1, Z: 1 } }, { id: 'building', label: 'Building: some cushion, some to go', add: { G: 1, K: 1 } },
      { id: 'ahead', label: 'Ahead: no heavy debt, and months of cushion', add: { A: 1, C: 1, W: 2, O: 2 } }] },
    { id: 'feel', axis: 'state', ask: 'How does money feel right now?', options: [
      { id: 'calm', label: 'Calm', add: { Z: 1, K: 1, C: 1 } }, { id: 'uneasy', label: 'Uneasy', add: { U: 1, G: 1, A: 1 } }, { id: 'stressed', label: 'Stressed', add: { U: 1, G: 1, A: 1 } }] },
    { id: 'earn', axis: 'ceiling', ask: 'Could you earn more in the next year?', options: [
      { id: 'yes', label: 'Yes', add: { '↕': 1, '↑': 1 } }, { id: 'no', label: 'Not really', add: { '↓': 1, '=': 1 } }] },
    { id: 'spend', axis: 'ceiling', ask: 'Could you spend less without real pain?', options: [
      { id: 'yes', label: 'Yes', add: { '↕': 1, '↓': 1 } }, { id: 'no', label: 'Not really', add: { '↑': 1, '=': 1 } }] },
  ],
  result: { by: 'axes', compose: { lines: ['route', 'state', 'ceiling'], light: 'state', next: 'state' }, axes: [
    { id: 'fam', name: 'Familiarity', poles: Object.keys(FAMILIARITY), tie: 'N' }, { id: 'route', name: 'Route and target', poles: Object.keys(ROUTE), tie: 'J' },
    { id: 'state', name: 'State and feeling', poles: Object.keys(STATE) }, { id: 'ceiling', name: 'The ceiling', poles: Object.keys(CEILING) }] },
  poles: {
    ...Object.fromEntries(Object.entries(FAMILIARITY).map(([id, v]) => [id, { word: v.word }])),
    ...Object.fromEntries(Object.entries(ROUTE).map(([id, v]) => [id, { word: v.word, line: routeLine[id] }])),
    ...Object.fromEntries(Object.entries(STATE).map(([id, v]) => [id, { word: v.word, line: stateLine[v.state], light: stateLight[id], next: stateNext[v.state] }])),
    ...Object.fromEntries(Object.entries(CEILING).map(([id, v]) => [id, { word: v.word, line: v.lever }])),
  },
  core: { sheet: 'FI Address', how: 'This lens does not lean on an element. It adds one line to the character sheet: the four characters.' },
}));
