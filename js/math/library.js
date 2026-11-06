// SPDX-License-Identifier: AGPL-3.0-only
// The library's first slice (batch 26, M9K; docs/engines/library.md): at each FOO step, three skills to learn and one
// thing to unlearn. Pure: the skill files come in as arguments (js/library.js loads them in the browser; tests read
// them from disk). The words and maps are js/registry/library.js.
//   Candidates   every skill in skills.json and app-skills.json whose tags.foo is the step (an app skill whose
//                appliesWhen does not fit the household is left out).
//   Order        the client's tilt (profile.identity.tilt) when there is one: the skill's tree's place in it, one skill
//                per tree first so the three are three different things; then the band (foundation first), the
//                leverage tier (S first), the level in its tree, the file order.
//   Done         by the data (an app skill whose proof names a household fact SLAM can read), or by a tap
//                (profile.library[id] = { done: true, by, on }). Done skills leave the three and fold into a count.
//   Unlearn      the first entry in unlearn.json that shows at the step, with its status against the order.
import { metrics } from './metrics.js';
import { foo } from './foo.js';
import { layersOf } from './layers.js';
import { gatesOf, visible } from '../gates.js';
import { ORDER } from '../registry/foo.js';
import { RULES } from '../registry/assumptions.js';
import { PROOF_PREFIX, PROOF_FACTS, TILT_TREE_BY_AREA, TILT_TREE_BY_APP_TREE, SITUATIONS, LEVERAGE_ORDER, TWINS } from '../registry/library.js';

const stepIndex = id => ORDER.indexOf(String(id));

// The household fact an app skill's proof names ("leveled when the household shows it: marginalRate"), or null.
export function proofField(skill) {
  const p = String(skill?.proof ?? '');
  return p.startsWith(PROOF_PREFIX) ? p.slice(PROOF_PREFIX.length).trim() || null : null;
}

// Each proof field, read from SLAM's numbers. true: SLAM sees it; false: not yet. Only fields in PROOF_FACTS.
const FACT_READS = {
  grossAnnualIncome: ({ x }) => x.income.length > 0 && x.grossAnnual != null && x.grossAnnual > 0,
  capturingFullMatch: ({ x, f }) => (x.link.incomeTiers || []).length > 0 && !!f.steps.find(s => s.id === '2')?.done,
  totalDebt: ({ x, doc }) => (x.debts.length ? x.debts.every(d => d.balance != null && d.apr != null && !d.aprGuess) : doc.profile?.areas?.debt === false),
  cashSavings: ({ L }) => !!L.littleFull,
  marginalRate: ({ x, doc }) => x.grossAnnual != null && x.grossAnnual > 0 && doc.profile?.filingStatus != null,
  monthlyExpenses: ({ x }) => x.spendingSource === 'lines' && x.spending != null,
  oopMax: ({ live }) => live.some(r => r.kind === 'coverage' && r.type === 'Health' && r.values?.oopMax != null),
  termLife: ({ live }) => live.some(r => r.kind === 'coverage' && r.type === 'Life' && r.values?.have === 'Have it' && (r.values?.coverage ?? 0) > 0),
  retireAge: ({ doc }) => doc.assumptions?.fiAge != null || doc.assumptions?.retireAge != null,
  rebalanceBand: ({ live }) => live.some(r => r.kind === 'account' && r.values?.targetOn === true),
};
// The facts the household shows, one boolean per mapped proof field.
export function libraryFacts(doc, ref, { now = new Date(), m = null, f = null } = {}) {
  const mm = m ?? metrics(doc, ref, { now });
  const ff = f ?? foo(doc, ref, { now });
  const c = { doc, x: mm.inputs, m: mm, f: ff, L: layersOf(doc, ref, now), live: visible(doc.records || [], gatesOf(doc.profile, doc.client), ref) };
  return Object.fromEntries(Object.keys(PROOF_FACTS).map(k => [k, !!FACT_READS[k]?.(c)]));
}
export const mappedFields = () => Object.keys(FACT_READS);

// Does an app skill's appliesWhen fit the household? Only the situation test is used by the 40.
export function appliesTo(skill, doc) {
  const sit = SITUATIONS[doc?.profile?.workSituation] ?? null;
  return (skill.appliesWhen || []).every(w => (w.field === 'situation' && w.op === 'in' ? sit == null || w.value.includes(sit) : true));
}
// The tree a skill counts as in the tilt: its own for the 25, its area's library tree for an app skill.
export const tiltTree = skill => (skill.tags?.kind === 'learn' ? skill.tree : skill.twinTree ?? TILT_TREE_BY_APP_TREE[skill.tree] ?? TILT_TREE_BY_AREA[skill.tags?.area] ?? skill.tree);

// One list from both sets: each app skill with a twin (TWINS) stands in for it and borrows its words, tier and tree.
export function mergeTwins(skills = [], appSkills = []) {
  const byId = new Map(skills.map(s => [s.id, s]));
  const twinIds = new Set(Object.values(TWINS));
  const app = appSkills.map(a => { const t = byId.get(TWINS[a.id]); return t ? { ...a, description: a.description ?? t.description, does: a.does ?? t.does, fits: a.fits ?? t.fits, leverage: a.leverage ?? t.leverage, twin: t.id, twinTree: t.tree } : a; });
  return [...skills.filter(s => !twinIds.has(s.id)), ...app];
}

// How a skill is done: by the data, by a tap, or not yet.
export function doneOf(skill, { facts = {}, progress = {} } = {}) {
  const field = proofField(skill);
  if (field && PROOF_FACTS[field]) return facts[field] ? { done: true, by: 'data', field } : { done: false, by: null, field, self: true };
  const p = progress[skill.id];
  return p?.done ? { done: true, by: p.by ?? 'coach', on: p.on ?? null } : { done: false, by: null };
}

// The candidates at a step, in order (see the head of the file). With a tilt: the tilt tree's place, and one skill per
// tilt tree first so the three are three different things. Then, with or without one: the band (foundation first),
// the leverage tier (S first), the level in its tree, the file order.
const BAND = { foundation: 0, optimization: 1, advanced: 2, expert: 3, endgame: 4 };
export function orderSkills(list, { tilt = [] } = {}) {
  const rank = new Map((tilt || []).map((t, i) => [t, i]));
  const tiltRank = s => (rank.size ? rank.get(tiltTree(s)) ?? rank.size : 0);
  const key = (s, i) => [tiltRank(s), BAND[s.tier] ?? 5, LEVERAGE_ORDER[s.leverage] ?? LEVERAGE_ORDER.B, s.level ?? 99, i];
  const cmp = (a, b) => { for (let k = 0; k < a.k.length; k++) if (a.k[k] !== b.k[k]) return a.k[k] - b.k[k]; return 0; };
  const sorted = list.map((s, i) => ({ s, k: key(s, i) })).sort(cmp).map(x => x.s);
  if (!rank.size) return sorted;
  const seen = new Set(), first = [], rest = [];
  for (const s of sorted) { const t = tiltTree(s); if (seen.has(t)) rest.push(s); else { seen.add(t); first.push(s); } }
  return [...first, ...rest];
}

// The unlearn line at a step: the first entry that shows there, with its status against the FOO order.
export function unlearnFor(step, entries = []) {
  const e = entries.find(x => (x.showAt || []).includes(String(step)));
  if (!e) return null;
  const at = stepIndex(step), idx = (e.rightAt || []).map(stepIndex).filter(i => i >= 0);
  const status = idx.length && idx.every(i => i > at) ? 'notYet' : idx.length && idx.every(i => i < at) ? 'past' : 'other';
  const fitsAt = status === 'notYet' ? Math.min(...idx) : status === 'past' ? Math.max(...idx) : null;
  return { ...e, status, fitsAt: fitsAt == null ? null : ORDER[fitsAt] };
}

// One step's block: the three to learn, the done ones (folded), the one to unlearn.
export function learnFor(step, { skills = [], appSkills = [], unlearn = [], tilt = [], facts = {}, progress = {}, doc = null, shown = RULES.learnShown } = {}) {
  const here = mergeTwins(skills, appSkills).filter(s => String(s.tags?.foo) === String(step) && (!doc || appliesTo(s, doc)));
  const withDone = orderSkills(here, { tilt }).map(s => ({ skill: s, ...doneOf(s, { facts, progress }) }));
  const open = withDone.filter(x => !x.done);
  return { step: String(step), learn: open.slice(0, shown), more: Math.max(0, open.length - shown), done: withDone.filter(x => x.done), total: withDone.length, unlearn: unlearnFor(step, unlearn), tilted: (tilt || []).length > 0 };
}

// Every step at once, for Plan › FOO and Home. lib: { skills, appSkills, unlearn } (the three files' arrays).
export function libraryOf(doc, ref, lib, { now = new Date(), flags = [], m = null, f = null } = {}) {
  if (!lib?.skills) return null;
  const ff = f ?? foo(doc, ref, { now, flags });
  const facts = libraryFacts(doc, ref, { now, m, f: ff });
  const tilt = doc.profile?.identity?.tilt || [];
  const progress = doc.profile?.library || {};
  const steps = Object.fromEntries(ORDER.map(id => [id, learnFor(id, { skills: lib.skills, appSkills: lib.appSkills || [], unlearn: lib.unlearn || [], tilt, facts, progress, doc })]));
  const here = ff.here;
  return { steps, here, facts, tilt, next: here ? steps[here]?.learn[0] ?? null : null };
}

// A one-tap Done (or taking it back), kept in the client file. Each tap is one undo step.
export function setSkillDone(store, id, done, { now = new Date() } = {}) {
  store.setIn('profile', ['library', id], done ? { done: true, by: store.who === 'Client' ? 'client' : 'coach', on: now.toISOString().slice(0, 10) } : undefined, done ? 'Skill done' : 'Skill not done yet');
}
