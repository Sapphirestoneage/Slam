#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Makes game/core/estate.js from js/math/estate.js (M8E), the one function spousalExcess of js/math/socialsecurity.js,
// the estate row of data/reference-2026.json and data/sources/estate-2026.json, so the web app (kin.html, heirs.html,
// married.html) and the game's Estate and marriage work out every number with one function each, on one dated list of
// rules. The game has classic scripts and no modules: this tool takes the word `export` off each declaration, adds the
// game's file header, and writes the data as ES_RULES, ES_SS and ES_REF. Run it after each change of any of these
// files, then the game steps (tools/game_stamp.cjs, tools/game_codemap.py).
// Usage: node tools/game_estate_build.mjs          write the copy
//        node tools/game_estate_build.mjs --check  change nothing; exit 1 when the copy is stale
// test/estate.test.js and game/tests/estate-and-marriage.js run the check.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const at = f => new URL(`../${f}`, import.meta.url);
const to = at('game/core/estate.js');
export function built() {
  const src = readFileSync(at('js/math/estate.js'), 'utf8'), ssSrc = readFileSync(at('js/math/socialsecurity.js'), 'utf8');
  const ref = JSON.parse(readFileSync(at('data/reference-2026.json'), 'utf8')), facts = JSON.parse(readFileSync(at('data/sources/estate-2026.json'), 'utf8'));
  const m = ssSrc.match(/^export function spousalExcess\([^)]*\) \{\n[\s\S]*?^\}\n/m);
  if (!m) throw new Error('js/math/socialsecurity.js: spousalExcess not found.');
  const body = src.replace(/^\/\/ SPDX-License-Identifier:.*\n/, '').replace(/^export /gm, '');
  if (/^\s*import /m.test(body)) throw new Error('js/math/estate.js must stay free of imports.');
  const ES_SS = { spousalShare: ref.socialSecurity.spousalShare };
  const hash = createHash('sha256').update(src + m[0] + JSON.stringify(ref.estate) + JSON.stringify(ES_SS) + JSON.stringify(facts)).digest('hex').slice(0, 16);
  const names = [...src.matchAll(/^export (?:function|const) (\w+)/gm)].map(x => x[1]);
  const head = `/* ============================================================================
   SLAM the Game: core/estate.js
   PURPOSE     The math and the rules of Estate and marriage (run Finish everything partly built, Part
               11): who gets what you leave, the step-up in basis, the 10 years of an inherited account,
               the federal and New York estate lines, and married or partners (federal tax, partner
               cover, the Social Security spousal top-up and survivor benefit).
   INPUT       Plain numbers and lists from the caller. It reads no profile and no screen.
   OUTPUT      ES_RULES (data/reference-2026.json estate), ES_SS, ES_REF (data/sources/estate-2026.json),
               spousalExcess (js/math/socialsecurity.js), ${names.join(', ').replace(/(.{1,80})(, |$)/g, '$1$2\n               ').trimEnd()}
   DEPENDS ON  Nothing. esTenYear and esCompare take the tax engine from the caller (features/retire.js
               retireTax).
   RULES       GENERATED FILE. Do not edit it. tools/game_estate_build.mjs makes it from the main app.
               Change the source, then run the tool. Prettier does not format this file (.prettierignore).
   SOURCE-HASH  ${hash}
   ========================================================================= */
/* The rules, each with its source on the assumptions list of the main app (js/registry/assumptions.js). */
const ES_RULES = ${JSON.stringify(ref.estate)};
const ES_SS = ${JSON.stringify(ES_SS)};
/* The dated words and sources (data/sources/estate-2026.json). */
const ES_REF = ${JSON.stringify(facts)};
/* ---------- js/math/socialsecurity.js: spousalExcess ---------- */
${m[0].replace(/^export /, '')}/* ---------- js/math/estate.js ---------- */
`;
  return head + body;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = built();
  if (process.argv.includes('--check')) {
    let now = ''; try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
    if (now !== text) { console.log('game/core/estate.js is stale. Run: node tools/game_estate_build.mjs'); process.exit(1); }
    console.log('game/core/estate.js matches its sources.');
  } else { writeFileSync(to, text); console.log('game/core/estate.js written.'); }
}
