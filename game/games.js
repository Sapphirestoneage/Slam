/* ===== games.js: the screens for the games that are the data entry. Every game has a plain-form twin with the same data. ===== */
Object.assign(GLOSS, {
  camp: [
    "Your camp",
    "Where your progress lives. The strip shows how much of your money picture is clear. The four dots are save points, one per layer.",
  ],
  fog: [
    "The map",
    "Your money picture, in patches. Each answer clears one. Foggy patches are things the game is still guessing at.",
  ],
  gear: [
    "Your gear",
    "The basic equipment a money life runs on: accounts, insurance, a safety cushion. Empty slots are things to pick up, when you're ready.",
  ],
  party: ["Your people", "Anyone your money touches: roommates, partners, parents, kids, pets. As many as you have."],
  hl: [
    "Higher or lower",
    "A way to find a number you don't know. A few taps narrow it down, and the game keeps the range instead of pretending to know it exactly.",
  ],
  chips: [
    "Guess, Close, Exact",
    "Every number is one of three things. A Guess is the game's starting point. Close is what you told it by tapping. Exact is a number you typed or one from a statement.",
  ],
  bonfire: ["Save point", "Finishing a layer saves your place and unlocks something new."],
});
const PLAINBTN = () =>
  `<button class="ghost wide slim" data-a="plain">${C().plain ? "Back to the game version" : "Skip the game. Use a plain form"}</button>`;
/* THE CARD "GAMES" ON HOME.
   campCard(c, d) makes the full card. It calls each part by name. campCardBase(c, d) is the part from this file. */
function campCard(c, d) {
  let h = campCardBase(c, d);
  /* games2.js: the buttons "All games" and "Daily question" */
  if (typeof campCardGames === "function") h = campCardGames(h, c);
  if (typeof campCardReview === "function") h = campCardReview(h, c); /* year.js: the button for the Yearly Review */
  return h;
}
function campCardBase(c, d) {
  const ls = layers(c, d),
    ps = fogPatches(c, d),
    pct = Math.round((ps.filter(p => p.ok).length / ps.length) * 100),
    cur = ls.find(l => !l.done && l.parts.length),
    part = cur && cur.parts.find(p => !p.ok),
    rough = roughOnes(c).length;
  c.bon = c.bon || {};
  return `<div class="card"><div class="row between"><div class="eyebrow">Your camp</div>${ib("term:camp")}</div><button class="fogstrip" data-a="fog" aria-label="Open your map">${ps.map(p => `<i class="${p.ok ? "on" : ""}"></i>`).join("")}</button>
 <div class="row between small" style="margin-top:6px"><span><b data-fid="v:fog">${pct}%</b> of your picture is clear</span><span class="bons" title="Save points">${ls
   .filter(l => l.parts.length)
   .map(l => `<i class="${c.bon[l.n] ? "lit" : ""}"></i>`)
   .join("")}</span></div>
 ${part ? `<button class="ghost wide slim" style="margin-top:8px" data-a="${part.a}" data-v="${part.v || ""}">Layer ${cur.n}, ${cur.name.toLowerCase()}: ${esc(part.n.toLowerCase())}</button>` : `<div class="tiny muted" style="margin-top:6px">Every layer is done. Nice work.</div>`}
 ${rough ? `<button class="ghost wide slim" style="margin-top:6px" data-a="rough">${rough} number${rough === 1 ? "" : "s"} to make exact</button>` : ""}</div>`;
}
function fogSheet() {
  const c = C(),
    d = D,
    ps = fogPatches(c, d),
    pct = Math.round((ps.filter(p => p.ok).length / ps.length) * 100),
    ls = layers(c, d);
  c.bon = c.bon || {};
  return (
    head("Your map", pct + "% clear") +
    `<div class="small muted">Each answer clears a patch. Tap a foggy one to clear it.</div><div class="fogmap">${ps.map(p => `<button class="fogt ${p.ok ? "on" : ""}" ${p.ok || !p.a || !ACT[p.a] ? "disabled" : `data-a="${p.a}" data-v="${p.v}"`}><span>${p.ok ? "✓" : "?"}</span><b>${esc(p.n)}</b></button>`).join("")}</div>
 <div class="stack" style="gap:6px">${ls
   .filter(l => l.parts.length)
   .map(
     l =>
       `<div class="row between small"><span><b>Layer ${l.n}: ${l.name}</b><div class="tiny muted">${l.parts.map(p => (p.ok ? "✓ " : "○ ") + p.n).join(" · ")}</div></span><span class="bons"><i class="${c.bon[l.n] ? "lit" : ""}"></i></span></div>`
   )
   .join("")}</div><button class="ghost wide" data-a="close">Close</button>`
  );
}
/* gear */
const GEAR_L = { have: "Have it", none: "Don't have it", "?": "Not sure" };
function gearBody(c, d) {
  const s = gearState(c, d),
    sc = gearScore(c, d);
  return (
    `<div class="row between small"><span>Your setup</span><b data-fid="v:gear">${sc.have} of ${sc.total} slots filled</b></div>` +
    (c.plain
      ? s
          .map(
            x =>
              `<div class="stack" style="gap:4px"><div class="small"><b>${x.g.n}</b> <span class="tiny muted">${x.g.d || ""}</span></div><div class="seg">${["have", "none", "?"].map(v => `<button class="${x.v === v ? "on" : ""}" data-a="gearset" data-k="${x.g.id}" data-v="${v}">${GEAR_L[v]}</button>`).join("")}</div></div>`
          )
          .join("")
      : `<div class="tiny muted">Tap a slot to switch it: have it, don't have it, not sure.</div><div class="geargrid">${s.map(x => `<button class="slot ${x.v === "?" ? "unsure" : x.v || "unk"}" data-a="gearcyc" data-k="${x.g.id}"><b>${x.g.n}</b><span>${x.v ? GEAR_L[x.v] : "Tap to answer"}</span></button>`).join("")}</div>`)
  );
}
function gearSheet() {
  const c = C();
  return (
    head("Inventory", "Your gear") +
    gearBody(c, D) +
    PLAINBTN() +
    `<button class="primary wide" data-a="geardone">Save my gear</button>`
  );
}
/* party */
function personEd(p) {
  const dep = PARTY_DEP[p.k],
    who = esc(p.n || "this " + p.k.toLowerCase()),
    amts = [50, 100, 250, 500, 1000, 2500, 5000],
    row = (l, t) =>
      `<div class="small">${t}</div><div class="chips">${amts.map(a => `<button class="chip ${p.amt && p.amt[l] === a ? "on" : ""}" data-a="pyamt" data-k="${l}" data-v="${a}">${money(a)}</button>`).join("")}</div>`;
  return `<div class="tile stack" style="gap:8px">${
    dep
      ? row(
          "cost",
          "About how much do they cost each month? It's already inside your spending. This just helps the game see it."
        )
      : `<div class="small">How does money move between you and ${who}? Tap all that fit.</div><div class="chips">${PARTY_L.map(l => `<button class="chip ${p.links.includes(l[0]) ? "on" : ""}" data-a="pylink" data-k="${l[0]}">${l[1]}</button>`).join("")}</div>${p.links
          .filter(l => PARTY_AMT[l])
          .map(l => row(l, PARTY_AMT[l]))
          .join(
            ""
          )}${p.links.includes("split") ? `<div class="small">Which costs do you split?</div><div class="chips">${SPEND_K.map(k => `<button class="chip ${(p.split || []).includes(k) ? "on" : ""}" data-a="pysplit" data-k="${esc(k)}">${k}</button>`).join("")}</div><div class="tiny muted">When you enter spending, enter your share.</div>` : ""}`
  }
 <div class="field"><label class="small" for="pyn">Name (optional)</label><input type="text" id="pyn" data-k="pyn" maxlength="14" value="${esc(W.o.pyn != null ? W.o.pyn : p.n || "")}" placeholder="${p.k}"></div><div class="row between"><button class="ghost slim" data-a="pydel">Remove</button><button class="primary slim" data-a="pyok">Done</button></div></div>`;
}
function partyBody(c) {
  const P = (c.party = c.party || []),
    w = W;
  return (
    (P.length
      ? P.map(
          (p, i) =>
            `<button class="rowbtn ${w.per === i ? "sel" : ""}" data-a="pyopen" data-v="${i}"><span><b>${esc(p.n || p.k)}</b>${p.n ? ` <span class="tiny muted">${p.k}</span>` : ""}<div class="tiny muted">${(() => {
              const ls = (p.links || [])
                .map(
                  l => PARTY_LN[l] + (p.amt && p.amt[l] ? " " + money(p.amt[l]) + (PARTY_MO[l] ? " a month" : "") : "")
                )
                .concat(p.amt && p.amt.cost ? ["Costs about " + money(p.amt.cost) + " a month"] : []);
              return ls.length ? ls.join(" · ") : "Tap to say how money moves between you";
            })()}</div></span><span class="caret">${w.per === i ? "⌃" : "›"}</span></button>${w.per === i ? personEd(p) : ""}`
        ).join("")
      : `<div class="small muted">Who's in your money world? Roommates, partners, parents, kids, pets. Add as many of each as you have.</div>`) +
    `<div class="small" style="margin-top:6px">Add someone</div><div class="chips">${PARTY_K.map(k => `<button class="chip" data-a="pyadd" data-v="${k}">+ ${k}</button>`).join("")}</div>${(() => {
      const pl = partyLean(c);
      return pl
        ? `<div class="tile small">People cover about <b>${money(pl.help)} a month</b> of your costs. Without it, you'd have ${pl.without >= 0 ? money(pl.without) + " left over" : money(-pl.without) + " more going out than coming in"} each month. Good to know, not a reason to worry.</div>`
        : "";
    })()}`
  );
}
/* partySheet() makes the sheet "Your people".
   people.js has the present form: one layer at a time (ppBody). The lines below it run only while the page loads, before people.js is there. */
function partySheet() {
  if (typeof ppBody === "function") return ppBody("solo");
  const c = C();
  return (
    head("Party", "Your people") +
    partyBody(c) +
    `<button class="primary wide" data-a="pydone">${(c.party || []).length ? "That's everyone" : "It's just me"}</button>`
  );
}
/* higher or lower */
function hlBody(n, h, res) {
  const w = W;
  if (res)
    return `<div class="levelup" style="padding:14px"><div class="tiny muted">${esc(n.n)}</div><div class="big" style="font-size:26px">${res.lo === res.hi ? money(res.lo) : money(res.lo) + " to " + money(res.hi)}</div><div class="tiny muted">${n.per}</div></div><div class="small muted">That makes it Close. You can make it exact any time.</div><button class="primary wide" data-a="hlbet" data-v="2">That's close enough</button><button class="ghost wide slim" data-a="padopen" data-k="exact">I know the exact number</button>${w.pad === "exact" ? `<div class="val">${money(w.o.exact || 0)}</div>` + keypad("exact") + `<button class="primary wide" data-a="hlexact">Use ${money(w.o.exact || 0)}</button>` : ""}`;
  return `<div class="tile" style="text-align:center"><div class="tiny muted">${esc(n.n)}</div><h2 style="margin:8px 0" data-fid="hl:q">More or less than ${money(h.ask)}?</h2><div class="small muted">${esc(n.q)}</div>${h.n ? `<div class="tiny" style="margin-top:6px" data-fid="hl:r">So far: ${h.hi == null ? "more than " + money(h.lo) : "between " + money(h.lo) + " and " + money(h.hi)}</div>` : ""}</div>
 <div class="hl3"><button class="pickbig sm" data-a="hlans" data-v="less"><b>Less</b></button><button class="pickbig sm" data-a="hlans" data-v="about"><b>About that</b></button><button class="pickbig sm" data-a="hlans" data-v="more"><b>More</b></button></div>
 <div class="row wrap">${n.zero ? `<button class="ghost slim" data-a="hlzero">None</button>` : ""}<button class="ghost slim" data-a="padopen" data-k="exact">I know the exact number</button><button class="ghost slim" data-a="hlskip">Skip this one</button></div>${w.pad === "exact" ? `<div class="val">${money(w.o.exact || 0)}</div>` + keypad("exact") + `<button class="primary wide" data-a="hlexact">Use ${money(w.o.exact || 0)}</button>` : ""}`;
}
function plainNums(c) {
  const w = W;
  return l1Numbers(c)
    .map(
      n =>
        `<div class="stack" style="gap:4px"><div class="row between small numrow"><span><b>${esc(n.n)}</b><div class="tiny muted">${n.per}${n.ok ? "" : " · guess"}</div></span><b class="${n.ok ? "" : "guess"}">${money(n.typ)}</b></div>${w.pad === "x_" + n.k ? keypad("x_" + n.k) + `<button class="primary wide slim" data-a="l1save" data-k="${n.k}">Use ${money(w.o["x_" + n.k] || 0)}</button>` : `<div class="row wrap">${n.ok ? "" : `<button class="ghost slim" data-a="plabout" data-k="${n.k}">About right</button>`}<button class="ghost slim" data-a="padopen" data-k="x_${n.k}">Type it</button></div>`}</div>`
    )
    .join("");
}
function lastBody(c) {
  const ch = (k, opts) =>
    `<div class="stack">${opts.map(o => `<button class="rowbtn" data-a="l1set" data-k="${k}" data-v="${esc(o)}"><b>${o}</b><span class="caret">›</span></button>`).join("")}</div>`;
  if (isEmployee(c) && !c.sharp.match)
    return (
      `<h3>Does your job add money to your retirement savings when you do?</h3><div class="small muted">That's called a match. It's free money.</div>` +
      ch("match", ["Yes, and I get all of it", "Yes, but I don't get all of it", "My job has no match", "Not sure"])
    );
  if (c.invs.length && !c.sharp.tax)
    return (
      `<h3>Retirement accounts have a yearly limit. Are yours full?</h3>` +
      ch("tax", ["All of them are full", "I put in some", "Not yet", "Not sure"])
    );
  return "";
}
function l1Where(c) {
  c.l1 = c.l1 || {};
  return !c.l1.intro
    ? "intro"
    : !c.l1.gear
      ? "gear"
      : !c.l1.party
        ? "party"
        : l1Numbers(c).some(n => !n.ok && !(W && W.skipk && W.skipk[n.k]))
          ? "hl"
          : lastBody(c)
            ? "last"
            : "done";
}
function openL1() {
  W = { kind: "l1", step: null, h: null, res: null, pad: null, per: null, o: {}, skipk: {} };
  W.step = l1Where(C());
  sheet(l1Sheet);
}
/* l1Sheet() makes the full sheet of the first game. l1SheetBase() is the part from this file. */
function l1Sheet() {
  /* people.js: the step "your people" has its own form. */
  const pp = typeof l1SheetPeople === "function" ? l1SheetPeople() : null;
  if (pp !== null) return pp;
  let h = l1SheetBase();
  if (typeof l1SheetBack === "function") h = l1SheetBack(h); /* people.js: the button "Back one" */
  return h;
}
function l1SheetBase() {
  const c = C(),
    d = D,
    w = W,
    st = w.step,
    ns = l1Numbers(c),
    left = ns.filter(n => !n.ok && !w.skipk[n.k]),
    stepN = { gear: 1, party: 2, hl: 3, last: 3 }[st];
  if (st === "intro")
    return (
      head("Layer 1 · about 2 minutes", "Three quick games") +
      `<div class="stack"><div class="tile small"><b>1. Your gear.</b> Tap what you have.</div><div class="tile small"><b>2. Your people.</b> Who your money touches.</div><div class="tile small"><b>3. Higher or lower.</b> Find your numbers in a few taps. No typing.</div></div><div class="small muted">Close is the goal. You can make it exact later.</div><button class="primary wide go" data-a="l1go">Start the first game</button>${PLAINBTN()}`
    );
  if (st === "gear")
    return (
      head("Layer 1 · game 1 of 3", "Your gear") +
      gearBody(c, d) +
      `<button class="primary wide go" data-a="l1next">These look right, keep going</button>${PLAINBTN()}`
    );
  if (st === "party")
    return (
      head("Layer 1 · game 2 of 3", "Your people") +
      partyBody(c) +
      `<button class="primary wide go" data-a="l1next">${(c.party || []).length ? "That's everyone" : "It's just me"}</button>`
    );
  if (st === "hl") {
    if (c.plain)
      return (
        head("Layer 1 · game 3 of 3", "Your numbers") +
        `<div class="small muted">Tap About right to keep a guess, or type the real one.</div>` +
        plainNums(c) +
        `<button class="primary wide go" data-a="l1next">These look right, keep going</button>${PLAINBTN()}`
      );
    const n = w.cur && left.find(x => x.k === w.cur.k) ? w.cur : left[0];
    if (!n) {
      w.step = l1Where(c);
      return l1Sheet();
    }
    if (!w.h || w.cur !== n) {
      w.cur = n;
      w.h = hlNew(n.typ);
      w.res = null;
    }
    return (
      head("Layer 1 · game 3 of 3 · " + (ns.length - left.length + 1) + " of " + ns.length, "Higher or lower") +
      bar(((ns.length - left.length) / ns.length) * 100) +
      hlBody(n, w.h, w.res) +
      PLAINBTN()
    );
  }
  if (st === "last") return head("Layer 1 · last taps", "Almost there") + lastBody(c);
  return bonBody(c, 1);
}
function hl1Sheet() {
  const w = W;
  return (
    head("Higher or lower", esc(w.cur.n)) +
    hlBody(w.cur, w.h, w.res) +
    `<button class="ghost wide" data-a="close">Close</button>`
  );
}
function roughSheet() {
  const c = C(),
    rs = roughOnes(c);
  return (
    head("Make it exact", "Close numbers") +
    (rs.length
      ? `<div class="small muted">These are close, not exact. Play again, or type the exact number when you have it.</div>` +
        rs
          .map(
            r =>
              `<div class="row between small numrow"><span><b>${esc(r.n)}</b><div class="tiny muted">${money(r.lo)} to ${money(r.hi)}</div></span><span class="row"><button class="ghost slim" data-a="hl" data-v="${r.k}">Play again</button><button class="ghost slim" data-a="rsolid" data-v="${r.k}">It's right</button></span></div>`
          )
          .join("")
      : `<div class="small muted">Nothing left to make exact. Every number here is one you stand behind.</div>`) +
    `<button class="primary wide" data-a="close">Done</button>`
  );
}
/* bonfires */
function bonBody(c, n) {
  const pct = fogPct(c, D);
  return `<div class="levelup pop"><div class="eyebrow">Save point</div><div class="medal">✦</div><h2>Layer ${n} done: ${LAYER_N[n]}</h2><div class="small muted" style="margin:6px 0">Your place is saved on this phone. ${pct}% of your picture is clear.</div><div class="tile" style="text-align:left;margin:10px 0"><div class="tiny muted">Here's what you unlocked</div>${UNLOCK[n].map(u => `<div class="small">✓ ${u}</div>`).join("")}</div><button class="primary wide go" data-a="bonok" data-v="${n}">Keep going</button></div>`;
}
function bonfire(n) {
  const c = C();
  c.bon = c.bon || {};
  c.bon[n] = todayISO();
  save();
  W = { kind: "bon", n };
  sheet(() => bonBody(C(), W.n));
}
function afterGame() {
  const c = C(),
    n = bonfireDue(c, D);
  save();
  if (n && n !== 1) {
    bonfire(n);
    return true;
  }
  return false;
}
Object.assign(ACT, {
  plain: () => {
    const c = C();
    c.plain = !c.plain;
    if (W) {
      W.pad = null;
      W.h = null;
      W.res = null;
    }
    save();
    drawSheet();
  },
  fog: () => {
    W = { kind: "fog" };
    sheet(fogSheet);
  },
  gear: () => {
    W = { kind: "gear" };
    sheet(gearSheet);
  },
  gearcyc: t => {
    const c = C(),
      id = t.dataset.k,
      cur = (gearState(c, D).find(x => x.g.id === id) || {}).v,
      nx = cur === "have" ? "none" : cur === "none" ? "?" : "have";
    gearSet(c, id, nx);
    save();
    render();
    drawSheet();
  },
  gearset: t => {
    gearSet(C(), t.dataset.k, t.dataset.v);
    save();
    render();
    drawSheet();
  },
  geardone: () => {
    const c = C();
    gearState(c, D).forEach(x => {
      if (x.v == null) gearSet(c, x.g.id, "?");
    });
    c.l1 = c.l1 || {};
    save();
    closeSheet();
    render();
    afterGame();
  },
  party: () => {
    W = { kind: "party", per: null, o: {} };
    sheet(partySheet);
  },
  pyadd: t => {
    const c = C();
    c.party = c.party || [];
    c.party.push({ id: "p" + Date.now().toString(36) + c.party.length, k: t.dataset.v, n: "", links: [], amt: {} });
    W.per = c.party.length - 1;
    W.o.pyn = null;
    save();
    drawSheet();
  },
  pyopen: t => {
    const i = +t.dataset.v;
    W.per = W.per === i ? null : i;
    W.o.pyn = null;
    drawSheet();
  },
  pylink: t => {
    const p = C().party[W.per],
      k = t.dataset.k;
    if (k === "none") p.links = p.links.includes("none") ? [] : ["none"];
    else {
      p.links = p.links.filter(x => x !== "none");
      p.links = p.links.includes(k) ? p.links.filter(x => x !== k) : p.links.concat([k]);
    }
    Object.keys(p.amt).forEach(a => {
      if (a !== "cost" && !p.links.includes(a)) delete p.amt[a];
    });
    partyApply(C());
    save();
    render();
    drawSheet();
  },
  pyamt: t => {
    const p = C().party[W.per],
      k = t.dataset.k,
      v = +t.dataset.v;
    if (p.amt[k] === v) delete p.amt[k];
    else p.amt[k] = v;
    partyApply(C());
    save();
    render();
    drawSheet();
  },
  pysplit: t => {
    const p = C().party[W.per],
      k = t.dataset.k;
    p.split = p.split || [];
    p.split = p.split.includes(k) ? p.split.filter(x => x !== k) : p.split.concat([k]);
    save();
    drawSheet();
  },
  pyok: () => {
    const p = C().party[W.per];
    if (p && W.o.pyn != null) p.n = String(W.o.pyn).trim().slice(0, 14);
    W.per = null;
    W.o.pyn = null;
    save();
    render();
    drawSheet();
  },
  pydel: () => {
    const c = C();
    c.party.splice(W.per, 1);
    W.per = null;
    partyApply(c);
    save();
    render();
    drawSheet();
  },
  pydone: () => {
    const c = C();
    c.l1 = c.l1 || {};
    c.l1.party = true;
    partyApply(c);
    save();
    closeSheet();
    render();
    afterGame();
  },
  l1: () => openL1(),
  l1go: () => {
    const c = C();
    c.l1 = c.l1 || {};
    c.l1.intro = true;
    W.step = l1Where(c);
    save();
    drawSheet();
  },
  l1next: () => {
    const c = C(),
      w = W;
    c.l1 = c.l1 || {};
    if (w.step === "gear") {
      gearState(c, D).forEach(x => {
        if (x.v == null) gearSet(c, x.g.id, "?");
      });
      c.l1.gear = true;
    } else if (w.step === "party") {
      if (w.per != null) ACT.pyok();
      c.l1.party = true;
      partyApply(c);
    } else if (w.step === "hl") {
      l1Numbers(c).forEach(n => {
        if (!n.ok) w.skipk[n.k] = true;
      });
    }
    w.per = null;
    w.pad = null;
    w.step = l1Where(c);
    if (w.step === "done") return l1Finish();
    save();
    render();
    drawSheet();
  },
  l1set: t => {
    const c = C(),
      k = t.dataset.k,
      v = t.dataset.v;
    if (k === "match") {
      c.match = v === "Yes, and I get all of it" ? "yes" : v === "My job has no match" ? "no match offered" : "no";
      c.sharp.match = true;
    } else {
      c.tax = v === "All of them are full" ? "yes" : v === "I put in some" ? "some" : "no";
      c.sharp.tax = true;
    }
    W.step = l1Where(c);
    if (W.step === "done") return l1Finish();
    save();
    render();
    drawSheet();
  },
  hl: t => {
    const c = C(),
      n = l1Numbers(c).find(x => x.k === t.dataset.v);
    if (!n) return;
    if (c.plain) {
      ACT.sharp({ dataset: { v: n.k.split(":")[0] } });
      return;
    }
    W = { kind: "hl1", cur: n, h: hlNew(n.typ), res: null, pad: null, o: {} };
    sheet(hl1Sheet);
  },
  hlans: t => {
    const w = W;
    hlStep(w.h, t.dataset.v);
    if (w.h.done) w.res = { lo: w.h.lo, hi: w.h.hi };
    w.pad = null;
    drawSheet();
  },
  hlzero: () => {
    hlCommit(0, 0, 3);
  },
  hlexact: () => {
    const v = Math.max(0, Math.round(W.o.exact || 0));
    hlCommit(v, v, 3);
  },
  hlbet: t => {
    hlCommit(W.res.lo, W.res.hi, +t.dataset.v);
  },
  hlskip: () => {
    const w = W;
    if (w.kind === "l1") {
      w.skipk[w.cur.k] = true;
      w.h = null;
      w.cur = null;
      w.res = null;
      w.pad = null;
      w.step = l1Where(C());
      if (w.step === "done") return l1Finish();
      drawSheet();
    } else closeSheet();
  },
  plabout: t => {
    const c = C(),
      n = l1Numbers(c).find(x => x.k === t.dataset.k),
      st = Math.max(10, nice$(n.typ * 0.1));
    l1Apply(c, n.k, Math.max(0, n.typ - st), n.typ + st, 1);
    save();
    render();
    drawSheet();
  },
  l1save: t => {
    const c = C(),
      k = t.dataset.k,
      v = Math.max(0, Math.round(W.o["x_" + k] || 0));
    l1Apply(c, k, v, v, 3);
    W.pad = null;
    save();
    render();
    drawSheet();
  },
  rough: () => {
    W = { kind: "rough" };
    sheet(roughSheet);
  },
  rsolid: t => {
    const c = C(),
      r = c.x.rng[t.dataset.v];
    if (r) r.cf = 3;
    save();
    render();
    drawSheet();
    afterGame();
  },
  bonok: t => {
    const n = +t.dataset.v;
    closeSheet();
    render();
    if (n === 1) afterSharp(C());
  },
});
function hlCommit(lo, hi, cf) {
  const c = C(),
    w = W,
    pr = D.realm,
    k = w.cur.k;
  l1Apply(c, k, lo, hi, cf);
  D = derive(c);
  save();
  render();
  if (w.kind === "l1") {
    w.h = null;
    w.cur = null;
    w.res = null;
    w.pad = null;
    w.o.exact = 0;
    w.step = l1Where(c);
    if (w.step === "done") return l1Finish();
    drawSheet();
  } else {
    if (c.placed) afterMoney(c, pr, false);
    closeSheet();
    render();
    afterGame();
  }
}
function l1Finish() {
  const c = C();
  c.bon = c.bon || {};
  const all = layers(c, D)[0].done;
  if (all && !c.bon[1]) {
    c.bon[1] = todayISO();
    save();
    W.step = "done";
    drawSheet();
  } else {
    save();
    closeSheet();
    render();
    if (!c.placed) afterSharp(c);
  }
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
