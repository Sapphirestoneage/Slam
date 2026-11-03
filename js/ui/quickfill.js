// Quick fill: a locked number's "needs take-home" opens a box right there. Saving writes to the
// same record the full screen uses, so it shows up in its home too (Words: Locked state).
import { h } from './dom.js';
import { parseNum, moneyText, popover, closePop, toggle, toast } from './staples.js';

const first = (ctx, pred) => ctx.store.find(pred)[0] || null;

// Each entry: label, current value, save, and where it lives.
const QUICK = {
  'take-home': {
    label: 'Take-home pay a month', hint: 'After taxes, what lands in your account', money: true, where: '#/my-money/income',
    get: ctx => { const r = first(ctx, r => r.kind === 'income'); return r?.per === 'month' || !r?.per ? r?.amount ?? null : null; },
    save: (ctx, v) => { const r = first(ctx, r => r.kind === 'income'); r ? ctx.store.update(r.id, { amount: v, per: 'month', basis: 'Take-home' }) : ctx.store.add('income', { name: 'Take-home pay', amount: v, per: 'month' }, { type: 'Job' }); },
  },
  spending: {
    label: 'Spending a month, all in', hint: 'Everything that goes out in a normal month', money: true, where: '#/spending/budget',
    extra: (ctx, state) => {
      const r = first(ctx, r => r.kind === 'spending' && r.type === 'All in');
      state.includes = r ? r.values.includesDebtPayments !== false : true;
      return h('div.stack', {}, h('span.label', {}, 'Does that include debt payments?'),
        toggle([['yes', 'Yes'], ['no', 'No']], state.includes ? 'yes' : 'no', v => { state.includes = v === 'yes'; }, { label: 'Includes debt payments' }));
    },
    get: ctx => first(ctx, r => r.kind === 'spending' && r.type === 'All in')?.amount ?? null,
    save: (ctx, v, state) => {
      const r = first(ctx, r => r.kind === 'spending' && r.type === 'All in');
      r ? ctx.store.update(r.id, { amount: v, includesDebtPayments: state.includes })
        : ctx.store.add('spending', { name: 'Monthly spending, all in', amount: v, values: { includesDebtPayments: state.includes } }, { type: 'All in' });
    },
  },
  age: {
    label: 'Age', money: false, where: '#/my-money/profile',
    get: ctx => ctx.store.doc.profile.age ?? null,
    save: (ctx, v) => ctx.store.setDoc('profile', { age: v }),
  },
  cash: {
    label: 'Cash in checking and savings', money: true, where: '#/my-money/assets',
    get: ctx => first(ctx, r => r.kind === 'account' && r.values.group === 'cash')?.values.balance ?? null,
    save: (ctx, v) => { const r = first(ctx, r => r.kind === 'account' && r.values.group === 'cash'); r ? ctx.store.update(r.id, { balance: v }) : ctx.store.add('account', { name: 'Savings', values: { group: 'cash', balance: v } }, { type: 'Savings or HYSA' }); },
  },
  invested: {
    label: 'Invested, all accounts', money: true, where: '#/my-money/assets',
    get: ctx => first(ctx, r => r.kind === 'account' && r.values.group === 'investment')?.values.balance ?? null,
    save: (ctx, v) => { const r = first(ctx, r => r.kind === 'account' && r.values.group === 'investment'); r ? ctx.store.update(r.id, { balance: v }) : ctx.store.add('account', { name: 'Investments (all accounts)', values: { group: 'investment', balance: v } }, { type: 'All investments' }); },
  },
  'rent or mortgage': {
    label: 'Rent or mortgage a month (your share)', money: true, where: '#/spending/budget',
    get: ctx => first(ctx, r => r.kind === 'bill' && r.values.category === 'Rent or mortgage')?.amount ?? null,
    save: (ctx, v) => { const r = first(ctx, r => r.kind === 'bill' && r.values.category === 'Rent or mortgage'); r ? ctx.store.update(r.id, { amount: v }) : ctx.store.add('bill', { name: 'Rent', amount: v, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', timing: 'Fixed date', whoPays: 'Me' } }); },
  },
  'gross pay': {
    label: 'Gross pay a year', hint: 'Before taxes', money: true, where: '#/my-money/income',
    get: ctx => first(ctx, r => r.kind === 'income')?.values.gross ?? null,
    save: (ctx, v) => { const r = first(ctx, r => r.kind === 'income'); r ? ctx.store.update(r.id, { gross: v }) : ctx.store.add('income', { name: 'Job', values: { gross: v } }, { type: 'Job' }); },
  },
};
QUICK['take-home pay'] = QUICK['take-home'];

export const canQuickFill = need => need in QUICK;

export function quickFill(ctx, anchor, need) {
  const q = QUICK[need];
  const state = {};
  const now = q.get(ctx);
  const input = h('input', { id: `quick-${need.replace(/\W+/g, '-')}`, inputmode: 'decimal', enterkeyhint: 'done', placeholder: q.money ? 'Add amount' : `Add ${need}`, 'aria-label': q.label, value: q.money ? moneyText(now) : now ?? '' });
  const save = () => {
    const v = parseNum(input.value);
    if (v === null) { input.focus(); return; }
    q.save(ctx, v, state);
    closePop();
    toast(`Saved ${q.label.toLowerCase()}.`, { undo: () => ctx.store.undo() });
  };
  input.onkeydown = e => { if (e.key === 'Enter') save(); };
  const goThere = h('a', { href: q.where, onclick: () => closePop() }, 'Open where it lives');
  popover(anchor, h('div.stack.quick-fill', { style: { gap: '12px' } },
    h('strong', {}, q.label),
    q.hint ? h('span.muted', {}, q.hint) : null,
    h(`label.field${q.money ? '.money' : ''}.big`, {}, q.money ? h('span.pre', {}, '$') : null, input),
    q.extra ? q.extra(ctx, state) : null,
    h('div.row-line', {}, h('button.btn.primary', { type: 'button', onclick: save }, 'Save'), h('button.btn', { type: 'button', onclick: closePop }, 'Cancel')),
    goThere), { width: 340 });
  setTimeout(() => input.focus(), 30);
}
