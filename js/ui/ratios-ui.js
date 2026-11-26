// SPDX-License-Identifier: AGPL-3.0-only
// Ratios on Key numbers, on Report › Overview (run Not built, groups 1 to 5, Part 9, Nov 26 2026). One caret section,
// closed; inside it a caret section for each group, closed; one line for each ratio: the name, the value (or what it
// needs, never a 0), Guess / Close / Exact, one plain sentence, and Show the math (the formula, the numbers, and a rule
// of thumb only where a widely used one exists, with its source and date). Formatting only: js/ratios.js and
// js/math/ratios.js work everything out. No red, no verdict words. Financial confidence is a row of taps (the same
// Confidence rating Home asks for at the start of a session).
import { h } from './dom.js';
import * as S from './staples.js';
import { ratiosOf } from '../ratios.js';
import { RA_CONF_WORDS } from '../math/ratios.js';
import { CONFIDENCE } from '../registry/joy.js';
import { setConfidence, sessionNo } from '../program.js';
import { money, pct, number } from '../format.js';

// Where each ratio's inputs are typed, so a "Needs" line always lands on a box to fill (DESIGN.md, rule 5).
const HOME = { current: '#/net-worth/assets', health: '#/net-worth/protection', selfins: '#/net-worth/assets', solvency: '#/net-worth/assets', revolving: '#/net-worth/debt', mix: '#/net-worth/debt', intprin: '#/net-worth/debt',
  equity: '#/net-worth/assets', ltv: '#/net-worth/assets', priceinc: '#/net-worth/assets', realestate: '#/net-worth/assets', discretionary: '#/cash-flow/budget', fixedvar: '#/cash-flow/budget', volatility: '#/cash-flow/close',
  side: '#/cash-flow/income', totalcomp: '#/cash-flow/income', realwage: '#/cash-flow/budget', replace: '#/plan/goals', investnw: '#/net-worth/assets', nwincome: '#/cash-flow/income', human: '#/cash-flow/income', shelter: '#/net-worth/assets', longevity: '#/plan/goals' };
const read = ctx => ratiosOf(ctx.store.doc, ctx.ref, ctx.metrics(), { now: ctx.now() });
const levelTag = level => h(`span.tag.${level === 'Guess' ? 'guess' : level === 'Close' ? 'roughly' : 'plain'}`, { title: level === 'Guess' ? 'Some inputs are still guesses, so this one gets no read yet' : level === 'Close' ? 'Most inputs are estimates or better' : 'The inputs are numbers you know' }, level);
const show = (v, unit) => (v == null ? '' : unit === 'money' ? money(v) : unit === 'pct' ? pct(v) : unit === 'x' ? `${number(v, 2)}x` : unit === 'years' ? `${number(v, 1)} years` : unit === 'yesno' ? (v ? 'Yes' : 'No') : number(v));

export function valueWords(l) {
  const r = l.r;
  if (r.value == null) return r.needs.length ? `Needs ${r.needs.join(' and ')}` : r.none;
  if (l.id === 'mix') return `${r.value} of 3 kinds`;
  if (l.id === 'selfins' && r.value < 0) return `${money(-r.value)} to go first`;
  if (l.id === 'equity' && r.shareOfNetWorth != null) return `${money(r.value)}, ${pct(r.shareOfNetWorth)} of net worth`;
  if (l.id === 'discretionary' && r.share != null) return `${money(r.value)} a month, ${pct(r.share)} of take-home`;
  if (l.id === 'confidence') return `You: ${r.parts[0][1]} of ${r.parts[1][1]}${r.numbers != null ? ` · numbers: ${r.parts[2][1]} of ${r.parts[3][1]}` : ''}`;
  return show(r.value, r.unit);
}

function confidenceTaps(ctx, l) {
  const doc = ctx.store.doc, n = sessionNo(doc), cur = l.r.value == null ? null : l.r.parts[0][1];
  const opts = Array.from({ length: CONFIDENCE.max - CONFIDENCE.min + 1 }, (_, i) => [CONFIDENCE.min + i, String(CONFIDENCE.min + i)]);
  return S.labelled('How sure do you feel about your money?', S.toggle(opts, cur, v => setConfidence(ctx.store, n, v, { now: ctx.now().toISOString() }), { label: 'Financial confidence', key: 'ratios:confidence' }),
    { note: `${CONFIDENCE.min} ${CONFIDENCE.low.toLowerCase()} · ${CONFIDENCE.max} ${CONFIDENCE.high.toLowerCase()}. The same rating Home asks for each session` });
}

function line(ctx, l) {
  const r = l.r, lit = r.value != null;
  return h('div.ratio-line', { 'data-ratio': l.id },
    h('div.row-line.ratio-head', { style: { gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' } },
      h('strong.ratio-name', {}, l.n), h('span.spacer'),
      h(`span.ratio-val${lit ? '' : '.muted'}`, {}, valueWords(l)), lit && l.id !== 'confidence' ? levelTag(r.level) : null),
    h('p.muted.small.ratio-say', { style: { margin: '2px 0 4px' } }, l.id === 'confidence' && lit ? RA_CONF_WORDS[r.read] : l.s),
    l.id === 'confidence' ? confidenceTaps(ctx, l) : null,
    !lit && r.needs.length && HOME[l.id] ? h('a.small.ratio-go', { href: HOME[l.id] }, 'Fill it in') : null,
    S.moreBlock(`ratios:${l.id}:math`, () => h('div.stack.small', { style: { gap: '4px' } },
      h('span', {}, h('strong', {}, 'Formula: '), l.f),
      ...r.parts.map(([k, v, u]) => h('span', {}, `${k}: ${show(v, u)}`)),
      lit && l.id !== 'confidence' && l.id !== 'mix' ? h('span', {}, `= ${show(r.value, r.unit)}`) : null,
      l.rule ? h('span', {}, `A common rule of thumb: ${l.rule.text} Source: ${l.rule.source}, read ${l.rule.date}.`) : h('span.muted', {}, 'No target here: it shows where you are.')), { label: 'Show the math' }));
}

function body(ctx) {
  const A = read(ctx);
  return h('div.stack.ratios', { style: { gap: '6px' } },
    h('p.muted.small', { style: { margin: 0 } }, 'One line each. A ratio waits for its numbers and never shows a 0 in their place. Rules of thumb are guides from the people named, not grades.'),
    ...A.groups.map(G => S.sec(`overview:ratios:${G.g}`, { title: G.name, level: 'h3', summary: `${G.lines.filter(l => l.r.value != null).length} of ${G.lines.length} worked out` },
      () => h('div.stack', { style: { gap: '10px' } }, ...G.lines.map(l => line(ctx, l)), G.note ? h('p.muted.small', { 'data-not-for': 'home' }, G.note) : null))),
    S.moreBlock('overview:ratios:later', () => h('div.stack.small', { style: { gap: '4px' } }, ...A.later.map(([n, why]) => h('span', {}, h('strong', {}, n), `: ${why}.`))), { label: 'What isn\'t here yet' }));
}
function summary(ctx) {
  try { const A = read(ctx); return `${A.lit} of ${A.of} worked out`; } catch (e) { console.error(e); return null; }
}
export const ratiosSection = ctx => S.sec('overview:ratios', { title: 'Ratios', summary: summary(ctx), tip: 'Key numbers as ratios: one line each, in groups, each with its formula' }, () => S.live(ctx, () => body(ctx)));
