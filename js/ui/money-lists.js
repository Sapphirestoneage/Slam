// SPDX-License-Identifier: AGPL-3.0-only
// My Money lists (build phase 5, Mockup: Income, Assets, Protection, Taxes): one record type, viewed by sub-tab.
// Detail stays behind More (R023); fields that do not apply to this household never show (gates.js).
import { h } from './dom.js';
import { INCOME_KINDS, incomeKindOf } from '../capture.js';
import { institutionPicker, institutionLink } from './institutions-ui.js';
import { popover, closePop, tapPick, fromButton, amount, value, moneyInput, pctInput, textInput, nameInput, perPicker, toggle, select, labelled, summaryStrip, moreBlock, button, toast, metricCard, confirmBox, warnTag, parkProfile, park, parkGroup, ownerToggle, openBlock } from './staples.js';
import { asksTaxType, taxTypeFor } from '../math/portfolio.js';
import { notesHidden } from '../privacy.js';
import { modeOf } from '../registry/couples.js';
import { applies, recordFor, REAL_TYPES, PROTECTION_TYPES, LOAN_FOR } from '../gates.js';
import { incomeRow, taxRates, takeHomeFromGross, fica, variableSafeBudget, monthlyFrom, isBenefitRow, householdRates, quarterlySetAside, irregularPlan, tipsDeductionOf, stateTaxLine } from '../math/income.js';
import { foo } from '../math/foo.js';
import { raiseOf } from '../math/raise.js';
import { RULES } from '../registry/assumptions.js';
import { limitUsed } from '../math/assets.js';
import { accountBlocks, accountFlags, stampBalance } from './account-detail.js';
import { is401k, yearly401k } from './account-specific.js';
import { netWorthCheck, yearlyContribution, link401k, contributionFromMonthly } from '../math/portfolio.js';
import { benefitYearly, withholdingFlag } from '../benefits.js';
import { lifeAdminItems, lifeAdminPatch, LIFE_STATES } from '../lifeadmin.js';
import { drafttShares, DRAFTT, drafttName } from '../math/spending.js';
import { needs } from '../math/result.js';
import { statusOf, countsAsDone } from '../records.js';
import { money, pct } from '../format.js';
import { workBlock, platformBlock, seasonsFill } from './earnings-ui.js';
import { workLine } from '../math/earnings.js';

const sum = (list, f) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const short = v => (Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : money(v));
const owner = { label: 'Owner', couple: true, render: (ctx, r, m, up) => ownerToggle(ctx, r, up) }; // F2: the people's names; a retirement account is one person's
const num = x => (x === null ? null : Number(x));
// "I'll find it later" on one field of a row (Brandon B1.2): the field's own status, shown on the Homework list.
const L = (ctx, r, field) => ({ on: r.fieldStatus?.[field] === 'Will email', set: on => ctx.store.setFieldStatus(r.id, field, on ? 'Will email' : null), key: `${r.id}:${field}` }); // batch 13: the key gives the box a handle, so Show me lands on it
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
    picker: ctx => ({ top: ctx.gates().betweenJobs ? ['Unemployment', 'Job', 'Side hustle', 'Benefits'] : ctx.gates().variable ? ['Job', 'Self-employed', 'Platform', 'Side hustle', 'Unemployment'] : ['Job', 'Unemployment', 'Side hustle', 'Benefits', 'Rental'],
      other: ['Partner job', 'Money from family', 'Self-employed', 'Platform', 'Rental'] }), // batch 27: Platform (OnlyFans, Etsy, Uber and the rest)
    newValues: type => (type === 'Unemployment' ? { name: 'Unemployment benefits', per: 'week', values: { payFrequency: 'week' } } // batch 15: weekly
      : type === 'Platform' ? { per: 'month', values: { payFrequency: 'week' } } : {}),
    coreFields: ['amount'],
    focus: ['Source', 'Amount', 'Given as', 'Per', 'Pay frequency'], // session 1: take-home or gross, and how often
    columns: [
      { label: 'Source', render: (ctx, r, m, up) => { // batch 13: a long name wraps
        const name = nameInput(r.name, v => up({ name: v }), { hint: r.type || 'Add name', tip: r.type, width: 170, key: `${r.id}:name` });
        const line = WORK_TYPES.has(r.type) ? workRowLink(r, incomeRowOf(m, r)) : null; // batch 35: tips and shifts in one line on the row
        return line ? h('span.stack.inst-cell', { style: { gap: '2px' } }, name, line) : name;
      } },
      { label: 'Amount', num: true, render: (ctx, r, m, up) => (r.values.basis === 'Both' && incomeRowOf(m, r)?.taxType
        ? h('span.row-line', { style: { gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' } }, // Brandon B1.6: both typed, both kept (batch 13: stacked when the row is tight)
          moneyInput(r.amount, v => up({ amount: v }), { hint: 'Take-home', key: `${r.id}:amount` }), yearBox(moneyInput(r.values.gross, v => up({ gross: v }), { hint: 'Gross a year', key: `${r.id}:gross` })))
        : moneyInput(r.amount, v => up({ amount: v }), { hint: isBenefitRow(r) ? 'Add a week' : r.type === 'Platform' ? 'Add gross' : r.values.basis === 'Gross' ? 'Add gross' : r.amount == null && r.values.payShift != null ? 'From shifts' : 'Add take-home', key: `${r.id}:amount` })) },
      { label: 'Given as', render: (ctx, r, m, up) => (r.type === 'Platform' ? h('span.muted', { title: 'What fans, buyers or riders paid, before the platform takes its fee' }, 'Before fees') // batch 27
        : incomeRowOf(m, r)?.taxType
        ? toggle(['Take-home', 'Gross', 'Both'], r.values.basis ?? 'Take-home', v => up({ basis: v }), { label: 'Given as' })
        : h('span.muted', { title: 'Counted as it lands; no tax worked out' }, 'As it lands')) },
      { label: 'Per', render: (ctx, r, m, up) => perPicker(r.per, v => up({ per: v }), { key: `${r.id}:per` }) },
      { label: 'Pay frequency', render: (ctx, r, m, up) => select(FREQ.map(([k, t]) => [k, t.replace(/ \(.*\)$/, '')]), r.values.payFrequency ?? null, v => up({ payFrequency: v }), { label: 'Pay frequency', hint: 'How often', width: 156, key: `${r.id}:payFrequency` }) }, // batch 13: the short names fit
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
// Batch 33 (finding 27): with Given as Both, Per names the take-home's period; the gross box says it is a year.
const yearBox = box => { box.append(h('span.post', { title: 'Gross a year' }, '/yr')); box.title = 'Gross a year, before tax'; return box; };
// Unemployment benefits (batch 15, item 13): the weekly amount in a tap (NY's most is registered), when they started
// and end (a tap for 26 weeks from the start), and the 10% withholding choice. Taxed on Taxes, no FICA.
const dateBox = (value, onChange, label) => { const d = h('input', { type: 'date', value: value || '', 'aria-label': label }); d.onchange = () => onChange(d.value || null); return h(`label.field${value ? '.filled' : ''}`, { style: { width: '170px' } }, d); };
const addWeeks = (iso, w) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + w * 7 - 1); return d.toISOString().slice(0, 10); };
function benefitSecondary(ctx, r, up) {
  const v = r.values, ref = ctx.ref, max = ref.limits.unemployment.NY.maxWeekly, weeks = ref.limits.unemployment.NY.weeks;
  const x = incomeRowOf(ctx.metrics(), r);
  const weekly = r.per === 'week' ? r.amount : null;
  const amounts = [[String(max), `$${max} (NY most)`], ['600', '$600'], ['450', '$450']];
  const wide = el => { el.style.gridColumn = 'span 2'; return el; }; // the chips and a box, or a date and a tap, need two columns
  return [
    wide(labelled('A week', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
      toggle(amounts, weekly == null ? null : String(weekly), y => up({ amount: Number(y), per: 'week' }), { label: 'Weekly benefit' }),
      moneyInput(weekly, y => up({ amount: y, per: 'week' }), { hint: 'Other', key: `${r.id}:weekly`, width: 100 })), { tip: `NY pays at most $${max} a week (claims from Oct 2025)` })),
    labelled('Started', dateBox(v.benefitStart, y => up({ benefitStart: y }), 'Benefits started')),
    wide(labelled('Ends', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, dateBox(v.benefitEnd, y => up({ benefitEnd: y }), 'Benefits end'),
      v.benefitStart ? button(`${weeks} weeks from start`, { size: 'small', onClick: () => up({ benefitEnd: addWeeks(v.benefitStart, weeks) }) }) : null), { tip: 'After this date the benefits drop out of every projection' })),
    labelled('Withhold 10% for federal tax', toggle(['Yes', 'No'], v.withhold ?? 'No', y => up({ withhold: y }), { label: 'Withhold 10%' }), { tip: 'Form W-4V. With No, the tax is due when you file (see Taxes)' }),
    x?.tax ? wide(labelled('Tax on it this year', h('span.computed', { title: 'Federal and state income tax; no Social Security or Medicare' }, `${money(x.tax.total)}${x.due > 0.5 ? (x.withheld ? `, ${money(x.due)} due when you file` : ', all due when you file') : ''}`))) : null,
    labelled('Coach notes', textInput(r.privateNote, y => up({ privateNote: y }), { hint: 'Add a private note', width: 320 }))];
}
const WORK_TYPES = new Set(['Job', 'Partner job', 'Side hustle', 'Self-employed']); // batch 27: rows that can have tips and shifts
// Batch 35: a Job row with tips or shifts says them on the row ("$260 a shift after tip-out · 3 shifts a week"); a tap
// opens the row's Details with Tips and shifts open. The words are js/math/earnings.js workLine.
function workRowLink(r, x) {
  const text = x?.work?.any ? workLine(x.work, x.cash, x.takeHome?.value) : null;
  if (!text) return null;
  const block = `income:work:${r.id}`;
  return h('button.inst-link.work-line', { type: 'button', 'data-focus': `${r.id}:workLine`, title: 'Open Tips and shifts', onclick: e => {
    openBlock(block);
    const caret = e.currentTarget.closest('tr')?.querySelector('td.col-actions button.caret');
    if (caret?.getAttribute('aria-expanded') === 'false') { caret.click(); return; }
    const inner = document.querySelector(`[data-focus="more:${CSS.escape(block)}"]`);
    if (inner?.getAttribute('aria-expanded') === 'false') inner.click();
    inner?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  } }, text);
}
function incomeSecondary(ctx, r, up) {
  if (isBenefitRow(r)) return benefitSecondary(ctx, r, up);
  const g = ctx.gates();
  const link = link401k(ctx.visible(() => true)); // B3.10: blank here borrows from the 401(k)
  const m = ctx.metrics();
  const x = incomeRowOf(m, r);
  const v = r.values;
  if (r.type === 'Platform') return [...platformBlock(ctx, r, up, x), // batch 27: a platform's fee, hold and chargebacks; the payout schedule is Pay frequency
    labelled(v.payFrequency === 'twice a month' ? 'Payout days' : v.payFrequency === 'month' ? 'Payout day' : 'Next payout', paydays(r, up), { note: 'Lands on the calendar after the hold' }),
    labelled('Type', select(['1099', 'Business', 'Side hustle', 'Other'], v.incomeType ?? null, y => up({ incomeType: y }), { label: 'Income type', hint: x?.taxType ?? 'Pick one', width: 150 }))];
  const other = x?.computed === 'gross' ? labelled('Gross a year (worked out)', h('span.computed', {}, value(x.grossResult, ctx)))
    : x?.computed === 'takeHome' ? labelled('Take-home a month (worked out)', h('span.computed', {}, value(x.takeHome, ctx)))
      : x?.taxType && v.basis !== 'Both' ? labelled('Gross a year', moneyInput(v.gross, y => up({ gross: y }), { hint: 'Add gross' }), { note: 'Both given: kept as typed', later: L(ctx, r, 'gross') }) : null;
  // Batch 33 (QUESTIONS 288): a raise in one tap. +3%, +5%, +10% or a typed %: the new gross and take-home from the tax math.
  const raise = x?.taxType && !['Rental', 'Platform'].includes(r.type) ? raiseTaps(ctx, r, up) : null; // with no pay yet, a tap says what it needs (Find's raise lands here)
  const incomeKind = labelled('Income type', tapPick(INCOME_KINDS, v.incomeKind ?? null, x => up({ incomeKind: x }), { label: 'Income type', key: `${r.id}:incomeKind` }), { note: `Blank reads as ${incomeKindOf(r)} from the row's type` }); // F6
  return [WORK_TYPES.has(r.type) ? workBlock(ctx, r, up, x) : null, other, raise, incomeKind,
    labelled(v.payFrequency === 'twice a month' ? 'Paydays' : v.payFrequency === 'month' ? 'Payday' : 'Next payday', paydays(r, up),
      { note: 'Puts each paycheck on its day in the calendar', later: L(ctx, r, v.payFrequency === 'week' || v.payFrequency === '2 weeks' ? 'nextPayday' : 'paydays') }),
    labelled('Type', select(['W-2', '1099', 'Business', 'Side hustle', 'Rental', 'Benefits', 'Other'], v.incomeType ?? null, y => up({ incomeType: y }), { label: 'Income type', hint: x?.taxType ?? 'Pick one', width: 150 }), { later: L(ctx, r, 'incomeType') }),
    // The 401(k), first pass (Income): dollars a paycheck and whether there is a match. The detail lives on the 401(k).
    applies('401k', { g }) && x?.taxType ? k401FirstPass(ctx, r, up, link) : null,
    labelled('Bonus: $ and month', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, moneyInput(v.bonus, y => up({ bonus: y }), { hint: 'Bonus', key: `${r.id}:bonus` }),
      select(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], v.bonusMonth ?? null, y => up({ bonusMonth: y }), { label: 'Bonus month', hint: 'Month', width: 100 })), { later: L(ctx, r, 'bonus') }),
    // The Health coverage row owns the premium; Income borrows it (answer to Brandon question 71).
    applies('premium', { g }) && x?.taxType ? (m.inputs.health
      ? labelled('Health premium a paycheck', m.inputs.health.jobId === r.id && m.inputs.health.fromPay
        ? fromButton('From Health', '#/net-worth/protection', m.inputs.health.id, { value: money(m.inputs.health.perPaycheck) })
        : fromButton(m.inputs.health.fromPay ? 'From Health, on your main job' : 'From Health, paid as a Budget line', '#/net-worth/protection', m.inputs.health.id), { note: 'Comes out of take-home once' })
      : labelled('Health premium a paycheck', moneyInput(v.premium, y => up({ premium: y }), { hint: 'Add premium', width: 150 }), { note: 'Or add Health on Protection; it fills this in', later: L(ctx, r, 'premium') })) : null,
    labelled('Perks', button('Add other benefit', { iconName: 'plus', onClick: () => { ctx.store.add('benefit', { name: null, values: {} }, { type: 'Benefit' }); toast('Benefit row added under Other benefits.'); } }))];
}
function raiseTaps(ctx, r, up) {
  const go = pct => {
    const o = raiseOf(ctx.store.doc, ctx.ref, r.id, pct, { now: ctx.now() });
    if (!o) { toast('A raise needs the pay first: type the take-home or the gross.'); return; }
    const p = `${+(pct * 100).toFixed(2)}%`;
    // A worked-out take-home is Roughly until a pay stub says otherwise (Q288); a typed gross raised by a % stays as it was.
    ctx.store.transaction(`Raise ${p}: take-home ${money(o.takeHomeAfter)} a month (was ${money(o.takeHomeBefore)}), gross ${money(o.grossAfter)} a year`, () => up({ ...o.patch, ...(o.basis === 'Gross' ? {} : { status: 'Roughly' }) }));
  };
  const box = pctInput(null, y => { if (y > 0) go(y); }, { hint: 'Other', key: `${r.id}:raisePct` });
  box.style.width = '92px';
  const wide = labelled('A raise', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
    ...[0.03, 0.05, 0.1].map((p, i) => { const b = button(`+${p * 100}%`, { size: 'small', tip: `Gross up ${p * 100}%; the take-home is worked out with the tax math`, onClick: () => go(p) }); if (!i) b.dataset.focus = `${r.id}:raise`; return b; }), box),
  { tip: 'Each tap raises the gross and works out the new take-home with the tax math. Undo puts it back' });
  wide.classList.add('raise-taps'); // two columns wide beside the others; one on a phone (css/phases.css)
  return wide;
}
// Income's first pass at the 401(k): what comes out each paycheck, and is there a match. Roth or traditional, % of
// salary, match tiers and vesting are on the 401(k) under Net worth › Assets; the two fill each other in.
function k401FirstPass(ctx, r, up, link) {
  const v = r.values;
  const mine = link.job?.id === r.id;
  const perPaycheck = v.k401Paycheck ?? (mine ? link.incomePerPaycheck : null);
  const fromAcct = mine && link.incomePerPaycheckFrom;
  const x = incomeRowOf(ctx.metrics(), r);
  const n = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 }[v.payFrequency] ?? null;
  const olderPct = v.contributionPct != null && v.k401Paycheck == null; // files from before: a % of pay
  const tiers = mine ? link.incomeTiers : [];
  const hasMatch = tiers.length ? 'Yes' : v.hasMatch ?? null;
  const acct = mine ? link.acct : null;
  // Batch 33 (QUESTIONS 291): with an all-accounts total on file, the 401(k) is split out of it (the total stays right)
  // instead of added empty beside it (which locked the FI date until its balance was in).
  const lump = acct ? null : ctx.store.find(x => x.kind === 'account' && x.type === 'All investments' && (x.values.balance ?? 0) > 0)[0] ?? null;
  const details = acct ? fromButton('401(k) details', '#/net-worth/assets', acct.id)
    : lump ? button('Is part of this a 401(k)? Split it out', { size: 'small', iconName: 'plus', tip: `Moves part of ${lump.name || 'the investments total'} into a 401(k) row; the total stays ${money(lump.values.balance)}`, onClick: e => splitPop(ctx, lump, e.currentTarget) })
    : button('Add your 401(k) for the details', { size: 'small', iconName: 'plus', onClick: () => {
      ctx.store.add('account', { name: '401(k)', values: { group: 'investment' } }, { type: '401(k)' });
      toast('401(k) added under Net worth › Assets. What you typed here shows there.', { action: { label: 'Go there', run: () => location.hash = '#/net-worth/assets' } });
    } });
  return h('div.stack.k401-first', { style: { gap: '8px' } },
    h('span.row-line', { style: { gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' } }, // batch 13: boxes level at the top; wraps instead of running off the page
      labelled('401(k) a paycheck', moneyInput(olderPct ? null : perPaycheck, y => up({ k401Paycheck: y, contributionPct: null }), {
        hint: 'Add amount' }),
      { note: fromAcct ? 'From your 401(k)' : olderPct ? `Set as ${pct(v.contributionPct)} of pay${x?.gross && n ? ` (about ${money(x.gross * v.contributionPct / n)})` : ''}; type dollars to replace it` : 'Pay stub: 401(k) line', later: L(ctx, r, 'k401Paycheck') }),
      labelled('Employer match?', link.incomeTiersFrom && tiers.length
        ? h('span.computed', { title: 'Set on your 401(k)' }, tiers.map((t, i) => `${pct(t.rate)} of the ${i ? 'next' : 'first'} ${pct(t.upTo)}`).join(', '))
        : h('div.stack', { style: { gap: '6px' } },
          toggle(['Yes', 'No', "Don't know"], hasMatch, y => up({ hasMatch: y, ...(y === 'Yes' ? {} : { matchPct: null, matchCapPct: null }) }), { label: 'Employer match', clearable: true }),
          // Batch 20 (Rocket Surgery): how much, in one tap (the usual formulas). It used to say "Add how much on the
          // 401(k)", whose button added an empty 401(k) that dropped the Picture and locked the FI date.
          hasMatch === 'Yes' ? matchPicks(ctx, r, v, up) : null),
      { note: link.incomeTiersFrom && tiers.length ? 'From your 401(k)' : hasMatch === 'Yes' && !tiers.length ? 'Tap how much; other formulas on the 401(k)' : null, later: L(ctx, r, 'hasMatch') }),
      labelled('The rest', details, { note: 'Roth or traditional, % of salary, match, vesting' })));
}
function splitPop(ctx, lump, anchor) {
  const total = lump.values.balance;
  const go = part => {
    if (!(part > 0)) return;
    const take = Math.min(part, total);
    closePop();
    ctx.store.transaction('Split out the 401(k)', () => {
      ctx.store.add('account', { name: '401(k)', status: lump.status ?? null, values: { group: 'investment', balance: take } }, { type: '401(k)' });
      if (take >= total) ctx.store.remove([lump.id]); else ctx.store.update(lump.id, { balance: Math.round((total - take) * 100) / 100 });
    });
    toast(`${money(take)} of ${lump.name || 'the investments total'} is now your 401(k); invested is still ${money(total)}.`, { undo: () => ctx.store.undo(), action: { label: 'Go there', run: () => location.hash = '#/net-worth/assets' } });
  };
  popover(anchor, h('div.stack', { style: { gap: '8px' } }, h('strong', {}, `How much of the ${money(total)} is the 401(k)?`),
    h('span.row-line', { style: { gap: '6px', flexWrap: 'wrap' } }, button(`All of it, ${money(total)}`, { size: 'small', onClick: () => go(total) }), button(`Half, ${money(total / 2)}`, { size: 'small', onClick: () => go(total / 2) }),
      moneyInput(null, v => go(v), { hint: 'Other', key: 'split401k', width: 120 })),
    h('span.muted.small', {}, 'The rest stays in the total; the 401(k) row gets its own balance.')), { width: 340 });
}
// The usual match formulas as taps (data/reference-2026.json lists.matchPicks); the pick is the job row's first tier.
function matchPicks(ctx, r, v, up) {
  const picks = ctx.ref.lists?.matchPicks || [];
  if (!picks.length) return null;
  const now = v.matchPct != null && v.matchCapPct != null ? `${v.matchPct}|${v.matchCapPct}` : null;
  return tapPick(picks.map(p => [`${p.rate}|${p.upTo}`, p.label]), now, y => { const [rate, upTo] = y ? y.split('|').map(Number) : [null, null]; up({ matchPct: rate, matchCapPct: upTo }); },
    { label: 'How much the employer matches', key: `${r.id}:matchPick` });
}
function incomeTertiary(ctx, r, up) {
  if (isBenefitRow(r)) return [];
  const g = ctx.gates();
  const v = r.values;
  const taxed = !!incomeRowOf(ctx.metrics(), r)?.taxType && r.type !== 'Platform'; // batch 27: a platform pays no paycheck, so nothing comes out of one
  return [
    applies('hsaFsa', { g }) && taxed ? labelled(`${g.hsa ? 'HSA' : 'FSA'} a paycheck`, moneyInput(v.hsaFsa, y => up({ hsaFsa: y }), { hint: 'Add amount' }), { later: L(ctx, r, 'hsaFsa') }) : null,
    applies('equity', { g }) && taxed ? labelled('ESPP % and discount; RSUs', textInput(v.equity, y => up({ equity: y }), { hint: 'e.g. 10%, 15% off; 200 RSUs vest Mar', width: 320 }), { later: L(ctx, r, 'equity') }) : null,
    taxed ? labelled('Raise % a year', pctInput(v.raisePct, y => up({ raisePct: y }), { hint: 'e.g. 3' }), { later: L(ctx, r, 'raisePct') }) : null,
    applies('otherPretax', { g }) && taxed ? labelled('Other before-tax a paycheck', moneyInput(v.otherPretax, y => up({ otherPretax: y }), { hint: 'Commuter, life', width: 150 }), { later: L(ctx, r, 'otherPretax') }) : null,
    labelled('Coach notes', textInput(r.privateNote, y => up({ privateNote: y }), { hint: 'Add a private note', width: 320 }))];
}
function incomeStrip(ctx, m) {
  const x = m.inputs;
  const taxed = x.income.filter(i => i.taxType && i.gross !== null);
  const gross = taxed.length ? { id: 'M13', value: sum(taxed, i => i.gross + (i.grossExtra ?? 0)), needs: [], unit: 'money', text: taxed.map(i => `${i.r.name || i.r.type} ${money(i.gross)} a year${i.computed === 'gross' ? ' (worked out from take-home)' : ''}${i.grossExtra ? ` plus ${money(i.grossExtra)} in cash tips after the tip-out` : ''}`).join(' + ') + '.' } // batch 27: cash tips are income before tax too
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
  // Batch 15, item 3: blank set-aside uses this client's own rate on self-employment income (SE tax in), else 25%.
  const own = quarterlySetAside(ctx.metrics().inputs.householdTax, ctx.ref)?.rate ?? null;
  const rate = v.setAside ?? own ?? null;
  const safe = variableSafeBudget({ lowestMonth: v.lowest ?? null, typicalMonth: v.typical ?? null, setAside: rate }, ctx.ref);
  const plan = irregularPlan({ lowestMonth: v.lowest ?? null, typicalMonth: v.typical ?? null, months: v.months ?? null, setAside: rate }, ctx.ref);
  const step = (() => { try { const f = foo(ctx.store.doc, ctx.ref, { now: ctx.now() }); const s1 = f.steps.find(x => x.id === f.here); return s1 ? s1.name : null; } catch { return null; } })();
  return h('section.section.area-income', {}, h('div.section-title', {}, h('h2', {}, 'Variable income')),
    h('div.card', {}, h('div.form-grid', {},
      labelled('Last 12 months total', moneyInput(v.last12, x => set({ last12: x }), { hint: 'Add total', key: 'var:last12' })),
      labelled('Typical month', moneyInput(v.typical, x => set({ typical: x }), { hint: 'Add amount', key: 'var:typical' })),
      labelled('Lowest month', moneyInput(v.lowest, x => set({ lowest: x }), { hint: 'Add amount', key: 'var:lowest' }), { note: 'Drives the safe budget' }),
      labelled('Set aside for taxes', pctInput(v.setAside, x => set({ setAside: x }), { hint: String(Math.round((own ?? ctx.ref.defaults.taxSetAside) * 100)), key: 'var:setAside' }), { note: own != null ? `Blank uses your rate, ${Math.round(own * 100)}%` : 'Blank uses 25%' }),
      metricCard(ctx, 'Safe to count on a month', safe)),
    seasonsFill(ctx, set), // batch 27: the shifts' slow and busy months fill the months below in one tap
    // Batch 15, item 11: base month and good month (YNAB: live on what you can count on).
    plan.value != null ? h('div.irregular-plan', { style: { marginTop: '12px' } },
      h('div.row-line', { style: { gap: '24px', flexWrap: 'wrap' } },
        h('span.stack', {}, h('span.label', {}, 'Base month'), h('strong', {}, money(plan.base)), h('span.muted.small', {}, 'Budget your bills on this')),
        h('span.stack', {}, h('span.label', {}, 'A good month adds'), h('strong', {}, money(plan.extra)), h('span.muted.small', {}, step ? `The extra goes to your next step: ${step}` : 'The extra goes down your order of operations')),
        h('span.stack', {}, h('span.label', {}, 'Lean-season fund'), h('strong', {}, value(plan, ctx)), h('span.muted.small', {}, plan.fromMonths ? 'From your twelve months' : `${RULES.leanSeasonMonths} months of the swing`))),
      h('p.muted.small', { style: { margin: '6px 0 0' } }, 'The rule: live on the base month. When a month comes in above it, the extra fills the lean-season fund first, then the next step in your order.')) : null,
    moreBlock('income:variable', () => h('div', {},
      h('div.form-grid', {}, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((mo, i) =>
        labelled(mo, moneyInput(v.months?.[i] ?? null, x => { const ms = [...(v.months || Array(12).fill(null))]; ms[i] = x; set({ months: ms }); }, { hint: '–', key: `var:m${i}` })))),
      h('div.form-grid', { style: { marginTop: '12px' } }, labelled('Business expenses a month', moneyInput(v.business, x => set({ business: x }), { hint: 'Add amount', key: 'var:business' }), { note: 'Keeps business and personal apart' }))))));
}

// ---------- Assets (car loans and mortgages are the same records as on Debt, R049) ----------
const groupOf = r => (r.kind === 'asset' ? 'Home or car' : r.values.group === 'investment' ? 'Investments' : 'Cash');
const valOf = r => (r.kind === 'asset' ? r.values.value : r.values.balance);
const forTaxes = (m, r) => !!m?.inputs.accounts.find(a => a.id === r.id)?.forTaxes; // batch 27: the metrics mark money set aside for taxes
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
  const t = h('span.row-line.loan-cells', { style: { gap: '6px', flexWrap: 'wrap' } }, // batch 13: wraps on a phone instead of squeezing the boxes
    toggle(['Paid off', 'Financed'], financed ? 'Financed' : a.values.financed ?? null, v => setFinanced(ctx, a, v, t), { label: `${a.type}: paid off or financed`, key: `${a.id}:financed` }));
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
      // Batch 11 (items 5e, 5f): the name wraps instead of clipping; the institution is a small Add bank link under it.
      { label: 'Account', render: (ctx, r, m, up) => h('span.stack.inst-cell', { style: { gap: '2px' } }, nameInput(r.name, v => up({ name: v }), { hint: r.kind === 'account' ? 'Nickname (optional)' : r.type || 'Add name', tip: r.type, width: 190, key: `${r.id}:name` }), r.kind === 'account' ? institutionLink(ctx, r, up) : null) },
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
        if (r.values.group === 'investment') return select(ref.lists.investmentTypes.filter(t => t !== 'HSA' || ctx.gates().hsa || r.type === 'HSA'), r.type, v => ctx.store.update(r.id, { type: v }), { label: 'Account type', width: 180, key: `${r.id}:type` });
        return select(ref.lists.cashTypes, r.type, v => ctx.store.update(r.id, { type: v }), { label: 'Account type', width: 180, key: `${r.id}:type` }); // B2.18: the kind of account, apart from the bank
      } },
      // Focus mode only: what goes in each month, typed as a month and saved in the cadence it was entered in (answer 91).
      { label: 'Added monthly', num: true, focusOnly: true, render: (ctx, r, m, up) => { // item 18
        if (r.kind !== 'account' || r.values.group !== 'investment') return null;
        const per = yearlyContribution(r.values, m?.inputs.payFrequency ?? null);
        return moneyInput(per == null ? null : Math.round(per / 12 * 100) / 100, v => up(contributionFromMonthly(v, r.values, m?.inputs.payFrequency ?? null)), { hint: 'Add amount', key: `${r.id}:month-in` });
      } },
      owner,
    ],
    secondary: (ctx, r, up) => assetSecondary(ctx, r, up),
    tertiary: (ctx, r, up) => assetTertiary(ctx, r, up),
    coreFields: [],
    focus: ['Account', 'Balance', 'Kind', 'Added monthly'], // session 1: type, balance, monthly contribution
    // Batch 35: the Cash subtotal leaves out money set aside for taxes (Purpose: Taxes), as the Cash strip does; it shows
    // as its own line under the group.
    subtotal: (ctx, rows, m) => amount(ctx, sum(rows.filter(r => !forTaxes(m, r)), valOf), { chip: false }), // item 16: one unit per table
    groupFoot: (ctx, g, rows, m) => {
      const kept = rows.filter(r => forTaxes(m, r));
      if (g !== 'Cash' || !kept.length) return null;
      return h('span.muted.small', { title: 'Purpose: Taxes. It counts in net worth, and stays out of the Cash total, the cash layers (little e, big e) and the runway because it is already owed' },
        `Set aside for taxes: ${money(sum(kept, valOf))}, owed, so not in the Cash total above`);
    },
    footerTotal: (ctx, recs) => amount(ctx, recs.some(r => valOf(r) != null) ? sum(recs, valOf) : null),
    totals: (ctx, recs, m, cols) => [...cols.map(c => c.label === 'Account' ? h('td', {}, `${recs.length} ${recs.length === 1 ? 'item' : 'items'}`) : c.label === 'Balance' ? h('td.num', {}, amount(ctx, recs.some(r => valOf(r) != null) ? sum(recs, valOf) : null)) : h('td')), h('td'), h('td')],
    strip: (ctx, m) => h('div', {}, summaryStrip(ctx, [
      // Total and liquid net worth sit in the Net worth headline above.
      { label: 'Cash', result: m.inputs.cash === null ? needs('M41', ['cash']) : { id: 'M41', value: m.inputs.cash, needs: [], unit: 'money', text: `Checking, savings and other cash: ${money(m.inputs.cash)}.${m.inputs.taxSetAside ? ` The ${money(m.inputs.taxSetAside)} set aside for taxes is not in it: it is owed.` : ''}` } },
      m.inputs.taxSetAside ? { label: 'Set aside for taxes', tip: 'Quarterly tax money (Purpose: Taxes). In net worth, not in emergency cash or big e', result: { id: 'M41', value: m.inputs.taxSetAside, needs: [], unit: 'money', text: `Accounts with Purpose: Taxes hold ${money(m.inputs.taxSetAside)}. It counts in net worth and stays out of the cash layers (big e, little e) and the runway, because it is already owed.` } } : null,
      { label: 'Job-loss fund target (big e)', tip: 'The Rule of 5: about one month of spending for every 5 years of age, kept in cash for a job loss', result: m.ruleOf5 }].filter(Boolean)), assetChecks(ctx, m)),
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
    return notesHidden(r, ctx.audience?.() ?? { who: 'coach', person: 'all' }, modeOf(ctx.store.doc.profile)) ? [] : [labelled('Notes', textInput(r.notes, x => up({ notes: x }), { hint: 'What it is', width: 300 }))]; // batch 28: a note this viewer may not see has no box (typing would write over it)
  }
  const later = f => L(ctx, r, f);
  if (v.group === 'cash') return [ // the institution is the row's picker (batch 7, item 3); the typed box is gone
    labelled(v.yieldKind === '7-day yield' ? '7-day yield' : 'Interest (APY)', h('span.row-line', { style: { gap: '6px', flexWrap: 'wrap' } },
      pctInput(v.apy, x => up({ apy: x }), { hint: 'e.g. 4.2' }), toggle(['APY', '7-day yield'], v.yieldKind ?? 'APY', x => up({ yieldKind: x }), { label: 'APY or 7-day yield' })),
    { note: v.apy != null && v.apy < 0.01 && (v.balance ?? 0) > 1000 ? 'Idle cash: a small win to move it' : r.type === 'Money market' ? 'Money market funds show a 7-day yield' : null, later: later('apy') }),
    labelled('Purpose', tapPick(['Emergency', 'Sinking fund', 'Goal', 'Taxes', 'General'], v.purpose ?? null, x => up({ purpose: x }), { label: 'Purpose' }),
      { note: v.purpose === 'Taxes' ? 'Owed money: kept out of your emergency cash' : null, tip: 'Taxes: quarterly tax money set aside. It stays in net worth but never counts as emergency cash' }),
    // Batch 27: cash at home or in a safe counts as cash, with one calm line on the risk.
    r.type === 'Cash on hand' ? (el => { el.classList.add('wide'); return el; })(h('div.stack', {}, h('span.label', {}, 'Cash at home'), h('span.muted.small', {}, 'Counts as cash you can reach. Nothing insures it, so a fire, a loss or a theft is the risk; a safe or a second spot lowers it.'))) : null];
  const age = ctx.metrics().inputs.age;
  const freq = ctx.metrics().inputs.income.find(x => x.r.values.payFrequency)?.r.values.payFrequency ?? null;
  const perYear = is401k(r) ? yearly401k(ctx, r) : yearlyContribution(v, freq); // B2.14: real paychecks a year, not 26
  const employerHsa = r.type === 'HSA' ? benefitYearly(ctx.store.doc.profile.benefits?.employerHsa, freq) : null; // M2.3: the employer's dollars count too
  const counted = employerHsa == null ? perYear : (perYear ?? 0) + employerHsa;
  const lim = limitUsed({ contributions: counted, type: r.type, age: age ?? 30 }, ctx.ref);
  // Batch 7, item 5: only a type whose name does not say gets the Pretax or Roth question; an IRA shows its answer;
  // a Brokerage, Crypto or 529 is never asked. Unvested is a workplace-plan thing, so it stays on those types only.
  const known = taxTypeFor(r.type);
  return [
    is401k(r) ? null : labelled('Putting in', h('span.row-line', { style: { gap: '6px', flexWrap: 'wrap' } }, moneyInput(v.contribution, x => up({ contribution: x }), { hint: 'Add amount' }),
      toggle(['Paycheck', 'Year'], v.contributionPer ?? 'Year', x => up({ contributionPer: x }), { label: 'Per' })), { later: later('contribution') }),
    asksTaxType(r.type) ? labelled('Pretax, Roth or both', toggle(['Pretax', 'Roth', 'Both'], v.taxType ?? null, x => up({ taxType: x }), { label: 'Pretax or Roth' }), { later: later('taxType') })
      : known ? labelled('Pretax or Roth', h('span.computed', { title: 'Set by the account type' }, known === 'Roth' ? 'Roth: taxed now, tax-free later' : 'Pretax: tax break now, taxed when taken out')) : null,
    // QUESTIONS 252: what went into a Roth IRA comes out any time with no tax or penalty; only the growth waits.
    // One tap when it was never invested long (the balance is all contributions), else the box.
    r.type === 'Roth IRA' ? (el => { el.classList.add('wide'); return el; })(labelled('Roth IRA contributions so far', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
      v.balance != null ? button('Same as the balance', { size: 'small', onClick: () => up({ rothBasis: v.balance }) }) : null,
      moneyInput(v.rothBasis ?? null, x => up({ rothBasis: x }), { hint: 'Add amount' })),
    { tip: 'What you have put in. It comes out any time with no tax or penalty; only the growth waits for 59 and a half', later: later('rothBasis') })) : null,
    asksTaxType(r.type) ? labelled('Unvested', moneyInput(v.unvested, x => up({ unvested: x }), { hint: 'Add amount' }), { note: 'Shown, not counted in net worth', later: later('unvested') }) : null,
    limitUsed({ contributions: 0, type: r.type, age: 30 }, ctx.ref).value !== null ? labelled('Limit used this year', h('span.computed', {}, lim.value === null ? `Needs ${lim.needs[0]}` : `${value(lim)} of ${money(lim.limit)}${employerHsa ? `, with ${money(employerHsa)} from your employer` : ''}`)) : null];
}
function assetTertiary(ctx, r, up) {
  if (r.kind !== 'account') return [labelled('Coach notes', textInput(r.privateNote, x => up({ privateNote: x }), { hint: 'Add a private note', width: 320 }))];
  const flags = accountFlags(r, { now: ctx.now(), concentration: !ctx.store.doc.session?.concentrationOff });
  return [h('div.stack', { style: { gap: '8px', width: '100%' } },
    flags.length ? h('div.stack', { style: { gap: '4px' } }, flags.map(f => (/sitting in cash/.test(f)
      // Answer to 48: any cash is flagged; turn it off here when the cash is on purpose (an HSA cash floor).
      ? h('span.row-line', { style: { gap: '8px' } }, warnTag(f), button('Cash here is on purpose', { size: 'small', onClick: () => up({ cashOk: true }) }))
      : warnTag(f)))) : null,
    r.values.cashOk ? h('span.row-line', { style: { gap: '8px' } }, h('span.muted.small', {}, 'Cash flag is off for this account.'), button('Turn it back on', { size: 'small', onClick: () => up({ cashOk: false }) })) : null,
    accountBlocks(ctx, r, up, f => L(ctx, r, f)),
    labelled('Coach notes', textInput(r.privateNote, x => up({ privateNote: x }), { hint: 'Add a private note', width: 320 })))];
}

// Checks under the Assets strip (B2.19, B2.20, B2.16): one line each, with the account named.
function assetChecks(ctx, m) {
  const out = [];
  const nw = netWorthCheck(m.netWorth.value, m.inputs);
  if (nw && !nw.ok) out.push(`Net worth (${money(m.netWorth.value)}) does not match your balances: ${money(nw.assets)} owned − ${money(nw.unvested)} unvested − ${money(nw.owed)} owed = ${money(nw.expected)}. Check for a balance with a status that zeroes it.`);
  for (const r of ctx.visible(x => x.kind === 'account')) for (const f of accountFlags(r, { now: ctx.now(), concentration: !ctx.store.doc.session?.concentrationOff })) if (/sitting in cash|days old|Short goal|under 5 years/.test(f)) out.push(`${r.name || r.type}: ${f}`);
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
    // Batch 18: session 1 adds Health and Life only (QUESTIONS 234); the same button then adds the rest of the list.
    headerExtra: ctx => { const have = new Set(ctx.store.find(r => r.kind === 'coverage').map(r => r.type)); const rest = types(ctx).filter(t => !have.has(t));
      return !rest.length ? null : h('button.btn.small', { type: 'button', 'data-focus': 'add:usual-coverage', onclick: () => ctx.store.transaction('Add the usual coverage', () => {
        for (const t of rest) ctx.store.add('coverage', { name: null, values: {} }, { type: t });
      }) }, have.size ? `Add the rest of the usual list (${rest.length})` : 'Add the usual list'); },
    coreFields: ['have'], countsBlank: true, // batch 34: each usual-list row asks Have it?, so the foot counts it (as X of Y filled does)
    columns: [
      { label: 'Coverage', render: (ctx, r, m, up) => select(types(ctx).map(t => [t, t === 'Renters or home' && ctx.gates().housing !== 'Own' ? 'Renters insurance' : t]), r.type, v => ctx.store.update(r.id, { type: v }), { label: 'Coverage type', width: 196, key: `${r.id}:type` }) }, // batch 34: "Renters insurance" in full
      { label: 'Have it?', render: (ctx, r, m, up) => toggle(['Have it', "Don't", 'Not sure'], r.values.have ?? null, v => up({ have: v }), { label: 'Have it', key: `${r.id}:have` }) },
      { label: 'Premium', num: true, render: (ctx, r, m, up) => pair(moneyInput(r.amount, v => {
        up({ amount: v });
        const line = premiumLine(ctx, r); // keep the Budget line in step
        if (line && v != null) ctx.store.update(line.id, { amount: Math.round(premiumMonthly({ ...r, amount: v }, payFreqOf(ctx)) * 100) / 100 });
      }, { hint: 'Add premium', key: `${r.id}:amount`, width: 150 }),
        toggle([['paycheck', 'Paycheck'], ['month', 'Month']], r.per === 'paycheck' ? 'paycheck' : 'month', v => up({ per: v }), { label: 'Premium per' })) },
      owner,
    ],
    secondary: (ctx, r, up) => {
      const v = r.values;
      const insurer = labelled('Insurer', institutionPicker(ctx, r, up)); // item 14
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
      // Batch 7, item 10: the money fields sit in one group with one pair of park buttons (the group parks together),
      // and the disability fields say what they are, with a tooltip, instead of "benefit %".
      const quiet = (label, input, opts = {}) => labelled(label, input, { ...opts }); // no park buttons: the group below carries them
      if (r.type === 'Health') return [insurer, employer, paidFrom, budget,
        quiet('Deductible: in-network, out-of-network', pair(moneyInput(v.deductible, x => up({ deductible: x }), { hint: 'In' }), moneyInput(v.deductibleOut, x => up({ deductibleOut: x }), { hint: 'Out' })), { ...parkGroup(ctx, r, ['deductible', 'oopMax', 'copays']), note: null }),
        quiet('Out-of-pocket max: in, out', pair(moneyInput(v.oopMax, x => up({ oopMax: x }), { hint: 'In, a bad year' }), moneyInput(v.oopMaxOut, x => up({ oopMaxOut: x }), { hint: 'Out' })), { tip: 'The most you pay in a year, after which the plan pays everything.' }),
        quiet('Copays: doctor, specialist, urgent care', pair(moneyInput(v.copayPcp, x => up({ copayPcp: x }), { hint: 'Doctor' }), moneyInput(v.copaySpecialist, x => up({ copaySpecialist: x }), { hint: 'Specialist' }), moneyInput(v.copayUrgent, x => up({ copayUrgent: x }), { hint: 'Urgent' })))];
      if (r.type === 'Disability') return [employer, paidFrom, budget,
        quiet('Short-term or long-term', toggle(['Short-term', 'Long-term', 'Both'], v.term ?? null, x => up({ term: x }), { label: 'Short or long term', clearable: true }), parkGroup(ctx, r, ['term', 'benefitPct'])),
        quiet('Replaces this % of your pay', pctInput(v.benefitPct, x => up({ benefitPct: x }), { hint: 'Usually 60' }), { tip: 'What the policy pays each month while you cannot work, as a share of your salary. Group plans are usually 60%, and the benefit is taxed when the employer pays the premium.' }),
        quiet('Benefit period', textInput(v.duration, x => up({ duration: x }), { hint: 'e.g. 26 weeks, or to age 65', width: 200 }), { ...parkGroup(ctx, r, ['duration', 'waiting']), tip: 'How long it keeps paying: weeks for short-term, or to an age (often 65) for long-term.' }),
        quiet('Waiting period', textInput(v.waiting, x => up({ waiting: x }), { hint: 'Days before the first check, often 90', width: 200 }), { tip: 'The days between the day you cannot work and the first check.' })];
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
  // Batch 15, item 1: one return for the household (or one per person), FICA per person.
  const hh = x.householdTax;
  const rates = householdRates(hh, ctx.ref);
  const marginal = rates.value === null ? rates : { ...rates, value: rates.marginal, text: `The next dollar of pay is taxed at ${pct(rates.marginal)}: the federal bracket${rates.stateMarginal ? ', state and city' : ''} plus FICA.` };
  const seRows = Object.values(hh?.rows || {}).filter(t => t.taxType === '1099');
  const seTax = seRows.length ? { value: sum(seRows, t => t.fica) } : null;
  const q = quarterlySetAside(hh, ctx.ref, { year: ctx.now().getFullYear(), paid: p.quarterlyPaid ?? 0 });
  const rows = x.income.filter(i => i.tax);
  const gap = sum(rows.filter(i => !i.benefit && i.taxType !== '1099'), i => i.due);
  const benefits = rows.filter(i => i.benefit);
  const due = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const inferred = !p.filingStatus;
  const g = ctx.gates();
  return h('section.section.area-taxes', {}, h('div.section-title', {}, h('h2', {}, 'Filing')),
    h('div.card', {}, h('div.form-grid', {},
      labelled('Filing status', h('span.row-line', { style: { gap: '8px' } }, tapPick(FILING, x.filingStatus, v => set({ filingStatus: v }), { label: 'Filing status', key: 'tax:filing', clearable: false }),
        inferred ? h('span.tag.plain.guess', { title: 'A guess: Single, or Married jointly once the relationship stage is Married. Pick one to confirm.' }, 'Guess') : null)),
      metricCard(ctx, 'Effective rate', rates.value === null ? rates : { ...rates, value: rates.effective }),
      metricCard(ctx, 'Tax on your next dollar', marginal, { tip: 'Your marginal bracket: the federal bracket plus FICA on the next dollar you earn' })),
    // Withholding (M3): last year's result and the W-4 basics, with one plain flag.
    h('div.form-grid', { style: { marginTop: '16px' } },
      labelled(`Tax year ${ctx.now().getFullYear() - 1}: refund or owed`, h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
        toggle(['Refund', 'Owed', "Don't know"], p.lastYearTax ?? null, v => set({ lastYearTax: v }), { label: 'Refund or owed', clearable: true }),
        p.lastYearTax === 'Refund' || p.lastYearTax === 'Owed' ? moneyInput(p.lastYearAmount ?? null, v => set({ lastYearAmount: v }), { hint: 'Add amount', key: 'tax:lastYear' }) : null),
        parkProfile(ctx.store, 'lastYearAmount')),
      labelled('W-4 filing status', tapPick(['Single or married filing separately', 'Married filing jointly', 'Head of household'], p.w4Status ?? null, v => set({ w4Status: v }), { label: 'W-4 filing status', key: 'tax:w4' }),
        { note: 'Step 1(c) on your W-4', ...parkProfile(ctx.store, 'w4Status') }),
      labelled('Extra withheld a paycheck', moneyInput(p.w4Extra ?? null, v => set({ w4Extra: v }), { hint: 'Add amount', key: 'tax:w4extra' }), { note: 'Step 4(c) on your W-4', ...parkProfile(ctx.store, 'w4Extra') })),
    (() => { const f = withholdingFlag({ lastYear: p.lastYearTax, amount: p.lastYearAmount ?? null }); return f ? h('div.nudge', { style: { marginTop: '12px' } }, f.text) : null; })(),
    // Batch 15, item 3: quarterly estimates from the real rates (SE tax in), with the four due dates (they are on the calendar).
    q ? h('div.nudge.quarterly', { style: { marginTop: '12px' } }, h('strong', {}, `Set aside ${Math.round((q.rate ?? 0) * 100)} cents of each self-employment dollar: ${money(q.each)} a quarter.`),
      ` Due ${q.due.map(due).join(', ')}. Your rates with self-employment tax in, on top of your other income.`) : null,
    // Batch 35 (QUESTIONS 300): the federal tips deduction, its own line (reported tips only).
    (() => { const td = tipsDeductionOf(hh, x.income, ctx.ref); return td ? h('div.nudge.tips-deduction', { style: { marginTop: '12px' } }, td.text, ' ', h('span.has-tip', { tabindex: 0, title: td.tip, 'aria-label': td.tip }, 'The rule')) : null; })(),
    gap > 100 ? h('div.nudge', { style: { marginTop: '12px' } }, `Your paychecks hold back about ${money(gap)} a year less than the household owes (each job withholds as if it were the only one). More withheld a paycheck (W-4 step 4c) or step 2 fixes it.`) : null,
    ...benefits.map(i => h('div.nudge', { style: { marginTop: '12px' } }, `${i.r.name || 'Unemployment'}: ${money(i.benefit.thisYear)} taxed this year, federal and ${x.place?.state ?? 'state'} income tax ${money(i.tax.total)}, no Social Security or Medicare. ${i.withheld ? `${money(i.withheld)} withheld, ` : 'Nothing withheld, '}about ${money(i.due)} due when you file.`)),
    rows.length > 1 ? moreBlock('taxes:rows', () => h('table.rows.tax-rows', {}, h('thead', {}, h('tr', {}, ['Income', 'Federal', 'FICA', ...(x.place ? ['State and city'] : []), 'Total'].map(t => h('th', {}, t)))),
      h('tbody', {}, rows.map(i => h('tr', {}, h('td', {}, i.r.name || i.r.type), h('td.num', {}, money(i.tax.federal)), h('td.num', {}, money(i.tax.fica)), ...(x.place ? [h('td.num', {}, money(i.tax.state + i.tax.local))] : []), h('td.num', {}, money(i.tax.total)))))),
    { label: `Each row's share of the tax (${hh?.joint ? 'one return' : Object.keys(hh?.units || {}).length > 1 ? 'one return each' : 'one return'})` }) : null,
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
    h('p.muted', { style: { marginTop: '12px' } }, `Gross used: ${gross === null ? 'none yet (add take-home or gross on Income)' : `${money(gross)} a year`}. ${x.place ? `Federal, FICA, NY state${x.place.nyc ? ' and NYC' : ''} tax.${/joint/i.test(x.filingStatus) || x.place.nyc ? ` ${/joint/i.test(x.filingStatus) ? 'NY joint brackets' : ''}${/joint/i.test(x.filingStatus) && x.place.nyc ? ' and ' : ''}${x.place.nyc ? 'NYC rates' : ''}: not yet confirmed against the law.` : ''}` : stateTaxLine(p.state ?? null, ctx.ref)}`))); // batch 35 (QUESTIONS 306): a state other than NY says it is not counted yet
}

// Completion (R065) lives in js/completion.js (pure, tested); re-exported here for older readers.
export { listCompletion } from '../completion.js';

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
      for (const i of taxed) { // batch 15: each row's share of the household's tax
        const t = i.tax ?? { federal: 0, fica: 0, state: 0, local: 0 };
        gross += i.gross; fed += t.federal; fc += t.fica; pre += i.pretax; st += t.state + t.local;
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
    name: 'Where take-home goes',
    data: ctx => {
      const m = ctx.metrics();
      if (m.inputs.takeHome === null) return { needs: ['take-home'] };
      const lines = m.inputs.lines.filter(l => l.status !== 'Not for me');
      if (!lines.length) return { needs: ['spending lines'] };
      const r = drafttShares(lines, m.inputs.takeHome, { roommates: m.inputs.roommates });
      const debts = m.inputs.debts.reduce((s, d) => s + (d.inFull ? 0 : d.payment ?? 0), 0);
      const totals = { ...r.totals, Debt: r.totals.Debt + debts };
      return { rows: DRAFTT.filter(k => totals[k] > 0).map(k => [drafttName(k), totals[k]]), takeHome: m.inputs.takeHome };
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
    name: 'Job-loss fund target',
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
        data: [{ value: d.cash, name: `${d.months.toFixed(1)} months of spending` }] }] }),
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
