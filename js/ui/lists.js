// List setups built from the staples: debts and spending lines. Each list is a view of the one record type.
import { h, icon } from './dom.js';
import { addPresets } from '../presets.js';
import { moneyText, value, amount, iconButton, moneyInput, pctInput, textInput, perPicker, toggle, select, labelled, payoffCell, summaryStrip, whoPays, hoursChip } from './staples.js';
import { feeApr } from '../math/debt.js';
import { applies } from '../gates.js';
import { payoffPlan, debtToIncome, utilization } from '../math/debt.js';
import { needs } from '../math/result.js';
import { money } from '../format.js';
import { estimateOf, actualOf, instances, monthName } from '../month.js';

const LOAN_TYPES = new Set(['Student loan', 'Car loan', 'Personal loan', 'Mortgage']);
const short = v => (Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : money(v));
const sum = (list, f) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const kept = r => (r.status === 'Not for me' ? 0 : r.amount);

export function debtList(ref) {
  return {
    kind: 'debt', area: 'debt', title: 'Debt', thing: { one: 'debt', plural: 'debts' },
    filter: r => r.kind === 'debt',
    groupBy: r => (r.type === 'Credit card' ? 'Credit cards' : LOAN_TYPES.has(r.type) ? 'Loans' : 'Other'),
    picker: { top: ref.lists.debtTypesTop, other: [...ref.lists.debtTypesOther, 'Mortgage'] },
    // Order drives the payoff plan everywhere (Mockup: section header).
    headerExtra: ctx => h('span.row-line', { style: { gap: '8px' } }, h('span.label', {}, 'Order'),
      toggle([['avalanche', 'Avalanche'], ['snowball', 'Snowball'], ['stress', 'Stress']], ctx.store.doc.settings.debtOrder ?? 'avalanche',
        v => { ctx.store.setDoc('settings', { debtOrder: v }); ctx.refresh(); }, { label: 'Payoff order' })),
    coreFields: ['balance', 'apr'],
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
      { label: 'Owner', couple: true, render: (ctx, r, m, up) => toggle(['Me', 'Partner', 'Joint'], r.owner || 'Me', v => up({ owner: v }), { label: 'Owner' }) },
    ],
    secondary: (ctx, r, up) => debtSecondary(ctx, r, up),
    tertiary: (ctx, r, up) => debtTertiary(ctx, r, up),
    subtotal: (ctx, rows) => money(sum(rows, r => r.values.balance)),
    footerTotal: (ctx, recs) => amount(ctx, recs.some(r => r.values.balance != null) ? sum(recs, r => r.values.balance) : null),
    totals: (ctx, recs, m, cols) => {
      const cells = cols.map(c => {
        if (c.label === 'Debt') return h('td', {}, `${recs.length} ${recs.length === 1 ? 'debt' : 'debts'}`);
        if (c.label === 'Balance') return h('td.num', {}, amount(ctx, recs.some(r => r.values.balance != null) ? sum(recs, r => r.values.balance) : null));
        if (c.label === 'Payment / mo') return h('td.num', {}, amount(ctx, m.debts.some(d => d.payment != null) ? sum(m.debts, d => d.payment) : null));
        return h('td');
      });
      return [...cells, h('td'), h('td')];
    },
    strip: (ctx, m) => debtStrip(ctx, m),
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
    { label: 'Total debt', result: total, key: 'debtTotal', lowerIsGood: true },
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
// The Amount column follows the pass being filled (R130): Rough edits the line; Estimate and Actual are per month.
export function spendingList(ref, { pass = 'Rough', ym = null, groupBy = 'DRAFTT', paidWithColumn = false } = {}) {
  const cats = ref.categoryDefaults.map(c => c.category);
  const monthCols = monthColumns(pass, ym);
  return {
    kind: 'bill', area: 'needs', title: pass === 'Rough' ? 'Spending lines' : `Spending lines: ${pass}, ${monthName(ym)}`, thing: { one: 'line', plural: 'lines' },
    filter: r => r.kind === 'bill' && !r.values.irregular,
    // Eliminated lines fold away at the bottom; one tap brings one back.
    groupBy: r => (r.status === 'Not for me' ? 'Not for me' : groupBy === 'Category' ? r.values.category || 'Other' : r.values.draftt || 'Other'),
    lastGroups: ['Not for me'], foldedGroups: ['Not for me'],
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
      pass !== 'Rough' ? { label: 'Rough', num: true, render: (ctx, r) => h('span.muted', { title: 'The line\'s usual number, set in the Rough pass' }, r.status === 'Not for me' ? '$0' : amount(ctx, r.amount, { chip: false })) } :
      { label: 'Amount', num: true, render: (ctx, r, m, up, row) => h('span.row-line', { style: { justifyContent: 'flex-end', flexWrap: 'nowrap', gap: '6px' } },
        moneyInput(r.amount, v => up({ amount: v, status: r.status === 'Not sure' ? null : r.status }), { key: `${r.id}:amount` }), // typing the real number clears Guess
        r.status === 'Not sure' ? h('button.btn.small', { type: 'button', title: 'The guess is right: keep it as the real number', onclick: () => up({ status: null }) }, 'Keep') : null,
        r.status === 'Not for me'
          ? h('button.btn.small', { type: 'button', onclick: () => up({ status: null }) }, 'Bring back')
          : h('button.btn.small.nfm', { type: 'button', onclick: () => up({ status: 'Not for me' }) }, 'Not for me'),
        iconButton('trash', 'Delete', row.remove, { tiny: true })) },
      ...monthCols,
      paidWithColumn ? { label: 'Paid with', render: (ctx, r, m, up) => {
        const cards = ctx.store.find(x => x.kind === 'debt' && x.type === 'Credit card');
        return select([['checking', 'Checking'], ['savings', 'Savings'], ...cards.map(c => [c.id, c.name || 'Credit card'])], r.paidWith, v => up({ paidWith: v }), { label: 'Paid with', hint: 'Paid with', width: 140 });
      } } : null,
      { label: 'Per', render: (ctx, r, m, up) => perPicker(r.per, v => up({ per: v }), { key: `${r.id}:per` }) },
      { label: 'Amount is', render: (ctx, r, m, up) => toggle(['Fixed', 'Variable'], r.values.amountType ?? null, v => up({ amountType: v }), { label: 'Amount is' }) },
      { label: 'Date is', render: (ctx, r, m, up) => toggle([['Fixed date', 'Fixed date'], ['Variable date', 'Variable date']], r.values.timing ?? null, v => up({ timing: v }), { label: 'Date is' }) },
      { label: 'Owner', couple: true, render: (ctx, r, m, up) => toggle(['Me', 'Partner', 'Joint'], r.owner || 'Me', v => up({ owner: v }), { label: 'Owner' }) },
    ],
    secondary: (ctx, r, up) => [whoPays(r, up), lineSuggestion(r, up)],
    // Not for me counts as $0 everywhere (R058); its group shows what was cut.
    subtotal: (ctx, rows) => (rows.every(r => r.status === 'Not for me') ? `$0, cut ${money(sum(rows, r => r.amount))}` : money(sum(rows, kept))),
    footerTotal: (ctx, recs) => amount(ctx, recs.some(r => r.amount != null) ? sum(recs, kept) : null),
    totals: (ctx, recs, m, cols) => [...cols.map(c => c.label === 'Line' ? h('td', {}, `${recs.filter(r => r.status !== 'Not for me').length} lines`) : c.label === 'Amount' ? h('td.num', {}, amount(ctx, recs.some(r => r.amount != null) ? sum(recs, kept) : null)) : h('td')), h('td'), h('td')],
  };
}

// Estimate and Actual columns for one month (R134 to R136, R052).
function monthColumns(pass, ym) {
  if (pass === 'Estimate') return [{ label: 'Estimate', num: true, render: (ctx, r) => {
    const e = estimateOf(ctx.store.doc, ym, r);
    const set = v => ctx.store.setIn('spending', ['months', ym, 'lines', r.id, 'estimate'], v === null ? undefined : v, 'Estimate');
    return h('span.row-line', { style: { justifyContent: 'flex-end', flexWrap: 'nowrap', gap: '6px' } },
      e.fromRough ? h('button.btn.small.from-rough', { type: 'button', title: 'Carried over from Rough. Click to confirm it as this month\'s estimate.', onclick: () => set(e.value) }, 'from Rough ✓') : null,
      moneyInput(e.fromRough ? null : e.value, set, { hint: e.value == null ? 'Add estimate' : moneyText(e.value), key: `${r.id}:est:${ym}` }));
  } }];
  if (pass === 'Actual') return [
    { label: 'Estimate', num: true, render: (ctx, r) => h('span.muted', {}, amount(ctx, estimateOf(ctx.store.doc, ym, r).value, { chip: false })) },
    { label: 'Actual', num: true, render: (ctx, r) => {
      const list = instances(ctx.store.doc, ctx.ref, ym, { now: ctx.now() });
      const a = actualOf(ctx.store.doc, ym, r, list);
      const set = v => ctx.store.setIn('spending', ['months', ym, 'lines', r.id, 'actual'], v === null ? undefined : v, 'Actual');
      return h('span.row-line', { style: { justifyContent: 'flex-end', flexWrap: 'nowrap', gap: '6px' } },
        a.from === 'calendar' ? h('span.tag.plain', { title: 'From entries marked Paid on the cash flow calendar' }, 'calendar') : null,
        moneyInput(a.from === 'typed' ? a.value : null, set, { hint: a.value == null ? 'Add actual' : moneyText(a.value), key: `${r.id}:act:${ym}` }));
    } },
    { label: 'Difference', num: true, render: (ctx, r) => {
      const list = instances(ctx.store.doc, ctx.ref, ym, { now: ctx.now() });
      const e = estimateOf(ctx.store.doc, ym, r).value, a = actualOf(ctx.store.doc, ym, r, list).value;
      if (e == null || a == null) return h('span.muted', {}, '');
      const d = a - e;
      return h(`span.diff${d > 0.5 ? '.over' : d < -0.5 ? '.under' : ''}`, {}, Math.abs(d) < 0.5 ? 'On plan' : `${d > 0 ? '+' : '−'}${money(Math.abs(d))}`);
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
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => [String(i + 1), m]);
export function irregularList(ref, { onWalk } = {}) {
  return {
    kind: 'bill', area: 'needs', title: 'Irregular and yearly costs', thing: { one: 'yearly cost', plural: 'yearly costs' },
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
      return [labelled('Sinking fund', select(savings.map(a => [a.id, a.name || a.type]), r.values.sinkingFund ?? null, v => up({ sinkingFund: v }), { label: 'Sinking fund', hint: savings.length ? 'Which savings account' : 'No savings account yet', width: 200 }), { note: 'Which savings account holds it' })];
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
const yn3 = (v, on, label) => toggle(['Yes', 'No', 'Not sure'], v ?? null, on, { label });
function debtSecondary(ctx, r, up) {
  const g = ctx.gates();
  const v = r.values;
  if (r.type === 'Credit card') {
    const choice = v.payChoice ?? (v.payment == null ? 'Minimum' : 'Custom');
    return [
      labelled('Pay', toggle(['Minimum', 'Custom', 'In full'], choice, x => up({ payChoice: x }), { label: 'Pay' })),
      choice === 'Custom' ? labelled('Custom $ a month', moneyInput(v.payment, x => up({ payment: x }), { hint: 'Add payment' })) : null, // R020
      labelled('0% promo: rate and end', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, pctInput(v.promoApr, x => up({ promoApr: x }), { hint: '0' }),
        textInput(v.promoEnd, x => up({ promoEnd: x }), { hint: 'YYYY-MM', width: 110 })), { note: 'Warns 60 days before it ends' }),
      labelled('Due day', textInput(v.dueDay, x => up({ dueDay: x }), { hint: 'Add day', width: 90 }), { note: 'Shows on the cash flow calendar' }),
      labelled('Credit limit', moneyInput(v.limit, x => up({ limit: x }), { hint: 'Add limit' }), { note: 'For utilization' }),
      labelled('Personal or business', toggle(['Personal', 'Business'], v.use ?? null, x => up({ use: x }), { label: 'Personal or business' })),
      billsOnCard(ctx, r),
      stress(r, up)];
  }
  if (r.type === 'Student loan') {
    return [
      labelled('Federal or private', toggle(['Federal', 'Private'], v.federal ?? null, x => up({ federal: x }), { label: 'Federal or private' })),
      applies('repaymentPlan', { g, r }) ? labelled('Repayment plan', select(['Standard', 'Income-driven', 'Other'], v.plan ?? null, x => up({ plan: x }), { label: 'Repayment plan', width: 170 })) : null,
      labelled('Servicer', textInput(v.servicer, x => up({ servicer: x }), { hint: 'Add servicer', width: 170 })),
      stress(r, up)];
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
      stress(r, up)];
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
        labelled('Periods a year', textInput(v.periods, x => up({ periods: x === null ? null : Number(x) }), { hint: '26', width: 90 })),
        labelled('As an APR', h('span.computed', {}, apr.value === null ? `Needs ${apr.needs.join(' and ')}` : value(apr))));
    },
    'Tax debt': () => labelled('Payment plan in place', yn3(v.taxPlan, x => up({ taxPlan: x }), 'Payment plan')),
    '401(k) loan': () => labelled('If you leave the job', h('span.computed', {}, 'Due in full, or it counts as a withdrawal')),
    Business: () => labelled('Personally guaranteed', yn3(v.guaranteed, x => up({ guaranteed: x }), 'Personally guaranteed')),
  };
  return [unique[r.type]?.() ?? null, stress(r, up)];
}
// R103: the card lists the bills charged to it. R104: paid in full they are spending; carried, they add to the balance.
function billsOnCard(ctx, card) {
  const bills = ctx.visible(x => x.kind === 'bill' && x.paidWith === card.id && x.status !== 'Not for me');
  if (!bills.length) return labelled('Bills on this card', h('span.muted', {}, 'None yet. Link one from a bill\'s More ▸ Paid with.'));
  const total = sum(bills, b => (b.per === 'year' ? (b.amount ?? 0) / 12 : b.amount));
  const inFull = card.values.payChoice === 'In full';
  return labelled(`Bills on this card: ${bills.length}, ${money(total)}/mo`, h('span.row-line', { style: { gap: '6px' } }, bills.map(b => h('a.tag.plain', { href: '#/spending/budget' }, b.name || b.values.category))),
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
