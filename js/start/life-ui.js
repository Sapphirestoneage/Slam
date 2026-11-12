// SPDX-License-Identifier: AGPL-3.0-only
// The Whole life screen (start.html): the year-by-year plan from js/lifetime, with scenario blocks to layer on, the
// choices about the future, and the stress tests. It only shows what the engine returns. The choices and blocks are
// this screen's own (kept in the browser beside the plan, not in the household file yet: QUESTIONS.md).
import { h } from '../ui/dom.js';
import { fmt } from '../math/result.js';
import { lifeOf, stressOf, strategiesOf, fillsOf, claimsOf, DEFAULTS } from '../lifetime/inputs.js';
import { STRATEGIES } from '../lifetime/engine.js';
import { lifeChart } from './charts-ui.js';

const money = v => fmt.money(Math.round(v / 100) * 100);
const TEMPLATES = [
  { kind: 'kid', name: 'A kid', years: 18, field: 'spending', ask: 'What it adds a year', picks: [10000, 15000, 20000, 25000] },
  { kind: 'off', name: 'Time off work', years: 1, field: 'spending', ask: 'What a year without pay costs you', picks: [30000, 45000, 60000] },
  { kind: 'part', name: 'Part-time work', years: 5, field: 'income', ask: 'What it pays a year', picks: [10000, 20000, 30000] },
  { kind: 'home', name: 'A home down payment', years: 1, field: 'once', ask: 'How much', picks: [30000, 60000, 100000] },
  { kind: 'big', name: 'A big trip or purchase', years: 1, field: 'once', ask: 'How much', picks: [5000, 10000, 25000] },
];
let cache = { key: null, life: null, extra: {} };
const openFolds = new Set(); // which choices are unfolded: kept across a change, so a tap inside one does not close it

export function lifeScreen({ pl, store, ref, hist, mine, remember, render, go, btn, chip, credit, flash }) {
  const s = { ...DEFAULTS, ...(mine().life || {}) };
  const choose = patch => { remember({ life: { ...(mine().life || {}), ...patch } }); render(); };
  const key = JSON.stringify([s, store.doc._rev, store.doc.updatedAt]);
  if (cache.key !== key) cache = { key, life: lifeOf(pl, store.doc, ref, hist, s), extra: {} };
  const L = cache.life, lazy = (name, f) => (cache.extra[name] ??= f());
  if (!L.ready) return [h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Whole life'), h('h1', {}, 'This needs your spending first'), btn('Answer it', () => go('numbers', { q: 'spending' }), 'primary'))];
  if (L.age == null) return [h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Whole life'), h('h1', {}, 'No age works yet on these numbers'),
    h('p', { style: { marginBottom: 0 } }, 'With what is left over each month today, the money does not last through age 90 from any stopping age up to 80. Spending less, earning more, or a scenario like part-time work changes that. Try the sliders on See it.'))];
  const own = s.retireAge != null, st = STRATEGIES.find(x => x.id === s.strategy);
  const hero = h('div.st-card.hero', {},
    h('h1.st-eyebrow', {}, 'Whole life'), h('div.st-soft', {}, own ? 'If you stop work at' : 'Work can become optional at'),
    h('div.st-big', {}, `age ${L.age}`),
    own ? h('p', {}, L.run.ok ? 'On a smooth market the money lasts to 90.' : `On a smooth market the money runs short at ${L.run.ranOutAge}.`, L.safe.age != null ? ` History would have carried age ${L.safe.age}.` : '')
      : h('p', {}, `Planned one year at a time to age 90, then run through every stretch of market history since ${hist.first}. It held in ${fmt.pct(L.safe.replay.success)} of them. On a perfectly smooth market it would be age ${L.smooth.age}.`),
    h('p', { style: { fontWeight: 700 } }, `You would need about ${money(L.need)} by then. The 25 times rule says ${money(L.rule25)}.`),
    h('div.st-row', {}, h('span.st-small', { style: { fontWeight: 700 } }, 'Try another age:'), [-2, 2, 5].map(d => chip(`${L.age + d}`, false, () => choose({ retireAge: L.age + d }))), own ? btn('Back to the age history carries', () => choose({ retireAge: null }), 'slim') : null));

  // ---- scenario blocks
  const blocks = s.blocks || [], put = list => choose({ blocks: list, retireAge: null });
  const edit = (id, patch) => put(blocks.map(b => (b.id === id ? { ...b, ...patch, toAge: (patch.fromAge ?? b.fromAge) + (patch.years ?? b.years) - 1 } : b)));
  const step = (label, value, onMinus, onPlus) => h('span.st-step', {}, h('button', { type: 'button', 'aria-label': `${label}: less`, onClick: onMinus }, '−'), h('span', {}, value), h('button', { type: 'button', 'aria-label': `${label}: more`, onClick: onPlus }, '+'));
  const blockRow = b => { const t = TEMPLATES.find(x => x.kind === b.kind), amount = b[t.field];
    return h('div.st-block', {}, h('div.st-row.end', {}, h('strong', {}, b.name), btn('Remove', () => put(blocks.filter(x => x.id !== b.id)), 'slim')),
      h('div.st-row', {}, step('Starts at age', `Age ${b.fromAge}`, () => edit(b.id, { fromAge: Math.max(pl.age, b.fromAge - 1) }), () => edit(b.id, { fromAge: Math.min(89, b.fromAge + 1) })),
        t.field === 'once' ? null : step('For how long', `${b.years} ${b.years === 1 ? 'year' : 'years'}`, () => edit(b.id, { years: Math.max(1, b.years - 1) }), () => edit(b.id, { years: Math.min(40, b.years + 1) }))),
      h('div.st-small', { style: { fontWeight: 700, margin: '8px 0 6px' } }, t.ask), h('div.st-chips', {}, t.picks.map(v => chip(money(v), amount === v, () => edit(b.id, { [t.field]: v })))),
      amount ? null : h('p.st-small.st-soft', { style: { margin: '6px 0 0' } }, 'Pick an amount to add it to the plan.')); };
  const add = t => put([...blocks, { id: `b${Date.now().toString(36)}`, kind: t.kind, name: t.name, fromAge: Math.min(89, pl.age + 5), years: t.years, toAge: Math.min(89, pl.age + 5) + t.years - 1 }]);
  const scenarios = h(`div.st-card${flash === 'scenarios' ? '.flash' : ''}`, {}, h('div.st-eyebrow', {}, 'Scenarios'), h('h2', {}, 'Layer your life on top'),
    h('p.st-soft.st-small', {}, 'Add a stretch of life, set when it starts and how long it lasts, and the age above moves. Stack as many as you like.'),
    blocks.map(blockRow), h('div.st-chips', { style: { marginTop: '10px' } }, TEMPLATES.map(t => h('button.st-chip', { type: 'button', onClick: () => add(t) }, `+ ${t.name}`))));

  // ---- choices, each folded; the heavier comparisons are worked out when opened
  const fold = (id, title, body) => h('details.st-fold.st-stmt', { open: openFolds.has(id) ? true : null, onToggle: e => { if (e.target.open && !openFolds.has(id)) { openFolds.add(id); render(); } else if (!e.target.open) openFolds.delete(id); } }, h('summary', {}, title), openFolds.has(id) ? body() : null);
  const opt = (on, title, lines, onPick) => h('button.st-opt', { type: 'button', 'aria-pressed': on ? 'true' : 'false', onClick: onPick }, h('b', {}, title), lines.filter(Boolean).map(l => h('span', {}, l)));
  const choices = h('div.st-card', {}, h('div.st-eyebrow', {}, 'Choices'), h('h2', {}, 'How the free years work'),
    fold('strategy', `How you take money out: ${st.name}`, () => h('div', {}, h('p.st-small.st-soft', {}, 'Each one shows the age history would have carried, what you would need then, and the deepest cut it ever asked for.'),
      h('div.st-opts', {}, lazy('strategies', () => strategiesOf(L, ref, hist)).map(x => opt(s.strategy === x.id, x.name, [x.age == null ? 'No age works' : `Age ${x.age}, needs ${money(x.need)}`, x.deepestCut == null ? null : x.deepestCut >= 0.999 ? 'Never a cut' : `Deepest cut: to ${fmt.pct(x.deepestCut)} of your spending`, x.plain], () => choose({ strategy: x.id, retireAge: null })))), credit('guardrails'))),
    fold('ss', `Social Security: claim at ${s.claimAge}`, () => h('div', {}, h('div.st-opts', {}, lazy('claims', () => claimsOf(pl, store.doc, ref, hist, s)).map(c => opt(s.claimAge === c.claimAge, `Claim at ${c.claimAge}`, [`About ${money(c.yearly / 12)} a month`, c.age == null ? null : `Work optional at ${c.age}`], () => choose({ claimAge: c.claimAge, retireAge: null })))),
      h('p.st-small.st-soft', { style: { margin: '8px 0 0' } }, 'An estimate from your pay today and the age you stop. Stopping sooner lowers it.'))),
    fold('tax', `Taxes in the free years: ${{ none: 'no conversions', deduction: 'fill the 0% space', 12: 'fill the 12% bracket' }[s.fill]}`, () => h('div', {}, h('p.st-small.st-soft', {}, 'In low-income years you can move taxed-later money into Roth at a low rate. It then comes out tax-free, and after five years without the early penalty.'),
      h('div.st-opts', {}, lazy('fills', () => fillsOf(L, ref)).map(f => opt(s.fill === f.id, f.name, [`Lifetime income tax: ${money(f.tax)}`, `Early penalties: ${money(f.penalties)}`, f.plain], () => choose({ fill: f.id })))),
      h('h3', { style: { marginTop: '12px' } }, 'Health cover a month before 65 (your guess)'), h('div.st-chips', {}, [0, 400, 600, 900].map(v => chip(v ? fmt.money(v) : 'Not counted', s.health === v, () => choose({ health: v, retireAge: null })))), credit('rothLadder'))),
    fold('spend', `Spending later in life: ${s.eras ? 'eases with age' : 'stays the same'}`, () => h('div', {}, h('div.st-opts', {}, opt(s.eras, 'Eases with age', [`Full to ${ref.retirementPhases.slowGoAge}, then ${fmt.pct(ref.retirementPhases.slowGo)}, then ${fmt.pct(ref.retirementPhases.noGo)} from ${ref.retirementPhases.noGoAge}`], () => choose({ eras: true, retireAge: null })), opt(!s.eras, 'Stays the same', ['The same spending every year to 90'], () => choose({ eras: false, retireAge: null }))), credit('eras'))),
    fold('mix', `Your mix: ${fmt.pct(s.stocks)} stocks`, () => h('div', {}, h('p.st-small.st-soft', {}, 'Used for the history test only. The rest is in bonds.'), h('div.st-chips', {}, [0.6, 0.8, 1].map(v => chip(`${fmt.pct(v)} stocks`, s.stocks === v, () => choose({ stocks: v, retireAge: null })))))));

  // ---- stress test
  const stress = lazy('stress', () => stressOf(L, ref, hist)), R = stress.replay, n = R.cycles.length, good = n - R.failed.length;
  const stressCard = h(`div.st-card${flash === 'stress' ? '.flash' : ''}`, {}, h('div.st-eyebrow', {}, 'Stress test'), h('h2', {}, `Stopping at ${L.age}: held in ${good} of ${n} stretches of real history`),
    h('p', {}, `Every start year from ${R.from} on, with the markets that really followed. `, R.failed.length ? `It came up short starting in ${R.failed.slice(0, 8).join(', ')}${R.failed.length > 8 ? ' and others' : ''}. The hardest start was ${R.worst.start}.` : 'It never came up short.'),
    h('p', {}, `Shuffled: the same real years in random order, ${stress.shuffle.runs.toLocaleString('en-US')} times. It held in ${fmt.pct(stress.shuffle.success)}.`),
    h('p.st-small.st-soft', { style: { marginBottom: 0 } }, 'The past is not a forecast. It shows what this plan would have lived through.'), credit('replay'));

  return [hero,
    L.notes.length ? h('div.st-card', {}, L.notes.map(nt => h('p.st-small.st-soft', { style: { margin: '0 0 6px' } }, nt))) : null,
    h('div.st-card', {}, h('div.st-eyebrow', {}, 'Year by year'), h('h2', {}, 'Your money from now to 90'), lifeChart(L.run, L.age),
      h('p.st-small.st-soft', { style: { margin: '8px 0 0' } }, 'This picture is the smooth-market path. If it ends with a lot left over, that margin is what carried the plan through the hard stretches of history below.')),
    scenarios, choices, stressCard,
    h('div.st-row', {}, btn('Sharpen it', () => go('sharpen'), 'primary'), btn('See all your numbers', () => go('all')))];
}
