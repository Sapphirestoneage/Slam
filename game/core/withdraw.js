/* ============================================================================
   SLAM the Game: core/withdraw.js
   PURPOSE     The ways to take money out: the list of families and variants, the rule of each one for a
               year of spending, how the money is held, when the money comes out, and the summary of a
               set of market histories. "Compare the ways" (features/ways.js) and the replay of
               features/odds.js use it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: UNIFORM, WAYS, WAY_FAMILIES, WAY_TIMINGS, WAY_HORIZONS, WAY_COLUMNS, WAY_FILTERS,
               WAY_CUSTOM_KINDS, WAY_CAPE, WAY_VPW, WAY_CASH_REAL, WAY_CUT_LINE. Functions: wayById,
               wayFamily, wayTolerance, wayCustom, wayOff, vpwShare, spendDownPayment, waySpend, wayReturn,
               wayPay, wayRandom, wayShuffle, wayCycle, wayHistory, waySort, wayFilter, wayPin, wayMeaning.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/withdraw.js of the main SLAM app,
               so the web app and the game have one copy of each rule. To change a rule, change the
               source, then run: node tools/game_withdraw_build.mjs. The tests fail when this copy is
               stale. Prettier does not format this file (.prettierignore).
   ========================================================================= */
// The ways to take money out, once. Every rule that sets a year's spending in the free years lives here, with the
// list of families and variants the "Compare the ways" screen shows. Two engines call it and neither has a rule of its
// own: the whole-life plan of the web app (js/math/lifetime.js, with taxes and three kinds of account) and the replay
// of the game (game/features/odds.js, one pile of money). The game cannot load a module, so tools/game_withdraw_build.mjs
// writes this file again as a plain script (game/core/withdraw.js); a test in each suite fails when the copy is stale.
// Pure: no DOM, no storage, no import. All amounts are in today's dollars, so "a raise for prices" is no change at all.
// tools/audit/engine2.py works every rule here out a second time (docs/AUDIT.md).

// Required withdrawals from taxed-later money: the balance divided by this number at each age (IRS Publication 590-B,
// Uniform Lifetime Table, for 2022 and later). The table starts at 73.
const UNIFORM = { 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4 };
// What cash earns after inflation in the "how the money is held" ways. SLAM's own assumption (Nov 25 2026): a savings
// account about keeps pace with prices. The market data has no cash series (QUESTIONS.md).
const WAY_CASH_REAL = 0;
// A year counts as a cut when it pays less than 99.5% of what the way aims to pay.
const WAY_CUT_LINE = 0.995;
// The CAPE rule of Big ERN: a base share plus a share of 1 divided by the CAPE (Safe Withdrawal Rate series, Part 18,
// Aug 30 2017, and Part 54, Oct 12 2022: "intercept 1.75% and slope 0.50").
const WAY_CAPE = { a: 0.0175, b: 0.5 };
// VPW grows stocks at 5.0% and bonds at 1.9% a year after inflation and takes the last payment at 99 (Bogleheads wiki,
// "Variable percentage withdrawal"). The wiki could not be opened from the build machine on Nov 25 2026, so the way is
// switched off until someone checks these three numbers against it (QUESTIONS.md).
const WAY_VPW = { stocks: 0.05, bonds: 0.019, lastAge: 99 };

const WAY_TIMINGS = [
  { id: 'start', name: 'Once a year, at the start', plain: 'The whole year comes out on the first day. This is how the classic studies count.' },
  { id: 'monthly', name: 'Every month', plain: 'A twelfth comes out each month, so the rest stays invested a little longer.' },
  { id: 'end', name: 'Once a year, at the end', plain: 'The year is paid for on its last day, after the market has moved.' },
];
const WAY_HORIZONS = [30, 40, 50];

// The families. tolerate: the lowest share of what the way aims to pay that a year may pay and the history still
// counts as working (the same numbers the lifetime plan has used since it was built).
const WAY_FAMILIES = [
  { id: 'steady', name: 'Steady spending', tolerate: 0.999, by: 'William Bengen, 1994 (the 4% rule), and the Trinity study, 1998',
    plain: 'Take a set share of your money in the first year, then the same amount every year, raised for prices, whatever the market does.' },
  { id: 'guardrails', name: 'Guardrails', tolerate: 0.699, by: 'Jonathan Guyton and William Klinger, 2006',
    plain: 'Start at what your life costs. When the share you take drifts too high, cut spending. When it drifts low, raise it.' },
  { id: 'floor', name: 'Floor and ceiling', tolerate: 0.849, by: 'William Bengen, 2001; Vanguard, 2012 (dynamic spending)',
    plain: 'Follow the market, but never spend less than a floor or more than a ceiling.' },
  { id: 'share', name: 'A share of the portfolio', tolerate: 0.75, by: 'The endowment rule that universities use (Yale: James Tobin, 1974)',
    plain: 'Spend the same share of whatever the money is worth each year. It cannot run out, and spending moves with the market.' },
  { id: 'age', name: 'Spend by age', tolerate: 0.75, by: 'The Bogleheads forum (VPW), the IRS tables, and Bill Perkins (Die With Zero, 2020)',
    plain: 'The share you take grows as you get older, so the money is used up on purpose. The amount is what comes out of your accounts: tax comes out of it, and other income adds to it.' },
  { id: 'held', name: 'How the money is held', tolerate: 0.999, by: 'Harold Evensky (buckets), Michael Kitces and Wade Pfau (the bond tent), Kristy Shen and Bryce Leung (the yield shield)',
    plain: 'These change where the money sits, not the rule. Each one is paired with steady spending at 4%.' },
  { id: 'market', name: 'Market-aware', tolerate: 0.75, by: 'Karsten Jeske (Big ERN), with Robert Shiller\'s CAPE',
    plain: 'Take a larger share when stocks are cheap next to their earnings, and a smaller share when they are dear.' },
  { id: 'custom', name: 'Custom', tolerate: 0.75, by: 'You',
    plain: 'Pick a family, a rate, when the money comes out and for how many years.' },
];

const waySteady = (rate, more = {}) => ({ rule: 'fixed', anchor: 'rate', rate, ...more });
const wayPct = v => `${Math.round(v * 10000) / 100}%`;
// gross: the rule's amount is what leaves the accounts (tax comes out of it, other income adds to it), not what is spent.
// The spend-by-age ways work this way, because they are built to use the money up.
// Every way, in the order the screen shows them. The first of a family is its default row. off: why a way is switched
// off (the screen shows the reason and no numbers). needs: the data a way reads each year.
const WAYS = [
  // 1. Steady spending
  { id: 'steady-4', family: 'steady', name: 'The 4% rule', ...waySteady(0.04), plain: 'Take 4% of your money in the first year, then the same amount each year, raised for prices.', by: 'William Bengen, 1994' },
  { id: 'steady-3', family: 'steady', name: 'Steady at 3%', ...waySteady(0.03), plain: 'The same rule, starting at 3%.', by: 'A cautious setting many early retirees use' },
  { id: 'steady-3.25', family: 'steady', name: 'Steady at 3.25%', ...waySteady(0.0325), plain: 'The same rule, starting at 3.25%.', by: 'Karsten Jeske (Big ERN) names it for very long retirements' },
  { id: 'steady-3.5', family: 'steady', name: 'Steady at 3.5%', ...waySteady(0.035), plain: 'The same rule, starting at 3.5%.', by: 'A common setting for 40 years and more' },
  { id: 'steady-4.7', family: 'steady', name: 'Steady at 4.7%', ...waySteady(0.047), plain: 'The same rule, starting at 4.7%.', by: 'William Bengen\'s later number, with more kinds of stocks' },
  { id: 'steady-5', family: 'steady', name: 'Steady at 5%', ...waySteady(0.05), plain: 'The same rule, starting at 5%.', by: 'The upper end the Trinity study tested' },
  { id: 'steady-monthly', family: 'steady', name: '4%, paid monthly', ...waySteady(0.04, { timing: 'monthly' }), plain: 'The 4% rule, with a twelfth coming out each month.', by: 'How most people really get paid' },
  { id: 'steady-end', family: 'steady', name: '4%, paid at year-end', ...waySteady(0.04, { timing: 'end' }), plain: 'The 4% rule, with the year paid for on its last day.', by: 'The Trinity study counted this way' },
  { id: 'steady-skip', family: 'steady', name: '4%, no raise after a down year', ...waySteady(0.04, { skipRaise: true, tolerate: 0.75 }), plain: 'The 4% rule, but after a year when the money fell, spending gets no raise for prices.', by: 'Jonathan Guyton, 2004 (his inflation rule)' },
  { id: 'steady-30', family: 'steady', name: '4% for 30 years', ...waySteady(0.04, { horizon: 30 }), plain: 'The 4% rule, counted for 30 years from the day work stops.', by: 'William Bengen tested 30 years' },
  { id: 'steady-40', family: 'steady', name: '4% for 40 years', ...waySteady(0.04, { horizon: 40 }), plain: 'The 4% rule, counted for 40 years from the day work stops.', by: 'For an early stop' },
  { id: 'steady-50', family: 'steady', name: '4% for 50 years', ...waySteady(0.04, { horizon: 50 }), plain: 'The 4% rule, counted for 50 years from the day work stops.', by: 'For a very early stop' },
  // 2. Guardrails
  { id: 'guard', family: 'guardrails', name: 'Guardrails, 20% bands', rule: 'guardrails', over: 1.2, under: 0.8, cutTo: 0.9, raiseTo: 1.1, plain: 'Start at what your life costs. Cut 10% when the share you take is 20% above where it started. Raise 10% when it is 20% below. A cut never goes under 70% of what your life costs.', by: 'Jonathan Guyton and William Klinger, 2006' },
  { id: 'guard-cutonly', family: 'guardrails', name: 'Cut only, never raise', rule: 'guardrails', over: 1.2, under: 0.8, cutTo: 0.9, raiseTo: 1, plain: 'The same lower guardrail, and no raise in good years. More is left at the end.', by: 'A cautious reading of Guyton and Klinger' },
  { id: 'guard-risk', family: 'guardrails', name: 'Keep the odds in a band', rule: 'risk', only: 'game', plain: 'Move spending 5% when the odds that the plan works leave the band from 70 to 95 out of 100.', by: 'Michael Kitces and Derek Tharp (risk-based guardrails)' },
  { id: 'guard-10', family: 'guardrails', name: 'Guardrails, 10% bands', rule: 'guardrails', over: 1.1, under: 0.9, cutTo: 0.9, raiseTo: 1.1, plain: 'Narrow bands: spending moves sooner and more often.', by: 'A setting of Guyton and Klinger\'s rule' },
  { id: 'guard-30', family: 'guardrails', name: 'Guardrails, 30% bands', rule: 'guardrails', over: 1.3, under: 0.7, cutTo: 0.9, raiseTo: 1.1, plain: 'Wide bands: spending moves late and seldom.', by: 'A setting of Guyton and Klinger\'s rule' },
  { id: 'guard-5', family: 'guardrails', name: 'Guardrails, 5% steps', rule: 'guardrails', over: 1.2, under: 0.8, cutTo: 0.95, raiseTo: 1.05, plain: 'The same bands, with smaller steps: 5% down or up at a time.', by: 'A setting of Guyton and Klinger\'s rule' },
  // 3. Floor and ceiling
  { id: 'floor', family: 'floor', name: 'Floor 85%, ceiling 120%', rule: 'floor', lo: 0.85, hi: 1.2, plain: 'Spend the same share of the money each year, but never less than 85% or more than 120% of what your life costs.', by: 'William Bengen, 2001' },
  { id: 'floor-90', family: 'floor', name: 'Floor 90%, ceiling 110%', rule: 'floor', lo: 0.9, hi: 1.1, tolerate: 0.899, plain: 'A tighter range: never less than 90% or more than 110% of what your life costs.', by: 'A setting of Bengen\'s rule' },
  { id: 'floor-vanguard', family: 'floor', name: 'Vanguard-style dynamic spending', rule: 'vanguard', up: 0.05, down: 0.015, tolerate: 0.75, plain: 'Follow the market, but raise spending at most 5% and cut it at most 1.5% from one year to the next.', by: 'Vanguard, 2012 and later' },
  // 4. A share of the portfolio
  { id: 'share-4', family: 'share', name: '4% of what is left', rule: 'percent', rate: 0.04, plain: 'Each year, spend 4% of whatever the money is worth then.', by: 'The endowment rule' },
  { id: 'share-3', family: 'share', name: '3% of what is left', rule: 'percent', rate: 0.03, plain: 'Each year, spend 3% of whatever the money is worth then.', by: 'The endowment rule' },
  { id: 'share-5', family: 'share', name: '5% of what is left', rule: 'percent', rate: 0.05, plain: 'Each year, spend 5% of whatever the money is worth then.', by: 'The endowment rule' },
  { id: 'share-smooth', family: 'share', name: '4% of the 3-year average', rule: 'percent', rate: 0.04, smooth: 3, plain: 'Spend 4% of the average of the last 3 year-end values, so one bad year moves spending less.', by: 'The Yale endowment rule (James Tobin)' },
  // 5. Spend by age
  { id: 'age-dwz', family: 'age', name: 'Die With Zero spend-down', rule: 'dwz', gross: true, target: 0, targetAge: null, plain: 'Each year, spend what would bring the money to the amount you choose at the age you choose, if the plan\'s own return held.', by: 'Bill Perkins, Die With Zero, 2020' },
  { id: 'age-vpw', family: 'age', name: 'VPW', rule: 'vpw', gross: true, plain: 'A share by your age and your mix of stocks and bonds, from the Bogleheads table. It rises every year.', by: 'The Bogleheads forum (longinvest)',
    off: 'Switched off: the Bogleheads table could not be opened from here to check its numbers. The method is built and waits for that check.' },
  { id: 'age-rmd', family: 'age', name: 'The RMD method', rule: 'rmd', gross: true, fromAge: 73, plain: 'Each year, spend the money divided by the number of years the IRS table gives for your age.', by: 'The IRS Uniform Lifetime Table (Publication 590-B); Wei Sun and Anthony Webb, 2012' },
  // 6. How the money is held (each paired with steady spending at 4%)
  { id: 'held-bucket1', family: 'held', name: 'Buckets: 1 year in cash', ...waySteady(0.04, { hold: { kind: 'bucket', years: 1 } }), plain: 'Keep 1 year of withdrawals in cash. After a down year, live on the cash. After a good year, fill it up again.', by: 'Harold Evensky' },
  { id: 'held-bucket2', family: 'held', name: 'Buckets: 2 years in cash', ...waySteady(0.04, { hold: { kind: 'bucket', years: 2 } }), plain: 'Keep 2 years of withdrawals in cash. After a down year, live on the cash. After a good year, fill it up again.', by: 'Harold Evensky' },
  { id: 'held-tent', family: 'held', name: 'A bond tent', ...waySteady(0.04, { hold: { kind: 'tent', drop: 0.2, years: 10 } }), needs: 'mix', plain: 'Hold 20 points fewer stocks on the day work stops, then move back to your own mix over 10 years.', by: 'Michael Kitces and Wade Pfau, 2014' },
  { id: 'held-shield', family: 'held', name: 'Yield shield and cash cushion', ...waySteady(0.04, { hold: { kind: 'shield', years: 5 } }), needs: 'yield', plain: 'After a down year, live on the dividends and interest the money pays, plus a cash cushion that holds 5 years of the gap. Sell nothing. This uses the yield of the plain index: the tilt to higher-yield funds is not modeled.', by: 'Kristy Shen and Bryce Leung (Millennial Revolution)' },
  // 7. Market-aware
  { id: 'market-cape', family: 'market', name: 'CAPE-based spending', rule: 'cape', a: WAY_CAPE.a, b: WAY_CAPE.b, needs: 'cape', plain: 'Each year, spend 1.75% of the money plus half of 1 divided by the CAPE. At a CAPE of 25 that is 3.75%.', by: 'Karsten Jeske (Big ERN), with Robert Shiller\'s CAPE' },
  // 8. Custom
  { id: 'custom', family: 'custom', name: 'Your own', ...waySteady(0.04), custom: true, plain: 'The family, the rate, the timing and the years you picked.', by: 'You' },
];
const wayById = id => WAYS.find(w => w.id === id) ?? null;
const wayFamily = id => WAY_FAMILIES.find(f => f.id === id) ?? null;
const wayTolerance = way => way?.tolerate ?? wayFamily(way?.family)?.tolerate ?? 0.999;
// The families a custom way can copy, with the rate each one starts from: [id, name, the way it copies].
const WAY_CUSTOM_KINDS = [['steady', 'Steady spending', 'steady-4'], ['guardrails', 'Guardrails', 'guard'], ['floor', 'Floor and ceiling', 'floor'], ['share', 'A share of the portfolio', 'share-4'], ['market', 'CAPE-based', 'market-cape']];
const WAY_CUSTOM_DEFAULT = { kind: 'steady', rate: 0.04, timing: 'start', horizon: null };
// The custom way from the person's picks: { kind, rate, timing, horizon }. Guardrails and floor and ceiling start at
// what life costs, so the rate is not theirs to set; the CAPE rule takes the rate as its base share.
function wayCustom(pick = {}) {
  const p = { ...WAY_CUSTOM_DEFAULT, ...pick }, kind = WAY_CUSTOM_KINDS.find(k => k[0] === p.kind) ?? WAY_CUSTOM_KINDS[0], base = wayById(kind[2]);
  const rate = Math.min(0.1, Math.max(0.01, Number(p.rate) || 0.04));
  const rule = p.kind === 'steady' ? waySteady(rate) : p.kind === 'share' ? { rule: 'percent', rate } : p.kind === 'market' ? { rule: 'cape', a: Math.max(0, rate - 0.02), b: WAY_CAPE.b, needs: 'cape' } : { ...base };
  const usesRate = p.kind === 'steady' || p.kind === 'share' || p.kind === 'market';
  return { ...rule, id: 'custom', family: 'custom', custom: true, kind: kind[0], usesRate, tolerate: wayTolerance(base), timing: WAY_TIMINGS.some(t => t.id === p.timing) ? p.timing : 'start', horizon: WAY_HORIZONS.includes(p.horizon) ? p.horizon : null,
    name: `Your own: ${kind[1].toLowerCase()}${usesRate ? ` at ${wayPct(rate)}` : ''}`, by: 'You',
    plain: `${kind[1]}${usesRate ? `, ${p.kind === 'market' ? 'a base share of ' + wayPct(Math.max(0, rate - 0.02)) + ' plus half of 1 divided by the CAPE' : 'at ' + wayPct(rate)}` : ''}. ${WAY_TIMINGS.find(t => t.id === (p.timing ?? 'start'))?.name ?? WAY_TIMINGS[0].name}. ${WAY_HORIZONS.includes(p.horizon) ? `Counted for ${p.horizon} years.` : 'Counted to the last year of your plan.'}` };
}
// Why a way shows no numbers on this plan, or null when it runs. ctx: { where: 'web' | 'game', stopAge, hasCape, hasYield }.
function wayOff(way, ctx = {}) {
  if (way.off) return way.off;
  if (way.only && ctx.where && way.only !== ctx.where) return 'Switched off here: it needs the retirement engine, which only SLAM the Game carries. Open it there.';
  if (way.rule === 'rmd' && ctx.stopAge != null && ctx.stopAge < (way.fromAge ?? 73)) return `Switched off for a stop before ${way.fromAge ?? 73}: the IRS table starts at ${way.fromAge ?? 73}.`;
  if (way.needs === 'cape' && ctx.hasCape === false) return 'Switched off: the market history on file has no CAPE.';
  if (way.needs === 'yield' && ctx.hasYield === false) return 'Switched off: the market history on file has no yields.';
  return null;
}

// The share VPW takes at an age, for a mix: the payment that uses the money up with the last payment at 99.
function vpwShare(age, stock) {
  const n = Math.max(1, WAY_VPW.lastAge + 1 - age), g = stock * WAY_VPW.stocks + (1 - stock) * WAY_VPW.bonds;
  return Math.min(1, g === 0 ? 1 / n : g / (1 - (1 + g) ** -n) / (1 + g));
}
// The payment at the start of each of n years that brings `start` to `target`, growing at g a year.
function spendDownPayment(start, target, n, g) {
  if (n <= 0) return g === 0 ? 0 : Math.max(0, start * g / (1 + g)); // past the chosen age: spend the growth, keep the amount
  const v = (1 + g) ** -n;
  return Math.max(0, g === 0 ? (start - target) / n : (start - target * v) * g / ((1 - v) * (1 + g)));
}

// ONE YEAR'S SPENDING by a way. way: a row of WAYS (or the lifetime plan's own { id, rate }).
// s: { need (what life costs this year), start (the money on the first day), k (years since work stopped), age,
//      endAge (the plan's last year), last (last year's return of the whole portfolio after inflation, or null),
//      infl (last year's inflation, or null), cape (this January's, or null), stock (share in stocks),
//      growth (the plan's own return a year), risk (the game only: a function that gives the engine's answer) }
// mem: {} at the start of a run; the rule keeps what it must remember there.
// Returns { spend, aim }: aim is what the way means to pay when nothing is cut (what life costs, or its own first year).
function waySpend(way, s, mem) {
  const rule = way.rule ?? way.id ?? 'fixed', need = s.need, start = s.start;
  if (mem.wr0 == null) mem.wr0 = start > 0 ? need / start : null;
  if (mem.start0 == null && start > 0) mem.start0 = start;
  let spend = need, aim = need, own = false; // own: the way sets its own amount, so its first year is its aim
  if (rule === 'fixed') {
    if (way.anchor === 'rate') { spend = (way.rate ?? 0.04) * (mem.start0 ?? 0); aim = spend; }
    if (way.skipRaise) {
      // After a year when the money fell (before inflation is taken off), this year's raise for prices is skipped.
      if (s.last != null && s.infl != null && s.infl > 0 && (1 + s.last) * (1 + s.infl) < 1) mem.real = (mem.real ?? 1) / (1 + s.infl);
      spend *= mem.real ?? 1;
    }
  } else if (rule === 'percent') {
    let basis = start;
    if (way.smooth > 1) { mem.ends = [...(mem.ends ?? []), start].slice(-way.smooth); basis = mem.ends.reduce((a, v) => a + v, 0) / mem.ends.length; }
    spend = basis * (way.rate ?? 0.04); own = true;
  } else if (rule === 'floor') {
    spend = Math.min(need * (way.hi ?? 1.2), Math.max(need * (way.lo ?? 0.85), start * (way.rate ?? mem.wr0 ?? 0.04)));
  } else if (rule === 'guardrails') {
    if (mem.wr0) {
      let adjust = mem.adjust ?? 1;
      const wr = start > 0 ? need * adjust / start : Infinity, raiseTo = way.raiseTo ?? 1.1;
      if (wr > mem.wr0 * (way.over ?? 1.2)) adjust *= way.cutTo ?? 0.9; else if (raiseTo > 1 && wr < mem.wr0 * (way.under ?? 0.8) && adjust < 1.3) adjust *= raiseTo;
      adjust = Math.max(0.7, adjust); // a cut never goes below 70% of what life costs
      mem.adjust = adjust; spend = need * adjust;
    }
  } else if (rule === 'vanguard') {
    const target = start * (way.rate ?? mem.wr0 ?? 0.04);
    spend = mem.prior == null ? target : Math.min(mem.prior * (1 + (way.up ?? 0.05)), Math.max(mem.prior * (1 - (way.down ?? 0.015)), target));
    mem.prior = spend; own = true;
  } else if (rule === 'vpw') {
    spend = start * vpwShare(s.age, s.stock ?? 0.6); own = true;
  } else if (rule === 'rmd') {
    const f = UNIFORM[Math.min(100, s.age)];
    spend = f ? start / f : 0; own = true;
  } else if (rule === 'dwz') {
    const at = way.targetAge ?? s.endAge + 1; // the default: the day after the plan's last year
    spend = Math.min(start, spendDownPayment(start, way.target ?? 0, at - s.age, way.growth ?? s.growth ?? 0)); own = true;
  } else if (rule === 'cape') {
    spend = s.cape > 0 ? start * ((way.a ?? WAY_CAPE.a) + (way.b ?? WAY_CAPE.b) / s.cape) : 0; own = true;
  } else if (rule === 'risk') {
    spend = s.risk ? s.risk() : need;
  }
  spend = Math.max(0, spend);
  if (own) { if (mem.first == null && start > 0) mem.first = spend; aim = mem.first ?? spend; }
  return { spend, aim };
}

// THE YEAR'S RETURN of the whole portfolio, by how the money is held. yr: { r } (one number for the whole portfolio)
// and, from history, { s, b (stocks and bonds after inflation), dy, by (the dividend and bond yields) }.
// s: { stock (share in stocks), k (years since work stopped), last (last year's portfolio return), start (the money
// on the first day), w (what comes out of the portfolio this year, before tax) }. A way with no `hold` gets yr.r back.
function wayReturn(way, yr, s, mem) {
  const hold = way.hold, mix = share => (yr.s != null && yr.b != null ? share * yr.s + (1 - share) * yr.b : yr.r);
  if (!hold) return yr.r ?? mix(s.stock);
  if (hold.kind === 'tent') return mix(Math.max(0, s.stock - hold.drop * Math.max(0, 1 - s.k / hold.years)));
  // A cash pile beside the invested money. After a down year the withdrawal comes from the cash and it is not filled
  // again; after any other year it is filled to its target. Cash earns WAY_CASH_REAL; the rest earns the plan's mix.
  const invested = yr.r ?? mix(s.stock), left = s.start - s.w;
  if (!(left > 0)) return invested;
  let gap = s.w;
  if (hold.kind === 'shield') {
    const pays = (yr.dy != null && yr.by != null ? s.stock * yr.dy + (1 - s.stock) * yr.by : 0) * Math.max(0, s.start - (mem.cash ?? 0));
    gap = Math.max(0, s.w - pays); // the yield pays first; the cushion covers only what it does not
  }
  const target = hold.years * gap, down = s.last != null && s.last < 0;
  const cash = Math.min(left, down ? Math.max(0, (mem.cash ?? target) - gap) : target);
  mem.cash = cash * (1 + WAY_CASH_REAL);
  return (cash * WAY_CASH_REAL + (left - cash) * invested) / left;
}

// ONE YEAR ON ONE PILE: take w out by the timing, grow at r. Returns { p (the money at the year's end), short (what
// could not be paid) }. Monthly is twelve real steps at the monthly rate that compounds to r.
function wayPay(p, w, r, timing = 'start') {
  let short = 0;
  if (timing === 'end') { p = p * (1 + r) - w; if (p < 0) { short = -p; p = 0; } return { p, short }; }
  if (timing === 'monthly') {
    const m = (1 + r) ** (1 / 12) - 1;
    for (let i = 0; i < 12; i++) { p -= w / 12; if (p < 0) { short += -p; p = 0; } p *= 1 + m; }
    return { p, short };
  }
  p -= w; if (p < 0) { short = -p; p = 0; }
  return { p: p * (1 + r), short };
}

// A seeded random number source (mulberry32), the same one the stress test uses.
const wayRandom = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
// The random markets: `runs` lists of `length` positions in the real years, drawn with a fixed seed. Each drawn year
// keeps its own stocks, bonds, inflation, CAPE and yields together. size: how many real years there are.
function wayShuffle(size, length, runs = 1000, seed = 7) {
  const next = wayRandom(seed);
  return Array.from({ length: runs }, () => Array.from({ length }, () => Math.floor(next() * size)));
}

// ONE HISTORY, summed up. paid: [{ spend, aim, short, share }] for each free year (share: the part of the aim that was
// paid, when the engine has worked it out itself; else spend divided by aim). Returns { first (year-one spending),
// lowest (the lowest share of the aim any year paid), cuts (years that paid under the cut line), years }.
function wayCycle(paid) {
  let lowest = 1, cuts = 0;
  for (const y of paid) { if (!(y.aim > 0)) continue; const share = y.share ?? y.spend / y.aim; if (share < lowest) lowest = share; if (share < WAY_CUT_LINE) cuts++; }
  return { first: paid.length ? paid[0].spend : null, lowest, cuts, years: paid.length };
}
// ALL THE REAL START YEARS of one way. cycles: [{ start (the year), lasted (the money never ran short), ranOutAge,
// end, lowest, cuts, years }]. tolerate: wayTolerance(way). A start year works when the money lasted and no year paid
// under the tolerated share. worst: the start that ran out soonest, then paid the lowest share, then ended lowest.
// deepest and the cut counts look only at the starts where the money lasted (running out is counted by `ok`, not as a cut).
function wayHistory(cycles, tolerate) {
  const works = c => c.lasted && c.lowest >= tolerate, n = cycles.length, ok = cycles.filter(works).length;
  if (!n) return { n: 0, ok: 0, share: null, worst: null, deepest: null, cutsWorst: null, medianEnd: null, failed: [] };
  const worst = [...cycles].sort((a, b) => (a.ranOutAge ?? 999) - (b.ranOutAge ?? 999) || a.lowest - b.lowest || a.end - b.end)[0];
  const lasted = cycles.filter(c => c.lasted), ends = cycles.map(c => c.end).sort((a, b) => a - b);
  return { n, ok, share: ok / n, worst, deepest: lasted.length ? Math.min(...lasted.map(c => c.lowest)) : null,
    cutsWorst: worst.cuts, medianEnd: ends[Math.floor((n - 1) / 2)], failed: cycles.filter(c => !works(c)).map(c => c.start) };
}

// ONE ROW of the table, from what an engine worked out for one way. p: { off (why it shows no numbers), first (year-one
// spending on a smooth market), need (what life costs in year one), atStop (the money on the day work stops), cycles
// (every real start year, as wayHistory takes them), randomOk and randomRuns (the random markets that work, and how
// many were run), years (the free years counted), stopAge (the earliest age work can stop, null for none, undefined
// while it is not worked out yet), stopAt (the plan's own stop age), target (the share of start years the stop age asks for) }.
function wayRow(way, p) {
  const fam = wayFamily(way.family), base = { id: way.id, family: way.family, familyName: fam?.name ?? '', name: way.name, plain: way.plain, by: way.by, timing: way.timing ?? 'start', horizon: way.horizon ?? null, tolerate: wayTolerance(way) };
  if (p.off) return { ...base, off: p.off };
  const H = wayHistory(p.cycles, base.tolerate);
  return { ...base, off: null, first: p.first, need: p.need, atStop: p.atStop, stopAt: p.stopAt, target: p.target, random: p.randomRuns ? p.randomOk / p.randomRuns : null, randomOk: p.randomOk, randomRuns: p.randomRuns,
    real: H.share, ok: H.ok, n: H.n, from: p.cycles[0]?.start ?? null, to: p.cycles.length ? p.cycles[p.cycles.length - 1].start : null,
    worstYear: H.worst?.start ?? null, worstRanOut: H.worst?.ranOutAge ?? null, drop: H.worst?.lowest ?? null, deepest: H.deepest, cuts: H.cutsWorst, years: p.years, end: H.medianEnd, stopAge: p.stopAge };
}
// SHOW THE MATH for one row: one line for each number. money(v): the caller's way to write dollars. source: where the
// market history comes from.
function wayMath(row, money, source) {
  if (row.off) return [row.off];
  const pct = v => `${Math.round(v * 1000) / 10}%`;
  return [
    `Year one: this way pays ${money(row.first)} a year, which is ${money(row.first / 12)} a month, from ${money(row.atStop)} on the day work stops (age ${row.stopAt}), if the plan's own return holds until then. What your life costs then: ${money(row.need)} a year.`,
    `Real start years: ${row.ok} of ${row.n} work (starts from ${row.from} to ${row.to}, ${row.years} years each). A start year works when the money lasts and no year pays under ${pct(row.tolerate)} of what this way aims to pay.`,
    `Random markets: ${row.randomOk.toLocaleString('en-US')} of ${row.randomRuns.toLocaleString('en-US')} work. Each one is the real years in a random order, with a fixed seed, so the same plan gives the same count.`,
    row.worstYear == null ? null : `Hardest start year for this way: ${row.worstYear}. ${row.worstRanOut != null ? `The money runs short at age ${row.worstRanOut}, and the lowest year pays ${pct(row.drop)} of the aim (what other income still covers).` : `The lowest year pays ${pct(row.drop)} of the aim.`} ${row.cuts} of ${row.years} years pay under ${pct(WAY_CUT_LINE)} of the aim.`,
    row.deepest == null ? 'Deepest cut: the money runs short in every real start year, so there is no start year to measure a cut in.' : `Deepest cut: in the start years where the money lasted, the lowest year pays ${pct(row.deepest)} of the aim, a cut of ${pct(1 - row.deepest)}.`,
    `Left at the end: ${money(row.end)} in the middle real start year, in today's dollars.`,
    row.stopAge === undefined ? null : row.stopAge == null ? 'Work can stop: no age up to 80 holds on this way with these numbers.' : `Work can stop at ${row.stopAge}: the first age where a smooth market works, year one pays what your life costs, and at least ${pct(row.target)} of real start years work.`,
    row.timing === 'monthly' ? 'When the money comes out: a twelfth each month. The year is worked out in twelve steps, each followed by a month of growth.' : row.timing === 'end' ? 'When the money comes out: the last day of each year, after the year\'s growth.' : 'When the money comes out: the first day of each year.',
    `Market history: ${source}. The past is not a forecast.`,
  ].filter(Boolean);
}

// THE TABLE. A row: { id, family, name, off, first (year-one spending a year), random (share of random markets that
// work), real (share of real start years), worstYear, drop (the lowest share paid in the worst start year), deepest
// (the lowest share paid in any start year where the money lasted), cuts (years with a cut in the worst start year),
// end (the median left at the end), stopAge }.
const WAY_COLUMNS = [
  { id: 'first', name: 'Year one', high: true }, { id: 'random', name: 'Random markets', high: true }, { id: 'real', name: 'Real start years', high: true },
  { id: 'drop', name: 'Worst start', high: true }, { id: 'deepest', name: 'Deepest cut', high: true }, { id: 'cuts', name: 'Years with a cut', high: false },
  { id: 'end', name: 'Left at the end', high: true }, { id: 'stopAge', name: 'Work can stop', high: false },
];
const WAY_FILTERS = [
  { id: 'all', name: 'All' }, { id: 'nocut', name: 'Never cuts spending' }, { id: 'first', name: 'Highest year-one spending' }, { id: 'odds', name: 'Highest odds' },
];
const wayNeverCuts = r => !r.off && r.deepest != null && r.deepest >= WAY_CUT_LINE && r.cuts === 0;
// Sort by a column. dir: 'best' puts the kindest number first (the highest, or for cuts and the stop age the lowest),
// 'other' the reverse. Rows that are switched off, or have no number in that column, go last in both.
function waySort(rows, col, dir = 'best') {
  const c = WAY_COLUMNS.find(x => x.id === col); if (!c) return [...rows];
  const sign = (c.high ? -1 : 1) * (dir === 'best' ? 1 : -1), has = r => !r.off && r[col] != null;
  return [...rows].map((r, i) => [r, i]).sort(([a, i], [b, j]) => (has(b) - has(a)) || (has(a) ? sign * (a[col] - b[col]) : 0) || i - j).map(([r]) => r);
}
// The three quick picks: 'nocut' keeps the rows that never cut, 'first' sorts by year-one spending, 'odds' by the
// share of real start years that work and then of random markets.
function wayFilter(rows, id) {
  if (id === 'nocut') return rows.filter(wayNeverCuts);
  if (id === 'first') return waySort(rows, 'first');
  if (id === 'odds') return waySort(waySort(rows, 'random'), 'real');
  return [...rows];
}
// Pin or unpin a row: at most 3 pinned, the oldest pin drops when a fourth is added.
function wayPin(pins, id, max = 3) {
  const list = (pins || []).filter(Boolean);
  return list.includes(id) ? list.filter(p => p !== id) : [...list, id].slice(-max);
}
// "What this means for you": one line, no verdict. It sets two rows side by side: the two the person pinned first, or
// the steady default and the guardrails default. money(v): the caller's way to write dollars. Null with nothing to say.
function wayMeaning(rows, pins, money) {
  const live = rows.filter(r => !r.off && r.first != null && r.real != null);
  const picked = (pins || []).map(id => live.find(r => r.id === id)).filter(Boolean);
  const [a, b] = picked.length >= 2 ? picked : [live.find(r => r.id === 'steady-4') ?? live[0], live.find(r => r.id === 'guard') ?? live[1]];
  if (!a || !b || a === b) return null;
  const say = r => { const cut = r.deepest == null ? null : Math.round((1 - r.deepest) * 100);
    return `${r.name} pays ${money(r.first / 12)} a month in year one and held in ${r.ok} of ${r.n} real start years${cut == null ? '' : cut < 1 ? ', with no cut in any of them' : `, with spending down as much as ${cut}% in a hard stretch`}`; };
  return `On your numbers: ${say(a)}. ${say(b)}. A higher start comes with more cuts or lower odds, and which trade suits you is yours to weigh.`;
}
