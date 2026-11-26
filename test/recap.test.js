// SPDX-License-Identifier: AGPL-3.0-only
// Run Finish everything partly built, Part 18 (Coach and reports): the auto session summary (M8R), the Plan report's
// parts and the FIRE dashboard (Plan › FIRE, fireBoardOf on M9G). Made-up numbers and personas only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recapChanges, recapNumbers, sessionRecap, recapText } from '../js/math/recap.js';
import { destinationsOf, fireBoardOf } from '../js/math/destinations.js';
import { metrics } from '../js/math/metrics.js';
import { importFile, Store } from '../js/records.js';
import { createCtx } from '../js/ui/staples.js';
import { recapDraft, recapOf } from '../js/ui/report-ui.js';
import { fireFlavorOf } from '../js/ui/fire-ui.js';
import { FIRE_EXPLAIN, FIRE_PACES, DESTINATIONS } from '../js/registry/destinations.js';
import { TABS } from '../js/nav.js';
import { buildPersona, loadDefs, NOW } from '../tools/personas/build.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date(NOW);
const defs = await loadDefs();
const persona = id => buildPersona(defs.find(d => d.id === id));

test('M8R numbers: then and now, up or down, and a later date only ever recalculates', () => {
  const before = { netWorth: 10000, debtTotal: 8000, surplus: 500, savingsRate: 0.1, debtFreeMonths: 20, monthsToFi: 240 };
  const after = { netWorth: 12500, debtTotal: 7000, surplus: 500, savingsRate: 0.12, debtFreeMonths: 17, monthsToFi: 250 };
  // the snapshot is from October, today is November: Oct + 20 = Jun 2028; Nov + 17 = Apr 2028, 2 months sooner
  const N = recapNumbers(before, after, { at: '2026-11', beforeAt: '2026-10' });
  const t = Object.fromEntries(N.map(x => [x.key, x.text]));
  assert.equal(t['num:netWorth'], 'Net worth is $12,500, up $2,500 since the last session.');
  assert.equal(t['num:debtTotal'], 'Debt on file is $7,000, down $1,000 since the last session.');
  assert.equal(t['num:surplus'], undefined, 'the same surplus says nothing');
  assert.match(t['num:savingsRate'], /^Savings rate is 12(\.0)?%, up 2(\.0)?%/);
  assert.equal(t['date:debtFreeMonths'], 'Debt free: Apr 2028, 2 months sooner.');
  // Oct + 240 = Oct 2046; Nov + 250 = Sep 2047: later, so Recalculating with the new month, never a verdict
  assert.equal(t['date:monthsToFi'], 'Recalculating: the FI date is now Sep 2047.');
  for (const x of N) assert.doesNotMatch(x.text, /behind|mistake|failed|off track/i);
  // the same calendar month a month later is no change: Oct + 20 and Nov + 19 are both Jun 2028
  assert.equal(recapNumbers({ debtFreeMonths: 20 }, { debtFreeMonths: 19 }, { at: '2026-11', beforeAt: '2026-10' }).length, 0);
  // the FI date stays out while it is locked
  assert.ok(!recapNumbers(before, after, { at: '2026-11', beforeAt: '2026-10', fiOk: false }).some(x => x.key === 'date:monthsToFi'));
  // the first session: each number as it is today; a number not on file is left out
  const first = recapNumbers(null, { netWorth: 400, debtTotal: null, surplus: -50 }, { at: '2026-11' });
  assert.equal(first.length, 2); assert.equal(first[0].text, 'Net worth today: $400.'); assert.match(first[1].text, /^Monthly surplus today: .*50\.$/);
  assert.equal(recapNumbers(null, null).length, 0);
});

test('M8R changes: grouped by kind and what was done; a row added in the session counts once; a private row never by name', () => {
  const C = recapChanges([
    { op: 'add', rowId: 'a', kind: 'debt', name: 'Visa' }, { op: 'set', rowId: 'a', kind: 'debt', name: 'Visa' }, { op: 'set', rowId: 'a', kind: 'debt', name: 'Visa' },
    { op: 'add', rowId: 'b', kind: 'debt', name: 'Car loan' }, { op: 'add', rowId: 'c', kind: 'debt', name: null },
    { op: 'set', rowId: 'd', kind: 'bill', name: 'Rent' }, { op: 'status', rowId: 'd', kind: 'bill', name: 'Rent' },
    { op: 'set', rowId: null, part: 'profile' }, { op: 'set', rowId: null, part: 'profile' },
    { op: 'remove', rowId: 'e', kind: 'asset', name: null },
  ]);
  const t = C.map(x => x.text);
  assert.equal(t[0], 'Added 3 debts: Visa and Car loan and 1 kept private.');
  assert.ok(t.includes('Updated 1 Budget line: Rent.'));
  assert.ok(t.includes('Updated About you (2 answers).'));
  assert.ok(t.includes('Removed 1 asset (kept private).'));
  assert.equal(C.length, 4, 'the edits of the added Visa are inside "Added"');
});

test('M8R: 10 takeaways and 5 steps at most, the numbers first, each step once', () => {
  const changes = Array.from({ length: 14 }, (_, i) => ({ op: 'add', rowId: `r${i}`, kind: `k${i}`, name: `N${i}` }));
  const R = sessionRecap({ before: null, now: { netWorth: 1, surplus: 2 }, changes, moves: ['Pay the card', 'Open savings'], todo: ['pay the card', 'Bring a pay stub', 'Log 7 days', 'Check the score', 'Set autopay'] }, { at: '2026-11' });
  assert.equal(R.takeaways.length, 10); assert.equal(R.takeaways[0].kind, 'number');
  assert.deepEqual(R.steps, ['Pay the card', 'Open savings', 'Bring a pay stub', 'Log 7 days', 'Check the score']);
  const text = recapText(R, { title: 'Sam: session summary', next: '2026-12-10', notes: [['Strengths', 'Shows up']] });
  assert.match(text, /^Sam: session summary\n\nTop 10 takeaways:\n1\. Net worth today: \$1\./);
  assert.match(text, /Your next 5 steps:\n1\. Pay the card/);
  assert.match(text, /Strengths: Shows up\n\nNext session: 2026-12-10\n\nCoach, not a licensed financial advisor\.$/);
  assert.ok(!text.includes('\u2014'));
});

test('the One-pager draft: from the shared view, private rows never by name, and the coach\'s edit is what Send summary sends', () => {
  const store = new Store(importFile(readFileSync(new URL('../fixtures/personas/discreet-couple.json', import.meta.url), 'utf8')));
  const ctx = createCtx({ store, ref, now: () => new Date('2026-11-26T12:00:00Z'), viewer: () => ({ clientView: false }) });
  const D = recapDraft(ctx);
  assert.ok(D.recap.takeaways.length > 0 && D.recap.takeaways.length <= 10 && D.recap.steps.length <= 5);
  assert.equal(D.edited, false); assert.equal(D.value, D.text);
  for (const w of ['Discreet PO box', 'Velvet Room', 'Wise payout', 'Lantern', 'has not told family']) assert.ok(!D.value.includes(w), w);
  // an edit for this session is kept and sent; an edit for another session is not
  store.setIn('session', ['recap'], { text: 'My own words', for: D.key, at: '2026-11-26T12:00:00Z' }, 'Session summary');
  assert.equal(recapDraft(ctx).value, 'My own words'); assert.equal(recapDraft(ctx).edited, true);
  store.setIn('session', ['recap'], { text: 'Old words', for: 'another session', at: '2026-11-01T12:00:00Z' }, 'Session summary');
  assert.equal(recapDraft(ctx).value, recapOf(ctx).text);
});

test('the Plan report and Plan › FIRE are on the nav: the report is opened from the One-pager, FIRE is a Plan sub-tab', () => {
  const report = TABS.find(t => t.id === 'report'), plan = TABS.find(t => t.id === 'plan');
  assert.equal(report.subs.find(s => s.id === 'plan-report')?.hidden, true);
  assert.ok(plan.subs.some(s => s.id === 'fire' && !s.hidden));
  const src = readFileSync(new URL('../js/ui/report-ui.js', import.meta.url), 'utf8');
  assert.match(src, /part\('one-pager'[\s\S]*part\('steps'[\s\S]*part\('statements'[\s\S]*part\('foo'/, 'the one-pager, the steps, the statements, the FOO, in that order');
  assert.match(src, /planReportScreen[\s\S]*S\.shareCtx\(ctx\)/, 'the report is the shared view');
  const css = readFileSync(new URL('../css/app.css', import.meta.url), 'utf8');
  assert.match(css, /@media print \{[^}]*\.plan-report \.report-part \+ \.report-part \{ break-before: page; \}/);
});

test('fireBoardOf: every FIRE type at a pace; the numbers stay, only the dates move, and Coast rides along', () => {
  const doc = persona('three-adults'), m = metrics(doc, ref, { now });
  const base = fireBoardOf(m, doc, { now });
  assert.deepEqual(base.views.map(v => v.key), DESTINATIONS);
  const plain = destinationsOf(m, doc, { now });
  base.views.forEach((v, i) => { assert.equal(v.months, plain[i].months); assert.equal(v.sooner, v.months == null ? null : 0); });
  const fast = fireBoardOf(m, doc, { now, extra: 1000 });
  fast.views.forEach((v, i) => {
    assert.equal(v.value, base.views[i].value, `${v.key}: the number does not move with the pace`);
    if (v.months != null && base.views[i].months != null && !v.reached) { assert.ok(v.months <= base.views[i].months, v.key); assert.equal(v.sooner, base.views[i].months - v.months); }
  });
  assert.ok(fast.views.some(v => v.sooner > 0), '$1,000 more a month brings some date closer');
  assert.ok(fast.views.find(v => v.key === 'Regular FI').assumes.some(t => /plus \$1,000/.test(t)));
  // a slower return is later or the same
  const slow = fireBoardOf(m, doc, { now, realReturn: ref.presets.pace.Pessimistic });
  slow.views.forEach((v, i) => { if (v.months != null && base.views[i].months != null && m.inputs.realReturn > ref.presets.pace.Pessimistic) assert.ok(v.months >= base.views[i].months, v.key); });
  assert.equal(base.coast.value, m.coastFi.value);
  assert.ok(base.nearest == null || base.views.every(v => v.reached || v.months == null || v.months >= base.nearest.months));
});

test('the FIRE type explainer names every destination and Coast in plain words; the paces are taps', () => {
  assert.deepEqual(FIRE_EXPLAIN.map(x => x.key).filter(k => k !== 'Coast').sort(), [...DESTINATIONS].sort());
  assert.ok(FIRE_EXPLAIN.some(x => x.key === 'Coast'));
  for (const x of FIRE_EXPLAIN) { assert.ok(x.what && x.fits && x.asks, x.key); assert.doesNotMatch(`${x.what} ${x.fits} ${x.asks}`, /\u2014|should|must|bad|wrong/i); }
  assert.equal(FIRE_PACES[0], 0);
});

test('the FIRE flavor comes from the FIRE Community Quiz answers, and none without answers', () => {
  assert.equal(fireFlavorOf({ settings: {} }), null);
  // every statement of the Coast flavor at Strongly agree, every other at Strongly disagree
  return import('../js/quiz/skins/fire.js').then(({ FIRE: F }) => {
    const ans = Object.fromEntries((F.questions || F.items || []).map(q => [q.id, q.trait === 'coast' ? (q.dir === -1 ? 1 : 5) : (q.dir === -1 ? 5 : 1)]));
    const fl = fireFlavorOf({ settings: { start: { lenses: { fire: { ans } } } } });
    assert.equal(fl?.id, 'coast', JSON.stringify(fl));
  });
});
