/* ===== csp.js: two ways to see a whole month of money at a glance.
   1. Conscious Spending Plan: four buckets next to the guide from Ramit Sethi's I Will Teach You To Be Rich. Percents of take-home pay. A guide, never a grade.
   2. Money audit score: one number out of 10, built only from real numbers. The idea of a single score out of 10 comes from the Hammer Financial Score on Caleb Hammer's show Financial Audit. The formula here is SLAM's own, not his.
   Rules: tap only. A number built on a guess gets no verdict and earns no points. Nothing shows red, amber only for "needs attention". Every part opens to what it is, why it matters and what a change would do. ===== */
const CSP_B = [
  {
    id: "fixed",
    n: "Fixed costs",
    lo: 50,
    hi: 60,
    max: 100,
    g: "50 to 60%",
    what: "What it costs to keep your life running: home, food, getting around and bills. Debt payments belong here too.",
    why: "This bucket decides how much room the other three get. A few points off here frees more money than a hundred small cuts.",
  },
  {
    id: "inv",
    n: "Investments",
    lo: 10,
    hi: 10,
    max: 30,
    g: "10%",
    what: "Money that goes into a retirement plan, a Roth IRA or any investing account.",
    why: "This is the money that grows while you sleep. Every point here pulls your freedom date closer.",
  },
  {
    id: "save",
    n: "Savings goals",
    lo: 5,
    hi: 10,
    max: 30,
    g: "5 to 10%",
    what: "Cash you set aside on purpose: a cushion, a trip, gifts, a down payment.",
    why: "Money with a name on it. When the car breaks or the trip comes, it is already paid for and nothing else has to move.",
  },
  {
    id: "fun",
    n: "Guilt-free spending",
    lo: 20,
    hi: 35,
    max: 60,
    g: "20 to 35%",
    what: "Eating out, hobbies, clothes, whatever you enjoy. Once the other three are covered, this is yours to spend with no guilt.",
    why: "A plan with no fun in it gets dropped. This bucket is what makes the plan last.",
  },
  {
    id: "both",
    n: "Investing and saving goals",
    lo: 15,
    hi: 20,
    max: 50,
    g: "15 to 20%",
    what: "Everything you keep each month, before the game knows how you split it between investing and saving.",
    why: "This is the part of your pay that works for future you. One tap below splits it into its two buckets.",
  },
];
const CSP_SHARE = [
  [0, "None of it"],
  [0.25, "About a quarter"],
  [0.5, "About half"],
  [0.75, "Most of it"],
  [1, "All of it"],
];
var CSPX = {};
function cspX(c) {
  c.x = c.x || {};
  c.x.cp = c.x.cp || {};
  return c.x.cp;
}
function cspI(k) {
  return `<button class="term" data-a="info" data-k="gloss:${k}">i</button>`;
}
/* the status word, spelled out so "Close" never reads as a close button */
function cspSt(st) {
  return st === "Guess" ? "A guess so far" : st === "Exact" ? "Exact numbers" : "Close, not exact";
}
function cspPct(n) {
  return Math.round(n) + "%";
}
function cspRows(c) {
  const sp = (c.spends || []).filter(r => (+r.amt || 0) > 0 || r.s);
  if (c.led && sp.length) return sp;
  const sh = c.home === "With family" ? SPLIT_FAM : SPLIT;
  return SPEND_K.map((k, i) => ({ k, amt: Math.round((c.spend || 0) * sh[i]), s: false }));
}
function cspCalc(c) {
  const rows = cspRows(c),
    isFun = r => /fun|everything else/i.test(r.k),
    sum = a => a.reduce((t, r) => t + (+r.amt || 0), 0),
    X = cspX(c),
    pre = typeof knGot === "function" ? knGot(c, "pre") : null,
    p = pre ? +pre.v || 0 : 0;
  const take = c.take || 0,
    base = take + p,
    need = rows.filter(r => !isFun(r)),
    fun = rows.filter(isFun),
    out = sum(rows),
    kept = take - out,
    k = Math.max(0, kept),
    split = X.inv != null && k > 0,
    inv = (split ? k * X.inv : 0) + p,
    sav = split ? k * (1 - X.inv) : 0;
  const st = c.led && (c.incs || []).length && typeof knSt === "function" ? knSt(c.incs, rows) : "Guess",
    guess = st === "Guess",
    pc = v => (base > 0 ? (v / base) * 100 : 0);
  const mk = (id, amt, lines) => {
    const b = CSP_B.find(x => x.id === id),
      pct = pc(amt);
    return { b, id, amt, pct, lines, zone: guess ? null : cspZone(id, pct) };
  };
  const L = a =>
    a
      .slice()
      .sort((x, y) => y.amt - x.amt)
      .map(r => [r.k, r.amt]);
  const B = [mk("fixed", sum(need), L(need))];
  if (split || (p > 0 && k <= 0)) {
    B.push(
      mk(
        "inv",
        inv,
        [
          split ? ["From what you keep each month", k * X.inv] : null,
          p ? ["Into a plan at work before pay lands", p] : null,
        ].filter(Boolean)
      )
    );
    B.push(mk("save", sav, [["From what you keep each month", sav]]));
  } else
    B.push(
      mk(
        "both",
        k + p,
        [["Kept each month", k], p ? ["Into a plan at work before pay lands", p] : null].filter(Boolean)
      )
    );
  B.push(mk("fun", sum(fun), L(fun)));
  return {
    B,
    take,
    base,
    pre: p,
    kept,
    k,
    split,
    st,
    guess,
    ask: !split && k > 0 && !guess,
    over: kept < 0 ? -kept : 0,
  };
}
function cspZone(id, p) {
  if (id === "fixed")
    return p <= 60
      ? [p < 50 ? "Under the guide, more room for the rest" : "Inside the guide", "good"]
      : p <= 70
        ? ["A bit above the guide", "ok"]
        : ["Well above the guide", "warn"];
  if (id === "inv")
    return p >= 10
      ? ["At the guide or past it", "good"]
      : p >= 5
        ? ["Getting there", "ok"]
        : ["Under the guide", "warn"];
  if (id === "save")
    return p >= 5 ? [p > 10 ? "Past the guide" : "Inside the guide", "good"] : ["Under the guide", "ok"];
  if (id === "both")
    return p >= 15
      ? ["At the guide or past it", "good"]
      : p >= 7.5
        ? ["Getting there", "ok"]
        : ["Under the guide", "warn"];
  return p < 20 ? ["Under the guide", "ok"] : p <= 35 ? ["Inside the guide", "good"] : ["Above the guide", "ok"];
}
/* the one bucket worth looking at first, or null when all four sit inside the guide */
function cspFirst(S) {
  if (S.guess) return null;
  const f = id => S.B.find(x => x.id === id),
    z = (x, k) => x && x.zone && x.zone[1] === k,
    fx = f("fixed"),
    iv = f("inv") || f("both"),
    sv = f("save"),
    fn = f("fun");
  if (S.over > 0) return fx;
  if (z(fx, "warn")) return fx;
  if (z(iv, "warn")) return iv;
  if (z(fx, "ok")) return fx;
  if (fn && fn.pct > 35 && (z(iv, "ok") || z(sv, "ok"))) return fn;
  if (z(iv, "ok")) return iv;
  if (z(sv, "ok")) return sv;
  return null;
}
function cspGap(S, x) {
  const b = x.b,
    B = S.base,
    d = v => money(Math.round(v));
  if (x.id === "fun")
    return x.pct > b.hi
      ? "The guide tops out at " +
          b.hi +
          "%, which is " +
          d((B * b.hi) / 100) +
          " a month for you. You are " +
          d(x.amt - (B * b.hi) / 100) +
          " above it."
      : x.pct < b.lo
        ? "The guide starts at " +
          b.lo +
          "%, which is " +
          d((B * b.lo) / 100) +
          " a month for you. There is room for " +
          d((B * b.lo) / 100 - x.amt) +
          " more fun once the other three are covered."
        : "";
  if (x.id === "fixed")
    return x.pct > b.hi
      ? "The guide tops out at " +
          b.hi +
          "%, which is " +
          d((B * b.hi) / 100) +
          " a month for you. You are " +
          d(x.amt - (B * b.hi) / 100) +
          " a month above it."
      : "";
  return x.pct < b.lo
    ? "The guide is " +
        b.g +
        ", which starts at " +
        d((B * b.lo) / 100) +
        " a month for you. You are " +
        d((B * b.lo) / 100 - x.amt) +
        " a month under it."
    : "";
}
function cspMove(S, x) {
  const B = S.base,
    step = x.id === "fixed" || x.id === "fun" ? 100 : 50,
    d = v => money(Math.round(v));
  if (B <= 0) return "";
  if (x.id === "fixed")
    return (
      "Taking " +
      d(step) +
      " a month off this bucket moves it from " +
      cspPct(x.pct) +
      " to " +
      cspPct(((x.amt - step) / B) * 100) +
      " and frees " +
      d(step * 12) +
      " a year for the other three."
    );
  if (x.id === "fun")
    return (
      "This one is yours to set. Moving " +
      d(step) +
      " a month between here and investing changes each by about " +
      cspPct((step / B) * 100) +
      "."
    );
  return (
    "Adding " +
    d(step) +
    " a month here moves it from " +
    cspPct(x.pct) +
    " to " +
    cspPct(((x.amt + step) / B) * 100) +
    ". That is " +
    d(step * 12) +
    " a year."
  );
}
function cspBar(x, guess) {
  const m = x.b.max,
    w = v => Math.max(0, Math.min(100, (v / m) * 100)),
    hot = x.zone && x.zone[1] === "warn",
    lo = w(x.b.lo),
    hi = w(x.b.hi);
  return `<span class="cpbar"><i class="band" style="left:${lo}%;width:${Math.max(1.5, hi - lo)}%"></i><i class="fill ${hot ? "hot" : ""}" style="width:${Math.max(1, w(x.pct))}%"></i></span>`;
}
function cspTop(S) {
  const tot = S.B.reduce((t, x) => t + x.amt, 0) || 1;
  return `<div class="cptop">${S.B.map(x => `<i class="c-${x.id}" style="width:${Math.max(0, (x.amt / tot) * 100)}%"></i>`).join("")}</div><div class="cpkey tiny muted">${S.B.map(x => `<span><i class="c-${x.id}"></i>${esc(x.b.n)} ${cspPct(x.pct)}</span>`).join("")}</div>`;
}
function cspRow(S, x, open) {
  const z = x.zone,
    zw = S.guess ? "No verdict yet" : z[0];
  let h = `<button class="rowbtn cprow ${open ? "on" : ""}" data-a="cspopen" data-v="${x.id}" aria-expanded="${open}"><span style="flex:1;min-width:0;display:block"><span class="row between"><b>${esc(x.b.n)}</b><span><b>${cspPct(x.pct)}</b> <span class="tiny muted">${money(Math.round(x.amt))}</span></span></span>${cspBar(x)}<span class="row between tiny"><span class="muted">Guide: ${x.b.g}</span><span class="${z && z[1] === "warn" ? "fkhot" : "muted"}">${esc(zw)}</span></span></span><span class="fkgo">${open ? "Hide" : "Open"}</span></button>`;
  if (!open) return h;
  const B = S.base,
    gap = S.guess || S.firstId === x.id ? "" : cspGap(S, x),
    lo = money(Math.round((B * x.b.lo) / 100)),
    hi = money(Math.round((B * x.b.hi) / 100));
  h += `<div class="tile stack cpdet" style="gap:6px"><div class="small">${esc(x.b.what)} ${cspI("csp" + x.id)}</div>
  ${x.lines.length ? `<div class="stack" style="gap:2px">${x.lines.map(l => `<div class="row between small"><span>${esc(l[0])}</span><span class="muted">${money(Math.round(l[1]))}</span></div>`).join("")}</div>` : ""}
  <div class="small"><b>The guide for you:</b> ${x.b.g} of ${money(Math.round(B))} is ${x.b.lo === x.b.hi ? lo : lo + " to " + hi} a month.${gap ? " " + esc(gap) : ""}</div>
  <div class="small"><b>Why it matters:</b> ${esc(x.b.why)}</div>
  <div class="small"><b>What a change does:</b> ${esc(cspMove(S, x))}</div>
  ${x.id === "fixed" || x.id === "fun" ? `<button class="ghost wide slim" data-a="sharp" data-v="spend">Open my spending</button>` : x.id === "both" ? "" : `<button class="ghost wide slim" data-a="cspredo">Change how I split what I keep</button>`}</div>`;
  return h;
}
function cspAsk(S) {
  const X = cspX(C());
  return `<div class="tile stack cpask" style="gap:8px"><div class="small"><b>One tap makes this sharper.</b> Of the ${money(Math.round(S.k))} you keep each month, how much gets invested? ${cspI("cspinv")}</div><div class="chips">${CSP_SHARE.map(o => `<button class="chip ${X.inv === o[0] ? "on" : ""}" data-a="cspinv" data-v="${o[0]}">${o[1]}</button>`).join("")}</div><div class="tiny muted">The rest counts as savings goals. A guess is fine, and you can change it any time.</div></div>`;
}
function cspSheet() {
  const c = C(),
    S = cspCalc(c),
    first = cspFirst(S),
    open = W.open || null;
  S.firstId = S.over > 0 ? null : first ? first.id : null;
  let h =
    head("Conscious Spending Plan", "Your month in four buckets " + cspI("csp")) +
    `<div class="row between small"><span>Take-home pay: <b>${money(Math.round(S.take))}</b> a month${S.pre ? " + " + money(Math.round(S.pre)) + " into a plan at work" : ""}</span><span class="pill">${cspSt(S.st)}</span></div>${cspTop(S)}`;
  if (S.guess)
    h += `<div class="banner small">Parts of this are a guess, so the game gives no verdict yet. The picture is still worth a look.<button class="primary wide slim" style="margin-top:8px" data-a="sharp" data-v="${c.led && (c.incs || []).some(r => !r.s) ? "take" : "spend"}">Make my numbers real</button></div>`;
  else if (S.over > 0)
    h += `<div class="banner small cpfirst"><b class="fkhot">Look here first:</b> about ${money(Math.round(S.over))} more goes out each month than comes in, so there is nothing left to invest or save yet. Fixed costs is the bucket with the most room to move.${open === "fixed" ? "" : `<button class="primary wide slim" style="margin-top:8px" data-a="cspopen" data-v="fixed">Open Fixed costs</button>`}</div>`;
  else if (first)
    h += `<div class="banner small cpfirst"><b>Look here first:</b> ${esc(first.b.n)} is at ${cspPct(first.pct)}. ${esc(cspGap(S, first) || "The guide is " + first.b.g + ".")}${open === first.id ? "" : `<button class="primary wide slim" style="margin-top:8px" data-a="cspopen" data-v="${first.id}">Open ${esc(first.b.n)}</button>`}</div>`;
  else
    h += `<div class="banner small cpfirst"><b>All of it sits inside the guide.</b> Nothing to fix here. Open any bucket to see what is in it.</div>`;
  h += S.B.map(x => cspRow(S, x, open === x.id) + (x.id === "both" && S.ask ? cspAsk(S) : "")).join("");
  if (W.redo && S.split) h += cspAsk(S);
  return (
    h +
    `<div class="tiny muted">The four buckets and their percents come from Ramit Sethi's book I Will Teach You To Be Rich. He calls them a guide, and so does the game: your plan should be yours.</div><button class="ghost wide slim" data-a="audit">See my money audit score</button>`
  );
}
/* ---------- money audit score ---------- */
const AUD_PARTS = [
  ["save", "Spending less than you make"],
  ["cushion", "Cash for a bad month"],
  ["highdebt", "High-interest debt"],
  ["home", "Home cost"],
  ["dti", "Debt payments next to pay"],
  ["invx", "Investing for later"],
];
const AUD_NEED = 3;
function audCalc(c, d) {
  const M = typeof knMetrics === "function" ? knMetrics(c, d || derive(c)) : [],
    r1 = v => Math.round(v * 10) / 10;
  const rows = AUD_PARTS.map(p => {
    const m = M.find(x => x.id === p[0]);
    if (!m) return null;
    const k = m.zone ? m.zone[1] : "none",
      miss = m.num == null,
      guess = !miss && m.st === "Guess",
      flat = !miss && !guess && k === "none";
    return {
      id: p[0],
      n: p[1],
      m,
      pts: miss || guess || flat ? null : k === "good" ? 1 : k === "ok" ? 0.5 : 0,
      why: miss ? "needs one answer" : guess ? "built on a guess" : flat ? "no rule of thumb fits yet" : "",
    };
  }).filter(Boolean);
  const cnt = rows.filter(r => r.pts != null),
    got = cnt.reduce((t, r) => t + r.pts, 0),
    score = cnt.length >= AUD_NEED ? r1(1 + (9 * got) / cnt.length) : null,
    low = cnt.filter(r => r.pts < 1).sort((a, b) => a.pts - b.pts)[0] || null;
  return {
    rows,
    cnt,
    got,
    score,
    low,
    next: score != null && low ? r1(1 + (9 * (got + 0.5)) / cnt.length) : null,
    st: cnt.length && cnt.every(r => r.m.st === "Exact") ? "Exact" : "Close",
  };
}
/* how to raise the score the most: one concrete move per part that is not at full points, biggest gain first, smallest dollars first on a tie.
   The dollar targets mirror the levels in metrics.js (savings rate 0 and 20%, cushion $1,000 and 3 months, home cost 28% of pay before taxes and 10 points above it, DTI 36%, Fidelity's mark for the age). */
function audMoves(c, A, d) {
  if (A.score == null) return [];
  d = d || derive(c);
  const N = knNet(c),
    take = c.take || 0,
    spend = c.spend || 0,
    kept = take - spend,
    cash = d.cash || 0,
    n = A.cnt.length,
    r1 = v => Math.round(v * 10) / 10,
    up = (v, q) => Math.max(q, Math.ceil(v / q) * q),
    D = v => money(Math.round(v)),
    out = [];
  const add = (r, t, sub, delta, eff) =>
    out.push({
      id: r.id,
      n: r.n,
      t,
      sub,
      delta,
      eff,
      gain: r1((9 * delta) / n),
      to: r1(Math.min(10, A.score + (9 * delta) / n)),
    });
  A.cnt
    .filter(r => r.pts < 1)
    .forEach(r => {
      const z = r.pts === 0 ? "warn" : "ok";
      if (r.id === "save") {
        if (z === "warn") {
          const x = up(-kept, 10);
          add(
            r,
            "Spend " + D(x) + " less a month, or bring in " + D(x) + " more",
            "Then nothing goes out that did not come in.",
            0.5,
            x * 12
          );
        } else {
          const x = up(0.2 * take - kept, 10);
          add(r, "Keep " + D(x) + " more each month", "That gets you to keeping 20% of your pay.", 0.5, x * 12);
        }
      } else if (r.id === "cushion") {
        if (z === "warn") {
          const T = Math.min(1000, up(3 * spend, 50)),
            x = Math.max(0, T - cash);
          add(r, "Get your cash to " + D(T), D(x) + " to go. Then a flat tire never has to go on a card.", 0.5, x);
        } else {
          const T = up(3 * spend, 50),
            x = Math.max(0, T - cash);
          add(r, "Build your cash to " + D(T), D(x) + " to go. That is 3 months of your spending.", 0.5, x);
        }
      } else if (r.id === "highdebt") {
        const hi = +r.m.num || 0;
        add(r, "Pay off your high-interest debt", D(hi) + " to go. Then it stops charging you every month.", 1, hi);
      } else if (r.id === "home") {
        const h = (typeof knRows === "function" ? knRows(c).home : []).reduce((t, x) => t + (+x.amt || 0), 0),
          hn = 0.28 / N.f,
          x = up(h - (z === "warn" ? hn + 0.1 : hn) * take, 10);
        add(
          r,
          "Bring your home cost down " + D(x) + " a month",
          "A roommate, a better deal at renewal, or more coming in. This one moves slowly.",
          0.5,
          x * 12
        );
      } else if (r.id === "dti") {
        const x = up((+r.m.num - 0.36) * N.gross, 10);
        add(
          r,
          "Bring home cost plus debt payments down " + D(x) + " a month",
          "That puts you inside what a lender looks for.",
          1,
          x * 12
        );
      } else if (r.id === "invx") {
        const age = c.age || 0,
          prev = KN_FID.slice()
            .reverse()
            .find(m => m[0] <= age);
        if (prev) {
          const T = up(prev[1] * N.gross * 12, 100),
            x = Math.max(0, T - (c.inv || 0));
          add(
            r,
            "Grow your investments to " + D(T),
            D(x) + " to go. That is Fidelity's mark for " + prev[0] + ".",
            0.5,
            x
          );
        }
      }
    });
  return out.sort((a, b) => b.gain - a.gain || a.eff - b.eff);
}
function audNote(c, A) {
  const X = cspX(c),
    t = todayISO();
  X.au = X.au || [];
  if (A.score == null) return null;
  const prev = X.au.filter(h => h.d < t).slice(-1)[0] || null,
    cur = X.au.find(h => h.d === t);
  if (!cur) {
    X.au.push({ d: t, s: A.score, n: A.cnt.length });
    if (X.au.length > 60) X.au = X.au.slice(-60);
    save();
  } else if (cur.s !== A.score || cur.n !== A.cnt.length) {
    cur.s = A.score;
    cur.n = A.cnt.length;
    save();
  }
  return prev;
}
function audWord(r) {
  return r.pts == null ? "Not counted" : r.pts >= 1 ? "Full points" : r.pts > 0 ? "Half points" : "No points yet";
}
function audSheet() {
  const c = C(),
    A = audCalc(c),
    prev = audNote(c, A),
    n = A.cnt.length,
    tot = A.rows.length;
  let h = head("Money audit score", "Your score out of 10 " + cspI("audit"));
  if (A.score != null)
    h += `<div class="tile aubox"><div class="aubig">${A.score.toFixed(1)}</div><div class="small muted">out of 10 · built from ${n} of ${tot} parts · <span class="pill">${cspSt(A.st)}</span></div>${prev && prev.s !== A.score ? `<div class="tiny muted">Last time (${esc(prev.d)}): ${prev.s.toFixed(1)}</div>` : ""}</div>`;
  else
    h += `<div class="tile aubox"><div class="aubig aunone">No score yet</div><div class="small muted">A score built on guesses would not mean anything, so the game waits. ${n} of ${tot} parts are real numbers. It takes ${AUD_NEED}.</div></div>`;
  const MV = audMoves(c, A),
    top = MV[0],
    wait = A.rows.filter(r => r.pts == null),
    all = MV.reduce((t, m) => t + m.delta, 0);
  if (top) {
    h += `<div class="small"><b>How to raise it the most</b> ${cspI("audmoves")}</div><div class="banner small aunext"><b>Do this first:</b> ${esc(top.t)}. ${esc(top.sub)} Your score goes from ${A.score.toFixed(1)} to about ${top.to.toFixed(1)}.<button class="primary wide slim" style="margin-top:8px" data-a="metric" data-v="${top.id}">Open ${esc(top.n)}</button></div>`;
    if (MV.length > 1 || wait.length)
      h += W.moves
        ? `<div class="stack audmoves" style="gap:6px">${MV.slice(1)
            .map(
              (m, k) =>
                `<button class="rowbtn audmove" data-a="metric" data-v="${m.id}"><span style="min-width:0"><b>${k + 2}. ${esc(m.t)}</b><div class="tiny muted">${esc(m.sub)}</div></span><span class="pill">+${m.gain.toFixed(1)}</span></button>`
            )
            .join(
              ""
            )}${wait.map(r => `<button class="rowbtn audmove" data-a="metric" data-v="${r.id}"><span style="min-width:0"><b>Make ${esc(r.n.toLowerCase())} real</b><div class="tiny muted">It is not in your score yet (${esc(r.why)}). Once it is real, it counts.</div></span><span class="fkgo">Open</span></button>`).join("")}${MV.length > 1 ? `<div class="tile small">${A.got + all >= n ? `Do all ${MV.length} and every part in your score is at full points: <b>10.0</b>.` : `Do all ${MV.length} and your score is about <b>${(Math.round(Math.min(10, 1 + (9 * (A.got + all)) / n) * 10) / 10).toFixed(1)}</b>. Each one is one level up, not the finish line.`}</div>` : ""}<button class="ghost wide slim" data-a="audmore">Hide the other moves</button></div>`
        : `<button class="ghost wide slim" data-a="audmore">See every move, biggest first (${MV.length - 1 + wait.length} more)</button>`;
  } else if (A.score != null)
    h += `<div class="banner small aunext"><b>Every counted part is at full points.</b> ${n < tot ? "Make the rest real and the score covers your whole picture." : "Nothing to fix here."}</div>`;
  else {
    const f = A.rows.find(r => r.pts == null);
    if (f)
      h += `<div class="banner small aunext"><b>Start here:</b> ${esc(f.n)} is not counted yet (${esc(f.why)}).<button class="primary wide slim" style="margin-top:8px" data-a="metric" data-v="${f.id}">Make it real</button></div>`;
  }
  h +=
    `<div class="small"><b>The ${tot} parts</b> ${cspI("auparts")}</div>` +
    A.rows
      .map(
        r =>
          `<button class="rowbtn aurow" data-a="metric" data-v="${r.id}"><span style="min-width:0"><b>${esc(r.n)}</b><div class="tiny muted">${r.pts == null ? esc("Not counted: " + r.why) : esc(r.m.val) + " · " + esc(r.m.zone[0])}</div></span><span class="pill ${r.pts === 0 ? "debuff" : ""}">${audWord(r)}</span></button>`
      )
      .join("");
  h += mathBox([
    "You get 1 point for looking at your numbers.",
    "The other 9 points are shared evenly across the parts that are real numbers.",
    "A part at its rule of thumb earns full points. Getting there earns half. Needs attention earns none.",
    "A part built on a guess is left out. It never counts against you.",
    A.score != null
      ? "Yours: 1 + 9 × (" + A.got + " of " + n + ") = " + A.score.toFixed(1)
      : "A score shows once " + AUD_NEED + " parts are real numbers.",
  ]);
  return (
    h +
    `<div class="tiny muted">The idea of one score out of 10 comes from the Hammer Financial Score on Caleb Hammer's show Financial Audit. This formula is SLAM's own, not his.</div><button class="ghost wide slim" data-a="csp">See my Conscious Spending Plan</button>`
  );
}
/* cspMoneyRows(c, d) makes the rows that moneyTabPlanRows() adds to the Money tab. cspMoneyRowsBase() is the part from this file. */
function cspMoneyRows(c, d) {
  let h = cspMoneyRowsBase(c, d);
  if (typeof cspMoneyRowsRoof === "function") h = cspMoneyRowsRoof(h, c); /* roof.js: the row "Famous money ideas" */
  return h;
}
function cspMoneyRowsBase(c, d) {
  if (!c) return "";
  const S = cspCalc(c),
    A = audCalc(c),
    fx = S.B[0],
    fn = S.B[S.B.length - 1];
  return `<div class="stack cplinks" style="gap:6px"><button class="rowbtn" data-a="csp"><span style="min-width:0"><b>Spending plan</b> <span class="tiny muted">Fixed ${cspPct(fx.pct)} · Fun ${cspPct(fn.pct)}${S.guess ? " · a guess" : ""}</span></span><span class="fkgo">Open</span></button><button class="rowbtn" data-a="audit"><span style="min-width:0"><b>Audit score</b> <span class="tiny muted">${A.score != null ? A.score.toFixed(1) + " out of 10" : "No score yet"}</span></span><span class="fkgo">Open</span></button></div>`;
}
/* a new screen starts at its top, not where the last one was scrolled to */
function cspUp() {
  try {
    const s = document.querySelector("#ov .sheet");
    if (s) s.scrollTop = 0;
  } catch (e) {}
}
Object.assign(ACT, {
  csp: () => {
    W = { kind: "csp", open: null };
    sheet(cspSheet);
    cspUp();
  },
  cspopen: t => {
    if (!W || W.kind !== "csp") W = { kind: "csp" };
    W.open = W.open === t.dataset.v ? null : t.dataset.v;
    W.redo = false;
    drawSheet();
  },
  cspinv: t => {
    const c = C(),
      v = +t.dataset.v;
    if (!isFinite(v)) return;
    cspX(c).inv = v;
    if (W) {
      W.redo = false;
      if (W.open === "both") W.open = null;
    }
    save();
    render();
    drawSheet();
  },
  cspredo: () => {
    if (W) {
      W.redo = true;
      drawSheet();
    }
  },
  audit: () => {
    W = { kind: "audit" };
    sheet(audSheet);
    cspUp();
  },
  audmore: () => {
    if (W && W.kind === "audit") {
      W.moves = !W.moves;
      drawSheet();
    }
  },
});
(() => {
  const _m = ACT.metric;
  if (typeof _m !== "function") return;
  ACT.metric = t => {
    const from = W && W.kind === "audit";
    const r = _m(t);
    if (from) cspUp();
    return r;
  };
})();
Object.assign(GLOSS, {
  csp: [
    "Conscious Spending Plan",
    "A way to see a month of money in four buckets instead of a line-by-line budget: fixed costs, investments, savings goals and guilt-free spending. Each one is a share of your take-home pay. The percents are a guide, not a grade. The Conscious Spending Plan comes from Ramit Sethi's book I Will Teach You To Be Rich.",
  ],
  cspfixed: [
    "Fixed costs",
    "What it costs to keep your life running each month: home, food, getting around, bills and debt payments. Guide: 50 to 60% of take-home pay.",
  ],
  cspinv: [
    "Investments",
    "Money going into a retirement plan, a Roth IRA or any investing account. Guide: 10% of take-home pay. Money that goes into a plan at work before your pay lands counts here too.",
  ],
  cspsave: [
    "Savings goals",
    "Cash set aside on purpose for things you know are coming or might: a cushion, a trip, gifts, a down payment. Guide: 5 to 10% of take-home pay.",
  ],
  cspfun: [
    "Guilt-free spending",
    "Money for whatever you enjoy, spent with no guilt because the other three buckets are already covered. Guide: 20 to 35% of take-home pay.",
  ],
  cspboth: [
    "Investing and saving goals",
    "Everything you keep each month. One tap tells the game how much of it gets invested, and it splits into two buckets.",
  ],
  audit: [
    "Money audit score",
    "One number out of 10 for how your money is set up right now. It is built only from numbers you have made real, so a guess never counts against you. The idea of one score out of 10 comes from the Hammer Financial Score on Caleb Hammer's show Financial Audit. This formula is SLAM's own, not his.",
  ],
  audmoves: [
    "How to raise it the most",
    "One move for each part that is not at full points yet, with the dollar amount that gets it one level up. The move that adds the most to your score comes first. When two add the same, the one that takes fewer dollars comes first. You do not have to do them in order.",
  ],
  auparts: [
    "The parts of the score",
    "Six of your key numbers: spending less than you make, cash for a bad month, high-interest debt, home cost, debt payments next to pay, and investing for later. Tap any one to see its rule of thumb and who it comes from.",
  ],
});
if (typeof NV_INFO !== "undefined") {
  NV_INFO.csp = [
    "Conscious Spending Plan",
    "Your month in four buckets, next to a guide for each one.",
    "Tap a bucket to see what is in it, why it matters and what a change would do.",
  ];
  NV_INFO.audit = [
    "Money audit score",
    "One score out of 10, built only from your real numbers.",
    "It shows the one part that would move it most, and you tap it to work on it.",
  ];
  GLOSS.scr_csp = [NV_INFO.csp[0], NV_INFO.csp[1] + " " + NV_INFO.csp[2]];
  GLOSS.scr_audit = [NV_INFO.audit[0], NV_INFO.audit[1] + " " + NV_INFO.audit[2]];
}
if (typeof MENU !== "undefined") {
  MENU.push(["Conscious Spending Plan", "csp", "act", "Your month in four buckets, next to Ramit Sethi's guide"]);
  MENU.push(["Money audit score", "audit", "act", "One score out of 10, built only from your real numbers"]);
}
/* Part of moneyTab() in ui.js. Adds the rows for the spending plan and the money audit, below the card "Key numbers". */
function moneyTabPlanRows(h) {
  try {
    const c = C();
    if (!c) return h;
    const rows = cspMoneyRows(c, D),
      card = typeof knCard === "function" ? knCard(c, D) : "";
    if (card && h.indexOf(card) >= 0) return h.replace(card, () => card + rows);
    const th = typeof tabHead === "function" ? tabHead() : "";
    return th && h.indexOf(th) >= 0 ? h.replace(th, () => th + rows) : h;
  } catch (e) {
    return h;
  }
}

/* Part of coachSheet() in ui.js. Opens the coach view again, with the money audit score of each person below the title. Only real scores show. */
function coachSheetAudit() {
  const f = SH;
  if (typeof f !== "function") return;
  const hd = head("Coach view", "Session prep");
  sheet(() => {
    const h = f(),
      rows = G.chars
        .map(c => {
          const A = audCalc(c);
          return A.score == null
            ? ""
            : `<div class="row between small"><span><b>${esc(c.name)}</b>${A.low ? ": lowest part is " + esc(A.low.n.toLowerCase()) : ""}</span><span class="muted">${A.score.toFixed(1)} of 10</span></div>`;
        })
        .join("");
    return rows && h.indexOf(hd) === 0
      ? hd +
          `<div class="tile stack cpcoach" style="gap:4px"><div class="small"><b>Money audit score</b></div>${rows}</div>` +
          h.slice(hd.length)
      : h;
  });
}
