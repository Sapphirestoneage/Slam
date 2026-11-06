// SPDX-License-Identifier: AGPL-3.0-only
// M73: every number's level (Gut 25, Rough 50, Estimate 75, Actual 100), the Picture % as their weighted average,
// the expected pace by session, the next small things, what each calculator needs before it unlocks, and how
// confident an unlocked number is. The levels, weights, pace and unlock rules live in js/registry/program.js.
// Pure: reads a household, never the DOM.
import { statusOf } from '../records.js';
import { gatesOf, visible } from '../gates.js';
import { DRAFTT, drafttName, isCategoryRecord } from './spending.js';
import { debtRoute } from '../nav.js';
import { LEVELS, WEIGHTS, PACE, UNLOCKS, CONFIDENCE, FI_RANGE, SESSIONS } from '../registry/program.js';
import { fiRangeOf } from './fi.js';
import { RULES } from '../registry/assumptions.js';

const isBlank = v => v === null || v === undefined || v === '';
const valueOf = (rec, field) => (field in rec && field !== 'values' ? rec[field] : rec.values?.[field]);
const CONFIRMED_SOURCES = new Set(['statement', 'bank']);

// One field's level, or null when the row is Not for me (it is not part of the picture).
export function levelOf(rec, field, { months = {} } = {}) {
  const status = statusOf(rec, field);
  if (status === 'Not for me') return null;
  if (isBlank(valueOf(rec, field))) return LEVELS.Missing;
  if (rec.values?.locked === true) return LEVELS.Actual;
  if (CONFIRMED_SOURCES.has(rec.source)) return LEVELS.Actual;
  if (rec.kind === 'bill' && Object.values(months).some(m => m?.lines?.[rec.id]?.actual != null)) return LEVELS.Actual;
  if (rec.kind === 'spending' && rec.type === 'All in') return LEVELS.Gut; // the gut number is a gut number, however sure (a category row counts like any typed number)
  if (['Not sure', 'Will email', 'Not now'].includes(status)) return LEVELS.Gut;
  if (status === 'Roughly') return LEVELS.Rough;
  if (status === 'Computed') return LEVELS.Estimate; // worked out from a typed number
  return LEVELS.Actual; // typed and Know it counts as confirmed (batch 6, item 11); Lock it stays in the row menu for turning a guess into confirmed
}

// Every number that makes the picture, with its level, weight and where it lives; the Picture % is their weighted
// average. A missing big thing (no income row yet) is one item at Missing, so an empty client reads 0%.
export function pictureOf(doc, ref, { now = new Date() } = {}) {
  const p = doc.profile || {};
  const g = gatesOf(p, doc.client);
  const live = visible(doc.records, g, ref);
  const months = doc.spending?.months || {};
  const items = [];
  const item = o => { if (o.level !== null) items.push({ sub: null, ...o, next: o.level < LEVELS.Estimate ? LEVELS.Estimate : LEVELS.Actual }); };
  const recItem = (r, field, o) => item({ id: `${r.id}:${field}`, recId: r.id, field, level: levelOf(r, field, { months }), updatedAt: r.updatedAt, ...o });
  const name = r => r.name || r.type || 'Item';
  // About you: the age (Coast FI, the Rule of 5) and what applies (the gates).
  const ageKnown = !isBlank(p.age) || !isBlank(p.birthYear);
  item({ id: 'age', label: 'Age', group: 'age', weight: WEIGHTS.age, level: ageKnown ? LEVELS.Actual : LEVELS.Missing, route: '#/home/profile', focus: 'profile:birthYear' });
  const areasAnswered = p.noneOfThese === true || Object.values(p.areas || {}).some(v => v === true || v === false);
  item({ id: 'areas', label: 'What you have today (About you)', group: 'areas', weight: WEIGHTS.areas, level: areasAnswered ? LEVELS.Actual : LEVELS.Missing, route: '#/home/profile' });
  // Income.
  const income = live.filter(r => r.kind === 'income');
  if (!income.length) item({ id: 'income', label: 'Take-home pay', group: 'income', weight: WEIGHTS.income, level: LEVELS.Missing, route: '#/cash-flow/income', quick: 'take-home' });
  for (const r of income) recItem(r, 'amount', { label: /take-home/i.test(name(r)) ? name(r) : `${name(r)} take-home`, group: 'income', weight: WEIGHTS.income, route: '#/cash-flow/income' });
  // Debts: the balance counts most, the APR a little (the payment is often worked out).
  if (g.areas.debt !== false) {
    const debts = live.filter(r => r.kind === 'debt');
    if (!debts.length && g.areas.debt === true) item({ id: 'debt', label: 'Debt balances', group: 'debt', weight: WEIGHTS.debtBalance, level: LEVELS.Missing, route: '#/net-worth/debt' });
    for (const r of debts) {
      recItem(r, 'balance', { label: `${name(r)} balance`, group: 'debt', weight: WEIGHTS.debtBalance, route: debtRoute(r) });
      recItem(r, 'apr', { label: `${name(r)} APR`, group: 'debt', weight: WEIGHTS.debtApr, route: debtRoute(r) });
    }
  }
  // Accounts (cash or invested) and things.
  const accounts = live.filter(r => r.kind === 'account');
  if (!accounts.length && !g.none && (g.areas.cash !== false || g.areas.investments !== false)) {
    const sub = g.areas.investments === false ? 'cash' : 'invested';
    item({ id: 'accounts', label: 'Account balances', group: 'account', sub, weight: WEIGHTS.account, level: LEVELS.Missing, route: '#/net-worth/assets', quick: sub });
  }
  for (const r of accounts) recItem(r, 'balance', { label: `${name(r)} balance`, group: 'account', sub: r.values.group === 'investment' ? 'invested' : 'cash', weight: WEIGHTS.account, route: '#/net-worth/assets' });
  for (const r of live.filter(x => x.kind === 'asset')) recItem(r, 'value', { label: `${name(r)} value`, group: 'thing', weight: WEIGHTS.thing, route: '#/net-worth/assets' });
  // Spending: the gut number until the lines are the source (as the math does), then one item per DRAFTT letter.
  const allIn = live.find(r => r.kind === 'spending' && r.type === 'All in');
  const lines = live.filter(r => r.kind === 'bill' && r.status !== 'Not for me');
  const useLines = !allIn || ((doc.spending?.source ?? 'gut') === 'lines' && lines.length > 0);
  // Batch 7 (A): a category row with an amount counts on its own (its level is the row's); otherwise the category is
  // the average of its lines' levels. Categories, not lines, are what the Picture counts.
  const categories = [];
  const byLetter = new Map();
  const catRecs = live.filter(isCategoryRecord);
  for (const l of lines) { const k = DRAFTT.includes(l.values.draftt) ? l.values.draftt : 'Other'; byLetter.set(k, [...(byLetter.get(k) || []), l]); }
  for (const k of [...DRAFTT, 'Other']) {
    const rec = catRecs.find(r => r.type === k);
    if (rec && rec.amount != null && rec.status !== 'Not for me') {
      const level = levelOf(rec, 'amount', { months });
      categories.push({ id: `draftt:${k}`, recId: rec.id, field: 'amount', label: `${drafttName(k)} (category)`, group: 'spending', kind: 'category', weight: k === 'Other' ? WEIGHTS.otherLines : WEIGHTS.draftt,
        level, route: '#/cash-flow/budget', updatedAt: rec.updatedAt, count: { below: level < LEVELS.Estimate ? 1 : 0, of: 1 }, lines: [] });
      continue;
    }
    const lv = (byLetter.get(k) || []).map(l => ({ l, level: levelOf(l, 'amount', { months }) })).filter(x => x.level !== null);
    if (!lv.length) continue;
    const level = Math.round(lv.reduce((s, x) => s + x.level, 0) / lv.length);
    const weakest = [...lv].sort((a, b) => a.level - b.level)[0];
    const oldest = [...lv].map(x => x.l.updatedAt).filter(Boolean).sort()[0] ?? null;
    categories.push({ id: `draftt:${k}`, recId: weakest.l.id, field: 'amount', label: k === 'Other' ? 'Other lines' : `${drafttName(k)} lines`, group: 'spending', kind: 'category',
      weight: k === 'Other' ? WEIGHTS.otherLines : WEIGHTS.draftt, level, route: '#/cash-flow/budget', updatedAt: oldest, count: { below: lv.filter(x => x.level < LEVELS.Estimate).length, of: lv.length },
      lines: lv.map(x => ({ id: x.l.id, name: x.l.name || x.l.values.category || 'Line', level: x.level, amount: x.l.amount ?? null })) });
  }
  // Answer 127: the gut number stands in for the categories, and stops counting once the itemized big categories all
  // reach Estimate (no double count), whichever the Budget uses for the math.
  const big = categories.filter(c => c.id !== 'draftt:Other');
  const itemized = big.length > 0 && big.every(c => c.level >= LEVELS.Estimate);
  if (!useLines && !itemized) {
    const level = levelOf(allIn, 'amount', { months });
    item({ id: 'gut', recId: allIn.id, field: 'amount', label: 'Monthly spending (the gut number)', group: 'spending', kind: 'gut', weight: WEIGHTS.gut, level, route: '#/cash-flow/budget', updatedAt: allIn.updatedAt,
      step: level === LEVELS.Missing ? 'Add the gut number' : 'Build it from the lines on Budget' });
  } else if (!categories.length) {
    item({ id: 'spending', label: 'Monthly spending', group: 'spending', weight: WEIGHTS.gut, level: LEVELS.Missing, route: '#/cash-flow/budget', quick: 'spending' });
  } else {
    for (const c of categories) item(c);
  }
  const total = items.reduce((s, it) => s + it.weight * LEVELS.Actual, 0);
  const got = items.reduce((s, it) => s + it.weight * it.level, 0);
  for (const it of items) { it.gain = total ? it.weight * (it.next - it.level) / total : 0; it.full = total ? it.weight * (LEVELS.Actual - it.level) / total : 0; }
  return { pct: total ? got / total : 0, items, sections: sectionsOf(items) };
}
const SECTIONS = [['About you', ['age', 'areas'], '#/home/profile'], ['Income', ['income'], '#/cash-flow/income'], ['Debt', ['debt'], '#/net-worth/debt'], ['Assets', ['account', 'thing'], '#/net-worth/assets'], ['Spending', ['spending'], '#/cash-flow/budget']];
function sectionsOf(items) {
  return SECTIONS.map(([name, groups, route]) => {
    const its = items.filter(it => groups.includes(it.group));
    const w = its.reduce((s, it) => s + it.weight, 0);
    return { name, route, pct: w ? its.reduce((s, it) => s + it.weight * it.level, 0) / (w * LEVELS.Actual) : null, items: its };
  }).filter(s => s.items.length);
}

// The three things that raise the Picture % most: each item's gain is its next level (Estimate, then Actual).
export function nextSmallThings(picture, limit = 3) {
  return picture.items.filter(it => it.gain > 0).sort((a, b) => b.gain - a.gain || b.full - a.full).slice(0, limit).map(it => ({ ...it, step: stepOf(it) }));
}
export function stepOf(it) {
  if (it.step) return it.step;
  if (it.kind === 'category') return it.count.below ? `${it.count.below} of ${it.count.of} lines still a guess: type the real amounts` : 'Confirm the lines from a statement, or lock them';
  if (it.level === LEVELS.Missing) return 'Add the number';
  if (it.level === LEVELS.Gut) return 'Replace the guess with your number';
  if (it.level === LEVELS.Rough) return 'Check the number and mark it Know it';
  return 'Confirm it from a statement, or lock it';
}

// Ahead, On track or Catch up against the pace expected by this session.
export function paceOf(pct, sessionNo) {
  const n = Math.max(1, Math.min(SESSIONS.length, sessionNo));
  const target = PACE.expected[n] ?? PACE.hold;
  const floor = n <= 1 ? 0 : PACE.expected[n - 1] ?? PACE.hold;
  const points = Math.round(pct * 100);
  const word = points >= target ? 'Ahead' : points + PACE.margin >= floor ? 'On track' : 'Catch up';
  const text = word === 'Ahead' ? `${points}% now, past the ${target}% expected by the end of session ${n}`
    : word === 'On track' ? `${points}% now; ${target}% expected by the end of session ${n}`
      : `${points}% now; ${floor}% was expected by now, ${target}% by the end of session ${n}`;
  return { word, points, target, floor, text };
}

// Is a calculator unlocked, and if not, the plain reason and where to go.
export function unlockOf(key, picture) {
  const u = UNLOCKS[key];
  const of = need => picture.items.filter(it => it.group === need.group || it.sub === need.group);
  const needs = u.needs.map(need => { const its = of(need); const done = its.filter(it => it.level >= need.min).length; return { ...need, done, of: its.length, met: done === its.length }; });
  const open = needs.filter(n => !n.met);
  const first = open[0] ?? null;
  const weakest = first ? of(first).filter(it => it.level < first.min).sort((a, b) => b.weight - a.weight)[0] ?? null : null;
  return { key, label: u.label, unlocked: !open.length, needs,
    reason: first ? `Unlocks when ${first.label} (${first.done} of ${first.of} there)${open.length > 1 ? `, then when ${open.slice(1).map(n => n.label).join(' and ')}` : ''}.` : null,
    item: weakest, route: weakest?.route ?? null };
}

// How confident an unlocked number is: its inputs' levels, and whether any is old.
export function confidenceOf(key, picture, { now = new Date() } = {}) {
  const groups = new Set(UNLOCKS[key].needs.map(n => n.group));
  const its = picture.items.filter(it => groups.has(it.group) || groups.has(it.sub));
  if (!its.length) return null;
  const w = its.reduce((s, it) => s + it.weight, 0);
  const avg = its.reduce((s, it) => s + it.weight * it.level, 0) / w;
  const aged = its.filter(it => it.updatedAt && (now.getTime() - Date.parse(it.updatedAt)) / 86400000 > RULES.agedCheckDays).length;
  const atEstimate = its.filter(it => it.level >= LEVELS.Estimate).length;
  let step = avg >= CONFIDENCE.high ? 2 : avg >= CONFIDENCE.medium ? 1 : 0;
  if (aged && step > 0) step -= 1;
  const word = ['Low', 'Medium', 'High'][step];
  return { word, label: `${word} confidence`, step, avg, aged, of: its.length, atEstimate, range: FI_RANGE[word],
    text: `${atEstimate} of ${its.length} numbers at Estimate or better${aged ? `, ${aged} older than ${RULES.agedCheckDays} days` : ''}.${word === 'High' ? '' : ` Shown as a year range: spending ${Math.round(FI_RANGE[word] * 100)}% lower to higher.`}` };
}

// The FI date in words at a confidence (answer 122): a month at High; a year range at Medium (spending 5% either way,
// one year when both ends land in it) and at Low (15% either way). Months since now; years from the calendar.
export function fiWordsOf(m, conf, { now = new Date() } = {}) {
  const base = m.monthsToFi.value;
  if (base == null) return null;
  const yearAt = months => new Date(now.getFullYear(), now.getMonth() + months, 1).getFullYear();
  const monthAt = months => new Date(now.getFullYear(), now.getMonth() + months, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  if (!conf || conf.word === 'High' || !conf.range) return { kind: 'month', text: monthAt(base), low: base, high: base, years: `${(base / 12).toFixed(1)} years from now` };
  const r = fiRangeOf(m, conf.range, { from: now });
  if (!r || r.low == null) return { kind: 'year', text: String(yearAt(base)), low: base, high: base, years: `about ${Math.round(base / 12)} years from now` };
  const lo = yearAt(r.low), hi = r.high == null ? null : yearAt(r.high);
  const text = hi == null ? `${lo} or later` : lo === hi ? String(lo) : `${lo} to ${hi}`;
  const yl = Math.round(r.low / 12), yh = r.high == null ? null : Math.round(r.high / 12);
  return { kind: hi == null || lo !== hi ? 'range' : 'year', text, low: r.low, high: r.high, years: yh == null ? `${yl} years or more from now` : yl === yh ? `about ${yl} years from now` : `about ${yl} to ${yh} years from now` };
}
