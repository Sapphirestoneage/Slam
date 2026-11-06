// Batch 25 (Phase 4): who they are with money (js/math/identity.js, M95). The scoring by hand, the tie rules, the
// weather levels and their history, the couples asks, the tilt, the one-pager line, the taps it takes, and the two
// personas with made-up answers (Alexis, and Priya and Dev).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFile, Store, newHousehold } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import * as I from '../js/math/identity.js';
import { STATEMENTS, AXES, TYPES, TREES, WEATHER_QUESTIONS, ADDRESS_QUESTIONS, LEADS, ASKS, DISCLAIMER, STORM_LINE } from '../js/registry/identity.js';

const root = new URL('../', import.meta.url);
const ref = JSON.parse(readFileSync(new URL('data/reference-2026.json', root)));
const lib = JSON.parse(readFileSync(new URL('data/library/skills.json', root)));
const now = new Date('2026-11-05T12:00:00Z');
const persona = id => importFile(readFileSync(new URL(`fixtures/personas/${id}.json`, root), 'utf8'));
const fresh = doc => { const d = structuredClone(doc); delete d.profile.identity; delete d.session.weather; return new Store(d, { now: () => now.toISOString() }); };

test('the wording: 12 statements, 3 per axis, 16 types each with a superpower, a shadow and 3 real skill trees', () => {
  assert.equal(STATEMENTS.length, 12);
  for (const ax of AXES) {
    const own = STATEMENTS.filter(s => s.axis === ax.id);
    assert.equal(own.length, 3, ax.id);
    assert.ok(own.every(s => ax.poles.some(p => p.id === s.toward)), `${ax.id}: every statement leans to one of its poles`);
  }
  // The first 8 cover every axis twice (the short read a couple can use).
  for (const ax of AXES) assert.equal(STATEMENTS.slice(0, 8).filter(s => s.axis === ax.id).length, 2, ax.id);
  const poles = AXES.map(a => a.poles.map(p => p.id));
  const all = poles[0].flatMap(a => poles[1].flatMap(b => poles[2].flatMap(c => poles[3].map(d => a + b + c + d))));
  assert.deepEqual(Object.keys(TYPES).sort(), all.sort(), 'all 16 types');
  const trees = new Set(lib.trees.map(t => t.id));
  for (const [k, t] of Object.entries(TYPES)) {
    assert.ok(t.name && t.superpower && t.shadow, k);
    assert.equal(t.trees.length, 3, k);
    assert.equal(new Set(t.trees).size, 3, `${k}: three different trees`);
    for (const id of t.trees) assert.ok(trees.has(id), `${k}: ${id} is a tree in data/library/skills.json`);
  }
  assert.deepEqual(TREES.map(([id, name]) => [id, name]), lib.trees.map(t => [t.id, t.name]), 'TREES matches the library, in order');
  assert.equal(WEATHER_QUESTIONS.length, 6);
  assert.ok(ADDRESS_QUESTIONS.length <= 4, 'at most 4 address taps');
  assert.ok(Object.keys(ASKS).length === 8 && Object.keys(LEADS).length === 9);
});

test('no em dashes and no verdict words in the wording', () => {
  const words = readFileSync(new URL('js/registry/identity.js', root), 'utf8') + readFileSync(new URL('js/ui/identity-ui.js', root), 'utf8') + readFileSync(new URL('js/math/identity.js', root), 'utf8');
  assert.ok(!words.includes(String.fromCharCode(0x2014)), 'no em dash');
  for (const w of [/\bat risk\b/i, /\bfail(ed|ing)?\b/i, /\bbad\b/i, /\bdisorder\b/i, /\banxiety disorder\b/i]) assert.ok(!w.test(words), `no ${w}`);
  assert.match(DISCLAIMER, /Not therapy and not a diagnosis/);
  assert.match(DISCLAIMER, /not really about money/);
  assert.doesNotMatch(STORM_LINE, /diagnos|disorder|crisis/i);
});

test('the letters by hand: Agree 1, Neutral 0, Disagree -1 toward each statement\'s pole', () => {
  // Alexis: ek 0 + (-1) + (-1) = -2 Keeper; po -1 + 0 + -1 = -2 Operator; gv 1 + 1 + 1 = 3 Guardian; xs -1 - 1 - 1 = -3 Savorer.
  const L = I.lettersOf([0, -1, 1, -1, 1, 0, -1, 1, -1, -1, 1, 1]);
  assert.deepEqual(L.axes.map(a => a.score), [-2, -2, 3, -3]);
  assert.equal(L.type, 'KOGS');
  assert.equal(L.info.name, 'the Homesteader');
  assert.deepEqual(L.axes.map(a => a.light), [false, false, false, false]);
  // Every Agree: E +2 (s1, s9 agree E; s5 agrees K) = 1; the same shape on every axis: E P G X at 1 each, light leans.
  const A = I.lettersOf(Array(12).fill(1));
  assert.deepEqual(A.axes.map(a => a.score), [1, 1, 1, -1]);
  assert.equal(A.type, 'EPGS');
  assert.ok(A.axes.every(a => a.light));
});

test('ties lean on what SLAM knows, and the letters wait for two answers on every axis', () => {
  const zeros = Array(12).fill(0);
  assert.equal(I.lettersOf(zeros).type, 'KPGS', 'nothing to lean on: Keeper, Paper, Guardian, Savorer');
  const address = { chars: [{}, { ch: 'O' }, {}, { ch: '↑' }], state: 'ahead', target: 'optional' };
  assert.equal(I.lettersOf(zeros, I.tieBreaks({ address })).type, 'EOVX', 'earn more, own business, ahead, aiming at work optional');
  assert.equal(I.lettersOf(zeros, I.tieBreaks({ address, weather: 'Storm' })).type, 'EOGX', 'a Storm weather leans Guardian');
  assert.ok(I.lettersOf(zeros).axes.every(a => a.tie));
  const seven = [1, 1, 1, 1, 1, 1, 1, null, null, null, null, null];
  assert.equal(I.lettersOf(seven).ready, false, 'the last axis has one answer');
  assert.equal(I.lettersOf(seven).type, null);
  assert.equal(I.lettersOf([...seven.slice(0, 7), 1]).ready, true, 'two per axis is enough');
});

test('the weather: six answers 0 to 2, two turned around, scaled to 12 when some are skipped', () => {
  assert.deepEqual([I.weatherScore([0, 0, 0, 2, 0, 2]).score, I.weatherScore([0, 0, 0, 2, 0, 2]).level], [0, 'Clear']);
  assert.equal(I.weatherScore([1, 1, 0, 2, 0, 2]).level, 'Clear', '2 is still Clear');
  assert.equal(I.weatherScore([1, 1, 1, 2, 0, 2]).level, 'Fair', '3');
  assert.equal(I.weatherScore([1, 1, 1, 1, 1, 1]).score, 6);
  assert.equal(I.weatherScore([1, 1, 1, 1, 1, 1]).level, 'Overcast');
  assert.equal(I.weatherScore([2, 2, 2, 1, 1, 1]).score, 9);
  assert.equal(I.weatherScore([2, 2, 2, 1, 1, 1]).level, 'Storm');
  assert.equal(I.weatherScore([2, 2, 2, 0, 2, 0]).score, 12);
  assert.equal(I.weatherScore([2, 2, 2]).level, null, 'three answers: not yet');
  // Four answers: raw 1 + 2 + 1 + (2 - 1) = 5, x 6 / 4 = 7.5, rounds to 8: Overcast.
  assert.deepEqual([I.weatherScore([1, 2, 1, 1]).score, I.weatherScore([1, 2, 1, 1]).level], [8, 'Overcast']);
});

test('the weather is kept per session and per person, and the history reads it back', () => {
  const s = new Store(newHousehold({ name: 'Test', now: now.toISOString() }), { now: () => now.toISOString() });
  for (const [i, v] of [1, 1, 1, 1, 1, 1].entries()) I.setWeather(s, 1, 'Me', i, v, { now });
  for (const [i, v] of [0, 0, 0, 2, 0, 2].entries()) I.setWeather(s, 3, 'Me', i, v, { now });
  assert.deepEqual(I.weatherHistory(s.doc).map(e => [e.n, e.Me]), [[1, 'Overcast'], [3, 'Clear']]);
  assert.equal(I.weatherOf(s.doc, 4).latest, 'Clear', 'a new session with no answers shows the latest');
  assert.equal(I.weatherOf(s.doc, 4).latestN, 3);
  assert.equal(I.weatherOf(s.doc, 4).level, null);
  s.undo();
  assert.equal(I.weatherOf(s.doc, 3).answered, 5, 'each tap is one undo step');
});

test('the FI Address reads the household: state, route, familiarity, the ceiling and the motion flag', () => {
  const f = { invested: 0, cash: 400, spending: 2800, runway: 0.14, heavyDebt: 4200, hasHeavy: true, anyDebtKnown: true, work: 'Employed (W-2)', fiNamed: false, investGoal: false };
  assert.equal(I.stateOf(f), 'under');
  assert.equal(I.familiarityOf(f), 'N');
  assert.equal(I.routeOf(f, 'under'), 'J');
  assert.equal(I.stateOf({ ...f, heavyDebt: 6000, cash: 5200, invested: 15000, runway: 1.49 }), 'building', 'more cash and investments than heavy debt, a month of runway');
  assert.equal(I.stateOf({ ...f, hasHeavy: false, heavyDebt: 0, runway: 3 }), 'ahead');
  assert.equal(I.stateOf({ cash: null, invested: null, anyDebtKnown: false }), null);
  assert.equal(I.routeOf({ ...f, work: 'Mixed', fiNamed: true }, 'under'), 'O');
  assert.equal(I.routeOf({ ...f, work: 'Between jobs' }, 'under'), 'P');
  assert.equal(I.familiarityOf({ ...f, invested: 33600 }), 'F', 'a year of spending invested');
  assert.equal(I.familiarityOf({ ...f, fiNamed: true }), 'L');
  assert.deepEqual([I.ceilingChar(true, true), I.ceilingChar(true, false), I.ceilingChar(false, true), I.ceilingChar(false, false), I.ceilingChar(null, true)], ['↕', '↑', '↓', '=', null]);
  assert.deepEqual([I.feelOf({}, 8).feel, I.feelOf({}, 5).feel, I.feelOf({}, 3).feel, I.feelOf({ feel: 'calm' }, 2).feel, I.feelOf({}).feel], ['calm', 'uneasy', 'stressed', 'calm', null]);
  // The job-loss persona is changing: the motion question is asked, and the address waits for it.
  const s = fresh(persona('job-loss'));
  const m = metrics(s.doc, ref, { now });
  const A = I.addressOf(s.doc, m);
  assert.ok(A.moving && A.asks.includes('motion') && A.chars[1].ch === 'P');
  for (const [k, v] of [['feel', 'stressed'], ['earnMore', true], ['spendLess', true]]) I.setAddress(s, k, v);
  assert.equal(I.addressOf(s.doc, m).done, false);
  I.setAddress(s, 'motion', '!');
  assert.equal(I.addressOf(s.doc, m).code, 'FPG↕!');
  assert.equal(I.addressOf(s.doc, m).done, true);
});

test('Alexis: NJU and the down arrow, KOGS the Homesteader, Overcast, in 21 taps', () => {
  const doc = persona('alexis');
  const R = I.identityOf(doc, ref, { now, n: 1 });
  assert.equal(R.address.full, 'NJU↓');
  assert.equal(R.address.meaning, 'New to this · A job, steady ground first · Below zero, and feeling it · Can spend less');
  assert.match(R.address.route, /^Steady ground first/);
  assert.deepEqual(R.people.map(p => [p.letters.type, p.weather.level, p.weather.score]), [['KOGS', 'Overcast', 8]]);
  assert.ok(R.done && !R.couple);
  assert.equal(R.taps, 21, '3 address taps (no change under way) + 12 + 6');
  assert.ok(R.taps < 30);
  // The tilt: the type's three, then by how many letters lean to them (ties in library order), all 25 once.
  assert.deepEqual(R.tilt.slice(0, 11), ['deals-smart-buying', 'cash-safety-net', 'main-path', 'financial-ops-tooling', 'real-estate', 'side-hustles', 'debt-leverage', 'insurance-protection', 'money-psychology', 'time-capital', 'social-capital']);
  assert.equal(new Set(R.tilt).size, 25);
  assert.deepEqual(doc.profile.identity.tilt, R.tilt, 'the persona file keeps the same tilt the app keeps');
  assert.equal(R.lead, LEADS['S:G']);
  assert.equal(I.onePagerLine(R), `KOGS, the Homesteader. ${LEADS['S:G']}`);
  assert.equal(I.identityOf(doc, ref, { now, n: 1 }).address.full, R.address.full, 'the same answers give the same address');
});

test('Alexis tapped through the setters: the same result, the tilt kept with the letters, each tap one undo step', () => {
  const s = fresh(persona('alexis'));
  assert.equal(I.identityOf(s.doc, ref, { now }).started, false);
  for (const [k, v] of [['feel', 'uneasy'], ['earnMore', false], ['spendLess', true]]) I.setAddress(s, k, v);
  for (const [i, v] of [0, -1, 1, -1, 1, 0, -1, 1, -1, -1, 1, 1].entries()) I.setLetter(s, ref, 'Me', i, v, { now });
  for (const [i, v] of [2, 2, 2, 1, 0, 1].entries()) I.setWeather(s, 1, 'Me', i, v, { now });
  const R = I.identityOf(s.doc, ref, { now });
  assert.deepEqual([R.address.full, R.people[0].letters.type, R.people[0].weather.level, R.taps], ['NJU↓', 'KOGS', 'Overcast', 21]);
  assert.deepEqual(s.doc.profile.identity.tilt, R.tilt);
  s.undo(); s.undo(); s.undo(); s.undo(); s.undo(); s.undo(); s.undo();
  assert.equal(s.doc.profile.identity.letters.Me.filter(v => v != null).length, 11, 'six weather taps and the last letter undone');
  I.setLater(s);
  assert.equal(I.identityOf(s.doc, ref, { now }).later, true);
});

test('Priya and Dev: one address for the household, letters and weather each, one ask each, in under 30 taps on the short read', () => {
  const doc = persona('couple-joint');
  const R = I.identityOf(doc, ref, { now, n: 1 });
  assert.ok(R.couple);
  assert.equal(R.address.full, 'FWC↕');
  assert.deepEqual(R.people.map(p => [p.name, p.letters.type, p.weather.level]), [['Priya', 'EPGX', 'Clear'], ['Dev', 'KOVS', 'Overcast']]);
  // They differ by 6 on where the power comes from and on how they move (3 and -3); the first in axis order wins.
  assert.deepEqual([R.asks.axis, R.asks.differ, R.asks.Me, R.asks.Partner], ['ek', true, ASKS.E, ASKS.K]);
  assert.equal(R.lead, LEADS['both:both'], 'they differ on what it is for and on risk');
  assert.deepEqual(R.tilt.slice(0, 5), ['income-career', 'geo-arbitrage-location', 'main-path', 'time-capital', 'cash-safety-net'], 'each type\'s trees in turn; cash-safety-net once');
  assert.equal(I.onePagerLine(R), `Priya EPGX, the Steady Climber; Dev KOVS, the Free Spirit. ${LEADS['both:both']}`);
  // The short read: 3 address taps, then 8 letters and 4 weather each: 27 answers (28 taps with the one switch to Dev).
  const s = fresh(doc);
  for (const [k, v] of [['feel', 'calm'], ['earnMore', true], ['spendLess', true]]) I.setAddress(s, k, v);
  for (const [i, v] of [1, 1, 1, 1, -1, -1, -1, -1].entries()) I.setLetter(s, ref, 'Me', i, v, { now });
  for (const [i, v] of [0, 0, 1, 2].entries()) I.setWeather(s, 1, 'Me', i, v, { now });
  for (const [i, v] of [-1, -1, -1, 0, 1, 1, 1, 1].entries()) I.setLetter(s, ref, 'Partner', i, v, { now });
  for (const [i, v] of [1, 2, 1, 1].entries()) I.setWeather(s, 1, 'Partner', i, v, { now });
  const Q = I.identityOf(s.doc, ref, { now });
  assert.deepEqual(Q.people.map(p => [p.letters.type, p.weather.level]), [['EPGX', 'Clear'], ['KOVS', 'Overcast']]);
  assert.ok(Q.done);
  assert.equal(Q.taps, 27);
  assert.ok(Q.taps + 1 < 30);
});

test('a solo client has one person; the same types both ways ask from where they lean hardest', () => {
  const a = I.lettersOf([1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, -1]);
  const b = I.lettersOf([1, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(a.type, 'EPGX');
  assert.equal(b.type.slice(0, 1), 'E');
  const same = I.asksOf(a, a);
  assert.equal(same.differ, false);
  assert.equal(same.Me, same.Partner);
  assert.equal(I.peopleOf(persona('alexis')).length, 1);
  assert.equal(I.asksOf(a, { type: null }), null);
  assert.equal(I.leadOf([]), null);
  assert.equal(I.onePagerLine(I.identityOf(fresh(persona('maya')).doc, ref, { now })), null, 'no letters, no line');
});

test('off when Phase 4 previews are off', () => {
  const s = fresh(persona('alexis'));
  s.setDoc('settings', { phase4: false });
  assert.equal(I.identityOf(s.doc, ref, { now }).on, false);
  assert.equal(I.identityOn(s.doc), false);
});
