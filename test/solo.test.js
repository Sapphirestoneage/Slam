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
  assert.deepEqual(SOLO.map(x => x.id), ['first', 'end', 'quiz', 'debt', 'runway', 'skills', 'plan']); assert.equal(SOLO.at(-1).id, 'plan'); assert.equal(SOLO.at(-1).next, null);
  for (const s of SOLO.slice(0, -1)) { assert.ok(soloOf(s.next), s.id); assert.ok(s.nextLabel && s.title && s.page.endsWith('.html')); }
  assert.equal(carryUrl('plan', 'abc'), 'start.html#/open/abc'); assert.equal(carryUrl('debt', 'abc'), 'debt.html#/d/abc'); assert.equal(carryUrl('nope', 'abc'), null);
});

test('nothing owed yet: no date, and the page can say so', () => {
  assert.deepEqual(debtFreeOf(fresh().doc, ref, { now }), { ready: false, count: 0, total: 0 });
  // the mortgage is left out unless asked
  const s = fresh(); debt(s, 'home', 300000, 0.06, 2000); debt(s, 'cards', 1200, 0, 100);
  const out = debtFreeOf(s.doc, ref, { now }); assert.equal(out.months, 12); assert.equal(out.total, 1200); assert.deepEqual(out.mortgage, { count: 1, total: 300000, counted: false });
  const withIt = debtFreeOf(s.doc, ref, { withMortgage: true, now }); assert.equal(withIt.total, 301200); assert.ok(withIt.months > 200); assert.equal(withIt.mortgage.counted, true);
  const only = fresh(); debt(only, 'home', 300000, 0.06, 2000); assert.equal(debtFreeOf(only.doc, ref, { now }).ready, false); assert.equal(debtFreeOf(only.doc, ref, { now }).mortgage.count, 1); assert.equal(debtFreeOf(only.doc, ref, { withMortgage: true, now }).ready, true);
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
import { quizOf, pairOf, perceptionOf, itemsFor, BANK, ELEMENTS, SCALE } from '../js/quiz.js';
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
test('the money chart: the real bank, 10 inside 25 inside 100, half reverse-keyed', () => {
  assert.equal(BANK.length, 100); assert.equal(itemsFor('ten').length, 10); assert.equal(itemsFor('std').length, 25); assert.equal(itemsFor('full').length, 100);
  assert.ok(itemsFor('ten').every(i => i.std), 'the 10 lives inside the 25'); assert.equal(new Set(itemsFor('full').map(i => i.id)).size, 100);
  for (const e of ELEMENTS) { assert.equal(itemsFor('ten').filter(i => i.el === e.id).length, 2); assert.ok(MIRRORS.some(m => m.id === e.mirror), e.id); }
  const rev = BANK.filter(i => i.dir < 0).length; assert.ok(rev >= 40 && rev <= 55, String(rev));
  assert.equal(new Set(BANK.map(i => `${i.el}|${i.trait}`)).size, 25); // 25 scored traits across the five elements
  assert.equal(itemsFor('ten')[0].text, 'I know exactly what my money is for.'); // a gentle open
  assert.deepEqual(itemsFor('full').slice(0, 25).map(i => i.id), itemsFor('std').map(i => i.id)); // going deeper starts from what is answered
  for (const i of BANK) assert.ok(!/[\u2014\u2013]/.test(i.text) && i.text.endsWith('.'), i.text);
});
test('scoring by hand: reverse the minus items, average a trait, average the traits into the element', () => {
  assert.equal(quizOf({}).ready, false); assert.equal(quizOf({}).next, itemsFor('ten')[0].id);
  const all = (v, depth = 'ten') => Object.fromEntries(itemsFor(depth).map(i => [i.id, v]));
  const by = text => BANK.find(i => i.text.startsWith(text)).id;
  // the 10, all "strongly agree": plus items score 100, minus items score 0
  const Q = quizOf(all(5));
  const el = id => Q.scores.find(s => s.id === id).score;
  assert.equal(el('water'), 100); // Anxiety + and Avoidance +
  assert.equal(el('earth'), 100); // Holding on + and Cushion +
  assert.equal(el('air'), 50);    // Risk + (100) and Optimizing - (0)
  assert.equal(el('fire'), 50);   // Freedom + (100) and Status - (0)
  assert.equal(el('spirit'), 50); // Purpose + (100) and Enough - (0)
  assert.equal(quizOf(all(3)).even, true); assert.equal(quizOf(all(3)).scores.every(s => s.score === 50), true);
  // one trait from two statements: "Checking my balance..." (+) at 5 and "Money is one of the last things..." (-) at 4 -> (5 + 2) / 2 = 3.5 -> 63
  const two = quizOf({ ...all(3), [by('Checking my balance')]: 5, [by('Money is one of the last things')]: 4 });
  assert.equal(two.traits.find(t => t.name === 'Anxiety').score, 63); assert.equal(two.traits.find(t => t.name === 'Anxiety').n, 2);
  const R = quizOf({ ...all(3), [by('I always want a cushion')]: 5, [by('Spending money I can easily afford')]: 5, [by('What I want most from money')]: 1, [by("I'd be just as happy being rich")]: 5 });
  assert.equal(R.top.id, 'earth'); assert.equal(R.low.id, 'fire'); assert.equal(R.mirror, 'safe'); assert.equal(R.practice.stage, 'plan'); assert.match(R.words, /Earth \(security\)/);
  assert.equal(R.sun.el, 'earth'); assert.equal(R.complete, true);
  const S = quizOf(all(4, 'std'), 'std'); assert.ok(S.moon && S.moon.el === 'water'); assert.ok(S.rising); assert.equal(S.of, 25);
  assert.equal(quizOf(all(4), 'std').done, 10); assert.equal(quizOf(all(4), 'std').complete, false); // a finished 10 is 10 of the 25
});
test('two people: cover, a doubled habit, an open muscle, and how well one read the other', () => {
  const all = v => Object.fromEntries(itemsFor('ten').map(i => [i.id, v]));
  const by = text => BANK.find(i => i.text.startsWith(text)).id;
  const saver = { ...all(3), [by('I always want a cushion')]: 5, [by('Spending money I can easily afford')]: 5 }, spender = { ...all(3), [by('I always want a cushion')]: 1, [by('Spending money I can easily afford')]: 1 };
  const P = pairOf(saver, spender);
  assert.equal(P.widest.id, 'earth'); assert.equal(P.widest.gap, 100); assert.equal(P.widest.kind, 'cover'); assert.deepEqual(P.covered, ['Earth']); assert.equal(P.closest.gap, 0);
  assert.deepEqual(pairOf(saver, saver).doubled, ['Earth']); assert.deepEqual(pairOf(spender, spender).open, ['Earth']);
  assert.equal(pairOf({}, all(3)), null);
  const G = perceptionOf(all(3), saver); // guessed the middle; they are a strong saver
  assert.equal(G.miss.id, 'earth'); assert.equal(G.miss.off, -50); assert.equal(G.close.length, 4); assert.equal(G.average, 10);
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
  assert.equal(P.done, 0); assert.equal(P.of, 7); assert.equal(P.next.id, 'first'); assert.equal(P.reused, 0);
  s.setDoc('settings', { start: { collapse: { work: 'job', press: 'behind' }, goal: { need: 4000, per: 'month', years: 20 } } });
  answer(s, 'invested', { invested: 25000 }); answer(s, 'income', { takeHome: 5000 }); answer(s, 'spending', { gut: 3800 });
  P = soloProgress(s.doc, ref);
  assert.deepEqual(P.steps.filter(x => x.done).map(x => x.id), ['first', 'end']); assert.equal(P.next.id, 'quiz');
  // invested: finish line + plan (1 reuse). income: finish line + plan (1). spending: finish line + runway + plan (2). 4 in all.
  assert.equal(P.answers, 3); assert.equal(P.reused, 4); assert.equal(P.minutesSaved, Math.round(4 * SECONDS_EACH / 60));
  assert.equal(P.steps.find(x => x.id === 'runway').ready, 1); assert.equal(P.steps.find(x => x.id === 'runway').started, true);
  debt(s, 'cards', 5000, 0.25, 150); answer(s, 'cash', { checking: 0, savings: 5000 });
  P = soloProgress(s.doc, ref, { planDone: true });
  assert.deepEqual(P.steps.filter(x => !x.done).map(x => x.id), ['quiz', 'skills']); assert.equal(P.reused, 4 + 1 + 1);
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

import { treeOf, placeOf, MILESTONES } from '../js/tree.js';
test('the 625: 25 trees of 25 levels, placed a few taps a tree, with one next unlock', () => {
  const data = JSON.parse(readFileSync(new URL('../data/skill-tree.json', import.meta.url)));
  assert.equal(data.trees.length, 25); for (const t of data.trees) { assert.equal(t.skills.length, 25); assert.deepEqual(t.skills.map(x => x.n), Array.from({ length: 25 }, (_, i) => i + 1)); for (const k of t.skills) assert.ok(k.name && !/[\u2014\u2013]/.test(k.name + k.what + k.check), k.name); }
  const main = data.trees[0]; assert.equal(main.id, 'main-path');
  assert.equal(placeOf(main, []).ask.n, 5); assert.equal(placeOf(main, [true]).ask.n, 10); assert.deepEqual(placeOf(main, [false]), { level: 0 }); assert.deepEqual(placeOf(main, [true, true, false]), { level: 10 }); assert.deepEqual(placeOf(main, [true, true, true, true, true]), { level: 25 });
  assert.deepEqual(MILESTONES, [5, 10, 15, 20, 25]);
  let T = treeOf(data, {}, {}); assert.equal(T.total, 0); assert.equal(T.of, 625); assert.equal(T.nextTree.id, 'main-path'); assert.equal(T.unlock, null); assert.equal(T.done, false);
  T = treeOf(data, { 'main-path': 5, 'tax-strategy': 15, 'cash-safety-net': 0 }, { 'main-path': true, 'tax-strategy': true, 'cash-safety-net': true });
  assert.equal(T.total, 20); assert.equal(T.placed, 3); assert.equal(T.strongest[0].id, 'tax-strategy'); assert.equal(T.trees.find(t => t.id === 'tax-strategy').band, 'Advanced');
  assert.equal(T.unlock.treeId, 'main-path'); assert.equal(T.unlock.n, 6); // the main path comes first until level 10
  T = treeOf(data, { 'main-path': 10, 'tax-strategy': 15, 'cash-safety-net': 0 }, { 'main-path': true, 'tax-strategy': true, 'cash-safety-net': true });
  assert.equal(T.unlock.treeId, 'cash-safety-net'); assert.equal(T.unlock.n, 1); // then the lowest placed tree
  assert.equal(T.bands[0].count, 2); assert.equal(T.bands[2].count, 1);
  assert.equal(treeOf(data, { 'main-path': 10, 'tax-strategy': 15, 'cash-safety-net': 0 }, { 'main-path': true, 'tax-strategy': true, 'cash-safety-net': 'skip' }).unlock.treeId, 'main-path'); // a tree set aside is never the next unlock
});
