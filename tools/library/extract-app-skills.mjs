// SPDX-License-Identifier: AGPL-3.0-only
// Batch 24 (QUESTIONS 207): the older app's own 40 skills as SLAM's second skill set (data/library/app-skills.json),
// the same shape as data/library/skills.json.
//
// Usage: node tools/library/extract-app-skills.mjs <path to a Sapphirestoneage/personalfinance checkout> [asOf YYYY-MM-DD]
//
// Reads data/skill_tree.json there and keeps the skills with no leverage tier (the six app trees: keeper, anchor,
// compounder, earner, ledger, planning). Each keeps its proof text, prerequisites and when it applies. The FOO tag is
// its gate: the older app numbered its own ladder (data/foo_rules.json, 0 to 9), so each gate is read into SLAM's step
// with the same meaning (OLD_FOO below); a skill with no gate takes its tree's home step. Nothing in the app reads this
// file yet (docs/engines/library.md).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) { console.error('usage: node tools/library/extract-app-skills.mjs <personalfinance checkout> [asOf]'); process.exit(2); }
const asOf = process.argv[3] || new Date().toISOString().slice(0, 10);
const tree = JSON.parse(readFileSync(join(src, 'data/skill_tree.json'), 'utf8'));
const ladder = JSON.parse(readFileSync(join(src, 'data/foo_rules.json'), 'utf8')).ladder;

// The older app's ladder step (data/foo_rules.json) to SLAM's step (js/registry/foo.js ORDER), by meaning:
// 0 cover the basics and 1 the starter fund are Stop going backwards; 2 the match; 3 high-interest debt; 4 the full
// fund (big e); 5 the HSA and 6 the Roth IRA are Max out tax-free accounts; 7 the rest of the tax-advantaged space and
// 8 taxable investing are Prepay retirement; 9 prepaying low-rate debt is Make work optional (low-rate debt, then FI).
const OLD_FOO = { 0: '1', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '5', 7: '6', 8: '6', 9: '9' };
// Each app tree's home: a Scorecard area (js/registry/scorecard.js) and the FOO step a skill with no gate takes.
const TREE = {
  keeper: { area: 'cashFlow', foo: '1' }, ledger: { area: 'cashFlow', foo: '1' }, earner: { area: 'income', foo: '1' },
  anchor: { area: 'emergency', foo: '1' }, compounder: { area: 'retirement', foo: '2' }, planning: { area: 'goals', foo: '1' },
};
// A skill whose subject is another Scorecard area than its tree's.
const AREA = {
  'cover-checkup': 'protection', 'term-life': 'protection', 'name-beneficiaries': 'protection', 'write-a-will': 'protection',
  'know-your-bracket': 'taxes', 'quarterly-estimates': 'taxes', 'tax-loss-harvesting': 'taxes', 'roth-conversion-ladder': 'taxes',
  'set-a-mix': 'investing', 'rebalance': 'investing',
};

const trees = tree.trees.filter(t => t.source === 'app');
const appTree = new Set(trees.map(t => t.id));
const own = tree.skills.filter(s => !s.tier && appTree.has(s.tree));
const step = id => ladder.find(l => l.step === id);
const skills = own.map(s => {
  const g = s.gate?.foo;
  const foo = g == null ? { step: TREE[s.tree].foo, by: `tree ${s.tree} (no gate)` } : { step: OLD_FOO[g], by: `gate: older app step ${g}, ${step(g)?.label ?? ''}`.trim() };
  return {
    id: s.id, tree: s.tree, treeName: trees.find(t => t.id === s.tree).label, tier: s.band, level: s.level, leverage: null,
    name: s.name, description: null, does: null, fits: null, proof: s.proof, minutes: s.minutes ?? null,
    prerequisites: s.prereqs, opensFrom: [], opens: [], appliesWhen: s.appliesWhen || [], provenBy: s.boostedBy || [],
    tags: { area: AREA[s.id] ?? TREE[s.tree].area, foo: foo.step, fooBy: foo.by, gate: g ?? null, kind: 'do' },
    source: 'data/skill_tree.json',
  };
});

const out = {
  id: 'library.appSkills',
  version: '1.0.0',
  asOf,
  author: 'Eli Saperstein (SLAM), built in conjunction with Jonathan Mendonsa (ChooseFI)',
  license: 'Eli\'s own work, kept public in this repo with his permission (Nov 6 2026), under the repo license',
  sourceAsOf: tree.asOf,
  source: `The older app's own skills (the six app trees: ${trees.map(t => t.id).join(', ')}), from the public Sapphirestoneage/personalfinance repo (data/skill_tree.json version ${tree.version}, its gates read against data/foo_rules.json). Copied by tools/library/extract-app-skills.mjs.`,
  confidence: 'convention',
  confidenceNote: 'A curriculum, not a measurement. The proof is the older app\'s own test for when a skill is leveled; the tags (Scorecard area and FOO step) are SLAM\'s reading of its gate, for the coach to correct.',
  note: 'The second skill set (QUESTIONS 207), the same shape as skills.json. tier is the band; level is the order within the tree; leverage, description, does and fits are null (the older app has none). prerequisites can cross the six trees. proof is the older app\'s text; provenBy names the household facts it read; appliesWhen when it applies. tags.foo is a SLAM FOO step id (js/registry/foo.js), tags.gate the older app\'s own step number (0 to 9), tags.fooBy the rule. kind do: proven by doing it or by the data, not by learning. Not read by the app yet.',
  counts: { skills: skills.length, trees: trees.length },
  trees: trees.map(t => ({ id: t.id, name: t.label, order: t.order, area: TREE[t.id].area })),
  bands: tree.bands.map(b => ({ id: b.id, label: b.label, order: b.order })),
  skills,
};
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, '../../data/library/app-skills.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${skills.length} app skills in ${trees.length} trees`);
