/* ============================================================================
   SLAM the Game: features/dep.js
   PURPOSE     What depends on what. Some short chains show how one number feeds the next number. When a
               part fills in, one line shows what the change moved. The replay has an off switch. An
               add-on can give this view a second title. With no add-on, each player sees the plain
               name.
   INPUT       The game: G.demo. The profile: c.x.dep, c.x.taxPct. The open sheet (W.kind): dep. The
               taps of the player (the actions in OUTPUT).
   OUTPUT      11 functions. Parts of functions in other files: renderDep. Actions (ACT): dep, depplay,
               depok, depoff, deptog. Menu: "What depends on what".
   DEPENDS ON  core/report.js, core/engine.js, account/gate.js, screens/ui.js, screens/planner.js,
               screens/nav.js.
   ========================================================================= */
var DEP_X = null,
  DEPX = { line: null, n: 0, busy: false, play: -1 };
const DEP_N = {
  spend: ["Your budget", "your budget", c => !!c.led && isSharp(c, "spend"), ["sharp", "spend"]],
  take: ["Your pay", "your pay", c => !!c.led && isSharp(c, "take"), ["sharp", "take"]],
  cash: ["Your cash", "your cash", c => !!c.led && isSharp(c, "cash"), ["sharp", "cash"]],
  debt: ["Your debts", "your debts", c => !!c.led && isSharp(c, "debt"), ["sharp", "debt"]],
  inv: [
    "Your account mix",
    "your account mix",
    c => !!c.led && (c.invs || []).length > 0 && isSharp(c, "inv"),
    ["sharp", "inv"],
  ],
  tax: ["Your taxes", "your taxes", c => !!(c.x && c.x.taxPct), ["knask", "tax"]],
  rspend: ["Your retirement spending", "your retirement spending"],
  keep: ["What you keep", "what you keep"],
  number: ["Your number", "your number"],
  years: ["Your freedom date", "your freedom date"],
  cushion: ["Your cushion", "your cushion"],
  safe: ["What is safe to spend", "what is safe to spend"],
  interest: ["The interest you pay", "the interest you pay"],
};
const DEP_C = [
  ["spend", "rspend", "inv", "tax", "number"],
  ["take", "keep", "years"],
  ["debt", "interest", "keep", "years"],
  ["cash", "cushion", "safe"],
];
function depX(c) {
  c.x = c.x || {};
  c.x.dep = c.x.dep || {};
  return c.x.dep;
}
function depIn(k) {
  return !!DEP_N[k][2];
}
function depFilled(c) {
  const f = {};
  Object.keys(DEP_N).forEach(k => {
    if (depIn(k)) {
      try {
        f[k] = !!DEP_N[k][2](c);
      } catch (e) {
        f[k] = false;
      }
    }
  });
  return f;
}
function depLine(ch, from) {
  const i = Math.max(0, ch.indexOf(from)),
    p = ch.slice(i).map(k => DEP_N[k][1]);
  return {
    parts: p,
    txt: p[0].charAt(0).toUpperCase() + p[0].slice(1) + " sets " + p.slice(1).join(", which sets ") + ".",
  };
}
function depSpans(L, anim) {
  return (
    L.parts
      .map(
        (p, i) =>
          (i === 0 ? "" : i === 1 ? `<span class="muted"> sets </span>` : `<span class="muted">, which sets </span>`) +
          `<span class="${anim ? "depw" : ""}"${anim ? ` style="animation-delay:${i * 0.4}s"` : ""}>${esc(i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p)}</span>`
      )
      .join("") + "."
  );
}
function depTitle() {
  try {
    return DEP_X && DEP_X.t && (typeof adOn !== "function" || adOn(DEP_X.pk)) ? DEP_X.t : null;
  } catch (e) {
    return null;
  }
}
function depVal(c, d, k) {
  const m = typeof money === "function" ? money : v => "$" + v;
  try {
    if (k === "number") return m(Math.round(d.fi));
    if (k === "years") return d.yrs == null ? "" : d.yrs + (d.yrs === 1 ? " year" : " years");
    if (k === "keep") return m(Math.round(c.take - c.spend)) + " a month";
    if (k === "rspend") return m(Math.round(d.fiSpend / 12)) + " a month";
    if (k === "cushion") return c.spend > 0 ? Math.round((d.cash / c.spend) * 10) / 10 + " months" : "";
  } catch (e) {
    report(e, "dep.js: depVal");
  }
  return "";
}
function depSheet() {
  const c = C(),
    d = derive(c),
    f = depFilled(c),
    X = depX(c),
    t = depTitle(),
    I = `<button class="term" data-a="info" data-k="gloss:dep">i</button>`;
  let h =
    head("What depends on what", (t ? esc(t) : "What depends on what") + " " + I) +
    (t ? `<div class="small muted deppl">What depends on what</div>` : "") +
    `<div class="small muted">Each chain reads top to bottom. Fill in the top, and everything under it gets sharper.</div>`;
  DEP_C.forEach((ch, ci) => {
    const ins = ch.filter(depIn),
      all = ins.every(k => f[k]),
      L = depLine(ch, ch[0]);
    let ok = true;
    h += `<div class="tile stack depchain" style="gap:4px">${ch
      .map((k, i) => {
        const inp = depIn(k);
        if (inp && !f[k]) ok = false;
        const on = inp ? f[k] : ok,
          v = inp ? "" : depVal(c, d, k),
          a = DEP_N[k][3];
        return (
          (i ? `<div class="tiny muted depar">↓ sets</div>` : "") +
          `<div class="row between depn ${on ? "on" : ""}" style="gap:8px"><span><b>${esc(DEP_N[k][0])}</b>${v ? ` <span class="tiny ${on ? "" : "guess"}">${esc(v)}</span>` : ""}</span>${inp ? (on ? `<span class="tiny muted">Filled in ✓</span>` : `<button class="primary slim" data-a="${a[0]}" data-v="${a[1]}">Fill it in</button>`) : `<span class="tiny muted">${on ? "Sharp" : "Still a guess"}</span>`}</div>`
        );
      })
      .join(
        ""
      )}<div class="small depsay">${depSpans(L, DEPX.play === ci)}</div><button class="ghost slim" data-a="depplay" data-v="${ci}">Replay this chain</button></div>`;
  });
  return (
    h +
    `<div class="row between small" style="gap:8px"><span>Show the one-line replay when a part fills in</span><button class="${X.off ? "ghost" : "primary"} slim" data-a="deptog" aria-pressed="${!X.off}">${X.off ? "Off" : "On"}</button></div>`
  );
}
function depBanner() {
  const L = DEPX.line;
  if (!L) return "";
  return `<div class="depline" role="status"><div class="small">${depSpans(L, true)}</div><div class="row" style="gap:6px;flex-wrap:wrap"><button class="primary slim" data-a="depok">Got it</button><button class="ghost slim" data-a="dep">See the chain</button><button class="ghost slim" data-a="depoff">Don't show this again</button></div></div>`;
}
/* after every draw: did a part just fill in? */
function depCheck() {
  if (DEPX.busy) return;
  let c = null;
  try {
    c = C();
  } catch (e) {
    report(e, "dep.js: depCheck (1)");
  }
  if (!c || G.demo) return;
  const X = depX(c),
    f = depFilled(c),
    was = X.f;
  let changed = false,
    fresh = null;
  if (!was) {
    X.f = f;
    changed = true;
  } else {
    Object.keys(f).forEach(k => {
      if (f[k] !== !!was[k]) {
        changed = true;
        if (f[k] && !fresh) fresh = k;
      }
    });
    if (changed) X.f = f;
  }
  if (fresh && !X.off) {
    const ch = DEP_C.find(q => q.indexOf(fresh) >= 0);
    if (ch) {
      DEPX.line = depLine(ch, fresh);
      DEPX.n = 0;
    }
  }
  if (changed) {
    DEPX.busy = true;
    try {
      save();
    } catch (e) {
      report(e, "dep.js: depCheck (2)");
    }
    DEPX.busy = false;
  }
}
/* Part of render() in ui.js. After a change, shows one line that says what else the change moved. The line goes away after four draws. */
function renderDep() {
  try {
    depCheck();
    if (DEPX.line) {
      if (++DEPX.n > 4) DEPX.line = null;
      else {
        const el = $("#app");
        if (el && String(el.innerHTML).indexOf('class="depline"') < 0) el.innerHTML = el.innerHTML + depBanner();
      }
    }
  } catch (e) {
    report(e, "dep.js: renderDep");
  }
}

Object.assign(ACT, {
  dep: () => {
    DEPX.line = null;
    DEPX.play = -1;
    W = { kind: "dep" };
    sheet(depSheet);
    try {
      const s = document.querySelector("#ov .sheet");
      if (s) s.scrollTop = 0;
    } catch (e) {
      report(e, "dep.js: dep");
    }
  },
  depplay: t => {
    DEPX.play = +t.dataset.v;
    drawSheet();
  },
  depok: () => {
    DEPX.line = null;
    render();
  },
  depoff: () => {
    depX(C()).off = true;
    DEPX.line = null;
    save();
    render();
  },
  deptog: () => {
    const X = depX(C());
    X.off = !X.off;
    save();
    drawSheet();
  },
});
Object.assign(GLOSS, {
  dep: [
    "What depends on what",
    "Some numbers in your plan are built from others. Your budget sets what retirement costs, which sets how much you need. This view shows those chains, so you can see why filling in one number moves the ones after it.",
  ],
});
if (typeof NV_INFO !== "undefined") {
  NV_INFO.dep = [
    "What depends on what",
    "A few short chains that show how one number feeds the next.",
    "Fill in the top of a chain and everything under it gets sharper.",
  ];
  GLOSS.scr_dep = [NV_INFO.dep[0], NV_INFO.dep[1] + " " + NV_INFO.dep[2]];
}
if (typeof MENU !== "undefined")
  MENU.push(["What depends on what", "dep", "act", "How one number in your plan feeds the next"]);
