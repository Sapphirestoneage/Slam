// SPDX-License-Identifier: AGPL-3.0-only
// Batch 62: the benefits cliff (M9B, js/math/cliff.js) as live formulas, one read of js/registry/reads.js. Every line is
// a multiple of the poverty line for the household's size, or a table of its own, all on the Assumptions tab (Poverty_*,
// SNAP_*, Medicaid_*, Medicaid_states, NY_*, ACA_*, EITC_2026, CCAP_*, CTC_*). Each program is worked out at today's
// income and again with the raise in the blue box (a W-2 raise on the client's own return: the household's tax is
// worked out again on it, Social Security to the wage base, Medicare, New York and New York City, the tips deduction and
// the Child Tax Credit). The break-even raise is a search over every $100 step, so it stays the app's number.
import { cliffOf, CLIFF_PROGRAMS } from '../math/cliff.js';

const EPS = '0.000000001';
const KIDS = 6; // children read one by one (ages); more than six are counted, their ages read as the sixth's default
// A by-size lookup on a table with a size column: the row for the size, past the last row the last plus each extra.
const bySize = (tbl, col, each) => `IF({row:size}<=COUNT(${tbl}_size),INDEX(${tbl}_${col},{row:size}),INDEX(${tbl}_${col},COUNT(${tbl}_size))+${each}*({row:size}-COUNT(${tbl}_size)))`;
const bracket = (t, table) => `SUMPRODUCT((${t}>${table}_over)*(${t}-${table}_over)*${table}_step)`;
const byFiling = (x, k) => `IF(Taxes_filing="Married jointly",${k('joint', x)},IF(Taxes_filing="Head of household",${k('head', x)},${k('single', x)}))`;

export const CLIFF_COLS = [
  // The children on About you › People: each dependent who is a child (role Child or not set), numbered in order.
  { area: 'people', key: 'pplChild', label: 'Benefits cliff: a child (1)', unit: 'number', f: 'IF(AND({kind}="Dependent",OR({role}="",{role}="Child")),1,0)' },
  { area: 'people', key: 'pplRow', label: 'Benefits cliff: row', unit: 'number', f: 'ROW()' },
  { area: 'people', key: 'pplChildNo', label: 'Benefits cliff: child number', unit: 'number', f: 'IF({@pplChild}=1,COUNTIFS(People_pplChild,1,People_pplRow,"<="&{@pplRow}),"")' },
];

// Each program at one income: s the suffix (0 today, 1 with the raise), G gross, E earned, M MAGI (formulas).
function programRows(s, G, E, M, A) {
  const r = k => `{row:${k}${s}}`;
  const kidRows = Array.from({ length: KIDS }, (_, i) => i + 1);
  const kidCost = i => `IF(${i}>{row:kids},0,IF(${r('ratio')}<=IF(IF({row:age${i}}="",5,{row:age${i}})<1,NY_infantMedicaid,NY_kidsMedicaid)+${EPS},0,IF(${r('ratio')}<=NY_chpFree+${EPS},0,IF(${r('chpBand')}>COUNT(NY_chpBands_upTo),0,INDEX(NY_chpBands_premium,${r('chpBand')})*12))))`;
  const kidUnpriced = i => `IF(AND(${i}<={row:kids},${r('ratio')}>IF(IF({row:age${i}}="",5,{row:age${i}})<1,NY_infantMedicaid,NY_kidsMedicaid)+${EPS},${r('ratio')}>NY_chpFree+${EPS},${r('chpBand')}>COUNT(NY_chpBands_upTo)),1,0)`;
  const when = s === '0' ? 'today' : 'with the raise';
  const nEitc = 'MIN(3,{row:kids})+1';
  return [
    { key: `gross${s}`, name: `Gross a year, ${when}`, unit: 'money', f: G },
    { key: `earned${s}`, name: `Earned a year, ${when}`, unit: 'money', f: E },
    { key: `magi${s}`, name: `MAGI a year (gross less pre-tax money and half the self-employment tax), ${when}`, unit: 'money', f: M },
    { key: `snapLine${s}`, name: `SNAP: the gross line a month, ${when}`, unit: 'money',
      f: `IF(AND({row:ny}=1,OR({row:care}=1,{row:elderly}=1)),{row:fpl}/12*SNAP_nyCare,IF(AND({row:ny}=1,${r('earned')}>0),{row:fpl}/12*SNAP_nyEarned,${bySize('SNAP_limits', 'gross', 'SNAP_grossEach')}))` },
    { key: `snapAdj${s}`, name: `SNAP: income a month less 20% of earnings and the standard deduction, ${when}`, unit: 'money', f: `MAX(0,${r('gross')}/12-SNAP_earnedShare*${r('earned')}/12-${bySize('SNAP_limits', 'deduction', 0)})` },
    { key: `snapNet${s}`, name: `SNAP: net income a month (less shelter costs over half of it, capped unless 60 or older), ${when}`, unit: 'money',
      f: `MAX(0,${r('snapAdj')}-IF({row:elderly}=1,MAX(0,{row:shelter}-SNAP_shelterShare*${r('snapAdj')}),MIN(MAX(0,{row:shelter}-SNAP_shelterShare*${r('snapAdj')}),SNAP_shelterCap)))` },
    { key: `snapOk${s}`, name: `SNAP: under the line (1), ${when}`, unit: 'number',
      f: `IF(AND(${r('gross')}/12<=${r('snapLine')}+${EPS},OR({row:ny}=1,${r('snapNet')}<=${bySize('SNAP_limits', 'net', 'SNAP_netEach')}+${EPS})),1,0)` },
    { key: `snap${s}`, name: `SNAP a month, ${when} (the most for the size less 30% of net income)`, unit: 'money', ...(A ? { app: A.snap } : {}),
      f: `IF(${r('snapOk')}=0,0,IF({row:size}<=SNAP_minimumUpTo,MAX(SNAP_minimum,MAX(0,INT(${bySize('SNAP_limits', 'most', 'SNAP_allotEach')}-ROUNDUP(SNAP_benefitShare*${r('snapNet')},0)))),MAX(0,INT(${bySize('SNAP_limits', 'most', 'SNAP_allotEach')}-ROUNDUP(SNAP_benefitShare*${r('snapNet')},0)))))` },
    { key: `ratio${s}`, name: `MAGI as a share of the poverty line, ${when}`, unit: 'pct', f: `${r('magi')}/{row:fpl}` },
    { key: `on${s}`, name: `Health coverage the income puts the adults on, ${when}`, unit: 'text',
      f: `IF(AND({row:expanded}=1,${r('ratio')}<=Medicaid_adults+${EPS}),"medicaid",IF(AND({row:ny}=1,${r('ratio')}<=NY_essential+${EPS}),"essential",IF(${r('ratio')}<ACA_floor,"gap",IF(${r('ratio')}>ACA_cliff+${EPS},"full","aca"))))` },
    { key: `band${s}`, name: `Marketplace: the band of the share-of-income table, ${when}`, unit: 'number', f: `MIN(COUNT(ACA_applicable_upTo),IFERROR(MATCH(${r('ratio')},ACA_applicable_upTo,1),0)+1)` },
    { key: `pct${s}`, name: `Marketplace: the share of income paid for the benchmark plan, ${when}`, unit: 'pct',
      f: `INDEX(ACA_applicable_from,${r('band')})+(INDEX(ACA_applicable_to,${r('band')})-INDEX(ACA_applicable_from,${r('band')}))*MIN(1,MAX(0,(${r('ratio')}-IF(${r('band')}=1,0,INDEX(ACA_applicable_upTo,${r('band')}-1)))/(INDEX(ACA_applicable_upTo,${r('band')})-IF(${r('band')}=1,0,INDEX(ACA_applicable_upTo,${r('band')}-1)))))` },
    { key: `cost${s}`, name: `Health coverage the adults pay a year, ${when}`, unit: 'money',
      f: `IF(${r('on')}="medicaid",0,IF(${r('on')}="essential",NY_essentialPremium*12*{row:adults},IF(${r('on')}="aca",MIN({row:bench},${r('pct')}*${r('magi')}),{row:bench})))` },
    { key: `help${s}`, name: `Health coverage help a year, ${when} (the benchmark plan less what the adults pay)`, unit: 'money', ...(A ? { app: A.help } : {}),
      f: `IF(OR(${r('on')}="medicaid",${r('on')}="essential"),{row:bench},IF(${r('on')}="aca",{row:bench}-${r('cost')},0))` },
    { key: `chpBand${s}`, name: `Child Health Plus: the premium band, ${when}`, unit: 'number', f: `COUNTIF(NY_chpBands_upTo,"<"&(${r('ratio')}-${EPS}))+1` },
    { key: `kidsUnpriced${s}`, name: `Children's coverage: children at full price (not priced), ${when}`, unit: 'number', f: `IF(OR({row:ny}=0,{row:kids}=0),0,${kidRows.map(kidUnpriced).join('+')})` },
    { key: `kidsCost${s}`, name: `Children's coverage a year, ${when} (blank: not New York or no children; text: full price)`, unit: 'money',
      f: `IF(OR({row:ny}=0,{row:kids}=0),"",IF(${r('kidsUnpriced')}>0,"Full price",${kidRows.map(kidCost).join('+')}))` },
    { key: `eitc${s}`, name: `EITC a year, ${when} (federal, and New York's share in New York)`, unit: 'money', ...(A ? { app: A.eitc } : {}),
      f: `IF(OR(AND(MIN(3,{row:kids})=0,{row:age}<>"",OR(N({row:age})<EITC_ageMin,N({row:age})>EITC_ageMax)),${r('earned')}<=0),0,MAX(0,MIN(INDEX(EITC_2026_max,${nEitc}),${r('earned')}*INDEX(EITC_2026_max,${nEitc})/INDEX(EITC_2026_earned,${nEitc}))-MAX(0,MAX(${r('earned')},${r('magi')})-{row:eitcFrom})*INDEX(EITC_2026_max,${nEitc})/({row:eitcEnd}-{row:eitcFrom}))*(1+{row:ny}*EITC_nyShare))` },
    { key: `ccapOk${s}`, name: `Child care help: under the line (1), ${when} (blank: not New York or no child under 13)`, unit: 'number', f: `IF(OR({row:ny}=0,{row:careKids}=0),"",IF(${r('gross')}>{row:ccapLimit}+0.5,0,1))` },
    { key: `ccap${s}`, name: `Child care help: the family share a year, ${when} (1% over the poverty line, weekly, rounded down to the half dollar)`, unit: 'money', ...(A ? { app: A.ccap } : {}),
      f: `IF(${r('ccapOk')}<>1,"",INT(CCAP_shareRate*MAX(0,${r('gross')}-{row:fpl})/52/CCAP_round)*CCAP_round*52)` },
  ];
}

// The household's tax on the client's return, today and with the raise.
function taxRows(year) {
  const tipsDed = x => `IF(OR(Taxes_filing="Married separately",${year}<Tips_firstYear,${year}>Tips_lastYear,{row:tipsQ}=0),0,MAX(0,MIN(Tips_cap,{row:tipsQ})-MAX(0,${x}-IF(Taxes_joint="Yes",Tips_phaseJoint,Tips_phaseSingle))*Tips_phaseStep/1000))`;
  const fed = x => byFiling(`MAX(0,${x}-IF(Taxes_joint="Yes",StdDed_joint,IF(Taxes_filing="Head of household",StdDed_head,StdDed_single))-${tipsDed(x)})`, (k, t) => bracket(t, `Fed_${k}`));
  const st = x => `IF(Profile_state<>"NY",0,${byFiling(x, (k, v) => `${bracket(`MAX(0,${v}-NY_std_${k})`, `NY_${k}`)}+IF(Profile_nyc="Yes",${bracket(`MAX(0,${v}-NY_std_${k})`, `NYC_${k}`)},0)`)})`;
  const ctc = (u, earned, tax) => `IF(OR({row:hasReturn}=0,{row:ctcKids}+{row:ctcOthers}=0),"",MIN(MAX(0,{row:ctcKids}*CTC_perChild+{row:ctcOthers}*CTC_other-ROUNDUP(MAX(0,${u}-IF(Taxes_joint="Yes",CTC_phaseJoint,CTC_phaseSingle))/1000,0)*CTC_phaseStep),MAX(0,${tax}))+MAX(0,MIN(MAX(0,{row:ctcKids}*CTC_perChild+{row:ctcOthers}*CTC_other-ROUNDUP(MAX(0,${u}-IF(Taxes_joint="Yes",CTC_phaseJoint,CTC_phaseSingle))/1000,0)*CTC_phaseStep)-MIN(MAX(0,{row:ctcKids}*CTC_perChild+{row:ctcOthers}*CTC_other-ROUNDUP(MAX(0,${u}-IF(Taxes_joint="Yes",CTC_phaseJoint,CTC_phaseSingle))/1000,0)*CTC_phaseStep),MAX(0,${tax})),{row:ctcKids}*CTC_refundMax,CTC_refundRate*MAX(0,${earned}-CTC_earnedFloor))))`;
  return [
    { key: 'unit', name: 'The client\'s return', unit: 'text', f: 'IF(Taxes_joint="Yes","Household","Me")' },
    { key: 'hasReturn', name: 'Income rows on it', unit: 'number', f: 'COUNTIFS(Income_taxUnit,{row:unit})' },
    { key: 'wages', name: 'The client\'s wages for Social Security a year (every row but self-employment)', unit: 'money', f: 'SUMIFS(Income_ficaBase,Income_taxPerson,"Me",Income_taxType,"<>1099")' },
    { key: 'self', name: 'The client\'s self-employment for Social Security a year', unit: 'money', f: 'SUMIFS(Income_ficaBase,Income_taxPerson,"Me",Income_taxType,"1099")' },
    { key: 'seSS0', name: 'Social Security on the self-employment, today (twice the rate, to the wage base after the wages)', unit: 'money', f: '(MIN({row:wages}+{row:self},SS_wageBase)-MIN({row:wages},SS_wageBase))*2*SS_rate' },
    { key: 'seSS1', name: 'The same with the raise on the wages', unit: 'money', f: '(MIN({row:wages}+{row:raise}+{row:self},SS_wageBase)-MIN({row:wages}+{row:raise},SS_wageBase))*2*SS_rate' },
    { key: 'own0', name: 'Income on the return before the standard deduction, today', unit: 'money', f: 'SUMIFS(Income_own,Income_taxUnit,{row:unit})' },
    { key: 'own1', name: 'The same with the raise (and half the self-employment tax it moves)', unit: 'money', f: '{row:own0}+{row:raise}-({row:seSS1}-{row:seSS0})/2' },
    { key: 'tipsQ', name: 'Reported tips on the return (the tips deduction)', unit: 'money', f: 'SUMIFS(Income_tipsQ,Income_taxUnit,{row:unit})' },
    { key: 'fed0', name: 'Federal income tax on the return, today', unit: 'money', f: fed('{row:own0}') },
    { key: 'fed1', name: 'Federal income tax on the return, with the raise', unit: 'money', f: fed('{row:own1}') },
    { key: 'ficaUp', name: 'Social Security and Medicare the raise adds', unit: 'money',
      f: 'SS_rate*(MIN({row:wages}+{row:raise},SS_wageBase)-MIN({row:wages},SS_wageBase))+{row:seSS1}-{row:seSS0}+{row:raise}*Medicare_rate+(MAX(0,SUMIFS(Income_ficaBase,Income_taxUnit,{row:unit})+{row:raise}-{row:addlOver})-MAX(0,SUMIFS(Income_ficaBase,Income_taxUnit,{row:unit})-{row:addlOver}))*Medicare_addl' },
    { key: 'addlOver', name: 'Additional Medicare starts over', unit: 'money', f: 'IF(Taxes_joint="Yes",Medicare_over_joint,IF(Taxes_filing="Head of household",Medicare_over_head,Medicare_over_single))' },
    { key: 'state0', name: 'State and city tax on the return, today', unit: 'money', f: st('SUMIFS(Income_stateOwn,Income_taxUnit,{row:unit})') },
    { key: 'state1', name: 'State and city tax on the return, with the raise', unit: 'money', f: st('(SUMIFS(Income_stateOwn,Income_taxUnit,{row:unit})+{row:raise})') },
    { key: 'earnedOn0', name: 'Earnings on the return for the Child Tax Credit, today', unit: 'money', f: 'SUMIFS(Income_own,Income_taxUnit,{row:unit},Income_taxType,"<>Unemployment")' },
    { key: 'ctc0', name: 'Child Tax Credit a year, today (off the tax, the rest back as a refund)', unit: 'money', f: ctc('{row:own0}', '{row:earnedOn0}', '{row:fed0}') },
    { key: 'ctc1', name: 'Child Tax Credit a year, with the raise', unit: 'money', f: ctc('{row:own1}', '({row:earnedOn0}+{row:raise}-({row:seSS1}-{row:seSS0})/2)', '{row:fed1}') },
  ];
}

export function cliffSections(c) {
  const C = cliffOf(c.doc, c.ref, { now: c.now, m: c.m });
  const R = cliffOf(c.doc, c.ref, { now: c.now, m: c.m, raise: 5000 }).raise;
  const P = id => C.programs.find(p => p.id === id);
  const kidRows = Array.from({ length: KIDS }, (_, i) => i + 1);
  const typed = i => `IFERROR(VALUE(TRIM(MID(SUBSTITUTE(Profile_kidAges&"",",",REPT(" ",99)),${(i - 1) * 99 + 1},99))),"")`;
  const people = i => `IFERROR(INDEX(People_age,MATCH(${i},People_pplChildNo,0))&"","")`;
  const ages = kidRows.map(i => ({ key: `age${i}`, name: `Child ${i}: age (blank: not typed, or no child ${i})`, unit: 'number',
    f: `IF(${i}>{row:kids},"",IF(AND({row:deps}>0,${people(i)}<>""),VALUE(${people(i)}),${typed(i)}))` }));
  const under = (limit, k) => kidRows.map(i => `IF(AND(${i}<={row:kids},OR({row:age${i}}="",N({row:age${i}})<${limit})),1,0)`).join('+') + `+MAX(0,{row:kids}-${KIDS})`;
  const household = [
    { key: 'adults', name: 'Adults (a couple is two; the adults on About you › People)', unit: 'number', f: `IF(Profile_household="Couple",2,1)+${['P3', 'P4', 'P5', 'P6', 'P7'].map(id => `COUNTIFS(People_kind,"<>Dependent",People_Id,"${id}")`).join('+')}`, app: C.household.adults },
    { key: 'deps', name: 'Dependents listed on About you › People', unit: 'number', f: 'COUNTIFS(People_kind,"Dependent")' },
    { key: 'typedN', name: 'Kids\' ages typed on About you', unit: 'number', f: 'IF(TRIM(Profile_kidAges&"")="",0,LEN(TRIM(Profile_kidAges&""))-LEN(SUBSTITUTE(TRIM(Profile_kidAges&""),",",""))+1)' },
    { key: 'kids', name: 'Children', unit: 'number', f: 'IF({row:deps}>0,MAX(SUM(People_pplChild),{row:typedN}),MAX(N(Profile_dependents),{row:typedN}))', app: C.household.kids },
    { key: 'others', name: 'Other dependents (a parent you support)', unit: 'number', f: 'IF({row:deps}>0,{row:deps}-SUM(People_pplChild),0)', app: C.household.others },
    { key: 'size', name: 'Household size', unit: 'number', f: '{row:adults}+{row:kids}+{row:others}', app: C.household.size },
    ...ages,
    { key: 'careKids', name: 'Children under CCAP_ageUnder (child care help)', unit: 'number', f: under('CCAP_ageUnder'), app: C.household.careKids },
    { key: 'ctcKids', name: 'Children under CTC_ageUnder (the Child Tax Credit)', unit: 'number', f: under('CTC_ageUnder'), app: C.household.children?.kids },
    { key: 'ctcOthers', name: 'Other dependents for the Child Tax Credit', unit: 'number', f: '{row:kids}-{row:ctcKids}+{row:others}', app: C.household.children?.others },
    { key: 'age', name: 'The client\'s age', unit: 'number', f: 'Profile_ageUsed' },
    { key: 'elderly', name: 'Someone 60 or older at home (1)', unit: 'number', f: 'IF(AND({row:age}<>"",N({row:age})>=60),1,0)' },
    { key: 'ny', name: 'New York (1)', unit: 'number', f: 'IF(Profile_state="NY",1,0)' },
    { key: 'care', name: 'Child care paid out of pocket (1)', unit: 'number', f: 'IF(Profile_cliff_careCosts="Yes",1,0)' },
    { key: 'expanded', name: 'The state expanded Medicaid (1; the Medicaid_states list has the ones that have not)', unit: 'number', f: 'IF(COUNTIF(Medicaid_states_state,Profile_state)>0,0,1)' },
    { key: 'fpl', name: 'The poverty line a year for this size', unit: 'money', f: 'Poverty_base+Poverty_perPerson*MAX(0,{row:size}-1)', app: C.fpl },
    { key: 'bench', name: 'The benchmark plan a year for the adults', unit: 'money', f: 'IFERROR(INDEX(ACA_benchmark_premium,MATCH(Profile_state,ACA_benchmark_state,0)),ACA_benchmarkUs)*12*{row:adults}' },
    { key: 'rent', name: 'Rent or mortgage a month (your share)', unit: 'money', f: 'SUMIFS(Spend_M21,Spend_Kind,"Budget line",Spend_InMath,"Yes",Spend_category,"Rent or mortgage",Spend_amount,"<>")', app: C.household.rentMonthly },
    { key: 'utilities', name: 'Electric, gas, water a month (your share)', unit: 'money', f: 'SUMIFS(Spend_M21,Spend_Kind,"Budget line",Spend_InMath,"Yes",Spend_category,"Electric, gas, water",Spend_amount,"<>")', app: C.household.utilitiesMonthly },
    { key: 'shelter', name: 'SNAP: shelter costs a month (New York uses its utility allowance)', unit: 'money', f: '{row:rent}+IF({row:ny}=1,IF({row:utilities}>0,IF(Profile_nyc="Yes",SNAP_suaNyc,SNAP_suaRest),0),{row:utilities})' },
    { key: 'earnedNow', name: 'Earned a year (paychecks with cash tips, self-employment; the Lender columns on the Income tab)', unit: 'money', f: 'SUMIFS(Income_lendEarned,Income_lendKind,"Paycheck")+SUMIFS(Income_lendEarned,Income_lendKind,"Self-employed")', app: C.household.earned },
    { key: 'unearned', name: 'Other income a year (unemployment, benefits, rent; gifts left out)', unit: 'money', f: 'SUMIFS(Income_lendEarned,Income_lendKind,"Unemployment")+SUMIFS(Income_lendEarned,Income_lendKind,"Benefit")+SUMIFS(Income_lendEarned,Income_lendKind,"Rental")', app: C.household.unearned },
    { key: 'pretax', name: 'Pre-tax money a year', unit: 'money', f: 'SUMIFS(Income_pretax,Income_lendKind,"<>Gift",Income_lendKind,"<>")' },
    { key: 'seHalf', name: 'Half the self-employment tax a year', unit: 'money', f: '(SUMIFS(Income_ssPart,Income_taxType,"1099",Income_lendKind,"<>Gift")+SUMIFS(Income_medPart,Income_taxType,"1099",Income_lendKind,"<>Gift"))/2' },
    { key: 'eitcFrom', name: 'EITC: fades from (single or joint)', unit: 'money', f: 'IF(Taxes_filing="Married jointly",INDEX(EITC_2026_fromJoint,MIN(3,{row:kids})+1),INDEX(EITC_2026_fromSingle,MIN(3,{row:kids})+1))' },
    { key: 'eitcEnd', name: 'EITC: ends at', unit: 'money', f: 'IF(Taxes_filing="Married jointly",INDEX(EITC_2026_endJoint,MIN(3,{row:kids})+1),INDEX(EITC_2026_endSingle,MIN(3,{row:kids})+1))' },
    { key: 'ccapLimit', name: 'Child care help: the line a year (85% of the state median income for the size)', unit: 'money', f: bySize('CCAP_line', 'line', 'CCAP_lineEach') },
  ];
  const today = programRows('0', '{row:earnedNow}+{row:unearned}', '{row:earnedNow}', 'MAX(0,{row:earnedNow}+{row:unearned}-{row:pretax}-{row:seHalf})',
    { snap: C.base.snap.monthly, help: C.base.health.help, eitc: C.base.eitc.total, ccap: C.base.ccap?.share ?? null });
  const raised = programRows('1', '{row:gross0}+{row:raise}', '{row:earned0}+{row:raise}', '{row:magi0}+{row:raise}', null);
  // Each program: does it apply, its status (tapped, else a guess from About you and the income), its line and the
  // distance to it, and whether it counts in the raise (Getting it, and not already past its line).
  const cov = 'Profile_healthCoverage';
  const noCov = `OR(${cov}="None",${cov}="")`;
  const PROG = {
    snap: { applies: '1', guess: 'IF({row:snapOk0}=1,"Might qualify","Not on it")', line: '{row:snapLine0}*12', at: '{row:gross0}', past: '{row:snapOk0}=0' },
    medicaid: { applies: '{row:expanded}', guess: `IF(${cov}="Medicaid","Getting it",IF(AND(${noCov},{row:on0}="medicaid"),"Might qualify","Not on it"))`, line: '{row:fpl}*Medicaid_adults', at: '{row:magi0}', past: '{row:on0}<>"medicaid"' },
    essential: { applies: '{row:ny}', guess: `IF(AND(${cov}="ACA",{row:on0}="essential"),"Getting it",IF(AND(${noCov},{row:on0}="essential"),"Might qualify","Not on it"))`, line: '{row:fpl}*NY_essential', at: '{row:magi0}', past: '{row:on0}<>"essential"' },
    aca: { applies: '1', guess: `IF(AND(${cov}="ACA",{row:on0}="aca"),"Getting it",IF(AND(${noCov},{row:on0}="aca"),"Might qualify","Not on it"))`, line: '{row:fpl}*ACA_cliff', at: '{row:magi0}', past: '{row:on0}<>"aca"' },
    kids: { applies: 'IF(AND({row:kids}>0,{row:ny}=1),1,0)', guess: `IF(AND({row:kids}>0,{row:ratio0}<=ACA_cliff),IF(${cov}="Medicaid","Getting it","Might qualify"),"Not on it")`,
      line: `{row:fpl}*${[['NY_kidsMedicaid'], ['NY_chpFree'], ...(c.ref.cliff?.ny?.chpBands || []).map((_, i) => [`INDEX(NY_chpBands_upTo,${i + 1})`])].reduceRight((rest, [v]) => `IF({row:fpl}*${v}>{row:magi0}+0.5,${v},${rest})`, 'ACA_cliff')}`, at: '{row:magi0}', past: '{row:kidsAt}>{row:kidsLine}+0.5' },
    ccap: { applies: 'IF(AND({row:kids}>0,{row:careKids}>0,{row:ny}=1),1,0)', guess: 'IF({row:ccapOk0}=1,"Might qualify","Not on it")', line: '{row:ccapLimit}', at: '{row:gross0}', past: '{row:ccapOk0}<>1' },
    eitc: { applies: '1', guess: 'IF({row:eitc0}>0,"Might qualify","Not on it")', line: '{row:eitcEnd}', at: 'MAX({row:earned0},{row:magi0})', past: '{row:eitc0}<=0' },
  };
  const programs = CLIFF_PROGRAMS.map(({ id, label }) => {
    const p = PROG[id], A = P(id) ?? null, on = A?.applies;
    return { title: label, rows: [
      { key: `${id}Applies`, name: 'Applies here (1)', unit: 'number', f: p.applies, app: A ? (A.applies ? 1 : 0) : undefined },
      { key: `${id}Status`, name: 'Status (tapped on Plan › Raise and benefits, else a guess)', unit: 'text', f: `IF({row:${id}Applies}<>1,"",IF(OR(Profile_cliff_${id}="Getting it",Profile_cliff_${id}="Might qualify",Profile_cliff_${id}="Not on it"),Profile_cliff_${id},${p.guess}))`, app: on ? A.status : A ? '' : undefined },
      { key: `${id}Line`, name: 'The line a year', unit: 'money', f: `IF({row:${id}Applies}<>1,"",${p.line})`, app: on ? A.line : undefined },
      { key: `${id}At`, name: 'Where the household is on it a year', unit: 'money', f: `IF({row:${id}Applies}<>1,"",${p.at})`, app: on ? A.at : undefined },
      { key: `${id}Distance`, name: 'Distance to the line a year (below zero: over it)', unit: 'money', f: `IF({row:${id}Applies}<>1,"",{row:${id}Line}-{row:${id}At})`, app: on ? A.distance : undefined },
      { key: `${id}Ahead`, name: 'A line ahead a raise could cross (its distance)', unit: 'money', f: `IF({row:${id}Applies}<>1,"",IF(AND({row:${id}Status}<>"Not on it",{row:${id}At}<={row:${id}Line}+0.5,{row:${id}Distance}>0),{row:${id}Distance},""))` },
      { key: `${id}Counted`, name: 'Counts in the raise (Getting it, and not already past its line)', unit: 'number', f: `IF(AND({row:${id}Applies}=1,{row:${id}Status}="Getting it"),IF(${p.past},0,1),0)`, app: A ? (C.counted.includes(id) ? 1 : 0) : undefined },
    ] };
  });
  const lost = [
    { key: 'snapTyped', name: 'SNAP a month as typed (else the formula\'s)', unit: 'money', f: 'IF(Profile_cliff_snapAmount<>"",Profile_cliff_snapAmount,{row:snap0})' },
    { key: 'lostSnap', name: 'SNAP the raise costs a year', unit: 'money', f: 'IF({row:snapCounted}<>1,0,MAX(0,IF({row:snapTyped}*12-IF({row:snapOk1}=1,MAX(0,{row:snapTyped}-({row:snap0}-{row:snap1}))*12,0)>0.5,{row:snapTyped}*12-IF({row:snapOk1}=1,MAX(0,{row:snapTyped}-({row:snap0}-{row:snap1}))*12,0),0)))' },
    { key: 'lostHealth', name: 'Health coverage the raise costs a year (the coverage you get now)', unit: 'money', f: 'IF({row:medicaidCounted}+{row:essentialCounted}+{row:acaCounted}=0,0,MAX(0,{row:cost1}-{row:cost0}))' },
    { key: 'lostKids', name: 'Children\'s coverage the raise costs a year (full price is not priced)', unit: 'money', f: 'IF(OR({row:kidsCounted}<>1,{row:kidsCost0}=""),0,IF({row:kidsCost1}="Full price",0,IF({row:kidsCost1}-N({row:kidsCost0})>0.5,{row:kidsCost1}-N({row:kidsCost0}),0)))' },
    { key: 'lostCcap', name: 'Child care help the raise costs a year (to full price when it ends)', unit: 'money', f: 'IF(OR({row:ccapCounted}<>1,{row:ccapOk0}<>1),0,IF({row:ccapOk1}<>1,IF(Profile_cliff_careFull<>"",MAX(0,Profile_cliff_careFull*12-{row:ccap0}),0),IF({row:ccap1}-{row:ccap0}>0.5,{row:ccap1}-{row:ccap0},0)))' },
    { key: 'lostEitc', name: 'EITC the raise costs a year', unit: 'money', f: 'IF({row:eitcCounted}<>1,0,IF({row:eitc0}-{row:eitc1}>0.5,{row:eitc0}-{row:eitc1},0))' },
  ];
  return [
    { title: 'The raise to test (type a raise or a new paycheck a year in the blue box; the app\'s numbers below are for $5,000)', rows: [
      { key: 'raise', name: 'Raise a year (a W-2 paycheck on your own return)', unit: 'money', input: true, value: 5000 },
    ] },
    { title: 'The household (About you)', rows: household },
    { title: 'Each program at today\'s income', rows: today },
    ...programs,
    { title: 'The next line', rows: [
      { key: 'next', name: 'Distance to the next benefit line a year (the nearest line ahead on a program you get or might)', unit: 'money', f: `IF(COUNT(${CLIFF_PROGRAMS.map(p => `{row:${p.id}Ahead}`).join(',')})=0,"",MIN(${CLIFF_PROGRAMS.map(p => `{row:${p.id}Ahead}`).join(',')}))`, app: C.next?.distance ?? null },
    ] },
    { title: 'The tax on the raise', rows: taxRows(c.now.getFullYear()).map(r => (r.key === 'ctc0' ? { ...r, app: c.x.householdTax?.ctc?.total ?? null } : r)) },
    { title: 'Each program with the raise', rows: raised },
    { title: 'What the raise leaves you', rows: [
      { key: 'afterTax', name: 'The raise after tax a year', unit: 'money', f: '{row:raise}-({row:fed1}-{row:fed0})-{row:ficaUp}-({row:state1}-{row:state0})', app: R.afterTax },
      ...lost,
      { key: 'lostTotal', name: 'Benefits the raise costs a year', unit: 'money', f: '{row:lostSnap}+{row:lostHealth}+{row:lostKids}+{row:lostCcap}+{row:lostEitc}', app: R.lostTotal },
      { key: 'ctcChange', name: 'What it changes in the Child Tax Credit a year', unit: 'money', f: 'IF({row:ctc0}="",0,{row:ctc1}-{row:ctc0})', app: R.ctc?.change ?? 0 },
      { key: 'net', name: 'Kept a year: after tax, less the benefits it costs, plus the Child Tax Credit change', unit: 'money', f: '{row:afterTax}-{row:lostTotal}+{row:ctcChange}', app: R.net },
      { key: 'even', name: 'The smallest raise that leaves you no worse off (a search over every $100 step to $150,000 more; the app\'s number for $5,000)', unit: 'money', fromApp: true, app: R.even ?? null },
    ] },
  ];
}
