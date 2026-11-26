// SPDX-License-Identifier: AGPL-3.0-only
// Safety nets on the household (run Finish everything partly built, Part 15; M8U): the parts of js/math/safetynet.js
// that read the plan. lifeEventOf runs a life change (medical leave, a move, a breakup, a new baby) on the web app's
// one ladder (js/math/transitions.js: every rung, cheapest first, the cards with their APR, retirement money after
// the penalty and tax), so the answer is the same dip the layoff uses, with the change's flows added. ruleEndsOf lists
// the dated rules with an end that the plan leans on. Pure: no DOM.
import { metrics } from './metrics.js';
import { layersOf } from './layers.js';
import { ladderOf, dipOf } from './transitions.js';
import { ntEvent, ntTrips, ntRuleEnds, NT_KINDS } from './safetynet.js';
import { ownPlanPerson } from '../registry/couples.js';
import { ymOf } from '../month.js';

const sum = (a, f = v => v) => a.reduce((s, v) => s + (f(v) ?? 0), 0);
export const ntRulesOf = ref => ({ dbl: ref.limits?.leave?.NY?.dbl ?? null, pfl: ref.limits?.leave?.NY?.pfl ?? null });
export const ntTemplateOf = (kind, ref) => (ref.transitions?.templates || []).find(t => t.id === NT_KINDS.find(k => k.id === kind)?.template) ?? null;

// One change on the household. taps: the person's taps (ntPicks fills the rest); trim: the share cut off the spending
// for Plan B when the Budget has no lines (the DRAFTT level is used when it does). picks: the tripwire choices.
export function lifeEventOf(doc, ref, { kind, taps = {}, trim = 0.2, picks = {}, now = new Date() } = {}) {
  const m = metrics(doc, ref, { now, person: ownPlanPerson(doc) }), layers = layersOf(doc, ref, now);
  const lad = ladderOf(doc, ref, { now, plan: null, m, layers });
  const full = lad.levels.find(l => l.id === 'full')?.burn ?? null, draftt = lad.levels.find(l => l.id === 'draftt')?.burn ?? null;
  if (full == null) return { ready: false, needs: 'spending' };
  const main = [...lad.incomes].sort((a, b) => (b.monthly ?? 0) - (a.monthly ?? 0))[0] ?? null;
  const base = { pay: main?.monthly ?? null, weekly: main?.gross ? main.gross / 52 : null, housing: m.inputs.housing ?? null };
  const E = ntEvent(kind, taps, base, ntRulesOf(ref));
  const extra = E.flows.map(f => ({ monthly: f.monthly, fromK: f.fromK, toK: f.toK }));
  const dip = dipOf(lad, { extra });
  const asRun = d => ({ ready: true, cash: d.path[0]?.left ?? 0, path: d.path });
  const basics = draftt ?? full;
  const planBurn = draftt != null ? draftt : full * (1 - trim);
  const B = draftt != null ? dipOf(lad, { extra, cutAs: { level: 'draftt', when: 'start' } }) : dipOf(lad, { extra: [...extra, { monthly: full * trim, fromK: 0 }] });
  const tpl = ntTemplateOf(kind, ref);
  const lowest = dip.path.reduce((lo, p) => (p.left < lo.left ? p : lo), dip.path[0] ?? { k: 0, left: 0 });
  return {
    ready: true, kind, event: E, ladder: lad, dip, runway: dip.runway, lasts: dip.lastsPast, lowest, costs: sum(Object.values(dip.costs)),
    trips: ntTrips(asRun(dip), basics, [3, 2, 1], picks).map(t => ({ ...t, opts: (tpl?.nets?.trips || []).find(x => x[0] === t.months)?.[1] ?? [] })),
    planB: { by: draftt != null ? 'draftt' : 'trim', trim, burn: planBurn, runway: B.runway, lasts: B.lastsPast, more: dip.runway == null || B.runway == null ? null : B.runway - dip.runway, words: tpl?.nets?.planB ?? [] },
    link: tpl?.nets?.link ?? null, full, basics, income: lad.before,
  };
}

// Rule-change tripwires on the household: each dated rule with an end that the plan counts on today, nearest first.
// The tips deduction (T.D. 10044, tax years 2025 to 2028): the federal tax it saves a year on the plan. PAYE and ICR
// (closing June 30 2028): a student loan whose plan says so. now: a Date.
export function ruleEndsOf(doc, ref, { now = new Date() } = {}) {
  let m = null;
  try { m = metrics(doc, ref, { now, person: ownPlanPerson(doc) }); } catch { return []; }
  const tips = ref.tax?.tips, saved = m.inputs.householdTax?.total?.tipsSaved ?? 0;
  const legacy = (doc.records || []).filter(r => r.kind === 'debt' && r.type === 'Student loan' && /\b(PAYE|ICR)\b|pay as you earn|income[- ]contingent/i.test(r.values?.plan ?? ''));
  const rules = [
    tips?.lastYear ? { id: 'tips', name: 'The federal tips deduction', ends: `${tips.lastYear}-12-31`, yearly: saved > 0.5 ? saved : null, uses: saved > 0.5,
      then: `Plan on about that much more federal tax from ${tips.lastYear + 1} unless Congress extends it. Nothing to change now.`, source: 'T.D. 10044 (through 2028), via Thomson Reuters (Apr 13 2026)' } : null,
    ref.studentLoans?.legacyCloses ? { id: 'legacyIdr', name: 'PAYE and ICR, the older income-driven plans', ends: ref.studentLoans.legacyCloses, yearly: null, uses: legacy.length > 0, loans: legacy.map(r => r.name || 'Student loan'),
      then: 'Before then, compare IBR and RAP for the loan on Debt.', source: 'P.L. 119-21, via Tate Law, Income-Driven Repayment Plans in 2026 (Oct 4 2026)' } : null,
  ].filter(Boolean);
  const here = ymOf(now);
  return ntRuleEnds(rules, here);
}
