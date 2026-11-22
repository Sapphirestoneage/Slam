/* ===== chart.js: the Money Chart. Statements, traits and scoring are Eli's own (ported from the Slam repo, js/quiz.js). ===== */
// The Money Chart (Eli's money personality quiz): five elements, twenty traits, one bank of 100 statements with a 10 and
// a 25 nested inside it, so going deeper never re-asks. Elements are muscles built by what life asked of you, not fixed
// types: the result is where you sit on each scale. Often the muscle that carried you here is the one in the way next.
// Items and scoring are Eli's (the "Money Chart quiz item banks", Aug 2026): about half are reverse-keyed (dir -1), each
// trait is the average of its statements, each element the average of its traits. Pure, no DOM.
const MC_EL = [
  {
    id: "water",
    name: "Water",
    word: "Feeling",
    high: "Money lands in your body first. You feel a number before you think about it.",
    low: "Money rarely stirs you. That keeps you steady, and can hide how a choice will feel to live with.",
    mirror: "guide",
    tool: ["drills", null, "Practice a hard month"],
  },
  {
    id: "earth",
    name: "Earth",
    word: "Security",
    high: "You hold on, save first and keep a cushion.",
    low: "You spend easily and trust the next paycheck to arrive.",
    mirror: "safe",
    tool: ["runway", null, "How long would my money last?"],
  },
  {
    id: "air",
    name: "Air",
    word: "Analysis",
    high: "You plan ahead, compare, and take a measured risk.",
    low: "You take money as it comes.",
    mirror: "date",
    tool: ["all", null, "All your numbers"],
  },
  {
    id: "fire",
    name: "Fire",
    word: "Drive",
    high: "You push: for freedom, for more, for sooner.",
    low: "You are content with where you are.",
    mirror: "date",
    tool: ["plan", null, "Your next step"],
  },
  {
    id: "spirit",
    name: "Spirit",
    word: "Purpose",
    high: "You know what the money is for and what enough looks like.",
    low: 'The "for what?" is still open.',
    mirror: "enjoy",
    tool: ["design", null, "Design my life"],
  },
];
const MC_BANK = [
  {
    id: "q1",
    el: "water",
    trait: "Anxiety",
    dir: 1,
    text: "Checking my balance can change my whole mood.",
    ten: 5,
    std: 6,
  },
  {
    id: "q2",
    el: "water",
    trait: "Anxiety",
    dir: -1,
    text: "Money is one of the last things on my mind on a normal day.",
    ten: 0,
    std: 12,
  },
  {
    id: "q3",
    el: "water",
    trait: "Anxiety",
    dir: 1,
    text: "Even when things are fine, part of me is braced for them not to be.",
    ten: 0,
    std: 0,
  },
  {
    id: "q4",
    el: "water",
    trait: "Anxiety",
    dir: -1,
    text: "I can think about my finances without any knot in my stomach.",
    ten: 0,
    std: 0,
  },
  {
    id: "q5",
    el: "water",
    trait: "Anxiety",
    dir: 1,
    text: "A surprise expense ruins my day more than it should.",
    ten: 0,
    std: 0,
  },
  {
    id: "q6",
    el: "water",
    trait: "Avoidance",
    dir: 1,
    text: "There's money mail or email I've been putting off opening.",
    ten: 8,
    std: 16,
  },
  {
    id: "q7",
    el: "water",
    trait: "Avoidance",
    dir: -1,
    text: "I open every bill the day it shows up.",
    ten: 0,
    std: 0,
  },
  {
    id: "q8",
    el: "water",
    trait: "Avoidance",
    dir: 1,
    text: "When money stresses me out, my instinct is to look away, not look closer.",
    ten: 0,
    std: 0,
  },
  {
    id: "q9",
    el: "water",
    trait: "Avoidance",
    dir: -1,
    text: "I'd rather know a bad number than not know at all.",
    ten: 0,
    std: 0,
  },
  {
    id: "q10",
    el: "water",
    trait: "Avoidance",
    dir: 1,
    text: "I've gone months without really looking at where my money went.",
    ten: 0,
    std: 0,
  },
  {
    id: "q11",
    el: "water",
    trait: "Shame",
    dir: 1,
    text: "I'd be embarrassed for someone to see how I actually handle money.",
    ten: 0,
    std: 23,
  },
  {
    id: "q12",
    el: "water",
    trait: "Shame",
    dir: -1,
    text: "I could talk openly about my finances with a friend and not feel judged.",
    ten: 0,
    std: 0,
  },
  {
    id: "q13",
    el: "water",
    trait: "Shame",
    dir: 1,
    text: "Part of me feels like I should be further along than I am.",
    ten: 0,
    std: 0,
  },
  {
    id: "q14",
    el: "water",
    trait: "Shame",
    dir: 1,
    text: "I keep how I really feel about money to myself.",
    ten: 0,
    std: 0,
  },
  {
    id: "q15",
    el: "water",
    trait: "Shame",
    dir: -1,
    text: "I don't tie how I feel about myself to how much I've saved.",
    ten: 0,
    std: 0,
  },
  {
    id: "q16",
    el: "water",
    trait: "Confidence",
    dir: 1,
    text: "If a money problem landed on me tomorrow, I'd figure it out.",
    ten: 0,
    std: 9,
  },
  {
    id: "q17",
    el: "water",
    trait: "Confidence",
    dir: -1,
    text: "I often feel out of my depth with money decisions.",
    ten: 0,
    std: 0,
  },
  {
    id: "q18",
    el: "water",
    trait: "Confidence",
    dir: 1,
    text: "I trust myself to make good calls with money.",
    ten: 0,
    std: 0,
  },
  {
    id: "q19",
    el: "water",
    trait: "Confidence",
    dir: -1,
    text: "Big money choices make me feel like I'm just guessing.",
    ten: 0,
    std: 0,
  },
  {
    id: "q20",
    el: "water",
    trait: "Confidence",
    dir: 1,
    text: "I've handled hard money situations before, and I'd handle them again.",
    ten: 0,
    std: 0,
  },
  {
    id: "q21",
    el: "water",
    trait: "Bandwidth",
    dir: 1,
    text: "Dealing with money wears me out, even when nothing's gone wrong.",
    ten: 0,
    std: 18,
  },
  {
    id: "q22",
    el: "water",
    trait: "Bandwidth",
    dir: -1,
    text: "Money tasks don't take much out of me.",
    ten: 0,
    std: 0,
  },
  {
    id: "q23",
    el: "water",
    trait: "Bandwidth",
    dir: 1,
    text: "By the time I deal with the money stuff, I've got little left for the big decisions.",
    ten: 0,
    std: 0,
  },
  {
    id: "q24",
    el: "water",
    trait: "Bandwidth",
    dir: -1,
    text: "I can look at my finances and move on with my day easily.",
    ten: 0,
    std: 0,
  },
  {
    id: "q25",
    el: "earth",
    trait: "Frugality",
    dir: 1,
    text: "Finding a way to spend less gives me a small hit of satisfaction.",
    ten: 0,
    std: 13,
  },
  {
    id: "q26",
    el: "earth",
    trait: "Frugality",
    dir: -1,
    text: "Paying full price for something doesn't bother me at all.",
    ten: 0,
    std: 0,
  },
  {
    id: "q27",
    el: "earth",
    trait: "Frugality",
    dir: 1,
    text: "I get more pleasure from a good deal than from a nice thing.",
    ten: 0,
    std: 0,
  },
  {
    id: "q28",
    el: "earth",
    trait: "Frugality",
    dir: 1,
    text: "Wasting money bothers me more than it bothers most people I know.",
    ten: 0,
    std: 0,
  },
  {
    id: "q29",
    el: "earth",
    trait: "Frugality",
    dir: -1,
    text: "I rarely think about whether I'm getting my money's worth.",
    ten: 0,
    std: 0,
  },
  {
    id: "q30",
    el: "earth",
    trait: "Holding on",
    dir: 1,
    text: "Spending money I can easily afford is still a little painful.",
    ten: 4,
    std: 5,
  },
  {
    id: "q31",
    el: "earth",
    trait: "Holding on",
    dir: -1,
    text: "Money kind of burns a hole in my pocket.",
    ten: 0,
    std: 0,
  },
  {
    id: "q32",
    el: "earth",
    trait: "Holding on",
    dir: 1,
    text: "I often talk myself out of buying things I could easily afford.",
    ten: 0,
    std: 0,
  },
  {
    id: "q33",
    el: "earth",
    trait: "Holding on",
    dir: -1,
    text: "When I want something, I usually just buy it.",
    ten: 0,
    std: 22,
  },
  { id: "q34", el: "earth", trait: "Holding on", dir: 1, text: "I hold onto my money tightly.", ten: 0, std: 0 },
  {
    id: "q35",
    el: "earth",
    trait: "Cushion",
    dir: 1,
    text: "I always want a cushion of cash I don't touch.",
    ten: 10,
    std: 7,
  },
  {
    id: "q36",
    el: "earth",
    trait: "Cushion",
    dir: -1,
    text: "I'm comfortable spending down close to zero and rebuilding.",
    ten: 0,
    std: 0,
  },
  {
    id: "q37",
    el: "earth",
    trait: "Cushion",
    dir: 1,
    text: "Having savings is what lets me sleep at night.",
    ten: 0,
    std: 0,
  },
  {
    id: "q38",
    el: "earth",
    trait: "Cushion",
    dir: -1,
    text: "An empty savings account wouldn't rattle me much.",
    ten: 0,
    std: 0,
  },
  {
    id: "q39",
    el: "earth",
    trait: "Cushion",
    dir: 1,
    text: "I put money away before I let myself spend it.",
    ten: 0,
    std: 0,
  },
  {
    id: "q40",
    el: "earth",
    trait: "Control",
    dir: 1,
    text: "Knowing exactly where my money is calms me down.",
    ten: 0,
    std: 0,
  },
  {
    id: "q41",
    el: "earth",
    trait: "Control",
    dir: -1,
    text: "I'm fine not knowing my exact balance as long as there's enough.",
    ten: 0,
    std: 0,
  },
  {
    id: "q42",
    el: "earth",
    trait: "Control",
    dir: 1,
    text: "I like having a money system I stick to.",
    ten: 0,
    std: 0,
  },
  {
    id: "q43",
    el: "earth",
    trait: "Control",
    dir: -1,
    text: "Tracking every dollar sounds exhausting, not comforting.",
    ten: 0,
    std: 0,
  },
  {
    id: "q44",
    el: "air",
    trait: "Planning",
    dir: 1,
    text: "I think several years ahead when it comes to money.",
    ten: 0,
    std: 4,
  },
  { id: "q45", el: "air", trait: "Planning", dir: -1, text: "I mostly deal with money as it comes.", ten: 0, std: 0 },
  {
    id: "q46",
    el: "air",
    trait: "Planning",
    dir: 1,
    text: "I'd rather have a plan than leave things open.",
    ten: 0,
    std: 0,
  },
  { id: "q47", el: "air", trait: "Planning", dir: -1, text: "Detailed plans make me feel boxed in.", ten: 0, std: 0 },
  {
    id: "q48",
    el: "air",
    trait: "Planning",
    dir: 1,
    text: "I've mapped out where I want to be financially.",
    ten: 0,
    std: 0,
  },
  {
    id: "q49",
    el: "air",
    trait: "Risk",
    dir: 1,
    text: "The thought of my money just sitting still bothers me more than the risk of losing some.",
    ten: 3,
    std: 8,
  },
  { id: "q50", el: "air", trait: "Risk", dir: -1, text: "I'd rather earn less and know it's safe.", ten: 0, std: 0 },
  {
    id: "q51",
    el: "air",
    trait: "Risk",
    dir: 1,
    text: "Watching something I own drop in value wouldn't make me want to sell.",
    ten: 0,
    std: 0,
  },
  {
    id: "q52",
    el: "air",
    trait: "Risk",
    dir: -1,
    text: "I'd lose sleep if my money could swing up and down a lot.",
    ten: 0,
    std: 0,
  },
  {
    id: "q53",
    el: "air",
    trait: "Risk",
    dir: 1,
    text: "I'm comfortable taking a real risk for a bigger reward.",
    ten: 0,
    std: 0,
  },
  {
    id: "q54",
    el: "air",
    trait: "Optimizing",
    dir: 1,
    text: "It bugs me to think I could've gotten a better deal.",
    ten: 0,
    std: 0,
  },
  {
    id: "q55",
    el: "air",
    trait: "Optimizing",
    dir: -1,
    text: '"Good enough" is usually good enough for me with money.',
    ten: 0,
    std: 0,
  },
  {
    id: "q56",
    el: "air",
    trait: "Optimizing",
    dir: 1,
    text: "I'll spend real time to squeeze out a little more.",
    ten: 0,
    std: 0,
  },
  {
    id: "q57",
    el: "air",
    trait: "Optimizing",
    dir: -1,
    text: "I'd rather make a decent choice now than a perfect one later.",
    ten: 7,
    std: 15,
  },
  {
    id: "q58",
    el: "air",
    trait: "Optimizing",
    dir: 1,
    text: "Leaving money on the table drives me a little crazy.",
    ten: 0,
    std: 0,
  },
  {
    id: "q59",
    el: "air",
    trait: "Living for now",
    dir: 1,
    text: "I'd rather enjoy money now than wait for more later.",
    ten: 0,
    std: 0,
  },
  {
    id: "q60",
    el: "air",
    trait: "Living for now",
    dir: -1,
    text: "I'm good at putting off something I want for something better down the road.",
    ten: 0,
    std: 0,
  },
  {
    id: "q61",
    el: "air",
    trait: "Living for now",
    dir: 1,
    text: "The future feels far away when there's something I want today.",
    ten: 0,
    std: 0,
  },
  {
    id: "q62",
    el: "air",
    trait: "Living for now",
    dir: -1,
    text: "I naturally think about my future self when I spend.",
    ten: 0,
    std: 0,
  },
  {
    id: "q63",
    el: "air",
    trait: "Doing it myself",
    dir: 1,
    text: "I'd rather handle my money myself than hand it to an expert.",
    ten: 0,
    std: 20,
  },
  {
    id: "q64",
    el: "air",
    trait: "Doing it myself",
    dir: -1,
    text: "I'd happily pay someone to just take money decisions off my plate.",
    ten: 0,
    std: 0,
  },
  {
    id: "q65",
    el: "fire",
    trait: "Freedom",
    dir: 1,
    text: "What I want most from money is to not have to answer to anyone.",
    ten: 2,
    std: 2,
  },
  {
    id: "q66",
    el: "fire",
    trait: "Freedom",
    dir: -1,
    text: "A steady paycheck matters more to me than being able to walk away.",
    ten: 0,
    std: 0,
  },
  {
    id: "q67",
    el: "fire",
    trait: "Freedom",
    dir: 1,
    text: "The dream is being able to say no to things I don't want to do.",
    ten: 0,
    std: 0,
  },
  {
    id: "q68",
    el: "fire",
    trait: "Freedom",
    dir: -1,
    text: "I'd trade some freedom for more security without thinking twice.",
    ten: 0,
    std: 0,
  },
  {
    id: "q69",
    el: "fire",
    trait: "Freedom",
    dir: 1,
    text: "More than anything, I want money to buy back my own time.",
    ten: 0,
    std: 0,
  },
  {
    id: "q70",
    el: "fire",
    trait: "Safety first",
    dir: 1,
    text: "What I really want is to never have to worry about money again.",
    ten: 0,
    std: 19,
  },
  {
    id: "q71",
    el: "fire",
    trait: "Safety first",
    dir: -1,
    text: "I care more about the upside than about protecting what I have.",
    ten: 0,
    std: 0,
  },
  {
    id: "q72",
    el: "fire",
    trait: "Safety first",
    dir: 1,
    text: "A wall against disaster is worth more to me than a shot at more.",
    ten: 0,
    std: 0,
  },
  {
    id: "q73",
    el: "fire",
    trait: "Safety first",
    dir: -1,
    text: "I don't spend much energy protecting against worst cases.",
    ten: 0,
    std: 0,
  },
  {
    id: "q74",
    el: "fire",
    trait: "Ambition",
    dir: 1,
    text: "I push to earn more even when I already have enough to be comfortable.",
    ten: 0,
    std: 24,
  },
  {
    id: "q75",
    el: "fire",
    trait: "Ambition",
    dir: -1,
    text: "I'm content with what I make and not chasing more.",
    ten: 0,
    std: 0,
  },
  { id: "q76", el: "fire", trait: "Ambition", dir: 1, text: "I set money goals that stretch me.", ten: 0, std: 0 },
  {
    id: "q77",
    el: "fire",
    trait: "Grind",
    dir: 1,
    text: "I'd sacrifice a lot now to get to freedom faster.",
    ten: 0,
    std: 14,
  },
  {
    id: "q78",
    el: "fire",
    trait: "Grind",
    dir: -1,
    text: "I won't trade my best years for an earlier finish line.",
    ten: 0,
    std: 0,
  },
  {
    id: "q79",
    el: "fire",
    trait: "Grind",
    dir: 1,
    text: "I'd live lean for a while if it got me there sooner.",
    ten: 0,
    std: 0,
  },
  {
    id: "q80",
    el: "fire",
    trait: "Status",
    dir: 1,
    text: "I notice when people my age seem to be doing better than me.",
    ten: 0,
    std: 0,
  },
  {
    id: "q81",
    el: "fire",
    trait: "Status",
    dir: -1,
    text: "What other people have doesn't affect how I feel about my own money.",
    ten: 0,
    std: 0,
  },
  {
    id: "q82",
    el: "fire",
    trait: "Status",
    dir: 1,
    text: "I care more than I'd like to admit about looking successful.",
    ten: 0,
    std: 0,
  },
  {
    id: "q83",
    el: "fire",
    trait: "Status",
    dir: -1,
    text: "I'd be just as happy being rich if no one else ever knew.",
    ten: 6,
    std: 10,
  },
  { id: "q84", el: "spirit", trait: "Enough", dir: 1, text: 'I know what "enough" looks like for me.', ten: 0, std: 0 },
  {
    id: "q85",
    el: "spirit",
    trait: "Enough",
    dir: -1,
    text: "No matter how much I have, it never quite feels like enough.",
    ten: 0,
    std: 0,
  },
  {
    id: "q86",
    el: "spirit",
    trait: "Enough",
    dir: -1,
    text: "Every time I reach a money goal, I set a bigger one before I enjoy the first.",
    ten: 9,
    std: 11,
  },
  {
    id: "q87",
    el: "spirit",
    trait: "Enough",
    dir: 1,
    text: "There's a point where I'd feel done, and I can picture it.",
    ten: 0,
    std: 0,
  },
  { id: "q88", el: "spirit", trait: "Enough", dir: -1, text: "The finish line keeps moving on me.", ten: 0, std: 0 },
  { id: "q89", el: "spirit", trait: "Purpose", dir: 1, text: "I know exactly what my money is for.", ten: 1, std: 1 },
  {
    id: "q90",
    el: "spirit",
    trait: "Purpose",
    dir: -1,
    text: "I'm saving hard but I'm not totally sure what for.",
    ten: 0,
    std: 0,
  },
  {
    id: "q91",
    el: "spirit",
    trait: "Purpose",
    dir: 1,
    text: "My spending lines up with what I say matters to me.",
    ten: 0,
    std: 0,
  },
  {
    id: "q92",
    el: "spirit",
    trait: "Purpose",
    dir: 1,
    text: "If someone asked what I'm building toward, I'd have a real answer.",
    ten: 0,
    std: 0,
  },
  {
    id: "q93",
    el: "spirit",
    trait: "Meaning",
    dir: 1,
    text: "Money is a tool for a life, not a way to keep score.",
    ten: 0,
    std: 3,
  },
  {
    id: "q94",
    el: "spirit",
    trait: "Meaning",
    dir: -1,
    text: "Deep down, the number is how I keep score.",
    ten: 0,
    std: 0,
  },
  {
    id: "q95",
    el: "spirit",
    trait: "Giving",
    dir: 1,
    text: "Giving money away is part of what money is for, not a leftover.",
    ten: 0,
    std: 21,
  },
  {
    id: "q96",
    el: "spirit",
    trait: "Giving",
    dir: 1,
    text: "I give more readily than most people I know.",
    ten: 0,
    std: 0,
  },
  {
    id: "q97",
    el: "spirit",
    trait: "Giving",
    dir: -1,
    text: "I find it hard to give money away, even when I can afford to.",
    ten: 0,
    std: 0,
  },
  {
    id: "q98",
    el: "spirit",
    trait: "Time over money",
    dir: 1,
    text: "I happily pay to get my time back.",
    ten: 0,
    std: 17,
  },
  {
    id: "q99",
    el: "spirit",
    trait: "Time over money",
    dir: -1,
    text: "I'd almost always rather do it myself and save the money.",
    ten: 0,
    std: 0,
  },
  {
    id: "q100",
    el: "spirit",
    trait: "Legacy",
    dir: -1,
    text: "I'd rather spend it all on a life well-lived than leave a big pile behind.",
    ten: 0,
    std: 25,
  },
];
const MC_SCALE = [
  [1, "Strongly disagree"],
  [2, "Disagree"],
  [3, "Neutral"],
  [4, "Agree"],
  [5, "Strongly agree"],
];
const MC_DEPTHS = [
  ["ten", "The quick 10", 10],
  ["std", "The 25", 25],
  ["full", "The full 100", 100],
];
// What others see: the traits that show up in outward behavior (the Rising).
const MC_OUT = ["Holding on", "Frugality", "Status", "Ambition", "Grind", "Giving"];
// The statements for a depth, in the order they are shown. The 10 and the 25 keep Eli's delivery order (a gentle open);
// the full read is shuffled the same way every time so a trait's statements never sit together.
function mcItems(depth = "ten") {
  if (depth === "ten") return MC_BANK.filter(i => i.ten).sort((a, b) => a.ten - b.ten);
  if (depth === "std") return MC_BANK.filter(i => i.std).sort((a, b) => a.std - b.std);
  const first = mcItems("std"),
    rest = MC_BANK.filter(i => !i.std)
      .map((i, k) => [i, (k * 37 + 11) % 75])
      .sort((a, b) => a[1] - b[1])
      .map(x => x[0]);
  return [...first, ...rest];
}
const mcOk = v => v >= 1 && v <= 5;
// answers: { itemId: 1..5 }. Works on whatever is answered, so a 10 can grow into a 25 and a 100 with no re-asking.
function mcOf(answers = {}, depth = "ten") {
  const items = mcItems(depth),
    got = MC_BANK.filter(i => mcOk(answers[i.id]));
  const traitMap = new Map();
  for (const i of got) {
    const k = `${i.el}|${i.trait}`,
      v = i.dir > 0 ? answers[i.id] : 6 - answers[i.id];
    traitMap.set(k, [...(traitMap.get(k) || []), v]);
  }
  const traits = [...traitMap].map(([k, vs]) => {
    const [el, name] = k.split("|");
    return { el, name, n: vs.length, score: Math.round(((vs.reduce((s, v) => s + v, 0) / vs.length - 1) / 4) * 100) };
  });
  const scores = MC_EL.map(e => {
    const ts = traits.filter(t => t.el === e.id);
    return {
      ...e,
      traits: ts,
      answered: ts.length,
      score: ts.length ? Math.round(ts.reduce((s, t) => s + t.score, 0) / ts.length) : null,
    };
  });
  const done = items.filter(i => mcOk(answers[i.id])).length,
    next = items.find(i => !mcOk(answers[i.id]))?.id ?? null,
    ready = scores.every(s => s.answered > 0);
  if (!ready) return { ready: false, depth, done, of: items.length, next, scores };
  const ranked = [...scores].sort((a, b) => b.score - a.score),
    top = ranked[0],
    low = ranked.at(-1),
    even = top.score - low.score < 15;
  const best = list => [...list].sort((a, b) => b.score - a.score || b.n - a.n)[0] ?? null;
  const water = traits.filter(t => t.el === "water"),
    outward = traits.filter(t => MC_OUT.includes(t.name));
  return {
    ready: true,
    depth,
    done,
    of: items.length,
    next,
    complete: done === items.length,
    scores,
    traits,
    top,
    low,
    even,
    sun: best(traits),
    moon: water.length >= 2 ? best(water) : null,
    rising: outward.length >= 2 ? best(outward) : null,
    mirror: top.mirror,
    practice: even
      ? null
      : { element: low.name, why: low.low, stage: low.tool[0], flash: low.tool[1], label: low.tool[2] },
    words: even
      ? "Your five are close to even: no one muscle is carrying the rest."
      : `${top.name} (${top.word.toLowerCase()}) is the muscle doing the most work right now. ${low.name} (${low.word.toLowerCase()}) has had the least practice.`,
  };
}
// Two people (mcGroup below handles any number): where each muscle sits for both. A gap is cover (one of you has it); both high is a shared habit to watch;
// both low is the one to build together.
function mcPair(a, b) {
  const A = mcOf(a),
    B = mcOf(b);
  if (!A.ready || !B.ready) return null;
  const rows = MC_EL.map(e => {
    const x = A.scores.find(s => s.id === e.id).score,
      y = B.scores.find(s => s.id === e.id).score,
      gap = Math.abs(x - y);
    return {
      id: e.id,
      name: e.name,
      word: e.word,
      mine: x,
      theirs: y,
      gap,
      kind: Math.max(x, y) < 40 ? "open" : Math.min(x, y) >= 65 ? "doubled" : gap >= 25 ? "cover" : "alike",
    };
  });
  const widest = [...rows].sort((p, q) => q.gap - p.gap)[0],
    closest = [...rows].sort((p, q) => p.gap - q.gap)[0];
  return {
    rows,
    widest,
    closest,
    covered: rows.filter(r => r.kind === "cover").map(r => r.name),
    doubled: rows.filter(r => r.kind === "doubled").map(r => r.name),
    open: rows.filter(r => r.kind === "open").map(r => r.name),
  };
}
// How well one person read the other: their guess of the other's answers against what the other actually said.
function mcGuess(guess, actual) {
  const G = mcOf(guess),
    R = mcOf(actual);
  if (!G.ready || !R.ready) return null;
  const rows = MC_EL.map(e => {
    const g = G.scores.find(s => s.id === e.id).score,
      r = R.scores.find(s => s.id === e.id).score;
    return { id: e.id, name: e.name, guessed: g, actual: r, off: g - r };
  });
  const miss = [...rows].sort((p, q) => Math.abs(q.off) - Math.abs(p.off))[0];
  return {
    rows,
    miss,
    close: rows.filter(r => Math.abs(r.off) < 15).map(r => r.name),
    average: Math.round(rows.reduce((s, r) => s + Math.abs(r.off), 0) / rows.length),
  };
}
// A group of any size (two, three, a household): for each muscle, who leans on it. `people` is a list of answer sets,
// the first one "you". covered: someone has it; shared: everyone leans hard; open: nobody leans; spread: the widest gap.
function mcGroup(people = []) {
  const Q = people.map(a => mcOf(a));
  if (Q.length < 2 || Q.some(q => !q.ready)) return null;
  const rows = MC_EL.map(e => {
    const scores = Q.map(q => q.scores.find(s => s.id === e.id).score),
      hi = Math.max(...scores),
      lo = Math.min(...scores);
    return {
      id: e.id,
      name: e.name,
      word: e.word,
      scores,
      gap: hi - lo,
      kind: hi < 40 ? "open" : lo >= 65 ? "doubled" : hi - lo >= 25 ? "cover" : "alike",
      strongest: scores.indexOf(hi),
    };
  });
  return {
    size: Q.length,
    rows,
    widest: [...rows].sort((p, q) => q.gap - p.gap)[0],
    closest: [...rows].sort((p, q) => p.gap - q.gap)[0],
    covered: rows.filter(r => r.kind === "cover").map(r => r.name),
    doubled: rows.filter(r => r.kind === "doubled").map(r => r.name),
    open: rows.filter(r => r.kind === "open").map(r => r.name),
  };
}

/* ---------- the chart in the game ---------- */
const MC_TOOL = {
  water: ["tier", "Rank what gives you joy"],
  earth: ["cal", "See your tightest day"],
  air: ["fog", "Open your map"],
  fire: ["moves", "Try a move"],
  spirit: ["draft", "Pick what it's all for"],
};
const MC_TENS = [
  [
    "Anxiety",
    "Avoidance",
    "You worry about money and you also look away from it. Each one feeds the other. A one-minute daily check is the smallest way out of the loop.",
  ],
  [
    "Frugality",
    "Living for now",
    "Part of you holds every dollar and part of you wants to live today. A fun amount you spend on purpose lets both win.",
  ],
  [
    "Ambition",
    "Enough",
    "You push for more and you also know what enough is. Name the number where pushing stops being worth it.",
  ],
  [
    "Holding on",
    "Giving",
    "You hold on tight and you love to give. A giving amount decided ahead of time takes the fight out of each ask.",
  ],
  [
    "Risk",
    "Safety first",
    "You're drawn to bold bets and to safety. Split it on purpose: a safe floor, and a small slice you're allowed to swing with.",
  ],
  [
    "Shame",
    "Status",
    "Money carries some shame for you and you also care how it looks. That pairing gets expensive. Nobody here is grading you.",
  ],
];
const MC_SMR = {
  sun: ["Sun", "Your strongest pull"],
  moon: ["Moon", "How money feels inside"],
  rising: ["Rising", "What other people see"],
};
function MCX(c) {
  c.x = c.x || {};
  return (c.x.mc = c.x.mc || { ans: {}, guess: {}, their: {} });
}
function mcTens(r) {
  const t = n => (r.traits.find(x => x.name === n) || { score: 0 }).score;
  return MC_TENS.filter(p => t(p[0]) >= 60 && t(p[1]) >= 60);
}
function mcDepth(ans) {
  const n = d => mcItems(d).filter(i => mcOk(ans[i.id])).length;
  return n("full") >= 100 ? "full" : n("std") >= 25 ? "std" : n("ten") >= 10 ? "ten" : null;
}
function mcRadar(scores, other) {
  const cx = 110,
    cy = 104,
    R0 = 78,
    pt = (i, v) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5,
        r = (R0 * v) / 100;
      return [(cx + r * Math.cos(a)).toFixed(1), (cy + r * Math.sin(a)).toFixed(1)];
    },
    ring = v => scores.map((s, i) => pt(i, v).join(",")).join(" ");
  return `<svg viewBox="0 0 220 208" class="radar" role="img" aria-label="Your five elements">${[25, 50, 75, 100].map(v => `<polygon points="${ring(v)}" fill="none" stroke="var(--line)" stroke-width="1"/>`).join("")}${scores
    .map((s, i) => {
      const p = pt(i, 100),
        l = pt(i, 124);
      return `<line x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}" stroke="var(--line)"/><text x="${l[0]}" y="${l[1]}" text-anchor="middle" dominant-baseline="middle" fill="var(--text)" font-size="11" font-weight="700">${s.name}</text>`;
    })
    .join(
      ""
    )}${other ? `<polygon points="${other.map((s, i) => pt(i, s.score).join(",")).join(" ")}" fill="none" stroke="var(--a3)" stroke-width="2" stroke-dasharray="4 3"/>` : ""}<polygon points="${scores.map((s, i) => pt(i, s.score).join(",")).join(" ")}" fill="rgba(63,109,255,.35)" stroke="var(--sap)" stroke-width="2"/></svg>`;
}
function chartCard(c) {
  const m = MCX(c),
    r = mcOf(m.ans),
    dp = mcDepth(m.ans);
  return `<div class="card stack" style="gap:6px"><div class="row between"><h3>Your Money Chart</h3>${ib("term:mchart")}</div>${r.ready && dp ? `<div class="small">${esc(r.words)}</div><div class="tiny muted">Sun: ${esc(r.sun.name)}${r.moon ? " · Moon: " + esc(r.moon.name) : ""}${r.rising ? " · Rising: " + esc(r.rising.name) : ""}</div><button class="ghost wide slim" data-a="chart">Open your chart</button>` : `<div class="small muted">Five elements, 25 traits. Start with 10 statements, about 2 minutes. Go deeper to 25 or the full 100 any time, and nothing is ever asked twice.</div><button class="primary wide" data-a="mcstart" data-v="ten" data-k="ans">${Object.keys(m.ans).length ? "Keep going" : "Start the quick 10"}</button>`}</div>`;
}
/* chartSheet() makes the full sheet of the Money Chart. chartSheetBase() is the part from this file. */
function chartSheet() {
  let h = chartSheetBase();
  if (typeof chartSheetTogether === "function")
    h = chartSheetTogether(h); /* together.js: the button for more than two people */
  return h;
}
function chartSheetBase() {
  const c = C(),
    m = MCX(c),
    r = mcOf(m.ans),
    dp = mcDepth(m.ans),
    tens = r.ready ? mcTens(r) : [],
    tv = n => (r.traits.find(x => x.name === n) || { score: null }).score,
    pair = Object.keys(m.their).length >= 10 ? mcPair(m.ans, m.their) : null,
    gs = pair && Object.keys(m.guess).length >= 10 ? mcGuess(m.guess, m.their) : null,
    th = pair ? mcOf(m.their) : null;
  if (!r.ready || !dp)
    return (
      head("Money Chart", "Not enough answers yet") +
      `<button class="primary wide" data-a="mcstart" data-v="ten" data-k="ans">Do the quick 10</button>`
    );
  const next =
      dp === "ten"
        ? ["std", "Go deeper: 15 more statements", "Sharper traits, and your Moon and Rising get steadier."]
        : dp === "std"
          ? ["full", "Go all the way: 75 more statements", "All 25 traits, each measured several ways."]
          : null,
    tool = r.practice ? MC_TOOL[MC_EL.find(e => e.name === r.practice.element).id] : null;
  return (
    head("Money Chart · " + { ten: "the quick 10", std: "the 25", full: "the full 100" }[dp], "Your chart") +
    mcRadar(r.scores, th ? th.scores : null) +
    (th ? `<div class="tiny muted" style="text-align:center">Filled: you. Dashed: your person.</div>` : "") +
    `<div class="small">${esc(r.words)}</div><div class="tiny muted">These are muscles, built by what life asked of you. They aren't fixed types, and they move.</div>
 <div class="hl3">${["sun", "moon", "rising"].map(k => `<div class="tile" style="text-align:center"><div class="tiny muted">${MC_SMR[k][0]}</div><b>${r[k] ? esc(r[k].name) : "Go deeper"}</b><div class="tiny muted">${MC_SMR[k][1]}</div></div>`).join("")}</div>
 ${r.scores
   .map(
     s =>
       `<details class="math"><summary><span style="flex:1"><b>${s.name}</b> <span class="tiny muted">${s.word}</span>${bar(s.score)}</span><b style="margin-left:8px">${s.score}</b></summary><div class="inner stack" style="gap:4px"><div class="small">${esc(s.score >= 50 ? s.high : s.low)}</div>${s.traits
         .slice()
         .sort((a, b) => b.score - a.score)
         .map(
           t =>
             `<div class="lane"><span style="width:110px">${esc(t.name)}</span>${bar(t.score)}<b style="width:30px">${t.score}</b></div>`
         )
         .join(
           ""
         )}${dp !== "full" ? `<div class="tiny muted">${s.traits.length} of this element's traits measured so far.</div>` : ""}</div></details>`
   )
   .join("")}
 ${tens.length ? `<div class="small"><b>Where you pull against yourself</b></div>${tens.map(p => `<div class="tile stack" style="gap:2px"><div class="small"><b>${p[0]} and ${p[1]}</b></div><div class="tiny">${p[2]}</div></div>`).join("")}` : ""}
 ${r.practice ? `<div class="tile stack" style="gap:6px"><div class="small"><b>The muscle to practice: ${r.practice.element}</b></div><div class="tiny">${esc(r.practice.why)} Often the muscle that carried you this far is the one in the way next.</div><button class="ghost wide slim" data-a="${tool[0]}">${tool[1]}</button></div>` : ""}
 ${!c.gentle && ((tv("Avoidance") || 0) >= 65 || (tv("Shame") || 0) >= 65) ? `<div class="tile stack" style="gap:6px"><div class="tiny">Your chart says money can be hard to look at. Gentle mode softens the game: smaller steps, wins first, debt last.</div><button class="ghost wide slim" data-a="mcgentle">Turn on gentle mode</button></div>` : ""}
 ${next ? `<button class="primary wide" data-a="mcstart" data-v="${next[0]}" data-k="ans">${next[1]}</button><div class="tiny muted">${next[2]} Nothing is asked twice.</div>` : ""}
 <div class="tile stack" style="gap:6px"><div class="small"><b>With your person</b></div>${pair ? `<div class="tiny">${pair.covered.length ? "One of you covers for the other on: " + pair.covered.join(", ") + ". " : ""}${pair.doubled.length ? "You both lean hard on: " + pair.doubled.join(", ") + ". Watch that one together. " : ""}${pair.open.length ? "Neither of you leans on: " + pair.open.join(", ") + ". That's the one to build together. " : ""}Biggest gap: ${pair.widest.name}. Closest: ${pair.closest.name}.</div>${gs ? `<div class="tiny">Your guess of them was off by ${gs.average} points on average. ${gs.close.length ? "You read them well on: " + gs.close.join(", ") + ". " : ""}Biggest surprise: ${gs.miss.name} (you guessed ${gs.miss.guessed}, they said ${gs.miss.actual}).</div>` : ""}` : `<div class="tiny muted">First you guess how they'd answer the quick 10. Then they answer for real. You see both charts on top of each other, and how well you read them.</div>`}<button class="ghost wide slim" data-a="mcstart" data-v="ten" data-k="guess">${pair ? "Play it again" : "Guess your person"}</button></div>
 <button class="ghost wide" data-a="close">Close</button>`
  );
}
function mcqSheet() {
  const c = C(),
    m = MCX(c),
    w = W,
    items = mcItems(w.depth),
    left = items.filter(i => !mcOk(m[w.who][i.id])),
    it = left[0],
    n = items.length - left.length;
  if (w.pass)
    return (
      head("Money Chart", "Pass the phone") +
      `<div class="tile small">Hand the phone to your person. They answer the same 10 for themselves. Your guesses stay hidden until the end.</div><button class="primary wide" data-a="mcpass">I'm them. Start</button>`
    );
  if (!it) return head("Money Chart", "Done") + `<button class="primary wide" data-a="chart">See the chart</button>`;
  return (
    head(
      "Money Chart · " +
        (n + 1) +
        " of " +
        items.length +
        (w.who === "guess" ? " · guessing for them" : w.who === "their" ? " · your person" : ""),
      ""
    ) +
    `<div class="tile"><div class="tiny muted">${w.who === "guess" ? "How would your person answer?" : "How true is this for you?"}</div><h2 style="margin:6px 0 0">${esc(it.text)}</h2></div>${bar((n / items.length) * 100)}<div class="stack" style="gap:6px">${MC_SCALE.slice()
      .reverse()
      .map(
        s =>
          `<button class="rowbtn" data-a="mcans" data-k="${it.id}" data-v="${s[0]}"><span>${s[1]}</span><span>›</span></button>`
      )
      .join("")}</div>${w.hist.length ? `<button class="ghost wide slim" data-a="mcback">Back one</button>` : ""}`
  );
}
Object.assign(GLOSS, {
  mchart: [
    "Money Chart",
    "Your money personality as five elements: Water (feeling), Earth (security), Air (analysis), Fire (drive) and Spirit (purpose). Each is a muscle built by what life asked of you. Your Sun is your strongest trait, your Moon is how money feels inside, your Rising is what others see.",
  ],
});
Object.assign(ACT, {
  chart: () => {
    W = { kind: "chart" };
    sheet(chartSheet);
  },
  mcstart: t => {
    const c = C(),
      m = MCX(c),
      who = t.dataset.k || "ans";
    if (who === "guess") {
      m.guess = {};
      m.their = {};
    }
    W = { kind: "mcq", depth: t.dataset.v || "ten", who, hist: [], pass: false };
    sheet(mcqSheet);
  },
  mcans: t => {
    const c = C(),
      m = MCX(c),
      w = W;
    m[w.who][t.dataset.k] = +t.dataset.v;
    w.hist.push(t.dataset.k);
    save();
    const left = mcItems(w.depth).filter(i => !mcOk(m[w.who][i.id]));
    if (!left.length) {
      if (w.who === "guess") {
        w.pass = true;
        drawSheet();
      } else {
        render();
        ACT.chart();
      }
    } else drawSheet();
  },
  mcback: () => {
    const m = MCX(C()),
      w = W,
      k = w.hist.pop();
    if (k) delete m[w.who][k];
    save();
    drawSheet();
  },
  mcpass: () => {
    W.who = "their";
    W.pass = false;
    W.hist = [];
    drawSheet();
  },
  mcgentle: () => {
    C().gentle = true;
    save();
    render();
    drawSheet();
  },
});
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
