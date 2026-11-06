// SPDX-License-Identifier: AGPL-3.0-only
// M20 to M2B: line amounts, my share, support, floor, set-asides, passes, surplus, savings rate, DRAFTT, housing, prepaid.
import { ok, needs, missing, fmt, isBlank } from './result.js';
import { MODES, modeOf } from '../registry/couples.js';
import { LISTS } from '../registry/assumptions.js';
import { monthlyFrom } from './income.js';

// M20 and M2B: a line's monthly amount. Accrual spreads prepaid and yearly costs across the months covered.
export function lineMonthly(line, { basis = 'accrual', payFrequency = null } = {}) {
  if (isBlank(line.amount)) return needs('M20', ['amount']);
  if (line.covers?.months) {
    if (basis === 'accrual') {
      const v = line.amount / line.covers.months;
      return ok('M20', v, `${fmt.money(line.amount)} paid for ${line.covers.months} months is ${fmt.money(v)} a month.`);
    }
    return ok('M20', line.amount, `${fmt.money(line.amount)} paid in the month it left (cash view).`);
  }
  return { ...monthlyFrom(line.amount, line.per, payFrequency), id: 'M20' };
}

// M2B: what is left of a prepayment.
export function prepaidLeft({ amount, months, monthsElapsed }) {
  const m = missing({ amount, 'months covered': months, 'date paid': monthsElapsed });
  if (m.length) return needs('M2B', m);
  const monthly = amount / months;
  const v = Math.max(0, amount - monthly * monthsElapsed);
  return ok('M2B', v, `${fmt.money(amount)} minus ${fmt.money(monthly)} a month for ${monthsElapsed} months used = ${fmt.money(v)} still prepaid.`);
}

// How much of a line someone else covers. Answer to 94: once the takeover month arrives, it is yours.
const ymNow = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export function coveredShare(line, now = new Date()) {
  const takeover = line.takeover ?? line.values?.takeover ?? null;
  if (takeover && String(takeover).slice(0, 7) <= ymNow(now)) return 0; // a month, or a date in that month
  if (line.coveredPct != null) return line.coveredPct;
  if ((line.whoPays ?? line.values?.whoPays) !== 'Covered by someone') return 0;
  // Part of the bill: what they cover, in the same period as the bill, as a share of it. Blank: all of it.
  const part = line.coveredAmount ?? line.values?.coveredAmount ?? null;
  return part == null || !line.amount ? 1 : Math.min(1, Math.max(0, part / line.amount));
}

// Money that comes back to you for a line (an employer, an HSA or FSA, a roommate who pays you back), a month.
export function reimbursedMonthly(line) {
  const r = line.reimbursed ?? line.values?.reimbursed ?? null;
  return r == null ? 0 : monthlyFrom(r, line.per).value ?? 0;
}

// M21: my share of a line, less what is reimbursed to you.
export function myShare(line, opts = {}) {
  const base = shareBeforeRefund(line, opts);
  const back = reimbursedMonthly(line);
  if (base.value === null || !back) return base;
  const v = Math.max(0, base.value - back);
  return ok('M21', v, `${base.text.replace(/\.$/, '')}, minus ${fmt.money(back)} a month reimbursed to you = ${fmt.money(v)}.`);
}
// M21 before any reimbursement (what you pay out; M22 support counts against this).
export function shareBeforeRefund(line, { roommates = 0, basis = 'accrual', now = new Date() } = {}) {
  if (!isBlank(line.myShare)) return ok('M21', line.myShare, `You said your share is ${fmt.money(line.myShare)}.`);
  if (line.status === 'Not for me') return ok('M21', 0, 'Marked Not for me, so it counts as zero.');
  // Batch 15, item 6: a known future cost (Starts in a month) counts from that month on; the projections add it then.
  const starts = line.startsIn ?? line.values?.startsIn ?? null;
  if (starts && String(starts).slice(0, 7) > ymNow(now)) return ok('M21', 0, `Starts ${String(starts).slice(0, 7)}, so it counts from then (the FI date and the calendar already add it).`);
  // Answer to 74: Included in rent is already in the rent line; N/A is not for me. Neither counts again.
  if (line.whoPays === 'Included in rent') return ok('M21', 0, 'Included in the rent, so it is already counted there.');
  if (line.whoPays === 'N/A') return ok('M21', 0, 'Does not apply, so it counts as zero.');
  const m = lineMonthly(line, { basis });
  if (m.value === null) return { ...m, id: 'M21' };
  const covered = coveredShare(line, now);
  const split = splitOf(line, roommates);
  // People often give their own share of a shared bill ("my rent is $1,500"): then the amount is already theirs.
  if (line.sharePct != null && line.sharePct > 0) { // a couple's own split: your share is a percent of the bill
    if (amountIsMine(line)) return ok('M21', m.value * (1 - covered), `${fmt.money(m.value)} a month is your ${fmt.pct(line.sharePct)} share (the whole bill is about ${fmt.money(m.value / line.sharePct)}).`);
    const v = m.value * (1 - covered) * line.sharePct;
    return ok('M21', v, `${fmt.money(m.value)} a month, your share ${fmt.pct(line.sharePct)} = ${fmt.money(v)} is yours.`);
  }
  if (amountIsMine(line) && split > 1) return ok('M21', m.value * (1 - covered), `${fmt.money(m.value)} a month is your share of a bill split ${split} ways (the whole bill is about ${fmt.money(m.value * split)}).`);
  const v = m.value * (1 - covered) / split;
  const parts = [];
  if (covered) parts.push(`${fmt.pct(covered)} covered by someone else`);
  if (split > 1) parts.push(`split ${split} ways`);
  return ok('M21', v, parts.length ? `${fmt.money(m.value)} a month, ${parts.join(', ')} = ${fmt.money(v)} is yours.` : `${fmt.money(v)} a month, all yours.`);
}

// About you › Home and shared bills (batch 5, E). Which bills are split and, per bill, whether the amount typed is
// your share or the whole bill (profile.shared[k], profile.sharedAs[k]). With roommates and nothing answered yet the
// config defaults apply (LISTS.sharedGroups: rent on as your share; electric and internet on as the whole bill; the
// rest off). A bill given as your share is never divided again; the whole bill is divided by the split count.
export function sharedBillsOf(profile = {}) {
  const roommates = profile.roommates ?? 0;
  const touched = profile.shared != null;
  const out = {};
  for (const [k, g] of Object.entries(LISTS.sharedGroups)) {
    out[k] = { label: g.label, categories: g.categories, on: touched ? profile.shared[k] === true : roommates > 0 && g.defaultOn, as: profile.sharedAs?.[k] ?? g.defaultAs, defaulted: !touched };
  }
  return out;
}
// How many ways a shared bill is split, you included: Split N ways when typed, else you plus each roommate (and a
// partner who splits). The count includes the client (batch 5, E4).
// Answer 176: the roommate count wins when it exists (you, each roommate, a partner who splits); a typed Split N ways (or the
// older Splitting with N, migrated to N + 1) only when there is no roommate count. When the two disagree the bill goes to the revisit list.
export const splitWaysOf = profile => (profile.roommates != null ? profile.roommates + 1 + (partnerSplits(profile) ? 1 : 0) : profile.splitWays ?? 1 + (partnerSplits(profile) ? 1 : 0));
export const splitDisagreeOf = profile => (profile.roommates != null && profile.splitWays != null && profile.splitWays !== splitWaysOf(profile) ? { roommates: splitWaysOf(profile), typed: profile.splitWays } : null);
// Fills in what a Budget line leaves blank: a bill in a shared group that is on is split, given as the group says
// (your share or the whole bill), among Split N ways people; a couple can give their share as a percent (Split: my
// share). What a line says itself always wins.
export function withHome(line, profile = {}) {
  const cat = line.category ?? line.values?.category;
  const group = Object.values(sharedBillsOf(profile)).find(g => g.on && g.categories.includes(cat)) ?? null;
  const out = { ...line };
  const who = line.whoPays ?? line.values?.whoPays ?? null;
  if (!who && group) out.whoPays = 'Split';
  if ((out.whoPays ?? who) !== 'Split') return out;
  if ((line.amountIs ?? line.values?.amountIs) == null && group) out.amountIs = group.as;
  const typedSplit = line.splitBy ?? line.values?.splitBy;
  if (typedSplit == null) {
    if (profile.household === 'Couple' && profile.splitMine != null && profile.splitWays == null) out.sharePct = profile.splitMine;
    else { out.splitBy = splitWaysOf(profile); const d = splitDisagreeOf(profile); if (d) out.splitDisagree = d; } // answer 176: the roommate count wins; a disagreement goes to the revisit list
  }
  return out;
}

// A partner splits the shared bills when the couple keeps money Separate or Mix (Joint: one budget, nothing to split).
// Batch 15 (item 2): in a couples mode that keeps money apart (Dating to Married separate) with no money style typed,
// the partner splits too.
export const partnerSplits = profile => profile.household === 'Couple' && (['Separate', 'Mix'].includes(profile.moneyStyle) || (profile.moneyStyle == null && !!MODES[modeOf(profile)]?.split));
// The people splitting a shared bill, you included (the same count as splitWaysOf; kept for older readers).
export const peopleSharing = profile => splitWaysOf(profile);

// How many ways a shared bill is split: Split by when typed, else you plus each roommate (R033).
export const splitOf = (line, roommates = 0) => line.splitBy ?? line.values?.splitBy ?? ((line.whoPays ?? line.values?.whoPays) === 'Split' ? roommates + 1 : 1);
// The amount typed on a split bill is the person's own share (This amount is: Your share), not the whole bill.
export const amountIsMine = line => (line.amountIs ?? line.values?.amountIs) === 'Your share';
// The whole bill a month, worked out from a share and the split (or the amount itself when it is the whole bill).
export function wholeBill(line, { roommates = 0, basis = 'accrual' } = {}) {
  const m = lineMonthly(line, { basis });
  if (m.value === null) return { ...m, id: 'M21' };
  const split = splitOf(line, roommates);
  if (line.sharePct != null && line.sharePct > 0) {
    const whole = amountIsMine(line) ? m.value / line.sharePct : m.value;
    return ok('M21', whole, amountIsMine(line) ? `Your ${fmt.pct(line.sharePct)} share ${fmt.money(m.value)} a month = ${fmt.money(whole)} for the whole bill.` : `${fmt.money(m.value)} a month is the whole bill.`);
  }
  return amountIsMine(line) && split > 1
    ? ok('M21', m.value * split, `Your share ${fmt.money(m.value)} a month times ${split} people = ${fmt.money(m.value * split)} a month for the whole bill.`)
    : ok('M21', m.value, `${fmt.money(m.value)} a month is the whole bill.`);
}

// M22: support received.
export function supportReceived(lines, opts) {
  let total = 0;
  const items = [];
  for (const l of lines) {
    const covered = coveredShare(l, opts?.now);
    if (!covered) continue;
    const full = lineMonthly(l, opts).value;
    const mine = shareBeforeRefund(l, opts).value;
    if (full === null || mine === null) continue;
    total += full - mine;
    items.push(`${l.name ?? 'a line'} ${fmt.money(full - mine)}`);
  }
  return ok('M22', total, items.length ? `Others cover ${items.join(', ')} = ${fmt.money(total)} a month. If it stopped, your spending would go up by that much.` : 'Nobody else covers any of your costs.');
}

// M23: fixed floor.
export function fixedFloor(lines, opts) {
  const fixed = lines.filter(l => l.amountType === 'Fixed');
  const total = fixed.reduce((s, l) => s + (myShare(l, opts).value ?? 0), 0);
  return ok('M23', total, `Your share of the ${fixed.length} fixed lines = ${fmt.money(total)} a month you pay no matter what.`);
}

// M24: irregular set-aside.
export function irregularSetAside(yearly) {
  if (isBlank(yearly)) return needs('M24', ['the yearly cost']);
  return ok('M24', yearly / 12, `${fmt.money(yearly)} a year divided by 12 = ${fmt.money(yearly / 12)} to set aside each month.`);
}

// M25: estimate vs actual.
export function estimateVsActual({ estimate, actual }) {
  const m = missing({ estimate, actual });
  if (m.length) return needs('M25', m);
  const diff = actual - estimate;
  const share = estimate === 0 ? null : diff / estimate;
  return { ...ok('M25', diff, `Actual ${fmt.money(actual)} minus estimate ${fmt.money(estimate)} = ${fmt.money(diff)}${share === null ? '' : ` (${fmt.pct(share)})`}.`), pct: share };
}

// M26: gut accuracy, average % off across closed months. Hidden with no closed month.
export function gutAccuracy(months) {
  const usable = months.filter(m => !isBlank(m.actual) && m.actual !== 0 && !isBlank(m.guess));
  if (!usable.length) return { ...needs('M26', ['one closed month'], { unit: 'pct' }), hidden: true };
  const v = usable.reduce((s, m) => s + Math.abs(m.actual - m.guess) / m.actual, 0) / usable.length;
  return ok('M26', v, `Across ${usable.length} closed ${usable.length === 1 ? 'month' : 'months'}, the first guess was off by ${fmt.pct(v)} on average.`, { unit: 'pct' });
}

// M27: monthly surplus.
export function monthlySurplus({ takeHome, spending, debtPaymentsOutsideSpending = 0, sinkingFunds = 0 }) {
  const m = missing({ 'take-home': takeHome, spending });
  if (m.length) return needs('M27', m);
  const v = takeHome - spending - debtPaymentsOutsideSpending - sinkingFunds;
  // Answer to 62: money going into a sinking fund is spoken for, so it comes out of the surplus.
  const sink = sinkingFunds ? ` minus ${fmt.money(sinkingFunds)} into sinking funds` : '';
  return { ...ok('M27', v, debtPaymentsOutsideSpending
    ? `${fmt.money(takeHome)} take-home minus ${fmt.money(spending)} spending minus ${fmt.money(debtPaymentsOutsideSpending)} debt payments${sink} = ${fmt.money(v)} a month.`
    : `${fmt.money(takeHome)} take-home minus ${fmt.money(spending)} spending (debt payments included)${sink} = ${fmt.money(v)} a month.`), sinkingFunds };
}

// M28: savings rate. Headline on take-home; gross version for Show the math.
// M28, headline (reorganize pass, answer to Brandon question 70): counts the 401(k) and HSA money taken from the
// paycheck and the employer match, over take-home plus that money. The old M28 (surplus over take-home) is the second line.
export function savingsRate({ takeHome, surplus, afterTaxSavings = 0, gross = null, pretaxSaving = 0, match = 0 }) {
  const m = missing({ 'take-home': takeHome, 'monthly surplus': surplus });
  if (m.length) return needs('M28', m, { unit: 'pct' });
  const base = (surplus + afterTaxSavings) / takeHome;
  const extra = (pretaxSaving || 0) + (match || 0);
  const head = extra ? (surplus + afterTaxSavings + extra) / (takeHome + extra) : base;
  const grossRate = isBlank(gross) || !gross ? null : (surplus + afterTaxSavings + extra) / gross;
  const text = extra
    ? `(${fmt.money(surplus)} surplus + ${fmt.money(pretaxSaving)} into your 401(k) and HSA from the paycheck${match ? ` + ${fmt.money(match)} employer match` : ''}) divided by (${fmt.money(takeHome)} take-home + ${fmt.money(extra)}) = ${fmt.pct(head)}. Second line: ${fmt.money(surplus)} surplus divided by ${fmt.money(takeHome)} take-home = ${fmt.pct(base)}.`
    : `(${fmt.money(surplus)} surplus + ${fmt.money(afterTaxSavings)} saved in the budget) divided by ${fmt.money(takeHome)} take-home = ${fmt.pct(base)}.`;
  return { ...ok('M28', head, `${text}${grossRate === null ? '' : ` On gross: ${fmt.pct(grossRate)}.`}`, { unit: 'pct' }),
    gross: grossRate, ofTakeHome: base, second: extra ? `${fmt.pct(base)} of take-home, before the 401(k), HSA and match` : null, pretaxSaving, match };
}

// M29: DRAFTT shares of take-home. Proportions only.
export const DRAFTT = ['Debt', 'Retirement', 'Accommodation', 'Food', 'Transportation', 'Taxes', 'Therapy'];
// What each letter is called on screen. The stored key stays 'Therapy'; it reads Health and self-care (answer to 92).
// Batch 10: Bills and subscriptions is a group outside DRAFTT (like Other and Wants), stored as draftt 'Bills'.
export const DRAFTT_NAME = { Therapy: 'Health and self-care', Bills: 'Bills and subscriptions' };
export const drafttName = k => DRAFTT_NAME[k] ?? k;
export function drafttShares(lines, takeHome, opts) {
  if (isBlank(takeHome)) return needs('M29', ['take-home'], { unit: 'pct' });
  const totals = Object.fromEntries(DRAFTT.map(k => [k, 0]));
  for (const l of lines) if (l.draftt in totals) totals[l.draftt] += myShare(l, opts).value ?? 0;
  const shares = Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v / takeHome]));
  return { ...ok('M29', shares, DRAFTT.filter(k => totals[k]).map(k => `${drafttName(k)} ${fmt.pct(shares[k])}`).join(', ') || 'No lines tagged yet.', { unit: 'pct' }), totals };
}

// M2A: housing share of take-home.
export function housingPct({ housing, takeHome }) {
  const m = missing({ 'rent or mortgage': housing, 'take-home': takeHome });
  if (m.length) return needs('M2A', m, { unit: 'pct' });
  const v = housing / takeHome;
  return ok('M2A', v, `Housing ${fmt.money(housing)} (your share of rent or the mortgage payment, and utilities) divided by ${fmt.money(takeHome)} take-home = ${fmt.pct(v)}. The reference line is 35%.`, { unit: 'pct' });
}

// ---------- Batch 7 (A): the category-first Budget ----------
// One row per category (the DRAFTT letters plus Other), each with a single amount and status that counts as done on
// its own. Lines are optional: a category record (kind 'spending', type = the category key) holds what the client
// typed; its lines (kind 'bill' with that DRAFTT letter) are a breakdown. The category's amount is the typed number;
// when the lines add up to more, the category reads the line total ("updated from $X"); with no typed number it
// reads the line total; what the lines have not reached shows as "$X not assigned yet". An existing file with lines
// and no category records reads exactly as before (category = the sum of its lines).
export const CATEGORIES = ['Accommodation', 'Food', 'Transportation', 'Debt', 'Therapy', 'Taxes', 'Retirement', 'Bills', 'Other'];
export const CORE_CATEGORIES = ['Accommodation', 'Food', 'Transportation']; // always counted in progress; the rest once they hold something
export const categoryName = k => DRAFTT_NAME[k] ?? k;
// Batch 10: Bills and subscriptions has its own category row; every other letter outside DRAFTT (Wants, blank) is Other.
export const categoryKeyOf = line => { const d = line.draftt ?? line.values?.draftt; return DRAFTT.includes(d) || d === 'Bills' ? d : 'Other'; };
export const isCategoryRecord = r => r?.kind === 'spending' && r.type !== 'All in' && CATEGORIES.includes(r.type);

// ---------- Batch 10: faded typical amounts and levels ----------
// A starter line holds its typical amount apart (values.typical) and no amount of its own: it is shown faded for
// reference and counts nowhere until the client uses it (amount = typical, Roughly) or types a real number.
const blankAmount = v => v === null || v === undefined || v === '';
export const isFaded = r => (r?.kind === undefined || r.kind === 'bill') && blankAmount(r?.amount) && (r?.values?.typical ?? r?.typical) != null && r?.status !== 'Not for me';
export const typicalOf = r => r?.values?.typical ?? r?.typical ?? null;
// What the typical amounts of the faded lines would add up to, a month (for reference, not their number).
export const typicalTotal = lines => lines.filter(isFaded).reduce((s, l) => s + (monthlyFrom(typicalOf(l), l.per ?? 'month').value ?? 0), 0);
// Batch 18: a category's typical amount, what its faded starter lines would add up to a month (the Budget group's
// "Typical amounts would add up to" note), for the one-tap "Use typical $X" on the category row and in the walk.
export const categoryTypicalOf = (lines, key) => { const t = typicalTotal(lines.filter(l => !l.values?.irregular && categoryKeyOf(l) === key)); return t > 0 ? Math.round(t) : null; };
// Levels inside every group: 1 the big one, 2 the regulars, 3 folded into one Everything else line. A line with no
// level is a 2 (a line the client adds); starter lines carry theirs from Reference data (spendingPresets.lines[].level).
export const LEVEL_ELSE = 3;
// The categories that sit in Bills and subscriptions (Internet stays in Accommodation; the combined Internet, phone too).
export const BILLS_CATEGORIES = ['Phone', 'Streaming', 'Music', 'Apps and cloud', 'Memberships', 'News', 'Subscriptions'];
// Food, accommodation and transportation (Lean FI and big e: FAT). Phone sat in Accommodation before batch 10, so it
// stays in FAT after its move to Bills and subscriptions (nothing about Lean FI changes).
const FAT_LETTERS = new Set(['Food', 'Accommodation', 'Transportation']);
export const inFat = l => FAT_LETTERS.has(l.draftt ?? l.values?.draftt) || (l.category ?? l.values?.category) === 'Phone';
export const levelOf = l => { const v = Number(l?.level ?? l?.values?.level); return v === 1 || v === 2 || v === 3 ? v : 2; };
// The Everything else line of one group: its pieces (level 3 lines) win once any has a real amount; until then the
// one rough amount typed for the whole bucket counts (bucket: the category row's elseAmount). Never both.
export function everythingElse(lines = [], bucket = null, mine = l => l.amount ?? 0) {
  const pieces = lines.filter(l => levelOf(l) === LEVEL_ELSE && (l.status ?? null) !== 'Not for me');
  const real = pieces.filter(l => !blankAmount(l.amount));
  const piecesSum = real.length ? real.reduce((s, l) => s + (mine(l) ?? 0), 0) : null;
  const b = blankAmount(bucket) ? null : Number(bucket);
  const from = piecesSum != null ? 'pieces' : b != null ? 'bucket' : 'none';
  return { pieces, real: real.length, piecesSum, bucket: b, from, amount: from === 'pieces' ? piecesSum : from === 'bucket' ? b : null, replaced: from === 'pieces' && b != null };
}
// catRecs: the category records; lines: the Budget lines as the math sees them (my share, autos included; Not for me
// left out); mine(line): a line's monthly amount. Returns one entry per category, in order. Batch 10: a faded line
// (no real amount) counts nowhere, and a group's Everything else bucket counts while none of its pieces has a number.
export function categoryTotals(catRecs = [], lines = [], mine = l => l.amount ?? 0) {
  return CATEGORIES.map(key => {
    const rec = catRecs.find(r => r.type === key) ?? null;
    const mineLines = lines.filter(l => (l.status ?? null) !== 'Not for me' && !blankAmount(l.amount) && categoryKeyOf(l) === key);
    const others = mineLines.filter(l => levelOf(l) !== LEVEL_ELSE);
    const rest = everythingElse(lines.filter(l => categoryKeyOf(l) === key), rec?.values?.elseAmount ?? null, mine);
    const linesSum = others.length || rest.amount != null ? others.reduce((s, l) => s + (mine(l) ?? 0), 0) + (rest.amount ?? 0) : null;
    const typed = rec && !isBlank(rec.amount) && rec.status !== 'Not for me' ? monthlyFrom(rec.amount, rec.per ?? 'month').value : null;
    const from = typed == null ? (linesSum == null ? 'none' : 'lines') : linesSum != null && linesSum > typed + 0.5 ? 'updated' : 'typed';
    const amount = from === 'none' ? null : from === 'lines' ? linesSum : from === 'updated' ? linesSum : typed;
    const unassigned = from === 'typed' && typed != null ? Math.max(0, typed - (linesSum ?? 0)) : 0;
    return { key, name: categoryName(key), rec, typed, linesSum, lines: mineLines, else: rest, from, amount, unassigned, counts: CORE_CATEGORIES.includes(key) || amount != null || mineLines.length > 0 || !!rec?.status };
  });
}

// Batch 12 (item 3): the gut number against the lines, in words. With no spending line holding a real amount (faded
// starter amounts and the debt payments From Debt are not spending lines), the gut number is the spending number;
// with some, the comparison, and how many categories still rest on the gut number alone.
// lineTotal: the lines' total as the Budget shows it (with the debt payments); categories: metrics inputs.categories.
export function gutVsLinesWords({ gut, lineTotal, categories = [] }) {
  if (gut == null) return { real: 0, gutOnly: null, text: null };
  const cats = categories.filter(c => c.key !== 'Debt' && c.key !== 'Retirement');
  const real = cats.filter(c => c.amount != null).length;
  if (!real) return { real: 0, gutOnly: cats.filter(c => c.counts).length, text: 'No lines yet: your gut number is your spending number.' };
  const gutOnly = cats.filter(c => c.counts && c.amount == null).length;
  const d = (lineTotal ?? 0) - gut;
  const head = Math.abs(d) < 0.5 ? 'Lines match your gut number' : `Lines are ${fmt.money(Math.abs(d))} ${d > 0 ? 'over' : 'under'} your gut number`;
  return { real, gutOnly, text: `${head}${gutOnly ? `; ${gutOnly} ${gutOnly === 1 ? 'category is' : 'categories are'} still gut-only` : ''}.` };
}
