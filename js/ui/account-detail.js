// Brandon sections 2 and 3: what is inside each cash and investment account. Every block sits behind its own
// closed caret inside the row's More (slim by default). Numbers shown are worked out from typed values only.
import { h } from './dom.js';
import { moneyInput, pctInput, textInput, toggle, select, labelled, moreBlock, button, iconButton, warnTag } from './staples.js';
import { ASSET_CLASSES, allocationOf, driftOf, holdingsOf, holdingValue, tagsOf, growthOf, taxTreatment, accessRule, feesOf, staleOf, uninvestedOf,
  CONCENTRATION } from '../math/portfolio.js';
import { money, pct } from '../format.js';
import { specificBlocks } from './account-specific.js';

const row = (...kids) => h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, ...kids);
const shown = (text, title = null) => h('span.computed', { title }, text);
const good = text => h('span.tag.plain.ok-tag', {}, '✓ ', text);
const numInput = (value, onChange, { hint, width = 90 } = {}) => textInput(value == null ? null : String(value), v => { const n = v === null ? null : Number(String(v).replace(/[,$\s]/g, '')); onChange(n === null || Number.isNaN(n) ? null : n); }, { hint, width });
const pct2 = v => (v == null ? '–' : `${(Math.round(v * 10000) / 100).toFixed(2)}%`);
const today = () => new Date().toISOString().slice(0, 10);
export const balanceOf = r => r.values.balance ?? null;

// Everything worth a flag on one account, in the user's words. Used in the row's More and on the Assets strip.
export function accountFlags(r, { now = new Date(), payFrequency = null } = {}) {
  const v = r.values, bal = balanceOf(r), out = [];
  const alloc = allocationOf(v, bal);
  if (alloc.entered && !alloc.ok) out.push(`Allocation adds to ${pct(alloc.total)}, not 100%`);
  const drift = driftOf(alloc.pcts, v.target);
  if (alloc.ok && drift.flagged.length) out.push(`Drifted from target: ${drift.flagged.map(d => `${d.label} ${d.diff > 0 ? '+' : ''}${Math.round(d.diff * 100)} pts`).join(', ')}`);
  const hold = holdingsOf(v.positions, bal);
  if (hold.overlap.length) out.push(`Funds overlap (${hold.overlap.join(', ')}): they hold mostly the same US companies`);
  for (const x of hold.concentrated) out.push(`${x.ticker || x.name || 'One holding'} is ${pct(x.share)} of the account (over ${pct(CONCENTRATION)})`);
  for (const t of hold.heavyThemes) if (!hold.concentrated.some(x => (x.tracks || '').trim().toLowerCase() === t.name.toLowerCase())) out.push(`${t.name} is ${pct(t.share)} of the account (over ${pct(CONCENTRATION)})`);
  const tags = tagsOf(v.tags, { balance: bal, stocks: alloc.stocks, investment: v.group === 'investment', now });
  for (const t of tags.rows) if (t.stockRisk) out.push(`${t.name || 'A goal'} is under 5 years out and held in stocks: a drop may not recover in time`);
  if (tags.overBalance) out.push(`Goals here add up to ${money(tags.overBalance)} more than the balance`);
  const un = uninvestedOf(r.type, v, bal, alloc);
  if (un) out.push(`${money(un.cash)} is sitting in cash, not invested`);
  const st = staleOf(v.asOf ?? r.updatedAt?.slice(0, 10), now);
  if (st.stale && bal != null) out.push(`Balance is ${st.days} days old: update it`);
  return out;
}

// ---------- Allocation (B2.1, B2.2, B2.4) ----------
function allocationBlock(r, up) {
  const v = r.values, bal = balanceOf(r);
  const a = allocationOf(v, bal);
  const fromHoldings = a.source === 'holdings';
  const setPct = (k, x) => up({ allocation: { ...(v.allocation || {}), [k]: x } });
  const setTarget = (k, x) => up({ target: { ...(v.target || {}), [k]: x } });
  const drift = driftOf(a.pcts, v.target);
  const totalTag = !a.entered ? h('span.muted', {}, 'Type each share; they must add to 100%')
    : a.ok ? good('Adds to 100%') : warnTag(`${pct(a.total)} so far: ${a.total < 1 ? `${pct(1 - a.total)} to go` : `${pct(a.total - 1)} too much`}`);
  const targetOn = v.targetOn || drift.set;
  return h('div.stack', { style: { gap: '10px' } },
    h('div.row-line', { style: { gap: '10px' } }, h('strong', {}, 'Total'), totalTag, fromHoldings ? h('span.muted.small', {}, 'Worked out from your holdings below') : null),
    h('div.alloc-grid', {}, ASSET_CLASSES.map(([k, label]) => h('div.stack', {}, h('span.label', {}, label),
      fromHoldings ? shown(a.pcts[k] == null ? '–' : pct(a.pcts[k])) : pctInput(v.allocation?.[k] ?? null, x => setPct(k, x), { hint: '–', key: `${r.id}:al-${k}` }),
      a.dollars?.[k] != null ? h('span.muted.small', {}, money(a.dollars[k])) : null,
      targetOn ? row(h('span.muted.small', {}, 'Target'), pctInput(v.target?.[k] ?? null, x => setTarget(k, x), { hint: '–', key: `${r.id}:tg-${k}` })) : null,
      targetOn && drift.set && a.ok ? (Math.abs(drift.rows.find(d => d.k === k).diff) > 0.05 ? warnTag(`${drift.rows.find(d => d.k === k).diff > 0 ? '+' : ''}${Math.round(drift.rows.find(d => d.k === k).diff * 100)} pts`) : null) : null))),
    row(targetOn ? null : button('Set a target mix', { size: 'small', iconName: 'plus', onClick: () => up({ targetOn: true }) }),
      targetOn && drift.set && !drift.targetOk ? warnTag(`Target adds to ${pct(drift.targetTotal)}, not 100%`) : null,
      targetOn && drift.set && drift.targetOk && a.ok && !drift.flagged.length ? good('Within 5 points of target') : null));
}

// ---------- Holdings (B2.3, B2.5) ----------
function holdingsBlock(r, up) {
  const v = r.values, bal = balanceOf(r);
  const list = v.positions || [];
  const hs = holdingsOf(list, bal);
  const set = (i, patch) => up({ positions: list.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const head = ['Ticker', 'Name', 'Shares', 'Price', 'Value', '% of account', 'Expense ratio', 'What it tracks', 'Asset class', ''];
  const rows = hs.rows.map((x, i) => h('tr', {},
    h('td', {}, textInput(x.ticker ?? null, t => set(i, { ticker: t && t.toUpperCase() }), { hint: 'Ticker', width: 84 })),
    h('td', {}, textInput(x.name ?? null, t => set(i, { name: t }), { hint: 'Fund name', width: 170 })),
    h('td.num', {}, numInput(x.shares, n => set(i, { shares: n }), { hint: 'Shares', width: 84 })),
    h('td.num', {}, moneyInput(x.price ?? null, n => set(i, { price: n }), { hint: 'Price' })),
    h('td.num', {}, holdingValue({ shares: x.shares, price: x.price }) !== null && x.value == null ? shown(money(x.v), 'Shares x price')
      : moneyInput(x.value ?? null, n => set(i, { value: n }), { hint: 'Value' })),
    h('td.num', {}, x.share == null ? h('span.muted', {}, '–') : shown(pct(x.share))),
    h('td', {}, pctInput(x.expenseRatio ?? null, n => set(i, { expenseRatio: n }), { hint: 'e.g. 0.03' })),
    h('td', {}, textInput(x.tracks ?? null, t => set(i, { tracks: t }), { hint: 'e.g. S&P 500', width: 130 })),
    h('td', {}, select(ASSET_CLASSES, x.assetClass ?? null, t => set(i, { assetClass: t }), { label: 'Asset class', width: 140 })),
    h('td', {}, iconButton('trash', `Remove ${x.ticker || 'holding'}`, () => up({ positions: list.filter((_, j) => j !== i) })))));
  return h('div.stack', { style: { gap: '10px' } },
    v.holdings && typeof v.holdings === 'string' ? h('span.muted.small', {}, `Earlier note: ${v.holdings}`) : null,
    list.length ? h('div.list-scroll', {}, h('table.rows.mini', {}, h('thead', {}, h('tr', {}, head.map(t => h('th', {}, t)))), h('tbody', {}, rows))) : null,
    row(button('Add holding', { size: 'small', iconName: 'plus', onClick: () => up({ positions: [...list, {}] }) }),
      hs.weightedEr !== null ? shown(`Weighted expense ratio ${pct2(hs.weightedEr)}`) : null,
      hs.offBalance !== null ? warnTag(`Holdings add to ${money(hs.sum)}; the balance says ${money(bal)}`) : null));
}

// ---------- What it's for (B2.6, B2.7) ----------
function tagsBlock(ctx, r, up) {
  const v = r.values, bal = balanceOf(r);
  const list = v.tags || [];
  const alloc = allocationOf(v, bal);
  const t = tagsOf(list, { balance: bal, stocks: alloc.stocks, investment: v.group === 'investment', now: ctx.now() });
  const set = (i, patch) => up({ tags: list.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const rows = t.rows.map((x, i) => {
    const d = h('input', { type: 'month', value: x.date || '', 'aria-label': 'Target date' });
    d.onchange = () => set(i, { date: d.value || null });
    return h('tr', {},
      h('td', {}, textInput(x.name ?? null, s => set(i, { name: s }), { hint: 'e.g. Emergency fund', width: 170 })),
      h('td.num', {}, moneyInput(x.target, n => set(i, { target: n }), { hint: 'Price tag' })),
      h('td', {}, h(`label.field${x.date ? '.filled' : ''}`, { style: { width: '160px' } }, d)),
      h('td.num', {}, moneyInput(x.dollars, n => set(i, { dollars: n }), { hint: 'In this account' })),
      h('td.num', {}, x.funded === null ? h('span.muted', {}, '–') : shown(pct(x.funded))),
      h('td.num', {}, x.monthly === null ? h('span.muted', {}, '–') : shown(`${money(x.monthly)} a month`)),
      h('td', {}, x.stockRisk ? warnTag('Short goal in stocks') : null),
      h('td', {}, iconButton('trash', `Remove ${x.name || 'goal'}`, () => up({ tags: list.filter((_, j) => j !== i) }))));
  });
  return h('div.stack', { style: { gap: '10px' } },
    list.length ? h('div.list-scroll', {}, h('table.rows.mini', {}, h('thead', {}, h('tr', {}, ['Goal', 'Price tag', 'By', 'Dollars here', 'Funded', 'Needed', '', ''].map(s => h('th', {}, s)))), h('tbody', {}, rows))) : null,
    row(button(list.length ? 'Add another goal' : 'Add a goal for this money', { size: 'small', iconName: 'plus', onClick: () => up({ tags: [...list, {}] }) }),
      t.untagged ? h('span.muted.small', {}, `${money(t.untagged)} not set aside for a goal`) : null,
      t.overBalance ? warnTag(`Goals add up to ${money(t.overBalance)} more than the balance`) : null));
}

// ---------- Growth and basis (B2.8 to B2.10) ----------
function growthBlock(r, up, L) {
  const v = r.values, bal = balanceOf(r);
  const g = growthOf(r.type, v, bal);
  const taxable = r.type === 'Brokerage' || r.type === 'Crypto';
  const roth = /Roth/.test(r.type || '');
  return h('div.form-grid', {},
    labelled('Contributions to date', moneyInput(v.contributionsToDate ?? null, x => up({ contributionsToDate: x }), { hint: 'Add total' }), { later: L('contributionsToDate') }),
    labelled('Cost basis', moneyInput(v.costBasis ?? null, x => up({ costBasis: x }), { hint: 'Add basis' }), { note: 'Blank uses contributions', later: L('costBasis') }),
    roth ? labelled('Roth contributions so far', moneyInput(v.rothBasis ?? null, x => up({ rothBasis: x }), { hint: 'Add amount' }), { note: 'Can come out any time, no tax or penalty', later: L('rothBasis') }) : null,
    roth && g.rothEarnings !== undefined ? labelled('Earnings (wait for 59½)', shown(money(g.rothEarnings), 'Balance minus contributions')) : null,
    labelled('Gain you have not sold', g.unrealized === null ? h('span.muted', {}, 'Needs a balance and a basis')
      : shown(`${money(g.unrealized)}${g.unrealizedPct !== null ? ` (${pct(g.unrealizedPct)})` : ''}`, `Balance minus ${g.basisFrom}`)),
    labelled('Gains sold this year', moneyInput(v.realized ?? null, x => up({ realized: x }), { hint: 'Add amount' }), { note: 'Realized', later: L('realized') }),
    labelled('Dividends this year', moneyInput(v.dividends ?? null, x => up({ dividends: x }), { hint: 'Add amount' }), { later: L('dividends') }),
    taxable ? labelled('Short-term vs long-term gains', row(moneyInput(v.shortTerm ?? null, x => up({ shortTerm: x }), { hint: 'Short' }), moneyInput(v.longTerm ?? null, x => up({ longTerm: x }), { hint: 'Long' })),
      { note: 'Held under a year is taxed like pay' }) : null);
}

// ---------- Details (B2.11 to B2.17) ----------
function detailsBlock(ctx, r, up, L) {
  const v = r.values, bal = balanceOf(r);
  const inv = v.group === 'investment';
  const er = holdingsOf(v.positions, bal).weightedEr ?? v.fees ?? null;
  const f = feesOf({ accountFee: v.accountFee, expenseRatio: er, balance: bal });
  const st = staleOf(v.asOf ?? r.updatedAt?.slice(0, 10), ctx.now());
  const d = h('input', { type: 'date', value: v.asOf ?? r.updatedAt?.slice(0, 10) ?? '', 'aria-label': 'Balance as of' });
  d.onchange = () => up({ asOf: d.value || null });
  const treat = inv ? taxTreatment(r.type, v.taxType) : 'Taxable: interest taxed each year';
  const access = inv ? accessRule(r.type) : 'Any time';
  return h('div.form-grid', {},
    labelled('Balance as of', row(h(`label.field${d.value ? '.filled' : ''}`, { style: { width: '160px' } }, d), st.stale ? warnTag(`${st.days} days old`) : null),
      { note: 'Over 30 days old gets a reminder' }),
    labelled('Last 4 digits', textInput(v.last4 ?? null, x => up({ last4: x && x.replace(/\D/g, '').slice(-4) }), { hint: 'e.g. 1234', width: 116 }), { note: 'To tell accounts apart', later: L('last4') }),
    treat ? labelled('Tax treatment', shown(treat)) : null,
    access ? labelled('Reach it without a penalty', shown(access)) : null,
    inv ? labelled('Expense ratio', holdingsOf(v.positions, bal).weightedEr !== null ? shown(`${pct2(er)} (from holdings)`)
      : pctInput(v.fees ?? null, x => up({ fees: x }), { hint: 'e.g. 0.04' }), { later: L('fees') }) : null,
    inv ? labelled('Account fee a year', moneyInput(v.accountFee ?? null, x => up({ accountFee: x }), { hint: 'Add fee' }), { later: L('accountFee') }) : null,
    inv ? labelled('Fees you pay a year', f.total === null ? h('span.muted', {}, 'Needs a balance and a fee') : shown(money(f.total), `${f.er !== null ? `${money(f.er)} expense ratio` : ''}${f.er !== null && f.fee !== null ? ' + ' : ''}${f.fee !== null ? `${money(f.fee)} account fee` : ''}`)) : null,
    inv ? labelled('Auto-invest', toggle(['On', 'Off'], v.autoInvest ?? null, x => up({ autoInvest: x }), { label: 'Auto-invest', clearable: true })) : null,
    inv ? labelled('Reinvest dividends', toggle(['On', 'Off'], v.drip ?? null, x => up({ drip: x }), { label: 'Reinvest dividends', clearable: true })) : null,
    inv ? labelled('Beneficiary named', toggle(['Yes', 'No'], v.beneficiary ?? null, x => up({ beneficiary: x }), { label: 'Beneficiary named', clearable: true }),
      { note: v.beneficiary === 'No' ? 'Add one in the account settings: it skips probate' : null, later: L('beneficiary') }) : null,
    labelled('Owner', toggle(['Individual', 'Joint'], v.ownership ?? null, x => up({ ownership: x }), { label: 'Individual or joint', clearable: true })));
}

// All the blocks for one account, each behind its own caret.
export function accountBlocks(ctx, r, up, L) {
  const inv = r.values.group === 'investment';
  const id = k => `acct:${r.id}:${k}`;
  return h('div.stack.acct-blocks', { style: { gap: '8px' } },
    ...specificBlocks(ctx, r, up, L, id),
    inv ? moreBlock(id('alloc'), () => allocationBlock(r, up), { label: 'Allocation' }) : null,
    inv ? moreBlock(id('hold'), () => holdingsBlock(r, up), { label: `Holdings${r.values.positions?.length ? ` (${r.values.positions.length})` : ''}` }) : null,
    moreBlock(id('tags'), () => tagsBlock(ctx, r, up), { label: `What it's for${r.values.tags?.length ? ` (${r.values.tags.length})` : ''}` }),
    inv ? moreBlock(id('growth'), () => growthBlock(r, up, L), { label: 'Growth and basis' }) : null,
    moreBlock(id('details'), () => detailsBlock(ctx, r, up, L), { label: 'Details' }));
}

export const stampBalance = patch => ({ ...patch, asOf: today() });
