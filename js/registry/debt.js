// SPDX-License-Identifier: AGPL-3.0-only
// Debt payoff methods (overnight F3): one config for the order the plan pays debts in, and the rule that suggests
// one from the client's stress. js/math/debt.js ORDERS does the sorting; Plan › Debt payoff shows each as its own
// calculator. The suggestion is never forced: the coach picks.
import { THRESHOLDS } from './scorecard.js';

export const METHODS = [
  { id: 'avalanche', name: 'Avalanche', words: 'Highest APR first: the least interest', default: true },
  { id: 'snowball', name: 'Snowball', words: 'Smallest balance first: the quickest wins' },
  { id: 'hassle', name: 'Return on Hassle', words: 'Highest hassle per dollar first: the coach scores each debt 1 to 5 for hassle; hassle score over balance, ties by APR, unscored last' }, // confirmed, answer 161
  { id: 'stress', name: 'Stress', words: 'Highest stress rating first, ties by APR' },
  { id: 'custom', name: 'Custom', words: 'Your own order, dragged into place; the extra interest and FI days against Avalanche show' },
];
export const METHOD_IDS = METHODS.map(m => m.id);
// Suggest from stress (answer 162): a low Confidence (at or under the Mindset hole line) or any debt rated stressful
// points to Snowball, or Return on Hassle once hassle scores are typed; a high Confidence points to Avalanche; else Avalanche.
export const SUGGEST = { lowFeeling: THRESHOLDS.mindset.hole, highFeeling: THRESHOLDS.mindset.strong, debtStress: 4 };
export function suggestMethod({ feeling = null, debts = [] } = {}) {
  const scored = debts.some(d => d.hassle != null);
  const stressed = debts.some(d => (d.stress ?? 0) >= SUGGEST.debtStress);
  if (feeling != null && feeling <= SUGGEST.lowFeeling) return { id: scored ? 'hassle' : 'snowball', why: `confidence ${feeling} of 10: quick wins first` };
  if (stressed) return { id: scored ? 'hassle' : 'snowball', why: 'a debt rated stressful: quick wins first' };
  if (feeling != null && feeling >= SUGGEST.highFeeling) return { id: 'avalanche', why: `confidence ${feeling} of 10: the least interest` };
  return { id: 'avalanche', why: 'the least interest' };
}
