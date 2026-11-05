// SPDX-License-Identifier: AGPL-3.0-only
// Cash layers (Phase 3.5 section 3, M68). Cash fills the layers in order; the FOO reads them. Pure: no DOM.
//   0 Buffer        keeps checking from bouncing: two weeks of spending (RULES.bufferWeeks)
//   1 little e      the smaller of $1,000 and the highest deductible ($1,000, a Guess, until a deductible exists)
//   2 income gaps   each known, dated gap: monthly spending × months; FOO step 1 if it starts within 12 months, else 8
//   3 big e         the Rule of 5: five months of spending (RULES.bigEMonths, one definition everywhere) in three layers: FAT, DRAFTT, full
// Cash fills them in that order (the refill order); a dip takes from the Buffer first, then little e, then big e.
//   4 sinking funds already built; they feed FOO step 8
// Backups of the backups (unemployment, disability, available credit, what could be cut, family help) add months of
// runway and are never counted as a fund.
import { myShare, DRAFTT } from './spending.js';
import { monthsBetween, ymOf } from '../month.js';
import { metrics } from './metrics.js';
import { yearItems, sinkingOf } from '../year.js';
import { gatesOf, visible } from '../gates.js';
import { RULES } from '../registry/assumptions.js';

const FAT = new Set(['Food', 'Accommodation', 'Transportation']);
export const LITTLE_E = RULES.littleE;
export const STABILITY = { Steady: 1, Varies: 1.25, Unpredictable: 1.5 }; // kept for the sheet; big e is one definition (RULES.bigEMonths) since Nov 5
const sum = (list, f) => list.reduce((s, x) => s + (f(x) ?? 0), 0);

export function littleE(deductibles = []) {
  const high = deductibles.filter(d => d != null && d > 0);
  if (!high.length) return { target: LITTLE_E, guess: true, note: 'A Guess until a deductible is known' };
  const top = Math.max(...high);
  return top > LITTLE_E
    ? { target: LITTLE_E, guess: false, deductible: top, note: `Your highest deductible is $${top.toLocaleString('en-US')}; big e covers the rest` }
    : { target: top, guess: false, deductible: top, note: 'Your highest deductible' };
}

// gaps: [{ id, name, start: 'YYYY-MM', months }]. Step 1 when it starts within 12 months, else step 8.
export function gapStep(gap, now = new Date()) {
  const away = monthsBetween(ymOf(now), gap.start);
  return away <= 12 ? 1 : 8;
}

// x: metrics inputs (lines, spending, age, cash, roommates); opts: deductibles, gaps, stability, mode, accounts, layerAccounts.
export function cashLayers(x, { deductibles = [], gaps = [], stability = null, mode = 'virtual', accounts = [], layerAccounts = {}, sinking = [], now = new Date() } = {}) {
  const mine = l => myShare(l, { roommates: x.roommates ?? 0 }).value ?? 0;
  const lines = (x.lines || []).filter(l => l.status !== 'Not for me');
  const monthly = { fat: sum(lines.filter(l => FAT.has(l.draftt)), mine), draftt: sum(lines.filter(l => DRAFTT.includes(l.draftt)), mine), full: x.spending ?? sum(lines, mine) };
  const months = RULES.bigEMonths;
  const e = littleE(deductibles);
  const buffer = (monthly.full ?? 0) * RULES.bufferWeeks * 12 / 52;
  const layers = [
    { id: 'buffer', name: 'Buffer', target: monthly.full == null ? null : buffer, step: 1, note: `${RULES.bufferWeeks} weeks of spending, so checking never bounces` },
    { id: 'little-e', name: 'little e', target: e.target, guess: e.guess, note: e.note, step: 1 },
    ...[...gaps].sort((a, b) => String(a.start).localeCompare(String(b.start))).map(g => ({ id: `gap:${g.id}`, name: g.name || 'Income gap', target: (monthly.full ?? 0) * (g.months ?? 0),
      step: gapStep(g, now), note: `${g.months} ${g.months === 1 ? 'month' : 'months'} from ${g.start}` })),
    { id: 'big-e:fat', name: 'big e: FAT', target: monthly.fat * months, step: 4, note: `Food, accommodation and transportation for ${months} months` },
    { id: 'big-e:draftt', name: 'big e: DRAFTT', target: monthly.draftt * months, step: 4, note: `Every DRAFTT need for ${months} months` },
    { id: 'big-e:full', name: 'big e: full', target: (monthly.full ?? 0) * months, step: 4, note: `All spending for ${months} months (the Rule of 5)` },
    ...sinking.map(s => ({ id: `sink:${s.id}`, name: s.name, target: s.target ?? 0, step: 8, note: s.due ? `By ${s.due}` : 'Sinking fund' })),
  ];
  // The big e layers nest (FAT inside DRAFTT inside full): each one fills only what the one before did not.
  let prevBig = 0;
  for (const l of layers) {
    if (!l.id.startsWith('big-e:')) continue;
    const t = l.target; l.total = t; l.target = Math.max(0, t - prevBig); prevBig = Math.max(prevBig, t);
  }
  if (mode === 'accounts') { // one account per layer: each layer holds what its account holds
    for (const l of layers) { const a = accounts.find(acc => acc.id === layerAccounts[l.id]); l.filled = Math.min(l.target ?? 0, a?.value ?? 0); l.account = a?.name ?? null; }
  } else { // one account, virtual layers: cash fills them in order
    let left = x.cash ?? 0;
    for (const l of layers) { const f = Math.max(0, Math.min(l.target ?? 0, left)); l.filled = f; left -= f; }
  }
  for (const l of layers) { l.full = l.target != null && l.filled >= l.target - 0.5; l.left = l.target == null ? null : Math.max(0, l.target - l.filled); }
  const placed = sum(layers, l => l.filled);
  const bigE = layers.filter(l => l.id.startsWith('big-e'));
  return { layers, monthly, months, extra: Math.max(0, (x.cash ?? 0) - placed), littleE: e, bufferFull: !!layers[0].full, littleFull: !!layers[1].full, bigFull: bigE.length > 0 && bigE.every(l => l.full) };
}

// A dip (an emergency paid from cash): it comes out of the Buffer first, then little e, then big e last; what each
// layer gives is recorded (the Curveballs of a later Wrapped). Refilling runs the other way: cash fills the Buffer
// first, then little e, then big e, which is how cashLayers places cash.
export const DIP_ORDER = ['buffer', 'little-e', 'big-e:fat', 'big-e:draftt', 'big-e:full'];
export function dipFrom(layers, amount) {
  let left = amount;
  const from = [];
  for (const id of DIP_ORDER) {
    const l = layers.find(x => x.id === id);
    if (!l || left <= 0) continue;
    const take = Math.min(l.filled ?? 0, left);
    if (take > 0) { from.push({ layer: l.id, name: l.name, amount: take }); left -= take; }
  }
  return { from, uncovered: Math.max(0, left) };
}
// Record a dip on the file (doc.spending.dips) and take it off the account the layers draw from.
export function recordDip(store, { amount, note = null, now = store.now(), layers, accountId = null }) {
  const d = dipFrom(layers, amount);
  store.transaction('Emergency dip', () => {
    store.setIn('spending', ['dips'], [...(store.doc.spending?.dips || []), { id: store.makeId(), at: now, amount, from: d.from, uncovered: d.uncovered, ...(note ? { note } : {}) }], 'Emergency dip');
    if (accountId) { const a = store.get(accountId); if (a) store.update(accountId, { balance: Math.max(0, (a.values.balance ?? 0) - amount) }); }
  });
  return d;
}

// backups: [{ kind, amount }] dollars you could lean on. Months of runway they add at today's spending.
export function backupRunway(backups = [], monthlySpending) {
  if (!monthlySpending) return { months: null, total: sum(backups, b => b.amount) };
  const total = sum(backups, b => b.amount);
  return { total, months: total / monthlySpending };
}

// Everything the layers need, read from the household file. Stored: profile.incomeGaps, profile.backups,
// settings.layerMode ('virtual' or 'accounts') and settings.layerAccounts ({ layerId: accountId }).
export function layersOf(doc, ref, now = new Date()) {
  const m = metrics(doc, ref, { now });
  const x = m.inputs;
  const live = visible(doc.records, gatesOf(doc.profile, doc.client), ref);
  const deductibles = live.filter(r => r.kind === 'coverage' && r.values?.have !== "Don't").flatMap(r => [r.values.deductible, r.values.deductibleOut]);
  const sinking = yearItems(live, now).all.filter(i => i.rec.values.sinking).map(i => { const f = sinkingOf(i, { records: live, now }); return { id: i.id, name: i.name, target: f.target, due: i.ym }; });
  const out = cashLayers(x, { deductibles, gaps: doc.profile.incomeGaps || [], stability: doc.profile.incomeStability ?? null, mode: doc.settings?.layerMode || 'virtual',
    accounts: x.accounts.filter(a => a.group === 'cash'), layerAccounts: doc.settings?.layerAccounts || {}, sinking, now });
  const backups = backupRunway(doc.profile.backups || [], out.monthly.full);
  const runway = m.runwayMonths.value;
  return { ...out, backups, runway, runwayWithBackups: runway == null || backups.months == null ? null : runway + backups.months };
}
