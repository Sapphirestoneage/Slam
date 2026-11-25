// The money sins, Part 3 (the Rings theme): the seven original rulers, the themed words, the rings in the person's own
// order, the climb out ring by ring (a retake with the first pull quieter, a ward month with the pattern dropping),
// the boss of the boss fights, and the add-on voice with and without a stand-in. Run "Money sins", Part 3 (Nov 25 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as Q from '../js/math/quizcore.js';
import * as S from '../js/math/sins.js';
import { SINS } from '../js/quiz/skins/sins.js';
import { blameIn } from '../tools/tone/scan.mjs';

const NOW = '2026-11-25', qz = { qzResult: Q.qzResult, QZ_LEVELS: Q.QZ_LEVELS };
const SIN = SINS.traits.filter(t => t.group === 'sin').map(t => t.id);
const FRANCHISE = /Helluva|Hazbin|Asmodeus|Mammon|Beelzebub|Belphegor|Leviathan|Lucifer|Satan|Stolas|Blitz|Moxxie|Millie|Loona|Fizzarolli|Alastor|Charlie|Vaggie|Angel Dust|Inferno|Dante|Virgil|Fullmetal|Homunculus|Seven Deadly|Meliodas|Hogwarts|Pokemon|Marvel|Batman|Smaug|Shrek|Disney|Pixar|Inside Out|Good Place|Sanrio|Sauron|Mordor/i;
const CLINICAL = /disorder|patholog|symptom|clinical|therapy|trauma|addict|compulsive|narciss|neurot|anxiety|depress|diagnos/i;
const VERDICT = /\b(should|must|bad|wrong|fail|lazy|greedy|irresponsible|weak|stupid|loser|idiot)\b/i;
const read = ans => S.snRead(qz, SINS, { ans, at: NOW }, {}, NOW);
const all = v => Object.fromEntries(SINS.questions.map(q => [q.id, v]));

test('seven original rulers, one for each sin ring, with Eli\'s working names; no franchise, clinical, verdict or blame word', () => {
  const R = S.snRulers(SINS);
  assert.deepEqual(R.map(r => r.sin).sort(), [...SIN].sort());
  assert.deepEqual(Object.fromEntries(R.map(r => [r.sin, r.name])), { pride: 'Lady Lookatme', greed: 'The Upsell', envy: 'Countess Compare', gluttony: 'The Duke of Delivery', lust: 'Impulsa', wrath: 'Rage Receipt', sloth: 'Lord Later' });
  assert.equal(new Set(R.map(r => r.ring)).size, 7, 'seven different rings');
  for (const r of R) {
    for (const k of ['name', 'ring', 'roast', 'taunt', 'beat', 'ward']) assert.ok(r[k] && String(r[k]).length > 3, `${r.sin} ${k}`);
    assert.equal(r.ward, SINS.read.fix[r.sin].name, 'the ward is the defense of that sin');
  }
  const words = JSON.stringify(SINS.rings);
  assert.doesNotMatch(words, FRANCHISE); assert.doesNotMatch(words, CLINICAL); assert.doesNotMatch(words, VERDICT); assert.doesNotMatch(words, /\u2014/);
  for (const s of words.split('"')) assert.deepEqual(blameIn(s), [], s);
  // the voice rule: it roasts the sin and the ruler, never the player (no "you are" verdict about the person)
  for (const r of R) assert.doesNotMatch(r.roast, /\byou are\b|\byour fault\b/i, r.roast);
});

test('the themed words: check-ins are the fine print, defenses are wards, Recalculating is the escape route', () => {
  const W = S.snRingWords(SINS);
  assert.equal(W.checkin, 'The fine print'); assert.equal(W.ward, 'Your ward'); assert.equal(W.escape, 'The escape route');
  assert.match(W.intro, /you are the one escaping/);
  assert.notDeepEqual(SINS.rings.words, SINS.grow.frame, 'a new block, not a copy of grow.frame');
});

test('the rings: the main pull is the bottom ring, the order is the person\'s own, nothing climbed before any evidence', () => {
  const R = read(all('a')), K = S.snRings(SINS, R, {});
  assert.equal(K.of, 7); assert.equal(K.climbed, 0); assert.equal(K.ringNow, 7); assert.equal(K.out, false);
  assert.equal(K.rings[0].sin, R.families[0].top.id, 'the bottom ring is the main pull');
  assert.deepEqual(K.rings.map(r => r.n), [7, 6, 5, 4, 3, 2, 1]);
  assert.deepEqual(K.rings.map(r => r.sin).slice(0, R.families[0].order.length), R.families[0].order.filter(id => SIN.includes(id)));
  assert.match(K.head, /^You start in the Ring of .+, the ring of [A-Z][a-z]+\. Its ruler is .+\.$/);
  assert.match(K.now, /No ring climbed yet/);
  assert.equal(S.snRings(SINS, read({}), {}), null, 'no quiz: no rings');
});

test('virtues climb you out ring by ring: a retake with the first pull quieter, and a ward month with the pattern dropping', () => {
  const sc = (lust, rest) => Object.fromEntries(SIN.map(id => [id, id === 'lust' ? lust : rest]));
  const hist = [{ at: '2026-03-01', sin: { top: 'lust' }, scores: sc(6, 1) }, { at: '2026-06-01', sin: { top: 'lust' }, scores: sc(4, 1) }, { at: '2026-09-01', sin: { top: 'lust' }, scores: sc(5, 1) }];
  const steps = S.snClimb(hist, [{ trait: 'envy', end: '2026-07-01', dropped: true }, { trait: 'sloth', end: '2026-08-01', dropped: false }], SIN);
  assert.deepEqual(steps.map(s => s.kind + ':' + s.d), ['take:2026-06-01', 'ward:2026-07-01'], 'a louder retake and a held pattern climb nothing');
  assert.equal(steps[0].a, 50); assert.equal(steps[0].z, 40);
  const K = S.snRings(SINS, read(all('a')), { hist, fixes: [{ trait: 'envy', end: '2026-07-01', dropped: true }] });
  assert.equal(K.climbed, 2); assert.equal(K.ringNow, 5); assert.equal(K.on.n, 5);
  assert.match(K.steps[0].line, /Lust went from 50% to 40% of your pull\. Patience climbed you up a ring\./);
  assert.match(K.steps[1].line, /the ward "Is this yours or theirs\?": the pattern dropped\. Gratitude climbed you up a ring\./);
  assert.match(K.now, /^You are in the Ring of .+\. 5 rings to the open air\.$/);
  const many = Array.from({ length: 9 }, (_, i) => ({ trait: 'lust', end: `2026-0${i + 1}-01`, dropped: true }));
  const O = S.snRings(SINS, read(all('a')), { fixes: many });
  assert.equal(O.climbed, 7, 'never more than the seven rings'); assert.equal(O.out, true); assert.equal(O.on, null); assert.match(O.now, /climbed out of every ring/);
});

test('the boss: the ruler of the main pull, with its hold on the pull, and the add-on voice only when handed in', () => {
  for (const a of ['a', 'b', 'c', 'd']) {
    const R = read(all(a)), B = S.snBoss(SINS, R);
    assert.equal(B.sin, R.families[0].top.id, 'the top sin\'s ruler is the boss');
    assert.equal(B.name, S.snRuler(SINS, B.sin).name);
    assert.ok(B.hold > 0 && B.hold <= 100, String(B.hold));
    assert.match(B.line, new RegExp(`a hit on ${B.name}\\.$`));
  }
  assert.equal(S.snBoss(SINS, read({})), null);
  const R = read(all('a')), top = R.families[0].top.id, voice = { words: { checkin: 'Stand-in words' }, rulers: { [top]: { roast: 'A stand-in roast.' } } };
  assert.equal(S.snBoss(SINS, R, voice).roast, 'A stand-in roast.');
  assert.equal(S.snRingWords(SINS, voice).checkin, 'Stand-in words');
  assert.equal(S.snBoss(SINS, R).roast, SINS.rings.rulers[top].roast, 'without the voice: the default');
});

test('the game copy carries Part 3, and the repository holds no add-on words for the second voice', () => {
  const core = readFileSync(new URL('../game/core/sins.js', import.meta.url), 'utf8');
  for (const n of ['snRings', 'snBoss', 'snRuler', 'snClimb', 'snRingWords']) assert.match(core, new RegExp(`function ${n}\\(`), n);
  const rings = readFileSync(new URL('../game/features/rings.js', import.meta.url), 'utf8');
  assert.match(rings, /var RG_VOICE = \[\];/);
  assert.doesNotMatch(rings, /18\+|adult|explicit|Jewish|kosher|Shabbat|middot/i, 'the hook names no add-on');
});
