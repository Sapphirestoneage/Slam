// SPDX-License-Identifier: AGPL-3.0-only
// Your investments, all together (run Finish everything partly built, Part 13): one page, invest.html. The household
// mix of every investment account (the stock share next to your target or the age guide, the three-fund check, your
// employer's stock and any one company), every fund and fee in dollars (the fee and product X-ray), invest or pay
// debt as one small grid, and Roth or traditional account by account. The math is js/math/invest.js (M8I; the game's
// copy is game/core/invest.js), on what each account already holds (js/math/portfolio.js: allocationOf,
// holdingValue, yearlyContribution) and on the tax engine (js/math/income.js: householdRates now, federalTax and
// stateTax for the estimate in retirement). Holdings and fund fees are only what you typed or imported: nothing is
// fetched. The page's own taps (a target, what each holding is, a sales charge, an advisor fee, the retirement
// estimate) live in settings.start.iv.
import { boot, h, btn, chip, money, foot } from './shell.js';
import { carryUrl } from '../solo.js';
import { metrics } from '../math/metrics.js';
import { allocationOf, holdingValue, yearlyContribution } from '../math/portfolio.js';
import { householdRates, federalTax, stateTax } from '../math/income.js';
import { ownerOf, modeOf } from '../registry/couples.js';
import { ivMix, ivFees, ivHeat, ivRoth, ivGuide, IV_CLASSES, IV_RULES, IV_SOURCES } from '../math/invest.js';

const $ = id => document.getElementById(id);
const TARGETS = [null, 0.6, 0.7, 0.8, 0.9, 1];
const KINDS = [['fund', 'A fund'], ['stock', 'One company'], ['employer', 'My employer']];
const LOADS = [[0, 'None'], [0.03, '3%'], [0.0575, '5.75%']];
const ADVISOR = [[0, 'None'], [0.005, '0.5%'], [0.01, '1%'], [0.015, '1.5%']];
const LATER = [null, 30000, 50000, 75000, 100000, 150000];
const LEVEL_TIP = { Guess: 'Some accounts have no mix yet, so this is a best guess.', Close: 'From the mix you typed for each account.', Exact: 'From the holdings you typed, with their values.' };
const tag = level => h(`span.st-tag${level === 'Guess' ? '' : '.yours'}`, { title: LEVEL_TIP[level] }, level);
const open = new Set();
const fold = (id, summary, ...body) => h('details.st-fold', { open: open.has(id), onToggle: e => { if (e.target.open) open.add(id); else open.delete(id); } }, h('summary', {}, summary), ...body);
const math = (id, lines) => (lines && lines.length ? fold(id, 'Show the math', lines.map(t => h('p.st-small', {}, t))) : null);
const pct = v => (v == null ? '–' : `${Math.round(v * 100)}%`);
const pct1 = v => `${(Math.round(v * 1000) / 10).toFixed(1)}%`;
const head = (title, level) => h('div.st-row.end', { style: { marginBottom: '8px' } }, h('h2', { style: { margin: 0 } }, title), level ? tag(level) : null);
const stat = (label, value, small) => h('li', {}, h('span.dot', {}, ''), h('span', { style: { minWidth: 0, overflowWrap: 'anywhere' } }, label, small ? h('small', {}, small) : null), h('span.when', {}, value));
const chips = (label, list, cur, onPick, id) => h('div.st-field', {}, h('div.st-flabel', {}, label), h('div.st-chips', { id, role: 'group', 'aria-label': label }, list.map(([v, t]) => chip(t, cur === v, () => onPick(cur === v && v != null ? null : v)))));
const keyOf = x => String(x.ticker || x.name || '').trim().toUpperCase();

function draw(api) {
  foot();
  const step = $('step'); if (step) step.textContent = 'Investing';
  const doc = api.store.doc, ref = api.ref, now = new Date();
  const iv = api.mine().iv || {}, keep = patch => { api.remember({ iv: { ...iv, ...patch } }); api.render(); };
  let M = null;
  try { M = metrics(doc, ref, { now }); } catch { M = null; }
  const X = M?.inputs || {};
  const mode = modeOf(doc.profile);
  const accts = (doc.records || []).filter(r => r.kind === 'account' && r.values?.group === 'investment' && (r.values?.balance ?? 0) > 0);
  const kinds = iv.kinds || {}, loads = iv.loads || {};

  const hero = h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Investing'), h('h1', {}, 'Your investments, all together'),
    h('p', { style: { marginBottom: 0 } }, 'Every account added up: what is inside, what it costs a year, how it sits next to a three-fund mix, and two choices: invest or pay debt, and Roth or traditional. Only what you typed or imported counts. Nothing is looked up.'));
  const wholePlan = async () => { location.href = carryUrl('plan', await api.packed()); };
  if (!accts.length) {
    return $('main').replaceChildren(hero, h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'No investment accounts yet'),
      h('p.st-soft', {}, 'Add your 401(k), IRA, HSA or brokerage account with its balance, and what is inside it, in the whole plan, under Net worth › Assets. They show here, added up.'),
      h('div.st-row', {}, btn('Add an account in the whole plan', wholePlan, 'primary'))));
  }

  // ---------- each account as the engine reads it ----------
  const rows = accts.map(r => {
    const v = r.values, bal = v.balance, a = allocationOf(v, bal);
    const pos = (v.positions || []).map(x => ({ ...x, v: holdingValue(x) })).filter(x => x.v != null && x.v > 0);
    return { r, bal, a, pos, name: r.name || r.type, parts: a.ok ? Object.fromEntries(Object.entries(a.pcts).filter(([, p]) => p != null).map(([k, p]) => [k, p])) : null };
  });
  const level = rows.some(x => !x.parts) ? 'Guess' : rows.every(x => x.a.source === 'holdings') ? 'Exact' : 'Close';
  const age = X.age ?? (doc.profile?.birthYear != null ? now.getFullYear() - doc.profile.birthYear : null);
  const guide = age != null ? ivGuide(age, X.retireAge ?? 65) : null;
  const H = ivMix(rows.map(x => ({ name: x.name, amt: x.bal, parts: x.parts, holdings: x.pos.map(p => ({ name: p.ticker || p.name, v: p.v, kind: kinds[keyOf(p)] ?? 'fund' })) })),
    { target: iv.target ?? null, guide: guide && { stock: guide.stock, source: `the age guide (${guide.source})` }, money });

  // ---------- the household mix ----------
  const mixCard = h('div.st-card', { id: 'answer' }, head('Your mix, all accounts', H.ready ? level : null),
    H.ready ? h('div', {}, h('div.st-big', {}, `${pct(H.stock)} stocks`), H.lines.slice(0, 2).map(t => h('p', { style: { fontWeight: 600, margin: '4px 0' } }, t)),
      h('ul.st-list', {}, IV_CLASSES.filter(([k]) => H.dollars[k] > 0.5).map(([k, label]) => stat(label, `${money(H.dollars[k])} · ${pct(H.shares[k])}`))),
      H.unknown > 0.5 ? h('p.st-small.st-soft', {}, `${money(H.unknown)} has no mix yet. Open the account in the whole plan and type what is inside.`) : null)
      : h('p.st-soft', {}, 'None of the accounts has a mix yet. Type what is inside each one in the whole plan (Inside this account).'),
    chips('Your target stock share', TARGETS.map(t => [t, t == null ? (guide ? `The age guide (${pct(guide.stock)})` : 'The age guide') : pct(t)]), iv.target ?? null, t => keep({ target: t }), 'iv-target'),
    h('p.st-small.st-soft', {}, guide ? `The age guide is the ${guide.source}, set to a stop age of ${X.retireAge ?? 65}. A guide, not a grade.` : 'Add your birth year in the whole plan and the age guide shows.'),
    math('iv-m-mix', H.math));

  // ---------- the three-fund check ----------
  const threeCard = h('div.st-card', { id: 'iv-three' }, h('h2', { style: { marginTop: 0 } }, 'Three-fund check'),
    H.ready ? h('div', {}, h('ul.st-list', {}, H.three.map(t => stat(t.label, t.share > 0 ? pct(t.share) : t.maybe ? 'maybe, inside a broad fund' : 'none yet'))),
      h('p.st-small', {}, H.outside.length ? `Outside the three: ${H.outside.map(o => `${o.label} ${pct(o.share)}`).join(', ')}.` : 'Nothing sits outside the three.'))
      : h('p.st-soft', {}, 'It shows once an account has a mix.'),
    h('p.st-small.st-soft', {}, 'A plain comparison with the three kinds a three-fund mix holds. Not advice: many mixes fit a plan.'),
    h('p.st-small.st-soft', { style: { overflowWrap: 'anywhere' } }, `Source: ${IV_SOURCES.threeFund}.`));

  // ---------- one company ----------
  const allPos = rows.flatMap(x => x.pos.map(p => ({ ...p, account: x.name })));
  const C1 = H.conc;
  const oneCard = h('div.st-card', { id: 'iv-one' }, h('h2', { style: { marginTop: 0 } }, 'One company'),
    h('ul.st-list', {}, stat('Your employer\'s stock', C1.employerShare ? `${money(C1.employer)} · ${pct(C1.employerShare)}` : 'none marked'), C1.biggest ? stat('The biggest one company', `${C1.biggest.name} · ${pct(C1.biggest.share)}`) : null),
    C1.over.map(o => h('p', { style: { fontWeight: 600 } }, `${o.employer ? `Your employer's stock (${o.name})` : o.name} is ${pct(o.share)} of all your investments. ${o.employer ? 'Your pay and these shares then ride on one company.' : 'One company can rise or fall a long way on its own.'}`)),
    allPos.length ? fold('iv-kinds', `What each holding is (${allPos.length})`, allPos.map(p => chips(`${p.ticker || p.name || 'A holding'} in ${p.account} (${money(p.v)})`, KINDS, kinds[keyOf(p)] ?? 'fund', k => keep({ kinds: { ...kinds, [keyOf(p)]: k ?? 'fund' } }))))
      : h('p.st-small.st-soft', {}, 'Type the holdings of an account in the whole plan to check one company.'),
    h('p.st-small.st-soft', { style: { overflowWrap: 'anywhere' } }, `The line is ${pct(IV_RULES.oneStock)} of all your investments. Source: ${IV_SOURCES.oneStock}.`));

  // ---------- every fund and fee ----------
  const F = ivFees(rows.map(x => ({ name: x.name, amt: x.bal, accountFee: x.r.values.accountFee ?? null,
    funds: x.pos.length ? x.pos.map(p => ({ name: p.ticker || p.name || 'A holding', v: p.v, er: p.expenseRatio ?? null, load: loads[keyOf(p)] ?? null }))
      : [{ name: 'The whole account', v: x.bal, er: x.r.values.fees ?? null }] })), { advisor: iv.advisor ?? null, money });
  const feeCard = h('div.st-card', { id: 'iv-fees' }, h('h2', { style: { marginTop: 0 } }, 'Every fund and fee'),
    F.year > 0 ? h('div.st-big', {}, `${money(F.year)} a year`) : null,
    F.lines.map(t => h('p.st-small', {}, t)),
    h('ul.st-list', {}, F.rows.flatMap(r => [...r.funds.map(f => stat(f.name, f.year == null ? 'no fee yet' : `${money(f.year)} a year`, r.name)), r.accountFee ? stat(`${r.name}: account fee`, `${money(r.accountFee)} a year`) : null, r.advisor ? stat(`${r.name}: advisor`, `${money(r.advisor)} a year`) : null])),
    chips('An advisor fee on top, a year', ADVISOR, iv.advisor ?? null, v => keep({ advisor: v }), 'iv-adv'),
    allPos.length ? fold('iv-loads', 'A sales charge (load) on a fund', h('p.st-small.st-soft', {}, 'Some funds keep a cut of what you put in. The fund page or your statement says so.'),
      allPos.map(p => chips(`${p.ticker || p.name || 'A holding'}`, LOADS, loads[keyOf(p)] ?? null, v => keep({ loads: { ...loads, [keyOf(p)]: v } })))) : null,
    h('p.st-small.st-soft', {}, 'Insurance that also saves, or an annuity? The game\'s Product X-ray puts it next to the plain alternative.'),
    math('iv-m-fee', F.math));

  // ---------- invest or pay debt ----------
  const debts = (doc.records || []).filter(r => r.kind === 'debt' && (r.values?.balance ?? 0) > 0 && r.values?.apr != null).map(r => ({ name: r.name || r.type, apr: r.values.apr }));
  const ret = X.realReturn ?? ref.presets.realReturn.default;
  const HT = ivHeat({ debts, ret, money });
  const cell = c => {
    const a = Math.min(1, Math.abs(c.gap) / HT.max), col = c.side === 'debt' ? 'var(--good)' : 'var(--assets)';
    return h('td', { title: `${c.side === 'debt' ? 'Paying the debt saves' : c.side === 'invest' ? 'Investing grows' : 'About even:'} ${money(Math.abs(c.gap))} more`, style: { textAlign: 'center', padding: '6px 2px', borderRadius: '6px', fontSize: '.8rem', background: c.side === 'even' ? 'transparent' : `color-mix(in srgb, ${col} ${Math.round(12 + 50 * a)}%, transparent)`, fontWeight: c.mine ? 800 : 500 } },
      c.side === 'even' ? 'even' : `${c.side === 'debt' ? 'D' : 'I'} ${money(Math.abs(c.gap))}`);
  };
  const grid = h('div', { style: { overflowX: 'auto' } }, h('table', { style: { width: '100%', borderCollapse: 'separate', borderSpacing: '3px' } },
    h('thead', {}, h('tr', {}, h('th.st-small', { style: { textAlign: 'left' } }, 'Debt rate'), HT.returns.map(r => h('th.st-small', {}, `${pct(r)}${r === ret ? ' ★' : ''}`)))),
    h('tbody', {}, HT.grid.map(g => h('tr', {}, h('th.st-small', { style: { textAlign: 'left', whiteSpace: 'nowrap' } }, `${pct1(g.apr)}${g.mine ? ' ★' : ''}`), g.cells.map(cell))))));
  const heatCard = h('div.st-card', { id: 'iv-heat' }, h('h2', { style: { marginTop: 0 } }, 'Invest or pay debt'),
    h('p.st-small.st-soft', {}, `Each square: ${money(HT.amount)} for ${HT.years} years. Down the side, what a debt charges a year; across the top, what investing might return a year. D: paying the debt saves more. I: investing grows more. ★ yours, in bold.`),
    grid, HT.lines.map(t => h('p.st-small', { style: { fontWeight: 600 } }, t)),
    debts.length ? null : h('p.st-small.st-soft', {}, 'No debt with a rate on file. The grid still shows each rate.'),
    h('p.st-small.st-soft', {}, 'A paid debt\'s saving is sure; a return is a long-run average, not a promise. A match at work is extra money on top and is not in the grid.'),
    math('iv-m-heat', HT.math));

  // ---------- Roth or traditional, by account ----------
  const hh = X.householdTax;
  const nowOf = r => { const who = ownerOf(r, mode) === 'Partner' ? 'Partner' : 'Me'; const t = hh ? householdRates(hh, ref, { person: who }) : null; return t?.value != null ? { fed: t.federalMarginal, state: t.stateMarginal - (t.localMarginal ?? 0), local: t.localMarginal ?? 0 } : null; };
  const planLater = X.spending != null ? Math.round(X.spending * 12) : null;
  const laterIncome = iv.laterIncome ?? planLater;
  const place = iv.laterPlace === 'none' ? null : X.place ?? null, fs = X.filingStatus ?? 'Single';
  let later = null;
  if (laterIncome != null) {
    const fed = federalTax({ gross: laterIncome, filingStatus: fs }, ref).marginal;
    const both = stateTax({ gross: laterIncome, filingStatus: fs, place }, ref), st = stateTax({ gross: laterIncome, filingStatus: fs, place: place && { ...place, nyc: false } }, ref);
    later = { fed: laterIncome > 0 ? fed : 0, state: st.marginal, local: both.marginal - st.marginal };
  }
  const RR = ivRoth(accts.map(r => ({ name: r.name || r.type, type: r.type, taxType: r.values.taxType ?? null, yearly: yearlyContribution(r.values, X.payFrequency ?? null), now: nowOf(r) })), { later, money });
  const rothCard = h('div.st-card', { id: 'iv-roth' }, h('h2', { style: { marginTop: 0 } }, 'Roth or traditional, by account'),
    h('p.st-small.st-soft', {}, 'The top rate on your next dollar now (federal + state + city, from your pay in the plan) next to an estimate for retirement. Payroll tax is the same either way, so it is not in the rate.'),
    chips('Income in retirement a year, before taxes', LATER.map(v => [v, v == null ? (planLater != null ? `What I spend now (${money(planLater)})` : 'What I spend now') : money(v)]), iv.laterIncome ?? null, v => keep({ laterIncome: v }), 'iv-later'),
    chips('Where you might live then', [[null, 'Where I live now'], ['none', 'A state with no income tax']], iv.laterPlace ?? null, v => keep({ laterPlace: v })),
    h('ul.st-list', {}, RR.rows.map(r => h('li', {}, h('span.dot', {}, ''), h('span', { style: { minWidth: 0, overflowWrap: 'anywhere' } }, h('strong', {}, r.name), h('small', {}, r.words),
      r.ready ? h('small', { style: { fontWeight: 600 } }, r.line) : r.choice ? h('small', {}, r.needs.includes('your rate now') ? 'Needs your pay before taxes: add it in the whole plan.' : 'Tap an income in retirement above and it shows here.') : null,
      r.ready ? math(`iv-m-roth-${r.name}`, r.math) : null)))),
    h('p.st-small.st-soft', {}, `A rule of thumb, not tax advice. The Roth IRA has income limits (${money(ref.limits.rothIncome.single)} single, ${money(ref.limits.rothIncome.joint)} married filing jointly, where the phase-out starts in 2026).`));

  $('main').replaceChildren(hero, mixCard, threeCard, oneCard, feeCard, heatCard, rothCard,
    h('div.st-card', {}, h('div.st-row', {}, btn('Open the whole plan', wholePlan, 'slim'))));
}
boot('invest', draw);
