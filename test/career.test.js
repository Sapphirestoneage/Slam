// Career and education (run of Nov 25 2026, Part 3): a course or degree priced (payback years, lifetime value, the FI
// date change), the presets as samples, two paths side by side, the credential stack, the match that stays with the job before it
// vests, and the launch window in days. One engine (js/math/career.js) for career.html and for the game's screen; the
// last tests hold the game's copy to it. Made-up numbers only; the arithmetic is in each comment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import * as CR from '../js/math/career.js';
import { fiMoveOf, fiDate } from '../js/math/fi.js';
import { ASSUMPTIONS } from '../js/registry/assumptions.js';

const { crRoi, crRoiWords, crRoiMath, crLevel, crCompare, crStack, crStackWords, crVested, crVestLeft, crVestWords, crVestLevel, crHop, crRothTrad, crHack, crDays, crDayWords, crLoanPayment, CR_VEST, CR_PRESETS, CR_OPTS } = CR;
const root = new URL('../', import.meta.url);
const near = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);
const PATH = { cost: 20000, help: 0, months: 12, keepPct: 0, payBefore: 40000, payAfter: 55000, taxPct: 22, age: 30, endAge: 65 };

test('a path priced: the whole price, the raise after tax, payback and lifetime value', () => {
  const R = crRoi(PATH);
  near(R.lostNet, 31200); // 40,000 x 12/12 x 100% not kept x 78%
  near(R.total, 51200); // 20,000 + 31,200
  near(R.gainNet, 11700); // (55,000 - 40,000) x 78%
  near(R.paybackYears, 51200 / 11700);
  near(R.evenAge, 31 + 51200 / 11700);
  near(R.lifetime, 11700 * 34 - 51200); // 34 years from 31 to 65
  assert.equal(R.paysBy, true);
  assert.match(crRoiWords(R, PATH), /covers the price of \$51,200 in 4\.4 years after you finish/);
  assert.ok(crRoiMath(R, PATH).some(l => l.startsWith('Payback:')));
});

test('help from a job and a loan change the price; keeping your pay removes the time cost', () => {
  const R = crRoi({ ...PATH, help: 5000, loan: 10000, loanRatePct: 6, loanYears: 10 });
  near(R.pmt, crLoanPayment(10000, 6, 10)); near(crLoanPayment(10000, 6, 10), 111.02, 0.01);
  near(R.interest, R.pmt * 120 - 10000);
  near(R.total, 15000 + 31200 + R.interest);
  assert.equal(R.once, 5000); // 15,000 yours, 10,000 of it on the loan
  const K = crRoi({ ...PATH, keepPct: 100 });
  assert.equal(K.lostNet, 0); near(K.total, 20000);
  near(crLoanPayment(12000, 0, 10), 100); // no interest: the loan over the months
});

test('empty is not zero: a missing answer waits and says what it needs', () => {
  assert.deepEqual(crRoi({}).needs, ['cost', 'payBefore', 'payAfter', 'taxPct', 'months']);
  assert.deepEqual(crRoi({ ...PATH, keepPct: null }).needs, ['keepPct']);
  assert.deepEqual(crRoi({ ...PATH, months: 0, keepPct: null }).needs, []); // no time out, no question about it
  const N = crRoi({ ...PATH, payAfter: 40000 });
  assert.equal(N.paybackYears, null); assert.match(crRoiWords(N, PATH), /nothing pays it back/);
  const L = crRoi({ ...PATH, age: null });
  assert.equal(L.lifetime, null); assert.equal(L.evenAge, null);
});

test('the move for the FI date: pay given up while learning, then the raise, then the loan', () => {
  const R = crRoi({ ...PATH, loan: 10000, loanRatePct: 6, loanYears: 10 });
  assert.deepEqual(R.changes.map(c => c.at), [0, 12, 12, 12, 132]);
  near(R.changes[0].monthly, -2600); near(R.changes[2].monthly, 975);
});

test('presets are samples of the time only; no cost or pay is filled in', () => {
  for (const p of CR_PRESETS) { assert.equal(p.cost, undefined); assert.equal(p.payAfter, undefined); assert.ok(p.months > 0); }
  assert.deepEqual(CR_PRESETS.map(p => p.id), ['four', 'trade', 'cert', 'skill']);
  assert.match(CR.CR_SAMPLE, /sample/);
  for (const k of ['cost', 'pay', 'taxPct', 'match', 'raise']) assert.ok(CR_OPTS[k].length >= 4, k);
});

test('Guess, Close, Exact: from where the numbers are from; the years ahead are never Exact', () => {
  const R = crRoi(PATH);
  assert.equal(crLevel(R, null), 'Guess'); assert.equal(crLevel(R, 'guess'), 'Guess'); assert.equal(crLevel(R, 'quote'), 'Close');
  assert.equal(crLevel(R, 'own'), 'Exact'); assert.equal(crLevel(R, 'own', { future: true }), 'Close'); assert.equal(crLevel(crRoi({}), 'own'), 'Guess');
});

test('two paths side by side: the gap and the part that differs the most', () => {
  const A = crRoi({ ...PATH, months: 18 }), B = crRoi({ ...PATH, cost: 80000, months: 48, payAfter: 70000 });
  const K = crCompare(A, B);
  near(K.gap, B.lifetime - A.lifetime); assert.ok(K.top.diff > 0);
  assert.equal(crCompare(A, crRoi({})), null);
});

test('the credential stack: overlaps, busy months, and back to back is no overlap', () => {
  const S = crStack([{ name: 'A', from: '2027-01', to: '2027-06', cost: 1000, raise: 2000 }, { name: 'B', from: '2027-05', to: '2027-09', cost: 500, raise: null }, { name: 'C', from: '2027-10', to: '2027-12', cost: 300, raise: 1000 }, { name: 'D', from: 'soon', to: null }]);
  assert.deepEqual(S.overlaps, [{ a: 'A', b: 'B', months: 2, from: '2027-05', to: '2027-06' }]);
  assert.equal(S.span, 12); assert.equal(S.busy, 12); assert.equal(S.cost, 1800); assert.equal(S.raise, 3000);
  assert.deepEqual(S.open, ['B', 'D']); assert.deepEqual(S.undated, ['D']);
  assert.match(crStackWords(S), /A and B run at the same time for 2 months/);
  assert.match(crStackWords(crStack([{ name: 'X', from: null, to: null }])), /Add the month/);
  assert.match(crStackWords(crStack([{ name: 'X', from: '2027-01', to: '2027-02' }, { name: 'Y', from: '2027-03', to: '2027-03' }])), /No two overlap: 3 months/);
});

test('vesting: the dollars that stay with the job on each schedule, and the next step', () => {
  assert.equal(crVested('now', 0), 100);
  assert.equal(crVested('cliff3', 2.99), 0); assert.equal(crVested('cliff3', 3), 100);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 9].map(y => crVested('graded6', y)), [0, 20, 40, 60, 80, 100, 100]);
  assert.equal(crVested('own', 4, 35), 35); assert.equal(crVested('own', 4), null);
  const V = crVestLeft({ match: 10000, years: 2.5, schedule: 'graded6' });
  assert.equal(V.pct, 20); assert.equal(V.left, 8000); assert.deepEqual(V.next, { years: 3, pct: 40, more: 2000, months: 6 });
  assert.match(crVestWords(V), /\$8,000 of the match stays with the job/);
  assert.match(crVestWords(crVestLeft({ match: 5000, years: 1, schedule: 'now' })), /all of it goes with you/);
  assert.deepEqual(crVestLeft({ match: 5000, years: 1, schedule: 'own' }).needs, ['ownPct']);
  assert.equal(crVestLevel(V, { matchTyped: false, schedule: 'graded6' }), 'Guess');
  assert.equal(crVestLevel(V, { matchTyped: true, schedule: 'graded6' }), 'Close');
  assert.equal(crVestLevel(V, { matchTyped: true, schedule: 'own' }), 'Exact');
});

test('the vesting rules are on the assumptions list with their source and date', () => {
  for (const id of ['rules.careerVestCliff', 'rules.careerVestGraded', 'rules.careerDaysPerMonth']) {
    const a = ASSUMPTIONS.find(x => x.id === id); assert.ok(a, id); assert.equal(a.date, '2026-11-25'); assert.ok(a.source.length > 10);
  }
  assert.equal(ASSUMPTIONS.find(x => x.id === 'rules.careerVestCliff').get(), 3); assert.equal(ASSUMPTIONS.find(x => x.id === 'rules.careerVestGraded').get(), 0.2);
  assert.match(CR.CR_VEST_SOURCE, /IRS/); assert.equal(CR_VEST.length, 4);
});

test('the launch window: three moves, each a change a month', () => {
  const H = crHop({ raise: 12000, taxPct: 25, left: 3000 });
  near(H.monthly, 750); assert.equal(H.once, 3000);
  const T = crRothTrad({ yearly: 12000, nowPct: 22, laterPct: 12 });
  near(T.monthly, 100); assert.equal(T.lead, 'trad');
  assert.equal(crRothTrad({ yearly: 12000, nowPct: 12, laterPct: 22 }).lead, 'roth');
  assert.equal(crRothTrad({ yearly: 12000, nowPct: 12, laterPct: 12 }).lead, 'same');
  const K = crHack({ rent: 1200, costs: 200, years: 2 });
  assert.deepEqual(K.changes, [{ at: 0, monthly: 1000 }, { at: 24, monthly: -1000 }]);
  assert.deepEqual(crHop({ raise: 1000 }).needs, ['taxPct']);
  assert.equal(crDays(100, 99), -30); assert.equal(crDayWords(-30), '30 days sooner'); assert.equal(crDayWords(0), 'No change'); assert.equal(crDayWords(null), 'No FI date yet');
});

test('the FI date with a move in runs the plan\'s own FI date (M53) again', () => {
  const m = { inputs: { invested: 20000, realReturn: 0.05 }, investing: { monthly: 1000, before: null, changes: [] }, fiNumber: { value: 600000 } };
  const now = new Date('2026-11-01T12:00:00');
  const a = fiDate({ invested: 20000, monthlyInvesting: 1000, realReturn: 0.05, target: 600000 }, { from: now }).value;
  const b = fiDate({ invested: 20000, monthlyInvesting: 1500, realReturn: 0.05, target: 600000 }, { from: now }).value;
  const F = fiMoveOf(m, crHop({ raise: 6000, taxPct: 0 }), { from: now });
  assert.equal(F.before, a); assert.equal(F.after, b); assert.equal(F.days, crDays(a, b)); assert.ok(F.days < 0);
  assert.equal(fiMoveOf(m, crHop({}), { from: now }), null);
  assert.equal(fiMoveOf({}, crHop({ raise: 1, taxPct: 0 })), null);
});

test('career.html draws from the same engine, and the view does no math of its own', () => {
  const view = readFileSync(new URL('js/solo/career.js', root), 'utf8'), page = readFileSync(new URL('career.html', root), 'utf8');
  assert.match(view, /from '\.\.\/math\/career\.js'/); assert.match(page, /js\/solo\/career\.js/);
  assert.doesNotMatch(view, /Math\.pow|\*\* ?\(|\/ ?1200|\* ?\(1 ?- ?/, 'no money formula in the view');
  for (const w of ['Pays back after you finish', 'Trade school and a 4-year degree, side by side', 'Your credential stack', 'Leaving before the match is yours', 'The launch window', 'Show the math']) assert.ok(view.includes(w), w);
});

test('the game\'s copy is the same code (tools/game_career_build.mjs), and gives the same answers', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('tools/game_career_build.mjs', root)), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout);
  const box = {}; vm.createContext(box);
  vm.runInContext(`${readFileSync(new URL('game/core/career.js', root), 'utf8')}\nthis.out = { roi: crRoi, vest: crVestLeft };`, box);
  assert.equal(box.out.roi(PATH).total, crRoi(PATH).total);
  assert.equal(box.out.vest({ match: 9000, years: 4, schedule: 'graded6' }).left, crVestLeft({ match: 9000, years: 4, schedule: 'graded6' }).left);
  const game = readFileSync(new URL('game/features/career.js', root), 'utf8');
  assert.match(game, /crRoi\(x\)/); assert.match(game, /freeAt\(c, \{ flows/); assert.doesNotMatch(game, /Math\.pow|1 - x\.taxPct/, 'the game screen has no money formula of its own');
});
