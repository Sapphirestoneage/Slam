// SPDX-License-Identifier: AGPL-3.0-only
// Phase 3.5 section 6: Shockingly Simple Math (M72) and Pay yourself first. Pure: no DOM.
import { fiDate } from './fi.js';
import { afterTaxContributions } from './linked.js';
import { metrics } from './metrics.js';
import { fmt } from './result.js';

// M72: years to FI from a savings rate s, starting from $0: M53 with investing = s × take-home and retirement
// spending = (1 − s) × take-home. Take-home cancels out, so the curve is the same for everyone at a given return and WR.
export function yearsAtRate(s, { realReturn, withdrawalRate }) {
  if (!(s > 0)) return null;
  if (s >= 1) return 0;
  const takeHome = 1000; // any amount: it cancels
  const target = (1 - s) * takeHome * 12 / withdrawalRate;
  const r = fiDate({ invested: 0, monthlyInvesting: s * takeHome, realReturn, target }, { from: new Date('2026-01-01T00:00:00Z') });
  return r.value == null ? null : r.value / 12;
}
export function simpleMath({ savingsRate, realReturn, withdrawalRate }) {
  if (realReturn == null || withdrawalRate == null) return { id: 'M72', value: null, needs: ['a return and a withdrawal rate'] };
  const curve = [];
  for (let k = 5; k <= 95; k += 5) curve.push({ rate: k / 100, years: yearsAtRate(k / 100, { realReturn, withdrawalRate }) });
  const you = savingsRate == null ? null : { rate: savingsRate, years: yearsAtRate(savingsRate, { realReturn, withdrawalRate }) };
  const nextRate = savingsRate == null ? 0.05 : Math.min(0.95, Math.floor(savingsRate * 20 + 1e-9) / 20 + 0.05);
  const next = { rate: nextRate, years: yearsAtRate(nextRate, { realReturn, withdrawalRate }) };
  const pc = v => `${Math.round(v * 100)}%`;
  const text = you?.years != null
    ? `Saving ${pc(you.rate)} of take-home from $0, at ${(realReturn * 100).toFixed(1)}% after inflation and a ${(withdrawalRate * 100).toFixed(1)}% withdrawal rate, is about ${you.years.toFixed(1)} years to FI. At ${pc(next.rate)} it is about ${next.years.toFixed(1)}.`
    : `At ${(realReturn * 100).toFixed(1)}% after inflation and a ${(withdrawalRate * 100).toFixed(1)}% withdrawal rate. Your dot appears once there is a savings rate.`;
  return { id: 'M72', value: you?.years ?? null, needs: [], curve, you, next, gain: you?.years != null && next.years != null ? you.years - next.years : null, text };
}

// Pay yourself first: what comes off the top before spending, a month and a paycheck.
const PAYS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };
export function payYourselfFirst(doc, ref, { now = new Date(), person = null } = {}) {
  const m = metrics(doc, ref, { now, person }); // batch 40: Statements reads one person's plan for a couple with no combined totals
  const x = m.inputs, f = m.flow;
  const match = m.savingsRate.match ?? 0;
  const contrib = afterTaxContributions(((person ? x.viewRecords : null) ?? doc.records).filter(r => r.kind === 'account'), { payFrequency: x.payFrequency, payrollHsa: x.gates.hsa && x.income.some(i => (i.r.values.hsaFsa ?? 0) > 0) });
  const parts = [
    { name: '401(k) and HSA from the paycheck', monthly: f.beforeTax ?? 0 },
    { name: 'Employer match', monthly: match },
    ...contrib.parts.map(p => ({ name: `${p.name} (after tax)`, monthly: p.monthly })),
  ].filter(p => p.monthly > 0.5);
  const monthly = parts.reduce((s, p) => s + p.monthly, 0);
  const freq = x.payFrequency || x.income.find(i => i.r.values.payFrequency)?.r.values.payFrequency || 'month';
  const paysPerMonth = (PAYS[freq] ?? 12) / 12;
  const perPaycheck = monthly / paysPerMonth;
  return { monthly, perPaycheck, paysPerMonth, freq, parts,
    text: parts.length ? `${parts.map(p => `${p.name} ${Math.round(p.monthly).toLocaleString('en-US')}`).join(' + ')} = ${Math.round(monthly).toLocaleString('en-US')} a month, ${paysPerMonth.toFixed(2)} paychecks a month, so about ${Math.round(perPaycheck).toLocaleString('en-US')} a paycheck.` : 'Nothing comes off the top yet.' };
}

// Batch 23: Your Shockingly Simple Math (Report › Overview). Mr. Money Mustache's table ("The Shockingly Simple Math
// Behind Early Retirement", 2012: 5% after inflation, a 4% withdrawal rate, starting from $0) re-run on this client's
// return and withdrawal rate, with their own savings rate as a row of its own.
export const MMM = { realReturn: 0.05, withdrawalRate: 0.04 };
export function simpleTable({ savingsRate, realReturn, withdrawalRate }, { rates = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9] } = {}) {
  if (realReturn == null || withdrawalRate == null) return { id: 'M72', value: null, needs: ['a return and a withdrawal rate'], rows: [] };
  const you = savingsRate != null && savingsRate > 0 && savingsRate < 1 ? savingsRate : null;
  const list = [...rates.filter(r => you == null || Math.abs(r - you) > 0.0005).map(rate => ({ rate, you: false })), ...(you != null ? [{ rate: you, you: true }] : [])].sort((a, b) => a.rate - b.rate);
  const rows = list.map(({ rate, you: mine }) => ({ rate, you: mine, years: yearsAtRate(rate, { realReturn, withdrawalRate }), original: yearsAtRate(rate, MMM) }));
  const mine = rows.find(r => r.you) ?? null;
  return { id: 'M72', value: mine?.years ?? null, needs: [], rows, you: mine,
    text: `Years from $0 to FI at each savings rate: invest that share of take-home a month at ${(realReturn * 100).toFixed(1)}% a year after inflation until it reaches the rest of take-home times 12, divided by ${(withdrawalRate * 100).toFixed(1)}%. Take-home cancels out, so only the rate, the return and the withdrawal rate matter. The original table uses 5% and 4%.` };
}
// The assumption waterfall: the original table's years at your savings rate, then each of your own assumptions in
// turn (your return, your withdrawal rate, starting from what you have invested), then your plan as it stands (the
// FI date, M53: heavy debt and big e first, your retirement spending, known changes). Each step says what it does.
export function simpleWaterfall(m, { now = new Date() } = {}) {
  const x = m.inputs, s = m.savingsRate?.value;
  if (s == null || !(s > 0) || x.takeHome == null) return { id: 'M72', value: null, needs: [s == null ? 'a savings rate' : 'a savings rate above zero'], steps: [] };
  const rate = Math.min(0.999, s), base = x.takeHome + (m.savingsRate.pretaxSaving ?? 0) + (m.savingsRate.match ?? 0); // the headline rate's own base
  const y0 = yearsAtRate(rate, MMM), y1 = yearsAtRate(rate, { realReturn: x.realReturn, withdrawalRate: MMM.withdrawalRate }), y2 = yearsAtRate(rate, { realReturn: x.realReturn, withdrawalRate: x.withdrawalRate });
  const from = fiDate({ invested: x.invested ?? 0, monthlyInvesting: rate * base, realReturn: x.realReturn, target: (1 - rate) * base * 12 / x.withdrawalRate }, { from: now });
  const y3 = from.value == null ? null : from.value / 12;
  const y4 = m.monthsToFi?.value == null ? null : m.monthsToFi.value / 12;
  const p = v => `${+(v * 100).toFixed(1)}%`;
  const steps = [
    { key: 'original', label: `The original table at your ${Math.round(rate * 100)}%`, note: '5% return, 4% withdrawal, from $0', years: y0 },
    { key: 'return', label: `Your return, ${p(x.realReturn)}`, note: 'after inflation, from Goals', years: y1 },
    { key: 'withdrawal', label: `Your withdrawal rate, ${p(x.withdrawalRate)}`, note: 'from Goals', years: y2 },
    { key: 'invested', label: `Starting from your ${fmt.money(x.invested ?? 0)} invested`, note: 'instead of $0', years: y3 },
    ...(y4 != null ? [{ key: 'plan', label: 'Your plan as it stands', note: 'debt and big e first, your retirement spending, known changes', years: y4 }] : []),
  ].map((st, i, all) => ({ ...st, change: i === 0 || st.years == null || all[i - 1].years == null ? null : st.years - all[i - 1].years }));
  const last = steps.at(-1);
  return { id: 'M72', value: last.years, needs: [], steps,
    text: `${steps.map(st => `${st.label}: ${st.years == null ? 'not on this path' : `${st.years.toFixed(1)} years`}${st.change != null ? ` (${st.change > 0 ? '+' : ''}${st.change.toFixed(1)})` : ''}`).join('; ')}.` };
}
