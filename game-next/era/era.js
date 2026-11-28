/* ============================================================================
   SLAM the Game: era/era.js
   PURPOSE     The screens of the 60-second demo "Find your era" (era/index.html): one question on a
               screen, answered by a tap, then one result screen (run 16, A1): the name of the era, one
               plain sentence on why, the one first move, one big button "Start my first move", and a
               small Back. Each screen has a way out: Home, at the top (A5).
   INPUT       The taps of the visitor. Nothing is typed. One thing is read from the device: whether an
               account of the game is signed in here (erSigned), for the line about where answers go.
   OUTPUT      The page. One text in the device storage (ER_KEY), written by the button "Start my first
               move", so the game does not ask the same questions again and opens on Home.
   DEPENDS ON  core/engine.js (DEBT_KINDS, ERAS), era/gamecopy.js (CB_QS, CB_RNG, cbLab, esc),
               features/erain.js (ER_QS, ER_TAX, ER_TYP, ER_WORDS, ER_KEY, erAsked, erCb, erCushOpts,
               erResult, erPack, erSigned), account/trust.js (TRUST_LINE), core/engine.js (NOT_SURE, TAP_ONE).
   RULES       This file shows what erain.js returns. It does not calculate. No account, no network
               request, no measurement. A link inside the demo is relative, so the page works at each
               address of the game.
   ========================================================================= */
const ERA = { A: {}, at: 0, info: "", kept: true, un: {}, stay: "" };
/* A second page can ask the same questions with its own words (run CC-1, item 11: intake/index.html sets
   window.ERA_PAGE before this file loads). name: the name at the top. hero: [the title, the line under it]. foot:
   the line about where the answers are kept. result(list): the HTML of the last screen. lead: true when the answers
   carry the mark of a lead. to(): the address that the last button opens. With no ERA_PAGE, this is the demo. */
const ERA_P = (typeof window !== "undefined" && window.ERA_PAGE) || {};
const eraEl = () => document.getElementById("era");

/* The words and the choices of one question. */
function eraQ(q) {
  if (q.kind === "cb") {
    const Q = CB_QS.find(x => x.id === q.id);
    return { l: Q.l, h: Q.h, opts: CB_RNG[q.id].map((r, i) => ({ v: i, l: cbLab(q.id, i) })) };
  }
  if (q.id === "cush") return { l: q.l, h: q.h, opts: erCushOpts().map(o => ({ v: o.id, l: o.l })) };
  if (q.id === "debts") return { l: q.l, h: q.h, opts: DEBT_KINDS.map(d => ({ v: d[0], l: d[0] })) };
  return { l: q.l, h: q.h, opts: ER_TAX.map(t => ({ v: t[1], l: t[0] })) };
}
/* The small "i" button of a term, and the words it opens (below, on the page: no hover). */
function eraI(id, name) {
  return `<button class="i" data-a="info" data-v="${id}" aria-expanded="${ERA.info === id}" aria-label="What does this mean: ${esc(name)}">i</button>`;
}
function eraNote(id, text) {
  return ERA.info === id ? `<div class="note" role="note">${esc(text)}</div>` : "";
}
/* Where the answers are kept (run 16, A4): the words about no account only for a visitor who is signed out. */
function eraFoot() {
  return `<p class="foot"><span id="kept">${esc(ERA_P.foot || (erSigned() ? ER_WORDS.signed : ER_WORDS.out))}</span><br>${esc(TRUST_LINE)}</p>`;
}
/* The top row of each screen (run 16, A5): the name of the page, and the way out to the game's first screen. */
function eraTop() {
  return `<header class="row top"><div class="eyebrow">${esc(ERA_P.name || "Find your era")}</div><a class="linkbtn" id="exit" href="../" aria-label="Home: leave this page and open the game">⌂ Home</a></header>`;
}
function eraQuestion(list, i) {
  const q = list[i],
    Q = eraQ(q),
    cur = ERA.A[q.id],
    many = q.kind === "many",
    on = v => (many ? (cur || []).includes(v) : cur === v),
    un = !!ERA.un[q.id];
  return (
    eraTop() +
    (i === 0
      ? `<div class="hero"><h1>${esc(ERA_P.hero ? ERA_P.hero[0] : "Find your era")}</h1><p class="muted">${esc(ERA_P.hero ? ERA_P.hero[1] : "60 seconds. Taps only. No typing.")}</p></div>`
      : "") +
    `<div class="dots" aria-hidden="true">${list.map((x, k) => `<i class="${k < i ? "done" : k === i ? "on" : ""}"></i>`).join("")}</div>` +
    `<section class="card"><div class="small muted">Question ${i + 1} of ${list.length}</div>` +
    `<h2 class="ql">${esc(Q.l)} ${eraI("q", Q.l)}</h2>${eraNote("q", Q.h)}` +
    `<div class="chips">${Q.opts.map(o => `<button class="chip ${on(o.v) ? "on" : ""}" data-a="${many ? "tog" : "pick"}" data-v="${esc(o.v)}" aria-pressed="${on(o.v)}">${esc(o.l)}</button>`).join("")}<button class="chip ${un ? "on" : ""}" data-a="unsure" aria-pressed="${un}">${esc(NOT_SURE)}</button></div>` +
    `<div class="tiny muted" id="tapone">${esc(TAP_ONE)}</div>` +
    (ERA.stay === q.id
      ? `<div class="note" role="status">${q.id === "age" ? "Your age is the one answer this needs. Your best guess is fine." : "There is no typical amount for your age yet. Pick the closest one. Your best guess is fine."}</div>`
      : "") +
    (many
      ? `<div class="tiny muted">Tap each kind you have, then Next.</div><button class="primary wide" data-a="next">${(cur || []).length ? "Next" : "None of these"}</button>`
      : "") +
    `</section>` +
    (i > 0
      ? `<div class="row"><button class="ghost slim" data-a="back"><i class=chevl aria-hidden=true></i> Back</button></div>`
      : "") +
    eraFoot()
  );
}
/* THE RESULT: the era, one sentence on why, the one first move, one button, a small Back. */
function eraResult(list) {
  const R = erResult(ERA.A),
    n = R.next;
  return (
    eraTop() +
    `<section class="card lead" id="result"><div class="row between"><span class="dklabel">You are in</span><span class="pill">${esc(R.st)}</span></div>` +
    `<h1 class="glow">${esc(R.name)}</h1><p id="why">${esc(R.one)}</p>` +
    `<div class="strip" aria-hidden="true">${ERAS.map((e, k) => `<i class="${k < R.era ? "done" : k === R.era ? "on" : ""}"></i>`).join("")}</div>` +
    `<div class="tiny muted">Era ${R.era} of ${R.last}. ${esc(ER_WORDS.guess)}</div>` +
    `</section>` +
    (n
      ? `<section class="tile" id="move"><span class="dklabel">Your first move</span><h2>${esc(n.t)}</h2><p class="small">${esc(n.why)}</p></section>`
      : "") +
    `<button class="primary wide big go" data-a="go">Start my first move</button>` +
    (ERA.kept
      ? ""
      : `<div class="note" role="status">This browser does not keep answers right now (private mode does that). Home, at the top, opens the game, and it asks the first four again.</div>`) +
    `<div class="row"><button class="ghost slim" data-a="back"><i class=chevl aria-hidden=true></i> Back</button></div>` +
    eraFoot()
  );
}
function eraDraw() {
  const list = erAsked(ERA.A);
  ERA.at = Math.max(0, Math.min(list.length, ERA.at));
  eraEl().innerHTML =
    ERA.at < list.length ? eraQuestion(list, ERA.at) : ERA_P.result ? ERA_P.result(list) : eraResult(list);
  window.scrollTo(0, 0);
}
/* One tap. */
function eraTap(t) {
  const a = t.dataset.a,
    list = erAsked(ERA.A),
    q = list[ERA.at];
  if (a === "info") ERA.info = ERA.info === t.dataset.v ? "" : t.dataset.v;
  else {
    ERA.info = "";
    ERA.stay = "";
    if (a === "unsure" && q) {
      /* I'm not sure (run 16, C8): a range question takes the typical value for the age, as a Guess. Any other
         question keeps nothing. Age has no typical value: the question stays open, with one line of help. */
      const typ =
        q.kind === "cb" &&
        q.id !== "age" &&
        Number.isInteger(ERA.A.age) &&
        erCb({ age: ERA.A.age, [q.id]: ER_TYP })[q.id];
      if (q.kind === "cb" && !typ) ERA.stay = q.id;
      else {
        if (typ) ERA.A[q.id] = ER_TYP;
        else delete ERA.A[q.id];
        ERA.un[q.id] = true;
        ER_QS.filter(x => x.when && !x.when(ERA.A)).forEach(x => delete ERA.A[x.id]);
        ERA.at++;
      }
    } else if (a === "pick" && q) {
      delete ERA.un[q.id];
      ERA.A[q.id] = q.kind === "cb" ? +t.dataset.v : t.dataset.v;
      /* an answer that takes a later question away also takes its answer away */
      ER_QS.filter(x => x.when && !x.when(ERA.A)).forEach(x => delete ERA.A[x.id]);
      ERA.at++;
    } else if (a === "tog" && q) {
      delete ERA.un[q.id];
      const cur = ERA.A[q.id] || [],
        v = t.dataset.v;
      ERA.A[q.id] = cur.includes(v) ? cur.filter(x => x !== v) : cur.concat([v]);
    } else if (a === "next" && q) {
      delete ERA.un[q.id];
      ERA.A[q.id] = ERA.A[q.id] || [];
      ERA.at++;
    } else if (a === "back") ERA.at--;
    else if (a === "go") {
      try {
        localStorage.setItem(ER_KEY, erPack(ERA.A, undefined, !!ERA_P.lead));
      } catch (e) {
        /* a browser in private mode can refuse to keep it: the page says so, and offers the game all the same */
        ERA.kept = false;
        console.warn("Find your era: the answers were not kept.", e);
      }
      if (ERA.kept) {
        location.href = ERA_P.to ? ERA_P.to() : "../";
        return;
      }
    }
  }
  eraDraw();
}
document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-a]");
  if (t) eraTap(t);
});
eraDraw();
