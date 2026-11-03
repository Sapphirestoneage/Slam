// SPDX-License-Identifier: AGPL-3.0-only
// Onboarding timer (missed ideas M10), for usability testing. Builder only: shown behind the gear, saved in
// doc.session.timer so it rides along in the export. Each mark is set once, the first time it becomes true.
// Pure: no DOM.
import { profileCompletion } from './profile-completion.js';

export const TIMER_MARKS = [
  ['profileStarted', 'Profile started'], ['firstMetric', 'First computed number shown'],
  ['coreDone', 'Core profile complete'], ['fullDone', 'Full profile complete'],
];
const answered = v => v !== null && v !== undefined && v !== '' && !(typeof v === 'object' && !Object.keys(v).length);
const SKIP = new Set(['later', 'none', 'laterDue']);

// The timer after this change, or null when nothing new happened. metricShown: a headline number is on screen.
export function timerAfter(doc, { metricShown = false, now = new Date() } = {}) {
  const t = { ...(doc.session?.timer || {}) };
  const at = now.toISOString();
  const before = JSON.stringify(t);
  const p = doc.profile || {};
  if (!t.profileStarted && Object.entries(p).some(([k, v]) => !SKIP.has(k) && answered(v))) t.profileStarted = at;
  if (!t.firstMetric && metricShown) t.firstMetric = at;
  const c = profileCompletion(doc);
  if (!t.coreDone && c.core.of && c.core.done === c.core.of) t.coreDone = at;
  if (!t.fullDone && c.full.of && c.full.done === c.full.of) t.fullDone = at;
  if (t.profileStarted) {
    const start = Date.parse(t.profileStarted);
    t.seconds = Object.fromEntries(TIMER_MARKS.slice(1).filter(([k]) => t[k]).map(([k]) => [k, Math.round((Date.parse(t[k]) - start) / 1000)]));
  }
  return JSON.stringify(t) === before ? null : t;
}

export function duration(sec) {
  if (sec == null) return '–';
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`;
}
