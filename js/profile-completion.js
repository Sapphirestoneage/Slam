// SPDX-License-Identifier: AGPL-3.0-only
// Profile completion (R065) and whether Next can show (Brandon B1.1). Pure: no DOM.
import { gatesOf } from './gates.js';
import { whyAnswered } from './whynow.js';

const KEY = { 'What prompted this call': 'whyNow', 'Biggest worry': 'worry', 'Goal in their words': 'goalWords', 'First name': 'firstName', 'Last name': 'lastName',
  'Birth year': 'birthYear', State: 'state', 'Solo or couple': 'household', 'Work situation': 'workSituation', Housing: 'housing', Car: 'hasCar', Pets: 'hasPets',
  'Partner name': 'partnerName', 'Partner birth year': 'partnerBirthYear', Dependents: 'dependents', 'Health coverage': 'healthCoverage', Email: 'email',
  Roommates: 'roommates', 'Income stability': 'incomeStability', 'How they run money': 'moneyStyle' };
// Profile completion (R065): core is the Primary questions that apply; full adds the ones behind More.
export function profileCompletion(doc) {
  const p = doc.profile || {};
  const g = gatesOf(p, doc.client);
  const has = ([, v]) => v !== null && v !== undefined && v !== '';
  const parked = ([k]) => !!p.later?.[KEY[k]];
  const why = k => (whyAnswered(p, k) ? true : null); // batch 10: a chip or the words
  const core = [['What prompted this call', why('whyNow')], ['Biggest worry', why('worry')], ['Goal in their words', why('goalWords')], ['First name', p.firstName], ['Last name', p.lastName],
    ['Birth year', p.birthYear], ['State', p.state], ['Solo or couple', p.household], ['Work situation', p.workSituation], ['Housing', p.housing], ['Car', p.hasCar], ['Pets', p.hasPets],
    ['Which do you have today', p.noneOfThese || Object.values(p.areas || {}).some(v => v !== null && v !== undefined) ? true : null]];
  if (g.couple) core.push(['Partner name', p.partnerName], ['Partner birth year', p.partnerBirthYear]);
  const full = [...core, ['Dependents', p.dependents], ['Health coverage', p.healthCoverage], ['Email', p.email], ['Roommates', p.roommates], ['Income stability', p.incomeStability]];
  if (g.couple) full.push(['How they run money', p.moneyStyle]);
  const out = list => ({ done: list.filter(has).length, of: list.length, missing: list.filter(x => !has(x)).map(([l]) => l), ready: list.every(x => has(x) || parked(x)) });
  return { core: out(core), full: out(full) };
}
