// My Money lists (build phase 5, Mockup: Income, Assets, Protection, Taxes): one record type, viewed by sub-tab.
// Detail stays behind More (R023); fields that do not apply to this household never show (gates.js).
import { h } from './dom.js';
import { amount, value, moneyInput, pctInput, textInput, perPicker, toggle, select, labelled, summaryStrip, moreBlock, button, toast, metricCard, confirmBox } from './staples.js';
import { applies, recordFor, REAL_TYPES, PROTECTION_TYPES, LOAN_FOR } from '../gates.js';
import { incomeRow, taxRates, takeHomeFromGross, fica, variableSafeBudget, monthlyFrom } from '../math/income.js';
import { limitUsed } from '../math/assets.js';
import { drafttShares, DRAFTT } from '../math/spending.js';
import { needs } from '../math/result.js';
import { statusOf, countsAsDone } from '../records.js';
import { money, pct } from '../format.js';

const sum = (list, f) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const short = v => (Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : money(v));
const owner = { label: 'Owner', couple: true, render: (ctx, r, m, up) => toggle(['Me', 'Partner', 'Joint'], r.owner || 'Me', v => up({ owner: v }), { label: 'Owner' }) };
const num = x => (x === null ? null : Number(x));
const FREQ = [['week', 'Weekly'], ['2 weeks', 'Every 2 weeks'], ['twice a month', 'Twice a month'], ['month', 'Monthly']];

// ---------- Income ----------
export function incomeList() {
  return {
    kind: 'income', area: 'income', title: 'Income', thing: { one: 'income', plural: 'income rows' }, defaultType: 'Job',
    filter: r => r.kind === 'income',
    picker: ctx => ({ top: ctx.gates().betweenJobs ? ['Unemployment', 'Job', 'Side hustle', 'Benefits'] : ['Job', 'Unemployment', 'Side hustle', 'Benefits', 'Rental'],
      other: ['Partner job', 'Money from family', 'Self-employed', 'Rental'] }),
    coreFields: ['amount'],
    columns: [
      { label: 'Source', render: (ctx, r, m, up) => textInput(r.name, v => up({ name: v }), { hint: r.type || 'Add name', tip: r.type, width: 170, key: `${r.id}:name` }) },
      { label: 'Amount', num: true, render: (ctx, r, m, up) => moneyInput(r.amount, v => up({ amount: v }), { hint: r.values.basis === 'Gross' ? 'Add gross' : 'Add take-home', key: `${r.id}:amount` }) },
      { label: 'Given as', render: (ctx, r, m, up) => (incomeRowOf(m, r)?.taxType
        ? toggle(['Take-home', 'Gross'], r.values.basis ?? 'Take-home', v => up({ basis: v }), { label: 'Given as' })
        : h('span.muted', { title: 'Counted as it lands; no tax worked out' }, 'As it lands')) },
      { label: 'Per', render: (ctx, r, m, up) => perPicker(r.per, v => up({ per: v }), { key: `${r.id}:per` }) },
      { label: 'Pay frequency', render: (ctx, r, m, up) => select(FREQ, r.values.payFrequency ?? null, v => up({ payFrequency: v }), { label: 'Pay frequency', hint: 'How often', width: 150, key: `${r.id}:freq` }) },
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
  const m = ctx.metrics();
  const x = incomeRowOf(m, r);
  const v = r.values;
  const other = x?.computed === 'gross' ? labelled('Gross a year (worked out)', h('span.computed', {}, value(x.grossResult, ctx)))
    : x?.computed === 'takeHome' ? labelled('Take-home a month (worked out)', h('span.computed', {}, value(x.takeHome, ctx)))
      : x?.taxType ? labelled('Gross a year', moneyInput(v.gross, y => up({ gross: y }), { hint: 'Add gross' }), { note: 'Both given: kept as typed' }) : null;
  return [other,
    labelled('Type', select(['W-2', '1099', 'Business', 'Side hustle', 'Rental', 'Benefits', 'Other'], v.incomeType ?? null, y => up({ incomeType: y }), { label: 'Income type', hint: x?.taxType ?? 'Pick one', width: 150 })),
    applies('401k', { g }) && x?.taxType ? labelled('401(k) %', pctInput(v.contributionPct, y => up({ contributionPct: y }), { hint: '0' })) : null,
    applies('match', { g }) && x?.taxType ? labelled('Employer match: % up to %', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
      pctInput(v.matchPct, y => up({ matchPct: y }), { hint: 'Match' }), h('span.muted', {}, 'up to'), pctInput(v.matchCapPct, y => up({ matchCapPct: y }), { hint: 'Of pay' }))) : null,
    labelled('Bonus: $ and month', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, moneyInput(v.bonus, y => up({ bonus: y }), { hint: 'Bonus' }),
      select(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], v.bonusMonth ?? null, y => up({ bonusMonth: y }), { label: 'Bonus month', hint: 'Month', width: 100 }))),
    applies('premium', { g }) && x?.taxType ? labelled('Health premium a paycheck', moneyInput(v.premium, y => up({ premium: y }), { hint: 'Add premium' })) : null,
    labelled('Perks', button('Add other benefit', { iconName: 'plus', onClick: () => { ctx.store.add('benefit', { name: null, values: {} }, { type: 'Benefit' }); toast('Benefit row added under Other benefits.'); } }))];
}
function incomeTertiary(ctx, r, up) {
  const g = ctx.gates();
  const v = r.values;
  const taxed = !!incomeRowOf(ctx.metrics(), r)?.taxType;
  return [
    applies('vesting', { g }) && taxed ? labelled('Match vesting', select(['Immediate', 'Cliff', 'Graded'], v.vesting ?? null, y => up({ vesting: y }), { label: 'Vesting', width: 140 })) : null,
    applies('hsaFsa', { g }) && taxed ? labelled(`${g.hsa ? 'HSA' : 'FSA'} a paycheck`, moneyInput(v.hsaFsa, y => up({ hsaFsa: y }), { hint: 'Add amount' })) : null,
    applies('equity', { g }) && taxed ? labelled('ESPP % and discount; RSUs', textInput(v.equity, y => up({ equity: y }), { hint: 'e.g. 10%, 15% off; 200 RSUs vest Mar', width: 300 })) : null,
    taxed ? labelled('Raise % a year', pctInput(v.raisePct, y => up({ raisePct: y }), { hint: '3' })) : null,
    applies('otherPretax', { g }) && taxed ? labelled('Other before-tax a paycheck', moneyInput(v.otherPretax, y => up({ otherPretax: y }), { hint: 'Commuter, life' })) : null,
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
    { label: 'Savings rate', result: m.savingsRate, key: 'savingsRate' },
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
      labelled('Set aside for taxes', pctInput(v.setAside, x => set({ setAside: x }), { hint: String(Math.round(ctx.ref.defaults.taxSetAside * 100)), key: 'var:setAside' }), { note: 'Blank uses 25%' }),
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
          const both = (pre, roth) => up({ pretaxBalance: pre, rothBalance: roth, balance: pre == null && roth == null ? null : (pre ?? 0) + (roth ?? 0) });
          return h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap', justifyContent: 'flex-end' } },
            moneyInput(r.values.pretaxBalance, v => both(v, r.values.rothBalance ?? null), { hint: 'Pretax', key: `${r.id}:pre` }),
            moneyInput(r.values.rothBalance, v => both(r.values.pretaxBalance ?? null, v), { hint: 'Roth', key: `${r.id}:roth` }));
        }
        return moneyInput(r.values.balance, v => up({ balance: v }), { hint: 'Add balance', key: `${r.id}:balance` });
      } },
      { label: 'Kind', render: (ctx, r, m, up) => {
        if (r.kind === 'asset') return LOAN_FOR[r.type] ? loanCells(ctx, r) : h('span.muted', {}, r.type || 'Other');
        if (r.values.group === 'investment') return select(ref.lists.investmentTypes.filter(t => t !== 'HSA' || ctx.gates().hsa || r.type === 'HSA'), r.type, v => ctx.store.update(r.id, { type: v }), { label: 'Account type', width: 160, key: `${r.id}:type` });
        return toggle(['Checking', 'Savings or HYSA'], r.type, v => ctx.store.update(r.id, { type: v }), { label: 'Checking or savings' });
      } },
      owner,
    ],
    secondary: (ctx, r, up) => assetSecondary(ctx, r, up),
    tertiary: (ctx, r, up) => assetTertiary(ctx, r, up),
    coreFields: [],
    subtotal: (ctx, rows) => money(sum(rows, valOf)),
    footerTotal: (ctx, recs) => amount(ctx, recs.some(r => valOf(r) != null) ? sum(recs, valOf) : null),
    totals: (ctx, recs, m, cols) => [...cols.map(c => c.label === 'Account' ? h('td', {}, `${recs.length} ${recs.length === 1 ? 'item' : 'items'}`) : c.label === 'Balance' ? h('td.num', {}, amount(ctx, recs.some(r => valOf(r) != null) ? sum(recs, valOf) : null)) : h('td')), h('td'), h('td')],
    strip: (ctx, m) => summaryStrip(ctx, [
      { label: 'Total net worth', result: m.netWorth, key: 'netWorth' }, { label: 'Liquid net worth', result: m.liquidNetWorth },
      { label: 'Cash', result: m.inputs.cash === null ? needs('M41', ['cash']) : { id: 'M41', value: m.inputs.cash, needs: [], unit: 'money', text: `Checking, savings and other cash: ${money(m.inputs.cash)}.` } },
      { label: 'Rule of 5 cushion', result: m.ruleOf5 }]),
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
  if (v.group === 'cash') return [
    labelled('Institution', textInput(v.institution, x => up({ institution: x }), { hint: 'Bank', width: 160 })),
    labelled('Interest (APY)', pctInput(v.apy, x => up({ apy: x }), { hint: '0' }), { note: v.apy != null && v.apy < 0.01 && (v.balance ?? 0) > 1000 ? 'Idle cash: a small win to move it' : null }),
    labelled('Purpose', select(['Emergency', 'Sinking fund', 'Goal', 'General'], v.purpose ?? null, x => up({ purpose: x }), { label: 'Purpose', width: 150 }))];
  const age = ctx.metrics().inputs.age;
  const perYear = v.contribution == null ? null : v.contributionPer === 'Paycheck' ? v.contribution * 26 : v.contribution;
  const lim = limitUsed({ contributions: perYear, type: r.type, age: age ?? 30 }, ctx.ref);
  return [
    labelled('Institution', textInput(v.institution, x => up({ institution: x }), { hint: 'Broker', width: 160 })),
    labelled('Putting in', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, moneyInput(v.contribution, x => up({ contribution: x }), { hint: 'Add amount' }),
      toggle(['Paycheck', 'Year'], v.contributionPer ?? 'Year', x => up({ contributionPer: x }), { label: 'Per' }))),
    labelled('Pretax, Roth or both', toggle(['Pretax', 'Roth', 'Both'], v.taxType ?? null, x => up({ taxType: x }), { label: 'Pretax or Roth' })),
    labelled('Stocks %', pctInput(v.stockShare, x => up({ stockShare: x }), { hint: '90' }), { note: 'The rest in bonds' }),
    labelled('Unvested', moneyInput(v.unvested, x => up({ unvested: x }), { hint: 'Add amount' }), { note: 'Shown, not counted in net worth' }),
    lim.value !== null || lim.needs[0] !== 'an account type with a limit' ? labelled('Limit used', h('span.computed', {}, lim.value === null ? `Needs ${lim.needs[0]}` : value(lim))) : null];
}
function assetTertiary(ctx, r, up) {
  const g = ctx.gates();
  const v = r.values;
  if (r.kind !== 'account' || v.group !== 'investment') return [labelled('Coach notes', textInput(r.privateNote, x => up({ privateNote: x }), { hint: 'Add a private note', width: 320 }))];
  return [
    labelled('Holdings', textInput(v.holdings, x => up({ holdings: x }), { hint: 'VTSAX, target date 2060', width: 240 })),
    labelled('Fees a year', pctInput(v.fees, x => up({ fees: x }), { hint: '0.04' }), { note: 'Expense ratio plus advisory' }),
    applies('costBasis', { g, r }) ? labelled('Cost basis', moneyInput(v.costBasis, x => up({ costBasis: x }), { hint: 'Add amount' })) : null,
    applies('rothBasis', { g, r }) ? labelled('Roth contributions so far', moneyInput(v.rothBasis, x => up({ rothBasis: x }), { hint: 'Add amount' }), { note: 'Can come out any time' }) : null,
    applies('hsaInvested', { g, r }) ? labelled('HSA invested vs cash', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, moneyInput(v.hsaInvested, x => up({ hsaInvested: x }), { hint: 'Invested' }), moneyInput(v.hsaCash, x => up({ hsaCash: x }), { hint: 'Cash' }))) : null];
}

// ---------- Protection (Mockup: Protection › Coverage row) ----------
export function protectionList() {
  const types = ctx => PROTECTION_TYPES.filter(t => t !== 'Car' || ctx.gates().car !== false);
  return {
    kind: 'coverage', area: 'goals', title: 'Coverage', thing: { one: 'coverage', plural: 'coverage rows' }, defaultType: 'Health',
    filter: r => r.kind === 'coverage',
    picker: ctx => ({ top: types(ctx).slice(0, 4), other: types(ctx).slice(4) }),
    // The usual four in one click; mark Don't for a gap.
    headerExtra: ctx => (ctx.store.find(r => r.kind === 'coverage').length ? null : h('button.btn.small', { type: 'button', onclick: () => ctx.store.transaction('Add the usual coverage', () => {
      for (const t of types(ctx)) ctx.store.add('coverage', { name: null, values: {} }, { type: t });
    }) }, 'Add the usual list')),
    coreFields: ['have'],
    columns: [
      { label: 'Coverage', render: (ctx, r, m, up) => select(types(ctx), r.type, v => ctx.store.update(r.id, { type: v }), { label: 'Coverage type', width: 170, key: `${r.id}:type` }) },
      { label: 'Have it?', render: (ctx, r, m, up) => toggle(['Have it', "Don't", 'Not sure'], r.values.have ?? null, v => up({ have: v }), { label: 'Have it' }) },
      { label: 'Premium / mo', num: true, render: (ctx, r, m, up) => moneyInput(r.amount, v => up({ amount: v, per: 'month' }), { hint: 'Add premium', key: `${r.id}:amount` }) },
      owner,
    ],
    secondary: (ctx, r, up) => [
      labelled('Coverage amount', moneyInput(r.values.coverage, v => up({ coverage: v }), { hint: 'Add amount' })),
      labelled('Through employer?', toggle(['Yes', 'No'], r.values.employer ?? null, v => up({ employer: v }), { label: 'Through employer' }), { note: r.values.employer === 'Yes' ? 'Ends if the job ends' : null }),
      r.type === 'Health' ? labelled('Deductible and out-of-pocket max', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
        moneyInput(r.values.deductible, v => up({ deductible: v }), { hint: 'Deductible' }), moneyInput(r.values.oopMax, v => up({ oopMax: v }), { hint: 'OOP max' }))) : null],
    footerTotal: (ctx, recs) => amount(ctx, recs.some(r => r.amount != null) ? sum(recs, r => r.amount) : null),
    strip: (ctx) => {
      const recs = ctx.visible(r => r.kind === 'coverage');
      const gaps = recs.filter(r => r.values.have === "Don't");
      const unsure = recs.filter(r => r.values.have === 'Not sure');
      return h('div.strip', {},
        h('div.metric', {}, h('span.label', {}, 'Gaps to fill'), h('div.big', {}, String(gaps.length)), h('span.change', {}, gaps.map(r => r.type).join(', ') || 'None marked')),
        h('div.metric', {}, h('span.label', {}, 'Not sure yet'), h('div.big', {}, String(unsure.length)), h('span.change', {}, unsure.map(r => r.type).join(', ') || 'None')),
        h('div.metric', {}, h('span.label', {}, 'Premiums a month'), h('div.big', {}, amount(ctx, recs.some(r => r.amount != null) ? sum(recs, r => r.amount) : null))));
    },
  };
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
  const rates = taxRates({ gross, pretax, filingStatus: x.filingStatus, selfEmployed: se && taxed.every(i => i.taxType === '1099') }, ctx.ref);
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
    moreBlock('taxes:more', () => h('div.form-grid', {},
      labelled('Last year', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, toggle(['Refund', 'Owed'], p.lastYearTax ?? null, v => set({ lastYearTax: v }), { label: 'Refund or owed' }),
        moneyInput(p.lastYearAmount ?? null, v => set({ lastYearAmount: v }), { hint: 'Add amount', key: 'tax:lastYear' }))),
      applies('quarterly', { g, taxTypes: taxed.map(i => i.taxType) }) ? labelled('Quarterly estimates paid this year', moneyInput(p.quarterlyPaid ?? null, v => set({ quarterlyPaid: v }), { hint: 'Add amount', key: 'tax:quarterly' })) : null,
      applies('seTax', { g, taxTypes: taxed.map(i => i.taxType) }) ? labelled('Self-employment tax a year', h('span.computed', {}, seTax ? money(seTax.value) : 'Needs 1099 income')) : null)),
    h('p.muted', { style: { marginTop: '12px' } }, `Gross used: ${gross === null ? 'none yet (add take-home or gross on Income)' : `${money(gross)} a year`}. Federal and FICA only; state tax is not in yet.`)));
}

// ---------- Completion (R065): core is the Primary fields; full adds the detail that applies ----------
const done = (r, f) => countsAsDone(statusOf(r, f));
const FULL = {
  income: (r, g) => ['amount', 'payFrequency', 'incomeType', ...(g.employer ? ['contributionPct'] : [])],
  debt: r => ['balance', 'apr', 'payment', ...(r.type === 'Credit card' ? ['limit', 'dueDay'] : r.type === 'Student loan' ? ['federal'] : []), 'stress'],
  account: r => [r.values.taxType === 'Both' ? 'pretaxBalance' : 'balance', 'institution', ...(r.values.group === 'investment' ? ['taxType', 'contribution'] : ['apy'])],
  asset: r => ['value', ...(LOAN_FOR[r.type] ? ['financed'] : [])],
  coverage: r => ['have', 'amount', 'coverage'],
  benefit: () => ['amount', 'using'],
};
export function listCompletion(ctx, pred, core) {
  const g = ctx.gates();
  const recs = ctx.visible(pred);
  const c = { done: 0, of: 0 }, f = { done: 0, of: 0 };
  for (const r of recs) {
    const coreF = typeof core === 'function' ? core(r) : core;
    c.of += 1; if (coreF.every(x => done(r, x))) c.done += 1;
    const fullF = [...new Set([...coreF, ...(FULL[r.kind]?.(r, g) ?? [])])];
    f.of += fullF.length; f.done += fullF.filter(x => done(r, x)).length;
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
      let fed = 0, fc = 0, pre = 0, gross = 0;
      for (const i of taxed) {
        const t = takeHomeFromGross({ gross: i.gross, pretax: i.pretax, filingStatus: x.filingStatus, selfEmployed: i.taxType === '1099' }, ctx.ref);
        gross += i.gross; fed += t.federal.value; fc += t.fica.value; pre += i.pretax;
      }
      const steps = [['Gross', gross / 12], ['Federal tax', -fed / 12], ['FICA', -fc / 12], ['Before-tax', -pre / 12]];
      return { steps, takeHome: (gross - fed - fc - pre) / 12 };
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
