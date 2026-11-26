// SPDX-License-Identifier: AGPL-3.0-only
// Three pages that answer from the whole plan instead of a formula (Runs 5 and 6): afford.html "Can I afford it?"
// (js/math/afford.js, M83), cost.html "What is my debt really costing me?" (js/math/truecost.js) and student.html
// "Which student loan plan costs least?" (js/math/studentloan.js). Each asks only for what its math reads, writes it to
// the plan's own answers so nothing is typed twice, and shows the sentence the math returns. No math lives here.
import { boot, h, btn, chip, money, numBox, copyLink, foot } from './shell.js';
import { bookUI } from '../start/book-ui.js';
import { DEBT_BOOK, bookOf, setField } from '../book.js';
import { answer, onFile } from '../journey.js';
import { affordOf } from '../math/afford.js';
import { trueCostOf } from '../math/truecost.js';
import { studentLoanPlans } from '../math/studentloan.js';
import { familyCard, pslfCard, refiCard, ladderCard } from './studentcards.js';
import { ymOf, addMonths, monthName } from '../month.js';
import { pack } from '../start/link.js';

const $ = id => document.getElementById(id), big = v => money(Math.round(v));
const PLAN = { takeHome: ['income', 'takeHome'], spending: ['spending', 'gut'], savings: ['cash', 'savings'], invested: ['invested', 'invested'] };
const got = (api, k) => onFile(api.store.doc, PLAN[k][0], { ref: api.ref })[PLAN[k][1]] ?? null;
const put = (api, k, v) => answer(api.store, PLAN[k][0], { [PLAN[k][1]]: v });
const BOX = { takeHome: ['What lands in your account in a month', [3000, 4000, 5000, 6500, 8000], 'After taxes. A rough number is enough.'], spending: ['What you spend in a month, all in', [2000, 3000, 4000, 5000, 6500], 'Everything, debt payments included.'],
  savings: ['What you have in savings', [0, 1000, 5000, 10000, 25000], '$0 is an answer.'], invested: ['What you have invested', [0, 10000, 50000, 150000, 400000], 'Retirement accounts and brokerage, added up.'] };
const waiting = words => h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your answer shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, words));
const fold = (summary, ...paras) => h('details.st-fold', {}, h('summary', {}, summary), paras.filter(Boolean).map(p => h('p.st-small', {}, p)));
const rowsOf = rows => h('ul.st-list', {}, rows.map(([label, small, value]) => h('li', {}, h('span.dot', {}, ''), h('span', {}, label, small ? h('small', {}, small) : null), h('span.when', {}, value))));
const carryOf = (api, words) => h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Take it with you'), h('p.st-small', {}, words), h('div.st-row', {}, copyLink(api), btn('All the steps', async () => { location.href = `one.html#/d/${await pack(api.store.doc)}`; }, 'slim')));
const hero = (title, why) => h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, title), h('p', { style: { marginBottom: 0 } }, why));
// The plan's own boxes: typing redraws the answer card only; leaving the card redraws the page.
function basics(api, keys, swap, title = 'Your month') {
  return h('div.st-card', { onFocusout: e => { const t = e.relatedTarget, main = $('main'); if (!t || t === main || !main.contains(t)) setTimeout(() => api.render(), 0); } }, h('h2', { style: { marginTop: 0 } }, title),
    keys.map(k => numBox(BOX[k][0], got(api, k), BOX[k][1], (v, typing) => { put(api, k, v); if (!typing) return api.render(); api.save(); swap(); }, { id: `f_${k}`, help: BOX[k][2] })));
}

// ---------- Can I afford it? ----------
const THINGS = [['A trip', 'once', [500, 1500, 3000, 5000, 8000]], ['A car payment', 'monthly', [250, 400, 550, 700, 900]], ['A new phone', 'once', [400, 800, 1200, 1600]], ['A wedding', 'goal', [5000, 15000, 30000, 50000]], ['A course', 'once', [500, 2000, 5000, 12000]], ['A down payment', 'goal', [15000, 30000, 60000, 100000]], ['A subscription', 'monthly', [15, 30, 60, 120]], ['Something else', 'once', [250, 1000, 2500, 5000, 10000]]];
const KINDS = [['once', 'One time'], ['monthly', 'Every month'], ['goal', 'A big goal to save for']];
const WHEN = [[0, 'This month'], [3, 'In 3 months'], [6, 'In 6 months'], [12, 'In a year'], [24, 'In 2 years'], [36, 'In 3 years']];
const LASTS = [[1, '1 year'], [3, '3 years'], [5, '5 years'], [null, 'For good']];
function afford(api) {
  const m = api.mine(), now = new Date(), here = ymOf(now), pick = patch => { api.remember(patch); api.render(); };
  const name = m.affName ?? null, T = THINGS.find(t => t[0] === name), kind = m.affKind ?? T?.[1] ?? 'once', when = m.affWhen ?? (kind === 'goal' ? 12 : kind === 'monthly' ? 0 : 6), lasts = m.affLasts === undefined ? (name === 'A car payment' ? 5 : null) : m.affLasts;
  const card = (amount = m.affAmount ?? null) => {
    const takeHome = got(api, 'takeHome'), spending = got(api, 'spending');
    if (!amount || !takeHome || !spending) return waiting(!amount ? 'Pick the thing and what it costs, and it appears.' : 'Add what comes in and what goes out in a month, and it appears. Rough numbers are fine.');
    const A = affordOf(api.store.doc, api.ref, { kind, amount, ym: addMonths(here, kind === 'monthly' ? 0 : Math.max(when, kind === 'goal' ? 1 : 0)), years: kind === 'monthly' ? lasts : null, name: name && name !== 'Something else' ? name : null }, { now });
    if (!A.line) return waiting(A.text ?? 'A little more and it appears.');
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Your answer'), h('p.st-lead', { style: { fontWeight: 800, fontSize: '1.25rem', lineHeight: 1.3, margin: '4px 0 8px' } }, A.line), h('p', {}, A.from),
      A.numbers?.length ? rowsOf(A.numbers.filter(n => n.show && (n.label !== 'FI date' || got(api, 'invested') != null)).map(n => [n.label, n.sub, n.show])) : null,
      fold('How this is worked out', 'Your plan is run twice: as it is, and with this cost in. The answer is the difference between the two. Nothing here is saved to your plan.', A.text,
        'This is "give every dollar a job" (YNAB) asked of one purchase: a cost has to come from somewhere, so the answer says where. The steps it names are the Financial Order of Operations (The Money Guy Show).'));
  };
  let result = card();
  const swap = () => { const fresh = card(); result.replaceWith(fresh); result = fresh; };
  const thing = h('div.st-card', { onFocusout: e => { const t = e.relatedTarget, main = $('main'); if (!t || t === main || !main.contains(t)) setTimeout(() => api.render(), 0); } }, h('h2', { style: { marginTop: 0 } }, 'The thing'),
    h('div.st-field', {}, h('div.st-flabel', {}, 'What is it'), h('div.st-chips', { id: 'things' }, THINGS.map(([n, k]) => chip(n, name === n, () => pick({ affName: n, affKind: k, affAmount: null, affWhen: undefined, affLasts: undefined }))))),
    h('div.st-field', {}, h('div.st-flabel', {}, 'How it is paid'), h('div.st-chips', {}, KINDS.map(([k, label]) => chip(label, kind === k, () => pick({ affKind: k }))))),
    numBox(kind === 'monthly' ? 'What it costs a month' : 'What it costs', m.affAmount ?? null, T?.[2] ?? THINGS.at(-1)[2], (v, typing) => { api.remember({ affAmount: v }); if (!typing) return api.render(); api.save(); const fresh = card(v); result.replaceWith(fresh); result = fresh; }, { id: 'f_amount' }),
    kind === 'monthly' ? h('div.st-field', {}, h('div.st-flabel', {}, 'How long it lasts'), h('div.st-chips', {}, LASTS.map(([y, label]) => chip(label, lasts === y, () => pick({ affLasts: y })))))
      : h('div.st-field', {}, h('div.st-flabel', {}, 'When'), h('div.st-chips', {}, WHEN.filter(([n]) => kind !== 'goal' || n > 0).map(([n, label]) => chip(n ? `${label} (${monthName(addMonths(here, n), 'short')})` : label, when === n, () => pick({ affWhen: n }))))));
  $('main').replaceChildren(hero('Can I afford it?', 'Not a yes or a no. Where the money would come from, what it pushes back, and by how much. Then it is your call.'), thing, basics(api, ['takeHome', 'spending', 'savings'], swap), result,
    carryOf(api, 'Your link keeps this answer. In the whole plan you can turn it into a goal with one tap.'));
  if (!name) $('things')?.classList.add('st-pulse'); else if (!m.affAmount) $('f_amount')?.closest('.in')?.classList.add('st-pulse'); else ['takeHome', 'spending'].some(k => got(api, k) == null && ($(`f_${k}`)?.closest('.in')?.classList.add('st-pulse'), true));
}

// ---------- What is my debt really costing me? ----------
function cost(api) {
  const card = () => {
    const B = bookOf(api.store.doc, DEBT_BOOK);
    if (!B.count) return waiting('Add one thing you owe and it appears. A rough amount is enough to start.');
    if (!got(api, 'takeHome') || !got(api, 'spending')) return waiting('Add what comes in and what goes out in a month, and it appears. That is how the page knows what a payment is holding back.');
    const R = trueCostOf(api.store.doc, api.ref, {});
    if (R.needs?.length || !R.lines?.length) return waiting(`Still needed: ${(R.needs ?? ['a balance, a rate and a payment']).join(', ')}.`);
    const total = R.lines.reduce((s, l) => s + (Number.isFinite(l.interest) ? l.interest : 0), 0), stuck = R.lines.filter(l => !Number.isFinite(l.interest));
    const held = l => l.fi?.cost ?? null, most = [...R.lines].filter(l => held(l) != null).sort((a, b) => held(b) - held(a))[0];
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Your answer'), h('div.st-soft', {}, 'Interest still to pay, on your plan'), h('div.st-big', {}, stuck.length === R.lines.length ? 'It keeps growing' : big(total)),
      h('p', { style: { fontWeight: 700 } }, [stuck.length ? `${stuck.map(l => l.name).join(' and ')}: the payment does not cover the interest yet, so ${stuck.length === 1 ? 'it is' : 'they are'} left out of that total.` : null,
        most && held(most) > 0 ? `${most.name} holds back the day work becomes optional the most: ${held(most)} ${held(most) === 1 ? 'month' : 'months'}.` : null].filter(Boolean).join(' ') || 'Each debt, priced three ways, is below.'),
      h('div.st-small.st-soft', { style: { textAlign: 'right' } }, 'Months of freedom it holds back'), rowsOf(R.lines.map(l => [`${l.name}, ${+(l.apr * 100).toFixed(1)}%`, [Number.isFinite(l.interest) ? `${big(l.interest)} of interest left` : 'Payment is under the interest', l.endsYm ? `gone ${monthName(l.endsYm, 'short')}` : null, l.afterTax?.rate != null && Math.abs(l.afterTax.rate - l.apr) > 0.0005 ? `about ${+(l.afterTax.rate * 100).toFixed(2)}% after tax` : null].filter(Boolean).join(', '), held(l) != null ? `${held(l)} ${held(l) === 1 ? 'month' : 'months'}` : `${+(l.apr * 100).toFixed(1)}%`])),
      fold('How this is worked out', R.text, ...R.lines.map(l => `${l.name}: ${l.text}`), 'The "months of freedom" idea, pricing a debt by the time it adds before work is optional, comes from Vicki Robin and Joe Dominguez (Your Money or Your Life) and the FI community that followed.'));
  };
  let result = card();
  const swap = () => { const fresh = card(); result.replaceWith(fresh); result = fresh; };
  $('main').replaceChildren(hero('What is my debt really costing me?', 'The rate on the statement is one price. Here are three more: the interest still to come, what it is after taxes, and how many months of freedom each debt is holding back.'),
    h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, 'What you owe'), bookUI({ store: api.store, book: DEBT_BOOK, pulse: true, btn, chip, onState: () => { if (result?.isConnected) { swap(); api.save(); } } })),
    basics(api, ['takeHome', 'spending', 'invested'], swap), result, carryOf(api, 'Your link keeps this answer. When am I debt free? gives the month it is all gone and which one to pay first.'));
  if (!bookOf(api.store.doc, DEBT_BOOK).count) document.querySelector('#main .st-bookhead .st-btn')?.classList.add('st-pulse');
}

// ---------- Which student loan plan costs least? ----------
const FED = DEBT_BOOK.sections.find(s => s.id === 'student').more.find(f => f.id === 'federal');
function student(api) {
  const loans = () => bookOf(api.store.doc, DEBT_BOOK).sections.find(s => s.id === 'student').rows;
  const card = () => {
    const L = loans();
    if (!L.length) return waiting('Add a student loan and it appears: what is owed, the rate and what you pay now.');
    const ask = L.filter(r => !r.rec.values?.federal).map(r => h('div.st-field', {}, h('div.st-flabel', {}, `${r.rec.name ?? 'This loan'}: who is it from`), h('div.st-chips.st-pulse', {}, FED.options.map(([v, label]) => chip(v === 'Federal' ? 'The government (federal)' : 'A bank or lender (private)', false, () => { setField(api.store, r.id, FED, v); api.render(); })))));
    if (!got(api, 'takeHome')) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your answer shows here'), ask, h('p.st-soft', { style: { marginBottom: 0 } }, 'Add what lands in your account in a month. The income-based plans set the payment from your pay.'));
    const R = studentLoanPlans(api.store.doc, api.ref, {});
    if (R.needs?.length || !R.rows?.length) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your answer shows here'), ask, h('p.st-soft', { style: { marginBottom: 0 } }, ask.length ? 'Only federal loans have these plans, so the page needs to know which kind each one is.' : R.text));
    const open = R.rows.filter(r => r.available !== false), low = [...open].sort((a, b) => a.payment - b.payment)[0], least = open.find(r => r.id === R.lowestTotal) ?? [...open].sort((a, b) => a.paid - b.paid)[0];
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Your answer'), ask, h('div.st-soft', {}, 'Least paid in all'), h('div.st-big', {}, least.name.split(',')[0]),
      h('p', { style: { fontWeight: 700 } }, `${big(least.paid)} in all at ${big(least.payment)} a month.${low.id !== least.id ? ` The lowest payment is ${low.name.split(',')[0]} at ${big(low.payment)} a month, ${big(low.paid)} in all.` : ' It is also the lowest payment.'}`),
      rowsOf(R.rows.map(r => [r.name, [r.available === false ? 'Not open to this loan' : `${big(r.paid)} in all`, r.forgiven > 0.5 ? `${big(r.forgiven)} forgiven` : null, r.endsYm ? `done ${monthName(r.endsYm, 'short')}` : null].filter(Boolean).join(', '), `${big(r.payment)}/mo`])),
      R.words ? h('p.st-small.st-soft', {}, R.words) : null,
      fold('How this is worked out', R.text, 'The plans and their rules are the ones the Department of Education publishes (studentaid.gov). The lowest payment is not always the least paid: a smaller payment can mean more years of interest.', 'Public Service Loan Forgiveness, a job change, a raise or a marriage all move these numbers. The whole plan keeps them current.'));
  };
  let result = card();
  const swap = () => { const fresh = card(); result.replaceWith(fresh); result = fresh; };
  $('main').replaceChildren(hero('Which student loan plan costs least?', 'Federal loans come with a menu of repayment plans. Each one is priced here on your loan and your pay: the monthly payment, the total, and what is forgiven.'),
    h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, 'Your student loans'), bookUI({ store: api.store, book: DEBT_BOOK, only: ['student'], pulse: true, btn, chip, onState: () => { if (result?.isConnected) { swap(); api.save(); } } })),
    basics(api, ['takeHome'], swap, 'Your pay'), result, ...extras(api), carryOf(api, 'Your link keeps this answer. What is my debt really costing me? prices every debt you have, this one included.'));
  if (!loans().length) document.querySelector('#main .st-bookhead .st-btn')?.classList.add('st-pulse');
}

// Part 5 of the run of Nov 25 2026: the household size, PSLF, a private refinance and the stepladder, under the answer.
function extras(api) {
  const R = got(api, 'takeHome') ? studentLoanPlans(api.store.doc, api.ref, {}) : null;
  return [familyCard(api, R), pslfCard(api, R), refiCard(api, R), ladderCard(api)].filter(Boolean);
}

const PAGES = { afford, cost, student };
boot(document.documentElement.dataset.tool, api => { foot(); const step = $('step'); if (step) step.textContent = 'On its own'; PAGES[document.documentElement.dataset.tool](api); });
