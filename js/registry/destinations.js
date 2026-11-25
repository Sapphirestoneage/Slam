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
// one is tapped. (Choices to tap, not typical amounts.)
export const FAT_TEMPLATE = ['Travel', 'Help at home', 'Eating out', 'A bigger home', 'Health and care', 'Giving', 'Family', 'Fun and hobbies'];
export const FAT_AMOUNTS = [0, 250, 500, 1000, 2000, 4000];
// Part-time pay and health insurance a month, to tap (choices, not typical amounts).
export const BARISTA_PAY = [500, 1000, 1500, 2000, 3000, 4000];
export const BARISTA_HEALTH = [0, 300, 500, 800, 1200, 1800];
// The FOO by destination: the same steps, in the order that fits where you are going. Only the steps after the
// tax-free step move. Proposed orders, waiting for Eli's yes (QUESTIONS.md, this run, Part 1).
const tail = t => [...ORDER.filter(id => !['7', '8', '9'].includes(id)), ...t];
export const FOO_BY_DESTINATION = {
  'Regular FI': { order: ORDER, why: {} },
  'Chubby FI': { order: ORDER, why: {} },
  'Lean FI': { order: tail(['7', '9', '8']), why: { '8': 'On a Lean number the big goals wait. Work becomes optional on needs first, then the next goals get paid for.' } },
  'Barista FI': { order: tail(['9', '7', '8']), why: { '7': 'Here the leap is the move to part-time work, so it opens when the Barista number is reached.', '8': 'The next big goals are paid for from part-time pay and growth, after the move.' } },
  'Fat FI': { order: tail(['8', '9', '7']), why: { '7': 'A Fat number needs the full paycheck for longer, so the leap waits until the number is reached.' } },
};
