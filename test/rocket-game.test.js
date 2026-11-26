// SPDX-License-Identifier: AGPL-3.0-only
// Run Finish everything partly built, Part 18: the game reads Rocket Money's export with the same columns and the same
// category names as the web app (data/reference-2026.json importFormats and importCategories, dated 2026-11-06). One
// source: the game's lists (game/features/import.js) must agree with the reference file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url), 'utf8'));
const src = readFileSync(new URL('../game/features/import.js', import.meta.url), 'utf8');
const grab = name => {
  const m = new RegExp(`const ${name} = ([\\[{][\\s\\S]*?[\\]}]);\\n`).exec(src);
  assert.ok(m, `${name} is in game/features/import.js`);
  return Function(`return ${m[1]}`)();
};

test('the game knows the Rocket Money columns of the reference file', () => {
  const f = ref.importFormats.formats.find(x => x.id === 'rocket');
  assert.deepEqual(grab('IM_ROCKET_COLS'), f.columns);
  assert.deepEqual(grab('IM_ROCKET_DETECT'), f.detect);
  assert.ok(ref.importFormats.date && f.sources.length);
});

test('every Rocket Money category of the reference file has a place in the game, and no other name', () => {
  const game = grab('IM_ROCKET_CATS'), web = ref.importCategories.rocket;
  assert.deepEqual(Object.keys(game).sort(), Object.keys(web).sort());
  const lines = ['Home', 'Food', 'Getting around', 'Bills and subscriptions', 'Fun and everything else', '_move', '_debt', null];
  for (const [k, v] of Object.entries(game)) assert.ok(lines.includes(v), `${k} goes to a line of the game`);
  // The specials agree with the web app: a transfer or a card payment never counts as spending.
  for (const [k, v] of Object.entries(web)) if (['@transfer', '@debt'].includes(v)) assert.ok(['_move', '_debt'].includes(game[k]), k);
});
