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

test('worries: 25 of them, each with a place to look and steps, in plain words', () => {
  assert.equal(WORRIES.length, 25);
  assert.equal(new Set(WORRIES.map(w => w.id)).size, 25);
  const groups = new Set(WORRY_GROUPS.map(g => g[0])), stages = new Set(STAGES.map(s => s.id)), sits = new Set(SITUATIONS.map(s => s[0]));
  for (const w of WORRIES) {
    assert.ok(groups.has(w.group), w.id);
    assert.ok(w.see.length >= 2 && w.see.length <= 3 && w.steps.length >= 3 && w.steps.length <= 5, w.id);
    for (const [label, stage] of w.see) { assert.ok(label && stages.has(stage), `${w.id}: ${stage}`); }
    if (w.sit) assert.ok(sits.has(w.sit));
    const words = [w.label, ...w.steps, ...w.see.map(s => s[0])].join(' ');
    assert.doesNotMatch(words, new RegExp(String.fromCharCode(8212)), `${w.id}: no em dashes`);
    assert.doesNotMatch(words, /\b(should|must|bad|wrong|fail|warning|risky|danger)\b/i, `${w.id}: no verdict words`);
  }
  assert.ok(WORRIES.filter(w => w.group === 'people').length >= 8);
  assert.equal(worryOf('home').see[0][2], 'home'); assert.equal(worryOf('nope'), null);
});
