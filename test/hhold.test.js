// Households (js/math/hhold.js, run Finish everything partly built, Part 12, M8K): the same question for everyone and
// its talk points, the answer code for two phones, FI together, a shared home's equity, the tax gap when only two can
// marry, and the email draft (js/privacy.js emailDraft; Share by email on the one-pager). The game runs a copy of the
// same file (game/core/hhold.js); the last tests hold the two together.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import * as HH from '../js/math/hhold.js';
import { HH_QUESTIONS, hhCompare, hhCode, hhReadCode, hhFiTogether, hhMonthsBetween, hhEquity, hhMarryGap, hhDraft, hhCanLeave } from '../js/math/hhold.js';
import { federalTax } from '../js/math/income.js';
import { esCompare } from '../js/math/estate.js';
import { emailDraft, shareSees, SEEN } from '../js/privacy.js';
import { importFile, Store } from '../js/records.js';
import { createCtx } from '../js/ui/staples.js';
import { summaryItems, summaryText, shareDefaultPicks } from '../js/ui/report-ui.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const fed = (g, st) => federalTax({ gross: g, filingStatus: st === 'joint' ? 'Married jointly' : 'Single' }, ref).value;
const ENG = { compare: esCompare, taxOf: fed };

// ---------- 1. Same question ----------
test('every question has a talk point, two or more options, and an id of its own', () => {
  assert.equal(new Set(HH_QUESTIONS.map(q => q.id)).size, HH_QUESTIONS.length);
  for (const q of HH_QUESTIONS) {
    assert.ok(q.opts.length >= 2 && q.talk && q.q, q.id);
    assert.ok(['scale', 'pick'].includes(q.kind), q.id);
    if (q.money) assert.ok(q.opts.every((v, i) => typeof v === 'number' && (i === 0 || v > q.opts[i - 1])), `${q.id}: money options go up`);
  }
});
test('same, near and apart; the talk points the furthest apart first; nobody is scored', () => {
  const K = hhCompare([
    { n: 'Ana', a: { ask: 0, cushion: 1, split: 0, accounts: 1 } },
    { n: 'Ben', a: { ask: 3, cushion: 2, split: 1, accounts: 1 } },
  ]);
  const st = id => K.rows.find(r => r.id === id).state;
  assert.equal(st('ask'), 'apart');
  assert.equal(st('cushion'), 'near');
  assert.equal(st('split'), 'apart', 'a question with no order: any difference is a talk point');
  assert.equal(st('accounts'), 'same');
  assert.equal(st('stop'), 'open');
  assert.deepEqual(K.talk.map(r => r.id), ['split', 'ask', 'cushion']);
  assert.deepEqual([K.same, K.near, K.apart, K.open], [1, 1, 2, HH_QUESTIONS.length - 4]);
  assert.ok(K.ready);
  assert.ok(!('score' in K) && !('match' in K));
});
test('three people and more: the spread is from the lowest pick to the highest; one answer alone stays open', () => {
  const K = hhCompare([
    { n: 'Rin', a: { stop: 0, talk: 1 } }, { n: 'Sol', a: { stop: 1, talk: 1 } }, { n: 'Tay', a: { stop: 3 } }, { n: '  ', a: { stop: 2 } },
  ]);
  assert.equal(K.people, 3, 'a blank name is not a person');
  const stop = K.rows.find(r => r.id === 'stop'), talk = K.rows.find(r => r.id === 'talk');
  assert.equal(stop.spread, 3);
  assert.equal(talk.state, 'same');
  assert.deepEqual(talk.waiting, ['Tay']);
  assert.equal(hhCompare([{ n: 'Rin', a: { stop: 0 } }]).ready, false);
  assert.equal(hhCompare([{ n: 'A', a: { ask: 9, cushion: -1, split: 1.5 } }, { n: 'B', a: { ask: 0 } }]).rows.find(r => r.id === 'ask').state, 'open', 'an answer out of range is no answer');
});
test('two phones: the answer code goes there and back; a bad code says why', () => {
  const code = hhCode('Ana|x', { ask: 2, split: 3, nope: 1, cushion: 7 });
  assert.ok(code.startsWith(HH.HH_CODE_TAG));
  const r = hhReadCode(`here it is: ${code}`);
  assert.equal(r.n, 'Ana x');
  assert.deepEqual(r.a, { ask: 2, split: 3 });
  assert.equal(r.count, 2);
  assert.match(hhReadCode('hello').err, /starts with SLAM-SQ1/);
  assert.match(hhReadCode('SLAM-SQ1 |ask=1').err, /no name/);
  assert.deepEqual(hhReadCode('SLAM-SQ1 Ben|').a, {});
});

// ---------- 2. FI together ----------
test('FI together: each person side by side, the gap in the number and in time, blanks listed', () => {
  assert.equal(hhMonthsBetween('2026-11', '2041-03'), 172);
  assert.equal(hhMonthsBetween('2026-11', null), null);
  const F = hhFiTogether([{ n: 'Ana', fi: 1200000, date: '2041-03' }, { n: 'Ben', fi: 900000, date: '2045-06' }, { n: 'Cam', fi: null, date: 'soon' }], '2026-11');
  assert.equal(F.numbers.gap, 300000);
  assert.equal(F.numbers.high.n, 'Ana');
  assert.equal(F.dates.gap, 51);
  assert.equal(F.dates.earliest.n, 'Ana');
  assert.equal(F.dates.latest.n, 'Ben');
  assert.deepEqual(F.missing, ['Cam']);
  assert.equal(F.rows[0].months, 172);
  const one = hhFiTogether([{ n: 'Ana', fi: 1e6, date: '2040-01' }, { n: 'Ben' }], '2026-11');
  assert.equal(one.numbers.ready, false);
  assert.equal(one.numbers.gap, null, 'one number: no gap, not zero');
});

// ---------- 3. A shared home and the marriage gap ----------
test('a shared home: contributions, the share of each, the equity by contributions and equally', () => {
  const E = hhEquity({ value: 500000, owed: 300000, people: [
    { n: 'Rin', put: 40000, monthly: 1000, months: 24 }, { n: 'Sol', put: 20000, monthly: 1000, months: 24 }, { n: 'Tay', put: 0, monthly: 500, months: 24 },
  ] });
  assert.equal(E.equity, 200000);
  assert.deepEqual(E.rows.map(r => r.paid), [64000, 44000, 12000]);
  assert.equal(E.total, 120000);
  assert.ok(Math.abs(E.rows[0].byPaid - 200000 * 64 / 120) < 1e-6);
  assert.ok(Math.abs(E.rows.reduce((s, r) => s + r.byPaid, 0) - 200000) < 1e-6, 'the parts add up to the equity');
  assert.ok(E.rows.every(r => Math.abs(r.equal - 200000 / 3) < 1e-6));
  assert.ok(E.ready);
  const blank = hhEquity({ value: 400000, owed: null, people: [{ n: 'A', put: 1000 }, { n: 'B', monthly: 200 }] });
  assert.equal(blank.equity, null, 'no loan typed: no equity, not the whole value');
  assert.deepEqual(blank.rows[1].blank, ['put', 'months']);
  assert.equal(blank.ready, false);
});
test('when only two can marry: each pair next to everyone single, on esCompare (Married or partners?) and the app\'s own tax', () => {
  const P = [{ n: 'Rin', gross: 180000 }, { n: 'Sol', gross: 30000 }, { n: 'Tay', gross: 170000 }];
  const M = hhMarryGap(P, ENG);
  assert.ok(M.ready);
  assert.equal(M.pairs.length, 3);
  const allSingle = P.reduce((s, p) => s + fed(p.gross, 'single'), 0);
  assert.ok(Math.abs(M.allSingle - allSingle) < 1e-6);
  for (const x of M.pairs) {
    const want = fed(P[x.i].gross + P[x.j].gross, 'joint') + P.filter((_, k) => k !== x.i && k !== x.j).reduce((s, p) => s + fed(p.gross, 'single'), 0) - allSingle;
    assert.ok(Math.abs(x.gap - want) < 1e-6, x.names.join('+'));
  }
  assert.ok(M.pairs[0].gap <= M.pairs[1].gap && M.pairs[1].gap <= M.pairs[2].gap, 'the lowest tax first');
  assert.ok(M.pairs.find(x => x.names.includes('Rin') && x.names.includes('Sol')).gap < 0, 'a high and a low pay: a marriage bonus');
  assert.equal(hhMarryGap([{ n: 'A', gross: 1 }, { n: 'B', gross: null }], ENG).ready, false);
  assert.deepEqual(hhMarryGap([{ n: 'A', gross: 1 }, { n: 'B', gross: null }], ENG).missing, ['B']);
  assert.equal(hhMarryGap(P, ENG, [0, 2]).pairs.length, 1);
  const C = esCompare({ people: [{ pay: 180000 }, { pay: 30000 }] }, { taxOf: fed });
  assert.equal(M.pairs.find(x => x.i === 0 && x.j === 1).gap, -C.taxDiff, 'the gap of a pair is esCompare\'s, turned round');
  assert.equal(hhMarryGap(P, { taxOf: fed }).ready, false, 'no compare: no number of its own');
});

// ---------- 4. Share by email ----------
const ITEMS = [
  { id: 'month', label: 'Our month', lines: ['Comes in: $9,000 a month'] },
  { id: 'p:Ana', label: "Ana's own numbers", lines: ['Ana brings in $5,000 a month'] },
  { id: 'secret', label: 'The PO box', lines: ['Discreet PO box: $30 a month'], seen: 'Me and my coach' },
  { id: 'coach', label: 'Coach note', lines: ['COACHNOTE'], seen: 'Coach only' },
];
test('a draft holds only what is picked for that person; an item not for everyone never goes in', () => {
  const D = hhDraft({ items: ITEMS, picks: { month: true, secret: true, coach: true }, to: 'ben@example.com', who: 'Ben', from: 'Ana' });
  assert.deepEqual(D.ids, ['month']);
  assert.equal(D.kept, 2, 'two picked items stayed home');
  assert.ok(D.body.includes('Comes in: $9,000 a month'));
  for (const no of ['Ana brings in', 'Discreet PO box', 'COACHNOTE']) {
    assert.ok(!D.body.includes(no), `${no} is not in the body`);
    assert.ok(!decodeURIComponent(D.mailto).includes(no), `${no} is not in the mailto link`);
  }
  assert.ok(D.mailto.startsWith('mailto:ben%40example.com?subject='));
  assert.ok(D.body.includes('SLAM sends nothing'));
  assert.ok(hhDraft({ items: ITEMS, picks: {}, to: 'not an address' }).mailto.startsWith('mailto:?subject='), 'no address: the person adds one in their mail app');
});
test('js/privacy.js: the same rule as anything shared; emailDraft keeps a private item out even when picked', () => {
  for (const s of SEEN) assert.equal(hhCanLeave(s), shareSees(s), s);
  assert.equal(hhCanLeave(undefined), true);
  const D = emailDraft(ITEMS, { 'p:Ana': true, secret: true });
  assert.deepEqual(D.ids, ['p:Ana']);
  assert.ok(!D.body.includes('Discreet PO box'));
});
test('Share by email on the one-pager: items from the shared view; a hidden item never appears in the draft', () => {
  const store = new Store(importFile(readFileSync(new URL('../fixtures/personas/discreet-couple.json', import.meta.url), 'utf8')));
  const ctx = createCtx({ store, ref, now: () => new Date('2026-11-26T12:00:00Z'), viewer: () => ({ clientView: false }) });
  const items = summaryItems(ctx);
  assert.ok(items.length >= 2);
  assert.ok(items.every(it => it.seen === 'Everyone'));
  const text = summaryText(ctx);
  for (const it of items) for (const l of it.lines) assert.ok(text.includes(l), `${it.id}: the same words as Send summary`);
  // the private rows of the persona never reach any item
  for (const w of ['Discreet PO box', 'Velvet Room', 'Wise payout', 'Lantern', 'has not told family']) assert.ok(!JSON.stringify(items).includes(w), w);
  const partner = shareDefaultPicks(items, 'Partner');
  assert.ok(!partner.todo && !partner.notes, 'a partner does not get the to-dos and notes until picked');
  const first = items[0], picks = { [first.id]: true };
  const D = emailDraft(items, picks, { who: 'Dana' });
  assert.deepEqual(D.ids, [first.id]);
  for (const it of items.slice(1)) for (const l of it.lines) if (!first.lines.includes(l)) assert.ok(!D.body.includes(l), `${it.id} is not picked, so not in the draft`);
});

// ---------- one function for the web app and the game ----------
const src = readFileSync(new URL('../js/math/hhold.js', import.meta.url), 'utf8');
const copy = readFileSync(new URL('../game/core/hhold.js', import.meta.url), 'utf8');
test('the game\'s copy is made from this file and is current (node tools/game_hhold_build.mjs)', () => {
  const hash = createHash('sha256').update(src).digest('hex').slice(0, 16);
  assert.match(copy, new RegExp(`SOURCE-HASH  ${hash}`), 'js/math/hhold.js changed: run node tools/game_hhold_build.mjs, then the game steps (prettier, stamp, code map)');
});
test('the game\'s copy gives the same answers', () => {
  const box = {}; vm.createContext(box);
  vm.runInContext(`${copy}\n;this.out = { ${Object.keys(HH).join(', ')} };`, box);
  for (const k of Object.keys(HH)) assert.ok(k in box.out, `${k} is in the game copy`);
  const j = v => JSON.parse(JSON.stringify(v));
  const P = [{ n: 'A', a: { ask: 1, stop: 0 } }, { n: 'B', a: { ask: 3, stop: 0 } }];
  assert.deepEqual(j(box.out.hhCompare(P)), j(hhCompare(P)));
  const E = { value: 3e5, owed: 1e5, people: [{ n: 'A', put: 1e4, monthly: 800, months: 12 }, { n: 'B', put: 0, monthly: 800, months: 12 }] };
  assert.deepEqual(j(box.out.hhEquity(E)), j(hhEquity(E)));
  assert.deepEqual(j(box.out.hhMarryGap([{ n: 'A', gross: 9e4 }, { n: 'B', gross: 4e4 }], ENG)), j(hhMarryGap([{ n: 'A', gross: 9e4 }, { n: 'B', gross: 4e4 }], ENG)));
  assert.equal(box.out.hhDraft({ items: ITEMS, picks: { month: true } }).body, hhDraft({ items: ITEMS, picks: { month: true } }).body);
});
