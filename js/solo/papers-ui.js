// SPDX-License-Identifier: AGPL-3.0-only
// Words and the highlighted card for where a paper and the plan disagree (js/math/taxreturn.js paperGaps).
import { h } from '../ui/dom.js';
import { money } from './shell.js';
const r = v => money(Math.round(v));
export const gapWords = g => { const a = Math.abs(g.by); return {
  takeHome: [`Your pay stub comes to about ${r(g.paper)} a month. Your plan uses ${r(g.plan)}.`, `That is ${r(a)} a month ${g.by < 0 ? 'less' : 'more'} than the plan thinks. Everything else in the plan stands on this number.`],
  wagesPlan: [`Your tax papers show ${r(g.paper)} in wages for the year. Your plan works from about ${r(g.plan)} a year before tax.`, `They are ${r(a)} apart. A pay stub is the quick way to settle which is right today.`],
  stubYear: [`This pay stub, over a full year, comes to ${r(g.paper)}. Last year's wages were ${r(g.plan)}.`, 'A raise, a new job or different hours would explain it.'],
  w2Return: [`The W-2 shows ${r(g.paper)} in wages and the return shows ${r(g.plan)}.`, 'A second job or a W-2 not read yet would explain it.'],
}[g.id]; };
// The card: one block per gap, both numbers in bold type, an action where one tap settles it.
export function flagCard(gaps, { action = () => null, link = null } = {}) {
  if (!gaps.length) return null;
  return h('div.st-flag', { role: 'status' }, h('div.st-flaghead', {}, h('span.st-flagmark', { 'aria-hidden': 'true' }, '!'), gaps.length === 1 ? 'Check this: a paper and your plan do not match' : `Check these: ${gaps.length} places a paper and your plan do not match`),
    gaps.map(g => { const [what, why] = gapWords(g); return h('div.st-flagitem', { 'data-gap': g.id }, h('p', {}, h('strong', {}, what)), h('p.st-small', {}, why), action(g)); }),
    link ? h('div.st-row', {}, h('a.st-btn.slim', { href: link }, 'See my papers')) : null);
}
