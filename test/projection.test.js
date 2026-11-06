// The year-by-year projection engine, the core (Batch 50, M9P, js/math/projection.js; docs/engines/projection.md).
// 1. Parity: with the new parts off (mode 'today') the engine gives today's FI date (M53), debt-free date (M31, M34)
//    and Next 12 months for every persona and the Demo client, to the month. With them on (the default, 'plan'), every
//    household gives the same numbers except the ones listed in PLAN_DIFFERS, each with its reason.
// 2. The hand-built spreadsheets (tools/projection/build.mjs): Maya, Alexis, Tom and Priya and Dev rebuilt in plain
//    formulas, recalculated by LibreOffice: the engine matches them to the dollar in year 1 and within 1% at year 30.
// 3. The parts: limits by age, a raise, the withdrawal order, no silent loan, events, the cache and speed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importFile, Store } from '../js/records.js';
import { metrics } from '../js/math/metrics.js';
import { fiDate, changeAt } from '../js/math/fi.js';
import { surplusIn } from '../js/math/changes.js';
import { compareOf } from '../js/math/proposed.js';
import { householdFromInputs } from '../js/demo.js';
import { ownPlanPerson } from '../js/registry/couples.js';
import { project, contributionLimit, bucketOf, peopleOf, eventsFromProposed, WITHDRAW_ORDER } from '../js/math/projection.js';
import { loadDefs } from '../tools/personas/build.mjs';
import { loadExcel, soffice, missing as WB_MISSING } from '../tools/workbook-check.mjs';
import { buildBook, sheetInputs, recalculated, valueOf, CHECK_IDS, OUT_DIR, personaDoc } from '../tools/projection/build.mjs';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T12:00:00.000Z');
const defs = await loadDefs();
const load = id => { const r = importFile(readFileSync(new URL(`../fixtures/personas/${id}.json`, import.meta.url), 'utf8')); return r.doc ?? r; };
const demo = () => householdFromInputs(JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url))).inputs, { now: now.toISOString() });
const CASES = [...defs.map(d => ({ id: d.id, doc: () => load(d.id), view: d.view ?? null })), { id: 'demo', doc: demo, view: null }];
const sum = row => (row || []).reduce((s, v) => s + v, 0);

// Where the full engine ('plan') gives a different FI date from today's M53, and why. Lena and Marco: work stops at
// 65 in the engine and never in M53. The others: the debts that sit
// inside the monthly numbers (a car loan, a student loan) are paid off before FI; today's math keeps paying them
// forever, the engine gives the payments back to the month once the last debt is gone, and that money is invested.
// Which is right: the engine (QUESTIONS, Batch 50). The debt-free date and Next 12 months match everywhere.
export const PLAN_DIFFERS = {
  'couple-separate': { fi: 279, why: 'Jordan\'s student loan is the last debt, gone in month 110; its $210 a month comes back and is invested, so FI comes 9 months sooner than M53\'s 288.' },
  teacher: { fi: 334, why: 'The student loan is gone in month 72; its $263 a month comes back and is invested, so FI comes 30 months sooner than M53\'s 364.' },
  'aca-couple': { fi: null, why: 'M53 puts Lena and Marco\'s FI at 525 months (Lena 83) because it keeps them working until then; the engine stops work at 65 (Retire by is blank), so FI never comes and the money runs out at 73 (QUESTIONS, Batch 50: work stops at 65).' },
  demo: { fi: 264, why: 'The car loan ($320) and the student loan ($210) are gone by month 54; today\'s math rolls the car payment into the student loan and then drops both, the engine gives the $530 a month back once the last is gone, so FI comes 30 months sooner than M53\'s 294.' },
};

test('parity: with the new parts off, the engine gives M53, the one debt plan and Next 12 months for every household', () => {
  for (const c of CASES) {
    const doc = c.doc();
    const m = metrics(doc, ref, { now, person: c.view });
    const T = project(doc, ref, { now, person: c.view, mode: 'today' });
    assert.equal(T.fiMonths, m.monthsToFi.never ? null : m.monthsToFi.value, `${c.id}: FI months`);
    assert.equal(T.debtFreeMonths, m.debtPlan.months, `${c.id}: debt free`);
    assert.equal(T.heavyMonths, m.debtPlan.heavyMonths, `${c.id}: heavy debt gone`);
    assert.ok(Math.abs(T.start.netWorth - m.netWorth.value) < 0.01, `${c.id}: net worth today (M40)`);
    const inv = m.investing, b = inv.before, going = k => (b && k < b.months ? b.monthly : inv.monthly + changeAt(inv.changes, k));
    const fixed = T.start.debt - sum(m.debtPlan.path[0]);
    for (let k = 0; k < 12; k++) {
      const mo = T.months[k];
      assert.ok(Math.abs(mo.surplus - surplusIn(m.surplus.value, m.inputs.changes, k).value) < 0.005, `${c.id} month ${k + 1}: the surplus with the changes ahead (M27)`);
      assert.ok(Math.abs(mo.toInvested - going(k)) < 0.005, `${c.id} month ${k + 1}: what goes into investments (M53)`);
      assert.ok(Math.abs(mo.debt - fixed - sum(m.debtPlan.path[Math.min(k + 1, m.debtPlan.path.length - 1)])) < 0.005, `${c.id} month ${k + 1}: what is owed (M34)`);
    }
  }
});

test('parity: the full engine gives the same dates, except where PLAN_DIFFERS says why', () => {
  const seen = new Set();
  for (const c of CASES) {
    const doc = c.doc();
    const m = metrics(doc, ref, { now, person: c.view });
    const P = project(doc, ref, { now, person: c.view });
    const today = m.monthsToFi.never ? null : m.monthsToFi.value;
    const want = PLAN_DIFFERS[c.id];
    if (want) { seen.add(c.id); assert.equal(P.fiMonths, want.fi, `${c.id}: ${want.why}`); assert.notEqual(P.fiMonths, today); }
    else assert.equal(P.fiMonths, today, `${c.id}: FI months as M53 (add it to PLAN_DIFFERS with the reason if the engine is right to differ)`);
    assert.equal(P.debtFreeMonths, m.debtPlan.months, `${c.id}: debt free`);
    for (let k = 0; k < 12; k++) assert.ok(Math.abs(P.months[k].surplus - surplusIn(m.surplus.value, m.inputs.changes, k).value) < 0.005 || (m.debtPlan.months != null && k >= m.debtPlan.months), `${c.id} month ${k + 1}: Next 12 months`);
  }
  assert.deepEqual([...seen].sort(), Object.keys(PLAN_DIFFERS).sort(), 'every listed difference is still a difference');
});

test('Current vs Proposed as events: the engine gives the Proposed side\'s FI date and debt-free date', () => {
  const tries = [['maya', { spending: 3200, extraDebt: 100 }], ['tom', { fiAge: 45, investSurplus: false }], ['alexis', { extraIncome: 300 }], ['couple-joint', { debtOrder: 'snowball', spending: 5800 }], ['bartender', { extraIncome: 250, debtOrder: 'snowball' }]];
  for (const [id, proposed] of tries) {
    const doc = load(id);
    doc.program = { ...(doc.program || {}), proposed };
    const events = eventsFromProposed(doc);
    assert.equal(events.length, Object.keys(proposed).length);
    const C = compareOf(doc, ref, { now });
    const T = project(doc, ref, { now, person: ownPlanPerson(doc), mode: 'today', events });
    assert.equal(T.fiMonths, C.proposed.fiMonths, `${id}: Proposed FI`);
    assert.equal(T.debtFreeMonths, C.proposed.debtMonths ?? T.debtFreeMonths, `${id}: Proposed debt free`);
  }
});

test('a later event moves the surplus from its month on, through the debt plan and the FOO flow', () => {
  const doc = load('maya'), m = metrics(doc, ref, { now });
  const ev = [{ at: 40, kind: 'spending', value: 500 }];
  const T = project(doc, ref, { now, mode: 'today', events: ev });
  const want = fiDate({ invested: m.inputs.invested, monthlyInvesting: m.investing.monthly, realReturn: m.inputs.realReturn, target: m.fiNumber.value }, { from: now, before: m.investing.before, changes: [...m.investing.changes, { at: 40, monthly: -500 }] });
  assert.equal(T.fiMonths, want.value, 'the same as M53 with that change ahead');
  assert.ok(T.fiMonths > m.monthsToFi.value);
  assert.equal(project(doc, ref, { now, mode: 'today', events: [{ at: 40, kind: 'spending', value: 0 }] }).fiMonths, m.monthsToFi.value, 'a zero change changes nothing');
  const early = project(doc, ref, { now, mode: 'today', events: [{ at: 2, kind: 'income', value: 500 }] });
  assert.ok(early.debtFreeMonths <= m.debtPlan.months && early.fiMonths < m.monthsToFi.value, 'more income in month 3 goes to the card first, then on');
  const one = project(doc, ref, { now, mode: 'today', events: [{ at: 50, kind: 'oneOff', value: 3000 }] });
  assert.ok(one.fiMonths >= m.monthsToFi.value, 'a one-off cost in month 51');
});

test('contribution limits by age, from the reference data', () => {
  assert.equal(contributionLimit('401k', 49, ref), 24500);
  assert.equal(contributionLimit('401k', 50, ref), 32500);
  assert.equal(contributionLimit('401k', 60, ref), 35750);
  assert.equal(contributionLimit('401k', 64, ref), 32500);
  assert.equal(contributionLimit('ira', 49, ref), 7500);
  assert.equal(contributionLimit('ira', 50, ref), 8600);
  assert.equal(contributionLimit('hsa', 54, ref), 4400);
  assert.equal(contributionLimit('hsa', 55, ref, { family: true }), 9750);
  assert.equal(contributionLimit('total', 40, ref), 72000);
  assert.deepEqual(['Roth IRA', '401(k)', 'HSA', 'Brokerage', 'All investments', 'Traditional IRA'].map(t => bucketOf(t)), ['roth', 'pretax', 'hsa', 'taxable', 'taxable', 'pretax']);
  assert.equal(bucketOf('401(k)', 'Roth'), 'roth');
});

test('the 401(k) is held to the limit for that age, with the catch-up from the year Tom turns 50; pay over it comes back', () => {
  const doc = load('tom');
  doc.assumptions = { ...doc.assumptions, fiAge: 60 }; // so he is still working at 50
  const job = doc.records.find(r => r.kind === 'income' && r.type === 'Job');
  job.values = { ...job.values, contributionPct: 0.25 }; // $46,250 a year wanted
  const P = project(doc, ref, { now });
  // Plan years run Nov to Oct: year 11 is Nov 2036 to Oct 2037 (the limit was reached by Nov 2036, so Jan to Oct 2037).
  assert.ok(Math.abs(P.years[10].k401 - 24500) < 0.01, `2037, age 49: ${P.years[10].k401}`);
  assert.ok(Math.abs(P.years[11].k401 - 32500) < 0.01, `2038, the year he turns 50: ${P.years[11].k401}`);
  assert.ok(Math.abs(P.years[12].k401 - 32500) < 0.01, `2039: ${P.years[12].k401}`);
  assert.ok(P.years[11].limited > 0, 'the part over the limit is counted');
  const same = load('tom'); same.assumptions = { ...same.assumptions, fiAge: 60 };
  const base = project(same, ref, { now }), want = project(doc, ref, { now, mode: 'today' });
  assert.ok(P.years[5].takeHome > base.years[5].takeHome + 1000, 'pay over the limit comes back as take-home, after the marginal rate');
  assert.ok(P.years[5].takeHome - base.years[5].takeHome < P.years[5].limited, 'less than the pay itself');
  assert.ok(want.years[5].k401 > P.years[5].k401, 'with the parts off there is no limit');
});

test('a raise is taxed by today\'s tax function and moves FI sooner', () => {
  const doc = load('tom');
  const flat = project(doc, ref, { now }), up = project(doc, ref, { now, incomeGrowth: 0.02 });
  const g1 = flat.years[1].takeHome, g2 = up.years[1].takeHome;
  assert.ok(g2 > g1, 'year 2 take-home is higher');
  assert.ok(g2 - g1 < 185000 * 0.02, 'but less than the raise before tax');
  assert.ok(up.fiMonths < flat.fiMonths);
  assert.equal(up.years[0].takeHome, flat.years[0].takeHome, 'year 1 is today\'s');
});

test('once work stops: cash first, then taxable, Roth, HSA and pretax; before 59½ a pretax draw is flagged', () => {
  assert.deepEqual(WITHDRAW_ORDER, ['cash', 'taxable', 'roth', 'hsa', 'pretax']);
  const P = project(load('tom'), ref, { now });
  const stop = P.flags.find(f => f.kind === 'stop');
  assert.equal(stop.age, 50);
  assert.equal(stop.ym, '2038-06');
  const y13 = P.years[12];
  assert.equal(y13.end.cash, 0, 'the cash went first');
  assert.ok(y13.out.taxable > 0 && !y13.out.pretax, 'then the brokerage; pretax untouched while taxable is there');
  assert.equal(P.lastsToAge, null, 'it lasts to Plan to age');
  const J = project(load('job-loss'), ref, { now });
  assert.ok(J.flags.some(f => f.kind === 'early'), 'between jobs, a draw from a 401(k) before 59½ is flagged (the penalty is not in yet)');
});

test('a shortfall while working is never borrowed (Alexis)', () => {
  const doc = load('alexis'), m = metrics(doc, ref, { now }), P = project(doc, ref, { now });
  assert.equal(P.fiMonths, null);
  assert.ok(P.flags.some(f => f.kind === 'shortfall' && f.year === 1));
  assert.equal(P.years[0].unmet, 12 * 200 - 400, '$200 short a month, the $400 in checking covers two months');
  assert.ok(P.years.every(y => y.end.invested === 0 && y.end.debt <= sum(m.debtPlan.path[0]) + 0.01), 'nothing borrowed, nothing invested');
  assert.equal(P.debtFreeMonths, 57);
});

test('people, ages and the dual-age view for a couple', () => {
  const doc = load('couple-joint');
  const people = peopleOf(doc, ref, now);
  assert.deepEqual(people.map(p => [p.key, Math.floor(p.ageMonths / 12)]), [['Me', 35], ['Partner', 36]]);
  const P = project(doc, ref, { now });
  assert.equal(P.dualAge.length, 2);
  assert.deepEqual(P.years[29].ages, { Me: 65, Partner: 66 });
  assert.equal(P.years.length, Math.ceil((90 * 12 - people[0].ageMonths) / 12), 'through Plan to age for the younger');
  assert.ok(P.flags.some(f => f.kind === 'age' && f.person === 'Partner' && f.age === 59.5));
});

test('pure, deterministic, cached per input version, and fast (a full run under 30 ms for Maya)', () => {
  const a = project(load('maya'), ref, { now }), b = project(load('maya'), ref, { now });
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  const doc = load('maya');
  const s = new Store(doc);
  const first = project(s.doc, ref, { now });
  assert.equal(project(s.doc, ref, { now }), first, 'the same input version gives the cached run');
  const rec = s.doc.records.find(r => r.kind === 'spending');
  s.update(rec.id, { amount: 3300 });
  const again = project(s.doc, ref, { now });
  assert.notEqual(again, first);
  assert.ok(again.fiMonths < first.fiMonths, 'a new version is worked out again');
  const times = [];
  for (let i = 0; i < 7; i++) { const d = load('maya'); const t = performance.now(); project(d, ref, { now }); times.push(performance.now() - t); }
  times.sort((p, q) => p - q);
  assert.ok(times[3] < 30, `median full run ${times[3].toFixed(1)} ms (metrics included)`);
});

// ---------- The hand-built spreadsheets ----------
test('the hand-built spreadsheets are in the repo', () => {
  for (const id of CHECK_IDS) assert.ok(existsSync(join(OUT_DIR, `${id}.xlsx`)), `${id}.xlsx (node tools/projection/build.mjs)`);
});

const ExcelJS = loadExcel();
test('the engine matches the hand-built spreadsheets: to the dollar in year 1, within 1% at year 30', { skip: WB_MISSING, timeout: 300000 }, async () => {
  for (const id of CHECK_IDS) {
    const doc = personaDoc(id);
    const P = project(doc, ref, { now });
    const dir = mkdtempSync(join(tmpdir(), 'slam-proj-'));
    try {
      const { book } = await recalculated(ExcelJS, buildBook(ExcelJS, id, sheetInputs(doc)), { dir, name: id });
      const y1 = book.getWorksheet('Year 1'), ys = book.getWorksheet('Years');
      const col1 = h => y1.getRow(2).values.indexOf(h), colY = h => ys.getRow(2).values.indexOf(h);
      for (let k = 0; k < 12; k++) {
        const row = y1.getRow(3 + k), mo = P.months[k];
        for (const [h, key] of [['Surplus', 'surplus'], ['Cash', 'cash'], ['Invested', 'invested'], ['Earmarked', 'earmarked'], ['Debt', 'debt'], ['Net worth', 'netWorth']]) {
          const v = valueOf(row.getCell(col1(h)));
          assert.equal(typeof v, 'number', `${id} month ${k + 1} ${h}: the sheet has a number (${JSON.stringify(v)})`);
          assert.ok(Math.abs(v - mo[key]) < 1, `${id} month ${k + 1} ${h}: sheet ${v.toFixed(2)}, engine ${mo[key].toFixed(2)}`);
        }
      }
      const y30 = ys.getRow(32), end = P.years[29].end;
      assert.equal(y30.getCell(1).value, 30);
      for (const [h, key] of [['Cash', 'cash'], ['Invested', 'invested'], ['Earmarked', 'earmarked'], ['Debt', 'debt'], ['Net worth', 'netWorth']]) {
        const v = valueOf(y30.getCell(colY(h)));
        assert.ok(Math.abs(v - end[key]) <= Math.max(1, 0.01 * Math.abs(end[key])), `${id} year 30 ${h}: sheet ${Math.round(v)}, engine ${Math.round(end[key])}`);
      }
      const unmet = P.years.slice(0, 30).reduce((s, q) => s + q.unmet, 0), notCovered = valueOf(y30.getCell(colY('Not covered (so far)')));
      assert.ok(Math.abs(notCovered - unmet) <= Math.max(1, 0.01 * unmet), `${id}: not covered by year 30, sheet ${notCovered}, engine ${unmet}`);
      const ages = valueOf(y30.getCell(colY('Age at its end')));
      assert.equal(ages, P.years[29].ages.Me, `${id}: age at year 30`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});
