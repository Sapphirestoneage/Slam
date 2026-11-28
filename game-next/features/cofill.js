/* ============================================================================
   SLAM the Game: features/cofill.js
   PURPOSE     Done-for-you setup (run CC-1, item 16, Nov 27 2026). A coach (or the admin) opens the game
               of a client from the coach page, reads a CSV file of the client's bank or card in the
               browser (the reader of features/import.js), and sends the monthly totals to the client as
               a list. The client sees one line on Home: "Your coach filled this in. Please confirm." Each
               line of the list has Confirm and Change. Nothing becomes a number of the client without
               the client's tap.
   INPUT       The profile: c.spends, c.incs, c.x.cofill. The account: SUPA.as (the coach or the admin is
               in the game of a client), SUPA.asRole. The open sheet (W.kind import: the file of the
               coach; W.kind cofill: the list of the client, with W.o.amt, W.edit, W.did).
   OUTPUT      Functions: cfCoach, cfWho, cfBuild, cfSend, cfPending, cfTake, cfDrop, cfUndo, cfSheet.
               Parts of functions in other files: cfImportWords, cfSentView (imSheet in import.js),
               cfSend (ACT.imapply in import.js), homeCoachFill (homeQuadTop in ux.js), homeCoachFillRow
               (home in ui.js). Actions (ACT): cfopen, cfyes, cfchg, cfmine, cfkeep, cfundo, cfdone.
   DEPENDS ON  core/report.js, core/engine.js (todayISO), features/import.js (IM_CATS, imRead, imPut: the
               one function that writes a total of a file to the profile), account/supa.js (SUPA),
               screens/ui.js (ACT, C, D, esc, money, head, save, render, sheet, drawSheet, afterMoney),
               features/kit.js (kitPill, kitTerms).
   RULES       The file is read in the browser of the coach and is sent nowhere. Only the monthly totals
               the coach leaves on go into the game of the client, in c.x.cofill, and they change no
               number there. A total becomes a number of the client only by the client's tap, through
               imPut, at the level Close (never Exact: a total of a file is an average of months). The
               client can change the amount, keep what they had, or undo a confirm. Statement files that
               are not CSV (PDF) are not read: that waits for the owner (QUESTIONS 663). No database
               change: the coach writes to a shared game by the way that is already there (Open game).
   COMPAT      New optional key c.x.cofill: { d, by, months, n, rows: [{ k, n, amt }] }. k: a name of
               c.spends, or "_inc" (the one line of money coming in). An old saved game has none.
   STATE       None.
   ========================================================================= */
/* True when a coach or the admin is in the game of a client. */
function cfCoach() {
  return typeof SUPA !== "undefined" && !!SUPA && !!SUPA.as && !G.demo;
}
/* Who sent the list, in the words of the client. */
function cfWho(by) {
  return by === "coach" ? "Your coach" : "The person who runs SLAM";
}
/* THE LIST from a file that was read. R: imRead(). use: the lines the coach left on (W.use of the import sheet).
   Returns [{ k, n, amt }]. A line with no row in the profile is left out: there is nothing to confirm into. */
function cfBuild(c, R, use) {
  const rows = [];
  IM_CATS.forEach(x => {
    if (use[x[0]] === false) return;
    const r = (c.spends || []).find(s => s.k === x[0]);
    if (!r || !(R.avg[x[0]] > 0)) return;
    rows.push({ k: x[0], n: x[0], amt: R.avg[x[0]] });
  });
  if (use._inc && !R.card && (c.incs || []).length === 1 && R.income > 0)
    rows.push({ k: "_inc", n: c.incs[0].k, amt: R.income });
  return rows;
}
/* Part of ACT.imapply in import.js. The coach sends the list: it goes to c.x.cofill, and no number changes.
   Returns the rows that were sent. A line that already waits is replaced by the new one. */
function cfSend(c, R, use) {
  const rows = cfBuild(c, R, use);
  if (!rows.length) return [];
  c.x = c.x || {};
  const old = ((c.x.cofill && c.x.cofill.rows) || []).filter(o => !rows.some(r => r.k === o.k));
  c.x.cofill = {
    d: todayISO(),
    by: (typeof SUPA !== "undefined" && SUPA && SUPA.asRole) || "admin",
    months: R.months,
    n: R.n,
    rows: old.concat(rows),
  };
  save();
  return rows;
}
/* Part of imSheet() in import.js. The words of the import sheet for a coach: the button and the line under it. */
function cfImportWords(c) {
  if (!cfCoach()) return null;
  const who = c.name ? String(c.name) : "your client";
  return {
    go: "Send to " + who + " to confirm",
    consent: `<div class="tiny muted">The file is read in this browser and is sent nowhere. Only the monthly totals go into this game, as a list for ${esc(who)} to confirm. No number changes until they tap. A CSV file only: other statement files are not read yet.</div>`,
  };
}
/* Part of imSheet() in import.js. What the coach sees after Send. */
function cfSentView(w) {
  return (
    head("My Money", "Sent to confirm") +
    `<div class="small muted">These wait in this game as a list. Nothing changed in the numbers. The list shows on Home the next time they open the game.</div>` +
    `<div class="tile stack" style="gap:4px" data-fid="cf:sent">${w.sent.map(r => `<div class="row between small"><span>${esc(r.n)}</span><b>${money(r.amt)} a month</b></div>`).join("")}</div>` +
    `<button class="primary wide" data-a="close">Done</button>`
  );
}
/* The lines that wait for the client: [{ k, n, amt, was }]. was: the amount the profile has now. */
function cfPending(c) {
  const F = c && c.x && c.x.cofill;
  if (!F || !Array.isArray(F.rows)) return [];
  return F.rows
    .map(r => {
      const row =
        r.k === "_inc" ? ((c.incs || []).length === 1 ? c.incs[0] : null) : (c.spends || []).find(s => s.k === r.k);
      return row && r.amt > 0 ? { k: r.k, n: r.k === "_inc" ? row.k : r.k, amt: r.amt, was: row.amt } : null;
    })
    .filter(Boolean);
}
/* Take one line off the list. The list goes when it is empty. */
function cfOff(c, k) {
  const F = c.x && c.x.cofill;
  if (!F) return;
  F.rows = F.rows.filter(r => r.k !== k);
  if (!cfPending(c).length) delete c.x.cofill;
}
/* THE CLIENT'S TAP. Confirm a line (amt: none), or use the client's own amount. The number is written by imPut
   (import.js), the same function that writes a total of the client's own file. Returns what to undo, or null. */
function cfTake(c, k, amt) {
  const P = cfPending(c).find(r => r.k === k);
  if (!P) return null;
  const to = amt == null ? P.amt : Math.round(+amt);
  if (!Number.isFinite(to) || to < 0) return null;
  const row = k === "_inc" ? c.incs[0] : c.spends.find(s => s.k === k),
    undo = {
      k,
      line: (c.x.cofill.rows || []).find(r => r.k === k),
      prev: { amt: row.amt, s: row.s, cf: row.cf },
      to,
      n: P.n,
    };
  imPut(c, k, to);
  cfOff(c, k);
  return undo;
}
/* Keep what the client had: the line goes, and no number changes. */
function cfDrop(c, k) {
  const P = cfPending(c).find(r => r.k === k);
  if (!P) return null;
  const undo = { k, line: (c.x.cofill.rows || []).find(r => r.k === k), prev: null, to: P.was, n: P.n };
  cfOff(c, k);
  return undo;
}
/* Undo one tap of this visit: the number of before is back, and the line waits again. u: from cfTake or cfDrop. */
function cfUndo(c, u, F0) {
  if (!u) return false;
  if (u.prev) {
    const row = u.k === "_inc" ? c.incs[0] : c.spends.find(s => s.k === u.k);
    if (row) Object.assign(row, u.prev);
  }
  c.x = c.x || {};
  c.x.cofill = c.x.cofill || Object.assign({}, F0, { rows: [] });
  if (!c.x.cofill.rows.some(r => r.k === u.k)) c.x.cofill.rows.push(u.line);
  return true;
}
/* Part of homeQuadTop() in ux.js. One line at the top of Home while a list waits. Amber: it needs the client. */
function homeCoachFill() {
  try {
    const c = C();
    if (G.demo || cfCoach()) return "";
    const n = cfPending(c).length;
    if (!n) return "";
    return `<div class="tile small row between cfnew" style="gap:8px;border:2px solid var(--warn);flex-wrap:wrap" data-fid="cf:home"><span><b>${esc(cfWho(c.x.cofill.by))} filled this in.</b> Please confirm. ${n} ${n === 1 ? "line waits" : "lines wait"}.</span><button class="ghost slim" style="min-height:44px" data-a="cfopen">See the list</button></div>`;
  } catch (e) {
    report(e, "cofill.js: homeCoachFill");
    return "";
  }
}
/* Part of home() in ui.js. For the coach in the game of a client: one row that opens the file reader. */
function homeCoachFillRow(h) {
  if (!cfCoach() || typeof homeRowAdd !== "function") return h;
  const n = cfPending(C()).length;
  return homeRowAdd(
    h,
    `<button class="rowbtn homerow" data-a="import2" data-fid="cf:coach"><span><b>Fill in from a CSV file</b><div class="tiny muted">Read a bank or card file here. The totals go to this client as a list to confirm.${n ? " " + n + (n === 1 ? " line waits" : " lines wait") + " for them now." : ""}</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`
  );
}
/* THE LIST OF THE CLIENT. */
function cfSheet() {
  const c = C(),
    w = W,
    rows = cfPending(c),
    F = (c.x && c.x.cofill) || w.f0 || {},
    did = w.did || [];
  return (
    head("From " + cfWho(F.by).toLowerCase(), cfWho(F.by) + " filled this in. Please confirm.") +
    `<div class="small muted" data-fid="cf:lead">${F.n ? "From a file of " + F.n + " lines over " + F.months + (F.months === 1 ? " month" : " months") + ". Each amount is an average for a month. " : ""}Nothing changes until you tap. ${ib("term:cofill")}</div>` +
    `<div class="stack" style="gap:8px" data-fid="cf:rows">${rows
      .map(r =>
        w.edit === r.k
          ? `<div class="tile stack cfline" style="gap:8px" data-cf="${esc(r.k)}"><b>${esc(r.n)}</b><div class="field"><label class="small" for="cfamt">Your own amount, a month</label><input id="cfamt" type="text" inputmode="decimal" data-k="amt" value="${esc(String(w.o.amt == null ? "" : w.o.amt))}" placeholder="${Math.round(r.was || 0)}"><div class="tiny muted">You have ${money(r.was)} now. The file says ${money(r.amt)}.</div></div><div class="row" style="gap:8px;flex-wrap:wrap"><button class="ghost" style="min-height:44px" data-a="cfmine" data-k="${esc(r.k)}">Use my amount</button><button class="ghost" style="min-height:44px" data-a="cfkeep" data-k="${esc(r.k)}">Keep what I had</button></div></div>`
          : `<div class="tile stack cfline" style="gap:8px" data-cf="${esc(r.k)}"><div class="row between" style="gap:8px"><b>${esc(r.n)}</b>${kitPill("From " + cfWho(F.by).toLowerCase())}</div><div><b>${money(r.amt)}</b> a month <span class="tiny muted">You have ${money(r.was)} now.</span></div><div class="row" style="gap:8px;flex-wrap:wrap"><button class="ghost" style="min-height:44px" data-a="cfyes" data-k="${esc(r.k)}">Confirm</button><button class="ghost" style="min-height:44px" data-a="cfchg" data-k="${esc(r.k)}">Change</button></div></div>`
      )
      .join("")}</div>` +
    (did.length
      ? `<div class="tile stack" style="gap:6px" data-fid="cf:did"><b class="small">Done on this visit</b>${did.map((u, i) => `<div class="row between small" style="gap:8px"><span>${esc(u.n)}: ${u.prev ? money(u.prev.amt) + " to " + money(u.to) : "kept at " + money(u.to)}</span><button class="ghost slim" style="min-height:44px" data-a="cfundo" data-v="${i}">Undo</button></div>`).join("")}</div>`
      : "") +
    (rows.length
      ? ""
      : `<div class="small" data-fid="cf:empty">That is every line. Recalculating: your numbers use what you confirmed.</div>`) +
    `<button class="${rows.length ? "ghost" : "primary"} wide" data-a="cfdone">${rows.length ? "Later" : "Done"}</button>`
  );
}
Object.assign(ACT, {
  cfopen: () => {
    const c = C();
    if (cfCoach() || !cfPending(c).length) return;
    W = { kind: "cofill", o: {}, edit: null, did: [], f0: Object.assign({}, c.x.cofill, { rows: [] }) };
    sheet(cfSheet);
  },
  /* Confirm one line */
  cfyes: t => {
    if (!W || W.kind !== "cofill") return;
    const c = C(),
      pr = D.realm,
      u = cfTake(c, t.dataset.k);
    if (u) {
      W.did.push(u);
      afterMoney(c, pr, false);
      save();
      render();
    }
    drawSheet();
  },
  /* Change: the box for the client's own amount opens on this line */
  cfchg: t => {
    if (!W || W.kind !== "cofill") return;
    W.edit = t.dataset.k;
    W.o.amt = "";
    drawSheet();
  },
  /* Use my amount */
  cfmine: t => {
    if (!W || W.kind !== "cofill") return;
    const c = C(),
      pr = D.realm,
      v = String(W.o.amt == null ? "" : W.o.amt).trim();
    /* empty is not zero: with nothing typed the box stays open */
    if (v === "" || !Number.isFinite(+v) || +v < 0) return drawSheet();
    const u = cfTake(c, t.dataset.k, +v);
    if (u) {
      W.did.push(u);
      W.edit = null;
      afterMoney(c, pr, false);
      save();
      render();
    }
    drawSheet();
  },
  /* Keep what I had */
  cfkeep: t => {
    if (!W || W.kind !== "cofill") return;
    const u = cfDrop(C(), t.dataset.k);
    if (u) {
      W.did.push(u);
      W.edit = null;
      save();
      render();
    }
    drawSheet();
  },
  cfundo: t => {
    if (!W || W.kind !== "cofill") return;
    const c = C(),
      pr = D.realm,
      u = W.did[+t.dataset.v];
    if (cfUndo(c, u, W.f0)) {
      W.did.splice(+t.dataset.v, 1);
      afterMoney(c, pr, false);
      save();
      render();
    }
    drawSheet();
  },
  cfdone: () => {
    closeSheet();
    render();
  },
});
kitTerms({
  cofill: [
    "Filled in by your coach",
    "Your coach read a file from your bank or card and added up what goes out in a month, by kind. The file itself is not kept: only these totals. They are not your numbers yet. Confirm takes the amount as a Close number, the same as when you read your own file. Change lets you type your own amount, or keep what you had. You can undo each tap on this visit, and change any number later on My Money.",
  ],
});
