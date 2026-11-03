// My Money lists (build phase 5, Mockup: Income, Assets, Protection, Taxes): one record type, viewed by sub-tab.
// Detail stays behind More (R023); fields that do not apply to this household never show (gates.js).
import { h } from './dom.js';
import { fromButton, amount, value, moneyInput, pctInput, textInput, perPicker, toggle, select, labelled, summaryStrip, moreBlock, button, toast, metricCard, confirmBox, warnTag, parkProfile, park } from './staples.js';
import { applies, recordFor, REAL_TYPES, PROTECTION_TYPES, LOAN_FOR } from '../gates.js';
import { incomeRow, taxRates, takeHomeFromGross, fica, variableSafeBudget, monthlyFrom } from '../math/income.js';
import { limitUsed } from '../math/assets.js';
import { accountBlocks, accountFlags, stampBalance } from './account-detail.js';
import { is401k, yearly401k } from './account-specific.js';
import { netWorthCheck, yearlyContribution, link401k, contributionFromMonthly } from '../math/portfolio.js';
import { benefitYearly, withholdingFlag } from '../benefits.js';
import { lifeAdminItems, lifeAdminPatch, LIFE_STATES } from '../lifeadmin.js';
import { drafttShares, DRAFTT } from '../math/spending.js';
import { needs } from '../math/result.js';
import { statusOf, countsAsDone } from '../records.js';
import { money, pct } from '../format.js';

const sum = (list, f) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const short = v => (Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : money(v));
const owner = { label: 'Owner', couple: true, render: (ctx, r, m, up) => toggle(['Me', 'Partner', 'Joint'], r.owner || 'Me', v => up({ owner: v }), { label: 'Owner' }) };
const num = x => (x === null ? null : Number(x));
// "I'll find it later" on one field of a row (Brandon B1.2): the field's own status, shown on the Homework list.
const L = (ctx, r, field) => ({ on: r.fieldStatus?.[field] === 'Will email', set: on => ctx.store.setFieldStatus(r.id, field, on ? 'Will email' : null) });
export const FREQ = [['week', 'Weekly (52 a year)'], ['2 weeks', 'Every 2 weeks (26 a year)'], ['twice a month', 'Twice a month (24 a year)'], ['month', 'Monthly (12 a year)']];
// A day of the month, 1 to 31; anything else stays blank.
const dayInput = (value, onChange, hint) => textInput(value == null ? null : String(value), v => { const n = Number(v); onChange(Number.isInteger(n) && n >= 1 && n <= 31 ? n : null); }, { hint, width: 72 });
// Paydays (Brandon B1.5): the days the money lands. The calendar puts paychecks on them.
function paydays(r, up) {
  const v = r.values;
  if (v.payFrequency === 'twice a month') {
    const [a, b] = v.payDays || [];
    const set = (x, y) => up({ payDays: x == null && y == null ? null : [x, y].filter(n => n != null) });
    return h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, dayInput(a, x => set(x, b ?? null), 'e.g. 7'), h('span.muted', {}, 'and'), dayInput(b, y => set(a ?? null, y), 'e.g. 22'));
  }
  if (v.payFrequency === 'month') return dayInput(v.payDay, x => up({ payDay: x }), 'Day, 1 to 31');
  if (v.payFrequency === 'week' || v.payFrequency === '2 weeks') {
    const d = h('input', { type: 'date', value: v.nextPayday || '', 'aria-label': 'Next payday' });
    d.onchange = () => up({ nextPayday: d.value || null });
    return h(`label.field${v.nextPayday ? '.filled' : ''}`, { style: { width: '170px' } }, d);
  }
  return h('span.muted', {}, 'Pick how often you are paid first');
}

// ---------- Income ----------
export function incomeList() {
  return {
    kind: 'income', area: 'income', title: 'Income', thing: { one: 'income', plural: 'income rows' }, defaultType: 'Job',
    filter: r => r.kind === 'income',
    picker: ctx => ({ top: ctx.gates().betweenJobs ? ['Unemployment', 'Job', 'Side hustle', 'Benefits'] : ['Job', 'Unemployment', 'Side hustle', 'Benefits', 'Rental'],
      other: ['Partner job', 'Money from family', 'Self-employed', 'Rental'] }),
    coreFields: ['amount'],
    focus: ['Source', 'Amount', 'Given as', 'Per', 'Pay frequency'], // session 1: take-home or gross, and how often
    columns: [
      { label: 'Source', render: (ctx, r, m, up) => textInput(r.name, v => up({ name: v }), { hint: r.type || 'Add name', tip: r.type, width: 170, key: `${r.id}:name` }) },
      { label: 'Amount', num: true, render: (ctx, r, m, up) => (r.values.basis === 'Both' && incomeRowOf(m, r)?.taxType
        ? h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap', justifyContent: 'flex-end' } }, // Brandon B1.6: both typed, both kept
          moneyInput(r.amount, v => up({ amount: v }), { hint: 'Take-home', key: `${r.id}:amount` }), moneyInput(r.values.gross, v => up({ gross: v }), { hint: 'Gross a year', key: `${r.id}:gross` }))
        : moneyInput(r.amount, v => up({ amount: v }), { hint: r.values.basis === 'Gross' ? 'Add gross' : 'Add take-home', key: `${r.id}:amount` })) },
      { label: 'Given as', render: (ctx, r, m, up) => (incomeRowOf(m, r)?.taxType
        ? toggle(['Take-home', 'Gross', 'Both'], r.values.basis ?? 'Take-home', v => up({ basis: v }), { label: 'Given as' })
        : h('span.muted', { title: 'Counted as it lands; no tax worked out' }, 'As it lands')) },
      { label: 'Per', render: (ctx, r, m, up) => perPicker(r.per, v => up({ per: v }), { key: `${r.id}:per` }) },
      { label: 'Pay frequency', render: (ctx, r, m, up) => select(FREQ, r.values.payFrequency ?? null, v => up({ payFrequency: v }), { label: 'Pay frequency', hint: 'How often', width: 200, key: `${r.id}:freq` }) },
      owner,
    ],
    secondary: (ctx, r, up) => incomeSecondary(ctx, r, up),
    tertiary: (ctx, r, up) => incomeTertiary(ctx, r, up),
    footerTotal: (ctx, recs, m) => h('span', {}, amount(ctx, m.inputs.takeHome), h('span.muted', {}, ' a month')),
    totals: (ctx, recs, m, cols) => [...cols.map(c => c.label === 'Source' ? h('td', {}, `${recs.length} ${recs.length === 1 ? 'row' : 'rows'}`) : c.label === 'Amount' ? h('td.num', {}, amount(ctx, m.inputs.takeHome)) : h('td')), h('td'), h('td')],
    strip: (ctx, m) => incomeStrip(ctx, m),
  };
}
const incomeRowOf = (m, r) => m.inputs.income.find(x => x.r.id === r.id);
function incomeSecondary(ctx, r, up) {
  const g = ctx.gates();
  const link = link401k(ctx.visible(() => true)); // B3.10: blank here borrows from the 401(k)
  const m = ctx.metrics();
  const x = incomeRowOf(m, r);
  const v = r.values;
  const other = x?.computed === 'gross' ? labelled('Gross a year (worked out)', h('span.computed', {}, value(x.grossResult, ctx)))
    : x?.computed === 'takeHome' ? labelled('Take-home a month (worked out)', h('span.computed', {}, value(x.takeHome, ctx)))
      : x?.taxType && v.basis !== 'Both' ? labelled('Gross a year', moneyInput(v.gross, y => up({ gross: y }), { hint: 'Add gross' }), { note: 'Both given: kept as typed', later: L(ctx, r, 'gross') }) : null;
  return [other,
    labelled(v.payFrequency === 'twice a month' ? 'Paydays' : v.payFrequency === 'month' ? 'Payday' : 'Next payday', paydays(r, up),
      { note: 'Puts each paycheck on its day in the calendar', later: L(ctx, r, v.payFrequency === 'week' || v.payFrequency === '2 weeks' ? 'nextPayday' : 'paydays') }),
    labelled('Type', select(['W-2', '1099', 'Business', 'Side hustle', 'Rental', 'Benefits', 'Other'], v.incomeType ?? null, y => up({ incomeType: y }), { label: 'Income type', hint: x?.taxType ?? 'Pick one', width: 150 }), { later: L(ctx, r, 'incomeType') }),
    applies('401k', { g }) && x?.taxType ? labelled('401(k) %', pctInput(v.contributionPct ?? (link.job?.id === r.id ? link.incomePct : null), y => up({ contributionPct: y }), { hint: 'e.g. 6' }),
      { note: link.job?.id === r.id && link.incomePctFrom ? 'From your 401(k)' : link.job?.id === r.id && link.incomePerPaycheck != null ? `From your 401(k): ${money(link.incomePerPaycheck)} a paycheck` : null, later: L(ctx, r, 'contributionPct') }) : null,
    applies('match', { g }) && x?.taxType ? (link.job?.id === r.id && link.incomeTiersFrom && link.incomeTiers.length > 1
      ? labelled('Employer match', h('span.computed', { title: 'Set on your 401(k) under Assets' }, link.incomeTiers.map((t, i) => `${pct(t.rate)} of the ${i ? 'next' : 'first'} ${pct(t.upTo)}`).join(', ')), { note: 'From your 401(k)' })
      : labelled('Employer match: % up to %', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
        pctInput(v.matchPct ?? (link.job?.id === r.id ? link.incomeTiers[0]?.rate : null), y => up({ matchPct: y }), { hint: 'Match' }), h('span.muted', {}, 'up to'),
        pctInput(v.matchCapPct ?? (link.job?.id === r.id ? link.incomeTiers[0]?.upTo : null), y => up({ matchCapPct: y }), { hint: 'Of pay' })),
      { note: link.job?.id === r.id && link.incomeTiersFrom ? 'From your 401(k)' : null, later: L(ctx, r, 'matchPct') })) : null,
    labelled('Bonus: $ and month', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, moneyInput(v.bonus, y => up({ bonus: y }), { hint: 'Bonus' }),
      select(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], v.bonusMonth ?? null, y => up({ bonusMonth: y }), { label: 'Bonus month', hint: 'Month', width: 100 })), { later: L(ctx, r, 'bonus') }),
    // The Health coverage row owns the premium; Income borrows it (answer to Brandon question 71).
    applies('premium', { g }) && x?.taxType ? (m.inputs.health
      ? labelled('Health premium a paycheck', m.inputs.health.jobId === r.id && m.inputs.health.fromPay
        ? fromButton('From Health', '#/net-worth/protection', m.inputs.health.id, { value: money(m.inputs.health.perPaycheck) })
        : fromButton(m.inputs.health.fromPay ? 'From Health, on your main job' : 'From Health, paid as a Budget line', '#/net-worth/protection', m.inputs.health.id), { note: 'Comes out of take-home once' })
      : labelled('Health premium a paycheck', moneyInput(v.premium, y => up({ premium: y }), { hint: 'Add premium' }), { note: 'Or add Health on Protection; it fills this in', later: L(ctx, r, 'premium') })) : null,
    labelled('Perks', button('Add other benefit', { iconName: 'plus', onClick: () => { ctx.store.add('benefit', { name: null, values: {} }, { type: 'Benefit' }); toast('Benefit row added under Other benefits.'); } }))];
}
function incomeTertiary(ctx, r, up) {
  const g = ctx.gates();
  const v = r.values;
  const taxed = !!incomeRowOf(ctx.metrics(), r)?.taxType;
  return [
    applies('vesting', { g }) && taxed ? labelled('Match vesting', select(['Immediate', 'Cliff', 'Graded'], v.vesting ?? null, y => up({ vesting: y }), { label: 'Vesting', width: 140 }), { later: L(ctx, r, 'vesting') }) : null,
    applies('hsaFsa', { g }) && taxed ? labelled(`${g.hsa ? 'HSA' : 'FSA'} a paycheck`, moneyInput(v.hsaFsa, y => up({ hsaFsa: y }), { hint: 'Add amount' }), { later: L(ctx, r, 'hsaFsa') }) : null,
    applies('equity', { g }) && taxed ? labelled('ESPP % and discount; RSUs', textInput(v.equity, y => up({ equity: y }), { hint: 'e.g. 10%, 15% off; 200 RSUs vest Mar', width: 300 }), { later: L(ctx, r, 'equity') }) : null,
    taxed ? labelled('Raise % a year', pctInput(v.raisePct, y => up({ raisePct: y }), { hint: 'e.g. 3' }), { later: L(ctx, r, 'raisePct') }) : null,
    applies('otherPretax', { g }) && taxed ? labelled('Other before-tax a paycheck', moneyInput(v.otherPretax, y => up({ otherPretax: y }), { hint: 'Commuter, life' }), { later: L(ctx, r, 'otherPretax') }) : null,
    labelled('Coach notes', textInput(r.privateNote, y => up({ privateNote: y }), { hint: 'Add a private note', width: 320 }))];
}
function incomeStrip(ctx, m) {
  const x = m.inputs;
  const taxed = x.income.filter(i => i.taxType && i.gross !== null);
  const gross = taxed.length ? { id: 'M13', value: sum(taxed, i => i.gross), needs: [], unit: 'money', text: taxed.map(i => `${i.r.name || i.r.type} ${money(i.gross)} a year${i.computed === 'gross' ? ' (worked out from take-home)' : ''}`).join(' + ') + '.' }
    : needs('M13', ['take-home or gross']);
  const items = [
    { label: 'Take-home a month', result: x.takeHome === null ? needs('M12', ['take-home']) : { id: 'M12', value: x.takeHome, needs: [], unit: 'money', text: x.income.map(i => i.takeHome.text).filter(Boolean).join(' ') } },
    { label: 'Gross a year', result: gross },
    { label: 'Savings rate', result: m.savingsRate, key: 'savingsRate', note: m.savingsRate.second },
  ];
  if (x.gates.betweenJobs) items.push({ label: 'Runway', result: m.runwayMonths, render: r => `${r.value.toFixed(1)} months` }); // R006
  return summaryStrip(ctx, items);
}

// Other benefits: perks with a value, used or not (Mockup: Income › Other benefit row).
const BENEFIT_EXAMPLES = ['Commuter pretax', 'Tuition reimbursement', 'Student loan repayment help', 'Wellness or gym stipend', 'Phone or internet stipend', 'Childcare FSA',
  'Free meals', 'Home office stipend', 'ESPP discount', 'Paid sabbatical', 'Legal plan', 'Pet insurance'];
export function benefitList() {
  return {
    kind: 'benefit', area: 'income', title: 'Other benefits', thing: { one: 'benefit', plural: 'benefits' }, defaultType: 'Benefit',
    filter: r => r.kind === 'benefit',
    picker: { top: BENEFIT_EXAMPLES.slice(0, 4), other: BENEFIT_EXAMPLES.slice(4) },
    newValues: () => ({ values: {} }),
    coreFields: ['amount'],
    columns: [
      { label: 'Benefit', render: (ctx, r, m, up) => textInput(r.name ?? (r.type !== 'Benefit' ? r.type : null), v => up({ name: v }), { hint: 'Name it', width: 190, key: `${r.id}:name` }) },
      { label: 'What it is', render: (ctx, r, m, up) => textInput(r.values.what, v => up({ what: v }), { hint: 'One line', width: 190, key: `${r.id}:what` }) },
      { label: 'How it works', render: (ctx, r, m, up) => select(['Reimbursed', 'Stipend', 'Pretax', 'Match', 'Discount'], r.values.how ?? null, v => up({ how: v }), { label: 'How it works', width: 140, key: `${r.id}:how` }) },
      { label: 'Value', num: true, render: (ctx, r, m, up) => moneyInput(r.amount, v => up({ amount: v }), { hint: 'Add value', key: `${r.id}:amount` }) },
      { label: 'Per', render: (ctx, r, m, up) => toggle([['month', 'Month'], ['year', 'Year']], r.per === 'year' ? 'year' : 'month', v => up({ per: v }), { label: 'Per' }) },
      { label: 'Using it?', render: (ctx, r, m, up) => toggle(['Yes', 'No', 'Partly'], r.values.using ?? null, v => up({ using: v }), { label: 'Using it' }) },
    ],
    footerTotal: (ctx, recs) => {
      const unused = recs.filter(r => r.values.using === 'No' && r.amount != null);
      return unused.length ? h('span', {}, `Unused: ${money(sum(unused, r => monthlyFrom(r.amount, r.per).value))} a month`, h('span.muted', {}, ' (a small win)')) : amount(ctx, null);
    },
  };
}

// Variable income (R005): the safe budget comes from the lowest month after taxes.
export function variableBlock(ctx) {
  const p = ctx.store.doc.profile;
  const v = p.variable || {};
  const set = patch => ctx.store.setDoc('profile', { variable: { ...v, ...patch } });
  const safe = variableSafeBudget({ lowestMonth: v.lowest ?? null, typicalMonth: v.typical ?? null, setAside: v.setAside ?? null }, ctx.ref);
  return h('section.section.area-income', {}, h('div.section-title', {}, h('h2', {}, 'Variable income')),
    h('div.card', {}, h('div.form-grid', {},
      labelled('Last 12 months total', moneyInput(v.last12, x => set({ last12: x }), { hint: 'Add total', key: 'var:last12' })),
      labelled('Typical month', moneyInput(v.typical, x => set({ typical: x }), { hint: 'Add amount', key: 'var:typical' })),
      labelled('Lowest month', moneyInput(v.lowest, x => set({ lowest: x }), { hint: 'Add amount', key: 'var:lowest' }), { note: 'Drives the safe budget' }),
      labelled('Set aside for taxes', pctInput(v.setAside, x => set({ setAside: x }), { hint: `Blank: ${Math.round(ctx.ref.defaults.taxSetAside * 100)}`, key: 'var:setAside' }), { note: 'Blank uses 25%' }),
      metricCard(ctx, 'Safe to count on a month', safe)),
    moreBlock('income:variable', () => h('div', {},
      h('div.form-grid', {}, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((mo, i) =>
        labelled(mo, moneyInput(v.months?.[i] ?? null, x => { const ms = [...(v.months || Array(12).fill(null))]; ms[i] = x; set({ months: ms }); }, { hint: '–', key: `var:m${i}` })))),
      h('div.form-grid', { style: { marginTop: '12px' } }, labelled('Business expenses a month', moneyInput(v.business, x => set({ business: x }), { hint: 'Add amount', key: 'var:business' }), { note: 'Keeps business and personal apart' }))))));
}

// ---------- Assets (car loans and mortgages are the same records as on Debt, R049) ----------
const groupOf = r => (r.kind === 'asset' ? 'Home or car' : r.values.group === 'investment' ? 'Investments' : 'Cash');
const valOf = r => (r.kind === 'asset' ? r.values.value : r.values.balance);
export const loanOf = (ctx, a) => ctx.store.find(d => d.kind === 'debt' && d.linkedTo === a.id)[0] || null;
function setFinanced(ctx, a, how, anchor) {
  const loan = loanOf(ctx, a);
  const go = () => ctx.store.transaction(how, () => {
    ctx.store.update(a.id, { financed: how });
    if (how === 'Financed' && !loan) ctx.store.add('debt', { name: `${a.name || a.type} loan`, linkedTo: a.id, values: {} }, { type: LOAN_FOR[a.type] });
    if (how === 'Paid off' && loan) ctx.store.remove(loan.id);
  });
  // Paid off with a loan that still has numbers: ask first; the loan is the same row as on Debt (R049).
  if (how === 'Paid off' && loan && (loan.values.balance != null || loan.values.payment != null)) {
    for (const b of anchor.querySelectorAll('.seg button')) b.setAttribute('aria-pressed', String(b.textContent === 'Financed')); // stays Financed until confirmed
    confirmBox(anchor, { text: `The ${LOAN_FOR[a.type].toLowerCase()} still shows ${money(loan.values.balance)} owed. Mark it paid off and remove the loan? You can undo this.`,
      yes: 'Paid off, remove the loan', no: 'Keep the loan', onYes: () => { go(); toast('Marked paid off.', { undo: () => ctx.store.undo() }); } });
    return;
  }
  go();
}
function loanCells(ctx, a) {
  const loan = loanOf(ctx, a);
  if (!LOAN_FOR[a.type]) return null;
  const financed = loan || a.values.financed === 'Financed';
  const set = patch => (loan ? ctx.store.update(loan.id, patch) : null);
  const t = h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
    toggle(['Paid off', 'Financed'], financed ? 'Financed' : a.values.financed ?? null, v => setFinanced(ctx, a, v, t), { label: `${a.type}: paid off or financed` }));
  if (!loan) return t;
  t.append(moneyInput(loan.values.balance, v => set({ balance: v }), { hint: 'Owed', key: `${a.id}:loanBal` }),
    pctInput(loan.values.apr, v => set({ apr: v }), { hint: 'Rate', key: `${a.id}:loanApr` }),
    moneyInput(loan.values.payment, v => set({ payment: v }), { hint: 'Payment', key: `${a.id}:loanPay` }));
  if (a.type === 'Home' && a.values.value != null && loan.values.balance != null) t.append(h('span.computed', { title: 'Value minus what is owed' }, `Equity ${money(a.values.value - loan.values.balance)}`));
  return t;
}
export function assetList(ref) {
  return {
    kind: 'account', area: 'assets', title: 'Assets', thing: { one: 'asset', plural: 'assets' },
    filter: r => r.kind === 'account' || r.kind === 'asset',
    groupBy: groupOf,
    picker: ctx => {
      const g = ctx.gates();
      const ok = t => { const k = recordFor(t, ref); const a = k.kind === 'asset' ? 'real' : k.values.group === 'investment' ? 'investments' : 'cash'; return g.areas[a] !== false && (t !== 'HSA' || g.hsa); };
      return { top: ['Checking', 'Savings or HYSA', '401(k)', 'Roth IRA', 'Car', 'Home'].filter(ok).slice(0, 4),
        other: [...ref.lists.cashTypes, ...ref.lists.investmentTypes, ...REAL_TYPES].filter(ok) };
    },
    kindOf: type => (type ? recordFor(type, ref).kind : 'account'),
    newValues: type => ({ values: type ? { ...recordFor(type, ref).values } : { group: 'cash' } }),
    columns: [
      { label: 'Account', render: (ctx, r, m, up) => textInput(r.name, v => up({ name: v }), { hint: r.type || 'Add name', tip: r.type, width: 170, key: `${r.id}:name` }) },
      { label: 'Balance', num: true, render: (ctx, r, m, up) => {
        if (r.kind === 'asset') return moneyInput(r.values.value, v => up({ value: v }), { hint: 'Add value', key: `${r.id}:balance` });
        if (r.values.taxType === 'Both') { // R018: two boxes, one balance
          const both = (pre, roth) => up(stampBalance({ pretaxBalance: pre, rothBalance: roth, balance: pre == null && roth == null ? null : (pre ?? 0) + (roth ?? 0) }));
          return h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap', justifyContent: 'flex-end' } },
            moneyInput(r.values.pretaxBalance, v => both(v, r.values.rothBalance ?? null), { hint: 'Pretax', key: `${r.id}:pre` }),
            moneyInput(r.values.rothBalance, v => both(r.values.pretaxBalance ?? null, v), { hint: 'Roth', key: `${r.id}:roth` }));
        }
        return moneyInput(r.values.balance, v => up(stampBalance({ balance: v })), { hint: 'Add balance', key: `${r.id}:balance` });
      } },
      { label: 'Kind', render: (ctx, r, m, up) => {
        if (r.kind === 'asset') return LOAN_FOR[r.type] ? loanCells(ctx, r) : h('span.muted', {}, r.type || 'Other');
        if (r.values.group === 'investment') return select(ref.lists.investmentTypes.filter(t => t !== 'HSA' || ctx.gates().hsa || r.type === 'HSA'), r.type, v => ctx.store.update(r.id, { type: v }), { label: 'Account type', width: 160, key: `${r.id}:type` });
        return select(ref.lists.cashTypes, r.type, v => ctx.store.update(r.id, { type: v }), { label: 'Account type', width: 160, key: `${r.id}:type` }); // B2.18: the kind of account, apart from the bank
      } },
      // Focus mode only: what goes in each month, typed as a month and saved in the cadence it was entered in (answer 91).
      { label: 'A month in', num: true, focusOnly: true, render: (ctx, r, m, up) => {
        if (r.kind !== 'account' || r.values.group !== 'investment') return null;
        const per = yearlyContribution(r.values, m?.inputs.payFrequency ?? null);
        return moneyInput(per == null ? null : Math.round(per / 12 * 100) / 100, v => up(contributionFromMonthly(v, r.values, m?.inputs.payFrequency ?? null)), { hint: 'Add a month', key: `${r.id}:month-in` });
      } },
      owner,
    ],
    secondary: (ctx, r, up) => assetSecondary(ctx, r, up),
    tertiary: (ctx, r, up) => assetTertiary(ctx, r, up),
    coreFields: [],
    focus: ['Account', 'Balance', 'Kind', 'A month in'], // session 1: type, balance, monthly contribution
    subtotal: (ctx, rows) => money(sum(rows, valOf)),
    footerTotal: (ctx, recs) => amount(ctx, recs.some(r => valOf(r) != null) ? sum(recs, valOf) : null),
    totals: (ctx, recs, m, cols) => [...cols.map(c => c.label === 'Account' ? h('td', {}, `${recs.length} ${recs.length === 1 ? 'item' : 'items'}`) : c.label === 'Balance' ? h('td.num', {}, amount(ctx, recs.some(r => valOf(r) != null) ? sum(recs, valOf) : null)) : h('td')), h('td'), h('td')],
    strip: (ctx, m) => h('div', {}, summaryStrip(ctx, [
      // Total and liquid net worth sit in the Net worth headline above.
      { label: 'Cash', result: m.inputs.cash === null ? needs('M41', ['cash']) : { id: 'M41', value: m.inputs.cash, needs: [], unit: 'money', text: `Checking, savings and other cash: ${money(m.inputs.cash)}.` } },
      { label: 'Rule of 5 cushion', result: m.ruleOf5 }]), assetChecks(ctx, m)),
    stripWhenEmpty: true,
  };
}
function assetSecondary(ctx, r, up) {
  const v = r.values;
  if (r.kind === 'asset') {
    if (r.type === 'Home') return [labelled('Property tax, insurance, HOA a month', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
      moneyInput(v.propertyTax, x => up({ propertyTax: x }), { hint: 'Tax' }), moneyInput(v.homeInsurance, x => up({ homeInsurance: x }), { hint: 'Insurance' }), moneyInput(v.hoa, x => up({ hoa: x }), { hint: 'HOA' }))),
    labelled('Purchase price and date', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, moneyInput(v.purchasePrice, x => up({ purchasePrice: x }), { hint: 'Price' }), textInput(v.purchased, x => up({ purchased: x }), { hint: 'YYYY-MM', width: 100 })))];
    if (r.type === 'Car') return [labelled('Purchase price', moneyInput(v.purchasePrice, x => up({ purchasePrice: x }), { hint: 'Add price' }))];
    return [labelled('Notes', textInput(r.notes, x => up({ notes: x }), { hint: 'What it is', width: 300 }))];
  }
  const later = f => L(ctx, r, f);
  if (v.group === 'cash') return [
    labelled('Institution', textInput(v.institution, x => up({ institution: x }), { hint: 'Bank', width: 160 }), { later: later('institution') }),
    labelled(v.yieldKind === '7-day yield' ? '7-day yield' : 'Interest (APY)', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
      pctInput(v.apy, x => up({ apy: x }), { hint: 'e.g. 4.2' }), toggle(['APY', '7-day yield'], v.yieldKind ?? 'APY', x => up({ yieldKind: x }), { label: 'APY or 7-day yield' })),
    { note: v.apy != null && v.apy < 0.01 && (v.balance ?? 0) > 1000 ? 'Idle cash: a small win to move it' : r.type === 'Money market' ? 'Money market funds show a 7-day yield' : null, later: later('apy') }),
    labelled('Purpose', select(['Emergency', 'Sinking fund', 'Goal', 'General'], v.purpose ?? null, x => up({ purpose: x }), { label: 'Purpose', width: 150 }))];
  const age = ctx.metrics().inputs.age;
  const freq = ctx.metrics().inputs.income.find(x => x.r.values.payFrequency)?.r.values.payFrequency ?? null;
  const perYear = is401k(r) ? yearly401k(ctx, r) : yearlyContribution(v, freq); // B2.14: real paychecks a year, not 26
  const employerHsa = r.type === 'HSA' ? benefitYearly(ctx.store.doc.profile.benefits?.employerHsa, freq) : null; // M2.3: the employer's dollars count too
  const counted = employerHsa == null ? perYear : (perYear ?? 0) + employerHsa;
  const lim = limitUsed({ contributions: counted, type: r.type, age: age ?? 30 }, ctx.ref);
  return [
    labelled('Institution', textInput(v.institution, x => up({ institution: x }), { hint: 'Broker', width: 160 }), { later: later('institution') }),
    is401k(r) ? null : labelled('Putting in', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, moneyInput(v.contribution, x => up({ contribution: x }), { hint: 'Add amount' }),
      toggle(['Paycheck', 'Year'], v.contributionPer ?? 'Year', x => up({ contributionPer: x }), { label: 'Per' })), { later: later('contribution') }),
    is401k(r) || r.type === 'HSA' ? null : labelled('Pretax, Roth or both', toggle(['Pretax', 'Roth', 'Both'], v.taxType ?? null, x => up({ taxType: x }), { label: 'Pretax or Roth' }), { later: later('taxType') }),
    is401k(r) ? null : labelled('Unvested', moneyInput(v.unvested, x => up({ unvested: x }), { hint: 'Add amount' }), { note: 'Shown, not counted in net worth', later: later('unvested') }),
    limitUsed({ contributions: 0, type: r.type, age: 30 }, ctx.ref).value !== null ? labelled('Limit used this year', h('span.computed', {}, lim.value === null ? `Needs ${lim.needs[0]}` : `${value(lim)} of ${money(lim.limit)}${employerHsa ? `, with ${money(employerHsa)} from your employer` : ''}`)) : null];
}
function assetTertiary(ctx, r, up) {
  if (r.kind !== 'account') return [labelled('Coach notes', textInput(r.privateNote, x => up({ privateNote: x }), { hint: 'Add a private note', width: 320 }))];
  const flags = accountFlags(r, { now: ctx.now() });
  return [h('div.stack', { style: { gap: '8px', width: '100%' } },
    flags.length ? h('div.stack', { style: { gap: '4px' } }, flags.map(f => warnTag(f))) : null,
    accountBlocks(ctx, r, up, f => L(ctx, r, f)),
    labelled('Coach notes', textInput(r.privateNote, x => up({ privateNote: x }), { hint: 'Add a private note', width: 320 })))];
}

// Checks under the Assets strip (B2.19, B2.20, B2.16): one line each, with the account named.
function assetChecks(ctx, m) {
  const out = [];
  const nw = netWorthCheck(m.netWorth.value, m.inputs);
  if (nw && !nw.ok) out.push(`Net worth (${money(m.netWorth.value)}) does not match your balances: ${money(nw.assets)} owned − ${money(nw.unvested)} unvested − ${money(nw.owed)} owed = ${money(nw.expected)}. Check for a balance with a status that zeroes it.`);
  for (const r of ctx.visible(x => x.kind === 'account')) for (const f of accountFlags(r, { now: ctx.now() })) if (/sitting in cash|days old|Short goal|under 5 years/.test(f)) out.push(`${r.name || r.type}: ${f}`);
  return out.length ? h('div.stack.asset-checks', { style: { gap: '4px', marginBottom: '12px' } }, out.map(t => warnTag(t))) : null;
}

// ---------- Protection (Mockup: Protection › Coverage row). Cash flow, not net worth (B4) ----------
const premiumMonthly = (r, freq) => (r.amount == null ? null : r.per === 'paycheck' ? monthlyFrom(r.amount, 'paycheck', freq).value : r.amount);
const payFreqOf = ctx => ctx.metrics().inputs.income.find(x => x.r.values.payFrequency)?.r.values.payFrequency ?? null;
const premiumLine = (ctx, r) => ctx.store.find(b => b.kind === 'bill' && b.linkedTo === r.id)[0] || null;
const PREMIUM_CAT = { Health: 'Health insurance', 'Renters or home': 'Renters or home insurance', Car: 'Car insurance' };
// The premium's spending line: one tap adds it to the Budget; later premium edits keep it in step.
function premiumOnBudget(ctx, r) {
  const line = premiumLine(ctx, r);
  const monthly = premiumMonthly(r, payFreqOf(ctx));
  if (line) return h('span.muted.small', {}, `On the Budget as ${line.name}`);
  if (monthly == null) return h('span.muted.small', {}, 'Add the premium first');
  return button('Add to the Budget', { size: 'small', iconName: 'plus', onClick: () => {
    ctx.store.add('bill', { name: `${r.type === 'Renters or home' ? 'Renters insurance' : `${r.type} insurance`}`, amount: Math.round(monthly * 100) / 100, linkedTo: r.id,
      values: { category: PREMIUM_CAT[r.type] ?? 'Fees', draftt: r.type === 'Car' ? 'Transportation' : r.type === 'Renters or home' ? 'Accommodation' : 'Therapy', amountType: 'Fixed', timing: 'Fixed date' } });
    toast('Premium added to the Budget as a fixed line.');
  } });
}
export function protectionList() {
  const types = ctx => PROTECTION_TYPES.filter(t => t !== 'Car' || ctx.gates().car !== false);
  const later = (ctx, r, f) => park(ctx, r, f);
  const pair = (...kids) => h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, ...kids);
  return {
    kind: 'coverage', area: 'goals', title: 'Coverage', thing: { one: 'coverage', plural: 'coverage rows' }, defaultType: 'Health',
    filter: r => r.kind === 'coverage',
    picker: ctx => ({ top: types(ctx).slice(0, 4), other: types(ctx).slice(4) }),
    // The usual list in one click (renters insurance included); mark Don't for a gap.
    headerExtra: ctx => (ctx.store.find(r => r.kind === 'coverage').length ? null : h('button.btn.small', { type: 'button', onclick: () => ctx.store.transaction('Add the usual coverage', () => {
      for (const t of types(ctx)) ctx.store.add('coverage', { name: null, values: {} }, { type: t });
    }) }, 'Add the usual list')),
    coreFields: ['have'],
    columns: [
      { label: 'Coverage', render: (ctx, r, m, up) => select(types(ctx).map(t => [t, t === 'Renters or home' && ctx.gates().housing !== 'Own' ? 'Renters insurance' : t]), r.type, v => ctx.store.update(r.id, { type: v }), { label: 'Coverage type', width: 170, key: `${r.id}:type` }) },
      { label: 'Have it?', render: (ctx, r, m, up) => toggle(['Have it', "Don't", 'Not sure'], r.values.have ?? null, v => up({ have: v }), { label: 'Have it' }) },
      { label: 'Premium', num: true, render: (ctx, r, m, up) => pair(moneyInput(r.amount, v => {
        up({ amount: v });
        const line = premiumLine(ctx, r); // keep the Budget line in step
        if (line && v != null) ctx.store.update(line.id, { amount: Math.round(premiumMonthly({ ...r, amount: v }, payFreqOf(ctx)) * 100) / 100 });
      }, { hint: 'Add premium', key: `${r.id}:amount` }),
        toggle([['paycheck', 'Paycheck'], ['month', 'Month']], r.per === 'paycheck' ? 'paycheck' : 'month', v => up({ per: v }), { label: 'Premium per' })) },
      owner,
    ],
    secondary: (ctx, r, up) => {
      const v = r.values;
      const employer = labelled('Through employer?', toggle(['Yes', 'No'], v.employer ?? null, x => up({ employer: x }), { label: 'Through employer' }), { note: v.employer === 'Yes' ? 'Ends if the job ends' : null });
      // With two or more jobs, Paid from names the paycheck (job 1 unless switched).
      const jobs = ctx.visible(x => x.kind === 'income' && ['Job', 'Partner job'].includes(x.type));
      const from0 = v.paidFrom ?? (r.per === 'paycheck' ? 'Paycheck' : null);
      const paidFrom = jobs.length > 1
        ? labelled('Paid from', toggle([...jobs.map((j, i) => [j.id, `Paycheck: ${j.name || `Job ${i + 1}`}`]), ['Budget line', 'Budget line']],
          from0 === 'Budget line' ? 'Budget line' : from0 === 'Paycheck' ? (v.paidFromJob && jobs.some(j => j.id === v.paidFromJob) ? v.paidFromJob : jobs[0].id) : null,
          x => up(x === null ? { paidFrom: null, paidFromJob: null } : x === 'Budget line' ? { paidFrom: x, paidFromJob: null } : { paidFrom: 'Paycheck', paidFromJob: x }), { label: 'Paid from', clearable: true }),
        { note: from0 === 'Paycheck' ? 'Already out of that take-home' : null })
        : labelled('Paid from', toggle(['Paycheck', 'Budget line'], from0, x => up({ paidFrom: x }), { label: 'Paid from', clearable: true }),
          { note: from0 === 'Paycheck' ? 'Already out of your take-home' : null });
      const from = v.paidFrom ?? (r.per === 'paycheck' ? 'Paycheck' : null);
      const budget = from === 'Budget line' ? labelled('Spending line', premiumOnBudget(ctx, r))
        : from === 'Paycheck' && r.type === 'Health' ? labelled('On Income', fromButton('Your paycheck borrows it', '#/cash-flow/income', ctx.metrics().inputs.health?.jobId ?? ''), { note: 'Out of take-home once; never a Budget line too' }) : null;
      if (r.type === 'Health') return [employer, paidFrom, budget,
        labelled('Deductible: in-network, out-of-network', pair(moneyInput(v.deductible, x => up({ deductible: x }), { hint: 'In' }), moneyInput(v.deductibleOut, x => up({ deductibleOut: x }), { hint: 'Out' })), later(ctx, r, 'deductible')),
        labelled('Out-of-pocket max: in, out', pair(moneyInput(v.oopMax, x => up({ oopMax: x }), { hint: 'In' }), moneyInput(v.oopMaxOut, x => up({ oopMaxOut: x }), { hint: 'Out' })), { note: 'The most you pay in a bad year', ...later(ctx, r, 'oopMax') }),
        labelled('Copays: doctor, specialist, urgent care', pair(moneyInput(v.copayPcp, x => up({ copayPcp: x }), { hint: 'Doctor' }), moneyInput(v.copaySpecialist, x => up({ copaySpecialist: x }), { hint: 'Specialist' }), moneyInput(v.copayUrgent, x => up({ copayUrgent: x }), { hint: 'Urgent' })), later(ctx, r, 'copays'))];
      if (r.type === 'Disability') return [employer, paidFrom, budget,
        labelled('Short-term or long-term', toggle(['Short-term', 'Long-term', 'Both'], v.term ?? null, x => up({ term: x }), { label: 'Short or long term', clearable: true }), later(ctx, r, 'term')),
        labelled('Pays this share of your pay', pctInput(v.benefitPct, x => up({ benefitPct: x }), { hint: 'e.g. 60' }), later(ctx, r, 'benefitPct')),
        labelled('Pays for how long', textInput(v.duration, x => up({ duration: x }), { hint: 'e.g. 26 weeks, to age 65', width: 190 }), later(ctx, r, 'duration')),
        labelled('Waiting period', textInput(v.waiting, x => up({ waiting: x }), { hint: 'e.g. 90 days', width: 130 }), { note: 'Before the first check', ...later(ctx, r, 'waiting') })];
      if (r.type === 'Life') return [employer, paidFrom, budget,
        labelled('Coverage amount', moneyInput(v.coverage, x => up({ coverage: x }), { hint: 'Add amount' }), later(ctx, r, 'coverage')),
        labelled('Planned change', textInput(v.plannedChange, x => up({ plannedChange: x }), { hint: 'e.g. raise it when we marry', width: 260 }), later(ctx, r, 'plannedChange'))];
      return [employer, paidFrom, budget, labelled('Coverage amount', moneyInput(v.coverage, x => up({ coverage: x }), { hint: 'Add amount' }), later(ctx, r, 'coverage'))];
    },
    footerTotal: (ctx, recs) => { const f = payFreqOf(ctx); return h('span', {}, amount(ctx, recs.some(r => r.amount != null) ? sum(recs, r => premiumMonthly(r, f)) : null), h('span.muted', {}, ' a month')); },
    strip: (ctx) => {
      const recs = ctx.visible(r => r.kind === 'coverage');
      const f = payFreqOf(ctx);
      const gaps = recs.filter(r => r.values.have === "Don't");
      const unsure = recs.filter(r => r.values.have === 'Not sure');
      const unbudgeted = recs.filter(r => r.amount != null && (r.values.paidFrom ?? (r.per === 'paycheck' ? 'Paycheck' : null)) !== 'Paycheck' && !premiumLine(ctx, r));
      return h('div', {}, h('div.strip', {},
        h('div.metric', {}, h('span.label', {}, 'Gaps to fill'), h('div.big', {}, String(gaps.length)), h('span.change', {}, gaps.map(r => r.type).join(', ') || 'None marked')),
        h('div.metric', {}, h('span.label', {}, 'Not sure yet'), h('div.big', {}, String(unsure.length)), h('span.change', {}, unsure.map(r => r.type).join(', ') || 'None')),
        h('div.metric', {}, h('span.label', {}, 'Premiums a month'), h('div.big', {}, amount(ctx, recs.some(r => r.amount != null) ? sum(recs, r => premiumMonthly(r, f)) : null)), h('span.change', {}, 'Cash flow, not net worth'))),
      unbudgeted.length ? h('div.nudge', { style: { margin: '0 0 12px' } }, `${unbudgeted.map(r => r.type).join(', ')}: say where ${unbudgeted.length === 1 ? 'it is' : 'they are'} paid from (More), so ${unbudgeted.length === 1 ? 'it counts' : 'they count'} in your spending once.`) : null);
    },
  };
}

// ---------- Life admin (M8): done / not yet / not for me; not yet goes on the Homework list ----------
export function lifeAdminScreen(ctx) {
  const doc = ctx.store.doc;
  const items = lifeAdminItems(doc, ctx.visible(() => true));
  const pickFor = x => toggle(LIFE_STATES, x.status, v => {
    const patch = lifeAdminPatch(x, v, doc);
    ctx.store.transaction('Life admin', () => {
      if (patch.account) ctx.store.update(patch.account.id, { beneficiary: patch.account.beneficiary });
      ctx.store.setDoc('profile', { lifeAdmin: patch.lifeAdmin });
    });
  }, { label: x.label, clearable: true });
  const done = items.filter(x => x.status === 'Done' || x.status === 'Not for me').length;
  return h('section.section.area-goals', {}, h('div.section-title', {}, h('h2', {}, 'Life admin'), h('span.muted', {}, `${done} of ${items.length} sorted`)),
    h('div.card', {}, h('p.muted', {}, 'The paperwork that protects you. Anything marked Not yet goes on your homework list, with where to do it.'),
      h('div.benefit-list', {}, items.map(x => h('div.benefit-row', {}, h('span.gate-label', {}, x.label),
        x.fromProtection ? h('span.tag.plain', {}, '✓ Done (on your coverage list)') : pickFor(x),
        x.status === 'Not yet' ? h('span.muted.small', {}, x.where) : null)))));
}

// ---------- Taxes (Mockup: Taxes › Filing) ----------
export const FILING = ['Single', 'Married jointly', 'Married separately', 'Head of household'];
export function taxesScreen(ctx) {
  const m = ctx.metrics();
  const x = m.inputs;
  const p = ctx.store.doc.profile;
  const set = patch => ctx.store.setDoc('profile', patch);
  const taxed = x.income.filter(i => i.taxType && i.gross !== null);
  const gross = taxed.length ? sum(taxed, i => i.gross) : null;
  const pretax = sum(taxed, i => i.pretax);
  const se = taxed.some(i => i.taxType === '1099');
  const rates = taxRates({ gross, pretax, filingStatus: x.filingStatus, selfEmployed: se && taxed.every(i => i.taxType === '1099'), place: x.place }, ctx.ref);
  const marginal = rates.value === null ? rates : { ...rates, value: rates.marginal, text: `The last dollar earned is taxed at ${pct(rates.marginal)}: the federal bracket plus FICA.` };
  const seGross = sum(taxed.filter(i => i.taxType === '1099'), i => i.gross);
  const seTax = seGross ? fica({ gross: seGross, filingStatus: x.filingStatus, selfEmployed: true }, ctx.ref) : null;
  const inferred = !p.filingStatus;
  const g = ctx.gates();
  return h('section.section.area-taxes', {}, h('div.section-title', {}, h('h2', {}, 'Filing')),
    h('div.card', {}, h('div.form-grid', {},
      labelled('Filing status', h('span.row-line', { style: { gap: '8px' } }, select(FILING, x.filingStatus, v => set({ filingStatus: v }), { label: 'Filing status', width: 190, key: 'tax:filing' }),
        inferred ? h('span.tag.plain', { title: 'Worked out from Solo or couple. Pick one to confirm.' }, 'Coach infers') : null)),
      metricCard(ctx, 'Effective rate', rates.value === null ? rates : { ...rates, value: rates.effective }),
      metricCard(ctx, 'Marginal bracket', marginal)),
    // Withholding (M3): last year's result and the W-4 basics, with one plain flag.
    h('div.form-grid', { style: { marginTop: '16px' } },
      labelled(`Tax year ${ctx.now().getFullYear() - 1}: refund or owed`, h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
        toggle(['Refund', 'Owed', "Don't know"], p.lastYearTax ?? null, v => set({ lastYearTax: v }), { label: 'Refund or owed', clearable: true }),
        p.lastYearTax === 'Refund' || p.lastYearTax === 'Owed' ? moneyInput(p.lastYearAmount ?? null, v => set({ lastYearAmount: v }), { hint: 'Add amount', key: 'tax:lastYear' }) : null),
        parkProfile(ctx.store, 'lastYearAmount')),
      labelled('W-4 filing status', select(['Single or married filing separately', 'Married filing jointly', 'Head of household'], p.w4Status ?? null, v => set({ w4Status: v }), { label: 'W-4 filing status', width: 270, key: 'tax:w4' }),
        { note: 'Step 1(c) on your W-4', ...parkProfile(ctx.store, 'w4Status') }),
      labelled('Extra withheld a paycheck', moneyInput(p.w4Extra ?? null, v => set({ w4Extra: v }), { hint: 'Add amount', key: 'tax:w4extra' }), { note: 'Step 4(c) on your W-4', ...parkProfile(ctx.store, 'w4Extra') })),
    (() => { const f = withholdingFlag({ lastYear: p.lastYearTax, amount: p.lastYearAmount ?? null }); return f ? h('div.nudge', { style: { marginTop: '12px' } }, f.text) : null; })(),
    moreBlock('taxes:more', () => h('div.form-grid', {},
      // Refund history (B5.2): the two years before, each with don't know.
      ...[2, 3].map(k => {
        const yr = ctx.now().getFullYear() - k;
        const hist = p.taxHistory?.[yr] || {};
        const setH = patch => set({ taxHistory: { ...(p.taxHistory || {}), [yr]: { ...hist, ...patch } } });
        return labelled(`Tax year ${yr}`, h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
          toggle(['Refund', 'Owed', "Don't know"], hist.result ?? null, v => setH({ result: v }), { label: `Tax year ${yr}`, clearable: true }),
          hist.result === 'Refund' || hist.result === 'Owed' ? moneyInput(hist.amount ?? null, v => setH({ amount: v }), { hint: 'Add amount', key: `tax:hist${yr}` }) : null));
      }),
      applies('quarterly', { g, taxTypes: taxed.map(i => i.taxType) }) ? labelled('Quarterly estimates paid this year', moneyInput(p.quarterlyPaid ?? null, v => set({ quarterlyPaid: v }), { hint: 'Add amount', key: 'tax:quarterly' })) : null,
      applies('seTax', { g, taxTypes: taxed.map(i => i.taxType) }) ? labelled('Self-employment tax a year', h('span.computed', {}, seTax ? money(seTax.value) : 'Needs 1099 income')) : null), { label: 'Earlier years and estimates' }),
    h('p.muted', { style: { marginTop: '12px' } }, `Gross used: ${gross === null ? 'none yet (add take-home or gross on Income)' : `${money(gross)} a year`}. ${x.place ? `Federal, FICA, NY state${x.place.nyc ? ' and NYC' : ''} tax.${/joint/i.test(x.filingStatus) || x.place.nyc ? ` ${/joint/i.test(x.filingStatus) ? 'NY joint brackets' : ''}${/joint/i.test(x.filingStatus) && x.place.nyc ? ' and ' : ''}${x.place.nyc ? 'NYC rates' : ''}: not yet confirmed against the law.` : ''}` : 'Federal and FICA; state tax is in for New York only so far.'}`)));
}

// ---------- Completion (R065): core is the Primary fields; full adds the detail that applies ----------
const done = (r, f) => countsAsDone(statusOf(r, f));
const FULL = {
  income: (r, g) => ['amount', 'payFrequency', 'incomeType', ...(g.employer ? ['contributionPct'] : [])],
  debt: r => ['balance', 'apr', 'payment', ...(r.type === 'Credit card' ? ['limit', 'dueDay'] : r.type === 'Student loan' ? ['federal'] : []), 'stress'],
  account: r => [r.values.taxType === 'Both' ? 'pretaxBalance' : 'balance', 'institution', ...(r.values.group === 'investment' ? ['taxType', 'contribution'] : ['apy'])],
  asset: r => ['value', ...(LOAN_FOR[r.type] ? ['financed'] : [])],
  coverage: r => ['have', 'amount', r.type === 'Health' ? 'deductible' : r.type === 'Disability' ? 'benefitPct' : 'coverage'], // B4.2: health has no coverage amount
  benefit: () => ['amount', 'using'],
};
export function listCompletion(ctx, pred, core) {
  const g = ctx.gates();
  const recs = ctx.visible(pred);
  const c = { done: 0, of: 0 }, f = { done: 0, of: 0 };
  const WORDS = { amount: 'amount', balance: 'balance', apr: 'APR', value: 'value', have: 'have it?', payFrequency: 'pay frequency', incomeType: 'type', contributionPct: '401(k) %',
    payment: 'payment', limit: 'limit', dueDay: 'due day', federal: 'federal or private', stress: 'stress', institution: 'institution', taxType: 'pretax or Roth', contribution: 'putting in',
    apy: 'APY', financed: 'paid off or financed', coverage: 'coverage amount', deductible: 'deductible', benefitPct: 'benefit %', using: 'using it?', pretaxBalance: 'balances' };
  c.missing = []; f.missing = [];
  for (const r of recs) {
    const name = r.name || r.type || r.kind;
    const coreF = typeof core === 'function' ? core(r) : core;
    c.of += 1;
    const coreMiss = coreF.filter(x => !done(r, x));
    if (!coreMiss.length) c.done += 1; else c.missing.push(`${name}: ${coreMiss.map(x => WORDS[x] ?? x).join(', ')}`);
    const fullF = [...new Set([...coreF, ...(FULL[r.kind]?.(r, g) ?? [])])];
    const fullMiss = fullF.filter(x => !done(r, x));
    f.of += fullF.length; f.done += fullF.length - fullMiss.length;
    if (fullMiss.length) f.missing.push(`${name}: ${fullMiss.map(x => WORDS[x] ?? x).join(', ')}`);
  }
  return { core: c, full: f };
}

// ---------- Charts for the visuals panel (Visualizations tab) ----------
const theme = t => ({ textStyle: { fontFamily: t.font, color: t.text } });
export const incomeCharts = [
  {
    name: 'Gross to take-home',
    data: ctx => {
      const x = ctx.metrics().inputs;
      const taxed = x.income.filter(i => i.taxType && i.gross !== null);
      if (!taxed.length) return { needs: ['take-home or gross pay'] };
      let fed = 0, fc = 0, pre = 0, gross = 0, st = 0;
      for (const i of taxed) {
        const t = takeHomeFromGross({ gross: i.gross, pretax: i.pretax, filingStatus: x.filingStatus, selfEmployed: i.taxType === '1099', place: x.place }, ctx.ref);
        gross += i.gross; fed += t.federal.value; fc += t.fica.value; pre += i.pretax; st += t.stateTax.state + t.stateTax.local;
      }
      const steps = [['Gross', gross / 12], ['Federal tax', -fed / 12], ['FICA', -fc / 12], ...(st ? [['State and city', -st / 12]] : []), ['Before-tax', -pre / 12]];
      return { steps, takeHome: (gross - fed - fc - st - pre) / 12 };
    },
    option: (d, t) => {
      const labels = [...d.steps.map(s => s[0]), 'Take-home'];
      let run = 0;
      const base = [], bar = [];
      for (const [, v] of d.steps) { if (v >= 0) { base.push(0); bar.push(v); run = v; } else { run += v; base.push(run); bar.push(-v); } }
      base.push(0); bar.push(d.takeHome);
      return { ...theme(t), grid: { left: 64, right: 16, top: 16, bottom: 28 },
        xAxis: { type: 'category', data: labels, axisLabel: { color: t.text2, interval: 0, fontSize: 11 } },
        yAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: ps => { const p = ps.find(x => x.seriesName === 'amount'); return `${p.name}: ${money(p.value)} a month`; } },
        series: [{ name: 'base', type: 'bar', stack: 'w', data: base, itemStyle: { color: 'transparent' }, emphasis: { disabled: true } },
          { name: 'amount', type: 'bar', stack: 'w', data: bar.map((v, i) => ({ value: Math.round(v), itemStyle: { color: i === 0 || i === bar.length - 1 ? t.area : t.text2, borderRadius: 4 } })) }] };
    },
  },
  {
    name: 'Where take-home goes (DRAFTT)',
    data: ctx => {
      const m = ctx.metrics();
      if (m.inputs.takeHome === null) return { needs: ['take-home'] };
      const lines = m.inputs.lines.filter(l => l.status !== 'Not for me');
      if (!lines.length) return { needs: ['spending lines'] };
      const r = drafttShares(lines, m.inputs.takeHome, { roommates: m.inputs.roommates });
      const debts = m.inputs.debts.reduce((s, d) => s + (d.inFull ? 0 : d.payment ?? 0), 0);
      const totals = { ...r.totals, Debt: r.totals.Debt + debts };
      return { rows: DRAFTT.filter(k => totals[k] > 0).map(k => [k, totals[k]]), takeHome: m.inputs.takeHome };
    },
    option: (d, t) => ({ ...theme(t), grid: { left: 16, right: 16, top: 36, bottom: 24 }, legend: { top: 0, textStyle: { color: t.text2 } },
      xAxis: { type: 'value', max: Math.max(d.takeHome, d.rows.reduce((s, r) => s + r[1], 0)), axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
      yAxis: { type: 'category', data: ['Take-home'], axisLabel: { show: false } },
      tooltip: { valueFormatter: v => `${money(v)} a month (${pct(v / d.takeHome)})` },
      series: d.rows.map(([k, v], i) => ({ name: k, type: 'bar', stack: 'all', data: [Math.round(v)], barWidth: 40, itemStyle: { color: t.area, opacity: 1 - i * 0.12 } })) }),
  },
];
export const assetCharts = [
  {
    name: 'By account type',
    data: ctx => {
      const x = ctx.metrics().inputs;
      const rows = [...x.accounts, ...x.things].filter(a => a.value != null);
      if (!rows.length) return { needs: ['a balance'] };
      const by = new Map();
      for (const a of rows) by.set(a.type || 'Other', (by.get(a.type || 'Other') ?? 0) + a.value);
      return { rows: [...by].sort((a, b) => b[1] - a[1]) };
    },
    option: (d, t) => ({ ...theme(t), grid: { left: 130, right: 24, top: 8, bottom: 24 },
      xAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
      yAxis: { type: 'category', data: d.rows.map(r => r[0]), axisLabel: { color: t.text, fontWeight: 600 } },
      tooltip: { valueFormatter: v => money(v) },
      series: [{ type: 'bar', data: d.rows.map(r => r[1]), itemStyle: { color: t.area, borderRadius: [0, 4, 4, 0] }, barWidth: 18 }] }),
  },
  {
    name: 'How fast you can reach it',
    data: ctx => {
      const x = ctx.metrics().inputs;
      if (x.cash === null && x.invested === null && !x.things.length) return { needs: ['a balance'] };
      const retirement = x.accounts.filter(a => a.group === 'investment' && a.type !== 'Brokerage' && a.type !== 'Crypto').reduce((s, a) => s + (a.value ?? 0), 0);
      const taxable = x.accounts.filter(a => a.type === 'Brokerage' || a.type === 'Crypto').reduce((s, a) => s + (a.value ?? 0), 0);
      return { rows: [['Cash: today', x.cash ?? 0], ['Brokerage: days', taxable], ['Retirement: 59½', retirement], ['Home and car: months', x.things.reduce((s, a) => s + (a.value ?? 0), 0)]] };
    },
    option: (d, t) => ({ ...theme(t), grid: { left: 150, right: 24, top: 8, bottom: 24 },
      xAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
      yAxis: { type: 'category', data: d.rows.map(r => r[0]), inverse: true, axisLabel: { color: t.text, fontWeight: 600 } },
      tooltip: { valueFormatter: v => money(v) },
      series: [{ type: 'bar', data: d.rows.map(r => r[1]), itemStyle: { color: t.area, borderRadius: [0, 4, 4, 0] }, barWidth: 18 }] }),
  },
  {
    name: 'Rule of 5 cushion',
    data: ctx => {
      const m = ctx.metrics();
      if (m.ruleOf5.value === null) return { needs: m.ruleOf5.needs };
      if (m.inputs.cash === null) return { needs: ['cash'] };
      return { target: m.ruleOf5.value, cash: m.inputs.cash, months: m.ruleOf5.months };
    },
    option: (d, t) => ({ ...theme(t),
      series: [{ type: 'gauge', min: 0, max: Math.max(d.target, d.cash) * 1.1, radius: '95%', center: ['50%', '60%'], startAngle: 200, endAngle: -20,
        progress: { show: true, width: 14, itemStyle: { color: t.area } }, axisLine: { lineStyle: { width: 14, color: [[1, t.line]] } },
        axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, pointer: { show: false },
        title: { offsetCenter: [0, '30%'], color: t.text2, fontSize: 12 },
        detail: { offsetCenter: [0, '-5%'], color: t.text, fontSize: 22, fontWeight: 700, formatter: () => `${money(d.cash)} of ${money(d.target)}` },
        data: [{ value: d.cash, name: `${d.months.toFixed(1)} months of spending (age / 5)` }] }] }),
  },
  {
    name: 'Contribution limits',
    data: ctx => {
      const m = ctx.metrics();
      const rows = ctx.visible(r => r.kind === 'account' && r.values.group === 'investment' && r.values.contribution != null).map(r => {
        const perYear = r.values.contributionPer === 'Paycheck' ? r.values.contribution * 26 : r.values.contribution;
        const l = limitUsed({ contributions: perYear, type: r.type, age: m.inputs.age ?? 30 }, ctx.ref);
        return l.value === null ? null : [r.name || r.type, l.value];
      }).filter(Boolean);
      return rows.length ? { rows } : { needs: ['what goes into a 401(k), IRA or HSA'] };
    },
    option: (d, t) => ({ ...theme(t), grid: { left: 130, right: 40, top: 8, bottom: 24 },
      xAxis: { type: 'value', max: 1, axisLabel: { color: t.text2, formatter: v => pct(v) }, splitLine: { lineStyle: { color: t.line } } },
      yAxis: { type: 'category', data: d.rows.map(r => r[0]), axisLabel: { color: t.text, fontWeight: 600 } },
      tooltip: { valueFormatter: v => `${pct(v)} of the limit` },
      series: [{ type: 'bar', data: d.rows.map(r => Math.min(1, r[1])), itemStyle: { color: t.area, borderRadius: [0, 4, 4, 0] }, barWidth: 16, label: { show: true, position: 'right', color: t.text2, formatter: p => pct(d.rows[p.dataIndex][1]) } }] }),
  },
];
