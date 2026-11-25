// SPDX-License-Identifier: AGPL-3.0-only
// "Compare the ways" on the Lifetime plan screen (start.html): the same plan through every way of taking money out,
// one row each, in families with variants. It only shows what js/lifetime/compare.js returns. A row takes about half a
// second to work out (1,000 shuffled markets and every real start year, with taxes), so the default row of each family
// is worked out first, one row at a time, and the variants only when their family is opened. Answers are kept until a
// number of the plan changes. The pins and the custom way are this screen's own choices (kept beside the plan).
import { h } from '../ui/dom.js';
import { fmt as fmt0 } from '../math/result.js';
import { WAY_FAMILIES, WAY_COLUMNS, WAY_FILTERS, WAY_TIMINGS, WAY_HORIZONS, WAY_CUSTOM_KINDS, WAY_CUSTOM_DEFAULT, WAY_CUT_LINE, wayCustom, waySort, wayFilter, wayPin, wayMeaning, wayMath } from '../math/withdraw.js';
import { compareRow, stopAgeFor, waysFor, worstChart, compareCsv } from '../lifetime/compare.js';
import { waysChart } from './charts-ui.js';

const money = v => fmt0.money(Math.round(v / 100) * 100), pct = v => `${Math.round(v * 100)}%`;
const brief = v => (Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(Math.abs(v) >= 1e7 ? 1 : 2)} million` : money(v)); // a long number would break across two lines in its column
const RATES = [0.03, 0.035, 0.04, 0.045, 0.05], LEFT = [0, 100000, 250000, 500000];
// What stays while the screen is redrawn: the answers (by plan), what is open, the sort and the filter.
const kept = { key: null, rows: new Map(), open: false, families: new Set(), about: new Set(), sort: '', dir: 'best', filter: 'all', timer: null };

const picksOf = s => ({ pins: [], custom: { ...WAY_CUSTOM_DEFAULT }, left: 0, leftAge: null, ...(s.compare || {}) });
const waysOf = P => waysFor(P.custom).map(w => (w.rule === 'dwz' ? { ...w, target: P.left, targetAge: P.leftAge } : w));

// What each cell says. A row still being worked out says so; nothing is shown as zero.
function wordsOf(r) {
  const cut = r.deepest == null ? null : Math.round((1 - r.deepest) * 100);
  return { first: `${money(r.first / 12)} a month`, firstSub: `${money(r.first)} a year`, random: `${r.randomOk.toLocaleString('en-US')} of ${r.randomRuns.toLocaleString('en-US')}`, real: `${r.ok} of ${r.n}`,
    drop: r.worstYear == null ? 'No start year fits' : `${r.worstYear}: ${r.worstRanOut != null ? `money short at ${r.worstRanOut}` : r.drop >= WAY_CUT_LINE ? 'no cut' : `lowest year pays ${pct(r.drop)}`}`,
    deepest: cut == null ? 'No start year lasted' : cut < 1 ? 'No cut' : `${cut}% down`, cuts: `${r.cuts} of ${r.years}`, end: brief(r.end),
    stopAge: r.stopAge === undefined ? 'Working it out' : r.stopAge == null ? 'No age to 80' : `Age ${r.stopAge}` };
}

// save(compare): keeps the pins and picks beside the plan. It does not redraw the screen: a pin or a pick only repaints
// this card, so the rows already worked out stay.
export function waysCard({ L, ref, hist, s, save, chip, btn }) {
  const life = L, planKey = JSON.stringify([L.x, L.ssYearly, L.settings?.stocks, L.settings?.target]);
  let P = picksOf(s), ways = waysOf(P);
  const rekey = () => { const key = JSON.stringify([planKey, P.custom, P.left, P.leftAge]); if (kept.key !== key) { kept.key = key; kept.rows = new Map(); } };
  rekey();
  clearTimeout(kept.timer); kept.timer = null; // a redraw makes a new card: the old card's turn in the queue is dropped
  const setPicks = patch => { P = { ...P, ...patch }; ways = waysOf(P); save(P); rekey(); paint(); };
  const card = h('div.st-card', { id: 'ways' }, h('div.st-eyebrow', {}, 'Compare the ways'), h('h2', {}, 'Every way to take money out, side by side'),
    h('p.st-soft.st-small', {}, `The same plan each time: your money, your spending, stopping at ${life.age}, Social Security and taxes. Only the way the money comes out changes.`));
  const body = h('div');
  const fold = h('details.st-fold.st-stmt', { open: kept.open ? true : null, onToggle: e => { kept.open = e.target.open; if (kept.open) paint(); else { body.replaceChildren(); clearTimeout(kept.timer); kept.timer = null; } } }, h('summary', {}, 'Open the comparison'), body);
  card.append(fold);

  const firstOf = fam => ways.find(w => w.family === fam);
  const shown = () => ways.filter(w => w === firstOf(w.family) || kept.families.has(w.family) || P.pins.includes(w.id));
  const rowOf = w => kept.rows.get(w.id) ?? null;

  // Work the rows out one at a time, so the page stays live: first each row's numbers, then each row's stop age.
  function next() {
    kept.timer = null;
    if (!kept.open || !card.isConnected) return;
    const list = shown(), todo = list.find(w => !rowOf(w)) ?? list.find(w => rowOf(w) && !rowOf(w).off && rowOf(w).stopAge === undefined);
    if (!todo) return;
    const have = rowOf(todo);
    kept.rows.set(todo.id, have ? { ...have, stopAge: stopAgeFor(life, ref, hist, todo) } : compareRow(life, ref, hist, todo, { stopAge: false }));
    paint();
  }
  const queue = () => { if (kept.timer == null && shown().some(w => !rowOf(w) || (!rowOf(w).off && rowOf(w).stopAge === undefined))) kept.timer = setTimeout(next, 30); };

  const about = (id, name, text) => { const p = h('p.st-small.st-soft.st-wayabout', { hidden: kept.about.has(id) ? null : true }, text);
    return [h('button.st-wayinfo', { type: 'button', 'aria-label': `About ${name}`, title: `About ${name}`, 'aria-expanded': kept.about.has(id) ? 'true' : 'false', onClick: e => { if (kept.about.has(id)) kept.about.delete(id); else kept.about.add(id); p.hidden = !kept.about.has(id); e.currentTarget.setAttribute('aria-expanded', String(!p.hidden)); } }, 'i'), p]; };

  function rowEl(w, { pinned = false } = {}) {
    const r = rowOf(w), on = P.pins.includes(w.id), [info, text] = about(`w:${w.id}`, w.name, `${w.plain} From: ${w.by}.`);
    const name = h('div.st-waycell.name', {}, h('div.st-wayname', {}, h('strong', {}, w.name), info), pinned ? h('div.st-small.st-soft', {}, WAY_FAMILIES.find(f => f.id === w.family)?.name ?? '') : null, text);
    const pin = h('div.st-waycell.pin', {}, btn(on ? 'Unpin' : 'Pin', () => setPicks({ pins: wayPin(P.pins, w.id) }), on ? 'slim primary' : 'slim'));
    if (!r) return h('div.st-wayrow.wait', {}, name, h('div.st-waycell.wide.st-soft', { role: 'status' }, 'Working it out: 1,000 shuffled markets and every real start year.'), pin);
    if (r.off) return h('div.st-wayrow.off', {}, name, h('div.st-waycell.wide.st-soft', {}, r.off));
    const t = wordsOf(r), cell = (col, label, big, sub) => h(`div.st-waycell.${col}`, { 'data-label': label }, h('span.st-waylabel', {}, label), h('span.st-waynum', {}, big), sub ? h('span.st-small.st-soft', {}, sub) : null);
    return h(`div.st-wayrow${on ? '.on' : ''}`, {}, name,
      cell('first', 'Year one', t.first, t.firstSub), cell('random', 'Random markets that work', t.random), cell('real', 'Real start years that work', t.real), cell('drop', 'Hardest start year', t.drop),
      cell('deepest', 'Deepest cut', t.deepest), cell('cuts', 'Years with a cut', t.cuts, 'in the hardest start'), cell('end', 'Left at the end', t.end), cell('stopAge', 'Work can stop', t.stopAge), pin,
      h('details.st-fold.st-waymath', {}, h('summary', {}, 'Show the math'), h('ul.st-small', {}, wayMath(r, money, hist.source).map(line => h('li', {}, line)))));
  }

  function paint() {
    if (!kept.open) return;
    const done = shown().map(rowOf).filter(Boolean), flat = !!kept.sort || kept.filter !== 'all';
    const pins = P.pins.map(id => ways.find(w => w.id === id)).filter(Boolean);
    const parts = [];
    // the pinned rows, and the chart
    parts.push(pins.length ? h('div', {}, h('h3', {}, `Pinned (${pins.length} of 3)`), h('div.st-waylist.pins', {}, pins.map(w => rowEl(w, { pinned: true })))) : h('p.st-small.st-soft', {}, 'Pin up to 3 ways. They move here, side by side, and the chart draws one line for each.'));
    const chartWays = pins.length ? pins : ['steady-4', 'guard'].map(id => ways.find(w => w.id === id));
    const C = worstChart(life, ref, hist, chartWays, rowOf(chartWays[0])?.worstYear ?? null), pic = waysChart(C.lines, C.year);
    if (pic) parts.push(h('div.st-waychart', {}, h('h3', {}, `Spending each month if work had stopped in ${C.year}`), h('p.st-small.st-soft', {}, `${C.year === 1966 ? 'The long inflation after 1966 is the hardest stretch on record for steady spending.' : 'Your plan is longer than the years on record after 1966, so this is the hardest start year of the first row.'} ${pins.length ? 'One line for each pinned row.' : 'Two rows to start with: the 4% rule and guardrails. Pin rows to change the lines.'} Today's dollars.`), pic));
    // filter and sort
    parts.push(h('div.st-wayctl', {}, h('h3', {}, 'Show'), h('div.st-chips', {}, WAY_FILTERS.map(f => chip(f.name, kept.filter === f.id, () => { kept.filter = f.id; paint(); }))),
      h('details.st-fold', { open: kept.sort ? true : null }, h('summary', {}, kept.sort ? `Sorted by: ${WAY_COLUMNS.find(c => c.id === kept.sort)?.name}` : 'Sort by a column'),
        h('div.st-chips', {}, chip('By family', !kept.sort, () => { kept.sort = ''; paint(); }), WAY_COLUMNS.map(c => chip(`${c.name}${kept.sort === c.id ? (kept.dir === 'best' ? ' ↓' : ' ↑') : ''}`, kept.sort === c.id, () => { kept.dir = kept.sort === c.id && kept.dir === 'best' ? 'other' : 'best'; kept.sort = c.id; paint(); }))),
        h('p.st-small.st-soft', {}, 'Tap a column again to turn the order round.'))));
    // the rows: by family, or one flat list when a sort or a filter is on
    const head = h('div.st-wayrow.head', { 'aria-hidden': 'true' }, h('div.st-waycell.name', {}, 'Way'), WAY_COLUMNS.map(c => h(`div.st-waycell.${c.id}`, {}, { first: 'Year one', random: 'Random markets that work', real: 'Real start years that work', drop: 'Hardest start year', deepest: 'Deepest cut', cuts: 'Years with a cut', end: 'Left at the end', stopAge: 'Work can stop' }[c.id])), h('div.st-waycell.pin', {}, ''));
    const list = h('div.st-waylist', {}, head);
    if (flat) {
      const ready = shown().filter(w => rowOf(w)), order = (kept.sort ? waySort(wayFilter(ready.map(rowOf), kept.filter), kept.sort, kept.dir) : wayFilter(ready.map(rowOf), kept.filter)).map(r => ways.find(w => w.id === r.id));
      const waiting = shown().filter(w => !rowOf(w));
      if (!order.length && !waiting.length) list.append(h('p.st-small', {}, 'No way on the screen fits this filter. Tap "All", or open the variants of a family.'));
      for (const w of [...order, ...waiting]) list.append(rowEl(w));
    } else {
      for (const f of WAY_FAMILIES) {
        const all = ways.filter(w => w.family === f.id), [info, text] = about(`f:${f.id}`, f.name, `${f.plain} From: ${f.by}.`);
        list.append(h('div.st-wayfam', {}, h('h3', {}, f.name, info), text));
        for (const w of all.filter((x, i) => i === 0 || kept.families.has(f.id))) list.append(rowEl(w));
        if (all.length > 1) list.append(h('div.st-wayfam', {}, btn(kept.families.has(f.id) ? 'Hide variants' : `Show variants (${all.length - 1})`, () => { if (kept.families.has(f.id)) kept.families.delete(f.id); else kept.families.add(f.id); paint(); }, 'slim')));
      }
    }
    parts.push(list);
    if (flat) parts.push(h('p.st-small.st-soft', {}, 'The list shows the rows on the screen. To add more, tap "All" and "By family", then "Show variants".'));
    const mean = wayMeaning([...kept.rows.values()], P.pins, v => money(v));
    if (mean) parts.push(h('p.st-waymean', {}, h('strong', {}, 'What this means for you. '), mean));
    // the two ways with settings of their own
    const C0 = P.custom, mine = wayCustom(C0), ratePct = Math.round(C0.rate * 10000) / 100, rateOut = h('b', {}, `${ratePct}%`);
    const setCustom = patch => setPicks({ custom: { ...C0, ...patch } });
    const setRate = v => { const n = Number(v); if (Number.isFinite(n)) setCustom({ rate: Math.round(Math.min(10, Math.max(1, n)) * 100) / 10000 }); };
    parts.push(h('details.st-fold.st-stmt', { open: C0.kind !== WAY_CUSTOM_DEFAULT.kind || C0.rate !== WAY_CUSTOM_DEFAULT.rate || C0.timing !== 'start' || C0.horizon ? true : null }, h('summary', {}, 'Build your own way'), h('div.st-waycustom', {},
      h('h3', {}, 'The family'), h('div.st-chips', {}, WAY_CUSTOM_KINDS.map(k => chip(k[1], C0.kind === k[0], () => setCustom({ kind: k[0] })))),
      mine.usesRate ? [h('h3', {}, 'The share in year one: ', rateOut), h('input', { type: 'range', min: 2, max: 7, step: 0.05, value: String(ratePct), 'aria-label': 'The share in year one, in percent', onInput: e => { rateOut.textContent = `${Number(e.target.value)}%`; }, onChange: e => setRate(e.target.value) }),
        h('div.st-chips', {}, RATES.map(v => chip(`${Math.round(v * 1000) / 10}%`, C0.rate === v, () => setCustom({ rate: v })))),
        h('label.st-waytype', {}, h('span.st-small', {}, 'Or type a percent'), h('input', { type: 'number', inputMode: 'decimal', min: 1, max: 10, step: 0.05, value: String(ratePct), onChange: e => setRate(e.target.value) })),
        h('p.st-small.st-soft', {}, 'From 1 to 10.')] : h('p.st-small.st-soft', {}, 'This family starts at what your life costs, so there is no rate to pick.'),
      h('h3', {}, 'When the money comes out'), h('div.st-chips', {}, WAY_TIMINGS.map(t => chip(t.name, C0.timing === t.id, () => setCustom({ timing: t.id })))),
      h('h3', {}, 'For how many years'), h('div.st-chips', {}, chip('To the end of your plan', !C0.horizon, () => setCustom({ horizon: null })), WAY_HORIZONS.map(v => chip(`${v} years`, C0.horizon === v, () => setCustom({ horizon: v })))))));
    parts.push(h('details.st-fold.st-stmt', { open: P.left || P.leftAge ? true : null }, h('summary', {}, 'Die With Zero: the amount and the age'), h('div.st-waycustom', {},
      h('h3', {}, 'How much should be left, in today\'s dollars'), h('div.st-chips', {}, LEFT.map(v => chip(v ? fmt0.money(v) : 'Nothing', P.left === v, () => setPicks({ left: v })))),
      h('h3', {}, 'At what age'), h('div.st-chips', {}, chip(`The end of your plan (${life.x.planAge})`, !P.leftAge, () => setPicks({ leftAge: null })), [80, 85].filter(a => a > life.age && a < life.x.planAge).map(a => chip(`Age ${a}`, P.leftAge === a, () => setPicks({ leftAge: a })))),
      h('p.st-small.st-soft', {}, 'After that age, this way spends the growth and keeps the amount.'))));
    parts.push(h('details.st-fold', {}, h('summary', {}, 'How these numbers are worked out'), h('ul.st-small', {},
      ['Each row is your whole lifetime plan, with its taxes and its three kinds of account, run again with one way of taking money out.',
        'Year one: what the way pays in the first year after work stops, on a smooth market.',
        `Real start years: work stops in that year and the real years follow in order, ${pct(life.settings.stocks)} stocks and the rest bonds, after inflation. Only start years with enough years after them count.`,
        'Random markets: the real years in a random order, 1,000 times, with a fixed seed. Each drawn year keeps its own stocks, bonds, inflation, CAPE and yields together.',
        `A start year works when the money lasts and no year pays under the share the way tolerates (its math says which). A year counts as a cut when it pays under ${Math.round(WAY_CUT_LINE * 1000) / 10}% of what the way aims to pay.`,
        'Cash in the bucket ways earns 0% after inflation: it keeps pace with prices.',
        `History: ${hist.source}. The past is not a forecast.`].map(line => h('li', {}, line)))));
    if (done.some(r => !r.off)) parts.push(h('div.st-row', {}, btn('Download the table as a spreadsheet', () => { const blob = new Blob([compareCsv([...kept.rows.values()], hist.source)], { type: 'text/csv' }), a = h('a', { href: URL.createObjectURL(blob), download: 'compare-the-ways.csv' }); document.body.append(a); a.click(); a.remove(); }, 'slim'), h('span.st-small.st-soft', {}, 'Every row worked out so far, with its math, as a file Excel and Google Sheets open.')));
    body.replaceChildren(...parts);
    queue();
  }
  if (kept.open) paint();
  return card;
}
