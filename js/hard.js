// SPDX-License-Identifier: AGPL-3.0-only
// Hard moments (run Not built, groups 1 to 5, Part 7): what a hard-moment page keeps, and who sees it. The answers of
// each tool live in settings.hard[toolId] = { keep, coach, ...answers }. Nothing is kept unless the person turns on
// Keep this (keep: true, off by default): keptOnly takes every tool that is not kept out of the household before it is
// saved or packed into a link. Kept, a tool is still private: hardForAudience leaves it out of a coach's view unless
// the person turned on "Let my coach see this" (coach: true), out of a partner's view always, and out of anything
// shared (a file, a share view) always. js/privacy.js calls hardForAudience on every view; js/solo/shell.js calls
// keptOnly on every save and every link.

export const HARD_PART = 'hard';
export const hardOf = (doc, id) => doc?.settings?.[HARD_PART]?.[id] || {};
export const isKept = (doc, id) => hardOf(doc, id).keep === true;

// The household with every tool that is not kept taken out. The same object when there is nothing to take out.
export function keptOnly(doc) {
  const H = doc?.settings?.[HARD_PART];
  if (!H) return doc;
  const kept = Object.fromEntries(Object.entries(H).filter(([, v]) => v?.keep === true));
  if (Object.keys(kept).length === Object.keys(H).length) return doc;
  const settings = { ...doc.settings };
  if (Object.keys(kept).length) settings[HARD_PART] = kept; else delete settings[HARD_PART];
  return { ...doc, settings };
}

// settings as this audience sees them: the person's own view sees every kept tool; a coach only the tools the person
// let the coach see; a partner and anything shared, none. aud: { who: 'coach' | 'client' | 'share', person, couple }.
export function hardForAudience(settings, aud) {
  const H = settings?.[HARD_PART];
  if (!H) return settings;
  const own = aud?.who === 'client' && (!aud.couple || aud.person === 'Me');
  if (own) return settings;
  const shown = aud?.who === 'coach' ? Object.fromEntries(Object.entries(H).filter(([, v]) => v?.keep === true && v?.coach === true)) : {};
  const out = { ...settings };
  if (Object.keys(shown).length) out[HARD_PART] = shown; else delete out[HARD_PART];
  return out;
}
