// SPDX-License-Identifier: AGPL-3.0-only
// Investing (run Finish everything partly built, Part 13; M8I). One engine for invest.html of the web app and the
// game (tools/game_invest_build.mjs copies it to game/core/invest.js). Four pieces:
//   ivMix    the household mix: every account added up by what is inside, the stock share next to a target (the
//            person's own, else an age guide the caller names), the three-fund check, and concentration (employer
//            stock and any one company).
//   ivFees   the fee and product X-ray: every fund, its fee a year in dollars, a sales charge (load), the account
//            fees and an advisor fee, added up.
//   ivHeat   invest or pay debt: one small grid of debt rate x return, in dollars on the same amount.
//   ivRoth   Roth or traditional, account by account: the marginal rate now (federal + state + city) next to an
//            estimated rate in retirement, through crRothTrad of js/math/career.js (the launch window's rule).
// Holdings are only what the person enters or imports: nothing here fetches a price or a fund fee. A fund fee is the
// person's own number; a fund with no fee typed shows as "no fee yet", never a made-up one. The three-fund check is a
// plain comparison of what is held with the three kinds a three-fund mix holds; it is not advice.
// The only import is crRothTrad: the game already has it as a global (game/core/career.js), so the build tool drops
// this one line.
import { crRothTrad } from './career.js';

// The rules, each with its source (registered in js/registry/assumptions.js).
export const IV_RULES = {
  oneStock: 0.10, // one company's stock, the employer's included, over this share of all investments gets a line
  drift: 0.05, // the stock share more than 5 points from the target gets a line (the same 5 points as portfolio.js)
  heatYears: 5, // the grid compares five years
  heatAmount: 1000, // on $1,000
  heatRates: [0.03, 0.05, 0.07, 0.1, 0.15, 0.2, 0.25], // debt rates down the side (APR)
  heatReturns: [0.03, 0.05, 0.07, 0.09], // yearly returns across the top
};
export const IV_SOURCES = {
  oneStock: 'FINRA, "Love Your Company Stock? Here\'s What to Know" (finra.org/investors/insights, read Nov 26 2026): some experts say to keep no more than 10 percent of all your investments in one stock, your company\'s stock included, and that this could be too high for some people',
  threeFund: 'The three-fund portfolio (a US total stock market fund, an international total stock fund, a total bond fund), as the Bogleheads wiki describes it (bogleheads.org/wiki/Three-fund_portfolio, read Nov 26 2026)',
  drift: 'SLAM rule (js/math/portfolio.js DRIFT_POINTS, 5 points)',
  heat: 'SLAM rule (js/math/invest.js): $1,000 for 5 years; the debt at its APR compounded each month, the return compounded each year',
};
// THE AGE GUIDE: the glide path of the Vanguard Target Retirement funds, as Vanguard publishes it: 90% stocks until
// 25 years before the stop age, then less each year to 50% at the stop age, and 30% seven years after (then flat).
export const IV_GUIDE_SOURCE = 'Vanguard Target Retirement glide path';
export function ivGuide(age, ret = 65) {
  const lead = (ret ?? 65) - age;
  const stock = lead >= 25 ? 0.9 : lead >= 0 ? 0.5 + 0.4 * (lead / 25) : Math.max(0.3, 0.5 - 0.2 * Math.min(1, -lead / 7));
  return { stock, bond: 1 - stock, source: IV_GUIDE_SOURCE };
}
// What can be inside, as the household mix counts it. stocks: a fund of stocks whose US and international split is
// not known (a target-date fund's stock part, an "all stocks" answer).
export const IV_CLASSES = [['us', 'US stocks'], ['intl', 'International stocks'], ['stocks', 'Stock funds, split not known'], ['bonds', 'Bonds'],
  ['cash', 'Cash'], ['single', 'Single company stocks'], ['crypto', 'Crypto'], ['realEstate', 'Real estate'], ['commodities', 'Commodities'], ['other', 'Other']];
const IV_STOCKY = ['us', 'intl', 'stocks', 'single'];
const IV_THREE = ['us', 'intl', 'stocks', 'bonds'];
const ivHas = v => v != null && Number.isFinite(Number(v));
const ivLc = t => (t.startsWith('US') ? t : t.charAt(0).toLowerCase() + t.slice(1));
const ivPct = v => `${Math.round(v * 100)}%`;
const IV_USD = v => `$${Math.round(v).toLocaleString('en-US')}`;

// THE HOUSEHOLD MIX. accounts: [{ id, name, amt, parts: { class: share } (shares of the account, adding to 1) or null
// when not known, holdings: [{ name, v (dollars), kind: 'employer' | 'stock' | 'fund' }] }]. target: the stock share
// the person picked (0 to 1), else null; guide: { stock, source } the caller's age guide, else null.
export function ivMix(accounts = [], { target = null, guide = null, money: m = IV_USD } = {}) {
  const rows = accounts.filter(a => ivHas(a.amt) && a.amt > 0);
  const total = rows.reduce((s, a) => s + Number(a.amt), 0);
  const dollars = Object.fromEntries(IV_CLASSES.map(([k]) => [k, 0]));
  let known = 0;
  for (const a of rows) {
    const p = a.parts;
    if (!p) continue;
    const sum = Object.values(p).reduce((s, v) => s + (ivHas(v) ? Number(v) : 0), 0);
    if (!(sum > 0)) continue;
    known += a.amt;
    for (const [k, v] of Object.entries(p)) if (ivHas(v) && v > 0) dollars[k in dollars ? k : 'other'] += (a.amt * v) / sum;
  }
  const unknown = total - known;
  const shares = Object.fromEntries(Object.entries(dollars).map(([k, v]) => [k, known > 0 ? v / known : null]));
  const stock = known > 0 ? IV_STOCKY.reduce((s, k) => s + shares[k], 0) : null;
  const bonds = known > 0 ? shares.bonds : null;
  // the target: the person's own stock share first, else the age guide
  const aim = ivHas(target) ? { stock: Number(target), source: 'your own target' } : guide && ivHas(guide.stock) ? { stock: guide.stock, source: guide.source || 'the age guide' } : null;
  const drift = stock != null && aim ? stock - aim.stock : null;
  const drifted = drift != null && Math.abs(drift) > IV_RULES.drift + 1e-9;
  // the three-fund check: the share in the three kinds, and what sits outside them
  const inside = known > 0 ? IV_THREE.reduce((s, k) => s + shares[k], 0) : null;
  const outside = known > 0 ? IV_CLASSES.filter(([k]) => !IV_THREE.includes(k) && shares[k] > 1e-9).map(([k, label]) => ({ k, label, share: shares[k], dollars: dollars[k] })) : [];
  const three = known > 0 ? [
    { k: 'us', label: 'A US total stock market fund', share: shares.us, held: shares.us > 1e-9 || shares.stocks > 1e-9, maybe: !(shares.us > 1e-9) && shares.stocks > 1e-9 },
    { k: 'intl', label: 'An international total stock fund', share: shares.intl, held: shares.intl > 1e-9 || shares.stocks > 1e-9, maybe: !(shares.intl > 1e-9) && shares.stocks > 1e-9 },
    { k: 'bonds', label: 'A total bond fund', share: shares.bonds, held: shares.bonds > 1e-9, maybe: false },
  ] : [];
  // concentration: the employer's stock, and the biggest one company, over all investments
  const held = rows.flatMap(a => (a.holdings || []).filter(x => ivHas(x.v) && x.v > 0).map(x => ({ ...x, account: a.name })));
  const employer = held.filter(x => x.kind === 'employer').reduce((s, x) => s + Number(x.v), 0);
  const companies = new Map();
  for (const x of held) if (x.kind === 'employer' || x.kind === 'stock') { const key = String(x.name || 'One company').trim().toLowerCase(); const o = companies.get(key) || { name: String(x.name || 'One company').trim(), v: 0, employer: false }; o.v += Number(x.v); o.employer = o.employer || x.kind === 'employer'; companies.set(key, o); }
  const biggest = [...companies.values()].sort((a, b) => b.v - a.v)[0] || null;
  const conc = {
    employer, employerShare: total > 0 ? employer / total : null,
    biggest: biggest ? { ...biggest, share: total > 0 ? biggest.v / total : null } : null,
    single: known > 0 ? shares.single : null,
    over: [...companies.values()].filter(o => total > 0 && o.v / total > IV_RULES.oneStock + 1e-9).map(o => ({ ...o, share: o.v / total })),
  };
  const lines = [];
  if (stock != null) lines.push(`${ivPct(stock)} of what you have invested is in stocks${aim ? `, next to ${ivPct(aim.stock)} from ${aim.source}` : ''}.`);
  if (drifted) lines.push(`That is ${Math.round(Math.abs(drift) * 100)} points ${drift > 0 ? 'more' : 'less'} in stocks than the target, past the ${Math.round(IV_RULES.drift * 100)} point line.`);
  if (inside != null) lines.push(`${ivPct(inside)} sits in the three kinds a three-fund mix holds${outside.length ? `; ${outside.map(o => `${ivLc(o.label)} ${ivPct(o.share)}`).join(', ')} ${outside.length === 1 ? 'sits' : 'sit'} outside them` : ''}.`);
  for (const o of conc.over) lines.push(`${o.employer ? `Your employer's stock (${o.name})` : o.name} is ${ivPct(o.share)} of all your investments. ${o.employer ? 'Your pay and these shares then ride on one company.' : 'One company can rise or fall a long way on its own.'}`);
  const math = [];
  if (total > 0) math.push(`All accounts: ${rows.map(a => `${a.name} ${m(a.amt)}`).join(' + ')} = ${m(total)}.`);
  if (known > 0) math.push(`Each class: each account's balance x its share of that class, added up, over the ${m(known)} whose mix is known.`);
  if (unknown > 0.5) math.push(`${m(unknown)} has no mix yet, so it is left out of the shares.`);
  if (stock != null) math.push(`Stocks: ${IV_STOCKY.filter(k => shares[k] > 1e-9).map(k => `${ivLc(IV_CLASSES.find(c => c[0] === k)[1])} ${ivPct(shares[k])}`).join(' + ') || '0%'} = ${ivPct(stock)}.`);
  if (drift != null) math.push(`Drift: ${ivPct(stock)} - ${ivPct(aim.stock)} = ${drift >= 0 ? '' : '-'}${Math.round(Math.abs(drift) * 100)} points; a line shows past ${Math.round(IV_RULES.drift * 100)}.`);
  if (biggest) math.push(`One company: ${biggest.name} ${m(biggest.v)} / ${m(total)} = ${ivPct(biggest.v / total)}; a line shows past ${ivPct(IV_RULES.oneStock)}.`);
  return { total, known, unknown, dollars, shares, stock, bonds, aim, drift, drifted, inside, outside, three, conc, lines, math, ready: known > 0 };
}

// THE FEE AND PRODUCT X-RAY. accounts: [{ name, amt, accountFee (dollars a year) or null, funds: [{ name, v (dollars),
// er (a share a year, 0.0003 is 0.03%) or null, load (a share, 0.0575 is 5.75%) or null }] }]. advisor: a share a year
// on everything, or null. A fund with no fee typed counts no dollars and is listed as "no fee yet".
export function ivFees(accounts = [], { advisor = null, money: m = IV_USD } = {}) {
  const rows = accounts.map(a => {
    const funds = (a.funds || []).filter(f => ivHas(f.v) && f.v > 0).map(f => ({ ...f, year: ivHas(f.er) ? f.v * f.er : null, per1000: ivHas(f.load) && f.load > 0 ? 1000 * f.load : null }));
    const fundYear = funds.reduce((s, f) => s + (f.year ?? 0), 0);
    const acctFee = ivHas(a.accountFee) ? Number(a.accountFee) : 0;
    const adv = ivHas(advisor) && ivHas(a.amt) ? a.amt * advisor : 0;
    return { name: a.name, amt: a.amt ?? 0, funds, fundYear, accountFee: acctFee, advisor: adv, year: fundYear + acctFee + adv, missing: funds.filter(f => f.year == null).map(f => f.name || 'A fund'), loads: funds.filter(f => f.per1000 != null) };
  });
  const total = rows.reduce((s, r) => s + (Number(r.amt) || 0), 0);
  const year = rows.reduce((s, r) => s + r.year, 0);
  const priced = rows.reduce((s, r) => s + r.funds.filter(f => f.year != null).reduce((t, f) => t + f.v, 0), 0);
  const missing = rows.flatMap(r => r.missing.map(n => `${n} (${r.name})`));
  const loads = rows.flatMap(r => r.loads.map(f => ({ ...f, account: r.name })));
  const lines = [];
  if (year > 0) lines.push(`Your funds and accounts cost about ${m(year)} a year${total > 0 ? `, ${(year / total * 100).toFixed(2)}% of ${m(total)}` : ''}.`);
  for (const f of loads) lines.push(`${f.name || 'A fund'} has a sales charge of ${(f.load * 100).toFixed(2)}%: of each $1,000 put in, ${m(f.per1000)} goes to the charge.`);
  if (missing.length) lines.push(`No fee yet for ${missing.join(', ')}. The fund page lists it as the expense ratio.`);
  const math = rows.filter(r => r.year > 0).map(r => `${r.name}: ${[...r.funds.filter(f => f.year != null).map(f => `${f.name || 'a fund'} ${m(f.v)} x ${(f.er * 100).toFixed(2)}%`), r.accountFee ? `account fee ${m(r.accountFee)}` : null, r.advisor ? `advisor ${m(r.amt)} x ${(advisor * 100).toFixed(2)}%` : null].filter(Boolean).join(' + ')} = ${m(r.year)} a year.`);
  return { rows, total, year, avg: total > 0 ? year / total : null, priced, missing, loads, lines, math };
}

// INVEST OR PAY DEBT. The same amount for the same years: paying a debt saves its interest (the APR compounded each
// month); investing earns the return (compounded each year). gap = what investing earns - what paying saves. A paid
// debt's saving is sure; a return is not. mine: the person's own debts [{ name, apr }] and return, placed on the grid.
export function ivHeatCell(apr, ret, { years = IV_RULES.heatYears, amount = IV_RULES.heatAmount } = {}) {
  const debt = amount * (Math.pow(1 + apr / 12, Math.round(years * 12)) - 1);
  const invest = amount * (Math.pow(1 + ret, years) - 1);
  const gap = invest - debt;
  return { apr, ret, debt, invest, gap, side: Math.abs(gap) < 0.5 ? 'even' : gap > 0 ? 'invest' : 'debt' };
}
export function ivHeat({ rates = IV_RULES.heatRates, returns = IV_RULES.heatReturns, years = IV_RULES.heatYears, amount = IV_RULES.heatAmount, debts = [], ret = null, money: m = IV_USD } = {}) {
  const mineRates = debts.filter(d => ivHas(d.apr) && d.apr > 0).map(d => Number(d.apr));
  const rs = [...new Set([...rates, ...mineRates].map(r => Math.round(r * 10000) / 10000))].sort((a, b) => a - b);
  const cols = ivHas(ret) && !returns.some(r => Math.abs(r - ret) < 1e-9) ? [...returns, Number(ret)].sort((a, b) => a - b) : returns;
  const grid = rs.map(apr => ({ apr, mine: mineRates.some(m => Math.abs(m - apr) < 1e-4), cells: cols.map(r => ({ ...ivHeatCell(apr, r, { years, amount }), mine: ivHas(ret) && Math.abs(r - ret) < 1e-9 })) }));
  const max = Math.max(1, ...grid.flatMap(g => g.cells.map(c => Math.abs(c.gap))));
  const yours = ivHas(ret) ? debts.filter(d => ivHas(d.apr) && d.apr > 0).map(d => ({ name: d.name, ...ivHeatCell(Number(d.apr), Number(ret), { years, amount }) })) : [];
  const lines = yours.map(y => `${y.name}: paying ${m(amount)} off saves ${m(y.debt)} of interest over ${years} years; investing it at ${ivPct(y.ret)} a year grows by about ${m(y.invest)}. ${y.side === 'debt' ? 'Paying the debt comes out ahead by' : y.side === 'invest' ? 'Investing comes out ahead by' : 'About even, a difference of'} ${m(Math.abs(y.gap))}, and the saving on the debt is sure.`);
  const math = [`Paying ${m(amount)} of a debt: ${m(amount)} x ((1 + APR / 12) ^ ${years * 12} - 1), the interest it no longer charges.`, `Investing ${m(amount)}: ${m(amount)} x ((1 + return) ^ ${years} - 1), before taxes on the gain.`, 'Each square: investing minus paying. A match at work is extra on top and is not in the grid.'];
  return { rates: rs, returns: cols, years, amount, grid, max, yours, lines, math };
}

// ROTH OR TRADITIONAL, ACCOUNT BY ACCOUNT. ivTaxKind: what the account is for taxes, and whether the next dollar has a
// choice. type: the account type (web) or the game's tap; taxType: Pretax, Roth or Both when the type does not say.
const IV_PLANS = new Set(['401(k)', '403(b)', '457', 'TSP', 'Solo 401(k)', 'plan']);
export function ivTaxKind(type, taxType = null) {
  if (IV_PLANS.has(type)) return { kind: taxType === 'Roth' ? 'roth' : taxType === 'Both' ? 'both' : taxType === 'Pretax' ? 'pretax' : 'plan', choice: 'plan', words: 'A plan at work: the next dollar can be traditional or Roth when the plan offers both.' };
  if (type === 'Roth IRA' || type === 'roth') return { kind: 'roth', choice: 'ira', words: 'A Roth IRA. The next IRA dollar can be Roth or traditional, inside the income limits.' };
  if (type === 'Traditional IRA' || type === 'ira') return { kind: 'pretax', choice: 'ira', words: 'A traditional IRA. The next IRA dollar can be Roth or traditional, inside the income limits.' };
  if (type === 'Rollover IRA' || type === 'SEP') return { kind: 'pretax', choice: null, words: 'Pre-tax money from before. New money usually goes somewhere else.' };
  if (type === 'HSA' || type === 'hsa') return { kind: 'hsa', choice: null, words: 'An HSA: a tax break going in and tax-free out for medical costs. Not a Roth or traditional choice.' };
  if (type === '529') return { kind: '529', choice: null, words: 'A 529: tax-free growth for school. Not a Roth or traditional choice.' };
  if (type === 'Brokerage' || type === 'Crypto' || type === 'taxable') return { kind: 'taxable', choice: null, words: 'A regular account: no tax break in, gains taxed when sold. Not a Roth or traditional choice.' };
  if (taxType === 'Roth') return { kind: 'roth', choice: null, words: 'Roth money.' };
  if (taxType === 'Pretax') return { kind: 'pretax', choice: null, words: 'Pre-tax money.' };
  return { kind: 'unknown', choice: null, words: 'Not sure what kind of account this is yet.' };
}
const ivRateOf = r => (r ? ['fed', 'state', 'local'].reduce((s, k) => s + (ivHas(r[k]) ? Number(r[k]) : 0), 0) : null);
const ivRateWords = r => `federal ${(100 * (r.fed ?? 0)).toFixed(0)}% + state ${(100 * (r.state ?? 0)).toFixed(1)}% + city ${(100 * (r.local ?? 0)).toFixed(1)}%`;
// accounts: [{ name, type, taxType, yearly (dollars put in a year, or null: worked per $1,000), now: { fed, state,
// local } (that owner's marginal rates now, shares) }]. later: { fed, state, local } the estimated rates in retirement.
export function ivRoth(accounts = [], { later = null, money: m = IV_USD } = {}) {
  const laterRate = ivRateOf(later);
  const rows = accounts.map(a => {
    const t = ivTaxKind(a.type, a.taxType), nowRate = ivRateOf(a.now);
    if (!t.choice) return { name: a.name, ...t, ready: false };
    if (nowRate == null || laterRate == null) return { name: a.name, ...t, ready: false, needs: [nowRate == null ? 'your rate now' : null, laterRate == null ? 'the rate in retirement' : null].filter(Boolean) };
    const per = ivHas(a.yearly) && a.yearly > 0 ? Number(a.yearly) : 1000;
    const M = crRothTrad({ yearly: per, nowPct: nowRate * 100, laterPct: laterRate * 100 });
    const yearGap = M.monthly * 12;
    const line = M.lead === 'same' ? `At ${ivPct(nowRate)} now and ${ivPct(laterRate)} later, Roth and traditional come out about the same.`
      : M.lead === 'trad' ? `Your rate now (${(nowRate * 100).toFixed(1)}%) is above the estimate for later (${(laterRate * 100).toFixed(1)}%): traditional leaves ${m(yearGap)} a year more to invest on ${m(per)}${ivHas(a.yearly) && a.yearly > 0 ? ' a year' : ' put in'}.`
        : `Your rate now (${(nowRate * 100).toFixed(1)}%) is below the estimate for later (${(laterRate * 100).toFixed(1)}%): Roth keeps ${m(-yearGap)} a year more on ${m(per)}${ivHas(a.yearly) && a.yearly > 0 ? ' a year' : ' put in'}.`;
    const math = [`Now: ${ivRateWords(a.now)} = ${(nowRate * 100).toFixed(1)}%. Later: ${ivRateWords(later)} = ${(laterRate * 100).toFixed(1)}%.`,
      `${m(per)} x (${(nowRate * 100).toFixed(1)}% - ${(laterRate * 100).toFixed(1)}%) = ${m(yearGap)} a year${yearGap < 0 ? ' (less: Roth leaves more)' : ''}, the same rule as the launch window on Career and education.`,
      'Payroll tax (Social Security and Medicare) is the same either way, so it is not in the rate. The tax saved counts as invested; if it gets spent, Roth comes out ahead.'];
    return { name: a.name, ...t, ready: true, nowRate, laterRate, per, perYear: ivHas(a.yearly) && a.yearly > 0, M, yearGap, line, math };
  });
  return { rows, laterRate, ready: rows.some(r => r.ready) };
}
