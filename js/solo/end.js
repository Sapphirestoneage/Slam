// SPDX-License-Identifier: AGPL-3.0-only
// Standalone: "Start at the finish line". The end first (what you need), then backwards: by when, what you have, what
// comes in and goes out. Each answer opens the next, and the picture fills in toward today. What you have, your pay and
// your spending are the whole plan's own questions, so they carry straight in.
import { boot, h, chip, money, numBox, stepLine, carryCard, foot } from './shell.js';
import { answer, onFile } from '../journey.js';
import { backwardsOf, NEED_MONTH, WHEN_YEARS } from '../solo.js';

const $ = id => document.getElementById(id);
let wired = false;
const PER = [['month', 'A month'], ['year', 'A year'], ['total', 'A total']], PICKS = { month: NEED_MONTH, year: NEED_MONTH.map(v => v * 12), total: [500000, 750000, 1000000, 1500000, 2000000, 3000000] };
function read(api) {
  const g = api.mine().goal || {}, inv = onFile(api.store.doc, 'invested').invested ?? null, pay = onFile(api.store.doc, 'income', { ref: api.ref }).takeHome ?? null, spend = onFile(api.store.doc, 'spending').gut ?? null;
  return { g, B: backwardsOf({ need: g.need ?? null, per: g.per ?? 'month', years: g.years ?? null, have: inv, takeHome: pay, spending: spend, ref: api.ref }), inv, pay, spend };
}
function draw(api) {
  stepLine(api); foot();
  const { g, B, inv, pay, spend } = read(api), per = g.per ?? 'month';
  const goal = patch => { api.remember({ goal: { ...g, ...patch } }); api.render(); };
  const typed = (fn) => (v, typing) => { fn(v); if (!typing) api.render(); else { api.save(); const R = read(api).B, big = $('answer')?.querySelector('.st-big'); if (big && R.step >= 4 && !R.growsThere) big.textContent = `${money(Math.round(R.needed))} a month`; } };
  const card = (n, title, body, on) => h(`div.st-card${on ? '' : '.st-waiting'}`, { 'data-step': n }, h('div.st-eyebrow', {}, `${n} of 4`), h('h2', { style: { margin: '0 0 6px' } }, title), on ? body : h('p.st-soft', { style: { margin: 0 } }, 'Opens after the step above.'));
  const pct = v => `${+(v * 100).toFixed(1)}%`;
  const answerCard = B.step < 4 ? null : h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Working backwards, here is today'),
    B.alreadyThere ? [h('div.st-big', {}, 'You are already there'), h('p', { style: { fontWeight: 700 } }, `What you have covers ${money(Math.round(B.aMonth))} a month from here on.`)]
      : B.growsThere ? [h('div.st-big', {}, 'It grows there on its own'), h('p', { style: { fontWeight: 700 } }, `Left alone, what you have grows to about ${money(Math.round(B.grown))} by ${B.byYear}. Nothing more has to go in.`)]
      : [h('div.st-soft', {}, `To have ${money(Math.round(B.total))} by ${B.byYear}, you put in`), h('div.st-big', {}, `${money(Math.round(B.needed))} a month`),
        B.step === 5 ? h('p', { style: { fontWeight: 700 } }, B.onTrack ? `You have ${money(Math.round(B.left))} a month left over, which covers it with ${money(Math.round(-B.gap))} to spare.` : `You have ${money(Math.round(B.left))} a month left over, so the gap is ${money(Math.round(B.gap))} a month.`) : h('p', { style: { fontWeight: 700 } }, 'One more step shows whether today covers that.')],
    B.step === 5 && !B.alreadyThere && !B.growsThere ? h('ul.st-list', {},
      B.onPaceYear != null ? h('li', {}, h('span.dot', {}, ''), h('span', {}, 'At today\'s pace', h('small', {}, `Putting in the ${money(Math.round(Math.max(0, B.left)))} you have left over`)), h('span.when', {}, `About ${B.onPaceYear}`)) : h('li', {}, h('span.dot', {}, ''), h('span', {}, 'At today\'s pace', h('small', {}, 'Nothing is left over to put in yet')), h('span.when', {}, 'No date yet')),
      !B.onTrack ? h('li', {}, h('span.dot', {}, ''), h('span', {}, 'Close it by spending', h('small', {}, 'Spending less also lowers what you need later')), h('span.when', {}, `${money(Math.round(B.spendToClose))} a month`)) : null,
      !B.onTrack ? h('li', {}, h('span.dot', {}, ''), h('span', {}, 'Or close it by earning', h('small', {}, 'Take-home pay that would cover it')), h('span.when', {}, `${money(Math.round(B.earnToClose))} a month`)) : null,
      !B.onTrack ? h('li', {}, h('span.dot', {}, ''), h('span', {}, 'Or give it more time', h('small', {}, 'Tap a later year in step 2 and watch the number fall')), h('span.when', {}, '')) : null) : null,
    h('p.st-small.st-soft', {}, `In today's dollars. Growth of ${pct(B.realReturn)} a year after inflation and taking out ${pct(B.withdrawalRate)} a year, the same as the whole plan. Tax on what you take out later is not counted here.`));
  const keep = document.activeElement?.id;
  $('main').replaceChildren(
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, api.me.title), h('p', { style: { marginBottom: 0 } }, 'Begin with the end. Say what you need, then when, and we work backwards to what today has to look like.')),
    card(1, 'What do you need to live on, once work is optional?', [
      h('div.st-field', {}, h('div.st-flabel', {}, 'Say it as'), h('div.st-chips', {}, PER.map(([id, l]) => chip(l, per === id, () => goal({ per: id, need: null }))))),
      numBox(per === 'total' ? 'The total you want invested' : per === 'year' ? 'What you need a year, in today\'s dollars' : 'What you need a month, in today\'s dollars', g.need ?? null, PICKS[per], typed(v => api.remember({ goal: { ...g, need: v } })), { id: 'need' }),
      B.step >= 2 ? h('p.st-readout', { role: 'status' }, per === 'total' ? `${money(Math.round(B.total))} pays about ${money(Math.round(B.aMonth))} a month, for good.` : `That takes about ${money(Math.round(B.total))} invested.`) : null], true),
    card(2, 'By when?', [h('div.st-chips', {}, WHEN_YEARS.map(y => chip(`${y} years`, g.years === y, () => goal({ years: y })))), B.step >= 3 ? h('p.st-readout', { role: 'status' }, `That is ${B.byYear}.`) : null], B.step >= 2),
    card(3, 'What do you have invested today?', [numBox('Everything invested: 401(k), IRA, brokerage', inv, [0, 5000, 25000, 100000, 250000, 500000], typed(v => answer(api.store, 'invested', { invested: v ?? 0 })), { id: 'have' }),
      B.step >= 4 && !B.alreadyThere ? h('p.st-readout', { role: 'status' }, `You are ${Math.round(B.share * 100)}% of the way. Left alone it grows to about ${money(Math.round(B.grown))} by ${B.byYear}.`) : null], B.step >= 3),
    card(4, 'What comes in and what goes out, each month?', [
      numBox('Take-home pay a month', pay, [2500, 3500, 4500, 6000, 8000], typed(v => answer(api.store, 'income', { takeHome: v ?? 0 })), { id: 'pay' }),
      numBox('What you spend a month, all in', spend, [2000, 3000, 4000, 5000, 6500], typed(v => answer(api.store, 'spending', { gut: v ?? 0 })), { id: 'spend' })], B.step >= 4),
    answerCard, carryCard(api, { ready: true, pulse: B.step === 5 }));
  // one pulse: the first step still waiting for an answer
  if (B.step < 5) { const at = document.querySelector(`[data-step="${B.step === 4 ? 4 : B.step}"]`), box = B.step === 2 ? at?.querySelector('.st-chips') : at?.querySelectorAll('.st-box .in')[B.step === 4 && pay != null ? 1 : 0]; box?.classList.add('st-pulse'); }
  if (!wired) { wired = true; $('main').addEventListener('focusout', e => { const t = e.relatedTarget, main = $('main'); if (e.target.matches?.('input') && (!t || t === main || !main.contains(t))) setTimeout(() => api.render(), 0); }); } // leaving a box redraws; a tap on a chip redraws on its own
  if (keep) $(keep)?.focus?.();
}
boot('end', draw);
