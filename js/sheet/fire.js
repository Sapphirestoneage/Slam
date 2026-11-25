// SPDX-License-Identifier: AGPL-3.0-only
// The FIRE sheet tab: the first tab of the workbook, in the layout people who keep a FIRE spreadsheet expect. One row
// for each year from today to the plan's last year. The inputs sit at the top in a marked box (blue: yours to change);
// every other cell is a live formula on them (black), so one changed input reflows the whole sheet. The steps are the
// ones in js/math/firesheet.js (fireSheetRows), written here as formulas; the cached values come from that function.
// What a spreadsheet cannot work out (the app's own plan with its tax rules, a replay of market history, random
// markets) is carried as values, each with a note that says so.
// One builder for both apps: the web app's workbook (js/sheet/workbook.js) and the game (js/sheet/planbook.js) both
// call fireSheet() with the same kind of input. Pure: no DOM, no storage. Only IF, AND, OR, MIN, MAX and SUM are used,
// so the tab opens the same in Google Sheets, Excel and LibreOffice (test/firesheet.test.js keeps the list).
import { fireSheetRows, fireKindOf, fireThrough, FIRE_GUARD, FIRE_FLOOR } from '../math/firesheet.js';
import '../../game/features/firelink.js';

export const FIRE_TAB = 'FIRE sheet';
// The button "Start from a blank FIRE sheet" and the words beside the Export buttons live in one file that the game
// loads as a classic script and this module loads here (game/features/firelink.js), so both apps show the same thing.
const LINK = globalThis.SLAM_FIRE_LINK;
export const FIRE_TEMPLATE_URL = LINK.url;
export const FIRE_WORDS = LINK.words;
export const fireBlankButton = opts => LINK.button(opts);
const letter = n => { let s = ''; for (let i = n; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
const abs = (col, r) => `'${FIRE_TAB}'!$${col}$${r}`;
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// The x of fireSheetRows from the input both apps give. Null when a number the rows need is not there (empty is not zero).
export function fireModel(input) {
  if (!input || [input.age, input.stopAge, input.lastAge, input.spendingAfter, input.invested].some(v => num(v) === null)) return null;
  const kind = fireKindOf(input.method?.id);
  return { year: input.year, age: input.age, stopAge: input.stopAge, lastAge: input.lastAge, income: num(input.income) ?? 0, spending: num(input.spending) ?? 0, spendingAfter: input.spendingAfter,
    invested: input.invested, contributions: (input.contributions || []).map(c => num(c.amount) ?? 0), realReturn: num(input.realReturn) ?? 0, safeRate: num(input.safeRate) ?? 0.04,
    other: num(input.other) ?? 0, otherAge: num(input.otherAge) ?? input.stopAge, kind: kind ?? 'steady', rate: num(input.rate) ?? 0.04, known: kind !== null };
}

// input: { year, age, stopAge, lastAge, income, incomeLabel, spending, spendingAfter, invested,
//          contributions: [{ label, amount a year }], realReturn, safeRate, other, otherAge, otherLabel,
//          method: { id, name }, rate, app: { from, note, years: [{ age, withdrawal, balance }] } | null,
//          carried: [{ label, value, fmt, note }], needs: [words], back: words }
// Out: { sheet, names: [{ name, ref }], model, rows } (model and rows null when the tab only says what it needs).
export function fireSheet(input) {
  const x = fireModel(input), R = [], names = [];
  const push = cells => { R.push(cells); return R.length; };
  push([{ v: 'FIRE sheet', s: 'title' }]);
  push([{ v: 'One row for each year from today to the last year of your plan, in today\'s dollars. Change a blue number and every row follows.', s: 'about' }]);
  if (!x) {
    push([]);
    push([{ v: `This tab needs ${(input?.needs?.length ? input.needs : ['your age', 'what you spend', 'what you have invested']).join(', ')}. Add ${input?.needs?.length === 1 ? 'it' : 'them'} in the app, then export again.`, s: 'label' }]);
    return { sheet: { name: FIRE_TAB, kind: 'fire', rows: R, widths: [90] }, names, model: null, rows: null };
  }
  const rows = fireSheetRows(x), through = fireThrough(x.realReturn);
  push([]);
  push([{ v: 'Inputs', s: 'band' }, { v: null, s: 'band' }, { v: 'A blue number is yours to change. A black number is worked out from the blue ones.', s: 'band' }]);
  const N = {}, rowOf = {}; // short key -> named range, and its row
  const inputRow = (key, label, v, fmt, note) => { const r = push([{ v: label, s: 'label' }, { v, s: 'input', fmt }, { v: note ?? null, s: 'note' }]); N[key] = `FIRE_${key}`; rowOf[key] = r; names.push({ name: N[key], ref: abs('B', r) }); return r; };
  inputRow('Year', 'Year the sheet starts', x.year, 'day');
  inputRow('Age', 'Your age now', x.age, 'day');
  inputRow('StopAge', 'Age you stop work', x.stopAge, 'day', 'The row of this age is marked "Stop work".');
  inputRow('LastAge', 'Last age of the plan', x.lastAge, 'day', 'The rows are made to this age when the file is made. To plan further, copy the last row down.');
  inputRow('Income', input.incomeLabel || 'Income a year', x.income, 'money');
  inputRow('Spending', 'Spending a year now', x.spending, 'money');
  inputRow('SpendAfter', 'Spending a year after you stop work', x.spendingAfter, 'money');
  inputRow('Invested', 'Invested now', x.invested, 'money');
  const cNames = x.contributions.map((amt, i) => { inputRow(`In${i + 1}`, `Goes in a year: ${input.contributions[i].label}`, amt, 'money'); return N[`In${i + 1}`]; });
  inputRow('Return', 'Growth a year, after prices rise', x.realReturn, 'pct', 'Today\'s dollars all the way down: this is the return above inflation.');
  inputRow('SafeRate', 'Rate for the FI number', x.safeRate, 'pct', 'FI number = spending after you stop, divided by this rate. 4% gives 25 times spending.');
  inputRow('Other', input.otherLabel || 'Other income a year after you stop (Social Security, a pension)', x.other, 'money');
  inputRow('OtherAge', 'That income starts at age', x.otherAge, 'day');
  if (x.kind === 'share' || x.kind === 'floor') inputRow('Rate', 'Share of the balance taken each year', x.rate, 'pct');
  const tr = push([{ v: 'Growth on money added through the year', s: 'label' }, { f: `IF(FIRE_Return=0,1,FIRE_Return/(12*((1+FIRE_Return)^(1/12)-1)))`, s: 'formula', fmt: 'number', cached: through }, { v: 'What goes in arrives a twelfth each month, so it grows for part of the year.', s: 'note' }]);
  names.push({ name: 'FIRE_Through', ref: abs('B', tr) });
  const methodName = input.method?.name || 'The same amount each year';
  push([{ v: 'Way to take money out', s: 'label' }, { v: methodName, s: 'text' }, { v: 'Chosen in the app. To change it, change it there and export again.', s: 'note' }]);
  push([]);
  // The notes: what is live, what is carried.
  const LIVE = { steady: 'the same amount each year: what your life costs, less the other income', share: 'a set share of the balance each year', floor: `a set share of the balance, never under ${FIRE_FLOOR.low * 100}% and never over ${FIRE_FLOOR.high * 100}% of what your life costs`, guardrails: `guardrails: start at what your life costs, cut ${FIRE_GUARD.step * 100}% when the rate you take drifts ${FIRE_GUARD.band * 100}% above the first year's, raise ${FIRE_GUARD.step * 100}% when it drifts ${FIRE_GUARD.band * 100}% below` };
  push([{ v: x.known ? `Withdrawals follow your way to take money out (${methodName}): ${LIVE[x.kind]}.` : `A spreadsheet cannot work out "${methodName}" as a formula. The live Withdrawals column uses the same amount each year instead. The values of "${methodName}" are in the two "${input.app?.from || 'app'}" columns.`, s: 'note' }]);
  push([{ v: 'This sheet is a simple model so that every cell can be a formula: no income tax, one balance, the same growth each year. That is why its numbers differ from the app.', s: 'note' }]);
  if (input.app?.years?.length) push([{ v: `${input.app.note} A spreadsheet cannot work these out, so the two "${input.app.from}" columns are values: they stay the same when you change an input.`, s: 'note' }]);
  if (input.back) push([{ v: input.back, s: 'note' }]);
  for (const c of input.carried || []) push([{ v: c.label, s: 'label' }, { v: c.value, s: 'app', fmt: c.fmt ?? 'number' }, { v: c.note, s: 'note' }]);
  push([]);

  // ---------- The year rows ----------
  const cols = [
    { key: 'year', head: 'Year', fmt: 'day', w: 8 }, { key: 'age', head: 'Age', fmt: 'day', w: 7 }, { key: 'stage', head: 'Stage', fmt: 'text', w: 17 },
    { key: 'income', head: 'Income', fmt: 'money', w: 13 }, { key: 'spending', head: 'Spending', fmt: 'money', w: 13 }, { key: 'savings', head: 'Savings', fmt: 'money', w: 13 }, { key: 'savingsRate', head: 'Savings rate', fmt: 'pct', w: 10 },
    ...x.contributions.map((_, i) => ({ key: `in${i}`, head: `Goes in: ${input.contributions[i].label}`, fmt: 'money', w: 16 })),
    { key: 'balance', head: 'Invested balance, end of year', fmt: 'money', w: 16 }, { key: 'fiNumber', head: 'FI number', fmt: 'money', w: 14 }, { key: 'pctToFi', head: '% to FI', fmt: 'pct', w: 9 },
    { key: 'withdrawal', head: 'Withdrawals', fmt: 'money', w: 14 },
    ...(x.kind === 'guardrails' ? [{ key: 'dial', head: 'Guardrails: share of full spending', fmt: 'pct', w: 14 }, { key: 'firstRate', head: 'Guardrails: the first year\'s rate', fmt: 'pct', w: 14 }] : []),
    ...(input.app?.years?.length ? [{ key: 'appW', head: `Withdrawals, from the ${input.app.from} (${methodName})`, fmt: 'money', w: 18, app: true }, { key: 'appB', head: `Balance, from the ${input.app.from}`, fmt: 'money', w: 16, app: true }] : []),
  ];
  cols.forEach((c, i) => { c.col = letter(i + 1); });
  const L = Object.fromEntries(cols.map(c => [c.key, c.col]));
  const headRow = push(cols.map(c => ({ v: c.head, s: 'head' })));
  const first = headRow + 1, appBy = new Map((input.app?.years || []).map(y => [y.age, y]));
  rows.forEach((row, k) => {
    const r = first + k, p = r - 1, one = k === 0;
    const start = one ? 'FIRE_Invested' : `${L.balance}${p}`, age = `${L.age}${r}`, work = `${age}<FIRE_StopAge`, inc = `${L.income}${r}`;
    const dialPrev = one ? '1' : `${L.dial}${p}`;
    const target = x.kind === 'share' ? `${start}*FIRE_Rate` : x.kind === 'floor' ? `MIN(FIRE_SpendAfter*${FIRE_FLOOR.high},MAX(FIRE_SpendAfter*${FIRE_FLOOR.low},${start}*FIRE_Rate))` : x.kind === 'guardrails' ? `FIRE_SpendAfter*${L.dial}${r}` : 'FIRE_SpendAfter';
    const F = {
      year: one ? 'FIRE_Year' : `${L.year}${p}+1`,
      age: one ? 'FIRE_Age' : `${L.age}${p}+1`,
      stage: `IF(${age}=FIRE_StopAge,"Stop work",IF(${work},"Working","Living on the plan"))`,
      income: `IF(${work},FIRE_Income,IF(${age}>=FIRE_OtherAge,FIRE_Other,0))`,
      spending: `IF(${work},FIRE_Spending,${L.withdrawal}${r}+${inc})`,
      savings: x.contributions.length ? `SUM(${L.in0}${r}:${L[`in${x.contributions.length - 1}`]}${r})` : '0',
      savingsRate: `IF(AND(${work},${inc}>0),${L.savings}${r}/${inc},"")`,
      balance: `IF(${work},${start}*(1+FIRE_Return)+${L.savings}${r}*FIRE_Through,(${start}-${L.withdrawal}${r})*(1+FIRE_Return))`,
      fiNumber: 'IF(FIRE_SafeRate>0,FIRE_SpendAfter/FIRE_SafeRate,"")',
      pctToFi: `IF(FIRE_SafeRate>0,IF(FIRE_SpendAfter>0,${L.balance}${r}/${L.fiNumber}${r},""),"")`,
      withdrawal: `IF(${work},0,MIN(${start},MAX(0,${target}-${inc})))`,
      dial: `IF(${work},1,IF(${L.firstRate}${r}=0,${dialPrev},MAX(${FIRE_GUARD.low},IF(FIRE_SpendAfter*${dialPrev}>${L.firstRate}${r}*${1 + FIRE_GUARD.band}*${start},${dialPrev}*${1 - FIRE_GUARD.step},IF(AND(FIRE_SpendAfter*${dialPrev}<${L.firstRate}${r}*${1 - FIRE_GUARD.band}*${start},${dialPrev}<${FIRE_GUARD.high}),${dialPrev}*${1 + FIRE_GUARD.step},${dialPrev})))))`,
      firstRate: one ? `IF(${work},0,IF(${start}>0,FIRE_SpendAfter/${start},0))` : `IF(${work},0,IF(${L.age}${p}<FIRE_StopAge,IF(${start}>0,FIRE_SpendAfter/${start},0),${L.firstRate}${p}))`,
    };
    x.contributions.forEach((_, i) => { F[`in${i}`] = `IF(${work},${cNames[i]},0)`; });
    const a = appBy.get(row.age);
    push(cols.map(c => {
      if (c.app) return { v: a ? num(c.key === 'appW' ? a.withdrawal : a.balance) : null, s: 'app', fmt: 'money' };
      const v = c.key.startsWith('in') && c.key !== 'income' ? row.contributions[Number(c.key.slice(2))] : row[c.key];
      return { f: F[c.key], s: 'formula', fmt: c.fmt, cached: v === null || v === undefined ? '' : v };
    }));
  });
  const last = R.length;
  return {
    sheet: { name: FIRE_TAB, kind: 'fire', rows: R, widths: [Math.max(48, cols[0].w), 16, ...cols.slice(2).map(c => c.w)], headRows: [headRow],
      // The stop age stands out: its whole row, in a soft band (not a color that warns).
      conditional: [{ ref: `A${first}:${letter(cols.length)}${last}`, formula: `$B${first}=$B$${rowOf.StopAge}`, fill: 'FFDDEBF7', bold: true }] },
    names, model: x, rows, first, cols: cols.map(c => c.key),
  };
}
