// SPDX-License-Identifier: AGPL-3.0-only
// Estate and marriage (run Finish everything partly built, Part 11; M8E): the few numbers behind the estate basics,
// the inheritance simulator and Married or partners?. No imports, numbers in and out, so the game loads the same code
// (tools/game_estate_build.mjs writes game/core/estate.js from this file). The rules are data/reference-2026.json
// (estate) and their words and sources data/sources/estate-2026.json. Not legal or tax advice: every screen says
// "bring this to a lawyer".
//
//   who gets what      each thing you leave (cash, investments, a home, a traditional or Roth account, life
//                      insurance), shared among your people by the parts you tap: what each person receives, the gain
//                      the step-up in basis wipes out (value on the date of death less what you paid), what comes out
//                      of a traditional account as income later, the rule each person's inherited account follows and
//                      its last year; the estate against the federal line and the New York line and its cliff: esHeirs
//   the 10 years       an inherited traditional account taken out in year 1, spread evenly over the 10 years, or all
//                      in year 10 (only when the owner had not started required withdrawals): the federal tax on each
//                      way, on top of the heir's own income, from the caller's tax engine (taxOf): esTenYear
//   married or not     two people's pay taxed as two single returns or one joint return, the tax on job health cover
//                      for a partner who is not a spouse (imputed income), and the Social Security spousal top-up and
//                      survivor benefit marriage opens (spousalOf from the caller, js/math/socialsecurity.js): esCompare
//
// Empty is not zero: a value not typed gives no number, never one made from 0.

const estHas = x => x !== null && x !== undefined && x !== '' && !Number.isNaN(Number(x));
const estNum = x => (estHas(x) ? Number(x) : null);

export const ES_KINDS = {
  cash: 'Cash and savings',
  taxable: 'Investments outside retirement',
  home: 'A home or land',
  pretax: 'Traditional IRA or 401(k)',
  roth: 'Roth IRA or Roth 401(k)',
  life: 'Life insurance',
  other: 'Something else',
};
// The kinds with a step-up in basis (a starting point for tax), and the kinds that pass by a beneficiary form.
export const ES_BASIS = ['taxable', 'home'];
export const ES_FORM = ['pretax', 'roth', 'life'];
// Who a person is to you, for the inherited account rules (IRS, Retirement topics: Beneficiary).
export const ES_HEIRS = {
  spouse: 'My spouse',
  close: 'Not more than 10 years younger than me',
  child: 'My child under 21',
  disabled: 'Disabled or chronically ill',
  other: 'Anyone else',
};
// The rule an inherited traditional or Roth account follows, by who the heir is.
//   own: a spouse can treat it as their own. life: take it out over their own life expectancy (or the 10 years).
//   child: life expectancy until 21, then 10 years. ten: empty it by the end of the 10th year after the death.
export const ES_RULE_OF = { spouse: 'own', close: 'life', disabled: 'life', child: 'child', other: 'ten' };

// ---- Who gets what ----
// items: [{ id, name, kind, value, basis, to: { personId: part } }]. A part is a weight (1 and 1 is half each).
// people: [{ id, name, heir }] (heir: a key of ES_HEIRS). deathYear: the year for the 10-year line. started: the owner
// had already started required withdrawals. rules: ref.estate.
export function esHeirs({ items = [], people = [], deathYear = null, started = false } = {}, rules) {
  const R = rules || {}, ten = estNum(R.tenYears) ?? 10, minorAge = estNum(R.minorAge) ?? 21;
  const rows = people.map(p => ({ id: p.id, name: p.name, heir: ES_HEIRS[p.heir] ? p.heir : 'other', gets: 0, byKind: {}, erased: 0, basisUnknown: 0, pretax: 0, roth: 0, life: 0, items: [] }));
  const at = id => rows.find(r => r.id === id);
  const noValue = [], unassigned = [];
  let total = 0, toSpouse = 0, erased = 0;
  for (const it of items) {
    const v = estNum(it.value), kind = ES_KINDS[it.kind] ? it.kind : 'other';
    if (v == null) { noValue.push(it.id); continue; }
    total += v;
    const parts = Object.entries(it.to || {}).map(([id, w]) => [id, estNum(w) ?? 0]).filter(([id, w]) => w > 0 && at(id));
    const sum = parts.reduce((s, [, w]) => s + w, 0);
    if (!sum) { unassigned.push(it.id); continue; }
    const b = estNum(it.basis), gain = ES_BASIS.includes(kind) && b != null ? Math.max(0, v - b) : null;
    for (const [id, w] of parts) {
      const r = at(id), share = w / sum, amt = v * share;
      r.gets += amt;
      r.byKind[kind] = (r.byKind[kind] ?? 0) + amt;
      r.items.push({ id: it.id, name: it.name, kind, amount: amt, share });
      if (ES_BASIS.includes(kind)) { if (gain == null) r.basisUnknown += amt; else { r.erased += gain * share; erased += gain * share; } }
      if (kind === 'pretax') r.pretax += amt;
      if (kind === 'roth') r.roth += amt;
      if (kind === 'life') r.life += amt;
      if (r.heir === 'spouse') toSpouse += amt;
    }
  }
  const y = estNum(deathYear);
  for (const r of rows) {
    r.rule = ES_RULE_OF[r.heir];
    const accounts = r.pretax + r.roth;
    // The last year: 10 years after the death for 'ten'; for a child, 10 years after 21 (their age is not asked, so
    // no year is given); none for a spouse or a life-expectancy heir, who may take it out over their own life.
    r.lastYear = accounts > 0 && r.rule === 'ten' && y != null ? y + ten : null;
    r.yearly = accounts > 0 && r.rule === 'ten' && !!started && r.pretax > 0;
    r.childAge = r.rule === 'child' && accounts > 0 ? minorAge : null;
    r.cashLike = r.gets - r.pretax; // what is not income tax later: everything but the traditional account
  }
  const fed = estNum(R.federalExclusion), ny = estNum(R.nyExclusion), cliff = ny != null ? ny * (estNum(R.nyCliffShare) ?? 1.05) : null;
  const fedBase = total - toSpouse;
  const estate = {
    total, toSpouse, fedBase,
    federal: fed == null ? null : { line: fed, over: Math.max(0, fedBase - fed), room: Math.max(0, fed - fedBase), state: fedBase > fed ? 'over' : 'under' },
    ny: ny == null ? null : { line: ny, cliff, state: total > cliff ? 'over' : total > ny ? 'cliff' : 'under', room: Math.max(0, ny - total), toCliff: Math.max(0, cliff - total) },
  };
  return { ready: total > 0 && rows.length > 0, total, erased, people: rows, noValue, unassigned, assigned: total - items.filter(i => unassigned.includes(i.id)).reduce((s, i) => s + (estNum(i.value) ?? 0), 0), estate, deathYear: y, started: !!started };
}

// ---- The 10 years: one inherited traditional account ----
// balance: what the heir inherits. growth: a year, after inflation (0.05 is 5%). other: the heir's own yearly income
// before taxes. status: 'single', 'joint' or 'head'. taxOf(gross, status): the federal income tax on a year's income,
// from the caller's tax engine (the web app: income.js federalTax, M10; the game: retireTax). Each withdrawal comes at
// the end of its year. In today's dollars, at the 2026 brackets.
//   first: all at the end of year 1.  even: each year the balance divided by the years left, so year 10 empties it.
//   last: nothing until the end of year 10 (only when the owner had not started required withdrawals).
export const ES_WAYS = { first: 'All in the first year', even: 'Spread over the 10 years', last: 'All in year 10' };
export function esTenYear({ balance = null, growth = 0, other = null, status = 'single', years = 10, deathYear = null, started = false } = {}, taxOf) {
  const B = estNum(balance), g = estNum(growth) ?? 0, inc = estNum(other), N = Math.max(1, Math.round(estNum(years) ?? 10)), y0 = estNum(deathYear);
  if (!(B > 0) || inc == null || inc < 0 || typeof taxOf !== 'function') return { ready: false };
  const base = taxOf(inc, status);
  const run = way => {
    let left = B;
    const rows = [];
    for (let k = 1; k <= N; k++) {
      left *= 1 + g;
      const out = way === 'first' ? (k === 1 ? left : 0) : way === 'last' ? (k === N ? left : 0) : left / (N - k + 1);
      left -= out;
      const tax = out > 0 ? taxOf(inc + out, status) - base : 0;
      rows.push({ k, year: y0 != null ? y0 + k : null, out, tax });
    }
    const out = rows.reduce((s, r) => s + r.out, 0), tax = rows.reduce((s, r) => s + r.tax, 0);
    return { way, ready: !(way === 'last' && started), rows, out, tax, kept: out - tax, share: out > 0 ? tax / out : 0 };
  };
  const ways = Object.fromEntries(Object.keys(ES_WAYS).map(w => [w, run(w)]));
  const open = Object.values(ways).filter(w => w.ready);
  const best = open.reduce((a, w) => (w.tax < a.tax ? w : a), open[0]);
  return { ready: true, balance: B, growth: g, other: inc, status, years: N, lastYear: y0 != null ? y0 + N : null, started: !!started, ways, best: best.way, saves: Math.max(...open.map(w => w.tax)) - best.tax };
}

// ---- Married or partners? ----
// people: two, [{ name, pay, pia }]: pay a year before taxes; pia: the Social Security benefit at full retirement age
// a month, off the person's statement (or null). cover: the yearly value of job health cover one gives the other
// (imputed income when they are not married), coverBy: 0 or 1, whose job. taxOf(gross, status) as above; spousalOf(own,
// other): the spousal top-up a month (js/math/socialsecurity.js spousalExcess, with the reference data).
// Federal only: the New York joint brackets wait for Eli's check (STATUS), so no state tax is compared here.
export function esCompare({ people = [], cover = 0, coverBy = 0 } = {}, { taxOf, spousalOf } = {}) {
  if (people.length !== 2 || typeof taxOf !== 'function') return { ready: false };
  const pay = people.map(p => estNum(p.pay));
  if (pay.some(v => v == null || v < 0)) return { ready: false, needs: 'pay' };
  const cv = Math.max(0, estNum(cover) ?? 0), by = coverBy === 1 ? 1 : 0;
  const single = pay.map(v => taxOf(v, 'single'));
  const coverTax = cv > 0 ? taxOf(pay[by] + cv, 'single') - single[by] : 0;
  const apart = single[0] + single[1] + coverTax, joint = taxOf(pay[0] + pay[1], 'joint');
  const pia = people.map(p => estNum(p.pia));
  const ss = pia.every(v => v != null) && typeof spousalOf === 'function'
    ? people.map((p, i) => { const own = pia[i], oth = pia[1 - i], top = spousalOf(own, oth); return { name: p.name, own, spousal: top, survivor: Math.max(own, oth), survivorMore: Math.max(0, oth - own) }; })
    : null;
  return {
    ready: true, pay, single, coverTax, cover: cv, coverBy: by, apart, joint,
    // more than 0: the joint return owes less (a marriage bonus); less than 0: it owes more (a marriage penalty)
    taxDiff: apart - joint,
    ss, ssYear: ss ? ss.reduce((s, r) => s + r.spousal, 0) * 12 : null,
  };
}
