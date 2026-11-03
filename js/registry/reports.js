// The report tabs of the workbook (Statements, FOO, Projections), declared as tables: their columns, their rows, and
// each cell as a formula (off the Inputs and Math tabs), a value, or the app's own number to check against. The
// export builds these tabs from this file only. Formulas use named ranges and, inside a table, {col:key} for this
// row's cell in that column and {prev:key} for the row above.
import { ASSET_ORDER, DEBT_ORDER, assetGroup, debtGroup } from '../math/statements.js';
import { payYourselfFirst } from '../math/simple.js';
import { fiDate } from '../math/fi.js';

const sum = (list, f = x => x) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const slug = s => s.replace(/[^A-Za-z0-9]+/g, '');
const groupOf = (side, name) => (side || []).find(g => g.name === name)?.total ?? 0;
const LINES_ON = 'OR(Math_M27_gut="",AND(Set_spendingSource="lines",Math_M27_lines<>""))';
const RETIREMENT_LINES = 'SUMIFS(Spend_M21,Spend_draftt,"Retirement",Spend_InMath,"Yes")';
const FORMULA_APP = [{ key: 'f', label: 'Formula', unit: 'row', named: true }, { key: 'app', label: "The app's value", unit: 'row' }, { key: 'check', label: 'Check', check: ['f', 'app'] }];

export const REPORTS = [
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
          { key: 'spending', name: 'Spending', unit: 'money', f: `IF(Math_M27_spending="","",Math_M27_spending+N(Math_M27_debtOut)-IF(${LINES_ON},${RETIREMENT_LINES},0))`, app: f.spending },
          { key: 'surplus', name: 'Surplus (M27)', unit: 'money', f: 'Math_M27', app: c.m.surplus.value, total: true },
          { key: 'savings', name: 'Saved in the budget (Retirement lines and after-tax savings)', unit: 'money', f: `IF(${LINES_ON},${RETIREMENT_LINES},0)+${c.x.afterTaxSaving ?? 0}`, app: f.savings },
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
    about: 'Your investments year by year at the return, with the surplus invested every month (the FI date path, M53).',
    columns: [
      { key: 'year', label: 'Year', unit: 'number', width: 7 }, { key: 'age', label: 'Age', unit: 'number', width: 7 },
      { key: 'start', label: 'Invested at the start', unit: 'money' }, { key: 'added', label: 'Put in this year', unit: 'money' },
      { key: 'growth', label: 'Growth this year', unit: 'money' }, { key: 'end', label: 'Invested at the end', unit: 'money' },
      { key: 'fi', label: 'FI number', unit: 'money' }, { key: 'reached', label: 'FI reached', unit: 'text', width: 10 },
      { key: 'app', label: "The app's path", unit: 'money' }, { key: 'check', label: 'Check', check: ['end', 'app'] },
    ],
    sections: c => {
      const YEARS = 50;
      const path = (() => {
        if (c.x.invested == null || c.m.surplus.value == null) return [];
        return fiDate({ invested: c.x.invested, monthlyInvesting: c.m.surplus.value, realReturn: c.x.realReturn, target: Number.MAX_VALUE }, { from: c.now, path: true }).points || [];
      })();
      return [{ title: null, rows: Array.from({ length: YEARS }, (_, i) => ({ cells: {
        year: { v: i + 1 },
        age: { f: 'IF(Profile_ageUsed="","",Profile_ageUsed+{col:year})' },
        start: { f: i === 0 ? 'N(Math_M41_invested)' : '{prev:end}' },
        added: { f: 'N(Math_M27)*12' },
        end: { f: '{col:start}*(1+Math_M53_growth)^12+IF(Math_M53_growth=0,N(Math_M27)*12,N(Math_M27)*((1+Math_M53_growth)^12-1)/Math_M53_growth)' },
        growth: { f: '{col:end}-{col:start}-{col:added}' },
        fi: { f: 'Math_M50' },
        reached: { f: 'IF(Math_M50="","",IF({col:end}>=Math_M50,"Yes","No"))' },
        app: { v: path[(i + 1) * 12] ?? null },
      } })) }];
    },
  },
];
