// Every computed number comes back as a Result: the value, what it still needs,
// whether it rests on a Guess, and the formula in plain words (R166 Show the math).
import { money, pct, number } from '../format.js';

export function ok(id, value, text, { guess = false, unit = 'money', parts = null } = {}) {
  return { id, value, needs: [], guess, unit, text, parts };
}
// Missing inputs: no number, a list of what is needed (R024, Words: 'Locked: needs 2 numbers').
export function needs(id, list, { unit = 'money' } = {}) {
  const missing = [].concat(list);
  return { id, value: null, needs: missing, guess: false, unit, text: `Needs ${joinWords(missing)}.` };
}
export const isBlank = v => v === null || v === undefined || v === '' || Number.isNaN(v);
export function missing(inputs) {
  return Object.entries(inputs).filter(([, v]) => isBlank(v)).map(([k]) => k);
}
export function joinWords(list) {
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
}
export const fmt = { money, pct, number };
