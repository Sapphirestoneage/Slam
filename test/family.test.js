// SPDX-License-Identifier: AGPL-3.0-only
// Family money (run Not built, groups 1 to 5, Part 8; M8F): each function checked by hand on made-up numbers, the
// pages wired to the one renderer and the hub shelf, the dated rows in the reference file, the Yeshiva tuition goal
// type, the game's copy current, and no outside number typed into the views.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as F from '../js/math/family.js';
import { fiMoveOf } from '../js/math/fi.js';

const root = new URL('../', import.meta.url), read = f => readFileSync(new URL(f, root), 'utf8');
const ref = JSON.parse(read('data/reference-2026.json'));
const near = (a, b, tol = 0.01, why = '') => assert.ok(Math.abs(a - b) <= tol, `${why} ${a} vs ${b}`);
const RULES = { childcare: ref.childcare, ny529: ref.limits.ny529 };

test('the sandwich years: one monthly total, the overlap, the flows and what is left', () => {
  assert.equal(F.fmSandwich({}).ready, false, 'nothing answered');
  assert.equal(F.fmSandwich({ parents: 0 }).ready, true, '$0 is an answer');
  const r = F.fmSandwich({ parents: 800, kids: 1200, parentsYears: 5, kidsYears: 10, takeHome: 7000, spending: 4500 });
  assert.equal(r.peak, 2000); assert.equal(r.year, 24000); assert.equal(r.both, 60, 'five years at once');
  assert.equal(r.all, 800 * 60 + 1200 * 120); assert.equal(r.leftAfter, 500); near(r.share, 0.8, 1e-12);
  assert.deepEqual(r.flows.map(f => [f.at, f.monthly]).sort((a, b) => a[0] - b[0] || a[1] - b[1]), [[0, -1200], [0, -800], [60, 800], [120, 1200]]);
  const open = F.fmSandwich({ parents: 500, parentsYears: 0 });
  assert.equal(open.all, null, 'no end in sight: no total'); assert.deepEqual(open.flows, [{ at: 0, monthly: -500, name: 'parents' }]);
  assert.deepEqual(F.fmSandwich({ parents: 500, inSpending: true }).flows, [], 'already in the spending: nothing moves');
  const later = F.fmSandwich({ kids: 300, kidsYears: 2, kidsFrom: 3 });
  assert.deepEqual(later.flows.map(f => f.at), [36, 60]); assert.equal(later.total, 0, 'nothing yet this month'); assert.equal(later.peak, 300);
});

test('the sandwich flows move the FI date the way M53 runs them', () => {
  const m = { inputs: { invested: 100000, realReturn: 0.05 }, investing: { monthly: 2000 }, fiNumber: { value: 1000000 } };
  const r = F.fmSandwich({ parents: 500, parentsYears: 5 });
  const mv = fiMoveOf(m, { changes: r.flows }, { from: new Date('2026-11-25T12:00:00Z') });
  assert.ok(mv.after > mv.before && mv.days > 0, 'later with money out each month');
  const back = fiMoveOf(m, { changes: [] }, { from: new Date('2026-11-25T12:00:00Z') });
  assert.equal(back.days, 0);
});

test('living at home: the rent saved and the months to the goal', () => {
  assert.equal(F.fmBoomerang({ rent: 1500 }).ready, false, 'needs how long');
  const r = F.fmBoomerang({ rent: 1800, payHome: 300, savePct: 0.75, months: 12, target: 9000, have: 1000, homeCost: 400 });
  assert.equal(r.saved, 1500); assert.equal(r.saving, 1125); assert.equal(r.byPlan, 1000 + 1125 * 12);
  assert.equal(r.reach, Math.ceil(8000 / 1125)); assert.equal(r.spare, 12 - 8); assert.equal(r.extra, 0); assert.equal(r.household, 100);
  const slow = F.fmBoomerang({ rent: 1200, payHome: 200, months: 6, target: 12000 });
  assert.equal(slow.reach, 12); assert.equal(slow.extra, 6); assert.equal(slow.perMonthFor, 2000); assert.equal(slow.short, 6000);
  const none = F.fmBoomerang({ rent: 1000, payHome: 1200, months: 6, target: 5000 });
  assert.equal(none.saved, 0, 'paying more than rent saves nothing'); assert.equal(none.never, true);
});

test('kids and tuition: the years, the money to put away, and the New York childcare row', () => {
  assert.equal(F.fmSchool({}).ready, false);
  const care = F.fmSchool({ kind: 'care', state: 'NY', careAge: 'infant', years: 2, rules: RULES });
  assert.equal(care.fromRow, true); assert.equal(care.yearly, ref.childcare.NY.infant); assert.equal(care.total, 2 * ref.childcare.NY.infant);
  assert.equal(F.fmSchool({ kind: 'care', state: 'other', careAge: 'infant', years: 2, rules: RULES }).ready, false, 'no sourced row: the person types it');
  assert.equal(F.fmCareRow(ref.childcare, 'NJ', 'infant'), null);
  const own = F.fmSchool({ kind: 'care', state: 'NY', careAge: 'infant', yearly: 18000, years: 1, rules: RULES });
  assert.equal(own.fromRow, false); assert.equal(own.total, 18000, 'the person\'s own number wins');
  const t = F.fmTuition({ yearly: 15000, kids: 3, years: 12, startIn: 3, ret: 0.05, share: 0.5 });
  assert.equal(t.total, 15000 * 3 * 12); assert.equal(t.want, t.total / 2); assert.equal(t.months, 36);
  const g = (1.05) ** (1 / 12) - 1; near(t.monthly, (t.total / 2) * g / ((1 + g) ** 36 - 1), 1e-6, 'level saving to the goal');
  near(t.payGo, (t.total / 2) / (12 * 12), 1e-9, 'the other half, paid as it comes');
  const up = F.fmTuition({ yearly: 10000, years: 2, startIn: 1, rise: 0.03, share: 0 });
  near(up.total, 10000 * 1.03 + 10000 * 1.03 ** 2, 1e-9); assert.equal(up.monthly, 0);
  const now = F.fmTuition({ yearly: 12000, years: 1, startIn: 0, have: 2000 });
  assert.equal(now.monthly, null); assert.equal(now.covered, 2000); near(now.payGo, 10000 / 12, 1e-9);
});

test('the New York 529: the deduction up to the limit, and K-12 tuition is not qualified in New York', () => {
  const L = ref.limits.ny529;
  assert.equal(L.single, 5000); assert.equal(L.joint, 10000); assert.equal(ref.limits.k12From529, 20000);
  const a = F.fm529({ yearly: 12000, joint: false, rate: 0.06, rules: L });
  assert.equal(a.deducted, 5000); assert.equal(a.over, 7000); near(a.saved, 300, 1e-9);
  assert.equal(F.fm529({ yearly: 4000, joint: true, rate: null, rules: L }).saved, null, 'no rate tapped: no dollars');
  const y = F.fmSchool({ kind: 'yeshiva', yearly: 15000, kids: 2, years: 8, startIn: 5, plan529: 'joint', nyRate: 0.05, ret: 0.05, rules: RULES });
  assert.equal(y.p529.recapture, true); assert.equal(y.p529.limit, 10000);
  assert.equal(F.fmSchool({ kind: 'college', yearly: 25000, years: 4, startIn: 10, plan529: 'single', rules: RULES }).p529.recapture, false);
  assert.equal(F.fmSchool({ kind: 'care', yearly: 20000, years: 2, startIn: 1, plan529: 'single', rules: RULES }).p529, null, 'no 529 for childcare');
});

test('the community presets: an empty file shows nothing, a filled row shows', () => {
  const file = JSON.parse(read('data/community-tuition.json'));
  assert.ok(file.rows.length > 0 && file.rows.every(r => r.low === null && r.high === null), 'the rows wait for Eli: no guessed ranges');
  assert.deepEqual(F.fmPresetRows(file), []);
  assert.deepEqual(F.fmPresetRows({ rows: [{ label: 'Elementary', low: 10000, high: 14000 }, { label: 'x', low: 5, high: null }] }).map(r => r.label), ['Elementary']);
});

test('the pages are drawn by the one renderer, on the hub shelf and in the layout check, with no outside number typed in the view', async () => {
  globalThis.document ??= { documentElement: { dataset: {} } };
  const { FAMILY_SPECS, FAMILY_SHELF } = await import('../js/solo/family.js');
  const canon = read('js/solo/canon.js'), hub = read('js/solo/hub.js'), layout = read('tools/e2e/layout.cjs');
  assert.match(canon, /\.\.\.FAMILY_SPECS/);
  assert.deepEqual(FAMILY_SHELF.map(s => s[0]).sort(), Object.keys(FAMILY_SPECS).sort());
  for (const [id] of FAMILY_SHELF) {
    assert.ok(existsSync(new URL(`${id}.html`, root)), `${id}.html`);
    assert.ok(hub.includes(`'${id}.html'`), `${id} on the hub shelf`); assert.ok(layout.includes(`'${id}'`), `${id} in the layout check`);
    const page = read(`${id}.html`); assert.match(page, new RegExp(`data-tool="${id}"`)); assert.match(page, /src="js\/solo\/canon\.js"/);
    const S = FAMILY_SPECS[id]; assert.ok(S.title && S.why && S.fields.length && S.run && S.answer, id);
  }
  for (const f of ['js/solo/family.js', 'js/math/family.js', 'game/features/family.js']) {
    const text = read(f);
    assert.doesNotMatch(text, new RegExp(String.fromCharCode(0x2014)), `${f}: no em dash`);
    assert.doesNotMatch(text, /\b(burden|freeload|mooch|failed|behind on|mistake|off track)\b/i, `${f}: calm words`);
  }
  assert.doesNotMatch(read('js/solo/family.js'), /20459|17476|reference-2026/, 'the childcare row comes from the reference file');
  assert.doesNotMatch(read('game/features/family.js'), /20459|17476/, 'the game reads FM_REF');
  // the yearly answer of a sourced state is the dated row; another state asks for the person's own number
  const T = FAMILY_SPECS.tuition, yearly = T.fields.find(f => f.key === 'yearly');
  assert.equal(yearly.picks({ kind: 'care', state: 'NY', careAge: 'toddler' }, ref)[0], ref.childcare.NY.toddler);
  assert.match(yearly.help({ kind: 'care', state: 'other' }, ref), /yours/);
});

test('Yeshiva tuition is a goal type in both apps, with its community presets', () => {
  assert.match(read('js/community.js'), /YESHIVA_GOAL = 'Yeshiva tuition'/);
  assert.match(read('js/ui/plan-ui.js'), /TUITION_GOAL, YESHIVA_GOAL\]/);
  assert.match(read('game/features/family.js'), /FAM_YESHIVA = "Yeshiva tuition"/);
});

test('the game\'s copy of js/math/family.js and the web copy of the presets are current', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/game_family_build.mjs', import.meta.url)), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
