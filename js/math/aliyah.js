// SPDX-License-Identifier: AGPL-3.0-only
// Aliyah Math (aliyah.html, ROADMAP Run 8): one household's month in the US next to the same month in Israel, in the
// D.A.I.T.E. order (Debts, Assets, Income, Taxes, Expenses) with Food, Accommodation and Transportation first inside
// Expenses. Every Israeli figure is read from data/sources/israel-2026.json (`il` below), each with its source and how
// sure it is; every US figure from data/reference-2026.json (`ref`) through the tax functions in js/math/income.js.
// Nothing is typed in here as a number. Where the data has no figure (the US return of a citizen living in Israel,
// National Insurance for the self-employed and for pay from abroad, city tax, health add-ons, what things cost in
// Israel, the exchange rate) the person types it, and until they do it is listed under `notPriced` and counts as 0.
// Each row carries its own "Show the math" lines. Dollars a month unless a name says otherwise.
import { takeHomeFromGross, grossFromTakeHome, childTaxCredit, filingKey } from './income.js';
import { fmt } from './result.js';

const usd = v => fmt.money(Math.round(v));
export const ils = v => `₪${Math.round(v).toLocaleString('en-US')}`;
const pct = v => `${+(v * 100).toFixed(2)}%`;
const has = v => v !== null && v !== undefined && !Number.isNaN(v);

export const ALIYAH_SCENARIOS = [['remote', 'Keep my US job, remotely'], ['salary', 'An Israeli salary'], ['part', 'Part-time work'], ['partSide', 'Part-time plus a side income'], ['none', 'No income for a while']];
export const ALIYAH_LINES = [['food', 'Food'], ['home', 'Accommodation'], ['move', 'Transportation'], ['health', 'Health cover'], ['kids', 'Schooling, childcare and kids'], ['rest', 'Everything else']];
const HEALTH = new Set(['Health insurance', 'Copays', 'Prescriptions']);
const groupOf = l => (l.draftt === 'Food' ? 'food' : l.draftt === 'Accommodation' ? 'home' : l.draftt === 'Transportation' ? 'move' : HEALTH.has(l.category) ? 'health' : l.category === 'Kids' ? 'kids' : 'rest');

// The US side's faded starting amounts: the plan's own typical monthly lines (spendingPresets, levels 1 and 2: the big
// one and the regulars), added up by group. A Guess until the person uses or changes it.
export function aliyahGuesses(ref) {
  const out = Object.fromEntries(ALIYAH_LINES.map(([k]) => [k, 0]));
  for (const l of ref.spendingPresets.lines) if (l.level <= 2) out[groupOf(l)] += l.guess;
  return out;
}

// What the page opens with. Every one is a Guess: the US costs above, the US pay worked backwards from the plan's
// take-home (M13), the savings from the plan's checking and savings, and the two figures the taps name (the resident's
// own credit points and the dates of the 0% window), read from the data.
export function aliyahStart({ takeHome = null, checking = null, savings = null, filing = 'Single' } = {}, ref, il) {
  const day = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return { spend: aliyahGuesses(ref), usGross: takeHome > 0 ? grossFromTakeHome({ takeHome: takeHome * 12, filingStatus: filing }, ref).value : null,
    savings: has(checking) || has(savings) ? (checking ?? 0) + (savings ?? 0) : null,
    resident: { man: il.creditPoints.residentBase.man, woman: il.creditPoints.residentBase.woman }, windowFrom: day(il.olimZeroRate.qualifyingArrival.from), windowTo: day(il.olimZeroRate.qualifyingArrival.to) };
}

// The extra credit points of a new immigrant, averaged over one year in Israel (year 1 is months 1 to 12), from the
// month-by-month schedule: 1 point for 12 months, 3 for 18, 2 for 12, 1 for 12, then none.
export function olimPointsOf(year, il) {
  const from = (year - 1) * 12, to = year * 12;
  let at = 0, sum = 0;
  for (const s of il.creditPoints.olim.schedule) { const a = Math.max(from, at), b = Math.min(to, at + s.months); if (b > a) sum += (b - a) * s.extraPoints; at += s.months; }
  return sum / 12;
}

// Israeli income tax on a year of earned income. `monthly` in shekels. `zeroCeiling`: the yearly amount taxed at 0% for
// an arrival inside the window (null: no 0% rate). The data does not say how income over the ceiling is stacked; here
// it stays in the bands it would sit in anyway (the whole year's tax less the tax on the first `ceiling` shekels),
// which is the higher of the two readings. Credit points come off next and never take the tax below zero. The extra
// tax on high incomes is added last, at the data's rate (marked "confirm" there).
export function ilIncomeTaxOf({ monthly, points = 0, zeroCeiling = null }, il) {
  const bands = il.incomeTax.bracketsMonthly.map(b => ({ upTo: b.upTo == null ? Infinity : b.upTo * 12, rate: b.rate }));
  const on = x => { let tax = 0, floor = 0; for (const b of bands) { if (x > floor) tax += (Math.min(x, b.upTo) - floor) * b.rate; floor = b.upTo; } return tax; };
  const annual = monthly * 12, exempt = zeroCeiling == null ? 0 : Math.min(annual, zeroCeiling);
  const whole = on(annual), spared = on(exempt), before = whole - spared;
  const credit = points * il.creditPoints.valueAnnual, afterCredit = Math.max(0, before - credit);
  const S = il.incomeTax.surtax, surtax = Math.max(0, annual - S.aboveAnnual) * S.rate;
  const tax = afterCredit + surtax;
  const top = bands.find(b => annual <= b.upTo) ?? bands.at(-1);
  const text = [`${ils(monthly)} a month is ${ils(annual)} a year. Through the 2026 bands (10% to ${ils(bands[0].upTo)}, 14% to ${ils(bands[1].upTo)}, 20% to ${ils(bands[2].upTo)}, 31% to ${ils(bands[3].upTo)}, 35% to ${ils(bands[4].upTo)}, 47% above) the tax is ${ils(whole)}.`,
    zeroCeiling == null ? null : `The 0% rate for new arrivals covers the first ${ils(zeroCeiling)} of the year: ${ils(spared)} of that tax is not charged, leaving ${ils(before)}.`,
    `${+points.toFixed(2)} credit points at ${ils(il.creditPoints.valueAnnual)} a year each take off up to ${ils(credit)}: ${ils(afterCredit)} is left.`,
    surtax > 0 ? `The extra ${pct(S.rate)} on income over ${ils(S.aboveAnnual)} adds ${ils(surtax)}.` : null,
    `${ils(tax)} a year is ${ils(tax / 12)} a month.`].filter(Boolean);
  return { annual, whole, spared, before, credit, afterCredit, surtax, tax, monthly: tax / 12, marginal: top.rate, text };
}

// National Insurance and the health tax a salaried worker pays: the reduced rate up to the reduced band, the full rate
// from there to the ceiling, nothing above it. `monthly` in shekels.
export function ilNationalInsuranceOf({ monthly }, il) {
  const N = il.nationalInsurance, E = N.employee;
  const low = Math.min(monthly, N.reducedBandUpToMonthly), high = Math.max(0, Math.min(monthly, N.ceilingMonthly) - N.reducedBandUpToMonthly);
  const insurance = low * E.reduced.nationalInsurance + high * E.full.nationalInsurance, health = low * E.reduced.health + high * E.full.health;
  const text = [`On the first ${ils(low)}: ${pct(E.reduced.total)} (${pct(E.reduced.nationalInsurance)} National Insurance and ${pct(E.reduced.health)} health) = ${ils(low * E.reduced.total)}.`,
    high > 0 ? `On the next ${ils(high)}: ${pct(E.full.total)} (${pct(E.full.nationalInsurance)} and ${pct(E.full.health)}) = ${ils(high * E.full.total)}.` : null,
    monthly > N.ceilingMonthly ? `Nothing on pay over ${ils(N.ceilingMonthly)} a month.` : null,
    `${ils(insurance + health)} a month, at the salaried rates from Jan 1 2026.`].filter(Boolean);
  return { insurance, health, total: insurance + health, text };
}

// The whole comparison. `x` holds what the person tapped or typed (see aliyah.html); a blank is null.
//   rate: shekels to one dollar. filing: 'Single' | 'Married jointly' | 'Head of household'.
//   place: 'none' | 'NY' | 'NYC' | 'other' (with stateTax, a year, typed). kids: a count.
//   usGross: US pay a year before tax. otherUs / otherIl: other money a month, after tax ($ and shekels).
//   scenario: one of ALIYAH_SCENARIOS. remoteGross ($ a year), remoteTreat 'israeli' | 'foreign', remoteNi 'salaried' | null.
//   salary, partPay, side: shekels a month before tax. niOther: shekels a month the person typed for what is not priced.
//   resident: the resident's own credit points. year: the year in Israel (1 is the first). window: arrived inside the 0% window.
//   usTaxAbroad: $ a year still owed to the US. debt: $ a month. savings, moveCost: $. landing: months with no pay.
//   kosher, kosherUs, kosherIl: the toggle and the share kosher food adds on each side (0.2 is 20%).
//   spend: { food: { us, il, ilOfUs }, ... }: $ a month in the US; in Israel shekels a month, or a share of the US amount.
//   arnona: shekels a month, typed.
export function aliyahOf(x, ref, il) {
  const need = [];
  if (!(x.rate > 0)) need.push('the exchange rate');
  if (!has(x.usGross)) need.push('your US pay');
  const sc = x.scenario ?? 'remote', remoteGross = x.remoteGross ?? x.usGross;
  if (sc === 'salary' && !has(x.salary)) need.push('the Israeli salary');
  if ((sc === 'part' || sc === 'partSide') && !has(x.partPay)) need.push('the part-time pay');
  if (sc === 'partSide' && !has(x.side)) need.push('the side income');
  const kids = x.kids ?? 0, lines = ALIYAH_LINES.filter(([k]) => k !== 'kids' || kids > 0);
  for (const [k, label] of lines) { const s = x.spend?.[k] ?? {}; if (!has(s.us)) need.push(`${label} in the US`); if (!has(s.il) && !has(s.ilOfUs)) need.push(`${label} in Israel`); }
  if (need.length) return { ready: false, needs: need };

  const rate = x.rate, toUsd = v => v / rate, notPriced = [];
  const filing = x.filing ?? 'Single', joint = filingKey(filing) === 'joint';

  // ---- Income and taxes, the US as it is today
  const place = x.place === 'NY' ? { state: 'NY' } : x.place === 'NYC' ? { state: 'NY', nyc: true } : null;
  const T = takeHomeFromGross({ gross: x.usGross, filingStatus: filing, place }, ref);
  const fed = T.federal.value, fica = T.fica.value, state = x.place === 'other' ? (x.stateTax ?? 0) : T.stateTax.state + T.stateTax.local;
  if (x.place === 'other' && !has(x.stateTax)) notPriced.push({ key: 'stateTax', side: 'us', text: 'Your state\'s income tax. Only New York is in the data so far; type what you pay in a year.' });
  const ctc = kids > 0 ? childTaxCredit({ kids, magi: x.usGross, incomeTax: fed, earned: x.usGross, joint }, ref) : null;
  const usTax = (fed + fica + state - (ctc?.total ?? 0)) / 12, usPay = x.usGross / 12, usOther = x.otherUs ?? 0;

  // ---- Income and taxes, Israel on the scenario tapped
  const year = x.year ?? 1, extra = olimPointsOf(year, il), points = (x.resident ?? il.creditPoints.residentBase.man) + extra;
  const zeroYear = String(2026 + year - 1), ceiling = x.window ? il.olimZeroRate.ceilingAnnual[zeroYear] ?? null : null;
  const pay = sc === 'remote' ? remoteGross * rate / 12 : sc === 'salary' ? x.salary : sc === 'part' || sc === 'partSide' ? x.partPay : 0;
  const side = sc === 'partSide' ? x.side : 0, earned = pay + side;
  const foreign = sc === 'remote' && x.remoteTreat === 'foreign';
  const it = foreign || !earned ? null : ilIncomeTaxOf({ monthly: earned, points, zeroCeiling: ceiling }, il);
  const salaried = sc === 'salary' || sc === 'part' || sc === 'partSide' || (sc === 'remote' && x.remoteNi === 'salaried');
  const ni = salaried && pay > 0 ? ilNationalInsuranceOf({ monthly: pay }, il) : null;
  const loose = sc === 'remote' && !salaried ? 'pay that comes straight from a US employer' : sc === 'partSide' && side > 0 ? 'self-employed income' : sc === 'none' ? 'a resident with no income' : null;
  if (loose && !has(x.niOther)) notPriced.push({ key: 'niOther', side: 'il', text: `National Insurance and health tax on ${loose}. Those rates are not in the data yet; type what you expect to pay in a month.` });
  if (!has(x.usTaxAbroad)) notPriced.push({ key: 'usTaxAbroad', side: 'il', text: 'What the US still takes. A US citizen files a US return every year from Israel too. The foreign earned income exclusion, the foreign tax credit and the Social Security agreement are not in the data yet, so this counts as $0 until you type a number.' });
  if (kids > 0) notPriced.push({ key: 'kidPoints', side: 'il', text: 'Israeli credit points for children. They would lower the income tax; they are not in the data yet.' });
  const ilTaxIls = (it?.monthly ?? 0) + (ni?.total ?? 0) + (loose ? x.niOther ?? 0 : 0), usStill = (x.usTaxAbroad ?? 0) / 12;
  const ilPay = toUsd(earned), ilOther = toUsd(x.otherIl ?? 0), ilTax = toUsd(ilTaxIls) + usStill;
  const pensionRate = il.other.pensionEmployeeTypical.rate, pension = sc === 'salary' || sc === 'part' || sc === 'partSide' ? pay * pensionRate : 0;

  // ---- Expenses: Food, Accommodation, Transportation first, then the rest
  const E = [];
  for (const [k, label] of lines) {
    const s = x.spend[k], addUs = k === 'food' && x.kosher ? x.kosherUs ?? 0 : 0, addIl = k === 'food' && x.kosher ? x.kosherIl ?? 0 : 0;
    const us = s.us * (1 + addUs), baseIl = has(s.il) ? toUsd(s.il) : s.us * s.ilOfUs, ilv = baseIl * (1 + addIl);
    const math = [addUs ? `In the US: ${usd(s.us)} plus ${pct(addUs)} for kosher = ${usd(us)}.` : `In the US: ${usd(us)} a month.`,
      has(s.il) ? `In Israel: ${ils(s.il)} at ${rate} shekels to the dollar = ${usd(baseIl)}.` : `In Israel: ${s.ilOfUs === 1 ? 'the same as' : `${pct(s.ilOfUs)} of`} the US amount${addUs ? ' before kosher' : ''} = ${usd(baseIl)} (${ils(baseIl * rate)}).`,
      addIl ? `Plus ${pct(addIl)} for kosher = ${usd(ilv)}.` : null].filter(Boolean);
    E.push({ key: k, label, us, il: ilv, ilIls: ilv * rate, math });
    if (k === 'food' && x.kosher) { if (!has(x.kosherUs)) notPriced.push({ key: 'kosherUs', side: 'us', text: 'What keeping kosher adds to food in the US. No figure for it is in the data; tap a share.' }); if (!has(x.kosherIl)) notPriced.push({ key: 'kosherIl', side: 'il', text: 'What keeping kosher adds to food in Israel. No figure for it is in the data; tap a share.' }); }
    if (k === 'home') { E.push({ key: 'arnona', label: 'Arnona (city tax)', sub: true, us: null, il: toUsd(x.arnona ?? 0), ilIls: x.arnona ?? 0, math: [has(x.arnona) ? `${ils(x.arnona)} a month at ${rate} = ${usd(toUsd(x.arnona))}.` : 'Not typed yet, so it counts as $0.'] }); if (!has(x.arnona)) notPriced.push({ key: 'arnona', side: 'il', text: 'Arnona, the city tax a renter or owner pays in Israel. It is not in the data yet; type yours for a month.' }); }
    if (k === 'health' && !has(s.il)) notPriced.push({ key: 'healthExtra', side: 'il', text: 'Health fund add-on plans in Israel. Basic cover is paid through the health tax on the Taxes rows; what the add-ons cost is not in the data yet, so type yours on the Health cover row.' });
  }
  const sum = (rows, side) => rows.reduce((a, r) => a + (r[side] ?? 0), 0);
  const usSpend = sum(E, 'us'), ilSpend = sum(E, 'il'), debt = x.debt ?? 0;

  // ---- The rows, in D.A.I.T.E. order
  const scName = ALIYAH_SCENARIOS.find(s => s[0] === sc)[1];
  const I = [
    { key: 'pay', label: sc === 'none' ? 'Pay' : sc === 'remote' ? 'Pay (the US job in both)' : 'Pay', us: usPay, il: ilPay, ilIls: earned,
      math: [`In the US: ${usd(x.usGross)} a year before tax is ${usd(usPay)} a month.`,
        sc === 'remote' ? `In Israel: ${usd(remoteGross)} a year from the same job is ${usd(remoteGross / 12)} a month, ${ils(pay)} at ${rate} shekels to the dollar.`
          : sc === 'none' ? 'In Israel: no pay while you land.' : `In Israel: ${ils(pay)} a month${side ? ` from the job plus ${ils(side)} from your own work = ${ils(earned)}` : ''}, which is ${usd(ilPay)} at ${rate}.`] },
    usOther || ilOther ? { key: 'other', label: 'Other money, after tax', us: usOther, il: ilOther, ilIls: x.otherIl ?? 0, math: [`In the US: ${usd(usOther)} a month. In Israel: ${ils(x.otherIl ?? 0)} = ${usd(ilOther)}. Typed as money that already had its tax taken.`] } : null,
  ].filter(Boolean);
  const Tx = [
    { key: 'federal', label: 'Federal income tax', us: fed / 12, il: null, math: [T.federal.text, `${usd(fed)} a year is ${usd(fed / 12)} a month.`] },
    { key: 'fica', label: 'Social Security and Medicare', us: fica / 12, il: null, math: [T.fica.text] },
    x.place && x.place !== 'none' ? { key: 'state', label: x.place === 'NYC' ? 'New York State and City tax' : x.place === 'NY' ? 'New York State tax' : 'State income tax', us: state / 12, il: null, math: [x.place === 'other' ? (has(x.stateTax) ? `${usd(state)} a year, as you typed it.` : 'Not typed yet, so it counts as $0.') : `${usd(state)} a year on New York's 2026 brackets${x.place === 'NYC' ? ', the city\'s included' : ''}.`] } : null,
    ctc ? { key: 'ctc', label: 'Child Tax Credit', us: -ctc.total / 12, il: null, math: [`${kids} ${kids === 1 ? 'child' : 'children'}: ${usd(ctc.total)} a year comes off the tax or back as a refund.`] } : null,
    { key: 'ilIncome', label: 'Israeli income tax', us: null, il: toUsd(it?.monthly ?? 0), ilIls: it?.monthly ?? 0,
      math: foreign ? [`Counted as foreign income: new immigrants pay no Israeli tax on foreign income for ${il.foreignIncomeExemption.years} years. Whether pay for work done while living in Israel counts as foreign is a question for a cross-border accountant.`]
        : !earned ? ['No earned income, so no income tax.'] : [...it.text, `Credit points: ${+(points - extra).toFixed(2)} as a resident plus ${+extra.toFixed(2)} as a new immigrant in year ${year}.`, x.window && ceiling == null ? 'The 0% rate has no ceiling in the data for that year, so it is not applied.' : null].filter(Boolean) },
    { key: 'ilNi', label: 'National Insurance and health tax', us: null, il: toUsd((ni?.total ?? 0) + (loose ? x.niOther ?? 0 : 0)), ilIls: (ni?.total ?? 0) + (loose ? x.niOther ?? 0 : 0),
      math: [...(ni ? ni.text : []), loose ? (has(x.niOther) ? `On ${loose}: ${ils(x.niOther)} a month, as you typed it.` : `On ${loose}: not priced, counts as ₪0 until typed.`) : null].filter(Boolean) },
    { key: 'usStill', label: 'US tax still owed from Israel', us: null, il: usStill, ilIls: usStill * rate, math: [has(x.usTaxAbroad) ? `${usd(x.usTaxAbroad)} a year, as you typed it, is ${usd(usStill)} a month.` : 'Not priced. A US citizen still files every year; it counts as $0 until you type a number.'] },
  ].filter(Boolean);
  const D = [{ key: 'debt', label: 'Debt payments', us: debt, il: debt, ilIls: debt * rate, math: [has(x.debt) ? `${usd(debt)} a month in both: a US debt is still paid in dollars from Israel, which is ${ils(debt * rate)} at ${rate}.` : 'Nothing typed, so $0 in both.'] }];

  const usIn = usPay + usOther, ilIn = ilPay + ilOther;
  const usLeft = usIn - usTax - usSpend - debt, ilLeft = ilIn - ilTax - ilSpend - debt, diff = ilLeft - usLeft;
  const leftMath = (name, inn, tax, spend, left) => `${name}: ${usd(inn)} in, less ${usd(tax)} tax, ${usd(spend)} costs and ${usd(debt)} debt payments = ${usd(left)} left.`;

  // ---- Assets: what the savings cover, before and after
  const savings = x.savings ?? null, moveCost = x.moveCost ?? 0, burnUs = usSpend + debt, burnIl = ilSpend + debt;
  let cushion = null;
  if (has(savings)) {
    const after = Math.max(0, savings - moveCost), landing = sc === 'none' ? x.landing ?? null : null;
    cushion = { savings, moveCost, after, monthsUs: burnUs > 0 ? savings / burnUs : null, monthsIl: burnIl > 0 ? after / burnIl : null,
      lasts: ilLeft < 0 ? after / -ilLeft : null, grows: ilLeft >= 0 ? ilLeft : null,
      landing, afterLanding: has(landing) ? after + ilLeft * landing : null };
    cushion.math = [`${usd(savings)} over ${usd(burnUs)} a month of US costs and debt payments = ${cushion.monthsUs == null ? 'no costs to cover' : `${cushion.monthsUs.toFixed(1)} months`}.`,
      `${moveCost ? `${usd(savings)} less ${usd(moveCost)} to move = ${usd(after)}; that` : usd(after)} over ${usd(burnIl)} a month of Israel costs and debt payments = ${cushion.monthsIl == null ? 'no costs to cover' : `${cushion.monthsIl.toFixed(1)} months`}.`,
      ilLeft < 0 ? `On this plan ${usd(-ilLeft)} a month comes out of savings: ${usd(after)} lasts ${cushion.lasts.toFixed(1)} months.` : `On this plan ${usd(ilLeft)} a month is left to add to savings.`,
      has(landing) ? `After ${landing} months of landing: ${usd(after)} ${ilLeft < 0 ? 'less' : 'plus'} ${landing} x ${usd(Math.abs(ilLeft))} = ${usd(cushion.afterLanding)}.` : null].filter(Boolean);
  }
  const A = [
    { key: 'savings', label: 'Savings you can reach', us: savings, il: has(savings) ? cushion.after : null, ilIls: has(savings) ? cushion.after * rate : null, stock: true, math: has(savings) ? [moveCost ? `${usd(savings)} today, less ${usd(moveCost)} for the move itself, is ${usd(cushion.after)} on landing.` : `${usd(savings)} today. No cost for the move itself is typed.`] : ['Not typed yet. Add it to see how many months it covers.'] },
    cushion ? { key: 'months', label: 'Months it covers with no pay', us: cushion.monthsUs, il: cushion.monthsIl, months: true, math: cushion.math.slice(0, 2) } : null,
    pension > 0 ? { key: 'pension', label: 'Into your pension from pay', us: null, il: toUsd(pension), ilIls: pension, info: true, math: [`A typical ${pct(pensionRate)} of ${ils(pay)} = ${ils(pension)} a month. It is your money, but it does not land in your account. It is not taken off the month here, and the tax relief on it is not priced.`] } : null,
  ].filter(Boolean);

  const sections = [
    { letter: 'D', name: 'Debts', rows: D, us: debt, il: debt },
    { letter: 'A', name: 'Assets', rows: A, us: null, il: null },
    { letter: 'I', name: 'Income', rows: I, us: usIn, il: ilIn },
    { letter: 'T', name: 'Taxes', rows: Tx, us: usTax, il: ilTax },
    { letter: 'E', name: 'Expenses', rows: E, us: usSpend, il: ilSpend },
  ];
  return { ready: true, rate, scenario: sc, scenarioName: scName, sections, notPriced,
    us: { income: usIn, tax: usTax, spend: usSpend, debt, left: usLeft }, il: { income: ilIn, tax: ilTax, spend: ilSpend, debt, left: ilLeft, leftIls: ilLeft * rate, taxIls: ilTaxIls },
    diff, diffYear: diff * 12, cushion, pension, points, extraPoints: extra, zeroCeiling: ceiling,
    math: [leftMath('In the US', usIn, usTax, usSpend, usLeft), leftMath(`In Israel (${scName})`, ilIn, ilTax, ilSpend, ilLeft), `${usd(ilLeft)} less ${usd(usLeft)} = ${usd(diff)} a month, ${usd(diff * 12)} a year.`, `Every shekel amount is turned into dollars at ${rate} shekels to the dollar, the rate you gave.`] };
}
