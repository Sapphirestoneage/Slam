// SPDX-License-Identifier: AGPL-3.0-only
// The money sins read (run "Money sins system and the Rings theme", Part 1, Nov 25 2026). Pure, and with no import on
// purpose: tools/game_sins_build.mjs copies this file word for word into game/core/sins.js, so the web app and the game
// read the same evidence with the same functions. Every name starts with sn or SN_ because the game has one global scope.
// The scoring is the ONE quiz engine (js/math/quizcore.js): the caller hands it in as `qz` ({ qzResult, QZ_LEVELS }),
// so this file never scores a second way. The words of the read are in the skin (js/quiz/skins/sins.js, def.read).
// A game lens, not a diagnosis. The cost of a pattern in dollars or FI days is NOT here: it lives only in the opt-in
// Mistake audit (js/math/recalc.js rcAudit). Empty is not zero: a source with no data adds nothing, never a 0 guess.
//
// FOUR SOURCES of evidence, each a list of PIECES { source, kind, add: { traitId: points }, d: 'YYYY-MM-DD', why }:
//   quiz     the fifteen taps (snQuizEvidence). A starting guess that fades as the other sources come in (snQuizWeight).
//   ledger   spending patterns (snLedgerEvidence): right after payday, right after a "stressed" tap, how often by
//            category, over the plan by category.
//   checkin  the one-tap "what was this?" (snCheckinEvidence), asked only by snCheckinDue.
//   app      reactions and inaction (snAppEvidence): Recalculating left waiting or kept, fire drills run, the app left
//            closed, no new money data, numbers left at Guess.
// and two that follow from the read itself: `you` (the push-back "Is this really it?", snPush) and `fix` (the result of
// a month of "Test the fix", snFixEnd).
//
// WHAT IS STORED (the caller keeps it, in the skin's own place: web settings.start.lenses.sins, game c.x.qz.sins):
//   { ans, go, at, ... (the quiz, as for every skin), sn: { v: 1, line, show, checks: [{ at, d, tag, amt, cat }],
//     skips: [{ at }], push: [{ at, d, trait, said: 'yes' | 'no' | 'other', to }], fix: { trait, group, start } | null,
//     fixes: [{ trait, group, start, end, before, during, dropped }] } }
// THE DATA a caller reads from its own ledger (snRead's `data`), each part optional:
//   { since, buys: [{ d, amt, cat }], pays: [{ d }], plan: { cat: monthly }, imported, away: { days, back },
//     guesses: { guess, of }, rc: { due, keptAt }, drills: [{ d }] }   with cat one of SN_CATS.

// ---------- the rules (Eli, 2026-11-25, the run prompt; the rest are SLAM's own, written down here) ----------
// halfLife: evidence counts half after 30 days, a quarter after 60. A month is the rhythm money runs on (pay, bills,
// the month check), so one month is the natural unit; with it a habit that stopped has faded to a quarter within a
// season, the same rhythm as the quarterly retake of Part 2, and one hard week never outweighs a steady quarter.
export const SN_RULES = {
  halfLife: 30, labelDays: 30, agree: 2, perWeek: 3, line: 50, lines: [25, 50, 100, 200, 500], fixDays: 30,
  afterPay: 2, afterStress: 2, paydayBuys: 3, foodBuys: 12, funBuys: 8, overShare: 0.1, overMin: 25,
  quietDays: 45, awayDays: 21, guessShare: 0.5, rcDays: 30, push: 3, fixUp: 3, fixDown: 2,
  // Part 2: a retake each quarter (91 days, a quarter of a year); the history keeps the last 12 takes (three years).
  retakeDays: 91, histMax: 12,
};
// The categories a buy can have, the same five as the game's spending (the web app's Budget letters map onto them).
export const SN_CATS = { home: 'Home', food: 'Food', transport: 'Getting around', bills: 'Bills and subscriptions', fun: 'Fun and everything else' };
// Bills that are fixed by a contract carry no pull, so they never trip a check-in or a pattern.
export const SN_FIXED = ['home', 'bills'];
export const SN_SOURCES = { quiz: 'The quiz', ledger: 'Your spending', checkin: 'Your check-ins', app: 'How you use the app', you: 'What you told us', fix: 'Test the fix' };
// The one-tap check-in: seven answers (Eli's list). Each adds points to the traits it points at; "planned" adds none.
export const SN_TAGS = [
  { id: 'planned', label: 'Planned', add: {} }, { id: 'treat', label: 'A treat', add: { gluttony: 2 } },
  { id: 'bored', label: 'Bored', add: { lust: 1, sloth: 1 } }, { id: 'stressed', label: 'Stressed', add: { panic: 1, wrath: 1 } },
  { id: 'keeping', label: 'Keeping up', add: { envy: 2 } }, { id: 'asked', label: 'Someone asked', add: { pleasing: 2 } },
  { id: 'celebrating', label: 'Celebrating', add: { pride: 1, gluttony: 1 } },
];
// Each signal of the ledger and the app, and the traits it points at. A minus is evidence against a trait.
export const SN_SIGNALS = {
  payday: { add: { lust: 2, magic: 1 } }, stress: { add: { gluttony: 1, panic: 1 } },
  food: { add: { gluttony: 2 } }, fun: { add: { lust: 2 } }, overFood: { add: { gluttony: 2 } }, overFun: { add: { lust: 1, envy: 1 } },
  quiet: { add: { later: 2, sloth: 1 } }, away: { add: { fear: 1, denial: 1, sloth: 1 } }, guesses: { add: { later: 1, perfect: 1, sloth: 1 } },
  rcOpen: { add: { denial: 2, proud: 1 } }, rcKept: { add: { denial: -1, proud: -1 } }, drill: { add: { fear: -1, panic: -1 } },
};

// ---------- days ----------
const snT = d => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d) ? Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) : null);
// Whole days from a to b (positive when b is later); null when either is missing.
export function snDays(a, b) {
  const x = snT(a), y = snT(b);
  return x == null || y == null ? null : Math.round((y - x) / 86400000);
}
export function snAddDays(d, n) {
  const t = snT(d);
  return t == null ? null : new Date(t + n * 86400000).toISOString().slice(0, 10);
}
const SN_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const snDayWords = d => (snT(d) == null ? '' : `${SN_MON[+d.slice(5, 7) - 1]} ${+d.slice(8, 10)}`);
const snMonthWords = ym => `${SN_MON[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
export function snAgo(d, now) {
  const n = snDays(d, now);
  if (n == null) return '';
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n < 14 ? `${n} days ago` : n < 60 ? `${Math.round(n / 7)} weeks ago` : `about ${Math.round(n / 30)} months ago`;
}

// ---------- weights and fading ----------
// How much a piece dated d still counts today: 1 today, 0.5 after one half-life, 0.25 after two. A piece with no date
// counts in full (the quiz carries the day it was taken).
export function snFade(d, now, halfLife = SN_RULES.halfLife) {
  const n = snDays(d, now);
  return n == null ? 1 : Math.pow(0.5, Math.max(0, n) / halfLife);
}
const snPos = add => Object.values(add || {}).reduce((s, v) => s + Math.max(0, v), 0);
// The quiz is the starting guess. It counts in full while nothing else is in, and shares out as the other sources
// come in: weight = Q / (Q + E), Q the quiz's own points, E the other sources' faded points. At E = Q it counts half.
export function snQuizWeight(ev, now) {
  const Q = ev.filter(p => p.source === 'quiz').reduce((s, p) => s + snPos(p.add), 0);
  const E = ev.filter(p => p.source !== 'quiz').reduce((s, p) => s + snPos(p.add) * snFade(p.d, now), 0);
  return Q > 0 ? Q / (Q + E) : 0;
}
// Each piece with what it counts today: w (its weight) and f (its faded points by trait).
export function snWeigh(ev, now) {
  const wq = snQuizWeight(ev, now);
  return ev.map(p => {
    const w = p.source === 'quiz' ? wq : snFade(p.d, now), f = {};
    for (const t of Object.keys(p.add || {})) f[t] = p.add[t] * w;
    return { ...p, w, f };
  });
}
// The scores from outside for the engine: one set of faded points for each source, in the order of SN_SOURCES.
export function snOutside(ev, now) {
  const W = snWeigh(ev, now), out = [];
  for (const source of Object.keys(SN_SOURCES)) {
    const mine = W.filter(p => p.source === source);
    if (!mine.length) continue;
    const scores = {};
    for (const p of mine) for (const t of Object.keys(p.f)) scores[t] = (scores[t] || 0) + p.f[t];
    out.push({ source, scores });
  }
  return out;
}

// ---------- source 1: the quiz ----------
// One piece for each answered question: the words of the tap, dated the day the quiz was taken.
export function snQuizEvidence(def, answers = {}, at = null) {
  const out = [];
  for (const q of def.questions || []) {
    const v = answers[q.id], o = q.options && q.options.find(x => String(x.id) === String(v));
    if (o) out.push({ source: 'quiz', kind: 'quiz', add: { ...o.add }, d: at ? String(at).slice(0, 10) : null, why: `In the quiz you tapped "${o.label}"` });
  }
  return out;
}

// ---------- source 2: the ledger ----------
const snFlex = b => b && b.amt > 0 && !SN_FIXED.includes(b.cat);
const snSig = (kind, d, why, source = 'ledger') => ({ source, kind, add: { ...SN_SIGNALS[kind].add }, d, why });
// The patterns of spending a ledger honestly supports. Dates only: the ledger keeps the day of a buy, not the hour.
export function snLedgerEvidence(data = {}, now = null) {
  const R = SN_RULES, buys = (data.buys || []).filter(snFlex), out = [];
  // right after payday: three or more buys from payday to two days after
  for (const p of data.pays || []) {
    const n = buys.filter(b => { const k = snDays(p.d, b.d); return k != null && k >= 0 && k <= R.afterPay; }).length;
    if (n >= R.paydayBuys) out.push(snSig('payday', p.d, `${n} buys within two days of payday (${snDayWords(p.d)})`));
  }
  // right after a "stressed" tap: the buys of the next two days
  for (const c of (data.checks || []).filter(x => x.tag === 'stressed')) {
    const n = buys.filter(b => { const k = snDays(c.d, b.d); return k != null && k > 0 && k <= R.afterStress; }).length;
    if (n >= 1) out.push(snSig('stress', c.d, `${n} ${n === 1 ? 'buy' : 'buys'} in the two days after a "stressed" tap (${snDayWords(c.d)})`));
  }
  // how often, and over the plan, by category and month (the month so far counts too)
  const months = {};
  for (const b of buys) { const ym = String(b.d).slice(0, 7), M = (months[ym] = months[ym] || {}), x = (M[b.cat] = M[b.cat] || { n: 0, sum: 0, last: b.d }); x.n++; x.sum += b.amt; if (b.d > x.last) x.last = b.d; }
  for (const ym of Object.keys(months).sort()) {
    const M = months[ym];
    if (M.food && M.food.n >= R.foodBuys) out.push(snSig('food', M.food.last, `${M.food.n} food buys in ${snMonthWords(ym)}`));
    if (M.fun && M.fun.n >= R.funBuys) out.push(snSig('fun', M.fun.last, `${M.fun.n} fun buys in ${snMonthWords(ym)}`));
    for (const [cat, kind] of [['food', 'overFood'], ['fun', 'overFun']]) {
      const plan = data.plan ? data.plan[cat] : null, x = M[cat];
      if (x && plan != null && plan >= 0 && x.sum > plan * (1 + R.overShare) && x.sum - plan >= R.overMin)
        out.push(snSig(kind, x.last, `${SN_CATS[cat]} went past its plan in ${snMonthWords(ym)}`));
    }
  }
  return out;
}

// ---------- source 3: the one-tap check-ins ----------
export const snTag = id => SN_TAGS.find(t => t.id === id) || null;
export function snCheckinEvidence(checks = []) {
  return checks.filter(c => snTag(c.tag)).map(c => ({ source: 'checkin', kind: 'checkin', add: { ...snTag(c.tag).add }, d: c.d,
    why: `You tapped "${snTag(c.tag).label}" on a ${c.cat && SN_CATS[c.cat] ? SN_CATS[c.cat].toLowerCase() : 'recent'} buy (${snDayWords(c.d)})` }));
}
// The check-ins and skips of the last seven days (a skip counts: a skipped question still asked).
export function snWeekCount(sn = {}, now) {
  return [...(sn.checks || []), ...(sn.skips || [])].filter(x => { const k = snDays(String(x.at || x.d).slice(0, 10), now); return k != null && k >= 0 && k < 7; }).length;
}
// Ask "what was this?" about one buy (data.buys: the OTHER buys, without this one)? Only when it passes the person's line or trips a pattern, and at most three a
// week. Never about a fixed bill. Returns { ask, why } (why: the plain reason it asks, or why it does not).
export function snCheckinDue(sn = {}, buy, data = {}, now) {
  const R = SN_RULES, line = sn.line ?? R.line;
  if (!snFlex(buy)) return { ask: false, why: 'Bills that are set by a contract are never asked about.' };
  if (snWeekCount(sn, now) >= R.perWeek) return { ask: false, why: `Three check-ins a week at most. This one is skipped for you.` };
  if (buy.amt > line) return { ask: true, why: `This buy is over your $${line} line.` };
  const others = (data.buys || []).filter(snFlex); // the other buys: the caller leaves this one out
  const pay = (data.pays || []).find(p => { const k = snDays(p.d, buy.d); return k != null && k >= 0 && k <= R.afterPay; });
  if (pay && others.filter(b => { const k = snDays(pay.d, b.d); return k != null && k >= 0 && k <= R.afterPay; }).length + 1 >= R.paydayBuys)
    return { ask: true, why: 'A few buys close to payday.' };
  const plan = data.plan ? data.plan[buy.cat] : null, ym = String(buy.d).slice(0, 7);
  if (plan != null && ['food', 'fun'].includes(buy.cat)) {
    const sum = others.filter(b => b.cat === buy.cat && String(b.d).slice(0, 7) === ym).reduce((s, b) => s + b.amt, 0) + buy.amt;
    if (sum > plan * (1 + R.overShare) && sum - plan >= R.overMin) return { ask: true, why: `${SN_CATS[buy.cat]} is past its plan this month.` };
  }
  return { ask: false, why: 'Under your line, and no pattern tripped.' };
}
// The new sn after a tap (or a skip). nowAt: an ISO time, kept so the week can be counted.
export function snCheckinAdd(sn = {}, buy, tag, nowAt) {
  if (!snTag(tag)) return sn;
  return { ...sn, checks: [...(sn.checks || []), { at: nowAt, d: String(buy.d || nowAt).slice(0, 10), tag, amt: buy.amt ?? null, cat: buy.cat ?? null }] };
}
export const snCheckinSkip = (sn = {}, nowAt) => ({ ...sn, skips: [...(sn.skips || []), { at: nowAt }] });

// ---------- source 4: reactions to the app, and inaction ----------
export function snAppEvidence(data = {}, now) {
  const R = SN_RULES, out = [], since = snDays(data.since, now);
  // no new money data: no buy logged and no statement brought in for a while (only once there is a ledger to keep up)
  if (since != null && since >= R.labelDays) {
    const last = [data.imported, ...(data.buys || []).map(b => b.d)].filter(Boolean).sort().pop() || data.since, k = snDays(last, now);
    if (k != null && k >= R.quietDays) out.push(snSig('quiet', now, `No buy logged and no statement brought in for ${k} days`, 'app'));
  }
  if (data.away && data.away.days >= R.awayDays) out.push(snSig('away', data.away.back, `The app sat closed for ${data.away.days} days before ${snDayWords(data.away.back)}`, 'app'));
  const G = data.guesses;
  if (G && G.of >= 3 && G.guess / G.of >= R.guessShare && since != null && since >= R.labelDays)
    out.push(snSig('guesses', now, `${G.guess} of your ${G.of} main numbers are still a Guess after a month`, 'app'));
  const rc = data.rc;
  if (rc && rc.keptAt) out.push(snSig('rcKept', String(rc.keptAt).slice(0, 10), `You kept the new date of Recalculating (${snDayWords(String(rc.keptAt).slice(0, 10))})`, 'app'));
  if (rc && rc.due) {
    const k = rc.keptAt ? snDays(String(rc.keptAt).slice(0, 10), now) : since;
    if (k != null && k >= R.rcDays) out.push(snSig('rcOpen', now, `A Recalculating card has waited ${k} days for its new date to be kept`, 'app'));
  }
  for (const x of data.drills || []) if (x && x.d) out.push(snSig('drill', x.d, `You ran a fire drill (${snDayWords(x.d)})`, 'app'));
  return out;
}

// ---------- "Is this really it?": the push-back ----------
// said: 'yes' (this one fits), 'no' (it does not), 'other' (to: the trait that fits better). It counts as evidence.
export function snPush(sn = {}, trait, said, to = null, nowAt) {
  if (!['yes', 'no', 'other'].includes(said) || (said === 'other' && !to)) return sn;
  return { ...sn, push: [...(sn.push || []), { at: nowAt, d: String(nowAt).slice(0, 10), trait, said, to: said === 'other' ? to : null }] };
}
export function snPushEvidence(def, push = []) {
  const name = id => ((def.traits || []).find(t => t.id === id) || {}).name || id, P = SN_RULES.push;
  return push.map(p => ({ source: 'you', kind: 'push', d: p.d, add: p.said === 'yes' ? { [p.trait]: P } : p.said === 'no' ? { [p.trait]: -P } : { [p.to]: P },
    why: p.said === 'yes' ? `You said ${name(p.trait)} fits` : p.said === 'no' ? `You said ${name(p.trait)} does not fit` : `You said ${name(p.to)} fits better than ${name(p.trait)}` }));
}
// THE record of the push-backs, for the judge that keeps a record and can be challenged (the game's Quest mode reads it
// through qsFromPush of js/math/quest.js).
export function snJudgeLog(def, sn = {}) {
  const name = id => ((def.traits || []).find(t => t.id === id) || {}).name || id;
  return (sn.push || []).map(p => ({ at: p.at, d: p.d, trait: p.trait, name: name(p.trait), said: p.said, to: p.to, toName: p.to ? name(p.to) : null }));
}

// ---------- "Test the fix": one defense for a month ----------
// The pattern of one trait: its points from the ledger, the check-ins and the app, as they came in (not faded).
export function snPattern(ev, trait, from, to) {
  return ev.filter(p => ['ledger', 'checkin', 'app'].includes(p.source) && p.d && p.d >= from && p.d < to).reduce((s, p) => s + Math.max(0, (p.add || {})[trait] || 0), 0);
}
export function snFixStart(sn = {}, trait, group, today) {
  return { ...sn, fix: { trait, group, start: today } };
}
// Where the month stands: the days left, the pattern the month before and so far. dropped: true (it went down),
// false (it did not), null (nothing showed in the month before, so there is nothing to compare).
export function snFixCheck(fix, ev, now) {
  if (!fix) return null;
  const n = SN_RULES.fixDays, end = snAddDays(fix.start, n), k = snDays(fix.start, now);
  const before = snPattern(ev, fix.trait, snAddDays(fix.start, -n), fix.start), during = snPattern(ev, fix.trait, fix.start, end);
  const daysLeft = Math.max(0, n - (k || 0));
  return { ...fix, end, done: k != null && k >= n, daysLeft, pct: Math.round(((n - daysLeft) / n) * 100), before, during, dropped: before > 0 ? during < before : null };
}
// The month is over: the result is kept, and the read follows it (the confidence rises when the pattern dropped).
export function snFixEnd(sn = {}, ev, now) {
  const C = snFixCheck(sn.fix, ev, now);
  if (!C || !C.done) return sn;
  return { ...sn, fix: null, fixes: [...(sn.fixes || []), { trait: C.trait, group: C.group, start: C.start, end: C.end, before: C.before, during: C.during, dropped: C.dropped }] };
}
export function snFixEvidence(def, fixes = []) {
  const name = id => ((def.traits || []).find(t => t.id === id) || {}).name || id;
  return fixes.filter(f => f.dropped !== null).map(f => ({ source: 'fix', kind: 'fix', d: f.end,
    add: { [f.trait]: f.dropped ? SN_RULES.fixUp : -SN_RULES.fixDown },
    why: f.dropped ? `The ${name(f.trait)} pattern dropped in the month of its defense` : `The ${name(f.trait)} pattern held in the month of its defense, so the next likely read is up` }));
}

// ---------- the read ----------
// Every piece of evidence for this person, from all sources.
export function snEvidence(def, st = {}, data = {}, now = null) {
  const sn = st.sn || {}, checks = sn.checks || [];
  return [...snQuizEvidence(def, st.ans || {}, st.at), ...snLedgerEvidence({ ...data, checks }, now), ...snCheckinEvidence(checks),
    ...snAppEvidence(data, now), ...snPushEvidence(def, sn.push || []), ...snFixEvidence(def, sn.fixes || [])];
}
// The strongest pieces for one trait, as plain lines with how long ago ("Why we think this").
export function snWhy(W, trait, now, n = 3) {
  return W.filter(p => (p.f[trait] || 0) > 0).sort((a, b) => b.f[trait] - a.f[trait] || String(b.d).localeCompare(String(a.d))).slice(0, n)
    .map(p => ({ source: p.source, line: p.why, ago: p.source === 'quiz' ? null : snAgo(p.d, now), points: Math.round(p.f[trait] * 10) / 10 }));
}
// The defense for the month: the top of the family, unless its defense was tried and the pattern held; then the next.
export function snFixPick(def, fam, fixes = []) {
  const held = new Set(fixes.filter(f => f.dropped === false).map(f => f.trait));
  const id = fam.order.find(t => !held.has(t)) || fam.order[0], F = ((def.read || {}).fix || {})[id];
  return F ? { trait: id, group: fam.id, name: F.name, how: F.how, check: F.check, moved: id !== fam.order[0] } : null;
}
// THE read. qz: the one engine ({ qzResult, QZ_LEVELS }). def: the sins skin. st: what is kept. data: the ledger and
// the app, read by the caller from its own store. now: 'YYYY-MM-DD'.
export function snRead(qz, def, st = {}, data = {}, now) {
  const R = SN_RULES, sn = st.sn || {}, ev = snEvidence(def, st, data, now), W = snWeigh(ev, now), outside = snOutside(ev, now);
  const E = qz.qzResult(def, {}, outside), days = data.since ? Math.max(0, snDays(data.since, now) || 0) : 0;
  const card = id => (def.cards || {})[id] || {}, trait = id => (def.traits || []).find(t => t.id === id) || { id, name: id };
  const tr = id => ({ id, name: trait(id).name, score: Math.round((E.scores[id] || 0) * 10) / 10, money: (card(id).lines || [])[0] || null, light: card(id).light || null });
  const need = (def.confidence && def.confidence.margin) ?? 0.1;
  const families = (def.groups || []).map(g => {
    const B = E.byGroup[g.id] || {}, order = E.ranked.filter(r => r.group === g.id).map(r => r.id);
    // the sources whose own top in this family is the read's top
    const agree = outside.filter(o => { const own = order.slice().sort((a, b) => (o.scores[b] || 0) - (o.scores[a] || 0) || order.indexOf(a) - order.indexOf(b))[0]; return (o.scores[own] || 0) > 0 && own === B.top; }).map(o => o.source);
    const last = (sn.push || []).filter(p => p.trait === B.top).pop(), any = (E.scores[B.top] || 0) > 0;
    // the margin inside the family: how far the top stands out of the family's own points
    const fam = order.reduce((s, id) => s + Math.max(0, E.scores[id] || 0), 0), margin = fam > 0 ? (Math.max(0, E.scores[B.top] || 0) - Math.max(0, E.scores[B.second] || 0)) / fam : 0;
    const pass = any && agree.length >= R.agree && days >= R.labelDays, clear = !B.tie && margin >= need;
    const level = !any ? null : !pass || !clear ? 'Guess' : last && last.said === 'yes' ? 'Exact' : 'Close';
    const why = !any ? 'Nothing to read yet.' : !data.since ? 'Your own spending is not in yet, so this rests on the quiz.' : days < R.labelDays ? `About ${R.labelDays - days} more days of your money, then a label can show.`
      : agree.length < R.agree ? 'Waiting for a second source to agree.' : !clear ? 'Two sit close together, so both are shown.'
      : level === 'Exact' ? 'You said this one fits, and two sources agree.' : 'Two sources agree, over about a month of your money.';
    return { id: g.id, name: g.name, top: tr(B.top), second: tr(B.second), topTwo: [tr(B.top), tr(B.second)], order, tie: !!B.tie, margin, agree, pass, level,
      word: level ? qz.QZ_LEVELS[level] : null, why, lines: snWhy(W, B.top, now) };
  });
  const fixNow = sn.fix ? snFixCheck(sn.fix, ev, now) : null, base = sn.fix ? families.find(f => f.id === sn.fix.group) : families[0];
  const F = sn.fix ? ((def.read || {}).fix || {})[sn.fix.trait] : null;
  const fix = fixNow ? { ...fixNow, name: F && F.name, how: F && F.how, check: F && F.check, started: true } : base ? { ...snFixPick(def, base, sn.fixes || []), started: false } : null;
  const read = { quiz: def.id, now, days, enough: days >= R.labelDays, since: data.since || null, ready: families.some(f => f.level), quizWeight: Math.round(snQuizWeight(ev, now) * 100) / 100,
    sources: outside.map(o => ({ id: o.source, name: SN_SOURCES[o.source], n: ev.filter(p => p.source === o.source).length })), families, fix, ev: W, engine: E };
  read.gathering = snGathering(read, st, data);
  return read;
}
// The top two of one family ('sin' or 'change'), for Part 2's result card.
export const snTopTwo = (read, group) => ((read.families.find(f => f.id === group) || {}).topTwo) || [];
// What is still being gathered, in plain lines.
export function snGathering(read, st = {}, data = {}) {
  const out = [], has = id => read.sources.some(s => s.id === id), R = SN_RULES;
  if (!Object.keys(st.ans || {}).length) out.push('The quiz: fifteen taps give the first guess.');
  if (!data.since) out.push('Your spending: log a few buys or bring in a statement, and the read starts to learn from your own months.');
  else if (read.days < R.labelDays) out.push(`Your money so far: ${read.days} of about ${R.labelDays} days before a label can show.`);
  if (!has('checkin')) out.push(`Check-ins: one tap, "what was this?", only on a buy over your line or when a pattern trips, at most ${R.perWeek} a week.`);
  for (const f of read.families) if (f.level && f.agree.length < R.agree) out.push(`${f.name}: a second source that agrees.`);
  return out;
}
// What of the read may leave the device. Private by default: nothing, unless the person turned "show" on; even then
// the check-ins, the push-backs and the defenses stay home, and only the quiz answers go.
export function snShared(st) {
  if (!st || !st.sn || !st.sn.show) return null;
  return { ans: st.ans || {}, at: st.at || null, sn: { v: 1, show: true } };
}


// =====================================================================================================================
// Part 2: results and growth (run "Money sins", Nov 25 2026). The words are in the skin (def.grow); these functions
// only put them together. No function here makes a money number, and none changes one.
// =====================================================================================================================
const snG = def => (def && def.grow) || {};
const snFam = (read, id) => (read && read.families ? read.families.find(f => f.id === id) : null) || null;
const snLabeled = f => !!f && (f.level === 'Close' || f.level === 'Exact');
// The archetype of one pair: a sin and a way of refusing change. Two parts, so every one of the 84 pairs reads well:
// "The <refusal part> <sin part>", and one plain line. null when a part is missing.
export function snArchetype(def, sinId, changeId) {
  const A = snG(def).arch || {}, s = (A.sin || {})[sinId], c = (A.change || {})[changeId];
  if (!s || !c) return null;
  return { id: `${sinId}+${changeId}`, sin: sinId, change: changeId, name: `The ${c.adj} ${s.noun}`, line: `${s.does}, ${c.then}.` };
}
// Every archetype, for the list Eli reads and for the tests.
export function snArchetypes(def) {
  const A = snG(def).arch || {}, out = [];
  for (const s of Object.keys(A.sin || {})) for (const c of Object.keys(A.change || {})) out.push(snArchetype(def, s, c));
  return out;
}
// The virtue that answers a trait. voice: an add-on's names ({ virtues: { traitId: name } }); with none, the default.
export function snVirtue(def, id, voice = null) {
  const V = (snG(def).virtue || {})[id];
  if (!V) return null;
  const alt = voice && voice.virtues && voice.virtues[id];
  return { id, name: alt || V.name, line: V.line, plain: V.name };
}
// THE result card: the top sin and the top refusal, the light side of each, the virtue that answers each, the
// archetype, and one Recalculating move for this month (the read's defense of the month; turn: the next turn of a
// Recalculating card when one shows). voice: an add-on's virtue names and one extra line (the game's hook). null
// before the quiz has given both families a top.
export function snCard(def, read, { turn = null, voice = null } = {}) {
  const S = snFam(read, 'sin'), C = snFam(read, 'change');
  if (!S || !C || !S.top || !C.top || !(S.top.score > 0) || !(C.top.score > 0)) return null;
  const part = (f, t) => ({ id: t.id, name: t.name, light: t.light, money: t.money, virtue: snVirtue(def, t.id, voice), second: f.second && f.second.score > 0 ? f.second.name : null, level: f.level || 'Guess', word: f.word || 'Early read' });
  const F = read.fix;
  return { arch: snArchetype(def, S.top.id, C.top.id), sin: part(S, S.top), change: part(C, C.top), early: !snLabeled(S) || !snLabeled(C), firm: [S, C].filter(snLabeled).length,
    head: snLabeled(S) && snLabeled(C) ? 'Your money read' : snLabeled(S) || snLabeled(C) ? 'Your money read, still firming up' : 'Early read: the quiz so far',
    move: F && F.name ? { title: 'Your Recalculating move this month', name: F.name, how: F.how, check: F.check, started: !!F.started, trait: F.trait, turn } : null,
    extra: voice && voice.line ? voice.line : null };
}
// The share card. No numbers: no money, no score, no check-in, no push-back, no date. Only the archetype and the
// plain names. It is made only when the person taps it. Always the default voice (an add-on never rides along).
export function snShareCard(def, card) {
  if (!card || !card.arch) return null;
  const strip = s => String(s || '').replace(/\d/g, '').replace(/\s{2,}/g, ' ').trim();
  const lines = [card.arch.line, `Main pull: ${card.sin.name}. The light side: ${card.sin.light}`, `Way of refusing change: ${card.change.name}. The light side: ${card.change.light}`,
    `Growing: ${snVirtue(def, card.sin.id).plain} and ${snVirtue(def, card.change.id).plain}.`].map(strip);
  const title = strip(card.arch.name), foot = 'The money sins, a game lens in SLAM. Not a diagnosis.';
  return { title, lines, foot, text: [`I am ${title}.`, ...lines, foot].join('\n') };
}

// ---------- the app talks to the type ----------
export const SN_MOMENTS = ['home', 'crash', 'hard'];
// THE framing line for a type and a moment. The way of refusing change speaks first, then the main pull, and only
// when that family has a label (Close or Exact). With no read, or an Early read, there is no extra line (line: null):
// the card says what it always says. It never changes a number and never hides one: the caller only adds this line.
export function snFrame(def, read, moment) {
  const out = { moment, line: null, trait: null, name: null, family: null };
  if (!read || !SN_MOMENTS.includes(moment)) return out;
  for (const id of ['change', 'sin']) {
    const f = snFam(read, id), L = f && snLabeled(f) ? ((snG(def).frame || {})[f.top.id] || {})[moment] : null;
    if (L) return { moment, line: L, trait: f.top.id, name: f.top.name, family: id };
  }
  return out;
}

// ---------- couples ----------
// How two reads collide: a = { name, sin, change } and b the same (trait ids). Shown only when BOTH turned on
// sharing their read with each other (the caller checks both opt-ins with snCoupleOk).
export const snCoupleOk = (a, b) => !!(a && b && a.mate === true && b.mate === true && a.sin && a.change && b.sin && b.change);
export function snCouple(def, a, b) {
  if (!snCoupleOk(a, b)) return null;
  const P = snG(def).pair || {}, name = id => ((def.traits || []).find(t => t.id === id) || {}).name || id;
  const line = (fam, x, y) => (x === y ? `${name(x)}, twice. ${P.same}` : `One of you ${(P[fam] || {})[x]}, the other ${(P[fam] || {})[y]}. ${(P.close || {})[fam]}`);
  return { a: { name: a.name, arch: snArchetype(def, a.sin, a.change) }, b: { name: b.name, arch: snArchetype(def, b.sin, b.change) },
    sin: { a: name(a.sin), b: name(b.sin), same: a.sin === b.sin, line: line('sin', a.sin, b.sin) },
    change: { a: name(a.change), b: name(b.change), same: a.change === b.change, line: line('change', a.change, b.change) } };
}
// The money date script for the pair: the prompts to tap through, in order. A prompt for each person's pull and
// refusal (one when both have the same), between the opening and the close.
export function snDate(def, a, b) {
  if (!snCoupleOk(a, b)) return null;
  const D = snG(def).date || {}, steps = [];
  for (const t of D.open || []) steps.push({ who: null, line: t });
  const add = (p, id, fam) => { if (D[id]) steps.push({ who: p.name, trait: id, family: fam, line: D[id] }); };
  for (const fam of ['sin', 'change']) {
    if (a[fam] === b[fam]) { if (D[a[fam]]) steps.push({ who: 'Both', trait: a[fam], family: fam, line: D[a[fam]] }); }
    else { add(a, a[fam], fam); add(b, b[fam], fam); }
  }
  for (const t of D.close || []) steps.push({ who: null, line: t });
  return steps.map((s, i) => ({ ...s, n: i + 1, of: steps.length }));
}
// The part of a read a partner sees, once both opted in: the two names and nothing else (no evidence, no check-in).
export function snMatePart(read, name, mate) {
  const S = snFam(read, 'sin'), C = snFam(read, 'change');
  return S && C && S.top && C.top && S.top.score > 0 && C.top.score > 0 ? { name, mate: !!mate, sin: S.top.id, change: C.top.id } : null;
}

// ---------- the retake each quarter, and the history of reads ----------
// One entry of the history: the read on the day of a take (its top two and the scores of all traits).
export function snHistEntry(read, at) {
  const fam = id => { const f = snFam(read, id); return f ? { top: f.top.id, second: f.second ? f.second.id : null, level: f.level || null } : null; };
  const scores = {};
  for (const [id, v] of Object.entries((read && read.engine && read.engine.scores) || {})) scores[id] = Math.round(v * 100) / 100;
  return { at: at ? String(at).slice(0, 10) : null, d: read ? read.now : null, sin: fam('sin'), change: fam('change'), scores };
}
// Keeps the read of one take. One entry per take (its date); the newest replaces one of the same date; at most histMax.
// COMPATIBILITY (Part 2): sn.hist is new; a read kept before it has no history, and its first entry is written when
// the person retakes the quiz (snRetake keeps the old take first) or when the history is first shown.
export function snHistAdd(sn = {}, read, at) {
  if (!at || !read) return sn;
  const e = snHistEntry(read, at), list = (sn.hist || []).filter(x => x.at !== e.at);
  return { ...sn, hist: [...list, e].sort((x, y) => String(x.at).localeCompare(String(y.at))).slice(-SN_RULES.histMax) };
}
// The new state of a retake: the old take kept in the history, the answers cleared, the rest of the read (check-ins,
// push-backs, defenses, the line, who sees it) kept as it was.
export function snRetake(st = {}, read) {
  const sn = st.at && Object.keys(st.ans || {}).length ? snHistAdd(st.sn || {}, read, st.at) : (st.sn || {});
  return { ...st, ans: {}, go: true, at: null, ok: false, kept: null, sn: { ...sn, retakeSkip: null } };
}
// Is a retake due? A quarter (91 days) after the last take, unless the person said "not this quarter".
export function snRetakeDue(st = {}, today) {
  const at = st.at ? String(st.at).slice(0, 10) : null, days = at ? snDays(at, today) : null;
  if (days == null) return { due: false, days: null, q: 0, why: 'No take yet.' };
  const q = Math.floor(days / SN_RULES.retakeDays), skip = st.sn && st.sn.retakeSkip;
  if (q < 1) return { due: false, days, q, why: `The next retake is in about ${SN_RULES.retakeDays - days} days.` };
  if (skip && skip.from === at && skip.q >= q) return { due: false, days, q, why: 'You chose not this quarter.' };
  return { due: true, days, q, why: `Your last take was ${snAgo(at, today)}. A quarter has passed.` };
}
export function snRetakeSkip(sn = {}, st = {}, today) {
  const R = snRetakeDue(st, today);
  return R.q < 1 ? sn : { ...sn, retakeSkip: { from: String(st.at).slice(0, 10), q: R.q } };
}
// How a trait moved over the takes: its share of its family's points at each take (0 to 1).
function snShare(def, scores, id) {
  const t = (def.traits || []).find(x => x.id === id);
  if (!t) return null;
  const sum = (def.traits || []).filter(x => x.group === t.group).reduce((s, x) => s + Math.max(0, scores[x.id] || 0), 0);
  return sum > 0 ? Math.max(0, scores[id] || 0) / sum : null;
}
// The sin weakening and the virtue growing, over the takes: for each family, the top of the FIRST take, followed.
// weaker: true when its share went down from the first take to the last, false when it went up, null when even.
export function snGrowth(def, hist = []) {
  if (!hist.length) return [];
  const name = id => ((def.traits || []).find(t => t.id === id) || {}).name || id;
  return ['sin', 'change'].map(fam => {
    const first = hist[0][fam];
    if (!first || !first.top) return null;
    const id = first.top, series = hist.map(e => ({ at: e.at, share: snShare(def, e.scores || {}, id), top: e[fam] ? e[fam].top : null })).filter(x => x.share != null);
    if (!series.length) return null;
    const a = series[0].share, z = series[series.length - 1].share, pct = x => Math.round(x * 100), V = snVirtue(def, id);
    const weaker = series.length < 2 || pct(a) === pct(z) ? null : z < a;
    const line = series.length < 2 ? `${name(id)} is ${pct(a)}% of your ${fam === 'sin' ? 'pull' : 'pushback on change'} at the first take. ${V.name} is the one to grow; the next take shows the trend.`
      : weaker === true ? `${name(id)} went from ${pct(a)}% to ${pct(z)}% of your ${fam === 'sin' ? 'pull' : 'pushback on change'}. ${V.name} is growing.`
      : weaker === false ? `${name(id)} is louder this time, ${pct(a)}% to ${pct(z)}%. ${V.name} is the one to practice next.`
      : `${name(id)} holds steady at ${pct(z)}%. ${V.name} is the one to practice next.`;
    return { family: fam, trait: id, name: name(id), virtue: V.name, series, from: a, to: z, weaker, takes: series.length, nowTop: series[series.length - 1].top, line };
  }).filter(Boolean);
}
// The part of the graduation story the read gives: where the person started, how the pull moved, and what the
// defenses did. Empty when there is no take. The graduation story calls this; it shows only what the person shows.
export function snGradStory(def, sn = {}) {
  const H = sn.hist || [];
  if (!H.length) return [];
  const first = H[0], arch = first.sin && first.change ? snArchetype(def, first.sin.top, first.change.top) : null, out = [];
  if (arch) out.push(`You started as ${arch.name}.`);
  for (const g of snGrowth(def, H)) if (g.takes > 1) out.push(g.line);
  const tried = (sn.fixes || []).length, dropped = (sn.fixes || []).filter(f => f.dropped === true).length;
  if (tried) out.push(`${tried} ${tried === 1 ? 'defense' : 'defenses'} tested for a month, ${dropped} of them with the pattern dropping.`);
  return out;
}


// =====================================================================================================================
// Part 3: the Rings theme (run "Money sins", Nov 25 2026). The words are in the skin (def.rings); these functions only
// put them together with the read. No function here makes a money number, and none changes one. voice: an add-on's
// second voice ({ words: { key: text }, rulers: { sinId: { roast, taunt, beat } } }); with none, the default words.
// =====================================================================================================================
const snRg = def => (def && def.rings) || {};
const snFill = (s, v) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] == null ? '' : String(v[k])));
// The themed words, with an add-on's words over them when one is given.
export function snRingWords(def, voice = null) {
  return { ...(snRg(def).words || {}), ...((voice && voice.words) || {}) };
}
// The ruler of one sin's ring: the name, the ring, the roast, the taunt, how it is beaten and the ward (the defense
// of that sin, from the read's own list).
export function snRuler(def, sinId, voice = null) {
  const R = (snRg(def).rulers || {})[sinId];
  if (!R) return null;
  const alt = (voice && voice.rulers && voice.rulers[sinId]) || {}, F = ((def.read || {}).fix || {})[sinId];
  const sinName = ((def.traits || []).find(t => t.id === sinId) || {}).name || sinId;
  return { sin: sinId, sinName, name: R.name, ring: R.ring, roast: alt.roast || R.roast, taunt: alt.taunt || R.taunt, beat: alt.beat || R.beat, ward: F ? F.name : null };
}
// All seven rulers, for the tests and the list Eli reads.
export function snRulers(def, voice = null) {
  return Object.keys(snRg(def).rulers || {}).map(id => snRuler(def, id, voice));
}
// The steps climbed. One step for each retake on which the first take's main pull held a smaller share of the pull
// than at the take before, and one for each month of a defense (a ward) in which the pattern dropped. hist: the
// history of takes (snHistAdd); fixes: the months of defenses (snFixEnd); sinIds: the ids of the seven sins.
export function snClimb(hist = [], fixes = [], sinIds = []) {
  const share = (sc, id) => { const sum = sinIds.reduce((s, x) => s + Math.max(0, (sc || {})[x] || 0), 0); return sum > 0 ? Math.max(0, (sc || {})[id] || 0) / sum : null; };
  const steps = [], first = hist.length && hist[0].sin ? hist[0].sin.top : null;
  if (first) for (let i = 1; i < hist.length; i++) {
    const a = share(hist[i - 1].scores, first), z = share(hist[i].scores, first);
    if (a != null && z != null && Math.round(z * 100) < Math.round(a * 100)) steps.push({ kind: 'take', d: hist[i].at, trait: first, a: Math.round(a * 100), z: Math.round(z * 100) });
  }
  for (const f of fixes) if (f && f.dropped === true) steps.push({ kind: 'ward', d: f.end, trait: f.trait });
  return steps.sort((x, y) => String(x.d).localeCompare(String(y.d)));
}
// The rings of one person. The bottom ring is the ring of the main pull now; the rings above it follow the person's
// own order of the sins, the weakest pull at the top, next to the way out. Each step climbed moves the person up one
// ring; past the top ring the person is out. null before the quiz has given the sins a top.
export function snRings(def, read, sn = {}, voice = null) {
  const S = snFam(read, 'sin');
  if (!S || !S.top || !(S.top.score > 0)) return null;
  const ids = (def.traits || []).filter(t => t.group === 'sin').map(t => t.id);
  const order = [...(S.order || []).filter(id => ids.includes(id)), ...ids.filter(id => !(S.order || []).includes(id))];
  const N = order.length, W = snRingWords(def, voice), V = id => snVirtue(def, id);
  const rings = order.map((id, i) => ({ n: N - i, sin: id, ruler: snRuler(def, id, voice) }));
  const steps = snClimb(sn.hist || [], sn.fixes || [], ids).map(s => {
    const T = snRuler(def, s.trait, voice) || {}, tn = ((def.traits || []).find(t => t.id === s.trait) || {}).name || s.trait, F = ((def.read || {}).fix || {})[s.trait];
    return { ...s, line: snFill(s.kind === 'take' ? W.stepTake : W.stepWard, { sin: tn, a: s.a, z: s.z, virtue: (V(s.trait) || {}).name, ward: F ? F.name : T.ward }) };
  });
  const climbed = Math.min(N, steps.length), out = climbed >= N, on = out ? null : rings[climbed];
  const bottom = rings[0].ruler;
  const head = snFill(W.start, { ring: bottom.ring, sin: bottom.sinName, ruler: bottom.name });
  const now = out ? W.out : climbed ? snFill(W.on, { ring: on.ruler.ring, left: on.n === 1 ? 'One ring' : `${on.n} rings` }) : snFill(W.none, { sin: bottom.sinName });
  return { rings, steps, climbed, of: N, out, on, ringNow: on ? on.n : 0, head, now, level: S.level || 'Guess', word: S.word || 'Early read' };
}
// The boss of the boss fights in the Rings theme: the ruler of the main pull, and how much of the pull it holds now
// (the main pull's share of the seven sins' points). null before the quiz has given the sins a top.
export function snBoss(def, read, voice = null) {
  const S = snFam(read, 'sin');
  if (!S || !S.top || !(S.top.score > 0)) return null;
  const R = snRuler(def, S.top.id, voice);
  if (!R) return null;
  const share = snShare(def, (read.engine && read.engine.scores) || {}, S.top.id), hold = share == null ? null : Math.round(share * 100), W = snRingWords(def, voice);
  return { ...R, hold, holdLine: hold == null ? null : snFill(W.hold, { ruler: R.name, hold }), line: snFill(W.bossLine, { ruler: R.name }), level: S.level || 'Guess', word: S.word || 'Early read' };
}
