#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Makes game/core/frameworks.js from js/math/frameworks.js (Eli's frameworks and the canon, run "Not built, groups 1
// to 5", Part 4), so the web app and the game work out each number with one function. The game has classic scripts
// and no modules: this tool takes off the imports (the game has spendDownPayment and TP_RULES as globals, from
// core/withdraw.js and core/trip.js) and the word `export`, adds the FOO order, the step headlines and the unlearn
// list (data/library/unlearn.json) as constants for the Advice translator, and the game's file header.
// Usage: node tools/game_frameworks_build.mjs           write the copy
//        node tools/game_frameworks_build.mjs --check   change nothing; exit 1 when the copy is stale
// Run the game steps after it (prettier, tools/game_stamp.cjs, tools/game_codemap.py). Both suites run the check.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ORDER, STEP_NAMES } from '../js/registry/foo.js';

const from = new URL('../js/math/frameworks.js', import.meta.url), to = new URL('../game/core/frameworks.js', import.meta.url);
const unlearnFile = new URL('../data/library/unlearn.json', import.meta.url);
const src = readFileSync(from, 'utf8'), unlearn = JSON.parse(readFileSync(unlearnFile, 'utf8'));
const entries = unlearn.entries.map(e => ({ id: e.id, advice: e.advice, from: e.from ?? null, rightAt: e.rightAt, rightWords: e.rightWords, showAt: e.showAt, line: e.line }));
const heads = Object.fromEntries(ORDER.map(id => [id, STEP_NAMES[id].headline]));
const hash = createHash('sha256').update(src).update(JSON.stringify(entries)).update(JSON.stringify(heads)).digest('hex').slice(0, 16);
const body = src.replace(/^\/\/ SPDX-License-Identifier:.*\n/, '').replace(/^import .*\n/gm, '').replace(/^export /gm, '');
const names = [...src.matchAll(/^export (?:function|const) (\w+)/gm)].map(m => m[1]);
const data = `
// ---------- data for the Advice translator (from js/registry/foo.js and data/library/unlearn.json) ----------
const FW_ORDER = ${JSON.stringify(ORDER)};
const FW_STEP_HEAD = ${JSON.stringify(heads)};
const FW_UNLEARN = ${JSON.stringify(entries)};
`;
const head = `/* ============================================================================
   SLAM the Game: core/frameworks.js
   PURPOSE     The math of Eli's frameworks and the canon: the SWAN number, the Second Mouse checklist,
               the Trust Framework, the Advice translator, the Baby Steps, the wealth stages, the time
               buckets and the designed week, the net worth peak, 0% tax in early retirement, the steps
               of Your Money or Your Life and the nine as one path, the next dollar, the quick wins.
   INPUT       Plain numbers from the caller. It reads no profile and no screen.
   OUTPUT      ${names.length + 3} functions and constants: ${names.concat(['FW_ORDER', 'FW_STEP_HEAD', 'FW_UNLEARN']).join(', ').replace(/(.{1,84})(, |$)/g, '$1$2\n               ').trimEnd()}
   DEPENDS ON  core/withdraw.js (spendDownPayment), core/trip.js (TP_RULES).
   RULES       GENERATED FILE. Do not edit it. It is a copy of js/math/frameworks.js of the main app.
               tools/game_frameworks_build.mjs makes it. Change the source, then run the tool.
               Prettier does not format this file (.prettierignore).
   SOURCE-HASH  ${hash}
   ========================================================================= */
`;
const out = head + body + data;
if (process.argv.includes('--check')) {
  let now = '';
  try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
  if (now !== out) { console.error('game/core/frameworks.js is stale: run node tools/game_frameworks_build.mjs'); process.exit(1); }
  console.log('game/core/frameworks.js is current.');
} else {
  writeFileSync(to, out);
  console.log(`game/core/frameworks.js written from js/math/frameworks.js (${names.length} names, hash ${hash}).`);
}
