// SPDX-License-Identifier: AGPL-3.0-only
// Fire drills, skills and the price tag (js/drills.js): every figure checked by hand against the household.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { QUESTIONS, answer, planOf, setSituation, answerBenefit } from '../js/journey.js';
import { LEVELS } from '../js/sharpen.js';
import { drillsOf, skillsOf, priceTagOf } from '../js/drills.js';
import { lifeOf } from '../js/lifetime/inputs.js';

const read = f => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url)));
const ref = read('reference-2026.json'), priors = read('priors-2026.json'), flags = read('flags.json'), hist = read('history-returns.json');
const now = new Date(2026, 10, 12);
const make = (cash = { checking: 500, savings: 1000 }) => { const s = new Store(newHousehold({ name: 'Me' })); s.setDoc('profile', { birthYear: 2001, state: 'NY', nyc: true });
  const A = { income: { takeHome: 4200 }, spending: { gut: 3100 }, cash, invested: { invested: 18000 }, card: { 'Credit card': 3200 } };
  for (const q of QUESTIONS) answer(s, q.key, A[q.key]); return s; };
const lv = id => LEVELS.find(l => l.id === id);
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: app ${a}, by hand ${b}`);

test('each drill turns a fear into this household\'s own numbers', () => {
  const s = make();
  lv('where').write(s, { rent: 1500, food: 600, transport: 130 }, ref);
  const p = planOf(s.doc, ref, priors, { flags, now }), life = lifeOf(p, s.doc, ref, hist, {});
  const D = Object.fromEntries(drillsOf(p, s.doc, ref, priors, { life, now }).map(d => [d.id, d]));
  assert.deepEqual(Object.keys(D), ['job', 'bill', 'cut', 'crash', 'miss']);
  for (const d of Object.values(D)) { assert.ok(d.fear && d.headline && d.happens.length >= 2 && d.rep.text, d.id); assert.ok(!JSON.stringify(d).includes(String.fromCharCode(8212)) && !/undefined|NaN/.test(JSON.stringify(d)), d.id); }
  // the job: $1,500 of cash against $3,100 a month is 0.5 months
  assert.match(D.job.headline, /0\.5 months/);
  const gross = p.m.inputs.income[0].gross, weekly = Math.min(869, gross / 52 / 2);
  assert.match(D.job.lines[0], new RegExp(`\\$${Math.round(weekly)} a week for up to 26 weeks`));
  assert.match(D.job.lines[1], /\$2,230 a month/);
  // the bill: $2,000 against $1,500 leaves $500 on a card, three months at its rate (the typical rate until it is known)
  const apr = p.m.inputs.debts[0].apr;
  assert.match(D.bill.lines[0], new RegExp(`The other \\$500 .* about \\$${Math.round(500 * apr / 12 * 3)} in interest`));
  assert.equal(D.bill.calm, false);
  // the pay cut: a fifth of $4,200 is $840, leaving $1,100 - $840
  assert.match(D.cut.headline, /\$260 left each month/);
  // the crash: $18,000 shows as $11,700
  assert.match(D.crash.lines[0], /\$18,000 invested would show as \$11,700/);
  assert.equal(D.crash.calm, true, 'for a 25 year old a fall barely moves the age');
  // with real emergency cash the bill is calm
  const rich = make({ checking: 3000, savings: 9000 }), pr = planOf(rich.doc, ref, priors, { flags, now });
  const bill = drillsOf(pr, rich.doc, ref, priors, { now }).find(d => d.id === 'bill');
  assert.equal(bill.calm, true); assert.match(bill.headline, /\$10,000/);
});

test('between jobs: the drill is a longer search, not a lost job', () => {
  const s = make({ checking: 3000, savings: 9000 }); setSituation(s, 'between'); answerBenefit(s, { weekly: 504, weeks: 16 }, { now });
  const ids = drillsOf(planOf(s.doc, ref, priors, { flags, now }), s.doc, ref, priors, { now }).map(d => d.id);
  assert.ok(ids.includes('gap') && !ids.includes('job') && !ids.includes('cut'));
});

test('skills come from what the household has not done, each worth a number', () => {
  const s = make();
  let ids = () => skillsOf(planOf(s.doc, ref, priors, { flags, now }), s.doc, ref).map(k => k.id);
  assert.deepEqual(ids(), ['askMatch', 'roth', 'rate', 'autopay', 'types', 'report']);
  lv('work').write(s, { contributionPct: 0.03, match: 'm0' }, ref); // 50% of the first 6%, putting in 3%
  const p = planOf(s.doc, ref, priors, { flags, now }), match = skillsOf(p, s.doc, ref).find(k => k.id === 'match');
  const gross = p.m.inputs.income[0].gross;
  assert.match(match.why, new RegExp(`\\$${Math.round(gross * 0.03 * 0.5).toLocaleString('en-US')} a year`));
  lv('work').write(s, { contributionPct: 0.06, match: 'm0' }, ref);
  lv('accounts').write(s, { k401: 9000, roth: 6000, brokerage: 3000 }, ref);
  assert.deepEqual(ids(), ['rate', 'autopay', 'report'], 'a skill leaves the list when the household shows it');
  for (const k of skillsOf(planOf(s.doc, ref, priors, { flags, now }), s.doc, ref)) assert.equal(k.steps.length, 3);
});

test('the price tag: $100 a month is $30,000 at 4%, and so many hours of work', () => {
  const s = make(), p = planOf(s.doc, ref, priors, { flags, now });
  const t = priceTagOf(p, s.doc, ref, priors, 100, { now });
  assert.equal(t.forever, 30000);
  near(t.hours, 100 / (4200 / ref.hoursPerMonthFallback), 0.01, 'hours of work');
  assert.ok(t.moved > 0, 'dropping it brings the date closer');
  assert.equal(priceTagOf(p, s.doc, ref, priors, 500, { now }).forever, 150000);
});
