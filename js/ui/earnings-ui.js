// SPDX-License-Identifier: AGPL-3.0-only
// Income by type on Cash flow › Income (batch 27): a Job row's tips and shifts, a Platform row's fee, hold and
// chargebacks, and the shifts' seasons feeding the irregular income view. Formatting only: js/math/earnings.js and
// js/math/income.js do the math. Taps first; the few boxes are amounts. Collapsed until asked.
import { h } from './dom.js';
import { tapPick, toggle, moneyInput, pctInput, stepper, labelled, moreBlock, mathButton, button, addButton, iconButton } from './staples.js';
import { MONTHS3, TIP_OUT_BY, PLATFORMS, perShift, tipsTaxNote, shiftMonthsOf, hasNights, nightsRollUp, NIGHT_NAMES, addNight, copyNight, removeNight, setNight } from '../math/earnings.js';
import { householdRates } from '../math/income.js';
import { money } from '../format.js';

const SHIFT_TAPS = ['1', '2', '3', '4', '5', '6', '7'];
const PER_TAPS = [['shift', 'A shift'], ['month', 'A month']];
const wideAll = el => { el.style.gridColumn = '1 / -1'; return el; };
const group = (title, ...kids) => h('div.work-group', {}, h('span.label.work-title', {}, title), h('div.form-grid', {}, ...kids.flat().filter(Boolean)));

// Months picked as taps (several at once): the slow or busy season.
function monthTaps(picked, onChange, label) {
  const on = new Set(picked || []);
  return h('div.picks.tap-pick.month-taps', { role: 'group', 'aria-label': label },
    MONTHS3.map(mo => h('button.pick', { type: 'button', 'aria-pressed': String(on.has(mo)), onclick: () => {
      const next = new Set(on); next.has(mo) ? next.delete(mo) : next.add(mo);
      onChange(next.size ? MONTHS3.filter(x => next.has(x)) : null);
    } }, mo)));
}

// The words on the closed Tips and shifts caret, so the block says what it holds without opening.
export function workSummary(x) {
  const w = x?.work;
  if (!w?.any) return null;
  const ps = perShift(x.takeHome?.value, w);
  const bits = [w.shifts != null ? `${w.shifts} a week` : null, w.cash ? 'cash tips' : null, w.tipOut ? 'tip-out' : null, w.fee ? 'house fee' : null].filter(Boolean);
  return ps != null ? `${money(ps)} a shift` : bits.join(', '); // short, so the caret stays one line on a phone
}

// A Job row's tips and shifts. x: the row from the metrics (incomeRow plus its tax share).
export function workBlock(ctx, r, up, x) {
  const v = r.values;
  const label = (() => { const s = workSummary(x); return s ? `Tips and shifts: ${s}` : 'Tips and shifts'; })();
  return wideAll(h('div.stack.work-wrap', {}, moreBlock(`income:work:${r.id}`, () => workBody(ctx, r, up, x), { label })));
}
function workBody(ctx, r, save, x) {
  const v = r.values, w = x?.work, c = x?.cash;
  // Batch 60: on a row with nights every change also writes the row's boxes as the nights add up (Tip-out as moves the
  // tip-out between a $ amount and sales), so the workbook and the seasons read the same totals.
  const up = patch => save(hasNights({ ...v, ...patch }) ? { ...patch, ...nightsRollUp({ ...v, ...patch }) } : patch);
  const paycheck = r.amount != null;
  const nights = hasNights(v); // batch 60: the shift boxes are each night's, below
  const num = s => (s == null ? null : Number(s));
  const tipOutBox = v.tipOutBy === '% of sales'
    ? [labelled('Tip-out %', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, toggle(['1', '2', '3', '5'].map(p => [p, `${p}%`]), v.tipOutPct == null ? null : String(Math.round(v.tipOutPct * 1000) / 10), y => up({ tipOutPct: Number(y) / 100 }), { label: 'Tip-out % of sales' }),
      pctInput(v.tipOutPct, y => up({ tipOutPct: y }), { hint: 'Other', key: `${r.id}:tipOutPct` }))),
      nights ? null : labelled('Sales a shift', moneyInput(v.salesShift, y => up({ salesShift: y }), { hint: 'Add sales', key: `${r.id}:salesShift` }), { tip: 'What you ring up on a usual shift; the POS report shows it' })]
    : v.tipOutBy === '% of tips'
      ? [labelled('Tip-out %', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, toggle(['10', '15', '20'].map(p => [p, `${p}%`]), v.tipOutPct == null ? null : String(Math.round(v.tipOutPct * 1000) / 10), y => up({ tipOutPct: Number(y) / 100 }), { label: 'Tip-out % of tips' }),
        pctInput(v.tipOutPct, y => up({ tipOutPct: y }), { hint: 'Other', key: `${r.id}:tipOutPct` })))]
      : v.tipOutBy === '$ a shift' && !nights ? [labelled('Tip-out a shift', moneyInput(v.tipOutAmount, y => up({ tipOutAmount: y }), { hint: 'Add amount', key: `${r.id}:tipOutAmount` }), { tip: 'The DJ, house mom, barback or bussers, a shift' })] : [];
  const rates = (() => { const hh = ctx.metrics().inputs.householdTax; const t = hh ? householdRates(hh, ctx.ref) : null; return t?.value != null ? t : null; })();
  const note = x?.work ? tipsTaxNote(w, c, { marginal: rates?.marginal ?? null, federalMarginal: rates?.federalMarginal ?? null, year: ctx.now().getFullYear(), ref: ctx.ref }) : null;
  const ps = perShift(x?.takeHome?.value, w);
  const addTap = addButton('a kind of night', () => up(addNight(v)));
  addTap.title = 'Friday and Saturday pay differently from a weeknight? Give each its own pay, tips and hours';
  return h('div.stack.work-block', { style: { gap: '12px' } },
    nights ? nightsGroup(r, v, up, w, paycheck, addTap) : group('Shifts',
      labelled('Shifts a week', tapPick(SHIFT_TAPS, v.shiftsWeek == null ? null : String(v.shiftsWeek), y => up({ shiftsWeek: num(y) }), { label: 'Shifts a week', key: `${r.id}:shiftsWeek` })),
      paycheck ? labelled('Pay', h('span.computed', { title: 'The paycheck in the Amount box holds the wage and the card tips' }, 'From the paycheck above'))
        : [labelled('Pay a shift (before tax)', moneyInput(v.payShift, y => up({ payShift: y }), { hint: 'Add pay', key: `${r.id}:payShift` }), { tip: 'Wage or dance earnings for one shift. Or use hourly and hours' }),
          labelled('Or hourly x hours a shift', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, moneyInput(v.hourly, y => up({ hourly: y }), { hint: 'Hourly', width: 100, key: `${r.id}:hourly` }),
            stepper(v.hoursShift ?? null, y => up({ hoursShift: y }), { min: 1, max: 16, label: 'Hours a shift', key: `${r.id}:hoursShift` })))],
      labelled('House or stage fee a shift', moneyInput(v.houseFee, y => up({ houseFee: y }), { hint: 'Add fee', key: `${r.id}:houseFee` }), { tip: 'What the club or venue charges you to work a shift' }),
      h('div.work-add', { style: { gridColumn: '1 / -1' } }, addTap)),
    group('Tips',
      nights ? null : labelled('Card tips', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, moneyInput(v.cardTips, y => up({ cardTips: y }), { hint: 'Add tips', width: 110, key: `${r.id}:cardTips` }),
        toggle(PER_TAPS, v.cardTipsPer ?? 'shift', y => up({ cardTipsPer: y }), { label: 'Card tips per' })), { tip: paycheck ? 'Paid on the paycheck and taxed there, so they are already in the Amount' : 'Paid through payroll and taxed' }),
      nights ? null : labelled('Cash tips', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, moneyInput(v.cashTips, y => up({ cashTips: y }), { hint: 'Add tips', width: 110, key: `${r.id}:cashTips` }),
        toggle(PER_TAPS, v.cashTipsPer ?? 'shift', y => up({ cashTipsPer: y }), { label: 'Cash tips per' })), { tip: 'Cash in hand at the end of the shift, before the tip-out' }),
      labelled('Cash tips reported?', toggle(['Yes', 'No'], v.cashReported ?? null, y => up({ cashReported: y }), { label: 'Cash tips reported', clearable: true }), { tip: 'Reported to the employer (or on the return) so tax is worked out on them' })),
    group('Tip-out',
      labelled('Tip-out as', toggle(TIP_OUT_BY, v.tipOutBy ?? null, y => up({ tipOutBy: y }), { label: 'Tip-out as', clearable: true, key: `${r.id}:tipOutBy` }), { tip: 'What you share with the bar back, bussers, DJ or house, paid from your cash' }),
      ...tipOutBox.filter(Boolean)),
    group('Seasons',
      labelled('Slow months', monthTaps(v.slowMonths, y => up({ slowMonths: y }), 'Slow months')),
      v.slowMonths?.length ? labelled('Shifts a week then', stepper(v.slowShifts ?? null, y => up({ slowShifts: y }), { min: 0, max: 7, label: 'Shifts a week in the slow season', key: `${r.id}:slowShifts` })) : null,
      labelled('Busy months', monthTaps(v.busyMonths, y => up({ busyMonths: y }), 'Busy months')),
      v.busyMonths?.length ? labelled('Shifts a week then', stepper(v.busyShifts ?? null, y => up({ busyShifts: y }), { min: 0, max: 7, label: 'Shifts a week in the busy season', key: `${r.id}:busyShifts` })) : null),
    x?.takeHome?.value != null && w?.any ? h('div.row-line.work-result', { style: { gap: '16px', flexWrap: 'wrap' } },
      ps != null ? h('span.stack', {}, h('span.label', {}, nights ? 'Take-home a shift, on average' : 'Take-home a shift'), mathButton({ ...x.takeHome, value: ps }, money(ps))) : null, // batch 60: each night's own is on What a shift really pays
      x.computed === 'takeHome' ? null : h('span.stack', {}, h('span.label', {}, 'Take-home a month'), mathButton(x.takeHome, money(x.takeHome.value))), // a shift job worked out from its shifts shows it once, beside
      c?.extra ? h('span.stack', {}, h('span.label', {}, paycheck ? 'Cash on top of the paycheck' : 'Cash on top'), h('strong', {}, `${money(c.extra)} a month`)) : null) : null,
    note ? h('p.muted.small.tips-note', { style: { margin: 0 }, title: note.text }, note.line, ' ', h('span.has-tip', { tabindex: 0, title: note.text, 'aria-label': note.text }, 'What reporting changes')) : null);
}

// Batch 60 (QUESTIONS 422): the kinds of night on one row, each with its own shifts a week, pay, hours, tips, house
// fee and tip-out; Copy and the bin on each, and one tap to add another. The row's take-home is their sum.
function nightsGroup(r, v, up, w, paycheck, addTap) {
  const tipOutWord = v.tipOutBy === '$ a shift' ? 'tipOutAmount' : v.tipOutBy === '% of sales' ? 'salesShift' : null;
  const card = (n, i) => {
    const set = change => up(setNight(v, n.id, change));
    const key = k => `${r.id}:night:${n.id}:${k}`;
    const names = [...NIGHT_NAMES]; if (n.name && !names.includes(n.name)) names.push(n.name);
    const nw = w?.nights?.[i]?.w;
    return h('div.work-night', { 'data-focus': key('night') },
      h('div.row-line.work-night-head', { style: { gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
        tapPick(names, n.name ?? null, y => set({ name: y }), { label: `Night ${i + 1}: which night`, key: key('name'), clearable: false }),
        h('span.spacer'),
        button('Copy', { size: 'small', onClick: () => up(copyNight(v, n.id)), tip: `Copy ${n.name || `night ${i + 1}`} as a new kind of night` }),
        iconButton('trash', `Remove ${n.name || `night ${i + 1}`}`, () => up(removeNight(v, n.id)), { tiny: true })),
      h('div.form-grid', {},
        labelled('Shifts a week', tapPick(SHIFT_TAPS, n.shiftsWeek == null ? null : String(n.shiftsWeek), y => set({ shiftsWeek: y == null ? null : Number(y) }), { label: `${n.name || 'This night'}: shifts a week`, key: key('shiftsWeek') })),
        paycheck ? null : labelled('Pay a shift (before tax)', moneyInput(n.payShift ?? null, y => set({ payShift: y }), { hint: n.payShift == null && nw?.pay?.shift != null ? `${money(nw.pay.shift)} from hourly` : 'Add pay', key: key('payShift') }), { tip: v.hourly != null ? 'Blank: the row\'s hourly pay x this night\'s hours' : 'Wage or dance earnings for one of these shifts' }),
        labelled('Hours a shift', stepper(n.hoursShift ?? null, y => set({ hoursShift: y }), { min: 1, max: 16, label: `${n.name || 'This night'}: hours a shift`, key: key('hoursShift') })),
        labelled('House or stage fee', moneyInput(n.houseFee ?? null, y => set({ houseFee: y }), { hint: 'Add fee', key: key('houseFee') }), { tip: 'What the club or venue charges for one of these shifts' }),
        labelled('Card tips a shift', moneyInput(n.cardTips ?? null, y => set({ cardTips: y }), { hint: 'Add tips', key: key('cardTips') }), { tip: paycheck ? 'Paid on the paycheck and taxed there' : 'Paid through payroll and taxed' }),
        labelled('Cash tips a shift', moneyInput(n.cashTips ?? null, y => set({ cashTips: y }), { hint: 'Add tips', key: key('cashTips') }), { tip: 'Cash in hand at the end of the shift, before the tip-out' }),
        tipOutWord === 'tipOutAmount' ? labelled('Tip-out a shift', moneyInput(n.tipOutAmount ?? null, y => set({ tipOutAmount: y }), { hint: 'Add amount', key: key('tipOutAmount') }), { tip: 'The DJ, house mom, barback or bussers, a shift' })
          : tipOutWord === 'salesShift' ? labelled('Sales a shift', moneyInput(n.salesShift ?? null, y => set({ salesShift: y }), { hint: 'Add sales', key: key('salesShift') }), { tip: 'What you ring up on one of these shifts; the tip-out is the row\'s % of it' }) : null,
        nw?.shifts ? h('span.muted.small.work-night-sum', { style: { gridColumn: '1 / -1' } }, `${nw.shifts} a week is ${Math.round(nw.shiftsMonth * 100) / 100} a month`) : null));
  };
  const sum = w?.shifts ? `All together: ${w.shifts} ${w.shifts === 1 ? 'shift' : 'shifts'} a week${w.pay?.shift != null ? `, ${money(w.pay.shift, { cents: true })} pay a shift on average` : ''}` : null;
  return h('div.work-group', {}, h('span.label.work-title', {}, 'Kinds of night'),
    h('div.stack.work-nights', { style: { gap: '10px' } }, v.nights.map(card)),
    h('div.row-line.work-add', { style: { gap: '12px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center' } }, addTap, sum ? h('span.muted.small', {}, sum) : null));
}

// A Platform row: which platform (taps), its fee and hold (prefilled from the registered list), chargebacks, and
// what it pays out a month. The payout schedule is the row's Pay frequency.
export function platformBlock(ctx, r, up, x) {
  const v = r.values, p = x?.platform;
  const d = ctx.ref.platforms?.[v.platform ?? 'Other'] ?? ctx.ref.platforms?.Other;
  const name = v.platform ?? 'Other';
  return [
    wideAll(labelled('Platform', tapPick(PLATFORMS, v.platform ?? null, y => up({ platform: y }), { label: 'Platform', key: `${r.id}:platform` }))),
    labelled('Platform fee', pctInput(v.feePct ?? null, y => up({ feePct: y }), { hint: String(Math.round((d?.fee ?? 0) * 1000) / 10), key: `${r.id}:feePct` }),
      { note: v.feePct != null ? 'Typed for this row' : `Blank: ${name} takes ${Math.round((d?.fee ?? 0) * 1000) / 10}%`, tip: d?.source ?? null }),
    labelled('Payout hold (days)', stepper(v.holdDays ?? d?.holdDays ?? 0, y => up({ holdDays: y }), { min: 0, max: 60, label: 'Hold days', key: `${r.id}:holdDays` }),
      { note: v.holdDays != null ? 'Typed for this row' : `${name} usually holds ${d?.holdDays ?? 0} days`, tip: 'The calendar lands each payout this many days after its payout date' }),
    labelled('Chargebacks a month', moneyInput(v.chargebacks, y => up({ chargebacks: y }), { hint: 'Add amount', key: `${r.id}:chargebacks` }), { tip: 'Money taken back after it was paid: a fan disputes a charge, a buyer gets a refund' }),
    p?.net != null ? labelled('Paid out a month', mathButton({ id: 'M12', value: p.net, needs: [], unit: 'money', text: p.text }, money(p.net)), { note: x?.taxType ? 'Before tax; take-home is after it' : 'Counted as it lands' }) : null,
    p?.net != null && x?.takeHome?.value != null && x?.taxType ? labelled('Take-home a month', mathButton(x.takeHome, money(x.takeHome.value)), { note: 'Its tax goes out on the quarterly dates' }) : null,
  ];
}

// The irregular income view's tie-in: the months from the shifts' seasons, and one tap to use them.
export function seasonsFill(ctx, set) {
  const sm = shiftMonthsOf(ctx.metrics().inputs.income);
  if (!sm) return null;
  return h('div.row-line.seasons-fill', { style: { gap: '12px', flexWrap: 'wrap', marginTop: '12px' } },
    h('span.muted.small', { title: sm.text }, `From your shifts: a slow month ${money(sm.lowest)}, a regular month ${money(sm.typical)}${sm.highest > sm.typical + 0.5 ? `, a busy month ${money(sm.highest)}` : ''}`),
    button('Use your shifts', { size: 'small', onClick: () => set({ months: sm.months, typical: sm.typical, lowest: sm.lowest }), tip: 'Fills the typical month, the lowest month and the twelve months from the shifts' }));
}
