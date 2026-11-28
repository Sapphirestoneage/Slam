/* ============================================================================
   SLAM the Game, test: tests/what-it-could-be-stack.js
   PURPOSE     Examine Batch B, phases 2d, 2e and 2f (Nov 27 2026), the stack of What it is / What it could
               be. The chart leads to one screen with every way in two groups. Inside a group the biggest
               effect for this player is first. A way that cannot apply is not in the list: it is behind an
               "i" with the reason. The moves before FI are the cards of the Strategy Engine, the levers and
               the multipliers, and the months sooner of each is the number of the engine's own function
               (stgImpact). A counter shows how many are stacked, and a meter how many backups are in place.
               A backup changes no number, and What it is never moves. A new player reaches the last screen
               in few taps.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. Made-up players.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: features/cbstack.js (cbStack, cbStackView, cbStackLine,
               cbBackupRow), features/cbmoves.js (cbMoves, cbMoveDo, cbMoveView), features/couldbe.js
               (cbStepInfo, cbStepNear, cbWays, cbNumbers, cbWayState), features/strat.js (stgScore,
               stgImpact, stgX), features/lever.js (lvLevers), features/mult.js (muAll, muGet).
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
    go = (v, k) => X("cbgo", v, k),
    quick = k => X("cbquick", "", k),
    same = (a, b) =>
      a.is.target === b.is.target &&
      a.is.age === b.is.age &&
      a.could.target === b.could.target &&
      a.could.age === b.could.age;

  /* ---- 1. a new player: the taps from the landing to the last screen ---- */
  G = clone(G0);
  G.demo = true;
  W = null;
  let taps = 0;
  const tap = (a, v, k, x) => {
    taps++;
    X(a, v, k, x);
  };
  tap("start");
  tap("wnskip"); /* What you want (run SLAM-ONBOARD-1): Skip for now */
  tap("cbset", "", "", { q: "age", i: 1 });
  tap("cbset", "", "", { q: "spend", i: 2 });
  tap("cbset", "", "", { q: "inv", i: 3 });
  tap("cbset", "", "", { q: "save", i: 3 });
  let c = C();
  const first = taps,
    N0 = cbNumbers(c);
  chk("the first number comes in 6 taps", first === 6 && W.step === "is");
  tap("cbgo", "next");
  let h = ov();
  chk("Next on the chart goes to the stack", W.step === "chart" && /data-a="cbgo" data-v="stack"/.test(h));
  tap("cbgo", "stack");
  h = ov();
  chk(
    "the stack is one screen of the flow, with the two pinned numbers and the one advice line",
    W.step === "stack" && /data-fid="cb:top"/.test(h) && text(h).includes(TRUST_LINE)
  );
  chk("the screen is clean: no undefined, no long dash, no verdict word", junk(h) === "", junk(h));
  tap("cbgo", "reveal");
  chk(
    "a new player who counts nothing reaches the reveal in 9 taps: the flow is not a forced march",
    W.step === "reveal" && /data-a="cbgo" data-v="reveal"/.test(h) && taps === 9,
    taps
  );
  go("stack");
  taps = 8;
  let S = cbStack(c);
  S.after.slice(0, 3).forEach(w => tap("cbquick", "", w.id));
  tap("cbgo", "reveal");
  chk(
    "with three ways counted from the list it is 12 taps",
    W.step === "reveal" && taps === 12 && cbStack(c).stacked === 3,
    taps
  );
  S.after.slice(0, 3).forEach(w => quick(w.id));
  chk("a second tap in the list takes a way out again", cbStack(c).stacked === 0 && cbNumbers(c).same);

  /* ---- 2. sorted by the biggest effect; what cannot apply is behind the i, with why (phase 2e) ---- */
  go("stack");
  h = ov();
  S = cbStack(c);
  const mo = w => (w.receipt && w.receipt.months != null ? w.receipt.months : -1e9),
    off = w => (w.receipt && w.receipt.off != null ? w.receipt.off : -1e15);
  chk(
    "after work: the way with the most months sooner is first, then the most dollars off",
    S.after.length >= 3 &&
      S.after.every(
        (w, i) => !i || mo(S.after[i - 1]) > mo(w) || (mo(S.after[i - 1]) === mo(w) && off(S.after[i - 1]) >= off(w))
      )
  );
  chk(
    "each drop in the list is the drop of the way's own math function",
    S.after.every(w => JSON.stringify(w.receipt) === JSON.stringify(cbStepInfo(c, w.id).receipt)) &&
      JSON.stringify(S.after.find(w => w.id === "flex").receipt) === JSON.stringify(cbFlexPlan(c).receipt) &&
      JSON.stringify(S.after.find(w => w.id === "shape").receipt) === JSON.stringify(cbPreview(c, "shape").receipt)
  );
  chk(
    "the tax way and money that shows up later cannot apply to the four taps: they are not in the list",
    S.afterHidden.map(w => w.id).join() === "taxplan,later" &&
      S.afterHidden.every(w => w.why.length > 30) &&
      !S.after.some(w => w.id === "taxplan" || w.id === "later")
  );
  const hidden = h.match(/<details class="math cbhid"[\s\S]*?<\/details>/g) || [],
    list = (h.match(/data-fid="cb:after">[\s\S]*?<details/) || [""])[0];
  chk(
    "they are behind an i that is closed until tapped, each with its reason and a way to open it",
    hidden.length === 2 &&
      !/<details[^>]*open/.test(hidden[0]) &&
      /class="i"/.test(hidden[0]) &&
      /data-a="cbgo" data-v="taxplan"/.test(hidden[0]) &&
      text(hidden[0]).includes(S.afterHidden[0].why) &&
      !/data-v="taxplan"/.test(list)
  );
  chk(
    "Next and Back pass over a way that cannot apply",
    cbStepNear(c, "ss", 1) === "flex" &&
      /* after the last way that applies: the Yes, but card (phase 3), then the last screen */
      cbStepNear(c, "flex", 1) === "yesbut" &&
      cbStepNear(c, "yesbut", 1) === "reveal" &&
      cbStepNear(c, "reveal", 1) === "end" &&
      cbStepNear(c, "yesbut", -1) === "flex" &&
      cbStepNear(c, "flex", -1) === "ss"
  );
  chk(
    "the reveal lists only the ways that can apply",
    (() => {
      go("reveal");
      const e = ov();
      go("stack");
      return (
        /data-a="cbquick" data-k="flex"/.test(e) &&
        !/data-a="cbquick" data-k="taxplan"/.test(e) &&
        /data-fid="cb:stack"/.test(e)
      );
    })()
  );

  /* ---- 3. before FI: the existing cards and their own months sooner (phase 2d) ---- */
  const M = cbMoves(c),
    all = M.shown.concat(M.hidden);
  chk(
    "every move of the Strategy Engine is in the stack, shown or behind the i",
    STRATEGIES.every(s => all.some(r => r.id === "stg:" + s.id)) &&
      ["match", "hsa", "bank", "welcome", "househack", "raise", "side"].every(id => all.some(r => r.id === "stg:" + id))
  );
  chk(
    "the months sooner of each move is the number of the engine's own function (stgImpact, through stgScore)",
    all
      .filter(r => r.src === "stg")
      .every(r => {
        const sc = stgScore(
          c,
          STRATEGIES.find(s => s.id === r.key)
        );
        return r.months === (sc.imp.fi == null ? null : sc.imp.fi) && r.imp === sc.imp;
      })
  );
  const d = derive(c),
    lv = lvLevers(c, d).find(x => x.k === "spend"),
    mu = muAll(c, d).P.find(x => x.k === "card"),
    rowLv = all.find(r => r.id === "lv:spend"),
    rowMu = all.find(r => r.id === "mu:card");
  chk(
    "a lever and a multiplier give their own dollars a year, and the same engine turns them into months",
    rowLv.month === lv.yr / 12 &&
      rowLv.months ===
        stgImpact(c, { save: lv.yr / 12, take: 0, equity: 0, once: 0, hours: 0, value: lv.yr / 12 }, "full").fi &&
      rowMu.month === mu.yr / 12 &&
      rowMu.months ===
        stgImpact(c, { save: 0, take: mu.yr / 12, equity: 0, once: 0, hours: 0, value: mu.yr / 12 }, "full").fi
  );
  chk(
    "the moves are sorted by the biggest effect for this player",
    M.shown.filter(r => !r.already).every((r, i, a) => !i || a[i - 1].days >= r.days) && M.shown[0].days > 0
  );
  chk(
    "a move that cannot apply is hidden with the reason of its own card",
    M.hidden.length > 0 &&
      M.hidden
        .filter(r => r.src === "stg")
        .every(
          r =>
            r.why ===
              stgVerdict(
                c,
                STRATEGIES.find(s => s.id === r.key)
              ).why && r.why.length > 10
        ) &&
      text(hidden[1]).includes(M.hidden[0].why)
  );
  chk(
    "the list shows the first three moves and each bonus move that fits (run CC-1, item 23), and one tap shows all",
    (h.match(/data-fid="cb:stkmove"/g) || []).length === cbMovesFirst(M.shown, 3).length &&
      cbMovesFirst(M.shown, 3).length >= 3 &&
      cbMovesFirst(M.shown, 3).length <= 5 &&
      /data-a="cbstkall"/.test(h)
  );
  X("cbstkall");
  chk(
    "Show all lists every move that can apply",
    (ov().match(/data-fid="cb:stkmove"/g) || []).length === M.shown.length
  );
  const top = M.shown[0];
  go("move", top.id);
  h = ov();
  chk("a move opens inside the flow", W.step === "move" && W.id === top.id && text(h).includes(top.name));
  chk("the screen is clean", junk(h) === "", junk(h));
  chk(
    "it has the pattern of a way: the two numbers, one line, the i, the drop, three buttons, Show the math, the way back, the advice line",
    /data-fid="cb:top"/.test(h) &&
      text(h).includes(top.one) &&
      new RegExp('data-k="term:' + top.term + '"').test(h) &&
      /data-fid="cb:drop"/.test(h) &&
      text(h).includes(top.words) &&
      ["count", "did", "no"].every(v =>
        new RegExp('data-a="cbmovedo" data-k="' + top.id + '" data-v="' + v + '"').test(h)
      ) &&
      /Show the math/.test(h) &&
      /data-a="cbgo" data-v="stack"/.test(h) &&
      /data-a="strat" data-v="/.test(h) &&
      text(h).includes(TRUST_LINE)
  );
  chk(
    "the i of each move has what has to go right and the backup",
    all.every(
      r =>
        GLOSS[r.term] && /What has to go right/.test(GLOSS[r.term][1]) && /Backup if it doesn't/.test(GLOSS[r.term][1])
    )
  );
  chk("months sooner is in months", /^\d+ months? sooner$/.test(top.words), top.words);
  X("cbmovedo", "count", top.id);
  h = ov();
  S = cbStack(c);
  chk(
    "Count this puts the move in the stack, with a receipt, and the two numbers stay (it moves the date)",
    c.x.cb.how[top.id] === "count" && S.stacked === 1 && /data-fid="cb:receipt"/.test(h) && same(cbNumbers(c), N0)
  );
  chk(
    "the stack shows the months of the counted moves together, from the same engine",
    S.movesSum.n === 1 && S.movesSum.words === top.words
  );
  X("cbmovedo", "did", "stg:match");
  chk(
    "Already doing it writes the move's own answer (c.x.stg), and it is stacked as already yours",
    stgX(c, "match").already === true &&
      cbMoves(c).shown.find(r => r.id === "stg:match").how === "did" &&
      cbStack(c).stacked === 2
  );
  X("cbmovedo", "no", "stg:match");
  chk("Not for me takes it out again", stgX(c, "match").already === false && cbStack(c).stacked === 1);
  X("cbmovedo", "count", "mu:card");
  chk("a multiplier that is counted is switched on on the multipliers board, its one home", muGet(c).on.card === 1);
  X("cbmovedo", "no", "mu:card");
  X("cbmovedo", "no", top.id);
  chk("and off again", !muGet(c).on.card && cbStack(c).stacked === 0);
  go("next");
  chk("Next from a move goes back to the stack", W.step === "stack");

  /* ---- 4. the counter and the backups (phase 2f) ---- */
  h = ov();
  S = cbStack(c);
  chk(
    "the counter counts from the ways that can apply to this player, and shows no count while nothing is counted (run 14, item 8)",
    S.stacked === 0 &&
      S.of === S.after.length + S.moves.length &&
      !/\b0 of\b/.test(text(h)) &&
      !/data-fid="cb:stackn"/.test(h) &&
      !/data-fid="cb:backups"/.test(h) &&
      /Tap Count this on a row\. Your count shows here\./.test(text(h))
  );
  quick("shape");
  S = cbStack(c);
  chk(
    "a counted way is stacked, and its backup is on the meter as not in place",
    S.stacked === 1 &&
      S.backups.m === 1 &&
      S.backups.n === 0 &&
      text(ov()).includes("1 of " + S.of + " counted") &&
      /Backups ready: none yet\. 1 to check/.test(text(ov())) &&
      !/\b0 of\b/.test(text(ov()))
  );
  const Nfull = cbNumbers(c);
  cbWayDo("shape", "count", "0.5");
  chk("half as much easing is the backup of the spending shape: in place by the choice", cbStack(c).backups.n === 1);
  cbWayDo("shape", "count", "1");
  chk(
    "the full shape again: not in place, and the number is what it was (a backup that is missing makes no number smaller)",
    cbStack(c).backups.n === 0 && same(cbNumbers(c), Nfull)
  );
  cbWayDo("ss", "count", String(cbPartShare(c)));
  chk("counting part of Social Security is its backup", cbStack(c).backups.m === 2 && cbStack(c).backups.n === 1);
  X("cblaterset", "", "pension", { i: 1 });
  quick("later");
  S = cbStack(c);
  const Nb = cbNumbers(c);
  chk(
    "a way with a backup the game cannot read has one tap for it",
    S.backups.m === 3 && S.backups.n === 1 && /data-a="cbbk" data-k="later"/.test(cbBackupRow(c, "later"))
  );
  X("cbbk", "", "later");
  chk(
    "the tap puts the backup in place, and changes no number",
    cbStack(c).backups.n === 2 && c.x.cb.bk.later === true && same(cbNumbers(c), Nb)
  );
  X("cbbk", "", "later");
  chk("a second tap takes it out", cbStack(c).backups.n === 1 && !c.x.cb.bk.later);
  go("shape");
  h = ov();
  chk(
    "the screen of a way shows its backup and whether it is in place, with no grade",
    /data-fid="cb:backup"/.test(h) && /Not in place yet/.test(text(h)) && junk(h) === ""
  );
  quick("flex");
  chk(
    "the backup of flexible withdrawals is read from the needs: they fit inside the deepest cut, or they do not",
    cbStack(c).after.find(w => w.id === "flex").backupOn === cbFlexPlan(c).needsFit
  );
  chk(
    "What it is never moved, and What it could be is not above it (no cost is counted)",
    cbNumbers(c).is.target === N0.is.target && cbNumbers(c).is.age === N0.is.age && !cbNumbers(c).above
  );
  chk(
    "the backups have their own explanation, and it says the number is not made smaller",
    /never makes What it could be smaller/.test(GLOSS.cbbackups[1])
  );
  go("stack");
  h = ov();
  chk("the stack with ways counted is clean", junk(h) === "", junk(h));
  chk(
    "the counter is on the reveal too",
    (() => {
      go("reveal");
      return /data-fid="cb:stackn"/.test(ov()) && /data-fid="cb:backups"/.test(ov()) && junk(ov()) === "";
    })()
  );
  G = clone(G0);
}
