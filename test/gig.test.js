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
