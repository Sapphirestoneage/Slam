// SPDX-License-Identifier: AGPL-3.0-only
// The web app's side of js/math/frameworks.js (run "Not built, groups 1 to 5", Part 4): it reads the plan's own
// numbers (metrics, the FOO, the tax tables) and hands them to the framework math, so nothing is worked out a second
// way. The game has its own reader for the same functions (game/features/canon.js).
import { metrics } from './metrics.js';
import { kidsOf, defaultFilingStatus } from './income.js';
import { GAIN_BANDS } from './lifetime.js';
import { ownPlanPerson } from '../registry/couples.js';
import { FW_FOO_KIND, fwNextDollar } from './frameworks.js';

const has = v => typeof v === 'number' && Number.isFinite(v);

// The one line of the next dollar from the FOO (js/math/foo.js): the step you are on, what it still needs, and the
// match whenever it is not taken in full. A short month says so first. null: no step yet.
export function fwFooNext(f, money) {
  if (!f || !f.here) return null;
  const s = f.steps.find(x => x.id === f.here), m = f.steps.find(x => x.id === '2');
  if (!s) return null;
  if (s.gap) return `Your next dollar: closing the short month, ${money(s.gap)} a month.`;
  return fwNextDollar({ kind: FW_FOO_KIND[s.id], left: s.left, matchLeft: m && !m.done && m.left > 0 ? m.left : null, money });
}

// What the Baby Steps tracker reads, from the plan. A number the plan does not have stays null (the step says so).
export function fwBabyInputs(doc, ref, { now = new Date() } = {}) {
  let m = null;
  try { m = metrics(doc, ref, { now, person: ownPlanPerson(doc) }); } catch { return {}; }
  const x = m.inputs, debts = x.debts || [];
  const other = debts.filter(d => d.type !== 'Mortgage'), home = debts.filter(d => d.type === 'Mortgage');
  const sum = list => (list.some(d => !has(d.balance)) ? null : list.reduce((t, d) => t + d.balance, 0));
  const kids = kidsOf(doc.profile || {}).count > 0;
  const college = (x.accounts || []).some(a => a.type === '529' && (a.balance ?? 0) > 0) ? true : null;
  const saving = (m.pretaxSaving ?? 0) + (x.afterTaxSaving ?? 0) - (x.goalSaving ?? 0);
  return {
    cash: has(x.cash) ? x.cash : null, debt: sum(other), monthly: has(x.spending) ? x.spending : null,
    retireShare: has(x.grossAnnual) && x.grossAnnual > 0 ? Math.max(0, saving) * 12 / x.grossAnnual : null,
    kids, college: kids ? college : null, mortgage: home.length ? sum(home) : 0,
  };
}

// The two lines of 0% tax for a filing status: the standard deduction (data/reference-2026.json) and the top of the
// 0% band for long-term gains (js/math/lifetime.js, IRS Rev. Proc. 2025-32). key: single, joint, head.
export const FW_FILING = [['single', 'Single'], ['joint', 'Married, filing together'], ['head', 'Head of household']];
export function fwZeroLines(ref, key = 'single') {
  const std = ref?.tax?.standardDeduction?.[key] ?? null, band = GAIN_BANDS[key] ?? null;
  return { std, gainTop: band ? band[0] : null };
}
export function fwFilingKey(doc) {
  const f = doc?.profile?.filingStatus ?? defaultFilingStatus(doc?.profile || {});
  return /jointly/i.test(f) ? 'joint' : /head/i.test(f) ? 'head' : 'single';
}
