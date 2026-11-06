// SPDX-License-Identifier: AGPL-3.0-only
// The workbook check (docs/WORKBOOK.md): build a household's workbook, let LibreOffice recalculate every formula,
// then read each Check cell on Math and the report tabs (Statements, FOO, Projections) and list every row whose
// formula does not give the app's value. test/workbook-drift.test.js runs it on every persona, the Demo client and
// Fast Track Alexis and Tom; run it by hand to see the list:
//   node tools/workbook-check.mjs              every household, one line per row that differs
//   node tools/workbook-check.mjs maya demo    just these (persona ids, demo, ft-alexis, ft-tom)
// ExcelJS comes from this checkout's node_modules (npm install), or from the main checkout's when this is a git
// worktree without its own; LibreOffice from its usual places or SOFFICE=/path/to/soffice.
import { readFileSync, writeFileSync, mkdtempSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync, execFile } from 'node:child_process';
import { cpus } from 'node:os';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { householdFromInputs } from '../js/demo.js';
import { Store, newHousehold, importFile } from '../js/records.js';
import { addPresets, ensureCategories } from '../js/presets.js';
import { applyFastTrack, fastTrackAnswers } from '../js/fasttrack.js';
import { buildWorkbook } from '../js/sheet/workbook.js';
import { setPriorsData } from '../js/priorslib.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ref = JSON.parse(readFileSync(join(root, 'data', 'reference-2026.json'), 'utf8'));
setPriorsData(JSON.parse(readFileSync(join(root, 'data', 'priors-2026.json'), 'utf8'))); // as the app has it once loaded (M9E)
export const NOW = new Date('2026-11-05T12:00:00Z'); // the personas are built as of this moment (tools/personas/build.mjs)

// ExcelJS: here, else the main checkout's (a worktree shares the main checkout's git dir, not its node_modules).
export function loadExcel() {
  const tries = [join(root, 'package.json')];
  try {
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    tries.push(join(dirname(common), 'package.json'));
  } catch { /* not a git checkout */ }
  for (const from of tries) {
    try { return createRequire(from)('exceljs'); } catch { /* not installed there */ }
  }
  return null;
}
export const ExcelJS = loadExcel();
export const soffice = [process.env.SOFFICE, '/usr/bin/soffice', '/usr/local/bin/soffice', '/opt/libreoffice/program/soffice', '/Applications/LibreOffice.app/Contents/MacOS/soffice'].find(p => p && existsSync(p)) ?? null;
// Why the check cannot run here, or false when it can (false, not null: node:test skips a test whose skip is null).
export const missing = !ExcelJS && !soffice ? 'ExcelJS and LibreOffice are not installed: run npm install, and install LibreOffice (soffice), to recalculate the workbook'
  : !ExcelJS ? 'ExcelJS is not installed: run npm install (or npm install --no-save exceljs@4.4.0) in this checkout or the main one'
  : !soffice ? 'LibreOffice (soffice) is not installed, so the workbook cannot be recalculated: install it, or set SOFFICE to its path'
  : false;

// ---------- The households ----------
const persona = id => importFile(readFileSync(join(root, 'fixtures', 'personas', `${id}.json`), 'utf8'));
export const PERSONA_IDS = readdirSync(join(root, 'fixtures', 'personas')).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();
const fastTrack = (name, patch, debts = {}) => {
  const s = new Store(newHousehold({ name, now: NOW.toISOString(), id: `ft-${name.split(' ')[0].toLowerCase()}` }), { now: () => NOW.toISOString() });
  addPresets(s, ref); ensureCategories(s);
  const a = fastTrackAnswers(s.doc);
  Object.assign(a, { hasKids: false, hasPets: false, workSituation: 'Employed (W-2)', hsaEligible: false, fsa: false, equityPay: false, state: 'NY', household: 'Solo', chips: { whyNow: ['Just want to get organized'], worry: ['Debt'], goalWords: ['Debt free'] } }, patch);
  Object.assign(a.debts, debts);
  applyFastTrack(s, a, { finished: true, now: NOW.toISOString() });
  return s.doc;
};
// Alexis and Tom as the build notes give them, through Fast Track only.
export const ftAlexis = () => fastTrack('Alexis Gillmore', { birthYear: 1998, takeHome: 1200, takePer: 'paycheck', payFrequency: '2 weeks', gut: 2800, gutIncludesDebt: false, checking: 400, savings: 0, invested: 0, housing: 'Rent', hasCar: false }, { 'Credit card': { balance: 4200, payment: 120, rows: 0 } });
export const ftTom = () => fastTrack('Tom Hutchinson', { birthYear: 1988, takeHome: 9800, takePer: 'month', gut: 6500, gutIncludesDebt: true, gutFrom: 'Statements', checking: 8000, savings: 30000, invested: 410000, housing: 'Own', hasCar: true, homeValue: 650000, carValue: 22000, hsaEligible: true, equityPay: true, fiAge: 50 });
export const demo = () => householdFromInputs(JSON.parse(readFileSync(join(root, 'fixtures', 'demo.json'), 'utf8')).inputs, { now: NOW.toISOString() });
export const HOUSEHOLDS = [...PERSONA_IDS.map(id => [id, () => persona(id)]), ['demo', demo], ['ft-alexis', ftAlexis], ['ft-tom', ftTom]];

// ---------- The check ----------
// Every Check cell of a plan, with the two cells it compares: { sheet, row, col, a, b, id, name }.
function checksOf(plan) {
  const out = [];
  for (const s of plan.sheets) {
    s.rows.forEach((row, ri) => (row || []).forEach((cell, ci) => {
      if (cell?.s !== 'check' || !cell.f) return;
      const m = /ISNUMBER\(([A-Z]+\d+)\),ISNUMBER\(([A-Z]+\d+)\)/.exec(cell.f);
      out.push({ sheet: s.name, row: ri + 1, col: ci + 1, a: m[1], b: m[2], id: String(row[0]?.v ?? ''), name: String(row[1]?.v ?? '') });
    }));
  }
  return out;
}
// LibreOffice writes a formula's 0 with no cached value, which ExcelJS reads as no result.
const val = v => (v && typeof v === 'object' && !(v instanceof Date) ? (v.formula || v.sharedFormula ? v.result ?? v.error ?? 0 : v.richText ? v.richText.map(t => t.text).join('') : v.result ?? null) : v);
const show = v => (v == null || v === '' ? 'blank' : typeof v === 'number' ? String(Math.round(v * 100) / 100) : v instanceof Date ? v.toISOString().slice(0, 10) : JSON.stringify(v));

// Recalculate many households in one LibreOffice run; returns { label: [{ where, id, name, sheet, app }] }.
export async function check(list, { now = new Date(), keep = false } = {}) {
  if (missing) throw new Error(missing);
  const { workbookBuffer } = await import('../js/sheet/excel.js');
  const dir = mkdtempSync(join(tmpdir(), 'slam-wbcheck-'));
  const plans = {};
  try {
    for (const [label, make] of list) {
      const plan = buildWorkbook(make(), ref, { now });
      plans[label] = plan;
      writeFileSync(join(dir, `${label}.xlsx`), Buffer.from(await workbookBuffer(ExcelJS, plan, { cache: false })));
    }
    // LibreOffice recalculates on load and writes each file back with its results. A few runs side by side (one per
    // core, at most 4), each with a profile of its own, so they and a LibreOffice the user has open do not collide.
    const jobs = Math.max(1, Math.min(4, cpus().length, list.length));
    const groups = Array.from({ length: jobs }, (_, j) => list.filter((_, i) => i % jobs === j));
    await Promise.all(groups.map((g, j) => promisify(execFile)(soffice, [`-env:UserInstallation=file://${join(dir, `profile${j}`)}`, '--headless', '--calc', '--convert-to', 'xlsx', '--outdir', join(dir, 'out'), ...g.map(([l]) => join(dir, `${l}.xlsx`))], { timeout: 600000 })));
    const result = {};
    for (const [label] of list) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(join(dir, 'out', `${label}.xlsx`));
      const off = [];
      for (const ch of checksOf(plans[label])) {
        const ws = wb.getWorksheet(ch.sheet);
        const res = val(ws.getCell(ch.row, ch.col).value);
        if (res === 'Matches' || res == null) continue;
        off.push({ sheet: ch.sheet, id: ch.id, name: ch.name, sheetValue: val(ws.getCell(ch.a).value), app: val(ws.getCell(ch.b).value), check: res,
          where: `${ch.sheet} ${ch.id}${ch.sheet === 'Math' ? '' : ` (${ch.name})`}` });
      }
      // The browser writes each formula's expected result in the file (cached values), which a spreadsheet that does not
      // recalculate on open (LibreOffice by default) shows as is. Each one must be what the formula really gives.
      for (const st of plans[label].sheets) {
        const ws = wb.getWorksheet(st.name);
        st.rows.forEach((row, ri) => (row || []).forEach((cell, ci) => {
          if (!cell?.f || cell.cached === undefined || cell.cached === null || cell.cached === 'Never' || typeof cell.cached === 'object') return;
          const got = val(ws.getCell(ri + 1, ci + 1).value), want = cell.cached;
          const same = typeof want === 'number' && typeof got === 'number' ? Math.abs(got - want) <= (Math.abs(want) < 2 ? 0.0005 : 1.01) : String(got ?? '') === String(want ?? '') || (want === 0 && got === '') || (want === '' && got === 0);
          if (!same) off.push({ sheet: st.name, id: String(row[0]?.v ?? ''), name: String(row[1]?.v ?? ''), sheetValue: got, app: want, check: 'cached',
            where: `${st.name} ${ws.getCell(ri + 1, ci + 1).address} (cached value, ${String(row[0]?.v ?? '')} ${String(row[1]?.v ?? '').slice(0, 40)})` });
        }));
      }
      result[label] = keep ? Object.assign(off, { wb, plan: plans[label] }) : off;
    }
    return result;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
export const lineOf = o => `${o.where}: sheet ${show(o.sheetValue)}, app ${show(o.app)}`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (missing) { console.log(`Skipped: ${missing}`); process.exit(0); }
  const want = process.argv.slice(2);
  const list = want.length ? HOUSEHOLDS.filter(([l]) => want.includes(l)) : HOUSEHOLDS;
  const res = await check(list);
  let n = 0;
  for (const [label, off] of Object.entries(res)) {
    console.log(`${label}: ${off.length ? `${off.length} differ` : 'every row matches'}`);
    for (const o of off) { console.log(`  ${lineOf(o)}`); n++; }
  }
  process.exit(n ? 1 : 0);
}
