// SPDX-License-Identifier: AGPL-3.0-only
// The three statements and the tie-out (Phase 3.5, M62 to M67). Pure: reads the household file, its dated history
// and the month model; no DOM. Every line keeps the records behind it, so a view can expand it and link to its home.
//   M62 Net worth statement (balance sheet), as of a date
//   M63 Income and spending statement (income statement, accrual), for a period
//   M64 Cash flow statement (statement of cash flows, cash basis): Everyday (operating), Investing, Debt (financing)
//   M65 cash tie-out, M66 net worth bridge, M67 accrual vs cash surplus
import { metrics } from './metrics.js';
import { statusOf } from '../records.js';
import { instances, monthView, addMonths, ymOf } from '../month.js';
import { afterTaxContributions } from './linked.js';
import { LISTS } from '../registry/assumptions.js';

const sum = (list, f = x => x) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const round2 = v => Math.round(v * 100) / 100;

// ---------- Balances as of a date, from the dated history (R123) ----------
// The value a record's field had just before `iso`: the last change before it, else the value before the first change
// after it. A record added after `iso` did not exist yet (null). Records with no history keep their value.
export function valueAt(doc, rec, field, iso) {
  const hist = doc.history.filter(h => h.id === rec.id);
  const added = hist.find(h => h.op === 'add');
  if (added && added.at >= iso) return { exists: false, value: null };
  const sets = hist.filter(h => h.op === 'set' && h.field === field);
  const now = field in rec && field !== 'values' ? rec[field] : rec.values?.[field];
  if (!sets.length) return { exists: true, value: now ?? null };
  const before = sets.filter(h => h.at < iso);
  if (before.length) return { exists: true, value: before[before.length - 1].to ?? null };
  return { exists: true, value: sets[0].from ?? null };
}
const startOf = ym => `${ym}-01T00:00:00.000Z`;

// ---------- M62: Net worth statement ----------
const ROTH = new Set(LISTS.rothTypes);
const PRETAX = new Set(LISTS.pretaxTypes);
const HIGH_RATE = new Set(LISTS.highRateTypes);
export const ASSET_ORDER = ['Cash', 'Taxable investments', 'Roth', 'Pretax', 'HSA', 'Real assets'];
export const DEBT_ORDER = ['Cards', 'Other high rate', 'Student loans', 'Car loans', 'Mortgage', 'Other debt'];
export const assetGroup = r => {
  if (r.kind === 'asset') return 'Real assets';
  if (r.values?.group === 'cash') return 'Cash';
  if (r.type === 'HSA') return 'HSA';
  if (ROTH.has(r.type) || (PRETAX.has(r.type) && r.values?.taxType === 'Roth')) return 'Roth';
  if (PRETAX.has(r.type)) return 'Pretax';
  return 'Taxable investments';
};
export const debtGroup = r => (r.type === 'Credit card' ? 'Cards' : r.type === 'Student loan' ? 'Student loans' : r.type === 'Car loan' ? 'Car loans'
  : r.type === 'Mortgage' ? 'Mortgage' : HIGH_RATE.has(r.type) ? 'Other high rate' : 'Other debt');
const HOME = { Cash: '#/net-worth/assets', Debt: '#/net-worth/debt' };

// asOf: an ISO time, or null for today's balances. Not for me counts as zero (R058).
export function netWorthStatement(doc, { asOf = null, live = doc.records } = {}) {
  const val = (r, f) => {
    if (statusOf(r, f) === 'Not for me') return 0;
    if (!asOf) { const v = f in r && f !== 'values' ? r[f] : r.values?.[f]; return v ?? null; }
    const a = valueAt(doc, r, f, asOf);
    return a.exists ? a.value : undefined;
  };
  const line = (r, f, group, home) => { const v = val(r, f); return v === undefined ? null : { id: r.id, name: r.name || r.type, value: v, group, home }; };
  const assets = live.filter(r => r.kind === 'account' || r.kind === 'asset').map(r => line(r, r.kind === 'asset' ? 'value' : 'balance', assetGroup(r), HOME.Cash)).filter(Boolean);
  const debts = live.filter(r => r.kind === 'debt').map(r => line(r, 'balance', debtGroup(r), HOME.Debt)).filter(Boolean);
  const unvested = live.filter(r => r.kind === 'account' && r.values?.unvested).map(r => ({ id: r.id, name: r.name || r.type, value: r.values.unvested, home: HOME.Cash }));
  const groups = (lines, order) => order.map(name => ({ name, lines: lines.filter(l => l.group === name), total: sum(lines.filter(l => l.group === name), l => l.value) })).filter(g => g.lines.length);
  const totalAssets = sum(assets, l => l.value) - sum(unvested, l => l.value);
  const totalDebts = sum(debts, l => l.value);
  const cash = sum(assets.filter(l => l.group === 'Cash'), l => l.value);
  const taxable = sum(assets.filter(l => l.group === 'Taxable investments' && /brokerage/i.test(live.find(r => r.id === l.id)?.type || '')), l => l.value);
  const consumer = sum(debts.filter(l => l.group === 'Cards' || l.group === 'Other high rate'), l => l.value);
  const invested = sum(assets.filter(l => ['Taxable investments', 'Roth', 'Pretax', 'HSA'].includes(l.group)), l => l.value);
  const real = sum(assets.filter(l => l.group === 'Real assets'), l => l.value);
  return { asOf, assets: groups(assets, ASSET_ORDER), debts: groups(debts, DEBT_ORDER), unvested, totalAssets, totalDebts,
    netWorth: totalAssets - totalDebts, liquid: cash + taxable - consumer, cash, invested, real,
    missing: [...assets, ...debts].filter(l => l.value === null).map(l => l.name) };
}

// ---------- M63: Income and spending statement (accrual), one month ----------
// Lines use the month's actual where it has one (a closed or logged month), else its plan. Debt payments are the
// lines From Debt. The employer match is its own line and goes straight to savings with the 401(k) and HSA money.
export function incomeMonth(doc, ref, ym, { now = new Date() } = {}) {
  const m = metrics(doc, ref, { now });
  const f = m.flow, x = m.inputs;
  const match = m.savingsRate.match ?? 0;
  const v = monthView(doc, ref, ym, { now });
  const cards = new Set(doc.records.filter(r => r.kind === 'debt' && r.type === 'Credit card').map(r => r.id));
  const logged = v.rows.some(r => r.actual != null);
  const lines = v.rows.map(r => ({ id: r.line.id, name: r.line.name || r.line.values.category || 'Line', fixed: r.line.values.amountType === 'Fixed',
    value: logged ? r.actual ?? 0 : r.estimate ?? 0, onCard: !!cards.has(r.line.paidWith),
    yearly: !!r.line.values.irregular, prepaid: !!r.line.covers?.months, home: '#/cash-flow/budget' })).filter(l => l.value);
  const debtPaid = instances(doc, ref, ym, { now }).filter(i => i.kind === 'debt');
  const debtLines = (x.autoLines ?? []).map(a => {
    const i = debtPaid.find(d => d.recId === a.auto.sourceId);
    const paid = i && (i.status === 'Paid' || i.status === 'Partial') && i.paid != null ? -i.paid : i?.status === "Didn't happen" ? 0 : a.amount;
    return { id: a.auto.sourceId, name: a.name, fixed: true, value: paid, debt: true, home: '#/net-worth/debt' };
  });
  const all = [...lines, ...debtLines];
  const fixed = all.filter(l => l.fixed), variable = all.filter(l => !l.fixed);
  const gross = f.gross ?? 0, takeHome = f.takeHome ?? 0;
  const saved = (f.beforeTax ?? 0) + match;
  return { ym, gross, match, taxes: f.taxes ?? 0, saved, takeHome, fixed, variable,
    fixedTotal: sum(fixed, l => l.value), variableTotal: sum(variable, l => l.value),
    surplus: takeHome - sum(all, l => l.value), logged, savedFromPaycheck: f.beforeTax ?? 0 };
}

// ---------- M64: Cash flow statement (cash basis), one month ----------
// Each calendar item counts when paid: Paid or Partial at what was paid, Didn't happen at $0, unmarked at its plan
// (and listed for Find it). Charges on a card leave checking when the card is paid, not when swiped. Buckets come from
// the item (section 5: mark.bucket overrides): paychecks, bills, card payments and loan interest are Everyday; savings
// and contributions Investing; loan principal and new borrowing Debt.
export const BUCKETS = ['Everyday', 'Investing', 'Debt'];
export function defaultBucket(i, doc) {
  if (i.kind === 'debt') return 'Debt';
  if (i.group === 'Savings') return 'Investing';
  if (i.kind === 'entry') { const r = doc.records.find(x => x.id === i.recId); return r?.values.bucket || (r?.values.category === 'Savings' ? 'Investing' : 'Everyday'); }
  return 'Everyday';
}
export function cashMonth(doc, ref, ym, { now = new Date(), startCash = null } = {}) {
  const m = metrics(doc, ref, { now });
  const x = m.inputs;
  const marks = doc.spending?.calendar?.marks || {};
  const countMaybe = !!doc.spending?.calendar?.countMaybe;
  const items = [], unmarked = [];
  for (const i of instances(doc, ref, ym, { now })) {
    if (i.kind === 'win' || (i.maybe && !countMaybe) || !i.date.startsWith(ym)) continue;
    if (i.onCard) continue; // swiped on a card: it leaves checking when the card is paid
    const amount = i.status === 'Paid' || i.status === 'Partial' ? (i.paid ?? i.planned) : i.status === "Didn't happen" ? 0 : i.planned;
    if (i.status === 'Planned') unmarked.push({ date: i.date, name: i.name, amount: i.planned });
    const bucket = marks[i.key]?.bucket || defaultBucket(i, doc);
    if (i.kind === 'debt') {
      // A payment is interest (Everyday, a cost of the month) and principal (Debt, paying down what is owed). Cards are Everyday.
      const d = x.debts.find(dd => dd.id === i.recId);
      const rec = doc.records.find(r => r.id === i.recId);
      const owed = rec ? valueAt(doc, rec, 'balance', startOf(ym)).value ?? d?.balance ?? 0 : d?.balance ?? 0; // interest on what was owed when the month began
      const interest = Math.min(-amount, Math.max(0, owed * (d?.apr ?? 0) / 12));
      const principal = -amount - interest;
      if (d?.type === 'Credit card' && !marks[i.key]?.bucket) { items.push({ ...pick(i), amount, bucket: 'Everyday', principal }); continue; }
      if (marks[i.key]?.bucket && marks[i.key].bucket !== 'Debt') { items.push({ ...pick(i), amount, bucket, principal }); continue; }
      if (interest) items.push({ ...pick(i), name: `${i.name}: interest`, amount: -interest, bucket: 'Everyday', principal: 0 });
      items.push({ ...pick(i), name: interest ? `${i.name}: principal` : i.name, amount: -principal, bucket: 'Debt', principal });
      continue;
    }
    const line = i.lineId ? doc.records.find(r => r.id === i.lineId) : null;
    items.push({ ...pick(i), amount, bucket, yearly: i.kind === 'yearly' || !!line?.covers?.months });
  }
  // After-tax contributions to accounts leave checking every month (they are not calendar items yet).
  const contrib = afterTaxContributions(doc.records.filter(r => r.kind === 'account'), { payFrequency: x.payFrequency, payrollHsa: x.gates.hsa && x.income.some(i => (i.r.values.hsaFsa ?? 0) > 0) });
  for (const p of contrib.parts) items.push({ key: `contrib:${p.id}@${ym}`, recId: p.id, name: `${p.name}: contribution`, date: `${ym}-28`, amount: -p.monthly, bucket: 'Investing', kind: 'contribution' });
  const start = startCash ?? netWorthStatement(doc, { asOf: startOf(ym) }).cash;
  const by = b => items.filter(i => i.bucket === b);
  const totals = Object.fromEntries(BUCKETS.map(b => [b, sum(by(b), i => i.amount)]));
  const end = start + totals.Everyday + totals.Investing + totals.Debt;
  return { ym, start, items, totals, end, unmarked, everyday: by('Everyday'), investing: by('Investing'), debt: by('Debt'),
    principal: sum(items, i => i.principal ?? 0), contributions: -sum(by('Investing').filter(i => i.amount < 0), i => i.amount), withdrawals: sum(by('Investing').filter(i => i.amount > 0), i => i.amount) };
}
const pick = i => ({ key: i.key, recId: i.recId, name: i.name, date: i.date, kind: i.kind });

// ---------- A period: a month, or a calendar year ----------
export const periodMonths = p => (p.kind === 'year' ? Array.from({ length: 12 }, (_, k) => `${p.year}-${String(k + 1).padStart(2, '0')}`) : [p.ym]);
export const previous = p => (p.kind === 'year' ? { kind: 'year', year: p.year - 1 } : { kind: 'month', ym: addMonths(p.ym, -1) });
export const periodOf = (kind, now) => (kind === 'year' ? { kind, year: now.getUTCFullYear() } : { kind, ym: ymOf(now) });
const endIso = p => startOf(addMonths(periodMonths(p).at(-1), 1));

// All three statements and the tie-out for a period.
export function statements(doc, ref, period, { now = new Date() } = {}) {
  const months = periodMonths(period);
  const nwStart = netWorthStatement(doc, { asOf: startOf(months[0]) });
  // Ending balances: as typed when the month was closed (balances are checked at the close), else at the period end,
  // else today's for a period still running.
  const closedAt = doc.spending?.months?.[months.at(-1)]?.closed ? doc.spending.months[months.at(-1)].closedAt : null;
  const ended = endIso(period) <= now.toISOString();
  const nwEnd = netWorthStatement(doc, { asOf: closedAt ? new Date(Date.parse(closedAt) + 1000).toISOString() : ended ? endIso(period) : null });
  const inc = months.map(ym => incomeMonth(doc, ref, ym, { now }));
  let cashStart = nwStart.cash;
  const cash = months.map(ym => { const c = cashMonth(doc, ref, ym, { now, startCash: cashStart }); cashStart = c.end; return c; });
  const add = (list, k) => sum(list, x => x[k]);
  const income = { gross: add(inc, 'gross'), match: add(inc, 'match'), taxes: add(inc, 'taxes'), saved: add(inc, 'saved'), takeHome: add(inc, 'takeHome'),
    fixed: mergeLines(inc.flatMap(i => i.fixed)), variable: mergeLines(inc.flatMap(i => i.variable)), fixedTotal: add(inc, 'fixedTotal'), variableTotal: add(inc, 'variableTotal'),
    surplus: add(inc, 'surplus'), savedFromPaycheck: add(inc, 'savedFromPaycheck') };
  const flows = { start: cash[0].start, end: cash.at(-1).end, totals: Object.fromEntries(BUCKETS.map(b => [b, sum(cash, c => c.totals[b])])),
    everyday: cash.flatMap(c => c.everyday), investing: cash.flatMap(c => c.investing), debt: cash.flatMap(c => c.debt), unmarked: cash.flatMap(c => c.unmarked),
    principal: add(cash, 'principal'), contributions: add(cash, 'contributions'), withdrawals: add(cash, 'withdrawals') };
  return { period, netWorth: nwEnd, netWorthStart: nwStart, income, cash: flows, tie: tieOut(nwStart, nwEnd, income, flows, inc) };
}
function mergeLines(lines) {
  const by = new Map();
  for (const l of lines) { const k = `${l.id}`; const was = by.get(k); by.set(k, was ? { ...was, value: was.value + l.value } : { ...l }); }
  return [...by.values()];
}

// ---------- M65, M66, M67 ----------
export function tieOut(nwStart, nwEnd, income, cash, incMonths = []) {
  // M65: what the cash flow statement says should be in checking and savings, against what is there.
  const unexplainedCash = round2(nwEnd.cash - cash.end);
  // M66: change in net worth, explained. The surplus counts every debt payment as spending, so the principal part comes
  // back as debt paid down; money saved from the paycheck (401(k), HSA, match) goes straight to investments.
  const change = nwEnd.netWorth - nwStart.netWorth;
  const contributions = cash.contributions + income.saved;
  const market = nwEnd.invested - nwStart.invested - contributions + cash.withdrawals;
  const other = nwEnd.real - nwStart.real;
  const explained = income.surplus + income.saved + cash.principal + market + other;
  const bridge = { change, surplus: income.surplus, saved: income.saved, debtPaidDown: cash.principal, market, other, unexplained: round2(change - explained) };
  // M67: accrual surplus minus cash surplus, line by line. Cash surplus = everyday net + debt principal (before investing).
  const cashSurplus = cash.totals.Everyday + cash.totals.Debt;
  const paychecks = sum(cash.everyday.filter(i => i.kind === 'income'), i => i.amount);
  const lines = [
    { name: 'Paychecks this period vs the monthly take-home', value: income.takeHome - paychecks },
    { name: 'Charged to cards, paid later', value: -sum(incMonths.flatMap(i => [...i.fixed, ...i.variable]).filter(l => l.onCard), l => l.value) },
    // Accrual spreads a yearly or prepaid cost across its months; cash pays it in one go when it is due.
    { name: 'Yearly and prepaid costs: set aside vs paid', value: sum(cash.everyday.filter(i => i.yearly), i => -i.amount)
      - sum(incMonths.flatMap(i => [...i.fixed, ...i.variable]).filter(l => l.yearly || l.prepaid), l => l.value) },
  ];
  const accrualVsCash = income.surplus - cashSurplus;
  lines.push({ name: 'Bills planned vs paid (unmarked, partial, moved)', value: round2(accrualVsCash - sum(lines, l => l.value)) });
  return { unexplainedCash, cashOnStatement: cash.end, cashInAccounts: nwEnd.cash, bridge, accrualVsCash: { accrual: income.surplus, cash: cashSurplus, difference: accrualVsCash, lines } };
}

// ---------- Rows for the screen: this period, last period and the change, each with its records and its math ----------
// The view only formats these; every number here carries a plain-words text for Show the math.
const money0 = v => `$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
const row = (label, now, last, { lines = [], sign = '', total = false, tip = null, text = null, home = null } = {}) =>
  ({ label, now, last, change: last == null || now == null ? null : now - last, lines, sign, total, tip, home,
    text: text ?? `${label}: ${money0(now ?? 0)} this period${last == null ? '' : `, ${money0(last)} last period`}.` });
const linesOf = (list, f = l => l.value) => list.map(l => ({ id: l.id ?? l.recId, name: l.name, value: f(l), home: l.home, date: l.date }));
export function statementRows(cur, prev) {
  const n = cur.netWorth, p = prev?.netWorth;
  const grp = (side, name) => (side || []).find(g => g.name === name);
  const netWorth = [
    ...n.assets.map(g => row(g.name, g.total, grp(p?.assets, g.name)?.total ?? (p ? 0 : null), { lines: linesOf(g.lines), home: '#/net-worth/assets' })),
    row('Total assets', n.totalAssets, p?.totalAssets ?? null, { total: true, tip: 'Assets on a balance sheet' }),
    ...n.debts.map(g => row(g.name, g.total, grp(p?.debts, g.name)?.total ?? (p ? 0 : null), { sign: '−', lines: linesOf(g.lines), home: '#/net-worth/debt' })),
    row('Total debts', n.totalDebts, p?.totalDebts ?? null, { sign: '−', total: true, tip: 'Liabilities on a balance sheet' }),
    row('Net worth', n.netWorth, p?.netWorth ?? null, { sign: '=', total: true, tip: 'Equity on a balance sheet', text: `Total assets ${money0(n.totalAssets)} minus total debts ${money0(n.totalDebts)} = ${money0(n.netWorth)}.` }),
    row('Liquid net worth', n.liquid, p?.liquid ?? null, { text: `Cash and brokerage, minus cards and other quick debts: ${money0(n.liquid)}.` }),
  ];
  const below = n.unvested.length ? [row('Unvested match (not counted)', n.unvested.reduce((t, u) => t + u.value, 0), null,
    { lines: linesOf(n.unvested), text: 'Employer money that is not yours until it vests. Shown, not counted in net worth.' })] : [];
  const i = cur.income, q = prev?.income;
  const income = [
    row('Gross pay', i.gross, q?.gross ?? null, { home: '#/cash-flow/income', tip: 'Revenue on an income statement' }),
    row('Employer match', i.match, q?.match ?? null, { sign: '+', home: '#/net-worth/assets', text: `Your employer's 401(k) match: ${money0(i.match)}, its own line of income.` }),
    row('Taxes', i.taxes, q?.taxes ?? null, { sign: '−', home: '#/cash-flow/taxes' }),
    row('Saved from paycheck', i.saved, q?.saved ?? null, { sign: '−', text: `401(k), HSA and the match, saved before the money reaches you: ${money0(i.saved)}. Pay yourself first.` }),
    row('Take-home', i.takeHome, q?.takeHome ?? null, { sign: '=', total: true, home: '#/cash-flow/income' }),
    row('Fixed spending', i.fixedTotal, q?.fixedTotal ?? null, { sign: '−', lines: linesOf(i.fixed), home: '#/cash-flow/budget', tip: 'Expenses on an income statement' }),
    row('Variable spending', i.variableTotal, q?.variableTotal ?? null, { sign: '−', lines: linesOf(i.variable), home: '#/cash-flow/budget' }),
    row('Surplus', i.surplus, q?.surplus ?? null, { sign: '=', total: true, tip: 'Net income on an income statement',
      text: `Take-home ${money0(i.takeHome)} minus spending ${money0(i.fixedTotal + i.variableTotal)} = ${i.surplus < 0 ? '−' : ''}${money0(i.surplus)}. Card spending counts when swiped; investment growth is not here.` }),
  ];
  const c = cur.cash, d = prev?.cash;
  const cash = [
    row('Starting cash', c.start, d?.start ?? null, { home: '#/net-worth/assets' }),
    row('Everyday money', c.totals.Everyday, d?.totals.Everyday ?? null, { sign: '±', lines: linesOf(c.everyday, x => x.amount), tip: 'Operating activities on a statement of cash flows', text: 'Paychecks in; bills, card payments and loan interest out, counted when paid.' }),
    row('Investing', c.totals.Investing, d?.totals.Investing ?? null, { sign: '±', lines: linesOf(c.investing, x => x.amount), tip: 'Investing activities', text: 'Contributions out, withdrawals in, buying or selling a car or home.' }),
    row('Debt', c.totals.Debt, d?.totals.Debt ?? null, { sign: '±', lines: linesOf(c.debt, x => x.amount), tip: 'Financing activities', text: 'Principal paid out, new borrowing in.' }),
    row('Ending cash', c.end, d?.end ?? null, { sign: '=', total: true, text: `Starting cash ${money0(c.start)} plus everyday, investing and debt = ${money0(c.end)}.` }),
  ];
  return { netWorth, below, income, cash };
}
