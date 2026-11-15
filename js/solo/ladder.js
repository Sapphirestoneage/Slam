// SPDX-License-Identifier: AGPL-3.0-only
// Standalone, off the seven steps: "If the pay stopped, what would I use first?" Life Transitions' ladder as one page:
// every source of money in the order it would be used, what each costs, and the month the last one runs out. Spending,
// cash and investments are the whole plan's questions, so they carry in and out (docs/KIT.md).
import { boot, h, btn, money, numBox, copyLink, foot } from './shell.js';
import { answer, onFile } from '../journey.js';
import { stoppedPayOf } from '../solo.js';
import { monthsText } from '../math/transitions.js';
import { monthName } from '../month.js';
import { pack } from '../start/link.js';

const $ = id => document.getElementById(id);
function draw(api) {
  foot(); const step = $('step'); if (step) step.textContent = 'On its own';
  const doc = () => api.store.doc, cashOn = onFile(doc(), 'cash'), cash = cashOn.checking == null && cashOn.savings == null ? null : (cashOn.checking ?? 0) + (cashOn.savings ?? 0);
  const spend = onFile(doc(), 'spending').gut ?? null, inv = onFile(doc(), 'invested').invested ?? null;
  // the answer, from whatever is on file this instant (so it is right while a number is still being typed)
  const answerCard = () => {
    const R = stoppedPayOf(doc(), api.ref);
    if (!R.ready) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your answer shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'Your spending and your cash, and it appears.'));
    const when = r => (r.month == null ? 'Not reached' : `Reached in month ${Math.floor(r.month) + 1}`);
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Your answer'),
      h('div.st-soft', {}, 'With no pay coming in, your money lasts'), h('div.st-big', {}, R.runway == null ? 'More than 10 years' : monthsText(R.runway)),
      h('p', { style: { fontWeight: 700 } }, R.runway == null ? `At ${money(Math.round(R.burn))} a month, what you have carries you past ten years.` : `At ${money(Math.round(R.burn))} a month it runs to ${monthName(R.floorYm, 'short')}. Here is what you would use, in order.`),
      h('ul.st-list', {}, R.used.map((r, i) => h('li', {}, h('span.dot', {}, ''), h('span', {}, `${i + 1}. ${r.name}`, h('small', {}, [r.cost, when(r)].filter(Boolean).join('. '))), h('span.when', {}, r.amount == null ? '' : money(Math.round(r.amount)))))),
      R.used.some(r => r.id === 'invest') ? h('p.st-small', {}, 'Your invested money is counted here as money you can sell. If it is in a 401(k) or an IRA, taking it out early costs a 10% penalty and income tax, so it would cover less. Say which accounts in the whole plan and that is counted.') : null,
      R.costs > 0.5 ? h('p.st-small', {}, `Used as set, the costly rungs cost about ${money(Math.round(R.costs))} in interest, penalty and tax.`) : null,
      h('details.st-fold', {}, h('summary', {}, `${R.unused.length} more that could help, and what each needs`), h('ul.st-list', {}, R.unused.map(r => h('li', {}, h('span.dot', {}, ''), h('span', {}, r.name, h('small', {}, r.note ?? r.cost ?? '')), h('span.when', {}, ''))))),
      h('p.st-small.st-soft', {}, 'The order is cheapest first: money set aside for this, then savings, then things that cost something to use. Unemployment, family help, side income and a card are counted in the whole plan, where they can be entered.'));
  };
  let card = answerCard();
  const pulse = () => { const boxes = [...inputs.querySelectorAll('.st-box .in')], has = boxes.map(x => x.querySelector('input').value !== ''); boxes.forEach((x, i) => x.classList.toggle('st-pulse', i < 2 && !has[i] && has.slice(0, i).every(Boolean))); };
  const set = key => (v, typing) => {
    if (key === 'cash') { const t = cash || 0, c = cashOn.checking ?? 0; answer(api.store, 'cash', v == null ? { checking: 0, savings: 0 } : t > 0 ? { checking: Math.round(v * c / t), savings: v - Math.round(v * c / t) } : { checking: 0, savings: v }); }
    else if (key === 'spending') answer(api.store, 'spending', { gut: v ?? 0 });
    else if (v == null || v === 0) answer(api.store, 'invested', {}, { none: true }); else answer(api.store, 'invested', { invested: v });
    if (!typing) return api.render(); api.save(); const fresh = answerCard(); card.replaceWith(fresh); card = fresh; pulse(); };
  const inputs = h('div.st-card', { onFocusout: e => { const t = e.relatedTarget, main = $('main'); if (!t || t === main || !main.contains(t)) setTimeout(() => api.render(), 0); } }, h('h2', { style: { marginTop: 0 } }, 'Your numbers'),
    numBox('What you spend in a month, all in', spend, [2000, 3000, 4000, 5000, 6500], set('spending'), { id: 'spend' }),
    numBox('Cash you could reach this week (checking and savings)', cash, [1000, 2500, 5000, 10000, 20000], set('cash'), { id: 'cash' }),
    numBox('Invested, all accounts', inv, [5000, 20000, 50000, 100000, 250000], set('invested'), { id: 'inv', help: 'Leave it empty to see cash alone.' }));
  const carry = h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Take it with you'), h('p.st-small', {}, 'Your link keeps these numbers. Your plan keeps its pay: this page only asks what if.'),
    h('div.st-row', {}, copyLink(api), btn('All the steps', async () => { location.href = `one.html#/d/${await pack(api.store.doc)}`; }, 'slim')));
  $('main').replaceChildren(...[
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Turn panic into a number'), h('h1', {}, 'If the pay stopped, what would I use first?'), h('p', { style: { marginBottom: 0 } }, 'Every source of money you have, in the order you would reach for it, and the month the last one runs out.')),
    inputs, card, carry].filter(Boolean));
  pulse();
}
boot('ladder', draw);
