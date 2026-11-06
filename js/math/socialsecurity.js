// SPDX-License-Identifier: AGPL-3.0-only
// M9J: Social Security for each person, in today's dollars (Phase 5, Batch 56; docs/engines/projection.md
// "Decumulation"). Math only: the projection engine (M9P) reads it; no screen does yet.
//
// The benefit at full retirement age (the primary insurance amount, PIA) comes from one of two places:
//   (a) the number the client types off their my Social Security statement ("at full retirement age"), with a level
//       like any input: Gut, Estimate or Know it (a typed number with no level reads Know it). Preferred.
//   (b) an estimate from earnings, when nothing is typed: the earnings history is estimated from today's pay and age
//       by one stated rule (estimateRule below), averaged into AIME and run through the PIA formula with the 2026 bend
//       points. Always a Gut-level range.
// Then the claim age (62 to 70, default the full retirement age for the birth year) reduces it or adds delayed
// credits; a spouse gets up to half the partner's PIA (reduced if claimed early, no credits for waiting), and a
// survivor keeps the larger of the two benefits.
//
// Today's dollars: a benefit rises with the COLA every December once paid, which only keeps pace with prices (the 2026
// COLA, 2.8%, is in nominal dollars), so in real terms a benefit is flat and the COLA drops out. The bend points rise
// with the national average wage before 62; with pay held flat after inflation (ProjectionRaise 0) a career at the
// same share of the average wage gives the same PIA in today's dollars, so the 2026 bend points apply as they are.
// Not in (SEAM, projection.md NOT_IN): the tax on benefits, the earnings test before full retirement age (flagged by
// the engine), the windfall rules, and a survivor claiming before their own full retirement age.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const SS_LEVELS = ['Gut', 'Estimate', 'Know it'];

// Full retirement age, in months, for a birth year (SSA's table; ref.socialSecurity.fra rows are [born in or after,
// months]). People born on January 1 use the year before; SLAM keeps no birth day, so that one day is not read.
export function fullRetirementMonths(birthYear, ss) {
  let out = ss.fra[0][1];
  for (const [from, months] of ss.fra) if (birthYear >= from) out = months;
  return out;
}

// The PIA formula: 90% of AIME up to the first bend point, 32% up to the second, 15% above it (SSA, 2026 bend points).
// SSA rounds the PIA down to the dime and the payment down to the dollar; an estimate is left to the cent.
export function piaOf(aime, ss) {
  const a = Math.max(0, aime ?? 0), b1 = ss.bendPoint1, b2 = ss.bendPoint2;
  return ss.piaRate1 * Math.min(a, b1) + ss.piaRate2 * clamp(a - b1, 0, b2 - b1) + ss.piaRate3 * Math.max(0, a - b2);
}

// Your own benefit at a claim age (both in months), as a share of the PIA: 5/9 of 1% a month for the first 36 months
// early, 5/12 of 1% a month beyond; 8% a year (2/3 of 1% a month) for each month waited past full retirement age, to 70.
export function claimFactor(claimMonths, fraMonths, ss) {
  if (claimMonths >= fraMonths) return 1 + ss.delayedPerYear / 12 * (Math.min(claimMonths, ss.latestAge * 12) - fraMonths);
  const m = fraMonths - claimMonths;
  return 1 - Math.min(m, 36) * ss.earlyFirst36 - Math.max(0, m - 36) * ss.earlyBeyond;
}

// A spouse's benefit, as a share of half the partner's PIA, by the age it starts: 25/36 of 1% a month for the first
// 36 months early, 5/12 of 1% beyond; nothing more for waiting past full retirement age.
export function spousalFactor(startMonths, fraMonths, ss) {
  if (startMonths >= fraMonths) return 1;
  const m = fraMonths - startMonths;
  return 1 - Math.min(m, 36) * ss.spousalFirst36 - Math.max(0, m - 36) * ss.spousalBeyond;
}

// The estimate from earnings (b). The stated rule: the person earns the same share of the national average wage every
// year from careerStartAge (22) to their stop age as today's gross pay is of it, capped at the wage base each year.
// In wage-indexed dollars that is today's pay every year; the best 35 years are averaged (zeros fill a shorter
// career) and divided by 12. No pay on file: no earnings record, so only a spousal or survivor benefit.
export const estimateRule = 'today\'s gross pay every year from 22 to the stop age (the same share of the national average wage), capped at the wage base; the best 35 years averaged';
export function aimeFromPay({ grossYear, stopAge }, ss, wageBase) {
  const years = clamp((stopAge ?? 0) - ss.careerStartAge, 0, ss.computationYears);
  const yearly = Math.min(Math.max(0, grossYear ?? 0), wageBase ?? Infinity);
  return { aime: yearly * years / ss.computationYears / 12, years, yearly };
}

// One person's benefit. person: { key, bornIndex (year x 12 + month), stopAge, gross (a year, today's), ssBenefit (the
// statement's PIA, a month), ssLevel, ssClaimAge (years, blank: full retirement age) }. widths: { Gut, Estimate } the
// share either way a typed number moves at that level (RULES.rangeIncomeGut and rangeIncomeEstimate); the estimate
// moves its AIME by the Gut width, so the range is the PIA formula at the two ends.
export function benefitOf(person, ss, { wageBase, widths }) {
  if (person.bornIndex == null) return { key: person.key, source: 'none', pia: 0, own: 0, words: 'No birth year: no benefit counted yet.' };
  const birthYear = Math.floor(person.bornIndex / 12);
  const fra = fullRetirementMonths(birthYear, ss);
  const typed = person.ssBenefit != null && person.ssBenefit !== '' && Number.isFinite(Number(person.ssBenefit));
  const claimAge = person.ssClaimAge != null && person.ssClaimAge !== '' ? clamp(Number(person.ssClaimAge), ss.earliestAge, ss.latestAge) : fra / 12;
  const claim = Math.round(claimAge * 12);
  let pia, low, high, level, source, est = null;
  if (typed) {
    pia = Math.max(0, Number(person.ssBenefit)); level = SS_LEVELS.includes(person.ssLevel) ? person.ssLevel : 'Know it'; source = 'statement';
    const w = level === 'Know it' ? 0 : widths[level] ?? 0;
    low = pia * (1 - w); high = pia * (1 + w);
  } else {
    est = aimeFromPay({ grossYear: person.gross, stopAge: person.stopAge }, ss, wageBase);
    pia = piaOf(est.aime, ss); level = 'Gut'; source = est.yearly > 0 ? 'estimate' : 'none';
    low = piaOf(est.aime * (1 - widths.Gut), ss); high = piaOf(est.aime * (1 + widths.Gut), ss);
  }
  const f = claimFactor(claim, fra, ss);
  const money = v => `$${Math.round(v).toLocaleString('en-US')}`;
  const ageWords = m => `${Math.floor(m / 12)}${m % 12 ? ` and ${m % 12} months` : ''}`;
  const words = source === 'statement' ? `${money(pia)} a month at full retirement age (${ageWords(fra)}), from the statement (${level}); claimed at ${ageWords(claim)}: ${money(pia * f)} a month.`
    : source === 'estimate' ? `About ${money(pia)} a month at full retirement age (${ageWords(fra)}), estimated from ${money(est.yearly)} a year for ${est.years} years (${money(low)} to ${money(high)}); claimed at ${ageWords(claim)}: ${money(pia * f)} a month. The statement's number is better.`
      : 'No pay on file and no statement number: no benefit of their own counted.';
  return { key: person.key, source, level, fraMonths: fra, claimMonths: claim, claimIndex: person.bornIndex + claim, factor: f, pia, low, high, own: pia * f, aime: est?.aime ?? null, years: est?.years ?? null, words };
}

// The household's benefits, month by month. people: as benefitOf, plus endIndex (the month index they reach Plan to
// age; their own benefit stops then and a survivor keeps the larger). Returns { people (each benefitOf plus
// spousal: the top-up a month, spousalIndex: from when), at(i): the household's benefits in month index i, each(i):
// by person, survivorFloor }. trustCut: from January of ss.trustFund.year, every benefit times ss.trustFund.payable.
export function householdBenefits(people, ss, { wageBase, widths, trustCut = false }) {
  const list = people.map(p => ({ ...benefitOf(p, ss, { wageBase, widths }), endIndex: p.endIndex ?? Infinity }));
  // The spousal top-up: half the partner's PIA, less your own PIA, reduced for your age when it starts, from the later
  // of your claim and the partner's (a spouse's benefit needs the worker to have filed).
  if (list.length === 2) for (const [a, b] of [[list[0], list[1]], [list[1], list[0]]]) {
    if (a.source === 'none' && a.fraMonths == null) continue;
    const excess = Math.max(0, ss.spousalShare * (b.pia ?? 0) - (a.pia ?? 0));
    if (!excess || b.claimIndex == null || a.claimIndex == null) { a.spousal = 0; a.spousalIndex = null; continue; }
    a.spousalIndex = Math.max(a.claimIndex, b.claimIndex);
    a.spousal = excess * spousalFactor(a.claimMonths + (a.spousalIndex - a.claimIndex), a.fraMonths, ss);
  }
  const cut = i => (trustCut && Math.floor(i / 12) >= ss.trustFund.year ? ss.trustFund.payable : 1);
  // What one person is paid in month i while both are alive.
  const living = (p, i) => (p.claimIndex == null || i < p.claimIndex ? 0 : p.own + (p.spousalIndex != null && i >= p.spousalIndex ? p.spousal : 0));
  // A survivor's benefit: the benefit the one who died was getting, at least 82.5% of their PIA (SSA's limit when they
  // claimed early); taken from the later of the death and the survivor's own claim (a survivor past full retirement
  // age, as nearly everyone is by Plan to age).
  const survivorOf = dead => Math.max(dead.own, dead.factor < 1 ? ss.survivorFloor * dead.pia : 0);
  const each = i => list.map((p, n) => {
    if (i >= p.endIndex) return 0;
    const o = list[1 - n];
    if (!o || i < o.endIndex) return living(p, i) * cut(i);
    const own = p.claimIndex == null || i < p.claimIndex ? 0 : p.own;
    return (i >= Math.max(o.endIndex, p.claimIndex ?? Infinity) ? Math.max(own, survivorOf(o)) : own) * cut(i);
  });
  return { people: list, each, at: i => each(i).reduce((s, v) => s + v, 0), cut };
}
