// SPDX-License-Identifier: AGPL-3.0-only
// Estate and marriage (run Finish everything partly built, Part 11; M8E): the math checked by hand on made-up numbers,
// one tax engine and one spousal formula, the dated rules and their sources, the accounts section of the chosen-family
// summary from Life admin, the private pages, the calm words, and the game's copy current.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { esHeirs, esTenYear, esCompare, ES_RULE_OF } from '../js/math/estate.js';
import { federalTax } from '../js/math/income.js';
import { spousalExcess, householdBenefits } from '../js/math/socialsecurity.js';
import { kinAccountsSection, kinSummaryOf, KIN_SECTIONS } from '../js/kin.js';
import { lifeAdminItems } from '../js/lifeadmin.js';
import { blameIn } from '../tools/tone/scan.mjs';

const root = new URL('../', import.meta.url), read = f => readFileSync(new URL(f, root), 'utf8');
const ref = JSON.parse(read('data/reference-2026.json')), D = JSON.parse(read('data/sources/estate-2026.json'));
const taxOf = (g, s) => federalTax({ gross: g, filingStatus: s }, ref).value;
const near = (a, b, tol = 1e-6, why = '') => assert.ok(Math.abs(a - b) <= tol, `${why} ${a} vs ${b}`);

test('who gets what: shares, the step-up, the account rules and the 10-year line', () => {
  assert.equal(esHeirs({}, ref.estate).ready, false, 'empty is not zero');
  const people = [{ id: 'a', name: 'Sam', heir: 'close' }, { id: 'b', name: 'Jo', heir: 'other' }, { id: 'c', name: 'Rae', heir: 'spouse' }];
  const items = [
    { id: 1, kind: 'taxable', value: 80000, basis: 30000, to: { a: 1, b: 1 } },
    { id: 2, kind: 'pretax', value: 150000, to: { b: 1 } },
    { id: 3, kind: 'home', value: 400000, to: { c: 1 } }, // no price paid: the step-up waits
    { id: 4, kind: 'life', value: 250000, to: {} }, // given to no one
    { id: 5, kind: 'cash', value: null, to: { a: 1 } }, // a value to look up
  ];
  const S = esHeirs({ items, people, deathYear: 2026, started: true }, ref.estate);
  const [sam, jo, rae] = S.people;
  assert.equal(sam.gets, 40000); assert.equal(sam.erased, 25000);
  assert.equal(jo.gets, 190000); assert.equal(jo.pretax, 150000); assert.equal(jo.rule, 'ten'); assert.equal(jo.lastYear, 2036, '2026 + 10 (IRS Publication 590-B example)');
  assert.equal(jo.yearly, true, 'the owner had started: a withdrawal every year');
  assert.equal(rae.basisUnknown, 400000); assert.equal(rae.erased, 0); assert.equal(rae.rule, 'own');
  assert.deepEqual(S.unassigned, [4]); assert.deepEqual(S.noValue, [5]);
  assert.equal(S.total, 880000); assert.equal(S.assigned, 630000); assert.equal(S.erased, 50000); assert.equal(jo.erased, 25000);
  assert.equal(S.estate.toSpouse, 400000); assert.equal(S.estate.fedBase, 480000);
  assert.equal(S.estate.federal.state, 'under'); assert.equal(S.estate.federal.room, 15000000 - 480000);
  assert.equal(ES_RULE_OF.child, 'child'); assert.equal(ES_RULE_OF.disabled, 'life');
});

test('the New York cliff: under the line, between the line and 105%, over the cliff', () => {
  const at = v => esHeirs({ items: [{ id: 1, kind: 'cash', value: v, to: { a: 1 } }], people: [{ id: 'a', name: 'A', heir: 'other' }] }, ref.estate).estate.ny;
  assert.equal(at(7350000).state, 'under'); assert.equal(at(7350001).state, 'cliff'); near(at(7350001).cliff, 7717500);
  assert.equal(at(7717500).state, 'cliff'); assert.equal(at(7717501).state, 'over');
  const F = esHeirs({ items: [{ id: 1, kind: 'cash', value: 16000000, to: { a: 1 } }], people: [{ id: 'a', name: 'A', heir: 'other' }] }, ref.estate).estate.federal;
  assert.equal(F.state, 'over'); assert.equal(F.over, 1000000);
});

test('the 10 years: three ways, the tax from the one federal engine, by hand', () => {
  assert.equal(esTenYear({ balance: 150000, other: null }, taxOf).ready, false, 'their income is needed; 0 is an answer');
  const X = esTenYear({ balance: 150000, growth: 0, other: 60000, status: 'single', deathYear: 2026 }, taxOf);
  // spread: 15,000 a year on top of 60,000. Single 2026: taxable 58,900 vs 43,900.
  const t = g => taxOf(g, 'single');
  near(X.ways.even.rows[0].tax, t(75000) - t(60000)); near(X.ways.even.tax, 10 * (t(75000) - t(60000)));
  near(X.ways.even.rows[0].tax, 2650, 1e-6, 'by hand: 8,500 x 22% + 15,000 - 8,500 = 6,500 x 12%');
  near(X.ways.first.tax, t(210000) - t(60000)); near(X.ways.last.tax, X.ways.first.tax);
  assert.equal(X.best, 'even'); near(X.saves, X.ways.first.tax - X.ways.even.tax);
  assert.equal(X.ways.even.rows.at(-1).year, 2036);
  const G = esTenYear({ balance: 100000, growth: 0.05, other: 0, deathYear: 2026, started: true }, taxOf);
  near(G.ways.even.out, G.ways.even.rows.reduce((s, r) => s + r.out, 0)); near(G.ways.last.out, 100000 * 1.05 ** 10, 1e-6);
  near(G.ways.even.rows[0].out, 100000 * 1.05 / 10); assert.equal(G.ways.last.ready, false, 'required withdrawals started: not all in year 10');
});

test('married or partners: two single returns or one joint, the cover tax, the spousal top-up', () => {
  assert.equal(esCompare({ people: [{ pay: 90000 }, { pay: null }] }, { taxOf }).ready, false);
  const R = esCompare({ people: [{ name: 'A', pay: 90000, pia: 2800 }, { name: 'B', pay: 30000, pia: 900 }], cover: 6000, coverBy: 0 }, { taxOf, spousalOf: (a, b) => spousalExcess(a, b, ref.socialSecurity) });
  assert.equal(R.single[0], 10970); assert.equal(R.single[1], 1420); assert.equal(R.joint, 10040);
  near(R.coverTax, 6000 * 0.22); near(R.taxDiff, 10970 + 1420 + 1320 - 10040);
  assert.equal(R.ss[1].spousal, 500); assert.equal(R.ss[0].spousal, 0); assert.equal(R.ssYear, 6000); assert.equal(R.ss[1].survivor, 2800); assert.equal(R.ss[1].survivorMore, 1900);
});

test('one spousal formula: householdBenefits and Married or partners? use spousalExcess', () => {
  assert.match(read('js/math/socialsecurity.js'), /const excess = spousalExcess\(a\.pia, b\.pia, ss\);/);
  assert.doesNotMatch(read('js/math/estate.js'), /spousalShare \*/, 'no second copy of the formula');
  const H = householdBenefits([{ pia: 2000, birthYear: 1964, claimAge: 67 }, { pia: 600, birthYear: 1964, claimAge: 67 }], ref.socialSecurity, { wageBase: ref.tax.socialSecurityWageBase });
  assert.ok(H.people.length === 2);
  assert.match(read('js/solo/estate.js'), /federalTax\(/, 'the one federal tax engine (M10)');
});

test('every rule has a number in the reference data, a source on the assumptions list and a dated fact', async () => {
  const E = ref.estate;
  assert.deepEqual([E.federalExclusion, E.nyExclusion, E.nyCliffShare, E.tenYears, E.minorAge, E.giftAnnual, E.nycPartnerFee], [15000000, 7350000, 1.05, 10, 21, 19000, 35]);
  const { ASSUMPTIONS } = await import('../js/registry/assumptions.js');
  for (const k of Object.keys(E)) { const a = ASSUMPTIONS.find(x => x.id === `estate.${k}`); assert.ok(a && a.source && a.date, `estate.${k} on the assumptions list`); }
  for (const [k, f] of Object.entries(D.facts)) { assert.ok(f.text && f.source && /^https:\/\//.test(f.url) && /^2026-\d\d-\d\d$/.test(f.checked), k); assert.equal(blameIn(f.text).length, 0, k); }
  assert.match(D.lawyer, /bring to a lawyer/);
});

test('the estate basics: one section per account from Life admin, in the summary for a lawyer', () => {
  const doc = { profile: { lifeAdmin: {} } }, records = [{ id: 'r1', kind: 'account', name: 'Work 401(k)', values: { group: 'investment', beneficiary: 'Yes' } }, { id: 'r2', kind: 'account', name: 'Roth IRA', values: { group: 'investment', beneficiary: 'No' } }, { id: 'r3', kind: 'account', name: 'Checking', values: { group: 'cash' } }];
  const A = kinAccountsSection(lifeAdminItems(doc, records));
  assert.deepEqual(A.boxes.map(b => b.key), ['r1', 'r2']);
  const S = kinSummaryOf({ 'accounts.r1': 'Sam', 'accounts.r2': 'Jo' }, [...KIN_SECTIONS, A]);
  const p = S.parts.find(x => x.key === 'accounts');
  assert.equal(p.lines.length, 2); assert.match(p.lines[0], /On my Work 401\(k\), I want Sam named as the beneficiary \(someone is named now/); assert.match(p.lines[1], /no one is named yet/);
  assert.ok(S.papers.some(x => x.paper === 'Beneficiary forms' && x.has));
  assert.equal(kinAccountsSection([]).boxes.length, 0);
});

test('the pages: private, Leave this page, Keep this, the lawyer line, no partner 1 / partner 2', () => {
  for (const f of ['heirs.html', 'married.html']) assert.match(read(f), /<script type="module" src="js\/solo\/estate\.js"><\/script>/);
  const src = read('js/solo/estate.js');
  assert.match(src, /boot\(page, api => DRAW\[page\]\(api, D\), \{ private: true \}\)/); assert.match(src, /keepCard\(api\)\);\n  withExit\(\{ neutral: true \}\);/);
  for (const f of ['js/solo/estate.js', 'game/features/estate.js', 'js/math/estate.js']) { const s = read(f); assert.doesNotMatch(s, /[Pp]artner (1|2|one|two)\b/); assert.ok(!s.includes(String.fromCharCode(0x2014))); assert.equal(blameIn(s).length, 0, f); }
});

test('the game\'s copy is current', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('tools/game_estate_build.mjs', root)), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
