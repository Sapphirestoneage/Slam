// SPDX-License-Identifier: AGPL-3.0-only
// Batch 17: the FI Skill Tree's 625 skills as SLAM reference data (data/library/skills.json).
//
// Usage: node tools/library/extract-skills.mjs <path to a Sapphirestoneage/personalfinance checkout> [asOf YYYY-MM-DD]
//
// Reads the older suite's data/skill_tree.json (the FI Skill Tree v6.3.1 curriculum, 25 trees of 25 levels, plus that
// app's own 40 skills, which are left out here) and data/skill_links.json (312 lanes between trees). Writes one record a
// skill with SLAM's draft tags: the Scorecard area it belongs to and the FOO step where it first pays to learn it. The
// tags are SLAM's own reading (rules below, in one place), not the curriculum's, so the file says so and the coach can
// argue with any line. Nothing in the app reads this file yet (docs/engines/library.md).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) { console.error('usage: node tools/library/extract-skills.mjs <personalfinance checkout> [asOf]'); process.exit(2); }
const asOf = process.argv[3] || new Date().toISOString().slice(0, 10);
const tree = JSON.parse(readFileSync(join(src, 'data/skill_tree.json'), 'utf8'));
const links = JSON.parse(readFileSync(join(src, 'data/skill_links.json'), 'utf8'));

// The curriculum is the skills with a leverage tier (S, A, B, C); the rest are the older app's own.
const curriculum = tree.skills.filter(s => s.tier);
const trees = tree.trees.filter(t => t.source !== 'app');

// Plain tree names: the source labels carry an emoji and capitals ("⭐ MAIN PATH: Accounts & Investing").
const plain = label => label.replace(/^[^A-Za-z]+/, '').replace(/\s*\(.*\)$/, '').split(':')[0].trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).replace(/ & /g, ' and ');

// Each tree's home in SLAM: a Scorecard area (js/registry/scorecard.js ids) and the FOO step (js/registry/foo.js ORDER)
// where its skills start to pay, by level band. byLevel: [[fromLevel, step], ...], the last one that applies wins.
const TREE = {
  'main-path': { area: 'retirement', byLevel: [[1, '5'], [9, '6'], [19, '9']] },
  'portfolio-design': { area: 'investing', byLevel: [[1, '6'], [20, '9']] },
  'tax-strategy': { area: 'taxes', byLevel: [[1, '5'], [16, '6']] },
  'real-estate': { area: 'goals', byLevel: [[1, '8']] },
  'income-career': { area: 'income', byLevel: [[1, '1'], [9, '6'], [20, '9']] },
  'side-hustles': { area: 'income', byLevel: [[1, '1'], [11, '7']] },
  entrepreneurship: { area: 'income', byLevel: [[1, '7']] },
  'credit-cards': { area: 'credit', byLevel: [[1, '3'], [6, '4']] },
  'deals-smart-buying': { area: 'cashFlow', byLevel: [[1, '1'], [18, '8']] },
  'cash-safety-net': { area: 'emergency', byLevel: [[1, '1'], [4, '4'], [15, '9']] },
  'debt-leverage': { area: 'debt', byLevel: [[1, '3'], [11, '8'], [16, '9']] },
  'alternatives-speculation': { area: 'investing', byLevel: [[1, '6']] },
  'insurance-protection': { area: 'protection', byLevel: [[1, '1'], [11, '5'], [16, '8']] },
  'geo-arbitrage-location': { area: 'cashFlow', byLevel: [[1, '1'], [6, '8'], [15, '9']] },
  'health-longevity': { area: 'protection', byLevel: [[1, '1'], [4, '5'], [11, '9']] },
  'family-generational-wealth': { area: 'goals', byLevel: [[1, '0b'], [4, '8'], [16, '9']] },
  'withdrawal-decumulation': { area: 'goals', byLevel: [[1, '6'], [6, '9']] },
  knowledge: { area: 'mindset', byLevel: [[1, '0b'], [8, '6']] },
  'financial-ops-tooling': { area: 'cashFlow', byLevel: [[1, '1'], [10, '6']] },
  'money-psychology': { area: 'mindset', byLevel: [[1, '0b']] },
  'time-capital': { area: 'mindset', byLevel: [[1, '0b'], [14, '7']] },
  'social-capital': { area: 'mindset', byLevel: [[1, '0b']] },
  'pre-retirement-design': { area: 'goals', byLevel: [[1, '6'], [11, '9']] },
  'storms-windfalls': { area: 'protection', byLevel: [[1, '4']] },
  'the-long-game': { area: 'goals', byLevel: [[1, '1'], [5, '6'], [22, '9']] },
};
// Words in a skill's name or description that name a FOO step outright. Checked in order; the first match wins over
// the tree's level band. Kept short on purpose: a rule nobody can read is a rule nobody can argue with.
const WORDS = [
  [/401\(k\) match|full match/i, '2'],
  [/\$1k shield|one month ahead|stop the inflow|autopay all minimums|inventory every debt|first \$10k/i, '1'],
  [/triage by rate|kill the consumer debt|payoff engine|pay in full|debt-free day|refinance round|student loan/i, '3'],
  [/true emergency fund|size the fund|job-loss playbook|income-drop/i, '4'],
  [/roth ira|backdoor roth|turn on the hsa|start the hsa|invest the hsa|hsa shoebox/i, '5'],
  [/bunch charity|daf\b|qcd|give together|giving endgame/i, '5b'],
  [/coast milestone|first \$100k/i, '6'],
  [/solo 401\(k\)|sabbatical|passion project|encore/i, '7'],
  [/529|sinking funds|house hack|rent-vs-buy/i, '8'],
  [/roth conversion|72\(t\)|rmds?\b|social security|bridge account|bridge the|healthcare bridge|healthcare gap|withdrawal order|one more year|fi day|last mile/i, '9'],
];
const fooOf = s => {
  const text = `${s.name} ${s.what}`;
  for (const [re, step] of WORDS) if (re.test(text)) return { step, by: `words: ${re.source.split('|')[0].replace(/\\/g, '')}` };
  const band = TREE[s.tree].byLevel.filter(([from]) => s.level >= from).at(-1);
  return { step: band[1], by: `tree ${s.tree} from level ${band[0]}` };
};

// Lanes: finishing `from` opens `to` in another tree without walking that tree's ladder (an OR, not a prerequisite).
const ids = new Set(curriculum.map(s => s.id));
const lanes = links.links.filter(l => ids.has(l.from) && ids.has(l.to));
const opens = id => lanes.filter(l => l.from === id).map(l => l.to);
const opensFrom = id => lanes.filter(l => l.to === id).map(l => l.from);
const label = Object.fromEntries(trees.map(t => [t.id, plain(t.label)]));

const skills = curriculum.map(s => {
  const foo = fooOf(s);
  return {
    id: s.id, tree: s.tree, treeName: label[s.tree], tier: s.band, level: s.level, leverage: s.tier,
    name: s.name, description: s.what, does: s.does, fits: s.fits, proof: s.proof,
    prerequisites: s.prereqs, opensFrom: opensFrom(s.id), opens: opens(s.id),
    tags: { area: TREE[s.tree].area, foo: foo.step, fooBy: foo.by, kind: 'learn' },
    source: 'data/skill_tree.json',
  };
});

const out = {
  id: 'library.skills',
  version: '1.0.0',
  asOf,
  sourceAsOf: tree.asOf,
  source: 'FI Skill Tree v6.3.1 (25 trees, 25 levels each, the S, A, B, C leverage tiers), as extracted into the public Sapphirestoneage/personalfinance repo (data/skill_tree.json and data/skill_links.json, version ' + tree.version + '). Copied by tools/library/extract-skills.mjs.',
  confidence: 'convention',
  confidenceNote: 'A curriculum, not a measurement. The leverage tier is the curriculum author\'s ranking; the tags (Scorecard area and FOO step) are SLAM\'s own draft reading, made by the rules in tools/library/extract-skills.mjs, for the coach to correct.',
  note: 'tier is the band (foundation, optimization, advanced, expert, endgame; levels 1 to 25 land five at a time). prerequisites are the level before in the same tree. opensFrom lists skills in other trees whose finishing opens this one without its ladder (any one is enough); opens is the reverse. tags.area is a Scorecard area id (js/registry/scorecard.js), tags.foo a FOO step id (js/registry/foo.js), tags.fooBy the rule that set it. Not read by the app yet.',
  counts: { skills: skills.length, trees: trees.length, lanes: lanes.length, leftOut: tree.skills.length - curriculum.length },
  trees: trees.map(t => ({ id: t.id, name: label[t.id], order: t.order, area: TREE[t.id].area })),
  bands: tree.bands.map(b => ({ id: b.id, label: b.label, order: b.order })),
  skills,
};
const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, '../../data/library/skills.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${skills.length} skills in ${trees.length} trees, ${lanes.length} lanes, left out ${out.counts.leftOut} app skills`);
