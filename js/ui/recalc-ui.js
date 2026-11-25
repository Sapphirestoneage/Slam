// SPDX-License-Identifier: AGPL-3.0-only
// Recalculating on Home, Budget and Debt (Nov 25 2026). One calm card when today's numbers move a date: the old
// date, the new date, the one next turn. With it: the triage when the bills are more than the income, the emergency
// fund refill, the safe-to-fail line, the letter from your calm self (one exercise, js/exercises/calm-letter.js), and
// Done for this month.
// Formatting only: js/recalc.js and js/math/recalc.js work everything out. No red, no verdict words.
import { h } from './dom.js';
import * as S from './staples.js';
import { recalcOf, notesOf } from '../recalc.js';
import { openCalmLetter } from './exercise-letter-ui.js';
import { rcMonthName } from '../math/recalc.js';
import { money } from '../format.js';

const save = (ctx, patch) => ctx.store.setDoc('settings', { recalc: { ...notesOf(ctx.store.doc), ...patch } });
const whenOf = iso => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// The one card. where: 'home' and 'budget' show every date that moved; 'debt' shows the debt date only.
function routeCard(app, ctx, R, where) {
  const cards = where === 'debt' ? R.cards.filter(c => c.id === 'debt') : R.cards;
  if (!cards.length) return null;
  const lead = cards[0];
  return h('section.card.rc-card', { 'aria-label': 'Recalculating', 'data-rc': 'route' },
    h('div.row-line', { style: { gap: '10px', alignItems: 'baseline' } }, h('span.label', {}, 'Recalculating'), h('span.muted.small', {}, `From where you are today, against the plan kept ${whenOf(R.kept.at)}`)),
    cards.map(c => h('div.rc-dates', {},
      h('div', {}, h('span.label', {}, c.id === 'debt' ? 'Debt free was' : 'Work optional was'), h('div.rc-date.rc-old', {}, c.words.was)),
      h('span.rc-arrow', { 'aria-hidden': 'true' }, '→'),
      h('div', {}, h('span.label', {}, 'Now'), h('div.rc-date', {}, c.words.is ?? 'No date yet')),
      h('p.rc-line', {}, c.words.line))),
    h('div.row-line.rc-turn', { style: { gap: '10px' } }, h('span.label', {}, 'Your next turn'), h('strong', {}, lead.words.next),
      lead.id === 'debt' && lead.hold != null ? S.button(`Make ${money(lead.hold)} more a month the plan`, { size: 'small', onClick: () => { ctx.store.setDoc('settings', { debtExtra: (ctx.metrics().inputs.debtExtra ?? 0) + lead.hold }); S.toast(`${money(lead.hold)} more a month to debt is the plan now.`, { undo: () => ctx.store.undo() }); } }) : null,
      where !== 'debt' && lead.id === 'debt' ? S.button('Open Debt payoff', { size: 'small', iconName: 'right', onClick: () => app.go('#/plan/debt-payoff') }) : null),
    S.moreBlock(`rc:math:${where}`, () => h('div.stack.small', { style: { gap: '4px' } },
      h('span', {}, 'The old date is the one the plan gave on the day it was last kept (End session, Month end or Save snapshot).'),
      h('span', {}, 'The new date starts from today\'s balances, payments and spending. It never assumes you are where the old plan said you would be.'),
      lead.hold != null ? h('span', {}, `${money(lead.hold)} is the smallest extra amount a month, in steps of $25, that makes the one debt plan end by ${lead.words.was}.`) : null,
      h('span', {}, 'Saving a new snapshot keeps today\'s date as the plan, and this card goes away.')), { label: 'Show the math' }));
}

// When it won't all get paid: the order, what each group gets, and what to say on the phone.
function triageCard(ctx, R) {
  const T = R.triage; if (!T) return null;
  return h('section.card.rc-card', { 'aria-label': 'When it won\'t all get paid', 'data-rc': 'triage' },
    h('div.row-line', { style: { gap: '10px', alignItems: 'baseline' } }, h('span.label', {}, 'When it won\'t all get paid'), h('strong', {}, `${money(T.income)} comes in and ${money(T.total)} is due: ${money(T.short)} more than the month has.`)),
    h('p.muted.small', { style: { margin: '4px 0 8px' } }, 'Pay in this order. A roof, the lights, food and the way to work come before any lender.'),
    h('ol.rc-order', {}, T.groups.map(g => h('li', {}, h('span.rc-name', {}, g.label), h('span.muted.small', {}, `${money(g.amount)} due`),
      h('span.rc-paid', {}, g.unpaid > 0.5 ? (g.paid > 0.5 ? `${money(g.paid)} now, ${money(g.unpaid)} to arrange` : `${money(g.unpaid)} to arrange`) : 'paid in full')))),
    S.moreBlock('rc:scripts', () => h('div.stack', { style: { gap: '12px' } }, T.scripts.map(g => h('div.rc-script', {},
      h('strong', {}, `${g.label}: ${g.script.who}`), h('ul', {}, g.script.say.map(line => h('li', {}, `"${line}"`))), h('span.muted.small', {}, g.script.note)))), { label: `What to say on the phone (${T.scripts.length})` }),
    S.moreBlock('rc:triage-math', () => h('div.stack.small', { style: { gap: '4px' } },
      h('span', {}, `Income this month: ${money(T.income)} (take-home, from Income).`), h('span', {}, `Due: ${money(T.total)} (your share of each Budget line, plus each debt's payment).`),
      h('span', {}, 'The income goes to housing first, then utilities, food, transport, minimum payments, then the rest. Each gets what is left.'),
      T.open ? h('span', {}, `${T.open} ${T.open === 1 ? 'line has' : 'lines have'} no amount yet and are not counted.`) : null), { label: 'Show the math' }));
}

// The emergency fund refill, after money was used.
function refillCard(app, ctx, R) {
  const F = R.refill; if (!F) return null;
  return h('section.card.rc-card', { 'aria-label': 'Emergency fund refill', 'data-rc': 'refill' },
    h('div.row-line', { style: { gap: '10px', alignItems: 'baseline' } }, h('span.label', {}, 'Emergency fund refill'),
      h('strong', {}, F.months != null ? `Whole again by ${rcMonthName(F.ym)}` : `${money(F.gap)} to put back`),
      h('span.muted.small', {}, F.used != null ? `${money(F.used)} was used ${whenOf(F.at)}. That is what it is for.` : 'It was used. That is what it is for.')),
    h('p', { style: { margin: '6px 0 0' } }, F.months != null ? `${money(F.gap)} to put back, at ${money(F.monthly)} a month: ${F.months} ${F.months === 1 ? 'month' : 'months'}.` : 'Nothing is left over to put back yet this month. The date shows as soon as something is.'),
    h('div.row-line', { style: { gap: '10px', marginTop: '8px' } }, S.button('Open the cash layers', { size: 'small', iconName: 'right', onClick: () => app.go('#/net-worth/assets') }),
      S.button('It is back', { size: 'small', tip: 'The money is back where it was. This card goes away', onClick: () => { save(ctx, { refilled: F.id }); S.toast('Whole again. The card is put away.', { undo: () => ctx.store.undo() }); } })),
    S.moreBlock('rc:refill-math', () => h('div.stack.small', { style: { gap: '4px' } },
      h('span', {}, `Cash stood at ${money(F.target)} before${F.layers.length ? ` (it came from ${F.layers.join(', ')})` : ''} and is ${money(F.balance)} today.`),
      h('span', {}, F.monthly != null ? `${money(F.gap)} divided by ${money(F.monthly)} left over a month, rounded up.` : 'What is left over a month is the surplus on Home.')), { label: 'Show the math' }));
}

// The letter (the exercise in js/exercises/calm-letter.js): written in a calm month, shown in a hard one.
function letterCard(ctx, R) {
  if (!R.state.hard || !R.letter?.text) return null;
  return h('section.card.rc-card.rc-letter', { 'aria-label': 'A letter from your calm self', 'data-rc': 'letter' },
    h('span.label', {}, `From you, ${whenOf(R.letter.at)}`), h('p.rc-quote', {}, R.letter.text),
    h('div.row-line', {}, S.button('Change the letter', { size: 'small', onClick: e => openCalmLetter(ctx, e.currentTarget) })));
}

// Done for this month: say so and stop.
function doneCard(ctx, R) {
  if (!R.state.done) return null;
  return h('section.card.rc-card.rc-done', { 'aria-label': 'Done for this month', 'data-rc': 'done' },
    h('div.row-line', { style: { gap: '10px', alignItems: 'baseline' } }, h('strong.rc-done-head', {}, 'Done for this month.'), h('span.muted', {}, 'Nothing needs you. Close the app and enjoy it.')),
    h('div.row-line', { style: { gap: '10px', marginTop: '8px' } },
      R.letter?.text ? h('span.muted.small', {}, 'Your letter for a harder month is kept.') : h('span.muted.small', {}, 'While it is calm: a few lines to yourself for a harder month.'),
      S.button(R.letter?.text ? 'Read or change the letter' : 'Write the letter', { size: 'small', onClick: e => openCalmLetter(ctx, e.currentTarget) })));
}

// The safe-to-fail line on Budget: one fun or experiment line that can run out.
function safeCard(ctx, R) {
  const pick = S.select(R.safeChoices.map(c => [c.id, c.name]), R.safe?.id ?? null, v => { save(ctx, { safe: v }); }, { label: 'Safe-to-fail line', hint: 'Pick a line', width: 220, key: 'rc:safe' });
  const X = R.safe;
  return S.sec('budget:safe-to-fail', { title: 'Safe-to-fail line', summary: X ? `${X.name}: ${X.spent == null ? `${money(X.cap)} a month to play with` : X.ranOut ? 'used up for this month, and the plan is the same' : `${money(X.left)} left of ${money(X.cap)}`}` : 'One fun or experiment line that can run out with no effect on the plan' }, () => h('div.card.rc-safe', { 'data-rc': 'safe' },
    S.labelled('Which line is for fun or experiments', pick, { note: R.safeChoices.length ? 'From your Wants and Other lines that have an amount' : 'Add a Wants line with an amount on the Budget first' }),
    X ? h('p', { style: { margin: '10px 0 0' } }, X.spent == null ? `${money(X.cap)} a month is yours to try things with. The plan already counts all of it, used or not.`
      : X.over > 0.5 ? `${money(X.cap)} is used up, and ${money(X.over)} went past it. The first ${money(X.cap)} changes nothing in the plan; the ${money(X.over)} past it counts as spending.`
      : X.ranOut ? `${money(X.cap)} is used up for this month. Nothing in the plan moves: it counted all of it from the start. It fills again next month.`
      : `${money(X.left)} left of ${money(X.cap)} this month. Use it or not: the plan counts all of it either way.`) : null,
    X ? S.moreBlock('rc:safe-math', () => h('div.stack.small', { style: { gap: '4px' } }, h('span', {}, `The plan's spending includes this line at ${money(X.cap)} every month.`), h('span', {}, 'Spent this month comes from Month end or the calendar. Until one of them has a number, nothing is shown as spent.')), { label: 'Show the math' }) : null));
}

// The parts for one screen, in order. Nothing shows when nothing applies.
// inSession: during a session the coach is working the list, so Done for this month waits until the session ends.
export function recalcParts(app, ctx, where, { inSession = false } = {}) {
  return S.live(ctx, () => {
    let R; try { R = recalcOf(ctx.store.doc, ctx.ref, ctx.metrics(), { now: ctx.now() }); } catch (e) { console.error(e); return null; }
    const parts = where === 'home' ? [routeCard(app, ctx, R, where), triageCard(ctx, R), refillCard(app, ctx, R), letterCard(ctx, R), inSession ? null : doneCard(ctx, R)]
      : where === 'budget' ? [routeCard(app, ctx, R, where), triageCard(ctx, R), safeCard(ctx, R)]
        : [routeCard(app, ctx, R, where)];
    return parts.filter(Boolean);
  });
}
