/* ============================================================================
   SLAM the Game, test: tests/what-it-could-be-top-ups.js
   PURPOSE     Examine Batch B, phase 1 (Nov 27 2026), the top-ups to What it is / What it could be: the
               lifetime spending total on "What it is" ("The rest of your life costs about ..."); the
               three presets of Social Security (Not counting on it, Count part of it, Count all of it);
               the drop of each way is the number of its own math function; the last screen lists every
               way of the flow and promises nothing that is not built; a way that a later file adds with
               cbStepAdd() is numbered and listed with no other change; a new player sees exactly one
               opening.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. One made-up player.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: core/paylayers.js (lyLifetime, lyNumbers, lyReceipt),
               features/couldbe.js (cbStart, cbLife, cbIsView, cbWaySets, cbPartShare, cbWayPick,
               cbPreview, cbWays, cbWayNo, cbStepAdd, cbCount, cbEndView).
   ========================================================================= */
{
  const G0 = clone(G),
    text = h =>
      h
        .replace(/<svg[\s\S]*?<\/svg>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " "),
    junk = h =>
      (text(h).match(/undefined|NaN|\bnull\b|\u2014/g) || [])
        .concat(text(h).match(/mistake|failed|\bbehind\b|off track/gi) || [])
        .join(","),
    go = v => X("cbgo", v),
    kinds = [];

  /* ---- 1. exactly one opening ---- */
  G = clone(G0);
  G.demo = true;
  W = null;
  X("start");
  X("wnskip"); /* What you want (run SLAM-ONBOARD-1): Skip for now */
  kinds.push(W && W.kind + ":" + W.step);
  let h = ov();
  chk(
    "a new player: Start opens question 1 of the flow, and nothing else",
    W && W.kind === "cb" && W.step === "entry" && W.q === 0 && /Question 1 of 4/.test(h) && /How old are you\?/.test(h)
  );
  chk(
    "no second opening is on the screen: no setup round, no Am I okay page, no payoff reveal",
    !/Question 1 of 5|Getting started|Am I okay\? · page|Here's where you stand|Level \d/.test(text(h))
  );
  [
    ["age", 1],
    ["spend", 2],
    ["inv", 3],
    ["save", 3],
  ].forEach(a => {
    X("cbset", "", "", { q: a[0], i: a[1] });
    kinds.push(W && W.kind + ":" + W.step);
  });
  chk(
    "from Start to the first number every screen is the flow's own: four questions, then What it is",
    kinds.join() === "cb:entry,cb:entry,cb:entry,cb:entry,cb:is",
    kinds.join()
  );
  chk("the first number comes in 6 taps", cbTaps() === 6, cbTaps());
  chk("the profile is made once, and Start does not open the entry again for it", !G.demo && cbStart() === false);
  chk(
    "the three ways in (the landing, Start, a first game from the cloud) all call the one opening",
    /cbStart\(\)/.test(String(doorBegin)) &&
      /cbStart\(\)/.test(String(ACT.start)) &&
      /cbStart\(\)/.test(String(clFirstGame))
  );

  /* ---- 2. the lifetime spending total ---- */
  const c = C(),
    d = derive(c),
    L = cbLife(c, d),
    years = LY_END - c.age + 1;
  h = ov();
  chk(
    "the lifetime total is today's spending a year for each year from today to 95",
    L.years === years && L.from === c.age && L.to === LY_END && Math.abs(L.total - d.fiSpend * years) < 0.01,
    [L.total, d.fiSpend, years]
  );
  chk(
    "it is the math function's number (lyLifetime), and the needs and wants of the chart added up",
    L.total === lyLifetime({ age: c.age, spend: d.fiSpend, end: LY_END }).total &&
      Math.abs(
        L.total - lyYears(Object.assign(cbParams(c, d), { stop: null })).reduce((t, r) => t + r.needs + r.wants, 0)
      ) < 0.01
  );
  chk(
    "What it is says it in the owner's words, with the round figure of the one money formatter",
    W.step === "is" &&
      /data-fid="cb:life"/.test(h) &&
      text(h).includes("The rest of your life costs about " + money(L.shown)) &&
      L.shown === Math.round(L.total / 1000) * 1000
  );
  chk(
    "the total is marked Guess, Close or Exact, has an i, and Show the math has its line",
    new RegExp('data-fid="cb:life"[\\s\\S]*?<span class="pill kitst">' + L.st + "</span>").test(h) &&
      /data-a="cbi" data-k="life"/.test(h) &&
      CB_GUIDE.life[3] === "cblife" &&
      !!GLOSS.cblife &&
      text(h).includes(
        " a year x " + years + " years (age " + c.age + " to " + LY_END + ") = " + money(Math.round(L.total))
      )
  );
  chk(
    "for this player the total is more than the FI number, and the screen says why the number is smaller",
    L.aboveFi && L.total > cbNumbers(c).is.target && /Your FI number is smaller/.test(text(h))
  );
  chk(
    "What it is still has both numbers, one trust line and no junk",
    /data-cbn="is"/.test(h) &&
      /data-cbn="could"/.test(h) &&
      (h.match(/data-fid="cb:trust"/g) || []).length === 1 &&
      !junk(h),
    junk(h)
  );
  const old = clone(c);
  c.age = 80;
  chk(
    "a player of 80: 16 years, less than 25 times, and the screen does not say the number is smaller",
    cbLife(c).years === 16 && !cbLife(c).aboveFi && !/Your FI number is smaller/.test(text(cbIsView()))
  );
  c.age = old.age;
  chk(
    "the book of the plan has the total with its formula",
    cbBook(c).rows.find(r => r.id === "cb_life").v === L.total &&
      cbBook(c).rows.find(r => r.id === "cb_years").v === years
  );

  /* ---- 3. the three presets of Social Security ---- */
  let sets = cbWaySets("ss", c);
  chk(
    "three presets, by the owner's words, in the owner's order",
    sets.map(o => o.l).join("|") === "Not counting on it|Count part of it|Count all of it" &&
      sets.map(o => o.share).join() === "0," + LY_SS_REF.payable + ",1"
  );
  chk("Count part of it is the share of the trust fund report: 83%", cbPartShare(c) === 0.83 && sets[1].pct === 83);
  chk("before any tap the drop is shown for all of it", cbWayPick(c, "ss").share === 1);
  go("ss");
  h = ov();
  chk(
    "the step shows three chips and the heading counts the ways of the flow",
    W.step === "ss" &&
      (h.match(/data-a="cbpick"/g) || []).length === 3 &&
      text(h).includes("Way 2 of " + cbWays().length)
  );
  X("cbpick", String(LY_SS_REF.payable));
  h = ov();
  let V = cbPreview(c, "ss", String(LY_SS_REF.payable));
  chk(
    "Count part of it says the percent and the dollars a month it counts, from the math",
    text(h).includes("This choice counts 83% of it: " + money(Math.round(V.ssCount)) + " a month") &&
      Math.abs(V.ssCount - V.ssMonth * 0.83) < 0.01
  );
  X("cbpick", "0");
  chk(
    "Not counting on it is an answer by itself, and says it counts none",
    c.x.ss === 0 && cbWayState(c, "ss").how === "no" && /This choice counts none of it/.test(text(ov()))
  );
  chk("with no part share held, Count part of it is 83% again", cbPartShare(c) === 0.83);
  X("cbpick", "1");
  X("cbdo", "count", "ss");
  chk(
    "Count all of it counts all of it",
    c.x.ss === 1 && !!cbCounted(c).ss && cbNumbers(c).could.target < cbNumbers(c).is.target
  );

  /* ---- 4. each way's drop is the number of its own math function ---- */
  cbStore(c).count = {};
  cbStore(c).how = {};
  ["shape", "ss"].forEach(id => {
    cbWaySets(id, c).forEach(o => {
      const P = cbPreview(c, id, o.v),
        p = cbParams(c);
      if (id === "ss" && p.ss) p.ss = Object.assign({}, p.ss, { year: p.ss.full * o.share });
      const a = lyNumbers(p, {}),
        b =
          id === "ss" && !(o.share > 0) ? a : lyNumbers(p, id === "shape" ? { shape: { bands: o.bands } } : { ss: {} }),
        R = lyReceipt(a.could, b.could);
      W = { kind: "cb", step: id, o: {}, pick: o.v };
      sheet(cbSheet);
      chk(
        "the drop of " + id + " (" + o.l + ") is lyNumbers before and after, and is on the screen",
        P.receipt.off === R.off && P.receipt.months === R.months && text(ov()).includes(cbReceiptWords(R)),
        [P.receipt, R]
      );
      if (id === "shape")
        chk(
          "the dollars of each band (" + o.l + ") come from the math",
          P.shown.length === o.bands.length &&
            P.shown.every(
              (s, i) =>
                Math.abs(s.year - p.spend * o.bands[i].f) < 0.01 &&
                text(ov()).includes(money(Math.round(s.year)) + " a year")
            )
        );
    });
  });

  /* ---- 5. the last screen follows the ways of the flow ---- */
  cbWayDo("shape", "count", "1");
  W = { kind: "cb", step: "reveal", o: {} };
  sheet(cbSheet);
  h = ov();
  chk(
    "the reveal promises nothing that is not built",
    W.step === "reveal" && !/coming/i.test(text(h)) && !/data-fid="cb:more"/.test(h)
  );
  chk(
    "it lists every way of the flow that can apply to this player, one tap away, with where each stands (Batch B, phase 2e: a way that cannot apply is behind the i of the stack)",
    cbWays().length >= 2 &&
      cbWays()
        .filter(w => cbStepInfo(c, w.id).applies)
        .every(w => new RegExp('data-a="cbquick" data-k="' + w.id + '"').test(h) && text(h).includes(w.title)) &&
      cbWays()
        .filter(w => !cbStepInfo(c, w.id).applies)
        .every(w => !new RegExp('data-a="cbquick" data-k="' + w.id + '"').test(h)) &&
      /aria-pressed="true">Spending eases as you age \u2713/.test(h) &&
      /data-a="cbquick" data-k="ss" aria-pressed="false"/.test(h)
  );
  chk(
    "no dead end: the last screen, the stack and Home",
    /data-a="cbgo" data-v="end"/.test(h) && /data-a="cbgo" data-v="stack"/.test(h) && /data-a="gohome"/.test(h)
  );
  /* a way that a later phase adds */
  /* the ways and the steps that are built now: a later phase adds its own, so the checks count from these */
  const n0 = CB_STEPS.length,
    ways0 = cbWays().map(w => w.id),
    steps0 = CB_STEPS.map(s => s.id).join(),
    nth = "Way " + (ways0.length + 1) + " of " + (ways0.length + 1);
  cbStepAdd("tpway", () => head(cbWayNo("tpway"), "A made-up way") + cbTop(C()) + cbFoot(), { title: "A made-up way" });
  cbStepAdd("tpcard", () => head("Between", "A made-up card") + cbTop(C()) + cbFoot());
  chk(
    "cbStepAdd puts a step before the last screen; one with a title is a way, one without is only a screen",
    CB_STEPS.length === n0 + 2 &&
      CB_STEPS[CB_STEPS.length - 1].id === "end" &&
      cbWays()
        .map(w => w.id)
        .join() === ways0.concat("tpway").join() &&
      cbWayNo("tpway") === nth &&
      cbWayNo("shape") === "Way 1 of " + (ways0.length + 1) &&
      cbWayNo("tpcard") === ""
  );
  sheet(cbSheet);
  h = ov();
  chk(
    "the reveal lists the new way with no other change, as not counted yet",
    /data-a="cbquick" data-k="tpway" aria-pressed="false"/.test(h) &&
      /A made-up way/.test(text(h)) &&
      !/data-k="tpcard"/.test(h)
  );
  const before = cbNumbers(c).could.target;
  cbCount("tpway", {});
  sheet(cbSheet);
  chk(
    "cbCount of the new way shows as Counted, and a key the math does not read moves no number",
    cbWayState(c, "tpway").counted &&
      cbNumbers(c).could.target === before &&
      (ov().match(/data-a="cbquick" data-k="[a-z]+" aria-pressed="true"/g) || []).length === 2
  );
  cbCount("tpway", false);
  go(ways0[ways0.length - 1]);
  /* a card between the ways (phase 3: the Yes, but card) is a screen of the flow and not a way: Next passes it */
  let hops = 0;
  do go("next");
  while (++hops < 6 && !CB_STEPS.find(s => s.id === W.step).way && W.step !== "end");
  chk(
    "Next from the last built way goes to the added way, then on to the last screen",
    W.step === "tpway" && text(ov()).includes(nth)
  );
  go("next");
  go("next");
  chk("after the added steps comes the reveal", W.step === "reveal");
  go("next");
  chk("the flow still ends on the last screen", W.step === "end");
  CB_STEPS.splice(
    CB_STEPS.findIndex(s => s.id === "tpway"),
    2
  );
  chk("the made-up steps are taken out again", CB_STEPS.map(s => s.id).join() === steps0);

  G = clone(G0);
  W = null;
}
