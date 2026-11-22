/* ============================================================================
   SLAM the Game: features/session.js
   PURPOSE     Make a first coaching session fast.
               1. "Bring these to our call": a short list the client opens before the call, with a
                  message the coach copies and sends.
               2. "Fast picture": one screen, one tap for each money area (6 taps). The client's own
                  rough totals replace the typical guesses. The detail comes later, one line at a time.
   RULES       Taps only. A fast-picture total is still a guess (Guess status), because it is a rough
               total and not the real lines. It becomes the first guess in features/alloc.js, so the
               bar "Placed / Not placed yet" starts from the client's own number.
               An area that already has real lines is not changed.
   INPUT       The profile c. The open sheet (W.kind): session.
   OUTPUT      ssFastSet, ssSheet. Actions (ACT): session, ssopen, sstab, ssfast, sscopy.
               Menu: "Coaching session".
   DEPENDS ON  core/engine.js (syncAll, rsum), screens/ui.js (afterMoney, money, head, ib),
               features/alloc.js (allocArea), features/ask.js (openSharp), features/import.js (import2).
   ========================================================================= */
const SS_BRING = [
  ["bank", "Your bank app", "For what comes in each month and what is in checking and savings."],
  ["cards", "Your credit card apps", "For what you owe on each card, and the rate (APR)."],
  ["pay", "Your last pay stub", "For your take-home pay, and what goes to your retirement plan."],
  ["loans", "Any loan accounts", "Car, student or personal loans: what you still owe."],
  ["retire", "Your 401(k), 403(b) or IRA login", "For what you have saved for later."],
  ["rent", "Your rent or mortgage amount", "The biggest number in most budgets."],
];
const SS_AREAS = [
  ["take", "What comes in each month, after taxes", "take", "incs", "A main job"],
  ["spend", "What goes out each month, all in", "spend", "spends", null],
  ["cash", "Cash in checking and savings, together", "cash", "cashes", "Checking"],
  ["inv", "Saved for later (401(k), IRA, investing)", "inv", "invs", "Retirement account"],
  ["debt", "All debt together (cards, loans)", "debt", "debts", "Credit card"],
];
function ssMsg() {
  return (
    "Before our call, please have these open on your phone:\n" +
    SS_BRING.map(b => "- " + b[1] + ": " + b[2]).join("\n") +
    "\nRough numbers are fine. We will make them exact together."
  );
}
/* Set the rough total for one area. The guessed lines are scaled to the total. Real lines are not changed. */
function ssFastSet(c, k, v) {
  const A = SS_AREAS.find(a => a[0] === k);
  if (!A) return false;
  const rows = c[A[3]] || [];
  if (rows.some(x => x.s)) return false;
  if (!rows.length && v > 0) {
    if (!A[4]) return false;
    const r = { k: A[4], amt: v, s: false };
    if (k === "debt") Object.assign(r, { high: true, was: v });
    rows.push(r);
    c[A[3]] = rows;
  } else {
    const sum = rsum(rows);
    let left = v;
    rows.forEach((x, i) => {
      const a = i === rows.length - 1 ? left : sum > 0 ? Math.round(((x.amt || 0) * v) / sum / 10) * 10 : 0;
      x.amt = Math.max(0, a);
      if (k === "debt") x.was = x.amt;
      left -= x.amt;
    });
  }
  if (typeof allocArea === "function") {
    const a = allocArea(c, k);
    a.g = v;
    a.done = false;
    delete a.over;
  }
  c.fast = c.fast || {};
  c.fast[k] = v;
  return true;
}
function ssSheet() {
  const c = C(),
    tab = W.tab || "fast",
    I = typeof ib === "function" ? ib("gloss:fastpic") : "";
  let h =
    head("Coaching session", "Get the full picture fast " + I) +
    `<div class="seg"><button class="${tab === "fast" ? "on" : ""}" data-a="sstab" data-v="fast">Fast picture</button><button class="${tab === "bring" ? "on" : ""}" data-a="sstab" data-v="bring">Bring these to our call</button></div>`;
  if (tab === "bring")
    return (
      h +
      `<div class="small">Send this before the call. With these open, a first session takes about 15 to 20 minutes instead of 45.</div><div class="tile stack" style="gap:6px">${SS_BRING.map(b => `<div><b>${esc(b[1])}</b><div class="tiny muted">${esc(b[2])}</div></div>`).join("")}</div><button class="primary wide" data-a="sscopy">${W.copied ? "Copied ✓" : "Copy the message to send"}</button><div class="tiny muted">Rough numbers are fine. The game marks them as guesses until they are made exact.</div>`
    );
  const n = SS_AREAS.filter(a => c.fast && c.fast[a[0]] != null).length;
  h += `<div class="small">One tap for each area, with the client's own rough number. That gives the whole picture in about a minute. The detail comes after, one line at a time.</div><div class="row between tiny muted"><span>${n} of ${SS_AREAS.length} set</span><span>${SS_AREAS.length - n} left</span></div>`;
  /* One area open at a time. An answered area folds to one line. The next open area is the first one not set. */
  const unset = SS_AREAS.filter(a => !(c.fast && c.fast[a[0]] != null) && !(c[a[3]] || []).some(x => x.s)),
    open = W.open !== undefined ? W.open : unset.length ? unset[0][0] : null;
  SS_AREAS.forEach(a => {
    const rows = c[a[3]] || [],
      real = rows.some(x => x.s),
      cur = c.fast && c.fast[a[0]],
      rs = (RANGES[a[2]] || []).filter(r => !(a[0] === "take" && r[0] < 500));
    if (a[0] !== open || real)
      h += `<button class="rowbtn" data-a="ssopen" data-v="${a[0]}" ${real ? "disabled" : ""}><span style="min-width:0"><b>${esc(a[1])}</b></span><span class="row" style="gap:8px"><b class="${real || cur != null ? "" : "guess"}">${real ? "Real already ✓" : cur != null ? money(rsum(rows)) : "Not set"}</b>${real ? "" : `<span class="fkgo">${cur != null ? "Change" : "Set"}</span>`}</span></button>`;
    else
      h += `<div class="tile stack" style="gap:6px"><b>${esc(a[1])}</b><div class="chips">${(a[0] === "debt"
        ? [[0, "None"]]
        : []
      )
        .concat(rs)
        .map(
          r =>
            `<button class="chip ${cur === r[0] ? "on" : ""}" data-a="ssfast" data-k="${a[0]}" data-v="${r[0]}">${esc(r[1] || money(r[0]))}</button>`
        )
        .join("")}</div></div>`;
  });
  h +=
    `<div class="small"><b>Then, to make it exact</b></div>` +
    `<button class="${n >= SS_AREAS.length ? "primary" : "ghost"} wide" data-a="sharp" data-v="take">Make the numbers real, one tap each</button>` +
    `<button class="ghost wide slim" data-a="import2">Fill in spending from a statement file</button>`;
  return h;
}
Object.assign(ACT, {
  session: t => {
    W = { kind: "session", tab: (t && t.dataset && t.dataset.v) || "fast", open: undefined };
    sheet(ssSheet);
  },
  ssopen: t => {
    W.open = W.open === t.dataset.v ? null : t.dataset.v;
    drawSheet();
  },
  sstab: t => {
    W.tab = t.dataset.v;
    W.copied = false;
    drawSheet();
  },
  ssfast: t => {
    const c = C(),
      k = t.dataset.k,
      v = +t.dataset.v;
    if (!ssFastSet(c, k, v)) return;
    /* move on to the next area that is not set */
    const nx = SS_AREAS.find(q => q[0] !== k && !(c.fast && c.fast[q[0]] != null) && !(c[q[3]] || []).some(x => x.s));
    W.open = nx ? nx[0] : null;
    const pr = D && D.realm;
    if (typeof afterMoney === "function") afterMoney(c, pr, false);
    else syncAll(c);
    render();
    drawSheet();
  },
  sscopy: () => {
    const done = () => {
      W.copied = true;
      drawSheet();
    };
    try {
      navigator.clipboard.writeText(ssMsg()).then(done, done);
    } catch (e) {
      if (typeof report === "function") report(e, "session.js: sscopy");
      done();
    }
  },
});
Object.assign(GLOSS, {
  fastpic: [
    "Fast picture",
    "One rough total for each money area, from the client. It is still a guess, but it is the client's own guess, so the whole picture is close from the first minute. Then each area is made exact, one line at a time.",
  ],
});
MENU.push([
  "Coaching session",
  "session",
  "act",
  "Get a client's full picture fast: a list to send, and one tap for each area",
]);
