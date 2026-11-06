// SPDX-License-Identifier: AGPL-3.0-only
// List setups built from the staples: debts and spending lines. Each list is a view of the one record type.
import { h, icon } from './dom.js';
import { addPresets } from '../presets.js';
import { METHODS } from '../registry/debt.js';
import { personLabels } from '../registry/couples.js';
import { institutionLink } from './institutions-ui.js';
import { tapPick, openSource, recordList as S_recordList, popover as S_popover, closePop as S_closePop, moreBlock as S_moreBlock, secWrap as S_secWrap, fromButton, confirmBox, toast, button, warnTag, moneyText, value, amount, iconButton, moneyInput, pctInput, textInput, perPicker, perChip, nameInput, toggle, select, labelled, payoffCell, summaryStrip, whoPays, WHO, whoOf, hoursChip, park, parkProfile, metricCard, ownerToggle } from './staples.js';
import { paidInFull } from '../completion.js';
import { pct } from '../format.js';
import { feeApr, promoPayoffOf } from '../math/debt.js';
import { WEEKDAYS, SHABBAT_SPEND_DAY } from '../math/holidays.js';
import { monthlyFrom } from '../math/income.js';
import { withHome, myShare, DRAFTT, drafttName, CATEGORIES, categoryName, categoryKeyOf, isCategoryRecord, isFaded, typicalOf, typicalTotal, categoryTypicalOf, levelOf, LEVEL_ELSE, everythingElse } from '../math/spending.js';
import { FREQS, DAY_CHIPS, WEEKDAY_CHIPS, MONTH_CHIPS, timingOf, timingPatch, timingWords, ordinal } from '../timing.js';
import { applies } from '../gates.js';
import { payoffPlan, debtToIncome, utilization, creditHealth, BUREAUS, yearsText } from '../math/debt.js';
import { needs } from '../math/result.js';
import { money } from '../format.js';
import { estimateOf, actualOf, instances, monthName, planDiffs, addMonths, ymOf } from '../month.js';

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
    coreFields: r => (paidInFull(r) ? ['balance'] : ['balance', 'apr']), // batch 7, item 11: a card paid in full needs no APR
    focus: ['Debt', 'Balance', 'APR', 'Payment / mo'], // session 1: type, balance, APR, minimum
    paidWith: false,
    columns: [
      { label: 'Debt', render: (ctx, r, m, up) => h('span.stack.inst-cell', { style: { gap: '2px' } }, nameInput(r.name, v => up({ name: v }), { hint: 'Nickname (optional)', tip: r.type, width: 170, key: `${r.id}:name` }), institutionLink(ctx, r, up, { word: isCard(r) ? 'Add issuer' : 'Add lender' })) }, // batch 11 (5e, 5f): a link, then a name that wraps
      // Batch 7, item 11: a card's first question is whether the statement is paid in full each month. In full: the
      // balance is the statement balance (it still counts for utilization), there is no APR and no payment to ask.
      // Carries: the balance carried, the APR (a 25% guess until typed) and the payment, like any debt.
      { label: 'Balance', num: true, render: (ctx, r, m, up) => {
        const inFull = paidInFull(r), asked = isCard(r) && (inFull || r.values.payChoice != null);
        const box = h('span.row-line', { style: { justifyContent: 'flex-end', flexWrap: 'nowrap' } }, moneyInput(r.values.balance, v => up({ balance: v }), { hint: isCard(r) ? (inFull ? 'Statement balance' : 'Balance carried') : 'Add balance', key: `${r.id}:balance` }), hoursChip(ctx, r.values.balance));
        if (!isCard(r)) return box;
        return h('span.stack.card-first', { style: { gap: '4px', alignItems: 'flex-end' } },
          toggle([['In full', 'Paid in full'], ['Carries', 'Carries a balance']], asked ? (inFull ? 'In full' : 'Carries') : null, x => up({ payChoice: x === 'In full' ? 'In full' : (r.values.payment == null ? 'Minimum' : 'Custom') }), { label: `Statement paid in full each month: ${r.name || r.type}` }), box);
      } },
      { label: 'APR', num: true, render: (ctx, r, m, up) => {
        if (paidInFull(r)) return h('span.muted.small', { title: 'Paid in full each month: no interest' }, 'None: paid in full');
        const d = m.debts.find(x => x.id === r.id);
        // Batch 11 (item 5b): a guessed APR is the faded typical rate in the box itself, with one tap to keep it.
        const typical = ctx.ref.typicalRates?.[r.type] ?? null;
        if (d?.aprGuess && typical != null && (r.values.apr === null || r.values.apr === undefined)) {
          const shown = `${+(typical * 100).toFixed(2)}`;
          return h('span.row-line.apr-guess', { style: { justifyContent: 'flex-end', flexWrap: 'nowrap', gap: '6px' } },
            h('button.btn.small.use-guess', { type: 'button', title: `Keep ${shown}% (the typical ${r.type.toLowerCase()} rate) as the APR`, 'aria-label': `Use ${shown}% as the APR for ${r.name || r.type}`, onclick: () => { ctx.store.transaction('Use the typical APR', () => { ctx.store.update(r.id, { apr: typical }); ctx.store.setFieldStatus(r.id, 'apr', null); }); toast(`APR set to ${shown}%.`, { undo: () => ctx.store.undo() }); } }, 'Use'), // batch 19: Use before the box, so the box sits in the same place as on rows without one
            pctInput(null, v => up({ apr: v }), { key: `${r.id}:apr`, hint: shown }));
        }
        return h('span.row-line', { style: { justifyContent: 'flex-end', flexWrap: 'nowrap' } }, d?.aprGuess ? h('span.tag.guess', {}, '? Guess') : null, pctInput(r.values.apr, v => up({ apr: v }), { key: `${r.id}:apr`, hint: 'APR' }));
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
        const longest = Math.max(0, ...m.debts.map(x => x.planMonths ?? x.payoff.value ?? 0));
        const promo = isCard(r) && !paidInFull(r) ? promoPayoffOf(r, ctx.now()) : null; // batch 15, item 5
        return promo ? h('span.stack', { style: { gap: '2px' } }, payoffCell(ctx, d, longest), h('span.small.promo-line', { title: promo.result.text }, promo.text)) : payoffCell(ctx, d, longest);
      } },
      { label: 'Owner', couple: true, render: (ctx, r, m, up) => ownerToggle(ctx, r, up) },
    ],
    // Enter once: the payment also shows in Cash flow as a Budget line From Debt.
    secondary: (ctx, r, up) => [labelled('In Cash flow', fromButton('Payment on the Budget', '#/cash-flow/budget', `auto:${r.id}`), { note: 'Entered here once; the Budget shows it From Debt' }), ...[debtSecondary(ctx, r, up)].flat()],
    tertiary: (ctx, r, up) => debtTertiary(ctx, r, up),
    subtotal: (ctx, rows) => amount(ctx, sum(rows, r => r.values.balance), { chip: false }), // item 16
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
    stripWhenEmpty: cards === 'none', // batch 11: the debt-free date shows even when the cards are the only debt
    lead: cards === 'none' ? ctx => { const cs = ctx.visible(r => r.kind === 'debt' && r.type === 'Credit card'); return cs.length ? cardsRow(ctx, cs) : null; } : null,
    emptyThing: cards === 'none' ? ctx => (ctx.visible(r => r.kind === 'debt' && r.type === 'Credit card').length ? { one: 'debt', plural: 'debts', empty: 'No other debts yet: a student loan, a car loan, a personal loan' } : null) : null,
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
  const plan = m.debtPlan; // batch 11: the one debt plan (the surplus to heavy debt first)
  const free = !complete.length ? needs('M34', usable.length ? missing.map(d => `${d.name} ${d.apr == null ? 'APR' : 'payment'}`) : ['a debt'], { unit: 'months' })
    : plan.months === null ? { ...needs('M34', []), never: true } : { id: 'M34', value: plan.months, needs: [], unit: 'months', text: plan.text };
  const interest = free.value === null ? { ...free, unit: 'money' } : { id: 'M32', value: plan.interest, needs: [], unit: 'money', text: `Paying every debt as planned, the interest still to come adds up to ${money(plan.interest)}.` };
  const alone = m.debtPlanMinimum && m.debtPlanMinimum !== plan ? m.debtPlanMinimum.months : undefined;
  const aloneNote = alone === undefined || alone === plan.months ? null : `If only each debt's own payment is paid: ${alone == null ? 'never' : monthName(addMonths(ymOf(ctx.now()), alone), 'short')}`;
  const note = missing.length ? `${missing.map(d => d.name).join(', ')} ${missing.length === 1 ? 'needs' : 'need'} ${missing.some(d => d.apr == null) ? 'an APR' : 'a payment'}` : aloneNote;
  const dateOnly = r => { const t = value(r, ctx); return t.match(/\((.*)\)/)?.[1] ?? t; };
  return summaryStrip(ctx, [
    // Total debt sits in the Net worth headline above.
    { label: 'Monthly payments', result: payments, key: 'debtPayments', lowerIsGood: true },
    { label: 'Debt-free', result: free, key: 'debtFreeMonths', lowerIsGood: true, render: dateOnly, note: free.value !== null ? [note, usable.length > 1 ? 'Freed payments roll into the next debt' : null].filter(Boolean).join(' · ') || null : null }, // batch 13: the date assumes the roll, so it says so
    { label: 'Interest left', result: interest, key: 'debtInterest', lowerIsGood: true, note },
  ]);
}

// Kept for Report > Overview: debt-to-income and utilization.
export function debtRatios(ctx, m) {
  const usable = m.inputs.debts.filter(d => d.balance > 0);
  const gross = m.inputs.grossAnnual === null ? null : m.inputs.grossAnnual / 12; // typed or worked out from take-home (R046)
  // Batch 13: no debt on file is a real 0% (no payments), not a lock; no card means utilization does not apply.
  const noDebt = !ctx.store.find(r => r.kind === 'debt').length || m.inputs.gates?.areas?.debt === false;
  const dti = debtToIncome({ monthlyDebtPayments: usable.length ? sum(m.inputs.debts, d => d.payment) : noDebt ? 0 : null, grossMonthly: gross });
  const cards = ctx.store.find(r => r.kind === 'debt' && r.type === 'Credit card').map(r => ({ balance: r.values.balance, limit: r.values.limit }));
  if (!cards.length) return { dti, util: { id: 'M35', value: 0, needs: [], unit: 'pct', none: true, text: 'No credit cards on file, so there is no utilization to count.' } };
  const util = utilization(cards);
  return { dti, util: util.hidden ? needs('M35', ['credit limits'], { unit: 'pct' }) : util };
}

// Spending lines: Fixed | Variable, Fixed date | Variable date, who pays, paid with.
// Two passes (polish item 2): Plan edits each line's usual number and this month's plan; Actual is per month.
export function spendingList(ref, { pass = 'Plan', ym = null, groupBy = 'DRAFTT', paidWithColumn = false, planColumn = true, only = null } = {}) {
  // only: the lines of one category (batch 8, A2), shown under the category's caret on the Budget.
  const cats = (only ? ref.categoryDefaults.filter(c => (c.draftt ?? 'Other') === only) : ref.categoryDefaults).map(c => c.category);
  // Answer 89: on Plan the Plan column shows only when this month differs from the usual for at least one line.
  const monthCols = pass === 'Plan' && !planColumn ? [] : monthColumns(pass, ym);
  return {
    kind: 'bill', area: 'needs', title: only ? `${categoryName(only)}: the lines` : `Spending lines: ${pass}, ${monthName(ym)}`, thing: { one: 'line', plural: 'lines' }, caret: !only, parentOf: only ? ctx => ctx.store.find(x => isCategoryRecord(x) && x.type === only)[0]?.id : undefined, // batch 13: inside a category the category row is the caret, and Fix it opens it first
    filter: r => r.kind === 'bill' && !r.values.irregular && (!only || categoryKeyOf(r) === only),
    // Eliminated lines fold away at the bottom; one tap brings one back.
    // Answer to 92: the T letter reads Health and self-care (therapy, insurance, copays, prescriptions); haircuts, personal
    // care and the gym sit in Personal care and hygiene (B6.6). Display only: the letter's stored key stays Therapy.
    // Batch 10 (item 3): under a category the lines sit by level: Level 1 and 2 as they are, Level 3 in one Everything
    // else group (folded, its own amount). Item 5f: a group header always names its group.
    groupBy: r => (only ? (r.status === 'Not for me' ? 'Not for me' : levelOf(r) === LEVEL_ELSE ? ELSE_GROUP : categoryName(only)) : r.status === 'Not for me' ? 'Not for me' : groupBy === 'Who' ? Object.fromEntries(WHO)[whoOf(r)] : groupBy === 'Category' ? r.values.category || 'Other'
      : r.values.draftt === 'Therapy' ? (['Personal care', 'Gym or fitness', 'Laundry'].includes(r.values.category) ? 'Personal care and hygiene' : 'Health and self-care') : r.values.draftt ? drafttName(r.values.draftt) : 'Other'),
    groupLabel: g => (g === 'Not for me' ? 'Hidden: not for me' : g || (only ? categoryName(only) : 'Other')),
    foldedGroups: [ELSE_GROUP],
    // The core progress and the "N of M" nags count Level 1 and 2 lines; Everything else is fine rough.
    counts: r => levelOf(r) !== LEVEL_ELSE,
    groupExtra: (ctx, g, rows) => (g === ELSE_GROUP && only ? elseBucket(ctx, only, rows) : typicalNote(ctx, rows)),
    menuExtra: (ctx, r, up) => (levelOf(r) === LEVEL_ELSE ? [{ label: 'Move up (its own line)', icon: 'right', run: () => up({ level: 2 }) }] : [{ label: 'Move down (into Everything else)', icon: 'down', run: () => up({ level: LEVEL_ELSE }) }]),
    // B6.6: every section takes a new line, filed under that section.
    groupAdd: g => (g === 'Not for me' || g === 'Debt' || g === ELSE_GROUP || groupBy === 'Category' || groupBy === 'Who' || only ? null // debts are added on Net worth; under a category the list's own Add a line files it there
      : { name: null, values: { draftt: g === 'Personal care and hygiene' || g === 'Health and self-care' ? 'Therapy' : g === drafttName('Bills') ? 'Bills' : g === 'Other' ? null : g, ...(g === 'Personal care and hygiene' ? { category: 'Personal care' } : {}), amountType: 'Variable', timing: 'Variable date' } }),
    key: only ? `spending-lines:${only}` : 'spending-lines', notForMe: true,
    // Groups start folded, showing their subtotal; open or closed is kept for the session. Under a category the
    // Level 1 and 2 lines show; Everything else starts folded.
    lastGroups: [ELSE_GROUP, 'Not for me'], startFolded: !only,
    headerExtra: ctx => (only || ctx.store.doc.settings.presetsAdded ? null
      : h('button.btn.small', { type: 'button', title: 'About 40 common lines with high starter guesses. Bring them down or mark Not for me.', onclick: () => addPresets(ctx.store, ref) }, icon('plus'), 'Add the usual list')),
    picker: only ? { top: cats.slice(0, 4), other: cats.slice(4) } : { top: ['Rent or mortgage', 'Groceries, dining out, coffee', 'Electric, gas, water', 'Subscriptions'], other: cats },
    newValues: type => {
      const d = ref.categoryDefaults.find(c => c.category === type);
      const v = d ? { category: d.category, draftt: d.draftt, amountType: d.amount, timing: d.timing } : {};
      return { values: only ? { ...v, draftt: only === 'Other' ? null : only } : v }; // a line added under a category stays in it
    },
    coreFields: ['amount'],
    paidWith: false, // batch 10: Paid with sits in the side panel's Who pays
    columns: [
      { label: 'Line', render: (ctx, r, m, up) => nameInput(r.name, v => up({ name: v }), { hint: r.values.category || 'Add name', tip: r.values.category, width: 190, key: `${r.id}:name` }) }, // batch 8 (B11): wraps
      pass === 'Actual' ? null :
      { label: 'Amount', num: true, render: (ctx, r, m, up) => h('span.row-line', { style: { justifyContent: 'flex-end', flexWrap: 'nowrap', gap: '6px' } },
        premiumOf(ctx, r) ? fromButton(`From ${premiumOf(ctx, r).type}`, '#/net-worth/protection', r.linkedTo, { value: amount(ctx, r.amount, { chip: false }) })
          : isFaded(r) ? fadedInput(r, up) // batch 10: the typical amount shows faded in the box and counts nowhere until used or typed
            : moneyInput(r.amount, v => up(typedPatch(r, v)), { key: `${r.id}:amount` }), // typing the real number clears Guess
        premiumOf(ctx, r) ? null : perChip(r.per, v => up({ per: v }), { key: `${r.id}:per` }), // batch 8 (B7): the period lives in the amount
        h('span.keep-slot', {}, isFaded(r) ? useButton(r, up)
          : r.status === 'Not sure' ? h('button.btn.small', { type: 'button', 'data-focus': 'keep', title: `The starter estimate (${moneyText(r.amount)}) is right: use it as your number. Or type your own.`, onclick: () => up({ status: null }) }, 'Use') : null), // batch 8 (B6)
        shareChip(ctx, r)) }, // the slot keeps amounts lined up
      ...monthCols,
      paidWithColumn ? { label: 'Paid with', render: (ctx, r, m, up) => {
        const cards = ctx.store.find(x => x.kind === 'debt' && x.type === 'Credit card');
        return select([['checking', 'Checking'], ['savings', 'Savings'], ...cards.map(c => [c.id, c.name || 'Credit card'])], r.paidWith, v => up({ paidWith: v }), { label: 'Paid with', hint: 'Paid with', width: 140 });
      } } : null,
      { label: 'Owner', couple: true, render: (ctx, r, m, up) => ownerToggle(ctx, r, up) },
    ],
    // Batch 8 (B8): the bulk bar's Move to section changes the DRAFTT letter.
    moveTo: { label: 'Move to section', options: () => [...DRAFTT, 'Other'].map(k => [k, drafttName(k)]), apply: (ctx, id, k) => ctx.store.update(id, { draftt: k === 'Other' ? null : k }) },
    // Batch 10 (item 5): the details open in a side panel (a bottom sheet on a phone): the timing as one sentence set
    // by taps, who pays as one row, and More folded. The amount stays typable in the row and in the panel.
    panel: { title: (ctx, r) => r.name || r.values.category || 'Spending line', build: (ctx, r, up) => linePanel(ctx, r, up, { pass, ym }) },
    // Not for me counts as $0 everywhere (R058); its group shows what was cut.
    // Enter once: each debt's payment shows here From Debt, in the Debt letter; its number opens the debt.
    autoRows: (ctx, m) => (m.inputs.autoLines ?? []).filter(a => !only || categoryKeyOf(a) === only), // under a category: only its own From Debt rows
    autoCell: (ctx, r, c) => (c.label === 'Line' ? h('span.auto-name', {}, r.name)
      : ['Amount', 'Plan'].includes(c.label) && (c.label === 'Amount' || pass === 'Actual') ? fromButton(`From ${r.auto.from}`, r.auto.route, r.auto.sourceId, { value: amount(ctx, r.amount, { chip: false }) })
        : c.label === 'Plan' ? h('span.muted', {}, amount(ctx, r.amount, { chip: false })) // the same every month
        : null),
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
  return labelled(`Different in ${monthName(ym, 'short')}`, moneyInput(typed, setPlan(ctx, r, ym), { hint: 'Same as usual', key: `${r.id}:est-more:${ym}`, width: 170 }), { tip: 'Only if this month is different; blank uses the usual amount' });
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
  // Batch 10 (5d): Keep or Try to cut (stored as Keep and Cancel; an older Renegotiate or Switch reads as Try to cut).
  if (r.values.amountType === 'Fixed') return labelled('Looking for savings', toggle([['Keep', 'Keep'], ['Cancel', 'Try to cut']], r.values.decision == null ? null : r.values.decision === 'Keep' ? 'Keep' : 'Cancel', v => up({ decision: v }), { label: 'Looking for savings', clearable: true }), { tip: 'Fixed: easy to cut, hard to lower' });
  return labelled('Target or cap a month', moneyInput(r.values.target, v => up({ target: v }), { hint: 'Add target' }), { tip: 'Variable: easy to lower, hard to cut' });
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
const stress = (r, up) => labelled('Stress 1 to 5', toggle(['1', '2', '3', '4', '5'], r.stress ? String(r.stress) : null, v => up({ stress: Number(v) }), { label: 'Stress', key: `${r.id}:stress` }));
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
    const carries = choice !== 'In full'; // batch 7, item 11: the debt fields show only when the card carries a balance
    return [
      carries ? labelled('Pay', toggle(['Minimum', 'Custom', 'In full'], choice, x => up({ payChoice: x }), { label: 'Pay' })) : labelled('Pay', h('span.computed', {}, 'In full each month')),
      choice === 'Custom' ? labelled('Custom $ a month', moneyInput(v.payment, x => up({ payment: x }), { hint: 'Add payment' })) : null, // R020
      carries ? labelled('0% promo: rate and end', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, pctInput(v.promoApr, x => up({ promoApr: x }), { hint: 'e.g. 0' }),
        textInput(v.promoEnd, x => up({ promoEnd: x }), { hint: 'YYYY-MM', width: 110 })), { note: promoPayoffOf(r, ctx.now())?.text ?? 'Warns 60 days before it ends' }) : null,
      labelled('Due day', textInput(v.dueDay, x => up({ dueDay: x }), { hint: 'Add day', width: 90, key: `${r.id}:dueDay` }), { note: 'Shows on the cash flow calendar; a fixed line with no day sits on the 1st with a ? badge' }),
      labelled('Statement closes on day', dayBox(v.statementDay, x => up({ statementDay: x })), { note: 'The balance reported to the bureaus', ...park(ctx, r, 'statementDay') }),
      labelled('Credit limit', moneyInput(v.limit, x => up({ limit: x }), { hint: 'Add limit', key: `${r.id}:limit` }), { note: 'For utilization' }),
      labelled('Utilization', v.limit && v.balance != null ? h('span.computed', { title: 'Balance divided by limit' }, pct(v.balance / v.limit)) : h('span.muted', {}, 'Needs balance and limit'),
        { note: v.limit && v.balance / v.limit > 0.3 ? 'Over 30% can lower your score' : null }),
      labelled('Autopay', toggle(['On', 'Off'], v.autopay ?? null, x => up({ autopay: x }), { label: 'Autopay', clearable: true }), { note: v.autopay === 'Off' ? 'Turn it on for at least the minimum: one late payment hurts' : null, ...park(ctx, r, 'autopay') }),
      labelled('Rewards', tapPick(['Cash back', 'Points', 'Miles', 'None'], v.rewards ?? null, x => up({ rewards: x }), { label: 'Rewards type' }), park(ctx, r, 'rewards')),
      labelled('Personal or business', toggle(['Personal', 'Business'], v.use ?? null, x => up({ use: x }), { label: 'Personal or business' })),
      billsOnCard(ctx, r),
      stress(r, up), hassle(r, up)];
  }
  if (r.type === 'Student loan') {
    return [
      labelled('Federal or private', toggle(['Federal', 'Private'], v.federal ?? null, x => up({ federal: x }), { label: 'Federal or private', key: `${r.id}:federal` })),
      applies('repaymentPlan', { g, r }) ? labelled('Repayment plan', tapPick(['Standard', 'Income-driven', 'Other'], v.plan ?? null, x => up({ plan: x }), { label: 'Repayment plan' })) : null,
      labelled('Servicer', textInput(v.servicer, x => up({ servicer: x }), { hint: 'Add servicer', width: 170 })),
      stress(r, up), hassle(r, up)];
  }
  if (r.type === 'Car loan' || r.type === 'Mortgage') {
    const kind = r.type === 'Car loan' ? 'Car' : 'Home';
    const things = ctx.visible(x => x.kind === 'asset' && x.type === kind);
    return [
      labelled(`Linked ${kind.toLowerCase()}`, select(things.map(a => [a.id, a.name || kind]), r.linkedTo, x => up({ linkedTo: x }), { label: `Linked ${kind.toLowerCase()}`, hint: things.length ? `Pick the ${kind.toLowerCase()}` : `No ${kind.toLowerCase()} on Assets yet`, width: 190 }),
        { note: 'The same loan shows on the asset' }),
      r.type === 'Car loan' ? labelled('Months left', textInput(v.monthsLeft, x => up({ monthsLeft: x === null ? null : Number(x) }), { hint: 'Add months', width: 130 }), { note: 'Checks the payoff date' })
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
// Batch 11 (item 5a): on Debt the cards are one linked row, "Credit cards (N) · $X ›", in the payoff order like any debt.
export function cardsLink(ctx) {
  const cards = ctx.visible(r => r.kind === 'debt' && r.type === 'Credit card');
  if (!cards.length) return h('div.row-line.cards-link', { style: { gap: '10px', margin: '8px 0 16px' } }, h('span.muted', {}, 'No credit cards yet.'),
    h('button.btn.small', { type: 'button', onclick: () => { location.hash = '#/net-worth/credit-cards'; } }, 'Add a card on Credit cards'));
  return cardsRow(ctx, cards);
}
function cardsRow(ctx, cards) {
  const m = ctx.metrics();
  const owed = cards.reduce((t, r) => t + (r.values.balance ?? 0), 0);
  const plan = m.debtPlan?.debts || [];
  const rank = cards.map(r => plan.findIndex(d => d.id === r.id)).filter(i => i >= 0);
  const months = cards.map(r => m.inputs.debts.find(d => d.id === r.id)?.planMonths).filter(v => v != null);
  const last = months.length ? Math.max(...months) : null;
  return h('a.cards-row', { href: '#/net-worth/credit-cards', 'aria-label': `Credit cards: ${cards.length}, ${money(owed)} owed. Open Credit cards` },
    rank.length ? h('span.rank', { title: 'Place in the payoff order' }, `#${Math.min(...rank) + 1}`) : null,
    h('strong', {}, `Credit cards (${cards.length})`), h('span', {}, ` · ${money(owed)}`),
    last != null ? h('span.muted.small', {}, `paid off ${monthName(addMonths(ymOf(ctx.now()), last), 'short')}`) : null,
    h('span.spacer'), h('span.cards-row-go', {}, 'Open', icon('right')));
}
// Batch 11 (item 6): Credit health, slim. One line shows the score, where and when it was checked, and overall
// utilization; the rest (each card's utilization, the oldest and average account age from the cards' opened months,
// late payments, hard inquiries in the last 2 years as a tap count, and the freeze at the three bureaus) is folded.
export function creditCard(ctx) {
  const cards = ctx.visible(r => r.kind === 'debt' && r.type === 'Credit card');
  const p = ctx.store.doc.profile;
  const c = p.credit || {};
  const set = patch => ctx.store.setDoc('profile', { credit: { ...c, ...patch } });
  const d = h('input', { type: 'date', value: c.checked || '', 'aria-label': 'Date checked' });
  d.onchange = () => set({ checked: d.value || null });
  const freeze = Object.fromEntries(BUREAUS.map(b => [b, c[`freeze${b}`] ?? null]));
  const H = creditHealth(cards.map(r => ({ id: r.id, name: r.name || 'Card', balance: r.values.balance, limit: r.values.limit, opened: r.values.opened })), { now: ctx.now(), inquiries: c.inquiries ?? null, freeze });
  const util = H.overall == null ? needs('M35', ['a credit limit on a card'], { unit: 'pct' }) : { id: 'M35', value: H.overall, needs: [], unit: 'pct', text: H.text };
  const openLimits = e => { e.preventDefault(); const c = document.querySelector('[data-focus="more:cards:credit-health"]'); if (c && c.getAttribute('aria-expanded') !== 'true') c.click(); setTimeout(() => document.querySelector('.credit-cards-table input')?.focus(), 30); };
  const scoreLine = h('div.row-line.credit-line', { style: { gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' } },
    labelled('Credit score', textInput(c.score == null ? null : String(c.score), x => { const n = Number(x); set({ score: Number.isInteger(n) && n >= 300 && n <= 900 ? n : null }); }, { hint: '300 to 850', width: 110, key: 'credit:score' }), parkProfile(ctx.store, 'creditScore')),
    labelled('Where you checked it', select(['Credit Karma', 'Bank or card app', 'Experian', 'Equifax', 'TransUnion', 'myFICO', 'Other'], c.source ?? null, x => set({ source: x }), { label: 'Score source', width: 170 })),
    labelled('Date checked', h(`label.field${c.checked ? '.filled' : ''}`, { style: { width: '160px' } }, d)),
    cards.length ? h('div.stack', { style: { gap: '2px' } }, h('span.label', {}, 'Utilization, all cards'), H.overall == null ? h('button.inst-link', { type: 'button', onclick: openLimits }, icon('plus'), ' Add a card limit') : h('strong.credit-util', {}, mathButtonFor(util, pct(H.overall)))) : null);
  const tapCount = (v, onPick, label) => toggle([[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4+']], v == null ? null : Math.min(4, v), onPick, { label, clearable: true });
  const perCard = cards.length ? h('div.stack', { style: { gap: '6px' } }, h('span.label', {}, 'Each card'),
    h('table.rows.mini.credit-cards-table', {}, h('thead', {}, h('tr', {}, ['Card', 'Limit', 'Used', 'Opened', 'Age'].map(t => h('th', {}, t)))),
      h('tbody', {}, cards.map(r => { const x = H.per.find(q => q.id === r.id); return h('tr', {},
        h('td', {}, r.name || 'Card'),
        h('td', {}, moneyInput(r.values.limit ?? null, v => ctx.store.update(r.id, { limit: v }), { hint: 'Add limit', key: `${r.id}:limit:health` })),
        h('td.num', {}, x?.util == null ? h('span.muted.small', {}, '–') : pct(x.util)),
        h('td', {}, openedPicker(ctx, r)),
        h('td', {}, x?.ageMonths == null ? h('span.muted.small', {}, 'Pick the month') : yearsText(x.ageMonths))); })))) : null;
  const rest = () => h('div.form-grid.credit-more', {},
    perCard,
    cards.length ? h('div.stack', { style: { gap: '2px' } }, h('span.label', {}, 'Account age'), H.oldestMonths == null ? h('span.muted.small', {}, 'Pick each card\'s opened month') : h('span', {}, `Oldest ${yearsText(H.oldestMonths)} · average ${yearsText(Math.round(H.averageMonths))}`)) : null,
      ...(ctx.couple ? [labelled(`Credit score (${personLabels(p ? ctx.store.doc : {}).Partner})`, textInput(c.scorePartner == null ? null : String(c.scorePartner), x => { const n = Number(x); set({ scorePartner: Number.isInteger(n) && n >= 300 && n <= 900 ? n : null }); }, { hint: '300 to 850', width: 110 })),
        labelled('Where checked (partner)', select(['Credit Karma', 'Bank or card app', 'Experian', 'Equifax', 'TransUnion', 'myFICO', 'Other'], c.sourcePartner ?? null, x => set({ sourcePartner: x }), { label: 'Partner score source', width: 170 })),
        labelled('Date checked (partner)', (() => { const d2 = h('input', { type: 'date', value: c.checkedPartner || '', 'aria-label': 'Partner date checked' }); d2.onchange = () => set({ checkedPartner: d2.value || null }); return h(`label.field${c.checkedPartner ? '.filled' : ''}`, { style: { width: '160px' } }, d2); })())] : []),
      labelled('Late payments in the last 2 years', h('span.row-line', { style: { gap: '6px' } }, toggle(['Yes', 'No'], c.latePayments === true ? 'Yes' : c.latePayments === false ? 'No' : null, x => set({ latePayments: x === 'Yes', ...(x === 'No' ? { lateCount: null } : {}) }), { label: 'Late payments' }),
        c.latePayments === true ? tapCount(c.lateCount ?? null, n => set({ lateCount: n }), 'How many late payments') : null)),
      labelled('Hard inquiries in the last 2 years', tapCount(c.inquiries ?? null, n => set({ inquiries: n }), 'Hard inquiries in the last 2 years'), { note: 'More than 2 holds a strong score at OK' }),
      labelled('Credit freeze', h('div.row-line', { style: { gap: '6px', flexWrap: 'wrap' } }, BUREAUS.map(b => h('button.chip-btn', { type: 'button', 'aria-pressed': String(freeze[b] === true), title: freeze[b] === true ? `Frozen at ${b}. Tap to mark it off` : `Tap to mark it frozen at ${b}`, onclick: () => set({ [`freeze${b}`]: freeze[b] === true ? false : true }) }, `${b}: ${freeze[b] === true ? 'on' : freeze[b] === false ? 'off' : 'not set'}`))),
        { note: H.frozen.length === 3 ? 'Frozen at all three' : 'A freeze stops new accounts in your name' }));
  return S_secWrap(h('section.section.area-debt', {}, h('div.section-title', {}, h('h2', {}, 'Credit health')),
    h('div.card', {}, scoreLine, S_moreBlock('cards:credit-health', rest, { label: 'Each card, account age, late payments, inquiries, freeze' }))), 'cards:health', { summary: [c.score != null ? `Score ${c.score}${c.source ? ` (${c.source})` : ''}` : 'No score yet', H.overall != null ? `Utilization ${pct(H.overall)}` : cards.length ? 'Utilization needs a card limit' : null].filter(Boolean).join(' · ') }); // batch 13: a caret section, closed by default
}
const mathButtonFor = (r, text) => h('span', { title: r.text }, text);
// The month a card was opened, as two taps (a month, then a year): no typing.
function openedPicker(ctx, r) {
  const v = /^\d{4}-\d{2}/.test(String(r.values.opened || '')) ? String(r.values.opened).slice(0, 7) : null;
  const [y, mo] = v ? v.split('-') : [null, null];
  const thisYear = ctx.now().getUTCFullYear();
  const years = Array.from({ length: 41 }, (_, i) => String(thisYear - i));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((t, i) => [String(i + 1).padStart(2, '0'), t]);
  const put = (yy, mm) => { if (yy && mm) ctx.store.update(r.id, { opened: `${yy}-${mm}` }); else if (yy && !mm) ctx.store.update(r.id, { opened: `${yy}-01` }); };
  return h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
    select(months, mo, x => put(y ?? String(thisYear), x), { label: `${r.name || 'Card'} opened month`, hint: 'Month', width: 96, key: `${r.id}:openedMonth` }),
    select(years, y, x => put(x, mo ?? '01'), { label: `${r.name || 'Card'} opened year`, hint: 'Year', width: 96, key: `${r.id}:openedYear` }));
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
    return [labelled('Opened', openedPicker(ctx, r), { note: 'Card age' }), // batch 11: two taps, no typing
      labelled('Annual fee', moneyInput(v.annualFee, x => up({ annualFee: x }), { hint: 'Add fee' })),
      labelled('Sign-up bonus: $, spend, by when', h('span.row-line', { style: { gap: '6px', flexWrap: 'wrap' } },
        moneyInput(v.bonus, x => up({ bonus: x }), { hint: 'Bonus' }), moneyInput(v.bonusSpend, x => up({ bonusSpend: x }), { hint: 'Spend' }),
        (() => { const d = h('input', { type: 'date', value: v.bonusBy || '', 'aria-label': 'Bonus by' }); d.onchange = () => up({ bonusBy: d.value || null }); return h(`label.field${v.bonusBy ? '.filled' : ''}`, { style: { width: '170px' } }, d); })())), notes]; // batch 13: a date picker, not typed YYYY-MM-DD
  }
  if (r.type === 'Student loan') {
    return [applies('pslf', { g, r }) ? labelled('PSLF eligible', yn3(v.pslf, x => up({ pslf: x }), 'PSLF')) : null,
      labelled('Forbearance or deferment', tapPick(['None', 'Forbearance', 'Deferment'], v.forbearance ?? null, x => up({ forbearance: x }), { label: 'Forbearance or deferment' })), notes];
  }
  return [notes];
}

// Batch 8 (A): the Budget by category. One row per category (kind spending, type the category key): a single amount
// and status that count as done on their own; the caret opens the category's lines. Debt reads From Debt. A category
// with lines and no typed amount reads the line total; lines above the typed amount update it ("updated from $X");
// what the lines have not reached reads "$X not assigned yet".
export function categoryList(ref, { pass = 'Plan', ym = null } = {}) {
  const catOf = (ctx, r) => ctx.metrics().inputs.categories.find(c => c.key === r.type);
  return {
    kind: 'spending', area: 'needs', title: 'Budget by category', thing: { one: 'category', plural: 'categories' }, key: 'categories',
    filter: r => isCategoryRecord(r), order: (a, b) => CATEGORIES.indexOf(a.type) - CATEGORIES.indexOf(b.type),
    fixed: true, noAdd: true, moreLabel: 'Lines', notForMe: true, tableClass: 'cat-rows', paidWith: false, coreFields: ['amount'], focusOf: (r, f) => `cat:${r.type}:${f}`, // batch 13: Fix it lands on the category's box
    hasValue: (ctx, r) => catOf(ctx, r)?.amount != null,
    columns: [
      { label: 'Category', render: (ctx, r) => { const c = catOf(ctx, r); return h('span.stack', { style: { gap: '2px' } }, h('strong', {}, c?.name ?? r.name ?? r.type),
        h('span.muted.small', {}, c?.lines.length ? `${c.lines.length} ${c.lines.length === 1 ? 'line' : 'lines'}` : fadedIn(ctx, r.type) ? `${fadedIn(ctx, r.type)} starter lines, none used yet` : 'No lines: the amount alone counts')); } },
      // Batch 19: what the amount reads from sits in its own column, right beside the box (under it on a phone), so the
      // box is always in the same place down the table (DESIGN.md rule 1b).
      { label: 'Note', head: '', num: true, render: (ctx, r, m, up) => {
        const c = catOf(ctx, r);
        if (!c) return null;
        if (r.type === 'Debt') return h('span.muted.small.cat-note', { title: 'Each debt payment, entered once on Net worth > Debt' }, 'From Debt');
        // Batch 18 (QUESTIONS 229): an empty category offers its typical amount (the starter lines' typicals) in one tap,
        // marked Roughly; typing a real number clears the Roughly that came from it. Batch 19: it sits right before the
        // box, in this column, so the box stays in one place.
        const typ = c.amount == null && r.status !== 'Not for me' ? categoryTypicalOf(ctx.visible(x => x.kind === 'bill'), r.type, ctx.metrics().inputs.typicalScale ?? 1) : null; // Q241: scaled to the gut number
        if (typ) return h('button.btn.small.use-typical', { type: 'button', 'data-focus': `cat:${r.type}:typical`, title: `Use the typical ${money(typ)} a month (what the starter lines add up to), marked Roughly. Or type the real number.`, onclick: () => up({ amount: typ, per: 'month', status: 'Roughly', usedTypical: true }) }, `Use typical ${money(typ)}`);
        return c.from === 'updated' ? h('span.computed.small.cat-note', { title: `The lines add up to ${money(c.linesSum)}, more than the ${money(c.typed)} typed, so the category reads the line total.` }, `${money(c.linesSum)} · updated from ${money(c.typed)}`)
          : c.from === 'lines' ? h('span.computed.small.cat-note', { title: 'No amount typed: the category reads its lines' }, `${money(c.linesSum)} from the lines`)
          : c.from === 'typed' && c.lines.length ? (c.unassigned > 0.5 ? h('span.muted.small.cat-note', {}, `${money(c.unassigned)} not assigned yet`) : h('span.muted.small.cat-note', {}, 'Fully itemized')) : null;
      } },
      { label: 'Amount', num: true, render: (ctx, r, m, up) => {
        const c = catOf(ctx, r);
        if (!c) return null;
        if (r.type === 'Debt') { // batch 13: Fix it lands on the button that opens Debt; batch 19: shaped like the box it stands in for
          const fb = h('button.from-box', { type: 'button', 'data-focus': `cat:${r.type}:amount`, title: 'Entered on Debt; open it to change it', 'aria-label': `${money(c.amount)} a month, from Debt. Open Debt`, onclick: () => openSource('#/net-worth/debt', null) }, amount(ctx, c.amount, { chip: false }), icon('right'));
          return fb;
        }
        return moneyInput(r.amount, v => up({ amount: v, per: 'month', status: r.status === 'Not sure' || (r.values.usedTypical && r.status === 'Roughly') ? null : r.status, usedTypical: null }), { hint: c.from === 'lines' ? moneyText(c.linesSum) : 'A month', key: `cat:${r.type}:amount` }); // batch 18: typing a real number clears the Roughly that came from Use typical
      } },
    ],
    // The caret: this category's lines, with their own add button; a line added here stays in the category.
    secondary: (ctx, r) => [h('div.stack.wide.cat-lines', { style: { gridColumn: '1 / -1' } }, S_recordList(ctx, spendingList(ref, { pass, ym, only: r.type })))],
    footerTotal: (ctx, recs, m) => h('span', {}, amount(ctx, m.inputs.lineTotal), h('span.muted', {}, ' a month')),
    totals: (ctx, recs, m, cols) => [...cols.map(c => (c.label === 'Category' ? h('td', {}, `${recs.filter(r => r.status !== 'Not for me').length} categories`) : c.label === 'Amount' ? h('td.num', {}, amount(ctx, m.inputs.lineTotal)) : h('td'))), h('td'), h('td')],
  };
}

// ---------- Batch 10: faded typical amounts, Everything else, the line's side panel ----------
const ELSE_GROUP = 'Everything else';
// Typing a real number: it is Know it (a Guess or a used typical clears), never a typical any more.
const typedPatch = (r, v) => ({ amount: v, status: r.status === 'Not sure' || (r.values.usedTypical && r.status === 'Roughly') ? null : r.status, usedTypical: null });
const usePatch = r => ({ amount: typicalOf(r), status: 'Roughly', usedTypical: true });
const useButton = (r, up) => h('button.btn.small.use-typical', { type: 'button', 'data-focus': 'keep', title: `Use the typical ${money(typicalOf(r))} as the number, marked Roughly. Or type the real number.`, 'aria-label': `Use ${money(typicalOf(r))} for ${r.name || 'this line'}`, onclick: () => up(usePatch(r)) }, `Use ${money(typicalOf(r))}`);
// The amount box of a faded line: the typical amount is the faded placeholder; typing enters a real number.
function fadedInput(r, up, key = `${r.id}:amount`) {
  const box = moneyInput(null, v => { if (v != null) up(typedPatch(r, v)); }, { hint: moneyText(typicalOf(r)), key });
  box.classList.add('faded');
  box.title = `Typical: ${money(typicalOf(r))} a month. Not counted until you use it or type the real number.`;
  return box;
}
// A group's slim note: what the faded typical amounts would add up to (for reference, not their number).
function typicalNote(ctx, rows) {
  const t = typicalTotal(rows.filter(r => !r.auto));
  return t ? h('span.muted.small.typical-note', { title: 'The faded typical amounts count nowhere until you use one or type the real number' }, `Typical amounts would add up to ${money(t)} a month (for reference, not their number)`) : null;
}
// The Everything else header: the sum of its pieces when any has a number, else one rough amount for the whole bucket
// (kept on the category row as elseAmount). Once a piece has a number the pieces win and the bucket reads as replaced.
function elseBucket(ctx, key, rows) {
  const cat = ctx.store.find(r => isCategoryRecord(r) && r.type === key)[0] ?? null;
  const e = everythingElse(rows.filter(r => !r.auto), cat?.values?.elseAmount ?? null, r => (r.amount == null ? 0 : monthlyFrom(r.amount, r.per).value));
  return h('span.row-line.else-bucket', { style: { gap: '8px', flexWrap: 'wrap' } },
    e.from === 'pieces' ? h('span.computed.small', { title: 'The lines inside have numbers, so they are what counts' }, `${money(e.piecesSum)} from ${e.real} ${e.real === 1 ? 'line' : 'lines'}${e.replaced ? ` · replaces the ${money(e.bucket)} rough amount` : ''}`)
      : cat ? h('span.row-line', { style: { gap: '6px', flexWrap: 'wrap' } }, h('span.label', {}, 'One rough amount'), moneyInput(e.bucket, v => ctx.store.update(cat.id, { elseAmount: v }), { hint: 'A month', key: `else:${key}:amount` })) : null);
}
// The timing sentence (5b). Every part is a tap: how often, then day chips (1st, 15th, Last day, Other opens a 1 to 31
// grid), weekday chips or month chips. No typing.
function timingRow(ctx, r, up) {
  const t = timingOf(r);
  const tap = pick => up(timingPatch(r, pick));
  const chips = (opts, cur, on, label, focus = null) => h('div.picks.timing-chips', { role: 'group', 'aria-label': label, 'data-focus': focus }, opts.map(([v, text]) => h('button.pick', { type: 'button', 'aria-pressed': String(v === cur), onclick: () => on(v) }, text)));
  const odd = t.day != null && ![1, 15, 31].includes(t.day);
  const grid = () => h('div.stack', { style: { gap: '8px' } }, h('strong', {}, 'Pick the day'), h('div.day-grid', { role: 'group', 'aria-label': 'Day of the month' },
    Array.from({ length: 31 }, (_, i) => h('button.pick', { type: 'button', 'aria-pressed': String(t.day === i + 1), onclick: () => { S_closePop(); tap({ day: i + 1 }); } }, String(i + 1)))));
  const dayChips = h('div.picks.timing-chips', { role: 'group', 'aria-label': 'Day', 'data-focus': `${r.id}:dueDay` },
    DAY_CHIPS.map(([v, text]) => h('button.pick', { type: 'button', 'aria-pressed': String(v === t.day), onclick: () => tap({ day: v }) }, text)),
    h('button.pick', { type: 'button', 'aria-pressed': String(odd), 'aria-haspopup': 'dialog', onclick: e => S_popover(e.currentTarget, grid(), { width: 300 }) }, odd ? `the ${ordinal(t.day)}` : 'Other day'));
  return h('div.stack.timing', { style: { gap: '8px' } },
    h('p.timing-sentence', {}, h('strong', {}, r.amount != null ? money(r.amount) : isFaded(r) ? `${money(typicalOf(r))} typical` : 'No amount yet'), ' · ', timingWords(r)),
    chips(FREQS, t.freq, v => tap({ freq: v }), 'How often'),
    t.freq === 'month' || (t.freq === 'year' && t.month) ? dayChips : null,
    t.freq === 'week' ? chips(WEEKDAY_CHIPS, t.weekday, v => tap({ weekday: v }), 'Weekday', `${r.id}:weekday`) : null,
    t.freq === 'year' ? chips(MONTH_CHIPS, t.month, v => tap({ month: v }), 'Month', `${r.id}:monthDue`) : null,
    h('div.row-line', { style: { gap: '8px', flexWrap: 'wrap' } }, h('span.label.has-tip', { title: 'Same amount every time feeds the fixed floor: what you pay no matter what' }, 'Each time'),
      toggle([['Fixed', 'Same amount every time'], ['Variable', 'It changes']], r.values.amountType ?? null, v => up({ amountType: v }), { label: 'Amount is' })));
}
// Who pays (5c): one segmented row (Me / Splitting / Someone else / Not for me; the stored values stay), its detail
// only when it is not Me, Paid with beside it, and Someone pays me back behind a small link.
const PANEL = { back: null };
function whoRow(ctx, r, up) {
  const top = whoOf(r);
  const keep = r.status === 'Not for me' ? null : r.status;
  const pick = x => up(x === 'Not for me' ? { status: 'Not for me' } : { status: keep, whoPays: x === 'Someone else' ? (r.values.whoPays === 'Included in rent' ? 'Included in rent' : 'Covered by someone') : x === 'Split' ? (r.values.whoPays === 'My share' ? 'My share' : 'Split') : 'Me' });
  const p = r.paidWith, cards = ctx.store.find(x => x.kind === 'debt' && x.type === 'Credit card');
  const way = p === 'card' || cards.some(c => c.id === p) ? 'card' : p ? 'checking' : null;
  const back = r.values.reimbursed != null || PANEL.back === r.id;
  return h('div.stack', { style: { gap: '10px' } },
    toggle([['Me', 'Me'], ['Split', 'Splitting'], ['Someone else', 'Someone else'], ['Not for me', 'Not for me']], top, x => pick(x ?? 'Me'), { label: 'Who pays' }),
    top === 'Split' || top === 'Someone else' ? h('div.who-detail', {}, whoPays(r, up, { roommates: ctx.store.doc.profile.roommates ?? 0, profile: ctx.store.doc.profile, detailOnly: true })) : null,
    top === 'Not for me' ? null : h('div.row-line', { style: { gap: '8px', flexWrap: 'wrap' } }, h('span.label', {}, 'Paid with'),
      toggle([['checking', 'Checking'], ['card', 'Credit card']], way, w => up({ paidWith: w === 'card' ? (cards.length === 1 ? cards[0].id : 'card') : 'checking' }), { label: 'Paid with' }),
      way === 'card' && cards.length > 1 ? select(cards.map(c => [c.id, c.name || 'Credit card']), cards.some(c => c.id === p) ? p : null, v => up({ paidWith: v }), { label: 'Which card', hint: 'Which card', width: 160 }) : null,
      way === 'card' && !cards.length ? h('span.muted.small', {}, 'No cards yet: add them under Debt') : null),
    top === 'Not for me' ? null : back ? h('div.row-line', { style: { gap: '8px' } }, h('span.label.has-tip', { title: 'By an employer, an HSA or FSA, or someone who pays you back. It comes off your share.' }, 'Paid back to you'),
      moneyInput(r.values.reimbursed ?? null, x => up({ reimbursed: x }), { hint: `Per ${r.per}` }))
      : h('button.link-btn', { type: 'button', onclick: () => { PANEL.back = r.id; ctx.refresh(); } }, '+ Someone pays me back'));
}
function startsInBox(r, up) {
  const d = h('input', { type: 'month', value: r.values.startsIn || '', 'aria-label': 'Starts in' });
  d.onchange = () => up({ startsIn: d.value || null });
  return h(`label.field${r.values.startsIn ? '.filled' : ''}`, { style: { width: '170px' } }, d);
}
function linePanel(ctx, r, up, { pass, ym }) {
  const prem = premiumOf(ctx, r);
  return [
    h('div.row-line.panel-amount', { style: { gap: '8px', flexWrap: 'wrap' } }, h('span.label', {}, 'Amount'),
      prem ? fromButton(`From ${prem.type}`, '#/net-worth/protection', r.linkedTo, { value: amount(ctx, r.amount, { chip: false }) })
        : isFaded(r) ? fadedInput(r, up, `${r.id}:amount:panel`) : moneyInput(r.amount, v => up(typedPatch(r, v)), { key: `${r.id}:amount:panel` }),
      prem ? null : perChip(r.per, v => up({ per: v }), { key: `${r.id}:per:panel` }),
      isFaded(r) ? useButton(r, up) : null),
    h('section.panel-sec', {}, h('h3', {}, 'When'), timingRow(ctx, r, up)),
    h('section.panel-sec', {}, h('h3', {}, 'Who pays'), whoRow(ctx, r, up)),
    h('section.panel-sec', {}, h('h3.has-tip', { title: 'Level 1 is the big one, 2 the regulars; Everything else folds into one line with its own amount' }, 'Shown as'),
      toggle([[1, 'The big one'], [2, 'A regular'], [3, 'Everything else']], levelOf(r), v => up({ level: v }), { label: 'Level' })),
    S_moreBlock(`line-more:${r.id}`, () => h('div.stack', { style: { gap: '12px' } },
      pass === 'Plan' && ym ? monthPlanField(ctx, r, ym) : null,
      lineSuggestion(r, up),
      // Batch 15, item 6: a known cost ahead (health care from a date): counted from that month on, in every projection.
      labelled('Starts in', startsInBox(r, up), { tip: 'A cost that begins later. Today\'s spending leaves it out; the FI date, the ladder and the calendar add it from that month' }),
      // Batch 15, item 2: a payment to the partner moves money between the two; the household view leaves it out.
      ctx.couple ? labelled('Paid to my partner', toggle(['Yes', 'No'], r.values.toPartner ?? null, v => up({ toPartner: v }), { label: 'Paid to my partner', clearable: true }), { tip: 'Money you send your partner (your share of rent they pay). Your view counts it; the two of you together do not' }) : null,
      labelled('Joy', toggle([[true, 'A joy line'], [false, 'Not one']], r.values.joy === true ? true : r.values.joy === false ? false : null, v => up({ joy: v }), { label: 'Joy line', clearable: true }), { tip: 'Joy lines are funded first in the FOO (step 0b)' }),
      r.values.amountType === 'Variable' ? labelled('Range: low, high', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
        moneyInput(r.values.low ?? null, v => up({ low: v }), { hint: 'Low' }), moneyInput(r.values.high ?? null, v => up({ high: v }), { hint: 'High' })), { tip: 'A light month and a heavy one; the amount is the average', ...park(ctx, r, 'low') }) : null,
      tagsField(r, up)), { label: 'More' }),
  ];
}
const fadedIn = (ctx, key) => ctx.visible(l => l.kind === 'bill' && !l.values.irregular && isFaded(l) && categoryKeyOf(l) === key).length;
