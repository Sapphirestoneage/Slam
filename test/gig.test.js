// SPDX-License-Identifier: AGPL-3.0-only
// Gig and self-employed (run Not built, groups 1 to 5, Part 5; M8G): each tool checked by hand on made-up numbers,
// the pages wired to the one renderer, the game's copy current, and no number typed into the views.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as G from '../js/math/gig.js';
import * as P from '../js/math/gigplan.js';
import { takeHomeFromGross, householdTax, quarterlySetAside } from '../js/math/income.js';

const root = new URL('../', import.meta.url), read = f => readFileSync(new URL(f, root), 'utf8');
const ref = JSON.parse(read('data/reference-2026.json'));
const near = (a, b, tol = 0.01, why = '') => assert.ok(Math.abs(a - b) <= tol, `${why} ${a} vs ${b}`);

test('the price floor: the life, health, retirement and tax over the paid hours, the costs on top', () => {
  assert.equal(P.gigRate({}, ref).ready, false, 'empty is not zero');
  assert.equal(P.gigRate({ takeHome: 4000, hoursWeek: 40 }, ref).ready, false, 'no billable share yet');
  const R = P.gigRate({ takeHome: 4000, health: 500, retire: 6000, costs: 300, hoursWeek: 40, billable: 0.6, weeksOff: 6, unitHours: 2 }, ref);
  assert.equal(R.need.year, 4000 * 12 + 500 * 12 + 6000);
  near(takeHomeFromGross({ gross: R.profit, selfEmployed: true }, ref).value, R.need.year, 1.01, 'the profit leaves the need after tax');
  assert.equal(R.hours.year, 40 * 0.6 * 46);
  near(R.hourly, (R.profit + 3600) / 1104, 1e-9, 'by hand'); near(R.day, R.hourly * 8, 1e-9); near(R.unit, R.hourly * 2, 1e-9);
  near(R.ifEveryHour, (R.profit + 3600) / 2080, 1e-9); near(R.downtimeShare, 1 - 1104 / 2080, 1e-12);
  near(R.tax, R.profit - R.need.year, 1e-9);
  const ny = P.gigRate({ takeHome: 4000, hoursWeek: 40, billable: 0.6, weeksOff: 6, place: 'nyc' }, ref), fed = P.gigRate({ takeHome: 4000, hoursWeek: 40, billable: 0.6, weeksOff: 6 }, ref);
  assert.ok(ny.hourly > fed.hourly, 'New York City tax raises the floor');
  assert.equal(G.gigProfitFlat(7000, 0.3), 10000, 'the game\'s way: the need over what is left after the set-aside');
});

test('the set-aside: the profit stacked on a job\'s pay, through the same function as the Taxes screen', () => {
  assert.equal(P.gigSetAside({ profit: null }, ref).ready, false);
  const alone = P.gigSetAside({ profit: 30000 }, ref), th = takeHomeFromGross({ gross: 30000, selfEmployed: true }, ref);
  near(alone.yearly, 30000 - th.value, 0.01, 'alone: the same tax as the take-home engine'); near(alone.rate, alone.yearly / 30000, 1e-12);
  near(alone.parts.selfEmployment, 30000 * 0.9235 * 0.153, 0.01, 'self-employment tax by hand'); near(alone.quarterly * 4, alone.yearly, 1e-9);
  const both = P.gigSetAside({ profit: 30000, wages: 60000, earned: 20000, set: 3000, year: 2026 }, ref);
  const hh = householdTax([{ id: 'job', taxType: 'W-2', gross: 60000, pretax: 0 }, { id: 'gig', taxType: '1099', gross: 30000 }], {}, ref);
  near(both.yearly, quarterlySetAside(hh, ref).yearly, 1e-9);
  const jobOnly = householdTax([{ id: 'job', taxType: 'W-2', gross: 60000, pretax: 0 }], {}, ref).total.all;
  near(both.yearly, hh.total.all - jobOnly, 0.01, 'what the profit adds on top of the job');
  assert.ok(both.rate > alone.rate, 'stacked on a job, each dollar is taxed higher');
  assert.deepEqual(both.due, ['2026-04-15', '2026-06-15', '2026-09-15', '2027-01-15']);
  near(both.soFar.owed, 20000 * both.rate, 1e-9); near(both.soFar.toMove, 20000 * both.rate - 3000, 1e-9);
  const ahead = G.gigSoFarFrom({ rate: 0.25, earned: 1000, set: 400 }); assert.equal(ahead.toMove, 0); assert.equal(ahead.ahead, 150);
  assert.equal(G.gigSoFarFrom({ rate: 0.25 }).ready, false);
});

test('retirement for the self-employed: the base, a Solo 401(k), a SEP, an IRA, and which first', () => {
  const L = G.gigLimitsOf(ref.limits);
  assert.deepEqual(L, { deferral: 24500, catchUp50: 8000, catchUp60to63: 11250, total: 72000, ira: 7500, iraCatchUp50: 1100, compCap: 360000, filing5500: 250000 });
  near(G.GIG_OWNER_RATE, 0.2, 1e-12, 'a 25% plan is 20% for the owner (Publication 560)');
  const R = P.gigRetire({ profit: 50000, age: 40 }, ref), half = 50000 * 0.9235 * 0.153 / 2, base = 50000 - half;
  near(R.seHalf, half, 0.01); near(R.base, base, 0.01); near(R.sep, 0.2 * base, 0.01);
  near(R.solo.total, 24500 + 0.2 * base, 0.01); assert.equal(R.ira, 7500); assert.equal(R.first, 'solo');
  assert.equal(P.gigRetire({ profit: 50000, age: 40, want: 5000 }, ref).first, 'ira');
  assert.equal(P.gigRetire({ profit: 50000, age: 40, want: 9000 }, ref).first, 'sep');
  const big = P.gigRetire({ profit: 50000, age: 40, want: 30000 }, ref); assert.equal(big.first, 'solo'); assert.equal(big.fits, true);
  const job = P.gigRetire({ profit: 50000, age: 40, deferredAtJob: 24500 }, ref);
  assert.equal(job.solo.defer, 0, 'the deferral limit is one per person'); near(job.solo.total, job.sep, 1e-9);
  const old = G.gigRetireOf({ profit: 400000, seHalf: 20000, age: 61, limits: L });
  assert.equal(old.comp, 360000, 'pay counted up to the 401(a)(17) cap'); assert.equal(old.solo.total, 72000 + 11250, 'the total, then the 60 to 63 catch-up'); assert.equal(old.sep, 72000); assert.equal(old.ira, 8600);
  const small = G.gigRetireOf({ profit: 6000, seHalf: 424, age: 30, limits: L });
  near(small.solo.total, 6000 - 424, 1e-9, 'never more than the base'); assert.equal(G.gigRetireOf({ profit: 0, seHalf: 0, limits: L }).first, null);
});

test('invoices: the due date, days past it, the ages, each client\'s pace, the calm rhythm', () => {
  assert.equal(G.gigInvoicesOf([], '2026-11-25').ready, false);
  const list = [{ id: 1, client: 'A', amount: 500, sent: '2026-09-01', terms: 30 }, { id: 2, client: 'A', amount: 300, sent: '2026-10-01', terms: 30, paid: '2026-11-05' },
    { id: 3, client: 'B', amount: 900, sent: '2026-11-20', terms: 15 }, { id: 4, client: 'C', amount: 200, sent: '2026-06-01', due: '2026-06-15' }, { id: 5, amount: 0, sent: '2026-01-01' }];
  const R = G.gigInvoicesOf(list, '2026-11-25');
  assert.equal(R.rows.length, 4, 'an invoice with no amount is left out');
  const a1 = R.rows.find(r => r.id === 1); assert.equal(a1.dueDate, '2026-10-01'); assert.equal(a1.status, 'past'); assert.equal(a1.daysPast, 55);
  const c4 = R.rows.find(r => r.id === 4); assert.equal(c4.daysPast, 163, 'a typed due date wins');
  const p2 = R.rows.find(r => r.id === 2); assert.equal(p2.daysToPay, 35); assert.equal(p2.paidLate, 5);
  assert.equal(R.rows.find(r => r.id === 3).daysToDue, 10);
  assert.equal(R.waiting, 1600); assert.equal(R.past, 700); assert.equal(R.notDue, 900); assert.equal(R.got, 300); assert.equal(R.next30, 900); assert.equal(R.oldest, 163);
  assert.deepEqual(R.ages.map(a => a.total), [0, 500, 0, 200]);
  assert.equal(R.rows[0].id, 4, 'the oldest past its date first');
  assert.equal(R.clients.find(c => c.client === 'A').avgDaysToPay, 35);
  assert.equal(G.gigNudgeOf(0), null); assert.equal(G.gigNudgeOf(1).id, 'note'); assert.equal(G.gigNudgeOf(14).id, 'second'); assert.equal(G.gigNudgeOf(59).id, 'call'); assert.equal(G.gigNudgeOf(200).id, 'pause');
});

test('apps and tips: what each app says, its fee, what landed, and cash on top', () => {
  assert.equal(G.gigAppsOf({ apps: [{ name: 'Uber' }] }).ready, false);
  const R = G.gigAppsOf({ apps: [{ name: 'Uber', earned: 900, tips: 120, fee: 0, landed: 880 }, { name: 'Etsy', earned: 400, fee: 38, landed: 362 }, { name: 'DoorDash', earned: 300, tips: 90 }], cash: 60 });
  assert.equal(R.all, 1660); assert.equal(R.tips, 270); assert.equal(R.fee, 38); assert.equal(R.landed, 1242); assert.equal(R.gap, 20); assert.equal(R.toCheck, 1);
  assert.equal(R.rows[0].name, 'Uber'); assert.equal(R.rows[0].state, 'short'); assert.equal(R.rows.find(r => r.name === 'Etsy').state, 'matches'); assert.equal(R.rows.find(r => r.name === 'DoorDash').state, 'waiting');
  near(R.rows.find(r => r.name === 'Etsy').feeShare, 0.095, 1e-12); near(R.rows.reduce((s, r) => s + r.share, 0) + 60 / 1660, 1, 1e-12);
  assert.equal(G.gigAppsOf({ apps: [{ earned: 100, landed: 130 }] }).rows[0].state, 'over');
});

test('Profit First: the book\'s sample, your own shares, what has no place, and shares over 100%', () => {
  const R = G.gigProfitFirstOf({ income: 2000 });
  assert.deepEqual(R.of, { profit: 100, owner: 1000, tax: 300, opex: 600 }); assert.equal(R.left, 0);
  const mine = G.gigProfitFirstOf({ income: 1000, pcts: { profit: 0.1, owner: 0.4, tax: 0.25, opex: 0.2 } }); near(mine.left, 50, 1e-9);
  assert.equal(G.gigProfitFirstOf({ income: 1000, pcts: { profit: 0.5, owner: 0.5, tax: 0.3, opex: 0 } }).ready, false);
  assert.equal(G.gigProfitFirstOf({ income: null }).ready, false);
});

test('every page is drawn by the one renderer, on the hub shelf and in the layout check, with no number worked out in the view', async () => {
  globalThis.document ??= { documentElement: { dataset: {} } };
  const { GIG_SPECS, GIG_SHELF } = await import('../js/solo/gig.js');
  const canon = read('js/solo/canon.js'), hub = read('js/solo/hub.js'), layout = read('tools/e2e/layout.cjs');
  assert.match(canon, /\.\.\.GIG_SPECS/);
  assert.deepEqual(GIG_SHELF.map(s => s[0]).filter(id => id !== 'invoices').sort(), Object.keys(GIG_SPECS).sort());
  for (const [id] of GIG_SHELF) {
    assert.ok(existsSync(new URL(`${id}.html`, root)), `${id}.html`);
    assert.ok(hub.includes(`'${id}.html'`), `${id} on the hub shelf`); assert.ok(layout.includes(`'${id}'`), `${id} in the layout check`);
    const page = read(`${id}.html`);
    if (id === 'invoices') { assert.match(page, /src="js\/solo\/invoices\.js"/); continue; }
    assert.match(page, new RegExp(`data-tool="${id}"`)); assert.match(page, /src="js\/solo\/canon\.js"/);
    const S = GIG_SPECS[id]; assert.ok(S.title && S.why && S.fields.length && S.run && S.answer, id);
  }
  for (const f of ['js/solo/gig.js', 'js/solo/invoices.js', 'js/math/gig.js', 'js/math/gigplan.js']) {
    const text = read(f);
    assert.doesNotMatch(text, new RegExp(String.fromCharCode(0x2014)), `${f}: no em dash`);
    assert.doesNotMatch(text, /overdue|delinquent|deadbeat|failed|behind on/i, `${f}: calm words`);
  }
  for (const f of ['js/solo/gig.js', 'js/solo/invoices.js']) assert.doesNotMatch(read(f), /\b0\.9235|0\.153|24500|72000|reference-2026/, `${f}: no rate or limit typed in the view`);
});

test('the game\'s copy of js/math/gig.js is current', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/game_gig_build.mjs', import.meta.url)), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

// ---- Run Finish everything partly built, Part 14 (Taxes and self-employed) ----
const SH = ref.tax.safeHarbor;
test('safe harbor: the smaller of 90% of this year and 100% (110%) of last year, less withholding, a quarter at each date', () => {
  assert.equal(G.gigSafeHarborOf({}).ready, false, 'empty is not zero');
  const due = ['2026-04-15', '2026-06-15', '2026-09-15', '2027-01-15'];
  // By hand: this year 12,000, last year 9,000 with AGI under the line: 100% of 9,000 = 9,000 < 90% of 12,000 = 10,800.
  const A = G.gigSafeHarborOf({ thisYear: 12000, lastYear: 9000, lastAgiOver: false, withheld: 3000, paid: 2000, due, today: '2026-11-26', rule: SH });
  assert.equal(A.which, 'prior'); assert.equal(A.required, 9000); assert.equal(A.need, 6000); assert.equal(A.each, 1500);
  assert.deepEqual(A.dates.map(d => d.by), [1500, 3000, 4500, 6000]); assert.deepEqual(A.dates.map(d => d.passed), [true, true, true, false]);
  assert.equal(A.byNow, 4500); assert.equal(A.catchUp, 2500); assert.equal(A.next.date, '2027-01-15'); assert.equal(A.toNext, 4000);
  assert.equal(A.fullYear, 7000, 'to owe nothing: 12,000 - 3,000 - 2,000');
  // AGI over the line: 110% of 9,000 = 9,900; not sure: the higher share too.
  near(G.gigSafeHarborOf({ thisYear: 12000, lastYear: 9000, lastAgiOver: true, due, rule: SH }).required, 9900, 1e-9);
  const unsure = G.gigSafeHarborOf({ thisYear: 12000, lastYear: 9000, due, rule: SH });
  near(unsure.required, 9900, 1e-9); assert.equal(unsure.agiSure, false);
  // This year lower: 90% of 8,000 = 7,200 wins.
  const B = G.gigSafeHarborOf({ thisYear: 8000, lastYear: 9000, lastAgiOver: false, due, rule: SH });
  assert.equal(B.which, 'current'); near(B.required, 7200, 1e-9);
  // No last year typed: this year's test only.
  near(G.gigSafeHarborOf({ thisYear: 8000, due, rule: SH }).required, 7200, 1e-9);
  // A 12-month year with $0 tax: none needed. A short year: the prior test does not apply.
  const Z = G.gigSafeHarborOf({ thisYear: 8000, lastYear: 0, due, rule: SH }); assert.equal(Z.none, 'zero'); assert.equal(Z.need, 0);
  assert.equal(G.gigSafeHarborOf({ thisYear: 8000, lastYear: 0, lastFull: false, due, rule: SH }).none, null);
  // Under $1,000 due after withholding: none needed.
  assert.equal(G.gigSafeHarborOf({ thisYear: 5900, lastYear: 9000, withheld: 5000, due, rule: SH }).none, 'small');
  assert.equal(G.gigSafeHarborOf({ thisYear: 6000, lastYear: 9000, withheld: 5000, due, rule: SH }).none, null, 'exactly $1,000 is not under it');
});

test('the safe harbor rules are dated IRS rules, and the page\'s words match them', () => {
  assert.deepEqual([SH.current, SH.prior, SH.priorHigh, SH.highAgi, SH.highAgiSeparate, SH.owe], [0.9, 1, 1.1, 150000, 75000, 1000]);
  assert.match(SH.source, /Form 1040-ES/); assert.match(SH.source, /Nov 26 2026/);
  const view = read('js/solo/gig.js');
  assert.match(view, /AGI over \$150,000\?/); assert.match(view, /90% of this year\\'s tax or 100% of last year\\'s \(110% when last year\\'s AGI was over \$150,000\)/);
  assert.match(read('game/core/gigcore.js'), /const GIG_SAFE_HARBOR = \{"current":0\.9,"prior":1,"priorHigh":1\.1,"highAgi":150000/);
});

test('the Tax Command Center: the set-aside with the safe harbor on this year\'s federal tax', () => {
  const R = P.gigTaxCenter({ profit: 30000, wages: 50000, earned: 25000, set: 3000, paid: 2000, lastYear: 9000, lastAgiOver: false, today: '2026-11-26', year: 2026 }, ref);
  const hh = householdTax([{ id: 'job', taxType: 'W-2', gross: 50000, pretax: 0 }, { id: 'gig', taxType: '1099', gross: 30000 }], { filingStatus: 'Single', place: null }, ref);
  near(R.federal, hh.rows.job.federal + hh.rows.gig.federal + hh.rows.gig.fica, 1e-6, 'this year\'s federal tax');
  near(R.withheld, hh.rows.job.federal, 1e-9, 'a job\'s withholding taken as its own income tax');
  assert.equal(R.withheldGuess, true);
  near(R.soFar.set, 5000, 1e-9, 'set aside and paid both count toward what is owed so far');
  assert.equal(R.harbor.which, 'prior'); near(R.harbor.need, 9000 - R.withheld, 1e-6);
  assert.deepEqual(R.harbor.dates.map(d => d.date), ['2026-04-15', '2026-06-15', '2026-09-15', '2027-01-15']);
  const typed = P.gigTaxCenter({ profit: 30000, wages: 50000, withheld: 6000, lastYear: 9000, lastAgiOver: false, today: '2026-11-26', year: 2026 }, ref);
  assert.equal(typed.harbor.withheld, 6000); assert.equal(typed.withheldGuess, false);
  assert.equal(P.gigTaxCenter({}, ref).ready, false);
});

test('Pricing your power: a gig\'s pay an hour next to the floor an hour', () => {
  assert.equal(G.gigVsFloorOf({ floor: 40 }).ready, false, 'no gig pay yet');
  const V = G.gigVsFloorOf({ floor: 40, pay: 30, month: 6000 });
  assert.equal(V.gap, -10); assert.equal(V.share, 0.75); assert.equal(V.atOrAbove, false); assert.equal(V.hoursMonth, 200); assert.equal(V.floorHoursMonth, 150);
  assert.equal(G.gigVsFloorOf({ floor: 40, pay: 40 }).atOrAbove, true);
  const R = P.gigPricing({ takeHome: 4000, hoursWeek: 40, billable: 0.7, weeksOff: 4, gigPay: 28 }, ref), F = P.gigRate({ takeHome: 4000, hoursWeek: 40, billable: 0.7, weeksOff: 4 }, ref);
  near(R.vs.floor, F.hourly, 1e-9, 'the same floor as the floor page'); near(R.vs.hoursMonth, F.month / 28, 1e-9);
});

test('Platform P&L: payout timing from the platform\'s own page or the person\'s taps, and what can still be on its way', () => {
  const pf = ref.platforms;
  for (const k of ['Uber', 'DoorDash', 'Upwork']) assert.ok(pf[k].own && pf[k].own.url && /^2026-11-\d\d$/.test(pf[k].own.read) && pf[k].own.says, `${k}: its own page, dated`);
  for (const k of ['OnlyFans', 'Fansly', 'Patreon', 'Etsy', 'Other']) assert.equal(pf[k].own, undefined, `${k}: not from its own page, so it waits for taps`);
  // DoorDash, a week: earned 700, nothing fee, 500 landed. Own page: weekly + 3 days. On its way at most 700 x min(1, 10/7) = 700.
  const A = G.gigPayoutsOf({ apps: [{ name: 'DoorDash', earned: 700, landed: 500 }], stretchDays: 7 }, pf);
  assert.equal(A.rows[0].from, 'page'); assert.equal(A.rows[0].holdDays, 3); assert.equal(A.rows[0].window, 10); assert.equal(A.rows[0].onWayMax, 700); assert.equal(A.rows[0].state, 'onway');
  // A month: 3,000 earned, 2,200 landed: on its way at most 3,000 x 10/30 = 1,000, so the 800 gap reads as on its way.
  const M = G.gigPayoutsOf({ apps: [{ name: 'DoorDash', earned: 3000, landed: 2200 }], stretchDays: 30 }, pf);
  assert.equal(M.rows[0].onWayMax, 1000); assert.equal(M.rows[0].state, 'onway');
  const M2 = G.gigPayoutsOf({ apps: [{ name: 'DoorDash', earned: 3000, landed: 1500 }], stretchDays: 30 }, pf);
  assert.equal(M2.rows[0].state, 'short', 'more than can be on its way');
  // Etsy has no own-page timing: it waits for taps; the taps then lead.
  const E = G.gigPayoutsOf({ apps: [{ name: 'Etsy', earned: 600, fee: 57, landed: 400 }], stretchDays: 30 }, pf);
  assert.equal(E.rows[0].window, null); assert.deepEqual(E.untimed, ['Etsy']); assert.equal(E.onWayMax, null);
  const T = G.gigPayoutsOf({ apps: [{ name: 'Etsy', earned: 600, fee: 57, landed: 400, payout: 'week', hold: 3 }], stretchDays: 30 }, pf);
  assert.equal(T.rows[0].from, 'yours'); near(T.rows[0].onWayMax, 543 * 10 / 30, 1e-9); assert.equal(T.rows[0].state, 'onway');
  near(T.feeShare, 57 / 600, 1e-12);
  // The base stays gigAppsOf.
  const base = G.gigAppsOf({ apps: [{ name: 'Etsy', earned: 600, fee: 57, landed: 400 }] });
  assert.equal(T.all, base.all); assert.equal(T.gap, base.gap);
});
