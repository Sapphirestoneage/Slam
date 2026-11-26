// SPDX-License-Identifier: AGPL-3.0-only
// Hard moments (run Not built, groups 1 to 5, Part 7; M8H): the few numbers the hard-moment tools work out. No imports,
// numbers in and out, so the game loads the same code (tools/game_hard_build.mjs writes game/core/hardcore.js from
// this file). The words, the checklists, the scripts and the dated resource lists are data (data/sources/hard-2026.json).
//
//   the split           the rent and the shared bills split by room size, by income or equally, through the household
//                       split engine (rowShare, M9N), passed in by the caller: splitSharesOf. The quick roommate split
//                       (qcRoommates, M8Q) and the roommate leaving below both stand on it, so there is one split.
//   a roommate leaves   what each person pays until the lease ends when one person moves out: the person leaving
//                       covers their part for the months agreed, then the people staying split the whole rent the
//                       same way among themselves; the deposit comes back by each person's share of the rent, less
//                       any damage: hmRoommateExit
//   untangling          after a breakup or a divorce: every shared account, debt and thing, who keeps it, and what
//                       each person ends up with; what is still to decide; the debts that stay in both names until
//                       they are paid, refinanced or closed: hmUntangle
//   a checklist         how many steps are ticked, the next one, by when each group is due: hmChecklist
//   words to copy       a script with the person's own numbers in it: hmFill
//   money that waits    how many months of spending an amount that arrived (an inheritance, a payout) covers while
//                       it waits in savings: hmParkMonths
//
// Empty is not zero: a box not filled gives { ready: false }, never a number made from 0.

const hmHas = x => x !== null && x !== undefined && x !== '' && !Number.isNaN(Number(x));
const hmNum = x => (hmHas(x) ? Number(x) : null);

// ---- The split (one place for the quick roommate split and the roommate leaving) ----
// people: [{ id, name, size, income }]. how: 'size' | 'income' | 'equal' for the rent; billsHow: 'equal' or 'same' (the
// same way as the rent). rowShare(row, personId, H) is the household split engine (js/math/household.js; in the game,
// its copy in core/trip.js). Each row gets rentShare and billShare, which add up to 1 across the people.
export const HM_SPLIT = { size: 'By room size', income: 'By income', equal: 'Equally' };
export function splitSharesOf({ how = 'size', billsHow = 'equal', people = [] } = {}, rowShare) {
  if (people.length < 1) return { ready: false };
  if (how === 'size' && people.some(p => !(hmNum(p.size) > 0))) return { ready: false, needs: 'size' };
  if (how === 'income' && people.some(p => hmNum(p.income) == null || hmNum(p.income) < 0)) return { ready: false, needs: 'income' };
  const ids = people.map(p => p.id), H = { ids, many: true, method: 'Equal', weights: Object.fromEntries(people.map(p => [p.id, hmNum(p.income) ?? 0])) };
  const totalSize = people.reduce((s, p) => s + (hmNum(p.size) ?? 0), 0);
  const rowFor = way => (way === 'size' ? { values: { splitHow: 'Percent', splitPcts: Object.fromEntries(people.map(p => [p.id, hmNum(p.size) / totalSize])) } } : way === 'income' ? { values: { splitHow: 'By income' } } : { values: { splitHow: 'Equal' } });
  const rentRow = rowFor(how), billRow = rowFor(billsHow === 'same' ? how : 'equal');
  return { ready: true, how, billsHow, rows: people.map(p => ({ ...p, rentShare: rowShare(rentRow, p.id, H), billShare: rowShare(billRow, p.id, H) })) };
}

// ---- A roommate leaves before the lease ends ----
// rent and bills: a month, for the whole place. people: as above; leaver: the id of the person moving out. monthsLeft:
// months until the lease ends. cover: the months the person leaving keeps paying their part (0 = none; capped at
// monthsLeft). After that, with no one new, the people staying split the whole rent and bills the same way among
// themselves. deposit: the whole deposit; damage: what comes off it, shared by the same rent shares.
export function hmRoommateExit({ rent = null, bills = 0, how = 'size', billsHow = 'equal', people = [], leaver = null, monthsLeft = null, cover = 0, deposit = 0, damage = 0 } = {}, rowShare) {
  const R = hmNum(rent), B = hmNum(bills) ?? 0, M = hmNum(monthsLeft);
  if (!(R > 0) || people.length < 2 || M == null || M < 0 || !people.some(p => p.id === leaver)) return { ready: false };
  const before = splitSharesOf({ how, billsHow, people }, rowShare);
  if (!before.ready) return before;
  const stay = people.filter(p => p.id !== leaver), after = splitSharesOf({ how, billsHow, people: stay }, rowShare);
  if (!after.ready) return after;
  const coverMonths = Math.min(M, Math.max(0, hmNum(cover) ?? 0)), rest = M - coverMonths;
  const back = Math.max(0, (hmNum(deposit) ?? 0) - Math.max(0, hmNum(damage) ?? 0));
  const rows = before.rows.map(p => {
    const now = R * p.rentShare + B * p.billShare, a = after.rows.find(q => q.id === p.id);
    const later = a ? R * a.rentShare + B * a.billShare : 0, leaving = p.id === leaver;
    const months = leaving ? coverMonths : M, toEnd = leaving ? now * coverMonths : now * coverMonths + later * rest;
    return { id: p.id, name: p.name, leaving, now, later, more: leaving ? 0 : later - now, months, toEnd, deposit: back * p.rentShare };
  });
  const gone = rows.find(r => r.leaving);
  return { ready: true, rent: R, bills: B, how, billsHow, monthsLeft: M, cover: coverMonths, rest, deposit: hmNum(deposit) ?? 0, damage: Math.max(0, hmNum(damage) ?? 0), back,
    rows, leaving: gone, uncovered: gone.now * rest, total: rows.reduce((s, r) => s + r.toEnd, 0), lease: (R + B) * M };
}

// ---- Untangling after a breakup or a divorce ----
// items: [{ id, name, kind: 'have' | 'owe', amount, names: 'both' | 'me' | 'them', plan }]. plan: who ends up with it:
// 'me', 'them', 'split' (each takes `share`), 'sell' (sold or closed, and the money or the payoff split by `share`), or
// null (not decided yet). share: your part of a split, 0.5 unless typed. An item with no amount counts as one to look
// up, never as $0.
export const HM_PLANS = { me: 'I keep it', them: 'They keep it', split: 'We split it', sell: 'Sell or close it, split what is left', none: 'Not decided yet' };
export function hmUntangle(items = [], { share = 0.5 } = {}) {
  const s = Math.min(1, Math.max(0, hmNum(share) ?? 0.5));
  const mine = { have: 0, owe: 0 }, theirs = { have: 0, owe: 0 };
  const open = [], noAmount = [], stillBoth = [], rows = [];
  for (const it of items) {
    const amt = hmNum(it.amount), plan = it.plan && it.plan !== 'none' ? it.plan : null, kind = it.kind === 'owe' ? 'owe' : 'have';
    if (amt == null) noAmount.push(it.id);
    if (!plan) open.push(it.id);
    const myPart = plan === 'me' ? 1 : plan === 'them' ? 0 : plan === 'split' || plan === 'sell' ? s : null;
    if (amt != null && myPart != null) { mine[kind] += amt * myPart; theirs[kind] += amt * (1 - myPart); }
    // a debt in both names stays owed by both until it is paid off, refinanced or closed, whatever the two agree
    const both = kind === 'owe' && it.names === 'both' && plan !== 'sell';
    if (both) stillBoth.push(it.id);
    rows.push({ id: it.id, name: it.name, kind, amount: amt, names: it.names ?? null, plan, mine: amt != null && myPart != null ? amt * myPart : null, theirs: amt != null && myPart != null ? amt * (1 - myPart) : null, stillBoth: both });
  }
  const openAmount = rows.filter(r => !r.plan && r.amount != null).reduce((a, r) => a + (r.kind === 'owe' ? -r.amount : r.amount), 0);
  return { ready: items.length > 0, share: s, rows, mine: { ...mine, net: mine.have - mine.owe }, theirs: { ...theirs, net: theirs.have - theirs.owe },
    open, openAmount, noAmount, stillBoth, stillBothAmount: rows.filter(r => r.stillBoth && r.amount != null).reduce((a, r) => a + r.amount, 0), decided: items.length - open.length, of: items.length };
}

// ---- A checklist ----
// items: [{ id, when }] in order; ticks: { [id]: true }. when: a group (now, week, month, quarter, later). Gives the
// count, the next step not ticked, and each group's count.
export function hmChecklist(items = [], ticks = {}) {
  const t = ticks || {}, done = items.filter(i => t[i.id]).length, next = items.find(i => !t[i.id]) ?? null;
  const groups = [];
  for (const i of items) { let g = groups.find(x => x.when === (i.when ?? null)); if (!g) groups.push(g = { when: i.when ?? null, done: 0, of: 0 }); g.of += 1; if (t[i.id]) g.done += 1; }
  return { done, of: items.length, left: items.length - done, next, all: items.length > 0 && done === items.length, groups };
}

// ---- Words to copy ----
// text with {key} or {key|words when it is empty}; values: { key: 'already formatted text' }. A key with no value and
// no fallback becomes "my amount", so a script never shows a blank or a raw key.
export function hmFill(text, values = {}) {
  return String(text ?? '').replace(/\{(\w+)(?:\|([^}]*))?\}/g, (_, k, fb) => (values[k] != null && values[k] !== '' ? String(values[k]) : fb ?? 'my amount'));
}

// ---- Money that waits ----
// An amount that arrived (an inheritance, an insurance payout) parked in savings while the big choices wait: the
// months of spending it covers. Both numbers are the person's own.
export function hmParkMonths({ amount = null, spending = null } = {}) {
  const a = hmNum(amount), s = hmNum(spending);
  if (!(a >= 0) || !(s > 0)) return { ready: false };
  return { ready: true, amount: a, spending: s, months: a / s, whole: Math.floor(a / s) };
}
