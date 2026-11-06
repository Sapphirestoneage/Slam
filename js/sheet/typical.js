// SPDX-License-Identifier: AGPL-3.0-only
// Batch 63 (M9E and M9A in the workbook): typical at your age as lookups on the priors tables of the Assumptions tab
// (Priors_ce, Priors_value, Priors_place, Priors_netWorth), the same rules as js/math/priors.js typicalOf: the closest
// row (one person living alone reads the CE one-person row, scaled to the age band by the band's ratio to all ages;
// anyone else the age band's row), spending and pay scaled by the place's price parity (the New York metro for the NYC
// area), cash and pay shaped like spending by age, retirement like net worth by age, rent split by the people sharing
// it. Formula text only.

const V = k => `INDEX(Priors_value_value,MATCH("${k}",Priors_value_key,0))`;
const A = 'Profile_ageUsed';
const TB = `INDEX(Priors_ce_total,MATCH(${A},Priors_ce_from,1))`, PB = `INDEX(Priors_ce_insurance,MATCH(${A},Priors_ce_from,1))`;
const SOLO = 'Profile_household="Solo"';
const NYC_AREA = 'AND(OR(Profile_state="NY",Profile_state="NJ"),IF(Profile_nycArea<>"",Profile_nycArea="Yes",AND(Profile_state="NY",Profile_nyc="Yes")))';
const PF = place => `IFERROR(INDEX(Priors_place_factor,MATCH(${place},Priors_place_place,0)),1)`;
export const PLACE = `IF(${NYC_AREA},${PF('"NY metro"')},${PF('Profile_state')})`;
// Spending all in, a month: CE total less personal insurance and pensions, over 12, at the place.
export const SPENDING = `(IF(${SOLO},IF(${A}="",${V('ceTotalSolo')}-${V('ceInsuranceSolo')},${V('ceTotalSolo')}*${TB}/${V('ceTotalAll')}-${V('ceInsuranceSolo')}*${PB}/${V('ceInsuranceAll')}),IF(${A}="",${V('ceTotalAll')}-${V('ceInsuranceAll')},${TB}-${PB}))/12*${PLACE})`;
// What shapes an all-ages figure by age: spending's, or net worth's (priors.js shapeOf).
const SHAPE_SPEND = `IF(AND(${A}="",NOT(${SOLO})),1,IF(${SOLO},IF(${A}="",${V('ceTotalSolo')},${V('ceTotalSolo')}*${TB}/${V('ceTotalAll')}),${TB})/${V('ceTotalAll')})`;
const SHAPE_NW = `IF(${A}="",1,INDEX(Priors_netWorth_typical,MATCH(${A},Priors_netWorth_from,1))/${V('netWorthAll')})`;
const PS = 'AND(Profile_household="Couple",OR(Profile_moneyStyle="Separate",Profile_moneyStyle="Mix",AND(Profile_moneyStyle="",OR(Profile_mode="Dating",Profile_mode="Living together",Profile_mode="Engaged",Profile_mode="Married separate"))))';
const WAYS = `IF(AND(Profile_shared_rent<>"No",OR(Profile_sharedAs_rent="",Profile_sharedAs_rent="Your share"),OR(Profile_roommates<>"",Profile_splitWays<>"")),MAX(1,IF(Profile_roommates<>"",Profile_roommates+1+IF(${PS},1,0),IF(Profile_splitWays<>"",Profile_splitWays,1+IF(${PS},1,0)))),1)`;
// The typical (likely) figure of each field, in its own unit.
export const TYPICAL = {
  spending: SPENDING,
  cash: `(${V('cash')}*${SHAPE_SPEND})`,
  card: V('card'),
  studentLoans: V('studentLoans'),
  rent: `(IF(Profile_state="NY",${V('rentNY')},${V('rent')})/${WAYS})`,
  income: `(${V('income')}*${SHAPE_SPEND}*${PLACE})`,
  retirement: `(${V('retirement')}*${SHAPE_NW})`,
};
// All households' middle when only a share has any (agestart.js priorFill at the 50th): those with none count as $0.
export const fillMiddle = (L, share) => {
  const q = `(1-0.5/MIN(1,MAX(0.000001,${share})))`, lo = `(${L})*TypicalLow`, hi = `(${L})*TypicalHigh`;
  return `IF(${q}<=0,0,IF(${q}<=0.25,${lo}*${q}/0.25,IF(${q}<=0.5,${lo}+((${L})-${lo})*(${q}-0.25)/0.25,IF(${q}<=0.75,(${L})+(${hi}-(${L}))*(${q}-0.5)/0.25,${hi}))))`;
};
// The plan from an age (M9A): each core input's typical fill-in, and whether it is answered.
export const FILL = {
  income: TYPICAL.income, spending: TYPICAL.spending,
  cash: fillMiddle(TYPICAL.cash, V('cashShare')), invested: fillMiddle(TYPICAL.retirement, V('retirementShare')), card: fillMiddle(TYPICAL.card, V('cardShare')),
};
const NONE = 'Profile_noneOfThese="Yes"';
export const ANSWERED = {
  income: 'COUNTIFS(Income_Kind,"Income",Income_InMath,"<>No",Income_amount,"<>")+COUNTIFS(Income_Kind,"Income",Income_InMath,"<>No",Income_gross,"<>")+COUNTIFS(Income_Kind,"Income",Income_InMath,"<>No",Income_hourly,"<>")>0',
  spending: 'COUNTIFS(Spend_InMath,"<>No",Spend_amount,"<>",Spend_Status,"<>Not for me")+COUNTIFS(Spend_InMath,"<>No",Spend_Kind,"Gut number or category",Spend_Type,"All in",Spend_amount,"<>",Spend_Status,"Not for me")>0',
  cash: `OR(${NONE},Profile_areas_cash="No",COUNTIFS(Assets_Kind,"Account",Assets_group,"cash",Assets_InMath,"<>No",Assets_balance,"<>")>0)`,
  invested: `OR(${NONE},Profile_areas_investments="No",COUNTIFS(Assets_Kind,"Account",Assets_group,"investment",Assets_InMath,"<>No",Assets_balance,"<>")>0)`,
  card: `OR(${NONE},Profile_areas_debt="No",COUNTIFS(Debt_InMath,"<>No",Debt_balance,"<>")>0)`,
};

// M9E: is a typed total far outside typical (priors.js farFrom: above high x high / likely, or below low x low / likely)?
const far = (total, L, sides) => `IF(NOT((${L})>0),0,IF(${sides.includes('above') ? `(${total})>(${L})*TypicalHigh^2` : 'FALSE'},1,IF(${sides.includes('below') ? `(${total})<(${L})*TypicalLow^2` : 'FALSE'},1,0)))`;
// The boxes each check adds up (priors.js typicalBoxes) and its count (the gut number: the All in row).
export function farCount() {
  const cashT = 'SUMIFS(Assets_balance,Assets_Kind,"Account",Assets_group,"cash",Assets_InMath,"<>No")', cashN = 'COUNTIFS(Assets_Kind,"Account",Assets_group,"cash",Assets_InMath,"<>No",Assets_balance,"<>")';
  const debtT = t => `SUMIFS(Debt_balance,Debt_Type,"${t}",Debt_InMath,"<>No")`, debtN = t => `COUNTIFS(Debt_Type,"${t}",Debt_InMath,"<>No",Debt_balance,"<>")`;
  const gutC = 'Spend_Kind,"Gut number or category",Spend_Type,"All in",Spend_InMath,"<>No"';
  const rentC = per => `Spend_Kind,"Budget line",Spend_category,"Rent or mortgage",Spend_whoPays,"<>Covered by someone",Spend_whoPays,"<>N/A",Spend_whoPays,"<>Not for me",Spend_whoPays,"<>Included in rent",Spend_irregular,"<>Yes",Spend_per,"${per}",Spend_InMath,"<>No"`;
  const rentT = `(SUMIFS(Spend_amount,${rentC('month')})+SUMIFS(Spend_amount,${rentC('')}))`, rentN = `(COUNTIFS(${rentC('month')},Spend_amount,"<>")+COUNTIFS(${rentC('')},Spend_amount,"<>"))`;
  const one = (n, t, L, sides) => `IF(${n}=0,0,${far(t, L, sides)})`;
  return [
    one(cashN, cashT, TYPICAL.cash, ['above', 'below']),
    one(debtN('Credit card'), debtT('Credit card'), TYPICAL.card, ['above']),
    one(debtN('Student loan'), debtT('Student loan'), TYPICAL.studentLoans, ['above']),
    one(`COUNTIFS(${gutC},Spend_amount,"<>")`, `SUMIFS(Spend_amount,${gutC})`, TYPICAL.spending, ['above']),
    `IF(OR(Profile_housing="Own",Profile_housing="Family"),0,${one(rentN, rentT, TYPICAL.rent, ['above'])})`,
  ].join('+');
}
