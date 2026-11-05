// SPDX-License-Identifier: AGPL-3.0-only
// Plan › FOO (Phase 3.5 section 4): the SLAM order of operations, the path of dated stops, and the original nine
// beside it on a toggle. Formatting only: js/math/foo.js places the steps and finds the flags.
import { h, icon } from './dom.js';
import * as S from './staples.js';
import { foo, ORIGINAL } from '../math/foo.js';
import { monthName } from '../month.js';
import { money } from '../format.js';

export const FUI = { original: false };
export const LAUNCH_MOVES = ['Quit and take time off', 'Go part-time', 'Take a sabbatical', 'Start something of my own', 'Move somewhere cheaper'];
const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const STATUS_CLASS = { Done: 'good', 'In progress': 'roughly', Next: 'plain', Later: 'plain', Optional: 'plain', Locked: 'warn', Off: 'plain' };
import { overrideStep, clearOverride } from '../program.js';

export function fooScreen(app, ctx, { flags = [] } = {}) {
  const doc = ctx.store.doc, p = doc.profile, set = doc.settings;
  const f = foo(doc, ctx.ref, { now: ctx.now(), flags });
  const setP = patch => ctx.store.setDoc('profile', patch);
  const when = s => (s.status === 'Done' ? 'Done' : s.date ? monthName(s.date, 'short') : s.status === 'Optional' ? 'Pick joy lines' : s.status === 'Off' ? 'Off' : s.status === 'Locked' ? '' : s.left == null && s.id === '5b' ? 'Set an amount' : s.status === 'Later' ? '' : 'Needs a surplus');
  // The path: one stop per step, you-are-here on the current one; the dated stops open below it.
  const path = h('div.card.foo-path', {},
    h('ol.foo-stops', { 'aria-label': 'Your path' }, f.steps.map(s => h(`li.foo-stop.${(s.status || '').toLowerCase().replace(' ', '-')}${f.here === s.id ? '.here' : ''}`, {},
      h('span.foo-n', {}, s.id), h('span.foo-name', {}, s.name), f.here === s.id ? h('span.foo-here', {}, 'You are here') : null))),
    S.moreBlock('foo:path', () => h('ul.foo-dates', {}, f.path.map(d => h('li', {}, h('strong', {}, monthName(d.ym, 'short')), ` ${d.name}`))), { label: `Every date on the way (${f.path.length})` }));
  // A locked step: the lock and its plain reason; Unlock anyway needs a note (kept on the session record) and shows the cost in FI days.
  const unlock = (anchor, s) => { const n = h('input', { placeholder: 'Why (required)', 'aria-label': 'Why unlock it' }); S.popover(anchor, h('div.stack', { style: { gap: '8px' } }, h('strong', {}, `Unlock ${s.name} anyway`), h('span.muted.small', {}, s.prereq?.text), h('label.field', { style: { width: '300px' } }, n),
    h('div.row-line', {}, S.button('Unlock anyway', { kind: 'primary', onClick: () => { const v = n.value.trim(); if (!v) { S.toast('Say why first: the note is required.'); n.focus(); return; } S.closePop(); overrideStep(ctx.store, s.id, v); S.toast(`${s.name} unlocked. The cost shows on the step.`, { undo: () => ctx.store.undo() }); } }), S.button('Keep it locked', { onClick: S.closePop }))), { width: 360 }); };
  const lockLine = s => (s.status === 'Locked' ? h('div.foo-lock.coach-only', {}, icon('lock'), h('span', {}, s.prereq?.text), s.prereq?.needsAge ? h('a', { href: '#/home/profile' }, 'Add your age ›') : S.button('Unlock anyway', { size: 'small', onClick: e => unlock(e.currentTarget, s) }))
    : s.override ? h('div.foo-lock.coach-only', {}, h('span.tag.plain', {}, 'Unlocked by the coach'), h('span', {}, `${s.override.note} (session ${s.override.session})`), s.cost ? h('span', {}, s.cost.text) : null, S.button('Lock again', { size: 'small', onClick: () => clearOverride(ctx.store, s.id) })) : null);
  const stepRow = s => h(`div.foo-step${f.here === s.id ? '.here' : ''}${s.status === 'Locked' ? '.locked' : ''}`, { 'data-step': s.id },
    h('div.foo-step-head', {}, h('span.foo-n', {}, s.id), h('strong', {}, s.name), h(`span.tag.${STATUS_CLASS[s.status] || 'plain'}`, {}, s.status === 'Locked' ? [icon('lock'), ' Locked'] : s.status),
      h('span', { style: { flex: 1 } }),
      s.left ? h('span.num', {}, S.mathButton({ id: 'M69', value: s.left, needs: [], text: `${s.name}: ${money(s.left)} left${s.monthly ? ' a month' : ''}.${s.date ? ` At today's surplus, about ${monthName(s.date)}.` : ''}` }, `${money(s.left)} left`)) : null,
      h('span.muted.small.foo-when', {}, when(s))),
    lockLine(s),
    s.flags?.length ? s.flags.map(fl => h('p.foo-flag', {}, fl.text)) : null,
    S.moreBlock(`foo:step:${s.id}`, () => stepDetail(ctx, s, f), { label: 'What is in it' }));
  const giving = p.giving || {};
  const setGiving = patch => setP({ giving: { ...giving, ...patch } });
  const settings = S.moreBlock('foo:settings', () => h('div.stack', { style: { gap: '12px' } },
    S.labelled('Giving (step 5b, at the Roth IRA step)', h('div.row-line', { style: { gap: '8px' } },
      S.toggle([[false, 'Off'], [true, 'On']], !!giving.on, v => setGiving({ on: v }), { label: 'Giving' }),
      giving.on ? S.toggle([['pct', '% of pay'], ['amount', 'A set amount']], giving.mode || 'pct', v => setGiving({ mode: v }), { label: 'Giving as' }) : null,
      giving.on && (giving.mode || 'pct') === 'pct' ? [S.pctInput(giving.pct ?? null, v => setGiving({ pct: v }), { hint: 'e.g. 10', key: 'foo:give-pct' }),
        S.toggle([['gross', 'of gross'], ['net', 'of take-home']], giving.base || 'gross', v => setGiving({ base: v }), { label: 'Of' })] : null,
      giving.on && giving.mode === 'amount' ? S.moneyInput(giving.amount ?? null, v => setGiving({ amount: v }), { hint: 'A month', key: 'foo:give-amt' }) : null), { note: 'Off for everyone until turned on. Giving unlocks once heavy debt is paid off. Oxygen mask on you first.' }),
    S.labelled('After launch, will you keep a job?', S.toggle([['Yes', 'Yes'], ['No', 'No']], p.keepJobAfterLaunch ?? null, v => setP({ keepJobAfterLaunch: v }), { label: 'Keep a job after launch', clearable: true }),
      { note: 'Asked once: it feeds Quiet Quitting FI (a kept job adds its match) and Barista FI' }),
    S.checkbox('Quiet Quitting FI opens the launch window', !!set.qqOpensLaunch, v => ctx.store.setDoc('settings', { qqOpensLaunch: v }), { key: 'foo:qq-opens' })), { label: 'Giving, launch and the job question' });
  return [head('FOO', 'Your order of operations: what to fund next, and when',
      S.toggle([[false, 'SLAM path'], [true, "With the Money Guy's original"]], FUI.original, v => { FUI.original = v; app.render(); }, { label: 'Show the original nine' })),
    path, settings,
    h(`div.foo-cols${FUI.original ? '.two' : ''}`, {},
      h('div.foo-steps', {}, f.steps.map(stepRow)),
      FUI.original ? h('div.card.foo-original', {}, h('h2', {}, "The Money Guy's original"), h('ol', {}, ORIGINAL.map(o => h('li', {}, o))),
        h('p.muted.small', {}, 'For comparison. SLAM adds joy up front, giving at the Roth IRA step, income gaps, the three big e layers, Quiet Quitting FI and a launch window.')) : null)];
}

function stepDetail(ctx, s, f) {
  const parts = (s.parts || []).map(pt => h('div.foo-part', {}, h('span', {}, pt.done === true ? '✓ ' : '', pt.name),
    pt.value != null ? h('span.num', {}, pt.text ? S.mathButton({ id: 'M70', value: pt.value, needs: [], text: pt.text }, money(pt.value)) : `${money(pt.value)}${pt.target != null ? ` of ${money(pt.target)}` : ''}`) : pt.left ? h('span.num', {}, `${money(pt.left)} left`) : null));
  const extra = [];
  if (s.id === '7') {
    const launch = ctx.store.doc.profile.launch || {};
    const setL = patch => ctx.store.setDoc('profile', { launch: { ...launch, ...patch } });
    const d = h('input', { type: 'month', value: launch.date || '', 'aria-label': 'Launch month' });
    d.onchange = () => setL({ date: d.value || null });
    extra.push(h('div.row-line', { style: { gap: '8px' } }, S.select(LAUNCH_MOVES, launch.move ?? null, v => setL({ move: v }), { label: 'Launch move', hint: 'Pick a launch move', width: 230 }),
      h(`label.field${launch.date ? '.filled' : ''}`, { style: { width: '170px' } }, d)));
  }
  if (s.id === '6') extra.push(h('p.muted.small', {}, `The yearly minimum for Quiet Quitting FI: ${money(f.yearlyMinimum)} (the Roth IRA limit${f.keepJob === 'Yes' ? ' plus the match from the job you keep' : ''}).`));
  return h('div.stack', { style: { gap: '6px' } }, s.note ? h('p.muted', { style: { margin: 0 } }, s.note) : null, ...parts, ...extra);
}
