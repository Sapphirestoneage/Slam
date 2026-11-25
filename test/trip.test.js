// Travel (run of Nov 25 2026, Part 4, M8T): a trip line by line (flights, lodging, food a day, the card fee on other
// currencies, visa fees, travel insurance), points (cash or redeem), a group trip split by share or by item in one
// currency on the household split engine, and the FIRE journey map with how a trip moves you on it. One engine
// (js/math/trip.js) for trip.html and the game's screen; the last tests hold the game's copy to it. Made-up numbers
// only; the arithmetic is in each comment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import * as TP from '../js/math/trip.js';
import { rowShare } from '../js/math/household.js';
import { journeyInputs } from '../js/math/ladder.js';
import { Store, newHousehold } from '../js/records.js';
import { answer } from '../js/journey.js';
import { ASSUMPTIONS } from '../js/registry/assumptions.js';

const { tpCost, tpCostWords, tpCostMath, tpLevel, tpPoints, tpPointsWords, tpSplit, tpSplitMath, tpJourney, tpJourneyWords, tpDayWords, tpDays, tpMoney, TP_STAGES, TP_RULES } = TP;
const root = new URL('../', import.meta.url);
const ref = JSON.parse(readFileSync(new URL('data/reference-2026.json', root), 'utf8'));
const TRIP = { flights: 800, lodging: 100, days: 5, food: 40, fxPct: 3, visa: 0, insurance: 60, other: 200 };

test('a trip line by line: each line, the card fee on the lines paid in another currency, the total', () => {
  const T = tpCost(TRIP);
  assert.equal(T.nights, 4); // the days less one
  assert.deepEqual(T.lines.map(l => l.amount), [800, 400, 200, 0, 60, 200, 24]); // lodging 100 x 4; food 40 x 5; fee 3% of (400 + 200 + 200)
  assert.equal(T.total, 1684); assert.equal(T.complete, true); assert.deepEqual(T.open, []);
  assert.equal(tpCost({ ...TRIP, nights: 3 }).lines[1].amount, 300, 'nights typed win over the days less one');
  assert.equal(tpCost({ ...TRIP, fxOn: ['flights'] }).fx.amount, 24); // 3% of 800
  assert.equal(tpCost({ ...TRIP, fxOn: [] }).fx.amount, 0, 'nothing in another currency: no fee');
  assert.match(tpCostMath(T, TRIP).join('\n'), /Card fee: 3% of \$800/);
});

test('empty is not zero: a line not tapped is open and the total says so far', () => {
  assert.equal(tpCost({}).ready, false);
  const T = tpCost({ flights: 500 });
  assert.equal(T.total, 500); assert.equal(T.complete, false);
  assert.ok(T.open.includes('Lodging') && T.open.includes('Travel insurance') && T.open.includes('Card fee on other currencies'));
  assert.match(tpCostWords(T), /so far: 6 lines are not tapped yet/);
  assert.equal(tpLevel(T, 'own'), 'Guess', 'open lines keep it a Guess');
  assert.equal(tpLevel(tpCost(TRIP), 'quote'), 'Close'); assert.equal(tpLevel(tpCost(TRIP), 'own'), 'Exact'); assert.equal(tpLevel(tpCost(TRIP), null), 'Guess');
});

test('points: the cents a point, next to your own value, and cash or redeem', () => {
  const P = tpPoints({ cash: 600, points: 40000, fees: 50, cpp: 1.25 });
  assert.equal(P.got, 1.375); // (600 - 50) / 40,000 x 100
  assert.equal(P.worth, 500); assert.equal(P.spend, 550); assert.equal(P.keep, 50); assert.equal(P.lead, 'points'); assert.equal(P.cashOff, 550);
  assert.equal(tpPoints({ cash: 300, points: 40000, fees: 50, cpp: 1.25 }).lead, 'cash'); // 550 of value for a 300 price
  assert.equal(tpPoints({ cash: 550, points: 40000, fees: 50, cpp: 1.25 }).lead, 'same');
  assert.deepEqual(tpPoints({ cash: 600, points: 40000, cpp: 1 }).needs, ['fees'], 'fees not tapped: it waits');
  assert.match(tpPointsWords(P), /1\.38 cents a point/);
  const T = tpCost({ ...TRIP, pointsOff: P.cashOff });
  assert.equal(T.total, 1684 - 550); assert.equal(T.pointsOff, 550);
});

test('a group trip by share: the total by shares, in whole cents that add up', () => {
  const people = [{ id: 'a', name: 'Ana', shares: 2 }, { id: 'b', name: 'Ben' }, { id: 'c', name: 'Cam' }];
  const S = tpSplit({ people, how: 'share', total: 1000 });
  assert.deepEqual(S.parts.map(p => p.amount), [500, 250, 250]); // 1,000 x 2/4, x 1/4, x 1/4
  const odd = tpSplit({ people: people.map(p => ({ ...p, shares: 1 })), how: 'share', total: 100 });
  assert.deepEqual(odd.parts.map(p => p.amount), [33.34, 33.33, 33.33], 'the leftover cent goes to the first person');
  assert.equal(odd.total, 100);
  assert.deepEqual(tpSplit({ people: [people[0]], total: 100 }).needs, ['people']);
  assert.match(tpSplitMath(S).join('\n'), /Ana: \$1,000 x 2 \/ 4 = \$500/);
});

test('a group trip by item: each line among the people in on it, on the household split engine', () => {
  const people = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Ben' }, { id: 'c', name: 'Cam' }];
  const items = [{ id: 'f', name: 'Flights', amount: 900 }, { id: 'l', name: 'Lodging', amount: 400, among: ['a', 'b'] }, { id: 'x', name: 'Other', amount: 100, among: ['c'] }];
  const S = tpSplit({ people, how: 'item', items });
  assert.deepEqual(S.parts.map(p => p.amount), [500, 500, 400]); // 300 + 200; 300 + 200; 300 + 100
  // the same split as the household engine gives for one row
  const H = { ids: ['a', 'b', 'c'], many: true, method: 'Equal', weights: {} };
  assert.equal(rowShare({ values: { splitHow: 'Equal', splitAmong: ['a', 'b'] } }, 'a', H), 0.5);
  assert.equal(S.rows[1].parts[2], 0, 'not in on it: nothing');
  const src = readFileSync(new URL('js/math/trip.js', root), 'utf8');
  assert.match(src, /import \{ rowShare \} from '\.\/household\.js'/, 'one split engine');
});

test('the journey: six stages, where you are, and how a trip moves you', () => {
  assert.deepEqual(TP_STAGES.map(s => s.name), ['Digging out', 'First $1k', 'Debt free', '$100k', 'Coast', 'FI']);
  const J = tpJourney({ cash: 1500, debt: 0, invested: 20000, coast: 150000, fi: 900000, monthly: 800, trip: 1200, when: { coast: 120, fi: 300 }, whenAfter: { fi: 302 }, fiDays: 61 });
  assert.equal(J.here, 3, 'at $100k'); assert.deepEqual(J.back, ['First $1k']); // 1,500 - 1,200 = 300 cash
  assert.equal(J.monthsOfSaving, 1.5); // 1,200 / 800
  const k100 = J.stages[3];
  assert.equal(k100.months, Math.ceil((100000 - 21500) / 800)); // net worth 1,500 + 20,000 - 0
  assert.equal(k100.after.months, k100.months + 1.5); assert.equal(J.stages[5].after.months, 302, 'FI with the trip is the app\'s own date');
  assert.match(tpJourneyWords(J), /You are at \$100k.*back under First \$1k.*61 days later/);
  const D = tpJourney({ cash: 200, debt: 5000, invested: 0, coast: 100000, fi: 600000, monthly: 300 });
  assert.equal(D.here, 0); assert.equal(D.stages[0].months, Math.ceil(4800 / 300)); assert.equal(D.stages[2].months, null, 'debt free comes from the app\'s own plan');
  const U = tpJourney({ cash: 2000 });
  assert.equal(U.here, null); assert.ok(U.unknown.includes('Coast'), 'empty is not zero: a stage waits');
  const big = tpJourney({ cash: 500, debt: 0, invested: 100, coast: 1, fi: 2, trip: 2000 });
  assert.equal(big.fromCash, 500); assert.equal(big.stages[5].after.have, 100 - 1500, 'the rest of the trip from investments');
  assert.equal(tpDays(1), 30); assert.equal(tpDayWords(-30), '30 days sooner'); assert.equal(tpDayWords(0), 'No change');
  assert.equal(TP_RULES.firstK, 1000); assert.equal(TP_RULES.k100, 100000);
  for (const id of ['rules.tripFirstK', 'rules.tripK100']) assert.ok(ASSUMPTIONS.find(a => a.id === id)?.source, `${id} has a source`);
});

test('the journey reads the plan: the ladder\'s months, and the FI date run again with the trip in', () => {
  const store = new Store(newHousehold({ name: 'Trip' }));
  store.setDoc('profile', { birthYear: 1996 });
  answer(store, 'income', { takeHome: 5000 }); answer(store, 'spending', { gut: 3500 }); answer(store, 'invested', { invested: 30000 });
  answer(store, 'cash', { checking: 2000, savings: 0 }); answer(store, 'card', { 'Credit card': 0 });
  const now = new Date('2026-11-01T12:00:00');
  const x = journeyInputs(store.doc, ref, { now, debtKnown: true, trip: 1300 });
  assert.equal(x.cash, 2000); assert.equal(x.debt, 0); assert.equal(x.invested, 30000); assert.ok(x.fi > 0 && x.coast > 0);
  assert.ok(x.fiDays > 0, 'a trip moves FI later'); assert.ok(x.whenAfter.fi > x.when.fi);
  const J = tpJourney(x);
  assert.equal(J.stages[0].done, true); assert.equal(J.stages[1].done, true); assert.equal(J.stages[2].done, true); assert.equal(J.here, 3);
  assert.deepEqual(J.back, ['First $1k'], '2,000 less 1,300 leaves 700, under $1k');
});

test('money in the trip\'s one currency', () => {
  assert.equal(tpMoney(1234), '$1,234'); assert.equal(tpMoney(33.5), '$33.50'); assert.equal(tpMoney(1200, 'EUR'), '€1,200'); assert.equal(tpMoney(null), '');
});

test('trip.html draws from the same engine, and the view does no math of its own', () => {
  const view = readFileSync(new URL('js/solo/trip.js', root), 'utf8');
  assert.match(view, /from '\.\.\/math\/trip\.js'/); assert.match(view, /journeyInputs/);
  assert.doesNotMatch(view, /Math\.pow|\*\* ?\(|\/ ?1200|\* ?\(1 ?- ?|\/ 100\b/, 'no money formula in the view');
  for (const w of ['Add it up line by line', 'Points: pay cash or redeem?', 'A group trip, split', 'Your FIRE journey', 'By share', 'By item', 'Show the math']) assert.ok(view.includes(w), w);
});

test('the game\'s copy is the same code (tools/game_trip_build.mjs), and gives the same answers', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('tools/game_trip_build.mjs', root)), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout);
  const box = {}; vm.createContext(box);
  vm.runInContext(`${readFileSync(new URL('game/core/trip.js', root), 'utf8')}\nthis.out = { cost: tpCost, split: tpSplit, journey: tpJourney };`, box);
  assert.equal(box.out.cost(TRIP).total, tpCost(TRIP).total);
  const people = [{ id: 'a', name: 'A', shares: 2 }, { id: 'b', name: 'B' }];
  assert.deepEqual(box.out.split({ people, total: 99.99 }).parts.map(p => p.amount), tpSplit({ people, total: 99.99 }).parts.map(p => p.amount));
  const game = readFileSync(new URL('game/features/trip.js', root), 'utf8');
  assert.match(game, /tpJourney\(/); assert.match(game, /freeAt\(c, \{ once/); assert.doesNotMatch(game, /Math\.pow|\/ 100\b/, 'the game screen has no money formula of its own');
});
