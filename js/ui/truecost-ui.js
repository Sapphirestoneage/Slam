// SPDX-License-Identifier: AGPL-3.0-only
// Batch 29: the true cost of debt on Plan › Debt payoff (Eli's Level 15 Borrow design), four caret sections, closed
// until opened (DESIGN.md rule 9). Everything is a tap (rule 11); every number is the math's (js/math/truecost.js and
// js/math/studentloan.js); the questions asked here are view state, never saved, except the three facts the student
// loan drill-down asks about a loan (federal or private, PSLF, payments made, first borrowed), which are the loan's own.
// 1. The true cost of each debt: one plain line per debt.
// 2. Thinking about borrowing? What for, how much, up to three offers side by side, and paying cash.
// 3. What it bought: for school or business borrowing, the extra pay a year it may bring and the year it is paid back.
// 4. Student loan decision: Standard, IBR, RAP and PSLF compared, for federal loans.
// Benchmarks (docs/BENCHMARK.md, Debt): Undebt.it's interest saved and payoff date, NerdWallet's loan comparison
// (payment, total cost side by side), Personal Finance Club's calculator (few dials, one picture), studentaid.gov's
// Loan Simulator (plans side by side with total paid and forgiven).
import { h, clear } from './dom.js';
import * as S from './staples.js';
import { trueCostOf, loanOffers, boughtOf, LOAN_KINDS, MAX_OFFERS } from '../math/truecost.js';
import { studentLoanPlans, PAYMENTS_MADE, FIRST_BORROWED } from '../math/studentloan.js';
import { addMonths, ymOf, monthName } from '../month.js';
import { money } from '../format.js';

const KIND_NAMES = [['car', 'Car'], ['home', 'Home'], ['school', 'School'], ['business', 'Business'], ['stuff', 'Stuff'], ['other', 'Other']];
const AMOUNTS = { car: [15000, 25000, 35000, 45000], home: [250000, 400000, 550000, 700000], school: [10000, 25000, 50000, 100000], business: [10000, 25000, 50000, 100000], stuff: [1000, 2500, 5000, 10000], other: [2000, 5000, 10000, 20000] };
const RATES = { car: [0.049, 0.059, 0.069, 0.089], home: [0.055, 0.06, 0.065, 0.07], school: [0.064, 0.079, 0.089, 0.1], business: [0.08, 0.1, 0.12, 0.15], stuff: [0, 0.099, 0.199, 0.249], other: [0.07, 0.1, 0.14, 0.2] };
const YEARS = { car: [3, 4, 5, 6, 7], home: [15, 20, 30], school: [10, 15, 20], business: [3, 5, 7, 10], stuff: [1, 2, 3, 5], other: [1, 2, 3, 5] };
const FEES = { home: [0, 3000, 6000, 10000], other: [0, 250, 500, 1000] };
const EXTRA = [2000, 5000, 10000, 20000];
const STARTS = [[0, 'Now'], [1, 'In 1 year'], [2, 'In 2 years'], [4, 'In 4 years']];
// The borrowing question (view state, never saved).
export const TC = { kind: null, amount: null, offers: [{ rate: null, years: null, fees: 0 }], extra: null, start: 0, pick: 0 };
const short = v => (v >= 1000 && v % 1000 === 0 ? `$${v / 1000}k` : v >= 1000 && v % 500 === 0 ? `$${(v / 1000).toFixed(1)}k` : money(v));
const pctText = v => `${(Math.round(v * 10000) / 100).toString()}%`;
// A side by side: a table on a wide screen, one card an option on a phone (css/truecost.css switches them).
const sideBySide = (table, cards) => [h('div.tc-tablewrap.tc-wide', {}, table), h('div.tc-cards.tc-narrow', {}, cards)];
const card = (title, sub, tags, pairs) => h('div.tc-card', {}, h('div.tc-card-head', {}, h('strong', {}, title), sub ? h('span.muted.small', {}, sub) : null, ...tags.map(t => h('span.tag.plain.tc-tag', {}, t))),
  h('dl.tc-pairs', {}, pairs.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])));
const mon = (ctx, n) => (n == null ? 'Not on this path' : monthName(addMonths(ymOf(ctx.now()), n), 'short'));
const askNow = () => ({ kind: TC.kind ?? 'other', amount: TC.amount, offers: TC.offers.map(o => ({ ...o, years: o.years ?? LOAN_KINDS[TC.kind ?? 'other'].years })) });
const row = (label, control, tip = null) => h('div.tc-q', {}, h(`span.label${tip ? '.has-tip' : ''}`, tip ? { title: tip } : {}, label), h('div.tc-a', {}, control));

// One memo per reading, keyed by the file's revision and the question.
const memo = {};
const revOf = ctx => `${ctx.store.doc._rev ?? 0}|${ctx.store.doc.updatedAt}|${ctx.store.doc.records.length}`;
function cached(ctx, name, key, run) {
  const k = `${revOf(ctx)}|${key}`;
  if (memo[name]?.k !== k) memo[name] = { k, v: run() };
  return memo[name].v;
}
const trueCost = ctx => cached(ctx, 'tc', '', () => trueCostOf(ctx.store.doc, ctx.ref, { now: ctx.now() }));
const offersOf = ctx => cached(ctx, 'offers', JSON.stringify(askNow()), () => loanOffers(ctx.store.doc, ctx.ref, askNow(), { now: ctx.now() }));
const plansOf = ctx => cached(ctx, 'sl', '', () => studentLoanPlans(ctx.store.doc, ctx.ref, { now: ctx.now() }));

// A section whose body redraws in place when the file changes (and keeps the page where it is).
// The borrowing question is shared by sections 2 and 3, so a tap in one redraws every open one (redrawAll).
const hosts = new Set();
function live(ctx, id, opts, body) {
  return S.sec(id, { area: 'debt', ...opts }, () => {
    const host = h('div.card.tc');
    const self = () => S.keepPlace(() => clear(host, body(redrawAll)));
    host._tcDraw = self; hosts.add(host);
    ctx.onRefresh(() => host.isConnected && self());
    self();
    return host;
  });
}
function redrawAll() { for (const el of [...hosts]) { if (!el.isConnected) { hosts.delete(el); continue; } el._tcDraw(); } }

// All four, for the Debt payoff screen. hasDebt: false on a screen with no debt yet (only borrowing and what it bought).
export function trueCostSections(app, ctx, { hasDebt = true } = {}) {
  const out = [];
  if (hasDebt) {
    const t = trueCost(ctx);
    const fiCost = t.lines.reduce((s, l) => s + Math.max(0, l.fi.cost ?? 0), 0);
    out.push(live(ctx, 'payoff:truecost', { title: 'The true cost of each debt', summary: t.lines.length ? `${money(t.value)} of interest in today's dollars${fiCost ? ` · FI ${fiCost} ${fiCost === 1 ? 'month' : 'months'} later` : ''}` : 'Needs a balance, an APR and a payment', tip: t.text },
      () => costBody(ctx)));
  }
  out.push(live(ctx, 'payoff:borrow', { title: 'Thinking about borrowing?', summary: 'A car, a home, school: compare offers, or pay cash', tip: 'Each offer runs through your plan on a copy, never saved' }, draw => borrowBody(ctx, draw)));
  out.push(live(ctx, 'payoff:bought', { title: 'What it bought', summary: 'School or business: the extra pay it may bring, and when it is paid back', tip: 'An earning-power view, never a verdict' }, draw => boughtBody(ctx, draw)));
  const sl = hasDebt ? plansOf(ctx) : null;
  if (sl && sl.s.loans.length) out.push(live(ctx, 'payoff:student', { title: 'Student loan decision', summary: sl.rows.length ? `Standard, IBR, RAP${sl.pslfLeft != null ? ' and PSLF' : ''} compared` : 'Federal or private?', tip: 'The federal plans open in 2026, side by side' }, () => studentBody(ctx)));
  out.push(h('div.tc-end', { 'aria-hidden': 'true' })); // room at the end of the screen, so a toast never sits over the last section
  return out;
}

// 1. One line per debt.
function costBody(ctx) {
  const t = trueCost(ctx);
  if (!t.lines.length) return h('p.muted', {}, 'Give each debt a balance, an APR and a payment on Debt to see what it costs.');
  return [
    h('div.tc-lines', {}, t.lines.map(l => h('div.tc-line', {},
      h('div.row-line.tc-name', {}, h('strong', {}, l.name), h('span.muted.small', {}, `${money(l.balance)} at ${pctText(l.apr)}${l.aprGuess ? ' (a guess)' : ''}`)),
      h('p.tc-words', {}, l.text)))),
    t.skipped.length ? h('p.muted.small', {}, `${t.skipped.join(', ')}: needs a balance, an APR and a payment.`) : null,
    h('p.muted.small.has-tip', { title: t.text }, `Today's dollars take out ${pctText(t.inflation)} inflation a year. Without a debt, its payment is kept and goes where the plan sends money.`),
  ];
}

// 2. Thinking about borrowing?
function borrowBody(ctx, draw) {
  const put = patch => { Object.assign(TC, patch); draw(); };
  const kind = TC.kind;
  const amounts = AMOUNTS[kind ?? 'other'];
  const form = h('div.tc-form', {},
    row('What for', S.tapPick(KIND_NAMES, kind, v => put({ kind: v, amount: null, offers: [{ rate: null, years: null, fees: 0 }] }), { label: 'What for' })),
    kind ? row('How much', h('div.row-line.tc-amount', {}, S.tapPick(amounts.map(v => [v, short(v)]), amounts.includes(TC.amount) ? TC.amount : null, v => put({ amount: v }), { label: 'How much' }),
      S.moneyInput(amounts.includes(TC.amount) ? null : TC.amount, v => put({ amount: v }), { hint: 'Other amount', key: 'tc:amount', width: 140, cents: false }))) : null);
  if (!kind) return [form, h('p.muted.tc-wait', {}, 'Pick what it is for.')];
  const offerCard = (o, i) => h('div.tc-offer', {},
    h('div.row-line.tc-offer-head', {}, h('strong', {}, `Offer ${i + 1}`), TC.offers.length > 1 ? S.iconButton('x', `Take offer ${i + 1} out`, () => put({ offers: TC.offers.filter((_, k) => k !== i) }), { tiny: true }) : null),
    row('Rate', h('div.row-line.tc-amount', {}, S.tapPick(RATES[kind].map(v => [v, pctText(v)]), RATES[kind].includes(o.rate) ? o.rate : null, v => { TC.offers[i] = { ...o, rate: v }; draw(); }, { label: `Offer ${i + 1} rate` }),
      S.pctInput(RATES[kind].includes(o.rate) ? null : o.rate, v => { TC.offers[i] = { ...o, rate: v }; draw(); }, { hint: 'Other', key: `tc:rate:${i}` }))),
    row('Years', S.toggle(YEARS[kind].map(y => [y, `${y}`]), o.years ?? LOAN_KINDS[kind].years, v => { TC.offers[i] = { ...o, years: v }; draw(); }, { label: `Offer ${i + 1} years` })),
    row('Fees', S.toggle((FEES[kind] ?? FEES.other).map(v => [v, v ? short(v) : 'None']), o.fees ?? 0, v => { TC.offers[i] = { ...o, fees: v ?? 0 }; draw(); }, { label: `Offer ${i + 1} fees` }), 'Fees are added to what you borrow'));
  const offers = h('div.tc-offers', {}, TC.offers.map(offerCard),
    TC.offers.length < MAX_OFFERS ? h('div.tc-add', {}, S.button('Add an offer', { iconName: 'plus', onClick: () => put({ offers: [...TC.offers, { rate: null, years: TC.offers.at(-1)?.years ?? null, fees: 0 }] }) })) : null);
  return [form, offers, compare(ctx)];
}

// The side by side: one column an offer, then paying cash.
function compare(ctx) {
  if (!TC.amount) return h('p.muted.tc-wait', {}, 'Pick how much.');
  const r = offersOf(ctx);
  const ready = r.offers.filter(o => !o.needs.length);
  if (!ready.length) return h('p.muted.tc-wait', {}, 'Tap a rate to see what it does to your plan.');
  const later = mv => (mv == null ? '' : mv === 0 ? 'no change' : `${Math.abs(mv)} ${Math.abs(mv) === 1 ? 'month' : 'months'} ${mv > 0 ? 'later' : 'sooner'}`);
  const cols = [...ready.map(o => ({ head: `Offer ${o.i + 1}`, sub: `${pctText(o.rate)}, ${o.years} ${o.years === 1 ? 'year' : 'years'}`, o, tags: [o.i === r.lowestTotal ? 'Lowest total' : null, o.i === r.lowestPayment ? 'Lowest payment' : null].filter(Boolean) })),
    { head: 'Pay cash', sub: 'From savings', cash: r.cash, tags: [] }];
  const cell = (c, f) => h('td.num', {}, f(c));
  const showDebtFree = ready.some(o => o.debtFree.after !== o.debtFree.before);
  const rows = [
    ['A month', c => (c.cash ? 'No payment' : S.mathButton({ id: 'M9L', value: c.o.payment, unit: 'money', needs: [], text: c.o.text }, money(c.o.payment)))],
    ['In all', c => (c.cash ? (c.cash.needs.length ? '' : money(c.cash.total)) : money(c.o.total))],
    ['Costs over the amount', c => (c.cash ? (c.cash.needs.length ? '' : '$0') : h('span', {}, money(c.o.cost), h('span.muted.small.tc-sub', {}, `${money(c.o.costToday)} today`)))],
    ...(ready.some(o => o.afterTax) ? [['After tax', c => (c.cash ? '' : c.o.afterTax?.rate == null ? '' : h('span.has-tip', { title: c.o.afterTax.text }, pctText(c.o.afterTax.rate)))]] : []),
    ['FI date', c => { const f = c.cash ? c.cash.fi : c.o.fi; if (c.cash?.needs.length) return h('span.muted.small', {}, c.cash.text); return h('span', {}, mon(ctx, f?.after), h('span.muted.small.tc-sub', {}, later(f?.moved))); }],
    ...(showDebtFree ? [['Debt free', c => (c.cash ? (c.cash.needs.length ? '' : mon(ctx, c.cash.debtFree.after)) : mon(ctx, c.o.debtFree.after))]] : []),
    ['Free money a month', c => (c.cash ? (c.cash.needs.length ? '' : money(c.cash.free.after)) : money(c.o.free.after))],
    ['big e', c => (c.cash ? (c.cash.needs.length ? '' : h('span.has-tip', { title: c.cash.text }, money(c.cash.bigE.after), h('span.muted.small.tc-sub', {}, `from ${money(c.cash.bigE.before)}`))) : 'Not touched')],
  ];
  const table = h('table.tc-table', {},
    h('thead', {}, h('tr', {}, h('th', {}, ''), cols.map(c => h('th.num', {}, h('span', {}, c.head), h('span.muted.small.tc-sub', {}, c.sub), c.tags.map(t => h('span.tag.plain.tc-tag', {}, t)))))),
    h('tbody', {}, rows.map(([label, f]) => h('tr', {}, h('th', { scope: 'row' }, label), cols.map(c => cell(c, f))))));
  const first = ready[0];
  return h('div.tc-answer', { 'aria-live': 'polite' },
    h('p.tc-lead', {}, `Today: FI ${mon(ctx, r.fi)}, ${money(r.free)} of free money a month.`),
    ...sideBySide(table, cols.map(c => card(c.head, c.sub, c.tags, rows.map(([label, f]) => [label, f(c)])))),
    h('p.muted.small', {}, `Each column runs through your plan on a copy, never saved. ${r.cash.needs.length ? '' : r.cash.text}`),
    first.heavy ? h('p.muted.small', {}, `At ${pctText(first.rate)} it would be heavy debt (8% or more): the surplus would go to it first.`) : null,
    TC.kind === 'home' ? h('p.muted.small', {}, 'A home\'s taxes, insurance and the rent it replaces are not in this comparison.') : null);
}

// 3. What it bought.
function boughtBody(ctx, draw) {
  const put = patch => { Object.assign(TC, patch); draw(); };
  if (TC.kind !== 'school' && TC.kind !== 'business') {
    return [h('p.muted', {}, 'For borrowing that may raise what you earn. Pick one to start (it is the same question as Thinking about borrowing?):'),
      S.tapPick([['school', 'School'], ['business', 'Business']], null, v => put({ kind: v, amount: null, offers: [{ rate: null, years: null, fees: 0 }] }), { label: 'What it is for' })];
  }
  const r = offersOf(ctx);
  const ready = r.offers.filter(o => !o.needs.length);
  const form = h('div.tc-form', {},
    row('Extra pay a year', h('div.row-line.tc-amount', {}, S.tapPick(EXTRA.map(v => [v, short(v)]), EXTRA.includes(TC.extra) ? TC.extra : null, v => put({ extra: v }), { label: 'Extra pay a year' }),
      S.moneyInput(EXTRA.includes(TC.extra) ? null : TC.extra, v => put({ extra: v }), { hint: 'Other amount', key: 'tc:extra', width: 140, cents: false })), 'Before tax: what the degree or the business is expected to add a year'),
    row('Starts', S.toggle(STARTS, TC.start, v => put({ start: v ?? 0 }), { label: 'Starts' })),
    ready.length > 1 ? row('Offer', S.toggle(ready.map(o => [o.i, `Offer ${o.i + 1}`]), ready.some(o => o.i === TC.pick) ? TC.pick : ready[0].i, v => put({ pick: v }), { label: 'Offer' })) : null);
  if (!TC.amount || !ready.length) return [form, h('p.muted.tc-wait', {}, 'Pick an amount and a rate under Thinking about borrowing?')];
  if (!TC.extra) return [form, h('p.muted.tc-wait', {}, 'Pick the extra pay a year it may bring.')];
  const pick = ready.some(o => o.i === TC.pick) ? TC.pick : ready[0].i;
  const b = cached(ctx, 'bought', JSON.stringify([askNow(), TC.extra, TC.start, pick]), () => boughtOf(ctx.store.doc, ctx.ref, { ask: askNow(), offer: pick, extra: TC.extra, startYears: TC.start }, { now: ctx.now() }));
  if (b.needs.length) return [form, h('p.muted.tc-wait', {}, b.text)];
  const num = (label, value, sub = null) => h('div.tc-num', {}, h('span.label', {}, label), h('div.tc-big', {}, value), sub ? h('span.muted.small', {}, sub) : null);
  return [form, h('div.tc-answer', { 'aria-live': 'polite' },
    h('div.tc-nums', {},
      num('Paid back by', S.mathButton({ id: 'M9L', value: b.years, unit: 'years', needs: [], text: b.text }, `${b.year}`), `year ${b.years}`),
      num('FI with the loan alone', mon(ctx, b.fi.loan)),
      num('FI with the loan and the extra pay', mon(ctx, b.fi.both), `${mon(ctx, b.fi.before)} without borrowing`)),
    h('p.tc-words', {}, b.text))];
}

// 4. Student loan decision.
function studentBody(ctx) {
  const sl = plansOf(ctx), s = sl.s;
  const up = (ids, patch) => { ctx.store.transaction('Student loan', () => { for (const id of ids) ctx.store.update(id, patch); }); };
  if (!s.federal.length) {
    return [h('p.muted', {}, 'Income-driven plans and PSLF are for federal loans. Is it federal or private?'),
      ...s.unknown.map(d => row(d.name, S.toggle([['Federal', 'Federal'], ['Private', 'Private']], null, v => v && ctx.store.update(d.id, { federal: v }), { label: `${d.name}: federal or private` }))),
      s.private.length && !s.unknown.length ? h('p.muted.small', {}, 'Private loans have no income-driven plans or PSLF; refinancing or the payoff order is where they move.') : null];
  }
  const ids = s.federal.map(d => d.id);
  const form = h('div.tc-form', {},
    row('PSLF', S.toggle([['Yes', 'On PSLF'], ['Not sure', 'Not sure'], ['No', 'No']], s.pslf, v => up(ids, { pslf: v }), { label: 'PSLF' }), 'Public Service Loan Forgiveness: a government or nonprofit employer, full time'),
    s.pslf === 'Yes' ? row('Qualifying payments made', S.tapPick(PAYMENTS_MADE.map(n => [n, `${n}`]), s.made, v => v != null && up(ids, { paymentsLeft: ctx.ref.studentLoans.pslfPayments - v }), { label: 'Qualifying payments made' }), 'Of the 120 PSLF needs (studentaid.gov shows your count)') : null,
    row('First borrowed', S.toggle(FIRST_BORROWED.map(v => [v, v]), s.first, v => up(ids, { firstBorrowed: v }), { label: 'First borrowed' }), s.firstGuess ? 'Not picked yet: read as July 2014 to June 2026' : 'Which plans the loans can use'));
  if (sl.needs.length) return [form, h('p.muted.tc-wait', {}, sl.text)];
  const cells = p => [money(p.payment), `${p.months}, to ${monthName(p.endsYm, 'short')}`, money(p.paid), p.forgiven > 0 ? money(p.forgiven) : 'None', p.forgiven > 0 ? (p.pslf ? 'None (PSLF)' : money(p.tax)) : 'None'];
  const heads = ['A month', 'Payments', 'Paid in all', 'Forgiven', 'Tax on it'];
  const table = h('table.tc-table.tc-plans', {},
    h('thead', {}, h('tr', {}, ['Plan', 'A month', 'Payments', 'Paid in all', 'Forgiven', 'Tax on it'].map((t, i) => h(i ? 'th.num' : 'th', {}, t)))),
    h('tbody', {}, sl.rows.map(p => h(`tr${p.pslf && sl.onPslf ? '.tc-yours' : ''}`, {},
      h('th', { scope: 'row' }, h('span', {}, p.name), p.note ? h('span.muted.small.tc-sub', {}, p.note) : null),
      h('td.num', {}, S.mathButton({ id: 'M9S', value: p.payment, unit: 'money', needs: [], text: p.text }, money(p.payment))),
      h('td.num', {}, `${p.months}`, h('span.muted.small.tc-sub', {}, `to ${monthName(p.endsYm, 'short')}`)),
      h('td.num', {}, money(p.paid)),
      h('td.num', {}, p.forgiven > 0 ? money(p.forgiven) : 'None'),
      h('td.num', {}, p.forgiven > 0 ? (p.pslf ? 'None (PSLF)' : money(p.tax)) : '')))));
  return [form, h('div.tc-answer', {},
    h('p.tc-lead', {}, sl.words),
    ...sideBySide(table, sl.rows.map(p => card(p.name, p.note, [], heads.map((k, i) => [k, cells(p)[i]])))),
    h('p.muted.small.has-tip', { title: sl.text }, `${money(s.balance)} of federal loans at ${pctText(s.apr)}; AGI ${money(s.agi)}, a household of ${s.familySize}. You pay ${money(s.payment)} a month now. Income is held where it is today. SAVE ended in March 2026; PAYE and ICR close June 30, 2028.`))];
}
