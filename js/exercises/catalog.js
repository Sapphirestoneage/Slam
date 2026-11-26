// SPDX-License-Identifier: AGPL-3.0-only
// The Exercises screen's list (run "Finish everything partly built", Part 7, Money psychology, Nov 26 2026). ONE list
// for both apps: pure, and with no import on purpose, so tools/game_exercises_build.mjs copies it word for word into
// game/core/exercises.js. Every name starts with ex or EX_ because the game has one global scope.
//
// The screen holds three groups:
//   calm     the letter from your calm self (js/exercises/calm-letter.js, built before this list; the screen shows it
//            as its first card and does not copy it)
//   write    ten short pieces of writing about you and money
//   after    three prompts for life after work, also opened from "Ready for retirement, apart from the money"
// Each exercise: { id, group, title, minutes, line (one line on the closed card), prompt, starts (lines to tap that go
// into the box, so nobody faces an empty page), tool (optional: the screen with the numbers it talks about) }.
// Every prompt is SLAM's own wording.
//
// An answer is kept under the exercise id (web: settings.exercises[id]; game: c.x.ex[id]) as
// { text, at, seen }. seen is 'Me only' unless the person turns sharing on: then 'Shared'. js/privacy.js takes a
// Me only answer out of anything shared, and the game shows a coach only a Shared one.
export const EX_ME_ONLY = 'Me only';
export const EX_SHARED = 'Shared';
export const EX_MAX = 6000; // characters kept for one answer: about three pages
export const EX_GROUPS = [
  { id: 'calm', title: 'For a harder month', cap: 'A few lines from you, kept for a month that needs them.' },
  { id: 'write', title: 'Ten money exercises', cap: 'Short pieces of writing about you and money. Any order, any length, skip any of them.' },
  { id: 'after', title: 'Life after work', cap: 'Three prompts for the part of retirement that is not money.' },
];
export const EX_LIST = [
  { id: 'letter-to-money', group: 'write', title: 'A letter to money', minutes: 10,
    line: 'Write to money as if it were a person in your life.',
    prompt: 'Imagine money is someone you know well. Write them a letter: how the two of you get along, what you wish were different, and what you would like from here on.',
    starts: ['Dear money,', 'When I think about you, I feel', 'What I want from you now is', 'What I can offer you in return is'] },
  { id: 'first-memory', group: 'write', title: 'Your earliest money memory', minutes: 10,
    line: 'The first time you remember money mattering.',
    prompt: 'Go back as far as you can. What is the first moment you remember money being part of the picture? Where were you, who was there, and what did you decide about money that day?',
    starts: ['The first time I remember money, I was', 'The people around me were', 'What I took from it was', 'Today that memory still shows up when'] },
  { id: 'shame-inventory', group: 'write', title: 'Shame inventory', minutes: 15,
    line: 'The money moments you keep quiet about, written down once.',
    prompt: 'Most people carry a few money moments they would rather not talk about. List the ones that come to mind. Next to each, write what you would say to a friend who told you the same story.',
    starts: ['A money moment I keep to myself is', 'What I tell myself about it is', 'What I would say to a friend with the same story is', 'What I can let go of now is'] },
  { id: 'finish-sentences', group: 'write', title: 'Finish these sentences', minutes: 5,
    line: 'Quick sentence starters. Write the first thing that comes.',
    prompt: 'Tap a sentence to put it in the box, then finish it with the first words that come. Speed helps: the first answer is often the most honest one.',
    starts: ['Money is', 'People with a lot of money are', 'If I had more money, I would', 'In my family, money meant', 'I would feel safe with money when', 'Talking about money makes me feel'] },
  { id: 'scarcity-audit', group: 'write', title: 'Scarcity and abundance audit', minutes: 10,
    line: 'Where "never enough" talks, and where "enough" does.',
    prompt: 'Think about the last few weeks. Where did a "there is never enough" voice make a money choice for you? Where did you feel there was enough? Write a little about each.',
    starts: ['A time "never enough" made the choice was', 'A time I felt there was enough was', 'The voice of "never enough" sounds like', 'One place I already have enough is'] },
  { id: 'alter-ego', group: 'write', title: 'Your money alter ego', minutes: 10,
    line: 'A version of you who handles money the way you want to.',
    prompt: 'Picture a version of you who is calm and clear with money. Give them a name. How do they open a bill, answer a sale email, or plan a month? What would they do this week?',
    starts: ['My money alter ego is called', 'When a bill arrives, they', 'When something is on sale, they', 'This week they would'] },
  { id: 'forgiveness-letter', group: 'write', title: 'A forgiveness letter', minutes: 15,
    line: 'A kind letter to the you who made a money choice that still stings.',
    prompt: 'Think of a money choice that still stings. Write to the person you were then, with what they knew and what they were carrying. What do you understand now that you can give back to them?',
    starts: ['To the me who', 'You did what made sense with what you knew:', 'What I understand now is', 'I am letting this go because'] },
  { id: 'values-spending', group: 'write', title: 'Values and spending', minutes: 15,
    line: 'What matters most to you, next to where the money goes.',
    prompt: 'Name the three things that matter most to you. Then look at where your money went last month. Where do the two line up, and where does one line pull away from what you care about?',
    starts: ['The three things that matter most to me are', 'Where my spending matches them:', 'One line that does not match:', 'One small change I would like to try:'], tool: 'values' },
  { id: 'enough', group: 'write', title: 'The Enough exercise', minutes: 10,
    line: 'What enough looks like for you, in plain words.',
    prompt: 'Describe an ordinary week in a life that feels like enough: where you live, what you do, who is around, what you no longer worry about. Then write what you would happily do without.',
    starts: ['Enough, for me, looks like', 'An ordinary week would have', 'I would no longer worry about', 'I could happily do without'], tool: 'enough' },
  { id: 'autobiography', group: 'write', title: 'Your money autobiography', minutes: 20,
    line: 'Your life story told through money, chapter by chapter.',
    prompt: 'Tell your story through money, one chapter for each part of your life: growing up, your first pay, the big turns, today. Give each chapter a title and a few lines.',
    starts: ['Chapter one, growing up:', 'Chapter two, my first pay:', 'A big turn was', 'The chapter I am in now is called', 'The next chapter I would like to write is'] },
  { id: 'why-journal', group: 'after', title: 'Why journal', minutes: 5,
    line: 'One line on why you are doing this, written now and again.',
    prompt: 'Why are you saving and planning at all? Write a few lines today. Come back in a few months and add another entry: the reasons tend to change, and seeing them side by side helps.',
    starts: ['Today, I am doing this because', 'The person I am doing this for is', 'What I want more of is', 'What I want less of is'] },
  { id: 'little-p', group: 'after', title: 'Little p purpose', minutes: 10,
    line: 'Small, everyday reasons to get up, not one big life mission.',
    prompt: 'Purpose does not have to be one big mission. List the small things that make a day feel worth it: a person you help, a thing you make, a place you go, a skill you are growing.',
    starts: ['A small thing that makes a day good is', 'Someone who is glad I show up is', 'Something I like to make or fix is', 'A skill I want to keep growing is'] },
  { id: 'post-fi', group: 'after', title: 'Who you are after work', minutes: 10,
    line: 'An answer to "So what do you do?" with no job title in it.',
    prompt: 'Imagine work is a choice now. Someone asks "So what do you do?" Write the answer you would like to give, with no job title in it. Then write how you would spend a Tuesday.',
    starts: ['These days I', 'People know me as someone who', 'On a Tuesday you would find me', 'What I am still curious about is'] },
];
export const exById = id => EX_LIST.find(e => e.id === id) ?? null;
export const exOfGroup = g => EX_LIST.filter(e => e.group === g);
// Tap a line: it goes on a new line at the end of the box, once. A line already in the box is not added again.
export function exAddStart(text, start) {
  const t = String(text ?? '').replace(/\s+$/, '');
  if (!start || t.includes(start)) return t;
  return t ? `${t}\n${start} ` : `${start} `;
}
// What is kept: the words trimmed and cut at EX_MAX. Empty words keep nothing (null), never an empty answer.
export function exClean(text) {
  const t = String(text ?? '').trim();
  return t ? t.slice(0, EX_MAX) : null;
}
// The answer as kept, with the who-sees choice. seen: anything but EX_SHARED is Me only.
export const exAnswer = (text, seen, at) => {
  const t = exClean(text);
  return t ? { text: t, at, seen: seen === EX_SHARED ? EX_SHARED : EX_ME_ONLY } : null;
};
// What the person at the screen may read of one answer. mine: they own it. Someone else (a coach who opened the
// game) reads the words only when the owner turned sharing on; otherwise only that something is kept.
export function exFor(answer, mine) {
  if (!answer || !answer.text) return { kept: false, text: null, hidden: false };
  if (mine || answer.seen === EX_SHARED) return { kept: true, text: answer.text, hidden: false, at: answer.at ?? null, seen: answer.seen === EX_SHARED ? EX_SHARED : EX_ME_ONLY };
  return { kept: true, text: null, hidden: true, at: answer.at ?? null, seen: EX_ME_ONLY };
}
// How many of a set of exercises have words kept. ids: the ids to count (all of EX_LIST by default).
export function exCount(all, ids = EX_LIST.map(e => e.id)) {
  const done = ids.filter(id => all?.[id]?.text).length;
  return { done, of: ids.length };
}
// The voice-to-text note: plain words, the same in both apps.
export const EX_VOICE = {
  on: 'Voice to text uses your browser\'s own speech feature; some browsers send the sound to their maker to turn it into words. SLAM keeps no sound, only the words in the box.',
  off: 'This browser has no voice to text. Typing works everywhere.',
};
