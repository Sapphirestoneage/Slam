// SPDX-License-Identifier: AGPL-3.0-only
// The FI destinations on Plan › Goals (run of Nov 25 2026): Lean, Barista, Regular, Chubby and Fat as views, the
// stress table, the pod's FI number; the FOO by destination on Plan › FOO; the Coast card on Home. Formatting only:
// js/math/destinations.js and js/math/fi.js work every number out.
import { h } from './dom.js';
import * as S from './staples.js';
import { money, pct } from '../format.js';
import { monthName, addMonths, ymOf } from '../month.js';
import { destinationsOf, baristaSooner, stressOf, podFiOf, coastReachedOf, fooFor } from '../math/destinations.js';
import { setDestinations } from '../plan.js';
import { DESTINATIONS, DESTINATION_WORDS, FAT_TEMPLATE, FAT_NOTES, FAT_AMOUNTS, BARISTA_PAY, BARISTA_HEALTH } from '../registry/destinations.js';
import { stepSub } from '../registry/foo.js';

const short = v => (v >= 1000 ? `$${v / 1000}k` : `$${v}`);
const span = n => (n == null ? null : n === 0 ? 'now' : n < 24 ? `${n} ${n === 1 ? 'month' : 'months'}` : `${(n / 12).toFixed(1)} years`);
// Guess, Close or Exact: how sure the numbers behind the date are (the FI date's own confidence).
const LEVEL = { Low: ['Guess', 'Some numbers behind this are still guesses. It will move as they firm up.'], Medium: ['Close', 'Most numbers behind this are estimates or better.'], High: ['Exact', 'The numbers behind this are ones you know.'] };
const levelTag = gate => { const L = LEVEL[gate?.confidence?.word] ?? LEVEL.Low; return h('span.tag.plain.dest-level', { title: L[1] }, L[0]); };
const pick = ctx => ctx.store.doc.program?.destinations || {};

function viewCard(ctx, v, V, gate) {
  const doc = ctx.store.doc, a = doc.assumptions || {};
  const setA = patch => ctx.store.setDoc('assumptions', patch);
  const number = v.value == null
    ? h('span.muted', {}, v.never && v.number?.text ? v.number.text : ['Needs ', S.needLinks(ctx, v.needs.length ? v.needs : ['spending'])])
    : S.mathButton(v.number, money(v.value));
  const date = v.value == null ? null : !gate.unlocked ? h('span.muted.small', {}, gate.reason)
    : h('span', {}, v.reached ? 'Reached' : v.months != null ? `${monthName(v.ym)} (${span(v.months)})` : v.never ? 'Not on this path yet' : ['Needs ', S.needLinks(ctx, v.needs)]);
  const facts = h('div.dest-facts', {},
    h('div.dest-fact', {}, h('span.label', {}, 'The number'), h('strong.dest-num', {}, number), v.spending != null ? h('span.muted.small', {}, `${money(v.spending)} a month from investments`) : null),
    h('div.dest-fact', {}, h('span.label', {}, 'The date'), h('strong.dest-num', {}, date ?? h('span.muted', {}, 'After the number')), v.value != null && gate.unlocked ? levelTag(gate) : null),
    h('div.dest-fact', {}, h('span.label', {}, 'So far'), h('strong.dest-num', {}, v.share == null ? h('span.muted', {}, 'Needs invested') : pct(Math.min(1, v.share))), v.share != null ? h('div.rung-bar', { title: pct(Math.min(1, v.share)) }, h('span', { style: { width: `${Math.min(100, v.share * 100)}%` } })) : null));
  const own = [];
  if (v.key === 'Barista FI' && !v.number?.never) {
    const sooner = gate.unlocked ? baristaSooner(V) : null;
    const jobHealth = pick(ctx).jobHealth === true;
    own.push(h('div.dest-row', {},
      S.labelled('Part-time pay a month', S.tapPick(BARISTA_PAY.map(x => [x, short(x)]), a.partTimeIncome ?? null, x => setA({ partTimeIncome: x }), { label: 'Part-time pay a month', key: 'dest:pay' }), { note: 'Take-home, from work you would like to keep doing' }),
      S.labelled('Who pays for health insurance?', S.tapPick([['me', 'I pay for it'], ['job', 'The part-time job covers it']], jobHealth ? 'job' : 'me', x => setDestinations(ctx.store, { jobHealth: x === 'job' }), { label: 'Who pays for health insurance', key: 'dest:job-health', clearable: false }), { note: 'When the job covers it, no cost is added to the number' }),
      jobHealth ? null : S.labelled('Health insurance a month', S.tapPick(BARISTA_HEALTH.map(x => [x, short(x)]), a.lifeHealth ?? null, x => setA({ lifeHealth: x }), { label: 'Health insurance a month', key: 'dest:health' }), { note: 'Your own pick: what cover costs you once the full-time job is gone. It is added to the number' })));
    if (v.gap?.value != null) own.push(h('p.dest-line', {}, 'The gap it closes: ', S.mathButton(v.gap, `${money(v.gap.value)} less to save`), sooner != null && sooner > 0 ? `, and work becomes part-time ${span(sooner)} sooner than Regular FI.` : '.',
      jobHealth ? ' The part-time job covers health insurance, so the number adds no cost for it.' : v.healthOpen ? ' No health insurance cost is in the number yet: tap what it costs a month, or tap that the job covers it.'
        : v.number?.health > 0 ? ` Health insurance of ${money(v.number.health / 12)} a month is in the number.${v.gap.covers === false ? ` The pay covers part of it; ${money(-v.gap.afterHealth / 12)} a month of it comes from investments.` : ''}` : ''));
  }
  if (v.key === 'Fat FI') {
    const fat = pick(ctx).fat || {};
    own.push(S.moreBlock('goals:fat-list', () => h('div.dest-fat', {}, FAT_TEMPLATE.map(name => h('div.dest-fat-row', {}, h('span.dest-fat-name', {}, name, FAT_NOTES[name] ? h('span.muted.small.dest-fat-note', {}, FAT_NOTES[name]) : null),
      S.tapPick(FAT_AMOUNTS.map(x => [x, x ? `+${short(x)}` : 'None']), fat[name] ?? null, x => setDestinations(ctx.store, { fat: { ...fat, [name]: x } }), { label: `${name}, more a month` })))),
    { label: `Your Fat list: extras a month${v.number?.fromTemplate ? ` (${money((v.spending ?? 0) - (ctx.metrics().inputs.retirementSpending ?? 0))} picked)` : ' (none picked yet)'}` }));
  }
  return h('div.card.dest-card', {}, h('p.dest-what', {}, v.what), facts, ...own,
    S.moreBlock(`goals:assumes:${v.short}`, () => h('ul.dest-assumes', {}, v.assumes.map(t => h('li', {}, t))), { label: 'What this assumes' }));
}

function stressTable(ctx, m, gate) {
  if (!gate.unlocked) return h('div.card', {}, h('p.muted', { style: { margin: 0 } }, gate.reason));
  const s = stressOf(m, ctx.ref, { now: ctx.now() });
  if (s.value == null) return h('div.card', {}, h('p.muted', { style: { margin: 0 } }, 'Needs ', S.needLinks(ctx, s.needs)));
  const base = ymOf(ctx.now()), cur = { w: m.inputs.withdrawalRate, r: m.inputs.realReturn };
  const cell = c => (c.months == null ? 'Not in 70 years' : c.months === 0 ? 'Now' : monthName(addMonths(base, c.months), 'short'));
  return h('div.card', {},
    h('p', { style: { marginTop: 0 } }, 'Your FI date if you take out less or more each year, and if money grows slower or faster. Returns are after inflation.'),
    h('div.list-scroll', {}, h('table.rows.mini.dest-stress', {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Take out a year'), h('th.num', {}, 'FI number'), s.returns.map(r => h('th.num', {}, `Grows ${+(r * 100).toFixed(1)}%`)))),
      h('tbody', {}, s.rows.map(row => h('tr', {}, h('th', { scope: 'row' }, `${+(row.rate * 100).toFixed(2)}%`), h('td.num', {}, money(row.target)),
        row.cells.map(c => h(`td.num${Math.abs(row.rate - cur.w) < 1e-9 && Math.abs(c.realReturn - cur.r) < 1e-9 ? '.dest-cur' : ''}`, {}, cell(c)))))))),
    h('p.muted.small', { style: { marginBottom: 0 } }, S.mathButton(s, 'Show the math'), s.soonest != null ? ` Soonest ${cell({ months: s.soonest })}; latest ${s.latest == null ? 'not in 70 years' : cell({ months: s.latest })}.` : ''));
}

function podCard(ctx, gate) {
  const p = podFiOf(ctx.store.doc, ctx.ref, { now: ctx.now() });
  if (p.value == null) return h('div.card', {}, h('p.muted', { style: { margin: 0 } }, p.text));
  return h('div.card.dest-card', {}, h('p.dest-what', {}, 'One number for everyone in the plan: each shared cost is counted once, and each person carries their part.'),
    h('div.dest-facts', {},
      h('div.dest-fact', {}, h('span.label', {}, 'The pod\'s number'), h('strong.dest-num', {}, S.mathButton(p, money(p.value))), h('span.muted.small', {}, `${money(p.spending)} a month together`)),
      h('div.dest-fact', {}, h('span.label', {}, 'The date'), h('strong.dest-num', {}, !gate.unlocked ? h('span.muted.small', {}, gate.reason) : p.reached ? 'Reached' : p.months != null ? `${monthName(p.ym)} (${span(p.months)})` : p.never ? 'Not on this path yet' : h('span.muted', {}, 'Needs invested and what goes in')), gate.unlocked && p.months != null ? levelTag(gate) : null),
      h('div.dest-fact', {}, h('span.label', {}, 'So far'), h('strong.dest-num', {}, p.share == null ? h('span.muted', {}, 'Needs invested') : pct(Math.min(1, p.share))))),
    h('div.list-scroll', {}, h('table.rows.mini.dest-pod', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Who'), h('th.num', {}, 'Carries a month'), h('th.num', {}, 'Part of the pod'), h('th.num', {}, 'Invested'))),
      h('tbody', {}, p.people.map(q => h('tr', {}, h('th', { scope: 'row' }, q.name), h('td.num', {}, q.spending == null ? '' : money(q.spending)), h('td.num', {}, q.share == null ? '' : pct(q.share)), h('td.num', {}, q.invested == null ? '' : money(q.invested))))))),
    h('div.dest-apart', {}, p.people.filter(q => q.apart?.low != null).map(q => S.moreBlock(`goals:apart:${q.id}`, () => h('div.dest-apart-body', {},
      h('p', { style: { margin: 0 } }, q.apart.sharedMore > 0
        ? ['Between ', S.mathButton({ id: 'M9Y', value: q.apart.low, needs: [], text: q.apart.text }, money(q.apart.low)), ' and ', h('strong', {}, money(q.apart.high)), '.']
        : [S.mathButton({ id: 'M9Y', value: q.apart.low, needs: [], text: q.apart.text }, money(q.apart.low)), '. No row is shared, so it is the same number.']),
      q.apart.sharedMore > 0 ? h('p.muted.small', { style: { margin: 0 } }, `The low end keeps today's part of each shared cost (${money(q.apart.spending)} a month). The high end pays every shared cost alone (${money(q.apart.spending + q.apart.sharedMore)} a month). A smaller home of their own lands in between.`) : null),
    { label: `${q.name} living apart` }))),
    h('p.muted.small', { style: { marginBottom: 0 } }, 'Who shares which row, and how it is split, is set on each row (Shared among, Split how).'));
}

// The three caret sections for Plan › Goals, closed by default.
export function destinationSections(ctx, m, gate) {
  const doc = ctx.store.doc, V = destinationsOf(m, doc, { now: ctx.now() });
  const open = DESTINATIONS.includes(pick(ctx).pick) ? pick(ctx).pick : 'Regular FI';
  const v = V.find(x => x.key === open);
  const chips = S.tapPick(V.map(x => [x.key, x.short]), open, k => setDestinations(ctx.store, { pick: k }), { label: 'Destination', key: 'dest:pick', clearable: false });
  const dest = S.sec('goals:destinations', { title: 'FI destinations', area: 'goals', summary: 'Lean, Barista, Regular, Chubby and Fat: each with its number and date' },
    () => h('div.stack', { style: { gap: '10px' } }, chips, viewCard(ctx, v, V, gate)));
  const stress = S.sec('goals:stress', { title: 'FI date stress test', area: 'goals', summary: 'Your date at four withdrawal rates and three returns' }, () => stressTable(ctx, m, gate));
  const many = podFiOf(doc, ctx.ref, { now: ctx.now() }).people.length >= 2;
  const pod = many ? S.sec('goals:pod', { title: 'Pod FI number', area: 'goals', summary: 'One number for everyone who shares costs in this plan' }, () => podCard(ctx, gate)) : null;
  return [dest, stress, pod];
}

// Home: the day the Coast date is reached, one calm card, shown until it is closed once.
export function coastCard(ctx, m, gate) {
  const c = coastReachedOf(m, ctx.store.doc, { now: ctx.now() });
  if (!gate?.unlocked) return null; // a date on guesses stays quiet until the numbers behind it are in
  // Back under Coast after the card was closed: one quiet Recalculating card, never a warning (Eli, Nov 25 2026).
  if (c.below?.show && c.below.words) return h('div.card.coast-card.coast-below', { role: 'status' },
    h('div.row-line', {}, h('h2', {}, c.below.words.title), levelTag(gate)),
    h('p', {}, c.below.words.line),
    h('p.muted.small', {}, c.below.words.next, ' ', S.mathButton({ id: 'M54', value: c.below.by, needs: [], text: c.below.text }, 'Show the math')),
    h('div.row-line', {}, S.button('Got it', { onClick: () => setDestinations(ctx.store, { coastBelowSeen: c.below.month }) }), h('a', { href: '#/plan/goals' }, 'See your destinations')));
  if (!c.show) return null;
  const today = ctx.now().toISOString().slice(0, 10);
  return h('div.card.coast-card', { role: 'status' },
    h('div.row-line', {}, h('h2', {}, 'You can stop sprinting'), levelTag(gate)),
    h('p', {}, `What you have invested can grow to your FI number by ${c.retireAge ?? 'the age you set'} with nothing more added. From here, saving is a choice about how soon, not a race.`),
    h('p.muted.small', {}, S.mathButton({ id: 'M54', value: c.coast, needs: [], text: c.text }, 'Show the math'), ' This holds while the balance stays at or over your Coast number.'),
    h('div.row-line', {}, S.button('Got it', { onClick: () => setDestinations(ctx.store, { coastSeen: today }) }), h('a', { href: '#/plan/goals' }, 'See your destinations')));
}

// Plan › FOO: the same steps in the order for a destination.
export function fooDestinationSection(ctx, f) {
  const doc = ctx.store.doc, m = ctx.metrics();
  const V = destinationsOf(m, doc, { now: ctx.now() });
  const key = DESTINATIONS.includes(pick(ctx).foo) ? pick(ctx).foo : 'Regular FI';
  const F = fooFor(f, V.find(x => x.key === key));
  return S.sec('foo:destination', { title: 'Your order by destination', summary: key === 'Regular FI' ? 'Lean, Barista and Fat change the late steps' : `${DESTINATION_WORDS[key].short}: ${F.steps.filter(s => s.why).length} late steps move or are added` }, () => h('div.card', {},
    h('div.stack', { style: { gap: '10px' } },
      S.labelled('Where are you going?', S.tapPick(DESTINATIONS.map(k => [k, DESTINATION_WORDS[k].short]), key, k => setDestinations(ctx.store, { foo: k }), { label: 'Destination for the order', key: 'dest:foo', clearable: false }), { note: DESTINATION_WORDS[key].what }),
      h('ol.dest-foo', {}, F.steps.map(s => h(`li${F.here === s.id ? '.here' : ''}`, {},
        h('span.foo-n', { 'aria-label': s.extra ? 'Added step' : `Step ${s.id}` }, s.extra ? '+' : s.id), h('div.dest-foo-names', {}, h('strong', {}, s.name), s.extra ? h('span.muted.small', {}, s.sub) : null, s.why ? h('span.small', {}, s.why) : h('span.muted.small', {}, stepSub(s.id))),
        s.extra ? h('span.tag.plain', {}, 'Added') : s.why ? h('span.tag.plain', {}, 'Moved') : null,
        h('span.muted.small.dest-foo-when', {}, s.extra ? 'In this order' : s.status === 'Done' ? 'Done' : F.here === s.id ? 'You are here' : s.target != null ? `${money(s.target)}${s.date ? `, ${monthName(s.date, 'short')}` : ''}` : s.date ? monthName(s.date, 'short') : '')))),
      h('p.muted.small', { style: { margin: 0 } }, F.changed ? 'The first five steps never move: your own oxygen mask comes first. Only the late steps change places, and the finish line takes this destination\'s number. An added step is a place in the order; it has no number of its own yet.' : 'This destination keeps the standard order.'))));
}
