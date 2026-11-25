/* ============================================================================
   SLAM the Game: screens/dash.js
   PURPOSE     The one kit of view pieces for the dashboard look (DESIGN.md, "Reference: Tally"): a card,
               stat tiles, a sparkline, grouped bars, an area chart, a donut with its legend, a progress
               bar, a day strip, a pill, and the Time-Money dial. Pure HTML and SVG. Every color comes
               from a CSS variable, so each look and color theme still works.
               Also the small math of a savings goal for the dial (the forward run and the reverse).
   INPUT       Numbers that the math of a feature returns. The views never calculate a money result.
               The open sheet (W): the dial keeps its state in TMD by id.
   OUTPUT      dkCard, dkStatRow, dkTile, dkSpark, dkBars, dkArea, dkDonut, dkProgress, dkDayStrip, dkPill,
               dkCaption, dkMonth, timeMoneyDial, tmdSet, tmdText, tmdDebtSpec, tmdGoalSpec, goalFwd,
               goalExtraFor. Actions (ACT): tmdmark. A listener for the input event of a dial track.
   DEPENDS ON  screens/ui.js (money, esc), features/debts.js (dbPlan, dbExtraFor: called by a dial at run
               time), core/engine.js (todayISO, parseISO).
   RULES       A slider is only for a what-if. Every what-if slider is a Time-Money dial with snap marks.
               A mark out of reach stays, faded, with the trade-off in one line. Never a flat no.
   ========================================================================= */
const DK_COLORS = ["var(--sap)", "var(--good)", "var(--a3)", "var(--warn)", "var(--teal)", "var(--muted)"];
const DK_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* "Mar 2028" for n months from today. */
function dkMonth(n, today) {
  const d = parseISO(today || todayISO()),
    t = new Date(d.getFullYear(), d.getMonth() + Math.round(n || 0), 1);
  return DK_MON[t.getMonth()] + " " + t.getFullYear();
}
function dkCaption(t) {
  return `<div class="dkcap">${esc(t)}</div>`;
}
/* A card that answers one question. o: { cap, cls, right } */
function dkCard(title, body, o) {
  o = o || {};
  return `<div class="card dkcard ${o.cls || ""}">${title ? `<div class="row between dkhead"><span class="dklabel">${esc(title)}</span>${o.right || ""}</div>` : ""}${o.cap ? `<div class="tiny muted">${esc(o.cap)}</div>` : ""}${body}</div>`;
}
/* One stat tile. o: { sub, spark (numbers), guess, act, v } */
function dkTile(label, value, o) {
  o = o || {};
  const inner = `<span class="dklabel">${esc(label)}</span><b class="dknum ${o.guess ? "guess" : ""}">${value}</b>${o.sub ? `<span class="tiny muted">${esc(o.sub)}</span>` : ""}${o.spark && o.spark.length > 1 ? dkSpark(o.spark) : ""}`;
  return o.act
    ? `<button class="dktile" data-a="${o.act}" data-v="${o.v == null ? "" : esc(o.v)}">${inner}</button>`
    : `<div class="dktile">${inner}</div>`;
}
function dkStatRow(tiles) {
  return `<div class="dkstatsw"><div class="dkstats">${tiles.join("")}</div></div>`;
}
/* A tiny line of a few numbers, no axis. */
function dkSpark(vals) {
  const w = 80,
    h = 22,
    lo = Math.min.apply(null, vals),
    hi = Math.max.apply(null, vals),
    r = hi - lo || 1,
    pts = vals.map(
      (v, i) => ((i / (vals.length - 1)) * w).toFixed(1) + "," + (h - 2 - ((v - lo) / r) * (h - 4)).toFixed(1)
    );
  return `<svg class="dkspark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts.join(" ")}" style="fill:none;stroke:var(--good);stroke-width:2"/></svg>`;
}
/* Grouped bars. groups: [{ l: label, v: [a, b] }], names: [name of a, name of b]. */
function dkBars(groups, names) {
  const W = 320,
    H = 120,
    max = Math.max(1, ...groups.flatMap(g => g.v)),
    gw = W / Math.max(1, groups.length),
    bw = Math.min(14, (gw - 8) / 2);
  const bars = groups
    .map(
      (g, i) =>
        g.v
          .map((v, j) => {
            const bh = (v / max) * (H - 18),
              x = i * gw + gw / 2 - bw + j * bw;
            return `<rect x="${x.toFixed(1)}" y="${(H - 16 - bh).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" style="fill:${DK_COLORS[j]}"/>`;
          })
          .join("") + `<text x="${(i * gw + gw / 2).toFixed(1)}" y="${H - 3}" text-anchor="middle">${esc(g.l)}</text>`
    )
    .join("");
  return `<svg class="dkchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(names.join(" and "))} by month">${bars}</svg><div class="dklegend">${names.map((n, j) => `<span><i style="background:${DK_COLORS[j]}"></i>${esc(n)}</span>`).join("")}</div>`;
}
/* An area chart of one series (a balance over time). o: { labels: [first, last], faint: second series } */
function dkArea(vals, o) {
  o = o || {};
  if (!vals || vals.length < 2) return "";
  const W = 320,
    H = 110,
    all = vals.concat(o.faint || []),
    hi = Math.max(...all),
    lo = Math.min(0, ...all),
    span = hi - lo || 1,
    n = Math.max(vals.length, (o.faint || []).length) - 1 || 1,
    y = v => (H - 4 - ((v - lo) / span) * (H - 10)).toFixed(1),
    path = s => s.map((v, i) => (i ? "L" : "M") + ((i / n) * W).toFixed(1) + "," + y(v)).join(" ");
  const base = y(Math.max(lo, Math.min(hi, 0))),
    fill = path(vals) + ` L${(((vals.length - 1) / n) * W).toFixed(1)},${base} L0,${base} Z`;
  return `<svg class="dkchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || "Over time")}">${lo < 0 ? `<line x1="0" x2="${W}" y1="${base}" y2="${base}" style="stroke:var(--line);stroke-width:1"/>` : ""}${o.faint && o.faint.length > 1 ? `<path d="${path(o.faint)}" style="fill:none;stroke:var(--muted);stroke-width:1.5;stroke-dasharray:4 4"/>` : ""}<path d="${fill}" style="fill:var(--sap);opacity:.22"/><path d="${path(vals)}" style="fill:none;stroke:var(--sap);stroke-width:2.5"/></svg>${o.labels ? `<div class="row between tiny muted"><span>${esc(o.labels[0])}</span><span>${esc(o.labels[1])}</span></div>` : ""}`;
}
/* A donut with a legend list. parts: [{ l, v }]. o: { center, sub } */
function dkDonut(parts, o) {
  o = o || {};
  const P = parts.filter(p => p.v > 0),
    tot = P.reduce((t, p) => t + p.v, 0);
  if (!tot) return "";
  const R = 42,
    C2 = 2 * Math.PI * R;
  let off = 0;
  const segs = P.map((p, i) => {
    const len = (p.v / tot) * C2,
      s = `<circle r="${R}" cx="55" cy="55" style="fill:none;stroke:${DK_COLORS[i % DK_COLORS.length]};stroke-width:14" stroke-dasharray="${len.toFixed(2)} ${(C2 - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 55 55)"/>`;
    off += len;
    return s;
  }).join("");
  return `<div class="dkdonut"><svg viewBox="0 0 110 110" width="110" height="110" role="img" aria-label="${esc(o.label || "The mix")}">${segs}${o.center ? `<text x="55" y="58" text-anchor="middle" class="dkdc">${esc(o.center)}</text>` : ""}</svg><div class="dklist">${P.map((p, i) => `<div class="row between small"><span><i style="background:${DK_COLORS[i % DK_COLORS.length]}"></i>${esc(p.l)}</span><b>${Math.round((p.v / tot) * 100)}%</b></div>`).join("")}</div></div>`;
}
function dkProgress(pct, o) {
  o = o || {};
  const p = Math.max(0, Math.min(100, pct || 0));
  return `<div class="dkprog" role="progressbar" aria-valuenow="${Math.round(p)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p.toFixed(1)}%"></i></div>${o.text ? `<div class="row between tiny muted"><span>${esc(o.text)}</span><span>${Math.round(p)}%</span></div>` : ""}`;
}
/* A row of days. days: [{ d: "Mon 3", on: today, mark: "Payday" or "Bill" }] */
function dkDayStrip(days) {
  return `<div class="dkdays">${days.map(x => `<div class="dkday ${x.on ? "on" : ""} ${x.mark ? "mk" : ""}"><span>${esc(x.d)}</span>${x.mark ? `<i>${esc(x.mark)}</i>` : ""}</div>`).join("")}</div>`;
}
function dkPill(t, kind) {
  return `<span class="pill dkpill ${kind || ""}">${esc(t)}</span>`;
}

/* ---------- the math of a savings goal (for the dial) ---------- */
/* Forward: months to reach `need` with `pace` a month plus `extra`. null when nothing goes to it. */
function goalFwd(need, pace, extra) {
  const m = (pace || 0) + (extra || 0);
  if (need <= 0) return { months: 0 };
  return m > 0 ? { months: Math.ceil(need / m) } : { months: null };
}
/* Reverse: the extra a month to reach `need` in `months`, on top of `pace`. Whole dollars, rounded up. */
function goalExtraFor(need, pace, months) {
  months = Math.max(1, Math.round(months));
  return { extra: Math.max(0, Math.ceil(need / months - (pace || 0))), months };
}

/* ---------- THE TIME-MONEY DIAL ---------- */
const TMD = {};
const TMD_TIME = [
  ["pace", "Current pace", 1],
  ["goal", "Your date", 2],
  [12, "1 yr", 3],
  [6, "6 mo", 4],
  [36, "3 yr", 5],
  [24, "2 yr", 6],
  [3, "3 mo", 7],
];
const TMD_MONEY = [25, 50, 100, 250, 500];
/* A dial for the debt payoff. order: the payoff order; free: free to spend a month. */
function tmdDebtSpec(c, order, free, goalMonths) {
  const base = dbPlan(c, order, 0);
  return {
    id: "debt",
    kind: "debt",
    free: Math.max(0, Math.round(free || 0)),
    goalMonths: goalMonths || null,
    base: { months: base.months, interest: base.interest, series: base.series },
    fwd: x => {
      const p = dbPlan(c, order, x);
      return { months: p.months, interest: p.interest, series: p.series };
    },
    rev: m => dbExtraFor(c, order, m, Math.max(5000, (free || 0) * 4)),
  };
}
/* A dial for one savings goal: need is what is left to save, pace is what goes to it a month now. */
function tmdGoalSpec(id, need, pace, free, goalMonths) {
  const b = goalFwd(need, pace, 0);
  return {
    id: "g" + id,
    kind: "goal",
    free: Math.max(0, Math.round(free || 0)),
    goalMonths: goalMonths || null,
    base: { months: b.months },
    fwd: x => goalFwd(need, pace, x),
    rev: m => goalExtraFor(need, pace, m),
  };
}
/* The longest time on the time track: the current pace, or 30 years when there is no end yet. */
function tmdMaxM(s) {
  return Math.max(4, s.base.months || 360);
}
function tmdMaxX(s) {
  return Math.max(600, Math.round((s.free || 0) * 1.25));
}
const tmdPosT = (s, m) => (Math.log(Math.max(1, m)) / Math.log(tmdMaxM(s))) * 1000;
const tmdValT = (s, p) => Math.max(1, Math.min(tmdMaxM(s), Math.round(Math.exp((p / 1000) * Math.log(tmdMaxM(s))))));
const tmdPosX = (s, x) => Math.sqrt(Math.max(0, x) / tmdMaxX(s)) * 1000;
const tmdValX = (s, p) => Math.max(0, Math.round(Math.pow(p / 1000, 2) * tmdMaxX(s)));
/* The marks of both tracks, with their place (0 to 1000), and whether each is in reach. */
function tmdMarks(s) {
  const max = tmdMaxM(s),
    T = [];
  TMD_TIME.forEach(([k, l, pri]) => {
    const m = k === "pace" ? s.base.months || max : k === "goal" ? s.goalMonths : k;
    if (!m || m > max || (k !== "pace" && s.base.months && m >= s.base.months)) return;
    if (k === "goal" && TMD_TIME.some(t => t[0] === m)) return;
    const need = k === "pace" ? { extra: 0 } : s.rev(m);
    T.push({ k: "t", v: m, l: k === "pace" && !s.base.months ? "No end yet" : l, pri, pos: tmdPosT(s, m), need });
  });
  const X = [];
  TMD_MONEY.concat(s.free > 0 ? ["free"] : []).forEach((x, i) => {
    const v = x === "free" ? s.free : x;
    if (v > tmdMaxX(s)) return;
    X.push({
      k: "m",
      v,
      l: x === "free" ? "All free" : "+$" + v,
      pri: x === "free" ? 1 : [5, 4, 2, 3, 6][i],
      pos: tmdPosX(s, v),
    });
  });
  return { T: tmdFit(T), X: tmdFit(X) };
}
/* Keep the marks whose labels fit on a 300px track, the most important first, on two rows: a mark goes on
   the first row where it overlaps nothing, else it is left out. A mark near an end is drawn from that end
   (class l or r), so its label takes room on one side only. */
function tmdSpan(m) {
  const w = ((m.l.length * 7.5 + 22) / 300) * 1000;
  return m.pos < 60 ? [m.pos, m.pos + w] : m.pos > 940 ? [m.pos - w, m.pos] : [m.pos - w / 2, m.pos + w / 2];
}
function tmdFit(list) {
  const rows = [[], []];
  list
    .slice()
    .sort((a, b) => a.pri - b.pri)
    .forEach(m => {
      const a = tmdSpan(m);
      const r = rows.findIndex(row =>
        row.every(k => {
          const b = tmdSpan(k);
          return a[1] + 8 <= b[0] || b[1] + 8 <= a[0];
        })
      );
      if (r >= 0) rows[r].push(Object.assign(m, { row: r }));
    });
  return rows[0].concat(rows[1]).sort((a, b) => a.pos - b.pos);
}
/* Set the dial: by time (months) or by money (extra a month). The other side follows. */
function tmdSet(id, side, v) {
  const s = TMD[id];
  if (!s) return null;
  if (side === "m") {
    const x = Math.max(0, Math.round(v)),
      f = s.fwd(x);
    s.st = { extra: x, months: f.months, interest: f.interest, series: f.series, reach: true };
  } else {
    const m = Math.max(1, Math.round(v)),
      r = s.rev(m);
    if (r) {
      const f = s.fwd(r.extra);
      s.st = { extra: r.extra, months: f.months, interest: f.interest, series: f.series, want: m, reach: true };
    } else s.st = { extra: null, months: m, want: m, reach: false };
  }
  return s.st;
}
/* The one sentence under the dial. */
function tmdText(id) {
  const s = TMD[id],
    st = s && s.st;
  if (!st) return "";
  const free = s.free;
  if (!st.reach)
    return `Done in ${dkMonth(st.months)} needs more than ${money(Math.max(5000, free * 4))} a month. A later date is in reach.`;
  const over = st.extra > free ? ` That is ${money(st.extra - free)} more than your free-to-spend.` : "";
  if (s.kind === "debt") {
    if (!st.extra)
      return s.base.months
        ? `At your current pace you're done in ${dkMonth(s.base.months)}.`
        : "At your current pace the debt does not clear. Add a little extra a month to give it an end.";
    const sooner = s.base.months && st.months != null ? s.base.months - st.months : null;
    return (
      `Pay ${money(st.extra)} more a month and you're done in ${dkMonth(st.months)}` +
      (sooner > 0 ? `, ${sooner} month${sooner === 1 ? "" : "s"} sooner` : "") +
      (s.base.interest > st.interest + 0.5 ? `, saving ${money(s.base.interest - st.interest)} in interest.` : ".") +
      over
    );
  }
  if (!st.extra)
    return s.base.months != null
      ? `At your current pace you reach it in ${dkMonth(s.base.months)}.`
      : "Nothing goes to it yet. Add a little a month to give it a date.";
  const sooner = s.base.months != null && st.months != null ? s.base.months - st.months : null;
  return (
    `Put ${money(st.extra)} more a month toward it and you reach it in ${dkMonth(st.months)}` +
    (sooner > 0 ? `, ${sooner} month${sooner === 1 ? "" : "s"} sooner.` : ".") +
    over
  );
}
/* The trade-off line of a mark out of reach. */
function tmdMarkWhy(s, mk) {
  if (mk.k === "m") return mk.v > s.free ? money(mk.v - s.free) + " more than your free-to-spend" : "";
  if (!mk.need) return "needs more than " + money(Math.max(5000, s.free * 4)) + " a month";
  return mk.need.extra > s.free
    ? "needs " + money(mk.need.extra) + " a month, " + money(mk.need.extra - s.free) + " more than your free-to-spend"
    : "";
}
/* THE VIEW. spec from tmdDebtSpec or tmdGoalSpec. The state stays between draws. */
function timeMoneyDial(spec) {
  const old = TMD[spec.id];
  TMD[spec.id] = spec;
  if (spec.start) {
    if (spec.start.t) tmdSet(spec.id, "t", spec.start.t);
    else tmdSet(spec.id, "m", spec.start.m || 0);
  } else if (old && old.st && old.free === spec.free) {
    spec.st = null;
    if (old.st.reach) tmdSet(spec.id, "m", old.st.extra || 0);
    else tmdSet(spec.id, "t", old.st.want);
  } else tmdSet(spec.id, "m", 0);
  return `<div class="tmd" id="tmd-${spec.id}">${tmdInner(spec)}</div>`;
}
function tmdInner(s) {
  const st = s.st,
    M = tmdMarks(s),
    pT = st.months != null ? tmdPosT(s, st.months) : 1000,
    pX = st.extra != null ? tmdPosX(s, st.extra) : 1000,
    marks = (list, cur) =>
      `<div class="tmdmarks ${list.some(mk => mk.row) ? "two" : ""}">${list
        .map(mk => {
          const why = tmdMarkWhy(s, mk),
            at = mk.pos < 60 ? "l" : mk.pos > 940 ? "r" : "";
          return `<button class="tmdmk ${at} ${why ? "far" : ""} ${Math.abs(cur - mk.pos) < 4 ? "on" : ""}" style="left:${(mk.pos / 10).toFixed(1)}%;top:${mk.row ? 36 : 0}px" data-a="tmdmark" data-k="${s.id}" data-v="${mk.k}:${mk.v}"${why ? ` title="${esc(why)}"` : ""}>${esc(mk.l)}</button>`;
        })
        .join("")}</div>`;
  const far = M.T.concat(M.X).filter(mk => tmdMarkWhy(s, mk) && Math.abs((mk.k === "t" ? pT : pX) - mk.pos) < 4);
  return (
    `<div class="tmdtrack"><div class="row between"><span class="dklabel">Done in</span><b>${st.months != null ? dkMonth(st.months) : "No end yet"}</b></div>` +
    `<input type="range" class="tmdr" min="0" max="1000" step="1" value="${Math.round(pT)}" data-d="${s.id}" data-t="t" aria-label="Done in">` +
    marks(M.T, pT) +
    `</div><div class="tmdtrack"><div class="row between"><span class="dklabel">Extra each month</span><b>${st.extra != null ? "+" + money(st.extra) : "Out of reach"}</b></div>` +
    `<input type="range" class="tmdr" min="0" max="1000" step="1" value="${Math.round(pX)}" data-d="${s.id}" data-t="m" aria-label="Extra each month">` +
    marks(M.X, pX) +
    `</div><div class="small tmdsay">${esc(tmdText(s.id))}</div>` +
    (far.length
      ? `<div class="tiny muted">${esc(far.map(mk => mk.l + ": " + tmdMarkWhy(s, mk)).join(". "))}.</div>`
      : "") +
    (s.kind === "debt" && st.series
      ? `<div class="tmdchart">${dkArea(st.series, { faint: s.base.series, labels: ["Today", st.months != null ? dkMonth(st.months) : ""], label: "What you owe over time" })}</div>`
      : "")
  );
}
/* Drag: snap within a few pixels of a mark, then set the dial and paint it again in place. */
function tmdDrag(el) {
  const id = el.dataset.d,
    s = TMD[id];
  if (!s) return;
  let p = +el.value;
  const M = tmdMarks(s),
    list = el.dataset.t === "t" ? M.T : M.X,
    near = list.find(mk => Math.abs(mk.pos - p) <= 15);
  if (near) p = near.pos;
  if (el.dataset.t === "t") tmdSet(id, "t", tmdValT(s, p));
  else tmdSet(id, "m", near ? near.v : tmdValX(s, p));
  const box = typeof document !== "undefined" && document.getElementById ? document.getElementById("tmd-" + id) : null;
  if (!box) return;
  const keep = el.dataset.t;
  box.innerHTML = tmdInner(s);
  const again = box.querySelector(`.tmdr[data-t="${keep}"]`);
  if (again && again.focus) again.focus();
}
/* session.html loads this file with no game screens (no ACT): the kit works there, the dial taps do not */
if (typeof ACT !== "undefined")
  Object.assign(ACT, {
    tmdmark: t => {
      const id = t.dataset.k,
        p = String(t.dataset.v).split(":");
      const st = tmdSet(id, p[0], +p[1]);
      if (id === "debt" && W && st) {
        W.extra = st.reach ? st.extra : W.extra;
        W.tmdWant = st.reach ? null : st.want;
      }
      if (typeof drawSheet === "function" && typeof SH !== "undefined" && SH) drawSheet();
      else if (typeof render === "function") render();
    },
  });
if (typeof document !== "undefined" && document.addEventListener)
  document.addEventListener("input", e => {
    const el = e.target;
    if (el && el.classList && el.classList.contains("tmdr")) {
      try {
        tmdDrag(el);
      } catch (x) {
        report(x, "dash.js: tmdDrag");
      }
    }
  });
