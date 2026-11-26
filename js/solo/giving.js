// SPDX-License-Identifier: AGPL-3.0-only
// giving.html "Giving: what it costs and how to plan it" (run Finish everything partly built, Part 16): the giving rate
// on the base you pick, the target a share of it comes to (maaser is commonly 10%: the share and the base are your own
// taps), one gift in hours of work, days on the FI date and what it would have grown to (the charity calc), bunching two
// or three years of giving into one year on the 2026 federal rules, envelopes inside one account (maaser, fun money,
// your own) that fill and then empty, and the maaser credit for giving ahead. Formatting only: js/math/giving.js works
// every number out, and the game's sheet Giving calls the same functions (game/core/giving.js is its copy). The FI date
// is the plan's own (M53, js/math/fi.js fiMoveOf); the hourly wage is the plan's (M58, hourlyRate). The answers are kept
// with the page's other answers (settings.start).
import { boot, h, btn, chip, money, numBox, copyLink, foot } from './shell.js';
import { metrics } from '../math/metrics.js';
import { fiMoveOf } from '../math/fi.js';
import { hourlyRate } from '../math/time.js';
import { answer, onFile } from '../journey.js';
import { crDayWords } from '../math/career.js';
import { pack } from '../start/link.js';
import { GV_RULES, GV_BASES, gvIsGiving, gvRate, gvTarget, gvGift, gvBunch, gvEnvelopes, gvCredit } from '../math/giving.js';

const $ = id => document.getElementById(id);
const k = key => `gv_${key}`;
const LEVEL_TIP = { Guess: 'Some answers are a tap or a best guess. It will move as they firm up.', Close: 'From the numbers in your plan.' };
const tag = level => (level ? h(`span.st-tag${level === 'Guess' ? '' : '.yours'}`, { title: LEVEL_TIP[level] }, level) : null);
const open = new Set(); // which folds are open, kept while the page is redrawn
const fold = (id, summary, ...body) => h('details.st-fold', { open: open.has(id), onToggle: e => { if (e.target.open) open.add(id); else open.delete(id); } }, h('summary', {}, summary), ...body);
const math = (id, lines) => (lines.filter(Boolean).length ? fold(id, 'Show the math', lines.filter(Boolean).map(t => h('p.st-small', {}, t))) : null);
const pct = v => `${Math.round(v * 1000) / 10}%`;
const round = v => money(Math.round(v));
const one = v => String(Math.round(v * 10) / 10);
const head = (title, level) => h('div.st-row', { style: { justifyContent: 'space-between', marginBottom: '8px' } }, h('h2', { style: { margin: 0 } }, title), tag(level));
const tiles = list => h('div.st-tiles', {}, list.map(([l, v, s]) => h('div.st-tile', {}, h('div.st-small.st-soft', {}, l), h('div.v', {}, v), s ? h('div.st-small.st-soft', {}, s) : null)));
const bar = (v, label) => h('div.st-pv', {}, h('div.st-pbar', { role: 'progressbar', 'aria-label': label, 'aria-valuenow': String(Math.round((v ?? 0) * 100)), 'aria-valuemin': '0', 'aria-valuemax': '100' }, h('i', { style: { width: `${Math.round((v ?? 0) * 100)}%` } })));
const FILING = [['single', 'Single'], ['joint', 'Married, one return'], ['head', 'Head of household']];
const filingOf = s => (/^Married/.test(s ?? '') ? 'joint' : s === 'Head of household' ? 'head' : 'single');
const ymOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const PLAN = { takeHome: ['income', 'takeHome'], spending: ['spending', 'gut'], invested: ['invested', 'invested'] };
const BOX = { takeHome: ['What lands in your account in a month', [3000, 4000, 5000, 6500, 8000], 'After taxes. A rough number is enough.'], spending: ['What you spend in a month, all in', [2000, 3000, 4000, 5000, 6500], 'Everything, debt payments included.'],
  invested: ['What you have invested', [0, 10000, 50000, 150000, 400000], 'Retirement accounts and brokerage, added up.'] };
const monthName = ym => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

function page(api) {
  const get = key => api.mine()[k(key)] ?? null;
  const set = (key, v) => { api.remember({ [k(key)]: v }); api.render(); };
  const keep = (key, v) => { api.remember({ [k(key)]: v }); api.save(); };
  const toggle = (key, v) => set(key, get(key) === v ? null : v);
  const box = (key, label, picks, help, id = `gv_${key}`) => numBox(label, get(key), picks, (v, t) => (t ? keep(key, v) : set(key, v)), { id, help });
  const picks = (key, label, list, cur, note) => h('div.st-field', {}, h('div.st-flabel', {}, label),
    h('div.st-chips', { role: 'group', 'aria-label': label }, list.map(([v, l]) => chip(l, cur === v, () => toggle(key, v)))), note ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, note) : null);
  const doc = api.store.doc, now = new Date();
  let M = null;
  try { M = metrics(doc, api.ref, { now }); } catch { M = null; }
  const x = M?.inputs ?? {};
  const T = { std: api.ref.tax.standardDeduction, brackets: api.ref.tax.brackets, charity: api.ref.tax.charity };

  // ---------- what comes in, and what is given ----------
  const planTake = x.takeHome ?? null, planGross = x.grossAnnual != null ? x.grossAnnual / 12 : null, planCosts = x.hours?.workCosts ?? null;
  const takeHome = planTake ?? get('takeHome'), gross = planGross ?? get('gross'), costs = planCosts ?? get('costs');
  const lines = (x.lines ?? []).filter(l => gvIsGiving(`${l.name} ${l.category ?? ''}`) && l.amount != null);
  const fromLines = lines.length ? lines.reduce((s, l) => s + l.amount, 0) : null;
  const given = fromLines ?? get('given');
  const mz = doc.session?.community ? doc.session?.maaser ?? {} : {};
  const base = get('base') ?? (mz.basis === 'Gross' ? 'gross' : mz.basis === 'Take-home' ? 'net' : 'net');
  const share = get('pct') ?? mz.pct ?? null;
  const B = { base, gross, takeHome, costs };
  const R = gvRate({ given, ...B }), Tg = gvTarget({ pct: share, given, ...B });
  const level = fromLines != null && (base === 'gross' ? planGross != null : planTake != null) ? 'Close' : 'Guess';

  const rateCard = h('div.st-card', { id: 'answer' }, head('Your giving rate', R.ready ? level : null),
    picks('base', 'A share of', GV_BASES, base, 'Your own pick. Some take maaser from gross pay, some from take-home, some after the costs of earning it.'),
    planTake == null && base !== 'gross' ? box('takeHome', 'What lands in your account in a month', [3000, 4000, 5000, 6500, 8000], 'After taxes. A rough number is enough.') : null,
    planGross == null && base === 'gross' ? box('gross', 'Your pay before taxes, a month', [4000, 5500, 7000, 9000, 12000], 'The top line of the pay stub.') : null,
    base === 'after' && planCosts == null ? box('costs', 'What earning it costs you, a month', [0, 100, 250, 500, 1000], 'The commute, tools, the costs of the job. Your own call.') : null,
    fromLines != null ? h('p.st-small', {}, `From your Budget's giving lines: ${round(fromLines)} a month (${lines.map(l => l.name).join(', ')}).`)
      : box('given', 'What you give a month', [0, 50, 100, 250, 500, 1000], 'Charity, tzedakah, maaser, a cause, supporting someone.'),
    picks('pct', 'The share you aim for', GV_RULES.shares.map(v => [v, pct(v)]), share, 'Maaser is commonly 10%. Tap your own share; how and what to count is yours and your community\'s.'),
    R.ready ? tiles([['You give', R.rate == null ? 'No base yet' : pct(R.rate), `${round(R.given)} a month`], ['Your share comes to', Tg.ready ? round(Tg.value) : 'Tap yours', `${pct(Tg.share)} of ${round(Tg.of ?? 0)}`],
      ['To reach it', Tg.ready && Tg.gap != null ? (Tg.gap > 0 ? `${round(Tg.gap)} more` : 'Reached') : 'Tap yours', 'a month']])
      : h('p.st-soft', {}, `Tap ${R.needs.join(' and ')} above and it shows here.`),
    R.ready ? math('gv-m-rate', [`Your giving rate: ${round(R.given)} a month ÷ ${round(R.of)} (${GV_BASES.find(b => b[0] === base)[1].toLowerCase()}) = ${R.rate == null ? 'no rate' : pct(R.rate)}.`,
      Tg.ready ? `Your share: ${round(Tg.of)} × ${pct(Tg.share)}${Tg.own ? '' : ' (10%, until you tap your own)'} = ${round(Tg.value)} a month.` : null,
      base === 'after' && costs != null ? `After work costs: ${round(takeHome ?? 0)} take-home less ${round(costs)} = ${round(Tg.of ?? 0)}.` : null]) : null);

  // ---------- one gift: the charity calc ----------
  const gift = get('gift'), monthly = get('every') === 'month';
  const W = M?.hourly?.value != null ? M.hourly : takeHome != null ? hourlyRate({ takeHome, ...(x.hours ?? {}) }, api.ref) : null; // the plan's (M58), or this page's take-home on the same rule
  const wage = W?.value ?? null, wageGuess = !!W?.guess;
  const fiMonths = M?.monthsToFi?.value ?? null, wr = x.withdrawalRate ?? null;
  const move = gift == null ? null : monthly ? { changes: [{ at: 0, monthly: -gift }], fi: wr ? (gift * 12) / wr : 0 } : { once: gift };
  let mv = null;
  try { mv = move ? fiMoveOf(M, move, { from: now }) : null; } catch { mv = null; }
  const G = gvGift({ amount: gift, monthly, wage, days: mv?.days ?? null, realReturn: x.realReturn ?? null, years: fiMonths == null ? null : fiMonths / 12 });
  const giftCard = h('div.st-card', { id: 'gv-gift' }, head('One gift, in time', G.ready ? (wageGuess || fiMonths == null ? 'Guess' : 'Close') : null),
    h('p.st-soft', {}, 'What a gift costs you in hours of work and in days on the day work becomes optional. The price of a gift you choose, in your own time.'),
    box('gift', 'The gift', [18, 36, 100, 180, 500, 1000, 5000], null),
    h('div.st-field', {}, h('div.st-flabel', {}, 'How often'), h('div.st-chips', { role: 'group', 'aria-label': 'How often' }, [['once', 'Once'], ['month', 'Every month']].map(([v, l]) => chip(l, (get('every') ?? 'once') === v, () => set('every', v))))),
    G.ready ? tiles([['Hours of work', G.hours == null ? 'Needs your pay' : `${one(G.hours)} h`, monthly ? 'a month' : wageGuess ? 'at a 40-hour week' : 'at your real hourly wage'],
      ['On your FI date', mv ? crDayWords(G.days) : 'No FI date yet', monthly ? 'for giving it every month' : 'for giving it once'],
      ['It could have grown to', G.grown == null ? 'No FI date yet' : round(G.grown), fiMonths == null ? '' : `by then, after inflation`]]) : null,
    fiMonths == null ? fold('gv-plan', 'Your plan, for the FI date', h('p.st-small.st-soft', {}, 'Three numbers. The day work becomes optional runs from them, with the gift and without it.'),
      Object.keys(BOX).map(key => numBox(BOX[key][0], onFile(doc, PLAN[key][0], { ref: api.ref })[PLAN[key][1]] ?? null, BOX[key][1], (v, typing) => { answer(api.store, PLAN[key][0], { [PLAN[key][1]]: v }); if (!typing) return api.render(); api.save(); }, { id: `gv_f_${key}`, help: BOX[key][2] }))) : null,
    G.ready ? math('gv-m-gift', [G.hours == null ? 'Hours of work need your take-home pay (and your hours, for the real hourly wage).' : `Hours: ${round(G.amount)} ÷ ${money(wage)} an hour${wageGuess ? ' (take-home over 40 hours a week until your hours are in)' : ', your real hourly wage'} = ${one(G.hours)} hours${monthly ? ` a month, ${one(G.hoursYear)} a year` : ''}.`,
      mv ? `Days: your plan's FI date runs twice, as it is and with the gift ${monthly ? `taken from what you invest each month, and a freedom number ${round(move.fi)} larger so it can go on after work` : 'paid now from what you have invested'}.` : 'Days need your plan\'s FI date: what comes in, what goes out and what you have invested.',
      G.grown != null ? `Grown: ${monthly ? `${round(G.amount)} a month` : round(G.amount)} at ${pct(x.realReturn)} a year after inflation for ${one(G.years)} years = ${round(G.grown)}.` : null]) : null);

  // ---------- bunching ----------
  const filing = get('filing') ?? filingOf(x.filingStatus), agi = get('agi') ?? x.grossAnnual ?? null, yearGive = get('yearGive') ?? (given != null ? Math.round(given * 12) : null);
  const years = get('years') ?? 2, cash = get('daf') !== true;
  const K = gvBunch({ give: yearGive, agi, other: get('other'), filing, years, cash }, T);
  const wayWord = w => (w === 'itemize' ? 'Itemize' : 'Standard');
  const bunchCard = h('div.st-card', { id: 'gv-bunch' }, head('Bunching', K.ready ? 'Guess' : null),
    h('p.st-soft', {}, 'Give two or three years\' worth in one year and itemize that year, then take the standard deduction in between. On the 2026 federal rules, federal tax only.'),
    get('yearGive') == null && yearGive != null ? h('p.st-small', {}, `A year of giving from above: ${round(yearGive)}. Tap to change it.`) : null,
    box('yearGive', 'A year of giving', [1200, 3000, 6000, 10000, 20000], null),
    box('agi', 'Income a year, before taxes', [50000, 80000, 120000, 200000, 350000], x.grossAnnual != null && get('agi') == null ? 'From your plan. Your return\'s adjusted gross income is closer.' : 'Your return\'s adjusted gross income, about.'),
    box('other', 'Your other deductions a year', [0, 5000, 10000, 20000, 40000], 'Mortgage interest, state and local tax and the rest, if you itemized. $0 is an answer.'),
    picks('filing', 'How you file', FILING, filing),
    picks('years', 'Bunch', GV_RULES.bunchYears.map(n => [n, `${n} years in one`]), years),
    h('div.st-field', {}, h('div.st-flabel', {}, 'Where the gifts go'), h('div.st-chips', { role: 'group', 'aria-label': 'Where the gifts go' }, chip('Straight to charities, in cash', cash, () => set('daf', null)), chip('Through a donor-advised fund', !cash, () => set('daf', true)))),
    K.ready ? h('div', {}, tiles([['Every year', round(K.taxEvery), `federal tax over ${K.years} years`], [`${K.years} years in one`, round(K.taxBunched), `federal tax over ${K.years} years`],
      ['Bunching keeps', K.saved > 0.5 ? round(K.saved) : 'Nothing more', K.saved > 0.5 ? `over ${K.years} years` : 'giving every year does as well']]),
    h('ul.st-list', {}, [...K.every.map(r => ['Every year', `Year ${r.year}: give ${round(r.give)}`, `${wayWord(r.way)}: ${round(r.deduction)}`]), ...K.bunched.map(r => [`${K.years} years in one`, `Year ${r.year}: give ${round(r.give)}`, `${wayWord(r.way)}: ${round(r.deduction)}`])]
      .map(([a, b, c]) => h('li', {}, h('span.dot', {}, ''), h('span', {}, b, h('small', {}, a)), h('span.when', {}, c)))),
    math('gv-m-bunch', [`Each year takes the larger of two: the standard deduction (${round(T.std[filing])})${cash ? ` plus up to ${round(K.cap)} of cash gifts, the 2026 deduction for people who do not itemize` : ''}, or itemizing: your other deductions plus the gifts above ${pct(T.charity.floor)} of income (${round(K.floor)}).`,
      `Federal tax: income less that deduction, through the ${filing === 'joint' ? 'joint' : filing === 'head' ? 'head of household' : 'single'} brackets of 2026.`,
      `Every year: ${K.years} × ${round(K.taxEvery / K.years)}. Bunched: ${round(K.bunched[0].tax)} in the giving year, then ${round(K.bunched[1].tax)} in each other year.`,
      K.topRate >= 0.37 ? 'In the 37% bracket, from 2026 the tax saved by itemized deductions is held to 35%. This page does not take that off yet, so the saving here reads a little high.' : null,
      'State tax is left out. Your tax preparer has the last word.']),
    fold('gv-src', 'Where the rules come from', h('p.st-small', { style: { overflowWrap: 'anywhere' } }, 'The deduction for people who do not itemize (cash gifts, not to a donor-advised fund, $1,000 or $2,000 on a joint return): IRS IR-2026-135 (Nov 10 2026) and IRS Publication 6196. The 0.5% floor when itemizing: P.L. 119-21 sec. 70425, IRS Publication 6079. The standard deduction and brackets: IRS Rev. Proc. 2025-32. Read Nov 26 2026.')))
      : h('p.st-soft', {}, `Tap ${K.needs.join(' and ')} above and it shows here.`));

  // ---------- envelopes inside one account ----------
  const list = Array.isArray(get('env')) ? get('env') : [{ id: 'maaser', name: 'Maaser', put: null, used: null }, { id: 'fun', name: 'Fun money', put: null, used: null }];
  const setEnv = (next, render = true) => { api.remember({ [k('env')]: next }); render ? api.render() : api.save(); };
  const patch = (id, p, render) => setEnv(list.map(e => (e.id === id ? { ...e, ...p } : e)), render);
  const E = gvEnvelopes({ balance: get('balance'), list });
  const envRow = r => h('div.st-tile', { id: `gv-env-${r.id}`, style: { marginBottom: '10px' } },
    h('div.st-row', { style: { justifyContent: 'space-between' } }, h('b', {}, r.name), btn('Remove', () => setEnv(list.filter(e => e.id !== r.id)), 'slim')),
    r.open ? null : h('div', { style: { margin: '6px 0' } }, bar(r.full, r.name), h('div.st-small', {}, r.empty ? (r.past > 0 ? `Empty, ${round(r.past)} past what was put in` : 'Empty: time to fill it again') : `${round(r.left)} of ${round(r.put)} left`)),
    numBox('Put in so far', r.put, [50, 100, 250, 500], (v, t) => patch(r.id, { put: v }, !t), { id: `gv-put-${r.id}` }),
    numBox('Used so far', r.used ?? null, [0, 25, 50, 100], (v, t) => patch(r.id, { used: v }, !t), { id: `gv-used-${r.id}`, help: 'Given or spent from it.' }));
  const nameIn = h('input', { type: 'text', id: 'gv-envname', maxlength: '30', placeholder: 'A name', 'aria-label': 'A new envelope', style: { minHeight: '44px', flex: '1', minWidth: '0' } });
  const addEnv = name => { const n = String(name ?? '').trim().slice(0, 30); if (n) setEnv([...list, { id: `e${Date.now().toString(36)}`, name: n, put: null, used: null }]); };
  const envCard = h('div.st-card', { id: 'gv-env' }, head('Envelopes inside one account', null),
    h('p.st-soft', {}, 'Labels on money in an account you already have. No new bank account: each envelope fills when you set money aside and empties as you use it.'),
    box('balance', 'What the account holds now', [500, 1000, 2500, 5000, 10000], 'The one account the envelopes live in.'),
    E.balance != null && E.ready ? h('p.st-small', {}, E.more > 0 ? `The envelopes hold ${round(E.more)} more than the account. Recalculating: lower an envelope, or the balance is out of date.` : `Labeled: ${round(E.held)}. Not in an envelope yet: ${round(E.free)}.`) : null,
    E.rows.map(envRow),
    h('div.st-field', {}, h('div.st-flabel', {}, 'Add an envelope'), h('div.st-chips', {}, ['Maaser', 'Fun money', 'Gifts', 'Holidays', 'Tzedakah box'].filter(n => !list.some(e => e.name === n)).map(n => chip(n, false, () => addEnv(n)))),
      h('div.st-row', { style: { marginTop: '8px', flexWrap: 'nowrap' } }, nameIn, btn('Add', () => addEnv(nameIn.value), 'slim'))));

  // ---------- maaser credit ----------
  const ahead = get('ahead') !== false, log = get('log') ?? {};
  const months = Array.from({ length: 6 }, (_, i) => ymOf(new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)));
  const owed = Tg.ready ? Math.round(Tg.value) : null;
  const first = months.findIndex(m => log[m] != null); // the count starts at the first month you log
  const C = gvCredit({ months: months.map((m, i) => ({ m, owed: first < 0 || i < first ? null : owed, given: log[m] ?? null })), ahead });
  const rowOf = m => C.rows.find(r => r.m === m) ?? null;
  const setLog = (m, v, t) => { api.remember({ [k('log')]: { ...log, [m]: v } }); t ? api.save() : api.render(); };
  const creditCard = h('div.st-card', { id: 'gv-credit' }, head('Maaser credit', C.ready ? (Tg.own ? 'Close' : 'Guess') : null),
    h('p.st-soft', {}, 'A running balance: what your share comes to each month next to what you gave. Giving ahead can count toward later months, by your own rule.'),
    h('div.st-field', {}, h('div.st-flabel', {}, 'Giving ahead counts toward later months'), h('div.st-chips', { role: 'group', 'aria-label': 'Giving ahead counts toward later months' }, chip('Yes', ahead, () => set('ahead', null)), chip('No', !ahead, () => set('ahead', false))), h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'Many keep a running count like this. How you count it is your own rule.')),
    owed == null ? h('p.st-soft', {}, 'Set your share above and each month shows here.') : h('div', {},
      tiles([[!C.ready ? 'Your count' : C.credit > 0 ? 'Given ahead' : 'Still to give', !C.ready ? 'Log a month' : round(C.credit > 0 ? C.credit : C.toGive), !C.ready ? 'it starts there' : C.credit > 0 ? 'counts toward next month' : `since ${monthName(C.rows[0].m)}`], ['Each month', round(owed), `${pct(Tg.share)} of ${round(Tg.of)}`]]),
      months.map(m => { const r = rowOf(m); return h('div', { id: `gv-m-${m}`, style: { marginTop: '8px' } }, numBox(`${monthName(m)}: given`, log[m] ?? null, [...new Set([0, owed, owed * 2])], (v, t) => setLog(m, v, t), { id: `gv-log-${m}`, help: r ? `${r.fromCredit > 0 ? `${round(r.fromCredit)} came from credit. ` : ''}After it: ${r.after > 0 ? `${round(r.after)} ahead` : r.after < 0 ? `${round(-r.after)} to give` : 'even'}${r.logged ? '' : ' (nothing logged yet)'}.` : 'Before your count starts.' })); }),
      math('gv-m-credit', [`Each month: the balance before, plus what you gave, less ${round(owed)}.`, ahead ? 'Above zero is credit and carries to the next month.' : 'Giving ahead does not carry: the balance stops at zero.', 'The share is the same each month here; a month with a raise or a bonus is yours to log as more.'])));

  const carry = h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Take it with you'), h('p.st-small', {}, 'Your link keeps these answers.'), h('div.st-row', {}, copyLink(api), btn('All the steps', async () => { location.href = `one.html#/d/${await pack(api.store.doc)}`; }, 'slim')));
  for (const c of [rateCard, giftCard, bunchCard, envCard, creditCard]) c.addEventListener('focusout', e => { const t = e.relatedTarget, main = $('main'); if (!t || t === main || !main.contains(t) || t.tagName !== 'INPUT') setTimeout(() => api.render(), 0); });
  $('main').replaceChildren(h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Giving'), h('h1', {}, 'Giving: what it costs and how to plan it'), h('p', { style: { marginBottom: 0 } }, 'Your giving rate, one gift in hours and days, bunching for taxes, envelopes inside one account, and a running maaser count.')),
    rateCard, giftCard, bunchCard, envCard, creditCard, carry);
}
boot('giving', api => { foot(); const step = $('step'); if (step) step.textContent = 'On its own'; page(api); });
