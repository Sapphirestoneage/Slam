/* ============================================================================
   SLAM the Game, test: tests/money-exercises.js
   PURPOSE     Examine Money exercises: the one sheet (the letter from your calm self first, ten
               exercises, three prompts for life after work), a prompt and lines to tap, the box, voice
               to text only where the browser has it, who sees this (Me only by default), Keep and
               Clear, what a coach sees, the way in from the menu and from "Ready for retirement,
               apart from the money", and the copy of the list.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: core/exercises.js, features/exercises.js,
               features/exletter.js, features/ideas3.js.
   ========================================================================= */
{
  const n0 = G.chars.length,
    act0 = G.active,
    a = Object.assign(newChar(), { name: "Ori", led: true, placed: true, age: 52, ret: 60, take: 5000, spend: 3500 });
  G.chars.push(a);
  G.active = n0;
  save();
  go("home");
  const c = C(),
    BLAME = /mistake|failed|behind|off track|should|wrong|fault/i;
  chk(
    "the menu has Money exercises",
    MENU.some(m => m[1] === "exercises")
  );
  chk(
    "the list: ten exercises and three prompts for life after work",
    exOfGroup("write").length === 10 && exOfGroup("after").length === 3
  );
  X("exercises");
  let h = ov();
  chk(
    "the sheet in the new look: title, caption, stat row, a card for each",
    W.kind === "exercises" &&
      h.includes("Money exercises") &&
      h.includes("dkcap") &&
      h.includes("dkstats") &&
      (h.match(/exscard/g) || []).length === 14 &&
      clean(h),
    junk(h)
  );
  chk(
    "the letter from your calm self is the first card, the one that exists",
    h.indexOf(EX_LETTER.title) > 0 &&
      h.indexOf(EX_LETTER.title) < h.indexOf("A letter to money") &&
      h.includes('data-a="exletter"')
  );
  chk(
    "every exercise and prompt is on the sheet, closed",
    EX_LIST.every(e => h.includes(esc(e.title))) && !h.includes("<textarea")
  );
  chk("no blame or verdict word on the sheet", !BLAME.test(h.replace(/<[^>]+>/g, " ")));
  /* ---------- open one, tap a line, keep ---------- */
  X("exopen", "letter-to-money");
  h = ov();
  const E = exById("letter-to-money");
  chk(
    "open: the prompt, lines to tap, the box, who sees this with Me only on",
    h.includes(esc(E.prompt).slice(0, 40)) &&
      h.includes('data-a="exstart"') &&
      h.includes("<textarea") &&
      /class="on" data-a="exseen" data-v="Me only"/.test(h) &&
      clean(h),
    junk(h)
  );
  chk(
    "no voice to text in this browser: a plain note, no button",
    !h.includes('data-a="exspeak"') && h.includes(esc(EX_VOICE.off))
  );
  X("exstart", "0");
  chk("a tapped line goes into the box", W.o.text === "Dear money, " && ov().includes("Dear money,"));
  W.o.text += "we are learning to get along.";
  X("exkeep");
  const k = c.x.ex["letter-to-money"];
  chk(
    "kept in c.x.ex, Me only, with the date",
    !!k && k.text === "Dear money, we are learning to get along." && k.seen === "Me only" && k.at === todayISO(),
    JSON.stringify(k)
  );
  chk(
    "the card says it is kept, and the count moves",
    ov().includes("Kept · Me only") && ov().includes("1 of 14"),
    junk(ov())
  );
  /* ---------- share one on purpose ---------- */
  X("exopen", "post-fi");
  W.o.text = "These days I teach woodworking.";
  X("exseen", "Shared");
  X("exkeep");
  chk("a Shared answer is kept as Shared", c.x.ex["post-fi"].seen === "Shared");
  /* ---------- what a coach sees ---------- */
  global.sessionStorage = {
    getItem: k2 => (k2 === "su_as" ? "player-1" : null),
    setItem: () => {},
    removeItem: () => {},
  };
  X("exercises");
  h = ov();
  chk(
    "a coach: the Me only words do not show, only that something is kept",
    !h.includes("learning to get along") && h.includes("only the player reads it")
  );
  chk("a coach: the Shared answer shows, read only", h.includes("teach woodworking") && !h.includes('data-a="exopen"'));
  X("exopen", "letter-to-money");
  chk("a coach cannot open an exercise", !ov().includes("<textarea"));
  X("exercises", "why-journal");
  chk("a coach cannot open one from a link either", !ov().includes("<textarea"));
  delete global.sessionStorage;
  /* ---------- voice to text where the browser has it ---------- */
  let started = 0,
    rec = null;
  global.SpeechRecognition = function () {
    rec = this;
    this.start = () => started++;
    this.stop = () => this.onend && this.onend();
  };
  X("exercises", "little-p");
  chk("the link opens one exercise at once", W.o.open === "little-p" && ov().includes("<textarea"));
  chk(
    "voice to text: a Speak it button and the plain note",
    ov().includes('data-a="exspeak"') && ov().includes(esc(EX_VOICE.on))
  );
  X("exspeak");
  chk("Speak it starts listening", started === 1 && W.o.hear === true && ov().includes("Listening. Tap to stop"));
  rec.onresult({ results: [[{ transcript: "my neighbor's garden" }]] });
  X("exspeak");
  chk("the words land in the box, and it stops", W.o.text === "my neighbor's garden" && W.o.hear === false, W.o.text);
  delete global.SpeechRecognition;
  /* ---------- clear, and an empty box keeps nothing ---------- */
  X("exopen", "letter-to-money");
  X("exclear");
  chk("Clear takes it away", !c.x.ex["letter-to-money"]);
  X("exopen", "enough");
  W.o.text = "   ";
  X("exkeep");
  chk("an empty box keeps nothing", !c.x.ex.enough);
  X("exopen", "enough");
  chk("the Enough exercise opens the enough number", ov().includes('data-a="enough"'));
  X("exopen", "values-spending");
  chk("Values and spending opens Is my money going where I want?", ov().includes('data-a="values"'));
  X("close");
  /* ---------- the way in from Ready for retirement, apart from the money ---------- */
  X("idea", "gilbert");
  chk(
    "Ready for retirement, apart from the money links to the three prompts",
    W.kind === "ig" &&
      /data-a="exercises" data-v="why-journal"/.test(ov()) &&
      ov().includes("Three prompts for life after work"),
    W && W.kind
  );
  X("exercises", "why-journal");
  chk(
    "the link opens the Why journal in the exercises",
    W.kind === "exercises" && W.o.open === "why-journal" && ov().includes("<textarea")
  );
  X("close");
  chk(
    "the copy of the list is fresh",
    /SOURCE-HASH  [0-9a-f]{16}/.test(require("fs").readFileSync(GAME_DIR + "core/exercises.js", "utf8"))
  );
  G.chars.splice(n0, 1);
  G.active = act0;
  save();
}
