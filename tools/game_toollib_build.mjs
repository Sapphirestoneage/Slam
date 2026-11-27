#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Makes game/data/toollib.js: the standalone tool pages of the web app (the pages at the top of the repository) as one
// list for the game's menu group "Tool library" (Batch B, phase 5, Nov 27 2026). The list is read, not typed: the
// groups and the names are those of the web app's own front door (js/solo/hub.js: "More to explore" and its folds),
// and the path of seven pages is SOLO of js/solo.js. A page that the front door does not name gets its place in
// EXTRA below, or a reason in SKIP. The tool stops when a page at the top of the repository has neither.
// Usage: node tools/game_toollib_build.mjs           write the list
//        node tools/game_toollib_build.mjs --check   change nothing; exit 1 when the list is stale
//        node tools/game_toollib_build.mjs --held    print the pages held out of the game, each with the reason
// Run the game steps after it (tools/game_stamp.cjs, tools/game_codemap.py). game/tests/first-week.js fails when
// the list is old or a page is missing.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url), to = new URL('game/data/toollib.js', root);
const hub = readFileSync(new URL('js/solo/hub.js', root), 'utf8'), soloSrc = readFileSync(new URL('js/solo.js', root), 'utf8');
const pages = readdirSync(root).filter(f => f.endsWith('.html')).sort();

// Pages that are not a tool for a player, each with its reason.
const SKIP = {
  'index.html': 'the web app itself, not one tool',
  'start.html': 'the whole plan of the web app: a second home for the same numbers the game keeps',
  'pro.html': 'for coaches and planners; a player never sees a coach feature',
  'staples.html': 'a page of example numbers for the owner, not a tool',
};
// Add-on pages (Eli, Nov 27 2026): a fold of the front door that is an add-on is off for standard players, like the
// other add-ons. Its pages are held out of the game: not in the list, not in the menu, not in Find a tool, and their
// names are not in the game's data file. --held prints them for the test. Excluded here, not yet switchable: the
// add-on switch of the game needs a row in the database. A page that shows an add-on fold to every visitor is held too.
const HELD_FOLDS = ['own'];
const HELD_WHY = 'add-on: off for standard players';
const HELD_DOORS = { 'one.html': 'the front door of the web app: it shows an add-on fold to every visitor' };
// Pages the front door does not name. The names are the h1 of each page (js/solo/estate.js).
const EXTRA = [
  ['one.html', 'Every tool on one page', 'path'],
  ['heirs.html', 'What would my people receive?', 'estate'],
  ['married.html', 'Married or partners?', 'estate'],
];
// The folds of the front door, in its order, with the id and the icon of each group in the game.
const GROUPS = [
  ['path', 'The path, one thing at a time', null],
  ['explore', 'Bigger tools', 'More to explore'],
  ['small', 'Small calculators', 'Eight small calculators'],
  ['quick', 'Quick calculators', 'Nineteen quick calculators'],
  ['frameworks', 'Frameworks', 'Five frameworks'],
  ['gig', 'Working for yourself', 'Working for yourself'],
  ['own', 'LGBTQ+ money tools, private', 'LGBTQ+ money tools, private'],
  ['family', 'Family money', 'Family money'],
  ['estate', 'Estate and marriage', null],
  ['hard', 'Hard moments', 'Hard moments'],
];

const rows = [], seen = new Set();
const held = {}, heldNames = {};
const add = (page, name, group) => {
  if (SKIP[page] || seen.has(page)) return;
  seen.add(page);
  if (HELD_DOORS[page]) { held[page] = HELD_DOORS[page]; heldNames[page] = name; return; }
  if (HELD_FOLDS.includes(group)) { held[page] = HELD_WHY; heldNames[page] = name; return; }
  rows.push([page, name, group]);
};
// The path: SOLO of js/solo.js (each row: page and title). The last one is the whole plan (start.html), skipped above.
for (const m of soloSrc.slice(soloSrc.indexOf('export const SOLO = ['), soloSrc.indexOf('export const soloOf')).matchAll(/page: '([a-z0-9]+\.html)', title: '((?:[^'\\]|\\.)*)'/g)) add(m[1], m[2].replace(/\\'/g, "'"), 'path');
// The front door: each heading or fold, then its links.
const re = /h\('summary', \{\}, '([^']*)'\)|h\('h2', \{ style: \{ marginTop: 0 \} \}, '(More to explore)'\)|href: (?:packed \? `[a-z0-9]+\.html#\/d\/\$\{packed\}` : )?'([a-z0-9]+\.html)' \}, '((?:[^'\\]|\\.)*)'\)/g;
let fold = null;
for (const m of hub.matchAll(re)) {
  if (m[1] || m[2]) { fold = GROUPS.find(g => g[2] === (m[1] || m[2])); if (!fold) { console.error(`game_toollib_build: the front door has a fold with no group here: "${m[1] || m[2]}"`); process.exit(1); } continue; }
  if (fold) add(m[3], m[4].replace(/\\'/g, "'"), fold[0]);
}
for (const e of EXTRA) add(...e);

if (process.argv.includes('--held')) { console.log(JSON.stringify({ why: held, names: heldNames })); process.exit(0); }
const lost = pages.filter(p => !seen.has(p) && !SKIP[p]), gone = rows.filter(r => !pages.includes(r[0]));
if (lost.length || gone.length) {
  if (lost.length) console.error(`game_toollib_build: no place and no reason for: ${lost.join(', ')} (add it to the front door, to EXTRA or to SKIP)`);
  if (gone.length) console.error(`game_toollib_build: named but not at the top of the repository: ${gone.map(r => r[0]).join(', ')}`);
  process.exit(1);
}
const groups = GROUPS.map(g => [g[0], g[1]]).filter(g => rows.some(r => r[2] === g[0]));
const hash = createHash('sha256').update(JSON.stringify([groups, rows, SKIP, held])).digest('hex').slice(0, 16);
const out = `/* ============================================================================
   SLAM the Game: data/toollib.js
   PURPOSE     Data only. The standalone tool pages of the web app (the pages at the top of the
               repository), for the menu group "Tool library" (Batch B, phase 5): the address of each
               page, its name, and its group. No logic.
   INPUT       Nothing.
   OUTPUT      Constants: TOOL_LIB_GROUPS (id, name), TOOL_LIB (page, name, group id), TOOL_LIB_SKIP (the
               pages that are not a tool for a player, each with the reason), TOOL_LIB_HELD (how many
               pages are held out because they belong to an add-on: a count, no names).
   DEPENDS ON  Nothing. features/firstweek.js draws the group.
   RULES       GENERATED FILE. Do not edit it. The groups and names are those of the web app's front door
               (js/solo/hub.js) and of SOLO in js/solo.js. tools/game_toollib_build.mjs makes it. Add a
               page to the front door, then run the tool. game/tests/first-week.js fails when a page at
               the top of the repository is in neither list.
   SOURCE-HASH  ${hash}
   ========================================================================= */
const TOOL_LIB_GROUPS = ${JSON.stringify(groups)};
const TOOL_LIB = [
${rows.map(r => '  ' + JSON.stringify(r) + ',').join('\n')}
];
const TOOL_LIB_SKIP = ${JSON.stringify(SKIP)};
const TOOL_LIB_HELD = ${Object.keys(held).length};
`;
if (process.argv.includes('--check')) {
  let now = '';
  try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
  if (now !== out) { console.error('game/data/toollib.js is stale. Run: node tools/game_toollib_build.mjs'); process.exit(1); }
  console.log(`game/data/toollib.js is up to date (${rows.length} pages in ${groups.length} groups).`);
} else {
  writeFileSync(to, out);
  console.log(`Wrote game/data/toollib.js: ${rows.length} pages in ${groups.length} groups, ${Object.keys(SKIP).length} skipped with a reason.`);
}
