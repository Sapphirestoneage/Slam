// Fast Track as a mode on top of My Money (X011): one question at a time, big boxes, Enter moves on,
// a clock against the 5-minute target, and the four headline numbers at the end (R068).
import { h, clear, icon } from './dom.js';
import { moneyInput, toggle, select, textInput, labelled, summaryStrip, toast } from './staples.js';
import { applyFastTrack, fastTrackAnswers, FT_DEBTS } from '../fasttrack.js';
import { HOUSING } from '../gates.js';
import { keyNumbers } from '../math/metrics.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FREQ = [['week', 'Weekly'], ['2 weeks', 'Every 2 weeks'], ['twice a month', 'Twice a month'], ['month', 'Monthly']];

export function startFastTrack(app, ctx) {
  const a = fastTrackAnswers(ctx.store.doc);
  const started = Date.now();
  let step = 0;
  const set = patch => Object.assign(a, patch);
  const big = (v, on, hint, key) => { const f = moneyInput(v, on, { hint, key }); f.classList.add('big'); f.style.width = '220px'; return f; };
  const debtRow = ([type, label]) => h('div.ft-debt', {}, h('strong', {}, label),
    labelled('Owed, all together', big(a.debts[type].balance, v => { a.debts[type].balance = v; }, 'Add total', `ft:${type}:bal`)),
    labelled('Paying a month', big(a.debts[type].payment, v => { a.debts[type].payment = v; }, 'Add payment', `ft:${type}:pay`)),
    a.debts[type].rows > 1 ? h('span.muted.small', {}, `Already listed one by one (${a.debts[type].rows}); Fast Track leaves them as they are.`) : null);

  const STEPS = [
    { title: 'About you', help: 'Age drives the Rule of 5 and the FI timeline.', body: () => h('div.ft-grid', {},
      labelled('First name', textInput(a.firstName, v => set({ firstName: v }), { hint: 'First name', width: 220, key: 'ft:name' })),
      labelled('Born', h('span.row-line', { style: { gap: '8px', flexWrap: 'nowrap' } },
        select(MONTHS.map((m, i) => [String(i + 1), m]), a.birthMonth ? String(a.birthMonth) : null, v => set({ birthMonth: v ? Number(v) : null }), { label: 'Birth month', hint: 'Month', width: 110, key: 'ft:bm' }),
        textInput(a.birthYear, v => set({ birthYear: v && /^\d{4}$/.test(v) ? Number(v) : null }), { hint: 'Year', width: 96, key: 'ft:by' }))),
      labelled('Solo or couple', toggle(['Solo', 'Couple'], a.household, v => set({ household: v }), { label: 'Solo or couple' }))) },
    { title: 'Take-home pay', help: 'What lands in the account, after taxes. Any way they know it.', body: () => h('div.ft-grid', {},
      labelled('Take-home', big(a.takeHome, v => set({ takeHome: v }), 'Add amount', 'ft:take')),
      labelled('Per', toggle([['paycheck', 'Paycheck'], ['month', 'Month'], ['year', 'Year']], a.takePer, v => set({ takePer: v }), { label: 'Per' })),
      labelled('Paid', select(FREQ, a.payFrequency, v => set({ payFrequency: v }), { label: 'Pay frequency', hint: 'How often', width: 170, key: 'ft:freq' }))) },
    { title: 'Spending, all in', help: "Their gut: 'what do you think you spend in a month?' Kept to compare later.", body: () => h('div.ft-grid', {},
      labelled('A month, all in', big(a.gut, v => set({ gut: v }), 'Add amount', 'ft:gut')),
      labelled('Does that include debt payments?', toggle([[true, 'Yes'], [false, 'No']], a.gutIncludesDebt, v => set({ gutIncludesDebt: v }), { label: 'Includes debt payments' }))) },
    { title: 'Cash', help: 'Rough is fine. Blank if they do not know; 0 if there is none.', body: () => h('div.ft-grid', {},
      labelled('Checking', big(a.checking, v => set({ checking: v }), 'Add balance', 'ft:chk')),
      labelled('Savings or HYSA', big(a.savings, v => set({ savings: v }), 'Add balance', 'ft:sav'))) },
    { title: 'Investments', help: 'Every retirement and brokerage account together. Split it out later.', body: () => h('div.ft-grid', {},
      labelled('Invested, all accounts', big(a.invested, v => set({ invested: v }), 'Add total', 'ft:inv')),
      a.investedRows > 1 ? h('span.muted.small', {}, `Already listed one by one (${a.investedRows}); Fast Track leaves them as they are.`) : null) },
    { title: 'Home and car', help: 'What it is worth today, and what is still owed.', body: () => h('div.ft-grid', {},
      labelled('Housing', toggle(HOUSING, a.housing, v => { set({ housing: v }); draw(); }, { label: 'Housing' })),
      a.housing === 'Own' ? h('div.ft-grid', {}, labelled('Home is worth', big(a.homeValue, v => set({ homeValue: v }), 'Add value', 'ft:home')),
        labelled('Mortgage owed', big(a.mortgageBalance, v => set({ mortgageBalance: v }), 'Add balance', 'ft:mbal')),
        labelled('Mortgage a month', big(a.mortgagePayment, v => set({ mortgagePayment: v }), 'Add payment', 'ft:mpay'))) : null,
      labelled('Has a car', toggle([[true, 'Yes'], [false, 'No']], a.hasCar, v => { set({ hasCar: v }); draw(); }, { label: 'Has a car' })),
      a.hasCar ? h('div.ft-grid', {}, labelled('Car is worth', big(a.carValue, v => set({ carValue: v }), 'Add value', 'ft:car')),
        labelled('Car loan owed', big(a.carLoanBalance, v => set({ carLoanBalance: v }), 'Blank if paid off', 'ft:cbal')),
        labelled('Car loan a month', big(a.carLoanPayment, v => set({ carLoanPayment: v }), 'Add payment', 'ft:cpay'))) : null) },
    { title: 'Debts', help: 'Totals by type. Interest rates fill in as a typical Guess until you have the real ones.', body: () => h('div.stack', { style: { gap: '14px' } },
      FT_DEBTS.map(debtRow),
      h('label.check', {}, h('input', { type: 'checkbox', checked: !!a.noDebts, onchange: e => set({ noDebts: e.target.checked }) }), h('span', {}, 'No other debts'))) },
    { title: 'When should work be optional?', help: 'An age, or skip to just see the date.', body: () => h('div.ft-grid', {},
      labelled('FI age', textInput(a.fiAge, v => set({ fiAge: v === null ? null : Number(v) }), { hint: 'Age', width: 100, key: 'ft:fi' }))) },
  ];

  const overlay = h('div.ft-overlay', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Fast Track' });
  const box = h('div.ft-box');
  overlay.append(box);
  const clock = h('span.ft-clock', { 'aria-live': 'off' });
  const tick = setInterval(() => { const s = Math.round((Date.now() - started) / 1000); clock.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} of about 5:00`; }, 1000);
  const close = () => { clearInterval(tick); overlay.remove(); document.removeEventListener('keydown', keys); };
  const save = () => {
    const seconds = Math.round((Date.now() - started) / 1000);
    applyFastTrack(ctx.store, a, { seconds });
    const s = ctx.store.doc.settings.fastTrack;
    s.result = keyNumbers(ctx.metrics()); // R069: kept to measure the gap once the full detail is in
    return seconds;
  };
  const finish = () => {
    const seconds = save();
    clearInterval(tick);
    const m = ctx.metrics();
    const missing = ['netWorth', 'surplus', 'savingsRate', 'monthsToFi'].filter(k => m[k].value === null);
    clear(box,
      h('div.ft-head', {}, h('strong', {}, 'Fast Track done'), h('span.muted', {}, `${Math.floor(seconds / 60)} min ${seconds % 60} s`)),
      h('h2', { style: { margin: '8px 0 16px' } }, missing.length ? 'Almost: a lens still needs a number' : 'Every lens is on'),
      summaryStrip(ctx, [{ label: 'Net worth', result: m.netWorth, key: 'netWorth' }, { label: 'Monthly surplus', result: m.surplus, key: 'surplus' },
        { label: 'Savings rate', result: m.savingsRate, key: 'savingsRate' }, { label: 'FI date', result: m.monthsToFi, key: 'monthsToFi' }]),
      h('p.muted', {}, 'These are totals by area. Going through each tab in full detail tightens them; the gap is tracked on Coach tools.'),
      h('div.row-line', { style: { justifyContent: 'flex-end' } },
        h('button.btn', { type: 'button', onclick: () => { close(); app.go('#/my-money/profile'); } }, 'Keep going in full detail'),
        h('button.btn.primary', { type: 'button', onclick: () => { close(); app.go('#/home/prep'); } }, 'Done')));
    toast('Fast Track saved.', { undo: () => ctx.store.undo() });
  };
  const draw = () => {
    const s = STEPS[step];
    const last = step === STEPS.length - 1;
    clear(box,
      h('div.ft-head', {}, h('strong', {}, 'Fast Track'), h('span.muted', {}, `Step ${step + 1} of ${STEPS.length}`), h('span', { style: { flex: 1 } }), clock,
        h('button.icon-btn.tiny', { type: 'button', 'aria-label': 'Close without saving', 'data-tip': 'Close without saving', onclick: close }, icon('x'))),
      h('div.ft-progress', { role: 'progressbar', 'aria-valuenow': step + 1, 'aria-valuemin': 1, 'aria-valuemax': STEPS.length }, h('span', { style: { width: `${((step + 1) / STEPS.length) * 100}%` } })),
      h('h2', {}, s.title), h('p.muted', {}, s.help), s.body(),
      h('div.ft-foot', {},
        h('button.btn', { type: 'button', disabled: step === 0, onclick: () => { step -= 1; draw(); } }, 'Back'),
        h('span', { style: { flex: 1 } }),
        h('button.btn', { type: 'button', onclick: () => { save(); close(); toast('Saved what you have.', { undo: () => ctx.store.undo() }); } }, 'Save and close'),
        h('button.btn.primary', { type: 'button', onclick: () => next() }, last ? 'Finish' : 'Next', icon('right'))));
    setTimeout(() => box.querySelector('input, select')?.focus(), 30);
  };
  const next = () => { document.activeElement?.dispatchEvent?.(new Event('change')); if (step === STEPS.length - 1) finish(); else { step += 1; draw(); } };
  // Nothing is saved until Finish or Save and close; closing keeps the client as it was.
  const keys = e => {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); next(); }
  };
  document.addEventListener('keydown', keys);
  document.body.append(overlay);
  draw();
}
