// SPDX-License-Identifier: AGPL-3.0-only
// Batch 31: typical at your age. The data file holds only Primary rows (each figure is in docs/engines/priors-sources.md
// on a row marked Primary), the ranges and the far-outside rule, the calm words, and the standard clients.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rowFor, typicalOf, farFrom, typicalCheck, typicalChecks, typicalBoxes, shareOf, shortRange, placeOf, TYPICAL, CE_CATEGORIES } from '../js/math/priors.js';
import { RULES, REFERENCE_FILES } from '../js/registry/assumptions.js';

const root = new URL('../', import.meta.url);
const data = JSON.parse(readFileSync(new URL('data/priors-2026.json', root), 'utf8'));
const doc = readFileSync(new URL('docs/engines/priors-sources.md', root), 'utf8');
const near = (a, b, tol = 0.5) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('the file: its shape, registered with its source and date', () => {
  const reg = REFERENCE_FILES.find(r => r.file === 'data/priors-2026.json');
  assert.ok(reg && reg.id === data.id && reg.date === data.asOf && reg.source);
  assert.ok(data.source && data.range && data.placeNote && data.leftOut.length);
  assert.deepEqual(data.place, [], 'no Primary row gives a NY or NY metro figure yet');
  for (const r of data.rows) {
    assert.ok(r.field && r.band && r.who && r.unit && r.table && /^https:\/\//.test(r.link) && r.year >= 2024, `${r.field} ${r.band}: field, band, who, unit, table, link, year`);
    assert.ok(data.sources[r.source], `${r.field} ${r.band}: source ${r.source}`);
    assert.ok(r.ages === null || (Array.isArray(r.ages) && r.ages.length === 2), `${r.field} ${r.band}: ages`);
    assert.ok(r.median != null || r.mean != null || r.share != null, `${r.field} ${r.band}: a figure`);
  }
  for (const f of ['netWorth', 'cash', 'card', 'studentLoans', 'cover400', 'emergency3mo', 'spending.total', 'spending.personalInsurance']) assert.ok(data.rows.some(r => r.field === f), f);
});

// Every figure is written in priors-sources.md (as $33,000, $74,475, 45% or 98.7%) on a line whose Check says Primary.
test('every figure traces to a Primary row of priors-sources.md; nothing Secondary is here', () => {
  const lines = doc.split('\n');
  const primaryHas = text => lines.some(l => l.includes(text) && /\| Primary|Primary \(|Check: Primary/.test(l)) || lines.some(l => l.includes(text) && /^\| (Category|Total|Food|Housing|Shelter|Rented|Utilities|Transportation|Vehicle|Health|Entertainment|Apparel|Personal|Cash contributions)/.test(l));
  const d$ = v => `$${v.toLocaleString('en-US')}`;
  for (const r of data.rows) {
    const figs = [r.median, r.mean].filter(v => v != null).map(d$);
    if (r.share != null && r.unit === 'share') figs.push(`${Math.round(r.share * 100)}%`);
    for (const f of figs) assert.ok(primaryHas(f), `${r.field} ${r.band}: ${f} is on a Primary row`);
  }
  // The CE table's whole block is Primary (FRED mirror); the Secondary figures are not in the file.
  assert.match(doc, /Check: Primary \(FRED mirror\)/);
  for (const sec of [1487, 1890, 94880, 21000, 14315, 3493]) assert.ok(!JSON.stringify(data).includes(String(sec)), `${sec} (Secondary) is left out`);
});

test('rows by age: the band, else all ages; empty is not zero', () => {
  assert.equal(rowFor(data, 'netWorth', 28).band, 'under 35');
  assert.equal(rowFor(data, 'netWorth', 38).median, 155600);
  assert.equal(rowFor(data, 'netWorth', 80).band, '75 and over');
  assert.equal(rowFor(data, 'cash', 28).band, 'all ages');
  assert.equal(rowFor(data, 'cash', null).median, 8200);
  assert.equal(rowFor(data, 'spending.total', 28).mean, 74475);
  assert.equal(rowFor(data, 'spending.foodAway', 40), null, 'no CE category row for 35 to 44 yet');
  assert.equal(typicalOf(data, 'rent', { age: 28 }), null);
  assert.equal(typicalOf(data, 'retirement', { age: 28 }), null);
  assert.equal(typicalOf(data, 'spending', { age: 38 }), null, '35 to 44 has a total but no pensions row: no spending range');
});

test('the range: the median (or mean) times the stated spread, with its basis', () => {
  const r = typicalOf(data, 'cash', { age: 28 });
  assert.equal(r.by, 'median'); assert.equal(r.likely, 8200);
  near(r.low, 8200 * RULES.typicalLow); near(r.high, 8200 * RULES.typicalHigh);
  assert.equal(r.allAges, true); assert.equal(r.place, 'national');
  assert.match(r.basis, /Typical at all ages: \$4,920 to \$12,300\. Survey of Consumer Finances 2025.*Table 3.*median \$8,200 among the 98\.7%/);
  const s = typicalOf(data, 'spending', { age: 28 });
  near(s.likely, (74475 - 10701) / 12); assert.equal(s.by, 'mean'); assert.equal(s.band, '25 to 34');
  assert.match(s.basis, /a month/);
  const g = typicalOf(data, 'spending.foodAtHome', { age: 22 });
  near(g.likely, 4189 / 12);
  for (const k of CE_CATEGORIES) assert.ok(typicalOf(data, `spending.${k}`, { age: 28 }), k);
  assert.equal(typicalOf(data, 'netWorth', { age: 28 }).likely, 33000);
  assert.equal(shortRange(r), '4.9K to 12K');
  assert.equal(shortRange({ low: 640, high: 1600 }), '640 to 1.6K');
});

test('a place row scales the range where one exists (none is Primary yet, so NY reads national)', () => {
  assert.equal(placeOf(data, 'cash', 'NY'), null);
  assert.equal(typicalOf(data, 'cash', { place: 'NY' }).place, 'national');
  const withNy = { ...data, place: [{ field: 'cash', place: 'NY', factor: 1.2, source: 'made up for the test' }] };
  const r = typicalOf(withNy, 'cash', { place: 'NY' });
  assert.equal(r.likely, 8200 * 1.2); assert.equal(r.place, 'NY'); assert.match(r.basis, /scaled for NY/);
});

test('far outside is one more spread beyond an edge, on the sides that matter', () => {
  const r = { low: 60, likely: 100, high: 150 };
  assert.equal(farFrom(r, 225), null); assert.equal(farFrom(r, 226), 'above');
  assert.equal(farFrom(r, 36), null); assert.equal(farFrom(r, 35), 'below');
  assert.equal(farFrom(r, 10, ['above']), null);
  assert.equal(farFrom(r, null), null); assert.equal(farFrom(null, 5), null);
  assert.deepEqual(TYPICAL.card.sides, ['above']);
});

test('the words: calm, from the client\'s side, no verdict and no em dash', () => {
  const c = typicalCheck(data, 'cash', 400, { age: 28 });
  assert.equal(c.text, 'Below what most households have in checking and savings');
  const s = typicalCheck(data, 'spending', 15000, { age: 28 });
  assert.equal(s.text, 'Above what most 25 to 34 year olds spend a month');
  assert.equal(typicalCheck(data, 'card', 50, { age: 28 }), null, 'a small card balance gets no note');
  assert.equal(typicalCheck(data, 'card', 7500, { age: 28 }).text, 'Above what most households with a card balance carry on cards');
  for (const t of [c.text, s.text, c.tip, s.tip]) { assert.ok(!t.includes(String.fromCharCode(0x2014))); assert.ok(!/\b(bad|poor|too|danger|warning|behind|fail)/i.test(t), t); }
  assert.equal(shareOf(data, 'emergency3mo', 28).text, 'About 37% of 18 to 29 year olds have three months of expenses in emergency savings');
  assert.equal(shareOf(data, 'cover400', 70).share, 0.78);
});

const recs = list => list.map((r, i) => ({ id: `r${i}`, values: {}, ...r }));
test('the standard clients: Alexis gets one note, under her checking; Maya and Tom none', () => {
  const alexis = recs([{ kind: 'account', type: 'Checking', values: { group: 'cash', balance: 400 } }, { kind: 'debt', type: 'Credit card', values: { balance: 4200 } }, { kind: 'spending', type: 'All in', amount: 2800 }]);
  const a = typicalChecks(data, { age: 28, boxes: typicalBoxes(alexis) });
  assert.deepEqual(a.map(c => [c.field, c.dir, c.key]), [['cash', 'below', 'r0:balance']]);
  const maya = recs([{ kind: 'account', values: { group: 'cash', balance: 1200 } }, { kind: 'account', values: { group: 'cash', balance: 4000 } }, { kind: 'account', values: { group: 'investment', balance: 15000 } }, { kind: 'debt', type: 'Credit card', values: { balance: 6000 } }, { kind: 'spending', type: 'All in', amount: 3500 }]);
  assert.deepEqual(typicalChecks(data, { age: 30, boxes: typicalBoxes(maya) }), [], 'cash is the total of both accounts ($5,200), inside typical');
  const tom = recs([{ kind: 'account', values: { group: 'cash', balance: 8000 } }, { kind: 'account', values: { group: 'cash', balance: 30000 } }, { kind: 'spending', type: 'All in', amount: 6500 }]);
  const t = typicalChecks(data, { age: 38, boxes: typicalBoxes(tom) });
  assert.deepEqual(t.map(c => [c.field, c.dir, c.key]), [['cash', 'above', 'r1:balance']], '$38,000 cash is above $18,450; the note goes under the bigger box');
  assert.deepEqual(typicalChecks(data, { age: 28, boxes: typicalBoxes(recs([{ kind: 'account', values: { group: 'cash', balance: null } }])) }), [], 'a blank box is not checked');
});
