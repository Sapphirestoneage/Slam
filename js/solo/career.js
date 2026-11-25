// SPDX-License-Identifier: AGPL-3.0-only
// career.html "Does this course or degree pay back?" (run of Nov 25 2026, Part 3): a course or a degree priced (the
// payback years, the lifetime value, the FI date change), two paths side by side, the credential stack with its
// overlaps, the match that stays with the job before it vests, and the launch window (a job hop, Roth or traditional now, a house
// hack), each as days on the FI date. Formatting only: js/math/career.js works every number out, and the game's
// screen "Career and education" calls the same functions (game/core/career.js is its copy). The FI date is the plan's
// own (M53, js/math/fi.js fiMoveOf). The answers are kept with the page's other answers (settings.start).
import { boot, h, btn, chip, money, numBox, copyLink, foot } from './shell.js';
import { answer, onFile } from '../journey.js';
import { metrics } from '../math/metrics.js';
import { fiMoveOf } from '../math/fi.js';
import { pack } from '../start/link.js';
import { CR_PRESETS, CR_SAMPLE, CR_OPTS, CR_SOURCES, CR_VEST, CR_VEST_SOURCE, crRoi, crRoiWords, crRoiMath, crLevel, crCompare, crStack, crStackWords,
  crVestLeft, crVestWords, crVestMath, crVestLevel, crHop, crRothTrad, crHack, crDayWords, crLaunchMath } from '../math/career.js';

const $ = id => document.getElementById(id), big = v => money(Math.round(v));
const k = key => `cr_${key}`;
const LEVEL_TIP = { Guess: 'Some answers are missing, or they are a best guess. It will move as they firm up.', Close: 'From a price list, a job posting or a tapped schedule.', Exact: 'From your own bill, offer letter or statement.' };
const tag = level => (level ? h(`span.st-tag${level === 'Guess' ? '' : '.yours'}`, { title: LEVEL_TIP[level] }, level) : null);
const open = new Set(); // which folds are open, kept while the page is redrawn
const fold = (id, summary, ...body) => h('details.st-fold', { open: open.has(id), onToggle: e => { if (e.target.open) open.add(id); else open.delete(id); } }, h('summary', {}, summary), ...body);
const math = (id, lines) => (lines.length ? fold(id, 'Show the math', lines.map(t => h('p.st-small', {}, t))) : null);
const rows = list => h('ul.st-list', {}, list.filter(Boolean).map(([label, small, value]) => h('li', {}, h('span.dot', {}, ''), h('span', {}, label, small ? h('small', {}, small) : null), h('span.when', {}, value))));
const yrs = v => `${Math.round(v * 10) / 10} ${Math.round(v * 10) === 10 ? 'year' : 'years'}`;
const PLAN = { takeHome: ['income', 'takeHome'], spending: ['spending', 'gut'], invested: ['invested', 'invested'] };
const BOX = { takeHome: ['What lands in your account in a month', [3000, 4000, 5000, 6500, 8000], 'After taxes. A rough number is enough.'], spending: ['What you spend in a month, all in', [2000, 3000, 4000, 5000, 6500], 'Everything, debt payments included.'],
  invested: ['What you have invested', [0, 10000, 50000, 150000, 400000], 'Retirement accounts and brokerage, added up.'] };

function page(api) {
  const get = key => api.mine()[k(key)] ?? null;
  const set = (key, v) => { api.remember({ [k(key)]: v }); api.render(); };
  const keep = (key, v) => { api.remember({ [k(key)]: v }); api.save(); };
  const toggle = (key, v) => set(key, get(key) === v ? null : v);
  const picks = (key, label, list, show, note) => h('div.st-field', {}, h('div.st-flabel', {}, label),
    h('div.st-chips', { role: 'group', 'aria-label': label }, list.map(v => chip(show(v), get(key) === v, () => toggle(key, v)))), note ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, note) : null);
  const pct = v => `${v}%`;
  const preset = CR_PRESETS.find(p => p.id === get('path')) ?? null, pid = preset?.id ?? 'own';
  const pk = key => `${pid}_${key}`; // each path keeps its own answers, so two can be set side by side
  const pathOf = id => { const p = CR_PRESETS.find(q => q.id === id), g = key => api.mine()[k(`${id}_${key}`)] ?? null;
    return { cost: g('cost'), help: g('help'), months: g('months') ?? p?.months ?? null, keepPct: g('keepPct') ?? p?.keepPct ?? null, payBefore: g('payBefore'), payAfter: g('payAfter'), loan: g('loan'), loanRatePct: g('loanRatePct'), loanYears: g('loanYears'),
      taxPct: get('taxPct'), age: get('age'), endAge: get('endAge') }; };
  const X = pathOf(pid), source = get('source');
  const got = key => onFile(api.store.doc, PLAN[key][0], { ref: api.ref })[PLAN[key][1]] ?? null;
  const M = () => { try { return metrics(api.store.doc, api.ref, { now: new Date() }); } catch { return null; } };
  const move = mv => fiMoveOf(M(), mv, { from: new Date() });

  // ---------- the path ----------
  const pathCard = h('div.st-card', { id: 'cr-path' }, h('div.st-eyebrow', {}, 'Career and education'), h('h2', { style: { marginTop: 0 } }, 'What are you weighing?'),
    h('div.st-chips', { role: 'group', 'aria-label': 'What are you weighing?' }, CR_PRESETS.map(p => chip(p.name, preset?.id === p.id, () => set('path', preset?.id === p.id ? null : p.id)))),
    h('p.st-small.st-soft', {}, preset ? `${preset.sub}. ${CR_SAMPLE}` : 'Tap one to start from its usual length, or skip it and tap your own.'),
    numBox('What it costs, in all', X.cost, CR_OPTS.cost, (v, t) => (t ? keep(pk('cost'), v) : set(pk('cost'), v)), { id: 'cr_cost', help: 'Tuition, fees, books and tools, added up.' }),
    picks(pk('months'), 'How long it takes', CR_OPTS.months, v => (v ? `${v} months` : 'None'), preset && get(pk('months')) == null ? `${preset.months} months from the sample. Tap to change it.` : null),
    X.months > 0 ? picks(pk('keepPct'), 'Pay you keep while you learn', CR_OPTS.keepPct, v => (v === 0 ? 'None, full time' : v === 100 ? 'All of it' : 'About half'), preset && get(pk('keepPct')) == null ? 'From the sample. Tap to change it.' : null) : null,
    numBox('Your pay now, before taxes, a year', X.payBefore, CR_OPTS.pay, (v, t) => (t ? keep(pk('payBefore'), v) : set(pk('payBefore'), v)), { id: 'cr_before' }),
    numBox('Your pay after it, before taxes, a year', X.payAfter, CR_OPTS.pay, (v, t) => (t ? keep(pk('payAfter'), v) : set(pk('payAfter'), v)), { id: 'cr_after', help: 'Your own number: a job posting or an offer shows it.' }),
    picks('taxPct', 'The tax rate on a raise', CR_OPTS.taxPct, pct, 'Your top federal bracket. Your last tax return shows it.'),
    fold('cr-more', 'Help from a job, a loan, your age', numBox('What a job pays toward it', X.help, CR_OPTS.help, (v, t) => (t ? keep(pk('help'), v) : set(pk('help'), v)), { id: 'cr_help' }),
      numBox('A loan for it', X.loan, CR_OPTS.loan, (v, t) => (t ? keep(pk('loan'), v) : set(pk('loan'), v)), { id: 'cr_loan' }),
      X.loan > 0 ? picks(pk('loanRatePct'), 'The loan\'s rate', CR_OPTS.loanRatePct, pct) : null, X.loan > 0 ? picks(pk('loanYears'), 'Years to pay the loan', CR_OPTS.loanYears, v => `${v} years`) : null,
      h('div.st-field', {}, h('div.st-flabel', {}, 'Your age'), h('div.st-chips', { role: 'group', 'aria-label': 'Your age' }, [20, 25, 30, 35, 40, 45, 50].map(v => chip(String(v), get('age') === v, () => toggle('age', v))))),
      picks('endAge', 'Working until age', CR_OPTS.endAge, String, 'For the lifetime value: the years the raise is paid.')),
    h('div.st-field', {}, h('div.st-flabel', {}, 'Where are these numbers from?'), h('div.st-chips', { role: 'group', 'aria-label': 'Where are these numbers from?' }, CR_SOURCES.map(([v, label]) => chip(label, source === v, () => toggle('source', v))))));

  // ---------- the answer (drawn again while a number is typed) ----------
  const results = () => {
    const P = pathOf(pid), R = crRoi(P);
    if (R.needs?.length) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your answer shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, `Still needed: ${R.needs.map(n => ({ cost: 'what it costs', payBefore: 'your pay now', payAfter: 'your pay after it', taxPct: 'the tax rate', months: 'how long it takes', keepPct: 'the pay you keep' })[n]).join(', ')}.`));
    const level = crLevel(R, source), F = got('takeHome') != null && got('spending') != null && got('invested') != null ? move(R) : null;
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-row', { style: { justifyContent: 'space-between' } }, h('div.st-eyebrow', {}, 'Your answer'), tag(level)),
      h('div.st-soft', {}, 'Pays back after you finish'), h('div.st-big', {}, R.paybackYears == null ? 'Not at this pay' : yrs(R.paybackYears)),
      h('p', { style: { fontWeight: 700 } }, crRoiWords(R, P)),
      rows([['The whole price', 'what you pay, the pay given up, the interest', big(R.total)], ['The raise after tax', 'a year', big(R.gainNet)],
        ['Lifetime value', R.lifetime == null ? 'Tap your age and the age you work until' : `to age ${P.endAge}, after the price`, R.lifetime == null ? 'Tap yours' : `${R.lifetime < 0 ? '-' : ''}${big(Math.abs(R.lifetime))}`],
        ['The day work becomes optional', F ? 'your plan, run again with this path in' : 'Add your plan\'s three numbers below', F ? crDayWords(F.days) : 'Tap yours']]),
      math('cr-m-roi', crRoiMath(R, P)));
  };
  let res = results();
  const swapRes = () => { const fresh = results(); res.replaceWith(fresh); res = fresh; };
  pathCard.querySelectorAll('input').forEach(i => i.addEventListener('input', () => setTimeout(swapRes, 0)));

  // ---------- two paths side by side ----------
  const A = crRoi(pathOf('trade')), B = crRoi(pathOf('four')), Cm = crCompare(A, B);
  const side = h('div.st-card', { id: 'cr-side' }, h('h2', { style: { marginTop: 0 } }, 'Trade school and a 4-year degree, side by side'),
    Cm ? rows([['Trade school', `price ${big(A.total)}, raise ${big(A.gainNet)} a year`, A.paybackYears == null ? 'No payback' : yrs(A.paybackYears)], ['A 4-year degree', `price ${big(B.total)}, raise ${big(B.gainNet)} a year`, B.paybackYears == null ? 'No payback' : yrs(B.paybackYears)],
      Cm.gap != null ? ['Lifetime value, the degree less trade school', 'to the age you work until', `${Cm.gap < 0 ? '-' : ''}${big(Math.abs(Cm.gap))}`] : null]) : h('p.st-soft', {}, 'Tap Trade school above and fill it in, then A 4-year degree. Each keeps its own answers, and both show here.'),
    Cm?.top ? h('p.st-small', {}, `The biggest difference is ${Cm.top.n}: ${big(Cm.top.diff)}.`) : null);

  // ---------- the credential stack ----------
  const stack = get('stack') ?? [];
  const setStack = list => set('stack', list);
  const S = crStack(stack.map(c => ({ ...c })));
  const text = (label, value, onSet, type = 'text') => h('div.st-field', {}, h('div.st-flabel', {}, label), h('div.st-box', {}, h('div.in', {}, h('input', { type, value: value ?? '', 'aria-label': label, autocomplete: 'off', onChange: e => onSet(e.target.value || null) }))));
  const stackCard = h('div.st-card', { id: 'cr-stack' }, h('h2', { style: { marginTop: 0 } }, 'Your credential stack'), h('p.st-soft', {}, 'Several credentials, each with its dates. Two that run at the same time are flagged.'),
    stack.map((c, i) => h('div.st-card.inner', { style: { marginTop: '10px' } }, text('Name', c.name, v => setStack(stack.map((x, j) => (j === i ? { ...x, name: v ?? `Credential ${i + 1}` } : x)))),
      h('div.st-row', {}, text('Starts', c.from, v => setStack(stack.map((x, j) => (j === i ? { ...x, from: v } : x))), 'month'), text('Ends', c.to, v => setStack(stack.map((x, j) => (j === i ? { ...x, to: v } : x))), 'month')),
      numBox('What it costs', c.cost ?? null, CR_OPTS.cost.slice(0, 4), (v, t) => { stack[i] = { ...stack[i], cost: v }; t ? keep('stack', stack) : setStack(stack); }, { id: `cr_s${i}_cost` }),
      numBox('The raise it should bring, a year', c.raise ?? null, CR_OPTS.raise, (v, t) => { stack[i] = { ...stack[i], raise: v }; t ? keep('stack', stack) : setStack(stack); }, { id: `cr_s${i}_raise` }),
      h('div.st-row', {}, btn('Remove', () => setStack(stack.filter((_, j) => j !== i)), 'slim')))),
    h('div.st-row', { style: { marginTop: '10px' } }, btn('Add a credential', () => setStack([...stack, { name: `Credential ${stack.length + 1}`, from: null, to: null, cost: null, raise: null }]), stack.length ? 'slim' : 'primary')),
    S.items.length ? h('p', { style: { fontWeight: 700 } }, crStackWords(S)) : null,
    S.items.length ? rows([['Months from the first start to the last end', null, String(S.span)], ['Months with learning going on', null, String(S.busy)], ['What they cost, added up', S.open.length ? `not counted yet: ${S.open.join(', ')}` : null, big(S.cost)], ['The raises, added up', 'a year, before taxes', big(S.raise)],
      (() => { const P = get('taxPct') == null || !S.raise ? null : crRoi({ cost: S.cost, months: 0, payBefore: 0, payAfter: S.raise, taxPct: get('taxPct') }); return P && P.paybackYears != null ? ['The stack pays back in', `after ${get('taxPct')}% tax on the raises`, yrs(P.paybackYears)] : null; })()]) : null);

  // ---------- the match that stays with the job ----------
  const vx = { match: get('vMatch'), years: get('vYears'), schedule: get('vSchedule'), ownPct: get('vOwnPct') }, V = crVestLeft(vx);
  const vestCard = h('div.st-card', { id: 'cr-vest' }, h('div.st-row', { style: { justifyContent: 'space-between' } }, h('h2', { style: { margin: 0 } }, 'Leaving before the match is yours'), V.needs?.length ? null : tag(crVestLevel(V, { matchTyped: !!get('vTyped'), schedule: vx.schedule }))),
    h('p.st-soft', {}, 'When a job ends before the match vests, part of it stays with the job. Your own numbers, from your plan\'s statement.'),
    numBox('The job\'s match in your account now', vx.match, CR_OPTS.match, (v, t) => { api.remember({ [k('vMatch')]: v, [k('vTyped')]: t }); t ? api.save() : api.render(); }, { id: 'cr_vmatch', help: 'Your statement shows it as employer or match money.' }),
    picks('vYears', 'Years at this job when you leave', CR_OPTS.years, v => (v === 0.5 ? '6 months' : `${v} ${v === 1 ? 'year' : 'years'}`)),
    picks('vSchedule', 'Your plan\'s vesting schedule', CR_VEST.map(v => v.id), id => CR_VEST.find(v => v.id === id).name, 'Your plan\'s summary says which. Plans can vest faster than the 3-year cliff or the 6-year graded schedule, never slower.'),
    vx.schedule === 'own' ? picks('vOwnPct', 'What your statement says is vested', CR_OPTS.ownPct, pct) : null,
    V.needs?.length ? null : h('p', { style: { fontWeight: 700 } }, crVestWords(V)), math('cr-m-vest', crVestMath(V, vx)),
    fold('cr-vsrc', 'Where the schedules come from', h('p.st-small', {}, CR_VEST_SOURCE)));

  // ---------- the launch window ----------
  const tax = get('taxPct'), hop = crHop({ raise: get('hRaise'), taxPct: tax, left: V.needs?.length ? 0 : V.left }), roth = crRothTrad({ yearly: get('rYearly'), nowPct: tax, laterPct: get('rLater') }), hack = crHack({ rent: get('kRent'), costs: get('kCosts'), years: get('kYears') });
  const planOk = got('takeHome') != null && got('spending') != null && got('invested') != null;
  const day = mv => (mv.needs?.length ? 'Tap yours' : planOk ? crDayWords(move(mv)?.days ?? null) : 'Add your plan below');
  const launch = h('div.st-card', { id: 'cr-launch' }, h('h2', { style: { marginTop: 0 } }, 'The launch window'), h('p.st-soft', {}, 'Three moves that open early in a career, each as days on the day work becomes optional.'),
    rows([['A job hop', hop.needs?.length ? 'Tap a raise and your tax rate' : V.needs?.length ? 'the raise after tax' : `the raise after tax, less ${big(V.left)} of the match that stays with the job`, day(hop)],
      ['Traditional now, next to Roth', roth.needs?.length ? 'Tap an amount, and your tax rate now and later' : roth.lead === 'trad' ? 'the tax saved now, invested' : roth.lead === 'roth' ? 'a lower rate now: Roth leaves more' : 'the same rate now and later', day(roth)],
      ['A house hack', hack.needs?.length ? 'Tap the rent, the costs and the years' : `${big(hack.monthly)} a month for ${get('kYears')} ${get('kYears') === 1 ? 'year' : 'years'}`, day(hack)]]),
    fold('cr-l-hop', 'A job hop', picks('hRaise', 'The raise, before taxes, a year', CR_OPTS.raise, big, 'Uses the tax rate above, and the match that stays with the job from the card above.'), math('cr-m-hop', crLaunchMath('hop', hop, { raise: get('hRaise'), taxPct: tax }))),
    fold('cr-l-roth', 'Roth or traditional now', picks('rYearly', 'Put in a year', CR_OPTS.yearly, big), picks('rLater', 'Your tax rate when you take it out', CR_OPTS.taxPct.concat([0]).sort((a, b) => a - b), pct, 'Your rate now is the tax rate above.'), math('cr-m-roth', crLaunchMath('roth', roth, { yearly: get('rYearly'), nowPct: tax, laterPct: get('rLater') }))),
    fold('cr-l-hack', 'A house hack', picks('kRent', 'Rent coming in, a month', CR_OPTS.rent, big), picks('kCosts', 'What it adds to your costs, a month', CR_OPTS.costs, big), picks('kYears', 'For how long', CR_OPTS.hackYears, v => `${v} ${v === 1 ? 'year' : 'years'}`), math('cr-m-hack', crLaunchMath('hack', hack, { rent: get('kRent'), costs: get('kCosts'), years: get('kYears') }))));

  // ---------- the plan's own numbers, for the FI date ----------
  const basics = h('div.st-card', { id: 'cr-plan', onFocusout: e => { const t = e.relatedTarget, main = $('main'); if (!t || t === main || !main.contains(t)) setTimeout(() => api.render(), 0); } }, h('h2', { style: { marginTop: 0 } }, 'Your plan, for the FI date'),
    h('p.st-small.st-soft', {}, 'Three numbers. The day work becomes optional runs from them, with each move in and without it.'),
    Object.keys(BOX).map(key => numBox(BOX[key][0], got(key), BOX[key][1], (v, typing) => { answer(api.store, PLAN[key][0], { [PLAN[key][1]]: v }); if (!typing) return api.render(); api.save(); }, { id: `f_${key}`, help: BOX[key][2] })));
  const carry = h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Take it with you'), h('p.st-small', {}, 'Your link keeps these answers.'), h('div.st-row', {}, copyLink(api), btn('All the steps', async () => { location.href = `one.html#/d/${await pack(api.store.doc)}`; }, 'slim')));
  $('main').replaceChildren(h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, 'Does this course or degree pay back?'), h('p', { style: { marginBottom: 0 } }, 'What it costs with the time it takes, what the raise is worth after tax, when it pays back, and what it does to the day work becomes optional.')),
    pathCard, res, side, stackCard, vestCard, launch, basics, carry);
}
boot('career', api => { foot(); const step = $('step'); if (step) step.textContent = 'On its own'; page(api); });
