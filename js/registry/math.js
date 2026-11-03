// SPDX-License-Identifier: AGPL-3.0-only
// The math registry: every Math tab formula (M00 to M72) and every function in js/math, declared once. The workbook's
// Math tab has one row per entry: its ID, its name in plain words, the live formula (or "From the app" with the
// reason), the app's value and a Check. Formulas that work row by row (a debt's payoff months) are columns on that
// Inputs tab, and the Math row adds them up. test/coverage.test.js fails when a js/math export or a spec M number is
// missing here.
//
// An entry: { id, name, inputs, fns, unit, sheet | fromApp, app, parts, cols }.
//   sheet: the formula, written with named ranges (Debt_balance, RealReturn, Math_M12). No cell addresses.
//   fromApp: why the sheet shows the app's number instead of a formula.
//   app(c): the app's own value, from the same functions the screens use (c: js/sheet/context.js).
//   parts: more rows under the entry, each { key, name, unit, sheet | fromApp, app }; named Math_<id>_<key>.
//   cols: formula columns on an Inputs tab, each { area, key, label, unit, f, app }. In f, {field} is that row's cell,
//     {@key} another formula column on the row, {Kind} {Type} {Status} {InMath} the row's own columns, and
//     {app:name} the app's value for that row (from app[name](rec, c)). f can be a function (rec, c) => template.
//   fns: the js/math exports this entry is made of ('file.export').
import { LISTS } from './assumptions.js';
import { DRAFTT, myShare, irregularSetAside, estimateVsActual } from '../math/spending.js';
import { takeHomeFromGross, variableSafeBudget, realHourlyWage, monthlyFrom, defaultFilingStatus } from '../math/income.js';
import { payoffPlan, feeApr, utilization, debtToIncome, promoPayment } from '../math/debt.js';
import { moneyAsTime } from '../math/fi.js';
import { monthsUntil } from '../math/portfolio.js';
import { simpleMath } from '../math/simple.js';

const sum = (list, f = x => x) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const PAYS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };
const INCOME = '{Kind}="Income"';
const SKIP = '{InMath}="No"';
const MONTH_FACTOR = per => `IFERROR(INDEX(Per_month,MATCH(${per},Per_name,0)),1)`;
const PAYS_A_YEAR = 'IFERROR(INDEX(Per_year,MATCH({payFrequency},Per_name,0)),26)';
const bracket = (t, table) => `SUMPRODUCT((${t}>${table}_over)*(${t}-${table}_over)*${table}_step)`;

// The income row the metrics worked out for a record (take-home, gross, pretax, Roth), or null.
const inc = (rec, c) => c.x.income.find(i => i.r.id === rec.id) ?? null;
const taxedPieces = (rec, c) => {
  const i = inc(rec, c);
  if (!i?.taxType || i.gross == null) return null;
  return takeHomeFromGross({ gross: i.gross, pretax: i.pretax, roth: i.roth, filingStatus: c.x.filingStatus, selfEmployed: i.taxType === '1099', place: c.x.place }, c.ref);
};
const debtOf = (rec, c) => c.x.debts.find(d => d.id === rec.id) ?? null;

export const MATH = [
  { id: 'M00', name: 'Units', inputs: 'none', fns: [], unit: 'text',
    fromApp: 'a convention, not a number: money is a month in today\'s dollars, rates are yearly decimals (7% = 0.07)', app: () => null },

  // ---------- Income and taxes ----------
  { id: 'M01', name: 'Monthly from any period', inputs: 'amount, period, pay frequency', unit: 'money', fns: ['income.monthlyFrom'],
    cols: [{ area: 'income', key: 'M01', label: 'A month (M01)', unit: 'money',
      f: `IF(OR(${SKIP},{Kind}<>"Income",{amount}=""),"",{amount}*${MONTH_FACTOR('IF({per}="paycheck",{payFrequency},{per})')})` }],
    sheet: 'SUM(Income_M01)', label: 'Income rows, each as a month, added up',
    app: c => (c.x.income.length ? sum(c.x.income, i => monthlyFrom(i.r.amount, i.r.per, i.r.values.payFrequency).value) : null) },
  { id: 'M02', name: 'Real return', inputs: 'return preset', unit: 'pct', fns: ['fi.realReturn', 'fi.futureDollars'], sheet: 'RealReturn', app: c => c.x.realReturn },
  { id: 'M13', name: 'Gross from take-home', inputs: 'take-home, deductions', unit: 'money', fns: ['income.grossFromTakeHome'],
    cols: [
      { area: 'income', key: 'taxType', label: 'Taxed as', unit: 'text',
        f: `IF(${INCOME},IF({incomeType}<>"",{incomeType},IF(OR({Type}="Job",{Type}="Partner job"),"W-2",IF(OR({Type}="Side hustle",{Type}="Self-employed"),"1099",""))),"")` },
      { area: 'income', key: 'M13', label: 'Gross a year (M13)', unit: 'money',
        f: `IF(OR(${SKIP},{Kind}<>"Income"),"",IF({basis}="Gross",IF({@M01}="","",{@M01}*12),IF({gross}<>"",{gross},{app:solved})))`,
        app: { solved: (rec, c) => (inc(rec, c)?.computed === 'gross' ? Math.round(inc(rec, c).gross) : '') } },
    ],
    sheet: 'IF(COUNT(Income_M13)=0,"",SUM(Income_M13))', label: 'Gross pay a year, all jobs (a gross worked back from take-home is the app\'s, found by trial: Excel has no reverse tax)',
    app: c => c.x.grossAnnual },
  { id: 'M10', name: 'Federal income tax', inputs: 'gross, before-tax deductions, filing status', unit: 'money', fns: ['income.federalTax', 'income.defaultFilingStatus'],
    cols: [
      { area: 'taxes', key: 'filing', label: 'Filing status used', unit: 'text', f: 'IF({filingStatus}<>"",{filingStatus},IF(Profile_household="Couple","Married jointly","Single"))' },
      { area: 'taxes', key: 'joint', label: 'Files jointly', unit: 'text', f: 'IF({@filing}="Married jointly","Yes","No")' },
      { area: 'income', key: 'pct', label: '401(k) % used', unit: 'pct', f: `IF(${INCOME},IF({contributionPct}<>"",{contributionPct},{app:linkPct}),"")`,
        app: { linkPct: (rec, c) => (c.x.link.job?.id === rec.id && rec.values.contributionPct == null ? c.x.link.incomePct ?? '' : '') } },
      { area: 'income', key: 'pretax', label: 'Before-tax a year', unit: 'money',
        f: (rec, c) => {
          const premium = c.x.health ? `${c.x.health.jobId === rec.id ? c.x.health.perPaycheck : 0}` : 'N({premium})';
          const perPay = c.x.link.job?.id === rec.id && rec.values.contributionPct == null ? c.x.link.incomePerPaycheck ?? 0 : 0;
          return `IF(OR(${SKIP},{Kind}<>"Income"),"",(${premium}+N({hsaFsa})+N({otherPretax}))*${PAYS_A_YEAR}+N({@M13})*N({@pct})+IF({contributionPct}="",${perPay},0)*${PAYS_A_YEAR}-N({app:roth}))`;
        },
        app: { roth: (rec, c) => inc(rec, c)?.roth ?? 0 } },
      { area: 'income', key: 'taxable', label: 'Taxable a year (federal)', unit: 'money',
        f: `IF(OR({@M13}="",{@taxType}=""),"",MAX(0,{@M13}-{@pretax}-IF({@taxType}="1099",{@M11}/2,0)-IF(Taxes_joint="Yes",StdDed_joint,StdDed_single)))` },
      { area: 'income', key: 'M10', label: 'Federal tax a year (M10)', unit: 'money',
        f: `IF({@taxable}="","",IF(Taxes_joint="Yes",${bracket('{@taxable}', 'Fed_joint')},${bracket('{@taxable}', 'Fed_single')}))` },
    ],
    sheet: 'IF(COUNT(Income_M10)=0,"",SUM(Income_M10))', label: 'Federal tax a year, all jobs',
    app: c => { const rows = c.x.income.map(i => taxedPieces(i.r, c)).filter(Boolean); return rows.length ? sum(rows, t => t.federal.value) : null; } },
  { id: 'M11', name: 'FICA', inputs: 'gross, year', unit: 'money', fns: ['income.fica'],
    cols: [{ area: 'income', key: 'M11', label: 'FICA a year (M11)', unit: 'money',
      f: `IF(OR({@M13}="",{@taxType}=""),"",IF({@taxType}="1099",MIN({@M13}*SE_base,SS_wageBase)*SS_rate*2+{@M13}*SE_base*Medicare_rate*2+MAX(0,{@M13}*SE_base-IF(Taxes_joint="Yes",Medicare_over_joint,Medicare_over_single))*Medicare_addl,MIN({@M13},SS_wageBase)*SS_rate+{@M13}*Medicare_rate+MAX(0,{@M13}-IF(Taxes_joint="Yes",Medicare_over_joint,Medicare_over_single))*Medicare_addl))` }],
    sheet: 'IF(COUNT(Income_M11)=0,"",SUM(Income_M11))', label: 'Social Security and Medicare a year, all jobs',
    app: c => { const rows = c.x.income.map(i => taxedPieces(i.r, c)).filter(Boolean); return rows.length ? sum(rows, t => t.fica.value) : null; } },
  { id: 'M12', name: 'Take-home from gross', inputs: 'M10, M11, state and city tax', unit: 'money', fns: ['income.takeHomeFromGross', 'income.stateTax', 'income.incomeRow', 'income.taxTypeOf'],
    cols: [
      { area: 'income', key: 'state', label: 'State and city tax a year', unit: 'money',
        f: `IF(OR({@M13}="",{@taxType}="",Profile_state<>"NY"),IF({@M13}="","",0),${['NY', 'NYC'].map(t => `IF(${t === 'NYC' ? 'Profile_nyc="Yes"' : 'TRUE'},IF(Taxes_filing="Married jointly",${bracket(`MAX(0,{@M13}-{@pretax}-NY_std_joint)`, `${t}_joint`)},IF(Taxes_filing="Head of household",${bracket(`MAX(0,{@M13}-{@pretax}-NY_std_head)`, `${t}_head`)},${bracket(`MAX(0,{@M13}-{@pretax}-NY_std_single)`, `${t}_single`)})),0)`).join('+')})` },
      { area: 'income', key: 'M12', label: 'Take-home a month (M12)', unit: 'money',
        f: `IF(OR(${SKIP},{Kind}<>"Income"),"",IF(AND({@taxType}<>"",{@M13}<>"",OR({basis}="Gross",{amount}="")),({@M13}-{@M10}-{@M11}-{@state}-{@pretax}-N({app:roth}))/12,{@M01}))`,
        app: { roth: (rec, c) => inc(rec, c)?.roth ?? 0 } },
    ],
    sheet: 'IF(COUNTIFS(Income_Kind,"Income",Income_InMath,"<>No")=0,"",SUM(Income_M12))', label: 'Take-home a month, all income',
    app: c => c.x.takeHome },
  { id: 'M14', name: 'Effective and marginal tax rate', inputs: 'M10, M11', unit: 'pct', fns: ['income.taxRates'],
    sheet: 'IF(OR(Math_M13="",N(Math_M13)=0),"",(N(Math_M10)+N(Math_M11)+SUM(Income_state))/Math_M13)', label: 'Effective rate: all income tax over gross',
    app: c => { const rows = c.x.income.map(i => taxedPieces(i.r, c)).filter(Boolean); const g = sum(c.x.income, i => i.gross); return rows.length && g ? sum(rows, t => t.federal.value + t.fica.value + t.stateTax.state + t.stateTax.local) / g : null; },
    parts: [{ key: 'marginal', name: 'Marginal rate (the last dollar)', unit: 'pct', fromApp: 'the bracket of the last dollar plus FICA; on the Taxes tab of SLAM', app: c => (c.x.grossAnnual ? c.taxRates()?.marginal ?? null : null) }] },
  { id: 'M15', name: 'Employer match ($/yr)', inputs: '401(k) %, match formula, gross', unit: 'money', fns: ['income.employerMatch'],
    cols: [{ area: 'income', key: 'M15', label: 'Employer match a year (M15)', unit: 'money',
      f: `IF(OR({@M13}="",{matchPct}="",{matchCapPct}=""),"",MIN(N({@pct}),{matchCapPct})*{matchPct}*{@M13})` }],
    sheet: 'SUM(Income_M15)', label: 'Employer match a year (tiers set on the 401(k) under Assets stay in the app)',
    app: c => (c.m.savingsRate.match ?? 0) * 12 },
  { id: 'M16', name: 'Variable income safe budget', inputs: 'lowest month, set-aside', unit: 'money', fns: ['income.variableSafeBudget'],
    sheet: 'IF(Var_lowest<>"",Var_lowest*(1-IF(Var_setAside="",TaxSetAside,Var_setAside)),IF(Var_typical<>"",Var_typical*VarGuess*(1-IF(Var_setAside="",TaxSetAside,Var_setAside)),""))',
    app: c => { const v = c.doc.profile.variable || {}; return variableSafeBudget({ lowestMonth: v.lowest ?? null, typicalMonth: v.typical ?? null, setAside: v.setAside ?? null }, c.ref).value; } },
  { id: 'M17', name: 'Real hourly wage', inputs: 'take-home, work costs, hours', unit: 'money', fns: ['income.realHourlyWage', 'time.hourlyRate'],
    sheet: 'IF(OR(Math_M12="",N(Hours_paid)=0),"",(Math_M12-N(Hours_costs))/(Hours_paid+N(Hours_commute)+N(Hours_prep)))',
    app: c => realHourlyWage({ takeHome: c.x.takeHome, ...c.x.hours }).value },

  // ---------- Spending ----------
  { id: 'M20', name: 'Line monthly amount', inputs: 'line amount, period, covers', unit: 'money', fns: ['spending.lineMonthly'],
    cols: [{ area: 'spending', key: 'M20', label: 'A month (M20)', unit: 'money',
      f: rec => `IF(OR(${SKIP},{Kind}<>"Budget line",{amount}=""),"",IF({Status}="Not for me",0,${rec.covers?.months ? `{amount}/${rec.covers.months}` : `{amount}*${MONTH_FACTOR('{per}')}`}))` }],
    sheet: 'SUMIFS(Spend_M20,Spend_InMath,"Yes")', label: 'Budget lines, each as a month, added up',
    app: c => sum(c.x.typedLines.filter(l => !c.x.dupOf[l.id]), l => (l.amount == null ? 0 : l.covers?.months ? l.amount / l.covers.months : monthlyFrom(l.amount, l.per).value)) },
  { id: 'M21', name: 'My share', inputs: 'amount, who pays, covered, split', unit: 'money', fns: ['spending.myShare', 'spending.shareBeforeRefund', 'spending.reimbursedMonthly', 'spending.splitOf', 'spending.amountIsMine', 'spending.wholeBill', 'spending.withHome', 'spending.partnerSplits', 'spending.peopleSharing'],
    cols: [
      { area: 'spending', key: 'whoUsed', label: 'Who pays used', unit: 'text',
        f: `IF({whoPays}<>"",{whoPays},IF(OR(${Object.entries(LISTS.sharedGroups).map(([k, g]) => `AND(Profile_shared_${k}="Yes",OR(${g.categories.map(c => `{category}="${c}"`).join(',')}))`).join(',')}),"Split",""))` },
      { area: 'spending', key: 'givenUsed', label: 'Amount given as', unit: 'text', f: 'IF({amountIs}<>"",{amountIs},IF(AND({@whoUsed}="Split",Profile_billsGivenAs<>""),Profile_billsGivenAs,""))' },
      { area: 'spending', key: 'sharePct', label: 'Couple share used', unit: 'pct', f: 'IF(AND({@whoUsed}="Split",{splitBy}="",Profile_household="Couple",Profile_splitMine<>"",Profile_splitWith=""),Profile_splitMine,"")' },
      { area: 'spending', key: 'splitUsed', label: 'Split by used', unit: 'number', f: 'IF({splitBy}<>"",{splitBy},IF({@whoUsed}="Split",IF(Profile_splitWith<>"",Profile_splitWith,N(Profile_roommates)+IF(AND(Profile_household="Couple",OR(Profile_moneyStyle="Separate",Profile_moneyStyle="Mix")),1,0))+1,1))' },
      { area: 'spending', key: 'covered', label: 'Share someone else covers', unit: 'pct',
        f: 'IF(AND({@whoUsed}="Covered by someone",OR({takeover}="",TEXT({takeover},"yyyy-mm")>TEXT(TODAY(),"yyyy-mm"))),IF(AND({coveredAmount}<>"",N({amount})<>0),MIN(1,MAX(0,{coveredAmount}/{amount})),1),0)' },
      { area: 'spending', key: 'shareBase', label: 'My share before reimbursement', unit: 'money',
        f: `IF(OR(${SKIP},{Kind}<>"Budget line"),"",IF({myShare}<>"",{myShare},IF({Status}="Not for me",0,IF(OR({@whoUsed}="Included in rent",{@whoUsed}="N/A"),0,IF({@M20}="","",{@M20}*(1-{@covered})*IF({@givenUsed}="Your share",1,IF({@sharePct}<>"",{@sharePct},1/{@splitUsed})))))))` },
      { area: 'spending', key: 'M21', label: 'My share a month (M21)', unit: 'money',
        f: `IF({@shareBase}="","",IF(OR({Status}="Not for me",{@whoUsed}="Included in rent",{@whoUsed}="N/A"),{@shareBase},MAX(0,{@shareBase}-IF({reimbursed}="",0,{reimbursed}*${MONTH_FACTOR('{per}')}))))` },
      { area: 'spending', key: 'whole', label: 'Whole bill a month', unit: 'money', f: 'IF({@M20}="","",IF({@givenUsed}="Your share",IF({@sharePct}<>"",{@M20}/{@sharePct},{@M20}*{@splitUsed}),{@M20}))' }],
    sheet: 'SUMIFS(Spend_M21,Spend_InMath,"Yes")', label: 'My share of every Budget line, a month',
    app: c => sum(c.x.typedLines.filter(l => !c.x.dupOf[l.id]), l => myShare(l, { roommates: c.x.roommates }).value) },
  { id: 'M22', name: 'Support received', inputs: 'M21 across lines', unit: 'money', fns: ['spending.supportReceived'],
    cols: [{ area: 'spending', key: 'M22', label: 'Covered by others a month (M22)', unit: 'money', f: 'IF(AND({@covered}>0,{@M20}<>"",{@shareBase}<>""),{@M20}-{@shareBase},"")' }],
    sheet: 'SUMIFS(Spend_M22,Spend_InMath,"Yes")', app: c => c.m.supportReceived.value },
  { id: 'M23', name: 'Fixed floor', inputs: 'M21', unit: 'money', fns: ['spending.fixedFloor'],
    sheet: 'IF(COUNTIFS(Spend_Kind,"Budget line",Spend_InMath,"<>No")+COUNT(Debt_auto)=0,"",SUMIFS(Spend_M21,Spend_amountType,"Fixed",Spend_InMath,"Yes")+SUM(Debt_auto))',
    label: 'Your share of the Fixed lines (debt payments included), a month',
    app: c => (c.x.lines.length ? sum(c.x.lines.filter(l => l.amountType === 'Fixed'), l => myShare(l, { roommates: c.x.roommates }).value) : null) },
  { id: 'M24', name: 'Irregular set-aside', inputs: 'yearly cost', unit: 'money', fns: ['spending.irregularSetAside'],
    sheet: 'SUMIFS(Spend_M20,Spend_irregular,"Yes",Spend_InMath,"Yes")', label: 'Once-a-year and few-times-a-year costs, set aside a month',
    app: c => sum(c.x.typedLines.filter(l => l.irregular && !c.x.dupOf[l.id] && l.amount != null), l => irregularSetAside(monthlyFrom(l.amount, l.per).value * 12).value) },
  { id: 'M25', name: 'Estimate vs actual', inputs: 'estimate, actual', unit: 'money', fns: ['spending.estimateVsActual'],
    cols: [{ area: 'months', key: 'M25', label: 'Actual minus plan (M25)', unit: 'money', f: 'IF(OR({estimate}="",{actual}=""),"",{actual}-{estimate})' }],
    sheet: 'SUM(Months_M25)', label: 'Every month with both a plan and an actual: actual minus plan, added up',
    app: c => sum(Object.values(c.doc.spending?.months || {}).flatMap(mo => Object.values(mo.lines || {})), l => estimateVsActual({ estimate: l.estimate ?? null, actual: l.actual ?? null }).value) },
  { id: 'M26', name: 'Gut accuracy', inputs: 'closed months', unit: 'pct', fns: ['spending.gutAccuracy'],
    fromApp: 'an average across closed months of each first guess against the actual; the close history stays in SLAM', app: () => null },
  { id: 'M27', name: 'Monthly surplus', inputs: 'M12, M21, debts', unit: 'money', fns: ['spending.monthlySurplus'],
    parts: [
      { key: 'lines', name: 'Spending on the Budget lines (debt payments From Debt included)', unit: 'money',
        sheet: 'IF(COUNTIFS(Spend_Kind,"Budget line",Spend_InMath,"<>No")=0,"",SUMIFS(Spend_M21,Spend_InMath,"Yes")+SUM(Debt_auto))', app: c => c.x.lineTotal },
      { key: 'gut', name: 'The gut number', unit: 'money',
        sheet: 'IF(COUNTIFS(Spend_Kind,"Gut number",Spend_InMath,"<>No")=0,"",IF(COUNTIFS(Spend_Kind,"Gut number",Spend_InMath,"<>No",Spend_amount,"<>")=0,"",SUMIFS(Spend_amount,Spend_Kind,"Gut number",Spend_InMath,"<>No",Spend_Status,"<>Not for me")))',
        app: c => c.x.gutTotal },
      { key: 'spending', name: 'Spending a month (the gut number until the Budget switches to the lines)', unit: 'money',
        sheet: 'IF(OR(Math_M27_gut="",AND(Set_spendingSource="lines",Math_M27_lines<>"")),Math_M27_lines,Math_M27_gut)',
        app: c => c.x.spending },
      { key: 'debtOut', name: 'Debt payments not already in spending', unit: 'money',
        sheet: 'IF(Math_M27_spending="","",IF(OR(Math_M27_gut="",AND(Set_spendingSource="lines",Math_M27_lines<>"")),0,IF(COUNTIFS(Spend_Kind,"Gut number",Spend_includesDebtPayments,"No")>0,SUM(Debt_payOut),0)))',
        app: c => c.x.debtPaymentsOutsideSpending },
    ],
    sheet: 'IF(OR(Math_M12="",Math_M27_spending=""),"",Math_M12-Math_M27_spending-N(Math_M27_debtOut))', label: 'Take-home minus spending minus debt payments outside spending, a month',
    app: c => c.m.surplus.value },
  { id: 'M28', name: 'Savings rate (headline)', inputs: 'M27, 401(k) and HSA from the paycheck, match', unit: 'pct', fns: ['spending.savingsRate'],
    cols: [{ area: 'income', key: 'saving', label: 'Into the 401(k) and HSA a month', unit: 'money',
      f: (rec, c) => {
        const own = c.x.link.job?.id === rec.id && rec.values.contributionPct == null ? c.x.link.incomePerPaycheck ?? 0 : 0;
        return `IF(OR(${SKIP},{Kind}<>"Income"),"",(N({@M13})*N({@pct})+(IF({contributionPct}="",${own},0)+${c.x.gates.hsa ? 'N({hsaFsa})' : '0'})*${PAYS_A_YEAR})/12)`;
      } }],
    parts: [
      { key: 'pretax', name: '401(k) and HSA money from the paycheck, a month', unit: 'money', sheet: 'SUM(Income_saving)', app: c => c.m.pretaxSaving },
      { key: 'match', name: 'Employer match, a month', unit: 'money', sheet: 'Math_M15/12', app: c => c.m.savingsRate.match ?? 0 },
      { key: 'base', name: 'Second line: surplus over take-home', unit: 'pct', sheet: 'IF(OR(Math_M12="",Math_M27="",N(Math_M12)=0),"",Math_M27/Math_M12)', app: c => c.m.savingsRate.ofTakeHome ?? null },
    ],
    sheet: 'IF(OR(Math_M12="",Math_M27=""),"",IF(Math_M28_pretax+Math_M28_match>0,(Math_M27+Math_M28_pretax+Math_M28_match)/(Math_M12+Math_M28_pretax+Math_M28_match),Math_M27/Math_M12))',
    label: '(Surplus + 401(k) and HSA from the paycheck + match) over (take-home + the same)', app: c => c.m.savingsRate.value },
  { id: 'M29', name: 'DRAFTT shares', inputs: 'lines tagged by letter', unit: 'pct', fns: ['spending.drafttShares', 'spending.DRAFTT'],
    fromApp: 'seven shares, one per letter; each is a row below', app: () => null,
    parts: DRAFTT.map(k => ({ key: k, name: `${k} share of take-home`, unit: 'pct',
      sheet: `IF(OR(Math_M12="",N(Math_M12)=0),"",(SUMIFS(Spend_M21,Spend_draftt,"${k}",Spend_InMath,"Yes")${k === 'Debt' ? '+SUM(Debt_auto)' : ''})/Math_M12)`,
      app: c => (c.x.takeHome ? sum(c.x.lines.filter(l => l.draftt === k), l => myShare(l, { roommates: c.x.roommates }).value) / c.x.takeHome : null) })) },
  { id: 'M2A', name: 'Housing %', inputs: 'rent or mortgage, utilities', unit: 'pct', fns: ['spending.housingPct'],
    cols: [{ area: 'spending', key: 'housing', label: 'Housing share a month (M2A)', unit: 'money', f: 'IF(OR(COUNTIF(Housing_category,{category})=0,{InMath}<>"Yes"),"",{@M21})' }],
    sheet: 'IF(OR(Math_M12="",COUNTIFS(Spend_category,"Rent or mortgage",Spend_amount,"<>",Spend_InMath,"Yes")=0),"",SUM(Spend_housing)/Math_M12)',
    label: 'Your share of rent and utilities over take-home (the reference line is Housing_line)', app: c => c.m.housingPct.value },
  { id: 'M2B', name: 'Accrual spread and prepaid balance', inputs: 'amount, date paid, months covered', unit: 'money', fns: ['spending.prepaidLeft'],
    fromApp: 'needs the date each prepayment was made, kept on the Budget line in SLAM', app: () => null },

  // ---------- Debt ----------
  { id: 'M30', name: 'Credit card minimum payment', inputs: 'balance, APR', unit: 'money', fns: ['debt.cardMinimum'],
    cols: [
      { area: 'debt', key: 'balUsed', label: 'Balance used', unit: 'money', f: `IF(${SKIP},"",IF({Status}="Not for me",0,{balance}))` },
      { area: 'debt', key: 'aprUsed', label: 'APR used', unit: 'pct', f: `IF(${SKIP},"",IF({Status}="Not for me",0,IF({apr}<>"",{apr},{app:guess})))`,
        app: { guess: (rec, c) => (debtOf(rec, c)?.aprGuess ? debtOf(rec, c).apr : '') } },
      { area: 'debt', key: 'payUsed', label: 'Payment used a month (M30)', unit: 'money',
        f: `IF(${SKIP},"",IF({Status}="Not for me",0,IF({Type}="Credit card",IF({payChoice}="In full",{@balUsed},IF(OR({payChoice}="Minimum",{payment}=""),IF(OR({@balUsed}="",{@aprUsed}=""),"",MIN({@balUsed},MAX(CardMin_floor,{@balUsed}*CardMin_pct+{@balUsed}*{@aprUsed}/12))),{payment})),{payment})))` },
      { area: 'debt', key: 'isMin', label: 'On the card minimum', unit: 'number', f: 'IF(AND({Type}="Credit card",{payChoice}<>"In full",OR({payChoice}="Minimum",{payment}=""),ISNUMBER({@payUsed})),1,0)' },
      { area: 'debt', key: 'payOut', label: 'Payment counted a month', unit: 'money', f: 'IF(OR({@payUsed}="",{payChoice}="In full"),"",{@payUsed})' },
      { area: 'debt', key: 'auto', label: 'Budget line From Debt', unit: 'money', f: 'IF(AND(N({@payUsed})>0,{payChoice}<>"In full",N({@balUsed})<>0),{@payUsed},"")' },
    ],
    sheet: 'IF(COUNTIFS(Debt_isMin,1)=0,"",SUMIFS(Debt_payUsed,Debt_isMin,1))', label: 'Card minimums a month (cards on the minimum, or with no payment typed)',
    app: c => { const l = c.x.debts.filter(d => d.paymentIsMinimum); return l.length ? sum(l, d => d.payment) : null; } },
  { id: 'M31', name: 'Payoff months', inputs: 'balance, APR, payment', unit: 'months', fns: ['debt.payoffMonths', 'debt.paymentNeeded'],
    cols: [{ area: 'debt', key: 'M31', label: 'Payoff months (M31)', unit: 'months',
      f: `IF(OR(${SKIP},{@balUsed}="",{@aprUsed}="",{@payUsed}=""),"",IF({payChoice}="In full",1,IF({@balUsed}<=0,0,IF({@payUsed}<={@aprUsed}/12*{@balUsed},"Never",ROUNDUP(NPER({@aprUsed}/12,-{@payUsed},{@balUsed})-0.000000001,0)))))` }],
    sheet: 'IF(COUNT(Debt_M31)=0,"",MAX(Debt_M31))', label: 'Longest payoff at today\'s payments, months',
    app: c => { const v = c.m.debts.map(d => d.payoff?.value).filter(x => x != null); return v.length ? Math.max(...v) : null; } },
  { id: 'M32', name: 'Total interest', inputs: 'M31', unit: 'money', fns: ['debt.totalInterest'],
    cols: [{ area: 'debt', key: 'M32', label: 'Interest left (M32)', unit: 'money',
      f: `IF(OR({@M31}="",{@M31}="Never"),"",IF({payChoice}="In full",0,IF({@balUsed}<=0,-{@balUsed},NPER({@aprUsed}/12,-{@payUsed},{@balUsed})*{@payUsed}-{@balUsed})))` }],
    sheet: 'IF(COUNT(Debt_M32)=0,"",SUM(Debt_M32))', label: 'Interest left on every debt at today\'s payments',
    app: c => { const v = c.m.debts.map(d => d.interest?.value).filter(x => x != null); return v.length ? sum(v) : null; } },
  { id: 'M33', name: 'Payday or fee APR', inputs: 'fee, amount, period', unit: 'pct', fns: ['debt.feeApr'],
    cols: [{ area: 'debt', key: 'M33', label: 'Fee as an APR (M33)', unit: 'pct', f: 'IF(OR({fee}="",N({balance})=0,{periods}=""),"",{fee}/{balance}*{periods})' }],
    sheet: 'IF(COUNT(Debt_M33)=0,"",MAX(Debt_M33))', label: 'Highest fee APR',
    app: c => { const v = c.live.filter(r => r.kind === 'debt').map(r => feeApr({ fee: r.values.fee ?? null, amount: r.values.balance || null, periodsPerYear: r.values.periods ?? null }).value).filter(x => x != null); return v.length ? Math.max(...v) : null; } },
  { id: 'M34', name: 'Payoff order with extra payment', inputs: 'debts, extra, order', unit: 'months', fns: ['debt.payoffPlan', 'debt.simulateDebt'],
    fromApp: 'a month-by-month simulation that rolls each cleared payment onto the next debt (up to 1,200 rows)',
    app: c => { const ds = c.x.debts.filter(d => !d.inFull && d.balance > 0 && d.apr != null && d.payment != null); return ds.length ? payoffPlan(ds, { order: c.x.debtOrder }).months : null; } },
  { id: 'M35', name: 'Utilization', inputs: 'cards', unit: 'pct', fns: ['debt.utilization'],
    sheet: 'IF(SUMIFS(Debt_limit,Debt_Type,"Credit card",Debt_limit,">0")=0,"",SUMIFS(Debt_balance,Debt_Type,"Credit card",Debt_limit,">0")/SUMIFS(Debt_limit,Debt_Type,"Credit card",Debt_limit,">0"))',
    app: c => utilization(c.doc.records.filter(r => r.kind === 'debt' && r.type === 'Credit card').map(r => ({ balance: r.values.balance, limit: r.values.limit }))).value },
  { id: 'M36', name: 'Debt-to-income', inputs: 'debts, gross', unit: 'pct', fns: ['debt.debtToIncome'],
    sheet: 'IF(OR(Math_M13="",N(Math_M13)=0,COUNTIFS(Debt_balUsed,">0")=0),"",SUM(Debt_payUsed)/(Math_M13/12))',
    app: c => debtToIncome({ monthlyDebtPayments: c.x.debts.some(d => d.balance > 0) ? sum(c.x.debts, d => d.payment) : null, grossMonthly: c.x.grossAnnual == null ? null : c.x.grossAnnual / 12 }).value },
  { id: 'M37', name: 'Promo solver', inputs: 'balance, promo end', unit: 'money', fns: ['debt.promoPayment'],
    cols: [{ area: 'debt', key: 'M37', label: 'Payment to clear by the promo end (M37)', unit: 'money',
      f: (rec, c) => `IF(OR({promoEnd}="",{@balUsed}=""),"",IF((YEAR({promoEnd})-${c.now.getFullYear()})*12+MONTH({promoEnd})-${c.now.getMonth() + 1}<=0,"",{@balUsed}/((YEAR({promoEnd})-${c.now.getFullYear()})*12+MONTH({promoEnd})-${c.now.getMonth() + 1})))`}],
    sheet: 'IF(COUNT(Debt_M37)=0,"",SUM(Debt_M37))', label: 'Payments a month to clear every promo balance in time (months counted from the day this file was made)',
    app: c => { const v = c.live.filter(r => r.kind === 'debt' && r.values.promoEnd).map(r => promoPayment({ balance: r.values.balance ?? null, monthsLeft: monthsUntil(r.values.promoEnd, c.now) }).value).filter(x => x != null); return v.length ? sum(v) : null; } },

  // ---------- Assets and net worth ----------
  { id: 'M40', name: 'Total net worth', inputs: 'all accounts', unit: 'money', fns: ['assets.netWorth'],
    cols: [
      { area: 'assets', key: 'val', label: 'Value used', unit: 'money', f: `IF(${SKIP},"",IF({Status}="Not for me",0,IF({Kind}="Account",{balance},{value})))` },
      { area: 'assets', key: 'M40', label: 'Counts in net worth (M40)', unit: 'money', f: 'IF({@val}="","",{@val}-N({unvested}))' },
    ],
    sheet: 'IF(COUNTIFS(Assets_InMath,"<>No")+COUNTIFS(Debt_InMath,"<>No")=0,IF(Profile_noneOfThese="Yes",0,""),SUM(Assets_M40)-SUM(Debt_balUsed))', label: 'Assets (vested only) minus debts',
    app: c => c.m.netWorth.value },
  { id: 'M41', name: 'Liquid net worth', inputs: 'accounts, debts', unit: 'money', fns: ['assets.liquidNetWorth'],
    cols: [{ area: 'debt', key: 'consumer', label: 'Consumer debt', unit: 'number', f: 'IF(COUNTIF(Consumer_type,{Type})>0,1,0)' }],
    parts: [
      { key: 'cash', name: 'Cash (checking, savings and other cash)', unit: 'money', sheet: 'IF(COUNTIFS(Assets_group,"cash",Assets_InMath,"<>No")=0,IF(Profile_noneOfThese="Yes",0,""),SUMIFS(Assets_val,Assets_group,"cash"))', app: c => c.x.cash },
      { key: 'invested', name: 'Invested (every investment account)', unit: 'money', sheet: 'IF(COUNTIFS(Assets_group,"investment",Assets_InMath,"<>No")=0,IF(Profile_noneOfThese="Yes",0,""),SUMIFS(Assets_val,Assets_group,"investment"))', app: c => c.x.invested },
    ],
    sheet: 'IF(Math_M41_cash="","",Math_M41_cash+SUMIFS(Assets_val,Assets_Type,"Brokerage")-SUMIFS(Debt_balUsed,Debt_consumer,1))', label: 'Cash plus brokerage minus consumer debt',
    app: c => c.m.liquidNetWorth.value },
  { id: 'M42', name: 'Runway months', inputs: 'cash, spending', unit: 'months', fns: ['assets.runway'],
    sheet: 'IF(OR(Math_M41_cash="",Math_M27_spending=""),"",IF(Math_M27_spending<=0,"",Math_M41_cash/Math_M27_spending))', app: c => c.m.runwayMonths.value },
  { id: 'M43', name: 'Rule of 5', inputs: 'age, spending, cash', unit: 'money', fns: ['assets.ruleOf5'],
    cols: [{ area: 'profile', key: 'ageUsed', label: 'Age (worked out)', unit: 'number',
      f: (rec, c) => `IF({age}<>"",{age},IF({birthYear}="","",${c.now.getFullYear()}-{birthYear}-IF(${c.now.getMonth() + 1}<N({birthMonth}),1,0)))` }],
    parts: [
      { key: 'months', name: 'Target months (age divided by 5)', unit: 'months', sheet: 'IF(Profile_ageUsed="","",Profile_ageUsed/RuleOf5)', app: c => c.m.ruleOf5.months ?? null },
      { key: 'keepPace', name: 'Keep pace: add a month', unit: 'money', sheet: 'IF(Math_M27_spending="","",Math_M27_spending/KeepPace)', app: c => c.m.ruleOf5.keepPace ?? null },
      { key: 'gap', name: 'Gap: target minus cash', unit: 'money', sheet: 'IF(OR(Math_M43="",Math_M41_cash=""),"",Math_M43-Math_M41_cash)', app: c => c.m.ruleOf5.gap ?? null },
    ],
    sheet: 'IF(OR(Math_M43_months="",Math_M27_spending=""),"",Math_M43_months*Math_M27_spending)', label: 'Rule of 5 target: target months times spending',
    app: c => c.m.ruleOf5.value },
  { id: 'M44', name: 'Contribution limit used', inputs: 'contributions, Reference data', unit: 'pct', fns: ['assets.limitUsed'],
    fromApp: 'each account\'s contributions this year come from its paychecks, its 401(k) link and employer HSA money; shown inside each account in SLAM', app: () => null },

  // ---------- Goals and projection ----------
  { id: 'M50', name: 'FI number', inputs: 'spending, withdrawal rate', unit: 'money', fns: ['fi.fiNumber'],
    sheet: 'IF(OR(RetirementSpending="",WithdrawalRate=""),"",RetirementSpending*12/WithdrawalRate)', label: 'Spending in retirement a year over the withdrawal rate', app: c => c.m.fiNumber.value },
  { id: 'M51', name: 'Lean FI number', inputs: 'Food, Accommodation, Transportation lines', unit: 'money', fns: ['fi.leanFiNumber'],
    cols: [{ area: 'spending', key: 'fat', label: 'Food, housing or transportation', unit: 'number', f: 'IF(OR({draftt}="Food",{draftt}="Accommodation",{draftt}="Transportation"),1,0)' }],
    sheet: 'IF(SUMIFS(Spend_M21,Spend_fat,1,Spend_InMath,"Yes")=0,"",SUMIFS(Spend_M21,Spend_fat,1,Spend_InMath,"Yes")*12/WithdrawalRate)', app: c => c.targets()['Lean FI'].value },
  { id: 'M52', name: 'Barista FI number', inputs: 'part-time income', unit: 'money', fns: ['fi.baristaFiNumber'],
    sheet: 'IF(OR(Profile_keepJobAfterLaunch="No",RetirementSpending="",PartTimeIncome=""),"",(RetirementSpending-PartTimeIncome)*12/WithdrawalRate)', app: c => c.targets()['Barista FI'].value ?? null },
  { id: 'M53', name: 'FI date', inputs: 'invested, M28 before-tax saving and match, M27 if invested, M02, M50', unit: 'months', fns: ['fi.fiDate'],
    parts: [{ key: 'growth', name: 'Growth a month at the return', unit: 'pct', sheet: '(1+RealReturn)^(1/12)-1', app: c => (1 + c.x.realReturn) ** (1 / 12) - 1 },
      // Answer to 11: what goes in each month. The surplus counts only after Invest my surplus (InvestSurplus = 1).
      { key: 'invest', name: 'Invested a month: 401(k), HSA, match, plus the surplus if you invest it', unit: 'money', sheet: 'IF(Math_M27="","",Math_M28_pretax+Math_M28_match+IF(N(InvestSurplus)=1,Math_M27,0))', app: c => c.m.investing?.monthly ?? null }],
    sheet: 'IF(OR(Math_M41_invested="",Math_M27="",Math_M50=""),"",IF(Math_M41_invested>=Math_M50,0,IF(Math_M53_growth=0,IF(Math_M53_invest>0,IF(ROUNDUP((Math_M50-Math_M41_invested)/Math_M53_invest-0.000000001,0)>MaxMonths,"Never",ROUNDUP((Math_M50-Math_M41_invested)/Math_M53_invest-0.000000001,0)),"Never"),IF(Math_M41_invested+Math_M53_invest/Math_M53_growth<=0,"Never",IF(ROUNDUP(LN((Math_M50+Math_M53_invest/Math_M53_growth)/(Math_M41_invested+Math_M53_invest/Math_M53_growth))/LN(1+Math_M53_growth)-0.000000001,0)>MaxMonths,"Never",ROUNDUP(LN((Math_M50+Math_M53_invest/Math_M53_growth)/(Math_M41_invested+Math_M53_invest/Math_M53_growth))/LN(1+Math_M53_growth)-0.000000001,0))))))',
    label: 'Months until investments reach the FI number, at what goes in each month', app: c => c.m.monthsToFi.value, never: c => !!c.m.monthsToFi.never },
  { id: 'M54', name: 'Coast FI', inputs: 'M50, M02, ages', unit: 'money', fns: ['fi.coastFi', 'foo.coastFiNumber'],
    sheet: 'IF(OR(Math_M50="",Profile_ageUsed="",FiAge=""),"",Math_M50/(1+RealReturn)^MAX(0,FiAge-Profile_ageUsed))', label: 'The FI number brought back to today at the return', app: c => c.m.coastFi.value },
  { id: 'M55', name: '% to each FI', inputs: 'M50 to M54', unit: 'pct', fns: ['fi.pctToFi'],
    sheet: 'IF(OR(Math_M41_invested="",Math_M50="",N(Math_M50)=0),"",Math_M41_invested/Math_M50)', label: 'Invested over the FI number', app: c => (c.x.invested == null || !c.m.fiNumber.value ? null : c.x.invested / c.m.fiNumber.value) },
  { id: 'M56', name: 'These are big deals', inputs: 'M53', unit: 'text', fns: ['fi.bigDeals'],
    fromApp: 'runs the FI date once for every preset and picks the one that moves it most', app: c => c.m.bigDeals.value },
  { id: 'M57', name: 'Solvers', inputs: 'M53', unit: 'money', fns: ['fi.solveMonthlySaving', 'fi.solveSpending'],
    fromApp: 'a search (bisection) on the FI date; on Plan › Goals in SLAM', app: () => null },
  { id: 'M58', name: 'Money as time', inputs: 'M17, spending', unit: 'number', fns: ['fi.moneyAsTime', 'time.inView', 'time.timeChip'],
    parts: [{ key: 'hours', name: 'Hours of work for $100', unit: 'number', sheet: 'IF(AND(Math_M17="",Math_M12=""),"",100/IF(Math_M17<>"",Math_M17,Math_M12/HoursPerMonth))', app: c => moneyAsTime({ amount: 100, hourlyWage: c.m.hourly.value, annualSpending: c.m.annualSpending }).value.hours }],
    sheet: 'IF(Math_M27_spending="","",100/(Math_M27_spending*12/365))', label: 'FI days for $100 (days of spending it pays for)',
    app: c => moneyAsTime({ amount: 100, hourlyWage: c.m.hourly.value, annualSpending: c.m.annualSpending }).value.fiDays },

  // ---------- Calendar ----------
  { id: 'M60', name: 'Running balance', inputs: 'calendar entries', unit: 'money', fns: ['calendar.runningBalance', 'markers.calendarMarkers'],
    fromApp: 'a day-by-day walk through the calendar with each paid, moved and maybe mark; on Cash flow › Calendar', app: () => null },
  { id: 'M61', name: 'Bonus paycheck months', inputs: 'pay dates', unit: 'text', fns: ['calendar.bonusMonths'],
    fromApp: 'counts the paydays in each month from the next payday; on Cash flow › Calendar', app: () => null },

  // ---------- Close the books ----------
  { id: 'M62', name: 'Net worth statement', inputs: 'accounts, assets, debts', unit: 'money', fns: ['statements.netWorthStatement', 'statements.ASSET_ORDER', 'statements.DEBT_ORDER', 'statements.valueAt', 'statements.assetGroup', 'statements.debtGroup'],
    sheet: 'Statements_netWorth', label: 'Net worth on the Statements tab (same total as M40)', app: c => c.nwStatement().netWorth },
  { id: 'M63', name: 'Income and spending statement (accrual)', inputs: 'income, lines, match', unit: 'money', fns: ['statements.incomeMonth', 'statements.statements', 'statements.statementRows', 'statements.periodMonths', 'statements.previous', 'statements.periodOf', 'metrics.flowOf'],
    sheet: 'Statements_surplus', label: 'Surplus on the Statements tab (a usual month on the plan)', app: c => c.m.surplus.value },
  { id: 'M64', name: 'Cash flow statement (cash basis)', inputs: 'calendar marks, contributions, debts', unit: 'money', fns: ['statements.cashMonth', 'statements.BUCKETS', 'statements.defaultBucket'],
    fromApp: 'built from each calendar item marked paid this month; the marks stay in SLAM', app: c => c.statements()?.cash.end ?? null },
  { id: 'M65', name: 'Cash tie-out', inputs: 'M62, M64', unit: 'money', fns: ['statements.tieOut'],
    sheet: 'Statements_unexplained', label: 'Cash in the accounts minus cash on the cash flow statement', app: c => c.statements()?.tie.unexplainedCash ?? null },
  { id: 'M66', name: 'Net worth bridge', inputs: 'two snapshots, M63', unit: 'money', fns: [],
    fromApp: 'needs net worth at the start of the month, from the dated history in SLAM', app: c => c.statements()?.tie.bridge.change ?? null },
  { id: 'M67', name: 'Accrual vs cash surplus', inputs: 'M63, M64', unit: 'money', fns: [],
    fromApp: 'compares the month\'s plan with what was paid, line by line, from the calendar', app: c => c.statements()?.tie.accrualVsCash.difference ?? null },
  { id: 'M68', name: 'Cash layers', inputs: 'cash, deductibles, gaps, lines', unit: 'money', fns: ['layers.LITTLE_E', 'layers.STABILITY', 'layers.littleE', 'layers.gapStep', 'layers.cashLayers', 'layers.backupRunway', 'layers.layersOf'],
    cols: [{ area: 'protection', key: 'dedMax', label: 'Highest deductible', unit: 'money', f: `IF(${SKIP},"",MAX(N({deductible}),N({deductibleOut})))` }],
    parts: [{ key: 'littleE', name: 'little e: the highest deductible, at most LittleE', unit: 'money',
      sheet: 'IF(N(MAX(Protection_dedMax))<=0,LittleE,MIN(LittleE,MAX(Protection_dedMax)))',
      app: c => c.layers().littleE.target }],
    fromApp: 'fills little e, income gaps, big e (FAT, DRAFTT and full) and sinking funds in order from cash; on Net worth › Assets', app: c => sum(c.layers().layers, l => l.target) },
  { id: 'M69', name: 'FOO placement', inputs: 'every number', unit: 'text', fns: ['foo.foo', 'foo.forgiveness', 'foo.ORIGINAL'],
    sheet: 'FOO_here', label: 'The step you are on (FOO tab)', app: c => c.foo().here },
  { id: 'M70', name: 'Quiet Quitting FI', inputs: 'FI number, r, age, FI age, Roth limit', unit: 'money', fns: ['foo.quietQuittingFi'],
    parts: [{ key: 'minimum', name: 'Yearly minimum (the Roth IRA limit, plus the match if a job is kept)', unit: 'money', sheet: 'Limit_IRA+IF(Profile_keepJobAfterLaunch="Yes",Math_M15,0)', app: c => c.foo().yearlyMinimum }],
    sheet: 'IF(OR(Math_M50="",Profile_ageUsed="",FiAge=""),"",MAX(0,(Math_M50-IF(RealReturn=0,Math_M70_minimum*MAX(0,FiAge-Profile_ageUsed),Math_M70_minimum*((1+RealReturn)^MAX(0,FiAge-Profile_ageUsed)-1)/RealReturn))/(1+RealReturn)^MAX(0,FiAge-Profile_ageUsed)))',
    app: c => c.foo().qq.value },
  { id: 'M71', name: 'Efficiency flags', inputs: 'M69', unit: 'number', fns: [],
    fromApp: 'tests in data/flags.json on facts the FOO works out', app: c => c.foo().flags.length },
  { id: 'M72', name: 'Shockingly Simple Math', inputs: 'M28, return, WR', unit: 'years', fns: ['simple.simpleMath', 'simple.yearsAtRate'],
    sheet: 'IF(OR(Math_M28="",N(Math_M28)<=0),"",IF(Math_M28>=1,0,ROUNDUP(LN(1+(1-Math_M28)*12/WithdrawalRate*Math_M53_growth/Math_M28)/LN(1+Math_M53_growth)-0.000000001,0)/12))',
    label: 'Years to FI from $0 at your savings rate', app: c => simpleMath({ savingsRate: c.m.savingsRate.value == null ? null : Math.max(0, c.m.savingsRate.value), realReturn: c.x.realReturn, withdrawalRate: c.x.withdrawalRate }).value },
];

// js/math exports that are not an M formula of their own: how records become formula inputs, account details, and
// result plumbing. Each says why it has no row of its own.
export const SUPPORT = {
  'result.ok': 'wraps a number with its plain-words math', 'result.needs': 'says what a number still needs', 'result.isBlank': 'a blank check',
  'result.missing': 'lists blank inputs', 'result.joinWords': 'joins words for Needs ...', 'result.fmt': 'number formats for the math text',
  'metrics.inputsOf': 'reads the records into formula inputs (the Inputs tabs)', 'metrics.metrics': 'runs every formula for the screens (the Math tab)',
  'metrics.placeOf': 'NY and NYC from the Profile (Profile tab: State, Live in New York City)', 'metrics.ageOf': 'age from birth year (Profile tab: Age worked out)',
  'metrics.keyNumbers': 'the numbers a snapshot keeps', 'metrics.firstDebt': 'the first debt of a type, for the demo check',
  'linked.autoId': 'ids for lines From Debt', 'linked.isAuto': 'spots a line From Debt', 'linked.debtLines': 'each debt payment as a Budget line (Debt tab: Budget line From Debt)',
  'linked.paidFromOf': 'paycheck or Budget for a premium', 'linked.premiumSources': 'premiums as spending', 'linked.duplicates': 'counts a line and its debt or premium once (In the math: Counted once)',
  'linked.afterTaxContributions': 'savings put in after tax',
  'spending.coveredShare': 'how much of a line someone else covers, until its takeover month (part of M21)',
  'spending.DRAFTT_NAME': 'what each DRAFTT letter is called on screen (T reads Health and self-care)', 'spending.drafttName': 'a DRAFTT letter\'s name on screen',
  'match.appAnswers': 'the demo check', 'match.compare': 'the demo check',
  'simple.payYourselfFirst': 'Pay yourself first, a line above the income statement (Statements tab)',
  'portfolio.ASSET_CLASSES': 'inside one account: asset classes', 'portfolio.DRIFT_POINTS': 'inside one account: allocation drift',
  'portfolio.CONCENTRATION': 'inside one account: one big holding', 'portfolio.STALE_DAYS': 'inside one account: an old balance',
  'portfolio.holdingValue': 'inside one account: holdings', 'portfolio.allocationOf': 'inside one account: allocation', 'portfolio.driftOf': 'inside one account: allocation drift',
  'portfolio.holdingsOf': 'inside one account: holdings', 'portfolio.monthsUntil': 'months to a date', 'portfolio.tagsOf': 'inside one account: purpose tags',
  'portfolio.growthOf': 'inside one account: growth', 'portfolio.taxTreatment': 'inside one account: tax treatment', 'portfolio.accessRule': 'inside one account: when the money can be used',
  'portfolio.feesOf': 'inside one account: fees', 'portfolio.staleOf': 'inside one account: an old balance', 'portfolio.uninvestedOf': 'inside one account: cash not invested',
  'portfolio.netWorthCheck': 'inside one account: share of net worth', 'portfolio.paychecksPerYear': 'paychecks a year (Assumptions: Per table)',
  'portfolio.yearlyContribution': 'inside one account: a year in', 'portfolio.contributionFromMonthly': 'inside one account: a month in',
  'portfolio.matchFromTiers': 'the match from its tiers (M15)', 'portfolio.contributionSplit': 'inside one account: pretax and Roth',
  'portfolio.vestedOf': 'inside one account: vested', 'portfolio.hsaFeeCompare': 'inside one account: HSA fees', 'portfolio.link401k': 'Income and the 401(k) fill each other (Income tab: 401(k) % used)',
  'portfolio.paychecksLeft': 'paychecks left this year', 'portfolio.hsaProgress': 'inside one account: HSA this year', 'portfolio.rothLog': 'inside one account: the Roth IRA log',
};

export const mathById = id => MATH.find(e => e.id === id);
export const rowsOf = e => [{ ...e, key: null, name: e.label ?? e.name }, ...(e.parts || []).map(p => ({ ...p, key: p.key, entry: e.id }))];
export { defaultFilingStatus, PAYS };

// What an entry must say to be in the registry. One plain sentence per problem (the coverage test shows them).
export function mathProblems(entries = MATH) {
  const out = [];
  for (const e of entries) {
    if (!e.id || !e.name || !e.inputs || typeof e.app !== 'function') out.push(`${e.id ?? '?'}: needs an id, a plain-words name, its inputs and app().`);
    if (!!e.sheet === !!e.fromApp) out.push(`${e.id}: needs a sheet formula, or fromApp with a one-line reason (not both).`);
    if (e.fromApp && String(e.fromApp).length < 15) out.push(`${e.id}: say why it comes from the app.`);
    for (const p of e.parts || []) if (!p.key || !p.name || !!p.sheet === !!p.fromApp || typeof p.app !== 'function') out.push(`${e.id} ${p.key ?? '?'}: a part needs a key, a name, a formula or fromApp, and app().`);
    for (const c of e.cols || []) if (!c.area || !c.key || !c.label || !c.f) out.push(`${e.id}: a formula column needs area, key, label and f.`);
  }
  return out;
}
