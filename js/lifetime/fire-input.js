// SPDX-License-Identifier: AGPL-3.0-only
// From a household to the FIRE sheet tab's input (js/sheet/fire.js). The numbers are the lifetime plan's own
// (lifeInputOf, the same input the Whole life screen runs), so the sheet and the screen start from one place. The
// withdrawals "from the app" are one run of js/math/lifetime.js with the way to take money out that the plan already
// has (assumptions.lifeStrategy): a way added to STRATEGIES later flows in here with no change. Pure: no DOM.
import { lifeInputOf, DEFAULTS } from './inputs.js';
import { lifetime, STRATEGIES } from '../math/lifetime.js';
import { replay, shuffle } from '../math/stress.js';

const LIFE_KEYS = { strategy: 'lifeStrategy', rate: 'lifeRate', claimAge: 'lifeClaimAge', fill: 'lifeFill', stocks: 'lifeStocks', health: 'lifeHealth', eras: 'lifeEras', retireAge: 'lifeRetireAge' };
// The Lifetime plan's choices as the journey keeps them: on the assumptions, else in the journey's own settings.
export function lifeSettingsOf(doc) {
  const a = doc.assumptions || {}, out = { ...(doc.settings?.start?.life || {}) };
  for (const [k, f] of Object.entries(LIFE_KEYS)) if (a[f] !== undefined && a[f] !== null) out[k] = a[f];
  return out;
}

// c: the workbook's context (js/sheet/context.js). hist: data/history-returns.json when the caller has it (the
// replay of market history and the random markets are left out without it).
export function fireInputOf(c, { hist = null } = {}) {
  const { doc, ref, m, now } = c, mx = m.inputs, needs = [];
  if (mx.age == null) needs.push('your birth year');
  if (mx.spending == null) needs.push('what you spend');
  if (needs.length) return { needs };
  const s = { ...DEFAULTS, ...lifeSettingsOf(doc) };
  const stopAge = Math.max(mx.age, Math.round(s.retireAge ?? mx.retireAge));
  let built; try { built = lifeInputOf({ m, age: mx.age, filled: doc }, doc, ref, s); } catch { return { needs: ['your pay, your spending and what you have invested'] }; }
  const x = { ...built.x, retireAge: stopAge };
  const method = STRATEGIES.find(t => t.id === s.strategy) ?? { id: s.strategy, name: String(s.strategy) };
  let run = null; try { run = lifetime(x, ref); } catch { run = null; }
  const carried = [];
  if (hist && run) {
    try {
      const rp = replay(x, ref, hist, { stocks: s.stocks }), sh = shuffle(x, ref, hist, { stocks: s.stocks });
      if (rp.success != null) carried.push({ label: `Past stretches of market history where the money lasted (${rp.from} to ${rp.to})`, value: rp.success, fmt: 'pct', note: 'From the app: your plan replayed from every start year on record. A spreadsheet cannot replay them, so this is a value.' });
      carried.push({ label: `Random markets where the money lasted (${sh.runs.toLocaleString('en-US')} runs)`, value: sh.success, fmt: 'pct', note: 'From the app: the same years of history in a random order. A spreadsheet cannot do this, so this is a value.' });
    } catch { /* the plan could not be replayed: the rows are left out */ }
  }
  return {
    year: now.getFullYear(), age: mx.age, stopAge, lastAge: x.planAge,
    income: x.work.income || null, incomeLabel: 'Income a year, before tax', spending: mx.spending * 12, spendingAfter: x.spendingAfter,
    invested: x.start.taxable + x.start.pretax + x.start.roth,
    contributions: [{ label: 'taxed later (401(k), traditional IRA)', amount: x.work.saving.pretax }, { label: 'Roth', amount: x.work.saving.roth }, { label: 'taxable', amount: x.work.saving.taxable }],
    realReturn: x.realReturn, safeRate: mx.withdrawalRate, other: x.ss.yearly(stopAge), otherAge: Math.max(stopAge, x.ss.claimAge), otherLabel: 'Social Security a year (today\'s dollars)',
    method: { id: method.id, name: method.name }, rate: s.rate,
    app: run ? { from: 'app', note: `The app's lifetime plan counts income tax, the three kinds of account (taxed later, Roth, taxable), health cost and your way to take money out (${method.name}).`, years: run.years.map(y => ({ age: y.age, withdrawal: y.phase === 'free' ? y.withdraw : null, balance: y.total })) } : null,
    carried,
    back: 'This tab is for trying numbers. To bring a change back into SLAM, change it on its own tab (You, Money in, Money out, Own and owe): the import reads those.',
  };
}
