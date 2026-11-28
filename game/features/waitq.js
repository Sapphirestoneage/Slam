/* ============================================================================
   SLAM the Game: features/waitq.js
   PURPOSE     Questions that can wait (run CC-1, item 9, Nov 27 2026). Setup no longer asks who the
               player shares money with, or how many roommates live with the player. Each one is a
               quest of Next Steps: one question, one tap. A player with roommates or a partner also
               gets one quest that opens "Sharing costs fairly" (the split of shared bills and
               subscriptions). The questions and their choices are the ones of setup.
   INPUT       The profile: c.share, c.roommateCount, c.live, c.rel, c.x.later (the names of the
               questions that wait), c.x.unsure (the answers that are a Guess of the game), c.x.plan.
               The game: G.house.share. The open sheet (W.kind waitq): W.k, the question.
   OUTPUT      Data: WQ_LIST. Functions: wqWaits, wqFill, wqTask, wqSeed, wqSheet. Parts of functions in
               other files: wqWaits (smQs and SETUP[3].req in smart.js, amHouseQs in amounts.js), wqFill
               (finishSetupTax in smart.js), wqTask (plSeedWeek in planner.js), wqSeed
               (finishSetupPlanEnd in planner.js), wqOpen (plLater in planner.js). Actions (ACT):
               wqset, wqunsure.
   DEPENDS ON  core/report.js, core/engine.js (NOT_SURE, TAP_ONE, todayISO), screens/ui.js (head, esc,
               sheet, closeSheet, save, render), screens/smart.js (SM_Q, SM_SINGLE, SM_UNSURE, smLab),
               screens/planner.js (plX, plId, plOpen).
   RULES       A value has one home: the answer goes to the key that setup wrote (c.share and
               G.house.share; c.roommateCount). Nothing is asked twice: a question that has the player's
               own answer makes no quest. Empty is not zero: until the player answers, the number of
               roommates is empty (the size of the household counts one roommate, as it did for "Skip"),
               and "No one" for shared money is a Guess of the game (c.x.unsure).
   COMPAT      Two more names can be in c.x.later: "share" and "mates". An old saved game has none of
               them, and nothing changes for it. A copy of a round that was left in the middle keeps
               the answers it has: a question that it already answered makes no quest.
   ========================================================================= */
/* The questions that wait. k: the key of the question in setup. later: its name in c.x.later. page: its page of
   setup, for "Change my answers". t, s: the words of the quest. when(o): the question fits this player. */
const WQ_LIST = [
  {
    k: "share",
    later: "share",
    page: 3,
    t: "Say who you share money with",
    s: "One tap. A joint account or a shared goal counts. Splitting rent does not.",
    when: o => !SM_SINGLE.includes(o.rel),
  },
  {
    k: "roommateQ",
    later: "mates",
    page: 2,
    t: "Say how many roommates you have",
    s: "One tap. It sets the size of your household.",
    when: o => (o.live || []).includes("Roommates"),
  },
];
/* The quest for the split of shared bills and subscriptions. Setup never asked about it. It opens the tool the
   game has: Sharing costs fairly. */
const WQ_SPLIT = {
  t: "Split shared bills and subscriptions",
  s: "Five fair ways to divide rent, bills and subscriptions, side by side.",
  a: "fair",
  v: "wq:split",
  mins: 5,
  when: c => (c.live || []).some(k => k === "Roommates" || k === "A partner"),
};
/* Part of smQs() and SETUP[3].req in smart.js, and of amHouseQs() in amounts.js. True when setup does not ask the
   question k: the first run of setup for the player's own profile. "Change my answers" still shows it, and so does
   the setup of a second person. */
function wqWaits(w, k) {
  return !!(w && w.kind === "setup" && w.mode !== "edit" && !w.add && WQ_LIST.some(x => x.k === k));
}
/* Part of finishSetupTax() in smart.js. A question that waited gets the stock answer of the game as a Guess, and its
   name goes on the list of questions that wait (c.x.later). A question that the player answered is left alone. */
function wqFill(w) {
  try {
    if (!w || !w.o || w.cbMade) return;
    const o = w.o,
      sk = w.sm && w.sm.sk;
    o.x = o.x || {};
    const later = new Set(o.x.later || []);
    if (w.mode === "edit") {
      /* "Change my answers": an answer of the player's own ends the wait */
      if (o.share && !(sk && sk.share)) later.delete("share");
      if (o.roommateQ != null && o.roommateQ !== "Skip") later.delete("mates");
    } else if (!w.add) {
      if (o.share == null) {
        o.share = SM_UNSURE.share;
        if (sk) sk.share = true;
        if (WQ_LIST[0].when(o)) later.add("share");
      }
      if (WQ_LIST[1].when(o) && o.roommateQ == null && o.roommateCount == null) later.add("mates");
    }
    if (later.size) o.x.later = Array.from(later);
    else delete o.x.later;
  } catch (e) {
    report(e, "waitq.js: wqFill");
  }
}
/* Part of plSeedWeek() in planner.js. The words of the quest of one name of c.x.later, or null for a name of
   planner.js itself (accts, gut). */
function wqTask(later) {
  const x = WQ_LIST.find(q => q.later === later);
  return x ? { t: x.t, s: x.s, a: "plater", v: x.later, mins: 1 } : null;
}
/* Part of finishSetupPlanEnd() in planner.js. After the whole setup: one quest for each question that waits and has
   none yet, and the quest of the split for a player who lives with roommates or a partner. Returns how many it
   added. */
function wqSeed(c) {
  try {
    if (!c || G.demo || !(c.x && c.x.cb ? c.x.cb.setup : true)) return 0;
    const x = plX(c),
      t = todayISO(),
      have = v => x.plan.some(p => p.v === v && (p.a === "plater" || p.a === WQ_SPLIT.a)),
      put = p => x.plan.push(Object.assign({ id: plId(), when: t, slot: "Any", st: "todo", made: t, seed: 1 }, p));
    let n = 0;
    (x.later || []).forEach(k => {
      const task = wqTask(k);
      if (task && !have(k)) {
        put(task);
        n++;
      }
    });
    if (WQ_SPLIT.when(c) && !have(WQ_SPLIT.v)) {
      put({ t: WQ_SPLIT.t, s: WQ_SPLIT.s, a: WQ_SPLIT.a, v: WQ_SPLIT.v, mins: WQ_SPLIT.mins });
      n++;
    }
    if (n) save();
    return n;
  } catch (e) {
    report(e, "waitq.js: wqSeed");
    return 0;
  }
}
/* The question of setup with the key k (its words and its choices): one source, SM_Q in smart.js. */
function wqQ(k) {
  if (k === "share") return SM_Q[3].find(q => q.k === "share");
  return { k, l: "How many roommates live with you?", o: ["1", "2", "3", "4+"] };
}
/* The answer so far, in the words of a choice. null when there is none of the player's own. */
function wqCur(c, x) {
  if (x.k === "share") return (c.x.unsure || []).includes("share") ? null : c.share || null;
  return c.roommateCount == null ? null : c.roommateCount >= 4 ? "4+" : String(c.roommateCount);
}
/* THE SHEET: one question, its choices, "I'm not sure", and the line under the choices. */
function wqSheet() {
  const c = C(),
    x = WQ_LIST.find(q => q.later === W.k) || WQ_LIST[0],
    Q = wqQ(x.k),
    cur = wqCur(c, x);
  return (
    head("One question", x.k === "share" ? "Shared money" : "Your household") +
    `<div class="small muted">Setup left this one for later. One tap, and your plan recalculates.</div>` +
    `<div class="field"><div class="small"><b>${esc(Q.l)}</b></div>` +
    `<div class="chips" data-fid="wq:chips">${Q.o.map(v => `<button class="chip ${cur === v ? "on" : ""}" data-a="wqset" data-v="${esc(v)}" aria-pressed="${cur === v}">${esc(smLab(Q, v))}</button>`).join("")}<button class="chip" data-a="wqunsure">${NOT_SURE}</button></div>` +
    `<div class="tiny muted" data-fid="wq:tapone">${TAP_ONE}</div>` +
    (Q.h ? `<div class="tiny muted">${esc(Q.h)}</div>` : "") +
    `</div>` +
    `<div class="tiny muted" data-fid="wq:guess">${x.k === "share" ? "Until you answer, the game counts No one. That is a Guess." : "Until you answer, the game counts one roommate. That is a Guess."}</div>`
  );
}
/* Part of plLater() in planner.js. Opens the question of one name of c.x.later. Returns true when the name is one
   of this file. */
function wqOpen(later) {
  if (!WQ_LIST.some(q => q.later === later)) return false;
  W = { kind: "waitq", k: later };
  sheet(wqSheet);
  return true;
}
/* The wait of one question ends: its name leaves c.x.later, and planner.js marks its quest done (plResolved). */
function wqEnd(c, later) {
  c.x.later = (c.x.later || []).filter(k => k !== later);
  if (!c.x.later.length) delete c.x.later;
  save();
  closeSheet();
  render();
}
Object.assign(ACT, {
  wqset: t => {
    if (!W || W.kind !== "waitq") return;
    const c = C(),
      x = WQ_LIST.find(q => q.later === W.k),
      v = t.dataset.v;
    if (!x || !wqQ(x.k).o.includes(v)) return;
    c.x = c.x || {};
    if (x.k === "share") {
      c.share = v;
      G.house.share = v;
      c.x.unsure = (c.x.unsure || []).filter(k => k !== "share");
      if (!c.x.unsure.length) delete c.x.unsure;
    } else c.roommateCount = v === "4+" ? 4 : +v;
    wqEnd(c, x.later);
  },
  /* I'm not sure: the Guess of the game stays, and the quest is done. "Change my answers" still has the question. */
  wqunsure: () => {
    if (!W || W.kind !== "waitq") return;
    const c = C();
    c.x = c.x || {};
    wqEnd(c, W.k);
  },
});
