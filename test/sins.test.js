// The money sins read (js/math/sins.js), on the one quiz engine, with numbers worked out by hand. The game runs a copy
// of the same file (game/core/sins.js); the last tests hold the two together. Run "Money sins", Part 1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as Q from '../js/math/quizcore.js';
import * as S from '../js/math/sins.js';
import { SINS } from '../js/quiz/skins/sins.js';
import { sharedLenses, lensesForOthers } from '../js/quiz/store.js';
import { sinsDataOf } from '../js/quiz/sinsdata.js';
import { foldDoc } from '../js/privacy.js';
import { blameIn } from '../tools/tone/scan.mjs';

const NOW = '2026-11-25', ago = n => S.snAddDays(NOW, -n), qz = { qzResult: Q.qzResult, QZ_LEVELS: Q.QZ_LEVELS };
const fam = (read, id) => read.families.find(f => f.id === id);

test('the families: 7 sins and 12 ways of refusing change, pride in both with its own id, each with a light side and a defense', () => {
  const sin = SINS.traits.filter(t => t.group === 'sin').map(t => t.id), ch = SINS.traits.filter(t => t.group === 'change').map(t => t.id);
  assert.deepEqual(sin, ['pride', 'greed', 'envy', 'gluttony', 'lust', 'wrath', 'sloth']);
  assert.deepEqual(ch, ['proud', 'fear', 'panic', 'nostalgia', 'denial', 'later', 'blame', 'magic', 'perfect', 'helpless', 'pleasing', 'handoff']);
  for (const t of SINS.traits) { assert.ok(SINS.cards[t.id].light, t.id); const F = SINS.read.fix[t.id]; assert.ok(F && F.name && F.how && F.check, t.id); }
  assert.match(SINS.read.pride, /both families/);
  // Eli's five defenses
  assert.match(SINS.read.fix.lust.name, /cooling-off/i); assert.match(SINS.read.fix.envy.name, /yours or theirs/i);
  assert.match(SINS.read.fix.sloth.name, /Automate, plus one number a week/); assert.match(SINS.read.fix.panic.name, /72-hour/); assert.match(SINS.read.fix.greed.name, /already won/);
  const words = JSON.stringify(SINS);
  assert.doesNotMatch(words, /disorder|patholog|symptom|clinical|therapy|trauma|addict|compulsive|narciss|neurot|anxiety|depress|diagnos(?!is)/i);
  for (const str of words.split('"')) assert.deepEqual(blameIn(str), [], str);
  for (const t of S.SN_TAGS) assert.deepEqual(blameIn(t.label), []);
  assert.deepEqual(S.SN_TAGS.map(t => t.label), ['Planned', 'A treat', 'Bored', 'Stressed', 'Keeping up', 'Someone asked', 'Celebrating']);
});

test('fading: half after 30 days, a quarter after 60; the quiz shares out as other evidence comes in', () => {
  assert.equal(S.SN_RULES.halfLife, 30);
  assert.equal(S.snFade(NOW, NOW), 1); assert.equal(S.snFade(ago(30), NOW), 0.5); assert.equal(S.snFade(ago(60), NOW), 0.25); assert.equal(S.snFade(S.snAddDays(NOW, 3), NOW), 1);
  const quiz = { source: 'quiz', add: { lust: 2 }, d: ago(90) };
  assert.equal(S.snQuizWeight([quiz], NOW), 1, 'alone it counts in full, however old');
  assert.equal(S.snQuizWeight([quiz, { source: 'ledger', add: { lust: 2 }, d: NOW }], NOW), 0.5, 'Q 2, E 2: 2 / 4');
  assert.equal(S.snQuizWeight([quiz, { source: 'ledger', add: { lust: 2 }, d: ago(30) }], NOW), 2 / 3, 'Q 2, E 2 x 0.5 = 1: 2 / 3');
  assert.equal(S.snQuizWeight([quiz, { source: 'ledger', add: { lust: -2 }, d: NOW }], NOW), 1, 'a minus is not evidence that the quiz should fade');
  const out = S.snOutside([quiz, { source: 'ledger', add: { lust: 2, sloth: 1 }, d: ago(30) }, { source: 'ledger', add: { lust: 1 }, d: NOW }], NOW);
  // Q = 2, E = (2 + 1) x 0.5 + 1 = 2.5: quiz weight 2 / 4.5
  assert.deepEqual(out.map(o => o.source), ['quiz', 'ledger']);
  assert.ok(Math.abs(out[0].scores.lust - 2 * 2 / 4.5) < 1e-12); assert.equal(out[1].scores.lust, 2); assert.equal(out[1].scores.sloth, 0.5);
});

// A made-up ledger: 40 days of data, 8 fun buys in one month (lust 2) and a "bored" check-in (lust 1, sloth 1).
const funMonth = Array.from({ length: 8 }, (_, i) => ({ d: `2026-11-${String(10 + i).padStart(2, '0')}`, amt: 20, cat: 'fun' }));
const bored = { at: `${ago(5)}T21:00:00Z`, d: ago(5), tag: 'bored', amt: 20, cat: 'fun' };

test('a label shows only when two sources agree over about 30 days; before that it is an Early read; always a top two', () => {
  const st = { ans: {}, sn: { checks: [bored] } };
  const R = S.snRead(qz, SINS, st, { since: ago(40), buys: funMonth }, NOW), F = fam(R, 'sin');
  assert.deepEqual(F.agree, ['ledger', 'checkin']); assert.equal(F.top.id, 'lust'); assert.equal(F.topTwo.length, 2); assert.equal(F.second.id, 'sloth');
  assert.equal(F.level, 'Close'); assert.equal(F.word, 'Close read');
  // lust: 2 x fade(8 days, the last fun buy) + 1 x fade(5 days); sloth: 1 x fade(5 days)
  assert.ok(Math.abs(R.engine.scores.lust - (2 * Math.pow(0.5, 8 / 30) + Math.pow(0.5, 5 / 30))) < 1e-9);
  const early = S.snRead(qz, SINS, st, { since: ago(20), buys: funMonth }, NOW);
  assert.equal(fam(early, 'sin').level, 'Guess'); assert.equal(fam(early, 'sin').word, 'Early read'); assert.match(fam(early, 'sin').why, /About 10 more days/);
  const one = S.snRead(qz, SINS, { ans: {} }, { since: ago(40), buys: funMonth }, NOW);
  assert.equal(fam(one, 'sin').level, 'Guess'); assert.match(fam(one, 'sin').why, /second source/);
  assert.equal(fam(one, 'change').level, null, 'nothing in the family yet: no level, no label');
  assert.equal(fam(one, 'change').topTwo.length, 2, 'still a top two');
  assert.deepEqual(S.snTopTwo(R, 'sin').map(t => t.id), ['lust', 'sloth']);
  // the quiz alone, every first answer: always an Early read
  const quizOnly = S.snRead(qz, SINS, { ans: Object.fromEntries(SINS.questions.map(q => [q.id, 'a'])), at: NOW }, {}, NOW);
  assert.ok(quizOnly.families.every(f => f.level === 'Guess'));
  assert.ok(quizOnly.gathering.some(l => /log a few buys/.test(l)));
});

test('Why we think this: the three strongest pieces, in plain words, with how long ago', () => {
  const R = S.snRead(qz, SINS, { ans: {}, sn: { checks: [bored] } }, { since: ago(40), buys: funMonth }, NOW), L = fam(R, 'sin').lines;
  assert.equal(L.length, 2);
  assert.deepEqual(L.map(l => l.line), ['8 fun buys in Nov 2026', 'You tapped "Bored" on a fun and everything else buy (Nov 20)']);
  assert.equal(L[1].ago, '5 days ago');
  const many = S.snWhy(S.snWeigh([1, 2, 3, 4].map(k => ({ source: 'ledger', add: { lust: k }, d: NOW, why: `w${k}` })), NOW), 'lust', NOW);
  assert.deepEqual(many.map(l => l.line), ['w4', 'w3', 'w2']);
});

test('Is this really it?: a push-back counts as evidence, is kept, and the judge can read it', () => {
  const base = { ans: {}, sn: { checks: [bored] } }, data = { since: ago(40), buys: funMonth };
  let sn = S.snPush(base.sn, 'lust', 'yes', null, `${NOW}T10:00:00Z`);
  const yes = S.snRead(qz, SINS, { ...base, sn }, data, NOW);
  assert.equal(fam(yes, 'sin').level, 'Exact'); assert.equal(fam(yes, 'sin').word, 'Confirmed by you');
  assert.deepEqual(fam(yes, 'sin').agree, ['ledger', 'checkin', 'you']);
  sn = S.snPush(base.sn, 'lust', 'no', null, `${NOW}T10:00:00Z`);
  const no = S.snRead(qz, SINS, { ...base, sn }, data, NOW);
  assert.ok(Math.abs(no.engine.scores.lust - (yes.engine.scores.lust - 6)) < 1e-9, 'a "no" is 3 points against, a "yes" 3 for');
  assert.equal(fam(no, 'sin').top.id, 'sloth');
  sn = S.snPush(base.sn, 'lust', 'other', 'envy', `${NOW}T10:00:00Z`);
  assert.deepEqual(S.snJudgeLog(SINS, sn), [{ at: `${NOW}T10:00:00Z`, d: NOW, trait: 'lust', name: 'Lust', said: 'other', to: 'envy', toName: 'Envy' }]);
  assert.equal(S.snPush(base.sn, 'lust', 'maybe', null, NOW), base.sn, 'an answer that is not one of the three changes nothing');
});

test('Test the fix: a month of one defense; the pattern dropped raises the read, held moves to the next', () => {
  const sep = Array.from({ length: 8 }, (_, i) => ({ d: `2026-09-${String(10 + i).padStart(2, '0')}`, amt: 20, cat: 'fun' }));
  const data = { since: '2026-08-01', buys: sep }, start = '2026-10-01';
  let sn = S.snFixStart({}, 'lust', 'sin', start);
  const ev = S.snEvidence(SINS, { ans: {}, sn }, data, '2026-10-20');
  const mid = S.snFixCheck(sn.fix, ev, '2026-10-20');
  assert.deepEqual([mid.done, mid.daysLeft, mid.pct, mid.before, mid.during], [false, 11, 63, 2, 0]);
  const end = S.snFixCheck(sn.fix, ev, '2026-10-31');
  assert.deepEqual([end.done, end.dropped, end.end], [true, true, '2026-10-31']);
  sn = S.snFixEnd(sn, ev, '2026-10-31');
  assert.equal(sn.fix, null); assert.equal(sn.fixes[0].dropped, true);
  assert.deepEqual(S.snFixEvidence(SINS, sn.fixes)[0].add, { lust: 3 });
  // held: the same buys in the month of the defense too
  const oct = sep.map(b => ({ ...b, d: b.d.replace('-09-', '-10-') }));
  let sn2 = S.snFixStart({}, 'lust', 'sin', start);
  sn2 = S.snFixEnd(sn2, S.snEvidence(SINS, { ans: {} }, { since: '2026-08-01', buys: [...sep, ...oct] }, '2026-10-31'), '2026-10-31');
  assert.equal(sn2.fixes[0].dropped, false); assert.deepEqual(S.snFixEvidence(SINS, sn2.fixes)[0].add, { lust: -2 });
  const R = S.snRead(qz, SINS, { ans: {}, sn: { ...sn2, checks: [bored] } }, { since: '2026-08-01', buys: funMonth }, NOW);
  assert.equal(R.fix.trait, fam(R, 'sin').order.find(t => t !== 'lust')); assert.equal(R.fix.moved, true); assert.equal(R.fix.started, false);
  // the defense of the month before anything is tried: the top's own
  const R0 = S.snRead(qz, SINS, { ans: {}, sn: { checks: [bored] } }, { since: ago(40), buys: funMonth }, NOW);
  assert.deepEqual([R0.fix.trait, R0.fix.name, R0.fix.moved], ['lust', 'The cooling-off timer', false]);
  assert.equal(S.snFixCheck(S.snFixStart({}, 'envy', 'sin', start).fix, [], '2026-10-31').dropped, null, 'nothing the month before: nothing to compare');
});

test('each ledger signal, on a made-up ledger', () => {
  const L = (d) => S.snLedgerEvidence(d, NOW).map(p => p.kind);
  const pay = [{ d: '2026-11-01' }];
  assert.deepEqual(L({ pays: pay, buys: [{ d: '2026-11-01', amt: 9, cat: 'fun' }, { d: '2026-11-02', amt: 9, cat: 'food' }, { d: '2026-11-03', amt: 9, cat: null }] }), ['payday']);
  assert.deepEqual(L({ pays: pay, buys: [{ d: '2026-11-01', amt: 9, cat: 'fun' }, { d: '2026-11-02', amt: 9, cat: 'home' }, { d: '2026-11-04', amt: 9, cat: 'fun' }] }), [], 'rent and a buy three days later do not count');
  assert.deepEqual(L({ checks: [{ d: '2026-11-10', tag: 'stressed' }], buys: [{ d: '2026-11-10', amt: 9, cat: 'fun' }, { d: '2026-11-12', amt: 9, cat: 'fun' }] }), ['stress']);
  assert.match(S.snLedgerEvidence({ checks: [{ d: '2026-11-10', tag: 'stressed' }], buys: [{ d: '2026-11-11', amt: 9, cat: 'fun' }, { d: '2026-11-12', amt: 9, cat: 'fun' }] }, NOW)[0].why, /^2 buys in the two days after/);
  const food = n => Array.from({ length: n }, (_, i) => ({ d: `2026-10-${String(i + 1).padStart(2, '0')}`, amt: 5, cat: 'food' }));
  assert.deepEqual(L({ buys: food(12) }), ['food']); assert.deepEqual(L({ buys: food(11) }), []);
  assert.deepEqual(L({ buys: Array.from({ length: 8 }, () => ({ d: '2026-10-05', amt: 1, cat: 'fun' })) }), ['fun']);
  // over the plan: past 10% AND at least $25
  assert.deepEqual(L({ plan: { food: 100 }, buys: [{ d: '2026-10-03', amt: 130, cat: 'food' }] }), ['overFood']);
  assert.deepEqual(L({ plan: { food: 100 }, buys: [{ d: '2026-10-03', amt: 120, cat: 'food' }] }), [], '20 over: under $25');
  assert.deepEqual(L({ plan: { fun: 500 }, buys: [{ d: '2026-10-03', amt: 540, cat: 'fun' }] }), [], '8% over: under 10%');
  assert.deepEqual(L({ buys: [{ d: '2026-10-03', amt: 900, cat: 'food' }] }), [], 'no plan: nothing to be over (empty is not zero)');
  assert.ok(!JSON.stringify(S.snLedgerEvidence({ plan: { food: 100 }, buys: [{ d: '2026-10-03', amt: 130, cat: 'food' }] }, NOW)).includes('$'), 'no cost in the words: that is the audit\'s');
});

test('each app signal: no new data, the app left closed, numbers at Guess, Recalculating, fire drills', () => {
  const K = d => S.snAppEvidence(d, NOW).map(p => p.kind);
  assert.deepEqual(K({ since: ago(60), buys: [{ d: ago(50), amt: 5, cat: 'fun' }] }), ['quiet']);
  assert.deepEqual(K({ since: ago(60), buys: [{ d: ago(50), amt: 5, cat: 'fun' }], imported: ago(10) }), [], 'a statement brought in 10 days ago');
  assert.deepEqual(K({ since: ago(20) }), [], 'under a month of ledger: no inaction yet');
  assert.deepEqual(K({ away: { days: 21, back: ago(3) } }), ['away']); assert.deepEqual(K({ away: { days: 20, back: ago(3) } }), []);
  assert.deepEqual(K({ since: ago(40), imported: NOW, guesses: { guess: 3, of: 5 } }), ['guesses']);
  assert.deepEqual(K({ since: ago(40), imported: NOW, guesses: { guess: 2, of: 5 } }), []);
  assert.deepEqual(K({ since: ago(40), imported: NOW, rc: { due: true, keptAt: null } }), ['rcOpen']);
  assert.deepEqual(K({ since: ago(40), imported: NOW, rc: { due: true, keptAt: `${ago(10)}T09:00:00Z` } }), ['rcKept']);
  assert.deepEqual(S.snAppEvidence({ rc: { due: false, keptAt: ago(3) } }, NOW)[0].add, { denial: -1, proud: -1 });
  assert.deepEqual(K({ drills: [{ d: ago(2), n: 1 }] }), ['drill']);
});

test('check-ins: over the line or a pattern, never a fixed bill, at most 3 a week, skippable', () => {
  const buy = (amt, cat = 'fun', d = NOW) => ({ d, amt, cat });
  assert.equal(S.snCheckinDue({}, buy(60), {}, NOW).ask, true); assert.equal(S.snCheckinDue({}, buy(40), {}, NOW).ask, false);
  assert.equal(S.snCheckinDue({ line: 25 }, buy(40), {}, NOW).ask, true, 'the person\'s own line');
  assert.equal(S.snCheckinDue({}, buy(900, 'home'), {}, NOW).ask, false);
  const three = [1, 2, 3].map(k => ({ at: `${ago(k)}T08:00:00Z`, d: ago(k), tag: 'treat' }));
  assert.equal(S.snCheckinDue({ checks: three }, buy(60), {}, NOW).ask, false);
  assert.equal(S.snCheckinDue({ checks: three.slice(0, 2), skips: [{ at: `${ago(1)}T09:00:00Z` }] }, buy(60), {}, NOW).ask, false, 'a skip counts toward the three');
  assert.equal(S.snCheckinDue({ checks: three.map(c => ({ ...c, at: `${ago(8)}T08:00:00Z` })) }, buy(60), {}, NOW).ask, true, 'last week\'s do not count');
  assert.equal(S.snCheckinDue({}, buy(10, 'fun', '2026-11-02'), { pays: [{ d: '2026-11-01' }], buys: [buy(5, 'food', '2026-11-01'), buy(5, 'fun', '2026-11-02')] }, NOW).ask, true, 'the third buy near payday');
  assert.equal(S.snCheckinDue({}, buy(10, 'food'), { plan: { food: 100 }, buys: [buy(120, 'food')] }, NOW).ask, true, 'food past its plan');
  const sn = S.snCheckinAdd({}, buy(60), 'treat', `${NOW}T23:10:00Z`);
  assert.deepEqual(sn.checks, [{ at: `${NOW}T23:10:00Z`, d: NOW, tag: 'treat', amt: 60, cat: 'fun' }], 'the tap is kept with its time');
  assert.equal(S.snCheckinAdd({}, buy(60), 'nope', NOW).checks, undefined);
  assert.equal(S.snCheckinSkip({}, `${NOW}T10:00:00Z`).skips.length, 1);
  assert.deepEqual(S.snCheckinEvidence(sn.checks)[0].add, { gluttony: 2 }); assert.deepEqual(S.snCheckinEvidence([{ d: NOW, tag: 'planned' }])[0].add, {});
});

test('privacy in the web app: Me only by default, never in a coach\'s or partner\'s view or a shared copy unless shown; check-ins stay home', () => {
  const sins = { ans: { s1: 'a' }, at: NOW, sn: { v: 1, checks: [bored], push: [{ trait: 'lust', said: 'yes' }] } };
  assert.deepEqual(Object.keys(sharedLenses({ sins, houses: { ans: {}, seen: 'Everyone' } })), ['houses']);
  assert.deepEqual(sharedLenses({ sins: { ...sins, seen: 'Everyone' } }), {}, 'the quiz\'s own switch is not enough');
  assert.deepEqual(sharedLenses({ sins: { ...sins, sn: { ...sins.sn, show: true } } }), { sins: { ans: { s1: 'a' }, at: NOW, sn: { v: 1, show: true } } });
  const start = { lenses: { sins, houses: { ans: {} } } };
  assert.deepEqual(Object.keys(lensesForOthers(start).lenses), ['houses']);
  const shown = { lenses: { sins: { ...sins, sn: { ...sins.sn, show: true } } } };
  assert.equal(lensesForOthers(shown), shown);
  const doc = { records: [], profile: {}, settings: { start } };
  assert.equal(foldDoc(doc, { who: 'coach', person: 'all' }).settings.start.lenses.sins, undefined, 'the coach\'s screens');
  assert.equal(foldDoc(doc, { who: 'client', person: 'Partner', couple: true }).settings.start.lenses.sins, undefined, 'a partner\'s view');
  assert.ok(foldDoc(doc, { who: 'client', person: 'Me', couple: true }).settings.start.lenses.sins, 'the person\'s own view');
  assert.equal(foldDoc(doc, { who: 'share', person: 'all', couple: false }).settings.start.lenses.sins, undefined, 'a shared copy');
});

test('the web ledger: transactions become buys, paychecks and the plan; no line outside the five is a buy', () => {
  const doc = { records: [{ id: 'f', kind: 'bill', draftt: 'Food', amount: 300, per: 'month' }, { id: 'd', kind: 'bill', draftt: 'Debt', amount: 200, per: 'month' }, { id: 'w', kind: 'bill', draftt: 'Wants', amount: 100, per: 'month' }],
    spending: { transactions: [{ id: 1, date: '2026-10-02', amount: -40, lineId: 'f', importedAt: '2026-11-01T10:00:00Z' }, { id: 2, date: '2026-10-03', amount: -200, lineId: 'd' },
      { id: 3, date: '2026-10-01', amount: 2000, incomeId: 'job' }, { id: 4, date: '2026-10-04', amount: -15, lineId: 'w' }, { id: 5, date: '2026-10-05', amount: -9, lineId: null }] } };
  const D = sinsDataOf(doc);
  assert.deepEqual(D.buys.map(b => [b.d, b.amt, b.cat]), [['2026-10-02', 40, 'food'], ['2026-10-04', 15, 'fun'], ['2026-10-05', 9, null]]);
  assert.deepEqual(D.pays, [{ d: '2026-10-01' }]); assert.deepEqual(D.plan, { food: 300, fun: 100 });
  assert.equal(D.since, '2026-10-01'); assert.equal(D.imported, '2026-11-01');
  assert.deepEqual(sinsDataOf({ records: [] }), { since: null, buys: [], pays: [], plan: {}, imported: null }, 'no ledger: nothing, never a zero');
});

const src = readFileSync(new URL('../js/math/sins.js', import.meta.url), 'utf8'), copy = readFileSync(new URL('../game/core/sins.js', import.meta.url), 'utf8');
test('the game\'s copy is made from this file and is current (node tools/game_sins_build.mjs)', () => {
  const hash = createHash('sha256').update(src).digest('hex').slice(0, 16);
  assert.match(copy, new RegExp(`SOURCE-HASH  ${hash}`), 'js/math/sins.js changed: run node tools/game_sins_build.mjs, then the game steps (prettier, stamp, code map)');
  assert.doesNotMatch(src, /^import /m, 'no import: the engine is handed in');
  assert.doesNotMatch(src, /document\.|localStorage|\bC\(\)/);
  for (const m of src.matchAll(/^export (?:function|const) (\w+)/gm)) assert.match(m[1], /^(sn|SN_)/, m[1]);
});
