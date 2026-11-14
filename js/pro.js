// SPDX-License-Identifier: AGPL-3.0-only
// For a coach or planner: a card with their name, a list of the plans people share with them, and a one-page summary
// of any plan. A client plan is a shared space (js/accounts.js): the client and the pro are both members, so each sees
// what the other fills in. This file is the model; nothing here draws.
import { addShared, nameSpace } from './accounts.js';
import { soloProgress, debtFreeOf, runwayOf, backwardsOf } from './solo.js';
import { collapseOf } from './collapse.js';
import { onFile } from './journey.js';

const clean = (s, max = 60) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
// A booking link is kept only when it is a full https address; anything else is dropped.
export const safeLink = s => { try { const u = new URL(String(s ?? '').trim()); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
export const cardOf = raw => { const c = { name: clean(raw?.name), firm: clean(raw?.firm), link: safeLink(raw?.link) }; return c.name ? c : null; };
export const setCard = (acct, raw) => { const card = cardOf(raw), { pro, ...rest } = acct; return card ? { ...rest, pro: card } : rest; };
// A new client plan: a shared space named for the client, with the pro as its first member.
export function addClient(acct, name) { const n = clean(name, 40) || `Client ${acct.spaces.filter(s => s.kind === 'shared').length + 1}`, a = addShared(acct, [n]); return nameSpace(a, a.active, n); }
// The card rides in the plan itself, so the client sees who they are working with and how to book a time.
export const stampCard = (doc, card) => ({ ...doc, settings: { ...(doc.settings || {}), start: { ...(doc.settings?.start || {}), pro: cardOf(card) } } });
export const cardIn = doc => cardOf(doc?.settings?.start?.pro);

// One row per shared plan. docs: { id: doc or null }; stamps: when each last arrived; seen: when the pro last opened it.
export function rosterOf(acct, docs = {}, ref, { stamps = {}, seen = {} } = {}) {
  return (acct?.spaces || []).filter(s => s.kind === 'shared').map(s => {
    const doc = docs[s.id] ?? null, P = doc ? soloProgress(doc, ref) : null;
    return { id: s.id, name: s.name, people: s.members.length, empty: !doc || P.answers === 0, done: P?.done ?? 0, of: P?.of ?? 0, answers: P?.answers ?? 0,
      next: P?.next ? { id: P.next.id, title: P.next.title } : null, carded: !!cardIn(doc), changed: (stamps[s.id] ?? 0) > (seen[s.id] ?? 0) };
  }).sort((a, b) => Number(b.changed) - Number(a.changed) || a.name.localeCompare(b.name));
}
// What a practice looks like at a glance.
export const practiceOf = rows => ({ clients: rows.length, changed: rows.filter(r => r.changed).length, notStarted: rows.filter(r => r.empty).length, finished: rows.filter(r => r.of > 0 && r.done === r.of).length });

// One page about one plan, every line from the same math the plan's own pages use. A line with no answer yet says so.
export function summaryOf(doc, ref, { now = new Date() } = {}) {
  const st = doc.settings?.start || {}, P = soloProgress(doc, ref), C = collapseOf(st.collapse || {}), D = debtFreeOf(doc, ref, { now });
  const cash = onFile(doc, 'cash'), spend = onFile(doc, 'spending'), have = (cash?.checking ?? 0) + (cash?.savings ?? 0);
  const R = runwayOf({ cash: cash?.checking != null || cash?.savings != null ? have : null, spending: spend?.gut ?? null, now });
  const g = st.goal || {}, B = backwardsOf({ need: g.need ?? null, per: g.per ?? 'month', years: g.years ?? null, ref, now });
  const lines = [
    { id: 'move', label: 'First move', value: C.done && C.move ? C.move.title : null, note: C.done && C.move ? C.move.why : null },
    { id: 'debt', label: 'Debt free', value: D.ready ? (D.never ? 'The payments do not cover the interest yet' : D.date) : null, amount: D.ready ? D.total : null, note: D.ready && D.first ? `Pay ${D.first} first.` : null },
    { id: 'runway', label: 'If the pay stopped', value: R.ready ? (R.covered ? 'Covered' : `${R.whole} ${R.whole === 1 ? 'month' : 'months'}`) : null, amount: R.ready ? R.cash : null },
    { id: 'finish', label: 'Finish line', value: B.step >= 2 ? B.total : null, money: true, note: B.step >= 3 ? `By ${B.byYear}.` : null },
  ];
  return { name: doc.name ?? 'Plan', on: now.toISOString().slice(0, 10), done: P.done, of: P.of, next: P.next?.title ?? null, lines, open: lines.filter(l => l.value == null).map(l => l.label), card: cardIn(doc) };
}
