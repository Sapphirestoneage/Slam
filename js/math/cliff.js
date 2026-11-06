// SPDX-License-Identifier: AGPL-3.0-only
// The benefits cliff (batch 47, Phase 4 Track 2, M9B; ported from the older suite's engines/cliff.js, D-301, and
// brought up to date): which benefit lines a raise or a new income crosses, and what the household keeps. Pure: no
// DOM. The screen (js/ui/cliff-ui.js) only shows what comes back.
//
// Every line is a multiple of the 2026 poverty guideline for the household's size (ref.studentLoans.poverty, the one
// copy), or a table of its own, all in ref.cliff with sources on the Assumptions tab:
//   SNAP (food)          the gross monthly test: the federal 130% table (FY2027), or in New York 150% with earned income
//                        and 200% with child care paid out of pocket or someone 60 or older (OTDA GIS 25DC059); outside
//                        New York the federal net test (100%) too. The benefit: the most for the size less 30% of net
//                        income (gross less 20% of earnings, the standard deduction and the shelter costs over half of
//                        what is left, capped), at least the minimum for one or two people.
//   Medicaid (adults)    138% of the line, in the states that expanded it.
//   The Essential Plan   New York only: free coverage up to 200% since July 1 2026 (the 200% to 250% band ended).
//   Premium help         the marketplace credit: the benchmark plan less the share of income the household pays
//                        (the IRS table for 2027, a straight line inside each band), and none over 400% (the 2021 to
//                        2025 rule that removed the 400% line ended with 2025).
//   Children             New York: Medicaid to 154% (223% under age 1), Child Health Plus free to 222%, then $15 to $60
//                        a month a child by band to 400%, full price over it (not priced here).
//   EITC                 the federal credit for tax year 2026 by children, phased in and out, plus New York's share.
// Health coverage is one chain (Medicaid, then the Essential Plan in New York, then the marketplace with help, then full
// price): what a raise costs there is what the next coverage costs over what the household pays now.
import { fmt } from './result.js';
import { householdTax } from './income.js';
import { ageOf } from './metrics.js';
import { lenderKind } from './lender.js';
import { myShare } from './spending.js';
import { extraAdults, dependentsOf } from '../registry/couples.js';

export const CLIFF_STATUS = ['Getting it', 'Might qualify', 'Not on it'];
export const CLIFF_PROGRAMS = [
  { id: 'snap', label: 'SNAP (food)', short: 'SNAP' },
  { id: 'medicaid', label: 'Medicaid', short: 'Medicaid' },
  { id: 'essential', label: 'The Essential Plan', short: 'the Essential Plan' },
  { id: 'aca', label: 'Marketplace premium help', short: 'the premium help' },
  { id: 'kids', label: 'Children\'s coverage (Medicaid, Child Health Plus)', short: 'the children\'s coverage' },
  { id: 'eitc', label: 'Earned income credit (EITC)', short: 'the EITC' },
];
export const RAISE_PICKS = [1000, 5000, 10000];
export const cliffOn = doc => doc?.settings?.phase4 === true;
const HEALTH = new Set(['medicaid', 'essential', 'aca']);
const num = x => (x === null || x === undefined || x === '' || Number.isNaN(Number(x)) ? null : Number(x));
const bySize = (list, each, size) => (size <= list.length ? list[size - 1] : list.at(-1) + (each ?? 0) * (size - list.length));
const k = v => fmt.money(Math.round(v / 100) * 100); // a line in a year, to the nearest $100 (it is never more exact than that)

// The poverty guideline a year for a household of this size (HHS 2026, the 48 states and DC).
export const fplOf = (ref, size) => ref.studentLoans.poverty.base + ref.studentLoans.poverty.perPerson * Math.max(0, size - 1);

// The household as the lines read it: who is in it, what it makes a year, and its shelter costs a month.
export function cliffHousehold(doc, ref, { now = new Date(), m } = {}) {
  const p = doc.profile || {}, x = m.inputs;
  const adults = (p.household === 'Couple' ? 2 : 1) + extraAdults(doc).length; // batch 49: the adults past the couple on About you › People
  const ages = (Array.isArray(p.kidAges) ? p.kidAges : String(p.kidAges ?? '').split(',')).map(num).filter(v => v !== null);
  // Batch 49: with dependents listed on About you › People, the children are the ones whose role is Child (or not set);
  // a parent you support (or another dependent) is in the household's size but is not a child for the EITC or CHIP.
  const deps = dependentsOf(doc), others = deps.filter(x => x.role && x.role !== 'Child').length;
  const kids = deps.length ? Math.max(deps.length - others, ages.length) : Math.max(num(p.dependents) ?? 0, ages.length);
  const hh = x.householdTax?.rows || {};
  let earned = 0, unearned = 0, pretax = 0, seHalf = 0;
  const rows = [];
  for (const i of x.income || []) {
    const kind = lenderKind(i.r), th = i.takeHome?.value ?? null;
    if (kind === 'gift') continue;
    const yearly = kind === 'paycheck' ? (i.gross ?? (th !== null ? th * 12 : 0)) + Math.max(0, i.grossExtra ?? 0)
      : kind === 'self' ? i.gross ?? (th !== null ? th * 12 : 0)
        : kind === 'unemployment' ? (i.benefit?.monthly ?? th ?? 0) * 12 : (th ?? 0) * 12;
    if (kind === 'paycheck' || kind === 'self') earned += yearly; else unearned += yearly;
    pretax += i.pretax ?? 0; seHalf += hh[i.r.id]?.seHalf ?? 0;
    rows.push({ id: i.r.id, person: hh[i.r.id]?.person ?? 'Me', gross: i.benefit ? i.benefit.thisYear : i.gross, pretax: i.pretax, taxType: i.benefit ? 'Unemployment' : i.taxType, tips: i.tipsYear ?? 0 });
  }
  const lines = x.lines || [], roommates = p.roommates ?? 0;
  const monthOf = cat => lines.filter(l => l.category === cat && l.amount != null).reduce((s, l) => s + (myShare(l, { roommates }).value ?? 0), 0);
  const age = ageOf(p, now);
  return {
    state: p.state || null, nyc: p.nyc === true, coverage: p.healthCoverage ?? null, adults, kids, others, ages, size: adults + kids + others, age,
    elderly: age !== null && age >= 60, care: p.cliff?.careCosts === true, joint: x.filingStatus === 'Married jointly',
    filingStatus: x.filingStatus, place: x.place, earned, unearned, gross: earned + unearned, magi: Math.max(0, earned + unearned - pretax - seHalf),
    rentMonthly: monthOf('Rent or mortgage'), utilitiesMonthly: monthOf('Electric, gas, water'), taxRows: rows, has: rows.length > 0,
    statuses: p.cliff || {}, snapTyped: num(p.cliff?.snapAmount),
  };
}

// ---------- SNAP ----------
// The gross monthly line for this household: its multiple of the guideline and where the rule comes from.
export function snapLine(H, ref) {
  const S = ref.cliff.snap, f = fplOf(ref, H.size) / 12;
  if (H.state === 'NY') {
    if (H.care || H.elderly) return { multiple: S.nyCareMultiple, monthly: f * S.nyCareMultiple, why: 'New York: 200% of the line with child care paid out of pocket or someone 60 or older at home' };
    if (H.earned > 0) return { multiple: S.nyEarnedMultiple, monthly: f * S.nyEarnedMultiple, why: 'New York: 150% of the line for a household with earnings' };
  }
  return { multiple: S.baseMultiple, monthly: bySize(S.gross, S.grossEach, H.size), why: H.state === 'NY' ? 'New York: the federal 130% line with no earnings' : 'The federal 130% line (many states lift it; the state\'s own page has its line)' };
}
// The SNAP benefit a month at a gross and earned income a year.
export function snapBenefit(H, ref, { gross = H.gross, earned = H.earned } = {}) {
  const S = ref.cliff.snap, line = snapLine({ ...H, earned }, ref);
  const g = gross / 12, e = earned / 12;
  const adj = Math.max(0, g - S.earnedShare * e - bySize(S.standardDeduction, 0, H.size));
  const utilities = H.state === 'NY' ? (H.utilitiesMonthly > 0 ? S.nySua[H.nyc ? 'nyc' : 'rest'] : 0) : H.utilitiesMonthly;
  const shelter = H.rentMonthly + utilities;
  const excessAll = Math.max(0, shelter - S.shelterShare * adj);
  const excess = H.elderly ? excessAll : Math.min(excessAll, S.shelterCap);
  const net = Math.max(0, adj - excess);
  const netLine = bySize(S.net, S.netEach, H.size);
  const eligible = g <= line.monthly + 1e-9 && (H.state === 'NY' || net <= netLine + 1e-9);
  let monthly = Math.max(0, Math.floor(bySize(S.maxAllotment, S.allotmentEach, H.size) - Math.ceil(S.benefitShare * net)));
  if (eligible && H.size <= S.minimumUpTo) monthly = Math.max(monthly, S.minimum);
  if (!eligible) monthly = 0;
  return { eligible, monthly, gross: g, net, adj, shelter, utilities, excess, line, netLine };
}

// ---------- Health coverage: one chain ----------
// The marketplace share of income a household pays at this multiple of the line (the IRS table, a straight line inside
// each band). Null over the 400% line: no help there.
export function applicablePct(ratio, ref) {
  const A = ref.cliff.aca;
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
export const benchmarkOf = (H, ref) => (ref.cliff.aca.benchmark40[H.state] ?? ref.cliff.aca.benchmarkUs) * 12 * H.adults;
// What the adults pay a year for health coverage at this MAGI, and on what.
export function healthAt(H, ref, magi) {
  const f = fplOf(ref, H.size), ratio = magi / f, bench = benchmarkOf(H, ref);
  const expanded = !ref.cliff.medicaid.nonExpansion.includes(H.state);
  if (expanded && ratio <= ref.cliff.medicaid.adultMultiple + 1e-9) return { on: 'medicaid', cost: 0, help: bench, ratio, bench };
  if (H.state === 'NY' && ratio <= ref.cliff.ny.essentialMultiple + 1e-9) return { on: 'essential', cost: ref.cliff.ny.essentialPremium * 12 * H.adults, help: bench, ratio, bench };
  if (ratio < ref.cliff.aca.floorMultiple) return { on: 'gap', cost: bench, help: 0, ratio, bench };
  const pct = applicablePct(ratio, ref);
  if (pct === null) return { on: 'full', cost: bench, help: 0, ratio, bench, pct: null };
  const cost = Math.min(bench, pct * magi);
  return { on: 'aca', cost, help: bench - cost, ratio, bench, pct };
}
// New York's children's coverage: what it costs a month for all the children at this MAGI (null over 400%: full price,
// not priced here).
export function kidsAt(H, ref, magi) {
  const N = ref.cliff.ny, ratio = magi / fplOf(ref, H.size);
  if (H.state !== 'NY' || !H.kids) return null;
  let cost = 0, on = 'medicaid', unpriced = false;
  for (let i = 0; i < H.kids; i++) {
    const age = H.ages[i] ?? 5;
    if (ratio <= (age < 1 ? N.infantMedicaidMultiple : N.kidsMedicaidMultiple) + 1e-9) continue;
    if (on === 'medicaid') on = 'chp';
    if (ratio <= N.chpFreeMultiple + 1e-9) continue;
    const band = N.chpBands.find(([upTo]) => ratio <= upTo + 1e-9);
    if (!band) { unpriced = true; on = 'full'; continue; }
    cost += band[1] * 12;
  }
  return { on, cost: unpriced ? null : cost, ratio };
}

// ---------- EITC ----------
export function eitcOf(H, ref, { earned = H.earned, agi = H.magi } = {}) {
  const E = ref.cliff.eitc, n = Math.min(3, H.kids);
  const [, earnedAmount, max, thrS, thrJ, endS, endJ] = E.rows[n];
  const thr = H.joint ? thrJ : thrS, end = H.joint ? endJ : endS;
  const tooYoung = n === 0 && H.age !== null && (H.age < E.childlessAgeMin || H.age > E.childlessAgeMax);
  if (tooYoung || earned <= 0) return { federal: 0, state: 0, total: 0, end, thr, kids: n, ageOut: tooYoung };
  const phased = Math.min(max, earned * max / earnedAmount);
  const federal = Math.max(0, phased - Math.max(0, Math.max(earned, agi) - thr) * max / (end - thr));
  const state = H.state === 'NY' ? federal * E.nyShare : 0;
  return { federal, state, total: federal + state, end, thr, kids: n, ageOut: false };
}

// ---------- Each program at one income ----------
// add: a raise or a new income a year (earned, a paycheck).
export function programsAt(H, ref, add = 0) {
  const gross = H.gross + add, earned = H.earned + add, magi = H.magi + add;
  const snap = snapBenefit(H, ref, { gross, earned });
  return { snap, health: healthAt(H, ref, magi), kids: kidsAt(H, ref, magi), eitc: eitcOf(H, ref, { earned, agi: magi }), gross, earned, magi };
}

// What the household's status is on each program: as tapped, or a Guess from About you and the income.
function statusGuess(id, H, ref, now) {
  const c = H.coverage, r = now.health.ratio;
  const N = ref.cliff;
  if (id === 'snap') return now.snap.eligible ? 'Might qualify' : 'Not on it';
  if (id === 'medicaid') return c === 'Medicaid' ? 'Getting it' : (c === 'None' || c == null) && now.health.on === 'medicaid' ? 'Might qualify' : 'Not on it';
  if (id === 'essential') return c === 'ACA' && now.health.on === 'essential' ? 'Getting it' : (c === 'None' || c == null) && now.health.on === 'essential' ? 'Might qualify' : 'Not on it';
  if (id === 'aca') return c === 'ACA' && now.health.on === 'aca' ? 'Getting it' : (c === 'None' || c == null) && now.health.on === 'aca' ? 'Might qualify' : 'Not on it';
  if (id === 'kids') return H.kids && r <= N.aca.cliffMultiple ? (c === 'Medicaid' ? 'Getting it' : 'Might qualify') : 'Not on it';
  if (id === 'eitc') return now.eitc.total > 0 ? 'Might qualify' : 'Not on it';
  return 'Not on it';
}
function applies(id, H, ref) {
  if (id === 'medicaid' && ref.cliff.medicaid.nonExpansion.includes(H.state)) return `${H.state} has not expanded Medicaid, so adults without a disability mostly cannot get it at any income.`;
  if (id === 'essential' && H.state !== 'NY') return 'The Essential Plan is New York\'s.';
  if (id === 'kids' && !H.kids) return 'No children on About you.';
  if (id === 'kids' && H.state !== 'NY') return `Children's Medicaid and CHIP lines vary by state; ${H.state || 'your state'}'s are not on file yet.`;
  return null;
}

// The line each program ends at, a year, on its own basis, from where the household is now.
function lineOf(id, H, ref, now) {
  const f = fplOf(ref, H.size), N = ref.cliff;
  if (id === 'snap') { const L = snapLine(H, ref); return { yearly: L.monthly * 12, basis: 'gross', at: H.gross, multiple: L.multiple, why: L.why }; }
  if (id === 'medicaid') return { yearly: f * N.medicaid.adultMultiple, basis: 'magi', at: H.magi, multiple: N.medicaid.adultMultiple };
  if (id === 'essential') return { yearly: f * N.ny.essentialMultiple, basis: 'magi', at: H.magi, multiple: N.ny.essentialMultiple };
  if (id === 'aca') return { yearly: f * N.aca.cliffMultiple, basis: 'magi', at: H.magi, multiple: N.aca.cliffMultiple };
  if (id === 'kids') {
    const steps = [N.ny.kidsMedicaidMultiple, N.ny.chpFreeMultiple, ...N.ny.chpBands.map(b => b[0])];
    const next = steps.find(s => s * f > H.magi + 0.5) ?? N.aca.cliffMultiple;
    return { yearly: f * next, basis: 'magi', at: H.magi, multiple: next };
  }
  return { yearly: now.eitc.end, basis: 'earned', at: Math.max(H.earned, H.magi), multiple: null };
}
// What it is worth a year now.
function worthOf(id, now, H) {
  if (id === 'snap') return now.snap.monthly * 12;
  if (HEALTH.has(id)) return now.health.on === id ? now.health.help : 0;
  if (id === 'kids') return now.kids ? (now.kids.cost ?? 0) : 0;
  return now.eitc.total;
}

// ---------- The raise ----------
const taxOf = (H, ref, add) => householdTax(add > 0 ? [...H.taxRows, { id: 'cliff:raise', person: 'Me', gross: add, pretax: 0, taxType: 'W-2', tips: 0 }] : H.taxRows,
  { filingStatus: H.filingStatus, place: H.place }, ref).total.all;
// The raise (or new income) a year: what it keeps after tax, what each counted benefit loses, and the net.
export function raiseOf(H, ref, raise, { counted, base = programsAt(H, ref, 0), tax0 = taxOf(H, ref, 0) } = {}) {
  const at = programsAt(H, ref, raise);
  const afterTax = raise - (taxOf(H, ref, raise) - tax0);
  const lost = [];
  if (counted.has('snap')) {
    const typed = H.snapTyped, est = base.snap.monthly - at.snap.monthly;
    const was = (typed ?? base.snap.monthly) * 12, now = at.snap.eligible ? Math.max(0, (typed ?? base.snap.monthly) - est) * 12 : 0;
    if (was - now > 0.5) lost.push({ id: 'snap', amount: was - now, ends: !at.snap.eligible });
  }
  const health = [...HEALTH].find(id => counted.has(id));
  if (health) {
    const d = at.health.cost - base.health.cost;
    if (d > 0.5 || at.health.on !== base.health.on) lost.push({ id: health, amount: Math.max(0, d), ends: at.health.on !== base.health.on, from: base.health.on, to: at.health.on });
  }
  if (counted.has('kids') && base.kids) {
    const unpriced = at.kids?.cost === null;
    const d = unpriced ? null : (at.kids?.cost ?? 0) - (base.kids.cost ?? 0);
    if (unpriced || d > 0.5) lost.push({ id: 'kids', amount: d, ends: at.kids?.on !== base.kids.on, unpriced });
  }
  if (counted.has('eitc')) { const d = base.eitc.total - at.eitc.total; if (d > 0.5) lost.push({ id: 'eitc', amount: d, ends: at.eitc.total <= 0 }); }
  const lostTotal = lost.reduce((s, l) => s + (l.amount ?? 0), 0);
  return { raise, afterTax, tax: raise - afterTax, lost, lostTotal, net: afterTax - lostTotal, unpriced: lost.some(l => l.unpriced), at };
}
// The smallest raise at or above this one that leaves the household no worse off (steps of $100), or null past $150,000.
export function breakEven(H, ref, raise, opts) {
  for (let r = Math.ceil(raise / 100) * 100; r <= raise + 150000; r += 100) if (raiseOf(H, ref, r, opts).net >= 0) return r;
  return null;
}

const ZONE_TO = 50000;
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
const label = id => CLIFF_PROGRAMS.find(p => p.id === id)?.label ?? id;
const short = id => CLIFF_PROGRAMS.find(p => p.id === id)?.short ?? id;
const ON = { medicaid: 'Medicaid', essential: 'the Essential Plan (free)', aca: 'a marketplace plan with help', full: 'a marketplace plan at full price', gap: 'a marketplace plan with no help' };
function lostText(l, H, ref, at) {
  if (l.id === 'snap') return l.ends ? `SNAP ends: ${fmt.money(l.amount)} a year` : `SNAP drops by ${fmt.money(l.amount)} a year`;
  if (HEALTH.has(l.id)) {
    if (l.from === l.to) return `Health coverage costs ${fmt.money(l.amount)} more a year (the share of income you pay rises)`;
    return `${label(l.id)} ends: you move to ${ON[l.to]}${l.amount > 0.5 ? `, about ${fmt.money(l.amount)} a year` : ''}`;
  }
  if (l.id === 'kids') return l.unpriced ? 'Child Health Plus goes to full price (not priced here)' : `The children's coverage costs ${fmt.money(l.amount)} more a year`;
  return l.ends ? `The EITC ends: ${fmt.money(l.amount)} a year` : `The EITC drops by ${fmt.money(l.amount)} a year`;
}

// ---------- The whole read ----------
// m: metrics(doc, ref, { now }) for the household together. raise: the raise to test a year (null: none yet).
export function cliffOf(doc, ref, { now = new Date(), m, raise = null } = {}) {
  const H = cliffHousehold(doc, ref, { now, m });
  const base = programsAt(H, ref, 0);
  const programs = CLIFF_PROGRAMS.map(p => {
    const why = applies(p.id, H, ref);
    if (why) return { ...p, applies: false, why };
    const tapped = H.statuses[p.id] ?? null;
    const status = CLIFF_STATUS.includes(tapped) ? tapped : statusGuess(p.id, H, ref, base);
    const L = lineOf(p.id, H, ref, base);
    const over = L.at > L.yearly + 0.5;
    return { ...p, applies: true, status, guess: !CLIFF_STATUS.includes(tapped), line: L.yearly, basis: L.basis, at: L.at, distance: L.yearly - L.at, over, multiple: L.multiple, lineWhy: L.why ?? null,
      worth: p.id === 'snap' && H.snapTyped !== null ? H.snapTyped * 12 : worthOf(p.id, base, H) };
  });
  // Getting it with an income already over its line (a renewal not yet run): the raise cannot cross it again, so it is
  // said apart and left out of the raise. Health counts only for the program the income puts the household on now.
  for (const p of programs) if (p.applies && p.status === 'Getting it') p.past = p.id === 'snap' ? !base.snap.eligible : HEALTH.has(p.id) ? base.health.on !== p.id : p.id === 'eitc' ? base.eitc.total <= 0 : p.over;
  const live = programs.filter(p => p.applies && p.status !== 'Not on it');
  const counted = new Set(programs.filter(p => p.applies && p.status === 'Getting it' && !p.past).map(p => p.id));
  const past = programs.filter(p => p.past);
  const near = live.length > 0;
  const ahead = live.filter(p => !p.over && p.distance > 0).sort((a, b) => a.distance - b.distance);
  const next = ahead[0] ?? null;
  const tax0 = taxOf(H, ref, 0);
  const opts = { counted, base, tax0 };
  const R = raise > 0 ? raiseOf(H, ref, raise, opts) : null;
  const even = R && R.net < -0.5 ? breakEven(H, ref, raise, opts) : null;
  // Where a raise leaves the household behind: every raise from $100 to ZONE_TO in $100 steps, the runs where the net is under zero.
  const zones = [];
  if (counted.size) for (let r = 100; r <= ZONE_TO; r += 100) {
    const n = raiseOf(H, ref, r, opts).net;
    if (n >= -0.5) continue;
    const last = zones.at(-1);
    if (last && last.to === r - 100) { last.to = r; last.worst = Math.min(last.worst, n); } else zones.push({ from: r, to: r, worst: n });
  }
  const crossed = R ? live.filter(p => !p.over && p.distance > 0 && p.distance <= raise) : [];
  const might = crossed.filter(p => p.status === 'Might qualify');
  const say = !R ? null
    : R.net < -0.5 ? `A ${fmt.money(raise)} raise leaves you ${fmt.money(-R.net)} a year behind${even ? `, until it is ${fmt.money(even)}` : ', even at $150,000 more'}.`
      : R.lost.length ? `A ${fmt.money(raise)} raise leaves you ${fmt.money(R.net)} a year ahead after tax and the benefits it changes.`
        : `A ${fmt.money(raise)} raise leaves you ${fmt.money(R.net)} a year ahead after tax; it changes no benefit you get.`;
  const basisWords = { gross: 'before tax', magi: 'before tax, less pre-tax money (MAGI)', earned: 'earned' };
  return {
    id: 'M9B', has: H.has, near, household: H, fpl: fplOf(ref, H.size), programs, live, counted: [...counted], next, base,
    nextText: next ? `${cap(short(next.id))} ${next.id === 'kids' ? 'changes' : next.id === 'eitc' ? 'runs out' : 'ends'} at ${k(next.line)} a year, ${k(next.distance)} above what you make now.` : null,
    nextBasis: next ? `${k(next.line)} ${basisWords[next.basis]}` : null,
    zones, zonesText: zones.length ? `${zones.map(z => z.from === z.to ? `A raise of ${fmt.money(z.from)}` : `Raises from ${fmt.money(z.from)} to ${fmt.money(z.to)}`).join(', and ')} a year leave you behind${zones.length === 1 ? ` (at worst ${fmt.money(-zones[0].worst)} a year)` : ''}.` : counted.size ? `No raise up to ${fmt.money(ZONE_TO)} a year leaves you behind.` : null,
    past: past.map(p => p.id),
    pastText: past.length ? `Your income is already over the line for ${past.map(p => `${short(p.id)} (${k(p.line)} a year)`).join(' and ')}: it may end at the next renewal, whatever the raise.` : null,
    nowhere: !near ? `Nowhere near a benefit line: at ${k(H.gross)} a year before tax${['Employer', "Parent's plan", 'Other'].includes(H.coverage) ? ', with health coverage through work or family,' : ''} no line a raise could cross applies.` : null,
    raise: R ? { ...R, even, say, crossed: crossed.map(p => p.id), might: might.map(p => p.id),
      mightText: might.length ? `It also passes the line for ${might.map(p => short(p.id)).join(' and ')}, which you might qualify for now.` : null,
      rows: R.lost.map(l => ({ ...l, label: label(l.id), text: lostText(l, H, ref, R.at) })) } : null,
    value: R ? R.net : null,
  };
}
