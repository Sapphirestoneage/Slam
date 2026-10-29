// List setups built from the staples: debts and spending lines. Each list is a view of the one record type.
import { h, icon } from './dom.js';
import { addPresets } from '../presets.js';
import { value, amount, iconButton, moneyInput, pctInput, textInput, perPicker, toggle, payoffCell, summaryStrip, whoPays, hoursChip } from './staples.js';
import { payoffPlan, debtToIncome, utilization } from '../math/debt.js';
import { needs } from '../math/result.js';
import { money } from '../format.js';

const LOAN_TYPES = new Set(['Student loan', 'Car loan', 'Personal loan']);
const short = v => (Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : money(v));
const sum = (list, f) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const kept = r => (r.status === 'Not for me' ? 0 : r.amount);

export function debtList(ref) {
  return {
    kind: 'debt', area: 'debt', title: 'Debt', thing: { one: 'debt', plural: 'debts' },
    filter: r => r.kind === 'debt',
    groupBy: r => (r.type === 'Credit card' ? 'Credit cards' : LOAN_TYPES.has(r.type) ? 'Loans' : 'Other'),
    picker: { top: ref.lists.debtTypesTop, other: ref.lists.debtTypesOther },
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
        if (r.type === 'Credit card' && (r.values.payment === null || r.values.payment === undefined)) {
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
    secondary: (ctx, r, up) => [
      r.type === 'Credit card' ? h('div.stack', {}, h('span.label', {}, 'Credit limit'), moneyInput(r.values.limit, v => up({ limit: v }), { hint: 'Add limit' })) : null,
      h('div.stack', {}, h('span.label', {}, 'Due day'), textInput(r.values.dueDay, v => up({ dueDay: v }), { hint: 'Add day', width: 90 })),
      h('div.stack', {}, h('span.label', {}, 'Stress 1 to 5'), toggle(['1', '2', '3', '4', '5'], r.stress ? String(r.stress) : null, v => up({ stress: Number(v) }), { label: 'Stress' })),
    ],
    tertiary: (ctx, r, up) => [h('div.stack', {}, h('span.label', {}, 'Coach notes'), textInput(r.privateNote, v => up({ privateNote: v }), { hint: 'Add a private note', width: 360 }))],
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
  const complete = usable.filter(d => d.apr != null && d.payment != null);
  const missing = usable.filter(d => !complete.includes(d));
  const plan = payoffPlan(complete);
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
  const gross = ctx.store.find(r => r.kind === 'income').reduce((s, r) => (s === null || r.values.gross == null ? null : s + r.values.gross / 12), 0) || null;
  const dti = debtToIncome({ monthlyDebtPayments: usable.length ? sum(m.inputs.debts, d => d.payment) : null, grossMonthly: gross });
  const cards = ctx.store.find(r => r.kind === 'debt' && r.type === 'Credit card').map(r => ({ balance: r.values.balance, limit: r.values.limit }));
  const util = utilization(cards);
  return { dti, util: util.hidden ? needs('M35', ['credit limits'], { unit: 'pct' }) : util };
}

// Spending lines: Fixed | Variable, Fixed date | Variable date, who pays, paid with.
export function spendingList(ref) {
  const cats = ref.categoryDefaults.map(c => c.category);
  return {
    kind: 'bill', area: 'needs', title: 'Spending lines', thing: { one: 'line', plural: 'lines' },
    filter: r => r.kind === 'bill',
    // Eliminated lines fold away at the bottom; one tap brings one back.
    groupBy: r => (r.status === 'Not for me' ? 'Not for me' : r.values.draftt || 'Other'),
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
      { label: 'Amount', num: true, render: (ctx, r, m, up, row) => h('span.row-line', { style: { justifyContent: 'flex-end', flexWrap: 'nowrap', gap: '6px' } },
        moneyInput(r.amount, v => up({ amount: v, status: r.status === 'Not sure' ? null : r.status }), { key: `${r.id}:amount` }), // typing the real number clears Guess
        r.status === 'Not for me'
          ? h('button.btn.small', { type: 'button', onclick: () => up({ status: null }) }, 'Bring back')
          : h('button.btn.small.nfm', { type: 'button', onclick: () => up({ status: 'Not for me' }) }, 'Not for me'),
        iconButton('trash', 'Delete', row.remove, { tiny: true })) },
      { label: 'Per', render: (ctx, r, m, up) => perPicker(r.per, v => up({ per: v }), { key: `${r.id}:per` }) },
      { label: 'Amount is', render: (ctx, r, m, up) => toggle(['Fixed', 'Variable'], r.values.amountType ?? null, v => up({ amountType: v }), { label: 'Amount is' }) },
      { label: 'Date is', render: (ctx, r, m, up) => toggle([['Fixed date', 'Fixed date'], ['Variable date', 'Variable date']], r.values.timing ?? null, v => up({ timing: v }), { label: 'Date is' }) },
      { label: 'Owner', couple: true, render: (ctx, r, m, up) => toggle(['Me', 'Partner', 'Joint'], r.owner || 'Me', v => up({ owner: v }), { label: 'Owner' }) },
    ],
    secondary: (ctx, r, up) => [whoPays(r, up)],
    // Not for me counts as $0 everywhere (R058); its group shows what was cut.
    subtotal: (ctx, rows) => (rows.every(r => r.status === 'Not for me') ? `$0, cut ${money(sum(rows, r => r.amount))}` : money(sum(rows, kept))),
    footerTotal: (ctx, recs) => amount(ctx, recs.some(r => r.amount != null) ? sum(recs, kept) : null),
    totals: (ctx, recs, m, cols) => [...cols.map(c => c.label === 'Line' ? h('td', {}, `${recs.filter(r => r.status !== 'Not for me').length} lines`) : c.label === 'Amount' ? h('td.num', {}, amount(ctx, recs.some(r => r.amount != null) ? sum(recs, kept) : null)) : h('td')), h('td'), h('td')],
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
      const ds = ctx.metrics().inputs.debts.filter(d => d.balance > 0 && d.apr != null && d.payment != null);
      if (!ds.length) return { needs: ['a balance, APR and payment'] };
      const p = payoffPlan(ds);
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

// Income: one row per paycheck or other money in (built out in phase 5).
export function incomeList() {
  return {
    kind: 'income', area: 'income', title: 'Income', thing: { one: 'income', plural: 'income rows' }, defaultType: 'Job',
    filter: r => r.kind === 'income',
    picker: { top: ['Job', 'Unemployment', 'Side hustle', 'Benefits', 'Rental'], other: ['Partner job', 'Money from family', 'Self-employed'] },
    coreFields: ['amount'],
    columns: [
      { label: 'Source', render: (ctx, r, m, up) => textInput(r.name, v => up({ name: v }), { hint: r.type || 'Add name', tip: r.type, width: 170, key: `${r.id}:name` }) },
      { label: 'Take-home', num: true, render: (ctx, r, m, up) => moneyInput(r.amount, v => up({ amount: v }), { hint: 'Add take-home', key: `${r.id}:amount` }) },
      { label: 'Per', render: (ctx, r, m, up) => perPicker(r.per, v => up({ per: v }), { key: `${r.id}:per` }) },
      { label: 'Owner', couple: true, render: (ctx, r, m, up) => toggle(['Me', 'Partner', 'Joint'], r.owner || 'Me', v => up({ owner: v }), { label: 'Owner' }) },
    ],
    footerTotal: (ctx, recs, m) => h('span', {}, amount(ctx, m.inputs.takeHome), h('span.muted', {}, ' a month')),
    totals: (ctx, recs, m, cols) => [...cols.map(c => c.label === 'Source' ? h('td', {}, `${recs.length} ${recs.length === 1 ? 'row' : 'rows'}`) : c.label === 'Take-home' ? h('td.num', {}, amount(ctx, m.inputs.takeHome)) : h('td')), h('td'), h('td')],
  };
}

// Assets: cash and investment accounts, car, home (built out in phase 5).
export function assetList(ref) {
  const group = r => (r.kind === 'asset' ? 'Home or car' : r.values.group === 'investment' ? 'Investments' : 'Cash');
  const val = r => (r.kind === 'asset' ? r.values.value : r.values.balance);
  return {
    kind: 'account', area: 'assets', title: 'Assets', thing: { one: 'account', plural: 'accounts' },
    filter: r => r.kind === 'account' || r.kind === 'asset',
    groupBy: group,
    picker: { top: ['Checking', 'Savings or HYSA', '401(k)', 'Roth IRA'], other: [...ref.lists.cashTypes, ...ref.lists.investmentTypes] },
    newValues: type => ({ values: { group: ref.lists.cashTypes.includes(type) ? 'cash' : 'investment' } }),
    columns: [
      { label: 'Account', render: (ctx, r, m, up) => textInput(r.name, v => up({ name: v }), { hint: r.type || 'Add name', tip: r.type, width: 170, key: `${r.id}:name` }) },
      { label: 'Balance', num: true, render: (ctx, r, m, up) => moneyInput(val(r), v => up(r.kind === 'asset' ? { value: v } : { balance: v }), { hint: 'Add balance', key: `${r.id}:balance` }) },
      { label: 'Owner', couple: true, render: (ctx, r, m, up) => toggle(['Me', 'Partner', 'Joint'], r.owner || 'Me', v => up({ owner: v }), { label: 'Owner' }) },
    ],
    coreFields: [],
    subtotal: (ctx, rows) => money(sum(rows, val)),
    footerTotal: (ctx, recs) => amount(ctx, recs.some(r => val(r) != null) ? sum(recs, val) : null),
    totals: (ctx, recs, m, cols) => [...cols.map(c => c.label === 'Account' ? h('td', {}, `${recs.length} ${recs.length === 1 ? 'item' : 'items'}`) : c.label === 'Balance' ? h('td.num', {}, amount(ctx, recs.some(r => val(r) != null) ? sum(recs, val) : null)) : h('td')), h('td'), h('td')],
  };
}
