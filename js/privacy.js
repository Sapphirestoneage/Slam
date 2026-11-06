// SPDX-License-Identifier: AGPL-3.0-only
// Who sees this (batch 28, Phase 4 Track 2, wave 1). Any row, and separately its notes, can be marked:
//   Everyone          the default
//   Me and my coach   kept from a partner's view and from anything shared (the one-pager, Send summary, the Life
//                     Transitions share view, a shared copy of the spreadsheet or backup)
//   Coach only        kept from the client's screen too (Client view)
// A row an audience may not see is folded: its name becomes a neutral word (the coach's
// pick for a private income line: Other income, Self-employment, Consulting), its notes and the details that say what
// it is (the platform, the institution, the last 4 digits) go, and every number the math reads stays. So every total
// an audience sees is the coach's total, to the cent (test/privacy.test.js), and lists show one calm line instead of
// the row: "Includes amounts kept private". The one exception is a partner's view: the other partner's private rows
// are left out of it altogether (rowLeftOut), as that partner's own numbers never counted them.
// This is the one layer data passes through on its way out of the coach's view: the app's ctx reads its doc through
// viewStore (Client view and the couple views), and shareDoc / shareCtx feed every shared output.
import { LISTS } from './registry/assumptions.js';
import { MODES, modeOf, ownerOf } from './registry/couples.js';
import { platformOf } from './math/earnings.js';

export const SEEN = LISTS.privacy.seen;
export const SHARE_NAMES = LISTS.privacy.shareNames;
export const SEEN_WORDS = {
  Everyone: 'Everyone in the plan',
  'Me and my coach': 'Me and my coach',
  'Coach only': 'Coach only',
};
export const SEEN_TIPS = {
  Everyone: 'Shows everywhere: client view, a partner\'s view, the one-pager and anything shared',
  'Me and my coach': 'Kept from a partner\'s view and from anything shared (the one-pager, Send summary, share views, a shared copy). The totals still count it',
  'Coach only': 'Kept from the client\'s screen too: for coach notes and sensitive context. The totals still count it',
};
const rank = s => SEEN.indexOf(s);
const stricter = (a, b) => (rank(a) >= rank(b) ? a : b);

export const seenOf = r => (SEEN.includes(r?.values?.seen) ? r.values.seen : 'Everyone');
// A row's notes are at least as private as the row; they can be more.
export const notesSeenOf = r => stricter(SEEN.includes(r?.values?.notesSeen) ? r.values.notesSeen : 'Everyone', seenOf(r));
export const isMarked = r => seenOf(r) !== 'Everyone' || notesSeenOf(r) !== 'Everyone';

const kindKey = r => (r?.kind === 'account' ? `account:${r.values?.group === 'investment' ? 'investment' : 'cash'}` : r?.kind);
// The word a folded row shows: the coach's pick, else the neutral word for its kind.
export const neutralName = r => r?.values?.shareName || LISTS.privacy.neutral[kindKey(r)] || 'Other';

// The person view a couple is in (All, Me or Partner): settings.person, else the mode's default. The same rule as the
// Whose numbers switch (js/screens.js personOf).
export function personView(doc) {
  const mode = modeOf(doc?.profile), p = doc?.settings?.person;
  const v = p ?? (mode ? MODES[mode].view : 'all');
  return v === 'all' && mode && !MODES[mode].together ? 'Me' : v;
}
const isCouple = doc => { const mode = modeOf(doc?.profile); return !!(mode && MODES[mode].couple); };

// Who is looking. who: coach (Client view off), client (Client view on) or share (anything that leaves the session).
export function audienceOf(doc, { clientView = false, share = false } = {}) {
  return { who: share ? 'share' : clientView ? 'client' : 'coach', person: isCouple(doc) ? personView(doc) : 'all', couple: isCouple(doc) };
}
export const SHARE = { who: 'share', person: 'all', couple: false };
const audKey = a => `${a.who}:${a.person}:${a.couple ? 1 : 0}`;

// Whose private row it is: its owner; a Joint row marked private is this client's.
const privOwner = (r, mode) => (ownerOf(r, mode) === 'Partner' ? 'Partner' : 'Me');
// Can this audience see a row (or its notes) marked `seen`?
function sees(seen, r, aud, mode) {
  if (seen === 'Everyone') return true;
  if (aud.who === 'share') return false;
  if (seen === 'Coach only') return aud.who === 'coach';
  // Me and my coach: never in the other partner's view; in the household view only the coach sees it by name.
  if (!aud.couple) return true;
  if (aud.person === 'all') return aud.who === 'coach';
  return aud.person === privOwner(r, mode);
}
export const rowHidden = (r, aud, mode = null) => !sees(seenOf(r), r, aud, mode);
// In one partner's view, a row of the other partner's that is not for everyone is left out altogether, not folded:
// a folded line there would still carry its amount into the household lines (the cash layers, the charts), and that
// partner's own numbers never counted it. A Joint row is never left out (it counts at half in each person's view).
export const rowLeftOut = (r, aud, mode = null) => aud.who !== 'share' && aud.couple && ['Me', 'Partner'].includes(aud.person)
  && rowHidden(r, aud, mode) && ownerOf(r, mode) !== 'Joint' && ownerOf(r, mode) !== aud.person;
export const notesHidden = (r, aud, mode = null) => !sees(notesSeenOf(r), r, aud, mode);

// What says what a row is, beyond its name and notes: taken off a folded row (nothing the math reads).
const IDENTIFYING = ['institution', 'institutionId', 'last4', 'equity', 'what', 'coveredBy', 'website'];
function foldRecord(r, ref) {
  const values = { ...r.values };
  for (const k of IDENTIFYING) delete values[k];
  if (r.type === 'Platform' || values.platform) { // the fee, hold and payout schedule stay as numbers, so the payout is the same
    const p = platformOf(r, ref || {});
    values.feePct = p.fee; values.holdDays = p.holdDays; values.payFrequency = p.payout;
    values.platform = null;
  }
  return { ...r, name: neutralName(r), notes: null, privateNote: null, values, folded: seenOf(r) }; // folded: the mark it was folded for
}

// The household as this audience sees it. The same object when nothing changes (the coach, nothing marked).
// Records are folded (left out only in the other partner's view); for a share the coach's notes (parking lot, session notes) and the history of
// folded rows go too, and imported transactions (bank descriptions) stay home.
export function foldDoc(doc, aud, ref = null) {
  if (!doc?.records) return doc;
  const mode = modeOf(doc.profile);
  const coach = aud.who === 'coach';
  let changed = false, folded = new Set();
  const kept = doc.records.filter(r => !rowLeftOut(r, aud, mode));
  if (kept.length !== doc.records.length) changed = true;
  const records = kept.map(r => {
    if (rowHidden(r, aud, mode)) { changed = true; folded.add(r.id); return foldRecord(r, ref); }
    const dropNotes = r.notes && notesHidden(r, aud, mode), dropCoach = !coach && r.privateNote;
    if (!dropNotes && !dropCoach) return r;
    changed = true;
    return { ...r, notes: dropNotes ? null : r.notes, privateNote: coach ? r.privateNote : null };
  });
  if (aud.who !== 'share') return changed ? { ...doc, records } : doc;
  const { privateNotes, feedback, timer, ...session } = doc.session || {};
  const spending = { ...(doc.spending || {}) }; delete spending.transactions;
  const settings = { ...(doc.settings || {}) }; delete settings.csvRules; delete settings.merchantRules;
  return { ...doc, records, session, spending, settings, parking: [], sharedCopy: true,
    history: (doc.history || []).filter(e => !folded.has(e.id) && !['privateNote', 'notes'].includes(e.field)) };
}

// Memo: one folded doc per household revision and audience, so screens and caches see one stable object.
const MEMO = new WeakMap();
export function foldFor(doc, aud, ref = null) {
  if (!doc) return doc;
  let m = MEMO.get(doc);
  if (!m || m.rev !== doc._rev || m.n !== doc.records?.length) { m = { rev: doc._rev, n: doc.records?.length, by: new Map() }; MEMO.set(doc, m); }
  const k = audKey(aud);
  if (!m.by.has(k)) m.by.set(k, foldDoc(doc, aud, ref));
  return m.by.get(k);
}
export const shareDoc = (doc, ref = null) => foldFor(doc, SHARE, ref);

// A shared copy of the backup: folded, with an id of its own, so opening it never writes over the real client.
export function sharedBackup(doc, ref = null) {
  const d = foldDoc(doc, SHARE, ref);
  return { ...d, id: `${doc.id}-shared`, sharedCopy: true };
}

// A line of its own for a row (a calendar chip, a month-end line, a payoff row, an Overview row) shows for every row
// the viewer may see, and for a private row only by its neutral name; a coach-only row has no line of its own in Client
// view at all (its amount stays in every total). ids: record ids on the line.
export const ownLineHidden = (doc, id) => { const r = id && doc?.records?.find(x => x.id === id); return !!r && r.folded === 'Coach only'; };
// How many rows of a list this audience does not see (they still count in its totals).
export const hiddenCount = recs => recs.filter(r => r.folded).length;
export const PRIVATE_LINE = 'Includes amounts kept private';

// A store that reads the household as an audience sees it and writes to the real one. Every read (doc, get, find)
// goes through the fold; every write (update, add, setDoc, undo ...) goes to the real store, and the next read folds
// the new revision. With nothing to fold it is the real store itself.
const READS = new Set(['get', 'find', 'getIn', 'openNotes', 'lastSnapshot', 'historyOf', 'valueAt', 'linked', 'constructor']);
export function viewStore(store, aud, ref = null) {
  const doc = store._tx ? foldDoc(store.doc, aud, ref) : foldFor(store.doc, aud, ref); // inside a change, never a stale fold
  if (doc === store.doc) return store;
  const v = Object.create(store, { doc: { value: doc, enumerable: true } });
  for (let p = Object.getPrototypeOf(store); p && p !== Object.prototype; p = Object.getPrototypeOf(p)) {
    for (const k of Object.getOwnPropertyNames(p)) {
      if (READS.has(k) || k in v && Object.prototype.hasOwnProperty.call(v, k)) continue;
      const d = Object.getOwnPropertyDescriptor(p, k);
      if (typeof d.value === 'function') Object.defineProperty(v, k, { value: (...a) => store[k](...a) });
    }
  }
  return v;
}
