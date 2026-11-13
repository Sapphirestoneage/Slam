// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_NODES, MAP_TIERS, mapOf } from '../js/map.js';
import { STAGES, QUESTIONS } from '../js/journey.js';

test('the map is one web: every need is a real node above it, and every node leads somewhere real', () => {
  const ids = MAP_NODES.map(n => n.id), tiers = MAP_TIERS.map(t => t[0]), stages = new Set(STAGES.map(s => s.id)), qs = new Set(QUESTIONS.map(q => q.key));
  assert.equal(new Set(ids).size, ids.length);
  for (const n of MAP_NODES) {
    assert.ok(tiers.includes(n.tier) && stages.has(n.go.stage), n.id); if (n.go.q) assert.ok(qs.has(n.go.q), n.id);
    for (const k of n.needs || []) { assert.ok(ids.includes(k), `${n.id} needs ${k}`); assert.ok(tiers.indexOf(MAP_NODES.find(m => m.id === k).tier) <= tiers.indexOf(n.tier), `${k} sits above ${n.id}`); }
    assert.doesNotMatch(`${n.name} ${n.gives}`, new RegExp(String.fromCharCode(8212)));
  }
});

test('the map lights up as answers come in', () => {
  const empty = mapOf({}); assert.equal(empty.nodes.find(n => n.id === 'age').state, 'ready'); assert.equal(empty.nodes.find(n => n.id === 'plan').state, 'waiting'); assert.equal(empty.next.id, 'age');
  const born = mapOf({ answered: { age: true } }), at = (m, id) => m.nodes.find(n => n.id === id);
  assert.equal(at(born, 'plan').state, 'ready'); assert.equal(at(born, 'growth').state, 'ready');           // the plan runs on typical numbers
  assert.equal(at(born, 'flow').state, 'waiting'); assert.deepEqual(at(born, 'flow').missing, ['Your pay', 'Your spending']);
  assert.equal(at(born, 'debt').state, 'waiting'); assert.equal(born.next.id, 'income');
  const some = mapOf({ answered: { age: true, income: true, spending: true }, done: { flow: true } });
  assert.equal(at(some, 'flow').state, 'done'); assert.equal(at(some, 'statement').state, 'ready'); assert.deepEqual(at(some, 'home').missing, ['Your cash']);
  assert.deepEqual(at(some, 'life').missing, ['Your investments']); assert.equal(at(some, 'stress').state, 'waiting');
  const all = mapOf({ answered: { age: true, income: true, spending: true, cash: true, invested: true, card: true }, done: { plan: true, levels: true } });
  assert.equal(all.waiting, 0); assert.equal(at(all, 'life').state, 'ready'); assert.equal(all.done, 8); assert.ok(at(all, 'spending').feeds.includes('statement'));
  assert.equal(all.edges.length, MAP_NODES.reduce((s, n) => s + (n.needs || []).length, 0));
});
