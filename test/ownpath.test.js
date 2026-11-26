// SPDX-License-Identifier: AGPL-3.0-only
// Your own path (run Not built, groups 1 to 5, Part 6; M8P): each tool checked by hand on made-up numbers, the fees
// and resource lists sourced and dated, no guessed cost on any page, the pages private by default, and the tone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import * as O from '../js/math/ownpath.js';
import { ruleOf5 } from '../js/math/assets.js';
import { runwayOf } from '../js/solo.js';
import { kinSummaryOf, KIN_SECTIONS, KIN_NOTE } from '../js/kin.js';
import * as SRC from '../js/ownpath-sources.js';
import { ASSUMPTIONS } from '../js/registry/assumptions.js';
import { blameIn } from '../tools/tone/scan.mjs';

const root = new URL('../', import.meta.url), read = f => readFileSync(new URL(f, root), 'utf8');
const ref = JSON.parse(read('data/reference-2026.json'));
const PAGES = ['carecost', 'idpapers', 'twosides', 'package', 'ownway', 'searchfund', 'plancheck', 'family', 'agecare'];

test('saving toward an amount: what is left and the whole months', () => {
  assert.equal(O.opSaveOf({}).ready, false, 'empty is not zero');
  assert.deepEqual([O.opSaveOf({ need: 1000, saved: 250, monthly: 100 }).left, O.opSaveOf({ need: 1000, saved: 250, monthly: 100 }).months], [750, 8]);
  assert.equal(O.opSaveOf({ need: 1000, saved: 1200 }).months, 0);
  assert.equal(O.opSaveOf({ need: 1000 }).months, null, 'no monthly amount: no date');
});

test('the plan\'s share: the deductible, then coinsurance, capped by the out-of-pocket max', () => {
  assert.equal(O.opCareShareOf({ cost: 1000 }).ready, false, 'a share is needed');
  const a = O.opCareShareOf({ cost: 20000, deductible: 1500, coinsurance: 0.2 });
  assert.equal(a.you, 1500 + 0.2 * 18500); assert.equal(a.plan, 20000 - a.you);
  const b = O.opCareShareOf({ cost: 20000, deductible: 1500, coinsurance: 0.2, oopMax: 4000, metSoFar: 500 });
  assert.equal(b.you, 3500, 'the max less what was paid'); assert.ok(b.capped);
  assert.equal(O.opCareShareOf({ cost: 800, deductible: 1500, coinsurance: 0.2 }).you, 800, 'all inside the deductible');
});

test('transition care: covered care through the share, the rest, help taken off, then saving', () => {
  assert.equal(O.opTransitionOf({ covered: 5000 }).ready, false, 'covered care needs a share');
  const R = O.opTransitionOf({ covered: 20000, coinsurance: 0.2, deductible: 1500, oopMax: 6000, notCovered: 2500, help: 1000, saved: 700, monthly: 250 });
  assert.equal(R.coveredYours, 5200); assert.equal(R.planPays, 14800); assert.equal(R.yours, 5200 + 2500 - 1000);
  assert.equal(R.save.left, 6000); assert.equal(R.save.months, 24);
  assert.equal(O.opTransitionOf({ covered: 0, notCovered: 3000, help: 5000 }).yours, 0, 'help never makes it negative');
});

test('ID papers, New York first: the dated fees step by step, and a step with no source asks for your number', () => {
  const F = ref.idChangeNY;
  assert.equal(O.opPapersOf({ court: 'nyc' }, F).ready, false);
  const R = O.opPapersOf({ court: 'nyc', born: 'nys', id: 'license', passport: 'renew', copies: 2 }, F);
  assert.equal(R.total, 65 + 60 + 0 + 12.5 + 130); assert.deepEqual(R.toAdd, ['orderCopies'], 'court order copies: set by each clerk');
  const N = O.opPapersOf({ court: 'ny', born: 'nyc', id: 'id', passport: 'new', own: { orderCopies: 20 } }, F);
  assert.equal(N.total, 210 + 20 + 5 + 165); assert.deepEqual(N.toAdd, ['birth'], 'NYC birth certificate: its own pages differ, so it is yours');
  assert.equal(O.opPapersOf({ court: 'other', born: 'other', passport: 'within' }, F).dated, 0, 'another state: nothing assumed');
  for (const k of Object.keys(F)) assert.ok(ASSUMPTIONS.some(a => a.id === `idChangeNY.${k}` && a.date === '2026-11-25' && /\.gov/.test(a.source)), `${k}: an official source and its date`);
});

test('two sides: the person\'s numbers only, and no answer about which', () => {
  assert.equal(O.opTwoSidesOf({ quietMonthly: 100 }).ready, false);
  const R = O.opTwoSidesOf({ quietMonthly: 120, quietOnce: 0, outMonthly: 400, outOnce: 1500, years: 3 });
  assert.deepEqual([R.quiet, R.out, R.gap, R.more], [4320, 15900, 11580, 'out']);
  assert.equal(O.opTwoSidesOf({ quietMonthly: 0, outMonthly: 0 }).more, 'even', '$0 is an answer');
});

test('the whole package: pay plus benefits at two jobs, and the pay that matches', () => {
  const R = O.opPackageOf({ now: { pay: 80000, health: 500, care: 3000, family: 10000 }, next: { pay: 85000, health: 300 } });
  assert.equal(R.now.total, 80000 + 6000 + 3000 + 10000); assert.equal(R.next.total, 85000 + 3600); assert.equal(R.gap, 10400); assert.equal(R.payToMatch, 95400);
  assert.equal(O.opPackageOf({ now: { pay: 1 }, next: { pay: 2 } }).payToMatch, null);
});

test('your own feet: the plan\'s runway engine, and a Plan B that fits', () => {
  const now = new Date(2026, 10, 25), R = O.opOwnWayOf({ cash: 3000, ownCosts: 1500, stillIn: 500, onFamilyPlan: true, student: false, now });
  assert.deepEqual({ ...R, planB: undefined }, { ...runwayOf({ cash: 3000, spending: 1500, stillIn: 500, cut: 0, now }), planB: undefined }, 'one runway engine');
  assert.ok(R.planB.includes('health') && !R.planB.includes('school'));
});

test('a longer search: the Rule of 5 (M43) plus the months the person adds', () => {
  const R = O.opSearchFundOf({ age: 30, spending: 3000, cash: 5000, extraMonths: 3 });
  assert.equal(R.baseTarget, ruleOf5({ age: 30, spending: 3000 }).value, 'the plan\'s own target'); assert.equal(R.target, 27000); assert.equal(R.gap, 22000);
  assert.equal(O.opSearchFundOf({ age: 30, spending: 3000 }).extraMonths, 0, 'nothing assumed about how long');
});

test('the plan check: what is found, and what to ask', () => {
  assert.equal(O.opPlanCheckOf({}).ready, false);
  const R = O.opPlanCheckOf({ hormones: 'Yes', surgery: 'No', fullyInsured: "Don't know" });
  assert.deepEqual(R.yes, ['hormones']); assert.equal(R.ask.length, 7);
});

test('family building: what others pay, the adoption credit with its 2026 phase-out', () => {
  const A = ref.adoptionCredit;
  assert.deepEqual([A.max, A.refundable, A.phaseStart, A.phaseEnd], [17670, 5120, 265080, 305080]);
  const full = O.opFamilyOf({ path: 'adoption', cost: 40000, employer: 5000 }, A);
  assert.equal(full.yours, 35000); assert.equal(full.credit.credit, 17670); assert.equal(full.credit.refundable, 5120);
  const half = O.opFamilyOf({ path: 'adoption', cost: 40000, employer: 5000, magi: 285080 }, A);
  assert.equal(half.credit.credit, 17670 / 2); assert.equal(O.opFamilyOf({ path: 'adoption', cost: 40000, magi: 305080 }, A).credit.credit, 0);
  assert.equal(O.opFamilyOf({ path: 'adoption', cost: 6000, employer: 5000 }, A).credit.credit, 1000, 'what an employer paid back does not count');
  assert.equal(O.opFamilyOf({ path: 'ivf', cost: 30000, insurance: 12000 }, A).credit, null);
});

test('care later in life: today\'s dollars, less cover, and a month to set aside', () => {
  const R = O.opAgeCareOf({ monthly: 6000, years: 3, covered: 1000, saved: 30000, yearsUntil: 20 });
  assert.equal(R.need, 180000); assert.equal(R.left, 150000); assert.equal(R.perMonth, 150000 / 240);
});

test('the chosen-family summary: plain sentences, empty boxes write nothing, built to be extended', () => {
  assert.equal(kinSummaryOf({}).ready, false);
  const S = kinSummaryOf({ 'proxy.agent': 'Sam', 'hipaa.hear': 'Sam, Jo', 'will.gets': 'Everything to Sam.' });
  assert.deepEqual(S.parts.map(p => p.key), ['proxy', 'hipaa', 'will']);
  assert.match(S.text, /I want Sam to make them for me\./); assert.ok(S.text.startsWith(KIN_NOTE)); assert.match(S.text, /Everything to Sam\.$/m, 'no double stop');
  assert.deepEqual(S.papers.filter(p => !p.has).map(p => p.paper), ['Power of attorney']);
  const more = [...KIN_SECTIONS, { key: 'extra', title: 'Extra', paper: 'Trust', boxes: [{ key: 'x', label: 'x' }], words: a => [a.x ? `X is ${a.x}.` : null] }];
  assert.match(kinSummaryOf({ 'extra.x': 'here' }, more).text, /X is here\./, 'run 1 Part 11 can add a section');
});

test('every resource list is dated, every phone number is from the organization\'s own page, and the closed lines are not shown', () => {
  assert.equal(SRC.OP_CHECKED, '2026-11-25');
  const lists = [SRC.OP_CARE_HELP, SRC.OP_PAPERS_RULES, SRC.OP_PLAN_RULES, SRC.OP_FAMILY_RULES, SRC.OP_KIN_RULES, SRC.OP_OWN_RULES, SRC.OP_TALK, SRC.OP_AGE_RULES];
  for (const L of lists) for (const r of L) { assert.ok(r.where && (r.said || r.what), JSON.stringify(r).slice(0, 80)); assert.deepEqual(blameIn(`${r.said ?? ''} ${r.what ?? ''}`), []); }
  for (const t of SRC.OP_TALK) assert.ok(t.phone && t.where, t.name);
  const all = JSON.stringify(lists);
  assert.doesNotMatch(all, /360-5428|360-LGBT/, 'the SAGE elder hotline closed in 2023');
  assert.doesNotMatch(all, /press 3[^"]*to reach/i);
});

test('the pages: private by default, a neutral title, no amounts to tap on a cost box, and no clinical or verdict words', async () => {
  const { OWN_SPECS } = await import('../js/solo/ownpath.js').catch(() => ({ OWN_SPECS: null }));
  const src = read('js/solo/ownpath.js');
  for (const id of [...PAGES, 'kin']) {
    assert.ok(existsSync(new URL(`${id}.html`, root)), id);
    const page = read(`${id}.html`);
    assert.match(page, /<title>Money tools: Stress Less About Money<\/title>/, `${id}: a neutral tab title`);
    assert.match(page, /no-referrer/, `${id}: the address is not sent on`);
  }
  assert.equal((src.match(/private: true/g) || []).length, PAGES.length, 'every spec is private');
  assert.equal((src.match(/private: true, keep: keepCard, drawn: \(\) => withExit\(\{ neutral: true \}\)/g) || []).length, PAGES.length, 'every spec keeps nothing until Keep this, with Leave this page and a neutral title');
  assert.match(read('js/solo/kin.js'), /boot\('kin', draw, \{ private: true \}\)/); assert.match(read('js/solo/kin.js'), /keepCard\(api\)\);\n  withExit\(\{ neutral: true \}\);/);
  for (const key of ['covered', 'deductible', 'oopMax', 'notCovered', 'help', 'quietMonthly', 'outMonthly', 'ownCosts', 'cost', 'insurance', 'monthly\', label: \'Care'])
    assert.match(src, new RegExp(`key: '${key}[^}]*picks: \\[\\]`), `${key}: a cost box has no amounts to tap`);
  assert.doesNotMatch(src, /dysphoria|disorder|patient|should|must\b(?! cover)/i, 'plain and warm, nothing clinical, no verdict');
  assert.match(read('js/solo/canon.js'), /\.\.\.OWN_SPECS/);
  if (OWN_SPECS) assert.deepEqual(Object.keys(OWN_SPECS), PAGES);
});

test('one private mode and one quick exit, shared with the hard moments (js/solo/keepthis.js)', () => {
  const shell = read('js/solo/shell.js'), priv = read('js/solo/keepthis.js'), hard = read('js/solo/hard.js');
  assert.match(shell, /wrote = priv && mine\(\)\.keep === true/, 'boot writes nothing until Keep this');
  assert.match(priv, /export function keepCard/); assert.match(priv, /export function exitButton/); assert.match(priv, /location\.replace\(D\.exit\.to\)/);
  assert.match(priv, /NEUTRAL_TITLE = 'Money tools: Stress Less About Money'/);
  assert.match(hard, /from '\.\/keepthis\.js'/, 'the hard moments use the same parts');
  assert.doesNotMatch(hard, /function keepCard|function exitButton/, 'no second copy');
  for (const f of ['js/solo/ownpath.js', 'js/solo/kin.js']) assert.doesNotMatch(read(f), /location\.replace|function keepCard/, `${f}: no copy of its own`);
});
