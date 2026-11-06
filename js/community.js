// SPDX-License-Identifier: AGPL-3.0-only
// Community presets (missed ideas M9): off by default, per client (doc.settings.community).
// When on: yearly lines for yom tov and Pesach (blank amounts), a kosher grocery note, future tuition as a goal
// type, and maaser on gross or take-home at a % (default 10%). Pure: no DOM.

export const COMMUNITY_LINES = ['Yom tov (food, clothes, guests, travel)', 'Pesach (food, cleaning, travel)'];
export const KOSHER_NOTE = 'Kosher groceries often cost more than the usual starter guess. Use your real number.';
export const TUITION_GOAL = 'Future tuition';
export const MAASER_DEFAULT = 0.1;

// Lines to add when the setting goes on: only the ones not there yet. Amounts stay blank.
export function communityLinesToAdd(records) {
  const have = new Set(records.filter(r => r.kind === 'bill' && r.values?.community).map(r => r.name));
  return COMMUNITY_LINES.filter(n => !have.has(n)).map(name => ({ name, per: 'year', values: { irregular: true, community: true, draftt: 'Other', amountType: 'Fixed', timing: 'Fixed date' } }));
}

// Maaser a month: % of gross or of take-home.
export function maaserOf({ basis = 'Take-home', pct = null, grossAnnual = null, takeHome = null }) {
  const rate = pct ?? MAASER_DEFAULT;
  const base = basis === 'Gross' ? (grossAnnual == null ? null : grossAnnual / 12) : takeHome;
  if (base == null) return { value: null, needs: basis === 'Gross' ? 'gross pay' : 'take-home pay', rate };
  return { value: base * rate, base, rate, text: `${Math.round(rate * 1000) / 10}% of ${basis === 'Gross' ? 'gross' : 'take-home'} pay a month` };
}

// Batch 15, item 10: the communities a client can pick on About you › Your community and calendar. One today (its
// switch is doc.session.community, the same one Coach tools › Session shows); a new community is one more entry here.
export const COMMUNITIES = [
  { id: 'jewish', label: 'Jewish community', key: 'community', adds: ['Yom tov and Pesach as yearly costs', 'A kosher groceries note', 'Future tuition as a goal', 'Maaser on the Budget'] },
];
// Turn a community's presets on or off. On adds its yearly lines (blank amounts) once; off keeps what was added.
export function setCommunityOn(store, on) {
  store.transaction('Community presets', () => {
    store.setIn('session', ['community'], on, 'Community presets');
    if (on) for (const l of communityLinesToAdd(store.records)) store.add('bill', l, { type: 'Yearly cost' });
  });
}
