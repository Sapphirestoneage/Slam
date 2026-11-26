/* ============================================================================
   SLAM the Game: features/values.js
   PURPOSE     Is my money going where I want? Three steps, all taps (UX pass, item 28): rank what matters
               (tap in order, or drag), a "Not important to me" pile and "Add your own"; then one place your
               money goes on each screen: which values it serves, and "Would you change this?" More / Keep it /
               Less with what it costs or frees a month and what it does to the next date; then the result,
               always with one idea and a next button.
   INPUT       The profile: c.x.vals. The open sheet (W.kind): values. The taps of the player (the
               actions in OUTPUT).
   OUTPUT      Math: vlGet, vlServes, vlStep, vlEffect, vlResult, vlSuggest, vlRankMove, vlBook. View: vlSheet.
               Parts of functions in other files: meTabValues. Actions (ACT): values, vlstep, vlgo, vlpile,
               vltop, vlunno, vlrm, vlup, vldown, vlown, vlserve, vlmark, go. Menu: "Is my money going where I want?".
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
    ["more", "More"],
    ["keep", "Keep it"],
    ["less", "Less"],
  ];
/* The stored answers. Old saves: top (up to 3) is the start of the ranking; a serve was one value or "";
   the mark "ok" is now "keep". */
function vlGet(c) {
  const v = (c.x && c.x.vals) || {},
    rank = (v.rank || v.top || []).slice(),
    marks = {};
  Object.keys(v.marks || {}).forEach(k => (marks[k] = v.marks[k] === "ok" ? "keep" : v.marks[k]));
  return {
    rank,
    no: v.no || [],
    own: v.own || [],
    serves: v.serves || {},
    marks,
    d: v.d || null,
    top: rank.slice(0, 3),
  };
}
function vlPut(c, patch) {
  c.x = c.x || {};
  const V = Object.assign(vlGet(c), patch, { d: todayISO() });
  delete V.top;
  c.x.vals = V;
  save();
}
/* What one place serves: null when not answered yet (or each value it served left the ranking), [] for
   "none of these", else the values. */
function vlServes(V, k) {
  const s = V.serves[k];
  if (s === undefined || s === null) return null;
  if (!Array.isArray(s)) return s ? (V.rank.includes(s) ? [s] : null) : [];
  const f = s.filter(x => V.rank.includes(x));
  return s.length && !f.length ? null : f; /* every value it served was taken out: ask again */
}
function vlRows(c) {
  return (c.led ? c.spends || [] : []).filter(r => (r.amt || 0) > 0);
}
/* The step of "Would you change this?": a tenth of the line, to the $10, at least $10. */
function vlStep(amt) {
  return Math.max(10, Math.round((amt * 0.1) / 10) * 10);
}
/* What a change costs or frees a month, and what it does to the next date (timeShift). */
function vlEffect(c, k, mark) {
  const r = (c.spends || []).find(x => x.k === k);
  if (!r || !mark || mark === "keep") return { monthly: 0, line: null };
  const step = vlStep(r.amt),
    monthly = mark === "more" ? step : -step,
    ts = typeof timeShift === "function" ? timeShift(c, { monthly }) : null;
  return { monthly, step, line: ts && typeof shiftLine === "function" ? shiftLine(ts) : null };
}
/* Move a value in the ranking. */
function vlRankMove(c, a, b) {
  const V = vlGet(c);
  vlPut(c, { rank: rkMoveList(V.rank, a, b) });
}
const rkMoveList = (L, a, b) => (typeof rkMove === "function" ? rkMove(L, a, b) : L);
function vlResult(c) {
  const V = vlGet(c),
    rows = vlRows(c),
    tot = rows.reduce((a, r) => a + r.amt, 0),
    top = V.top,
    sv = r => vlServes(V, r.k),
    done = rows.filter(r => sv(r) !== null),
    by = {};
  V.rank.forEach(t => (by[t] = 0));
  rows.forEach(r => {
    const s = sv(r) || [];
    s.forEach(t => (by[t] += r.amt / s.length));
  });
  const onRows = rows.filter(r => (sv(r) || []).some(t => top.includes(t))),
    on = onRows.reduce((a, r) => a + r.amt, 0),
    miss = rows.filter(r => sv(r) !== null && !(sv(r) || []).some(t => top.includes(t))).sort((a, b) => b.amt - a.amt),
    eff = rows.map(r => ({ k: r.k, mark: V.marks[r.k] || null, e: vlEffect(c, r.k, V.marks[r.k]) })),
    change = eff.reduce((a, x) => a + x.e.monthly, 0),
    less = rows.filter(r => V.marks[r.k] === "less").sort((a, b) => b.amt - a.amt),
    more = rows.filter(r => V.marks[r.k] === "more").sort((a, b) => b.amt - a.amt),
    starved = top.filter(t => !(by[t] > 0));
  return {
    V,
    rows,
    tot,
    complete: rows.length > 0 && done.length === rows.length && V.rank.length > 0,
    left: rows.length - done.length,
    on,
    onRows,
    pct: tot > 0 ? Math.round((on / tot) * 100) : 0,
    by,
    miss,
    less,
    more,
    change,
    starved,
    guess: rows.some(r => !r.s),
  };
}
/* The one suggestion of the end screen. Always one line. */
function vlSuggest(R) {
  const t = R.V.top[0],
    m = R.miss[0];
  if (R.less[0])
    return (
      "Start with " +
      R.less[0].k.toLowerCase() +
      ": " +
      money(vlStep(R.less[0].amt)) +
      " a month less there is " +
      money(vlStep(R.less[0].amt) * 12) +
      " a year" +
      (t ? " you could point at " + t.toLowerCase() : "") +
      "."
    );
  if (m && t)
    return (
      m.k +
      " (" +
      money(m.amt) +
      " a month) serves none of your top three. Ask if a little of it could go to " +
      t.toLowerCase() +
      "."
    );
  if (R.starved[0])
    return (
      R.starved[0] + " gets nothing yet. Some things that matter cost nothing. If it should get money, make it a goal."
    );
  return "Your money lines up with what you ranked. Worth another look when life changes.";
}
/* The book of the plan (book.js): the dollars a month that go to each value. */
function vlBook(c) {
  const R = vlResult(c);
  if (!R.V.rank.length) return null;
  return {
    title: "Is my money going where I want",
    rows: R.V.rank
      .map((t, i) => ({
        id: "vl_" + i,
        label: i + 1 + ". " + t + ", a month",
        v: Math.round(R.by[t] || 0),
        note: "Each place split evenly between the values it serves",
      }))
      .concat([
        { id: "vl_on", label: "Spending on your top three, a month", v: R.on },
        { id: "vl_tot", label: "All spending a month", v: R.tot },
      ]),
  };
}
const vlIcon = k => {
  const g = typeof AM_GROUPS !== "undefined" ? AM_GROUPS.find(x => x[0] === k) : null;
  return g ? g[1] : "💸";
};
function vlHead() {
  return head("Me", "Is my money going where I want?");
}
function vlTabs(step) {
  return `<div class="seg" style="align-self:flex-start">${[
    [1, "Rank"],
    [2, "Link"],
    [3, "Result"],
  ]
    .map(x => `<button class="${step === x[0] ? "on" : ""}" data-a="vlstep" data-v="${x[0]}">${x[0]}. ${x[1]}</button>`)
    .join("")}</div>`;
}
function vlSheet() {
  const c = C(),
    w = W,
    R = vlResult(c),
    V = R.V,
    step = w.step || (V.rank.length ? (R.complete ? 3 : 2) : 1);
  if (step === 1) {
    const all = VL_ALL.concat(V.own),
      free = all.filter(v => !V.rank.includes(v) && !V.no.includes(v)),
      pile = !!w.pile;
    return (
      vlHead() +
      vlTabs(1) +
      `<div class="small">What matters most to you? Tap them in order, most first. Not what should matter. What does.</div>
 <div class="seg" style="align-self:flex-start"><button class="${pile ? "" : "on"}" data-a="vlpile" data-v="0">Tap adds to my ranking</button><button class="${pile ? "on" : ""}" data-a="vlpile" data-v="1">Tap puts it in Not important</button></div>
 <div class="chips">${free.map(v => `<button class="chip" data-a="vltop" data-v="${esc(v)}">${esc(v)}</button>`).join("")}${free.length ? "" : `<span class="tiny muted">All placed.</span>`}</div>
 <div class="field"><label class="small" for="vlown">Add your own</label><div class="row" style="gap:8px"><input id="vlown" class="mnfind" type="text" maxlength="30" placeholder="A value in a few words" style="flex:1"><button class="ghost slim" data-a="vlown">Add</button></div></div>
 ${V.rank.length ? `<div class="rkhead">Your ranking</div><div class="rklist">${V.rank.map((v, i) => rkRowV(v, i, V.rank.length)).join("")}</div>` : ""}
 ${V.no.length ? `<div class="rkhead muted">Not important to me</div><div class="chips vlpile">${V.no.map(v => `<button class="chip" data-a="vlunno" data-v="${esc(v)}">${esc(v)} ↩</button>`).join("")}</div>` : ""}
 <button class="primary wide go" data-a="vlstep" data-v="2" ${V.rank.length ? "" : `disabled title="Rank one first"`}>Next: link your spending</button>${V.rank.length ? "" : `<div class="tiny muted">Tap one value to start.</div>`}`
    );
  }
  if (step === 2) {
    if (!R.rows.length)
      return (
        vlHead() +
        vlTabs(2) +
        `<div class="tile small">Add where your money goes in My Money first. Rough numbers are fine.</div><button class="primary wide" data-a="sharp" data-v="spend">Add my spending</button>`
      );
    const i = Math.max(0, Math.min(R.rows.length - 1, w.i || 0)),
      r = R.rows[i],
      s = vlServes(V, r.k),
      mk = V.marks[r.k] || null,
      eff = m => vlEffect(c, r.k, m),
      last = i === R.rows.length - 1;
    const effLine = m => {
      const e = eff(m);
      return m === "keep"
        ? "Stays " + money(r.amt) + " a month."
        : (m === "more"
            ? "Costs about " + money(e.step) + " a month more"
            : "Frees about " + money(e.step) + " a month") + (e.line ? ". " + e.line + "." : ".");
    };
    return (
      vlHead() +
      vlTabs(2) +
      `<div class="tiny muted">Place ${i + 1} of ${R.rows.length}</div><div class="row between"><h2 style="margin:0"><span aria-hidden="true">${vlIcon(r.k)}</span> ${esc(r.k)}</h2><b class="${r.s ? "" : "guess"}">${money(r.amt)} a month</b></div>
 <div class="small">Which of your values does it serve? Tap all that fit.</div>
 <div class="chips">${V.rank.map(t => `<button class="chip ${s && s.includes(t) ? "on" : ""}" data-a="vlserve" data-k="${esc(r.k)}" data-v="${esc(t)}">${esc(t)}</button>`).join("")}<button class="chip ${s && !s.length ? "on" : ""}" data-a="vlserve" data-k="${esc(r.k)}" data-v="">None</button></div>
 <div class="small" style="margin-top:6px"><b>Would you change this?</b></div>
 <div class="seg">${VL_MARKS.map(m => `<button class="${mk === m[0] ? "on" : ""}" data-a="vlmark" data-k="${esc(r.k)}" data-v="${m[0]}">${m[1]}</button>`).join("")}</div>
 <div class="tiny muted">${mk ? effLine(mk) : "More: " + effLine("more").replace(/^Costs/, "costs") + " Less: " + effLine("less").replace(/^Frees/, "frees")}</div>
 <div class="row" style="gap:8px"><button class="ghost slim" style="flex:1" data-a="vlgo" data-v="${i - 1}" ${i === 0 ? "disabled" : ""}>Back</button><button class="primary slim go" style="flex:2" data-a="${last ? "vlstep" : "vlgo"}" data-v="${last ? 3 : i + 1}">${last ? "See the result" : "Next: " + esc(R.rows[i + 1].k)}</button></div>`
    );
  }
  const top = V.top;
  return (
    vlHead() +
    vlTabs(3) +
    (!V.rank.length
      ? `<div class="tile small">Rank what matters first. It takes about a minute.</div><button class="primary wide" data-a="vlstep" data-v="1">Rank what matters</button>`
      : `<div class="tile stack" style="gap:4px;text-align:center"><div class="tiny muted">Of what you spend, this much goes to your top ${top.length === 1 ? "value" : top.length + " values"}${R.guess ? " · <b>Guess</b>" : ""}</div><div class="bignum" data-fid="vl:pct">${R.pct}%</div><div class="small">${money(R.on)} of ${money(R.tot)} a month.${R.left ? " " + R.left + " place" + (R.left === 1 ? "" : "s") + " not linked yet." : ""}</div></div>
  <div class="stack" style="gap:6px">${V.rank.map((t, i) => `<div class="${i >= 3 ? "muted" : ""}"><div class="row between small"><span>${i + 1}. ${esc(t)}</span><b>${money(Math.round(R.by[t] || 0))} a month</b></div><div class="kbar" style="margin:4px 0 2px"><i style="width:${R.tot > 0 ? Math.max(2, Math.round(((R.by[t] || 0) / R.tot) * 100)) : 2}%"></i></div></div>`).join("")}</div>
  <div class="tile small"><b>Where it matches:</b> ${R.onRows.length ? R.onRows.map(r => esc(r.k)).join(", ") : "nothing linked to your top three yet"}.</div>
  <div class="tile small"><b>Where it doesn't:</b> ${R.miss.length ? R.miss.map(r => esc(r.k) + " (" + money(r.amt) + ")").join(", ") : "every place serves something on your top three"}.</div>
  ${R.change ? `<div class="tile small"><b>Your changes:</b> ${R.change < 0 ? "free about " + money(-R.change) + " a month" : "cost about " + money(R.change) + " a month more"}.</div>` : ""}
  <div class="banner small"><b>One idea:</b> ${esc(vlSuggest(R))}</div>
  ${mathBox(["Each place your money goes counts toward the values you said it serves, split evenly between them.", "The percent is the places that serve one of your top three, divided by everything you spend in a month.", "More or less is a tenth of the line, to the nearest $10.", "Nothing here is graded. Rent that serves none of your three is fine. It is the price of the rest.", "The question is from Your Money or Your Life: is this spending worth the life it costs you?"])}
  <button class="primary wide go" data-a="${R.less[0] ? "moves" : "kwgo"}" data-k="go" data-v="goals">${R.less[0] ? "Next: try a move" : "Next: my goals"}</button>
  <div class="tiny muted">Last looked at ${V.d ? nice(V.d) : "today"}. Worth another look when life changes.</div>`)
  );
}
function rkRowV(v, i, n) {
  return typeof rkRow === "function"
    ? rkRow(i + 1, v, { up: "vlup", down: "vldown", rm: "vlrm", i, last: i === n - 1, list: "values", dim: i >= 3 })
    : `<div class="small">${i + 1}. ${esc(v)}</div>`;
}
Object.assign(ACT, {
  values: () => {
    const R = vlResult(C());
    /* the step is set once here, so a tap that ranks a value does not count as moving the screen on */
    W = { kind: "values", step: R.V.rank.length ? (R.complete ? 3 : 2) : 1 };
    sheet(vlSheet);
  },
  vlstep: t => {
    W.step = +t.dataset.v;
    if (W.step === 2) W.i = 0;
    drawSheet();
  },
  vlgo: t => {
    W.step = 2;
    W.i = Math.max(0, +t.dataset.v);
    drawSheet();
  },
  vlpile: t => {
    W.pile = t.dataset.v === "1";
    drawSheet();
  },
  vltop: t => {
    const c = C(),
      v = t.dataset.v,
      V = vlGet(c);
    if (!VL_ALL.includes(v) && !V.own.includes(v)) return;
    let rank = V.rank.filter(x => x !== v),
      no = V.no.filter(x => x !== v);
    if (W.pile) no.push(v);
    else rank.push(v);
    vlPut(c, { rank, no });
    drawSheet();
  },
  vlunno: t => {
    const c = C(),
      V = vlGet(c);
    vlPut(c, { no: V.no.filter(x => x !== t.dataset.v) });
    drawSheet();
  },
  vlrm: t => {
    const c = C(),
      V = vlGet(c);
    vlPut(c, { rank: V.rank.filter(x => x !== t.dataset.v) });
    drawSheet();
  },
  vlup: t => {
    const i = +t.dataset.v;
    vlRankMove(C(), i, i - 1);
    drawSheet();
  },
  vldown: t => {
    const i = +t.dataset.v;
    vlRankMove(C(), i, i + 1);
    drawSheet();
  },
  vlown: () => {
    const el = typeof document !== "undefined" && document.getElementById ? document.getElementById("vlown") : null,
      v = String((el && el.value) || "")
        .trim()
        .slice(0, 30),
      c = C(),
      V = vlGet(c);
    if (v && !VL_ALL.includes(v) && !V.own.includes(v)) vlPut(c, { own: V.own.concat([v]), rank: V.rank.concat([v]) });
    drawSheet();
  },
  vlserve: t => {
    const c = C(),
      V = vlGet(c),
      k = t.dataset.k,
      v = t.dataset.v,
      s = Object.assign({}, V.serves),
      cur = vlServes(V, k) || [];
    s[k] = !v ? [] : cur.includes(v) ? cur.filter(x => x !== v) : cur.concat([v]);
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
    row = `<button class="rowbtn" data-a="values"><span><b>Is my money going where I want?</b><div class="tiny muted">${R.complete ? R.pct + "% goes to your top values" : "Rank what matters, then link each place your money goes"}</div></span><span class="caret">›</span></button>`,
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
