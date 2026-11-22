/* ===== together.js: the Money Chart for more than two. The quiz already compares you with one other person by passing the phone. This adds a room for a whole household: you, your person if they answered, up to four more people who answer the same 10 on this phone, and any other player in this game who has a chart and is tapped in. For each of the five elements it shows one bar per person and a plain line: someone carries it, everyone leans on it, nobody does yet, or you are close. It never ranks people and gives no score. Every added person has a Remove button. State: MCX(c).grp (list of {id}), answers in MCX(c)[id], MCX(c).with (other players tapped in, by name). ===== */
const TG_MAX = 4;
var TGX = { back: false };
function tgPeople(c) {
  const m = MCX(c),
    out = [{ id: "ans", n: c.name && c.name !== "You" ? c.name : "You", ans: m.ans, fixed: true }];
  if (Object.keys(m.their || {}).length >= 10) out.push({ id: "their", n: "Your person", ans: m.their, fixed: true });
  (m.grp || []).forEach((g, i) =>
    out.push({ id: g.id, n: "Person " + (out.length + 1), ans: m[g.id] || {}, guest: true })
  );
  (G.chars || []).forEach((x, i) => {
    if (x === c || G.demo) return;
    const a = x.x && x.x.mc && x.x.mc.ans;
    if (a && mcOf(a).ready)
      out.push({
        id: "prof:" + i,
        n: x.name || "Player " + (i + 1),
        ans: a,
        prof: true,
        on: (m.with || []).includes(x.name),
      });
  });
  return out.map(p => Object.assign(p, { ready: mcOf(p.ans).ready }));
}
function tgIn(c) {
  return tgPeople(c).filter(p => p.ready && (!p.prof || p.on));
}
function tgLine(r, names) {
  const hi = Math.max.apply(null, r.scores),
    top = names.filter((n, i) => r.scores[i] === hi);
  return r.kind === "cover"
    ? top.length > 1
      ? top.slice(0, -1).join(", ") + " and " + top[top.length - 1] + " carry this one for the group."
      : top[0] + " carries this one for the group."
    : r.kind === "doubled"
      ? "Everyone leans hard on this. Watch that it does not run every choice."
      : r.kind === "open"
        ? "Nobody leans on this yet. It is the one to build together."
        : "You are all close on this one.";
}
/* tgText() returns the text of the chart for more than two people, for copy. tgTextBase() is the part from this file. */
function tgText(c) {
  /* addon.js: a text for sharing has the standard look, with nothing from an add-on. */
  if (typeof adPlainText === "function") return adPlainText(() => tgTextBase(c));
  return tgTextBase(c);
}
function tgTextBase(c) {
  const In = tgIn(c),
    Gp = mcGroup(In.map(p => p.ans));
  if (!Gp) return "";
  return ["Our Money Chart, together (" + In.map(p => p.n).join(", ") + ")"]
    .concat(
      Gp.rows.map(
        r =>
          r.name +
          " (" +
          r.word.toLowerCase() +
          "): " +
          r.scores.map((s, i) => In[i].n + " " + s).join(", ") +
          ". " +
          tgLine(
            r,
            In.map(p => p.n)
          )
      )
    )
    .join("\n");
}
function tgSheet() {
  const c = C(),
    m = MCX(c),
    P = tgPeople(c),
    me = P[0],
    In = tgIn(c),
    Gp = In.length >= 2 ? mcGroup(In.map(p => p.ans)) : null,
    guests = P.filter(p => p.guest),
    profs = P.filter(p => p.prof),
    w = W;
  if (w.pass)
    return (
      head("Money Chart", "Pass the phone") +
      `<div class="tile"><h2 style="margin:0">Hand the phone to the next person.</h2></div><div class="small muted">They answer 10 short statements about themselves. It takes about two minutes. Nobody else's answers are shown while they do it.</div>` +
      askBtn("tgstart", "I'm the next person. Start", "primary go") +
      askBtn("tgcancel", "Back one", "ghost slim")
    );
  if (!me.ready)
    return (
      head("Money Chart", "Together") +
      `<div class="tile"><h2 style="margin:0">First, your own 10.</h2></div><div class="small muted">The group view compares everyone's answers to the same 10 statements. Yours come first.</div><button class="primary wide go" data-a="mcstart" data-v="ten">Answer my 10</button>`
    );
  return (
    head("Money Chart", "Together") +
    `<div class="small muted">Everyone answers the same 10. Then you see who leans on what. Nobody is ranked.</div>` +
    `<div class="tile stack" style="gap:6px"><b class="small">Who is in</b>${P.filter(p => !p.prof)
      .map(
        p =>
          `<div class="row between" style="gap:8px"><span class="small">${esc(p.n)}${p.ready ? "" : ` <span class="tiny muted">not finished</span>`}</span>${p.guest ? `<button class="ghost slim" data-a="tgdel" data-v="${p.id}" aria-label="Remove ${esc(p.n)}">✕ Remove</button>` : `<span class="pill okp">In</span>`}</div>`
      )
      .join(
        ""
      )}${profs.map(p => `<div class="row between" style="gap:8px"><span class="small">${esc(p.n)} <span class="tiny muted">another player in this game</span></span><button class="${p.on ? "primary" : "ghost"} slim" data-a="tgwith" data-v="${esc(p.n)}">${p.on ? "In ✓ (tap to take out)" : "Add"}</button></div>`).join("")}${guests.length < TG_MAX ? `<button class="ghost wide slim" data-a="tgadd">+ Add a person on this phone</button>` : ""}</div>` +
    (Gp
      ? `<div class="stack" style="gap:6px">${Gp.rows
          .map(
            r =>
              `<div class="tile stack" style="gap:4px"><div class="row between"><b>${r.name}</b><span class="tiny muted">${r.word}</span></div>${r.scores.map((s, i) => `<div class="tgbar"><span class="tiny">${esc(In[i].n)}</span><div class="bar"><i style="width:${Math.max(3, s)}%"></i></div><span class="tiny">${s}</span></div>`).join("")}<div class="small">${esc(
                tgLine(
                  r,
                  In.map(p => p.n)
                )
              )}</div></div>`
          )
          .join(
            ""
          )}</div><div class="tile small">The widest gap is in <b>${Gp.widest.name}</b>. That is where you see money most differently, and a good first thing to talk about. You are closest on <b>${Gp.closest.name}</b>.</div>` +
        askBtn("tgcopy", w.copied ? "Copied" : "Copy this to share", "ghost")
      : `<div class="tile small">Add at least one more person to see the group view.</div>`) +
    `<button class="ghost wide slim" data-a="chart">My own chart</button>`
  );
}
Object.assign(ACT, {
  together: () => {
    W = { kind: "together" };
    sheet(tgSheet);
  },
  tgadd: () => {
    const c = C(),
      m = MCX(c);
    m.grp = m.grp || [];
    if (m.grp.length >= TG_MAX) return;
    W.pass = true;
    drawSheet();
  },
  tgcancel: () => {
    W.pass = false;
    drawSheet();
  },
  tgstart: () => {
    const c = C(),
      m = MCX(c);
    m.grp = m.grp || [];
    let n = 1;
    while (m.grp.some(g => g.id === "g" + n)) n++;
    const id = "g" + n;
    m.grp.push({ id });
    m[id] = {};
    save();
    TGX.back = true;
    W = { kind: "mcq", depth: "ten", who: id, hist: [], pass: false };
    sheet(mcqSheet);
  },
  tgdel: t => {
    const c = C(),
      m = MCX(c),
      id = t.dataset.v;
    m.grp = (m.grp || []).filter(g => g.id !== id);
    delete m[id];
    save();
    drawSheet();
  },
  tgwith: t => {
    const c = C(),
      m = MCX(c),
      n = t.dataset.v;
    m.with = m.with || [];
    m.with = m.with.includes(n) ? m.with.filter(x => x !== n) : m.with.concat([n]);
    save();
    drawSheet();
  },
  tgcopy: () => {
    try {
      navigator.clipboard.writeText(tgText(C()));
    } catch (e) {}
    W.copied = true;
    drawSheet();
  },
});
(() => {
  const _a = ACT.mcans;
  ACT.mcans = t => {
    const guest = W && W.kind === "mcq" && /^g\d+$/.test(W.who);
    _a(t);
    if (guest && TGX.back && W && W.kind === "chart") {
      TGX.back = false;
      ACT.together();
    }
  };
})();
/* Part of chartSheet() in chart.js. When the chart is ready, adds the button "See it with more than two people". */
function chartSheetTogether(h) {
  const c = C();
  return mcOf(MCX(c).ans).ready
    ? h + `<button class="ghost wide slim" data-a="together">See it with more than two people</button>`
    : h;
}

if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
