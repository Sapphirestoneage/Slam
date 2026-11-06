// SPDX-License-Identifier: AGPL-3.0-only
// Batch 46 (Phase 4, Track 1: the age-only start). The plan from an age (js/math/agestart.js, M9A) on screen: on Home
// for a brand-new client, and as one slim strip at the top of Fast Track that narrows as each answer comes in. Four
// ranges (FI date, debt free, emergency fund, surplus), labeled "Typical for 25 to 34 year olds in New York", one line
// saying these are not the client's numbers yet, and the next question (Batch 43's Ask me next). Coach view always; client view follows Coach
// tools › Session › Typical at your age (QUESTIONS 208): with it off the client sees the questions, not the typical
// numbers. This file only places what the math returns.
import { h } from './dom.js';
import * as S from './staples.js';
import { priorsData } from '../priorslib.js';
import { agePlanOf, PLAN_OUTPUTS } from '../math/agestart.js';
import { typicalInClient } from './typical-ui.js';
import { STATES } from './profile.js';
import { money } from '../format.js';
import { openQuestion } from './ask-ui.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// The typical numbers show in coach view, and in client view only with the switch on.
export const agePlanShows = (app, doc) => !app.prefs?.clientView || typicalInClient(doc);

// The plan for a household, or null (no age yet, or the priors not loaded).
export function agePlanFor(ctx, doc = ctx.store.doc) {
  const data = priorsData();
  return data ? agePlanOf(doc, ctx.ref, data, { now: ctx.now() }) : null;
}

const PER = { income: ' a year before tax', spending: ' a month' };
const NAME = { income: 'Pay', spending: 'Spending', cash: 'Checking and savings', invested: 'Invested', card: 'Card balances' };
function sourcesPop(anchor, P) {
  const amt = p => (Math.round(p.low) === Math.round(p.high) ? money(p.likely) : `${money(p.low)} to ${money(p.high)}`) + (PER[p.key] ?? '');
  const line = p => h('li', { title: p.basis }, h('strong', {}, NAME[p.key] ?? p.label), ' ', h('span', {}, amt(p)), p.likely === 0 && p.high > 0 ? h('span.muted', {}, ' (most have none)') : null);
  S.popover(anchor, h('div.stack.age-plan-pop', { style: { gap: '8px' } }, h('strong', {}, 'The typical amounts in this plan'),
    h('ul.age-plan-src', {}, P.priors.map(line)),
    h('p.muted.small', { style: { margin: 0 } }, 'From public surveys (Census, BLS, the Federal Reserve). Hover a line for its source. Each answer replaces one.')), { width: 400 });
}

// The four ranges in a row (a grid of four on a wide screen, two by two on a phone).
function grid(P) {
  return h('div.age-plan-grid', {}, Object.entries(PLAN_OUTPUTS).map(([k, label]) => h('div.age-plan-cell', { 'data-plan': k },
    h('span.label', {}, label), h('strong.age-plan-num', {}, P.words[k] ?? 'Needs an answer'))));
}

// The heading: typical while every core input is, "your answers and typical for the rest" once some are answered.
function title(P) {
  if (!P.typical) return 'From your answers';
  return P.answered.length ? `Your answers so far; the rest ${P.label.replace(/^Typical/, 'typical')}` : P.label;
}

// The three facts the plan is picked by (the same About you fields), as boxes and taps on the card itself.
function facts(ctx) {
  const p = ctx.store.doc.profile || {};
  const set = patch => ctx.store.setDoc('profile', patch);
  return h('div.row-line.age-plan-ask', {},
    S.labelled('Born', h('span.row-line', { style: { gap: '8px', flexWrap: 'nowrap' } },
      S.select(MONTHS.map((m, i) => [String(i + 1), m]), p.birthMonth ? String(p.birthMonth) : null, v => set({ birthMonth: v ? Number(v) : null }), { label: 'Birth month', hint: 'Month', width: 110, key: 'plan:bm' }),
      S.textInput(p.birthYear ?? null, v => set({ birthYear: v && /^\d{4}$/.test(v) ? Number(v) : null }), { hint: 'Year', width: 96, key: 'plan:by' }))),
    S.labelled('Solo or couple', S.toggle(['Solo', 'Couple'], p.household ?? null, v => ctx.store.transaction('Solo or couple', () => { ctx.store.setDoc('profile', { household: v }); ctx.store.setDoc('client', { couple: v === 'Couple' }); }), { label: 'Solo or couple', clearable: true, key: 'plan:hh' })),
    S.labelled('State', S.select(STATES, p.state ?? null, v => set({ state: v }), { label: 'State', hint: 'State', width: 110, key: 'plan:state' })));
}

// Home, a brand-new client: the age, Solo or couple and the state as taps, then the plan from them.
export function agePlanCard(app, ctx, { onNext }) {
  const doc = ctx.store.doc;
  const P = agePlanFor(ctx);
  const shows = agePlanShows(app, doc);
  // The next question is Batch 43's Ask me next (the box whose answer the plan needs or narrows most), else Fast Track's.
  const q = P ? ctx.askNext?.(app.flags ?? [])?.top ?? null : null;
  const next = q ? h('span.row-line.age-plan-next', {}, h('span.muted.small', {}, 'Ask next:'), h('strong.small', {}, q.question.replace(/ \(nothing in yet\)$/, '')),
    S.button('Open the box', { iconName: 'right', size: 'small', onClick: () => openQuestion(app, q) }))
    : P?.next ? S.button(`Next: ${P.next.label}`, { iconName: 'right', size: 'small', tip: `Opens Fast Track at ${P.next.step}`, onClick: () => onNext(P.next.step) }) : null;
  if (!P) {
    return h('section.card.age-plan', { 'aria-label': 'A first plan from an age' },
      h('strong', {}, 'A first plan from an age'), facts(ctx),
      h('span.muted.small', {}, shows ? 'A birth year is enough for a first plan, typical for that age.' : 'A birth year starts the plan.'));
  }
  if (!shows) {
    return h('section.card.age-plan', { 'aria-label': 'A first plan' },
      h('strong', {}, 'Your plan starts with a few questions'), facts(ctx),
      h('div.row-line.age-plan-foot', {}, h('span.muted.small', {}, 'Each answer builds it.'), next));
  }
  const info = S.iconButton('info', 'Where the typical amounts come from', e => { e.stopPropagation(); sourcesPop(e.currentTarget, P); }, { tiny: true });
  return h('section.card.age-plan', { 'aria-label': 'A first plan from an age', 'data-typical': String(P.typical) },
    h('div.row-line.age-plan-head', {}, h('strong', {}, title(P)), info),
    facts(ctx),
    grid(P),
    h('div.row-line.age-plan-foot', {}, h('span.muted.small', {}, 'Not your numbers yet: each answer replaces a typical one.'), next));
}

// Fast Track: one slim strip under the progress bar, the plan from the answers given so far (applied to a copy that is
// never saved). Nothing in client view with the switch off: the questions are the screen.
export function agePlanStrip(app, ctx, doc) {
  if (!agePlanShows(app, ctx.store.doc)) return null;
  const P = agePlanFor(ctx, doc);
  if (!P) return h('div.ft-plan.muted.small', { 'data-plan': 'none' }, 'A birth year gives a first plan, typical for that age.');
  return h('div.ft-plan', { 'data-typical': String(P.typical), title: P.typical ? 'Not your numbers yet: each answer replaces a typical one' : 'From your answers' },
    h('span.ft-plan-title.small', {}, title(P)),
    h('span.ft-plan-nums.small', {}, Object.entries(PLAN_OUTPUTS).map(([k, label]) => h('span.ft-plan-num', { 'data-plan': k }, h('span.muted', {}, `${label} `), h('strong', {}, P.words[k] ?? 'needs an answer')))));
}
