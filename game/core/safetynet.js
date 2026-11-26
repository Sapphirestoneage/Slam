/* ============================================================================
   SLAM the Game: core/safetynet.js
   PURPOSE     Safety nets: medical leave, a move, a breakup and a new baby as money flows over months, the
               run of the cash month by month, the tripwires, Plan B, the months at each level of spending,
               the days, and the rules with an end date. features/nets.js uses it.
   INPUT       Numbers only. No profile, no screen. NT_REF: the dated leave rules and the words.
   OUTPUT      Constants: NT_REF, NT_KINDS, NT_TAPS, NT_WEEK, NT_DAYS_A_MONTH. Functions: ntPicks,
               ntLeaveWeekly, ntEvent, ntFlowAt, ntRun, ntTrips, ntPlanB, ntDegrade, ntDays, ntRuleEnds.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/safetynet.js of the main SLAM app
               and data/reference-2026.json. To change a rule, change the source, then run:
               node tools/game_safety_build.mjs. The tests fail when this copy is stale. Prettier does
               not format this file (.prettierignore).
   ========================================================================= */
/* The dated leave rules (limits.leave.NY) and the words of each change (transitions.templates[].nets). */
const NT_REF = {"leave":{"dbl":{"name":"NY state disability","rate":0.5,"weeklyMax":170,"weeks":26,"waitWeeks":1,"note":"Your own illness, injury or pregnancy off the job: 50% of the average weekly wage of the last 8 weeks worked, up to $170 a week, for up to 26 weeks in 52, from the 8th day of the disability (NY Workers' Compensation Board, What are disability benefits; WCL 204 and 205). Read through a web search on Nov 26 2026 (wcb.ny.gov does not open from the build machine)"},"pfl":{"name":"NY Paid Family Leave","rate":0.67,"weeklyMax":1228.53,"weeks":12,"waitWeeks":0,"note":"Bonding with a new child or caring for family, 2026: 67% of the average weekly wage, up to 67% of the statewide average weekly wage ($1,833.63), $1,228.53 a week, for up to 12 weeks (paidfamilyleave.ny.gov, New York Paid Family Leave Updates for 2026). Read through a web search on Nov 26 2026 (the state site does not open from the build machine)"}},"nets":{"kids":{"trips":[[3,["Cut to the basics","Check the dependent care FSA","Ask family about child care"]],[2,["Ask family for help","Pause investing for the leave","Sell things the baby will not need"]],[1,["Call my coach","Go back part-time","Take any job that covers the Basics"]]],"planB":["A longer leave on less pay","Family child care for the first year","The dependent care FSA for child care"],"link":{"label":"Family money","web":"family.html"}},"divorce":{"trips":[[3,["Open an account in my own name","Cut to the basics","List every joint account and card"]],[2,["Get a roommate","Ask family for help","Call lenders for a hardship plan"]],[1,["Move somewhere cheaper","Call my coach","Take any job that covers the Basics"]]],"planB":["A cheaper place on your own","A roommate for the first year","Keep the car, sell the extra one"],"link":{"label":"Untangling after a breakup","web":"untangle.html","game":"untangle"}},"medical-leave":{"trips":[[3,["Ask HR about short-term disability and leave","Cut to the basics","Call lenders for a hardship plan"]],[2,["Ask family for help","Pause investing until pay is back","Sell one big thing"]],[1,["Call my coach","Ask about a payment plan for the medical bills","Take part-time work I can do"]]],"planB":["Cut to the basics from the first week","Ask the hospital for a payment plan","Use the leave benefit and keep the cushion"],"link":{"label":"Benefits and health","web":"one.html"}},"move":{"trips":[[3,["Keep the old deposit for the new one","Cut to the basics","Hold off on new furniture"]],[2,["Get a roommate","Sell things I do not want to move","Ask family for help"]],[1,["Call my coach","Pick a cheaper place","Delay the move a month"]]],"planB":["Move to a place for less","Sell what you would pay to move","Ask for the old deposit back first"],"link":{"label":"Your first apartment","web":"apartment.html"}}}};
// Safety nets (run Finish everything partly built, Part 15; M8U). Four life changes after the layoff, each as a
// number: medical leave, a move, a breakup, a new baby. A change is a list of money flows over months (pay that
// stops or shrinks, a leave benefit, a cost that rises, a one-time cost); the run walks the cash month by month and
// says how long it lasts, the lowest point and when each tripwire is reached; Plan B is the same run at a lower burn.
// Also: the months at each level of spending (graceful degradation) and the rules with an end date the plan leans on
// (rule-change tripwires). The layoff itself stays where it was built: js/math/transitions.js (the web app's ladder)
// and the game's Break in case of emergency (features/transit.js).
// No imports, so the game loads the same code as a plain script (tools/game_safety_build.mjs writes
// game/core/safetynet.js). Every number in comes from the person's taps, the plan, or the dated rules passed in
// (rules: data/reference-2026.json limits.leave.NY; words: transitions.templates[].nets). Pure: no DOM.

const NT_KINDS = [
  { id: 'medical', name: 'Medical leave', short: 'medical leave', template: 'medical-leave' },
  { id: 'move', name: 'A move', short: 'a move', template: 'move' },
  { id: 'breakup', name: 'A breakup', short: 'a breakup', template: 'divorce' },
  { id: 'baby', name: 'A new baby', short: 'a new baby', template: 'kids' },
];
// The taps of each change: [key, label, [[value, words], ...], the pick it starts on]. A pick it starts on is a Guess
// until the person taps one (the screens say so).
const NT_TAPS = {
  medical: [
    ['weeks', 'How long off work', [[2, '2 weeks'], [6, '6 weeks'], [12, '12 weeks'], [26, '26 weeks']], 6],
    ['paid', 'Pay while you are off', [['none', 'None'], ['ny', 'NY state disability'], ['half', 'Half my pay'], ['full', 'All my pay']], 'none'],
    ['once', 'Medical bills, out of pocket', [[0, '$0'], [500, '$500'], [1500, '$1,500'], [3000, '$3,000']], 0],
  ],
  move: [
    ['housing', 'The new place a month, against now', [[-500, '$500 less'], [-250, '$250 less'], [0, 'The same'], [250, '$250 more'], [500, '$500 more']], 0],
    ['moving', 'Movers, truck and setting up', [[0, '$0'], [500, '$500'], [1500, '$1,500'], [3000, '$3,000']], 1500],
    ['deposit', 'Deposit on the new place', [[0, 'None'], [1, 'One month of rent']], 1],
    ['overlap', 'Months paying both places', [[0, 'None'], [1, 'One month']], 0],
  ],
  breakup: [
    ['lost', 'Money from them that stops, a month', [[0, '$0'], [500, '$500'], [1000, '$1,000'], [2000, '$2,000']], 0],
    ['housing', 'Housing a month, against now', [[-250, '$250 less'], [0, 'The same'], [250, '$250 more'], [500, '$500 more'], [1000, '$1,000 more']], 0],
    ['once', 'Moving out, lawyers, the first weeks', [[0, '$0'], [1000, '$1,000'], [3000, '$3,000'], [5000, '$5,000']], 1000],
  ],
  baby: [
    ['weeks', 'Leave from work', [[0, 'None'], [6, '6 weeks'], [12, '12 weeks']], 12],
    ['paid', 'Pay while you are off', [['none', 'None'], ['ny', 'NY Paid Family Leave'], ['half', 'Half my pay'], ['full', 'All my pay']], 'none'],
    ['monthly', 'New costs a month (child care, diapers, more food)', [[0, '$0'], [500, '$500'], [1000, '$1,000'], [1500, '$1,500'], [2000, '$2,000']], 500],
    ['once', 'The birth and the first things, out of pocket', [[0, '$0'], [1000, '$1,000'], [2500, '$2,500'], [5000, '$5,000']], 1000],
  ],
};
const NT_WEEK = 12 / 52; // a week, in months
const sum = (a, f = v => v) => a.reduce((s, v) => s + (f(v) ?? 0), 0);
const round = v => (v == null ? null : Math.round(v));

// Each tap as given, or the pick it starts on; guess is true while any tap is a start pick.
function ntPicks(kind, taps = {}) {
  const defs = NT_TAPS[kind] || [];
  const v = {}, guess = defs.some(d => taps[d[0]] == null);
  for (const d of defs) v[d[0]] = taps[d[0]] ?? d[3];
  return { v, guess };
}

// A leave benefit a week. rule: { rate, weeklyMax, weeks, waitWeeks } (NY disability or NY Paid Family Leave, dated
// in data/reference-2026.json); weekly: the average weekly wage. Without a weekly wage, null.
function ntLeaveWeekly(rule, weekly) {
  if (!rule || !(weekly > 0)) return null;
  return Math.min(rule.weeklyMax, rule.rate * weekly);
}

// The flows of one change. base: { pay (take-home a month), weekly (the average weekly wage before tax; without it,
// pay x 12 / 52 stands in), housing (a month, for the deposit) }. rules: { dbl, pfl }. Each flow: { id, label,
// monthly, fromK, toK } (monthly > 0 is money in; months can be fractions). once: the one-time costs, at month 0.
function ntEvent(kind, taps = {}, base = {}, rules = {}) {
  const { v, guess } = ntPicks(kind, taps), flows = [], needs = [];
  const pay = base.pay ?? null, weekly = base.weekly ?? (pay > 0 ? pay * NT_WEEK : null);
  const add = (id, label, monthly, fromK, toK) => { if (monthly && toK > fromK) flows.push({ id, label, monthly, fromK, toK }); };
  const leave = (weeks, paid, rule) => {
    if (!(weeks > 0)) return;
    if (pay == null) { needs.push('pay'); return; }
    add('pay', 'Pay that stops while you are off', -pay, 0, weeks * NT_WEEK);
    if (paid === 'full') add('paid', 'Pay kept while you are off', pay, 0, weeks * NT_WEEK);
    else if (paid === 'half') add('paid', 'Half your pay kept', pay / 2, 0, weeks * NT_WEEK);
    else if (paid === 'ny' && rule) {
      const wk = ntLeaveWeekly(rule, weekly), wait = rule.waitWeeks ?? 0, paidWeeks = Math.max(0, Math.min(weeks, rule.weeks) - wait);
      add('paid', `${rule.name}: ${Math.round(rule.rate * 100)}% of your weekly pay, up to the most a week`, wk / NT_WEEK, wait * NT_WEEK, (wait + paidWeeks) * NT_WEEK);
    }
  };
  if (kind === 'medical') { leave(v.weeks, v.paid, rules.dbl); if (v.once) add('once', 'Medical bills, out of pocket', -v.once, 0, 1); }
  else if (kind === 'move') {
    const now = base.housing ?? null, next = now == null ? null : Math.max(0, now + v.housing);
    if (v.housing) add('housing', 'The new place, against now', -v.housing, v.overlap, Infinity);
    if (v.moving) add('moving', 'Movers, truck and setting up', -v.moving, 0, 1);
    if (v.deposit) { if (next == null) needs.push('housing'); else add('deposit', 'Deposit on the new place (it comes back when you leave)', -next * v.deposit, 0, 1); }
    if (v.overlap) { if (next == null) needs.push('housing'); else add('overlap', 'Both places for a month', -next * v.overlap, 0, v.overlap); }
  } else if (kind === 'breakup') {
    if (v.lost) add('lost', 'Money from them that stops', -v.lost, 0, Infinity);
    if (v.housing) add('housing', 'Housing, against now', -v.housing, 0, Infinity);
    if (v.once) add('once', 'Moving out, lawyers, the first weeks', -v.once, 0, 1);
  } else if (kind === 'baby') {
    leave(v.weeks, v.paid, rules.pfl);
    if (v.monthly) add('monthly', 'New costs a month', -v.monthly, 0, Infinity);
    if (v.once) add('once', 'The birth and the first things', -v.once, 0, 1);
  }
  const once = sum(flows.filter(f => f.toK - f.fromK === 1 && f.fromK === 0 && ['once', 'moving', 'deposit', 'overlap'].includes(f.id)), f => -f.monthly);
  return { kind, picks: v, guess, flows, once, needs: [...new Set(needs)], weekly: base.weekly == null ? 'take-home' : 'gross' };
}
const overlap = (k, f) => Math.max(0, Math.min(k + 1, f.toK) - Math.max(k, f.fromK));
// The flows in month k (0 is this month).
const ntFlowAt = (flows, k) => sum(flows, f => f.monthly * overlap(k, f));

// The run: cash, month by month. burn: spending a month; income: what comes in a month before the change. Returns the
// path, the runway (months until the cash runs out, with the part of the last month; null when it never does in
// `max` months), the lowest point and its month, and what is left after `max` months.
function ntRun({ cash = null, burn = null, income = 0, flows = [], max = 120 } = {}) {
  if (cash == null || burn == null) return { ready: false };
  let left = cash, lowest = cash, lowestK = 0, runway = null;
  const path = [{ k: 0, left: cash }];
  for (let k = 0; k < max; k++) {
    const net = (income ?? 0) - burn + ntFlowAt(flows, k);
    if (runway == null && left + net < 0) runway = k + (net < 0 && left > 0 ? left / -net : 0);
    left += net;
    if (left < lowest) { lowest = left; lowestK = k + 1; }
    path.push({ k: k + 1, left });
  }
  const steady = (income ?? 0) - burn + sum(flows.filter(f => f.toK === Infinity), f => f.monthly); // a month once every change has settled
  return { ready: true, path, runway, lasts: runway == null, lowest, lowestK, end: left, steady, cash, burn, income: income ?? 0 };
}

// The tripwires: a cash level of some months of the basics, and the first month the run gets there (now: already at
// or under it; null: never in the run). picks: { months: 'what I will do' }.
function ntTrips(run, basics, levels = [3, 2, 1], picks = {}) {
  if (!run?.ready || !(basics > 0)) return [];
  return levels.map(n => {
    const level = n * basics, at = run.path.find(p => p.left <= level);
    return { months: n, level, now: run.cash <= level, k: at ? at.k : null, pick: picks[n] ?? null };
  });
}

// Plan B: the same change at a lower burn from the start (the basics, or a trim). more: the months it adds (null when
// either run lasts).
function ntPlanB(args, planBurn) {
  const a = ntRun(args), b = ntRun({ ...args, burn: planBurn });
  if (!a.ready || !b.ready) return { ready: false };
  return { ready: true, run: b, burn: planBurn, more: a.runway == null || b.runway == null ? null : b.runway - a.runway, lasts: b.lasts, saved: a.burn - planBurn };
}

// Graceful degradation: the months the cash lasts at each level of spending (full life, DRAFTT, FAT, food and housing
// only), with what still comes in. A level never above the one before it; an unknown level is null with what it needs.
function ntDegrade({ cash = null, income = 0, levels = [] } = {}) {
  let above = null;
  return levels.map(l => {
    const burn = l.burn == null ? null : above == null ? l.burn : Math.min(l.burn, above);
    if (burn != null) above = burn;
    const gap = burn == null ? null : burn - (income ?? 0);
    const months = cash == null || gap == null ? null : gap <= 0 ? null : cash / gap;
    return { ...l, burn, gap, months, lasts: gap != null && gap <= 0 && cash != null, needs: burn == null ? l.needs ?? 'what it costs' : cash == null ? 'cash' : null };
  });
}

// Days, for the playful card (a month is 30.44 days, the same as the runway's days per $1,000).
const NT_DAYS_A_MONTH = 30.44;
const ntDays = months => (months == null ? null : Math.floor(months * NT_DAYS_A_MONTH));

// Rule-change tripwires: each dated rule with an end the plan leans on. rules: [{ id, name, ends: 'YYYY-MM-DD',
// yearly (dollars a year the plan counts from it, or null when it is not money), uses (true when the plan leans on
// it), then (the one next turn) }]. now: 'YYYY-MM'. Only rules still ahead and leaned on; nearest first.
function ntRuleEnds(rules = [], now) {
  const [y, m] = String(now).split('-').map(Number);
  return rules.filter(r => r.uses && r.ends).map(r => {
    const [ey, em] = r.ends.split('-').map(Number), months = (ey - y) * 12 + (em - m);
    return { ...r, months, monthly: r.yearly == null ? null : r.yearly / 12, yearly: r.yearly == null ? null : round(r.yearly) };
  }).filter(r => r.months >= 0).sort((a, b) => a.months - b.months);
}
