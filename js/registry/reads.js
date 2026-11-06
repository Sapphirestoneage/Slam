// SPDX-License-Identifier: AGPL-3.0-only
// Batch 62: the Phase 4 reads as live formulas (ROADMAP "Direction", Nov 6: the workbook is the coach's main tool). Each
// read is a report tab (js/registry/reports.js spreads READS into REPORTS): the steps of its math as rows with plain
// labels, each a formula off the Inputs tabs, the Assumptions tab and the rows above it, with the app's number beside
// it and a Check. Inputs a coach changes on the spot (a raise to test, a cost and its month) are blue input rows with
// the app's default in them. The Math tab's rows for these reads (M9W, M9F, M9H, M9B, M9D) point at the named rows
// here (Lender_dti, Drill_days ...), so the Math tab and the read agree by construction.
//
// A row: { key?, name, f, app?, input?, unit }. f is a formula with named ranges; {row:key} is another row of the same
// read (its named cell). A row with no app() is a step with no number of its own in the app: it has no Check.
// cols: formula columns on the Inputs tabs, as in reports.js ({field}, {@col}, {Kind}, {app:name}).
import { lenderOf } from '../math/lender.js';
import { fireDrillOf, BANK_TYPES, fireDrillState } from '../math/firedrill.js';
import { institutionOf } from '../institutions.js';
import { shiftPnlsOf } from '../math/shiftpnl.js';
import { creditMove } from '../math/cards.js';
import { creditHealth } from '../math/debt.js';
import { CLIFF_COLS, cliffSections } from './reads-cliff.js';
import { bankKeyOf } from '../privacy.js';

const SKIP = '{InMath}="No"';
// Every read's table: the step in plain words, its formula (named), the app's number and the Check.
const COLUMNS = [{ key: 'name', label: 'Step', unit: 'text', width: 90 }, { key: 'f', label: 'Formula', unit: 'row', named: true, width: 18 },
  { key: 'app', label: "The app's value", unit: 'row', width: 18 }, { key: 'check', label: 'Check', check: ['f', 'app'], width: 14 }];
const MONTHS_TO = d => `(YEAR(${d})-YEAR(TODAY()))*12+MONTH(${d})-MONTH(TODAY())`;

// ---------- What a lender sees (M9W, js/math/lender.js) ----------
// Each income row as each reader counts it, a year: a paycheck at its gross (cash tips only when reported, on the W-2),
// self-employment from the returns filed (two averaged, never more than the latest; one return: a landlord only),
// benefits by how long they run, unemployment for a landlord only, rent as typed, a gift not at all.
const LENDER_COLS = [
  { area: 'income', key: 'lendKind', label: 'Lender reads it as', unit: 'text',
    f: `IF(OR(${SKIP},{Kind}<>"Income"),"",IF(OR({Type}="Money from family",{Type}="From partner"),"Gift",IF({Type}="Unemployment","Unemployment",IF(OR({Type}="Benefits",{incomeType}="Benefits"),"Benefit",IF(OR({Type}="Rental",{incomeType}="Rental"),"Rental",IF(OR({Type}="Platform",{Type}="Self-employed",{incomeType}="1099",{incomeType}="Business",{incomeType}="Side hustle",AND({incomeType}="",{Type}="Side hustle")),"Self-employed","Paycheck"))))))` },
  { area: 'income', key: 'lendPace', label: 'Lender: gross a year this year (or take-home x 12)', unit: 'money',
    f: 'IF(OR({@lendKind}="",{@lendKind}="Gift",{@lendKind}="Unemployment"),"",IF({@M13}<>"",{@M13},IF({@M12}="","",{@M12}*12)))' },
  { area: 'income', key: 'lendReturns', label: 'Lender: returns read (0, 1 or 2)', unit: 'number',
    f: 'IF({@lendKind}<>"Self-employed","",IF({returnsFiled}="None",0,IF({returnsFiled}="1",1,IF({returnsFiled}<>"",2,IF(AND({returnLast}<>"",{returnBefore}<>""),2,IF({returnLast}<>"",1,2))))))' },
  { area: 'income', key: 'lendLast', label: 'Lender: net profit on the last return (blank: this year\'s pace)', unit: 'money',
    f: 'IF(N({@lendReturns})<1,"",IF({returnLast}<>"",{returnLast},{@lendPace}))' },
  { area: 'income', key: 'lendBefore', label: 'Lender: net profit on the return before', unit: 'money',
    f: 'IF(N({@lendReturns})<2,"",IF({returnBefore}<>"",{returnBefore},{@lendPace}))' },
  { area: 'income', key: 'lendRuns', label: 'Lender: months the benefit still runs (blank: no end date)', unit: 'months',
    f: `IF(AND({@lendKind}<>"Benefit",{@lendKind}<>"Unemployment"),"",IF({benefitEnd}="","",${MONTHS_TO('{benefitEnd}')}))` },
  { area: 'income', key: 'lendEarned', label: 'Lender: earned a year (before tax, cash tips in)', unit: 'money',
    f: 'IF(OR({@lendKind}="",{@lendKind}="Gift"),"",IF({@lendKind}="Unemployment",IF({amount}="",N({@M12}),{amount}*IFERROR(INDEX(Per_month,MATCH(IF({per}="","week",{per}),Per_name,0)),1))*12,IF(OR({@lendKind}="Benefit",{@lendKind}="Rental"),N({@M12})*12,IF({@lendKind}="Self-employed",N({@lendPace}),N({@lendPace})+MAX(0,N({@grossExtraMo})*12)))))' },
  { area: 'income', key: 'lendMortgage', label: 'Lender: a mortgage lender counts a year', unit: 'money',
    f: 'IF(OR({@lendKind}="",{@lendKind}="Gift",{@lendKind}="Unemployment"),IF({@lendKind}="","",0),IF({@lendKind}="Benefit",IF(OR({@lendRuns}="",N({@lendRuns})>=LenderBenefitYears*12),{@lendEarned},0),IF({@lendKind}="Rental",MAX(0,{@lendEarned}),IF({@lendKind}="Self-employed",IF(AND(N({@lendReturns})>=2,{@lendLast}<>"",{@lendBefore}<>""),MIN(({@lendLast}+{@lendBefore})/2,{@lendLast}),0),N({@lendPace})+IF(AND({@workMode}="Paycheck",{cashReported}="Yes"),MAX(0,N({@grossExtraMo})*12),0)))))' },
  { area: 'income', key: 'lendLandlord', label: 'Lender: a landlord counts a year', unit: 'money',
    f: 'IF(OR({@lendKind}="",{@lendKind}="Gift"),IF({@lendKind}="","",0),IF({@lendKind}="Unemployment",IF(AND({@lendRuns}<>"",N({@lendRuns})>=LenderLeaseMonths),{@lendEarned},0),IF({@lendKind}="Benefit",IF(OR({@lendRuns}="",N({@lendRuns})>=LenderLeaseMonths),{@lendEarned},0),IF({@lendKind}="Self-employed",IF(N({@lendReturns})>=1,N({@lendLast}),0),{@lendMortgage}))))' },
  // The debts a mortgage lender counts a month: the payment on the credit report (a card at its minimum, a student loan
  // with no payment at LenderStudentPct of the balance), a family loan left out, the home loan as the housing payment,
  // a loan on a rental netted against its rent.
  { area: 'debt', key: 'lendHome', label: 'Lender: the home loan (1) or another debt (0)', unit: 'number',
    f: `IF(OR(${SKIP},N({@balUsed})<=0,{Type}="Family or friend"),"",IF(AND({Type}="Mortgage",OR({app:link}="",{app:link}="Home")),1,IF(AND({Type}="Mortgage",COUNTIF(Income_lendKind,"Rental")>0),"",0)))`,
    app: { link: (rec, c) => { const id = rec.linkedTo ?? rec.values?.linkedTo; const a = id ? (c.doc.records || []).find(r => r.id === id) : null; return a ? (a.type === 'Home' ? 'Home' : 'Other') : ''; } } },
  { area: 'debt', key: 'lendPay', label: 'Lender: payment counted a month', unit: 'money',
    f: 'IF({@lendHome}="","",IF({Type}="Credit card",IF({minimum}<>"",{minimum},IF(OR({@balUsed}="",{@aprUsed}=""),N({@payUsed}),MIN({@balUsed},MAX(CardMin_floor,{@balUsed}*CardMin_pct+{@balUsed}*{@aprUsed}/12)))),IF(AND({Type}="Student loan",{@payUsed}=""),{@balUsed}*LenderStudentPct,N({@payUsed}))))' },
];
const lenderSections = c => {
  const L = lenderOf(c.doc, c.ref, { now: c.now, m: c.m });
  return [
    { title: 'Income each one can count, a month (each income row\'s reading is in the Lender columns on the Income tab)', rows: [
      { key: 'earned', name: 'Earned, a month before tax (cash tips in, gifts left out)', unit: 'money', f: 'SUM(Income_lendEarned)/12', app: L.earned },
      { key: 'counted', name: 'A mortgage lender can count, a month', unit: 'money', f: 'MAX(0,SUM(Income_lendMortgage)/12)', app: L.mortgageIncome },
      { key: 'landlord', name: 'A landlord can count, a month', unit: 'money', f: 'MAX(0,SUM(Income_lendLandlord)/12)', app: L.landlordIncome },
      { key: 'gap', name: 'The gap: earned less what a mortgage lender can count', unit: 'money', f: 'MAX(0,{row:earned}-{row:counted})', app: L.gap.month },
    ] },
    { title: 'The mortgage lender', rows: [
      { key: 'housing', name: 'The home payment on the credit report, a month', unit: 'money', f: 'SUMIFS(Debt_lendPay,Debt_lendHome,1)', app: L.debts.housing },
      { key: 'other', name: 'Every other debt payment a lender counts, a month', unit: 'money', f: 'SUMIFS(Debt_lendPay,Debt_lendHome,0)', app: L.debts.other },
      { key: 'dti', name: 'Total debt-to-income: the debt payments over what a lender can count', unit: 'pct', f: 'IF({row:counted}>0,({row:housing}+{row:other})/{row:counted},"")', app: L.mortgage.dti },
      { key: 'maxPay', name: 'Most home payment the usual lines clear (LenderFront to the home, LenderBack in all), a month', unit: 'money', f: 'MAX(0,MIN(LenderFront*{row:counted},LenderBack*{row:counted}-{row:other}))', app: L.mortgage.maxPay },
      { key: 'pi', name: 'Of it, the loan\'s part (less LenderTaxInsShare for taxes and insurance)', unit: 'money', f: '{row:maxPay}*(1-LenderTaxInsShare)' },
      { key: 'loan', name: 'Home loan that payment carries, at LenderMortgageRate over LenderMortgageYears', unit: 'money', f: 'IF({row:pi}<=0,0,IF(LenderMortgageRate=0,{row:pi}*LenderMortgageYears*12,PV(LenderMortgageRate/12,LenderMortgageYears*12,-{row:pi})))', app: L.mortgage.loan },
    ] },
  ];
};

// ---------- Bank fire drill (M9F, js/math/firedrill.js) ----------
// Pick the account that freezes (the input row; the app opens on the account the biggest paycheck lands in). Each bank
// account and card is read at the same bank when both banks are known and equal, or the coach said so on the drill; one
// whose bank is not known yet is read at the same bank (out of reach) in the first reading and at another bank in the
// second (QUESTIONS 388, 389). A payment app is never a bank's. The days: cash you can still reach over the must-pay
// bills a day (a month x 12 / 365), whole days; with a card's room, never more than the cash covers housing and minimums.
const bankOf = (c, rec) => { const i = institutionOf(c.doc, rec); return i ? i.name || bankKeyOf(i.id) : rec.values?.bankKey ?? ''; }; // a private row keeps only its bank key
const DRILLS = new WeakMap(); // one drill per workbook build (the app values of every row read it)
const drillOf = c => { if (!DRILLS.has(c)) DRILLS.set(c, fireDrillOf(c.doc, c.ref, { now: c.now })); return DRILLS.get(c); };
const saidOf = (rec, c) => { const a = drillOf(c).account; if (!a) return ''; const S = fireDrillState(c.doc).sameBank || {};
  const v = S[`${a.id}:${rec.id}`] ?? S[`${rec.id}:${a.id}`]; return v === true ? 'same' : v === false ? 'other' : ''; };
const BANKISH = `OR(${BANK_TYPES.map(t => `{Type}="${t}"`).join(',')})`;
const sameRule = fallback => `IF(AND({@drillBank}<>"",Drill_bank<>""),IF({@drillBank}=Drill_bank,1,0),IF({app:said}="same",1,IF({app:said}="other",0,${fallback})))`;
const MUST_TIERS = ['housing', 'utilities', 'food', 'transport', 'health', 'minimums'];
const tierHit = t => `SUMPRODUCT((FireDrill_tier="${t}")*(((FireDrill_by="Category")*(FireDrill_value={category}))+((FireDrill_by="DRAFTT")*(FireDrill_value={draftt}))+((FireDrill_by="Line word")*(FireDrill_cat={category})*ISNUMBER(SEARCH(FireDrill_value,{name})))))>0`;
const tierFormula = order => `IF({Kind}<>"Budget line","",${order.filter(o => o.categories || o.draftt || o.lines).reduceRight((rest, o) => `IF(${tierHit(o.id)},"${o.id}",${rest})`, `"${order.at(-1)?.id ?? 'rest'}"`)})`;
const DRILL_COLS = [
  { area: 'assets', key: 'drillName', label: 'Fire drill: the account', unit: 'text', f: 'IF(OR({Kind}<>"Account",{group}<>"cash",{Status}="Not for me"),"",IF({name}<>"",{name},{Type}))' },
  { area: 'assets', key: 'drillWhat', label: 'Fire drill: at a bank, or in hand', unit: 'text', f: `IF({@drillName}="","",IF({Type}="Cash on hand","In hand",IF(${BANKISH},"Bank","")))` },
  { area: 'assets', key: 'drillBank', label: 'Fire drill: its bank (from Institutions; blank: not answered)', unit: 'text',
    f: 'IF({@drillWhat}<>"Bank","",IF({app:bank}<>"",{app:bank},""))', app: { bank: (rec, c) => bankOf(c, rec) } },
  { area: 'assets', key: 'drillFrozen', label: 'Fire drill: the account that freezes (1)', unit: 'number', f: 'IF({@drillWhat}<>"Bank","",IF({@drillName}=Drill_account,1,0))' },
  { area: 'assets', key: 'drillSame', label: 'Fire drill: at the same bank, as it stands (not answered: the same)', unit: 'number',
    f: `IF(OR({@drillWhat}<>"Bank",{@drillFrozen}=1),"",IF(OR({Type}="Payment app",Drill_type="Payment app"),0,${sameRule(1)}))`, app: { said: saidOf } },
  { area: 'assets', key: 'drillSame2', label: 'Fire drill: at the same bank, the other reading (not answered: another bank)', unit: 'number',
    f: `IF(OR({@drillWhat}<>"Bank",{@drillFrozen}=1),"",IF(OR({Type}="Payment app",Drill_type="Payment app"),0,${sameRule(0)}))`, app: { said: saidOf } },
  { area: 'assets', key: 'drillReach', label: 'Fire drill: cash you can still reach', unit: 'money', f: 'IF({@drillWhat}="In hand",N({balance}),IF(AND({@drillSame}=0,{purpose}<>"Taxes"),N({balance}),""))' },
  { area: 'assets', key: 'drillReach2', label: 'Fire drill: cash you can still reach, the other reading', unit: 'money', f: 'IF({@drillWhat}="In hand",N({balance}),IF(AND({@drillSame2}=0,{purpose}<>"Taxes"),N({balance}),""))' },
  { area: 'debt', key: 'drillCardBank', label: 'Fire drill: the card\'s bank (blank: not answered)', unit: 'text',
    f: 'IF(OR({Type}<>"Credit card",{Status}="Not for me"),"",IF({app:bank}<>"",{app:bank},""))', app: { bank: (rec, c) => bankOf(c, rec) } },
  { area: 'debt', key: 'drillCardSame', label: 'Fire drill: the card is at the same bank, as it stands (not answered: the same)', unit: 'number',
    f: 'IF(OR({Type}<>"Credit card",{Status}="Not for me"),"",IF(AND({@drillCardBank}<>"",Drill_bank<>""),IF({@drillCardBank}=Drill_bank,1,0),IF({app:said}="same",1,IF({app:said}="other",0,1))))', app: { said: saidOf } },
  { area: 'debt', key: 'drillCardSame2', label: 'Fire drill: the card is at the same bank, the other reading', unit: 'number',
    f: 'IF(OR({Type}<>"Credit card",{Status}="Not for me"),"",IF(AND({@drillCardBank}<>"",Drill_bank<>""),IF({@drillCardBank}=Drill_bank,1,0),IF({app:said}="same",1,0)))', app: { said: saidOf } },
  { area: 'debt', key: 'drillRoom', label: 'Fire drill: card room you can still use', unit: 'money', f: 'IF(OR({@drillCardSame}<>0,{limit}=""),"",MAX(0,{limit}-N({balance})))' },
  { area: 'debt', key: 'drillRoom2', label: 'Fire drill: card room you can still use, the other reading', unit: 'money', f: 'IF(OR({@drillCardSame2}<>0,{limit}=""),"",MAX(0,{limit}-N({balance})))' },
  { area: 'debt', key: 'drillMin', label: 'Fire drill: the minimum it must get this month', unit: 'money',
    f: 'IF(OR({@balUsed}="",{Type}="Mortgage",{Type}="Car loan"),"",IF(OR({payChoice}="In full",N({@balUsed})<=0),0,IF({Type}="Credit card",IF({@aprUsed}="",N({@payUsed}),MIN({@balUsed},MAX(CardMin_floor,{@balUsed}*CardMin_pct+{@balUsed}*{@aprUsed}/12))),N({@payUsed}))))' },
  { area: 'spending', key: 'drillTier', label: 'Fire drill: the group of bills it is in', unit: 'text', f: (rec, c) => tierFormula(c.ref.fireDrill?.order || []) },
  { area: 'spending', key: 'drillMust', label: 'Fire drill: a must-pay line (1)', unit: 'number',
    f: `IF(AND({Kind}="Budget line",{InMath}="Yes",{amount}<>"",{Status}<>"Not for me",OR(${MUST_TIERS.map(t => `{@drillTier}="${t}"`).join(',')},{@fat}=1)),1,0)` },
];
const drillSections = c => {
  const D = drillOf(c);
  const acct = D.account;
  const B = acct && D.pending?.length ? fireDrillOf(c.doc, c.ref, { now: c.now, account: acct.id, other: D.pending.map(p => p.id) }) : D;
  return [
    { title: 'The account that freezes', rows: [
      { key: 'account', name: 'The account (type its name as on the Assets tab; SLAM opens on the one the biggest paycheck lands in)', unit: 'text', input: true, value: acct?.name ?? null },
      { key: 'type', name: 'Its type', unit: 'text', f: 'IFERROR(INDEX(Assets_Type,MATCH(Drill_account,Assets_drillName,0)),"")' },
      { key: 'bank', name: 'Its bank (blank: not answered on Institutions)', unit: 'text', f: 'IFERROR(INDEX(Assets_drillBank,MATCH(Drill_account,Assets_drillName,0)),"")' },
      { key: 'found', name: 'A bank account by that name (1; none: nothing to drill)', unit: 'number', f: 'IF(Drill_account="",0,IF(COUNTIFS(Assets_drillName,Drill_account,Assets_drillWhat,"Bank")>0,1,0))', app: acct ? 1 : 0 },
    ] },
    { title: 'Out of reach if it froze today (as it stands: an account with no bank answered is read at the same bank)', rows: [
      { key: 'outBalance', name: 'Its balance', unit: 'money', f: 'SUMIFS(Assets_balance,Assets_drillFrozen,1)', app: acct ? D.unreachable.balance : undefined },
      { key: 'outSame', name: 'Accounts at the same bank', unit: 'money', f: 'SUMIFS(Assets_balance,Assets_drillSame,1)', app: acct ? D.unreachable.sameBankTotal : undefined },
      { key: 'paychecks', name: 'Paychecks that land there in the next FireDrillDays days (dated on the calendar in SLAM)', unit: 'money', fromApp: true, app: acct ? D.unreachable.paychecks : null },
      { key: 'outOfReach', name: 'Out of reach', unit: 'money', f: 'IF({row:found}<>1,"",{row:outBalance}+{row:outSame}+N({row:paychecks}))', app: acct ? D.unreachable.total : null },
    ] },
    { title: 'What you can still reach', rows: [
      { key: 'reach', name: 'Cash at other banks and cash at home (tax money set aside left out)', unit: 'money', f: 'SUM(Assets_drillReach)', app: acct ? D.reachable.cash : undefined },
      { key: 'room', name: 'Room on cards at other banks (a card with no limit typed has none counted)', unit: 'money', f: 'SUM(Debt_drillRoom)', app: acct ? D.reachable.cardRoom : undefined },
    ] },
    { title: 'Must-pay bills a month', rows: [
      { key: 'source', name: 'Read from', unit: 'text', f: 'IF(OR(Math_M27_gut="",AND(Set_spendingSource="lines",Math_M27_lines<>"")),"Budget lines","The gut number")' },
      { key: 'lines', name: 'Must-pay Budget lines (housing, utilities and phone, food, getting to work and childcare, health; the Fire drill columns on the Budget tab)', unit: 'money', f: 'SUMIFS(Spend_M21,Spend_drillMust,1)' },
      { key: 'linesHousing', name: 'Of them, housing', unit: 'money', f: 'SUMIFS(Spend_M21,Spend_drillMust,1,Spend_drillTier,"housing")' },
      { key: 'minimums', name: 'The minimum on every debt but the mortgage and car', unit: 'money', f: 'SUM(Debt_drillMin)', app: D.must?.minimums ?? undefined },
      { key: 'homeLoan', name: 'Mortgage payments', unit: 'money', f: 'SUMIFS(Debt_payOut,Debt_Type,"Mortgage")' },
      { key: 'carLoan', name: 'Car loan payments', unit: 'money', f: 'SUMIFS(Debt_payOut,Debt_Type,"Car loan")' },
      { key: 'holds', name: 'The gut number holds the debt payments', unit: 'text', f: 'IF(AND({row:source}="The gut number",N(Math_M27_debtOut)=0,COUNTIF(Debt_payOut,">0")>0),"Yes","No")' },
      { key: 'otherPay', name: 'Debt payments in the gut number that come out (their minimums go back in)', unit: 'money', f: 'IF({row:holds}="Yes",SUMIFS(Debt_payOut,Debt_Type,"<>Mortgage",Debt_Type,"<>Car loan"),0)' },
      { key: 'mustPay', name: 'Must-pay bills a month', unit: 'money', f: 'IF({row:found}<>1,"",IF({row:source}="Budget lines",{row:lines}+{row:minimums}+{row:homeLoan}+{row:carLoan},IF(Math_M27_gut="","",MAX(0,Math_M27_gut-{row:otherPay})+IF({row:holds}="Yes",0,{row:homeLoan}+{row:carLoan})+{row:minimums})))', app: D.must?.monthly ?? null },
      { key: 'fixed', name: 'Of it, what a card cannot pay: housing and the minimums', unit: 'money', f: '{row:linesHousing}+{row:homeLoan}+{row:minimums}', app: D.must ? D.must.housing + D.must.minimums : undefined },
      { key: 'perDay', name: 'A day (x 12 / 365)', unit: 'money', f: 'IF({row:mustPay}="","",{row:mustPay}*12/365)' },
    ] },
    { title: 'Days covered', rows: [
      { key: 'days', name: 'Days the cash you can still reach covers the must-pay bills (whole days)', unit: 'number', f: 'IF({row:found}<>1,"",IF(N({row:mustPay})<=0,"",MAX(0,ROUNDDOWN({row:reach}/{row:perDay},0))))', app: D.cover?.cash ?? null },
      { key: 'withCard', name: 'Days with the card room too (never past what the cash covers of housing and the minimums)', unit: 'number',
        f: 'IF({row:found}<>1,"",IF(N({row:mustPay})<=0,"",MAX(0,ROUNDDOWN(IF({row:fixed}>0,MIN(({row:reach}+{row:room})/{row:perDay},{row:reach}/({row:fixed}*12/365)),({row:reach}+{row:room})/{row:perDay}),0))))', app: D.cover?.withCard ?? null },
    ] },
    { title: 'The other reading: every account and card with no bank answered read as at another bank', rows: [
      { key: 'outSame2', name: 'Accounts at the same bank', unit: 'money', f: 'SUMIFS(Assets_balance,Assets_drillSame2,1)', app: acct ? B.unreachable.sameBankTotal : undefined },
      { key: 'paychecks2', name: 'Paychecks that land there in the window (dated on the calendar in SLAM)', unit: 'money', fromApp: true, app: acct ? B.unreachable.paychecks : null },
      { key: 'outOfReach2', name: 'Out of reach', unit: 'money', f: 'IF({row:found}<>1,"",{row:outBalance}+{row:outSame2}+N({row:paychecks2}))', app: acct ? B.unreachable.total : null },
      { key: 'reach2', name: 'Cash you can still reach', unit: 'money', f: 'SUM(Assets_drillReach2)', app: acct ? B.reachable.cash : undefined },
      { key: 'room2', name: 'Card room you can still use', unit: 'money', f: 'SUM(Debt_drillRoom2)', app: acct ? B.reachable.cardRoom : undefined },
      { key: 'days2', name: 'Days covered', unit: 'number', f: 'IF({row:found}<>1,"",IF(N({row:mustPay})<=0,"",MAX(0,ROUNDDOWN({row:reach2}/{row:perDay},0))))', app: B.cover?.cash ?? null },
      { key: 'withCard2', name: 'Days with the card room too', unit: 'number',
        f: 'IF({row:found}<>1,"",IF(N({row:mustPay})<=0,"",MAX(0,ROUNDDOWN(IF({row:fixed}>0,MIN(({row:reach2}+{row:room2})/{row:perDay},{row:reach2}/({row:fixed}*12/365)),({row:reach2}+{row:room2})/{row:perDay}),0))))', app: B.cover?.withCard ?? null },
    ] },
  ];
};

// ---------- Shift P&L (M9H, js/math/shiftpnl.js) ----------
// Each shift row (shifts a week and a take-home) as one shift: what comes in, the fee, the tip-out and the tax down to
// the row's own take-home a shift, then getting there, childcare and gear; over every hour around the shift.
const PER = '{@shiftsMo}';
const SHIFT_COLS = [
  { area: 'income', key: 'shiftOn', label: 'Shift P&L: a shift row (1)', unit: 'number', f: 'IF(AND(N({@shiftsMo})>0,{@M12}<>"",{app:folded}<>"Yes"),1,"")', app: { folded: rec => (rec.folded ? 'Yes' : '') } },
  { area: 'income', key: 'shiftIn', label: 'Shift P&L: gross a shift (pay, tips; a paycheck before tax)', unit: 'money',
    f: `IF({@shiftOn}<>1,"",IF({@workMode}="Paycheck",N({@M13})/12+N({@cashMo}),N({@payMo})+N({@cardMo})+N({@cashMo}))/${PER})` },
  { area: 'income', key: 'shiftTakeHome', label: 'Shift P&L: take-home a shift (the row\'s own, after the fee, tip-out and tax)', unit: 'money', f: `IF({@shiftOn}<>1,"",{@M12}/${PER})` },
  { area: 'income', key: 'shiftTax', label: 'Shift P&L: tax a shift (gross less the fee, tip-out and take-home)', unit: 'money', f: `IF({@shiftOn}<>1,"",{@shiftIn}-N({@feeMo})/${PER}-N({@tipOutMo})/${PER}-{@shiftTakeHome})` },
  { area: 'income', key: 'shiftTravel', label: 'Shift P&L: getting there a shift', unit: 'money',
    f: 'IF({@shiftOn}<>1,"",IF({travelBy}="Drive",IF({milesShift}="",0,{milesShift}*MileageRate),IF(OR({travelBy}="Ride",{travelBy}="Transit"),IF({travelCost}="",0,{travelCost}*IF({travelWays}="",2,{travelWays})),0)))' },
  { area: 'income', key: 'shiftCare', label: 'Shift P&L: childcare a shift', unit: 'money', f: 'IF({@shiftOn}<>1,"",IF(OR({sitterHours}="",{sitterRate}=""),0,{sitterHours}*{sitterRate}))' },
  { area: 'income', key: 'shiftGear', label: 'Shift P&L: outfits and gear a shift', unit: 'money', f: 'IF({@shiftOn}<>1,"",IF(OR({gearCost}="",N({gearShifts})=0),0,{gearCost}/{gearShifts}))' },
  { area: 'income', key: 'shiftReal', label: 'Shift P&L: what a shift leaves you', unit: 'money', f: 'IF({@shiftOn}<>1,"",{@shiftTakeHome}-{@shiftTravel}-{@shiftCare}-{@shiftGear})' },
  { area: 'income', key: 'shiftHours', label: 'Shift P&L: hours a shift takes (getting ready, travel, the shift, winding down)', unit: 'number',
    f: 'IF(OR({@shiftOn}<>1,{hoursShift}=""),"",{hoursShift}+N({prepHours})+N({travelHours})+N({windDownHours}))' },
  { area: 'income', key: 'shiftHourly', label: 'Shift P&L: real hourly', unit: 'money', f: 'IF(OR({@shiftHours}="",N({@shiftHours})=0),"",{@shiftReal}/{@shiftHours})' },
];
const shiftSections = c => {
  const P = shiftPnlsOf(c.m, { ref: c.ref });
  const best = P.rows.find(r => r.realHourly != null) ?? null;
  const at = (col, id) => `INDEX(Income_${col},MATCH("${String(id).replace(/"/g, '""')}",Income_Id,0))`;
  return [
    ...P.rows.map(r => ({ title: `${r.name}: one shift (the Shift P&L columns on the Income tab)`, rows: [
      { name: 'Gross a shift', unit: 'money', f: at('shiftIn', r.id), app: r.gross },
      { name: r.taxWord, unit: 'money', f: at('shiftTax', r.id), app: r.tax },
      { name: 'Take-home a shift', unit: 'money', f: at('shiftTakeHome', r.id), app: r.takeHome },
      { name: 'Getting there, childcare, outfits and gear a shift', unit: 'money', f: `${at('shiftTravel', r.id)}+${at('shiftCare', r.id)}+${at('shiftGear', r.id)}`, app: r.costs.total },
      { name: 'What the shift leaves you', unit: 'money', f: at('shiftReal', r.id), app: r.real },
      { name: 'Hours it takes', unit: 'number', f: at('shiftHours', r.id), app: r.hours.total },
      { name: 'Real hourly', unit: 'money', f: at('shiftHourly', r.id), app: r.realHourly },
    ] })),
    { title: 'The shift that pays most per real hour', rows: [
      { key: 'hourly', name: 'Real hourly', unit: 'money', f: 'IF(COUNT(Income_shiftHourly)=0,"",MAX(Income_shiftHourly))', app: best?.realHourly ?? null },
      { key: 'real', name: 'What that shift leaves you, a shift (the first shift row when none has its hours)', unit: 'money',
        f: 'IF({row:hourly}<>"",INDEX(Income_shiftReal,MATCH({row:hourly},Income_shiftHourly,0)),IFERROR(INDEX(Income_shiftReal,MATCH(1,Income_shiftOn,0)),""))', app: (best ?? P.rows[0])?.real ?? null },
    ] },
  ];
};

// ---------- What would move the credit score most (M9D, js/math/cards.js creditMove) ----------
// One line in FICO's order of weight: on time (a late payment, or autopay off on a card), utilization over UtilHigh,
// then over UtilBest, hard inquiries at InquiriesMany, the oldest card under 2 years; with neither a score nor a limit,
// start there; else keep going.
const LIVE_CARD = 'Debt_Type,"Credit card",Debt_InMath,"<>No"';
const CREDIT_COLS = [
  { area: 'debt', key: 'creditAge', label: 'Credit: months since the card was opened', unit: 'months',
    f: `IF(OR({Type}<>"Credit card",${SKIP},NOT(ISNUMBER({opened}))),"",MAX(0,(YEAR(TODAY())-YEAR({opened}))*12+MONTH(TODAY())-MONTH({opened})))` },
];
const MOVE_WORDS = {
  onTime: '"Paying on time moves it most (35% of a FICO score): autopay at least the minimum on every card."',
  util: '"Paying the cards down by about "&TEXT(MAX(0,Credit_owed-UtilHigh*Credit_limit),"$#,##0")&", to under "&TEXT(UtilHigh,"0%")&" of the limits, moves it most (30% of the score)."',
  utilBest: '"Paying about "&TEXT(MAX(0,Credit_owed-UtilBest*Credit_limit),"$#,##0")&" more off before the statements close, to under "&TEXT(UtilBest,"0%")&" of the limits, helps most."',
  inquiries: '"Holding off on new applications helps most: each hard inquiry fades over a year and drops off after 2."',
  time: '"Time moves it most now: keep the oldest card open and used a little."',
  start: '"Start with the score (free in the card app or Credit Karma) and each card\'s limit."',
  keep: '"Keep doing what works: on time, low balances, no new applications."',
};
const creditSections = c => {
  const cards = c.live.filter(r => r.kind === 'debt' && r.type === 'Credit card');
  const cr = c.doc.profile?.credit || {};
  const H = creditHealth(cards.map(r => ({ id: r.id, balance: r.values.balance, limit: r.values.limit, opened: r.values.opened })), { now: c.now });
  const M = creditMove({ score: cr.score ?? null, overall: H.overall, cards: cards.map(r => ({ balance: r.values.balance ?? 0, limit: r.values.limit ?? 0 })), latePayments: cr.latePayments ?? null, autopayOff: cards.filter(r => r.values.autopay === 'Off').length, inquiries: cr.inquiries ?? null, oldestMonths: H.oldestMonths });
  return [
    { title: 'What the score reads (Your credit on About you, each card on the Debt tab)', rows: [
      { key: 'late', name: 'A late payment in the last 2 years', unit: 'text', f: 'Profile_credit_latePayments' },
      { key: 'autopayOff', name: 'Cards with autopay off', unit: 'number', f: `COUNTIFS(${LIVE_CARD},Debt_autopay,"Off")`, app: cards.filter(r => r.values.autopay === 'Off').length },
      { key: 'owed', name: 'Card balances', unit: 'money', f: `SUMIFS(Debt_balance,${LIVE_CARD})`, app: M.owed },
      { key: 'limit', name: 'Card limits', unit: 'money', f: `SUMIFS(Debt_limit,${LIVE_CARD})`, app: M.limit },
      { key: 'util', name: 'Utilization (the cards with a limit)', unit: 'pct', f: `IF(SUMIFS(Debt_limit,${LIVE_CARD},Debt_limit,">0")=0,"",SUMIFS(Debt_balance,${LIVE_CARD},Debt_limit,">0")/SUMIFS(Debt_limit,${LIVE_CARD},Debt_limit,">0"))`, app: H.overall },
      { key: 'inquiries', name: 'Hard inquiries in 2 years', unit: 'number', f: 'Profile_credit_inquiries' },
      { key: 'oldest', name: 'The oldest card, months', unit: 'months', f: 'IF(COUNT(Debt_creditAge)=0,"",MAX(Debt_creditAge))', app: H.oldestMonths },
      { key: 'score', name: 'The score', unit: 'number', f: 'Profile_credit_score' },
    ] },
    { title: 'What would move it most', rows: [
      { key: 'move', name: 'The move (onTime, util, utilBest, inquiries, time, start or keep)', unit: 'text',
        f: 'IF(OR({row:late}="Yes",{row:autopayOff}>0),"onTime",IF(AND({row:util}<>"",N({row:util})>UtilHigh),"util",IF(AND({row:util}<>"",N({row:util})>UtilBest),"utilBest",IF(AND({row:inquiries}<>"",N({row:inquiries})>=InquiriesMany),"inquiries",IF(AND({row:oldest}<>"",N({row:oldest})<24),"time",IF(AND({row:score}="",{row:util}=""),"start","keep"))))))', app: M.key },
      { key: 'words', name: 'In words', unit: 'text', f: Object.entries(MOVE_WORDS).slice(0, -1).reduceRight((rest, [k, w]) => `IF({row:move}="${k}",${w},${rest})`, MOVE_WORDS.keep) },
    ] },
  ];
};

export const READS = [
  { tab: 'Lender', prefix: 'Lender', read: true, math: 'M9W',
    about: 'What a lender sees (M9W): what a mortgage lender and a landlord can count of what you earn, the debts a lender counts, and the home loan the usual lines clear. Every row is a live formula; the rates are on the Assumptions tab.',
    cols: LENDER_COLS, columns: COLUMNS, sections: lenderSections },
  { tab: 'Fire drill', prefix: 'Drill', read: true, math: 'M9F',
    about: 'The bank fire drill (M9F): if one account froze today, what is out of reach, what you can still reach, and how many days it covers the must-pay bills. Type the account in the blue box; the Fire drill columns on the Assets, Debt and Budget tabs read each row.',
    cols: DRILL_COLS, columns: COLUMNS, sections: drillSections },
  { tab: 'Shift P&L', prefix: 'Shift', read: true, math: 'M9H',
    about: 'Shift P&L (M9H): what each shift really pays after getting there, childcare and gear, over every hour it takes. The shift\'s own boxes are on the Income tab; each step is a live formula there (the Shift P&L columns).',
    cols: SHIFT_COLS, columns: COLUMNS, sections: shiftSections },
  { tab: 'Credit score', prefix: 'Credit', read: true, math: 'M9D',
    about: 'What would move the credit score most (M9D): one line, in FICO\'s order of weight. The numbers come from Your credit on About you and each card on the Debt tab.',
    cols: CREDIT_COLS, columns: COLUMNS, sections: creditSections },
  { tab: 'Benefits cliff', prefix: 'Cliff', read: true, math: 'M9B',
    about: 'The benefits cliff (M9B): each benefit line a raise could cross, what each program is worth today, and what a raise really leaves you after tax and the benefits it changes. Type the raise in the blue box; your statuses are on About you (Your benefits now). The lines and tables are on the Assumptions tab.',
    cols: CLIFF_COLS, columns: COLUMNS, sections: cliffSections },
];
