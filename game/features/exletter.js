/* ============================================================================
   SLAM the Game: features/exletter.js
   PURPOSE     One exercise: Letter from your calm self. The player writes a few lines in a calm month.
               The game shows the letter again in a hard month (features/recalc.js decides which month
               is hard).
   INPUT       The profile: c.x.ex["calm-letter"] = { text, picks, own, at, seen }. The open sheet
               (W.kind): exletter. The taps of the player (the actions in OUTPUT).
   OUTPUT      Functions: exLetterGet, exLetterMine, exLetterText, exLetterBody, exLetterSheet.
               Constants: EX_LETTER. Actions (ACT): exletter, exlpick, exlkeep, exlclear, exlspeak.
   DEPENDS ON  core/report.js, core/engine.js, screens/ui.js, features/kit.js.
   RULES       This file is made to be one row of an Exercises screen. An exercise has a spec
               (EX_LETTER: id, title, minutes, when, prompt, starts, seen), a read (exLetterGet), a body
               (exLetterBody returns the HTML of the whole exercise, with no sheet head), and its
               actions. Each exercise keeps its answer in c.x.ex[id]. The answer is private by default:
               seen is "Me only". When a coach or an admin opens the game of a player, the text does not
               show (exLetterMine). The player taps lines. Typing or speaking is optional.
   ========================================================================= */
const EX_LETTER = {
  id: "calm-letter",
  title: "Letter from your calm self",
  minutes: 3,
  when: "In a month that feels steady",
  prompt:
    "A harder month will come: a lean paycheck, a repair, a bill you did not see. What do you want to hear from yourself then?",
  starts: [
    "You have had hard months before and you got through them.",
    "One month does not change where you are going.",
    "The plan bends. That is what it is for.",
    "Do the next small thing, then rest.",
    "You are still the person who started this.",
  ],
  seen: "Me only",
};
/* The kept letter of a profile, or null. */
function exLetterGet(c) {
  const e = c && c.x && c.x.ex && c.x.ex[EX_LETTER.id];
  return e && e.text ? e : null;
}
/* True when the person at the screen is the owner of the game. A coach or an admin who opened this game is not. */
function exLetterMine() {
  try {
    return !(typeof sessionStorage !== "undefined" && sessionStorage.getItem("su_as"));
  } catch (e) {
    report(e, "exletter.js: exLetterMine");
    return true;
  }
}
/* The letter: the tapped lines in the order of the list, then the own words. */
function exLetterText(picks, own) {
  return EX_LETTER.starts
    .filter(s => (picks || []).indexOf(s) >= 0)
    .concat([String(own || "").trim()])
    .filter(Boolean)
    .join(" ");
}
/* The whole exercise as HTML, with no sheet head. An Exercises screen can show it as it is. o is W.o. */
function exLetterBody(c, o) {
  const kept = exLetterGet(c),
    E = EX_LETTER;
  if (!exLetterMine())
    return `<div class="tile small">${kept ? "A letter is kept here. It is private: only the player reads it." : "No letter yet. Only the player writes it."}</div>`;
  const picks = o.picks || [],
    canSpeak = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  return (
    `<div class="small muted">${esc(E.when)} · about ${E.minutes} minutes</div>` +
    `<div class="small">${esc(E.prompt)}</div>` +
    `<div class="tiny muted">Tap the lines that sound like you</div>` +
    `<div class="stack" style="gap:6px">${E.starts.map((s, i) => `<button class="chip ${picks.indexOf(s) >= 0 ? "on" : ""}" style="text-align:left;white-space:normal;height:auto;padding:8px 12px" data-a="exlpick" data-v="${i}">${esc(s)}</button>`).join("")}</div>` +
    `<textarea id="exlown" data-k="own" rows="3" maxlength="600" placeholder="Your own words, typed or spoken (optional)" aria-label="Your own words" style="border:1px solid var(--line);border-radius:10px;width:100%;padding:8px">${esc(o.own || "")}</textarea>` +
    `<div class="row wrap" style="gap:8px">${canSpeak ? `<button class="ghost slim" data-a="exlspeak">${o.hear ? "Listening. Tap to stop" : "Speak it"}</button>` : ""}<span class="pill">Who sees this: Me only</span></div>` +
    `<button class="primary wide" data-a="exlkeep">${kept ? "Keep the changes" : "Keep the letter"}</button>` +
    (kept ? `<button class="ghost wide slim" data-a="exlclear">Clear the letter</button>` : "")
  );
}
function exLetterSheet() {
  return head("Exercise", EX_LETTER.title) + exLetterBody(C(), W.o);
}
kitScreen(
  "exletter",
  "Letter from your calm self",
  "A few lines you write in a calm month.",
  "The game shows them to you again in a hard one. Only you see them."
);
let EXL_REC = null;
Object.assign(ACT, {
  exletter: () => {
    const kept = exLetterGet(C());
    W = {
      kind: "exletter",
      o: { picks: kept ? (kept.picks || []).slice() : [], own: kept ? kept.own || "" : "", hear: false },
    };
    sheet(exLetterSheet);
  },
  exlpick: t => {
    const s = EX_LETTER.starts[+t.dataset.v],
      p = W.o.picks,
      i = p.indexOf(s);
    if (i >= 0) p.splice(i, 1);
    else p.push(s);
    drawSheet();
  },
  exlkeep: () => {
    const c = C(),
      text = exLetterText(W.o.picks, W.o.own);
    c.x = c.x || {};
    c.x.ex = c.x.ex || {};
    if (text)
      c.x.ex[EX_LETTER.id] = {
        text,
        picks: W.o.picks.slice(),
        own: String(W.o.own || "").trim(),
        at: todayISO(),
        seen: EX_LETTER.seen,
      };
    else delete c.x.ex[EX_LETTER.id];
    save();
    ACT.close();
  },
  exlclear: () => {
    const c = C();
    if (c.x && c.x.ex) delete c.x.ex[EX_LETTER.id];
    save();
    W.o = { picks: [], own: "", hear: false };
    drawSheet();
  },
  /* Voice to text, where the browser has it. The words go to the box of the own words. */
  exlspeak: () => {
    try {
      if (EXL_REC) {
        EXL_REC.stop();
        return;
      }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      EXL_REC = new SR();
      EXL_REC.lang = "en-US";
      EXL_REC.onresult = ev => {
        const said = Array.prototype.map
          .call(ev.results, r => r[0].transcript)
          .join(" ")
          .trim();
        if (said && W && W.kind === "exletter") W.o.own = ((W.o.own || "").trim() + " " + said).trim();
      };
      const end = () => {
        EXL_REC = null;
        if (W && W.kind === "exletter") {
          W.o.hear = false;
          drawSheet();
        }
      };
      EXL_REC.onend = end;
      EXL_REC.onerror = end;
      W.o.hear = true;
      drawSheet();
      EXL_REC.start();
    } catch (e) {
      EXL_REC = null;
      report(e, "exletter.js: exlspeak");
    }
  },
});
