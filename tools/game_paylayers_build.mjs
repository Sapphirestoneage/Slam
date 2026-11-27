#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Makes game/core/paylayers.js from js/math/paylayers.js (What it is / What it could be, run A, Nov 27 2026), so the web app
// and the game have one copy of the two numbers and of the layer chart's year-by-year run. The game has classic
// scripts and no modules: this tool takes the import line and the word `export` off, and adds the game's file header.
// wayPay comes from game/core/withdraw.js, which the game loads first.
// Usage: node tools/game_paylayers_build.mjs           write the copy
//        node tools/game_paylayers_build.mjs --check   change nothing; exit 1 when the copy is stale
// Run the game steps after it (tools/game_stamp.cjs, tools/game_codemap.py). test/paylayers.test.js and
// game/tests/what-it-could-be.js fail when the copy is old.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const from = new URL('../js/math/paylayers.js', import.meta.url), to = new URL('../game/core/paylayers.js', import.meta.url);
const src = readFileSync(from, 'utf8');
const hash = createHash('sha256').update(src).digest('hex').slice(0, 16);
const body = src.replace(/^\/\/ SPDX-License-Identifier:.*\n/, '').replace(/^import .*\n/gm, '').replace(/^export /gm, '');
const names = [...src.matchAll(/^export (?:function|const) (\w+)/gm)].map(m => m[1]);
const head = `/* ============================================================================
   SLAM the Game: core/paylayers.js
   PURPOSE     What it is / What it could be: the standard FI number and its age, the same number after
               the things a player counted, and the year-by-year run of the layer chart from today to
               95 (what each year costs, which layer pays for it, and what is not covered yet).
   INPUT       Plain numbers from the caller (features/couldbe.js makes them from the profile). It
               reads no profile and no screen.
   OUTPUT      ${names.length} functions and constants: ${names.join(', ').replace(/(.{1,84})(, |$)/g, '$1$2\n               ').trimEnd()}
   DEPENDS ON  core/withdraw.js (wayPay: one year on one pile).
   RULES       GENERATED FILE. Do not edit it. It is a copy of js/math/paylayers.js of the main app.
               tools/game_paylayers_build.mjs makes it. Change the source, then run the tool.
               Prettier does not format this file (.prettierignore).
   SOURCE-HASH  ${hash}
   ========================================================================= */
`;
// The spending-shape default of the reference data (retirementPhases), for the game: it has no reference file of its own.
const all = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url), 'utf8')), ref = all.retirementPhases, ssRef = all.socialSecurity.trustFund;
// The federal tax lines of the back-end tax step (Batch B, phase 2a), with the source and the date of each figure from
// the registry: the game's tax engine has its own tables, and a game test fails when they differ from these.
const { ASSUMPTIONS, TABLES } = await import('../js/registry/assumptions.js');
const srcOf = (list, id) => { const a = list.find(x => x.id === id); return { source: a.source, date: a.date }; };
const taxRef = { year: all.tax.capitalGains.taxYear, standardDeduction: all.tax.standardDeduction, brackets: all.tax.brackets, zeroGainsTo: all.tax.capitalGains.zeroTo,
  sources: { standardDeduction: srcOf(ASSUMPTIONS, 'tax.standardDeduction.single'), standardDeductionHead: srcOf(ASSUMPTIONS, 'tax.standardDeduction.head'), brackets: srcOf(TABLES, 'Fed_single'), bracketsHead: srcOf(TABLES, 'Fed_head'),
    zeroGainsTo: { source: all.tax.capitalGains.source, date: all.tax.capitalGains.read } } };
// The typical values of the chip "No idea, use typical" (run SLAM-ONBOARD-1, Nov 27 2026), each with its source:
// spending by age (CE 2024: total expenditures less personal insurance and pensions, the rule of
// docs/engines/priors-sources.md), the personal saving rate (BEA), and the typical amount invested by age
// (typicalInvested of the reference data). The game reads them with cbTypical (game/features/couldbe.js).
const priors = JSON.parse(readFileSync(new URL('../data/priors-2026.json', import.meta.url), 'utf8'));
const plainRow = r => r.household == null && r.place == null;
const ceRow = (field, band) => priors.rows.find(r => r.field === field && r.band === band && r.source === 'ce2024' && plainRow(r));
const srcLine = r => { const S = priors.sources[r.source]; return `${S.publisher}, ${S.name}`; };
const ceTotals = priors.rows.filter(r => r.field === 'spending.total' && r.ages && r.source === 'ce2024' && plainRow(r));
const saveRow = priors.rows.find(r => r.field === 'savingRate' && !r.ages && plainRow(r));
const typRef = {
  spend: { rows: ceTotals.map(t => { const p = ceRow('spending.personalInsurance', t.band); if (!p) throw new Error(`no personal insurance row for ${t.band}`); return { ages: t.ages, band: t.band, year: t.mean - p.mean }; }),
    who: ceTotals[0].among, source: `${srcLine(ceTotals[0])}: total expenditures less personal insurance and pensions (payroll taxes and retirement contributions), annual mean per consumer unit`, date: priors.asOf },
  saveRate: { share: saveRow.share, source: `${srcLine(saveRow)}: ${saveRow.table}, ${saveRow.period}`, date: priors.sources[saveRow.source].released },
  inv: { rows: all.typicalInvested.byAge.map(([from, median], i, L) => ({ ages: [from || null, i + 1 < L.length ? L[i + 1][0] - 1 : all.typicalInvested.to], median })),
    who: all.typicalInvested.who, source: all.typicalInvested.source, date: all.typicalInvested.date },
};
const out = head + body + `// The go-go, slow-go and no-go shares and their source (data/reference-2026.json, retirementPhases), read with lyShapeBands.\nconst LY_SHAPE_REF = ${JSON.stringify(ref)};\n// The share of Social Security that the trust fund report says can still be paid (socialSecurity.trustFund).\nconst LY_SS_REF = ${JSON.stringify(ssRef)};\n// The federal tax lines of the back-end tax step and where each comes from (data/reference-2026.json, tax; js/registry/assumptions.js).\nconst LY_TAX_REF = ${JSON.stringify(taxRef)};\n\n// The typical values of the chip No idea, use typical, with their sources (data/priors-2026.json: CE 2024 by age and the BEA saving rate; data/reference-2026.json: typicalInvested).\nconst LY_TYP_REF = ${JSON.stringify(typRef)};\n`;
if (process.argv.includes('--check')) {
  let now = '';
  try { now = readFileSync(to, 'utf8'); } catch { now = ''; }
  if (now !== out) { console.error('game/core/paylayers.js is stale: run node tools/game_paylayers_build.mjs'); process.exit(1); }
  console.log('game/core/paylayers.js is current.');
} else {
  writeFileSync(to, out);
  console.log(`game/core/paylayers.js written from js/math/paylayers.js (${names.length} names, hash ${hash}).`);
}
