// What's new in the web app: the same list as the game (game/data/patchnotes.js), the newest first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { notesSorted, notesDay, loadNotes } from '../js/ui/whatsnew-ui.js';

test('the web app reads the one list of the game, the newest first', async () => {
  const list = await loadNotes();
  assert.ok(list.length >= 8, `${list.length} entries`);
  assert.equal((await loadNotes()).length, list.length);
  for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].d >= list[i].d, `${list[i - 1].d} is before ${list[i].d}`);
  assert.equal(list[0], globalThis.PATCH_NOTES.at(-1), 'the last entry of the file is shown first');
});

test('what landed on Nov 25 2026 is in the list: the launch run and the two runs next to it', async () => {
  const titles = (await loadNotes()).map(e => e.t).join(' | ');
  for (const k of ['front door', 'Founding Testers', 'Compare the ways', 'Export for Excel or Google Sheets', 'Privacy']) assert.ok(titles.includes(k), k);
  const words = JSON.stringify(globalThis.PATCH_NOTES);
  assert.ok(!/\b(mistake|failed|behind|off track|bug|broken)\b/i.test(words), 'no blame word');
});

test('the order and the date in plain words', () => {
  const a = { d: '2026-11-23', t: 'A' }, b = { d: '2026-11-25', t: 'B' }, c = { d: '2026-11-25', t: 'C' };
  assert.deepEqual(notesSorted([a, b, c]).map(e => e.t), ['C', 'B', 'A']);
  assert.deepEqual(notesSorted([null, { t: 'no date' }, a]).map(e => e.t), ['A']);
  assert.equal(notesDay('2026-11-25'), 'Nov 25, 2026');
  assert.equal(notesDay('2026-01-05'), 'Jan 5, 2026');
  assert.equal(notesDay('soon'), '');
});

test("the More menu has What's new", () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /item\("What's new", 'star', \(\) => whatsNew\(anchor\)\)/);
});
