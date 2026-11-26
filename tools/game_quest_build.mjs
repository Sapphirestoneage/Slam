#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// The math of the game's quest screens is written once, in js/math/quest.js (a module, no imports). SLAM the Game loads
// plain scripts with one global scope, so this tool writes the same code as a plain script: game/core/quest.js. It
// removes the word "export", puts the game's file header on top, and adds QS_PRIORS: the net worth rows of
// data/priors-2026.json (SCF 2025, by age and for all ages), so "Where you rank" reads the same rows as the web app.
// Usage: node tools/game_quest_build.mjs          write the copy
//        node tools/game_quest_build.mjs --check  change nothing; exit 1 when the copy is stale
// Both test suites run the check (test/quest.test.js, game/tests/the-quest.js).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const at = p => new URL(`../${p}`, import.meta.url);
const HEAD = `/* ============================================================================
   SLAM the Game: core/quest.js
   PURPOSE     The math of the quest screens (run Not built, groups 1 to 5, Part 10a): the quest mode
               character sheet, capacity, how this plan fails, hidden costs, where you rank, opponents
               that test your values, the judge's record, ask the game, path packs, graduating and
               your story. The sheet "Your quest" (features/quest.js) uses it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: QS_RULES, QS_SOURCES, QS_RANK_GUESS, QS_OPPONENTS, QS_CHOICES, QS_ASK,
               QS_TOPICS, QS_PACKS, QS_FINISH, QS_PRIORS. Functions: qsMonth, qsScore, qsStats,
               qsCapacity, qsFails, qsInterest, qsCashDrag, qsTimeCost, qsHidden, qsRank, qsCost,
               qsDuel, qsJudge, qsJudgeAdd, qsFromPush, qsAsk, qsLearn, qsPack, qsPackFit, qsGraduate,
               qsStory.
   DEPENDS ON  core/peers.js (PE_RULES, PE_WORDS, peNetWorth: the rank).
   RULES       GENERATED FILE. Do not edit it. The source is js/math/quest.js of the main SLAM app, with
               the net worth rows of data/priors-2026.json. To change a rule or a row, change the source,
               then run: node tools/game_quest_build.mjs. The tests fail when this copy is stale.
               Prettier does not format this file (.prettierignore).
   ========================================================================= */
`;
export function priorRows() {
  const P = JSON.parse(readFileSync(at('data/priors-2026.json'), 'utf8'));
  return { source: P.sources.scf2025, rows: P.rows.filter(r => r.field === 'netWorth').map(r => ({ field: r.field, band: r.band, ages: r.ages, who: r.who, median: r.median, p25: r.p25 ?? null, p75: r.p75 ?? null, table: r.table, year: r.year })) };
}
export function built() {
  const src = readFileSync(at('js/math/quest.js'), 'utf8');
  // the one import (js/math/peers.js) is a global of game/core/peers.js, which index.html loads first
  const body = src.split('\n').filter(l => !l.startsWith('// SPDX-License-Identifier') && !/^import \{[^}]*\} from '\.\/peers\.js';/.test(l)).join('\n').replace(/^export /gm, '');
  if (/^\s*import /m.test(body) || /\bexport\b/.test(body.replace(/\/\/.*$/gm, ''))) throw new Error('js/math/quest.js may import only from ./peers.js, and export only at the start of a line.');
  return `${HEAD}${body}// The net worth rows of data/priors-2026.json (SCF 2025), for Where you rank.
const QS_PRIORS = ${JSON.stringify(priorRows())};
`;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const u = at('game/core/quest.js'), text = built();
  if (process.argv.includes('--check')) {
    let old = null;
    try { old = readFileSync(u, 'utf8'); } catch { /* missing counts as stale */ }
    if (old !== text) { console.log('game/core/quest.js is stale. Run: node tools/game_quest_build.mjs'); process.exit(1); }
    console.log('game/core/quest.js matches js/math/quest.js and data/priors-2026.json.');
  } else { writeFileSync(u, text); console.log('game/core/quest.js written.'); }
}
