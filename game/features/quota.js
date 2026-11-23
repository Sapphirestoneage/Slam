/* ============================================================================
   SLAM the Game: features/quota.js
   PURPOSE     Extras for people who love spreadsheets. (1) The savings rate by month, with a streak
               count, in the Yearly Review. (2) Monthly quotas: 1 to 3 targets from presets (save, side
               income, pay off), tracked on the check-in. (3) Next year's budget, built from this year's
               logged actuals, in the Yearly Review.
   INPUT       The profile: c.moves (the money log), c.hist (the monthly snapshots), c.spends, c.x.quota
               (the quotas). The open sheet (W.kind): quota.
   OUTPUT      Functions: quotaRates, quotaStreak, quotaList, quotaProgress, quotaBudget, reviewSheetQuota,
               playTabQuota, quotaSheet, quotaBook. Actions (ACT): quota, quotaadd, quotadel. Parts of
               functions in other files: reviewSheetQuota (reviewSheet in year.js), playTabQuota (playTab
               in ui.js).
   DEPENDS ON  core/engine.js, screens/ui.js, features/year.js, features/moneylog.js (lgSum), features/kit.js.
   RULES       A month with entries in the money log uses them: (in − out) ÷ in. A month with no entries
               uses the snapshot of that month: (take-home − spending) ÷ take-home, and it shows Guess
               unless that snapshot was checked. The streak counts the months in a row, up to this one,
               with a savings rate above 0. A budget line is the average a month of what was logged in
               that category this year, rounded to $10.
   ========================================================================= */
const QUOTA_KINDS = [
  ["save", "Save", [100, 250, 500, 1000, 2000]],
  ["side", "Side income", [100, 250, 500, 1000]],
  ["debt", "Pay off", [100, 250, 500, 1000, 2000]],
];
const QUOTA_MAX = 3;
function quotaX(c) {
  c.x = c.x || {};
  c.x.quota = c.x.quota || { list: [] };
  c.x.quota.list = c.x.quota.list || [];
  return c.x.quota;
}
/* The year-month text of a date: "2026-11". */
function quotaYm(iso) {
  return String(iso).slice(0, 7);
}
/* THE SAVINGS RATE BY MONTH, for the 12 months up to this one. */
function quotaRates(c, today) {
  today = today || todayISO();
  const out = [],
    y = +today.slice(0, 4),
    m = +today.slice(5, 7);
  for (let k = 11; k >= 0; k--) {
    let yy = y,
      mm = m - k;
    while (mm <= 0) {
      mm += 12;
      yy--;
    }
    const ym = yy + "-" + String(mm).padStart(2, "0"),
      L = typeof lgSum === "function" ? lgSum(c, ym) : { n: 0 },
      snap = (c.hist || []).filter(s => quotaYm(s.d) === ym).slice(-1)[0];
    if (L.n && L.in > 0) out.push({ ym, rate: (L.in - L.out) / L.in, from: "log", st: "Close" });
    else if (snap && snap.take > 0)
      out.push({
        ym,
        rate: (snap.take - snap.spend) / snap.take,
        from: "snapshot",
        st: snap.verified ? "Close" : "Guess",
      });
    else out.push({ ym, rate: null, from: "none", st: "Guess" });
  }
  return out;
}
/* The months in a row, up to the last month with a number, with a savings rate above 0. */
function quotaStreak(rates) {
  let n = 0;
  for (let i = rates.length - 1; i >= 0; i--) {
    if (rates[i].rate == null && n === 0 && i === rates.length - 1) continue;
    if (rates[i].rate != null && rates[i].rate > 0) n++;
    else break;
  }
  return n;
}
function quotaList(c) {
  return quotaX(c).list.slice(0, QUOTA_MAX);
}
/* How far each quota is this month, from the money log. */
function quotaProgress(c, today) {
  const ym = quotaYm(today || todayISO()),
    L = typeof lgSum === "function" ? lgSum(c, ym) : { in: 0, out: 0, debt: 0 },
    side = (c.moves || [])
      .filter(
        x =>
          x.d &&
          quotaYm(x.d) === ym &&
          (x.t === "in" || x.t === "extra") &&
          /side|gig/i.test((x.cat || "") + " " + (x.k || "") + " " + (x.note || ""))
      )
      .reduce((a, x) => a + (x.amt || 0), 0);
  return quotaList(c).map(qq => {
    const got = qq.kind === "save" ? Math.max(0, L.in - L.out - L.debt) : qq.kind === "side" ? side : L.debt;
    return Object.assign({}, qq, { got, pct: qq.amt > 0 ? Math.min(1, got / qq.amt) : 0 });
  });
}
/* NEXT YEAR'S BUDGET from this year's logged actuals. */
function quotaBudget(c, today) {
  today = today || todayISO();
  const yr = today.slice(0, 4),
    ms = (c.moves || []).filter(x => x.d && x.d.slice(0, 4) === yr),
    months = Array.from(new Set(ms.map(x => quotaYm(x.d)))).length,
    cats = {};
  ms.forEach(x => {
    if ((typeof LG_KIND !== "undefined" ? LG_KIND[x.t] : x.t) === "out") {
      const k = x.cat || "Not sorted";
      cats[k] = (cats[k] || 0) + (x.amt || 0);
    }
  });
  const plan = {};
  (c.spends || []).forEach(r => (plan[r.k] = r.amt));
  const lines = Object.keys(cats)
    .map(k => ({
      k,
      total: cats[k],
      month: Math.round(cats[k] / Math.max(1, months) / 10) * 10,
      plan: plan[k] == null ? null : plan[k],
    }))
    .sort((a, b) => b.month - a.month);
  return { yr, months, lines, total: lines.reduce((a, l) => a + l.month, 0) };
}
/* Part of reviewSheet() in year.js. "Look back" gets the savings rate by month and the streak.
   "Look ahead" gets next year's budget from this year's logged actuals. */
function reviewSheetQuota(h) {
  try {
    if (!W || W.kind !== "review") return h;
    const c = C();
    if (W.step === 1) {
      const R2 = quotaRates(c),
        s = quotaStreak(R2);
      return (
        h +
        `<div class="tile stack quotarates" style="gap:4px"><div class="row between"><b class="small">Savings rate by month</b><span class="pill info">Streak: ${s} ${s === 1 ? "month" : "months"}</span></div>${igRows(R2.map(r => [esc(lgMonthName(r.ym)), r.rate == null ? "No numbers" : kitPct(r.rate, 0) + (r.st === "Guess" ? " · guess" : "")]))}<div class="tiny muted">A month with money log entries uses them. Other months use the snapshot of that month.</div></div>`
      );
    }
    if (W.step === 5) {
      const B = quotaBudget(c);
      return (
        h +
        `<div class="tile stack quotabudget" style="gap:4px"><b class="small">Next year's budget, from what you logged in ${B.yr}</b>${B.lines.length ? igRows(B.lines.map(l => [esc(l.k), money(l.month) + " a month" + (l.plan != null ? " (plan " + money(l.plan) + ")" : "")])) + `<div class="small">In all: <b>${money(B.total)} a month</b>, from ${B.months} ${B.months === 1 ? "month" : "months"} of entries.</div>` : `<div class="small muted">Nothing logged this year yet, so next year's budget is your plan of today.</div>`}</div>`
      );
    }
  } catch (e) {
    report(e, "quota.js: reviewSheetQuota");
  }
  return h;
}
/* Part of playTab() in ui.js. The quotas of this month, on the check-in. */
function playTabQuota(h) {
  try {
    const c = C(),
      P = quotaProgress(c);
    const card = `<div class="card stack quotacard" style="gap:6px"><div class="row between"><h3>This month's quotas</h3><span class="pill info">${P.length} of ${QUOTA_MAX}</span></div>${P.length ? P.map(p => `<div><div class="row between small"><span>${esc((QUOTA_KINDS.find(k => k[0] === p.kind) || [0, p.kind])[1])}: ${money(p.amt)}</span><span>${money(Math.round(p.got))}${p.pct >= 1 ? " ✓" : ""}</span></div>${bar(p.pct * 100)}</div>`).join("") : `<div class="small muted">Pick 1 to 3 targets for the month. The check-in tracks them from your money log.</div>`}<button class="ghost slim wide" data-a="quota">${P.length ? "Change my quotas" : "Set my quotas"}</button></div>`;
    return h.replace(/<\/div>\s*$/, () => card + "</div>");
  } catch (e) {
    report(e, "quota.js: playTabQuota");
    return h;
  }
}
function quotaSheet() {
  const c = C(),
    L = quotaList(c),
    P = quotaProgress(c);
  return (
    head("Check in", "Monthly quotas") +
    `<div class="small muted">Pick up to ${QUOTA_MAX} targets for this month. Each one tracks itself from your money log.</div>` +
    (P.length
      ? `<div class="stack" style="gap:6px">${P.map((p, i) => `<div class="tile row between small"><span>${esc((QUOTA_KINDS.find(k => k[0] === p.kind) || [0, p.kind])[1])}: ${money(p.amt)} · so far ${money(Math.round(p.got))}</span><button class="ghost slim" data-a="quotadel" data-v="${i}">Remove</button></div>`).join("")}</div>`
      : "") +
    (L.length < QUOTA_MAX
      ? QUOTA_KINDS.map(k =>
          qBase(
            k[1] + " this month",
            `<div class="chips">${k[2].map(v => `<button class="chip" data-a="quotaadd" data-k="${k[0]}" data-v="${v}">${money(v)}</button>`).join("")}</div>`
          )
        ).join("")
      : `<div class="tile small">You have ${QUOTA_MAX} quotas. Remove one to add another.</div>`) +
    mathBox([
      "Save: money in minus money out minus debt payments this month, from the money log.",
      "Side income: money in this month marked as side or gig income.",
      "Pay off: debt payments this month, from the money log.",
    ])
  );
}
function quotaBook(c) {
  const R2 = quotaRates(c),
    B = quotaBudget(c);
  return {
    title: "Savings rate and next year's budget",
    rows: [
      {
        id: "qt_streak",
        label: "Savings rate streak, months in a row above 0",
        v: quotaStreak(R2),
        note: "From the months below",
      },
    ].concat(
      R2.filter(r => r.rate != null).map(r => ({
        id: "qt_" + r.ym.replace("-", "_"),
        label: "Savings rate, " + r.ym,
        v: Math.round(r.rate * 1000) / 1000,
        note: r.from === "log" ? "From the money log" : "From the snapshot",
      })),
      B.lines.map((l, i) => ({
        id: "qt_b" + i,
        label: "Next year's budget: " + l.k + ", a month",
        v: l.month,
        note: "Logged in " + B.yr + " ÷ " + B.months + " months",
      }))
    ),
  };
}
kitScreen(
  "quota",
  "Monthly quotas",
  "Up to three money targets for this month.",
  "The check-in tracks each one from your money log."
);
Object.assign(ACT, {
  quota: () => {
    W = { kind: "quota", o: {} };
    sheet(quotaSheet);
  },
  quotaadd: t => {
    const X = quotaX(C());
    if (X.list.length >= QUOTA_MAX) return;
    X.list.push({ kind: t.dataset.k, amt: +t.dataset.v, d: todayISO() });
    kitRedraw();
  },
  quotadel: t => {
    const X = quotaX(C());
    X.list.splice(+t.dataset.v, 1);
    kitRedraw();
  },
});
