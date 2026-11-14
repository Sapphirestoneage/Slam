// SPDX-License-Identifier: AGPL-3.0-only
// Standalone: "When am I debt free?" One easy thing: list what you owe, see the month it is gone and which one to pay
// first. Then one button carries every answer into the whole plan. It shows what js/solo.js debtFreeOf returns.
import { boot, h, btn, chip, money, copyLink } from './shell.js';
import { bookUI } from '../start/book-ui.js';
import { DEBT_BOOK, bookOf } from '../book.js';
import { debtFreeOf, EXTRAS, ORDERS, SOLO } from '../solo.js';
import { yearsText } from '../math/debt.js';

const $ = id => document.getElementById(id);
let result = null; // the answer card, redrawn as the numbers change without touching the box being typed in

function answer(api) {
  const m = api.mine(), extra = m.soloExtra ?? 0, order = m.soloOrder ?? 'avalanche';
  const R = debtFreeOf(api.store.doc, api.ref, { extra, order });
  const pick = patch => { api.remember(patch); api.render(); };
  if (!R.ready) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your date shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'Add one thing you owe and it appears. A rough amount is enough to start.'));
  const O = ORDERS.find(o => o[0] === order);
  return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' },
    h('div.st-eyebrow', {}, 'Your answer'),
    R.never ? [h('div.st-big', {}, 'Not at these payments'), h('p', {}, 'The payments do not cover the interest on at least one of these, so the total never reaches zero. A little extra each month changes that: tap an amount below.')]
      : [h('div.st-soft', {}, 'You are debt free by'), h('div.st-big', {}, R.date), h('p', { style: { fontWeight: 700 } }, `${yearsText(R.months)} from now, paying ${money(Math.round(R.payments + extra))} a month. Interest along the way: about ${money(Math.round(R.interest))}.`)],
    h('div.st-field', {}, h('div.st-flabel', {}, 'Extra you could add each month'), h('div.st-chips', {}, EXTRAS.map(v => chip(v ? `+${money(v)}` : 'Nothing extra', extra === v, () => pick({ soloExtra: v }))))),
    R.saved && R.saved.months > 0 ? h('p.st-readout', { role: 'status' }, `That extra ${money(extra)} gets you there ${yearsText(R.saved.months)} sooner and keeps about ${money(Math.round(R.saved.interest))} of interest in your pocket.`) : null,
    R.count > 1 ? h('div.st-field', {}, h('div.st-flabel', {}, 'Which one first'), h('div.st-chips', {}, ORDERS.map(([id, label]) => chip(label, order === id, () => pick({ soloOrder: id })))),
      h('p.st-small', { style: { margin: '6px 0 0' } }, `${O[2]}. Put everything extra on ${R.first}; keep the others at their usual payment.`,
        R.other && Math.abs(R.other.moreInterest) >= 1 ? ` The other way ${R.other.moreInterest > 0 ? `costs about ${money(Math.round(R.other.moreInterest))} more` : `saves about ${money(Math.round(-R.other.moreInterest))}`} in interest${R.other.firstWin != null && R.firstWin != null && R.other.firstWin !== R.firstWin ? `, and clears its first one ${R.other.firstWin < R.firstWin ? `${R.firstWin - R.other.firstWin} months sooner` : `${R.other.firstWin - R.firstWin} months later`}` : ''}.` : '')) : null,
    !R.never ? h('ol.st-list', { style: { marginTop: '10px' } }, R.debts.map((d, i) => h('li', {}, h('span.dot', {}, i + 1), h('span', {}, d.name, h('small', {}, `About ${money(Math.round(d.interest))} of interest`)), h('span.when', {}, `Gone ${d.date}`)))) : null,
    R.standIns.length ? h('p.st-small.st-soft', {}, `Standing in until you add them: ${R.standIns.map(s => `${s.name} ${s.what === 'rate' ? `at a typical ${+(s.value * 100).toFixed(1)}%` : `paying about ${money(Math.round(s.value))} a month`}`).join('; ')}.`) : null);
}

function draw(api) {
  const me = api.me, at = SOLO.findIndex(s => s.id === me.id);
  $('step').textContent = `Step ${at + 1} of ${SOLO.length}`;
  const B = bookOf(api.store.doc, DEBT_BOOK);
  const next = btn(`Next: ${me.nextLabel} ›`, async () => { location.href = await api.nextUrl(); }, 'primary big');
  const swap = () => { const fresh = answer(api); result.replaceWith(fresh); result = fresh; next.disabled = !fresh.classList.contains('hero'); next.classList.toggle('st-pulse', !next.disabled && !document.querySelector('#main .st-book .st-pulse')); };
  result = answer(api);
  $('main').replaceChildren(
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, me.title),
      h('p', { style: { marginBottom: 0 } }, 'List what you owe. You get the month it is gone, which one to pay first, and what a little extra does. Nothing is uploaded: your numbers live in this page\'s address.')),
    h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, 'What you owe'), bookUI({ store: api.store, book: DEBT_BOOK, pulse: true, btn, chip, onState: () => { if (result?.isConnected) { swap(); api.save(); } } })),
    result,
    h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, 'Take it with you'),
      h('p.st-small', {}, 'The next step opens with these numbers already in it. Nothing to type twice.'),
      h('div.st-row', {}, next), h('div', { style: { marginTop: '10px' } }, copyLink(api))));
  next.disabled = !B.total; next.classList.toggle('st-pulse', !!B.total && !document.querySelector('#main .st-book .st-pulse'));
  if (!B.count) document.querySelector('#main .st-bookhead .st-btn')?.classList.add('st-pulse');
  $('foot').replaceChildren(h('p.st-small', {}, 'Education, not advice. Your numbers stay in your browser and in the link you choose to share.'));
}
boot('debt', draw);
