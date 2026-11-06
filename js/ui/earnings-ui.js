// SPDX-License-Identifier: AGPL-3.0-only
// Income by type on Cash flow › Income (batch 27): a Job row's tips and shifts, a Platform row's fee, hold and
// chargebacks, and the shifts' seasons feeding the irregular income view. Formatting only: js/math/earnings.js and
// js/math/income.js do the math. Taps first; the few boxes are amounts. Collapsed until asked.
import { h } from './dom.js';
import { tapPick, toggle, moneyInput, pctInput, stepper, labelled, moreBlock, mathButton, button } from './staples.js';
import { MONTHS3, TIP_OUT_BY, PLATFORMS, perShift, tipsTaxNote, shiftMonthsOf } from '../math/earnings.js';
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
function workBody(ctx, r, up, x) {
  const v = r.values, w = x?.work, c = x?.cash;
  const paycheck = r.amount != null;
  const num = s => (s == null ? null : Number(s));
  const tipOutBox = v.tipOutBy === '% of sales'
    ? [labelled('Tip-out %', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, toggle(['1', '2', '3', '5'].map(p => [p, `${p}%`]), v.tipOutPct == null ? null : String(Math.round(v.tipOutPct * 1000) / 10), y => up({ tipOutPct: Number(y) / 100 }), { label: 'Tip-out % of sales' }),
      pctInput(v.tipOutPct, y => up({ tipOutPct: y }), { hint: 'Other', key: `${r.id}:tipOutPct` }))),
      labelled('Sales a shift', moneyInput(v.salesShift, y => up({ salesShift: y }), { hint: 'Add sales', key: `${r.id}:salesShift` }), { tip: 'What you ring up on a usual shift; the POS report shows it' })]
    : v.tipOutBy === '% of tips'
      ? [labelled('Tip-out %', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, toggle(['10', '15', '20'].map(p => [p, `${p}%`]), v.tipOutPct == null ? null : String(Math.round(v.tipOutPct * 1000) / 10), y => up({ tipOutPct: Number(y) / 100 }), { label: 'Tip-out % of tips' }),
        pctInput(v.tipOutPct, y => up({ tipOutPct: y }), { hint: 'Other', key: `${r.id}:tipOutPct` })))]
      : v.tipOutBy === '$ a shift' ? [labelled('Tip-out a shift', moneyInput(v.tipOutAmount, y => up({ tipOutAmount: y }), { hint: 'Add amount', key: `${r.id}:tipOutAmount` }), { tip: 'The DJ, house mom, barback or bussers, a shift' })] : [];
  const rates = (() => { const hh = ctx.metrics().inputs.householdTax; const t = hh ? householdRates(hh, ctx.ref) : null; return t?.value != null ? t : null; })();
  const note = x?.work ? tipsTaxNote(w, c, { marginal: rates?.marginal ?? null, federalMarginal: rates?.federalMarginal ?? null, year: ctx.now().getFullYear(), ref: ctx.ref }) : null;
  const ps = perShift(x?.takeHome?.value, w);
  return h('div.stack.work-block', { style: { gap: '12px' } },
    group('Shifts',
      labelled('Shifts a week', tapPick(SHIFT_TAPS, v.shiftsWeek == null ? null : String(v.shiftsWeek), y => up({ shiftsWeek: num(y) }), { label: 'Shifts a week', key: `${r.id}:shiftsWeek` })),
      paycheck ? labelled('Pay', h('span.computed', { title: 'The paycheck in the Amount box holds the wage and the card tips' }, 'From the paycheck above'))
        : [labelled('Pay a shift (before tax)', moneyInput(v.payShift, y => up({ payShift: y }), { hint: 'Add pay', key: `${r.id}:payShift` }), { tip: 'Wage or dance earnings for one shift. Or use hourly and hours' }),
          labelled('Or hourly x hours a shift', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, moneyInput(v.hourly, y => up({ hourly: y }), { hint: 'Hourly', width: 100, key: `${r.id}:hourly` }),
            stepper(v.hoursShift ?? null, y => up({ hoursShift: y }), { min: 1, max: 16, label: 'Hours a shift', key: `${r.id}:hoursShift` })))],
      labelled('House or stage fee a shift', moneyInput(v.houseFee, y => up({ houseFee: y }), { hint: 'Add fee', key: `${r.id}:houseFee` }), { tip: 'What the club or venue charges you to work a shift' })),
    group('Tips',
      labelled('Card tips', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, moneyInput(v.cardTips, y => up({ cardTips: y }), { hint: 'Add tips', width: 110, key: `${r.id}:cardTips` }),
        toggle(PER_TAPS, v.cardTipsPer ?? 'shift', y => up({ cardTipsPer: y }), { label: 'Card tips per' })), { tip: paycheck ? 'Paid on the paycheck and taxed there, so they are already in the Amount' : 'Paid through payroll and taxed' }),
      labelled('Cash tips', h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, moneyInput(v.cashTips, y => up({ cashTips: y }), { hint: 'Add tips', width: 110, key: `${r.id}:cashTips` }),
        toggle(PER_TAPS, v.cashTipsPer ?? 'shift', y => up({ cashTipsPer: y }), { label: 'Cash tips per' })), { tip: 'Cash in hand at the end of the shift, before the tip-out' }),
      labelled('Cash tips reported?', toggle(['Yes', 'No'], v.cashReported ?? null, y => up({ cashReported: y }), { label: 'Cash tips reported', clearable: true }), { tip: 'Reported to the employer (or on the return) so tax is worked out on them' })),
    group('Tip-out',
      labelled('Tip-out as', toggle(TIP_OUT_BY, v.tipOutBy ?? null, y => up({ tipOutBy: y }), { label: 'Tip-out as', clearable: true }), { tip: 'What you share with the bar back, bussers, DJ or house, paid from your cash' }),
      ...tipOutBox),
    group('Seasons',
      labelled('Slow months', monthTaps(v.slowMonths, y => up({ slowMonths: y }), 'Slow months')),
      v.slowMonths?.length ? labelled('Shifts a week then', stepper(v.slowShifts ?? null, y => up({ slowShifts: y }), { min: 0, max: 7, label: 'Shifts a week in the slow season', key: `${r.id}:slowShifts` })) : null,
      labelled('Busy months', monthTaps(v.busyMonths, y => up({ busyMonths: y }), 'Busy months')),
      v.busyMonths?.length ? labelled('Shifts a week then', stepper(v.busyShifts ?? null, y => up({ busyShifts: y }), { min: 0, max: 7, label: 'Shifts a week in the busy season', key: `${r.id}:busyShifts` })) : null),
    x?.takeHome?.value != null && w?.any ? h('div.row-line.work-result', { style: { gap: '16px', flexWrap: 'wrap' } },
      ps != null ? h('span.stack', {}, h('span.label', {}, 'Take-home a shift'), mathButton({ ...x.takeHome, value: ps }, money(ps))) : null,
      x.computed === 'takeHome' ? null : h('span.stack', {}, h('span.label', {}, 'Take-home a month'), mathButton(x.takeHome, money(x.takeHome.value))), // a shift job worked out from its shifts shows it once, beside
      c?.extra ? h('span.stack', {}, h('span.label', {}, paycheck ? 'Cash on top of the paycheck' : 'Cash on top'), h('strong', {}, `${money(c.extra)} a month`)) : null) : null,
    note ? h('p.muted.small.tips-note', { style: { margin: 0 }, title: note.text }, note.line, ' ', h('span.has-tip', { tabindex: 0, title: note.text, 'aria-label': note.text }, 'What reporting changes')) : null);
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
