/* ============================================================================
   SLAM the Game: features/ask.js
   PURPOSE     One small question at a time, for "Make your numbers real". Each number has its own
               screen with five parts in the same order: what it is, one question, the answer buttons,
               why the game asks, and where to look.
   INPUT       The game: G.demo. The profile: c.x.none. The open sheet (W.kind): askdone. The taps of
               the player (the actions in OUTPUT).
   OUTPUT      8 functions. Parts of functions in other files: askSheet. Actions (ACT): askyes, askchg,
               askset, askidk, askrate, asklow, askback, asknone, askmore, rng, shopen.
   DEPENDS ON  core/report.js, core/engine.js, data/askwords.js (ASK, ASK_NONE: the questions),
               screens/ui.js, features/know.js.
   RULES       No question uses a money word that the screen did not explain. When a list is empty, the
               game asks the plain question first ("Do you owe money to anyone?"). After the last
               question, a short screen says what changed. The older action sharpdone (confirm all at
               one time) continues to operate below this file.
   STATE       W.st (the step), W.idk (the rows that stay a guess), c.x.none = {debt, inv} for a plain
               "no, none".
   ========================================================================= */
/* The icon of each area on the screen "Done" (UX pass, item 23: "💵 Cash: $X" and a small status tag). */
const ASK_ICON = {
  take: ["💵", "Money in"],
  spend: ["🛒", "Money out"],
  cash: ["💵", "Cash"],
  debt: ["💳", "You owe"],
  inv: ["📈", "Investments"],
};
function askFind(k, x) {
  const n = String(x.k || "");
  if (k === "debt") {
    if (/card/i.test(n)) return "Open the card's app. Look for Current balance.";
    if (/student/i.test(n)) return "Log in where you pay your student loan. Look for Total balance.";
    if (/famil|friend/i.test(n)) return "Ask them, or use your best memory. A close number is fine.";
    if (/medical/i.test(n)) return "Look at the newest bill. Find Amount due.";
  }
  return ASK[k].find;
}
function askKey(k, i) {
  return ASK[k].p + ":" + i;
}
function askKnown(c) {
  try {
    if (typeof kwAll === "function") {
      const K = kwAll(c, derive(c));
      return { k: K.known, t: K.total };
    }
  } catch (e) {
    report(e, "ask.js: askKnown");
  }
  return null;
}
function askParts(o) {
  return (
    (o.what ? `<div class="small muted">${o.what}</div>` : "") +
    o.body +
    `<div class="tile small askwhy"><b>Why we ask:</b> ${o.why}</div><div class="tiny muted"><b>Where to look:</b> ${o.find}</div>`
  );
}
function askBtn(a, label, cls, v) {
  return `<button class="${cls || "ghost"} wide" data-a="${a}"${v != null ? ` data-v="${v}"` : ""}>${label}</button>`;
}
/* Part of sharpSheet() in ui.js. One small question at a time, for the questions in ASK. For all other questions, it returns sharpSheetBase(). */
function askSheet() {
  const w = W,
    c = C(),
    k = w.q,
    A = ASK[k];
  if (!A || !w.o) return sharpSheetBase();
  const rows = w.o[A.rows] || [],
    N = ASK_NONE[k];
  w.ask = true;
  w.idk = w.idk || {};
  if (w.kn0 === undefined) w.kn0 = askKnown(c);
  if (!rows.length) {
    if (!N) return sharpSheetBase();
    if (w.st === "look")
      return (
        head("Make your numbers real", SHARP_Q[k]) +
        `<div class="tile"><b>Not sure? That is okay.</b><div class="small">Check these places. It takes about two minutes.</div></div><div class="stack" style="gap:6px">${N.look.map((x, i) => `<div class="tile small"><b>${i + 1}.</b> ${x}</div>`).join("")}</div>` +
        askBtn("asknone", N.no, "ghost", "no") +
        askBtn("asknone", N.yes, "ghost", "yes") +
        askBtn("close", "I'll check and come back", "ghost")
      );
    return (
      head("Make your numbers real", SHARP_Q[k]) +
      `<div class="tile"><h2 style="margin:0">${N.q}</h2></div><div class="small muted">Things like:</div><div class="stack" style="gap:4px">${N.like.map(x => `<div class="small">• ${x}</div>`).join("")}</div>` +
      askBtn("asknone", N.no, "primary go", "no") +
      askBtn("asknone", N.yes, "ghost", "yes") +
      askBtn("asknone", "I'm not sure", "ghost", "idk") +
      `<div class="tile small askwhy"><b>Why we ask:</b> ${N.why}</div>`
    );
  }
  if (w.st === "low" || w.st === "lowidk") {
    return (
      head("Make your numbers real", SHARP_Q[k]) +
      `<div class="tiny muted">Last question</div><div class="tile"><h2 style="margin:0">In a slow month, how much comes in, all together?</h2></div>` +
      askParts({
        what: "Your money changes month to month. Think of a bad month, not the worst ever.",
        body:
          numq("low", "Tap the closest amount", "low") +
          askBtn("asklow", "That's the amount", "primary go", "set") +
          askBtn("asklow", "I don't know yet", "ghost", "idk"),
        why: "A plan built on a slow month still works in a good one.",
        find: "Open your bank app. Find your lowest month this year.",
      })
    );
  }
  const i = Math.min(w.i || 0, rows.length - 1),
    x = rows[i],
    key = askKey(k, i),
    st = w.sti === i ? w.st || "amt" : "amt",
    v = x.amt || 0,
    top =
      (typeof allocBar === "function" ? allocBar(c, k, rows) : "") +
      `<div class="tiny muted">Question ${i + 1} of ${rows.length}</div><div class="tile"><div class="eyebrow">${esc(k === "debt" && typeof debtName === "function" ? debtName(x, c) : x.k)}</div><h2 style="margin:4px 0 0">${st === "rate" ? "Does this one charge 8% or more a year?" : A.q(x)}</h2></div>`,
    back = i > 0 || st !== "amt" ? askBtn("askback", "Back one", "ghost slim") : "";
  w.sti = i;
  w.st = st;
  if (st === "rate") {
    const dk = typeof DEBT_KINDS !== "undefined" ? DEBT_KINDS.find(d => d[0] === x.k) : null;
    return (
      head("Make your numbers real", SHARP_Q[k]) +
      top +
      askParts({
        what: "When you borrow money, you pay back extra. The extra is called interest. The yearly amount is a percent, and bills call it APR.",
        body:
          (dk
            ? `<div class="small">${dk[2] ? "This kind of debt almost always charges more than 8%." : "This kind of debt is often under 8%."}</div>`
            : "") +
          askBtn("askrate", "Yes, 8% or more", dk && dk[2] ? "primary go" : "ghost", "1") +
          askBtn("askrate", "No, less than 8%", dk && !dk[2] ? "primary go" : "ghost", "0") +
          askBtn("askrate", "I don't know", "ghost", "idk") +
          back,
        why: "Debt that charges 8% or more grows faster than savings do. The game puts that debt first.",
        find: "Look for the letters APR on your bill or in the lender's app.",
      })
    );
  }
  if (st === "chg" || (!(v > 0) && !x.s))
    return (
      head("Make your numbers real", SHARP_Q[k]) +
      top +
      askParts({
        what: k === "spend" ? SPEND_ONE[x.k] || null : A.what,
        body:
          numq(key, "Tap the closest amount", A.rk) +
          (k === "take" && typeof shiftPanel === "function" ? shiftPanel() : "") +
          (w.t && w.t[key] ? askBtn("askset", "That's the amount", "primary go") : "") +
          askBtn("askidk", "I don't know yet", "ghost") +
          back,
        why: A.why,
        find: askFind(k, x),
      })
    );
  return (
    head("Make your numbers real", SHARP_Q[k]) +
    top +
    askParts({
      what: k === "spend" ? SPEND_ONE[x.k] || null : A.what,
      body:
        `<div class="tile stack" style="gap:2px;text-align:center"><div class="tiny muted">${x.s ? "You told us" : "Our guess, from people like you"}</div><div class="bignum ${x.s ? "" : "guess"}">${money(v)}</div></div>` +
        askBtn("askyes", "Yes, about " + money(v), "primary go") +
        askChips(key, A.rk, v) +
        askBtn("askchg", "Type the exact amount", "ghost slim") +
        askBtn("askidk", "I don't know yet", "ghost") +
        back,
      why: A.why,
      find: askFind(k, x),
    })
  );
}
/* One tap answers the question: the closest amount moves on at once. The keypad stays one tap away. */
function askChips(key, rk, v) {
  const rs = (typeof RANGES !== "undefined" && RANGES[rk]) || [];
  if (!rs.length) return "";
  return `<div class="small muted" style="margin-top:4px">Or tap the closest amount</div><div class="chips">${rs
    .filter(r => r[0] !== v)
    .map(r => `<button class="chip" data-a="rng" data-k="${key}" data-v="${r[0]}">${r[1]}</button>`)
    .join("")}</div>`;
}
function askNext() {
  const w = W,
    c = C(),
    k = w.q,
    A = ASK[k],
    rows = w.o[A.rows];
  w.pad = null;
  if (w.i < rows.length - 1) {
    w.i++;
    w.st = "amt";
    w.sti = w.i;
    drawSheet();
    return;
  }
  if (k === "take" && c.steady !== "Steady" && w.st !== "low" && !w.lowdone) {
    w.st = "low";
    w.sti = w.i;
    drawSheet();
    return;
  }
  askFinish();
}
function askFinish() {
  const w = W,
    c = C(),
    k = w.q,
    A = ASK[k],
    o = w.o,
    pr = D.realm,
    rows = o[A.rows],
    real = rows.filter(x => x.s).length,
    kn0 = w.kn0;
  c[A.rows] = rows;
  if (k === "take" && w.lowdone === "set") {
    c.low = o.low;
    c.sharp.low = true;
  }
  afterMoney(c, pr, false);
  render();
  if (!c.placed && sharpPct(c) >= 100) {
    afterSharp(c);
    return;
  }
  const kn1 = askKnown(c),
    nx = sharpNext(c, todayISO()),
    left = rows.filter(x => !x.s);
  W = { kind: "askdone", q: k };
  sheet(
    () =>
      head("Done", SHARP_Q[k]) +
      `<div class="tile stack" style="gap:6px"><div class="row between bkdid"><span><span aria-hidden="true">${(ASK_ICON[k] || ["✓"])[0]}</span> <b>${esc((ASK_ICON[k] || [0, SHARP_Q[k]])[1])}: ${money(rows.reduce((t, x) => t + (+x.amt || 0), 0))}</b></span>${typeof kitPill === "function" ? kitPill(knSt(rows)) : ""}</div>${left.length ? `<div class="small">Still a guess: ${left.map(x => esc(x.k)).join(", ")}. That is fine. Come back when you have it.</div>` : ""}</div>` +
      (typeof allocBar === "function" ? allocBar(C(), k, null, { end: true }) : "") +
      `<div class="tile stack" style="gap:6px"><b>What that changed</b>${kn0 && kn1 && kn1.t === kn0.t && kn1.k !== kn0.k ? `<div class="small">You now know ${kn1.k} of ${kn1.t} things about your money. Before, it was ${kn0.k}.</div>` : ""}<div class="small">Every screen that uses ${SHARP_Q[k].toLowerCase()} now runs on your real ${real === 1 ? "number" : "numbers"}.</div></div>` +
      (nx
        ? `<div class="tile small"><b>What comes next:</b> ${SHARP_Q[nx]}. One small question at a time, same as this.</div>` +
          askBtn("askmore", "Keep going", "primary go") +
          askBtn("close", "Stop here for now", "ghost")
        : askBtn("close", "Done", "primary go"))
  );
}
Object.assign(ACT, {
  askyes: () => {
    const w = W;
    if (!w || w.kind !== "sharp" || !ASK[w.q]) return;
    const x = w.o[ASK[w.q].rows][w.i];
    x.s = true;
    delete w.idk[w.i];
    if (w.q === "debt" && x.amt > 0) {
      w.st = "rate";
      w.sti = w.i;
      drawSheet();
      return;
    }
    askNext();
  },
  askchg: () => {
    if (!W || W.kind !== "sharp") return;
    W.st = "chg";
    W.sti = W.i;
    W.pad = null;
    drawSheet();
  },
  askset: () => {
    const w = W;
    if (!w || w.kind !== "sharp" || !ASK[w.q]) return;
    ACT.askyes();
  },
  askidk: () => {
    const w = W;
    if (!w || w.kind !== "sharp" || !ASK[w.q]) return;
    const x = w.o[ASK[w.q].rows][w.i];
    x.s = false;
    w.idk[w.i] = 1;
    askNext();
  },
  askrate: t => {
    const w = W;
    if (!w || w.kind !== "sharp" || w.q !== "debt") return;
    const v = t.dataset.v;
    if (v !== "idk") w.o.debts[w.i].high = v === "1";
    askNext();
  },
  asklow: t => {
    const w = W;
    if (!w || w.kind !== "sharp") return;
    w.lowdone = t.dataset.v === "set" ? "set" : "idk";
    askFinish();
  },
  askback: () => {
    const w = W;
    if (!w || w.kind !== "sharp") return;
    w.pad = null;
    if (w.st === "chg" || w.st === "rate") {
      w.st = "amt";
      w.sti = w.i;
    } else if (w.i > 0) {
      w.i--;
      w.st = "amt";
      w.sti = w.i;
    }
    drawSheet();
  },
  asknone: t => {
    const w = W,
      c = C();
    if (!w || w.kind !== "sharp" || !ASK_NONE[w.q]) return;
    const k = w.q,
      v = t.dataset.v,
      N = ASK_NONE[k];
    if (v === "idk") {
      w.st = "look";
      drawSheet();
      return;
    }
    if (v === "yes") {
      rowAdd(ASK[k].rows);
      return;
    }
    if (!G.demo) {
      c.x = c.x || {};
      c.x.none = c.x.none || {};
      c.x.none[k] = todayISO();
      save();
    }
    render();
    const kn = askKnown(c);
    W = { kind: "askdone", q: k };
    sheet(
      () =>
        head("Done", SHARP_Q[k]) +
        `<div class="tile stack" style="gap:6px"><b>What you just did</b><div class="small bkdid"><span class="bktick">✓</span><span>${N.done}</span></div></div><div class="tile stack" style="gap:6px"><b>What that changed</b><div class="small">The game stops asking about this${kn ? ", and you now know " + kn.k + " of " + kn.t + " things about your money" : ""}. If it changes one day, add it in My Money.</div></div>` +
        askBtn("close", "Done", "primary go")
    );
  },
  askmore: () => {
    closeSheet();
    afterSharp(C());
  },
});
(() => {
  const _r = ACT.rng;
  ACT.rng = t => {
    const w = W,
      k = t.dataset.k;
    if (w && w.kind === "sharp" && w.ask && ASK[w.q] && k) {
      if (k[1] === ":" && k[0] === ASK[w.q].p) {
        w.i = +k.slice(2);
        w.sti = w.i;
      }
      padSet(k, +t.dataset.v);
      w.t = w.t || {};
      w.t[k] = true;
      w.err = false;
      if (k === "low") {
        drawSheet();
        return;
      }
      return ACT.askset();
    }
    return _r(t);
  };
})();
(() => {
  const _so = ACT.shopen;
  ACT.shopen = () => {
    const w = W;
    if (w && w.kind === "sharp" && w.ask && w.q === "take") {
      w.shift = { row: w.i || 0, n: null, per: null };
      w.st = "chg";
      w.sti = w.i;
      drawSheet();
      return;
    }
    return _so();
  };
})();
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
