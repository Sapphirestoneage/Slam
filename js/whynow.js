// SPDX-License-Identifier: AGPL-3.0-only
// Batch 10 (item 4): Home › About you › Why now as chips. Each of the three questions takes several chips
// (profile.chips[key]), a star on one (profile.chipStar[key]) and Other's own words (profile.chipOther[key]); the
// "In their words" box (profile[key]) stays, optional. A question is answered with a chip or with text. Goal chips that
// match a Plan goal or FOO step show on Plan › Goals as a suggestion the coach adds; nothing is ever added on its own.
// Pure: no DOM.
export const WHY_CHIPS = {
  whyNow: ['Debt feels out of control', 'Job change or layoff', 'Big life change (engaged, married, baby, divorce, move)', 'Big purchase coming (home, car, wedding)',
    'Behind on saving or retirement', 'Want FI or to retire early', 'Windfall or raise', 'Someone nudged me (partner, family, friend)', 'Just want to get organized', 'Other'],
  worry: ['Not enough if something goes wrong', 'Debt', 'Never being able to retire', 'No idea where the money goes', 'Money tension with partner or family', 'Job security',
    'Making a wrong big decision', 'Feeling behind', 'Other'],
  goalWords: ['Debt free', 'Emergency fund', 'Buy a home', 'FI or retire early', 'Save for a big event', 'Stop living paycheck to paycheck', 'Feel in control, less stress', 'Start investing', 'Other'],
};
export const WHY_LABELS = { whyNow: 'What prompted this call', worry: 'Biggest worry', goalWords: 'Goal in their words' };
// Goal chips that map to a Plan goal (a milestone type) or a FOO step. Debt free and FI are milestones; the rest are
// Custom milestones named for the FOO step they lead to.
export const GOAL_MAP = {
  'Debt free': { type: 'Debt free', name: 'Debt free', step: 'Heavy debt, then the rest' },
  'Emergency fund': { type: 'Custom', name: 'Emergency fund', step: 'little e, then big e' },
  'Buy a home': { type: 'Custom', name: 'Buy a home', step: 'A sinking fund for the down payment' },
  'FI or retire early': { type: 'Regular FI', name: 'Regular FI', step: 'The FI number' },
  'Save for a big event': { type: 'Custom', name: 'Save for a big event', step: 'A sinking fund' },
  'Start investing': { type: 'Custom', name: 'Start investing', step: 'The match, then the Roth IRA' },
};
const blank = v => v === null || v === undefined || String(v).trim() === '';
export const chipsOf = (p, key) => (Array.isArray(p?.chips?.[key]) ? p.chips[key] : []);
// Answered: any chip (Other counts once its words are typed, or on its own), or the words box.
export const whyAnswered = (p, key) => chipsOf(p, key).length > 0 || !blank(p?.[key]);
// The one value to show for a question: the starred chip, else the first chip, else the words (Other shows its words).
export function whyText(p, key) {
  const list = chipsOf(p, key);
  const show = c => (c === 'Other' ? (p?.chipOther?.[key] || 'Other') : c);
  const star = p?.chipStar?.[key];
  const parts = [...(star && list.includes(star) ? [star] : []), ...list.filter(c => c !== star)].map(show);
  return [...parts, ...(blank(p?.[key]) ? [] : [p[key]])].join('; ') || null;
}
// Tap a chip: on or off (several allowed). Turning off the starred chip clears the star.
export function toggleChip(p, key, chip) {
  const list = chipsOf(p, key);
  const on = list.includes(chip);
  const next = on ? list.filter(c => c !== chip) : [...list, chip];
  const patch = { chips: { ...(p?.chips || {}), [key]: next } };
  if (on && p?.chipStar?.[key] === chip) patch.chipStar = { ...(p.chipStar || {}), [key]: null };
  return patch;
}
// Star one chip as the main one (it is turned on too); starring it again clears the star.
export function starChip(p, key, chip) {
  const was = p?.chipStar?.[key] === chip;
  const list = chipsOf(p, key);
  return { chipStar: { ...(p?.chipStar || {}), [key]: was ? null : chip }, ...(list.includes(chip) ? {} : { chips: { ...(p?.chips || {}), [key]: [...list, chip] } }) };
}
// Goal suggestions for Plan › Goals: each mapped goal chip that has no matching milestone yet and was not set aside.
export function goalSuggestions(p, milestones = []) {
  const have = new Set(milestones.flatMap(r => [String(r.name ?? '').toLowerCase(), r.type === 'Custom' ? null : String(r.type ?? '').toLowerCase()]).filter(Boolean));
  const aside = new Set(p?.goalSuggest || []);
  return chipsOf(p, 'goalWords').filter(c => GOAL_MAP[c] && !aside.has(c)).map(c => ({ chip: c, ...GOAL_MAP[c], main: p?.chipStar?.goalWords === c }))
    .filter(g => !have.has(g.name.toLowerCase()) && !(g.type !== 'Custom' && have.has(g.type.toLowerCase())))
    .sort((a, b) => b.main - a.main);
}
