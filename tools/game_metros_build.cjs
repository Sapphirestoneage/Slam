/* ============================================================================
   tools/game_metros_build.cjs
   PURPOSE     Make game/data/metros.js from game/presets/metros.json. The game uses classic scripts,
               so the browser loads the .js file. The .json file is the one to change.
   USAGE       node tools/game_metros_build.cjs
   ========================================================================= */
const fs = require("fs"),
  path = require("path"),
  src = path.resolve(__dirname, "../game/presets/metros.json"),
  out = path.resolve(__dirname, "../game/data/metros.js"),
  j = JSON.parse(fs.readFileSync(src, "utf8"));
fs.writeFileSync(
  out,
  `/* ============================================================================
   SLAM the Game: data/metros.js
   PURPOSE     Data only. Rough housing numbers for ${j.metros.length - 1} US areas and one typical US metro, for the
               moves that need an area (features/strat.js). Each value is a Guess.
   INPUT       None.
   OUTPUT      METROS: { note, status, asOf, fields, metros: [{ id, name, price, rentUnit, taxPct, ins,
               br1, room }] }.
   DEPENDS ON  Nothing.
   RULES       This file is generated. Do not edit it. Change presets/metros.json, then run
               node tools/game_metros_build.cjs.
   ========================================================================= */
const METROS = ${JSON.stringify(j, null, 2)};
`
);
console.log("metros.js: " + j.metros.length + " rows");
