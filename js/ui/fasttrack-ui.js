// SPDX-License-Identifier: AGPL-3.0-only
// Fast Track as a mode on top of My Money (X011): one question at a time, big boxes, Enter moves on,
// a clock against the 5-minute target, and the four headline numbers at the end (R068).
import { h, clear, icon } from './dom.js';
import { moneyInput, toggle, select, tapPick, textInput, labelled, summaryStrip, toast } from './staples.js';
import { applyFastTrack, fastTrackAnswers, FT_DEBTS, needsPayFrequency, fastTrackDone } from '../fasttrack.js';
import { HOUSING, WORK } from '../gates.js';
import { MODE_NAMES } from '../registry/couples.js';
import { WHY_CHIPS, WHY_LABELS } from '../whynow.js';
import { STATES } from './profile.js';
import { keyNumbers } from '../math/metrics.js';
import { FREQ } from './money-lists.js';
import { identityWanted, identityFastTrack, identityOffer } from './identity-ui.js';
import { agePlanStrip } from './agestart-ui.js';
import { Store } from '../records.js';

const TYPICAL_FREQ = '2 weeks'; // batch 18: the most common US pay schedule, filled in when Paycheck is tapped
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Batch 8: Start until it has been finished once, then Redo.
export const fastTrackLabel = ctx => (fastTrackDone(ctx.store.doc) ? 'Redo Fast Track' : 'Start Fast Track');

export function startFastTrack(app, ctx, { then = null, at = null } = {}) { // then: what comes next (batch 14: Start session 1 and Walk me through go on to the walk); at: the step to open on (batch 46: Home's next question)
  const a = fastTrackAnswers(ctx.store.doc);
  const started = Date.now();
  let step = 0;
  let freqMsg = false; // batch 8: Next on a paycheck with no How often
  const set = patch => Object.assign(a, patch);
  const homeAsk = { housing: a.housing == null, car: a.hasCar == null }; // batch 18: set again when About you is left
  const big = (v, on, hint, key) => { const f = moneyInput(v, on, { hint, key }); f.classList.add('big'); f.style.width = '220px'; return f; };
  const debtRow = ([type, label]) => h('div.ft-debt', {}, h('strong', {}, label),
    labelled('Owed, all together', big(a.debts[type].balance, v => { a.debts[type].balance = v; }, 'Add total', `ft:${type}:bal`)),
    labelled('Paying a month', big(a.debts[type].payment, v => { a.debts[type].payment = v; }, 'Add payment', `ft:${type}:pay`)),
    a.debts[type].rows > 1 ? h('span.muted.small', {}, `Already listed one by one (${a.debts[type].rows}); Fast Track leaves them as they are.`) : null);

  // Batch 14 (item 7): About you's switches and the Why now chips on one tap screen, the same toggles and keys as
  // About you (seg:Has kids:true ...), so core About you is done when Fast Track is.
  const yn = (v, on, label) => toggle([[true, 'Yes'], [false, 'No']], v ?? null, on, { label, clearable: true });
  const chipRow = key => h('div.stack.ft-why', { style: { gap: '6px' }, 'data-why': key }, h('span.label', {}, WHY_LABELS[key]),
    h('div.picks.why-chips', { role: 'group', 'aria-label': WHY_LABELS[key] }, WHY_CHIPS[key].filter(c => c !== 'Other').map(c => {
      const on = a.chips[key].includes(c);
      return h('button.pick.why-chip', { type: 'button', 'aria-pressed': String(on), onclick: () => { a.chips[key] = on ? a.chips[key].filter(x => x !== c) : [...a.chips[key], c]; draw(); } }, on ? icon('check') : null, c);
    })));
  // Batch 18: one tap answers No for every yes or no still blank (kids, pets, car, HSA, FSA, equity pay); each stays a
  // toggle to change.
  const YES_NO = ['hasKids', 'hasPets', 'hasCar', 'hsaEligible', 'fsa', 'equityPay'];
  const noToRest = () => { for (const k of YES_NO) if (a[k] !== true && a[k] !== false) a[k] = false; draw(); };
  const taps = () => h('div.stack', { style: { gap: '14px' } },
    h('div.ft-grid.ft-taps', {},
      labelled('Kids', yn(a.hasKids, v => set({ hasKids: v }), 'Has kids')),
      labelled('Pets', yn(a.hasPets, v => set({ hasPets: v }), 'Has pets')),
      labelled('Car', yn(a.hasCar, v => set({ hasCar: v }), 'Has a car')),
      labelled('Housing', toggle(HOUSING, a.housing, v => { set({ housing: v }); draw(); }, { label: 'Housing', clearable: true })),
      // Batch 24 (QUESTIONS 248): an owned home asks its loan in one tap, so net worth never misses the mortgage.
      a.housing === 'Own' ? labelled('Home loan', toggle(['Mortgage', 'Paid off'], a.homeLoan ?? null, v => { set({ homeLoan: v }); draw(); }, { label: 'Home loan', clearable: true, key: 'ft:homeLoan' })) : null,
      labelled('HSA-eligible plan', yn(a.hsaEligible, v => set({ hsaEligible: v }), 'HSA-eligible')),
      labelled('FSA at work', yn(a.fsa, v => set({ fsa: v }), 'FSA')),
      labelled('Equity pay (ESPP, RSU)', yn(a.equityPay, v => set({ equityPay: v }), 'Equity pay')),
      YES_NO.some(k => a[k] !== true && a[k] !== false) ? labelled('The rest', h('button.btn.small', { type: 'button', 'data-focus': 'ft:no-rest', onclick: noToRest, title: 'No for every yes or no still blank; each stays a tap to change' }, 'No to the rest'), {}) : null,
      labelled('Work', select(WORK, a.workSituation, v => set({ workSituation: v }), { label: 'Work situation', hint: 'Pick one', width: 190, key: 'ft:work' })),
      a.household === 'Couple' || (a.mode && a.mode !== 'Solo') ? labelled('Household', select(MODE_NAMES, a.mode ?? null, v => set({ mode: v }), { label: 'Household mode', hint: 'Pick one', width: 190, key: 'ft:mode' })) : null,
      labelled('State', select(STATES, a.state, v => set({ state: v }), { label: 'State', hint: 'State', width: 110, key: 'ft:state' }))),
    chipRow('whyNow'), chipRow('worry'), chipRow('goalWords'));
  // Batch 18: About you and its switches on one screen (was two), Cash and Investments on one, and Home and car only
  // when there is a home or a car to value (the switches above already say which).
  const STEPS = [
    { title: 'About you', help: 'Age sets the job-loss fund target and the FI timeline. One tap each below: these add or remove whole sections everywhere; nothing is deleted.', body: () => h('div.stack', { style: { gap: '14px' } }, h('div.ft-grid', {},
      labelled('First name', textInput(a.firstName, v => set({ firstName: v }), { hint: 'First name', width: 220, key: 'ft:name' })),
      labelled('Born', h('span.row-line', { style: { gap: '8px', flexWrap: 'nowrap' } },
        select(MONTHS.map((m, i) => [String(i + 1), m]), a.birthMonth ? String(a.birthMonth) : null, v => set({ birthMonth: v ? Number(v) : null }), { label: 'Birth month', hint: 'Month', width: 110, key: 'ft:bm' }),
        textInput(a.birthYear, v => set({ birthYear: v && /^\d{4}$/.test(v) ? Number(v) : null }), { hint: 'Year', width: 96, key: 'ft:by' }))),
      labelled('Solo or couple', toggle(['Solo', 'Couple'], a.household, v => { set({ household: v }); draw(); }, { label: 'Solo or couple' }))), taps()) },
    { title: 'Take-home pay', help: 'What lands in the account, after taxes. Any way they know it.', body: () => h('div.ft-grid', {},
      labelled('Take-home', big(a.takeHome, v => set({ takeHome: v }), 'Add amount', 'ft:take')),
      labelled('Per', toggle([['paycheck', 'Paycheck'], ['month', 'Month'], ['year', 'Year']], a.takePer, v => { set({ takePer: v }); if (v === 'paycheck' && !a.payFrequency) { set({ payFrequency: TYPICAL_FREQ }); draw(); } }, { label: 'Per' })), // batch 18: every 2 weeks, the usual schedule, filled in to change
      labelled('Paid', h('span.row-line', { style: { gap: '8px' } },
        tapPick(FREQ.map(([k, t]) => [k, t.replace(/ \(.*\)$/, '')]), a.payFrequency, v => { set({ payFrequency: v }); if (v && freqMsg) { freqMsg = false; draw(); } }, { label: 'Pay frequency', key: 'ft:freq' }),
        freqMsg ? h('span.ft-msg', { role: 'alert' }, 'Pick how often they\'re paid so we can turn the paycheck into a month') : null))) },
    { title: 'Spending, all in', help: "Their gut: 'what do you think you spend in a month?' Kept to compare later.", body: () => h('div.ft-grid', {},
      labelled('A month, all in', big(a.gut, v => set({ gut: v }), 'Add amount', 'ft:gut')),
      labelled('Does that include debt payments?', toggle([[true, 'Yes'], [false, 'No']], a.gutIncludesDebt, v => set({ gutIncludesDebt: v }), { label: 'Includes debt payments' })),
      // Batch 18 (item 4): where the number comes from. A total read off statements or a budget app is not a gut guess,
      // so it counts at Estimate and the FI date narrows; a guess stays a guess.
      labelled('Where is it from?', toggle([['Gut', 'A gut guess'], ['Statements', 'Statements or an app']], a.gutFrom ?? 'Gut', v => set({ gutFrom: v }), { label: 'Where the spending number is from' }))) },
    { title: 'Cash and investments', help: 'Rough is fine. Blank if they do not know; 0 if there is none. Investments: every retirement and brokerage account together; split it out later.', body: () => h('div.ft-grid', {},
      labelled('Checking', big(a.checking, v => set({ checking: v }), 'Add balance', 'ft:chk')),
      labelled('Savings', big(a.savings, v => set({ savings: v }), 'Add balance', 'ft:sav')),
      labelled('Invested, all accounts', big(a.invested, v => set({ invested: v }), 'Add total', 'ft:inv')),
      a.investedRows > 1 ? h('span.muted.small', {}, `Already listed one by one (${a.investedRows}); Fast Track leaves them as they are.`) : null) },
    { title: 'Home and car', help: 'What it is worth today, and what is still owed.', skip: () => !homeAsk.housing && !homeAsk.car && a.housing !== 'Own' && a.hasCar !== true, body: () => h('div.ft-grid', {},
      homeAsk.housing ? labelled('Housing', toggle(HOUSING, a.housing, v => { set({ housing: v }); draw(); }, { label: 'Housing' })) : null,
      a.housing === 'Own' ? h('div.ft-grid', {}, labelled('Home is worth', big(a.homeValue, v => set({ homeValue: v }), 'Add value', 'ft:home')),
        a.homeLoan === 'Paid off' ? null : labelled('Mortgage owed', big(a.mortgageBalance, v => set({ mortgageBalance: v }), 'Add balance', 'ft:mbal')),
        a.homeLoan === 'Paid off' ? null : labelled('Mortgage a month', big(a.mortgagePayment, v => set({ mortgagePayment: v }), 'Add payment', 'ft:mpay'))) : null,
      homeAsk.car ? labelled('Has a car', toggle([[true, 'Yes'], [false, 'No']], a.hasCar, v => { set({ hasCar: v }); draw(); }, { label: 'Has a car' })) : null,
      a.hasCar ? h('div.ft-grid', {}, labelled('Car is worth', big(a.carValue, v => set({ carValue: v }), 'Add value', 'ft:car')),
        labelled('Car loan owed', big(a.carLoanBalance, v => set({ carLoanBalance: v }), 'Blank if paid off', 'ft:cbal')),
        labelled('Car loan a month', big(a.carLoanPayment, v => set({ carLoanPayment: v }), 'Add payment', 'ft:cpay'))) : null) },
    { title: 'Debts', help: 'Totals by type. Interest rates fill in as a typical Guess until you have the real ones.', body: () => h('div.stack', { style: { gap: '14px' } },
      FT_DEBTS.map(debtRow),
      h('label.check', {}, h('input', { type: 'checkbox', checked: !!a.noDebts, onchange: e => set({ noDebts: e.target.checked }) }), h('span', {}, 'No other debts'))) },
    { title: 'When should work be optional?', help: 'An age, or skip to just see the date.', body: () => h('div.ft-grid', {},
      labelled('FI age', textInput(a.fiAge, v => set({ fiAge: v === null ? null : Number(v) }), { hint: 'Age', width: 100, key: 'ft:fi' }))) },
  ];

  const live = () => STEPS.filter(x => !x.skip?.());
  if (at) step = Math.max(0, live().findIndex(x => x.title === at));
  // Batch 46 (M9A): the plan from the answers so far, typical for the age for the rest, on a copy that is never saved.
  const planSlot = h('div.ft-plan-slot');
  const planDoc = () => { const st = new Store(JSON.parse(JSON.stringify(ctx.store.doc))); try { applyFastTrack(st, a, { now: new Date().toISOString() }); } catch { /* an answer half typed: the plan as on file */ } return st.doc; };
  const replan = () => clear(planSlot, agePlanStrip(app, ctx, planDoc()));
  // Batch 20 (Rocket Surgery): on About you the count follows the answers as they are tapped (a renter with no car has
  // no Home and car step), so it never reads "Step 1 of 7" and then "Step 2 of 6".
  const total = () => { if (step !== 0) return live().length; const was = { ...homeAsk }; Object.assign(homeAsk, { housing: a.housing == null, car: a.hasCar == null }); const n = live().length; Object.assign(homeAsk, was); return n; };
  const overlay = h('div.ft-overlay', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Fast Track' });
  const box = h('div.ft-box');
  overlay.append(box);
  const recount = () => setTimeout(() => { const c = box.querySelector('.ft-count'); if (c) c.textContent = `Step ${step + 1} of ${total()}`; });
  box.addEventListener('click', recount); box.addEventListener('change', recount);
  let planTimer = null; // a typed box (change) or a tapped toggle (click) redraws the plan, once
  const replanSoon = () => { clearTimeout(planTimer); planTimer = setTimeout(() => { if (planSlot.isConnected) replan(); }, 60); };
  box.addEventListener('change', replanSoon); box.addEventListener('click', replanSoon);
  const clock = h('span.ft-clock', { 'aria-live': 'off' });
  const tick = setInterval(() => { const s = Math.round((Date.now() - started) / 1000); clock.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} of about 5:00`; }, 1000);
  const close = () => { clearInterval(tick); overlay.remove(); document.removeEventListener('keydown', keys); };
  const save = (finished = false) => {
    const seconds = Math.round((Date.now() - started) / 1000);
    applyFastTrack(ctx.store, a, { seconds, finished });
    const s = ctx.store.doc.settings.fastTrack;
    s.result = keyNumbers(ctx.metrics()); // R069: kept to measure the gap once the full detail is in
    return seconds;
  };
  const finish = () => {
    const seconds = save(true); // batch 8: the Start buttons now say Redo
    clearInterval(tick);
    doneScreen(seconds, true);
  };
  const doneScreen = (seconds, saidSaved) => {
    const m = ctx.metrics();
    const missing = ['netWorth', 'surplus', 'savingsRate', 'monthsToFi'].filter(k => m[k].value === null);
    clear(box,
      h('div.ft-head', {}, h('strong', {}, 'Fast Track done'), h('span.muted', {}, `${Math.floor(seconds / 60)} min ${seconds % 60} s`)),
      h('h2', { style: { margin: '8px 0 16px' } }, (n => (n ? `The first picture: ${n === 1 ? 'one number still needs' : `${n} numbers still need`} an answer` : 'The first picture'))(missing.filter(k => !m[k].never).length)), // batch 20: "a lens" read as jargon; a date not on this path is an answer
      summaryStrip(ctx, [{ label: 'Net worth', result: m.netWorth, key: 'netWorth' }, { label: 'Monthly surplus', result: m.surplus, key: 'surplus' },
        { label: 'Savings rate', result: m.savingsRate, key: 'savingsRate' }, { label: 'FI date', result: m.monthsToFi, key: 'monthsToFi' }]),
      h('p.muted', {}, 'Rough totals for now. Walk me through asks what is left, one box at a time, and each answer tightens them.'),
      // Batch 25 (Phase 4): an optional last step, who they are with money; Do this later is one tap.
      identityWanted(ctx) ? identityOffer(ctx, () => { document.removeEventListener('keydown', keys); identityFastTrack(app, ctx, box, { onDone: () => { document.addEventListener('keydown', keys); doneScreen(seconds, false); }, onClose: close }); }, () => doneScreen(seconds, false)) : null,
      h('div.row-line', { style: { justifyContent: 'flex-end' } },
        then ? null : h('button.btn', { type: 'button', onclick: () => { close(); app.go('#/home/profile'); } }, 'Keep going in full detail'),
        h(`button.btn${then ? '' : '.primary'}`, { type: 'button', onclick: () => { close(); app.go('#/home/session'); } }, 'Done'),
        then ? h('button.btn.primary', { type: 'button', onclick: () => { close(); then(); } }, 'Walk me through what is left', icon('right')) : null));
    if (saidSaved) toast('Fast Track saved.', { undo: () => ctx.store.undo() });
  };
  const draw = () => {
    const L = live();
    const s = L[step];
    const last = step === L.length - 1;
    clear(box,
      h('div.ft-head', {}, h('strong', {}, 'Fast Track'), h('span.muted.ft-count', {}, `Step ${step + 1} of ${total()}`), h('span', { style: { flex: 1 } }), clock,
        h('button.icon-btn.tiny', { type: 'button', 'aria-label': 'Close without saving', 'data-tip': 'Close without saving', onclick: close }, icon('x'))),
      h('div.ft-progress', { role: 'progressbar', 'aria-valuenow': step + 1, 'aria-valuemin': 1, 'aria-valuemax': total() }, h('span', { style: { width: `${((step + 1) / total()) * 100}%` } })),
      planSlot,
      h('h2', {}, s.title), h('p.muted', {}, s.help), s.body(),
      h('div.ft-foot', {},
        h('button.btn', { type: 'button', disabled: step === 0, onclick: () => { step -= 1; draw(); } }, 'Back'),
        h('span', { style: { flex: 1 } }),
        h('button.btn', { type: 'button', onclick: () => { save(); close(); toast('Saved what you have.', { undo: () => ctx.store.undo() }); } }, 'Save and close'),
        h('button.btn.primary', { type: 'button', onclick: () => next() }, last ? 'Finish' : 'Next', icon('right'))));
    replan();
    setTimeout(() => box.querySelector('input, select')?.focus(), 30);
  };
  const next = () => { document.activeElement?.dispatchEvent?.(new Event('change'));
    const L = live();
    if (L[step].title === 'Take-home pay' && needsPayFrequency(a)) { freqMsg = true; draw(); setTimeout(() => box.querySelector('select')?.focus(), 40); return; } // batch 8
    freqMsg = false;
    if (step === 0) Object.assign(homeAsk, { housing: a.housing == null, car: a.hasCar == null });
    if (step === live().length - 1) finish(); else { step += 1; draw(); } };
  // Nothing is saved until Finish or Save and close; closing keeps the client as it was.
  const keys = e => {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); next(); }
  };
  document.addEventListener('keydown', keys);
  document.body.append(overlay);
  draw();
}
