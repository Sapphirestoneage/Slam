// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentFor, homeOf } from '../js/home.js';
import { loanFromPayment } from '../js/math/lender.js';
import { WORRIES, WORRY_GROUPS, worryOf } from '../js/worries.js';
import { STAGES, SITUATIONS } from '../js/journey.js';

test('a home payment: $500,000 at 7% for 30 years, by hand', () => {
  const p = paymentFor(500000, { rate: 0.07, years: 30, share: 0.25 });
  assert.ok(Math.abs(p.pi - 3326.51) < 0.01, `principal and interest ${p.pi}`); // 500000 * (0.07/12) / (1 - (1+0.07/12)^-360)
  assert.ok(Math.abs(p.all - 4435.35) < 0.01, `all in ${p.all}`); // 3326.51 / 0.75
  assert.ok(Math.abs(loanFromPayment(p.all, { rate: 0.07, years: 30, share: 0.25 }) - 500000) < 0.01, 'the lender view gets the same loan back');
  assert.deepEqual(paymentFor(0), { pi: 0, taxIns: 0, all: 0 });
  assert.equal(paymentFor(360000, { rate: 0, years: 30, share: 0 }).all, 1000);
});

test('the home screen: cash, loan, share of pay, and the insurance note under 20% down', () => {
  const pl = { m: { inputs: { takeHome: 8000 } } };
  const a = homeOf(null, null, null, pl, { price: 750000, down: 1 / 3, rate: 0.07 });
  assert.equal(Math.round(a.cash), 250000); assert.equal(Math.round(a.loan), 500000);
  assert.ok(Math.abs(a.share - 4435.35 / 8000) < 1e-4); assert.equal(a.insured, false); assert.ok(a.check);
  assert.equal(a.extra, null); assert.match(a.line, /Tap what you pay/);
  const b = homeOf(null, null, null, pl, { price: 400000, down: 0.05, rate: 0.07, now: 2000 });
  assert.equal(b.insured, true); assert.ok(b.notes.some(n => /mortgage insurance/.test(n)));
  assert.ok(Math.abs(b.extra - (b.all - 2000)) < 1e-9);
});

test('worries: 26 of them, each with a place to look and steps, in plain words', () => {
  assert.equal(WORRIES.length, 26);
  assert.equal(new Set(WORRIES.map(w => w.id)).size, 26);
  const groups = new Set(WORRY_GROUPS.map(g => g[0])), stages = new Set(STAGES.map(s => s.id)), sits = new Set(SITUATIONS.map(s => s[0]));
  for (const w of WORRIES) {
    assert.ok(groups.has(w.group), w.id);
    assert.ok(w.see.length >= 2 && w.see.length <= 3 && w.steps.length >= 3 && w.steps.length <= 6, w.id);
    for (const [label, stage] of w.see) { assert.ok(label && stages.has(stage), `${w.id}: ${stage}`); }
    if (w.sit) assert.ok(sits.has(w.sit));
    const words = [w.label, ...w.steps, ...(w.why || []), ...w.see.map(s => s[0])].join(' ');
    assert.doesNotMatch(words, new RegExp(String.fromCharCode(8212)), `${w.id}: no em dashes`);
    assert.doesNotMatch(words, /\b(should|must|bad|wrong|fail|warning|risky|danger)\b/i, `${w.id}: no verdict words`);
  }
  assert.ok(WORRIES.filter(w => w.group === 'people').length >= 8);
  assert.equal(worryOf('home').see[0][2], 'home'); assert.equal(worryOf('nope'), null);
});

import { scheduleOf, rentOrBuy } from '../js/home.js';
import { MIRRORS, mirrorOf, pctToFi, snapshotOf, auditOf, auditWords, valuesOf, sinceWords } from '../js/mirror.js';
import { readFile } from '../js/import/apps.js';
import { readFileSync } from 'node:fs';
const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));

test('mortgage insurance and closing costs are in the home numbers', () => {
  const pl = { m: { inputs: { takeHome: 8000 } } };
  const a = homeOf(null, null, null, pl, { price: 400000, down: 0.05, rate: 0.07, pmi: 0.005, closing: 0.03, now: 2000 });
  assert.ok(Math.abs(a.pmi - 380000 * 0.005 / 12) < 1e-9); assert.equal(Math.round(a.closing), 12000); assert.equal(Math.round(a.upfront), 32000);
  assert.ok(Math.abs(a.all - (a.pi + a.taxIns + a.pmi)) < 1e-9); assert.ok(Math.abs(a.extra - (a.all - 2000)) < 1e-9);
  assert.equal(homeOf(null, null, null, pl, { price: 400000, down: 0.2 }).pmi, 0);
});

test('the loan year by year: interest and paydown add up to the payments, and it ends at zero', () => {
  const rows = scheduleOf(500000, { rate: 0.07, years: 30 });
  assert.equal(rows.length, 30); assert.ok(rows.at(-1).balance < 0.01);
  assert.ok(Math.abs(rows.reduce((s, r) => s + r.paid, 0) - 500000) < 0.01);
  assert.ok(Math.abs(rows[0].interest + rows[0].paid - 3326.51 * 12) < 0.2);
  assert.ok(rows[0].interest > rows[0].paid && rows.at(-1).interest < rows.at(-1).paid);
  assert.deepEqual(scheduleOf(0), []);
});

test('own or rent, by hand on flat numbers', () => {
  const flat = { rate: 0, share: 0, homeGrowth: 0, investGrowth: 0, rentGrowth: 0, horizon: 10, selling: 0 };
  // $360,000, nothing down, no interest: $1,000 a month, the same as rent. After 10 years the owner has paid $120,000 of the loan.
  const a = rentOrBuy({ ...flat, price: 360000, down: 0, rent: 1000 });
  assert.ok(Math.abs(a.owner - 120000) < 0.01 && a.renter === 0); assert.equal(a.even, 1);
  // All cash: the owner has no payment and invests the $1,000 rent; the renter keeps the $360,000.
  const b = rentOrBuy({ ...flat, price: 360000, down: 1, rent: 1000 });
  assert.ok(Math.abs(b.owner - 480000) < 0.01 && Math.abs(b.renter - 360000) < 0.01);
  // Cheap rent and fast investment growth: renting is ahead at 10 years.
  const c = rentOrBuy({ price: 750000, down: 0.2, rate: 0.07, rent: 2000, homeGrowth: 0, investGrowth: 0.09, rentGrowth: 0, horizon: 10 });
  assert.ok(c.renter > c.owner);
  assert.equal(rentOrBuy({ price: 500000, down: 0.2, rent: 0 }), null);
  // Selling costs 6% of the sale; a gain past $250,000 is taxed at 15% (twice the tax-free amount on a joint return).
  const d = rentOrBuy({ ...flat, price: 360000, down: 1, rent: 1000, selling: 0.06 });
  assert.ok(Math.abs(d.owner - (480000 - 21600)) < 0.01);
  const grow = { rate: 0, share: 0, investGrowth: 0, rentGrowth: 0, horizon: 10, selling: 0, price: 1000000, down: 1, rent: 1000, homeGrowth: 2 ** 0.1 - 1 };
  const e = rentOrBuy(grow), f = rentOrBuy({ ...grow, joint: true });
  assert.ok(Math.abs(e.gainTax - (1000000 - 250000) * 0.15) < 1); assert.ok(Math.abs(f.gainTax - (1000000 - 500000) * 0.15) < 1);
});

test('the mirror: four ways to lead the plan, percent of the way, a year at a glance', () => {
  assert.equal(MIRRORS.length, 4); assert.equal(mirrorOf('nope').id, 'date');
  for (const m of MIRRORS) for (const k of ['hero', 'step', 'tiles', 'milestones']) assert.ok(m.order.includes(k), `${m.id} shows ${k}`);
  const pl = { m: { fiNumber: { value: 960000 }, inputs: { invested: 29500, takeHome: 4000, spending: 3000 }, surplus: { value: 1000 }, investing: { monthly: 600 }, savingsRate: { value: 0.25 } } };
  assert.ok(Math.abs(pctToFi(pl) - 29500 / 960000) < 1e-12); assert.equal(pctToFi({}), null);
  const snap = snapshotOf(pl);
  assert.deepEqual(snap.map(r => r.value), ['$48,000', '$36,000', '$12,000', '$7,200', '25.0%']);
});

test('a Rocket Money export becomes spending a month, without transfers or card payments', () => {
  const read = readFile(readFileSync(new URL('../fixtures/import/rocket-money-nov.csv', import.meta.url), 'utf8'), ref);
  const a = auditOf(read, ref);
  assert.ok(!a.problem, a.problem); assert.ok(a.months >= 1); assert.ok(a.monthly > 0);
  assert.equal(a.monthly, a.rows.reduce((s, r) => s + r.monthly, 0));
  assert.ok(a.rows.every(r => !/transfer|credit card payment|paycheck/i.test(r.name)));
  const byHand = read.transactions.filter(t => t.amount < 0 && !t.ignored && !String(ref.importCategories.rocket[t.appCategory] ?? '').startsWith('@')).reduce((s, t) => s - t.amount, 0);
  assert.ok(Math.abs(a.monthly - byHand / a.months) <= a.rows.length);
  assert.match(auditWords(a, a.monthly + 500), /\$500 a month lower/);
  assert.ok(auditOf(readFile(readFileSync(new URL('../fixtures/import/unknown-nov.csv', import.meta.url), 'utf8'), ref), ref).problem);
});

test('the value matrix and what changed since last time', () => {
  const v = valuesOf([{ name: 'Rent', monthly: 1500 }, { name: 'Dining out', monthly: 400 }, { name: 'Subscriptions', monthly: 100 }], { 'Dining out': 'tolerate', Subscriptions: 'dislike', Rent: 'like' });
  assert.equal(v.loose, 500); assert.equal(v.half, 250); assert.equal(v.marked, 3); assert.equal(v.totals.like, 1500);
  assert.equal(sinceWords({ at: '2026-11-01', fi: 'Nov 2051', worth: 1000 }, { at: '2026-11-01', fi: 'Oct 2051', worth: 2000 }), null);
  assert.equal(sinceWords({ at: '2026-11-01', fi: 'Nov 2051', worth: 1000 }, { at: '2026-11-12', fi: 'Aug 2051', worth: 2500 }), 'Since Nov 1: your date went from Nov 2051 to Aug 2051, and your net worth is up $1,500.');
  assert.equal(sinceWords({ at: '2026-11-01', fi: 'Nov 2051', worth: 1000 }, { at: '2026-11-12', fi: 'Nov 2051', worth: 1000 }), 'Nothing has moved since Nov 1.');
});

import { LEVELS } from '../js/sharpen.js';
import { QUESTIONS } from '../js/journey.js';
import { newHousehold } from '../js/records.js';
test('nothing is asked twice: no two levels or questions share a field', () => {
  const doc = newHousehold({ name: 'T' });
  const seen = new Map();
  for (const q of QUESTIONS) for (const b of q.boxes) { assert.ok(!seen.has(`q:${b.id}`), b.id); seen.set(`q:${b.id}`, q.key); }
  for (const lv of LEVELS) for (const f of lv.fields(doc, ref)) { const k = `l:${f.id}`; assert.ok(!seen.has(k), `${f.id} is asked in ${seen.get(k)} and ${lv.id}`); seen.set(k, lv.id); }
  assert.ok(seen.size > 20);
});

import { payoffPlan, promoMonthsOf } from '../js/math/debt.js';
test('a 0% offer charges no interest while it runs, then the card\'s own rate (QUESTIONS 481)', () => {
  const now = new Date(2026, 10, 12);
  assert.equal(promoMonthsOf({ promoEnd: '2027-05' }, now), 6); assert.equal(promoMonthsOf({ promoEnd: '2026-01' }, now), 0); assert.equal(promoMonthsOf({}, now), 0);
  const card = { name: 'Card', balance: 1200, apr: 0.24, payment: 100 };
  const plain = payoffPlan([card], { now }), promo = payoffPlan([{ ...card, promoMonths: 12 }], { now });
  assert.equal(promo.months, 12); assert.equal(promo.interest, 0); // $100 a month clears $1,200 inside the offer
  assert.ok(plain.interest > 150 && plain.months > 12);
  // Six months at 0%: $600 left, then 2% a month on what is left.
  const half = payoffPlan([{ ...card, promoMonths: 6 }], { now });
  let left = 600, interest = 0, n = 6; while (left > 0.005) { const i = left * 0.02; interest += i; left += i; left -= Math.min(left, 100); n++; }
  assert.equal(half.months, n); assert.ok(Math.abs(half.interest - interest) < 1e-9);
});

import { TOOL_GROUPS, WORRY_TOOLS, MIRROR_TOOLS } from '../js/worries.js';
test('the What if screen is sorted: every worry and every mirror leads with three real tools', () => {
  const ids = TOOL_GROUPS.flatMap(g => g[1]); assert.equal(new Set(ids).size, ids.length); assert.equal(ids.length, 13);
  for (const w of WORRIES) { const t = WORRY_TOOLS[w.id]; assert.ok(t && t.length === 3 && new Set(t).size === 3, w.id); for (const id of t) assert.ok(ids.includes(id), `${w.id}: ${id}`); }
  for (const m of MIRRORS) { const t = MIRROR_TOOLS[m.id]; assert.ok(t && t.length === 3); for (const id of t) assert.ok(ids.includes(id)); }
  assert.deepEqual(Object.keys(WORRY_TOOLS).sort(), WORRIES.map(w => w.id).sort());
});
