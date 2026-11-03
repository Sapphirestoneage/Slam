// SPDX-License-Identifier: AGPL-3.0-only
// Phase 3.5 section 6: Shockingly Simple Math (M72) and Pay yourself first. Pure: no DOM.
import { fiDate } from './fi.js';
import { afterTaxContributions } from './linked.js';
import { metrics } from './metrics.js';

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
export function payYourselfFirst(doc, ref, { now = new Date() } = {}) {
  const m = metrics(doc, ref, { now });
  const x = m.inputs, f = m.flow;
  const match = m.savingsRate.match ?? 0;
  const contrib = afterTaxContributions(doc.records.filter(r => r.kind === 'account'), { payFrequency: x.payFrequency, payrollHsa: x.gates.hsa && x.income.some(i => (i.r.values.hsaFsa ?? 0) > 0) });
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
