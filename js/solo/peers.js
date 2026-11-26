// SPDX-License-Identifier: AGPL-3.0-only
// You and people like you (run Finish everything partly built, Part 9): one private page, peers.html. Your net worth,
// savings rate and pay next to published, dated numbers for people your age, the next milestone of the journey, and
// plain "people like you" lines. The math is js/math/peers.js (M8N; the game's copy is game/core/peers.js), on the
// rows of data/priors-2026.json (js/priorslib.js loads them) and on the plan's own numbers (metrics, the journey of
// js/math/trip.js). Private: boot's private mode keeps nothing until the person turns on Keep this, and a coach sees
// it only when let in (js/hard.js). No balance leaves the page: nothing here is sent anywhere.
import { boot, h, btn, chip, money, numBox, foot } from './shell.js';
import { keepCard } from './keepthis.js';
import { loadPriors } from '../priorslib.js';
import { metrics } from '../math/metrics.js';
import { journeyInputs } from '../math/ladder.js';
import { tpJourney } from '../math/trip.js';
import { onFile } from '../journey.js';
import { ownPlanPerson } from '../registry/couples.js';
import { peNetWorth, peSaving, peIncome, pePatterns, peNext, PE_WORDS, PE_QUARTERS, PE_NOT_YET } from '../math/peers.js';

const $ = id => document.getElementById(id);
const AGES = [22, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];
const NW = [-10000, 0, 10000, 50000, 150000, 400000, 1000000];
const GROSS = [40000, 60000, 80000, 100000, 150000, 200000];
const LEVEL_TIP = { Guess: 'Some of your numbers are a best guess. It will move as they firm up.', Close: 'From the numbers in your plan.' };
const tag = level => h(`span.st-tag${level === 'Guess' ? '' : '.yours'}`, { title: LEVEL_TIP[level] }, level);
const open = new Set();
const fold = (id, summary, ...body) => h('details.st-fold', { open: open.has(id), onToggle: e => { if (e.target.open) open.add(id); else open.delete(id); } }, h('summary', {}, summary), ...body);
const math = (id, lines) => (lines && lines.length ? fold(id, 'Show the math', lines.map(t => h('p.st-small', {}, t))) : null);
const src = S => (S ? h('p.st-small.st-soft', { style: { overflowWrap: 'anywhere' } }, `Source: ${S.line}.`) : null);
const pct = v => `${Math.round(v * 100)}%`;
const head = (title, level) => h('div.st-row.end', { style: { marginBottom: '8px' } }, h('h2', { style: { margin: 0 } }, title), level ? tag(level) : null);
const stat = (label, value, small) => h('li', {}, h('span.dot', {}, ''), h('span', {}, label, small ? h('small', {}, small) : null), h('span.when', {}, value));

let PRI = null;
function draw(api) {
  foot(); const step = $('step'); if (step) step.textContent = 'Private';
  const doc = api.store.doc, m0 = api.mine(), now = new Date(), set = patch => { api.remember(patch); api.render(); };
  let M = null;
  try { M = metrics(doc, api.ref, { now, person: ownPlanPerson(doc) }); } catch { M = null; }
  const born = doc.profile?.birthYear != null ? now.getFullYear() - doc.profile.birthYear : null, age = born ?? m0.age ?? null;
  const planNw = M?.netWorth?.value ?? null, nw = planNw ?? m0.nw ?? null;
  const tapped = (v, picks) => (v == null || picks.includes(v) ? 'Guess' : 'Close'); // a tapped amount is a guess; a typed one is yours
  const nwLevel = planNw != null ? (M.netWorth.guess ? 'Guess' : 'Close') : tapped(m0.nw ?? null, NW);
  const rate = M?.savingsRate?.value ?? null, rateLevel = rate == null ? null : M.savingsRate.guess ? 'Guess' : 'Close';
  const gross = m0.gross ?? null;

  const hero = h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Private'), h('h1', {}, 'You and people like you'),
    h('p', { style: { marginBottom: 0 } }, 'Your numbers next to published ones for people your age, with where each comes from. A place to start from, not a grade. Nothing here is kept unless you turn on Keep this, and no balance leaves this page.'));
  if (!PRI) return $('main').replaceChildren(hero, h('div.st-card', {}, h('p.st-soft', { style: { margin: 0 } }, 'Loading the published numbers...')));

  // ---------- the few taps the page needs when the plan does not have them ----------
  const taps = h('div.st-card', { id: 'pe-taps' }, h('h2', { style: { marginTop: 0 } }, 'A few taps'),
    h('p.st-small.st-soft', {}, 'Your plan fills in what it already knows. These stay on this page.'),
    born == null ? h('div.st-field', {}, h('div.st-flabel', {}, 'Your age, about'), h('div.st-chips', { id: 'pe-ages', role: 'group', 'aria-label': 'Your age' }, AGES.map(a => chip(String(a), m0.age === a, () => set({ age: m0.age === a ? null : a }))))) : h('p.st-small', {}, `Your age from your plan: ${born}.`),
    planNw == null ? numBox('Your net worth, about', m0.nw ?? null, NW, (v, typing) => { api.remember({ nw: v }); if (!typing) api.render(); }, { id: 'pe-nw', help: 'What you have minus what you owe, all in. Below $0 is an answer too: tap it.' }) : h('p.st-small', {}, `Your net worth from your plan: ${money(planNw)}.`),
    numBox('Your household\'s pay in a year, before taxes', gross, GROSS, (v, typing) => { api.remember({ gross: v }); if (!typing) api.render(); }, { id: 'pe-gross', help: 'Everyone in the household, added up: the top line of the pay stubs. Optional.' }));

  // ---------- net worth ----------
  const N = peNetWorth({ nw, age, rows: PRI.rows }, money);
  const nwCard = h('div.st-card', { id: 'answer' }, head('Net worth at your age', N.ready ? nwLevel : null),
    N.ready ? h('div', {}, h('div.st-big', {}, PE_WORDS[N.where].charAt(0).toUpperCase() + PE_WORDS[N.where].slice(1)), h('p', { style: { fontWeight: 700 } }, N.line),
      h('ul.st-list', {}, stat('Yours', money(nw)), stat(`The middle of ${N.band.who}`, money(N.median)), N.quarter ? stat('Among all households', PE_QUARTERS[N.quarter - 1], N.top10 ? 'Over the 90th too' : null) : null),
      h('p.st-small.st-soft', {}, nwLevel === 'Guess' ? 'Some of the numbers behind your net worth are a guess, so this is too.' : 'A rank shows where you start from. It moves as your numbers move.'),
      math('pe-m-nw', N.math), h('p.st-small.st-soft', {}, PE_NOT_YET.netWorthPct))
      : h('p.st-soft', {}, `Tap ${N.needs.join(' and ')} above and it shows here.`),
    src({ line: `Federal Reserve Board, ${PRI.sources.scf2025.name}, Table 2 and Table A.2 (2025, released ${PRI.sources.scf2025.released})` }));

  // ---------- savings rate ----------
  const S = peSaving({ rate, data: PRI });
  const saveCard = h('div.st-card', { id: 'pe-save' }, head('Savings rate', S.ready ? rateLevel : null),
    S.ready ? h('div', {}, h('div.st-big', {}, pct(S.yours)), h('p', { style: { fontWeight: 700 } }, S.line), h('ul.st-list', {}, stat('Yours', pct(S.yours), 'what you keep of what comes in'), stat('The whole country', `${(S.country * 100).toFixed(1)}%`, S.period)), math('pe-m-save', S.math))
      : h('p.st-soft', {}, S.row ? 'Your plan needs what comes in and what you spend a month. The first steps ask for both.' : 'No dated number to compare with yet.'),
    h('p.st-small.st-soft', {}, S.notYet), src(S.source));

  // ---------- income ----------
  const I = peIncome({ gross, data: PRI }, money);
  const payCard = h('div.st-card', { id: 'pe-pay' }, head('Household pay', I.ready ? tapped(gross, GROSS) : null),
    I.ready ? h('div', {}, h('div.st-big', {}, PE_WORDS[I.where].charAt(0).toUpperCase() + PE_WORDS[I.where].slice(1)), h('p', { style: { fontWeight: 700 } }, I.line), math('pe-m-pay', I.math))
      : h('p.st-soft', {}, I.row ? `The middle household had ${money(I.middle)} a year before taxes in ${I.row.year}. Tap your household's pay above to place yours.` : 'No dated number to compare with yet.'),
    h('p.st-small.st-soft', {}, I.notYet), src(I.source));

  // ---------- the next milestone (the journey of trip.html, the same stages) ----------
  const debtKnown = Object.values(onFile(doc, 'card')).some(v => v != null);
  let J = null;
  try { J = tpJourney(journeyInputs(doc, api.ref, { now, debtKnown })); } catch { J = null; }
  const X = peNext(J || {}, money);
  const nextCard = h('div.st-card', { id: 'pe-next' }, h('h2', { style: { marginTop: 0 } }, 'Your next milestone'),
    X.ready ? h('div', {}, h('p', { style: { fontWeight: 700 } }, X.line), X.done.length ? h('p.st-small.st-soft', {}, `Done: ${X.done.join(', ')}.`) : null)
      : h('p.st-soft', {}, 'Your plan needs your cash, what you owe and what you have invested to place you on the journey.'),
    h('div.st-row', {}, btn('See the whole journey', async () => { location.href = `trip.html#/d/${await api.packed()}`; }, 'slim'), btn('All the steps', async () => { location.href = `one.html#/d/${await api.packed()}`; }, 'slim')));

  // ---------- people like you ----------
  const P = pePatterns({ age, data: PRI }, money);
  const likeCard = h('div.st-card', { id: 'pe-like' }, h('h2', { style: { marginTop: 0 } }, 'People like you'),
    h('p.st-small.st-soft', {}, age == null ? 'Tap your age above and the lines with an age split show your age group.' : 'At your age where the table has an age split; for all households where it does not.'),
    h('ul.st-list', {}, P.map(p => h('li', {}, h('span.dot', {}, ''), h('span', { style: { minWidth: 0, overflowWrap: 'anywhere' } }, p.text, h('small', {}, `${p.byAge ? 'Your age group' : 'All households'}. ${p.source.publisher}, ${p.source.name} (${p.source.year})`))))));

  const sources = h('div.st-card', { id: 'pe-sources' }, fold('pe-src', 'Where these numbers come from',
    h('ul.st-list', {}, Object.values(PRI.sources).filter(s => ['scf2025', 'shed2025', 'p60289', 'bea202609'].some(k => PRI.sources[k] === s)).map(s => h('li', {}, h('span.dot', {}, ''), h('span', { style: { minWidth: 0, overflowWrap: 'anywhere' } }, s.name, h('small', {}, `${s.publisher}${s.released ? `, released ${s.released}` : ''}`), s.read ? h('small', {}, s.read) : null, h('small', {}, s.link))))),
    h('p.st-small.st-soft', {}, `Numbers as of ${PRI.asOf}. Not yet, with no dated table reachable: savings rate by age, income by age and its percentiles, net worth percentiles by age.`)));

  $('main').replaceChildren(hero, taps, nwCard, saveCard, payCard, nextCard, likeCard, sources, keepCard(api));
  if (age == null) $('pe-ages')?.classList.add('st-pulse');
}
boot('peers', draw, { private: true }).then(api => loadPriors().then(d => { if (d) { PRI = d; api.render(); } }));
