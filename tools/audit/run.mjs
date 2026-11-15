// SPDX-License-Identifier: AGPL-3.0-only
// The second-engine audit, start to finish: make the cases and SLAM's answers (cases.mjs), work them out a second time
// (engine2.py), and say what differs. Exits 1 when any number is off by more than a dollar, when a figure printed by
// the IRS is not reproduced, or when a year of the lifetime plan sets aside a different tax than its income owes.
// Usage: node tools/audit/run.mjs [cases per function, default 500] [seed]
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..', '..');
const [n = '500', seed = '20261114'] = process.argv.slice(2);
const dir = mkdtempSync(join(tmpdir(), 'slam-audit-')), cases = join(dir, 'cases.json'), report = join(dir, 'report.json');
const step = (cmd, args) => { const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 }); if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(r.status ?? 1); } return r.stdout; };
step(process.execPath, [join(here, 'cases.mjs'), cases, n, seed]);
process.stdout.write(step('python3', [join(here, 'engine2.py'), cases, join(root, 'data', 'reference-2026.json'), report]));
const r = JSON.parse(readFileSync(report, 'utf8')), L = r.life;
console.log(`Printed by the source and reproduced: ${r.anchors.length - r.anchorsOff} of ${r.anchors.length}`);
for (const a of r.anchors.filter(a => !a.ok)) console.log(`  NOT reproduced: ${a.what}: printed ${JSON.stringify(a.printed)}, got ${JSON.stringify(a.got)}`);
console.log(`Lifetime plan: ${L.years} free years in ${L.runs} runs. Tax set aside differs from tax owed in ${L.tax_gap_years}. No premium credit counted where one was due in ${L.credit_gap_years} (at a line, by rule).`);
console.log(`Loan interest, formula against stepping every month: largest gap $${r.interestFormulaVsStepped.largest.toFixed(2)}, average $${r.interestFormulaVsStepped.average.toFixed(2)} (QUESTIONS.md).`);
for (const [fn, v] of Object.entries(r.byFunction)) if (v.off) console.log(`OFF ${fn}: ${v.off} of ${v.checks}. Example: ${JSON.stringify(v.example).slice(0, 600)}`);
const bad = r.off > 0 || r.anchorsOff > 0 || L.tax_gap_years > 0;
console.log(bad ? 'The two engines do not agree.' : `The two engines agree on all ${r.checks.toLocaleString('en-US')} numbers in ${r.cases.toLocaleString('en-US')} cases, to the dollar.`);
process.exit(bad ? 1 : 0);
