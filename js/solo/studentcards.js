// SPDX-License-Identifier: AGPL-3.0-only
// Run "Finish everything partly built", Part 5 (Nov 25 2026): the four cards under "Which student loan plan costs
// least?" (student.html). The household size the plans use, PSLF (the employer, the payments counted, the payments and
// years left, what is forgiven), a private refinance rate next to the federal plans with what it gives up, and the
// stepladder (each school year's loan at its own rate, the interest before payments start). All the numbers come from
// js/math/studentloan.js; this file only shows them and writes the person's taps.
import { h, btn, chip, money, numBox } from './shell.js';
import { DEBT_BOOK, setField } from '../book.js';
import { PAYMENTS_MADE, FAMILY_SIZES, REFI_RATES, REFI_YEARS, LADDER_LEVELS, LADDER_GAPS, SL_FROM, SL_SOURCES, pslfOf, pslfLeftFor, refiOf, stepladderOf, ladderRate, slLevel } from '../math/studentloan.js';
import { monthName } from '../month.js';

const big = v => money(Math.round(v));
const pct = r => `${+(r * 100).toFixed(2)}%`;
const LEVEL_TIP = { Guess: 'A best guess. It firms up when you check it.', Close: 'From a quote or a rough look.', Exact: 'From your servicer or studentaid.gov.' };
const tag = level => (level ? h(`span.st-tag${level === 'Guess' ? '' : '.yours'}`, { title: LEVEL_TIP[level] }, level) : null);
const open = new Set();
const fold = (id, summary, ...body) => h('details.st-fold', { open: open.has(id), onToggle: e => { if (e.target.open) open.add(id); else open.delete(id); } }, h('summary', {}, summary), ...body.flat().filter(Boolean).map(t => (typeof t === 'string' ? h('p.st-small', {}, t) : t)));
const rowsOf = rows => h('ul.st-list', {}, rows.filter(Boolean).map(([label, small, value]) => h('li', {}, h('span.dot', {}, ''), h('span', {}, label, small ? h('small', {}, small) : null), h('span.when', {}, value))));
const picks = (label, list, on, show, onTap, note) => h('div.st-field', {}, h('div.st-flabel', {}, label),
  h('div.st-chips', { role: 'group', 'aria-label': label }, list.map(v => chip(show(v), on(v), () => onTap(v)))), note ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, note) : null);
const title = (t, level) => h('h2', { style: { marginTop: 0, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, t, tag(level));
const fromPick = (api, key, label, list = SL_FROM) => picks(label, list.map(x => x[0]), v => (api.mine()[key] ?? 'guess') === v, v => list.find(x => x[0] === v)[1], v => { api.remember({ [key]: v }); api.render(); });
// a percent box: the person's own rate, typed (12.5 means 12.5%)
function rateBox(label, value, onSet, id) {
  const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: '0', id, 'aria-label': label, value: value == null ? '' : +(value * 100).toFixed(3),
    onInput: e => { const n = e.target.value.replace(/[^\d.]/g, ''); onSet(n === '' ? null : Number(n) / 100, true); }, onChange: () => onSet(undefined, false), onKeydown: e => { if (e.key === 'Enter') e.target.blur(); } });
  return h('div.st-field', {}, h('div.st-flabel', {}, label), h('div.st-box.narrow', {}, h('div.in', {}, input, h('span', {}, '%'))));
}
const fedRows = api => api.store.doc.records.filter(r => r.kind === 'debt' && r.type === 'Student loan' && r.values?.federal === 'Federal');
const PSLF_F = DEBT_BOOK.sections.find(s => s.id === 'student').more.find(f => f.id === 'pslf');
const LEFT_F = { id: 'paymentsLeft', type: 'count' };

// ---------- the household size the income-driven plans use ----------
export function familyCard(api, R) {
  if (!R?.s?.federal?.length) return null;
  const s = R.s, typed = s.familyTyped;
  return h('div.st-card', { id: 'family' }, title(`Your household: ${s.familySize} ${s.familySize === 1 ? 'person' : 'people'}`),
    h('p.st-small.st-soft', {}, typed ? 'The size you tapped, the one on your income-driven plan papers.' : 'Counted from your plan: you, a spouse and the people you support. IBR sets its payment on it.'),
    picks('Household size on your loan papers', FAMILY_SIZES, v => typed && s.familySize === v, v => (v === 6 ? '6 or more' : String(v)), v => { api.store.setDoc('profile', { loanFamilySize: typed && s.familySize === v ? null : v }); api.render(); },
      'You, a spouse if you are married, and the children or others you support. Tap again to go back to the count from your plan.'));
}

// ---------- PSLF ----------
export function pslfCard(api, R) {
  if (!R?.s?.federal?.length) return null;
  const P = pslfOf(R), rows = fedRows(api), made = P.counted;
  const setAll = (f, v) => { for (const r of rows) setField(api.store, r.id, f, v); api.render(); };
  const level = slLevel(P.left != null, api.mine().slPslfFrom);
  const body = [];
  body.push(picks('Do you work full time for a government or nonprofit employer that counts for PSLF?', ['Yes', 'No', 'Not sure'], v => P.employer === v, v => v, v => setAll(PSLF_F, v), SL_SOURCES.pslfCheck));
  if (P.employer === 'Yes') {
    body.push(picks('Qualifying payments counted so far', PAYMENTS_MADE, v => made === v, v => (v === 0 ? 'None yet' : `${v} (${v / 12} years)`), v => setAll(LEFT_F, pslfLeftFor(v, api.ref))));
    body.push(fromPick(api, 'slPslfFrom', 'Where the count is from'));
  }
  if (P.left != null) {
    body.push(h('div.st-tiles', {}, [['Payments counted', made == null ? 'Not told yet' : String(made)], ['Payments to go', String(P.left)], ['Years left', `about ${+P.years.toFixed(1)}`], ['Forgiven, tax-free', big(P.forgiven)]].map(([l, v]) => h('div.st-tile', {}, h('div.st-small.st-soft', {}, l), h('div', { style: { fontWeight: 800, fontSize: '1.25rem' } }, v)))));
    body.push(h('p', {}, P.text));
    body.push(h('p.st-small.st-soft', {}, `Done ${monthName(P.endsYm, 'short')} if every month from now counts. ${P.employer === 'Not sure' ? 'These numbers assume your employer counts.' : ''}`));
  } else if (P.employer === 'No') body.push(h('p.st-small.st-soft', {}, 'PSLF needs a government or nonprofit employer. The plans above show the forgiveness at the end of IBR and RAP instead.'));
  body.push(fold('pslf-why', 'Show the math and where the rules are from', P.row ? `${P.row.name}: ${P.row.text}` : null, 'PSLF forgives what is left after 120 qualifying payments, tax-free, while you work full time for a qualifying employer. Payments on IBR, RAP or the 10-year Standard plan count.', SL_SOURCES.pslfRule));
  return h('div.st-card', { id: 'pslf' }, title('Public Service Loan Forgiveness (PSLF)', level), ...body);
}

// ---------- refinance: a private rate next to the federal plans ----------
export function refiCard(api, R) {
  if (!R?.rows?.length) return null;
  const m = api.mine(), rate = m.slRefiRate ?? null, years = m.slRefiYears ?? null;
  const pick1 = patch => { api.remember(patch); api.render(); };
  const F = refiOf(R, { rate, years }, api.ref), level = slLevel(!F.needs?.length, m.slRefiFrom);
  const body = [h('p.st-small.st-soft', {}, 'Refinancing means a private lender pays off your federal loans and you owe the lender instead. Tap the rate a lender offers you; there is no default rate here.'),
    picks('The private rate', REFI_RATES, v => rate === v, pct, v => pick1({ slRefiRate: rate === v ? null : v })),
    rateBox('Or type the rate', rate, (v, typing) => { if (v === undefined) return api.render(); api.remember({ slRefiRate: v }); if (!typing) api.render(); else api.save(); }, 'f_refirate'),
    picks('Over how many years', REFI_YEARS, v => years === v, v => `${v} years`, v => pick1({ slRefiYears: years === v ? null : v })),
    fromPick(api, 'slRefiFrom', 'Where the rate is from', [SL_FROM[0], ['quote', 'An offer a lender showed me']])];
  if (F.needs?.length) body.push(h('p.st-soft', {}, `Still needed: ${F.needs.join(', ')}.`));
  else {
    body.push(rowsOf([[`Private, ${pct(F.rate)} over ${F.years} years`, `${big(F.paid)} in all, ${big(F.interest)} of interest, nothing forgiven`, `${big(F.payment)}/mo`],
      ...R.rows.map(r => [r.name, `${big(r.paid)} in all${r.forgiven > 0.5 ? `, ${big(r.forgiven)} forgiven` : ''}${r.tax > 0.5 ? `, about ${big(r.tax)} of tax on it` : ''}`, `${big(r.payment)}/mo`])]));
    body.push(h('p', { style: { fontWeight: 700 } }, `${big(Math.abs(F.diff))} ${F.diff > 0 ? 'more' : 'less'} in all than ${F.fed.name.split(',')[0]}, the federal plan that pays least in all on your numbers.`));
    body.push(h('div.st-field', {}, h('div.st-flabel', {}, 'What you give up'), h('ul.st-small', { style: { margin: '4px 0 0', paddingLeft: '18px' } }, F.gives.map(g => h('li', { style: { marginBottom: '4px' } }, g)))));
    body.push(fold('refi-why', 'Show the math', F.text, 'A private loan here is a level payment at its rate over its years. The federal rows are the plans above, on the same balance.', SL_SOURCES.refi));
  }
  return h('div.st-card', { id: 'refi' }, title('Refinance with a private lender', level), ...body);
}

// ---------- the stepladder ----------
export function ladderCard(api) {
  const m = api.mine(), rungs = Array.isArray(m.slLadder) ? m.slLadder : [], gap = m.slLadderGap ?? null;
  const years = api.ref.studentLoans.rates.map(r => r[0]);
  const put = (list, redraw = true) => { api.remember({ slLadder: list }); if (redraw) api.render(); else api.save(); };
  const edit = (i, patch, redraw = true) => put(rungs.map((r, k) => (k === i ? { ...r, ...patch } : r)), redraw);
  const next = () => { const last = rungs.at(-1); const y = last ? years[Math.min(years.length - 1, years.indexOf(last.year) + 1)] ?? last.year : null; return { year: y, level: last?.level ?? 'ug', amount: null, subsidized: false, rate: null }; };
  const L = stepladderOf(rungs, { gap }, api.ref), level = slLevel(!L.needs?.length, m.slLadderFrom);
  const rung = (r, i) => {
    const table = ladderRate(r.year, r.level, api.ref);
    return h('div.st-card', { style: { padding: '12px', margin: '8px 0' }, id: `rung${i}` },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } }, h('b', {}, `Year ${i + 1}: ${r.year ?? 'pick a school year'}`), btn('Remove this year', () => put(rungs.filter((_, k) => k !== i)), 'slim')),
      picks('School year', [...years, 'Earlier'], v => (v === 'Earlier' ? r.year && !years.includes(r.year) : r.year === v), v => v, v => edit(i, v === 'Earlier' ? { year: `${Number(years[0].slice(0, 4)) - 1}-${years[0].slice(2, 4)}` } : { year: v })),
      r.year && !years.includes(r.year) ? picks('Which earlier year', Array.from({ length: 10 }, (_, k) => { const y = Number(years[0].slice(0, 4)) - 1 - k; return `${y}-${String((y + 1) % 100).padStart(2, '0')}`; }), v => r.year === v, v => v, v => edit(i, { year: v })) : null,
      picks('Kind of loan', LADDER_LEVELS.map(x => x[0]), v => (r.level ?? 'ug') === v, v => LADDER_LEVELS.find(x => x[0] === v)[1], v => edit(i, { level: v, subsidized: v === 'ug' ? r.subsidized : false })),
      (r.level ?? 'ug') === 'ug' ? picks('Subsidized?', [true, false], v => !!r.subsidized === v, v => (v ? 'Yes, subsidized' : 'No, unsubsidized'), v => edit(i, { subsidized: v }), 'On a subsidized loan the government pays the interest while you are in school and in the grace period.') : null,
      numBox('What you borrowed that year', r.amount ?? null, [3500, 5500, 7500, 12500, 20500], (v, typing) => edit(i, { amount: v }, !typing), { id: `f_rung${i}` }),
      rateBox(table == null ? 'The rate on that year\'s loan (your loan list shows it)' : `Rate: ${pct(table)} for ${r.year}. A different one on your loan? Type it`, r.rate, (v, typing) => { if (v === undefined) return api.render(); edit(i, { rate: v }, !typing); }, `f_rungrate${i}`));
  };
  const body = [h('p.st-small.st-soft', {}, 'Each school year is its own loan with its own rate, set the July it was paid out. Interest starts before the first payment (except on subsidized loans). Add a year for each year you borrowed.'),
    ...rungs.map(rung),
    btn(rungs.length ? 'Add the next school year' : 'Add a school year', () => put([...rungs, next()]), rungs.length ? 'slim' : ''),
    rungs.length ? picks('Payments start', LADDER_GAPS, v => (gap ?? api.ref.studentLoans.grace) === v, v => (v === 0 ? 'Right after school' : v === 6 ? 'After the 6-month grace period' : 'A year after school'), v => { api.remember({ slLadderGap: v }); api.render(); }) : null,
    rungs.length ? fromPick(api, 'slLadderFrom', 'Where the amounts are from') : null];
  if (rungs.length && L.needs?.length) body.push(h('p.st-soft', {}, `Still needed: ${L.needs.join(', ')}.`));
  else if (rungs.length) {
    body.push(h('div.st-tiles', {}, [['Borrowed', big(L.principal)], ['Interest before payments', big(L.before)], ['Owed when payments start', big(L.owed)], ['Standard 10 years', `${big(L.payment)}/mo`]].map(([l, v]) => h('div.st-tile', {}, h('div.st-small.st-soft', {}, l), h('div', { style: { fontWeight: 800, fontSize: '1.25rem' } }, v)))));
    body.push(rowsOf(L.rungs.map(r => [`${r.year}, ${LADDER_LEVELS.find(x => x[0] === r.level)[1].split(' ')[0].toLowerCase()}${r.subsidized ? ', subsidized' : ''}, ${pct(r.rate)}${r.own ? ' (your rate)' : ''}`, `${big(r.amount)} borrowed, ${big(r.before)} of interest in ${r.months} months before payments, ${big(r.paid)} paid in all`, `${big(r.payment)}/mo`])));
    body.push(fold('ladder-why', 'Show the math and where the rates are from', L.text, 'Each year\'s loan is taken as paid out in September; payments start the month you tap after the last school year ends in May. Interest before payments: what you borrowed x the rate x the months / 12.', SL_SOURCES.capitalize, SL_SOURCES.rates));
  }
  return h('div.st-card', { id: 'ladder' }, title('The stepladder: each year\'s loan at its own rate', level), ...body);
}
