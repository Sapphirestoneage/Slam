// SPDX-License-Identifier: AGPL-3.0-only
// What it is / What it could be (run A, Nov 27 2026): the two numbers of the front door and the layer chart behind
// them. "What it is" is the standard FI number (a year of spending divided by the withdrawal rate: 25 times at 4%) and
// the age the investments reach it at today's saving pace. "What it could be" is the same number after the things a
// person chose to count (Social Security, other steady income, a spending shape, and the two costs the 25 times rule
// leaves out: health insurance before 65 and tax on traditional withdrawals). With nothing counted the two are equal.
// The layer chart is one year-by-year run from today to 95: what the year costs (needs, wants, health insurance before
// 65, tax on traditional withdrawals) and what pays for it (work, the four kinds of account, Social Security, other
// steady income), with what is left over as "not covered yet". In every year the layers plus the gap equal the line.
// Pure: plain numbers in, plain numbers out, no profile, no screen, today's dollars. The one year on one pile is wayPay
// of withdraw.js. The game cannot load a module, so tools/game_paylayers_build.mjs writes this file again as a plain
// script (game/core/paylayers.js); a test in each suite fails when the copy is stale. tools/audit/engine2.py works every
// number here out a second time (docs/AUDIT.md).
import { wayPay } from './withdraw.js';

// The chart ends at this age.
export const LY_END = 95;
// Medicare starts at 65: health insurance of your own is a cost from the year work stops until then.
export const LY_MEDICARE = 65;
// The income layers, in the order they stack. "inv" is the four accounts together.
export const LY_LAYERS = [
  { id: 'work', name: 'Work', what: 'Take-home pay from work, until the age work becomes optional.' },
  { id: 'inv', name: 'Investments', what: 'Money you take out of what you have invested.' },
  { id: 'ss', name: 'Social Security', steady: true, what: 'A monthly payment for life, from the age you claim it.' },
  { id: 'other', name: 'Other', steady: true, what: 'Other steady income: a pension, rent, retirement income you already get.' },
];
// The four kinds of account, in the order the money comes out (the order of the web app's lifetime plan after 59 and a
// half: taxable, traditional, Roth). The HSA pays for health insurance first, and for the rest last.
export const LY_ACCOUNTS = [
  { id: 'tax', name: 'Taxable', what: 'A regular investment account. You paid tax on this money before it went in.' },
  { id: 'pre', name: 'Traditional', what: 'A 401(k) or IRA that is taxed when you take money out.' },
  { id: 'roth', name: 'Roth', what: 'A Roth account. Money comes out with no tax.' },
  { id: 'hsa', name: 'HSA', what: 'A health savings account. It pays for health costs with no tax.' },
];
// The parts of the spending line.
export const LY_SPENDING = [
  { id: 'needs', name: 'Needs', what: 'Food, a place to live, getting around.' },
  { id: 'wants', name: 'Wants', what: 'Everything else you spend on.' },
  { id: 'health', name: 'Health insurance before 65', cost: true, what: 'A plan of your own from the year work stops until Medicare starts at 65.' },
  { id: 'wtax', name: 'Tax on traditional withdrawals', cost: true, what: 'Income tax on money you take out of a traditional 401(k) or IRA.' },
];
const LY_KEYS = ['tax', 'pre', 'roth', 'hsa'];
const lyNum = v => (Number.isFinite(v) ? v : 0);

// The spending shape at an age: bands = [{ from, f }] (from this age on, spending is f times today's). No bands: 1.
export function lyShapeAt(bands, age) {
  let f = 1;
  for (const b of (bands || []).slice().sort((a, b) => a.from - b.from)) if (age >= b.from) f = b.f;
  return f;
}
// Steady income in the year of an age: { ss, other }, before any is used.
export function lySteadyAt(p, age) {
  const off = p.off || {};
  const ss = p.ss && !off.ss && age >= p.ss.age ? lyNum(p.ss.year) : 0;
  const other = off.other ? 0 : (p.other || []).reduce((s, o) => s + (age >= (o.from ?? 0) && (o.to == null || age < o.to) ? lyNum(o.year) : 0), 0);
  return { ss, other };
}
// Health insurance of your own in the year of an age: from the year work stops (by the plan) until `until`.
export function lyHealthAt(p, age) {
  const h = p.health;
  if (!h || !(h.year > 0)) return 0;
  return (p.stop == null || age >= p.stop) && age < (h.until ?? LY_MEDICARE) ? h.year : 0;
}
// Take `need` from the accounts. cap: what each can pay this year. first: an account to use before the others.
function lyDraw(cap, need, first) {
  const out = { tax: 0, pre: 0, roth: 0, hsa: 0 };
  let left = need;
  for (const k of first ? [first, ...LY_KEYS.filter(x => x !== first)] : LY_KEYS) {
    const v = Math.min(left, Math.max(0, cap[k] - out[k]));
    out[k] += v; left -= v;
  }
  return { out, left };
}

// THE YEAR-BY-YEAR RUN. p: { age, end, spend (a year), needsShare (0 to 1), shape (bands or null), workPay (take-home a
// year), save (invested a year while working), stop (the age work stops; null: it does not), bal { tax, pre, roth, hsa },
// saveTo (shares of `save` by account), grow (growth a year while working), draw (growth a year once work has stopped),
// ss { year, age }, other [{ year, from, to }], health { year, until }, tax (a function: ordinary income of a year to
// its tax; null: none), off { work, tax, pre, roth, hsa, ss, other } (layers switched off) }.
// Returns one row for each age: the parts of the line (needs, wants, health, wtax, line), the layers that pay
// (work, tax, pre, roth, hsa, inv, ss, other), the gap, and what steady income there is (steady, needsMet).
export function lyYears(p) {
  const off = p.off || {}, end = p.end ?? LY_END, share = Math.min(1, Math.max(0, p.needsShare ?? 0));
  const bal = Object.fromEntries(LY_KEYS.map(k => [k, Math.max(0, lyNum((p.bal || {})[k]))]));
  const to = p.saveTo || { pre: 1 }, rows = [];
  for (let age = p.age; age <= end; age++) {
    const planWork = p.stop == null || age < p.stop, working = planWork && !off.work, f = lyShapeAt(p.shape, age);
    const needs = lyNum(p.spend) * share * f, wants = lyNum(p.spend) * (1 - share) * f, health = lyHealthAt(p, age);
    const S = lySteadyAt(p, age), r = planWork ? lyNum(p.grow) : lyNum(p.draw);
    const cap = Object.fromEntries(LY_KEYS.map(k => [k, off[k] ? 0 : bal[k] * (1 + r)]));
    const base = needs + wants + health;
    // steady income first (it meets the needs first), then work, then the accounts
    const pay = wtax => {
      let left = base + wtax;
      const ss = Math.min(S.ss, left); left -= ss;
      const other = Math.min(S.other, left); left -= other;
      const work = Math.min(working ? lyNum(p.workPay) : 0, left); left -= work;
      // the HSA pays the health insurance first; the other accounts in their order
      const forHealth = Math.min(left, health, cap.hsa), rest = lyDraw({ ...cap, hsa: cap.hsa - forHealth }, left - forHealth);
      rest.out.hsa += forHealth;
      return { ss, other, work, out: rest.out, gap: rest.left };
    };
    // the tax on the traditional money is part of the year's cost, so it is found by going round until it settles
    let wtax = 0, P = pay(0);
    if (typeof p.tax === 'function') for (let i = 0; i < 60; i++) {
      const t = Math.max(0, lyNum(p.tax(P.out.pre)));
      if (Math.abs(t - wtax) < 1e-7) break;
      wtax = t; P = pay(wtax);
    }
    for (const k of LY_KEYS) {
      const add = working ? lyNum(p.save) * lyNum(to[k]) : 0;
      bal[k] = off[k] ? bal[k] * (1 + r) + add : wayPay(bal[k], P.out[k], r, 'end').p + add;
    }
    const inv = P.out.tax + P.out.pre + P.out.roth + P.out.hsa, steady = S.ss + S.other;
    rows.push({ age, working, planWork, needs, wants, health, wtax, line: base + wtax, work: P.work, tax: P.out.tax, pre: P.out.pre, roth: P.out.roth, hsa: P.out.hsa, inv,
      ss: P.ss, other: P.other, gap: P.gap < 0.005 ? 0 : P.gap, steady, toNeeds: Math.min(P.ss + P.other, needs + health), needsMet: steady > 0 && steady >= needs + health - 0.005,
      left: bal.tax + bal.pre + bal.roth + bal.hsa });
  }
  return rows;
}
// The same rows as bars of `size` years: each number is the average of its years, so the layers plus the gap still
// equal the line. Each bar: { from, to, n, label, ...the averages }.
export function lyBars(rows, size = 5) {
  const out = [], sums = ['needs', 'wants', 'health', 'wtax', 'line', 'work', 'tax', 'pre', 'roth', 'hsa', 'inv', 'ss', 'other', 'gap', 'steady', 'toNeeds'];
  for (let i = 0; i < rows.length; i += size) {
    const g = rows.slice(i, i + size), b = { from: g[0].age, to: g[g.length - 1].age, n: g.length };
    for (const k of sums) b[k] = g.reduce((s, r) => s + r[k], 0) / g.length;
    b.label = b.from === b.to ? String(b.from) : b.from + '-' + b.to;
    b.gapYears = g.filter(r => r.gap > 0).length;
    out.push(b);
  }
  return out;
}
// The first age from which steady income (Social Security, other) meets the needs in every year to the end. null: none.
export function lyNeedsAge(rows) {
  let at = null;
  for (let i = rows.length - 1; i >= 0; i--) { if (!rows[i].needsMet) break; at = rows[i].age; }
  return at;
}
// What one layer does over the whole run: { total, years, from, to (the first and last age it pays), toNeeds }.
export function lyLayerSum(rows, id) {
  const hit = rows.filter(r => r[id] > 0.005);
  return { total: hit.reduce((s, r) => s + r[id], 0), years: hit.length, from: hit.length ? hit[0].age : null, to: hit.length ? hit[hit.length - 1].age : null,
    gapYears: rows.filter(r => r.gap > 0).length, gapTotal: rows.reduce((s, r) => s + r.gap, 0) };
}
// What is paid, as a share of the line, over the whole run (1 = every year is paid in full).
export function lyCoverage(rows) {
  const line = rows.reduce((s, r) => s + r.line, 0), gap = rows.reduce((s, r) => s + r.gap, 0);
  return { line, gap, paid: line - gap, share: line > 0 ? (line - gap) / line : 1 };
}

// THE TARGET AT AN AGE: what must be invested on the day work stops at `at`, so that it pays each year's line less the
// steady income to the end, and then keeps paying the last year's amount for good (the same promise as the 25 times
// rule). Each year is counted back at the rate `draw`. With flat spending and nothing else, this is spend / draw.
// preShare: the share of the money taken out that is traditional (for the tax); the tax of a year is found on it.
export function lyTarget(p, at) {
  const end = p.end ?? LY_END, r = lyNum(p.draw), q = { ...p, stop: at, off: {} };
  const net = age => {
    const f = lyShapeAt(p.shape, age), S = lySteadyAt(q, age), base = Math.max(0, lyNum(p.spend) * f + lyHealthAt(q, age) - S.ss - S.other);
    if (typeof p.tax !== 'function' || !(p.preShare > 0) || base <= 0) return base;
    let t = 0;
    for (let i = 0; i < 60; i++) { const n = Math.max(0, lyNum(p.tax((base + t) * p.preShare))); if (Math.abs(n - t) < 1e-7) break; t = n; }
    return base + t;
  };
  if (!(r > 0)) return null;
  let pv = 0, v = 1;
  for (let age = at; age <= end; age++) { v /= 1 + r; pv += net(age) * v; }
  return pv + (net(end) / r) * v;
}
// The investments after n working years: each year the pile grows and the year's saving goes in (the game's grow()).
export function lyPile(inv, save, grow, n) {
  for (let i = 0; i < n; i++) inv = inv * (1 + grow) + save;
  return inv;
}
// The params of "What it could be": p with only what was counted. counted: { ss: { share }, other, shape: { bands },
// health, wtax }. A layer that is switched off (p.off) is not counted.
export function lyCounted(p, counted) {
  const c = counted || {}, off = p.off || {};
  return { ...p, off: {},
    ss: c.ss && p.ss && !off.ss ? { ...p.ss, year: lyNum(p.ss.year) * (c.ss.share ?? 1) } : null,
    other: c.other && !off.other ? p.other : [],
    shape: c.shape ? c.shape.bands || null : null,
    health: c.health ? p.health : null,
    tax: c.wtax ? p.tax : null };
}
// THE TWO NUMBERS. Returns { is: { target, age, years }, could: { target, age, years }, counted (true when anything
// is), raisedBy (the costs that are counted) }. age: null when the saving pace does not get there in 80 years.
export function lyNumbers(p, counted) {
  const inv = LY_KEYS.reduce((s, k) => s + Math.max(0, lyNum((p.bal || {})[k])), 0), r = lyNum(p.draw);
  const first = target => { for (let n = 0; n <= 80; n++) if (lyPile(inv, lyNum(p.save), lyNum(p.grow), n) >= target(p.age + n)) return n; return null; };
  const isT = r > 0 ? lyNum(p.spend) / r : null, isN = isT == null ? null : first(() => isT);
  const is = { target: isT, years: isN, age: isN == null ? null : p.age + isN };
  const c = counted || {}, any = !!((c.ss && p.ss && !(p.off || {}).ss) || (c.other && (p.other || []).length && !(p.off || {}).other) || c.shape || (c.health && p.health) || (c.wtax && p.tax));
  if (!any || isT == null) return { is, could: { ...is }, counted: false, raisedBy: [] };
  const q = lyCounted(p, c), n = first(a => lyTarget(q, a));
  const could = { target: lyTarget(q, n == null ? (is.age ?? p.age) : p.age + n), years: n, age: n == null ? null : p.age + n };
  return { is, could, counted: true, raisedBy: ['health', 'wtax'].filter(k => (k === 'health' ? c.health && p.health : c.wtax && p.tax)) };
}
// The receipt of one change: dollars off the target and months sooner (a minus sign: the other way).
export function lyReceipt(before, after) {
  return { off: before.target == null || after.target == null ? null : before.target - after.target,
    months: before.age == null || after.age == null ? null : (before.age - after.age) * 12 };
}
