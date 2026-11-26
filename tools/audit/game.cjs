// SPDX-License-Identifier: AGPL-3.0-only
// The audit's game half: load the game's scripts the way the browser does (one global scope, the order of
// game/index.html), make made-up players from a seed, run the game's own math on each, and print the inputs and the
// game's answers as JSON. cases.mjs adds these cases to its own; engine2.py works each one out again in Python.
// Usage: node tools/audit/game.cjs <cases per function> <seed> > out.json
// Covered: derive() (the core numbers of every screen), fiNeed() and the Social Security estimate behind it,
// dbPlan() and dbExtraFor() (the debt planner and its reverse), timeLedger() (what an hour is worth, what money and
// debt do while you sleep), debtOutlook() (the heavy-debt card), cashCal() (the cash calendar of a month), and
// goalSim() and freeAt() (the month work becomes optional, and the month each goal is paid).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const GD = path.join(__dirname, '..', '..', 'game') + path.sep;

// A minimal browser stand-in (the same as game/tests/harness.cjs).
const els = {};
global.document = { querySelector: s => (els[s] = els[s] || { innerHTML: '', querySelector: () => null }), addEventListener: () => {}, getElementById: () => null };
global.window = global;
global.scrollTo = () => {};
global.localStorage = { getItem: () => null, setItem: () => {} };
Object.defineProperty(global, 'navigator', { value: { userAgent: '', clipboard: { writeText: () => Promise.resolve() } }, configurable: true });
const order = fs.readFileSync(GD + 'index.html', 'utf8').match(/<script src="([a-z0-9\/-]+\.js)(\?v=[0-9a-f]*)?"/g).map(s => s.match(/"([^"?]+)/)[1]);
const log = console.log;
console.log = () => {}; // a script that prints at load must not spoil the JSON
for (const f of order) vm.runInThisContext(fs.readFileSync(GD + f, 'utf8'), { filename: GD + f });
vm.runInThisContext('SOON_AFTER = "now"; G.demo = false;', { filename: 'audit setup' });
console.log = log;
const g = name => vm.runInThisContext(name);
const [newChar, syncAll, derive, fiNeed, dbPlan, dbExtraFor, timeLedger, debtOutlook, cashCal, goalSim, freeAt, ssEst] =
  ['newChar', 'syncAll', 'derive', 'fiNeed', 'dbPlan', 'dbExtraFor', 'timeLedger', 'debtOutlook', 'cashCal', 'goalSim', 'freeAt', 'ssEst'].map(g);

const [nArg = '200', seedArg = '20261126'] = process.argv.slice(2);
const N = Number(nArg);
let s = Number(seedArg) >>> 0;
const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)], between = (lo, hi) => lo + rnd() * (hi - lo), whole = (lo, hi) => Math.floor(between(lo, hi + 1));
const money = (lo, hi) => Math.round(Math.exp(between(Math.log(lo), Math.log(hi))));
const cases = [];
const add = (fn, input, output) => cases.push({ fn, input, output });
const R0 = r => Object.assign({ s: true }, r);

const INC_K = ['A main job', 'A second job', 'Side gigs', 'My own business', 'Benefits', 'Help from family', 'Retirement income'];
const SPEND_K = ['Home', 'Food', 'Getting around', 'Bills and subscriptions', 'Fun and everything else'];
const DEBT_K = ['Credit card balance', 'Car loan', 'Student loans', 'Owed to family or friends', 'Medical bills', 'Personal loan', 'Payday loan', 'Buy now, pay later'];
const BANDS = ['Under 8%', '8% to 15%', '15% to 25%', 'Over 25%', 'No interest'];

// One made-up player, with rows the way the game keeps them. Some answers are left to the game's guesses.
function player() {
  const age = whole(18, 72), work = pick(['First job', 'Established', 'Self-employed', 'Between jobs', 'Retired', 'Student']);
  const incs = [];
  for (let k = whole(1, 3); k > 0; k--) incs.push(R0({ k: pick(INC_K), amt: money(200, 15000), partner: rnd() < 0.15 }));
  const spends = SPEND_K.filter((_, j) => j === 1 || rnd() < 0.8).map(k => R0({ k, amt: money(30, 4000) })); // the game keeps its own guess while no row is typed
  const cashes = Array.from({ length: whole(0, 3) }, () => R0({ k: 'Checking', amt: rnd() < 0.1 ? 0 : money(10, 80000), hold: rnd() < 0.15 }));
  const invs = Array.from({ length: whole(0, 3) }, () => R0({ k: 'IRA or Roth IRA', amt: money(100, 900000) }));
  const debts = Array.from({ length: whole(0, 4) }, () => {
    const k = pick(DEBT_K), d = R0({ k, amt: rnd() < 0.08 ? 0 : money(50, 60000) });
    const how = rnd();
    if (how < 0.35) { d.apr = pick(BANDS); if (d.apr === 'No interest') d.rate = 0; }
    else if (how < 0.6) { d.rate = pick([0, 3.9, 6.5, 11.5, 18.9, 24.99, 29.99]); d.apr = rnd() < 0.5 ? null : pick(BANDS); }
    d.high = rnd() < 0.5;
    if (rnd() < 0.6) d.pay = rnd() < 0.05 ? 0 : money(25, 2500);
    return d;
  });
  const x = { ss: pick([null, 0, 0.75, 1]) };
  if (rnd() < 0.2) x.pen = { amt: money(200, 4000), age: whole(55, 70) };
  if (rnd() < 0.2) x.ends = [{ k: 'Child care', amt: money(100, 2000), yrs: whole(1, 20) }];
  if (rnd() < 0.15) x.home = { pmt: money(500, 4000), yrs: whole(1, 30) };
  if (rnd() < 0.3) x.limit = money(500, 30000);
  if (rnd() < 0.3) x.dry = whole(0, 4);
  const c = Object.assign(newChar(), {
    name: 'Audit', led: true, placed: true, age, ret: Math.max(age, whole(age, 75)), work,
    home: pick(['Renting', 'Own with a mortgage', 'With family', 'Own outright']), moveOut: rnd() < 0.2 ? null : money(300, 3000),
    payFreq: pick(['Weekly', 'Every 2 weeks', 'Twice a month', 'Monthly', 'It varies', 'Daily']),
    steady: pick(['Steady', 'Varies a little', 'Varies a lot']), low: rnd() < 0.1 ? 0 : money(50, 8000),
    samePage: pick(['Yes', 'Mostly', 'No']), adv: pick(['None', 'A strong network', 'A mentor']),
    match: pick(['yes', 'no', 'no match offered']), tax: pick(['yes', 'no']),
    hrs: rnd() < 0.3 ? null : { w: pick([0, 10, 20, 35, 40, 50, 60]), cm: pick([0, 2, 5, 10]), s: rnd() < 0.5 },
    incs, spends, cashes, invs, debts, x,
  });
  syncAll(c);
  return c;
}
// What the second engine needs to know of a player: the rows and answers, never the game's totals.
const raw = c => JSON.parse(JSON.stringify({
  age: c.age, ret: c.ret, work: c.work, home: c.home, moveOut: c.moveOut, payFreq: c.payFreq, steady: c.steady, low: c.low,
  samePage: c.samePage, adv: c.adv, hrs: c.hrs,
  incs: c.incs.map(r => ({ k: r.k, amt: r.amt, partner: !!r.partner })), spends: c.spends.map(r => ({ k: r.k, amt: r.amt })),
  cashes: c.cashes.map(r => ({ amt: r.amt, hold: !!r.hold })), invs: c.invs.map(r => r.amt),
  debts: c.debts.map(r => ({ k: r.k, amt: r.amt, apr: r.apr == null ? null : r.apr, rate: r.rate == null ? null : r.rate, high: !!r.high, pay: r.pay == null ? null : r.pay })),
  x: c.x,
}));

for (let i = 0; i < N; i++) {
  const c = player(), d = derive(c);
  add('gDerive', raw(c), {
    take: c.take, spend: c.spend, cash: d.cash, nw: d.nw, fiSpend: d.fiSpend, fiBase: d.fiBase, fi: d.fi, fiRet: d.fiRet, save: d.save, rate: d.rate, pct: d.pct,
    yrs: d.yrs, etaAge: d.etaAge, coastNum: d.coastNum, target: d.target, lowGap: d.lowGap, lowCover: d.lowCover, perPay: d.perPay, perSpend: d.perSpend,
    left: d.left, sparksGain: d.sparksGain, stats: d.stats.filter(s => ['STR', 'CON', 'DEX', 'CHA'].includes(s[1])).map(s => [s[1], s[2]]),
    ss: [ssEst(c.take, 67), ssEst(c.take / 2, 40)], fi50: c.age < 50 ? fiNeed(c, 50) : null,
  });
  const ord = pick(['avalanche', 'snowball']), extra = pick([0, 0, 25, 100, 500, money(10, 3000)]), P = dbPlan(c, ord, extra);
  add('gDebtPlan', Object.assign(raw(c), { order: ord, extra }), { months: P.months, interest: P.interest, paying: P.paying, each: P.debts.map(t => [t.i, t.off, t.interest]), first: P.first ? P.first.i : null });
  if (P.debts.length && i % 3 === 0) {
    const target = whole(1, 120), E = dbExtraFor(c, ord, target);
    add('gDebtExtra', Object.assign(raw(c), { order: ord, target }), E ? { extra: E.extra, months: E.months } : null);
  }
  const T = timeLedger(c, d);
  add('gTimeLedger', raw(c), { wage: T.wage, mw: T.mw, dc: T.dc, dy: T.dy, net: T.net, minsDay: T.minsDay, crossInv: T.crossInv, cross: T.cross, covers: T.covers });
  const O = debtOutlook(c, d);
  add('gDebtOutlook', raw(c), O && { bal: O.bal, rate: O.rate, int: O.int, five: O.five, mo: O.mo == null ? null : O.mo, grow: !!O.grow });
  // the cash calendar: each income on its own days (or daily, or varies), rent, bills and debt minimums on theirs
  const cal = { src: {}, vary: {}, rent: rnd() < 0.7 ? [whole(1, 31)] : [], bills: rnd() < 0.6 ? Array.from({ length: whole(1, 2) }, () => whole(1, 31)) : [], debt: rnd() < 0.5 ? [whole(1, 28)] : [] };
  c.incs.forEach(r => { const w = rnd(); if (w < 0.15) cal.vary[r.k] = true; else if (w < 0.75) cal.src[r.k] = [...new Set(Array.from({ length: whole(1, 4) }, () => whole(1, 31)))]; });
  c.x.cal = cal; c.x.incFreq = {}; c.incs.forEach(r => { if (!cal.src[r.k] && !cal.vary[r.k]) c.x.incFreq[r.k] = pick(['Daily', 'Weekly', 'Every 2 weeks', 'Twice a month', 'Monthly', 'It varies']); });
  const K = cashCal(c, derive(c));
  add('gCashCal', Object.assign(raw(c), { cal, incFreq: c.x.incFreq }), { start: K.start, end: K.end, mins: K.mins, low: [K.low.d, K.low.bal], tight: K.tight, inc: K.inc, bal: K.days.map(x => x.bal) });
  // goals and the month work becomes optional
  c.goals = Array.from({ length: whole(0, 3) }, (_, j) => ({ id: 'g' + j, k: 'Goal', cost: money(200, 60000), fund: rnd() < 0.3 ? money(0, 5000) : 0, era: rnd() < 0.2 ? null : whole(0, 8), done: rnd() < 0.1 }));
  c.goalShare = pick([null, 0, 0.25, 0.5, 1]);
  const opt = pick([{}, {}, { monthly: -Math.round(c.take * 0.05) }, { once: money(100, 20000) }, { keep: 0.5 }, { all: true }]);
  const d2 = derive(c), sim = goalSim(c, opt);
  add('gGoalSim', Object.assign(raw(c), { goals: c.goals, goalShare: c.goalShare, opt, era: d2.era, cash: d2.cash }), { M: sim.M, eraAt: sim.eraAt, goalAt: sim.goalAt, share: sim.share, runway: sim.runway, freeAt: freeAt(c, opt) });
}
process.stdout.write(JSON.stringify(cases));
