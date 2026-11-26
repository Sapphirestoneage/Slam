// The one quiz engine (js/math/quizcore.js), its skins (js/quiz/skins), and the quizzes that moved onto it.
// The game runs a copy of the engine and of the skins (game/core/quizcore.js, game/data/quizskins.js); the first test
// holds the copies current. The "kept digest" tests hold each old quiz to the results it gave before the move: the
// digests were taken from the old code on Nov 25 2026, over the same answer sets as here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as QZ from '../js/math/quizcore.js';
import { SKINS, skinOf } from '../js/quiz/skins/index.js';
import { stale, routesOf } from '../tools/game_quiz_build.mjs';
import { quizOf, BANK, MONEY_CHART } from '../js/quiz.js';
import { collapseOf, COLLAPSE, COLLAPSE_QUIZ } from '../js/collapse.js';
import { lettersOf, axisScores } from '../js/math/identity.js';
import { lensNow, lensPatch, sharedLenses, elementNow, SHOWN } from '../js/quiz/store.js';
import { shareDoc } from '../js/privacy.js';
import { newHousehold } from '../js/records.js';
import { blameIn } from '../tools/tone/scan.mjs';

const { qzHolds, qzFlow, qzScore, qzResult, qzCard, qzRoute, qzIds, qzFeed, qzElements, qzCheck, qzTaps, qzLast, qzOutside, QZ_LEVELS, QZ_ELEMENTS } = QZ;
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'), json = p => JSON.parse(read(p));
const sha = s => createHash('sha256').update(s).digest('hex').slice(0, 16);
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const real = SKINS.filter(s => !s.soon);
const walk = (def, pick) => { const a = {}; for (let n = 0; n < 40; n++) { const f = qzFlow(def, a); if (f.done) break; const q = f.next, opts = q.options ? q.options.map(o => o.id) : def.scale.map(s => s[0]); a[q.id] = opts[pick(opts.length, n)]; } return a; };
const all = (def, v) => walk(def, n => Math.min(v, n - 1));

// A small quiz for the engine's own tests: three traits in two groups, a branch, and cards.
const T = {
  id: 't', name: 'Test', note: 'A game lens.', scoring: 'sum', groups: [{ id: 'g1', name: 'One' }, { id: 'g2', name: 'Two' }],
  traits: [{ id: 'a', name: 'A', group: 'g1' }, { id: 'b', name: 'B', group: 'g1' }, { id: 'c', name: 'C', group: 'g2' }],
  questions: [
    { id: 'q1', ask: 'One?', options: [{ id: 'x', label: 'x', add: { a: 2 } }, { id: 'y', label: 'y', add: { b: 2 } }, { id: 'z', label: 'z', add: { c: 2 } }] },
    { id: 'q2', ask: 'Two?', options: [{ id: 'x', label: 'x', add: { a: 2 } }, { id: 'y', label: 'y', add: { b: 2 } }] },
    { id: 'q3', ask: 'Only after z?', when: { q1: 'z' }, options: [{ id: 'x', label: 'x', add: { c: 1 } }, { id: 'y', label: 'y', add: { a: 1, b: 1 } }] },
  ],
  cards: Object.fromEntries(['a', 'b', 'c'].map(t => [t, { title: `Card ${t}`, lines: ['One.', 'Two.'], light: 'Light.', next: { label: 'Go', skill: 'main-path-buy-your-first-share' }, readings: ['cut-every-treat'] }])),
  core: { elements: { a: { Fire: 1 }, b: { Earth: 1 }, c: { Water: 0.5, Air: 0.5 } }, sheet: 'Test', how: 'a Fire, b Earth, c Water and Air.' },
};

test('the game\'s copies of the engine, the skins and the routes are current (node tools/game_quiz_build.mjs)', () => {
  assert.deepEqual(stale(), [], 'a file is old: run node tools/game_quiz_build.mjs, then the game steps (prettier, stamp, code map)');
  const src = read('js/math/quizcore.js');
  assert.match(read('game/core/quizcore.js'), new RegExp(`SOURCE-HASH  ${sha(src)}`));
  assert.doesNotMatch(src, /^import /m, 'the engine has no imports');
  assert.doesNotMatch(src, /document\.|window\.|localStorage|Date\.now|Math\.random|new Date/, 'pure: no screen, no storage, no clock, no dice');
  assert.match(read('game/index.html'), /core\/quizcore\.js[\s\S]*data\/quizskins\.js[\s\S]*features\/chart\.js[\s\S]*features\/quizzes\.js/, 'the load order');
});

test('conditions are data: equals, one of, not, not answered, any', () => {
  assert.ok(qzHolds(null, {}) && qzHolds(undefined, { a: 1 }));
  assert.ok(qzHolds({ a: 'x' }, { a: 'x' }) && !qzHolds({ a: 'x' }, { a: 'y' }) && !qzHolds({ a: 'x' }, {}));
  assert.ok(qzHolds({ a: ['x', 'y'] }, { a: 'y' }) && !qzHolds({ a: ['x', 'y'] }, { a: 'z' }));
  assert.ok(qzHolds({ a: { not: 'x' } }, {}) && qzHolds({ a: { not: ['x', 'y'] } }, { a: 'z' }) && !qzHolds({ a: { not: 'x' } }, { a: 'x' }));
  assert.ok(qzHolds({ a: null }, {}) && !qzHolds({ a: null }, { a: 'x' }));
  assert.ok(qzHolds({ any: [{ a: 'x' }, { b: 'y' }] }, { b: 'y' }) && !qzHolds({ any: [{ a: 'x' }, { b: 'y' }] }, {}));
  assert.ok(qzHolds({ a: 'x', b: 'y' }, { a: 'x', b: 'y' }) && !qzHolds({ a: 'x', b: 'y' }, { a: 'x' }), 'every test of a condition holds');
});

test('the flow: a branch adds a question, Back takes the last answer, an answer that is not an option does not count', () => {
  assert.equal(qzFlow(T, {}).next.id, 'q1');
  assert.deepEqual(qzFlow(T, { q1: 'x' }).asked.map(q => q.id), ['q1', 'q2']);
  assert.deepEqual(qzFlow(T, { q1: 'z' }).asked.map(q => q.id), ['q1', 'q2', 'q3']);
  assert.equal(qzFlow(T, { q1: 'x', q2: 'y' }).done, true);
  assert.equal(qzFlow(T, { q1: 'z', q2: 'y' }).done, false);
  assert.equal(qzFlow(T, { q1: 'nope' }).next.id, 'q1');
  assert.equal(qzLast(T, { q1: 'z', q2: 'x' }), 'q2');
  assert.equal(qzLast(T, {}), null);
  assert.deepEqual(qzTaps(T), { min: 2, max: 3 });
});

test('scoring: points add up by trait, an answer off the path does not count, and the function is pure', () => {
  const a = { q1: 'x', q2: 'x' }, before = JSON.stringify(a), S = qzScore(T, a);
  assert.deepEqual(S.scores, { a: 4, b: 0, c: 0 });
  assert.equal(S.top, 'a'); assert.equal(S.margin, 1); assert.equal(S.tie, false);
  assert.deepEqual(qzScore(T, { q1: 'x', q2: 'y', q3: 'x' }).scores, { a: 2, b: 2, c: 0 }, 'q3 is not asked after x, so its answer does not count');
  assert.deepEqual(qzScore(T, { q1: 'z', q2: 'y', q3: 'y' }).scores, { a: 1, b: 3, c: 2 });
  assert.equal(JSON.stringify(a), before, 'the answers are not changed');
  assert.deepEqual(qzScore(T, a), qzScore(T, a), 'the same inputs give the same result');
  assert.deepEqual(qzScore(T, { q1: 'z', q2: 'x', q3: 'x' }).groups.map(g => [g.id, g.score]), [['g1', 2], ['g2', 3]], 'a group is the sum of its traits');
});

test('ties: the order of the definition breaks a tie, the result says it is one, and both are in the top two', () => {
  const R = qzResult(T, { q1: 'x', q2: 'y' });
  assert.equal(R.tie, true); assert.equal(R.id, 'a'); assert.deepEqual(R.topTwo, ['a', 'b']);
  assert.equal(R.confidence.level, 'Guess'); assert.equal(R.confidence.word, 'Early read');
  const c = qzCard(T, R);
  assert.equal(c.tie, true); assert.deepEqual(c.also, { id: 'b', name: 'Card b' });
});

test('a result carries a top two (and one for each group), never one hard label', () => {
  const R = qzResult(T, { q1: 'z', q2: 'y', q3: 'y' });
  assert.deepEqual(R.topTwo, ['b', 'c']); assert.equal(R.top, 'b'); assert.equal(R.second, 'c');
  assert.deepEqual([R.byGroup.g1.top, R.byGroup.g1.second, R.byGroup.g1.tie], ['b', 'a', false]); assert.ok(Math.abs(R.byGroup.g1.margin - 2 / 6) < 1e-9);
  assert.equal(R.byGroup.g2.top, 'c'); assert.equal(R.byGroup.g2.second, null);
  assert.deepEqual(R.ranked.map(r => r.id), ['b', 'c', 'a']);
  assert.ok(Math.abs(R.ranked.reduce((s, r) => s + r.share, 0) - 1) < 1e-9, 'the shares add up to 1');
});

test('the confidence level: Early read, Close read, and Confirmed by you only by the person\'s own tap', () => {
  assert.deepEqual(QZ_LEVELS, { Guess: 'Early read', Close: 'Close read', Exact: 'Confirmed by you' });
  assert.equal(qzResult(T, { q1: 'x' }).confidence, null, 'no result yet, no level');
  assert.equal(qzResult(T, { q1: 'x', q2: 'x' }).confidence.level, 'Close');
  assert.equal(qzResult(T, { q1: 'x', q2: 'y' }).confidence.level, 'Guess', 'a tie is an early read');
  assert.equal(qzResult(T, { q1: 'x', q2: 'y' }, null, { confirmed: true }).confidence.level, 'Exact');
  const strict = { ...T, confidence: { margin: 0.1, sources: 2 } };
  assert.equal(qzResult(strict, { q1: 'x', q2: 'x' }).confidence.level, 'Guess', 'a skin can ask for two sources before Close');
  assert.equal(qzResult(strict, { q1: 'x', q2: 'x' }, [{ source: 'spending', scores: { a: 1 } }]).confidence.level, 'Close');
});

test('scores from outside are an input: they move the result, they name their sources, and nothing is kept', () => {
  const a = { q1: 'x', q2: 'x' };
  assert.equal(qzResult(T, a).id, 'a');
  const R = qzResult(T, a, [{ source: 'spending', scores: { c: 5 } }, { source: 'coach', scores: { c: 1, a: 1 } }]);
  assert.deepEqual(R.scores, { a: 5, b: 0, c: 6 }); assert.equal(R.id, 'c'); assert.deepEqual(R.topTwo, ['c', 'a']); assert.deepEqual(R.sources, ['quiz', 'spending', 'coach']);
  assert.equal(qzResult(T, a).id, 'a', 'the next call without them is as before');
  assert.deepEqual(qzResult(T, a, { b: 9 }).scores, { a: 4, b: 9, c: 0 }, 'a plain { trait: points } works too');
  const only = qzResult(T, {}, [{ source: 'spending', scores: { b: 3, a: 1 } }]);
  assert.equal(only.ready, true); assert.equal(only.id, 'b'); assert.deepEqual(only.sources, ['spending'], 'a result can come from outside scores alone');
  assert.deepEqual(qzOutside([{ source: 's', scores: { a: 1, b: 'x', c: NaN } }]), { scores: { a: 1 }, sources: ['s'] }, 'only numbers count');
  assert.deepEqual(qzOutside(null), { scores: {}, sources: [] });
});

test('the card: a title, two or three lines, the light side, one next step, and the routes', () => {
  const R = qzResult(T, { q1: 'x', q2: 'x' }), c = qzCard(T, R);
  assert.deepEqual([c.title, c.lines.length, c.light, c.next.label], ['Card a', 2, 'Light.', 'Go']);
  assert.equal(c.also, null, 'no second when nothing else scored');
  assert.deepEqual(qzRoute(T, R), { next: T.cards.a.next, skills: ['main-path-buy-your-first-share'], readings: ['cut-every-treat'], trees: [] });
  assert.equal(qzCard(T, qzResult(T, { q1: 'x' })), null, 'no card before the result is ready');
  assert.deepEqual(qzCheck(T), []);
  assert.ok(qzCheck({ ...T, cards: { a: T.cards.a } }).some(l => /trait b has no card/.test(l)), 'the check names a trait with no card');
  assert.ok(qzCheck({ ...T, core: { ...T.core, elements: { a: { Lava: 1 } } } }).some(l => /Lava is not one of the five elements/.test(l)));
});

test('what a result changes: the element stays, or the card asks keep or switch; never a change without a tap', () => {
  const R = qzResult(T, { q1: 'x', q2: 'x' });
  assert.deepEqual(qzElements(T, R).lead, ['Fire']);
  const same = qzFeed(T, R, 'Fire');
  assert.deepEqual([same.same, same.ask, same.line], [true, false, 'Your element stays Fire.']);
  const other = qzFeed(T, R, 'Water');
  assert.deepEqual([other.same, other.ask, other.line, other.keep, other.to], [false, true, 'This leans you toward Fire: keep Water or switch?', 'Water', 'Fire']);
  assert.equal(qzFeed(T, R, null).line, 'This leans you toward Fire. Make Fire your element?');
  assert.deepEqual(other.sheet, { label: 'Test', value: 'Card a' });
  const level = qzFeed(T, qzResult(T, { q1: 'z', q2: 'y', q3: 'x' }), 'Spirit'); // c 3 (Water 1.5, Air 1.5), b 2 (Earth 2): Earth leads alone
  assert.equal(level.to, 'Earth');
  const tied = qzFeed(T, qzResult(T, { q1: 'x', q2: 'y' }), 'Spirit'); // Fire 2, Earth 2: no lean
  assert.deepEqual([tied.lean, tied.ask, tied.line], [null, false, 'Your element stays Spirit.']);
  assert.equal(qzFeed(T, qzResult(T, { q1: 'x', q2: 'y' }), 'Earth').same, true, 'two elements level and one is yours: it stays');
});

// ---------- the skins ----------
test('fifteen skins, all to play (the sins quiz is real since the run Money sins, Part 1; six more since Part 6 of the run Finish everything partly built); each is plain data and sound', () => {
  assert.deepEqual(SKINS.map(s => s.id), ['letters', 'address', 'houses', 'avatars', 'sheet', 'pyramid', 'mountain', 'stars', 'sins', 'scripts', 'enneagram', 'fire', 'snack', 'traits', 'collapse']);
  for (const s of SKINS) {
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s, `${s.id}: data only, no functions`);
    assert.deepEqual(qzCheck(s), [], s.id);
    assert.ok(s.note && s.blurb && s.core.sheet && s.core.how, s.id);
  }
  // short tap quizzes: 7 to 15 taps; the percent style (many: true) is 24 quick taps; Quantum collapse asks the fewest (2 to 5)
  for (const s of real) { const t = qzTaps(s), [lo, hi] = s.many ? [16, 24] : s.id === 'collapse' ? [2, 5] : [7, 15]; assert.ok(t.max >= lo && t.max <= hi && t.min >= Math.min(lo, 2), `${s.id}: ${t.max} taps`); assert.match(s.note, /game lens|Playful/); assert.match(s.note, /not a (test|diagnosis|forecast)/i); }
  assert.equal(real.length, 15, 'no placeholder is left');
  const sins = skinOf('sins');
  assert.equal(sins.soon, undefined); assert.equal(sins.questions.length, 15); assert.equal(sins.traits.length, 19);
  assert.deepEqual(sins.groups.map(g => g.id), ['sin', 'change']);
  assert.equal(sins.traits.filter(t => t.group === 'sin').length, 7); assert.equal(sins.traits.filter(t => t.group === 'change').length, 12);
  assert.equal(sins.confidence.sources, 2, 'the quiz alone is an Early read');
  assert.equal(qzResult(sins, all(sins, 0)).confidence.level, 'Guess');
});

test('every path through every skin ends on one card', () => {
  for (const def of real) {
    const r = rng(5), seen = new Set();
    for (let k = 0; k < 600; k++) {
      const a = k < 6 ? all(def, k) : walk(def, n => Math.floor(r() * n)), R = qzResult(def, a), c = qzCard(def, R);
      assert.ok(R.done && R.ready, `${def.id}: ${JSON.stringify(a)} ends`);
      assert.ok(c && c.title && c.lines.length >= 2 && c.lines.length <= 3 && c.light && c.next?.label && (c.next.skill || c.next.tree || c.next.reading), `${def.id}: ${R.id} has a whole card`);
      if (def.result?.by !== 'rules') assert.equal(R.topTwo.length, 2); assert.ok(R.confidence && QZ_LEVELS[R.confidence.level]);
      const f = qzFeed(def, R, 'Fire'); assert.ok(f.line && f.sheet?.label === def.core.sheet, def.id);
      seen.add(R.id);
    }
    if ((def.result?.by ?? 'top') === 'top') assert.deepEqual(def.traits.filter(t => !def.result?.group || t.group === def.result.group).map(t => t.id).filter(t => !seen.has(t)), [], `${def.id}: each result can be reached`);
    if (def.result?.by === 'rules') assert.deepEqual(Object.keys(def.cards).filter(t => !seen.has(t)), [], `${def.id}: each first move can be reached`);
  }
  // the two code quizzes: every code has a card
  const L = skinOf('letters'); assert.equal(Object.keys(L.cards).length, 16);
  const A = skinOf('address'), codes = new Set(); const r = rng(9);
  for (let k = 0; k < 3000; k++) codes.add(qzResult(A, walk(A, n => Math.floor(r() * n))).code);
  for (const c of codes) assert.equal([...c].length, 4, c);
  assert.ok(codes.size > 100, `${codes.size} addresses reached`);
});

test('a result routes only to real ids: skills and skill trees of data/library/skills.json, readings of unlearn.json', () => {
  const lib = json('data/library/skills.json'), un = json('data/library/unlearn.json');
  const skills = new Set(lib.skills.map(s => s.id)), trees = new Set(lib.trees.map(t => t.id)), reads = new Set(un.entries.map(e => e.id));
  for (const def of [...SKINS, T]) {
    const ids = qzIds(def);
    assert.deepEqual(ids.skills.filter(id => !skills.has(id)), [], `${def.id}: skills`);
    assert.deepEqual(ids.trees.filter(id => !trees.has(id)), [], `${def.id}: trees`);
    assert.deepEqual(ids.readings.filter(id => !reads.has(id)), [], `${def.id}: readings`);
    if (!def.soon) assert.ok(ids.skills.length + ids.trees.length > 0, `${def.id} routes somewhere`);
  }
  const bad = { ...T, cards: { ...T.cards, a: { ...T.cards.a, next: { label: 'Go', skill: 'no-such-skill' } } } };
  assert.deepEqual(qzIds(bad).skills.filter(id => !skills.has(id)), ['no-such-skill'], 'the guard works');
  const routes = routesOf(), file = json('data/quiz/routes.json');
  assert.deepEqual(file.skills, routes.skills); assert.deepEqual(file.readings, routes.readings); assert.deepEqual(file.trees, routes.trees);
});

test('the words: original, no em dash, no blame word, no clinical word, and the playful one says so', () => {
  const words = JSON.stringify(SKINS);
  assert.ok(!words.includes(String.fromCharCode(0x2014)), 'no em dash');
  assert.doesNotMatch(words, /disorder|patholog|symptom|clinical|therapy|trauma|addict|narciss|neurot|anxiety|depress/i, 'no clinical words');
  // the Money Letters carry Eli's own registry words (test/identity.test.js reads those); the words written for this part are held here
  assert.doesNotMatch(JSON.stringify(SKINS.filter(x => x.id !== 'letters')), /\b(should|must|bad|wrong|fail|lazy|greedy|irresponsible|weak)\b/i, 'no verdict words');
  for (const s of SKINS) for (const str of JSON.stringify(s).split('"')) assert.deepEqual(blameIn(str), [], str);
  assert.doesNotMatch(words, /Gryffindor|Slytherin|Hufflepuff|Ravenclaw|Hogwarts|Dauntless|Erudite|Abnegation|Amity|Candor|Myers|Briggs|MBTI|INTJ|ENFP|introvert|extravert|Aries|Taurus|Gemini|Scorpio|Capricorn|zodiac|paladin|warlock|Dungeons|Summoner|League of/i, 'no names from a franchise, a trademarked test or real astrology');
  const stars = skinOf('stars');
  assert.equal(stars.playful, true); assert.match(stars.note, /Playful/); assert.match(stars.intro[0], /for fun/);
  assert.equal(qzCard(stars, qzResult(stars, all(stars, 0))).playful, true);
  assert.match(skinOf('letters').note, /game lens/);
});

test('each skin says how it maps: to the five elements in core.elements, or to a line of the character sheet', () => {
  for (const s of real) {
    assert.ok(s.core.sheet && s.core.how.length > 20, s.id);
    if (s.core.elements) for (const [t, m] of Object.entries(s.core.elements)) { assert.ok(s.traits.some(x => x.id === t), `${s.id}: ${t}`); for (const e of Object.keys(m)) assert.ok(QZ_ELEMENTS.includes(e)); }
    assert.match(read(`js/quiz/skins/${s.id}.js`), /HOW IT MAPS/, `${s.id}: the mapping is written at the top of the skin file`);
  }
  assert.equal(skinOf('address').core.elements, undefined, 'the FI Address adds a line to the sheet and leans on no element');
  const H = skinOf('houses');
  assert.equal(qzFeed(H, qzResult(H, all(H, 0)), 'Fire').to, 'Earth'); assert.equal(qzFeed(H, qzResult(H, all(H, 2)), 'Fire').same, true);
});

// ---------- the old quizzes give the results they gave before ----------
test('the Money Chart on the engine: 240 answer sets give the same results as before (a kept digest)', () => {
  const r = rng(11), out = [];
  for (let k = 0; k < 240; k++) { const depth = ['ten', 'std', 'full'][k % 3], fill = [0.3, 0.7, 1, 1][k % 4], a = {};
    for (const i of BANK) if ((depth === 'full' || i[depth] || r() < 0.1) && r() < fill) a[i.id] = 1 + Math.floor(r() * 5);
    out.push(JSON.stringify(quizOf(a, depth))); }
  assert.equal(sha(out.join('\n')), '7670b92abaff49ef');
  const a = {}; for (const i of BANK.filter(i => i.ten)) a[i.id] = i.el === 'fire' ? 5 : i.el === 'water' ? 1 : 3;
  const q = quizOf(a);
  assert.deepEqual({ top: q.top.id, low: q.low.id, sun: q.sun, scores: q.scores.map(s => s.score), mirror: q.mirror }, { top: 'earth', low: 'water', sun: { el: 'fire', name: 'Freedom', n: 1, score: 100 }, scores: [0, 50, 50, 50, 50], mirror: 'safe' });
  assert.equal(MONEY_CHART.questions.length, 100); assert.equal(MONEY_CHART.traits.length, 25);
});

test('Quantum Collapse on the engine: all 5,250 answer sets give the same result as before (a kept digest)', () => {
  const out = [], opts = COLLAPSE.map(q => [null, ...q.options.map(o => o[0])]);
  const go = (i, a) => { if (i === COLLAPSE.length) { const c = collapseOf(a); out.push(JSON.stringify({ ...c, next: c.next?.id ?? null })); return; } for (const v of opts[i]) go(i + 1, v == null ? a : { ...a, [COLLAPSE[i].id]: v }); };
  go(0, {});
  assert.equal(out.length, 5250); assert.equal(sha(out.join('\n')), '2acb176f57b4847f');
  assert.equal(collapseOf({ press: 'behind' }).move.id, 'stabilize'); assert.equal(collapseOf({ work: 'job', press: 'cards', cushion: '3', match: 'all' }).move.id, 'debt');
  for (const q of COLLAPSE) assert.notEqual(typeof q.when, 'function', 'a condition is data');
  assert.equal(COLLAPSE_QUIZ.result.by, 'rules');
});

test('the Money Letters on the engine: every one of the 531,441 answer sets, and 4,000 with blanks and leans, as before', () => {
  const out = [], a = Array(12).fill(-1);
  for (let n = 0; n < 531441; n++) { let x = n; for (let i = 0; i < 12; i++) { a[i] = x % 3 - 1; x = Math.floor(x / 3); } const L = lettersOf(a); out.push(L.type + L.axes.map(s => s.score).join(',')); }
  assert.equal(sha(out.join('\n')), '9431fd2799c82521');
  const r = rng(7), o2 = [];
  for (let k = 0; k < 4000; k++) { const b = Array.from({ length: 12 }, () => { const v = r(); return v < 0.25 ? null : v < 0.5 ? 1 : v < 0.75 ? 0 : -1; });
    const ties = { ek: r() < 0.5 ? 'E' : 'K', po: r() < 0.5 ? 'P' : 'O', gv: r() < 0.5 ? 'G' : 'V', xs: r() < 0.5 ? 'X' : 'S' }; o2.push(JSON.stringify(lettersOf(b, ties)) + JSON.stringify(axisScores(b))); }
  assert.equal(sha(o2.join('\n')), '99a8eb2983c96b7a');
});

// ---------- the web app: what is kept, and what leaves ----------
test('a result is private by default: a shared copy leaves it out until the person shows it', () => {
  const H = skinOf('houses'), doc = newHousehold({ name: 'Test' });
  let start = { quiz: { q1: 3 } };
  start = { ...start, ...lensPatch(start, 'houses', { ans: all(H, 0), go: true }) };
  start = { ...start, ...lensPatch(start, 'stars', { ans: { s1: 'a' } }) };
  doc.settings = { ...(doc.settings || {}), start };
  assert.deepEqual(Object.keys(shareDoc(doc).settings.start.lenses), [], 'Me only is the default');
  assert.deepEqual(shareDoc(doc).settings.start.quiz, { q1: 3 }, 'the rest of the page\'s answers are as before');
  const shown = { ...doc, settings: { ...doc.settings, start: { ...start, ...lensPatch(start, 'houses', { seen: SHOWN }) } } };
  assert.deepEqual(Object.keys(shareDoc(shown).settings.start.lenses), ['houses']);
  assert.deepEqual(sharedLenses(null), null);
  const N = lensNow(H, shown.settings.start.lenses.houses, 'Fire');
  assert.equal(N.card.title, 'House Hearthstone'); assert.equal(N.mineOnly, false); assert.equal(N.feed.ask, true);
  assert.equal(lensNow(H, { ans: { h1: 'a' } }, 'Fire').card, null, 'no card until every question is answered');
  assert.equal(lensNow(skinOf('letters'), { ans: Object.fromEntries(skinOf('letters').questions.slice(0, 8).map(q => [q.id, 1])) }).card, null, 'the letters wait for all twelve');
  assert.equal(elementNow({ element: 'Air' }, 'Fire'), 'Air'); assert.equal(elementNow({}, 'Fire'), 'Fire'); assert.equal(elementNow({}, null), null);
});

test('the page draws every quiz with the one renderer, and docs/QUIZ-ENGINE.md says how to add a skin in five steps', () => {
  const page = read('js/solo/quiz.js'), render = read('js/quiz/page.js');
  assert.match(page, /askCard\(\{ def: MONEY_CHART/); assert.match(page, /resultCard\(/); assert.match(page, /listCard\(/);
  assert.match(render, /export const QUIZ_STYLES/); assert.doesNotMatch(render, /qzScore|qzResult/, 'the renderer works nothing out');
  const doc = read('docs/QUIZ-ENGINE.md');
  for (const n of [1, 2, 3, 4, 5]) assert.match(doc, new RegExp(`^${n}\\. `, 'm'), `step ${n}`);
  for (const w of ['qzResult', 'outside', 'topTwo', 'Early read', 'game_quiz_build', 'QUIZ_STYLES', 'sins']) assert.ok(doc.includes(w), w);
});

// ---------- Part 6 of the run Finish everything partly built (Nov 25 2026): the missing quiz styles ----------
const { qzBars, qzSpectrums, qzPaths } = QZ;
const every = (def, v) => Object.fromEntries(def.questions.map(q => [q.id, v]));
test('a percent for each trait (qzBars): points out of the most on the path, each on its own; a statement quiz is its average', () => {
  const T2 = qzBars(T, { q1: 'x', q2: 'x' });
  assert.deepEqual(T2.map(b => [b.id, b.score, b.max, b.pct]), [['a', 4, 4, 100], ['b', 0, 4, 0], ['c', 0, 2, 0]], 'q3 is off the path, so c can get 2 at most');
  assert.deepEqual(qzBars(T, { q1: 'z', q3: 'y' }).map(b => [b.id, b.max]), [['a', 5], ['b', 5], ['c', 3]], 'the branch adds its own most');
  const P = skinOf('traits'), B = qzBars(P, every(P, 5));
  assert.equal(B.length, 8); assert.ok(B.every(b => b.pct === 67), 'two yes and one turned-around yes: (5 + 5 + 1) / 3 on a 1 to 5 scale is 67');
  assert.ok(qzBars(P, every(P, 3)).every(b => b.pct === 50));
  const S = skinOf('scripts'), sb = qzBars(S, every(S, 'v'));
  assert.deepEqual(sb.map(b => b.pct), [0, 0, 0, 100]); assert.equal(qzResult(S, every(S, 'v')).id, 'vigil');
  const two = { ...every(P, 1), p1: 5, p9: 5, p17: 1, p4: 5, p12: 5, p20: 1 };
  assert.deepEqual(qzBars(P, two).filter(b => b.pct === 100).map(b => b.id), ['saver', 'bold'], 'two traits high at once');
  assert.deepEqual(qzBars(T, {}), qzBars(T, {}), 'pure');
});
test('the FIRE quiz: Likert statements, the card is the top flavor (result.group), bars for the flavors, three spectrums', () => {
  const F = skinOf('fire'), a = every(F, 3);
  Object.assign(a, { f2: 5, f9: 1, f5: 5, f12: 1, f13: 5, f6: 1 });
  const R = qzResult(F, a);
  assert.equal(R.id, 'fat'); assert.ok(['lean', 'coast', 'barista'].includes(R.second), 'the second is a flavor too, never a preference');
  assert.deepEqual(qzBars(F, a, 'flavor').map(b => b.id), ['lean', 'fat', 'coast', 'barista']);
  const S = qzSpectrums(F, a);
  assert.deepEqual(S.map(x => [x.id, x.pos, x.word]), [['earn', 100, 'Earn more'], ['hands', 0, 'Set and forget'], ['move', 50, 'In the middle']]);
  assert.deepEqual(qzSpectrums(F, {}).map(x => x.pos), [null, null, null], 'nothing answered: no mark');
  assert.ok(qzCheck({ ...F, result: { by: 'top', group: 'nope' } }).some(l => /not a group/.test(l)));
  assert.ok(qzCheck({ ...F, spectrums: [{ id: 'x', trait: 'nope' }] }).some(l => /spectrum x/.test(l)));
  const N = lensNow(F, { ans: a });
  assert.equal(N.bars.length, 4); assert.equal(N.spectrums.length, 3); assert.equal(N.card.title, 'Fat FIRE');
});
test('the playful picture style, the Enneagram (nine types) and Money Scripts (four names from the research) are skins of the one engine', () => {
  const K = skinOf('snack');
  assert.equal(K.playful, true); assert.ok(K.questions.every(q => q.style === 'cards' && q.options.every(o => o.icon && o.label)));
  assert.match(read('js/quiz/page.js'), /cards: \(def, q, answer, pick\)/); assert.match(read('game/features/quizzes.js'), /q\.style === "cards"/);
  const E = skinOf('enneagram');
  assert.equal(E.traits.length, 9); assert.deepEqual(E.traits.map(t => t.name.split(':')[0]), ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']);
  assert.doesNotMatch(JSON.stringify(E), /Reformer|Helper|Achiever|Individualist|Investigator|Loyalist|Enthusiast|Challenger|Peacemaker/, 'no type names of a published Enneagram book');
  const S = skinOf('scripts');
  assert.deepEqual(S.traits.map(t => t.name), ['Money avoidance', 'Money worship', 'Money status', 'Money vigilance']); assert.match(S.note, /Klontz/);
  for (const d of [E, S, skinOf('traits')]) { assert.ok(d.bars); assert.ok(lensNow(d, { ans: every(d, d.questions[0].options ? 'a' : 4) }).bars.length >= 4); }
});
test('Quantum collapse in the game: the same questions and rules as js/collapse.js, the engine\'s meter, and the measured order', async () => {
  const C = skinOf('collapse'), { QUESTIONS } = await import('../js/journey.js');
  assert.equal(C.where, 'game'); assert.deepEqual(C.questions, JSON.parse(JSON.stringify(COLLAPSE_QUIZ.questions))); assert.deepEqual(C.result, COLLAPSE_QUIZ.result);
  assert.deepEqual(C.measured.map(m => m.key), QUESTIONS.map(q => q.key), 'the measured order of tools/collapse/measure.mjs, as js/journey.js asks it');
  for (const a of [{}, { work: 'job' }, { work: 'job', press: 'none' }, { press: 'behind' }, { work: 'self', press: 'thin', cushion: '1' }]) {
    const c = collapseOf(a), P = qzPaths(C, a);
    assert.deepEqual([P.total, P.left, P.share], [c.total, c.left, c.share], JSON.stringify(a));
    if (c.done) assert.equal(qzResult(C, a).id, c.move.id);
  }
  assert.ok(qzPaths(C, { press: 'behind' }).share === 1);
  const page = read('js/solo/quiz.js');
  assert.match(page, /WEB_SKINS\.map/); assert.match(page, /where !== 'game'/, 'the web app keeps its own first screen for it');
});
