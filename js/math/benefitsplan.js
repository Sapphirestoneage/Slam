// SPDX-License-Identifier: AGPL-3.0-only
// Benefits and health (run "Finish everything partly built", Part 10, Nov 26 2026). ONE engine for both apps: the web
// app (Me > Benefits at work, and the cliff's health chain in js/math/cliff.js) and the game's screen "Benefits and
// health" call these functions, so the two can never give two answers.
// Pure, and with no import on purpose: tools/game_benefits_build.mjs copies this file word for word into
// game/core/benefitsplan.js, with the rows it needs from data/reference-2026.json as BP_REF. Every name starts with bp
// or BP_ because the game has one global scope. Empty is not zero: an answer not given is null, and the result lists
// it in `needs` (ready: false), never a made-up number.
//
// FIVE TOOLS, each a plain function on plain numbers (dollars a year unless the name says a month; rates as fractions):
//   the optimizer   bpHsa, bpDcfsa, bpEspp, bpCommuter, bpOptimize: what each benefit is worth in dollars a year.
//                   The rate is what one pre-tax dollar saves: income tax and, for money taken out of pay through the
//                   employer, Social Security and Medicare too (the caller says which).
//   coverage        bpCoverage: the health chain at one income (Medicaid, the Essential Plan in New York, the
//                   marketplace with its premium credit, full price), and bpLines: each line in dollars for the
//                   household's size. The rules are ref.cliff (plan year 2027) and the 2026 poverty guideline.
//   plans           bpPlans: two or three plans side by side, premium after the credit, deductible, out-of-pocket max,
//                   and a year of light, typical and heavy care.
//   employers       bpEmployers, bpEmployer: the library rows, each with its source and date, as the fields they fill.
//   the cliff       bpHealthCliff: what a raise costs in health coverage alone (the full cliff, SNAP, the EITC and
//                   child care, is the web app's cliff.js, which calls bpCoverage for its health part).

// ---------- helpers ----------
const bpBlank = v => v === null || v === undefined || v === '' || (typeof v === 'number' && !Number.isFinite(v));
const bpNum = v => (bpBlank(v) ? null : Number(v));
const bpPos = v => Math.max(0, v);
const bpNeeds = (list) => { const needs = Object.entries(list).filter(([, v]) => bpBlank(v)).map(([k]) => k); return needs; };

// The rules each tool reads, from the reference data (the web app passes ref; the game passes BP_REF, the same rows).
// lib: data/library/employers.json (the employer library), when loaded.
export function bpRules(ref, lib = null) {
  return {
    poverty: ref.studentLoans.poverty, benefits: ref.benefits,
    medicaid: ref.cliff.medicaid, ny: ref.cliff.ny, aca: ref.cliff.aca, employers: lib ?? ref.employers ?? { rows: {} },
  };
}

// ---------- 1. the optimizer ----------
// The HSA as a retirement account: the tax you skip on what goes in, the employer's dollars, and what it grows to if it
// is invested and the receipts are kept (paid out of pocket now, paid back to you tax free any year later).
// x: { cover: 'self' | 'family', age, you (you put in a year), employer (the employer puts in a year), rate, years (to
// the year you would take it), growth (a year, after inflation), receipts (care paid out of pocket a year and kept) }.
export function bpHsa(x, R) {
  const H = R.benefits.hsa, cover = x.cover === 'family' ? 'family' : x.cover === 'self' ? 'self' : null;
  const needs = bpNeeds({ 'self or family cover': cover, 'what you put in': x.you, 'your tax rate': x.rate });
  if (needs.length) return { ready: false, needs };
  const age = bpNum(x.age), limit = H[cover] + (age !== null && age >= 55 ? H.catchUp55 : 0);
  const employer = bpPos(bpNum(x.employer) ?? 0), room = bpPos(limit - employer), you = bpPos(Number(x.you)), put = Math.min(you, room);
  const taxSaved = put * Number(x.rate), yearly = taxSaved + employer;
  const years = bpNum(x.years), growth = bpNum(x.growth), receipts = bpPos(bpNum(x.receipts) ?? 0);
  // Invested, each year's money goes in at the end of the year and grows at `growth`: a future value of a level payment.
  const fv = years === null || growth === null ? null : years <= 0 ? 0 : growth === 0 ? (put + employer) * years : (put + employer) * ((Math.pow(1 + growth, years) - 1) / growth);
  return { ready: true, needs: [], cover, limit, employer, room, you, put, each: put + employer, over: bpPos(you - room), taxSaved, yearly,
    years, growth, grows: fv, receiptsBank: years === null ? null : receipts * Math.max(0, years), plan: R.benefits.planYear };
}
// Dependent care FSA: care paid pre-tax, up to the limit, for the years until the youngest child turns 13.
// x: { care (child care a year), ages (the children's ages), rate, separate (married filing separately), cap (the
// plan's own limit, when lower) }.
export function bpDcfsa(x, R) {
  const D = R.benefits.dcfsa, ages = (x.ages || []).map(bpNum).filter(a => a !== null && a >= 0);
  const needs = bpNeeds({ 'child care a year': x.care, 'your tax rate': x.rate });
  if (!ages.length) needs.push("a child's age");
  if (needs.length) return { ready: false, needs };
  const law = x.separate ? D.separate : D.limit, cap = bpNum(x.cap) === null ? law : Math.min(law, Number(x.cap));
  const young = ages.filter(a => a < D.ageUnder), put = young.length ? Math.min(bpPos(Number(x.care)), cap) : 0;
  const yearly = put * Number(x.rate), years = young.length ? Math.max(...young.map(a => D.ageUnder - Math.floor(a))) : 0;
  return { ready: true, needs: [], cap, put, yearly, years, total: yearly * years, under: young.length, ageUnder: D.ageUnder, plan: R.benefits.planYear };
}
// ESPP: money taken from pay buys the company's stock at a discount. Sold right away, the gain is the discount, taxed as
// pay. x: { put (a year), discount (0.05 to 0.15), rate (the tax on the gain) }. The $25,000 a year is the stock's value
// before the discount, so at 15% off at most $21,250 of pay can go in. A lookback can make the gain larger; it is not
// counted here (the price it looks back to is not known ahead).
export function bpEspp(x, R) {
  const E = R.benefits.espp, needs = bpNeeds({ 'what you put in': x.put, 'the discount': x.discount, 'your tax rate': x.rate });
  if (needs.length) return { ready: false, needs };
  const d = Number(x.discount);
  if (!(d > 0 && d <= E.maxDiscount + 1e-9)) return { ready: false, needs: ['a discount up to ' + Math.round(E.maxDiscount * 100) + '%'] };
  const maxPut = E.cap * (1 - d), put = Math.min(bpPos(Number(x.put)), maxPut);
  const gain = put * d / (1 - d), yearly = gain * (1 - Number(x.rate));
  return { ready: true, needs: [], put, maxPut, over: bpPos(Number(x.put) - maxPut), gain, stock: put + gain, tax: gain - yearly, yearly, cap: E.cap };
}
// Commuter: transit or parking paid pre-tax, up to the monthly limit. x: { monthly, rate, cap (a month; the plan year's
// limit when not given) }.
export function bpCommuter(x, R) {
  const needs = bpNeeds({ 'transit or parking a month': x.monthly, 'your tax rate': x.rate });
  if (needs.length) return { ready: false, needs };
  const cap = bpNum(x.cap) ?? R.benefits.commuterMonthly, covered = Math.min(bpPos(Number(x.monthly)), cap) * 12;
  return { ready: true, needs: [], cap, covered, yearly: covered * Number(x.rate), marginal: Number(x.rate) };
}
// All four together: each one's dollars a year, and the sum of the ones that are ready.
export const BP_KINDS = [['hsa', 'HSA'], ['dcfsa', 'Dependent care FSA'], ['espp', 'ESPP'], ['commuter', 'Commuter']];
// The sum of the parts that are ready (a part not worked out counts for nothing, never as zero dollars).
export function bpSum(parts) {
  const ready = (parts || []).filter(p => p && p.ready);
  return { ready: ready.length > 0, of: ready.length, yearly: ready.reduce((s, p) => s + p.yearly, 0) };
}
export function bpOptimize(x, R) {
  const parts = { hsa: x.hsa ? bpHsa(x.hsa, R) : null, dcfsa: x.dcfsa ? bpDcfsa(x.dcfsa, R) : null, espp: x.espp ? bpEspp(x.espp, R) : null, commuter: x.commuter ? bpCommuter(x.commuter, R) : null };
  return { parts, ...bpSum(BP_KINDS.map(([k]) => parts[k])),
    rows: BP_KINDS.map(([k, name]) => ({ id: k, name, ready: !!parts[k]?.ready, yearly: parts[k]?.ready ? parts[k].yearly : null, needs: parts[k] ? parts[k].needs : ['not asked'] })) };
}

// ---------- 2. coverage ----------
// The poverty guideline a year for a household of this size (HHS 2026, the 48 states and DC).
export const bpFpl = (R, size) => R.poverty.base + R.poverty.perPerson * Math.max(0, size - 1);
// The marketplace share of income a household pays at this multiple of the line (the IRS table, a straight line inside
// each band). Null over the 400% line: no help there.
export function bpApplicable(ratio, R) {
  const A = R.aca;
  if (ratio > A.cliffMultiple + 1e-9) return null;
  let from = 0;
  for (const [upTo, a, b] of A.applicable) {
    if (ratio < upTo || upTo === A.cliffMultiple) return a + (b - a) * Math.min(1, Math.max(0, (ratio - from) / (upTo - from)));
    from = upTo;
  }
  return A.applicable.at(-1)[2];
}
// The benchmark plan a year for the adults (the state's second-lowest silver plan for a 40-year-old; New York prices
// every age the same).
export const bpBenchmark = (h, R) => (R.aca.benchmark40[h.state] ?? R.aca.benchmarkUs) * 12 * h.adults;
// What the adults pay a year for health coverage at this MAGI, and on what: medicaid, essential, aca (with the credit
// `help`), gap (under the line in a state that did not expand Medicaid) or full. h: { state, size, adults }.
export function bpCoverage(h, R, magi) {
  const f = bpFpl(R, h.size), ratio = magi / f, bench = bpBenchmark(h, R);
  const expanded = !R.medicaid.nonExpansion.includes(h.state);
  if (expanded && ratio <= R.medicaid.adultMultiple + 1e-9) return { on: 'medicaid', cost: 0, help: bench, ratio, bench };
  if (h.state === 'NY' && ratio <= R.ny.essentialMultiple + 1e-9) return { on: 'essential', cost: R.ny.essentialPremium * 12 * h.adults, help: bench, ratio, bench };
  if (ratio < R.aca.floorMultiple) return { on: 'gap', cost: bench, help: 0, ratio, bench };
  const pct = bpApplicable(ratio, R);
  if (pct === null) return { on: 'full', cost: bench, help: 0, ratio, bench, pct: null };
  const cost = Math.min(bench, pct * magi);
  return { on: 'aca', cost, help: bench - cost, ratio, bench, pct };
}
// Each line in dollars a year for this household, in the order a rising income meets them.
export const BP_ON = { medicaid: 'Medicaid', essential: 'the Essential Plan', aca: 'a marketplace plan with the premium credit', gap: 'a marketplace plan with no credit (under the line)', full: 'a marketplace plan at full price' };
export function bpLines(h, R) {
  const f = bpFpl(R, h.size), out = [];
  if (!R.medicaid.nonExpansion.includes(h.state)) out.push({ id: 'medicaid', name: 'Medicaid', upTo: f * R.medicaid.adultMultiple, multiple: R.medicaid.adultMultiple });
  if (h.state === 'NY') out.push({ id: 'essential', name: 'The Essential Plan', upTo: f * R.ny.essentialMultiple, multiple: R.ny.essentialMultiple });
  out.push({ id: 'aca', name: 'The premium credit', upTo: f * R.aca.cliffMultiple, multiple: R.aca.cliffMultiple });
  return { fpl: f, lines: out };
}
// The coverage answer for the screen: needs the size, the adults and the income; the state may be blank (then the
// chain reads as a state that expanded Medicaid, with the US average benchmark).
export function bpEligible(x, R) {
  const needs = bpNeeds({ 'the people in your tax household': x.size, 'what you make a year': x.magi });
  if (needs.length) return { ready: false, needs };
  const h = { state: x.state || null, size: Math.max(1, Math.round(Number(x.size))), adults: Math.max(1, Math.round(bpNum(x.adults) ?? 1)) };
  const now = bpCoverage(h, R, Number(x.magi)), L = bpLines(h, R);
  const next = L.lines.find(l => l.upTo > Number(x.magi) + 0.5) ?? null;
  return { ready: true, needs: [], h, magi: Number(x.magi), now, on: BP_ON[now.on], fpl: L.fpl, lines: L.lines, next, toNext: next ? next.upTo - Number(x.magi) : null, plan: R.aca.planYear };
}

// ---------- 3. plans side by side ----------
// plans: [{ name, premium (a month, before any credit), deductible, oop (out-of-pocket max), market (bought on the
// marketplace, so the credit counts) }]; help: the premium credit a year (from bpCoverage), null when none.
// A year of light care is the premiums alone; typical, premiums and the deductible; heavy, premiums and the most you
// pay (the out-of-pocket max). The cheapest of each is named; no plan is called good or bad.
export function bpPlans(plans, { help = null } = {}) {
  const rows = (plans || []).slice(0, 3).map((p, i) => {
    const needs = bpNeeds({ 'the premium': p.premium, 'the deductible': p.deductible, 'the out-of-pocket max': p.oop });
    if (needs.length) return { i, name: p.name || 'Plan ' + (i + 1), ready: false, needs };
    const full = Number(p.premium) * 12, credit = p.market && help > 0 ? Math.min(full, help) : 0, year = full - credit;
    const ded = Number(p.deductible), oop = Math.max(Number(p.oop), ded);
    return { i, name: p.name || 'Plan ' + (i + 1), ready: true, needs: [], full, credit, year, monthly: year / 12, deductible: ded, oop,
      light: year, typical: year + ded, heavy: year + oop };
  });
  const ok = rows.filter(r => r.ready), low = k => (ok.length < 2 ? null : ok.reduce((a, b) => (b[k] < a[k] - 1e-9 ? b : a)).i);
  return { rows, ready: ok.length >= 2, of: ok.length, cheapest: { light: low('light'), typical: low('typical'), heavy: low('heavy') },
    spread: ok.length < 2 ? null : Math.max(...ok.map(r => r.heavy)) - Math.min(...ok.map(r => r.heavy)) };
}

// ---------- 4. the employer library ----------
// Each row: { id, name, tiers ([{ rate, upTo }] as the 401(k) match tiers of js/math/portfolio.js), match (words), vest
// (an id of CR_VEST in js/math/career.js, or null), esppDiscount, hsaEmployer (null: not found), sources }.
export const bpEmployers = R => Object.entries(R.employers.rows).map(([id, e]) => ({ id, ...e })).sort((a, b) => a.name.localeCompare(b.name));
export function bpEmployer(id, R) {
  const e = R.employers.rows[id];
  if (!e) return null;
  const fills = { tiers: e.tiers, vest: e.vest, esppDiscount: e.esppDiscount, hsaEmployer: e.hsaEmployer };
  return { id, name: e.name, match: e.match, fills, empty: Object.entries(fills).filter(([, v]) => v === null || v === undefined).map(([k]) => k), sources: e.sources,
    fullAt: (e.tiers || []).reduce((s, t) => s + t.upTo, 0), fullPct: (e.tiers || []).reduce((s, t) => s + t.upTo * t.rate, 0) };
}

// ---------- 5. the health cliff ----------
// What a raise a year costs in health coverage alone: the coverage at the income now and with the raise, the extra a
// year, and the smallest raise (in $100 steps, up to `upTo`) past which more pay leaves more after coverage (the raise
// less the extra cost). x: { size, adults, state, magi, raise }.
export function bpHealthCliff(x, R, { upTo = 50000 } = {}) {
  const E = bpEligible(x, R);
  if (!E.ready) return E;
  if (bpBlank(x.raise)) return { ready: false, needs: ['a raise to test'] };
  const r = Number(x.raise), at = bpCoverage(E.h, R, E.magi + r), extra = at.cost - E.now.cost, net = r - extra;
  let even = null;
  if (net < -0.5) for (let k = Math.ceil(r / 100) * 100; k <= r + upTo; k += 100) if (k - (bpCoverage(E.h, R, E.magi + k).cost - E.now.cost) >= 0) { even = k; break; }
  return { ready: true, needs: [], raise: r, from: E.now.on, to: at.on, fromWords: BP_ON[E.now.on], toWords: BP_ON[at.on], extra, net, even, now: E.now, at };
}
