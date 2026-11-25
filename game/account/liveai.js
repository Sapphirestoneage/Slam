/* ============================================================================
   SLAM the Game: account/liveai.js
   PURPOSE     Live Session Mode, Part 8: after the call, the AI pass, behind its own switch (AI_PASS_READY in
               account/liveflag.js). (1) "Drop in your recording's text file": the .txt of Samsung Voice
               Recorder, with or without "Speaker 1 / Speaker 2", read on this device, with a size cap.
               (2) Which speaker is the coach: a pure function compares the file's lines with the labeled
               lines of the app (shared words, in order) and picks the mapping, with a confidence; when it
               is not sure, the coach taps which speaker they are. (3) One request to the Edge Function
               (supabase/functions/live-ai-pass), which reads the saved lines itself and asks the AI. (4) The
               answer is checked here (laiParse) and its proposals go into the SAME grouped review of Part 7,
               from "the AI pass" or "the Samsung file", never applied without the coach (laiMerge).
               (5) Draft session notes and a next-call agenda, editable, saved into the coach's notes
               (coach_notes, the note path of the coach page) only when the coach taps Save. (6) The rough
               token count of each pass. (7) The reminder "Delete the recording from your phone."
   INPUT       The profile c of the client (the coach's copy, lgCoach in account/livegame.js). The room
               controller R (its lines, R.sid, R.game). The text of a file. The answer of the Edge Function.
   OUTPUT      Values only: laiFileRead, laiMatch, laiMapSet, laiFileText, laiAsk, laiParse, laiMerge, laiPasses,
               laiTokensLine, laiNoteBody. HTML: laiCardHTML, laiNotesHTML. The page: laiAdapter, laiRun,
               laiFileTake, laiInput, laiSaveNotes, laiClick (called by livePartClick in account/livereview.js).
   DEPENDS ON  core/report.js, account/liveflag.js (aiOn), account/live.js (lvWords), account/livefill.js
               (LF_FIELDS, LF_TYPES, lfField), account/liveland.js (lfStore, lfTarget, lfOpen, lfNow, lfMonthly,
               lfShow, lfLabel, lfArea, lfWhatifs, lfWhatifSuggest, LF_WHY), account/livescreen.js (lsEsc),
               account/coachpage.js (CP, cpNote), screens/dash.js (dkCard). session.html loads this file.
   RULES       Nothing applies without the coach: a proposal is a kept item of the heard list (st "kept",
               src "ai" or "file"); its number lands only when the coach approves it (lrvApprove, as a Guess).
               A value that the person entered, checked, or confirmed out loud is never changed.
               The notes and the agenda are the coach's: they are NOT kept on the client's profile (the client
               can read their own game). They stay on the coach's device until Save puts them in coach_notes.
               No key is in this file or anywhere in the repository: the Edge Function reads the key from its
               own secret. A test never calls the real function: it gives R.aiFn a stand-in (simAi).
   STORED      c.x.live.ai = { [session id]: { passes: [{ id, at, tokens: { in, out }, model, n, same, file }] } }.
               New on Nov 25 2026. A heard item of the AI pass: the shape of lfItem, with src ("ai" | "file"),
               pass (the id of the pass), per (income: how it was said), and line null. Older items of an earlier
               pass that the coach did not review get st "corrected" with by = the new pass. Nothing was renamed
               or removed. On the coach's device: slam_live_ai_<session id> (the draft notes and agenda).
   STATE       R.ai = { file, match, busy, msg, draft: { notes, changed, problems, ask }, saved, remind }.
   ========================================================================= */
const LAI = {
  FN: "live-ai-pass" /* the name of the Edge Function */,
  FILE_MAX: 300000 /* bytes: the biggest text file that is read */,
  SEND_MAX: 190000 /* characters of the file that go to the pass (the function takes 200,000) */,
  LINES_MAX: 6000 /* lines of one file */,
  MIN_WORDS: 3 /* a line of fewer words is not used to match the speakers */,
  NEAR: 0.5 /* two lines are one sentence when this share of their words is the same */,
  LOOK: 60 /* how far ahead in the app's lines a file line is looked for (the order of the call) */,
  SURE: 0.8 /* the speaker mapping is sure from this confidence */,
  FITS: 0.2 /* the file is this call when this share of its lines is in the app's lines */,
  KEY: "slam_live_ai_" /* + the session id: the coach's draft notes, on the coach's device */,
};
const LAI_RHYTHMS = ["Weekly", "Every 2 weeks", "Twice a month", "Monthly", "It varies"];
const LAI_SIDE = { coach: "You", client: "Them", "": "Not sure" };

/* ---------- 1. the text file of the phone's recorder ---------- */
/* Read the text of the file. Samsung Voice Recorder writes the words with a speaker label and a time, often on
   a line of their own ("Speaker 1  00:12"), sometimes in front of the words ("Speaker 1: ..."). A speaker that
   was given a name in the recorder has that name ("Eli 00:12"). With no labels each line is a line.
   Gives { ok, why, lines: [{ n, spk, text }], labels: [names in the order they came], labeled }. */
function laiFileRead(text) {
  const s = String(text == null ? "" : text).replace(/^﻿/, "");
  if (s.length > LAI.FILE_MAX)
    return { ok: false, why: "This file is too big. The limit is 300 KB of text.", lines: [] };
  if (/[\u0000-\u0008\u000E-\u001F]/.test(s.slice(0, 2000)))
    return { ok: false, why: "This does not look like a text file. Pick the .txt that the recorder made.", lines: [] };
  const TIME = "\\(?\\[?\\d{1,2}:\\d{2}(?::\\d{2})?\\]?\\)?",
    label = new RegExp(
      "^\\s*((?:speaker|person|participant|voice)\\s*\\d{1,2})\\s*(?:" + TIME + ")?\\s*[:\\-]?\\s*(.*)$",
      "i"
    ),
    named = new RegExp("^\\s*([A-Z][A-Za-z.'-]{0,20}(?: [A-Z][A-Za-z.'-]{0,20})?)\\s+" + TIME + "\\s*$"),
    onlyTime = new RegExp("^\\s*" + TIME + "\\s*$"),
    lead = new RegExp("^\\s*" + TIME + "\\s*[:\\-]?\\s*"),
    lines = [],
    labels = [];
  let spk = null;
  const said = name => {
    const k = name.replace(/\s+/g, " ").trim();
    const t = k.replace(
      /^(speaker|person|participant|voice)\s*(\d+)$/i,
      (m, a, b) => a[0].toUpperCase() + a.slice(1).toLowerCase() + " " + b
    );
    if (labels.indexOf(t) < 0) labels.push(t);
    return t;
  };
  s.split(/\r?\n|\r/).forEach(raw => {
    if (lines.length >= LAI.LINES_MAX || !raw.trim() || onlyTime.test(raw)) return;
    let m = raw.match(label);
    if (m) {
      spk = said(m[1]);
      const rest = m[2].replace(lead, "").trim();
      if (rest) lines.push({ n: lines.length, spk, text: rest.slice(0, 2000) });
      return;
    }
    m = raw.match(named);
    if (m) {
      spk = said(m[1]);
      return;
    }
    const t = raw.replace(lead, "").trim();
    if (t) lines.push({ n: lines.length, spk, text: t.slice(0, 2000) });
  });
  if (!lines.length) return { ok: false, why: "No words were found in this file.", lines: [] };
  return { ok: true, why: "", lines, labels, labeled: labels.length > 0 };
}

/* ---------- 2. who is who: Speaker 1 / Speaker 2 against You / Them ---------- */
/* How alike two lists of words are: the shared words over the words of the longer line. */
function laiNear(a, b) {
  if (!a.length || !b.length) return 0;
  const seen = {};
  b.forEach(w => (seen[w] = (seen[w] || 0) + 1));
  let n = 0;
  a.forEach(w => {
    if (seen[w]) {
      seen[w]--;
      n++;
    }
  });
  return n / Math.max(a.length, b.length);
}
/* MATCH THE FILE TO THE CALL. file: laiFileRead().lines. app: the lines of the app, the oldest first
   ({ side, text }). Each file line of 3 words or more is looked for in the app's lines, in the order of the
   call (a little back, then ahead). The side of the app line that it matches is a vote for its speaker.
   Gives { lines: [{ n, spk, text, side, hit }], tried, matched, cover, fits, labeled, labels, map, conf, sure,
   votes }. map: { "Speaker 1": "coach", "Speaker 2": "client" } or null. conf: from 0 to 1. With no labels in
   the file, a line that matches gets the side of the app's line, and the others are "" (not sure). */
function laiMatch(file, app) {
  const A = (app || []).map(l => ({ side: l.side, w: lvWords(l.text) })),
    votes = {},
    labels = [];
  let pos = 0,
    tried = 0,
    matched = 0;
  const lines = (file || []).map(fl => {
    const w = lvWords(fl.text),
      out = { n: fl.n, spk: fl.spk || null, text: fl.text, side: "", hit: false };
    if (fl.spk && labels.indexOf(fl.spk) < 0) labels.push(fl.spk);
    if (w.length < LAI.MIN_WORDS || !A.length) return out;
    tried++;
    let best = -1,
      score = 0;
    const from = Math.max(0, pos - 5),
      to = Math.min(A.length, pos + LAI.LOOK);
    for (let i = from; i < to; i++) {
      const v = laiNear(w, A[i].w);
      if (v > score) {
        score = v;
        best = i;
      }
    }
    /* out of order (a long silence, a line the app did not hear): the whole call, with a higher bar */
    if (score < LAI.NEAR)
      for (let i = 0; i < A.length; i++) {
        const v = laiNear(w, A[i].w);
        if (v >= LAI.NEAR + 0.15 && v > score) {
          score = v;
          best = i;
        }
      }
    if (best < 0 || score < LAI.NEAR) return out;
    matched++;
    pos = best + 1;
    out.hit = true;
    out.side = A[best].side;
    if (fl.spk) {
      votes[fl.spk] = votes[fl.spk] || { coach: 0, client: 0 };
      votes[fl.spk][A[best].side === "coach" ? "coach" : "client"]++;
    }
    return out;
  });
  const cover = tried ? matched / tried : 0,
    fits = matched >= 3 && cover >= LAI.FITS,
    r = {
      lines,
      tried,
      matched,
      cover,
      fits,
      labeled: labels.length > 0,
      labels,
      map: null,
      conf: 0,
      sure: false,
      votes,
    };
  if (!labels.length) return r;
  const v = k => votes[k] || { coach: 0, client: 0 };
  let map = {},
    agree = 0,
    all = 0;
  if (labels.length === 2) {
    const [a, b] = labels,
      one = v(a).coach + v(b).client,
      two = v(a).client + v(b).coach;
    map = one >= two ? { [a]: "coach", [b]: "client" } : { [a]: "client", [b]: "coach" };
    agree = Math.max(one, two);
    all = one + two;
  } else
    labels.forEach(k => {
      const x = v(k);
      map[k] = x.coach > x.client ? "coach" : "client";
      agree += Math.max(x.coach, x.client);
      all += x.coach + x.client;
    });
  r.conf = all ? agree / all : 0;
  r.map = all ? map : null;
  r.sure = !!r.map && fits && r.conf >= LAI.SURE && labels.every(k => v(k).coach + v(k).client > 0);
  if (r.map) lines.forEach(l => (l.side = l.spk && r.map[l.spk] ? r.map[l.spk] : l.side));
  return r;
}
/* The coach tapped "<label> is me": that label is the coach, each other label is the client. Gives a new match. */
function laiMapSet(match, me) {
  const map = {};
  match.labels.forEach(k => (map[k] = k === me ? "coach" : "client"));
  const lines = match.lines.map(l => Object.assign({}, l, { side: l.spk ? map[l.spk] : l.side }));
  return Object.assign({}, match, { map, lines, sure: true, byHand: true, conf: 1 });
}
/* The text of the file that goes to the pass, with the speakers the coach checked: "Coach: ...", "Client: ...",
   "Not sure: ...". Gives { text } or { why } (too long: nothing is cut silently). */
function laiFileText(match) {
  if (!match) return { text: "" };
  const who = { coach: "Coach: ", client: "Client: " },
    text = match.lines.map(l => (who[l.side] || "Not sure: ") + l.text).join("\n");
  if (text.length > LAI.SEND_MAX)
    return { why: "This file is too long for one pass. Cut it in two in a text editor, and drop in one part." };
  return { text };
}

/* ---------- 3. the request, and the answer ---------- */
/* What the Edge Function gets. It reads the lines of the call itself; from here it gets the list of fields,
   the what-ifs of this call (their id and the id of their line, never their words) and the optional file. */
function laiAsk(c, sid, fileText) {
  return {
    sid,
    fields: LF_FIELDS.filter(f => f.kind !== "names").map(f => ({ id: f.id, label: f.label, kind: f.kind })),
    whatifs: lfWhatifs(c, sid)
      .filter(w => !w.type)
      .map(w => ({ id: w.id, line: w.line || "" })),
    file: fileText || "",
  };
}
const laiNum = s => {
  const t = String(s == null ? "" : s)
    .replace(/[$,%\s]/g, "")
    .replace(/^usd/i, "");
  return /^\d+(\.\d+)?$/.test(t) ? +t : null;
};
const laiText = (s, n) =>
  String(s == null ? "" : s)
    .replace(/[\u0000-\u001F]+/g, " ")
    .replace(new RegExp(String.fromCharCode(8212), "g"), ", ")
    .trim()
    .slice(0, n);
const laiList = (a, n) =>
  (Array.isArray(a) ? a : [])
    .map(x => laiText(x, 300))
    .filter(Boolean)
    .slice(0, n);
/* CHECK THE ANSWER of the Edge Function (or of a stand-in). Nothing of it is trusted: each field id must be a
   field of the game, each value a number in a sane range (or a pay rhythm), each what-if type one of the five.
   Gives { ok: true, fields: [{ field, v, rough, per, quote, speaker, src }], whatifs: [{ id, type }], notes,
   agenda: { changed, problems, ask }, tokens: { in, out }, model, bad } or { ok: false, why, code, tokens }. */
function laiParse(raw) {
  const r = raw && typeof raw === "object" ? raw : null,
    u = (r && r.usage) || {},
    tokens = { in: Math.max(0, Math.round(+u.input_tokens || 0)), out: Math.max(0, Math.round(+u.output_tokens || 0)) };
  if (!r) return { ok: false, code: "none", why: "The AI pass did not answer. Nothing was changed.", tokens };
  if (r.ok !== true)
    return {
      ok: false,
      code: laiText(r.error, 40) || "none",
      why: laiText(r.message, 200) || "The AI pass did not answer. Nothing was changed.",
      tokens,
    };
  const res = r.result || {},
    by = {};
  let bad = 0;
  (Array.isArray(res.fields) ? res.fields : []).slice(0, 80).forEach(p => {
    const f = p && lfField(String(p.field || ""));
    if (!f || f.kind === "names") return bad++;
    let v = null;
    if (f.kind === "rhythm") {
      const t = String(p.value || "").trim();
      v = LAI_RHYTHMS.find(x => x.toLowerCase() === t.toLowerCase()) || null;
    } else {
      v = laiNum(p.value);
      if (v != null && f.kind === "rate" && !(v >= 0 && v <= 60)) v = null;
      if (v != null && f.kind === "money" && !(v >= 0 && v <= 1e7)) v = null;
    }
    if (v == null) return bad++;
    by[f.id] = {
      field: f.id,
      v,
      rough: p.rough === true,
      per: ["month", "paycheck", "week", "year", "none"].indexOf(p.per) >= 0 ? p.per : "none",
      quote: laiText(p.quote, 240),
      speaker: p.speaker === "coach" ? "coach" : "client",
      src: p.source === "file" ? "file" : "ai",
    };
  });
  const types = {};
  (Array.isArray(res.whatif_types) ? res.whatif_types : []).slice(0, 80).forEach(w => {
    if (!w || !LF_TYPES.some(t => t[0] === w.type) || typeof w.id !== "string") return bad++;
    types[w.id] = w.type;
  });
  const ag = res.agenda || {};
  return {
    ok: true,
    fields: Object.keys(by).map(k => by[k]),
    whatifs: Object.keys(types).map(id => ({ id, type: types[id] })),
    notes: laiText(res.notes, 4000),
    agenda: { changed: laiList(ag.changed, 8), problems: laiList(ag.problems, 3), ask: laiList(ag.ask_next, 8) },
    tokens,
    model: laiText(r.model, 60),
    bad,
  };
}
/* PUT ONE ANSWER IN THE REVIEW. Each proposal becomes one kept item of the heard list of this session, in its
   area: never a value on the profile. A proposal that the profile already holds adds nothing (same). A what-if
   type is a suggestion only (lfWhatifSuggest): Approve sets it. Gives { added, same, typed, pass }. */
function laiMerge(c, sid, P, now, passId) {
  const L = lfStore(c),
    A = ((L.ai = L.ai || {})[sid] = L.ai[sid] || { passes: [] }),
    B = L.review || {},
    pid = passId || "p" + (A.passes.length + 1);
  /* an earlier pass that nobody reviewed gives way to this one */
  L.heard.forEach(x => {
    if (x.sid === sid && x.src && x.st === "kept" && !B[x.id]) {
      x.st = "corrected";
      x.by = pid;
    }
  });
  let added = 0,
    same = 0,
    typed = 0;
  P.fields.forEach(p => {
    const t = lfTarget(p.field);
    if (!t) return;
    let v = p.v,
      why = "";
    if (t.type === "row" && t.f.area === "income") {
      const mo = lfMonthly(c, L, { v: p.v, per: { paycheck: "pay", none: null }[p.per] || p.per });
      if (mo.why) {
        why = mo.why;
        v = null;
      } else v = Math.round(mo.v);
    } else if (t.type === "row") v = Math.round(v);
    const cur = lfNow(c, L, t);
    if (v != null && cur === v) return same++;
    const open = lfOpen(c, L, t),
      heard = L.marks[p.field],
      differs = !!heard && heard.v !== v && heard.sid === sid;
    if (open.open === "no") why = open.why;
    else if (open.open === "voice") why = LF_WHY.voice;
    const notes = [
      p.src === "file" ? "Only in the Samsung file." : "",
      p.rough ? "A rough number." : "",
      p.speaker === "coach" ? "Only you said this number." : "",
      differs ? "The call heard " + lfShow(t, heard.v) + "." : "",
    ].filter(Boolean);
    L.heard.push({
      id: "a" + ++L.n,
      sid,
      line: null,
      side: p.speaker,
      src: p.src,
      pass: pid,
      quote: p.quote,
      at: now,
      st: "kept",
      key: p.field,
      label: lfLabel(p.field),
      area: lfArea(p.field),
      v,
      show:
        v == null
          ? lfShow(t, p.v) + (p.per !== "none" ? " a " + (p.per === "paycheck" ? "paycheck" : p.per) : "")
          : lfShow(t, v),
      rough: p.rough,
      per: p.per,
      why: (why ? why + " " : "") + (notes.length ? notes.join(" ") + " " : "") + "Proposed by the AI pass.",
      unsure: p.rough || p.speaker === "coach" || p.src === "file" || differs || v == null,
    });
    added++;
  });
  const mine = {};
  lfWhatifs(c, sid).forEach(w => (mine[w.id] = w));
  P.whatifs.forEach(w => {
    if (mine[w.id] && !mine[w.id].type && lfWhatifSuggest(c, w.id, w.type, "ai")) typed++;
  });
  A.passes.push({ id: pid, at: now, tokens: P.tokens, model: P.model || "", n: added, same, typed, file: !!P.file });
  return { added, same, typed, pass: pid };
}
/* The passes of one session, the oldest first. */
function laiPasses(c, sid) {
  const L = c && c.x && c.x.live;
  return (L && L.ai && L.ai[sid] && L.ai[sid].passes) || [];
}
/* "About 18,400 tokens (16,000 in, 2,400 out)": the count the API reported, rounded to the hundred. */
function laiTokensLine(t) {
  const r = n => (Math.round((n || 0) / 100) * 100).toLocaleString("en-US"),
    all = (t && t.in + t.out) || 0;
  return "About " + r(all) + " tokens (" + r(t && t.in) + " in, " + r(t && t.out) + " out)";
}
/* The text that Save puts in the coach's notes (coach_notes keeps 4,000 characters). */
function laiNoteBody(d, when) {
  const list = (head, a) => {
    const items = String(a || "")
      .split(/\n+/)
      .map(s => s.trim())
      .filter(Boolean);
    return items.length ? "\n\n" + head + "\n" + items.map(s => "- " + s).join("\n") : "";
  };
  return (
    "Live session, " +
    when +
    "\n\n" +
    String(d.notes || "").trim() +
    list("What changed", d.changed) +
    list("Top 3 problems", d.problems) +
    list("What to ask next", d.ask)
  ).slice(0, 4000);
}

/* ---------- 4. HTML only ---------- */
const laiTime = at => {
  try {
    return new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch (e) {
    report(e, "liveai.js: laiTime");
    return "";
  }
};
/* What the file says about who is who, and the taps to set it. */
function laiFileHTML(S) {
  const F = S.file,
    M = S.match;
  if (!F) return "";
  if (!F.ok) return `<p class="note">${lsEsc(F.why)}</p>`;
  const pct = Math.round((M.cover || 0) * 100),
    head = `<p class="tiny muted">${lsEsc(F.name)}: ${F.lines.length} ${F.lines.length === 1 ? "line" : "lines"}. ${M.matched} of ${M.tried} longer lines match what the app heard.</p>`;
  let who = "";
  if (!M.fits)
    who = `<p class="note">Few of its lines match this call. If it is a different recording, take it out. If it is this call, it still helps, and each value from it is marked not sure.</p>`;
  if (M.labeled && M.map) {
    const me = Object.keys(M.map).find(k => M.map[k] === "coach") || M.labels[0];
    who +=
      `<p>${M.sure ? "" : "Not sure. "}<b>${lsEsc(me)}</b> is you, ${M.labels
        .filter(k => k !== me)
        .map(k => "<b>" + lsEsc(k) + "</b>")
        .join(
          ", "
        )} is them${M.byHand ? " (you set this)." : " (" + Math.round(M.conf * 100) + "% of the matched lines agree)."}</p>` +
      (M.sure && !M.byHand
        ? `<button data-a="laime" data-v="${lsEsc(M.labels.find(k => k !== me) || me)}">Not right? ${lsEsc(M.labels.find(k => k !== me) || me)} is me</button>`
        : `<p class="tiny muted">Tap which one is you.</p><div class="chips">${M.labels
            .map(
              k =>
                `<button class="chip${M.byHand && M.map[k] === "coach" ? " on" : ""}" data-a="laime" data-v="${lsEsc(k)}" aria-pressed="${!!(M.byHand && M.map[k] === "coach")}">${lsEsc(k)} is me</button>`
            )
            .join("")}</div>`);
  } else if (M.labeled)
    who +=
      `<p>The file names ${M.labels.map(k => "<b>" + lsEsc(k) + "</b>").join(" and ")}, and none of their lines match the call. Tap which one is you.</p>` +
      `<div class="chips">${M.labels.map(k => `<button class="chip" data-a="laime" data-v="${lsEsc(k)}">${lsEsc(k)} is me</button>`).join("")}</div>`;
  else
    who += `<p class="tiny muted">No speaker names in this file. A line that matches the call gets the speaker of the call (${pct}% do). The AI pass reads the others as not sure.</p>`;
  return head + who + `<button data-a="laiout">Take this file out</button>`;
}
/* THE AI CARD of the review: the drop-in, the run, the passes with their token counts, the reminder. */
function laiCardHTML(R, c) {
  if (typeof aiOn !== "function" || !aiOn()) return "";
  const S = R.ai || (R.ai = {}),
    passes = laiPasses(c, R.sid),
    needMe = S.match && S.match.labeled && !S.match.sure && !S.match.byHand;
  return dkCard(
    "The AI pass",
    `<p class="tiny muted">After the call, the AI reads the saved words (and your recording's text, if you add it) and proposes the rest. Each proposal comes into the groups below. Nothing changes until you approve it.</p>` +
      `<div id="laidrop" class="laidrop"><label class="btn" for="laifile">Drop in your recording's text file</label><input id="laifile" class="laifile" type="file" accept=".txt,text/plain"><div class="hint">The .txt from Samsung Voice Recorder, with or without Speaker 1 / Speaker 2. It is read on this device, up to 300 KB.</div></div>` +
      laiFileHTML(S) +
      (S.msg ? `<p class="note">${lsEsc(S.msg)}</p>` : "") +
      (S.busy
        ? `<p class="muted">The AI pass is reading the call. This can take up to two minutes.</p>`
        : `<button class="wide${passes.length ? "" : " primary"}" data-a="lairun"${needMe ? " disabled" : ""}>${passes.length ? "Run the AI pass again" : "Run the AI pass"}</button>` +
          (needMe ? `<p class="tiny muted">Tap which speaker is you first.</p>` : "")) +
      (passes.length
        ? `<ul class="heard">${passes
            .map(
              (p, i) =>
                `<li><b>Pass ${i + 1}, ${lsEsc(laiTime(p.at))}</b> ${lsEsc(laiTokensLine(p.tokens))}. ${p.n} ${p.n === 1 ? "proposal" : "proposals"}${p.same ? ", " + p.same + " the same as the profile" : ""}${p.typed ? ", " + p.typed + " what-if " + (p.typed === 1 ? "type" : "types") : ""}.</li>`
            )
            .join("")}</ul>`
        : "") +
      (passes.length && (S.remind || S.file)
        ? `<p class="note">Delete the recording from your phone. SLAM keeps the words only.</p>`
        : passes.length
          ? `<p class="tiny muted">If a recording of this call is on your phone, delete it there.</p>`
          : ""),
    { right: passes.length ? dkPill(passes.length + (passes.length === 1 ? " pass" : " passes")) : "" }
  );
}
/* The draft session notes and the next-call agenda: editable, saved only on Save. */
function laiNotesHTML(R) {
  if (typeof aiOn !== "function" || !aiOn()) return "";
  const S = R.ai || (R.ai = {});
  if (!S.draft) laiLoad(R, laiStore());
  const d = S.draft;
  if (!d) return "";
  const box = (k, label, hint, rows) =>
    `<div><label for="lai-${k}">${label}</label><textarea id="lai-${k}" data-lai="${k}" rows="${rows}">${lsEsc(d[k] || "")}</textarea><div class="hint">${hint}</div></div>`;
  const open = !!(R.ls && R.ls.open && R.ls.open["lai:notes"]);
  return dkCard(
    "Session notes and the next call",
    `<details class="lsgroup" data-g="lai:notes" data-d="${open ? 1 : 0}"${open ? " open" : ""}><summary><span>${S.saved ? "Saved to your notes" : "A draft to read and save"}</span><span class="muted tiny">${S.saved ? "Open to change it" : "Open"}</span></summary><div class="lsrows">` +
      `<p class="tiny muted">A draft from the AI pass. Change what you like. It goes into your notes on the coach page when you tap Save, and not before. Your client does not see it.</p>` +
      box("notes", "Session notes", "Plain sentences, for you.", 5) +
      box("changed", "What changed", "One thing on each line.", 3) +
      box("problems", "Top 3 problems", "One on each line.", 3) +
      box("ask", "What to ask next", "One question on each line.", 3) +
      (S.saved
        ? `<p class="done">Saved to your notes at ${lsEsc(laiTime(S.saved))}.</p><button class="wide" data-a="laisave">Save again</button>`
        : `<button class="wide primary" data-a="laisave">Save to my notes</button>`) +
      `</div></details>`
  );
}

/* ---------- 5. the page ---------- */
/* The way to the Edge Function. A test or a made-up call gives R.aiFn (simAi in livesim.js). */
function laiAdapter(R) {
  if (R.aiFn) return R.aiFn;
  const sb = R.game && R.game.sb;
  if (!sb || !sb.functions) return null;
  return async body => {
    const r = await sb.functions.invoke(LAI.FN, { body });
    if (!r.error) return r.data;
    /* the function answered with an error code: its words are in the body */
    try {
      if (r.error.context && typeof r.error.context.json === "function") return await r.error.context.json();
    } catch (e) {
      report(e, "liveai.js: laiAdapter");
    }
    return {
      ok: false,
      error: "net",
      message: /not found|404/i.test(String(r.error.message))
        ? "The AI pass is not set up yet (docs/AI-PASS-SETUP.md). Nothing was changed."
        : "The AI pass could not be reached. Check your internet, then try again. Nothing was changed.",
    };
  };
}
/* The draft of the coach, kept on the coach's device until Save. */
function laiKeep(R, store) {
  try {
    if (store && R.ai && R.ai.draft) store.setItem(LAI.KEY + R.sid, JSON.stringify(R.ai.draft));
  } catch (e) {
    report(e, "liveai.js: laiKeep");
  }
}
function laiLoad(R, store) {
  const S = R.ai || (R.ai = {});
  if (S.draft || !store) return;
  try {
    const raw = store.getItem(LAI.KEY + R.sid);
    if (raw) S.draft = JSON.parse(raw);
  } catch (e) {
    report(e, "liveai.js: laiLoad");
  }
}
const laiStore = () => (typeof localStorage !== "undefined" ? localStorage : null);
/* RUN ONE PASS: one request, the answer checked, the proposals put in the review through the coach's saver
   (R.game.act: the client's game is read again and saved with the stamp). Gives the merge, or null. */
async function laiRun(R, now) {
  const S = R.ai || (R.ai = {}),
    fn = laiAdapter(R),
    A = R.game,
    c = A && A.get ? A.get() : null;
  if (!fn || !A || !A.act || !c) {
    S.msg = "The AI pass cannot run on this page now. Nothing was changed.";
    return null;
  }
  const ft = laiFileText(S.match && S.file && S.file.ok ? S.match : null);
  if (ft.why) {
    S.msg = ft.why;
    return null;
  }
  S.busy = true;
  S.msg = "";
  let P;
  try {
    P = laiParse(await fn(laiAsk(c, R.sid, ft.text)));
  } catch (e) {
    report(e, "liveai.js: laiRun");
    P = laiParse(null);
  }
  S.busy = false;
  if (!P.ok) {
    S.msg = P.why;
    return null;
  }
  P.file = !!ft.text;
  const at = now == null ? Date.now() : now,
    out = await A.act(c2 => laiMerge(c2, R.sid, P, at), "AI pass");
  if (!out) {
    S.msg = A.err || "The proposals did not save. Nothing was changed. Try again.";
    return null;
  }
  S.draft = {
    notes: P.notes,
    changed: P.agenda.changed.join("\n"),
    problems: P.agenda.problems.join("\n"),
    ask: P.agenda.ask.join("\n"),
  };
  S.saved = null;
  S.remind = true;
  laiKeep(R, laiStore());
  S.msg = out.added
    ? out.added + (out.added === 1 ? " proposal is" : " proposals are") + " in the groups below, from the AI pass."
    : "The AI pass found nothing new for the profile.";
  return out;
}
/* A file was picked or dropped. Read on this device. */
async function laiFileTake(R, file) {
  const S = R.ai || (R.ai = {});
  S.msg = "";
  if (!file) return;
  if (file.size > LAI.FILE_MAX) {
    S.file = { ok: false, why: "This file is too big. The limit is 300 KB of text.", name: file.name };
    S.match = null;
    return;
  }
  let text = "";
  try {
    text = await file.text();
  } catch (e) {
    report(e, "liveai.js: laiFileTake");
    S.file = { ok: false, why: "This file could not be read.", name: file.name };
    return;
  }
  S.file = Object.assign({ name: String(file.name || "the file").slice(0, 80) }, laiFileRead(text));
  S.match = S.file.ok ? laiMatch(S.file.lines, R.lines) : null;
}
/* A box of the draft changed: keep the words (a draw of the screen puts them back). */
function laiInput(el, R) {
  const k = el && el.dataset && el.dataset.lai;
  if (!k || !R || !R.ai || !R.ai.draft) return;
  R.ai.draft[k] = String(el.value || "").slice(0, 3000);
  laiKeep(R, laiStore());
}
/* Save: the notes go into coach_notes, the way the coach page saves a note (cpNote). */
async function laiSaveNotes(R, now) {
  const S = R.ai || {},
    A = R.game;
  if (!S.draft || !A || !A.owner) return false;
  if (A.sb) CP.sb = A.sb;
  CP.notesOk = true;
  const when = new Date(now == null ? Date.now() : now).toLocaleDateString(),
    ok = await cpNote("note", A.owner, laiNoteBody(S.draft, when));
  S.saved = ok ? (now == null ? Date.now() : now) : null;
  S.msg = ok ? "" : "The notes did not save. Try again.";
  return ok;
}
/* Part of livePartClick() in livereview.js: the taps of the AI card. True: the tap was taken. */
async function laiClick(a, t, R) {
  if (!/^lai/.test(a) || !R) return false;
  const S = R.ai || (R.ai = {});
  if (a === "lairun") await laiRun(R);
  else if (a === "laime" && S.match) S.match = laiMapSet(S.match, t.dataset.v);
  else if (a === "laiout") {
    S.file = null;
    S.match = null;
    const el = typeof document !== "undefined" ? document.getElementById("laifile") : null;
    if (el) el.value = "";
  } else if (a === "laisave") await laiSaveNotes(R);
  else return false;
  return true;
}
