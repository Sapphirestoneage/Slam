/* ============================================================================
   SLAM the Game: account/livescreen.js
   PURPOSE     Live Session Mode, Part 6: the two screens during the call, and the plan at its end.
               The coach's screen: on the left the client's profile as it fills in, on the right the
               card "Next question to ask", then the heard list. The client's screen: calm. Four top
               numbers, a Recalculating line when one moves, and "Show details" for the full profile.
               After End, both sides have "Show plan": the era, the top 3 moves, the next payday task.
   INPUT       The profile c of the client (the device that holds the game works out the view and sends
               it; the other device shows what arrives). The room controller R with R.fill and R.game.
   OUTPUT      Values only: lsLevel, lsProfile, lsNums, lsRecalc, lsNext, lsConfirmSay, lsPlan, lsView.
               HTML: lsMark, lsProfileHTML, lsNextHTML, lsHeardHTML, lsNumsHTML, lsPlanHTML,
               livePartCoach, livePartClient. The page: lsAttach, lsClick, lsToggle.
   DEPENDS ON  core/engine.js (derive, freeToSpend, goalSim, debtOutlook, candidates, paySuggest,
               applyTypical, sharpList order, ERAS, periods, nextPayAfter, todayISO), core/recalc.js
               (rcRoute, rcWords, rcYm, rcAddMonths, rcMonthName), data/askwords.js (ASK, ASK_NONE),
               account/liveflag.js (liveRowMark), account/livefill.js (LF, LF_FIELDS, lfField, lfAskOf),
               account/liveland.js (lfStore, lfTarget, lfMoneyText, lfWhatifLine), account/live.js.
               session.html loads this file.
   RULES       No number is worked out here a second way: each one comes from a function of the game.
               No question is written here: the card says the words of "one small question at a time"
               (ASK, ASK_NONE), in the order in which the game asks (take, spend, cash, debt, inv), and
               skips each line that is already known or was heard in this call.
               Each number has its mark: Guess, Close or Exact. No red, no verdict on a number.
               During the call there is nothing to press but Pause and End. "Show details" is the one
               other control on the client's screen. Collapsed by default.
   STATE       R.ls = { view, open, glow, pulse, details, plan, nums, recalc } for one room.
   ========================================================================= */
const LS_AREAS = [
  ["income", "Income"],
  ["housing", "Housing"],
  ["debts", "Debts"],
  ["accounts", "Accounts"],
  ["bills", "Bills"],
];
const LS_HEARD_SHOW = 3; /* the heard list shows its last 3 items */
const LS_RECALC_MS = 20000; /* the Recalculating line stays this long after a top number moved */
const lsEsc = s =>
  String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
/* session.html has no screens/ui.js. The kit of screens/dash.js (dkCard, dkTile) calls esc(): on that page it
   is this same escape. In the game, ui.js has esc and this line does nothing. */
if (typeof esc === "undefined" && typeof window !== "undefined") window.esc = lsEsc;
/* The order in which the game asks for its money numbers: sharpList() of core/engine.js (take, spend, cash,
   then debt and inv when the profile has such rows; a gentle profile asks about debt last). An area with no
   rows yet gets the plain first question of ASK_NONE, in the same place. */
function lsAskOrder(t) {
  const l = sharpList(t).filter(k => ASK[k]);
  ["debt", "inv"].forEach(k => {
    if (l.indexOf(k) < 0) l.push(k);
  });
  return t.gentle ? l.filter(k => k !== "debt").concat(["debt"]) : l;
}

/* ---------- values only ---------- */
/* The mark of a list of rows of the game: Guess (a row that is not made real, or no row), Exact (each one
   checked against a statement), or Close. */
function lsLevel(rows) {
  const r = (rows || []).filter(Boolean);
  if (!r.length || r.some(x => !x.s)) return "Guess";
  return r.every(x => (x.cf || 0) >= 3) ? "Exact" : "Close";
}
/* The lowest of some marks. */
function lsLowest(list) {
  return list.indexOf("Guess") >= 0 ? "Guess" : list.indexOf("Close") >= 0 ? "Close" : "Exact";
}
/* The profile by the areas of the review: income, housing, debts, accounts, bills. One row for each row of
   the game: { id, label, show, lv, tag, keys, parts }. tag: "heard", "confirmed out loud", "waiting for your
   next Confirming" or "". keys: the fields of the call that fill this row (a screen glows on them). */
function lsProfile(c) {
  const L = lfStore(c),
    out = LS_AREAS.map(a => ({ area: a[0], name: a[1], rows: [] })),
    put = (area, row) => out.find(g => g.area === area).rows.push(row),
    row = (area, sec, x, per) => {
      const rowKey = sec + ":" + x.k,
        fields = LF_FIELDS.filter(f => {
          const t = lfTarget(f.id);
          return t && t.type === "row" && t.rowKey === rowKey;
        }),
        keys = fields.map(f => f.id),
        wait = keys.some(k => L.wait[k]),
        rr = L.rows[rowKey],
        parts = rr ? Object.keys(rr.parts).filter(p => p !== "all") : [];
      put(area, {
        id: rowKey,
        label: x.k,
        show: lfMoneyText(x.amt) + (per || ""),
        lv: lsLevel([x]),
        tag: wait ? "waiting for your next Confirming" : liveRowMark(c, sec, x),
        keys,
        parts: parts.length ? parts.map(p => p + " " + lfMoneyText(rr.parts[p])).join(" + ") : "",
      });
    };
  const fm = L.marks["pay.freq"];
  if (c.led || fm)
    put("income", {
      id: "pay.freq",
      label: "How often you get paid",
      show: c.payFreq || "",
      lv: fm && c.payFreq === fm.v ? (fm.lv === "close" ? "Close" : "Guess") : c.payKnown ? "Close" : "Guess",
      tag: L.wait["pay.freq"]
        ? "waiting for your next Confirming"
        : fm && c.payFreq === fm.v
          ? fm.lv === "close"
            ? "confirmed out loud"
            : "heard"
          : "",
      keys: ["pay.freq"],
      parts: "",
    });
  if (!c.led) return out;
  (c.incs || []).forEach(x => row("income", "incs", x, " a month"));
  (c.spends || []).forEach(x => row(x.k === "Home" ? "housing" : "bills", "spends", x, " a month"));
  (c.debts || []).forEach(x => {
    row("debts", "debts", x, "");
    const id = "rate:" + x.k,
      m = L.marks[id];
    if (x.rate != null && isFinite(+x.rate))
      put("debts", {
        id,
        label: x.k + ": the rate",
        show: +x.rate + "% a year",
        lv: x.ratecf == null ? "Exact" : x.ratecf >= 2 ? "Close" : "Guess",
        tag: L.wait[id]
          ? "waiting for your next Confirming"
          : m && +x.rate === m.v && x.ratecf != null
            ? m.lv === "close"
              ? "confirmed out loud"
              : "heard"
            : "",
        keys: [id],
        parts: "",
      });
  });
  (c.cashes || []).forEach(x => row("accounts", "cashes", x, ""));
  (c.invs || []).forEach(x => row("accounts", "invs", x, ""));
  return out;
}
/* The month that is n months from today, as "Mar 2027" (core/recalc.js, the same names as Recalculating). */
function lsMonth(n, today) {
  return rcMonthName(rcAddMonths(rcYm(today), Math.ceil(n)));
}
/* THE FOUR TOP NUMBERS of the calm screen. Each one comes from a function of the game:
   free to spend: freeToSpend(). next goal date: goalSim(). net worth: derive().nw. high-interest debt-free
   date: debtOutlook(). Each gives { id, label, show, sub, lv, kind: "money" | "date", n (a number to compare:
   dollars, or months from today; null when there is none) }. */
function lsNums(c, today) {
  today = today || todayISO();
  if (!c || !c.led) return [];
  const d = derive(c),
    f = freeToSpend(c, d),
    inOut = lsLowest([lsLevel(c.incs), lsLevel(c.spends)]),
    own = lsLowest(
      [lsLevel(c.cashes)].concat(c.invs.length ? [lsLevel(c.invs)] : [], c.debts.length ? [lsLevel(c.debts)] : [])
    ),
    out = [];
  const tight = f.free <= 0 || f.short > 0;
  out.push({
    id: "free",
    label: "Free to spend",
    show: tight ? "$0 a week" : lfMoneyText(f.week) + " a week",
    sub: tight ? "tight right now" : lfMoneyText(f.free) + " a month",
    lv: inOut,
    kind: "money",
    n: tight ? 0 : f.week,
  });
  /* the next goal: the placed goal with the first date, else the first date of any goal on the list */
  const open = (c.goals || []).filter(g => !g.done),
    placed = open.filter(g => g.era != null),
    sim = open.length ? goalSim(c, placed.length ? {} : { all: true }) : null,
    dated = (placed.length ? placed : open)
      .map(g => ({ g, at: sim.goalAt[g.id] }))
      .filter(o => o.at != null)
      .sort((a, b) => a.at - b.at)[0];
  out.push(
    !open.length
      ? {
          id: "goal",
          label: "Next goal date",
          show: "No goal yet",
          sub: "It shows here when you have one",
          lv: "",
          kind: "date",
          n: null,
        }
      : dated
        ? {
            id: "goal",
            label: "Next goal date",
            show: dated.at <= 0 ? "Ready now" : lsMonth(dated.at, today),
            sub: dated.g.n,
            what: dated.g.n,
            lv: lsLowest([inOut, own, dated.g.s ? "Close" : "Guess"]),
            kind: "date",
            n: Math.ceil(dated.at),
          }
        : {
            id: "goal",
            label: "Next goal date",
            show: "No date yet",
            sub: open[0].n,
            what: open[0].n,
            lv: "Guess",
            kind: "date",
            n: null,
            open: true,
          }
  );
  out.push({
    id: "worth",
    label: "Net worth",
    show: (d.nw < 0 ? "-" : "") + lfMoneyText(Math.round(Math.abs(d.nw))),
    sub: "what you own minus what you owe",
    lv: own,
    kind: "money",
    n: Math.round(d.nw),
  });
  const o = debtOutlook(c, d),
    dl = lsLowest([inOut, c.debts.length ? lsLevel(c.debts) : "Close"]);
  out.push(
    !o
      ? {
          id: "debt",
          label: "High-interest debt-free",
          show: "None right now",
          sub: "no debt at 8% or more",
          lv: c.debts.length ? lsLevel(c.debts) : "",
          kind: "date",
          n: null,
        }
      : o.grow
        ? {
            id: "debt",
            label: "High-interest debt-free",
            show: "No date yet",
            sub: "on today's numbers",
            lv: dl,
            kind: "date",
            n: null,
            open: true,
          }
        : {
            id: "debt",
            label: "High-interest debt-free",
            show: lsMonth(o.mo, today),
            sub: lfMoneyText(Math.round(o.bal)) + " at 8% or more",
            lv: dl,
            kind: "date",
            n: o.mo,
          }
  );
  return out;
}
/* A top number moved. The words are the words of Recalculating (core/recalc.js, rcWords): a date that moves
   sooner reads as a win ("New route"), a date that moves later reads calm. A dollar number says what it was
   and what it is. Gives null (nothing moved), or { title, win, lines: [{ id, text }] }. */
function lsRecalc(before, after, today) {
  if (!before || !before.length || !after || !after.length) return null;
  today = today || todayISO();
  const lines = [];
  let win = true;
  after.forEach(n => {
    const p = before.find(x => x.id === n.id);
    if (!p || (p.show === n.show && p.n === n.n)) return;
    if (n.kind === "date" && p.n != null) {
      const r = rcRoute({ planAt: today, planMonths: p.n, nowAt: today, months: n.n, open: !!n.open }),
        w = r ? rcWords(r, { what: n.id === "debt" ? "Debt free" : n.what || "Your goal date" }) : null;
      if (w) {
        if (!w.win) win = false;
        lines.push({ id: n.id, text: w.line });
        return;
      }
      if (r === null && n.n == null) {
        lines.push({ id: n.id, text: n.label + ": " + n.show.toLowerCase() + "." });
        return;
      }
      return;
    }
    win = false;
    lines.push({
      id: n.id,
      text:
        n.kind === "date"
          ? n.label + ": " + n.show + "."
          : n.label + " was " + p.show + ". From what was just heard it is " + n.show + ".",
    });
  });
  return lines.length ? { title: win ? "New route" : "Recalculating", win, lines } : null;
}
/* The words that open the handshake for one field: "Confirming rent 1,850". The phrase is checked with the
   reader of the call itself (lfAskOf): a phrase that the reader would not read as this field and this number
   is not shown. Gives "" when there is none. */
function lsConfirmSay(id, v) {
  const f = lfField(id);
  if (!f || v == null || (f.kind !== "money" && f.kind !== "rate")) return "";
  const num = f.kind === "rate" ? v + " percent" : Math.round(v).toLocaleString("en-US"),
    tail = f.area === "income" ? " a month" : "",
    words = (f.w || "")
      .split("|")
      .filter(w => /^[a-z ]+$/.test(w))
      .concat(f.kind === "rate" ? [f.label.replace(": the rate", "").toLowerCase() + " rate"] : []);
  /* the short spoken word first ("rent"), then the label of the field ("rent or housing") */
  for (const w of words.concat([f.label.toLowerCase()])) {
    const say = "Confirming " + w + " " + num + tail,
      a = lfAskOf(say, null);
    if (a && !a.bad && a.id === id && Math.abs(a.v - v) < 0.005) return say;
  }
  return "";
}
/* THE NEXT QUESTION TO ASK. The order is the order of the game (lsAskOrder: sharpList), and the words are the words
   of "one small question at a time" (ASK and ASK_NONE in data/askwords.js). A line is skipped when it is
   known (made real, or Exact), when a call set it (heard), or when this call already heard an answer for it
   that waits for the review. On a profile with no rows yet, the rows are the first rows that the game's own
   setup would make (applyTypical on a copy).
   Gives { q: { k, row, say, what, listen } or null, confirm: { id, label, say, show } or null, left }. */
function lsNext(c, sid) {
  const L = lfStore(c),
    t = c.led ? c : JSON.parse(JSON.stringify(c)),
    asked = {},
    list = [];
  if (!c.led) {
    t.goals = t.goals || [];
    applyTypical(t);
  }
  L.heard.forEach(x => {
    if (sid && x.sid !== sid) return;
    const tg = x.key ? lfTarget(x.key) : null;
    if (tg && tg.rowKey) asked[tg.rowKey] = true;
  });
  lsAskOrder(t).forEach(k => {
    const A = ASK[k],
      rows = t[A.rows] || [];
    if (!rows.length && ASK_NONE[k]) {
      const said = (c.x && c.x.none && c.x.none[k]) || Object.keys(asked).some(r => r.indexOf(A.rows + ":") === 0);
      if (!said) list.push({ k, row: "", say: ASK_NONE[k].q, what: ASK_NONE[k].like.join(". ") + ".", listen: [] });
      return;
    }
    rows.forEach(x => {
      const rowKey = A.rows + ":" + x.k;
      if (x.s || x.h || (x.cf || 0) >= 3 || asked[rowKey]) return;
      list.push({
        k,
        row: x.k,
        say: A.q(x),
        what: A.what || "",
        listen: LF_FIELDS.filter(f => {
          const tg = lfTarget(f.id);
          return tg && tg.type === "row" && tg.rowKey === rowKey;
        }).map(f => f.label),
      });
    });
  });
  /* the handshake: the oldest Guess of this call that a "Confirming" can raise to Close */
  let confirm = null;
  Object.keys(L.marks)
    .map(id => L.marks[id])
    .filter(m => m.lv === "guess" && (!sid || m.sid === sid) && !L.wait[m.id])
    .sort((a, b) => (a.at || 0) - (b.at || 0))
    .some(m => {
      const tg = lfTarget(m.id);
      if (!tg || tg.type === "freq") return false;
      const x = (c[tg.sec] || []).find(r => r.k === tg.k);
      if (tg.type === "row" && !liveOurs(x, L.rows[tg.rowKey])) return false;
      const say = m.rough ? "" : lsConfirmSay(m.id, m.v),
        f = lfField(m.id);
      if (!say && !m.rough) return false;
      confirm = {
        id: m.id,
        label: f.label,
        show: f.kind === "rate" ? m.v + "%" : lfMoneyText(m.v),
        say,
        rough: !!m.rough,
      };
      return true;
    });
  return { q: list[0] || null, confirm, left: list.length };
}
/* THE PLAN at the end of the call: the era (derive), the top 3 moves (candidates, the list behind bestMove),
   and the next payday task (paySuggest). guess: the plan rests on a number that is still a Guess. */
function lsPlan(c, today) {
  today = today || todayISO();
  if (!c || !c.led) return null;
  const d = derive(c),
    f = freeToSpend(c, d),
    lv = lsLowest(
      [lsLevel(c.incs), lsLevel(c.spends), lsLevel(c.cashes)].concat(c.debts.length ? [lsLevel(c.debts)] : [])
    ),
    per = (f.goal * 12) / periods(c.payFreq),
    sug = paySuggest(c, d, per);
  let next = c.payKnown && c.payNext && c.payNext < "9000" ? c.payNext : null;
  for (let i = 0; next && next < today && i < 60; i++) next = nextPayAfter(next, c.payFreq);
  return {
    name: c.name,
    era: ERAS[d.era].n,
    eraOne: ERAS[d.era].one,
    lv,
    moves: candidates(c, d, today)
      .slice(0, 3)
      .map(m => ({ title: m.title, why: m.why, tag: m.tag })),
    pay: {
      when: next,
      freq: c.payFreq,
      split: Object.keys(sug.split).map(k => ({ to: k, pct: sug.split[k] })),
      why: sug.why,
      lv: lsLowest([lv, c.payKnown ? "Close" : "Guess"]),
    },
  };
}
/* All that the two screens show, as plain values. The device that holds the game makes it and sends it. */
function lsView(c, sid, today) {
  return {
    name: c.name,
    led: !!c.led,
    prof: lsProfile(c),
    nums: lsNums(c, today),
    next: lsNext(c, sid),
    plan: lsPlan(c, today),
  };
}

/* ---------- HTML only ---------- */
/* The mark of a number: Guess, Close or Exact. */
function lsMark(lv) {
  return lv ? `<span class="pill lv ${lv === "Guess" ? "guess" : ""}">${lsEsc(lv)}</span>` : "";
}
function lsTagHTML(tag, glow, pulse) {
  if (!tag) return "";
  const done = tag === "confirmed out loud";
  return `<span class="${LF.TAG}${done ? " said" : ""}${glow ? " " + LF.GLOW : ""}${pulse ? " " + LF.PULSE : ""}">${done ? "✓ " : ""}${lsEsc(tag)}</span>`;
}
/* The profile, one group for each area. A group is closed, but for the one that just changed. */
function lsProfileHTML(view, S, now) {
  if (!view || !view.led)
    return `<p class="muted">Nothing is filled in yet. Each number shows here as it is heard.</p>`;
  const fresh = k => S.glow[k] != null && now - S.glow[k] <= LF.GLOW_MS,
    beat = k => S.pulse[k] != null && now - S.pulse[k] <= LF.GLOW_MS;
  return view.prof
    .map(g => {
      const heard = g.rows.filter(r => r.tag).length,
        open = S.open[g.area] != null ? S.open[g.area] : S.last === g.area;
      return (
        `<details class="lsgroup" data-g="${g.area}" data-d="${open ? 1 : 0}"${open ? " open" : ""}><summary><span>${lsEsc(g.name)}</span><span class="muted tiny">${g.rows.length ? g.rows.length + (g.rows.length === 1 ? " line" : " lines") + (heard ? " · " + heard + " from this call" : "") : "nothing yet"}</span></summary><div class="lsrows">` +
        (g.rows.length
          ? g.rows
              .map(r => {
                const gl = r.keys.some(fresh),
                  pu = r.keys.some(beat);
                return `<div class="lsrow${gl ? " " + LF.GLOW : ""}"><span class="lsname">${lsEsc(r.label)}${r.parts ? `<span class="muted tiny"> (${lsEsc(r.parts)})</span>` : ""}</span><span class="lsval"><b>${lsEsc(r.show)}</b>${lsMark(r.lv)}${lsTagHTML(r.tag, false, pu)}</span></div>`;
              })
              .join("")
          : `<p class="muted tiny">Nothing here yet.</p>`) +
        `</div></details>`
      );
    })
    .join("");
}
/* The slim card "Next question to ask": words to say out loud, and the handshake for a Guess. */
function lsNextHTML(view) {
  const N = view && view.next;
  if (!N)
    return dkCard("Next question to ask", `<p class="muted">It shows here when their profile is open.</p>`, {
      cls: "slim",
    });
  const q = N.q,
    cf = N.confirm;
  return dkCard(
    "Next question to ask",
    (q
      ? `<p class="lssay">${q.row ? `<span class="muted">${lsEsc(q.row)}:</span> ` : ""}“${lsEsc(q.say)}”</p>` +
        (q.what ? `<p class="muted tiny">${lsEsc(q.what)}</p>` : "") +
        (q.listen.length ? `<p class="muted tiny">Fills in when they say: ${lsEsc(q.listen.join(", "))}.</p>` : "") +
        (q.k === "take"
          ? `<p class="muted tiny">Ask for one month, or for one paycheck and how often it comes.</p>`
          : "")
      : `<p class="done">Each line has an answer or waits for the review.</p>`) +
      (cf
        ? `<div class="lsconfirm"><b>To lock in a Guess, say:</b>` +
          (cf.say
            ? `<p class="lssay">“${lsEsc(cf.say)}”</p><p class="muted tiny">Then wait for their yes. It goes from Guess to Close.</p>`
            : `<p class="muted tiny">${lsEsc(cf.label)} is a rough ${lsEsc(cf.show)}. Ask for a firm number, then say “Confirming” with it.</p>`) +
          `</div>`
        : ""),
    { cls: "slim", right: N.left > 1 ? dkPill(N.left + " to ask") : "" }
  );
}
const LS_ST = {
  filled: "heard",
  confirmed: "confirmed out loud",
  kept: "for the review",
  same: "already on the profile",
  asked: "waiting for their yes",
  waiting: "waiting for your next Confirming",
  timeout: "no answer heard",
};
/* The heard list: the last 3 items and a count. The what-ifs are a counter only. */
function lsHeardHTML(R, S) {
  const all = (R.fill ? R.fill.heard : []).filter(x => x.st !== "whatif" && x.st !== "corrected" && !x.echo),
    n = (R.fill && R.fill.n) || {},
    one = x =>
      `<li class="${x.st === "confirmed" ? "said" : ""}"><span>${lsEsc(x.label || "A line")}${x.show ? ` <b>${lsEsc(x.show)}</b>` : ""}</span><span class="muted tiny">${x.st === "confirmed" ? "✓ " : ""}${lsEsc(LS_ST[x.st] || x.st)}${x.st === "kept" && x.why ? ": " + lsEsc(x.why) : ""}</span></li>`,
    last = all.slice(-LS_HEARD_SHOW).reverse(),
    older = all.slice(0, -LS_HEARD_SHOW).reverse();
  return dkCard(
    "Heard",
    (last.length
      ? `<ul class="lsheard">${last.map(one).join("")}</ul>`
      : `<p class="muted">The first number shows here as soon as it is heard.</p>`) +
      (older.length
        ? `<details class="lsolder" data-g="older" data-d="${S.open.older ? 1 : 0}"${S.open.older ? " open" : ""}><summary>Show the ${older.length} before</summary><ul class="lsheard">${older.map(one).join("")}</ul></details>`
        : "") +
      `<p class="lswhat">${lsEsc(n.line || lfWhatifLine(n.whatifs || 0))}</p>` +
      `<p class="soft" id="lrsoft" aria-hidden="true"></p>`,
    { cls: "slim", right: dkPill(all.length + (all.length === 1 ? " thing" : " things")) }
  );
}
/* The four top numbers, as the stat tiles of the dashboard kit (dkStatRow, dkTile), and the Recalculating
   line. Each tile has its mark; a Guess shows in the guess style of the kit. */
function lsNumsHTML(view, S, now) {
  if (!view || !view.nums || !view.nums.length)
    return dkCard("", `<p>Your numbers show here as you talk. There is nothing for you to do.</p>`);
  const rc = S.recalc && now - S.recalc.at <= LS_RECALC_MS ? S.recalc : null,
    moved = id => !!rc && rc.lines.some(l => l.id === id);
  return (
    `<div class="lsnums">` +
    dkStatRow(
      view.nums.map(n =>
        dkTile(n.label, lsEsc(n.show) + (n.lv ? " " + lsMark(n.lv) : ""), {
          sub: n.sub || "",
          guess: n.lv === "Guess",
        }).replace('class="dktile"', `class="dktile${moved(n.id) ? " " + LF.GLOW : ""}"`)
      )
    ) +
    `</div>` +
    (rc
      ? `<div class="card lsrecalc" role="status"><span class="dklabel">${lsEsc(rc.title)}</span>${rc.lines.map(l => `<p>${lsEsc(l.text)}</p>`).join("")}</div>`
      : "")
  );
}
/* The plan on one screen: the era, the top 3 moves, the next payday task. Each line has the Guess mark when
   it rests on a number that is still a Guess. */
function lsPlanHTML(plan, me) {
  const yours = me === "client";
  if (!plan)
    return dkCard(
      yours ? "Your plan" : "The plan",
      `<p>There is no plan to show yet: no number was filled in. It shows here after the first numbers are on the profile.</p>`
    );
  const day = s => new Date(s + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    g = plan.lv === "Guess",
    to = t => (t === "Extra on debt" ? "extra on debt" : t === "Cushion" ? "the cushion" : "investing");
  return dkCard(
    yours ? "Your plan" : plan.name + "'s plan",
    (g
      ? `<p class="muted tiny">Some numbers are still a Guess, so this is a first plan. It gets sharper as each number is made real.</p>`
      : "") +
      `<div class="lsplan"><span class="dklabel">${yours ? "Your era" : "Their era"}</span><b class="lsbig">${lsEsc(plan.era)}</b> ${g ? lsMark("Guess") : ""}<p class="muted">${lsEsc(plan.eraOne)}</p></div>` +
      `<div class="lsplan"><span class="dklabel">Top 3 moves</span>` +
      (plan.moves.length
        ? `<ol class="lsmoves">${plan.moves.map(m => `<li><b>${lsEsc(m.title)}</b>${g ? " " + lsMark("Guess") : ""}<div class="muted tiny">${lsEsc(m.why || "")}</div></li>`).join("")}</ol>`
        : `<p class="muted">Each move on the list is done or parked.</p>`) +
      `</div>` +
      `<div class="lsplan"><span class="dklabel">Next payday${plan.pay.when ? ", " + day(plan.pay.when) : ""}</span><b>${plan.pay.split.map(s => s.pct + "% to " + lsEsc(to(s.to))).join(", ")}</b> ${lsMark(plan.pay.lv)}<p class="muted">Of what is left after the bills. ${lsEsc(plan.pay.why)}</p></div>`,
    { right: lsMark(plan.lv), cap: yours ? "Something real to start with" : "What they leave the call with" }
  );
}
/* Part of lrRoomHTML() in liveroom.js: the coach's screen during the call. */
function livePartCoach(R) {
  const S = R.ls || lsAttach(R, {}),
    now = S.now(),
    view = lsViewOf(R);
  return (
    `<div class="lscols"><div class="lscol">` +
    dkCard(
      view ? view.name + "'s profile" : "Their profile",
      view
        ? lsProfileHTML(view, S, now)
        : `<p class="muted">Their profile shows here when their device is in the room.</p>`,
      { cap: "Fills in while you talk. Guess until it is confirmed out loud." }
    ) +
    `</div><div class="lscol">${lsNextHTML(view)}${lsHeardHTML(R, S)}</div></div>`
  );
}
/* Part of lrRoomHTML() in liveroom.js: the client's calm screen during the call. */
function livePartClient(R) {
  const S = R.ls || lsAttach(R, {}),
    now = S.now(),
    view = lsViewOf(R),
    n = (R.fill && R.fill.n) || {};
  return (
    `<div class="lscalm"><h1>Just talk</h1>${dkCaption("Your numbers fill in by themselves. Pause and End are below if you need them.")}</div>` +
    lsNumsHTML(view, S, now) +
    `<p class="lswhat">${n.whatifs ? lsEsc(n.line || lfWhatifLine(n.whatifs)) + " · " : ""}${R.game && R.game.says ? `<span class="muted">${lsEsc(R.game.says())}</span>` : ""}</p>` +
    `<button class="wide" data-a="lsdetails" aria-expanded="${S.details ? "true" : "false"}">${S.details ? "Hide details" : "Show details"}</button>` +
    (S.details ? dkCard("Your profile", lsProfileHTML(view, S, now)) : "") +
    `<p class="soft" id="lrsoft" aria-hidden="true"></p>`
  );
}

/* ---------- the page ---------- */
/* The view that this device shows: its own (the device with the game), the one that the other device
   sent, or one made here from the shared game (the coach, before the client's device is in the room). */
function lsViewOf(R) {
  const S = R.ls,
    c = R.game && R.game.get ? R.game.get() : null;
  if (R.side === "client") return c ? (S.view = S.view || lsView(c, R.sid)) : null;
  if (S.view) return S.view;
  return c ? (S.mine = S.mine || lsView(c, R.sid)) : null;
}
/* Join the screens to one room. lgAttach (livegame.js) calls this. The device with the game works out the
   view after each thing heard, and sends it. Each device keeps what to glow and what to pulse. */
function lsAttach(R, o) {
  const S = (R.ls = {
    view: null,
    mine: null,
    open: {},
    last: "",
    glow: {},
    pulse: {},
    details: false,
    plan: false,
    recalc: null,
    now: () => (o && o.clock ? o.clock.now() : Date.now()),
  });
  const redraw = () => {
      if (o && typeof o.change === "function") o.change(R);
    },
    after = () => {
      if (o && o.clock) o.clock.set(redraw, LF.GLOW_MS + 150);
    },
    send = () => {
      const c = R.game && R.game.get ? R.game.get() : null;
      if (R.side !== "client" || !c) return;
      const was = S.view ? S.view.nums : null;
      S.view = lsView(c, R.sid);
      const rc = lsRecalc(was, S.view.nums);
      if (rc) {
        S.recalc = Object.assign({ at: S.now() }, rc);
        if (o && o.clock) o.clock.set(redraw, LS_RECALC_MS + 100);
      }
      R.tell({ k: "fill", view: S.view, recalc: rc });
    };
  R.hooks.fill.push(p => {
    if (p.view) {
      S.view = p.view;
      if (p.recalc) {
        S.recalc = Object.assign({ at: S.now() }, p.recalc);
        if (o && o.clock) o.clock.set(redraw, LS_RECALC_MS + 100);
      }
    }
    const it = p.ev && p.ev.item;
    if (it && it.key) {
      if (p.ev.k === "filled" || p.ev.k === "corrected" || p.ev.k === "confirmed") {
        S.glow[it.key] = S.now();
        S.last = it.area || S.last;
        S.open = Object.assign({}, S.open, { [it.area]: undefined });
        delete S.open[it.area];
        after();
      }
      if (p.ev.k === "confirmed") S.pulse[it.key] = S.now();
    }
    if (p.here && (p.ev || p.all)) send();
    redraw();
  });
  /* the other device joined, or joined again: it gets the view */
  R.hooks.hello.push(() => {
    if (S.view && R.side === "client") R.tell({ k: "fill", view: S.view });
  });
  return S;
}
/* Part of livePartClick() in account/livereview.js: the taps of the two screens of the call. True: the tap was taken. */
function lsClick(a, t, R) {
  const S = R.ls;
  if (!S) return false;
  if (a === "lsdetails") {
    S.details = !S.details;
    return true;
  }
  if (a === "lsplan") {
    S.plan = !S.plan;
    return true;
  }
  return false;
}
/* session.html calls this when a group opens or closes: the choice of the person stays through each redraw.
   The browser also sends "toggle" when a redraw puts in a group that is open: data-d is how the group was
   drawn, and only a change against it is the person's choice. */
function lsToggle(el, R) {
  if (!el || !el.dataset || !el.dataset.g || !R || !R.ls) return;
  if (el.dataset.d != null && !!el.open === (el.dataset.d === "1")) return;
  R.ls.open[el.dataset.g] = !!el.open;
}
