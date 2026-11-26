/* ============================================================================
   SLAM the Game: features/exercises.js
   PURPOSE     Money exercises (run Finish everything partly built, Part 7, Money psychology). One
               sheet in the new look: the letter from your calm self (features/exletter.js, shown as
               its first card), ten money exercises, and three prompts for life after work. Each
               exercise opens with a short prompt, lines to tap that go into the box, the box (typed,
               or spoken where the browser has voice to text), who sees this (Me only by default),
               Keep and Clear.
   INPUT       The profile: c.x.ex[id] = { text, at, seen }. The open sheet (W.kind): exercises,
               with W.o = { open, text, seen, hear }. The taps of the player (the actions in OUTPUT).
   OUTPUT      Functions: exsAll, exsMine, exsSheet, exsCard, exsBody, exsOpen. Actions (ACT):
               exercises, exopen, exstart, exseen, exkeep, exclear, exspeak. Menu: "Money exercises".
   DEPENDS ON  core/exercises.js (the list, a copy of js/exercises/catalog.js), core/report.js,
               core/engine.js (todayISO), screens/ui.js (esc, head, save, sheet, drawSheet),
               screens/dash.js (dkCaption, dkStatRow, dkTile, dkCard, dkPill), features/kit.js
               (kitMenu, kitScreen), features/exletter.js (EX_LETTER, exLetterGet, exLetterMine).
   RULES       The words are private by default (seen "Me only"). When a coach or an admin opens the
               game of a player, a Me only answer does not show: only that one is kept. A Shared answer
               shows to them, read only. No sound is kept: voice to text puts words in the box only.
               No number is worked out here. Values and spending and The Enough exercise open the
               screens with the numbers (Is my money going where I want?, Lifestyle creep and enough).
   STORED      c.x.ex[id] = { text, at, seen: "Me only" | "Shared" }.
   ========================================================================= */
const EXS_TOOL = {
  values: ["values", "Open: Is my money going where I want?"],
  enough: ["enough", "Open: Lifestyle creep and enough"],
};
/* All kept answers of a profile (the letter included). */
function exsAll(c) {
  return (c && c.x && c.x.ex) || {};
}
/* True when the person at the screen owns the game (the same rule as the letter). */
function exsMine() {
  return typeof exLetterMine !== "function" || exLetterMine();
}
/* Open one exercise in the sheet: its kept words go into the box. */
function exsOpen(c, id) {
  const a = exsAll(c)[id];
  W.o = {
    open: id,
    text: a && a.text ? a.text : "",
    seen: a && a.seen === EX_SHARED ? EX_SHARED : EX_ME_ONLY,
    hear: false,
  };
}
/* The body of the open exercise. */
function exsBody(c, E, o) {
  const canSpeak = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition),
    kept = exsAll(c)[E.id],
    tool = E.tool && EXS_TOOL[E.tool];
  return (
    `<div class="small">${esc(E.prompt)}</div>` +
    `<div class="tiny muted">Tap a line to start with</div>` +
    `<div class="stack" style="gap:6px">${E.starts.map((s, i) => `<button class="chip" style="text-align:left;white-space:normal;height:auto;min-height:44px;padding:8px 12px" data-a="exstart" data-v="${i}">${esc(s)}</button>`).join("")}</div>` +
    `<textarea id="exstext" data-k="text" rows="6" maxlength="${EX_MAX}" placeholder="Your words, typed or spoken" aria-label="${esc(E.title)}: your words" style="border:1px solid var(--line);border-radius:10px;width:100%;padding:8px">${esc(o.text || "")}</textarea>` +
    (canSpeak
      ? `<div class="row wrap" style="gap:8px"><button class="ghost slim" data-a="exspeak">${o.hear ? "Listening. Tap to stop" : "Speak it"}</button></div><div class="tiny muted">${esc(EX_VOICE.on)}</div>`
      : `<div class="tiny muted">${esc(EX_VOICE.off)}</div>`) +
    `<div class="tiny muted">Who sees this</div>` +
    `<div class="seg"><button class="${o.seen === EX_SHARED ? "" : "on"}" data-a="exseen" data-v="${EX_ME_ONLY}">Me only</button><button class="${o.seen === EX_SHARED ? "on" : ""}" data-a="exseen" data-v="${EX_SHARED}">Me and my coach</button></div>` +
    `<div class="tiny muted">${o.seen === EX_SHARED ? "Your coach can read this when they open your game." : "Only you read this. A coach who opens your game sees only that something is kept."}</div>` +
    `<button class="primary wide" data-a="exkeep">${kept && kept.text ? "Keep the changes" : "Keep it"}</button>` +
    (kept && kept.text ? `<button class="ghost wide slim" data-a="exclear">Clear it</button>` : "") +
    (tool ? `<button class="ghost wide slim" data-a="${tool[0]}">${esc(tool[1])}</button>` : "")
  );
}
/* One exercise as a card: closed (title, line, state, Open) or open (the body). */
function exsCard(c, E, mine) {
  const v = exFor(exsAll(c)[E.id], mine),
    open = mine && W && W.o && W.o.open === E.id,
    state = v.kept
      ? dkPill(v.seen === EX_SHARED ? "Kept · shared" : "Kept · Me only", "good")
      : dkPill("About " + E.minutes + " min");
  let body = `<div class="tiny muted">${esc(E.line)}</div>`;
  if (open) body += exsBody(c, E, W.o);
  else if (!mine)
    body += v.hidden
      ? `<div class="tile small">Something is kept here. It is private: only the player reads it.</div>`
      : v.kept
        ? `<div class="tile small"><i>${esc(v.text)}</i></div>`
        : `<div class="tiny muted">Nothing written yet.</div>`;
  else
    body += `<button class="ghost wide slim" data-a="exopen" data-v="${E.id}">${v.kept ? "Read or change" : "Open"}</button>`;
  return dkCard(E.title, `<div class="stack" style="gap:8px">${body}</div>`, { right: state, cls: "exscard" });
}
function exsSheet() {
  const c = C(),
    mine = exsMine(),
    all = exsAll(c),
    ids = [EX_LETTER.id].concat(EX_LIST.map(e => e.id)),
    n = exCount(all, ids),
    shared = ids.filter(id => all[id] && all[id].text && all[id].seen === EX_SHARED).length,
    letter = exLetterGet(c),
    group = g => {
      const G = EX_GROUPS.find(x => x.id === g);
      return `<div class="eyebrow" id="exs-${g}">${esc(G.title)}</div><div class="tiny muted">${esc(G.cap)}</div>`;
    };
  const letterCard = dkCard(
    EX_LETTER.title,
    `<div class="stack" style="gap:8px"><div class="tiny muted">${esc(EX_LETTER.when)} · about ${EX_LETTER.minutes} minutes</div>` +
      (mine
        ? `<button class="ghost wide slim" data-a="exletter">${letter ? "Read or change" : "Open"}</button>`
        : `<div class="tile small">${letter ? "A letter is kept here. It is private: only the player reads it." : "No letter yet. Only the player writes it."}</div>`) +
      `</div>`,
    { right: letter ? dkPill("Kept · Me only", "good") : dkPill("About " + EX_LETTER.minutes + " min"), cls: "exscard" }
  );
  return (
    head("Me", "Money exercises") +
    dkCaption("Short writing about you and money. Private to you unless you share it.") +
    dkStatRow([
      dkTile("Written", n.done + " of " + n.of, { sub: "any order, any length" }),
      dkTile("Shared", String(shared), { sub: shared ? "your coach can read these" : "all private to you" }),
    ]) +
    group("calm") +
    letterCard +
    group("write") +
    exOfGroup("write")
      .map(E => exsCard(c, E, mine))
      .join("") +
    group("after") +
    exOfGroup("after")
      .map(E => exsCard(c, E, mine))
      .join("")
  );
}
kitScreen(
  "exercises",
  "Money exercises",
  "Short writing about you and money, and three prompts for life after work.",
  "Only you read them, unless you share one with your coach."
);
let EXS_REC = null;
Object.assign(ACT, {
  /* v: an exercise id to open at once (from "Ready for retirement, apart from the money"), or nothing. */
  exercises: t => {
    const id = t && t.dataset && t.dataset.v;
    W = { kind: "exercises", o: { open: null, text: "", seen: EX_ME_ONLY, hear: false } };
    if (id && exById(id) && exsMine()) exsOpen(C(), id);
    sheet(exsSheet);
  },
  exopen: t => {
    if (!exsMine() || !exById(t.dataset.v)) return;
    exsOpen(C(), t.dataset.v);
    drawSheet();
  },
  exstart: t => {
    const E = exById(W.o.open),
      s = E && E.starts[+t.dataset.v];
    if (!s) return;
    W.o.text = exAddStart(W.o.text, s);
    drawSheet();
  },
  exseen: t => {
    W.o.seen = t.dataset.v === EX_SHARED ? EX_SHARED : EX_ME_ONLY;
    drawSheet();
  },
  exkeep: () => {
    const c = C(),
      id = W.o.open;
    if (!exsMine() || !exById(id)) return;
    const a = exAnswer(W.o.text, W.o.seen, todayISO());
    c.x = c.x || {};
    c.x.ex = c.x.ex || {};
    if (a) c.x.ex[id] = a;
    else delete c.x.ex[id];
    save();
    W.o = { open: null, text: "", seen: EX_ME_ONLY, hear: false };
    drawSheet();
  },
  exclear: () => {
    const c = C(),
      id = W.o.open;
    if (!exsMine() || !exById(id)) return;
    if (c.x && c.x.ex) delete c.x.ex[id];
    save();
    W.o.text = "";
    drawSheet();
  },
  /* Voice to text, where the browser has it. The words go to the end of the box. No sound is kept. */
  exspeak: () => {
    try {
      if (EXS_REC) {
        EXS_REC.stop();
        return;
      }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      EXS_REC = new SR();
      EXS_REC.lang = "en-US";
      EXS_REC.onresult = ev => {
        const said = Array.prototype.map
          .call(ev.results, r => r[0].transcript)
          .join(" ")
          .trim();
        if (said && W && W.kind === "exercises") W.o.text = ((W.o.text || "").trim() + " " + said).trim();
      };
      const end = () => {
        EXS_REC = null;
        if (W && W.kind === "exercises") {
          W.o.hear = false;
          drawSheet();
        }
      };
      EXS_REC.onend = end;
      EXS_REC.onerror = end;
      W.o.hear = true;
      drawSheet();
      EXS_REC.start();
    } catch (e) {
      EXS_REC = null;
      report(e, "exercises.js: exspeak");
    }
  },
});
kitMenu("Money exercises", "exercises", "Short writing about you and money, private to you", "sins");
