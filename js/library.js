// SPDX-License-Identifier: AGPL-3.0-only
// Batch 26: the skill library's three files (data/library/skills.json, app-skills.json, unlearn.json), loaded once on
// first use and kept for the session. The math (js/math/library.js) takes them as an argument; this file is the one
// place that fetches them. Shape: { skills, appSkills, unlearn } (each file's array).
let LIB = null, loading = null;
export const skillLibrary = () => LIB;
export const setSkillLibrary = lib => { LIB = lib; return LIB; }; // tests and the sheet in Node
export const libraryFrom = (skills, appSkills, unlearn) => ({ skills: skills?.skills || [], appSkills: appSkills?.skills || [], unlearn: unlearn?.entries || [] });
export function loadSkillLibrary(onReady) {
  if (LIB) return Promise.resolve(LIB);
  if (typeof fetch !== 'function') return Promise.resolve(null);
  // Literal paths, one per file: the artifact build finds data files by their fetch('...json') calls and packs them in.
  const json = r => r.json();
  loading ??= Promise.all([fetch('data/library/skills.json').then(json), fetch('data/library/app-skills.json').then(json), fetch('data/library/unlearn.json').then(json)]).then(([a, b, c]) => setSkillLibrary(libraryFrom(a, b, c))).catch(() => { loading = null; return null; });
  return loading.then(lib => { if (lib) onReady?.(lib); return lib; });
}
