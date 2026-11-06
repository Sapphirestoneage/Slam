// Batch 35: follow-ups from batch 27 (income by type). The federal tips deduction taken off the household's income tax
// for reported tips (QUESTIONS 300, T.D. 10044), the state line on Taxes (306), the workbook formulas for tips, shifts,
// house fees and Platform rows (305), Find's words for them, and the one line a Job row shows for its tips and shifts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, newHousehold, importFile } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { householdTax, tipsDeductionOf, stateTaxLine } from '../js/math/income.js';
import { workOf, workCash, reportedTipsYear, workLine } from '../js/math/earnings.js';
import { buildWorkbook } from '../js/sheet/workbook.js';
import { OUT_DIR } from '../tools/personas/build.mjs';
import { loadExcel, soffice as SOFFICE, missing as WB_MISSING } from '../tools/workbook-check.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const persona = id => importFile(readFileSync(join(OUT_DIR, `${id}.json`), 'utf8'));
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
const row = values => ({ kind: 'income', type: 'Job', amount: null, per: 'month', values });

test('Q300: the bartender\'s card tips come off federal income tax (hand-checked)', () => {
  // Riley: $900 every 2 weeks take-home ($23,400 a year), W-2, single, FL. Its gross works out to $26,460 (FICA
  // 7.65% = $2,024.19; federal 10% x ($26,460 - $16,100) = $1,036 without the deduction). Card tips run through
  // payroll, so they are reported: $60 x 13 shifts (3 a week x 52 / 12) x 12 = $9,360 a year. The tip-out is paid
  // from the cash, and the cash tips are not reported, so they get none. $9,360 is under the $25,000 cap and the
  // income is under $150,000, so all of it comes off: taxable $10,360 - $9,360 = $1,000, federal $100, $936 saved.
  const m = metrics(persona('bartender'), ref, { now });
  const i = m.inputs.income[0], hh = m.inputs.householdTax;
  near(i.gross, 26460, 0.5);
  near(i.tipsYear, 9360);
  near(hh.tips.deduction, 9360); near(hh.tips.saved, 936);
  near(i.tax.federal, 100); near(i.tax.fica, 2024.19);
  near(hh.units.Me.taxable, 1000);
  // The paycheck was typed as take-home, so the plan's take-home stays $3,380; its withholding ($3,060) was worked out
  // as if there were no deduction, so about $936 comes back when Riley files.
  near(m.inputs.takeHome, 3380);
  const td = tipsDeductionOf(hh, m.inputs.income, ref);
  near(td.refund, 935.81);
  assert.match(td.text, /\$9,360 of reported tips off federal taxable income, \$936 less federal income tax a year/);
  assert.match(td.text, /about \$936 comes back when you file/);
  assert.match(td.tip, /step 4b/);
  assert.match(td.text, /Cash tips not reported get none/);
  assert.match(td.tip, /Social Security and Medicare still apply/);
  assert.ok(!`${td.text} ${td.tip}`.includes(String.fromCharCode(0x2014)), 'no em dashes');
});

test('Q300: the cap, the phase-out, a joint return, married separately and the years', () => {
  const one = (tips, gross, opts = {}) => householdTax([{ id: 'a', person: 'Me', gross, pretax: 0, taxType: 'W-2', tips }], { year: 2026, ...opts }, ref);
  // Single, $170,000: $25,000 cap (of $30,000 tips) less 10% of the $20,000 over $150,000 = $23,000, all at 24%.
  const a = one(30000, 170000);
  near(a.tips.deduction, 23000); near(a.tips.saved, 23000 * 0.24); assert.equal(a.tips.capped, true); assert.equal(a.tips.phasedOut, true);
  near(a.total.federal, one(0, 170000).total.federal - 5520);
  assert.equal(a.total.fica, one(0, 170000).total.fica, 'Social Security and Medicare are not touched');
  near(one(30000, 400000).tips.deduction, 0, 0.001); // phased out fully
  // Joint, $200,000 + $150,000 with $10,000 and $30,000 of tips: $25,000 less 10% of $50,000 = $20,000, at 24%, shared 1:3.
  const j = householdTax([{ id: 'a', person: 'Me', gross: 200000, pretax: 0, taxType: 'W-2', tips: 10000 }, { id: 'b', person: 'Partner', gross: 150000, pretax: 0, taxType: 'W-2', tips: 30000 }], { filingStatus: 'Married jointly', year: 2026 }, ref);
  near(j.tips.deduction, 20000); near(j.tips.saved, 4800); near(j.rows.a.tipsSaved, 1200); near(j.rows.b.tipsSaved, 3600);
  assert.equal(householdTax([{ id: 'a', person: 'Me', gross: 40000, pretax: 0, taxType: 'W-2', tips: 8000 }], { filingStatus: 'Married separately', year: 2026 }, ref).tips.saved, 0, 'married filing separately: none');
  assert.equal(one(8000, 40000, { year: 2029 }).tips.saved, 0, 'none after 2028');
  near(one(8000, 40000, { year: 2028 }).tips.saved, 8000 * 0.12);
  near(one(50000, 20000).rows.a.tipsSaved, 20000 - 16100 > 0 ? (20000 - 16100) * 0.1 : 0, 0.01); // tips never count past the row's gross
});

test('Q300: only reported tips count, and only what is kept after the tip-out', () => {
  const paycheck = v => workCash(workOf(row(v)), { paycheckTyped: true });
  const v = { shiftsWeek: 3, cardTips: 60, cashTips: 140, tipOutBy: '% of sales', tipOutPct: 0.03, salesShift: 1000 };
  near(reportedTipsYear(workOf(row({ ...v, cashReported: 'No' })), paycheck({ ...v, cashReported: 'No' })), 9360);
  near(reportedTipsYear(workOf(row({ ...v, cashReported: 'Yes' })), paycheck({ ...v, cashReported: 'Yes' })), 9360 + (140 - 30) * 13 * 12);
  // A shift job with no paycheck: reported card and cash tips less the tip-out on them, as its gross takes them.
  const s = { shiftsWeek: 3, payShift: 100, cardTips: 50, cashTips: 80, cashReported: 'Yes', tipOutBy: '$ a shift', tipOutAmount: 20 };
  const w = workOf(row(s)), c = workCash(w, { taxType: 'W-2' });
  near(reportedTipsYear(w, c), (50 + 80 - 20) * 13 * 12);
  assert.equal(reportedTipsYear(workOf(row({ shiftsWeek: 3, payShift: 100, cashTips: 80, cashReported: 'No' })), workCash(workOf(row({ shiftsWeek: 3, payShift: 100, cashTips: 80, cashReported: 'No' })), { taxType: 'W-2' })), 0);
  // No tips on file: no line on Taxes. The dancer and the creator have none.
  for (const id of ['dancer', 'creator']) { const m = metrics(persona(id), ref, { now }); assert.equal(tipsDeductionOf(m.inputs.householdTax, m.inputs.income, ref), null); }
});

test('Q306: Taxes says what it does with the state', () => {
  assert.equal(stateTaxLine('NY', ref), null);
  assert.match(stateTaxLine('CA', ref), /CA state income tax is not counted yet: it comes in Phase 5/);
  assert.match(stateTaxLine('FL', ref), /FL has no state income tax on wages/);
  assert.match(stateTaxLine('NV', ref), /no state income tax/);
  assert.match(stateTaxLine(null, ref), /Pick a state/);
});

test('item 6: a Job row says its tips and shifts in one line', () => {
  const line = id => { const i = metrics(persona(id), ref, { now }).inputs.income[0]; return workLine(i.work, i.cash, i.takeHome.value); };
  assert.equal(line('bartender'), '$260 a shift after tip-out · 3 shifts a week');
  assert.equal(line('dancer'), '$367 a shift after fees and tip-out · 3 shifts a week');
  assert.equal(workLine(workOf(row({ cashTips: 1200, cashTipsPer: 'month' })), workCash(workOf(row({ cashTips: 1200, cashTipsPer: 'month' })), { paycheckTyped: true }), 3000), '$1,200 a month in cash tips');
});

// ---------- The workbook (QUESTIONS 305): recalculated in LibreOffice, the income rows match the app ----------
let ExcelJS = null;
ExcelJS = loadExcel(); // here, or the main checkout's in a git worktree (tools/workbook-check.mjs)
const soffice = SOFFICE;
// A household that uses every path: a W-2 shift job with no paycheck (reported cash, a tip-out on tips), a partner's
// gross-typed job with card tips a month (joint, over the phase-out line), a 1099 shift job with a house fee, and an
// Etsy row with its fee typed and chargebacks.
function tippedHousehold() {
  const s = new Store(newHousehold({ name: 'Tipped' }));
  s.transaction('x', () => {
    s.setDoc('profile', { firstName: 'Sky', partnerName: 'Jo', birthYear: 1994, state: 'TX', household: 'Couple', mode: 'Married joint', filingStatus: 'Married jointly' });
    s.add('income', { name: 'Server', amount: null, per: 'month', owner: 'Me', values: { payFrequency: '2 weeks', incomeType: 'W-2', shiftsWeek: 4, hourly: 3, hoursShift: 7, cardTips: 150, cashTips: 60, cashReported: 'Yes', tipOutBy: '% of tips', tipOutPct: 0.15 } }, { type: 'Job' });
    s.add('income', { name: 'Jo bar manager', amount: 290000, per: 'year', owner: 'Partner', values: { basis: 'Gross', payFrequency: '2 weeks', cardTips: 1500, cardTipsPer: 'month' } }, { type: 'Partner job' });
    s.add('income', { name: 'Dancing', amount: null, per: 'month', owner: 'Me', values: { payFrequency: 'week', incomeType: '1099', shiftsWeek: 2, payShift: 400, houseFee: 60, tipOutBy: '$ a shift', tipOutAmount: 25 } }, { type: 'Self-employed' });
    s.add('income', { name: 'Etsy', amount: 1800, per: 'month', owner: 'Me', values: { platform: 'Etsy', feePct: 0.1, chargebacks: 40, payFrequency: 'week' } }, { type: 'Platform' });
    s.add('spending', { name: 'Gut', amount: 9000, values: {} }, { type: 'All in' });
    s.add('account', { name: 'Brokerage', values: { group: 'investment', balance: 50000 } }, { type: 'Brokerage' });
  });
  return s.doc;
}
const INCOME_ROWS = /^M1[0-4]\b|^M10 · tips|^M12 · (extra|platform)/;
async function incomeOff(doc) {
  const { workbookBuffer } = await import('../js/sheet/excel.js');
  const dir = mkdtempSync(join(tmpdir(), 'slam-b35-'));
  writeFileSync(join(dir, 'book.xlsx'), Buffer.from(await workbookBuffer(ExcelJS, buildWorkbook(doc, ref, { now }), { cache: false })));
  execFileSync(soffice, [`-env:UserInstallation=file://${join(dir, 'lo-profile')}`, '--headless', '--calc', '--convert-to', 'xlsx', '--outdir', join(dir, 'out'), join(dir, 'book.xlsx')], { stdio: 'ignore', timeout: 120000 });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(join(dir, 'out', 'book.xlsx'));
  const val = v => (v && typeof v === 'object' ? v.result ?? v.error ?? null : v);
  const off = [], seen = new Set();
  for (const tab of ['Math', 'Statements']) {
    let col = null;
    const at = tab === 'Math' ? 1 : 2; // batch 59: a screen tab's column A is its hidden keys
    wb.getWorksheet(tab).eachRow((r, n) => {
      const vals = r.values;
      if (vals.includes('Check')) { col = vals.indexOf('Check'); return; }
      if (!col) return;
      const id = String(r.getCell(at).value ?? ''), name = String(r.getCell(at + 1).value ?? '');
      const mine = tab === 'Math' ? INCOME_ROWS.test(id) : /^(Gross, all income|Taxes \(and premiums|Take-home)/.test(id) || /^(Gross, all income|Taxes \(and premiums|Take-home)/.test(name);
      if (!mine) return;
      seen.add(`${tab}:${id}`);
      const s = val(r.getCell(col).value);
      if (s != null && s !== 'Matches' && s !== 'From the app') off.push(`${tab} ${id} ${name}: ${JSON.stringify(s)}`);
    });
  }
  return { off, seen };
}
for (const [label, make] of [['the bartender', () => persona('bartender')], ['the dancer', () => persona('dancer')], ['the creator', () => persona('creator')], ['a household with every tips, shifts and platform path', tippedHousehold]]) {
  test(`Q305: opened in a spreadsheet, tips, shifts and platform rows give the app's tax and take-home (${label})`, { skip: WB_MISSING, timeout: 180000 }, async () => {
    const { off, seen } = await incomeOff(make());
    assert.deepEqual(off, []);
    for (const id of ['Math:M10', 'Math:M12', 'Math:M13']) assert.ok(seen.has(id), `${id} was checked`);
  });
}
test('Q305: the tipped household works out as the rules say (so the spreadsheet check above means something)', () => {
  const m = metrics(tippedHousehold(), ref, { now });
  const hh = m.inputs.householdTax;
  assert.ok(hh.tips.deduction > 0 && hh.tips.phasedOut, 'joint and over $300,000: a smaller deduction');
  const etsy = m.inputs.income.find(i => i.r.name === 'Etsy');
  near(etsy.platform.net, 1800 * 0.9 - 40);
  const server = m.inputs.income.find(i => i.r.name === 'Server');
  assert.equal(server.cash.mode, 'shifts');
  near(server.tipsYear, (150 + 60) * 0.85 * 4 * 52 / 12 * 12);
});
