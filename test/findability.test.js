// Findability (batch 14, item 1 to 3): the 39 everyday terms each put the right screen and box first, on the Demo
// client and on a client made by Fast Track; Add goes where the thing belongs; duplicate names say whose they are.
// The browser half is tools/e2e/findability.cjs (it types each term into Find and checks where it lands).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { search } from '../js/nav.js';
import { addChoice, norm } from '../js/find.js';
import { householdFromInputs } from '../js/demo.js';
import { Store, newHousehold } from '../js/records.js';
import { addPresets } from '../js/presets.js';
import { applyFastTrack, fastTrackAnswers } from '../js/fasttrack.js';
import { parseQuickAdd } from '../js/quickadd.js';

const root = new URL('../', import.meta.url);
const ref = JSON.parse(readFileSync(new URL('data/reference-2026.json', root)));
const fields = JSON.parse(readFileSync(new URL('data/fields.json', root)));
const { TERMS } = createRequire(import.meta.url)('../tools/e2e/find-terms.cjs');
const NOW = new Date('2026-11-05T12:00:00Z');

const demo = () => householdFromInputs(JSON.parse(readFileSync(new URL('fixtures/demo.json', root))).inputs, { name: 'Demo client', now: NOW.toISOString() });
// Alexis through Fast Track (build notes): born 1998, $1,200 every 2 weeks, gut $2,800, checking $400, cards $4,200 paying $120, rents, no car.
export function alexisDoc() {
  const s = new Store(newHousehold({ name: 'Alexis Gillmore' }));
  addPresets(s, ref);
  const a = fastTrackAnswers(s.doc);
  Object.assign(a, { birthYear: 1998, takeHome: 1200, takePer: 'paycheck', payFrequency: '2 weeks', gut: 2800, gutIncludesDebt: false, checking: 400, savings: 0, invested: 0, housing: 'Rent', hasCar: false, noDebts: true });
  a.debts['Credit card'] = { balance: 4200, payment: 120, rows: 0 };
  applyFastTrack(s, a, { finished: true, now: NOW.toISOString() });
  return s.doc;
}
const find = (doc, term) => search(term, { fields, records: doc.records, doc, ref });

for (const [name, make] of [['the Demo client', demo], ['a Fast Track client', alexisDoc]]) {
  test(`Find: all ${TERMS.length} everyday terms land on the right screen and box first, on ${name}`, () => {
    const doc = make();
    const misses = [];
    for (const t of TERMS) {
      const top = find(doc, t.term)[0];
      if (!top || !t.routes.includes(top.route) || !t.box.test(top.focus ?? '')) misses.push(`"${t.term}": got ${top ? `${top.label} (${top.route}, ${top.focus ?? 'no box'})` : 'nothing'}; wanted ${t.routes.join(' or ')} with ${t.box}`);
    }
    assert.deepEqual(misses, []);
  });
}

test('Find: punctuation and spacing do not count; 401k finds 401(k)', () => {
  assert.equal(norm('401(k) or 403(b)'), '401k or 403b');
  assert.equal(norm("  Kids'  allowance "), 'kids allowance');
  assert.ok(find(demo(), '401k').some(r => r.kind === 'field' && /401\(k\)/.test(r.label)), 'the 401(k) fields are found too');
});

test('Find: APR on the Demo client lists each debt once, with its name', () => {
  const doc = demo();
  const debts = doc.records.filter(r => r.kind === 'debt');
  const aprs = find(doc, 'APR').filter(r => r.kind === 'word');
  assert.deepEqual(aprs.map(r => r.id).sort(), debts.map(r => r.id).sort());
  for (const r of aprs) assert.match(r.label, /^APR · /);
  assert.equal(new Set(aprs.map(r => r.label)).size, aprs.length, 'each label once');
  const all = find(doc, 'APR');
  assert.equal(new Set(all.map(r => `${r.label}|${r.where}`)).size, all.length, 'no identical duplicates');
});

test('Find: payday is the pay schedule, credit score is on Credit cards, life insurance on Protection', () => {
  const doc = demo();
  assert.match(find(doc, 'payday')[0].focus, /:payFrequency$/); // batch 13 renamed the box
  assert.equal(find(doc, 'credit score')[0].route, '#/net-worth/credit-cards');
  assert.equal(find(doc, 'life insurance')[0].route, '#/net-worth/protection');
  assert.equal(find(doc, 'emergency fund')[0].route, '#/net-worth/assets');
  assert.deepEqual(find(doc, 'emergency fund').slice(0, 2).map(r => r.focus.startsWith('sec:') ? r.focus : 'balance'), ['sec:assets:layers', 'balance'], 'batch 18: the Cash layers card first, the savings balance second');
});

test('Add goes where it belongs: never a Budget line for a word that is not spending', () => {
  const add = t => addChoice(t, { ref });
  assert.equal(add('home value'), null, 'home value: Find only, no Add');
  assert.equal(add('FI age'), null);
  assert.equal(add('401k').kind, 'account');
  assert.equal(add('401k').section, 'Net worth › Assets');
  assert.equal(add('student loan 18000').kind, 'debt');
  assert.equal(add('life insurance').kind, 'coverage');
  assert.equal(add('side hustle 400 a month').kind, 'income');
  assert.equal(add('Netflix 15 a month').kind, 'bill', 'a name with an amount is spending');
  assert.equal(add('Coffee').kind, 'bill', 'a Budget word is spending');
  assert.equal(add('ask about the pension').kind, 'note', 'unsure: a note for later');
  assert.notEqual(add('401(k) match')?.kind, 'bill');
});

test('quick add: an account number is part of the name, never the amount', () => {
  assert.equal(parseQuickAdd('401(k) match').values.balance, null);
  assert.equal(parseQuickAdd('401(k) match').type, '401(k)');
  assert.equal(parseQuickAdd('401k 5000').values.balance, 5000);
  assert.equal(parseQuickAdd('529 plan 3000').values.balance, 3000);
});
