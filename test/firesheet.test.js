// SPDX-License-Identifier: AGPL-3.0-only
// The FIRE sheet (the run "Export for the FIRE spreadsheet crowd", Nov 25 2026): the math (js/math/firesheet.js), the
// tab (js/sheet/fire.js), the web app's workbook with the tab first, the game's workbook through the one export engine
// (js/sheet/planbook.js), and Google Sheets: only functions on an explicit list, and LibreOffice works every formula
// out with no error cell. The real import into Google Sheets cannot be run from a test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireSheetRows, fireThrough, fireKindOf, FIRE_KINDS } from '../js/math/firesheet.js';
import { fireSheet, fireModel, FIRE_TAB, FIRE_TEMPLATE_URL, FIRE_WORDS, fireBlankButton } from '../js/sheet/fire.js';
import { planBookPlan, planBookText, PLAN_TAB } from '../js/sheet/planbook.js';
import { workbookBuffer, readWorkbook } from '../js/sheet/excel.js';
import { buildWorkbook } from '../js/sheet/workbook.js';
import { STRATEGIES } from '../js/math/lifetime.js';
import { ExcelJS, soffice, missing, HOUSEHOLDS, demo, NOW } from '../tools/workbook-check.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const hist = JSON.parse(readFileSync(new URL('../data/history-returns.json', import.meta.url)));
// The ids of the game's ways to take money out, read from its list (the game is classic scripts, not a module).
const RETIRE_METHOD_IDS = [...(/const RETIRE_METHODS = \[([\s\S]*?)\n\];/.exec(readFileSync(join(root, 'game/features/retire.js'), 'utf8'))?.[1] ?? '').matchAll(/\[\s*"([a-z_]+)"/g)].map(m => m[1]);
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
const base = { year: 2026, age: 35, stopAge: 50, lastAge: 90, income: 90000, spending: 48000, spendingAfter: 45000, invested: 250000, contributions: [15000, 7000, 8000], realReturn: 0.05, safeRate: 0.04, other: 20000, otherAge: 67, kind: 'steady', rate: 0.04 };
const input = (over = {}) => ({ year: 2026, age: 35, stopAge: 50, lastAge: 90, income: 90000, incomeLabel: 'Income a year', spending: 48000, spendingAfter: 45000, invested: 250000,
  contributions: [{ label: 'taxed later', amount: 15000 }, { label: 'Roth', amount: 7000 }, { label: 'taxable', amount: 8000 }], realReturn: 0.05, safeRate: 0.04, other: 20000, otherAge: 67, method: { id: 'fixed', name: 'Steady spending' }, rate: 0.04, ...over });

// Every function a formula of either workbook may use. Each one is in Google Sheets' function list, in Excel 2010 and
// in LibreOffice. A formula with a function that is not here fails the run: add it only after checking all three.
const GOOGLE_SHEETS_OK = new Set(['ABS', 'AND', 'COUNT', 'COUNTIF', 'COUNTIFS', 'DATE', 'FV', 'IF', 'IFERROR', 'INDEX', 'INT', 'ISERROR', 'ISNUMBER', 'LEFT', 'LEN', 'LN', 'MATCH', 'MAX', 'MID', 'MIN', 'MONTH', 'N', 'NOT', 'NPER', 'OR', 'PMT', 'PV',
  'REPT', 'ROUND', 'ROUNDDOWN', 'ROUNDUP', 'ROW', 'SEARCH', 'SQRT', 'SUBSTITUTE', 'SUM', 'SUMIFS', 'SUMPRODUCT', 'TEXT', 'TODAY', 'TRIM', 'VALUE', 'YEAR']);
const functionsOf = plan => { const used = new Set(); for (const s of plan.sheets) for (const r of s.rows) for (const c of r || []) if (c?.f) for (const m of c.f.replace(/"(?:[^"]|"")*"/g, '').matchAll(/([A-Z][A-Z0-9.]*)\(/g)) used.add(m[1]); return used; };

// ---------- The math, by hand ----------
test('a working year: the balance grows, and what goes in grows for the part of the year it was there', () => {
  const [y1, y2] = fireSheetRows(base);
  // 250,000 x 1.05 = 262,500. 30,000 goes in a twelfth each month: 30,000 x 0.05 / (12 x (1.05^(1/12) - 1)) = 30,681.44
  near(fireThrough(0.05), 1.0227148, 1e-6);
  near(y1.balance, 262500 + 30681.44, 0.01);
  near(y2.balance, y1.balance * 1.05 + 30681.44, 0.01);
  assert.equal(y1.savings, 30000); near(y1.savingsRate, 1 / 3, 1e-9);
  assert.equal(y1.fiNumber, 1125000); near(y1.pctToFi, y1.balance / 1125000, 1e-12);
  assert.equal(y1.stage, 'Working'); assert.equal(y1.year, 2026); assert.equal(y1.age, 35);
  assert.equal(fireThrough(0), 1, 'no growth: a dollar in is a dollar');
});
test('the stop age is marked once, and a free year takes the withdrawal out first, then grows', () => {
  const rows = fireSheetRows(base), stop = rows.find(r => r.age === 50), before = rows.find(r => r.age === 49);
  assert.equal(rows.length, 56); assert.equal(rows.filter(r => r.stage === 'Stop work').length, 1); assert.equal(stop.stage, 'Stop work');
  assert.equal(stop.withdrawal, 45000, 'the same amount each year: what life costs, no other income yet');
  near(stop.balance, (before.balance - 45000) * 1.05, 0.001);
  assert.equal(stop.savings, 0); assert.equal(stop.savingsRate, null); assert.equal(stop.spending, 45000);
  const at67 = rows.find(r => r.age === 67);
  assert.equal(at67.income, 20000); assert.equal(at67.withdrawal, 25000, 'other income comes off first'); assert.equal(at67.spending, 45000);
});
test('a share of the balance, a floor and a ceiling, and guardrails, each by hand', () => {
  const one = { ...base, age: 60, stopAge: 60, lastAge: 62, invested: 1000000, other: 0, realReturn: 0 };
  const share = fireSheetRows({ ...one, kind: 'share', rate: 0.04 });
  assert.deepEqual(share.map(r => Math.round(r.withdrawal)), [40000, 38400, 36864]);
  // Floor and ceiling: 4% of 1,000,000 is 40,000, between 85% (38,250) and 120% (54,000) of 45,000. A small balance hits the floor.
  assert.equal(fireSheetRows({ ...one, kind: 'floor', rate: 0.04 })[0].withdrawal, 40000);
  assert.equal(fireSheetRows({ ...one, kind: 'floor', rate: 0.04, invested: 500000 })[0].withdrawal, 38250);
  assert.equal(fireSheetRows({ ...one, kind: 'floor', rate: 0.04, invested: 2000000 })[0].withdrawal, 54000);
  // Guardrails: the first year's rate is 45,000 / 1,000,000 = 4.5%. After a 30% fall the rate taken is 45,000 / 668,500
  // = 6.7%, more than 4.5% x 1.2, so spending is cut 10% to 40,500.
  const g = fireSheetRows({ ...one, kind: 'guardrails', realReturn: -0.3 });
  assert.equal(g[0].withdrawal, 45000); near(g[0].firstRate, 0.045, 1e-12); near(g[0].balance, 668500, 0.001);
  near(g[1].dial, 0.9, 1e-12); near(g[1].withdrawal, 40500, 0.001);
  near(g[2].dial, 0.81, 1e-12);
  // And up: after strong growth the rate taken falls under 4.5% x 0.8, so spending is raised 10%.
  const up = fireSheetRows({ ...one, kind: 'guardrails', realReturn: 0.5 });
  near(up[1].dial, 1.1, 1e-12); near(up[1].withdrawal, 49500, 0.001);
});
test('money that runs out stays at zero: the withdrawal is never more than what is there', () => {
  const rows = fireSheetRows({ ...base, age: 60, stopAge: 60, lastAge: 70, invested: 100000, other: 0, realReturn: 0 });
  assert.deepEqual(rows.slice(0, 4).map(r => r.withdrawal), [45000, 45000, 10000, 0]);
  assert.ok(rows.every(r => r.balance >= 0));
});
test('each way to take money out that the sheet can write maps to one kind; the rest are named as carried', () => {
  assert.equal(fireKindOf('fixed'), 'steady'); assert.equal(fireKindOf('guyton_klinger'), 'guardrails'); assert.equal(fireKindOf('vpw'), null);
  // Every way either app has today is either written as a formula or carried: none falls through with no note.
  for (const s of STRATEGIES) assert.ok(fireKindOf(s.id) !== undefined);
  const known = [...STRATEGIES.map(s => s.id), ...RETIRE_METHOD_IDS].filter(id => fireKindOf(id));
  assert.ok(known.includes('fixed') && known.includes('guardrails') && known.includes('guyton_klinger') && known.includes('fixed_real'));
  assert.ok(Object.values(FIRE_KINDS).every(k => ['steady', 'share', 'floor', 'guardrails'].includes(k)));
});

// ---------- The tab ----------
test('the tab: inputs in a marked box at the top (blue), every year cell a formula on them (black)', async () => {
  const F = fireSheet(input());
  const rows = F.sheet.rows, flat = rows.map(r => (r || []).map(c => c?.v ?? (c?.f ? `=${c.f}` : null)));
  assert.equal(F.sheet.name, 'FIRE sheet'); assert.equal(flat[0][0], 'FIRE sheet');
  assert.deepEqual(flat[3], ['Inputs', null, 'A blue number is yours to change. A black number is worked out from the blue ones.']);
  const inputs = rows.filter(r => r?.[1]?.s === 'input');
  assert.ok(inputs.length >= 13, 'the input rows');
  assert.ok(inputs.every(r => typeof r[0].v === 'string' && typeof r[1].v === 'number'), 'a label and a number each');
  assert.ok(rows.indexOf(inputs.at(-1)) < F.first - 1, 'the inputs sit above the year rows');
  const head = rows[F.first - 2].map(c => c.v);
  for (const h of ['Year', 'Age', 'Stage', 'Income', 'Spending', 'Savings', 'Savings rate', 'Goes in: taxed later', 'Goes in: Roth', 'Goes in: taxable', 'Invested balance, end of year', 'FI number', '% to FI', 'Withdrawals']) assert.ok(head.includes(h), `column ${h}`);
  assert.ok(head.indexOf('Withdrawals') > head.indexOf('Invested balance, end of year') - 4);
  const years = rows.slice(F.first - 1);
  assert.equal(years.length, 56, 'one row a year, 35 to 90');
  assert.ok(years.every(r => r.every(c => c.f && c.s === 'formula')), 'every year cell is a formula');
  assert.ok(F.names.some(n => n.name === 'FIRE_StopAge' && /^'FIRE sheet'!\$B\$\d+$/.test(n.ref)));
  assert.deepEqual([...functionsOf({ sheets: [F.sheet] })].sort(), ['AND', 'IF', 'MAX', 'MIN', 'SUM']);
  assert.ok(F.sheet.conditional?.[0]?.formula.includes('$B$'), 'the stop age row is marked by a rule');
  // The colors in the file: an input is blue text, a formula is dark text; no red anywhere.
  if (!ExcelJS) return;
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await workbookBuffer(ExcelJS, { at: NOW, sheets: [F.sheet], names: F.names }));
  const ws = wb.getWorksheet(FIRE_TAB), inRow = rows.indexOf(inputs[0]) + 1;
  assert.equal(ws.getCell(inRow, 2).font.color.argb, 'FF1F4E9E', 'an input is blue');
  assert.equal(ws.getCell(F.first, 4).font.color.argb, 'FF1F2937', 'a formula is black');
  assert.equal(ws.getCell(inRow, 2).protection?.locked, false);
  const colors = new Set(); ws.eachRow(r => r.eachCell(c => { if (c.font?.color?.argb) colors.add(c.font.color.argb); if (c.fill?.fgColor?.argb) colors.add(c.fill.fgColor.argb); }));
  for (const argb of colors) { const [r, g, b] = [2, 4, 6].map(i => parseInt(argb.slice(i, i + 2), 16)); assert.ok(!(r > 180 && g < 110 && b < 110), `${argb} is red`); }
});
test('a way to take money out that a formula cannot follow: the live column says so, the app\'s values sit beside it', () => {
  const app = { from: 'app', note: 'The app counts tax.', years: [{ age: 50, withdrawal: 51234, balance: 900000 }, { age: 51, withdrawal: 50000, balance: 890000 }] };
  const F = fireSheet(input({ method: { id: 'a_way_added_later', name: 'A way added later' }, app }));
  assert.equal(F.model.known, false); assert.equal(F.model.kind, 'steady');
  const text = F.sheet.rows.flat().map(c => c?.v).filter(v => typeof v === 'string').join('\n');
  assert.match(text, /A spreadsheet cannot work out "A way added later" as a formula/);
  assert.match(text, /A spreadsheet cannot work these out, so the two "app" columns are values/);
  const head = F.sheet.rows[F.first - 2].map(c => c.v), w = head.indexOf('Withdrawals, from the app (A way added later)'), b = head.indexOf('Balance, from the app');
  assert.ok(w > 0 && b === w + 1);
  const at50 = F.sheet.rows[F.first - 1 + 15];
  assert.equal(at50[w].v, 51234); assert.equal(at50[b].v, 900000); assert.equal(at50[w].s, 'app'); assert.equal(at50[w].f, undefined, 'a value, not a formula');
  assert.equal(F.sheet.rows[F.first - 1][w].v, null, 'no value for a year the app has none: blank, not zero');
});
test('empty is not zero: with no age or no spending the tab says what it needs and has no rows', () => {
  const F = fireSheet({ needs: ['your birth year'] });
  assert.equal(F.rows, null); assert.equal(F.names.length, 0);
  assert.match(F.sheet.rows.at(-1)[0].v, /This tab needs your birth year\. Add it in the app, then export again\./);
  assert.equal(fireModel(input({ invested: null })), null);
});
test('the blank FIRE sheet button: Eli\'s copy link, and words that say what it is', () => {
  assert.equal(FIRE_TEMPLATE_URL, 'https://docs.google.com/spreadsheets/d/1HZBHzEeDgQRmGcqwzaXW1jgd2N3SPSddZkhS7svZhHY/copy');
  const html = fireBlankButton({ button: 'btn' });
  assert.ok(html.includes(`href="${FIRE_TEMPLATE_URL}"`) && html.includes('class="btn"') && html.includes('target="_blank"') && html.includes('rel="noopener"'));
  assert.equal(FIRE_WORDS.blank, 'Start from a blank FIRE sheet');
  assert.match(FIRE_WORDS.blankLine, /simple sheet that stands alone/); assert.match(FIRE_WORDS.blankLine, /No SLAM account needed/); assert.match(FIRE_WORDS.blankLine, /full plan/);
  assert.equal(FIRE_WORDS.xlsx, 'Download for Excel or Google Sheets (.xlsx)');
  assert.match(FIRE_WORDS.sheetsHelp, /^Open in Google Sheets: .*File, Import, Upload/);
  // One definition for both apps: the game loads this file as a script, the web app's module reads the same object.
  const src = readFileSync(join(root, 'game/features/firelink.js'), 'utf8');
  assert.ok(src.includes(FIRE_TEMPLATE_URL)); assert.ok(readFileSync(join(root, 'game/index.html'), 'utf8').includes('features/firelink.js'));
  assert.ok(!readFileSync(join(root, 'js/sheet/fire.js'), 'utf8').includes('docs.google.com'), 'the link is written once');
});

// ---------- The web app's workbook ----------
test('the web app: the FIRE sheet is the first tab, built from the lifetime plan\'s input and its chosen way', () => {
  const doc = demo();
  const plan = buildWorkbook(doc, ref, { now: NOW, hist });
  assert.equal(plan.sheets[0].name, 'FIRE sheet'); assert.equal(plan.sheets[1].name, 'Start here');
  const fire = plan.sheets[0], text = fire.rows.flat().map(c => c?.v).filter(v => typeof v === 'string');
  assert.ok(text.includes('Way to take money out') && text.includes('Steady spending'), 'the default way');
  assert.ok(text.some(t => /^Past stretches of market history where the money lasted \(1871 to \d{4}\)$/.test(t)), 'the replay of history, carried');
  assert.ok(text.some(t => /^Random markets where the money lasted \(1,000 runs\)$/.test(t)), 'the random markets, carried');
  assert.ok(text.filter(t => /A spreadsheet cannot/.test(t)).length >= 3, 'each carried value says a spreadsheet cannot work it out');
  assert.ok(plan.names.some(n => n.name === 'FIRE_Invested'));
  // Another way picked on the Lifetime plan flows in: its name on the tab, its own run in the app columns.
  doc.assumptions.lifeStrategy = 'percent';
  const p2 = buildWorkbook(doc, ref, { now: NOW }), t2 = p2.sheets[0].rows.flat().map(c => c?.v).filter(v => typeof v === 'string');
  assert.ok(t2.includes('A share of the portfolio')); assert.ok(t2.includes('Share of the balance taken each year'));
  assert.ok(!t2.some(t => /^Past stretches/.test(t)), 'with no history data the two rows are left out, not made up');
  const head = p2.sheets[0].rows.find(r => r?.[0]?.v === 'Year' && r[0].s === 'head').map(c => c.v);
  assert.ok(head.includes('Withdrawals, from the app (A share of the portfolio)'));
});
test('the web app: no birth year, no rows (the tab says what it needs); the workbook still builds', () => {
  const doc = demo(); doc.profile.birthYear = null; doc.profile.age = null;
  const plan = buildWorkbook(doc, ref, { now: NOW });
  assert.equal(plan.sheets[0].name, 'FIRE sheet');
  assert.match(plan.sheets[0].rows.at(-1)[0].v, /This tab needs your birth year/);
});
test('Google Sheets: every formula of the web app\'s workbooks uses only functions on the list', () => {
  const used = new Set();
  for (const [, make] of HOUSEHOLDS) for (const f of functionsOf(buildWorkbook(make(), ref, { now: NOW, hist }))) used.add(f);
  const off = [...used].filter(f => !GOOGLE_SHEETS_OK.has(f));
  assert.deepEqual(off, [], 'functions not checked for Google Sheets');
  assert.ok(used.size >= 30);
});

// ---------- LibreOffice works the formulas out ----------
const val = v => (v && typeof v === 'object' && !(v instanceof Date) ? (v.error ? `#ERR ${v.error}` : v.formula || v.sharedFormula ? (v.result && typeof v.result === 'object' && v.result.error ? `#ERR ${v.result.error}` : v.result ?? 0) : v.richText ? v.richText.map(t => t.text).join('') : v.result ?? null) : v);
async function recalc(files) { // { name: plan } -> { name: ExcelJS workbook after LibreOffice worked every formula out }
  const dir = mkdtempSync(join(tmpdir(), 'slam-fire-'));
  try {
    mkdirSync(join(dir, 'out'));
    for (const [name, plan] of Object.entries(files)) writeFileSync(join(dir, `${name}.xlsx`), Buffer.from(await workbookBuffer(ExcelJS, plan, { cache: false })));
    execFileSync(soffice, [`-env:UserInstallation=file://${join(dir, 'profile')}`, '--headless', '--calc', '--convert-to', 'xlsx', '--outdir', join(dir, 'out'), ...Object.keys(files).map(n => join(dir, `${n}.xlsx`))], { timeout: 600000, stdio: 'ignore' });
    const out = {};
    for (const name of Object.keys(files)) { const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(join(dir, 'out', `${name}.xlsx`)); out[name] = wb; }
    return out;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const errorsIn = wb => { const bad = []; wb.eachSheet(ws => ws.eachRow(row => row.eachCell(c => { const v = val(c.value); if (typeof v === 'string' && /^#ERR|^#(NAME|VALUE|REF|DIV|N\/A|NUM)|^Err:/.test(v)) bad.push(`${ws.name}!${c.address}: ${v}`); }))); return bad; };
// Every cell of a plan that has a formula and an expected (cached) value, against what LibreOffice gives.
function cachedOff(plan, wb) {
  const off = [];
  for (const s of plan.sheets) { const ws = wb.getWorksheet(s.name);
    s.rows.forEach((row, ri) => (row || []).forEach((cell, ci) => {
      if (!cell?.f || cell.cached === undefined || cell.cached === null) return;
      const got = val(ws.getCell(ri + 1, ci + 1).value), want = cell.cached;
      const same = typeof want === 'number' && typeof got === 'number' ? Math.abs(got - want) <= Math.max(0.011, Math.abs(want) * 1e-9) : String(got ?? '') === String(want ?? '') || (want === '' && (got === 0 || got === null)) || (want === 0 && got === '');
      if (!same) off.push(`${s.name}!${ws.getCell(ri + 1, ci + 1).address}: sheet ${got}, expected ${want}`);
    })); }
  return off;
}

test('LibreOffice: every cell of the FIRE sheet, for each way to take money out, gives what the math gives; no error cell', { skip: missing, timeout: 600000 }, async () => {
  const cases = {
    steady: input(), share: input({ method: { id: 'percent', name: 'A share of the portfolio' }, rate: 0.045 }), floor: input({ method: { id: 'floor', name: 'Floor and ceiling' }, rate: 0.05 }),
    guardrails: input({ method: { id: 'guardrails', name: 'Guardrails' }, realReturn: 0.07 }), guardcut: input({ method: { id: 'guyton_klinger', name: 'Guardrails' }, realReturn: -0.03, invested: 1500000, stopAge: 36 }),
    flat: input({ realReturn: 0, income: 0, safeRate: 0.035 }), stopped: input({ stopAge: 30, otherAge: 62 }), short: input({ invested: 40000, stopAge: 40, other: 0 }),
  };
  const plans = Object.fromEntries(Object.entries(cases).map(([k, i]) => { const F = fireSheet(i); return [k, { at: NOW, sheets: [F.sheet], names: F.names }]; }));
  const done = await recalc(plans);
  for (const k of Object.keys(cases)) {
    assert.deepEqual(errorsIn(done[k]), [], `${k}: error cells`);
    assert.deepEqual(cachedOff(plans[k], done[k]), [], `${k}: cells where the sheet and the math differ`);
  }
});
test('LibreOffice: change one blue input and the whole sheet reflows to the new answer', { skip: missing, timeout: 600000 }, async () => {
  // The file is built for a stop age of 50 and 5% growth. Only two input cells are then changed, the way a person
  // would in the sheet (stop at 55, 4% growth); every formula is left as it was written.
  const F = fireSheet(input({ method: { id: 'guardrails', name: 'Guardrails' } }));
  const rows = F.sheet.rows.map(r => (r || []).map(c => (c ? { ...c } : c)));
  const set = (label, v) => { const r = rows.find(x => x?.[0]?.v === label); assert.ok(r, label); r[1] = { ...r[1], v }; };
  set('Age you stop work', 55); set('Growth a year, after prices rise', 0.04);
  const done = await recalc({ moved: { at: NOW, sheets: [{ ...F.sheet, rows }], names: F.names } });
  const want = fireSheetRows({ ...F.model, stopAge: 55, realReturn: 0.04 }), ws = done.moved.getWorksheet(FIRE_TAB);
  const col = k => F.cols.indexOf(k) + 1;
  want.forEach((w, i) => {
    const r = F.first + i;
    near(val(ws.getCell(r, col('balance')).value), w.balance, 0.011); near(val(ws.getCell(r, col('withdrawal')).value), w.withdrawal, 0.011);
    assert.equal(val(ws.getCell(r, col('stage')).value), w.stage); near(val(ws.getCell(r, col('dial')).value), w.dial, 1e-9);
  });
  assert.equal(want.find(w => w.stage === 'Stop work').age, 55);
  assert.notEqual(Math.round(want.at(-1).balance), Math.round(F.rows.at(-1).balance), 'the answer moved');
});

// ---------- The game: the same engine writes its file ----------
// The game's scripts run in its own test harness (classic scripts, one global scope); a small script there prints the
// data the Export button hands to js/sheet/planbook.js.
function gameData() {
  const dir = mkdtempSync(join(tmpdir(), 'slam-gamebook-')), file = join(dir, 'print.js');
  try {
    writeFileSync(file, `{ const R0 = r => Object.assign({ s: true }, r), a = Object.assign(newChar(), { name: "Fire", led: true, placed: true, age: 38, ret: 60, take: 6500, spend: 4500, inv: 120000,
      incs: [R0({ k: "A main job", amt: 6500 })], spends: [R0({ k: "Home", amt: 2500 }), R0({ k: "Food", amt: 2000 })], cashes: [R0({ k: "Checking", amt: 12000 })],
      invs: [R0({ k: "Retirement plan at work", amt: 80000 }), R0({ k: "Other investments", amt: 40000 })], debts: [R0({ k: "Credit card balance", amt: 3000, high: true, apr: "15% to 25%", rate: 20, pay: 150 })] });
      G.demo = false; G.tourSeen = true; G.chars.push(a); G.active = G.chars.length - 1; syncAll(a); save(); go("home");
      const c = C(), wait = n => { if (oddsTabs(c) || n > 400) console.log("DATA" + JSON.stringify(bookWorkbookData(c)) + "ENDDATA"); else setTimeout(() => wait(n + 1), 25); }; wait(0); }`);
    const r = spawnSync(process.execPath, [join(root, 'game/tests/harness.cjs'), file], { encoding: 'utf8', maxBuffer: 1 << 28, timeout: 170000 });
    const m = /DATA(\{.*\})ENDDATA/s.exec(r.stdout || '');
    assert.ok(m, `the game printed its workbook data: ${(r.stdout || '').slice(-300)} ${(r.stderr || '').slice(-300)}`);
    return JSON.parse(m[1]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
let GAME = null; const game = () => (GAME ??= gameData());

test('the game: its workbook is the FIRE sheet, the plan with live formulas, and the engine tables, from the one engine', () => {
  const D = game(), plan = planBookPlan(D);
  assert.deepEqual(plan.sheets.map(s => s.name), ['FIRE sheet', 'My plan', 'Percentiles', 'Cash flow', 'Withdrawals']);
  const my = plan.sheets[1].rows, formulas = my.filter(r => r?.[2]?.f), inputs = my.filter(r => r?.[2]?.s === 'input');
  assert.ok(formulas.length > 40 && inputs.length > 20, `${formulas.length} formulas, ${inputs.length} inputs`);
  assert.ok(formulas.every(r => !/^=/.test(r[2].f) && /C\d+/.test(r[2].f)), 'a formula points at cells of the Value column');
  const used = [...functionsOf(plan)];
  assert.deepEqual(used.filter(f => !GOOGLE_SHEETS_OK.has(f)), [], 'functions not checked for Google Sheets');
  assert.ok(used.every(f => ['IF', 'AND', 'OR', 'MIN', 'MAX', 'SUM', 'ROUND', 'FV', 'PMT'].includes(f)), used.join(' '));
  // The FIRE sheet: the game's default way (guardrails) as a live formula, and the game's own random-market values carried.
  assert.equal(plan.fire.model.kind, 'guardrails'); assert.equal(plan.fire.rows.length, 90 - 38 + 1);
  assert.ok(plan.fire.cols.includes('appW') && D.fire.app.years.some(y => y.withdrawal > 0));
  assert.match(D.fire.app.note, /1,000 random markets/);
  for (const t of plan.sheets.slice(2)) assert.match(t.rows[1][0].v, /A spreadsheet cannot run them/);
  // The game has no writer of its own: its file is this module's, written by js/sheet/excel.js.
  const src = readFileSync(join(root, 'game/features/book.js'), 'utf8');
  assert.match(src, /import\("\.\.\/\.\.\/js\/sheet\/planbook\.js"\)/); assert.ok(!/ExcelJS|new Blob\(\[.*xlsx/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
  assert.match(readFileSync(join(root, 'js/sheet/planbook.js'), 'utf8'), /from '\.\/excel\.js'/);
});
test('the game: the file comes back in through the same module, and only plain values of the plan tab are read', { skip: !ExcelJS && 'ExcelJS is not installed: run npm install' }, async () => {
  const D = game(), plan = planBookPlan(D);
  const grid = await readWorkbook(ExcelJS, await workbookBuffer(ExcelJS, plan));
  const lines = planBookText(grid).split('\n').map(l => l.split('\t'));
  assert.equal(lines.length, D.rows.length + 1);
  const age = lines.find(l => l[1] === 'Age'), fRow = D.rows.findIndex(r => r.f) + 1;
  assert.equal(age[2], '38'); assert.equal(lines[fRow][2], '', 'a formula cell is left out: the game changes only plain values');
  assert.ok(grid[PLAN_TAB] && grid['FIRE sheet']);
});
test('LibreOffice: the game\'s workbook recalculates with no error cell, and each formula gives the game\'s number', { skip: missing, timeout: 600000 }, async () => {
  const plan = planBookPlan(game());
  const done = await recalc({ game: plan });
  assert.deepEqual(errorsIn(done.game), [], 'error cells');
  // The game's own numbers are whole or rounded where its screens round, so a formula may differ in the cents.
  const off = cachedOff(plan, done.game).filter(line => { const m = /sheet (-?[\d.e+-]+), expected (-?[\d.e+-]+)/.exec(line); return !m || Math.abs(Number(m[1]) - Number(m[2])) > Math.max(1, Math.abs(Number(m[2])) * 0.001); });
  assert.deepEqual(off, [], 'cells where the sheet and the game differ');
});
test('the lifetime plan\'s own run is what the app columns carry (one function, the chosen way)', () => {
  const doc = demo(); doc.assumptions.lifeStrategy = 'guardrails';
  const plan = buildWorkbook(doc, ref, { now: NOW });
  const fire = plan.sheets[0], headAt = fire.rows.findIndex(r => r?.[0]?.v === 'Year' && r[0].s === 'head'), head = fire.rows[headAt].map(c => c.v);
  const w = head.findIndex(h => /^Withdrawals, from the app \(Guardrails\)$/.test(h)), b = head.indexOf('Balance, from the app');
  assert.ok(w > 0 && b > 0);
  const vals = fire.rows.slice(headAt + 1).map(r => [r[1].cached, r[w].v, r[b].v]);
  assert.ok(vals.some(v => v[1] > 0), 'withdrawals after the stop age'); assert.ok(vals.every(v => typeof v[2] === 'number'), 'a balance every year');
  assert.ok(vals.filter(v => v[1] === null).length > 0, 'no withdrawal while working: blank');
});
