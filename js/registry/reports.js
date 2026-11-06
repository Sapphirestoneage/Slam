// SPDX-License-Identifier: AGPL-3.0-only
// The report tabs of the workbook (Statements, FOO, Projections), declared as tables: their columns, their rows, and
// each cell as a formula (off the Inputs and Math tabs), a value, or the app's own number to check against. The
// export builds these tabs from this file only. Formulas use named ranges and, inside a table, {col:key} for this
// row's cell in that column and {prev:key} for the row above.
import { ASSET_ORDER, DEBT_ORDER, assetGroup, debtGroup } from '../math/statements.js';
import { payYourselfFirst } from '../math/simple.js';
import { fiDate, changeAt } from '../math/fi.js';
import { simulateDebt } from '../math/debt.js';
import { programOf } from '../program.js';
import { scorecardOf } from '../math/scorecard.js';
import { unlockOf, confidenceOf } from '../math/picture.js';
import { LEVELS, levelWord } from './program.js';
import { categoryJoyOf, tripsOf, incomeKindOf, changeLog } from '../capture.js';
import { compareOf } from '../math/proposed.js';

const MAX_ROWS = 600; // a table longer than this is written as values, marked From the app

const sum = (list, f = x => x) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const slug = s => s.replace(/[^A-Za-z0-9]+/g, '');
const groupOf = (side, name) => (side || []).find(g => g.name === name)?.total ?? 0;
const LINES_ON = 'OR(Math_M27_gut="",AND(Set_spendingSource="lines",Math_M27_lines<>""))';
const RETIREMENT_LINES = 'SUMIFS(Spend_M21,Spend_draftt,"Retirement",Spend_InMath,"Yes")';
const FORMULA_APP = [{ key: 'f', label: 'Formula', unit: 'row', named: true }, { key: 'app', label: "The app's value", unit: 'row' }, { key: 'check', label: 'Check', check: ['f', 'app'] }];

export const REPORTS = [
  {
    tab: 'Proposed', prefix: 'Proposed',
    about: 'Current vs Proposed (K, M76): each result on the real file and on the copy with the Proposed choices, the difference, and the steps behind each side. Values from the app.',
    columns: [{ key: 'what', label: 'Result', unit: 'text', width: 24 }, { key: 'current', label: 'Current', unit: 'text', width: 18 }, { key: 'proposed', label: 'Proposed', unit: 'text', width: 18 }, { key: 'diff', label: 'Difference', unit: 'text', width: 18 }, { key: 'howCurrent', label: 'How we got this (current)', unit: 'text', width: 60 }, { key: 'howProposed', label: 'How we got this (proposed)', unit: 'text', width: 60 }],
    sections: c => {
      const C = compareOf(c.doc, c.ref, { now: c.now, flags: c.flags });
      const cell = v => ({ v: v == null || v === '' ? null : v, fromApp: true });
      const show = (r, v) => (v == null ? '' : r.unit === 'money' ? Math.round(v) : r.unit === 'pct' ? `${(v * 100).toFixed(1)}%` : String(v));
      const diff = r => (r.unit === 'month' ? (r.diffMonths == null ? '' : `${r.diffMonths} months`) : r.unit === 'pct' ? (r.diff == null ? '' : `${(r.diff * 100).toFixed(1)} pts`) : r.unit === 'money' ? (r.diff == null ? '' : Math.round(r.diff)) : (r.current === r.proposed ? 'Same' : 'Changes'));
      return [{ title: 'Results', rows: C.rows.map(r => ({ cells: { what: cell(r.label), current: cell(show(r, r.current)), proposed: cell(show(r, r.proposed)), diff: cell(diff(r)), howCurrent: cell(r.how.current.join(' ')), howProposed: cell(r.how.proposed.join(' ')) } })) },
        { title: 'The choices', rows: C.choices.map(x => ({ cells: { what: cell(x.label), current: cell(x.unit === 'money' ? Math.round(x.current ?? 0) : String(x.current ?? '')), proposed: cell(x.unit === 'money' ? Math.round(x.proposed ?? 0) : String(x.proposed ?? '')) } })) }];
    },
  },
  {
    tab: 'Captured', prefix: 'Captured',
    about: 'Kept for a later Wrapped (F6): joy ratings per spending category with their dates, everything tagged Trip, the income type on each income row, and the change log (field, old, new, who, when). Values from the app.',
    columns: [{ key: 'when', label: 'When', unit: 'text', width: 20 }, { key: 'what', label: 'What', unit: 'text', width: 30 }, { key: 'field', label: 'Field', unit: 'text', width: 22 }, { key: 'from', label: 'From', unit: 'text', width: 22 }, { key: 'to', label: 'To', unit: 'text', width: 22 }, { key: 'who', label: 'Who', unit: 'text', width: 10 }],
    sections: c => {
      const cell = v => ({ v: v == null || v === '' ? null : v, fromApp: true });
      const when = at => (at ? new Date(at).toISOString().slice(0, 16).replace('T', ' ') : '');
      const joy = Object.entries(categoryJoyOf(c.doc)).flatMap(([cat, j]) => j.history.map(r => ({ cells: { when: cell(when(r.at)), what: cell(cat), field: cell('Joy (1 to 5)'), to: cell(r.value), who: cell(r.who ?? 'Coach') } })));
      const trips = tripsOf(c.doc.records).map(r => ({ cells: { when: cell(r.kind === 'entry' ? r.values.date ?? '' : ''), what: cell(r.name || r.type || r.kind), field: cell(r.kind === 'entry' ? 'Calendar entry' : 'Budget line'), to: cell('Trip') } }));
      const incomes = c.doc.records.filter(r => r.kind === 'income').map(r => ({ cells: { what: cell(r.name || r.type), field: cell('Income type'), to: cell(incomeKindOf(r)), from: cell(r.values?.incomeKind ? '' : `from the row's type (${r.type})`) } }));
      const log = changeLog(c.doc, { limit: MAX_ROWS, coach: !!c.coach }).map(e => ({ cells: { when: cell(when(e.at)), what: cell(`${e.op}: ${e.what}`), field: cell(e.field), from: cell(e.from), to: cell(e.to), who: cell(e.who) } }));
      return [{ title: 'Joy by category', rows: joy }, { title: 'Trips', rows: trips }, { title: 'Income types', rows: incomes }, { title: `Change log (newest first, up to ${MAX_ROWS})`, rows: log }];
    },
  },
  {
    tab: 'Statements', prefix: 'Statements',
    about: 'The three statements, as formulas off the Inputs and Math tabs. Cash flow comes from the calendar marks in SLAM.',
    cols: [
      { area: 'assets', key: 'stmt', label: 'Statement line', unit: 'text', f: '{app:group}', app: { group: rec => assetGroup(rec) } },
      { area: 'debt', key: 'stmt', label: 'Statement line', unit: 'text', f: '{app:group}', app: { group: rec => debtGroup(rec) } },
    ],
    columns: [{ key: 'name', label: 'Line', unit: 'text', width: 46 }, ...FORMULA_APP],
    sections: c => {
      const nw = c.nwStatement(), f = c.m.flow, st = c.statements();
      const pyf = (() => { try { return payYourselfFirst(c.doc, c.ref, { now: c.now }).monthly; } catch { return null; } })();
      const a = g => `Statements_a_${slug(g)}`, d = g => `Statements_d_${slug(g)}`;
      return [
        { title: 'Net worth (M62)', rows: [
          ...ASSET_ORDER.map(g => ({ key: `a_${slug(g)}`, name: g, unit: 'money', f: `SUMIFS(Assets_val,Assets_stmt,"${g}")`, app: groupOf(nw.assets, g) })),
          { key: 'totalAssets', name: 'Total assets (unvested match left out)', unit: 'money', f: `${ASSET_ORDER.map(a).join('+')}-SUMIFS(Assets_unvested,Assets_InMath,"<>No")`, app: nw.totalAssets, total: true },
          ...DEBT_ORDER.map(g => ({ key: `d_${slug(g)}`, name: g, unit: 'money', f: `SUMIFS(Debt_balUsed,Debt_stmt,"${g}")`, app: groupOf(nw.debts, g) })),
          { key: 'totalDebts', name: 'Total debts', unit: 'money', f: DEBT_ORDER.map(d).join('+'), app: nw.totalDebts, total: true },
          { key: 'netWorth', name: 'Net worth', unit: 'money', f: 'Statements_totalAssets-Statements_totalDebts', app: nw.netWorth, total: true },
          { key: 'liquid', name: 'Liquid net worth (cash and brokerage, minus cards and other high-rate debt)', unit: 'money', f: `${a('Cash')}+SUMIFS(Assets_val,Assets_Type,"Brokerage")-${d('Cards')}-${d('Other high rate')}`, app: nw.liquid },
        ] },
        { title: 'Income and spending, a usual month on the plan (M63)', rows: [
          { key: 'payFirst', name: 'Pay yourself first (comes off the top)', unit: 'money', fromApp: 'the 401(k), HSA, match and after-tax savings, a month', app: pyf },
          { key: 'gross', name: 'Gross pay', unit: 'money', f: 'IF(Math_M13="","",Math_M13/12)', app: f.gross },
          { key: 'match', name: 'Employer match', unit: 'money', f: 'Math_M28_match', app: c.m.savingsRate.match ?? 0 },
          { key: 'beforeTax', name: 'Saved from paycheck (401(k) and HSA)', unit: 'money', f: 'Math_M28_pretax', app: f.beforeTax },
          { key: 'taxes', name: 'Taxes (and premiums taken from pay)', unit: 'money', f: 'IF(OR(Statements_gross="",Math_M12=""),"",MAX(0,Statements_gross-Statements_beforeTax-Math_M12))', app: f.taxes },
          { key: 'takeHome', name: 'Take-home', unit: 'money', f: 'Math_M12', app: f.takeHome, total: true },
          { key: 'fixed', name: 'Fixed spending (Budget lines)', unit: 'money', f: `IF(${LINES_ON},SUMIFS(Spend_M21,Spend_amountType,"Fixed",Spend_draftt,"<>Retirement",Spend_InMath,"Yes")+SUM(Debt_auto),"")`, app: f.fixed },
          { key: 'variable', name: 'Variable spending (Budget lines)', unit: 'money', f: `IF(${LINES_ON},SUMIFS(Spend_M21,Spend_amountType,"<>Fixed",Spend_draftt,"<>Retirement",Spend_InMath,"Yes"),"")`, app: f.variable },
          { key: 'spending', name: 'Spending', unit: 'money', f: 'IF(Math_M27_spending="","",Math_M27_spending+N(Math_M27_debtOut))', app: f.spending },
          { key: 'surplus', name: 'Surplus (M27)', unit: 'money', f: 'Math_M27', app: c.m.surplus.value, total: true },
          { key: 'savings', name: 'Saved in the budget (Retirement lines and after-tax savings)', unit: 'money', f: `IF(${LINES_ON},${RETIREMENT_LINES},0)+N(Math_M28_afterTax)`, app: f.savings },
          { key: 'free', name: 'Free after savings', unit: 'money', f: 'IF(OR(Statements_takeHome="",Statements_spending=""),"",Statements_takeHome-Statements_spending-Statements_savings)', app: f.free, total: true },
        ] },
        { title: 'Cash flow, this month on the calendar (M64)', rows: [
          { key: 'cashStart', name: 'Starting cash', unit: 'money', fromApp: 'cash at the start of the month, from the dated history', app: st?.cash.start ?? null },
          { key: 'everyday', name: 'Everyday money (paychecks in; bills and card payments out, when paid)', unit: 'money', fromApp: 'calendar items marked paid', app: st?.cash.totals.Everyday ?? null },
          { key: 'investing', name: 'Investing (contributions out, withdrawals in)', unit: 'money', fromApp: 'calendar items marked paid', app: st?.cash.totals.Investing ?? null },
          { key: 'debtFlow', name: 'Debt (principal paid out, new borrowing in)', unit: 'money', fromApp: 'calendar items marked paid', app: st?.cash.totals.Debt ?? null },
          { key: 'cashEnd', name: 'Ending cash', unit: 'money', f: 'IF(Statements_cashStart="","",Statements_cashStart+N(Statements_everyday)+N(Statements_investing)+N(Statements_debtFlow))', app: st?.cash.end ?? null, total: true },
        ] },
        { title: 'The tie-out (M65 and M66)', rows: [
          { key: 'cashNow', name: 'Cash in the accounts (net worth statement)', unit: 'money', f: a('Cash'), app: nw.cash },
          { key: 'unexplained', name: 'Unexplained cash: in the accounts minus ending cash (M65)', unit: 'money', f: 'IF(Statements_cashEnd="","",Statements_cashNow-Statements_cashEnd)', app: st ? st.tie.cashInAccounts - st.tie.cashOnStatement : null },
          { key: 'change', name: 'Change in net worth this month', unit: 'money', fromApp: 'net worth at the start of the month, from the dated history', app: st?.tie.bridge.change ?? null },
          { key: 'bSurplus', name: 'Surplus', unit: 'money', fromApp: 'the month on the accrual statement', app: st?.tie.bridge.surplus ?? null },
          { key: 'bSaved', name: 'Saved from paycheck', unit: 'money', fromApp: 'the month on the accrual statement', app: st?.tie.bridge.saved ?? null },
          { key: 'bDebt', name: 'Debt paid down', unit: 'money', fromApp: 'principal paid this month', app: st?.tie.bridge.debtPaidDown ?? null },
          { key: 'bMarket', name: 'Market change', unit: 'money', fromApp: 'investment balances, start and end of the month', app: st?.tie.bridge.market ?? null },
          { key: 'bOther', name: 'Other changes (home and car values)', unit: 'money', fromApp: 'value updates this month', app: st?.tie.bridge.other ?? null },
          { key: 'bUnexplained', name: 'Unexplained (M66)', unit: 'money', f: 'IF(Statements_change="","",Statements_change-N(Statements_bSurplus)-N(Statements_bSaved)-N(Statements_bDebt)-N(Statements_bMarket)-N(Statements_bOther))', app: st?.tie.bridge.unexplained ?? null },
        ] },
      ];
    },
  },
  {
    tab: 'FOO', prefix: 'FOO',
    about: 'The SLAM financial order of operations: each step, where it stands, the dollars left and the projected month.',
    cols: [
      { area: 'debt', key: 'heavy', label: 'Heavy debt (FOO step 3)', unit: 'number', f: 'IF(AND(N({@balUsed})>0,{pslf}<>"Yes",OR(COUNTIF(Heavy_type,{Type})>0,N({@aprUsed})>=HeavyApr)),1,0)' },
      { area: 'debt', key: 'low', label: 'Low-rate debt (FOO step 9)', unit: 'number', f: 'IF(AND(N({@balUsed})>0,{pslf}<>"Yes",{@heavy}=0),1,0)' },
    ],
    columns: [
      { key: 'step', label: 'Step', unit: 'text', width: 7 }, { key: 'name', label: 'Step name', unit: 'text', width: 30 },
      { key: 'status', label: 'Status', unit: 'text', width: 13 }, { key: 'left', label: 'Dollars left', unit: 'money' },
      { key: 'date', label: 'Projected month', unit: 'month' }, { key: 'appStatus', label: "The app's status", unit: 'text', width: 15 },
      { key: 'appLeft', label: "The app's dollars left", unit: 'money' }, { key: 'check', label: 'Check', check: ['left', 'appLeft'], also: ['status', 'appStatus'] },
    ],
    sections: c => {
      const F = c.foo();
      const LEFT = {
        3: 'SUMIFS(Debt_balUsed,Debt_heavy,1)',
        6: 'IF(Math_M54="","",MAX(0,Math_M54-N(Math_M41_invested)))',
        9: 'SUMIFS(Debt_balUsed,Debt_low,1)+IF(Math_M50="",0,MAX(0,Math_M50-N(Math_M41_invested)))',
      };
      return [{ title: 'Steps (M69)', rows: [
        ...F.steps.map(s => ({ cells: {
          step: { v: s.id }, name: { v: s.name },
          // Worked out here when the dollars left are a formula; otherwise the app's status (gates, dates, the Roth log).
          status: LEFT[s.id] ? { f: 'IF(AND(ISNUMBER({col:left}),N({col:left})<=0.5),"Done",IF({col:appStatus}="Done","In progress",{col:appStatus}))' } : { v: s.status, fromApp: true },
          left: LEFT[s.id] ? { f: LEFT[s.id] } : { v: s.left ?? null, fromApp: true },
          date: { v: s.date ?? null, fromApp: true }, appStatus: { v: s.status }, appLeft: { v: s.left ?? null },
        } })),
        { key: 'here', cells: { name: { v: 'The step you are on' }, status: { f: 'IFERROR(INDEX({above:step},MATCH("In progress",{above:status},0)),"")', named: true }, appStatus: { v: F.here ?? '' } } },
      ] },
      { title: 'Quiet Quitting FI and Coast FI', rows: [
        { cells: { name: { v: 'Quiet Quitting FI (M70)' }, left: { f: 'Math_M70' }, appLeft: { v: F.qq.value ?? null } } },
        { cells: { name: { v: 'Coast FI at the FI age' }, left: { f: 'Math_M54' }, appLeft: { v: F.coast ?? null } } },
      ] }];
    },
  },
  {
    tab: 'Projections', prefix: 'Proj',
    about: 'Year by year to FI, and each debt month by month to paid off, as row formulas. A table that would pass 600 rows is written as values and marked From the app.',
    tables: c => {
      const YEARS = 50;
      const path = c.x.invested == null || c.m.investing?.monthly == null ? []
        : fiDate({ invested: c.x.invested, monthlyInvesting: c.m.investing.monthly, realReturn: c.x.realReturn, target: Number.MAX_VALUE }, { from: c.now, path: true, before: c.m.investing.before ?? null, changes: c.m.investing.changes ?? null }).points || [];
      const changed = (c.m.investing?.changes || []).some(ch => ch.monthly);
      const goingAt = k => (c.m.investing?.before && k < c.m.investing.before.months ? c.m.investing.before.monthly : (c.m.investing?.monthly ?? 0) + changeAt(c.m.investing?.changes, k));
      const addedIn = i => (path.length ? Array.from({ length: 12 }, (_, j) => goingAt(i * 12 + j)).reduce((a, b) => a + b, 0) : null);
      const years = { title: 'Year by year: investments, with what goes in every month (M53)', columns: [
        { key: 'year', label: 'Year', unit: 'number', width: 9 }, { key: 'age', label: 'Age', unit: 'number', width: 9 },
        { key: 'start', label: 'Balance at the start', unit: 'money' }, { key: 'added', label: 'Contributions', unit: 'money' },
        { key: 'growth', label: 'Growth', unit: 'money' }, { key: 'end', label: 'Balance at the end', unit: 'money' },
        { key: 'fi', label: 'FI target', unit: 'money' }, { key: 'reached', label: 'FI reached', unit: 'text', width: 11 },
        { key: 'future', label: 'Balance at the end, future dollars', unit: 'money' },
        { key: 'app', label: "The app's balance", unit: 'money' }, { key: 'check', label: 'Check', check: ['end', 'app'] },
      ], sections: [{ title: null, rows: Array.from({ length: YEARS }, (_, i) => ({ cells: {
        year: { v: i + 1 },
        age: { f: 'IF(Profile_ageUsed="","",Profile_ageUsed+{col:year})' },
        start: { f: i === 0 ? 'N(Math_M41_invested)' : '{prev:end}' },
        // Batch 11: the months the surplus pays heavy debt first put in Math_M53_before; the rest of the year Math_M53_invest.
        // Batch 15: with known changes ahead (a bill that becomes yours, benefits that end) the year runs month by
        // month in the app, so the contributions and the end balance are the app's.
        added: changed ? { v: addedIn(i), fromApp: true } : { f: `MAX(0,MIN(12,N(Math_M53_debtMonths)-${i * 12}))*N(Math_M53_before)+(12-MAX(0,MIN(12,N(Math_M53_debtMonths)-${i * 12})))*N(Math_M53_invest)` },
        end: changed ? { v: path[(i + 1) * 12] ?? null, fromApp: true } : { f: `FV(Math_M53_growth,12-MAX(0,MIN(12,N(Math_M53_debtMonths)-${i * 12})),-N(Math_M53_invest),-FV(Math_M53_growth,MAX(0,MIN(12,N(Math_M53_debtMonths)-${i * 12})),-N(Math_M53_before),-{col:start}))` },
        growth: { f: '{col:end}-{col:start}-{col:added}' },
        fi: { f: 'Math_M50' },
        reached: { f: 'IF(Math_M50="","",IF({col:end}>=Math_M50,"Yes","No"))' },
        future: { f: '{col:end}*(1+Inflation)^{col:year}' },
        app: { v: path[(i + 1) * 12] ?? null },
      } })) }] };
      // Each debt, month by month at today's payment (M31 and M32), its numbers read from the Debt tab by ID.
      const debts = c.m.debts.filter(d => !d.inFull && d.balance > 0 && d.apr != null && d.payment > 0);
      const tables = debts.map(d => {
        const sim = simulateDebt({ balance: d.balance, apr: d.apr, payment: d.payment }, MAX_ROWS + 1);
        const never = !sim.paidOff;
        const n = never ? 24 : sim.months;
        const big = n > MAX_ROWS;
        const of = col => `INDEX(Debt_${col},MATCH("${d.id}",Debt_Id,0))`;
        const cols = [
          { key: 'month', label: 'Month', unit: 'number', width: 9 }, { key: 'start', label: big ? 'Balance at the start (From the app)' : 'Balance at the start', unit: 'money' },
          { key: 'interest', label: big ? 'Interest (From the app)' : 'Interest', unit: 'money' }, { key: 'pay', label: big ? 'Payment (From the app)' : 'Payment', unit: 'money' },
          { key: 'end', label: big ? 'Balance after (From the app)' : 'Balance after', unit: 'money' }, { key: 'app', label: "The app's balance", unit: 'money' },
          { key: 'check', label: 'Check', check: ['end', 'app'] },
        ];
        let b = d.balance;
        const rows = Array.from({ length: Math.min(n, MAX_ROWS * 2) }, (_, i) => {
          const app = sim.path[i + 1] ?? null;
          if (big) { const i0 = b * d.apr / 12, p = Math.min(d.payment, b + i0); const row = { month: { v: i + 1 }, start: { v: b, fromApp: true }, interest: { v: i0, fromApp: true }, pay: { v: p, fromApp: true }, end: { v: b + i0 - p, fromApp: true }, app: { v: app } }; b = b + i0 - p; return { cells: row }; }
          return { cells: {
            month: { v: i + 1 },
            start: { f: i === 0 ? of('balUsed') : '{prev:end}' },
            interest: { f: `{col:start}*${of('aprUsed')}/12` },
            pay: { f: `MIN(${of('payUsed')},{col:start}+{col:interest})` },
            end: { f: '{col:start}+{col:interest}-{col:pay}' },
            app: { v: app },
          } };
        });
        return { title: `${d.name}: month by month at today's payment`, columns: cols,
          note: never ? 'This payment never pays it off: the first 24 months are shown.' : big ? `From the app: ${n} months is more than ${MAX_ROWS} rows, so these are the app's numbers, not formulas.` : `Paid off in month ${n}. The rows run to the payoff month as of the day this file was made.`,
          sections: [{ title: null, rows }] };
      });
      return [years, ...tables];
    },
  },
  {
    tab: 'Program', prefix: 'Program',
    about: 'The 12-session program: each session and its checklist, the Picture % with its pace, and the next small things. From the app (the ticks and levels live in SLAM).',
    columns: [
      { key: 'name', label: 'Session or number', unit: 'text', width: 40 }, { key: 'status', label: 'Where it stands', unit: 'text', width: 16 },
      { key: 'done', label: 'Done', unit: 'number', width: 8 }, { key: 'of', label: 'Of', unit: 'number', width: 8 }, { key: 'detail', label: 'Done when, or the detail', unit: 'text', width: 90 },
    ],
    sections: c => {
      const prog = programOf(c.doc, c.ref, { now: c.now, flags: c.flags });
      const pctText = v => (v == null ? '' : `${Math.round(v * 100)}%`);
      const fi = unlockOf('fi', prog.picture), conf = confidenceOf('fi', prog.picture, { now: c.now });
      return [
        { title: 'Sessions', rows: prog.sessions.map(s => ({ cells: {
          name: { v: `${s.n}. ${s.name}` }, status: { v: s.status === 'done' ? 'Done' : s.status === 'current' ? 'This session' : 'Next', fromApp: true },
          done: { v: s.items.filter(i => i.done).length, fromApp: true }, of: { v: s.items.length, fromApp: true },
          detail: { v: s.items.map(i => `${i.done ? '[x]' : '[ ]'} ${i.label}${i.auto ? ' (from the numbers)' : ''}`).join('; '), fromApp: true } } })) },
        { title: 'The picture (M73)', rows: [
          { cells: { name: { v: 'Picture %' }, status: { v: pctText(prog.picture.pct), fromApp: true }, detail: { v: prog.pace.text, fromApp: true } } },
          { cells: { name: { v: 'Pace' }, status: { v: prog.pace.word, fromApp: true }, detail: { v: `${prog.pace.target}% expected by the end of session ${prog.n}`, fromApp: true } } },
          ...prog.picture.sections.map(s => ({ cells: { name: { v: `${s.name} section` }, status: { v: pctText(s.pct), fromApp: true }, done: { v: s.items.filter(i => i.level >= LEVELS.Estimate).length, fromApp: true }, of: { v: s.items.length, fromApp: true }, detail: { v: s.items.map(i => `${i.label}: ${levelWord(i.level)}`).join('; '), fromApp: true } } })),
          { cells: { name: { v: 'FI date' }, status: { v: fi.unlocked ? 'Unlocked' : 'Locked', fromApp: true }, detail: { v: fi.unlocked ? `${conf?.label ?? ''}: ${conf?.text ?? ''}` : fi.reason, fromApp: true } } },
        ] },
        { title: 'Next small things', rows: prog.next.map((n, i) => ({ cells: { name: { v: `${i + 1}. ${n.label}` }, status: { v: `+${Math.round(n.gain * 100)}%`, fromApp: true }, detail: { v: `${levelWord(n.level)} now: ${n.step}`, fromApp: true } } })) },
      ];
    },
  },
  {
    tab: 'Scorecard', prefix: 'Score',
    about: 'The eleven areas, each Strong, OK or Hole (from the numbers, or the coach), the holes ranked with their payoff, effort and best-return score, the goals, and the next chapter. From the app.',
    columns: [
      { key: 'name', label: 'Area or goal', unit: 'text', width: 26 }, { key: 'rating', label: 'Rating', unit: 'text', width: 10 }, { key: 'source', label: 'Rated by', unit: 'text', width: 12 },
      { key: 'rank', label: 'Rank', unit: 'number', width: 7 }, { key: 'payoff', label: 'Payoff a year', unit: 'money' }, { key: 'fiDays', label: 'FI days', unit: 'number', width: 9 },
      { key: 'effort', label: 'Effort, hours', unit: 'number', width: 9 }, { key: 'score', label: 'A year per hour', unit: 'money' }, { key: 'chosen', label: 'In the plan', unit: 'text', width: 10 },
      { key: 'reason', label: 'Reason, and how we got this', unit: 'text', width: 90 },
    ],
    sections: c => {
      const sc = scorecardOf(c.doc, c.ref, { now: c.now, flags: c.flags });
      const v = (x, fromApp = true) => ({ v: x ?? null, fromApp });
      const row = a => ({ cells: { name: { v: a.name }, rating: v(a.rating ?? 'Not rated'), source: v(a.source === 'coach' ? 'The coach' : a.source === 'auto' ? 'The numbers' : ''), rank: v(a.rank ?? null),
        payoff: v(a.payoff?.value ?? null), fiDays: v(a.fiDays == null ? null : Math.round(a.fiDays * 10) / 10), effort: v(a.rating === 'Hole' ? a.effort : null), score: v(a.score ?? null),
        chosen: v(a.rating === 'Hole' ? (a.chosen ? 'Yes' : 'No') : ''), reason: v(a.math.join(' ')) } });
      const ch = c.doc.scorecard?.nextChapter || {};
      return [
        { title: `Holes, ranked (${sc.holes.length}); FOO step ${sc.here ?? 'none yet'}`, rows: sc.holes.map(row) },
        { title: 'OK', rows: sc.ok.map(row) }, { title: 'Strong', rows: sc.strong.map(row) }, { title: 'Not rated yet', rows: sc.unrated.map(row) },
        { title: `Goals (S4): ${sc.facts.goals.short} of ${sc.facts.goals.need} short-term and ${sc.facts.goals.long} of ${sc.facts.goals.need} long-term complete`, rows: sc.facts.goals.list.map(g => ({ cells: {
          name: { v: g.name }, rating: v(g.horizon ?? ''), source: v(g.tag ?? ''), payoff: v(g.amount), reason: v(`${g.date ? `By ${g.date}. ` : ''}${g.complete ? 'Complete.' : 'Needs a horizon, a tag, an amount and a date.'}`) } })) },
        { title: 'Next chapter', rows: [{ cells: { name: { v: ch.text || '' }, payoff: v(ch.amount ?? null), reason: v(ch.date ? `By ${ch.date}.` : sc.holes.length ? 'Opens when no hole is left.' : 'Name it on Home.') } }] },
      ];
    },
  },
];
