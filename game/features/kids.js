/* ============================================================================
   SLAM the Game: features/kids.js
   PURPOSE     Kids mode: "Help your kid stress less about money". A simple, separate kind of profile
               that the adults of a game can add for a kid. It has no money numbers. It has 20 short
               lessons (data/kidlessons.js), one a day: one idea, then two questions by taps.
               Duolingo mode: the same daily lesson path for the player (ADULT_LESSONS, kept in c.x.lp),
               ordered by the latest quiz result, each lesson ending on its skill.
   INPUT       The game: G.kids, a list of { id, name, done: { lesson id: date }, right: { lesson id:
               number of right answers }, last (date of the last lesson), run (days in a row) }. The
               open sheet (W.kind): kids, with W.k (the kid), W.l (the lesson), W.s (the step), W.pick.
   OUTPUT      Functions: kidRunNext, lpRec, lpLessons, kidLessonsOf, kidRecOf, kidNext, kidStats,
               kidSheet, lpTopPart. Actions (ACT): lp, kids, kidadd, kidopen, kidlesson, kidgo, kidpick,
               kidback, kidrm. Parts of functions in other files: mePeopleKids (meTabPeople in profiles.js).
               Menu: "Kids mode", "Daily lessons".
   DEPENDS ON  core/report.js, core/engine.js (todayISO, daysBetween), screens/ui.js, features/kit.js,
               data/kidlessons.js, screens/dash.js (dkCaption).
   USES LATER  features/quizzes.js (qzLatest, qzTreesOf), behind a typeof test.
   RULES       A kid profile is not a player: it is not in G.chars, and it changes no money number.
               No lesson is locked. The lesson of today pulses, and the others are faded. A run counts
               days in a row and forgives one missed day ("never miss twice"). A wrong answer gets the
               reason, with no red and no score that goes down.
   ========================================================================= */
const KID_NAMES = ["My teen", "Kid 1", "Kid 2", "Kid 3"];
function kidList() {
  return (G.kids = G.kids || []);
}
/* The run after a lesson today. One missed day is forgiven: a gap of 1 or 2 days keeps the run. */
function kidRunNext(run, last, today) {
  if (!last) return 1;
  const gap = daysBetween(last, today);
  if (gap <= 0) return Math.max(1, run || 1);
  return gap <= 2 ? (run || 0) + 1 : 1;
}
/* Duolingo mode: the same path for the player. The record of the player: c.x.lp, in the shape of a kid. */
function lpRec(c) {
  c.x = c.x || {};
  return (c.x.lp = c.x.lp || { id: "me", name: "You", adult: true, done: {}, right: {}, last: "", run: 0 });
}
/* The lessons of a path. An adult path puts first the lessons whose skill tree matches the latest quiz result
   (quizzes.js: qzLatest, qzTreesOf), in their own order after that. */
function lpLessons(c) {
  const L = typeof qzLatest === "function" ? qzLatest(c) : null,
    trees = L && typeof qzTreesOf === "function" ? qzTreesOf(L.card) : [];
  if (typeof ADULT_LESSONS === "undefined") return [];
  return ADULT_LESSONS.filter(l => trees.includes(l.tree)).concat(ADULT_LESSONS.filter(l => !trees.includes(l.tree)));
}
function kidLessonsOf(k) {
  return k && k.adult ? lpLessons(C()) : KID_LESSONS;
}
/* The record of the open sheet: the player (W.me) or a kid. */
function kidRecOf(w) {
  return w.me ? lpRec(C()) : kidList()[w.k];
}
/* The next lesson that is not done, or null when all are done. */
function kidNext(k) {
  return kidLessonsOf(k).find(l => !(k.done || {})[l.id]) || null;
}
function kidStats(k, today) {
  const LS = kidLessonsOf(k),
    done = LS.filter(l => (k.done || {})[l.id]).length,
    asked = LS.filter(l => (k.done || {})[l.id]).reduce((a, l) => a + l.q.length, 0),
    right = Object.keys(k.right || {}).reduce((a, id) => a + (k.right[id] || 0), 0);
  return {
    done,
    of: LS.length,
    asked,
    right,
    today: k.last === today,
    run: k.last && daysBetween(k.last, today) <= 2 ? k.run || 0 : 0,
  };
}
function kidSheet() {
  const w = W,
    L = kidList(),
    t = todayISO(),
    k = w.me ? lpRec(C()) : w.k != null ? L[w.k] : null,
    me = !!w.me;
  if (!k)
    return (
      head("People", "Kids mode") +
      `<div class="small muted">Help your kid stress less about money. A kid gets short daily lessons, the kind a high school personal finance class covers. A kid profile holds no money numbers.</div>` +
      (L.length
        ? `<div class="stack" style="gap:6px">${L.map((x, i) => {
            const S = kidStats(x, t);
            return `<button class="rowbtn ${!S.today && i === 0 ? "pulse" : ""}" data-a="kidopen" data-v="${i}"><span><b>${esc(x.name)}</b><div class="tiny muted">${S.done} of ${S.of} lessons${S.run > 1 ? " · " + S.run + " days in a row" : ""}${S.today ? " · done today" : ""}</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`;
          }).join("")}</div>`
        : "") +
      `<b class="small">Add a kid</b><div class="chips">${KID_NAMES.filter(n => !L.some(x => x.name === n))
        .map(
          (n, i) =>
            `<button class="chip ${!L.length && i === 0 ? "likely" : ""}" data-a="kidadd" data-v="${esc(n)}">${esc(n)}</button>`
        )
        .join(
          ""
        )}</div><div class="tiny muted">Hand the phone to your kid for the lesson. It takes about two minutes.</div>`
    );
  const S = kidStats(k, t),
    nx = kidNext(k),
    LS = kidLessonsOf(k);
  if (w.l == null)
    return (
      head(me ? "Daily lessons" : "Kids mode", me ? "Your lesson path" : esc(k.name)) +
      (me ? lpTopPart() : "") +
      `<div class="grid2">${kitTile("Lessons", S.done + " of " + S.of, "", "")}${kitTile("Days in a row", String(Math.max(S.run, S.today ? 1 : 0)), "one missed day is forgiven", "")}</div>` +
      (S.today
        ? `<div class="tile small"><b>That is today's lesson, done.</b> Come back tomorrow for the next one. One more today is fine too.</div>`
        : "") +
      `<div class="stack" style="gap:6px">${LS.map((l, i) => {
        const dn = !!(k.done || {})[l.id],
          hot = nx && nx.id === l.id;
        return `<button class="rowbtn ${hot && !S.today ? "pulse" : ""}" style="${dn || hot ? "" : "opacity:.7"}" data-a="kidlesson" data-v="${i}"><span><b>${i + 1}. ${esc(l.t)}</b>${hot ? `<div class="tiny muted">${S.today ? "Next up" : "Today's lesson · about 2 minutes"}</div>` : ""}</span><b>${dn ? "✓" : "<i class=chev aria-hidden=true></i>"}</b></button>`;
      }).join("")}</div>` +
      (me
        ? `<button class="ghost wide slim" data-a="close">Done</button>`
        : `<button class="ghost wide slim" data-a="kidback">All kids</button>`) +
      `${me ? "" : w.rm ? `<div class="tile small">Remove ${esc(k.name)} and their lessons?<div class="row" style="gap:8px;margin-top:8px"><button class="ghost slim" data-a="kidrm" data-v="yes">Yes, remove</button><button class="primary slim" data-a="kidrm" data-v="no">Keep</button></div></div>` : `<button class="ghost wide slim" data-a="kidrm" data-v="ask">Remove this kid</button>`}`
    );
  const l = LS[w.l],
    s = w.s || 0,
    n = l.q.length,
    dots = `<div class="row" style="justify-content:center;gap:6px;margin:4px 0">${Array.from({ length: n + 1 }, (_, i) => `<span class="rvdot ${i <= s ? "on" : ""}"></span>`).join("")}</div>`;
  if (s === 0)
    return (
      head(esc(k.name), esc(l.t)) +
      `<div class="levelup pop" style="padding:8px 0"><div class="eyebrow">The idea</div><div style="font-size:17px;margin:10px 0;text-align:left">${esc(l.idea)}</div></div>` +
      dots +
      `<button class="primary wide go" data-a="kidgo">Got it</button>`
    );
  if (s <= n) {
    const q = l.q[s - 1],
      p = w.pick;
    return (
      head(esc(k.name), esc(l.t)) +
      `<div class="small muted">Question ${s} of ${n}</div><h2 data-fid="kid:q">${esc(q[0])}</h2>` +
      `<div class="stack" style="gap:8px">${q[1].map((a, i) => `<button class="rowbtn ${p != null && i === q[2] ? "sel" : ""}" data-a="kidpick" data-v="${i}" ${p != null ? "disabled" : ""}><span>${esc(a)}</span><b>${p != null && i === q[2] ? "✓" : p === i ? "Not this one" : ""}</b></button>`).join("")}</div>` +
      (p != null
        ? `<div class="tile small"><b>${p === q[2] ? "Yes." : "Close. Here is why."}</b> ${esc(q[3])}</div>` +
          dots +
          `<button class="primary wide go" data-a="kidgo">${s === n ? "Finish" : "Next"}</button>`
        : dots)
    );
  }
  return (
    head(esc(k.name), "Lesson done") +
    `<div class="levelup pop"><div class="medal">✓</div><h2>${esc(l.t)}</h2><div class="small">${(k.right || {})[l.id] || 0} of ${n} right on the first try. ${S.done} of ${S.of} lessons done.</div>${S.run > 1 ? `<div class="pill buff" style="margin-top:8px">${S.run} days in a row</div>` : ""}</div>` +
    (me && l.tree && SKILLS[l.tree]
      ? `<button class="primary wide go" data-a="skill" data-v="${l.tree}:${l.lv - 1}">Open the skill: ${esc((SKILLS[l.tree].skills[l.lv - 1] || [l.t])[0])}</button>`
      : "") +
    `<button class="${me ? "ghost wide slim" : "primary wide go"}" data-a="kidlesson" data-v="">Back to the lessons</button>`
  );
}
/* The top of the adult path: why this order, from the latest quiz result. */
function lpTopPart() {
  const L = typeof qzLatest === "function" ? qzLatest(C()) : null;
  return dkCaption(
    L
      ? "One short lesson a day. The ones that fit your latest quiz (" +
          L.def.name +
          ": " +
          L.card.title +
          ") come first."
      : "One short lesson a day. Take a quiz and the lessons that fit your result move to the top."
  );
}
/* Part of meTabPeople() in profiles.js. Adds the row "Kids mode" to the card "Your people" of Me. */
function mePeopleKids(h) {
  if (G.demo) return h;
  const n = kidList().length;
  return (
    h +
    `<button class="rowbtn" data-a="kids"><span><b>Kids mode</b><div class="tiny muted">${n ? n + (n === 1 ? " kid" : " kids") + ". Short daily money lessons" : "Add a kid: short daily money lessons, no money numbers"}</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`
  );
}
kitScreen(
  "kids",
  "Kids mode",
  "Short daily money lessons for a kid, the kind a high school class covers.",
  "A kid profile holds no money numbers and changes nothing in your own game."
);
kitMenu("Kids mode", "kids", "Short daily money lessons for your kid", "people");
kitScreen(
  "lp",
  "Daily lessons",
  "One short money lesson a day for you: one idea, then two questions by taps.",
  "The lessons that fit your latest quiz result come first. A missed day is forgiven."
);
kitMenu("Daily lessons", "lp", "One short money lesson a day, picked by your quiz", "qz");
Object.assign(ACT, {
  /* Duolingo mode: the daily lesson path of the player (one sheet with Kids mode). */
  lp: () => {
    W = { kind: "lp", me: true, l: null, s: 0 };
    sheet(kidSheet);
  },
  kids: () => {
    const L = kidList();
    W = { kind: "kids", k: L.length === 1 ? 0 : null, l: null, s: 0 };
    sheet(kidSheet);
  },
  kidadd: t => {
    const L = kidList();
    L.push({ id: "k" + Date.now().toString(36) + L.length, name: t.dataset.v, done: {}, right: {}, last: "", run: 0 });
    save();
    W.k = L.length - 1;
    W.l = null;
    drawSheet();
  },
  kidopen: t => {
    W.k = +t.dataset.v;
    W.l = null;
    W.rm = false;
    drawSheet();
  },
  kidback: () => {
    W.k = null;
    W.l = null;
    drawSheet();
  },
  kidlesson: t => {
    W.l = t.dataset.v === "" || t.dataset.v == null ? null : +t.dataset.v;
    W.s = 0;
    W.pick = null;
    W.first = {};
    drawSheet();
  },
  kidpick: t => {
    if (W.pick != null) return;
    const k = kidRecOf(W),
      l = kidLessonsOf(k)[W.l],
      q = l.q[W.s - 1];
    W.pick = +t.dataset.v;
    W.first = W.first || {};
    W.first[W.s] = W.pick === q[2];
    drawSheet();
  },
  kidgo: () => {
    const k = kidRecOf(W),
      l = kidLessonsOf(k)[W.l];
    if (!k || !l) return;
    W.s = (W.s || 0) + 1;
    W.pick = null;
    if (W.s > l.q.length) {
      const t = todayISO(),
        was = !!k.done[l.id];
      k.done[l.id] = k.done[l.id] || t;
      if (!was) k.right[l.id] = Object.keys(W.first || {}).filter(s => W.first[s]).length;
      k.run = kidRunNext(k.run, k.last, t);
      k.last = t;
      save();
    }
    drawSheet();
  },
  kidrm: t => {
    const L = kidList();
    if (t.dataset.v === "ask") W.rm = true;
    else if (t.dataset.v === "yes") {
      L.splice(W.k, 1);
      W.k = null;
      W.rm = false;
      save();
    } else W.rm = false;
    drawSheet();
  },
});
