// Overnight F6: capture now for later. Synthetic households only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold, exportFile, importInto } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { INCOME_KINDS, incomeKindOf, rateCategoryJoy, categoryJoyOf, categoriesOf, tripsOf, changeLog } from '../js/capture.js';
import { REPORTS } from '../js/registry/reports.js';
import { buildWorkbook } from '../js/sheet/workbook.js';
import { AREAS } from '../js/registry/fields.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const demo = JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const demoStore = () => new Store(householdFromInputs(demo.inputs, { name: 'Z', now: now.toISOString() }), { now: () => now.toISOString() });

test('income type: four kinds, a default from the row type, a typed one wins; registered with a sheet column', () => {
  assert.deepEqual(INCOME_KINDS, ['Salary', 'Side hustle', 'Windfall', 'Other']);
  assert.equal(incomeKindOf({ type: 'Job', values: {} }), 'Salary');
  assert.equal(incomeKindOf({ type: 'Side hustle', values: {} }), 'Side hustle');
  assert.equal(incomeKindOf({ type: 'Money from family', values: {} }), 'Windfall');
  assert.equal(incomeKindOf({ type: 'Job', values: { incomeKind: 'Windfall' } }), 'Windfall');
  const f = AREAS.find(a => a.id === 'income').fields.find(x => x.key === 'incomeKind');
  assert.ok(f && f.sheet === true);
  assert.ok(AREAS.find(a => a.id === 'calendar').fields.some(x => x.key === 'trip'), 'Trip on calendar entries');
  assert.ok(AREAS.find(a => a.id === 'spending').fields.some(x => x.key === 'trip'), 'Trip on Budget lines');
});

test('a dated joy rating per category, 1 to 5, with who; the latest shows; it survives export and import', () => {
  const d = demoStore();
  const cats = categoriesOf(d.doc.records);
  assert.ok(cats.length >= 2, `categories on the Demo budget: ${cats.length}`);
  rateCategoryJoy(d, cats[0], 2, { now: '2026-11-05T12:00:00.000Z' });
  d.who = 'Client';
  rateCategoryJoy(d, cats[0], 4, { now: '2026-12-05T12:00:00.000Z' });
  assert.throws(() => rateCategoryJoy(d, cats[0], 6), /1 to 5/);
  const j = categoryJoyOf(d.doc)[cats[0]];
  assert.equal(j.value, 4);
  assert.equal(j.history.length, 2);
  assert.deepEqual(j.history.map(x => x.who), ['Coach', 'Client']);
  const t = new Store(newHousehold({ name: 'T', now: now.toISOString() }));
  importInto(t, JSON.parse(JSON.stringify(exportFile(d.doc))));
  assert.equal(categoryJoyOf(t.doc)[cats[0]].value, 4);
});

test('the change log: every edit with field, old, new, who and the time; Client view marks the client', () => {
  const d = demoStore();
  const before = d.doc.history.length;
  const acct = d.find(r => r.kind === 'account')[0];
  d.update(acct.id, { balance: 123 });
  d.who = 'Client';
  d.update(acct.id, { balance: 456 });
  const log = changeLog(d.doc, { limit: 5 });
  assert.equal(log[0].who, 'Client');
  assert.equal(log[1].who, 'Coach');
  assert.deepEqual([log[0].field, log[0].from, log[0].to], ['balance', '123', '456']);
  assert.equal(log[0].what, acct.name);
  assert.ok(d.doc.history.length === before + 2);
  assert.ok(d.doc.history.at(-1).at, 'dated');
  d.add('entry', { name: 'Flight home', amount: 400, values: { date: '2026-12-20', direction: 'Out', trip: true } });
  assert.equal(tripsOf(d.doc.records).length, 1);
});

test('the Captured tab of the workbook lists the ratings, the trips, the income types and the change log', async () => {
  const d = demoStore();
  const cats = categoriesOf(d.doc.records);
  rateCategoryJoy(d, cats[0], 5);
  d.add('entry', { name: 'Flight home', amount: 400, values: { date: '2026-12-20', direction: 'Out', trip: true } });
  const rep = REPORTS.find(r => r.tab === 'Captured');
  assert.ok(rep);
  const wb = await buildWorkbook(d.doc, ref, { now });
  const sheet = wb.sheets?.find(s => s.name === 'Captured') ?? wb.worksheets?.find(s => s.name === 'Captured');
  assert.ok(sheet, 'a Captured tab');
  const text = JSON.stringify(sheet.rows ?? sheet);
  assert.ok(text.includes('Joy by category') && text.includes('Flight home') && text.includes('Income type') && text.includes('Change log'));
});
