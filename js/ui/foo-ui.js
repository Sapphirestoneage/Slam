// SPDX-License-Identifier: AGPL-3.0-only
// Plan › FOO (Phase 3.5 section 4): the SLAM order of operations, the path of dated stops, and the original nine
// beside it on a toggle. Formatting only: js/math/foo.js places the steps and finds the flags.
import { h, icon } from './dom.js';
import * as S from './staples.js';
import { STEP_CARDS, stepSub, stepGet } from '../registry/foo.js';
import { addMonths, ymOf } from '../month.js';
import { foo, ORIGINAL } from '../math/foo.js';
import { monthName } from '../month.js';
import { money } from '../format.js';
import { gapCard } from './gap-ui.js';

export const FUI = { original: false };
export const LAUNCH_MOVES = ['Quit and take time off', 'Go part-time', 'Take a sabbatical', 'Start something of my own', 'Move somewhere cheaper'];
const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const STATUS_CLASS = { Done: 'good', 'In progress': 'roughly', Next: 'plain', Later: 'plain', Optional: 'plain', Locked: 'warn', Off: 'plain' };
import { overrideStep, clearOverride } from '../program.js';

export function fooScreen(app, ctx, { flags = [] } = {}) {
  const doc = ctx.store.doc, p = doc.profile, set = doc.settings;
  const f = foo(doc, ctx.ref, { now: ctx.now(), flags });
  const setP = patch => ctx.store.setDoc('profile', patch);
  const when = s => (s.status === 'Done' ? 'Done' : s.date ? monthName(s.date, 'short') : s.status === 'Optional' ? (s.id === '0b' ? 'Pick joy lines' : 'Nothing to fund yet') : s.status === 'Off' ? 'Off' : s.status === 'Locked' ? '' : s.left == null && s.id === '5b' ? 'Set an amount' : s.status === 'Later' ? '' : f.gap ? 'After the gap' : 'Needs a surplus');
  // The path: one stop per step, you-are-here on the current one; the dated stops open below it.
  // Items 31 to 33: short names on the tiles, a card on hover or tap, a partial bar, a click opens the full detail below.
  // Batch 11 (item 4): the card says the headline, then "Name · specifics", then "→ what you get".
  const card = s => { const c = STEP_CARDS[s.id] || {}; return h('div.foo-card', { role: 'tooltip' }, h('strong', {}, `${s.id} ${c.short ?? s.name}`), h('p.foo-sub', {}, c.full), h('p.foo-get', {}, stepGet(s.id)), h('p', {}, c.why), h('p', {}, h('b', {}, 'Problem: '), c.problem), h('p', {}, h('b', {}, 'Done when: '), c.doneWhen), h('p', {}, h('b', {}, 'Status: '), s.status, s.left ? `, ${money(s.left)} left` : '', s.date ? `, about ${monthName(s.date, 'short')}` : '')); };
  // A click on a tile opens the step's full detail below (the caret itself is clicked after this click ends, so the click-away rule leaves it open).
  const openStep = s => { const go = () => { const row = document.querySelector(`.foo-step[data-step="${s.id}"]`); const c = row?.querySelector(`[data-focus="more:foo:step:${s.id}"]`); if (c && c.getAttribute('aria-expanded') !== 'true') c.click(); row?.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    if (s.status === 'Done' && !FUI.showDone) { FUI.showDone = true; app.render(); setTimeout(go, 50); } else setTimeout(go, 0); };
  const path = h('div.card.foo-path', {},
    h('ol.foo-stops', { 'aria-label': 'Your path' }, f.steps.map(s => h(`li.foo-stop.${(s.status || '').toLowerCase().replace(' ', '-')}${f.here === s.id ? '.here' : ''}`, {},
      h('div.foo-fill', { 'aria-hidden': 'true', style: { width: `${Math.round((s.progress ?? 0) * 100)}%` } }),
      h('button.foo-tile', { type: 'button', 'aria-label': `Step ${s.id}, ${s.name} (${stepSub(s.id)}): ${s.status}. Open the detail`, onclick: () => openStep(s) }, h('span.foo-n', {}, s.id), h('span.foo-name', {}, s.name)),
      f.here === s.id ? h('span.foo-here', {}, 'You are here') : null, card(s)))),
    S.moreBlock('foo:path', () => h('ul.foo-dates', {}, f.path.map(d => h('li', {}, h('strong', {}, monthName(d.ym, 'short')), ` ${d.name}`))), { label: `Every date on the way (${f.path.length})` }));
  // A locked step: the lock and its plain reason; Unlock anyway needs a note (kept on the session record) and shows the cost in FI days.
  const unlock = (anchor, s) => { const n = h('input', { placeholder: 'Why (required)', 'aria-label': 'Why unlock it' }); S.popover(anchor, h('div.stack', { style: { gap: '8px' } }, h('strong', {}, `Unlock ${s.name} anyway`), h('span.muted.small', {}, s.prereq?.text), h('label.field', { style: { width: '300px' } }, n),
    h('div.row-line', {}, S.button('Unlock anyway', { kind: 'primary', onClick: () => { const v = n.value.trim(); if (!v) { S.toast('Say why first: the note is required.'); n.focus(); return; } S.closePop(); overrideStep(ctx.store, s.id, v); S.toast(`${s.name} unlocked. The cost shows on the step.`, { undo: () => ctx.store.undo() }); } }), S.button('Keep it locked', { onClick: S.closePop }))), { width: 360 }); };
  const lockLine = s => (s.status === 'Locked' ? h('div.foo-lock.coach-only', {}, icon('lock'), h('span', {}, s.prereq?.text), s.prereq?.needsAge ? h('a', { href: '#/home/profile' }, 'Add your age ›') : S.button('Unlock anyway', { size: 'small', onClick: e => unlock(e.currentTarget, s) }))
    : s.override ? h('div.foo-lock.coach-only', {}, h('span.tag.plain', {}, 'Unlocked by the coach'), h('span', {}, `${s.override.note} (session ${s.override.session})`), s.cost ? h('span', {}, s.cost.text) : null, S.button('Lock again', { size: 'small', onClick: () => clearOverride(ctx.store, s.id) })) : null);
  // Batch 8 (C15): the dollars beside the share. A step part-way along reads "$have of $target · $left left".
  const dollars = s => { if (!s.left) return null; const parts = (s.parts || []).filter(x => x.target != null && x.value != null); const target = parts.reduce((a, x) => a + x.target, 0), have = parts.reduce((a, x) => a + x.value, 0); return parts.length && target > 0 ? `${money(have)} of ${money(target)} · ${money(s.left)} left` : `${money(s.left)} left${s.monthly ? ' a month' : ''}`; };
  const stepRow = s => h(`div.foo-step${f.here === s.id ? '.here' : ''}${s.status === 'Locked' ? '.locked' : ''}${s.status === 'Optional' ? '.optional' : ''}`, { 'data-step': s.id },
    h('div.foo-step-head', {}, h('span.foo-n', {}, s.id), h('div.foo-names', {}, h('strong', {}, s.name), h('span.muted.small.foo-sub', {}, stepSub(s.id)), h('span.small.foo-get', {}, stepGet(s.id))), h(`span.tag.${STATUS_CLASS[s.status] || 'plain'}`, {}, s.status === 'Locked' ? [icon('lock'), ' Locked'] : s.status),
      h('span', { style: { flex: 1 } }),
      s.left ? h('span.num', {}, S.mathButton({ id: 'M69', value: s.left, needs: [], text: s.id === '3' && f.debtText ? f.debtText : `${s.name}: ${money(s.left)} left${s.monthly ? ' a month' : ''}.${s.date ? (s.flowMonthly ? ` At ${money(s.flowMonthly)} a month (the surplus${f.heavyPayments && s.id !== '3' ? ' plus the freed debt payments' : ''}, after the steps before it), about ${monthName(s.date)}.` : ` At today's surplus, about ${monthName(s.date)}.`) : ''}` }, dollars(s))) : null,
      h('span.muted.small.foo-when', {}, when(s))),
    // Batch 11 (item 1): one payoff date across the app; the date at the payment alone, in one line.
    s.id === '3' && f.gap && s.ifPaid !== undefined ? h('p.muted.small.foo-slim', {}, `If the ${money(f.heavyPayments ?? 0)} a month in payments keeps being paid: ${s.ifPaid == null ? 'never' : monthName(addMonths(ymOf(ctx.now()), s.ifPaid), 'short')}. The gap comes first.`) : null, // batch 12
    s.id === '3' && s.date && s.minimumMonths !== undefined && s.minimumMonths !== s.months ? h('p.muted.small.foo-slim', {}, `Your surplus goes here first. If only the ${money(f.heavyPayments ?? 0)} a month in payments is paid: ${s.minimumMonths == null ? 'never' : monthName(addMonths(ymOf(ctx.now()), s.minimumMonths), 'short')}.`) : null,
    lockLine(s),
    s.worthALook ? h('p.small.foo-slim.foo-worth', { title: s.worthALook.how }, s.worthALook.text) : null, // batch 12 (M80): the next best opportunity, one line; the order stays
    s.skipCost ? h('p.foo-flag.coach-only', {}, s.skipCost.text) : null, // answer 175
    s.flags?.length ? s.flags.map(fl => h('p.foo-flag', {}, fl.text)) : null,
    s.status === 'Optional' && s.id !== '0b' ? h('p.muted.small.foo-slim', {}, s.note) : S.moreBlock(`foo:step:${s.id}`, () => stepDetail(ctx, s, f), { label: 'Full detail' })); // answer 181: step 8 stays, one slim line
  const giving = p.giving || {};
  const setGiving = patch => setP({ giving: { ...giving, ...patch } });
  const settings = S.moreBlock('foo:settings', () => h('div.stack', { style: { gap: '12px' } },
    S.labelled('Giving (step 5b, beside the tax-free step)', h('div.row-line', { style: { gap: '8px' } },
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
    f.gap ? gapCard(app, ctx, undefined, { where: 'foo' }) : null, // batch 12 (item 5): the gap on top
    path, settings,
    h(`div.foo-cols${FUI.original ? '.two' : ''}`, {},
      h('div.foo-steps', {}, doneLine(f), f.steps.filter(s => s.status !== 'Done' || FUI.showDone).map(stepRow)), // item 32: done steps fold into one slim line
      FUI.original ? h('div.card.foo-original', {}, h('h2', {}, "The Money Guy's original"), h('ol', {}, ORIGINAL.map(o => h('li', {}, o))),
        h('p.muted.small', {}, 'For comparison. SLAM adds joy up front, giving at the tax-free step, income gaps, the three big e layers, Quiet Quitting FI and a launch window.')) : null)];
}

// Item 32: the done steps as one slim line, opened on request.
function doneLine(f) {
  const done = f.steps.filter(s => s.status === 'Done');
  if (!done.length) return null;
  return h('button.btn.small.done-line', { type: 'button', 'aria-expanded': String(!!FUI.showDone), onclick: () => { FUI.showDone = !FUI.showDone; document.dispatchEvent(new CustomEvent('slam:rerender')); } }, icon('check'), ` ${done.length} ${done.length === 1 ? 'step' : 'steps'} done: ${done.map(s => s.name).join(', ')}`, h('span.muted', {}, FUI.showDone ? ' (hide)' : ' (show)'));
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
