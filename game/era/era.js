/* ============================================================================
   SLAM the Game: era/era.js
   PURPOSE     The screens of the 60-second demo "Find your era" (era/index.html): one question on a
               screen, answered by a tap, then the era, one next move and the button "Start my full
               game".
   INPUT       The taps of the visitor. Nothing is typed. Nothing is read from the device.
   OUTPUT      The page. One text in the device storage (ER_KEY), written by the button "Start my full
               game", so the game does not ask the same questions again.
   DEPENDS ON  core/engine.js (DEBT_KINDS, ERAS), era/gamecopy.js (CB_QS, CB_RNG, cbLab, esc),
               features/erain.js (ER_QS, ER_TAX, ER_WORDS, ER_KEY, erAsked, erCushOpts, erResult,
               erPack), account/trust.js (TRUST_LINE).
   RULES       This file shows what erain.js returns. It does not calculate. No account, no network
               request, no measurement. A link inside the demo is relative, so the page works at each
               address of the game.
   ========================================================================= */
const ERA = { A: {}, at: 0, info: "", kept: true };
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
  return `<button class="ibtn" data-a="info" data-v="${id}" aria-expanded="${ERA.info === id}" aria-label="What does this mean: ${esc(name)}">i</button>`;
}
function eraNote(id, text) {
  return ERA.info === id ? `<div class="note" role="note">${esc(text)}</div>` : "";
}
function eraFoot() {
  return `<p class="foot">No account. Nothing is sent. Your answers stay on this device.<br>${esc(TRUST_LINE)}</p>`;
}
function eraQuestion(list, i) {
  const q = list[i],
    Q = eraQ(q),
    cur = ERA.A[q.id],
    many = q.kind === "many",
    on = v => (many ? (cur || []).includes(v) : cur === v);
  return (
    (i === 0
      ? `<header class="hero"><div class="eyebrow">SLAM the Game</div><h1>Find your era</h1><p class="muted">60 seconds. Taps only. No typing, no account.</p></header>`
      : `<header><div class="eyebrow">Find your era</div></header>`) +
    `<div class="dots" aria-hidden="true">${list.map((x, k) => `<i class="${k < i ? "done" : k === i ? "on" : ""}"></i>`).join("")}</div>` +
    `<section class="card"><div class="small muted">Question ${i + 1} of ${list.length}</div>` +
    `<h2 class="ql">${esc(Q.l)} ${eraI("q", Q.l)}</h2>${eraNote("q", Q.h)}` +
    `<div class="chips">${Q.opts.map(o => `<button class="chip ${on(o.v) ? "on" : ""}" data-a="${many ? "tog" : "pick"}" data-v="${esc(o.v)}" aria-pressed="${on(o.v)}">${esc(o.l)}</button>`).join("")}</div>` +
    (many
      ? `<div class="tiny muted">Tap each kind you have, then Next.</div><button class="primary wide" data-a="next">${(cur || []).length ? "Next" : "None of these"}</button>`
      : `<div class="tiny muted">A rough answer is fine. One tap goes on.</div>`) +
    `</section>` +
    `<div class="row">${i > 0 ? `<button class="ghost" data-a="back">‹ Back</button>` : `<a class="linkbtn" href="../">Open the full game instead</a>`}</div>` +
    eraFoot()
  );
}
function eraResult(list) {
  const R = erResult(ERA.A),
    n = R.next;
  return (
    `<header><div class="eyebrow">Find your era</div></header>` +
    `<section class="card lead" id="result"><div class="row between"><div class="small muted">You are in ${eraI("era", "era")}</div><span class="pill">${esc(R.st)} ${eraI("guess", "Guess")}</span></div>` +
    `<h1 class="glow">${esc(R.name)}</h1>${R.one ? `<p>${esc(R.one)}</p>` : ""}` +
    eraNote("era", ER_WORDS.era) +
    eraNote("guess", ER_WORDS.guess) +
    `<div class="strip" aria-hidden="true">${ERAS.map((e, k) => `<i class="${k < R.era ? "done" : k === R.era ? "on" : ""}"></i>`).join("")}</div>` +
    `<div class="tiny muted">Era ${R.era} of ${R.last}</div>` +
    (R.is.length
      ? `<details><summary>What this era looks like</summary><ul>${R.is.map(x => `<li>${esc(x)}</li>`).join("")}</ul></details>`
      : "") +
    `</section>` +
    (n
      ? `<section class="card" id="move"><div class="small muted">Your one next move ${eraI("move", "next move")}</div><h2>${esc(n.t)}</h2><p class="small">${esc(n.why)}</p>${eraNote("move", ER_WORDS.move)}<div class="tiny muted">It opens your next era: <b>${esc(n.opens)}</b></div></section>`
      : "") +
    `<section class="stack"><button class="primary wide big" data-a="go">Start my full game</button>` +
    (ERA.kept
      ? `<div class="tiny muted center">Your answers come with you. The game does not ask them again.</div>`
      : `<div class="note" role="status">This browser does not keep answers right now (private mode does that). The game opens, and it asks the first four again.</div><a class="linkbtn" href="../">Open the game</a>`) +
    `</section>` +
    `<div class="row"><button class="ghost" data-a="back">‹ Back</button><button class="ghost" data-a="again">Start over</button></div>` +
    eraFoot()
  );
}
function eraDraw() {
  const list = erAsked(ERA.A);
  ERA.at = Math.max(0, Math.min(list.length, ERA.at));
  eraEl().innerHTML = ERA.at < list.length ? eraQuestion(list, ERA.at) : eraResult(list);
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
    if (a === "pick" && q) {
      ERA.A[q.id] = q.kind === "cb" ? +t.dataset.v : t.dataset.v;
      /* an answer that takes a later question away also takes its answer away */
      ER_QS.filter(x => x.when && !x.when(ERA.A)).forEach(x => delete ERA.A[x.id]);
      ERA.at++;
    } else if (a === "tog" && q) {
      const cur = ERA.A[q.id] || [],
        v = t.dataset.v;
      ERA.A[q.id] = cur.includes(v) ? cur.filter(x => x !== v) : cur.concat([v]);
    } else if (a === "next" && q) {
      ERA.A[q.id] = ERA.A[q.id] || [];
      ERA.at++;
    } else if (a === "back") ERA.at--;
    else if (a === "again") {
      ERA.A = {};
      ERA.at = 0;
      ERA.kept = true;
    } else if (a === "go") {
      try {
        localStorage.setItem(ER_KEY, erPack(ERA.A));
      } catch (e) {
        /* a browser in private mode can refuse to keep it: the page says so, and offers the game all the same */
        ERA.kept = false;
        console.warn("Find your era: the answers were not kept.", e);
      }
      if (ERA.kept) {
        location.href = "../";
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
