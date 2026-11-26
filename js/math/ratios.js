// SPDX-License-Identifier: AGPL-3.0-only
// Ratios on Key numbers (run Not built, groups 1 to 5, Part 9, Nov 26 2026). One function for each ratio, for the web
// app (Report › Overview, the section Ratios) and the game (Key numbers, the part Ratios; game/core/ratios.js is a copy
// made by tools/game_ratios_build.mjs). Pure: plain numbers in, a plain result out. It reads no household and no
// screen, and it works out none of its inputs: each app hands in the numbers it already has (net worth, cash, debts,
// income, spending, fixed and variable, the home, the confidence rating).
// A result: { id, value, unit, needs, level, parts, none }. value null with needs: an input is missing ("needs X",
// never 0). value null with none: the ratio has nothing to measure (no short-term debt to cover, net worth at or under
// zero), with the plain reason. level: Guess, Close or Exact, the lowest level of the inputs. parts: the numbers of
// Show the math, [label, value, unit]. No verdict: a rule of thumb shows only where a widely used one exists, with its
// source and date (RA_LINES), and never as a grade.
// No imports, on purpose: the game has classic scripts and no modules.

export const RA_LEVELS = ['Guess', 'Close', 'Exact'];
// The lowest level of the inputs. An input with no level (a rate of the plan, an age) does not lower it.
export function raLevel(levels) {
  const ix = (levels || []).filter(l => RA_LEVELS.includes(l)).map(l => RA_LEVELS.indexOf(l));
  return ix.length ? RA_LEVELS[Math.min(...ix)] : 'Exact';
}
const raBlank = v => v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v));
const raRes = (id, value, unit, parts, levels, extra = {}) => ({ id, value, unit, needs: [], level: raLevel(levels), parts, none: null, ...extra });
const raNeed = (id, unit, list) => ({ id, value: null, unit, needs: list, level: null, parts: [], none: null });
const raNone = (id, unit, why, parts = [], levels = []) => ({ id, value: null, unit, needs: [], level: raLevel(levels), parts, none: why });
const raWant = (o, words) => Object.keys(words).filter(k => raBlank(o[k])).map(k => words[k]);

export const RA_GROUPS = [
  ['cash', 'Cash and cover'],
  ['debt', 'Debt and credit'],
  ['home', 'Home'],
  ['flow', 'Money in and out'],
  ['earn', 'Earning'],
  ['grow', 'Wealth and later'],
  ['feel', 'How it feels'],
];
// One line each: the group, the name, the formula in words, the plain sentence, and a rule of thumb only where a widely
// used one exists (its source named and dated).
export const RA_LINES = [
  { id: 'current', g: 'cash', n: 'Current ratio', f: 'Cash ÷ short-term debt (cards, buy now pay later, payday, medical, personal and family loans)', s: 'How many times your cash could pay off the debts that come due soonest.' },
  { id: 'health', g: 'cash', n: 'Healthcare reserve', f: '(Cash + HSA) ÷ your health plan\'s out-of-pocket max', s: 'How many times your cash and HSA could cover the most your health plan asks you to pay in a year.' },
  { id: 'selfins', g: 'cash', n: 'Self-insurance threshold', f: 'Cash − your emergency fund target', s: 'The cash past your emergency fund: what you could pay yourself before insurance would need to.' },
  { id: 'solvency', g: 'debt', n: 'Solvency', f: 'Net worth ÷ everything you own', s: 'The share of what you own that is yours free and clear.' },
  { id: 'revolving', g: 'debt', n: 'Revolving vs installment', f: 'Revolving balances (cards, lines of credit) ÷ all you owe', s: 'How much of what you owe has no set end date.' },
  { id: 'mix', g: 'debt', n: 'Credit mix', f: 'The kinds you carry, of three: revolving, installment, mortgage', s: 'How many kinds of credit are on your report.', rule: { text: 'FICO weighs credit mix as about 10% of the score, and says it is not necessary to have one of each.', source: 'myFICO, What\'s in my FICO Scores', date: '2026-11-26' } },
  { id: 'intprin', g: 'debt', n: 'Interest to principal', f: 'This month\'s interest ÷ the part of this month\'s payments that pays down the balance', s: 'For each dollar that pays a debt down this month, how much goes to interest.' },
  { id: 'equity', g: 'home', n: 'Home equity', f: 'Home value − mortgage balance', s: 'The part of your home you own.' },
  { id: 'ltv', g: 'home', n: 'Loan to value (LTV)', f: 'Mortgage balance ÷ home value', s: 'How much of your home\'s value is still borrowed.', rule: { text: 'On most conventional loans you can ask to drop PMI at 80% of the original value, and it ends by itself at 78%.', source: 'CFPB, When can I remove private mortgage insurance (PMI) from my loan?', date: '2026-11-26' } },
  { id: 'priceinc', g: 'home', n: 'Price to income', f: 'Home value ÷ pay before taxes a year', s: 'Your home\'s value in years of pay.' },
  { id: 'realestate', g: 'home', n: 'Real estate concentration', f: 'Real estate ÷ everything you own', s: 'How much of what you own is property.' },
  { id: 'discretionary', g: 'flow', n: 'Discretionary income', f: 'Take-home pay − fixed spending, a month', s: 'What is left each month after the costs that do not change.' },
  { id: 'fixedvar', g: 'flow', n: 'Fixed vs variable', f: 'Fixed spending ÷ all spending', s: 'How much of your spending is set, and how much moves month to month.' },
  { id: 'volatility', g: 'flow', n: 'Spending volatility', f: 'How far a month\'s spending moves from the average month (standard deviation ÷ average)', s: 'How much your spending swings from month to month.' },
  { id: 'side', g: 'earn', n: 'Side income share', f: 'Side income ÷ everything coming in', s: 'The share of what comes in that you built yourself.' },
  { id: 'totalcomp', g: 'earn', n: 'Total comp to base', f: '(Base pay + bonus + the job\'s match) ÷ base pay, a year', s: 'What the job pays in all, for each dollar of base pay.' },
  { id: 'realwage', g: 'earn', n: 'Real wage growth', f: '(1 + income growth) ÷ (1 + price growth) − 1', s: 'How much your pay grew after prices.' },
  { id: 'replace', g: 'earn', n: 'Income replacement', f: 'Spending after work a year ÷ pay before taxes a year', s: 'The share of today\'s pay your plan needs to replace after work.' },
  { id: 'investnw', g: 'grow', n: 'Investment to net worth', f: 'Invested ÷ net worth', s: 'How much of your net worth is invested and growing.' },
  { id: 'nwincome', g: 'grow', n: 'Net worth to income', f: 'Net worth ÷ pay before taxes a year', s: 'Your net worth in years of pay.' },
  { id: 'human', g: 'grow', n: 'Human capital to financial capital', f: 'Pay before taxes until your stop age, in today\'s money at your return ÷ (cash + invested)', s: 'Your future pay next to the money you already have.' },
  { id: 'shelter', g: 'grow', n: 'Tax efficiency', f: 'Invested in tax-advantaged accounts (retirement plans, IRAs, HSA, 529) ÷ all invested', s: 'The share of what you invest that grows with a tax break.' },
  { id: 'longevity', g: 'grow', n: 'Longevity cover', f: '(Invested ÷ spending after work a year) ÷ (plan-to age − stop age)', s: 'The years your investments cover today, next to the years after work to plan for.' },
  { id: 'windfall', g: 'grow', n: 'Windfall allocation', f: '(Cushion + debt + invested) ÷ (the windfall − tax on it)', s: 'The share of a windfall that goes to your future.' },
  { id: 'confidence', g: 'feel', n: 'Financial confidence', f: 'Your own rating, next to the share of your key numbers already in a good place', s: 'How sure you feel, next to what the numbers say.' },
];
// The ratios on the list that need an input neither app has yet. Shown in What isn't here yet, never as a 0.
export const RA_LATER = [
  ['Tax drag', 'needs what your taxable investments paid out in dividends and gains this year'],
];
export const RA_REVOLVING = ['Credit card', 'Line of credit', 'HELOC'];
// One test of "revolving" and "short-term" for a debt's type, so both apps sort their debts the same way.
export const raIsRevolving = k => /card|line of credit|heloc/i.test(String(k || ''));
export const raIsShort = k => /card|later|payday|cash advance|medical|personal|famil|friend/i.test(String(k || ''));
export const RA_VOL_MONTHS = { min: 3, close: 6, exact: 12 };
export const RA_CONF_NEAR = 0.2; // a rating within 20 points of the numbers' share reads as "line up"

// ---------- cash and cover ----------
export function raCurrent({ cash = null, shortDebt = null, levels = [] } = {}) {
  const m = raWant({ cash, shortDebt }, { cash: 'your cash', shortDebt: 'your debts' });
  if (m.length) return raNeed('current', 'x', m);
  const parts = [['Cash', cash, 'money'], ['Short-term debt', shortDebt, 'money']];
  if (!(shortDebt > 0)) return raNone('current', 'x', 'No short-term debt, so there is nothing for the cash to cover', parts, levels);
  return raRes('current', cash / shortDebt, 'x', parts, levels);
}
export function raHealth({ cash = null, hsa = 0, oopMax = null, levels = [] } = {}) {
  const m = raWant({ cash, oopMax }, { cash: 'your cash', oopMax: 'your health plan\'s out-of-pocket max' });
  if (m.length) return raNeed('health', 'x', m);
  const parts = [['Cash', cash, 'money'], ['HSA', hsa || 0, 'money'], ['Out-of-pocket max', oopMax, 'money']];
  if (!(oopMax > 0)) return raNone('health', 'x', 'Your plan\'s out-of-pocket max is $0, so there is nothing to cover', parts, levels);
  return raRes('health', (cash + (hsa || 0)) / oopMax, 'x', parts, levels);
}
export function raSelfInsure({ cash = null, target = null, levels = [] } = {}) {
  const m = raWant({ cash, target }, { cash: 'your cash', target: 'your emergency fund target' });
  if (m.length) return raNeed('selfins', 'money', m);
  return raRes('selfins', cash - target, 'money', [['Cash', cash, 'money'], ['Emergency fund target', target, 'money']], levels);
}

// ---------- debt and credit ----------
export function raSolvency({ netWorth = null, assets = null, levels = [] } = {}) {
  const m = raWant({ netWorth, assets }, { netWorth: 'your net worth', assets: 'what you own' });
  if (m.length) return raNeed('solvency', 'pct', m);
  const parts = [['Net worth', netWorth, 'money'], ['Everything you own', assets, 'money']];
  if (!(assets > 0)) return raNone('solvency', 'pct', 'Nothing owned yet to measure against', parts, levels);
  return raRes('solvency', netWorth / assets, 'pct', parts, levels);
}
export function raRevolving({ revolving = null, total = null, levels = [] } = {}) {
  const m = raWant({ revolving, total }, { revolving: 'your debts', total: 'your debts' });
  if (m.length) return raNeed('revolving', 'pct', [...new Set(m)]);
  const parts = [['Revolving', revolving, 'money'], ['Installment and the rest', total - revolving, 'money'], ['All you owe', total, 'money']];
  if (!(total > 0)) return raNone('revolving', 'pct', 'No debt', parts, levels);
  return raRes('revolving', revolving / total, 'pct', parts, levels);
}
// kinds: the debt types carried (with a balance). debtsKnown false: the debts are not in yet.
export function raCreditMix({ kinds = null, levels = [] } = {}) {
  if (!Array.isArray(kinds)) return raNeed('mix', 'count', ['your debts']);
  const has = { revolving: false, installment: false, mortgage: false };
  for (const k of kinds) {
    if (/mortgage/i.test(k)) has.mortgage = true;
    else if (raIsRevolving(k)) has.revolving = true;
    else has.installment = true;
  }
  const n = Object.values(has).filter(Boolean).length;
  return raRes('mix', n, 'count', [['Revolving', has.revolving ? 1 : 0, 'yesno'], ['Installment', has.installment ? 1 : 0, 'yesno'], ['Mortgage', has.mortgage ? 1 : 0, 'yesno']], levels, { kinds: has });
}
// debts: [{ balance, apr (a fraction, 0.2 is 20%), payment }] with a balance.
export function raInterestPrincipal({ debts = null, levels = [] } = {}) {
  if (!Array.isArray(debts)) return raNeed('intprin', 'x', ['your debts']);
  const live = debts.filter(d => d && d.balance > 0);
  if (!live.length) return raNone('intprin', 'x', 'No debt', [], levels);
  const m = [];
  if (live.some(d => raBlank(d.apr))) m.push('each debt\'s rate');
  if (live.some(d => raBlank(d.payment))) m.push('each debt\'s payment');
  if (m.length) return raNeed('intprin', 'x', m);
  const interest = live.reduce((s, d) => s + d.balance * d.apr / 12, 0);
  const pay = live.reduce((s, d) => s + d.payment, 0);
  const principal = pay - interest;
  const parts = [['Interest this month', interest, 'money'], ['Payments this month', pay, 'money'], ['Pays down the balance', principal, 'money']];
  if (!(principal > 0)) return raNone('intprin', 'x', 'This month\'s payments only cover the interest, so the balance does not go down yet', parts, levels);
  return raRes('intprin', interest / principal, 'x', parts, levels);
}

// ---------- home ----------
export function raHomeEquity({ homeValue = null, mortgage = null, netWorth = null, levels = [] } = {}) {
  const m = raWant({ homeValue, mortgage }, { homeValue: 'your home\'s value', mortgage: 'your mortgage balance' });
  if (m.length) return raNeed('equity', 'money', m);
  const eq = homeValue - mortgage;
  return raRes('equity', eq, 'money', [['Home value', homeValue, 'money'], ['Mortgage balance', mortgage, 'money']], levels, { shareOfNetWorth: netWorth > 0 ? eq / netWorth : null });
}
export function raLtv({ mortgage = null, homeValue = null, levels = [] } = {}) {
  const m = raWant({ mortgage, homeValue }, { mortgage: 'your mortgage balance', homeValue: 'your home\'s value' });
  if (m.length) return raNeed('ltv', 'pct', m);
  const parts = [['Mortgage balance', mortgage, 'money'], ['Home value', homeValue, 'money']];
  if (!(homeValue > 0)) return raNone('ltv', 'pct', 'A home value of $0 has nothing to measure against', parts, levels);
  return raRes('ltv', mortgage / homeValue, 'pct', parts, levels);
}
export function raPriceIncome({ homeValue = null, grossYear = null, levels = [] } = {}) {
  const m = raWant({ homeValue, grossYear }, { homeValue: 'your home\'s value', grossYear: 'your pay before taxes' });
  if (m.length) return raNeed('priceinc', 'x', m);
  const parts = [['Home value', homeValue, 'money'], ['Pay before taxes a year', grossYear, 'money']];
  if (!(grossYear > 0)) return raNone('priceinc', 'x', 'No pay coming in to measure against', parts, levels);
  return raRes('priceinc', homeValue / grossYear, 'x', parts, levels);
}
export function raRealEstate({ realEstate = null, assets = null, levels = [] } = {}) {
  const m = raWant({ realEstate, assets }, { realEstate: 'your home\'s value', assets: 'what you own' });
  if (m.length) return raNeed('realestate', 'pct', m);
  const parts = [['Real estate', realEstate, 'money'], ['Everything you own', assets, 'money']];
  if (!(assets > 0)) return raNone('realestate', 'pct', 'Nothing owned yet to measure against', parts, levels);
  return raRes('realestate', realEstate / assets, 'pct', parts, levels);
}

// ---------- money in and out ----------
export function raDiscretionary({ takeHome = null, fixed = null, levels = [] } = {}) {
  const m = raWant({ takeHome, fixed }, { takeHome: 'your take-home pay', fixed: 'your fixed spending' });
  if (m.length) return raNeed('discretionary', 'money', m);
  return raRes('discretionary', takeHome - fixed, 'money', [['Take-home pay', takeHome, 'money'], ['Fixed spending', fixed, 'money']], levels, { share: takeHome > 0 ? (takeHome - fixed) / takeHome : null });
}
export function raFixedShare({ fixed = null, variable = null, levels = [] } = {}) {
  const m = raWant({ fixed, variable }, { fixed: 'your spending split into fixed and variable', variable: 'your spending split into fixed and variable' });
  if (m.length) return raNeed('fixedvar', 'pct', [...new Set(m)]);
  const parts = [['Fixed', fixed, 'money'], ['Variable', variable, 'money']];
  if (!(fixed + variable > 0)) return raNone('fixedvar', 'pct', 'No spending yet', parts, levels);
  return raRes('fixedvar', fixed / (fixed + variable), 'pct', parts, levels);
}
// rows: the ledger as both apps hand it to Lifestyle creep ({ d: 'YYYY-MM' or a date, amt, kind: 'out' | 'in' }).
// A month with nothing logged is left out, never a $0 month.
export function raVolatility({ rows = null } = {}) {
  const by = {};
  for (const r of rows || []) {
    if (!r || r.kind !== 'out' || typeof r.amt !== 'number' || !Number.isFinite(r.amt) || !r.d) continue;
    const ym = String(r.d).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    by[ym] = (by[ym] || 0) + r.amt;
  }
  const months = Object.keys(by).sort().slice(-12), vals = months.map(k => by[k]);
  if (vals.length < RA_VOL_MONTHS.min) return { ...raNeed('volatility', 'pct', [`at least ${RA_VOL_MONTHS.min} months of spending in the log`]), months: vals.length };
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((s, v) => s + (v - avg) * (v - avg), 0) / vals.length);
  const level = vals.length >= RA_VOL_MONTHS.exact ? 'Exact' : vals.length >= RA_VOL_MONTHS.close ? 'Close' : 'Guess';
  const parts = [['Months counted', vals.length, 'count'], ['Average month', avg, 'money'], ['Typical swing (standard deviation)', sd, 'money']];
  if (!(avg > 0)) return raNone('volatility', 'pct', 'No spending in those months', parts, [level]);
  return raRes('volatility', sd / avg, 'pct', parts, [level], { months: vals.length, low: Math.min(...vals), high: Math.max(...vals) });
}

// ---------- earning ----------
export function raSideShare({ side = null, total = null, levels = [] } = {}) {
  const m = raWant({ side, total }, { side: 'what comes in', total: 'what comes in' });
  if (m.length) return raNeed('side', 'pct', ['what comes in']);
  const parts = [['Side income', side, 'money'], ['Everything coming in', total, 'money']];
  if (!(total > 0)) return raNone('side', 'pct', 'Nothing coming in yet', parts, levels);
  return raRes('side', side / total, 'pct', parts, levels);
}
export function raTotalComp({ base = null, bonus = 0, match = 0, levels = [] } = {}) {
  if (raBlank(base)) return raNeed('totalcomp', 'x', ['your base pay']);
  if (match === null) return raNeed('totalcomp', 'x', ['what your job adds to your plan']);
  const parts = [['Base pay a year', base, 'money'], ['Bonus a year', bonus || 0, 'money'], ['The job\'s match a year', match || 0, 'money']];
  if (!(base > 0)) return raNone('totalcomp', 'x', 'No base pay from a job', parts, levels);
  return raRes('totalcomp', (base + (bonus || 0) + (match || 0)) / base, 'x', parts, levels);
}
export function raRealWage({ growth = null, inflation = null, levels = [] } = {}) {
  const m = raWant({ growth, inflation }, { growth: 'how much your pay grew', inflation: 'how much prices grew' });
  if (m.length) return raNeed('realwage', 'pct', m);
  return raRes('realwage', (1 + growth) / (1 + inflation) - 1, 'pct', [['Pay grew', growth, 'pct'], ['Prices grew', inflation, 'pct']], levels);
}
export function raReplacement({ spendYear = null, grossYear = null, levels = [] } = {}) {
  const m = raWant({ spendYear, grossYear }, { spendYear: 'your spending after work', grossYear: 'your pay before taxes' });
  if (m.length) return raNeed('replace', 'pct', m);
  const parts = [['Spending after work a year', spendYear, 'money'], ['Pay before taxes a year', grossYear, 'money']];
  if (!(grossYear > 0)) return raNone('replace', 'pct', 'No pay coming in to replace', parts, levels);
  return raRes('replace', spendYear / grossYear, 'pct', parts, levels);
}

// ---------- wealth and later ----------
export function raInvestNw({ invested = null, netWorth = null, levels = [] } = {}) {
  const m = raWant({ invested, netWorth }, { invested: 'what you have invested', netWorth: 'your net worth' });
  if (m.length) return raNeed('investnw', 'pct', m);
  const parts = [['Invested', invested, 'money'], ['Net worth', netWorth, 'money']];
  if (!(netWorth > 0)) return raNone('investnw', 'pct', 'Net worth is at or under $0, so this one waits until it is above', parts, levels);
  return raRes('investnw', invested / netWorth, 'pct', parts, levels);
}
export function raNwIncome({ netWorth = null, grossYear = null, levels = [] } = {}) {
  const m = raWant({ netWorth, grossYear }, { netWorth: 'your net worth', grossYear: 'your pay before taxes' });
  if (m.length) return raNeed('nwincome', 'x', m);
  const parts = [['Net worth', netWorth, 'money'], ['Pay before taxes a year', grossYear, 'money']];
  if (!(grossYear > 0)) return raNone('nwincome', 'x', 'No pay coming in to measure against', parts, levels);
  return raRes('nwincome', netWorth / grossYear, 'x', parts, levels);
}
// The future pay: the pay before taxes of each year until the stop age, brought back to today at the real return.
export function raHumanCapital({ grossYear = null, age = null, retireAge = null, realReturn = null, financial = null, levels = [] } = {}) {
  const m = raWant({ grossYear, age, financial }, { grossYear: 'your pay before taxes', age: 'your age', financial: 'your cash and investments' });
  if (m.length) return raNeed('human', 'x', m);
  const n = Math.max(0, (retireAge ?? age) - age), r = realReturn ?? 0;
  const pv = n === 0 ? 0 : r === 0 ? grossYear * n : grossYear * (1 - Math.pow(1 + r, -n)) / r;
  const parts = [['Pay before taxes a year', grossYear, 'money'], ['Years until your stop age', n, 'years'], ['Return after inflation', r, 'pct'], ['Future pay, in today\'s money', pv, 'money'], ['Cash and invested', financial, 'money']];
  if (!(financial > 0)) return raNone('human', 'x', 'No cash or investments yet, so all your capital is your future pay', parts, levels);
  return raRes('human', pv / financial, 'x', parts, levels, { future: pv });
}
export function raTaxShelter({ advantaged = null, invested = null, levels = [] } = {}) {
  const m = raWant({ advantaged, invested }, { advantaged: 'your investment accounts', invested: 'your investment accounts' });
  if (m.length) return raNeed('shelter', 'pct', ['your investment accounts']);
  const parts = [['In tax-advantaged accounts', advantaged, 'money'], ['All invested', invested, 'money']];
  if (!(invested > 0)) return raNone('shelter', 'pct', 'Nothing invested yet', parts, levels);
  return raRes('shelter', advantaged / invested, 'pct', parts, levels);
}
export function raLongevity({ invested = null, spendYear = null, age = null, retireAge = null, planAge = null, levels = [] } = {}) {
  const m = raWant({ invested, spendYear, age, planAge }, { invested: 'what you have invested', spendYear: 'your spending after work', age: 'your age', planAge: 'an age to plan to' });
  if (m.length) return raNeed('longevity', 'x', m);
  const start = Math.max(age, retireAge ?? age), years = planAge - start;
  const parts = [['Invested', invested, 'money'], ['Spending after work a year', spendYear, 'money'], ['Stop age', start, 'years'], ['Plan to age', planAge, 'years']];
  if (!(spendYear > 0)) return raNone('longevity', 'x', 'No spending after work to cover', parts, levels);
  if (!(years > 0)) return raNone('longevity', 'x', 'The plan-to age is not past the stop age', parts, levels);
  const covered = invested / spendYear;
  return raRes('longevity', covered / years, 'x', [...parts, ['Years covered today', covered, 'years'], ['Years to plan for', years, 'years']], levels, { covered, years });
}
export function raWindfall({ amount = null, toTax = 0, toFun = 0, toCash = 0, toDebt = 0, invested = 0, levels = [] } = {}) {
  if (raBlank(amount)) return raNeed('windfall', 'pct', ['a windfall amount']);
  const yours = amount - (toTax || 0), later = (toCash || 0) + (toDebt || 0) + (invested || 0);
  const parts = [['The windfall', amount, 'money'], ['Tax on it', toTax || 0, 'money'], ['Fun money', toFun || 0, 'money'], ['Cushion', toCash || 0, 'money'], ['Debt', toDebt || 0, 'money'], ['Invested', invested || 0, 'money']];
  if (!(yours > 0)) return raNone('windfall', 'pct', 'Nothing is left after tax', parts, levels);
  return raRes('windfall', later / yours, 'pct', parts, levels);
}
// The person's own rating (1 to max, by taps) next to what the numbers say (the share of key numbers in a good place).
// Kind words, no verdict: either side can be ahead, and each has a calm sentence.
export function raConfidence({ rating = null, max = 10, min = 1, good = null, of = null } = {}) {
  if (raBlank(rating)) return raNeed('confidence', 'pct', ['your own rating (one tap)']);
  const self = max > min ? (rating - min) / (max - min) : 0;
  if (raBlank(good) || !(of > 0)) return { ...raRes('confidence', self, 'pct', [['Your rating', rating, 'count'], ['Out of', max, 'count']], []), numbers: null, read: 'numbers' };
  const numbers = good / of, gap = numbers - self;
  const read = Math.abs(gap) <= RA_CONF_NEAR ? 'near' : gap > 0 ? 'ahead' : 'feeling';
  return { ...raRes('confidence', self, 'pct', [['Your rating', rating, 'count'], ['Out of', max, 'count'], ['Key numbers in a good place', good, 'count'], ['Key numbers with a read', of, 'count']], []), numbers, gap, read };
}
export const RA_CONF_WORDS = {
  numbers: 'Your rating is in. As more of your numbers firm up, they show next to it here.',
  near: 'How you feel and what your numbers show are close to each other.',
  ahead: 'Your numbers may be further along than it feels. That is common, and it is worth a moment to notice.',
  feeling: 'You feel sure about your money. A few of the numbers are still filling in, and they tend to follow with time.',
};
