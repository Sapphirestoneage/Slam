/* ============================================================================
   SLAM the Game: core/canonmath.js
   PURPOSE     The canon rows finished in Part 21: the F-You money meter, the Money Guy's nine, the
               hand-off check of the hourly value of your time, the noodle budget, pay yourself first,
               Shockingly Simple Math, and Your Money or Your Life steps 1b and 3. features/meters.js
               uses it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      CM_FYOU_MARKS, cmFyou, CM_NINE, CM_NINE_OF, cmFooNine, cmHandOff, CM_NOODLE_WORDS,
               cmNoodleKeep, cmNoodle, cmPayFirst, cmYearsAtRate, cmSimpleCurve, cmBalanceSheet,
               cmTabulate
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/canonmath.js of the main SLAM app.
               To change a rule, change the source, then run: node tools/game_canonmath_build.mjs. The
               tests fail when this copy is stale. Prettier does not format this file (.prettierignore).
   ========================================================================= */
// The canon rows that were partly built (run Finish everything partly built, Part 21; M8X). Each is one number from a
// well-known money teacher, on the person's own numbers:
//   F-You money meter (JL Collins, The Simple Path to Wealth)       cmFyou
//   the Financial Order of Operations, the original nine           cmFooNine (The Money Guy Show)
//   the hourly value of your time, to decide what to hand off      cmHandOff (Grant Sabatier, Financial Freedom)
//   the noodle budget, the bare-bones survival budget              cmNoodle, cmNoodleKeep (Tiffany Aliche)
//   pay yourself first, savings out before spending                cmPayFirst (George S. Clason)
//   Shockingly Simple Math, savings rate to years from $0          cmYearsAtRate, cmSimpleCurve (Mr. Money Mustache)
//   Your Money or Your Life step 1b, the balance sheet             cmBalanceSheet (Vicki Robin, Joe Dominguez)
//   Your Money or Your Life step 3, each month in hours of life    cmTabulate
// No imports, so the game loads the same code as a plain script (tools/game_canonmath_build.mjs writes
// game/core/canonmath.js). js/math/simple.js (M72, Pay yourself first) and js/math/time.js (the outsource check)
// call these, so the web app and the game work each number out with one function. Pure: no DOM.
// Empty is not zero: a number not given is null, and the answer says what it waits for.

const cmHas = v => v != null && v !== '' && Number.isFinite(+v);
const cmSum = (list, f) => list.reduce((t, x) => t + f(x), 0);

// ---------- F-You money (JL Collins) ----------
// The months you could walk away from a job. reach: money you could use without a penalty (cash, a taxable account,
// Roth contributions). spending: what life costs a month now. workCosts: what stops with the job (commute, work
// clothes, lunches out); health: what health cover would cost a month on your own. Each of the two is optional:
// left out, it counts as nothing and the answer says so. floor: a bare-bones month (the noodle budget), optional.
// marks: the months the meter shows (SLAM's own marks, not a rule).
const CM_FYOU_MARKS = [3, 6, 12, 24];
function cmFyou({ reach = null, spending = null, workCosts = null, health = null, floor = null } = {}, marks = CM_FYOU_MARKS) {
  if (!cmHas(reach) || !cmHas(spending) || +spending <= 0) return { ready: false, needs: !cmHas(reach) ? 'what you could reach' : 'what you spend' };
  const walk = Math.max(0, +spending - (cmHas(workCosts) ? +workCosts : 0) + (cmHas(health) ? +health : 0));
  const months = walk > 0 ? Math.max(0, +reach) / walk : null; // null: nothing goes out, so it never runs out
  const onFloor = cmHas(floor) && +floor > 0 ? Math.max(0, +reach) / +floor : null;
  const next = months == null ? null : marks.find(m => m > months + 1e-9) ?? null;
  return { ready: true, reach: +reach, spending: +spending, walk, months, onFloor, next, toNext: next == null ? null : next * walk - +reach,
    counted: { workCosts: cmHas(workCosts), health: cmHas(health) }, marks: marks.map(m => ({ m, at: months == null || months >= m - 1e-9 })) };
}

// ---------- The Financial Order of Operations, the original nine (The Money Guy Show) ----------
// Where a step of the SLAM order (js/registry/foo.js ORDER) sits on the Money Guy's nine. SLAM adds joy (0b) before
// step 1 and giving (5b) after step 5; its Full Freedom (9) is the end of their investing steps (7); their step 9,
// low-interest debt, is not a step of the SLAM path (it is paid as you go). The mapping is SLAM's own reading.
const CM_NINE = ['Deductibles covered', 'Employer match', 'High-interest debt', 'Emergency reserves', 'Roth IRA and HSA', 'Max out retirement', 'Hyper-accumulation', 'Prepaid future assets', 'Low-interest debt'];
const CM_NINE_OF = { '0b': 1, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '5b': 5, '6': 6, '7': 7, '8': 8, '9': 7 };
function cmFooNine(step) {
  const n = CM_NINE_OF[step] ?? null;
  if (n == null) return { ready: false };
  return { ready: true, step, n, name: CM_NINE[n - 1], extra: step === '0b' || step === '5b', rows: CM_NINE.map((name, i) => ({ n: i + 1, name, here: i + 1 === n, done: i + 1 < n })) };
}

// ---------- The hourly value of your time (Grant Sabatier) ----------
// Is handing a task off worth it? cost: what the help costs a month; hoursSaved: the hours a month it gives back;
// wage: what an hour of your time is worth (the real hourly wage, or your own price of an hour). worth: the hours at
// your wage. gap: worth minus cost (above 0, the help costs less than your hours). perHour: what the help costs an
// hour, next to your own hour.
function cmHandOff({ cost = null, hoursSaved = null, wage = null } = {}) {
  if (!cmHas(cost) || !cmHas(hoursSaved) || +hoursSaved <= 0) return { ready: false, needs: !cmHas(cost) ? 'what it costs' : 'hours it saves' };
  if (!cmHas(wage) || +wage <= 0) return { ready: false, needs: 'what an hour of your time is worth', perHour: +cost / +hoursSaved };
  const worth = +hoursSaved * +wage, perHour = +cost / +hoursSaved;
  return { ready: true, cost: +cost, hoursSaved: +hoursSaved, wage: +wage, worth, gap: worth - +cost, perHour, under: perHour < +wage, yearHours: +hoursSaved * 12 };
}

// ---------- The noodle budget (Tiffany Aliche) ----------
// The bare-bones month you would switch to if the pay stopped: only what keeps a roof, the lights, food, a way to get
// around, insurance and the minimum on each debt. lines: [{ k, amt, keep }]; keep: true or false (the person's own
// tap), or null for the default by the line's name (cmNoodleKeep). cash: money you could reach (optional).
const CM_NOODLE_WORDS = /rent|mortgage|housing|home insurance|property tax|utilit|electric|power|heat|water|gas bill|internet|phone|grocer|food at home|^food$|transport|transit|bus|train|car payment|car insurance|gas$|fuel|insurance|health|medic|prescri|child ?care|daycare|minimum|loan|debt|card payment/i;
function cmNoodleKeep(k) { return CM_NOODLE_WORDS.test(String(k || '').trim()); }
function cmNoodle({ lines = [], cash = null } = {}) {
  const rows = (lines || []).filter(l => l && cmHas(l.amt) && +l.amt > 0).map(l => ({ k: l.k, amt: +l.amt, keep: typeof l.keep === 'boolean' ? l.keep : cmNoodleKeep(l.k), own: typeof l.keep === 'boolean' }));
  if (!rows.length) return { ready: false, needs: 'your spending lines' };
  const full = cmSum(rows, r => r.amt), noodle = cmSum(rows.filter(r => r.keep), r => r.amt);
  const c = cmHas(cash) ? Math.max(0, +cash) : null;
  return { ready: true, rows, full, noodle, cut: full - noodle, share: noodle / full, kept: rows.filter(r => r.keep).length,
    months: c == null || noodle <= 0 ? null : c / noodle, monthsFull: c == null ? null : c / full, extra: c == null || noodle <= 0 ? null : c / noodle - c / full };
}

// ---------- Pay yourself first (George S. Clason, The Richest Man in Babylon) ----------
// What leaves the pay for savings before any spending. parts: [{ name, monthly, pre }]; pre: true when it leaves before
// the pay lands (a 401(k), an HSA from the paycheck, the match), so it is not taken from take-home again. paysPerMonth:
// paychecks a month (52, 26, 24 or 12 a year over 12); takeHome, spending: a month, optional. left: take-home minus
// what leaves it for savings, the money left to live on; room: left minus spending.
function cmPayFirst({ parts = [], paysPerMonth = 1, takeHome = null, spending = null } = {}) {
  const list = (parts || []).filter(p => p && cmHas(p.monthly) && +p.monthly > 0.5).map(p => ({ name: p.name, monthly: +p.monthly, pre: !!p.pre }));
  const monthly = cmSum(list, p => p.monthly), fromTake = cmSum(list.filter(p => !p.pre), p => p.monthly), per = paysPerMonth > 0 ? paysPerMonth : 1;
  const th = cmHas(takeHome) ? +takeHome : null, sp = cmHas(spending) ? +spending : null;
  return { parts: list, monthly, perPaycheck: monthly / per, paysPerMonth: per, fromTake, share: th && th > 0 ? fromTake / th : null,
    left: th == null ? null : th - fromTake, room: th == null || sp == null ? null : th - fromTake - sp };
}

// ---------- Shockingly Simple Math (Mr. Money Mustache) ----------
// M72: years to FI from a savings rate s, starting from $0: invest s of take-home each month, growing at realReturn a
// year (monthly compounding), until it reaches (1 - s) of take-home times 12 divided by the withdrawal rate. Take-home
// cancels out, so the curve is the same for everyone at a given return and withdrawal rate. maxMonths: the longest
// path looked at (RULES.maxMonths, 70 years); past it, null.
function cmYearsAtRate(s, { realReturn, withdrawalRate, maxMonths = 840 } = {}) {
  if (!(s > 0) || !cmHas(realReturn) || !(withdrawalRate > 0)) return null;
  if (s >= 1) return 0;
  const takeHome = 1000; // any amount: it cancels
  const g = (1 + realReturn) ** (1 / 12), target = (1 - s) * takeHome * 12 / withdrawalRate;
  let b = 0, n = 0;
  while (b < target && n < maxMonths) { b = b * g + s * takeHome; n += 1; }
  return b < target ? null : n / 12;
}
// The curve at each 5% from 5% to 95%, your own rate as a dot, and the next 5% step up from it.
function cmSimpleCurve({ savingsRate = null, realReturn = null, withdrawalRate = null, maxMonths = 840 } = {}) {
  if (!cmHas(realReturn) || !cmHas(withdrawalRate)) return { ready: false, needs: 'a return and a withdrawal rate', curve: [] };
  const A = { realReturn, withdrawalRate, maxMonths }, curve = [];
  for (let k = 5; k <= 95; k += 5) curve.push({ rate: k / 100, years: cmYearsAtRate(k / 100, A) });
  const you = savingsRate == null ? null : { rate: savingsRate, years: cmYearsAtRate(savingsRate, A) };
  const nextRate = savingsRate == null ? 0.05 : Math.min(0.95, Math.floor(savingsRate * 20 + 1e-9) / 20 + 0.05);
  const next = { rate: nextRate, years: cmYearsAtRate(nextRate, A) };
  return { ready: true, curve, you, next, gain: you?.years != null && next.years != null ? you.years - next.years : null };
}

// ---------- Your Money or Your Life, step 1b: what you have to show for it ----------
// The personal balance sheet. owns: [{ k, v, g }] (g: the group, such as 'cash', 'invest', 'home', 'car', 'other');
// owes: [{ k, v }]. A line with no amount is left out, never counted as $0. groups: the total of each group, in the
// order first seen. net: everything owned minus everything owed.
function cmBalanceSheet({ owns = [], owes = [] } = {}) {
  const A = (owns || []).filter(x => x && cmHas(x.v)).map(x => ({ k: x.k, v: +x.v, g: x.g || 'other' }));
  const L = (owes || []).filter(x => x && cmHas(x.v)).map(x => ({ k: x.k, v: +x.v }));
  if (!A.length && !L.length) return { ready: false, needs: 'what you own and owe' };
  const groups = [];
  for (const x of A) { let gr = groups.find(q => q.g === x.g); if (!gr) groups.push((gr = { g: x.g, v: 0, n: 0 })); gr.v += x.v; gr.n += 1; }
  const own = cmSum(A, x => x.v), owe = cmSum(L, x => x.v);
  return { ready: true, owns: A, owes: L, groups, own, owe, net: own - owe };
}

// ---------- Your Money or Your Life, step 3: each month in hours of life ----------
// rows: the money log [{ d: 'YYYY-MM-DD', amt, cat, kind: 'in' | 'out' }]. wage: the real hourly wage (step 2), or
// null (the hours wait for it). Each month: money in, money out, what was kept, and every category of money out with
// its hours of life and its share of the month. A month with nothing logged is left out, never a $0 month.
function cmTabulate(rows = [], wage = null) {
  const w = cmHas(wage) && +wage > 0 ? +wage : null, by = {};
  for (const r of rows || []) {
    if (!r || !r.d || !cmHas(r.amt) || (r.kind !== 'in' && r.kind !== 'out')) continue;
    const m = String(r.d).slice(0, 7), M = (by[m] = by[m] || { m, in: 0, out: 0, cats: {} });
    if (r.kind === 'in') M.in += +r.amt;
    else { M.out += +r.amt; const k = r.cat || 'Not sorted'; M.cats[k] = (M.cats[k] || 0) + +r.amt; }
  }
  const months = Object.keys(by).sort().map(m => {
    const M = by[m], cats = Object.entries(M.cats).map(([cat, amt]) => ({ cat, amt, hours: w == null ? null : amt / w, share: M.out > 0 ? amt / M.out : 0 })).sort((a, b) => b.amt - a.amt || (a.cat < b.cat ? -1 : 1));
    return { m, in: M.in, out: M.out, kept: M.in - M.out, hoursOut: w == null ? null : M.out / w, hoursIn: w == null ? null : M.in / w, cats };
  });
  return { ready: months.length > 0, months, last: months.length ? months[months.length - 1] : null, wage: w };
}
