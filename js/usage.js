// SPDX-License-Identifier: AGPL-3.0-only
// The usage log (batch 14, item 9): a small local record of how a session went, kept in the client file
// (doc.usage, registered in js/registry/fields.js NOT_IN_SHEET) so SLAM can be made easier with real numbers. It holds
// counts and words only, never a dollar amount: time and clicks per screen, back presses, undos, Find searches that
// found nothing (digits taken out), Show me dead ends, the Walk me through steps, and the coach's ease answer at End
// session. Coach tools › Data exports it as CSV. It is not an undo step and never changes a number. Pure: no DOM.
export const USAGE_MAX = 3000; // the oldest events drop off past this
export const USAGE_EVENTS = ['screen', 'back', 'undo', 'findMiss', 'find', 'deadEnd', 'walk', 'start', 'ease'];
// No dollar amounts: digits (and a $ or % next to them) become #.
export const scrub = v => (typeof v === 'string' ? v.replace(/\$?\d[\d,.]*%?/g, '#').slice(0, 80) : typeof v === 'number' || typeof v === 'boolean' || v == null ? v : String(v).slice(0, 80));

// Add one event. debounce: a key; the same event with that key within 3 seconds replaces the last one (typing in Find).
export function logEvent(doc, e, data = {}, { now = new Date(), debounce = null } = {}) {
  if (!doc || !USAGE_EVENTS.includes(e)) return null;
  doc.usage ??= { events: [] };
  const list = doc.usage.events;
  const ev = { t: now.toISOString(), e, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, k === 'ms' || k === 'clicks' || k === 'score' || k === 'session' ? v : scrub(v)])) };
  if (debounce) ev.key = debounce;
  const last = list.at(-1);
  if (debounce && last?.key === debounce && last.e === e && now.getTime() - Date.parse(last.t) < 3000) list[list.length - 1] = ev;
  else list.push(ev);
  if (list.length > USAGE_MAX) list.splice(0, list.length - USAGE_MAX);
  return ev;
}

// Totals by screen and kind, for the export's top lines and the tests.
export function usageSummary(doc) {
  const ev = doc?.usage?.events || [];
  const screens = {};
  for (const x of ev.filter(x => x.e === 'screen')) { const s = (screens[x.screen] ??= { visits: 0, ms: 0, clicks: 0 }); s.visits += 1; s.ms += x.ms || 0; s.clicks += x.clicks || 0; }
  const count = e => ev.filter(x => x.e === e).length;
  return { screens, back: count('back'), undo: count('undo'), findMiss: count('findMiss'), deadEnd: count('deadEnd'), walk: count('walk'), ease: ev.filter(x => x.e === 'ease') };
}

// CSV: one row per event, then one row per session's ease answer (kept on the session record, program.reviews).
const cell = v => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
export function usageCsv(doc) {
  const rows = [['time', 'event', 'screen', 'seconds', 'clicks', 'detail']];
  for (const x of doc?.usage?.events || []) {
    const { t, e, screen, ms, clicks, key, ...rest } = x;
    rows.push([t, e, screen ?? '', ms != null ? Math.round(ms / 100) / 10 : '', clicks ?? '', Object.entries(rest).map(([k, v]) => `${k}: ${v}`).join('; ')]);
  }
  for (const [sid, r] of Object.entries(doc?.program?.reviews || {})) if (r?.ease) rows.push([r.at ?? '', 'ease (session record)', sid, '', '', `score: ${r.ease.score ?? ''}; stuck: ${scrub(r.ease.stuck ?? '')}`]);
  return `${rows.map(r => r.map(cell).join(',')).join('\n')}\n`;
}
