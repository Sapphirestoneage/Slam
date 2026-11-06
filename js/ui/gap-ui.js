// SPDX-License-Identifier: AGPL-3.0-only
// The gap card (batch 12, item 5): when the month is short. YNAB shows overspending as a number to cover; here it is
// "Your month is $X short", the three biggest levers with what each closes, and Use the gap, which proposes a plan on
// Current vs Proposed. Calm: no red, no verdicts. Formatting only: js/math/gap.js works it out.
import { h } from './dom.js';
import * as S from './staples.js';
import { gapOf, gapProposal } from '../math/gap.js';
import { setProposed } from '../math/proposed.js';
import { money } from '../format.js';

export function gapCard(app, ctx, m = ctx.metrics(), { where = 'home' } = {}) {
  const G = gapOf(ctx.store.doc, m);
  if (!G) return null;
  const setIncome = v => ctx.store.setIn('program', ['gap'], { ...(ctx.store.doc.program?.gap || {}), income: v ?? null }, 'Gap income');
  const row = l => h('li.gap-lever', {},
    h('span.gap-name', {}, l.name, l.amount != null && l.id !== 'income' ? h('span.muted.small', {}, ` · ${money(l.amount)} a month`) : null),
    h('span.muted.small.gap-how', {}, l.how),
    l.id === 'income' ? S.moneyInput(l.amount, setIncome, { hint: '$ a month', key: `gap:income:${where}` }) : null,
    h('span.gap-closes', {}, l.closes == null ? h('span.muted', {}, '') : `closes ${money(l.closes)}`),
    l.route ? h('a.small', { href: l.route }, 'Open ›') : h('span'));
  const use = () => { setProposed(ctx.store, gapProposal(G)); S.toast('Proposed: a plan that closes the gap. Compare it here; nothing changes until you make it the plan.', { undo: () => ctx.store.undo() }); app.go('#/plan/scenarios'); };
  return h('section.card.gap-card', { 'aria-label': 'The gap' },
    h('div.row-line', { style: { gap: '12px', alignItems: 'baseline' } },
      h('span.label', {}, 'The gap'), h('strong.gap-head', {}, `Your month is ${money(G.short)} short.`), h('span.muted.small', {}, G.text.replace(/^Your month is \$[\d,]+ short: /, '').replace(/^./, c => c.toUpperCase()))),
    h('ul.gap-levers', {}, G.levers.map(row)),
    h('div.row-line', { style: { gap: '12px', marginTop: '8px' } },
      S.button('Use the gap', { kind: 'primary', iconName: 'right', onClick: use }),
      h('span.muted.small', {}, G.closes >= G.short - 0.5 ? 'These close it.' : `These close ${money(G.closes)}; Use the gap puts the rest on extra income, as a proposal.`)));
}
