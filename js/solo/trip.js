// SPDX-License-Identifier: AGPL-3.0-only
// Standalone, off the seven steps: "What does this trip really cost?" A FIRE retreat, a conference, any trip. The
// price today is not the cost: the cost is what that money would have become. One number in and an age; the plan's own
// pay, spending and investments carry in and show how far the trip moves the date (docs/KIT.md).
import { boot, h, btn, chip, money, numBox, copyLink, foot } from './shell.js';
import { onFile } from '../journey.js';
import { tripCostOf, TRIP_COSTS, TRIP_AGE_PICKS } from '../solo.js';
import { pack } from '../start/link.js';

const $ = id => document.getElementById(id);
const span = m => (m >= 24 ? `${(m / 12).toFixed(1)} years` : `${m} ${m === 1 ? 'month' : 'months'}`);
function draw(api) {
  foot(); const step = $('step'); if (step) step.textContent = 'On its own';
  const m = api.mine(), p = api.store.doc.profile || {}, now = new Date();
  const born = p.birthYear != null ? now.getFullYear() - p.birthYear : null, age = born ?? m.tripAge ?? null, cost = m.tripCost ?? null;
  const inv = onFile(api.store.doc, 'invested').invested ?? null, pay = onFile(api.store.doc, 'income', { ref: api.ref }).takeHome ?? null, spend = onFile(api.store.doc, 'spending').gut ?? null;
  const monthly = pay != null && spend != null ? pay - spend : null;
  const of = (c = cost) => tripCostOf({ cost: c, age, invested: inv, monthly, spending: spend, ref: api.ref });
  const headline = R => money(Math.round(R.grown));
  const answerCard = () => {
    const R = of();
    if (!R.ready) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your answer shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, age == null ? 'The price and your age, and it appears.' : 'The price above and it appears.'));
    const pct = v => `${+(v * 100).toFixed(1)}%`;
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Your answer'),
      h('div.st-soft', {}, R.years > 0 ? `Left invested until ${R.toAge}, that money would be` : 'At your age the price is close to the whole cost'), h('div.st-big', {}, headline(R)),
      h('p', { style: { fontWeight: 700 } }, R.years > 0 ? `${money(R.cost)} today is ${R.multiple >= 2 ? `${R.multiple.toFixed(1)} times as much` : money(Math.round(R.grown))} after ${R.years} years of growth, in today's dollars. That would pay for ${money(Math.round(R.aYear))} of spending a year, every year, from ${R.toAge} on.` : `There are no years of growth left before ${R.toAge} for it to give up.`),
      R.delay != null || R.share != null || R.monthsOfSaving != null ? h('ul.st-list', {},
        R.delay != null ? h('li', {}, h('span.dot', {}, ''), h('span', {}, 'Work becomes optional', h('small', {}, 'On your pay, spending and investments')), h('span.when', {}, R.delay <= 0 ? 'The same month' : `${span(R.delay)} later`)) : null,
        R.monthsOfSaving != null ? h('li', {}, h('span.dot', {}, ''), h('span', {}, 'Of what you save', h('small', {}, `${money(Math.round(monthly))} a month is left over`)), h('span.when', {}, R.monthsOfSaving >= 1 ? `${R.monthsOfSaving.toFixed(1)} months of it` : 'Under a month of it')) : null,
        R.share != null ? h('li', {}, h('span.dot', {}, ''), h('span', {}, 'Of what you have invested', h('small', {}, `${money(inv)} today`)), h('span.when', {}, R.share >= 1 ? 'More than all of it' : pct(R.share))) : null) : null,
      R.delay == null ? h('p.st-small.st-soft', {}, monthly != null && monthly <= 0 ? 'Nothing is left over each month right now, so there is no date for it to move yet.' : 'With your pay, spending and investments on file, this also shows how far the trip moves the month work becomes optional.') : null,
      h('h2', { style: { margin: '14px 0 6px', fontSize: '1rem' } }, 'The same trip at other ages'),
      h('ul.st-list', {}, R.byAge.map(a => h('li', {}, h('span.dot', {}, ''), h('span', {}, `At ${a.age}`, h('small', {}, a.multiple >= 1.05 ? `${a.multiple.toFixed(1)} times the price` : 'About the price itself')), h('span.when', {}, money(Math.round(a.grown)))))),
      h('p.st-small.st-soft', {}, `In today's dollars, at ${pct(R.realReturn)} a year after inflation and taking out ${pct(R.withdrawalRate)} a year, the same as the whole plan.`),
      h('details.st-fold', {}, h('summary', {}, 'What this leaves out, and whose idea it is'),
        h('p.st-small', {}, 'This counts the money side only. What a trip teaches you, who you meet there and what you remember of it are yours to weigh against the number, and for some trips they are worth more than it.'),
        h('p.st-small', {}, 'Pricing a purchase by what it would grow to is common across the FIRE community. Looking at the same trip by age, and what that says about going young, is Eli Saperstein\'s.')));
  };
  let card = answerCard();
  const pick = patch => { api.remember(patch); api.render(); };
  // while typing only the headline moves; the full card redraws when the box is left
  const setCost = (v, typing) => { api.remember({ tripCost: v }); if (!typing) return api.render(); api.save(); const R = of(v), big = card.querySelector('.st-big');
    if (big && R.ready) big.textContent = headline(R); else if (!big && R.ready) { const fresh = answerCard(); card.replaceWith(fresh); card = fresh; }
    inputs.querySelector('.st-box .in')?.classList.toggle('st-pulse', v == null); $('ages')?.classList.toggle('st-pulse', v != null && age == null); };
  const inputs = h('div.st-card', { onFocusout: e => { const t = e.relatedTarget, main = $('main'); if (!t || t === main || !main.contains(t)) setTimeout(() => api.render(), 0); } }, h('h2', { style: { marginTop: 0 } }, born != null ? 'One number' : 'Two taps'),
    numBox('What the trip costs, all in', cost, TRIP_COSTS, setCost, { id: 'cost', help: 'Ticket, travel, the room, food. A rough number is enough.' }),
    born != null ? h('p.st-small.st-soft', { style: { marginBottom: 0 } }, `Your age, ${born}, is from your plan.`)
      : h('div.st-field', {}, h('div.st-flabel', {}, 'Your age, about'), h('div.st-chips', { id: 'ages' }, TRIP_AGE_PICKS.map(a => chip(String(a), age === a, () => pick({ tripAge: a }))))));
  const carry = h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Take it with you'), h('p.st-small', {}, 'Your link keeps these answers. The other steps open with them already in.'),
    h('div.st-row', {}, copyLink(api), btn('All the steps', async () => { location.href = `one.html#/d/${await pack(api.store.doc)}`; }, 'slim')));
  $('main').replaceChildren(...[
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, 'What does this trip really cost?'), h('p', { style: { marginBottom: 0 } }, 'A retreat, a conference, a week away. The price is what you pay today. The cost is what that money would have become.')),
    inputs, card, carry].filter(Boolean));
  if (cost == null) inputs.querySelector('.st-box .in')?.classList.add('st-pulse'); else if (age == null) $('ages')?.classList.add('st-pulse');
}
boot('trip', draw);
