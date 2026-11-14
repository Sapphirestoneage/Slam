// SPDX-License-Identifier: AGPL-3.0-only
// Quantum collapse (Eli's intake idea): the fewest questions, each one path-changing. Every answer either branches the
// flow, gates a later question, or ends it early with the one move that matters. Nothing is asked for context alone.
// The meter is honest arithmetic: the plans still possible are the product of the choices not yet made.
export const COLLAPSE = [
  { id: 'work', ask: 'How does money come in right now?', options: [['job', 'A paycheck job'], ['self', 'I work for myself'], ['both', 'Both'], ['between', 'Between jobs'], ['student', 'In school'], ['retired', 'Retired']] },
  { id: 'press', ask: 'Which one is pressing on you most?', options: [['behind', 'Behind on bills'], ['cards', 'Card or payday debt'], ['forgive', 'Student loans I hope to have forgiven'], ['thin', 'No cushion if something breaks'], ['none', 'None of these']] },
  { id: 'cushion', ask: 'If the money stopped, how long could you cover your bills?', when: a => a.press !== 'behind', options: [['0', 'Under a month'], ['1', '1 to 3 months'], ['3', '3 to 6 months'], ['6', 'More than 6']] },
  { id: 'match', ask: 'Does your job add money to a retirement plan when you do?', when: a => (a.work === 'job' || a.work === 'both') && a.press !== 'behind', options: [['all', 'Yes, and I get all of it'], ['some', 'Yes, but not all of it'], ['no', 'No'], ['unsure', 'Not sure']] },
  { id: 'want', ask: 'What do you want most from your money?', when: a => a.press === 'none' || a.press === 'forgive', options: [['date', 'To stop having to work'], ['safe', 'To feel safe'], ['enjoy', 'To enjoy more of it now'], ['guide', 'Just tell me what to do']] },
];
const MOVES = {
  stabilize: { title: 'Steady the month first', why: 'Being behind comes before everything else. Seeing how long the money lasts, and what to call about first, is the move.', page: 'runway', label: 'How long would my money last?' },
  bridge: { title: 'Stretch what you have', why: 'With no paycheck, the plan is a bridge: how many months are covered and what makes them longer.', page: 'runway', label: 'How long would my money last?' },
  debt: { title: 'Get the expensive debt gone', why: 'Card and payday interest outruns anything investing earns. A date for the last payment is the move.', page: 'debt', label: 'When am I debt free?' },
  cushion: { title: 'Build the first cushion', why: 'One month of bills in the bank turns a surprise into an errand. It comes before investing.', page: 'runway', label: 'How long would my money last?' },
  match: { title: 'Take the free money at work', why: 'A match is an instant return nothing else offers. Raising what you put in until you get all of it is the move.', page: 'plan', label: 'Your whole plan' },
  finish: { title: 'Aim at the finish line', why: 'The basics are in place. Now the question is how much, by when, and whether today gets you there.', page: 'end', label: 'Start at the finish line' },
};
// answers: { work, press, cushion, match, want }. Returns the next question, the plans still possible, and (when the
// answers already settle it) the first move, with the page to open. Early exits skip the questions that no longer matter.
export function collapseOf(answers = {}) {
  const total = COLLAPSE.reduce((n, q) => n * q.options.length, 1);
  const asked = COLLAPSE.filter(q => !q.when || q.when(answers)), open = asked.filter(q => answers[q.id] == null);
  // settled early: being behind, or being without a paycheck with a thin cushion, decides the plan on its own
  const a = answers, early = a.press === 'behind' ? 'stabilize' : a.work === 'between' && a.cushion != null && a.cushion !== '6' ? 'bridge' : null;
  const done = !!early || open.length === 0, next = done ? null : open[0];
  const left = done ? 1 : open.reduce((n, q) => n * q.options.length, 1);
  let move = null;
  if (done) {
    // the plan's own order of steps: stop going backwards (a first cushion), then the full match, then expensive debt, then the rest
    const key = early ?? (a.cushion === '0' ? 'cushion' : a.match === 'some' ? 'match' : a.press === 'cards' ? 'debt' : a.press === 'thin' ? 'cushion' : 'finish');
    move = { id: key, ...MOVES[key] };
  }
  const notes = [];
  if (done && a.press === 'forgive') notes.push('Loans on a forgiveness track are the exception to "pay debt fast": extra payments can throw away money that would have been forgiven. Pay what the plan requires and no more.');
  if (done && a.press === 'cards' && move.id !== 'debt') notes.push(move.id === 'match' ? 'Then the card debt: once the full match is coming in, every spare dollar goes there.' : 'Then the card debt: once one month of bills is set aside, every spare dollar goes there.');
  if (done && a.match === 'unsure') notes.push('Ask HR one question: "Is there a match, and what do I put in to get all of it?" It is often the best return you will ever be offered.');
  if (done && (a.work === 'self' || a.work === 'both')) notes.push('Working for yourself, set tax money aside from every payment before it feels like yours.');
  return { total, left, share: 1 - Math.log(left) / Math.log(total), asked: asked.length, answered: asked.length - open.length, next, done, shortened: done && !!early, move, notes, mirror: a.want ?? (move?.id === 'debt' || move?.id === 'stabilize' ? 'guide' : move?.id === 'cushion' || move?.id === 'bridge' ? 'safe' : null) };
}
