// SPDX-License-Identifier: AGPL-3.0-only
// Test Drive (js/testdrive.js): every made-up person plays their whole script through the journey's own save
// functions, headless. A script fails the run when an answer is not saved, a level it should finish stays open, a
// number differs from the arithmetic by hand, or the app's answer moved since the script was signed off
// (fixtures/testdrive-pins.json: after agreeing with a change, node tools/testdrive/pin.mjs). The coverage test at the
// bottom fails when a level, a skip, the between-jobs path or a none button has no script that reaches it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PERSONAS, runPersona, stepBeforeLevel, applyStep, numbersNow, whereOf, whyOf, checkpointOf, issuesCsv, fixPrompt, ISSUE_COLUMNS, REASONS, SEVERITIES, WATCH } from '../js/testdrive.js';
import { LEVELS, levelsOf } from '../js/sharpen.js';
import { QUESTIONS, STAGES } from '../js/journey.js';
import { mathById } from '../js/registry/math.js';

const read = f => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url)));
const ref = read('reference-2026.json'), priors = read('priors-2026.json'), flags = read('flags.json');
const pins = JSON.parse(readFileSync(new URL('../fixtures/testdrive-pins.json', import.meta.url)));
// What the scripts turned up in the journey itself. Each stays a todo (visible, not stopping the run) until it is decided.
//   TD-1  Tapping "No debt" when no debt is already on file adds three empty debt rows (Credit cards, Student loans,
//         Other debts, each at $0). Nothing a person sees changes, but the file grows on every tap.
const FOUND = { 'young-roth': 'TD-1: a second "No debt" tap adds three empty debt rows', 'not-sure': 'TD-1: a second "No debt" tap adds three empty debt rows' };
const runs = Object.fromEntries(PERSONAS.map(p => [p.id, runPersona(p, ref, priors, { flags, pins })]));

test('eight made-up people, each one says so, in plain words with no em dash', () => {
  assert.equal(PERSONAS.length, 8);
  assert.equal(new Set(PERSONAS.map(p => p.id)).size, 8);
  for (const p of PERSONAS) {
    assert.match(p.about, /^Made up\./, `${p.id} says it is made up`);
    assert.ok(p.name && p.short && p.steps.length >= 8, p.id);
    assert.equal(p.steps[0].kind, 'profile', `${p.id} starts from an age`);
    assert.doesNotMatch(JSON.stringify(p), /\u2014/);
  }
});

for (const p of PERSONAS) {
  const r = runs[p.id];
  test(`${p.id}: every answer is saved, and every step says what happened, what moved and why`, () => {
    assert.equal(r.trail.length, p.steps.length);
    for (const t of r.trail) {
      assert.equal(t.saved, true, `step ${t.i + 1} (${t.step.kind} ${t.step.key ?? t.step.id ?? ''}) was saved`);
      assert.ok(t.what && !/undefined|NaN/.test(t.what), `step ${t.i + 1} says what was entered`);
      assert.ok(t.why.plain, `step ${t.i + 1} says why`);
      for (const rule of t.why.rules) assert.ok(mathById(rule.id), `${rule.id} is in the math registry`);
      assert.doesNotMatch(`${t.what} ${t.why.plain}`, /\u2014/);
      assert.ok(t.numbers, `step ${t.i + 1} has a plan`);
      assert.ok(t.level >= 1, `step ${t.i + 1} belongs to a level`);
      const w = whereOf(t.step);
      assert.ok(STAGES.some(s => s.id === w.stage) && w.anchor, `step ${t.i + 1} has a screen to show on`);
    }
    assert.ok(r.trail[0].changes.length === WATCH.length, 'the first step lists every watched number');
    assert.ok(r.trail.slice(1).some(t => t.changes.length), 'later steps move something');
  });
  test(`${p.id}: the levels end where the script says`, () => {
    assert.equal(r.progress.done, true, 'the five questions are answered');
    assert.deepEqual(r.open, p.leavesOpen ?? [], 'open levels');
  });
  test(`${p.id}: the numbers match the arithmetic by hand`, () => {
    const hand = r.trail.flatMap(t => t.checks.filter(c => c.kind === 'hand').map(c => ({ ...c, at: t.i + 1 })));
    assert.ok(hand.length >= 4, 'checked after the five questions and at the end');
    for (const c of hand) assert.ok(c.ok, `${c.label} after step ${c.at}: by hand ${c.expected} (${c.note}), the app says ${c.got}`);
  });
  test(`${p.id}: the app says what it said when the script was signed off`, () => {
    const pinned = r.trail.flatMap(t => t.checks.filter(c => c.kind === 'pin').map(c => ({ ...c, at: checkpointOf(p, t.i) })));
    assert.equal(pinned.length, 4, 'two pins at each checkpoint');
    for (const c of pinned) assert.ok(c.ok, `${c.label} at ${c.at}: signed off as ${c.expected}, now ${c.got}. If the change is right: node tools/testdrive/pin.mjs`);
  });
  test(`${p.id}: playing the script a second time changes nothing (rows are edited, never added twice)`, { todo: FOUND[p.id] ?? false }, () => {
    const before = numbersNow(r.store.doc, ref, priors, { flags }), rows = r.store.doc.records.length;
    for (const s of p.steps) applyStep(r.store, s, ref);
    assert.equal(r.store.doc.records.length, rows);
    const again = numbersNow(r.store.doc, ref, priors, { flags });
    for (const [k] of WATCH) assert.equal(again[k], before[k], k);
  });
  test(`${p.id}: Jump to a level lands with that level waiting and everything before it answered`, () => {
    const count = r.levels.length + 1;
    for (let n = 2; n <= count; n++) {
      const at = stepBeforeLevel(p, n, ref), part = runPersona(p, ref, priors, { flags, upTo: at });
      const L = levelsOf(part.store.doc), target = L.find(l => l.n === n);
      for (const l of L.filter(x => x.n < n)) assert.ok(l.state !== 'open' || (p.leavesOpen ?? []).includes(l.id), `level ${l.n} is answered before level ${n}`);
      if (target && !(p.leavesOpen ?? []).includes(target.id) && target.state !== 'skip' && p.steps.some(s => s.kind === 'level' && s.id === target.id)) assert.equal(target.state, 'open', `level ${n} is waiting`);
    }
    assert.equal(stepBeforeLevel(p, 1, ref), -1);
  });
}

test('coverage: every level, every skip, the between-jobs path and every none button has a script that reaches it', () => {
  const all = PERSONAS.flatMap(p => p.steps);
  for (const L of LEVELS) assert.ok(all.some(s => s.kind === 'level' && s.id === L.id), `no script answers the "${L.title}" level`);
  for (const L of LEVELS) assert.ok(Object.values(runs).some(r => r.levels.some(l => l.id === L.id && l.state === 'done')), `no script finishes the "${L.title}" level`);
  const skipped = new Set(Object.values(runs).flatMap(r => r.levels.filter(l => l.state === 'skip').map(l => l.id)));
  for (const id of ['owe', 'accounts']) assert.ok(skipped.has(id), `no script skips ${id}`);
  assert.ok(all.some(s => s.kind === 'situation' && s.id === 'between') && all.some(s => s.kind === 'benefit'), 'no script is between jobs');
  for (const q of QUESTIONS) assert.ok(all.some(s => s.kind === 'answer' && s.key === q.key && !s.none), `no script answers ${q.key} with a number`);
  for (const key of ['card', 'cash', 'invested']) assert.ok(all.some(s => s.kind === 'answer' && s.key === key && s.none), `no script taps the none button on ${key}`);
  assert.ok(PERSONAS.some(p => p.leavesOpen?.length), 'no script stops partway');
  const owe = all.filter(s => s.kind === 'level' && s.id === 'owe');
  assert.ok(owe.some(s => s.values['count:Credit card'] >= 3) && owe.some(s => Object.entries(s.values).some(([k, val]) => k.startsWith('promo:') && val > 0)), 'no script has several cards with a 0% offer');
  assert.ok(all.some(s => s.kind === 'level' && s.id === 'own' && s.values.housing === 'Own') && all.some(s => s.kind === 'level' && s.id === 'own' && s.values.carLoanBalance > 0), 'no script owns a home or has a car loan');
  for (const k of new Set(all.map(s => (s.kind === 'answer' ? `answer:${s.key}` : s.kind === 'level' ? `level:${s.id}` : s.kind)))) { const [kind, id] = k.split(':'); assert.ok(whyOf({ kind, key: id, id }).plain, `no why for ${k}`); }
});

test('the issue list exports as a spreadsheet and as one fix prompt of what breaks the task', () => {
  const issue = (severity, reason, note) => ({ when: '2026-11-15T12:00:00Z', severity, reason, persona: 'Dana (deep-debt)', level: 3, step: '8 of 14', screen: '#/sharpen', what: 'What your debt costs: 14 answers saved.', changed: 'Debt free: 2028 to 2031 to Jan 2028', checks: '', width: 390, note });
  const list = [issue(SEVERITIES[2], REASONS[2], 'chip wraps'), issue(SEVERITIES[0], REASONS[0], 'payoff date, "wrong"'), issue(SEVERITIES[1], REASONS[1], '')];
  const csv = issuesCsv(list).split('\n');
  assert.equal(csv[0], ISSUE_COLUMNS.join(','));
  assert.equal(csv.length, 4);
  assert.match(csv[2], /"payoff date, ""wrong"""/);
  const prompt = fixPrompt(list);
  assert.match(prompt, /^SLAM: fixes from a Test Drive walk/);
  assert.match(prompt, /1\. \[Number looks off\] Dana \(deep-debt\), level 3, step 8 of 14/);
  assert.doesNotMatch(prompt, /chip wraps|\u2014/);
  assert.equal(fixPrompt(list.slice(2)), '', 'nothing that breaks the task, no prompt');
});
