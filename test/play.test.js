// The play math of the game (run Not built, groups 1 to 5, Part 10b): the daily challenge, the credit score game and
// the bank bonus hunt (js/math/play.js), and the game's copy, held to this file by the last test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as P from '../js/math/play.js';
import { qcGrow } from '../js/math/quick.js';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const near = (a, b, e = 0.005) => assert.ok(Math.abs(a - b) < e, `${a} is not ${b}`);

test('a missing input says what it needs, never a 0 (empty is not zero)', () => {
  assert.deepEqual(P.plBonus({}).needs, ['the bonus', 'how many months']);
  assert.ok(P.plBonus({ bonus: 300, months: 3, deposit: 5000 }).needs.includes('the rate where the money is now'));
  assert.equal(P.plChallenge({ cost: 100, cash: null, spendMonth: 3000 }).ready, false);
  assert.equal(P.plFicoRound(['pay']).ready, false);
  assert.equal(P.plChallengeCost(3, null), null);
});

test('the FICO shares are myFICO\'s five, with the source and the date', () => {
  assert.deepEqual(P.PL_FICO.factors.map(f => [f.id, f.share]), [['pay', 0.35], ['owed', 0.3], ['length', 0.15], ['new', 0.1], ['mix', 0.1]]);
  assert.match(P.PL_FICO.source, /myFICO/);
  assert.match(P.PL_FICO.date, /^\d{4}-\d{2}-\d{2}$/);
  // the two 10% groups count in either order; a swap of the top two costs both places
  assert.equal(P.plFicoRound(['pay', 'owed', 'length', 'mix', 'new']).places, 5);
  const r = P.plFicoRound(['owed', 'pay', 'length', 'new', 'mix']);
  assert.equal(r.places, 3);
  near(r.points, 0.35);
  assert.ok(P.PL_MOVES.every(m => P.PL_FICO.factors.some(f => f.id === m.f)));
  assert.equal(P.plMoveRound({ autopay: 'pay', closeold: 'mix' }).right, 1);
});

test('a bank bonus: the bonus less its tax, the HYSA interest given up (after its tax) and the fees', () => {
  const r = P.plBonus({ bonus: 300, deposit: 5000, months: 3, hysaRate: 0.04, bankRate: 0, fees: 15, taxRate: 0.22 });
  const lost = qcGrow(5000, 0, 0.04, 3) - 5000;
  near(r.lost, lost);
  near(r.net, 300 - 66 - lost * 0.78 - 15);
  assert.equal(r.taxIn, true);
  const noTax = P.plBonus({ bonus: 300, months: 3 });
  assert.equal(noTax.taxIn, false);
  assert.equal(noTax.net, 300);
  assert.equal(noTax.likeRate, null);
  // the bonus account's own rate cuts what is given up
  assert.ok(P.plBonus({ bonus: 300, deposit: 5000, months: 3, hysaRate: 0.04, bankRate: 0.04 }).lost === 0);
});

test('the hunt: kept is the paid ones only; lined up is the rest; toward $1,000', () => {
  const H = P.plHunt([{ state: 'paid', bonus: 300, months: 3 }, { state: 'open', bonus: 500, months: 4 }, { state: 'planned', bonus: 400, months: 3 }, { bonus: null }]);
  assert.equal(H.goal, 1000);
  assert.equal(H.banked, 300);
  assert.equal(H.lined, 900);
  assert.equal(H.left, 700);
  assert.equal(H.open, 1);
  assert.equal(H.needs, 1);
  assert.equal(H.reach, true);
  assert.equal(H.there, false);
  assert.equal(P.plHunt([{ state: 'paid', bonus: 600, months: 3 }, { state: 'paid', bonus: 500, months: 3 }]).there, true);
});

test('the daily challenge: three ways on the person\'s own cash and spending', () => {
  const R = P.plChallenge({ cost: 600, cash: 3000, spendMonth: 3000, cardApr: 0.24 });
  assert.equal(R.days, 6);
  assert.equal(R.ways.cushion.cashLeft, 2400);
  near(R.ways.cushion.monthsAfter, 0.8);
  assert.equal(R.ways.cushion.card, null);
  assert.equal(R.ways.cushion.extra, 0);
  const r = 0.02, pmt = 600 * r / (1 - (1 + r) ** -3);
  near(R.ways.card.card.interest, pmt * 3 - 600, 0.01);
  near(R.ways.half.fromCash, 300);
  // short of cash: the rest goes on the card, and with no card rate the card way says it needs one
  const S = P.plChallenge({ cost: 600, cash: 200, spendMonth: 3000 });
  assert.equal(S.ways.cushion.short, 400);
  assert.equal(S.ways.cushion.card, null);
  assert.equal(S.ways.cushion.extra, null);
  assert.equal(P.plChallengeCost(6, 3000), 600);
  assert.equal(P.plChallengeCost(1, 100), 10);
});

test('the next monthly money date', () => {
  assert.equal(P.plNextMonthly('2026-11-10', 15), '2026-11-15');
  assert.equal(P.plNextMonthly('2026-11-15', 15), '2026-11-15');
  assert.equal(P.plNextMonthly('2026-11-15', 15, true), '2026-12-15');
  assert.equal(P.plNextMonthly('2026-12-20', 5), '2027-01-05');
  assert.equal(P.plNextMonthly('2026-12-20', 31), null);
});

test('the game has a current copy of js/math/play.js (node tools/game_play_build.mjs)', () => {
  const hash = createHash('sha256').update(read('js/math/play.js')).digest('hex').slice(0, 16);
  assert.match(read('game/core/play.js'), new RegExp(`SOURCE-HASH  ${hash}`));
});
