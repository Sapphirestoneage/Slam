/* ============================================================================
   SLAM the Game: account/liveland.js
   PURPOSE     Live Session Mode, Parts 3, 4 and 5: put what a line means (account/livefill.js) on the
               profile of the client. (1) A value lands in the real row of the game as a Guess, with a
               record of where it came from. (2) A value that the person entered or confirmed is never
               changed. (3) A correction: the last number stays, and both are kept. (4) "Confirming" and
               the client's yes raise a value to Close. (5) The What-ifs list and where an approved
               what-if goes. (6) The heard list for the screens. (7) lfAttach: the link to the room.
   INPUT       The profile c. The state of the call (lfStateNew). One line { id, side, text, at }.
   OUTPUT      On the profile: c.x.live (see STORED). Functions lfStore, lfTarget, lfOpen, lfLine, lfTick,
               lfUndo, lfHeard, lfCounts, lfGroups, lfTag, lfWhatifLine, lfWhatifs, lfWhatifSuggest,
               lfWhatifSet, lfWhatifLimit, lfWhatifScenario, lfWhatifLife, lfWhatifGoal, lfAttach.
   DEPENDS ON  account/live.js, account/livefill.js, core/report.js. From the game, when it is loaded:
               core/engine.js (applyTypical, syncAll, periods, DEBT_KINDS, ACCT_KINDS, goalTypical,
               todayISO), features/alloc.js (allocFillAll), screens/ui.js (bandOf, gid).
   RULES       The rows of the game are the only copy of a number. This file keeps no second copy: the
               record of a value says where it came from, and the row holds the value.
               A row of the game: s false is Guess, s true is Close, cf 3 is Exact. A value of a call
               lands with s false and h 1 (heard). "Confirming" plus yes sets s true. Nothing here sets
               cf 3: Exact means checked against a statement.
               WHO SET A GUESS. A row with h 1 whose amount is the amount that the call wrote is a Guess
               of the call: a later line of the call can change it. A row with s false and no h is a
               guess of the game itself (a typical amount): the call can change it. Each other row was
               entered or confirmed by the person: the call changes nothing there, and the heard value
               is kept for the review with the reason.
   STORED      c.x.live = { v: 1, fresh, heard: [], marks: {}, rows: {}, whatifs: [], wait: {},
               limits: {}, names: [], pend, n }. New on Nov 25 2026. A profile with no c.x.live is a
               profile with no live session: each function here makes the empty shape when it needs it,
               and no other file of the game reads it. Rows get two new keys: h (1) and, for a debt,
               ratecf (0 or 2). docs/LIVE-SESSION-BUILD.md has the full shapes.
   ========================================================================= */
const LF_WHY = {
  hand: "You already entered this.",
  exact: "You already checked this against a statement.",
  voice: "Already confirmed out loud. Say Confirming with the new number to change it.",
  echo: "This line was an echo of the other side. Nothing changed.",
  wait: "Waiting for your next Confirming.",
  timeout: "No answer was heard in 10 seconds. Nothing changed.",
  newer: "A new Confirming came before an answer. Nothing changed.",
  twice: "Two different numbers were heard for this.",
  year: "This was said for a year. The game needs the amount that lands in the bank in one month.",
  per: "Not sure if this is one paycheck or one month.",
  rhythm: "This is one paycheck. How often the pay comes was not heard yet.",
  small: "The number is too small to be sure.",
  total: "A total for this line was already heard.",
  names: "The game keeps one line for all cards. The card names wait for the review.",
  rough: "A rough number stays a Guess. Say Confirming with a firm number to make it Close.",
  game: "The game is not loaded on this device, so nothing was set.",
};
/* The live session data of one profile. */
function lfStore(c) {
  c.x = c.x || {};
  const L = (c.x.live = c.x.live || { v: 1 });
  L.heard = L.heard || [];
  L.marks = L.marks || {};
  L.rows = L.rows || {};
  L.whatifs = L.whatifs || [];
  L.wait = L.wait || {};
  L.limits = L.limits || {};
  L.names = L.names || [];
  L.n = L.n || 0;
  return L;
}
const lfMoneyText = v => "$" + (Math.round(v * 100) / 100).toLocaleString("en-US");
/* Where a field lives: { f, type: "row" | "rate" | "freq" | "names", sec, k, part, rowKey }. */
function lfTarget(id) {
  const f = lfField(id);
  if (!f) return null;
  const p = f.key.split(":"),
    sec = { inc: "incs", spend: "spends", cash: "cashes", inv: "invs", debt: "debts", rate: "debts", names: "debts" }[
      p[0]
    ],
    k = p.slice(1).join(":");
  return {
    f,
    type: f.key === "pay.freq" ? "freq" : p[0] === "rate" ? "rate" : p[0] === "names" ? "names" : "row",
    sec,
    k,
    part: f.part || "all",
    rowKey: sec + ":" + k,
  };
}
/* A profile with no rows yet gets the first rows of the game (applyTypical: typical amounts, each one a
   guess of the game). L.fresh says that the call made them, so no answer of this profile was given by hand. */
function lfReady(c, L) {
  if (c.led) return true;
  if (typeof applyTypical !== "function") return false;
  c.goals = c.goals || [];
  applyTypical(c);
  L.fresh = true;
  return true;
}
/* The row of a field. make: add the row the way the action rowaddk of the game does. */
function lfRow(c, t, make) {
  let x = (c[t.sec] || []).find(r => r.k === t.k);
  if (!x && make) {
    const dk = t.sec === "debts" && typeof DEBT_KINDS !== "undefined" ? DEBT_KINDS.find(d => d[0] === t.k) : null;
    x =
      t.sec === "debts" ? { k: t.k, amt: 0, high: dk ? dk[2] : false, s: false, was: 0 } : { k: t.k, amt: 0, s: false };
    c[t.sec] = c[t.sec] || [];
    c[t.sec].push(x);
    const list = { incs: "incKinds", debts: "debtKinds" }[t.sec];
    if (list && Array.isArray(c[list]) && c[list].indexOf(t.k) < 0) c[list].push(t.k);
    if (
      (t.sec === "cashes" || t.sec === "invs") &&
      Array.isArray(c.accts) &&
      typeof ACCT_KINDS !== "undefined" &&
      ACCT_KINDS.indexOf(t.k) >= 0 &&
      c.accts.indexOf(t.k) < 0
    )
      c.accts.push(t.k);
  }
  return x || null;
}
/* The value that the profile holds for a field now, or null. */
function lfNow(c, L, t) {
  if (t.type === "freq") return c.payFreq || null;
  const x = lfRow(c, t, false);
  if (!x) return null;
  if (t.type === "rate") return x.rate != null ? +x.rate : null;
  const rr = L.rows[t.rowKey];
  return rr && rr.parts[t.part] != null ? rr.parts[t.part] : t.part === "all" || !rr ? x.amt : null;
}
/* CAN THE CALL SET THIS FIELD? Gives { open: "yes" } (a guess of the game, or a Guess of this call),
   { open: "voice" } (confirmed out loud in a call: only a new "Confirming" changes it), or
   { open: "no", why } (the person entered it, or it is Exact). */
function lfOpen(c, L, t) {
  const m = L.marks[t.f.id];
  if (t.type === "freq") {
    if (m && c.payFreq === m.v) return { open: m.lv === "close" ? "voice" : "yes" };
    return L.fresh && !m ? { open: "yes" } : { open: "no", why: LF_WHY.hand };
  }
  const x = lfRow(c, t, false);
  if (!x) return { open: "yes" };
  if (t.type === "rate") {
    if (x.rate == null && (!x.apr || x.apr === "?")) return { open: "yes" };
    if (!(m && +x.rate === m.v && x.ratecf === (m.lv === "close" ? 2 : 0))) return { open: "no", why: LF_WHY.hand };
    return { open: m.lv === "close" ? "voice" : "yes" };
  }
  const rr = L.rows[t.rowKey],
    ours = liveOurs(x, rr); /* liveflag.js: the row still holds the amount of the call */
  if ((x.cf || 0) >= 3) return { open: "no", why: LF_WHY.exact };
  if (x.s)
    return ours && rr.voice ? { open: m && m.lv === "close" ? "voice" : "yes" } : { open: "no", why: LF_WHY.hand };
  if (x.h && !ours) return { open: "no", why: LF_WHY.hand };
  return { open: m && m.lv === "close" ? "voice" : "yes" };
}
/* After a change of a row: the game's own totals. With the whole game loaded, the device that holds the
   game also calls afterMoney() (see lfAttach, game.save). */
function lfAfter(c) {
  try {
    if (typeof allocFillAll === "function") allocFillAll(c);
    else if (typeof syncAll === "function") syncAll(c);
  } catch (e) {
    report(e, "liveland.js: lfAfter");
  }
}
/* One line of the heard list. */
function lfItem(L, S, line, st, o) {
  const it = Object.assign(
    {
      id: "h" + ++L.n,
      sid: S.sid,
      line: line ? line.id : null,
      side: line ? line.side : null,
      quote: line ? String(line.text || "").slice(0, 240) : "",
      at: line ? line.at : null,
      st,
    },
    o || {}
  );
  L.heard.push(it);
  return it;
}
const lfLabel = id => (lfField(id) || { label: "" }).label;
const lfArea = id => (lfField(id) || { area: "" }).area;
const lfShow = (t, v) => (t.type === "freq" ? String(v) : t.type === "rate" ? v + "%" : lfMoneyText(v));
/* The amount of one month from what was said. Gives { v } or { why }. */
function lfMonthly(c, L, h) {
  const per = h.per;
  if (per === "month") return { v: h.v };
  if (per === "year") return { why: LF_WHY.year };
  if (per === "week") return { v: (h.v * 52) / 12 };
  if (per === "pay") {
    const m = L.marks["pay.freq"],
      known = (m && c.payFreq === m.v) || !L.fresh;
    if (!known || c.payFreq === "It varies" || typeof periods !== "function") return { why: LF_WHY.rhythm, pend: true };
    return { v: (h.v * periods(c.payFreq)) / 12 };
  }
  return { why: LF_WHY.per };
}
/* SET ONE VALUE. h: { id, v, rough, per }. lv: "guess" (a line of the client) or "close" (a "Confirming"
   that the client answered with yes). Gives { st, why, v, item fields }: st is "filled", "kept", "same",
   "again" (the same value a second time: nothing new) or "confirmed". */
function lfPut(c, L, S, line, h, now, lv) {
  const t = lfTarget(h.id);
  if (!t) return { st: "none" };
  if (!lfReady(c, L)) return { st: "kept", why: LF_WHY.game, v: h.v };
  let v = h.v;
  if (t.type === "row") {
    if (t.f.area === "income") {
      const mo = lfMonthly(c, L, h);
      if (mo.why) {
        if (mo.pend) L.pend = { h, line, lv };
        return { st: "kept", why: mo.why, v: h.v, raw: true };
      }
      v = mo.v;
    }
    v = Math.round(v);
    if (!(v >= 10)) return { st: "kept", why: LF_WHY.small, v: h.v, raw: true };
  } else if (t.type === "rate") {
    v = Math.round(v * 100) / 100;
    if (!(v >= 0 && v <= 60)) return { st: "none" };
  }
  const open = lfOpen(c, L, t),
    cur = lfNow(c, L, t),
    old = L.marks[h.id] || null;
  if (open.open === "no") return cur === v ? { st: "same", v } : { st: "kept", why: open.why, v };
  if (lv === "guess" && open.open === "voice")
    return cur === v ? { st: "same", v } : { st: "kept", why: LF_WHY.voice, v };
  if (lv === "guess" && old && old.v === v && cur === v) return { st: "again", v };
  /* a rough middle that is confirmed out loud stays a Guess */
  if (lv === "close" && old && old.rough && old.v === v && old.lv === "guess") {
    old.yes = { at: line.at, line: line.id };
    return { st: "confirmed", v, lv: "guess", why: LF_WHY.rough };
  }
  let rr = null,
    x = null;
  if (t.type === "row") {
    x = lfRow(c, t, false);
    const had = !!x;
    x = x || lfRow(c, t, true);
    rr = L.rows[t.rowKey];
    if (rr && t.part !== "all" && rr.parts.all != null) return { st: "kept", why: LF_WHY.total, v };
    if (!rr) rr = L.rows[t.rowKey] = { parts: {}, sum: null, base: { v: x.amt, s: !!x.s, had } };
    if (t.part === "all") rr.parts = { all: v };
    else rr.parts[t.part] = v;
  } else if (t.type === "rate") x = lfRow(c, t, true);
  /* the record of the value */
  const m = old || (L.marks[h.id] = { id: h.id, all: [] }),
    was = old && old.v != null && old.v !== v ? { v: old.v, t: old.t, item: old.item } : null;
  if (!old && t.type === "freq") m.base = c.payFreq;
  if (!old && t.type === "rate") m.base = { rate: x.rate, ratecf: x.ratecf, apr: x.apr, high: x.high };
  m.all.push({
    v,
    at: line.at,
    line: line.id,
    side: line.side,
    quote: String(line.text || "").slice(0, 240),
    rough: lv === "close" ? false : !!h.rough,
    how: lv === "close" ? "voice" : "heard",
  });
  Object.assign(m, {
    v,
    lv,
    by: lv === "close" ? "voice" : "heard",
    rough: lv === "close" ? false : !!h.rough,
    side: line.side,
    quote: String(line.text || "").slice(0, 240),
    at: line.at,
    t: now,
    line: line.id,
    sid: S.sid,
  });
  if (t.type === "row") {
    const parts = Object.keys(rr.parts);
    x.amt = parts.reduce((a, p) => a + rr.parts[p], 0);
    x.h = 1;
    /* the row is Close when each part of it that was heard is confirmed out loud */
    x.s = parts.every(p => {
      const pm = L.marks[t.f.key + (p === "all" ? "" : "/" + p)] || L.marks[t.f.key + "/" + p];
      return !!pm && pm.lv === "close";
    });
    rr.voice = x.s;
    rr.sum = x.amt;
  } else if (t.type === "rate") {
    x.rate = v;
    x.ratecf = lv === "close" ? 2 : 0;
    if (typeof bandOf === "function") x.apr = bandOf(v);
    x.high = v >= 8;
  } else c.payFreq = v;
  lfAfter(c);
  delete L.wait[h.id];
  return { st: lv === "close" ? "confirmed" : "filled", v, was, lv };
}
/* Read one line and put it on the profile. Gives { events: [{ k, item }], changed }.
   k: filled, kept, same, corrected, asked, confirmed, waiting, timeout, whatif. The event "confirmed" is the
   one that both screens pulse on (class LF.PULSE). */
function lfLine(S, c, line, now) {
  const L = lfStore(c),
    events = lfTick(S, c, now).events,
    ev = (k, item) => events.push({ k, item }),
    before = JSON.stringify(lfSnap(c)),
    hears = lfHear(S, line, now, { kinds: (c.debts || []).map(x => x.k) });
  const value = (h, ln, lv) => {
    const t = lfTarget(h.id),
      r = lfPut(c, L, S, ln, h, now, lv),
      base = { key: h.id, label: lfLabel(h.id), area: lfArea(h.id), rough: !!h.rough };
    if (r.st === "none" || r.st === "again") return r;
    if (r.st === "same") {
      ev("same", lfItem(L, S, ln, "same", Object.assign(base, { v: r.v, show: lfShow(t, r.v), skip: true })));
      return r;
    }
    if (r.st === "kept") {
      const kept = lfItem(
        L,
        S,
        ln,
        "kept",
        Object.assign(base, { v: r.v, show: r.raw ? lfMoneyText(r.v) : lfShow(t, r.v), why: r.why })
      );
      if (L.pend && L.pend.line === ln && !L.pend.item) L.pend.item = kept.id;
      ev("kept", kept);
      return r;
    }
    const it = lfItem(
      L,
      S,
      ln,
      "filled",
      Object.assign(base, { v: r.v, show: lfShow(t, r.v), lv: "guess", cls: LF.TAG })
    );
    if (r.was) {
      const oldIt = L.heard.find(x => x.id === r.was.item);
      if (oldIt && oldIt.st === "filled") {
        oldIt.st = "corrected";
        oldIt.by = it.id;
      }
      it.fixes = r.was.item || null;
      it.was = r.was.v;
      if (now - r.was.t > LF.FIX_MS) {
        it.unsure = true;
        it.why = LF_WHY.twice;
      }
    }
    L.marks[h.id].item = it.id;
    S.last = { id: h.id, t: now, per: h.per || null };
    ev(r.was ? "corrected" : "filled", it);
    return r;
  };
  hears.forEach(h => {
    if (h.do === "value") value(h, line, "guess");
    else if (h.do === "rhythm") {
      const r = value({ id: h.id, v: h.v }, line, "guess");
      /* one paycheck that waited for the rhythm */
      if (r.st === "filled" && L.pend) {
        const p = L.pend;
        delete L.pend;
        const r2 = value(p.h, p.line, p.lv),
          oldIt = L.heard.find(x => x.id === p.item);
        if (r2.st === "filled" && oldIt) {
          oldIt.st = "corrected";
          oldIt.by = L.marks[p.h.id].item;
        }
      }
    } else if (h.do === "hold") {
      ev(
        "kept",
        lfItem(L, S, line, "kept", {
          key: h.id,
          label: lfLabel(h.id),
          area: lfArea(h.id),
          v: h.v,
          show: h.v != null ? String(h.v) : "",
          why: h.why,
          unsure: true,
        })
      );
    } else if (h.do === "names") {
      h.list.forEach(n => L.names.indexOf(n) < 0 && L.names.push(n));
      ev(
        "kept",
        lfItem(L, S, line, "kept", {
          key: h.id,
          label: lfLabel(h.id),
          area: "debts",
          show: h.list.join(", "),
          why: LF_WHY.names,
        })
      );
    } else if (h.do === "whatif") {
      const w = {
        id: "w" + ++L.n,
        sid: S.sid,
        line: line.id,
        side: line.side,
        quote: String(line.text || "").slice(0, 240),
        at: line.at,
        cues: h.cues,
        type: null,
        by: null,
        sug: null,
        sugBy: null,
        ok: false,
        link: null,
      };
      L.whatifs.push(w);
      ev("whatif", lfItem(L, S, line, "whatif", { area: "whatifs", ref: w.id }));
    } else if (h.do === "askbad") {
      ev(
        "waiting",
        lfItem(L, S, line, "waiting", {
          key: h.id,
          label: h.id ? lfLabel(h.id) : "",
          area: h.id ? lfArea(h.id) : "",
          why: h.why,
        })
      );
    } else if (h.do === "ask") {
      if (S.ask) {
        const o = L.heard.find(x => x.id === S.ask.item);
        if (o) {
          o.st = "timeout";
          o.why = LF_WHY.newer;
          ev("timeout", o);
        }
      }
      const t = lfTarget(h.id),
        v = h.rhythm || h.v,
        it = lfItem(L, S, line, "asked", {
          key: h.id,
          label: lfLabel(h.id),
          area: lfArea(h.id),
          v,
          show: lfShow(t, v),
        });
      delete L.wait[h.id];
      S.ask = { id: h.id, v, per: h.per || null, t: now, line: line.id, item: it.id, coach: line };
      ev("asked", it);
    } else if (h.do === "yes" || h.do === "no") {
      const a = S.ask,
        it = L.heard.find(x => x.id === a.item) || lfItem(L, S, a.coach, "asked", { key: a.id });
      S.ask = null;
      it.answer = { side: line.side, quote: String(line.text || "").slice(0, 240), at: line.at, line: line.id };
      if (h.do === "no") {
        it.st = "waiting";
        it.why = LF_WHY.wait;
        L.wait[a.id] = line.at;
        ev("waiting", it);
        return;
      }
      /* the record of the value points at the coach's line (the number) and keeps the client's yes */
      const r = lfPut(c, L, S, a.coach, { id: a.id, v: a.v, per: a.per }, now, "close"),
        t = lfTarget(a.id);
      if (r.st === "confirmed") {
        it.st = "confirmed";
        it.v = r.v;
        it.show = lfShow(t, r.v);
        it.lv = r.lv;
        it.skip = r.lv === "close";
        it.cls = LF.PULSE;
        if (r.why) it.why = r.why;
        if (r.was) it.was = r.was.v;
        const m = L.marks[a.id];
        m.item = it.id;
        m.yes = { at: line.at, line: line.id, quote: it.answer.quote };
        ev("confirmed", it);
      } else {
        it.st = r.st === "same" ? "same" : "kept";
        it.why = r.why || LF_WHY.hand;
        if (r.st === "same") it.skip = true;
        ev(it.st, it);
      }
    }
  });
  const changed = events.length > 0;
  if (changed) {
    S.snaps = (S.snaps || []).filter(x => x.line !== line.id).slice(-3);
    S.snaps.push({ line: line.id, before });
    S.changedBy = line.id;
  }
  return { events, changed };
}
/* The time ran out on an open "Confirming". The room calls this 10 seconds after the coach's line; each new
   line calls it first. */
function lfTick(S, c, now) {
  const events = [];
  if (S.ask && now - S.ask.t > LF.ASK_MS) {
    const L = lfStore(c),
      it = L.heard.find(x => x.id === S.ask.item);
    S.ask = null;
    if (it) {
      it.st = "timeout";
      it.why = LF_WHY.timeout;
      events.push({ k: "timeout", item: it });
    }
  }
  return { events, changed: events.length > 0 };
}
/* What a line of the call can change on a profile, as one value (for lfUndo). */
function lfSnap(c) {
  const o = {};
  [
    "incs",
    "spends",
    "cashes",
    "invs",
    "debts",
    "incKinds",
    "debtKinds",
    "accts",
    "payFreq",
    "led",
    "al",
    "goals",
  ].forEach(k => (o[k] = c[k]));
  o.live = c.x && c.x.live;
  o.take = c.take;
  o.spend = c.spend;
  o.months = c.months;
  o.inv = c.inv;
  o.debt = c.debt;
  o.high = c.high;
  return o;
}
/* THE ECHO FILTER TOOK A LINE BACK (R.hooks.drop). The words were the other side's words, heard by this
   microphone. When that line was the last one that changed the profile, the profile goes back to how it
   was before the line. When a later line changed the profile too, nothing is taken back, and each item of
   the line is flagged for the review. Both cases add no value and delete no line of the list. */
function lfUndo(S, c, lineId) {
  const snap = (S.snaps || []).find(x => x.line === lineId),
    events = [];
  if (!snap) return { events, changed: false };
  let L = lfStore(c);
  const mine = L.heard.filter(x => x.line === lineId || (x.answer && x.answer.line === lineId));
  if (!mine.length) return { events, changed: false };
  if (S.changedBy === lineId) {
    const b = JSON.parse(snap.before);
    Object.keys(b).forEach(k => {
      if (k === "live") c.x.live = b.live;
      else if (b[k] === undefined) delete c[k];
      else c[k] = b[k];
    });
    L = lfStore(c);
    if (S.ask && S.ask.line === lineId) S.ask = null;
    if (S.last && !L.marks[S.last.id]) S.last = null;
    const it = lfItem(
      L,
      S,
      { id: lineId, side: mine[0].side, text: mine[0].answer ? mine[0].answer.quote : mine[0].quote, at: mine[0].at },
      "kept",
      {
        why: LF_WHY.echo,
        skip: true,
        echo: true,
      }
    );
    events.push({ k: "kept", item: it });
  } else
    mine.forEach(it => {
      it.unsure = true;
      it.echo = true;
      it.why = "This line may be an echo of the other side. Check it.";
      events.push({ k: "kept", item: it });
    });
  S.snaps = S.snaps.filter(x => x.line !== lineId);
  return { events, changed: true, all: true };
}

/* ---------- the heard list, for the screens ---------- */
/* Each thing heard in one session (or in all, with no sid), the oldest first. st is one of:
   filled (a Guess landed), corrected (a later item took its place: by), kept (for the review: why), same
   (the profile already said this), asked (an open "Confirming"), confirmed (out loud: skip is true when the
   value is Close), waiting (the client said no, or the coach gave no number), timeout, whatif. */
function lfHeard(c, sid) {
  return lfStore(c).heard.filter(x => !sid || x.sid === sid);
}
/* "3 what-ifs heard": the only thing about what-ifs on the screen during the call. */
function lfWhatifLine(n) {
  return n === 1 ? "1 what-if heard" : (n || 0) + " what-ifs heard";
}
function lfWhatifs(c, sid) {
  return lfStore(c).whatifs.filter(w => !sid || w.sid === sid);
}
/* The counts for the end of the call. check: what the review has to show (not confirmed out loud, not the
   same as the profile, not an item that a later item took the place of). */
function lfCounts(c, sid) {
  const H = lfHeard(c, sid),
    n = st => H.filter(x => x.st === st).length,
    out = {
      heard: H.filter(x => x.st !== "corrected" && !x.echo && !x.src).length /* not the proposals of the AI pass */,
      filled: n("filled"),
      confirmed: H.filter(x => x.st === "confirmed" && x.skip).length,
      kept: n("kept"),
      waiting: n("waiting") + n("timeout") + n("asked"),
      whatifs: lfWhatifs(c, sid).length,
    };
  out.check = H.filter(x => !x.skip && x.st !== "corrected" && x.st !== "same").length;
  out.line = lfWhatifLine(out.whatifs);
  return out;
}
/* The heard list by area, for the review of Part 7: income, housing, debts, accounts, bills, whatifs, and
   "other" for an item with no field. In each group the items that are not sure come first. */
function lfGroups(c, sid) {
  const order = ["income", "housing", "debts", "accounts", "bills", "whatifs", "other"],
    by = {};
  lfHeard(c, sid).forEach(x => {
    if (x.st === "corrected") return;
    const a = order.indexOf(x.area) >= 0 ? x.area : "other";
    (by[a] = by[a] || []).push(x);
  });
  return order
    .filter(a => by[a])
    .map(a => ({
      area: a,
      items: by[a].filter(x => x.unsure || x.st === "kept").concat(by[a].filter(x => !(x.unsure || x.st === "kept"))),
      skip: by[a].filter(x => x.skip).length,
    }));
}
/* The small tag of one field, for Part 6: null (no call set it), or { text, cls, glow, lv, rough, quote,
   side, at }. glow is true for LF.GLOW_MS after the value landed (add the class LF.GLOW). */
function lfTag(c, id, now) {
  const L = lfStore(c),
    m = L.marks[id];
  if (!m) return L.wait[id] ? { text: "waiting for your next Confirming", cls: LF.TAG, glow: false, wait: true } : null;
  return {
    text: L.wait[id] ? "waiting for your next Confirming" : m.lv === "close" ? "confirmed out loud" : "heard",
    cls: LF.TAG,
    glow: now != null && now - m.t <= LF.GLOW_MS,
    pulse: m.lv === "close" && now != null && now - m.t <= LF.GLOW_MS,
    wait: !!L.wait[id],
    lv: m.lv,
    rough: !!m.rough,
    quote: m.quote,
    side: m.side,
    at: m.at,
  };
}

/* ---------- Part 5: what-ifs ---------- */
function lfWhatif(c, id) {
  return lfStore(c).whatifs.find(w => w.id === id) || null;
}
/* The AI pass (Part 8) suggests a type. It changes nothing else: the coach approves with lfWhatifSet. */
function lfWhatifSuggest(c, id, type, by) {
  const w = lfWhatif(c, id);
  if (!w || !LF_TYPES.some(t => t[0] === type)) return null;
  w.sug = type;
  w.sugBy = by || "ai";
  return w;
}
/* The coach taps a type (or approves the suggested one): the what-if goes to its place, and w.link says
   where. by: who set it ("coach"). o: { key, v, name, cost } from the review, when the quote has no field or
   number. A second tap with a new type sets a new link. A goal that a first tap added stays on the list. */
function lfWhatifSet(c, id, type, by, o) {
  const w = lfWhatif(c, id);
  if (!w || !LF_TYPES.some(t => t[0] === type)) return null;
  w.type = type;
  w.by = by || "coach";
  w.ok = true;
  w.link =
    type === "ceiling" || type === "floor"
      ? lfWhatifLimit(c, w, o)
      : type === "scenario"
        ? lfWhatifScenario(c, w)
        : type === "life"
          ? lfWhatifLife(c, w)
          : lfWhatifGoal(c, w, o);
  return w;
}
/* Ceiling or Floor: an upper or a lower limit on one number. It is kept in c.x.live.limits[field] as
   { hi, lo, from }. No value of the profile changes. */
function lfWhatifLimit(c, w, o) {
  o = o || {};
  const L = lfStore(c),
    hits = lfFieldsIn(w.quote, null),
    id = o.key || (hits.length ? hits[0].f.id : null),
    f = id ? lfField(id) : null,
    one = f ? lfOne(lfNums(w.quote), f.kind === "rate" ? "pct" : "money") : {},
    v = o.v != null ? +o.v : one.n ? one.n.v : null,
    side = w.type === "ceiling" ? "hi" : "lo",
    word = w.type === "ceiling" ? "Ceiling" : "Floor";
  if (!f || v == null || !isFinite(v))
    return { to: "limit", open: true, text: word + ": no field and number were heard. Set the limit in the review." };
  const lim = (L.limits[id] = L.limits[id] || {});
  lim[side] = v;
  lim.from = w.id;
  return {
    to: "limit",
    key: id,
    side,
    v,
    text: word + " for " + f.label + ": " + (f.kind === "rate" ? v + "%" : lfMoneyText(v)),
  };
}
const LF_SIM_WORDS = [
  ["kid", /\b(kid|kids|baby|child|pregnan\w*)\b/],
  ["rentbuy", /\brent(ing)? or buy(ing)?\b/],
  ["mortgage", /\b(buy(ing)? a (house|home|place|condo)|mortgage)\b/],
  ["car", /\b(car|truck)\b/],
  ["city", /\b(move|moved|moving|relocat\w*|another city)\b/],
  ["job", /\b(new job|job offer|a raise|quit|laid off|lose my job|lost my job)\b/],
  ["side", /\b(side (gig|hustle|job)|second job|another job|extra shifts?|freelanc\w*)\b/],
  ["break", /\b(sabbatical|time off|a break from work)\b/],
  ["debt", /\b(pay(ing)? off|extra (on|toward|towards))\b/],
  ["roth", /\broth\b/],
  ["stop", /\b(stop working|retire|retired|retiring)\b/],
  ["spend", /\b(cut back|spend less|spending)\b/],
];
/* Scenario: goes to What if. The link opens the simulator that fits the words, or the list of simulators.
   The what-if adds no block and changes no answer of a simulator. */
function lfWhatifScenario(c, w) {
  const q = String(w.quote || "").toLowerCase(),
    hit = LF_SIM_WORDS.find(p => p[1].test(q)),
    has = hit && (typeof SIMS === "undefined" || !!SIMS[hit[0]]);
  if (has)
    return {
      to: "sim",
      act: "simopen",
      v: hit[0],
      text: "What if: " + (typeof SIMS !== "undefined" && SIMS[hit[0]] && SIMS[hit[0]].n ? SIMS[hit[0]].n : hit[0]),
    };
  return { to: "sims", act: "sims", text: "What if: the simulators" };
}
/* Life transition: goes to "Break in case of emergency" (features/transit.js, the action transit). That
   screen has one transition today, a layoff. A later run adds more: it takes the what-if from here. */
function lfWhatifLife(c, w) {
  return { to: "transit", act: "transit", text: "Break in case of emergency" };
}
const LF_GOAL_WORDS = [
  ["Trip", /\b(trip|vacation|travel|traveling|visit)\b/],
  ["Wedding", /\bwedding\b/],
  ["Home", /\b(house|home|condo|down payment|place of (my|our) own)\b/],
  ["Car", /\b(car|truck)\b/],
  ["Sabbatical", /\b(sabbatical|time off)\b/],
  ["Quit my job", /\bquit\b/],
  ["Help family", /\bhelp (my|our) (mom|dad|parents|family|brother|sister|kids)\b/],
];
/* Goal or wish: goes to the bucket list (c.goals), with the shape that the game gives a new goal (the
   actions gplace and draftdone). The cost is the one number of the quote, or the typical cost of the game
   for that kind, and it is not marked sure. */
function lfWhatifGoal(c, w, o) {
  o = o || {};
  c.goals = c.goals || [];
  if (w.link && w.link.to === "goals" && c.goals.some(g => g.id === w.link.v)) return w.link;
  const q = String(w.quote || "").toLowerCase(),
    hit = LF_GOAL_WORDS.find(p => p[1].test(q)),
    k = hit ? hit[0] : "Something else",
    one = lfOne(lfNums(w.quote), "money"),
    typical = typeof goalTypical === "function" ? goalTypical(c, k) : 0,
    cost = Math.max(1, Math.round(o.cost != null ? +o.cost : one.n ? one.n.v : typical)),
    g = {
      id: typeof gid === "function" ? gid() : "lf" + w.id + "-" + c.goals.length,
      k,
      n: (String(o.name || "").trim() || k).slice(0, 18),
      cost,
      s: false,
      era: null,
      fund: 0,
      blk: null,
      d: typeof todayISO === "function" ? todayISO() : "",
      live: w.id,
    };
  c.goals.push(g);
  return { to: "goals", act: "goal", v: g.id, text: "Bucket list: " + g.n };
}

/* ---------- the link to the room ---------- */
/* Join the live fill to one room controller (lioRoom).
   o.game   { get(): the profile of the client or null, save(c, out) }. Only the device that holds the
            client's game has it. That device reads each line, sets the values and tells the other device.
            With the whole game loaded, save() calls afterMoney(c, realm before, false) and save().
   o.clock  { now, set, clear } (lioClock or simClock).
   With no o.game the device only shows what the other device heard.
   R.fill = { on, write, heard: [the heard list of this session], n: the counts, last: the last event }.
   R.hooks.fill gets { ev: { k, item }, n } on BOTH devices for each thing heard: a screen pulses on
   ev.k === "confirmed" and glows on "filled" and "corrected". */
function lfAttach(R, o) {
  o = o || {};
  const S = lfStateNew(R.sid),
    F = (R.fill = { on: true, write: !!o.game, heard: [], n: { whatifs: 0 }, last: null, S });
  let timer = null;
  const put = item => {
      const i = F.heard.findIndex(x => x.id === item.id);
      if (i >= 0) F.heard[i] = item;
      else F.heard.push(item);
    },
    out = (c, r) => {
      if (!r.changed) return;
      try {
        o.game.save(c, r);
      } catch (e) {
        report(e, "liveland.js: lfAttach save");
      }
      F.heard = lfHeard(c, R.sid).slice();
      F.n = lfCounts(c, R.sid);
      if (r.all) R.tell({ k: "fill", all: F.heard, n: F.n }); /* the list changed as a whole */
      r.events.forEach(ev => {
        F.last = ev;
        if (!r.all) R.tell({ k: "fill", ev, n: F.n });
        R.fire("fill", { ev, n: F.n, here: true });
      });
    };
  if (o.game) {
    R.hooks.line.push(line => {
      const c = o.game.get();
      if (!c) return;
      const now = o.clock.now();
      out(c, lfLine(S, c, line, now));
      if (S.ask && timer == null)
        timer = o.clock.set(() => {
          timer = null;
          const c2 = o.game.get();
          if (c2) out(c2, lfTick(S, c2, o.clock.now()));
        }, LF.ASK_MS + 100);
    });
    R.hooks.drop.push(id => {
      const c = o.game.get();
      if (c) out(c, lfUndo(S, c, id));
    });
    /* the other device joined, or joined again: it gets the whole list */
    R.hooks.hello.push(() => {
      const c = o.game.get();
      if (!c) return;
      F.heard = lfHeard(c, R.sid).slice();
      F.n = lfCounts(c, R.sid);
      R.tell({ k: "fill", all: F.heard, n: F.n });
    });
    const c0 = o.game.get();
    if (c0) {
      F.heard = lfHeard(c0, R.sid).slice();
      F.n = lfCounts(c0, R.sid);
    }
  } else
    R.hooks.fill.push(p => {
      if (p.here) return;
      if (p.all) F.heard = p.all;
      else if (p.ev && p.ev.item) {
        put(p.ev.item);
        F.last = p.ev;
        /* an item that took the place of an older one */
        if (p.ev.item.fixes) {
          const old = F.heard.find(x => x.id === p.ev.item.fixes);
          if (old) {
            old.st = "corrected";
            old.by = p.ev.item.id;
          }
        }
      }
      if (p.n) F.n = p.n;
    });
  return F;
}
