/* ============================================================================
   SLAM the Game: account/livereview.js
   PURPOSE     Live Session Mode, Part 7: the end of the call. The coach's review: "Heard X things.
               Y confirmed out loud. Z to check.", the groups by area (income, housing, debts, accounts,
               bills, what-ifs), each one closed, with what is not sure first; "Approve all in this
               group", and a tap on one item to fix it (one of the numbers heard, a typed number, or
               "Leave it out"). The source of each value. The what-ifs get a type. The client's screen
               after End is calm: "Your coach is checking what was heard", then the plan. Both screens
               have "Show plan" (account/livescreen.js, lsPlan).
   INPUT       The profile c of the client (on the coach's device: the copy that lgCoach in
               account/livegame.js read from the client's saved game). The room controller R.
   OUTPUT      Values only: lrvBook, lrvSource, lrvToCheck, lrvCounts, lrvSummary, lrvGroups, lrvChoices,
               lrvApprove, lrvApproveGroup, lrvFix, lrvOut, lrvWhatif, lrvWhy.
               HTML: lrvItemHTML, lrvGroupHTML, lrvReviewHTML, lrvClientEndHTML, lrvFallbackHTML.
               Named parts of account/liveroom.js: livePartEnded(R), livePartClick(a, t, R).
   DEPENDS ON  account/livefill.js (LF_TYPES, lfField, LF_FIELDS), account/liveland.js (lfStore, lfTarget,
               lfRow, lfOpen, lfPut, lfAfter, lfGroups, lfCounts, lfHeard, lfWhatif, lfWhatifSet,
               lfMoneyText, lfStateNew), account/liveflag.js (liveOurs), account/livescreen.js (lsEsc,
               lsMark, lsPlan, lsPlanHTML, lsClick), account/livegame.js (R.game.act: the one saver of the
               coach, cpSaveGame), screens/dash.js (dkCard, dkCaption, dkPill). session.html loads this file.
   RULES       The review is the coach's. Approve never raises a level and never sets Exact: it writes who
               approved and when, nothing else. A fix sets the value as a Guess (the person did not check
               it against a statement). A value that the person entered by hand, checked against a
               statement, or confirmed out loud is protected: the review offers no fix for it.
               "Leave it out" puts the row back to how it was before the call (c.x.live.rows[rowKey].base)
               when the row still holds the amount of the call; the quote stays in the review record.
               Nothing is deleted from the heard list.
               Each change of the coach saves the client's game through R.game.act (lgCoach), which calls
               cpSaveGame of account/coachpage.js: it reads the game again and keeps the stamps.
   STORED      c.x.live.review = { [item id]: { st: "ok" | "fixed" | "out", by, at, v, was, back, quote,
               type, with } }. New on Nov 25 2026. A profile with no review reads as "nothing reviewed".
               On a row record: rows[rowKey].out = { by, at } after "Leave it out". On a mark:
               marks[fieldId].out = { by, at }. Nothing was renamed or removed.
   STATE       R.rv = { open: { [item id]: true }, msg } for one room (what is open on this screen).
   ========================================================================= */
const LRV_AREAS = {
  income: "Income",
  housing: "Housing",
  debts: "Debts",
  accounts: "Accounts",
  bills: "Bills",
  whatifs: "What-ifs",
  other: "Other things heard",
};
/* Where a value came from, as the coach reads it. Parts 8 and 9 add the last two: an item with src "file"
   (the text file of the phone's recorder) or src "ai" (the AI pass). */
const LRV_SRC = { client: "their words", coach: "your words", file: "the Samsung file", ai: "the AI pass" };

/* ---------- values only ---------- */
/* The review record of one profile. */
function lrvBook(c) {
  const L = lfStore(c);
  L.review = L.review || {};
  return L.review;
}
function lrvSource(x) {
  return LRV_SRC[x.src] || LRV_SRC[x.side] || LRV_SRC.client;
}
/* The items of one session that the review has to show: not confirmed out loud (skip), not the same as
   the profile, not an item that a later item took the place of (lfCounts().check), and not a heard value that
   was then confirmed out loud. */
function lrvToCheck(c, sid) {
  const M = lfStore(c).marks;
  return lfHeard(c, sid).filter(
    x =>
      !x.skip &&
      x.st !== "corrected" &&
      x.st !== "same" &&
      /* a heard value that a later "Confirming" and yes made Close: the confirmed item stands for it */
      !(x.st === "filled" && x.key && M[x.key] && M[x.key].lv === "close" && M[x.key].item !== x.id)
  );
}
/* The counts of the review: lfCounts, and how many of the items to check are still open. */
function lrvCounts(c, sid) {
  const n = lfCounts(c, sid),
    B = lrvBook(c),
    list = lrvToCheck(c, sid),
    done = list.filter(x => B[x.id]).length;
  return Object.assign({}, n, { done, left: list.length - done });
}
/* "Heard 12 things. 1 confirmed out loud. 11 to check." */
function lrvSummary(n) {
  return (
    "Heard " +
    n.heard +
    (n.heard === 1 ? " thing. " : " things. ") +
    n.confirmed +
    " confirmed out loud. " +
    (n.left == null ? n.check : n.left) +
    " to check."
  );
}
/* The groups of the review, in the order of lfGroups (income, housing, debts, accounts, bills, what-ifs,
   other), each with: check (open items, not sure first), done (reviewed), said (confirmed out loud: counted,
   not in the list to check), same (what the profile already said). */
function lrvGroups(c, sid) {
  const B = lrvBook(c),
    todo = {};
  lrvToCheck(c, sid).forEach(x => (todo[x.id] = true));
  return lfGroups(c, sid).map(g => ({
    area: g.area,
    name: LRV_AREAS[g.area] || g.area,
    check: g.items.filter(x => todo[x.id] && !B[x.id]),
    done: g.items.filter(x => todo[x.id] && B[x.id]),
    said: g.items.filter(x => x.st === "confirmed" && x.skip),
    same: g.items.filter(x => x.st === "same"),
  }));
}
/* Why an item cannot be fixed in the review, or "" when it can: the person entered it, checked it, or it was
   confirmed out loud. */
function lrvWhy(c, x) {
  const t = x && x.key ? lfTarget(x.key) : null;
  if (!t || t.type === "names") return "";
  const o = lfOpen(c, lfStore(c), t);
  return o.open === "no" ? o.why : o.open === "voice" ? LF_WHY.voice : "";
}
/* What a tap on one item offers: { fix (the item can get a new value), why (when it cannot), kind
   ("money" | "rate" | "rhythm"), pick: [{ v, show }] (each value heard for this field in this call, the newest
   first, with no repeat), per ("a month" for income) }. */
function lrvChoices(c, x) {
  const t = x && x.key ? lfTarget(x.key) : null;
  if (!t || t.type === "names" || x.st === "whatif") return { fix: false, why: "", kind: "", pick: [] };
  const why = lrvWhy(c, x),
    m = lfStore(c).marks[x.key],
    seen = {},
    pick = [];
  ((m && m.all) || [])
    .slice()
    .reverse()
    .forEach(a => {
      const k = String(a.v);
      if (seen[k]) return;
      seen[k] = true;
      pick.push({ v: a.v, show: t.type === "freq" ? String(a.v) : t.type === "rate" ? a.v + "%" : lfMoneyText(a.v) });
    });
  return {
    fix: !why,
    why,
    kind: t.type === "freq" ? "rhythm" : t.type === "rate" ? "rate" : "money",
    pick,
    per: t.f.area === "income" ? "a month" : "",
  };
}
/* APPROVE ONE ITEM. Writes who and when, and changes no value and no level. A what-if with a type that the
   AI pass suggested gets that type (lfWhatifSet); a what-if with no type cannot be approved yet (null). */
function lrvApprove(c, id, who, now) {
  const x = lfStore(c).heard.find(h => h.id === id);
  if (!x) return null;
  const B = lrvBook(c);
  if (x.st === "whatif") {
    const w = lfWhatif(c, x.ref);
    if (!w) return null;
    if (!w.type && !w.sug) return null;
    if (!w.type) lfWhatifSet(c, w.id, w.sug, who || "coach");
    B[id] = { st: "ok", by: who || "coach", at: now, type: w.type };
    return B[id];
  }
  B[id] = { st: "ok", by: who || "coach", at: now };
  return B[id];
}
/* "Approve all in this group": each open item of one area. Gives how many were approved. */
function lrvApproveGroup(c, sid, area, who, now) {
  const g = lrvGroups(c, sid).find(x => x.area === area);
  if (!g) return 0;
  return g.check.filter(x => lrvApprove(c, x.id, who, now)).length;
}
/* FIX ONE ITEM: a value the coach picked from the values heard, or typed. It lands the way a heard value
   lands (lfPut, as a Guess: never Close, never Exact), and only where the call may set it. v: a number (for
   income: one month), or the pay rhythm. Gives the review record, or { why } when the field is protected. */
function lrvFix(c, sid, id, how, v, who, now) {
  const L = lfStore(c),
    x = L.heard.find(h => h.id === id);
  if (!x || !x.key) return null;
  if (how === "out") return lrvOut(c, id, who, now);
  const t = lfTarget(x.key);
  if (!t || t.type === "names") return null;
  const why = lrvWhy(c, x);
  if (why) return { why };
  if (t.type !== "freq") {
    v = +v;
    if (!isFinite(v) || v < 0) return null;
  } else if (!v) return null;
  const was = L.marks[x.key] ? L.marks[x.key].v : null,
    line = { id: "review-" + id, side: how === "pick" ? x.side || "client" : "coach", text: x.quote, at: now },
    r = lfPut(c, L, lfStateNew(sid), line, { id: x.key, v, rough: false, per: "month" }, now, "guess");
  if (!r || (r.st !== "filled" && r.st !== "again" && r.st !== "same")) return r && r.why ? { why: r.why } : null;
  if (L.marks[x.key]) L.marks[x.key].item = x.id;
  const B = lrvBook(c);
  B[id] = { st: "fixed", by: who || "coach", at: now, v: r.v, was, how, quote: x.quote };
  return B[id];
}
/* LEAVE IT OUT: the row goes back to how it was before the call, when it still holds the amount of the
   call. A row that the call added goes away again (it was not there before the call). A value that the person
   changed after the call, or entered by hand, is not touched. The quote stays in the review record. Each
   other item of the same row is marked out too. */
function lrvOut(c, id, who, now) {
  const L = lfStore(c),
    x = L.heard.find(h => h.id === id),
    B = lrvBook(c);
  if (!x) return null;
  const rec = { st: "out", by: who || "coach", at: now, v: x.v, quote: x.quote, back: false };
  const t = x.key ? lfTarget(x.key) : null,
    m = x.key ? L.marks[x.key] : null;
  if (t && t.type === "row") {
    const row = lfRow(c, t, false),
      rr = L.rows[t.rowKey];
    if (row && rr && liveOurs(row, rr)) {
      rec.was = { v: row.amt, s: !!row.s, parts: Object.assign({}, rr.parts) };
      if (rr.base && rr.base.had) {
        row.amt = rr.base.v;
        row.s = !!rr.base.s;
        delete row.h;
      } else {
        c[t.sec].splice(c[t.sec].indexOf(row), 1);
        const list = { incs: "incKinds", debts: "debtKinds" }[t.sec];
        if (list && Array.isArray(c[list]) && !c[t.sec].some(r => r.k === t.k))
          c[list] = c[list].filter(k => k !== t.k);
        rec.gone = true;
      }
      rr.parts = {};
      rr.sum = null;
      rr.voice = false;
      rr.out = { by: rec.by, at: now };
      rec.back = true;
      lfAfter(c);
      /* the other items of this row */
      lrvToCheck(c, x.sid).forEach(o => {
        const ot = o.key ? lfTarget(o.key) : null;
        if (o.id !== id && ot && ot.rowKey === t.rowKey && !B[o.id])
          B[o.id] = { st: "out", by: rec.by, at: now, v: o.v, quote: o.quote, back: true, with: id };
      });
    }
  } else if (t && t.type === "rate" && m) {
    const row = lfRow(c, t, false);
    if (row && +row.rate === m.v && row.ratecf != null && m.base) {
      rec.was = { rate: row.rate, ratecf: row.ratecf };
      ["rate", "ratecf", "apr", "high"].forEach(k => {
        if (m.base[k] === undefined) delete row[k];
        else row[k] = m.base[k];
      });
      rec.back = true;
      lfAfter(c);
    }
  } else if (t && t.type === "freq" && m && c.payFreq === m.v && m.base !== undefined) {
    rec.was = { v: c.payFreq };
    c.payFreq = m.base;
    rec.back = true;
    lfAfter(c);
  }
  if (m) m.out = { by: rec.by, at: now };
  B[id] = rec;
  return rec;
}
/* A WHAT-IF GETS A TYPE: Ceiling, Floor, Scenario, Life transition, Goal or wish (lfWhatifSet). o: { key, v }
   for a Ceiling or a Floor with no field or number in the quote. The record says where it went (w.link). */
function lrvWhatif(c, id, type, who, now, o) {
  const x = lfStore(c).heard.find(h => h.id === id);
  if (!x || x.st !== "whatif") return null;
  const w = lfWhatifSet(c, x.ref, type, who || "coach", o);
  if (!w) return null;
  lrvBook(c)[id] = { st: "ok", by: who || "coach", at: now, type, link: w.link };
  return lrvBook(c)[id];
}

/* ---------- HTML only ---------- */
const lrvTime = at => {
  try {
    return new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch (e) {
    report(e, "livereview.js: lrvTime");
    return "";
  }
};
/* The level of an item now: the mark of its row (Guess or Close). */
function lrvLevel(c, x) {
  const t = x.key ? lfTarget(x.key) : null;
  if (!t || t.type === "names" || x.st === "whatif") return "";
  if (t.type === "freq") return x.st === "confirmed" && !x.rough ? "Close" : "Guess";
  const row = lfRow(c, t, false);
  if (!row) return "";
  if (t.type === "rate") return row.ratecf == null ? "Exact" : row.ratecf >= 2 ? "Close" : "Guess";
  return (row.cf || 0) >= 3 ? "Exact" : row.s ? "Close" : "Guess";
}
/* What the review record says, in one line. */
function lrvDoneLine(c, x, rec) {
  const at = lrvTime(rec.at);
  if (rec.st === "fixed")
    return "You set " + (x.key ? lfShow(lfTarget(x.key), rec.v) : rec.v) + " (a Guess) at " + at + ".";
  if (rec.st === "out")
    return rec.back
      ? rec.gone
        ? "Left out at " + at + ". The call added this line, so it is gone again. The words stay here."
        : "Left out at " + at + ". The line is back to how it was before the call."
      : "Left out at " + at + ". Nothing on the profile was changed by the call here.";
  if (x.st === "whatif") return "Approved at " + at + (rec.link ? ". Went to: " + rec.link.text : ".");
  return "Approved at " + at + ". The level stays as it is.";
}
/* One item of the review. A tap on it opens what to do with it. */
function lrvItemHTML(c, x, rv, owner) {
  const rec = lrvBook(c)[x.id],
    open = !!rv.open[x.id],
    lv = lrvLevel(c, x),
    w = x.st === "whatif" ? lfWhatif(c, x.ref) : null,
    title = w ? "“" + w.quote + "”" : x.label || "A line",
    who = lrvSource(x),
    head =
      `<span class="rvname"><b>${lsEsc(title)}</b>` +
      (w ? "" : x.show ? ` <span class="rvv">${lsEsc(x.show)}</span>` : "") +
      (lv ? " " + lsMark(lv) : "") +
      `<span class="muted tiny rvsrc">From ${lsEsc(who)}${!w && x.quote ? ": “" + lsEsc(x.quote) + "”" : ""}</span>` +
      (x.why && !rec ? `<span class="tiny rvwhy">${lsEsc(x.why)}</span>` : "") +
      (w && w.sug && !w.type ? `<span class="tiny rvwhy">Suggested: ${lsEsc(lrvTypeName(w.sug))}</span>` : "") +
      (rec ? `<span class="tiny done">${lsEsc(lrvDoneLine(c, x, rec))}</span>` : "") +
      `</span>`;
  if (rec && !w) return `<div class="rvitem rvdone">${head}</div>`;
  const btn = `<button class="rvtap" data-a="rvopen" data-v="${lsEsc(x.id)}" aria-expanded="${open}">${head}<span class="caret" aria-hidden="true">${open ? "⌃" : "›"}</span></button>`;
  if (!open) return `<div class="rvitem">${btn}</div>`;
  return `<div class="rvitem on">${btn}<div class="rvfix">${w ? lrvWhatifHTML(c, x, w, owner) : lrvFixHTML(c, x)}</div></div>`;
}
function lrvTypeName(type) {
  const t = LF_TYPES.find(p => p[0] === type);
  return t ? t[1] : type;
}
/* The three ways to fix one value, and "This is right". */
function lrvFixHTML(c, x) {
  const ch = lrvChoices(c, x),
    id = lsEsc(x.id);
  return (
    (ch.why
      ? `<p class="muted tiny">${lsEsc(ch.why)} The review does not change it.</p>`
      : (ch.pick.length > 1 || (ch.pick.length === 1 && ch.pick[0].v !== x.v)
          ? `<div><span class="dklabel">Use a number they said</span><div class="chips">${ch.pick.map(p => `<button class="chip" data-a="rvpick" data-v="${id}" data-k="${lsEsc(p.v)}">${lsEsc(p.show)}</button>`).join("")}</div></div>`
          : "") +
        (ch.kind !== "rhythm" && ch.fix
          ? `<div class="rvtype"><label for="rvin-${id}">Type the number${ch.per ? ", " + ch.per : ch.kind === "rate" ? ", in percent" : ""}</label><div class="row"><input id="rvin-${id}" type="text" inputmode="decimal" autocomplete="off" placeholder="${ch.kind === "rate" ? "24.99" : "1,850"}"><button data-a="rvtype" data-v="${id}">Use this number</button></div><div class="hint">It stays a Guess until they check it against a statement.</div></div>`
          : "")) +
    `<div class="ctl"><button class="primary" data-a="rvok" data-v="${id}">This is right</button><button data-a="rvout" data-v="${id}">Leave it out</button></div>` +
    `<p class="muted tiny">Leave it out puts the line back to how it was before the call. The words stay in this review.</p>`
  );
}
/* A what-if: tap a type. After the type, where it went. */
function lrvWhatifHTML(c, x, w, owner) {
  const id = lsEsc(x.id),
    open = w.type && (w.type === "ceiling" || w.type === "floor") && w.link && w.link.open;
  return (
    `<p class="muted tiny">Said by ${lsEsc(lrvSource(x))}. A what-if changes no number. Pick where it goes.</p>` +
    `<div class="chips">${LF_TYPES.map(p => `<button class="chip${w.type === p[0] ? " on" : ""}" data-a="rvwtype" data-v="${id}" data-k="${p[0]}" aria-pressed="${w.type === p[0]}">${lsEsc(p[1])}</button>`).join("")}</div>` +
    (open
      ? `<div class="rvtype"><label for="rvf-${id}">Which number is it a limit on?</label><select id="rvf-${id}">${LF_FIELDS.filter(
          f => f.kind === "money" || f.kind === "rate"
        )
          .map(f => `<option value="${lsEsc(f.id)}">${lsEsc(f.label)}</option>`)
          .join(
            ""
          )}</select><label for="rvin-${id}">The limit</label><div class="row"><input id="rvin-${id}" type="text" inputmode="decimal" autocomplete="off" placeholder="2,000"><button data-a="rvlimit" data-v="${id}">Set the limit</button></div></div>`
      : "") +
    (w.type && w.link && !open
      ? `<p class="done">Went to: ${lsEsc(w.link.text)}</p>${owner ? `<a href="./?as=${encodeURIComponent(owner)}" data-a="rvgo" data-v="${lsEsc(owner)}">Open their game to see it</a>` : ""}`
      : "")
  );
}
/* One group: closed, but for a group the coach opened. */
function lrvGroupHTML(c, g, rv, owner) {
  const n = g.check.length,
    open = !!(rv.groups && rv.groups["rv:" + g.area]),
    canAll = g.check.some(x => x.st !== "whatif" || (lfWhatif(c, x.ref) || {}).sug);
  return (
    `<details class="lsgroup" data-g="rv:${g.area}" data-d="${open ? 1 : 0}"${open ? " open" : ""}><summary><span>${lsEsc(g.name)}</span><span class="muted tiny">${n ? n + " to check" : "nothing to check"}${g.said.length ? " · " + g.said.length + " confirmed out loud" : ""}${g.done.length ? " · " + g.done.length + " done" : ""}</span></summary><div class="lsrows">` +
    (n
      ? g.check.map(x => lrvItemHTML(c, x, rv, owner)).join("")
      : `<p class="muted tiny">Nothing here waits for you.</p>`) +
    (n && canAll
      ? `<button class="wide" data-a="rvall" data-v="${g.area}">Approve all in this group</button><p class="muted tiny">Approve marks each one as checked by you. It does not change a number or its level.</p>`
      : "") +
    (g.done.length
      ? `<details class="rvsub"><summary>${g.done.length} done</summary>${g.done.map(x => lrvItemHTML(c, x, rv, owner)).join("")}</details>`
      : "") +
    (g.said.length
      ? `<details class="rvsub"><summary>${g.said.length} confirmed out loud</summary>${g.said.map(x => `<div class="rvitem rvdone"><span class="rvname"><b>${lsEsc(x.label)}</b> <span class="rvv">${lsEsc(x.show || "")}</span> ${lsMark(lrvLevel(c, x))}<span class="muted tiny rvsrc">Your Confirming, and their “${lsEsc((x.answer && x.answer.quote) || "yes")}”</span></span></div>`).join("")}</details>`
      : "") +
    `</div></details>`
  );
}
/* The client's device could not listen: only the coach's lines were heard, and nothing filled in. */
function lrvFallbackHTML(R) {
  if (!R.room || R.room.client_listens !== false) return "";
  const mine = R.lines.filter(l => l.side === "coach");
  return dkCard(
    "Only your side was heard",
    `<p>Their browser could not listen, so only your lines were heard. Your words never fill in a number by themselves, so nothing filled in.</p><p class="muted tiny">The pass after the call (coming later) can read these lines and propose the numbers here, for you to approve.</p>` +
      (mine.length
        ? `<details class="rvsub"><summary>Your ${mine.length} ${mine.length === 1 ? "line" : "lines"}</summary><ul class="heard">${mine.map(l => `<li>${lsEsc(l.text)}</li>`).join("")}</ul></details>`
        : "")
  );
}
/* THE COACH'S REVIEW after End. */
function lrvReviewHTML(R) {
  const rv = R.rv || (R.rv = { open: {}, msg: "" }),
    A = R.game,
    c = A && A.get ? A.get() : null,
    owner =
      A && A.owner && !(typeof LR !== "undefined" && LR.sim) ? A.owner : ""; /* a made-up call has no game to open */
  if (!c)
    return dkCard(
      "Check what was heard",
      `<p>${A && A.st === "load" ? "Opening their profile…" : A && A.st === "none" ? "Their profile is not saved in their account yet. Their device saves it a moment after the call." : "Their profile could not be read. Check your internet."}</p><button class="wide" data-a="rvreload">Check again</button>`
    );
  const n = lrvCounts(c, R.sid),
    groups = lrvGroups(c, R.sid);
  rv.groups = (R.ls && R.ls.open) || {}; /* the groups the coach opened (lsToggle keeps them in R.ls.open) */
  return (
    `<div class="rvhead"><h1>Check what was heard</h1>${dkCaption(lrvSummary(n))}</div>` +
    (rv.msg ? `<p class="note">${lsEsc(rv.msg)}</p>` : "") +
    (A.err ? `<p class="note">${lsEsc(A.err)}</p>` : "") +
    lrvFallbackHTML(R) +
    (groups.length
      ? dkCard("By area", groups.map(g => lrvGroupHTML(c, g, rv, owner)).join(""), {
          cap: n.left
            ? "Open a group. What is not sure is at the top. Tap one to fix it."
            : "Each thing heard is checked. Their game has it now.",
          right: dkPill(n.left ? n.left + " to check" : "All checked"),
        })
      : R.room && R.room.client_listens === false
        ? ""
        : dkCard("By area", `<p class="muted">No number was heard in this call.</p>`))
  );
}
/* THE CLIENT'S SCREEN after End: calm, and the plan. */
function lrvClientEndHTML(R) {
  const A = R.game;
  return (
    `<div class="lscalm"><h1>Thank you for the call</h1>${dkCaption("Your coach is checking what was heard. There is nothing for you to do.")}</div>` +
    dkCard(
      "What happens next",
      `<p>Your coach goes through each number. Then you see them in your game, each one marked Guess or Close.</p>` +
        (A && A.says ? `<p class="muted tiny">${lsEsc(A.says())}</p>` : "")
    )
  );
}
/* "Show plan", on both screens after End. */
function lrvPlanHTML(R) {
  const S = R.ls || {},
    c = R.game && R.game.get ? R.game.get() : null;
  return (
    `<button class="wide${S.plan ? "" : " primary"}" data-a="lsplan" aria-expanded="${S.plan ? "true" : "false"}">${S.plan ? "Hide the plan" : "Show plan"}</button>` +
    (S.plan ? lsPlanHTML(c ? lsPlan(c) : null, R.side) : "")
  );
}
/* Part of lrRoomHTML() in liveroom.js: the screen after End. */
function livePartEnded(R) {
  if (!R.ls) lsAttach(R, {});
  return (
    (R.side === "coach" ? lrvReviewHTML(R) : lrvClientEndHTML(R)) +
    lrvPlanHTML(R) +
    (typeof lrEndedHTML === "function" ? lrEndedHTML(R) : "")
  );
}

/* ---------- the page ---------- */
/* Run one change of the review on the client's game, and save it (lgCoach.act, cpSaveGame). fn(c) gives the
   record, or null when nothing changes. */
async function lrvSave(R, fn, note) {
  const A = R.game;
  if (!A || !A.act) return null;
  const out = await A.act(c => fn(c), note);
  if (R.rv) R.rv.msg = out && out.why ? out.why : "";
  return out;
}
/* The number in a box: "1,850", "$1,850", "24.99%". null when it is not a number. */
function lrvNum(s) {
  const t = String(s == null ? "" : s).replace(/[$,%\s]/g, "");
  return /^\d+(\.\d+)?$/.test(t) ? +t : null;
}
/* Part of lrClick() in liveroom.js: the taps of the two screens of the call and of the review. True: the tap
   was taken. */
async function livePartClick(a, t, R) {
  if (typeof lsClick === "function" && lsClick(a, t, R)) {
    if (typeof lrDraw === "function") lrDraw();
    return true;
  }
  if (!/^rv/.test(a) || !R) return false;
  const rv = R.rv || (R.rv = { open: {}, msg: "" }),
    id = t.dataset.v,
    who = "coach",
    now = () => Date.now(),
    draw = () => {
      if (typeof lrDraw === "function") lrDraw();
    };
  if (a === "rvopen") rv.open[id] = !rv.open[id];
  else if (a === "rvreload") {
    if (R.game && R.game.load) await R.game.load();
  } else if (a === "rvok") {
    if (await lrvSave(R, c => lrvApprove(c, id, who, now()), "approved one")) rv.open[id] = false;
  } else if (a === "rvall") {
    await lrvSave(R, c => lrvApproveGroup(c, R.sid, id, who, now()) || null, "approved a group");
  } else if (a === "rvpick") {
    const v = t.dataset.k,
      x = (R.game.get() ? lfStore(R.game.get()).heard : []).find(h => h.id === id),
      tg = x && x.key ? lfTarget(x.key) : null;
    if (await lrvSave(R, c => lrvFix(c, R.sid, id, "pick", tg && tg.type === "freq" ? v : +v, who, now()), "fixed one"))
      rv.open[id] = false;
  } else if (a === "rvtype") {
    const el = typeof document !== "undefined" ? document.getElementById("rvin-" + id) : null,
      v = lrvNum(el && el.value);
    if (v == null) {
      rv.msg = "Type the number with digits, like 1,850.";
      draw();
      return true;
    }
    if (await lrvSave(R, c => lrvFix(c, R.sid, id, "type", v, who, now()), "fixed one")) rv.open[id] = false;
  } else if (a === "rvout") {
    if (await lrvSave(R, c => lrvOut(c, id, who, now()), "left one out")) rv.open[id] = false;
  } else if (a === "rvwtype") {
    await lrvSave(R, c => lrvWhatif(c, id, t.dataset.k, who, now()), "typed a what-if");
  } else if (a === "rvlimit") {
    const f = typeof document !== "undefined" ? document.getElementById("rvf-" + id) : null,
      el = typeof document !== "undefined" ? document.getElementById("rvin-" + id) : null,
      v = lrvNum(el && el.value),
      x = (R.game.get() ? lfStore(R.game.get()).heard : []).find(h => h.id === id),
      w = x ? lfWhatif(R.game.get(), x.ref) : null;
    if (v == null || !f || !w) {
      rv.msg = "Pick the number, and type the limit with digits.";
      draw();
      return true;
    }
    await lrvSave(R, c => lrvWhatif(c, id, w.type, who, now(), { key: f.value, v }), "set a limit");
  } else if (a === "rvgo") {
    try {
      sessionStorage.setItem("su_as", id);
    } catch (e) {
      report(e, "livereview.js: rvgo");
    }
    location.href = "./?as=" + encodeURIComponent(id);
  } else return false;
  draw();
  return true;
}
