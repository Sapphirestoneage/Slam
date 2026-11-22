/* ============================================================================
   SLAM the Game: screens/tidy.js
   PURPOSE     Repairs from the usability audit, for all screens at one time. (1) One question open at a
               time: each question block folds to a slim row, and a folded row shows its answer. (2)
               Long text is cut to three lines, with "more" to open it. (3) When a tap goes from one
               tool to a different tool, a line below the header says where the player came from. (4)
               The sheets that had no header (the save point, the celebration) get Back, the "i" and the
               X. (5) Setup fills the full screen and shows a tracker with four steps.
   INPUT       The game: G.demo. The taps of the player (the actions in OUTPUT).
   OUTPUT      10 functions. Parts of functions in other files: qTidy, nvTextTidy, nvRowTidy,
               drawSheetTidy. Actions (ACT): fldgo.
   DEPENDS ON  core/engine.js, screens/ui.js, screens/nav.js.
   RULES       Nothing is hidden permanently: a tap on a row opens it. A chip with one answer opens the
               next question. A question with many answers waits for its Next button.
   STATE       TDX (the questions of the open sheet, for this visit only: seq, ans, multi, prev, pans,
               open, n, on, kind).
   ========================================================================= */
var TDX = { seq: [], ans: [], multi: [], prev: {}, pans: {}, open: {}, n: 0, on: false, kind: null };
const TD_FULL = { setup: 0, find: 0, gwin: 0, l1: 1, sharp: 2, askdone: 2, door: 3, lpans: 3, dump: 2, tour: 3 },
  TD_STEPS = ["About you", "Three quick games", "Make your numbers real", "Your first answer"];
function tdPlain(s) {
  return String(s)
    .replace(/<[^>]+>/g, "")
    .trim();
}
function tdKey() {
  const w = W;
  return w && SH && w.kind ? w.kind + (w.step != null ? ":" + w.step : w.page != null ? ":" + w.page : "") : null;
}
function tdOn(inner) {
  const o = [],
    re = /class="chip(?: sm)? on"[^>]*>([^<]*)</g;
  let m;
  while ((m = re.exec(inner))) o.push(m[1]);
  return o;
}
/* Part of q() in ui.js. Records the label and the state of the answer, for drawSheetTidy(). In a sheet with two or more questions, it returns the folded form of the question. Else it returns null. */
function qTidy(label, inner, help) {
  const i = TDX.n++,
    on = tdOn(inner);
  TDX.seq.push(tdPlain(label));
  TDX.ans.push(on.length > 0);
  TDX.multi.push(/data-a="tog"/.test(inner));
  if (!TDX.on) return null;
  const k = TDX.kind,
    P = TDX.prev[k] || [],
    oi = Math.max(0, Math.min(TDX.open[k] || 0, P.length - 1)),
    open = i === oi,
    nx = P[i + 1],
    said = on.join(", ");
  return `<details class="fld" name="fld" data-i="${i}"${open ? " open" : ""}><summary><span class="small">${label}</span><span class="tiny fldhint ${on.length ? "ok" : "muted"}">${on.length ? esc(said.length > 26 ? said.slice(0, 24) + "…" : said) + " ✓" : i + 1 + " of " + P.length}</span></summary><div class="field">${inner}${help ? `<div class="tiny muted">${help}</div>` : ""}${nx && (on.length || TDX.multi[i] || !/class="chip/.test(inner)) ? `<button class="ghost slim wide" data-a="fldgo" data-v="${i + 1}">Next: ${esc(nx.length > 44 ? nx.slice(0, 42) + "…" : nx)}</button>` : ""}</div></details>`;
}
function tdTrack() {
  const k = W && W.kind;
  if (k == null || TD_FULL[k] === undefined) return "";
  const c = C(),
    real = !G.demo && c && c.led,
    l1 = real && c.l1 && c.l1.gear && c.l1.party,
    done = [
      real && k !== "setup",
      !!l1 && k !== "l1",
      real && (c.placed || (typeof sharpPct === "function" && sharpPct(c) >= 100)),
      real && !!c.placed,
    ],
    at = TD_FULL[k];
  return `<div class="obtrack" role="img" aria-label="Step ${at + 1} of 4: ${TD_STEPS[at]}"><div class="obsegs">${TD_STEPS.map((t, i) => `<i class="${i === at ? "now" : done[i] ? "done" : ""}"></i>`).join("")}</div><div class="tiny muted">Step ${at + 1} of 4: <b>${TD_STEPS[at]}</b>${at < 3 ? ". Then: " + TD_STEPS[at + 1] : ""}</div></div>`;
}
function tdFrom() {
  const st = NVX.st,
    prev = st.length > 1 ? st[st.length - 2] : null,
    k = W && W.kind;
  if (!prev || !prev.W || !k || prev.W.kind === k || k === "askdone") return "";
  const x = NV_INFO[prev.W.kind];
  return x ? `<div class="tiny muted nvfrom">You came here from ${x[0]}. Back takes you there.</div>` : "";
}
/* Part of nvText() in nav.js. A sheet with no top row gets one. Some sheets use the full height of the screen. */
function nvTextTidy(o) {
  if (!/nvhead/.test(o)) o = o.replace('<div class="sheet stack">', () => '<div class="sheet stack">' + nvRow(""));
  if (W && TD_FULL[W.kind] !== undefined) o = o.replace('<div class="overlay">', '<div class="overlay full">');
  return o;
}

/* Part of nvRow() in nav.js. Adds the line "You came here from ..." and the progress track below the row. */
function nvRowTidy(h) {
  return h + tdFrom() + tdTrack();
}

/* Part of drawSheet() in ui.js. draw() draws the sheet one time.
   In a sheet with two or more questions, only one question is open. When the open question must change, this draws the sheet a second time. */
function drawSheetTidy(draw) {
  const k = tdKey(),
    go = () => {
      TDX.n = 0;
      TDX.seq = [];
      TDX.ans = [];
      TDX.multi = [];
      return draw();
    };
  if (W !== TDX.w) {
    TDX.w = W;
    TDX.open = {};
    TDX.pans = {};
  }
  TDX.kind = k;
  TDX.on = !!k && W.kind !== "setup" && (TDX.prev[k] || []).length >= 2;
  let r = go();
  if (k) {
    const was = TDX.on,
      pa = TDX.pans[k],
      n = TDX.seq.length,
      want = n >= 2 && W.kind !== "setup";
    let again = want !== was;
    TDX.prev[k] = TDX.seq.slice();
    if (want) {
      const oi = Math.max(0, Math.min(TDX.open[k] || 0, n - 1));
      if (pa && pa.length > oi && !pa[oi] && TDX.ans[oi] && !TDX.multi[oi] && oi < n - 1) {
        TDX.open[k] = oi + 1;
        again = true;
      } else if (W.err && TDX.ans[oi]) {
        const f = TDX.ans.indexOf(false);
        if (f >= 0 && f !== oi) {
          TDX.open[k] = f;
          again = true;
        }
      }
    }
    TDX.pans[k] = TDX.ans.slice();
    if (again) {
      TDX.on = want;
      r = go();
    }
  }
  TDX.on = false;
  tdPaint();
  return r;
}

function tdPaint() {
  if (!SH || typeof document === "undefined" || !document.querySelector) return;
  const el = document.querySelector("#ov"),
    sh = el && el.querySelector ? el.querySelector(".sheet") : null;
  if (!sh) return;
  const ov = el.querySelector(".overlay"),
    k = W && W.kind;
  if (ov && k && TD_FULL[k] !== undefined) ov.classList.add("full");
  if (!sh.querySelector(".nvhead")) sh.insertAdjacentHTML("afterbegin", nvRow(""));
  sh.addEventListener(
    "toggle",
    e => {
      const t = e.target;
      if (t && t.classList && t.classList.contains("fld") && t.open && tdKey()) TDX.open[tdKey()] = +t.dataset.i;
    },
    true
  );
  Array.prototype.slice
    .call(sh.querySelectorAll(".tile.small, .sheet > .small.muted, .sheet > div > .small.muted"))
    .forEach(n => {
      if (
        n.querySelector("button,details,input") ||
        (n.textContent || "").length < 260 ||
        n.classList.contains("clamp")
      )
        return;
      n.classList.add("clamp");
      n.setAttribute("role", "button");
      n.setAttribute("aria-label", "Tap to read all of this");
      n.addEventListener("click", () => n.classList.toggle("open"));
    });
}
Object.assign(ACT, {
  fldgo: t => {
    const k = tdKey();
    if (!k) return;
    TDX.open[k] = +t.dataset.v;
    drawSheet();
  },
});
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
