// Recalculating (js/math/recalc.js): the route, the triage, the refill, the safe-to-fail line, the month and the
// opt-in audit. The game runs a copy of the same file (game/core/recalc.js); the last tests hold the two together.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import * as RC from '../js/math/recalc.js';

const { RC_SCRIPTS_REVIEWED, rcScriptsFor, RC_MUST, RC_SCRIPTS } = RC;
const { rcYm, rcAddMonths, rcMonthsBetween, rcMonthName, rcSpan, rcRoute, rcHoldExtra, rcWords, rcTriage, rcScript, rcClassOf, rcRefill, rcSafeLine, rcMonthState, rcAudit, RC_ORDER } = RC;

test('months: add, between, names', () => {
  assert.equal(rcYm('2026-11-25T10:00:00Z'), '2026-11');
  assert.equal(rcAddMonths('2026-11', 3), '2027-02');
  assert.equal(rcAddMonths('2026-01', -1), '2025-12');
  assert.equal(rcMonthsBetween('2026-11', '2027-02'), 3);
  assert.equal(rcMonthName('2027-02'), 'Feb 2027');
  assert.equal(rcSpan(1), '1 month'); assert.equal(rcSpan(14), '1 year and 2 months'); assert.equal(rcSpan(-24), '2 years');
  assert.equal(rcAddMonths(null, 3), null);
});

test('the route: the old date, the new date from today, and the shift', () => {
  // kept in Sep 2026 with 30 months to go: Mar 2029. Today (Nov 2026) the numbers say 31 months: Jun 2029.
  const r = rcRoute({ planAt: '2026-09-03', planMonths: 30, nowAt: '2026-11-25', months: 31 });
  assert.deepEqual({ moved: r.moved, later: r.later, oldYm: r.oldYm, newYm: r.newYm, shift: r.shift }, { moved: true, later: true, oldYm: '2029-03', newYm: '2029-06', shift: 3 });
  // on the plan: two months passed and two fewer to go, so nothing moved
  assert.equal(rcRoute({ planAt: '2026-09-03', planMonths: 30, nowAt: '2026-11-25', months: 28 }).moved, false);
  // sooner
  const s = rcRoute({ planAt: '2026-09-03', planMonths: 30, nowAt: '2026-11-25', months: 25 });
  assert.equal(s.later, false); assert.equal(s.shift, -3);
  // nothing kept, or nothing to compare: no card (empty is not zero)
  assert.equal(rcRoute({ planAt: null, planMonths: 30, nowAt: '2026-11-25', months: 31 }), null);
  assert.equal(rcRoute({ planAt: '2026-09-03', planMonths: null, nowAt: '2026-11-25', months: 31 }), null);
  // no date on today's numbers while the goal is open
  const n = rcRoute({ planAt: '2026-09-03', planMonths: 30, nowAt: '2026-11-25', months: null, open: true });
  assert.equal(n.noDate, true); assert.equal(n.newYm, null);
  assert.equal(rcRoute({ planAt: '2026-09-03', planMonths: 30, nowAt: '2026-11-25', months: null, open: false }), null);
});

test('the route starts from today: the same months to go, kept later, is a later date', () => {
  const a = rcRoute({ planAt: '2026-01-10', planMonths: 12, nowAt: '2026-06-10', months: 12 });
  assert.equal(a.newYm, '2027-06'); assert.equal(a.shift, 5);
});

test('the extra a month that brings the old date back uses the app\'s own plan', () => {
  const run = extra => Math.ceil(12000 / (400 + extra)); // a stand-in for the one debt plan
  assert.equal(rcHoldExtra(run, 27), 50); // 12000/450 = 26.7 -> 27
  assert.equal(rcHoldExtra(run, 1, { max: 500 }), null);
  assert.equal(rcHoldExtra(null, 10), null);
});

test('the words of the card never blame', () => {
  const r = rcRoute({ planAt: '2026-09-03', planMonths: 30, nowAt: '2026-11-25', months: 31 });
  const w = rcWords(r, { what: 'Debt free', hold: 75 });
  assert.equal(w.title, 'Recalculating');
  assert.equal(w.line, 'Debt free was Mar 2029. From where you are today it is Jun 2029, 3 months later.');
  assert.equal(w.next, '$75 more a month brings Mar 2029 back.');
  const all = [w.title, w.line, w.next, rcWords(r, { what: 'Debt free' }).next, rcWords({ ...r, noDate: true, newYm: null }, {}).line].join(' ');
  assert.doesNotMatch(all, /mistake|failed|behind|off track/i);
  assert.equal(rcWords({ moved: false }), null);
  assert.equal(w.win, false);
});

test('a date that moves sooner reads as a win: New route, and how much sooner', () => {
  const s = rcRoute({ planAt: '2026-09-03', planMonths: 30, nowAt: '2026-11-25', months: 25 });
  const w = rcWords(s, { what: 'Debt free' });
  assert.equal(w.win, true); assert.equal(w.title, 'New route'); assert.equal(w.head, 'New route: 3 months sooner');
  assert.equal(w.line, 'New route: 3 months sooner. Debt free was Mar 2029. From where you are today it is Dec 2028.');
  // later keeps the calm words
  const l = rcWords(rcRoute({ planAt: '2026-09-03', planMonths: 30, nowAt: '2026-11-25', months: 31 }), { what: 'Debt free' });
  assert.equal(l.title, 'Recalculating'); assert.equal(l.win, false); assert.equal(l.head, null);
});

test('triage: the money goes down the order, and the first group that comes up short is named', () => {
  const bills = [{ name: 'Visa minimum', cls: 'minimums', amount: 120 }, { name: 'Streaming', cls: rcClassOf('Streaming'), amount: 40 }, { name: 'Rent', cls: rcClassOf('Rent or mortgage'), amount: 1500 },
    { name: 'Electric', cls: rcClassOf('Electric, gas, water'), amount: 150 }, { name: 'Groceries', cls: rcClassOf('Groceries'), amount: 500 }, { name: 'Transit', cls: rcClassOf('Transit'), amount: 130 }];
  const t = rcTriage({ income: 2300, bills });
  assert.deepEqual(t.rows.map(r => r.name), ['Rent', 'Electric', 'Groceries', 'Transit', 'Visa minimum', 'Streaming']);
  assert.equal(t.total, 2440); assert.equal(t.short, 140); assert.equal(t.covered, false);
  assert.deepEqual(t.rows.map(r => r.paid), [1500, 150, 500, 130, 20, 0]);
  assert.equal(t.firstShort, 'minimums');
  assert.equal(t.rows.reduce((s, r) => s + r.paid, 0), 2300);
  const g = t.groups.find(x => x.cls === 'minimums');
  assert.deepEqual(rcScript(g).say[0], 'I have had a drop in income. This month I can pay $20 toward the minimum of $120.');
  // enough income: nothing short
  const ok = rcTriage({ income: 3000, bills });
  assert.equal(ok.covered, true); assert.equal(ok.left, 560); assert.equal(ok.firstShort, null);
  // unknown income is not zero income
  assert.equal(rcTriage({ income: null, bills }), null);
  // a bill with no amount is open, and takes nothing
  assert.equal(rcTriage({ income: 100, bills: [{ name: 'Rent', cls: 'housing', amount: null }] }).open, 1);
  assert.deepEqual(RC_ORDER.map(o => o[0]), ['housing', 'utilities', 'food', 'health', 'childcare', 'transport', 'minimums', 'rest']);
  assert.deepEqual(RC_MUST, ['housing', 'utilities', 'food', 'health', 'childcare']);
  assert.equal(RC_ORDER.find(o => o[0] === 'childcare')[1], 'Childcare, if it lets you keep working');
  assert.equal(rcClassOf('Wants, travel, gifts'), 'rest');
});

test('health insurance, medicine and childcare are paid right after housing, utilities and food', () => {
  assert.equal(rcClassOf('Health insurance'), 'health'); assert.equal(rcClassOf('Prescriptions'), 'health');
  assert.equal(rcClassOf('Kids', 'Childcare and babysitting'), 'childcare', 'the line name decides inside the Kids category');
  assert.equal(rcClassOf('Kids', 'Toys, birthdays, school supplies'), 'rest');
  const bills = [{ name: 'Car', cls: 'transport', amount: 300 }, { name: 'Daycare', cls: rcClassOf('Kids', 'Daycare'), amount: 800 }, { name: 'Visa', cls: 'minimums', amount: 100 },
    { name: 'Insurance', cls: rcClassOf('Health insurance'), amount: 400 }, { name: 'Rent', cls: 'housing', amount: 1500 }, { name: 'Groceries', cls: 'food', amount: 500 }];
  const t = rcTriage({ income: 3300, bills });
  assert.deepEqual(t.rows.map(r => r.name), ['Rent', 'Groceries', 'Insurance', 'Daycare', 'Car', 'Visa']);
  assert.deepEqual(t.rows.map(r => r.paid), [1500, 500, 400, 800, 100, 0]);
  assert.equal(t.firstShort, 'transport');
});

test('the phone scripts stay in the code for review and reach no screen while the switch is off', () => {
  assert.equal(RC_SCRIPTS_REVIEWED, false, 'Eli has not reviewed the scripts yet (QUESTIONS 581). Turn this on only with that review.');
  const t = rcTriage({ income: 100, bills: [{ name: 'Rent', cls: 'housing', amount: 900 }] });
  assert.equal(rcScriptsFor(t), null);
  assert.equal(rcScriptsFor(t, true).length, 1);
  for (const [cls] of RC_ORDER) assert.ok(RC_SCRIPTS[cls]?.say.length, `${cls} has words to review`);
});

test('the emergency fund refill: the gap, the months and the month it is whole', () => {
  const r = rcRefill({ target: 6000, balance: 4200, monthly: 250, nowAt: '2026-11-25' });
  assert.deepEqual({ gap: r.gap, months: r.months, ym: r.ym }, { gap: 1800, months: 8, ym: '2027-07' });
  assert.equal(rcRefill({ target: 6000, balance: 6500, monthly: 250, nowAt: '2026-11-25' }).full, true);
  assert.equal(rcRefill({ target: 6000, balance: 4200, monthly: null }).months, null);
  assert.equal(rcRefill({ target: null, balance: 4200, monthly: 250 }), null);
  assert.equal(rcRefill({ target: 6000, balance: null, monthly: 250 }), null);
});

test('a safe-to-fail line can run out and the plan sees the same cost', () => {
  assert.deepEqual(rcSafeLine({ cap: 100, spent: 100 }), { cap: 100, spent: 100, left: 0, ranOut: true, over: 0, planCost: 100 });
  assert.equal(rcSafeLine({ cap: 100, spent: 30 }).planCost, 100);
  assert.equal(rcSafeLine({ cap: 100, spent: 130 }).over, 30);
  assert.equal(rcSafeLine({ cap: 100, spent: null }).ranOut, false);
  assert.equal(rcSafeLine({ cap: null, spent: 20 }), null);
});

test('the month: done when nothing needs attention, hard when the date moved later', () => {
  assert.deepEqual(rcMonthState({}), { hard: false, done: true, needs: [] });
  const later = rcRoute({ planAt: '2026-09-03', planMonths: 30, nowAt: '2026-11-25', months: 31 });
  assert.deepEqual(rcMonthState({ routes: [later] }), { hard: true, done: false, needs: ['route'] });
  const sooner = rcRoute({ planAt: '2026-09-03', planMonths: 30, nowAt: '2026-11-25', months: 25 });
  assert.equal(rcMonthState({ routes: [sooner] }).hard, false);
  assert.equal(rcMonthState({ refill: rcRefill({ target: 100, balance: 50, monthly: 10 }) }).hard, true);
  assert.equal(rcMonthState({ open: 2 }).done, false);
});

test('the audit: cost then, cost over time, FI days, hours, repeats and the yearly share', () => {
  const events = [{ id: 'a', what: 'Late fee', kind: 'Late fee', amount: 40, tag: 'mistake', yearsAgo: 0.2 }, { id: 'b', what: 'Late fee again', kind: 'Late fee', amount: 40, tag: 'mistake', yearsAgo: 0.5 },
    { id: 'c', what: 'Transmission', kind: 'Car repair', amount: 2000, tag: 'unavoidable', yearsAgo: 2 }, { id: 'd', what: 'Not sure yet', kind: 'Other', amount: 300, tag: null, yearsAgo: 1 }, { id: 'e', what: 'No amount', kind: 'Other', amount: null, tag: 'mistake', yearsAgo: 1 }];
  const A = rcAudit({ events, realReturn: 0.05, years: 20, perDay: 20, hourly: 25, yearIncome: 48000 });
  assert.equal(A.mistake.count, 2); assert.equal(A.mistake.cost, 80); assert.equal(A.unavoidable.cost, 2000);
  assert.equal(A.untagged, 1); assert.equal(A.open, 1);
  assert.ok(Math.abs(A.rows[0].later - 40 * 1.05 ** 20.2) < 1e-9);
  assert.equal(A.rows[0].fiDays, 2); assert.equal(A.rows[0].hours, 1.6); assert.equal(A.mistake.fiDays, 4);
  assert.deepEqual(A.repeats, [{ kind: 'Late fee', count: 2, cost: 80 }]);
  assert.ok(Math.abs(A.tax - 80 / 48000) < 1e-12);
  // nothing known about the plan: the dollars then still show, the rest stays empty
  const B = rcAudit({ events });
  assert.equal(B.rows[0].later, null); assert.equal(B.rows[0].fiDays, null); assert.equal(B.tax, null); assert.equal(B.mistake.later, null);
  assert.equal(A.measure, 'fiDays'); assert.equal(B.measure, null);
});

test('the guard: with a day of saving at zero or less there are no FI days, and hours of work stand in', () => {
  const events = [{ id: 'a', kind: 'Late fee', amount: 40, tag: 'mistake', yearsAgo: 0.2 }];
  for (const perDay of [0, -12, null]) {
    const G = rcAudit({ events, realReturn: 0.05, years: 20, perDay, hourly: 25, yearIncome: 48000 });
    assert.equal(G.rows[0].fiDays, null, `perDay ${perDay}`); assert.equal(G.mistake.fiDays, null);
    assert.equal(G.measure, 'hours'); assert.equal(G.rows[0].hours, 1.6);
    assert.ok(Math.abs(G.tax - 40 / 48000) < 1e-12, 'the mistake tax does not depend on saving');
  }
  assert.equal(rcAudit({ events, perDay: 0, hourly: null }).measure, null);
  assert.equal(rcAudit({ events, perDay: 5, hourly: 25 }).measure, 'fiDays');
});

// ---------- one function for the web app and the game ----------
const src = readFileSync(new URL('../js/math/recalc.js', import.meta.url), 'utf8');
const copy = readFileSync(new URL('../game/core/recalc.js', import.meta.url), 'utf8');
test('the game\'s copy is made from this file and is current (node tools/game_recalc_build.mjs)', () => {
  const hash = createHash('sha256').update(src).digest('hex').slice(0, 16);
  assert.match(copy, new RegExp(`SOURCE-HASH  ${hash}`), 'js/math/recalc.js changed: run node tools/game_recalc_build.mjs, then the game steps (prettier, stamp, code map)');
});
test('the game\'s copy gives the same answers', () => {
  const box = {}; vm.createContext(box);
  vm.runInContext(`${copy}\n;this.out = { ${Object.keys(RC).join(', ')} };`, box);
  for (const k of Object.keys(RC)) assert.ok(k in box.out, `${k} is in the game copy`);
  const j = v => JSON.parse(JSON.stringify(v));
  const cases = [
    ['rcRoute', { planAt: '2026-09-03', planMonths: 30, nowAt: '2026-11-25', months: 31 }],
    ['rcTriage', { income: 2300, bills: [{ name: 'A', cls: 'minimums', amount: 120 }, { name: 'B', cls: 'housing', amount: 2250 }] }],
    ['rcRefill', { target: 6000, balance: 4200, monthly: 250, nowAt: '2026-11-25' }],
    ['rcSafeLine', { cap: 100, spent: 130 }],
    ['rcAudit', { events: [{ id: 'a', kind: 'Late fee', amount: 40, tag: 'mistake', yearsAgo: 0.2 }], realReturn: 0.05, years: 20, perDay: 20, hourly: 25, yearIncome: 48000 }],
  ];
  for (const [fn, x] of cases) assert.deepEqual(j(box.out[fn](x)), j(RC[fn](x)), fn);
});
