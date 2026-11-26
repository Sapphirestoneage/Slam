// SPDX-License-Identifier: AGPL-3.0-only
// Your own path (run Not built, groups 1 to 5, Part 6; M8P): the money side of LGBTQ+ life, on the person's own numbers.
// Every cost here is typed by the person or comes from data/reference-2026.json with its official source and date
// (js/registry/assumptions.js). Nothing is guessed: where no official number could be found, the tool asks for the
// person's own (a quote, a letter, a bill) and says so.
//
//   saving toward an amount   what is left after what is saved, and the months at a monthly amount: opSaveOf (the one
//                             saving line under transition care, family building and care later in life)
//   the plan's share          a deductible, then coinsurance, capped by the out-of-pocket max: opCareShareOf
//   transition care           the quotes the plan covers through opCareShareOf, what it does not cover, help from a
//                             fund or a grant, then opSaveOf: opTransitionOf
//   ID papers, New York first the steps of a name and gender marker change with the dated fees: opPapersOf
//   two sides                 a year (or more) of staying quiet next to a year of being out, in the person's own
//                             numbers, and no answer about which: opTwoSidesOf
//   the whole package         pay plus benefits in dollars at two jobs, and the pay the new one needs to match: opPackageOf
//   your own feet             the runway engine (runwayOf, js/solo.js) on what life costs without family money: opOwnWayOf
//   a longer search           the emergency fund target (M43 ruleOf5, the Rule of 5) with the months the person adds
//                             for a longer job search: opSearchFundOf
//   the plan check            what a health plan covers for transition care, from yes / no / not sure taps: opPlanCheckOf
//   family building           IVF, surrogacy, adoption or fostering on the person's quotes, the federal adoption
//                             credit with its 2026 phase-out, then opSaveOf: opFamilyOf
//   care later in life        a month of care for some years, less what cover pays, and a month to set aside: opAgeCareOf
//
// Empty is not zero: a box not filled gives { ready: false }.
import { ruleOf5 } from './assets.js';
import { runwayOf } from '../solo.js';

const has = x => x !== null && x !== undefined && x !== '' && !Number.isNaN(Number(x));
const n0 = x => (has(x) ? Number(x) : 0);
const pos = x => Math.max(0, x);

// ---- Saving toward an amount ----
// left: what is still to find after what is saved. months: whole months at the monthly amount (a part month rounds
// up), null with no monthly amount; 0 when it is already there.
export function opSaveOf({ need = null, saved = 0, monthly = null } = {}) {
  if (!has(need)) return { ready: false };
  const left = pos(Number(need) - n0(saved));
  const months = left <= 0 ? 0 : n0(monthly) > 0 ? Math.ceil(left / Number(monthly) - 1e-9) : null;
  return { ready: true, need: Number(need), saved: n0(saved), left, there: left <= 0, monthly: n0(monthly), months };
}

// ---- The plan's share of one bill ----
// metSoFar: what the person has already paid toward the deductible and the out-of-pocket max this plan year.
// The deductible comes first, then coinsurance on the rest; the out-of-pocket max caps the person's part.
export function opCareShareOf({ cost = null, deductible = 0, coinsurance = null, oopMax = null, metSoFar = 0 } = {}) {
  if (!has(cost) || !has(coinsurance)) return { ready: false };
  const c = Number(cost), dedLeft = pos(n0(deductible) - n0(metSoFar)), fromDed = Math.min(c, dedLeft);
  const raw = fromDed + Number(coinsurance) * (c - fromDed), cap = has(oopMax) ? pos(Number(oopMax) - n0(metSoFar)) : Infinity;
  const you = Math.min(raw, cap);
  return { ready: true, cost: c, you, plan: c - you, fromDeductible: fromDed, coinsurancePart: you - fromDed, capped: raw > cap };
}

// ---- Transition care ----
// covered: the quotes for care the plan covers; notCovered: what it does not (travel, a night near the surgeon, time
// off, care outside the plan); help: a grant or a fund's award, taken off what is yours to pay.
export function opTransitionOf({ covered = null, notCovered = 0, deductible = 0, coinsurance = null, oopMax = null, metSoFar = 0, help = 0, saved = 0, monthly = null } = {}) {
  if (!has(covered) || (n0(covered) > 0 && !has(coinsurance)) || n0(covered) + n0(notCovered) <= 0) return { ready: false };
  const share = n0(covered) > 0 ? opCareShareOf({ cost: covered, deductible, coinsurance, oopMax, metSoFar }) : { you: 0, plan: 0, capped: false };
  const before = share.you + n0(notCovered), helpUsed = Math.min(n0(help), before), yours = before - helpUsed;
  return { ready: true, total: n0(covered) + n0(notCovered), planPays: share.plan, coveredYours: share.you, notCovered: n0(notCovered), capped: share.capped,
    help: helpUsed, yours, save: opSaveOf({ need: yours, saved, monthly }) };
}

// ---- ID papers: a name and gender marker change, New York first ----
// fees: ref.idChangeNY (each with its source and date in js/registry/assumptions.js). A step with no dated fee takes
// the person's own number (own.*); with none typed it is listed as "add your number", never counted as $0.
// court: 'nyc' (NYC Civil Court), 'ny' (Supreme or County Court in New York State), 'other' (another state: own.court).
// born: 'nys' (New York State outside the city), 'nyc', 'other'. id: 'license', 'id', 'none'. passport: 'within'
// (a name change within a year of the passport's issue date, Form DS-5504), 'renew' (Form DS-82), 'new' (Form DS-11),
// 'none'. copies: extra certified copies of a New York State birth certificate.
export const OP_COURTS = ['nyc', 'ny', 'other'], OP_BORN = ['nys', 'nyc', 'other'], OP_IDS = ['license', 'id', 'none'], OP_PASSPORT = ['within', 'renew', 'new', 'none'];
export function opPapersOf({ court = null, born = null, id = 'none', passport = 'none', copies = 0, own = {} } = {}, fees) {
  if (!court || !born) return { ready: false };
  const F = fees, steps = [];
  const step = (key, fee, from) => steps.push({ key, fee: has(fee) ? Number(fee) : null, from: has(fee) ? from : 'add' });
  if (court === 'nyc') step('court', F.courtNyc, 'dated');
  else if (court === 'ny') step('court', F.courtNyState, 'dated');
  else step('court', own.court, 'yours');
  step('orderCopies', own.orderCopies, 'yours'); // certified copies of the order: the fee is set by each county clerk
  if (born === 'nys') step('birth', F.birthNys + n0(copies) * F.birthNysCopy, 'dated');
  else step('birth', own.birth, 'yours'); // New York City: its own pages differ ($0 or $40); another state: its own fee
  step('ssa', F.ssaCard, 'dated');
  if (id === 'license') step('dmv', F.dmvLicense, 'dated');
  else if (id === 'id') step('dmv', F.dmvId, 'dated');
  if (passport === 'within') step('passport', F.passportCorrection, 'dated');
  else if (passport === 'renew') step('passport', F.passportBook, 'dated');
  else if (passport === 'new') step('passport', F.passportBook + F.passportExecution, 'dated');
  if (has(own.other) && Number(own.other) > 0) step('other', own.other, 'yours');
  const counted = steps.filter(s => s.fee != null);
  return { ready: true, steps, total: counted.reduce((s, x) => s + x.fee, 0), dated: counted.filter(s => s.from === 'dated').reduce((s, x) => s + x.fee, 0),
    yours: counted.filter(s => s.from === 'yours').reduce((s, x) => s + x.fee, 0), toAdd: steps.filter(s => s.fee == null).map(s => s.key) };
}

// ---- Two sides ----
// What staying quiet costs (a month, and once) next to what being out costs (a month, and once), over the years
// chosen. The person's own numbers only; the result names which side costs more in dollars and nothing else.
export function opTwoSidesOf({ quietMonthly = null, quietOnce = 0, outMonthly = null, outOnce = 0, years = 1 } = {}) {
  if (!has(quietMonthly) || !has(outMonthly) || !(n0(years) > 0)) return { ready: false };
  const quiet = Number(quietMonthly) * 12 * years + n0(quietOnce), out = Number(outMonthly) * 12 * years + n0(outOnce);
  return { ready: true, years, quiet, out, gap: Math.abs(quiet - out), more: quiet > out ? 'quiet' : out > quiet ? 'out' : 'even' };
}

// ---- The whole package: two jobs, pay plus benefits in dollars ----
// Each job: pay a year, what the employer pays toward health cover a month, care the plan covers that you would
// otherwise pay yourself (a year), a family-building benefit (a year), anything else in dollars (a year).
export const OP_PARTS = ['health', 'care', 'family', 'other'];
const pkg = j => ({ pay: Number(j.pay), health: n0(j.health) * 12, care: n0(j.care), family: n0(j.family), other: n0(j.other) });
export function opPackageOf({ now = {}, next = {} } = {}) {
  if (!has(now.pay) || !has(next.pay)) return { ready: false };
  const A = pkg(now), B = pkg(next), tot = p => p.pay + OP_PARTS.reduce((s, k) => s + p[k], 0);
  const benefitsNow = tot(A) - A.pay, benefitsNext = tot(B) - B.pay, gap = tot(A) - tot(B);
  return { ready: true, now: { ...A, benefits: benefitsNow, total: tot(A) }, next: { ...B, benefits: benefitsNext, total: tot(B) }, gap,
    payToMatch: gap > 0 ? B.pay + gap : null, parts: OP_PARTS.map(k => ({ key: k, now: A[k], next: B[k], gap: A[k] - B[k] })) };
}

// ---- Your own feet: a runway without family money ----
// ownCosts: what life would cost a month paid by you alone (rent, phone, insurance, food, school). stillIn: your own
// pay. The months are the plan's runway engine (runwayOf). planB: the quiet steps that fit the answers, in order.
export const OP_PLAN_B = ['account', 'papers', 'phone', 'health', 'school', 'place', 'people'];
export function opOwnWayOf({ cash = null, ownCosts = null, stillIn = 0, cut = 0, onFamilyPlan = null, student = null, now = new Date() } = {}) {
  const R = runwayOf({ cash: has(cash) ? Number(cash) : null, spending: has(ownCosts) ? Number(ownCosts) : null, stillIn: n0(stillIn), cut: n0(cut), now });
  const planB = OP_PLAN_B.filter(k => (k === 'health' ? onFamilyPlan === true : k === 'school' ? student === true : true));
  return { ...R, planB };
}

// ---- A longer job search: the emergency fund target with more months ----
// The target is the Rule of 5 (M43): age / 5 months of spending (times the stability multiplier when one is set).
// extraMonths: the months the person adds because a search can take longer for them. Nothing is assumed about how long.
export function opSearchFundOf({ age = null, spending = null, cash = null, extraMonths = 0, multiplier = 1 } = {}) {
  if (!has(age) || !has(spending) || !(Number(spending) > 0)) return { ready: false };
  const base = ruleOf5({ age: Number(age), spending: Number(spending), emergencyCash: has(cash) ? Number(cash) : null, multiplier });
  const months = base.months + n0(extraMonths), target = months * Number(spending);
  return { ready: true, baseMonths: base.months, baseTarget: base.value, extraMonths: n0(extraMonths), months, target, extra: target - base.value,
    cash: has(cash) ? Number(cash) : null, gap: has(cash) ? pos(target - Number(cash)) : null, covers: has(cash) ? Number(cash) / Number(spending) : null };
}

// ---- The plan check: what a health plan covers for transition care ----
// answers: { key: 'Yes' | 'No' | "Don't know" } for each of OP_CHECKS. ask: the ones to ask about, in order.
export const OP_CHECKS = ['noExclusion', 'hormones', 'surgery', 'mental', 'labs', 'leave', 'documents', 'fullyInsured'];
export function opPlanCheckOf(answers = {}) {
  const got = OP_CHECKS.filter(k => answers[k]);
  if (!got.length) return { ready: false };
  const is = v => OP_CHECKS.filter(k => answers[k] === v);
  return { ready: true, of: OP_CHECKS.length, answered: got.length, yes: is('Yes'), no: is('No'), unsure: is("Don't know"), ask: OP_CHECKS.filter(k => answers[k] !== 'Yes') };
}

// ---- Family building ----
// cost: the person's quotes for the whole path; insurance and employer: what each pays (typed). For adoption, the
// federal credit: qualified expenses (not the ones an employer paid back) up to the 2026 maximum, shrinking on a
// straight line between the phase-out start and end of modified AGI; up to `refundable` of it can come back even with
// no tax owed, the rest only lowers tax (rules: ref.adoptionCredit). Not a promise of the credit: the IRS rules decide.
export const OP_PATHS = ['ivf', 'surrogacy', 'adoption', 'foster'];
export function opAdoptionCreditOf({ expenses = null, magi = null } = {}, rules) {
  if (!has(expenses)) return { ready: false };
  const base = Math.min(pos(Number(expenses)), rules.max);
  const share = !has(magi) ? 1 : Number(magi) <= rules.phaseStart ? 1 : Number(magi) >= rules.phaseEnd ? 0 : 1 - (Number(magi) - rules.phaseStart) / (rules.phaseEnd - rules.phaseStart);
  const credit = base * share;
  return { ready: true, base, share, credit, refundable: Math.min(credit, rules.refundable), againstTax: credit - Math.min(credit, rules.refundable), magiKnown: has(magi) };
}
export function opFamilyOf({ path = null, cost = null, insurance = 0, employer = 0, magi = null, saved = 0, monthly = null } = {}, rules) {
  if (!path || !has(cost)) return { ready: false };
  const paid = Math.min(Number(cost), n0(insurance) + n0(employer)), yours = Number(cost) - paid;
  const credit = path === 'adoption' ? opAdoptionCreditOf({ expenses: pos(Number(cost) - n0(employer)), magi }, rules) : null;
  return { ready: true, path, cost: Number(cost), paid, yours, credit, afterCredit: credit ? pos(yours - credit.credit) : yours, save: opSaveOf({ need: yours, saved, monthly }) };
}

// ---- Care later in life ----
// A month of care (the person's quote) for some years, less what cover pays a month (long-term care insurance, a
// pension, family help), in today's dollars. perMonth: what to set aside each month to have it by then (no growth
// counted, so it is on the safe side).
export function opAgeCareOf({ monthly = null, years = null, covered = 0, saved = 0, yearsUntil = null } = {}) {
  if (!has(monthly) || !(n0(years) > 0)) return { ready: false };
  const need = pos(Number(monthly) - n0(covered)) * 12 * Number(years), left = pos(need - n0(saved));
  return { ready: true, need, left, there: left <= 0, perMonth: n0(yearsUntil) > 0 ? left / (Number(yearsUntil) * 12) : null, yearsUntil: has(yearsUntil) ? Number(yearsUntil) : null };
}
