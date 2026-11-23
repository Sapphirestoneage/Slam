/* ============================================================================
   SLAM the Game: features/connect.js
   PURPOSE     How it all connects. (1) Links between the 25 skill tracks: what a track works best
               after, and what it opens, each with the reason. (2) Links from a skill to the screen of
               this game that does it. (3) A picture with the track of the player in the middle, and a
               plain list of all tracks with the same links. (4) When a completed skill takes a track to
               its first level, the game names the tracks that it opens, one time.
   INPUT       The game: G.demo. The profile: c.x.unl. The open sheet (W.kind): connect. The taps of the
               player (the actions in OUTPUT).
   OUTPUT      19 functions. Parts of functions in other files: skillSheetConnect, msBoardConnect,
               homeConnectRow. Actions (ACT): connect, cxfocus, cxview, cxdo, skilldone. Menu: "How it
               all connects".
   DEPENDS ON  core/engine.js, screens/ui.js, screens/planner.js, features/reveal.js.
   RULES       A link does not lock a track. The game says "works best after", and the player can start
               at each track.
   ========================================================================= */
const CX_E = [
  [
    "cash-safety-net",
    "debt-leverage",
    "A small cushion first, so a surprise bill does not go back on the card you are paying off.",
  ],
  ["cash-safety-net", "main-path", "Money you might need soon should not be riding the market."],
  ["cash-safety-net", "storms-windfalls", "A storm plan starts with knowing what cash you can reach."],
  ["cash-safety-net", "insurance-protection", "Your cushion decides how big a deductible you can carry."],
  ["financial-ops-tooling", "cash-safety-net", "Once money moves on its own, saving stops depending on willpower."],
  ["financial-ops-tooling", "debt-leverage", "Automatic payments mean no late fees while you pay it down."],
  ["money-psychology", "financial-ops-tooling", "Systems stick when they fit how you actually behave with money."],
  ["debt-leverage", "credit-cards", "With the expensive debt gone, cards become a tool instead of a trap."],
  ["debt-leverage", "main-path", "Paying off 20% debt beats any investment. After that, investing wins."],
  ["credit-cards", "deals-smart-buying", "Strong credit opens card bonuses, points and cheaper travel."],
  ["credit-cards", "real-estate", "Your credit score sets your mortgage rate."],
  ["main-path", "portfolio-design", "Once you own the basics, you can decide your mix on purpose."],
  ["main-path", "tax-strategy", "Which account holds an investment changes how much of it you keep."],
  ["portfolio-design", "alternatives-speculation", "Side bets only make sense around a solid core."],
  ["portfolio-design", "withdrawal-decumulation", "How you hold it shapes how you will one day spend it."],
  ["tax-strategy", "withdrawal-decumulation", "The order you take money out is mostly a tax question."],
  ["tax-strategy", "real-estate", "Property comes with tax rules worth knowing before you buy."],
  ["income-career", "side-hustles", "A steady main income makes it safe to try a second one."],
  ["income-career", "main-path", "More coming in is the fastest way to have more to invest."],
  ["side-hustles", "entrepreneurship", "A side income that works is a business in rehearsal."],
  ["side-hustles", "tax-strategy", "Money earned on your own has its own tax rules, and its own breaks."],
  ["social-capital", "income-career", "Most good jobs and raises come through people."],
  ["knowledge", "income-career", "What you can do sets what you can earn."],
  ["knowledge", "money-psychology", "Understanding the game makes it less frightening."],
  ["deals-smart-buying", "geo-arbitrage-location", "Paying less for the same life, taken as far as where you live."],
  ["real-estate", "geo-arbitrage-location", "Where you could own changes where it makes sense to live."],
  ["insurance-protection", "family-generational-wealth", "Protecting people comes before passing things on to them."],
  ["health-longevity", "pre-retirement-design", "A longer, healthier life changes what you are planning for."],
  ["time-capital", "pre-retirement-design", "Knowing what your time is worth tells you what you are buying back."],
  [
    "withdrawal-decumulation",
    "pre-retirement-design",
    "You cannot design the exit without knowing how the money comes out.",
  ],
  ["pre-retirement-design", "the-long-game", "A good first year of freedom sets up the next thirty."],
  ["family-generational-wealth", "the-long-game", "What outlasts you is the last move of the game."],
];
const CX_LV1 = 5;
function cxNeeds(t) {
  return CX_E.filter(e => e[1] === t);
}
function cxOpens(t) {
  return CX_E.filter(e => e[0] === t);
}
function cxStarted(c, t) {
  return treeDone(c, t) >= Math.min(CX_LV1, treeSize(t));
}
function cxReady(c, t) {
  return cxNeeds(t).every(e => cxStarted(c, e[0]));
}
function cxState(c, d, t) {
  const n = treeDone(c, t),
    z = treeSize(t),
    g = treeGate(c, d, t);
  return n >= z ? "done" : g ? "gated" : n > 0 ? "going" : cxReady(c, t) ? "open" : "later";
}
function cxShort(t) {
  return ((TREES[t] && TREES[t].s) || [SKILLS[t].name]).join(" ");
}
/* a skill, and the screen in this game that does it */
const CX_ROUTES = [
  [/offer is worth|job offer/i, "offers", "", "Put two offers side by side", 1],
  [/which account gets money first/i, "nxa", "", "See which account is next", 1],
  [/before you quit|cash cushion before you retire|time your biggest purchases/i, "cdn", "", "Start a countdown"],
  [
    /usual order for spending|sell by a rule|first year of withdrawals/i,
    "takeout",
    "order",
    "See which account to spend first",
  ],
  [/flexible spending rules|spend a bit less after bad/i, "takeout", "guard", "See your guardrails"],
  [/conversion ladder/i, "takeout", "bridge", "Run your Roth ladder"],
  [/health insurance until 65|between quitting and 65/i, "takeout", "aca", "Price health cover until 65"],
  [/stages of freedom|"am I done\?"|pick your date/i, "ages", "", "See your two ages"],
  [/windfall|lump sum|insurance payout|inheritance/i, "windfall", "", "Split extra money"],
  [/market crash|crash plan|bear market|rules for a crash/i, "stress", "", "Stress test your plan"],
  [/as life changes|real life changes/i, "blocks", "", "Stack your life events"],
  [/list every account|every account on one page/i, "ledger", "worth", "Open your ledger"],
  [/sign-?up bonus|how many new cards|new cards a year|each earn the bonus/i, "vault", "", "Open the card vault"],
  [/job's (free )?(retirement )?match|employer (offers|match)|full match/i, "sharp", "match", "Check your job's match"],
  [/expense ratio|fund fee|fees? you pay|cost of (your|each) fund/i, "compare", "fee", "X-ray your fee"],
  [
    /list (every|all|each)[^.]*(debt|owe)|every debt|payoff order|snowball|avalanche|highest[- ]rate/i,
    "debtplan",
    "",
    "Open the debt plan",
  ],
  [/utilization|credit (score|report)|card (balance|limit)s?/i, "metric", "util", "See your card use"],
  [/\$1,000|starter (fund|cushion)|first cushion|small emergency/i, "fdopen", "bill", "Run the $1,000 bill drill"],
  [
    /lose your job|laid off|income stops|months of (expenses|spending)|runway|emergency fund/i,
    "ladder",
    "",
    "See what you would use first",
  ],
  [/subscription|cancel (a|one|what)|recurring charge/i, "subs", "", "Hunt subscriptions"],
  [
    /statement|categor(y|ize)|where (your|the) money goes|track (your )?spending|every dollar/i,
    "mlog",
    "",
    "Open the money log",
  ],
  [/quarterly|estimated tax|set aside[^.]*tax|self[- ]employ/i, "gig", "tax", "Open taxes first"],
  [
    /hourly (wage|rate)|what you really earn|price (your|a) (time|hour)|your rate|raise your (rate|price)/i,
    "gig",
    "pay",
    "Price one unit of your work",
  ],
  [/tax bracket|marginal rate|effective (tax )?rate/i, "knask", "tax", "Add your tax rate"],
  [/Roth|IRA\b|HSA\b|tax-(free|friendly|advantaged) account/i, "sharp", "tax", "Mark your tax-friendly accounts", 1],
  [/net worth/i, "metric", "nw", "See your net worth", 1],
  [/savings rate|save [0-9]+%/i, "metric", "save", "See your savings rate"],
  [
    /4% rule|freedom number|enough to retire|financial independence number|FI number/i,
    "metric",
    "fi",
    "See your freedom number",
  ],
  [/split (the )?(bills|costs|rent)|share (costs|expenses)|roommate|partner pays/i, "fair", "", "Split costs fairly"],
  [
    /values|worth the (money|cost)|what matters (most )?to you|joy per dollar/i,
    "values",
    "",
    "Check money against values",
    1,
  ],
  [/car (payment|loan)|buy(ing)? a car/i, "qmopen", "car", "Does this car fit?"],
  [/mortgage|down payment|how much (house|home)/i, "qmopen", "home", "How much home fits?"],
  [/what[- ]if|scenario|compare (two|options)/i, "compare", "", "Put two moves side by side", 1],
];
function cxLink(t, i) {
  const s = SKILLS[t] && SKILLS[t].skills[i];
  if (!s) return null;
  const txt = s[0] + " " + s[1];
  for (const r of CX_ROUTES) {
    if (r[0].test(r[4] ? s[0] : txt) && typeof ACT[r[1]] === "function") return { a: r[1], v: r[2], l: r[3] };
  }
  return null;
}
function cxCoverage() {
  let n = 0,
    tot = 0;
  Object.keys(SKILLS).forEach(t =>
    SKILLS[t].skills.forEach((s, i) => {
      tot++;
      if (cxLink(t, i)) n++;
    })
  );
  return { n, tot };
}
function cxHere(c, d) {
  const bm = bestMove(c, d, todayISO()),
    t = bm && bm.id && String(bm.id).indexOf(":") > 0 ? String(bm.id).split(":")[0] : null;
  return t && SKILLS[t] ? t : (c.garden || []).find(x => SKILLS[x]) || "cash-safety-net";
}
function cxNode(c, d, t, x, y, r, mid) {
  const st = cxState(c, d, t),
    lab = (TREES[t] && TREES[t].s) || [SKILLS[t].name],
    n = treeDone(c, t);
  return `<g class="cxn ${st} ${mid ? "mid" : ""}" data-a="cxfocus" data-v="${t}" role="button" tabindex="0" aria-label="${esc(SKILLS[t].name)}"><circle cx="${x}" cy="${y}" r="${r}"></circle>${lab.map((l, k) => `<text x="${x}" y="${(y + (k - (lab.length - 1) / 2) * 13 + (mid ? -4 : 4)).toFixed(0)}" text-anchor="middle">${esc(l)}</text>`).join("")}${mid ? `<text class="cxp" x="${x}" y="${y + 26}" text-anchor="middle">${n} of ${treeSize(t)}</text>` : st === "done" ? `<text class="cxp" x="${x}" y="${y + r + 13}" text-anchor="middle">done</text>` : ""}</g>`;
}
function cxGraph(c, d, t) {
  const up = cxNeeds(t)
      .map(e => e[0])
      .slice(0, 4),
    dn = cxOpens(t)
      .map(e => e[1])
      .slice(0, 5),
    W0 = 340,
    cx = 170,
    cy = 160,
    xs = (n, i) => (n === 1 ? cx : Math.round(cx + (i - (n - 1) / 2) * Math.min(84, 300 / n)));
  const lines =
    up.map((u, i) => `<line x1="${xs(up.length, i)}" y1="72" x2="${cx}" y2="${cy - 46}"></line>`).join("") +
    dn.map((u, i) => `<line x1="${cx}" y1="${cy + 46}" x2="${xs(dn.length, i)}" y2="252"></line>`).join("");
  return `<svg class="cxsvg" viewBox="0 0 ${W0} 320" role="img" aria-label="${esc(SKILLS[t].name)}, what feeds it and what it opens">${up.length ? `<text class="cxcap" x="8" y="14">Works best after</text>` : ""}${dn.length ? `<text class="cxcap" x="8" y="314">Opens up</text>` : ""}${lines}${up.map((u, i) => cxNode(c, d, u, xs(up.length, i), 44, 29, false)).join("")}${cxNode(c, d, t, cx, cy, 46, true)}${dn.map((u, i) => cxNode(c, d, u, xs(dn.length, i), 278, 29, false)).join("")}</svg>`;
}
function cxTreeCard(c, d, t) {
  const st = cxState(c, d, t),
    g = treeGate(c, d, t),
    n = treeDone(c, t),
    z = treeSize(t),
    reg = REGIONS.find(r => r.id === TREES[t].r),
    nx = nextSkill(c, t),
    ups = cxNeeds(t),
    dns = cxOpens(t),
    wait = ups.filter(e => !cxStarted(c, e[0]));
  const skills =
    nx < 0
      ? []
      : [0, 1, 2]
          .map(k => nx + k)
          .filter(i => i < z && !skillDone(c, t + ":" + i))
          .slice(0, 3);
  return `<div class="tile stack" style="gap:6px"><div class="row between" style="gap:8px"><b>${esc(trackN(t))}</b><span class="pill ${st === "done" ? "okp" : st === "gated" || st === "later" ? "" : "info"}" style="flex:none">${st === "done" ? "Finished ✓" : n + " of " + z}</span></div><div class="tiny muted">${esc(reg ? reg.n : "")} · ${esc(TREE_ONE[t] || "")}</div>
 ${g ? `<div class="small">${esc(g.why)} ${esc(g.route || "")}</div>` : wait.length ? `<div class="small">Works best after <b>${wait.map(e => esc(cxShort(e[0]))).join("</b> and <b>")}</b>. You can still start here.</div>` : st === "done" ? "" : `<div class="small">Nothing is in the way. This one is open to you now.</div>`}
 ${
   skills.length
     ? `<b class="small">Next here</b><div class="stack" style="gap:6px">${skills
         .map((i, k) => {
           const s = SKILLS[t].skills[i],
             lk = cxLink(t, i);
           return `<div class="stack" style="gap:4px"><button class="rowbtn" data-a="skill" data-v="${t}:${i}" style="gap:8px"><span style="min-width:0">${k === 0 ? "➤ " : ""}${esc(s[0])}</span><span class="caret">›</span></button>${lk ? `<button class="ghost slim" style="align-self:flex-start" data-a="cxdo" data-k="${lk.a}" data-v="${lk.v}">In the game: ${esc(lk.l)}</button>` : ""}</div>`;
         })
         .join("")}</div>`
     : ""
 }
 ${ups.length ? `<details class="math"><summary>Why it works best after ${ups.length === 1 ? "that" : "those"}</summary><div class="inner stack small" style="gap:4px">${ups.map(e => `<div><b>${esc(cxShort(e[0]))}:</b> ${esc(e[2])}</div>`).join("")}</div></details>` : ""}
 ${dns.length ? `<details class="math"><summary>What this opens up (${dns.length})</summary><div class="inner stack small" style="gap:4px">${dns.map(e => `<div><b>${esc(cxShort(e[1]))}:</b> ${esc(e[2])}</div>`).join("")}</div></details>` : ""}
 <button class="ghost wide slim" data-a="mp" data-l="jump" data-id="${t}">Open this track on the map</button></div>`;
}
function cxList(c, d) {
  return REGIONS.map(r => {
    const ts = regionTrees(r.id);
    if (!ts.length) return "";
    const lv = areaLevel(c, d, r.id),
      L = lv.level;
    return `<b class="small" style="margin-top:4px">${esc(r.n)} <span class="tiny muted">Level ${L} of 5</span></b><div class="stack" style="gap:6px">${ts
      .map(t => {
        const st = cxState(c, d, t),
          ups = cxNeeds(t),
          dns = cxOpens(t);
        return `<button class="rowbtn" data-a="cxfocus" data-v="${t}" style="gap:8px"><span style="min-width:0"><b class="small">${esc(SKILLS[t].name)}</b><div class="tiny muted">${ups.length ? "After: " + ups.map(e => esc(cxShort(e[0]))).join(", ") : "A starting point"}${dns.length ? " · Opens: " + dns.map(e => esc(cxShort(e[1]))).join(", ") : ""}</div></span><span class="pill ${st === "done" ? "okp" : ""}" style="flex:none">${st === "done" ? "✓" : treeDone(c, t) + "/" + treeSize(t)}</span></button>`;
      })
      .join("")}</div>`;
  }).join("");
}
function cxNews(c) {
  const u = c.x && c.x.unl;
  return u && u.list && u.list.length && !u.seen ? u : null;
}
function cxSheet() {
  const c = C(),
    d = D || derive(c),
    w = W,
    here = cxHere(c, d),
    t = w.t && SKILLS[w.t] ? w.t : here,
    nw = cxNews(c),
    view = w.view || "pic";
  return (
    head("Menu", "How it all connects") +
    (nw
      ? `<div class="banner small"><b>Just opened:</b> ${nw.list.map(x => esc(cxShort(x))).join(", ")}. Reaching level 1 in ${esc(cxShort(nw.from))} did that.</div>`
      : "") +
    `<div class="seg" style="align-self:flex-start"><button class="${view === "pic" ? "on" : ""}" data-a="cxview" data-v="pic">Picture</button><button class="${view === "list" ? "on" : ""}" data-a="cxview" data-v="list">List</button></div>` +
    (view === "list"
      ? `<div class="small muted">Every track, what it works best after, and what it opens. Tap one to stand on it.</div>` +
        cxList(c, d)
      : `<div class="small muted">${t === here ? "You are here." : "Looking at another track."} Above is what feeds it. Below is what it opens. Tap a circle to stand on it.</div>${cxGraph(c, d, t)}${t !== here ? `<button class="ghost wide slim" data-a="cxfocus" data-v="${here}">Back to where I am: ${esc(cxShort(here))}</button>` : ""}${cxTreeCard(c, d, t)}`) +
    `<div class="tiny muted">A link is advice, never a lock. ${(() => {
      const k = cxCoverage();
      return k.n + " of the " + k.tot + " skills have a screen in this game that helps you do them.";
    })()}</div>`
  );
}
function cxSkillExtra(id) {
  const p = String(id).split(":"),
    t = p[0],
    i = +p[1];
  if (!SKILLS[t]) return "";
  const lk = cxLink(t, i),
    dns = cxOpens(t);
  return `<div class="stack cxextra" style="gap:6px">${lk ? `<button class="primary wide slim" data-a="cxdo" data-k="${lk.a}" data-v="${lk.v}">Do it in the game: ${esc(lk.l)}</button>` : ""}<button class="ghost wide slim" data-a="connect" data-v="${t}">How ${esc(cxShort(t))} connects${dns.length ? " (opens " + dns.length + ")" : ""}</button></div>`;
}
Object.assign(ACT, {
  connect: t => {
    const v = t && t.dataset && t.dataset.v,
      c = C();
    if (cxNews(c) && !G.demo) {
      W = { kind: "connect", t: SKILLS[v] ? v : null, view: "pic", news: 1 };
    } else W = { kind: "connect", t: SKILLS[v] ? v : null, view: "pic" };
    sheet(cxSheet);
    if (cxNews(c) && !G.demo) {
      c.x.unl.seen = todayISO();
      save();
      render();
    }
  },
  cxfocus: t => {
    if (!W || W.kind !== "connect") W = { kind: "connect" };
    W.t = t.dataset.v;
    W.view = "pic";
    sheet(cxSheet);
  },
  cxview: t => {
    W.view = t.dataset.v;
    drawSheet();
  },
  cxdo: t => {
    const a = t.dataset.k,
      v = t.dataset.v;
    if (typeof ACT[a] !== "function") return;
    ACT[a]({ dataset: { a, v, k: v } });
  },
});
(() => {
  /* finishing a skill can open tracks: notice it once */
  const _sd = ACT.skilldone;
  ACT.skilldone = function (t) {
    const c = C(),
      id = t.dataset.v,
      tr = String(id).split(":")[0],
      was = SKILLS[tr] ? cxStarted(c, tr) : true,
      before = SKILLS[tr]
        ? cxOpens(tr)
            .map(e => e[1])
            .filter(x => cxReady(c, x))
        : [];
    _sd(t);
    if (G.demo || !SKILLS[tr] || was || !cxStarted(c, tr)) return;
    const now = cxOpens(tr)
      .map(e => e[1])
      .filter(x => cxReady(c, x) && !before.includes(x) && treeDone(c, x) < treeSize(x));
    if (now.length) {
      c.x = c.x || {};
      c.x.unl = { d: todayISO(), from: tr, list: now };
      save();
      render();
    }
  };
})();
/* Part of skillSheet() in ui.js. Adds the block "how this skill connects" at the bottom of the open sheet, one time. */
function skillSheetConnect(id) {
  const f = SH;
  if (typeof f === "function" && !f.cx) {
    const g = () => f() + cxSkillExtra(id);
    g.cx = 1;
    SH = g;
    /* nav.js recorded the sheet before this part was added. Drop that record, so Back needs one tap. */
    if (typeof NVX !== "undefined" && NVX.st.length && NVX.st[NVX.st.length - 1].SH === f) NVX.st.pop();
    drawSheet();
  }
}

/* Part of msBoard() in missions.js. Adds the button "See how it all connects" at the bottom of the board. */
function msBoardConnect(h) {
  const a = "</div>";
  const i = h.lastIndexOf(a);
  return i < 0
    ? h
    : h.slice(0, i) + `<button class="ghost wide slim" data-a="connect">See how it all connects</button>` + h.slice(i);
}

/* Part of home() in ui.js. Adds the row "Just opened" one time, after a first skill level opens new tracks. */
function homeConnectRow(h) {
  const c = C(),
    nw = G.demo ? null : cxNews(c);
  if (!nw || typeof homeRowAdd !== "function") return h;
  return homeRowAdd(
    h,
    `<button class="rowbtn homerow" data-a="connect" data-v="${nw.from}"><span style="min-width:0"><b>Just opened: ${nw.list.map(x => esc(cxShort(x))).join(", ")}</b><div class="tiny muted">Level 1 in ${esc(cxShort(nw.from))} did that. See how it connects.</div></span><span class="pill new">New</span></button>`
  );
}
Object.assign(GLOSS, {
  track: [
    "Track",
    "One line of skills, from first step to mastery, like Debt payoff or Investing step by step. There are 25. Each has 25 skills in 5 levels.",
  ],
  worksbest: [
    "Works best after",
    "Advice about order, not a lock. Some things pay off more once something else is in place, like a small cushion before paying debt down hard.",
  ],
});
if (typeof MENU !== "undefined" && Array.isArray(MENU) && !MENU.some(m => m[1] === "connect")) {
  const i = MENU.findIndex(m => m[1] === "drills");
  MENU.splice(i >= 0 ? i + 1 : MENU.length, 0, [
    "How it all connects",
    "connect",
    "act",
    "Every skill track, what feeds it and what it opens",
  ]);
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
