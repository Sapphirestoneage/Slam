/* ============================================================================
   SLAM the Game: features/moneylog.js
   PURPOSE     Two tools. (1) The money log: all logged entries by month, read-only, with a copy as
               plain text. (2) Give a person their game: one tap copies one person as a code, and that
               person adds the code in their own game.
   INPUT       The game: G.active, G.chars, G.demo, G.gone. The profile: c.x.plan. The open sheet
               (W.kind): handoff, mlog. The taps of the player (the actions in OUTPUT).
   OUTPUT      11 functions. Parts of functions in other files: mePeopleHandoff, moneyTabLogLink.
               Actions (ACT): mlog, lgmonth, lgall, lgcopy, handoff, hopick, hocopy, hoadd.
   DEPENDS ON  core/report.js, core/engine.js, screens/ui.js, screens/planner.js.
   RULES       The money log is read-only. The code contains the numbers of that one person only: no
               other persons and no account details. The code adds a new person. It never replaces a
               person.
   ========================================================================= */
const LG_KIND = {
  in: "in",
  extra: "in",
  out: "out",
  cost: "out",
  pay: "debt",
  paid: "debt",
  xfer: "moved",
  saved: "moved",
};
function lgMonths(c) {
  const t = todayISO().slice(0, 7),
    s = {};
  s[t] = 1;
  (c.moves || []).forEach(m => {
    if (m.d) s[m.d.slice(0, 7)] = 1;
  });
  return Object.keys(s).sort().reverse().slice(0, 8);
}
function lgMonthName(ym) {
  const p = ym.split("-");
  return new Date(+p[0], +p[1] - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
function lgSum(c, ym) {
  const ms = (c.moves || []).filter(m => m.d && m.d.slice(0, 7) === ym),
    o = { in: 0, out: 0, debt: 0, moved: 0, n: ms.length, cats: {}, list: ms.slice().reverse() };
  ms.forEach(m => {
    const k = LG_KIND[m.t] || "moved";
    o[k] += m.amt || 0;
    if (k === "out") {
      const cat = m.cat || "Not sorted";
      o.cats[cat] = (o.cats[cat] || 0) + (m.amt || 0);
    }
  });
  o.left = o.in - o.out - o.debt;
  return o;
}
function lgText(c, ym) {
  const S = lgSum(c, ym),
    L = [
      "Money log: " + lgMonthName(ym),
      "Came in " +
        money(S.in) +
        ", went out " +
        money(S.out) +
        ", to debt " +
        money(S.debt) +
        ", moved " +
        money(S.moved) +
        ".",
      "",
    ];
  Object.keys(S.cats)
    .sort((a, b) => S.cats[b] - S.cats[a])
    .forEach(k => L.push(k + ": " + money(S.cats[k])));
  if (Object.keys(S.cats).length) L.push("");
  S.list
    .slice()
    .reverse()
    .forEach(m => L.push(m.d + "  " + moveLine(m)));
  return L.join("\n");
}
function lgSheet() {
  const c = C(),
    w = W,
    yms = lgMonths(c),
    ym = yms.includes(w.ym) ? w.ym : yms[0],
    S = lgSum(c, ym),
    cats = Object.keys(S.cats).sort((a, b) => S.cats[b] - S.cats[a]),
    top = cats.length ? S.cats[cats[0]] : 1,
    show = w.all ? S.list : S.list.slice(0, 20);
  const tile = (l, v) => `<div class="cpcell"><b>${money(Math.round(v))}</b><div class="tiny muted">${l}</div></div>`;
  return (
    head("My Money", "Money log") +
    `<div class="chips">${yms.map(m => `<button class="chip sm ${m === ym ? "on" : ""}" data-a="lgmonth" data-v="${m}">${lgMonthName(m)}</button>`).join("")}</div>` +
    (S.n
      ? `<div class="cpgrid" style="grid-template-columns:1fr 1fr">${tile("came in", S.in)}${tile("went out", S.out)}${tile("went to debt", S.debt)}${tile("moved between accounts", S.moved)}</div>
  <div class="tile small" style="text-align:center">From what you logged, <b>${money(Math.round(Math.abs(S.left)))}</b> ${S.left >= 0 ? "was left over" : "more went out than came in"}. <span class="muted">Only what was logged is counted.</span></div>
  ${cats.length ? `<b class="small">Where it went</b><div class="stack" style="gap:6px">${cats.map(k => `<div><div class="row between small"><span>${esc(k)}</span><b>${money(Math.round(S.cats[k]))}</b></div><div class="kbar" style="margin:4px 0 2px"><i style="width:${Math.max(3, Math.round((S.cats[k] / top) * 100))}%"></i></div></div>`).join("")}</div>` : ""}
  <b class="small">Every entry (${S.n})</b><div class="stack" style="gap:4px">${show.map(m => `<div class="row between small" style="align-items:flex-start;gap:8px"><span>${nice(m.d)} · ${esc(moveLine(m))}</span><b style="flex:none">${flowSign(m) ? signed(flowSign(m)) : money(m.amt)}</b></div>`).join("")}</div>
  ${S.list.length > show.length ? `<button class="ghost wide slim" data-a="lgall">Show all ${S.list.length}</button>` : ""}
  <button class="primary wide slim" data-a="lgcopy" data-v="${ym}">${w.copied === ym ? "Copied ✓" : "Copy this month"}</button>`
      : `<div class="tile small">Nothing logged in ${lgMonthName(ym)} yet. The <b>+ Log</b> button at the bottom adds money in, money spent, a debt payment or a move.</div>`) +
    `<button class="ghost wide slim" data-a="flow" data-v="">Log something now</button>`
  );
}
/* hand someone their game */
const HO_TAG = "SLAM1:";
function hoCode(c) {
  const o = JSON.parse(JSON.stringify(c));
  delete o.coach;
  return HO_TAG + JSON.stringify(o);
}
function hoRead(txt) {
  const s = String(txt || "").trim(),
    i = s.indexOf(HO_TAG);
  if (i < 0) return { err: "That doesn't look like a person's code. It starts with " + HO_TAG };
  let o;
  try {
    o = JSON.parse(s.slice(i + HO_TAG.length));
  } catch (e) {
    return { err: "The code got cut off. Copy it again, all of it." };
  }
  if (
    !o ||
    typeof o !== "object" ||
    Array.isArray(o) ||
    typeof o.name !== "string" ||
    typeof o.take !== "number" ||
    typeof o.spend !== "number"
  )
    return { err: "That code isn't a person from this game." };
  return { c: Object.assign(newChar(), o, { demo: false }) };
}
function hoAdd(c) {
  let nm = String(c.name).slice(0, 40),
    k = 2;
  const has = n => G.chars.some(x => String(x.name).toLowerCase() === n.toLowerCase());
  const base = nm;
  while (has(nm)) nm = base + " (" + k++ + ")";
  c.name = nm;
  c.x = c.x || {};
  if (G.demo) {
    G.demo = false;
    G.chars = [];
  }
  G.chars.push(c);
  if (Array.isArray(G.gone)) G.gone = G.gone.filter(n => n !== nm);
  G.active = G.chars.length - 1;
  if (typeof plSeedWeek === "function" && !(c.x.plan && c.x.plan.length))
    try {
      plSeedWeek(c);
    } catch (e) {
      report(e, "moneylog.js: hoAdd");
    }
  save();
  return nm;
}
function hoSheet() {
  const w = W,
    o = w.o;
  if (w.pick != null && G.chars[w.pick]) {
    const c = G.chars[w.pick];
    return (
      head("Profiles", "Hand " + esc(c.name) + " their game") +
      `<div class="small">1. Tap copy. 2. Send it to ${esc(c.name)} any way you like. 3. They open the game, tap <b>Me</b>, then <b>People settings</b>, then <b>Send or add a person with a code</b>, and paste it under <b>Add from a code</b>.</div><div class="field"><textarea readonly rows="3" aria-label="The code">${esc(hoCode(c))}</textarea></div><button class="primary wide" data-a="hocopy">${w.copied ? "Copied ✓" : "Copy " + esc(c.name) + "'s code"}</button><div class="tiny muted">The code holds ${esc(c.name)}'s numbers and nothing else: no other people, nothing from your account. Anyone who gets it can see those numbers, so send it only to them.</div><button class="ghost wide slim" data-a="handoff">Back one</button>`
    );
  }
  return (
    head("Profiles", "Send or add a person") +
    (G.demo
      ? ""
      : `<b class="small">Hand someone their game</b><div class="stack" style="gap:6px">${G.chars
          .map(
            (c, i) =>
              `<button class="rowbtn prow" data-a="hopick" data-v="${i}"><span class="ava2">${esc(
                String(c.name || "?")
                  .trim()
                  .charAt(0)
                  .toUpperCase()
              )}</span><span class="pn"><b>${esc(c.name)}</b><div class="tiny muted">Copy a code they paste into their own game</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`
          )
          .join("")}</div>`) +
    `<b class="small">Add from a code</b><div class="field"><textarea data-k="imp" rows="3" placeholder="Paste the code someone sent you" aria-label="Paste the code">${esc(o.imp || "")}</textarea></div>${w.err ? `<div class="banner small">${esc(w.err)}</div>` : ""}<button class="primary wide" data-a="hoadd">Add this person</button><div class="tiny muted">They are added next to whoever is already here. No one is replaced.</div><button class="ghost wide slim" data-a="people">Back to profiles</button>`
  );
}
Object.assign(ACT, {
  mlog: () => {
    W = { kind: "mlog", ym: null };
    sheet(lgSheet);
  },
  lgmonth: t => {
    W.ym = t.dataset.v;
    W.all = false;
    drawSheet();
  },
  lgall: () => {
    W.all = true;
    drawSheet();
  },
  lgcopy: t => {
    try {
      navigator.clipboard.writeText(lgText(C(), t.dataset.v));
    } catch (e) {
      report(e, "moneylog.js: lgcopy");
    }
    W.copied = t.dataset.v;
    drawSheet();
  },
  handoff: () => {
    W = { kind: "handoff", o: { imp: "" }, pick: null };
    sheet(hoSheet);
  },
  hopick: t => {
    W.pick = +t.dataset.v;
    W.copied = false;
    drawSheet();
  },
  hocopy: () => {
    const c = G.chars[W.pick];
    if (!c) return;
    try {
      navigator.clipboard.writeText(hoCode(c));
    } catch (e) {
      report(e, "moneylog.js: hocopy");
    }
    W.copied = true;
    drawSheet();
  },
  hoadd: () => {
    const r = hoRead(W.o.imp);
    if (r.err) {
      W.err = r.err;
      return drawSheet();
    }
    const nm = hoAdd(r.c);
    render();
    celebrate(nm + " is here", ["Added from a code"], "Tap the name at the top any time to switch between people.");
  },
});
/* Part of meTabPeople() in profiles.js. Adds the button "Send or add a person with a code" to "People settings" of Me. */
function mePeopleHandoff(h) {
  return h + `<button class="ghost wide slim" data-a="handoff">Send or add a person with a code</button>`;
}

/* Part of moneyTab() in ui.js. Adds the button that opens the money log. */
function moneyTabLogLink(h) {
  const a = "<details><summary>Cash flow history (";
  return h.indexOf(a) < 0
    ? h
    : h.replace(a, () => `<button class="ghost wide slim" data-a="mlog">Open the money log</button>` + a);
}

if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
