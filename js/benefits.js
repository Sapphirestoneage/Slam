// SPDX-License-Identifier: AGPL-3.0-only
// Employer benefits (missed ideas M2): what the job offers, a yearly amount for each, and the commuter nudge.
// Pure: no DOM. Answers live in doc.profile.benefits[key] = { have: 'Yes' | 'No' | "Don't know", amount, per, ... }.
import { money } from './format.js';

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
  const covered = Math.min(transitMonthly, limitMonthly ?? transitMonthly) * 12;
  return { yearly: covered * marginal, covered, marginal };
}

// Withholding flag (M3.2): a simple flag, not a W-4 calculator. A refund of $1,000 or more means you may be
// lending the IRS money all year; any amount owed means check what comes out of each paycheck.
export const BIG_REFUND = 10000; // answer to 59
export function withholdingFlag({ lastYear, amount }) {
  if (lastYear === 'Refund' && amount != null && amount >= BIG_REFUND) return { kind: 'over', text: `Your refund was large (${money(amount)}): you may be over-withholding. A smaller refund means more in each paycheck.` };
  if (lastYear === 'Owed' && (amount == null || amount > 0)) return { kind: 'under', text: 'You owed at tax time: check your withholding so it is not a surprise again.' };
  return null;
}
