// SPDX-License-Identifier: AGPL-3.0-only
// Plan (build phase 7): Goals with presets and solvers, These are big deals, milestones, the FI timeline,
// debt payoff, next 12 months. Scenarios stay a later phase.
import { RULES } from '../registry/assumptions.js';
import { lenderTermsControls } from './lender-ui.js';
import { fillCounter } from './counts-ui.js';
import { goalsCompletion } from '../completion.js';
import { h, clear, icon } from './dom.js';
import { simpleMath } from '../math/simple.js';
import * as S from './staples.js';
import { goalSuggestions } from '../whynow.js';
import { futureDollars } from '../math/fi.js';
import { flowWords } from '../math/flow.js';
import { gapCard } from './gap-ui.js';
import { MILESTONES, fiTargets, monthsTo, projection, ladder, solveFor } from '../plan.js';
import { movedWords } from '../sowhat.js';
import { payoffPlan, customOrder, orderCost, debtFirstPlan } from '../math/debt.js';
import { METHODS, suggestMethod } from '../registry/debt.js';
import { moneyAsTime } from '../math/fi.js';
import { compareOf, proposedOf, setProposed, clearProposed, makeProposedThePlan } from '../math/proposed.js';
import { confidenceOf } from '../program.js';
import { addMonths, ymOf, monthName, dateOf, monthsBetween } from '../month.js';
import { winSources } from './spending-ui.js';
import { money, pct } from '../format.js';
import { yearItems, usualDates, sinkingOf, takingOver } from '../year.js';
import { TUITION_GOAL } from '../community.js';
import { holidayYm } from '../math/holidays.js';
import { fiGate } from './report-ui.js';
import { fiWordsOf } from '../math/picture.js';
import { rangeLine } from './range-ui.js';
import { changeWords } from '../math/changes.js';
import { outsourceCheck } from '../math/time.js';
import { affordSection } from './afford-ui.js';
import { trueCostSections } from './truecost-ui.js';

export const PUI = { extra: 0, pace: null, bands: true, chart: 'FI timeline', extraDebt: 0, reveal: false };
const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const short = v => (Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : money(v));
const whenText = (ctx, months) => (months == null ? null : months === 0 ? 'Now' : `${monthName(addMonths(ymOf(ctx.now()), months))} (${months < 24 ? `${months} months` : `${(months / 12).toFixed(1)} years`})`);
const ageAt = (m, months) => (m.inputs.age == null || months == null ? null : Math.floor(m.inputs.age + months / 12));
const paceOf = (ref, r) => Object.entries(ref.presets.pace).find(([, v]) => Math.abs(v - r) < 1e-9)?.[0] ?? null;
// Phase 3: a calculator stays locked, with the plain reason, until its inputs qualify (js/math/picture.js).
const lockedLine = u => h('span.muted', { style: { fontSize: '1rem' } }, icon('lock'), ' Locked. ', u.reason, u.route ? [' ', h('a', { href: u.route }, 'Open ›')] : null);
const lockedCard = u => h('div.card', {}, h('div.empty.center', {}, h('span.title', {}, icon('lock'), ` ${u.label} is locked`), h('span.muted', {}, u.reason),
  u.route ? S.button('Open where it lives', { iconName: 'right', onClick: () => { location.hash = u.route; } }) : null));
// Batch 43 (QUESTIONS 341): the FI confidence tag is retired; the range line under the date says the same thing better.

// Milestone dates become wins on the calendar (R095).
winSources.push(ctx => {
  const m = ctx.metrics();
  return ctx.visible(r => r.kind === 'milestone').map(r => ({ r, p: projection(m, ctx.store.doc, r, ctx.now()) }))
    .filter(x => x.p.date && !x.p.reached).map(x => ({ name: x.r.name || x.r.type, date: x.p.date }));
});

// ---------- Goals ----------
// The FI card, Big deals and the ladder refresh in place when an assumption changes (the milestone list below
// keeps its own state, so the screen is not rebuilt).
// The FI reveal (polish item 5): opened from that agenda step, Goals puts the FI date, the Timeline's save-more
// slider and Big deals first, so all three show without scrolling at 1280px.
export function revealCard(app, ctx, m) {
  const fiWhen = m.monthsToFi.value;
  const gate = fiGate(ctx);
  const slider = S.zeroSlider({ min: -1000, max: 3000, step: 50, value: PUI.extra, label: 'Save more or less a month', key: 'reveal:save-more' });
  const out = h('strong'), result = h('span.fi-when');
  const paint = () => {
    const rr = m.fiNumber.value == null ? null : monthsTo(m, m.fiNumber.value, { realReturn: m.inputs.realReturn, extra: PUI.extra, now: ctx.now() });
    clear(out, `${PUI.extra >= 0 ? '+' : '−'}${money(Math.abs(PUI.extra))} a month`);
    clear(result, !rr ? '' : rr.reached ? 'Already there' : rr.value == null ? 'Not on this path' : `FI ${whenText(ctx, rr.value)}${ageAt(m, rr.value) != null ? `, at ${ageAt(m, rr.value)}` : ''}`);
  };
  slider.oninput = () => { PUI.extra = Number(slider.value); paint(); };
  paint();
  return h('div.card.reveal-card', {},
    h('div.row-line', { style: { gap: '24px', alignItems: 'baseline' } },
      h('div', {}, h('span.label', {}, 'FI date'), h('div.fi-big', {}, !gate.unlocked ? lockedLine(gate) : fiWhen != null ? S.mathButton(m.monthsToFi, fiWordsOf(m, null, { now: ctx.now() }).text) : m.monthsToFi.never ? S.warnTag('Not on this path') : h('span.muted', { style: { fontSize: '1rem' } }, 'Locked: ', S.needLinks(ctx, m.monthsToFi.needs))),
        gate.unlocked && fiWhen != null ? rangeLine(ctx, 'fi') : null),
      h('div', {}, h('span.label', {}, 'FI number'), h('div', { style: { fontSize: '1.5rem', fontWeight: 700 } }, m.fiNumber.value != null ? S.mathButton(m.fiNumber, money(m.fiNumber.value)) : h('span.muted', { style: { fontSize: '1rem' } }, 'Needs ', S.needLinks(ctx, m.fiNumber.needs))))),
    m.fiNumber.value != null && gate.unlocked ? h('div.slider-row', { style: { marginTop: '12px' } }, h('span.label', {}, 'Save more'), slider, out, result) : null);
}
// Answer to 11: the surplus stays surplus until you choose to invest it; the FI date says what it counts.
// Answer to 15: returns are after inflation, so the FI date already covers it (everything is in today's dollars).
function investingLine(ctx, m) {
  const iv = m.investing;
  if (!iv) return null;
  const on = iv.investSurplus;
  const r = m.debtRule || {};
  const at = mo => monthName(addMonths(ymOf(ctx.now()), mo), 'short');
  const parts = [iv.alreadyIn ? `${money(iv.alreadyIn)} from your paycheck (401(k), HSA, match)` : null, on && iv.surplus ? `your ${money(iv.surplus)} surplus` : null, on && iv.freed ? `the ${money(iv.freed)} freed from heavy debt` : null].filter(Boolean);
  // Batch 11 (item 1): while heavy debt is carried, the surplus pays it first; Invest my surplus takes over after.
  const debtLine = r.heavy ? h('span.row-line', { style: { gap: '8px' } },
    S.toggle([[1, 'Heavy debt first'], [0, 'Invest from today']], r.wanted ? 1 : 0, v => ctx.store.setDoc('assumptions', { debtFirst: v }), { label: 'Where the surplus goes while heavy debt is carried' }),
    h('span.muted.small', {}, (m.surplus.value ?? 0) < 0 ? 'The gap comes first: there is no surplus yet.' : r.on ? (m.fooFlow ? `The surplus ${flowWords(m.fooFlow, ctx.now())}.` : `Until ${m.debtRule.heavyMonths == null ? 'the heavy debt is gone' : at(m.debtRule.heavyMonths)} the surplus pays heavy debt; then it is ${on ? 'invested' : 'kept'}.`) : 'The surplus is invested from today while heavy debt is still carried.')) : null;
  return h('div.stack', { style: { gap: '6px', marginTop: '8px' } },
    h('span.muted.small', {}, (m.surplus.value ?? 0) < 0 ? `Nothing goes in from the surplus while the month is short${iv.alreadyIn ? `; ${money(iv.alreadyIn)} a month still goes in from your paycheck` : ''}. Inflation is covered: returns are after inflation.` : parts.length ? `${m.fooFlow?.waitMonths ? `After the ${r.on ? 'heavy debt and ' : ''}big e, counts` : r.on ? 'After the heavy debt, counts' : 'Counts'} ${money(iv.monthly ?? 0)} a month going in: ${parts.join(' + ')}. Inflation is covered: returns are after inflation.` : 'Nothing is going in yet. Inflation is covered: returns are after inflation.'),
    debtLine,
    h('span.row-line', { style: { gap: '8px' } },
      S.toggle([[0, 'Surplus stays surplus'], [1, 'Invest my surplus']], on ? 1 : 0, v => ctx.store.setDoc('assumptions', { investSurplus: v }), { label: 'Invest my surplus' }),
      !on && m.surplus.value > 0 ? h('span.muted.small', {}, `Investing your ${money(m.surplus.value)} a month moves the FI date sooner.`) : null));
}
export function goalsScreen(app, ctx) {
  const reveal = PUI.reveal;
  const top = h('div', {}, goalsTop(app, ctx, { reveal }));
  ctx.onRefresh(() => S.keepPlace(() => clear(top, goalsTop(app, ctx))));
  return [head('Goals', 'FI target, assumptions, milestones', S.live(ctx, () => fillCounter(app, goalsCompletion(ctx)) ?? h('span'))), S.live(ctx, () => gapCard(app, ctx, ctx.metrics(), { where: 'goals' }) ?? h('span')), affordSection(app, ctx), top, S.live(ctx, () => goalChipSuggestions(ctx)), S.recordList(ctx, { ...milestoneList(), open: false })]; // batch 14: X of Y filled in the head; batch 13: milestones start closed
}
// Batch 10 (item 4): the goal chips from About you › Why now that match a Plan goal or FOO step, each with Add. The
// coach confirms; nothing is added on its own. Not now sets one aside for this client.
function goalChipSuggestions(ctx) {
  const p = ctx.store.doc.profile;
  const list = goalSuggestions(p, ctx.visible(r => r.kind === 'milestone' || r.kind === 'event'));
  if (!list.length) return h('span');
  return S.secCard(h('div.card.goal-suggest', {}, h('div.row-line', { style: { gap: '8px' } }, h('h3', {}, 'From Why now'), h('span.muted.small', {}, 'Goals they picked. Add the ones that fit.')),
    h('div.stack', { style: { gap: '6px', marginTop: '8px' } }, list.map(g => h('div.row-line', { style: { gap: '10px', flexWrap: 'wrap' } },
      h('span', { style: { flex: '1 1 220px' } }, g.main ? '★ ' : '', h('strong', {}, g.chip), h('span.muted.small', {}, ` · ${g.step}`)),
      // Batch 12 (item 7): a FOO step is opened, not added; a Fund the Future goal is an event saved for each month.
      g.kind === 'foo' ? S.button(`Open step ${g.fooStep}`, { size: 'small', iconName: 'right', kind: 'primary', onClick: () => { location.hash = '#/plan/foo'; } })
        : g.kind === 'future' ? S.button('Add', { size: 'small', iconName: 'plus', kind: 'primary', onClick: () => { ctx.store.add('event', { name: g.name, values: { sinking: true } }); S.toast(`${g.name} added to Fund the Future: set its amount and month under Sinking funds.`, { undo: () => ctx.store.undo() }); } })
        : S.button('Add', { size: 'small', iconName: 'plus', kind: 'primary', onClick: () => { ctx.store.add('milestone', { name: g.name, values: { mode: g.type === 'Custom' ? 'date' : 'when' } }, { type: g.type }); S.toast(`${g.name} added to the milestones.`, { undo: () => ctx.store.undo() }); } }),
      S.button('Not now', { size: 'small', onClick: () => ctx.store.setDoc('profile', { goalSuggest: [...(p.goalSuggest || []), g.chip] }) }))))), 'goals:why-now', { summary: `${list.length} to add` });
}
function goalsTop(app, ctx, { reveal = false } = {}) {
  const m = ctx.metrics();
  const a = ctx.store.doc.assumptions;
  const ref = ctx.ref;
  const setA = patch => ctx.store.setDoc('assumptions', patch);
  const fiAge = a.fiAge ?? null;
  const solve = solveFor(m, fiAge);
  const fiWhen = m.monthsToFi.value;
  const gate = fiGate(ctx);
  const inflation = a.inflation ?? ref.presets.inflation.default;
  const nominal = (ctx.store.doc.settings.dollars || 'real') === 'nominal';
  const left = h('div.stack', { style: { gap: '12px' } },
    h('div.row-line', { style: { gap: '10px', alignItems: 'flex-end' } },
      S.labelled('FI age', S.textInput(fiAge, v => setA({ fiAge: v === null ? null : Number(v) }), { hint: 'Age', width: 100, key: 'g:fiAge' })),
      S.button('Just show me', { onClick: () => { setA({ fiAge: null }); S.parkProfile(ctx.store, 'fiAge').none.set(true); }, tip: 'Skip the age and show the earliest date' })),
    h('div', {}, h('span.label', {}, 'FI date'),
      h('div.fi-big', {}, !gate.unlocked ? lockedLine(gate) : fiWhen != null ? S.mathButton(m.monthsToFi, fiWordsOf(m, null, { now: ctx.now() }).text) : m.monthsToFi.never ? S.warnTag('Not on this path') : h('span.muted', { style: { fontSize: '1rem' } }, 'Locked: ', S.needLinks(ctx, m.monthsToFi.needs))),
      // Batch 41 (M9R): the likely month is the big one; the range is one quiet line under it.
      gate.unlocked && fiWhen != null ? rangeLine(ctx, 'fi') : null,
      gate.unlocked && fiWhen != null ? h('span.muted', {}, `${ageAt(m, fiWhen) != null ? `At ${ageAt(m, fiWhen)} · ` : ''}${fiWordsOf(m, null, { now: ctx.now() }).years}`) : null,
      gate.unlocked ? investingLine(ctx, m) : null,
      changesLines(ctx, m)),
    h('div', {}, h('span.label', {}, nominal ? 'FI number, in future dollars' : 'FI number'), h('div', { style: { fontSize: '1.5rem', fontWeight: 700 } }, m.fiNumber.value != null ? (nominal && fiWhen != null
      ? S.mathButton({ ...m.fiNumber, text: `${m.fiNumber.text} With ${pct(inflation)} inflation a year for ${(fiWhen / 12).toFixed(1)} years: ${money(futureDollars(m.fiNumber.value, fiWhen, inflation))} then.` }, money(futureDollars(m.fiNumber.value, fiWhen, inflation)))
      : S.mathButton(m.fiNumber, money(m.fiNumber.value))) : h('span.muted', { style: { fontSize: '1rem' } }, 'Needs ', S.needLinks(ctx, m.fiNumber.needs)))),
    solve ? h('div.solver', {}, h('strong', {}, `To reach FI at ${fiAge}:`),
      h('ul.op-list', {},
        h('li', {}, solve.save.value == null ? `Investing: needs ${solve.save.needs.join(' and ')}` : solve.extra != null && solve.extra <= 0 ? `On track: you already invest ${money(m.investing?.monthly ?? m.surplus.value)} a month (needs ${money(solve.save.value)}).` : `Invest ${money(solve.save.value)} a month${solve.extra != null ? `, ${money(solve.extra)} more than now` : ''}.`),
        h('li', {}, solve.spend.value == null ? `Or spending: ${solve.spend.needs.join(' and ')}` : `Or spend no more than ${money(solve.spend.value)} a month.`))) : null);
  const presetRow = (label, key, values, fmt, note) => h('div.preset-row', {}, h('span.label', {}, label),
    S.toggle(values.map(v => [v, fmt(v)]), a[key] ?? ref.presets[key]?.default ?? null, v => setA({ [key]: v }), { label }), note ? h('span.muted.small', {}, note) : null);
  // One control sets the return: Pace, with each % beside it, plus Hopeful (fix pass item 6: Return and Pace did the same job).
  const rr = a.realReturn ?? ref.presets.realReturn.default;
  const HOPEFUL = 0.12;
  const paces = [...['Optimistic', 'Likely', 'Pessimistic'].map(k => [ref.presets.pace[k], `${k} ${Math.round(ref.presets.pace[k] * 100)}%`]), [HOPEFUL, `Hopeful ${Math.round(HOPEFUL * 100)}%`]];
  const setDollars = v => ctx.store.setDoc('settings', { dollars: v }); // saves, undoes and redraws like any change
  const right = h('div.stack', { style: { gap: '12px' } },
    h('div.preset-row', {}, h('span.label', {}, 'Dollars'), S.toggle([['real', "Today's dollars"], ['nominal', 'Future dollars']], ctx.store.doc.settings.dollars || 'real', setDollars, { label: "Today's or future dollars" }),
      h('span.muted.small', {}, nominal ? `With ${pct(inflation)} inflation a year added until each number is reached` : 'What the money buys today; returns are already after inflation')),
    h('div.preset-row', {}, h('span.label', {}, 'Pace'), S.toggle(paces, paces.find(([v]) => Math.abs(v - rr) < 1e-9)?.[0] ?? null, v => setA({ realReturn: v }), { label: 'Pace' }),
      h('span.muted.small', {}, Math.abs(rr - HOPEFUL) < 1e-9 ? 'Hopeful: no inflation taken out' : 'Return a year, after inflation')),
    // Inflation feeds no number in real dollars, so here it is plain text; it can be picked under More with Nominal.
    h('div.preset-row', {}, h('span.label', {}, 'Inflation'), h('span', {}, `${+(inflation * 100).toFixed(1)}% a year`), h('span.muted.small', {}, nominal ? 'Used for future dollars (change it under More)' : 'Display only; returns are already after inflation')),
    presetRow('Withdrawal', 'withdrawalRate', ref.presets.withdrawalRate.values, v => `${+(v * 100).toFixed(1)}%`),
    h('div.preset-row', {}, h('span.label', {}, 'Retirement spending'), S.moneyInput(a.retirementSpending ?? null, v => setA({ retirementSpending: v }), { hint: m.inputs.spending != null ? S.moneyText(m.inputs.spending) : 'Add a month', key: 'g:retSpend' }), h('span.muted.small', {}, 'A month. Blank uses today\'s spending')),
    S.moreBlock('goals:tertiary', () => h('div.stack', { style: { gap: '12px' } },
      presetRow('Inflation', 'inflation', ref.presets.inflation.values, v => `${Math.round(v * 100)}%`, 'Used for future dollars'),
      h('div.preset-row', {}, h('span.label', {}, 'Life expectancy'), S.textInput(a.lifeExpectancy ?? null, v => setA({ lifeExpectancy: v === null ? null : Number(v) }), { hint: String(ref.defaults.lifeExpectancy), width: 90 })),
      // Worth doing (materiality), per client: hours at the real hourly wage, and a dollar floor (Eli, Nov 6).
      h('div.preset-row', {}, h('span.label', {}, 'Worth doing'), S.toggle([1, 2, 4, 8].map(v => [v, `${v} ${v === 1 ? 'hour' : 'hours'}`]), a.materialHours ?? RULES.materialHours, v => setA({ materialHours: v }), { label: 'Worth doing: hours at your real hourly wage' }),
        S.toggle([50, 100, 250, 500].map(v => [v, `at least $${v}`]), a.materialFloor ?? RULES.materialFloor, v => setA({ materialFloor: v }), { label: 'Worth doing: never under' }),
        h('span.muted.small', {}, 'A fix counts when it saves more a year than this much of your time is worth')),
      h('div.preset-row', {}, h('span.label', {}, 'Social Security'), S.tapPick(['Full scheduled', 'Reduced %', 'None'], a.socialSecurity ?? null, v => setA({ socialSecurity: v }), { label: 'Social Security' })),
      // Batch 48 (QUESTIONS 357, 360): the Lender's view reads this client's mortgage rate and taxes-and-insurance share.
      lenderTermsControls(ctx)), { label: 'More: inflation, life expectancy, worth doing, Social Security, mortgage rate' }));
  const fiCard = h('div.card.fi-card', { style: { marginBottom: '16px' } }, left, right);
  // Batch 13 (item 1): the FI date and its assumptions are the core (open); the big deals, the FI ladder and the
  // outsource lens are caret sections, closed, each with its one line.
  const fiSec = S.sec('goals:fi', { title: 'FI date and assumptions', open: true, area: 'goals', summary: fiWhen != null && gate.unlocked ? `FI ${fiWordsOf(m, null, { now: ctx.now() }).text}` : null }, fiCard);
  const deals = S.secCard(bigDealsCard(ctx, m, gate), 'goals:big-deals', { summary: m.bigDeals?.value ? `${m.bigDeals.value} moves the FI date the most` : null });
  const fiLadder = S.secCard(ladderCard(ctx, m, gate), 'goals:fi-ladder', { summary: 'Lean, Coast, Barista, Regular and Fat FI' });
  const lens = outsourceLens(ctx, m);
  return reveal ? [revealCard(app, ctx, m), deals, fiSec, fiLadder, lens] : [fiSec, deals, fiLadder, lens];
}

// Batch 15, items 6 and 13: the known changes ahead, one line each ("Benefits end Jan 2027: your month changes by
// -$3,766"). They are already in the FI date, the ladder, the debt plan and the calendar.
function changesLines(ctx, m) {
  const list = (m.inputs.changes || []).filter(c => Math.abs(c.surplus) >= 1).slice(0, 4);
  if (!list.length) return null;
  return h('div.stack.changes-ahead', { style: { gap: '2px', marginTop: '8px' } }, list.map(c => h('span.small', { title: 'Already in the FI date, the ladder and the calendar' }, changeWords(c))));
}

// Batch 15, item 12: is a service worth paying for? Cost a month against the hours it saves, at your real hourly
// wage (M17). A what-if: nothing is saved. Typical costs are faded with one tap to use them.
const OUTSOURCE = { Cleaning: { cost: 160, hours: 6 }, 'Meal prep': { cost: 300, hours: 10 }, Laundry: { cost: 80, hours: 4 }, Other: { cost: null, hours: null } };
const OUT = { what: null, cost: null, hours: null };
function outsourceLens(ctx, m) {
  const rate = m.hourly;
  const host = h('div');
  const draw = () => {
    const t = OUT.what ? OUTSOURCE[OUT.what] : null;
    const cost = OUT.cost ?? t?.cost ?? null, hrs = OUT.hours ?? t?.hours ?? null;
    const r = OUT.what ? outsourceCheck({ cost, hoursSaved: hrs }, rate) : null;
    clear(host, h('div.row-line', { style: { gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' } },
      S.labelled('Pay for', S.toggle(Object.keys(OUTSOURCE), OUT.what, v => { OUT.what = v; OUT.cost = null; OUT.hours = null; draw(); }, { label: 'Pay for' })),
      OUT.what ? S.labelled('Costs a month', S.moneyInput(OUT.cost, v => { OUT.cost = v; draw(); }, { hint: t?.cost != null ? `${money(t.cost)} typical` : 'Add amount', key: 'out:cost', width: 120 })) : null,
      OUT.what ? S.labelled('Hours it saves a month', S.toggle(['2', '4', '6', '10'], hrs == null ? null : String(hrs), v => { OUT.hours = Number(v); draw(); }, { label: 'Hours saved' })) : null),
    r ? h('p', { style: { margin: '8px 0 0' } }, r.value == null ? h('span.muted', {}, `Needs ${r.needs.join(' and ')}.`) : S.mathButton(r, r.value >= 0 ? `Worth it: your ${hrs} hours are worth ${money(r.worth)} a month at ${money(rate.value, { cents: true })} an hour, and it costs ${money(cost)}.` : `Your ${hrs} hours are worth ${money(r.worth)} a month at ${money(rate.value, { cents: true })} an hour; it costs ${money(cost)}, ${money(-r.value)} more.`)) : null,
    rate?.guess && OUT.what ? h('span.muted.small', {}, 'Your hourly wage is a guess until work hours are in (About you).') : null);
  };
  draw();
  return S.sec('goals:outsource', { title: 'Is it worth paying for?', summary: `Your time at ${rate?.value ? `${money(rate.value, { cents: true })} an hour` : 'your hourly wage'}` }, () => h('div.card.outsource', {}, host)); // batch 13: a caret section like the rest
}

// These are big deals (M56): one assumption at a time; click an option to use it.
function bigDealsCard(ctx, m, gate) {
  const bd = m.bigDeals;
  const a = ctx.store.doc.assumptions;
  if (!gate.unlocked) return h('div.card', { style: { marginBottom: '16px' } }, h('div.section-title.area-goals', {}, h('h2', {}, 'These are big deals')), h('p', { style: { margin: 0 } }, lockedLine(gate)));
  if (bd.value === null) return h('div.card', { style: { marginBottom: '16px' } }, h('div.section-title.area-goals', {}, h('h2', {}, 'These are big deals')), h('p.muted', {}, 'Needs invested, monthly investing and spending to compare FI dates.'));
  const maxSpread = Math.max(1, ...bd.rows.map(r => r.spread ?? 0));
  const cur = { Return: a.realReturn ?? ctx.ref.presets.realReturn.default, 'Withdrawal rate': a.withdrawalRate ?? ctx.ref.presets.withdrawalRate.default, Spending: 1 };
  const key = { Return: 'realReturn', 'Withdrawal rate': 'withdrawalRate' };
  return h('div.card', { style: { marginBottom: '16px' } },
    h('div.section-title.area-goals', {}, h('h2', {}, 'These are big deals')),
    h('p', {}, h('span.mover', {}, `${bd.value} moves the FI date the most`), h('span.muted', {}, `: ${bd.rows[0].spread} months between its options.`)),
    h('div.deals', {}, bd.rows.map(row => h('div.deal', {},
      h('div', {}, h('strong', {}, row.assumption), h('div.rung-bar', { style: { marginTop: '6px' }, title: `${row.spread ?? 0} months apart` }, h('span', { style: { width: `${((row.spread ?? 0) / maxSpread) * 100}%` } }))),
      h('div.deal-opts', {}, row.presets.map(p => h('button.deal-opt', { type: 'button', 'aria-pressed': String(Math.abs(p.preset - cur[row.assumption]) < 1e-9),
        disabled: !key[row.assumption], title: key[row.assumption] ? 'Use this' : 'Spending is changed on Budget',
        onclick: () => key[row.assumption] && ctx.store.setDoc('assumptions', { [key[row.assumption]]: p.preset }) },
      p.label || (row.assumption === 'Return' || row.assumption === 'Withdrawal rate' ? `${+(p.preset * 100).toFixed(1)}%` : p.preset),
      h('small', {}, p.months == null ? 'never' : whenText(ctx, p.months)?.replace(/ \(.*/, '') ?? ''))))))));
}

// Milestone ladder (M55): each FI step filled by %.
function ladderCard(ctx, m, gate = { unlocked: true }) {
  const doc = ctx.store.doc;
  const t = fiTargets(m, doc);
  const l = ladder(m, doc);
  return h('div.card', { style: { marginBottom: '16px' } }, h('div.section-title.area-goals', {}, h('h2', {}, 'The FI ladder')),
    l.value === null ? h('p.muted', {}, 'Needs ', S.needLinks(ctx, ['invested'])) :
      h('div.ladder', {}, ['Lean FI', 'Coast FI', 'Barista FI', 'Regular FI', 'Fat FI'].map(k => {
        const v = l.value[k];
        const when = t[k]?.value != null && gate.unlocked ? monthsTo(m, t[k].value, { now: ctx.now() }) : null; // dates wait for the FI date to unlock
        const future = (doc.settings.dollars || 'real') === 'nominal' && t[k]?.value != null && when?.value != null ? futureDollars(t[k].value, when.value, m.inputs.inflation) : null;
        return h('div.rung', {}, h('strong', {}, k, future != null ? h('span.muted.small', {}, ` ${money(future)} then`) : null), h('div.rung-bar', { title: v == null ? 'Needs numbers' : pct(Math.min(1, v)) }, h('span', { style: { width: `${v == null ? 0 : Math.min(100, v * 100)}%` } })),
          h('span.muted.small', {}, v == null ? (k === 'Barista FI' ? 'Add part-time income' : 'Needs numbers') : when?.reached ? `${pct(Math.min(1, v))} · reached` : `${pct(Math.min(1, v))}${when?.value != null ? ` · ${monthName(addMonths(ymOf(ctx.now()), when.value), 'short')}` : ''}`));
      })));
}

function milestoneList() {
  return {
    kind: 'milestone', area: 'goals', title: 'Milestones', thing: { one: 'milestone', plural: 'milestones' },
    filter: r => r.kind === 'milestone',
    picker: ctx => ({ top: ['Coast FI', 'Regular FI', 'Debt free', 'Lean FI'], other: ctx.store.doc.session?.community ? [...MILESTONES, TUITION_GOAL] : MILESTONES }),
    newValues: type => ({ name: type === 'Custom' ? null : type, values: { mode: type === 'Custom' || type === TUITION_GOAL ? 'date' : 'when' } }),
    coreFields: ['name'],
    columns: [
      { label: 'Milestone', render: (ctx, r, m, up) => S.textInput(r.name, v => up({ name: v }), { hint: r.type || 'Name it', width: 170, key: `${r.id}:name` }) },
      { label: 'At a date or when true', render: (ctx, r, m, up) => S.toggle([['date', 'At a date'], ['when', 'When true']], r.values.mode || 'when', v => up({ mode: v }), { label: 'At a date or when true' }) },
      { label: 'Date or condition', render: (ctx, r, m, up) => {
        if ((r.values.mode || 'when') === 'date') {
          const d = h('input', { type: 'date', value: r.values.date || '', 'aria-label': 'Date' });
          d.onchange = () => up({ date: d.value || null });
          return h(`label.field${r.values.date ? '.filled' : ''}`, { style: { width: '170px' } }, d);
        }
        return r.type === 'Custom' ? S.textInput(r.values.condition, v => up({ condition: v }), { hint: 'When this is true', width: 220 })
          : h('span.muted', {}, r.type === 'Debt free' ? 'When every debt is paid' : `When investments reach ${r.type}`);
      } },
      { label: 'Projected', render: (ctx, r) => { const p = projection(ctx.metrics(), ctx.store.doc, r, ctx.now()); return h(`span${p.reached ? '.tag.good' : p.date ? '.computed' : '.muted'}`, {}, p.reached ? '✓ Reached' : p.text); } },
      // Session 4: each goal gets an amount, a horizon and a need, want or wish tag (an FI milestone's amount is its target).
      { label: 'Amount', render: (ctx, r, m, up) => { const t = fiTargets(ctx.metrics(), ctx.store.doc)[r.type]?.value ?? null; return r.amount == null && t != null ? h('span.computed', { title: 'The target' }, money(t)) : S.moneyInput(r.amount, v => up({ amount: v }), { hint: 'Add amount', key: `${r.id}:amount` }); } },
      { label: 'Short or long term', render: (ctx, r, m, up) => S.toggle([['Short term', 'Short'], ['Long term', 'Long']], r.values.horizon ?? null, v => up({ horizon: v }), { label: 'Short or long term', clearable: true }) },
      { label: 'Need, want or wish', render: (ctx, r, m, up) => S.toggle(['Need', 'Want', 'Wish'], r.values.tag ?? null, v => up({ tag: v }), { label: 'Need, want or wish', clearable: true, key: `${r.id}:tag` }) },
      { label: 'Whose', couple: true, render: (ctx, r, m, up) => S.ownerToggle(ctx, r, up) }, // F2
    ],
    secondary: (ctx, r) => [
      r.type === 'Barista FI' ? S.labelled('Part-time income a month', S.moneyInput(ctx.store.doc.assumptions.partTimeIncome ?? null, v => ctx.store.setDoc('assumptions', { partTimeIncome: v }), { hint: 'Add income' }), { note: 'Barista FI only' }) : null,
      fiTargets(ctx.metrics(), ctx.store.doc)[r.type]?.value != null ? S.labelled('Target', h('span.computed', {}, money(fiTargets(ctx.metrics(), ctx.store.doc)[r.type].value))) : null],
  };
}

// ---------- Timeline ----------
export function timelineScreen(app, ctx) {
  const m = ctx.metrics();
  const ref = ctx.ref;
  const gate = fiGate(ctx);
  if (!gate.unlocked) return [head('Timeline', 'Invested balance rising to your FI number'), lockedCard(gate)];
  if (m.fiNumber.value === null || m.inputs.invested === null || m.surplus.value === null) {
    const needs = [...new Set([...m.fiNumber.needs, ...m.surplus.needs, ...(m.inputs.invested === null ? ['invested'] : [])])];
    return [head('Timeline', 'Invested balance rising to your FI number'), h('div.card', {}, S.chartEmpty(ctx, needs.length ? needs : ['a plan that reaches FI']))];
  }
  const pace = PUI.pace || paceOf(ref, m.inputs.realReturn) || 'Likely';
  const r = ref.presets.pace[pace] ?? m.inputs.realReturn;
  const res = monthsTo(m, m.fiNumber.value, { realReturn: r, extra: PUI.extra, now: ctx.now() });
  const sr = m.inputs.takeHome ? (m.surplus.value + PUI.extra) / m.inputs.takeHome : null;
  const slider = S.zeroSlider({ min: -1000, max: 3000, step: 50, value: PUI.extra, label: 'Save more or less a month' }); // batch 11 (item 7): fill from the zero mark
  const out = h('strong', {}, `${PUI.extra >= 0 ? '+' : '−'}${money(Math.abs(PUI.extra))} a month`);
  const result = h('span.fi-when');
  const host = h('div.chart', { style: { height: '340px' } });
  const paint = () => {
    const rr = monthsTo(m, m.fiNumber.value, { realReturn: r, extra: PUI.extra, now: ctx.now() });
    clear(out, `${PUI.extra >= 0 ? '+' : '−'}${money(Math.abs(PUI.extra))} a month`);
    // Batch 34 (Rocket Surgery): what the extra moves, in words, so the coach can say "6 months sooner".
    const base = PUI.extra ? monthsTo(m, m.fiNumber.value, { realReturn: r, extra: 0, now: ctx.now() }) : null;
    const moved = base && !rr.reached ? movedWords({ fi: base.value }, { fi: rr.value }, ctx.now()) : null;
    clear(result, rr.reached ? 'Already there' : rr.value == null ? 'Not on this path' : `FI ${whenText(ctx, rr.value)}${ageAt(m, rr.value) != null ? `, at ${ageAt(m, rr.value)}` : ''}`,
      moved ? h('span.fi-moved', {}, ` · ${moved.replace(/^FI /, '').replace(/ \([^)]*\)$/, '')} than now`) : null);
    drawTimeline(host, ctx, m, r);
  };
  slider.oninput = () => { PUI.extra = Number(slider.value); paint(); };
  slider.onchange = () => app.render();
  queueMicrotask(paint);
  return [head('Timeline', 'Invested balance rising to your FI number'),
    h('div.card', { style: { marginBottom: '16px' } },
      h('div.slider-row', {}, h('span.label', {}, 'Save more'), slider, out,
        S.toggle([100, 250, 500, 1000].map(n => [n, `+${money(n)}`]), PUI.extra, v => { PUI.extra = v ?? 0; app.render(); }, { label: 'Save more a month', clearable: true }), // batch 34: the usual amounts are one tap
        PUI.extra ? S.button('Reset', { size: 'small', onClick: () => { PUI.extra = 0; app.render(); } }) : null),
      h('div.slider-row', { style: { marginTop: '10px' } }, h('span.label', {}, 'Pace'), S.toggle(['Optimistic', 'Likely', 'Pessimistic'], pace, v => { PUI.pace = v; app.render(); }, { label: 'Pace' }),
        S.checkbox('Show all three paces', PUI.bands, v => { PUI.bands = v; app.render(); }),
        h('span', { style: { flex: 1 } }), S.select(['FI timeline', 'Savings rate to years', 'Crossover point'], PUI.chart, v => { PUI.chart = v || 'FI timeline'; app.render(); }, { label: 'Chart', hint: 'FI timeline', width: 210 })),
      h('p', { style: { marginTop: '12px', fontSize: '1.125rem' }, 'data-focus': 'fi:when' }, result, sr != null ? h('span.muted', {}, ` · savings rate ${pct(Math.max(0, sr))}`) : null),
      PUI.chart === 'Savings rate to years' ? simpleLine(m, r) : null),
    h('div.card', {}, host)];
}
function drawTimeline(host, ctx, m, r) {
  if (!window.echarts) return; // no chart library (offline): draw nothing rather than retry forever
  if (!host.isConnected) { setTimeout(() => host.isConnected && drawTimeline(host, ctx, m, r), 50); return; } // a task, never a microtask loop
  const t = S.chartTheme('goals');
  const inv = m.inputs.invested, save = m.surplus.value + PUI.extra, target = m.fiNumber.value;
  const yearsOut = n => { const pts = [inv]; let b = inv; const g = (1 + n) ** (1 / 12); for (let k = 1; k <= 12 * 50; k++) { b = b * g + save; if (k % 12 === 0) pts.push(b); } return pts; };
  const hit = monthsTo(m, target, { realReturn: r, extra: PUI.extra }).value;
  const years = Math.min(50, Math.max(5, Math.ceil(((hit ?? 30 * 12) / 12) * 1.25)));
  const xs = Array.from({ length: years + 1 }, (_, k) => k);
  let option;
  if (PUI.chart === 'Savings rate to years') {
    // M72 Shockingly Simple Math (js/math/simple.js): the curve from $0, your savings rate as a dot on it, the next 5% step.
    const sm = simpleMath({ savingsRate: m.savingsRate.value == null ? null : Math.max(0, m.savingsRate.value), realReturn: r, withdrawalRate: m.inputs.withdrawalRate });
    const pts = (sm.curve || []).filter(c => c.rate <= 0.9).map(c => [Math.round(c.rate * 100), c.years == null ? null : +c.years.toFixed(1)]);
    const mine = sm.you?.years != null ? [{ value: [Math.round(sm.you.rate * 100), +sm.you.years.toFixed(1)], name: 'You' }] : [];
    if (sm.next?.years != null && sm.you?.years != null) mine.push({ value: [Math.round(sm.next.rate * 100), +sm.next.years.toFixed(1)], name: 'Next 5%', itemStyle: { color: t.card, borderColor: t.text, borderWidth: 2 } });
    option = {
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 56, right: 24, top: 24, bottom: 40 }, tooltip: { trigger: 'item', formatter: p => `${p.value[0]}% saved → ${p.value[1]} years` },
      xAxis: { type: 'value', name: 'Savings rate %', nameLocation: 'middle', nameGap: 28, min: 0, max: 90, axisLabel: { color: t.text2 } },
      yAxis: { type: 'value', name: 'Years to FI', axisLabel: { color: t.text2 }, splitLine: { lineStyle: { color: t.line } } },
      series: [{ type: 'line', data: pts, smooth: true, showSymbol: false, lineStyle: { color: t.area, width: 3 } },
        { type: 'scatter', data: mine, symbolSize: 16, itemStyle: { color: t.text }, label: { show: true, formatter: p => p.name, position: 'top', color: t.text, fontWeight: 700 } }],
    };
  } else if (PUI.chart === 'Crossover point') {
    const bal = yearsOut(r).slice(0, years + 1);
    const spend = m.inputs.retirementSpending;
    option = {
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 64, right: 24, top: 32, bottom: 32 }, legend: { top: 0, textStyle: { color: t.text2 } }, tooltip: { trigger: 'axis', valueFormatter: v => money(v) },
      xAxis: { type: 'category', data: xs.map(x => `${x}y`), axisLabel: { color: t.text2 } },
      yAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
      series: [{ name: 'Investment income a month', type: 'line', data: bal.map(b => Math.round(b * m.inputs.withdrawalRate / 12)), showSymbol: false, lineStyle: { color: t.area, width: 3 } },
        { name: 'Spending a month', type: 'line', data: xs.map(() => Math.round(spend)), showSymbol: false, lineStyle: { color: t.text2, type: 'dashed', width: 2 } }],
    };
  } else {
    const main = yearsOut(r).slice(0, years + 1);
    const lo = yearsOut(ctx.ref.presets.pace.Pessimistic).slice(0, years + 1), hi = yearsOut(ctx.ref.presets.pace.Optimistic).slice(0, years + 1);
    const flags = ctx.visible(x => x.kind === 'milestone').map(x => ({ x, p: projection(m, ctx.store.doc, x, ctx.now()) })).filter(o => o.p.months != null && o.p.months / 12 <= years);
    option = {
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 64, right: 24, top: 32, bottom: 32 }, tooltip: { trigger: 'axis', valueFormatter: v => money(v) },
      xAxis: { type: 'category', data: xs.map(x => (m.inputs.age != null ? `${Math.floor(m.inputs.age + x)}` : `${x}y`)), axisLabel: { color: t.text2 } },
      yAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
      series: [
        ...(PUI.bands ? [{ name: 'Pessimistic', type: 'line', data: lo.map(Math.round), stack: 'band', showSymbol: false, lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
          { name: 'Optimistic', type: 'line', data: hi.map((v, k) => Math.round(v - lo[k])), stack: 'band', showSymbol: false, lineStyle: { opacity: 0 }, areaStyle: { color: t.area, opacity: 0.14 }, tooltip: { show: false } }] : []),
        { name: 'Invested', type: 'line', data: main.map(Math.round), showSymbol: false, lineStyle: { color: t.area, width: 3 },
          markLine: { symbol: 'none', silent: true, data: [{ yAxis: Math.round(target), lineStyle: { color: t.text, type: 'dashed' }, label: { formatter: `FI ${short(target)}`, color: t.text, position: 'insideEndTop' } },
            ...flags.map(o => ({ xAxis: String(m.inputs.age != null ? Math.floor(m.inputs.age + Math.round(o.p.months / 12)) : `${Math.round(o.p.months / 12)}y`), lineStyle: { color: t.text2, type: 'dotted' }, label: { formatter: o.x.name || o.x.type, color: t.text2, position: 'insideEndTop' } }))] } }],
    };
  }
  const c = window.echarts.getInstanceByDom(host) || window.echarts.init(host, null, { renderer: 'svg' });
  c.setOption(option, true);
  if (!host._ro) { host._ro = new ResizeObserver(() => c.resize()); host._ro.observe(host); }
}

// ---------- Debt payoff ----------
const ORDER_NAMES = METHODS.map(m => [m.id, m.name]); // F3: one config
// R075: a 0% promo ending within 60 days jumps to the top and warns.
export function promoSoon(ctx) {
  const now = ctx.now();
  return ctx.visible(r => r.kind === 'debt' && r.values.promoEnd).filter(r => {
    const end = Date.parse(`${r.values.promoEnd.length === 7 ? `${r.values.promoEnd}-01` : r.values.promoEnd}T00:00:00Z`);
    return end >= now.getTime() - 86400000 && end - now.getTime() <= 60 * 86400000;
  });
}
// Batch 11: every order is the one debt plan's shape (the surplus to heavy debt first while the debt rule is on, a
// promo ending soon first), so the order in use with no what-if extra is exactly the date every other screen shows.
export function planDebts(ctx, { order, extra = 0 } = {}) {
  const m = ctx.metrics(), x = m.inputs;
  return debtFirstPlan(x.debts, { order: order || x.debtOrder, ids: ctx.store.doc.settings.debtCustomOrder || [], first: promoSoon(ctx).map(r => r.id), surplus: m.debtRule?.toDebt ?? 0, extra: (x.debtExtra ?? 0) + extra, surplusFrom: m.debtPlan?.surplusFrom ?? 0 });
}
export function payoffScreen(app, ctx) {
  const m = ctx.metrics();
  const ds = m.inputs.debts.filter(d => !d.inFull && d.balance > 0);
  if (!ds.length) return [head('Debt payoff', 'Each debt shrinking to zero'), h('div.card', {}, h('div.empty.center', {}, h('span.title', {}, ctx.gates().areas.debt === false ? 'No debt, per About you' : 'No debts to pay off'),
    S.button('Open Debt', { iconName: 'right', onClick: () => app.go('#/net-worth/debt') }))), ...trueCostSections(app, ctx, { hasDebt: false })]; // batch 29: borrowing is still a question
  const usable = ds.filter(d => d.apr != null && d.payment != null);
  if (!usable.length) return [head('Debt payoff', 'Each debt shrinking to zero'), h('div.card', {}, S.chartEmpty(ctx, ['a balance and a payment']))];
  const gate = fiGate(ctx).payoff;
  if (!gate.unlocked) return [head('Debt payoff', 'Each debt shrinking to zero'), lockedCard(gate)];
  const order = m.inputs.debtOrder;
  const setOrder = v => { ctx.store.doc.settings.debtOrder = v; ctx.store._emit({ type: 'settings' }); app.render(); };
  const soon = promoSoon(ctx);
  const plans = Object.fromEntries(ORDER_NAMES.map(([k]) => [k, planDebts(ctx, { order: k, extra: PUI.extraDebt })]));
  const p = plans[order];
  // F3: a suggestion from the client's stress (never forced), the custom order dragged into place, and what it costs against Avalanche.
  const sug = suggestMethod({ feeling: confidenceOf(ctx.store.doc).value, debts: usable }); // answer 162: Confidence drives the suggestion
  const sugName = METHODS.find(x => x.id === sug.id)?.name ?? sug.id;
  const suggestion = h('div.row-line', { style: { gap: '8px', marginTop: '8px' } }, h('span.muted.small', {}, `Suggested: ${sugName} (${sug.why})`), sug.id !== order ? S.button(`Use ${sugName}`, { size: 'small', onClick: () => setOrder(sug.id) }) : h('span.tag.plain', {}, 'In use'));
  const ids = ctx.store.doc.settings.debtCustomOrder || [];
  const setIds = list => { ctx.store.setDoc('settings', { debtCustomOrder: list }); app.render(); };
  const sorted = customOrder(usable, ids);
  const move = (i, j) => { const list = sorted.map(d => d.id); if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; setIds(list); };
  let dragFrom = null;
  const customList = order === 'custom' ? h('div.custom-order', { style: { marginTop: '10px' } }, h('span.muted.small', {}, 'Drag a debt into place, or use the arrows. The extra goes to the top one first.'),
    h('div.stack', { style: { gap: '4px', marginTop: '6px' } }, sorted.map((d, i) => { const row = h('div.row-line.drag-row', { draggable: 'true', style: { gap: '8px' }, 'aria-label': `${d.name}, position ${i + 1}` },
      h('span.drag-handle', { 'aria-hidden': 'true' }, '⋮⋮'), h('span.rank', {}, `${i + 1}`), h('strong', { style: { flex: 1 } }, d.name), h('span.muted.small', {}, `${money(d.balance)} at ${pct(d.apr)}`),
      S.iconButton('up', `Move ${d.name} up`, () => move(i, i - 1), { tiny: true }), S.iconButton('down', `Move ${d.name} down`, () => move(i, i + 1), { tiny: true }));
      row.ondragstart = e => { dragFrom = i; e.dataTransfer.effectAllowed = 'move'; row.classList.add('dragging'); };
      row.ondragend = () => row.classList.remove('dragging');
      row.ondragover = e => { e.preventDefault(); row.classList.add('over'); };
      row.ondragleave = () => row.classList.remove('over');
      row.ondrop = e => { e.preventDefault(); row.classList.remove('over'); if (dragFrom == null || dragFrom === i) return; const list = sorted.map(x => x.id); const [x] = list.splice(dragFrom, 1); list.splice(i, 0, x); dragFrom = null; setIds(list); };
      return row; }))) : null;
  const cost = order === 'custom' ? orderCost(usable, { order: 'custom', ids, extra: PUI.extraDebt }) : null;
  const costDays = cost?.extraInterest != null ? moneyAsTime({ amount: cost.extraInterest, hourlyWage: m.hourly?.value ?? null, annualSpending: m.annualSpending }).value : null;
  const slider = h('input', { type: 'range', min: 0, max: 2000, step: 25, value: PUI.extraDebt, 'aria-label': 'Extra a month' });
  const out = h('strong', {}, `${money(PUI.extraDebt)} extra a month`);
  slider.oninput = () => { PUI.extraDebt = Number(slider.value); clear(out, `${money(PUI.extraDebt)} extra a month`); };
  slider.onchange = () => app.render();
  const at = months => (months == null ? 'Never' : monthName(addMonths(ymOf(ctx.now()), months)));
  return [head('Debt payoff', 'Each debt shrinking to zero'),
    ...soon.map(r => h('div.banner-inline', {}, '⚠ ', `${r.name || r.type}: the 0% promo ends ${r.values.promoEnd}. It moved to the top of the order.`)),
    h('div.card', { style: { marginBottom: '16px' } },
      h('div.slider-row', {}, h('span.label', {}, 'Order'), S.toggle(ORDER_NAMES, order, setOrder, { label: 'Payoff order' }),
        h('span.muted.small', {}, METHODS.find(x => x.id === order)?.words ?? '')),
      suggestion, customList,
      h('div.slider-row', { style: { marginTop: '10px' } }, h('span.label', {}, 'Extra'), slider, out, h('span.muted.small', {}, 'A what-if: nothing is saved')),
      payoffRuleLine(ctx, m, usable)),
    S.summaryStrip(ctx, [
      // Batch 41 (M9R): the plan as it stands (no what-if extra, the order in use) carries the range line.
      { label: 'Debt-free', result: p.months == null ? { id: 'M34', value: null, never: true, needs: [] } : { id: 'M34', value: p.months, needs: [], unit: 'months', text: p.text },
        render: () => at(p.months), range: !PUI.extraDebt && p.months != null && p.months === m.debtPlan?.months ? rangeLine(ctx, 'debtFree') : null },
      { label: 'Interest still to pay', result: { id: 'M34', value: p.months == null ? null : p.interest, needs: p.months == null ? ['payments that clear every debt'] : [], unit: 'money', text: p.text } },
      { label: 'Months', result: { id: 'M34', value: p.months, needs: [], unit: 'count', text: p.text }, render: r => `${r.value}` },
      order === 'custom' ? { label: 'vs Avalanche (optimal)', result: { id: 'M34', value: cost.extraInterest, needs: cost.extraInterest == null ? ['both plans to finish'] : [], unit: 'money', text: `Interest with your order minus interest with Avalanche${cost.extraMonths ? `; ${cost.extraMonths} more ${Math.abs(cost.extraMonths) === 1 ? 'month' : 'months'}` : ''}.${costDays?.fiDays != null ? ` That is ${costDays.fiDays.toFixed(1)} FI days.` : ''}` }, note: costDays?.fiDays != null ? `${costDays.fiDays.toFixed(1)} FI days of extra interest` : 'Extra interest from your order' } :
      { label: `vs ${order === 'avalanche' ? 'snowball' : 'avalanche'}`, result: (() => { const o = plans[order === 'avalanche' ? 'snowball' : 'avalanche']; const d = o.months == null || p.months == null ? null : o.interest - p.interest; return { id: 'M34', value: d, needs: d == null ? ['both plans to finish'] : [], unit: 'money', text: `Interest with ${order === 'avalanche' ? 'snowball' : 'avalanche'} minus interest with ${order}.` }; })(), note: 'Interest saved by this order' }]),
    h('div.report-grid', {}, h('div.card', {}, h('strong', {}, 'Balance per debt'), payoffChart(ctx, p)), h('div.card', {}, h('strong', {}, 'Order compared'), compareChart(ctx, plans))),
    ...trueCostSections(app, ctx)]; // batch 29: the true cost of debt, borrowing, what it bought, the student loan decision
}
// Batch 11: the rule the date assumes, and the date if only each debt's own payment is paid, in one line each; a
// guessed APR says so.
function payoffRuleLine(ctx, m, usable) {
  const at = mo => (mo == null ? 'never' : monthName(addMonths(ymOf(ctx.now()), mo), 'short'));
  const r = m.debtRule || {}, guessed = usable.filter(d => d.aprGuess);
  return h('div.stack', { style: { gap: '2px', marginTop: '8px' } },
    r.on ? h('span.muted.small', {}, `Your ${money(r.toDebt)} surplus goes to the heavy debt first; each debt keeps its own payment.`) : r.heavy ? h('span.muted.small', {}, 'Heavy debt first is off on Plan › Goals: each debt gets its own payment and any extra.') : null,
    usable.length > 1 ? h('span.muted.small', {}, 'Freed payments roll into the next debt: once one is paid off, its payment goes to the next.') : null, // batch 13
    m.debtPlanMinimum && m.debtPlanMinimum !== m.debtPlan ? h('span.muted.small', {}, `If only each debt's own payment is paid: debt free ${at(m.debtPlanMinimum.months)}.`) : null,
    guessed.length ? h('span.muted.small', {}, `${guessed.map(d => d.name).join(', ')}: the APR is a guess (${guessed.map(d => pct(d.apr)).join(', ')}) until typed on `, h('a', { href: '#/net-worth/credit-cards' }, 'Credit cards ›')) : null);
}
function payoffChart(ctx, p) {
  const host = h('div.chart', { style: { height: '300px' } });
  queueMicrotask(() => {
    if (!window.echarts || !host.isConnected) return;
    const t = S.chartTheme('debt');
    const names = p.debts.map(d => d.name);
    const c = window.echarts.init(host, null, { renderer: 'svg' });
    c.setOption({
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 60, right: 16, top: 32, bottom: 28 }, legend: { top: 0, textStyle: { color: t.text2 } }, tooltip: { trigger: 'axis', valueFormatter: v => money(v) },
      xAxis: { type: 'category', data: p.path.map((_, k) => monthName(addMonths(ymOf(ctx.now()), k), 'short')), axisLabel: { color: t.text2 } },
      yAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
      series: names.map((n, i) => ({ name: n, type: 'line', stack: 'all', showSymbol: false, areaStyle: { opacity: Math.max(0.25, 0.85 - i * 0.2) }, lineStyle: { width: 1 }, itemStyle: { color: t.area },
        data: p.path.map(row => Math.round(row[i])),
        markPoint: p.debts[i].paidOffMonth ? { symbol: 'pin', symbolSize: 34, itemStyle: { color: t.text }, label: { formatter: '✓', color: t.card }, data: [{ coord: [p.debts[i].paidOffMonth, 0], name: `${n} paid off` }] } : undefined })),
    });
    new ResizeObserver(() => c.resize()).observe(host);
  });
  return host;
}
function compareChart(ctx, plans) {
  const host = h('div.chart', { style: { height: '300px' } });
  queueMicrotask(() => {
    if (!window.echarts || !host.isConnected) return;
    const t = S.chartTheme('debt');
    const c = window.echarts.init(host, null, { renderer: 'svg' });
    const ks = ORDER_NAMES;
    c.setOption({
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 60, right: 60, top: 32, bottom: 28 }, legend: { top: 0, textStyle: { color: t.text2 } }, tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ks.map(k => k[1]), axisLabel: { color: t.text, fontWeight: 600 } },
      yAxis: [{ type: 'value', name: 'months', axisLabel: { color: t.text2 }, splitLine: { lineStyle: { color: t.line } } }, { type: 'value', name: 'interest', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { show: false } }],
      series: [{ name: 'Months', type: 'bar', data: ks.map(([k]) => plans[k].months), itemStyle: { color: t.area, borderRadius: 4 }, barWidth: 22 },
        { name: 'Interest', type: 'bar', yAxisIndex: 1, data: ks.map(([k]) => Math.round(plans[k].interest)), itemStyle: { color: t.text2, opacity: 0.5, borderRadius: 4 }, barWidth: 22, tooltip: { valueFormatter: v => money(v) } }],
    });
    new ResizeObserver(() => c.resize()).observe(host);
  });
  return host;
}

// ---------- Next 12 months ----------
export function eventList() {
  return {
    kind: 'event', area: 'goals', title: 'Upcoming events', thing: { one: 'event', plural: 'events' },
    filter: r => r.kind === 'event',
    picker: { top: ['Trip', 'Wedding', 'Move', 'Big purchase'], other: ['Trip home', 'Holiday gifts', 'Lease renewal', 'Insurance renewal', 'Open enrollment', 'Tax day', 'IRA deadline', 'Car repair', 'Medical', 'Education', 'Other'] },
    secondary: (ctx, r, up) => [
      r.type === 'Lease renewal' ? S.labelled('Rent goes up by, a month', S.moneyInput(r.values.rentIncrease ?? null, v => up({ rentIncrease: v }), { hint: 'Add increase' }),
        { note: 'Your landlord\'s renewal letter', ...S.park(ctx, r, 'rentIncrease') }) : null,
      S.labelled('Day of the month', S.textInput(r.values.day == null ? null : String(r.values.day), v => { const n = Number(v); up({ day: Number.isInteger(n) && n >= 1 && n <= 31 ? n : null }); }, { hint: 'Day, 1 to 31', width: 110 }))],
    newValues: type => ({ name: type }),
    coreFields: ['amount'],
    columns: [
      { label: 'Event', render: (ctx, r, m, up) => S.nameInput(r.name, v => up({ name: v }), { hint: r.type || 'Name it', width: 190, key: `${r.id}:name` }) }, // batch 13: a long name wraps
      { label: 'Rough cost', num: true, render: (ctx, r, m, up) => S.moneyInput(r.amount, v => up({ amount: v }), { hint: 'Add cost', key: `${r.id}:amount` }) },
      { label: 'Month', render: (ctx, r, m, up) => {
        if (r.values.holiday) { const ym = holidayYm(r.values.holiday, ctx.now()); return h('span.computed', { title: 'Dated by the holiday each year (About you › Your calendar)' }, ym ? `${monthName(ym, 'short')} · every year` : 'Every year'); }
        const base = ymOf(ctx.now());
        const months = Array.from({ length: 13 }, (_, k) => addMonths(base, k)).map(ym => [ym, monthName(ym, 'short')]);
        return S.select(months, r.values.month ?? null, v => up({ month: v }), { label: 'Month', hint: 'Pick a month', width: 150 });
      } },
      { label: 'Set aside a month', num: true, render: (ctx, r) => {
        if (r.amount == null || !r.values.month) return h('span.muted', {}, 'Needs cost and month');
        const left = Math.max(1, monthsBetween(ymOf(ctx.now()), r.values.month));
        return h('span.computed', { title: `${money(r.amount)} over ${left} ${left === 1 ? 'month' : 'months'}` }, money(r.amount / left));
      } },
    ],
    footerTotal: (ctx, recs) => h('span', {}, S.amount(ctx, recs.reduce((s, r) => s + (r.amount && r.values.month ? r.amount / Math.max(1, monthsBetween(ymOf(ctx.now()), r.values.month)) : 0), 0)), h('span.muted', {}, ' a month to set aside')),
  };
}
export function nextYearScreen(app, ctx) {
  const host = h('div');
  const draw = () => clear(host, yourYear(app, ctx), sinkingFunds(ctx), takingOverList(app, ctx));
  ctx.onRefresh(draw); draw();
  return [head('Next 12 months', 'Your year: known dates, what they cost, and what to set aside'), host, S.recordList(ctx, eventList())];
}

// ---------- Your year (M4): every known date and cost, month by month ----------
function yourYear(app, ctx) {
  const now = ctx.now();
  const y = yearItems(ctx.visible(() => true), now);
  const have = new Set(ctx.visible(r => r.kind === 'event').map(r => r.type));
  const addUsual = () => {
    const coverage = ctx.visible(r => r.kind === 'coverage' && r.values.have === 'Have it');
    const list = usualDates({ renting: ctx.gates().housing === 'Rent', coverage }, now).filter(d => !(d.type !== 'Insurance renewal' && have.has(d.type))
      && !ctx.visible(r => r.kind === 'event' && r.values.coverageId && r.values.coverageId === d.coverageId).length);
    if (!list.length) { S.toast('The usual dates are already here.'); return; }
    ctx.store.transaction('Add the usual dates', () => { for (const d of list) ctx.store.add('event', { name: d.name, values: { month: d.month, day: d.day ?? null, coverageId: d.coverageId ?? null } }, { type: d.type }); });
    S.toast(`Added ${list.length} dates. Costs are blank: add the ones that cost money.`, { undo: () => ctx.store.undo() });
  };
  const sink = x => S.button('Save for it', { size: 'small', iconName: 'plus', onClick: () => { ctx.store.update(x.id, { sinking: true }); S.toast(`${x.name} is now a sinking fund.`); } });
  const itemLine = x => h('div.year-item', {},
    h('span', { style: { fontWeight: 600 } }, x.name), h('span.tag.plain', {}, x.source),
    x.cost != null ? h('span.computed', {}, money(x.cost)) : h('span.muted.small', {}, 'No cost'),
    x.rentUp ? h('span.muted.small', {}, `Rent goes up ${money(x.rentUp)} a month`) : null,
    x.cost != null && !x.derived && !x.rec.values.sinking ? sink(x) : x.rec.values?.sinking ? h('span.tag.plain', {}, 'Sinking fund') : null);
  const months = y.months.filter(mo => mo.items.length);
  return h('section.section.area-goals', {}, h('div.section-title', {}, h('h2', {}, 'Your year'), h('span.spacer'),
    S.button('Add the usual dates', { size: 'small', iconName: 'calendar', onClick: addUsual })),
  h('div.card', {}, months.length || y.undated.length ? h('div.stack', { style: { gap: '12px' } },
    ...months.map(mo => h('div.year-month', {}, h('div.year-head', {}, h('strong', {}, monthName(mo.ym)), mo.cost != null ? h('span.muted', {}, money(mo.cost)) : null),
      h('div.stack', { style: { gap: '6px' } }, mo.items.map(itemLine)))),
    y.undated.length ? h('div.year-month', {}, h('div.year-head', {}, h('strong', {}, 'No month yet'), h('span.muted.small', {}, 'Pick a month below so it lands on the calendar')),
      h('div.stack', { style: { gap: '6px' } }, y.undated.map(itemLine))) : null)
    : h('div.empty', {}, h('span.title', {}, 'Nothing on your year yet'), h('span.muted', {}, 'Tax day, open enrollment, renewals, trips: tap Add the usual dates, or add your own below.'))));
}

// ---------- Taking over (M7.2): bills someone else covers today, and what each date adds a month ----------
function takingOverList(app, ctx) {
  const t = takingOver(ctx.visible(() => true));
  if (!t.items.length) return null;
  const line = x => h('div.year-item', {}, h('span', { style: { fontWeight: 600 } }, x.name), x.who ? h('span.tag.plain', {}, x.who) : null,
    x.monthly != null ? h('span.computed', {}, `${money(x.monthly)} a month`) : h('span.muted.small', {}, 'No amount yet'));
  return h('section.section.area-goals', {}, h('div.section-title', {}, h('h2', {}, 'Taking over'), h('span.muted', {}, `${money(t.total)} a month covered by others today`), h('span.spacer'),
    S.button('Open the budget', { size: 'small', onClick: () => app.go('#/cash-flow/budget') })),
  h('div.card', {}, h('div.stack', { style: { gap: '12px' } },
    ...t.steps.map(st => h('div.year-month', {}, h('div.year-head', {}, h('strong', {}, monthName(st.ym)), h('span.muted.small', {}, `+${money(st.added)} a month · ${money(st.total)} in all`)),
      h('div.stack', { style: { gap: '6px' } }, st.items.map(line)))),
    t.undated.length ? h('div.year-month', {}, h('div.year-head', {}, h('strong', {}, 'No date yet'), h('span.muted.small', {}, 'Set "You take it over" on the line in the budget')),
      h('div.stack', { style: { gap: '6px' } }, t.undated.map(line))) : null)));
}

// ---------- Sinking funds (M5): any yearly cost or event with a cost ----------
function sinkingFunds(ctx) {
  const now = ctx.now();
  const recs = ctx.visible(() => true);
  const items = yearItems(recs, now).all.filter(x => x.rec.values.sinking);
  const accounts = ctx.visible(r => r.kind === 'account');
  const rows = items.map(x => {
    const f = sinkingOf(x, { records: recs, now });
    const v = x.rec.values;
    const up = patch => ctx.store.update(x.id, patch);
    const acct = accounts.find(a => a.id === v.sinkingFund);
    const tags = (acct?.values.tags || []).map(t => t.name).filter(Boolean);
    return h('tr.row', {}, // batch 13: a card on a phone like every other list row
      h('td', {}, h('strong', {}, x.name), h('div.muted.small', {}, x.source),
        // A yearly cost from the Budget is already in spending as its monthly set-aside, so Free after savings leaves it out.
        x.rec.kind === 'bill' && x.rec.values.irregular ? h('div.muted.small', {}, 'Already counted in spending') : null),
      h('td.num', {}, f.target == null ? h('span.muted', {}, 'Needs a cost') : money(f.target)),
      h('td', {}, x.ym ? monthName(x.ym, 'short') : h('span.muted', {}, 'Needs a month')),
      h('td.num', {}, f.savedFrom && f.savedFrom !== 'typed' ? h('span.computed', { title: `From ${f.savedFrom}` }, money(f.saved))
        : S.moneyInput(v.saved ?? null, n => up({ saved: n }), { hint: 'Saved so far' })),
      h('td', {}, h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } },
        S.select(accounts.map(a => [a.id, a.name || a.type]), v.sinkingFund ?? null, id => up({ sinkingFund: id, fundTag: null }), { label: 'Account', hint: 'Which account', width: 160 }),
        acct ? S.select(tags, v.fundTag ?? null, t => up({ fundTag: t }), { label: 'Purpose tag', hint: tags.length ? 'Which goal' : 'No goals on it yet', width: 150 }) : null)),
      h('td.num', {}, f.monthly == null ? h('span.muted', {}, '–') : h('span.computed', {}, `${money(f.monthly)} a month`)),
      h('td.num', {}, f.funded == null ? h('span.muted', {}, '–') : h('span.computed', {}, pct(f.funded))),
      h('td', {}, S.iconButton('x', `Stop saving for ${x.name}`, () => up({ sinking: false }))));
  });
  const monthly = items.reduce((s, x) => s + (sinkingOf(x, { records: recs, now }).monthly ?? 0), 0);
  return h('section.section.area-goals', {}, h('div.section-title', {}, h('h2', {}, 'Sinking funds'), monthly ? h('span.muted', {}, `${money(monthly)} a month to set aside`) : null),
    items.length ? h('div.list', {}, h('div.list-scroll', {}, h('table.rows.mini', {},
      h('thead', {}, h('tr', {}, ['Saving for', 'Target', 'Due', 'Saved', 'Held in', 'Needed', 'Funded', ''].map(t => h('th', {}, t)))), h('tbody', {}, rows))))
      : h('div.card', {}, h('p.muted', {}, 'Tap Save for it on any cost in Your year (or on a yearly cost in Spending) to save for it a little each month.')));
}
// K (overnight): Current vs Proposed. Proposed is a copy the coach edits; the differences show in the money view
// ($, hours or FI days); every result opens How we got this; Make Proposed the plan is one undoable step.
export function scenariosScreen(app, ctx) {
  const doc = ctx.store.doc, p = proposedOf(doc);
  const C = compareOf(doc, ref0(ctx), { now: ctx.now(), flags: app.flags });
  const propose = patch => { setProposed(ctx.store, patch); app.render(); }; // program.proposed is app data (NOT_IN_SHEET), not a field
  const editor = h('div.card', {}, h('div.row-line', { style: { gap: '10px' } }, h('h2', {}, 'Proposed'), h('span.muted', {}, 'A copy you edit; nothing changes until you make it the plan'), h('span.spacer'), C.has ? S.button('Clear', { size: 'small', onClick: () => { clearProposed(ctx.store); app.render(); } }) : null),
    h('div.row-line', { style: { gap: '12px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'flex-start' } },
      S.labelled('Spending a month', S.moneyInput(p.spending ?? null, v => propose({ spending: v }), { hint: C.current.spending != null ? `now ${money(C.current.spending)}` : 'Add spending', key: 'prop:spending', width: 170 })),
      S.labelled('Debt order', S.select(METHODS.map(m => [m.id, m.name]), p.debtOrder ?? null, v => propose({ debtOrder: v }), { label: 'Proposed debt order', hint: `now ${METHODS.find(m => m.id === C.current.debtOrder)?.name ?? C.current.debtOrder}`, width: 170 })),
      // Batch 11 (item 7): Retire by starts from the FI age on Goals; a change here is the proposal.
      S.labelled('Retire by (age)', S.stepper(p.fiAge ?? C.current.fiAge ?? null, v => propose({ fiAge: v === C.current.fiAge ? null : v }), { min: 30, max: 80, label: 'Proposed retire-by age', key: 'prop:fiAge' })),
      S.labelled('Surplus invested', S.toggle([[true, 'Yes'], [false, 'No']], p.investSurplus ?? null, v => propose({ investSurplus: v }), { label: 'Proposed surplus invested', clearable: true })),
      S.labelled('Extra to debt a month', S.moneyInput(p.extraDebt ?? null, v => propose({ extraDebt: v }), { hint: 'Add extra', key: 'prop:extra' })),
      S.labelled('Extra income a month', S.moneyInput(p.extraIncome ?? null, v => propose({ extraIncome: v }), { hint: 'Add income', key: 'prop:income' })))); // batch 12: Use the gap fills it
  const fmt = (r, v) => (v == null ? '–' : r.unit === 'money' ? S.amount(ctx, v) : r.unit === 'pct' ? pct(v) : r.unit === 'month' ? monthName(v, 'short') : String(v));
  // Batch 37 (Q320): past the card room the month cannot be covered, so the cell says when, not a number.
  const cellOf = (r, k) => (r.full?.[k] ? h('span.has-tip', { title: 'The shortfall fills the room on the cards by then; How we got this shows it' }, `Card full ${monthName(r.full[k], 'short')}`) : fmt(r, r[k]));
  const diffCell = r => {
    if (r.unit === 'month') return r.diffMonths == null ? '' : r.diffMonths === 0 ? 'Same' : `${r.diffMonths < 0 ? '' : '+'}${r.diffMonths} months${r.diffMonths < 0 ? ' sooner' : ' later'}`;
    if (r.unit === 'pct') return r.diff == null ? '' : `${r.diff > 0 ? '+' : ''}${(r.diff * 100).toFixed(1)} pts`;
    if (r.unit === 'money') return r.diff == null ? '' : h('span', {}, r.diff > 0 ? '+' : r.diff < 0 ? '−' : '', S.amount(ctx, Math.abs(r.diff)));
    return r.current === r.proposed ? 'Same' : 'Changes';
  };
  // Batch 11 (item 7): How we got this is a small icon button at the end of each row; the same steps open in a popover.
  const how = r => S.iconButton('info', `How we got this: ${r.label}`, e => S.popover(e.currentTarget, h('div.stack', { style: { gap: '8px' } }, h('h3', {}, `How we got this: ${r.label}`),
    h('div', {}, h('strong', {}, 'Current'), h('ol.how-list', {}, r.how.current.map(t => h('li', {}, t)))),
    h('div', {}, h('strong', {}, 'Proposed'), h('ol.how-list', {}, r.how.proposed.map(t => h('li', {}, t))))), { width: 420 }), { tiny: true });
  const table = h('div.card', {}, h('table.rows.compare', {}, h('thead', {}, h('tr', {}, h('th', {}, ''), h('th.num', {}, 'Current'), h('th.num', {}, 'Proposed'), h('th.num', {}, 'Difference'), h('th', {}, h('span.sr', {}, 'How we got this')))),
    h('tbody', {}, C.rows.map(r => h('tr', {}, h('td', {}, r.label), h('td.num', {}, cellOf(r, 'current')), h('td.num', {}, cellOf(r, 'proposed')), h('td.num', {}, diffCell(r)), h('td.how-cell', {}, how(r)))))),
    S.moreBlock('prop:choices', () => h('table.rows', {}, h('tbody', {}, C.choices.map(c => h('tr', {}, h('td', {}, c.label), h('td.num', {}, c.unit === 'money' ? money(c.current ?? 0) : String(c.current ?? '–')), h('td.num', {}, c.unit === 'money' ? money(c.proposed ?? 0) : String(c.proposed ?? '–')))))), { label: 'The choices side by side' }),
    h('div.row-line', { style: { gap: '10px', marginTop: '10px' } }, S.button('Make Proposed the plan', { kind: 'primary', disabled: !C.has, why: C.has ? null : 'Change something under Proposed first', onClick: () => { makeProposedThePlan(ctx.store, ref0(ctx), { now: ctx.now() }); S.toast('Proposed is the plan now.', { undo: () => ctx.store.undo() }); app.render(); } }),
      h('span.muted.small', {}, 'Writes the choices onto the file in one step; Undo puts it back.')));
  const rule = ctx.metrics().debtRule;
  // Batch 33 (QUESTIONS 289): a short month is borrowed on the card, said in one line.
  // Batch 37 (Q320): the borrowing stops at the room on the cards; past it, one plain line says the month cannot be covered.
  const shortLine = sd => (sd.shortfall?.monthly ? `${money(sd.shortfall.monthly)} a month short: carried as card borrowing at ${(sd.shortfall.apr * 100).toFixed(1)}%${sd.shortfall.from === 'card' ? ', the highest card APR' : ', a typical card APR'}${sd.shortfall.fullYm ? `, until the cards are full in ${monthName(sd.shortfall.fullYm, 'short')} (${money(sd.shortfall.room)} of room${sd.shortfall.roomFrom === 'typical' ? ', a typical limit' : ''}). From then the month cannot be covered` : ''}` : null);
  const same = shortLine(C.current) && shortLine(C.current) === shortLine(C.proposed); // batch 37: one line when both sides are short the same way
  const shorts = same ? [`Both sides are ${shortLine(C.current)}`] : [shortLine(C.current) ? `Current is ${shortLine(C.current)}` : null, shortLine(C.proposed) ? `Proposed is ${shortLine(C.proposed)}` : null].filter(Boolean);
  return [head('Current vs Proposed', 'Today against the plan you are proposing'), editor,
    rule?.on ? h('p.muted.small', { style: { margin: '0 0 8px' } }, 'Both sides send the surplus to heavy debt first, then invest it (change it on Plan › Goals).') : null,
    shorts.length ? h('p.muted.small.short-note', { style: { margin: '0 0 8px' }, title: 'Net worth in 5 and 10 years takes off what the card would owe by then; How we got this shows it' }, `${shorts.join('. ')}.`) : null, table];
}
const ref0 = ctx => ctx.ref;

// M72 under the Savings rate to years chart: where your rate sits from $0, and the next 5% step.
function simpleLine(m, r) {
  const sm = simpleMath({ savingsRate: m.savingsRate.value == null ? null : Math.max(0, m.savingsRate.value), realReturn: r, withdrawalRate: m.inputs.withdrawalRate });
  if (sm.you?.years == null) return h('p.muted', {}, 'Your dot appears on the curve once there is a savings rate.');
  return h('p', { style: { margin: '4px 0 0' } }, 'Shockingly Simple Math: ', S.mathButton(sm, `${Math.round(sm.you.rate * 100)}% saved is about ${sm.you.years.toFixed(1)} years from $0`),
    sm.next.years != null ? `. The next step, ${Math.round(sm.next.rate * 100)}%, is about ${sm.next.years.toFixed(1)}: ${sm.gain.toFixed(1)} years sooner.` : '.');
}
