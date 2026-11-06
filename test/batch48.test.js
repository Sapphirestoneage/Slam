// Batch 48: the Lender's view's rate and share per client (QUESTIONS 357, 360), the line for the next return (358), and
// Walk me through starting with the Ask next question (373). The Fire drill items (365 to 368) are in
// test/firedrill.test.js. Every number is worked by hand in the comment beside it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Store, newHousehold, importFile } from '../js/records.js';
import { createCtx } from '../js/ui/staples.js';
import { addPresets, ensureCategories } from '../js/presets.js';
import { applyFastTrack, fastTrackAnswers } from '../js/fasttrack.js';
import { metrics } from '../js/math/metrics.js';
import { loanFromPayment, lenderTermsOf, lenderOf } from '../js/math/lender.js';
import { walkStops, askStopOf } from '../js/walk.js';
import { RULES, ASSUMPTIONS } from '../js/registry/assumptions.js';
import { OUT_DIR, NOW } from '../tools/personas/build.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const near = (a, b, tol = 0.5) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
const persona = id => importFile(readFileSync(join(OUT_DIR, `${id}.json`), 'utf8'));
const pnow = new Date(NOW);

test('the rate and share are each client\'s to pick; blank follows RULES (QUESTIONS 357, 360)', () => {
  assert.equal(RULES.lenderMortgageRate, 0.0718);
  const T = lenderTermsOf({ assumptions: {} });
  assert.deepEqual([T.rate, T.share, T.rateMine, T.shareMine], [0.0718, 0.25, false, false]);
  assert.match(T.text, /^7\.18% over 30 years \(this week's rate\), 25% of the payment for taxes and insurance/);
  const M = lenderTermsOf({ assumptions: { lenderRate: 0.065, lenderTaxIns: 0.3 } });
  assert.deepEqual([M.rate, M.share, M.rateMine, M.shareMine], [0.065, 0.3, true, true]);
  assert.equal(M.text, '6.5% over 30 years, 30% of the payment for taxes and insurance');
  // A $2,000 home payment, 30% of it taxes and insurance: $1,400 carries the loan. At 6.5% over 30 years a dollar of
  // loan costs 0.0054167 / (1 - 1.0054167^-360) = $0.0063207 a month, so $1,400 / 0.0063207 = $221,495.
  near(loanFromPayment(2000, { rate: 0.065, share: 0.3 }), 221495.15);
  // On the Assumptions tab, both carry a client key (a blue cell; blank uses the default).
  for (const [id, key] of [['rules.lenderMortgageRate', 'lenderRate'], ['rules.lenderTaxInsShare', 'lenderTaxIns']]) assert.equal(ASSUMPTIONS.find(a => a.id === id).client, key);
});

test('the Lender\'s view reads the client\'s rate and says which it used', () => {
  const doc = persona('creator');
  const m = metrics(doc, ref, { now: pnow });
  // The creator: $2,924.50 a month a lender can count, the card at its $79.75 minimum. The home line is the lower of
  // 28% x $2,924.50 = $818.86 and 36% x $2,924.50 - $79.75 = $973.07: $818.86. Less 25%: $614.15 a month at 7.18%
  // (0.0059833 / (1 - 1.0059833^-360) = $0.0067744 per dollar) = $90,657, about $91,000.
  const L = lenderOf(doc, ref, { now: pnow, m });
  near(L.mortgage.maxPay, 818.86, 0.01);
  near(L.mortgage.loan, 90657.43, 0.5);
  assert.match(L.mortgage.text, /about a \$91,000 loan at 7\.18% over 30 years \(this week's rate\)/);
  // At 6.5% and 30%: $818.86 x 70% = $573.20 / 0.0063207 = $90,687 (the lower share nearly cancels the lower rate).
  doc.assumptions = { lenderRate: 0.065, lenderTaxIns: 0.3 };
  const L2 = lenderOf(doc, ref, { now: pnow, m });
  near(L2.mortgage.loan, 90686.76, 0.5);
  assert.match(L2.mortgage.text, /at 6\.5% over 30 years, 30% of the payment/);
  assert.equal(L2.mortgage.dti, L.mortgage.dti, 'the rate moves the loan size, never the DTI');
});

test('one return on file: the cautious number stays, one line says what next year\'s return brings (QUESTIONS 358)', () => {
  const doc = persona('creator');
  const L = lenderOf(doc, ref, { now: pnow, m: metrics(doc, ref, { now: pnow }) });
  assert.equal(L.mortgage.income, 2924.5, 'one return: OnlyFans is not counted yet');
  // Next year's return at this pace: ($14,500 + $28,200) / 2 = $21,350 a year (under the latest, $28,200) = $1,779.17 a
  // month. $2,924.50 + $1,779.17 = $4,703.67; the home line is the lower of 28% = $1,317.03 and 36% - $79.75 =
  // $1,613.57: $1,317.03. Less 25%: $987.77 / 0.0067744 = $145,810, about $146,000.
  const N = L.mortgage.afterNext;
  near(N.income, 4703.67, 0.01);
  near(N.loan, 145810.34, 0.5);
  assert.equal(N.text, 'Once next year\'s return is filed at this pace: about $146,000');
  // Two returns on file: no line.
  const two = persona('dancer');
  assert.equal(lenderOf(two, ref, { now: pnow, m: metrics(two, ref, { now: pnow }) }).mortgage.afterNext, null);
});

// ---------- QUESTIONS 373: Walk me through starts with Ask next ----------
const now = new Date('2026-11-06T15:00:00Z');
const maya = () => {
  const s = new Store(newHousehold({ name: 'Maya' }));
  addPresets(s, ref); ensureCategories(s);
  const a = fastTrackAnswers(s.doc);
  Object.assign(a, { hasKids: false, hasPets: false, workSituation: 'Employed (W-2)', hsaEligible: false, fsa: false, equityPay: false, state: 'NY', household: 'Solo', chips: { whyNow: ['Just want to get organized'], worry: ['Debt'], goalWords: ['Debt free'] },
    birthYear: 1996, takeHome: 2400, takePer: 'paycheck', payFrequency: '2 weeks', gut: 3500, gutIncludesDebt: false, checking: 1200, savings: 4000, invested: 15000, housing: 'Rent', hasCar: false });
  Object.assign(a.debts, { 'Credit card': { balance: 6000, payment: 200, rows: 0 } });
  applyFastTrack(s, a, { finished: true, now: now.toISOString() });
  return s;
};
const ctxOf = s => createCtx({ store: s, ref, now: () => now });

test('the walk starts with the Ask next question, then carries on as before', () => {
  const s = maya();
  const c = ctxOf(s);
  const top = c.askNext().top;
  assert.ok(top, 'Maya has a question to ask next');
  const ask = askStopOf(top);
  const before = walkStops(c);
  const stops = walkStops(c, { ask });
  assert.equal(stops[0].name, top.question);
  assert.ok(stops[0].ask);
  assert.equal(stops[0].why, top.why);
  // Then the walk as today, with the same box never asked twice.
  const rest = before.filter(x => x.key !== ask.key && !(ask.focus && x.focus === ask.focus));
  assert.deepEqual(stops.slice(1).map(x => x.key), rest.map(x => x.key));
  assert.equal(new Set(stops.map(x => x.key)).size, stops.length);
});

test('once the Ask next question is answered it drops off, and the walk does not chase the next one', () => {
  const s = maya();
  const top = ctxOf(s).askNext().top;
  const ask = askStopOf(top);
  // Answer it the way the box does.
  const rec = s.doc.records.find(r => r.id === top.recId);
  if (top.id === 'spending' && rec?.type === 'All in') s.update(rec.id, { pass: 'Statements' });
  else if (top.field === 'apr') { s.update(rec.id, { apr: 0.24 }); s.setFieldStatus(rec.id, 'apr', 'Know it'); }
  else if (top.field === 'amount') s.update(rec.id, { status: 'Know it' });
  else s.setFieldStatus(rec.id, top.field, 'Know it');
  const c = ctxOf(s);
  const stops = walkStops(c, { ask });
  assert.ok(!stops.some(x => x.ask), 'the answered question is gone');
  assert.deepEqual(stops.map(x => x.key), walkStops(c).map(x => x.key), 'and the rest is the walk as it was');
  assert.equal(askStopOf(null), null);
});
