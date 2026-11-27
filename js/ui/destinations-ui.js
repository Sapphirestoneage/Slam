// SPDX-License-Identifier: AGPL-3.0-only
// The FI variants on Plan › Goals (run of Nov 25 2026): Lean, Barista, Regular, Chubby and Fat as views, the
// stress table, the pod's FI number. The FIRE statuses (run of Nov 27 2026): the markers on the FOO timeline of
// Plan › FOO, and on Home the one-time card of a status that was just reached ("You can stop sprinting" is the Coast
// case) and the quiet Recalculating line when the balance falls back under one. Formatting only:
// js/math/destinations.js, js/math/statuses.js and js/math/fi.js work every number out.
import { h } from './dom.js';
import * as S from './staples.js';
import { money, pct } from '../format.js';
import { monthName, addMonths, ymOf } from '../month.js';
import { destinationsOf, baristaSooner, stressOf, podFiOf, statusesOf, statusSeenPatch, statusBelowPatch, fooWithStatuses } from '../math/destinations.js';
import { setDestinations } from '../plan.js';
import { DESTINATIONS, DESTINATION_WORDS, FAT_TEMPLATE, FAT_NOTES, FAT_AMOUNTS, BARISTA_PAY, BARISTA_HEALTH } from '../registry/destinations.js';

const short = v => (v >= 1000 ? `$${v / 1000}k` : `$${v}`);
const span = n => (n == null ? null : n === 0 ? 'now' : n < 24 ? `${n} ${n === 1 ? 'month' : 'months'}` : `${(n / 12).toFixed(1)} years`);
// Guess, Close or Exact: how sure the numbers behind the date are (the FI date's own confidence).
const LEVEL = { Low: ['Guess', 'Some numbers behind this are still guesses. It will move as they firm up.'], Medium: ['Close', 'Most numbers behind this are estimates or better.'], High: ['Exact', 'The numbers behind this are ones you know.'] };
export const levelTag = gate => { const L = LEVEL[gate?.confidence?.word] ?? LEVEL.Low; return h('span.tag.plain.dest-level', { title: L[1] }, L[0]); };
const pick = ctx => ctx.store.doc.program?.destinations || {};
// The level word of a gate, for the statuses: a locked gate is a Guess.
export const levelOf = gate => (gate?.unlocked ? (LEVEL[gate?.confidence?.word] ?? LEVEL.Low)[0] : 'Guess');
// The draft words of the status cards (data/library/status-options.json), fetched once; the screen draws again when
// they arrive. This file is the one place of the web app that fetches them.
let OPTIONS = null, loading = null;
export function setStatusOptions(json) { OPTIONS = json || null; }
export function statusOptions() {
  if (!OPTIONS && !loading && typeof fetch === 'function') loading = fetch('data/library/status-options.json').then(r => (r.ok ? r.json() : null)).then(j => { if (j) { OPTIONS = j; document.dispatchEvent(new CustomEvent('slam:rerender')); } else loading = null; }).catch(() => { loading = null; });
  return OPTIONS;
}

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
  const chips = S.tapPick(V.map(x => [x.key, x.short]), open, k => setDestinations(ctx.store, { pick: k }), { label: 'FI variant', key: 'dest:pick', clearable: false });
  const dest = S.sec('goals:destinations', { title: 'FIRE statuses: the numbers', area: 'goals', summary: 'Lean, Barista, Regular, Chubby and Fat: each status with its number and date' },
    () => h('div.stack', { style: { gap: '10px' } }, chips, viewCard(ctx, v, V, gate)));
  const stress = S.sec('goals:stress', { title: 'FI date stress test', area: 'goals', summary: 'Your date at four withdrawal rates and three returns' }, () => stressTable(ctx, m, gate));
  const many = podFiOf(doc, ctx.ref, { now: ctx.now() }).people.length >= 2;
  const pod = many ? S.sec('goals:pod', { title: 'Pod FI number', area: 'goals', summary: 'One number for everyone who shares costs in this plan' }, () => podCard(ctx, gate)) : null;
  return [dest, stress, pod];
}

// Home: a status that was just reached, one calm card, shown until it is closed once. "You can stop sprinting" is the
// Coast case. The next step does not change: the card says so, and its options are links to look around.
export function statusCard(ctx, m, gate) {
  if (!gate?.unlocked) return null; // a date on guesses stays quiet until the numbers behind it are in
  const doc = ctx.store.doc, O = statusOptions();
  const S9 = statusesOf(m, doc, { now: ctx.now(), level: levelOf(gate), options: O });
  // Back under a status after its card was closed: one quiet Recalculating card, never a warning (Eli, Nov 25 2026).
  const b = S9.below;
  if (b) return h('div.card.coast-card.coast-below', { role: 'status', 'data-status': b.key },
    h('div.row-line', {}, h('h2', {}, b.title), levelTag(gate)),
    h('p', {}, b.line),
    h('p.muted.small', {}, b.next, ' ', S.mathButton({ id: b.key === 'Coast' ? 'M54' : 'M9G', value: b.by, needs: [], text: b.math.join(' ') }, 'Show the math')),
    h('div.row-line', {}, S.button('Got it', { onClick: () => setDestinations(ctx.store, statusBelowPatch(doc, b.key, b.month)) }), h('a', { href: '#/plan/foo' }, 'See your statuses')));
  const c = S9.card;
  if (!c || !O) return null; // the card waits for its words
  const today = ctx.now().toISOString().slice(0, 10);
  return h('div.card.coast-card.status-card', { role: 'status', 'data-status': c.key },
    h('div.row-line', {}, h('h2', {}, c.title), levelTag(gate)),
    h('p', {}, c.changed),
    h('p.muted.small', {}, S.mathButton({ id: c.key === 'Coast' ? 'M54' : 'M9G', value: c.value, needs: [], text: c.math.join(' ') }, 'Show the math'), ` This holds while the balance stays at or over your ${c.name} number.`),
    h('h3.status-opts-h', {}, c.heading),
    h('ul.status-opts', {}, c.options.map(o => h('li', {}, h('a', { href: o.web }, o.t), h('span.muted.small', {}, o.why)))),
    h('p.status-stay', {}, c.stay),
    h('div.row-line', {}, S.button('Got it', { onClick: () => setDestinations(ctx.store, statusSeenPatch(doc, c.key, today)) }), h('a', { href: '#/plan/foo' }, 'See your statuses')));
}

// Plan › FOO: the FIRE statuses as markers between the steps of the one order, in date order. No step moves.
const markWhen = k => (k.reached ? 'Reached' : k.ym ? monthName(k.ym, 'short') : '');
export function fooStatuses(ctx, f, gate) {
  const m = ctx.metrics(), doc = ctx.store.doc;
  const S9 = statusesOf(m, doc, { now: ctx.now(), level: levelOf(gate), options: statusOptions() });
  return { ...S9, rows: fooWithStatuses(f, gate?.unlocked ? S9.markers : S9.markers.filter(k => k.reached), { now: ctx.now() }) };
}
// The markers under the path of tiles, in date order: each says the step it comes before. Read-only labels.
export function fooMarkRow(S9) {
  const marks = S9.rows.map((r, i) => (r.status ? { k: r.status, next: S9.rows.slice(i + 1).find(x => x.step)?.step ?? null } : null)).filter(Boolean);
  if (!marks.length) return null;
  return h('div.foo-marks', { 'aria-label': 'FIRE statuses on the way' }, h('span.label', {}, 'Statuses on the way'),
    marks.map(({ k, next }) => h(`span.foo-mark${k.reached ? '.reached' : ''}`, { 'data-status': k.key }, h('span.foo-mark-name', {}, `◆ ${k.name}`), ` ${money(k.value)}, ${markWhen(k)}`, h('span.muted', {}, k.reached ? '' : next ? ` · before step ${next.id}` : ' · after the last step'))));
}
export function fooStatusSection(ctx, f, gate, S9) {
  const by = new Map(S9.list.map(s => [s.key, s]));
  const row = s => h(`li.dest-status${s.reached ? '.reached' : ''}`, { 'data-status': s.key },
    h('span.foo-n.status-dot', { 'aria-label': 'Status' }, '◆'), h('div.dest-foo-names', {}, h('strong', {}, `${s.full} status`), h('span.muted.small', {}, s.what)),
    h('span.dest-status-num', {}, s.value == null ? h('span.muted.small', {}, 'Needs ', S.needLinks(ctx, s.needs.length ? s.needs : ['spending'])) : S.mathButton({ id: s.key === 'Coast' ? 'M54' : 'M9G', value: s.value, needs: [], text: s.math.join(' ') }, money(s.value))),
    h('span.small.dest-foo-when', {}, s.value == null ? '' : !gate?.unlocked && !s.reached ? h('span.muted', {}, 'Date after your numbers are in') : [s.when, ' ', levelTag(gate)]));
  const undated = S9.list.filter(s => !S9.rows.some(r => r.status?.key === s.key));
  return S.sec('foo:statuses', { title: 'FIRE statuses on your path', summary: S9.line ?? 'Coast, Lean, Barista, FI, Chubby and Fat: markers on the way, not steps' }, () => h('div.card', {},
    h('div.stack', { style: { gap: '10px' } },
      h('p', { style: { margin: 0 } }, 'A status is a marker you pass on the way. Reaching one opens options to look at. It does not move a step, and your next step stays the same.'),
      h('ol.dest-foo', {}, S9.rows.map(r => (r.status ? row(by.get(r.status.key)) : h(`li${f.here === r.step.id ? '.here' : ''}`, {},
        h('span.foo-n', { 'aria-label': `Step ${r.step.id}` }, r.step.id), h('div.dest-foo-names', {}, h('strong', {}, r.step.name)), h('span', {}),
        h('span.muted.small.dest-foo-when', {}, r.step.status === 'Done' ? 'Done' : f.here === r.step.id ? 'You are here' : r.step.date ? monthName(r.step.date, 'short') : ''))))),
      undated.length ? h('ul.dest-foo.dest-undated', { 'aria-label': 'Statuses with no date yet' }, undated.map(row)) : null,
      h('p.muted.small', { style: { margin: 0 } }, 'One order for everyone. The numbers, the Fat list and part-time pay are on ', h('a', { href: '#/plan/goals' }, 'Plan › Goals'), '; every status at another pace is on ', h('a', { href: '#/plan/fire' }, 'Plan › FIRE'), '.'))));
}
