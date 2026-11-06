// SPDX-License-Identifier: AGPL-3.0-only
// Couples (overnight F2). One config: the three person tags every row carries, and the household modes with their
// defaults. Stored values stay Me / Partner / Joint (every file ever saved uses them); the screens show the two
// people's names (Person A and Person B until the names are typed). Switching modes never deletes a row or a tag:
// it changes the defaults only (whether the partner's rows show, the default view, the filing status).
export const PERSONS = ['Me', 'Partner', 'Joint'];

// The names on the tags: the client's first name and the partner's, else Person A and Person B.
export function personLabels(doc) {
  const p = doc?.profile || {};
  const out = { Me: p.firstName || doc?.client?.name?.split(' ')[0] || 'Person A', Partner: p.partnerName || 'Person B', Joint: 'Joint' };
  for (const x of extraAdults(doc)) out[x.id] = x.name || `Person ${String.fromCharCode(64 + Number(x.id.slice(1)))}`; // batch 49: P3 reads Person C until named
  return out;
}

// ---------- Batch 49: households of any size ----------
// The split math itself (one adult's part of a shared row) lives in js/math/household.js; it is re-exported here.
import { SPLIT_HOWS, SPLIT_HOW_WORDS, splitTyped, generalRow, amongOf, howOf, rowShare, splitWords } from '../math/household.js';
export { SPLIT_HOWS, SPLIT_HOW_WORDS, splitTyped, generalRow, amongOf, howOf, rowShare, splitWords };
// A household holds 1 to MAX_ADULTS adults and any number of dependents. This client is Me; a partner (a couple mode)
// is Partner, as every file has always stored them; more adults live in profile.people with the ids P3 to P7, and
// dependents (a child, a parent you support) with D1, D2 ... An adult is in the plan: their own rows, a view of their
// own, a share of the rows they share. A dependent is in the household (its size, the benefits lines) and has no view.
// Roommates who are not in the plan stay the roommates count on About you: they share bills, they have no view.
// A file with no profile.people reads exactly as before (Me, and Partner in a couple mode).
export const MAX_ADULTS = 6;
export const EXTRA_IDS = ['P3', 'P4', 'P5', 'P6', 'P7'];
export const ADULT_ROLES = ['Partner', 'Sibling', 'Parent', 'Adult child', 'Friend', 'Other adult'];
export const DEPENDENT_ROLES = ['Child', 'Parent I support', 'Other dependent'];
export const PERSON_KINDS = ['Adult', 'Dependent'];
const coupleOf = doc => { const p = doc?.profile || {}; return p.mode ? MODES[p.mode]?.couple ?? false : p.household ? p.household === 'Couple' : !!doc?.client?.couple; }; // the same rule as gatesOf().couple
export const extraAdults = doc => (Array.isArray(doc?.profile?.people) ? doc.profile.people : []).filter(x => x && EXTRA_IDS.includes(x.id) && x.kind !== 'Dependent');
export const dependentsOf = doc => (Array.isArray(doc?.profile?.people) ? doc.profile.people : []).filter(x => x && x.kind === 'Dependent');
// Every adult in the plan, in order: [{ id, name, role }].
export function adultsOf(doc) {
  const names = personLabels(doc);
  const list = [{ id: 'Me', name: names.Me, role: 'Me' }];
  if (coupleOf(doc)) list.push({ id: 'Partner', name: names.Partner, role: 'Partner' });
  for (const x of extraAdults(doc)) if (list.length < MAX_ADULTS) list.push({ id: x.id, name: names[x.id], role: x.role ?? null });
  return list;
}
export const adultIds = doc => adultsOf(doc).map(a => a.id);
export const multiAdult = doc => adultsOf(doc).length > 1;
export const manyAdults = doc => adultsOf(doc).length > 2;
// Batch 58 (QUESTIONS 413): in one adult's view the lists (Budget, Income, Assets, Debt and the others under the
// whose-numbers switch) show that adult's rows and their part of the shared ones, so a list's totals match that
// adult's strip. The rule is for households past two adults; a couple's lists read as they always have (every row,
// the household's totals) until Eli decides (QUESTIONS 420). One line to change: return multiAdult(doc).
export const listsFollowView = doc => manyAdults(doc);
// The household's size (the benefits lines read it): the adults in the plan and every dependent. Dependents are the
// list on About you › People, else the Dependents count or the kids' ages, whichever is more (as before batch 49).
export function householdSize(doc) {
  const p = doc?.profile || {};
  const ages = (Array.isArray(p.kidAges) ? p.kidAges : String(p.kidAges ?? '').split(',')).filter(v => v !== null && v !== '' && !Number.isNaN(Number(v)));
  const kids = Math.max(dependentsOf(doc).length, Number(p.dependents) || 0, ages.length);
  return { adults: adultsOf(doc).length, dependents: kids, size: adultsOf(doc).length + kids };
}
// The person a view id stands for: an adult in the plan, else this client (an id left over from someone removed).
// 'Me', 'Partner' and 'all' read as they always have.
export const validPerson = (doc, v) => (v == null || v === 'all' || v === 'Me' || v === 'Partner' ? v : adultIds(doc).includes(v) ? v : 'Me');

// The household as the split math reads it: the adults, the default method and each adult's take-home a month (for
// By income). many: more than two adults, so every shared row takes the split math (a couple's file never does
// unless a row has a split typed).
export function householdOf(doc, { weights = {} } = {}) {
  const ids = adultIds(doc);
  return { ids, many: ids.length > 2, method: doc?.profile?.splitMethod === 'By income' ? 'By income' : 'Equal', weights, splitMine: doc?.profile?.splitMine ?? null };
}


// Household modes. couple: the partner's rows and the Owner tag show. view: the default person filter on Net worth
// and Cash flow (all: the household together; Me: this client alone, the partner's rows set aside). merged: shared
// bills and joint accounts are the default for new rows. A mode never sets the tax filing status (answer 155): it
// stays blank until typed; the tax math then guesses Single, or Married jointly once the stage is Married (answer 174).
// combined: whether household totals exist (none: each person's own plan, only Joint items shared; preview: a
// 'what if we merged' view; on: household totals). split: the shared-bills split method applies (50/50 or by income).
// suggest: agenda suggestions the mode brings (Engaged: the disclosure checklist, a money talk, a wedding goal).
export const MODES = {
  Solo: { couple: false, view: 'all', combined: 'on', split: false, merged: false, together: 'Together', suggest: [], words: 'One person. No Owner tags, no partner rows.' },
  Dating: { couple: true, view: 'Me', combined: 'none', split: true, merged: false, together: null, suggest: [], words: 'No combined totals: each person has their own plan and sees their own items by default; only items tagged Joint are shared; shared bills split 50/50 or by income.' },
  'Living together': { couple: true, view: 'Me', combined: 'none', split: true, merged: false, together: null, suggest: [], words: 'Shared bills only are combined, split 50/50 or by income; own accounts stay private by default.' },
  Engaged: { couple: true, view: 'Me', combined: 'preview', split: true, merged: false, together: 'If we merged (preview)', suggest: ['disclosure', 'moneyTalk', 'wedding'], words: 'A what-if-we-merged preview of the combined totals; split by choice; the disclosure checklist, a money talk and a wedding goal are suggested for the agenda.' },
  'Married separate': { couple: true, view: 'all', combined: 'on', split: true, merged: false, together: 'Ours', suggest: [], words: 'Household totals on, with a Yours, Mine, Ours view; split by choice; each can see the other\'s accounts.' },
  'Married merged': { couple: true, view: 'all', combined: 'on', split: false, merged: true, together: 'Together', suggest: [], words: 'Fully combined: everything is Joint except an account owned by one person.' },
};
export const SPLIT_METHODS = ['50/50', 'By income'];
// The Engaged suggestions (agenda items with a +).
export const DISCLOSURE = ['Debts: every balance and rate on the table', 'Credit scores: both, as they are', 'Income: every paycheck, side money and bonus', 'Accounts: every account, who owns it, what is in it'];
export const MODE_NAMES = Object.keys(MODES);
export const modeOf = profile => (profile?.mode && MODES[profile.mode] ? profile.mode : (profile?.household === 'Couple' ? 'Married merged' : null)); // a file from before modes: Couple reads as Married merged (the old default), Solo as Solo

// Accounts that belong to one person by law (retirement and health accounts): never Joint.
export const ONE_PERSON_TYPES = ['401(k)', '403(b)', '457', 'TSP', 'Solo 401(k)', 'Traditional IRA', 'Roth IRA', 'SEP IRA', 'SIMPLE IRA', 'HSA', 'Roth 401(k)', 'Pension'];
export const onePerson = r => r?.kind === 'account' && ONE_PERSON_TYPES.includes(r.type);
// The person a row belongs to: its tag, else the partner for a Partner job, else this client; a one-person account tagged Joint reads as this client.
// mode: in Married merged an untagged row is Joint (except a one-person account); elsewhere it is this client's.
export const ownerOf = (r, mode = null) => { const o = r?.owner ?? (r?.type === 'Partner job' ? 'Partner' : r?.values?.ownership === 'Joint' || (MODES[mode]?.merged && !onePerson(r)) ? 'Joint' : 'Me'); return onePerson(r) && o === 'Joint' ? 'Me' : o; };
// Answer 157: in one person's view a Joint row counts at half, so the two views add up to the household. Amounts,
// balances, values, payments and limits are halved; a one-person account is never Joint, so never halved.
const HALF = ['balance', 'value', 'payment', 'limit', 'contribution'];
export const halfOf = r => ({ ...r, amount: r.amount == null ? r.amount : r.amount / 2, values: Object.fromEntries(Object.entries(r.values || {}).map(([k, v]) => [k, HALF.includes(k) && typeof v === 'number' ? v / 2 : v])), halved: true });
// Batch 49: a shared row in a household of any size counts at the person's part of it (rowShare), not at half.
export const shareRow = (r, k) => ({ ...r, amount: r.amount == null ? r.amount : r.amount * k, values: Object.fromEntries(Object.entries(r.values || {}).map(([f, v]) => [f, HALF.includes(f) && typeof v === 'number' ? v * k : v])), halved: true, viewShare: k });
export const forPerson = (r, person, mode = null, H = null) => (person && person !== 'all' && ownerOf(r, mode) === 'Joint' ? (generalRow(r, H) ? shareRow(r, rowShare(r, person, H)) : halfOf(r)) : r);
// Does a row count in a person's view? Their own rows and the Joint ones; 'all' takes everything. Batch 49: a Joint
// row split among some of the adults counts only in theirs.
export const inView = (r, person, mode = null, H = null) => !person || person === 'all' || ownerOf(r, mode) === person || (ownerOf(r, mode) === 'Joint' && (!generalRow(r, H) || amongOf(r, H).includes(person)));
// The person options for a mode: the combined view (its label by mode, none in Dating and Living together), then each person.
// Batch 49: with more than two adults the combined view is Everyone, then each adult; adults: adultsOf(doc).
export const viewsOf = (mode, names, adults = null) => (adults && adults.length > 2
  ? [...(MODES[mode]?.together ? [['all', 'Everyone']] : []), ...adults.map(a => [a.id, names[a.id] ?? a.name])]
  : [...(MODES[mode]?.together ? [['all', MODES[mode].together]] : []), ['Me', names.Me], ['Partner', names.Partner]]);
// Batch 15 (question 212): a couple with no combined totals (Dating, Living together) sees one person's own plan
// everywhere: this client's, unless the person switch says the partner's. Other modes: the household (null).
// Batch 33 (QUESTIONS 287): Living together's "Both (preview)", read-only, on the screens that offer it (Home, Goals,
// Debt payoff). The shell says which screen is open (setBothScreen); the switch's pick ('all') stays in settings.person.
// On a screen that offers it, 'all' is the two together (the household); anywhere else it reads as this client.
export const BOTH_PREVIEW = { modes: ['Living together'], label: 'Both (preview)', many: 'Everyone (preview)' };
export const bothLabel = doc => (manyAdults(doc) ? BOTH_PREVIEW.many : BOTH_PREVIEW.label); // batch 49: "Both" is Everyone past two adults
const shown = { both: false };
export const setBothScreen = on => { shown.both = !!on; };
export const bothScreen = () => shown.both;
export const offersBoth = doc => BOTH_PREVIEW.modes.includes(modeOf(doc?.profile));
export const bothPreviewOn = doc => shown.both && offersBoth(doc) && doc.settings?.person === 'all';
export const ownPlanPerson = doc => { const mode = modeOf(doc?.profile); return mode && MODES[mode].couple && MODES[mode].combined === 'none' ? (bothPreviewOn(doc) ? null : doc.settings?.person === 'Partner' ? 'Partner' : EXTRA_IDS.includes(doc.settings?.person) ? validPerson(doc, doc.settings.person) : 'Me') : null; }; // batch 49: any adult
