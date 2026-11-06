// SPDX-License-Identifier: AGPL-3.0-only
// Batch 31: typical at your age. The data file holds only Primary rows (each figure is in docs/engines/priors-sources.md
// on a row marked Primary), the ranges and the far-outside rule, the calm words, and the standard clients.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rowFor, typicalOf, farFrom, typicalCheck, typicalChecks, typicalBoxes, shareOf, shortRange, placeOf, priorsOpts, isRentLine, TYPICAL, CE_CATEGORIES } from '../js/math/priors.js';
import { RULES, REFERENCE_FILES } from '../js/registry/assumptions.js';
import { ageOf } from '../js/math/metrics.js';

const root = new URL('../', import.meta.url);
const data = JSON.parse(readFileSync(new URL('data/priors-2026.json', root), 'utf8'));
const doc = readFileSync(new URL('docs/engines/priors-sources.md', root), 'utf8');
const near = (a, b, tol = 0.5) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('the file: its shape, registered with its source and date', () => {
  const reg = REFERENCE_FILES.find(r => r.file === 'data/priors-2026.json');
  assert.ok(reg && reg.id === data.id && reg.date === data.asOf && reg.source);
  assert.ok(data.source && data.range && data.placeNote && data.leftOut.length);
  assert.ok(data.place.length, 'batch 39: the BEA price parities for the NY metro and NJ');
  for (const p of data.place) assert.ok(p.field && p.place && p.area && p.factor > 0 && data.sources[p.source] && p.table && /^https:\/\//.test(p.link) && p.year >= 2024, `place ${p.place}`);
  for (const r of data.rows) {
    assert.ok(r.field && r.band && r.who && r.unit && r.table && /^https:\/\//.test(r.link) && (r.year >= 2024 || r.olderBecause), `${r.field} ${r.band}: field, band, who, unit, table, link, year (older only with the reason, batch 46)`);
    assert.ok(data.sources[r.source], `${r.field} ${r.band}: source ${r.source}`);
    assert.ok(r.ages === null || (Array.isArray(r.ages) && r.ages.length === 2), `${r.field} ${r.band}: ages`);
    assert.ok(r.median != null || r.mean != null || r.share != null, `${r.field} ${r.band}: a figure`);
  }
  for (const f of ['netWorth', 'cash', 'card', 'studentLoans', 'cover400', 'emergency3mo', 'spending.total', 'spending.personalInsurance', 'rent', 'retirement']) assert.ok(data.rows.some(r => r.field === f), f);
  for (const r of data.rows.filter(x => x.household || x.place)) assert.ok((!r.household || ['Solo', 'Couple'].includes(r.household)) && (!r.place || r.area), `${r.field}: household or place with its area`);
});

// Every figure is written in priors-sources.md (as $33,000, $74,475, 45% or 98.7%) on a line whose Check says Primary.
test('every figure traces to a Primary row of priors-sources.md; nothing Secondary is here', () => {
  const lines = doc.split('\n');
  const primaryHas = text => lines.some(l => l.includes(text) && /\| Primary|Primary \(|Check: Primary/.test(l)) || lines.some(l => l.includes(text) && /^\| (Category|Total|Food|Housing|Shelter|Rented|Utilities|Transportation|Vehicle|Health|Entertainment|Apparel|Personal|Cash contributions)/.test(l));
  const d$ = v => `$${v.toLocaleString('en-US')}`;
  for (const r of data.rows) {
    const figs = [r.median, r.mean, r.p25, r.p75, r.p90].filter(v => v != null).map(d$);
    if (r.share != null && r.unit === 'share') figs.push(`${Math.round(r.share * 100)}%`);
    for (const f of figs) assert.ok(primaryHas(f), `${r.field} ${r.band}: ${f} is on a Primary row`);
  }
  // A place factor is the published index (112.563 for 1.12563) on a Primary line.
  for (const p of data.place) assert.ok(primaryHas((p.factor * 100).toFixed(3)), `${p.place}: ${p.factor} is on a Primary row`);
  // The CE table's whole block is Primary (FRED mirror); the Secondary figures are not in the file.
  assert.match(doc, /Check: Primary \(FRED mirror\)/);
  const nums = new Set(JSON.stringify(data).match(/\d+(\.\d+)?/g));
  for (const sec of [1487, 1890, 1830, 1720, 1798, 94880, 21000, 14315, 3493, 5000, 16200]) assert.ok(!nums.has(String(sec)), `${sec} (Secondary) is left out`);
});

test('rows by age: the band, else all ages; empty is not zero', () => {
  assert.equal(rowFor(data, 'netWorth', 28).band, 'under 35');
  assert.equal(rowFor(data, 'netWorth', 38).median, 155600);
  assert.equal(rowFor(data, 'netWorth', 80).band, '75 and over');
  assert.equal(rowFor(data, 'cash', 28).band, 'all ages');
  assert.equal(rowFor(data, 'cash', null).median, 8200);
  assert.equal(rowFor(data, 'spending.total', 28).mean, 74475);
  assert.equal(rowFor(data, 'spending.foodAway', 40).mean, 5049, 'batch 39: the CE categories for 35 to 44');
  assert.equal(rowFor(data, 'spending.total', 80).mean, 55834);
  // Batch 46: income and retirement have all-ages rows only, shaped by age (data.shapes): income like CE spending,
  // retirement like SCF net worth. The age band's ratio to all ages (QUESTIONS 336).
  near(typicalOf(data, 'income', { age: 28 }).likely, 87460 * 74475 / 75172);
  near(typicalOf(data, 'retirement', { age: 28 }).likely, 106000 * 33000 / 215900);
  assert.equal(typicalOf(data, 'retirement').likely, 106000, 'no age: all ages, as it is');
  near(typicalOf(data, 'spending', { age: 38 }).likely, (91229 - 13465) / 12);
});

test('the closest row: its place, then living alone, then the age band', () => {
  assert.equal(rowFor(data, 'spending.total', 28, { household: 'Solo' }).mean, 48794, 'a person living alone reads the one-person row');
  assert.equal(rowFor(data, 'spending.total', 28, { household: 'Couple' }).mean, 74475, 'a couple reads the age band');
  assert.equal(rowFor(data, 'spending.total', 28).mean, 74475);
  assert.equal(rowFor(data, 'rent', 28, { place: 'NY' }).median, 1621);
  assert.equal(rowFor(data, 'rent', 28, { place: 'CA' }).median, 1413, 'no row for the place: national');
  assert.equal(rowFor(data, 'netWorth', 28, { household: 'Solo' }).band, 'under 35', 'no Solo row: the age band');
  const s = typicalOf(data, 'spending', { age: 28, household: 'Solo' });
  near(s.likely, (48794 - 4329) / 12 * 74475 / 75172); assert.equal(s.household, 'Solo'); assert.equal(s.who, 'people who live alone'); // batch 46, QUESTIONS 336
  assert.match(s.basis, /^Typical living alone at 25 to 34: .*mean \$3,705 among one-person households of every age \(average age 56\.3\), scaled to 25 to 34 by 25 to 34's ratio to all ages \(0\.99: 25 to 34's \$74,475 against all ages' \$75,172 a year, all ages 2022 to 2023\)/);
  near(typicalOf(data, 'spending', { household: 'Solo' }).likely, (48794 - 4329) / 12, 0.5, 'no age: the one-person row as published');
  assert.deepEqual(priorsOpts({ state: 'NY', household: 'Solo', housing: 'Rent', roommates: 1, shared: { rent: true }, sharedAs: { rent: 'Your share' } }), { place: 'NY', household: 'Solo', split: 2, housing: 'Rent' });
  assert.equal(priorsOpts({ roommates: 1, sharedAs: { rent: 'The whole bill' } }).split, 1, 'the whole bill is not divided');
  assert.equal(priorsOpts({ roommates: 0 }).split, 1);
  assert.deepEqual(priorsOpts(null), { place: null, household: null, split: 1, housing: null });
});

test('percentiles where a row gives them, the stated spread where not', () => {
  const n = typicalOf(data, 'netWorth');
  assert.equal(n.percentiles, true); assert.equal(n.low, 27900); assert.equal(n.likely, 215900); assert.equal(n.high, 812800);
  assert.match(n.basis, /Typical at all ages: \$27,900 to \$812,800\..*Table A\.2.*The range is the published 25th to 75th percentile$/);
  const a = typicalOf(data, 'netWorth', { age: 28 });
  assert.equal(a.percentiles, false); near(a.low, 33000 * RULES.typicalLow); assert.match(a.basis, /spread around it \(no percentiles published\)$/);
});

test('rent: the ACS median gross rent, a NY renter reads New York State, a share is split', () => {
  const us = typicalOf(data, 'rent');
  assert.equal(us.likely, 1413); assert.equal(us.place, 'national'); assert.match(us.basis, /^Typical at all ages: \$848 to \$2,120 a month\. American Community Survey 5-year estimates, 2020 to 2024, QuickFacts median gross rent \(B25064\), United States: median \$1,413 among renter households \(rent plus utilities\), national\./);
  const ny = typicalOf(data, 'rent', { place: 'NY' });
  assert.equal(ny.likely, 1621); assert.equal(ny.place, 'NY'); assert.equal(ny.area, 'New York State'); assert.equal(ny.who, 'renters in New York State');
  const share = typicalOf(data, 'rent', { place: 'NY', split: 2 });
  assert.equal(share.likely, 810.5); assert.equal(share.split, 2); assert.match(share.basis, /^Typical in New York State: \$486 to \$1,216 a month\. .*New York State: median \$1,621 among renter households \(rent plus utilities\), split 2 ways \(your share\): \$811\./);
  assert.equal(typicalCheck(data, 'rent', 4000, { place: 'NY' }).text, 'Above what most renters in New York State pay in rent a month');
  assert.equal(typicalCheck(data, 'rent', 600, { place: 'NY' }), null, 'low rent gets no note');
  assert.equal(typicalOf(data, 'rent', { place: 'NJ' }).likely, 1413, 'NJ: no Primary rent row, national (spending is the only place scale)');
  assert.ok(isRentLine({ kind: 'bill', values: { category: 'Rent or mortgage' } }));
  assert.ok(!isRentLine({ kind: 'bill', values: { category: 'Rent or mortgage', whoPays: 'Covered by someone' } }));
  assert.ok(!isRentLine({ kind: 'bill', per: 'week', values: { category: 'Rent or mortgage' } }));
  assert.deepEqual(typicalBoxes([{ id: 'b', kind: 'bill', amount: 900, values: { category: 'Rent or mortgage' } }], { housing: 'Own' }).rent, [], 'an owner\'s Rent or mortgage line is not rent');
});

test('the range: the median (or mean) times the stated spread, with its basis', () => {
  const r = typicalOf(data, 'cash', { age: 28 });
  // Batch 46: cash is shaped like CE spending by age (25 to 34's $74,475 over all ages' $75,172).
  const k = 74475 / 75172;
  assert.equal(r.by, 'median'); near(r.likely, 8200 * k);
  near(r.low, 8200 * k * RULES.typicalLow); near(r.high, 8200 * k * RULES.typicalHigh);
  assert.equal(r.allAges, false); assert.equal(r.place, 'national');
  assert.match(r.basis, /Typical at 25 to 34: \$4,874 to \$12,186\. Survey of Consumer Finances 2025.*Table 3.*median \$8,200 among the 98\.7%.*, shaped for 25 to 34 like spending \(0\.99 of all ages\)/);
  assert.equal(typicalOf(data, 'cash').likely, 8200, 'no age: all ages');
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

test('a place row scales spending: the NY metro for NY clients (QUESTIONS 210); balances stay national', () => {
  assert.equal(placeOf(data, 'cash', 'NY'), null);
  assert.equal(typicalOf(data, 'cash', { place: 'NY' }).place, 'national');
  assert.equal(placeOf(data, 'spending.food', 'NY').factor, 1.12563, 'the parts of spending scale too');
  const r = typicalOf(data, 'spending', { age: 28, place: 'NY', household: 'Solo' });
  near(r.likely, (48794 - 4329) / 12 * 74475 / 75172 * 1.12563); assert.equal(r.place, 'NY'); assert.equal(r.area, 'the New York metro');
  assert.match(r.basis, /scaled for the New York metro \(Regional Price Parities: All Items, New York-Newark-Jersey City MSA, 2024: 112\.563/);
  near(typicalOf(data, 'spending', { age: 38, place: 'NJ', household: 'Solo' }).likely, (48794 - 4329) / 12 * 91229 / 75172 * 1.08805);
  const withCash = { ...data, place: [{ field: 'cash', place: 'NY', area: 'NY', factor: 1.2, source: 'made up for the test' }] };
  assert.equal(typicalOf(withCash, 'cash', { place: 'NY' }).likely, 8200 * 1.2);
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
test('the standard clients: Alexis gets one note, under her checking; Maya and Tom none (age only, national)', () => {
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

// Batch 39: the persona files themselves, with their About you (state, Solo, renting, roommates) and the rent line.
const persona = n => JSON.parse(readFileSync(new URL(`fixtures/personas/${n}.json`, root), 'utf8')).household;
const NOW = new Date('2026-11-06T12:00:00Z');
const checksFor = h => { const o = priorsOpts(h.profile); return typicalChecks(data, { age: ageOf(h.profile, NOW), ...o, boxes: typicalBoxes(h.records, o) }); };
test('the persona files: Alexis reads New York rent split with her roommate; Maya and Tom still read sensibly', () => {
  const alexis = persona('alexis'), maya = persona('maya'), tom = persona('tom');
  const o = priorsOpts(alexis.profile);
  assert.deepEqual(o, { place: 'NY', household: 'Solo', split: 2, housing: 'Rent' });
  const rent = typicalOf(data, 'rent', { age: 28, ...o });
  assert.equal(rent.area, 'New York State'); assert.equal(rent.likely, 1621 / 2);
  assert.match(rent.basis, /^Typical in New York State: .*split 2 ways \(your share\)/);
  assert.equal(typicalBoxes(alexis.records, o).rent[0].value, 900);
  const a = checksFor(alexis);
  assert.deepEqual(a.map(c => [c.field, c.dir]), [['cash', 'below']], 'her $900 share sits near the typical $811: no rent note; her $400 checking is the one note');
  assert.equal(a[0].text, 'Below what most households have in checking and savings');
  const higher = typicalChecks(data, { age: 28, ...o, boxes: { rent: [{ key: 'x:amount', value: 2000 }] } });
  assert.equal(higher[0].text, 'Above what most renters in New York State pay in rent a month');
  assert.match(higher[0].tip, /New York State: median \$1,621.*split 2 ways/);
  const spend = typicalOf(data, 'spending', { age: 28, ...o });
  near(spend.likely, (48794 - 4329) / 12 * 74475 / 75172 * 1.12563); // batch 46, QUESTIONS 336 assert.equal(spend.who, 'people who live alone');
  assert.deepEqual(checksFor(maya), [], 'Maya: $5,200 cash, $6,000 cards, $3,500 spending and $1,750 rent are all inside typical for NY');
  assert.equal(typicalOf(data, 'rent', { age: 30, ...priorsOpts(maya.profile) }).likely, 1621, 'no roommates: the whole rent');
  const t = checksFor(tom);
  assert.deepEqual(t.map(c => [c.field, c.dir]), [['cash', 'above']], 'Tom: only his $38,000 cash; he owns, so no rent check');
  assert.deepEqual(typicalBoxes(tom.records, priorsOpts(tom.profile)).rent, []);
  for (const c of [...a, ...higher, ...t]) { assert.ok(!c.text.includes(String.fromCharCode(0x2014)) && !c.tip.includes(String.fromCharCode(0x2014))); assert.ok(!/\b(bad|poor|too|danger|warning|behind|fail)/i.test(c.text), c.text); }
});
