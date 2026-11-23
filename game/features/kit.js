/* ============================================================================
   SLAM the Game: features/kit.js
   PURPOSE     The shared parts of the plan screens (the two paths, the odds, the simulators and the
               other screens of the Plan batch). One answer by taps: preset chips, an optional exact
               number, and Guess / Close / Exact. Shared tiles, columns side by side, a small chart with
               a marked point, the "i" of a screen, and a menu row.
   INPUT       The profile: c.x[area] holds the answers of each feature, as { v, cf }. cf is 1 (Guess),
               2 (Close) or 3 (Exact). The open sheet (W). The taps of the player (the actions in OUTPUT).
   OUTPUT      Functions that return HTML or numbers. Actions (ACT): kitset, kitsure, kitpad, kittyped.
   DEPENDS ON  core/report.js, core/engine.js, screens/ui.js, screens/planner.js, screens/nav.js.
   RULES       The player taps. Typing an exact number is optional, and it is whole dollars only. A
               value that the player did not give is a Guess. A tap on a chip is Close. A typed number is
               Exact. No red: the chart uses sapphire and white only. These functions do not calculate
               money. They show what the math functions return.
   ========================================================================= */
const KIT_SURE = [
  [1, "Guess"],
  [2, "Close"],
  [3, "Exact"],
];
/* The answers of one feature, in the profile. */
function kitStore(c, area) {
  c.x = c.x || {};
  c.x[area] = c.x[area] || {};
  return c.x[area];
}
/* One answer: the value of the player, or the fallback as a Guess. */
function kitValue(c, area, key, fallback) {
  const s = kitStore(c, area)[key];
  if (s && s.v != null) return { v: s.v, cf: s.cf || 2, given: true };
  return { v: fallback, cf: 1, given: false };
}
/* The state of a result from the states of its inputs: Guess, Close or Exact. */
function kitState(list) {
  const rows = (list || []).filter(Boolean);
  if (!rows.length || rows.some(r => (r.cf || 1) <= 1)) return "Guess";
  return rows.every(r => r.cf >= 3) ? "Exact" : "Close";
}
/* The state of a profile number: Close when the player made it real, else Guess. */
function kitSharp(c, k) {
  return { cf: c.led && isSharp(c, k) ? 2 : 1 };
}
function kitPill(st) {
  return `<span class="pill kitst">${esc(st)}</span>`;
}
/* An "i" button for a word in GLOSS. */
function kitInfo(term) {
  return term ? ib("term:" + term) : "";
}
/* Add words to the glossary: { key: [word, plain text] }. */
function kitTerms(list) {
  if (typeof GLOSS !== "undefined") Object.assign(GLOSS, list);
}
/* The "i" of a screen (nav.js shows it on the top row of the sheet). */
function kitScreen(kind, title, one, two) {
  if (typeof NV_INFO !== "undefined") NV_INFO[kind] = [title, one, two];
  if (typeof GLOSS !== "undefined") GLOSS["scr_" + kind] = [title, one + " " + two];
}
/* A row in the menu, after the row of the action "after". */
function kitMenu(label, act, sub, after) {
  if (typeof MENU === "undefined" || !Array.isArray(MENU) || MENU.some(m => m[1] === act)) return;
  const i = MENU.findIndex(m => m[1] === after);
  MENU.splice(i >= 0 ? i + 1 : MENU.length, 0, [label, act, "act", sub]);
}
/* The key of the keypad for one answer. */
function kitPadKey(area, key) {
  return "kt" + area + "_" + key;
}
/* ONE QUESTION BY TAPS.
   opts is a list of [value, label]. o.term is a word for the "i". o.help is one line of help.
   o.typed (true for dollar amounts) adds "Type the exact number". o.act is a feature action that calls
   kitApply() or kitApplySure() and then does more (the default is kitset and kitsure). */
function kitAsk(c, area, key, label, opts, fallback, o) {
  o = o || {};
  const cur = kitValue(c, area, key, fallback),
    k = area + "|" + key,
    pk = kitPadKey(area, key),
    open = W && W.pad === pk,
    isNum = opts.length && typeof opts[0][0] === "number";
  const chips = opts
    .map(
      x =>
        `<button class="chip ${cur.given && cur.v === x[0] ? "on" : ""}" data-a="${o.act || "kitset"}" data-k="${k}" data-v="${esc(String(x[0]))}" data-t="${isNum ? "n" : "s"}">${esc(x[1])}</button>`
    )
    .join("");
  const sure = `<div class="seg kitsure" role="group" aria-label="How sure">${KIT_SURE.map(s => `<button class="${(cur.given ? cur.cf : 1) === s[0] ? "on" : ""}" data-a="${o.act ? o.act + "sure" : "kitsure"}" data-k="${k}" data-v="${s[0]}" data-f="${esc(String(fallback))}" data-t="${isNum ? "n" : "s"}">${s[1]}</button>`).join("")}</div>`;
  const typed = o.typed
    ? open
      ? `<div class="val">${money((W.o && W.o[pk]) || 0)}</div>${keypad(pk)}<div class="row" style="gap:8px"><button class="primary slim" data-a="kittyped" data-k="${k}">Use this number</button><button class="ghost slim" data-a="padclose">Cancel</button></div>`
      : `<button class="ghost slim" data-a="kitpad" data-k="${k}">Type the exact number</button>`
    : "";
  return `<div class="field kitask"><div class="row between" style="gap:8px"><span class="small">${esc(label)}</span><span class="row" style="gap:6px">${kitInfo(o.term)}</span></div><div class="chips">${chips}</div><div class="row wrap between" style="gap:6px">${sure}${typed}</div>${o.help ? `<div class="tiny muted">${esc(o.help)}</div>` : ""}</div>`;
}
/* A tile with one big number. st is Guess, Close or Exact. */
function kitTile(label, big, sub, st, term) {
  return `<div class="tile stack kittile" style="gap:4px"><div class="row between" style="gap:6px"><span class="tiny muted">${esc(label)}</span><span class="row" style="gap:6px">${st ? kitPill(st) : ""}${kitInfo(term)}</span></div><div class="big ${st === "Guess" ? "guess" : ""}">${big}</div>${sub ? `<div class="tiny muted">${sub}</div>` : ""}</div>`;
}
/* Columns side by side. Each column: { title, big, rows: [[label, value]], foot, hot, html }. */
function kitColumns(cols) {
  return `<div class="kitcols">${cols
    .map(
      x =>
        `<div class="tile stack kitcol ${x.hot ? "kithot" : ""}" style="gap:6px"><b class="small">${esc(x.title)}</b>${x.big ? `<div class="big ${x.guess ? "guess" : ""}">${x.big}</div>` : ""}${x.rows ? igRows(x.rows) : ""}${x.html || ""}${x.foot ? `<div class="tiny muted">${x.foot}</div>` : ""}</div>`
    )
    .join("")}</div>`;
}
/* Small tabs on a sheet: a list of [value, label]. */
function kitTabs(act, cur, list) {
  return `<div class="seg kittabs">${list.map(t => `<button class="${t[0] === cur ? "on" : ""}" data-a="${act}" data-v="${esc(String(t[0]))}">${esc(t[1])}</button>`).join("")}</div>`;
}
/* A SMALL CHART.
   o.lines: a list of { pts: [[x, y]], dash, name }. o.mark: { x, label } draws a vertical line.
   o.zero draws the line y = 0. o.fx and o.fy write the axis values. */
function kitChart(o) {
  const w = 320,
    h = 150,
    L = 44,
    Rt = 8,
    T = 10,
    B = 26,
    all = [].concat.apply(
      [],
      o.lines.map(l => l.pts)
    ),
    xs = all.map(p => p[0]),
    ys = all.map(p => p[1]).concat(o.zero ? [0] : []);
  if (!all.length) return "";
  let x0 = Math.min.apply(null, xs),
    x1 = Math.max.apply(null, xs),
    y0 = Math.min.apply(null, ys),
    y1 = Math.max.apply(null, ys);
  if (x1 === x0) x1 = x0 + 1;
  if (y1 === y0) y1 = y0 + 1;
  const X = v => L + ((v - x0) / (x1 - x0)) * (w - L - Rt),
    Y = v => T + (1 - (v - y0) / (y1 - y0)) * (h - T - B),
    fx = o.fx || (v => String(Math.round(v))),
    fy = o.fy || (v => money(v));
  const path = pts => pts.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join(" ");
  const lines = o.lines
    .map(
      (l, i) =>
        `<path d="${path(l.pts)}" fill="none" stroke="${i ? "var(--a3)" : "var(--sap)"}" stroke-width="2.5" ${l.dash || i ? 'stroke-dasharray="5 4"' : ""}/>`
    )
    .join("");
  const zero =
    o.zero && y0 < 0 && y1 > 0
      ? `<line x1="${L}" x2="${w - Rt}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--line)" stroke-width="1"/>`
      : "";
  const mark =
    o.mark && o.mark.x >= x0 && o.mark.x <= x1
      ? `<line x1="${X(o.mark.x)}" x2="${X(o.mark.x)}" y1="${T}" y2="${h - B}" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 3"/><circle cx="${X(o.mark.x)}" cy="${Y(o.mark.y == null ? 0 : o.mark.y)}" r="4.5" fill="#fff"/><text x="${Math.min(w - 60, Math.max(L + 30, X(o.mark.x)))}" y="${T + 9}" text-anchor="middle">${esc(o.mark.label || "")}</text>`
      : "";
  const legend = o.lines.some(l => l.name)
    ? `<div class="row wrap tiny muted" style="gap:10px">${o.lines.map((l, i) => (l.name ? `<span><span class="kitkey ${i ? "dash" : ""}"></span>${esc(l.name)}</span>` : "")).join("")}</div>`
    : "";
  return `<figure class="kitchart" style="margin:0"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(o.label || "Chart")}">${zero}${lines}${mark}<text x="${L - 4}" y="${T + 4}" text-anchor="end">${esc(fy(y1))}</text><text x="${L - 4}" y="${h - B}" text-anchor="end">${esc(fy(y0))}</text><text x="${L}" y="${h - 8}" text-anchor="start">${esc(fx(x0))}</text><text x="${w - Rt}" y="${h - 8}" text-anchor="end">${esc(fx(x1))}</text></svg>${legend}${o.caption ? `<figcaption class="tiny muted">${esc(o.caption)}</figcaption>` : ""}</figure>`;
}
/* Days from months, for "FI days". */
function kitDays(months) {
  return months == null ? null : Math.round(months * 30.44);
}
/* "120 days sooner", "45 days later", "no change". */
function kitDayWords(days) {
  if (days == null) return "no date yet";
  const n = Math.abs(Math.round(days));
  if (n < 1) return "no change";
  return n.toLocaleString() + (n === 1 ? " day " : " days ") + (days < 0 ? "sooner" : "later");
}
/* A percent from a share: 0.072 is "7.2%". */
function kitPct(v, dp) {
  const k = Math.pow(10, dp == null ? 1 : dp);
  return Math.round(v * 100 * k) / k + "%";
}
/* The key part of a tap: "area|key". */
function kitKey(t) {
  const p = String(t.dataset.k || "").split("|");
  return { area: p[0], key: p.slice(1).join("|") };
}
function kitRedraw() {
  save();
  render();
  drawSheet();
}
/* Keep the answer of one tap on a chip. */
function kitApply(t) {
  const c = C(),
    k = kitKey(t),
    S = kitStore(c, k.area),
    v = t.dataset.t === "n" ? +t.dataset.v : t.dataset.v,
    old = S[k.key];
  S[k.key] = { v, cf: old && old.v === v ? old.cf : 2 };
}
/* Keep the Guess / Close / Exact of one answer. With no answer yet, the fallback becomes the answer. */
function kitApplySure(t) {
  const c = C(),
    k = kitKey(t),
    S = kitStore(c, k.area),
    cf = +t.dataset.v;
  if (S[k.key] && S[k.key].v != null) S[k.key].cf = cf;
  else if (t.dataset.f != null && t.dataset.f !== "")
    S[k.key] = { v: t.dataset.t === "n" ? +t.dataset.f : t.dataset.f, cf };
}
Object.assign(ACT, {
  kitset: t => {
    kitApply(t);
    kitRedraw();
  },
  kitsure: t => {
    kitApplySure(t);
    kitRedraw();
  },
  kitpad: t => {
    if (!W) return;
    const k = kitKey(t);
    W.o = W.o || {};
    W.pad = kitPadKey(k.area, k.key);
    W.fresh = true;
    drawSheet();
  },
  kittyped: t => {
    if (!W) return;
    const c = C(),
      k = kitKey(t),
      pk = kitPadKey(k.area, k.key),
      v = +((W.o && W.o[pk]) || 0);
    if (!isFinite(v)) return;
    kitStore(c, k.area)[k.key] = { v, cf: 3 };
    W.pad = null;
    kitRedraw();
  },
});
