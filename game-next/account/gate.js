/* ============================================================================
   SLAM the Game: account/gate.js
   PURPOSE     Add-ons, part 1 of 2. Some parts of the game are not in these files. They come from the
               account, and only for an account that the owner of the game permits. This file answers
               one question: is this add-on on, now, for the person on the screen? No add-on has its
               name in these files.
   INPUT       The game: G.plain. The profile: c.x.ao, c.x.aok.
   OUTPUT      8 functions.
   DEPENDS ON  core/report.js.
   USES LATER  Names from files that the browser loads later. Behind a typeof test, thus safe while the
               page loads: screens/ui.js. With no typeof test, thus safe only after the page has loaded
               all files: screens/ui.js (C, SH, THEMES).
   STATE       ADX (what came in this visit), c.x.ao (the add-ons that the owner permits for this
               person), c.x.aok (the one-time yes of a person to an add-on), G.plain (demo mode: the
               standard look and no add-ons).
   ========================================================================= */
var ADX = { has: {}, meta: {}, gl: {}, own: false, quiet: 0, test: false, st: "off", err: "", plainSH: null, ro: null };
function adQuiet() {
  try {
    if (ADX.quiet > 0) return true;
    if (typeof G !== "undefined" && G && G.plain) return true;
    return !!(ADX.plainSH && SH && SH === ADX.plainSH);
  } catch (e) {
    return false;
  }
}
function adMine(id, c) {
  const x = (c && c.x) || {};
  return ADX.own ? !!(x.ao || {})[id] : true;
}
function adOn(id) {
  if (!id) return true;
  if (!ADX.has[id] || adQuiet()) return false;
  if (ADX.test) return true;
  let c = null;
  try {
    c = C();
  } catch (e) {
    report(e, "gate.js: adOn");
  }
  if (!c) return false;
  if (!adMine(id, c)) return false;
  if ((ADX.meta[id] || {}).gate && !((c.x || {}).aok || {})[id]) return false;
  return true;
}
function adOk(o) {
  return !o || !o.pk || adOn(o.pk);
}
function adKey(k) {
  return !ADX.gl[k] || adOn(ADX.gl[k]);
}
function adPlain(fn) {
  ADX.quiet++;
  try {
    return fn();
  } finally {
    ADX.quiet--;
  }
}
/* Is this theme off by default for the person on the screen? An add-on can say in its meta that some themes
   are off by default for a person who has it on (meta.themesOff: a list of theme ids). Such a theme stays out
   of the picker and is not used, until the person taps "Show it" (c.x.thShow[id]). It names no add-on and
   says nothing about what an add-on holds. */
function adThemeOff(id) {
  try {
    if (!id || adQuiet()) return false;
    const on = Object.keys(ADX.has).filter(k => ADX.has[k] && ((ADX.meta[k] || {}).themesOff || []).includes(id));
    if (!on.some(k => adOn(k))) return false;
    const c = C();
    return !(c && c.x && c.x.thShow && c.x.thShow[id]);
  } catch (e) {
    report(e, "gate.js: adThemeOff");
    return false;
  }
}
function thUse(id, fb) {
  try {
    return !adQuiet() && id && THEMES[id] && adOk(THEMES[id]) && !adThemeOff(id) ? id : fb;
  } catch (e) {
    return fb;
  }
}
