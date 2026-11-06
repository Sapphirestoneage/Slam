// SPDX-License-Identifier: AGPL-3.0-only
// Who they are with money (batch 25, M95; Phase 4). Three short tap checks that change which skills and which words
// SLAM leads with; never a gate, never a verdict. Pure: no DOM. The wording is js/registry/identity.js.
//   The FI Address   four characters read mostly from what SLAM already has (work situation, what is invested, cash
//                    and debt, Why now and the goal chips), plus at most four taps: familiarity, route and target,
//                    state and feeling, the ceiling; a motion flag when something is changing; lowercase modifiers.
//   The letters      12 statements (Agree 1, Neutral 0, Disagree -1) on 4 axes, 3 each, scored -3 to 3 toward the
//                    axis's first pole. 0 is a tie: it leans on what SLAM already knows (the tie rules below).
//   The weather      6 taps (0 to 2 each, two of them turned around), scaled to a score out of 12: Clear, Fair,
//                    Overcast or Storm. Kept per session and per person (doc.session.weather[n]).
//   Couples          each partner answers the letters and the weather; one concrete ask per partner.
//   Where it shows   the tilt (all 25 skill tree ids, ranked) and the one-pager's lead line.
// Stored: doc.profile.identity = { address: { feel, earnMore, spendLess, motion, mods }, letters: { Me: [12], Partner: [12] },
// tilt: [tree ids], later } and doc.session.weather[n] = { at, Me: [6], Partner: [6] }.
import { metrics } from './metrics.js';
import { MODES, modeOf, personLabels } from '../registry/couples.js';
import { chipsOf } from '../whynow.js';
import {
  FAMILIARITY, ROUTE, STATE, CEILING, MOTION, MODIFIERS, ADDRESS_QUESTIONS, ROUTE_LINES, AXES, STATEMENTS, TYPES, POLE_TREES, TREES, LEADS, ASKS,
  WEATHER_QUESTIONS, WEATHER_LEVELS, WEATHER_MIN,
} from '../registry/identity.js';

export const identityOn = doc => doc?.settings?.phase4 === true;
const ident = doc => doc?.profile?.identity || {};
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
export const isCouple = doc => !!MODES[modeOf(doc?.profile)]?.couple || doc?.client?.couple === true;
export const peopleOf = doc => (isCouple(doc) ? ['Me', 'Partner'] : ['Me']);

// Is something changing? The work situation, a Why now chip, or a Life Transitions plan says so.
const TRANSITION_CHIPS = ['Job change or layoff', 'Big life change (engaged, married, baby, divorce, move)'];
export function inTransition(doc) {
  const p = doc?.profile || {};
  return p.workSituation === 'Between jobs' || chipsOf(p, 'whyNow').some(c => TRANSITION_CHIPS.includes(c)) || !!doc?.program?.transition?.template;
}

// What the address reads from the household. m: the metrics (js/math/metrics.js).
export function addressFacts(doc, m) {
  const x = m?.inputs || {};
  const p = doc?.profile || {};
  const said = [...chipsOf(p, 'whyNow'), ...chipsOf(p, 'goalWords')];
  const debts = (m?.debts || []).filter(d => (d.balance ?? 0) > 0);
  const heavy = debts.filter(d => d.heavy);
  return {
    invested: num(x.invested), cash: num(x.cash), spending: num(x.spending), runway: num(m?.runwayMonths?.value),
    heavyDebt: heavy.reduce((s, d) => s + d.balance, 0), hasHeavy: heavy.length > 0, anyDebtKnown: debts.length > 0,
    work: p.workSituation ?? null, selfEmployed: (x.income || []).some(i => i.r?.type === 'Self-employed'),
    fiNamed: said.some(c => c === 'Want FI or to retire early' || c === 'FI or retire early') || (doc?.records || []).some(r => r.kind === 'milestone' && /FI/.test(r.type || '')),
    investGoal: said.some(c => c === 'Start investing' || c === 'Behind on saving or retirement'),
    equity: p.equityPay === true,
  };
}

// Position 1. A year of spending invested is fluent; any investing, or an FI or investing goal, is learning.
export function familiarityOf(f) {
  if (f.invested != null && f.spending && f.invested >= f.spending * 12) return 'F';
  if ((f.invested ?? 0) > 0 || f.fiNamed || f.investGoal) return 'L';
  return 'N';
}
// The state. Below zero: heavy debt and either more of it than cash and investments, or under a month of runway.
// Ahead: no heavy debt and 3 months of runway or a year of spending invested. Building: everything between.
export function stateOf(f) {
  if (f.cash == null && f.invested == null && !f.anyDebtKnown) return null;
  if (f.hasHeavy && (f.heavyDebt > (f.cash ?? 0) + (f.invested ?? 0) || (f.runway ?? 0) < 1)) return 'under';
  if (!f.hasHeavy && ((f.runway ?? 0) >= 3 || (f.invested != null && f.spending && f.invested >= f.spending * 12))) return 'ahead';
  return 'building';
}
// Position 2. The route from the work situation; the target is work optional when they named FI, or when they are
// already ahead (the natural next step), else steady ground.
export function routeOf(f, state) {
  const w = f.work;
  if (w === 'Between jobs' || w === 'Student') return 'P';
  if (w === 'Retired') return 'R';
  const business = w === 'Self-employed' || w === 'Mixed' || (!w && f.selfEmployed);
  const optional = f.fiNamed || state === 'ahead';
  return business ? (optional ? 'O' : 'B') : (optional ? 'W' : 'J');
}
// The feeling: the tap, else the latest Confidence (1 to 10: 7 or more calm, 5 or 6 uneasy, 4 or less stressed).
export function feelOf(address, confidence = null) {
  if (address?.feel) return { feel: address.feel, from: 'tap' };
  const c = num(confidence);
  if (c == null) return { feel: null, from: null };
  return { feel: c >= 7 ? 'calm' : c >= 5 ? 'uneasy' : 'stressed', from: 'confidence' };
}
export function stateChar(state, feel) {
  if (!state || !feel) return null;
  const calm = feel === 'calm';
  return Object.entries(STATE).find(([, v]) => v.state === state && v.calm === calm)[0];
}
export function ceilingChar(earnMore, spendLess) {
  if (earnMore == null || spendLess == null) return null;
  return earnMore && spendLess ? '↕' : earnMore ? '↑' : spendLess ? '↓' : '=';
}

// The whole FI Address. confidence: this client's latest Confidence (program.js confidenceOf), to read the feeling.
export function addressOf(doc, m, { confidence = null } = {}) {
  const a = ident(doc).address || {};
  const f = addressFacts(doc, m);
  const state = stateOf(f);
  const fam = familiarityOf(f), route = routeOf(f, state);
  const fl = feelOf(a, confidence);
  const st = stateChar(state, fl.feel), ce = ceilingChar(a.earnMore ?? null, a.spendLess ?? null);
  const moving = inTransition(doc);
  const motion = moving && MOTION[a.motion] ? a.motion : null;
  const mods = MODIFIERS.filter(x => (a.mods || []).includes(x.id) || (x.id === 'q' && f.equity)).map(x => x.id);
  const asks = ADDRESS_QUESTIONS.filter(q => (q.only !== 'transition' || moving) && (q.key === 'feel' ? fl.from !== 'tap' : a[q.key] == null)).map(q => q.key);
  const chars = [
    { pos: 1, ch: fam, word: FAMILIARITY[fam].word, from: `From what is invested and the goals: ${FAMILIARITY[fam].from}` },
    { pos: 2, ch: route, word: ROUTE[route].word, from: `From the work situation${f.work ? ` (${f.work})` : ''} and ${f.fiNamed ? 'the FI goal they named' : state === 'ahead' ? 'being ahead already' : 'no FI goal named yet'}` },
    { pos: 3, ch: st, word: st ? STATE[st].word : state ? 'Needs: how money feels' : 'Needs: cash, investments or debts', from: st ? `From cash, investments and heavy debt, and the feeling (${fl.from === 'tap' ? 'their tap' : 'their Confidence'})` : 'One tap below' },
    { pos: 4, ch: ce, word: ce ? CEILING[ce].word : 'Needs: two taps', from: 'Their own two taps' },
  ];
  const done = chars.every(c => c.ch) && (!moving || !!motion);
  const code = chars.map(c => c.ch ?? '?').join('') + (motion ?? '');
  const lines = [];
  if (route === 'P') lines.push(ROUTE_LINES.paused); else if (route === 'R') lines.push(ROUTE_LINES.retired);
  if (route === 'B' || route === 'O') lines.push(ROUTE_LINES.business);
  if (state === 'under') lines.push(ROUTE_LINES.under); else if (route === 'P' || route === 'R') { /* the paused or retired line says it */ } else if (state === 'building') lines.push(ROUTE_LINES.building);
  else if (state === 'ahead') lines.push(ROUTE[route].target === 'optional' ? ROUTE_LINES.aheadOptional : ROUTE_LINES.aheadSteady);
  if (state && state !== 'ahead' && ROUTE[route].target === 'optional') lines.push(ROUTE_LINES.optionalLater);
  if (ce) lines.push(CEILING[ce].lever);
  return {
    code, full: mods.length ? `${code} ${mods.join('')}` : code, chars, motion, motionWord: motion ? MOTION[motion].word : null, mods, moving, asks, done,
    state, feel: fl.feel, feelFrom: fl.from, target: ROUTE[route].target,
    meaning: [...chars.filter(c => c.ch).map(c => c.word), ...(motion ? [MOTION[motion].word] : []), ...mods.map(id => MODIFIERS.find(x => x.id === id).word)].join(' · '),
    route: lines.join(' '),
  };
}

// ---------- The letters ----------
// answers: 12 values (1, 0, -1, or null for not answered), in STATEMENTS order.
export function axisScores(answers = []) {
  return AXES.map(ax => {
    const items = STATEMENTS.map((s, i) => ({ s, v: answers[i] })).filter(o => o.s.axis === ax.id);
    const answered = items.filter(o => o.v === 1 || o.v === 0 || o.v === -1);
    const score = answered.reduce((t, o) => t + o.v * (o.s.toward === ax.poles[0].id ? 1 : -1), 0);
    return { id: ax.id, score, answered: answered.length, of: items.length };
  });
}
// Tie rules: a 0 leans on what SLAM already knows. Earner or Keeper by the ceiling taps (only earn more: Earner);
// Paper or Operator: an own business is Operator; Guardian or Venturer: below zero or an Overcast or Storm weather is
// Guardian; Exiter or Savorer: aiming at work optional is Exiter. With nothing to lean on, the second pole.
export function tieBreaks({ address = null, weather = null } = {}) {
  const a = address || {};
  const ce = a.chars?.[3]?.ch ?? null;
  const route = a.chars?.[1]?.ch ?? null;
  return {
    ek: ce === '↑' ? 'E' : 'K',
    po: route === 'B' || route === 'O' ? 'O' : 'P',
    gv: a.state === 'under' || weather === 'Overcast' || weather === 'Storm' ? 'G' : (a.state ? 'V' : 'G'),
    xs: a.target === 'optional' ? 'X' : 'S',
  };
}
// The four letters once every axis has at least 2 of its 3 answers (a blank counts as Neutral).
export function lettersOf(answers = [], ties = tieBreaks()) {
  const scores = axisScores(answers);
  const count = answers.filter(v => v === 1 || v === 0 || v === -1).length;
  const ready = scores.every(s => s.answered >= 2);
  const axes = scores.map((s, i) => {
    const ax = AXES[i];
    const pole = s.score > 0 ? ax.poles[0].id : s.score < 0 ? ax.poles[1].id : ties[ax.id];
    return { ...s, pole, word: ax.poles.find(p => p.id === pole).word, light: Math.abs(s.score) <= 1, tie: s.score === 0 };
  });
  const type = ready ? axes.map(a => a.pole).join('') : null;
  return { type, ready, count, of: STATEMENTS.length, axes, info: type ? TYPES[type] : null };
}

// ---------- The weather ----------
// answers: 6 values (0, 1, 2, or null), in WEATHER_QUESTIONS order. Scaled to 12 when some are skipped.
export function weatherScore(answers = []) {
  const got = WEATHER_QUESTIONS.map((q, i) => ({ q, v: answers[i] })).filter(o => o.v === 0 || o.v === 1 || o.v === 2);
  const raw = got.reduce((t, o) => t + (o.q.up ? 2 - o.v : o.v), 0);
  if (got.length < WEATHER_MIN) return { answered: got.length, of: WEATHER_QUESTIONS.length, score: null, level: null };
  const score = Math.round((raw * WEATHER_QUESTIONS.length) / got.length);
  return { answered: got.length, of: WEATHER_QUESTIONS.length, score, raw, level: WEATHER_LEVELS.find(l => score <= l.upTo).id };
}
// Every session's weather, oldest first: { n, at, Me, Partner } with each person's level (or null).
export function weatherHistory(doc) {
  return Object.entries(doc?.session?.weather || {}).map(([k, v]) => ({ n: Number(k), at: v?.at ?? null, Me: weatherScore(v?.Me || []).level, Partner: weatherScore(v?.Partner || []).level }))
    .filter(e => e.Me || e.Partner).sort((a, b) => a.n - b.n);
}
// This session's answers for one person, and the latest level from any session.
export function weatherOf(doc, n, person = 'Me') {
  const answers = doc?.session?.weather?.[String(n)]?.[person] || [];
  const now = weatherScore(answers);
  const last = weatherHistory(doc).filter(e => e[person]).at(-1) ?? null;
  return { ...now, answers, n, latest: now.level ?? last?.[person] ?? null, latestN: now.level ? n : last?.n ?? null };
}

// ---------- Where it shows ----------
// The tilt: all 25 trees ranked. Each type's own three first (a couple's interleaved: the client's first, then the
// partner's, in turn), then the rest by how many of the letters lean toward them, then in library order.
export function tiltOf(types = []) {
  const list = types.filter(t => TYPES[t]);
  if (!list.length) return [];
  const out = [];
  for (let i = 0; i < 3; i++) for (const t of list) if (!out.includes(TYPES[t].trees[i])) out.push(TYPES[t].trees[i]);
  const weight = id => list.reduce((s, t) => s + [...t].reduce((u, l) => u + (POLE_TREES[l]?.includes(id) ? 1 : 0), 0), 0);
  const rest = TREES.map(([id], i) => ({ id, i, w: weight(id) })).filter(x => !out.includes(x.id)).sort((a, b) => b.w - a.w || a.i - b.i).map(x => x.id);
  return [...out, ...rest];
}
export const treeName = id => TREES.find(t => t[0] === id)?.[1] ?? id;
// The one-pager's lead line: by what it is for (X or S) and how they hold risk (G or V); a couple that differs is both.
export function leadOf(types = []) {
  const list = types.filter(t => TYPES[t]);
  if (!list.length) return null;
  const pick = i => (new Set(list.map(t => t[i])).size > 1 ? 'both' : list[0][i]);
  return LEADS[`${pick(3)}:${pick(2)}`];
}
// Couples: the axis where the two differ most (by score; ties go in axis order), and each partner's ask for their pole.
// The same type both ways: the axis where they lean hardest together, and each gets that pole's ask.
export function asksOf(a, b) {
  if (!a?.type || !b?.type) return null;
  const gaps = a.axes.map((x, i) => ({ i, gap: Math.abs(x.score - b.axes[i].score), differ: x.pole !== b.axes[i].pole, both: Math.abs(x.score + b.axes[i].score) }));
  const differ = gaps.filter(g => g.differ).sort((p, q) => q.gap - p.gap || p.i - q.i);
  const g = differ[0] ?? [...gaps].sort((p, q) => q.both - p.both || p.i - q.i)[0];
  return { axis: AXES[g.i].id, axisName: AXES[g.i].name, differ: !!differ.length, Me: ASKS[a.axes[g.i].pole], Partner: ASKS[b.axes[g.i].pole] };
}

// Everything the screens show. n: the session being prepared or run (program.js sessionNo); confidence: { Me, Partner }.
export function identityOf(doc, ref, { now = new Date(), m = null, n = 1, confidence = {} } = {}) {
  const mm = m ?? metrics(doc, ref, { now });
  const id = ident(doc);
  const address = addressOf(doc, mm, { confidence: confidence.Me ?? null });
  const names = personLabels(doc);
  const people = peopleOf(doc).map(person => {
    const weather = weatherOf(doc, n, person);
    const letters = lettersOf(id.letters?.[person] || [], tieBreaks({ address, weather: weather.latest }));
    return { person, name: names[person], letters, weather };
  });
  const types = people.map(p => p.letters.type).filter(Boolean);
  const couple = people.length > 1;
  const asks = couple ? asksOf(people[0].letters, people[1].letters) : null;
  const done = address.done && people.every(p => p.letters.ready && p.weather.level);
  const a = id.address || {};
  const taps = [a.feel, a.earnMore, a.spendLess, address.moving ? a.motion : null].filter(v => v != null).length + people.reduce((s, p) => s + p.letters.count + p.weather.answered, 0);
  return { on: identityOn(doc), address, people, couple, asks, types, tilt: tiltOf(types), lead: leadOf(types), done, later: id.later === true, taps, started: taps > 0 };
}
// The one line for the one-pager: each person's letters and type name, then the lead. Null until a type is in.
export function onePagerLine(I) {
  if (!I?.types.length) return null;
  const who = I.people.filter(p => p.letters.type).map(p => `${I.couple ? `${p.name} ` : ''}${p.letters.type}, ${p.letters.info.name}`).join('; ');
  return `${who}. ${I.lead}`;
}

// ---------- Saving the taps (each tap is one undo step; the tilt is kept with the letters) ----------
const put = (store, key, value, label) => store.setIn('profile', ['identity', key], value, label);
export function setAddress(store, key, value) { put(store, 'address', { ...(ident(store.doc).address || {}), [key]: value ?? undefined }, 'FI Address'); }
export function toggleModifier(store, idm) {
  const mods = ident(store.doc).address?.mods || [];
  setAddress(store, 'mods', mods.includes(idm) ? mods.filter(x => x !== idm) : [...mods, idm]);
}
export function setLetter(store, ref, person, i, value, { now = new Date(), n = 1 } = {}) {
  store.transaction('Personality letters', () => {
    const all = ident(store.doc).letters || {};
    const mine = Array.from({ length: STATEMENTS.length }, (_, k) => (all[person] || [])[k] ?? null);
    mine[i] = value ?? null;
    put(store, 'letters', { ...all, [person]: mine }, 'Personality letters');
    put(store, 'tilt', identityOf(store.doc, ref, { now, n }).tilt, 'Personality letters');
  });
}
export function setWeather(store, n, person, i, value, { now = new Date() } = {}) {
  const cur = store.doc.session?.weather?.[String(n)] || {};
  const mine = Array.from({ length: WEATHER_QUESTIONS.length }, (_, k) => (cur[person] || [])[k] ?? null);
  mine[i] = value ?? null;
  store.setIn('session', ['weather', String(n)], { ...cur, at: now.toISOString(), [person]: mine }, 'Money weather');
}
export function setLater(store, on = true) { put(store, 'later', on ? true : undefined, 'Do this later'); }
