// SPDX-License-Identifier: AGPL-3.0-only
// Standalone, off the seven steps: "If the pay stopped, what would I use first?" Life Transitions' ladder as one page:
// every source of money in the order it would be used, what each costs, and the month the last one runs out. Spending,
// cash and investments are the whole plan's questions, so they carry in and out (docs/KIT.md).
// Part 15 (safety nets, Nov 26 2026): a tap row of what is happening. The pay stopping is the ladder as it was, with the
// months at each level of spending (full life, DRAFTT, FAT, food and housing only) and the Rule of 5 beside it. Medical
// leave, a move, a breakup and a new baby each run on the same ladder with the change's own flows (lifeEventOf,
// js/math/safetyplan.js): how long the money lasts, the lowest point, three tripwires with what you would do, Plan B.
import { boot, h, btn, chip, money, numBox, copyLink, foot } from './shell.js';
import { answer, onFile } from '../journey.js';
import { stoppedPayOf } from '../solo.js';
import { monthsText } from '../math/transitions.js';
import { NT_KINDS, NT_TAPS, ntPicks } from '../math/safetynet.js';
import { lifeEventOf } from '../math/safetyplan.js';
import { monthName, addMonths, ymOf } from '../month.js';
import { pack } from '../start/link.js';

const $ = id => document.getElementById(id), AGES = [22, 25, 30, 35, 40, 50, 60];
const KINDS = [{ id: 'layoff', name: 'The pay stops' }, ...NT_KINDS];
const lastsWords = (mo, lasts) => (lasts || mo == null ? 'It carries you through' : monthsText(mo));

// The months at each level of spending with no pay, and the Rule of 5 beside it (the cushion it asks for at your age).
function levelsCard(api, R) {
  const now = new Date();
  const rows = R.levels.map(l => h('li', {}, h('span.dot', {}, ''), h('span', {}, l.name, h('small', {}, l.burn == null ? 'Needs where your money goes: the Budget in the whole plan' : `${money(Math.round(l.burn))} a month`)),
    h('span.when', {}, l.burn == null ? '' : l.lasts || l.runway == null ? 'Past 10 years' : monthsText(l.runway))));
  const r5 = R.ruleOf5;
  const five = r5.needs ? h('div.st-field', {}, h('div.st-flabel', {}, 'The Rule of 5 needs your age, about'), h('div.st-chips', { id: 'ages' }, AGES.map(a => chip(String(a), false, () => { api.store.setDoc('profile', { birthYear: now.getFullYear() - a }); api.render(); }))))
    : h('p', { style: { margin: 0 } }, h('b', {}, `The Rule of 5: ${r5.months.toFixed(1)} months`), ` of spending held in cash at your age (your age divided by 5)${r5.target == null ? '' : `, ${money(Math.round(r5.target))}`}. At full life your cash covers ${R.runway == null ? 'more than that' : monthsText(R.runway)}.`);
  return h('div.st-card', { id: 'levels' }, h('h2', { style: { marginTop: 0 } }, 'How long at each level'),
    h('p.st-small.st-soft', {}, 'With no pay coming in. Each level gives up more, and buys more months.'),
    h('ul.st-list', {}, rows), h('div.st-tile', { style: { marginTop: '12px' } }, five),
    h('details.st-fold', {}, h('summary', {}, 'What each level keeps'), h('ul', { style: { margin: '4px 0 0', paddingLeft: '18px' } }, R.levels.map(l => h('li.st-small', {}, `${l.name}: ${l.tip}`)))));
}

// One change's taps: chips for each, the pick it starts on lit, with a line that says it is a typical pick.
function tapsCard(api, kind, taps) {
  const P = ntPicks(kind, taps), set = (k, v) => { const all = api.mine().nets || {}; api.remember({ nets: { ...all, [kind]: { ...(all[kind] || {}), [k]: taps[k] === v ? null : v } } }); api.render(); };
  return h('div.st-card', { id: 'taps' }, h('h2', { style: { marginTop: 0 } }, 'What changes'),
    NT_TAPS[kind].map(([k, label, opts]) => h('div.st-field', { 'data-k': k }, h('div.st-flabel', {}, label), h('div.st-chips', {}, opts.map(([v, w]) => chip(w, P.v[k] === v, () => set(k, v)))))),
    P.guess ? h('p.st-small.st-soft', { style: { marginBottom: 0 } }, 'A lit pick you did not tap is a starting guess. Tap yours.') : null);
}

function eventCard(api, kind) {
  const taps = (api.mine().nets || {})[kind] || {}, picks = (api.mine().netsTrip || {})[kind] || {};
  const R = lifeEventOf(api.store.doc, api.ref, { kind, taps, picks });
  const name = NT_KINDS.find(k => k.id === kind).short;
  if (!R.ready) return [tapsCard(api, kind, taps), h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your answer shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'Your spending and your cash, and it appears.'))];
  const here = ymOf(new Date()), at = k => monthName(addMonths(here, Math.floor(k)), 'short');
  const E = R.event, needPay = E.needs.includes('pay'), needHome = E.needs.includes('housing');
  const pickTrip = (n, o) => { const all = api.mine().netsTrip || {}, mine = all[kind] || {}; api.remember({ netsTrip: { ...all, [kind]: { ...mine, [n]: mine[n] === o ? null : o } } }); api.render(); };
  const trips = R.trips.map(t => h('div.st-tile', { style: { marginTop: '10px' } },
    h('div', {}, h('b', {}, `${t.months} ${t.months === 1 ? 'month' : 'months'} of the basics left (${money(Math.round(t.level))})`), h('div.st-small.st-soft', {}, t.now ? 'You are there now' : t.k == null ? 'Not reached on this path' : `About ${at(t.k)}`)),
    h('div.st-chips', { style: { marginTop: '8px' } }, t.opts.map(o => chip(o, t.pick === o, () => pickTrip(t.months, o))))));
  const B = R.planB, bWords = B.by === 'draftt' ? 'Spend at the DRAFTT needs from the start' : `Trim ${Math.round(B.trim * 100)}% from the start (${money(Math.round(R.full * B.trim))} a month)`;
  const bLine = B.lasts ? `${bWords}: it carries you through.` : `${bWords}: the money lasts ${monthsText(B.runway)}${B.more != null && B.more > 0.05 ? `, ${monthsText(B.more)} more` : ''}.`;
  const lowest = R.lowest;
  return [tapsCard(api, kind, taps),
    h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, `With ${name}`),
      h('div.st-soft', {}, R.lasts ? 'Your money' : 'Your money lasts'), h('div.st-big', {}, lastsWords(R.runway, R.lasts)),
      h('p', { style: { fontWeight: 700 } }, R.lasts ? `The lowest point is about ${money(Math.max(0, Math.round(lowest.left)))}, in ${monthName(lowest.ym, 'short')}.` : `It runs to ${monthName(addMonths(here, Math.floor(R.runway)), 'short')}, then the next rungs (a card, retirement money) would be needed.`),
      needPay ? h('p.st-small', {}, 'Add your take-home pay above to count the leave.') : null,
      needHome ? h('p.st-small', {}, 'The deposit needs your rent: the Budget in the whole plan.') : null,
      h('details.st-fold', {}, h('summary', {}, 'Show the math'), h('ul', { style: { margin: '4px 0 0', paddingLeft: '18px' } },
        h('li.st-small', {}, `Each month: ${money(Math.round(R.income))} coming in, ${money(Math.round(R.full))} going out, then what changes.`),
        E.flows.map(f => h('li.st-small', {}, `${f.label}: ${f.monthly > 0 ? 'plus' : 'minus'} ${money(Math.round(Math.abs(f.monthly)))} ${f.toK - f.fromK === 1 && f.fromK === 0 ? 'once' : f.toK === Infinity ? 'a month from here on' : `a month for ${monthsText(f.toK - f.fromK)}`}`)),
        h('li.st-small', {}, 'The cash is used in the ladder\'s order: the buffer, little e, then the rest of your savings.'),
        E.weekly === 'take-home' && E.flows.some(f => f.id === 'paid' && E.picks.paid === 'ny') ? h('li.st-small', {}, 'The state benefit is worked on your take-home a week; on your pay before tax it may be a little more.') : null))),
    h('div.st-card', { id: 'trips' }, h('h2', { style: { marginTop: 0 } }, 'Tripwires'), h('p.st-small.st-soft', { style: { margin: 0 } }, 'Decide now what you would do at each level. A choice made on a calm day is easier to keep.'), trips),
    h('div.st-card', { id: 'planb' }, h('h2', { style: { marginTop: 0 } }, 'Plan B'), h('p', { style: { marginTop: 0 } }, bLine),
      B.words.length ? h('ul', { style: { margin: 0, paddingLeft: '18px' } }, B.words.map(w => h('li.st-small', {}, w))) : null,
      R.link?.web ? h('p.st-small', {}, h('a', { href: R.link.web }, R.link.label)) : null)];
}

function draw(api) {
  foot(); const step = $('step'); if (step) step.textContent = 'On its own';
  const kind = KINDS.some(k => k.id === api.mine().netsKind) ? api.mine().netsKind : 'layoff';
  const doc = () => api.store.doc, cashOn = onFile(doc(), 'cash'), cash = cashOn.checking == null && cashOn.savings == null ? null : (cashOn.checking ?? 0) + (cashOn.savings ?? 0);
  const spend = onFile(doc(), 'spending').gut ?? null, inv = onFile(doc(), 'invested').invested ?? null, pay = onFile(doc(), 'income', { ref: api.ref }).takeHome ?? null;
  // the answer, from whatever is on file this instant (so it is right while a number is still being typed)
  const answerCard = () => {
    const R = stoppedPayOf(doc(), api.ref);
    if (!R.ready) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your answer shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'Your spending and your cash, and it appears.'));
    const when = r => (r.month == null ? 'Not reached' : `Reached in month ${Math.floor(r.month) + 1}`);
    return h('div', { id: 'answer-wrap' }, h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Your answer'),
      h('div.st-soft', {}, 'With no pay coming in, your money lasts'), h('div.st-big', {}, R.runway == null ? 'More than 10 years' : monthsText(R.runway)),
      h('p', { style: { fontWeight: 700 } }, R.runway == null ? `At ${money(Math.round(R.burn))} a month, what you have carries you past ten years.` : `At ${money(Math.round(R.burn))} a month it runs to ${monthName(R.floorYm, 'short')}. Here is what you would use, in order.`),
      h('ul.st-list', {}, R.used.map((r, i) => h('li', {}, h('span.dot', {}, ''), h('span', {}, `${i + 1}. ${r.name}`, h('small', {}, [r.cost, when(r)].filter(Boolean).join('. '))), h('span.when', {}, r.amount == null ? '' : money(Math.round(r.amount)))))),
      R.used.some(r => r.id === 'invest') ? h('p.st-small', {}, 'Your invested money is counted here as money you can sell. If it is in a 401(k) or an IRA, taking it out early costs a 10% penalty and income tax, so it would cover less. Say which accounts in the whole plan and that is counted.') : null,
      R.costs > 0.5 ? h('p.st-small', {}, `Used as set, the costly rungs cost about ${money(Math.round(R.costs))} in interest, penalty and tax.`) : null,
      h('details.st-fold', {}, h('summary', {}, `${R.unused.length} more that could help, and what each needs`), h('ul.st-list', {}, R.unused.map(r => h('li', {}, h('span.dot', {}, ''), h('span', {}, r.name, h('small', {}, r.note ?? r.cost ?? '')), h('span.when', {}, ''))))),
      h('p.st-small.st-soft', {}, 'The order is cheapest first: money set aside for this, then savings, then things that cost something to use. Unemployment, family help, side income and a card are counted in the whole plan, where they can be entered.')),
    levelsCard(api, R));
  };
  const body = () => (kind === 'layoff' ? [answerCard()] : eventCard(api, kind));
  let cards = body();
  const pulse = () => { const boxes = [...inputs.querySelectorAll('.st-box .in')], has = boxes.map(x => x.querySelector('input').value !== ''); boxes.forEach((x, i) => x.classList.toggle('st-pulse', i < 2 && !has[i] && has.slice(0, i).every(Boolean))); };
  const set = key => (v, typing) => {
    if (key === 'cash') { const t = cash || 0, c = cashOn.checking ?? 0; answer(api.store, 'cash', v == null ? { checking: 0, savings: 0 } : t > 0 ? { checking: Math.round(v * c / t), savings: v - Math.round(v * c / t) } : { checking: 0, savings: v }); }
    else if (key === 'spending') answer(api.store, 'spending', { gut: v ?? 0 });
    else if (key === 'income') answer(api.store, 'income', { takeHome: v ?? 0 });
    else if (v == null || v === 0) answer(api.store, 'invested', {}, { none: true }); else answer(api.store, 'invested', { invested: v });
    if (!typing) return api.render(); api.save(); const fresh = body(); cards.forEach((c, i) => (i === 0 ? c.replaceWith(...fresh) : c.remove())); cards = fresh; pulse(); };
  const pick = id => { api.remember({ netsKind: id }); api.render(); };
  const what = h('div.st-card', { id: 'what' }, h('h2', { style: { marginTop: 0 } }, 'What is happening'), h('div.st-chips', {}, KINDS.map(k => chip(k.name, kind === k.id, () => pick(k.id)))));
  const inputs = h('div.st-card', { onFocusout: e => { const t = e.relatedTarget, main = $('main'); if (!t || t === main || !main.contains(t)) setTimeout(() => api.render(), 0); } }, h('h2', { style: { marginTop: 0 } }, 'Your numbers'),
    numBox('What you spend in a month, all in', spend, [2000, 3000, 4000, 5000, 6500], set('spending'), { id: 'spend' }),
    numBox('Cash you could reach this week (checking and savings)', cash, [1000, 2500, 5000, 10000, 20000], set('cash'), { id: 'cash' }),
    kind === 'layoff' ? numBox('Invested, all accounts', inv, [5000, 20000, 50000, 100000, 250000], set('invested'), { id: 'inv', help: 'Leave it empty to see cash alone.' })
      : numBox('Take-home pay a month', pay, [2500, 3500, 4500, 6000, 8000], set('income'), { id: 'pay', help: 'What lands in your account. It keeps coming, except for what changes.' }));
  const carry = h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Take it with you'), h('p.st-small', {}, 'Your link keeps these numbers. Your plan keeps its pay: this page only asks what if.'),
    h('div.st-row', {}, copyLink(api), btn('All the steps', async () => { location.href = `one.html#/d/${await pack(api.store.doc)}`; }, 'slim')));
  $('main').replaceChildren(...[
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Turn panic into a number'), h('h1', {}, 'If the pay stopped, what would I use first?'), h('p', { style: { marginBottom: 0 } }, 'Every source of money you have, in the order you would reach for it, and the month the last one runs out. Or a medical leave, a move, a breakup or a new baby.')),
    what, inputs, ...cards, carry].filter(Boolean));
  pulse();
}
boot('ladder', draw);
