// SPDX-License-Identifier: AGPL-3.0-only
// Ratios on Key numbers, for the coach app (run Not built, groups 1 to 5, Part 9, Nov 26 2026). Pure: no DOM. It reads
// the numbers the app already works out (metrics(): net worth M40, cash, the debts, income, take-home, fixed and
// variable from the flow, the Rule of 5 target M43, the match; the ledger of Lifestyle creep; the Confidence rating
// and the scorecard) and hands them to js/math/ratios.js, the same functions the game runs. Nothing here works a number
// out a second way: the only sums are of the rows of one kind (the short-term debts, the home, the HSA).
// Each line's level (Guess, Close, Exact) comes from the Picture: the lowest level of the inputs it reads.
import * as R from './math/ratios.js';
import { pictureOf } from './math/picture.js';
import { LEVELS } from './registry/program.js';
import { incomeKindOf } from './capture.js';
import { creepRowsOf, enoughOf } from './enough.js';
import { confidenceOf } from './program.js';
import { scorecardOf } from './math/scorecard.js';
import { CONFIDENCE } from './registry/joy.js';

const ADVANTAGED = new Set(['401(k)', '403(b)', '457', 'TSP', 'Roth IRA', 'Traditional IRA', 'Rollover IRA', 'SEP', 'Solo 401(k)', 'HSA', '529']);
const word = lv => (lv == null ? null : lv >= LEVELS.Actual ? 'Exact' : lv >= LEVELS.Estimate ? 'Close' : 'Guess');
const sumOf = (rows, f) => rows.reduce((s, r) => s + (f(r) ?? 0), 0);

// The level of each Picture group (the lowest answered item in it).
function levelsOf(pic) {
  const by = {};
  for (const it of pic.items || []) {
    if (!(it.level > LEVELS.Missing)) continue;
    for (const g of [it.group, it.sub].filter(Boolean)) by[g] = Math.min(by[g] ?? Infinity, it.level);
  }
  return groups => groups.map(g => word(Number.isFinite(by[g]) ? by[g] : null)).filter(Boolean);
}

// Every line of Ratios, in the order of RA_LINES, each with its result. Lines with no inputs in this app are left out
// (RA_WEB_OUT says why).
export const RA_WEB_OUT = { windfall: 'the windfall steps live in the game for now (Got extra money?)' };
export function ratiosOf(doc, ref, m, { now = new Date() } = {}) {
  const x = m.inputs, L = levelsOf(pictureOf(doc, ref, { now }));
  const known = (rows, zeroIf) => (rows.length ? rows : zeroIf ? [] : null);
  const debts = known(x.debts.filter(d => !d.forgiven), x.none || x.gates.areas?.debt === false);
  const owned = [...x.accounts, ...x.things];
  const assets = owned.length ? sumOf(owned, r => r.value) : x.none ? 0 : null;
  const netWorth = m.netWorth.value;
  const homes = x.things.filter(t => t.type === 'Home');
  const homeValue = homes.length ? sumOf(homes, t => t.value) : null;
  const mortgage = homes.length ? sumOf(x.debts.filter(d => d.type === 'Mortgage'), d => d.balance) : null;
  const realEstate = x.things.some(t => t.type === 'Home' || t.type === 'Other property') ? sumOf(x.things.filter(t => t.type === 'Home' || t.type === 'Other property'), t => t.value) : owned.length ? 0 : null;
  const grossYear = x.grossAllAnnual ?? x.grossAnnual ?? null;
  const health = (doc.records || []).find(r => r.kind === 'coverage' && r.type === 'Health' && r.values?.oopMax != null);
  const hsa = sumOf(x.accounts.filter(a => a.type === 'HSA'), a => a.value);
  const inv = x.accounts.filter(a => a.group === 'investment');
  const job = x.income.find(i => i.r === x.link?.job) ?? null;
  const incomeTotal = x.income.length ? sumOf(x.income, i => i.gross) : null;
  const E = enoughOf(doc, ref, m, { now });
  const growth = E.creep.ready ? E.creep.income.growth : null;
  const sc = scorecardOf(doc, ref, { now }), conf = confidenceOf(doc);
  const spendYear = x.retirementSpending == null ? null : x.retirementSpending * 12;
  const out = {
    current: R.raCurrent({ cash: x.cash, shortDebt: debts && sumOf(debts.filter(d => R.raIsShort(d.type)), d => d.balance), levels: L(['account', 'debt']) }),
    health: R.raHealth({ cash: x.cash, hsa, oopMax: health?.values.oopMax ?? null, levels: L(['account']) }),
    selfins: R.raSelfInsure({ cash: x.cash, target: m.ruleOf5.value, levels: L(['account', 'spending', 'age']) }),
    solvency: R.raSolvency({ netWorth, assets, levels: L(['account', 'thing', 'debt']) }),
    revolving: R.raRevolving({ revolving: debts && sumOf(debts.filter(d => R.raIsRevolving(d.type)), d => d.balance), total: debts && sumOf(debts, d => d.balance), levels: L(['debt']) }),
    mix: R.raCreditMix({ kinds: debts && debts.filter(d => d.balance > 0).map(d => d.type), levels: L(['debt']) }),
    intprin: R.raInterestPrincipal({ debts: debts && debts.filter(d => !d.inFull).map(d => ({ balance: d.balance, apr: d.apr, payment: d.payment })), levels: L(['debt']) }),
    equity: R.raHomeEquity({ homeValue, mortgage, netWorth, levels: L(['thing', 'debt']) }),
    ltv: R.raLtv({ mortgage, homeValue, levels: L(['thing', 'debt']) }),
    priceinc: R.raPriceIncome({ homeValue, grossYear, levels: L(['thing', 'income']) }),
    realestate: R.raRealEstate({ realEstate, assets, levels: L(['thing', 'account']) }),
    discretionary: R.raDiscretionary({ takeHome: m.flow.takeHome, fixed: m.flow.fixed, levels: L(['income', 'spending']) }),
    fixedvar: R.raFixedShare({ fixed: m.flow.fixed, variable: m.flow.variable, levels: L(['spending']) }),
    volatility: R.raVolatility({ rows: creepRowsOf(doc) }),
    side: R.raSideShare({ side: x.income.length ? sumOf(x.income.filter(i => incomeKindOf(i.r) === 'Side hustle'), i => i.gross) : null, total: incomeTotal, levels: L(['income']) }),
    totalcomp: R.raTotalComp({ base: job?.gross ?? null, bonus: job?.r.values.bonus ?? 0, match: m.matchMonthly == null ? 0 : m.matchMonthly * 12, levels: L(['income']) }),
    realwage: R.raRealWage({ growth, inflation: ref.cpi?.value ?? null, levels: growth == null ? [] : [E.creep.incomeLevel] }),
    replace: R.raReplacement({ spendYear, grossYear, levels: L(['spending', 'income']) }),
    investnw: R.raInvestNw({ invested: x.invested, netWorth, levels: L(['account', 'thing', 'debt']) }),
    nwincome: R.raNwIncome({ netWorth, grossYear, levels: L(['account', 'thing', 'debt', 'income']) }),
    human: R.raHumanCapital({ grossYear, age: x.age, retireAge: x.retireAge, realReturn: x.realReturn, financial: x.cash == null || x.invested == null ? null : x.cash + x.invested, levels: L(['income', 'account', 'age']) }),
    shelter: R.raTaxShelter({ advantaged: inv.length ? sumOf(inv.filter(a => ADVANTAGED.has(a.type)), a => a.value) : x.invested === 0 ? 0 : null, invested: inv.length ? sumOf(inv, a => a.value) : x.invested === 0 ? 0 : null, levels: L(['account']) }),
    longevity: R.raLongevity({ invested: x.invested, spendYear, age: x.age, retireAge: x.retireAge, planAge: doc.assumptions?.lifeExpectancy ?? ref.defaults?.lifeExpectancy ?? null, levels: L(['account', 'spending', 'age']) }),
    confidence: R.raConfidence({ rating: conf.value, min: CONFIDENCE.min, max: CONFIDENCE.max, good: sc.okCount, of: sc.rated }),
  };
  // A household that rents or lives with family (About you) has no home of its own: the three home lines are left out,
  // with one quiet line saying why, not three "needs" lines.
  const noHome = !homes.length && x.gates.housing != null && x.gates.housing !== 'Own';
  if (noHome) for (const id of ['equity', 'ltv', 'priceinc']) delete out[id];
  const groups = R.RA_GROUPS.map(([g, name]) => ({ g, name, note: g === 'home' && noHome ? `Not for this household: About you says ${String(x.gates.housing).toLowerCase()}, so home equity, loan to value and price to income wait for a home of your own.` : null,
    lines: R.RA_LINES.filter(l => l.g === g && out[l.id]).map(l => ({ ...l, r: out[l.id] })) })).filter(G => G.lines.length || G.note);
  return { groups, out, lit: Object.values(out).filter(r => r.value != null).length, of: Object.keys(out).length, later: [...R.RA_LATER, ...Object.entries(RA_WEB_OUT).map(([id, why]) => [R.RA_LINES.find(l => l.id === id).n, why])] };
}
