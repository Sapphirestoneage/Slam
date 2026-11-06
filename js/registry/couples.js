// SPDX-License-Identifier: AGPL-3.0-only
// Couples (overnight F2). One config: the three person tags every row carries, and the household modes with their
// defaults. Stored values stay Me / Partner / Joint (every file ever saved uses them); the screens show the two
// people's names (Person A and Person B until the names are typed). Switching modes never deletes a row or a tag:
// it changes the defaults only (whether the partner's rows show, the default view, the filing status).
export const PERSONS = ['Me', 'Partner', 'Joint'];

// The names on the tags: the client's first name and the partner's, else Person A and Person B.
export function personLabels(doc) {
  const p = doc?.profile || {};
  return { Me: p.firstName || doc?.client?.name?.split(' ')[0] || 'Person A', Partner: p.partnerName || 'Person B', Joint: 'Joint' };
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
export const forPerson = (r, person, mode = null) => (person && person !== 'all' && ownerOf(r, mode) === 'Joint' ? halfOf(r) : r);
// Does a row count in a person's view? Their own rows and the Joint ones; 'all' takes everything.
export const inView = (r, person, mode = null) => !person || person === 'all' || ownerOf(r, mode) === person || ownerOf(r, mode) === 'Joint';
// The person options for a mode: the combined view (its label by mode, none in Dating and Living together), then each person.
export const viewsOf = (mode, names) => [...(MODES[mode]?.together ? [['all', MODES[mode].together]] : []), ['Me', names.Me], ['Partner', names.Partner]];
// Batch 15 (question 212): a couple with no combined totals (Dating, Living together) sees one person's own plan
// everywhere: this client's, unless the person switch says the partner's. Other modes: the household (null).
export const ownPlanPerson = doc => { const mode = modeOf(doc?.profile); return mode && MODES[mode].couple && MODES[mode].combined === 'none' ? (doc.settings?.person === 'Partner' ? 'Partner' : 'Me') : null; };
