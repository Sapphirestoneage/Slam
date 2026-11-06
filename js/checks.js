// SPDX-License-Identifier: AGPL-3.0-only
// The next check date for every rough or aged number (R061, spec F244). Pure: no DOM; the Revisit list, Open items and
// each row's More read it. A Roughly number is checked 30 days after it last changed; Not sure and Not now go on the
// list at once; any other number is checked once it is 90 days old. Check again on (a date on the row) overrides it.
import { RULES } from './registry/assumptions.js';
import { withHome, isFaded } from './math/spending.js';
import { gatesOf, visible } from './gates.js';

const DAY = 86400000;
const iso = t => new Date(t).toISOString().slice(0, 10);
const statusOfRow = r => r.status || Object.values(r.fieldStatus || {})[0] || null;

// One record's next check: { next: 'YYYY-MM-DD', why, status, set } or null (Not for me, worked out, a calendar item).
export function nextCheck(r, { now = new Date() } = {}) {
  if (['entry', 'win'].includes(r.kind)) return null;
  const st = statusOfRow(r) ?? 'Know it';
  if (st === 'Not for me' || st === 'Computed') return null;
  if (r.values?.checkOn) return { next: String(r.values.checkOn).slice(0, 10), why: 'The date you set', status: st, set: true };
  const updated = Date.parse(r.updatedAt || r.createdAt || now.toISOString());
  const wait = st === 'Roughly' ? RULES.roughCheckDays : ['Not sure', 'Not now', 'Will email'].includes(st) ? 0 : RULES.agedCheckDays;
  const why = st === 'Roughly' ? `Rough: ${RULES.roughCheckDays} days after it last changed` : wait === 0 ? 'Not sure yet: check it now' : `Every number: ${RULES.agedCheckDays} days after it last changed`;
  return { next: iso(Math.max(updated + wait * DAY, wait === 0 ? updated : 0)), why, status: st, set: false };
}

// The Revisit list: every number with a next check, soonest first. due: on or before today. Starter guesses on the Budget
// are one line (they are reviewed together there).
// A row on the Homework list stays off the Revisit list until the client says it is done (batch 7, item 4): homework
// is the client's to find; the coach looks again only to confirm it.
const clientSaysDone = (doc, r) => Object.entries(doc.program?.homeworkStatus || {}).some(([k, v]) => (k === `rec:${r.id}` || k.startsWith(`rec:${r.id}:`)) && v?.status === 'Client says done');
export function checksOf(doc, ref, { now = new Date() } = {}) {
  const live = visible(doc.records, gatesOf(doc.profile, doc.client), ref);
  const today = iso(now);
  const out = [];
  for (const r of live) {
    if (r.kind === 'bill' && r.values?.preset && r.status === 'Not sure') continue;
    if (isFaded(r)) continue; // batch 10: a faded typical amount is not a number yet, so there is nothing to check
    const c = nextCheck(r, { now });
    if (!c) continue;
    if (c.status === 'Will email' && !clientSaysDone(doc, r)) continue;
    if (c.status === 'Know it' && !c.set && c.next > today) continue; // a known number not yet old: nothing to check
    out.push({ rec: r, label: r.name || r.values?.category || r.type || 'Item', ...c, due: c.next <= today });
  }
  // Answer 176: a split bill whose roommate count and Splitting with disagree: check how many ways it splits.
  for (const r of live.filter(x => x.kind === 'bill')) { const w = withHome({ ...r, ...r.values }, doc.profile); if (w.splitDisagree) out.push({ rec: r, label: `${r.name || r.values?.category || 'Bill'}: check how many ways this splits`, status: r.status ?? 'Know it', next: today, why: `The roommate count says ${w.splitDisagree.roommates} ways, Split N ways says ${w.splitDisagree.typed}`, due: true, split: true }); }
  out.sort((a, b) => a.next.localeCompare(b.next));
  const guesses = live.filter(x => x.kind === 'bill' && x.values?.preset && x.status === 'Not sure').length;
  if (guesses) out.unshift({ rec: null, label: `${guesses} starter spending ${guesses === 1 ? 'guess' : 'guesses'} to review`, status: 'Not sure', next: today, why: 'Starter guesses', due: true, guesses });
  return out;
}
export const dueChecks = (doc, ref, opts) => checksOf(doc, ref, opts).filter(c => c.due);

// Defaults in use (batch 7, item 12): every number the app filled in with a typical value instead of a typed one, so
// a 25% card APR or a starter spending guess is never mistaken for a real number. One line per field: the row, the
// field, the value in use and where it came from. A typed number with Not sure on it is a guess too (R055).
export function defaultsInUse(doc, ref) {
  const live = visible(doc.records, gatesOf(doc.profile, doc.client), ref);
  const out = [];
  const blank = v => v === null || v === undefined || v === '';
  for (const r of live) {
    const name = r.name || r.values?.category || r.type || 'Item';
    if (r.kind === 'debt' && blank(r.values?.apr) && ref.typicalRates?.[r.type] != null && statusOfRow(r) !== 'Not for me') out.push({ rec: r, field: 'apr', label: `${name}: APR`, value: ref.typicalRates[r.type], unit: 'pct', from: `Typical ${r.type} rate` });
    if (r.kind === 'bill' && r.values?.preset && r.status === 'Not sure') out.push({ rec: r, field: 'amount', label: `${name}: amount`, value: r.amount, unit: 'money', from: 'Starter spending guess' });
    else if (r.kind === 'bill' && r.values?.usedTypical && r.status === 'Roughly' && !blank(r.amount)) out.push({ rec: r, field: 'amount', label: `${name}: amount`, value: r.amount, unit: 'money', from: 'Typical amount, used' }); // batch 10: Use on a faded line
    else if (r.status === 'Not sure' && !blank(r.amount)) out.push({ rec: r, field: 'amount', label: `${name}: amount`, value: r.amount, unit: 'money', from: 'Marked Not sure' });
    for (const [f, st] of Object.entries(r.fieldStatus || {})) if (st === 'Not sure' && !blank(r.values?.[f])) out.push({ rec: r, field: f, label: `${name}: ${f}`, value: r.values[f], unit: f === 'apr' || f === 'apy' ? 'pct' : 'money', from: 'Marked Not sure' });
  }
  return out;
}
