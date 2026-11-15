// SPDX-License-Identifier: AGPL-3.0-only
// Standalone, off the seven steps: "What does this loan really cost?" Three taps (the amount, the rate, the years) and
// the loan is priced four ways: a month, in all, against investing the payment, and in FI terms (docs/KIT.md).
import { boot, h, btn, chip, money, numBox, copyLink, foot } from './shell.js';
import { loanCostOf, LOAN_AMOUNTS, LOAN_RATES, LOAN_YEARS } from '../solo.js';
import { pack } from '../start/link.js';

const $ = id => document.getElementById(id), pct = v => `${+(v * 100).toFixed(1)}%`;
function draw(api) {
  foot(); const step = $('step'); if (step) step.textContent = 'On its own';
  const m = api.mine(), amount = m.loanAmount ?? null, apr = m.loanApr ?? null, years = m.loanYears ?? null;
  const pick = patch => { api.remember(patch); api.render(); };
  const answerCard = (now = amount) => { // `now`: the amount as it stands while it is being typed
    const R = loanCostOf({ amount: now, apr, years, ref: api.ref });
    if (!R.ready) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your answer shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'The amount, the rate and the years, and it appears.'));
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Your answer'),
      h('div.st-soft', {}, `${money(R.amount)} borrowed costs, in all`), h('div.st-big', {}, money(Math.round(R.paid))),
      h('p', { style: { fontWeight: 700 } }, R.interest > 0.5 ? `${money(Math.round(R.payment))} a month for ${R.years} years. ${money(Math.round(R.interest))} of that is interest: every dollar borrowed costs ${money(Math.round(R.perDollar * 100) / 100)} to pay back.` : `${money(Math.round(R.payment))} a month for ${R.years} years, and no interest at 0%.`),
      h('ul.st-list', {},
        h('li', {}, h('span.dot', {}, ''), h('span', {}, 'The same payment, invested', h('small', {}, `${money(Math.round(R.payment))} a month for ${R.years} years at ${pct(R.realReturn)}`)), h('span.when', {}, money(Math.round(R.invested)))),
        h('li', {}, h('span.dot', {}, ''), h('span', {}, 'In FI terms, while it is owed', h('small', {}, 'A payment is spending: 25 times its year')), h('span.when', {}, money(Math.round(R.fiNumber)))),
        R.interest > 0.5 ? h('li', {}, h('span.dot', {}, ''), h('span', {}, 'The interest in today\'s dollars', h('small', {}, `Prices rising ${pct(R.inflation)} a year make later payments lighter`)), h('span.when', {}, money(Math.round(R.interestToday)))) : null),
      h('details.st-fold', {}, h('summary', {}, 'How this is worked out, and what it leaves out'),
        h('p.st-small', {}, 'A level payment each month, the way a car loan, a school loan or a mortgage is paid. Interest is charged on what is still owed.'),
        h('p.st-small', {}, 'It leaves out what the loan buys. A degree that raises your pay or a home you would otherwise rent can be worth more than the cost shown. Fees, and tax breaks on some interest, are not counted.')));
  };
  let card = answerCard();
  const setAmount = (v, typing) => { api.remember({ loanAmount: v }); if (!typing) return api.render(); api.save(); const fresh = answerCard(v); card.replaceWith(fresh); card = fresh; marks(v); };
  const marks = a => { inputs.querySelector('.st-box .in')?.classList.toggle('st-pulse', a == null); $('rates')?.classList.toggle('st-pulse', a != null && apr == null); $('years')?.classList.toggle('st-pulse', a != null && apr != null && years == null); };
  const inputs = h('div.st-card', { onFocusout: e => { const t = e.relatedTarget, main = $('main'); if (!t || t === main || !main.contains(t)) setTimeout(() => api.render(), 0); } }, h('h2', { style: { marginTop: 0 } }, 'Three taps'),
    numBox('How much is borrowed', amount, LOAN_AMOUNTS, setAmount, { id: 'amount' }),
    h('div.st-field', {}, h('div.st-flabel', {}, 'The yearly rate (APR)'), h('div.st-chips', { id: 'rates' }, LOAN_RATES.map(r => chip(pct(r), apr === r, () => pick({ loanApr: r }))))),
    h('div.st-field', {}, h('div.st-flabel', {}, 'Paid back over'), h('div.st-chips', { id: 'years' }, LOAN_YEARS.map(y => chip(`${y} years`, years === y, () => pick({ loanYears: y }))))));
  const carry = h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Take it with you'), h('p.st-small', {}, 'Your link keeps this answer. For debts you already have, When am I debt free? gives the month they are gone.'),
    h('div.st-row', {}, copyLink(api), btn('All the steps', async () => { location.href = `one.html#/d/${await pack(api.store.doc)}`; }, 'slim')));
  $('main').replaceChildren(...[
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, 'What does this loan really cost?'), h('p', { style: { marginBottom: 0 } }, 'A car, school, a card balance turned into a loan. The price of borrowing, a month and in all, before you sign.')),
    inputs, card, carry].filter(Boolean));
  marks(amount);
}
boot('loan', draw);
