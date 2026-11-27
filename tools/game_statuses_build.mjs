#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Makes game/core/statuses.js from js/math/statuses.js (the FIRE statuses, run FIRE statuses and the life timeline,
// Nov 27 2026, Part 1), so the web app and the game read one list of statuses. The game has classic scripts and no
// modules: this tool takes the word `export` off each declaration, adds the draft option words of
// data/library/status-options.json as ST_OPTIONS (the one file both apps read), and adds the game's file header.
// Usage: node tools/game_statuses_build.mjs           write the copy
//        node tools/game_statuses_build.mjs --check   change nothing; exit 1 when the copy is stale
// Run the game steps after it (tools/game_stamp.cjs, tools/game_codemap.py). test/destinations.test.js and
// game/tests/fire-statuses.js fail when the copy is old.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const from = new URL('../js/math/statuses.js', import.meta.url), to = new URL('../game/core/statuses.js', import.meta.url);
const src = readFileSync(from, 'utf8'), options = JSON.parse(readFileSync(new URL('../data/library/status-options.json', import.meta.url), 'utf8'));
const hash = createHash('sha256').update(src).update(JSON.stringify(options)).digest('hex').slice(0, 16);
const body = src.replace(/^\/\/ SPDX-License-Identifier:.*\n/, '').replace(/^export /gm, '');
const names = [...src.matchAll(/^export (?:function|const) (\w+)/gm)].map(m => m[1]);
const head = `/* ============================================================================
   SLAM the Game: core/statuses.js
   PURPOSE     The FIRE statuses: Coast, Lean, Barista, FI, Chubby and Fat as markers on the one path.
               The list with what is reached and each date, the markers in date order, the markers
               between the steps of a timeline, the one-time card of a status that was just reached,
               the quiet Recalculating line when the balance falls back under one.
   INPUT       Plain numbers and dates from the caller. It reads no profile and no screen.
   OUTPUT      ${names.length + 1} functions and constants: ST_OPTIONS, ${names.join(', ').replace(/(.{1,84})(, |$)/g, '$1$2\n               ').trimEnd()}
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. It is a copy of js/math/statuses.js of the main app, and
               ST_OPTIONS is data/library/status-options.json (a draft for Eli to edit).
               tools/game_statuses_build.mjs makes it. Change the source, then run the tool.
               Prettier does not format this file (.prettierignore).
   SOURCE-HASH  ${hash}
   ========================================================================= */
/* The draft words of each status card (data/library/status-options.json): what changed, and the options it opens. */
const ST_OPTIONS = ${JSON.stringify(options)};
`;
const out = head + body;
if (process.argv.includes('--check')) {
  let now = '';
  try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
  if (now !== out) { console.error('game/core/statuses.js is stale: run node tools/game_statuses_build.mjs'); process.exit(1); }
  console.log('game/core/statuses.js is current.');
} else {
  writeFileSync(to, out);
  console.log(`game/core/statuses.js written from js/math/statuses.js (${names.length} names, hash ${hash}).`);
}
