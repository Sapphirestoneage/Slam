// SPDX-License-Identifier: AGPL-3.0-only
// Employer benefits (missed ideas M2): what the job offers, a yearly amount for each, and the commuter nudge.
// Pure: no DOM. Answers live in doc.profile.benefits[key] = { have: 'Yes' | 'No' | "Don't know", amount, per, ... }.
import { money } from './format.js';
import { bpCommuter, bpRules, bpOptimize, bpEmployer, bpEmployers, bpEligible, bpPlans, BP_ON } from './math/benefitsplan.js';
import { kidsOf } from './math/income.js';
import { cliffHousehold } from './math/cliff.js';

export const BENEFITS = [
  { key: 'commuter', label: 'Commuter (pre-tax transit and parking)', where: 'Benefits portal: commuter or transit' },
  { key: 'healthFsa', label: 'Health FSA', where: 'Benefits portal or pay stub: FSA' },
  { key: 'dependentFsa', label: 'Dependent care FSA', where: 'Benefits portal: dependent care' },
  { key: 'espp', label: 'ESPP (discounted company stock)', where: 'Equity or ESPP site' },
  { key: 'tuition', label: 'Tuition reimbursement', where: 'Employee handbook or HR site' },
  { key: 'employerHsa', label: 'Employer HSA contribution', where: 'Benefits portal or HSA site: employer contributions' },
  { key: 'afterTax401k', label: 'After-tax 401(k) contributions', where: '401(k) site: contribution types' },
];
export const HAVE = ['Yes', 'No', "Don't know"];
const PAYS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };
export const TRANSIT = new Set(['Transit', 'Transit, Uber', 'Tolls and parking']);

// A benefit's dollars a year: per paycheck x paychecks, or as typed per year. Null when not a yes or not typed.
export function benefitYearly(b, payFrequency = null) {
  if (!b || b.have !== 'Yes' || b.amount == null) return null;
  return b.per === 'Paycheck' ? b.amount * (PAYS[payFrequency] ?? 26) : b.amount;
}

// Commuter nudge (M2.4): transit spending, no commuter benefit (or not sure), so pre-tax could save tax.
// Savings = transit a year, capped at the pre-tax limit, x the marginal rate (federal + FICA).
export function commuterSavings({ have, transitMonthly, marginal, limitMonthly }) {
  if (have === 'Yes' || !transitMonthly || transitMonthly <= 0 || marginal == null) return null;
  // Run of Nov 26 2026, Part 10: the dollars come from the one engine (bpCommuter, js/math/benefitsplan.js).
  const c = bpCommuter({ monthly: transitMonthly, rate: marginal, cap: limitMonthly ?? transitMonthly }, { benefits: {} });
  return { yearly: c.yearly, covered: c.covered, marginal };
}

// Withholding flag (M3.2): a simple flag, not a W-4 calculator. A refund of $1,000 or more means you may be
// lending the IRS money all year; any amount owed means check what comes out of each paycheck.
export const BIG_REFUND = 10000; // answer to 59
export function withholdingFlag({ lastYear, amount }) {
  if (lastYear === 'Refund' && amount != null && amount >= BIG_REFUND) return { kind: 'over', text: `Your refund was large (${money(amount)}): you may be over-withholding. A smaller refund means more in each paycheck.` };
  if (lastYear === 'Owed' && (amount == null || amount > 0)) return { kind: 'under', text: 'You owed at tax time: check your withholding so it is not a surprise again.' };
  return null;
}

// ---------- Benefits and health (run of Nov 26 2026, Part 10) ----------
// The web app's read of the one engine (js/math/benefitsplan.js): the answers come from About you (doc.profile.benefits:
// the yes / no rows above, plus `plan` for the optimizer's own taps and `plans` for the plans side by side), the
// marginal rate from Income (M14), transit from the Budget, the children from About you, the household for coverage
// from the benefits cliff's own read (cliffHousehold). Nothing is worked out here that the engine does not return.
export const HSA_COVER = [['self', 'Just me'], ['family', 'Me and family']];
export const HSA_YEARS = [10, 20, 30];
export const PLAN_KEYS = ['premium', 'deductible', 'oop'];
let EMPLOYERS = null, loadingEmployers = null;
export const employerLibrary = () => EMPLOYERS;
export const setEmployerLibrary = lib => { EMPLOYERS = lib; return EMPLOYERS; }; // tests and Node
export function loadEmployerLibrary(onReady) {
  if (EMPLOYERS) return Promise.resolve(EMPLOYERS);
  if (typeof fetch !== 'function') return Promise.resolve(null);
  loadingEmployers ??= fetch('data/library/employers.json').then(r => r.json()).then(setEmployerLibrary).catch(() => { loadingEmployers = null; return null; });
  return loadingEmployers.then(lib => { if (lib) onReady?.(lib); return lib; });
}
// rates: taxRates(...) of Income (null with no taxed pay); transit: the Budget's transit a month.
export function benefitsPlanOf(doc, ref, m, { rates = null, transit = null, lib = EMPLOYERS } = {}) {
  const R = bpRules(ref, lib), p = doc.profile || {}, ben = p.benefits || {}, plan = ben.plan || {};
  const freq = m.inputs.income.find(x => x.r.values.payFrequency)?.r.values.payFrequency ?? null;
  const yes = k => ben[k]?.have === 'Yes';
  const rate = rates?.marginal ?? null, stockRate = rates ? rates.marginal - rates.ficaMarginal : null; // ESPP gains are pay, with no FICA on them
  const K = kidsOf(p);
  const x = {
    hsa: { cover: plan.hsaCover ?? null, age: m.inputs.age ?? null, you: plan.hsaYou ?? null, employer: yes('employerHsa') ? benefitYearly(ben.employerHsa, freq) : 0, rate,
      years: plan.hsaYears ?? null, growth: m.inputs.realReturn ?? null, receipts: plan.hsaReceipts ?? null },
    dcfsa: K.count ? { care: yes('dependentFsa') ? benefitYearly(ben.dependentFsa, freq) : plan.careYear ?? null, ages: K.ages, rate, separate: m.inputs.filingStatus === 'Married separately' } : null,
    espp: { put: yes('espp') ? benefitYearly(ben.espp, freq) : plan.esppPut ?? null, discount: ben.espp?.discount ?? plan.esppDiscount ?? null, rate: stockRate },
    commuter: { monthly: transit > 0 ? transit : null, rate },
  };
  const O = bpOptimize(x, R);
  const employer = ben.employer && lib ? bpEmployer(ben.employer, R) : null;
  return { ...O, x, rates, employer, employers: lib ? bpEmployers(R) : [], kids: K.count, plan: R.benefits.planYear };
}
// Coverage you may qualify for, and the plans side by side (the premium credit counts on a marketplace plan).
export function healthPlansOf(doc, ref, m, { now = new Date() } = {}) {
  const R = bpRules(ref), H = cliffHousehold(doc, ref, { now, m });
  const E = H.has ? bpEligible({ state: H.state, size: H.size, adults: H.adults, magi: H.magi }, R) : { ready: false, needs: ['your pay on Income'] };
  const plans = (doc.profile?.benefits?.plans ?? [{}, {}]).slice(0, 3);
  const P = bpPlans(plans, { help: E.ready && E.now.on === 'aca' ? E.now.help : null });
  return { E, P, plans, state: H.state, BP_ON };
}
// Tapping an employer fills the fields it has (never one it does not): the match on the job row (one tier there; every
// tier on the 401(k) when there is one), the vesting on the job row, the ESPP discount on About you. Returns the
// changes to make, so the screen makes them in one undoable step.
const VEST_PICK = { now: 'Immediate', cliff3: 'Cliff', graded6: 'Graded' };
export function employerFillsOf(doc, records, e) {
  const job = records.find(r => r.kind === 'income' && ['Job', 'Partner job'].includes(r.type)) ?? null;
  const k401 = records.find(r => r.kind === 'account' && ['401(k)', '403(b)'].includes(r.type)) ?? null;
  const T = e.fills.tiers || [], out = [], ben = doc.profile?.benefits || {};
  const jobPatch = {};
  if (T.length === 1) Object.assign(jobPatch, { hasMatch: 'Yes', matchPct: T[0].rate, matchCapPct: T[0].upTo });
  if (T.length > 1 && !k401) Object.assign(jobPatch, { hasMatch: 'Yes' });
  if (e.fills.vest && VEST_PICK[e.fills.vest]) jobPatch.vesting = VEST_PICK[e.fills.vest];
  if (job && Object.keys(jobPatch).length) out.push({ id: job.id, patch: jobPatch, what: 'your job row on Income' });
  if (k401 && T.length) out.push({ id: k401.id, patch: { matchTiers: T.map(t => ({ rate: t.rate, upTo: t.upTo })) }, what: 'your 401(k) on Assets' });
  const profile = { benefits: { ...ben, employer: e.id, ...(e.fills.esppDiscount != null ? { espp: { ...(ben.espp || {}), have: ben.espp?.have ?? 'Yes', discount: e.fills.esppDiscount } } : {}) } };
  return { records: out, profile, noJob: !job, tiersWait: T.length > 1 && !k401 };
}
