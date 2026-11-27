/* ============================================================================
   SLAM the Game: features/cbyesbut.js
   PURPOSE     What it is / What it could be, Batch B phase 3 (Nov 27 2026): the "Yes, but" card. One
               screen between the ways to shrink the number and the ways to get there sooner. The top
               half is "Yes": the player taps a cut that they make or would make. The bottom half is
               "But": the player taps what they keep or upgrade because of it. Each half shows its price
               in months, and the net is in the middle. All taps, no typing. The game suggests pairs
               from the values the player ranked. The card can be saved as an image.
   INPUT       The profile: the spending lines of the player (c.spends), the ranked values and what each
               line serves (c.x.vals, through vlGet and vlServes of features/values.js), and the card
               (c.x.cb.yb). The open sheet (W.kind cb, W.step yesbut, W.msg: the line after a save).
   OUTPUT      Math: CBY_SIZE, cbYbStep, cbYbImp, cbYbOrder, cbYbPick (the card: the two halves and the
               net), cbYb (the card with each line, its price, and the pairs), cbYbSet, cbYbCard (the
               words of the image), cbYbBookRows. Views: cbYbView, cbYbStackRow (part of cbStackView in
               cbstack.js), cbYbPaint (the image). Actions (ACT): cbyb, cbybtap, cbybsize, cbybpair,
               cbybclear, cbybsave, cbybsend.
   DEPENDS ON  core/report.js, features/strat.js (stgImpact: the month-by-month goal run of the game),
               features/cbmoves.js (cbMoveWords), features/values.js (vlGet, vlServes, vlStep),
               core/metrics.js (knSt), features/couldbe.js (cbStore, cbTop, cbFoot, cbM, cbWayNav,
               cbStepAdd, cbOpen), features/kit.js (kitPill, kitInfo, kitTerms), screens/dash.js
               (dkCard), account/trust.js (TRUST_LINE), screens/ui.js (head, mathBox, esc).
   RULES       Months has one engine here: stgImpact() of strat.js, the same run as Moves to try and as
               the moves of the stack. A cut is spending that goes down by its dollars a month; a keep
               that is upgraded is spending that goes up. The net is one more run with both changes, so
               it can differ a little from the two prices subtracted. The size of a step is vlStep() of
               values.js (to the $10, at least $10). The card is a what-if: it changes no spending line
               and neither of the two pinned numbers. A cut is a choice, never a repair: no verdict on
               a line that is cut and none on one that is kept. The image has the names of the lines
               and the months, and no dollar amount.
   COMPAT      One more optional key: c.x.cb.yb { yes: [line names], but: [line names], ys, bs (the size
               of each half) }. An old saved game has none.
   STATE       None.
   ========================================================================= */
/* The sizes of each half: [id, label, share of the line, the words on the image]. They are choices of the player,
   not rates from outside. */
const CBY_SIZE = {
  yes: [
    ["10", "A tenth", 0.1, "a tenth less"],
    ["25", "A quarter", 0.25, "a quarter less"],
    ["50", "Half", 0.5, "half as much"],
  ],
  but: [
    ["0", "Keep as it is", 0, "kept as it is"],
    ["10", "A tenth more", 0.1, "a tenth more"],
    ["25", "A quarter more", 0.25, "a quarter more"],
  ],
};
/* The most pairs the screen suggests, and the most lines of a half on the image. */
const CBY_PAIRS = 3,
  CBY_LINES = 4;
/* The dollars a month of one step: a share of the line, with the rounding of vlStep() (values.js). A cut is never
   more than the line. */
function cbYbStep(amt, share, cut) {
  if (!(share > 0) || !(amt > 0)) return 0;
  const v = vlStep(amt * share * 10);
  return cut ? Math.min(amt, v) : v;
}
/* Months sooner (plus) or later (minus) when spending changes by `monthly` dollars (plus: less spending). The one
   engine: stgImpact() of strat.js. */
function cbYbImp(c, monthly) {
  return stgImpact(c, { save: monthly, take: 0, equity: 0, once: 0, hours: 0, value: monthly }, "full");
}
/* The spending lines with an amount, and the card as it is stored (only lines that still exist). */
function cbYbRead(c) {
  const s = (c.x && c.x.cb && c.x.cb.yb) || {},
    rows = (c.spends || []).filter(r => (r.amt || 0) > 0),
    size = (half, id) => CBY_SIZE[half].find(z => z[0] === id) || CBY_SIZE[half][0],
    keep = list => (list || []).filter(k => rows.some(r => r.k === k));
  return { rows, yes: keep(s.yes), but: keep(s.but), ys: size("yes", s.ys), bs: size("but", s.bs) };
}
/* The order of the lines for the suggestions. With ranked values and at least one line that has its values: the
   best place of a value that the line serves (0 is the top value; a line that serves none is last). Without: by
   size. Returns { basis (values or size), yes (the lines, the first is the first cut to suggest), but }. */
function cbYbOrder(c, rows) {
  const V = vlGet(c),
    place = r => {
      const s = vlServes(V, r.k);
      if (s === null) return null;
      return s.length
        ? Math.min.apply(
            null,
            s.map(v => V.rank.indexOf(v))
          )
        : V.rank.length;
    },
    P = rows.map(r => ({ r, p: place(r) })),
    known = P.filter(x => x.p !== null);
  if (!V.rank.length || !known.length)
    return {
      basis: "size",
      yes: rows.slice().sort((a, b) => b.amt - a.amt),
      but: rows.slice().sort((a, b) => a.amt - b.amt),
    };
  const rest = P.filter(x => x.p === null).map(x => x.r);
  return {
    basis: "values",
    yes: known
      .slice()
      .sort((a, b) => b.p - a.p || b.r.amt - a.r.amt)
      .map(x => x.r)
      .concat(rest),
    but: known
      .slice()
      .sort((a, b) => a.p - b.p || b.r.amt - a.r.amt)
      .map(x => x.r)
      .concat(rest),
  };
}
/* THE CARD: the two halves and the net. { has (there are spending lines), n (lines tapped), yes and but: { names,
   size (the label), sizeWords, month (dollars a month), imp, words }, net: { month, imp, words, months }, st }. */
function cbYbPick(c) {
  const R = cbYbRead(c),
    half = (keys, z, cut) => {
      const list = R.rows.filter(r => keys.includes(r.k)),
        month = list.reduce((t, r) => t + cbYbStep(r.amt, z[2], cut), 0),
        imp = list.length ? cbYbImp(c, cut ? month : -month) : null;
      return {
        list,
        names: list.map(r => r.k),
        size: z[1],
        sizeWords: z[3],
        month,
        imp,
        words: imp ? cbMoveWords(imp) : "",
      };
    },
    yes = half(R.yes, R.ys, true),
    but = half(R.but, R.bs, false),
    n = yes.list.length + but.list.length,
    month = yes.month - but.month,
    imp = n ? cbYbImp(c, month) : null,
    picked = yes.list.concat(but.list);
  return {
    has: R.rows.length > 0,
    n,
    yes,
    but,
    net: { month, imp, words: imp ? cbMoveWords(imp) : "", months: imp && imp.fi != null ? imp.fi : null },
    st: knSt(picked.length ? picked : R.rows),
  };
}
/* THE CARD WITH ITS LISTS. cbYbPick plus: sizes (the chips of each half), yes and but .rows (each line: { i (its
   place in c.spends), name, amt, month, words, on, other (it is in the other half) }, in the order of the
   suggestions), pairs ([{ y, b (places in c.spends), yn, bn, words }]), basis, ranked (values are ranked). */
function cbYb(c) {
  const R = cbYbRead(c),
    P = cbYbPick(c),
    O = cbYbOrder(c, R.rows),
    at = r => (c.spends || []).indexOf(r),
    line = (r, z, cut, mine, theirs) => {
      const month = cbYbStep(r.amt, z[2], cut);
      return {
        i: at(r),
        name: r.k,
        amt: r.amt,
        month,
        words: cbMoveWords(cbYbImp(c, cut ? month : -month)),
        on: mine.includes(r.k),
        other: theirs.includes(r.k),
      };
    },
    chips = (half, cur) => CBY_SIZE[half].map(z => ({ id: z[0], label: z[1], on: z === cur })),
    pairs = [];
  O.yes.forEach((y, n) => {
    const rest = O.but.filter(r => r !== y),
      b = rest[Math.min(n, rest.length - 1)];
    if (!b || pairs.length >= CBY_PAIRS || pairs.some(p => p.yn === y.k && p.bn === b.k)) return;
    pairs.push({
      y: at(y),
      b: at(b),
      yn: y.k,
      bn: b.k,
      words: cbMoveWords(cbYbImp(c, cbYbStep(y.amt, R.ys[2], true) - cbYbStep(b.amt, R.bs[2], false))),
      on: P.yes.names.length === 1 && P.but.names.length === 1 && P.yes.names[0] === y.k && P.but.names[0] === b.k,
    });
  });
  P.yes.rows = O.yes.map(r => line(r, R.ys, true, R.yes, R.but));
  P.but.rows = O.but.map(r => line(r, R.bs, false, R.but, R.yes));
  return Object.assign(P, {
    sizes: { yes: chips("yes", R.ys), but: chips("but", R.bs) },
    pairs,
    basis: O.basis,
    ranked: vlGet(c).rank.length > 0,
  });
}
/* Change the card. what: tap (half, i: one line in or out; a line is in one half only), size (half, id), pair (y, b:
   the two places in c.spends), clear. */
function cbYbSet(what, a, b) {
  const c = C(),
    s = cbStore(c),
    R = cbYbRead(c),
    yb = { yes: R.yes.slice(), but: R.but.slice(), ys: R.ys[0], bs: R.bs[0] },
    row = i => (c.spends || [])[+i];
  if (what === "tap" && (a === "yes" || a === "but") && row(b) && row(b).amt > 0) {
    const k = row(b).k,
      other = a === "yes" ? "but" : "yes";
    if (yb[a].includes(k)) yb[a] = yb[a].filter(x => x !== k);
    else {
      yb[a].push(k);
      yb[other] = yb[other].filter(x => x !== k);
    }
  } else if (what === "size" && CBY_SIZE[a] && CBY_SIZE[a].some(z => z[0] === b)) yb[a === "yes" ? "ys" : "bs"] = b;
  else if (what === "pair" && row(a) && row(b) && row(a) !== row(b)) {
    yb.yes = [row(a).k];
    yb.but = [row(b).k];
  } else if (what === "clear") {
    yb.yes = [];
    yb.but = [];
  } else return null;
  s.yb = yb;
  save();
  return cbYbPick(c);
}
/* The words of the image: no dollar amount, only the names of the lines and the months. */
function cbYbCard(P) {
  const names = h =>
    h.names
      .slice(0, CBY_LINES)
      .map(n => n + ", " + h.sizeWords)
      .concat(h.names.length > CBY_LINES ? ["and " + (h.names.length - CBY_LINES) + " more"] : []);
  return {
    brand: "SLAM the Game",
    title: "Yes, but",
    yes: { label: "Yes", lines: P.yes.names.length ? names(P.yes) : ["No cut on this card"], words: P.yes.words },
    net: P.net.words,
    but: { label: "But", lines: P.but.names.length ? names(P.but) : ["No keep on this card"], words: P.but.words },
    foot: "A what-if on my own numbers. " + (typeof TRUST_LINE === "string" ? TRUST_LINE : ""),
    file: "slam-yes-but.png",
  };
}
/* Part of cbBook() in couldbe.js. The spreadsheet of the plan: the dollars a month of each half, and the net. */
function cbYbBookRows(c) {
  try {
    const P = cbYbPick(c);
    if (!P.n) return [];
    return [
      { id: "cb_ybyes", label: "Yes, but: the cuts on the card, a month", v: P.yes.month },
      { id: "cb_ybbut", label: "Yes, but: the upgrades on the card, a month", v: P.but.month },
      {
        id: "cb_ybnet",
        label: "Yes, but: the net change of spending a month (the cuts less the upgrades)",
        v: P.net.month,
        f: "={cb_ybyes}-{cb_ybbut}",
      },
    ];
  } catch (e) {
    report(e, "cbyesbut.js: cbYbBookRows");
    return [];
  }
}

/* ---------- THE VIEWS ---------- */
/* Part of cbStackView() in cbstack.js. The row of the card, between the two groups of the stack. */
function cbYbStackRow(c) {
  const P = cbYbPick(c);
  if (!P.has) return "";
  return dkCard(
    "Yes, but: a cut that pays for a keep",
    `<button class="rowbtn" style="margin-top:6px;min-height:48px" data-a="cbgo" data-v="yesbut" data-fid="cb:ybrow"><span><b>${P.n ? "Your card: " + esc(P.net.words.replace(/^./, m => m.toLowerCase())) : "Make a card"}</b><div class="tiny muted">${P.n ? "Tap to change it, or to save it as an image." : "Two taps: one cut, and what you keep because of it."}</div></span><span class="caret">›</span></button>`,
    { cap: "A what-if between the two groups. It changes no number on this screen." }
  );
}
/* One half of the card: the size chips, the lines, the price of the half. */
function cbYbHalf(Y, half) {
  const H = Y[half],
    cut = half === "yes";
  return (
    `<div class="chips cbybsz" data-fid="cbyb:${half}size">${Y.sizes[half].map(z => `<button class="chip ${z.on ? "on" : ""}" data-a="cbybsize" data-k="${half}" data-v="${z.id}" aria-pressed="${z.on ? "true" : "false"}">${esc(z.label)}</button>`).join("")}</div>` +
    `<div class="stack" style="gap:6px;margin-top:8px" data-fid="cbyb:${half}">${H.rows
      .map(
        r =>
          `<button class="rowbtn cbybrow ${r.on ? "on" : ""}" data-a="cbybtap" data-k="${half}" data-i="${r.i}" aria-pressed="${r.on ? "true" : "false"}"><span style="min-width:0"><b>${esc(r.name)}</b><div class="tiny muted">${r.month > 0 ? cbM(r.month) + " a month " + (cut ? "less" : "more") + ". " : ""}${esc(r.words)}.${r.other ? " Now in the other half: a tap moves it here." : ""}</div></span><span class="cbybin">${r.on ? "On the card ✓" : "Tap to add"}</span></button>`
      )
      .join("")}</div>` +
    `<div class="tile small cbybsum" data-fid="cbyb:${half}sum"><div class="row between" style="gap:8px"><span class="dklabel">${cut ? "The price of your Yes" : "The price of your But"}</span></div><b class="cbdropn">${H.names.length ? esc(H.words) : cut ? "Tap a cut above" : "Tap a keep above"}</b>${H.names.length ? `<div class="tiny muted">${H.month > 0 ? cbM(H.month) + " a month " + (cut ? "less" : "more") + " on " : "No change on "}${H.names.length === 1 ? esc(H.names[0]) : H.names.length + " lines"}.</div>` : ""}</div>`
  );
}
/* THE SCREEN of the card. */
function cbYbView() {
  const c = C(),
    Y = cbYb(c),
    can = typeof navigator !== "undefined" && typeof navigator.canShare === "function";
  if (!Y.has)
    return (
      head("Yes, but", "A cut that pays for a keep") +
      cbTop(c) +
      `<div class="tile small" data-fid="cbyb:none"><b>This card needs your spending lines.</b> The rest of setup makes them, in five short rounds. Then each line can be a cut or a keep here.</div>` +
      cbWayNav(true) +
      cbFoot()
    );
  return (
    head("Yes, but", "A cut that pays for a keep") +
    cbTop(c) +
    `<div class="row between" style="gap:8px;align-items:flex-start"><div class="small">Yes: tap a cut you make, or would make. But: tap what you keep or upgrade because of it. A cut is a choice. It pays for what you care about more.</div>${kitInfo("cbyesbut")}</div>` +
    dkCard(
      "Pairs to try",
      `<div class="stack" style="gap:6px;margin-top:6px" data-fid="cbyb:pairs">${Y.pairs
        .map(
          p =>
            `<button class="rowbtn cbybrow ${p.on ? "on" : ""}" data-a="cbybpair" data-k="${p.y}" data-v="${p.b}" aria-pressed="${p.on ? "true" : "false"}"><span style="min-width:0"><b>Yes: ${esc(p.yn)}. But: ${esc(p.bn)}.</b><div class="tiny muted">Net: ${esc(p.words.replace(/^./, m => m.toLowerCase()))}.</div></span><span class="cbybin">${p.on ? "On the card ✓" : "Use this pair"}</span></button>`
        )
        .join("")}</div>` +
        (Y.basis === "values"
          ? ""
          : `<button class="ghost wide" data-a="values">${Y.ranked ? "Say what each line is for" : "Rank what matters to me"}</button>`),
      {
        cap:
          Y.basis === "values"
            ? "From what you ranked: the cut is the line that serves your top values least, the keep is the one that serves them most."
            : "By size for now: the biggest line as the cut, the smallest as the keep. Any Yes can go with any But.",
        right: kitInfo("cbybpairs"),
      }
    ) +
    dkCard("Yes: a cut you make, or would make", cbYbHalf(Y, "yes"), {
      cap: "How big a cut, then tap one line or more.",
      cls: "cbybhalf",
    }) +
    `<div class="tile cbdrop cbybnet" data-fid="cbyb:net"><div class="row between" style="gap:8px"><span class="dklabel">The net ${kitInfo("cbybnet")}</span>${kitPill(Y.st)}</div><b class="cbdropn" data-fid="cbyb:netn">${Y.n ? esc(Y.net.words) : "Tap one line in each half"}</b><div class="tiny muted">${Y.n ? (Y.net.month === 0 ? "No change of spending a month. " : cbM(Math.abs(Y.net.month)) + " a month " + (Y.net.month > 0 ? "less" : "more") + " spending, with both halves. ") + "A what-if: it changes none of your lines, and the two numbers on top stay." : "Your Yes less your But, as one run of your plan."}</div></div>` +
    dkCard("But: what you keep or upgrade because of it", cbYbHalf(Y, "but"), {
      cap: "Keep it as it is, or give it more. Then tap one line or more.",
      cls: "cbybhalf",
    }) +
    (Y.n
      ? `<button class="ghost wide" data-a="cbybsave" data-fid="cbyb:save">Save this card as an image</button>` +
        (can ? `<button class="ghost wide" data-a="cbybsend">Send the image with an app on this device</button>` : "") +
        (W && W.msg ? `<div class="small" data-fid="cbyb:msg">${esc(W.msg)}</div>` : "") +
        `<div class="tiny muted">The image has the names of the lines you tapped and the months. It has no dollar amount, and nothing else about you. Nothing leaves until you send it.</div>` +
        `<button class="ghost wide" data-a="cbybclear">Start the card again</button>`
      : "") +
    mathBox([
      "A step: the share of the line you picked, to the nearest $10, at least $10. It is the same step as on Is my money going where I want.",
      "Months sooner or later: the game runs your plan month by month, with the change of spending and without it, and compares the month each one reaches your FI number. It is the same engine as Moves to try. Less spending helps twice: more is saved each month, and the FI number is smaller.",
      "The net: one more run with both changes together (" +
        (Y.n ? cbM(Y.yes.month) + " less, " + cbM(Y.but.month) + " more" : "your Yes less your But") +
        "). It can differ by a month or so from the two prices subtracted, because each month saved early counts for more.",
      "To keep a line as it is costs nothing more: it is already in your date.",
      Y.st === "Guess"
        ? "This is a Guess: the lines you tapped are still spread from one total. The rest of setup makes them yours."
        : "",
      "The card changes no spending line and neither of the two numbers on top. To make a cut real, change the line on My Money.",
    ]) +
    cbWayNav(Y.n > 0) +
    cbFoot()
  );
}
/* THE IMAGE. Draws the words of cbYbCard() on a canvas, in the standard look (the colors of the root of the page, not
   of a look that is switched on). Returns the canvas, or null when the page cannot draw. */
function cbYbPaint(card) {
  if (typeof document === "undefined" || !document.createElement) return null;
  const cv = document.createElement("canvas"),
    x = cv.getContext ? cv.getContext("2d") : null;
  if (!x) return null;
  const Wd = 1080,
    Hd = 1350,
    pad = 72,
    cs = typeof getComputedStyle === "function" ? getComputedStyle(document.documentElement) : null,
    col = (n, d) => ((cs && cs.getPropertyValue(n)) || "").trim() || d,
    ink = col("--ink", "#02061a"),
    panel = col("--panel2", "#0b1a47"),
    lineC = col("--line", "#1d3684"),
    text = col("--text", "#f5f8ff"),
    muted = col("--muted", "#8fa3e6"),
    sap = col("--sap", "#3f6dff"),
    fam =
      (typeof getComputedStyle === "function" && document.body && getComputedStyle(document.body).fontFamily) ||
      "system-ui, sans-serif",
    font = (px, bold) => (x.font = (bold ? "700 " : "400 ") + px + "px " + fam),
    box = (y, h, stroke, fill) => {
      const r = 28,
        l = pad,
        w = Wd - 2 * pad;
      x.beginPath();
      x.moveTo(l + r, y);
      x.arcTo(l + w, y, l + w, y + h, r);
      x.arcTo(l + w, y + h, l, y + h, r);
      x.arcTo(l, y + h, l, y, r);
      x.arcTo(l, y, l + w, y, r);
      x.closePath();
      x.fillStyle = fill;
      x.fill();
      x.lineWidth = 3;
      x.strokeStyle = stroke;
      x.stroke();
    },
    /* the words of one line, broken to the width; returns the y after the last line */
    wrap = (s, l, y, w, lh, max) => {
      const words = String(s).split(/\s+/),
        out = [];
      let cur = "";
      words.forEach(wd => {
        const t = cur ? cur + " " + wd : wd;
        if (cur && x.measureText(t).width > w) {
          out.push(cur);
          cur = wd;
        } else cur = t;
      });
      if (cur) out.push(cur);
      out.slice(0, max || 9).forEach(t => {
        x.fillText(t, l, y);
        y += lh;
      });
      return y;
    },
    half = (H, y, h) => {
      box(y, h, lineC, panel);
      x.fillStyle = muted;
      font(34, true);
      x.fillText(H.label.toUpperCase(), pad + 40, y + 66);
      x.fillStyle = text;
      font(40, false);
      let yy = y + 128;
      H.lines.forEach(l => {
        yy = wrap(l, pad + 40, yy, Wd - 2 * pad - 80, 50, 1);
      });
      if (H.words) {
        x.fillStyle = text;
        font(46, true);
        wrap(H.words, pad + 40, y + h - 44, Wd - 2 * pad - 80, 54, 1);
      }
    };
  cv.width = Wd;
  cv.height = Hd;
  x.fillStyle = ink;
  x.fillRect(0, 0, Wd, Hd);
  x.textBaseline = "alphabetic";
  x.fillStyle = muted;
  font(32, true);
  x.fillText(card.brand, pad, 104);
  x.fillStyle = text;
  font(92, true);
  x.fillText(card.title, pad, 206);
  half(card.yes, 250, 400);
  box(674, 150, sap, ink);
  x.fillStyle = muted;
  font(30, true);
  x.fillText("THE NET", pad + 40, 726);
  x.fillStyle = text;
  font(56, true);
  wrap(card.net || "", pad + 40, 792, Wd - 2 * pad - 80, 60, 1);
  half(card.but, 848, 400);
  x.fillStyle = muted;
  font(28, false);
  wrap(card.foot, pad, 1296, Wd - 2 * pad, 36, 2);
  return cv;
}
/* Make the image and hand it on. how: save (a file on this device) or send (the share sheet of the device). */
function cbYbImage(how) {
  const say = m => {
    if (W && W.kind === "cb") {
      W.msg = m;
      drawSheet();
    }
  };
  try {
    const card = cbYbCard(cbYbPick(C())),
      cv = cbYbPaint(card);
    if (!cv || typeof cv.toBlob !== "function")
      return say("This browser cannot make the image. A screenshot works too.");
    cv.toBlob(b => {
      try {
        if (!b) return say("This browser cannot make the image. A screenshot works too.");
        if (how === "send" && typeof File === "function" && typeof navigator.share === "function") {
          const f = new File([b], card.file, { type: "image/png" });
          if (!navigator.canShare || navigator.canShare({ files: [f] })) {
            const p = navigator.share({ files: [f], title: card.title });
            /* closing the share sheet of the device is not an error (AbortError) */
            if (p && p.catch)
              p.catch(e => {
                if (!e || e.name !== "AbortError") report(e, "cbyesbut.js: cbYbImage (1)");
              });
            return;
          }
        }
        const a = document.createElement("a"),
          url = URL.createObjectURL(b);
        a.href = url;
        a.download = card.file;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        say("Saved. Look for " + card.file + " where this device keeps its downloads.");
      } catch (e) {
        report(e, "cbyesbut.js: cbYbImage (2)");
        say("The image did not save. A screenshot works too.");
      }
    }, "image/png");
  } catch (e) {
    report(e, "cbyesbut.js: cbYbImage (3)");
    say("The image did not save. A screenshot works too.");
  }
}
Object.assign(ACT, {
  /* open the card from another screen (the famous money idea) */
  cbyb: () => cbOpen("yesbut"),
  /* one line in or out of a half */
  cbybtap: t => {
    if (!W || W.kind !== "cb") return;
    W.msg = "";
    cbYbSet("tap", t.dataset.k, t.dataset.i);
    drawSheet();
  },
  /* the size of a half */
  cbybsize: t => {
    if (!W || W.kind !== "cb") return;
    W.msg = "";
    cbYbSet("size", t.dataset.k, t.dataset.v);
    drawSheet();
  },
  /* a suggested pair: one tap sets both halves */
  cbybpair: t => {
    if (!W || W.kind !== "cb") return;
    W.msg = "";
    cbYbSet("pair", t.dataset.k, t.dataset.v);
    drawSheet();
  },
  cbybclear: () => {
    if (!W || W.kind !== "cb") return;
    W.msg = "";
    cbYbSet("clear");
    drawSheet();
  },
  cbybsave: () => {
    if (!W || W.kind !== "cb") return;
    cbYbImage("save");
  },
  cbybsend: () => {
    if (!W || W.kind !== "cb") return;
    cbYbImage("send");
  },
});
kitTerms({
  cbyesbut: [
    "Yes, but",
    "A trade in two halves. Yes: a cut you make, or would make. But: what you keep, or give more to, because of that cut. Each half has a price in months: how much sooner or later you reach your FI number. The net in the middle is both together. It is a what-if on your own spending lines. It changes none of them. What has to go right: the cut lasts, month after month. Backup if it doesn't: your date at today's pace does not count on this card, and the game recalculates when your real lines change.",
  ],
  cbybnet: [
    "The net",
    "The months sooner or later with both halves together: your cuts, less what you give more to. The game runs your plan once more with both changes, so the net can differ by a month or so from the two prices subtracted. The FI number is 25 times a year of spending, so less spending helps twice: you save more each month, and the number you need is smaller.",
  ],
  cbybpairs: [
    "Pairs to try",
    "When you have ranked what matters to you, and said what each spending line is for (Is my money going where I want, on Me), the game suggests the cut from the line that serves your top values least and the keep from the line that serves them most. Until then it goes by size only: the biggest line as the cut, because a share of it frees the most, and the smallest as the keep, because it costs the least to protect. That order says nothing about what you should cut. Any Yes can go with any But.",
  ],
});
cbStepAdd("yesbut", () => cbYbView());
