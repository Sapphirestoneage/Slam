// SPDX-License-Identifier: AGPL-3.0-only
// Batch 26: the library's first slice (js/math/library.js, M9K). Three skills to learn and one to unlearn at every FOO
// step; the picks for Maya at step 3; Alexis's picks ordered by her KOGS tilt; the app skills that tick themselves
// from a persona's data (Tom's full match); the one-tap Done kept in the client file; the unlearn list's shape; and
// the two small fixes (QUESTIONS 273 and 280). Batch 36: behind the Phase 4 switch (QUESTIONS 307), the sleep-at-night
// number and the rerank tick themselves (QUESTIONS 310), SLAM's rule beside a skill that disagrees with it (QUESTIONS 313).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFile, Store, newHousehold } from '../js/records.js';
import { AREAS } from '../js/registry/fields.js';
import { foo } from '../js/math/foo.js';
import * as Lb from '../js/math/library.js';
import { PROOF_FACTS, UNMAPPED, WORDS, TWINS } from '../js/registry/library.js';
import { ORDER } from '../js/registry/foo.js';
import { RULES, STABILITY_MULTIPLIER, bigEMonthsOf } from '../js/registry/assumptions.js';
import { MATH } from '../js/registry/math.js';
import { recurringBills } from '../js/month.js';
import { libraryFrom } from '../js/library.js';
import { defaultYears, askOf } from '../js/math/afford.js';

const root = new URL('../', import.meta.url);
const read = p => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const ref = read('data/reference-2026.json');
const now = new Date('2026-11-05T12:00:00.000Z'); // the personas' moment (tools/personas/build.mjs)
const lib = libraryFrom(read('data/library/skills.json'), read('data/library/app-skills.json'), read('data/library/unlearn.json'), read('data/library/slam-rules.json'));
const slamFile = read('data/library/slam-rules.json');
const unlearnFile = read('data/library/unlearn.json');
const persona = id => importFile(readFileSync(new URL(`fixtures/personas/${id}.json`, root), 'utf8'));
const L = (doc, opts = {}) => Lb.libraryOf(doc, ref, lib, { now, ...opts });
const names = B => B.learn.map(x => x.skill.name);
const AREAS_FIELD = key => AREAS.find(a => a.id === 'profile').fields.find(f => f.key === key);

test('the unlearn list: SLAM\'s own, at least one per FOO step, never shown at a step where it fits', () => {
  assert.match(unlearnFile.author, /^SLAM/);
  assert.equal(unlearnFile.entries.length, unlearnFile.counts.entries);
  assert.equal(new Set(unlearnFile.entries.map(e => e.id)).size, unlearnFile.entries.length, 'ids are unique');
  for (const step of ORDER) assert.ok(unlearnFile.entries.some(e => e.showAt.includes(step)), `step ${step} has something to unlearn`);
  for (const e of unlearnFile.entries) {
    assert.ok(e.advice && e.line && e.rightWords && e.rightAt.length && e.showAt.length, `${e.id}: advice, line, the stage it fits`);
    for (const s of [...e.rightAt, ...e.showAt]) assert.ok(ORDER.includes(s), `${e.id}: ${s} is a FOO step`);
    assert.deepEqual(e.showAt.filter(s => e.rightAt.includes(s)), [], `${e.id}: never shown where it fits`);
    const st = Lb.unlearnFor(e.showAt[0], [e]).status;
    assert.ok(['notYet', 'past'].includes(st), `${e.id}: fits wholly before or wholly after where it shows`);
  }
  const words = readFileSync(new URL('data/library/unlearn.json', root), 'utf8') + readFileSync(new URL('js/registry/library.js', root), 'utf8') + readFileSync(new URL('js/math/library.js', root), 'utf8') + readFileSync(new URL('js/ui/library-ui.js', root), 'utf8');
  assert.ok(!words.includes(String.fromCharCode(0x2014)), 'no em dash');
  for (const w of [/\bwrong\b/i, /\bbad\b/i, /\bfail(ed|ing)?\b/i, /\bmistake\b/i]) assert.ok(!w.test(words), `no ${w}`);
  assert.equal(Lb.unlearnFor('3', lib.unlearn).id, 'die-with-zero', 'Die With Zero waits while a card is carried');
  assert.equal(Lb.unlearnFor('3', lib.unlearn).status, 'notYet');
  assert.equal(Lb.unlearnFor('3', lib.unlearn).fitsAt, '9');
  assert.equal(Lb.unlearnFor('9', lib.unlearn).id, 'frugal-is-freedom', 'Mr. Money Mustache with the number banked');
  assert.equal(Lb.unlearnFor('9', lib.unlearn).status, 'past');
});

test('picks per step: three to learn and one to unlearn at every FOO step (Maya, an employed household)', () => {
  const M = L(persona('maya'));
  for (const step of ORDER) {
    const B = M.steps[step];
    assert.equal(B.learn.length, RULES.learnShown, `step ${step}: three to learn`);
    assert.ok(B.unlearn, `step ${step}: one to unlearn`);
    assert.ok(B.learn.every(x => String(x.skill.tags.foo) === step), `step ${step}: only skills tagged to it`);
    assert.ok(B.learn.every(x => !x.done), `step ${step}: done skills are not among the three`);
  }
});

test('Maya at step 3: the three by band and leverage (no tilt), one unlearn, nothing ticked by a guessed APR', () => {
  const doc = persona('maya');
  const M = L(doc);
  assert.equal(M.here, '3');
  const B = M.steps['3'];
  assert.equal(B.tilted, false);
  assert.deepEqual(names(B), ['Pay in full, always', 'Triage by rate', 'Name every debt and its rate']);
  assert.equal(B.learn[2].self, true, 'Name every debt and its rate ticks itself once the APR is real');
  assert.equal(M.facts.totalDebt, false, 'the card APR is a guess (Not sure)');
  assert.equal(B.unlearn.id, 'die-with-zero');
  assert.equal(M.next.skill.name, 'Pay in full, always', 'Home: Learn next');
  // With the APR typed, Name every debt ticks itself and the next rung comes in.
  const card = doc.records.find(r => r.kind === 'debt');
  card.fieldStatus = {}; card.values.apr = 0.25;
  const M2 = L(doc);
  assert.equal(M2.facts.totalDebt, true);
  assert.ok(M2.steps['3'].done.some(x => x.skill.id === 'name-your-debt' && x.by === 'data'));
  assert.ok(!names(M2.steps['3']).includes('Name every debt and its rate'));
});

test('Alexis: her picks follow her KOGS tilt (deals, then cash, then the next trees), not the level order', () => {
  const doc = persona('alexis');
  const tilt = doc.profile.identity.tilt;
  assert.deepEqual(tilt.slice(0, 3), ['deals-smart-buying', 'cash-safety-net', 'main-path'], 'KOGS: the Homesteader\'s three trees');
  const A = L(doc);
  const step = A.here;
  const B = A.steps[step];
  assert.equal(B.tilted, true);
  const ranks = B.learn.map(x => tilt.indexOf(Lb.tiltTree(x.skill)));
  assert.deepEqual([...ranks].sort((a, b) => a - b), ranks, 'in tilt order');
  assert.equal(Lb.tiltTree(B.learn[0].skill), 'deals-smart-buying', 'her first tree leads');
  // The same household with no letters reads by level instead.
  const plain = structuredClone(doc); delete plain.profile.identity;
  const P = L(plain).steps[step];
  assert.equal(P.tilted, false);
  assert.notDeepEqual(names(P), names(B), 'the tilt changes the picks');
  const LEV = { S: 0, A: 1, B: 2, C: 3 };
  assert.ok(P.learn.every((x, i, a) => i === 0 || (LEV[a[i - 1].skill.leverage] ?? 2) <= (LEV[x.skill.leverage] ?? 2)), 'no tilt: by band, then leverage');
  assert.equal(new Set(B.learn.map(x => Lb.tiltTree(x.skill))).size, 3, 'with a tilt: three different trees');
});

test('self-leveling from a persona: Tom has the full match, so Capture the full match ticks itself', () => {
  const tom = persona('tom');
  const T = L(tom);
  assert.equal(T.facts.capturingFullMatch, true, 'Tom puts in 10% against a 50% match up to 6%');
  const s2 = T.steps['2'];
  const match = s2.done.find(x => x.skill.id === 'capture-the-match');
  assert.ok(match, 'in the done list');
  assert.equal(match.by, 'data');
  assert.ok(!names(s2).includes('Capture the full match'));
  // Maya has no match on file: not ticked, and it stays one of the three.
  const M = L(persona('maya'));
  assert.equal(M.facts.capturingFullMatch, false);
  assert.ok(names(M.steps['2']).includes('Capture the full match'));
  // Tom putting in only 2%: the match is left on the table and it is back among the three.
  const low = structuredClone(tom); low.records.find(r => r.kind === 'income' && r.type === 'Job').values.contributionPct = 0.02;
  assert.equal(foo(low, ref, { now }).steps.find(s => s.id === '2').done, false);
  assert.equal(L(low).facts.capturingFullMatch, false);
  // Tom's other facts: income, filing status unknown, a retire age (FI age 50).
  assert.equal(T.facts.grossAnnualIncome, true);
  assert.equal(T.facts.retireAge, true);
});

test('twins: an app skill stands in for the same skill in the 625 and borrows its words', () => {
  const B = L(persona('maya')).steps['2'];
  const all = [...B.learn, ...B.done].map(x => x.skill);
  const cap = all.find(s => s.id === 'capture-the-match');
  assert.equal(cap.twin, 'main-path-capture-the-full-401-k-match');
  assert.ok(cap.description && cap.leverage === 'S', 'the twin\'s words and tier');
  assert.ok(!all.some(s => s.id === 'main-path-capture-the-full-401-k-match'), 'never shown twice');
  const one = L(persona('maya')).steps['1'];
  assert.ok(![...one.learn, ...one.done].some(x => x.skill.id === 'cash-safety-net-build-the-1k-shield'), 'Hold a starter fund stands in for Build the $1K shield');
});

test('every proof field in the app skills is mapped to a SLAM fact or listed with why', () => {
  const fields = lib.appSkills.map(Lb.proofField).filter(Boolean);
  assert.equal(new Set(fields).size, 12);
  for (const k of fields) assert.ok(PROOF_FACTS[k] || UNMAPPED[k], `${k}: mapped or listed`);
  assert.deepEqual(Object.keys(PROOF_FACTS).sort(), Lb.mappedFields().sort(), 'every mapped field has a reading');
  assert.deepEqual(Object.keys(UNMAPPED), [], 'batch 36: every proof field has a SLAM fact');
  const swan = lib.appSkills.find(s => s.id === 'know-your-number');
  assert.equal(Lb.doneOf(swan, { facts: {} }).self, true, 'the sleep-at-night number ticks itself now');
});

test('QUESTIONS 310: the sleep-at-night number on Cash layers ticks Know your sleep-at-night number (Maya)', () => {
  const store = new Store(persona('maya'), { now: () => now.toISOString() });
  const step1 = () => L(store.doc).steps['1'];
  const swan = lib.appSkills.find(s => s.id === 'know-your-number');
  assert.equal(L(store.doc).facts.swanTarget, false, 'blank: not yet');
  assert.ok(!step1().done.some(x => x.skill.id === 'know-your-number'), 'not done yet');
  assert.deepEqual(Lb.doneOf(swan, { facts: L(store.doc).facts }), { done: false, by: null, field: 'swanTarget', self: true }, 'Ticks itself, not a Done button');
  store.setDoc('profile', { sleepAtNight: 8000 });
  assert.equal(L(store.doc).facts.swanTarget, true);
  const x = step1().done.find(d => d.skill.id === 'know-your-number');
  assert.ok(x && x.by === 'data', 'in the done list, ticked by the data');
  store.setDoc('profile', { sleepAtNight: 0 });
  assert.equal(L(store.doc).facts.swanTarget, true, 'a typed 0 is an answer');
  store.setDoc('profile', { sleepAtNight: null });
  assert.equal(L(store.doc).facts.swanTarget, false, 'cleared: not yet');
  assert.equal(AREAS_FIELD('sleepAtNight')?.type, 'money', 'registered as a money field on the Profile tab');
});

test('QUESTIONS 310: Rerank your costs ticks itself once every repeating charge that can be cut has Keep or Try to cut', () => {
  const store = new Store(persona('maya'), { now: () => now.toISOString() });
  const cut = () => recurringBills(store.doc, ref, now).items.filter(i => i.cut);
  assert.ok(cut().length > 0, 'Maya has repeating charges');
  assert.equal(L(store.doc).facts.rerankCut, false);
  const [first, ...rest] = cut();
  store.update(first.id, { decision: 'Cancel' });
  assert.equal(L(store.doc).facts.rerankCut, rest.length === 0, 'one answered is not the whole pass');
  for (const i of rest) store.update(i.id, { decision: 'Keep' });
  assert.equal(L(store.doc).facts.rerankCut, true);
  assert.ok(L(store.doc).steps['1'].done.some(x => x.skill.id === 'rerank-your-costs' && x.by === 'data'));
});

test('QUESTIONS 307: the library sits behind the Phase 4 switch (on for new households and the personas)', () => {
  const doc = persona('maya');
  assert.equal(Lb.libraryOn(doc), true, 'the personas are new households: on');
  assert.equal(Lb.libraryOn(newHousehold()), true, 'on for a new household');
  assert.ok(L(doc));
  doc.settings.phase4 = false;
  assert.equal(Lb.libraryOn(doc), false);
  assert.equal(L(doc), null, 'off: no Learn and unlearn, no Learn next');
  const ui = readFileSync(new URL('js/ui/library-ui.js', root), 'utf8');
  assert.match(ui, /if \(!libraryOn\(ctx\.store\.doc\)\) return null;/, 'the screens ask the switch before loading the files');
});

test('QUESTIONS 313: SLAM\'s rule beside a skill that disagrees with it; every override is a real skill that shows', () => {
  const rules = slamFile.rules;
  assert.equal(Object.keys(rules).length, slamFile.counts.rules);
  const shown = Lb.mergeTwins(lib.skills, lib.appSkills);
  const twins = new Set(Object.values(TWINS));
  for (const [id, r] of Object.entries(rules)) {
    const s = [...lib.skills, ...lib.appSkills].find(x => x.id === id);
    assert.ok(s, `${id}: a real skill`);
    assert.ok(!twins.has(id) || shown.some(x => x.twin === id), `${id}: shows on a card (directly or through its stand-in)`);
    assert.match(r.line, /^SLAM: \S/, `${id}: one line that starts SLAM:`);
    assert.ok(!r.line.includes(String.fromCharCode(0x2014)) && !/\n/.test(r.line), `${id}: no em dash, one line`);
    assert.ok(r.rests.length, `${id}: names the rules it rests on`);
    for (const k of r.rests) {
      const ok = k.startsWith('RULES.') ? k.slice(6) in RULES : k.startsWith('FOO ') ? ORDER.includes(k.slice(4)) : k === 'STABILITY_MULTIPLIER' ? !!STABILITY_MULTIPLIER : k === 'bigEMonthsOf' ? typeof bigEMonthsOf === 'function' : MATH.some(m => m.id === k);
      assert.ok(ok, `${id}: ${k} is registered`);
    }
    if (r.rests.includes('RULES.heavyApr')) assert.ok(r.line.includes(`${RULES.heavyApr * 100}%`), `${id}: the heavy line as registered`);
    if (r.rests.includes('bigEMonthsOf')) assert.equal(bigEMonthsOf(50), 10, 'age / 5');
    if (r.rests.includes('STABILITY_MULTIPLIER')) for (const v of Object.values(STABILITY_MULTIPLIER).filter(v => v !== 1)) assert.ok(r.line.includes(String(v)), `${id}: ${v}`);
    if (r.rests.includes('RULES.bufferWeeks')) assert.equal(RULES.bufferWeeks, 2, `${id} says two weeks`);
    assert.ok(s.description && s.description.includes(r.says), `${id}: says quotes the skill's own words, unchanged`);
  }
  // On the cards: Maya's step 3 and step 4, Alexis's step 4.
  const M = L(persona('maya'));
  const tri = M.steps['3'].learn.find(x => x.skill.id === 'debt-leverage-triage-by-rate');
  assert.equal(tri.slam, rules['debt-leverage-triage-by-rate'].line);
  assert.equal(M.steps['4'].learn.find(x => x.skill.id === 'cash-safety-net-fund-the-true-emergency-fund').slam, 'SLAM: age / 5 months of spending, the Rule of 5');
  assert.equal(M.steps['3'].learn.find(x => x.skill.id === 'credit-cards-pay-in-full-always').slam, null, 'no rule, no line');
  assert.equal(Lb.slamRuleOf({ id: 'x', twin: 'cash-safety-net-tier-every-dollar' }, rules), rules['cash-safety-net-tier-every-dollar'].line, 'a stand-in takes its twin\'s line');
  // The skill files keep their words.
  assert.equal(lib.skills.find(x => x.id === 'cash-safety-net-fund-the-true-emergency-fund').description, '3-6 months of expenses');
});

test('the one-tap Done: kept in the client file, out of the three, one undo step', () => {
  const store = new Store(persona('maya'), { now: () => now.toISOString() });
  const first = L(store.doc).steps['3'].learn[0].skill;
  Lb.setSkillDone(store, first.id, true, { now });
  assert.deepEqual(store.doc.profile.library[first.id], { done: true, by: 'coach', on: '2026-11-05' });
  const B = L(store.doc).steps['3'];
  assert.ok(B.done.some(x => x.skill.id === first.id && x.by === 'coach'));
  assert.ok(!B.learn.some(x => x.skill.id === first.id));
  assert.equal(B.learn.length, 3, 'the next one comes in');
  store.undo();
  assert.equal(store.doc.profile.library?.[first.id], undefined);
  Lb.setSkillDone(store, first.id, true, { now });
  Lb.setSkillDone(store, first.id, false, { now });
  assert.equal(store.doc.profile.library[first.id], undefined, 'Not done yet takes it back');
  assert.ok(WORDS.credit.includes('Jonathan Mendonsa'));
});

test('an app skill that only fits a job is left out for the self-employed', () => {
  const doc = persona('maya'); doc.profile.workSituation = 'Self-employed';
  assert.ok(!L(doc).steps['2'].learn.concat(L(doc).steps['2'].done).some(x => x.skill.id === 'capture-the-match'));
});

test('QUESTIONS 273: a car payment starts at 5 years, other monthly costs For good', () => {
  assert.equal(RULES.carPaymentYears, 5);
  assert.equal(defaultYears('A car payment'), 5);
  for (const n of ['A gym', 'Childcare', 'A subscription', 'A monthly cost']) assert.equal(defaultYears(n), null, n);
  assert.equal(askOf({ kind: 'monthly', amount: 400, name: 'A car payment', years: defaultYears('A car payment') }, now).years, 5);
});

test('QUESTIONS 280: the 14 cards not rechecked are flagged in the library and the screen says so in coach view only', () => {
  const cards = read('data/library/cards.json').cards.filter(c => c.verified === 'unverified');
  assert.equal(cards.length, 14);
  const ui = readFileSync(new URL('js/ui/cards-ui.js', root), 'utf8');
  assert.match(ui, /'not rechecked yet'/);
  assert.match(ui, /span\.tag\.plain\.coach-only\.recheck-tag/);
  assert.match(ui, /clientView\(\) \? lib\.cards\.filter\(c => !unchecked\(c\)\)/, 'out of the client view search');
});
