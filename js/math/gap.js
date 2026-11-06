// SPDX-License-Identifier: AGPL-3.0-only
// M81: the gap (batch 12, item 5). When spending plus debt payments are more than take-home, the month is short. YNAB
// shows overspending as a number to cover; SLAM says "Your month is $X short" and lists the three biggest levers that
// would close it, each with what it closes: the largest Level 1 or 2 spending line that can move (a quarter of it, or a
// tenth of the gut number while there are no lines), the largest subscription that can be cut (Bills and
// subscriptions; Phone is not one), and an income option the coach fills (extra shifts or a side gig). Use the gap
// proposes a plan on Current vs Proposed. Pure: no DOM, no verdicts.
import { myShare, levelOf, LEVEL_ELSE, BILLS_CATEGORIES } from './spending.js';
import { RULES } from '../registry/assumptions.js';

const money = v => `$${Math.round(v).toLocaleString('en-US')}`;
const round10 = v => Math.round(v / 10) * 10;
const CUTTABLE = new Set(BILLS_CATEGORIES.filter(c => c !== 'Phone'));

// The income option the coach typed (doc.program.gap.income), a month; null until typed.
export const gapIncomeOf = doc => (Number.isFinite(Number(doc?.program?.gap?.income)) && doc.program.gap.income !== null ? Number(doc.program.gap.income) : null);

export function gapOf(doc, m) {
  const surplus = m?.surplus?.value;
  if (surplus == null || surplus >= -0.5) return null;
  const x = m.inputs, short = -surplus;
  const mine = l => myShare(l, { roommates: x.roommates ?? 0 }).value ?? 0;
  const real = (x.typedLines || []).filter(l => l.amount != null && !x.dupOf?.[l.id] && l.status !== 'Not for me' && !['Debt', 'Retirement'].includes(l.draftt));
  // 1. The largest Level 1 or 2 line that can move (not a fixed amount, not a subscription).
  const movable = real.filter(l => levelOf(l) !== LEVEL_ELSE && l.amountType !== 'Fixed' && l.draftt !== 'Bills').sort((a, b) => mine(b) - mine(a))[0] ?? null;
  const gut = x.gutTotal;
  const spend = movable
    ? { id: 'line', recId: movable.id, name: movable.name || movable.category || 'Your biggest line', amount: mine(movable), share: RULES.gapTrimLine, route: '#/cash-flow/budget',
      closes: Math.min(short, round10(mine(movable) * RULES.gapTrimLine)), how: `Trim it by a quarter (${money(mine(movable))} a month)` }
    : gut > 0 ? { id: 'line', recId: null, name: 'Your spending (the gut number)', amount: gut, share: RULES.gapTrimGut, route: '#/cash-flow/budget',
      closes: Math.min(short, round10(gut * RULES.gapTrimGut)), how: `Trim ${Math.round(RULES.gapTrimGut * 100)}% of ${money(gut)}; the lines on Budget show where` } : null;
  // 2. The largest subscription that can be cut.
  const sub = real.filter(l => l.draftt === 'Bills' && CUTTABLE.has(l.category)).sort((a, b) => mine(b) - mine(a))[0] ?? null;
  const cut = sub ? { id: 'subscription', recId: sub.id, name: sub.name || sub.category, amount: mine(sub), closes: Math.min(short, mine(sub)), how: 'Cancel it', route: '#/cash-flow/budget' }
    : { id: 'subscription', recId: null, name: 'Subscriptions', amount: null, closes: null, how: 'None listed yet: list them on Budget', route: '#/cash-flow/budget' };
  // 3. Income: a placeholder line the coach fills.
  const inc = gapIncomeOf(doc);
  const earn = { id: 'income', recId: null, name: 'Extra shifts or a side gig', amount: inc, closes: inc == null ? null : Math.min(short, inc), how: inc == null ? 'Fill in a month' : 'A month', route: null };
  const levers = [spend, cut, earn].filter(Boolean);
  const spendingCut = Math.min(short, (spend?.closes ?? 0) + (cut.closes ?? 0));
  const income = inc ?? Math.max(0, short - spendingCut);
  const closes = Math.min(short, spendingCut + (inc ?? 0));
  return { id: 'M81', short, levers, closes, left: Math.max(0, short - closes), plan: { spendingCut, income, spending: x.spending == null ? null : x.spending - spendingCut },
    text: `Your month is ${money(short)} short: ${money(x.takeHome ?? 0)} comes in and ${money((x.takeHome ?? 0) + short)} goes out${x.debtPaymentsOutsideSpending ? ', with the debt payments' : ''}.` };
}

// Use the gap: the Proposed plan that closes it (the spending levers first, then income for the rest, or the income typed).
export function gapProposal(g) {
  if (!g) return null;
  return { spending: g.plan.spending == null ? null : Math.round(g.plan.spending), extraIncome: g.plan.income > 0 ? Math.round(g.plan.income) : null };
}
