/* ============================================================================
   SLAM the Game: core/quick.js
   PURPOSE     The quick calculators: a HYSA switch, lump sum or a little each month, a warranty, cost
               per use, Return on Hassle, worth it, personal inflation, starting earlier, cut it or
               invest it (the round $30k / $90k rule), kids, a pet, a first apartment, New York
               unemployment and the runway with it. The sheet "Quick math"
               (features/quick.js) uses it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: QC_KID_STAGES, QC_CUT_RULE, QC_CUT_SOURCE. Functions: qcGrow, qcMonthlyOf,
               qcNominal, qcInvested, qcHysa, qcDca, qcWarranty, qcPerUse, qcHassle, qcWorth,
               qcInflation, qcStart, qcRound, qcCutInvest, qcKids, qcPet, qcApartment, qcUiNy,
               qcBenefitRunway.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/quick.js of the main SLAM app,
               so the small pages of the web app and the game have one copy of each rule. To change a
               rule, change the source, then run: node tools/game_quick_build.mjs. The tests fail when
               this copy is stale. Prettier does not format this file (.prettierignore).
   ========================================================================= */
// The quick calculators (run Not built, groups 1 to 5, Part 2; M8Q): small answers on the person's own taps. One
// function each, no imports, so the game loads the same code as a plain script (tools/game_quick_build.mjs writes
// game/core/quick.js). Every number in comes from the person or from the plan's own presets, passed in; none is typed
// here. The ones that need the tax engine or the household split are in js/math/quickplan.js.

// A balance and a monthly amount grown at a yearly rate, compounded each month, for `months`.
function qcGrow(start, monthly, rate, months) {
  const r = (rate ?? 0) / 12, n = Math.max(0, months);
  if (r === 0) return start + monthly * n;
  const g = (1 + r) ** n;
  return start * g + monthly * (g - 1) / r;
}
// A yearly rate as the monthly rate that compounds to it (for returns quoted as a year's growth).
const qcMonthlyOf = rate => (1 + (rate ?? 0)) ** (1 / 12) - 1;
// The plan's return after inflation, with inflation put back (for a comparison with a savings rate, which is not after inflation).
const qcNominal = (real, inflation) => (1 + (real ?? 0)) * (1 + (inflation ?? 0)) - 1;

// A monthly amount invested at a return quoted as a year's growth (7% is 7% over the year, compounded monthly), for
// `months`: qcGrow at the monthly rate that compounds to it. Starting earlier, the cost of waiting and the cut-or-invest
// rule all stand on this one line.
const qcInvested = (monthly, ret, months) => qcGrow(0, monthly, 12 * qcMonthlyOf(ret), months);

// HYSA switch: the same balance where it is, and in an account paying the other rate.
function qcHysa({ balance = null, fromRate = null, toRate = null, monthly = 0, years = 5 } = {}) {
  if (!(balance >= 0) || fromRate == null || toRate == null || !(balance > 0 || monthly > 0)) return { ready: false };
  const m = monthly ?? 0, n = years * 12;
  const yearFrom = qcGrow(balance, m, fromRate, 12) - balance - m * 12, yearTo = qcGrow(balance, m, toRate, 12) - balance - m * 12;
  const endFrom = qcGrow(balance, m, fromRate, n), endTo = qcGrow(balance, m, toRate, n), put = balance + m * n;
  return { ready: true, balance, monthly: m, years, fromRate, toRate, yearFrom, yearTo, yearGain: yearTo - yearFrom, monthGain: (yearTo - yearFrom) / 12,
    endFrom, endTo, gain: endTo - endFrom, interestFrom: endFrom - put, interestTo: endTo - put };
}

// Lump sum or a little each month (dollar-cost averaging): the whole amount invested today, against the same amount
// put in evenly over `months` (the part still waiting earns the cash rate). Both at the same expected return, so the
// gap is what spreading it out is expected to cost; the money still waiting each month shows the risk it takes off.
function qcDca({ amount = null, months = null, ret = null, cashRate = 0 } = {}) {
  if (!(amount > 0) || !(months >= 1) || ret == null) return { ready: false };
  const g = qcMonthlyOf(ret), c = (cashRate ?? 0) / 12, piece = amount / months;
  const lump = amount * (1 + g) ** months;
  let invested = 0, cash = amount, waiting = 0;
  for (let k = 0; k < months; k++) { cash -= piece; invested += piece; waiting += cash; invested *= 1 + g; cash *= 1 + c; }
  const spread = invested + cash;
  return { ready: true, amount, months, ret, cashRate: cashRate ?? 0, piece, lump, spread, gap: lump - spread, averageWaiting: waiting / months };
}

// An extended warranty: its price next to what the repair would cost times the chance it is needed in the covered years.
function qcWarranty({ price = null, repair = null, chance = null } = {}) {
  if (!(price > 0) || !(repair > 0) || chance == null || chance < 0) return { ready: false };
  const expected = repair * Math.min(1, chance), evenChance = price / repair;
  return { ready: true, price, repair, chance: Math.min(1, chance), expected, gap: price - expected, evenChance, pays: expected > price };
}

// Cost per use ("girl math", made honest): the price less what it sells for after, over the times it is used.
function qcPerUse({ price = null, resale = 0, uses = null } = {}) {
  if (!(price > 0) || !(uses > 0)) return { ready: false };
  const back = Math.min(price, Math.max(0, resale ?? 0)), kept = price - back;
  return { ready: true, price, resale: back, uses, kept, perUse: kept / uses, plain: price / uses };
}

// Return on Hassle: what a money task pays for each hour it takes, next to what an hour of work pays you.
// per: 'once' (a one-time saving) or 'year' (a saving that repeats, the hours each year too).
function qcHassle({ saved = null, hours = null, wage = null, per = 'once' } = {}) {
  if (!(saved > 0) || !(hours > 0)) return { ready: false };
  const perHour = saved / hours;
  return { ready: true, saved, hours, per, perHour, wage: wage > 0 ? wage : null, times: wage > 0 ? perHour / wage : null };
}

// Was it worth it, or is it worth it: one tool, two directions. The price in hours of work and per use; looking back
// (after) with the times it was really used, looking ahead (before) with the times it would be.
function qcWorth({ direction = 'before', price = null, resale = 0, uses = null, wage = null } = {}) {
  const U = qcPerUse({ price, resale, uses });
  if (!U.ready || !(wage > 0)) return { ready: false };
  return { ...U, ready: true, direction, wage, hours: U.kept / wage, hoursPerUse: U.perUse / wage };
}

// Personal inflation from the spending mix: each part's share of the month times how fast its prices moved, added up.
// parts: [{ key, amount, change }]; a part with no amount is left out, one with no change is listed as missing.
function qcInflation({ parts = [], planRate = null } = {}) {
  const used = parts.filter(p => p.amount > 0);
  const total = used.reduce((s, p) => s + p.amount, 0);
  const missing = used.filter(p => p.change == null).map(p => p.key);
  if (!(total > 0) || missing.length) return { ready: false, missing };
  const rows = used.map(p => ({ key: p.key, amount: p.amount, change: p.change, share: p.amount / total, adds: p.amount / total * p.change }));
  const rate = rows.reduce((s, r) => s + r.adds, 0), top = [...rows].sort((a, b) => b.adds - a.adds)[0];
  return { ready: true, total, rows, rate, top, planRate, gap: planRate == null ? null : rate - planRate, yearMore: total * 12 * rate };
}

// Starting at one age or another (the compound interest time machine, and the cost of waiting): the same amount a
// month from each age to `to`, at the plan's return after inflation. catchUp: what the later start needs a month to
// end at the same place.
function qcStart({ monthly = null, ageA = null, ageB = null, to = 65, ret = null } = {}) {
  if (!(monthly > 0) || !(ageA > 0) || !(ageB > 0) || ret == null || ageA >= to) return { ready: false };
  const fv = age => qcInvested(monthly, ret, (to - age) * 12);
  const early = Math.min(ageA, ageB), late = Math.max(ageA, ageB), a = fv(early), b = fv(late);
  const factor = b > 0 ? a / b : null;
  return { ready: true, monthly, early, late, to, ret, a, b, gap: a - b, putA: monthly * Math.max(0, to - early) * 12, putB: monthly * Math.max(0, to - late) * 12,
    catchUp: factor == null ? null : monthly * factor, waitYears: late - early, perYearWaited: late > early ? (a - b) / (late - early) : 0 };
}

// Cut it or invest it (the "$30k / $90k" rule of thumb, Eli: "30k is cutting 100; 90k is if you invested that 100";
// "keep it as round but basically it's 1/3"): a monthly cost cut and kept, with no growth, next to the same amount
// invested every month. The headline is round: at the rule's own years and return it is the round rule, scaled by the
// amount; at any other tap it is the worked figure, rounded to two figures. kept and invested are the exact figures
// (Show the math). times: what investing it is worth next to cutting it; oneIn: the same as "1 / 3", when it is 2 or more.
const QC_CUT_RULE = { monthly: 100, kept: 30000, invested: 90000, years: 30, ret: 0.07 };
const QC_CUT_SOURCE = 'Eli\'s rule of thumb (SLAM; QUESTIONS 608 (a), answered Nov 26 2026): cutting $100 a month is about $30,000, investing that $100 is about $90,000, so cutting is about a third of investing; round on purpose. The exact figures next to it are the amount x 12 x the years, and the same amount invested monthly at 7% a year after inflation for 30 years';
const qcRound = v => { if (!(v > 0)) return 0; const p = 10 ** Math.max(0, Math.floor(Math.log10(v)) - 1); return Math.round(v / p) * p; };
function qcCutInvest({ monthly = null, years = QC_CUT_RULE.years, ret = QC_CUT_RULE.ret, rule = QC_CUT_RULE } = {}) {
  if (!(monthly > 0) || !(years > 0) || ret == null) return { ready: false };
  const months = years * 12, kept = qcInvested(monthly, 0, months), invested = qcInvested(monthly, ret, months);
  const atRule = years === rule.years && Math.abs(ret - rule.ret) < 1e-9, per = monthly / rule.monthly, ratio = invested / kept;
  return { ready: true, monthly, years, ret, months, kept, invested, growth: invested - kept, ratio, atRule,
    roundKept: qcRound(atRule ? rule.kept * per : kept), roundInvested: qcRound(atRule ? rule.invested * per : invested),
    times: ratio >= 2 ? Math.round(ratio) : Math.round(ratio * 10) / 10, oneIn: ratio >= 1.5 ? Math.round(ratio) : null };
}

// Kids: a year of a child's costs by age, from the person's own amounts for each stage, until 18.
const QC_KID_STAGES = [{ key: 'little', from: 0, to: 4, label: 'Ages 0 to 4' }, { key: 'school', from: 5, to: 12, label: 'Ages 5 to 12' }, { key: 'teen', from: 13, to: 17, label: 'Ages 13 to 17' }];
function qcKids({ age = null, little = null, school = null, teen = null, until = 18 } = {}) {
  const yearly = { little, school, teen };
  if (age == null || age < 0 || age >= until || Object.values(yearly).some(v => v == null || v < 0)) return { ready: false };
  const stageOf = a => QC_KID_STAGES.find(s => a >= s.from && a <= s.to);
  const years = [];
  for (let a = Math.floor(age); a < until; a++) years.push({ age: a, cost: yearly[stageOf(a).key] });
  const left = years.reduce((s, y) => s + y.cost, 0), now = years[0].cost, peak = years.reduce((m, y) => (y.cost > m.cost ? y : m), years[0]);
  return { ready: true, age, years, left, now, monthNow: now / 12, peak, stages: QC_KID_STAGES.map(s => ({ ...s, yearly: yearly[s.key], years: years.filter(y => y.age >= s.from && y.age <= s.to).length })) };
}

// A pet: what it costs to bring home, a month, a year with the vet, and over the years the person expects.
function qcPet({ upfront = 0, monthly = null, vet = 0, years = null } = {}) {
  if (!(monthly >= 0) || monthly == null || !(years > 0)) return { ready: false };
  const up = upfront ?? 0, v = vet ?? 0, year = monthly * 12 + v;
  return { ready: true, upfront: up, monthly, vet: v, years, year, firstYear: up + year, lifetime: up + year * years, monthAll: year / 12 };
}

// A first apartment: the cash it takes to get the keys (first month, the deposit, a last month if asked, a broker
// fee, moving and setting up) and what it takes a month after.
function qcApartment({ rent = null, depositMonths = 1, lastMonth = 0, brokerMonths = 0, moving = 0, setup = 0, monthlyOther = 0 } = {}) {
  if (!(rent > 0)) return { ready: false };
  const lines = [['First month', rent], ['Security deposit', rent * (depositMonths ?? 0)], ['Last month up front', rent * (lastMonth ?? 0)], ['Broker fee', rent * (brokerMonths ?? 0)], ['Moving', moving ?? 0], ['Setting up (furniture, kitchen, the basics)', setup ?? 0]];
  const keys = lines.reduce((s, l) => s + l[1], 0), back = rent * (depositMonths ?? 0);
  return { ready: true, rent, lines: lines.filter(l => l[1] > 0), keys, back, gone: keys - back - rent * (lastMonth ?? 0) - rent, month: rent + (monthlyOther ?? 0), monthlyOther: monthlyOther ?? 0, rentTimes: keys / rent };
}

// Unemployment in New York (NY DOL): with four quarters of wages, the weekly rate is the high quarter's wages over 26
// (over 25 at or under the line), no less than the floor and no more than the most a week. rules: the dated numbers
// from data/reference-2026.json (limits.unemployment.NY), passed in.
// known: the weekly rate from the person's own letter (the monetary determination), used as it is when typed.
function qcUiNy({ highQuarter = null, known = null, rules = null } = {}) {
  if (!rules) return { ready: false };
  if (known > 0) return { ready: true, fromLetter: true, highQuarter, weekly: known, weeks: rules.weeks, total: known * rules.weeks, monthly: known * 52 / 12, capped: false, floored: false };
  if (!(highQuarter > 0)) return { ready: false };
  const high = highQuarter > rules.lowLine, raw = highQuarter / (high ? rules.divisorHigh : rules.divisorLow);
  const floor = high ? rules.minWeekly : rules.minWeeklyLow, weekly = Math.min(rules.maxWeekly, Math.max(floor, raw));
  return { ready: true, fromLetter: false, highQuarter, high, raw, weekly, capped: raw > rules.maxWeekly, floored: raw < floor, weeks: rules.weeks, total: weekly * rules.weeks, monthly: weekly * 52 / 12 };
}
// How long cash lasts when a weekly benefit comes in for its weeks, then stops. keep: the share of the benefit kept
// after any tax withheld (1 with none).
function qcBenefitRunway({ cash = null, spending = null, weekly = 0, weeks = 0, keep = 1, cut = 0 } = {}) {
  if (!(cash >= 0) || cash == null || !(spending > 0)) return { ready: false };
  const out = spending * (1 - (cut ?? 0)), inMonth = (weekly ?? 0) * (keep ?? 1) * 52 / 12, benefitMonths = (weeks ?? 0) * 12 / 52, gap1 = out - inMonth;
  let months;
  if (gap1 <= 0) { const left = cash + -gap1 * benefitMonths; months = benefitMonths + left / out; }
  else if (cash / gap1 <= benefitMonths) months = cash / gap1;
  else months = benefitMonths + (cash - gap1 * benefitMonths) / out;
  const without = cash / out;
  return { ready: true, cash, out, inMonth, benefitMonths, months, without, added: months - without, whole: Math.floor(months) };
}
