/* ============================================================================
   SLAM the Game: features/values.js
   PURPOSE     Is my money going where I want? Three steps, all taps: the three things that matter most,
               two taps for each place where the money goes, and the result.
   INPUT       The profile: c.x.vals. The open sheet (W.kind): values. The taps of the player (the
               actions in OUTPUT).
   OUTPUT      6 functions. Parts of functions in other files: meTabValues. Actions (ACT): values,
               vlstep, vltop, vlserve, vlmark, go. Menu: "Is my money going where I want?".
   DEPENDS ON  core/report.js, core/engine.js, screens/ui.js, screens/planner.js.
   RULES       No verdict.
   SOURCE      The question in step 2 is from Your Money or Your Life (Vicki Robin and Joe Dominguez).
               The money dials are an idea of Ramit Sethi.
   ========================================================================= */
const VL_ALL = [
    "Freedom and time",
    "Security",
    "Family",
    "Friends and community",
    "Health",
    "Adventure and travel",
    "Learning",
    "Home",
    "Creating things",
    "Giving",
    "Fun",
    "Faith",
  ],
  VL_MARKS = [
    ["less", "Want less"],
    ["ok", "Feels right"],
    ["more", "Want more"],
  ];
function vlGet(c) {
  const v = (c.x && c.x.vals) || {};
  return { top: v.top || [], serves: v.serves || {}, marks: v.marks || {}, d: v.d || null };
}
function vlPut(c, patch) {
  c.x = c.x || {};
  c.x.vals = Object.assign(vlGet(c), patch, { d: todayISO() });
  save();
}
function vlRows(c) {
  return (c.led ? c.spends || [] : []).filter(r => (r.amt || 0) > 0);
}
function vlResult(c) {
  const V = vlGet(c),
    rows = vlRows(c),
    tot = rows.reduce((a, r) => a + r.amt, 0),
    done = rows.filter(r => V.marks[r.k] && V.serves[r.k] !== undefined),
    on = rows.filter(r => V.top.includes(V.serves[r.k])).reduce((a, r) => a + r.amt, 0),
    by = {};
  V.top.forEach(t => (by[t] = 0));
  rows.forEach(r => {
    if (by[V.serves[r.k]] !== undefined) by[V.serves[r.k]] += r.amt;
  });
  const less = rows.filter(r => V.marks[r.k] === "less").sort((a, b) => b.amt - a.amt),
    more = rows.filter(r => V.marks[r.k] === "more").sort((a, b) => b.amt - a.amt),
    ok = rows.filter(r => V.marks[r.k] === "ok").reduce((a, r) => a + r.amt, 0),
    starved = V.top.filter(t => !(by[t] > 0));
  return {
    V,
    rows,
    tot,
    complete: rows.length > 0 && done.length === rows.length && V.top.length > 0,
    left: rows.length - done.length,
    on,
    pct: tot > 0 ? Math.round((on / tot) * 100) : 0,
    okPct: tot > 0 ? Math.round((ok / tot) * 100) : 0,
    by,
    less,
    more,
    starved,
    guess: rows.some(r => !r.s),
  };
}
function vlSheet() {
  const c = C(),
    w = W,
    R = vlResult(c),
    V = R.V,
    step = w.step || (V.top.length ? (R.complete ? 3 : 2) : 1);
  const tabs = `<div class="seg" style="align-self:flex-start">${[
    [1, "What matters"],
    [2, "Where it goes"],
    [3, "How it lines up"],
  ]
    .map(x => `<button class="${step === x[0] ? "on" : ""}" data-a="vlstep" data-v="${x[0]}">${x[0]}. ${x[1]}</button>`)
    .join("")}</div>`;
  if (step === 1)
    return (
      head("Me", "Is my money going where I want?") +
      tabs +
      `<div class="small">Pick up to three. Not what should matter. What does.</div><div class="chips">${VL_ALL.map(v => `<button class="chip ${V.top.includes(v) ? "on" : ""}" data-a="vltop" data-v="${v}">${v}</button>`).join("")}</div><div class="tiny muted">${V.top.length} of 3 picked${V.top.length === 3 ? ". Tap one to swap it out." : ""}</div><button class="primary wide go" data-a="vlstep" data-v="2" ${V.top.length ? "" : "disabled"}>Next: where it goes</button>`
    );
  if (step === 2)
    return (
      head("Me", "Is my money going where I want?") +
      tabs +
      (R.rows.length
        ? `<div class="small muted">Two taps on each: what it mostly serves, and how it feels.</div><div class="stack" style="gap:8px">${R.rows
            .map(
              r =>
                `<div class="tile stack" style="gap:6px"><div class="row between"><b>${esc(r.k)}</b><b>${money(r.amt)}</b></div><div class="chips">${V.top
                  .concat(["None of these"])
                  .map(t => {
                    const val = t === "None of these" ? "" : t,
                      on = V.serves[r.k] === val;
                    return `<button class="chip sm ${on ? "on" : ""}" data-a="vlserve" data-k="${esc(r.k)}" data-v="${esc(val)}">${esc(t)}</button>`;
                  })
                  .join(
                    ""
                  )}</div><div class="seg">${VL_MARKS.map(m => `<button class="${V.marks[r.k] === m[0] ? "on" : ""}" data-a="vlmark" data-k="${esc(r.k)}" data-v="${m[0]}">${m[1]}</button>`).join("")}</div></div>`
            )
            .join(
              ""
            )}</div><button class="primary wide go" data-a="vlstep" data-v="3">${R.left ? R.left + " left. See it anyway" : "See how it lines up"}</button>`
        : `<div class="tile small">Add where your money goes in My Money first. Rough numbers are fine.</div><button class="primary wide" data-a="sharp" data-v="spend">Add my spending</button>`)
    );
  const big = R.less[0],
    want = R.more[0],
    star = R.starved[0];
  return (
    head("Me", "Is my money going where I want?") +
    tabs +
    (!R.rows.length || !V.top.length
      ? `<div class="tile small">Do steps 1 and 2 first. It takes about a minute.</div>`
      : `<div class="tile stack" style="gap:4px;text-align:center"><div class="tiny muted">Of what you spend, this much lands on what you said matters${R.guess ? " · <b>Guess</b>" : ""}</div><div class="bignum" data-fid="vl:pct">${R.pct}%</div><div class="small">${money(R.on)} of ${money(R.tot)} a month. ${R.okPct}% of it feels right to you.</div></div>
  <div class="stack" style="gap:6px">${V.top.map(t => `<div><div class="row between small"><span>${esc(t)}</span><b>${money(R.by[t] || 0)}</b></div><div class="kbar" style="margin:4px 0 2px"><i style="width:${R.tot > 0 ? Math.max(2, Math.round(((R.by[t] || 0) / R.tot) * 100)) : 2}%"></i></div></div>`).join("")}</div>
  ${big ? `<div class="tile small"><b>You want less of: ${esc(big.k)}</b> (${money(big.amt)} a month). ${V.top.includes(V.serves[big.k]) ? "It serves something you care about, so the question is how, not whether." : "It is not serving anything on your list."} Moving even ${money(Math.max(10, Math.round((big.amt * 0.1) / 10) * 10))} of it is a start.</div><div class="row" style="gap:8px"><button class="primary slim" style="flex:1" data-a="moves">Try a move</button><button class="ghost slim" style="flex:1" data-a="subs">Find what to cancel</button></div>` : `<div class="tile small">Nothing you want less of. That is rare, and worth noticing.</div>`}
  ${want ? `<div class="tile small"><b>You want more of: ${esc(want.k)}.</b> Permission granted is half of this. Safe to spend will tell you what it trades against.</div><button class="ghost wide slim" data-a="safe">Check what it trades against</button>` : ""}
  ${star ? `<div class="tile small"><b>${esc(star)}</b> is on your list, and none of your spending serves it yet. That can be fine: some things that matter cost nothing. If it is not fine, it could be a goal.</div><button class="ghost wide slim" data-a="kwgo" data-k="go" data-v="goals">Go to My Goals</button>` : ""}
  ${mathBox(["Each place your money goes counts toward the one thing you said it mostly serves.", "The percent is those dollars divided by everything you spend in a month.", "Nothing here is graded. Rent that serves none of your three is fine. It is the price of the rest.", "The question is from Your Money or Your Life: is this spending worth the life it costs you?"])}
  <div class="tiny muted">Last looked at ${V.d ? nice(V.d) : "today"}. Worth another look when life changes.</div>`)
  );
}
Object.assign(ACT, {
  values: () => {
    W = { kind: "values" };
    sheet(vlSheet);
  },
  vlstep: t => {
    W.step = +t.dataset.v;
    drawSheet();
  },
  vltop: t => {
    const c = C(),
      v = t.dataset.v,
      V = vlGet(c);
    if (!VL_ALL.includes(v)) return;
    let top = V.top.slice();
    if (top.includes(v)) top = top.filter(x => x !== v);
    else {
      if (top.length >= 3) return drawSheet();
      top.push(v);
    }
    const serves = Object.assign({}, V.serves);
    Object.keys(serves).forEach(k => {
      if (serves[k] && !top.includes(serves[k])) delete serves[k];
    });
    vlPut(c, { top, serves });
    W.step = 1;
    drawSheet();
  },
  vlserve: t => {
    const c = C(),
      V = vlGet(c),
      s = Object.assign({}, V.serves);
    s[t.dataset.k] = t.dataset.v || "";
    vlPut(c, { serves: s });
    drawSheet();
  },
  vlmark: t => {
    const c = C(),
      V = vlGet(c),
      m = Object.assign({}, V.marks);
    if (!VL_MARKS.some(x => x[0] === t.dataset.v)) return;
    m[t.dataset.k] = t.dataset.v;
    vlPut(c, { marks: m });
    drawSheet();
  },
  go: t => {
    const v = t && t.dataset && t.dataset.v;
    closeSheet();
    go(v || "home");
    setTimeout(() => {
      try {
        go(v || "home");
      } catch (e) {
        report(e, "values.js: go");
      }
    }, 140);
  },
});
/* Part of meTab() in ui.js. Adds the row "Is my money going where I want?" above the row for the character sheet. */
function meTabValues(h) {
  const c = C(),
    R = vlResult(c),
    row = `<button class="rowbtn" data-a="values"><span><b>Is my money going where I want?</b><div class="tiny muted">${R.complete ? R.pct + "% lands on what you said matters" : "Three things that matter, then two taps on each place it goes"}</div></span><span class="caret">›</span></button>`,
    a = '<button class="rowbtn" data-a="reveal">';
  return h.indexOf(a) >= 0 ? h.replace(a, () => row + a) : h.replace(/(<h1>[^<]*<\/h1>)/, m => m + row);
}

if (typeof MENU !== "undefined" && Array.isArray(MENU) && !MENU.some(m => m[1] === "values")) {
  const i = MENU.findIndex(m => m[1] === "safe");
  MENU.splice(i >= 0 ? i + 1 : MENU.length, 0, [
    "Is my money going where I want?",
    "values",
    "act",
    "What matters to you, next to where it goes",
  ]);
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
