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
import { MODES } from './couples.js';
import { DRAFTT, CATEGORIES, myShare, irregularSetAside, estimateVsActual } from '../math/spending.js';
import { takeHomeFromGross, variableSafeBudget, realHourlyWage, monthlyFrom, defaultFilingStatus, quarterlySetAside } from '../math/income.js';
import { payoffPlan, feeApr, utilization, debtToIncome, promoPayment } from '../math/debt.js';
import { moneyAsTime, fiDate } from '../math/fi.js';
import { monthsUntil } from '../math/portfolio.js';
import { holidaysOf } from '../math/holidays.js';
import { simpleMath } from '../math/simple.js';
import { pictureOf, paceOf, unlockOf, confidenceOf, nextSmallThings, levelOf } from '../math/picture.js';
import { sessionNo } from '../program.js';
import { scorecardOf } from '../math/scorecard.js';
import { ladderOf } from '../math/ladder.js';
import { saferFi } from '../math/fi.js';
import { compareOf, netWorthIn, shortfallOf } from '../math/proposed.js';
import { closeStreak, byCategory, monthView, ymOf, addMonths } from '../month.js';
import { affordOf } from '../math/afford.js';
import { trueCostOf, loanOffers } from '../math/truecost.js';
import { studentLoanPlans } from '../math/studentloan.js';
import { foo } from '../math/foo.js';
import { gapOf } from '../math/gap.js';
import { nextMoves } from '../math/moves.js';
import { transitionOf } from '../math/transitions.js';
import { fireDrillOf } from '../math/firedrill.js';
import { project } from '../math/projection.js';
import { cardsPicture, creditMove } from '../math/cards.js';
import { cardLibrary } from '../cardlib.js';
import { skillLibrary } from '../library.js';
import { libraryOf } from '../math/library.js';
import { priorsData } from '../priorslib.js';
import { typicalChecks, typicalBoxes, typicalOf, priorsOpts } from '../math/priors.js';
import { agePlanOf, ageOnlyRangesOf, priorOf, answeredOf } from '../math/agestart.js';
// Batch 63 (M9Q in the sheet): the key outputs the meter weighs, as [Key, label, weight, Ranges tab key, a date].
const CERT_KEYS = [['Fi', 'FI date', 'CertaintyWeightFi', 'fi', true], ['DebtFree', 'Debt-free date', 'CertaintyWeightDebtFree', 'df', true], ['EfMonths', 'Emergency fund months', 'CertaintyWeightEf', 'ef', false], ['Surplus', 'Monthly surplus', 'CertaintyWeightSurplus', 'sur', false], ['NetWorth', 'Net worth', 'CertaintyWeightNetWorth', 'nw', false]];
const CERT_W = `(${CERT_KEYS.map(([k, , w]) => `IF(Math_M9Q_cert${k}="",0,${w})`).join('+')})`;
const ASK = new WeakMap();
// Batch 63 (M9N in the sheet): the tabs whose rows have an Owner, and their prefixes.
const M9N_PREFIX = { income: 'Income', debt: 'Debt', assets: 'Assets', protection: 'Protection', spending: 'Spend', goals: 'Goals' }; // calendar entries have no Owner column
const M9N_AREAS = Object.keys(M9N_PREFIX);
const askOf = c => { if (!ASK.has(c)) { let A = null; try { A = askNextOf(c.doc, c.ref, { now: c.now, m: c.m, R: c.ranges(), F: c.fooRange(), zero: zeroOf(c) }); } catch { A = null; } ASK.set(c, A); } return ASK.get(c); };
// Batch 46 (QUESTIONS 371): the certainty meter's 0% is the plan from the age alone, as on screen.
const zeroOf = c => { const d = priorsData(); return d ? ageOnlyRangesOf(c.doc, c.ref, d, { now: c.now }) : null; };
import { creditHealth } from '../math/debt.js';
import { identityOf } from '../math/identity.js';
import { lenderOf } from '../math/lender.js';
import { askNextOf, spanOf } from '../math/nextbest.js';
import { cliffOf } from '../math/cliff.js';
import { rowShare, amongOf } from '../math/household.js';
import { householdOf, MAX_ADULTS } from './couples.js';
import { setCatSum, rawChanges, STATUS_LEVEL, WIDTH } from '../sheet/ranges.js';
import { TYPICAL as TYP, FILL, ANSWERED, farCount } from '../sheet/typical.js';
import { shiftPnlsOf } from '../math/shiftpnl.js';

const sum = (list, f = x => x) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const PAYS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };
const INCOME = '{Kind}="Income"';
const SKIP = '{InMath}="No"';
// M53 in the sheet (batch 11): months from a start balance S at P a month to the FI number, with the same "Never" past
// the longest path; then the debt-first months (Math_M53_debtMonths at Math_M53_before) run first.
const nper = (S, P, cap = 'MaxMonths') => `IF(Math_M53_growth=0,IF(${P}>0,IF(ROUNDUP((Math_M50-${S})/${P}-0.000000001,0)>${cap},"Never",ROUNDUP((Math_M50-${S})/${P}-0.000000001,0)),"Never"),IF(${S}+${P}/Math_M53_growth<=0,"Never",IF(ROUNDUP(LN((Math_M50+${P}/Math_M53_growth)/(${S}+${P}/Math_M53_growth))/LN(1+Math_M53_growth)-0.000000001,0)>${cap},"Never",ROUNDUP(LN((Math_M50+${P}/Math_M53_growth)/(${S}+${P}/Math_M53_growth))/LN(1+Math_M53_growth)-0.000000001,0))))`;
// Batch 15: known changes ahead (Math_M53_at1 to at4, Math_M53_ch1 to ch4: from month at on, what goes in moves by
// ch). After the debt-first months the path runs in segments, each at its own amount a month; the FI date falls in the
// first segment whose end balance reaches the FI number. With no changes this is the two-phase formula from batch 11.
export const CHANGE_SLOTS = 4;
function m53Sheet() {
  const H = 'N(Math_M53_debtMonths)', inv = 'Math_M41_invested', B = 'Math_M53_before';
  const after = `FV(Math_M53_growth,${H},-${B},-${inv})`;
  const phase1 = nper(inv, B);
  const P = j => `(Math_M53_invest${Array.from({ length: j }, (_, k) => `+N(Math_M53_ch${k + 1})`).join('')})`;
  const S = j => (j === 0 ? after : `Math_M53_seg${j}`);
  const T = j => (j === 0 ? H : `Math_M53_at${j}`);
  const tail = j => `IF(ISNUMBER(${nper(S(j), P(j), `MaxMonths-${T(j)}`)}),${T(j)}+${nper(S(j), P(j), `MaxMonths-${T(j)}`)},"Never")`;
  const seg = j => (j === CHANGE_SLOTS ? tail(j)
    : `IF(Math_M53_at${j + 1}="",${tail(j)},IF(Math_M53_seg${j + 1}>=Math_M50,IF(ISNUMBER(${nper(S(j), P(j), `MaxMonths-${T(j)}`)}),${T(j)}+${nper(S(j), P(j), `MaxMonths-${T(j)}`)},"Never"),${seg(j + 1)}))`);
  return `IF(OR(${inv}="",Math_M27="",Math_M50=""),"",IF(${inv}>=Math_M50,0,IF(AND(${H}>0,${after}>=Math_M50),${phase1},${seg(0)})))`;
}
// The change points the sheet uses: each change at the month it takes effect on the path (never inside the debt-first
// months), merged by month, in order.
export function changeSlots(m) {
  const H = m.investing?.before?.months ?? 0, by = new Map();
  for (const c of m.investing?.changes || []) { const at = Math.max(c.at, H); by.set(at, (by.get(at) ?? 0) + c.monthly); }
  return [...by].sort((a, b) => a[0] - b[0]).map(([at, monthly]) => ({ at, monthly }));
}

const MONTH_FACTOR = per => `IFERROR(INDEX(Per_month,MATCH(${per},Per_name,0)),1)`;
const PAYS_A_YEAR = 'IFERROR(INDEX(Per_year,MATCH({payFrequency},Per_name,0)),26)';
const bracket = (t, table) => `SUMPRODUCT((${t}>${table}_over)*(${t}-${table}_over)*${table}_step)`;

// The income row the metrics worked out for a record (take-home, gross, pretax, Roth), or null.
const inc = (rec, c) => c.x.income.find(i => i.r.id === rec.id) ?? null;
const debtOf = (rec, c) => c.x.debts.find(d => d.id === rec.id) ?? null;

// Batch 5 (E): is a shared group on in the sheet? Its About you box when answered, else (with roommates) the config default.
// A group is on when ticked; with no box touched at all (every shared cell blank) the roommate defaults apply, as sharedBillsOf does.
const SHARED_TOUCHED = `OR(${Object.keys(LISTS.sharedGroups).map(k => `Profile_shared_${k}<>""`).join(',')})`;
const SHARED_ON = (k, g) => `IF(${SHARED_TOUCHED},Profile_shared_${k}="Yes",${g.defaultOn ? 'N(Profile_roommates)>0' : 'FALSE'})`;

// Batch 7 (A): a category's amount in the sheet. Its typed row (Kind Category, Type the category key, a month) or its
// lines' shares when they add up to more; Debt adds the payments From Debt. Other is every line with no DRAFTT letter.
// Batch 10: a line counts by its level. Levels 1 and 2 (blank is 2) add up as they are; the level 3 lines (Everything
// else) count when any has a number, else the one rough amount on the category row (elseAmount). A faded starter
// line has no amount, so it adds nothing. Bills (Bills and subscriptions) has its own row; Other is every line whose
// letter is none of the named ones (blank, Wants).
const NAMED = ['Debt', 'Retirement', 'Accommodation', 'Food', 'Transportation', 'Taxes', 'Therapy', 'Bills'];
const LETTER = k => (k === 'Other' ? NAMED.map(n => `Spend_draftt,"<>${n}"`).join(',') : `Spend_draftt,"${k}"`);
const LINES_AT = (k, lv) => `SUMIFS(Spend_M21,Spend_InMath,"Yes",Spend_Kind,"Budget line",${LETTER(k)},Spend_level,"${lv}")`;
const CAT_LINES = k => `(${LINES_AT(k, '<>3')}+IF(COUNTIFS(Spend_InMath,"Yes",Spend_Kind,"Budget line",${LETTER(k)},Spend_level,"3",Spend_amount,"<>")>0,${LINES_AT(k, '3')},SUMIFS(Spend_elseAmount,Spend_InMath,"<>No",Spend_Kind,"Gut number or category",Spend_Type,"${k}",Spend_Status,"<>Not for me"))${k === 'Debt' ? '+SUM(Debt_auto)' : ''})`;
const CAT_TYPED = k => `SUMIFS(Spend_amount,Spend_InMath,"<>No",Spend_Kind,"Gut number or category",Spend_Type,"${k}",Spend_Status,"<>Not for me")`; // a category row is a month
const CAT_SUM = keep => CATEGORIES.filter(keep).map(k => `MAX(${CAT_TYPED(k)},${CAT_LINES(k)})`).join('+');
// Batch 63 (M9R): the spending total on the lines path with every line at one end of its range (Spend_M21lo, amtLo).
setCatSum(s => CAT_SUM(k => k !== 'Retirement').replace(/\bSpend_M21\b/g, `Spend_M21${s.toLowerCase()}`).replace(/\bSpend_amount\b/g, `Spend_amt${s}`));

export const MATH = [
  { id: 'M00', name: 'Units', inputs: 'none', fns: [], unit: 'text',
    fromApp: 'a convention, not a number: money is a month in today\'s dollars, rates are yearly decimals (7% = 0.07)', app: () => null },

  // ---------- Income and taxes ----------
  { id: 'M01', name: 'Monthly from any period', inputs: 'amount, period, pay frequency', unit: 'money', cents: true, fns: ['income.monthlyFrom'],
    cols: [{ area: 'income', key: 'M01', label: 'A month (M01)', unit: 'money',
      f: `IF(OR(${SKIP},{Kind}<>"Income",{amount}=""),"",{amount}*${MONTH_FACTOR('IF({per}="paycheck",{payFrequency},{per})')})` }],
    sheet: 'SUM(Income_M01)', label: 'Income rows, each as a month, added up',
    app: c => (c.x.income.length ? sum(c.x.income, i => monthlyFrom(i.r.amount, i.r.per, i.r.values.payFrequency).value) : null) },
  { id: 'M02', name: 'Real return', inputs: 'return preset', unit: 'pct', fns: ['fi.realReturn', 'fi.futureDollars'], sheet: 'RealReturn', app: c => c.x.realReturn },
  { id: 'M13', name: 'Gross from take-home', inputs: 'take-home, deductions', unit: 'money', fns: ['income.grossFromTakeHome'],
    cols: [
      { area: 'income', key: 'taxType', label: 'Taxed as', unit: 'text',
        f: `IF(${INCOME},IF({incomeType}<>"",{incomeType},IF(OR({Type}="Job",{Type}="Partner job"),"W-2",IF(OR({Type}="Side hustle",{Type}="Self-employed",{Type}="Platform"),"1099",IF({Type}="Unemployment","Unemployment","")))),"")` },
      { area: 'income', key: 'M13', label: 'Gross a year (M13)', unit: 'money',
        f: `IF(OR(${SKIP},{Kind}<>"Income",{@taxType}="Unemployment"),"",IF({@workMode}="Shifts",{@workGross},IF({Type}="Platform",IF({@platNet}="","",{@platNet}*12),IF({basis}="Gross",IF({@M01}="","",{@M01}*12),IF({gross}<>"",{gross},{app:solved})))))`, // batch 35: a shift job's gross is its shifts; a platform's is its payouts
        app: { solved: (rec, c) => (inc(rec, c)?.computed === 'gross' ? Math.round(inc(rec, c).gross) : '') } },
      // Batch 15, item 13: unemployment is taxed on the weeks paid this tax year (26 back from the end date when no start is typed).
      { area: 'income', key: 'uiYear', label: 'Unemployment taxed this year', unit: 'money',
        f: (rec, c) => { const y = c.now.getFullYear(), end = `IF({benefitEnd}="",DATE(${y},12,31),{benefitEnd})`;
          return `IF(OR(${SKIP},{@taxType}<>"Unemployment",{@M01}=""),"",{@M01}*12/52*IF(AND({benefitStart}="",{benefitEnd}=""),52,ROUND(MAX(0,MIN(${end},DATE(${y},12,31))-MAX(IF({benefitStart}="",${end}-UI_NY_weeks*7,{benefitStart}),DATE(${y},1,1)))/7,0)))`; } },
      { area: 'income', key: 'taxedGross', label: 'Taxed a year (gross, or unemployment this year)', unit: 'money', f: 'IF({@taxType}="","",IF({@taxType}="Unemployment",{@uiYear},{@M13}))' },
    ],
    sheet: 'IF(COUNT(Income_M13)=0,"",SUM(Income_M13))', label: 'Gross pay a year, all jobs (a gross worked back from take-home is the app\'s, found by trial: Excel has no reverse tax)',
    app: c => c.x.grossAnnual },
  // Batch 15, item 1: income tax once per return (Married jointly: one; else one per person), FICA per person with the
  // Social Security wage base per person. Rows stack in order (jobs, then 1099, then unemployment; then row order):
  // each row's tax is the return's tax with it minus the tax without it, so the rows add up to the return.
  { id: 'M10', name: 'Federal income tax', inputs: 'gross, before-tax deductions, filing status', unit: 'money', fns: ['income.federalTax', 'income.defaultFilingStatus', 'income.householdTax', 'income.STACK', 'income.noFica', 'income.tipsDeductionOf', 'earnings.reportedTipsYear', 'income.stateTaxLine',
    'income.filingKey', 'income.kidsOf', 'income.ctcKidsOf', 'income.childTaxCredit', 'income.ctcLineOf'], // batch 35: the tips deduction; the state line on Taxes; batch 53: head of household, the children, the Child Tax Credit
    cols: [
      { area: 'taxes', key: 'filing', label: 'Filing status used', unit: 'text', f: 'IF({filingStatus}<>"",{filingStatus},IF(OR(LEFT(Profile_mode,7)="Married",AND(Profile_mode="",Profile_household="Couple")),"Married jointly",IF(OR(N(Profile_dependents)>0,Profile_kidAges<>""),"Head of household","Single")))' }, // batch 53: a dependent and no marriage: Head of household
      { area: 'taxes', key: 'joint', label: 'Files jointly', unit: 'text', f: 'IF({@filing}="Married jointly","Yes","No")' },
      { area: 'income', key: 'pct', label: '401(k) % used', unit: 'pct', f: `IF(${INCOME},IF({contributionPct}<>"",{contributionPct},{app:linkPct}),"")`,
        app: { linkPct: (rec, c) => (c.x.link.job?.id === rec.id && rec.values.contributionPct == null ? c.x.link.incomePct ?? '' : '') } },
      { area: 'income', key: 'pretax', label: 'Before-tax a year', unit: 'money',
        f: (rec, c) => {
          const premium = c.x.health ? `${c.x.health.jobId === rec.id ? c.x.health.perPaycheck : 0}` : 'N({premium})';
          const perPay = c.x.link.job?.id === rec.id && rec.values.contributionPct == null ? c.x.link.incomePerPaycheck ?? 0 : 0;
          return `IF(OR(${SKIP},{Kind}<>"Income"),"",IF({@taxType}="Unemployment",0,(${premium}+N({hsaFsa})+N({otherPretax}))*${PAYS_A_YEAR}+N({@M13})*N({@pct})+IF({contributionPct}="",${perPay},0)*${PAYS_A_YEAR}-N({app:roth})))`;
        },
        app: { roth: (rec, c) => inc(rec, c)?.roth ?? 0 } },
      { area: 'income', key: 'taxPerson', label: 'Whose tax', unit: 'text', f: 'IF({@taxType}="","",IF(OR({owner}="P3",{owner}="P4",{owner}="P5",{owner}="P6",{owner}="P7"),{owner},IF(OR({owner}="Partner",AND({owner}="",{Type}="Partner job")),"Partner","Me")))' }, // batch 49: an adult past the couple files their own return
      { area: 'income', key: 'taxUnit', label: 'Tax return', unit: 'text', f: 'IF({@taxType}="","",IF(AND(Taxes_joint="Yes",OR({@taxPerson}="Me",{@taxPerson}="Partner")),"Household",{@taxPerson}))' },
      { area: 'income', key: 'stack', label: 'Order on the return (jobs, then 1099, then unemployment)', unit: 'number',
        f: 'IF(OR({@taxType}="",{@taxedGross}=""),"",IF({@taxType}="1099",1,IF({@taxType}="Unemployment",2,0))*100000+ROW())' },
      { area: 'income', key: 'ficaBase', label: 'FICA base a year', unit: 'money', f: 'IF({@stack}="","",IF({@taxType}="Unemployment",0,IF({@taxType}="1099",{@taxedGross}*SE_base,{@taxedGross})))' },
      { area: 'income', key: 'ssPart', label: 'Social Security a year (per person, to the wage base)', unit: 'money',
        f: 'IF({@stack}="","",(MIN(SUMIFS(Income_ficaBase,Income_taxPerson,{@taxPerson},Income_stack,"<="&{@stack}),SS_wageBase)-MIN(SUMIFS(Income_ficaBase,Income_taxPerson,{@taxPerson},Income_stack,"<="&{@stack})-{@ficaBase},SS_wageBase))*SS_rate*IF({@taxType}="1099",2,1))' },
      { area: 'income', key: 'medPart', label: 'Medicare a year', unit: 'money', f: 'IF({@stack}="","",{@ficaBase}*Medicare_rate*IF({@taxType}="1099",2,1))' },
      { area: 'income', key: 'own', label: 'Adds to taxable income (federal)', unit: 'money',
        f: 'IF({@stack}="","",MAX(0,{@taxedGross}-N({@pretax})-IF({@taxType}="1099",({@ssPart}+{@medPart})/2,0)))' },
      // Batch 58: each return by its own unit: the couple's joint return (Household), else the filing status, and an adult
      // past the couple (P3 to P7) on a Single return of their own (QUESTIONS 412), as the app's householdTax does.
      { area: 'income', key: 'taxable', label: 'Taxable a year (federal), the return through this row', unit: 'money',
        f: 'IF({@stack}="","",MAX(0,SUMIFS(Income_own,Income_taxUnit,{@taxUnit},Income_stack,"<="&{@stack})-IF({@taxUnit}="Household",StdDed_joint,IF(AND(Taxes_filing="Head of household",NOT(OR({@taxUnit}="P3",{@taxUnit}="P4",{@taxUnit}="P5",{@taxUnit}="P6",{@taxUnit}="P7"))),StdDed_head,StdDed_single))))' },
      // Batch 35 (QUESTIONS 300): the federal tips deduction, once per return: the reported tips kept (tipsQ, never past the
      // row's taxed gross), up to Tips_cap, less Tips_phaseStep for each $1,000 of income over the line; none married
      // filing separately or outside its years. Each tipped row takes its share of what the return saves, by its tips.
      { area: 'income', key: 'tipsQ', label: 'Reported tips kept a year (tips deduction)', unit: 'money',
        f: 'IF(OR({@workMode}="",{@stack}=""),"",MIN(MAX(0,{@taxedGross}),IF({@workMode}="Shifts",MAX(0,{@tipsTaxedMo}-{@outTaxedMo}),N({@cardMo})+IF({cashReported}="Yes",MAX(0,N({@cashMo})-{@tipOutMo}),0))*12))' },
      { area: 'income', key: 'tipsDed', label: 'Tips deduction on this return a year', unit: 'money',
        f: (rec, c) => `IF(OR({@stack}="",N({@tipsQ})=0),"",IF(OR(Taxes_filing="Married separately",${c.now.getFullYear()}<Tips_firstYear,${c.now.getFullYear()}>Tips_lastYear),0,MAX(0,MIN(Tips_cap,SUMIFS(Income_tipsQ,Income_taxUnit,{@taxUnit}))-MAX(0,SUMIFS(Income_own,Income_taxUnit,{@taxUnit})-IF({@taxUnit}="Household",Tips_phaseJoint,Tips_phaseSingle))*Tips_phaseStep/1000)))` },
      { area: 'income', key: 'tipsSaved', label: 'Federal tax the tips deduction saves a year (this row\'s share)', unit: 'money',
        f: () => {
          const T = 'MAX(0,SUMIFS(Income_own,Income_taxUnit,{@taxUnit})-IF({@taxUnit}="Household",StdDed_joint,IF(AND(Taxes_filing="Head of household",NOT(OR({@taxUnit}="P3",{@taxUnit}="P4",{@taxUnit}="P5",{@taxUnit}="P6",{@taxUnit}="P7"))),StdDed_head,StdDed_single)))', L = `MAX(0,${T}-{@tipsDed})`;
          return `IF({@tipsDed}="","",IF({@taxUnit}="Household",${bracket(T, 'Fed_joint')}-${bracket(L, 'Fed_joint')},IF(AND(Taxes_filing="Head of household",NOT(OR({@taxUnit}="P3",{@taxUnit}="P4",{@taxUnit}="P5",{@taxUnit}="P6",{@taxUnit}="P7"))),${bracket(T, 'Fed_head')}-${bracket(L, 'Fed_head')},${bracket(T, 'Fed_single')}-${bracket(L, 'Fed_single')}))*{@tipsQ}/SUMIFS(Income_tipsQ,Income_taxUnit,{@taxUnit}))`;
        } },
      { area: 'income', key: 'M10', label: 'Federal tax a year (M10)', unit: 'money',
        f: () => {
          const by = (std, t) => `${bracket('{@taxable}', t)}-${bracket(`MAX(0,SUMIFS(Income_own,Income_taxUnit,{@taxUnit},Income_stack,"<"&{@stack})-${std})`, t)}`;
          return `IF({@taxable}="","",-N({@tipsSaved})+IF({@taxUnit}="Household",${by('StdDed_joint', 'Fed_joint')},IF(AND(Taxes_filing="Head of household",NOT(OR({@taxUnit}="P3",{@taxUnit}="P4",{@taxUnit}="P5",{@taxUnit}="P6",{@taxUnit}="P7"))),${by('StdDed_head', 'Fed_head')},${by('StdDed_single', 'Fed_single')})))`; // batch 53: head of household
        } },
    ],
    sheet: 'IF(COUNT(Income_M10)=0,"",SUM(Income_M10))', label: 'Federal tax a year, the household\'s return (or each person\'s)',
    parts: [{ key: 'tips', name: 'Tips deduction: federal income tax it saves a year (reported tips only; batch 35)', unit: 'money', sheet: 'IF(COUNT(Income_tipsSaved)=0,"",SUM(Income_tipsSaved))', app: c => (c.x.householdTax?.tips ? c.x.householdTax.total.tipsSaved : null) },
      { key: 'ctc', name: 'Child Tax Credit a year: off the federal tax, then the rest as a refund (batch 53; not in take-home, it lands when the return is filed)', unit: 'money',
        sheet: 'Cliff_ctc0', // batch 62: worked out on the Benefits cliff tab (the tax on the raise)
        app: c => c.x.householdTax?.ctc?.total ?? null }],
    app: c => (Object.keys(c.x.householdTax?.rows || {}).length ? c.x.householdTax.total.federal : null) },
  { id: 'M11', name: 'FICA', inputs: 'gross, year', unit: 'money', fns: ['income.fica'],
    cols: [{ area: 'income', key: 'M11', label: 'FICA a year (M11)', unit: 'money',
      f: '(IF({@stack}="","",{@ssPart}+{@medPart}+(MAX(0,SUMIFS(Income_ficaBase,Income_taxUnit,{@taxUnit},Income_stack,"<="&{@stack})-IF({@taxUnit}="Household",Medicare_over_joint,Medicare_over_single))-MAX(0,SUMIFS(Income_ficaBase,Income_taxUnit,{@taxUnit},Income_stack,"<"&{@stack})-IF({@taxUnit}="Household",Medicare_over_joint,Medicare_over_single)))*Medicare_addl))' }],
    sheet: 'IF(COUNT(Income_M11)=0,"",SUM(Income_M11))', label: 'Social Security and Medicare a year (per person, to the wage base), all income',
    app: c => (Object.keys(c.x.householdTax?.rows || {}).length ? c.x.householdTax.total.fica : null) },
  { id: 'M12', name: 'Take-home from gross', inputs: 'M10, M11, state and city tax', unit: 'money', fns: ['income.takeHomeFromGross', 'raise.raiseOf', 'income.stateTax', 'income.incomeRow', 'income.taxTypeOf', 'income.isBenefitRow', 'income.benefitRow', 'income.benefitWeeksThisYear',
    // Batch 27: income by type (tips, shifts, platform payouts), folded into each row's take-home.
    'earnings.SHIFTS_PER_MONTH', 'earnings.MONTHS3', 'earnings.TIP_OUT_BY', 'earnings.WORK_KEYS', 'earnings.hasWork', 'earnings.workOf', 'earnings.workCash', 'earnings.perShift', 'earnings.workText', 'earnings.tipsTaxNote',
    'earnings.workLine', 'earnings.seasonShifts', 'earnings.hasSeasons', 'earnings.shiftMonthsOf', 'earnings.PLATFORMS', 'earnings.platformOf', 'earnings.heldDates',
    // Batch 60 (QUESTIONS 422): kinds of night on one row, added up into the row (the row's boxes hold the roll-up).
    'earnings.NIGHT_KEYS', 'earnings.NIGHT_NAMES', 'earnings.hasNights', 'earnings.nightValues', 'earnings.nightsRollUp', 'earnings.nightFromRow', 'earnings.addNight', 'earnings.copyNight', 'earnings.removeNight', 'earnings.setNight', 'earnings.nightsStale',
    'earnings.unreportedTaxRate'],
    cols: [
      { area: 'income', key: 'state', label: 'State and city tax a year', unit: 'money',
        f: () => {
          const cum = op => `SUMIFS(Income_stateOwn,Income_taxUnit,{@taxUnit},Income_stack,"${op}"&{@stack})`;
          const on = (x, t, k) => bracket(`MAX(0,${x}-NY_std_${k})`, `${t}_${k}`);
          // Batch 58: an adult past the couple (P3 to P7) files a return of their own as Single (QUESTIONS 412), as the app does.
          const own = 'OR({@taxUnit}="P3",{@taxUnit}="P4",{@taxUnit}="P5",{@taxUnit}="P6",{@taxUnit}="P7")';
          const by = t => `IF(${own},${on(cum('<='), t, 'single')}-${on(cum('<'), t, 'single')},${byStatus(t)})`;
          const byStatus = t => `IF(Taxes_filing="Married jointly",${on(cum('<='), t, 'joint')}-${on(cum('<'), t, 'joint')},IF(Taxes_filing="Head of household",${on(cum('<='), t, 'head')}-${on(cum('<'), t, 'head')},${on(cum('<='), t, 'single')}-${on(cum('<'), t, 'single')}))`;
          return `IF({@stack}="","",IF(Profile_state<>"NY",0,${by('NY')}+IF(Profile_nyc="Yes",${by('NYC')},0)))`;
        } },
      { area: 'income', key: 'stateOwn', label: 'Adds to state taxable income', unit: 'money', f: 'IF({@stack}="","",MAX(0,{@taxedGross}-N({@pretax})))' },
      // Batch 35 (QUESTIONS 305): tips, shifts and house fees (js/math/earnings.js workOf and workCash), so the workbook
      // matches the app. A shift a week is 52 / 12 a month. Paycheck: the Amount is typed, the cash tips ride on top less
      // the tip-out and fees. Shifts: no Amount, the gross is the shifts' pay plus reported tips less the tip-out on them
      // (and the house fee on a 1099 row); cash that is not reported rides on top.
      { area: 'income', key: 'shiftsMo', label: 'Shifts a month', unit: 'number', f: `IF(OR(${SKIP},{Kind}<>"Income",{shiftsWeek}=""),"",{shiftsWeek}*52/12)` },
      { area: 'income', key: 'payMo', label: 'Pay from shifts a month', unit: 'money', f: 'IF(OR({@shiftsMo}="",AND({payShift}="",OR({hourly}="",{hoursShift}=""))),"",IF({payShift}<>"",{payShift},{hourly}*{hoursShift})*{@shiftsMo})' },
      { area: 'income', key: 'cardMo', label: 'Card tips a month', unit: 'money', f: 'IF({cardTips}="","",IF({cardTipsPer}="month",{cardTips},IF({@shiftsMo}="","",{cardTips}*{@shiftsMo})))' },
      { area: 'income', key: 'cashMo', label: 'Cash tips a month', unit: 'money', f: 'IF({cashTips}="","",IF({cashTipsPer}="month",{cashTips},IF({@shiftsMo}="","",{cashTips}*{@shiftsMo})))' },
      { area: 'income', key: 'tipOutMo', label: 'Tip-out a month', unit: 'money',
        f: 'IF({tipOutBy}="% of sales",IF(OR({tipOutPct}="",{salesShift}="",{@shiftsMo}=""),0,{tipOutPct}*{salesShift}*{@shiftsMo}),IF({tipOutBy}="% of tips",IF({tipOutPct}="",0,{tipOutPct}*(N({@cardMo})+N({@cashMo}))),IF(AND({tipOutBy}="$ a shift",{tipOutAmount}<>"",{@shiftsMo}<>""),{tipOutAmount}*{@shiftsMo},0)))' },
      { area: 'income', key: 'feeMo', label: 'House or stage fees a month', unit: 'money', f: 'IF(AND({houseFee}<>"",{@shiftsMo}<>""),{houseFee}*{@shiftsMo},0)' },
      { area: 'income', key: 'workMode', label: 'Tips and shifts worked out from', unit: 'text',
        f: `IF(OR(${SKIP},{Kind}<>"Income",{Type}="Platform",{@taxType}="Unemployment",AND({shiftsWeek}="",{payShift}="",{hourly}="",{hoursShift}="",{houseFee}="",{cardTips}="",{cashTips}="",{tipOutBy}="",{tipOutPct}="",{tipOutAmount}="",{salesShift}="")),"",IF(OR({amount}<>"",{@payMo}=""),"Paycheck","Shifts"))` },
      { area: 'income', key: 'tipsTaxedMo', label: 'Reported tips a month (card, and cash when reported)', unit: 'money', f: 'IF({@workMode}="","",N({@cardMo})+IF({cashReported}="Yes",N({@cashMo}),0))' },
      { area: 'income', key: 'outTaxedMo', label: 'Tip-out off the taxed tips a month', unit: 'money', f: 'IF({@workMode}<>"Shifts",0,IF({@taxType}="1099",{@tipOutMo},MIN({@tipOutMo},{@tipsTaxedMo})))' },
      { area: 'income', key: 'workGross', label: 'Gross from the shifts a year', unit: 'money', f: 'IF({@workMode}<>"Shifts","",MAX(0,{@payMo}+{@tipsTaxedMo}-{@outTaxedMo}-IF({@taxType}="1099",{@feeMo},0))*12)' },
      { area: 'income', key: 'workExtra', label: 'Cash on top a month (tips after the tip-out and fees)', unit: 'money',
        f: 'IF({@workMode}="","",IF({@workMode}="Paycheck",N({@cashMo})-{@tipOutMo}-{@feeMo},N({@cashMo})-IF({cashReported}="Yes",N({@cashMo}),0)-({@tipOutMo}-{@outTaxedMo})-IF({@taxType}="1099",0,{@feeMo})))' },
      { area: 'income', key: 'grossExtraMo', label: 'Cash tips kept a month, not in the gross (the tip-out off)', unit: 'money', f: 'IF({@workMode}="","",{@workExtra}+IF(OR({@workMode}="Paycheck",{@taxType}<>"1099"),{@feeMo},0))' },
      // Platform rows (earnings.platformOf): the Amount is the gross a month; the fee is typed or the Platforms table's.
      { area: 'income', key: 'platFee', label: 'Platform fee used', unit: 'pct',
        f: `IF(OR(${SKIP},{Type}<>"Platform"),"",IF({feePct}<>"",{feePct},IFERROR(INDEX(Platforms_fee,MATCH(IF({platform}="","Other",{platform}),Platforms_platform,0)),IFERROR(INDEX(Platforms_fee,MATCH("Other",Platforms_platform,0)),0))))` },
      { area: 'income', key: 'platNet', label: 'Paid out a month (platform)', unit: 'money', f: 'IF(OR({@platFee}="",{@M01}=""),"",MAX(0,{@M01}*(1-{@platFee})-N({chargebacks})))' },
      { area: 'income', key: 'paid', label: 'Paycheck or payout part a month', unit: 'money',
        f: `IF(OR(${SKIP},{Kind}<>"Income"),"",IF({@taxType}="Unemployment",IF({@M01}="","",{@M01}*(1-IF({withhold}="Yes",UI_withhold,0))),IF(AND({@taxType}<>"",{@M13}<>"",OR({basis}="Gross",{amount}="",{@workMode}="Shifts",{Type}="Platform")),({@M13}-{@M10}-{@M11}-{@state}-{@pretax}-N({app:roth}))/12,IF({Type}="Platform",{@platNet},{@M01}))))`,
        app: { roth: (rec, c) => (inc(rec, c)?.roth ?? 0) + (inc(rec, c)?.afterTax ?? 0) } },
      { area: 'income', key: 'M12', label: 'Take-home a month (M12)', unit: 'money', f: 'IF({@paid}="","",{@paid}+N({@workExtra}))' },
    ],
    sheet: 'IF(COUNTIFS(Income_Kind,"Income",Income_InMath,"<>No")=0,"",SUM(Income_M12))', label: 'Take-home a month, all income',
    parts: [{ key: 'extra', name: 'Cash tips on top of paychecks a month, after the tip-out and fees (batch 35)', unit: 'money', sheet: 'IF(COUNT(Income_workExtra)=0,"",SUM(Income_workExtra))', app: c => (c.x.income.some(i => i.work?.any) ? sum(c.x.income, i => i.extra ?? 0) : null) },
      { key: 'platform', name: 'Paid out by platforms a month, after their fees and chargebacks (batch 35)', unit: 'money', sheet: 'IF(COUNT(Income_platNet)=0,"",SUM(Income_platNet))', app: c => (c.x.income.some(i => i.platform) ? sum(c.x.income, i => i.platform?.net ?? 0) : null) }],
    app: c => c.x.takeHome },
  { id: 'M14', name: 'Effective and marginal tax rate', inputs: 'M10, M11', unit: 'pct', fns: ['income.taxRates', 'income.householdRates'],
    sheet: 'IF(N(SUM(Income_taxedGross))=0,"",(N(Math_M10)+N(Math_M11)+SUM(Income_state))/SUM(Income_taxedGross))', label: 'Effective rate: all income tax over everything taxed',
    app: c => { const t = c.x.householdTax?.total; return t && t.gross ? t.all / t.gross : null; },
    parts: [{ key: 'marginal', name: 'Marginal rate (the last dollar)', unit: 'pct', fromApp: 'the bracket of the last dollar plus FICA; on the Taxes tab of SLAM', app: c => (c.x.grossAnnual ? c.taxRates()?.marginal ?? null : null) }] },
  { id: 'M15', name: 'Employer match ($/yr)', inputs: '401(k) %, match formula, gross', unit: 'money', fns: ['income.employerMatch'],
    cols: [{ area: 'income', key: 'M15', label: 'Employer match a year (M15)', unit: 'money',
      f: `IF(OR({@M13}="",{matchPct}="",{matchCapPct}=""),"",MIN(N({@pct}),{matchCapPct})*{matchPct}*{@M13})` }],
    sheet: 'SUM(Income_M15)', label: 'Employer match a year (tiers set on the 401(k) under Assets stay in the app)',
    app: c => (c.m.savingsRate.match ?? 0) * 12 },
  { id: 'M16', name: 'Variable income safe budget', inputs: 'lowest month, set-aside', unit: 'money', fns: ['income.variableSafeBudget', 'income.quarterlySetAside', 'income.irregularPlan'],
    // Batch 15, item 3: a blank set-aside uses the client's own rate on self-employment income (Math_M16_rate), else TaxSetAside.
    parts: [{ key: 'rate', name: 'Your rate on self-employment income (income tax and SE tax, on top of the rest)', unit: 'pct', fromApp: 'the tax the 1099 rows add to the household\'s return over their gross (M10 to M12, stacked)', app: c => quarterlySetAside(c.x.householdTax, c.ref)?.rate ?? null }],
    sheet: 'IF(Var_lowest<>"",Var_lowest*(1-IF(Var_setAside="",IF(Math_M16_rate<>"",Math_M16_rate,TaxSetAside),Var_setAside)),IF(Var_typical<>"",Var_typical*VarGuess*(1-IF(Var_setAside="",IF(Math_M16_rate<>"",Math_M16_rate,TaxSetAside),Var_setAside)),""))',
    app: c => { const v = c.doc.profile.variable || {}; return variableSafeBudget({ lowestMonth: v.lowest ?? null, typicalMonth: v.typical ?? null, setAside: v.setAside ?? quarterlySetAside(c.x.householdTax, c.ref)?.rate ?? null }, c.ref).value; } },
  { id: 'M17', name: 'Real hourly wage', inputs: 'take-home, work costs, hours', unit: 'money', cents: true, fns: ['income.realHourlyWage', 'time.hourlyRate', 'time.materialityOf', 'time.outsourceCheck'],
    sheet: 'IF(OR(Math_M12="",N(Hours_paid)=0),"",(Math_M12-N(Hours_costs))/(Hours_paid+N(Hours_commute)+N(Hours_prep)))',
    app: c => realHourlyWage({ takeHome: c.x.takeHome, ...c.x.hours }).value },

  // ---------- Spending ----------
  { id: 'M20', name: 'Line monthly amount', inputs: 'line amount, period, covers', unit: 'money', fns: ['spending.lineMonthly'],
    cols: [{ area: 'spending', key: 'M20', label: 'A month (M20)', unit: 'money',
      f: rec => `IF(OR(${SKIP},{Kind}<>"Budget line",{amount}=""),"",IF({Status}="Not for me",0,${rec.covers?.months ? `{amount}/${rec.covers.months}` : `{amount}*${MONTH_FACTOR('{per}')}`}))` }],
    sheet: 'SUMIFS(Spend_M20,Spend_InMath,"Yes")', label: 'Budget lines, each as a month, added up',
    app: c => sum(c.x.typedLines.filter(l => !c.x.dupOf[l.id]), l => (l.amount == null ? 0 : l.covers?.months ? l.amount / l.covers.months : monthlyFrom(l.amount, l.per).value)) },
  { id: 'M21', name: 'My share', inputs: 'amount, who pays, covered, split', unit: 'money', fns: ['spending.myShare', 'spending.categoryTotals', 'spending.CATEGORIES', 'spending.CORE_CATEGORIES', 'spending.categoryName', 'spending.categoryKeyOf', 'spending.isCategoryRecord', 'spending.isFaded', 'spending.typicalOf', 'spending.typicalTotal', 'spending.gutSplitOf', 'spending.groupTypicalOf', 'spending.categoryTypicalOf', 'spending.typicalScaleOf', 'spending.LEVEL_ELSE', 'spending.levelOf', 'spending.everythingElse', 'spending.BILLS_CATEGORIES', 'spending.inFat', 'spending.shareBeforeRefund', 'spending.reimbursedMonthly', 'spending.splitOf', 'spending.amountIsMine', 'spending.wholeBill', 'spending.withHome', 'spending.partnerSplits', 'spending.peopleSharing', 'spending.sharedBillsOf', 'spending.splitWaysOf', 'spending.splitDisagreeOf', 'metrics.coupleBills'],
    cols: [
      // Batch 5 (E): a shared group is on when its About you box says Yes, or, with nothing answered and roommates, by its config default.
      { area: 'spending', key: 'whoUsed', label: 'Who pays used', unit: 'text',
        f: `IF({whoPays}<>"",{whoPays},IF(OR(${Object.entries(LISTS.sharedGroups).map(([k, g]) => `AND(${SHARED_ON(k, g)},OR(${g.categories.map(c => `{category}="${c}"`).join(',')}))`).join(',')}),"Split",""))` },
      { area: 'spending', key: 'givenUsed', label: 'Amount given as (per bill)', unit: 'text',
        f: `IF({amountIs}<>"",{amountIs},IF({@whoUsed}="Split",${Object.entries(LISTS.sharedGroups).reduceRight((rest, [k, g]) => `IF(AND(OR(${g.categories.map(c => `{category}="${c}"`).join(',')}),${SHARED_ON(k, g)}),IF(Profile_sharedAs_${k}<>"",Profile_sharedAs_${k},"${g.defaultAs}"),${rest})`, '""')},""))` }, // the default applies only while the group is on, as the app does
      { area: 'spending', key: 'sharePct', label: 'Couple share used', unit: 'pct', f: 'IF(AND({@whoUsed}="Split",{splitBy}="",Profile_household="Couple",Profile_splitMine<>"",Profile_splitWays=""),Profile_splitMine,"")' },
      { area: 'spending', key: 'splitUsed', label: 'Split N ways used (you included)', unit: 'number', f: `IF({splitBy}<>"",{splitBy},IF({@whoUsed}="Split",IF(Profile_splitWays<>"",Profile_splitWays,N(Profile_roommates)+1+IF(AND(Profile_household="Couple",OR(Profile_moneyStyle="Separate",Profile_moneyStyle="Mix",AND(Profile_moneyStyle="",OR(${Object.entries(MODES).filter(([, m]) => m.split).map(([k]) => `Profile_mode="${k}"`).join(',')})))),1,0)),1))` },
      { area: 'spending', key: 'covered', label: 'Share someone else covers', unit: 'pct',
        f: 'IF(AND({@whoUsed}="Covered by someone",OR({takeover}="",TEXT({takeover},"yyyy-mm")>TEXT(TODAY(),"yyyy-mm"))),IF(AND({coveredAmount}<>"",N({amount})<>0),MIN(1,MAX(0,{coveredAmount}/{amount})),1),0)' },
      { area: 'spending', key: 'shareBase', label: 'My share before reimbursement', unit: 'money',
        f: `IF(OR(${SKIP},{Kind}<>"Budget line"),"",IF({myShare}<>"",{myShare},IF({Status}="Not for me",0,IF(OR({@whoUsed}="Included in rent",{@whoUsed}="N/A",AND({startsIn}<>"",TEXT({startsIn},"yyyy-mm")>TEXT(TODAY(),"yyyy-mm"))),0,IF({@M20}="","",{@M20}*(1-{@covered})*IF({@givenUsed}="Your share",1,IF({@sharePct}<>"",{@sharePct},1/{@splitUsed})))))))` },
      // Batch 38: a couple who split bills (Living together, Engaged, Married separate) is seen here as one household, as
      // the app's household view sees it (metrics.coupleBills): a bill split between the two counts at the couple's
      // part (both shares), a payment to the partner moves money between them and counts at 0.
      { area: 'spending', key: 'coupleX', label: 'Household part of my share (a couple who split bills)', unit: 'number',
        f: `IF(OR(${Object.entries(MODES).filter(([, m]) => m.couple && m.split).map(([k]) => `Profile_mode="${k}"`).join(',')}),IF({toPartner}="Yes",0,IF(AND({@whoUsed}="Split",Profile_household="Couple",OR(Profile_moneyStyle="Separate",Profile_moneyStyle="Mix",Profile_moneyStyle="")),IF({@sharePct}<>"",IF({@sharePct}>0,1/{@sharePct},1),2),1)),1)` },
      { area: 'spending', key: 'M21', label: 'My share a month (M21)', unit: 'money',
        f: `IF({@shareBase}="","",{@coupleX}*IF(OR({Status}="Not for me",{@whoUsed}="Included in rent",{@whoUsed}="N/A"),{@shareBase},MAX(0,{@shareBase}-IF({reimbursed}="",0,{reimbursed}*${MONTH_FACTOR('{per}')}))))` },
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
    app: c => sum(Object.values(c.doc.spending?.months || {}).flatMap(mo => Object.values(mo.lines || {})), l => estimateVsActual({ estimate: l.estimate ?? null, actual: l.actual ?? null }).value),
    // Batch 22: the same comparison per Budget category for this month (Month end, after an import); js/month.js byCategory.
    parts: [{ key: 'byCategory', name: 'This month, actual minus plan, added up over the categories that have an actual', unit: 'money',
      fromApp: 'each Budget category is the sum of its lines for the month (plan, and actual from Month end, the calendar or an import); the Months tab has the line rows',
      app: c => { const v = byCategory(monthView(c.doc, c.ref, ymOf(c.now), { now: c.now })).filter(x => x.diff != null); return v.length ? sum(v, x => x.diff) : null; } }] },
  { id: 'M26', name: 'Gut accuracy', inputs: 'closed months', unit: 'pct', fns: ['spending.gutAccuracy', 'spending.gutVsLinesWords'],
    fromApp: 'an average across closed months of each first guess against the actual; the close history stays in SLAM', app: () => null },
  { id: 'M27', name: 'Monthly surplus', inputs: 'M12, M21, debts, sinking funds', unit: 'money', fns: ['spending.monthlySurplus'],
    // Batch 38: a dated goal saved for each month (Save for it each month) comes off the surplus until its month, as
    // the app does: what is left to save over the months to go (at least 1). A Purpose tag on a sinking fund account
    // counts that tag's dollars as saved; the account is chosen in SLAM, so that number comes from the app.
    cols: [{ area: 'goals', key: 'sinkMonthly', label: 'Set aside a month (sinking fund)', unit: 'money',
      f: (rec, c) => {
        const acct = rec.values?.sinkingFund ? c.live.find(q => q.id === rec.values.sinkingFund) : null;
        const tag = acct && rec.values?.fundTag ? (acct.values.tags || []).find(t => t.name === rec.values.fundTag) : null;
        const saved = tag ? String(+(tag.dollars ?? 0)) : 'N({saved})';
        return `IF(OR(${SKIP},{Kind}<>"Event",{sinking}<>"Yes",{amount}="",{Status}="Not for me"),0,IFERROR(MAX(0,{amount}-${saved})/MAX(1,VALUE(LEFT({month},4))*12+VALUE(MID({month},6,2))-YEAR(TODAY())*12-MONTH(TODAY())),0))`;
      } }],
    parts: [
      // Batch 7 (A): the categories carry the spending: each is the larger of its typed row (Kind Category) and its lines.
      { key: 'lines', name: 'Spending by category (each the larger of its typed amount and its lines; debt payments From Debt included; Retirement left out)', unit: 'money',
        sheet: `IF(AND(COUNT(Spend_M20)=0,COUNTIFS(Spend_Kind,"Gut number or category",Spend_InMath,"<>No",Spend_Type,"<>All in",Spend_amount,"<>")=0),"",${CAT_SUM(k => k !== 'Retirement')})`, app: c => c.x.lineTotal },
      { key: 'retire', name: 'Retirement on the Budget, a month (investing, not spending)', unit: 'money',
        sheet: `IF(OR(Math_M27_gut="",AND(Set_spendingSource="lines",Math_M27_lines<>"")),${CAT_SUM(k => k === 'Retirement')},0)`, app: c => c.x.retirementLines ?? 0 },
      { key: 'gut', name: 'The gut number', unit: 'money',
        sheet: 'IF(COUNTIFS(Spend_Kind,"Gut number or category",Spend_Type,"All in",Spend_InMath,"<>No")=0,"",IF(COUNTIFS(Spend_Kind,"Gut number or category",Spend_Type,"All in",Spend_InMath,"<>No",Spend_amount,"<>")=0,"",SUMIFS(Spend_amount,Spend_Kind,"Gut number or category",Spend_Type,"All in",Spend_InMath,"<>No",Spend_Status,"<>Not for me")))', // the All in row only; a category row has its key as Type
        app: c => c.x.gutTotal },
      { key: 'spending', name: 'Spending a month (the gut number until the Budget switches to the lines)', unit: 'money',
        sheet: 'IF(OR(Math_M27_gut="",AND(Set_spendingSource="lines",Math_M27_lines<>"")),Math_M27_lines,Math_M27_gut)',
        app: c => c.x.spending },
      { key: 'debtOut', name: 'Debt payments not already in spending', unit: 'money',
        sheet: 'IF(Math_M27_spending="","",IF(OR(Math_M27_gut="",AND(Set_spendingSource="lines",Math_M27_lines<>"")),0,IF(COUNTIFS(Spend_Kind,"Gut number or category",Spend_Type,"All in",Spend_InMath,"<>No",Spend_includesDebtPayments,"No")>0,SUM(Debt_payOut),0)))',
        app: c => c.x.debtPaymentsOutsideSpending },
      { key: 'sinking', name: 'Set aside a month for dated goals (sinking funds), until each one\'s month', unit: 'money', sheet: 'SUM(Goals_sinkMonthly)', app: c => c.x.sinkingMonthly ?? 0 },
    ],
    sheet: 'IF(OR(Math_M12="",Math_M27_spending=""),"",Math_M12-Math_M27_spending-N(Math_M27_debtOut)-N(Math_M27_sinking))', label: 'Take-home minus spending minus debt payments outside spending minus sinking funds, a month',
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
      { key: 'afterTax', name: 'After-tax contributions set on accounts (a Roth IRA, a brokerage), a month', unit: 'money', fromApp: 'each account\'s contribution in its own cadence (a paycheck, a month, a year), from the Assets tab in SLAM', app: c => (c.x.afterTaxSaving ?? 0) - (c.x.goalSaving ?? 0) },
      { key: 'goal', name: 'Into a 529 or a Goal account from the surplus, a month (not FI money; question 214)', unit: 'money', fromApp: 'each 529 or Goal account\'s contribution in its own cadence, from the Assets tab in SLAM', app: c => c.x.goalSaving ?? 0 },
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
    sheet: 'IF(Math_M12="","",IF(COUNTIFS(Spend_category,"Rent or mortgage",Spend_amount,"<>",Spend_InMath,"Yes")>0,SUM(Spend_housing)/Math_M12,IF(SUMIFS(Debt_payUsed,Debt_Type,"Mortgage")>0,(SUM(Spend_housing)+SUMIFS(Debt_payUsed,Debt_Type,"Mortgage"))/Math_M12,"")))',
    label: 'Your share of rent (or the mortgage payment) and utilities over take-home (the reference line is Housing_line)', app: c => c.m.housingPct.value },
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
  { id: 'M34', name: 'Payoff order with extra payment', inputs: 'debts, extra, order, the surplus while heavy debt is carried (the debt rule)', unit: 'months', fns: ['debt.payoffPlan', 'debt.simulateDebt', 'debt.hasslePerDollar', 'debt.customOrder', 'debt.orderCost', 'debt.debtFirstPlan', 'debt.isHeavyDebt', 'debt.promoSoonIds', 'metrics.debtRuleOf', 'debt.debtFreeCard', 'debt.HERO_EXTRAS', 'debt.heroExtras', 'debt.SHORT_PLAN_SHARES', 'metrics.debtRangeOf', 'picture.debtWordsOf'],
    fromApp: 'a month-by-month simulation: every debt gets its payment, the surplus goes to heavy debt first in the payoff order (batch 11, the debt rule), and each cleared payment rolls forward (up to 1,200 rows)',
    parts: [{ key: 'heavy', name: 'Months until the heavy debt is gone, on the same plan', unit: 'months', fromApp: 'the same simulation', app: c => (c.m.debtPlan?.debts.some(d => d.heavy) ? c.m.debtPlan.heavyMonths : null) },
      { key: 'minimum', name: 'Months until every debt is gone at each debt\'s own payment only', unit: 'months', fromApp: 'the same simulation with no surplus and no extra', app: c => c.m.debtPlanMinimum?.months ?? null },
      // Batch 24 (QUESTIONS 244): the range when an APR is a guess, a balance is rough or spending is a gut number.
      // Batch 41: from the one ranges method (M9R), so the sheet and every screen give the same range.
      { key: 'rangeLow', name: 'Debt free, soonest likely (months): each input at its low and high by its level, swings combined (M9R)', unit: 'months', fromApp: 'the same simulation run again with each input moved by its level (M9R), the swings combined as the root of the sum of their squares', app: c => (c.ranges()?.debtFree ? c.ranges().debtFree.low : null) },
      { key: 'rangeHigh', name: 'Debt free, latest likely (months; blank when an end never pays off)', unit: 'months', fromApp: 'the same simulation run again with each input moved by its level (M9R)', app: c => c.ranges()?.debtFree?.high ?? null }],
    app: c => (c.m.debtPlan?.debts.length ? c.m.debtPlan.months : null) },
  { id: 'M35', name: 'Utilization', inputs: 'cards', unit: 'pct', fns: ['debt.utilization', 'debt.creditHealth', 'debt.BUREAUS', 'debt.yearsText'],
    sheet: 'IF(SUMIFS(Debt_limit,Debt_Type,"Credit card",Debt_limit,">0")=0,"",SUMIFS(Debt_balance,Debt_Type,"Credit card",Debt_limit,">0")/SUMIFS(Debt_limit,Debt_Type,"Credit card",Debt_limit,">0"))',
    app: c => utilization(c.doc.records.filter(r => r.kind === 'debt' && r.type === 'Credit card').map(r => ({ balance: r.values.balance, limit: r.values.limit }))).value },
  { id: 'M36', name: 'Debt-to-income', inputs: 'debts, gross', unit: 'pct', fns: ['debt.debtToIncome'],
    sheet: 'IF(OR(Math_M13="",N(Math_M13)=0,COUNTIFS(Debt_balUsed,">0")=0),"",SUM(Debt_payUsed)/(Math_M13/12))',
    app: c => debtToIncome({ monthlyDebtPayments: c.x.debts.some(d => d.balance > 0) ? sum(c.x.debts, d => d.payment) : null, grossMonthly: c.x.grossAnnual == null ? null : c.x.grossAnnual / 12 }).value },
  { id: 'M37', name: 'Promo solver', inputs: 'balance, promo end', unit: 'money', fns: ['debt.promoPayment', 'debt.promoPayoffOf', 'debt.promoMonthsOf'],
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
    // Batch 63: a row counts once it is a real row (it has a SLAM id) or has a number; the 20 blank rows say In the math
    // Yes too, so a brand-new client read $0 here where SLAM has no net worth yet.
    sheet: 'IF(COUNTIFS(Assets_InMath,"<>No",Assets_Id,"<>")+COUNTIFS(Assets_InMath,"<>No",Assets_Id,"",Assets_balance,"<>")+COUNTIFS(Assets_InMath,"<>No",Assets_Id,"",Assets_value,"<>")+COUNTIFS(Debt_InMath,"<>No",Debt_Id,"<>")+COUNTIFS(Debt_InMath,"<>No",Debt_Id,"",Debt_balance,"<>")=0,IF(Profile_noneOfThese="Yes",0,""),SUM(Assets_M40)-SUM(Debt_balUsed))', label: 'Assets (vested only) minus debts',
    app: c => c.m.netWorth.value },
  { id: 'M41', name: 'Liquid net worth', inputs: 'accounts, debts', unit: 'money', fns: ['assets.liquidNetWorth'],
    cols: [{ area: 'debt', key: 'consumer', label: 'Consumer debt', unit: 'number', f: 'IF(COUNTIF(Consumer_type,{Type})>0,1,0)' }],
    parts: [
      { key: 'cash', name: 'Cash (checking, savings and other cash; money set aside for taxes left out, batch 27)', unit: 'money', sheet: 'IF(COUNTIFS(Assets_group,"cash",Assets_InMath,"<>No")=0,IF(OR(Profile_noneOfThese="Yes",Profile_areas_cash="No"),0,""),SUMIFS(Assets_val,Assets_group,"cash",Assets_purpose,"<>Taxes"))', app: c => c.x.cash },
      { key: 'invested', name: 'Invested toward FI (every investment account but a 529 or a Goal account; question 214)', unit: 'money', sheet: 'IF(COUNTIFS(Assets_group,"investment",Assets_InMath,"<>No")=0,IF(OR(Profile_noneOfThese="Yes",Profile_areas_investments="No"),0,""),SUMIFS(Assets_val,Assets_group,"investment")-SUMIFS(Assets_val,Assets_group,"investment",Assets_Type,"529")-SUMIFS(Assets_val,Assets_group,"investment",Assets_Type,"<>529",Assets_purpose,"Goal"))', app: c => c.x.invested },
    ],
    sheet: 'IF(Math_M41_cash="","",Math_M41_cash+SUMIFS(Assets_val,Assets_Type,"Brokerage")-SUMIFS(Debt_balUsed,Debt_consumer,1))', label: 'Cash plus brokerage minus consumer debt',
    app: c => c.m.liquidNetWorth.value },
  { id: 'M42', name: 'Runway months', inputs: 'cash, spending', unit: 'months', fns: ['assets.runway'],
    sheet: 'IF(OR(Math_M41_cash="",Math_M27_spending=""),"",IF(Math_M27_spending<=0,"",Math_M41_cash/Math_M27_spending))', app: c => c.m.runwayMonths.value },
  { id: 'M43', name: 'Rule of 5', inputs: 'age, spending, cash', unit: 'money', fns: ['assets.ruleOf5'],
    cols: [{ area: 'profile', key: 'ageUsed', label: 'Age (worked out)', unit: 'number',
      f: (rec, c) => `IF({age}<>"",{age},IF({birthYear}="","",${c.now.getFullYear()}-{birthYear}-IF(${c.now.getMonth() + 1}<N({birthMonth}),1,0)))` }],
    parts: [
      { key: 'months', name: 'Target months (the Rule of 5: age divided by 5, one definition with big e)', unit: 'months', sheet: 'IF(Profile_ageUsed="","",Profile_ageUsed/5*IF(Profile_bigEMultiplier<>"",Profile_bigEMultiplier,IF(Profile_incomeStability="Varies",1.25,IF(Profile_incomeStability="Unpredictable",1.5,1))))', app: c => c.m.ruleOf5.months ?? null }, // answer 172
      { key: 'keepPace', name: 'Keep pace: add a month', unit: 'money', sheet: 'IF(Math_M27_spending="","",Math_M27_spending/KeepPace)', app: c => c.m.ruleOf5.keepPace ?? null },
      { key: 'gap', name: 'Gap: target minus cash', unit: 'money', sheet: 'IF(OR(Math_M43="",Math_M41_cash=""),"",Math_M43-Math_M41_cash)', app: c => c.m.ruleOf5.gap ?? null },
    ],
    sheet: 'IF(OR(Math_M43_months="",Math_M27_spending=""),"",Math_M43_months*Math_M27_spending)', label: 'Rule of 5 target: target months times spending',
    app: c => c.m.ruleOf5.value },
  { id: 'M44', name: 'Contribution limit used', inputs: 'contributions, Reference data', unit: 'pct', fns: ['assets.limitUsed'],
    fromApp: 'each account\'s contributions this year come from its paychecks, its 401(k) link and employer HSA money; shown inside each account in SLAM', app: () => null },

  // ---------- Goals and projection ----------
  { id: 'M50', name: 'FI number', inputs: 'spending, withdrawal rate', unit: 'money', fns: ['fi.fiNumber'],
    // Batch 15, item 6: a line that is not yours yet (Becomes mine in) or starts later (Starts in) is left out of
    // today's spending and put into spending in retirement (RetirementSpending's blank falls back to both).
    cols: [{ area: 'spending', key: 'later', label: 'Added later, a month (becomes yours or starts)', unit: 'money',
      f: `IF(OR(${SKIP},{Kind}<>"Budget line",{@M20}="",{Status}="Not for me",{myShare}<>""),"",IF(OR(AND({@whoUsed}="Covered by someone",{takeover}<>"",TEXT({takeover},"yyyy-mm")>TEXT(TODAY(),"yyyy-mm")),AND({startsIn}<>"",TEXT({startsIn},"yyyy-mm")>TEXT(TODAY(),"yyyy-mm"))),MAX(0,{@M20}*IF({@givenUsed}="Your share",1,IF({@sharePct}<>"",{@sharePct},1/{@splitUsed}))-IF({reimbursed}="",0,{reimbursed}*${MONTH_FACTOR('{per}')}))-N({@M21}),0))` }],
    parts: [{ key: 'later', name: 'Known costs ahead, a month (in spending in retirement)', unit: 'money', sheet: 'SUMIFS(Spend_later,Spend_InMath,"Yes")', app: c => c.x.laterSpending ?? 0 }],
    sheet: 'IF(OR(RetirementSpending="",WithdrawalRate=""),"",RetirementSpending*12/WithdrawalRate)', label: 'Spending in retirement a year over the withdrawal rate', app: c => c.m.fiNumber.value },
  { id: 'M51', name: 'Lean FI number', inputs: 'Food, Accommodation, Transportation lines', unit: 'money', fns: ['fi.leanFiNumber'],
    cols: [{ area: 'spending', key: 'fat', label: 'Food, housing or transportation', unit: 'number', f: 'IF(OR({draftt}="Food",{draftt}="Accommodation",{draftt}="Transportation",{category}="Phone"),1,0)' }],
    sheet: 'IF(SUMIFS(Spend_M21,Spend_fat,1,Spend_InMath,"Yes")=0,"",SUMIFS(Spend_M21,Spend_fat,1,Spend_InMath,"Yes")*12/WithdrawalRate)', app: c => c.targets()['Lean FI'].value },
  { id: 'M52', name: 'Barista FI number', inputs: 'part-time income', unit: 'money', fns: ['fi.baristaFiNumber'],
    sheet: 'IF(OR(Profile_keepJobAfterLaunch="No",RetirementSpending="",PartTimeIncome=""),"",(RetirementSpending-PartTimeIncome)*12/WithdrawalRate)', app: c => c.targets()['Barista FI'].value ?? null },
  { id: 'M53', name: 'FI date', inputs: 'invested, M28 before-tax saving and match, M27 if invested, M02, M50', unit: 'months', fns: ['fi.fiDate', 'fi.fiRangeOf', 'fi.saferFi', 'fi.changeAt', 'changes.datedChanges', 'changes.endYm', 'changes.changeWords', 'changes.surplusIn'],
    parts: [{ key: 'growth', name: 'Growth a month at the return', unit: 'pct', sheet: '(1+RealReturn)^(1/12)-1', app: c => (1 + c.x.realReturn) ** (1 / 12) - 1 },
      { key: 'safer', name: 'Safer line: months to FI at the safer withdrawal rate when FI would come before the safer-under age', unit: 'months', fromApp: 'the same path run to spending x 12 / SaferWithdrawal; shown as a second, smaller line (batch 5 C)', app: c => saferFi(c.m, { from: c.now })?.months ?? null },
      // Answers 123 to 125: what goes in each month. The surplus is invested unless InvestSurplus is 0; then only the
      // after-tax contributions and Retirement lines (paid out of the surplus) go in.
      // Batch 11, the debt rule: while heavy debt is carried the surplus goes to it first, so for those months only what
      // the paycheck and the accounts already put in is invested; after them the surplus and the freed heavy payments.
      { key: 'debtMonths', name: 'Months before the surplus is invested: it pays heavy debt first, then fills big e (0 when both rules are off or there is nothing to do)', unit: 'months', fromApp: 'the month-by-month debt-first plan (M34), then the freed-money flow (M79): big e left over the surplus and freed payments', app: c => c.m.investing?.before?.months ?? 0 },
      { key: 'freed', name: 'Heavy debt payments freed once it is paid, a month', unit: 'money', fromApp: 'the payments on the heavy debts in the debt-first plan (M34)', app: c => c.m.investing?.freed ?? 0 },
      { key: 'before', name: 'Invested a month while the surplus pays heavy debt or fills big e: 401(k), HSA, match, after-tax contributions and Retirement lines', unit: 'money',
        sheet: 'IF(Math_M27="","",Math_M28_pretax+Math_M28_match+N(Math_M28_afterTax)+N(Math_M27_retire))', app: c => (c.m.investing?.before ? c.m.investing.before.monthly : c.m.surplus.value == null ? null : (c.m.investing?.alreadyIn ?? 0) + (c.m.investing?.contributions ?? 0)) },
      { key: 'invest', name: 'Invested a month: 401(k), HSA, match, plus the surplus and any freed heavy payments (or, with Invest my surplus off, the after-tax contributions and Retirement lines)', unit: 'money',
        sheet: 'IF(Math_M27="","",Math_M28_pretax+Math_M28_match+IF(N(InvestSurplus)=0,N(Math_M28_afterTax)+N(Math_M27_retire),Math_M27-N(Math_M28_goal)+N(Math_M53_freed)))', app: c => c.m.investing?.monthly ?? null },
      ...Array.from({ length: CHANGE_SLOTS }, (_, k) => [
        { key: `at${k + 1}`, name: `Known change ${k + 1} ahead: the month it starts on the path (months from now)`, unit: 'months', fromApp: 'the month from the dates on the Budget and Income rows (Becomes mine in, Starts in, benefits end), after the debt-first months', app: c => changeSlots(c.m)[k]?.at ?? null },
        { key: `ch${k + 1}`, name: `Known change ${k + 1} ahead: what goes in moves by this a month`, unit: 'money', fromApp: 'the change to the surplus from those rows (a bill that becomes yours, benefits that end)', app: c => changeSlots(c.m)[k]?.monthly ?? null },
        { key: `seg${k + 1}`, name: `Invested at known change ${k + 1}`, unit: 'money', sheet: `IF(Math_M53_at${k + 1}="","",FV(Math_M53_growth,Math_M53_at${k + 1}-${k ? `Math_M53_at${k}` : 'N(Math_M53_debtMonths)'},-(Math_M53_invest${Array.from({ length: k }, (_, j) => `+N(Math_M53_ch${j + 1})`).join('')}),-${k ? `Math_M53_seg${k}` : 'FV(Math_M53_growth,N(Math_M53_debtMonths),-Math_M53_before,-Math_M41_invested)'}))`,
          app: c => { const sl = changeSlots(c.m)[k]; if (!sl || c.x.invested == null || c.m.investing?.monthly == null) return null; const pts = fiDate({ invested: c.x.invested, monthlyInvesting: c.m.investing.monthly, realReturn: c.x.realReturn, target: Number.MAX_VALUE }, { from: c.now, path: true, before: c.m.investing.before ?? null, changes: c.m.investing.changes ?? null }).points; return pts?.[sl.at] ?? null; } }]).flat(),
      // Batch 63 (M9R): each known change as dated, before the debt-first months move it, so each end of a range
      // (Ranges tab) can start it after its own debt-first months.
      ...Array.from({ length: CHANGE_SLOTS }, (_, k) => [
        { key: `from${k + 1}`, name: `Known change ${k + 1} as dated: the month it starts (months from now, before any debt-first months)`, unit: 'months', fromApp: 'the month from the dates on the Budget and Income rows (Becomes mine in, Starts in, benefits end)', app: c => rawChanges(c.m)[k]?.at ?? null },
        { key: `by${k + 1}`, name: `Known change ${k + 1} as dated: what goes in moves by this a month`, unit: 'money', fromApp: 'the change to the surplus from that row', app: c => rawChanges(c.m)[k]?.monthly ?? null }]).flat()],
    sheet: m53Sheet(),
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
  { id: 'M60', name: 'Running balance', inputs: 'calendar entries', unit: 'money', fns: ['calendar.runningBalance', 'markers.calendarMarkers', 'calendar.gutSpread'],
    fromApp: 'a day-by-day walk through the calendar with each paid, moved and maybe mark; on Cash flow › Calendar', app: () => null },
  { id: 'M61', name: 'Bonus paycheck months', inputs: 'pay dates', unit: 'text', fns: ['calendar.bonusMonths'],
    fromApp: 'counts the paydays in each month from the next payday; on Cash flow › Calendar', app: () => null },

  // ---------- Close the books ----------
  { id: 'M62', name: 'Net worth statement', inputs: 'accounts, assets, debts', unit: 'money', fns: ['statements.netWorthStatement', 'statements.ASSET_ORDER', 'statements.DEBT_ORDER', 'statements.valueAt', 'statements.assetGroup', 'statements.debtGroup', 'statements.fileBegan'],
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
  { id: 'M68', name: 'Cash layers', inputs: 'cash, deductibles, gaps, lines', unit: 'money', fns: ['layers.LITTLE_E', 'layers.STABILITY', 'layers.littleE', 'layers.gapStep', 'layers.cashLayers', 'layers.backupRunway', 'layers.layersOf', 'layers.DIP_ORDER', 'layers.dipFrom', 'layers.recordDip', 'layers.layerSnapshot', 'layers.layerHistory', 'layers.sleepPicks'],
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
  { id: 'M72', name: 'Shockingly Simple Math', inputs: 'M28, return, WR', unit: 'years', fns: ['simple.simpleMath', 'simple.yearsAtRate', 'simple.MMM', 'simple.simpleTable', 'simple.simpleWaterfall'], // batch 23: the table and the assumption waterfall on Report › Overview
    sheet: 'IF(OR(Math_M28="",N(Math_M28)<=0),"",IF(Math_M28>=1,0,ROUNDUP(LN(1+(1-Math_M28)*12/WithdrawalRate*Math_M53_growth/Math_M28)/LN(1+Math_M53_growth)-0.000000001,0)/12))',
    label: 'Years to FI from $0 at your savings rate', app: c => simpleMath({ savingsRate: c.m.savingsRate.value == null ? null : Math.max(0, c.m.savingsRate.value), realReturn: c.x.realReturn, withdrawalRate: c.x.withdrawalRate }).value },
  // ---------- The program (Phase 3) ----------
  { id: 'M73', name: 'Picture %', inputs: "every number's level and weight (Assumptions: Levels, Weights, Pace)", unit: 'pct',
    fns: ['picture.levelOf', 'picture.pictureOf', 'picture.nextSmallThings', 'picture.stepOf', 'picture.paceOf', 'picture.paceMeasureOf', 'picture.answeredSolidOf', 'picture.barKeyOf', 'picture.unlockOf', 'picture.confidenceOf', 'picture.fiWordsOf'],
    fromApp: 'a weighted average of each number\'s level (Gut 25, Rough 50, Estimate 75, Actual 100; the Program tab lists them)', app: c => pictureOf(c.doc, c.ref, { now: c.now }).pct,
    parts: [
      // Batch 57: the blend splits into quantity and quality; the pace reads Answered in session 1, Solid after.
      { key: 'answered', name: 'Answered (how much is in)', unit: 'pct', fromApp: 'each box\'s weight counted when it has any answer (Gut or better; Will get it and Not now are not answers), over every box\'s weight', app: c => pictureOf(c.doc, c.ref, { now: c.now }).answered },
      { key: 'solid', name: 'Solid (how much of it is sure)', unit: 'pct', fromApp: 'of the answered weight, the share at Estimate (a statement or app total, worked out) or Actual (Know it, a statement balance, locked)', app: c => pictureOf(c.doc, c.ref, { now: c.now }).solid },
      { key: 'expected', name: 'Expected by the end of this session (pace)', unit: 'pct', fromApp: 'the Pace table against the session being run', app: c => paceOf(pictureOf(c.doc, c.ref, { now: c.now }), sessionNo(c.doc)).target / 100 },
      { key: 'pace', name: 'Pace: Ahead, On track or Catch up', unit: 'text', fromApp: 'Answered (session 1) or Solid (session 2 on) against the pace expected by now', app: c => paceOf(pictureOf(c.doc, c.ref, { now: c.now }), sessionNo(c.doc)).word },
      { key: 'fi', name: 'FI date unlocked', unit: 'text', fromApp: 'income and spending at Estimate and an invested balance', app: c => { const pic = pictureOf(c.doc, c.ref, { now: c.now }); const u = unlockOf('fi', pic); return u.unlocked ? `Yes (${confidenceOf('fi', pic, { now: c.now })?.label ?? ''})` : u.reason; } },
      { key: 'next', name: 'Next small thing', unit: 'text', fromApp: 'the item that raises the Picture % most', app: c => { const n = nextSmallThings(pictureOf(c.doc, c.ref, { now: c.now }), 1)[0]; return n ? `${n.label}: +${Math.round(n.gain * 100)}%` : 'Nothing left'; } },
    ] },
  { id: 'M74', name: 'Scorecard', inputs: 'every number, the FOO step, the coach\'s ratings (Assumptions: Scorecard thresholds)', unit: 'count',
    fns: ['scorecard.scorecardOf', 'scorecard.factsOf', 'scorecard.goalsOf', 'scorecard.ratingOf'],
    fromApp: 'eleven areas rated Strong, OK or Hole by the rules in js/registry/scorecard.js or by the coach; the count here is the areas Strong or OK (the Scorecard tab has every area)',
    app: c => scorecardOf(c.doc, c.ref, { now: c.now, flags: c.flags }).okCount,
    parts: [
      { key: 'holes', name: 'Holes', unit: 'count', fromApp: 'the areas rated Hole', app: c => scorecardOf(c.doc, c.ref, { now: c.now, flags: c.flags }).holes.length },
      { key: 'top', name: 'Top hole (before your FOO step first, then payoff over effort)', unit: 'text', fromApp: 'the ranking on the Scorecard', app: c => { const h = scorecardOf(c.doc, c.ref, { now: c.now, flags: c.flags }).holes[0]; return h ? `${h.name}${h.payoff ? `: ${Math.round(h.payoff.value)} a year over ${h.effort} hours` : ''}` : 'None'; } },
    ] },
  { id: 'M75', name: 'Ladder', inputs: 'the cash layers, the match, the heavy debt since Day 0, net worth, invested, the FI targets', unit: 'count',
    fns: ['ladder.ladderOf'],
    fromApp: 'steps in FOO order (little e, the match, heavy debt by quarters, big e) with how far along and a projected month; markers (net worth positive, consumer debt free, $100k, Quiet Quitting FI, Coast FI, Lean FI, FI, Fat FI) reached or projected; the count here is the wins so far',
    app: c => ladderOf(c.doc, c.ref, { now: c.now, flags: c.flags }).wins,
    parts: [
      { key: 'next', name: 'Next step', unit: 'text', fromApp: 'the first step not done, with how far along and when', app: c => { const l = ladderOf(c.doc, c.ref, { now: c.now, flags: c.flags }); return l.next ? `${l.next.name}: ${Math.round(l.next.pct * 100)}% there${l.next.date ? `, about ${l.next.date}` : ''}` : 'Every step done'; } },
      { key: 'marker', name: 'Next marker', unit: 'text', fromApp: 'the first marker not reached, with its projected month', app: c => { const l = ladderOf(c.doc, c.ref, { now: c.now, flags: c.flags }); return l.nextMarker ? `${l.nextMarker.name}${l.nextMarker.date ? `, about ${l.nextMarker.date}` : ''}` : 'Every marker reached'; } },
    ] },
  { id: 'M76', name: 'Current vs Proposed', inputs: 'the file, and the Proposed choices (spending, debt order, retire-by age, surplus invested, extra to debt)', unit: 'money',
    fns: ['proposed.extraIncomeRecord', 'proposed.PROPOSED_KEYS', 'proposed.proposedOf', 'proposed.hasProposal', 'proposed.proposedDoc', 'proposed.netWorthIn', 'proposed.shortfallOf', 'proposed.shortfallOwed', 'proposed.shortfallPath', 'proposed.typicalCardLimit', 'proposed.compareOf', 'proposed.setProposed', 'proposed.clearProposed', 'proposed.makeProposedThePlan'],
    fromApp: 'two runs of the same math on the real file and on a copy with the choices applied: the FI date, the savings rate, net worth in 5 and 10 years (invested grown at the real return with what goes in, the rest of net worth, plus debt paid down on the payoff plan, minus a monthly shortfall borrowed on the card at the highest card APR, else the typical card APR, until the room on the cards runs out (the limits typed, else the typical limit at the age of the client; past it no number is given)), the next step and marker; the Proposed tab shows each side with the steps',
    app: c => compareOf(c.doc, c.ref, { now: c.now, flags: c.flags }).rows.find(r => r.key === 'nw10')?.diff ?? null,
    parts: [{ key: 'nw5', name: 'Net worth in 5 years (current)', unit: 'money', fromApp: 'invested grown at the real return plus what goes in, the rest of net worth, plus debt paid down by then, minus a monthly shortfall borrowed on the card', app: c => netWorthIn(c.m, 5, { shortfall: shortfallOf(c.m, c.ref) }).value }] },
  { id: 'M79', name: 'Freed money follows the FOO', inputs: 'M34 heavy months and freed payments, M27, M43 big e less the cash in the layers (M68), the Roth IRA and HSA room', unit: 'months',
    fns: ['flow.freedFlow', 'flow.taxFreeRoom', 'flow.flowWords', 'fi.waitWords', 'layers.layerOptions'],
    fromApp: 'a month-by-month flow, not one cell: after the heavy debt the surplus and the freed payments fill big e, then Tax-Free Growth, then are invested (RULES.freedFollowsFoo, QUESTIONS 196); each phase ends at the first whole month its dollars are in. The value is the month big e is full; the FI date (M53) reads the same months',
    app: c => c.m.fooFlow?.bigEEnd ?? null,
    parts: [{ key: 'taxFree', name: 'Month Tax-Free Growth is full for the year', unit: 'months', fromApp: 'the same flow', app: c => c.m.fooFlow?.taxFreeEnd ?? null }] },
  { id: 'M80', name: 'Next best opportunity', inputs: 'M79, the match left on the table, every debt\'s APR and promo end, the return', unit: 'money',
    fns: ['flow.nextBest', 'flow.matchRoom'],
    fromApp: 'compares every alternative for the same dollars step by step, so it is worked out in SLAM: on each FOO step the money goes to (heavy debt, big e, Tax-Free Growth, investing), the yearly value of the step against the best alternative on the same dollars; shown as one line on the step when it beats it by RULES.nextBestMin or more. The value is the largest gap a year across the steps',
    app: c => { const v = foo(c.doc, c.ref, { now: c.now, flags: c.flags }).steps.map(s => s.worthALook?.by).filter(x => x != null); return v.length ? Math.max(...v) : null; } },
  { id: 'M81', name: 'The gap', inputs: 'M27 (below zero), the spending lines and their levels, Bills and subscriptions, the gut number, the income option', unit: 'money',
    fns: ['gap.gapOf', 'gap.gapProposal', 'gap.gapIncomeOf'],
    // Batch 38: what the month is short is a formula now; the levers pick lines by level and kind, so they stay in the app.
    sheet: 'IF(Math_M27="","",IF(Math_M27>=-0.5,"",-Math_M27))', label: 'What the month is short: the surplus below zero, turned around',
    app: c => gapOf(c.doc, c.m)?.short ?? null,
    parts: [{ key: 'closes', name: 'What the three levers close together, a month', unit: 'money',
      fromApp: 'the levers pick one Budget line by its level and kind, so they are chosen in SLAM: a quarter of the largest Level 1 or 2 line that can move (or a tenth of the gut number with no lines), the largest subscription that can be cut, and the income the coach fills in; Use the gap proposes the spending cut and the income for the rest on Current vs Proposed',
      app: c => gapOf(c.doc, c.m)?.closes ?? null }] },
  { id: 'M82', name: 'Your next 3 moves', inputs: 'M69 the FOO step (and M79, M81), M74 the holes before it, the homework', unit: 'count',
    fns: ['moves.nextMoves'],
    fromApp: 'sentences picked from the FOO, the Scorecard and the homework, not a number: the FOO step you are on (or the gap), a Scorecard hole before your step with a payoff, a homework item, then the FOO steps the money goes to next; each one sentence with dollars and a month, linked to its screen. Top of Report › One-pager',
    app: c => nextMoves(c.doc, c.ref, { now: c.now, flags: c.flags }).length },
  { id: 'M90', name: 'Life Transitions runway', inputs: 'M27 spending and the DRAFTT and FAT levels (M68), income that keeps coming, unemployment until its end date, cash in the layers, family help, card room and APR, retirement balances with the early penalty and tax (M10)', unit: 'months',
    fns: ['transitions.RUNGS', 'transitions.LEVELS', 'transitions.phase4On', 'transitions.cardCost', 'transitions.withdrawalCost', 'transitions.burnLevels', 'transitions.transitionPlan', 'transitions.ladderOf', 'transitions.dipOf', 'transitions.tripwiresOf', 'transitions.plansOf', 'transitions.monthsText', 'transitions.transitionOf', 'transitions.setTransition'],
    fromApp: 'a month-by-month run from today drawn from the rungs in ladder order (cash, family, investments, the 0% card, the regular card with its APR each month, retirement money after the 10% penalty and tax); it reads the cash layers (M68), still the app\'s, so it waits for them to be formulas, then a month table (batch 62); the value is the months until the last rung runs out (Plan › Transitions)',
    app: c => transitionOf(c.doc, c.ref, { now: c.now }).runway,
    parts: [{ key: 'full', name: 'Months at full spending', unit: 'months', fromApp: 'the same run with the burn held at full spending', app: c => transitionOf(c.doc, c.ref, { now: c.now }).levels[0].runway },
      { key: 'food', name: 'Months at food and housing only', unit: 'months', fromApp: 'the same run with the burn held at food and housing', app: c => transitionOf(c.doc, c.ref, { now: c.now }).levels[3].runway }] },
  // ---------- Can I afford it? (batch 23) ----------
  { id: 'M83', name: 'Can I afford it?', inputs: 'a cost (one-time, a month, or a big goal), its amount and month; M60 the calendar and its low-balance line, M69 the FOO step and its date, M53 the FI date, M68 the cash layers, the free money a month', unit: 'months',
    fns: ['afford.AFFORD_KINDS', 'afford.defaultYears', 'afford.askOf', 'afford.affordDoc', 'afford.affordOf'],
    fromApp: 'two whole-plan runs, on the file and on a copy with the cost in (a sinking fund until its month, or spending from its month): the calendar\'s tightest day (M60), the FOO step date and the FI date, which read the month-by-month debt-first plan (M34, M79), still the app\'s (batch 62); the row here is a $1,000 one-time cost next month',
    label: 'FI date moves (months) with a $1,000 one-time cost next month', app: c => affordOf(c.doc, c.ref, { kind: 'once', amount: 1000, ym: addMonths(ymOf(c.now), 1) }, { now: c.now }).fi?.moved ?? null },
  // ---------- Batch 30: the card library (Net worth › Credit cards) ----------
  { id: 'M9C', name: 'Is the card worth its fee', inputs: 'the card picked from the library (fee, rewards by category, credits), the Use it and Don\'t taps, the Budget lines by category, M17 the real hourly wage and the client\'s materiality (MaterialHours, MaterialFloor)', unit: 'money',
    fns: ['cards.searchCards', 'cards.cardById', 'cards.issuerName', 'cards.categorySpend', 'cards.cardRewards', 'cards.feeCheck', 'cards.DOUBLE_WORDS', 'cards.doubledUp', 'cards.cardsPicture'],
    fromApp: 'reads the card library (data/library/cards.json: 67 cards, each with its own category rates, caps and credits) against the Budget\'s lines by category, and the Use it taps are kept with each card in SLAM; no household here holds a library card, so a port could not be checked yet (batch 62). Under the materiality amount it reads about even. The value adds up every held card with a fee',
    app: c => { const P = cardsPicture({ cardRows: c.live.filter(r => r.kind === 'debt' && r.type === 'Credit card'), lines: c.x.lines, coverage: c.live.filter(r => r.kind === 'coverage'), library: cardLibrary(), rate: c.m.hourly, assumptions: c.doc.assumptions, freq: c.x.payFrequency });
      const nets = (P?.held || []).map(h => h.check.value).filter(v => v != null); return nets.length ? nets.reduce((s, v) => s + v, 0) : null; },
    parts: [{ key: 'doubled', name: 'Card benefits a paid line may be doubling up', unit: 'count', fromApp: 'card benefits (cell phone protection, rental car coverage, extended warranty) against Budget lines and Protection rows whose names say the same thing',
      app: c => cardsPicture({ cardRows: c.live.filter(r => r.kind === 'debt' && r.type === 'Credit card'), lines: c.x.lines, coverage: c.live.filter(r => r.kind === 'coverage'), library: cardLibrary(), freq: c.x.payFrequency })?.doubled.length ?? null }] },
  { id: 'M9D', name: 'What would move the credit score most', inputs: 'the score, M35 utilization overall and each card\'s balance and limit, late payments, autopay on each card, hard inquiries, the oldest card\'s age', unit: 'text',
    fns: ['cards.creditMove'],
    sheet: 'Credit_move', // batch 62: the steps are on the Credit score tab
    app: c => { const cards = c.live.filter(r => r.kind === 'debt' && r.type === 'Credit card'); const cr = c.doc.profile?.credit || {}; const H = creditHealth(cards.map(r => ({ id: r.id, balance: r.values.balance, limit: r.values.limit, opened: r.values.opened })), { now: c.now });
      return creditMove({ score: cr.score ?? null, overall: H.overall, cards: cards.map(r => ({ balance: r.values.balance ?? 0, limit: r.values.limit ?? 0 })), latePayments: cr.latePayments ?? null, autopayOff: cards.filter(r => r.values.autopay === 'Off').length, inquiries: cr.inquiries ?? null, oldestMonths: H.oldestMonths }).key; } },
  { id: 'M95', name: 'Who they are with money', inputs: 'the work situation, what is invested, cash and runway (M27), heavy debt, Why now and the goal chips, equity pay, Confidence (F4), the FI Address taps, the 12 letters taps per person, the 6 weather taps per person and session', unit: 'text',
    fns: ['identity.identityOn', 'identity.isCouple', 'identity.peopleOf', 'identity.inTransition', 'identity.addressFacts', 'identity.familiarityOf', 'identity.stateOf', 'identity.routeOf', 'identity.feelOf', 'identity.stateChar', 'identity.ceilingChar', 'identity.addressOf', 'identity.axisScores', 'identity.tieBreaks', 'identity.lettersOf', 'identity.weatherScore', 'identity.weatherHistory', 'identity.weatherOf', 'identity.tiltOf', 'identity.treeName', 'identity.leadOf', 'identity.asksOf', 'identity.identityOf', 'identity.onePagerLine', 'identity.setAddress', 'identity.toggleModifier', 'identity.setLetter', 'identity.setWeather', 'identity.setLater'],
    fromApp: 'tap scoring, not a dollar formula (batch 25, Phase 4): the FI Address (familiarity, route and target, state and feeling, the ceiling, a motion flag, modifiers), the four letters (each axis -3 to 3 from Agree 1, Neutral 0, Disagree -1; a tie leans on what SLAM knows) with the 3 skill trees each type points to, the weather (six answers 0 to 2, two turned around, scaled to 12: Clear to 2, Fair to 5, Overcast to 8, Storm above), a couple\'s one ask each, and the tilt (25 tree ids ranked). The value is the client\'s four letters (Coach tools › Discovery)',
    app: c => identityOf(c.doc, c.ref, { now: c.now, m: c.m }).people[0].letters.type,
    parts: [{ key: 'address', name: 'FI Address', unit: 'text', fromApp: 'tap scoring kept in SLAM (the taps are not on a tab): the four characters, the motion flag and the modifiers, read mostly from the household plus up to four taps', app: c => identityOf(c.doc, c.ref, { now: c.now, m: c.m }).address.full },
      { key: 'weather', name: 'Money weather (latest)', unit: 'text', fromApp: 'the latest session\'s six taps, scaled to 12 (the taps are kept with the session in SLAM, not on a tab)', app: c => identityOf(c.doc, c.ref, { now: c.now, m: c.m }).people[0].weather.latest }] },
  // ---------- The true cost of debt and the student loan decision (batch 29) ----------
  { id: 'M9T', name: 'The true cost of each debt', inputs: 'M34 the one debt plan (each debt\'s interest, also in today\'s dollars at the inflation assumption), M53 the FI date, M14 the marginal rates, the debt type and what it is linked to', unit: 'money',
    fns: ['truecost.trueCostOf', 'truecost.withoutDebt', 'truecost.afterTaxOf'],
    fromApp: 'the debt plan run once per debt on a copy with that debt gone today (its payment kept), with each month\'s interest in today\'s dollars: it needs the month-by-month payoff plan (M34) as a sheet table first (batch 61 is porting it); the row is the interest still to pay, in today\'s dollars, across every debt',
    label: 'Interest still to pay, in today\'s dollars', app: c => trueCostOf(c.doc, c.ref, { now: c.now }).value },
  { id: 'M9L', name: 'A new loan, or a different one', inputs: 'what it is for, the amount, up to three offers (rate, years, fees), paying cash; M34, M53, M68 big e, the free money a month; for school or business the extra pay a year and when it starts', unit: 'months',
    fns: ['truecost.LOAN_KINDS', 'truecost.MAX_OFFERS', 'truecost.loanPayment', 'truecost.loanSchedule', 'truecost.withLoan', 'truecost.withCash', 'truecost.loanAskOf', 'truecost.loanOffers', 'truecost.boughtOf'],
    fromApp: 'each offer is added to a copy of the file and the whole plan runs again (the payment, the total, the FI date, the debt-free month, big e when paid in cash), and the plan\'s debt-first months are a month-by-month simulation (M34), still the app\'s (batch 62); the row is a $20,000 car loan at 7% over 5 years',
    label: 'FI date moves (months) with a $20,000 car loan at 7% over 5 years', app: c => loanOffers(c.doc, c.ref, { kind: 'car', amount: 20000, offers: [{ rate: 0.07, years: 5 }] }, { now: c.now }).offers[0]?.fi?.moved ?? null },
  { id: 'M9S', name: 'Student loan decision', inputs: 'every federal student loan as one (balance, APR, payment), PSLF and the payments left, first borrowed, gross pay less before-tax saving and the interest deduction (AGI), filing status, dependents; the 2026 plan rules (studentLoans in the reference data)', unit: 'money',
    fns: ['studentloan.FIRST_BORROWED', 'studentloan.PAYMENTS_MADE', 'studentloan.povertyLine', 'studentloan.levelPayment', 'studentloan.ibrPayment', 'studentloan.rapRate', 'studentloan.rapPayment', 'studentloan.repay', 'studentloan.interestDeduction', 'studentloan.studentLoanOf', 'studentloan.studentLoanPlans'],
    fromApp: 'a month-by-month walk of each plan for up to 30 years (simple interest on federal loans, the RAP interest waiver and $50 principal match change the balance each month) to forgiveness or payoff, then the federal tax on what IBR or RAP forgives in today\'s dollars; a month table per plan is a later batch (batch 62); the row is the lowest total paid plus tax across the plans',
    label: 'Lowest total paid plus tax across the plans', app: c => studentLoanPlans(c.doc, c.ref, { now: c.now }).value },
  { id: 'M9K', name: 'Learn and unlearn at each FOO step', inputs: 'M69 the FOO step you are on, the skill files (data/library/skills.json, app-skills.json, unlearn.json, slam-rules.json), the tilt (profile.identity.tilt, M95), the household facts the app skills\' proofs name (income, the match, debts and APRs, little e, filing status, the Budget lines, health and life coverage, the FI age, a target allocation, the sleep-at-night number, Keep or Try to cut on the Bills list), the skills marked done (profile.library), LearnShown, Phase 4 previews (settings.phase4)', unit: 'text',
    fns: ['library.proofField', 'library.libraryFacts', 'library.mappedFields', 'library.appliesTo', 'library.tiltTree', 'library.mergeTwins', 'library.doneOf', 'library.orderSkills', 'library.unlearnFor', 'library.slamRuleOf', 'library.learnFor', 'library.libraryOn', 'library.libraryOf', 'library.setSkillDone'],
    fromApp: 'a reading order, not a dollar formula (batch 26, Phase 4): the skills tagged to each FOO step, ordered by the tilt (the tree\'s place in it, one per tree first) when there is one, then the band, the leverage tier and the level; LearnShown of them not done; an app skill whose proof names a household fact ticks itself when the fact shows; the first unlearn entry for the step, Not yet or From an earlier step against the order. The value is the first skill to learn at the step you are on (Home\'s Learn next)',
    app: c => { const lib = skillLibrary(); return lib ? libraryOf(c.doc, c.ref, lib, { now: c.now, m: c.m })?.next?.skill.name ?? null : null; },
    parts: [{ key: 'ticked', name: 'Skills the data ticks', unit: 'count', fromApp: 'the app skills whose proof field the household shows (FOO step 2, little e, the coverage rows and the rest)', app: c => { const lib = skillLibrary(); if (!lib) return null; const L = libraryOf(c.doc, c.ref, lib, { now: c.now, m: c.m }); if (!L) return null; return Object.values(L.steps).reduce((n, b) => n + b.done.filter(x => x.by === 'data').length, 0); } }] },
  // ---------- Batch 31: typical at your age (Phase 4, Track 1 groundwork) ----------
  { id: 'M9E', name: 'Typical at your age', inputs: 'age (About you: birth year and month), state, solo or couple, housing, roommates and how rent is given, the cash accounts\' balances, card balances, student loan balances, the gut spending number, the rent line; data/priors-2026.json (the Primary rows only); TypicalLow, TypicalHigh', unit: 'count',
    fns: ['priors.TYPICAL', 'priors.CE_CATEGORIES', 'priors.NO_ROW', 'priors.rowFor', 'priors.ageRatioOf', 'priors.shapeOf', 'priors.NYC_AREA', 'priors.inNycArea', 'priors.placeOf', 'priors.typicalOf', 'priors.farFrom', 'priors.typicalCheck', 'priors.typicalChecks', 'priors.shareOf', 'priors.shortRange', 'priors.typicalBoxes', 'priors.priorsOpts', 'priors.isRentLine'],
    // Was from the app until batch 63 (which totals to test depends on the boxes the household has filled); the boxes are
    // read here from the input tabs: cash accounts, card balances, student loans, the gut number and a renter's rent line(s).
    // Batch 63: a lookup on the priors tables of the Assumptions tab (js/sheet/typical.js), no longer from the app.
    sheet: farCount(), label: 'Totals far outside typical at your age (cash, cards, student loans, spending a month, rent)',
    app: c => { const d = priorsData(); if (!d) return null; const o = priorsOpts(c.doc?.profile); return typicalChecks(d, { age: c.x?.age ?? null, ...o, boxes: typicalBoxes(c.live, o) }).length; },
    parts: [
      ...[['cash', 'Typical cash at this age (checking and savings, all accounts; among those with any)', 'money'], ['card', 'Typical card balances (among those carrying one)', 'money'], ['studentLoans', 'Typical student loans (among those with any)', 'money'], ['spending', 'Typical spending a month, all in, at this age and place', 'money'], ['rent', 'Typical rent a month (your share where it is split)', 'money']].map(([k, name, unit]) => ({ key: k, name, unit,
        sheet: `IF(ISERROR(${TYP[k]}),"",${TYP[k]})`, app: c => { const d = priorsData(); if (!d) return null; const o = priorsOpts(c.doc?.profile); return typicalOf(d, k, { age: c.x?.age ?? null, ...o })?.likely ?? null; } })),
      { key: 'netWorth', name: 'Typical net worth at this age (the SCF median)', unit: 'money', // batch 38: a lookup on the Assumptions tab, no longer from the app
      sheet: 'IF(Profile_ageUsed="","",IFERROR(INDEX(Priors_netWorth_typical,MATCH(Profile_ageUsed,Priors_netWorth_from,1)),""))',
      app: c => { const d = priorsData(); return d ? typicalOf(d, 'netWorth', { age: c.x?.age ?? null })?.likely ?? null : null; } }] },
  // ---------- Batch 46: the plan from an age (Phase 4, Track 1, the age-only start) ----------
  { id: 'M9A', name: 'The plan from an age: typical for the age until answered', inputs: 'age (About you: birth year and month), state, solo or couple; which of take-home, spending, cash, invested and card balances are answered (a typed number, or a no on About you); data/priors-2026.json through M9E; PriorSpendShare, TypicalLow, TypicalHigh; the ranges method (M9R)', unit: 'count',
    fns: ['agestart.CORE', 'agestart.PLAN_OUTPUTS', 'agestart.priorFill', 'agestart.answeredOf', 'agestart.planLabel', 'agestart.priorOf', 'agestart.filledOf', 'agestart.agePlanOf', 'agestart.ageOnlyRangesOf', 'agestart.widthsOf', 'agestart.planWordsOf'],
    // Batch 63: the count and each typical fill-in are lookups (js/sheet/typical.js); the plan run on them stays in the app.
    sheet: `IF(Profile_ageUsed="","",${Object.keys(ANSWERED).map(k => `IF(${ANSWERED[k]},0,1)`).join('+')})`, label: 'Core inputs still typical for the age (0 once take-home, spending, cash, invested and cards are all answered)',
    app: c => { const d = priorsData(); return d ? agePlanOf(c.doc, c.ref, d, { now: c.now })?.typical ?? null : null; },
    parts: [
      ...[['income', 'Typical pay for the age, gross a year (all pay together)'], ['spending', 'Typical spending for the age, a month'], ['cash', 'Typical checking and savings for the age (those with none count as $0)'], ['invested', 'Typical invested for the age (those with none count as $0)'], ['card', 'Typical card balances for the age (those with none count as $0)']].flatMap(([k, name]) => [
        { key: `typical_${k}`, name: `${name}: the fill-in while it is blank, never counted as the client's`, unit: 'money', sheet: `IF(Profile_ageUsed="","",IF(ISERROR(${FILL[k]}),"",${FILL[k]}))`,
          app: c => { const d = priorsData(); if (!d) return null; const age = c.x?.age ?? null; if (age == null) return null; const o = priorsOpts(c.doc?.profile); return priorOf(d, k, { age, place: o.place, household: o.household })?.likely ?? null; } },
        { key: `answered_${k}`, name: `${name.replace(/^Typical /, '').replace(/ for the age.*$/, '')}: answered (Yes), or still typical (No)`, unit: 'text', sheet: `IF(${ANSWERED[k]},"Yes","No")`,
          app: c => (answeredOf(c.doc, c.ref)[k] ? 'Yes' : 'No') }]),
      ...[['fi', 'FI date', 'months'], ['debtFree', 'Debt free', 'months'], ['efMonths', 'Emergency fund, months of spending held', 'number'], ['surplus', 'Monthly surplus', 'money']].flatMap(([k, label, unit]) => [
      { key: `${k}Low`, name: `${label}, typical for the age where not answered: low`, unit, fromApp: 'M9A: the plan run again with each typical amount at its low (M9R)', app: c => { const d = priorsData(); const r = d ? agePlanOf(c.doc, c.ref, d, { now: c.now })?.ranges?.[k] : null; return r?.low ?? null; } },
      { key: `${k}High`, name: `${label}, typical for the age where not answered: high (blank when it never comes at that end)`, unit, fromApp: 'M9A: the plan run again with each typical amount at its high (M9R)', app: c => { const d = priorsData(); const r = d ? agePlanOf(c.doc, c.ref, d, { now: c.now })?.ranges?.[k] : null; return r?.high == null || r.high === Infinity ? null : r.high; } }])] },
  // ---------- Ranges (Phase 4, Track 1; docs/engines/ranges.md) ----------
  { id: 'M9R', name: 'Ranges on the key outputs: low, likely and high', inputs: 'every input\'s level (M73: Know it, Roughly, Not sure, the gut number, a statements total) and its kind, the widths on the Assumptions tab (RangeBalance*, RangeSpend*, RangeIncome*, RangeVariable*, RangeApr*, AprGuessSwing, RoughBalanceShare, TypicalLow, TypicalHigh), the materiality (MaterialHours, MaterialFloor, RangeMinMonths, RangeMinEfMonths)', unit: 'count',
    fns: ['ranges.widthOf', 'ranges.knobsOf', 'ranges.OUTPUTS', 'ranges.combine', 'ranges.rangesOf', 'ranges.fooRangeOf', 'ranges.materialOf', 'ranges.rangeWordsOf', 'ranges.driverWords', 'ranges.fooWordsOf'],
    // Batch 63: the corner method in the sheet (js/sheet/ranges.js, the Ranges tab). Each input that can widen a range
    // is a row of What widens it; these columns are what the spending lines and the tax on a gross need per row.
    cols: [
      { area: 'spending', key: 'rgCand', label: 'Ranges: a line that moves with spending (1) (M9R)', unit: 'number',
        f: 'IF(AND({InMath}<>"No",{amount}<>"",N({amount})<>0,{Status}<>"Not for me",OR({Kind}="Budget line",AND({Kind}="Gut number or category",{Type}<>"All in"))),1,0)' },
      { area: 'spending', key: 'rgLevel', label: 'Ranges: how sure the line is (Know it 100, Roughly 50, Guess 25)', unit: 'number',
        f: (rec, c) => { const L = rec?.id ? levelOf(rec, 'amount', { months: c.doc.spending?.months || {} }) : null; const st = { 'Not sure': 25, 'Will email': 25, 'Not now': 25, Roughly: 50, Computed: 75 }[rec?.status] ?? 100; return `IF({@rgCand}=0,"",${L != null && L !== st && rec?.id ? L : STATUS_LEVEL('{Status}')})`; } },
      { area: 'spending', key: 'rgLo', label: 'Ranges: the line at its low, times its amount', unit: 'number',
        f: rec => `IF({@rgCand}=0,"",${rec?.values?.preset === true ? 'IF({Status}="Guess",TypicalLow,' : '('}1-${WIDTH('spending', '{@rgLevel}')}))` },
      { area: 'spending', key: 'rgHi', label: 'Ranges: the line at its high, times its amount', unit: 'number',
        f: rec => `IF({@rgCand}=0,"",${rec?.values?.preset === true ? 'IF({Status}="Guess",TypicalHigh,' : '('}1+${WIDTH('spending', '{@rgLevel}')}))` },
      ...['lo', 'hi'].flatMap(s => { const F = s === 'lo' ? '{@rgLo}' : '{@rgHi}', SB = `IF({myShare}<>"",{@shareBase},{@shareBase}*${F})`; return [
        { area: 'spending', key: `M21${s}`, label: `Ranges: my share a month with the line at its ${s === 'lo' ? 'low' : 'high'}`, unit: 'money',
          f: `IF(OR(${F}="",{Kind}<>"Budget line",{@shareBase}=""),{@M21},{@coupleX}*IF(OR({Status}="Not for me",{@whoUsed}="Included in rent",{@whoUsed}="N/A"),${SB},MAX(0,${SB}-IF({reimbursed}="",0,{reimbursed}*${MONTH_FACTOR('{per}')}))))` },
        { area: 'spending', key: `amt${s === 'lo' ? 'Lo' : 'Hi'}`, label: `Ranges: the amount with the line at its ${s === 'lo' ? 'low' : 'high'}`, unit: 'money', f: `IF({amount}="","",{amount}*IF(${F}="",1,${F}))` }]; }),
      { area: 'income', key: 'rgStack', label: 'Ranges: order on the return as a number (-1: not taxed)', unit: 'number', f: 'IF({@stack}="",-1,{@stack})' },
      { area: 'income', key: 'rgM', label: 'Ranges: Social Security counts twice (self-employed)', unit: 'number', f: 'IF({@taxType}="1099",2,1)' },
      { area: 'income', key: 'rgFb', label: 'Ranges: FICA base a year as a number', unit: 'money', f: 'N({@ficaBase})' },
      { area: 'income', key: 'rgCum', label: 'Ranges: FICA base a year for this person through this row', unit: 'money', f: 'IF({@stack}="",0,SUMIFS(Income_ficaBase,Income_taxPerson,{@taxPerson},Income_stack,"<="&{@stack}))' },
    ],
    sheet: '(Rg_fiWide="Yes")+(Rg_dfWide="Yes")+(Rg_efWide="Yes")+(Rg_surWide="Yes")+(Rg_nwWide="Yes")', label: 'Key outputs wide enough to show a range (the Ranges tab)',
    app: c => { const r = c.ranges(); return r ? ['fi', 'debtFree', 'efMonths', 'surplus', 'netWorth'].filter(k => r[k]?.material).length : null; },
    parts: [
      ...[['fi', 'FI date', 'months', 'fi'], ['debtFree', 'Debt-free date', 'months', 'df'], ['efMonths', 'Emergency fund, months of spending held', 'number', 'ef'], ['surplus', 'Monthly surplus', 'money', 'sur'], ['netWorth', 'Net worth', 'money', 'nw']].flatMap(([k, label, unit, o]) => [
        { key: `${k}Low`, name: `${label}: low (inputs at their low and high, swings combined; the Ranges tab)`, unit, sheet: `Rg_${o}Low`, app: c => c.ranges()?.[k]?.low ?? null },
        { key: `${k}Likely`, name: `${label}: likely (the number every screen shows)`, unit, sheet: `Rg_${o}Likely`, app: c => c.ranges()?.[k]?.likely ?? null },
        { key: `${k}High`, name: `${label}: high (blank when a date never comes at that end)`, unit, sheet: `Rg_${o}High`, app: c => c.ranges()?.[k]?.high ?? null }]),
      { key: 'fooLow', name: 'FOO step: the earliest step any one input reaches at its low or high', unit: 'text', fromApp: 'M9R: the FOO (M69) walked again with each input moved by its level', app: c => c.fooRange()?.low ?? null },
      { key: 'fooHigh', name: 'FOO step: the latest step any one input reaches at its low or high', unit: 'text', fromApp: 'M9R: the FOO (M69) walked again with each input moved by its level', app: c => c.fooRange()?.high ?? null },
    ] },
  // ---------- Batch 49: households of any size (Phase 4, Track 2) ----------
  { id: 'M9N', name: 'Households of any size: one adult\'s part of a shared row', inputs: 'the adults in the plan (this client, the partner in a couple mode, People P3 to P7), each row\'s Owner (Joint: everyone on this row), Shared among, Split how and the percents, Shared bills split on About you, each adult\'s take-home a month (By income), the roommates count',
    fns: ['household.SPLIT_HOWS', 'household.SPLIT_HOW_WORDS', 'household.amongList', 'household.splitTyped', 'household.generalRow', 'household.amongOf', 'household.howOf', 'household.rowShare', 'household.splitWords'],
    // Batch 63: a column on every tab with an Owner (This client's part, M9N), from Shared among, Split how and the
    // About you split; each adult's take-home (By income) and the percents typed on the Owner chip are the app's.
    cols: M9N_AREAS.flatMap(area => [{ area, key: 'part9N', label: 'This client\'s part of a shared row (M9N)', unit: 'pct',
      f: (rec, c) => {
        const H = rec?.id ? householdOf(c.doc, { weights: c.m?.inputs?.household?.weights ?? {} }) : null;
        const ADULTS = `MIN(${MAX_ADULTS},1+IF(IF(Profile_mode<>"",Profile_mode<>"Solo",Profile_household="Couple"),1,0)+COUNTIFS(People_kind,"<>Dependent",People_Id,"P?"))`;
        const among = 'IF({splitAmong}="",' + ADULTS + ',LEN({splitAmong})-LEN(SUBSTITUTE({splitAmong},",",""))+1)';
        const pct = rec?.values?.sharePct ?? rec?.values?.splitPcts?.Me ?? '';
        const typed = H ? amongOf(rec, H).filter(id => id !== 'Me' && typeof { ...(rec.values?.sharePct != null ? { Me: rec.values.sharePct } : {}), ...(rec.values?.splitPcts || {}) }[id] === 'number') : [];
        const others = typed.reduce((t, id) => t + rec.values.splitPcts[id], 0);
        const w = H ? amongOf(rec, H).reduce((t, id) => t + Math.max(0, H.weights[id] ?? 0), 0) : 0, wMe = H ? Math.max(0, H.weights.Me ?? 0) : 0;
        const how = `IF(OR({splitHow}="Equal",{splitHow}="Percent",{splitHow}="By income"),{splitHow},IF(AND(${pct === '' ? 'FALSE' : 'TRUE'},${ADULTS}>2),"Percent",IF(Profile_splitMethod="By income","By income","Equal")))`;
        const percent = pct !== '' ? `MAX(0,${pct})` : `IF(${among}>${typed.length},MAX(0,1-${others})/(${among}-${typed.length}),0)`;
        return `IF({owner}<>"Joint","",IF(AND({splitAmong}<>"",ISERROR(SEARCH("Me",{splitAmong}))),0,IF(${how}="Percent",${percent},IF(AND(${how}="By income",${w}>0),${wMe}/${w},1/${among}))))`;
      } },
      // Where the row stands in the file, so the Math row reads the first shared row as SLAM does (from the app: the file's order).
      { area, key: 'joint9N', label: 'Shared row: its place in the file (M9N)', unit: 'number', f: rec => (rec?.id ? `IF({owner}="Joint",{app:place},"")` : '""'), app: { place: (rec, c) => c.doc.records.findIndex(r => r.id === rec.id) + 1 } }]),
    sheet: `IF(COUNT(${M9N_AREAS.map(a => `${M9N_PREFIX[a]}_joint9N`).join(',')})=0,"",${M9N_AREAS.map(a => `SUMIFS(${M9N_PREFIX[a]}_part9N,${M9N_PREFIX[a]}_joint9N,MIN(${M9N_AREAS.map(b => `${M9N_PREFIX[b]}_joint9N`).join(',')}))`).join('+')})`,
    unit: 'pct', label: 'This client\'s part of the first shared row', app: c => { const r = (c.doc.records || []).find(x => x.owner === 'Joint'); if (!r) return null; return rowShare(r, 'Me', householdOf(c.doc, { weights: c.m?.inputs?.household?.weights ?? {} })); } },
  // ---------- Batch 42: the lender's-eye view (Phase 4, Track 2) ----------
  { id: 'M9W', name: 'What a lender sees: a mortgage lender, a landlord and a card issuer', inputs: 'each income row (its gross, cash tips and whether they are reported, the returns filed with self-employment: Tax returns filed, Net profit on the last return and the one before), benefits and their end dates, the debts\' payments (a card at its minimum), the home loan, the rent line, card balances, limits and statement days; LenderFront, LenderBack, LenderBackStrong, LenderBackDu, LenderFhaFront, LenderFhaBack, LenderRentTimes, LenderRentYearNyc, LenderDropLook, LenderBenefitYears, LenderLeaseMonths, LenderStudentPct, LenderMortgageRate (or the client\'s own), LenderMortgageYears, LenderTaxInsShare (or the client\'s own), UtilHigh, UtilBest', unit: 'pct',
    fns: ['lender.RETURNS_FILED', 'lender.lenderOn', 'lender.lastReturnYear', 'lender.lenderKind', 'lender.returnsOf', 'lender.lenderRows', 'lender.lenderDebts', 'lender.loanFromPayment', 'lender.maxHomePayment', 'lender.dtiPlace', 'lender.lenderOf', 'lender.LENDER_RATES', 'lender.LENDER_SHARES', 'lender.lenderTermsOf', 'lender.rateWords'],
    sheet: 'Lender_dti', // batch 62: the steps are on the Lender tab
    label: 'Total debt-to-income on the income a mortgage lender can count', app: c => lenderOf(c.doc, c.ref, { now: c.now, m: c.m }).mortgage.dti,
    parts: [
      { key: 'counted', name: 'Income a mortgage lender can count, a month', unit: 'money', sheet: 'Lender_counted', app: c => lenderOf(c.doc, c.ref, { now: c.now, m: c.m }).mortgageIncome },
      { key: 'earned', name: 'Income earned, a month before tax (gifts left out)', unit: 'money', sheet: 'Lender_earned', app: c => lenderOf(c.doc, c.ref, { now: c.now, m: c.m }).earned },
      { key: 'gap', name: 'The gap: earned less what a mortgage lender can count, a month', unit: 'money', sheet: 'Lender_gap', app: c => lenderOf(c.doc, c.ref, { now: c.now, m: c.m }).gap.month },
      { key: 'landlord', name: 'Income a landlord can count, a month', unit: 'money', sheet: 'Lender_landlord', app: c => lenderOf(c.doc, c.ref, { now: c.now, m: c.m }).landlordIncome },
      { key: 'loan', name: 'Home loan the usual lines clear on the income a lender can count', unit: 'money', sheet: 'Lender_loan', app: c => lenderOf(c.doc, c.ref, { now: c.now, m: c.m }).mortgage.loan },
    ] },
  // ---------- Batch 44: the bank fire drill and stranded money (Phase 4 Track 2) ----------
  { id: 'M9F', name: 'Bank fire drill: days the reachable money covers the must-pay bills', inputs: 'the bank accounts (balance, bank on Institutions, owner, Purpose: Taxes), Lands in on each paycheck, Paid with on a bill, cash at home, each card\'s limit and balance and bank, M60 the calendar\'s next FireDrillDays days, the must-pay Budget lines (housing, utilities and phone, food, getting to work, health and childcare) or the gut number, M30 the minimum on each debt, Bill_order, platform holds (M12)', unit: 'days',
    fns: ['firedrill.BANK_TYPES', 'firedrill.WORKPLACE', 'firedrill.fireDrillState', 'firedrill.setFireDrill', 'firedrill.bankAccounts', 'firedrill.mainAccount', 'firedrill.landsInOf', 'firedrill.drawsFromOf', 'firedrill.sameBankOf', 'firedrill.sameBankAcct', 'firedrill.onlineWordsOf', 'firedrill.likelyOtherOf', 'firedrill.tierOf', 'firedrill.minimumOf', 'firedrill.mustPayOf', 'firedrill.daysCovered', 'firedrill.payOrder', 'firedrill.fireDrillOf', 'firedrill.platformHeld', 'firedrill.closureRiskOf', 'firedrill.backupPlanOf'],
    sheet: 'Drill_days', // batch 62: the steps are on the Fire drill tab
    app: c => fireDrillOf(c.doc, c.ref, { now: c.now }).result?.value ?? null,
    parts: [{ key: 'withCard', name: 'Days covered with the backup card\'s room (a card cannot pay rent or another debt)', unit: 'days', sheet: 'Drill_withCard', app: c => fireDrillOf(c.doc, c.ref, { now: c.now }).cover?.withCard ?? null },
      { key: 'outOfReach', name: 'Out of reach if it froze today: its balance, the same bank\'s accounts, and the paychecks that land there in the window', unit: 'money', sheet: 'Drill_outOfReach', app: c => fireDrillOf(c.doc, c.ref, { now: c.now }).unreachable?.total ?? null },
      { key: 'mustPay', name: 'Must-pay bills a month (the DRAFTT needs and the minimums)', unit: 'money', sheet: 'Drill_mustPay', app: c => fireDrillOf(c.doc, c.ref, { now: c.now }).must?.monthly ?? null }] },
  // ---------- Batch 51: Shift P&L (Phase 5, real lives wave 2) ----------
  { id: 'M9H', name: 'Shift P&L: what a shift really pays an hour', inputs: 'each shift row (M12: shifts a week, pay a shift or the paycheck, card and cash tips, the house fee, the tip-out, its take-home), Getting to a shift (a ride or fare each way and the ways, or the miles at MileageRate), childcare hours and the sitter\'s rate, outfits and gear over the shifts they last, the hours a shift (getting ready, travel, the shift, winding down), M17 the hourly value; batch 60: each kind of night on a row (its own shifts, pay, hours, tips, fee and tip-out, with its share of the row\'s tax), and the same shift with tax set aside on unreported cash tips at the tips note\'s rate', unit: 'money',
    fns: ['shiftpnl.TRAVEL_BY', 'shiftpnl.COST_KEYS', 'shiftpnl.isShiftRow', 'shiftpnl.shiftCostsOf', 'shiftpnl.shiftHoursOf', 'shiftpnl.shiftPnlOf', 'shiftpnl.shiftPnlsOf', 'shiftpnl.nightsOf', 'shiftpnl.cashTaxRateOf'],
    sheet: 'Shift_hourly', // batch 62: each step is on the Shift P&L tab (each kind of night too) and the Income tab's Shift P&L columns
    app: c => { const P = shiftPnlsOf(c.m, { ref: c.ref }); return P.rows.find(r => r.realHourly != null)?.realHourly ?? null; },
    parts: [{ key: 'real', name: 'What that shift leaves, a shift: take-home less getting there, childcare and gear', unit: 'money', sheet: 'Shift_real', app: c => { const P = shiftPnlsOf(c.m, { ref: c.ref }); const r = P.rows.find(x => x.realHourly != null) ?? P.rows[0]; return r ? r.real : null; } }] },
  { id: 'M9Q', name: 'Ask me next and the certainty meter', inputs: 'the ranges (M9R) and their drivers, the Picture %\'s next small things (M73), These are big deals (M56), the FOO step\'s range, the weights and question times on the Assumptions tab (CertaintyWeight*, CertaintyOpenMonths, AskSeconds*)', unit: 'pct',
    fns: ['nextbest.KEYS', 'nextbest.WEIGHTS', 'nextbest.spanOf', 'nextbest.certaintyOf', 'nextbest.answerOf', 'nextbest.questionWords', 'nextbest.whyWords', 'nextbest.askNextOf', 'ranges.runsOf', 'ranges.rangeFromRuns', 'ranges.readOut', 'ranges.DATE'],
    // Batch 63: the meter is a formula over the ranges (M9R, the Ranges tab) and each output's width at 0%.
    sheet: `IF(${CERT_W}=0,0,(${CERT_KEYS.map(([k, , w]) => `IF(Math_M9Q_cert${k}="",0,${w}*Math_M9Q_cert${k})`).join('+')})/${CERT_W})`,
    label: 'The certainty meter: each key output\'s 1 minus its width over its width at 0%, weighted (CertaintyWeight*)',
    app: c => askOf(c)?.meter?.value ?? null,
    parts: [
      ...CERT_KEYS.map(([k, label]) => ({ key: `zero${k}`, name: `${label}: its width at 0% (the wider of the plan from the age alone and every number read as a guess)`, unit: 'number',
        fromApp: 'M9Q: the plan run again from the age alone on typical numbers (M9A) and with every input read as a guess; the wider of the two',
        app: c => { const A = askOf(c); const key = k.charAt(0).toLowerCase() + k.slice(1); return A?.guess ? spanOf(key, A.guess[key]) : null; } })),
      ...CERT_KEYS.map(([k, label, , o, date]) => ({ key: `cert${k}`, name: `How sure: ${label} (1 minus its width over its width at 0%)`, unit: 'pct',
        sheet: `IF(OR(Rg_${o}Likely="",Math_M9Q_zero${k}="",N(Math_M9Q_zero${k})<=0),"",IF(AND(Rg_${o}High="",${date ? 'FALSE' : 'TRUE'}),"",MAX(0,MIN(1,1-IF(Rg_${o}High="",CertaintyOpenMonths,Rg_${o}High-Rg_${o}Low)/Math_M9Q_zero${k}))))`,
        app: c => { const A = askOf(c); const key = k.charAt(0).toLowerCase() + k.slice(1); return A?.meter?.parts.find(p => p.key === key)?.value ?? null; } })),
      { key: 'ask', name: 'Ask me next: the question whose answer narrows the plan most per second', unit: 'text', fromApp: 'M9Q: each input read again at the level its answer reaches, the debt plan run again for each, after the Picture %\'s next small things (M73, still in the app)', app: c => askOf(c)?.top?.question ?? null },
      { key: 'then', name: 'Ask me next: the runner-up', unit: 'text', fromApp: 'M9Q: each input read again at the level its answer reaches', app: c => askOf(c)?.runnerUp?.question ?? null },
    ] },
  // ---------- Batch 47: the benefits cliff (Phase 4, Track 2) ----------
  { id: 'M9B', name: 'The benefits cliff: the lines a raise crosses and what the household keeps', inputs: 'the household size (Solo or couple, Dependents, Kids ages), State and NYC, Health coverage, every income row (earned or not, gross, pre-tax money, half the SE tax), the Rent or mortgage and Electric, gas, water lines, Filing status, the status taps (Getting it, Might qualify, Not on it), SNAP a month and Child care paid out of pocket; Poverty_base, Poverty_perPerson, the SNAP_limits, ACA_applicable, ACA_benchmark, EITC_2026, NY_chpBands, CCAP_line and CCAP_rates tables and the SNAP_*, Medicaid_*, NY_*, ACA_*, EITC_*, CCAP_* and CTC_* values; Child care help (CCAP) and Child care at full price (batch 53)', unit: 'money',
    fns: ['cliff.CLIFF_STATUS', 'cliff.CLIFF_PROGRAMS', 'cliff.RAISE_PICKS', 'cliff.cliffOn', 'cliff.fplOf', 'cliff.cliffHousehold', 'cliff.snapLine', 'cliff.snapBenefit', 'cliff.applicablePct', 'cliff.benchmarkOf', 'cliff.healthAt', 'cliff.kidsAt', 'cliff.eitcOf', 'cliff.programsAt', 'cliff.raiseOf', 'cliff.breakEven', 'cliff.cliffOf',
      'cliff.ccapLine', 'cliff.ccapAt', 'cliff.careTypical'], // batch 53: New York's child care help
    sheet: 'Cliff_next', // batch 62: every step is on the Benefits cliff tab; the break-even raise (a $100-step search) stays the app's there
    label: 'Distance to the next benefit line, a year', app: c => cliffOf(c.doc, c.ref, { now: c.now, m: c.m }).next?.distance ?? null,
    parts: [
      { key: 'snap', name: 'SNAP a month at today\'s income (the benefit formula)', unit: 'money', sheet: 'Cliff_snap0', app: c => cliffOf(c.doc, c.ref, { now: c.now, m: c.m }).base.snap.monthly },
      { key: 'help', name: 'Health coverage help a year at today\'s income (Medicaid, the Essential Plan or the premium credit)', unit: 'money', sheet: 'Cliff_help0', app: c => cliffOf(c.doc, c.ref, { now: c.now, m: c.m }).base.health.help },
      { key: 'eitc', name: 'EITC a year at today\'s earnings (federal and New York)', unit: 'money', sheet: 'Cliff_eitc0', app: c => cliffOf(c.doc, c.ref, { now: c.now, m: c.m }).base.eitc.total },
      { key: 'ccap', name: 'Child care help (NY CCAP): the family share a year at today\'s income (batch 53)', unit: 'money', sheet: 'Cliff_ccap0', app: c => cliffOf(c.doc, c.ref, { now: c.now, m: c.m }).base.ccap?.share ?? null },
      { key: 'raise5k', name: 'A $5,000 raise (the blue box on the Benefits cliff tab): kept after tax less the benefits it costs, plus what it changes in the Child Tax Credit, a year', unit: 'money', sheet: 'Cliff_net', app: c => cliffOf(c.doc, c.ref, { now: c.now, m: c.m, raise: 5000 }).raise.net },
    ] },
  // ---------- Batch 50: the year-by-year projection engine, the core (Phase 5; docs/engines/projection.md) ----------
  // ---------- The self-serve Lifetime plan (start.html): year by year to 90, and its stress tests ----------
  { id: 'M9U', name: 'The lifetime plan: the earliest age the money holds to 90', inputs: 'age, what is invested by tax type, what goes in each year until work stops, spending after work (with the usual drift by age when picked), Social Security at the claim age, the withdrawal strategy, Roth conversions, layered life events, M10 the tax function, the 10% early-withdrawal rule and the Social Security taxation rule', unit: 'number',
    fns: ['lifetime.taxableSocialSecurity', 'lifetime.STRATEGIES', 'lifetime.FILLS', 'lifetime.yearTax', 'lifetime.fillRoom', 'lifetime.needAt', 'lifetime.lifetime', 'lifetime.toleranceOf', 'lifetime.worked', 'lifetime.earliestFreedom'],
    fromApp: 'the plan is walked a year at a time from today to 90 in today\'s dollars (three tax buckets, a withdrawal strategy that reacts to the balance, conversions with five-year seasoning), which a sheet cannot do with named ranges; test/lifetime.test.js checks each rule by hand. It is shown on the self-serve Lifetime screen, built there from the journey\'s plan, so the workbook has no number for it',
    app: () => null },
  { id: 'M9V', name: 'The lifetime plan against history: the share of past stretches the money lasted', inputs: 'M9U, yearly real returns for stocks and bonds 1871 to 2022 (data/history-returns.json), the stock share', unit: 'pct',
    fns: ['stress.mixOf', 'stress.replay', 'stress.shuffle', 'stress.safeFreedom'],
    fromApp: 'M9U is run once for every starting year in the record, and 1,000 more times on shuffled years, which a sheet cannot do; test/lifetime.test.js checks it against the known 4% rule result',
    app: () => null },
  { id: 'M9P', name: 'The year-by-year projection: months to FI on the full plan', inputs: 'M27 the surplus and the known changes ahead, M34 the one debt plan, M79 the FOO flow (big e, Tax-Free Growth room), M50 the FI number, M02 the return, each income row and its person (W-2, side work and self-employment stop at the stop age, the rest keeps going), M10 SLAM\'s tax function for a raise or a job that stops, the 401(k), HSA and IRA limits by age (limits in the reference data), each account\'s tax type, birth years, Retire by or the FI age and the partner\'s own (PartnerRetireAge), Plan to age, ProjectionRaise, ProjectionCashReturn; batch 56: M9J Social Security from each claim month (ProjectionSocialSecurity), go-go, slow-go and no-go spending (SpendingPhases, off), the FI test net of guaranteed income (ProjectionFiNet, off)', unit: 'months',
    fns: ['projection.EARNED_TYPES', 'projection.WITHDRAW_ORDER', 'projection.bucketOf', 'projection.peopleOf', 'projection.contributionLimit', 'projection.eventsFromProposed', 'projection.project', 'projection.NOT_IN'],
    fromApp: 'the household is walked a month at a time from today to the end of life (each person\'s age, pay that stops, contributions held to the limit for that age and calendar year, each account by tax type, withdrawals once work stops), which a sheet cannot do with named ranges; docs/engines/projection-check/ has it rebuilt by hand in plain formulas for four households. No screen reads it yet: the FI card still shows M53',
    app: c => project(c.doc, c.ref, { now: c.now, m: c.m }).fiMonths,
    parts: [
      { key: 'debtFree', name: 'Debt free (months), from the one debt plan', unit: 'months', fromApp: 'M9P reads the one debt plan (M34) month by month', app: c => project(c.doc, c.ref, { now: c.now, m: c.m }).debtFreeMonths ?? null },
      { key: 'netWorth10', name: 'Net worth at the end of year 10, today\'s dollars', unit: 'money', fromApp: 'M9P: every account, debt and thing at the end of its tenth year', app: c => project(c.doc, c.ref, { now: c.now, m: c.m }).years[9]?.end?.netWorth ?? null },
      { key: 'netWorth30', name: 'Net worth at the end of year 30, today\'s dollars', unit: 'money', fromApp: 'M9P: every account, debt and thing at the end of its thirtieth year', app: c => project(c.doc, c.ref, { now: c.now, m: c.m }).years[29]?.end?.netWorth ?? null },
      { key: 'lastsTo', name: 'Age the money runs out once work stops (blank: it lasts to Plan to age)', unit: 'number', fromApp: 'M9P: the first month after work stops that cash and every account cannot cover', app: c => project(c.doc, c.ref, { now: c.now, m: c.m }).lastsToAge ?? null },
    ] },
  // ---------- Batch 56: Social Security (Phase 5; docs/engines/projection.md "Decumulation"), read by M9P ----------
  { id: 'M9J', name: 'Social Security a month once claimed, today\'s dollars', inputs: 'each person\'s birth year and month, the my Social Security statement number at full retirement age and its level (blank: an estimate from today\'s gross pay, the stop age and the PIA formula with the 2026 bend points), the claim age (blank: full retirement age), the partner\'s PIA for the spousal top-up, Plan to age for the survivor, the trust fund switch (SsTrustCut), the SS_ reference values and the SS_fra table', unit: 'money',
    fns: ['socialsecurity.SS_LEVELS', 'socialsecurity.fullRetirementMonths', 'socialsecurity.piaOf', 'socialsecurity.claimFactor', 'socialsecurity.spousalFactor', 'socialsecurity.estimateRule', 'socialsecurity.aimeFromPay', 'socialsecurity.benefitOf', 'socialsecurity.householdBenefits'],
    fromApp: 'each person\'s benefit month by month (the claim reduction or credits, the spousal top-up from the later of the two claims, a survivor keeping the larger, the trust fund cut by calendar year) is read by the projection (M9P) a month at a time, which named ranges cannot follow; the PIA formula itself is three bands of SS_bend1 and SS_bend2',
    app: c => project(c.doc, c.ref, { now: c.now, m: c.m }).socialSecurity?.lastingMonthly ?? null,
    parts: [
      { key: 'piaMe', name: 'Your benefit at full retirement age, a month (the statement, or the estimate)', unit: 'money', fromApp: 'M9J: the statement number, else the PIA formula on the estimated AIME', app: c => project(c.doc, c.ref, { now: c.now, m: c.m }).socialSecurity?.people?.[0]?.pia ?? null },
      { key: 'atClaimMe', name: 'Your benefit at your claim age, a month', unit: 'money', fromApp: 'M9J: the PIA times the early reduction or the delayed credits for the claim age', app: c => project(c.doc, c.ref, { now: c.now, m: c.m }).socialSecurity?.people?.[0]?.own ?? null },
      { key: 'partner', name: 'Partner\'s benefit at their claim age with any spousal top-up, a month', unit: 'money', fromApp: 'M9J: the partner\'s own benefit plus half your PIA less theirs, reduced for their age', app: c => { const p = project(c.doc, c.ref, { now: c.now, m: c.m }).socialSecurity?.people?.[1]; return p ? p.own + (p.spousal ?? 0) : null; } },
    ] },
  { id: 'M77', name: 'Month close streak', inputs: 'the closed months', unit: 'count', fns: [], // js/month.js closeStreak (outside js/math, with the other month-close math)
    fromApp: 'months closed in a row counted back from last month (this month once closed), one grace month allowed inside the run', app: c => closeStreak(c.doc, c.now).months },
  // ---------- Holidays (the calendar question on About you) ----------
  { id: 'M78', name: 'Holiday dates', inputs: 'the calendar sets ticked on About you (Jewish, Muslim, Christian, Orthodox, US) and Shabbat', unit: 'text',
    fns: ['holidays.HOLIDAY_SETS', 'holidays.holidayById', 'holidays.holidayDates', 'holidays.holidaysOf', 'holidays.nextHoliday', 'holidays.holidayYm', 'holidays.holidayInMonth',
      'holidays.shabbatDays', 'holidays.weekdayDays', 'holidays.holidaysInMonth', 'holidays.WEEKDAYS', 'holidays.SHABBAT_SPEND_DAY'],
    fromApp: 'computed from the Hebrew calendar, the tabular Islamic calendar and the Easter formulas (day-level, no table to refresh); holiday blocks re-date themselves each year',
    app: c => holidaysOf(c.doc.profile?.calendars || {}, c.now.getUTCFullYear()).map(d => `${d.name} ${d.start}`).join('; ') || null },
];

// js/math exports that are not an M formula of their own: how records become formula inputs, account details, and
// result plumbing. Each says why it has no row of its own.
export const SUPPORT = {
  'result.ok': 'wraps a number with its plain-words math', 'result.needs': 'says what a number still needs', 'result.isBlank': 'a blank check',
  'result.missing': 'lists blank inputs', 'result.joinWords': 'joins words for Needs ...', 'result.fmt': 'number formats for the math text',
  'metrics.inputsOf': 'reads the records into formula inputs (the Inputs tabs)', 'metrics.metrics': 'runs every formula for the screens (the Math tab)',
  'metrics.placeOf': 'NY and NYC from the Profile (Profile tab: State, Live in New York City)', 'metrics.ageOf': 'age from birth year (Profile tab: Age worked out)',
  'metrics.keyNumbers': 'the numbers a snapshot keeps', 'metrics.debtHeroOf': 'the debt-free card on Home, from the one debt plan (M34)', 'metrics.firstDebt': 'the first debt of a type, for the demo check',
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
  'portfolio.asksTaxType': 'which account types are asked Pretax or Roth (batch 7, item 5)', 'portfolio.taxTypeFor': 'the tax type an account name already answers (Roth IRA, Traditional IRA)',
  'portfolio.vestedOf': 'inside one account: vested', 'portfolio.hsaFeeCompare': 'inside one account: HSA fees', 'portfolio.link401k': 'Income and the 401(k) fill each other (Income tab: 401(k) % used)',
  // Batch 55: the money-control map, private by design (js/math/control.js), so the workbook leaves it out: no number,
  // and nothing of it may leave this client's own view.
  'control.CONTROL_KEYS': 'the money-control map\'s tap fields (private by design: the workbook leaves the map out)', 'control.ROLES': 'the money-control map: the roles someone else can have on a row',
  'control.peopleOf': 'the money-control map: the household\'s adults, read through one accessor', 'control.controlState': 'the money-control map: the What to set up ticks (program.control)',
  'control.setControl': 'the money-control map: saves a tick', 'control.whoWords': 'the money-control map: the words for who (You, a partner, Someone else, The bank)',
  'control.controlRow': 'the money-control map: one row (who sees, moves and can stop it, and its one calm line); private by design, never in the workbook',
  'control.controlMap': 'the money-control map on Net worth › Money control; private by design, never in the workbook, a partner\'s view or anything shared',
  'control.checklistOf': 'the money-control map: What to set up (an account, a login, statements and a card in your own name)',
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
