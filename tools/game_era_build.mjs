#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Makes game/era/gamecopy.js and game/era/gamelook.css for the 60-second demo "Find your era" (game/era/, run CC-1, item 7, Nov 27 2026).
// The demo is one small page outside the game. It asks the range questions of the game's own entry (What it is /
// What it could be) and shows the labels with the game's own money words. Those live in files that cannot load
// alone (features/couldbe.js, features/look.js, screens/ui.js). This tool copies the named declarations, word for
// word, so the demo and the game ask with one set of ranges and one formatter. Nothing is rewritten.
// Usage: node tools/game_era_build.mjs           write the copy
//        node tools/game_era_build.mjs --check   change nothing; exit 1 when the copy is stale
// test/era-demo.test.js and game/tests/find-your-era-demo.js fail when the copy is old.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../game/', import.meta.url), to = new URL('era/gamecopy.js', root);
// [file, the names to copy, in the order they are written]
const PARTS = [
  ['screens/ui.js', ['roughOn', 'money', 'esc']],
  ['features/look.js', ['lkK']],
  ['features/couldbe.js', ['CB_RNG', 'CB_QS', 'cbRng', 'cbRows', 'cbLab']],
];

// One top-level declaration: its first line starts at column 0 with "const NAME =" or "function NAME(". It goes on
// while a line is indented, empty, or starts with a closing bracket (Prettier puts each top-level statement so).
function take(src, name, file) {
  const lines = src.split('\n'), at = lines.findIndex(l => new RegExp(`^(?:const ${name} =|function ${name}\\()`).test(l));
  if (at < 0) throw new Error(`${file} has no top-level declaration of ${name}: change PARTS in tools/game_era_build.mjs`);
  let end = at + 1;
  while (end < lines.length && (/^\s/.test(lines[end]) || lines[end] === '' || /^[}\])]/.test(lines[end]))) end++;
  while (lines[end - 1] === '') end--;
  // the comment lines directly above it belong to it
  let from = at;
  while (from > 0 && /^(\/\*| {3}|\s*\*\/)/.test(lines[from - 1]) && !/^\s*$/.test(lines[from - 1])) {
    from--;
    if (/^\/\*/.test(lines[from])) break;
  }
  if (!/^\/\*/.test(lines[from])) from = at;
  return lines.slice(from, end).join('\n');
}

let body = '', all = [];
for (const [file, names] of PARTS) {
  const src = readFileSync(new URL(file, root), 'utf8');
  body += `\n/* ---------- from ${file} ---------- */\n` + names.map(n => take(src, n, file)).join('\n') + '\n';
  all = all.concat(names);
}
const hash = createHash('sha256').update(body).digest('hex').slice(0, 16);
const head = `/* ============================================================================
   SLAM the Game: era/gamecopy.js
   PURPOSE     The parts of the game that the demo "Find your era" (era/index.html) shows and that cannot
               load alone: the range chips of the entry and their labels, and the money words.
   INPUT       Nothing.
   OUTPUT      ${all.join(', ')}, and G (empty: the demo has no saved game).
   DEPENDS ON  core/engine.js (SPEND_K, SPLIT).
   RULES       GENERATED FILE. Do not edit it. Each part is a word-for-word copy of a declaration in
               ${PARTS.map(p => p[0]).join(', ')}.
               tools/game_era_build.mjs makes it. Change the source, then run the tool.
               The game does not load this file. Prettier does not format it (.prettierignore).
   SOURCE-HASH  ${hash}
   ========================================================================= */
/* The demo has no saved game. The money words read G for the switch "Rough numbers". */
const G = null;
`;
const out = head + body;

// THE LOOK (run 16, A5, Nov 27 2026): the demo wears the look of the game: its colors (the :root tokens and the
// default palette, midnight), its font, its buttons, chips, cards and its pulse. The game keeps its styles inside
// game/index.html, so the rules are copied from there, line for line, into game/era/gamelook.css. The page of the
// demo adds only its own layout. Each entry is the start of one line of the game's styles.
const LOOK = [
  ':root{', '*{box-sizing:border-box}', 'body{background:var(--ink)', 'h1,h2,h3{font-family:var(--display)',
  '.muted{color:var(--muted)}', '.eyebrow{', '.glow{', '.row{display:flex', '.stack{display:flex', '.card{background',
  '.tile{background', 'button{font:inherit', 'button.primary{', 'button.ghost{', 'button.slim{', 'button.wide{',
  'button:focus-visible,', 'button.i{', '.chips{', '.chip{', '.chip.on{', '.pill{display:inline-block',
  ' .pulse,button.go{', ':root{--warn', 'body{font-family:"Space Grotesk"', 'h1,h2,h3,.tabtitle{font-family:"Space Grotesk"',
  '@media (prefers-reduced-motion:reduce){', 'body[data-color="midnight"]{', '@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(var(--glow),0),0 0 6px',
  '.dklabel{',
];
const page = readFileSync(new URL('index.html', root), 'utf8').split('\n');
const FONT = page.find(l => l.startsWith('<link href="https://fonts.googleapis.com/css2?family='));
if (!FONT) throw new Error('game/index.html has no font link: change tools/game_era_build.mjs');
const looks = LOOK.map(pre => {
  const at = page.findIndex(l => l.startsWith(pre));
  if (at < 0) throw new Error(`game/index.html has no style line that starts with ${pre}: change LOOK in tools/game_era_build.mjs`);
  let end = at + 1;
  // the first :root block is on several lines: it ends at the line "}"
  if (pre === ':root{' && page[at].trim() === ':root{') { while (page[end] !== '}') end++; end++; }
  return page.slice(at, end).join('\n');
});
const cssTo = new URL('era/gamelook.css', root);
const css = `/* SLAM the Game: era/gamelook.css
   GENERATED FILE. Do not edit it. The look of the game for the demo "Find your era" (era/index.html): each rule
   is a line-for-line copy of a style line of game/index.html. tools/game_era_build.mjs makes it. Change the
   style in game/index.html, then run the tool. The game does not load this file.
   FONT-LINK ${FONT.trim()} */
` + looks.join('\n') + '\n';

if (process.argv.includes('--check')) {
  let now = '';
  try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
  if (now !== out) { console.error('game/era/gamecopy.js is stale: run node tools/game_era_build.mjs'); process.exit(1); }
  let nowCss = '';
  try { nowCss = readFileSync(cssTo, 'utf8'); } catch { nowCss = ''; }
  if (nowCss !== css) { console.error('game/era/gamelook.css is stale: run node tools/game_era_build.mjs'); process.exit(1); }
  const demo = readFileSync(new URL('era/index.html', root), 'utf8');
  if (!demo.includes(FONT.trim())) { console.error('game/era/index.html does not load the font of the game: copy the font link of game/index.html'); process.exit(1); }
  console.log('game/era/gamecopy.js and game/era/gamelook.css are current.');
} else {
  writeFileSync(cssTo, css);
  console.log(`game/era/gamelook.css written (${LOOK.length} style lines of the game).`);
  writeFileSync(to, out);
  console.log(`game/era/gamecopy.js written (${all.length} names, hash ${hash}).`);
}
