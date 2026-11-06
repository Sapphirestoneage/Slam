// SPDX-License-Identifier: AGPL-3.0-only
// Google Sheets first (Eli, Nov 6 2026: "sheet for me, app for clients", in Google Sheets). Reads a workbook plan
// (js/sheet/workbook.js) and lists every formula that would not work the same in Google Sheets:
//   1. a function that is not on Google Sheets' function list (data/google-sheets-functions.json, from
//      support.google.com/docs/table/25273);
//   2. a range of more than one cell used where one value is wanted. Excel and LibreOffice quietly take the cell on the
//      formula's own row (implicit intersection); Google Sheets does not, so a range is fine only inside SUMPRODUCT or
//      as a whole argument of a function that takes a range (SUM, SUMIFS, COUNTIFS, INDEX, MATCH ...);
//   3. an Excel-only form: a structured table reference (Table1[Col]), a spill (#), an _xlfn. or _xlws. prefix;
//   4. a range name Sheets will not take (starting with true or false, or shaped like a cell), a dropdown from a name.
// test/sheets.test.js runs it on every household. Run by hand: node tools/sheets-check.mjs
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SHEETS_FUNCTIONS = new Set(JSON.parse(readFileSync(join(root, 'data', 'google-sheets-functions.json'), 'utf8')).functions);
const RANGE_FNS = new Set(['SUM', 'SUMIF', 'SUMIFS', 'COUNT', 'COUNTA', 'COUNTIF', 'COUNTIFS', 'COUNTBLANK', 'MAX', 'MIN', 'MAXIFS', 'MINIFS',
  'AVERAGE', 'AVERAGEIF', 'AVERAGEIFS', 'INDEX', 'MATCH', 'LOOKUP', 'VLOOKUP', 'HLOOKUP', 'LARGE', 'SMALL', 'ROWS', 'COLUMNS', 'MEDIAN', 'PRODUCT', 'SUMSQ', 'NPV', 'IRR']);
const CELL_RANGE = /^(?:'(?:[^']|'')*'!|[A-Za-z_][\w.]*!)?\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+$/;

// Every problem in one formula: [text]. multi: the names that stand for more than one cell.
export function formulaProblems(f, multi) {
  const out = [];
  const t = f.replace(/"(?:[^"]|"")*"/g, '""');
  if (/\b_xl(fn|ws)\./i.test(t)) out.push('an Excel-only _xlfn. function');
  if (/[A-Za-z_]\w*\[[^\]]*\]/.test(t)) out.push('a structured table reference');
  if (/[A-Z]+\d+#/.test(t)) out.push('a spill reference (#)');
  const stack = [];
  const re = /('(?:[^']|'')*'!\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?|\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+|[A-Za-z_][A-Za-z0-9_.]*\s*\(|[A-Za-z_][A-Za-z0-9_.]*|\(|\)|,)/g;
  let m, prev = '(';
  while ((m = re.exec(t))) {
    const tok = m[0];
    if (tok.endsWith('(') && tok.length > 1) {
      const fn = tok.slice(0, -1).trim().toUpperCase();
      if (!SHEETS_FUNCTIONS.has(fn)) out.push(`${fn} is not a Google Sheets function`);
      stack.push(fn); prev = '('; continue;
    }
    if (tok === '(') { stack.push(''); prev = '('; continue; }
    if (tok === ')') { stack.pop(); prev = ')'; continue; }
    if (tok === ',') { prev = ','; continue; }
    const isRange = CELL_RANGE.test(tok) || multi.has(tok);
    if (isRange && !stack.includes('SUMPRODUCT')) {
      const after = t.slice(m.index + tok.length).trimStart()[0];
      const whole = (prev === '(' || prev === ',') && (after === ',' || after === ')');
      const inner = [...stack].reverse().find(x => x !== '') ?? '';
      if (!(whole && RANGE_FNS.has(stack.at(-1)))) out.push(`${tok} is a range used for one value${inner ? ` in ${inner}` : ''} (Sheets has no implicit intersection)`);
    }
    prev = 'x';
  }
  return out;
}

// Every problem in a plan: [{ where, formula, problem }].
export function sheetsProblems(plan) {
  const multi = new Set(plan.names.filter(n => /:/.test(n.ref)).map(n => n.name));
  const out = [];
  for (const s of plan.sheets) s.rows.forEach((row, ri) => (row || []).forEach((cell, ci) => {
    if (!cell?.f) return;
    for (const p of formulaProblems(cell.f, multi)) out.push({ where: `${s.name}!R${ri + 1}C${ci + 1}`, formula: cell.f, problem: p });
  }));
  for (const n of plan.names) if (!/^[A-Za-z_][A-Za-z0-9_]{0,249}$/.test(n.name) || /^(true|false)/i.test(n.name) || /^[A-Za-z]{1,3}\d+$/.test(n.name) || /^R\d*C\d*$/i.test(n.name)) out.push({ where: n.ref, formula: n.name, problem: 'a range name Google Sheets does not take' });
  for (const s of plan.sheets) if (s.name.length > 100 || /[[\]:*?/\\]/.test(s.name)) out.push({ where: s.name, formula: '', problem: 'a tab name a spreadsheet does not take' });
  for (const s of plan.sheets) for (const v of s.validations || []) if (v.ref && !CELL_RANGE.test(v.ref)) out.push({ where: `${s.name}!${v.col}${v.from}`, formula: v.ref, problem: 'a dropdown list from a name, not a range (Sheets keeps a range)' });
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { HOUSEHOLDS, NOW } = await import('./workbook-check.mjs');
  const { buildWorkbook } = await import('../js/sheet/workbook.js');
  const ref = JSON.parse(readFileSync(join(root, 'data', 'reference-2026.json'), 'utf8'));
  let n = 0;
  for (const [label, make] of HOUSEHOLDS) {
    const list = sheetsProblems(buildWorkbook(make(), ref, { now: NOW, coach: true }));
    const kinds = [...new Set(list.map(p => p.problem.replace(/^\S+ /, '')))];
    console.log(`${label}: ${list.length ? `${list.length} formulas` : 'Sheets-safe'}${kinds.length ? ` (${kinds.slice(0, 4).join('; ')})` : ''}`);
    for (const p of list.slice(0, 5)) console.log(`  ${p.where}: ${p.problem}: ${p.formula.slice(0, 160)}`);
    n += list.length;
  }
  process.exit(n ? 1 : 0);
}
