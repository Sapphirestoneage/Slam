// SPDX-License-Identifier: AGPL-3.0-only
// Plan › Raise and benefits (batch 47, Phase 4 Track 2, M9B): the benefits cliff from the client's side. One slim line
// for the next line above them, then the raise tester (taps: +$1,000, +$5,000, +$10,000 a year, or a box), then caret
// sections, closed: the benefits they get now (a tap each: Getting it, Might qualify, Not on it) and how each line
// works. A household nowhere near any line gets one line and the closed taps, and nothing else. The math is
// js/math/cliff.js; this file only shows it and saves the taps (profile.cliff).
// Benchmarks (docs/BENCHMARK.md): Rocket Money and Monarch answer a what-if in one sentence with the number first;
// eMoney and RightCapital show a what-if as before, change and after; benefit screeners (the Atlanta Fed's CLIFF
// dashboard, Benefits.gov) say each program's line in dollars a year.
import { h, icon, clear } from './dom.js';
import * as S from './staples.js';
import { sec } from './sections.js';
import { money } from '../format.js';
import { metrics } from '../math/metrics.js';
import { cliffOf, cliffOn, CLIFF_STATUS, RAISE_PICKS } from '../math/cliff.js';

const head = (title, sub) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null));
const tip = text => h('span.ln-tip', { title: text, tabindex: '0', role: 'img', 'aria-label': text }, icon('info'));
const k = v => money(Math.round(v / 100) * 100);
export const RF = { raise: 5000 }; // the raise being tested: view state, never saved
const short = v => `+$${v / 1000}k`;
const RULES_WORDS = {
  snap: 'The gross income test a month. In New York: 150% of the poverty line with earnings, 200% with child care paid out of pocket or someone 60 or older, else 130%; elsewhere the federal 130% line and a net test (many states lift the line; their own page has it). The benefit is the most for the household size less 30% of net income (USDA, FY2027, from Oct 1 2026).',
  medicaid: 'Adults under 65: 138% of the poverty line in the states that expanded Medicaid. Above it, New York moves you to the Essential Plan, elsewhere to a marketplace plan with help.',
  essential: 'New York\'s free plan, up to 200% of the poverty line since July 1 2026 (the 200% to 250% band ended). Above it, a marketplace plan with the premium credit.',
  aca: 'The premium tax credit pays the benchmark plan less a share of income (2.15% to 10.22% for 2027). Over 400% of the poverty line there is no credit at all: the rule that lifted that line ended with 2025.',
  kids: 'New York: Medicaid to 154% of the poverty line (223% under age 1), Child Health Plus free to 222%, then $15 to $60 a month a child up to 400%, full price over it.',
  eitc: 'The federal credit for tax year 2026 grows with earnings, then fades on each dollar past a threshold until it runs out; New York adds 30% of it.',
};
const BASIS = { gross: 'a year before tax', magi: 'a year before tax, less pre-tax money', earned: 'a year earned' };

export function cliffScreen(app, ctx) {
  const doc = ctx.store.doc;
  const title = 'What a raise does to your benefits', sub = 'The benefit lines a raise or a new income would cross, and what you keep';
  if (!cliffOn(doc)) {
    return [head(title), h('div.card', {}, h('div.empty.center', {}, h('span.title', {}, 'Raise and benefits is a Phase 4 preview, off for this client'),
      S.button('Turn it on', { kind: 'primary', onClick: () => ctx.store.setDoc('settings', { phase4: true }) }), h('span.muted.small', {}, 'Coach tools › Session has the same switch')))];
  }
  const now = ctx.now();
  const m = metrics(doc, ctx.ref, { now }); // the household together: every line reads the whole household
  const C = cliffOf(doc, ctx.ref, { now, m });
  if (!C.has) {
    return [head(title, sub), h('div.card', {}, h('div.empty.center', {}, h('span.title', {}, 'No income yet: the lines are read against it'),
      S.button('Add income', { kind: 'primary', iconName: 'plus', onClick: () => app.go('#/cash-flow/income') })))];
  }
  if (!C.near) return [head(title, sub), h('div.card.cf-line', { 'data-focus': 'cliff' }, h('span.label', {}, 'Benefit lines'), h('span.cf-line-text', {}, C.nowhere)), nowSection(ctx, C)];
  return [head(title, sub), nextLine(C), raiseCard(ctx, doc, m), nowSection(ctx, C), howSection(C)];
}

// ---------- The next line, one slim card ----------
function nextLine(C) {
  const guessed = C.live.some(p => p.guess);
  return h('div.card.cf-line', { 'data-focus': 'cliff' }, h('span.label', {}, 'The next line'),
    h('span.cf-line-text', { title: C.nextBasis ?? null }, C.nextText ?? 'Every line on file is below what you make now.'),
    C.zonesText ? h('span.cf-line-text', {}, C.zonesText) : null,
    C.pastText ? h('span.cf-line-text.muted', {}, C.pastText) : null,
    guessed ? h('span.ln-guess-line', {}, S.guessTag(), h('span.muted.small', {}, 'Some benefits are guessed from About you: tap what you get below')) : null);
}

// ---------- The raise tester ----------
function raiseCard(ctx, doc, m) {
  const host = h('div.card.cf-raise');
  const draw = () => S.keepPlace(() => clear(host, raiseBody(ctx, doc, m, draw)));
  draw();
  return host;
}
function raiseBody(ctx, doc, m, draw) {
  const pick = v => { RF.raise = v; draw(); };
  const C = RF.raise > 0 ? cliffOf(doc, ctx.ref, { now: ctx.now(), m, raise: RF.raise }) : null;
  const R = C?.raise;
  const form = h('div.cf-ask', {}, h('span.label', {}, 'Test a raise or a new job, a year'),
    h('div.row-line.cf-picks', {}, S.tapPick(RAISE_PICKS.map(v => [v, short(v)]), RAISE_PICKS.includes(RF.raise) ? RF.raise : null, v => pick(v), { label: 'Raise to test' }),
      S.moneyInput(RAISE_PICKS.includes(RF.raise) ? null : RF.raise, v => pick(v), { hint: 'Other a year', key: 'cliff:raise', width: 140, cents: false })));
  if (!R) return [form, h('p.muted.cf-wait', {}, 'Tap a raise to see what you keep.')];
  const row = (label, v, cls = '') => h(`tr${cls}`, {}, h('td', {}, label), h('td.num', {}, `${v < 0 ? '-' : '+'}${money(Math.abs(v))}`));
  const counted = C.counted.length;
  return [form,
    h('p.cf-say', {}, h('strong', {}, R.say)),
    h('table.rows.mini.cf-table', {}, h('tbody', {},
      row('The raise after tax', R.afterTax),
      R.rows.map(r => row(r.text, -(r.amount ?? 0))),
      h('tr.cf-net', {}, h('td', {}, h('strong', {}, 'What you keep, a year')), h('td.num', {}, h('strong', {}, `${R.net < 0 ? '-' : '+'}${money(Math.abs(R.net))}`))))),
    R.mightText ? h('p.muted.small.cf-foot', {}, R.mightText) : null,
    h('p.muted.small.cf-foot', {}, counted ? `Counts the ${counted === 1 ? 'benefit' : 'benefits'} marked Getting it, as a year${C.counted.includes('snap') ? `; SNAP from the benefit formula${C.household.snapTyped !== null ? ' (your amount, less what the formula takes off)' : ''}` : ''}${C.counted.some(id => ['medicaid', 'essential', 'aca'].includes(id)) ? '; health coverage as what the next plan costs over what you pay now' : ''}.` : 'No benefit is marked Getting it, so only tax comes off.')];
}

// ---------- Your benefits now: a tap each ----------
function nowSection(ctx, C) {
  const shown = C.programs.filter(p => p.applies);
  const n = st => shown.filter(p => p.status === st).length;
  const summary = [n('Getting it') ? `${n('Getting it')} getting it` : null, n('Might qualify') ? `${n('Might qualify')} might qualify` : null].filter(Boolean).join(' · ') || 'None marked';
  const save = patch => ctx.store.setDoc('profile', { cliff: { ...(ctx.store.doc.profile.cliff || {}), ...patch } });
  return sec('cliff:now', { title: 'Your benefits now', summary, open: false, tip: 'A tap each. A status not tapped is a Guess from About you (Health coverage) and the income' },
    () => h('div.card', {}, h('table.rows.mini.cf-table.cf-now', {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Benefit'), h('th.num', {}, 'Line'), h('th.num', {}, 'Worth now'), h('th', {}, 'You'))),
      h('tbody', {}, shown.map(p => h('tr', { 'data-id': p.id },
        h('td', {}, h('span.ln-name', {}, p.label, tip(RULES_WORDS[p.id]), p.guess ? S.guessTag() : null, p.guess ? h('span.muted.small', {}, p.status) : null)),
        h('td.num', { 'data-label': 'Line', title: `${k(p.line)} ${BASIS[p.basis]}` }, p.over ? `Past ${k(p.line)}` : k(p.line)),
        h('td.num', { 'data-label': 'Worth now' }, p.status !== 'Not on it' && p.worth > 0.5 ? `${money(p.worth)} a year` : p.id === 'kids' && p.status !== 'Not on it' && C.base.kids?.cost === 0 ? 'Free' : h('span.muted', {}, 'None')),
        h('td.cf-you', { 'data-label': 'You' }, S.toggle(CLIFF_STATUS, p.guess ? null : p.status, v => save({ [p.id]: v }), { label: `${p.label}: you`, clearable: true, key: `cliff:${p.id}` })))))),
    snapExtras(C, save),
    h('p.muted.small.cf-foot', {}, 'Line: where it ends (or, for the children, where it changes), a year. Worth now: what it pays or saves you a year.')));
}
function snapExtras(C, save) {
  const p = C.programs.find(x => x.id === 'snap');
  if (!p?.applies || p.status === 'Not on it') return null;
  const H = C.household;
  const est = C.base.snap.monthly;
  return h('div.row-line.cf-extras', {},
    S.labelled('SNAP a month (the benefit letter)', h('span.row-line.ln-box', {},
      est > 0 ? S.button(`Use ${money(est)}`, { size: 'small', tip: 'What the SNAP formula gives at your income', onClick: () => save({ snapAmount: est }) }) : null,
      S.moneyInput(H.snapTyped, v => save({ snapAmount: v }), { hint: 'Add amount', cents: false, key: 'cliff:snapAmount', width: 130 }))),
    H.state === 'NY' ? S.labelled('Child care paid out of pocket', S.toggle(['Yes', 'No'], H.care ? 'Yes' : C.household.statuses.careCosts === false ? 'No' : null, v => save({ careCosts: v === null ? null : v === 'Yes' }), { label: 'Child care paid out of pocket', clearable: true, key: 'cliff:careCosts' }), { tip: 'In New York it moves the SNAP line from 150% to 200% of the poverty line' }) : null);
}

// ---------- How the lines work ----------
function howSection(C) {
  const shown = C.programs.filter(p => p.applies);
  const gone = C.programs.filter(p => !p.applies);
  return sec('cliff:how', { title: 'How the lines work', summary: `Poverty line for ${C.household.size}: ${money(C.fpl)} a year (2026)` },
    () => h('div.card', {}, h('ul.cf-how', {}, shown.map(p => h('li', {}, h('strong', {}, p.label), ` ${RULES_WORDS[p.id]}`)),
      gone.map(p => h('li.muted', {}, h('strong', {}, p.label), ` ${p.why}`))),
    h('p.muted.small.cf-foot', {}, 'Lines checked Nov 6 2026 (Assumptions tab). The marketplace benchmark is the 2027 average plan for a 40-year-old (KFF). Not here yet: child care subsidies, housing help, WIC, the Child Tax Credit.')));
}
