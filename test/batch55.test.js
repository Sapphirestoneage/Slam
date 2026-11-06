// Batch 55: the money-control map (js/math/control.js, js/privacy.js) and two Fire drill smalls (QUESTIONS 400, 402).
// Hand-worked: each expectation says why, and the persona maps are in each def's control block.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { importFile, migrate } from '../js/records.js';
import { metrics, keyNumbers } from '../js/math/metrics.js';
import { foo } from '../js/math/foo.js';
import { layersOf } from '../js/math/layers.js';
import { fireDrillOf, onlineWordsOf, likelyOtherOf, BANK_TYPES } from '../js/math/firedrill.js';
import { householdFromInputs } from '../js/demo.js';
import { setPriorsData } from '../js/priorslib.js';
import { controlMap, controlRow, peopleOf, CONTROL_KEYS } from '../js/math/control.js';
import { foldDoc, controlSeen, sharedBackup, shareDoc } from '../js/privacy.js';
import { AREAS } from '../js/registry/fields.js';
import { search } from '../js/nav.js';
import { loadDefs, OUT_DIR, NOW } from '../tools/personas/build.mjs';

const root = new URL('../', import.meta.url);
const ref = JSON.parse(readFileSync(new URL('data/reference-2026.json', root)));
setPriorsData(JSON.parse(readFileSync(new URL('data/priors-2026.json', root))));
const now = new Date(NOW);
const open = id => importFile(readFileSync(join(OUT_DIR, `${id}.json`), 'utf8'));

// ---------- QUESTIONS 400: the savings type split, no number moves ----------
// fixtures/savings-split-before.json holds what every persona and the Demo gave on main before the split (the code of
// 59ed122, every savings row typed "Savings or HYSA"). The same files now, and each file written back with the old type
// and opened through Import (the migration), give the very same numbers.
function numbersOf(doc) {
  const out = {};
  for (const p of [null, 'Me', 'Partner']) out[p ?? 'all'] = keyNumbers(metrics(doc, ref, { now, person: p }));
  const D = fireDrillOf(doc, ref, { now });
  out.drill = { days: D.cover?.cash ?? null, withCard: D.cover?.withCard ?? null, out: D.unreachable?.total ?? null, reach: D.reachable?.cash ?? null, elsewhere: D.readings?.elsewhere?.days ?? null, accounts: D.accounts.length };
  out.foo = foo(doc, ref, { now }).here;
  out.little = layersOf(doc, ref, now).littleFull ?? null;
  return out;
}
const before = JSON.parse(readFileSync(new URL('fixtures/savings-split-before.json', root)));
test('QUESTIONS 400: every persona and the Demo give the same numbers after the savings type split', () => {
  const ids = readdirSync(OUT_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).sort();
  assert.deepEqual(ids, Object.keys(before).filter(k => k !== 'demo').sort());
  for (const id of ids) {
    const text = readFileSync(join(OUT_DIR, `${id}.json`), 'utf8');
    const old = importFile(text.replaceAll('"type": "Savings",', '"type": "Savings or HYSA",'));
    assert.ok(!old.records.some(r => r.type === 'Savings or HYSA'), `${id}: the migration leaves no old type`);
    // The money-control taps (batch 55) are new in two files, and the discreet couple's fan page now lands in the Wise
    // account (the drill reads that); taken off, the files are what they were.
    const strip = d => { for (const r of d.records) { for (const k of CONTROL_KEYS) delete r.values[k]; if (id === 'discreet-couple') delete r.values.landsIn; } return d; };
    assert.deepEqual(numbersOf(strip(old)), before[id], `${id}: a number moved`);
    assert.deepEqual(numbersOf(strip(importFile(text))), before[id], `${id}: a number moved`);
  }
  const demo = householdFromInputs(JSON.parse(readFileSync(new URL('fixtures/demo.json', root))).inputs, { now: now.toISOString() });
  assert.ok(demo.records.some(r => r.type === 'Savings'));
  assert.deepEqual(numbersOf(demo), before.demo);
});
test('QUESTIONS 400: the two savings types, and the second starts on Another bank like an online bank\'s name', () => {
  assert.deepEqual(AREAS.find(a => a.id === 'assets').types.account.slice(0, 3), ['Checking', 'Savings', 'High-yield savings (often online)']);
  assert.ok(BANK_TYPES.includes('Savings') && BANK_TYPES.includes('High-yield savings (often online)'));
  assert.deepEqual(ref.lists.cashTypes.slice(0, 3), ['Checking', 'Savings', 'High-yield savings (often online)']);
  const migrated = migrate({ records: [{ id: 'a', kind: 'account', type: 'Savings or HYSA', values: { group: 'cash', balance: 10 } }] });
  assert.equal(migrated.records[0].type, 'Savings');
  const { words, generic } = ref.fireDrill.onlineBanks;
  assert.deepEqual(onlineWordsOf({ name: 'Savings', type: 'Savings' }, words), []); // plain Savings: most keep it where checking is (QUESTIONS 367)
  assert.deepEqual(onlineWordsOf({ name: 'Emergency fund', type: 'High-yield savings (often online)' }, words), ['high-yield', 'online']);
  assert.equal(likelyOtherOf({ id: 'c', name: 'Checking', type: 'Checking' }, { id: 's', name: 'Emergency fund', type: 'High-yield savings (often online)' }, words, generic), true);
  // Maya with her savings typed High-yield: the drill's tap starts on Another bank, and it still counts as not answered.
  const doc = open('maya');
  doc.records.find(r => r.type === 'Savings').type = 'High-yield savings (often online)';
  const D = fireDrillOf(doc, ref, { now });
  const s = D.pending.find(p => p.kind === 'account');
  assert.equal(s.likely, 'other');
  assert.equal(s.answer, null);
  assert.equal(D.cover.cash, 0); // read at this bank until tapped, so the two readings stand: 0 and 33 days
  assert.equal(D.readings.elsewhere.days, 33);
});

// ---------- The money-control map ----------
test('peopleOf: one accessor for the household\'s adults', () => {
  assert.deepEqual(peopleOf(open('maya')).map(p => p.id), ['Me']);
  assert.deepEqual(peopleOf(open('couple-separate')).map(p => [p.id, p.name]), [['Me', 'Jordan'], ['Partner', 'Sam']]);
});

const defs = (await loadDefs()).filter(d => d.control);
test('three personas carry what the money-control map should say', () => { assert.deepEqual(defs.map(d => d.id).sort(), ['couple-separate', 'discreet-couple', 'maya']); });
for (const def of defs) {
  test(`persona ${def.id}: the money-control map matches the hand-worked rows, lines and checklist`, () => {
    const M = controlMap(open(def.id));
    const e = def.control;
    assert.deepEqual(M.rows.map(r => r.name), e.rows);
    assert.deepEqual(Object.fromEntries(M.lines.map(r => [r.name, r.line])), e.lines);
    for (const [name, cols] of Object.entries(e.cols || {})) {
      const r = M.rows.find(x => x.name === name);
      for (const [k, list] of Object.entries(cols)) assert.deepEqual(r[k] ? r[k].list : null, list, `${def.id} ${name} ${k}`);
    }
    assert.deepEqual(M.checklist.items.map(i => [i.id, i.state, i.from]), e.checklist);
    assert.equal(M.answered, e.answered);
  });
}

test('a row answered by taps reads the answer, and an owner the statements and the login leave out does not see it', () => {
  const doc = { profile: { mode: 'Married separate', firstName: 'A', partnerName: 'B' }, client: {}, records: [] };
  const r = { id: 'x', kind: 'account', type: 'Checking', owner: 'Joint', name: 'Joint checking', values: { group: 'cash', balance: 900, ctlLogin: 'Partner', ctlMail: 'Partner' } };
  doc.records.push(r);
  // Joint: both own it. B has the login and the statements, so A does not see it, and B can move it: the task's line.
  let row = controlRow(doc, r);
  assert.deepEqual(row.sees.list, ['Partner']);
  assert.deepEqual(row.moves.list, ['Me', 'Partner']);
  assert.equal(row.line, 'B can move all of this and you cannot see it.');
  // Answered: only B can move it (A was cut off): the line says so.
  r.values.ctlMoves = ['Partner']; r.values.ctlSees = ['Me', 'Partner'];
  row = controlRow(doc, r);
  assert.equal(row.moves.read, false);
  assert.equal(row.line, 'B can move this money and you cannot.');
  // Someone outside the household with the login.
  delete r.values.ctlMoves; delete r.values.ctlSees; r.owner = 'Me'; r.values.ctlLogin = 'Other'; r.values.ctlMail = 'Me';
  assert.equal(controlRow(doc, r).line, 'Someone else can move all of this too.');
  // A paycheck paid to someone else.
  const pay = { id: 'p', kind: 'income', type: 'Platform', owner: 'Me', name: 'Fan page', amount: 900, per: 'month', values: { ctlOn: { Other: 'Payee' } } };
  doc.records.push(pay);
  assert.equal(controlRow(doc, pay).line, 'This is paid to someone else, not to you.');
  // No verdict words, no em dashes, in any line.
  for (const id of ['couple-separate', 'discreet-couple', 'maya']) for (const l of controlMap(open(id)).lines) assert.doesNotMatch(l.line, new RegExp(`${String.fromCharCode(0x2014)}|risk|danger|warning|abuse|bad|unsafe`, 'i'));
});

// ---------- Private by design ----------
const AUD = {
  coach: { who: 'coach', person: 'all', couple: true }, coachMe: { who: 'coach', person: 'Me', couple: true }, partner: { who: 'coach', person: 'Partner', couple: true },
  client: { who: 'client', person: 'all', couple: true }, clientMe: { who: 'client', person: 'Me', couple: true }, clientPartner: { who: 'client', person: 'Partner', couple: true },
  solo: { who: 'client', person: 'all', couple: false }, share: { who: 'share', person: 'all', couple: false },
};
test('who sees the map: the coach (not in the partner\'s view), in Client view only its own client, never a share', () => {
  const seen = Object.fromEntries(Object.entries(AUD).map(([k, a]) => [k, controlSeen(a)]));
  assert.deepEqual(seen, { coach: true, coachMe: true, partner: false, client: false, clientMe: true, clientPartner: false, solo: true, share: false });
});
test('the map never leaks: a partner\'s view, the household in Client view and every share carry no control tap', () => {
  const doc = open('couple-separate');
  const jordan = doc.records.find(r => r.name === "Jordan's checking");
  doc.program = { ...(doc.program || {}), control: { checks: { own: { at: '2026-11-05' } } } };
  doc.history.push({ op: 'set', id: jordan.id, field: 'ctlLogin', from: null, to: 'Partner', at: NOW });
  doc.history.push({ op: 'remove', id: 'gone', kind: 'account', was: { id: 'gone', kind: 'account', values: { ctlMail: 'Partner', balance: 1 } }, at: NOW });
  doc.snapshots.push({ id: 'snap', at: NOW, label: 'Day 0', records: JSON.parse(JSON.stringify(doc.records)) });
  const text = d => JSON.stringify(d);
  const leaks = d => CONTROL_KEYS.filter(k => text(d).includes(`"${k}"`)).concat(d.program?.control ? ['program.control'] : []);
  for (const k of ['partner', 'client', 'clientPartner', 'share']) {
    const f = foldDoc(doc, AUD[k], ref);
    assert.deepEqual(leaks(f), [], `${k}: the map leaked`);
    assert.equal(f.controlHidden, true, k);
    assert.equal(controlMap(f).lines.length, 0, `${k}: no line reads a tap`);
  }
  for (const k of ['coach', 'coachMe', 'clientMe']) assert.ok(leaks(foldDoc(doc, AUD[k], ref)).length > 0, `${k} keeps the map`);
  assert.deepEqual(leaks(sharedBackup(doc, ref)), []);
  assert.deepEqual(leaks(shareDoc(doc, ref)), []);
  // Every number is the same with the map taken out (it moves no number).
  for (const k of ['partner', 'share']) {
    const f = foldDoc(doc, AUD[k], ref);
    assert.deepEqual(keyNumbers(metrics(f, ref, { now, person: AUD[k].person === 'all' ? null : AUD[k].person })), keyNumbers(metrics(doc, ref, { now, person: AUD[k].person === 'all' ? null : AUD[k].person })), k);
  }
});
test('a shared copy folds the snapshots\' copies of private rows too', () => {
  const doc = open('discreet-couple');
  doc.snapshots.push({ id: 'snap', at: NOW, label: 'Day 0', records: JSON.parse(JSON.stringify(doc.records)) });
  const t = JSON.stringify(sharedBackup(doc, ref));
  for (const w of ['Velvet Room', 'Wise payout', '7781', 'Lantern', 'Discreet PO box', 'has not told family']) assert.ok(!t.includes(w), w);
});
test('Find never lands on the map where it does not exist', () => {
  const fields = [];
  const doc = open('couple-separate');
  doc.settings.phase4 = true;
  const hit = d => search('money control', { fields, records: d.records, doc: d, ref }).some(r => r.route === '#/net-worth/money-control');
  assert.equal(hit(doc), true);
  assert.equal(hit(foldDoc(doc, AUD.partner, ref)), false);
  assert.equal(search('money control', { fields, records: [], controlHidden: true }).some(r => r.route === '#/net-worth/money-control'), false);
});
