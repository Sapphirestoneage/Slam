// SPDX-License-Identifier: AGPL-3.0-only
// The lender's-eye view (batch 42, Phase 4 Track 2, M9W): what a mortgage lender, a landlord and a card issuer each
// read off this household. Pure: no DOM. The screen (js/ui/lender-ui.js) only shows what comes back.
//
// Income a lender can count is not income earned. Each income row is read the way each one reads it:
//   Paycheck (W-2)        its gross a year (card tips are on it); cash tips only when reported (then they are on the W-2).
//   Self-employment       (1099, a business, a side hustle, a Platform row) from the returns filed, net of what was
//                         written off: two returns averaged, but never more than the latest one (Fannie Mae B3-3.1-01:
//                         a declining trend is never averaged, the current lower amount is used; FHA 4000.1: the lesser
//                         of the two-year and one-year averages). One return: a mortgage lender waits for the second; a
//                         landlord reads the latest. None: neither counts it. Blank returns are a Guess at this year's pace.
//   Unemployment          a mortgage lender counts it only for seasonal work with two years of it on the returns (B3-3.1-09),
//                         and SLAM has no seasonal mark, so it is left out; a landlord counts it when it runs a lease.
//   Benefits              counted when they run RULES.lenderBenefitYears (mortgage) or RULES.lenderLeaseMonths (landlord).
//   Rental                as typed (SLAM's Rental row is the net number); its loan is netted, so it leaves the debts.
//   Money from family     not income to anyone reading an application (a gift), so it is in neither column.
// A card issuer asks what you earn (12 CFR 1026.51: income or assets), so its read is utilization, not income.
import { fmt } from './result.js';
import { cardMinimum } from './debt.js';
import { taxTypeOf, isBenefitRow } from './income.js';
import { myShare } from './spending.js';
import { RULES } from '../registry/assumptions.js';

const num = x => (x === null || x === undefined || x === '' || Number.isNaN(Number(x)) ? null : Number(x));
const SELF = new Set(['1099', 'Business', 'Side hustle']);
const GIFTS = new Set(['Money from family', 'From partner']);
export const RETURNS_FILED = ['2 or more', '1', 'None'];
export const lenderOn = doc => doc?.settings?.phase4 === true;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const whole = v => `${Math.round(v * 100)}%`; // a limit, as people say it (36%, not 36.0%)
const k = v => fmt.money(Math.round(v / 1000) * 1000); // a loan size, to the nearest $1,000

// The tax year of the last return a household has filed by now (returns are due in April).
export const lastReturnYear = (now = new Date()) => now.getFullYear() - (now.getMonth() >= 4 ? 1 : 2);

// What kind of income a row is to a lender.
export function lenderKind(r) {
  if (GIFTS.has(r?.type)) return 'gift';
  if (r?.type === 'Unemployment' || isBenefitRow(r)) return 'unemployment';
  if (r?.type === 'Benefits' || r?.values?.incomeType === 'Benefits') return 'benefit';
  if (r?.type === 'Rental' || r?.values?.incomeType === 'Rental') return 'rental';
  const t = r?.type === 'Platform' ? '1099' : taxTypeOf(r);
  if (SELF.has(t) || r?.type === 'Self-employed') return 'self';
  return 'paycheck';
}

// The returns a self-employment row has on file: how many, the net profit on the last two, and what each reader counts
// from them (a year). pace: this year's net a year (the Guess for a blank return).
export function returnsOf(r, pace, { now = new Date() } = {}) {
  const v = r?.values || {};
  const last = num(v.returnLast), before = num(v.returnBefore);
  const filed = v.returnsFiled ?? (last !== null && before !== null ? '2 or more' : last !== null ? '1' : null);
  const guessed = filed === null;
  const n = filed === 'None' ? 0 : filed === '1' ? 1 : 2; // blank reads as two returns at this year's pace (a Guess)
  const lastV = n >= 1 ? last ?? pace ?? null : null, beforeV = n >= 2 ? before ?? pace ?? null : null;
  const amountGuess = guessed || (n >= 1 && last === null) || (n >= 2 && before === null);
  const year = lastReturnYear(now);
  let mortgage = 0, rule = '';
  if (n >= 2 && lastV !== null && beforeV !== null) {
    const avg = (lastV + beforeV) / 2;
    mortgage = Math.min(avg, lastV);
    rule = lastV < beforeV
      ? `${year} (${fmt.money(lastV)}) came in under ${year - 1} (${fmt.money(beforeV)}), so a lender uses the lower, latest year: ${fmt.money(lastV)} a year.`
      : `${year - 1} and ${year} averaged: (${fmt.money(beforeV)} + ${fmt.money(lastV)}) / 2 = ${fmt.money(avg)} a year.`;
  } else if (n === 1) rule = `One return (${year}, ${fmt.money(lastV ?? 0)}): most mortgage lenders wait for the second, so it is not counted yet. Some (FHA, and Fannie Mae through its automated review) count one year after two years in the same line of work.`;
  else rule = 'No return shows this income yet, so a lender has nothing to count.';
  const drop = n >= 2 && beforeV > 0 && lastV !== null ? Math.max(0, (beforeV - lastV) / beforeV) : 0;
  return { filed, n, guessed, amountGuess, last: lastV, before: beforeV, year, mortgage, landlord: n >= 1 ? lastV ?? 0 : 0, drop, bigDrop: drop >= RULES.lenderDropLook, rule };
}

// Each income row as each reader counts it, a year.
export function lenderRows(income, { now = new Date() } = {}) {
  return (income || []).map(i => {
    const r = i.r, kind = lenderKind(r), name = r.name || r.type || 'Income';
    const th = i.takeHome?.value ?? null;
    const base = { id: r.id, name, type: r.type, kind, earned: 0, mortgage: 0, landlord: 0, why: '', guess: false, hidden: 0, returns: null, pace: null, cash: !!i.work?.any };
    if (kind === 'gift') return { ...base, why: 'Money from family is a gift to a lender, not income, so it is in neither column.' };
    if (kind === 'unemployment') {
      const yearly = (i.benefit?.monthly ?? th ?? 0) * 12;
      const end = i.benefit?.end ?? r.values?.benefitEnd ?? null;
      const months = end ? monthsTo(end, now) : null;
      const landlord = months !== null && months >= RULES.lenderLeaseMonths ? yearly : 0;
      return { ...base, earned: yearly, landlord, hidden: yearly, why: `Unemployment counts for a mortgage only for seasonal work with two years of it on your returns. A landlord counts it when it runs a ${RULES.lenderLeaseMonths}-month lease${end ? ` (it ends ${end})` : ''}.` };
    }
    if (kind === 'benefit') {
      const yearly = (th ?? 0) * 12;
      const end = r.values?.benefitEnd ?? null, months = end ? monthsTo(end, now) : null;
      const m = months === null || months >= RULES.lenderBenefitYears * 12 ? yearly : 0, l = months === null || months >= RULES.lenderLeaseMonths ? yearly : 0;
      return { ...base, earned: yearly, mortgage: m, landlord: l, hidden: yearly - m, why: months === null ? `Counted with its award letter (it has no end date, and a lender wants ${RULES.lenderBenefitYears} more years of it).` : `It ends ${end}: a mortgage lender counts it when ${RULES.lenderBenefitYears} more years are left, a landlord when it runs the lease.` };
    }
    if (kind === 'rental') {
      const yearly = (th ?? 0) * 12;
      return { ...base, earned: yearly, mortgage: Math.max(0, yearly), landlord: Math.max(0, yearly), why: 'Rent as typed (net of its loan and costs). A lender reads it off Schedule E and nets the loan, so the loan is left out of the debts here.' };
    }
    if (kind === 'self') {
      const pace = i.gross ?? (th !== null ? th * 12 : null);
      const R = returnsOf(r, pace, { now });
      return { ...base, earned: pace ?? 0, mortgage: R.mortgage, landlord: R.landlord, pace, returns: R, guess: R.amountGuess, hidden: Math.max(0, (pace ?? 0) - R.mortgage),
        why: `${R.rule}${R.guessed ? ' (A Guess: as if both returns show this year\'s pace. Tap what the returns say.)' : ''}${R.bigDrop ? ` A drop of ${fmt.pct(R.drop)} gets a closer look.` : ''}` };
    }
    // A paycheck: its gross (card tips are on it); cash tips on top only when reported.
    const gross = i.gross ?? (th !== null ? th * 12 : 0);
    const cashYear = Math.max(0, i.grossExtra ?? 0);
    const reported = i.work?.reported === 'Yes';
    const shown = gross + (i.cash?.mode === 'paycheck' && reported ? cashYear : 0);
    const earned = gross + cashYear;
    const tips = Math.max(0, earned - shown);
    return { ...base, earned, mortgage: shown, landlord: shown, hidden: tips, tipsHidden: tips, tipsReported: reported,
      why: tips > 0 ? `The paycheck's ${fmt.money(gross)} a year counts. The ${fmt.money(tips)} a year in cash tips is not reported, so no W-2 shows it.`
        : cashYear > 0 ? `The paycheck and the reported cash tips (${fmt.money(cashYear)} a year) are on the W-2. Most lenders want two years of tips on it.` : `The paycheck's ${fmt.money(gross)} a year before tax.` };
  });
}
function monthsTo(ymd, now) {
  const m = /^(\d{4})-(\d{2})/.exec(String(ymd));
  return m ? (Number(m[1]) - now.getFullYear()) * 12 + (Number(m[2]) - 1 - now.getMonth()) : null;
}

// The debts a mortgage lender counts a month: the payment on the credit report. A card's minimum (typed, else M30); a
// student loan with no payment at RULES.lenderStudentPct of the balance; a family loan is not on the report; a home loan
// is the housing payment; a loan on a rental is netted against its rent when a Rental income row is there.
export function lenderDebts(debts, { records = [], hasRental = false } = {}) {
  const out = { housing: 0, other: 0, list: [], left: [] };
  for (const d of debts || []) {
    if (!((d.balance ?? 0) > 0)) continue;
    const rec = records.find(r => r.id === d.id);
    if (d.type === 'Family or friend') { out.left.push({ ...d, why: 'not on a credit report' }); continue; }
    if (d.type === 'Mortgage') {
      const asset = d.linkedTo ? records.find(r => r.id === d.linkedTo) : null;
      if (asset && asset.type !== 'Home' && hasRental) { out.left.push({ ...d, why: 'netted against its rent' }); continue; }
      if (!asset || asset.type === 'Home') { out.housing += d.payment ?? 0; out.list.push({ id: d.id, name: d.name, type: d.type, balance: d.balance, payment: d.payment ?? 0, housing: true }); continue; }
    }
    let pay = d.payment ?? 0;
    if (d.type === 'Credit card') pay = num(rec?.values?.minimum) ?? cardMinimum({ balance: d.balance, apr: d.apr ?? null }).value ?? d.payment ?? 0;
    else if (d.type === 'Student loan' && d.payment == null) pay = d.balance * RULES.lenderStudentPct;
    out.other += pay;
    out.list.push({ id: d.id, name: d.name, type: d.type, balance: d.balance, payment: pay, housing: false, minimum: d.type === 'Credit card' });
  }
  return out;
}

// The home loan a monthly payment carries: the payment less taxes and insurance (share, RULES.lenderTaxInsShare by
// default), at the rate and term (RULES by default), as a loan amount.
export function loanFromPayment(payment, { rate = RULES.lenderMortgageRate, years = RULES.lenderMortgageYears, share = RULES.lenderTaxInsShare } = {}) {
  if (!(payment > 0)) return 0;
  const pi = payment * (1 - share), r = rate / 12, n = years * 12;
  return r === 0 ? pi * n : pi * (1 - (1 + r) ** -n) / r;
}
// Batch 48 (QUESTIONS 357, 360): the mortgage rate and the taxes-and-insurance share are each client's to pick, the way
// materiality is (doc.assumptions.lenderRate, lenderTaxIns, on Plan › Goals › More and from the Lender's view); blank
// uses RULES (the rate is Freddie Mac's weekly 30-year fixed, the share a rough national one).
const loanAt = (p, T) => loanFromPayment(p, { rate: T.rate, years: T.years, share: T.share });
export const LENDER_RATES = [0.06, 0.065, 0.07, 0.075, 0.08];
export const LENDER_SHARES = [0.15, 0.2, 0.25, 0.3, 0.35];
export function lenderTermsOf(doc) {
  const a = doc?.assumptions || {};
  const mineRate = num(a.lenderRate), mineShare = num(a.lenderTaxIns);
  const rate = mineRate ?? RULES.lenderMortgageRate, share = mineShare ?? RULES.lenderTaxInsShare;
  return { rate, share, years: RULES.lenderMortgageYears, rateMine: mineRate !== null, shareMine: mineShare !== null,
    text: `${rateWords(rate)} over ${RULES.lenderMortgageYears} years${mineRate !== null ? '' : ' (this week\'s rate)'}, ${whole(share)} of the payment for taxes and insurance${mineShare !== null ? '' : ' (a national share)'}` };
}
export const rateWords = r => `${+(r * 100).toFixed(2)}%`; // 7.18%, 6.5%, 7%
// The most a home payment can be on this income a month and these other debts (the usual conventional lines).
export const maxHomePayment = (gross, other) => Math.max(0, Math.min(RULES.lenderFront * gross, RULES.lenderBack * gross - other));

// Where a total DTI sits against the common limits, in words (no verdict, just the lines).
export function dtiPlace(dti) {
  if (dti === null) return null;
  const L = [[RULES.lenderBack, 'the usual conventional line'], [RULES.lenderFhaBack, 'FHA\'s line'], [RULES.lenderBackStrong, 'the conventional line with strong credit and savings'], [RULES.lenderBackDu, 'the most an automated conventional review allows']];
  const under = L.find(([v]) => dti <= v + 1e-9);
  if (!under) return `Over ${whole(RULES.lenderBackDu)}, ${L[3][1]}.`;
  if (under === L[0]) return `At or under ${whole(RULES.lenderBack)}, ${L[0][1]} and the lowest of them.`;
  const i = L.indexOf(under);
  return `Over ${whole(L[i - 1][0])} (${L[i - 1][1]}); at or under ${whole(under[0])}, ${under[1]}.`;
}

// The whole read. m: metrics(doc, ref, { now, person }) for the view on screen.
export function lenderOf(doc, ref, { now = new Date(), m } = {}) {
  const x = m.inputs;
  const records = doc.records || [];
  const rows = lenderRows(x.income, { now });
  const sumY = k => rows.reduce((s, r) => s + (r[k] ?? 0), 0);
  const earned = sumY('earned') / 12, mortgageIncome = Math.max(0, sumY('mortgage') / 12), landlordIncome = Math.max(0, sumY('landlord') / 12);
  const D = lenderDebts(x.debts, { records, hasRental: rows.some(r => r.kind === 'rental') });
  const guess = rows.some(r => r.guess);
  const has = rows.some(r => r.kind !== 'gift');
  // ---------- The mortgage lender: total DTI on the income a lender can count ----------
  const dtiOn = g => (g > 0 ? (D.housing + D.other) / g : null);
  const dti = dtiOn(mortgageIncome), dtiEarned = dtiOn(earned);
  const front = D.housing > 0 && mortgageIncome > 0 ? D.housing / mortgageIncome : null;
  const T = lenderTermsOf(doc);
  const loanOf = p => loanAt(p, T); // at this client's rate and share
  const maxPay = maxHomePayment(mortgageIncome, D.other), maxPayEarned = maxHomePayment(earned, D.other);
  const loan = loanOf(maxPay), loanEarned = loanOf(maxPayEarned);
  const owner = D.housing > 0;
  const mortgageMoves = [];
  const gainOf = (g, other) => maxHomePayment(g, other) - maxPay;
  for (const r of rows) {
    if (r.tipsHidden > 0) {
      const g = mortgageIncome + r.tipsHidden / 12, gain = gainOf(g, D.other);
      mortgageMoves.push({ id: `tips:${r.id}`, kind: 'tips', rowId: r.id, gain, loanGain: loanOf(maxPay + gain) - loan, dti: dtiOn(g),
        text: `Report the cash tips on ${r.name} (${fmt.money(r.tipsHidden / 12)} a month) to your employer. Once two years of W-2s show them, a lender counts ${fmt.money(g)} a month, and the home loan it clears grows by about ${k(loanOf(maxPay + gain) - loan)}.` });
    }
    if (r.kind === 'self' && r.pace > 0 && r.returns) {
      const R = r.returns;
      const next = R.n >= 1 ? Math.min(((R.last ?? 0) + r.pace) / 2, r.pace) : 0;
      const delta = next - R.mortgage;
      const yr = R.year + 1;
      if (R.n === 0) mortgageMoves.push({ id: `file:${r.id}`, kind: 'file', rowId: r.id, gain: gainOf(mortgageIncome + r.pace / 12, D.other), later: true, loanGain: loanOf(maxHomePayment(mortgageIncome + r.pace / 12, D.other)) - loan,
        text: `File your ${yr} return with ${r.name} on it (${fmt.money(r.pace)} a year). Once two returns show it, a lender counts about ${fmt.money(r.pace / 12)} a month more, about ${k(loanOf(maxHomePayment(mortgageIncome + r.pace / 12, D.other)) - loan)} more home loan.` });
      else if (delta > 1) {
        const g = mortgageIncome + delta / 12, gain = gainOf(g, D.other);
        mortgageMoves.push({ id: `file:${r.id}`, kind: 'file', rowId: r.id, gain, loanGain: loanOf(maxPay + gain) - loan, dti: dtiOn(g),
          text: `File your ${yr} return showing all of ${r.name} (${fmt.money(r.pace)} a year). The two years a lender reads become ${fmt.money(next)} a year: ${fmt.money(delta / 12)} a month more, about ${k(loanOf(maxPay + gain) - loan)} more home loan.` });
      }
    }
  }
  const payable = D.list.filter(d => !d.housing && d.payment > 0).sort((a, b) => b.payment / b.balance - a.payment / a.balance)[0];
  if (payable) {
    const gain = gainOf(mortgageIncome, D.other - payable.payment);
    mortgageMoves.push({ id: `pay:${payable.id}`, kind: 'pay', debtId: payable.id, gain, loanGain: loanOf(maxPay + gain) - loan, dti: dtiOn(mortgageIncome) === null ? null : (D.housing + D.other - payable.payment) / mortgageIncome,
      text: `Pay off ${payable.name} (${fmt.money(payable.balance)}). Its ${fmt.money(payable.payment)} a month${payable.minimum ? ' minimum' : ''} leaves the DTI${dti !== null ? ` (${fmt.pct(dti)} to ${fmt.pct((D.housing + D.other - payable.payment) / mortgageIncome)})` : ''}, and the home loan it clears grows by about ${k(loanOf(maxPay + gain) - loan)}.` });
  }
  mortgageMoves.sort((a, b) => b.gain - a.gain);
  // Batch 48 (QUESTIONS 358): with one return on file the cautious number stays; one line says what next year's return,
  // filed at this year's pace, would let a lender count: the two returns averaged, never more than the latest.
  const one = rows.filter(r => r.kind === 'self' && r.returns?.n === 1 && r.pace > 0);
  const nextIncome = one.length ? mortgageIncome + one.reduce((s, r) => s + (Math.min(((r.returns.last ?? 0) + r.pace) / 2, r.pace) - r.returns.mortgage) / 12, 0) : null;
  const nextLoan = nextIncome === null ? null : loanOf(maxHomePayment(nextIncome, D.other));
  const afterNext = nextIncome === null || nextLoan <= loan + 0.5 ? null : { income: nextIncome, loan: nextLoan, year: one[0].returns.year + 1, dti: dtiOn(nextIncome),
    text: `Once next year's return is filed at this pace: about ${k(nextLoan)}`,
    tip: one.map(r => `${r.name}: (${fmt.money(r.returns.last ?? 0)} on the ${r.returns.year} return + ${fmt.money(r.pace)} this year) / 2 = ${fmt.money(Math.min(((r.returns.last ?? 0) + r.pace) / 2, r.pace))} a year a lender counts once the ${r.returns.year + 1} return is filed.`).join(' ') + ` ${fmt.money(nextIncome)} a month counted clears a home payment of up to ${fmt.money(maxHomePayment(nextIncome, D.other))}: about a ${k(nextLoan)} loan at ${T.text}.` };
  const mortgage = {
    income: mortgageIncome, dti, dtiEarned, front, owner, housing: D.housing, other: D.other, maxPay, maxPayEarned, loan, loanEarned, terms: T, afterNext,
    place: dtiPlace(dti),
    limits: `Conventional loans look for ${whole(RULES.lenderBack)} or less of gross pay going to debt payments (up to ${whole(RULES.lenderBackStrong)} to ${whole(RULES.lenderBackDu)} with a high score and savings), ${whole(RULES.lenderFront)} or less to the home; FHA ${whole(RULES.lenderFhaFront)} and ${whole(RULES.lenderFhaBack)}.`,
    moves: mortgageMoves.filter(v => v.gain > 0.5).slice(0, 2),
    text: mortgageIncome > 0
      ? `${fmt.money(D.housing + D.other)} of debt payments a month${owner ? ` (${fmt.money(D.housing)} of it the home, ${fmt.pct(front)} on its own)` : ''} over ${fmt.money(mortgageIncome)} a month a lender can count = ${fmt.pct(dti)}. With today's other debts the usual lines (${whole(RULES.lenderFront)} to the home, ${whole(RULES.lenderBack)} in all) clear a home payment of up to ${fmt.money(maxPay)} a month: about a ${k(loan)} loan at ${T.text}.`
      : 'No income a mortgage lender can count yet.',
  };
  // ---------- The landlord: gross a month a landlord can count, as times the rent ----------
  const rentLines = (x.lines || []).filter(l => l.category === 'Rent or mortgage' && l.amount != null);
  const rent = !owner && rentLines.length ? rentLines.reduce((s, l) => s + (myShare(l, { roommates: doc.profile?.roommates ?? 0 }).value ?? 0), 0) : null;
  const nyc = !!doc.profile?.nyc;
  const need = nyc ? RULES.lenderRentYearNyc / 12 : RULES.lenderRentTimes;
  const times = rent > 0 ? landlordIncome / rent : null;
  const clears = landlordIncome / need, clearsEarned = earned / need;
  const landMoves = [];
  for (const r of rows) {
    if (r.tipsHidden > 0) landMoves.push({ id: `tips:${r.id}`, kind: 'tips', rowId: r.id, gain: r.tipsHidden / 12 / need, text: `Report the cash tips on ${r.name}: pay stubs then show ${fmt.money(r.tipsHidden / 12)} a month more, which clears about ${fmt.money(r.tipsHidden / 12 / need)} more rent.` });
    if (r.kind === 'self' && r.pace > 0 && r.returns && r.pace - r.returns.landlord > 1) landMoves.push({ id: `file:${r.id}`, kind: 'file', rowId: r.id, gain: (r.pace - r.returns.landlord) / 12 / need,
      text: `File your ${r.returns.year + 1} return showing all of ${r.name}: a landlord reading it sees ${fmt.money(r.pace / 12)} a month, about ${fmt.money((r.pace - r.returns.landlord) / 12 / need)} more rent cleared.` });
  }
  // Many landlords take bank statements instead of returns: cash shows there once it is deposited; payouts already do.
  const unseen = rows.filter(r => r.tipsHidden > 0 || (r.kind === 'self' && r.earned > r.landlord + 1));
  if (unseen.length && earned > landlordIncome + 1) landMoves.push({ id: 'statements', kind: 'statements', gain: (earned - landlordIncome) / need,
    text: unseen.some(r => r.cash)
      ? `Deposit cash as it comes in: many landlords take 3 to 6 months of bank statements, which would show about ${fmt.money(earned)} a month (rent up to ${fmt.money(clearsEarned)}).`
      : `Bring 3 to 6 months of bank statements: many landlords take them, and your payouts on them show about ${fmt.money(earned)} a month (rent up to ${fmt.money(clearsEarned)}).` });
  landMoves.sort((a, b) => b.gain - a.gain);
  const landlord = { income: landlordIncome, rent, need, nyc, times, clears, clearsEarned, moves: landMoves.slice(0, 2),
    place: times === null ? null : times >= need - 1e-9 ? `At or over the ${fmt.number(Math.round(need * 100) / 100)} times line.` : `The ${fmt.number(Math.round(need * 100) / 100)} times line on ${fmt.money(rent)} rent is ${fmt.money(rent * need)} a month; a landlord can count ${fmt.money(landlordIncome)}.`,
    limits: nyc ? `Most New York City landlords look for a yearly income of ${RULES.lenderRentYearNyc} times the rent (${fmt.number(Math.round(need * 100) / 100)} times it a month).` : `Most landlords look for gross pay of ${RULES.lenderRentTimes} times the rent.`,
    text: landlordIncome > 0 ? `${fmt.money(landlordIncome)} a month a landlord can count${rent ? ` over ${fmt.money(rent)} rent = ${fmt.number(Math.round(times * 10) / 10)} times` : ''}; divided by ${fmt.number(Math.round(need * 100) / 100)}, it clears rent up to ${fmt.money(clears)}.` : 'No income a landlord can count yet.' };
  // ---------- The card issuer: utilization, as the statements report it ----------
  const cards = records.filter(r => r.kind === 'debt' && r.type === 'Credit card' && r.status !== 'Not for me' && (x.debts || []).some(d => d.id === r.id))
    .map(r => ({ id: r.id, name: r.name || 'Card', balance: num(r.values?.balance) ?? 0, limit: num(r.values?.limit), statementDay: num(r.values?.statementDay) }));
  const withLimit = cards.filter(c => c.limit > 0);
  const bal = withLimit.reduce((s, c) => s + c.balance, 0), lim = withLimit.reduce((s, c) => s + c.limit, 0);
  const util = lim > 0 ? bal / lim : null;
  const per = withLimit.map(c => ({ ...c, util: c.balance / c.limit })).sort((a, b) => b.util - a.util);
  const cardMoves = [];
  const day = c => (c?.statementDay ? `the ${ordinal(c.statementDay)}` : 'the statement closes');
  if (util !== null) {
    for (const band of [RULES.utilHigh, RULES.utilBest]) {
      if (util <= band + 1e-9) continue;
      const pay = Math.ceil(bal - band * lim);
      const top = per[0];
      cardMoves.push({ id: `under:${band}`, kind: 'statement', band, pay, text: `Pay ${fmt.money(pay)} before ${top?.statementDay ? `the statement closes on ${day(top)}` : 'the statement closes'}${per.length > 1 && top ? `, starting with ${top.name} (${fmt.pct(top.util)} used)` : ''}: the balance reported shows under ${whole(band)} of your limits.` });
      if (cardMoves.length === 2) break;
    }
    const over = per.find(c => c.util > RULES.utilHigh);
    if (cardMoves.length < 2 && over && util <= RULES.utilHigh) cardMoves.push({ id: `card:${over.id}`, kind: 'card', pay: Math.ceil(over.balance - RULES.utilHigh * over.limit), text: `Each card counts too: ${over.name} is ${fmt.pct(over.util)} used. ${fmt.money(Math.ceil(over.balance - RULES.utilHigh * over.limit))} before its statement closes brings it under ${whole(RULES.utilHigh)}.` });
  }
  const c = doc.profile?.credit || {};
  const history = [c.score != null ? `Score ${c.score}${c.source ? ` (${c.source})` : ''}` : null, c.latePayments === false ? 'no late payments in 2 years' : c.latePayments === true ? 'a late payment in the last 2 years' : null,
    c.inquiries != null ? plural(Math.min(4, c.inquiries), 'hard inquiry', 'hard inquiries') : null].filter(Boolean).join(' · ') || null;
  const card = { cards: cards.length, util, per, needsLimit: cards.length > 0 && util === null, firstWithout: cards.find(c => !(c.limit > 0))?.id ?? null, moves: cardMoves, history,
    place: util === null ? (cards.length ? 'Each card\'s limit is on its statement or in its app.' : 'With no cards there is no utilization to read; an issuer reads your history with other loans and what you earn.') : util <= RULES.utilBest ? `Under ${whole(RULES.utilBest)}, where the best scores sit.` : util <= RULES.utilHigh ? `Between ${whole(RULES.utilBest)} and ${whole(RULES.utilHigh)}.` : `Over ${whole(RULES.utilHigh)}, the share that moves a score most after paying on time.`,
    limits: `Card issuers read the balance on each statement over the limits: under ${whole(RULES.utilHigh)} is the common guide, under ${whole(RULES.utilBest)} is where top scores sit. They ask for your income on the application (all of it counts there), so the gap above does not touch this read.`,
    text: util === null ? (cards.length ? 'Needs a card limit.' : 'No cards on file.') : `Card balances ${fmt.money(bal)} over limits ${fmt.money(lim)} = ${fmt.pct(util)}.` };
  // ---------- The gap: earned against what can be shown ----------
  const gapMonth = Math.max(0, earned - mortgageIncome);
  const gap = { month: gapMonth, landlordMonth: Math.max(0, earned - landlordIncome), loan: Math.max(0, loanEarned - loan), rent: Math.max(0, clearsEarned - clears),
    rows: rows.filter(r => r.hidden > 0.5).map(r => ({ id: r.id, name: r.name, month: r.hidden / 12, why: r.why })),
    text: gapMonth > 0.5 ? `You earn ${fmt.money(earned)} a month before tax; a mortgage lender can count ${fmt.money(mortgageIncome)}. The ${fmt.money(gapMonth)} a month between them rules out about ${fmt.money(Math.round(Math.max(0, loanEarned - loan) / 1000) * 1000)} of home loan and ${fmt.money(Math.max(0, clearsEarned - clears))} a month of rent.`
      : `Everything you earn (${fmt.money(earned)} a month before tax) is income a lender can count.` };
  return { id: 'M9W', has, guess, rows, earned, mortgageIncome, landlordIncome, debts: D, mortgage, landlord, card, gap, value: dti,
    text: `${mortgage.text} ${landlord.text} ${card.text}` };
}
const ordinal = n => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
