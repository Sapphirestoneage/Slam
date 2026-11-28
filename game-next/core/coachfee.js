/* ============================================================================
   SLAM the Game: core/coachfee.js
   PURPOSE     The coaching fee math (run CC-1, items 21 and 22): what a first call found (fees, bonuses,
               interest saved) next to the one fee of the coach, and one portfolio with a flat fee next
               to a yearly fee on the assets. features/paysitself.js uses it, for a coach only.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: CO_RULES, CO_SOURCES. Functions: coFeesAbove, coPaysForItself, coFlatVsAum.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/coachfee.js of the main SLAM app. To
               change a rule, change the source, then run: node tools/game_coachfee_build.mjs. The tests
               fail when this copy is stale. Prettier does not format this file (.prettierignore).
   ========================================================================= */
// Coaching fee math (run CC-1, items 21 and 22, Nov 28 2026). Pure: numbers in, numbers out. No imports and no DOM,
// so tools/game_coachfee_build.mjs can write this file as the game's plain script game/core/coachfee.js.
//   coFeesAbove      the yearly fees a fee X-ray found above a low-cost line
//   coPaysForItself  what a first call found (fees, bonuses, interest saved), added up, next to the coach's one fee
//   coFlatVsAum      one portfolio over the years and two ways to pay for advice: one flat fee, or a share of the
//                    assets each year
// A part that was not found is null. It is listed as not found yet and never counted as $0. With no fee set, the
// comparison is not ready: there is no headline number.
const CO_RULES = { years: 30, growth: 0.07, aum: 0.01 };
const CO_SOURCES = {
  years: 'The owner\'s brief for the coaching page (run CC-1, item 22, Nov 27 2026): "over 30 years on the same portfolio"',
  growth: 'SLAM the Game\'s growth rate (R in game/core/engine.js): 7% a year, before inflation. An example rate, not a forecast',
  aum: 'The owner\'s brief for the coaching page (run CC-1, item 22, Nov 27 2026): "a 1% AUM advisor". An example rate for a yearly fee on assets, not a quote from any firm',
};
const coHas = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

// The yearly fees above a low-cost line. year: the fees a year the X-ray found (dollars). total: the dollars
// invested. low: the low-cost line as a share (0.0005 is 0.05%). Null when the X-ray has no fee yet.
function coFeesAbove({ year = null, total = null, low = 0 } = {}) {
  if (!coHas(year) || !coHas(total)) return null;
  return Math.max(0, Number(year) - Number(total) * (coHas(low) ? Number(low) : 0));
}

// parts: [{ id, name, amount }]: amount in dollars, or null when it was not found yet. fee: the coach's one fee in
// dollars, or null while it is not set. Returns the rows, the total of the parts that were found, the names of the
// parts still missing, and (only when a part was found and the fee is set) net = total - fee and times = total / fee.
function coPaysForItself({ parts = [], fee = null } = {}) {
  const rows = (parts || []).map(p => {
    const found = coHas(p.amount);
    return { id: p.id, name: p.name ?? p.id, amount: found ? Math.max(0, Number(p.amount)) : null, found };
  });
  const got = rows.filter(r => r.found), missing = rows.filter(r => !r.found).map(r => r.name);
  const total = got.length ? got.reduce((t, r) => t + r.amount, 0) : null;
  const hasFee = coHas(fee) && Number(fee) > 0, f = hasFee ? Number(fee) : null;
  const ready = total !== null && hasFee;
  const needs = [];
  if (total === null) needs.push('at least one part found');
  if (!hasFee) needs.push('the coaching fee');
  return {
    rows, total, missing, fee: f, complete: got.length > 0 && missing.length === 0, ready, needs,
    net: ready ? total - f : null, times: ready ? total / f : null, covers: ready ? total >= f : null,
  };
}

// One portfolio, year by year. start: dollars today. add: dollars put in at the end of each year. growth: the yearly
// growth (0.07). aum: the yearly fee as a share of the assets (0.01), taken at the end of each year. flat: one fee in
// dollars, taken out of the portfolio on day one (so it also gives up its growth), or null while the price is not set.
// rows[y] = { year, none (no advice fee), flat, aum, aumFees (the fee dollars paid so far) }.
function coFlatVsAum({ start = null, add = 0, years = CO_RULES.years, growth = CO_RULES.growth, aum = CO_RULES.aum, flat = null } = {}) {
  const needs = [];
  if (!coHas(start) || Number(start) < 0) needs.push('a starting portfolio');
  if (!coHas(years) || Number(years) < 1) needs.push('a number of years');
  if (needs.length) return { ready: false, needs, rows: [], hasFlat: false };
  const n = Math.round(Number(years)), g = Number(growth), a = Number(aum), put = coHas(add) ? Math.max(0, Number(add)) : 0;
  const hasFlat = coHas(flat) && Number(flat) > 0;
  let none = Number(start), fl = hasFlat ? Math.max(0, none - Number(flat)) : null, au = none, fees = 0;
  const rows = [{ year: 0, none, flat: fl, aum: au, aumFees: 0 }];
  for (let y = 1; y <= n; y++) {
    none = none * (1 + g) + put;
    if (hasFlat) fl = fl * (1 + g) + put;
    const before = au * (1 + g) + put, fee = before * a;
    au = before - fee;
    fees += fee;
    rows.push({ year: y, none, flat: fl, aum: au, aumFees: fees });
  }
  return {
    ready: true, needs: [], rows, years: n, growth: g, aumRate: a, hasFlat, flatFee: hasFlat ? Number(flat) : null,
    end: { none, flat: fl, aum: au }, aumFees: fees, aumCost: none - au,
    flatCost: hasFlat ? none - fl : null, gap: hasFlat ? fl - au : null,
  };
}
