// SPDX-License-Identifier: AGPL-3.0-only
// The FI destinations (run of Nov 25 2026): Lean, Barista, Regular, Chubby and Fat, each a view on Plan › Goals with
// its number, its date and what it assumes. Words and lists only; the math is in js/math/fi.js and
// js/math/destinations.js. The taps are kept on the plan (program.destinations).
import { ORDER } from './foo.js';

export const DESTINATIONS = ['Lean FI', 'Barista FI', 'Regular FI', 'Chubby FI', 'Fat FI'];
export const DESTINATION_WORDS = {
  'Lean FI': { short: 'Lean', what: 'Work is optional on needs only: food, housing and transportation.' },
  'Barista FI': { short: 'Barista', what: 'Part-time work you like pays part of the bills, so the number is smaller.' },
  'Regular FI': { short: 'Regular', what: 'Work is optional at the life you live today.' },
  'Chubby FI': { short: 'Chubby', what: 'Halfway between Regular and Fat: today\'s life with some room.' },
  'Fat FI': { short: 'Fat', what: 'Work is optional with room to spare: today\'s life plus your list of extras.' },
};
// The Fat list: extras a month on top of today's spending. Names and the amounts to tap; nothing is added until
// one is tapped. (Choices to tap, not typical amounts.) Eli, Nov 25 2026 (QUESTIONS 580): these eight are right, and
// the list must keep help at home (cleaning, childcare) and giving. The names are the saved keys: do not rename one.
export const FAT_TEMPLATE = ['Travel', 'Help at home', 'Eating out', 'A bigger home', 'Health and care', 'Giving', 'Family', 'Fun and hobbies'];
export const FAT_NOTES = { 'Help at home': 'Cleaning, childcare', Giving: 'To people and causes' };
export const FAT_AMOUNTS = [0, 250, 500, 1000, 2000, 4000];
// Part-time pay and health insurance a month, to tap (choices, not typical amounts).
export const BARISTA_PAY = [500, 1000, 1500, 2000, 3000, 4000];
export const BARISTA_HEALTH = [0, 300, 500, 800, 1200, 1800];
// The FOO by destination (Eli's rule, Nov 25 2026, QUESTIONS 580): the oxygen mask steps never move. Only the late
// steps move, and a destination can add a late step of its own (FOO_EXTRA): a place in the order with its reason.
// An added step has no number of its own yet, so it shows no date and is never "where you are".
export const FOO_MASK = ['0b', '1', '2', '3', '4'];
export const FOO_EXTRA = {
  bridge: { name: 'Build the taxable bridge', sub: 'A regular investment account: money you can reach before 59 and a half' },
  hsa: { name: 'Fill the HSA first', sub: 'To the limit, and invested: tax-free money for health costs' },
  cover: { name: 'Build the health-cover bridge', sub: 'Money set aside for health insurance from the day full-time work ends until 65' },
  taxadv: { name: 'Fill every tax-advantaged account', sub: 'The plan at work, the IRA and the HSA, each to its limit, before a regular account' },
};
const late = t => [...FOO_MASK, ...t];
export const FOO_BY_DESTINATION = {
  'Regular FI': { order: ORDER, why: {} },
  'Chubby FI': { order: ORDER, why: {} },
  'Lean FI': { order: late(['5', '5b', 'bridge', '6', '7', '9', '8']), why: {
    bridge: 'A Lean number can come long before 59 and a half, so money you can reach early moves up: right after the tax-free accounts.',
    '8': 'On a Lean number the big goals wait. Work becomes optional on needs first, then the next goals get paid for.' } },
  'Barista FI': { order: late(['hsa', 'cover', '5', '5b', '6', '9', '7', '8']), why: {
    hsa: 'Part-time work often comes with no health plan, so the HSA is the first of the late steps.',
    cover: 'Health insurance is the cost that part-time pay has to carry, so its money is set aside before the other accounts.',
    '7': 'Here the leap is the move to part-time work, so it opens when the Barista number is reached.',
    '8': 'The next big goals are paid for from part-time pay and growth, after the move.' } },
  'Fat FI': { order: late(['5', 'taxadv', '5b', '6', '8', '9', '7']), why: {
    taxadv: 'A Fat number takes more years of full pay, so every account with a tax break is filled first, each year.',
    '7': 'A Fat number needs the full paycheck for longer, so the leap waits until the number is reached.' } },
};
