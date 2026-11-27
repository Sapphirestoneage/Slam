/* ============================================================================
   SLAM the Game: features/hard.js
   PURPOSE     Hard moments (run Not built, groups 1 to 5, Part 7). One sheet in the new look with eight
               tools: untangling after a breakup or a divorce, a roommate moving out, the first 90 days
               after a death, when a partner has died, words for medical bills, saying no to lending,
               after a fire, a flood or an eviction notice, and a money plan kept private (financial
               abuse safety planning). Each tool has a dated list of who can help. Leave this page
               (a button, or Shift three times) blanks the game and goes to a weather site at once.
   INPUT       The open sheet (W.kind): hard, with W.tab and W.o (the answers while nothing is kept).
               The profile: c.x.hard[tool] = { keep: true, coach, ...answers }, only when the player
               turned on Keep this. HM_REF and the math (core/hardcore.js), rowShare (core/trip.js),
               QZ_SKINS (data/quizskins.js: the pause line and the 72-hour rule of the money sins).
   OUTPUT      Functions: hmKept, hmGet, hmPut, hmLeave, hmLines, hmSteps, hmScripts, hmPause,
               hmKeepCard, hmUntangleBody, hmRoomBody, hmToolBody, hardSheet, trHardRow, hmBook.
               Actions (ACT): hard, hmtab, hmset, hmtick, hmadd, hmdel, hmkeep, hmcoach, hmexit.
               Menu: "Hard moments".
   DEPENDS ON  core/hardcore.js, core/trip.js (rowShare), data/quizskins.js, screens/ui.js (esc, head,
               money, save, drawSheet, sheet, mathBox), screens/dash.js (dkCaption, dkCard, dkStatRow,
               dkTile, dkPill), features/kit.js (kitMenu, kitScreen), features/exletter.js
               (exLetterMine: is the person at the screen the owner of this game).
   RULES       Nothing is kept unless the player turns on Keep this: the answers live in W.o and are
               gone when the sheet closes. Kept, a tool is still private: a coach or an admin who opens
               this game sees it only when the player turned on Let my coach see this. No red, no
               verdict words; scripts are words to copy, never pressure. Every phone number comes from
               HM_REF, each with its source and date. The math is in core/hardcore.js.
   ========================================================================= */
const HM_TABS = [
  ["untangle", "Untangle"],
  ["roomexit", "Roommate"],
  ["grief", "A death"],
  ["widow", "Partner died"],
  ["medical", "Medical bills"],
  ["sayno", "Saying no"],
  ["crisis", "Fire, flood, eviction"],
  ["safety", "Private plan"],
];
const HM_UT_TAPS = [
  ["Joint checking", "have"],
  ["Joint savings", "have"],
  ["A credit card", "owe"],
  ["A car loan", "owe"],
  ["The car", "have"],
  ["A mortgage", "owe"],
  ["The home", "have"],
  ["A lease deposit", "have"],
];
const HM_PICKS = {
  amount: [500, 1000, 5000, 10000, 25000],
  rent: [1800, 2500, 3200, 4000],
  bills: [0, 100, 200, 350],
  people: [2, 3, 4],
  monthsLeft: [1, 3, 6, 9, 12],
  cover: [0, 1, 2, 3],
  deposit: [0, 1500, 2500, 4000],
  damage: [0, 100, 300, 600],
  size: [80, 100, 130, 160],
  arrived: [5000, 10000, 25000, 50000, 100000],
  spending: [2000, 3000, 4000, 5000],
  balance: [500, 1000, 2500, 5000, 10000],
  monthly: [25, 50, 100, 200],
  offer: [250, 500, 1000, 2500],
  asked: [100, 250, 500, 1000],
  gift: [0, 25, 50, 100],
};
/* The kept copy of a tool, or null. */
function hmKept(c, tool) {
  const k = c && c.x && c.x.hard && c.x.hard[tool];
  return k && k.keep === true ? k : null;
}
/* The answers of a tool: the kept copy, else the answers on the screen (W.o). */
function hmGet(c, tool) {
  const k = hmKept(c, tool);
  if (k) return k;
  W.o = W.o || {};
  return W.o[tool] || {};
}
/* Change the answers. Kept: in the profile, saved. Not kept: on the screen only. */
function hmPut(c, tool, patch) {
  const k = hmKept(c, tool);
  if (k) {
    c.x.hard[tool] = Object.assign({}, k, patch);
    save();
  } else {
    W.o = W.o || {};
    W.o[tool] = Object.assign({}, W.o[tool] || {}, patch);
  }
}
/* Leave this page: blank the game at once, then go to a neutral site in place of this page (Back skips it). */
function hmLeave() {
  try {
    document.body.innerHTML = "";
    document.title = "Weather";
  } catch (e) {
    report(e, "hard.js: hmLeave");
  }
  location.replace(HM_REF.exit.to);
}
const hmDate = d =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
const hmSrc = x =>
  `<div class="tiny muted">Source: <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.source)}</a>. Checked ${esc(hmDate(x.checked || HM_REF.checked))}.</div>`;
/* Who can help: the dated lines of a tool. A number is a link that dials. */
function hmLines(keys, title) {
  const rows = keys
    .map(k => HM_REF.lines[k])
    .filter(Boolean)
    .map(
      L =>
        `<div class="row between wrap" style="gap:8px;padding:8px 0;border-top:1px solid var(--line)"><div style="flex:1;min-width:180px"><b class="small">${esc(L.name)}</b><div class="tiny muted">${esc(L.what)}</div>${L.text || L.chat ? `<div class="tiny muted">${esc([L.text, L.chat].filter(Boolean).join(". "))}</div>` : ""}<a class="tiny" href="${esc(L.url)}" target="_blank" rel="noopener">Their own page</a></div>${L.call ? `<a class="btn slim" role="button" href="tel:${esc(L.call.replace(/[^\d]/g, ""))}">Call ${esc(L.call)}</a>` : ""}</div>`
    )
    .join("");
  return dkCard(
    title || "Who can help",
    rows +
      `<div class="tiny muted" style="margin-top:6px">Checked on ${esc(hmDate(HM_REF.checked))}, each on the organization's own page. Numbers can change, so the link goes to their page.</div>`
  );
}
/* The steps, grouped by when, each a tap. */
function hmSteps(c, tool, items, title) {
  const A = hmGet(c, tool),
    t = A.ticks || {},
    K = hmChecklist(items, t);
  const groups = K.groups
    .map(
      g =>
        `<div class="tiny muted" style="margin-top:8px">${esc(HM_REF.when[g.when] || "Next")} · ${g.done} of ${g.of}</div>` +
        items
          .filter(i => (i.when || null) === g.when)
          .map(
            i =>
              `<div class="row between" style="gap:8px;padding:6px 0;border-top:1px solid var(--line)"><div style="flex:1"><div class="small">${esc(i.text)}</div>${i.fact && HM_REF.facts[i.fact] ? `<div class="tiny muted">${esc(HM_REF.facts[i.fact].text)}</div>${hmSrc(HM_REF.facts[i.fact])}` : ""}</div><button class="chip ${t[i.id] ? "on" : ""}" data-a="hmtick" data-k="${esc(tool)}" data-v="${esc(i.id)}">${t[i.id] ? "✓ Done" : "Done"}</button></div>`
          )
          .join("")
    )
    .join("");
  return dkCard(
    title || "What to do, and when",
    `<div class="small">${K.all ? "Every step is ticked. That is the list done." : K.next ? K.done + " of " + K.of + " done. Next: " + esc(K.next.text) : ""}</div>` +
      groups
  );
}
/* Words to copy, with the player's numbers in them. */
function hmScripts(list, vals) {
  return dkCard(
    "Words to use",
    `<div class="tiny muted">Words to copy or read out, never a script you have to follow.</div>` +
      list
        .map(
          s =>
            `<details style="margin-top:8px"><summary class="small"><b>${esc(s.title)}</b></summary><div class="tiny muted">${esc(s.who)}</div>${s.say.map(t => `<div class="small" style="margin:4px 0">"${esc(hmFill(t, vals))}"</div>`).join("")}${s.note ? `<div class="tiny muted">${esc(s.note)}</div>` : ""}</details>`
        )
        .join("")
  );
}
/* The pause line or the 72-hour rule, from the money sins read: one set of these words. */
function hmPause(which) {
  const sk = typeof QZ_SKINS !== "undefined" ? QZ_SKINS.find(s => s.id === "sins") : null,
    f = sk && sk.read && sk.read.fix && sk.read.fix[which];
  return f ? dkCard("First: " + f.name, `<div class="small">${esc(f.how)}</div>`) : "";
}
/* Keep this: off by default. */
function hmKeepCard(c, tool) {
  const k = hmKept(c, tool);
  return dkCard(
    "Keep this?",
    `<div class="row between wrap" style="gap:8px"><span class="small">Keep this in my game</span><div class="seg"><button class="${k ? "" : "on"}" data-a="hmkeep" data-k="${tool}" data-v="0">Off</button><button class="${k ? "on" : ""}" data-a="hmkeep" data-k="${tool}" data-v="1">On</button></div></div>` +
      `<div class="tiny muted">${k ? "Kept in your game, on this device and in your account. Turn it off to take it away again." : "Off: nothing here is saved. Close this and it is gone."}</div>` +
      (k
        ? `<div class="row between wrap" style="gap:8px;margin-top:8px"><span class="small">Let my coach see this</span><div class="seg"><button class="${k.coach ? "" : "on"}" data-a="hmcoach" data-k="${tool}" data-v="0">Off</button><button class="${k.coach ? "on" : ""}" data-a="hmcoach" data-k="${tool}" data-v="1">On</button></div></div><div class="tiny muted">Off: kept for you alone.</div>`
        : "")
  );
}
const hmChip = (tool, k, v, on, label) =>
  `<button class="chip sm ${on ? "on" : ""}" data-a="hmset" data-k="${esc(tool + "|" + k)}" data-v="${esc(String(v))}">${esc(label)}</button>`;
const hmAsk = (tool, A, k, label, picks, word) =>
  `<div class="tiny muted" style="margin-top:6px">${esc(label)}</div><div class="chips">${picks.map(v => hmChip(tool, k, v, A[k] === v, word ? word(v) : money(v))).join("")}</div>`;
/* Untangling: the list, who ends up with what, and what stays in both names. */
function hmUntangleBody(c) {
  const A = hmGet(c, "untangle"),
    items = A.items || [],
    U = hmUntangle(items, { share: 0.5 });
  const row = (it, i) =>
    `<div style="border-top:1px solid var(--line);padding:6px 0"><div class="row between"><b class="small">${esc(it.name)}${it.kind === "owe" ? " (owed)" : ""}</b><button class="ghost slim" data-a="hmdel" data-v="${i}">Remove</button></div>` +
    `<div class="chips">${HM_PICKS.amount.map(v => `<button class="chip sm ${it.amount === v ? "on" : ""}" data-a="hmset" data-k="untangle|item${i}.amount" data-v="${v}">${money(v)}</button>`).join("")}</div>` +
    `<div class="chips">${[
      ["both", "Both names"],
      ["me", "Mine"],
      ["them", "Theirs"],
    ]
      .map(
        x =>
          `<button class="chip sm ${it.names === x[0] ? "on" : ""}" data-a="hmset" data-k="untangle|item${i}.names" data-v="${x[0]}">${x[1]}</button>`
      )
      .join("")}</div>` +
    `<div class="chips">${Object.keys(HM_PLANS)
      .map(
        p =>
          `<button class="chip sm ${(it.plan || "none") === p ? "on" : ""}" data-a="hmset" data-k="untangle|item${i}.plan" data-v="${p}">${esc(HM_PLANS[p])}</button>`
      )
      .join("")}</div></div>`;
  return (
    (U.ready
      ? dkStatRow([
          dkTile("You end up with", money(U.mine.net), { sub: "what is decided so far" }),
          dkTile("They end up with", money(U.theirs.net), { sub: "split ones counted half" }),
          dkTile("Still to decide", U.open.length + " of " + U.of, {
            sub: U.open.length ? money(U.openAmount) : "all decided",
          }),
          dkTile("In both names", money(U.stillBothAmount), { sub: "owed by both until closed" }),
        ])
      : "") +
    dkCard(
      "What you shared",
      `<div class="tiny muted">Tap each one you shared, then its amount and who ends up with it.</div><div class="chips">${HM_UT_TAPS.map(t => `<button class="chip sm" data-a="hmadd" data-k="${esc(t[1])}" data-v="${esc(t[0])}">+ ${esc(t[0])}</button>`).join("")}</div>` +
        items.map(row).join("") +
        `<div class="tiny muted" style="margin-top:6px">A list for talking it through, not a legal split. What the law gives each of you depends on your state.</div>`
    )
  );
}
/* A roommate moving out, on the household split engine (rowShare of core/trip.js). */
function hmRoomBody(c) {
  const A = hmGet(c, "roomexit"),
    n = A.people || 2,
    how = A.how || "equal",
    people = Array.from({ length: n }, (_, i) => ({
      id: i === 0 ? "Me" : "P" + (i + 1),
      name: i === 0 ? "You" : "Person " + (i + 1),
      size: A["size" + (i + 1)],
    })),
    leaver = A.leaver == null ? "P2" : A.leaver,
    R = hmRoommateExit(
      {
        rent: A.rent,
        bills: A.bills || 0,
        how,
        people,
        leaver,
        monthsLeft: A.monthsLeft,
        cover: A.cover || 0,
        deposit: A.deposit || 0,
        damage: A.damage || 0,
      },
      rowShare
    );
  const asks =
    hmAsk("roomexit", A, "rent", "The whole rent a month", HM_PICKS.rent) +
    hmAsk("roomexit", A, "bills", "Shared bills a month", HM_PICKS.bills) +
    hmAsk("roomexit", A, "people", "How many of you now", HM_PICKS.people, v => String(v)) +
    `<div class="tiny muted" style="margin-top:6px">Who is moving out</div><div class="chips">${people.map(p => hmChip("roomexit", "leaver", p.id, leaver === p.id, p.name)).join("")}</div>` +
    hmAsk(
      "roomexit",
      A,
      "monthsLeft",
      "Months left on the lease",
      HM_PICKS.monthsLeft,
      v => v + (v === 1 ? " month" : " months")
    ) +
    hmAsk("roomexit", A, "cover", "Months the person leaving keeps paying", HM_PICKS.cover, v => String(v)) +
    `<div class="tiny muted" style="margin-top:6px">Split the rent</div><div class="chips">${["equal", "size"].map(k => hmChip("roomexit", "how", k, how === k, HM_SPLIT[k])).join("")}</div>` +
    (how === "size"
      ? people
          .map((p, i) =>
            hmAsk("roomexit", A, "size" + (i + 1), p.name + ": room size", HM_PICKS.size, v => v + " sq ft")
          )
          .join("")
      : "") +
    hmAsk("roomexit", A, "deposit", "The whole deposit", HM_PICKS.deposit) +
    hmAsk("roomexit", A, "damage", "What comes off the deposit", HM_PICKS.damage);
  const me = R.ready ? R.rows[0] : null;
  return (
    (R.ready
      ? dkStatRow([
          dkTile("You pay to the end", money(me.toEnd), { sub: me.leaving ? "as agreed" : "if no one new moves in" }),
          dkTile("A month now", money(me.now), { sub: "your part" }),
          dkTile(me.leaving ? "Left uncovered" : "A month later", money(me.leaving ? R.uncovered : me.later), {
            sub: me.leaving ? "falls to the others" : R.rest + " months",
          }),
          dkTile("Deposit back", money(me.deposit), { sub: "your share" }),
        ]) +
        dkCard(
          "Each person, to the end of the lease",
          R.rows
            .map(
              r =>
                `<div class="row between small" style="padding:4px 0;border-top:1px solid var(--line)"><span>${esc(r.name)}${r.leaving ? " (moving out)" : ""}</span><b>${money(r.toEnd)}</b></div>`
            )
            .join("") +
            mathBox([
              "The same split as Sharing costs fairly: equally or by room size (rowShare).",
              "After the person leaving stops paying, the people staying split the whole rent the same way among themselves.",
              "The deposit comes back by each person's share of the rent, less what comes off it.",
            ])
        )
      : "") + dkCard("The lease and the rent", asks)
  );
}
/* The body of one tool. */
function hmToolBody(c, tool) {
  const T = HM_REF.tools[tool],
    A = hmGet(c, tool),
    v = k => (A[k] == null ? null : money(A[k]));
  if (tool === "untangle") return hmUntangleBody(c) + hmSteps(c, tool, T.steps) + hmLines(T.lines);
  if (tool === "roomexit") return hmRoomBody(c) + hmSteps(c, tool, T.steps) + hmLines(T.lines);
  if (tool === "grief") {
    const P = hmParkMonths({ amount: A.arrived, spending: A.spending == null ? c.spend : A.spending });
    return (
      hmPause(T.pause) +
      hmSteps(c, tool, T.steps) +
      dkCard(
        "If money arrives",
        (P.ready
          ? `<div class="small">Waiting in savings, ${money(P.amount)} covers about <b>${P.whole} ${P.whole === 1 ? "month" : "months"}</b> at ${money(P.spending)} a month. While it waits, the choices about it can wait too.</div>`
          : `<div class="small">Tap an amount to see how long it carries the household while it waits. Nothing needs deciding.</div>`) +
          hmAsk("grief", A, "arrived", "Money that has arrived or will", HM_PICKS.arrived) +
          hmAsk(
            "grief",
            A,
            "spending",
            "What you spend in a month (your plan: " + money(c.spend) + ")",
            HM_PICKS.spending
          ) +
          `<div class="tiny muted">${esc(HM_REF.facts.inheritIncome.text)}</div>${hmSrc(HM_REF.facts.inheritIncome)}`
      ) +
      hmLines(T.lines)
    );
  }
  if (tool === "widow") return hmPause(T.pause) + hmSteps(c, tool, T.steps) + hmLines(T.lines);
  if (tool === "medical")
    return (
      dkCard(
        "Your numbers, for the words (optional)",
        hmAsk("medical", A, "balance", "The bill", HM_PICKS.balance) +
          hmAsk("medical", A, "monthly", "What you could pay a month", HM_PICKS.monthly) +
          hmAsk("medical", A, "offer", "One payment you could make", HM_PICKS.offer)
      ) +
      hmScripts(T.scripts, { balance: v("balance"), monthly: v("monthly"), offer: v("offer") }) +
      hmSteps(c, tool, T.steps, "Your rights, step by step") +
      hmLines(T.lines)
    );
  if (tool === "sayno")
    return (
      hmPause(T.pause) +
      dkCard(
        "Your numbers, for the words (optional)",
        hmAsk("sayno", A, "asked", "What they asked for", HM_PICKS.asked) +
          hmAsk("sayno", A, "gift", "What you could give and never need back", HM_PICKS.gift)
      ) +
      hmScripts(T.scripts, { asked: v("asked"), gift: v("gift") }) +
      hmSteps(c, tool, T.steps, "Before you answer") +
      hmLines(T.lines, "For the person asking")
    );
  if (tool === "crisis") {
    const kind = A.kind || "fire";
    return (
      dkCard(
        "What happened",
        `<div class="chips">${Object.keys(T.kinds)
          .map(k => hmChip("crisis", "kind", k, kind === k, T.kinds[k]))
          .join("")}</div>`
      ) +
      hmLines(T.lines[kind]) +
      hmSteps(
        c,
        tool,
        T.steps.filter(s => s.kind === "all" || s.kind === kind)
      )
    );
  }
  if (tool === "safety")
    return (
      hmLines(T.lines, "Talk to someone") +
      dkCard(
        "What this can and cannot hide",
        T.cannot.map(t => `<div class="small" style="padding:4px 0">${esc(t)}</div>`).join("") +
          `<div class="tiny muted">${esc(HM_REF.facts.history.text)}</div>${hmSrc(HM_REF.facts.history)}<div class="tiny muted">${esc(HM_REF.exit.keys)}</div>`
      ) +
      hmSteps(c, tool, T.steps, "Quiet steps, when it is safe")
    );
  return "";
}
function hardSheet() {
  const c = C(),
    tab = HM_REF.tools[W.tab] ? W.tab : "untangle",
    T = HM_REF.tools[tab],
    k = hmKept(c, tab),
    mine = typeof exLetterMine !== "function" || exLetterMine();
  const top =
    head("Money", "Hard moments") +
    `<button class="ghost wide" data-a="hmexit" title="${esc(HM_REF.exit.keys)}">${esc(HM_REF.exit.label)}</button>` +
    dkCaption("Calm steps, words to use and who can help. Nothing is kept unless you turn it on.") +
    `<div class="chips">${HM_TABS.map(t => `<button class="chip sm ${t[0] === tab ? "on" : ""}" data-a="hmtab" data-v="${t[0]}">${esc(t[1])}</button>`).join("")}</div>` +
    `<h3 style="margin:10px 0 2px">${esc(T.title)}</h3><div class="small muted">${esc(T.why)}</div>`;
  if (!mine)
    return (
      top +
      `<div class="tile small">${k && k.coach ? "The player lets you see this." : "This is private to the player. Only the player sees what is here."}</div>` +
      (k && k.coach ? hmToolBody(c, tab) : "")
    );
  return top + hmToolBody(c, tab) + hmKeepCard(c, tab);
}
/* Part of trSheet() in transit.js. One row under Break in case of emergency: the other hard moments. */
function trHardRow() {
  return `<button class="rowbtn" data-a="hard"><span><b>Other hard moments</b><div class="tiny muted">A breakup, a roommate leaving, a death, medical bills, saying no, a fire or a flood, a private plan</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`;
}
/* The spreadsheet of the plan: the kept untangle totals only (nothing that is not kept, and nothing for a coach the
   player did not let in). */
function hmBook(c) {
  const k = hmKept(c, "untangle");
  if (!k || !(k.items || []).length || (typeof exLetterMine === "function" && !exLetterMine() && !k.coach)) return null;
  const U = hmUntangle(k.items, { share: 0.5 });
  return {
    title: "Hard moments: untangling",
    rows: [
      { id: "hm_have", label: "What you keep", v: U.mine.have },
      { id: "hm_owe", label: "What you owe", v: U.mine.owe },
      { id: "hm_net", label: "You end up with", v: U.mine.net, f: "={hm_have}-{hm_owe}" },
      { id: "hm_both", label: "Debts still in both names", v: U.stillBothAmount },
    ],
  };
}
kitScreen(
  "hard",
  "Hard moments",
  "Calm steps, words to use and dated help lines for eight hard moments, a private money plan among them.",
  "Nothing is kept unless you turn on Keep this. Leave this page goes to a weather site at once."
);
Object.assign(ACT, {
  hard: t => {
    W = { kind: "hard", tab: (t && t.dataset && t.dataset.v) || "untangle", o: {} };
    sheet(hardSheet);
  },
  hmtab: t => {
    W.tab = t.dataset.v;
    drawSheet();
  },
  hmset: t => {
    const c = C(),
      p = String(t.dataset.k || "").split("|"),
      tool = p[0],
      key = p[1] || "",
      raw = t.dataset.v,
      v = raw !== "" && !isNaN(Number(raw)) ? Number(raw) : raw,
      A = hmGet(c, tool);
    if (!HM_REF.tools[tool]) return;
    const m = key.match(/^item(\d+)\.(amount|names|plan)$/);
    if (m) {
      const items = (A.items || []).slice(),
        i = Number(m[1]);
      if (!items[i]) return;
      items[i] = Object.assign({}, items[i], { [m[2]]: items[i][m[2]] === v && m[2] === "amount" ? null : v });
      hmPut(c, tool, { items });
    } else hmPut(c, tool, { [key]: A[key] === v && typeof v === "number" ? null : v });
    drawSheet();
  },
  hmtick: t => {
    const c = C(),
      tool = t.dataset.k,
      ticks = Object.assign({}, hmGet(c, tool).ticks || {});
    ticks[t.dataset.v] = !ticks[t.dataset.v];
    hmPut(c, tool, { ticks });
    drawSheet();
  },
  hmadd: t => {
    const c = C(),
      items = (hmGet(c, "untangle").items || []).slice();
    items.push({
      id: "u" + items.length + Date.now().toString(36),
      name: t.dataset.v,
      kind: t.dataset.k === "owe" ? "owe" : "have",
      amount: null,
      names: "both",
      plan: null,
    });
    hmPut(c, "untangle", { items });
    drawSheet();
  },
  hmdel: t => {
    const c = C(),
      items = (hmGet(c, "untangle").items || []).filter((_, i) => i !== Number(t.dataset.v));
    hmPut(c, "untangle", { items });
    drawSheet();
  },
  hmkeep: t => {
    const c = C(),
      tool = t.dataset.k,
      on = t.dataset.v === "1";
    if (!HM_REF.tools[tool] || (typeof exLetterMine === "function" && !exLetterMine())) return; /* only the player */
    c.x = c.x || {};
    c.x.hard = Object.assign({}, c.x.hard || {});
    W.o = W.o || {};
    if (on) c.x.hard[tool] = Object.assign({}, W.o[tool] || {}, { keep: true, coach: false });
    else {
      const k = c.x.hard[tool];
      if (k)
        W.o[tool] = Object.assign({}, k, {
          keep: false,
          coach: false,
        }); /* stays on the screen until the sheet closes */
      delete c.x.hard[tool];
      if (!Object.keys(c.x.hard).length) delete c.x.hard;
    }
    save();
    drawSheet();
  },
  hmcoach: t => {
    const c = C(),
      k = hmKept(c, t.dataset.k);
    if (!k || (typeof exLetterMine === "function" && !exLetterMine())) return; /* only the player */
    hmPut(c, t.dataset.k, { coach: t.dataset.v === "1" });
    drawSheet();
  },
  hmexit: () => hmLeave(),
});
/* Shift three times, within 5 seconds and with no other key between, leaves at once (while Hard moments is open). */
if (typeof document !== "undefined") {
  let hmN = 0,
    hmAt = 0;
  document.addEventListener("keydown", e => {
    if (!W || W.kind !== "hard") return;
    if (e.key !== "Shift" || e.repeat || e.ctrlKey || e.altKey || e.metaKey) {
      hmN = 0;
      return;
    }
    const now = Date.now();
    hmN = now - hmAt > 5000 ? 1 : hmN + 1;
    hmAt = now;
    if (hmN >= 3) hmLeave();
  });
}
kitMenu(
  "Hard moments",
  "hard",
  "A breakup, a roommate leaving, a death, medical bills, saying no, a fire, a private plan",
  "transit"
);
