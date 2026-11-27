/* ============================================================================
   SLAM the Game: core/paylayers.js
   PURPOSE     What it is / What it could be: the standard FI number and its age, the same number after
               the things a player counted, and the year-by-year run of the layer chart from today to
               95 (what each year costs, which layer pays for it, and what is not covered yet).
   INPUT       Plain numbers from the caller (features/couldbe.js makes them from the profile). It
               reads no profile and no screen.
   OUTPUT      24 functions and constants: LY_END, LY_MEDICARE, LY_LAYERS, LY_ACCOUNTS, LY_SPENDING, lyShapeAt, lyShapeBands, 
               lySteadyAt, lyHealthAt, lyEndsAt, lyYears, lyBars, lyNeedsAge, lyLayerSum, 
               lyCoverage, lyLifetime, lyTarget, lyShares, lyPile, lyCounted, lyFlex, lyNumbers, 
               lyReceipt, lyTaxPlan
   DEPENDS ON  core/withdraw.js (wayPay: one year on one pile).
   RULES       GENERATED FILE. Do not edit it. It is a copy of js/math/paylayers.js of the main app.
               tools/game_paylayers_build.mjs makes it. Change the source, then run the tool.
               Prettier does not format this file (.prettierignore).
   SOURCE-HASH  71c661c0763edec2
   ========================================================================= */
// What it is / What it could be (run A, Nov 27 2026): the two numbers of the front door and the layer chart behind
// them. "What it is" is the standard FI number (a year of spending divided by the withdrawal rate: 25 times at 4%) and
// the age the investments reach it at today's saving pace. "What it could be" is the same number after the things a
// person chose to count (Social Security, other steady income, a spending shape, and the two costs the 25 times rule
// leaves out: health insurance before 65 and tax on traditional withdrawals). With nothing counted the two are equal.
// lyLifetime is the lifetime spending total: what the years from today to 95 cost (Batch B, phase 1).
// lyTaxPlan is the plan for the tax on the way out (Batch B, phase 2a): fill the low tax space with traditional money
// each year, move the rest of that space to Roth, and take what is left from the taxable and Roth accounts.
// Batch B, phases 2b and 2c: a counted flexible way to take money out (flex: a higher starting rate than the 4% of the
// standard way, found by the caller from market history) sizes "What it could be" at that rate; a payment that ends
// (ends: a mortgage that is paid off) lowers the spending of each year from the age it ends.
// The layer chart is one year-by-year run from today to 95: what the year costs (needs, wants, health insurance before
// 65, tax on traditional withdrawals) and what pays for it (work, the four kinds of account, Social Security, other
// steady income), with what is left over as "not covered yet". In every year the layers plus the gap equal the line.
// Pure: plain numbers in, plain numbers out, no profile, no screen, today's dollars. The one year on one pile is wayPay
// of withdraw.js. The game cannot load a module, so tools/game_paylayers_build.mjs writes this file again as a plain
// script (game/core/paylayers.js); a test in each suite fails when the copy is stale. tools/audit/engine2.py works every
// number here out a second time (docs/AUDIT.md).

// The chart ends at this age.
const LY_END = 95;
// Medicare starts at 65: health insurance of your own is a cost from the year work stops until then.
const LY_MEDICARE = 65;
// The income layers, in the order they stack. "inv" is the four accounts together.
const LY_LAYERS = [
  { id: 'work', name: 'Work', what: 'Take-home pay from work, until the age work becomes optional.' },
  { id: 'inv', name: 'Investments', what: 'Money you take out of what you have invested.' },
  { id: 'ss', name: 'Social Security', steady: true, what: 'A monthly payment for life, from the age you claim it.' },
  { id: 'other', name: 'Other', steady: true, what: 'Other steady income: a pension, rent, retirement income you already get.' },
];
// The four kinds of account, in the order the money comes out (the order of the web app's lifetime plan after 59 and a
// half: taxable, traditional, Roth). The HSA pays for health insurance first, and for the rest last.
const LY_ACCOUNTS = [
  { id: 'tax', name: 'Taxable', what: 'A regular investment account. You paid tax on this money before it went in.' },
  { id: 'pre', name: 'Traditional', what: 'A 401(k) or IRA that is taxed when you take money out.' },
  { id: 'roth', name: 'Roth', what: 'A Roth account. Money comes out with no tax.' },
  { id: 'hsa', name: 'HSA', what: 'A health savings account. It pays for health costs with no tax.' },
];
// The parts of the spending line.
const LY_SPENDING = [
  { id: 'needs', name: 'Needs', what: 'Food, a place to live, getting around.' },
  { id: 'wants', name: 'Wants', what: 'Everything else you spend on.' },
  { id: 'health', name: 'Health insurance before 65', cost: true, what: 'A plan of your own from the year work stops until Medicare starts at 65.' },
  { id: 'wtax', name: 'Tax on traditional withdrawals', cost: true, what: 'Income tax on money you take out of a traditional 401(k) or IRA.' },
];
const LY_KEYS = ['tax', 'pre', 'roth', 'hsa'];
const lyNum = v => (Number.isFinite(v) ? v : 0);

// The spending shape at an age: bands = [{ from, f }] (from this age on, spending is f times today's). No bands: 1.
function lyShapeAt(bands, age) {
  let f = 1;
  for (const b of (bands || []).slice().sort((a, b) => a.from - b.from)) if (age >= b.from) f = b.f;
  return f;
}
// The bands of a spending shape from the go-go, slow-go and no-go shares of the reference data (rp: retirementPhases of
// data/reference-2026.json: { goGo, slowGo, noGo, slowGoAge, noGoAge }). scale: 1 is the full easing, 0.5 half of it
// (a player's own, milder choice), 0 none. Returns [{ from, f }] for lyShapeAt; an empty list when there is no easing.
function lyShapeBands(rp, scale = 1) {
  const k = Math.min(1, Math.max(0, lyNum(scale))), go = lyNum(rp && rp.goGo) || 1, f = v => 1 - (1 - (Number.isFinite(v) ? v : go) / go) * k;
  if (!rp || !(k > 0)) return [];
  return [{ from: rp.slowGoAge, f: f(rp.slowGo) }, { from: rp.noGoAge, f: f(rp.noGo) }].filter(b => Number.isFinite(b.from) && b.f < 1);
}
// Steady income in the year of an age: { ss, other }, before any is used.
function lySteadyAt(p, age) {
  const off = p.off || {};
  const ss = p.ss && !off.ss && age >= p.ss.age ? lyNum(p.ss.year) : 0;
  const other = off.other ? 0 : (p.other || []).reduce((s, o) => s + (age >= (o.from ?? 0) && (o.to == null || age < o.to) ? lyNum(o.year) : 0), 0);
  return { ss, other };
}
// Health insurance of your own in the year of an age: from the year work stops (by the plan) until `until`.
function lyHealthAt(p, age) {
  const h = p.health;
  if (!h || !(h.year > 0)) return 0;
  return (p.stop == null || age >= p.stop) && age < (h.until ?? LY_MEDICARE) ? h.year : 0;
}
// Payments that end (Batch B, phase 2c): what a year's spending is lower by at an age. p.ends = [{ year (dollars a
// year, already in today's spending), from (the first age without the payment) }]: a mortgage that is paid off.
function lyEndsAt(p, age) {
  return (p.ends || []).reduce((s, e) => s + (age >= (e.from ?? Infinity) ? Math.max(0, lyNum(e.year)) : 0), 0);
}
// Take `need` from the accounts, in their order (taxable, traditional, Roth, HSA). cap: what each can pay this year.
// fill (a number, or null): with a tax plan, traditional money pays first, up to this much in the year; what is still
// needed then comes from the accounts in their order (traditional again last of the three, past the line).
function lyDraw(cap, need, fill = null) {
  const out = { tax: 0, pre: 0, roth: 0, hsa: 0 };
  let left = need;
  const take = (k, limit = Infinity) => { const v = Math.min(left, Math.max(0, Math.min(cap[k], limit) - out[k])); out[k] += v; left -= v; };
  if (fill != null) { take('pre', fill); for (const k of ['tax', 'roth', 'hsa', 'pre']) take(k); }
  else for (const k of LY_KEYS) take(k);
  return { out, left };
}

// THE YEAR-BY-YEAR RUN. p: { age, end, spend (a year), needsShare (0 to 1), shape (bands or null), workPay (take-home a
// year), save (invested a year while working), stop (the age work stops; null: it does not), bal { tax, pre, roth, hsa },
// saveTo (shares of `save` by account), grow (growth a year, for the whole chart), draw (growth a year once work has
// stopped; left out, it is `grow`: the owner's choice of 2026-11-27 is one growth rate for the whole chart), take (the
// withdrawal rate that sizes the two numbers: 0.04 is 25 times; it is what is taken out, not a growth rate),
// ss { year, age }, other [{ year, from, to }], health { year, until }, tax (a function: ordinary income of a year to
// its tax; null: none), off { work, tax, pre, roth, hsa, ss, other } (layers switched off),
// ends (payments that end: [{ year, from }]; from that age the year's spending is lower by `year`, the needs first),
// plan (the tax plan for the years after work, or null: { fill }: each year traditional money pays first, up to `fill`
// dollars of ordinary income; when the year needs less traditional money than that, the rest of the space is moved from
// traditional to Roth (a conversion: it is taxed as income that year and it is not spending)) }.
// Returns one row for each age: the parts of the line (needs, wants, health, wtax, line), the layers that pay
// (work, tax, pre, roth, hsa, inv, ss, other), the gap, what steady income there is (steady, needsMet), conv (what moved
// from traditional to Roth) and ord (the ordinary income of the year from traditional money: pre + conv).
function lyYears(p) {
  const off = p.off || {}, end = p.end ?? LY_END, share = Math.min(1, Math.max(0, p.needsShare ?? 0));
  const bal = Object.fromEntries(LY_KEYS.map(k => [k, Math.max(0, lyNum((p.bal || {})[k]))]));
  const to = p.saveTo || { pre: 1 }, rows = [];
  for (let age = p.age; age <= end; age++) {
    const planWork = p.stop == null || age < p.stop, working = planWork && !off.work, f = lyShapeAt(p.shape, age);
    // a payment that has ended comes off the needs first (a home is a need), then off the wants
    const less = lyEndsAt(p, age), needs0 = lyNum(p.spend) * share * f, wants0 = lyNum(p.spend) * (1 - share) * f;
    const needs = Math.max(0, needs0 - less), wants = Math.max(0, wants0 - Math.max(0, less - needs0)), health = lyHealthAt(p, age);
    const S = lySteadyAt(p, age), r = planWork ? lyNum(p.grow) : lyNum(p.draw ?? p.grow);
    const cap = Object.fromEntries(LY_KEYS.map(k => [k, off[k] ? 0 : bal[k] * (1 + r)]));
    const base = needs + wants + health, fill = !planWork && p.plan && Number.isFinite(p.plan.fill) ? Math.max(0, p.plan.fill) : null;
    // steady income first (it meets the needs first), then work, then the accounts
    const pay = wtax => {
      let left = base + wtax;
      const ss = Math.min(S.ss, left); left -= ss;
      const other = Math.min(S.other, left); left -= other;
      const work = Math.min(working ? lyNum(p.workPay) : 0, left); left -= work;
      // the HSA pays the health insurance first; the other accounts in their order
      const forHealth = Math.min(left, health, cap.hsa), rest = lyDraw({ ...cap, hsa: cap.hsa - forHealth }, left - forHealth, fill);
      rest.out.hsa += forHealth;
      // the rest of the space under the fill line moves from traditional to Roth
      return { ss, other, work, out: rest.out, gap: rest.left, conv: fill == null ? 0 : Math.max(0, Math.min(fill, cap.pre) - rest.out.pre) };
    };
    // the tax on the traditional money is part of the year's cost, so it is found by going round until it settles
    let wtax = 0, P = pay(0);
    if (typeof p.tax === 'function') for (let i = 0; i < 60; i++) {
      const t = Math.max(0, lyNum(p.tax(P.out.pre + P.conv)));
      if (Math.abs(t - wtax) < 1e-7) break;
      wtax = t; P = pay(wtax);
    }
    for (const k of LY_KEYS) {
      const add = working ? lyNum(p.save) * lyNum(to[k]) : 0;
      bal[k] = off[k] ? bal[k] * (1 + r) + add : wayPay(bal[k], P.out[k] + (k === 'pre' ? P.conv : 0), r, 'end').p + add;
    }
    bal.roth += P.conv;
    const inv = P.out.tax + P.out.pre + P.out.roth + P.out.hsa, steady = S.ss + S.other;
    rows.push({ age, working, planWork, needs, wants, health, wtax, line: base + wtax, work: P.work, tax: P.out.tax, pre: P.out.pre, roth: P.out.roth, hsa: P.out.hsa, inv,
      ss: P.ss, other: P.other, gap: P.gap < 0.005 ? 0 : P.gap, conv: P.conv, ord: P.out.pre + P.conv, steady, toNeeds: Math.min(P.ss + P.other, needs + health), needsMet: steady > 0 && steady >= needs + health - 0.005,
      left: bal.tax + bal.pre + bal.roth + bal.hsa });
  }
  return rows;
}
// The same rows as bars of `size` years: each number is the average of its years, so the layers plus the gap still
// equal the line. Each bar: { from, to, n, label, ...the averages }.
function lyBars(rows, size = 5) {
  const out = [], sums = ['needs', 'wants', 'health', 'wtax', 'line', 'work', 'tax', 'pre', 'roth', 'hsa', 'inv', 'ss', 'other', 'gap', 'conv', 'ord', 'steady', 'toNeeds'];
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
function lyNeedsAge(rows) {
  let at = null;
  for (let i = rows.length - 1; i >= 0; i--) { if (!rows[i].needsMet) break; at = rows[i].age; }
  return at;
}
// What one layer does over the whole run: { total, years, from, to (the first and last age it pays), toNeeds }.
function lyLayerSum(rows, id) {
  const hit = rows.filter(r => r[id] > 0.005);
  return { total: hit.reduce((s, r) => s + r[id], 0), years: hit.length, from: hit.length ? hit[0].age : null, to: hit.length ? hit[hit.length - 1].age : null,
    gapYears: rows.filter(r => r.gap > 0).length, gapTotal: rows.reduce((s, r) => s + r.gap, 0) };
}
// What is paid, as a share of the line, over the whole run (1 = every year is paid in full).
function lyCoverage(rows) {
  const line = rows.reduce((s, r) => s + r.line, 0), gap = rows.reduce((s, r) => s + r.gap, 0);
  return { line, gap, paid: line - gap, share: line > 0 ? (line - gap) / line : 1 };
}

// THE LIFETIME SPENDING TOTAL: what the years from today's age to the end of the chart cost, in today's dollars. Each
// year is today's spending a year times the spending shape of that age (no shape: the same every year, the standard
// way). No health insurance, no tax, no growth: it is what is spent, not what must be invested.
// Returns { total, years, from, to, year (today's spending a year) }.
function lyLifetime(p) {
  const end = p.end ?? LY_END, year = lyNum(p.spend);
  let total = 0, years = 0;
  for (let age = p.age; age <= end; age++) { total += year * lyShapeAt(p.shape, age); years++; }
  return { total, years, from: p.age, to: end, year };
}
// THE TARGET AT AN AGE: what must be invested on the day work stops at `at`, so that it pays each year's line less the
// steady income to the end, and then keeps paying the last year's amount for good (the same promise as the 25 times
// rule). Each year is counted back at the withdrawal rate `take` (the careful rate of the 25 times rule, not the growth
// of the chart; an older caller that gives no `take` gets `draw`). With flat spending and nothing else, this is
// spend / take. The pile on the chart grows faster than that, so it is expected to end higher: that is the cushion.
// The tax (Batch B, phase 2a): when p.tax is a function, the tax of each year comes from the same year-by-year run as
// the chart (lyYears): the target is split over the four accounts in the shares they have on the day work stops, the
// money comes out in the order of the chart (or by p.plan), and each year's tax is on the traditional money of that
// year. The target and the taxes depend on each other, so they are found by going round until the target settles.
function lyTarget(p, at) {
  const end = p.end ?? LY_END, r = lyNum(p.take ?? p.draw), q = { ...p, stop: at, off: {} };
  const base = age => { const S = lySteadyAt(q, age); return Math.max(0, Math.max(0, lyNum(p.spend) * lyShapeAt(p.shape, age) - lyEndsAt(p, age)) + lyHealthAt(q, age) - S.ss - S.other); };
  if (!(r > 0)) return null;
  const worth = taxAt => { let pv = 0, v = 1; for (let age = at; age <= end; age++) { v /= 1 + r; pv += (base(age) + taxAt(age)) * v; } return pv + ((base(end) + taxAt(end)) / r) * v; };
  let T = worth(() => 0);
  if (typeof p.tax !== 'function') return T;
  // an age past the end of the chart: the run is the last year alone
  const share = lyShares(p, at), from = Math.min(at, end);
  for (let i = 0; i < 40; i++) {
    const rows = lyYears({ ...q, age: from, stop: from, end, workPay: 0, save: 0, grow: r, draw: r, bal: Object.fromEntries(LY_KEYS.map(k => [k, T * share[k]])) });
    const next = worth(age => rows[age - from].wtax);
    if (Math.abs(next - T) < 0.5) { T = next; break; }
    T = next;
  }
  return T;
}
// The share of each account in the investments on the day work stops at `at`: each account grows and gets its part of
// the saving until then. With nothing invested and nothing saved: the shares of `saveTo` (all traditional when none).
function lyShares(p, at) {
  const to = p.saveTo || { pre: 1 }, n = Math.max(0, at - p.age);
  const pile = Object.fromEntries(LY_KEYS.map(k => [k, lyPile(Math.max(0, lyNum((p.bal || {})[k])), lyNum(p.save) * lyNum(to[k]), lyNum(p.grow), n)]));
  let sum = LY_KEYS.reduce((s, k) => s + pile[k], 0);
  if (!(sum > 0)) { for (const k of LY_KEYS) pile[k] = Math.max(0, lyNum(to[k])); sum = LY_KEYS.reduce((s, k) => s + pile[k], 0); }
  return Object.fromEntries(LY_KEYS.map(k => [k, sum > 0 ? pile[k] / sum : k === 'pre' ? 1 : 0]));
}
// The investments after n working years: each year the pile grows and the year's saving goes in (the game's grow()).
function lyPile(inv, save, grow, n) {
  for (let i = 0; i < n; i++) inv = inv * (1 + grow) + save;
  return inv;
}
// The params of "What it could be": p with only what was counted. counted: { ss: { share }, other, shape: { bands },
// health, wtax, taxplan: { fill }, flex: { take }, ends }. A layer that is switched off (p.off) is not counted. The tax
// plan is read only when the tax itself is counted (wtax): a plan for a cost that is not in the number moves nothing.
// flex (Batch B, phase 2b): a flexible way to take money out starts at the rate `take`; it is read only when it is
// higher than the rate of the standard way, so it can never raise the number. ends (phase 2c): payments that end.
function lyCounted(p, counted) {
  const c = counted || {}, off = p.off || {};
  return { ...p, off: {},
    ss: c.ss && p.ss && !off.ss ? { ...p.ss, year: lyNum(p.ss.year) * (c.ss.share ?? 1) } : null,
    other: c.other && !off.other ? p.other : [],
    shape: c.shape ? c.shape.bands || null : null,
    take: lyFlex(p, c) ?? p.take,
    ends: c.ends ? p.ends || [] : [],
    health: c.health ? p.health : null,
    tax: c.wtax ? p.tax : null,
    plan: c.wtax && c.taxplan && Number.isFinite(c.taxplan.fill) ? { fill: c.taxplan.fill } : null };
}
// The starting rate of a counted flexible way, or null when none is counted or it is not above the standard rate.
function lyFlex(p, counted) {
  const t = counted && counted.flex ? counted.flex.take : null, r = lyNum(p.take ?? p.draw);
  return Number.isFinite(t) && t > r + 1e-9 ? t : null;
}
// THE TWO NUMBERS. Returns { is: { target, age, years }, could: { target, age, years }, counted (true when anything
// is), raisedBy (the costs that are counted) }. age: null when the saving pace does not get there in 80 years.
function lyNumbers(p, counted) {
  const inv = LY_KEYS.reduce((s, k) => s + Math.max(0, lyNum((p.bal || {})[k])), 0), r = lyNum(p.take ?? p.draw);
  const first = target => { for (let n = 0; n <= 80; n++) if (lyPile(inv, lyNum(p.save), lyNum(p.grow), n) >= target(p.age + n)) return n; return null; };
  const isT = r > 0 ? lyNum(p.spend) / r : null, isN = isT == null ? null : first(() => isT);
  const is = { target: isT, years: isN, age: isN == null ? null : p.age + isN };
  const c = counted || {}, any = !!((c.ss && p.ss && !(p.off || {}).ss) || (c.other && (p.other || []).length && !(p.off || {}).other) || c.shape || (c.health && p.health) || (c.wtax && p.tax) || lyFlex(p, c) != null || (c.ends && lyEndsAt(p, Infinity) > 0));
  if (!any || isT == null) return { is, could: { ...is }, counted: false, raisedBy: [] };
  const q = lyCounted(p, c), n = first(a => lyTarget(q, a));
  const could = { target: lyTarget(q, n == null ? (is.age ?? p.age) : p.age + n), years: n, age: n == null ? null : p.age + n };
  return { is, could, counted: true, raisedBy: ['health', 'wtax'].filter(k => (k === 'health' ? c.health && p.health : c.wtax && p.tax)) };
}
// The receipt of one change: dollars off the target and months sooner (a minus sign: the other way).
function lyReceipt(before, after) {
  return { off: before.target == null || after.target == null ? null : before.target - after.target,
    months: before.age == null || after.age == null ? null : (before.age - after.age) * 12 };
}

// THE TAX PLAN (Batch B, phase 2a): bracket filling with Roth conversions, for the years after work. lines: the fill
// lines to try, from the caller's tax tables: [{ id, fill (dollars of ordinary income a year: the standard deduction,
// or the deduction plus the top of a bracket) }]. The tax is counted both ways (counted.wtax is switched on here).
// plain: the two numbers with the money taken out in the order of the chart (taxable, traditional, Roth). Each line is
// tried on the day work stops the plain way (`at`); the line with the lowest target is the plan. A line that does not
// beat the plain way by a dollar is no plan: best is null and `with` is `plain`.
// Returns { ok (false: no tax function), plain, with, best ({ id, fill, target }), tried, at, plainAt (the plain
// target at `at`), receipt ({ off, months }: the plan against the plain way), cost ({ off, months }: the plain way
// against the number with no tax counted: a minus sign means the tax raises the number) }.
function lyTaxPlan(p, counted, lines) {
  const c = { ...(counted || {}), wtax: {} }, none = { ...c };
  delete c.taxplan; delete none.taxplan; delete none.wtax;
  if (typeof p.tax !== 'function') return { ok: false, plain: null, with: null, best: null, tried: [], at: null, plainAt: null, receipt: null, cost: null };
  const free = lyNumbers(p, none), plain = lyNumbers(p, c), at = plain.could.age ?? plain.is.age ?? p.age, q = lyCounted(p, c);
  const plainAt = lyTarget(q, at);
  const tried = (lines || []).filter(l => l && Number.isFinite(l.fill) && l.fill >= 0).map(l => ({ ...l, target: lyTarget({ ...q, plan: { fill: l.fill } }, at) }));
  let best = null;
  for (const t of tried) if (t.target != null && (!best || t.target < best.target - 0.5)) best = t;
  if (!best || !(best.target < plainAt - 1)) best = null;
  let withN = best ? lyNumbers(p, { ...c, taxplan: { fill: best.fill } }) : plain;
  // the plan must hold for the two numbers too: a sooner age, or the same age and a lower target
  const sooner = (a, b) => (a.age != null && (b.age == null || a.age < b.age)) || (a.age === b.age && a.target < b.target - 1);
  if (best && !sooner(withN.could, plain.could)) { best = null; withN = plain; }
  return { ok: true, plain, with: withN, best, tried, at, plainAt, receipt: lyReceipt(plain.could, withN.could), cost: lyReceipt(free.could, plain.could) };
}
// The go-go, slow-go and no-go shares and their source (data/reference-2026.json, retirementPhases), read with lyShapeBands.
const LY_SHAPE_REF = {"goGo":1,"slowGo":0.85,"noGo":0.75,"slowGoAge":75,"noGoAge":85,"source":"Go-go, slow-go and no-go years (the names are from Michael Stein, The Prosperous Retirement): spending stays at 100% to age 75, then 85% from 75 and 75% from 85. The 85% matches the BLS Consumer Expenditure Survey 2024: households 75 and over spent $55,834 a year against $65,354 at 65 to 74 (85.4%; FRED series CXUTOTALEXPLB0409M and CXUTOTALEXPLB0408M, read Nov 6 2026 and again through a web search on Nov 27 2026). The survey has no row for 85 and over, so the 75% from 85 is a stated convention (the default of the older suite, money-rooms-v3 data/assumptions.json)"};
// The share of Social Security that the trust fund report says can still be paid (socialSecurity.trustFund).
const LY_SS_REF = {"year":2034,"payable":0.83,"source":"The 2026 OASDI Trustees Report (released June 9 2026): the combined OASI and DI trust fund reserves are projected to be depleted in 2034, when continuing income pays about 83% of scheduled benefits (ssa.gov/oact/tr/2026/II_E_conclu.html; SSA press release June 9 2026). The retirement fund alone (OASI) runs out in late 2032, at 78%"};
// The federal tax lines of the back-end tax step and where each comes from (data/reference-2026.json, tax; js/registry/assumptions.js).
const LY_TAX_REF = {"year":2026,"standardDeduction":{"single":16100,"joint":32200,"head":24150},"brackets":{"single":[[0,0.1],[12400,0.12],[50400,0.22],[105700,0.24],[201775,0.32],[256225,0.35],[640600,0.37]],"joint":[[0,0.1],[24800,0.12],[100800,0.22],[211400,0.24],[403550,0.32],[512450,0.35],[768700,0.37]],"head":[[0,0.1],[17700,0.12],[67450,0.22],[105700,0.24],[201750,0.32],[256200,0.35],[640600,0.37]]},"zeroGainsTo":{"single":49450,"joint":98900,"head":66200},"sources":{"standardDeduction":{"source":"IRS 2026 inflation adjustments, via Journal of Accountancy","date":"2026-10-28"},"standardDeductionHead":{"source":"IRS Rev. Proc. 2025-32 sec. 4.01 Table 2 (heads of households) and sec. 4.14(1) ($24,150), quoted by fedratecalc.com (2026 tax brackets) and Current Federal Tax Developments (Oct 9 2025); the deduction also by KPMG TaxNewsFlash and Journal of Accountancy (Oct 2025). Read Nov 6 2026","date":"2026-11-06"},"brackets":{"source":"IRS 2026 inflation adjustments, via Journal of Accountancy","date":"2026-10-28"},"bracketsHead":{"source":"IRS Rev. Proc. 2025-32 sec. 4.01 Table 2 (heads of households) and sec. 4.14(1) ($24,150), quoted by fedratecalc.com (2026 tax brackets) and Current Federal Tax Developments (Oct 9 2025); the deduction also by KPMG TaxNewsFlash and Journal of Accountancy (Oct 2025). Read Nov 6 2026","date":"2026-11-06"},"zeroGainsTo":{"source":"IRS Rev. Proc. 2025-32 sec. 4.03 (tax year 2026): the most taxable income at which long-term capital gains are taxed at 0%, and at 15%. Read through a web search on Nov 27 2026 (irs.gov itself does not open from the build machine): Kiplinger (IRS Updates Capital Gains Tax Thresholds for 2026), Experian (Long-Term Capital Gains Rates for 2026) and Current Federal Tax Developments (Oct 9 2025) give the same amounts","date":"2026-11-27"}}};

// The typical values of the chip No idea, use typical, with their sources (data/priors-2026.json: CE 2024 by age and the BEA saving rate; data/reference-2026.json: typicalInvested).
const LY_TYP_REF = {"spend":{"rows":[{"ages":[null,24],"band":"under 25","year":42855},{"ages":[25,34],"band":"25 to 34","year":63774},{"ages":[35,44],"band":"35 to 44","year":77764},{"ages":[45,54],"band":"45 to 54","year":85379},{"ages":[55,64],"band":"55 to 64","year":72774},{"ages":[65,74],"band":"65 to 74","year":60775},{"ages":[75,null],"band":"75 and over","year":53926}],"who":"households of every size (CE consumer units)","source":"Bureau of Labor Statistics, read on FRED (its mirror), Consumer Expenditure Survey 2024, by age of reference person (calendar-year tables): total expenditures less personal insurance and pensions (payroll taxes and retirement contributions), annual mean per consumer unit","date":"2026-11-06"},"saveRate":{"share":0.038,"source":"Bureau of Economic Analysis, Personal Income and Outlays, September 2026 (news release): personal saving as a percentage of disposable personal income, September 2026","date":"2026-10-29"},"inv":{"rows":[{"ages":[null,34],"median":21000},{"ages":[35,44],"median":61200},{"ages":[45,54],"median":133000},{"ages":[55,64],"median":239000},{"ages":[65,74],"median":257000}],"who":"families that have a retirement account: the median balance among them, by age of the reference person","source":"Federal Reserve Board, Survey of Consumer Finances 2025 (Changes in U.S. Family Finances from 2022 to 2025, released Oct 9 2026): retirement accounts, median value for families that hold them, under 35, 35 to 44, 45 to 54, 55 to 64 and 65 to 74. Read through a web search on Nov 27 2026 from summaries of the Fed's tables (richify.ai for each age; financebuzz.com gives the same 55 to 64 figure); federalreserve.gov was not reachable from the session, so the five figures are not yet checked against the Fed's own table. The all-ages median of the same table, $106,000, is in data/priors-2026.json as a Primary row","date":"2026-11-27"}};
