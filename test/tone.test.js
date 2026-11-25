// The tone rule for the whole app (Eli, Nov 25 2026): "Recalculating", not mistakes. The copy a person reads never
// says mistake, failed, behind or off track about them. The one place that looks back is the opt-in Mistake audit
// (js/ui/audit-ui.js, game/features/audit.js), which this scan leaves out. tools/tone/scan.mjs does the reading:
// string literals of the scripts, the text of the pages, the string values of the data files. A word that is not
// about the person (the formula behind a number, a save that did not go through in admin text) is on the short
// allow-list there, each with its reason. To see what it finds: node tools/tone/scan.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scan, blameIn, literalsOf, textsOfHtml, filesToScan, ALLOWED, AUDIT_FILES } from '../tools/tone/scan.mjs';
import { WHY_CHIPS } from '../js/whynow.js';
import { rcWords, rcRoute, RC_SCRIPTS } from '../js/math/recalc.js';

test('no blame word in the copy of the web app or the game, outside the Mistake audit', () => {
  const hits = scan();
  assert.deepEqual(hits.map(h => `${h.file}:${h.line}: "${h.words.join(', ')}" in: ${h.text.slice(0, 160)}`), [],
    'Say what changed and the next turn instead ("Recalculating"). If the word is not about the person, add it to ALLOWED in tools/tone/scan.mjs with the reason.');
});

test('the scan reads what a person reads: scripts of the app and the game, the pages, the data', () => {
  const files = filesToScan();
  for (const f of ['js/ui/home-ui.js', 'js/ui/recalc-ui.js', 'js/collapse.js', 'game/screens/ui.js', 'game/features/recalc.js', 'game/data/skills.js', 'game/index.html', 'index.html', 'data/library/skills.json'])
    assert.ok(files.includes(f), `${f} is scanned`);
  for (const f of AUDIT_FILES) assert.ok(!files.includes(f), `${f} (the audit) is left out`);
  assert.ok(files.length > 300, `${files.length} files`);
});

test('the guard works: each word is caught in a string, in a template and in a page, and code is not copy', () => {
  for (const s of ['That was a mistake.', 'Your payment failed to keep up', 'You are behind by $40', 'You are 3 months behind', 'The plan is off track', 'You are off-track', 'Two mistakes this month'])
    assert.ok(blameIn(s).length, s);
  const lits = literalsOf('const behind = 3; // you are behind\nconst a = `You are ${behind} months behind`; const k = \'behind\'; f(x.failed, "It failed");');
  const found = lits.filter(l => blameIn(l.text).length).map(l => l.text.trim());
  assert.deepEqual(found, ['months behind', 'It failed'], 'the identifier, the comment and the bare key are skipped; the two sentences are caught');
  assert.equal(textsOfHtml('<p class="behind">You fell behind</p><script>var failed = "ok";</script>').filter(t => blameIn(t.text).length).length, 1);
});

test('the allow-list is short, each entry says why, and each is about a thing, not the person', () => {
  assert.ok(ALLOWED.length <= 10, 'keep the list short');
  for (const [re, why] of ALLOWED) { assert.ok(re instanceof RegExp); assert.ok(String(why).length > 20, String(re)); }
  for (const ok of ['the formula behind it', 'Free money stops being left behind', 'a failed save', 'Back', 'the math behind each one'])
    assert.deepEqual(blameIn(ok), [], ok);
  for (const no of ['leaves you behind', 'you were left behind on the plan by your choices and are behind', 'you failed'])
    assert.ok(blameIn(no).length, no);
});

test('the chips a client taps, the Recalculating card and the phone scripts hold to the rule', () => {
  for (const list of Object.values(WHY_CHIPS)) for (const c of list) assert.doesNotMatch(c, /mistake|failed|behind|off.track/i, c);
  const later = rcRoute({ planAt: '2026-01-05', planMonths: 10, nowAt: '2026-11-25', months: 14 }), none = { ...later, noDate: true, newYm: null };
  const said = [rcWords(later, { what: 'Debt free', hold: 50 }), rcWords(later, { what: 'Debt free' }), rcWords(none, { what: 'Work optional' })].flatMap(w => [w.title, w.line, w.next]);
  said.push(...Object.values(RC_SCRIPTS).flatMap(s => [s.who, s.note, ...s.say]));
  for (const s of said) assert.deepEqual(blameIn(s), [], s);
});
