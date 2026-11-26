/* ============================================================================
   SLAM the Game: core/giving.js
   PURPOSE     Giving (run Finish everything partly built, Part 16): the giving rate on the base the
               player picks, the target a share comes to (maaser is commonly 10%), one gift in hours,
               days and what it would have grown to, bunching two or three years of giving into one
               on the 2026 federal tax, envelopes inside one account, and the maaser credit for
               giving ahead. The sheet Giving (features/giving.js) uses it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: GV_RULES, GV_BASES, GV_TAX. Functions: gvIsGiving, gvBase, gvRate,
               gvTarget, gvGift, gvStepped, gvYear, gvBunch, gvEnvelopes, gvCredit.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/giving.js of the main SLAM app, with
               the tax rows of data/reference-2026.json. To change a rule or a row, change the source,
               then run: node tools/game_giving_build.mjs. The tests fail when this copy is stale.
               Prettier does not format this file (.prettierignore).
   ========================================================================= */
// Giving (run "Finish everything partly built", Part 16, Nov 26 2026; M8V). ONE engine for both apps: pure, and with no
// import on purpose, so tools/game_giving_build.mjs copies it word for word into game/core/giving.js. Every name starts
// with gv or GV_ because the game has one global scope. Empty is not zero: a blank amount gives ready false and the
// list of what is missing, never a number.
//
// SIX TOOLS, each a plain function on plain numbers that the caller reads from its own plan:
//   the giving rate    gvBase, gvRate, gvTarget: what you give as a share of the base YOU pick (gross pay, take-home,
//                      or take-home after the work costs you name), and the amount a share of that base comes to (maaser
//                      is commonly 10%; the share and the base are the person's own taps, not a ruling).
//   one gift           gvGift (the charity calc): a gift once or every month in hours of work at your real hourly wage,
//                      in days on the day work becomes optional (the days come from each app's own FI date engine:
//                      the web's fiMoveOf, the game's freeAt; nothing here runs a second projection), and what it would
//                      have grown to by then.
//   bunching           gvBunch: giving every year next to giving two or three years' worth in one year, on the federal
//                      tax of the year (the standard deduction, the 2026 deduction for people who do not itemize, the
//                      2026 floor of 0.5% of income for people who do).
//   envelopes          gvEnvelopes: labels inside ONE account (maaser, fun money, your own): what each holds, a bar that
//                      fills and then empties as it is used, and what is not labeled yet. No new bank account.
//   maaser credit      gvCredit: a running balance month by month: what is due, what was given, and whether giving
//                      ahead counts toward later months (the person's own rule).
//   which lines        gvIsGiving: the one test of a spending line that is giving (the FOO's giving step uses it too).

// ---------- the rules (SLAM's own, written down here; QUESTIONS.md "RUN Finish everything partly built, Part 16") ----------
// maaser: the share tapped first when the person has not picked one (commonly 10%; their own tap changes it).
// shares: the quick taps for a share. bunchYears: the cycles bunching compares (every 2 or every 3 years).
const GV_RULES = { maaser: 0.1, shares: [0.01, 0.02, 0.05, 0.1, 0.2], bunchYears: [2, 3] };
// The base a share is taken of: the person's own tap.
const GV_BASES = [['gross', 'Gross pay'], ['net', 'Take-home'], ['after', 'After work costs']];
const gvHas = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const gvNum = v => (gvHas(v) ? Number(v) : null);

// ---------- which lines ----------
// A spending line is giving when its name or category says so (giving, tithe, maaser, tzedakah, charity, donation, zakat).
function gvIsGiving(text) {
  return /giv|tithe|maaser|ma'aser|tzedak|charit|donat|zakat|sadaqa/i.test(String(text ?? ''));
}

// ---------- the giving rate ----------
// base: 'gross' | 'net' | 'after'. gross and takeHome are a month; costs: the work costs a month the person names (the
// commute, tools, the costs of the job), taken off take-home for 'after'. Returns { ready, value (a month), needs }.
function gvBase({ base = 'net', gross = null, takeHome = null, costs = null } = {}) {
  const g = gvNum(gross), t = gvNum(takeHome), k = gvNum(costs);
  if (base === 'gross') return g == null ? { ready: false, base, value: null, needs: ['gross pay'] } : { ready: true, base, value: g, needs: [] };
  if (t == null) return { ready: false, base, value: null, needs: ['take-home pay'] };
  if (base === 'after') return k == null ? { ready: false, base, value: null, needs: ['work costs a month'] } : { ready: true, base, value: Math.max(0, t - k), needs: [] };
  return { ready: true, base: 'net', value: t, needs: [] };
}
// given: what is given a month (null when not known). The rate is given / the base.
function gvRate({ given = null, ...b } = {}) {
  const B = gvBase(b), v = gvNum(given), needs = [...(v == null ? ['what you give a month'] : []), ...B.needs];
  if (needs.length) return { ready: false, base: B.base, of: B.value, given: v, rate: null, needs };
  return { ready: true, base: B.base, of: B.value, given: v, rate: B.value > 0 ? v / B.value : null, needs: [] };
}
// The amount a share comes to a month (maaser at 10% when no share is tapped), and the gap to what is given.
function gvTarget({ pct = null, given = null, ...b } = {}) {
  const B = gvBase(b), share = gvNum(pct) ?? GV_RULES.maaser, v = gvNum(given);
  if (!B.ready) return { ready: false, share, value: null, needs: B.needs, own: gvHas(pct) };
  const value = B.value * share;
  return { ready: true, share, value, of: B.value, base: B.base, given: v, gap: v == null ? null : value - v, own: gvHas(pct), needs: [] };
}

// ---------- one gift (the charity calc) ----------
// amount: the gift; monthly: true for a gift every month. wage: the real hourly wage (web M58 / hourlyRate, the game's
// time ledger). days: the days the app's own FI date engine says the gift moves the day work becomes optional (null
// when that date cannot be worked out). realReturn: a year, after inflation; years: until that day.
function gvGift({ amount = null, monthly = false, wage = null, days = null, realReturn = null, years = null } = {}) {
  const a = gvNum(amount), w = gvNum(wage), r = gvNum(realReturn), y = gvNum(years);
  if (a == null) return { ready: false, needs: ['the gift'] };
  const hours = w != null && w > 0 ? a / w : null;
  let grown = null;
  if (r != null && y != null && y >= 0) {
    if (!monthly) grown = a * Math.pow(1 + r, y);
    else {
      const n = Math.round(y * 12), i = Math.pow(1 + r, 1 / 12) - 1;
      grown = i === 0 ? a * n : a * ((Math.pow(1 + i, n) - 1) / i);
    }
  }
  return { ready: true, amount: a, monthly: !!monthly, hours, year: monthly ? a * 12 : a, hoursYear: hours == null ? null : monthly ? hours * 12 : hours, days: gvHas(days) ? Math.round(Number(days)) : null, grown, years: y, needs: [] };
}

// ---------- bunching ----------
// The federal tax of one year on taxable income, by the brackets [[floor, rate], ...].
function gvStepped(taxable, brackets) {
  let tax = 0, marginal = brackets[0][1];
  for (let i = 0; i < brackets.length; i++) {
    const [floor, rate] = brackets[i], ceil = brackets[i + 1]?.[0] ?? Infinity;
    if (taxable > floor) { tax += (Math.min(taxable, ceil) - floor) * rate; marginal = rate; }
  }
  return { tax, marginal };
}
// One year's deduction when g is given: the standard deduction plus the 2026 deduction for people who do not itemize (cash
// to a charity, not to a donor-advised fund, up to its cap), or the itemized deductions (other: mortgage interest, state
// and local tax and the rest) plus the gifts above the floor (a share of income), whichever is larger.
function gvYear(g, { agi, other, filing, cash }, T) {
  const C = T.charity, std = T.std[filing], cap = cash ? Math.min(g, C.nonItemizer[filing]) : 0;
  const standard = std + cap, itemized = other + Math.max(0, g - C.floor * agi), itemize = itemized > standard;
  const deduction = itemize ? itemized : standard, S = gvStepped(Math.max(0, agi - deduction), T.brackets[filing]);
  return { give: g, way: itemize ? 'itemize' : 'standard', standard, itemized, deduction, tax: S.tax, marginal: S.marginal };
}
// give: a year's giving. agi: income a year (adjusted gross income). other: the other itemized deductions a year.
// filing: 'single' | 'joint' | 'head'. years: give `years` years' worth in one year, nothing the others. cash: true when
// the gifts go to charities as cash (the deduction for people who do not itemize counts only those; a donor-advised fund
// does not count). T: { std, brackets, charity: { nonItemizer, floor } } from data/reference-2026.json (tax).
function gvBunch({ give = null, agi = null, other = null, filing = 'single', years = 2, cash = true } = {}, T) {
  const g = gvNum(give), a = gvNum(agi), o = gvNum(other), n = Math.max(2, Math.round(gvNum(years) ?? 2));
  const needs = [...(g == null ? ['a year of giving'] : []), ...(a == null ? ['income a year'] : []), ...(o == null ? ['other deductions a year'] : [])];
  if (!T?.std?.[filing] || !T?.brackets?.[filing] || !T?.charity) needs.push('the tax rules');
  if (needs.length) return { ready: false, needs };
  const p = { agi: a, other: o, filing, cash: !!cash };
  const none = gvYear(0, p, T), each = gvYear(g, p, T), big = gvYear(g * n, p, T);
  const every = Array.from({ length: n }, (_, i) => ({ year: i + 1, ...each }));
  const bunched = [{ year: 1, ...big }, ...Array.from({ length: n - 1 }, (_, i) => ({ year: i + 2, ...none }))];
  const taxEvery = each.tax * n, taxBunched = big.tax + none.tax * (n - 1), saved = taxEvery - taxBunched;
  return { ready: true, years: n, give: g, every, bunched, taxEvery, taxBunched, saved, better: saved > 0.5 ? 'bunch' : 'every',
    savedEachYear: none.tax - each.tax, floor: T.charity.floor * a, cap: T.charity.nonItemizer[filing], topRate: Math.max(each.marginal, big.marginal), needs: [] };
}

// ---------- envelopes inside one account ----------
// balance: what the one account holds (null when not known). list: [{ id, name, put (set aside so far), used (spent or
// given from it so far) }]. An envelope with nothing put in yet is open (no bar). used blank counts nothing used yet.
function gvEnvelopes({ balance = null, list = [] } = {}) {
  const rows = (list || []).map(e => {
    const put = gvNum(e.put), used = gvNum(e.used) ?? 0;
    if (put == null) return { id: e.id, name: e.name, put: null, used, left: null, full: null, past: 0, open: true };
    const left = put - used;
    return { id: e.id, name: e.name, put, used, left, full: put > 0 ? Math.max(0, Math.min(1, left / put)) : 0, past: left < 0 ? -left : 0, open: false, empty: left <= 0 };
  });
  const held = rows.reduce((s, r) => s + (r.left != null && r.left > 0 ? r.left : 0), 0), b = gvNum(balance);
  const free = b == null ? null : b - held;
  return { rows, held, balance: b, free, more: free != null && free < 0 ? -free : 0, ready: rows.some(r => !r.open) };
}

// ---------- maaser credit ----------
// months: [{ m: 'YYYY-MM', owed (due that month; null skips the month), given (given that month; null is not logged,
// counts as nothing given) }] in date order. ahead: true when giving ahead counts toward later months (the person's own
// rule); false keeps only what is still to give. The balance is given minus due, added up: above zero is credit.
function gvCredit({ months = [], ahead = true } = {}) {
  let bal = 0;
  const rows = [];
  for (const x of months || []) {
    const owed = gvNum(x.owed);
    if (owed == null) continue;
    const given = gvNum(x.given), before = bal;
    bal = bal + (given ?? 0) - owed;
    if (!ahead && bal > 0) bal = 0;
    rows.push({ m: x.m, owed, given: given ?? 0, logged: given != null, before, after: bal, fromCredit: Math.max(0, Math.min(owed, before)) });
  }
  return { rows, balance: bal, credit: Math.max(0, bal), toGive: Math.max(0, -bal), ahead: !!ahead, ready: rows.length > 0 };
}
// The 2026 federal rows of data/reference-2026.json that bunching reads.
const GV_TAX = {"std":{"single":16100,"joint":32200,"head":24150},"brackets":{"single":[[0,0.1],[12400,0.12],[50400,0.22],[105700,0.24],[201775,0.32],[256225,0.35],[640600,0.37]],"joint":[[0,0.1],[24800,0.12],[100800,0.22],[211400,0.24],[403550,0.32],[512450,0.35],[768700,0.37]],"head":[[0,0.1],[17700,0.12],[67450,0.22],[105700,0.24],[201750,0.32],[256200,0.35],[640600,0.37]]},"charity":{"nonItemizer":{"single":1000,"joint":2000,"head":1000},"floor":0.005}};
