// Money exercises (run "Finish everything partly built", Part 7, Money psychology): one list for both apps, the
// prompts, the lines to tap, the who-sees rule (Me only by default), privacy in shared copies, the tone of every
// prompt, the screen and its ways in, and the game's copy of the list.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Store } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { EX_LIST, EX_GROUPS, EX_ME_ONLY, EX_SHARED, EX_MAX, EX_VOICE, exById, exOfGroup, exAddStart, exClean, exAnswer, exFor, exCount } from '../js/exercises/catalog.js';
import { CALM_LETTER, exerciseOf, keepExercise, sharedExercises } from '../js/exercises/calm-letter.js';
import { shareDoc } from '../js/privacy.js';
import { TABS, VIEWS, search, parseRoute } from '../js/nav.js';
import { blameIn } from '../tools/tone/scan.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const NOW = new Date('2026-11-26T12:00:00Z');
const fresh = () => { const s = new Store(householdFromInputs(JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url))).inputs, { now: NOW.toISOString() })); s.now = () => NOW.toISOString(); return s; };
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('the list: the ten exercises Eli named and the three prompts for life after work, each complete', () => {
  assert.deepEqual(exOfGroup('write').map(e => e.id), ['letter-to-money', 'first-memory', 'shame-inventory', 'finish-sentences', 'scarcity-audit', 'alter-ego', 'forgiveness-letter', 'values-spending', 'enough', 'autobiography']);
  assert.deepEqual(exOfGroup('after').map(e => e.title), ['Why journal', 'Little p purpose', 'Who you are after work']);
  assert.deepEqual(EX_GROUPS.map(g => g.id), ['calm', 'write', 'after'], 'the letter from your calm self is the first group, on the same screen');
  assert.equal(new Set(EX_LIST.map(e => e.id)).size, EX_LIST.length);
  assert.ok(!exById(CALM_LETTER.id), 'the letter is not copied into the list: the screen shows the one that exists');
  for (const e of EX_LIST) {
    assert.ok(e.title && e.line && e.prompt.length > 40 && e.minutes > 0, e.id);
    assert.ok(e.starts.length >= 3, `${e.id}: lines to tap, so nobody starts from an empty page`);
  }
  assert.equal(exById('values-spending').tool, 'values');
  assert.equal(exById('enough').tool, 'enough', 'the Enough exercise opens the enough number; it works out nothing of its own');
});

test('the tone: warm, plain, no blame word, no clinical word, no verdict, no em dash', () => {
  const CLINICAL = /\b(diagnos\w*|disorder|patient|therap\w*|symptom\w*|trauma\w*|patholog\w*|dysfunction\w*|treatment|addict\w*)\b/i;
  const VERDICT = /\b(should|wrong|bad with money|irresponsible|lazy|fault|blame|failure|stupid|careless)\b/i;
  const all = [...EX_LIST.flatMap(e => [e.title, e.line, e.prompt, ...e.starts]), ...EX_GROUPS.flatMap(g => [g.title, g.cap]), EX_VOICE.on, EX_VOICE.off];
  for (const s of all) {
    assert.deepEqual(blameIn(s), [], s);
    assert.doesNotMatch(s, CLINICAL, s);
    assert.doesNotMatch(s, VERDICT, s);
    assert.ok(!s.includes(String.fromCharCode(0x2014)), `no em dash: ${s}`);
  }
});

test('a tapped line goes on its own line at the end of the box, once', () => {
  assert.equal(exAddStart('', 'Money is'), 'Money is ');
  assert.equal(exAddStart('Money is calm.', 'People with a lot of money are'), 'Money is calm.\nPeople with a lot of money are ');
  assert.equal(exAddStart('Money is calm.', 'Money is'), 'Money is calm.', 'a line already in the box is not added again');
  assert.equal(exAddStart(null, null), '');
});

test('what is kept: trimmed, cut at the limit, empty keeps nothing, Me only unless sharing is turned on', () => {
  assert.equal(exClean('   '), null);
  assert.equal(exClean(null), null);
  assert.equal(exClean('x'.repeat(EX_MAX + 50)).length, EX_MAX);
  assert.equal(exAnswer('  ', EX_SHARED, 'd'), null, 'empty is not an answer');
  assert.deepEqual(exAnswer(' Dear money, ', undefined, '2026-11-26'), { text: 'Dear money,', at: '2026-11-26', seen: EX_ME_ONLY }, 'Me only by default');
  assert.equal(exAnswer('x', 'Everyone', 'd').seen, EX_ME_ONLY, 'anything but Shared is Me only');
  assert.equal(exAnswer('x', EX_SHARED, 'd').seen, EX_SHARED);
});

test('who reads it: the owner always; someone else only a Shared answer, and only that one is kept otherwise', () => {
  const mine = { text: 'Dear money,', at: '2026-11-26', seen: EX_ME_ONLY }, out = { ...mine, seen: EX_SHARED };
  assert.equal(exFor(mine, true).text, 'Dear money,');
  assert.deepEqual(exFor(mine, false), { kept: true, text: null, hidden: true, at: '2026-11-26', seen: EX_ME_ONLY }, 'a coach sees that something is kept, not the words');
  assert.equal(exFor(out, false).text, 'Dear money,', 'shared on purpose: the coach reads it');
  assert.deepEqual(exFor(null, false), { kept: false, text: null, hidden: false });
  assert.deepEqual(exCount({ 'letter-to-money': mine, enough: { text: '' } }), { done: 1, of: EX_LIST.length });
});

test('privacy in the web app: a Me only answer stays out of every shared copy, a Shared one goes along', () => {
  const s = fresh();
  keepExercise(s, 'letter-to-money', { ...exAnswer('Dear money, I am tired of hiding from you.', EX_ME_ONLY, NOW.toISOString()), own: null }, NOW);
  keepExercise(s, 'post-fi', { ...exAnswer('These days I garden.', EX_SHARED, NOW.toISOString()), own: null }, NOW);
  keepExercise(s, CALM_LETTER.id, { text: CALM_LETTER.starts[0], own: null }, NOW);
  assert.equal(exerciseOf(s.doc, 'letter-to-money').seen, EX_ME_ONLY);
  const out = shareDoc(s.doc, ref);
  assert.deepEqual(Object.keys(out.settings.exercises), ['post-fi'], 'only the answer shared on purpose');
  assert.ok(!JSON.stringify(out).includes('hiding from you'), 'the private words are nowhere in the shared copy, the history included');
  assert.deepEqual(sharedExercises(s.doc.settings.exercises), { 'post-fi': exerciseOf(s.doc, 'post-fi') });
  keepExercise(s, 'letter-to-money', null, NOW);
  assert.equal(exerciseOf(s.doc, 'letter-to-money'), null, 'Clear takes it away');
});

test('the screen: Home › Exercises, reached from About you, the letter and Find; no money on it', () => {
  const home = TABS.find(t => t.id === 'home');
  assert.ok(home.subs.some(s => s.id === 'exercises' && s.hidden), 'a page under Home, not a new sub-tab');
  assert.equal(parseRoute('#/home/exercises').hash, '#/home/exercises');
  assert.ok(VIEWS.some(v => v.route === '#/home/exercises'));
  for (const q of ['money exercises', 'letter to money', 'why journal'])
    assert.ok(search(q).some(r => r.route === '#/home/exercises'), `Find: ${q}`);
  const screens = read('js/screens.js'), ui = read('js/ui/exercises-ui.js'), letter = read('js/ui/exercise-letter-ui.js');
  assert.match(screens, /'home\/exercises': \(app, ctx\) => \(app\.hasClient \? exercisesScreen\(app, ctx\)/);
  assert.match(screens, /exercisesLink\(app\)/, 'About you ends with the way in');
  assert.match(letter, /href: '#\/home\/exercises'/, 'the letter (opened from Recalculating) links to all the exercises');
  assert.match(read('js/ui/recalc-ui.js'), /openCalmLetter\(ctx, e\.currentTarget\)/, 'the Recalculating card still opens the letter');
  assert.match(ui, /calmLetterExercise\(ctx\)/, 'the letter is the first card, the one that exists');
  assert.match(ui, /speakControl\(area\)/, 'voice to text through the one helper');
  assert.doesNotMatch(ui, /money\(|\$\{?\d|toFixed/, 'no number is worked out or shown here');
  assert.match(letter, /if \(!Speech\(\)\) return h\('span\.muted\.small\.ex-voice-off', \{\}, EX_VOICE\.off\)/, 'voice to text only where the browser has it, else a plain note');
  assert.doesNotMatch(ui + letter, /MediaRecorder|getUserMedia|fetch\(/, 'no sound is recorded or sent by SLAM');
});

test('the game reads a fresh copy of the same list', () => {
  const src = read('js/exercises/catalog.js'), copy = read('game/core/exercises.js');
  const hash = createHash('sha256').update(src).digest('hex').slice(0, 16);
  assert.match(copy, new RegExp(`SOURCE-HASH  ${hash}`), 'run node tools/game_exercises_build.mjs, then the game steps');
  assert.match(read('game/index.html'), /core\/exercises\.js\?v=[0-9a-f]+"/);
  assert.match(read('game/index.html'), /features\/exercises\.js\?v=[0-9a-f]+"/);
});
