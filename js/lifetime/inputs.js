// SPDX-License-Identifier: AGPL-3.0-only
// From a household to a whole-life plan: reads what the journey already knows (the plan from js/journey.js and its
// metrics) into the engine's input, runs it, and returns what the Whole life screen shows. The choices that are about
// the future (strategy, claim age, conversions, stock share, health cost, scenario blocks) are passed in as settings;
// the screen keeps them. Pure: no DOM, no storage.
import { lifetime, earliestFreedom, STRATEGIES, FILLS, needAt } from './engine.js';
import { replay, shuffle, safeFreedom } from './stress.js';
import { benefitOf } from '../math/socialsecurity.js';
import { placeOf } from '../math/metrics.js';
import { defaultFilingStatus } from '../math/income.js';
import { RULES } from '../registry/assumptions.js';
import { BUCKET_KIND } from '../sharpen.js';

export const DEFAULTS = { strategy: 'fixed', rate: 0.04, claimAge: 67, fill: 'none', stocks: 0.8, health: 0, eras: true, blocks: [], retireAge: null, target: 0.95 };
const BUCKET = { 'Taxed later': 'pretax', 'Never taxed again': 'roth', 'Reachable any time': 'taxable' };

// The engine's input for this household. notes: what had to be assumed, in words a person can read.
export function lifeInputOf(plan, doc, ref, settings = {}) {
  const s = { ...DEFAULTS, ...settings }, m = plan.m, x = m.inputs, notes = [];
  const start = { taxable: 0, pretax: 0, roth: 0, rothFree: 0 };
  const accounts = (plan.filled?.records || doc.records || []).filter(r => r.kind === 'account' && r.values?.group === 'investment');
  let untyped = 0;
  for (const r of accounts) { const k = BUCKET[BUCKET_KIND[r.type]]; if (k) start[k] += r.values.balance ?? 0; else { start.pretax += r.values.balance ?? 0; untyped += r.values.balance ?? 0; } }
  if (untyped > 0) notes.push('Your investments are not split by account yet, so they are all counted as taxed-later money. Level "Where your investments sit" fixes that.');
  if (start.roth > 0) notes.push('Roth money you have today is counted as growth, which waits until 59 and a half. What you put in from now on can come out any time.');
  const inv = m.investing || {}, fromPay = Math.max(0, (inv.alreadyIn ?? 0) * 12);
  const later = (inv.changes || []).reduce((a, c) => a + (c.monthly ?? 0), 0), lastChange = Math.max(0, ...(inv.changes || []).map(c => c.at ?? 0));
  const full = Math.max(0, ((inv.monthly ?? 0) + later) * 12), own = Math.max(0, full - fromPay);
  const roth = Math.min(own, ref.limits?.ira?.base ?? 0);
  const waitMonths = Math.max(inv.before?.months ?? 0, lastChange);
  const work = { saving: { pretax: fromPay, roth, taxable: own - roth }, wait: { years: Math.round(waitMonths / 12), pretax: Math.max(0, (inv.before?.monthly ?? 0) * 12) } };
  const p = doc.profile || {}, gross = x.income?.[0]?.gross ?? null;
  const born = p.birthYear != null ? p.birthYear * 12 + ((p.birthMonth ?? 7) - 1) : null;
  const ssFor = stopAge => (born == null || !gross ? 0 : (benefitOf({ key: 'Me', bornIndex: born, stopAge, gross, ssClaimAge: s.claimAge }, ref.socialSecurity, { wageBase: ref.tax.socialSecurityWageBase, widths: { Gut: RULES.rangeIncomeGut, Estimate: RULES.rangeIncomeEstimate } }).own ?? 0) * 12);
  if (!gross) notes.push('No pay on file, so Social Security is not counted.');
  const ph = ref.retirementPhases || {};
  const part = doc.assumptions?.partTimeIncome;
  return { notes, x: {
    age: plan.age, planAge: ref.defaults?.lifeExpectancy ?? 90, retireAge: s.retireAge ?? plan.age, realReturn: x.realReturn, start, work,
    spendingAfter: (x.retirementSpending ?? x.spending ?? 0) * 12,
    eras: s.eras ? { slowGoAge: ph.slowGoAge, noGoAge: ph.noGoAge, slowGo: ph.slowGo, noGo: ph.noGo } : null,
    ss: { claimAge: s.claimAge, yearly: ssFor }, partTime: part ? { yearly: part * 12, untilAge: 64 } : null,
    blocks: (s.blocks || []).filter(b => b.fromAge != null && ((b.spending ?? 0) || (b.income ?? 0) || (b.once ?? 0))),
    strategy: { id: s.strategy, rate: s.rate },
    tax: { filingStatus: doc.taxes?.filingStatus ?? defaultFilingStatus(p), place: placeOf(p), fill: s.fill, health: (s.health ?? 0) * 12 },
  } };
}

// The headline: the earliest age work can stop if markets were smooth, the earliest age history would have carried
// (the one to plan on), the run at the chosen age (the person's own pick, else the history age), and how much is
// needed then next to 25 times spending.
export function lifeOf(plan, doc, ref, hist, settings = {}) {
  const s = { ...DEFAULTS, ...settings }, { x, notes } = lifeInputOf(plan, doc, ref, s);
  if (!(x.spendingAfter > 0)) return { ready: false, notes: ['Needs your spending.'] };
  const smooth = earliestFreedom(x, ref);
  const safe = smooth.age == null ? { age: null, replay: null } : safeFreedom(x, ref, hist, { stocks: s.stocks, target: s.target, from: smooth.age });
  const age = s.retireAge ?? safe.age ?? smooth.age;
  if (age == null) return { ready: true, x, notes, smooth, safe, age: null, run: null };
  const at = { ...x, retireAge: age }, run = lifetime(at, ref);
  const first = needAt(age, at);
  return { ready: true, x: at, notes, smooth, safe, age, run, need: run.atRetire, rule25: x.spendingAfter * 25, multiple: first > 0 ? run.atRetire / first : null, firstYear: first, ssYearly: x.ss.yearly(age), settings: s };
}

// History and chance at the chosen age: { replay, shuffle }.
export function stressOf(life, ref, hist) {
  if (!life?.run) return null;
  return { replay: replay(life.x, ref, hist, { stocks: life.settings.stocks }), shuffle: shuffle(life.x, ref, hist, { stocks: life.settings.stocks }) };
}
// Each withdrawal strategy on this household: the earliest age history would have carried, what is needed then, and
// the deepest cut it ever asked for.
export function strategiesOf(life, ref, hist) {
  if (!life?.x) return [];
  return STRATEGIES.map(st => {
    const x = { ...life.x, strategy: { id: st.id, rate: life.settings.rate } };
    const sm = earliestFreedom(x, ref), safe = sm.age == null ? { age: null } : safeFreedom(x, ref, hist, { stocks: life.settings.stocks, target: life.settings.target, from: sm.age });
    const run = safe.age == null ? null : lifetime({ ...x, retireAge: safe.age }, ref);
    const lasted = safe.replay ? safe.replay.cycles.filter(c => c.ranOutAge === null) : []; // the deepest cut among the histories where the money lasted
    const cut = lasted.length ? Math.min(...lasted.map(c => c.lowest)) : null;
    return { id: st.id, name: st.name, plain: st.plain, age: safe.age, need: run?.atRetire ?? null, lasted: safe.replay?.success ?? null, deepestCut: cut };
  });
}
// Conversions: the lifetime tax and penalties under each fill choice, at the chosen age.
export function fillsOf(life, ref) {
  if (!life?.run) return [];
  return FILLS.map(f => { const run = lifetime({ ...life.x, tax: { ...life.x.tax, fill: f.id } }, ref); return { id: f.id, name: f.name, plain: f.plain ?? null, tax: run.lifetimeTax, penalties: run.penalties, ok: run.ok, end: run.end }; });
}
// Social Security: the same plan claiming at 62, 67 and 70.
export function claimsOf(plan, doc, ref, hist, settings = {}) {
  return [62, 67, 70].map(claimAge => { const l = lifeOf(plan, doc, ref, hist, { ...settings, claimAge, retireAge: null }); return { claimAge, yearly: l.ssYearly ?? 0, age: l.age, need: l.need ?? null }; });
}
