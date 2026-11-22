/* ===== ideas.js: the workshop behind "Famous money ideas". Each idea a well-known money teacher is known for becomes one small screen, run on the player's own numbers.
   One frame for all of them: who it is from, one big number, the taps that make it yours, and "Show the math".
   Rules: tap only. A typical value shows grey until the player taps an answer, and tapping the same answer again takes it back off. A number built on a guess shows grey and gets no verdict. Nothing shows red. Every term has an "i".
   The made-up market years below are there to show how an idea behaves. They are not history and not a forecast, and each screen says so.
   Tax and health numbers: 2026 federal standard deduction, 0% long-term gains band and HSA limits, the 2026 poverty guideline and the 2027 marketplace rules, as checked for the SLAM app in Nov 2026. ===== */
const IG = {},
  IG_ORDER = [];
const IG_ROUGH = [
  -0.18, -0.12, 0.04, -0.09, 0.06, 0.01, 0.03, -0.06, 0.07, 0.03, 0.06, 0.08, 0.1, 0.05, 0.09, 0.12, 0.07, 0.04, 0.11,
  0.08, 0.09, 0.06, 0.1, 0.07, 0.12, 0.05, 0.09, 0.08, 0.1, 0.07,
];
const IG_STRONG = IG_ROUGH.slice().reverse(),
  IG_MEAN =
    Math.pow(
      IG_ROUGH.reduce((t, r) => t * (1 + r), 1),
      1 / IG_ROUGH.length
    ) - 1,
  IG_STEADY = IG_ROUGH.map(() => IG_MEAN);
const IG_STK = [-0.25, -0.15, 0.08, -0.12, 0.1, 0.02, 0.06, -0.08, 0.12, 0.05, 0.1, 0.12, 0.15, 0.08, 0.14];
const IG_TAX = {
  sd: { one: 16100, two: 32200 },
  gain: { one: 49450, two: 98900 },
  hsa: { one: 4400, fam: 8750 },
  fpl: [15960, 5680],
  acaLo: 1.38,
  acaHi: 4,
};
function igAdd(s) {
  IG[s.id] = s;
  IG_ORDER.push(s.id);
}
function igX(c) {
  c.x = c.x || {};
  c.x.ig = c.x.ig || {};
  return c.x.ig;
}
function igO(c, id) {
  const X = igX(c);
  X[id] = X[id] || {};
  return X[id];
}
function igI(k) {
  return `<button class="term" data-a="info" data-k="gloss:${k}">i</button>`;
}
function igM(v) {
  return money(Math.round(v));
}
function igP(v, dp) {
  return (dp ? Math.round(v * 1000) / 10 : Math.round(v * 100)) + "%";
}
function igCtx(c, id) {
  const d = derive(c),
    o = (c.x && c.x.ig && c.x.ig[id]) || {},
    typ = [],
    S = d.fiSpend || (c.spend || 0) * 12;
  return {
    c,
    d,
    o,
    typ,
    v: (k, def) => {
      if (o[k] != null) return o[k];
      if (typ.indexOf(k) < 0) typ.push(k);
      return def;
    },
    S,
    P: d.fi > 0 ? d.fi : S / SWR,
    inv: c.inv || 0,
    cash: d.cash || 0,
    age: c.age || 30,
    ret: Math.max(c.ret || 60, c.age || 30),
    take: c.take || 0,
    kept: Math.max(0, (c.take || 0) - (c.spend || 0)),
    real: !!c.led && isSharp(c, "take") && isSharp(c, "spend"),
    two: c.rel === "Married",
  };
}
function igRun(P, W, rets) {
  let p = P,
    dead = null;
  const out = [];
  for (let i = 0; i < rets.length; i++) {
    p = (p - W) * (1 + rets[i]);
    if (p <= 0) {
      p = 0;
      if (dead == null) dead = i + 1;
    }
    out.push(p);
  }
  return { out, dead, end: p };
}
function igGK(P, rate, rets) {
  let p = P,
    w = P * rate;
  const rows = [];
  for (let i = 0; i < rets.length; i++) {
    let note = "";
    if (p <= 0) {
      rows.push({ y: i + 1, w: 0, p: 0, note: "Money ran out" });
      continue;
    }
    if (i > 0) {
      if (rets[i - 1] < 0 && w / p > rate) {
        w = w / 1.03;
        note = "No raise this year";
      }
      if (w / p > rate * 1.2) {
        w *= 0.9;
        note = "Cut back 10%";
      } else if (w / p < rate * 0.8) {
        w *= 1.1;
        note = "Spend 10% more";
      }
    }
    w = Math.min(w, p);
    rows.push({ y: i + 1, w, p, note });
    p = (p - w) * (1 + rets[i]);
  }
  return { rows, end: Math.max(0, p) };
}
function igGlide(P, W, share) {
  let p = P;
  for (let i = 0; i < 15; i++) {
    const s = share(i);
    p = (p - W) * (1 + s * IG_STK[i] + (1 - s) * 0.01);
    if (p <= 0) return 0;
  }
  return p;
}
/* NO CALLER IN THIS REPOSITORY. Keep this function until the owner confirms that no add-on calls it. */
function igYears(inv, save, goal) {
  const y = yearsTo(inv, save, goal);
  return y == null ? null : y;
}
function igRows(rows) {
  return `<div class="stack igrows" style="gap:3px">${rows
    .filter(Boolean)
    .map(
      r =>
        `<div class="row between small" style="gap:8px"><span style="min-width:0">${r[0]}</span><span class="${r[2] ? "fkhot" : "muted"}" style="white-space:nowrap">${r[1]}</span></div>`
    )
    .join("")}</div>`;
}
function igMade() {
  return `<div class="tiny muted">The market years here are made up to show how the idea behaves. They are not history and not a forecast.</div>`;
}
/* ---------- the frame ---------- */
function igSheet() {
  const c = C(),
    s = IG[W.id];
  if (!s) return head("Famous money ideas", "Not found");
  const tab = s.tabs ? (W.tab && s.tabs.find(t => t[0] === W.tab) ? W.tab : s.tabs[0][0]) : null,
    x = igCtx(c, s.id),
    b = s.body(x, tab) || {},
    grey = x.typ.length > 0 || !x.real;
  let h =
    head("Famous money ideas", esc(s.n) + " " + igI("ig_" + s.id)) + `<div class="tiny muted">From: ${esc(s.by)}</div>`;
  if (s.tabs)
    h += `<div class="seg igseg">${s.tabs.map(t => `<button class="${t[0] === tab ? "on" : ""}" data-a="igtab" data-v="${t[0]}">${esc(t[1])}</button>`).join("")}</div>`;
  /* the i always sits at the end of the caption, so it never splits a sentence */
  let cap = b.cap || "";
  const im = cap.match(/<button class="term"[^>]*>i<\/button>/);
  if (im) cap = cap.replace(im[0], "").replace(/\s+/g, " ").trim() + " " + im[0];
  if (b.big != null)
    h += `<div class="tile igbox"><div class="big ${grey ? "guess" : ""}" data-fid="ig:big">${b.big}</div><div class="small">${cap}</div>${grey ? `<div class="tiny muted">${!x.real ? "Grey: parts of your own numbers are still a guess. " : ""}${x.typ.length ? "Grey: this uses typical values. Tap an answer below to make it yours." : ""}</div>` : ""}</div>`;
  if (!x.real && b.big != null)
    h += `<button class="ghost wide slim" data-a="sharp" data-v="${c.led && (c.incs || []).some(r => !r.s) ? "take" : "spend"}">Make my own numbers real</button>`;
  h += b.html || "";
  (b.ins || []).forEach(q => {
    const cur = x.o[q[0]];
    h += `<div class="stack igq" style="gap:6px"><div class="small"><b>${esc(q[1])}</b> ${q[2] ? igI(q[2]) : ""}</div><div class="chips">${q[3]
      .map(o => {
        const on = cur != null && String(cur) === String(o[0]),
          typ = cur == null && String(q[4]) === String(o[0]);
        return `<button class="chip ${on ? "on" : typ ? "igtyp" : ""}" data-a="igset" data-k="${q[0]}" data-v="${o[0]}" aria-pressed="${on}">${esc(o[1])}${on ? " ✕" : typ ? " (typical)" : ""}</button>`;
      })
      .join("")}</div></div>`;
  });
  if (b.picks) {
    const q = b.picks,
      cur = x.o[q[0]] || [];
    h += `<div class="stack igq" style="gap:6px"><div class="small"><b>${esc(q[1])}</b> ${q[2] ? igI(q[2]) : ""}</div><div class="chips">${q[3]
      .map(o => {
        const on = cur.indexOf(o[0]) >= 0;
        return `<button class="chip ${on ? "on" : ""}" data-a="igpick" data-k="${q[0]}" data-v="${o[0]}" data-l="${q[4] || 99}" aria-pressed="${on}">${esc(o[1])}${on ? " ✕" : ""}</button>`;
      })
      .join("")}</div></div>`;
  }
  if (b.quiz) h += igQuizHtml(x, b.quiz);
  if (b.checks) {
    const ck = x.o.ck || {},
      n = b.checks.filter(k => ck[k[0]]).length;
    h += `<div class="small"><b>${n} of ${b.checks.length} done</b></div><div class="stack" style="gap:6px">${b.checks.map(k => `<button class="rowbtn igck ${ck[k[0]] ? "on" : ""}" data-a="igchk" data-v="${k[0]}" aria-pressed="${!!ck[k[0]]}"><span style="min-width:0"><b>${esc(k[1])}</b>${k[2] ? `<div class="tiny muted">${esc(k[2])}</div>` : ""}</span><span class="fkgo">${ck[k[0]] ? "Done ✓" : "Mark done"}</span></button>`).join("")}</div>`;
  }
  if (b.quest) h += igQuestHtml(x, b.quest);
  if (b.after) h += b.after;
  if (b.math && b.math.length) h += mathBox(b.math);
  if (b.note) h += `<div class="tiny muted">${b.note}</div>`;
  (b.links || []).forEach(l => {
    h += `<button class="ghost wide slim" data-a="${l[1]}" data-v="${l[2] || ""}">${esc(l[0])}</button>`;
  });
  return h + `<button class="ghost wide slim" data-a="roof">All famous money ideas</button>`;
}
/* a quiz: one question at a time, taps only. answers live in o.qz */
function igQz(x, q) {
  const a = x.o.qz || {},
    n = q.qs.length,
    sc = {};
  let done = 0;
  q.qs.forEach((r, i) => {
    if (a[i] != null) {
      done++;
      sc[r[1]] = (sc[r[1]] || 0) + +a[i];
    } else sc[r[1]] = sc[r[1]] || 0;
  });
  return { a, n, done, all: done >= n, sc, next: q.qs.findIndex((r, i) => a[i] == null) };
}
function igQuizHtml(x, q) {
  const z = igQz(x, q),
    opts = q.opts || [
      [0, "Not me"],
      [1, "Sometimes"],
      [2, "That is me"],
    ];
  if (z.all) return `<button class="ghost wide slim" data-a="igclear" data-k="qz">Start the questions over</button>`;
  const i = z.next;
  return `<div class="tile stack igquiz" style="gap:8px"><div class="row between tiny muted"><span>Question ${i + 1} of ${z.n}</span><span>${z.n - z.done} left</span></div><div><b>${esc(q.qs[i][0])}</b></div><div class="stack" style="gap:6px">${opts.map(o => `<button class="rowbtn" data-a="igqz" data-k="${i}" data-v="${o[0]}"><span>${esc(o[1])}</span></button>`).join("")}</div>${z.done ? `<button class="ghost slim" data-a="igqzback">Back one question</button>` : ""}</div>`;
}
/* a quest: one small task a day for N days. no streaks to break: a missed day can be ticked later or left alone */
function igDays(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
}
function igQs(x, q) {
  const o = x.o,
    on = !!o.s,
    day = on ? Math.max(1, igDays(o.s, todayISO()) + 1) : 0,
    dn = o.dn || {},
    n = Object.keys(dn).filter(k => dn[k]).length;
  return { on, day, dn, n, over: on && day > q.days, task: d => q.tasks[(d - 1) % q.tasks.length] };
}
function igQuestHtml(x, q) {
  const z = igQs(x, q);
  if (!z.on) return `<button class="primary wide" data-a="igstart">Start the ${q.days} days</button>`;
  if (z.over)
    return `<div class="tile small"><b>That was ${q.days} days.</b> You ticked ${Math.max(1, z.n)} of them. ${esc(q.end || "")}</div><button class="ghost wide slim" data-a="igstart">Do it again</button>`;
  const missed = [];
  for (let d = 1; d < z.day; d++) if (!z.dn[d]) missed.push(d);
  return `<div class="tile stack igquest" style="gap:6px"><div class="row between tiny muted"><span>Day ${z.day} of ${q.days}</span><span>${z.n} ticked</span></div><div><b>${esc(z.task(z.day))}</b></div><button class="${z.dn[z.day] ? "ghost" : "primary"} wide slim" data-a="igday" data-v="${z.day}">${z.dn[z.day] ? "Done today ✓ (tap to undo)" : "Done for today"}</button></div>${
    missed.length
      ? `<div class="tiny muted">Earlier days you can still tick. A missed day is fine.</div><div class="chips">${missed
          .slice(-6)
          .map(d => `<button class="chip" data-a="igday" data-v="${d}">Day ${d}</button>`)
          .join("")}</div>`
      : ""
  }<button class="ghost wide slim" data-a="igstop">Stop this quest</button>`;
}
function igUp() {
  try {
    const s = document.querySelector("#ov .sheet");
    if (s) s.scrollTop = 0;
  } catch (e) {
    report(e, "ideas.js: igUp");
  }
}
Object.assign(ACT, {
  idea: t => {
    const id = t.dataset.v;
    if (!IG[id]) return;
    const c = C(),
      X = igX(c);
    X.seen = X.seen || {};
    if (!X.seen[id]) {
      X.seen[id] = todayISO();
      save();
    }
    W = { kind: "ig", id, tab: t.dataset.k || null };
    sheet(igSheet);
    igUp();
  },
  igtab: t => {
    if (W && W.kind === "ig") {
      W.tab = t.dataset.v;
      drawSheet();
      igUp();
    }
  },
  igpick: t => {
    if (!W || W.kind !== "ig") return;
    const o = igO(C(), W.id),
      k = t.dataset.k,
      v = t.dataset.v,
      max = +t.dataset.l || 99,
      cur = (o[k] || []).slice(),
      i = cur.indexOf(v);
    if (i >= 0) cur.splice(i, 1);
    else {
      if (cur.length >= max) cur.shift();
      cur.push(v);
    }
    o[k] = cur;
    save();
    drawSheet();
  },
  igchk: t => {
    if (!W || W.kind !== "ig") return;
    const o = igO(C(), W.id);
    o.ck = o.ck || {};
    if (o.ck[t.dataset.v]) delete o.ck[t.dataset.v];
    else o.ck[t.dataset.v] = todayISO();
    save();
    render();
    drawSheet();
  },
  igqz: t => {
    if (!W || W.kind !== "ig") return;
    const o = igO(C(), W.id);
    o.qz = o.qz || {};
    o.qz[t.dataset.k] = +t.dataset.v;
    save();
    drawSheet();
  },
  igqzback: () => {
    if (!W || W.kind !== "ig") return;
    const o = igO(C(), W.id),
      ks = Object.keys(o.qz || {})
        .map(Number)
        .sort((a, b) => a - b);
    if (ks.length) {
      delete o.qz[ks[ks.length - 1]];
      save();
      drawSheet();
    }
  },
  igclear: t => {
    if (!W || W.kind !== "ig") return;
    const o = igO(C(), W.id);
    delete o[t.dataset.k];
    save();
    render();
    drawSheet();
  },
  igstart: () => {
    if (!W || W.kind !== "ig") return;
    const o = igO(C(), W.id);
    o.s = todayISO();
    o.dn = {};
    save();
    render();
    drawSheet();
  },
  igday: t => {
    if (!W || W.kind !== "ig") return;
    const o = igO(C(), W.id);
    o.dn = o.dn || {};
    const d = t.dataset.v;
    if (o.dn[d]) delete o.dn[d];
    else o.dn[d] = true;
    save();
    render();
    drawSheet();
  },
  igstop: () => {
    if (!W || W.kind !== "ig") return;
    const o = igO(C(), W.id);
    delete o.s;
    delete o.dn;
    save();
    render();
    drawSheet();
  },
  igset: t => {
    if (!W || W.kind !== "ig") return;
    const c = C(),
      o = igO(c, W.id),
      k = t.dataset.k,
      raw = t.dataset.v,
      v = raw !== "" && isFinite(+raw) ? +raw : raw;
    if (o[k] != null && String(o[k]) === String(v)) delete o[k];
    else o[k] = v;
    save();
    render();
    drawSheet();
  },
});
if (typeof NV_INFO !== "undefined") {
  NV_INFO.ig = [
    "One famous money idea",
    "A well-known idea from a money teacher, run on your own numbers.",
    "Grey numbers use typical values. Tap an answer to make it yours, and tap it again to take it back.",
  ];
  GLOSS.scr_ig = [NV_INFO.ig[0], NV_INFO.ig[1] + " " + NV_INFO.ig[2]];
}
const IG_NEAR = (c, d) => c.work === "Retired" || d.pct >= 60 || d.era >= 7;
const IG_RATES = [
  [0.0325, "3.25%"],
  [0.035, "3.5%"],
  [0.04, "4%"],
  [0.045, "4.5%"],
  [0.05, "5%"],
];
/* ---------- 1. Big ERN ---------- */
igAdd({
  id: "ern",
  grp: "stop",
  n: "The order of returns, and a rate that moves with prices",
  by: "Karsten Jeske, known as Big ERN, at Early Retirement Now",
  one: "Bad years right after you stop hurt far more than bad years later. His answer is a withdrawal rate that moves with how pricey stocks are.",
  what: "Two ideas from his Safe Withdrawal Rate series. First, the order your returns come in matters once you start taking money out. Second, a withdrawal rate tied to stock prices (the CAPE) instead of a fixed 4%.",
  tabs: [
    ["seq", "Order of returns"],
    ["cape", "A rate that moves"],
  ],
  fit: IG_NEAR,
  body: (x, tab) => {
    const P = x.P;
    if (tab === "seq") {
      const rate = x.v("rate", 0.04),
        W = P * rate,
        a = igRun(P, W, IG_ROUGH),
        b = igRun(P, W, IG_STRONG),
        row = y => ["After " + y + " years", igM(a.out[y - 1]) + " or " + igM(b.out[y - 1])];
      return {
        big: a.dead ? "Lasts " + a.dead + " years, or all 30" : igM(a.end) + " or " + igM(b.end),
        cap:
          "Same 30 years of returns, same average. The only change is whether the bad years come first or last. " +
          igI("seqrisk"),
        html:
          igRows([
            ["Starting with", "<b>" + igM(P) + "</b>"],
            ["Taking out each year", igM(W)],
            row(10),
            row(20),
            ["Bad years first", a.dead ? "Runs out in year " + a.dead : "Ends with " + igM(a.end), !!a.dead],
            ["Good years first", "Ends with " + igM(b.end)],
          ]) + igMade(),
        ins: [["rate", "How much do you take out each year?", "wrate", IG_RATES, 0.04]],
        math: [
          "Start: your freedom number, " + igM(P),
          "Each year: take out " +
            igM(W) +
            " (" +
            igP(rate, 1) +
            " of the start), then the rest grows or shrinks by that year's return",
          "Bad years first: the 30 made-up returns in order, worst ones early",
          "Good years first: the same 30 returns, backwards",
          "Average return in both: " + igP(IG_MEAN, 1) + " a year after inflation",
        ],
        note: "What it means for you: the first 5 to 10 years after you stop are the ones to protect. Guardrails, a bond tent and buckets are three ways people do that.",
        links: [
          ["Open Guardrails", "idea", "gk"],
          ["Open the bond tent", "idea", "kitces"],
        ],
      };
    }
    const cape = x.v("cape", 30),
      wr = 0.0175 + 0.5 / cape,
      W = P * wr;
    return {
      big: igP(wr, 1) + " a year",
      cap:
        "That is " +
        igM(W) +
        " a year, or " +
        igM(W / 12) +
        " a month, from " +
        igM(P) +
        ". The plain 4% rule would say " +
        igM((P * 0.04) / 12) +
        " a month.",
      ins: [
        [
          "cape",
          "How pricey are stocks right now? (the CAPE)",
          "cape",
          [
            [15, "15"],
            [20, "20"],
            [25, "25"],
            [30, "30"],
            [35, "35"],
            [40, "40"],
          ],
          30,
        ],
      ],
      math: [
        "His rule: rate = a base + a slope ÷ CAPE",
        "One setting he has written about: 1.75% + 0.5 ÷ CAPE",
        "1.75% + 0.5 ÷ " + cape + " = " + igP(wr, 1),
        igM(P) + " × " + igP(wr, 1) + " = " + igM(W) + " a year",
        "Your spending at freedom: " + igM(x.S) + " a year",
      ],
      note: 'When stocks are pricey the rate drops, and when they are cheap it rises. He updates his numbers, so check his site for the setting he uses now. Search "Shiller CAPE" for today\'s reading.',
    };
  },
  val: x => "4% of your freedom number is " + igM((x.P * 0.04) / 12) + " a month",
});
/* ---------- 2. Guyton-Klinger ---------- */
igAdd({
  id: "gk",
  grp: "stop",
  n: "Guardrails",
  by: "Jonathan Guyton and William Klinger (2006)",
  one: "Start with a higher paycheck, then cut 10% if your money falls too far and raise 10% if it grows a lot.",
  what: "A set of rules for spending in retirement. You pick a starting rate. If your rate drifts 20% above where it started, you cut spending 10%. If it drifts 20% below, you raise it 10%. After a losing year you skip the inflation raise.",
  fit: IG_NEAR,
  body: x => {
    const P = x.P,
      rate = x.v("rate", 0.05),
      path = x.v("path", "rough"),
      rets = path === "strong" ? IG_STRONG : path === "steady" ? IG_STEADY : IG_ROUGH,
      g = igGK(P, rate, rets),
      ws = g.rows.filter(r => r.w > 0).map(r => r.w),
      lo = Math.min.apply(null, ws),
      hi = Math.max.apply(null, ws);
    return {
      big: igM(lo / 12) + " to " + igM(hi / 12) + " a month",
      cap:
        "Your paycheck starts at " +
        igM((P * rate) / 12) +
        " a month and moves inside the guardrails. " +
        igI("guardrails") +
        " It ends 30 years later with " +
        igM(g.end) +
        ".",
      html:
        `<details class="math"><summary>Your paycheck, year by year</summary><div class="inner tiny stack" style="gap:3px">${g.rows.map(r => `<div class="row between"><span>Year ${r.y}${r.note ? " · " + esc(r.note) : ""}</span><span>${r.w > 0 ? igM(r.w / 12) + " a month" : "$0"}</span></div>`).join("")}</div></details>` +
        igMade(),
      ins: [
        [
          "rate",
          "What rate do you start at?",
          "wrate",
          [
            [0.04, "4%"],
            [0.045, "4.5%"],
            [0.05, "5%"],
            [0.055, "5.5%"],
          ],
          0.05,
        ],
        [
          "path",
          "What kind of years come first?",
          "seqrisk",
          [
            ["rough", "A rough start"],
            ["steady", "Steady"],
            ["strong", "A strong start"],
          ],
          "rough",
        ],
      ],
      math: [
        "Start: " + igM(P) + " × " + igP(rate, 1) + " = " + igM(P * rate) + " a year",
        "Upper guardrail: your rate reaches " + igP(rate * 1.2, 1) + ", so you cut spending 10%",
        "Lower guardrail: your rate falls to " + igP(rate * 0.8, 1) + ", so you raise spending 10%",
        "After a losing year, with your rate above where it started: no inflation raise (about 3% less in today's dollars)",
        "All amounts are in today's dollars",
      ],
      note: "The trade: a bigger paycheck to start, in return for agreeing to cut when the rules say so. Michael Kitces and Big ERN have both written that the cuts can run deeper and longer than people expect.",
    };
  },
  val: x => "Starts at " + igM((x.P * 0.05) / 12) + " a month at 5%",
});
/* ---------- 3. Michael Kitces ---------- */
igAdd({
  id: "kitces",
  grp: "stop",
  n: "The bond tent",
  by: "Michael Kitces, building on research with Wade Pfau",
  one: "Hold more bonds in the years around your stop date, then drift back to stocks.",
  what: "A rising equity glidepath. You move toward bonds as your stop date gets close, so a crash right then hurts less, and you move back toward stocks over the 10 to 15 years after. On a chart the bond share looks like a tent.",
  fit: IG_NEAR,
  body: x => {
    const T = x.v("low", 0.4),
      ret = x.ret,
      P = x.P,
      W = P * 0.04,
      tent = age =>
        age <= ret
          ? 0.8 - (0.8 - T) * Math.max(0, Math.min(1, (age - (ret - 10)) / 10))
          : T + (0.7 - T) * Math.min(1, (age - ret) / 15),
      flat = igGlide(P, W, () => 0.6),
      tn = igGlide(P, W, i => tent(ret + i));
    return {
      big: igM(tn) + " with the tent",
      cap:
        "Fifteen years after a rough start, next to " +
        igM(flat) +
        " holding a steady 60% in stocks the whole way. " +
        igI("glide"),
      html:
        igRows(
          [["<b>Your age</b>", "<b>Steady · Tent</b>"]].concat(
            [-10, -5, 0, 5, 10, 15].map(k => [
              (k === 0 ? "Stop date, " : "") + "age " + (ret + k),
              "60% · " + igP(tent(ret + k)) + " stocks",
            ])
          )
        ) + igMade(),
      ins: [
        [
          "low",
          "How low do stocks go at your stop date?",
          "glide",
          [
            [0.3, "30%"],
            [0.4, "40%"],
            [0.5, "50%"],
          ],
          0.4,
        ],
      ],
      math: [
        "Stop date: age " + ret,
        "Tent: 80% stocks ten years before, down to " +
          igP(T) +
          " at your stop date, back up to 70% fifteen years after",
        "Steady: 60% stocks the whole way",
        "Both take out " + igM(W) + " a year (4% of " + igM(P) + ") through 15 made-up years that open with a crash",
        "Bonds earn 1% a year after inflation here",
      ],
      note: "The trade: fewer stocks at the worst moment to lose, and so less growth if the early years turn out strong.",
    };
  },
  val: x => "Fewer stocks around age " + x.ret + ", then back up",
});
/* ---------- 4. Christine Benz ---------- */
igAdd({
  id: "benz",
  grp: "stop",
  n: "The bucket strategy",
  by: "Christine Benz at Morningstar, building on Harold Evensky's cash bucket",
  one: "Split your money by when you need it: cash for now, bonds for the next stretch, stocks for later.",
  what: "Three buckets. Bucket 1 is cash for the next year or two of spending. Bucket 2 is bonds for the years after that. Bucket 3 is stocks for everything further out. You spend from the cash and refill it from the others when they are up.",
  fit: IG_NEAR,
  body: x => {
    const y1 = x.v("cash", 2),
      y2 = x.v("bond", 8),
      S = x.S,
      at = x.v("at", "goal"),
      P = at === "now" ? x.cash + x.inv : x.P,
      b1 = Math.min(P, S * y1),
      b2 = Math.min(P - b1, S * y2),
      b3 = Math.max(0, P - b1 - b2),
      yr = v => (S > 0 ? Math.round((v / S) * 10) / 10 + " years" : "");
    return {
      big: igM(b1) + " · " + igM(b2) + " · " + igM(b3),
      cap: "Cash, bonds and stocks, from " + igM(P) + ". " + igI("buckets"),
      html: `<div class="igthree">${[
        ["1. Cash", b1, "Spend from here"],
        ["2. Bonds", b2, "Refills the cash"],
        ["3. Stocks", b3, "Grows for later"],
      ]
        .map(
          b =>
            `<div class="tile"><div class="tiny muted">${b[0]}</div><b>${igM(b[1])}</b><div class="tiny muted">${yr(b[1])} of spending</div><div class="tiny">${b[2]}</div></div>`
        )
        .join("")}</div>`,
      ins: [
        [
          "at",
          "Which money?",
          "buckets",
          [
            ["goal", "My freedom number"],
            ["now", "What I have today"],
          ],
          "goal",
        ],
        [
          "cash",
          "Years of spending in cash",
          "buckets",
          [
            [1, "1 year"],
            [2, "2 years"],
            [3, "3 years"],
          ],
          2,
        ],
        [
          "bond",
          "Years of spending in bonds",
          "buckets",
          [
            [5, "5 years"],
            [8, "8 years"],
            [10, "10 years"],
          ],
          8,
        ],
      ],
      math: [
        "A year of spending: " + igM(S),
        "Bucket 1: " + y1 + " × " + igM(S) + " = " + igM(S * y1),
        "Bucket 2: " + y2 + " × " + igM(S) + " = " + igM(S * y2),
        "Bucket 3: what is left of " + igM(P),
        "Refill: in a good year sell some stocks to top up the cash. In a bad year leave the stocks alone and spend the cash, then the bonds.",
      ],
      note: "The point is sleep: with years of spending out of the market, a crash does not force you to sell stocks low.",
    };
  },
  val: x => "Two years in cash would be " + igM(x.S * 2),
});
/* ---------- 5. Mad Fientist ---------- */
igAdd({
  id: "madf",
  grp: "tax",
  n: "The Roth ladder, the stealth HSA, and traditional or Roth",
  by: "Brandon, the Mad Fientist",
  one: "Three tax moves for people who stop early: reach retirement money before 59½, turn an HSA into a second retirement account, and pick the account type that leaves you with more.",
  what: "The Mad Fientist is known for working out how early retirees pay very little tax. Three of his best-known ideas are here.",
  tabs: [
    ["ladder", "Roth ladder"],
    ["hsa", "Stealth HSA"],
    ["tvr", "Traditional or Roth"],
  ],
  fit: (c, d) => c.work !== "Retired" && d.era >= 2,
  body: (x, tab) => {
    const S = x.S;
    if (tab === "ladder") {
      const A = x.ret,
        amt = Math.round((S * x.v("amt", 1)) / 100) * 100;
      return {
        big: igM(amt * 5) + " to bridge 5 years",
        cap:
          "Each year you move " +
          igM(amt) +
          " from a traditional account to a Roth. Five tax years later that money comes out with no penalty. " +
          igI("ladder"),
        html:
          igRows(
            [0, 1, 2, 3, 4, 5, 6].map(i => [
              "Age " + (A + i) + ": move " + igM(amt) + " to Roth",
              i < 5 ? "Live on the bridge" : "Spend age " + (A + i - 5) + "'s move",
            ])
          ) +
          `<div class="tiny muted">The bridge is money you can already reach: cash, a regular investing account, or what you paid into a Roth yourself. ${igI("fiveyr")}</div>`,
        ins: [
          [
            "amt",
            "How much do you move each year?",
            "ladder",
            [
              [0.75, "Three quarters of my spending"],
              [1, "My full spending"],
              [1.25, "A bit extra"],
            ],
            1,
          ],
        ],
        math: [
          "Your spending at freedom: " + igM(S) + " a year",
          "Moved each year: " + igM(amt),
          "Years before the first move can be spent: 5",
          "Bridge: 5 × " + igM(amt) + " = " + igM(amt * 5),
          "You have within reach today: " + igM(x.cash) + " in cash",
          "Each move counts as income that year, so the tax depends on how much you move. See Go Curry Cracker for how much fits at 0%.",
        ],
        note: "You stop at " + A + " in this plan. Stopping after 59½ means you do not need a ladder.",
        links: [["How much fits at 0% tax", "idea", "gcc"]],
      };
    }
    if (tab === "hsa") {
      const fam = x.v("cov", x.two ? "fam" : "one") === "fam",
        lim = fam ? IG_TAX.hsa.fam : IG_TAX.hsa.one,
        tr = x.v("tax", 0.22),
        yrs = Math.max(0, 65 - x.age),
        fv = grow(0, yrs, lim);
      return {
        big: igM(fv) + " by 65",
        cap:
          "Putting in the " +
          igM(lim) +
          " limit each year, investing it, and paying today's doctor bills from your pocket. It also cuts this year's tax by about " +
          igM(lim * tr) +
          ". " +
          igI("hsa"),
        ins: [
          [
            "cov",
            "Who is on your health plan?",
            "hsa",
            [
              ["one", "Just me"],
              ["fam", "My family"],
            ],
            x.two ? "fam" : "one",
          ],
          [
            "tax",
            "Your top tax rate",
            "taxrate",
            [
              [0.12, "12%"],
              [0.22, "22%"],
              [0.24, "24%"],
              [0.32, "32%"],
            ],
            0.22,
          ],
        ],
        math: [
          "2026 limit: " +
            igM(lim) +
            " a year" +
            (x.age >= 55 ? " (plus $1,000 at 55 or older, not counted here)" : ""),
          "Tax saved this year: " + igM(lim) + " × " + igP(tr) + " = " + igM(lim * tr),
          "Years until 65: " + yrs,
          igM(lim) + " a year for " + yrs + " years at 7% a year = " + igM(fv),
          "Keep your medical receipts. You can pay yourself back for them tax-free in any later year.",
        ],
        note: "You need a high-deductible health plan to use an HSA. After 65 the money can be spent on anything, taxed like a traditional account.",
      };
    }
    const now = x.v("now", 0.22),
      later = x.v("later", 0.1),
      amt = x.v("amt", 10000),
      dif = amt * (now - later);
    return {
      big: igM(Math.abs(dif)) + " a year " + (dif >= 0 ? "ahead with traditional" : "ahead with Roth"),
      cap:
        "On " +
        igM(amt) +
        " a year. Traditional skips tax now and pays it when the money comes out. Roth pays now and never again. " +
        igI("tvr"),
      ins: [
        [
          "amt",
          "How much goes in each year?",
          "tvr",
          [
            [5000, "$5,000"],
            [10000, "$10,000"],
            [15000, "$15,000"],
            [24500, "$24,500"],
          ],
          10000,
        ],
        [
          "now",
          "Your top tax rate today",
          "taxrate",
          [
            [0.12, "12%"],
            [0.22, "22%"],
            [0.24, "24%"],
            [0.32, "32%"],
          ],
          0.22,
        ],
        [
          "later",
          "Your tax rate when it comes out",
          "taxrate",
          [
            [0, "0%"],
            [0.1, "10%"],
            [0.12, "12%"],
            [0.22, "22%"],
          ],
          0.1,
        ],
      ],
      math: [
        "Roth: tax now is " + igM(amt) + " × " + igP(now) + " = " + igM(amt * now),
        "Traditional: tax later is " + igM(amt) + " × " + igP(later) + " = " + igM(amt * later),
        "Difference: " + igM(Math.abs(dif)) + " for each year you put money in",
        "His point: people who stop early have little income afterwards, so their rate when the money comes out is often far below their rate today.",
      ],
      note: "This compares tax rates only. A Roth also has no required withdrawals and its contributions can be reached early, which some people value more than the difference.",
    };
  },
  val: x => "A 5-year bridge would be " + igM(x.S * 5),
});
/* ---------- 6. Go Curry Cracker ---------- */
igAdd({
  id: "gcc",
  grp: "tax",
  n: "0% tax in early retirement",
  by: "Jeremy, at Go Curry Cracker",
  one: "Fill the tax brackets that charge 0% on purpose, every year.",
  what: "Bracket filling. The standard deduction covers a first slice of ordinary income, and long-term investment gains above that are taxed at 0% up to a cap. Keep your income inside those two slices and the federal tax bill can be $0.",
  fit: (c, d) => (c.ret < 60 && d.era >= 4) || c.work === "Retired",
  body: x => {
    const two = x.v("who", x.two ? "two" : "one") === "two",
      sd = two ? IG_TAX.sd.two : IG_TAX.sd.one,
      cap = two ? IG_TAX.gain.two : IG_TAX.gain.one,
      tot = sd + cap,
      S = x.S;
    return {
      big: igM(tot) + " a year at 0%",
      cap:
        "Federal income tax, for " +
        (two ? "a married couple" : "one person") +
        " in 2026. Your spending at freedom is " +
        igM(S) +
        " a year" +
        (S <= tot ? ", which fits inside it." : ", which is " + igM(S - tot) + " more than fits.") +
        " " +
        igI("fill"),
      html: igRows([
        ["First slice: the standard deduction " + igI("stdded"), igM(sd)],
        ["Good for: paychecks, Roth ladder moves, interest", ""],
        ["Second slice: long-term gains and dividends " + igI("zerogain"), igM(cap)],
        ["Together", `<b>${igM(tot)}</b>`],
      ]),
      ins: [
        [
          "who",
          "Who files the tax return?",
          "fill",
          [
            ["one", "Just me"],
            ["two", "Married, filing together"],
          ],
          x.two ? "two" : "one",
        ],
      ],
      math: [
        "2026 standard deduction: " + igM(sd),
        "2026 top of the 0% long-term gains band: " + igM(cap) + " of taxable income",
        igM(sd) + " + " + igM(cap) + " = " + igM(tot),
        "Ordinary income above the standard deduction uses up room in the second slice",
        "This is federal tax only. Your state may tax some of it, and all of it counts as income for health insurance help.",
      ],
      note: "Only the gain part of a sale counts as income, so the cash you can actually pull out is usually more than this.",
      links: [["Health insurance income target", "idea", "rog"]],
    };
  },
  val: x => igM(x.two ? IG_TAX.sd.two + IG_TAX.gain.two : IG_TAX.sd.one + IG_TAX.gain.one) + " a year fits at 0%",
});
/* ---------- 7. Root of Good ---------- */
igAdd({
  id: "rog",
  grp: "tax",
  n: "The health insurance income target",
  by: "Justin, at Root of Good",
  one: "When you stop early, you choose your income each year. Choose it so marketplace health insurance stays cheap.",
  what: "Help paying for a marketplace health plan depends on your income for the year, measured against the poverty line for your household size. Early retirees can steer that income, so they aim for the band where the help is biggest.",
  fit: (c, d) => (c.ret < 65 && d.era >= 4) || (c.work === "Retired" && c.age < 65),
  body: x => {
    const n = x.v("size", x.two ? 2 : 1),
      fpl = IG_TAX.fpl[0] + IG_TAX.fpl[1] * (n - 1),
      lo = fpl * IG_TAX.acaLo,
      hi = fpl * IG_TAX.acaHi,
      S = x.S;
    return {
      big: igM(lo) + " to " + igM(hi),
      cap:
        "The yearly income band for a household of " +
        n +
        ". Below it most states move you to Medicaid. Above it the help stops. " +
        igI("acahelp"),
      html:
        igRows([
          ["Poverty line for " + n + " " + igI("fpl"), igM(fpl)],
          ["Bottom of the band (138%)", igM(lo)],
          ["Top of the band (400%)", igM(hi)],
          ["Your spending at freedom", igM(S), S > hi],
        ]) +
        (S > hi
          ? `<div class="banner small">Your spending is above the band. Spending is not the same as income: money from cash, a Roth, or the part of a sale that is not gain does not count. ${igI("magi")}</div>`
          : ""),
      ins: [
        [
          "size",
          "How many people are in your household?",
          "fpl",
          [
            [1, "1"],
            [2, "2"],
            [3, "3"],
            [4, "4"],
            [5, "5"],
            [6, "6"],
          ],
          x.two ? 2 : 1,
        ],
      ],
      math: [
        "2026 poverty guideline: " +
          igM(IG_TAX.fpl[0]) +
          " for one person, plus " +
          igM(IG_TAX.fpl[1]) +
          " for each more",
        igM(IG_TAX.fpl[0]) + " + " + (n - 1) + " × " + igM(IG_TAX.fpl[1]) + " = " + igM(fpl),
        "138% of that: " + igM(lo) + ". 400% of that: " + igM(hi),
        "For 2027 plans, help ends above 400%. One dollar over can cost thousands, so people leave room.",
        "In states that did not expand Medicaid, the band starts at 100% (" + igM(fpl) + ").",
      ],
      note: "Rules as checked in Nov 2026 for 2027 plans. Alaska and Hawaii use higher poverty lines. The rules have changed more than once, so check healthcare.gov before you plan a year around this.",
      links: [["How much income fits at 0% tax", "idea", "gcc"]],
    };
  },
  val: x => {
    const f = IG_TAX.fpl[0] + IG_TAX.fpl[1] * (x.two ? 1 : 0);
    return "Income band: " + igM(f * IG_TAX.acaLo) + " to " + igM(f * IG_TAX.acaHi);
  },
});
/* ---------- 8. Scott Trench ---------- */
igAdd({
  id: "trench",
  grp: "build",
  n: "The middle-class trap, and the first $25,000",
  by: "Scott Trench (Set for Life) and Mindy Jensen, BiggerPockets Money",
  one: "Wealth you cannot reach does not buy freedom yet. Build money you can get to first.",
  what: "The middle-class trap is their name for being wealthy on paper while nearly all of it sits in home equity and retirement accounts. Set for Life starts with building a first $25,000 you can actually reach.",
  tabs: [
    ["trap", "The trap meter"],
    ["first", "The first $25,000"],
  ],
  fit: (c, d) => d.era >= 1 && c.work !== "Retired",
  body: (x, tab) => {
    const c = x.c,
      lock = (c.invs || []).filter(r => /retirement|ira|hsa|401|403/i.test(r.k)).reduce((t, r) => t + (+r.amt || 0), 0),
      home = x.v("home", 0),
      free = x.cash + Math.max(0, x.inv - lock),
      tot = free + lock + home,
      sh = tot > 0 ? Math.min(0.99, Math.max(0.01, free / tot)) : 0;
    if (tab === "trap")
      return {
        big: tot > 0 ? igP(sh) + " within reach" : "Nothing to split yet",
        cap:
          igM(free) +
          " you can reach, next to " +
          igM(lock + home) +
          " locked in retirement accounts" +
          (home ? " and your home" : "") +
          ". " +
          igI("mctrap"),
        html:
          tot > 0
            ? `<div class="cptop"><i class="c-inv" style="width:${sh * 100}%"></i><i class="c-save" style="width:${(1 - sh) * 100}%"></i></div><div class="cpkey tiny muted"><span><i class="c-inv"></i>Within reach ${igP(sh)}</span><span><i class="c-save"></i>Locked ${igP(1 - sh)}</span></div>`
            : "",
        ins: [
          [
            "home",
            "Home equity (what your home is worth, minus the loan)",
            "equity",
            [
              [0, "None"],
              [50000, "$50,000"],
              [100000, "$100,000"],
              [200000, "$200,000"],
              [400000, "$400,000"],
              [700000, "$700,000"],
            ],
            0,
          ],
        ],
        math: [
          "Within reach: cash " +
            igM(x.cash) +
            " + investments outside retirement accounts " +
            igM(Math.max(0, x.inv - lock)),
          "Locked: retirement accounts " + igM(lock) + " + home equity " + igM(home),
          tot > 0 ? igM(free) + " ÷ " + igM(tot) + " = " + igP(sh) : "Add what you have in My Money and this fills in",
          "The game reads an account as a retirement account from its name (401k, IRA, HSA, retirement).",
        ],
        note: "Locked money is still yours and still growing. The question is only whether you could live on what you can reach if you stopped before 59½. The Roth ladder is one way in.",
        links: [
          ["Open the Roth ladder", "idea", "madf"],
          ["Open My Money", "tab", "money"],
        ],
      };
    const goal = 25000,
      left = Math.max(0, goal - free),
      mo = x.kept > 0 ? Math.ceil(left / x.kept) : null;
    return {
      big: left <= 0 ? "You have it" : igM(left) + " to go",
      cap:
        "You can reach " +
        igM(free) +
        " of the first " +
        igM(goal) +
        " today." +
        (left > 0 && mo ? " At " + igM(x.kept) + " kept each month, that is about " + mo + " months." : "") +
        " " +
        igI("first25"),
      html: `<span class="cpbar"><i class="fill" style="width:${Math.max(1, Math.min(100, (free / goal) * 100))}%"></i></span>`,
      math: [
        "Within reach today: " + igM(free),
        igM(goal) + " − " + igM(free) + " = " + igM(left),
        x.kept > 0
          ? igM(left) + " ÷ " + igM(x.kept) + " a month = " + (mo || 0) + " months"
          : "Nothing is left over each month yet, so there is no date",
      ],
      note: "His case: a first pile you can reach gives you choices, like taking a better job, moving, or buying a first property. Other teachers on this list would send that money to a retirement account first. Both are guides.",
      links: [["See what would raise what you keep", "moves", ""]],
    };
  },
  val: x => "You can reach " + igM(x.cash) + " in cash today",
});
