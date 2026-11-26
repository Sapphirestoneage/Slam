// SPDX-License-Identifier: AGPL-3.0-only
// THE quiz engine (Nov 25 2026): one file of pure functions with no imports, for the web app and the game.
// The game runs a copy (game/core/quizcore.js, made by `node tools/game_quiz_build.mjs`; a test in each suite fails
// when the copy is old). How to add a quiz: docs/QUIZ-ENGINE.md. A quiz is a game lens, never a diagnosis.
//
// A QUIZ DEFINITION (a "skin") is plain data (JSON-safe, no functions):
//   { id, name, blurb, note, playful?, soon?,
//     scoring: 'sum' (the default) | 'average',
//     scale?: [[value, label], ...]                    the taps of a statement, when the quiz has statements
//     traits: [{ id, name, group? }],                  what the answers add up to
//     groups?: [{ id, name }],                         families of traits (the five elements; the two families of the sins)
//     questions: [
//       { id, ask, options: [{ id, label, add: { traitId: points } }], when?, axis?, style? }      a tap question
//       { id, text, trait, dir }                       a statement, scoring 'average' (dir -1 turns the scale around)
//       { id, text, toward, away, axis? }              a statement, scoring 'sum' (a plus value adds to `toward`, a minus to `away`)
//     ],
//     result: { by: 'top' (the default) | 'axes' | 'rules', group?: groupId (the card is the top of this group),
//               axes?: [{ id, name, poles: [traitId, ...], tie?: traitId, min?: n }],  one letter of a code for each axis
//               rules?: [{ when, result, early? }],                                     the first rule that holds names the card
//               compose?: { lines: [axisId, ...], light: axisId, next: axisId } },      a card put together from the poles
//     cards: { resultId: { title, lines: [2 or 3], light, next: { label, skill?, reading?, tree? }, skills?, readings?, trees? } },
//     poles?: { traitId: { word, line, light?, next?, skills?, readings? } },           the parts of a composed card
//     confidence?: { margin: 0.1, sources: 1 },
//     bars?: true | groupId,                           show a percent for each trait (of one group) on the card (qzBars)
//     spectrums?: [{ id, name, trait, left, right }],  preference spectrums, each read from one trait (qzSpectrums)
//     where?: 'game',                                  a skin that only the game lists (Quantum collapse: the web app has its own page)
//     core: { elements?: { traitId: { Fire: 1, Water: 0.5 } }, sheet: 'Money house', how: 'the mapping in plain words' } }
//
// A CONDITION (`when`) is data too: { questionId: test, ... } where every test must hold. A test is a value (the
// answer equals it), a list (the answer is one of them), { not: value or list } (also true while not answered), or
// null (not answered yet). { any: [condition, ...] } holds when one of the conditions holds.
//
// ANSWERS are { questionId: optionId } (a statement: its scale value). SCORES FROM OUTSIDE are an input of the
// scoring, never a side effect: { traitId: points }, or a list [{ source: 'spending', scores: { traitId: points } }].
// The caller works out their weights and their fading over time; this file only adds them in. Every function here
// is pure: the same inputs give the same result.
//
// A RESULT (qzResult) is:
//   { quiz, ready, done, answered, of, next, early, scores: { traitId: n }, traits, groups, ranked,
//     top, second, topTwo: [id, id], tie, margin, byGroup: { groupId: { top, second, tie } },
//     id (the key of its card), code?, axes?, confidence: { level: 'Guess' | 'Close' | 'Exact', word, why }, sources }
// A CARD (qzCard): { quiz, id, title, lines, light, next, skills, readings, trees, also, tie, note, playful, confidence }.

export const QZ_ELEMENTS = ['Water', 'Earth', 'Air', 'Fire', 'Spirit'];
// The three levels every SLAM number has, in the words of a read. A quiz alone is never Exact: only the person's own tap is.
export const QZ_LEVELS = { Guess: 'Early read', Close: 'Close read', Exact: 'Confirmed by you' };

const qzList = v => (Array.isArray(v) ? v : [v]);
const qzSame = (a, b) => a === b || (a != null && b != null && String(a) === String(b));
function qzTest(test, value) {
  if (test === null) return value == null;
  if (Array.isArray(test)) return test.some(t => qzSame(t, value));
  if (typeof test === 'object') return 'not' in test ? !qzList(test.not).some(t => qzSame(t, value)) : false;
  return qzSame(test, value);
}
// Does a condition hold for these answers? No condition holds always.
export function qzHolds(cond, answers = {}) {
  if (!cond) return true;
  if (Array.isArray(cond.any)) return cond.any.some(c => qzHolds(c, answers));
  return Object.keys(cond).every(k => qzTest(cond[k], answers[k]));
}
const qzScaleOf = def => (def.scale || []).map(s => s[0]);
// Is this a real answer to this question?
export function qzAnswered(def, q, answers = {}) {
  const v = answers[q.id];
  if (v == null) return false;
  return q.options ? q.options.some(o => qzSame(o.id, v)) : qzScaleOf(def).some(s => s === v);
}
// The questions these answers lead to, in order (a question with a `when` that does not hold is left out).
export const qzAsked = (def, answers = {}) => (def.questions || []).filter(q => qzHolds(q.when, answers));
// The first rule that holds. A rule marked early is read at any time; the others only when every question is answered.
export function qzRule(def, answers = {}, done = false) {
  const rules = (def.result && def.result.rules) || [];
  return rules.find(r => (r.early || done) && qzHolds(r.when, answers)) || null;
}
// Where the person is: what was asked, what is open, the next question, and whether the answers already settle it.
export function qzFlow(def, answers = {}) {
  const asked = qzAsked(def, answers), open = asked.filter(q => !qzAnswered(def, q, answers));
  const early = ((def.result && def.result.rules) || []).find(r => r.early && qzHolds(r.when, answers)) || null;
  const done = !!early || open.length === 0;
  return { asked, open, next: done ? null : open[0], done, early: early ? early.result : null, answered: asked.length - open.length, of: asked.length };
}
// The last answered question on the path: the one a Back button takes away.
export function qzLast(def, answers = {}) {
  const got = qzAsked(def, answers).filter(q => qzAnswered(def, q, answers));
  return got.length ? got[got.length - 1].id : null;
}
// Scores from outside, in one shape: { scores: { traitId: points }, sources: [name, ...] }.
export function qzOutside(outside) {
  const scores = {}, sources = [];
  const add = (set, name) => {
    let any = false;
    for (const k of Object.keys(set || {})) if (typeof set[k] === 'number' && Number.isFinite(set[k])) { scores[k] = (scores[k] || 0) + set[k]; any = true; }
    if (any && name && !sources.includes(name)) sources.push(name);
  };
  if (Array.isArray(outside)) outside.forEach((o, i) => add(o && o.scores, (o && o.source) || `source ${i + 1}`));
  else if (outside && typeof outside === 'object') add(outside, 'outside');
  return { scores, sources };
}
// THE scoring. answers: what was tapped. outside: scores from other sources of evidence (see the top of the file).
// Returns each trait's score, the traits that have a score in the order of the definition, the groups, and the ranking.
export function qzScore(def, answers = {}, outside = null) {
  const O = qzOutside(outside), average = def.scoring === 'average', sc = qzScaleOf(def);
  const lo = sc.length ? Math.min(...sc) : 0, hi = sc.length ? Math.max(...sc) : 0;
  const sum = {}, n = {};
  for (const t of def.traits || []) { sum[t.id] = 0; n[t.id] = 0; }
  const put = (t, v) => { if (t in sum) { sum[t] += v; n[t] += 1; } };
  for (const q of qzAsked(def, answers)) {
    if (!qzAnswered(def, q, answers)) continue;
    const v = answers[q.id];
    if (q.options) { const o = q.options.find(x => qzSame(x.id, v)); for (const t of Object.keys(o.add || {})) put(t, o.add[t]); }
    else if (average) put(q.trait, q.dir < 0 ? lo + hi - v : v);
    else if (v > 0) put(q.toward, v);
    else if (v < 0) put(q.away, -v);
  }
  const scores = {};
  for (const t of def.traits || []) {
    const base = average ? (n[t.id] ? Math.round((sum[t.id] / n[t.id] - lo) / (hi - lo) * 100) : 0) : sum[t.id];
    scores[t.id] = base + (O.scores[t.id] || 0);
  }
  const has = t => n[t.id] > 0 || t.id in O.scores;
  const traits = (def.traits || []).filter(has).map(t => ({ id: t.id, name: t.name, group: t.group ?? null, n: n[t.id], score: scores[t.id] }));
  const groups = (def.groups || []).map(g => {
    const ts = traits.filter(t => t.group === g.id);
    const score = !ts.length ? null : average ? Math.round(ts.reduce((s, t) => s + t.score, 0) / ts.length) : ts.reduce((s, t) => s + t.score, 0);
    return { id: g.id, name: g.name, traits: ts, answered: ts.length, score };
  });
  const total = average ? 100 : Object.values(scores).reduce((s, v) => s + Math.max(0, v), 0);
  const rank = list => list.map((t, i) => ({ id: t.id, name: t.name, group: t.group ?? null, score: scores[t.id], share: total > 0 ? Math.max(0, scores[t.id]) / total : 0, i }))
    .sort((a, b) => b.score - a.score || a.i - b.i).map(({ i, ...r }) => r);
  const ranked = rank(def.traits || []);
  const pair = list => ({ top: list[0] ? list[0].id : null, second: list[1] ? list[1].id : null, tie: list.length > 1 && list[0].score === list[1].score,
    margin: list.length > 1 ? list[0].share - list[1].share : list.length ? list[0].share : 0 });
  const byGroup = {};
  for (const g of def.groups || []) byGroup[g.id] = pair(ranked.filter(r => r.group === g.id));
  return { scores, traits, groups, ranked, total, ...pair(ranked), byGroup, sources: O.sources };
}
// One letter for each axis: the pole with the most points. On a tie: the pole the caller leans to (ties[axisId]),
// else the axis's own `tie`, else the first of the leaders.
function qzAxes(def, answers, S, ties) {
  return (def.result.axes || []).map(ax => {
    const mine = (def.questions || []).filter(q => q.axis === ax.id), got = mine.filter(q => qzAnswered(def, q, answers));
    const best = Math.max(...ax.poles.map(p => S.scores[p] || 0)), lead = ax.poles.filter(p => (S.scores[p] || 0) === best);
    const tie = lead.length > 1, lean = ties && ties[ax.id];
    const pole = !tie ? lead[0] : ax.poles.includes(lean) ? lean : ax.tie && ax.poles.includes(ax.tie) ? ax.tie : lead[0];
    const score = ax.poles.length === 2 ? (S.scores[ax.poles[0]] || 0) - (S.scores[ax.poles[1]] || 0) : best;
    return { id: ax.id, score, answered: got.length, of: mine.length, pole, tie, light: ax.poles.length === 2 ? Math.abs(score) <= 1 : tie, ready: got.length >= (ax.min ?? mine.length) };
  });
}
// THE result of a quiz. opts: { ties: { axisId: traitId }, confirmed: true when the person tapped "That is me" }.
export function qzResult(def, answers = {}, outside = null, opts = {}) {
  const F = qzFlow(def, answers), S = qzScore(def, answers, outside), by = (def.result && def.result.by) || 'top';
  const out = { quiz: def.id, done: F.done, answered: F.answered, of: F.of, next: F.next, early: F.early,
    scores: S.scores, traits: S.traits, groups: S.groups, ranked: S.ranked, top: S.top, second: S.second, topTwo: [S.top, S.second].filter(Boolean),
    tie: S.tie, margin: S.margin, byGroup: S.byGroup, sources: [...(F.answered ? ['quiz'] : []), ...S.sources] };
  let clear = !S.tie;
  if (by === 'axes') {
    out.axes = qzAxes(def, answers, S, opts.ties);
    out.ready = out.axes.every(a => a.ready);
    out.code = out.ready ? out.axes.map(a => a.pole).join('') : null;
    out.id = out.code;
    clear = !out.axes.some(a => a.tie);
  } else if (by === 'rules') {
    const rule = qzRule(def, answers, F.done);
    out.ready = F.done && !!rule;
    out.id = out.ready ? rule.result : null;
    clear = true;
  } else {
    // result.group: the card is the top of one group (the FIRE quiz: the flavor; its other traits are the spectrums)
    const grp = def.result && def.result.group, P = grp && S.byGroup[grp] ? S.byGroup[grp] : null;
    if (P) { out.second = P.second; out.topTwo = [P.top, P.second].filter(Boolean); out.tie = P.tie; out.margin = P.margin; clear = !P.tie; }
    const fromOutside = S.sources.length > 0 && S.total > 0;
    out.ready = def.scoring === 'average' && S.groups.length ? S.groups.every(g => g.answered > 0) : (F.done && F.of > 0 && S.total > 0) || fromOutside;
    out.id = out.ready ? (P ? P.top : S.top) : null;
  }
  const C = def.confidence || {}, need = C.margin ?? 0.1, sources = (F.done && F.answered ? 1 : 0) + S.sources.length;
  const level = !out.ready ? null : opts.confirmed ? 'Exact' : clear && (by !== 'top' || out.margin >= need) && sources >= (C.sources ?? 1) ? 'Close' : 'Guess';
  out.confidence = level ? { level, word: QZ_LEVELS[level],
    why: level === 'Exact' ? 'You said this one fits.' : level === 'Close' ? 'Every question is answered and one answer stands out.' : !F.done ? 'Not every question is answered yet.' : sources < (C.sources ?? 1) ? 'One source so far. The read firms up as more evidence comes in.' : 'Two answers sit close together, so both are shown.' } : null;
  return out;
}
const qzUniq = list => [...new Set(list.filter(Boolean))];
// THE card of a result: a title, two or three plain lines, the light side, one next step, and where it routes.
export function qzCard(def, result) {
  if (!result || !result.ready || result.id == null) return null;
  const by = (def.result && def.result.by) || 'top', name = id => ((def.traits || []).find(t => t.id === id) || {}).name || id;
  let c = (def.cards || {})[result.id] || null;
  if (!c && by === 'axes' && def.poles) {
    const P = id => def.poles[id] || {}, co = def.result.compose || {}, pole = axisId => (result.axes.find(a => a.id === axisId) || {}).pole;
    const lineAxes = co.lines || result.axes.map(a => a.id);
    c = { title: `${result.code}: ${result.axes.map(a => P(a.pole).word).filter(Boolean).join(' · ')}`,
      lines: lineAxes.map(a => P(pole(a)).line).filter(Boolean).slice(0, 3),
      light: P(pole(co.light || lineAxes[0])).light, next: P(pole(co.next || lineAxes[0])).next,
      skills: result.axes.flatMap(a => P(a.pole).skills || []), readings: result.axes.flatMap(a => P(a.pole).readings || []) };
  }
  if (!c) return null;
  const next = c.next || null;
  const also = by === 'top' && result.second && result.second !== result.id && (result.scores[result.second] || 0) > 0
    ? { id: result.second, name: ((def.cards || {})[result.second] || {}).title || name(result.second) } : null;
  return { quiz: def.id, id: result.id, title: c.title, lines: c.lines || [], light: c.light || null, next,
    skills: qzUniq([next && next.skill, ...(c.skills || [])]), readings: qzUniq([next && next.reading, ...(c.readings || [])]), trees: qzUniq([next && next.tree, ...(c.trees || [])]),
    also, tie: by === 'top' && !!result.tie && !!also, note: def.note || null, playful: !!def.playful, confidence: result.confidence };
}
// Where a result routes: the ids of real skills, readings and skill trees (data/library), and the one next step.
export function qzRoute(def, result) {
  const c = qzCard(def, result);
  return c ? { next: c.next, skills: c.skills, readings: c.readings, trees: c.trees } : { next: null, skills: [], readings: [], trees: [] };
}
// Every id a definition can route to, for the test that each one is real.
export function qzIds(def) {
  const parts = [...Object.values(def.cards || {}), ...Object.values(def.poles || {})];
  return { skills: qzUniq(parts.flatMap(c => [c.next && c.next.skill, ...(c.skills || [])])), readings: qzUniq(parts.flatMap(c => [c.next && c.next.reading, ...(c.readings || [])])),
    trees: qzUniq(parts.flatMap(c => [c.next && c.next.tree, ...(c.trees || [])])) };
}
// How a result leans on the five elements. Each trait's points are shared out by def.core.elements (kept in the skin
// file, where it can be read); a code quiz counts each letter of the code one time.
export function qzElements(def, result) {
  const map = def.core && def.core.elements;
  if (!map || !result || !result.ready) return null;
  const el = {};
  for (const e of QZ_ELEMENTS) el[e] = 0;
  const add = (t, w) => { for (const e of Object.keys(map[t] || {})) if (e in el) el[e] += w * map[t][e]; };
  if (result.axes) result.axes.forEach(a => add(a.pole, 1));
  else for (const t of Object.keys(result.scores)) add(t, Math.max(0, result.scores[t]));
  const best = Math.max(...Object.values(el)), lead = QZ_ELEMENTS.filter(e => el[e] === best);
  return { scores: el, lead: best > 0 ? lead : [] };
}
// What a result changes: nothing without a tap. `current` is the element the person has now (or null).
// same: the element stays. ask: the card offers "keep or switch" and waits for the tap.
export function qzFeed(def, result, current = null) {
  const E = qzElements(def, result), card = qzCard(def, result);
  const sheet = card && def.core && def.core.sheet ? { label: def.core.sheet, value: card.title } : null;
  const lean = !E || !E.lead.length ? null : current && E.lead.includes(current) ? current : E.lead.length === 1 ? E.lead[0] : null;
  const stays = current ? `Your element stays ${current}.` : 'This does not set an element.';
  if (!lean || lean === current) return { lean, current, same: true, ask: false, line: stays, elements: E ? E.scores : null, sheet };
  return { lean, current, same: false, ask: true, line: current ? `This leans you toward ${lean}: keep ${current} or switch?` : `This leans you toward ${lean}. Make ${lean} your element?`,
    keep: current, to: lean, elements: E.scores, sheet };
}
// The most points each trait could get on this path: for each asked question, its best answer for that trait (a
// statement: the top of the scale toward, the bottom away). A statement quiz ('average') is already 0 to 100.
function qzMax(def, answers = {}) {
  const max = {}, sc = qzScaleOf(def), lo = sc.length ? Math.min(...sc) : 0, hi = sc.length ? Math.max(...sc) : 0;
  for (const t of def.traits || []) max[t.id] = 0;
  for (const q of qzAsked(def, answers)) {
    if (q.options) { for (const t of Object.keys(max)) max[t] += Math.max(0, ...q.options.map(o => (o.add || {})[t] || 0)); }
    else if (def.scoring !== 'average') { if (q.toward in max) max[q.toward] += Math.max(0, hi); if (q.away in max) max[q.away] += Math.max(0, -lo); }
  }
  return max;
}
// A percent for each trait, on its own (a person can be high on two at once): its points as a share of the most it
// could get on the path taken. A statement quiz gives each trait its average, 0 to 100. Answers only: scores from
// outside are not in a percent. group: only the traits of one group. Returns [{ id, name, score, max, pct }].
export function qzBars(def, answers = {}, group = null) {
  const S = qzScore(def, answers), average = def.scoring === 'average', max = qzMax(def, answers);
  return (def.traits || []).filter(t => !group || t.group === group)
    .filter(t => (average ? S.traits.some(x => x.id === t.id) : max[t.id] > 0))
    .map(t => ({ id: t.id, name: t.name, score: S.scores[t.id], max: average ? 100 : max[t.id], pct: average ? S.scores[t.id] : Math.round(Math.max(0, S.scores[t.id]) / max[t.id] * 100) }));
}
// Each preference spectrum of a skin (def.spectrums: [{ id, name, trait, left, right }]): where the person sits
// between two words, 0 (all left) to 100 (all right), from the percent of its trait. pos is null while unanswered.
export function qzSpectrums(def, answers = {}) {
  const B = qzBars(def, answers);
  return (def.spectrums || []).map(sp => {
    const b = B.find(x => x.id === sp.trait), pos = b ? b.pct : null;
    const lean = pos == null ? null : pos < 40 ? 'left' : pos > 60 ? 'right' : 'middle';
    return { id: sp.id, name: sp.name, left: sp.left, right: sp.right, pos, lean, word: lean === 'left' ? sp.left : lean === 'right' ? sp.right : lean ? 'In the middle' : null };
  });
}
// Quantum collapse's meter: the paths still possible are the product of the choices not yet made (every question,
// before the first answer). share: how much of the uncertainty is gone, 0 to 1, on a log scale.
export function qzPaths(def, answers = {}) {
  const n = q => (q.options ? q.options.length : (def.scale || []).length) || 1, F = qzFlow(def, answers);
  const total = (def.questions || []).reduce((t, q) => t * n(q), 1), left = F.done ? 1 : F.open.reduce((t, q) => t * n(q), 1);
  return { total, left, share: total > 1 ? 1 - Math.log(left) / Math.log(total) : 1 };
}
// How many taps a quiz takes: the fewest and the most, by its `when` conditions.
export function qzTaps(def) {
  const qs = def.questions || [];
  return { min: qs.filter(q => !q.when).length, max: qs.length };
}
// What is not right in a definition, as a list of plain lines (empty when it is sound). Run it on every new skin.
export function qzCheck(def) {
  const bad = [], traits = new Set((def.traits || []).map(t => t.id)), by = (def.result && def.result.by) || 'top', dash = String.fromCharCode(0x2014);
  if (!def.id || !def.name) bad.push('needs an id and a name');
  if (def.soon) return bad;
  if (!def.note) bad.push('needs a note (the line that says it is a game lens)');
  const qids = new Set();
  for (const q of def.questions || []) {
    if (qids.has(q.id)) bad.push(`question ${q.id} is there twice`);
    qids.add(q.id);
    if (q.options) {
      if (q.options.length < 2) bad.push(`question ${q.id} needs two or more answers`);
      for (const o of q.options) for (const t of Object.keys(o.add || {})) if (!traits.has(t)) bad.push(`question ${q.id}, answer ${o.id}: no trait ${t}`);
    } else if (def.scoring === 'average') { if (!traits.has(q.trait)) bad.push(`statement ${q.id}: no trait ${q.trait}`); }
    else if (!traits.has(q.toward) || !traits.has(q.away)) bad.push(`statement ${q.id}: no trait ${q.toward} or ${q.away}`);
    if (!q.options && !(def.scale || []).length) bad.push(`statement ${q.id} needs def.scale`);
    for (const k of Object.keys(q.when || {})) if (k !== 'any' && !(def.questions || []).some(x => x.id === k)) bad.push(`question ${q.id}: its when names ${k}, which is not a question`);
  }
  const card = (id, c) => {
    if (!c.title) bad.push(`card ${id}: no title`);
    if (!(c.lines && c.lines.length >= 2 && c.lines.length <= 3)) bad.push(`card ${id}: two or three lines`);
    if (!c.light) bad.push(`card ${id}: no light side`);
    if (!(c.next && c.next.label && (c.next.skill || c.next.reading || c.next.tree))) bad.push(`card ${id}: one next step with a skill, a reading or a skill tree`);
  };
  const grp = def.result && def.result.group, carded = grp ? (def.traits || []).filter(t => t.group === grp).map(t => t.id) : [...traits];
  if (grp && !(def.groups || []).some(g => g.id === grp)) bad.push(`result.group ${grp} is not a group`);
  if (by === 'top') for (const t of carded) { if ((def.cards || {})[t]) card(t, def.cards[t]); else bad.push(`trait ${t} has no card`); }
  for (const sp of def.spectrums || []) if (!traits.has(sp.trait) || !sp.left || !sp.right) bad.push(`spectrum ${sp.id}: needs a trait, a left word and a right word`);
  if (by === 'rules') for (const r of def.result.rules || []) { if ((def.cards || {})[r.result]) card(r.result, def.cards[r.result]); else bad.push(`rule result ${r.result} has no card`); }
  if (by === 'axes') for (const ax of def.result.axes || []) for (const p of ax.poles) {
    if (!traits.has(p)) bad.push(`axis ${ax.id}: no trait ${p}`);
    if (def.poles && !def.poles[p]) bad.push(`pole ${p} has no words`);
  }
  for (const t of Object.keys((def.core && def.core.elements) || {})) {
    if (!traits.has(t)) bad.push(`core.elements: no trait ${t}`);
    for (const e of Object.keys(def.core.elements[t])) if (!QZ_ELEMENTS.includes(e)) bad.push(`core.elements.${t}: ${e} is not one of the five elements`);
  }
  if (!(def.core && def.core.sheet && def.core.how)) bad.push('core needs sheet (the name of its line on the character sheet) and how (the mapping in plain words)');
  if (JSON.stringify(def).includes(dash)) bad.push('an em dash in the words');
  return bad;
}
