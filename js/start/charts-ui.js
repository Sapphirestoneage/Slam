// SPDX-License-Identifier: AGPL-3.0-only
// The journey's four pictures, drawn as plain SVG from the points js/charts.js returns (no chart library, so they load
// instantly on a phone and work offline). Every picture has its numbers in words beside it; color is never the only cue.
import { h } from '../ui/dom.js';
import { fmt as fmt0 } from '../math/result.js';
const fmt = { ...fmt0, pct: v => fmt0.pct(v).replace(/\.0%$/, '%') }; // 22%, not 22.0%: a whole percent reads as one

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, ...kids) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v); for (const k of kids.flat(Infinity)) if (k != null) el.append(k); return el; };
const short = v => (Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`);
const money = v => fmt.money(Math.round(v));
const svg = (w, ht, label, ...kids) => s('svg', { viewBox: `0 0 ${w} ${ht}`, role: 'img', 'aria-label': label, class: 'st-chart', preserveAspectRatio: 'xMidYMid meet' }, ...kids);
const legend = items => h('div.st-legend', {}, items.map(([cls, text]) => h('span', {}, h(`i.${cls}`), text)));

// ---------- growth over time: what you put in, with what growth adds on top, and the FI line ----------
export function growthChart(g, { onPick = null } = {}) {
  const W = 360, H = 250, L = 44, R = 10, T = 14, B = 28, rows = g.rows;
  const top = Math.max(g.target, rows.at(-1).total) * 1.06, n = rows.length - 1;
  const X = i => L + (W - L - R) * (n ? i / n : 0), Y = v => T + (H - T - B) * (1 - v / top);
  const area = f => `M${X(0)},${Y(0)} ${rows.map((r, i) => `L${X(i)},${Y(f(r))}`).join(' ')} L${X(n)},${Y(0)} Z`;
  const ticks = [0.25, 0.5, 0.75, 1].map(t => top / 1.06 * t);
  const every = Math.max(1, Math.ceil(n / 4));
  const mark = s('line', { x1: X(n), x2: X(n), y1: T, y2: H - B, class: 'st-c-cursor' });
  const out = h('p.st-readout', { role: 'status' });
  const read = i => { const r = rows[i]; mark.setAttribute('x1', X(i)); mark.setAttribute('x2', X(i)); out.replaceChildren(h('strong', {}, `${r.year}${r.age != null ? `, age ${r.age}` : ''}: ${money(r.total)}. `), `You put in ${money(r.put)}. Growth added ${money(r.grown)}.`); onPick?.(r); };
  const chart = svg(W, H, `Investments growing from ${money(rows[0].total)} to ${money(rows.at(-1).total)} by ${rows.at(-1).year}`,
    ticks.map(t => [s('line', { x1: L, x2: W - R, y1: Y(t), y2: Y(t), class: 'st-c-grid' }), s('text', { x: L - 6, y: Y(t) + 4, class: 'st-c-axis', 'text-anchor': 'end' }, short(t))]),
    s('path', { d: area(r => r.total), class: 'st-c-grown' }), s('path', { d: area(r => r.put), class: 'st-c-put' }),
    s('line', { x1: L, x2: W - R, y1: Y(g.target), y2: Y(g.target), class: 'st-c-target' }),
    s('text', { x: L + 6, y: Y(g.target) - 6, class: 'st-c-label' }, `Your freedom number: ${money(g.target)}`),
    (g.marks || []).map(([v, label]) => [s('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: 'st-c-grid st-c-mark' }), s('text', { x: W - R - 4, y: Y(v) - 4, class: 'st-c-axis', 'text-anchor': 'end' }, `${label}: ${short(v)}`)]),
    rows.map((r, i) => (i % every === 0 || i === n ? s('text', { x: X(i), y: H - 8, class: 'st-c-axis', 'text-anchor': i === n ? 'end' : 'middle' }, String(r.year)) : null)),
    mark);
  const slider = h('input', { type: 'range', min: 0, max: n, step: 1, value: String(n), 'aria-label': 'Pick a year', onInput: e => read(Number(e.target.value)) });
  read(n);
  return h('div', {}, chart, legend([['put', 'What you put in'], ['grown', 'What growth adds'], ['target', 'Your freedom number']]), h('label.st-small.st-soft', {}, 'Drag to any year'), slider, out);
}

// ---------- where the money goes: one band from your pay to each place it lands ----------
export function flowChart(f) {
  const W = 360, row = 30, gap = 8, parts = f.parts.filter(p => !p.short), H = Math.max(200, parts.length * (row + gap) + 20);
  const total = f.total, x0 = 4, w0 = 18, x1 = 84, usable = H - 20 - gap * (parts.length - 1);
  let yL = 10, yR = 10;
  const bands = parts.map(p => {
    const hL = usable * (p.amount / total) * 0.999, hR = Math.max(4, hL);
    const a = yL, b = yR; yL += hL; yR += hR + gap;
    const mid = (x0 + w0 + x1) / 2;
    return [s('path', { d: `M${x0 + w0},${a} C${mid},${a} ${mid},${b} ${x1},${b} L${x1},${b + hR} C${mid},${b + hR} ${mid},${a + hL} ${x0 + w0},${a + hL} Z`, class: `st-c-band k-${p.kind}` }),
      s('rect', { x: x1, y: b, width: 10, height: hR, class: `st-c-node k-${p.kind}` }),
      s('text', { x: x1 + 16, y: b + hR / 2 + 5, class: 'st-c-label' }, `${p.label}: ${money(p.amount)} (${Math.round(p.amount / total * 100)}%)`)];
  });
  const short = f.parts.find(p => p.short);
  return h('div', {}, svg(W, yR + 4, `Where ${money(total)} a month goes`, s('rect', { x: x0, y: 10, width: w0, height: yL - 10, class: 'st-c-node k-pay' }), bands),
    h('p.st-readout', {}, h('strong', {}, `${f.from}: ${money(total)} a month. `), short ? `Spending runs ${money(short.amount)} past take-home.` : f.split ? '' : 'Answer "Where it goes" in Sharpen it to split spending into housing, food and getting around.'));
}

// ---------- debt payoff: each balance falling to zero ----------
export function debtChart(d, monthWords) {
  const W = 360, H = 210, L = 44, R = 10, T = 12, B = 28, n = d.months, top = Math.max(...d.total) * 1.05 || 1;
  const X = k => L + (W - L - R) * (n ? k / n : 0), Y = v => T + (H - T - B) * (1 - v / top);
  const line = pts => pts.map((v, k) => `${k ? 'L' : 'M'}${X(k)},${Y(v)}`).join(' ');
  const ticks = [0.5, 1].map(t => top / 1.05 * t), yrs = Math.max(1, Math.ceil(n / 12 / 5));
  return h('div', {}, svg(W, H, `Debt falling from ${money(d.total[0])} to zero in ${n} months`,
    ticks.map(t => [s('line', { x1: L, x2: W - R, y1: Y(t), y2: Y(t), class: 'st-c-grid' }), s('text', { x: L - 6, y: Y(t) + 4, class: 'st-c-axis', 'text-anchor': 'end' }, short(t))]),
    s('path', { d: `${line(d.total)} L${X(n)},${Y(0)} L${X(0)},${Y(0)} Z`, class: 'st-c-debtarea' }),
    d.debts.map((x, i) => s('path', { d: line(x.points), class: `st-c-debtline n${i % 4}` })),
    Array.from({ length: Math.floor(n / 12 / yrs) + 1 }, (_, i) => s('text', { x: X(Math.min(n, i * yrs * 12)), y: H - 8, class: 'st-c-axis', 'text-anchor': i ? 'middle' : 'start' }, i ? `${i * yrs} yr` : 'Today'))),
    h('ul.st-list', {}, d.debts.map((x, i) => h('li', {}, h(`span.st-swatch.n${i % 4}`), h('span', {}, x.name, h('small', {}, `${money(x.points[0])} today`)), h('span.when', {}, x.paidOff != null ? `Gone ${monthWords(x.paidOff)}` : 'Past 30 years')))),
    d.interest != null ? h('p.st-readout', {}, h('strong', {}, `Interest along the way: ${money(d.interest)}.`)) : null);
}

// ---------- the timeline: every milestone ahead, placed by date ----------
export function timelineChart(t) {
  const W = 360, H = 64, L = 14, R = 14, y = 24;
  const X = at => L + (W - L - R) * Math.sqrt(at); // near dates get room: the first years are where the wins are
  return h('div', {}, svg(W, H, `${t.points.length} milestones over the next ${Math.round(t.span / 12)} years`,
    s('line', { x1: L, x2: W - R, y1: y, y2: y, class: 'st-c-rail' }), s('circle', { cx: L, cy: y, r: 6, class: 'st-c-now' }), s('text', { x: L, y: y + 26, class: 'st-c-axis' }, 'Today'),
    t.points.map((p, i) => [s('circle', { cx: X(p.at), cy: y, r: 11, class: 'st-c-dot' }), s('text', { x: X(p.at), y: y + 4, class: 'st-c-dotn', 'text-anchor': 'middle' }, String(i + 1))])),
    h('ol.st-list', {}, t.points.map((p, i) => h('li', {}, h('span.dot', {}, i + 1), h('span', {}, p.name), h('span.when', {}, p.date)))),
    t.done.length ? h('p.st-readout', {}, h('strong', {}, `Already done: `), t.done.join(', '), '.') : null);
}

// ---------- whole life: the three kinds of money, stacked, from today to the plan's last year ----------
export function lifeChart(run, retireAge) {
  const W = 360, H = 250, L = 44, R = 10, T = 14, B = 28, rows = run.years, n = rows.length - 1;
  const top = Math.max(...rows.map(r => r.total), 1) * 1.06;
  const X = i => L + (W - L - R) * (n ? i / n : 0), Y = v => T + (H - T - B) * (1 - v / top);
  const area = f => `M${X(0)},${Y(0)} ${rows.map((r, i) => `L${X(i)},${Y(f(r))}`).join(' ')} L${X(n)},${Y(0)} Z`;
  const at = rows.findIndex(r => r.age === retireAge), every = Math.max(1, Math.ceil(n / 5));
  const mark = s('line', { x1: X(Math.max(0, at)), x2: X(Math.max(0, at)), y1: T, y2: H - B, class: 'st-c-cursor' });
  const out = h('p.st-readout', { role: 'status' });
  const read = i => { const r = rows[i]; mark.setAttribute('x1', X(i)); mark.setAttribute('x2', X(i));
    out.replaceChildren(h('strong', {}, `Age ${r.age}: ${money(r.total)}. `), r.phase === 'work' ? `Still working. ${money(r.saved)} goes in this year.`
      : `You spend ${money(r.spend)}.${r.ss ? ` Social Security pays ${money(r.ss)}.` : ''}${r.earned ? ` Work pays ${money(r.earned)}.` : ''} ${money(r.withdraw)} comes out of your accounts${r.tax > 0.5 ? `, ${money(r.tax)} of it for tax` : ''}.${r.convert ? ` ${money(r.convert)} moves to Roth.` : ''}${r.short ? ` Short by ${money(r.short)}.` : ''}`); };
  const chart = svg(W, H, `Your money from age ${rows[0].age} to ${rows[n].age}`,
    [0.25, 0.5, 0.75, 1].map(t => top / 1.06 * t).map(t => [s('line', { x1: L, x2: W - R, y1: Y(t), y2: Y(t), class: 'st-c-grid' }), s('text', { x: L - 6, y: Y(t) + 4, class: 'st-c-axis', 'text-anchor': 'end' }, short(t))]),
    s('path', { d: area(r => r.taxable + r.pretax + r.roth), class: 'st-c-roth' }), s('path', { d: area(r => r.taxable + r.pretax), class: 'st-c-pretax' }), s('path', { d: area(r => r.taxable), class: 'st-c-taxable' }),
    at >= 0 ? [s('line', { x1: X(at), x2: X(at), y1: T, y2: H - B, class: 'st-c-target' }), s('text', { x: X(at) + (at > n * 0.7 ? -6 : 6), y: T + 10, class: 'st-c-label', 'text-anchor': at > n * 0.7 ? 'end' : 'start' }, `Work optional: ${retireAge}`)] : null,
    rows.map((r, i) => (i % every === 0 || i === n ? s('text', { x: X(i), y: H - 8, class: 'st-c-axis', 'text-anchor': i === n ? 'end' : i ? 'middle' : 'start' }, String(r.age)) : null)),
    mark);
  const slider = h('input', { type: 'range', min: 0, max: n, step: 1, value: String(Math.max(0, at)), 'aria-label': 'Pick an age', onInput: e => read(Number(e.target.value)) });
  read(Math.max(0, at));
  return h('div', {}, chart, legend([['taxable', 'Reachable any time'], ['pretax', 'Taxed later'], ['roth', 'Never taxed again']]), h('label.st-small.st-soft', {}, 'Drag to any age'), slider, out);
}
