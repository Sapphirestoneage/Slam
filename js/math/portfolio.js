// Brandon section 2 and 3: what is inside an account. Allocation, holdings, purpose tags, growth and basis, fees,
// access rules, staleness, uninvested cash, and the 401(k) match tiers. Pure: no DOM. Every number comes from typed
// values only; nothing here fills in an example.
import { isBlank } from './result.js';

export const ASSET_CLASSES = [['us', 'US stocks'], ['intl', 'Intl stocks'], ['bonds', 'Bonds'], ['cash', 'Cash'],
  ['realEstate', 'Real estate'], ['commodities', 'Commodities'], ['crypto', 'Crypto'], ['other', 'Other']];
const STOCKS = ['us', 'intl'];
export const DRIFT_POINTS = 0.05;
export const CONCENTRATION = 0.25; // one holding or theme over this share of the account is flagged
export const STALE_DAYS = 30;
const RETIREMENT = new Set(['401(k)', '403(b)', '457', 'TSP', 'Roth IRA', 'Traditional IRA', 'Rollover IRA', 'SEP', 'Solo 401(k)', 'HSA']);
const TAXABLE = new Set(['Brokerage', 'Crypto']);
const near = (a, b) => Math.abs(a - b) < 0.0005;
const num = v => (isBlank(v) ? null : Number(v));

// A holding's value: typed, else shares x price.
export const holdingValue = x => (!isBlank(x.value) ? Number(x.value) : !isBlank(x.shares) && !isBlank(x.price) ? x.shares * x.price : null);

// Allocation (B2.1, B2.4): from holdings when they carry values and classes, else as typed. Must total 100%.
export function allocationOf(values = {}, balance = null) {
  const held = (values.positions || []).filter(x => holdingValue(x) !== null && x.assetClass);
  let pcts, source;
  if (held.length) {
    const total = held.reduce((s, x) => s + holdingValue(x), 0);
    pcts = Object.fromEntries(ASSET_CLASSES.map(([k]) => [k, held.filter(x => x.assetClass === k).reduce((s, x) => s + holdingValue(x), 0) / total]));
    for (const k of Object.keys(pcts)) if (!pcts[k]) pcts[k] = null;
    source = 'holdings';
  } else {
    pcts = Object.fromEntries(ASSET_CLASSES.map(([k]) => [k, num(values.allocation?.[k])]));
    source = 'typed';
  }
  const entered = Object.values(pcts).some(v => v !== null);
  const total = Object.values(pcts).reduce((s, v) => s + (v ?? 0), 0);
  const ok = entered && near(total, 1);
  // Dollars only once the mix is whole and there is a balance (no total built on a half-typed mix).
  const dollars = ok && !isBlank(balance) ? Object.fromEntries(Object.entries(pcts).map(([k, v]) => [k, v === null ? null : v * balance])) : null;
  return { pcts, total, entered, ok, dollars, source, stocks: entered ? STOCKS.reduce((s, k) => s + (pcts[k] ?? 0), 0) : null };
}

// Target and drift (B2.2): a class more than 5 points off its target is flagged.
export function driftOf(pcts, target = {}) {
  const t = Object.fromEntries(ASSET_CLASSES.map(([k]) => [k, num(target?.[k])]));
  if (!Object.values(t).some(v => v !== null)) return { set: false, rows: [], flagged: [] };
  const tTotal = Object.values(t).reduce((s, v) => s + (v ?? 0), 0);
  const rows = ASSET_CLASSES.map(([k, label]) => ({ k, label, now: pcts[k] ?? 0, target: t[k] ?? 0, diff: (pcts[k] ?? 0) - (t[k] ?? 0) }));
  return { set: true, targetOk: near(tTotal, 1), targetTotal: tTotal, rows, flagged: rows.filter(r => Math.abs(r.diff) > DRIFT_POINTS + 1e-9) };
}

// Holdings (B2.3, B2.5): value, share of the account, weighted expense ratio, overlap and concentration.
const INDEX = [['S&P 500', /s\s*&?\s*p\s*500|\bspx\b|\bvoo\b|\bivv\b|\bspy\b|\bfxaix\b|\bvfiax\b|\bswppx\b/i],
  ['NASDAQ', /nasdaq|\bqqq\b|\bqqqm\b|\boneq\b/i], ['Dow', /\bdow\b|\bdia\b|djia/i], ['Total US market', /total (us )?(stock )?market|\bvti\b|\bvtsax\b|\bfskax\b|\bitot\b|\bswtsx\b/i]];
export function holdingsOf(positions = [], balance = null, { limit = CONCENTRATION } = {}) {
  const rows = positions.map(x => ({ ...x, v: holdingValue(x) }));
  const sum = rows.reduce((s, x) => s + (x.v ?? 0), 0);
  const base = !isBlank(balance) && balance > 0 ? balance : sum || null;
  const out = rows.map(x => ({ ...x, share: x.v !== null && base ? x.v / base : null }));
  const withEr = out.filter(x => x.v !== null && !isBlank(x.expenseRatio));
  const erValue = withEr.reduce((s, x) => s + x.v, 0);
  const weightedEr = erValue ? withEr.reduce((s, x) => s + x.v * x.expenseRatio, 0) / erValue : null;
  // Overlap: two or more funds on the big US indexes hold mostly the same companies.
  const usIndex = out.filter(x => INDEX.some(([, re]) => re.test(`${x.tracks || ''} ${x.ticker || ''} ${x.name || ''}`)));
  const overlap = usIndex.length >= 2 ? usIndex.map(x => x.ticker || x.name).filter(Boolean) : [];
  const concentrated = out.filter(x => x.share !== null && x.share > limit + 1e-9);
  const themes = new Map();
  for (const x of out) if (x.tracks && x.share !== null) themes.set(x.tracks.trim().toLowerCase(), { name: x.tracks.trim(), share: (themes.get(x.tracks.trim().toLowerCase())?.share ?? 0) + x.share });
  const heavyThemes = [...themes.values()].filter(t => t.share > limit + 1e-9);
  return { rows: out, sum, weightedEr, overlap, concentrated, heavyThemes, offBalance: !isBlank(balance) && sum > 0 && Math.abs(sum - balance) > 1 ? sum - balance : null };
}

// Purpose tags (B2.6, B2.7): price tag, % funded, monthly needed; a short goal held in stocks is flagged.
export function monthsUntil(date, now = new Date()) {
  if (!date || !/^\d{4}-\d{2}/.test(date)) return null;
  const [y, m] = date.split('-').map(Number);
  return (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth());
}
export function tagsOf(tags = [], { balance = null, stocks = null, investment = false, now = new Date() } = {}) {
  const rows = tags.map(t => {
    const target = num(t.target), dollars = num(t.dollars), months = monthsUntil(t.date, now);
    const funded = target && dollars !== null ? dollars / target : null;
    const left = target !== null && dollars !== null ? Math.max(0, target - dollars) : null;
    const monthly = left === null || months === null ? null : months <= 0 ? (left > 0 ? left : 0) : left / months;
    const short = months !== null && months < 60;
    // In stocks: the mix says so, or it is an investment account with no mix typed yet.
    const inStocks = stocks !== null ? stocks > 0 : investment;
    return { ...t, target, dollars, months, funded, monthly, stockRisk: short && inStocks && (dollars ?? 0) > 0 };
  });
  const tagged = rows.reduce((s, t) => s + (t.dollars ?? 0), 0);
  return { rows, tagged, overBalance: !isBlank(balance) && tagged > balance + 0.5 ? tagged - balance : null, untagged: !isBlank(balance) && rows.length ? Math.max(0, balance - tagged) : null };
}

// Growth and basis (B2.8 to B2.10).
export function growthOf(type, v = {}, balance = null) {
  const basis = num(v.costBasis) ?? num(v.contributionsToDate);
  const unrealized = basis !== null && !isBlank(balance) ? balance - basis : null;
  const out = { basis, basisFrom: num(v.costBasis) !== null ? 'cost basis' : basis !== null ? 'contributions' : null, unrealized,
    unrealizedPct: unrealized !== null && basis ? unrealized / basis : null, realized: num(v.realized), dividends: num(v.dividends) };
  const logged = (v.rothLog || []).reduce((s, e) => s + (e.amount ?? 0), 0);
  const rothBasis = num(v.rothBasis) ?? (logged || null); // blank box: the contribution log is the basis (B3.9)
  if (/Roth/.test(type || '') && rothBasis !== null && !isBlank(balance)) { out.rothEarnings = balance - rothBasis; out.rothBasis = rothBasis; } // contributions come out any time
  if (TAXABLE.has(type)) { out.shortTerm = num(v.shortTerm); out.longTerm = num(v.longTerm); }
  return out;
}

// Tax treatment and when you can reach it without a penalty (B2.11).
export function taxTreatment(type, taxType = null) {
  if (type === 'HSA') return 'Tax-free in, growth and out for medical';
  if (type === '529') return 'Tax-free growth and out for school';
  if (TAXABLE.has(type)) return 'Taxable: gains taxed when sold';
  if (type === 'Roth IRA' || taxType === 'Roth') return 'Roth: taxed now, tax-free later';
  if (taxType === 'Both') return 'Part pretax, part Roth';
  if (RETIREMENT.has(type)) return 'Pretax: tax break now, taxed when taken out';
  return null;
}
export function accessRule(type) {
  if (type === 'Roth IRA') return 'Contributions any time; earnings at 59½ once open 5 years';
  if (type === '457') return 'Any age once you leave that job';
  if (['401(k)', '403(b)', 'TSP', 'Solo 401(k)'].includes(type)) return 'Age 59½; 55 if you leave that job in or after the year you turn 55';
  if (['Traditional IRA', 'Rollover IRA', 'SEP'].includes(type)) return 'Age 59½';
  if (type === 'HSA') return 'Any age for medical bills; anything at 65';
  if (type === '529') return 'Any time for school costs';
  if (TAXABLE.has(type)) return 'Any time';
  return null;
}

// Fees in dollars a year (B2.12): the account fee plus the weighted expense ratio on the balance.
export function feesOf({ accountFee = null, expenseRatio = null, balance = null }) {
  const er = !isBlank(expenseRatio) && !isBlank(balance) ? expenseRatio * balance : null;
  const fee = num(accountFee);
  return { er, fee, total: er === null && fee === null ? null : (er ?? 0) + (fee ?? 0) };
}

// Stale after 30 days (B2.16).
export function staleOf(asOf, now = new Date()) {
  if (!asOf) return { days: null, stale: false };
  const days = Math.floor((now - new Date(asOf.length === 10 ? `${asOf}T12:00:00` : asOf)) / 86400000);
  return { days, stale: days > STALE_DAYS };
}

// Uninvested cash (B2.19): a retirement account or HSA with money sitting in cash.
export function uninvestedOf(type, v = {}, balance = null, alloc = null) {
  // Any cash is flagged (answer to 48); the account can turn it off, e.g. an HSA that must keep a cash floor.
  if (!RETIREMENT.has(type) || v.cashOk) return null;
  let cash = null;
  if (type === 'HSA' && !isBlank(v.hsaCash)) cash = v.hsaCash;
  else if (alloc?.ok && alloc.pcts.cash && !isBlank(balance)) cash = alloc.pcts.cash * balance;
  if (cash === null || cash < 0.5) return null;
  const share = !isBlank(balance) && balance > 0 ? cash / balance : null;
  return { cash, share };
}

// Net worth check (B2.20): net worth must equal entered balances minus unvested minus what is owed.
export function netWorthCheck(netWorth, { accounts = [], things = [], debts = [] }) {
  if (netWorth === null || netWorth === undefined) return null;
  const assets = [...accounts, ...things].reduce((s, a) => s + (a.value ?? 0), 0);
  const unvested = accounts.reduce((s, a) => s + (a.unvested ?? 0), 0);
  const owed = debts.reduce((s, d) => s + (d.balance ?? 0), 0);
  const expected = assets - unvested - owed;
  return { assets, unvested, owed, expected, ok: Math.abs(expected - netWorth) <= 0.5, diff: netWorth - expected };
}

// Contribution a year from per paycheck, with the real number of paychecks (B2.14).
const PAYS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };
export const paychecksPerYear = freq => PAYS[freq] ?? null;
export function yearlyContribution(v = {}, payFrequency = null) {
  if (isBlank(v.contribution)) return null;
  if (v.contributionPer !== 'Paycheck') return v.contribution;
  return v.contribution * (PAYS[payFrequency] ?? 26);
}

// 401(k) match tiers (B3.3): e.g. 100% of the first 3%, then 50% of the next 1%. Tiers stack in order.
export function matchFromTiers({ contributionPct, tiers = [], gross }) {
  if (isBlank(contributionPct) || isBlank(gross) || !tiers.length) return null;
  let left = contributionPct, matchedPct = 0;
  const parts = [];
  for (const t of tiers) {
    if (isBlank(t.rate) || isBlank(t.upTo)) continue;
    const slice = Math.max(0, Math.min(left, t.upTo));
    matchedPct += slice * t.rate; left -= slice;
    parts.push({ ...t, slice, dollars: slice * t.rate * gross });
  }
  const maxPct = tiers.reduce((s, t) => s + (t.upTo ?? 0), 0);
  return { pctOfPay: matchedPct, dollars: matchedPct * gross, parts, fullMatchAt: maxPct, leftOnTable: contributionPct < maxPct - 1e-9 };
}

// Contribution per paycheck and as % of salary (B3.2): each worked out from the other.
export function contributionSplit({ perPaycheck = null, pct = null, gross = null, payFrequency = null }) {
  const n = PAYS[payFrequency] ?? null;
  if (!isBlank(perPaycheck) && n && gross) return { perPaycheck, pct: perPaycheck * n / gross, computed: 'pct' };
  if (!isBlank(pct) && n && gross) return { perPaycheck: pct * gross / n, pct, computed: 'perPaycheck' };
  return { perPaycheck, pct, computed: null };
}

// Vested vs unvested (B3.4).
export function vestedOf(balance, unvested) {
  if (isBlank(balance)) return null;
  const u = num(unvested) ?? 0;
  return { vested: balance - u, unvested: u };
}

// HSA fee comparison (B3.6): managed vs self-directed, in dollars a year on the invested amount.
export function hsaFeeCompare({ invested = null, managedPct = null, selfPct = null, managedFlat = null, selfFlat = null }) {
  if (isBlank(invested)) return null;
  const cost = (p, f) => (isBlank(p) && isBlank(f) ? null : (p ?? 0) * invested + (f ?? 0));
  const managed = cost(managedPct, managedFlat), self = cost(selfPct, selfFlat);
  return { managed, self, saves: managed !== null && self !== null ? managed - self : null };
}

// Income and the 401(k) fill each other in (B3.10): whichever side is blank borrows the other's answer.
// Own answers always win. Pure: reads records, returns what each side should show and where it came from.
const K401_TYPES = new Set(['401(k)', '403(b)', '457', 'TSP', 'Solo 401(k)']);
export function link401k(records) {
  const job = records.find(r => r.kind === 'income' && ['Job', 'Partner job'].includes(r.type) && r.values?.incomeType !== '1099') || null;
  const acct = records.find(r => r.kind === 'account' && K401_TYPES.has(r.type)) || null;
  const jv = job?.values || {}, av = acct?.values || {};
  // Income is the first pass: dollars a paycheck and whether there is a match. The 401(k) holds the detail.
  const acctOwnPerPaycheck = av.contribution != null && av.contributionPer === 'Paycheck' ? av.contribution : null;
  const incomeOwnPerPaycheck = jv.k401Paycheck ?? null;
  const incomeTiers = jv.matchPct != null && jv.matchCapPct != null ? [{ rate: jv.matchPct, upTo: jv.matchCapPct }] : []; // older files
  const acctTiers = (av.matchTiers || []).filter(t => t.rate != null && t.upTo != null);
  const incomeOwn = incomeOwnPerPaycheck != null || jv.contributionPct != null;
  const acctOwn = acctOwnPerPaycheck != null || av.salaryPct != null;
  return {
    job, acct,
    // Income side: dollars a paycheck (or an older %), else the 401(k)'s answer
    incomePct: jv.contributionPct ?? (incomeOwnPerPaycheck == null && acctOwnPerPaycheck == null ? av.salaryPct ?? null : null),
    incomePctFrom: !incomeOwn && acctOwnPerPaycheck == null && av.salaryPct != null ? '401(k)' : null,
    incomePerPaycheck: incomeOwnPerPaycheck ?? (jv.contributionPct == null ? acctOwnPerPaycheck : null),
    incomePerPaycheckFrom: !incomeOwn && acctOwnPerPaycheck != null ? '401(k)' : null,
    incomeTiers: incomeTiers.length ? incomeTiers : acctTiers,
    incomeTiersFrom: !incomeTiers.length && acctTiers.length ? '401(k)' : null,
    // 401(k) side: per paycheck and % of salary, else Income's first pass
    acctPerPaycheck: acctOwnPerPaycheck ?? (av.salaryPct == null ? incomeOwnPerPaycheck : null),
    acctPerPaycheckFrom: !acctOwn && incomeOwnPerPaycheck != null ? 'Income' : null,
    acctPct: av.salaryPct ?? (acctOwnPerPaycheck == null && incomeOwnPerPaycheck == null ? jv.contributionPct ?? null : null),
    acctPctFrom: !acctOwn && incomeOwnPerPaycheck == null && jv.contributionPct != null ? 'Income' : null,
    acctTiers: (av.matchTiers || []).length ? av.matchTiers : incomeTiers,
    acctTiersFrom: !(av.matchTiers || []).length && incomeTiers.length ? 'Income' : null,
    hasMatch: acctTiers.length || incomeTiers.length ? 'Yes' : jv.hasMatch ?? null,
  };
}

// Paychecks left this calendar year (B3.8), from today. Approximate: weekly and every 2 weeks count days left;
// twice a month counts the 15th and the end of each month left; monthly counts month-ends left.
export function paychecksLeft(payFrequency, now = new Date()) {
  const y = now.getFullYear(), mo = now.getMonth(), d = now.getDate();
  const daysLeft = Math.floor((new Date(y, 11, 31, 23) - now) / 86400000);
  const lastDay = new Date(y, mo + 1, 0).getDate();
  if (payFrequency === 'week') return Math.floor(daysLeft / 7) + 1;
  if (payFrequency === '2 weeks') return Math.floor(daysLeft / 14) + 1;
  if (payFrequency === 'twice a month') return (11 - mo) * 2 + (d <= 15 ? 2 : d < lastDay ? 1 : 0);
  if (payFrequency === 'month') return 11 - mo + (d < lastDay ? 1 : 0);
  return null;
}

// HSA (B3.8): this year so far plus the employer, against the limit, and what each paycheck left needs to max it.
export function hsaProgress({ ytd = null, employer = null, limit, payFrequency = null, now = new Date() }) {
  if (isBlank(ytd) && isBlank(employer)) return null;
  const inSoFar = (ytd ?? 0) + (employer ?? 0);
  const left = Math.max(0, limit - inSoFar);
  const n = paychecksLeft(payFrequency, now);
  return { inSoFar, limit, share: inSoFar / limit, left, paychecksLeft: n, perPaycheckToMax: n ? left / n : null, maxed: left <= 0.5 };
}

// Roth IRA contribution log (B3.9): by tax year, with maxed status. Contributions for a year can be made until
// the April 15 after it. The log total is also the contribution basis when that box is blank.
export function rothLog(entries = [], { limit, now = new Date() }) {
  const by = new Map();
  for (const e of entries) if (e.taxYear && !isBlank(e.amount)) by.set(e.taxYear, (by.get(e.taxYear) ?? 0) + e.amount);
  const y = now.getFullYear();
  const open = [y, ...(now < new Date(y, 3, 16) ? [y - 1] : [])]; // last year stays open until tax day
  const years = [...new Set([...by.keys(), ...open])].sort((a, b) => b - a).map(taxYear => {
    const total = by.get(taxYear) ?? 0;
    return { taxYear, total, left: Math.max(0, limit - total), maxed: total >= limit - 0.5, open: open.includes(taxYear), over: total > limit + 0.5 ? total - limit : null };
  });
  return { years, basis: [...by.values()].reduce((s, v) => s + v, 0) };
}
