/* ============================================================================
   SLAM the Game: features/alloc.js
   PURPOSE     Keep the first guess for each money area, and show how much of the guess is
               placed in real lines and how much is not placed yet.
               Areas: income (take), spending (spend), debt (debt), cash (cash), investments (inv).
   RULES       From the owner, 2026-11-22:
               1. While the real lines add up to less than the guess, the total stays the guess.
                  The rest is "not placed yet" and it is still a guess.
               2. When the real lines add up to more than the guess, the lines are the total.
                  The extra shows as "over your guess" (amber for spending and debt).
               3. The guess is one number.
               4. "That's all of it" removes the part that is not placed yet.
               An area is "done" when no guessed line is left. After that, the lines alone are the
               total, so a debt payment or a closed account does not bring the guess back.
   CAREFUL     When the real lines already pass the guess, the guessed lines that are left keep
               their own amounts for spending and debt (a cost or a debt is not hidden), and they
               are removed for income, cash and investments (money is not counted twice).
               A line with x.h (set by a live session, account/liveland.js) is a Guess that keeps its
               amount: the fill does not change it and does not remove it.
   STATE       c.al[area] = { g: the guess, done: true or false, over: amount, at: date }.
   INPUT       The profile c and its rows: c.incs, c.spends, c.debts, c.cashes, c.invs.
   OUTPUT      allocArea, allocSplit, allocFill, allocFillAll, allocBar.
               Action (ACT): allocall.
   CALLED BY   screens/ui.js afterMoney (allocFillAll), moneyTabBase (allocBar);
               features/ask.js askSheet and askFinish (allocBar, allocFill).
   DEPENDS ON  core/engine.js (rsum, syncAll, todayISO), screens/ui.js (money, esc, ib).
   ========================================================================= */
const ALLOC = {
  take: { rows: "incs", n: "income", over: "more than your guess", warn: false, keep: false },
  spend: { rows: "spends", n: "spending", over: "over your guess", warn: true, keep: true },
  debt: { rows: "debts", n: "debt", over: "more than your guess", warn: true, keep: true },
  cash: { rows: "cashes", n: "cash", over: "more than your guess", warn: false, keep: false },
  inv: { rows: "invs", n: "investments", over: "more than your guess", warn: false, keep: false },
};
const ALLOC_BY_ROWS = { incs: "take", spends: "spend", debts: "debt", cashes: "cash", invs: "inv" };
const ALLOC_OVER_DAYS = 30;

/* The state of one area. It is made the first time it is needed, from the lines of today. */
function allocArea(c, k) {
  c.al = c.al || {};
  const rows = c[ALLOC[k].rows] || [],
    sum = rsum(rows),
    guessed = rows.some(x => !x.s);
  let a = c.al[k];
  if (!a) a = c.al[k] = { g: sum, done: !guessed };
  /* All lines are guesses again (for example, the setup ran again): the new total is the new guess. */
  if (rows.length && rows.every(x => !x.s) && a.g !== sum) {
    a.g = sum;
    a.done = false;
    delete a.over;
  }
  return a;
}

/* The numbers for one area. "rows" can be the rows of an open sheet that are not saved yet. */
function allocSplit(c, k, rows) {
  const a = allocArea(c, k),
    R = rows || c[ALLOC[k].rows] || [],
    placed = R.filter(x => x.s).reduce((t, x) => t + (+x.amt || 0), 0),
    G = a.g || 0;
  return {
    guess: G,
    placed,
    left: a.done ? 0 : Math.max(0, G - placed),
    over: a.done ? a.over || 0 : Math.max(0, placed - G),
    done: !!a.done,
    pct: G > 0 ? Math.round((Math.min(placed, G) / G) * 100) : 0,
  };
}

/* After a change: the guessed lines fill the gap up to the guess, or step aside when the real lines pass it. */
function allocFill(c, k) {
  const A = ALLOC[k],
    a = allocArea(c, k);
  if (a.done) return;
  const rows = c[A.rows] || [],
    /* x.h: a line that a live session set (account/liveland.js). It is a Guess that somebody said, not a
       guess of the game: it keeps its amount, and it is never removed. */
    real = rows.filter(x => x.s || x.h),
    guessed = rows.filter(x => !x.s && !x.h),
    realSum = rsum(real),
    gap = (a.g || 0) - realSum;
  if (!guessed.length) {
    if (rows.some(x => !x.s)) return; /* only heard guesses are left: the area is not done yet */
    a.done = true;
    a.over = Math.max(0, -gap);
    a.at = todayISO();
    return;
  }
  if (gap <= 0) {
    if (!A.keep) {
      c[A.rows] = real;
      a.done = true;
      a.over = -gap;
      a.at = todayISO();
    }
    return;
  }
  const gSum = rsum(guessed);
  if (gSum > 0) {
    let left = gap;
    guessed.forEach((x, i) => {
      const v = i === guessed.length - 1 ? left : Math.round(((x.amt || 0) * gap) / gSum / 10) * 10;
      x.amt = Math.max(0, v);
      left -= x.amt;
    });
  } else {
    guessed[0].amt = gap;
  }
}
function allocFillAll(c) {
  if (!c || !c.led) return;
  Object.keys(ALLOC).forEach(k => allocFill(c, k));
  if (typeof syncAll === "function") syncAll(c);
}

/* The bar. opt.slim: one line for My Money. opt.end: the button "That's all of it". */
function allocBar(c, k, rows, opt) {
  opt = opt || {};
  const A = ALLOC[k],
    s = allocSplit(c, k, rows),
    info = typeof ib === "function" ? ib("gloss:alloc") : "";
  if (s.done) {
    const fresh = s.over > 0 && (c.al[k].at || "") >= addDaysISO(todayISO(), -ALLOC_OVER_DAYS);
    return fresh
      ? `<div class="small alloc ${A.warn ? "fkhot" : "muted"}">${money(s.over)} ${A.over} of ${money(s.guess)}. ${info}</div>`
      : "";
  }
  if (!(s.guess > 0) && !s.placed) return "";
  /* My Money: no bar until something is placed, so an untouched area stays one quiet line */
  if (opt.slim && !(s.placed > 0)) return "";
  const pw = Math.min(100, (s.placed / Math.max(s.guess, s.placed, 1)) * 100),
    left = s.placed > 0 ? `Placed ${money(s.placed)} (${Math.max(1, s.pct)}%)` : "Nothing placed yet",
    right =
      s.over > 0
        ? `<span class="${A.warn ? "fkhot" : ""}">${money(s.over)} ${A.over}</span>`
        : `Not placed yet ${money(s.left)}`,
    /* "That's all of it" only when something is placed: with nothing placed it would set the area to $0 */
    end =
      opt.end && s.left > 0 && s.placed > 0
        ? `<button class="ghost slim" data-a="allocall" data-v="${k}">That's all of it</button>`
        : "";
  return `<div class="alloc stack" style="gap:4px"><div class="tiny">Your ${A.n} guess: <b>${money(s.guess)}</b> ${info}</div><div class="allocbar"><i class="on ${s.over > 0 && A.warn ? "hot" : ""}" style="width:${pw}%"></i></div><div class="row between tiny"><span>${left}</span><span class="muted">${right}</span></div>${end ? `<div class="row" style="justify-content:flex-end">${end}</div>` : ""}</div>`;
}
function addDaysISO(iso, n) {
  return new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);
}

Object.assign(ACT, {
  /* "That's all of it": the part that is not placed yet goes away, and the guess becomes the real total. */
  allocall: t => {
    const k = t.dataset.v,
      A = ALLOC[k],
      c = C();
    if (!A) return;
    const a = allocArea(c, k),
      real = (c[A.rows] || []).filter(x => x.s);
    c[A.rows] = real;
    a.g = rsum(real);
    a.done = true;
    a.over = 0;
    a.at = todayISO();
    const pr = D && D.realm;
    if (typeof afterMoney === "function") afterMoney(c, pr, false);
    else syncAll(c);
    render();
    if (SH) drawSheet();
  },
});
Object.assign(GLOSS, {
  alloc: [
    "Placed and not placed yet",
    'Your first guess stays the total until your real numbers add up to it. Each number you make real is placed. The rest is not placed yet, and it is still a guess. If your real numbers add up to more than the guess, they become the total. Tap "That\'s all of it" when the rest does not exist.',
  ],
});
