// SPDX-License-Identifier: AGPL-3.0-only
// Lifestyle creep and enough, on the Budget and on Goals (run Not built, groups 1 to 5, Part 3, Nov 25 2026).
//   Budget: the quiet Recalculating card when spending grows faster than income; "Spending over the years" (each
//   category, last year next to this year, the lines growing faster than prices); "The few lines that make most of it"
//   (the Pareto). Goals: "Enough and room for error" (Housel).
// Formatting only: js/enough.js and js/math/enough.js work everything out. No red, no verdict words; every choice is a
// tap, kept in settings.enough (undoable like any change).
import { h } from './dom.js';
import * as S from './staples.js';
import { enoughOf, enoughChoicesOf, creepCardOf } from '../enough.js';
import { EN_ENOUGH, EN_ROOM, EN_SOURCES, EN_RULES } from '../math/enough.js';
import { money, pct, duration } from '../format.js';

const setChoice = (ctx, patch) => ctx.store.setDoc('settings', { enough: { ...enoughChoicesOf(ctx.store.doc), ...patch } });
const read = ctx => enoughOf(ctx.store.doc, ctx.ref, ctx.metrics(), { now: ctx.now() });
const signedPct = v => (v == null ? 'new' : `${v >= 0 ? '+' : ''}${pct(v)}`);
const levelTag = (level, tip) => h(`span.tag.${level === 'Guess' ? 'guess' : level === 'Close' ? 'roughly' : 'plain'}`, { title: tip }, level);

// The quiet card on the Budget: only when spending grows faster than income. Recalculating, never a warning.
export function creepCard(app, ctx) {
  const E = read(ctx), W = creepCardOf(E, money);
  if (!W) return null;
  return h('section.card.rc-card.creep-card', { 'aria-label': 'Recalculating: spending and income', 'data-rc': 'creep' },
    h('div.row-line', { style: { gap: '10px', alignItems: 'baseline' } }, h('span.label', {}, W.head), h('span.muted.small', {}, 'Spending over the years')),
    h('p.rc-line', { style: { margin: '6px 0' } }, W.line),
    h('div.row-line.rc-turn', { style: { gap: '10px' } }, h('span.label', {}, 'Your next turn'), h('strong', {}, W.next)));
}

// The inflation a "faster than prices" line is measured against: the dated CPI figure, or a rate tapped.
function inflationPick(ctx, E) {
  const c = ctx.ref.cpi, cur = E.choices.inflation ?? null;
  return S.labelled('Prices grew', S.toggle([['cpi', `${pct(c.value)} (CPI)`], [0.02, '2%'], [0.03, '3%'], [0.04, '4%']], cur, v => setChoice(ctx, { inflation: v }), { label: 'Prices grew', clearable: true }),
    { note: cur === 'cpi' ? `${c.period}, U.S. Bureau of Labor Statistics` : cur == null ? 'Tap one to see the lines growing faster than prices' : 'A rate you tapped', tip: `CPI: ${c.series}. ${c.source}.` });
}
function incomePick(ctx, E) {
  const cur = E.choices.incomeGrowth ?? null;
  return S.labelled('Income grew (a guess)', S.toggle(E.incomeChoices.map(v => [v, v === 0 ? 'No raise' : `${Math.round(v * 100)}%`]), cur, v => setChoice(ctx, { incomeGrowth: v }), { label: 'Income grew', clearable: true }),
    { note: 'No paychecks in the ledger for both years yet. Import a statement for the real number', tip: 'Used only until the ledger holds paychecks for both years. It counts as a Guess.' });
}

function creepBody(ctx) {
  const E = read(ctx), C = E.creep;
  if (!C.ready) {
    return h('div.stack', { style: { gap: '8px' } },
      h('p.muted', { style: { margin: 0 } }, `This compares a year with the one before it. It needs ${C.need}. ${C.have === 1 ? 'One year is in so far.' : 'Type each month\'s Actual on the Budget, or import a statement, and it fills in.'}`),
      inflationPick(ctx, E));
  }
  const rows = C.cats.map(c => h('tr', { 'data-cat': c.cat },
    h('td', {}, c.cat, c.mutant ? h('span.tag.plain.creep-mutant', { style: { marginLeft: '8px' }, title: `Grew ${pct(c.growth)}, faster than prices (${pct(C.inflation)}). About ${money(c.overInflation)} a month more than prices alone` }, 'Faster than prices') : null),
    h('td.num', {}, money(c.was)), h('td.num', {}, money(c.is)), h('td.num', {}, signedPct(c.growth))));
  const inc = C.income.growth;
  return h('div.stack', { style: { gap: '12px' } },
    h('div.row-line', { style: { gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' } },
      h('div', {}, h('span.label', {}, `Spending, ${C.prev.year} to ${C.now.year}`), h('div.creep-big', {}, signedPct(C.spendGrowth)), levelTag(C.level, `${C.prev.year}: ${C.prev.months} months, ${C.now.year}: ${C.now.months} months`)),
      h('div', {}, h('span.label', {}, 'Income'), h('div.creep-big', {}, inc == null ? '–' : signedPct(inc)), inc == null ? h('span.muted.small', {}, 'Not in yet') : levelTag(C.incomeLevel, C.income.from === 'tapped' ? 'The raise you tapped' : 'From the paychecks in the ledger')),
      C.yearly ? h('div', {}, h('span.label', {}, `A year, ${C.yearly.from} to ${C.yearly.to}`), h('div.small', {}, `Spending ${signedPct(C.yearly.spend)}`), h('div.small', {}, `Income ${C.yearly.income == null ? '–' : signedPct(C.yearly.income)}`)) : null),
    h('div.row-line', { style: { gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' } }, inflationPick(ctx, E), C.income.from === 'ledger' ? null : incomePick(ctx, E)),
    h('div.creep-wrap', {}, h('table.data.creep-table', { 'aria-label': 'Each category, a month' },
      h('thead', {}, h('tr', {}, h('th', {}, 'A month'), h('th.num', {}, String(C.prev.year)), h('th.num', {}, String(C.now.year)), h('th.num', {}, 'Change'))),
      h('tbody', {}, rows))),
    S.moreBlock('budget:creep:math', () => h('div.stack.small', { style: { gap: '4px' } },
      h('span', {}, 'Each year: the Actuals typed or imported on the Budget, added up by category, divided by the months that have any. A month with nothing typed is left out, so a part year compares fairly.'),
      h('span', {}, `Change: this year's month ÷ last year's month − 1. Spending ${money(C.now.avgOut)} ÷ ${money(C.prev.avgOut)} − 1 = ${signedPct(C.spendGrowth)}.`),
      C.inflation != null ? h('span', {}, `Faster than prices: a line that grew more than ${pct(C.inflation)} and at least ${money(EN_RULES.mutantMin, { exact: true })} a month more than prices alone would take it.`) : null,
      h('span', {}, `Guess under ${EN_RULES.closeMonths} months in the shorter year, Close from ${EN_RULES.closeMonths}, Exact at ${EN_RULES.exactMonths}. ${EN_SOURCES.creep}.`)), { label: 'Show the math' }));
}
function creepSummary(ctx) {
  try { const C = read(ctx).creep; return C.ready ? `Spending ${signedPct(C.spendGrowth)} from ${C.prev.year} to ${C.now.year}${C.mutants.length ? `, ${C.mutants.length} faster than prices` : ''}` : 'Fills in with a second year of Actuals'; } catch (e) { console.error(e); return null; }
}
export const creepSection = ctx => S.sec('budget:creep', { title: 'Spending over the years', summary: creepSummary(ctx), tip: 'Lifestyle creep: each category this year next to last year, and next to your income' }, () => S.live(ctx, () => creepBody(ctx)));

function paretoBody(ctx) {
  const P = read(ctx).pareto;
  if (!P.ready) return h('p.muted', { style: { margin: 0 } }, `This needs ${P.need}. Add amounts to your Budget lines and it fills in.`);
  return h('div.stack', { style: { gap: '10px' } },
    h('p', { style: { margin: 0 } }, h('strong', {}, `${P.count} of ${P.of} lines`), ` make ${pct(P.topShare)} of your spending: ${money(P.topTotal)} of ${money(P.total)} a month.`),
    h('div.stack.pareto-rows', { style: { gap: '6px' } }, P.rows.filter(r => r.top).map(r => h('div.pareto-row', {},
      h('span.pareto-name', {}, r.name), h('span.pareto-bar', { 'aria-hidden': 'true' }, h('i', { style: { width: `${Math.max(2, Math.round(r.share * 100))}%` } })),
      h('span.num', {}, money(r.amt)), h('span.muted.small.num', {}, pct(r.share))))),
    h('p.muted.small', { style: { margin: 0 } }, `${P.of - P.count === 1 ? 'The other line makes' : `The other ${P.of - P.count} lines make`} the rest. A change to one of the few moves more than a change to many of the rest.`),
    S.moreBlock('budget:pareto:math', () => h('div.stack.small', { style: { gap: '4px' } },
      h('span', {}, 'Each Budget line\'s month (your share), biggest first. The few lines are the biggest ones that, added up, reach 80% of the total.'),
      h('span', {}, EN_SOURCES.pareto + '.')), { label: 'Show the math' }));
}
export const paretoSection = ctx => S.sec('budget:pareto', { title: 'The few lines that make most of it', summary: (() => { try { const P = read(ctx).pareto; return P.ready ? `${P.count} of ${P.of} lines make ${pct(P.topShare)}` : null; } catch (e) { console.error(e); return null; } })(), tip: 'The Pareto of your spending' }, () => S.live(ctx, () => paretoBody(ctx)));

function whenWords(r, ctx) {
  if (!r) return 'Needs your investing';
  if (r.value === 0) return 'Already there';
  if (r.value == null) return r.never ? 'Not on this path within 70 years' : 'Needs your investing';
  return duration(r.value, ctx.now());
}
function enoughBody(ctx) {
  const E = read(ctx), N = E.enough, ch = E.choices;
  const picks = h('div.row-line', { style: { gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' } },
    S.labelled('Enough is', S.toggle(EN_ENOUGH, typeof ch.share === 'number' ? ch.share : 1, v => setChoice(ctx, { share: v ?? 1 }), { label: 'Enough is' }), { note: 'The life you would call enough, next to the spending your plan uses' }),
    S.labelled('Room for error', S.toggle(EN_ROOM, typeof ch.room === 'number' ? ch.room : null, v => setChoice(ctx, { room: v }), { label: 'Room for error', clearable: true }), { note: 'A margin on top, for the years that go differently', tip: EN_SOURCES.housel }));
  if (N.value == null) return h('div.stack', { style: { gap: '10px' } }, picks, h('p.muted', { style: { margin: 0 } }, 'Needs your FI number first: retirement spending and a withdrawal rate, above.'));
  return h('div.stack', { style: { gap: '12px' } }, picks,
    h('div.row-line', { style: { gap: '28px', alignItems: 'flex-start', flexWrap: 'wrap' } },
      h('div', {}, h('span.label', {}, 'Your enough number'), h('div.creep-big', {}, money(N.value)), h('span.muted.small', {}, N.sameAsFi ? 'The same as your FI number' : `Your FI number × ${Math.round(N.share * 100)}%`)),
      N.withRoom != null ? h('div', {}, h('span.label', {}, `With ${Math.round(N.room * 100)}% room for error`), h('div.creep-big', {}, money(N.withRoom))) : null,
      h('div', {}, h('span.label', {}, 'Enough by'), h('div.small', { style: { fontWeight: 700 } }, whenWords(N.at, ctx)), N.withRoom != null ? h('span.muted.small', {}, `With the room: ${whenWords(N.atRoom, ctx)}`) : null)),
    N.have != null ? h('p', { style: { margin: 0 } }, N.past ? `You have ${money(N.margin)} past enough. Past it, more is a choice.` : `You have ${pct(N.pct)} of enough today: ${money(N.left)} to go${N.withRoom != null ? ', with the room' : ''}.`) : null,
    S.moreBlock('goals:enough:math', () => h('div.stack.small', { style: { gap: '4px' } },
      h('span', {}, `Enough number: your FI number ${money(ctx.metrics().fiNumber.value)} × ${Math.round(N.share * 100)}% = ${money(N.value)}. The FI number is spending a year ÷ the withdrawal rate, so this is the same as working it out on the life you call enough.`),
      N.withRoom != null ? h('span', {}, `Room for error: ${money(N.value)} × ${100 + Math.round(N.room * 100)}% = ${money(N.withRoom)}.`) : null,
      h('span', {}, 'The dates are the FI date of your plan (what you invest a month, growing at your return), run to each number.'),
      h('span', {}, `${EN_SOURCES.housel}.`)), { label: 'Show the math' }));
}
export const enoughSection = ctx => S.sec('goals:enough', { title: 'Enough and room for error', summary: (() => { try { const N = read(ctx).enough; return N.value == null ? null : `Enough ${money(N.value)}${N.withRoom != null ? `, with room ${money(N.withRoom)}` : ''}`; } catch (e) { console.error(e); return null; } })(), tip: 'Your enough number and your margin of safety (Morgan Housel)' }, () => S.live(ctx, () => enoughBody(ctx)));
