/* ============================================================================
   SLAM the Game: features/receipt.js
   PURPOSE     Action receipts and cliffhangers (run Results-first Home, item 3). ONE receipt for every
               finished move and every logged transaction: what moved (net worth, the days closer to FI or
               to debt-free, any key number that changed, a new era), then the next unlock ("2 of 3 to
               unlock Fortress") and the next action with its tap count. When a date moves later, the
               receipt says "Recalculating route" with the new date, never a mistake. The same next action
               ends the finish screens that had only Done or Close.
   INPUT       The profile before the tap (RCP_BASE, kept by the click handler when no sheet is open) and the
               profile now.
   OUTPUT      Math (compositions of the engines, no formula of their own): rcpNums, rcpDiff, rcpTeaser,
               rcpNext, rcpData. Views: rcpHtml, rcpInline, rcpNextRow. Parts of functions in other files:
               rcpTapStart (the click handler in ui.js), celebrateReceipt (celebrateBase in ui.js).
   DEPENDS ON  core/engine.js (derive, ERAS, eraSteps), screens/ui.js (freeAt, celebrate, signed, money,
               mathBox), core/metrics.js (knMetrics), core/frameworks.js (fwLead), features/results.js
               (rsFire, rsDebtFree, rsNextWin), features/debts.js (dbLive), features/kit.js (kitDays),
               screens/dash.js (dkMonth).
   RULES       Every number comes from an existing engine. No verdict words. A later date is "Recalculating
               route" with the new date. The animation runs only when the player has not asked for less
               motion (prefers-reduced-motion, index.html).
   ========================================================================= */
let RCP_BASE = null,
  RCP_MEMO = null;
/* The key numbers this receipt compares, as text and numbers. */
const RCP_METRICS = [
  ["dti", "Debt-to-income"],
  ["save", "Savings rate"],
  ["cushion", "Months of cushion"],
];
/* Part of the click handler in ui.js, before the action. A tap with no sheet open starts a new move: keep the
   profile as it is now, to compare with when the move finishes. */
function rcpTapStart() {
  try {
    if (typeof SH !== "undefined" && SH) return;
    rcpMark();
  } catch (e) {
    report(e, "receipt.js: rcpTapStart");
  }
}
/* Keep the profile as it is now (the "before" of the next receipt). */
function rcpMark() {
  const c = C();
  RCP_BASE = c ? { at: G.active, json: JSON.stringify(c) } : null;
}
/* The numbers of one profile that a receipt compares. */
function rcpNums(c) {
  const d = derive(c),
    M = knMetrics(c, d),
    met = {};
  RCP_METRICS.forEach(x => {
    const m = M.find(y => y.id === x[0]);
    met[x[0]] = m && m.num != null ? { num: m.num, val: m.val } : null;
  });
  let fi = null;
  try {
    fi = freeAt(c);
  } catch (e) {
    report(e, "receipt.js: rcpNums");
  }
  return {
    nw: d.nw,
    era: d.era,
    fi,
    df: dbLive(c).length ? rsDebtFree(c, 0).months : 0,
    met,
  };
}
/* What moved between two sets of numbers (a: before, b: now). fire: the player builds toward FI. */
function rcpDiff(a, b, fire) {
  const out = [];
  if (!a || !b) return out;
  const dn = Math.round(b.nw - a.nw);
  if (Math.abs(dn) >= 1)
    out.push({
      k: "nw",
      label: "Net worth",
      txt: signed(dn),
      up: dn > 0,
      math: "Net worth before " + money(a.nw) + ", now " + money(b.nw) + ".",
    });
  /* the date of the lead: debt-free while below zero, else FI (fwLead, the same pick as the payoff reveal) */
  const lead = fwLead({ worth: b.nw, fire: !!fire }),
    key = lead === "debtfree" ? "df" : "fi",
    what = lead === "debtfree" ? "debt-free" : "FI",
    m0 = a[key],
    m1 = b[key];
  if (m0 != null && m1 != null) {
    const days = kitDays(m0 - m1);
    if (days >= 1)
      out.push({
        k: "days",
        label: "Days closer",
        txt: days.toLocaleString() + (days === 1 ? " day" : " days") + " closer to " + what,
        up: true,
        math:
          (what === "FI"
            ? "Your plan run month by month to FI, before and after: "
            : "The payoff run at today's payments, before and after: ") +
          dkMonth(m0) +
          " then " +
          dkMonth(m1) +
          ".",
      });
    else if (days <= -1)
      out.push({
        k: "days",
        label: "Recalculating route",
        txt: "Recalculating route: " + what + " now " + dkMonth(m1),
        up: false,
        math: "The same run with your new numbers: " + dkMonth(m0) + " then " + dkMonth(m1) + ".",
      });
  } else if (m0 == null && m1 != null)
    out.push({
      k: "days",
      label: "New date",
      txt: (what === "FI" ? "FI date" : "Debt-free date") + " now on the map: " + dkMonth(m1),
      up: true,
      math: "Before, the run had no end date. Now it ends in " + dkMonth(m1) + ".",
    });
  else if (m0 != null && m1 == null)
    out.push({
      k: "days",
      label: "Recalculating route",
      txt: "Recalculating route: " + what + " needs money left each month",
      up: false,
      math: "Before: " + dkMonth(m0) + ". With your new numbers the run has no end date yet.",
    });
  RCP_METRICS.forEach(x => {
    const p = a.met[x[0]],
      q = b.met[x[0]];
    if (p && q && p.val !== q.val)
      out.push({
        k: x[0],
        label: x[1],
        txt: x[1] + " " + p.val + " to " + q.val,
        up: x[0] === "dti" ? q.num < p.num : q.num > p.num,
        math: x[1] + ": the same formula as Key numbers, before and after.",
      });
  });
  if (b.era > a.era)
    out.push({
      k: "era",
      label: "New era",
      txt: "New era: " + ERAS[b.era].n,
      up: true,
      math: ERAS[b.era].gate + ".",
    });
  return out;
}
/* The next unlock: the steps of the next era, done of all ("2 of 3 to unlock Fortress"). */
function rcpTeaser(c, d) {
  d = d || derive(c);
  const nx = d.era + 1;
  if (nx > 9) return null;
  const steps = eraSteps(c, d, nx),
    dn = steps.filter(x => x.done).length,
    nm = typeof eraN === "function" ? eraN(nx) : ERAS[nx].n;
  return steps.length
    ? {
        era: nx,
        n: nm,
        done: dn,
        of: steps.length,
        pct: Math.round((dn / steps.length) * 100),
        txt: dn + " of " + steps.length + " to unlock " + nm,
        gate: ERAS[nx].gate,
      }
    : { era: nx, n: nm, done: 0, of: 0, pct: 0, txt: "Next to unlock: " + nm, gate: ERAS[nx].gate };
}
/* The next action: the next win of Home (rsNextWin), and its tap count (its button starts it: 1 tap). */
function rcpNext(c, d) {
  const w = rsNextWin(c, d || derive(c));
  return { t: w.t, a: w.a, v: w.v == null ? "" : String(w.v), l: w.l || "Start", taps: 1 };
}
/* The whole receipt for the profile now, against RCP_BASE. Kept while the two profiles stay the same. */
function rcpData() {
  const c = C();
  if (!c) return null;
  const now = JSON.stringify(c),
    base = RCP_BASE && RCP_BASE.at === G.active ? RCP_BASE.json : null,
    key = (base || "") + "|" + now;
  if (RCP_MEMO && RCP_MEMO.key === key) return RCP_MEMO.R;
  const d = derive(c),
    fire = rsFire(c),
    lines = base ? rcpDiff(rcpNums(JSON.parse(base)), rcpNums(c), fire) : [];
  const R = { lines, teaser: rcpTeaser(c, d), next: rcpNext(c, d) };
  RCP_MEMO = { key, R };
  return R;
}
/* The receipt: what moved, the next unlock, the next action. */
function rcpHtml(R, o) {
  if (!R) return "";
  o = o || {};
  const L = R.lines,
    T = R.teaser,
    N = R.next;
  return (
    `<div class="rcp" data-fid="rcp:card">` +
    (L.length
      ? `<div class="rcplines">${L.map((x, i) => `<div class="rcpl ${x.up ? "up" : "re"}" style="--i:${i}" data-fid="rcp:${x.k}">${esc(x.k === "nw" ? x.label + " " + x.txt : x.txt)}</div>`).join("")}</div>${mathBox(L.map(x => x.math))}`
      : "") +
    (T
      ? `<div class="rcpteaser" data-fid="rcp:teaser"><div class="row between small"><b>${esc(T.txt)}</b>${T.of ? `<span class="tiny muted">${T.pct}%</span>` : ""}</div>${T.of ? bar(T.pct) : ""}<div class="tiny muted">${esc(T.gate)}</div></div>`
      : "") +
    (N
      ? `<div class="rcpnext" data-fid="rcp:next"><div class="row between tiny"><span class="muted">Up next</span><span class="pill">${N.taps} tap</span></div><b class="small">${esc(N.t)}</b><button class="${o.ghost ? "ghost" : "primary go"} wide" data-a="${esc(N.a)}" data-v="${esc(N.v)}">${esc(N.l)}</button></div>`
      : "") +
    `</div>`
  );
}
/* Part of celebrateBase() in ui.js: the receipt in the place of the old line "Up next". Null: keep that line. */
function celebrateReceipt() {
  try {
    const c = C();
    if (!c || (G.demo && !c.placed)) return null;
    return rcpHtml(rcpData());
  } catch (e) {
    report(e, "receipt.js: celebrateReceipt");
    return null;
  }
}
/* The receipt inside a sheet that shows its own win card (a money win of jobs.js, goalwire.js, careq.js). */
function rcpInline() {
  try {
    const c = C();
    if (!c || (G.demo && !c.placed)) return "";
    return rcpHtml(rcpData(), { ghost: true });
  } catch (e) {
    report(e, "receipt.js: rcpInline");
    return "";
  }
}
/* The end of a finish screen that had only Done or Close: the next action, so no screen is a dead end. */
function rcpNextRow() {
  try {
    const c = C();
    if (!c) return "";
    const N = rcpNext(c, derive(c));
    return `<div class="rcpnext" data-fid="rcp:next"><div class="row between tiny"><span class="muted">Up next</span><span class="pill">${N.taps} tap</span></div><b class="small">${esc(N.t)}</b><button class="primary go wide" data-a="${esc(N.a)}" data-v="${esc(N.v)}">${esc(N.l)}</button></div>`;
  } catch (e) {
    report(e, "receipt.js: rcpNextRow");
    return "";
  }
}
