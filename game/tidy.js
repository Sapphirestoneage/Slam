/* ===== tidy.js: the fixes from the usability audit, applied to every screen at once instead of one screen at a time. (1) One question open at a time: when a screen holds two or more question blocks (setup already asks one at a time in its own way), each block folds to a slim row and only one is open. Tapping a one-answer chip opens the next question by itself; a "tap all that fit" question waits for its "Next" button, which names the block it leads to. A folded row shows the answer already given. Nothing is hidden for good: tap any row to open it. (2) Long text is cut to three lines with "more" to open it. (3) When a tap carries you from one tool into another, a line under the header says where you came from and that Back returns there. (4) Screens that had no header (the save point, the celebration) get Back, the i and the X like every other screen. (5) Onboarding fills the whole screen instead of floating over the page behind it, and carries a four-step tracker so you always know where you are in it. State: TDX (which block is open on each kind of screen, for this visit only). ===== */
var TDX = { seq: [], ans: [], multi: [], prev: {}, pans: {}, open: {}, n: 0, on: false, kind: null };
const TD_FULL = { setup: 0, find: 0, gwin: 0, l1: 1, sharp: 2, askdone: 2, door: 3, lpans: 3, dump: 2, tour: 3 },
  TD_STEPS = ["About you", "Three quick games", "Make your numbers real", "Your first answer"];
const TD_Q = q;
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
q = function (label, inner, help) {
  const i = TDX.n++,
    on = tdOn(inner);
  TDX.seq.push(tdPlain(label));
  TDX.ans.push(on.length > 0);
  TDX.multi.push(/data-a="tog"/.test(inner));
  if (!TDX.on) return TD_Q(label, inner, help);
  const k = TDX.kind,
    P = TDX.prev[k] || [],
    oi = Math.max(0, Math.min(TDX.open[k] || 0, P.length - 1)),
    open = i === oi,
    nx = P[i + 1],
    said = on.join(", ");
  return `<details class="fld" name="fld" data-i="${i}"${open ? " open" : ""}><summary><span class="small">${label}</span><span class="tiny fldhint ${on.length ? "ok" : "muted"}">${on.length ? esc(said.length > 26 ? said.slice(0, 24) + "…" : said) + " ✓" : i + 1 + " of " + P.length}</span></summary><div class="field">${inner}${help ? `<div class="tiny muted">${help}</div>` : ""}${nx && (on.length || TDX.multi[i] || !/class="chip/.test(inner)) ? `<button class="ghost slim wide" data-a="fldgo" data-v="${i + 1}">Next: ${esc(nx.length > 44 ? nx.slice(0, 42) + "…" : nx)}</button>` : ""}</div></details>`;
};
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
(() => {
  const _r = nvRow;
  nvRow = function (small) {
    return _r(small) + tdFrom() + tdTrack();
  };
  const _t = nvText;
  nvText = function (h) {
    let o = _t(h);
    if (!/nvhead/.test(o)) o = o.replace('<div class="sheet stack">', () => '<div class="sheet stack">' + nvRow(""));
    if (W && TD_FULL[W.kind] !== undefined) o = o.replace('<div class="overlay">', '<div class="overlay full">');
    return o;
  };
  const _d = drawSheet;
  drawSheet = function () {
    const k = tdKey(),
      go = () => {
        TDX.n = 0;
        TDX.seq = [];
        TDX.ans = [];
        TDX.multi = [];
        return _d.apply(this, arguments);
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
  };
})();
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
