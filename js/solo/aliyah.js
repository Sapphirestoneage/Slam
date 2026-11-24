// SPDX-License-Identifier: AGPL-3.0-only
// Standalone, off the seven steps: "US vs Israel: what does the move do to my money?" (ROADMAP Run 8, Aliyah Math).
// One household's month in the US next to the same month in Israel, in the D.A.I.T.E. order with Food, Accommodation
// and Transportation first inside Expenses. The math is js/math/aliyah.js; this page only shows what it returns.
// Israeli figures come from data/sources/israel-2026.json, each with its source and how sure it is. A starting amount
// the person has not looked at is a Guess and shows faded; Use makes it Close, typing makes it Exact. Where the data has
// no figure there is no starting amount: the box is empty and the answer says what is not priced.
import { boot, h, btn, chip, money, copyLink, foot } from './shell.js';
import { onFile } from '../journey.js';
import { aliyahOf, aliyahStart, ils, ALIYAH_SCENARIOS, ALIYAH_LINES } from '../math/aliyah.js';
import { pack } from '../start/link.js';

const $ = id => document.getElementById(id);
const has = v => v !== null && v !== undefined;
// Amounts to tap. They are a range to pick from, not a claim about anyone's costs; none is chosen until tapped.
const RATES = [3, 3.25, 3.5, 3.75, 4], GROSS = [40000, 60000, 80000, 100000, 150000, 200000], SAVED = [5000, 15000, 30000, 60000, 100000];
const MOVE = [0, 5000, 10000, 20000], OWED = [0, 200, 500, 1000, 1500], STATE = [0, 2000, 5000, 10000], US_TAX = [0, 2000, 5000, 10000];
const SALARY = [8000, 12000, 16000, 22000, 30000], PART = [3000, 5000, 7000, 9000], SIDE = [2000, 4000, 6000, 10000], NI = [0, 200, 500, 1000], ARNONA = [0, 300, 500, 800], OTHER = [0, 1000, 2500, 4000], OTHER_IL = [0, 3000, 8000, 12000];
const US_LINE = { food: [400, 600, 850, 1200, 1600], home: [1200, 1800, 2300, 3000, 4000], move: [150, 400, 670, 900, 1200], health: [0, 200, 565, 800, 1200], kids: [0, 500, 1000, 1500, 2500], rest: [500, 800, 1200, 1800, 2500] };
const SHARES = [[1, 'Same as the US'], [0.9, '10% less'], [0.75, 'A quarter less'], [0.5, 'Half'], [1.25, 'A quarter more']];
const KOSHER = [[0, 'Nothing extra'], [0.1, '10% more'], [0.2, '20% more'], [0.3, '30% more'], [0.5, '50% more']];
const YEARS = [[1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [5, '5th'], [6, 'Later']];
const open = new Set(['I', 'E']), openRows = new Set(); // which folds are open, kept across redraws (not saved)
let IL = null, dirty = false; // dirty: a box was typed in since the last redraw, so the rows below are a beat behind

function draw(api) {
  foot(); const step = $('step'); if (step) step.textContent = 'On its own'; dirty = false;
  const m = api.mine().aliyah || {}, put = patch => api.remember({ aliyah: { ...(api.mine().aliyah || {}), ...patch } });
  const plan = { takeHome: onFile(api.store.doc, 'income', { ref: api.ref }).takeHome ?? null, ...onFile(api.store.doc, 'cash') };
  const filing = m.filing ?? 'Single', kids = m.kids ?? 0, sc = m.scenario ?? 'remote';
  const S = aliyahStart({ ...plan, filing }, api.ref, IL); // the starting amounts: every one a Guess
  const D = { filing: 'Single', place: 'none', kids: 0, scenario: 'remote', year: 1, window: false, resident: S.resident.man, usGross: S.usGross, savings: S.savings,
    remoteTreat: 'israeli', landing: 6, kosher: false, ...Object.fromEntries(ALIYAH_LINES.map(([k]) => [`us_${k}`, S.spend[k]])) };
  const val = k => m[k] ?? D[k] ?? null;
  const status = k => (has(m[k]) ? (m.close?.[k] ? 'Close' : m.guess?.[k] ? 'Guess' : 'Exact') : has(D[k]) ? 'Guess' : null);
  const lines = ALIYAH_LINES.filter(([k]) => k !== 'kids' || kids > 0);
  // which starting amounts this answer rests on
  const taxed = sc !== 'none' && !(sc === 'remote' && val('remoteTreat') === 'foreign');
  const used = ['filing', 'place', 'kids', 'scenario', 'year', 'usGross', 'kosher', ...(has(val('savings')) ? ['savings'] : []), ...(taxed ? ['resident', 'window'] : []), ...(sc === 'remote' ? ['remoteTreat'] : []), ...(sc === 'none' ? ['landing'] : []),
    ...lines.flatMap(([k]) => [`us_${k}`, `il_${k}`])];
  const guesses = () => used.filter(k => status(k) === 'Guess');
  const input = (over = {}) => {
    const cur = api.mine().aliyah || {}, v = k => (k in over ? over[k] : cur[k] ?? D[k] ?? null); // read fresh: a second box typed in before a redraw keeps the first
    return { rate: v('rate'), filing: v('filing'), place: v('place'), stateTax: v('stateTax'), kids: v('kids'), usGross: v('usGross'), otherUs: v('otherUs'), otherIl: v('otherIl'), scenario: sc,
      remoteGross: v('remoteGross'), remoteTreat: v('remoteTreat'), remoteNi: v('remoteNi'), salary: v('salary'), partPay: v('partPay'), side: v('side'), niOther: v('niOther'), resident: v('resident'), year: v('year'), window: v('window'),
      usTaxAbroad: v('usTaxAbroad'), debt: v('debt'), savings: v('savings'), moveCost: v('moveCost'), landing: v('landing'), kosher: !!v('kosher'), kosherUs: v('kosherUs'), kosherIl: v('kosherIl'), arnona: v('arnona'),
      spend: Object.fromEntries(ALIYAH_LINES.map(([k]) => { const il = v(`il_${k}`); return [k, { us: v(`us_${k}`), il: il?.ils ?? null, ilOfUs: il?.of ?? null }]; })) };
  };
  const R = aliyahOf(input(), api.ref, IL);

  // ---- small parts
  const tag = st => (st ? h(`span.st-tag.al-tag${st === 'Exact' ? '.yours' : st === 'Close' ? '.al-close' : ''}`, {}, st) : null);
  const set = (k, v, how = null) => { const cur = api.mine().aliyah || {}, close = { ...(cur.close || {}) }, guess = { ...(cur.guess || {}) }; delete close[k]; delete guess[k]; if (how === 'close') close[k] = true; if (how === 'guess') guess[k] = true; put({ [k]: v, close, guess }); };
  const tap = (k, v, how = null) => { set(k, v, how); api.render(); };
  const useAll = () => { const patch = {}, close = { ...(m.close || {}) }, guess = { ...(m.guess || {}) }; for (const k of guesses()) { patch[k] = val(k); close[k] = true; delete guess[k]; } put({ ...patch, close, guess }); api.render(); };
  // a group of chips; a starting choice shows its Guess tag until one is tapped
  const choice = (label, k, options, { help = null, id = null } = {}) => h('div.st-field', { id }, h('div.st-flabel', {}, label, ' ', status(k) === 'Guess' ? tag('Guess') : null),
    h('div.st-chips', {}, options.map(([v, text]) => chip(text, val(k) === v, () => tap(k, v)))), help ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, help) : null);
  // one number: Use (when it is a Guess) before the box, amounts to tap under it
  const box = (label, k, picks, { unit = '$', help = null, fmt = v => (unit === '$' ? money(v) : ils(v)), pickHow = null } = {}) => {
    const st = status(k), mine = has(m[k]) && st !== 'Guess', shown = mine ? m[k] : null, g = val(k);
    const el = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', id: `f_${k}`, 'aria-label': label, placeholder: st === 'Guess' && has(g) ? Number(g).toLocaleString('en-US') : '0', value: has(shown) ? Number(shown).toLocaleString('en-US') : '',
      onInput: e => { const n = e.target.value.replace(/[^\d.]/g, ''), v = n === '' || n === '.' ? null : Number(n); set(k, v); dirty = true; typed({ [k]: v ?? D[k] ?? null }); }, onKeydown: e => { if (e.key === 'Enter') e.target.blur(); } });
    return h('div.st-field', {}, h('div.st-flabel', {}, label, ' ', tag(st)),
      h('div.al-boxrow', {}, st === 'Guess' ? btn('Use', () => tap(k, g, 'close'), 'slim') : null, h(`div.st-box.narrow${st === 'Guess' ? '.al-faded' : ''}`, {}, h('div.in', {}, h('span', {}, unit), el))),
      picks?.length ? h('div.st-chips', { style: { marginTop: '8px' } }, picks.map(v => chip(fmt(v), mine && m[k] === v, () => tap(k, v, pickHow)))) : null,
      help ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, help) : null);
  };
  const redrawIfBehind = () => { if (dirty && document.activeElement?.tagName !== 'INPUT') api.render(); }; // a fold opened after typing: bring its rows up to date, never under the keyboard
  const fold = (id, summary, ...kids) => h('details.st-fold', { open: open.has(id), onToggle: e => { if (e.target.open) open.add(id); else open.delete(id); redrawIfBehind(); } }, h('summary', {}, summary), kids);
  const months = v => (v == null ? 'No costs' : `${v.toFixed(1)} months`);
  const cell = (r, side, faded) => { const v = r[side]; return h(`span.al-num${faded ? '.al-fadednum' : ''}`, {}, v == null ? h('span.st-soft', {}, 'Not here') : r.months ? months(v) : money(Math.round(v)), side === 'il' && has(r.ilIls) && !r.months ? h('small', {}, ils(r.ilIls)) : null); };
  const soft = guesses().length > 0;
  // one result row: the label, the US, Israel; open it for the math (and, for a cost, its two boxes)
  const row = (r, { edit = null, fadeUs = soft, fadeIl = soft } = {}) => h(`details.al-row${r.sub ? '.sub' : ''}`, { open: openRows.has(r.key), onToggle: e => { if (e.target.open) openRows.add(r.key); else openRows.delete(r.key); redrawIfBehind(); } },
    h('summary', {}, h('span.al-what', {}, r.label, h('small', {}, edit ? 'Change it, show the math' : 'Show the math')), cell(r, 'us', fadeUs), cell(r, 'il', fadeIl)),
    h('div.al-body', {}, edit, r.math.map(t => h('p.st-small', {}, t))));
  const head = () => h('div.al-head', { 'aria-hidden': 'true' }, h('span', {}, ''), h('span', {}, 'US'), h('span', {}, 'Israel'));
  const total = (label, us, il) => h('div.al-total', {}, h('span', {}, label), h(`span.al-num${soft ? '.al-fadednum' : ''}`, {}, money(Math.round(us))), h(`span.al-num${soft ? '.al-fadednum' : ''}`, {}, money(Math.round(il)), h('small', {}, ils(il * R.rate))));
  const sec = letter => (R.ready ? R.sections.find(s => s.letter === letter) : null);
  // one D.A.I.T.E. card: the letter, its name, both totals in the summary; inputs and rows inside
  const card = (letter, name, blurb, inputs, rows) => { const s = sec(letter);
    return h('details.st-card.al-sec', { id: `sec-${letter}`, open: open.has(letter), onToggle: e => { if (e.target !== e.currentTarget) return; if (e.target.open) open.add(letter); else open.delete(letter); redrawIfBehind(); } },
      h('summary', {}, h('span.al-letter', { 'aria-hidden': 'true' }, letter), h('span.al-name', {}, name, h('small', {}, blurb)), s && s.us != null ? h(`span.al-sum${soft ? '.al-fadednum' : ''}`, {}, `${money(Math.round(s.us))} US`, h('small', {}, `${money(Math.round(s.il))} Israel`)) : h('span.al-sum', {}, ''), h('span.al-chev', { 'aria-hidden': 'true' }, '›')),
      inputs, s ? h('div.al-rows', {}, head(), rows(s), s.us != null ? total(`${name} a month`, s.us, s.il) : null) : h('p.st-small.st-soft', { style: { marginBottom: 0 } }, 'The two columns show here once the answer does.'));
  };

  // ---- the answer
  const leftWords = v => (v >= 0 ? `${money(Math.round(v))} is left` : `${money(Math.round(-v))} more goes out than comes in`);
  const scenarios = () => h('div.st-field', { id: 'scenario' }, h('div.st-flabel', {}, 'The work in Israel ', status('scenario') === 'Guess' ? tag('Guess') : null), h('div.st-chips', {}, ALIYAH_SCENARIOS.map(([id, label]) => chip(label, sc === id, () => tap('scenario', id)))));
  const answerCard = (over = {}) => {
    const A = Object.keys(over).length ? aliyahOf(input(over), api.ref, IL) : R;
    if (!A.ready) { const ilNeeds = A.needs.filter(n => n.endsWith(' in Israel')), other = A.needs.filter(n => !n.endsWith(' in Israel'));
      return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your answer shows here'),
        h('p.st-soft', {}, `Still needed: ${[...other, ilNeeds.length ? `what ${ilNeeds.length === 1 ? ilNeeds[0].replace(' in Israel', '').toLowerCase() : `${ilNeeds.length} kinds of spending`} would cost in Israel` : null].filter(Boolean).join(', ')}.`),
        ilNeeds.length ? h('div.st-row', {}, btn('Start every Israel cost at the US amount', sameAll, other.length ? 'slim' : 'primary')) : null,
        h('p.st-small.st-soft', { style: { marginBottom: 0 } }, 'No Israeli prices are filled in for you: what things cost there is not in the data yet. One tap starts each at your US amount, as a Guess you can change.'));
    }
    const n = guesses().length, d = Math.round(A.diff), C = A.cushion;
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Your answer ', n ? tag('Guess') : null),
      h('div.st-soft', {}, 'In Israel, each month you would have'), h(`div.st-big${n ? '.al-fadednum' : ''}`, {}, d === 0 ? 'About the same' : `${money(Math.abs(d))} ${d < 0 ? 'less' : 'more'}`),
      h('p', { style: { fontWeight: 700 } }, `In the US ${leftWords(A.us.left)} each month after taxes, costs and debt payments. In Israel, on "${A.scenarioName}", ${leftWords(A.il.left)} (${ils(A.il.leftIls)} at ${A.rate} shekels to the dollar). Over a year the gap is ${money(Math.abs(Math.round(A.diffYear)))}.`),
      C ? h('p', {}, `Your ${money(C.savings)} of savings covers ${months(C.monthsUs)} of your US costs with no pay coming in, and ${months(C.monthsIl)} of your Israel costs${C.moveCost ? ` after ${money(C.moveCost)} for the move` : ''}. `,
        C.lasts != null ? `On this plan it goes down by ${money(Math.round(-A.il.left))} a month and lasts about ${months(C.lasts)}.` : `On this plan it grows by ${money(Math.round(A.il.left))} a month.`,
        C.afterLanding != null ? (C.afterLanding >= 0 ? ` After ${C.landing} months of landing, ${money(Math.round(C.afterLanding))} is left.` : ` It runs out before the ${C.landing} months of landing are up.`) : '')
        : h('p.st-small.st-soft', {}, 'Add your savings under Assets to see how many months they cover on each side.'),
      n ? h('div.al-guessline', {}, h('span.st-small', {}, `${n} of the numbers behind this ${n === 1 ? 'is still a guess' : 'are still guesses'}, shown faded.`), btn('Use them all as they are', useAll, 'slim')) : null,
      A.notPriced.length ? h('p.st-small', { id: 'np-line' }, `${A.notPriced.length} ${A.notPriced.length === 1 ? 'thing is' : 'things are'} not priced yet and ${A.notPriced.length === 1 ? 'counts' : 'count'} as $0${A.notPriced.some(x => x.side === 'il') ? ', so the Israel side reads lighter than it will be' : ''}. The list is below.`) : null,
      scenarios(),
      A.notPriced.length ? fold('np', `What this does not price yet (${A.notPriced.length})`, h('ul.al-np', {}, A.notPriced.map(x => h('li.st-small', {}, x.text)))) : null,
      fold('math', 'Show the math', A.math.map(t => h('p.st-small', {}, t))));
  };
  const sameAll = () => { const patch = {}, guess = { ...(m.guess || {}) }; for (const [k] of lines) if (!has(m[`il_${k}`])) { patch[`il_${k}`] = { of: 1 }; guess[`il_${k}`] = true; } put({ ...patch, guess }); api.render(); };
  let answer = answerCard();
  // while typing only the answer card moves; the page redraws when the box is left
  const typed = over => { api.save(); const fresh = answerCard(over); answer.replaceWith(fresh); answer = fresh; };

  // ---- an expense row's two boxes: dollars in the US, shekels (or a share of the US amount) in Israel
  const costEdit = (k, label) => { const ik = `il_${k}`, cur = m[ik] ?? null, st = status(ik);
    const el = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', id: `f_${ik}`, 'aria-label': `${label} in Israel, shekels a month`, placeholder: '0', value: has(cur?.ils) ? Number(cur.ils).toLocaleString('en-US') : '',
      onInput: e => { const n = e.target.value.replace(/[^\d.]/g, ''), v = n === '' || n === '.' ? null : { ils: Number(n) }; set(ik, v); dirty = true; typed({ [ik]: v }); }, onKeydown: e => { if (e.key === 'Enter') e.target.blur(); } });
    return h('div.al-two', {}, box(`${label} in the US, a month`, `us_${k}`, US_LINE[k]),
      h('div.st-field', {}, h('div.st-flabel', {}, `${label} in Israel, a month `, st ? tag(st) : h('span.st-later', {}, 'To fill')),
        h('div.al-boxrow', {}, h('div.st-box.narrow', {}, h('div.in', {}, h('span', {}, '₪'), el))),
        h('div.st-chips', { style: { marginTop: '8px' } }, SHARES.map(([v, text]) => chip(text, cur?.of === v && st !== 'Guess', () => tap(ik, { of: v }, 'close'))), k === 'health' ? chip('₪0: basic cover only', cur?.ils === 0, () => tap(ik, { ils: 0 })) : null),
        h('div.st-small.st-soft', { style: { marginTop: '4px' } }, k === 'health' ? 'Basic cover in Israel is paid through the health tax, on the Taxes rows. Type what add-on plans would cost, or tap a share.' : k === 'home' ? 'Rent, utilities and internet. Arnona, the city tax, has its own row.' : 'Type shekels, or tap a share of your US amount.')));
  };
  const arnonaEdit = () => box('Arnona (city tax), a month', 'arnona', ARNONA, { unit: '₪', help: 'Not in the data yet. It depends on the city and the size of the home.' });

  // ---- the page
  // one pulse: the first thing still needed (its card is opened)
  const first = !has(val('rate')) ? 'f_rate' : !has(val('usGross')) ? 'f_usGross' : sc === 'salary' && !has(m.salary) ? 'f_salary' : (sc === 'part' || sc === 'partSide') && !has(m.partPay) ? 'f_partPay' : sc === 'partSide' && !has(m.side) ? 'f_side' : null;
  if (first && first !== 'f_rate') open.add('I');
  const hero = h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, 'US vs Israel: what does the move do to my money?'),
    h('p', { style: { marginBottom: 0 } }, 'The same household, the same month, in both countries: what comes in, what the taxes take, what life costs, and what is left. A few taps show the gap and how long your savings carry it.'));
  const startCard = h('div.st-card', { id: 'start' }, h('h2', { style: { marginTop: 0 } }, 'Start here'),
    box('Shekels to one dollar', 'rate', RATES, { unit: '₪', fmt: v => String(v), help: 'Look up today\'s rate and type it. None is filled in: the app has no rate source yet.' }),
    choice('The US tax return', 'filing', [['Single', 'Single'], ['Married jointly', 'Married, jointly'], ['Head of household', 'Head of household']]),
    choice('Children at home', 'kids', [[0, 'None'], [1, '1'], [2, '2'], [3, '3'], [4, '4']]),
    choice('Which year in Israel to look at', 'year', YEARS, { help: 'New immigrants get extra tax credit points for the first 54 months: 1 point for 12 months, 3 for 18, 2 for 12, 1 for 12.' }));
  const cards = [
    card('D', 'Debts', 'What you owe keeps being paid, in dollars', box('Debt payments a month, all together', 'debt', OWED, { help: 'Cards, student loans, a car. A US debt is still paid in dollars from Israel.' }), s => s.rows.map(r => row(r, { fadeUs: false, fadeIl: false }))),
    card('A', 'Assets', 'What you have to lean on', [box('Savings you can reach', 'savings', SAVED, { help: status('savings') === 'Guess' ? 'From your plan: checking and savings.' : 'Cash you could spend in the first year. Not retirement accounts.' }),
      box('What the move itself costs, once', 'moveCost', MOVE, { help: 'Flights, shipping, deposits, furniture. No figure for it is in the data.' }),
      sc === 'none' ? choice('Months with no income', 'landing', [[3, '3'], [6, '6'], [9, '9'], [12, '12']]) : null], s => s.rows.map(r => row(r, { fadeUs: status('savings') === 'Guess', fadeIl: soft }))),
    card('I', 'Income', 'What comes in before tax', [box('Your US pay a year, before tax', 'usGross', GROSS, { help: status('usGross') === 'Guess' ? 'Worked backwards from the take-home in your plan.' : 'The whole household, as on the W-2s.' }), scenarios(),
      sc === 'remote' ? [choice('How Israel sees that pay', 'remoteTreat', [['israeli', 'Israeli income: the work is done there'], ['foreign', 'Foreign income: exempt for 10 years']], { help: 'New immigrants pay no Israeli tax on foreign income for 10 years. Pay for work done while living in Israel is usually not foreign. A cross-border accountant can settle yours.' }),
        choice('National Insurance on that pay', 'remoteNi', [[null, 'Not priced: I will type it'], ['salaried', 'Use the salaried rates']], { help: 'The rates for pay that comes straight from a US employer are not in the data yet.' })] : null,
      sc === 'salary' ? box('The Israeli salary a month, before tax', 'salary', SALARY, { unit: '₪' }) : null,
      sc === 'part' || sc === 'partSide' ? box('The part-time pay a month, before tax', 'partPay', PART, { unit: '₪' }) : null,
      sc === 'partSide' ? box('Coaching or other work of your own, a month', 'side', SIDE, { unit: '₪', help: 'What is left after the costs of doing it, before tax.' }) : null,
      fold('other', 'A partner\'s pay or other money', box('Other money a month in the US, after tax', 'otherUs', OTHER), box('Other money a month in Israel, after tax', 'otherIl', OTHER_IL, { unit: '₪', help: 'One earner is priced on the Israel side. A second earner\'s take-home goes here.' }))],
    s => s.rows.map(r => row(r))),
    card('T', 'Taxes', 'What each country takes from the pay', [
      choice('The US state', 'place', [['none', 'No state income tax'], ['NY', 'New York State'], ['NYC', 'New York City'], ['other', 'Another state']]),
      val('place') === 'other' ? box('Your state income tax a year', 'stateTax', STATE, { help: 'Only New York is in the data so far.' }) : null,
      taxed ? choice('Your own credit points in Israel', 'resident', [[S.resident.man, `A man: ${S.resident.man}`], [S.resident.woman, `A woman: ${S.resident.woman}`]], { help: 'Every resident gets these. The new immigrant points are added on top.' }) : null,
      taxed ? choice(`Landing between ${S.windowFrom} and ${S.windowTo}`, 'window', [[false, 'No'], [true, 'Yes: the 0% rate']], { help: 'Arrivals in that window pay 0% income tax on Israeli earned income up to a ceiling that falls each year to 2030.' }) : null,
      (sc === 'remote' && val('remoteNi') !== 'salaried') || sc === 'partSide' || sc === 'none' ? box('National Insurance and health tax not priced here, a month', 'niOther', NI, { unit: '₪' }) : null,
      box('US tax you still expect to owe a year, living in Israel', 'usTaxAbroad', US_TAX, { help: 'A US citizen still files every year. The exclusion, the foreign tax credit and the Social Security agreement are not priced here yet.' })],
    s => s.rows.map(r => row(r))),
    card('E', 'Expenses', 'Food, Accommodation, Transportation, then the rest', [
      choice('Food', 'kosher', [[false, 'Regular'], [true, 'Kosher']], { id: 'kosher' }),
      val('kosher') ? h('div.al-two', {}, choice('Kosher adds, in the US', 'kosherUs', KOSHER), choice('Kosher adds, in Israel', 'kosherIl', KOSHER)) : null,
      val('kosher') ? h('p.st-small.st-soft', {}, 'No figure for what kosher adds is in the data, so nothing is added until you tap a share on each side.') : null,
      R.ready ? null : h('div.al-rows', {}, lines.map(([k, label]) => h('div.al-pending', {}, h('strong', {}, label), costEdit(k, label))))],
    s => s.rows.map(r => (r.key === 'arnona' ? row(r, { edit: arnonaEdit(), fadeUs: false, fadeIl: false }) : row(r, { edit: costEdit(r.key, r.label), fadeUs: status(`us_${r.key}`) === 'Guess', fadeIl: status(`il_${r.key}`) === 'Guess' || (status(`us_${r.key}`) === 'Guess' && has(m[`il_${r.key}`]?.of)) })))),
  ];
  const C = IL, src = (label, sure, urls) => h('li.st-small', {}, h('strong', {}, label), `: ${sure}. `, urls.map((u, i) => [i ? ', ' : '', h('a', { href: u, target: '_blank', rel: 'noopener noreferrer' }, new URL(u).hostname.replace(/^www\./, ''))]));
  const sources = h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, 'Where the numbers come from'),
    h('p.st-small', {}, `Israeli figures are for tax year ${C.taxYear}. Each one names its source and how sure it is. "Secondary" means other sites agree and the Tax Authority's own table still has to be read.`),
    fold('src', 'The sources, one by one', h('ul.al-np', {},
      src('Income tax bands', `${C.incomeTax.confidence.bands20and31}; the other bands: ${C.incomeTax.confidence.otherBands}; the extra tax on high incomes: ${C.incomeTax.surtax.confidence}`, C.incomeTax.sources),
      src('Credit points and the new immigrant schedule', `${C.creditPoints.confidence}; the resident's own points: ${C.creditPoints.residentBase.confidence}`, C.creditPoints.sources),
      src('The 0% rate for new arrivals', C.olimZeroRate.confidence, C.olimZeroRate.sources),
      src('The 10-year exemption on foreign income', C.foreignIncomeExemption.confidence, C.foreignIncomeExemption.sources),
      src('National Insurance and health tax, salaried', C.nationalInsurance.confidence, C.nationalInsurance.sources),
      src('Pension from pay', C.other.pensionEmployeeTypical.confidence, [C.other.pensionEmployeeTypical.source])),
      h('p.st-small', {}, `Prices in Israel carry ${Math.round(C.other.vat.rate * 100)}% VAT. It is already inside whatever you type for a cost.`),
      h('p.st-small', {}, 'The US side uses the plan\'s 2026 federal brackets, Social Security and Medicare, New York where tapped, and the Child Tax Credit. The faded US costs are the plan\'s typical monthly lines, added up by group.'),
      h('p.st-small', {}, 'The order is D.A.I.T.E.: Debts, Assets, Income, Taxes, Expenses, with Food, Accommodation and Transportation first, the same as the rest of Stress Less About Money.')),
    h('p.st-small.st-soft', { style: { marginBottom: 0 } }, 'Education, not tax advice. A move between two tax systems is worth an hour with an accountant who works in both.'));
  const carry = h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Take it with you'), h('p.st-small', {}, 'Your link keeps these answers.'),
    h('div.st-row', {}, copyLink(api), btn('All the steps', async () => { location.href = `one.html#/d/${await pack(api.store.doc)}`; }, 'slim')));
  const main = $('main');
  main.onfocusout = e => { const t = e.relatedTarget; if (e.target.tagName === 'INPUT' && (!t || t === main || !main.contains(t))) setTimeout(() => api.render(), 0); };
  main.replaceChildren(hero, answer, startCard, ...cards, sources, carry);
  if (first) $(first)?.closest('.in')?.classList.add('st-pulse');
}
fetch('data/sources/israel-2026.json').then(r => r.json()).then(il => { IL = il; return boot('aliyah', draw); }).then(() => { document.title = 'US vs Israel: what does the move do to my money?: Stress Less About Money'; });
