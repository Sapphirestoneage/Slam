// SPDX-License-Identifier: AGPL-3.0-only
// Standalone, off the seven steps: "What does this habit cost?" One number in (a weekly or monthly cost), two answers
// out: what it would be in ten years left invested, and what has to be invested to pay for it forever (docs/KIT.md).
import { boot, h, btn, chip, money, numBox, copyLink, foot } from './shell.js';
import { habitCostOf, HABIT_PER, HABIT_PICKS, HABIT_YEARS } from '../solo.js';
import { pack } from '../start/link.js';

const $ = id => document.getElementById(id);
function draw(api) {
  foot(); const step = $('step'); if (step) step.textContent = 'On its own';
  const m = api.mine(), per = m.habitPer ?? 'month', amount = m.habitAmount ?? null, years = m.habitYears ?? 10;
  const word = per === 'week' ? 'a week' : 'a month', of = (a = amount) => habitCostOf({ amount: a, per, years, ref: api.ref });
  const pick = patch => { api.remember(patch); api.render(); };
  const answerCard = (now = amount) => { // `now`: the number as it stands while it is being typed
    const R = of(now);
    if (!R.ready) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your answer shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'One number above and it appears.'));
    const pct = v => `${+(v * 100).toFixed(1)}%`;
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Your answer'),
      h('div.st-soft', {}, `Left invested, ${R.years} years of it would be`), h('div.st-big', {}, money(Math.round(R.grown))),
      h('p', { style: { fontWeight: 700 } }, `${money(R.amount)} ${word} is ${money(Math.round(R.aYear))} a year: ${money(Math.round(R.spent))} out of your pocket over ${R.years} years, and ${money(Math.round(R.growth))} of growth it never got to earn.`),
      h('div.st-field', {}, h('div.st-flabel', {}, 'Over how long'), h('div.st-chips', {}, HABIT_YEARS.map(y => chip(`${y} years`, years === y, () => pick({ habitYears: y }))))),
      h('ul.st-list', {}, h('li', {}, h('span.dot', {}, ''), h('span', {}, 'To pay for it forever', h('small', {}, `Invested, taking out ${pct(R.withdrawalRate)} a year`)), h('span.when', {}, money(Math.round(R.needs))))),
      h('p.st-small.st-soft', {}, `In today's dollars, at ${pct(R.realReturn)} a year after inflation, the same as the whole plan.`),
      h('details.st-fold', {}, h('summary', {}, 'Whose idea this is, and why the number differs a little'),
        h('p.st-small', {}, 'Multiplying a weekly cost by 752, or a monthly one by 173, is Mr. Money Mustache\'s shortcut for ten years at 7%. Those two numbers compound the 7% in weekly and monthly pieces, which adds up to a little more than 7% a year. Here a year grows by the plan\'s return and no more, so ten years comes out about 1% lower.'),
        h('p.st-small', {}, '"Every $100 a month needs $30,000 invested" is the 4% rule read backwards: 25 times a year of it. It is said all over the FIRE community.'),
        h('p.st-small', {}, 'This counts money only. A habit you love is a fine use of money; the number is here so the choice is made with it in view.')));
  };
  let card = answerCard();
  const setAmount = (v, typing) => { api.remember({ habitAmount: v }); if (!typing) return api.render(); api.save(); const fresh = answerCard(v); card.replaceWith(fresh); card = fresh; // the whole card, so its sentence never trails the number being typed
    inputs.querySelector('.st-box .in')?.classList.toggle('st-pulse', v == null); };
  const inputs = h('div.st-card', { onFocusout: e => { const t = e.relatedTarget, main = $('main'); if (!t || t === main || !main.contains(t)) setTimeout(() => api.render(), 0); } }, h('h2', { style: { marginTop: 0 } }, 'One number'),
    h('div.st-field', {}, h('div.st-flabel', {}, 'It costs this much'), h('div.st-chips', {}, HABIT_PER.map(([id, label]) => chip(label, per === id, () => pick({ habitPer: id, habitAmount: null }))))),
    numBox(`What it costs ${word}`, amount, HABIT_PICKS[per], setAmount, { id: 'amount', help: 'Coffee out, a subscription, a delivery habit. A rough number is enough.' }));
  const carry = h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Take it with you'), h('p.st-small', {}, 'Your link keeps this answer.'),
    h('div.st-row', {}, copyLink(api), btn('All the steps', async () => { location.href = `one.html#/d/${await pack(api.store.doc)}`; }, 'slim')));
  $('main').replaceChildren(...[
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, 'What does this habit cost?'), h('p', { style: { marginBottom: 0 } }, 'A small cost that repeats is a large one. One number shows what it adds up to, and what it would take to cover it for good.')),
    inputs, card, carry].filter(Boolean));
  if (amount == null) inputs.querySelector('.st-box .in')?.classList.add('st-pulse');
}
boot('habit', draw);
