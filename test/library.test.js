// SPDX-License-Identifier: AGPL-3.0-only
// Batch 17: the skill library (data/library/skills.json) is whole, its ids are unique, every link resolves, its tags
// name real SLAM areas and FOO steps, and every file under data/library/ is registered with a source and a date.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { REFERENCE_FILES } from '../js/registry/assumptions.js';
import { AREAS } from '../js/registry/scorecard.js';
import { ORDER } from '../js/registry/foo.js';

const root = new URL('../', import.meta.url);
const lib = JSON.parse(readFileSync(new URL('data/library/skills.json', root), 'utf8'));
const skills = lib.skills;

test('the library holds all 625 skills: 25 trees of 25 levels, five bands of five levels', () => {
  assert.equal(skills.length, 625);
  assert.equal(lib.counts.skills, 625);
  assert.equal(lib.trees.length, 25);
  for (const t of lib.trees) {
    const own = skills.filter(s => s.tree === t.id).map(s => s.level).sort((a, b) => a - b);
    assert.deepEqual(own, Array.from({ length: 25 }, (_, i) => i + 1), `${t.id}: levels 1 to 25 once each`);
  }
  const bands = lib.bands.map(b => b.id);
  for (const s of skills) assert.equal(s.tier, bands[Math.floor((s.level - 1) / 5)], `${s.id}: level ${s.level} sits in band ${s.tier}`);
});

test('every skill has a unique id, a name, a description, a leverage tier and its source', () => {
  assert.equal(new Set(skills.map(s => s.id)).size, skills.length, 'ids are unique');
  assert.equal(new Set(skills.map(s => `${s.tree} ${s.name}`)).size, skills.length, 'names are unique within a tree');
  for (const s of skills) {
    assert.ok(s.name && s.description && s.proof, `${s.id}: name, description and proof`);
    assert.ok(['S', 'A', 'B', 'C'].includes(s.leverage), `${s.id}: leverage S, A, B or C`);
    assert.equal(s.source, 'data/skill_tree.json');
  }
});

test('prerequisites and lanes resolve, a tree is a ladder, and nothing loops', () => {
  const byId = new Map(skills.map(s => [s.id, s]));
  for (const s of skills) {
    for (const p of [...s.prerequisites, ...s.opensFrom, ...s.opens]) assert.ok(byId.has(p), `${s.id}: ${p} is a skill`);
    if (s.level === 1) assert.deepEqual(s.prerequisites, [], `${s.id}: level 1 needs nothing`);
    else assert.deepEqual(s.prerequisites.map(p => byId.get(p).level), [s.level - 1], `${s.id}: needs the level before`);
    for (const p of s.prerequisites) assert.equal(byId.get(p).tree, s.tree, `${s.id}: a prerequisite is in the same tree`);
    for (const o of s.opens) assert.ok(byId.get(o).opensFrom.includes(s.id), `${s.id} opens ${o}, and ${o} says so`);
  }
  assert.equal(skills.reduce((n, s) => n + s.opens.length, 0), lib.counts.lanes);
  const state = new Map();
  const visit = id => { if (state.get(id) === 'done') return; assert.notEqual(state.get(id), 'open', `a loop through ${id}`); state.set(id, 'open'); byId.get(id).prerequisites.forEach(visit); state.set(id, 'done'); };
  skills.forEach(s => visit(s.id));
});

test('tags name a real Scorecard area and FOO step, and say which rule set them', () => {
  const areas = new Set(AREAS.map(a => a.id));
  for (const s of skills) {
    assert.ok(areas.has(s.tags.area), `${s.id}: area ${s.tags.area}`);
    assert.ok(ORDER.includes(s.tags.foo), `${s.id}: FOO step ${s.tags.foo}`);
    assert.ok(/^(words: |tree )/.test(s.tags.fooBy), `${s.id}: fooBy says the rule`);
    assert.equal(s.tags.kind, 'learn');
  }
  assert.equal(skills.find(s => s.name === 'Capture the full 401(k) match').tags.foo, '2');
  assert.equal(skills.find(s => s.name === 'Build the $1K shield').tags.foo, '1');
});

test('every file in data/library/ is registered with its source and date', () => {
  const files = readdirSync(new URL('data/library/', root)).filter(f => f.endsWith('.json')).map(f => `data/library/${f}`);
  assert.deepEqual(files.sort(), REFERENCE_FILES.map(r => r.file).filter(f => f.startsWith('data/library/')).sort()); // batch 31: data/priors-2026.json is registered here too (test/priors.test.js)
  for (const r of REFERENCE_FILES) {
    const d = JSON.parse(readFileSync(new URL(r.file, root), 'utf8'));
    assert.equal(d.id, r.id);
    assert.ok(r.source && r.label && /^\d{4}-\d{2}-\d{2}$/.test(r.date), `${r.id}: label, source and date`);
    assert.equal(d.asOf, r.date, `${r.id}: the file's asOf is the registered date`);
  }
});

// Batch 24 (QUESTIONS 207): the second set, the older app's own 40 skills, the same shape, tagged by FOO step.
const app = JSON.parse(readFileSync(new URL('data/library/app-skills.json', root), 'utf8'));
test('the app skills: all 40, six trees, the same shape as the 625, credited the same way', () => {
  assert.equal(app.skills.length, 40);
  assert.equal(app.counts.skills, 40);
  assert.deepEqual(app.trees.map(t => t.id).sort(), ['anchor', 'compounder', 'earner', 'keeper', 'ledger', 'planning']);
  assert.equal(app.author, lib.author);
  assert.equal(app.license, lib.license);
  const keys = Object.keys(skills[0]);
  for (const s of app.skills) for (const k of keys) assert.ok(k in s, `${s.id}: has ${k}`);
  const all = [...skills, ...app.skills];
  assert.equal(new Set(all.map(s => s.id)).size, all.length, 'ids are unique across both sets');
  for (const s of app.skills) {
    assert.ok(s.name && s.proof, `${s.id}: name and proof`);
    assert.ok(app.trees.some(t => t.id === s.tree), `${s.id}: its tree`);
    assert.ok(app.bands.some(b => b.id === s.tier), `${s.id}: its band`);
    assert.equal(s.source, 'data/skill_tree.json');
  }
});

test('the app skills: prerequisites resolve within the set and nothing loops', () => {
  const byId = new Map(app.skills.map(s => [s.id, s]));
  for (const s of app.skills) for (const p of s.prerequisites) assert.ok(byId.has(p), `${s.id}: ${p} is an app skill`);
  const state = new Map();
  const visit = id => { if (state.get(id) === 'done') return; assert.notEqual(state.get(id), 'open', `a loop through ${id}`); state.set(id, 'open'); byId.get(id).prerequisites.forEach(visit); state.set(id, 'done'); };
  app.skills.forEach(s => visit(s.id));
});

test('the app skills: tags name a real area and FOO step, read from the gate', () => {
  const areas = new Set(AREAS.map(a => a.id));
  for (const s of app.skills) {
    assert.ok(areas.has(s.tags.area), `${s.id}: area ${s.tags.area}`);
    assert.ok(ORDER.includes(s.tags.foo), `${s.id}: FOO step ${s.tags.foo}`);
    assert.ok(s.tags.gate == null ? /^tree /.test(s.tags.fooBy) : /^gate: older app step \d/.test(s.tags.fooBy), `${s.id}: fooBy says the rule`);
    assert.equal(s.tags.kind, 'do');
  }
  const tag = id => app.skills.find(s => s.id === id).tags;
  assert.deepEqual([tag('capture-the-match').foo, tag('capture-the-match').gate], ['2', 2], 'the match gate is step 2 in both ladders');
  assert.equal(tag('backdoor-roth').foo, '5', 'the older app step 6 (Roth IRA) is SLAM step 5, Max out tax-free accounts');
  assert.equal(tag('starter-fund').foo, '1');
  assert.equal(tag('roth-conversion-ladder').foo, '9');
});
