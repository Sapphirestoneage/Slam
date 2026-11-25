// SPDX-License-Identifier: AGPL-3.0-only
// The quick calculators (run Not built, groups 1 to 5, Part 2; M8Q): each one checked by hand on made-up numbers,
// the pages wired to the one renderer, the game's copy current, and no number typed into the views.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as Q from '../js/math/quick.js';
import * as P from '../js/math/quickplan.js';
import { payoffMonths, totalInterest } from '../js/math/debt.js';
import { federalTax } from '../js/math/income.js';

const root = new URL('../', import.meta.url), read = f => readFileSync(new URL(f, root), 'utf8');
const ref = JSON.parse(read('data/reference-2026.json'));
const near = (a, b, tol = 0.01, why = '') => assert.ok(Math.abs(a - b) <= tol, `${why} ${a} vs ${b}`);

test('a HYSA switch: a year of interest at each rate, and five years with deposits', () => {
  assert.equal(Q.qcHysa({}).ready, false);
  const r = Q.qcHysa({ balance: 10000, fromRate: 0.0001, toRate: 0.04 });
  near(r.yearTo, 10000 * ((1 + 0.04 / 12) ** 12 - 1), 1e-6, 'a year at 4%'); near(r.yearFrom, 10000 * ((1 + 0.0001 / 12) ** 12 - 1), 1e-6);
  near(r.gain, 10000 * ((1 + 0.04 / 12) ** 60 - (1 + 0.0001 / 12) ** 60), 1e-6, 'five years');
  const d = Q.qcHysa({ balance: 0, fromRate: 0, toRate: 0.04, monthly: 100, years: 1 });
  near(d.endTo, 100 * ((1 + 0.04 / 12) ** 12 - 1) / (0.04 / 12), 1e-6, 'deposits only'); near(d.endFrom, 1200, 1e-9);
});

test('lump sum or spread: the lump is ahead at a positive return, and the gap is zero when cash earns the same', () => {
  const r = Q.qcDca({ amount: 12000, months: 12, ret: 0.09, cashRate: 0.04 });
  near(r.lump, 12000 * 1.09, 1e-6, 'a year at 9%'); assert.ok(r.gap > 0 && r.spread > 12000);
  const same = Q.qcDca({ amount: 12000, months: 12, ret: 0.06, cashRate: 12 * ((1.06) ** (1 / 12) - 1) });
  near(same.gap, 0, 1e-6, 'cash at the same monthly rate');
  near(Q.qcDca({ amount: 1200, months: 1, ret: 0.05, cashRate: 0 }).gap, 0, 1e-9, 'one month is all at once');
  near(Q.qcNominal(0.07, 0.02), 0.0914, 1e-12);
});

test('warranty, cost per use, Return on Hassle and worth it', () => {
  const w = Q.qcWarranty({ price: 150, repair: 600, chance: 0.2 });
  assert.equal(w.expected, 120); assert.equal(w.evenChance, 0.25); assert.equal(w.pays, false); assert.equal(Q.qcWarranty({ price: 150, repair: 600, chance: 0.3 }).pays, true);
  const u = Q.qcPerUse({ price: 400, resale: 100, uses: 60 }); assert.equal(u.perUse, 5); assert.equal(u.plain, 400 / 60);
  assert.equal(Q.qcPerUse({ price: 100, resale: 500, uses: 10 }).perUse, 0, 'resale never above the price');
  const h = Q.qcHassle({ saved: 120, hours: 2, wage: 30 }); assert.equal(h.perHour, 60); assert.equal(h.times, 2); assert.equal(Q.qcHassle({ saved: 120, hours: 2 }).times, null);
  const k = Q.qcWorth({ direction: 'after', price: 300, uses: 30, wage: 25 }); assert.equal(k.hours, 12); assert.equal(k.perUse, 10); assert.equal(k.hoursPerUse, 0.4);
  assert.equal(Q.qcWorth({ price: 300, uses: 30 }).ready, false, 'needs the hourly pay');
});

test('personal inflation is the spending-weighted price change; a part with no change waits', () => {
  const r = Q.qcInflation({ planRate: 0.02, parts: [{ key: 'housing', amount: 2000, change: 0.05 }, { key: 'food', amount: 1000, change: 0.02 }, { key: 'health', amount: null, change: null }, { key: 'other', amount: 1000, change: 0 }] });
  near(r.rate, (2000 * 0.05 + 1000 * 0.02) / 4000, 1e-12); assert.equal(r.top.key, 'housing'); near(r.gap, 0.01, 1e-12); near(r.yearMore, 4000 * 12 * 0.03, 1e-9);
  const w = Q.qcInflation({ parts: [{ key: 'food', amount: 500, change: null }] }); assert.equal(w.ready, false); assert.deepEqual(w.missing, ['food']);
});

test('starting earlier: the same monthly amount from two ages, the catch-up amount ends at the same place', () => {
  const r = Q.qcStart({ monthly: 300, ageA: 22, ageB: 32, ret: 0.05 }), g = 1.05 ** (1 / 12) - 1;
  near(r.a, 300 * ((1 + g) ** (43 * 12) - 1) / g, 1e-6); near(r.b, 300 * ((1 + g) ** (33 * 12) - 1) / g, 1e-6);
  near(r.catchUp * ((1 + g) ** (33 * 12) - 1) / g, r.a, 1e-6, 'the catch-up ends where the early start ends');
  assert.equal(Q.qcStart({ monthly: 300, ageA: 32, ageB: 22, ret: 0.05 }).early, 22, 'either order');
  assert.equal(Q.qcStart({ monthly: 100, ageA: 30, ageB: 31, ret: 0 }).gap, 1200, 'no growth: just the year of payments');
});

test('kids, a pet and a first apartment add the person\'s own amounts', () => {
  const k = Q.qcKids({ age: 3, little: 15000, school: 12000, teen: 14000 });
  assert.equal(k.years.length, 15); assert.equal(k.left, 2 * 15000 + 8 * 12000 + 5 * 14000); assert.equal(k.now, 15000); assert.equal(k.peak.cost, 15000);
  assert.equal(Q.qcKids({ age: 3, little: 15000, school: null, teen: 1 }).ready, false, 'every stage needs a number ($0 is one)');
  const p = Q.qcPet({ upfront: 300, monthly: 80, vet: 600, years: 10 }); assert.equal(p.year, 1560); assert.equal(p.firstYear, 1860); assert.equal(p.lifetime, 300 + 15600);
  const a = Q.qcApartment({ rent: 2000, depositMonths: 1, lastMonth: 1, brokerMonths: 1.8, moving: 500, setup: 1000, monthlyOther: 150 });
  assert.equal(a.keys, 2000 + 2000 + 2000 + 3600 + 500 + 1000); assert.equal(a.back, 2000); assert.equal(a.month, 2150); assert.equal(a.lines.length, 6);
});

test('New York unemployment: the high quarter over 26 or 25, the floor and the most a week, then the runway', () => {
  const N = ref.limits.unemployment.NY;
  assert.deepEqual([N.lowLine, N.divisorHigh, N.divisorLow, N.minWeekly, N.maxWeekly, N.weeks], [3575, 26, 25, 143, 869, 26]);
  assert.equal(Q.qcUiNy({ highQuarter: 4030, rules: N }).weekly, 155, 'the handbook example: $4,030 / 26 = $155');
  assert.equal(Q.qcUiNy({ highQuarter: 3500, rules: N }).weekly, 140, '$3,500 / 25');
  assert.equal(Q.qcUiNy({ highQuarter: 3600, rules: N }).weekly, 143, 'the floor');
  const top = Q.qcUiNy({ highQuarter: 30000, rules: N }); assert.equal(top.weekly, 869); assert.equal(top.capped, true);
  assert.equal(Q.qcUiNy({ known: 410, rules: N }).weekly, 410, 'the letter\'s rate is used as it is');
  const r = Q.qcBenefitRunway({ cash: 10000, spending: 4000, weekly: 600, weeks: 26 });
  const inM = 600 * 52 / 12, gap = 4000 - inM; near(r.months, 6 + (10000 - gap * 6) / 4000, 1e-9); near(r.without, 2.5, 1e-12);
  const covered = Q.qcBenefitRunway({ cash: 1000, spending: 2000, weekly: 869, weeks: 26 }); assert.ok(covered.months > 6);
  near(Q.qcBenefitRunway({ cash: 1000, spending: 4000, weekly: 600, weeks: 26 }).months, 1000 / gap, 1e-9, 'runs out inside the benefit weeks');
});

test('debt consolidation runs the plan\'s own payoff math and the loan payment, fee in', () => {
  const r = P.qcConsolidate({ balance: 15000, apr: 0.24, payment: 450, loanApr: 0.11, loanYears: 3, feePct: 0.05 });
  assert.equal(r.nowMonths, payoffMonths({ balance: 15000, apr: 0.24, payment: 450 }).value); assert.equal(r.nowInterest, totalInterest({ balance: 15000, apr: 0.24, payment: 450 }).value);
  near(r.principal, 15000 / 0.95, 1e-9); const i = 0.11 / 12; near(r.loanPay, r.principal * i / (1 - (1 + i) ** -36), 1e-9);
  near(r.loanCost, r.loanPay * 36 - 15000, 1e-6, 'interest and fee together'); near(r.saved, r.nowInterest - r.loanCost, 1e-9);
  const never = P.qcConsolidate({ balance: 15000, apr: 0.24, payment: 200, loanApr: 0.11, loanYears: 3 }); assert.equal(never.never, true); assert.equal(never.saved, null);
});

test('leaving a job: the cash over the gap, with the self-employment tax from the tax engine', () => {
  const r = P.qcLeave({ cash: 30000, spending: 4000, health: 600, profit: 0, ref });
  near(r.months, 30000 / 4600, 1e-9); assert.equal(r.tax, 0);
  const s = P.qcLeave({ cash: 30000, spending: 4000, health: 600, profit: 3000, ref }); assert.ok(s.tax > 0 && s.kept < 3000); near(s.months, 30000 / (4600 - s.kept), 1e-9);
  const b = P.qcLeave({ cash: 0, spending: 4000, health: 600, profit: 9000, ref }); assert.equal(b.covered, true); assert.equal(b.months, null);
  assert.ok(s.breakeven > 4600, 'the profit that covers it all is above the month itself');
});

test('roommates split through the household engine (rowShare): by room size, by income, equally', () => {
  const people = [{ id: 'Me', size: 150, income: 3000 }, { id: 'P2', size: 100, income: 6000 }, { id: 'P3', size: 100, income: 3000 }];
  const s = P.qcRoommates({ rent: 3500, bills: 300, how: 'size', people });
  near(s.me.rent, 1500, 1e-9); near(s.me.bills, 100, 1e-9); near(s.rows.reduce((a, p) => a + p.total, 0), 3800, 1e-9);
  const i = P.qcRoommates({ rent: 3600, bills: 300, how: 'income', billsHow: 'same', people }); near(i.rows[1].rent, 1800, 1e-9); near(i.rows[1].bills, 150, 1e-9);
  near(P.qcRoommates({ rent: 3000, how: 'equal', people }).me.rent, 1000, 1e-9);
  assert.equal(P.qcRoommates({ rent: 3000, how: 'size', people: [{ id: 'Me', size: 100 }, { id: 'P2', size: null }] }).ready, false);
  assert.match(read('js/math/quickplan.js'), /import \{ rowShare \} from '\.\/household\.js'/, 'the one split engine');
});

test('the W-4 check: refund or owed against the tax engine, and the line that evens it out', () => {
  const short = P.qcW4({ gross: 85000, withheld: 7000, perCheck: 350, checksLeft: 3, checksYear: 26, ref });
  assert.equal(short.owe, federalTax({ gross: 85000, filingStatus: 'Single' }, ref).value); near(short.owed, short.owe - 8050, 1e-9); near(short.extra, short.owed / 3, 1e-9);
  const over = P.qcW4({ gross: 85000, withheld: 9000, perCheck: 400, checksLeft: 4, checksYear: 26, ref });
  near(over.refund, 10600 - over.owe, 1e-9); near(over.deductions * over.marginal / 26 * 4, over.refund, 1e-6, 'the deduction lowers the paychecks left by the refund');
  const kids = P.qcW4({ gross: 85000, kids: 2, withheld: 7000, perCheck: 350, checksLeft: 3, ref }); assert.ok(kids.credit > 0 && kids.owe < short.owe);
});

test('the month at a glance is M27 and M28', () => {
  const g = P.qcGlance({ takeHome: 5000, spending: 4200 }); assert.equal(g.left, 800); assert.equal(g.rate, 0.16); near(g.perDay, 4200 * 12 / 365, 1e-9);
  assert.equal(P.qcGlance({ takeHome: 5000, spending: 5300, debtOutside: 200 }).left, -500);
});

test('every quick calculator is a page drawn by the one renderer, on the hub shelf, with no number worked out in the view', async () => {
  globalThis.document ??= { documentElement: { dataset: {} } };
  const { QUICK_SPECS, QUICK_SHELF } = await import('../js/solo/quick.js');
  assert.deepEqual([...QUICK_SHELF].sort(), Object.keys(QUICK_SPECS).sort());
  const canon = read('js/solo/canon.js'), hub = read('js/solo/hub.js'), layout = read('tools/e2e/layout.cjs');
  assert.match(canon, /ALL = \{ \.\.\.SPECS, \.\.\.QUICK_SPECS(, \.\.\.\w+)* \}/);
  for (const id of QUICK_SHELF) {
    assert.ok(existsSync(new URL(`${id}.html`, root)), `${id}.html`);
    const page = read(`${id}.html`); assert.match(page, new RegExp(`data-tool="${id}"`)); assert.match(page, /src="js\/solo\/canon\.js"/);
    assert.ok(hub.includes(`'${id}.html'`), `${id} on the hub shelf`); assert.ok(layout.includes(`'${id}'`), `${id} in the layout check`);
    const S = QUICK_SPECS[id]; assert.ok(S.title && S.why && S.fields.length && S.run && S.answer, id);
  }
  const view = read('js/solo/quick.js');
  assert.doesNotMatch(view, /\*\* |Math\.pow|reference-2026/, 'no growth worked out or rate typed in the views');
  assert.doesNotMatch(view, new RegExp(String.fromCharCode(0x2014)));
});

test('the game\'s copy of js/math/quick.js is current', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/game_quick_build.mjs', import.meta.url)), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
