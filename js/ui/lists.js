// SPDX-License-Identifier: AGPL-3.0-only
// List setups built from the staples: debts and spending lines. Each list is a view of the one record type.
import { h, icon } from './dom.js';
import { addPresets } from '../presets.js';
import { METHODS } from '../registry/debt.js';
import { fromButton, confirmBox, toast, button, warnTag, moneyText, value, amount, iconButton, moneyInput, pctInput, textInput, perPicker, toggle, select, labelled, payoffCell, summaryStrip, whoPays, WHO, whoOf, hoursChip, park, parkProfile, metricCard, ownerToggle } from './staples.js';
import { pct } from '../format.js';
import { feeApr } from '../math/debt.js';
import { monthlyFrom } from '../math/income.js';
import { withHome, myShare } from '../math/spending.js';
import { applies } from '../gates.js';
import { payoffPlan, debtToIncome, utilization } from '../math/debt.js';
import { needs } from '../math/result.js';
import { money } from '../format.js';
import { estimateOf, actualOf, instances, monthName, planDiffs } from '../month.js';

const LOAN_TYPES = new Set(['Student loan', 'Car loan', 'Personal loan', 'Mortgage']);
const short = v => (Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : money(v));
const sum = (list, f) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
// B6.10: totals add each line's monthly amount, never the raw number (a $1,200-a-year line is $100 a month).
const freqOf = ctx => ctx?.metrics?.().inputs.income.find(x => x.r.values.payFrequency)?.r.values.payFrequency ?? null;
export const lineMonthlyOf = (r, freq = null) => (r.amount == null ? null : monthlyFrom(r.amount, r.per, freq).value);
// A line someone confirmed as the same payment as a debt or a premium counts as $0 (enter once); a question alone does not.
const keptIn = ctx => { const f = freqOf(ctx); const dup = ctx?.metrics?.().inputs.dupOf ?? {}; return r => (r.status === 'Not for me' || dup[r.id] ? 0 : lineMonthlyOf(r, f)); };
const withAutos = (ctx, recs) => [...recs, ...(ctx.metrics().inputs.autoLines ?? [])];
// A premium's own Budget line (Brandon section 4) is entered on Protection: its amount opens the coverage row.
const premiumOf = (ctx, r) => (r.linkedTo ? ctx.store.get(r.linkedTo) : null)?.kind === 'coverage' ? ctx.store.get(r.linkedTo) : null;
function dupNote(ctx, r, ask, { confirmed = false } = {}) {
  const what = ask.from === 'Debt' ? `${ask.name} payment` : `${ask.name} premium`;
  if (confirmed) return h('div.dup-note', {}, h('span.tag.plain', {}, ask.own ? `Your paycheck pays this ${ask.name} premium now; this line is not counted.` : `Counted once, as your ${what}.`),
    ask.own ? null : button('Not the same', { size: 'small', onClick: () => ctx.store.update(r.id, { sameAs: null, notSame: [...(r.values.notSame || []), ask.sourceId] }) }));
  return h('div.dup-note', {}, h('span.dup-q', {}, `Same as your ${what}?`),
    button('Yes', { size: 'small', onClick: () => { ctx.store.update(r.id, { sameAs: ask.sourceId }); toast(`Counted once, as your ${what}.`, { undo: () => ctx.store.undo() }); } }),
    button('No', { size: 'small', onClick: () => ctx.store.update(r.id, { notSame: [...(r.values.notSame || []), ask.sourceId] }) }));
}

export function debtList(ref, { cards = null } = {}) {
  // cards: 'only' for the Credit cards sub-tab, 'none' for Debt (answer to 56). They stay standard debt in every total.
  const isCard = r => r.type === 'Credit card';
  return {
    kind: 'debt', area: 'debt', title: cards === 'only' ? 'Credit cards' : 'Debt', thing: cards === 'only' ? { one: 'card', plural: 'cards' } : { one: 'debt', plural: 'debts' },
    filter: r => r.kind === 'debt' && (cards === 'only' ? isCard(r) : cards === 'none' ? !isCard(r) : true),
    ...(cards === 'only' ? { defaultType: 'Credit card' } : {}),
    groupBy: r => (r.type === 'Credit card' ? 'Credit cards' : LOAN_TYPES.has(r.type) ? 'Loans' : 'Other'),
    picker: cards === 'only' ? null : { top: ref.lists.debtTypesTop.filter(t => cards !== 'none' || t !== 'Credit card'), other: [...ref.lists.debtTypesOther, 'Mortgage'] },
    // Order drives the payoff plan everywhere (Mockup: section header).
    headerExtra: ctx => cards === 'only' ? null : h('span.row-line', { style: { gap: '8px' } }, h('span.label', {}, 'Order'),
      toggle(METHODS.map(m => [m.id, m.name]), ctx.store.doc.settings.debtOrder ?? 'avalanche',
        v => { ctx.store.setDoc('settings', { debtOrder: v }); ctx.refresh(); }, { label: 'Payoff order' })),
    coreFields: ['balance', 'apr'],
    focus: ['Debt', 'Balance', 'APR', 'Payment / mo'], // session 1: type, balance, APR, minimum
    paidWith: false,
    columns: [
      { label: 'Debt', render: (ctx, r, m, up) => textInput(r.name, v => up({ name: v }), { hint: r.type || 'Add name', tip: r.type, width: 150, key: `${r.id}:name` }) },
      { label: 'Balance', num: true, render: (ctx, r, m, up) => h('span.row-line', { style: { justifyContent: 'flex-end', flexWrap: 'nowrap' } }, moneyInput(r.values.balance, v => up({ balance: v }), { hint: 'Add balance', key: `${r.id}:balance` }), hoursChip(ctx, r.values.balance)) },
      { label: 'APR', num: true, render: (ctx, r, m, up) => {
        const d = m.debts.find(x => x.id === r.id);
        return h('span.row-line', { style: { justifyContent: 'flex-end', flexWrap: 'nowrap' } }, d?.aprGuess ? h('span.tag.guess', {}, '? Guess') : null, pctInput(r.values.apr, v => up({ apr: v }), { key: `${r.id}:apr` }));
      } },
      { label: 'Payment / mo', num: true, render: (ctx, r, m, up) => {
        const d = m.debts.find(x => x.id === r.id);
        if (d?.inFull) return h('span.computed', { title: 'Paid in full each month' }, amount(ctx, d.payment, { chip: false }), h('span.muted', {}, '\u00a0in full'));
        if (r.type === 'Credit card' && (d?.choice === 'Minimum' || r.values.payment === null || r.values.payment === undefined)) {
          // R036: the minimum is computed and shown; type over it with the statement number.
          return h('span.row-line', { style: { justifyContent: 'flex-end', flexWrap: 'nowrap' } }, d?.payment ? h('span.computed', { title: 'Minimum, worked out' }, amount(ctx, d.payment, { chip: false })) : null,
            moneyInput(null, v => up({ payment: v }), { hint: d?.payment ? 'Statement' : 'Add payment', key: `${r.id}:payment` }));
        }
        return moneyInput(r.values.payment, v => up({ payment: v }), { hint: 'Add payment', key: `${r.id}:payment` });
      } },
      { label: 'Pays off', render: (ctx, r, m) => {
        const d = m.debts.find(x => x.id === r.id);
        const longest = Math.max(0, ...m.debts.map(x => x.payoff.value ?? 0));
        return payoffCell(ctx, d, longest);
      } },
      { label: 'Owner', couple: true, render: (ctx, r, m, up) => ownerToggle(ctx, r, up) },
    ],
    // Enter once: the payment also shows in Cash flow as a Budget line From Debt.
    secondary: (ctx, r, up) => [labelled('In Cash flow', fromButton('Payment on the Budget', '#/cash-flow/budget', `auto:${r.id}`), { note: 'Entered here once; the Budget shows it From Debt' }), ...[debtSecondary(ctx, r, up)].flat()],
    tertiary: (ctx, r, up) => debtTertiary(ctx, r, up),
    subtotal: (ctx, rows) => money(sum(rows, r => r.values.balance)),
    footerTotal: (ctx, recs) => amount(ctx, recs.some(r => r.values.balance != null) ? sum(recs, r => r.values.balance) : null),
    totals: (ctx, recs, m, cols) => {
      const cells = cols.map(c => {
        if (c.label === 'Debt') return h('td', {}, `${recs.length} ${cards === 'only' ? (recs.length === 1 ? 'card' : 'cards') : recs.length === 1 ? 'debt' : 'debts'}`);
        if (c.label === 'Balance') return h('td.num', {}, amount(ctx, recs.some(r => r.values.balance != null) ? sum(recs, r => r.values.balance) : null));
        if (c.label === 'Payment / mo') return h('td.num', {}, amount(ctx, m.debts.some(d => d.payment != null) ? sum(m.debts, d => d.payment) : null));
        return h('td');
      });
      return [...cells, h('td'), h('td')];
    },
    strip: (ctx, m) => (cards === 'only' ? cardsStrip(ctx, m) : debtStrip(ctx, m)),
  };
}

// Debt summary strip: total debt, monthly payments, debt-free, interest left, each with change since
// last session (look preview, Polish rules). Debt-to-income and utilization live on Report > Overview.
export function debtStrip(ctx, m) {
  const debts = m.inputs.debts;
  const usable = debts.filter(d => d.balance > 0);
  const total = debts.some(d => d.balance != null)
    ? { id: 'M30', value: sum(debts, d => d.balance), needs: [], unit: 'money', text: `${debts.filter(d => d.balance != null).map(d => `${d.name} ${money(d.balance)}`).join(' + ')} = ${money(sum(debts, d => d.balance))}.` }
    : needs('M30', ['a debt balance'], { unit: 'money' });
  const payments = debts.some(d => d.payment != null)
    ? { id: 'M30', value: sum(debts, d => d.payment), needs: [], unit: 'money', text: `${debts.filter(d => d.payment != null).map(d => `${d.name} ${money(d.payment)}${d.paymentIsMinimum ? ' (minimum, worked out)' : ''}`).join(' + ')} = ${money(sum(debts, d => d.payment))} a month.` }
    : needs('M30', ['a payment'], { unit: 'money' });
  // Debts missing an APR or payment are left out of the date and interest, and named under the number.
  const complete = usable.filter(d => !d.inFull && d.apr != null && d.payment != null);
  const missing = usable.filter(d => !d.inFull && !complete.includes(d));
  const plan = payoffPlan(complete, { order: m.inputs.debtOrder });
  const free = !complete.length ? needs('M34', usable.length ? missing.map(d => `${d.name} ${d.apr == null ? 'APR' : 'payment'}`) : ['a debt'], { unit: 'months' })
    : plan.months === null ? { ...needs('M34', []), never: true } : { id: 'M34', value: plan.months, needs: [], unit: 'months', text: plan.text };
  const interest = free.value === null ? { ...free, unit: 'money' } : { id: 'M32', value: plan.interest, needs: [], unit: 'money', text: `Paying every debt as planned, the interest still to come adds up to ${money(plan.interest)}.` };
  const note = missing.length ? `${missing.map(d => d.name).join(', ')} ${missing.length === 1 ? 'needs' : 'need'} ${missing.some(d => d.apr == null) ? 'an APR' : 'a payment'}` : null;
  const dateOnly = r => { const t = value(r, ctx); return t.match(/\((.*)\)/)?.[1] ?? t; };
  return summaryStrip(ctx, [
    // Total debt sits in the Net worth headline above.
    { label: 'Monthly payments', result: payments, key: 'debtPayments', lowerIsGood: true },
    { label: 'Debt-free', result: free, key: 'debtFreeMonths', lowerIsGood: true, render: dateOnly, note: free.value !== null ? note : null },
    { label: 'Interest left', result: interest, key: 'debtInterest', lowerIsGood: true, note },
  ]);
}

// Kept for Report > Overview: debt-to-income and utilization.
export function debtRatios(ctx, m) {
  const usable = m.inputs.debts.filter(d => d.balance > 0);
  const gross = m.inputs.grossAnnual === null ? null : m.inputs.grossAnnual / 12; // typed or worked out from take-home (R046)
  const dti = debtToIncome({ monthlyDebtPayments: usable.length ? sum(m.inputs.debts, d => d.payment) : null, grossMonthly: gross });
  const cards = ctx.store.find(r => r.kind === 'debt' && r.type === 'Credit card').map(r => ({ balance: r.values.balance, limit: r.values.limit }));
  const util = utilization(cards);
  return { dti, util: util.hidden ? needs('M35', ['credit limits'], { unit: 'pct' }) : util };
}

// Spending lines: Fixed | Variable, Fixed date | Variable date, who pays, paid with.
// Two passes (polish item 2): Plan edits each line's usual number and this month's plan; Actual is per month.
export function spendingList(ref, { pass = 'Plan', ym = null, groupBy = 'DRAFTT', paidWithColumn = false, planColumn = true } = {}) {
  const cats = ref.categoryDefaults.map(c => c.category);
  // Answer 89: on Plan the Plan column shows only when this month differs from the usual for at least one line.
  const monthCols = pass === 'Plan' && !planColumn ? [] : monthColumns(pass, ym);
  return {
    kind: 'bill', area: 'needs', title: `Spending lines: ${pass}, ${monthName(ym)}`, thing: { one: 'line', plural: 'lines' },
    filter: r => r.kind === 'bill' && !r.values.irregular,
    // Eliminated lines fold away at the bottom; one tap brings one back.
    // Answer to 92: the T letter reads Health and self-care (therapy, insurance, copays, prescriptions); haircuts, personal
    // care and the gym sit in Personal care and hygiene (B6.6). Display only: the letter's stored key stays Therapy.
    groupBy: r => (r.status === 'Not for me' ? 'Not for me' : groupBy === 'Who' ? Object.fromEntries(WHO)[whoOf(r)] : groupBy === 'Category' ? r.values.category || 'Other'
      : r.values.draftt === 'Therapy' ? (['Personal care', 'Gym or fitness', 'Laundry'].includes(r.values.category) ? 'Personal care and hygiene' : 'Health and self-care') : r.values.draftt || 'Other'),
    groupLabel: g => (g === 'Not for me' ? 'Hidden: not for me' : g),
    // B6.6: every section takes a new line, filed under that section.
    groupAdd: g => (g === 'Not for me' || g === 'Debt' || groupBy === 'Category' || groupBy === 'Who' ? null // debts are added on Net worth
      : { name: null, values: { draftt: g === 'Personal care and hygiene' || g === 'Health and self-care' ? 'Therapy' : g, ...(g === 'Personal care and hygiene' ? { category: 'Personal care' } : {}), amountType: 'Variable', timing: 'Variable date' } }),
    key: 'spending-lines', notForMe: true,
    // Groups start folded, showing their subtotal; open or closed is kept for the session.
    lastGroups: ['Not for me'], startFolded: true,
    headerExtra: ctx => (ctx.store.doc.settings.presetsAdded ? null
      : h('button.btn.small', { type: 'button', title: 'About 40 common lines with high starter guesses. Bring them down or mark Not for me.', onclick: () => addPresets(ctx.store, ref) }, icon('plus'), 'Add the usual list')),
    picker: { top: ['Rent or mortgage', 'Groceries, dining out, coffee', 'Electric, gas, water', 'Subscriptions'], other: cats },
    newValues: type => {
      const d = ref.categoryDefaults.find(c => c.category === type);
      return { values: d ? { category: d.category, draftt: d.draftt, amountType: d.amount, timing: d.timing } : {} };
    },
    coreFields: ['amount'],
    paidWith: true,
    columns: [
      { label: 'Line', render: (ctx, r, m, up) => textInput(r.name, v => up({ name: v }), { hint: r.values.category || 'Add name', tip: r.values.category, width: 170, key: `${r.id}:name` }) },
      pass === 'Actual' ? null :
      { label: 'Amount', num: true, render: (ctx, r, m, up) => h('span.row-line', { style: { justifyContent: 'flex-end', flexWrap: 'nowrap', gap: '6px' } },
        premiumOf(ctx, r) ? fromButton(`From ${premiumOf(ctx, r).type}`, '#/net-worth/protection', r.linkedTo, { value: amount(ctx, r.amount, { chip: false }) }) : moneyInput(r.amount, v => up({ amount: v, status: r.status === 'Not sure' ? null : r.status }), { key: `${r.id}:amount` }), // typing the real number clears Guess
        h('span.keep-slot', {}, r.status === 'Not sure' ? h('button.btn.small', { type: 'button', 'data-focus': 'keep', title: 'The starter estimate is right: use it as your number. Or type your own.', onclick: () => up({ status: null }) }, 'Accept estimate') : null),
        shareChip(ctx, r)) }, // the slot keeps amounts lined up
      ...monthCols,
      paidWithColumn ? { label: 'Paid with', render: (ctx, r, m, up) => {
        const cards = ctx.store.find(x => x.kind === 'debt' && x.type === 'Credit card');
        return select([['checking', 'Checking'], ['savings', 'Savings'], ...cards.map(c => [c.id, c.name || 'Credit card'])], r.paidWith, v => up({ paidWith: v }), { label: 'Paid with', hint: 'Paid with', width: 140 });
      } } : null,
      { label: 'Per', render: (ctx, r, m, up) => perPicker(r.per, v => up({ per: v }), { key: `${r.id}:per` }) },
      { label: 'Owner', couple: true, render: (ctx, r, m, up) => ownerToggle(ctx, r, up) },
    ],
    // Amount is and Date is live behind More: the narrowest row (fix pass item 3).
    secondary: (ctx, r, up) => [
      labelled('Amount is', toggle(['Fixed', 'Variable'], r.values.amountType ?? null, v => up({ amountType: v }), { label: 'Amount is' }), { note: 'Fixed feeds the floor' }),
      labelled('Date is', toggle(['Fixed date', 'Variable date'], r.values.timing ?? null, v => up({ timing: v }), { label: 'Date is' }), { note: 'Fixed date lands on its due day' }),
      pass === 'Plan' && ym ? monthPlanField(ctx, r, ym) : null,
      whoPays(r, up, { roommates: ctx.store.doc.profile.roommates ?? 0, profile: ctx.store.doc.profile }), lineSuggestion(r, up),
      labelled('Bedazzle', toggle([[true, 'A joy line'], [false, 'Not one']], r.values.joy === true ? true : r.values.joy === false ? false : null, v => up({ joy: v }), { label: 'Joy line', clearable: true }), { note: 'Joy lines are funded first in the FOO (step 0b)' }),
      // B6.3: low / high for a variable bill; the amount is the average.
      r.values.amountType === 'Variable' ? labelled('Range: low, high', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
        moneyInput(r.values.low ?? null, v => up({ low: v }), { hint: 'Low' }), moneyInput(r.values.high ?? null, v => up({ high: v }), { hint: 'High' })),
      { note: r.values.low != null && r.values.high != null ? `The amount above is your average${r.amount == null ? '; add it' : ''}` : 'A light month and a heavy one', ...park(ctx, r, 'low') }) : null,
      tagsField(r, up)],
    // Not for me counts as $0 everywhere (R058); its group shows what was cut.
    // Enter once: each debt's payment shows here From Debt, in the Debt letter; its number opens the debt.
    autoRows: (ctx, m) => m.inputs.autoLines ?? [],
    autoCell: (ctx, r, c) => (c.label === 'Line' ? h('span.auto-name', {}, r.name)
      : ['Amount', 'Plan'].includes(c.label) && (c.label === 'Amount' || pass === 'Actual') ? fromButton(`From ${r.auto.from}`, r.auto.route, r.auto.sourceId, { value: amount(ctx, r.amount, { chip: false }) })
        : c.label === 'Plan' ? h('span.muted', {}, amount(ctx, r.amount, { chip: false })) // the same every month
        : c.label === 'Per' ? h('span.muted', {}, 'per month') : null),
    rowNote: (ctx, r, m) => (m.inputs.dupOf?.[r.id] ? dupNote(ctx, r, m.inputs.dupOf[r.id], { confirmed: true }) : m.inputs.askOf?.[r.id] ? dupNote(ctx, r, m.inputs.askOf[r.id]) : null),
    // Not for me counts as $0 everywhere (R058); its group shows what was cut.
    subtotal: (ctx, rows) => (rows.every(r => r.status === 'Not for me') ? `$0, cut ${money(sum(rows, r => lineMonthlyOf(r, freqOf(ctx))))} a month` : `${money(sum(rows, keptIn(ctx)))} a month`),
    footerTotal: (ctx, recs) => { const all = withAutos(ctx, recs); return h('span', {}, amount(ctx, all.some(r => r.amount != null) ? sum(all, keptIn(ctx)) : null), h('span.muted', {}, ' a month')); },
    totals: (ctx, recs, m, cols) => { const all = withAutos(ctx, recs); return [...cols.map(c => c.label === 'Line' ? h('td', {}, `${all.filter(r => r.status !== 'Not for me').length} lines`) : c.label === 'Amount' ? h('td.num', {}, amount(ctx, all.some(r => r.amount != null) ? sum(all, keptIn(ctx)) : null)) : h('td')), h('td'), h('td')]; },
  };
}

// B6.7: one line can carry several tags (a dinner can be friends and dates).
const TAG_IDEAS = ['Friends', 'Dates', 'Family', 'Work', 'Self-care', 'Kids', 'Holidays'];
function tagsField(r, up) {
  const tags = r.values.tags || [];
  const add = t => { const x = (t || '').trim(); if (x && !tags.includes(x)) up({ tags: [...tags, x] }); };
  const box = h('input', { placeholder: 'Add a tag', 'aria-label': 'Add a tag', list: 'tag-ideas' });
  box.onchange = () => { add(box.value); box.value = ''; };
  return labelled('Tags', h('span.row-line', { style: { gap: '6px' } },
    ...tags.map(t => h('span.tag.plain.tag-chip', {}, t, h('button.chip-x', { type: 'button', 'aria-label': `Remove tag ${t}`, onclick: () => up({ tags: tags.filter(x => x !== t) }) }, '×'))),
    h('label.field', { style: { width: '140px' } }, box),
    h('datalist', { id: 'tag-ideas' }, TAG_IDEAS.map(t => h('option', { value: t })))), { note: 'A line can have more than one' });
}

const setPlan = (ctx, r, ym) => v => ctx.store.setIn('spending', ['months', ym, 'lines', r.id, 'estimate'], v === null ? undefined : v, 'Plan');
// Behind More on every line: a different plan for just this month (blank = the usual amount).
function monthPlanField(ctx, r, ym) {
  const typed = ctx.store.doc.spending?.months?.[ym]?.lines?.[r.id]?.estimate ?? null;
  return labelled(`Plan for ${monthName(ym, 'short')}`, moneyInput(typed, setPlan(ctx, r, ym), { hint: 'Same as usual', key: `${r.id}:est-more:${ym}` }), { note: 'Only if this month is different; blank uses the usual amount' });
}
// Plan and Actual columns for one month (R134 to R136, R052). A blank month plan uses the line's usual number.
function monthColumns(pass, ym) {
  if (pass === 'Plan') return [{ label: 'Plan', num: true, render: (ctx, r) => {
    // Shown per line only where this month differs from the usual amount; the rest change it under More.
    if (!planDiffs(ctx.store.doc, ym, [r], freqOf(ctx)).has(r.id)) return null;
    const e = estimateOf(ctx.store.doc, ym, r);
    return moneyInput(e.fromRough ? null : e.value, setPlan(ctx, r, ym), { hint: e.value == null ? 'Add plan' : moneyText(e.value), key: `${r.id}:est:${ym}` });
  } }];
  if (pass === 'Actual') return [
    { label: 'Plan', num: true, render: (ctx, r) => h('span.muted', {}, amount(ctx, estimateOf(ctx.store.doc, ym, r).value, { chip: false })) },
    { label: 'Actual', num: true, render: (ctx, r) => {
      const list = instances(ctx.store.doc, ctx.ref, ym, { now: ctx.now() });
      const a = actualOf(ctx.store.doc, ym, r, list);
      const set = v => ctx.store.setIn('spending', ['months', ym, 'lines', r.id, 'actual'], v === null ? undefined : v, 'Actual');
      return h('span.row-line', { style: { justifyContent: 'flex-end', flexWrap: 'nowrap', gap: '6px' } },
        a.from === 'calendar' ? h('span.tag.plain', { title: 'From entries marked Paid on the cash flow calendar' }, 'calendar') : null,
        // B6.11: one tap when the estimate turned out right.
        a.value == null && estimateOf(ctx.store.doc, ym, r).value != null ? h('button.btn.small.confirm-est', { type: 'button', title: 'It came out as planned: use the plan as the actual', 'aria-label': `Same as the plan for ${r.name || 'this line'}`,
          onclick: () => set(estimateOf(ctx.store.doc, ym, r).value) }, '✓ As planned') : null,
        moneyInput(a.from === 'typed' ? a.value : null, set, { hint: a.value == null ? 'Add actual' : moneyText(a.value), key: `${r.id}:act:${ym}` }));
    } },
    { label: 'Difference', num: true, render: (ctx, r) => {
      const list = instances(ctx.store.doc, ctx.ref, ym, { now: ctx.now() });
      const e = estimateOf(ctx.store.doc, ym, r).value, a = actualOf(ctx.store.doc, ym, r, list).value;
      if (e == null || a == null) return h('span.muted', {}, '');
      const d = a - e;
      const share = e ? ` (${d > 0 ? '+' : '−'}${Math.round(Math.abs(d) / e * 100)}%)` : ''; // B6.11: and as a % of the plan
      return h(`span.diff${d > 0.5 ? '.over' : d < -0.5 ? '.under' : ''}`, {}, Math.abs(d) < 0.5 ? 'On plan' : `${d > 0 ? '+' : '−'}${money(Math.abs(d))}${share}`);
    } }];
  return [];
}
// R143, R144: fixed lines are easy to cut and hard to lower; variable lines the other way round.
function lineSuggestion(r, up) {
  if (r.values.amountType === 'Fixed') return labelled('Looking for savings', toggle(['Keep', 'Cancel', 'Renegotiate', 'Switch'], r.values.decision ?? null, v => up({ decision: v }), { label: 'Looking for savings', clearable: true }), { note: 'Fixed: easy to cut, hard to lower' });
  return labelled('Target or cap a month', moneyInput(r.values.target, v => up({ target: v }), { hint: 'Add target' }), { note: 'Variable: easy to lower, hard to cut' });
}

// Irregular and yearly costs (Mockup: Budget › Irregular and yearly costs): the yearly amount, the month it hits,
// and what to set aside each month. Lands on the calendar in its month (R051).
export const IRREGULAR = [
  { name: 'Car registration', gate: 'car' }, { name: 'Car insurance (if paid yearly)', gate: 'car' }, { name: 'Holidays' }, { name: 'Birthdays' },
  { name: 'Renewals (domains, memberships)' }, { name: 'Vet checkup', gate: 'pets' }, { name: 'Travel' }, { name: 'Annual subscriptions' }, { name: 'Tax prep' },
  { name: 'Flights home', trip: true }, { name: 'Trips', trip: true }, // B6.8: recurring trips are their own type
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => [String(i + 1), m]);
export function irregularList(ref, { onWalk } = {}) {
  return {
    kind: 'bill', area: 'needs', title: 'Irregular and yearly costs', key: 'irregular', thing: { one: 'yearly cost', plural: 'yearly costs' },
    filter: r => r.kind === 'bill' && !!r.values.irregular,
    defaultType: 'Yearly cost',
    newValues: () => ({ per: 'year', values: { irregular: true, draftt: 'Other', amountType: 'Fixed', timing: 'Fixed date' } }),
    headerExtra: () => (onWalk ? h('button.btn.small', { type: 'button', onclick: e => onWalk(e.currentTarget) }, icon('right'), 'Walk the list') : null),
    coreFields: ['amount'],
    paidWith: true,
    columns: [
      { label: 'Cost', render: (ctx, r, m, up) => textInput(r.name, v => up({ name: v }), { hint: 'Add name', width: 200, key: `${r.id}:name` }) },
      { label: 'Yearly', num: true, render: (ctx, r, m, up) => moneyInput(r.amount, v => up({ amount: v, per: 'year' }), { hint: 'Add yearly', key: `${r.id}:amount` }) },
      { label: 'Month due', render: (ctx, r, m, up) => select(MONTHS, r.values.monthDue ? String(r.values.monthDue) : null, v => up({ monthDue: v === null ? null : Number(v) }), { label: 'Month due', hint: 'Month', width: 100 }) },
      { label: 'Set aside a month', num: true, render: (ctx, r) => h('span.computed', { title: 'Yearly divided by 12' }, r.amount == null ? 'Needs yearly' : money(r.amount / 12)) },
    ],
    secondary: (ctx, r, up) => {
      const savings = ctx.store.find(x => x.kind === 'account' && x.values.group === 'cash');
      // B6.8: flights and trips: how many a year x what each costs fills the yearly amount.
      const trip = r.values.trip ? [labelled('How many a year', textInput(r.values.timesYear == null ? null : String(r.values.timesYear), x => { const n = Number(x); const t = Number.isFinite(n) && n > 0 ? n : null; up({ timesYear: t, ...(t && r.values.costEach != null ? { amount: t * r.values.costEach, per: 'year' } : {}) }); }, { hint: 'e.g. 3', width: 90 }), park(ctx, r, 'timesYear')),
        labelled('Cost each', moneyInput(r.values.costEach ?? null, x => up({ costEach: x, ...(x != null && r.values.timesYear ? { amount: x * r.values.timesYear, per: 'year' } : {}) }), { hint: 'Add cost' }), { note: 'Fills the yearly amount', ...park(ctx, r, 'costEach') })] : [
        labelled('A trip or flight?', toggle(['Yes', 'No'], r.values.trip ? 'Yes' : null, x => up({ trip: x === 'Yes' }), { label: 'Trip or flight', clearable: true }), { note: 'Count them and price each one' })];
      return [...trip, labelled('Save for it each month', toggle(['Yes', 'No'], r.values.sinking ? 'Yes' : r.values.sinking === false ? 'No' : null, v => up({ sinking: v === 'Yes' }), { label: 'Sinking fund', clearable: true }),
        { note: r.values.sinking ? 'Tracked under Plan › Next 12 months' : null }),
      labelled('Sinking fund', select(savings.map(a => [a.id, a.name || a.type]), r.values.sinkingFund ?? null, v => up({ sinkingFund: v }), { label: 'Sinking fund', hint: savings.length ? 'Which savings account' : 'No savings account yet', width: 200 }), { note: 'Which savings account holds it' })];
    },
    subtotal: (ctx, rows) => `${money(sum(rows, r => r.amount) / 12)} a month`,
    footerTotal: (ctx, recs) => h('span', {}, amount(ctx, recs.some(r => r.amount != null) ? sum(recs, r => r.amount) / 12 : null), h('span.muted', {}, ' a month to set aside')),
  };
}

// Charts for the debt visuals panel.
export const debtCharts = [
  {
    name: 'Balance by debt',
    data: ctx => {
      const ds = ctx.metrics().inputs.debts.filter(d => d.balance != null);
      return ds.length ? { rows: ds.map(d => [d.name, d.balance]) } : { needs: ['a debt balance'] };
    },
    option: (d, t) => ({
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 110, right: 24, top: 8, bottom: 24 },
      xAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
      yAxis: { type: 'category', data: d.rows.map(r => r[0]), axisLabel: { color: t.text, fontWeight: 600 }, axisLine: { lineStyle: { color: t.line } } },
      tooltip: { valueFormatter: v => money(v) },
      series: [{ type: 'bar', data: d.rows.map(r => r[1]), itemStyle: { color: t.area, borderRadius: [0, 4, 4, 0] }, barWidth: 18 }],
    }),
  },
  {
    name: 'Payoff timeline',
    data: ctx => {
      const m = ctx.metrics();
      const ds = m.inputs.debts.filter(d => !d.inFull && d.balance > 0 && d.apr != null && d.payment != null);
      if (!ds.length) return { needs: ['a balance, APR and payment'] };
      const p = payoffPlan(ds, { order: m.inputs.debtOrder });
      return { names: p.debts.map(x => x.name), path: p.path };
    },
    option: (d, t) => ({
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 64, right: 16, top: 28, bottom: 28 },
      legend: { top: 0, textStyle: { color: t.text2 } }, tooltip: { trigger: 'axis', valueFormatter: v => money(v) },
      xAxis: { type: 'category', data: d.path.map((_, i) => i), axisLabel: { color: t.text2 }, name: 'months', nameLocation: 'end' },
      yAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
      series: d.names.map((n, i) => ({ name: n, type: 'line', stack: 'all', areaStyle: { opacity: 0.85 - i * 0.2 }, showSymbol: false, lineStyle: { width: 1 },
        itemStyle: { color: t.area }, data: d.path.map(row => Math.round(row[i])) })),
    }),
  },
];

// ---------- Debt detail behind More, by type (Mockup: Debt) ----------
const stress = (r, up) => labelled('Stress 1 to 5', toggle(['1', '2', '3', '4', '5'], r.stress ? String(r.stress) : null, v => up({ stress: Number(v) }), { label: 'Stress' }));
// Batch 5 (E3): a split bill says on the row what the amount is: "$1,500 your share" or "$240 whole bill, $60 your share".
function shareChip(ctx, r) {
  if (r.amount == null) return null;
  const p = ctx.store.doc.profile;
  const line = withHome({ ...r, ...r.values, amount: r.amount }, p);
  if ((line.whoPays ?? null) !== 'Split') return null;
  const mine = myShare(line, { roommates: p.roommates ?? 0 });
  if (mine.value == null) return null;
  const whole = (line.amountIs ?? 'The whole bill') === 'Your share';
  return h('span.computed.small.share-chip', { title: mine.text }, whole ? 'your share' : `whole bill, ${money(mine.value)} your share`);
}
// F3: the coach's hassle score for Return on Hassle (hassle score over balance, highest first; answer 161).
const hassle = (r, up) => labelled('Hassle 1 to 5', toggle(['1', '2', '3', '4', '5'], r.values.hassle ? String(r.values.hassle) : null, v => up({ hassle: v == null ? null : Number(v) }), { label: 'Hassle', clearable: true }), { note: 'For Return on Hassle: how much this debt nags, per dollar' });
const yn3 = (v, on, label) => toggle(['Yes', 'No', 'Not sure'], v ?? null, on, { label });
function debtSecondary(ctx, r, up) {
  const g = ctx.gates();
  const v = r.values;
  if (r.type === 'Credit card') {
    const choice = v.payChoice ?? (v.payment == null ? 'Minimum' : 'Custom');
    return [
      labelled('Pay', toggle(['Minimum', 'Custom', 'In full'], choice, x => up({ payChoice: x }), { label: 'Pay' })),
      choice === 'Custom' ? labelled('Custom $ a month', moneyInput(v.payment, x => up({ payment: x }), { hint: 'Add payment' })) : null, // R020
      labelled('0% promo: rate and end', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, pctInput(v.promoApr, x => up({ promoApr: x }), { hint: 'e.g. 0' }),
        textInput(v.promoEnd, x => up({ promoEnd: x }), { hint: 'YYYY-MM', width: 110 })), { note: 'Warns 60 days before it ends' }),
      labelled('Due day', textInput(v.dueDay, x => up({ dueDay: x }), { hint: 'Add day', width: 90 }), { note: 'Shows on the cash flow calendar' }),
      labelled('Statement closes on day', dayBox(v.statementDay, x => up({ statementDay: x })), { note: 'The balance reported to the bureaus', ...park(ctx, r, 'statementDay') }),
      labelled('Credit limit', moneyInput(v.limit, x => up({ limit: x }), { hint: 'Add limit' }), { note: 'For utilization' }),
      labelled('Utilization', v.limit && v.balance != null ? h('span.computed', { title: 'Balance divided by limit' }, pct(v.balance / v.limit)) : h('span.muted', {}, 'Needs balance and limit'),
        { note: v.limit && v.balance / v.limit > 0.3 ? 'Over 30% can lower your score' : null }),
      labelled('Autopay', toggle(['On', 'Off'], v.autopay ?? null, x => up({ autopay: x }), { label: 'Autopay', clearable: true }), { note: v.autopay === 'Off' ? 'Turn it on for at least the minimum: one late payment hurts' : null, ...park(ctx, r, 'autopay') }),
      labelled('Rewards', select(['Cash back', 'Points', 'Miles', 'None'], v.rewards ?? null, x => up({ rewards: x }), { label: 'Rewards type', width: 140 }), park(ctx, r, 'rewards')),
      labelled('Personal or business', toggle(['Personal', 'Business'], v.use ?? null, x => up({ use: x }), { label: 'Personal or business' })),
      billsOnCard(ctx, r),
      stress(r, up), hassle(r, up)];
  }
  if (r.type === 'Student loan') {
    return [
      labelled('Federal or private', toggle(['Federal', 'Private'], v.federal ?? null, x => up({ federal: x }), { label: 'Federal or private' })),
      applies('repaymentPlan', { g, r }) ? labelled('Repayment plan', select(['Standard', 'Income-driven', 'Other'], v.plan ?? null, x => up({ plan: x }), { label: 'Repayment plan', width: 170 })) : null,
      labelled('Servicer', textInput(v.servicer, x => up({ servicer: x }), { hint: 'Add servicer', width: 170 })),
      stress(r, up), hassle(r, up)];
  }
  if (r.type === 'Car loan' || r.type === 'Mortgage') {
    const kind = r.type === 'Car loan' ? 'Car' : 'Home';
    const things = ctx.visible(x => x.kind === 'asset' && x.type === kind);
    return [
      labelled(`Linked ${kind.toLowerCase()}`, select(things.map(a => [a.id, a.name || kind]), r.linkedTo, x => up({ linkedTo: x }), { label: `Linked ${kind.toLowerCase()}`, hint: things.length ? `Pick the ${kind.toLowerCase()}` : `No ${kind.toLowerCase()} on Assets yet`, width: 190 }),
        { note: 'The same loan shows on the asset' }),
      r.type === 'Car loan' ? labelled('Months left', textInput(v.monthsLeft, x => up({ monthsLeft: x === null ? null : Number(x) }), { hint: 'Add months', width: 110 }), { note: 'Checks the payoff date' })
        : labelled('Fixed or adjustable', toggle(['Fixed', 'Adjustable'], v.rateType ?? null, x => up({ rateType: x }), { label: 'Fixed or adjustable' })),
      r.type === 'Mortgage' ? labelled('Years left', textInput(v.yearsLeft, x => up({ yearsLeft: x === null ? null : Number(x) }), { hint: 'Add years', width: 100 })) : null,
      stress(r, up), hassle(r, up)];
  }
  // Any other debt: the fields unique to its type (Mockup: Debt › Any other debt).
  const unique = {
    Medical: () => labelled('In collections', yn3(v.collections, x => up({ collections: x }), 'In collections')),
    'Family or friend': () => labelled('Terms agreed', textInput(v.terms, x => up({ terms: x }), { hint: 'What was agreed', width: 260 })),
    'Buy now, pay later': () => labelled('Payments left', textInput(v.paymentsLeft, x => up({ paymentsLeft: x === null ? null : Number(x) }), { hint: 'Add number', width: 110 })),
    'Payday or cash advance': () => {
      const apr = feeApr({ fee: v.fee ?? null, amount: v.balance ?? null, periodsPerYear: v.periods ?? null });
      return h('span.row-line', { style: { gap: '12px' } },
        labelled('Fee per period', moneyInput(v.fee, x => up({ fee: x }), { hint: 'Add fee' })),
        labelled('Periods a year', textInput(v.periods, x => up({ periods: x === null ? null : Number(x) }), { hint: 'e.g. 26', width: 90 })),
        labelled('As an APR', h('span.computed', {}, apr.value === null ? `Needs ${apr.needs.join(' and ')}` : value(apr))));
    },
    'Tax debt': () => labelled('Payment plan in place', yn3(v.taxPlan, x => up({ taxPlan: x }), 'Payment plan')),
    '401(k) loan': () => labelled('If you leave the job', h('span.computed', {}, 'Due in full, or it counts as a withdrawal')),
    Business: () => labelled('Personally guaranteed', yn3(v.guaranteed, x => up({ guaranteed: x }), 'Personally guaranteed')),
  };
  return [unique[r.type]?.() ?? null, stress(r, up), hassle(r, up)];
}
const dayBox = (value, onChange) => textInput(value == null ? null : String(value), x => { const n = Number(x); onChange(Number.isInteger(n) && n >= 1 && n <= 31 ? n : null); }, { hint: 'Day, 1 to 31', width: 110 });

// Credit cards across the board (M1.2) and the credit score (M1.3), under the Debt list.
// Credit cards strip: what the cards add up to (the Debt strip keeps every debt, cards included).
function cardsStrip(ctx, m) {
  const cards = m.inputs.debts.filter(d => d.type === 'Credit card');
  const owed = cards.some(d => d.balance != null) ? { id: 'M30', value: cards.reduce((t, d) => t + (d.balance ?? 0), 0), needs: [], unit: 'money', text: cards.map(d => `${d.name} ${money(d.balance)}`).join(' + ') + '.' } : needs('M30', ['a card balance'], { unit: 'money' });
  const pay = cards.some(d => d.payment != null) ? { id: 'M30', value: cards.reduce((t, d) => t + (d.payment ?? 0), 0), needs: [], unit: 'money', text: cards.map(d => `${d.name} ${money(d.payment)}${d.paymentIsMinimum ? ' (minimum, worked out)' : ''}`).join(' + ') + ' a month.' } : needs('M30', ['a payment'], { unit: 'money' });
  const guessed = cards.filter(d => d.aprGuess).length;
  return summaryStrip(ctx, [
    { label: 'Owed on cards', result: owed, lowerIsGood: true },
    { label: 'Card payments a month', result: pay, lowerIsGood: true, note: guessed ? `${guessed} ${guessed === 1 ? 'APR is' : 'APRs are'} a 25% Guess until typed` : null },
  ]);
}
// Debt › a line pointing at the cards, which now have their own sub-tab.
export function cardsLink(ctx) {
  const cards = ctx.visible(r => r.kind === 'debt' && r.type === 'Credit card');
  const owed = cards.reduce((t, r) => t + (r.values.balance ?? 0), 0);
  return h('div.row-line.cards-link', { style: { gap: '10px', margin: '8px 0 16px' } },
    h('span', {}, cards.length ? `Credit cards: ${cards.length} ${cards.length === 1 ? 'card' : 'cards'}, ${money(owed)} owed. They count in the totals above.` : 'No credit cards yet.'),
    h('button.btn.small', { type: 'button', onclick: () => { location.hash = '#/net-worth/credit-cards'; } }, cards.length ? 'Open Credit cards' : 'Add a card on Credit cards'));
}
export function creditCard(ctx) {
  const cards = ctx.visible(r => r.kind === 'debt' && r.type === 'Credit card');
  const util = utilization(cards.map(r => ({ balance: r.values.balance, limit: r.values.limit })));
  const p = ctx.store.doc.profile;
  const c = p.credit || {};
  const set = patch => ctx.store.setDoc('profile', { credit: { ...c, ...patch } });
  const d = h('input', { type: 'date', value: c.checked || '', 'aria-label': 'Date checked' });
  d.onchange = () => set({ checked: d.value || null });
  const per = cards.filter(r => r.values.limit && r.values.balance != null);
  return h('section.section.area-debt', {}, h('div.section-title', {}, h('h2', {}, 'Credit')),
    h('div.card', {}, h('div.form-grid', {},
      cards.length ? metricCard(ctx, 'Card utilization, all cards', util.hidden ? needs('M35', ['credit limits'], { unit: 'pct' }) : util,
        { lowerIsGood: true, note: per.length > 1 ? per.map(r => `${r.name || 'Card'} ${pct(r.values.balance / r.values.limit)}`).join(' · ') : 'Under 30% helps your score; under 10% is best' }) : null,
      labelled('Credit score', textInput(c.score == null ? null : String(c.score), x => { const n = Number(x); set({ score: Number.isInteger(n) && n >= 300 && n <= 900 ? n : null }); }, { hint: '300 to 850', width: 110 }), parkProfile(ctx.store, 'creditScore')),
      labelled('Where you checked it', select(['Credit Karma', 'Bank or card app', 'Experian', 'Equifax', 'TransUnion', 'myFICO', 'Other'], c.source ?? null, x => set({ source: x }), { label: 'Score source', width: 170 })),
      labelled('Date checked', h(`label.field${c.checked ? '.filled' : ''}`, { style: { width: '160px' } }, d)))));
}

// R103: the card lists the bills charged to it. R104: paid in full they are spending; carried, they add to the balance.
function billsOnCard(ctx, card) {
  const bills = ctx.visible(x => x.kind === 'bill' && x.paidWith === card.id && x.status !== 'Not for me');
  if (!bills.length) return labelled('Bills on this card', h('span.muted', {}, 'None yet. Link one from a bill\'s More ▸ Paid with.'));
  const total = sum(bills, b => lineMonthlyOf(b, freqOf(ctx)) ?? 0);
  const inFull = card.values.payChoice === 'In full';
  return labelled(`Bills on this card: ${bills.length}, ${money(total)}/mo`, h('span.row-line', { style: { gap: '6px' } }, bills.map(b => h('a.tag.plain', { href: '#/cash-flow/budget' }, b.name || b.values.category))),
    { note: inFull ? 'Paid in full: these count as spending, no interest' : 'Carrying a balance: these add to what you owe each month' });
}
function debtTertiary(ctx, r, up) {
  const g = ctx.gates();
  const v = r.values;
  const notes = labelled('Coach notes', textInput(r.privateNote, x => up({ privateNote: x }), { hint: 'Add a private note', width: 360 }));
  if (r.type === 'Credit card') {
    return [labelled('Institution', textInput(v.institution, x => up({ institution: x }), { hint: 'Bank', width: 160 })),
      labelled('Opened', textInput(v.opened, x => up({ opened: x }), { hint: 'YYYY-MM', width: 110 }), { note: 'Card age' }),
      labelled('Annual fee', moneyInput(v.annualFee, x => up({ annualFee: x }), { hint: 'Add fee' })),
      labelled('Sign-up bonus: $, spend, by when', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
        moneyInput(v.bonus, x => up({ bonus: x }), { hint: 'Bonus' }), moneyInput(v.bonusSpend, x => up({ bonusSpend: x }), { hint: 'Spend' }),
        textInput(v.bonusBy, x => up({ bonusBy: x }), { hint: 'YYYY-MM-DD', width: 120 }))), notes];
  }
  if (r.type === 'Student loan') {
    return [applies('pslf', { g, r }) ? labelled('PSLF eligible', yn3(v.pslf, x => up({ pslf: x }), 'PSLF')) : null,
      labelled('Forbearance or deferment', select(['None', 'Forbearance', 'Deferment'], v.forbearance ?? null, x => up({ forbearance: x }), { label: 'Forbearance or deferment', width: 170 })), notes];
  }
  return [notes];
}
