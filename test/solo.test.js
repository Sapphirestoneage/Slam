// SPDX-License-Identifier: AGPL-3.0-only
// The standalone pages' pure part (js/solo.js): the path, the carried link, and "debt free by", checked by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold, exportFile, importFile } from '../js/records.js';
import { DEBT_BOOK, addRow, setField, setUnsure } from '../js/book.js';
import { SOLO, soloOf, carryUrl, debtFreeOf, EXTRAS, ORDERS } from '../js/solo.js';
import { progressOf } from '../js/journey.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date(2026, 10, 14);
const F = (sec, id) => DEBT_BOOK.sections.find(s => s.id === sec).front.find(f => f.id === id);
const debt = (s, sec, balance, apr, payment) => { const r = addRow(s, DEBT_BOOK, sec); setField(s, r.id, F(sec, 'balance'), balance, { now }); if (apr != null) setField(s, r.id, F(sec, 'apr'), apr, { now }); if (payment != null) setField(s, r.id, F(sec, 'payment'), payment, { now }); return r; };
const fresh = () => new Store(newHousehold({ name: 'My plan' }));

test('the path: each standalone names the next, and the last is the whole plan', () => {
  assert.deepEqual(SOLO.map(x => x.id), ['first', 'end', 'quiz', 'debt', 'runway', 'plan']); assert.equal(SOLO.at(-1).id, 'plan'); assert.equal(SOLO.at(-1).next, null);
  for (const s of SOLO.slice(0, -1)) { assert.ok(soloOf(s.next), s.id); assert.ok(s.nextLabel && s.title && s.page.endsWith('.html')); }
  assert.equal(carryUrl('plan', 'abc'), 'start.html#/open/abc'); assert.equal(carryUrl('debt', 'abc'), 'debt.html#/d/abc'); assert.equal(carryUrl('nope', 'abc'), null);
});

test('nothing owed yet: no date, and the page can say so', () => {
  assert.deepEqual(debtFreeOf(fresh().doc, ref, { now }), { ready: false, count: 0, total: 0 });
});

test('one debt at 0%: $1,200 at $100 a month is 12 months, gone Nov 2027, no interest', () => {
  const s = fresh(); debt(s, 'other', 1200, 0, 100);
  const R = debtFreeOf(s.doc, ref, { now });
  assert.equal(R.months, 12); assert.equal(R.date, 'Nov 2027'); assert.equal(Math.round(R.interest), 0); assert.equal(R.total, 1200); assert.equal(R.payments, 100); assert.equal(R.never, false);
  assert.equal(R.other, null); assert.equal(R.saved, null); assert.deepEqual(R.standIns, []);
});

test('one card at 12%: $1,000 at $100 a month, by hand', () => {
  // month by month at 1% a month: 1000 -> 910 -> 819.10 -> 727.29 -> 634.56 -> 540.91 -> 446.32 -> 350.78 -> 254.29 -> 156.83 -> 58.40 -> 0 (11 payments; the last is 58.98)
  const s = fresh(); debt(s, 'cards', 1000, 0.12, 100);
  const R = debtFreeOf(s.doc, ref, { now });
  assert.equal(R.months, 11); assert.equal(R.date, 'Oct 2027'); assert.ok(Math.abs(R.interest - 58.98) < 0.05, String(R.interest));
});

test('extra money: the same card with $100 more is gone in 6 months, and says what that kept', () => {
  const s = fresh(); debt(s, 'cards', 1000, 0.12, 100);
  const R = debtFreeOf(s.doc, ref, { extra: 100, now }); // 1000 -> 810 -> 618.10 -> 424.28 -> 228.52 -> 30.81 -> 0
  assert.equal(R.months, 6); assert.equal(R.saved.months, 5); assert.ok(R.saved.interest > 25 && R.saved.interest < 30, String(R.saved.interest));
});

test('two debts: highest rate first costs less; smallest first clears one sooner', () => {
  const s = fresh(); debt(s, 'cards', 5000, 0.25, 150); debt(s, 'other', 800, 0.05, 50);
  const A = debtFreeOf(s.doc, ref, { extra: 200, order: 'avalanche', now }), S = debtFreeOf(s.doc, ref, { extra: 200, order: 'snowball', now });
  assert.equal(A.first, 'Card 1'); assert.equal(S.first, 'Debt');
  assert.ok(A.interest < S.interest); assert.ok(S.firstWin < A.firstWin);
  assert.ok(Math.abs(A.other.moreInterest - (S.interest - A.interest)) < 1e-6); assert.equal(A.other.order, 'snowball');
  assert.equal(A.debts.length, 2); assert.ok(A.debts[0].month <= A.debts[1].month); assert.ok(A.debts.every(d => /^[A-Z][a-z]{2} 20\d\d$/.test(d.date)));
});

test('stand-ins are named: a rate marked not sure takes the typical one, a missing payment takes the minimum', () => {
  const s = fresh(); const c = debt(s, 'cards', 3000, null, null); setUnsure(s, c.id, F('cards', 'apr'));
  const R = debtFreeOf(s.doc, ref, { now });
  assert.deepEqual(R.standIns.map(x => x.what), ['rate', 'payment']); assert.equal(R.standIns[0].value, ref.typicalRates['Credit card']);
  assert.ok(R.ready && R.total === 3000);
});

test('payments that never win are said plainly, and extra fixes it', () => {
  const s = fresh(); debt(s, 'cards', 10000, 0.3, 200); // interest alone is 250 a month
  assert.equal(debtFreeOf(s.doc, ref, { now }).never, true);
  assert.equal(debtFreeOf(s.doc, ref, { extra: 250, now }).never, false);
});

test('carried forward: the same file opens in the whole plan with question 5 already answered', () => {
  const s = fresh(); debt(s, 'cards', 5000, 0.25, 150); s.setDoc('settings', { start: { soloExtra: 100 } });
  const there = new Store(importFile(JSON.stringify(exportFile(s.doc))));
  there.setDoc('profile', { birthYear: 1994 });
  const p = progressOf(there.doc, ref, { now });
  assert.equal(p.answered.card, true); assert.equal(p.answered.income, false);
  assert.equal(debtFreeOf(there.doc, ref, { extra: 100, now }).date, debtFreeOf(s.doc, ref, { extra: 100, now }).date);
});

test('the choices on the page', () => { assert.deepEqual(EXTRAS, [0, 50, 100, 250, 500]); assert.deepEqual(ORDERS.map(o => o[0]), ['avalanche', 'snowball']); });

import { runwayOf } from '../js/solo.js';
import { quizOf, pairOf, ITEMS, ELEMENTS, SCALE } from '../js/quiz.js';
import { MIRRORS } from '../js/mirror.js';
test('how long the money lasts, by hand', () => {
  const R = runwayOf({ cash: 9000, spending: 3000, now }); // 3 months exactly
  assert.equal(R.months, 3); assert.equal(R.whole, 3); assert.equal(R.date, 'Feb 2027'); assert.equal(R.covered, false);
  const S = runwayOf({ cash: 9000, spending: 3000, stillIn: 1000, cut: 0.2, now }); // out 2,400, gap 1,400: 6.43 months, against 4.5 with no cut
  assert.ok(Math.abs(S.months - 9000 / 1400) < 1e-9); assert.equal(S.whole, 6); assert.ok(Math.abs(S.extraMonths - (9000 / 1400 - 4.5)) < 1e-9);
  assert.equal(runwayOf({ cash: 500, spending: 2000, stillIn: 2500, now }).covered, true);
  assert.equal(runwayOf({ cash: 500, spending: 0, now }).ready, false);
  assert.ok(Math.abs(R.perThousand - 1000 / 3000 * 30.44) < 1e-9); // each $1,000 buys about 10 days
});
test('the quick ten: five scales from 0 to 100, no fixed type, and it says what the plan shows first', () => {
  assert.equal(ITEMS.length, 10); for (const e of ELEMENTS) { assert.equal(ITEMS.filter(i => i.el === e.id).length, 2); assert.ok(MIRRORS.some(m => m.id === e.mirror), e.id); }
  assert.equal(SCALE.length, 5);
  assert.equal(quizOf({}).ready, false); assert.equal(quizOf({}).next, 'w1'); assert.equal(quizOf({ w1: 3 }).next, 'w2');
  const all = v => Object.fromEntries(ITEMS.map(i => [i.id, v]));
  assert.deepEqual(quizOf(all(1)).scores.map(s => s.score), [0, 0, 0, 0, 0]); assert.deepEqual(quizOf(all(5)).scores.map(s => s.score), [100, 100, 100, 100, 100]);
  assert.equal(quizOf(all(3)).even, true); assert.equal(quizOf(all(3)).practice, null);
  const Q = quizOf({ ...all(3), e1: 5, e2: 5, f1: 1, f2: 2 }); // earth 100, fire 13, the rest 50
  assert.equal(Q.top.id, 'earth'); assert.equal(Q.low.id, 'fire'); assert.equal(Q.scores.find(s => s.id === 'fire').score, 13); assert.equal(Q.mirror, 'safe');
  assert.equal(Q.practice.stage, 'plan'); assert.match(Q.words, /Earth \(security\) is your strongest/);
});
test('two people: the widest gap, the closest match, and what is covered between them', () => {
  const all = v => Object.fromEntries(ITEMS.map(i => [i.id, v]));
  const P = pairOf({ ...all(3), e1: 5, e2: 5 }, { ...all(3), e1: 1, e2: 1, f1: 5, f2: 5 });
  assert.equal(P.widest.id, 'earth'); assert.equal(P.widest.gap, 100); assert.equal(P.closest.gap, 0);
  assert.deepEqual(P.covered, ['Earth', 'Fire']); assert.deepEqual(P.open, []);
  assert.equal(pairOf({}, all(3)), null);
});

import { backwardsOf } from '../js/solo.js';
test('start at the finish line: each answer unlocks the next step, backwards to today, by hand', () => {
  const wr = ref.presets.withdrawalRate.default, r = ref.presets.realReturn.default, i = r / 12;
  assert.equal(backwardsOf({ ref, now }).step, 1);
  const a = backwardsOf({ need: 4000, per: 'month', ref, now });
  assert.equal(a.step, 2); assert.ok(Math.abs(a.total - 48000 / wr) < 1e-6); assert.ok(Math.abs(a.aMonth - 4000) < 1e-9);
  assert.ok(Math.abs(backwardsOf({ need: 48000, per: 'year', ref, now }).total - a.total) < 1e-6); assert.equal(backwardsOf({ need: 1000000, per: 'total', ref, now }).total, 1000000);
  const b = backwardsOf({ need: 4000, years: 20, ref, now }); assert.equal(b.step, 3); assert.equal(b.byYear, 2046);
  const c = backwardsOf({ need: 4000, years: 20, have: 50000, ref, now }); assert.equal(c.step, 4);
  const n = 240, grown = 50000 * (1 + i) ** n, pmt = (a.total - grown) * i / ((1 + i) ** n - 1);
  assert.ok(Math.abs(c.needed - pmt) < 1e-6); assert.ok(Math.abs(c.grown - grown) < 1e-6);
  // check the payment the long way: grow what you have and add the payment each month for 240 months
  let v = 50000; for (let k = 0; k < n; k++) v = v * (1 + i) + c.needed; assert.ok(Math.abs(v - a.total) < 0.01, String(v));
  const d = backwardsOf({ need: 4000, years: 20, have: 50000, takeHome: 5000, spending: 3800, ref, now });
  assert.equal(d.step, 5); assert.equal(d.left, 1200); assert.ok(Math.abs(d.gap - (c.needed - 1200)) < 1e-9); assert.equal(d.onTrack, d.gap <= 0);
  let w = 50000, m = 0; while (w < a.total && m < 1200) { w = w * (1 + i) + 1200; m++; } assert.ok(Math.abs(d.months - m) <= 1, `${d.months} vs ${m}`);
  if (d.gap > 0) { assert.ok(Math.abs(d.spendToClose - (3800 - d.gap)) < 1e-9); assert.ok(Math.abs(d.earnToClose - (5000 + d.gap)) < 1e-9); }
  assert.equal(backwardsOf({ need: 1000, years: 10, have: 2000000, ref, now }).alreadyThere, true);
  assert.equal(backwardsOf({ need: 4000, years: 20, have: 0, takeHome: 3000, spending: 3000, ref, now }).months, null); // nothing left over, nothing invested: no date
});

import { COLLAPSE, collapseOf } from '../js/collapse.js';
test('quantum collapse: every question is path-changing, the meter is honest arithmetic, and early exits skip the rest', () => {
  assert.equal(collapseOf({}).total, 6 * 5 * 4 * 4 * 4); assert.equal(collapseOf({}).left, 6 * 5 * 4); // nothing gated yet counts until its gate opens
  assert.equal(collapseOf({}).next.id, 'work');
  const behind = collapseOf({ work: 'job', press: 'behind' }); // being behind settles it: no cushion, match or goal question
  assert.equal(behind.done, true); assert.equal(behind.shortened, true); assert.equal(behind.left, 1); assert.equal(behind.move.id, 'stabilize'); assert.equal(behind.move.page, 'runway'); assert.equal(behind.mirror, 'guide');
  assert.equal(collapseOf({ work: 'job', press: 'cards' }).next.id, 'cushion');
  const cards = collapseOf({ work: 'job', press: 'cards', cushion: '1', match: 'some' }); assert.equal(cards.move.id, 'match'); assert.match(cards.notes[0], /Then the card debt/); // the plan's order: the full match comes before extra debt payments
  assert.equal(collapseOf({ work: 'job', press: 'cards', cushion: '1', match: 'all' }).move.id, 'debt'); assert.equal(collapseOf({ work: 'job', press: 'cards', cushion: '0', match: 'some' }).move.id, 'cushion');
  assert.equal(collapseOf({ work: 'self', press: 'none', cushion: '3' }).next.id, 'want'); // no match question for the self-employed
  const fin = collapseOf({ work: 'job', press: 'none', cushion: '6', match: 'all', want: 'enjoy' }); assert.equal(fin.move.id, 'finish'); assert.equal(fin.mirror, 'enjoy'); assert.equal(fin.move.page, 'end');
  assert.equal(collapseOf({ work: 'job', press: 'none', cushion: '3', match: 'some', want: 'date' }).move.id, 'match');
  assert.equal(collapseOf({ work: 'job', press: 'none', cushion: '0', match: 'all', want: 'date' }).move.id, 'cushion');
  const bridge = collapseOf({ work: 'between', press: 'none', cushion: '1' }); assert.equal(bridge.move.id, 'bridge'); assert.equal(bridge.shortened, true);
  const pslf = collapseOf({ work: 'job', press: 'forgive', cushion: '3', match: 'all', want: 'safe' }); assert.match(pslf.notes[0], /forgiveness track/); assert.notEqual(pslf.move.id, 'debt'); // never told to rush forgiven loans
  assert.match(collapseOf({ work: 'both', press: 'cards', cushion: '1', match: 'unsure' }).notes.join(' '), /Ask HR.*tax money aside/s);
  let left = collapseOf({}).left; for (const step of [{ work: 'job' }, { work: 'job', press: 'none' }, { work: 'job', press: 'none', cushion: '3' }, { work: 'job', press: 'none', cushion: '3', match: 'all' }]) { const c = collapseOf(step); assert.ok(c.left <= left, JSON.stringify(step)); left = c.left; }
  for (const q of COLLAPSE) assert.ok(q.options.length >= 4 && q.ask.endsWith('?'));
});

import { soloProgress, USES, SECONDS_EACH } from '../js/solo.js';
import { answer } from '../js/journey.js';
import { newAccount, activeSpace, addShared, switchTo, removeSpace, joinShared, canOpen, rename, memoryAdapter } from '../js/accounts.js';
import { cloudOf } from '../js/cloud.js';
test('what is done, and what carrying answers forward saved, counted by hand', () => {
  const s = fresh(); let P = soloProgress(s.doc, ref);
  assert.equal(P.done, 0); assert.equal(P.of, 6); assert.equal(P.next.id, 'first'); assert.equal(P.reused, 0);
  s.setDoc('settings', { start: { collapse: { work: 'job', press: 'behind' }, goal: { need: 4000, per: 'month', years: 20 } } });
  answer(s, 'invested', { invested: 25000 }); answer(s, 'income', { takeHome: 5000 }); answer(s, 'spending', { gut: 3800 });
  P = soloProgress(s.doc, ref);
  assert.deepEqual(P.steps.filter(x => x.done).map(x => x.id), ['first', 'end']); assert.equal(P.next.id, 'quiz');
  // invested: finish line + plan (1 reuse). income: finish line + plan (1). spending: finish line + runway + plan (2). 4 in all.
  assert.equal(P.answers, 3); assert.equal(P.reused, 4); assert.equal(P.minutesSaved, Math.round(4 * SECONDS_EACH / 60));
  assert.equal(P.steps.find(x => x.id === 'runway').ready, 1); assert.equal(P.steps.find(x => x.id === 'runway').started, true);
  debt(s, 'cards', 5000, 0.25, 150); answer(s, 'cash', { checking: 0, savings: 5000 });
  P = soloProgress(s.doc, ref, { planDone: true });
  assert.deepEqual(P.steps.filter(x => !x.done).map(x => x.id), ['quiz']); assert.equal(P.reused, 4 + 1 + 1);
  for (const id of Object.keys(USES)) assert.ok(SOLO.some(x => x.id === id), id);
});
test('accounts and spaces: mine is mine, ours is open to both and nobody else', () => {
  let a = newAccount('Eli', now); assert.equal(a.spaces.length, 1); assert.equal(activeSpace(a).kind, 'mine'); assert.equal(a.since, '2026-11-14');
  const mine = activeSpace(a); a = addShared(a, 'Sam'); const ours = activeSpace(a);
  assert.equal(ours.kind, 'shared'); assert.deepEqual(ours.members, ['Eli', 'Sam']);
  assert.equal(canOpen(mine, 'Eli'), true); assert.equal(canOpen(mine, 'Sam'), false); assert.equal(canOpen(ours, 'Sam'), true); assert.equal(canOpen(ours, 'Pat'), false);
  a = switchTo(a, mine.id); assert.equal(activeSpace(a).id, mine.id); assert.equal(switchTo(a, 'nope').active, mine.id);
  assert.equal(removeSpace(a, mine.id).spaces.length, 2); // your own space cannot be removed
  assert.equal(removeSpace(a, ours.id).spaces.length, 1);
  let b = joinShared(newAccount('Sam', now), ours); assert.equal(activeSpace(b).id, ours.id); assert.equal(b.spaces.length, 2); assert.equal(joinShared(b, ours).spaces.length, 2);
  assert.deepEqual(activeSpace(rename(a = switchTo(a, ours.id), 'Eli Z')).members, ['Eli Z', 'Sam']);
  const d = memoryAdapter(); d.saveAccount(a); d.saveSpace(ours.id, 'packed'); assert.equal(d.loadAccount().name, 'Eli'); assert.equal(d.loadSpace(ours.id), 'packed'); assert.equal(d.loadSpace('x'), null); d.signOut(); assert.equal(d.loadAccount(), null);
});
test('the server adapter is off without keys, and speaks the same four calls with them', async () => {
  assert.equal(cloudOf(null), null); assert.equal(cloudOf({ url: 'https://x' }), null);
  const calls = [], fetcher = async (url, init) => { calls.push([url, init?.method ?? 'GET']); return { ok: true, json: async () => (url.includes('spaces') ? [{ packed: 'abc' }] : [{ data: { name: 'Eli' } }]) }; };
  const c = cloudOf({ url: 'https://p.supabase.co', key: 'k' }, { fetcher });
  assert.equal(await c.loadSpace('s1'), 'abc'); assert.equal((await c.loadAccount()).name, 'Eli'); assert.equal(await c.saveSpace('s1', 'zzz'), true); assert.equal(await c.sendLink('a@b.co'), true);
  assert.deepEqual(calls.map(x => x[1]), ['GET', 'GET', 'POST', 'POST']); assert.match(calls[0][0], /rest\/v1\/spaces\?id=eq\.s1/);
  for (const k of ['loadAccount', 'saveAccount', 'loadSpace', 'saveSpace']) assert.equal(typeof c[k], 'function');
});
