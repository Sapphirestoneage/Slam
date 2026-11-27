/* ============================================================================
   SLAM the Game, test: tests/flow-no-zeros-outside-tap.js
   PURPOSE     Examine run 14 (Nov 27 2026), items 8 to 13 of the usability pass on What it is / What it could
               be. Item 8: no screen of the flow reads "0 of"; the counter of the stack and the meter of the
               backups do not show before the first way is counted, on the stack and on the reveal. Item 9:
               the reveal is four blocks in the order the two numbers, the chart, the top moves, the row
               Keep it, share it, or tell Eli; the style lines put them side by side on a wide screen. Item
               10: a tap outside an open "i" closes it and the screen of the flow is there again; a tap
               outside a screen of the flow loses nothing; the style lines keep a number that changed from
               growing wider than the screen. (The widths themselves are measured in a real browser by
               tools/e2e/flow_walk.cjs: this harness has no layout.) Item 12: each counted way, each counted
               move and the Yes, but card can be undone, and the screen says how; a countdown shows the taps
               that are left and never reads 0; each of the four questions has one line of why. Item 13:
               one line comes before each button that leaves the flow.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Two made-up players: one
               who owes nothing, one with costly debt (a card balance).
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/cbguide.js (cbLeft, cbLeftWords, cbLeaves, cbOutTap),
               features/cbstack.js (cbStackLine), features/cbreveal.js (cbRevealView), features/couldbe.js
               (cbEntryView, cbWhyAsk, cbWayNav, CB_UNDO), features/cbmoves.js, features/cbyesbut.js,
               index.html (the style lines).
   ========================================================================= */
{
  const fs = require("fs"),
    path = require("path"),
    G0 = clone(G),
    css = fs.readFileSync(path.join(GAME_DIR, "index.html"), "utf8"),
    text = h => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "),
    fid = (h, id) => (h.split('data-fid="' + id + '"')[1] || "").split("data-fid=")[0],
    zero = h => (text(h).match(/\b0 of\b.{0,30}/) || [""])[0],
    start = () => {
      G = clone(G0);
      G.demo = true;
      W = null;
      SH = null;
      X("start");
    },
    owe = c => {
      c.debts = [{ k: "Credit card balance", amt: 18000, high: true, s: false, was: 18000 }];
      c.debtKinds = ["Credit card balance"];
      c.high = "yes";
      save();
      render();
    };

  /* ---- the style lines ---- */
  chk(
    "item 9: from 900 wide the reveal is two columns, the first the widest, and its sheet is wide enough for them",
    /@media \(min-width:900px\)\{\.sheet:has\(\.cbrevg\)\{max-width:1080px\}/.test(css) &&
      /\.cbrevg\{grid-template-columns:minmax\(0,1\.3fr\) minmax\(0,1fr\);align-items:start\}/.test(css) &&
      /\.cbrev1\{grid-column:1;grid-row:1\}\.cbrev2\{grid-column:2;grid-row:1\/span 2\}\.cbrev3\{grid-column:1;grid-row:2\}\.cbrev4\{grid-column:2;grid-row:3\}/.test(
        css
      )
  );
  chk(
    "item 9: on a phone the blocks are one column, and the numbers of the first block are the biggest of the flow",
    /\.cbrevg\{display:grid;grid-template-columns:minmax\(0,1fr\);gap:12px\}/.test(css) &&
      /\.cbrev1 \.cbnum \.dknum\{font-size:26px\}/.test(css) &&
      /\.cbnum \.dknum\{font-size:21px/.test(css)
  );
  chk(
    "item 10: on a screen of the flow a number that changed does not grow wider than the screen",
    /@keyframes cbflash\{0%\{[^}]*\}100%\{[^}]*\}\}/.test(css) &&
      !/@keyframes cbflash\{[^@]*transform/.test(css) &&
      css.includes(".sheet:has(.cbfoot) .flash{animation-name:cbflash}")
  );

  [
    ["nothing owed", null],
    ["costly debt", owe],
  ].forEach(([who, change]) => {
    const T = s => who + ", " + s,
      seen = [],
      look = name => {
        const h = ov();
        seen.push(name);
        chk(T(name + ': no count reads "0 of"'), !zero(h), zero(h));
        return h;
      };
    start();
    let h = look("What you want");

    /* ---- item 10: a tap outside ---- */
    X("wnpick", "early");
    X("cbi", "", "wants");
    chk(
      T('the "i" is a sheet of its own on top of the flow'),
      SH !== cbSheet && W.kind === "cb" && /What it is for/.test(ov())
    );
    chk(T('a tap outside the open "i" closes it'), cbOutTap() === true);
    chk(
      T("and the screen of the flow is there again, with the pick"),
      SH === cbSheet && W.step === "wants" && (W.wp || []).includes("early") && /What do you want\?/.test(ov())
    );
    chk(
      T("a tap outside a screen of the flow changes nothing"),
      cbOutTap() === false && SH === cbSheet && W.step === "wants"
    );
    X("wnnext");

    /* ---- item 12: the countdown and the why of each question ---- */
    CB_QS.forEach((Q, i) => {
      h = look("question " + (i + 1));
      const left = CB_QS.length - i;
      chk(
        T("question " + (i + 1) + ": the countdown says " + left + " left, and never 0"),
        text(fid(h, "cb:left")).includes(
          (left === 1 ? "1 tap left" : left + " taps left") + ", then your number. No typing needed."
        ) && !/\b0 taps? left/.test(text(h)),
        text(fid(h, "cb:left"))
      );
      chk(
        T("question " + (i + 1) + ": one line of why, tied to what the player picked"),
        text(fid(h, "cb:why")).includes("Asking because you picked Retire early. " + Q.y) && Q.y.length > 10
      );
      chk(
        T("question " + (i + 1) + ": the question itself is as the owner wrote it"),
        text(fid(h, "cb:q")).includes(Q.l)
      );
      if (i === 1) {
        X("cbi", "", "answers");
        chk(
          T('a tap outside the "i" of a question returns to the same question'),
          cbOutTap() && SH === cbSheet && W.step === "entry" && W.q === 1
        );
      }
      X("cbset", "", "", { q: Q.id, i: [1, 2, 3, 3][i] });
    });
    chk(
      T("with no pick the line of why starts with Why we ask"),
      cbWhyAsk({ o: { wants: [] } }, CB_QS[1]) === "Why we ask: " + CB_QS[1].y
    );
    const c = C();
    if (change) change(c);
    cbOpen("is");

    /* ---- the countdown of the screens to the result ---- */
    [
      ["is", 4],
      ["chart", 3],
      ["stack", 2],
      ["reveal", 1],
    ].forEach(([step, n]) => {
      X("cbgo", step);
      h = look(step);
      chk(
        T(step + ": " + n + (n === 1 ? " tap" : " taps") + " left to the result"),
        cbLeft().n === n &&
          text(fid(h, "cb:left")).includes((n === 1 ? "1 tap left" : n + " taps left") + " to your result."),
        cbLeft()
      );
    });
    /* the count is the taps on the main button of each screen */
    X("cbgo", "is");
    let taps = 0;
    for (; W.step !== "end" && taps < 9; taps++) {
      const main = (ov().match(/<button[^>]*class="[^"]*\bcbnext\b[^"]*"[^>]*data-v="([^"]+)"/) || [])[1];
      if (!main) break;
      X("cbgo", main);
    }
    chk(
      T("the main button of each screen reaches the result in the 4 taps the countdown names"),
      W.step === "end" && taps === 4,
      taps
    );
    h = look("the result");
    chk(T("the result has no countdown: nothing is left"), cbLeft() === null && !/data-fid="cb:left"/.test(h));

    /* ---- item 8: the stack before and after the first count ---- */
    X("cbgo", "stack");
    h = look("the stack, nothing counted");
    let S = cbStack(c);
    chk(
      T("the stack: no counter, no bar and no meter of the backups before the first way is counted"),
      S.stacked === 0 &&
        !/data-fid="cb:stackn"/.test(h) &&
        !/data-fid="cb:backups"/.test(h) &&
        !/dkprog|<progress/.test(fid(h, "cb:stack")) &&
        /Tap Count this on a row\. Your count shows here\./.test(text(h))
    );
    X("cbgo", "reveal");
    h = look("the reveal, nothing counted");
    chk(
      T("the reveal: no counter and no meter either, and the card to share has no count of 0"),
      !/data-fid="cb:stackn"/.test(h) &&
        !/data-fid="cb:backups"/.test(h) &&
        !/\b0 of\b/.test(cbPlanCard(cbReveal(c)).net)
    );

    /* ---- item 9: the four blocks of the reveal, in order ---- */
    const at = k => h.indexOf('data-fid="cb:rev' + k + '"');
    chk(
      T("the reveal: the two numbers, then the chart, then the top moves, then the row Keep it"),
      at(1) > 0 && at(1) < at(2) && at(2) < at(3) && at(3) < at(4) && h.indexOf('data-fid="cb:revgrid"') < at(1)
    );
    chk(
      T("block 1 holds the two big numbers (not the slim strip) and the difference"),
      /class="cbtop cbtopin"/.test(fid(h, "cb:rev1")) &&
        !/cbstrip/.test(h) &&
        h.indexOf('data-cbn="is"') > at(1) &&
        h.indexOf('data-cbn="could"') < at(2) &&
        h.indexOf('data-fid="cb:diff"') > at(1) &&
        h.indexOf('data-fid="cb:diff"') < at(2)
    );
    chk(
      T("block 2 holds the finished chart"),
      h.indexOf("The finished chart") > at(2) && h.indexOf("The finished chart") < at(3)
    );
    const top3 = cbTopMoves(c);
    chk(
      T("block 3 holds the top moves, at most 3, the same list as Next Steps, and each opens inside the flow"),
      top3.length > 0 &&
        top3.length <= 3 &&
        (h.match(/data-fid="cb:revtopmove"/g) || []).length === top3.length &&
        top3.every(r => h.includes('data-a="cbgo" data-v="move" data-k="' + r.id + '"')) &&
        h.indexOf('data-fid="cb:revtop"') > at(3) &&
        h.indexOf('data-fid="cb:revtop"') < at(4),
      top3.length
    );
    chk(
      T("block 4 is the closed row Keep it, share it, or tell Eli, with the three buttons in order"),
      h.indexOf('data-fid="cb:end3"') > at(4) &&
        !/data-fid="cb:end3" open/.test(h) &&
        /Keep my plan: make a free account<[\s\S]*Share my card<[\s\S]*Tell Eli what broke</.test(h.slice(at(4)))
    );
    chk(T("the one main button follows the blocks"), h.indexOf(">Next: my result<") > at(4));
    /* a move opened from the reveal returns to the reveal */
    X("cbgo", "move", top3[0].id);
    h = look("a move, from the reveal");
    chk(T("a top move opens inside the flow"), W.step === "move" && W.id === top3[0].id && W.from === "reveal");
    chk(
      T("item 13: one line comes before the button that leaves the flow for the full card"),
      /data-fid="cb:leave"[^>]*>The next button leaves these screens\. It opens the full card of this move\. Back brings you here again\.<\/div><button class="ghost wide" data-a="/.test(
        h
      )
    );
    /* ---- item 12: a counted move can be undone, and the screen says how ---- */
    X("cbmovedo", "count", top3[0].id);
    h = look("a move, counted");
    chk(
      T("a counted move says how to undo it, with no $0 line"),
      cbMoves(c).stacked === 1 &&
        text(fid(h, "cb:receipt")).includes("To undo, tap Not for me.") &&
        !/\$0 off/.test(text(h))
    );
    X("cbmovedo", "no", top3[0].id);
    chk(T("Not for me takes the move out again"), cbMoves(c).stacked === 0);
    X("cbgo", "prev");
    chk(T("Back from that move is the reveal"), W.step === "reveal");

    /* ---- item 8 and 12: the first count, the counter, undo on the stack ---- */
    X("cbgo", "stack");
    X("cbquick", "", "shape");
    h = look("the stack, one counted");
    S = cbStack(c);
    chk(
      T("after the first count the counter shows, with the way to undo"),
      S.stacked === 1 &&
        text(fid(h, "cb:stackn")).includes("1 of " + S.of + " counted") &&
        /To undo one, tap Counted on its row\./.test(text(h))
    );
    chk(
      T("the meter of the backups shows now, and none in place is said in words"),
      S.backups.m === 1 && S.backups.n === 0 && /Backups ready: none yet\. 1 to check/.test(text(fid(h, "cb:backups")))
    );
    X("cbgo", "reveal");
    look("the reveal, one counted");
    X("cbgo", "stack");
    X("cbquick", "", "shape");
    chk(
      T("a tap on Counted takes the way out again, and the counter goes"),
      cbStack(c).stacked === 0 && !/data-fid="cb:stackn"/.test(ov())
    );
    look("the stack, undone");

    /* ---- each way: the countdown, the words of Next, undo ---- */
    cbWays().forEach(w => {
      X("cbgo", w.id);
      h = look("the way " + w.id);
      const L = cbLeft(),
        I = cbStepInfo(c, w.id),
        st = CB_STEPS.find(s => s.id === w.id);
      chk(
        T(w.id + ": the countdown is 2 or more, and on the screen"),
        L && L.n >= 2 && text(fid(h, "cb:left")).includes(L.n + " taps left to your result."),
        L
      );
      chk(
        T(w.id + ": the button Next says where it goes"),
        /data-a="cbgo" data-v="next">(Next way|Next: the Yes, but card|Next: the reveal)</.test(h)
      );
      if (I.applies && typeof st.set === "function") {
        st.set("count");
        drawSheet();
        h = look("the way " + w.id + ", counted");
        chk(
          T(w.id + ": the receipt says how to undo"),
          cbWayState(c, w.id).counted && text(fid(h, "cb:receipt")).includes("To undo, tap Not for me.")
        );
        st.set("no");
        chk(T(w.id + ": Not for me takes it out again"), !cbWayState(c, w.id).counted);
      }
    });
    X("cbgo", "ss");
    chk(
      T("item 13: the chip of Social Security that is an answer by itself says so before the tap"),
      /A tap on Not counting on it is your answer: it leaves this way out\./.test(text(fid(ov(), "cb:waysub")))
    );

    /* ---- the Yes, but card ---- */
    X("cbgo", "yesbut");
    h = look("the Yes, but card");
    const Y = cbYb(c);
    if (Y.has) {
      if (Y.basis !== "values")
        chk(
          T("item 13: one line comes before the button that opens Is my money going where I want"),
          /data-fid="cb:leave"[^>]*>The next button leaves these screens\. It opens Is my money going where I want\?\. Back brings you here again\.<\/div><button class="ghost wide" data-a="values"/.test(
            h
          )
        );
      X("cbybpair", Y.pairs[0].b, Y.pairs[0].y);
      h = look("the Yes, but card, a pair on it");
      chk(
        T("a card with a pair has the button Undo: clear the card"),
        cbYbPick(c).n > 0 && /data-a="cbybclear">Undo: clear the card</.test(h)
      );
      X("cbybclear");
      chk(T("and it clears the card"), cbYbPick(c).n === 0);
    } else chk(T("with no spending lines the card says what it needs"), /This card needs your spending lines/.test(h));
    X("cbgo", "end");
    look("the result, at the end");
    chk(T("every screen of the flow was examined"), seen.length >= 20, seen.length);
  });

  /* ---- item 13: Home, the first move ---- */
  start();
  X("wnskip");
  [1, 2, 3, 3].forEach((i, k) => X("cbset", "", "", { q: CB_QS[k].id, i }));
  X("cbgo", "reveal");
  X("cbgo", "end");
  X("cbfirst");
  const F = cbHomeFirst(C(), derive(C())),
    home = app();
  chk(
    "item 13: the card Your first move on Home says what its button does, before the tap",
    !!F &&
      home.includes(
        F.canAdd ? "The button puts its steps on Next Steps. Then it opens the move." : "The button opens the move."
      ) &&
      home.indexOf('data-fid="cb:homefirstdoes"') < home.indexOf('data-a="cbfirstgo"')
  );
  G = clone(G0);
  W = null;
  SH = null;
  render();
}
