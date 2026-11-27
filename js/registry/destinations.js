// SPDX-License-Identifier: AGPL-3.0-only
// The FI destinations (run of Nov 25 2026): Lean, Barista, Regular, Chubby and Fat, each a view on Plan › Goals with
// its number, its date and what it assumes. Words and lists only; the math is in js/math/fi.js and
// js/math/destinations.js. The taps are kept on the plan (program.destinations).

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
// One FOO order for everyone (Eli, Nov 27 2026): the FIRE types are statuses on the FOO timeline, not goals, so no
// type moves or adds a step. The order by Lean, Barista or Fat of Nov 25 2026 is removed; what it added (the taxable
// bridge, the HSA and the health-cover bridge, every tax-advantaged account) is now an option under the status that
// opens it (data/library/status-options.json). Compatibility: a plan saved with program.destinations.foo keeps the
// key; nothing reads it.

// The FIRE dashboard (Plan › FIRE, run Finish everything partly built, Part 18). The pace taps: more a month into
// investing, a what-if on the same path (choices to tap, not typical amounts). The return taps are the plan's own pace
// presets (Reference data presets.pace).
export const FIRE_PACES = [0, 100, 250, 500, 1000];
// The FIRE types in plain words: what each one is, who it tends to fit, and what it asks. The names are the ones the
// FIRE community uses; the words are SLAM's own. Coast has no number of its own here: it is a moment on the way.
export const FIRE_EXPLAIN = [
  { key: 'Lean FI', name: 'Lean FIRE', what: 'Enough invested to pay for the basics for good: food, housing and getting around.', fits: 'You want the soonest exit and are fine living simply.', asks: 'A small cushion for surprises, and fun paid from work you choose.' },
  { key: 'Coast', name: 'Coast FIRE', what: 'Enough invested that growth alone gets you to your FI number by the age you set, with nothing more added.', fits: 'You saved early and want to take your foot off the gas now.', asks: 'Your work still pays today\'s bills; you just stop saving for later.' },
  { key: 'Barista FI', name: 'Barista FIRE', what: 'Part-time work you like pays part of the bills, so the number you need invested is smaller.', fits: 'You like some work and want to leave full-time work sooner.', asks: 'Steady part-time pay, and a plan for health insurance.' },
  { key: 'Regular FI', name: 'FIRE', what: 'Enough invested to pay for the life you live today, for good. Work becomes optional.', fits: 'You want today\'s life without a paycheck.', asks: 'The full number, at your withdrawal rate.' },
  { key: 'Chubby FI', name: 'Chubby FIRE', what: 'Halfway between FIRE and Fat FIRE: today\'s life with some room.', fits: 'You want a bit more than today, without the years Fat takes.', asks: 'A bigger number than FIRE, so a later date.' },
  { key: 'Fat FI', name: 'Fat FIRE', what: 'Enough invested for today\'s life plus your list of extras: travel, help at home, giving.', fits: 'You want room to spare and are willing to work longer for it.', asks: 'The biggest number, so the most years of full pay.' },
];
