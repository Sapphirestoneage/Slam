// The money sins, Part 2 (results and growth): the result card, the 84 archetypes, the share card with no numbers, the
// framing line for a type and a moment, couples only with both opt-ins, the retake each quarter and the history, and
// privacy of a partner's read in the web app. Run "Money sins", Part 2 (Nov 25 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../js/math/quizcore.js';
import * as S from '../js/math/sins.js';
import { SINS } from '../js/quiz/skins/sins.js';
import { sharedLenses, lensesForOthers, sinsKeyOf } from '../js/quiz/store.js';
import { foldDoc } from '../js/privacy.js';
import { blameIn } from '../tools/tone/scan.mjs';

const NOW = '2026-11-25', qz = { qzResult: Q.qzResult, QZ_LEVELS: Q.QZ_LEVELS };
const SIN = SINS.traits.filter(t => t.group === 'sin').map(t => t.id), CH = SINS.traits.filter(t => t.group === 'change').map(t => t.id);
const FRANCHISE = /Helluva|Hazbin|Asmodeus|Mammon|Beelzebub|Belphegor|Leviathan|Lucifer|Satan|Stolas|Blitz|Moxxie|Millie|Loona|Fizzarolli|Alastor|Fullmetal|Homunculus|Greed Island|Seven Deadly|Meliodas|Gryffindor|Slytherin|Hogwarts|Pokemon|Pikachu|Marvel|Batman|Smaug|Shrek|Disney|Pixar|Inside Out|Sanrio/i;
const CLINICAL = /disorder|patholog|symptom|clinical|therapy|trauma|addict|compulsive|narciss|neurot|anxiety|depress|diagnos(?!is)/i;
// A read with the given tops and levels, in the shape of snRead (families only, what the Part 2 functions read).
const fam = (id, top, second, level) => { const t = x => ({ id: x, name: SINS.traits.find(y => y.id === x).name, score: 3, light: SINS.cards[x].light, money: SINS.cards[x].lines[0] });
  return { id, name: id, top: t(top), second: t(second), topTwo: [t(top), t(second)], level, word: level ? Q.QZ_LEVELS[level] : null }; };
const fake = (sin, change, level = 'Close', l2 = level) => ({ now: NOW, families: [fam('sin', sin, sin === 'pride' ? 'greed' : 'pride', level), fam('change', change, change === 'fear' ? 'panic' : 'fear', l2)],
  fix: { name: SINS.read.fix[sin].name, how: SINS.read.fix[sin].how, check: SINS.read.fix[sin].check, trait: sin, started: false }, engine: { scores: { [sin]: 3, [change]: 3 } } });

test('84 archetypes, made from two parts: each has an original name and one plain line, no franchise, blame or clinical word', () => {
  const A = S.snArchetypes(SINS);
  assert.equal(A.length, 84);
  assert.equal(new Set(A.map(a => a.name)).size, 84, 'every name is different');
  for (const a of A) {
    assert.match(a.name, /^The [A-Z][A-Za-z-]+ [A-Z][a-z]+$/, a.name);
    assert.match(a.line, /^[A-Z].+, and .+\.$/, a.line);
    for (const s of [a.name, a.line]) { assert.doesNotMatch(s, FRANCHISE, s); assert.doesNotMatch(s, CLINICAL, s); assert.deepEqual(blameIn(s), [], s); assert.doesNotMatch(s, /\d|\u2014/, s); }
  }
  assert.equal(S.snArchetype(SINS, 'sloth', 'later').name, 'The Someday Koala');
  assert.equal(S.snArchetype(SINS, 'lust', 'panic').name, 'The Hair-Trigger Magpie');
  assert.equal(S.snArchetype(SINS, 'pride', 'proud').line, 'Buys the version that looks right, and digs in when the plan says turn.');
  assert.equal(S.snArchetype(SINS, 'pride', 'nope'), null);
  // every word of Part 2 holds to the same rules
  const words = JSON.stringify(SINS.grow);
  assert.doesNotMatch(words, FRANCHISE); assert.doesNotMatch(words, CLINICAL); assert.doesNotMatch(words, /\u2014/);
  for (const s of words.split('"')) assert.deepEqual(blameIn(s), [], s);
  for (const id of [...SIN, ...CH]) { assert.ok(SINS.grow.virtue[id]?.name, id); assert.ok(SINS.grow.date[id], id); for (const m of S.SN_MOMENTS) assert.ok(SINS.grow.frame[id]?.[m], `${id} ${m}`); }
  for (const id of SIN) assert.ok(SINS.grow.pair.sin[id], id);
  for (const id of CH) assert.ok(SINS.grow.pair.change[id], id);
});

test('the result card: top sin and top refusal, the light side, the virtue, the archetype and one Recalculating move', () => {
  const K = S.snCard(SINS, fake('gluttony', 'fear'), { turn: 'Keep the usual payments this month. The new date is the plan now.' });
  assert.equal(K.arch.name, 'The Peekaboo Raccoon'); assert.equal(K.sin.id, 'gluttony'); assert.equal(K.change.id, 'fear');
  assert.equal(K.sin.light, SINS.cards.gluttony.light); assert.equal(K.sin.virtue.name, 'Moderation'); assert.equal(K.change.virtue.name, 'Courage');
  assert.equal(K.move.title, 'Your Recalculating move this month'); assert.equal(K.move.name, 'One treat, named ahead'); assert.match(K.move.turn, /new date/);
  assert.equal(K.early, false); assert.equal(K.extra, null);
  const E = S.snCard(SINS, fake('envy', 'panic', 'Guess'));
  assert.equal(E.early, true); assert.equal(E.arch.name, 'The Hair-Trigger Chameleon'); assert.equal(E.move.turn, null);
  // from a real read: the quiz alone, all first answers
  const ans = Object.fromEntries(SINS.questions.map(q => [q.id, 'a']));
  const R = S.snRead(qz, SINS, { ans, at: NOW }, {}, NOW), C = S.snCard(SINS, R);
  assert.equal(C.arch.name, S.snArchetype(SINS, R.families[0].top.id, R.families[1].top.id).name);
  assert.equal(C.early, true, 'the quiz alone is an Early read');
  assert.equal(S.snCard(SINS, S.snRead(qz, SINS, { ans: {} }, {}, NOW)), null, 'no quiz: no card');
});

test('the share card has no numbers, no check-in, no push-back, and never an add-on voice', () => {
  for (const s of SIN) for (const c of CH) {
    const card = S.snCard(SINS, fake(s, c), { voice: { virtues: { [s]: 'Another name' }, line: 'An add-on line' } }), X = S.snShareCard(SINS, card);
    assert.doesNotMatch(X.text, /\d|\$/, X.text);
    assert.doesNotMatch(X.text, /Another name|An add-on line|check-in|You said/, 'the default voice only');
    assert.match(X.text, new RegExp(card.arch.name));
  }
  assert.equal(S.snShareCard(SINS, null), null);
});

test('the framing line: the refusal speaks first, then the pull, only with a label; the default adds no line', () => {
  assert.deepEqual(S.snFrame(SINS, null, 'home'), { moment: 'home', line: null, trait: null, name: null, family: null });
  assert.equal(S.snFrame(SINS, fake('lust', 'fear', 'Guess'), 'hard').line, null, 'an Early read: the default');
  assert.equal(S.snFrame(SINS, fake('lust', 'fear'), 'nope').line, null);
  const f = m => S.snFrame(SINS, fake('lust', 'fear'), m);
  assert.match(f('home').line, /^Tiny first step/); assert.match(f('crash').line, /^Tiny first step/); assert.match(f('hard').line, /^Tiny first step/);
  assert.match(S.snFrame(SINS, fake('lust', 'panic'), 'crash').line, /^Wait first: the 72-hour rule/);
  assert.match(S.snFrame(SINS, fake('lust', 'proud'), 'hard').line, /path you are on/);
  assert.match(S.snFrame(SINS, fake('lust', 'nostalgia'), 'home').line, /old number next to today's/);
  const sinOnly = S.snFrame(SINS, fake('lust', 'fear', 'Close', 'Guess'), 'home');
  assert.equal(sinOnly.trait, 'lust', 'the refusal is early, so the pull speaks'); assert.match(sinOnly.line, /48 hours/);
  // it only adds a line: the card's own words and numbers come from the card, untouched
  const before = JSON.stringify(fake('lust', 'fear')); S.snFrame(SINS, fake('lust', 'fear'), 'hard'); assert.equal(JSON.stringify(fake('lust', 'fear')), before);
});

test('couples: only when BOTH turned sharing on; a line per pair of pulls and of refusals; a money date script', () => {
  const a = { name: 'Rin', sin: 'greed', change: 'fear', mate: true }, b = { name: 'Sol', sin: 'lust', change: 'panic', mate: true };
  assert.equal(S.snCouple(SINS, a, { ...b, mate: false }), null); assert.equal(S.snCouple(SINS, { ...a, mate: undefined }, b), null); assert.equal(S.snCouple(SINS, a, null), null);
  assert.equal(S.snDate(SINS, a, { ...b, mate: false }), null);
  const K = S.snCouple(SINS, a, b);
  assert.equal(K.a.arch.name, 'The Peekaboo Dragon'); assert.equal(K.b.arch.name, 'The Hair-Trigger Magpie');
  assert.match(K.sin.line, /^One of you wants one more round number, the other wants the new thing now\./);
  assert.match(K.change.line, /^One of you would rather not look, the other wants to change everything tonight\./);
  const same = S.snCouple(SINS, a, { ...b, sin: 'greed' });
  assert.equal(same.sin.same, true); assert.match(same.sin.line, /^Greed, twice\. Two of a kind/);
  const D = S.snDate(SINS, a, b);
  assert.equal(D.length, 8, 'two to open, four prompts, two to close'); assert.deepEqual(D.map(s => s.who), [null, null, 'Rin', 'Sol', 'Rin', 'Sol', null, null]);
  assert.equal(D[2].line, SINS.grow.date.greed); assert.equal(D.at(-1).n, 8); assert.equal(D[0].of, 8);
  assert.equal(S.snDate(SINS, a, { ...b, sin: 'greed' }).filter(s => s.who === 'Both').length, 1, 'one prompt when both share a trait');
  for (const s of [...D.map(x => x.line), K.sin.line, K.change.line, same.sin.line]) assert.deepEqual(blameIn(s), [], s);
  assert.deepEqual(S.snMatePart(fake('greed', 'fear'), 'Rin', true), { name: 'Rin', mate: true, sin: 'greed', change: 'fear' });
});

test('retake each quarter, skippable; the history of takes; the sin weakening and the virtue growing', () => {
  const st = { ans: { s1: 'a' }, at: '2026-08-20T10:00:00Z', sn: {} };
  assert.equal(S.snRetakeDue(st, '2026-11-18').due, false, '90 days');
  const R = S.snRetakeDue(st, '2026-11-19');
  assert.equal(R.due, true); assert.equal(R.q, 1); assert.equal(R.days, 91);
  const sk = S.snRetakeSkip(st.sn, st, '2026-11-19');
  assert.deepEqual(sk.retakeSkip, { from: '2026-08-20', q: 1 });
  assert.equal(S.snRetakeDue({ ...st, sn: sk }, '2026-12-30').due, false, 'not this quarter');
  assert.equal(S.snRetakeDue({ ...st, sn: sk }, '2027-02-18').due, true, 'the next quarter asks again');
  assert.equal(S.snRetakeDue({ ans: {} }, NOW).due, false);
  // the history: one entry a take, the newest of a date replaces, at most 12
  const r1 = { ...fake('sloth', 'later'), engine: { scores: { sloth: 6, lust: 2, pride: 2, later: 4, fear: 4 } } };
  const r2 = { ...fake('sloth', 'later'), engine: { scores: { sloth: 3, lust: 4, pride: 3, later: 2, fear: 6 } } };
  let sn = S.snHistAdd({}, r1, '2026-05-01T00:00:00Z');
  sn = S.snHistAdd(sn, r1, '2026-05-01'); assert.equal(sn.hist.length, 1);
  sn = S.snHistAdd(sn, r2, '2026-08-01');
  assert.deepEqual(sn.hist.map(e => e.at), ['2026-05-01', '2026-08-01']); assert.equal(sn.hist[0].sin.top, 'sloth');
  let many = {}; for (let i = 0; i < 15; i++) many = S.snHistAdd(many, r1, S.snAddDays('2026-01-01', i * 91));
  assert.equal(many.hist.length, 12);
  const G = S.snGrowth(SINS, sn.hist), g = G.find(x => x.family === 'sin');
  assert.equal(g.trait, 'sloth'); assert.equal(g.from, 0.6); assert.equal(g.to, 0.3); assert.equal(g.weaker, true); assert.equal(g.virtue, 'Diligence');
  assert.equal(g.line, 'Sloth went from 60% to 30% of your pull. Diligence is growing.');
  const c = G.find(x => x.family === 'change');
  assert.equal(c.weaker, true); assert.equal(c.line, 'Procrastination went from 50% to 25% of your pushback on change. Momentum is growing.');
  const back = S.snGrowth(SINS, [S.snHistEntry(r2, '2026-05-01'), S.snHistEntry(r1, '2026-08-01')]).find(x => x.family === 'sin');
  assert.equal(back.weaker, false); assert.match(back.line, /^Sloth is louder this time, 30% to 60%\. Diligence is the one to practice next\.$/);
  assert.equal(S.snGrowth(SINS, [sn.hist[0]])[0].weaker, null, 'one take: no trend yet');
  // a retake keeps the old take and the rest of the read
  const kept = S.snRetake({ ans: { s1: 'a' }, at: '2026-08-01', show: true, sn: { checks: [{ d: NOW, tag: 'bored' }], mate: true, line: 100 } }, r1);
  assert.deepEqual(kept.ans, {}); assert.equal(kept.at, null); assert.equal(kept.show, true); assert.equal(kept.go, true);
  assert.equal(kept.sn.checks.length, 1); assert.equal(kept.sn.mate, true); assert.equal(kept.sn.line, 100); assert.deepEqual(kept.sn.hist.map(e => e.at), ['2026-08-01']);
  // the graduation story's part
  const story = S.snGradStory(SINS, { ...sn, fixes: [{ dropped: true }, { dropped: false }] });
  assert.equal(story[0], 'You started as The Someday Koala.'); assert.match(story.at(-1), /2 defenses tested for a month, 1 of them/);
  assert.deepEqual(S.snGradStory(SINS, {}), []);
  for (const l of [...story, ...G.map(x => x.line)]) assert.deepEqual(blameIn(l), [], l);
});

test('privacy in the web app: a partner\'s read is theirs; each read follows its own switch; sharing with each other is not "show"', () => {
  assert.equal(sinsKeyOf('Partner'), 'sinsPartner'); assert.equal(sinsKeyOf('Me'), 'sins');
  const me = { ans: { s1: 'a' }, at: NOW, sn: { v: 1, mate: true, checks: [{ d: NOW, tag: 'bored' }] } }, them = { ans: { s1: 'b' }, at: NOW, sn: { v: 1, mate: true } };
  const start = { lenses: { sins: me, sinsPartner: them, houses: { ans: {}, seen: 'Everyone' } } };
  assert.deepEqual(Object.keys(lensesForOthers(start).lenses), ['houses'], 'the coach: neither read');
  assert.deepEqual(Object.keys(lensesForOthers(start, 'sinsPartner').lenses), ['sinsPartner', 'houses'], 'the partner keeps their own');
  assert.deepEqual(Object.keys(sharedLenses(start.lenses)), ['houses'], 'a shared copy: neither, though both share with each other');
  const shown = { ...start, lenses: { ...start.lenses, sinsPartner: { ...them, sn: { ...them.sn, show: true } } } };
  assert.deepEqual(Object.keys(lensesForOthers(shown).lenses), ['sinsPartner', 'houses']);
  assert.deepEqual(sharedLenses(shown.lenses).sinsPartner, { ans: them.ans, at: NOW, sn: { v: 1, show: true } }, 'even shown, only the quiz goes');
  const doc = { profile: { mode: 'married' }, records: [], settings: { start } };
  const viewOf = person => foldDoc({ ...doc, settings: { ...doc.settings, person } }, { who: 'client', person, couple: true });
  assert.ok(viewOf('Partner').settings.start.lenses.sinsPartner && !viewOf('Partner').settings.start.lenses.sins, 'the partner\'s view: their own read only');
  assert.ok(viewOf('Me').settings.start.lenses.sins && !viewOf('Me').settings.start.lenses.sinsPartner, 'the client\'s view: their own read only');
  assert.ok(!foldDoc(doc, { who: 'coach', person: 'all', couple: true }).settings.start.lenses.sins);
});
