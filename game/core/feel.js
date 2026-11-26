/* ============================================================================
   SLAM the Game: core/feel.js
   PURPOSE     Game feel (run Finish everything partly built, Part 20): start at the finish line (work
               back from what you need to what today has to look like), the race against your past
               self, the bottleneck finder (eight kinds, ranked from your numbers and your taps, and
               "Is this really it?"), and the made-up composite stories. features/feel.js uses it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: GF_RULES, GF_NEED_MONTH, GF_WHEN_YEARS, GF_KINDS, GF_CHECKS, GF_REAL, GF_TAPS,
               GF_STORY_LABEL, GF_STORIES, GF_PRESETS. Functions: gfBackwards, gfPastSelf, gfBottleneck,
               gfStories.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/feel.js of the main SLAM app, with
               the presets of data/reference-2026.json. To change a rule, change the source, then run:
               node tools/game_feel_build.mjs. The tests fail when this copy is stale.
               Prettier does not format this file (.prettierignore).
   ========================================================================= */
// Game feel (run "Finish everything partly built", Part 20, Nov 26 2026; M8R). ONE engine for both apps: pure, and with
// no import on purpose, so tools/game_feel_build.mjs copies it word for word into game/core/feel.js. Every name starts
// with gf or GF_ because the game has one global scope. Empty is not zero: a blank answer gives ready false (or step 1)
// and never a number.
//
// FOUR TOOLS, each a plain function on plain numbers that the caller reads from its own plan:
//   the finish line    gfBackwards: start at the end (what you need to live on once work is optional), then by when,
//                      then what you have, then what comes in and goes out, and work back to what today has to look
//                      like. The web page end.html (js/solo.js backwardsOf) and the game's Start at the finish line
//                      both call it, with the plan's own withdrawal rate and return after inflation.
//   your past self     gfPastSelf: a race against yourself, from your own saved snapshots: how fast your net worth
//                      moved in the last stretch of days next to the stretch before it. Never a real person.
//   the bottleneck     gfBottleneck: the eight kinds of thing in the way (money, time, energy, skill, knowledge,
//                      people, fear, rules), ranked from your numbers and your own taps. Your "Is this really it?"
//                      answer always wins over the ranking.
//   made-up stories    GF_STORIES and gfStories: short composite stories, one for each kind of bottleneck, put
//                      together from common paths and labeled as made up. Never a real person.

// ---------- the rules (SLAM's own, written down here; QUESTIONS.md "RUN Finish everything partly built, Part 20") ----------
// month: days in a month for a pace a month (the same 30.4 as the game's rival race, rivalState).
// window: the days of one stretch of the race against your past self. near: a pace within this much a month is a tie.
// bn: the points of the bottleneck ranking. From your numbers: nothing left over (left0), less left over than the
// finish line needs (short), a finish-line date later than the year you picked (late), a credit score band that the
// rules of a loan read (rules). From your taps: Yes, A little, No.
const GF_RULES = {
  month: 30.4,
  window: 90,
  near: 1,
  bn: { left0: 3, short: 2, late: 2, rules: 2, yes: 2, some: 1, no: -1 },
};
// The quick picks of the finish line: what you need a month in today's dollars, and in how many years.
const GF_NEED_MONTH = [2000, 3000, 4000, 5000, 6500, 8000, 10000];
const GF_WHEN_YEARS = [5, 10, 15, 20, 25, 30];
const gfHas = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

// ---------- 1. Start at the finish line ----------
// need: what you need (a month, a year or a total, by `per`); years: by when; have: invested today; takeHome and
// spending a month. wr: the withdrawal rate; r: the return a year after inflation; now: a Date (the year it starts).
// Each answer opens the next step (1 to 5). A month grows at the plan's own pace: (1 + r) ** (1 / 12) - 1.
function gfBackwards({ need = null, per = 'month', years = null, have = null, takeHome = null, spending = null, wr, r, now = new Date() } = {}) {
  const i = (1 + r) ** (1 / 12) - 1;
  const out = { step: 1, withdrawalRate: wr, realReturn: r };
  if (!(need > 0)) return out;
  const total = per === 'total' ? need : (per === 'year' ? need : need * 12) / wr;
  Object.assign(out, { step: 2, total, aYear: total * wr, aMonth: total * wr / 12 });
  if (!(years > 0)) return out;
  Object.assign(out, { step: 3, years, byYear: now.getFullYear() + years });
  if (have == null) return out;
  const n = years * 12, grown = have * (1 + i) ** n, short = Math.max(0, total - grown);
  const needed = short <= 0 ? 0 : short * i / ((1 + i) ** n - 1);
  Object.assign(out, { step: 4, have, grown, alreadyThere: have >= total, growsThere: short <= 0, needed, share: Math.min(1, have / total) });
  if (takeHome == null || spending == null) return out;
  const left = takeHome - spending, gap = needed - left;
  // months until today's left-over money gets there: solve have(1+i)^m + left((1+i)^m - 1)/i = total
  let months = null;
  if (out.alreadyThere) months = 0;
  else if (left > 0 || have * i > 0) {
    const k = left / i, x = (total + k) / (have + k);
    months = x > 0 && have + k > 0 ? Math.log(x) / Math.log(1 + i) : null;
    if (!(months >= 0) || months > 1200) months = null;
  }
  return Object.assign(out, { step: 5, takeHome, spending, left, gap, onTrack: gap <= 0, months,
    onPaceYear: months == null ? null : now.getFullYear() + Math.floor((now.getMonth() + months) / 12),
    savingsRateNeeded: takeHome > 0 ? needed / takeHome : null,
    // the two honest ways to close a gap: spend less (which also lowers the need) or earn more
    spendToClose: gap > 0 ? Math.max(0, spending - gap) : null, earnToClose: gap > 0 ? takeHome + gap : null });
}

// ---------- 2. Your past self ----------
const gfDay = iso => (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso) ? Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5 : null);
// hist: your saved snapshots [{ d: 'YYYY-MM-DD', nw }]; today: 'YYYY-MM-DD'; nw: net worth now.
// The stretch now: from the last snapshot at least `win` days old, to today. The stretch before: from the last snapshot
// at least `win` days older than that, to the start of the stretch now. Each pace is a month (GF_RULES.month days).
// Not ready until there is a stretch before: daysToGo says how many more days of snapshots it needs.
function gfPastSelf(hist = [], today, nw, win = GF_RULES.window) {
  const t = gfDay(today), pts = (hist || []).filter(p => p && gfDay(p.d) != null && gfHas(p.nw) && gfDay(p.d) <= t).sort((p, q) => gfDay(p.d) - gfDay(q.d));
  if (t == null || !gfHas(nw)) return { ready: false, daysToGo: null, win };
  const before = (at, gap) => { let b = null; for (const p of pts) if (gfDay(p.d) <= at - gap) b = p; return b; };
  const a = before(t, win), b = a ? before(gfDay(a.d), win) : null;
  if (!a || !b) {
    const first = pts.length ? gfDay(pts[0].d) : t;
    return { ready: false, daysToGo: Math.max(1, Math.ceil(2 * win - (t - first))), win };
  }
  const dNow = t - gfDay(a.d), dThen = gfDay(a.d) - gfDay(b.d);
  const nowGain = nw - a.nw, thenGain = a.nw - b.nw;
  const nowPace = nowGain / dNow * GF_RULES.month, thenPace = thenGain / dThen * GF_RULES.month, gap = nowPace - thenPace;
  return { ready: true, win,
    now: { from: a.d, to: today, days: dNow, gain: nowGain, pace: nowPace },
    then: { from: b.d, to: a.d, days: dThen, gain: thenGain, pace: thenPace },
    gap, lead: Math.abs(gap) < GF_RULES.near ? 'tie' : gap > 0 ? 'now' : 'then' };
}

// ---------- 3. The bottleneck ----------
// The eight kinds, in the order a tie is broken. The game's words for each (name, one line, first move) are BLOCKS and
// BLOCK_STEP of game/core/engine.js, the same words as the roadblock of a goal.
const GF_KINDS = ['money', 'time', 'energy', 'skill', 'knowledge', 'people', 'fear', 'rules'];
// The one tap for each kind: Yes means this is in the way.
const GF_CHECKS = {
  money: 'Is the money short: not enough left over each month for it?',
  time: 'Does it fit, but take longer than you want to wait?',
  energy: 'Are you too stretched to start it right now?',
  skill: 'Would you need to do something you cannot do yet?',
  knowledge: 'Is how it works still unclear to you?',
  people: 'Does someone else have to say yes first?',
  fear: 'Does something about it scare you?',
  rules: 'Is an age, a score or a rule in the way?',
};
// "Is this really it?": the test of each kind. Yes keeps the call; No opens the other seven.
const GF_REAL = {
  money: 'If the money showed up tomorrow, would you start today?',
  time: 'If it were ready next month, would you still want it as much?',
  energy: 'On a rested week, would you start it?',
  skill: 'If someone did that one part for you, would the rest move?',
  knowledge: 'If you knew exactly how it works, would you start?',
  people: 'If they said yes today, would you start?',
  fear: 'If it could not go wrong, would you start today?',
  rules: 'If that rule were gone, would you start today?',
};
const GF_TAPS = [['yes', 'Yes'], ['some', 'A little'], ['no', 'No']];
// facts (from your numbers; null when unknown): left (left over a month), need (what the finish line needs a month),
// late (true when the finish-line date is later than the year you picked), rules (true when a score band is in the way).
// taps: { kind: 'yes' | 'some' | 'no' }. pick: the kind you chose with "Is this really it?" (it wins).
// Each row: { id, score, why: [{ k, ... }] }; why codes: left0, short (left, need), late, rules, tap (v).
function gfBottleneck({ facts = {}, taps = {}, pick = null } = {}) {
  const P = GF_RULES.bn, f = facts || {}, T = taps || {};
  const rows = GF_KINDS.map(id => ({ id, score: 0, why: [] }));
  const at = id => rows.find(x => x.id === id);
  if (gfHas(f.left) && f.left <= 0) { at('money').score += P.left0; at('money').why.push({ k: 'left0', left: f.left }); }
  else if (gfHas(f.left) && gfHas(f.need) && f.left < f.need) { at('money').score += P.short; at('money').why.push({ k: 'short', left: f.left, need: f.need }); }
  if (f.late === true) { at('time').score += P.late; at('time').why.push({ k: 'late' }); }
  if (f.rules === true) { at('rules').score += P.rules; at('rules').why.push({ k: 'rules' }); }
  let asked = 0;
  for (const r of rows) {
    const v = T[r.id];
    if (!['yes', 'some', 'no'].includes(v)) continue;
    asked++; r.score = Math.max(0, r.score + P[v]); r.why.push({ k: 'tap', v });
  }
  const ranked = rows.slice().sort((p, q) => q.score - p.score || GF_KINDS.indexOf(p.id) - GF_KINDS.indexOf(q.id));
  const picked = GF_KINDS.includes(pick) ? pick : null;
  const top = picked || (ranked[0].score > 0 ? ranked[0].id : null);
  return { ready: !!top, top, picked: !!picked, ranked, asked, of: GF_KINDS.length,
    second: ranked.find(x => x.id !== top && x.score > 0)?.id ?? null };
}

// ---------- 4. Made-up stories ----------
// Composite stories: each one is put together from many common paths. None is a real person, and the screen says so.
const GF_STORY_LABEL = 'A made-up story, put together from common paths. Not a real person.';
const GF_STORIES = [
  { id: 'dana', kind: 'money', name: 'Dana', title: 'Found the gap in the spending, not the pay',
    story: 'Dana thought the pay was the problem. Three weeks of writing down every buy showed two subscriptions and takeout on tired nights. Cutting those two lines left money over each month for the first time.',
    move: 'Look at the three biggest lines of your spending first.' },
  { id: 'theo', kind: 'time', name: 'Theo', title: 'Made the goal smaller so it arrived sooner',
    story: 'Theo wanted a big trip in five years and kept putting it off. Theo split it into a short trip next year and the big one later. The short trip came first, and saving for the big one felt real after that.',
    move: 'Shrink the first version of the goal, or move it to an earlier era.' },
  { id: 'ines', kind: 'energy', name: 'Ines', title: 'One small step a week, nothing else',
    story: 'Ines worked long shifts and had nothing left for money tasks. Ines picked one ten-minute task for each Sunday and skipped the rest. After two months the cushion had started, and the tasks felt lighter.',
    move: 'Pick the smallest step on your path this week and let the rest wait.' },
  { id: 'marcus', kind: 'skill', name: 'Marcus', title: 'Learned one skill, and the rest followed',
    story: 'Marcus wanted to invest but did not know how to open an account. One evening on the first step of the skill did it. The next steps took minutes each.',
    move: 'Find the skill under Skills and do only its first step.' },
  { id: 'priya', kind: 'knowledge', name: 'Priya', title: 'Asked one person who had done it',
    story: 'Priya did not understand the retirement plan at work and left it alone for two years. One coffee with a coworker who used it answered the three questions Priya had. Priya signed up that week.',
    move: 'Write down the one question you need answered, and ask someone who has done it.' },
  { id: 'sam', kind: 'people', name: 'Sam', title: 'Had the conversation first',
    story: 'Sam wanted to move money to a joint goal but needed a partner to agree. Sam wrote down the one question, picked a calm evening and asked it. The answer was yes, with one change.',
    move: 'Have the conversation. Bring one question, not the whole plan.' },
  { id: 'lee', kind: 'fear', name: 'Lee', title: 'Said the fear out loud',
    story: 'Lee was scared to look at the card balances. Lee said it to a friend, and the friend sat with Lee while Lee opened the statements. The number was smaller than the fear, and a payoff date followed.',
    move: 'Say the fear out loud to someone you trust. Then look at one number together.' },
  { id: 'rosa', kind: 'rules', name: 'Rosa', title: 'Found the exact rule and its date',
    story: 'Rosa thought a home was years away because of a credit score. Rosa looked up the exact score the loan needed and the date the old late payment would stop counting. That date went on the calendar.',
    move: 'Find the exact rule and the date or number that unlocks it.' },
];
// The stories for a kind of bottleneck: the one of that kind first, then the others in the list's order. n: how many.
function gfStories(kind = null, n = 2) {
  const own = GF_STORIES.filter(s => s.kind === kind), rest = GF_STORIES.filter(s => s.kind !== kind);
  return own.concat(rest).slice(0, Math.max(0, n));
}
// The plan's presets of data/reference-2026.json that the finish line reads.
const GF_PRESETS = {"withdrawalRate":0.04,"realReturn":0.07};
