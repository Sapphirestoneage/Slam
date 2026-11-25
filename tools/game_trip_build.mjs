#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Travel is written once, in js/math/trip.js (a module), on the household split engine js/math/household.js. SLAM
// the Game loads plain scripts with one global scope, so this tool writes the same code as one plain script:
// game/core/trip.js, the split engine first, then the travel engine. It only removes the words "export", the one
// import (of the split engine, which comes first in the copy) and the license lines, and puts the game's file header
// on top. Nothing else changes, so the copies cannot drift.
// Usage: node tools/game_trip_build.mjs          write the copy
//        node tools/game_trip_build.mjs --check  change nothing; exit 1 when the copy is stale
// Both test suites run the check (test/trip.test.js, game/tests/trips-and-the-journey.js).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const split = new URL('../js/math/household.js', import.meta.url), from = new URL('../js/math/trip.js', import.meta.url), to = new URL('../game/core/trip.js', import.meta.url);
const HEAD = `/* ============================================================================
   SLAM the Game: core/trip.js
   PURPOSE     Travel: a trip line by line (flights, lodging, food a day, the card's fee on other
               currencies, visa fees, travel insurance), points (cash or redeem), a group trip split by
               share or by item in one currency, and the FIRE journey map (digging out, the first $1k,
               debt free, $100k, Coast, FI) with how a trip moves you on it. The screen "Trips and the
               journey" (features/trip.js) uses it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      The split engine of the web app (js/math/household.js): SPLIT_HOWS, SPLIT_HOW_WORDS,
               amongList, splitTyped, generalRow, amongOf, howOf, rowShare, splitWords.
               Constants: TP_RULES, TP_RULES_SOURCE, TP_LINES, TP_FX_CAN, TP_FX_START, TP_OPTS,
               TP_TAPS_NOTE, TP_CURRENCIES, TP_SOURCES, TP_STAGES.
               Functions: tpMoney, tpCost, tpCostWords, tpCostMath, tpLevel, tpPoints, tpPointsWords,
               tpPointsMath, tpSplit, tpSplitWords, tpSplitMath, tpJourney, tpDays, tpDayWords,
               tpJourneyWords, tpJourneyMath.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The sources are js/math/household.js and js/math/trip.js
               of the main SLAM app, so trip.html of the web app and the game have one copy of each rule
               and one split engine. To change a rule, change the source, then run:
               node tools/game_trip_build.mjs. The tests fail when this copy is stale. Prettier does not
               format this file (.prettierignore).
   ========================================================================= */
`;
const plain = (src, name, allow) => {
  const body = src.split('\n').filter(l => !l.startsWith('// SPDX-License-Identifier') && !(allow && l.trim() === allow)).join('\n').replace(/^export /gm, '');
  if (/^\s*import /m.test(body) || /\bexport\b/.test(body.replace(/\/\/.*$/gm, ''))) throw new Error(`${name} must import only the split engine, and export only at the start of a line.`);
  return body;
};
export function built() {
  return HEAD + '/* ---------- the split engine: js/math/household.js ---------- */\n' + plain(readFileSync(split, 'utf8'), 'js/math/household.js') +
    '\n/* ---------- the travel engine: js/math/trip.js ---------- */\n' + plain(readFileSync(from, 'utf8'), 'js/math/trip.js', "import { rowShare } from './household.js';");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = built();
  if (process.argv.includes('--check')) {
    let now = ''; try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
    if (now !== text) { console.log('game/core/trip.js is stale. Run: node tools/game_trip_build.mjs'); process.exit(1); }
    console.log('game/core/trip.js matches js/math/household.js and js/math/trip.js.');
  } else { writeFileSync(to, text); console.log('game/core/trip.js written.'); }
}
