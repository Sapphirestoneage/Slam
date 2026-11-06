// SPDX-License-Identifier: AGPL-3.0-only
// Cash flow › Income › What a shift really pays (batch 51, Phase 5 real lives wave 2). One closed section under the
// income list, shown only when a row has shifts a week: for each shift row three numbers (take-home a shift, what the
// shift leaves after getting there, childcare and gear, and the real hour over every hour it takes), then the money a
// shift and the hours a shift as slim rows, every cost a tap. The math is js/math/shiftpnl.js (M9H); this file only
// shows it and saves the row's boxes. A row kept private for this audience stays folded (one calm line).
import { h } from './dom.js';
import * as S from './staples.js';
import { sec } from './sections.js';
import { money } from '../format.js';
import { shiftPnlsOf, TRAVEL_BY } from '../math/shiftpnl.js';
import { setNight } from '../math/earnings.js';
import { PRIVATE_LINE } from '../privacy.js';

const c2 = v => money(v, { cents: true });
const minus = v => (Math.abs(v) < 0.005 ? c2(0) : c2(-v));
const n = x => (x == null ? null : String(x));
const hrs = x => `${Math.round(x * 100) / 100} ${x === 1 ? 'hour' : 'hours'}`;
// Taps for a number; a typed value not on the list shows as its own pressed tap.
const numTaps = (list, value, onChange, label, key, fmt = x => x) => {
  const opts = [...list.map(String)];
  if (value != null && !opts.includes(String(value))) opts.push(String(value));
  return S.tapPick(opts.map(o => [o, fmt(o)]), n(value), y => onChange(y == null ? null : Number(y)), { label, key });
};

// A small number box (miles, shifts) for a value the taps do not have.
const numBox = (value, onChange, { hint = 'Other', label, key, width = 84 } = {}) => {
  const input = h('input', { inputmode: 'decimal', placeholder: hint, 'aria-label': label, value: value ?? '', 'data-focus': key });
  input.onchange = () => { const t = input.value.trim(), x = Number(t.replace(/,/g, '')); onChange(t === '' || !Number.isFinite(x) || x < 0 ? null : x); };
  return h(`label.field${value != null ? '.filled' : ''}`, { style: { width: `${width}px` } }, input);
};

export function shiftSection(app, ctx) {
  if (ctx.store.doc.settings?.phase4 !== true) return null; // a Phase 5 preview, behind the same switch as Phase 4's
  const P = shiftPnlsOf(ctx.metrics(), { ref: ctx.ref });
  if (!P.any) return null;
  const first = P.rows[0];
  const summary = first ? `${first.name}: ${c2(first.real)} a shift after costs${first.realHourly != null ? `, ${c2(first.realHourly)} a real hour` : ''}` : PRIVATE_LINE;
  return sec('income:shifts', { title: 'What a shift really pays', summary, tip: 'A shift after the ride, the babysitter, outfits and every hour around it. A view of one shift: your spending already holds these costs, so the plan does not change.' },
    () => h('div.stack.sp-wrap', { style: { gap: '16px' } },
      P.rows.map(r => rowCard(ctx, r, P.rows.length > 1)),
      P.best ? h('p.small.sp-best', {}, `Pays most per real hour: ${P.best.name}, ${c2(P.best.realHourly)} an hour.`) : null,
      P.keptPrivate ? h('p.muted.small', {}, PRIVATE_LINE) : null));
}

function rowCard(ctx, p, named) {
  const rec = ctx.store.get(p.rowId), rv = rec?.values || {};
  const up = patch => ctx.store.update(p.rowId, patch);
  // Batch 60: a night's card shows its own hours a shift; getting there, childcare, outfits and the hours around a
  // shift are the row's, the same on every night.
  const night = p.nightId ? (rv.nights || []).find(n => n.id === p.nightId) : null;
  const v = night ? { ...rv, hoursShift: night.hoursShift ?? null } : rv;
  const setHours = y => (night ? up(setNight(rv, p.nightId, { hoursShift: y })) : up({ hoursShift: y }));
  const shared = night ? `The same on every night of ${p.rowName}` : null;
  const tile = (label, big, small, focus) => h('div.fd-tile', {}, h('span.label', {}, label), h('strong.fd-big', focus ? { 'data-focus': focus } : {}, big), small ? h('span.muted.small', {}, small) : null);
  const hourly = p.realHourly == null ? h('span.muted', {}, 'Needs the hours a shift')
    : S.mathButton(p.result, `${c2(p.realHourly)} an hour`);
  const realBtn = S.mathButton({ id: 'M9H', value: p.real, needs: [], unit: 'money', text: p.result.text }, c2(p.real));
  const vsWords = p.vs == null ? null : `Your hourly value is ${c2(p.hourly)}${p.hourlyGuess ? ' (take-home over 173 hours, until work hours are in)' : ''}: this shift pays ${c2(Math.abs(p.vs))} an hour ${p.vs >= 0 ? 'more' : 'less'}.`;
  const line = (name, amount, { strong = false, tip = null, ctl = null, key = null } = {}) => h(`div.sp-row${strong ? '.sp-total' : ''}`, key ? { 'data-focus': key } : {},
    h('span.sp-name', tip ? { class: 'sp-name has-tip', title: tip, tabindex: 0 } : {}, name), h(strong ? 'strong.sp-amt' : 'span.sp-amt', {}, amount), ctl ? h('div.sp-ctl', {}, ctl) : null);
  const money1 = [
    ...p.lines.map(l => line(l.label, c2(l.amount))),
    p.fee ? line('House or stage fee', minus(p.fee)) : null,
    p.tipOut ? line('Tip-out', minus(p.tipOut)) : null,
    line(p.taxWord, minus(p.tax), { tip: p.unreportedCash ? `Cash tips not reported have no tax set aside here; Tips and shifts says roughly what it would be (${c2(p.unreportedCash)} a shift in cash)` : 'What lies between the gross and the take-home on this row: its share of the household\'s tax' }),
    line('Take-home a shift', c2(p.takeHome), { strong: true, tip: 'The same take-home a shift as Tips and shifts on the row' }),
    line('Getting there', p.costs.travel ? minus(p.costs.travel.amount) : '–', { tip: shared, ctl: travelCtl(ctx, p, v, up), key: `${p.id}:travelBy` }),
    ctx.gates().kids || v.sitterHours != null || v.sitterRate != null ? line('Childcare', p.costs.childcare ? minus(p.costs.childcare.amount) : '–', { tip: shared, ctl: sitterCtl(p, v, up), key: `${p.id}:sitter` }) : null,
    line('Outfits and gear', p.costs.gear ? minus(p.costs.gear.amount) : '–', { ctl: gearCtl(p, v, up), key: `${p.id}:gear`, tip: `Outfits, shoes, makeup, hair and nails, spread over the shifts they last${shared ? `. ${shared}` : ''}` }),
    line('The shift leaves you', realBtn, { strong: true }),
  ];
  const hours = [
    line('Getting ready', v.prepHours != null ? hrs(v.prepHours) : '–', { tip: shared, ctl: numTaps(['0', '0.5', '1', '1.5', '2'], v.prepHours, y => up({ prepHours: y }), 'Getting ready, hours', `${p.id}:prepHours`) }),
    line('Travel, there and back', v.travelHours != null ? hrs(v.travelHours) : '–', { tip: shared, ctl: numTaps(['0.5', '1', '1.5', '2'], v.travelHours, y => up({ travelHours: y }), 'Travel hours, there and back', `${p.id}:travelHours`) }),
    line('The shift', v.hoursShift != null ? hrs(v.hoursShift) : '–', { ctl: numTaps(['4', '5', '6', '7', '8', '10', '12'], v.hoursShift, setHours, 'Hours a shift', `${p.id}:hoursShiftPnl`) }),
    line('Winding down after', v.windDownHours != null ? hrs(v.windDownHours) : '–', { tip: shared, ctl: numTaps(['0', '0.5', '1'], v.windDownHours, y => up({ windDownHours: y }), 'Winding down, hours', `${p.id}:windDownHours`) }),
    line('Every hour a shift takes', p.hours.total != null ? hrs(p.hours.total) : '–', { strong: true }),
  ];
  return h('div.card.sp-card', { 'data-focus': `shift:${p.id}` },
    named ? h('h3.sp-title', {}, p.name) : null,
    h('div.fd-tiles', {},
      tile('Take-home a shift', c2(p.takeHome), 'After tax, fees and tip-out'),
      tile('The shift leaves you', S.mathButton({ id: 'M9H', value: p.real, needs: [], unit: 'money', text: p.result.text }, c2(p.real)), 'After getting there, childcare and gear'),
      tile('A real hour', hourly, p.hours.total != null ? `Over ${hrs(p.hours.total)}; on the clock ${c2(p.ownHourly)}` : 'Tap the hours below', `shift:${p.id}:hourly`)),
    vsWords ? h('p.muted.small.sp-vs', {}, vsWords) : null,
    // QUESTIONS 424 (Lindsey Swanson's lens): the same shift with tax set aside on the unreported cash tips too.
    p.ifCashTaxed ? h('p.muted.small.sp-cash', { 'data-focus': `shift:${p.id}:cashTaxed` }, 'If tax were set aside on the cash tips too: ',
      S.mathButton({ id: 'M9H', value: p.ifCashTaxed.realHourly, needs: [], unit: 'money', text: p.ifCashTaxed.text }, `${c2(p.ifCashTaxed.realHourly)} a real hour`)) : null,
    h('div.sp-cols', {},
      h('div.sp-list', {}, h('h4.sp-head', {}, 'Money a shift'), money1),
      h('div.sp-list', {}, h('h4.sp-head', {}, 'Hours a shift'), hours)));
}

function travelCtl(ctx, p, v, up) {
  const by = S.tapPick(TRAVEL_BY.map(t => [t, t === 'Ride' ? 'A ride' : t]), v.travelBy ?? null, y => up({ travelBy: y }), { label: 'Getting to a shift', key: `${p.id}:travelByPick` });
  if (v.travelBy === 'Ride' || v.travelBy === 'Transit') {
    return [by, h('span.row-line.sp-sub', {},
      S.toggle(['10', '15', '20', '30'].map(x => [x, `$${x}`]), v.travelCost == null ? null : String(v.travelCost), y => up({ travelCost: y == null ? null : Number(y) }), { label: 'Each way', clearable: true }),
      S.moneyInput(v.travelCost ?? null, y => up({ travelCost: y }), { hint: 'Each way', width: 112, key: `${p.id}:travelCost` }),
      S.toggle([['2', 'Both ways'], ['1', 'One way']], String(v.travelWays ?? 2), y => up({ travelWays: y === '2' ? null : Number(y) }), { label: 'Ways a shift' }))];
  }
  if (v.travelBy === 'Drive') {
    const rate = ctx.ref.mileage?.rate;
    return [by, h('span.row-line.sp-sub', {}, h('span.muted.small', {}, 'Miles there and back'),
      S.toggle(['10', '20', '30', '50'].map(x => [x, x]), v.milesShift == null ? null : String(v.milesShift), y => up({ milesShift: y == null ? null : Number(y) }), { label: 'Miles there and back', clearable: true }),
      numBox(v.milesShift, y => up({ milesShift: y }), { label: 'Miles there and back', key: `${p.id}:milesShift` }),
      rate != null ? h('span.muted.small.has-tip', { tabindex: 0, title: 'The IRS business rate for 2026 (IR-2025-128): gas, wear, insurance and the car losing value, in one number' }, `at ${Math.round(rate * 1000) / 10} cents a mile`) : null)];
  }
  return by;
}
function sitterCtl(p, v, up) {
  const away = (v.hoursShift ?? 0) + (v.travelHours ?? 0);
  const hoursOpts = [...new Set([away ? String(away) : null, '4', '6', '8'].filter(Boolean))];
  return h('span.row-line.sp-sub', {},
    numTaps(hoursOpts, v.sitterHours, y => up({ sitterHours: y }), 'Childcare hours a shift', `${p.id}:sitterHours`, o => (away && o === String(away) ? `All ${o} hours away` : `${o} hours`)),
    S.toggle(['15', '20', '25'].map(x => [x, `$${x} an hour`]), v.sitterRate == null ? null : String(v.sitterRate), y => up({ sitterRate: y == null ? null : Number(y) }), { label: 'Sitter rate', clearable: true }),
    S.moneyInput(v.sitterRate ?? null, y => up({ sitterRate: y }), { hint: 'An hour', width: 104, key: `${p.id}:sitterRate` }));
}
function gearCtl(p, v, up) {
  return h('span.row-line.sp-sub', {},
    S.moneyInput(v.gearCost ?? null, y => up({ gearCost: y }), { hint: 'What it costs', width: 132, key: `${p.id}:gearCost` }),
    h('span.muted.small', {}, 'lasts'),
    S.toggle(['10', '20', '30', '50'].map(x => [x, `${x} shifts`]), v.gearShifts == null ? null : String(v.gearShifts), y => up({ gearShifts: y == null ? null : Number(y) }), { label: 'Shifts it lasts', clearable: true }),
    numBox(v.gearShifts, y => up({ gearShifts: y }), { label: 'Shifts it lasts', key: `${p.id}:gearShifts` }));
}
