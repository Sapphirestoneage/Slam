/* ============================================================================
   SLAM the Game: features/tally.js
   PURPOSE     The dashboard of My Money in the Tally look (UX pass, items 24 to 27): the four key tiles at
               the top, the big three and where the money goes as the two cards that stay open, and every
               other part in a section that starts closed, each with one line on what it means and "Show the
               math". The money machine leads with the net ("Your money makes you $X a month"), the same in
               hours of your work, and what you would need invested to not need to work. "Is it safe to
               spend this?" waits for goals and bills.
   INPUT       The profile c and the derived numbers d (derive). timeLedger, bigThree, SWR (core/engine.js).
   OUTPUT      Math: tlMachine, tlBig3, safeNeed, tallyBook. Views: tlMachineCard, tlBig3Card, tlWhereCard,
               tlSafeWait. Parts of functions in other files: moneyTabLook (look.js) calls tlBig3Card and
               tlWhereCard; machineCard and big3Card (ui.js) call tlMachineCard and tlBig3Card;
               safeSheetBase (ui.js) calls tlSafeWait.
   DEPENDS ON  core/engine.js, screens/ui.js (money, mathBox, ib), screens/dash.js (dkCard, dkDonut).
   RULES       The math functions return numbers. The views only show them. No red, no verdict words.
   ========================================================================= */

/* ---------- math ---------- */
/* THE MONEY MACHINE: what you own pays you (invested x the safe rate / 12), minus what you owe charges you
   (each debt x its rate / 12). The net in hours of your work: net / your real hourly wage. To not need
   to work: a year of spending / the safe rate (the same rule as the freedom number). */
function tlMachine(c, d) {
  d = d || derive(c);
  const tl = timeLedger(c, d),
    pays = ((c.inv || 0) * SWR) / 12,
    costs = tl.dy / 12,
    net = pays - costs;
  return {
    pays,
    costs,
    net,
    wage: tl.wage,
    hours: tl.wage > 0 ? Math.abs(net) / tl.wage : null,
    need: d.fiSpend / SWR,
    yearSpend: d.fiSpend,
    have: c.inv || 0,
    realPays: !!tl.rm,
    realCosts: !!tl.rd,
  };
}
/* THE BIG THREE: home, getting around and food, each as a share of what you spend and of what comes in. */
function tlBig3(c) {
  const b = bigThree(c),
    spend = Math.max(0, c.spend || 0),
    sh = v => (spend > 0 ? v / spend : 0);
  return {
    rows: b.rows.map(r => ({ k: r.k, amt: r.amt, ofSpend: sh(r.amt), ofTake: c.take > 0 ? r.amt / c.take : 0 })),
    tot: b.tot,
    ofSpend: sh(b.tot),
    ofTake: c.take > 0 ? b.tot / c.take : 0,
    spend,
    take: c.take || 0,
    top: b.top,
    real: isSharp(c, "spend"),
  };
}
/* WHAT "IS IT SAFE TO SPEND THIS?" STILL NEEDS: your goals (or "none for now"), and your bills (home and
   bills and subscriptions put in by you, not the game's stock numbers). An empty list means it can answer. */
function safeNeed(c) {
  const out = [],
    noGoals = !!(c.x && c.x.noGoals),
    bills = (c.spends || []).filter(r => /^(Home|Bills and subscriptions)$/.test(r.k));
  if (!(c.goals || []).some(g => !g.done) && !noGoals) out.push(["goals", "Your goals", "tab", "goals"]);
  if (!bills.length || bills.some(r => !r.s)) out.push(["bills", "Your bills", "sharp", "spend"]);
  return out;
}
/* The spreadsheet of the plan (book.js). */
function tallyBook(c) {
  const M = tlMachine(c),
    B = tlBig3(c);
  return {
    title: "My Money: the money machine and the big three",
    rows: [
      { id: "tl_inv", label: "Invested", v: c.inv || 0 },
      { id: "tl_swr", label: "Safe rate to take out a year", v: SWR },
      { id: "tl_pays", label: "What you own pays you a month", v: M.pays, f: "={tl_inv}*{tl_swr}/12" },
      { id: "tl_costs", label: "What you owe charges you a month", v: M.costs, note: "Each debt x its rate / 12" },
      { id: "tl_net", label: "Your money makes you a month", v: M.net, f: "={tl_pays}-{tl_costs}" },
      { id: "tl_wage", label: "Your real hourly wage", v: M.wage },
      { id: "tl_yspend", label: "A year of spending", v: M.yearSpend },
      { id: "tl_need", label: "Invested to not need to work", v: M.need, f: "={tl_yspend}/{tl_swr}" },
      { id: "tl_spend", label: "Spending a month", v: B.spend },
      { id: "tl_b3", label: "Home, getting around and food a month", v: B.tot },
      {
        id: "tl_b3s",
        label: "The big three, share of spending",
        v: B.ofSpend,
        f: B.spend > 0 ? "={tl_b3}/{tl_spend}" : null,
      },
    ],
  };
}

/* ---------- views ---------- */
const tlPct = v => Math.round(v * 100) + "%";
const tlHrs = h =>
  h == null
    ? null
    : h < 1
      ? Math.max(1, Math.round(h * 60)) + " minutes"
      : (Math.round(h * 10) / 10).toLocaleString() + " hours";
/* The money machine card, net first. */
function tlMachineCard(c, d) {
  const M = tlMachine(c, d),
    g = !(M.realPays && M.realCosts),
    up = M.net >= 0,
    hrs = tlHrs(M.hours),
    mx = Math.max(M.pays, M.costs, 1);
  return `<div class="card stack tlmach"><div class="row between"><h3>Your money machine</h3>${ib("term:machine")}</div>
 <div class="tiny muted">${up ? "Your money makes you" : "Your debts cost you"}</div><div class="big ${g ? "guess" : ""}" data-fid="v:machnet">${money(Math.abs(M.net))} a month</div>
 <div class="small">${hrs ? "That's about " + hrs + " of your work a month." : "Tap your pay in to see it in hours of your work."}${g ? " <b>Guess</b>" : ""}</div>
 <div class="tlmini"><div class="row between tiny"><span>What you own pays you</span><b>+${money(M.pays)}</b></div>${bar((M.pays / mx) * 100)}<div class="row between tiny"><span>What you owe charges you</span><b>-${money(M.costs)}</b></div>${bar((M.costs / mx) * 100)}</div>
 <div class="tile small">Based on your spending, you'd need about <b class="${isSharp(c, "spend") ? "" : "guess"}" data-fid="v:fineed">${money(Math.round(M.need / 1000) * 1000)}</b> invested to not need to work. You have ${money(M.have)} now.</div>
 ${mathBox([
   "Pays you: " +
     money(c.inv || 0) +
     " invested × 4% a year ÷ 12 = " +
     money(M.pays) +
     " a month. 4% is what history says you can take and not run out.",
   "Charges you: each debt × its yearly rate, added up, ÷ 12 = " + money(M.costs) + " a month.",
   "Net: " + money(M.pays) + " − " + money(M.costs) + " = " + (up ? "" : "−") + money(Math.abs(M.net)) + " a month.",
   M.wage > 0
     ? "In hours: " + money(Math.abs(M.net)) + " ÷ your real hourly wage of " + money(M.wage) + " = " + hrs + "."
     : "",
   "$30,000 × 4% = $1,200 a year = $100 a month.",
   "To not need to work: " + money(M.yearSpend) + " a year of spending ÷ 4% = " + money(M.need) + ".",
 ])}
 <button class="ghost wide slim" data-a="grow">Watch a monthly amount grow</button></div>`;
}
/* The big three card: each one's share of what you spend. */
function tlBig3Card(c) {
  if (!(c.spends || []).length) return "";
  const B = tlBig3(c),
    gc = B.real ? "" : "guess",
    sl = shiftLine(timeShift(c, { monthly: -100 }));
  const idx = k => (c.spends || []).findIndex(x => x.k === k);
  return `<div class="card stack tlbig3"><div class="row between"><h3>The big three</h3>${ib("term:big3")}</div><div class="small">Home, getting around and food are <b class="${gc}">${tlPct(B.ofSpend)}</b> of what you spend (${tlPct(B.ofTake)} of what comes in)${B.real ? "" : " · <b>Guess</b>"}.</div>${B.rows
    .map(r =>
      idx(r.k) >= 0
        ? `<button class="rowbtn" data-a="rowedit" data-k="spends" data-v="${idx(r.k)}"><span>${esc(r.k)}</span><span class="row"><b class="${gc}">${money(r.amt)} · ${tlPct(r.ofSpend)}</b><span class="caret">›</span></span></button>`
        : ""
    )
    .join(
      ""
    )}<div class="small">Every <b>$100 a month</b> you spend takes about <b>$30,000</b> invested to cover for good.${sl ? " Trim $100 a month here and " + sl + "." : ""}</div>${mathBox(
    B.rows
      .map(r => r.k + ": " + money(r.amt) + " ÷ " + money(B.spend) + " you spend = " + tlPct(r.ofSpend) + ".")
      .concat([
        "Together: " + money(B.tot) + " ÷ " + money(B.spend) + " = " + tlPct(B.ofSpend) + ".",
        "$100 a month is $1,200 a year. $1,200 ÷ 4% = $30,000.",
      ])
  )}</div>`;
}
/* Where it goes: the spending donut. Each part opens its own lines. */
function tlWhereCard(c) {
  const parts = (c.spends || [])
    .map((x, i) => ({ l: typeof rowName === "function" ? rowName(x, "spends") : x.k, v: x.amt, i }))
    .filter(p => p.v > 0)
    .sort((a, b) => b.v - a.v);
  if (!parts.length) return "";
  return dkCard(
    "Where it goes",
    dkDonut(parts, { label: "Money going out each month", amt: true, act: p => ["rowedit", p.i, "spends"] }),
    { cap: "Tap a part to see and change its lines." }
  );
}
/* Part of safeSheetBase() in ui.js: until the game knows your goals and your bills, the answer waits. */
function tlSafeWait(c) {
  const n = safeNeed(c);
  if (!n.length) return "";
  return `<div class="tile stack" style="gap:6px"><b>This needs a bit more info</b><div class="small">To say what is safe, the game needs ${n.map(x => x[1].toLowerCase()).join(" and ")}. Then it can count what is already promised.</div><div class="row" style="gap:8px;flex-wrap:wrap">${n
    .map(x => `<button class="ghost slim" data-a="${x[2]}" data-v="${x[3]}">Add ${x[1].toLowerCase()}</button>`)
    .join("")}</div></div>`;
}
