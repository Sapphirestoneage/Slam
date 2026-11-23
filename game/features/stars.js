/* ============================================================================
   SLAM the Game: features/stars.js
   PURPOSE     The Galaxy. A second view of the 25 skill tracks: 25 spiral arms (constellations) from "You" in the middle out to the FI ring,
               625 stars, one star for each skill. A star is bright (done), dim (not yet), pulsing (the
               next one, the same pick as Continue) or greyed (does not apply). A gateway star (its
               lanes reach 2 or more other tracks) has a ring. Lanes are the links of connect.js plus
               the links found in the text of a skill. A tap on a star opens a slim panel with a button
               "Do this". The list view of the skills stays the default.
   INPUT       data/skills.js. The links of features/connect.js (CX_E, cxLink). The profile: c.skills,
               c.na. The open sheet (W.kind): galaxy. The taps, drags and pinches on the canvas.
   OUTPUT      Functions: starsTrees, starsLayout, starsTextLinks, starsLanes, starsLanesOf,
               starsGateways, starsNext, starsState, starsCount, starsInfo, starsDo, starsPick, starsCenter,
               starsPaint, starsSheet, drawSheetStars, mapTabStars, questSheetStars. Actions (ACT):
               galaxy, stardo, starfly, starcenter, starzoom, starnext, starclear. Parts of functions
               in other files: drawSheetStars (drawSheetOnce in ui.js), mapTabStars (mapTab in ui.js),
               questSheetStars (questSheet in questlog.js). Menu: "Galaxy".
   DEPENDS ON  core/report.js, core/engine.js, screens/ui.js, features/connect.js, features/kit.js.
               USES LATER, behind a typeof test: features/questlog.js (questContinue).
   RULES       One canvas, not 625 elements: the stars of one state are one path. The still picture is
               kept, and only the ring of the next star moves. No red. A lane does not lock a track.
               Distance from the middle is the level: level 1 is next to "You", and level 5 ends at the FI ring.
               The player moves outward.
   ========================================================================= */
const STARS = {
  v: { x: 0, y: 0, z: 1 },
  sel: null,
  lay: null,
  lanes: null,
  info: null,
  gate: null,
  ptr: {},
  tap: null,
  last: null,
  still: null,
  timer: null,
  fly: null,
};
const STARS_OUT = 10;
const STARS_IN = 2.2;
/* How far one arm turns from the middle to the rim, in radians. */
const STARS_TWIST = 1.9;
const STARS_ZMIN = 0.8;
const STARS_ZMAX = 9;
const STARS_ZIG = [-0.6, 0.5, -0.15, 0.7, 0.05];
/* Words in the text of a skill that point at a different track. */
const STARS_WORDS = {
  "main-path": /index fund|401\(k\)|roth ira/i,
  "portfolio-design": /asset allocation|rebalanc|stocks? and bonds|your mix/i,
  "tax-strategy": /tax[- ]loss|tax bracket|capital gains|tax return|deduction/i,
  "real-estate": /mortgage|rental|down payment|landlord/i,
  "income-career": /\braise\b|salary|promotion|negotiat/i,
  "side-hustles": /side (income|hustle|gig)|freelanc/i,
  entrepreneurship: /your business|\bLLC\b|start a business/i,
  "credit-cards": /credit (card|score|report)|sign[- ]up bonus/i,
  "deals-smart-buying": /coupon|cash ?back|price match|bank bonus/i,
  "cash-safety-net": /emergency fund|cushion|high[- ]yield savings/i,
  "debt-leverage": /pay(ing)? off (a |your |the )?(debt|loan|card)|refinanc|student loan/i,
  "alternatives-speculation": /crypto|\boptions\b|angel invest|collectible/i,
  "insurance-protection": /insurance|deductible|umbrella policy|beneficiar/i,
  "geo-arbitrage-location": /cost of living|relocat|abroad|cheaper (city|country)/i,
  "health-longevity": /checkup|exercise|\bsleep\b|your doctor|your health(?! savings)\b/i,
  "family-generational-wealth": /\ba will\b|estate plan|\b529\b|\bheirs?\b|living trust|inherit/i,
  "withdrawal-decumulation": /withdraw|4% rule|required minimum|roth conversion|social security/i,
  knowledge: /\b(book|course|podcast)\b/i,
  "financial-ops-tooling": /automat|password manager|spreadsheet|autopay/i,
  "money-psychology": /money (story|script|belief)|impulse|\bshame\b/i,
  "time-capital": /your time\b|hours a week|outsourc/i,
  "social-capital": /mentor|your network|community/i,
  "pre-retirement-design": /sabbatical|mini-retirement|first year of (freedom|retirement)/i,
  "storms-windfalls": /windfall|inheritance|layoff|laid off|job loss|disaster/i,
  "the-long-game": /legacy|donat|charit/i,
};
function starsTrees() {
  return Object.keys(SKILLS);
}
/* A fixed small number from a text, so the picture is the same each time. */
function starsHash(s) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return h / 9973;
}
/* THE PLACES. Each star: { id, t, i, k (the number of its track), band (0 to 4), x, y, r (distance from the
   middle) }. Each track is one arm of a spiral: level 1 starts next to the middle ("You"), and the arm turns
   as it goes out to the FI ring at the rim. */
function starsLayout() {
  if (STARS.lay) return STARS.lay;
  const T = starsTrees(),
    n = T.length,
    list = [],
    by = {};
  T.forEach((t, k) => {
    const base = -Math.PI / 2 + (2 * Math.PI * k) / n,
      z = treeSize(t),
      per = z / 5;
    for (let i = 0; i < z; i++) {
      const f = i / (z - 1),
        r = STARS_IN + f * (STARS_OUT - STARS_IN),
        ang = base + STARS_TWIST * f,
        off = r * (Math.PI / n) * 0.5 * (STARS_ZIG[i % 5] + (starsHash(t + i) - 0.5) * 0.35),
        s = {
          id: t + ":" + i,
          t,
          i,
          k,
          band: Math.floor(i / per),
          r,
          x: r * Math.cos(ang) - off * Math.sin(ang),
          y: r * Math.sin(ang) + off * Math.cos(ang),
        };
      list.push(s);
      by[s.id] = s;
    }
  });
  STARS.lay = { list, by, trees: T, ang: T.map((t, k) => -Math.PI / 2 + (2 * Math.PI * k) / n + STARS_TWIST) };
  return STARS.lay;
}
/* The links found in the text of the skills: a skill names a subject of a different track. */
function starsTextLinks() {
  const out = [];
  starsTrees().forEach(t =>
    SKILLS[t].skills.forEach((s, i) => {
      const txt = s[0] + " " + s[1];
      Object.keys(STARS_WORDS).forEach(u => {
        if (u !== t && SKILLS[u] && STARS_WORDS[u].test(txt))
          out.push({
            from: t + ":" + i,
            to: u + ":0",
            why: "This skill uses " + SKILLS[u].name.toLowerCase() + ".",
            src: "text",
          });
      });
    })
  );
  return out;
}
/* ALL LANES: { from, to, why, src }. A link of connect.js goes from the last star of level 1 of a track
   (the star that takes the track to its first level) to the first star of the track that it opens. */
function starsLanes() {
  if (STARS.lanes) return STARS.lanes;
  const L = CX_E.filter(e => SKILLS[e[0]] && SKILLS[e[1]]).map(e => ({
    from: e[0] + ":" + (Math.min(CX_LV1, treeSize(e[0])) - 1),
    to: e[1] + ":0",
    why: e[2],
    src: "connect",
  }));
  STARS.lanes = L.concat(starsTextLinks());
  return STARS.lanes;
}
/* The lanes of one star: out (what it opens) and into (what leads to it). */
function starsLanesOf(id) {
  const L = starsLanes();
  return { out: L.filter(l => l.from === id), into: L.filter(l => l.to === id) };
}
/* The gateway stars: the lanes of the star reach 2 or more other tracks. */
function starsGateways() {
  if (STARS.gate) return STARS.gate;
  const reach = {};
  starsLanes().forEach(l => {
    const u = l.to.split(":")[0];
    reach[l.from] = reach[l.from] || {};
    reach[l.from][u] = 1;
  });
  STARS.gate = {};
  Object.keys(reach).forEach(id => {
    if (Object.keys(reach[id]).length >= 2) STARS.gate[id] = Object.keys(reach[id]).length;
  });
  return STARS.gate;
}
/* THE NEXT STAR: the same pick as Continue. First the Quest Log (when its pick is a skill), then the best
   move of the game, then the next skill of the track where the player is. */
function starsNext(c, d) {
  const ok = id => id && typeof id === "string" && starsLayout().by[id] && !skillDone(c, id) && !(c.na && c.na[id]);
  try {
    /* the pick of Continue in the Quest Log: a skill, or the first open star whose screen is that pick */
    const q = typeof questContinue === "function" ? questContinue(c) : null;
    if (q && q.a === "skill" && ok(q.v)) return q.v;
    if (q && q.a) {
      const hit = starsLayout().list.find(s => {
        const L = ok(s.id) && cxLink(s.t, s.i);
        return L && L.a === q.a && (L.v || "") === (q.v || "");
      });
      if (hit) return hit.id;
    }
  } catch (e) {
    report(e, "stars.js: starsNext");
  }
  const bm = bestMove(c, d, todayISO());
  if (bm && ok(bm.id)) return bm.id;
  const here = cxHere(c, d),
    order = [here].concat(starsTrees().filter(t => t !== here));
  for (const t of order) {
    for (let i = 0; i < treeSize(t); i++) if (ok(t + ":" + i)) return t + ":" + i;
  }
  return null;
}
/* The state of one star: done, na (does not apply), next, or dim. next is the id from starsNext(). */
function starsState(c, id, next) {
  if (skillDone(c, id)) return "done";
  if (c.na && c.na[id]) return "na";
  return id === next ? "next" : "dim";
}
/* THE HEADLINE: the share of the galaxy that is lit, and the count for each constellation. A star that
   does not apply is not in the total. */
function starsCount(c) {
  const rows = starsTrees().map(t => {
    let done = 0,
      na = 0;
    for (let i = 0; i < treeSize(t); i++) {
      const id = t + ":" + i;
      if (skillDone(c, id)) done++;
      else if (c.na && c.na[id]) na++;
    }
    return { t, done, na, size: treeSize(t) };
  });
  const lit = rows.reduce((a, r) => a + r.done, 0),
    na = rows.reduce((a, r) => a + r.na, 0),
    all = rows.reduce((a, r) => a + r.size, 0),
    of = Math.max(1, all - na);
  return { rows, lit, na, all, of, pct: Math.round((lit / of) * 100) };
}
/* "Do this": open the screen of the game for the skill (the links of connect.js). With no link, open the
   sheet of the skill, where the player marks it done. Returns the kind of screen it opened. */
function starsDo(id) {
  const p = String(id).split(":"),
    L = cxLink(p[0], +p[1]);
  if (L && typeof ACT[L.a] === "function") {
    ACT[L.a]({ dataset: { a: L.a, v: L.v, k: L.v } });
    return L.a;
  }
  skillSheet(id);
  return "skill";
}
/* ---------- the view: world to screen ---------- */
function starsScale(w, h) {
  return (Math.min(w, h) / 2 / (STARS_OUT + 2)) * STARS.v.z;
}
function starsToScreen(s, w, h) {
  const k = starsScale(w, h);
  return [w / 2 + (s.x - STARS.v.x) * k, h / 2 + (s.y - STARS.v.y) * k];
}
function starsToWorld(px, py, w, h) {
  const k = starsScale(w, h);
  return [STARS.v.x + (px - w / 2) / k, STARS.v.y + (py - h / 2) / k];
}
function starsClamp() {
  const v = STARS.v;
  v.z = Math.max(STARS_ZMIN, Math.min(STARS_ZMAX, v.z));
  v.x = Math.max(-STARS_OUT, Math.min(STARS_OUT, v.x));
  v.y = Math.max(-STARS_OUT, Math.min(STARS_OUT, v.y));
  STARS.still = null;
}
/* The star nearest to a point of the canvas, within a finger (22 pixels). */
function starsPick(px, py, w, h) {
  let best = null,
    bd = 22 * 22;
  starsLayout().list.forEach(s => {
    const p = starsToScreen(s, w, h),
      dd = (p[0] - px) * (p[0] - px) + (p[1] - py) * (p[1] - py);
    if (dd < bd) {
      bd = dd;
      best = s;
    }
  });
  return best;
}
/* The track of the star nearest to a point of the galaxy (for a double tap). */
function starsTreeAt(wx, wy) {
  let best = null,
    bd = Infinity;
  starsLayout().list.forEach(s => {
    const dd = (s.x - wx) * (s.x - wx) + (s.y - wy) * (s.y - wy);
    if (dd < bd) {
      bd = dd;
      best = s;
    }
  });
  return best ? best.t : null;
}
/* Put one constellation, or one star, in the middle. */
function starsCenter(t, z) {
  const S = starsLayout().list.filter(s => s.t === t);
  if (!S.length) return;
  starsFly(S.reduce((a, s) => a + s.x, 0) / S.length, S.reduce((a, s) => a + s.y, 0) / S.length, z || 2.4);
}
function starsFly(x, y, z) {
  const v = STARS.v,
    from = { x: v.x, y: v.y, z: v.z },
    to = { x, y, z: z || v.z },
    raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : null;
  if (!raf || typeof document === "undefined" || !document.getElementById || !document.getElementById("galaxy")) {
    Object.assign(v, to);
    starsClamp();
    return;
  }
  const t0 = Date.now(),
    id = (STARS.fly = (STARS.fly || 0) + 1),
    step = () => {
      if (STARS.fly !== id) return;
      const u = Math.min(1, (Date.now() - t0) / 320),
        e = u * u * (3 - 2 * u);
      v.x = from.x + (to.x - from.x) * e;
      v.y = from.y + (to.y - from.y) * e;
      v.z = from.z + (to.z - from.z) * e;
      starsClamp();
      starsPaint();
      if (u < 1) raf(step);
    };
  raf(step);
}
/* ---------- the picture ---------- */
function starsCanvas() {
  return typeof document !== "undefined" && document.getElementById ? document.getElementById("galaxy") : null;
}
/* Draw the still picture: the lanes, the constellation lines, the stars. One path for each state. */
function starsStill(g, w, h, c, next) {
  const L = starsLayout(),
    k = starsScale(w, h),
    P = s => starsToScreen(s, w, h),
    gate = starsGateways(),
    sel = STARS.sel,
    rad = Math.max(2, Math.min(7, k * 0.11));
  g.fillStyle = "#070b1c";
  g.fillRect(0, 0, w, h);
  /* the level rings, very faint */
  g.strokeStyle = "rgba(140,160,255,.08)";
  g.lineWidth = 1;
  for (let b = 0; b <= 5; b++) {
    const r = STARS_IN + (b / 5) * (STARS_OUT - STARS_IN),
      o = starsToScreen({ x: 0, y: 0 }, w, h);
    g.beginPath();
    g.arc(o[0], o[1], r * k, 0, Math.PI * 2);
    g.stroke();
  }
  /* the FI ring at the rim: where each arm ends */
  {
    const o = starsToScreen({ x: 0, y: 0 }, w, h),
      r = (STARS_OUT + 0.55) * k;
    g.strokeStyle = "rgba(255,214,102,.55)";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(o[0], o[1], r, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 1;
    g.fillStyle = "#ffd666";
    g.font = "800 12px system-ui,sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    [-Math.PI / 2, 0, Math.PI / 2, Math.PI].forEach(a => {
      const x = o[0] + r * Math.cos(a),
        y = o[1] + r * Math.sin(a);
      g.fillStyle = "#070b1c";
      g.fillRect(x - 11, y - 8, 22, 16);
      g.fillStyle = "#ffd666";
      g.fillText("FI", x, y);
    });
  }
  /* the lanes: faint */
  g.strokeStyle = "rgba(150,170,255,.07)";
  g.beginPath();
  starsLanes().forEach(l => {
    const a = P(L.by[l.from]),
      b = P(L.by[l.to]);
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
  });
  g.stroke();
  /* the lines of each constellation */
  g.strokeStyle = "rgba(170,185,255,.22)";
  g.beginPath();
  L.list.forEach(s => {
    const p = P(s);
    if (s.i === 0) g.moveTo(p[0], p[1]);
    else g.lineTo(p[0], p[1]);
  });
  g.stroke();
  /* the lanes of the chosen star: lit */
  if (sel && L.by[sel]) {
    const mine = starsLanesOf(sel);
    g.strokeStyle = "rgba(255,214,102,.9)";
    g.lineWidth = 1.6;
    g.beginPath();
    mine.out.concat(mine.into).forEach(l => {
      const a = P(L.by[l.from]),
        b = P(L.by[l.to]);
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
    });
    g.stroke();
    g.lineWidth = 1;
  }
  /* the stars: one path for each state */
  const group = { done: [], dim: [], na: [], next: [] };
  L.list.forEach(s => group[starsState(c, s.id, next)].push(s));
  const dots = (list, r) => {
    g.beginPath();
    list.forEach(s => {
      const p = P(s);
      g.moveTo(p[0] + r, p[1]);
      g.arc(p[0], p[1], r, 0, Math.PI * 2);
    });
  };
  g.fillStyle = "rgba(120,135,190,.55)";
  dots(group.dim, rad * 0.8);
  g.fill();
  g.strokeStyle = "rgba(130,135,150,.45)";
  dots(group.na, rad * 0.7);
  g.stroke();
  g.shadowColor = "rgba(255,240,190,.9)";
  g.shadowBlur = rad * 2.2;
  g.fillStyle = "#fff6d6";
  dots(group.done, rad);
  g.fill();
  g.shadowBlur = 0;
  g.fillStyle = "#ffd666";
  dots(group.next, rad * 1.15);
  g.fill();
  /* the ring of each gateway star */
  g.strokeStyle = "rgba(160,200,255,.75)";
  dots(
    L.list.filter(s => gate[s.id]),
    rad + 3
  );
  g.stroke();
  /* the chosen star */
  if (sel && L.by[sel]) {
    g.strokeStyle = "#ffffff";
    g.lineWidth = 2;
    dots([L.by[sel]], rad + 6);
    g.stroke();
    g.lineWidth = 1;
  }
  /* "You" in the middle, and the names when the view is near enough */
  const o = starsToScreen({ x: 0, y: 0 }, w, h);
  g.fillStyle = "#ffd666";
  g.beginPath();
  g.arc(o[0], o[1], Math.max(11, k * 1.1), 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#070b1c";
  g.font = "800 " + Math.max(9, Math.round(k * 0.75)) + "px system-ui,sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("You", o[0], o[1]);
  const names = STARS.v.z >= 1.7,
    selT = sel ? sel.split(":")[0] : null;
  g.font = "600 11px system-ui,sans-serif";
  L.trees.forEach((t, i) => {
    if (!names && t !== selT) return;
    const a = L.ang[i],
      p = starsToScreen({ x: (STARS_OUT + 1.5) * Math.cos(a), y: (STARS_OUT + 1.5) * Math.sin(a) }, w, h);
    g.fillStyle = "rgba(225,232,255,.92)";
    g.fillText(cxShort(t), Math.max(40, Math.min(w - 40, p[0])), Math.max(10, Math.min(h - 10, p[1])));
  });
}
/* The facts of the profile that the picture needs. The game works them out one time for each draw of
   the sheet, not for each picture, because the pick of the next star is slow. */
function starsInfo(c) {
  const N = starsCount(c),
    next = starsNext(c, D);
  return { next, stamp: next + "/" + N.lit + "/" + N.na };
}
/* PAINT THE CANVAS. The still picture is kept until the view, the choice or the profile changes. Then
   only the ring of the next star is drawn on top of it. */
function starsPaint() {
  const cv = starsCanvas();
  if (!cv || !cv.getContext) return;
  try {
    const c = C(),
      dpr = Math.min(2, (typeof devicePixelRatio === "number" && devicePixelRatio) || 1),
      w = cv.clientWidth || 320,
      h = cv.clientHeight || 320,
      I = STARS.info || (STARS.info = starsInfo(c)),
      next = I.next,
      key = [w, h, dpr, STARS.v.x, STARS.v.y, STARS.v.z, STARS.sel, I.stamp].join("|");
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    if (!STARS.still || STARS.still.key !== key) {
      const off = document.createElement("canvas");
      off.width = cv.width;
      off.height = cv.height;
      const og = off.getContext("2d");
      og.setTransform(dpr, 0, 0, dpr, 0, 0);
      starsStill(og, w, h, c, next);
      STARS.still = { key, off };
    }
    const g = cv.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(STARS.still.off, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = next && starsLayout().by[next];
    if (s) {
      const p = starsToScreen(s, w, h),
        u = (Date.now() % 1400) / 1400,
        r = 6 + u * 12;
      g.strokeStyle = "rgba(255,214,102," + (1 - u).toFixed(2) + ")";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(p[0], p[1], r, 0, Math.PI * 2);
      g.stroke();
    }
  } catch (e) {
    report(e, "stars.js: starsPaint");
  }
}
/* The pulse: about 20 pictures a second, only while the canvas is on the screen. */
function starsPulse() {
  if (STARS.timer || typeof setInterval !== "function") return;
  STARS.timer = setInterval(() => {
    if (!starsCanvas()) {
      clearInterval(STARS.timer);
      STARS.timer = null;
      return;
    }
    if (typeof document !== "undefined" && document.hidden) return;
    starsPaint();
  }, 50);
}
/* Part of drawSheetOnce() in ui.js. Paints the galaxy after the sheet is on the screen. */
function drawSheetStars() {
  if (!W || W.kind !== "galaxy" || !starsCanvas()) return;
  STARS.still = null;
  STARS.info = starsInfo(C());
  starsPaint();
  starsPulse();
}
/* ---------- the taps, drags and pinches on the canvas ---------- */
function starsXY(e, cv) {
  const b = cv.getBoundingClientRect();
  return [e.clientX - b.left, e.clientY - b.top];
}
function starsDown(e) {
  const cv = e.target;
  if (!cv || cv.id !== "galaxy") return;
  const p = starsXY(e, cv);
  STARS.ptr[e.pointerId] = { x: p[0], y: p[1] };
  const n = Object.keys(STARS.ptr).length;
  STARS.tap = n === 1 ? { x: p[0], y: p[1], t: Date.now(), moved: false } : null;
  if (e.preventDefault) e.preventDefault();
}
function starsMove(e) {
  const cv = starsCanvas(),
    was = STARS.ptr[e.pointerId];
  if (!cv || !was) return;
  const p = starsXY(e, cv),
    w = cv.clientWidth,
    h = cv.clientHeight,
    ids = Object.keys(STARS.ptr);
  if (ids.length === 1) {
    const k = starsScale(w, h);
    STARS.v.x -= (p[0] - was.x) / k;
    STARS.v.y -= (p[1] - was.y) / k;
    if (STARS.tap && Math.abs(p[0] - STARS.tap.x) + Math.abs(p[1] - STARS.tap.y) > 8) STARS.tap.moved = true;
  } else if (ids.length === 2) {
    const o = STARS.ptr[ids[0] === String(e.pointerId) ? ids[1] : ids[0]],
      d0 = Math.hypot(was.x - o.x, was.y - o.y) || 1,
      d1 = Math.hypot(p[0] - o.x, p[1] - o.y) || 1,
      mid = [(p[0] + o.x) / 2, (p[1] + o.y) / 2],
      at = starsToWorld(mid[0], mid[1], w, h);
    STARS.v.z *= d1 / d0;
    starsClamp();
    const now = starsToWorld(mid[0], mid[1], w, h);
    STARS.v.x += at[0] - now[0];
    STARS.v.y += at[1] - now[1];
  }
  STARS.ptr[e.pointerId] = { x: p[0], y: p[1] };
  STARS.fly = (STARS.fly || 0) + 1;
  starsClamp();
  starsPaint();
}
function starsUp(e) {
  if (!STARS.ptr[e.pointerId]) return;
  delete STARS.ptr[e.pointerId];
  const cv = starsCanvas(),
    tp = STARS.tap;
  STARS.tap = null;
  if (!cv || !tp || tp.moved || Date.now() - tp.t > 500) return;
  starsTap(tp.x, tp.y, cv.clientWidth, cv.clientHeight);
}
/* One tap picks a star. Two taps in a short time put the constellation under the finger in the middle. */
function starsTap(px, py, w, h) {
  const now = Date.now(),
    twice = STARS.last && now - STARS.last.t < 380 && Math.hypot(px - STARS.last.x, py - STARS.last.y) < 30;
  STARS.last = { t: now, x: px, y: py };
  if (twice) {
    const at = starsToWorld(px, py, w, h);
    STARS.last = null;
    starsCenter(starsTreeAt(at[0], at[1]));
    return;
  }
  const s = starsPick(px, py, w, h);
  if (!s) return;
  STARS.sel = s.id;
  STARS.still = null;
  drawSheet();
}
function starsWheel(e) {
  const cv = e.target;
  if (!cv || cv.id !== "galaxy") return;
  if (e.preventDefault) e.preventDefault();
  const p = starsXY(e, cv),
    w = cv.clientWidth,
    h = cv.clientHeight,
    at = starsToWorld(p[0], p[1], w, h);
  STARS.v.z *= e.deltaY < 0 ? 1.15 : 1 / 1.15;
  starsClamp();
  const now = starsToWorld(p[0], p[1], w, h);
  STARS.v.x += at[0] - now[0];
  STARS.v.y += at[1] - now[1];
  starsClamp();
  starsPaint();
}
if (typeof document !== "undefined" && document.addEventListener) {
  document.addEventListener("pointerdown", starsDown, { passive: false });
  document.addEventListener("pointermove", starsMove, { passive: true });
  document.addEventListener("pointerup", starsUp);
  document.addEventListener("pointercancel", starsUp);
  document.addEventListener("wheel", starsWheel, { passive: false });
}
/* ---------- the sheet ---------- */
const STARS_WORD = { done: "Done", dim: "Not yet", next: "Your next star", na: "Does not apply" };
/* The slim panel of the chosen star. */
function starsPanel(c, id, next) {
  const p = id.split(":"),
    t = p[0],
    i = +p[1],
    s = SKILLS[t].skills[i],
    st = starsState(c, id, next),
    L = cxLink(t, i),
    lanes = starsLanesOf(id),
    gate = starsGateways()[id];
  return (
    `<div class="tile stack starpanel" style="gap:6px"><div class="row between" style="gap:8px"><span class="tiny muted">${esc(trackN(t))} · Level ${Math.floor(i / (treeSize(t) / 5)) + 1}</span><span class="pill kitst">${STARS_WORD[st]}</span></div><b>${esc(stepThemed(id) || s[0])}</b><div class="small">${esc(s[1])}</div><div class="small"><b>You've done this when:</b> ${esc(s[2])}</div>` +
    `<button class="primary wide" data-a="stardo" data-v="${id}">Do this${L ? ": " + esc(L.l) : ""}</button>` +
    (gate
      ? `<div class="tiny muted">A gateway star ${kitInfo("gateway")}: its lanes reach ${gate} other constellations.</div>`
      : "") +
    (lanes.out.length
      ? `<div class="small"><b>This opens…</b></div><div class="stack" style="gap:6px">${lanes.out
          .map(
            l =>
              `<button class="rowbtn" data-a="starfly" data-v="${l.to}"><span style="min-width:0"><b class="small">${esc(trackN(l.to.split(":")[0]))}</b><div class="tiny muted">${esc(l.why)}</div></span><span class="caret">›</span></button>`
          )
          .join("")}</div>`
      : "") +
    `<button class="ghost slim" data-a="starclear">Close this star</button></div>`
  );
}
function starsSheet() {
  const c = C(),
    N = starsCount(c),
    next = starsNext(c, D),
    sel = STARS.sel && starsLayout().by[STARS.sel] ? STARS.sel : null;
  return (
    head("Skills", "Galaxy") +
    `<div class="tile stack" style="gap:2px;text-align:center"><div class="bignum">${N.pct}% of the galaxy lit ${kitInfo("galaxy")}</div><div class="small muted">${N.lit} of ${N.of} stars${N.na ? " · " + N.na + " do not apply to you" : ""}</div></div>` +
    `<div class="row wrap" style="gap:6px"><button class="ghost slim" data-a="starzoom" data-v="in" aria-label="Zoom in">Zoom in +</button><button class="ghost slim" data-a="starzoom" data-v="out" aria-label="Zoom out">Zoom out −</button><button class="ghost slim" data-a="starzoom" data-v="reset">Whole galaxy</button>${next ? `<button class="ghost slim" data-a="starnext">Find my next star</button>` : ""}</div>` +
    `<canvas id="galaxy" class="galaxy" role="img" aria-label="The galaxy: 25 spiral arms from you in the middle out to FI at the rim. ${N.lit} of ${N.of} stars are lit. The list under the picture has the same counts."></canvas>` +
    `<div class="tiny muted">Tap a star. Drag to move. Pinch to zoom. Tap a constellation two times to center it.</div>` +
    (sel ? starsPanel(c, sel, next) : "") +
    `<div class="row wrap tiny muted starkey" style="gap:10px"><span><i class="sk done"></i>Done</span><span><i class="sk dim"></i>Not yet</span><span><i class="sk next"></i>Next</span><span><i class="sk na"></i>Does not apply</span><span><i class="sk gate"></i>Gateway ${kitInfo("gateway")}</span></div>` +
    `<details><summary>Stars lit in each constellation</summary><div class="inner stack" style="gap:6px">${N.rows
      .map(
        r =>
          `<button class="rowbtn" data-a="starcenter" data-v="${r.t}"><span class="small">${esc(trackN(r.t))}</span><span class="small"><b>${r.done}</b> of ${r.size - r.na} ›</span></button>`
      )
      .join("")}</div></details>` +
    `<button class="ghost wide" data-a="tab" data-v="map">See the skills as a list</button>`
  );
}
/* Part of mapTab() in ui.js. Adds the button "Galaxy" to the Skills screen. The list stays the default. */
function mapTabStars(h) {
  return h.replace(
    /<h1>Skills<\/h1>/,
    m =>
      m +
      `<button class="ghost wide galaxybtn" data-a="galaxy">See it as a galaxy ›</button><div class="tiny muted" style="text-align:center">The same 625 skills as stars that spiral out to FI.</div>`
  );
}
/* Part of questSheet() in questlog.js. Adds the button "Galaxy" to the Quest Log. */
function questSheetStars(h) {
  return h + `<button class="ghost wide galaxybtn" data-a="galaxy">See the galaxy ›</button>`;
}
kitTerms({
  galaxy: [
    "The galaxy",
    "All 625 skills as stars: 25 constellations that spiral out from you in the middle to the FI ring (financial independence) at the rim. A star lights up when you finish its skill. Level 1 is next to you, and level 5 ends at the ring.",
  ],
  gateway: [
    "Gateway star",
    "A skill whose lanes reach 2 or more other constellations. Finishing it helps in more than one place. A lane is a help, not a lock: you can start anywhere.",
  ],
});
kitScreen(
  "galaxy",
  "Galaxy",
  "Your 625 skills as stars in 25 spiral arms, from you out to FI.",
  "Tap a star to see what it is, when it is done, and the screen that does it."
);
Object.assign(ACT, {
  galaxy: t => {
    const c = C();
    if (!(t && t.dataset && t.dataset.keep)) {
      STARS.v = { x: 0, y: 0, z: 1 };
      STARS.sel = null;
    }
    STARS.still = null;
    if (t && t.dataset && t.dataset.v && starsLayout().by[t.dataset.v]) STARS.sel = t.dataset.v;
    W = { kind: "galaxy", o: {} };
    sheet(starsSheet);
    return c;
  },
  stardo: t => {
    starsDo(t.dataset.v);
  },
  starfly: t => {
    const s = starsLayout().by[t.dataset.v];
    if (!s) return;
    STARS.sel = s.id;
    STARS.still = null;
    starsFly(s.x, s.y, Math.max(STARS.v.z, 2.4));
    drawSheet();
  },
  starcenter: t => {
    starsCenter(t.dataset.v);
    drawSheet();
  },
  starzoom: t => {
    const v = t.dataset.v;
    if (v === "reset") starsFly(0, 0, 1);
    else
      starsFly(
        STARS.v.x,
        STARS.v.y,
        Math.max(STARS_ZMIN, Math.min(STARS_ZMAX, STARS.v.z * (v === "in" ? 1.5 : 1 / 1.5)))
      );
    if (!starsCanvas()) drawSheet();
  },
  starnext: () => {
    const id = starsNext(C(), D),
      s = id && starsLayout().by[id];
    if (!s) return;
    STARS.sel = id;
    STARS.still = null;
    starsFly(s.x, s.y, Math.max(STARS.v.z, 2.4));
    drawSheet();
  },
  starclear: () => {
    STARS.sel = null;
    STARS.still = null;
    drawSheet();
  },
});
kitMenu("Galaxy", "galaxy", "Your skills as 625 stars that spiral out to FI", "connect");
