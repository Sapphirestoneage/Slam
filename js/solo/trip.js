// SPDX-License-Identifier: AGPL-3.0-only
// Standalone, off the seven steps: "What does this trip really cost?" A FIRE retreat, a conference, any trip. The
// price today is not the cost: the cost is what that money would have become. One number in and an age; the plan's own
// pay, spending and investments carry in and show how far the trip moves the date (docs/KIT.md).
// Run of Nov 25 2026, Part 4: the trip line by line (flights, lodging, food a day, the card's fee on other currencies,
// visa fees, travel insurance), points (cash or redeem), a group trip split by share or by item in one currency, and
// the FIRE journey map with where you are and how the trip moves you on it. All the math is js/math/trip.js (the one
// engine with the game), the household split engine under it, the ladder and the plan's own FI date (M8T).
import { boot, h, btn, chip, money, numBox, copyLink, foot } from './shell.js';
import { answer, onFile } from '../journey.js';
import { tripCostOf, TRIP_COSTS, TRIP_AGE_PICKS } from '../solo.js';
import { journeyInputs, journeyStatusRows } from '../math/ladder.js';
import { pack } from '../start/link.js';
import { fwWealthStage, FW_WEALTH, FW_K25_SOURCE } from '../math/frameworks.js'; // run Not built, groups 1 to 5, Part 4: the wealth stages, on the journey's own net worth
import { TP_LINES, TP_FX_CAN, TP_FX_START, TP_OPTS, TP_TAPS_NOTE, TP_CURRENCIES, TP_SOURCES, tpMoney, tpCost, tpCostWords, tpCostMath, tpLevel, tpPoints, tpPointsWords, tpPointsMath,
  tpSplit, tpSplitWords, tpSplitMath, tpJourney, tpJourneyWords, tpJourneyMath, tpDayWords } from '../math/trip.js';

const $ = id => document.getElementById(id);
const span = m => (m >= 24 ? `${(m / 12).toFixed(1)} years` : `${m} ${m === 1 ? 'month' : 'months'}`);
const LEVEL_TIP = { Guess: 'Some lines are open, or they are a best guess. It will move as they firm up.', Close: 'From prices you looked up.', Exact: 'Booked, or on your statement.' };
const tag = level => (level ? h(`span.st-tag${level === 'Guess' ? '' : '.yours'}`, { title: LEVEL_TIP[level] }, level) : null);
const open = new Set(); // which folds are open, kept while the page is redrawn
const fold = (id, summary, ...body) => h('details.st-fold', { open: open.has(id), onToggle: e => { if (e.target.open) open.add(id); else open.delete(id); } }, h('summary', {}, summary), ...body);
const math = (id, lines) => (lines.length ? fold(id, 'Show the math', lines.map(t => h('p.st-small', {}, t))) : null);
const rows = list => h('ul.st-list', {}, list.filter(Boolean).map(([label, small, value, cls]) => h(`li${cls ? '.' + cls : ''}`, {}, h('span.dot', {}, ''), h('span', {}, label, small ? h('small', {}, small) : null), h('span.when', {}, value))));
const PLAN = { takeHome: ['income', 'takeHome'], spending: ['spending', 'gut'], invested: ['invested', 'invested'] };
const BOX = { takeHome: ['What lands in your account in a month', [3000, 4000, 5000, 6500, 8000], 'After taxes. A rough number is enough.'], spending: ['What you spend in a month, all in', [2000, 3000, 4000, 5000, 6500], 'Everything, debt payments included.'],
  invested: ['What you have invested', [0, 10000, 50000, 150000, 400000], 'Retirement accounts and brokerage, added up.'] };
const k = key => `tp_${key}`;

function draw(api) {
  foot(); const step = $('step'); if (step) step.textContent = 'On its own';
  const get = key => api.mine()[k(key)] ?? null;
  const set = (key, v) => { api.remember({ [k(key)]: v }); api.render(); };
  const keep = (key, v) => { api.remember({ [k(key)]: v }); api.save(); };
  const toggle = (key, v) => set(key, get(key) === v ? null : v);
  const picks = (key, label, list, show, note) => h('div.st-field', {}, h('div.st-flabel', {}, label),
    h('div.st-chips', { role: 'group', 'aria-label': label }, list.map(v => chip(show(v), get(key) === v, () => toggle(key, v)))), note ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, note) : null);
  const cur = get('cur') ?? 'USD', usd = cur === 'USD', M = v => tpMoney(v, cur), big = v => M(Math.round(v));
  // one amount in the trip's currency: a box with the currency's sign, and amounts to tap under it
  const sign = tpMoney(0, cur).replace(/[\d.,\s]/g, '') || cur;
  const amountBox = (key, label, list, help) => {
    const v = get(key);
    const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: '0', id: `tp_${key}`, 'aria-label': label, value: v == null ? '' : Number(v).toLocaleString('en-US'),
      onInput: e => { const n = e.target.value.replace(/[^\d.]/g, ''); keep(key, n === '' ? null : Number(n)); }, onKeydown: e => { if (e.key === 'Enter') e.target.blur(); } });
    return h('div.st-field', {}, h('div.st-flabel', {}, label), h('div.st-box.narrow', {}, h('div.in', {}, h('span', {}, sign), input)),
      h('div.st-chips', { style: { marginTop: '8px' } }, list.map(a => chip(M(a), v === a, () => toggle(key, a)))), help ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, help) : null);
  };
  const redrawOnLeave = { onFocusout: e => { const t = e.relatedTarget, main = $('main'); if (!t || t === main || !main.contains(t)) setTimeout(() => api.render(), 0); } };

  // ---------- the trip, line by line ----------
  const fxOn = get('fxOn') ?? TP_FX_START;
  const P = tpPoints({ cash: get('pCash'), points: get('pPoints'), fees: get('pFees'), cpp: get('pCpp') });
  const usePoints = get('usePoints') === true && !P.needs?.length;
  const lx = { flights: get('flights'), lodging: get('lodging'), days: get('days'), nights: get('nights'), food: get('food'), visa: get('visa'), insurance: get('insurance'), other: get('other'), fxPct: get('fxPct'), fxOn, pointsOff: usePoints ? P.cashOff : null };
  const T = tpCost(lx), source = get('source'), level = tpLevel(T, source);

  const m = api.mine(), p = api.store.doc.profile || {}, now = new Date();
  const born = p.birthYear != null ? now.getFullYear() - p.birthYear : null, age = born ?? m.tripAge ?? null;
  const cost = T.ready ? T.total : m.tripCost ?? null; // the lines when any is tapped, else the one number
  const inv = onFile(api.store.doc, 'invested').invested ?? null, pay = onFile(api.store.doc, 'income', { ref: api.ref }).takeHome ?? null, spend = onFile(api.store.doc, 'spending').gut ?? null;
  const monthly = pay != null && spend != null ? pay - spend : null;
  const of = (c = cost) => tripCostOf({ cost: c, age, invested: inv, monthly, spending: spend, ref: api.ref });
  const answerCard = (now = cost) => { // `now`: the number as it stands while it is being typed
    if (!usd) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'What it would have become'), h('p.st-soft', { style: { marginBottom: 0 } }, `Your plan is in US dollars and this trip is in ${TP_CURRENCIES.find(c => c[0] === cur)[1]}. No exchange rate is guessed, so this part and the journey wait for a trip in US dollars.`));
    const R = of(now);
    if (!R.ready) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your answer shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, age == null ? 'The price and your age, and it appears.' : 'The price above and it appears.'));
    const pct = v => `${+(v * 100).toFixed(1)}%`;
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Your answer'),
      h('div.st-soft', {}, R.years > 0 ? `Left invested until ${R.toAge}, that money would be` : 'At your age the price is close to the whole cost'), h('div.st-big', {}, money(Math.round(R.grown))),
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
  // while typing only the answer card moves; the full page redraws when the box is left
  const setCost = (v, typing) => { api.remember({ tripCost: v }); if (!typing) return api.render(); api.save(); const fresh = answerCard(v); card.replaceWith(fresh); card = fresh;
    inputs.querySelector('.st-box .in')?.classList.toggle('st-pulse', v == null); $('ages')?.classList.toggle('st-pulse', v != null && age == null); };
  const lineFold = fold('tp-lines', T.ready ? `Line by line: ${big(T.total)}${T.open.length ? ', so far' : ''}` : 'Add it up line by line',
    h('div.st-row', { style: { justifyContent: 'space-between' } }, h('span.st-small.st-soft', {}, 'Each line is for the whole trip, unless it says a night or a day.'), tag(level)),
    picks('cur', 'The trip\'s currency, one for everyone', TP_CURRENCIES.map(c => c[0]), c => TP_CURRENCIES.find(x => x[0] === c)[2]),
    amountBox('flights', 'Flights', TP_OPTS.flights, 'Every ticket, there and back.'),
    picks('days', 'Days away', TP_OPTS.days, v => `${v} days`, T.days != null && get('nights') == null ? `${T.nights} ${T.nights === 1 ? 'night' : 'nights'} of lodging: the days less one.` : null),
    amountBox('lodging', 'Lodging, a night', TP_OPTS.lodging),
    amountBox('food', 'Food, a day', TP_OPTS.food),
    picks('fxPct', 'Your card\'s fee on other currencies', TP_OPTS.fxPct, v => `${v}%`, 'Your card\'s terms show it as a foreign transaction fee.'),
    h('div.st-field', {}, h('div.st-flabel', {}, 'Paid in another currency'), h('div.st-chips', { role: 'group', 'aria-label': 'Paid in another currency' }, TP_FX_CAN.map(id => chip(TP_LINES.find(l => l.id === id).name, fxOn.includes(id), () => set('fxOn', fxOn.includes(id) ? fxOn.filter(x => x !== id) : [...fxOn, id]))))),
    amountBox('visa', 'Visa fees', TP_OPTS.visa, 'The country\'s own site shows the fee.'),
    amountBox('insurance', 'Travel insurance', TP_OPTS.insurance, 'The policy\'s quote shows it.'),
    amountBox('other', 'Everything else', TP_OPTS.other, 'Getting around, tickets, gifts.'),
    picks('source', 'Where are these numbers from?', TP_SOURCES.map(s => s[0]), id => TP_SOURCES.find(s => s[0] === id)[1]),
    h('p.st-small.st-soft', {}, TP_TAPS_NOTE),
    T.ready ? h('p', { style: { fontWeight: 700 } }, tpCostWords(T, cur)) : null, math('tp-m-lines', tpCostMath(T, lx, cur)));
  const inputs = h('div.st-card', { id: 'tp-cost', ...redrawOnLeave }, h('h2', { style: { marginTop: 0 } }, 'What the trip costs'),
    T.ready ? h('p', {}, h('b', {}, big(T.total)), ' from the lines below.') : numBox('What the trip costs, all in', m.tripCost ?? null, TRIP_COSTS, setCost, { id: 'cost', help: 'Ticket, travel, the room, food. A rough number is enough.' }),
    lineFold,
    born != null ? h('p.st-small.st-soft', { style: { marginBottom: 0 } }, `Your age, ${born}, is from your plan.`)
      : h('div.st-field', {}, h('div.st-flabel', {}, 'Your age, about'), h('div.st-chips', { id: 'ages' }, TRIP_AGE_PICKS.map(a => chip(String(a), age === a, () => { api.store.setDoc('profile', { birthYear: now.getFullYear() - a }); pick({ tripAge: a }); })))));

  // ---------- points: cash or redeem ----------
  const px = { cash: get('pCash'), points: get('pPoints'), fees: get('pFees'), cpp: get('pCpp') };
  const pointsCard = h('div.st-card', { id: 'tp-points', ...redrawOnLeave }, h('h2', { style: { marginTop: 0 } }, 'Points: pay cash or redeem?'),
    h('p.st-soft', {}, 'What a redemption gets for each point, next to what a point is worth to you.'),
    amountBox('pCash', 'The cash price', TP_OPTS.cash),
    picks('pPoints', 'The points it asks for', TP_OPTS.points, v => v.toLocaleString('en-US')),
    picks('pFees', 'Fees still due in cash', TP_OPTS.fees, v => (v ? M(v) : 'None')),
    picks('pCpp', 'What a point is worth to you, in cents', TP_OPTS.cpp, v => `${v} ${v === 1 ? 'cent' : 'cents'}`, 'Yours to set: what you usually get for one.'),
    P.needs?.length ? null : h('p', { style: { fontWeight: 700 } }, tpPointsWords(P, cur)),
    P.needs?.length || !T.ready ? null : h('div.st-row', {}, chip(usePoints ? 'Paying with points' : 'Pay with points', usePoints, () => set('usePoints', !usePoints)), h('span.st-small.st-soft', {}, usePoints ? `${big(T.pointsOff)} off the trip above.` : 'Takes what the points cover off the trip above.')),
    math('tp-m-points', tpPointsMath(P, px, cur)));

  // ---------- a group trip, split ----------
  const people = get('people') ?? [], how = get('how') ?? 'share', among = get('among') ?? {};
  const items = T.lines.filter(l => l.amount != null && l.amount > 0).map(l => ({ id: l.id, name: l.name, amount: l.amount, among: among[l.id] ?? null }));
  const S = tpSplit({ people, how, items, total: T.ready ? T.total : cost });
  const setPeople = list => set('people', list);
  const nextId = () => `p${people.reduce((n, x) => Math.max(n, +String(x.id).slice(1) || 0), 0) + 1}`;
  const groupCard = h('div.st-card', { id: 'tp-group' }, h('h2', { style: { marginTop: 0 } }, 'A group trip, split'),
    h('p.st-soft', {}, `Everyone pays in ${TP_CURRENCIES.find(c => c[0] === cur)[1]}, so nobody is paid back at a rate.`),
    people.map((x, i) => h('div.st-card.inner', { style: { marginTop: '10px' } },
      h('div.st-field', {}, h('div.st-flabel', {}, 'Name'), h('div.st-box', {}, h('div.in', {}, h('input', { type: 'text', value: x.name ?? '', 'aria-label': `Name of person ${i + 1}`, autocomplete: 'off', onChange: e => setPeople(people.map((y, j) => (j === i ? { ...y, name: e.target.value || `Person ${i + 1}` } : y))) })))),
      how === 'share' ? h('div.st-field', {}, h('div.st-flabel', {}, 'Shares'), h('div.st-chips', { role: 'group', 'aria-label': `Shares of ${x.name}` }, TP_OPTS.shares.map(n => chip(String(n), (x.shares ?? 1) === n, () => setPeople(people.map((y, j) => (j === i ? { ...y, shares: n } : y)))))), h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'A couple sharing a room can be 2.')) : null,
      h('div.st-row', {}, btn('Remove', () => setPeople(people.filter((_, j) => j !== i)), 'slim')))),
    h('div.st-row', { style: { marginTop: '10px' } }, btn('Add a person', () => setPeople([...people, { id: nextId(), name: people.length ? `Person ${people.length + 1}` : 'Me', shares: 1 }]), people.length >= 2 ? 'slim' : 'primary')),
    people.length >= 2 ? h('div.st-field', {}, h('div.st-flabel', {}, 'Split it'), h('div.st-chips', { role: 'group', 'aria-label': 'Split it' }, chip('By share', how === 'share', () => set('how', 'share')), chip('By item', how === 'item', () => set('how', 'item')))) : null,
    people.length >= 2 && how === 'item' ? (items.length ? items.map(it => h('div.st-field', {}, h('div.st-flabel', {}, `${it.name}, ${M(it.amount)}: who is in on it`), h('div.st-chips', { role: 'group', 'aria-label': `Who is in on ${it.name}` },
      people.map(x => { const list = among[it.id] ?? people.map(y => y.id), on = list.includes(x.id); return chip(x.name, on, () => { const next = on ? list.filter(id => id !== x.id) : [...list, x.id]; set('among', { ...among, [it.id]: next.length && next.length < people.length ? next : null }); }); })))) : h('p.st-small.st-soft', {}, 'Tap the lines of the trip above, and each one shows here to tick who is in on it.')) : null,
    S.needs?.length ? (people.length >= 2 ? h('p.st-small.st-soft', {}, how === 'item' ? 'Tap the trip\'s lines above.' : 'Tap what the trip costs above.') : null)
      : h('div', {}, rows(S.parts.map(x => [x.name, how === 'share' ? `${x.shares} ${x.shares === 1 ? 'share' : 'shares'}` : null, M(x.amount)])), h('p', { style: { fontWeight: 700 } }, tpSplitWords(S, cur)), math('tp-m-split', tpSplitMath(S, cur))));

  // ---------- the FIRE journey map ----------
  const card0 = onFile(api.store.doc, 'card'), debtKnown = Object.values(card0).some(v => v != null);
  const J = tpJourney(usd ? journeyInputs(api.store.doc, api.ref, { now, debtKnown, trip: cost }) : {});
  const cash0 = onFile(api.store.doc, 'cash');
  const pctTxt = v => `${Math.round(v * 100)}%`;
  const bar = (v, label) => h('div.st-pv', {}, h('div.st-pbar', { role: 'progressbar', 'aria-label': label, 'aria-valuenow': String(Math.round((v ?? 0) * 100)), 'aria-valuemin': '0', 'aria-valuemax': '100' }, h('i', { style: { width: `${Math.round((v ?? 0) * 100)}%` } })));
  const stageRow = (s, i) => {
    const here = i === J.here, a = s.after;
    const when = s.done ? 'Reached' : s.done == null ? 'Tap yours' : here ? 'You are here' : s.months != null ? `About ${span(s.months)}` : 'Ahead';
    const small = s.done == null ? s.what : s.done ? (a?.back ? `${s.what}. The trip takes you back under it for about ${span(Math.max(1, Math.ceil(a.months)))}.` : s.what)
      : `${s.what}. ${s.measure === 'debt' ? `${big(s.have)} to go` : `${big(s.have)} of ${big(s.target)}`}${here && s.months != null ? `, about ${span(s.months)}` : ''}${a && a.months != null && s.months != null && a.months > s.months ? `; with the trip, about ${span(Math.ceil(a.months))}` : ''}.`;
    return h(`li${s.done ? '.done' : here ? '.here' : ''}`, {}, h('span.dot', {}, s.done ? '' : String(i + 1)), h('span', {}, s.name, h('small', {}, small), here && s.pct != null ? bar(s.pct, `${s.name}: ${pctTxt(s.pct)}`) : null,
      here && a && a.pct != null && a.pct < s.pct ? h('small', {}, `After the trip: ${pctTxt(a.pct)}`) : null), h('span.when', {}, when));
  };
  // A FIRE status on the way (Nov 27 2026): a marker between the stages, not a stage. Coast and FI are stages already.
  const statusRow = k => h(`li.tp-status${k.reached ? '.done' : ''}`, { 'data-status': k.key }, h('span.dot', {}, '◆'), h('span', {}, `${k.full} status`, h('small', {}, `A marker on the way, not a step: ${big(k.value)} invested. Reaching it opens options; your next step stays the same.`)), h('span.when', {}, k.reached ? 'Reached' : k.when));
  const journey = h('div.st-card', { id: 'tp-journey' }, h('h2', { style: { marginTop: 0 } }, 'Your FIRE journey'),
    h('p.st-soft', {}, 'The usual stages, where you are on them, the FIRE statuses on the way, and how this trip moves you.'),
    J.here != null || J.unknown.length < J.stages.length ? h('ul.st-list', {}, (usd ? journeyStatusRows(J, api.store.doc, api.ref, { now }) : J.stages.map(step => ({ step }))).map(r => (r.status ? statusRow(r.status) : stageRow(r.step, J.stages.indexOf(r.step))))) : null,
    h('p', { style: { fontWeight: 700 } }, tpJourneyWords(J, cur) || 'Tap your numbers below to see where you are.'),
    J.fiDays != null ? rows([['The day work becomes optional', 'your plan, run again with the trip in', tpDayWords(J.fiDays)]]) : null,
    math('tp-m-journey', tpJourneyMath(J, cur)), wealthFold(fwWealthStage({ worth: J.worth, monthly: J.monthly })));
  const basics = h('div.st-card', { id: 'tp-plan', ...redrawOnLeave }, h('h2', { style: { marginTop: 0 } }, 'Your numbers, for the journey'),
    h('p.st-small.st-soft', {}, 'Five numbers place you on the journey. The day work becomes optional runs from the first three.'),
    Object.keys(BOX).map(key => numBox(BOX[key][0], onFile(api.store.doc, PLAN[key][0], { ref: api.ref })[PLAN[key][1]] ?? null, BOX[key][1], (v, typing) => { answer(api.store, PLAN[key][0], { [PLAN[key][1]]: v }); if (!typing) return api.render(); api.save(); }, { id: `f_${key}`, help: BOX[key][2] })),
    numBox('In checking and savings', cash0.checking == null && cash0.savings == null ? null : (cash0.checking ?? 0) + (cash0.savings ?? 0), [0, 500, 1000, 5000, 15000], (v, typing) => { const sv = cash0.savings ?? 0; answer(api.store, 'cash', v == null ? {} : sv <= v ? { checking: v - sv, savings: sv } : { checking: v, savings: 0 }); if (!typing) return api.render(); api.save(); }, { id: 'f_cash', help: 'What you could get to this week.' }),
    numBox('On credit cards', card0['Credit card'], [0, 1000, 5000, 15000], (v, typing) => { answer(api.store, 'card', { ...card0, 'Credit card': v }); if (!typing) return api.render(); api.save(); }, { id: 'f_card', help: 'What you owe today. $0 if none.' }));

  const carry = h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Take it with you'), h('p.st-small', {}, 'Your link keeps these answers. The other steps open with them already in.'),
    h('div.st-row', {}, copyLink(api), btn('All the steps', async () => { location.href = `one.html#/d/${await pack(api.store.doc)}`; }, 'slim')));
  $('main').replaceChildren(...[
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, 'What does this trip really cost?'), h('p', { style: { marginBottom: 0 } }, 'A retreat, a conference, a week away. The price is what you pay today. The cost is what that money would have become.')),
    inputs, card, pointsCard, groupCard, journey, basics, carry].filter(Boolean));
  if (!T.ready && cost == null) inputs.querySelector('.st-box .in')?.classList.add('st-pulse'); else if (age == null) $('ages')?.classList.add('st-pulse');
}
// The wealth stages of Set for Life on the journey's own net worth: the stage, the line ahead, the three moves of
// each stage. One list of lines: the $100k line is the journey's own (TP_RULES.k100).
function wealthFold(W) {
  if (!W.ready) return null;
  return fold('tp-wealth', `Wealth stages: ${W.stage.name}`, h('p.st-small', {}, W.to == null ? 'You are past $100,000. The moves that matter most now:' : `${money(Math.round(W.left))} to ${money(W.to)}${W.months != null ? `, about ${W.months} ${W.months === 1 ? 'month' : 'months'} at what you save, before growth` : ''}. The moves that matter most at this stage:`),
    h('ul.st-list', {}, W.stage.moves.map(m => h('li', {}, h('span.dot', {}, ''), h('span', {}, m)))),
    h('p.st-small.st-soft', {}, `The three stages: ${FW_WEALTH.map(s => s.name).join(', ')}. From ${FW_K25_SOURCE}, in SLAM's words.`));
}
boot('trip', draw);
