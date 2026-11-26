#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Makes game/core/safetynet.js from js/math/safetynet.js and data/reference-2026.json, so the web app and the game
// work out the safety nets (medical leave, a move, a breakup, a new baby, the levels, the rule ends) with one function
// each. The game has classic scripts and no modules: this tool takes the word `export` off each declaration, adds the
// game's file header, and writes the dated leave rules (limits.leave.NY) and the words of each change
// (transitions.templates[].nets) as NT_REF. Run it after each change of either file, then the game steps.
// Usage: node tools/game_safety_build.mjs          write the copy
//        node tools/game_safety_build.mjs --check  change nothing; exit 1 when the copy is stale
// test/safetynet.test.js and game/tests/safety-nets.js run the check.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = new URL('../js/math/safetynet.js', import.meta.url), data = new URL('../data/reference-2026.json', import.meta.url), to = new URL('../game/core/safetynet.js', import.meta.url);
export function built() {
  const src = readFileSync(from, 'utf8'), ref = JSON.parse(readFileSync(data, 'utf8'));
  const body = src.replace(/^\/\/ SPDX-License-Identifier:.*\n/, '').replace(/^export /gm, '');
  if (/^\s*import /m.test(body) || /\bexport\b/.test(body.replace(/\/\/.*$/gm, ''))) throw new Error('js/math/safetynet.js must stay free of imports, and export only at the start of a line.');
  const nets = Object.fromEntries((ref.transitions?.templates || []).filter(t => t.nets).map(t => [t.id, t.nets]));
  const NT = { leave: ref.limits.leave.NY, nets };
  const head = `/* ============================================================================
   SLAM the Game: core/safetynet.js
   PURPOSE     Safety nets: medical leave, a move, a breakup and a new baby as money flows over months, the
               run of the cash month by month, the tripwires, Plan B, the months at each level of spending,
               the days, and the rules with an end date. features/nets.js uses it.
   INPUT       Numbers only. No profile, no screen. NT_REF: the dated leave rules and the words.
   OUTPUT      Constants: NT_REF, NT_KINDS, NT_TAPS, NT_WEEK, NT_DAYS_A_MONTH. Functions: ntPicks,
               ntLeaveWeekly, ntEvent, ntFlowAt, ntRun, ntTrips, ntPlanB, ntDegrade, ntDays, ntRuleEnds.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/safetynet.js of the main SLAM app
               and data/reference-2026.json. To change a rule, change the source, then run:
               node tools/game_safety_build.mjs. The tests fail when this copy is stale. Prettier does
               not format this file (.prettierignore).
   ========================================================================= */
/* The dated leave rules (limits.leave.NY) and the words of each change (transitions.templates[].nets). */
const NT_REF = ${JSON.stringify(NT)};
`;
  return head + body;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = built();
  if (process.argv.includes('--check')) {
    let now = ''; try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
    if (now !== text) { console.log('game/core/safetynet.js is stale. Run: node tools/game_safety_build.mjs'); process.exit(1); }
    console.log('game/core/safetynet.js matches js/math/safetynet.js.');
  } else { writeFileSync(to, text); console.log('game/core/safetynet.js written.'); }
}
