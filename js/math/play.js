// SPDX-License-Identifier: AGPL-3.0-only
// The math of the game's play parts (run Not built, groups 1 to 5, Part 10b, Nov 26 2026): the daily life-sim
// challenge (one surprise cost, three ways to meet it, on the person's own cash and spending), the credit score game
// (the five factor shares that myFICO publishes, and the score of a round of taps), and the first $1,000 bonus hunt
// (a bank bonus calculator: the bonus minus the tax, the HYSA interest the money gives up while it sits in the bonus
// account, and the fees; and the hunt toward $1,000 kept). The game loads a copy (game/core/play.js, made by
// tools/game_play_build.mjs); the web app can import the same functions (run 1 Part 20 reuses plBonus and plHunt).
// Pure: plain numbers in, a plain result out. A missing input gives { ready: false, needs }, never a 0.
// Money is in dollars, like js/math/quick.js. The one import is qcGrow (the HYSA switch's own growth), so the lost
// interest is worked out exactly the way the HYSA switch works it out. The build tool takes the import line off: the
// game has qcGrow from core/quick.js, which it loads first.
import { qcGrow } from './quick.js';

const r2 = v => Math.round(v * 100) / 100;

// ---------- The credit score game ----------
// The five groups of a FICO Score and the share each one weighs, as myFICO publishes them. The shares are general
// weights for the population, not a formula: the importance of each group differs from one person to the next.
export const PL_FICO = {
  source: "myFICO, What's in my FICO Scores (myfico.com/crediteducation/whatsinyourscore.aspx)",
  date: '2026-11-26',
  note: 'General weights for the population. For one person the importance of each group can differ. No real score is fetched or shown.',
  factors: [
    { id: 'pay', n: 'Payment history', share: 0.35, what: 'Whether you paid each account on time.' },
    { id: 'owed', n: 'Amounts owed', share: 0.30, what: 'How much of your card limits you use, and what you owe in all.' },
    { id: 'length', n: 'Length of credit history', share: 0.15, what: 'How long your accounts have been open.' },
    { id: 'new', n: 'New credit', share: 0.10, what: 'How many accounts you opened or asked for lately.' },
    { id: 'mix', n: 'Credit mix', share: 0.10, what: 'The kinds you carry: cards, loans, a mortgage.' },
  ],
};
// Round 1: the player taps the five groups from the biggest share down. A place counts when the group in it has the
// share that place holds (the two 10% groups can be in either order). points: the share of the weight placed right.
export function plFicoRound(order) {
  const F = PL_FICO.factors, ids = F.map(f => f.id);
  if (!Array.isArray(order) || order.length !== F.length || new Set(order).size !== F.length || order.some(id => !ids.includes(id))) return { ready: false, needs: ['all five groups, once each'] };
  const want = F.map(f => f.share).sort((a, b) => b - a), share = id => F.find(f => f.id === id).share;
  const right = order.map((id, i) => share(id) === want[i]);
  return { ready: true, right, places: right.filter(Boolean).length, of: F.length, points: r2(order.reduce((t, id, i) => t + (right[i] ? share(id) : 0), 0)) };
}
// Round 2: everyday moves, each touching one group most. The words are the game's own; the group is myFICO's.
export const PL_MOVES = [
  { id: 'autopay', n: 'Turn on autopay for at least the minimum on each card', f: 'pay' },
  { id: 'late', n: 'A bill went 30 days late', f: 'pay' },
  { id: 'paydown', n: 'Pay a card balance down before the statement closes', f: 'owed' },
  { id: 'maxed', n: 'A card is near its limit', f: 'owed' },
  { id: 'closeold', n: 'Close your oldest card', f: 'length' },
  { id: 'keepold', n: 'Keep an old no-fee card open and use it now and then', f: 'length' },
  { id: 'apply3', n: 'Apply for three cards in one month', f: 'new' },
  { id: 'wait', n: 'Space out new applications', f: 'new' },
  { id: 'carloan', n: 'Add a car loan when all you had were cards', f: 'mix' },
];
// picks: { moveId: factorId }. Each move tapped to its group counts once.
export function plMoveRound(picks) {
  const p = picks || {}, done = PL_MOVES.filter(m => p[m.id] != null);
  if (!done.length) return { ready: false, needs: ['at least one move'] };
  const right = done.filter(m => p[m.id] === m.f).map(m => m.id);
  return { ready: true, tapped: done.length, of: PL_MOVES.length, right: right.length, rightIds: right };
}

// ---------- The bank bonus calculator and the first $1,000 bonus hunt ----------
// One bonus: what it pays after tax, less the interest the deposit would have earned in a high-yield account for the
// months it must sit in the bonus account (worked out with the HYSA switch's growth, qcGrow, and after its own tax
// when a tax rate is given), less the fees.
// deposit: the money that must stay in the bonus account. months: how long. hysaRate: the HYSA's rate a year (where
// the money would be). bankRate: the bonus account's own rate a year (often 0). taxRate: the person's top rate (a bank
// bonus is taxed as interest); null works the rest out and says the tax is not in.
export function plBonus({ bonus = null, deposit = 0, months = null, hysaRate = null, bankRate = 0, fees = 0, taxRate = null } = {}) {
  const needs = [];
  if (!(bonus > 0)) needs.push('the bonus');
  if (!(months > 0)) needs.push('how many months');
  if ((deposit ?? 0) > 0 && hysaRate == null) needs.push('the rate where the money is now');
  if (needs.length) return { ready: false, needs };
  const dep = deposit ?? 0, m = months, hy = hysaRate ?? 0, bk = bankRate ?? 0;
  const there = qcGrow(dep, 0, hy, m) - dep, here = qcGrow(dep, 0, bk, m) - dep;
  // The interest given up would have been taxed too, so with a tax rate it counts after its own tax.
  const lost = Math.max(0, there - here), tax = taxRate == null ? null : bonus * taxRate, fee = fees ?? 0, lostKept = taxRate == null ? lost : lost * (1 - taxRate);
  const net = bonus - (tax ?? 0) - lostKept - fee;
  return { ready: true, bonus, deposit: dep, months: m, hysaRate: hy, bankRate: bk, fees: fee, taxRate, tax, taxIn: taxRate != null,
    lost: r2(lost), lostKept: r2(lostKept), net: r2(net), perMonth: r2(net / m), likeRate: dep > 0 ? net / dep * 12 / m : null };
}
export const PL_HUNT_GOAL = 1000;
export const PL_HUNT_STATES = ['planned', 'open', 'paid'];
// The hunt: a list of bonuses, each { state, ...plBonus inputs }. banked: what the paid ones kept, after tax and the
// lost interest. lined: what the planned and open ones would keep. Only one bonus at a time is the rule of the bank
// bonus queue (ideas4.js, Doctor of Credit): open counts how many run at once.
export function plHunt(list, goal = PL_HUNT_GOAL) {
  const rows = (Array.isArray(list) ? list : []).map(b => ({ state: PL_HUNT_STATES.includes(b && b.state) ? b.state : 'planned', r: plBonus(b || {}) }));
  const sum = f => r2(rows.filter(f).reduce((t, o) => t + (o.r.ready ? o.r.net : 0), 0));
  const banked = sum(o => o.state === 'paid'), lined = sum(o => o.state !== 'paid');
  return { goal, rows, banked, lined, left: r2(Math.max(0, goal - banked)), pct: goal > 0 ? Math.min(1, Math.max(0, banked) / goal) : null,
    there: banked >= goal, open: rows.filter(o => o.state === 'open').length, needs: rows.filter(o => !o.r.ready).length, reach: r2(banked + lined) >= goal };
}

// ---------- The daily life-sim challenge ----------
// One surprise cost met three ways, on the person's own numbers: (1) all from the cushion, (2) all on a card paid off
// in `payMonths` equal payments at the card's rate, (3) half and half. cash: what is in checking and savings.
// spendMonth: what a month costs. cardApr: the card's rate a year (null: the card way needs it).
export function plChallenge({ cost = null, cash = null, spendMonth = null, cardApr = null, payMonths = 3 } = {}) {
  const needs = [];
  if (!(cost > 0)) needs.push('the cost');
  if (cash == null || !(cash >= 0)) needs.push('your cash');
  if (!(spendMonth > 0)) needs.push('what a month costs');
  if (needs.length) return { ready: false, needs };
  const mo = v => v / spendMonth, n = Math.max(1, Math.round(payMonths));
  const onCard = amt => {
    if (cardApr == null) return null;
    const r = cardApr / 12, pmt = r === 0 ? amt / n : amt * r / (1 - (1 + r) ** -n);
    return { payment: r2(pmt), interest: r2(pmt * n - amt), months: n };
  };
  const way = (fromCash, fromCard) => {
    const short = Math.max(0, fromCash - cash), left = Math.max(0, cash - fromCash), card = fromCard > 0 ? onCard(fromCard + short) : short > 0 ? onCard(short) : null;
    return { fromCash: r2(Math.min(fromCash, cash)), fromCard: r2(fromCard + short), short: r2(short), cashLeft: r2(left), monthsBefore: r2(mo(cash)), monthsAfter: r2(mo(left)),
      card, extra: card ? card.interest : (fromCard + short > 0 ? null : 0) };
  };
  return { ready: true, cost, cash, spendMonth, cardApr, days: r2(cost / spendMonth * 30), ways: { cushion: way(cost, 0), card: way(0, cost), half: way(cost / 2, cost / 2) } };
}
// The size of a challenge on this person's numbers: a number of days of their own spending, rounded to $10.
export const plChallengeCost = (days, spendMonth) => (spendMonth > 0 && days > 0 ? Math.max(10, Math.round(spendMonth * days / 30 / 10) * 10) : null);

// ---------- The monthly group money date ----------
// The next date on day `day` (1 to 28) of a month: today or later, or (after: true) strictly after today. Dates are
// "YYYY-MM-DD" text, so no time zone moves them.
export function plNextMonthly(today, day, after = false) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(today || '')), dd = Math.round(day);
  if (!m || !(dd >= 1 && dd <= 28)) return null;
  let y = +m[1], mo = +m[2];
  const d = +m[3];
  if (d > dd || (after && d === dd)) { mo += 1; if (mo > 12) { mo = 1; y += 1; } }
  return `${y}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
