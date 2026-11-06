// Batch 28 (who sees this, js/privacy.js): a row, and its notes, marked Everyone, Me and my coach, or Coach only is
// folded for every audience that may not see it: renamed to a neutral word, its notes and identifying details gone,
// every number the math reads kept. The discreet couple persona (Remy's fan page and its payout account kept between
// Remy and the coach, Dana's private store card, a coach-only note and a coach-only Budget line) checks that nothing
// private reaches a partner's view, Client view, a share or an export, and that every total equals the coach's.
// The browser half is tools/e2e/privacy.cjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFile, Store } from '../js/records.js';
import { metrics, keyNumbers, flowOf } from '../js/math/metrics.js';
import { seenOf, notesSeenOf, foldDoc, foldFor, audienceOf, SHARE, sharedBackup, viewStore, rowHidden, rowLeftOut, neutralName, SEEN, SHARE_NAMES } from '../js/privacy.js';
import { LISTS } from '../js/registry/assumptions.js';
import { AREAS } from '../js/registry/fields.js';
import { buildWorkbook } from '../js/sheet/workbook.js';
import { createCtx, shareCtx } from '../js/ui/staples.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00Z');
const persona = () => importFile(readFileSync(new URL('../fixtures/personas/discreet-couple.json', import.meta.url), 'utf8'));
const REMY = ['Velvet Room', 'OnlyFans', 'Wise payout', '7781'];
const DANA = ['Lantern'];
const COACH = ['Discreet PO box', 'has not told family', 'Payouts every Friday'];
const leaks = (obj, list) => { const t = JSON.stringify(obj); return list.filter(x => t.includes(x)); };
// Every number a screen shows comes from here: the key numbers, take-home, the cash flow, the debt plan, the cash layers.
const numbers = (doc, person = null) => { const m = metrics(doc, ref, { now, person }); return { ...keyNumbers(m), takeHome: m.inputs.takeHome, gross: m.inputs.grossAnnual, runway: m.runwayMonths.value, ruleOf5: m.ruleOf5.value, flow: flowOf(m.inputs, { pretaxSaving: m.pretaxSaving }), debtMonths: m.debtPlan?.months ?? null, interest: m.debtPlan?.interest ?? null }; };
const aud = (who, person) => ({ who, person, couple: true });

test('the marks: three words, blank is Everyone, a note is never less private than its row', () => {
  assert.deepEqual(SEEN, ['Everyone', 'Me and my coach', 'Coach only']);
  assert.deepEqual(SHARE_NAMES, ['Other income', 'Self-employment', 'Consulting']);
  assert.equal(seenOf({ values: {} }), 'Everyone');
  assert.equal(notesSeenOf({ values: { seen: 'Coach only', notesSeen: 'Everyone' } }), 'Coach only');
  assert.equal(notesSeenOf({ values: { seen: 'Me and my coach', notesSeen: 'Coach only' } }), 'Coach only');
  assert.equal(neutralName({ kind: 'income', values: {} }), 'Other income');
  assert.equal(neutralName({ kind: 'income', values: { shareName: 'Consulting' } }), 'Consulting');
  assert.equal(neutralName({ kind: 'account', values: { group: 'investment' } }), 'Other investments');
  // Every record kind carries the three fields, registered with their options.
  for (const a of AREAS.filter(x => x.source === 'records')) for (const k of ['seen', 'notesSeen', 'shareName']) assert.ok(a.fields.some(f => f.key === k), `${a.tab} › ${k}`);
  for (const k of Object.keys(LISTS.privacy.neutral)) assert.ok(typeof LISTS.privacy.neutral[k] === 'string');
});

test('who sees what: the coach everything; the client not coach-only; a partner not the other partner\'s private rows; a share nothing private', () => {
  const doc = persona();
  const row = n => doc.records.find(r => r.name === n);
  const fan = row('Velvet Room fan page'), card = row('Lantern store card'), box = row('Discreet PO box');
  const mode = 'Married separate';
  for (const r of [fan, card, box]) assert.equal(rowHidden(r, aud('coach', 'all'), mode), false, `${r.name}: the coach sees it`);
  assert.equal(rowHidden(box, aud('client', 'Me'), mode), true, 'coach only: not in client view');
  assert.equal(rowHidden(fan, aud('client', 'Me'), mode), false, 'Remy sees Remy\'s own private row');
  assert.equal(rowHidden(fan, aud('client', 'Partner'), mode), true, 'Dana never sees it');
  assert.equal(rowHidden(fan, aud('coach', 'Partner'), mode), true, 'nor on the coach\'s screen on Dana\'s view');
  assert.equal(rowHidden(card, aud('client', 'Partner'), mode), false, 'Dana sees Dana\'s own card');
  assert.equal(rowHidden(card, aud('client', 'Me'), mode), true, 'Remy does not');
  assert.equal(rowHidden(fan, aud('client', 'all'), mode), true, 'the household view in client view: folded into neutral words');
  assert.equal(rowHidden(card, aud('client', 'all'), mode), true);
  for (const r of [fan, card, box]) assert.equal(rowHidden(r, SHARE, mode), true, `${r.name}: never in a share`);
  assert.equal(rowLeftOut(fan, aud('client', 'Partner'), mode), true, 'in Dana\'s view Remy\'s private row is left out, not folded');
  assert.equal(rowLeftOut(fan, aud('client', 'all'), mode), false, 'in the household view it is folded (counted)');
  assert.equal(rowLeftOut(fan, SHARE, mode), false);
  // A solo client sees their own private rows in client view; only coach-only is kept from them.
  assert.equal(rowHidden(fan, { who: 'client', person: 'all', couple: false }, null), false);
  assert.equal(audienceOf(doc, { clientView: true }).person, 'all');
});

test('every total in every view equals the coach\'s, to the cent', () => {
  const doc = persona();
  const coach = numbers(doc), byPerson = { Me: numbers(doc, 'Me'), Partner: numbers(doc, 'Partner') };
  // The household views (anything shared, Client view on Ours): the household's numbers and each person's.
  for (const a of [SHARE, aud('client', 'all')]) {
    const f = foldDoc(doc, a, ref);
    assert.notEqual(f, doc, `${a.who} ${a.person}: something is folded`);
    assert.deepEqual(numbers(f), coach, `${a.who} ${a.person}: household numbers`);
    for (const p of ['Me', 'Partner']) assert.deepEqual(numbers(f, p), byPerson[p], `${a.who} ${a.person}: ${p}'s numbers`);
  }
  // One partner's view: that partner's own numbers, to the cent. The other partner's private rows are left out of it
  // altogether (they never counted in this partner's numbers), so no household line there carries them either.
  for (const [a, p, gone] of [[aud('client', 'Me'), 'Me', 'Lantern store card'], [aud('client', 'Partner'), 'Partner', 'Velvet Room fan page'], [aud('coach', 'Partner'), 'Partner', 'Wise payout account']]) {
    const f = foldDoc(doc, a, ref);
    assert.deepEqual(numbers(f, p), byPerson[p], `${a.who} ${p}: ${p}'s numbers`);
    assert.ok(!f.records.some(r => r.id === doc.records.find(x => x.name === gone).id), `${a.who} ${p}: ${gone} is left out`);
  }
  // Hand-checked: the household net worth counts every row whoever sees it.
  assert.equal(coach.netWorth, 26238);
});

test('a folded row keeps its numbers and loses what says what it is', () => {
  const doc = persona();
  const f = foldDoc(doc, SHARE, ref);
  const real = doc.records.find(r => r.values.chargebacks === 115);
  const fan = f.records.find(r => r.id === real.id);
  assert.equal(fan.name, 'Self-employment');
  assert.equal(fan.notes, null); assert.equal(fan.privateNote, null);
  assert.equal(fan.values.platform, null);
  // Batch 45 (QUESTIONS 353): the net only. $2,975 a month less the 20% fee ($595) less $115 chargebacks = $2,265, with
  // no fee and no chargebacks left to point at the platform; a shared copy has no hold either. The payout schedule stays.
  assert.equal(fan.amount, 2265); assert.equal(fan.per, 'month');
  assert.equal(fan.values.feePct, 0); assert.equal(fan.values.chargebacks, null); assert.equal(fan.values.holdDays, 0); assert.equal(fan.values.payFrequency, 'week');
  // In an in-app folded view the hold stays in the math (the calendar lands it as late as before), not on screen.
  assert.equal(foldDoc(doc, aud('client', 'all'), ref).records.find(r => r.id === real.id).values.holdDays, 7);
  const wise = f.records.find(r => r.values.balance === 3871);
  assert.equal(wise.name, 'Other savings'); assert.equal(wise.values.last4, undefined); assert.equal(wise.values.purpose, 'Taxes');
  assert.equal(f.records.find(r => r.values.balance === 1373).name, 'Other debt');
  assert.equal(f.records.find(r => r.amount === 37).name, 'Other spending');
  assert.equal(f.records.length, doc.records.length, 'nothing is removed');
  // The real household is untouched.
  assert.equal(doc.records.find(r => r.values.chargebacks === 115).name, 'Velvet Room fan page');
});

test('nothing private leaves in a share, a shared backup or a shared spreadsheet; client view and partner views keep only what they may see', () => {
  const doc = persona();
  assert.deepEqual(leaks(foldDoc(doc, SHARE, ref).records, [...REMY, ...DANA, ...COACH]), []);
  const backup = sharedBackup(doc, ref);
  assert.deepEqual(leaks(backup, [...REMY, ...DANA, ...COACH]), [], 'the backup copy: records, history, notes');
  assert.equal(backup.sharedCopy, true); assert.notEqual(backup.id, doc.id, 'its own id: opening it never writes over the client');
  assert.deepEqual(numbers(backup), numbers(doc));
  assert.deepEqual(leaks(foldDoc(doc, aud('client', 'all'), ref).records, [...REMY, ...DANA, ...COACH]), []);
  assert.deepEqual(leaks(foldDoc(doc, aud('client', 'Me'), ref).records, [...DANA, ...COACH]), []);
  assert.deepEqual(leaks(foldDoc(doc, aud('client', 'Me'), ref).records, ['Velvet Room', 'Wise payout']), ['Velvet Room', 'Wise payout'], 'Remy\'s own rows stay for Remy');
  assert.deepEqual(leaks(foldDoc(doc, aud('client', 'Partner'), ref).records, [...REMY, ...COACH]), []);
  assert.deepEqual(leaks(foldDoc(doc, aud('coach', 'Partner'), ref).records, ['Velvet Room', 'Wise payout']), []);
  // The coach view is the household itself (nothing copied).
  assert.equal(foldFor(doc, aud('coach', 'all'), ref), doc);
  // The spreadsheet made from the shared copy: no private name anywhere in it, the neutral one in its place.
  const plan = buildWorkbook(foldDoc(doc, SHARE, ref), ref, { now, shared: true });
  // (OnlyFans is on the Assumptions tab as a row of the reference Platforms table, with every other platform: that
  // says nothing about this household, so the platform name is looked for on the household's own tabs.)
  const cells = JSON.stringify(plan.sheets.map(s => s.rows));
  assert.deepEqual(leaks(cells, [...REMY, ...DANA, ...COACH].filter(x => x !== 'OnlyFans')), []);
  assert.deepEqual(leaks(plan.sheets.filter(s => s.name !== 'Assumptions').map(s => s.rows), ['OnlyFans']), []);
  assert.ok(cells.includes('Self-employment'));
  assert.equal(plan.baseline.shared, true);
  const full = JSON.stringify(buildWorkbook(doc, ref, { now }).sheets.map(s => s.rows));
  assert.ok(full.includes('Velvet Room'), 'the full spreadsheet keeps everything');
});

test('the view store reads the folded household and writes to the real one', () => {
  const store = new Store(persona());
  const v = viewStore(store, aud('client', 'all'), ref);
  assert.notEqual(v, store);
  const id = store.doc.records.find(r => r.name === 'Velvet Room fan page').id;
  assert.equal(v.get(id).name, 'Self-employment');
  assert.equal(v.find(r => r.name === 'Velvet Room fan page').length, 0);
  v.update(id, { amount: 3000 });
  assert.equal(store.get(id).amount, 3000, 'the write reached the real row');
  assert.equal(store.get(id).name, 'Velvet Room fan page', 'and left its name alone');
  assert.equal(viewStore(store, aud('client', 'all'), ref).get(id).amount, 2285, 'the next read folds the new revision (its net: 3,000 less 20% less 115)');
  assert.equal(viewStore(store, aud('client', 'Partner'), ref).get(id), null, 'Dana\'s view does not have it at all');
  assert.ok(store.canUndo); store.undo(); assert.equal(store.get(id).amount, 2975);
  // With nothing to fold the view store is the store.
  assert.equal(viewStore(store, aud('coach', 'all'), ref), store);
});

test('the app\'s context reads the household as the viewer sees it; the shared one as anything shared sees it', () => {
  const store = new Store(persona());
  let clientView = false;
  const ctx = createCtx({ store, ref, now: () => now, viewer: () => ({ clientView }) });
  const names = c => c.visible(() => true).filter(r => !r.folded).map(r => r.name);
  assert.ok(names(ctx).includes('Discreet PO box'));
  const before = keyNumbers(ctx.metrics());
  clientView = true;
  assert.ok(!names(ctx).includes('Discreet PO box'), 'Client view: the coach-only line is not listed');
  assert.deepEqual(keyNumbers(ctx.metrics()), before, 'and the totals are the same');
  clientView = false;
  const s = shareCtx(ctx);
  assert.deepEqual(names(s).filter(n => [...REMY, ...DANA, ...COACH].some(x => n.includes(x))), []);
  assert.deepEqual(keyNumbers(s.metrics()), before);
  assert.deepEqual(leaks(s.metrics().inputs, [...REMY, ...DANA, ...COACH]), [], 'every Show the math text on a shared page');
});
