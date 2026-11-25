// SPDX-License-Identifier: AGPL-3.0-only
// Skin: the money sins (the run "Money sins system and the Rings theme", Part 1, Nov 25 2026). All words are SLAM's
// own, written for this quiz. A game lens with a wink, never a diagnosis: it roasts the sin, never the person.
//
// TWO FAMILIES of traits (`group`), each read on its own (result.byGroup), always as a top two:
//   sin     the main pull: the seven sins, each with its money meaning and its light side
//   change  the main way of refusing change: twelve ways, each with its light side
// Pride is in both families as two traits: `pride` (the pull: spending to look the part) and `proud` (the refusal:
// digging in when the plan says change course). read.pride says the difference in plain words.
//
// This file is the quiz (source 1 of 4) and the words of the read. The other sources (the ledger, the one-tap
// check-ins, the reactions to the app), their weights, the fading and the rules live in js/math/sins.js.
//
// HOW IT MAPS: no element. The read is a lens on habits, so it never changes the money element (core has no elements).
// ON THE CHARACTER SHEET: one line, "Main pull", with the top sin; only when the person turns it on.
const o = (id, label, add) => ({ id, label, add });
const card = (title, lines, light, label, skill, more = {}) => ({ title, lines, light, next: { label, skill }, ...more });
const fix = (name, how, check) => ({ name, how, check });

export const SINS = {
  id: 'sins', name: 'The money sins', blurb: 'Fifteen taps. Your main pull, your main way of dodging change, and the light side of each.',
  note: 'A game lens, not a test and not a diagnosis. It roasts the sin, never you. Private unless you turn it on.',
  intro: ['Fifteen real money moments. Tap the answer closest to what you would really do, not the textbook answer.',
    'You get a top two in each family, never one label. The quiz is only the first guess: your own months of money firm it up or change it.'],
  scoring: 'sum',
  groups: [{ id: 'sin', name: 'Main pull' }, { id: 'change', name: 'Main way of refusing change' }],
  traits: [
    { id: 'pride', name: 'Pride', group: 'sin' }, { id: 'greed', name: 'Greed', group: 'sin' }, { id: 'envy', name: 'Envy', group: 'sin' },
    { id: 'gluttony', name: 'Gluttony', group: 'sin' }, { id: 'lust', name: 'Lust', group: 'sin' }, { id: 'wrath', name: 'Wrath', group: 'sin' },
    { id: 'sloth', name: 'Sloth', group: 'sin' },
    { id: 'proud', name: 'Pride (digging in)', group: 'change' }, { id: 'fear', name: 'Fear', group: 'change' }, { id: 'panic', name: 'Panic', group: 'change' },
    { id: 'nostalgia', name: 'Nostalgia', group: 'change' }, { id: 'denial', name: 'Denial', group: 'change' }, { id: 'later', name: 'Procrastination', group: 'change' },
    { id: 'blame', name: 'Blame', group: 'change' }, { id: 'magic', name: 'Magical thinking', group: 'change' }, { id: 'perfect', name: 'Perfectionism', group: 'change' },
    { id: 'helpless', name: 'Helplessness', group: 'change' }, { id: 'pleasing', name: 'People-pleasing', group: 'change' }, { id: 'handoff', name: 'Handing it off', group: 'change' },
  ],
  questions: [
    // ---------- the main pull ----------
    { id: 's1', ask: 'Payday lands. What happens in the next two days?', options: [
      o('a', 'A few things I had my eye on finally hit the cart.', { lust: 2, magic: 1 }), o('b', 'Dinner out, delivery, one small upgrade. I earned it.', { gluttony: 2 }),
      o('c', 'Most of it goes to investing, and I wonder if it could be more.', { greed: 2 }), o('d', 'Nothing. The bills pay themselves and I do not look.', { sloth: 2, denial: 1 }),
      o('e', 'I see what my friends are planning so I can keep up.', { envy: 2, pleasing: 1 })] },
    { id: 's2', ask: 'A friend pulls up in a new car.', options: [
      o('a', 'Nice. I start pricing one I would like better.', { envy: 2 }), o('b', 'I make sure they know I am doing just fine too.', { pride: 2 }),
      o('c', 'I wonder what they paid. I bet I could get a better deal.', { greed: 2 }), o('d', 'I am annoyed for a day and I could not tell you why.', { wrath: 2 }),
      o('e', 'Good for them. Mine runs, and shopping for cars is a lot of work.', { sloth: 2 })] },
    { id: 's3', ask: 'A long week ends. Your Friday night money move?', options: [
      o('a', 'Delivery, dessert, and the expensive one. Twice.', { gluttony: 2 }), o('b', 'Scrolling the shops until something calls my name.', { lust: 2, later: 1 }),
      o('c', 'A round for the table, so nobody thinks I am counting.', { pride: 2, pleasing: 1 }), o('d', 'A buy I would not make on a calm day, because this week owes me.', { wrath: 2 }),
      o('e', 'Couch. The money can wait until Monday. Or later.', { sloth: 2, later: 1 })] },
    { id: 's4', ask: 'A store sends you "Last chance: 40% off ends tonight".', options: [
      o('a', 'Open. Cart. Done. It was a sign.', { lust: 2 }), o('b', 'I buy two, because more of a good thing is better.', { gluttony: 2 }),
      o('c', 'I work out the resale value first.', { greed: 2 }), o('d', 'I check what everyone else is buying from it.', { envy: 2 }),
      o('e', 'I unsubscribe. Then I resubscribe. Then I forget.', { sloth: 1, later: 1 })] },
    { id: 's5', ask: 'A company charges you twice for one thing.', options: [
      o('a', 'I am on the phone in five minutes, and I am not calm about it.', { wrath: 2 }), o('b', 'I let it go. Fighting it would mean I cannot afford it.', { pride: 2 }),
      o('c', 'I get the refund plus a credit for the trouble.', { greed: 2 }), o('d', 'I mean to call. The charge is still there.', { sloth: 2, later: 1 }),
      o('e', 'I ask my partner or a friend to sort it.', { handoff: 2 })] },
    { id: 's6', ask: 'Which buy is the hardest one for you to skip?', options: [
      o('a', 'The thing everyone in my circle already has.', { envy: 2 }), o('b', 'The nicer version, so nobody sees me with the cheap one.', { pride: 2 }),
      o('c', 'The new drop, the limited one, the one that is gone tomorrow.', { lust: 2 }), o('d', 'Food and treats. Always food and treats.', { gluttony: 2 }),
      o('e', 'Something to get even with a rotten day, or a person.', { wrath: 2 })] },
    { id: 's7', ask: 'Your savings reach a nice round number.', options: [
      o('a', 'The next round number is right there. Keep going.', { greed: 2 }), o('b', 'Time for a little reward. Then a slightly bigger one.', { gluttony: 1, lust: 1 }),
      o('c', 'Still less than they have, so it does not count yet.', { envy: 2 }), o('d', 'I would not know. I have not checked in months.', { sloth: 2, fear: 1 }),
      o('e', 'I tell people. Some of them did not ask.', { pride: 2 })] },
    { id: 's8', ask: 'Money talk with your person turns tense. What happens?', options: [
      o('a', 'I raise my voice, then buy something to make the point.', { wrath: 2 }), o('b', 'I say yes to whatever ends the talk fastest.', { pleasing: 2 }),
      o('c', 'I explain why my way is the right way, at length.', { pride: 1, proud: 1 }), o('d', 'I change the subject to what our friends spend.', { envy: 2 }),
      o('e', 'I let them run it from now on.', { handoff: 2, sloth: 1 })] },
    // ---------- the main way of refusing change ----------
    { id: 'c1', ask: 'The plan says your debt-free date moved later. First reaction?', options: [
      o('a', 'I already knew. I do not need an app to tell me.', { proud: 2 }), o('b', 'I close it. I will look when I feel stronger.', { fear: 2 }),
      o('c', 'I change every number tonight.', { panic: 2 }), o('d', 'It will sort itself out. These things do.', { denial: 2 }),
      o('e', 'I will deal with it next month.', { later: 2 }), o('f', 'The prices are rigged. What can anyone do?', { blame: 1, helpless: 1 })] },
    { id: 'c2', ask: 'Someone suggests a new way to run your budget.', options: [
      o('a', 'My old way worked fine for years.', { nostalgia: 2 }), o('b', 'I will try it once I can set it up exactly right.', { perfect: 2 }),
      o('c', 'Sure, if you set it up for me.', { handoff: 2 }), o('d', 'I have been doing this longer than you.', { proud: 2 }),
      o('e', 'I say great idea, then never do it.', { pleasing: 2 }), o('f', 'Budgets do not work for people like me.', { helpless: 2 })] },
    { id: 'c3', ask: 'The market drops hard in one week.', options: [
      o('a', 'I sell something, anything, today.', { panic: 2 }), o('b', 'I do not open the account until it comes back.', { fear: 2 }),
      o('c', 'Nothing to see here. It is just numbers.', { denial: 2 }), o('d', 'This is the fault of the people in charge.', { blame: 2 }),
      o('e', 'It will bounce back by Friday. It always does.', { magic: 2 }), o('f', 'I wait for the expert I follow to say what to do.', { handoff: 2 })] },
    { id: 'c4', ask: 'A bill comes in higher than last time.', options: [
      o('a', 'I pay it and do not read it.', { denial: 2 }), o('b', 'I put it in a pile for later.', { later: 2 }),
      o('c', 'I keep the old amount in my plan. That is what it costs in my head.', { nostalgia: 2 }), o('d', 'Whose fault is this? Someone in this house did this.', { blame: 2 }),
      o('e', 'I redo the whole budget from scratch tonight.', { panic: 1, perfect: 1 }), o('f', 'Some extra money will turn up. It usually does.', { magic: 2 })] },
    { id: 'c5', ask: 'Your plan asks you to check one number. You have not.', options: [
      o('a', 'I want it exact, and I cannot find the exact one.', { perfect: 2 }), o('b', 'I will do it tomorrow. I said that yesterday.', { later: 2 }),
      o('c', 'I am scared of what it will say.', { fear: 2 }), o('d', 'Whatever it says, I cannot change it.', { helpless: 2 }),
      o('e', 'My partner keeps those numbers.', { handoff: 2 }), o('f', 'I know my numbers. I do not need to look.', { proud: 2 })] },
    { id: 'c6', ask: 'A friend asks to borrow money you had set aside.', options: [
      o('a', 'Yes, of course. I will figure out my part later.', { pleasing: 2, later: 1 }), o('b', 'Yes, and I hope it comes back on its own.', { magic: 1, pleasing: 1 }),
      o('c', 'I say yes now and worry about it at 2 a.m.', { panic: 1, pleasing: 1 }), o('d', 'No, but I feel guilty for a week.', { fear: 1, helpless: 1 }),
      o('e', 'It is the economy. Everyone is short. Not their fault.', { blame: 2 }), o('f', 'I used to just give money and never think. I miss that.', { nostalgia: 2 })] },
    { id: 'c7', ask: 'Which sentence sounds most like you on a hard money day?', options: [
      o('a', '"Back in the day, a dollar went further."', { nostalgia: 2 }), o('b', '"Something will come through."', { magic: 2 }),
      o('c', '"If I cannot do it right, why start?"', { perfect: 2 }), o('d', '"Nothing I do moves the needle."', { helpless: 2 }),
      o('e', '"Let me just do what keeps everyone happy."', { pleasing: 2 }), o('f', '"Act now. Think later."', { panic: 2 })] },
  ],
  cards: {
    pride: card('Pride, the money kind', ['Pride spends to look the part: the nicer label, the round for the table, never asking the price out loud.', 'The bill for looking fine is paid in full every month.'],
      'High standards. You care how things are done, and people trust your taste.', 'Practice asking for help', 'social-capital-practice-asking-for-help', { skills: ['money-psychology-spend-loudly-on-values'] }),
    greed: card('Greed, the money kind', ['Greed treats enough as a rumor: one more round number, one more percent, one more deal.', 'The finish line keeps moving, and it is wearing running shoes.'],
      'Drive. You know how to grow money, and you do not leave free money on the table.', 'Write down your enough number', 'money-psychology-write-down-enough', { skills: ['money-psychology-renegotiate-enough-honestly'] }),
    envy: card('Envy, the money kind', ['Envy spends to keep up: their car, their trip, their kitchen, on your card.', 'Comparison is a shop that never closes.'],
      'You know what you want. Envy is a very loud map of your wishes.', 'Practice comparison hygiene', 'money-psychology-practice-comparison-hygiene', { skills: ['money-psychology-run-a-values-inventory-refresh'] }),
    gluttony: card('Gluttony, the money kind', ['Gluttony is too much of a good thing: the delivery, the upgrade, the second dessert, on repeat.', 'Each one is small. The stack of them is not.'],
      'You know how to enjoy life, and you make good times for the people around you.', 'Wait 24 hours on the extra', 'deals-smart-buying-wait-24-hours', { skills: ['deals-smart-buying-audit-subscriptions-quarterly'] }),
    lust: card('Lust, the money kind', ['Lust is the pull of the new thing, right now: the drop, the sale, the cart that fills itself.', 'The thrill lasts until the box arrives. The charge lasts longer.'],
      'Passion. You go all in, and you notice what is beautiful and new before anyone else.', 'Wait 24 hours before you buy', 'deals-smart-buying-wait-24-hours', { skills: ['money-psychology-catch-the-feeling-first'] }),
    wrath: card('Wrath, the money kind', ['Wrath is angry money: the buy that gets even, the refund fight that costs more than the refund, the slammed door at the money talk.', 'The receipt is quieter than the feeling was.'],
      'You stand up for what is fair, and nobody overcharges you twice.', 'Catch the feeling first', 'money-psychology-catch-the-feeling-first', { skills: ['social-capital-repair-conflicts-on-purpose'] }),
    sloth: card('Sloth, the money kind', ['Sloth lets money run itself: the subscription that renews forever, the account nobody opened since spring.', 'Nothing is on fire. Nothing is being steered either.'],
      'You love automation. Set up once, you never miss a bill.', 'Automate payday, then check one number a week', 'main-path-automate-payday-contributions', { skills: ['financial-ops-tooling-track-monthly-judgment-free'] }),
    proud: card('Pride, digging in', ['This pride hears "the plan needs to change" as "you were not right" and digs in.', 'The map updated. The pride did not.'],
      'You trust yourself. You have handled hard things, and you know it.', 'Make money discussable', 'money-psychology-make-money-discussable', { skills: ['social-capital-get-an-accountability-partner'] }),
    fear: card('Fear of looking', ['Fear keeps the app closed and the envelope sealed, as if the number cannot exist until it is seen.', 'The number is the same either way. Only one of you knows it.'],
      'You are careful. You see risks early, and you do not jump in blind.', 'Track your money without judging it', 'money-psychology-track-without-judging', { skills: ['money-psychology-grant-yourself-money-amnesty'] }),
    panic: card('Panic', ['Panic moves the whole plan at 11 p.m. because one number twitched.', 'Fast is good for fires. Most money news is not a fire.'],
      'You act when it matters. When a real emergency comes, you move.', 'Hold through real weather', 'money-psychology-hold-through-real-weather', { skills: ['money-psychology-decouple-mood-from-market'] }),
    nostalgia: card('Nostalgia', ['Nostalgia keeps the old number in the plan because that is what things used to cost.', 'The old price is a lovely memory. It is not a budget.'],
      'Loyalty. You keep what works, and you do not chase every new thing.', 'Reconcile the two money stories', 'money-psychology-reconcile-two-money-stories', { skills: ['financial-ops-tooling-version-the-plan'] }),
    denial: card('Denial', ['Denial says it is fine, it is fine, it is fine, while the statement says something else.', 'Calm is great. Calm with the lights on is better.'],
      'Optimism. You stay steady when others spin out.', 'Track monthly, judgment-free', 'financial-ops-tooling-track-monthly-judgment-free', { skills: ['money-psychology-track-without-judging'] }),
    later: card('Procrastination', ['Procrastination has a lovely plan for next month. It had one last month too.', 'Later is not a date on any calendar.'],
      'You know what can wait, and you do not panic about small things.', 'Automate payday so it does not wait for you', 'main-path-automate-payday-contributions', { skills: ['time-capital-batch-and-automate-the-chores'] }),
    blame: card('Blame', ['Blame has a long list of who did this: the prices, the boss, the bank, the person on the couch.', 'Some of the list is true. None of it moves the next dollar.'],
      'You see the system. You notice what is not fair, and you say it.', 'Engineer around your money bugs', 'money-psychology-engineer-around-your-bugs', { skills: ['money-psychology-name-your-money-scripts'] }),
    magic: card('Magical thinking', ['Magical thinking budgets with money that has not landed: the bonus, the refund, the market bounce, the lucky break.', 'Hope is a fine feeling and a poor line item.'],
      'Hope. You believe things can get better, and that keeps you going.', 'Fund the true emergency fund', 'cash-safety-net-fund-the-true-emergency-fund', { skills: ['cash-safety-net-create-sinking-funds'] }),
    perfect: card('Perfectionism', ['Perfectionism waits for the exact number, the right app, the perfect Sunday, and starts never.', 'A Guess today beats an Exact in a year.'],
      'Care for detail. When you do start, it is done well.', 'Fast from optimizing for 30 days', 'money-psychology-fast-from-optimizing-for-30-days', { skills: ['money-psychology-let-money-go-quiet'] }),
    helpless: card('Helplessness', ['Helplessness says nothing you do will move the needle, so why touch it.', 'Small moves are still moves. The needle is lighter than it looks.'],
      'You are honest about how hard things are, and you do not pretend.', 'Build the first $1,000 shield', 'cash-safety-net-build-the-1k-shield', { skills: ['money-psychology-metabolize-a-real-setback'] }),
    pleasing: card('People-pleasing', ['People-pleasing says yes first and finds the money later: the loan, the gift, the trip everyone else picked.', 'Your yes is generous. Your budget was not asked.'],
      'Generosity. People feel looked after when you are around.', 'Give first, on purpose and with a limit', 'social-capital-give-first-systematically', { skills: ['family-generational-wealth-hold-the-money-date'] }),
    handoff: card('Handing it off', ['Handing it off lets a partner, a parent or an expert hold every key, so you never have to look.', 'Sharing the work is wise. Not knowing the passwords is not.'],
      'You know how to delegate, and you trust the people around you.', 'Write the household runbook', 'financial-ops-tooling-write-the-household-runbook', { skills: ['financial-ops-tooling-lock-the-logins'] }),
  },
  // The read: what the other sources add to the quiz. Words only; js/math/sins.js has the weights and the rules.
  read: {
    title: 'Your money read',
    pride: 'Pride is in both families. As a pull, it spends to look the part (the nicer label, the round for the table). As a way of refusing change, it digs in when the plan says change course (the map updated, the pride did not). You can have one without the other.',
    // One defense for a month per read ("Test the fix"). Five are Eli's own (lust, envy, sloth, panic, greed); the rest
    // are written in kind. `check` says in plain words what counts as the pattern dropping.
    fix: {
      lust: fix('The cooling-off timer', 'Anything over your line waits in the cart for 48 hours. If you still want it then, it is yours.', 'Fewer quick buys over your line, and fewer "treat" or "bored" taps, than the month before.'),
      envy: fix('Is this yours or theirs?', 'Before a buy over your line, ask one question: would I want this if nobody I know had one?', 'Fewer "keeping up" taps and fewer buys over your line than the month before.'),
      sloth: fix('Automate, plus one number a week', 'Put one more bill or transfer on autopay, then look at one number every week. Just one.', 'The app opened each week, and fewer numbers left at Guess than the month before.'),
      panic: fix('The 72-hour rule', 'No big money change within 72 hours of hard news. Write the idea down, then come back to it.', 'Fewer "stressed" taps followed by buys, and no plan rewrite inside three days of a hard day.'),
      greed: fix('You have already won', 'Write your enough number where you will see it. When a "more" thought shows up past it, say: I have already won.', 'Fewer moves chasing the next round number than the month before.'),
      pride: fix('Price it out loud', 'Before a buy over your line, say the price and the plain option out loud, once. Then choose.', 'Fewer buys over your line, and fewer "someone asked" or "celebrating" taps on them, than the month before.'),
      gluttony: fix('One treat, named ahead', 'Pick one treat for the week in advance and enjoy it fully. The extras wait a day.', 'Fewer food and treat buys, and fewer "treat" taps, than the month before.'),
      wrath: fix('Sleep on the mad buy', 'When a buy comes with a hot feeling, tap how you feel and wait one night.', 'Fewer buys right after a "stressed" tap than the month before.'),
      proud: fix('One honest number', 'Once a week, tell one person you trust one real number: a balance, a bill, a date.', 'More "This is me" or "Not really" taps on the read, and the plan kept more often than the month before.'),
      fear: fix('The one-minute look', 'Once a week, open one balance for one minute. Look. Close. That is the whole job.', 'The app opened each week, and a statement brought in this month.'),
      nostalgia: fix('Old next to new', 'Once a week, put the old number next to today\'s number for one line of your plan, and keep the true one.', 'Fewer numbers left as they were, and the plan kept with today\'s numbers this month.'),
      denial: fix('The Sunday glance', 'Every Sunday, look at the week\'s spending for two minutes. No fixing, just looking.', 'The app opened each week, and the new date kept when Recalculating shows one.'),
      later: fix('The two-minute start', 'Once a week, start one money task for two minutes. Stopping after two minutes is allowed.', 'Fewer numbers left at Guess, and a statement brought in, compared with the month before.'),
      blame: fix('Your square', 'Each week, name one money move that is in your hands this week, and make it.', 'More moves logged, and fewer "stressed" taps followed by buys, than the month before.'),
      magic: fix('Only landed money', 'For one month, plan only with money that has landed in an account. A maybe gets no line.', 'Fewer quick buys right after payday than the month before.'),
      perfect: fix('Good enough at Guess', 'Each week, put a Guess on one number instead of waiting for the exact one.', 'Fewer numbers left empty or at Guess, and a statement brought in, compared with the month before.'),
      helpless: fix('One tiny win a week', 'Each week, make one money move under five minutes or under $20, and log it.', 'More moves logged and fewer quiet weeks than the month before.'),
      pleasing: fix('The pause line', 'Before any yes that costs money, say: let me check and get back to you. Then check.', 'Fewer "someone asked" taps on buys over your line than the month before.'),
      handoff: fix('Hold one key', 'Each week, know one number yourself: a balance, a bill date, a login. Write it down.', 'The app opened each week, and a number of yours made sharper this month.'),
    },
  },
  // ---------- Part 2: results and growth (all words SLAM's own; nothing from any show, book or game) ----------
  // The archetype of a read is made from TWO PARTS, so all 84 pairs (7 sins x 12 ways of refusing change) read well:
  // the name is "The <refusal part> <sin part>" and the line is "<the sin's habit>, <the refusal's habit>." js/math/sins.js
  // snArchetype puts them together. A virtue answers each trait. `frame` is the one short line the app adds for a type
  // on Home, on a crash day and in a hard month (snFrame); it never changes or hides a number. `pair` and `date` are the
  // couples parts (snCouple, snDate). Part 3 (the Rings theme) reads this block; it adds its own words, not a copy.
  grow: {
    arch: {
      sin: {
        pride: { noun: 'Peacock', does: 'Buys the version that looks right' },
        greed: { noun: 'Dragon', does: 'Guards the pile and wants one more round number' },
        envy: { noun: 'Chameleon', does: 'Takes on the color of whoever is spending nearby' },
        gluttony: { noun: 'Raccoon', does: 'Finds one more treat in every bag' },
        lust: { noun: 'Magpie', does: 'Flies at whatever is new and shiny' },
        wrath: { noun: 'Bull', does: 'Charges at the charge that felt unfair' },
        sloth: { noun: 'Koala', does: 'Naps while the subscriptions renew' },
      },
      change: {
        proud: { adj: 'Dug-In', then: 'and digs in when the plan says turn' },
        fear: { adj: 'Peekaboo', then: 'and peeks at the balance through its fingers' },
        panic: { adj: 'Hair-Trigger', then: 'and rewrites the whole plan when one number twitches' },
        nostalgia: { adj: 'Vintage', then: 'and keeps last year\'s prices in the plan' },
        denial: { adj: 'Unbothered', then: 'and says it is fine while the statement says otherwise' },
        later: { adj: 'Someday', then: 'and saves the hard part for next month' },
        blame: { adj: 'Courtroom', then: 'and builds a case against the prices' },
        magic: { adj: 'Wishing-Well', then: 'and counts on money that has not landed yet' },
        perfect: { adj: 'Blueprint', then: 'and waits for the exact number before starting' },
        helpless: { adj: 'Shrugging', then: 'and doubts that any small move could matter' },
        pleasing: { adj: 'Always-Yes', then: 'and says yes before the budget is asked' },
        handoff: { adj: 'Passenger', then: 'and hands someone else the keys' },
      },
    },
    // The virtue that answers each trait. An add-on may show other names for them (the game's hook, sngVoice).
    virtue: {
      pride: { name: 'Humility', line: 'Asking the price out loud, and choosing the plain one when it fits.' },
      greed: { name: 'Contentment', line: 'Knowing your enough number, and stopping there on purpose.' },
      envy: { name: 'Gratitude', line: 'Noticing what you already have before you price what they have.' },
      gluttony: { name: 'Moderation', line: 'One good thing, fully enjoyed, instead of five on repeat.' },
      lust: { name: 'Patience', line: 'Letting the cart wait a day, and still wanting it, or not.' },
      wrath: { name: 'Calm', line: 'Feeling it fully, then spending only after it cools.' },
      sloth: { name: 'Diligence', line: 'One small look at the money each week, on purpose.' },
      proud: { name: 'Openness', line: 'Letting the map update, and updating with it.' },
      fear: { name: 'Courage', line: 'Looking at the number for one minute, even on a hard day.' },
      panic: { name: 'Steadiness', line: 'Waiting out the first wave before any big move.' },
      nostalgia: { name: 'Presence', line: 'Planning with today\'s prices, and keeping the good memories.' },
      denial: { name: 'Honesty', line: 'Calm with the lights on: the real number, and steady anyway.' },
      later: { name: 'Momentum', line: 'Starting small today instead of perfect next month.' },
      blame: { name: 'Ownership', line: 'Naming the one move that is in your hands this week.' },
      magic: { name: 'Groundedness', line: 'Planning with money that has landed, and hoping for the rest.' },
      perfect: { name: 'Progress', line: 'A Guess today, made sharper over time.' },
      helpless: { name: 'Agency', line: 'Small moves, counted, because they add up.' },
      pleasing: { name: 'Self-respect', line: 'A generous yes that the budget agreed to first.' },
      handoff: { name: 'Involvement', line: 'Holding your own keys, even while you share the work.' },
    },
    // The app talks to the type: one line for each moment. home: Home on an ordinary day. crash: the day the market
    // drops (the crash drill). hard: a month the date moved later or the money ran short (Recalculating, the month check).
    // With no read or an Early read there is no extra line: the screen says what it always says.
    frame: {
      fear: { home: 'Tiny first step: open one balance for one minute today. That is the whole job.', crash: 'Tiny first step: you do not have to look at everything. Look at one account once, then close it.', hard: 'Tiny first step: pick only the one next turn above, and leave the rest for another day.' },
      panic: { home: 'Wait first: nothing on this screen needs a move tonight.', crash: 'Wait first: the 72-hour rule. Write the idea down and decide after three nights of sleep.', hard: 'Wait first: keep the usual payments, and look again in three days before changing anything.' },
      proud: { home: 'The path you are on, next to the other path: both are here, and the call is yours.', crash: 'The path you are on, next to the other path: the drop changes the numbers, and you still choose the route.', hard: 'The path you are on is the old date, the other path is the new one. Both are side by side, and you choose.' },
      nostalgia: { home: 'The old number next to today\'s: the plan runs on today\'s, and the old one stays in view.', crash: 'The old number next to today\'s: the balance before the drop is a memory, today\'s is the one the plan uses.', hard: 'The old date next to today\'s: the plan used to say the first, today\'s numbers say the second. Keep the true one.' },
      denial: { home: 'Calm with the lights on: one look at this week\'s spending, two minutes, no fixing.', crash: 'Calm is good here. Calm with the lights on is better: look once, then stay steady.', hard: 'The new date is real, and steady still works: keep it as the plan and carry on.' },
      later: { home: 'One two-minute start today. Stopping after two minutes is allowed.', crash: 'Nothing to do today. Pick the day you will look again, and put it on the calendar.', hard: 'The next turn above takes about two minutes. Start it now; stopping is allowed.' },
      blame: { home: 'Some of it is the prices. One move is still yours this week.', crash: 'The market did this. Your square today: keep the usual plan.', hard: 'A lot of this came from outside. Your square this month is the one next turn above.' },
      magic: { home: 'Only landed money counts in the plan. Hope for the rest, and plan with what is here.', crash: 'A bounce may come. The plan does not need it: it runs on what you hold today.', hard: 'The new date counts only money that has landed. If a bonus comes, it is a bonus.' },
      perfect: { home: 'A Guess is enough to start. Put a rough number on one box today.', crash: 'No exact number needed on a day like this. A rough look is plenty.', hard: 'The new date is good enough to work with. Take the next turn with the numbers you have.' },
      helpless: { home: 'Small moves count. One under five minutes today, and it is logged.', crash: 'One small move still counts on a day like this: the usual payment, kept, is a win.', hard: 'The next turn above is small on purpose, and it moves the date.' },
      pleasing: { home: 'Before the next yes that costs money: let me check and get back to you.', crash: 'Others may be making big moves today. Your plan only has to suit you.', hard: 'This month your own plan comes first. A pause before any yes that costs money.' },
      handoff: { home: 'Hold one key: know one number of yours this week.', crash: 'Whoever helps you with money, you can still know this one: your balance today.', hard: 'Read the new date yourself first, then share it with whoever helps you.' },
      pride: { home: 'Nobody sees this screen but you. The plain option is allowed here.', crash: 'A drop is not a grade, and nobody sees it but you.', hard: 'Nobody grades this month. The plain option is a fine next turn.' },
      greed: { home: 'At your enough number you have already won. Past it, more is a choice.', crash: 'A drop takes from the pile, not from enough. Your enough number is the line that matters.', hard: 'Enough is still enough. The new date is a new route, and the pile is still yours.' },
      envy: { home: 'Your plan, your numbers. Nobody else\'s are on this screen.', crash: 'Everyone\'s balance dropped today, not only yours. Compare with your own plan only.', hard: 'Your route is your own. The only comparison here is your old date and your new one.' },
      gluttony: { home: 'One treat named ahead this week, enjoyed fully. The extras can wait a day.', crash: 'A rough market day is not a reason for a bigger treat. One good one is plenty.', hard: 'This month: one treat, named ahead. The rest of the plan does the work.' },
      lust: { home: 'Anything new in the cart can wait 48 hours. If you still want it then, it is yours.', crash: 'Sales after a drop are loud. The cart can wait 48 hours.', hard: 'The cooling-off timer helps most this month: 48 hours for anything over your line.' },
      wrath: { home: 'If a bill made you mad, tap how you feel and sleep on the buy.', crash: 'Angry at the market is fair. The money move can wait one night.', hard: 'A hard month can feel unfair. Spend after the feeling cools, one night later.' },
      sloth: { home: 'Autopay is running. One number to look at this week: the one at the top.', crash: 'Your autopay keeps going. Leaving it alone today is a good choice.', hard: 'Put one more thing on autopay, then look at one number a week.' },
    },
    // Couples: what each trait does in a pair, the line for two of the same, and the closing line of each family.
    pair: {
      sin: { pride: 'wants it to look right', greed: 'wants one more round number', envy: 'wants to keep up with the people nearby', gluttony: 'wants one more treat', lust: 'wants the new thing now', wrath: 'spends hot when something feels unfair', sloth: 'wants the money to run itself' },
      change: { proud: 'digs in when the plan says turn', fear: 'would rather not look', panic: 'wants to change everything tonight', nostalgia: 'keeps the old numbers', denial: 'says it is fine', later: 'says next month', blame: 'looks for who caused it', magic: 'counts on money that has not landed', perfect: 'waits for the exact number', helpless: 'doubts a move would matter', pleasing: 'says yes to keep the peace', handoff: 'hands the keys to the other' },
      same: 'Two of a kind: the pull is twice as loud, and so is the light side. Say it out loud together, so it stops steering in quiet.',
      close: { sin: 'Agree on the one goal this month\'s money serves first, then give each pull a small, named place in the plan.', change: 'Agree on one look at the numbers, at a set time, and on what you will do after it.' },
    },
    // The money date: a few prompts to tap through together. open and close frame it; each trait adds its prompt.
    date: {
      open: ['Pick a calm time, a drink you both like, and half an hour. Phones face down.', 'Each of you names one money win from this month, however small.'],
      close: ['Pick one move for the month together and write it down.', 'Put the next money date on the calendar. Then stop: the date is done.'],
      pride: 'Name one thing you buy so it looks right. Would you still buy it if nobody saw?',
      greed: 'Say your enough number out loud. What would you do with the time once you reach it?',
      envy: 'Name one thing you wanted because someone else had it. Is it still yours to want?',
      gluttony: 'Pick one treat each for the week ahead, named now, and enjoy it fully.',
      lust: 'What is in a cart right now? Agree on a 48-hour wait for anything over your line.',
      wrath: 'Which bill or charge made you mad lately? Say it, then pick one calm next step.',
      sloth: 'Pick one bill to put on autopay together, and one number to look at each week.',
      proud: 'Which part of the plan is hardest to change your mind on? Say why, then listen.',
      fear: 'Which number would you rather not look at? Look at it together for one minute.',
      panic: 'Agree on the 72-hour rule: no big money change within three days of hard news.',
      nostalgia: 'Pick one old price in the plan and put today\'s next to it. Keep the true one.',
      denial: 'Look at last week\'s spending together for two minutes. Just look, no fixing.',
      later: 'Pick one money task you have both been putting off. Start it now, for two minutes.',
      blame: 'Each of you names one move that is in your own hands this month.',
      magic: 'Which money are you counting on that has not landed yet? Plan this month without it.',
      perfect: 'Put a rough number on one box together. Good enough today beats exact next month.',
      helpless: 'Pick one tiny win for the week: under five minutes or under twenty dollars.',
      pleasing: 'Agree on a pause line, "let me check and get back to you", before any yes that costs money.',
      handoff: 'The one who holds the keys shows the other one login and one balance.',
    },
  },
  // ---------- Part 3: the Rings theme (all words SLAM's own; nothing from any show, book, game or franchise) ----------
  // Seven rings, one for each sin, each with an original ruler. Dark comedy, cheeky and PG-13: it roasts the sin and
  // the ruler, never the person; the person is always the one escaping. The game shows these words only while its
  // Rings theme is picked (game/features/rings.js), with the plain word next to each themed word. js/math/sins.js
  // (snRuler, snRings, snBoss, snRingWords) puts them together. An add-on may bring a second voice (the game's hook,
  // RG_VOICE); none of its words are here. The ring order is the person's own: their main pull is the bottom ring.
  rings: {
    rulers: {
      pride: { name: 'Lady Lookatme', ring: 'the Ring of Mirrors', roast: 'Lady Lookatme has never met a price tag she could not turn into a photo.', taunt: 'Get the nicer one. Everyone is watching, darling.', beat: 'She goes pale when the plain option gets said out loud.' },
      greed: { name: 'The Upsell', ring: 'the Ring of Round Numbers', roast: 'The Upsell thinks enough is a number that moves every time you get close.', taunt: 'You are so close to the next round number. Just one more lap.', beat: 'It goes quiet the moment you say your enough number out loud.' },
      envy: { name: 'Countess Compare', ring: 'the Ring of Other People\'s Windows', roast: 'Countess Compare keeps a scrapbook of your neighbor\'s kitchen.', taunt: 'They just got one. Funny, you still have the old one.', beat: 'She has no comeback for: would I want this if nobody I know had one?' },
      gluttony: { name: 'The Duke of Delivery', ring: 'the Ring of Second Helpings', roast: 'The Duke of Delivery knows your door code and your weakest hour.', taunt: 'Long day. Add the dessert. Add the other dessert.', beat: 'One treat, named ahead, and his menu stops working on you.' },
      lust: { name: 'Impulsa', ring: 'the Ring of Shiny Carts', roast: 'Impulsa falls in love at first scroll and breaks up at the statement.', taunt: 'Only a few left. Buy now, think never.', beat: 'Two days in the cart and she forgets your name.' },
      wrath: { name: 'Rage Receipt', ring: 'the Ring of Slammed Doors', roast: 'Rage Receipt buys things to win arguments with nobody in the room.', taunt: 'They made you mad. Spend it off. You earned it.', beat: 'One night of sleep cools every receipt it prints.' },
      sloth: { name: 'Lord Later', ring: 'the Ring of the Snooze Button', roast: 'Lord Later has a to-do list older than his couch, and a nap planned after it.', taunt: 'Tomorrow is a lovely day to start. So is next month.', beat: 'He cannot stand a two-minute start, or anything on autopay.' },
    },
    // The themed words, each shown with its plain word next to it.
    words: {
      checkin: 'The fine print', ward: 'Your ward', escape: 'The escape route', climb: 'The climb out', boss: 'Your ruler',
      intro: 'Seven rings, one ruler each, and you are the one escaping. Every virtue you grow climbs you up a ring.',
      start: 'You start in {ring}, the ring of {sin}. Its ruler is {ruler}.',
      on: 'You are in {ring}. {left} to the open air.',
      out: 'You climbed out of every ring. The rulers are filing complaints.',
      none: 'No ring climbed yet. A month of your ward, or a retake that shows {sin} getting quieter, climbs you up one.',
      stepTake: 'A retake: {sin} went from {a}% to {z}% of your pull. {virtue} climbed you up a ring.',
      stepWard: 'A month of the ward "{ward}": the pattern dropped. {virtue} climbed you up a ring.',
      hold: '{ruler} holds {hold}% of your pull.',
      bossLine: 'The ruler of your main pull is your boss here. Every ring you climb is a hit on {ruler}.',
    },
  },
  confidence: { margin: 0.1, sources: 2 },
  core: { sheet: 'Main pull', how: 'No element: the money sins read habits, so a result never changes your money element. The quiz is the first of four sources; the others are your ledger, one-tap check-ins and how you use the app.' },
};
