/* SLAM the Game: screens. Plain words first. One pulsing next step. One ledger that every screen reads from. */
const KEY = "slamgame4";
const $ = s => document.querySelector(s);
const money = n => (n < 0 ? "-" : "") + "$" + Math.round(Math.abs(n)).toLocaleString();
const signed = n => (n >= 0 ? "+" : "-") + "$" + Math.round(Math.abs(n)).toLocaleString();
const esc = s =>
  String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
const nice = s => parseISO(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const clone = x => JSON.parse(JSON.stringify(x));
function fresh() {
  return {
    v: 4,
    chars: sampleChars(todayISO()),
    active: 0,
    house: { share: "No one" },
    gamer: false,
    coachDiary: true,
    flags: [],
    demo: true,
  };
}
function load() {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return null;
    const g = JSON.parse(s);
    if (!(g && g.chars && g.chars.length)) return null;
    g.chars = g.chars.map(migrate);
    return g;
  } catch (e) {
    return null;
  }
}
/* SAVE THE GAME.
   save() is the full function. It calls each part by name.
   saveQuiet() saves and shows no "Saved" mark. ux.js uses it for its own notes.
   saveBase() writes the game to the browser storage. */
function save() {
  if (typeof saveCoachMark === "function") saveCoachMark(); /* supa.js: the admin changed the game of a player */
  if (typeof saveBackSnap === "function") saveBackSnap(); /* back.js: keep the numbers of today for the card */
  saveQuiet();
  if (typeof saveFlash === "function") saveFlash(); /* ux.js: show "Saved" for a moment */
}
function saveQuiet() {
  if (typeof saveStamp === "function") saveStamp(); /* cloud.js: record the time of the save */
  saveBase();
  if (typeof clQueue === "function") clQueue(); /* cloud.js: send the game to the account a moment later */
}
function saveBase() {
  try {
    localStorage.setItem(KEY, JSON.stringify(G));
  } catch (e) {
    report(e, "ui.js: saveBase");
  }
}
let G = load() || fresh(),
  tab = "home",
  MP = { r: null, t: null },
  mapMode = "orbit",
  SH = null,
  W = null,
  D = null,
  openUnf = false,
  MQ = [],
  MSUM = [];
const C = () => G.chars[G.active];
/* ---------- THEMES: a look (colors, type) and a voice (words). Mix any look with any voice. All original worlds. ---------- */
const THEMES = {
  sapphire: { n: "Sapphire", tag: "The classic. Plain words, nothing extra.", sw: ["#3f6dff", "#0c1d57"] },
  fae: {
    n: "Fae Courts",
    tag: "Romantic fantasy. Courts, bargains and starlight.",
    sw: ["#b06cff", "#250f4c"],
    eras: [
      "The Thornwood",
      "First Ward",
      "The Court's Gift",
      "Bargain Broken",
      "The Stone Keep",
      "Seed of Seasons",
      "The Quiet Throne",
      "Summerdrift",
      "Unbound",
      "Starlit Legacy",
    ],
    realm: ["The Hollow", "Open Sky"],
    next: "What the court asks next",
    path: "Your path through the courts",
    done: "Bargain kept",
    go: "Onward",
    upnext: "Next bargain",
    daily: "Morning glimmer",
    payday: "Tithe day",
    month: "Full moon reckoning",
    move: "Mark a turn of fortune",
    praise: ["The court takes notice.", "Power, earned and kept.", "A promise kept is a kind of magic."],
    whisper: [
      "Every bargain you keep makes you harder to bind.",
      "Even the oldest courts were built one stone at a time.",
      "Slow magic is still magic.",
    ],
  },
  coven: {
    n: "Night Coven",
    tag: "Gothic vampire romance. Patience, velvet and very long plans.",
    sw: ["#d42a4e", "#28070f"],
    eras: [
      "The Long Night",
      "First Candle",
      "Old Blood's Gift",
      "Unchained",
      "The Manor Walls",
      "The Long View",
      "Still Waters",
      "Moonlit Shore",
      "Free of the Night",
      "The Eternal Name",
    ],
    realm: ["The Crypt", "The Night Air"],
    next: "What tonight asks of you",
    path: "Your nights, in order",
    done: "It is done",
    go: "Onward",
    upnext: "Tomorrow night",
    daily: "Dusk check",
    payday: "Feast night",
    month: "Blood moon reckoning",
    move: "Record a turn of fate",
    praise: ["Patience is the oldest power.", "Stronger than you were at dusk.", "You have forever. You used tonight."],
    whisper: [
      "Immortals get rich the slow way. So can you.",
      "A century starts with one night.",
      "Nothing compounds like time.",
    ],
  },
  tabletop: {
    n: "Tabletop Quest",
    tag: "Dice, parties and dungeon crawls. Your money as a campaign.",
    sw: ["#3fb37f", "#0e2a1f"],
    eras: [
      "The Pit",
      "Camp Supplies",
      "Free Loot",
      "Curse Lifted",
      "The Keep",
      "The Long Campaign",
      "Side Quest Life",
      "Easy Mode",
      "Campaign Won",
      "New Game Plus",
    ],
    realm: ["The Depths", "The Overworld"],
    next: "Your next quest",
    path: "Quest log",
    done: "Quest complete",
    go: "Continue",
    upnext: "Next quest",
    daily: "Daily roll",
    payday: "Split the loot",
    month: "Long rest",
    move: "Log your loot",
    praise: ["Critical hit.", "Experience gained.", "The party levels up."],
    whisper: [
      "Roll for initiative. Then do the boring thing that works.",
      "Nobody beats the campaign at level 1.",
      "Loot is only loot if you keep it.",
    ],
  },
  north: {
    n: "Northlands",
    tag: "Open-world northern fantasy. Halls, sagas and long winters.",
    sw: ["#4a94ba", "#112838"],
    eras: [
      "The Deep Mine",
      "Winter Stores",
      "The Hold's Gift",
      "Debts Burned",
      "The Stone Hall",
      "Seeds for Spring",
      "The Quiet Hearth",
      "Fair Winds",
      "Free Folk",
      "A Saga Told",
    ],
    realm: ["The Mines", "The High Road"],
    next: "Your next deed",
    path: "Your road",
    done: "Deed done",
    go: "Onward",
    upnext: "Next deed",
    daily: "Dawn watch",
    payday: "Share the spoils",
    month: "Moot at the hall",
    move: "Carve it in the record",
    praise: ["The hall will hear of this.", "Steel sharpens with use.", "One more stone on the wall."],
    whisper: [
      "Winter comes for the unprepared. You are preparing.",
      "Every saga starts with a small deed.",
      "A full storehouse is the best armor.",
    ],
  },
};
const LK = () => thUse(G.look, "sapphire"),
  VC = () => thUse(G.voice, LK());
const VO = () => THEMES[VC()];
const V = (k, plain) => VO()[k] || plain;
/* themed word with the plain one right next to it, so nothing gets confusing */
const VT = (k, plain) =>
  VO()[k]
    ? `${VO()[k]} <span class="tiny muted" style="font-family:var(--body);text-transform:none;letter-spacing:0">${plain}</span>`
    : plain;
const EP = i => ERAS[i]["n"];
function eraN(i) {
  const v = VO();
  return v.eras ? v.eras[i] + " (" + EP(i) + ")" : EP(i);
}
function eraT(i) {
  const v = VO();
  return v.eras ? v.eras[i] : EP(i);
}
function realmN(r) {
  const v = VO();
  return v.realm ? v.realm[r === "Underground" ? 0 : 1] : r;
}
function pick(a, seed) {
  return a[Math.abs(seed) % a.length];
}
function themeCard() {
  const lk = LK(),
    vc = VC(),
    ids = Object.keys(THEMES).filter(t => adOk(THEMES[t]));
  return `<div class="card"><div class="row between"><h3>Theme</h3><span class="tiny muted">${THEMES[lk].n}${vc !== lk ? " look, " + THEMES[vc].n + " voice" : ""}</span></div><div class="small muted">Changes how the game looks and talks. Your numbers and your steps stay exactly the same, and the plain word always sits next to the themed one.</div>
 <div class="stack" style="margin-top:8px">${ids.map(t => `<button class="rowbtn ${lk === t && vc === t ? "sel" : ""}" data-a="theme" data-v="${t}"><span><b>${THEMES[t].n}</b><div class="tiny muted">${THEMES[t].tag}</div></span><span class="swatch" style="background:linear-gradient(135deg,${THEMES[t].sw[0]},${THEMES[t].sw[1]})"></span></button>`).join("")}</div>
 <details style="margin-top:10px" ${lk !== vc ? "open" : ""}><summary>Blend two themes</summary><div class="inner stack">${q("Looks like", `<div class="chips">${ids.map(t => `<button class="chip ${lk === t ? "on" : ""}" data-a="look" data-v="${t}">${THEMES[t].n}</button>`).join("")}</div>`)}${q("Talks like", `<div class="chips">${ids.map(t => `<button class="chip ${vc === t ? "on" : ""}" data-a="voice" data-v="${t}">${THEMES[t].n}</button>`).join("")}</div>`, "Example: Night Coven colors with Tabletop Quest words.")}</div></details>
 <div class="row between" style="margin-top:10px"><span class="small">Show my freedom date<div class="tiny muted">Retirement math, for the FIRE crowd. Off by default.</div></span><div class="seg"><button class="${G.fire ? "on" : ""}" data-a="fire" data-v="1">On</button><button class="${G.fire ? "" : "on"}" data-a="fire" data-v="0">Off</button></div></div></div>`;
}
function applyLook() {
  if (typeof document !== "undefined" && document.body && document.body.dataset) document.body.dataset.look = LK();
}

const T = (plain, game) => plain + (G.gamer ? ` <span class="tiny muted">(${game})</span>` : "");
const ib = k => `<button class="i" data-a="info" data-k="${k}" aria-label="What is this?">i</button>`;
const GLOSS = {
  runway: ["Runway", "How many months you could live on your cash if money stopped coming in."],
  protection: [
    "Protection",
    "How covered you are if something goes wrong: insurance, deductibles, and who gets your money.",
  ],
  level: ["How far to freedom", "How far you are toward your freedom number, as a percent."],
  fi: ["Freedom number", "25 times a year of your spending. At that point your investments can pay for your life."],
  eta: [
    "Freedom date",
    "How old you'll be when you reach your freedom number if nothing changes. Every good move pulls it closer.",
  ],
  spoons: [
    "How today went",
    "Your own score for how you handled money today, 1 to 5. After a rough day the game hands you smaller steps.",
  ],
  garden: [
    "Your focus",
    "Each track is a set of skills. You can only work on a few at once, because time and energy are limited. Pause a track and your next one gets a head start. Finished tracks stay finished.",
  ],
  free: [
    "Free to spend",
    "What's left for food, fun and everything else after your bills and your goals are covered. It's the number you can spend without thinking twice.",
  ],
  realm: [
    "Underground or Surface",
    "Underground means you owe more than you own. Surface means you own more than you owe. Crossing over is one of the biggest moments in the game.",
  ],
  eff: [
    "Efficiency",
    "How much this step moves you for the effort it takes, from 0 to 100. It weighs the payoff, how well it fits where you are right now, whether it makes you safer, and how long it takes.",
  ],
  ownowe: [
    "Own minus owe",
    "Everything you have (cash and investments) minus everything you owe. This is the number the game watches. Some call it net worth.",
  ],
};

/* ---------- small builders ---------- */
function chipsRow(k, opts, val, a) {
  a = a || "set";
  return `<div class="chips">${opts.map(o => `<button class="chip ${String(val) === String(o) ? "on" : ""}" data-a="${a}" data-k="${k}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
}
function multiRow(k, opts, arr) {
  return `<div class="chips">${opts.map(o => `<button class="chip ${arr.includes(o) ? "on" : ""}" data-a="tog" data-k="${k}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
}
/* ONE QUESTION IN A SHEET: a label, the answer buttons (inner), and a help line.
   q() is the full function. It calls each part by name. qBase() is the part from this file. */
function q(label, inner, help) {
  /* fork.js: the daily question "How well did you do with money today" becomes the fork check. */
  const fk = typeof qFork === "function" ? qFork(label) : null;
  if (fk !== null) return fk;
  /* tidy.js: records the question. In a sheet with two or more questions, it returns a folded question. */
  const td = typeof qTidy === "function" ? qTidy(label, inner, help) : null;
  return td !== null ? td : qBase(label, inner, help);
}
function qBase(label, inner, help) {
  return `<div class="field"><div class="small">${label}</div>${inner}${help ? `<div class="tiny muted">${help}</div>` : ""}</div>`;
}
function bar(p, cls) {
  return `<div class="bar ${cls || ""}"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></div>`;
}
function pips(n, on) {
  return `<div class="pips">${Array.from({ length: n }, (_, i) => `<i class="${i < on ? "on" : ""}"></i>`).join("")}</div>`;
}
const rank = id => nodeRankRaw(C(), D, id);
const mo = x => (Math.round(x * 10) / 10).toFixed(1);

/* number entry: tap a range, or tap out the exact number. No sliders. */
const RG_IN = [
  [0, "Nothing right now"],
  [50, "Under $100"],
  [175, "$100 to $250"],
  [375, "$250 to $500"],
  [750, "$500 to $1,000"],
  [1250, "$1,000 to $1,500"],
  [2000, "$1,500 to $2,500"],
  [3000, "$2,500 to $3,500"],
  [4250, "$3,500 to $5,000"],
  [6000, "$5,000 to $7,000"],
  [8500, "$7,000 to $10,000"],
  [12000, "Over $10,000"],
];
const RANGES = {
  take: RG_IN,
  low: RG_IN,
  spend: RG_IN.slice(4),
  cash: [
    [0, "Almost nothing"],
    [500, "A few hundred"],
    [1500, "$1,000 to $2,000"],
    [3500, "$2,000 to $5,000"],
    [7500, "$5,000 to $10,000"],
    [17500, "$10,000 to $25,000"],
    [40000, "Over $25,000"],
  ],
  inv: [
    [0, "Nothing yet"],
    [2500, "Under $5,000"],
    [12500, "$5,000 to $20,000"],
    [35000, "$20,000 to $50,000"],
    [100000, "$50,000 to $150,000"],
    [300000, "$150,000 to $500,000"],
    [750000, "$500,000 to $1 million"],
    [1500000, "Over $1 million"],
  ],
  debt: [
    [500, "Under $1,000"],
    [3000, "$1,000 to $5,000"],
    [10000, "$5,000 to $15,000"],
    [27500, "$15,000 to $40,000"],
    [70000, "$40,000 to $100,000"],
    [150000, "Over $100,000"],
  ],
};
const PFX = { n: "incs", c: "cashes", v: "invs", d: "debts", s: "spends" };
RANGES.cat = [
  [0, "Nothing"],
  [100, "Under $200"],
  [300, "$200 to $400"],
  [550, "$400 to $700"],
  [850, "$700 to $1,000"],
  [1250, "$1,000 to $1,500"],
  [2000, "$1,500 to $2,500"],
  [3000, "Over $2,500"],
];
function isGhost(k) {
  if (k === "low") return !!W && !C().sharp.low && !(W.t && W.t.low);
  return !!W && k[1] === ":" && !!PFX[k[0]] && !W.o[PFX[k[0]]][+k.slice(2)].s && !(W.t && W.t[k]);
}
function padGet(k) {
  return k[0] === "b" && k[1] === ":"
    ? W.o.alloc[k.slice(2)] || 0
    : k[1] === ":"
      ? W.o[PFX[k[0]]][+k.slice(2)].amt
      : W.o[k];
}
function padSet(k, v) {
  if (k[0] === "b" && k[1] === ":") {
    const b = k.slice(2),
      m = payMath(W.o);
    W.o.alloc[b] = Math.min(v, m.rem + (W.o.alloc[b] || 0));
  } else if (k[1] === ":") W.o[PFX[k[0]]][+k.slice(2)].amt = v;
  else W.o[k] = v;
}
function keypad(k) {
  return `<div class="pad">${["1", "2", "3", "4", "5", "6", "7", "8", "9", "clr", "0", "del"].map(x => `<button class="key" data-a="key" data-k="${k}" data-v="${x}">${x === "del" ? "Delete" : x === "clr" ? "Clear" : x}</button>`).join("")}</div><div class="tiny muted" style="text-align:center;margin-top:4px">Whole dollars. Skip the cents.</div>`;
}
function numq(k, label, rk, opt) {
  opt = opt || {};
  const v = padGet(k) || 0,
    open = W.pad === k,
    rs = RANGES[rk] || [];
  const gh = isGhost(k);
  if (opt.compact && !open)
    return `<div class="row between numrow"><span class="small">${label}${gh ? `<div class="tiny muted">Guess</div>` : ""}</span><span class="row"><b class="${gh ? "guess" : ""}">${money(v)}</b><button class="ghost slim" data-a="padopen" data-k="${k}">Change</button></span></div>`;
  return `<div class="field ${opt.compact ? "numopen" : ""}"><div class="small">${label}</div><div class="val ${gh ? "guess" : ""}">${money(v)}${gh ? ` <span class="tiny muted">guess</span>` : ""}</div>${rs.length ? `<div class="chips">${rs.map(r => `<button class="chip ${v === r[0] ? "on" : ""}" data-a="rng" data-k="${k}" data-v="${r[0]}">${r[1]}</button>`).join("")}</div>` : ""}${open ? keypad(k) + (opt.compact ? `<button class="ghost slim" data-a="padclose">Done with this one</button>` : "") : `<button class="ghost slim" data-a="padopen" data-k="${k}">${rs.length ? "Type the exact number instead" : "Type the number"}</button>`}${opt.help ? `<div class="tiny muted">${opt.help}</div>` : ""}</div>`;
}
function rowsBlock(pf, rows, rk) {
  return rows.length === 1
    ? numq(pf + ":0", esc(rows[0].k), rk)
    : rows.map((x, i) => numq(pf + ":" + i, esc(x.k), rk, { compact: true })).join("");
}

/* ---------- state changes ---------- */
function addBadge(c, id, label) {
  if (c.badges.some(b => b.id === id)) return null;
  c.badges.push({ id, label, d: todayISO() });
  return label;
}
function settle(c, prevRealm) {
  const d = derive(c),
    got = [];
  timeBadges(c, d, got);
  if (d.era < c.peakEra) c.dark = true;
  if (c.dark && d.era >= c.peakEra) {
    c.dark = false;
    const b = addBadge(c, "heroic" + d.era, "Heroic comeback");
    if (b) got.push(b);
  }
  if (d.era > c.peakEra) c.peakEra = d.era;
  if (prevRealm === "Underground" && d.realm === "Surface") {
    const b = addBadge(c, "surfaced", "Surfaced: you own more than you owe");
    if (b) got.push(b);
  }
  const t = [
    [d.nodesDone >= 1, "firstnode", "First step done"],
    [d.mus >= 5, "muscle5", "Five muscles trained"],
    [c.streak >= 3, "streak3", "Three days in a row"],
    [c.streak >= 7, "streak7", "Seven days in a row"],
    [c.paydays.length >= 1, "pay1", "First payday round"],
    [c.paydays.length >= 3, "pay3", "Three payday rounds"],
    [d.skillsDone >= 10, "skills10", "Ten skills learned"],
    [c.moves.length >= 1, "move1", "First money move logged"],
    [c.debts.some(x => x.amt === 0 && x.was > 0), "debt0", "A debt paid off"],
  ];
  if (c.placed) for (let e = 1; e <= d.era; e++) t.push([true, "era" + e, "Reached " + eraN(e)]);
  t.forEach(x => {
    if (x[0]) {
      const b = addBadge(c, x[1], x[2]);
      if (b) got.push(b);
    }
  });
  return got;
}
function replaceSnap(c, ver) {
  const d = derive(c),
    s = snapshot(c, d, todayISO(), ver),
    l = c.hist[c.hist.length - 1];
  if (l && l.d === s.d) c.hist[c.hist.length - 1] = s;
  else c.hist.push(s);
}
/* every change to the ledger goes through here, so the era, badges and history stay in step */
function afterMoney(c, prevRealm, verified) {
  syncAll(c);
  const raw = derive(Object.assign({}, c, { confEra: null })).rawEra;
  if (!c.placed) {
    c.confEra = raw;
    c.peakEra = raw;
    c.dark = false;
  } else if (verified || raw < c.confEra) c.confEra = raw;
  replaceSnap(c, !!verified);
  const got = settle(c, prevRealm);
  save();
  return got;
}
function markDay(c) {
  const t = todayISO();
  if (c.lastDaily === t) return;
  c.streak = c.lastDaily === addDays(t, -1) ? c.streak + 1 : 1;
  c.lastDaily = t;
}
/* THE NEXT STEP: the one thing that the game tells the player to do now.
   nextStep(c, d) is the full function. It calls each part by name.
   nextStepBase(c, d) is the part from this file. */
function nextStep(c, d) {
  let r = typeof nextStepFork === "function" ? nextStepFork(c) : null; /* fork.js: at the fork limit, only one thing */
  if (r === null && typeof nextStepPayday === "function") r = nextStepPayday(c); /* ux.js: on payday, payday is first */
  if (r === null) r = nextStepBase(c, d);
  if (typeof nextStepStar === "function") r = nextStepStar(c, d, r); /* eras.js: a key moment that the player reached */
  return r;
}
function nextStepBase(c, d) {
  const t = todayISO(),
    bm = bestMove(c, d, t);
  if (c.gentle && !c.gwin && !G.demo)
    return {
      t: "One small win first",
      s: "Before any numbers. It takes about a minute, and you pick it.",
      a: "gwin",
      l: "Pick my first win",
    };
  if (d.era >= 7 && !c.cross7)
    return {
      t: "You've reached a crossroads",
      s: "You already have enough saved to retire on time. What now?",
      a: "cross",
      v: 7,
      l: "Choose my path",
    };
  if (d.era >= 6 && !c.cross6)
    return {
      t: "You've reached a crossroads",
      s: "Even the bare minimum gets you there now. Keep pushing, or change something?",
      a: "cross",
      v: 6,
      l: "Choose my path",
    };
  if (d.pending)
    return {
      t: "You may have reached " + eraN(d.rawEra),
      s: "Confirm it with your real balances in a monthly session.",
      a: "month",
      l: "Start my monthly session",
    };
  if (!G.demo && !c.placed && typeof l1Where === "function" && !(c.bon && c.bon[1]) && sharpNext(c, t))
    return {
      t: "Play the 2-minute picture",
      s: "Three quick tap games fill in your numbers. No typing. A guess is fine.",
      a: "l1",
      l: c.l1 && c.l1.intro ? "Keep playing" : "Play",
    };
  const sq = sharpNext(c, t);
  if (sq) {
    const sl = sharpList(c),
      dn = sl.filter(k => isSharp(c, k)).length;
    return {
      t: "Make your numbers real",
      s: "Next: " + SHARP_Q[sq].toLowerCase() + ". A few taps. " + dn + " of " + sl.length + " done.",
      a: "sharp",
      v: sq,
      l: dn ? "Keep going" : "Start",
    };
  }
  const due = routineDue(c, t)[0];
  if (due)
    return {
      t: "Due today: " + routineLabel(c, due),
      s: due.auto
        ? "Check that it went through, then confirm it here."
        : "Do it, then tap the button and your accounts update.",
      a: "rdo",
      v: due.id,
      l: due.auto ? "Yes, it happened" : "Did it",
    };
  if (c.payKnown && t >= c.payNext)
    return {
      t: "It's payday",
      s: "Tell the game what you got paid and where it goes. About 2 minutes.",
      a: "payday",
      l: "Play payday round",
    };
  const last = c.hist[c.hist.length - 1];
  if (c.placed && last && daysBetween(last.d, t) >= 30)
    return {
      t: "Time for your monthly session",
      s: "Update your numbers and see how far you moved.",
      a: "month",
      l: "Start my monthly session",
    };
  if (c.lastDaily !== t)
    return {
      t: "Today's one-minute check",
      s: "Guess your balance, say how money felt, and log anything that moved.",
      a: "daily",
      l: "Do today's check",
    };
  return { t: bm.title, s: bm.why, a: "best", l: "Do this step", best: true, id: bm.id };
}

/* ---------- HOME ---------- */
let LASTNS = null,
  NEWAT = 0;
function sharpVal(c, k, ok) {
  const v =
    k === "take"
      ? c.take
      : k === "spend"
        ? c.spend
        : k === "cash"
          ? rsum(c.cashes)
          : k === "debt"
            ? c.debt
            : k === "inv"
              ? c.inv
              : null;
  return v === null ? "" : `<span class="${ok ? "" : "guess"}">${money(v)}</span>`;
}
/* HOME SCREEN.
   home() makes the full screen. It calls each part by name, in the load order of the files.
   A part from a later file can be absent while the page loads. Thus each call has a typeof test.
   homeBase() is the part from this file. */
function home() {
  /* back.js: compare with the last visit. Do this before the screen is made. */
  const back = typeof homeBackSync === "function" ? homeBackSync() : null;
  let h = homeTop();
  if (typeof homeRevealRow === "function") h = homeRevealRow(h); /* reveal.js: the row "Meet your character" */
  if (typeof homeTourRow === "function") h = homeTourRow(h); /* drills.js: the row for the 3-tap tour */
  if (typeof homeKnowStrip === "function") h = homeKnowStrip(h); /* know.js: the strip "What you already know" */
  if (typeof homeConnectRow === "function") h = homeConnectRow(h); /* connect.js: the row "Just opened" */
  if (back) h = homeBackRow(h, back.c, back.w); /* back.js: the welcome-back row */
  if (typeof homeAddonAsk === "function") homeAddonAsk(); /* addon.js: ask about an add-on that waits */
  if (typeof homeForkRow === "function") h = homeForkRow(h); /* fork.js: the row for the fork check */
  if (typeof homeAccountLine === "function") h = homeAccountLine(h); /* eras.js: the account recommendation */
  if (typeof homeCoachNote === "function") h = homeCoachNote(h); /* supa.js: the note "the coach made a change" */
  return h;
}
/* The top of Home: the welcome screen, or the quiet screen, or the full screen with its first lines. */
function homeTop() {
  /* ux.js: a new player sees the welcome screen */
  const wel = typeof homeWelcome === "function" ? homeWelcome() : null;
  if (wel !== null) return wel;
  /* year.js: a rest window makes Home quiet */
  const quiet = typeof homeQuiet === "function" ? homeQuiet() : null;
  let h = quiet !== null ? quiet : homeBase();
  if (typeof homePlanLine === "function") h = homePlanLine(h); /* planner.js: the line "Today's plan" */
  if (typeof homeQuadTop === "function") h = homeQuadTop(h); /* ux.js: the tab title and the four tiles */
  return h;
}
function homeBase() {
  const c = C(),
    d = D,
    nb = newbie(c),
    gt = !!c.gentle,
    t = todayISO(),
    ns = nextStep(c, d),
    conds = conditions(c, d, t),
    uf = unfinished(c, d),
    nx = d.era + 1,
    real = c.placed || G.demo;
  const sl = sharpList(c),
    sdn = sl.filter(k => isSharp(c, k)).length,
    showPath = real || !sharpNext(c, t),
    path = showPath ? candidates(c, d, t).slice(0, 5) : [];
  const steps = nx < 10 ? eraSteps(c, d, nx) : [],
    sd = steps.filter(x => x.done).length,
    unsharp = sl.filter(k => !isSharp(c, k)),
    parked = Object.keys(c.park).filter(id => daysBetween(c.park[id], t) < 7);
  const bad = conds.filter(x => x.t === "debuff" || x.t === "warn"),
    good = conds.filter(x => x.t === "buff" || x.t === "info"),
    mm = monthMoves(c, t.slice(0, 7)),
    bt = better(c, d);
  const cond = x =>
    `<div class="cond"><span class="pill ${x.t}">${esc(x.n)}</span><div class="small muted">${esc(x.d)}</div>${x.fix ? `<button class="ghost slim" data-a="${x.fix.a}" data-v="${x.fix.v || ""}">${x.fix.l}</button>` : ""}</div>`;
  const others = G.chars.length > 1 && !G.demo,
    nk = c.name + "|" + ns.t;
  if (!SH) {
    if (LASTNS !== null && LASTNS !== nk && LASTNS.split("|")[0] === c.name) NEWAT = Date.now();
    LASTNS = nk;
  }
  const isNew = Date.now() - NEWAT < 15000;
  return `<div class="stack">
 ${G.demo ? `<div class="card next pulse"><div class="eyebrow">Start here</div><h2 class="glow" style="margin:6px 0 4px">Make your own character</h2><div class="small"><b>SLAM the Game: your money, one small step at a time.</b> Free, and your numbers stay on this phone.</div><div class="small" style="margin-top:6px">About 15 taps to your first plan. No numbers and no typing. What you see below is a sample person, so you can look around first.</div><div class="tiny muted" style="margin-top:6px">Education and practice, not personal financial advice.</div><button class="primary wide" style="margin-top:10px" data-a="start">Now let's do you</button><button class="ghost wide slim" style="margin-top:8px" data-a="nextsample">Show me a different sample</button></div>` : ""}
 <div class="row between"><div><h1>${esc(c.name)}</h1><div class="small muted">${esc(chapterOf(c))}</div></div>${real && !gt ? `<span class="row"><span class="pill ${d.realm === "Underground" ? "under" : "surface"}">${realmN(d.realm)}</span>${ib("term:realm")}</span>` : ""}</div>
 <div class="card ${G.demo ? "" : "next pulse"} ${isNew ? "pop" : ""}"><div class="row between"><div class="eyebrow">${G.demo ? esc(c.name) + "'s next step" : V("next", "Your next step")}</div>${isNew ? `<span class="pill new">New</span>` : ""}</div><h2 class="glow" style="margin:6px 0 4px">${ns.best && ns.id ? stepHTML(ns.id, ns.t) : esc(ns.t)}</h2><div class="small">${esc(ns.s)}</div>${
   !real && ns.a === "sharp"
     ? `<div class="tiny muted" style="margin-top:8px">Faded numbers are guesses for people like you. They don't count until you make them real.</div><div class="stack" style="margin-top:6px">${sl
         .map(k => {
           const ok = isSharp(c, k);
           return `<button class="rowbtn ${ok ? "okrow" : k === ns.v ? "sel" : ""}" data-a="sharp" data-v="${k}"><span>${SHARP_Q[k]}</span><span class="row">${sharpVal(c, k, ok)}<b class="tiny">${ok ? "Real ✓" : k === ns.v ? "Start here ›" : "›"}</b></span></button>`;
         })
         .join("")}</div>`
     : `<button class="primary wide" style="margin-top:10px" data-a="${ns.a}" data-v="${ns.v || ""}">${ns.l}</button>`
 }${G.demo ? "" : `<div class="tiny muted" style="margin-top:6px">${VO().whisper ? "<i>" + pick(VO().whisper, c.streak + c.hist.length + Object.keys(c.nodes).length) + "</i>" : "The glowing card is always the one thing to do next."}</div>`}</div>
 ${survivalCard(c, d) || leverCard(c, d)}
 ${typeof campCard === "function" ? campCard(c, d) : ""}
 ${lifeCard(c)}
 ${movesCard(c, d)}
 ${showPath ? pathCard(c, d, t, ns, real, ds("path")) : `<div class="card dim" ${ds("path")}><h3>Your path</h3><div class="small muted">Your step-by-step path shows up once your numbers are close. ${sl.length - sdn} to go.</div></div>`}
 ${
   real
     ? `<div class="card" ${ds("era")}><div class="row between"><div class="tiny muted">${d.era === 0 ? "You are in the starting era" : "You are in era " + d.era + " of 9"}</div>${ib("era:" + d.era)}</div><h2>${eraHead(d)}</h2><div class="small muted">${eraOne(d)}</div>
  ${nx < 10 ? `<div class="small" style="margin-top:8px"><b>Next era: ${eraN(nx)}.</b> ${ERAS[nx].gate}. <b data-fid="v:eraeta">${eraWhen(c, d, goalSim(c), nx)}.</b></div>${steps.length ? `<div class="tiny muted" style="margin-top:4px"><span data-fid="v:steps">${sd} of ${steps.length} steps done</span></div>${bar((sd / steps.length) * 100)}` : ""}` : ""}</div>`
     : `<div class="card dim" ${ds("era")}><div class="row between"><div class="tiny muted">Your era</div>${ib("era:" + d.era)}</div><h2>Not set yet</h2><div class="small muted">A guess for someone like you: <span class="guess">${eraName(d)}</span>. It becomes yours when your numbers are real.</div></div>`
 }
 ${freeCard(c, d, ds("free"))}
 ${goalsCard(c, d, ds("goals"))}
 ${real ? rateTile(c, d, ds("rate", nb)) : ""}
 ${
   real
     ? `<div class="grid2" ${ds("tiles", bt.pct === 0 && !monthFlow(c, t.slice(0, 7)).n)}><div class="tile"><div class="tiny muted">Since you started</div><div class="big" data-fid="v:bt">${bt.pct > 0 ? bt.pct + "% better" : bt.pct < 0 ? Math.abs(bt.pct) + "% behind" : "Day 1"}</div><div class="tiny muted" style="margin-top:4px">${bt.pct === 0 ? "Your first money move shows up here." : "Own minus owe went from " + money(bt.from) + " to " + money(bt.now)}</div></div>
 <div class="tile"><div class="tiny muted">This month, logged</div>${(() => {
   const mf = monthFlow(c, t.slice(0, 7));
   return mf.n
     ? `<div class="small" style="margin-top:4px">In <b data-fid="v:min">${money(mf.inn)}</b></div><div class="small">Out <b data-fid="v:mout">${money(mf.out)}</b></div><div class="small">Paid on debt <b data-fid="v:mdebt">${money(mf.debt)}</b></div>`
     : `<div class="small muted" style="margin-top:4px">Nothing logged yet. Tap + Log at the bottom.</div>`;
 })()}</div></div>
 ${G.fire ? `<div class="tile" ${ds("tiles")}><div class="row between"><span class="tiny muted">Freedom date</span>${ib("term:eta")}</div><div class="big">${freeAt(c) == null ? "Not yet" : "Age " + (c.age + Math.round(freeAt(c) / 12))}</div><div class="tiny muted">${freeAt(c) == null ? "Needs a gap between money in and money out" : freeAt(c) <= 0 ? "You're there" : fmtDur(freeAt(c)) + " from now"}${d.level > 0 ? " · " + d.level + "% of the way" : ""}. This assumes your life costs what it costs today${c.home === "With family" ? ", plus " + money(c.moveOut) + " a month for when you move out" : ""}. A partner, kids or a move changes it.</div></div>` : ""}
 <div class="card stack" ${ds("bars", nb)}><div><div class="row between small"><span>${T("Runway", "HP")} ${ib("term:runway")}</span><span>${mo(c.months)} of ${mo(d.target)} months</span></div>${bar(d.hp * 100, "hp")}</div>
 <div><div class="row between small"><span>${T("Protection", "AC")} ${ib("term:protection")}</span><span>${d.acDone} of ${d.acMax}</span></div>${bar(d.acMax ? (d.acDone / d.acMax) * 100 : 0, "ac")}</div></div>
 ${bad.length ? (gt ? `<details ${ds("watch")}><summary>Things to keep an eye on (${bad.length})</summary><div class="inner stack">${bad.map(cond).join("")}</div></details>` : `<div class="card" ${ds("watch")}><div class="tiny muted" style="margin-bottom:6px">Watch out for (${bad.length})</div><div class="stack">${bad.map(cond).join("")}</div></div>`) : ""}
 ${good.length ? `<details ${ds("going", nb)}><summary>Going for you (${good.length})</summary><div class="inner stack">${good.map(cond).join("")}</div></details>` : ""}
 <details ${ds("levels", nb)}><summary>Your levels by area</summary><div class="inner stack"><div class="tiny muted">Each area has 5 levels. Finish most of a level and you move to the next.</div>${REGIONS.map(
   r => {
     const a = areaLevel(c, d, r.id);
     return `<button class="rowbtn" data-a="mp" data-l="r" data-id="${r.id}"><span>${r.n}</span><span class="tiny muted">${a.complete ? "All 5 done" : a.done + " of " + a.total}</span><b>Level ${a.level}</b></button>`;
   }
 ).join("")}</div></details>`
     : ""
 }
 ${others && !G.coach ? `<details ${ds("house")}><summary>Your household (${G.chars.length})</summary><div class="inner stack">${houseCard()}</div></details>` : ""}
 ${
   real
     ? `<details ${ds("unfinished", nb)} ${openUnf ? "open" : ""}><summary>Unfinished business (${uf.list.length + c.saved.length + unsharp.length + parked.length})</summary><div class="inner stack">${uf.list.length + c.saved.length + unsharp.length + parked.length ? "" : `<div class="small muted">Nothing waiting. Nice.</div>`}${unsharp.map(k => `<button class="rowbtn" data-a="sharp" data-v="${k}"><span>Make real: ${SHARP_Q[k].toLowerCase()}</span><span class="tiny muted">A guess for now</span></button>`).join("")}${uf.list.map(x => `<button class="rowbtn" data-a="${x.id[0] === "m" ? "tab" : "node"}" data-v="${x.id[0] === "m" ? "play" : x.id}"><span>${esc(x.title)}</span><span class="tiny muted">From ${eraN(x.era)}</span></button>`).join("")}${c.saved
         .map(id => {
           const s = skillOf(id);
           return s
             ? `<button class="rowbtn" data-a="skill" data-v="${id}"><span>${esc(s[0])}</span><span class="tiny muted">Saved for later</span></button>`
             : "";
         })
         .join(
           ""
         )}${parked.map(id => `<button class="rowbtn" data-a="unpark" data-v="${id}"><span>${esc(id.includes(":") ? skillOf(id)[0] : nodeTitle(id))}</span><span class="tiny muted">Not yet · tap to bring back</span></button>`).join("")}</div></details>`
     : parked.length
       ? `<details><summary>Not yet (${parked.length})</summary><div class="inner stack">${parked.map(id => `<button class="rowbtn" data-a="unpark" data-v="${id}"><span>${esc(id.includes(":") ? skillOf(id)[0] : nodeTitle(id))}</span><span class="tiny muted">Not yet · tap to bring back</span></button>`).join("")}</div></details>`
       : ""
 }
 ${nb && real ? `<div class="tiny muted" style="order:80;text-align:center">More shows up here as you play: your cushion, your protection and your levels.</div>` : ""}
 <div style="order:90">${unna()}</div>
 <button class="ghost wide" style="order:91" data-a="dash">Rearrange this screen</button>
 <div style="order:92">${flagBtn()}</div></div>`;
}
function houseCard() {
  let cash = 0,
    spend = 0,
    nw = 0;
  const rows = G.chars
    .map((x, i) => {
      const dd = derive(x);
      cash += dd.cash;
      spend += x.spend;
      nw += dd.nw;
      return `<div class="row between"><span class="small"><b>${esc(x.name)}</b> · ${eraN(dd.era)}</span>${i === G.active ? `<span class="tiny muted">Playing now</span>` : `<button class="ghost slim" data-a="switch" data-v="${i}">Switch</button>`}</div>`;
    })
    .join("");
  return `${rows}<div class="grid2"><div class="tile"><div class="tiny muted">Together: own minus owe</div><b>${money(nw)}</b></div><div class="tile"><div class="tiny muted">Shared runway</div><b>${spend > 0 ? mo(cash / spend) : "0"} months</b></div></div><div class="tiny muted">Combining money with: ${esc(G.house.share)}. Each person keeps their own character.</div>`;
}
function flagBtn() {
  return `<button class="ghost slim flag" data-a="flag">Flag this screen</button>`;
}

/* ---------- MAP ---------- */
function skillOf(id) {
  const p = id.split(":");
  const t = SKILLS[p[0]];
  return t ? t.skills[+p[1]] : null;
}
function startNodes(reg, c) {
  return NODES.filter(n => n.t === reg.start && applies(c, n));
}
function mapItems() {
  const c = C(),
    d = D;
  if (!MP.r)
    return {
      center: ["You", d.level > 0 ? d.level + "% to freedom" : eraT(d.era)],
      items: REGIONS.map(r => ({ lab: r.n.split(" "), sub: "Level " + areaLevel(c, d, r.id).level, l: "r", id: r.id })),
    };
  const reg = REGIONS.find(r => r.id === MP.r),
    it = [];
  if (reg.start) {
    const ns = startNodes(reg, c);
    it.push({
      lab: ["Start", "here"],
      sub: ns.filter(n => rank(n.id) >= n.r).length + "/" + ns.length,
      l: "t",
      id: "start",
      cls: "planted",
    });
  }
  regionTrees(reg.id).forEach(t => {
    const g = treeGate(c, d, t);
    it.push({
      lab: TREES[t].s,
      sub: treeDone(c, t) + "/" + treeSize(t),
      l: "t",
      id: t,
      cls: g ? "locked" : c.garden.includes(t) ? "planted" : "",
    });
  });
  return { center: [reg.n, "Level " + areaLevel(c, d, reg.id).level], items: it };
}
function orbit(m) {
  const n = m.items.length,
    cx = 180,
    cy = 180,
    ro = n > 6 ? 134 : 120,
    pr = n > 8 ? 32 : n > 5 ? 36 : 40;
  const pl = m.items
    .map((it, i) => {
      const a = ((-90 + (i * 360) / n) * Math.PI) / 180,
        x = cx + ro * Math.cos(a),
        y = cy + ro * Math.sin(a),
        ln = it.lab.length;
      return `<g class="pl ${it.cls || ""}" data-a="mp" data-l="${it.l}" data-id="${it.id}" role="button" tabindex="0"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${pr}"/>${it.lab.map((s, k) => `<text x="${x.toFixed(1)}" y="${(y - (ln - 1) * 6 - 5 + k * 12).toFixed(1)}">${esc(s)}</text>`).join("")}<text class="sub" x="${x.toFixed(1)}" y="${(y + (ln - 1) * 6 + 9).toFixed(1)}">${esc(it.sub)}</text></g>`;
    })
    .join("");
  return `<svg class="orbit" viewBox="0 0 360 360" role="img" aria-label="Map"><circle class="ring" cx="${cx}" cy="${cy}" r="${ro}"/><g class="sun"><circle cx="${cx}" cy="${cy}" r="48"/>${m.center.map((s, k) => `<text x="${cx}" y="${cy - (m.center.length - 1) * 7 + k * 14}">${esc(s)}</text>`).join("")}</g>${pl}</svg>`;
}
function mapList(m) {
  return `<div class="stack">${m.items.map(it => `<button class="rowbtn ${it.cls || ""}" data-a="mp" data-l="${it.l}" data-id="${it.id}"><span>${esc(it.lab.join(" "))}${it.cls === "locked" ? ` <span class="tiny muted">(not yet)</span>` : ""}</span><b>${esc(it.sub)}</b></button>`).join("")}</div>`;
}
function gardenCard() {
  const c = C();
  return `<div class="card"><div class="row between"><h3>Your focus</h3>${ib("term:garden")}</div><div class="small muted">${c.garden.length} of ${c.slots} focus spots in use${c.compost ? ` · ${c.compost} head start${c.compost === 1 ? "" : "s"} banked` : ""}</div>
 <div class="stack" style="margin-top:8px">${c.garden.length ? c.garden.map(t => `<div class="row between"><button class="linkish" data-a="mp" data-l="jump" data-id="${t}">${esc(trackN(t))} <span class="tiny muted">${treeDone(c, t)}/${treeSize(t)}</span></button><button class="ghost slim" data-a="wither" data-v="${t}">Pause</button></div>`).join("") : `<div class="small muted">Nothing in focus yet. Tap an area, tap a track, then tap "Focus on this track". Tracks in focus move up your path.</div>`}</div></div>`;
}
function treeView() {
  const c = C(),
    d = D,
    reg = REGIONS.find(r => r.id === MP.r);
  if (MP.t === "start") {
    const ns = startNodes(reg, c),
      nx = ns.find(n => rank(n.id) < n.r);
    return `<div class="card"><h3>Start here</h3><div class="small muted">These steps move you from era to era. Do them in order.</div></div><div class="stack">${ns
      .map((n, i) => {
        const rk = rank(n.id),
          isN = nx && nx.id === n.id;
        return `<button class="node ${rk >= n.r ? "done" : isN ? "part pulse" : ""}" data-a="node" data-v="${n.id}"><div class="row between"><span>${i + 1}. ${n.n}</span><span class="tiny ${rk >= n.r ? "" : "muted"}">${rk >= n.r ? "Done" : isN ? "Do this next" : rk + "/" + n.r}</span></div><div class="tiny muted">${n.e} · ${n.w}${n.gate ? " · moves you to a new era" : ""}</div></button>`;
      })
      .join("")}</div>`;
  }
  const t = MP.t,
    g = treeGate(c, d, t),
    planted = c.garden.includes(t),
    dn = treeDone(c, t),
    z = treeSize(t),
    per = z / 5,
    nxt = nextSkill(c, t);
  let h = `<div class="card stack"><div><h3>${esc(trackN(t))}</h3><div class="small muted">${TREE_ONE[t] || ""} ${dn} of ${z} done.</div></div><div class="small"><b>When it fits:</b> ${TREES[t].best}</div>
  ${g ? `<div class="banner small"><b>Not the best time yet.</b> ${g.why}<br><b>How to open it:</b> ${g.route}<div class="tiny muted">You can still look and learn. The game won't stop you.</div></div>` : ""}
  ${dn >= z ? `<span class="pill buff">Finished. It stays finished.</span>` : planted ? `<div class="row between"><span class="pill info">In your focus</span><button class="ghost slim" data-a="wither" data-v="${t}">Pause</button></div>` : `<button class="${g ? "ghost" : "primary"}" data-a="plant" data-v="${t}">Focus on this track</button><div class="tiny muted">${c.garden.length >= c.slots ? "Your focus is full. Adding this is a lot at once." : "Tracks in focus move up your path."}</div>`}</div>`;
  for (let b = 0; b < 5; b++) {
    const base = b * per,
      all = Array.from({ length: per }, (_, k) => base + k).every(i => skillDone(c, t + ":" + i));
    h += `<div class="row between"><div class="tier">Level ${b + 1} · ${BAND_PLAIN[b]}</div>${all ? `<span class="tiny" style="color:var(--good)">Done</span>` : `<button class="ghost slim" data-a="bandall" data-v="${t}:${b}">Already did these</button>`}</div><div class="stack">${Array.from(
      { length: per },
      (_, k) => {
        const i = base + k,
          s = SKILLS[t].skills[i],
          dnn = skillDone(c, t + ":" + i),
          isN = i === nxt || (c.boost[t] && i === nxt + 1);
        return `<button class="node ${dnn ? "done" : isN ? "part" + (i === nxt ? " pulse" : "") : "faded"}" data-a="skill" data-v="${t}:${i}"><div class="row between"><span>${i + 1}. ${esc(stepThemed(t + ":" + i) || s[0])}${stepThemed(t + ":" + i) ? `<div class="tiny muted" style="font-weight:400">${esc(s[0])}</div>` : ""}</span><span class="tiny ${dnn ? "" : "muted"}">${dnn ? "Done" : i === nxt ? "Do this next" : ""}</span></div><div class="tiny muted">${esc(s[1])}</div></button>`;
      }
    ).join("")}</div>`;
  }
  return h;
}
function mapTab() {
  const c = C(),
    d = D,
    reg = MP.r ? REGIONS.find(r => r.id === MP.r) : null;
  const crumbs = `<div class="row wrap crumbs"><button class="ghost slim" data-a="mp" data-l="root">All areas</button>${reg ? `<span class="muted">›</span><button class="ghost slim" data-a="mp" data-l="r" data-id="${reg.id}">${reg.n}</button>` : ""}${MP.t ? `<span class="muted">›</span><span class="small"><b>${MP.t === "start" ? "Start here" : esc(trackN(MP.t))}</b></span>` : ""}</div>`;
  let body;
  if (MP.t) body = treeView();
  else {
    const m = mapItems();
    body =
      (mapMode === "orbit" ? orbit(m) : mapList(m)) +
      (reg
        ? `<div class="card"><div class="row between"><h3>${reg.n}</h3>${ib("region:" + reg.id)}</div><div class="small muted">${reg.one} Tap a circle to see its steps in order.</div></div>`
        : gardenCard());
  }
  return `<div class="stack"><h1>Skills</h1>
 ${
   MP.r
     ? ""
     : `<details><summary>Your path through the 10 eras</summary><div class="inner"><div class="spine">${ERAS.map(
         (e, i) => {
           const cls = i < d.era ? "done" : i === d.era ? "cur" : i === d.era + 1 ? "" : "fog",
             show = i <= d.era + 1;
           return `<button class="era ${cls}" data-a="info" data-k="era:${i}"><div class="tiny muted">Era ${i}</div><div><b>${show ? eraT(i) : "???"}</b></div>${show && VO().eras ? `<div class="tiny muted">${e.n}</div>` : ""}<div class="tiny muted">${show ? e.p : "Hidden for now"}</div></button>`;
         }
       ).join("")}</div></div></details>`
 }
 <div class="row between">${crumbs}${MP.t ? "" : `<div class="seg"><button class="${mapMode === "orbit" ? "on" : ""}" data-a="mode" data-v="orbit">Orbit</button><button class="${mapMode === "list" ? "on" : ""}" data-a="mode" data-v="list">List</button></div>`}</div>
 ${body}${flagBtn()}</div>`;
}

/* ---------- PLAY ---------- */
const MOVE_T = {
  paid: "Paid down a debt",
  extra: "Extra money came in",
  saved: "Saved or invested",
  cost: "A surprise cost",
};
function moveLine(m) {
  return m.t === "in"
    ? money(m.amt) + " came in" + (m.src && m.src !== "Other" ? " from " + m.src : "") + (m.k ? " to " + m.k : "")
    : m.t === "out"
      ? "Spent " + money(m.amt) + (m.cat ? " on " + m.cat : "") + (m.fk ? " from " + m.fk : "")
      : m.t === "pay"
        ? "Paid " + money(m.amt) + " off " + m.k + (m.fk ? " from " + m.fk : "")
        : m.t === "xfer"
          ? "Moved " + money(m.amt) + " from " + m.fk + " to " + m.k
          : m.t === "paid"
            ? "Paid " + money(m.amt) + " off " + m.k
            : m.t === "extra"
              ? money(m.amt) + " extra came in"
              : m.t === "saved"
                ? "Put " + money(m.amt) + " into " + m.k
                : money(m.amt) + " surprise cost";
}
/* CHECK-IN TAB.
   playTab() makes the full tab. playTabBase() is the part from this file. */
function playTab() {
  let h = playTabBase();
  if (typeof playTabHead === "function") h = playTabHead(h); /* ux.js: the tab title; no line for a streak of 0 days */
  return h;
}
function playTabBase() {
  const c = C(),
    d = D,
    t = todayISO(),
    due = c.payKnown && t >= c.payNext,
    dd = c.payKnown ? daysBetween(t, c.payNext) : 0,
    last = c.hist[c.hist.length - 1],
    doneToday = c.lastDaily === t;
  const avg = c.calib.length
    ? Math.round(c.calib.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, c.calib.length))
    : null;
  return `<div class="stack"><h1>Check in</h1>
 <div class="card ${doneToday ? "" : "hot"}"><div class="row between"><h3>${VT("daily", "Daily check")}</h3><span class="pill info">1 minute</span></div><div class="small muted">Guess your balance, say how money felt, and log anything that moved.</div>
  <div class="small" style="margin:6px 0">${doneToday ? "Done today." : "Not done yet today."} Streak: <b>${c.streak}</b> day${c.streak === 1 ? "" : "s"}${avg !== null ? ` · Guess accuracy ${avg}%` : ""}</div>
  <button class="${doneToday ? "ghost" : "primary go"} wide" data-a="daily">${doneToday ? "Do it again" : "Do today's check"}</button></div>
 <div class="card"><div class="row between"><h3>${VT("move", "Log money")}</h3><span class="pill info">30 seconds</span></div><div class="small muted">Paid down a debt? Extra money came in? Log it and your numbers update everywhere right away.</div><div class="grid2" style="margin-top:8px">${Object.keys(
   FLOW_T
 )
   .map(k => `<button class="ghost" data-a="flow" data-v="${k}">${FLOW_T[k]}</button>`)
   .join("")}</div></div>
 <div class="card ${due ? "hot" : ""}"><div class="row between"><h3>${VT("payday", "Payday round")}</h3><span class="pill info">3 minutes</span></div><div class="small muted">Three quick games each time you get paid: split the paycheck, one money question, one muscle.</div>
  <div class="small" style="margin:6px 0">${due ? "<b>Payday is here.</b>" : c.payKnown ? "Next payday: <b>" + nice(c.payNext) + "</b> (" + dd + " day" + (dd === 1 ? "" : "s") + ")" : 'Tap "I got paid today" on your next payday and the game keeps track from there.'} · Rounds played: ${c.paydays.length}</div>
  <div class="row wrap"><button class="${due ? "primary go" : "ghost"}" data-a="payday" data-v="${due ? "" : "practice"}">${due ? "Play payday round" : "Practice round"}</button>${due ? "" : `<button class="ghost" data-a="paidtoday">I got paid today</button>`}</div></div>
 <div class="card"><div class="row between"><h3>${VT("month", "Monthly session")}</h3><span class="pill info">5 minutes</span></div><div class="small muted">Check every number against the real thing. This is how eras get confirmed.</div><div class="small" style="margin:6px 0">${last ? "Last update: " + nice(last.d) : "No session yet"}</div><button class="ghost wide" data-a="month">Start monthly session</button></div>
 <details><summary>Can you actually do it? (${d.mus} of ${MUSCLES.length})</summary><div class="inner stack"><div class="tiny muted">Money muscles. Tap each one once you've done it at least once.</div>${MUSCLES.map((m, i) => `<button class="node ${c.muscles[i] ? "done" : ""}" data-a="muscle" data-v="${i}"><div class="row between"><span>${m}</span><span class="tiny ${c.muscles[i] ? "" : "muted"}">${c.muscles[i] ? "Done" : "Not yet"}</span></div></button>`).join("")}</div></details>
 <details><summary>Your diary (${c.diary.length})</summary><div class="inner stack">${
   c.diary.length
     ? c.diary
         .slice(-10)
         .reverse()
         .map(x => {
           const ms = c.moves.filter(m => m.d === x.d);
           return `<div class="tile small"><b>${nice(x.d)}</b> · ${esc(x.feel)}${ms.length ? `<div class="tiny">${ms.map(m => esc(moveLine(m))).join(" · ")}</div>` : ""}${x.note ? `<div class="tiny muted">"${esc(x.note)}"</div>` : ""}</div>`;
         })
         .join("")
     : `<div class="small muted">Your days will show up here.</div>`
 }</div></details>
 <button class="gold wide" data-a="wrapped">See my year so far</button>
 ${flagBtn()}</div>`;
}

/* ---------- MONEY: the ledger. One place for every number. ---------- */
function rowTag(x, sec) {
  const a = [];
  if (sec === "debts") {
    if (x.rate != null && bandOf(x.rate) === x.apr && x.rate > 0) a.push(x.rate + "% a year");
    else if (x.apr && x.apr !== "?") a.push(x.apr === "No interest" ? x.apr : x.apr + " a year");
    else if (x.high) a.push("8% or more a year");
  }
  if (sec === "cashes" && x.apy != null && x.apy > 0) a.push("Pays " + x.apy + "% a year");
  else if (sec === "cashes" && x.hy === "Yes") a.push("High-yield");
  return a.length ? `<div class="tiny muted">${a.join(" · ")}</div>` : "";
}
/* ledRow(sec, i, x) makes one row of the money lists. ledRowBase() is the part from this file. */
function ledRow(sec, i, x) {
  let h = ledRowBase(sec, i, x);
  if (typeof ledRowFreq === "function") h = ledRowFreq(h, sec, x); /* smart.js: how often an income comes */
  return h;
}
function ledRowBase(sec, i, x) {
  return `<button class="rowbtn" data-a="rowedit" data-k="${sec}" data-v="${i}"><span>${esc(x.k)}${x.s ? rowTag(x, sec) : `<div class="tiny muted">Guess · tap to make it exact</div>`}</span><span class="row"><b class="${x.s ? "" : "guess"}" data-fid="v:${sec}${i}">${money(x.amt)}</b><span class="caret">›</span></span></button>`;
}
const LVN = [
  ["Amounts", "How much is in each one"],
  ["Details", "Rates, and which accounts pay you interest"],
  ["Protection", "The insurance that keeps a bad day from becoming a bad year"],
  ["Taxes", "Coming later"],
  ["Big plans", "Coming later"],
];
function detailItem(c, key) {
  const p = key.split(":"),
    i = +p[1];
  if (p[0] === "apr") {
    const x = c.debts[i];
    return {
      k: key,
      lv: 2,
      t: x.k,
      q: "What rate does it charge a year?",
      opts: APR_BANDS.concat(["No interest", "I'll find out"]),
      help: "It's called the APR. It's on your statement or in the lender's app.",
      cur: x.apr,
    };
  }
  if (p[0] === "hy") {
    const x = c.cashes[i];
    return {
      k: key,
      lv: 2,
      t: x.k,
      q: "Is it a high-yield account, one that pays clearly more than a big bank's regular savings?",
      opts: ["Yes", "No", "I'll find out"],
      help: "Accounts that do are called high-yield savings. Savings at a big bank usually pays close to nothing.",
      cur: x.hy,
    };
  }
  return {
    k: key,
    lv: 3,
    t: PROT_Q[p[1]][0],
    q:
      p[1] === "health"
        ? "How are you covered?"
        : p[1] === "disab"
          ? "If you got hurt and couldn't work, would insurance pay part of your income?"
          : "Do you have it?",
    opts: PROT_Q[p[1]][1],
    help: PROT_HELP[p[1]],
    cur: c.prot[p[1]],
  };
}
function detailKeys(c) {
  const t = todayISO(),
    ks = [];
  c.debts.forEach((x, i) => {
    if (x.amt > 0 && (!x.apr || x.apr === "?") && c.skip["apr:" + i] !== t) ks.push("apr:" + i);
  });
  c.cashes.forEach((x, i) => {
    if (/Savings/.test(x.k) && !x.hy) ks.push("hy:" + i);
  });
  Object.keys(PROT_Q).forEach(k => {
    if (!c.prot[k]) ks.push("prot:" + k);
  });
  return ks;
}
function openDetail(key) {
  const c = C(),
    all = detailKeys(c),
    nl = depthLevel(c) + 1,
    f = all.filter(k => detailItem(c, k).lv <= nl),
    ks = key ? [key] : f.length ? f : all;
  if (!ks.length) return;
  W = { kind: "detail", ks, i: 0, lv0: depthLevel(c) };
  sheet(detailSheet);
}
function detailSheet() {
  const w = W,
    c = C(),
    it = detailItem(c, w.ks[w.i]);
  return (
    head(
      "Level " + it.lv + " · " + LVN[it.lv - 1][0] + (w.ks.length > 1 ? " · " + (w.i + 1) + " of " + w.ks.length : ""),
      esc(it.t)
    ) +
    q(
      it.q,
      `<div class="stack">${it.opts.map(o => `<button class="rowbtn ${it.cur === o ? "sel" : ""}" data-a="dans" data-v="${o}"><span>${o}</span><span class="caret">›</span></button>`).join("")}</div>`,
      it.help
    ) +
    (it.lv === 2 ? ratePad() : "") +
    (w.i > 0 ? `<button class="ghost wide" data-a="dback">Back one</button>` : "") +
    `<div class="tiny muted">One tap and it moves on.</div>`
  );
}
/* MONEY TAB.
   moneyTab() makes the full tab. It calls each part by name, in the load order of the files.
   moneyTabBase() is the part from this file. */
function moneyTab() {
  let h = moneyTabBase();
  if (typeof moneyTabHead === "function") h = moneyTabHead(h); /* ux.js: the tab title replaces the old title */
  if (typeof moneyTabKeyCard === "function") h = moneyTabKeyCard(h); /* metrics.js: the card "Key numbers" */
  if (typeof moneyTabDebtPlan === "function") h = moneyTabDebtPlan(h); /* debts.js: the button for the debt plan */
  if (typeof moneyTabImport === "function") h = moneyTabImport(h); /* import.js: the button to read a statement file */
  if (typeof moneyTabLogLink === "function") h = moneyTabLogLink(h); /* moneylog.js: the button for the money log */
  if (typeof moneyTabTaxRow === "function") h = moneyTabTaxRow(h); /* gig.js: the row "Tax money" */
  if (typeof moneyTabPlanRows === "function") h = moneyTabPlanRows(h); /* csp.js: the spending plan, the audit */
  return h;
}
function moneyTabBase() {
  const c = C(),
    d = D,
    cash = rsum(c.cashes),
    allReal = sharpPct(c) >= 100,
    lv = depthLevel(c),
    nl = lv < 3 ? lv + 1 : null,
    dk = detailKeys(c);
  const tot = (v, rows) => `<b class="${rows.every(x => x.s) ? "" : "guess"}">${money(v)}</b>`;
  const sec = (title, key, rows, total, addLabel) =>
    `<div class="card"><div class="row between"><h3>${title}</h3>${tot(total, rows)}</div><div class="stack" style="margin-top:8px">${rows.map((x, i) => ledRow(key, i, x)).join("") || (typeof UX_ON !== "undefined" && UX_ON ? emptyState(key) : `<div class="small muted">Nothing here.</div>`)}${addLabel ? `<button class="ghost slim" data-a="rowadd" data-v="${key}">${addLabel}</button>` : ""}</div></div>`;
  const prow = (label, val, key) =>
    `<button class="rowbtn" data-a="detail" data-v="${key}"><span>${label}</span><span class="row"><b class="${val ? "" : "guess"}">${val || "Tap to answer"}</b><span class="caret">›</span></span></button>`;
  return `<div class="stack"><h1>Money</h1><div class="small muted">Every number the game uses lives here. Tap any line to change it. It updates everywhere at once. Faded numbers are guesses that don't count yet.</div>
 <div class="card next"><div class="row between"><span class="tiny muted">What you have, minus what you owe ${ib("term:ownowe")}</span>${allReal ? "" : `<span class="pill warn">Has guesses in it</span>`}</div><div class="big ${allReal ? "" : "guess"}" data-fid="v:nw">${money(d.nw)}</div><div class="tiny muted">${money(cash + c.inv)} you have, minus ${money(c.debt)} you owe</div></div>
 ${sec("Cash", "cashes", c.cashes, cash, "Add an account")}
 ${sec("Investments", "invs", c.invs, c.inv, "Add an account")}
 ${sec("What you owe", "debts", c.debts, c.debt, "Add a debt")}
 ${c.debt > 0 ? `<button class="ghost wide" data-a="flow" data-v="pay">Log a debt payment</button>` : ""}
 ${sec("Money coming in each month", "incs", c.incs, c.take, "Add another source")}
 ${c.steady !== "Steady" ? `<button class="rowbtn" data-a="rowedit" data-k="low" data-v="0"><span>In a low month${c.sharp.low ? "" : `<div class="tiny muted">Guess · tap to make it exact</div>`}</span><span class="row"><b class="${c.sharp.low ? "" : "guess"}">${money(c.low)}</b><span class="caret">›</span></span></button>` : ""}
 <div class="card"><div class="row between"><h3>Money going out each month</h3>${tot(c.spend, c.spends)}</div><div class="stack" style="margin-top:8px">${(() => {
   const ms = monthSpent(c, todayISO().slice(0, 7));
   return c.spends
     .map(
       (x, i) =>
         ledRow("spends", i, x) +
         (ms[x.k]
           ? `<div class="tiny muted" style="margin:-4px 0 2px 4px">Logged so far this month: ${money(ms[x.k])} of ${money(x.amt)}</div>${bar(Math.min(100, (ms[x.k] / Math.max(1, x.amt)) * 100))}`
           : "")
     )
     .join("");
 })()}${c.home === "With family" ? `<button class="rowbtn" data-a="rowedit" data-k="moveOut" data-v="0"><span>Extra it would cost to move out<div class="tiny muted">Keeps your freedom number honest</div></span><span class="row"><b>${money(c.moveOut)}</b><span class="caret">›</span></span></button>` : ""}</div><div class="tiny muted" style="margin-top:6px">Left over each month: ${money(c.take - c.spend)}</div></div>
 ${machineCard(c, d)}${typeof bossCard === "function" ? bossCard(c) : ""}${big3Card(c)}${freeCard(c, d)}${ledgerCard(c, d)}${taxCard(c, d)}${typeof yearCards === "function" ? yearCards(c, d) : ""}
 ${monthStatement(c)}
 ${statementsCard()}
 ${schedCard(c)}
 <div class="card"><div class="row between"><h3>How complete is your picture</h3><b>${lv === 0 ? "Working on Level 1" : "Level " + lv + " of 5"}</b></div><div class="lvls">${LVN.map((x, i) => `<div class="lvl ${i < lv ? "on" : i === lv ? "cur" : ""}"><b>${i < lv ? "✓" : i + 1}</b><span>${x[0]}</span></div>`).join("")}</div>${nl ? `<div class="small" style="margin-top:8px"><b>Level ${nl}: ${LVN[nl - 1][0]}.</b> ${LVN[nl - 1][1]}.</div><button class="primary go wide" style="margin-top:8px" data-a="${lv === 0 ? "sharp" : "detail"}" data-v="${lv === 0 ? sharpList(c).find(k => !isSharp(c, k)) || "take" : ""}">${lv === 0 ? "Make my numbers real" : dk.length ? "Fill in Level " + nl + " · all taps" : "Level " + nl + " is waiting on answers you said you'd find"}</button>` : `<div class="small muted" style="margin-top:8px">Levels 1 to 3 are done. Levels 4 and 5 are coming later.</div>`}</div>
 <div class="card"><div class="row between"><h3>Work benefits and protection</h3><span class="tiny muted">Levels 2 and 3</span></div><div class="stack" style="margin-top:8px">${isEmployee(c) ? `<button class="rowbtn" data-a="sharp" data-v="match"><span>Retirement match at work</span><span class="row"><b class="${c.sharp.match ? "" : "guess"}">${c.sharp.match ? (c.match === "yes" ? "Yes, getting all of it" : c.match === "no" ? "Yes, not getting all of it" : "No match offered") : "Tap to answer"}</b><span class="caret">›</span></span></button>` : ""}${Object.keys(
   PROT_Q
 )
   .map(k => prow(PROT_Q[k][0], c.prot[k], "prot:" + k))
   .join("")}</div></div>
 <details><summary>Cash flow history (${c.moves.length})</summary><div class="inner stack">${
   c.moves.length
     ? c.moves
         .slice(-15)
         .reverse()
         .map(
           m =>
             `<div class="row between small"><span>${nice(m.d)} · ${esc(moveLine(m))}</span><b style="color:${flowSign(m) > 0 ? "var(--good)" : flowSign(m) < 0 ? "var(--bad)" : "var(--text)"}">${flowSign(m) ? signed(flowSign(m)) : money(m.amt)}</b></div>`
         )
         .join("")
     : `<div class="small muted">Nothing logged yet.</div>`
 }</div></details>
 ${flagBtn()}</div>`;
}

/* ---------- ME (and more) ---------- */
const SOON = [
  [
    "The Enneagram-style test",
    "A real set of questions about what drives you with money, with a result written in money terms.",
  ],
  [
    "Rivals",
    "Race the typical person your age, a perfect you, and (once you surface) a head-start rival you may never catch.",
  ],
  ["Mentors and the Judge", "Pick a mentor for tips, books and introductions. The Judge asks the hard questions."],
  ["Strategy collection", "Every strategy you learn is seen. Every one you use is caught. Some are legendary."],
  ["Guilds", "Groups that share deals, knowledge and accountability."],
  ["Routes", "Different lifts up the mountain: index funds, real estate, a business. Speed, seats and risk."],
  ["Practice raids", "Rehearse money emergencies before they happen."],
];
/* ME TAB.
   meTab() makes the full tab. It calls each part by name, in the load order of the files.
   meTabBase() is the part from this file. */
function meTab() {
  let h = meTabBase();
  if (typeof meTabHead === "function") h = meTabHead(h); /* ux.js: the tab title, Beginner or Expert, the color */
  if (typeof meTabReveal === "function") h = meTabReveal(h); /* reveal.js: the row for the character sheet */
  if (typeof meTabValues === "function") h = meTabValues(h); /* values.js: the row "Is my money going where I want?" */
  return h;
}
function meTabBase() {
  const c = C(),
    d = D,
    now = identityNow(c, d),
    want = IDENT.find(i => i.id === c.want) || IDENT[1],
    ch = chapterOf(c);
  return `<div class="stack"><h1>${esc(c.name)}</h1>
 ${themeCard()}
 ${toneCard(c)}
 ${typeof chartCard === "function" ? chartCard(c) : ""}
 ${mtypeCard(c)}
 ${typeof calsCard === "function" ? calsCard(c) : ""}
 ${rivalCard(c, d)}
 <div class="card"><div class="row between"><div class="tiny muted">Your chapter of life</div>${ib("chap:" + ch)}</div><h2>${ch}</h2><div class="small muted">${CHAPTERS.find(x => x.n === ch).one}</div>
  ${ch === "Starting Out on Your Own" ? `<div class="small" style="margin-top:8px">What kind of start did you get?</div>${chipsRow("launch", Object.keys(LAUNCH), c.launch, "cset")}<div class="tiny muted">${LAUNCH[c.launch]}</div>` : ""}</div>
 <div class="card stack"><div><div class="tiny muted">Right now you play like</div><h2>${now.n}</h2><div class="small muted">${now.one}</div></div>
  <div><div class="small">Who do you want to be?</div><div class="chips">${IDENT.slice(1)
    .map(
      i =>
        `<button class="chip ${c.want === i.id ? "on" : ""}" data-a="cset" data-k="want" data-v="${i.id}">${i.n}</button>`
    )
    .join("")}</div></div>
  <div class="tile"><div class="small"><b>What it takes to become ${want.n}</b></div>${want.crit
    .map(k => {
      const ok = k[1](d, c);
      return `<div class="row between small"><span>${k[0]}</span><span class="pill ${ok ? "buff" : "warn"}">${ok ? "Done" : "Not yet"}</span></div>`;
    })
    .join(
      ""
    )}${want.crit.every(k => k[1](d, c)) ? `<div class="small" style="color:var(--good)">You're there.</div>` : ""}</div></div>
 ${c.cross6 || c.cross7 ? `<div class="card"><div class="tiny muted">Your crossroads choices</div>${c.cross6 ? `<div class="small">At Quiet Quitting FI: <b>${esc(c.cross6)}</b></div>` : ""}${c.cross7 ? `<div class="small">At Coast: <b>${esc(c.cross7)}</b></div>` : ""}${c.happy ? `<div class="small">Happy with life right now: <b>${esc(c.happy)}</b></div>` : ""}<button class="ghost slim" data-a="cross" data-v="${c.cross7 ? 7 : 6}">Choose again</button></div>` : ""}
 <details><summary>What you're like (optional)</summary><div class="inner stack">${q(
   "Which sounds most like you with money?",
   `<div class="stack">${Object.keys(ELEMENTS)
     .map(
       e =>
         `<button class="rowbtn ${c.element === e ? "sel" : ""}" data-a="cset" data-k="element" data-v="${e}"><span><b>${e}</b><div class="tiny muted">${ELEMENTS[e]}</div></span></button>`
     )
     .join("")}</div>`
 )}${q("Plans or going with the flow?", chipsRow("order", ["Planner", "A bit of both", "Free spirit"], c.order, "cset"))}${q("Who do you spend on first?", chipsRow("give", ["Others first", "Balanced", "Me first"], c.give, "cset"))}${q("Got an unfair advantage?", chipsRow("adv", ["None", "Deal hunter", "High-paying skill", "Low cost of living", "A strong network", "Family business"], c.adv, "cset"))}${q("Do you chase card or bank bonuses?", chipsRow("bonus", ["yes", "no"], c.bonus, "cset"))}</div></details>
 <details><summary>Your timeline</summary><div class="inner small stack">${q(
   "When would you like work to be optional?",
   chipsRow(
     "ret",
     [45, 50, 55, 60, 65, 70].filter(x => x > c.age),
     c.ret,
     "csetn"
   )
 )}${q("Plan your money to last until", chipsRow("death", [85, 90, 95, 100], c.death, "csetn"), "A long life is the expensive kind. 90 or more is the safe side.")}<div>Now ${c.age}. ${Math.max(0, c.ret - c.age)} working years left, then ${c.death - c.ret} years after work.</div><div class="muted">${c.death - c.ret > c.ret - c.age ? "You'd be retired longer than you'll work from here. Plan to take money out more slowly and keep more safety." : "You'll work longer than you'll be retired from here."}</div></div></details>
 <details><summary>${T("Your strengths in numbers", "Stats")}</summary><div class="inner stack">${d.stats.map(s => `<div class="stat"><span>${T(s[0], s[1])}</span>${bar(((s[2] - 8) / 12) * 100, "ac")}<b>${s[2]}</b></div>`).join("")}<div class="tiny muted">Scored 8 to 20. Early estimates that get sharper as you play.</div></div></details>
 <details><summary>Badges (${c.badges.length})</summary><div class="inner chips">${c.badges.length ? c.badges.map(b => `<span class="pill buff">${esc(b.label)}</span>`).join("") : `<span class="small muted">Your first badge is one step away.</span>`}</div></details>
 ${G.demo ? "" : `<button class="ghost wide" data-a="edit">Change my starting answers</button>`}
 <h2 style="margin-top:8px">More</h2>
 <button class="node" data-a="coach"><b>Coach view</b><div class="tiny muted">Everything a coach needs on one screen, with a session agenda.</div></button>
 <button class="node" data-a="people"><b>Profiles</b><div class="tiny muted">${G.demo ? "Sample characters" : G.chars.length + " " + (G.chars.length === 1 ? "person" : "people") + ". Add the people you coach or live with, and flip between them"}</div></button>
 <button class="node" data-a="find"><b>Find your era in 60 seconds</b><div class="tiny muted">Five taps. Good for showing a friend.</div></button>
 <button class="node" data-a="share"><b>Share the game</b><div class="tiny muted">A code to scan.</div></button>
 <button class="node" data-a="backup"><b>Save or move my game</b><div class="tiny muted">Copy your game as text, or paste one in.</div></button>
 <div class="card"><div class="row between"><div><b>Game words</b><div class="tiny muted">Show the game term next to the plain word, like Runway (HP).</div></div><div class="seg"><button class="${G.gamer ? "" : "on"}" data-a="gamer" data-v="0">Off</button><button class="${G.gamer ? "on" : ""}" data-a="gamer" data-v="1">On</button></div></div></div>
 <details><summary>Screens you flagged (${G.flags.length})</summary><div class="inner stack">${G.flags.length ? G.flags.map(f => `<div class="small">${nice(f.d)} · ${esc(f.where)} · <b>${esc(f.kind)}</b></div>`).join("") + `<div class="tiny muted">These are included when you copy your game.</div>` : `<div class="small muted">Tap "Flag this screen" at the bottom of any screen.</div>`}</div></details>
 <details><summary>Coming soon (${SOON.filter(s => s[0] !== "Rivals" && s[0] !== "The Enneagram-style test").length})</summary><div class="inner stack">${SOON.filter(
   s => s[0] !== "Rivals" && s[0] !== "The Enneagram-style test"
 )
   .map(s => `<div><b>${s[0]}</b><div class="small muted">${s[1]}</div></div>`)
   .join("")}</div></details>
 <div class="tiny muted">SLAM the Game is practice and education, like a fitness app for money. It is not personal financial advice. Rules and limits change. Numbers last checked ${LASTCHECK}.</div>
 <button class="ghost" data-a="reset">Reset to the sample characters</button>
 ${flagBtn()}</div>`;
}

/* ---------- sheets ---------- */
/* OPEN A SHEET.
   sheet(fn) is the full function. fn returns the HTML of the sheet.
   sheetBase(fn) opens the sheet and records nothing. ux.js uses it to go back to a sheet. */
function sheet(fn) {
  const was = !!SH;
  sheetBase(fn);
  if (typeof sheetUx === "function") sheetUx(fn, was); /* ux.js: the resume note, the browser history, the chips */
  if (typeof tkChipSafe === "function") tkChipSafe(); /* testkit.js: the chip of a test task */
}
function sheetBase(fn) {
  SH = fn;
  drawSheet();
}
/* DRAW THE OPEN SHEET.
   drawSheet() is the full function. It calls each part by name.
   tidy.js can draw the sheet two times. The second time, the question that the player must answer next is open.
   drawSheetOnce() draws the sheet one time. drawSheetBase() is the part from this file. It is farther down. */
function drawSheet() {
  if (typeof drawSheetTidy === "function") drawSheetTidy(drawSheetOnce); /* tidy.js: one question open at a time */
  else drawSheetOnce();
  if (typeof adLook === "function") adLook(); /* addon.js: set the look again */
}
function drawSheetOnce() {
  drawSheetBase();
  if (typeof drawSheetUx === "function") drawSheetUx(); /* ux.js: the button "Back", the button "Look up a word" */
  if (typeof drawSheetNav === "function") drawSheetNav(); /* nav.js: the trail, and the row Back / Forward / Close */
}
/* CLOSE THE SHEET.
   closeSheet() is the full function. It calls each part by name.
   closeSheetQuiet() closes the sheet and makes no step in the browser history. ux.js uses it when the browser goes back.
   closeSheetBase() is the part from this file. */
function closeSheet() {
  if (typeof closeSheetNav === "function") closeSheetNav(); /* nav.js: forget the trail of sheets */
  const was = !!SH;
  closeSheetQuiet();
  /* ux.js: the resume note, the browser history, the chips */
  if (typeof closeSheetUx === "function") closeSheetUx(was);
  if (typeof closeSheetAddon === "function") closeSheetAddon(); /* addon.js: go back to the look of the player */
  if (typeof tkChipSafe === "function") tkChipSafe(); /* testkit.js: the chip of a test task */
}
function closeSheetQuiet() {
  closeSheetBase();
  if (typeof closeSheetCloud === "function") closeSheetCloud(); /* cloud.js: draw a change that waited */
}
function closeSheetBase() {
  SH = null;
  W = null;
  drawSheet();
}
const head = (small, title) =>
  `<div class="row between"><span class="tiny muted">${small}</span><button class="ghost slim" data-a="close">Close</button></div>${title ? `<h2>${title}</h2>` : ""}`;

function infoSheet(k) {
  const p = k.split(":"),
    kind = p[0],
    key = p.slice(1).join(":");
  let h = "";
  if (kind === "era") {
    const e = ERAS[+key];
    h =
      head("Era " + key, eraN(+key)) +
      `<div class="small">${e.one}</div><div class="tile"><div class="small"><b>Is this you?</b></div>${e.is.map(x => `<div class="small">• ${x}</div>`).join("")}</div><div class="small muted"><b>How you get here:</b> ${e.gate}.</div>`;
  } else if (kind === "chap") {
    const ch = CHAPTERS.find(x => x.n === key);
    h =
      head("Chapter of life", ch.n) +
      `<div class="small">${ch.one}</div><div class="tile"><div class="small"><b>Is this you?</b></div>${ch.is.map(x => `<div class="small">• ${x}</div>`).join("")}</div><div class="small"><b>Not quite?</b> Pick the one that fits better.</div><div class="stack">${CHAPTERS.filter(
        x => x.n !== key
      )
        .map(
          x =>
            `<button class="rowbtn" data-a="chapset" data-v="${x.n}"><span><b>${x.n}</b><div class="tiny muted">${x.one}</div></span></button>`
        )
        .join(
          ""
        )}</div>${C().chapter ? `<button class="ghost slim" data-a="chapset" data-v="">Let the game decide</button>` : ""}`;
  } else if (kind === "region") {
    const r = REGIONS.find(x => x.id === key);
    h =
      head("Skill area", r.n) +
      `<div class="small">${r.one}</div><div class="tile">${regionTrees(key)
        .map(t => `<div class="small"><b>${esc(trackN(t))}:</b> ${TREE_ONE[t] || ""}</div>`)
        .join("")}</div>`;
  } else {
    const g = GLOSS[key];
    h = head("In plain words", g[0]) + `<div class="small">${g[1]}</div>`;
  }
  sheet(() => h + `<button class="primary wide" data-a="close">Got it</button>`);
}

const AUTO = ["sf_little", "sf_bige", "cd_gone", "cd_first", "cd_list"];
function wordsBox(txt) {
  let ts = termsIn(txt);
  if (ts.includes("Roth IRA")) ts = ts.filter(x => x !== "IRA");
  return ts.length
    ? `<div class="tile"><div class="tiny muted">Words on this page</div>${ts.map(k => `<div class="small"><b>${k}:</b> ${GLOSSARY[k]}</div>`).join("")}</div>`
    : "";
}
function nodeSheet(id) {
  const n = NODES.find(x => x.id === id),
    hw = NODE_HOW[id];
  W = { kind: "node", id };
  sheet(() => {
    const c = C(),
      rk = rank(id),
      auto = AUTO.includes(id),
      go = hw && hw.go;
    return (
      head((n.t === "cd" ? "Debt" : "Safety") + " · " + n.tier, stepThemed(id) || n.n) +
      `${stepThemed(id) ? `<div class="tiny muted">${esc(n.n)}</div>` : ""}<div class="small">${n.why}</div>
 <div class="tile"><div class="small"><b>How to do it</b></div>${hw.how.map((x, i) => `<div class="small">${i + 1}. ${x}</div>`).join("")}</div>
 ${go && rk < n.r ? `<button class="primary wide go" data-a="${go[1]}" data-v="${go[2]}">${go[0]}</button>` : ""}
 ${rk < n.r && !auto ? `<div class="row wrap"><button class="ghost slim" data-a="already" data-v="${id}">I already did this</button><button class="ghost slim" data-a="na" data-v="${id}">Doesn't apply to me</button></div>` : ""}
 <div class="grid2"><div class="tile"><div class="tiny muted">Takes</div><b>${n.e}</b></div><div class="tile"><div class="tiny muted">You get</div><b>${n.w}</b></div></div>
 ${n.rl ? `<div class="tile"><div class="tiny muted">Levels</div>${n.rl.map((l, i) => `<div class="small">${i < rk ? "Done" : "Level " + (i + 1)}: ${l}</div>`).join("")}${pips(n.r, rk)}</div>` : ""}
 ${auto && rk < n.r ? `<div class="tiny muted">This one finishes itself as your numbers change. Nothing to tick.</div>` : ""}
 ${wordsBox(n.n + " " + n.why + " " + hw.how.join(" "))}
 <div class="row wrap">${rk >= n.r ? `<span class="pill buff">Done</span>` : auto ? "" : `<button class="${go ? "ghost" : "primary go"}" data-a="rankup" data-v="${id}">I did ${n.rl ? "the next level" : "it"}</button>`}${rk < n.r ? `<button class="ghost" data-a="park" data-v="${id}">Not yet</button>` : ""}${(c.nodes[id] || 0) > 0 ? `<button class="ghost" data-a="undo" data-v="${id}">Undo one</button>` : ""}</div>`
    );
  });
}

/* skillSheet(id) opens the full sheet of one skill. skillSheetBase(id) is the part from this file. */
function skillSheet(id) {
  skillSheetBase(id);
  /* connect.js: the place of the skill in the picture */
  if (typeof skillSheetConnect === "function") skillSheetConnect(id);
}
function skillSheetBase(id) {
  const p = id.split(":"),
    t = p[0],
    i = +p[1],
    s = SKILLS[t].skills[i],
    c = C();
  c.viewed = (c.viewed || 0) + 1;
  W = { kind: "skill", id, nudge: true };
  sheet(() => {
    const c = C(),
      done = skillDone(c, id),
      tdy = todayISO(),
      all = candidates(c, D, tdy),
      bm = all[0],
      me = all.find(x => x.id === id),
      g = treeGate(c, D, t),
      off = !c.garden.includes(t) || g,
      isBest = bm && bm.id === id,
      saved = c.saved.includes(id),
      b = Math.floor(i / (treeSize(t) / 5));
    return (
      head(esc(trackN(t)) + " · Level " + (b + 1), i + 1 + ". " + esc(stepThemed(id) || s[0])) +
      (stepThemed(id) ? `<div class="tiny muted">${esc(s[0])}</div>` : "") +
      `${W && W.nudge && !done && !isBest && off && bm ? `<div class="banner small"><b>Sure about this one?</b> ${g ? esc(g.why) + " " : "This track isn't in your focus. "}Step 1 on your path is <b>${esc(bm.title)}</b>.<div class="row wrap" style="margin-top:8px"><button class="gold slim" data-a="best">Take me there</button><button class="ghost slim" data-a="nudgeoff">Stay here</button></div></div>` : ""}
 <div class="tile"><div class="tiny muted">What to do</div><div class="small">${esc(s[1])}</div></div>${s[3] ? `<div class="tile"><div class="tiny muted">Why it matters</div><div class="small">${esc(s[3])}</div></div>` : ""}
 <div class="tile"><div class="tiny muted">How you know it's done</div><div class="small">${esc(s[2])}</div></div>
 ${me ? `<div class="row between small"><span>${EFFT[me.eff]} · ${esc(me.tag)}</span><span>Efficiency <b>${me.score}</b> ${ib("term:eff")}</span></div>` : ""}
 ${wordsBox(s[0] + " " + s[1] + " " + s[2] + " " + s[3])}
 <div class="row wrap">${done ? `<span class="pill buff">Done</span>${c.skills[id] ? `<button class="ghost" data-a="skillundo" data-v="${id}">Undo</button>` : ""}` : `<button class="primary go" data-a="skilldone" data-v="${id}">I did this</button><button class="ghost" data-a="savelater" data-v="${id}">${saved ? "Remove from my list" : "Save for later"}</button><button class="ghost" data-a="park" data-v="${id}">Not yet</button><button class="ghost" data-a="already" data-v="${id}">Already done</button><button class="ghost" data-a="na" data-v="${id}">Doesn't apply to me</button>`}</div>`
    );
  });
}

/* getting started: who you are and what you have. No numbers. Nothing you could answer "I don't know" to. */
const DECADES = {
  Teens: [16, 19],
  "20s": [20, 29],
  "30s": [30, 39],
  "40s": [40, 49],
  "50s": [50, 59],
  "60s": [60, 69],
  "70s and up": [70, 80],
};
const HOMEMAP = { "I rent": "Renting", "I own": "Owning", "No cost": "With family" };
const ACCT_HELP = {
  "Retirement plan at work": "A 401(k), 403(b) or similar.",
  "IRA or Roth IRA": "A retirement account you opened yourself.",
  "Other investments": "A brokerage app, stocks, funds.",
  HSA: "A health savings account tied to your health plan.",
};
const SETUP = [
  {
    t: "About you",
    req: w => w.o.age !== null,
    b: w =>
      q("How old are you?", chipsRow("ageDec", Object.keys(DECADES), w.o.ageDec || "", "agedec")) +
      (w.o.ageDec
        ? q(
            "Exactly?",
            `<div class="chips">${(() => {
              const r = DECADES[w.o.ageDec],
                o = [];
              for (let a = r[0]; a <= r[1]; a++) o.push(a);
              return o;
            })()
              .map(
                a =>
                  `<button class="chip ${w.o.age === a ? "on" : ""}" data-a="setn" data-k="age" data-v="${a}">${a}</button>`
              )
              .join("")}</div>`
          )
        : "") +
      `<details class="math"${w.o.name && w.o.name !== "You" ? " open" : ""}><summary>Name your character. You can skip this</summary><div class="field" style="padding:8px 10px"><label class="small" for="name">A name for your character</label><input type="text" id="name" data-k="name" maxlength="20" value="${esc(w.o.name === "You" ? "" : w.o.name)}" placeholder="You"></div></details>`,
  },
  {
    t: "Your work",
    req: w => w.o.work && w.o.incKinds.length && w.o.payFreq && w.o.steady,
    b: w =>
      q(
        "What's your work right now?",
        chipsRow(
          "work",
          ["Student", "First job", "Established", "Between jobs", "Self-employed", "Retired"],
          w.o.work || ""
        ),
        '"Established" means you\'ve been working for a few years.'
      ) +
      q("Where does your money come from? Tap all that fit", multiRow("incKinds", INC_KINDS, w.o.incKinds)) +
      q(
        "How often does money come in?",
        chipsRow("payFreq", ["Weekly", "Every 2 weeks", "Twice a month", "Monthly", "It varies"], w.o.payFreq || "")
      ) +
      q("Is it about the same each time?", chipsRow("steady", ["Steady", "Changes month to month"], w.o.steady || "")),
  },
  {
    t: "Your home",
    req: w => w.o.homeQ && w.o.live.length,
    b: w =>
      q("Where do you live?", chipsRow("homeQ", Object.keys(HOMEMAP), w.o.homeQ || "")) +
      q(
        "Who lives there with you? Tap all that fit",
        multiRow("live", ["On my own", "Roommates", "A partner", "Kids", "Parents or family"], w.o.live)
      ),
  },
  {
    t: "Your people",
    req: w => w.o.rel && w.o.deps && w.o.share,
    b: w =>
      q(
        "Relationship",
        chipsRow("rel", ["Single by choice", "Single, seeking", "Dating", "Partnered", "Married"], w.o.rel || "")
      ) +
      q(
        "Does anyone rely on you for money?",
        chipsRow("deps", ["None", "Planning", "Kids", "Supporting a parent"], w.o.deps || ""),
        '"Planning" means kids are on the way or in the plan.'
      ) +
      q(
        "Do you combine money with anyone?",
        chipsRow("share", ["No one", "A partner", "More than one partner", "Family"], w.o.share || ""),
        "Splitting rent or bills with a roommate doesn't count. This is about shared accounts or shared goals."
      ),
  },
  {
    t: "What you owe",
    req: w => true,
    b: w =>
      `<div class="small muted">Tap every kind you have. No amounts. If you have none, just tap Next.</div><div class="stack">${DEBT_KINDS.map(d => `<button class="rowbtn ${w.o.debtKinds.includes(d[0]) ? "sel" : ""}" data-a="tog" data-k="debtKinds" data-v="${d[0]}"><span>${d[0]}</span><b>${w.o.debtKinds.includes(d[0]) ? "Yes" : ""}</b></button>`).join("")}<button class="rowbtn ${w.o.mort ? "sel" : ""}" data-a="togb" data-k="mort"><span>Mortgage</span><b>${w.o.mort ? "Yes" : ""}</b></button></div>`,
  },
  {
    t: "Where your money lives",
    req: w => true,
    b: w =>
      `<div class="small muted">Tap every kind of account you have. If none, just tap Next.</div><div class="stack">${ACCT_KINDS.map(a => `<button class="rowbtn ${w.o.accts.includes(a) ? "sel" : ""}" data-a="tog" data-k="accts" data-v="${a}"><span>${a}${ACCT_HELP[a] ? `<div class="tiny muted">${ACCT_HELP[a]}</div>` : ""}</span><b>${w.o.accts.includes(a) ? "Yes" : ""}</b></button>`).join("")}</div>`,
  },
  {
    t: "Three gut checks",
    req: w => w.o.can1k && w.o.cover && w.o.invest,
    b: w =>
      q(
        "A $1,000 surprise bill lands today. Could you pay it without borrowing?",
        chipsRow("can1k", ["Yes", "No"], w.o.can1k || "")
      ) +
      q(
        "If money stopped coming in, how long could you cover your bills?",
        chipsRow("cover", Object.keys(COVER), w.o.cover || "")
      ) +
      q("Do you put money into investments?", chipsRow("invest", ["No", "Sometimes", "Every month"], w.o.invest || "")),
  },
];
function openSetup(mode) {
  const edit = mode === "edit",
    base = edit ? clone(C()) : newChar();
  if (edit) {
    base.ageDec =
      Object.keys(DECADES).find(k => base.age >= DECADES[k][0] && base.age <= DECADES[k][1]) || "70s and up";
    base.homeQ = Object.keys(HOMEMAP).find(k => HOMEMAP[k] === base.home);
  } else
    Object.assign(base, {
      age: null,
      ageDec: null,
      work: null,
      incKinds: [],
      payFreq: null,
      steady: null,
      homeQ: null,
      live: [],
      rel: null,
      deps: null,
      share: null,
      accts: [],
      can1k: null,
      cover: null,
      invest: null,
    });
  W = { kind: "setup", mode, add: mode === "add", step: 0, o: base };
  sheet(setupSheet);
}
/* THE SETUP SHEET.
   setupSheet() makes the full sheet. It calls each part by name. setupSheetBase() is the part from this file. */
function setupSheet() {
  const w = W;
  let h = setupSheetBase();
  /* planner.js: questions left, what the game knows, the fast finish */
  if (typeof setupSheetPlan === "function") h = setupSheetPlan(h, w);
  if (typeof setupSheetRead === "function") h = setupSheetRead(h, w); /* ux.js: the line "Your first read" */
  return h;
}
function setupSheetBase() {
  const w = W,
    st = SETUP[w.step],
    last = SETUP.length - 1,
    ok = st.req(w);
  return (
    head("Getting started · page " + (w.step + 1) + " of " + SETUP.length, st.t) +
    `<div><div class="tiny muted">All taps. No numbers yet.</div>${bar((w.step / SETUP.length) * 100)}</div>${st.b(w)}${w.err && !ok ? `<div class="err">One question still needs an answer. It's outlined above.</div>` : ""}<div class="row between">${w.step > 0 ? `<button class="ghost" data-a="wback">Back one</button>` : "<span></span>"}<button class="${ok ? "primary go" : "ghost"}" data-a="wnext">${w.step === last ? "See where I stand" : "Next: page " + (w.step + 2) + " of " + SETUP.length}</button></div>`
  );
}
/* FINISH THE SETUP: make the profile from the answers, or change it.
   finishSetup() is the full function. It calls each part by name. finishSetupBase() is the part from this file. */
function finishSetup() {
  /* planner.js, step 1 of 2: clear a question that waited, and make the note for the celebration. */
  const pl = typeof finishSetupPlanStart === "function" ? finishSetupPlanStart() : null;
  if (typeof finishSetupPay === "function") finishSetupPay(); /* smart.js: keep how often each income comes */
  const r = finishSetupBase();
  if (pl) finishSetupPlanEnd(pl.w, pl.isNew); /* planner.js, step 2 of 2: lay out the first week */
  return r;
}
function finishSetupBase() {
  const w = W,
    o = w.o,
    edit = w.mode === "edit";
  if (!o.name || !String(o.name).trim()) o.name = "You";
  o.name = String(o.name).trim();
  o.home = HOMEMAP[o.homeQ];
  delete o.homeQ;
  delete o.ageDec;
  if (o.feel0) o.gentle = o.feel0 === "I'd rather not look";
  if (!edit) {
    o.payKnown = false;
    o.payNext = "9999-12-31";
    o.ret = Math.max(60, o.age + 5);
    o.placed = false;
  }
  applyTypical(o);
  o.confEra = null;
  const d = derive(o);
  if (!o.placed) {
    o.confEra = d.rawEra;
    o.peakEra = d.rawEra;
    o.dark = false;
  } else o.confEra = Math.min(d.rawEra, C().confEra);
  o.demo = false;
  if (!edit) o.hist = [snapshot(o, d, todayISO(), false)];
  if (G.demo) {
    G = Object.assign(fresh(), {
      chars: [o],
      active: 0,
      demo: false,
      house: { share: o.share },
      flags: G.flags,
      gamer: G.gamer,
      look: G.look,
      voice: G.voice,
    });
  } else if (w.add) {
    G.chars.push(o);
    G.active = G.chars.length - 1;
  } else {
    G.chars[G.active] = o;
    G.house.share = o.share;
  }
  if (o.ssq) {
    o.x = o.x || {};
    o.x.ss = o.ssq === "No, leave it out" ? 0 : o.ssq === "Yes, in full" ? 1 : 0.75;
    o.x.done = o.x.done || {};
    o.x.done.ss = o.ssq;
  }
  const got = settle(o, null);
  save();
  tab = "home";
  render();
  celebrate(
    edit ? "Answers updated" : "Your character is ready",
    [edit ? null : "A guess for people like you: " + eraName(D)].concat(got.slice(0, 2)),
    edit
      ? null
      : o.gentle
        ? "That took zero numbers. Next is one small win, and you pick it."
        : "That took zero numbers. Next, make your numbers close. A few taps each."
  );
}

/* sharpening: one piece at a time, each one makes the picture clearer */
function moneyO(c) {
  return {
    incs: clone(c.incs),
    low: c.low,
    spends: clone(c.spends),
    moveOut: c.moveOut,
    cashes: clone(c.cashes),
    invs: clone(c.invs),
    debts: clone(c.debts),
    match: null,
    tax: null,
    verified: null,
  };
}
function openSharp(qk) {
  W = { kind: "sharp", q: qk, i: 0, t: {}, pad: null, o: moneyO(C()) };
  sheet(sharpSheet);
}
/* THE SHEET "MAKE YOUR NUMBERS REAL".
   sharpSheet() makes the full sheet. It calls each part by name. sharpSheetBase() is the part from this file. */
function sharpSheet() {
  /* ask2.js: the questions about the job and the accounts have their own form. */
  const own = typeof sharpSheetAsk2 === "function" ? sharpSheetAsk2() : null;
  if (own !== null) return own;
  /* ask.js: one small question at a time. It uses sharpSheetBase() for the questions that it does not have. */
  return typeof askSheet === "function" ? askSheet() : sharpSheetBase();
}
function sharpSheetBase() {
  const w = W,
    c = C(),
    k = w.q,
    o = w.o,
    pct = sharpPct(c);
  let b = "";
  if (k === "take")
    b =
      `<div class="tile"><div class="eyebrow">Per month, after taxes</div><div class="small">${c.work === "Between jobs" ? "What's coming in each month right now: unemployment, gigs, help." : "What actually lands in your account in a typical month."} Tap the closest range.</div></div>` +
      rowsBlock("n", o.incs, "take") +
      shiftPanel() +
      (c.steady === "Steady" ? "" : numq("low", "All together, in a low month", "low", { compact: true }));
  else if (k === "spend") {
    const x = o.spends[w.i];
    b =
      `<div class="tiny muted">Spending · ${w.i + 1} of ${o.spends.length}</div>` +
      numq("s:" + w.i, "<b>" + x.k + "</b> each month", "cat", {
        help:
          SPEND_ONE[x.k] +
          (c.home === "With family" ? " Only count what you pay yourself." : "") +
          " Tap the closest range and it moves on.",
      });
  } else if (k === "cash")
    b =
      `<div class="small muted">Cash you could get to this week. Not investments.</div>` +
      rowsBlock("c", o.cashes, "cash");
  else if (k === "inv")
    b = `<div class="small muted">What each account is worth today.</div>` + rowsBlock("v", o.invs, "inv");
  else if (k === "debt")
    b =
      `<div class="small muted">The faded numbers are guesses. Change the ones that are off, then make them real.</div>` +
      o.debts
        .map(
          (x, i) =>
            `<div class="card stack">${numq("d:" + i, esc(x.k), "debt", { compact: true })}<div class="row between"><span class="small">Does it charge 8% or more a year?</span><div class="seg"><button class="${x.high ? "on" : ""}" data-a="dhigh" data-k="${i}" data-v="1">Yes</button><button class="${x.high ? "" : "on"}" data-a="dhigh" data-k="${i}" data-v="0">No</button></div></div></div>`
        )
        .join("") +
      `<div class="tiny muted">Cards, payday loans and pay-later plans nearly always charge more than 8%.</div>`;
  else if (k === "match")
    b =
      `<div class="tile small">A match is free money. When you put some of your pay into the retirement plan at work, your employer adds some too.</div>` +
      q(
        "Does your job do that?",
        `<div class="stack">${["Yes, and I get all of it", "Yes, but I don't get all of it", "My job has no match", "I'm not sure"].map(x => `<button class="rowbtn ${o.match === x ? "sel" : ""}" data-a="set" data-k="match" data-v="${x}"><span>${x}</span></button>`).join("")}</div>`
      );
  else
    b =
      `<div class="tile small">Tax-friendly accounts are a Roth IRA, an HSA, and the retirement plan at work. Money inside them is taxed less, so it grows faster.</div>` +
      q(
        "How full are yours each year?",
        `<div class="stack">${["All of them are full", "I put in some", "Not yet"].map(x => `<button class="rowbtn ${o.tax === x ? "sel" : ""}" data-a="set" data-k="tax" data-v="${x}"><span>${x}</span></button>`).join("")}</div>`
      );
  return (
    head("Make your numbers real", SHARP_Q[k]) +
    `<div><div class="tiny muted">${sharpList(c).filter(x => isSharp(c, x)).length} of ${sharpList(c).length} real</div>${bar(pct)}</div>${b}${w.err ? `<div class="err">Tap one to keep going.</div>` : ""}<button class="primary wide go" data-a="sharpdone">${k === "match" || k === "tax" ? "Save" : k === "spend" ? "This one's right, next" : "That's about right"}</button>${k === "spend" && w.i > 0 ? `<button class="ghost wide" data-a="sback">Back to ${esc(o.spends[w.i - 1].k)}</button>` : ""}<button class="ghost wide" data-a="sharpskip">I'll find it later</button><div class="tiny muted"><b>Where to find this:</b> ${SHARP_FIND[k]}</div>`
  );
}
function creditList(c) {
  const d = derive(c),
    ls = [];
  for (let e = 1; e <= Math.min(d.era, 5); e++)
    eraSteps(c, d, e).forEach(x => {
      if (!x.done && !AUTO.includes(x.id)) ls.push(x);
    });
  return ls;
}
function creditSheet() {
  W = { kind: "credit", o: { credit: [], cna: [] } };
  sheet(() => {
    const c = C(),
      ls = creditList(c);
    return (
      head("Take credit", eraN(D.era) + " confirmed") +
      `<div class="small">Your numbers are real, so your era is set. These are the usual first steps. The game doesn't know which ones you've handled, so tell it.</div><div class="tile small"><b>Tap once</b> if you've already done it.<br><b>Tap twice</b> if it doesn't apply to you.<br><b>Leave it</b> and it goes on your path.</div><div class="stack">${ls
        .map(x => {
          const dn = W.o.credit.includes(x.id),
            na = W.o.cna.includes(x.id),
            nd = NODES.find(n => n.id === x.id);
          return `<button class="rowbtn ${dn ? "sel" : ""}" style="${na ? "opacity:.55" : ""}" data-a="cred3" data-v="${x.id}"><span>${esc(x.title)}${nd ? `<div class="tiny muted">${esc(nd.why)}</div>` : ""}</span><b>${dn ? "Done" : na ? "Doesn't apply" : "To do"}</b></button>`;
        })
        .join("")}</div><button class="primary wide go" data-a="creditsave">Save what I have already done</button>`
    );
  });
}

/* monthly session: the whole ledger, checked against the real thing */
function openMonth() {
  W = { kind: "month", step: 0, pad: null, o: moneyO(C()) };
  sheet(() => {
    const w = W,
      o = w.o,
      c = C();
    if (w.step === 0)
      return (
        head("Monthly session · 1 of 2", "What changed?") +
        `<div class="small muted">Tap Change on anything that moved. Leave the rest.</div><div class="tier">Money in</div>` +
        o.incs.map((x, i) => numq("n:" + i, esc(x.k), "take", { compact: true })).join("") +
        (c.steady === "Steady" ? "" : numq("low", "In a low month", "low", { compact: true })) +
        `<div class="tier">Money out</div>` +
        o.spends.map((x, i) => numq("s:" + i, esc(x.k), "cat", { compact: true })).join("") +
        `<div class="tier">Cash</div>` +
        o.cashes.map((x, i) => numq("c:" + i, esc(x.k), "cash", { compact: true })).join("") +
        (o.invs.length
          ? `<div class="tier">Investments</div>` +
            o.invs.map((x, i) => numq("v:" + i, esc(x.k), "inv", { compact: true })).join("")
          : "") +
        (o.debts.length
          ? `<div class="tier">What you owe</div>` +
            o.debts.map((x, i) => numq("d:" + i, esc(x.k), "debt", { compact: true })).join("")
          : "") +
        `<button class="primary wide go" data-a="wnext">These are right, go to step 2</button>`
      );
    return (
      head("Monthly session · 2 of 2", "One honest question") +
      q(
        "Did you look at your real balances for these numbers?",
        chipsRow("verified", ["Yes, I checked", "No, these are guesses"], o.verified || ""),
        "Eras only move up on real numbers. Guesses are fine for everything else."
      ) +
      (w.err ? `<div class="err">Pick one to finish.</div>` : "") +
      `<div class="row between"><button class="ghost" data-a="wback">Back one</button><button class="primary go" data-a="wnext">Finish session</button></div>`
    );
  });
}
function finishMonth() {
  const w = W,
    c = C(),
    o = w.o,
    before = derive(c),
    prevRealm = before.realm;
  if (!o.verified) {
    w.err = true;
    drawSheet();
    return;
  }
  const ver = o.verified === "Yes, I checked";
  c.incs = o.incs;
  c.low = o.low;
  c.spends = o.spends;
  c.cashes = o.cashes;
  c.invs = o.invs;
  c.debts = o.debts;
  if (ver) {
    [c.incs, c.spends, c.cashes, c.invs, c.debts].forEach(r => r.forEach(x => (x.s = true)));
    c.sharp.low = true;
  }
  const got = afterMoney(c, prevRealm, ver);
  render();
  const d = D;
  let eta = null;
  if (before.yrs !== null && d.yrs !== null) {
    const df = before.yrs - d.yrs;
    eta =
      df > 0
        ? df + " year" + (df > 1 ? "s" : "") + " sooner than last time"
        : df < 0
          ? -df + " year" + (df < -1 ? "s" : "") + " later than last time"
          : "Same freedom date as last time";
  }
  const moved =
    d.era > before.era ? "New era: " + eraN(d.era) : d.era < before.era ? "Back to " + eraN(d.era) + " for now" : null;
  celebrate(
    "Session done",
    [
      moved,
      "Own minus owe: " + signed(d.nw - before.nw),
      eta,
      d.pending ? "Almost: confirm " + eraN(d.rawEra) + " with real balances" : null,
    ].concat(got.slice(0, 3)),
    d.era < before.era ? "Shit happens. The way back is a Heroic comeback." : null
  );
}

/* daily check: a guess, a feeling, and anything that moved */
const FEELS = ["Calm", "Okay", "Tight", "Stressed", "Proud"];
function openDaily() {
  const c = C();
  W = {
    kind: "daily",
    step: 0,
    pad: "guess",
    fresh: true,
    o: { guess: 0, actual: 0, acc: null, feel: null, mv: [], note: "", spoons: c.spoons },
  };
  sheet(dailySheet);
}
function dailySheet() {
  const w = W,
    o = w.o;
  if (w.step === 0)
    return (
      head("Daily check · 1 of 2", "Know your number") +
      `<div class="small muted">Before you look: what's in your checking account right now? Tap it out.</div>${numq("guess", "Your guess", "")}<button class="primary wide go" data-a="dlock">Lock my guess</button><button class="ghost wide" data-a="dskip">Skip the guess</button>`
    );
  if (w.step === 1)
    return (
      head("Daily check · 1 of 2", "Now check") +
      `<div class="small">Your guess: <b>${money(o.guess)}</b>. Open your bank app, look, and tap in what it really is.</div>${numq("actual", "What it really is", "")}<button class="primary wide go" data-a="dreveal">Reveal</button>`
    );
  return (
    head("Daily check · 2 of 2", "Today") +
    (o.acc !== null
      ? `<div class="banner small">Your guess was <b>${o.acc}% accurate</b>. ${o.acc >= 90 ? "You know your number." : "It gets closer the more you play."}${o.was !== undefined ? " Checking is now <b>" + money(o.actual) + "</b> everywhere in the game." : ""}</div>`
      : "") +
    q("How did money feel today?", chipsRow("feel", FEELS, o.feel || "")) +
    (w.err ? `<div class="err">Pick how it felt to save today.</div>` : "") +
    q(
      "Did any of these happen? Tap all that did",
      `<div class="stack">${Object.keys(MOVE_T)
        .map(
          k =>
            `<button class="rowbtn ${o.mv.includes(k) ? "sel" : ""}" data-a="tog" data-k="mv" data-v="${k}"><span>${MOVE_T[k]}</span><b>${o.mv.includes(k) ? "Yes" : ""}</b></button>`
        )
        .join("")}</div>`,
      "You'll put in the amount next, and your numbers update right away."
    ) +
    q(
      "How well did you do with money today? 1 is rough, 5 is great " + ib("term:spoons"),
      chipsRow("spoons", [1, 2, 3, 4, 5], o.spoons, "setn")
    ) +
    `<div class="field"><label class="small" for="note">Anything to add? (optional)</label><input type="text" id="note" data-k="note" maxlength="140" value="${esc(o.note)}" placeholder="One line is plenty"></div><button class="primary wide go" data-a="dsave">${o.mv.length ? "Save and log the amounts" : "Save today"}</button>`
  );
}

/* money moves: the thing that actually changes your numbers */
function moveRows(c, t) {
  const R = (sec, rows, f) =>
    rows.map((x, i) => ({ key: sec + ":" + i, k: x.k, amt: x.amt })).filter(f || (() => true));
  return t === "paid"
    ? R("debt", c.debts, x => x.amt > 0)
    : t === "extra"
      ? R("cash", c.cashes)
      : t === "saved"
        ? R("cash", c.cashes).concat(R("inv", c.invs))
        : R("cash", c.cashes).concat(R("debt", c.debts).map(x => Object.assign(x, { k: "Put it on: " + x.k })));
}
function moveSheet() {
  const w = W,
    o = w.o,
    c = C();
  if (!o.t)
    return (
      head("Log a money move", "What happened?") +
      `<div class="stack">${Object.keys(MOVE_T)
        .map(
          k =>
            `<button class="rowbtn" data-a="mvtype" data-v="${k}"><span>${MOVE_T[k]}</span><span class="caret">›</span></button>`
        )
        .join("")}</div>`
    );
  const rs = moveRows(c, o.t),
    lab = {
      paid: "Which debt?",
      extra: "Where did it land?",
      saved: "Where did you put it?",
      cost: "Where did it come from?",
    }[o.t];
  if (!rs.length)
    return (
      head("Log a money move", MOVE_T[o.t]) +
      `<div class="small">${o.t === "paid" ? "You have no debts listed. Add one under Money first." : "Add an account under Money first."}</div><button class="primary wide" data-a="tab" data-v="money">Open Money</button>`
    );
  return (
    head("Log a money move" + (MQ.length ? " · " + MQ.length + " more after this" : ""), MOVE_T[o.t]) +
    q(
      lab,
      `<div class="stack">${rs.map(r => `<button class="rowbtn ${o.row === r.key ? "sel" : ""}" data-a="set" data-k="row" data-v="${r.key}"><span>${esc(r.k)}</span><b>${money(r.amt)}</b></button>`).join("")}</div>`
    ) +
    numq("amt", "How much?", "") +
    (w.err ? `<div class="err">${w.err}</div>` : "") +
    `<button class="primary wide go" data-a="mvsave">Log it</button>`
  );
}
function moveSummary() {
  const c = C(),
    tot = MSUM.reduce((a, m) => a + m.delta, 0),
    lines = MSUM.map(moveLine);
  const got = MSUM.got || [];
  MSUM = [];
  celebrate(
    lines.length > 1 ? "Moves logged" : "Move logged",
    lines.concat(
      ["Own minus owe: " + signed(tot)],
      D.pending ? ["Looks like " + eraN(D.rawEra) + ". Confirm it in a monthly session."] : [],
      got.slice(0, 3)
    ),
    "Your numbers are updated everywhere."
  );
}

/* payday round */
const BUCKETS = ["Cushion", "Extra on debt", "Invest", "Fun"];
function openPayday(practice) {
  setPayBuckets(C());
  const c = C(),
    d = D,
    amt = [25, 50, 100, 200][Math.floor(Math.random() * 4)],
    yrs = [10, 20, 30][Math.floor(Math.random() * 3)],
    ans = Math.round(futureValueMonthly(amt, yrs) / 100) * 100;
  const opts = [0.4, 0.65, 1, 1.6].map(x => Math.round((ans * x) / 100) * 100).sort(() => Math.random() - 0.5),
    un = MUSCLES.map((m, i) => i).filter(i => !c.muscles[i]),
    base = Math.max(10, Math.round((c.payFreq === "It varies" ? c.take / 4 : d.perPay) / 10) * 10);
  RANGES.pay = [0.5, 0.75, 1, 1.5, 2, 3].map(x => {
    const v = Math.round((base * x) / 10) * 10;
    return [v, x === 1 ? "About " + money(v) + " · my usual" : "About " + money(v)];
  });
  W = {
    kind: "pay",
    step: practice ? 1 : 0,
    practice: !!practice,
    pad: null,
    o: {
      paid: base,
      alloc: {},
      open: null,
      locked: false,
      moved: null,
      done: [],
      score: null,
      amt,
      yrs,
      ans,
      opts,
      choice: null,
      muscle: un.length ? un[Math.floor(Math.random() * un.length)] : null,
      mdone: false,
    },
  };
  sheet(paySheet);
}
const BUCKET_ONE = {
  "Extra on debt": "On top of your minimum payments",
  Cushion: "Savings for surprises",
  Invest: "Money for future you",
  Fun: "Stays in checking, guilt-free",
};
function payMath(o) {
  const c = C(),
    tax = Math.round((o.paid * ((c.x && c.x.taxPct) || 0)) / 100),
    net = o.paid - tax,
    need = Math.round(net * Math.min(1, c.spend / Math.max(1, c.take))),
    free = Math.max(0, net - need),
    placed = BUCKETS.reduce((a, b) => a + (o.alloc[b] || 0), 0);
  return { tax, need, free, placed, rem: Math.max(0, free - placed) };
}
function payPlan(o) {
  const c = C(),
    m = payMath(o);
  if (!o.plan || o.planFor !== o.paid) {
    o.plan = goalPlan(paySuggest(c, D, m.free));
    o.planFor = o.paid;
    o.impact = payImpact(c, D);
    const ks = Object.keys(o.plan.split);
    o.ord = ks.concat(BUCKETS.filter(b => !ks.includes(b) && !(b === "Extra on debt" && c.debt <= 0)));
    o.ord = o.ord.filter(b => b !== "Fun").concat(o.ord.includes("Fun") ? ["Fun"] : []);
    if (!o.locked && !Object.keys(o.alloc).length) o.open = o.ord[0];
  }
  return o.plan;
}
function payOrder(c, d) {
  return W && W.o && W.o.ord ? W.o.ord : BUCKETS;
}
function planAmounts(o) {
  const m = payMath(o),
    sp = payPlan(o).split,
    ks = Object.keys(sp),
    out = {};
  let left = m.free;
  ks.forEach((k, i) => {
    const a = i === ks.length - 1 ? left : Math.round((m.free * sp[k]) / 100);
    out[k] = a;
    left -= a;
  });
  return out;
}
function payPicks(o) {
  const m = payMath(o),
    p = {};
  BUCKETS.forEach(b => {
    if (o.alloc[b]) p[b] = Math.round((o.alloc[b] / Math.max(1, m.free)) * 100);
  });
  return p;
}
function payTargets(c, o) {
  const out = [];
  let a = o.alloc["Extra on debt"] || 0;
  if (a > 0) {
    const ds = c.debts
      .map((x, i) => ({ x, i }))
      .filter(z => z.x.amt > 0)
      .sort((p, q) =>
        c.caught.method === "Smallest balance first"
          ? p.x.amt - q.x.amt
          : (q.x.high ? 1 : 0) - (p.x.high ? 1 : 0) || p.x.amt - q.x.amt
      );
    ds.forEach(z => {
      if (a <= 0) return;
      const u = Math.min(a, z.x.amt);
      out.push({ t: "paid", amt: u, row: "debt:" + z.i, k: z.x.k });
      a -= u;
    });
  }
  const cu = o.alloc["Cushion"] || 0;
  if (cu > 0) {
    let i = c.cashes.findIndex(x => /Savings/.test(x.k));
    if (i < 0) i = 0;
    if (c.cashes[i]) out.push({ t: "saved", amt: cu, row: "cash:" + i, k: c.cashes[i].k });
  }
  const iv = o.alloc["Invest"] || 0;
  if (iv > 0 && c.invs.length) out.push({ t: "saved", amt: iv, row: "inv:0", k: c.invs[0].k });
  return out;
}
/* THE PAYDAY SHEET.
   paySheet() makes the full sheet. paySheetBase() is the part from this file. */
function paySheet() {
  let h = paySheetBase();
  if (typeof paySheetAccount === "function") h = paySheetAccount(h); /* eras.js: the account recommendation */
  return h;
}
function paySheetBase() {
  const w = W,
    o = w.o,
    c = C(),
    d = D,
    sug = payPlan(o),
    pr = w.practice ? " · practice" : "",
    m = payMath(o),
    ord = o.ord,
    spReal = isSharp(c, "spend"),
    pa = planAmounts(o);
  if (w.step === 0)
    return (
      head("Payday round · 1 of 4", "How much did you get paid?") +
      `<div class="small muted">Tap the closest one, or type the exact amount.${c.steady === "Steady" ? "" : " Your pay changes, so this one matters."}</div>` +
      numq("paid", "This paycheck", "pay") +
      `<button class="primary wide go" data-a="wnext">That's it</button>`
    );
  if (w.step === 1) {
    const top = `<div class="tile stack" style="gap:6px"><div class="row between small"><span>This paycheck</span><b>${money(o.paid)}</b></div>${m.tax ? `<div class="row between small"><span>Tax set-aside, off the top (${C().x.taxPct}%)</span><b>${money(m.tax)}</b></div>` : ""}<div class="row between small"><span>Bills and usual spending <span class="tiny muted">(${Math.round(Math.min(1, c.spend / Math.max(1, c.take)) * 100)}% of what comes in)</span> <span class="pill ${spReal ? "okp" : "warn"}">${spReal ? "Real" : "Guess"}</span></span><b class="${spReal ? "" : "guess"}">${money(m.need)}</b></div><div class="row between"><b>Free to move</b><span class="big">${money(m.free)}</span></div>${spReal ? "" : `<div class="tiny muted">That middle number comes from a guess, so this split is practice until your spending is real. You can fix it under Money.</div>`}</div>`;
    if (m.free <= 0)
      return (
        head("Payday round · 2 of 4" + pr, "Where does it go?") +
        top +
        `<div class="banner small">This paycheck is fully spoken for. Today's game is different: find one bill you could shrink or cancel before next payday.</div><button class="primary wide go" data-a="wnext">Next game</button>`
      );
    return (
      head("Payday round · 2 of 4" + pr, "Where does it go?") +
      top +
      routerPanel(o) +
      (o.locked
        ? ""
        : `<button class="primary wide go" data-a="pplan">Use the plan: ${Object.keys(pa)
            .map(k => money(pa[k]) + " to " + k)
            .join(", ")}</button><div class="tiny muted">${sug.why} Or split it your own way below.</div>`) +
      `
  <div class="stack">${ord
    .map(b => {
      const a = o.alloc[b] || 0,
        open = o.open === b && !o.locked,
        cap = m.rem + a;
      return `<div class="${open ? "numopen" : "numrow"}"><button class="rowbtn bare" data-a="popen" data-v="${b}" ${o.locked ? "disabled" : ""}><span><b>${b}</b>${sug.split[b] ? ` <span class="pill info">${b === ord[0] ? "Best first move" : "Then this"}</span>` : ""}<div class="tiny muted">${bucketOne(b)}</div></span><b style="font-size:18px">${money(a)}</b></button>${
        open
          ? `<div class="chips" style="margin-top:8px">${m.placed - a > 0 && cap > 0 ? `<button class="chip" data-a="pset" data-k="${b}" data-v="rest">The rest · ${money(cap)}</button>` : ""}${[
              25, 50, 75, 100,
            ]
              .map(p => {
                const v = Math.min(Math.round((m.free * p) / 100), cap);
                return `<button class="chip ${a > 0 && a === v ? "on" : ""}" data-a="pset" data-k="${b}" data-v="${p}">${p}% · ${money(v)}</button>`;
              })
              .join(
                ""
              )}<button class="chip" data-a="padopen" data-k="b:${b}">Type an amount</button></div>${w.pad === "b:" + b ? keypad("b:" + b) + `<button class="ghost slim" style="margin-top:8px" data-a="padclose">Done typing</button>` : ""}`
          : ""
      }</div>`;
    })
    .join("")}</div>
  ${
    o.locked
      ? `<div class="banner small"><b>You matched the plan ${o.score}%.</b> The plan says: ${Object.keys(sug.split)
          .map(k => sug.split[k] + "% to " + k)
          .join(
            ", "
          )}. ${sug.why}${o.impact ? " At this pace, " + o.impact.goal + " takes about " + o.impact.n + " more paycheck" + (o.impact.n === 1 ? "" : "s") + "." : ""}</div>
   ${w.practice ? "" : o.moved === null ? q("Did you actually move the money?", `<div class="stack"><button class="rowbtn" data-a="pmoved" data-v="1"><span>Yes, I moved it</span><span class="caret">›</span></button><button class="rowbtn" data-a="pmoved" data-v="0"><span>Not yet, I'll do it later</span><span class="caret">›</span></button></div>`, "If yes, your debts and savings update everywhere right now.") : o.moved ? `<div class="tile small"><b>Updated:</b>${o.done.map(x => `<div>${esc(x)}</div>`).join("") || "<div>Nothing needed updating.</div>"}</div>` : `<div class="tiny muted">No problem. When you do, tap + Log at the bottom and your numbers update.</div>`}
   ${w.practice || o.moved !== null ? `<button class="primary wide go" data-a="wnext">Next game</button>` : ""}`
      : `<div class="row between"><span class="small ${m.rem > 0 ? "muted" : ""}">${m.rem > 0 ? money(m.rem) + " left to place" : "All placed"}</span><button class="ghost slim" data-a="pclear">Start over</button></div>${w.err ? `<div class="err">Tap a share first.</div>` : ""}<button class="${m.placed > 0 ? "primary" : "ghost"} wide" data-a="plock">${m.rem > 0 && m.placed > 0 ? "Lock it in · the other " + money(m.rem) + " stays as spending money" : "Lock it in"}</button>`
  }`
    );
  }
  if (w.step === 2)
    return (
      head("Payday round · 3 of 4" + pr, "The money question") +
      `<div class="small">You put <b>${money(o.amt)} a month</b> into a simple index fund for <b>${o.yrs} years</b>. About how much is it worth at the end?</div><div class="stack">${o.opts.map(x => `<button class="rowbtn ${o.choice !== null && x === o.ans ? "sel" : ""}" data-a="pquiz" data-v="${x}" ${o.choice !== null ? "disabled" : ""}><span>${money(x)}</span>${o.choice !== null && x === o.ans ? "<b>Right answer</b>" : o.choice === x ? "<b>Your pick</b>" : ""}</button>`).join("")}</div>${o.choice !== null ? `<div class="banner small">${o.choice === o.ans ? "Got it." : "Close."} You'd put in ${money(o.amt * 12 * o.yrs)}. Growth adds the rest. This uses 7% a year after inflation, a long-run average and not a promise.</div><button class="primary wide go" data-a="wnext">Next game</button>` : `<div class="tiny muted">An index fund is one fund that owns a little of every company, so you don't have to pick.</div>`}`
    );
  return (
    head("Payday round · 4 of 4" + pr, "One small skill") +
    (o.muscle === null
      ? `<div class="small">You know how to do every one of these. Nothing to do here.</div>`
      : `<div class="small">Do you know how you'd do this? You don't need a reason to do it today. Finding where it lives counts.</div><div class="tile"><h3>${MUSCLES[o.muscle]}</h3>${typeof MUS_HINT !== "undefined" && MUS_HINT[o.muscle] ? `<div class="small muted">${MUS_HINT[o.muscle]}</div>` : ""}</div><div class="row wrap" style="gap:6px"><button class="${o.mdone ? "primary" : "ghost"}" data-a="pmus">${o.mdone ? "Got it ✓" : "I know how"}</button><button class="ghost" data-a="pmusnext">Show me a different one</button></div><div class="tiny muted">Or skip it. Finishing the round doesn't depend on this.</div>`) +
    `<button class="primary wide go" data-a="wnext">Finish round</button>`
  );
}
function finishPay() {
  const w = W,
    o = w.o,
    c = C(),
    sc = o.score;
  if (o.mdone && o.muscle !== null) c.muscles[o.muscle] = todayISO();
  if (!w.practice) {
    c.paydays.push({
      d: todayISO(),
      score: sc,
      quiz: o.choice === o.ans,
      paid: o.paid,
      alloc: o.alloc,
      moved: !!o.moved,
    });
    let n = nextPayAfter(c.payNext, c.payFreq);
    while (n <= todayISO()) n = nextPayAfter(n, c.payFreq);
    c.payNext = n;
    if (["It varies", "Daily"].includes(c.payFreq)) {
      c.payKnown = false;
      c.payNext = "9999-12-31";
    }
  }
  const got = settle(c, null);
  save();
  render();
  celebrate(
    w.practice ? "Practice round done" : "Payday cleared",
    [
      sc !== null ? "Split: " + sc + "% match with the plan" : null,
      o.choice === o.ans ? "Money question: right" : "Money question: learned",
      o.mdone ? "Muscle trained" : null,
      w.practice || !c.payKnown ? null : "Next payday: " + nice(c.payNext),
    ].concat(got.slice(0, 2)),
    w.practice
      ? null
      : "Round " +
          c.paydays.length +
          " complete." +
          (o.moved ? "" : " When you move the money, log it with the + Log button.")
  );
}

/* crossroads */
function crossSheet(n) {
  const c = C();
  W = { kind: "cross", n, o: { pick: null, happy: c.happy } };
  const opts =
    n === 6
      ? [
          "Keep going to Coast",
          "Ease off and enjoy more now",
          "Take a break",
          "Start something of my own",
          "Not sure yet",
        ]
      : [
          "Push on to full freedom",
          "Switch to work I love, even for less",
          "Cut my hours",
          "Start branching out",
          "Not sure yet",
        ];
  sheet(
    () =>
      head("Crossroads", n === 6 ? "You're on track. What now?" : "You have enough saved. What now?") +
      `<div class="small">${n === 6 ? "From here, even the bare minimum gets you to freedom on time. Keep pushing toward Coast and you keep your early-start edge. Or change course. Both are real choices." : "You could stop saving for retirement today and still retire on time. Push on to full freedom, or start spending your time differently."}</div>${q("Are you happy with life right now?", chipsRow("happy", ["Yes", "Mostly", "Not really"], W.o.happy || ""))}${q("Your path from here", `<div class="stack">${opts.map(x => `<button class="rowbtn ${W.o.pick === x ? "sel" : ""}" data-a="set" data-k="pick" data-v="${x}"><span>${x}</span></button>`).join("")}</div>`)}${W.err ? `<div class="err">Pick a path. "Not sure yet" counts.</div>` : ""}<button class="primary wide go" data-a="crosssave">Save my choice</button><div class="tiny muted">You can choose again any time on the Me screen.</div>`
  );
}

/* find your era */
const FIND = [
  ["How old are you?", "age", [22, 27, 32, 40, 50, 60]],
  ["Do you owe more than you own?", "owe", ["Yes", "No"]],
  [
    "How much cash could you grab in an emergency?",
    "cush",
    ["Almost none", "About $1,000", "A few months of bills", "Six months or more"],
  ],
  ["Any debt charging 8% or more? (cards usually do)", "high", ["Yes", "No"]],
  [
    "How much do you have invested?",
    "inv",
    ["Nothing yet", "A little", "About a year of spending", "Many years of spending", "Enough to live on"],
  ],
];
function findChar(o) {
  const spend = 3500,
    inv = {
      "Nothing yet": 0,
      "A little": 5000,
      "About a year of spending": 42000,
      "Many years of spending": 450000,
      "Enough to live on": 1100000,
    }[o.inv],
    months = {
      "Almost none": 0,
      "About $1,000": 0.3,
      "A few months of bills": 3,
      "Six months or more": Math.max(8, Math.ceil(o.age / 5)),
    }[o.cush];
  const debt = o.owe === "Yes" ? inv + months * spend + 10000 : o.high === "Yes" ? 4000 : 0;
  return newChar({
    age: o.age,
    take: 4500,
    spend,
    months,
    inv,
    debt,
    high: o.high === "Yes" ? "yes" : "no",
    match: "yes",
    tax: inv >= 42000 ? "yes" : "no",
    ret: Math.max(60, o.age + 5),
  });
}
function findSheet() {
  W = { kind: "find", step: 0, o: {} };
  sheet(() => {
    const w = W;
    if (w.step < FIND.length) {
      const f = FIND[w.step];
      return (
        head("Find your era · " + (w.step + 1) + " of " + FIND.length, f[0]) +
        bar((w.step / FIND.length) * 100) +
        `<div class="stack">${f[2].map(x => `<button class="rowbtn" data-a="fset" data-k="${f[1]}" data-v="${x}"><span>${x}</span></button>`).join("")}</div>`
      );
    }
    const ch = findChar(w.o),
      d = derive(ch),
      e = ERAS[d.rawEra],
      nx = d.rawEra < 9 ? ERAS[d.rawEra + 1] : null;
    return (
      head("Your era", "") +
      `<div class="levelup"><div class="tiny gold">You are in</div><h1 style="margin:6px 0">${d.rawEra === 0 && d.realm === "Surface" ? "Ground Floor" : e.n}</h1><div class="small">${e.one}</div><div class="small muted" style="margin-top:6px">Era ${d.rawEra} of 9 · ${d.realm}</div></div>${nx ? `<div class="tile"><div class="tiny muted">Your next era</div><b>${nx.n}</b><div class="small">${nx.gate}.</div></div>` : ""}<div class="tiny muted">A quick guess from five taps. The full setup takes about two minutes.</div>${G.demo ? `<button class="primary wide go" data-a="start">Set up my real character</button>` : ""}<button class="ghost wide" data-a="find">Try again</button>`
    );
  });
}

/* wrappedSheet() opens the full sheet "Your year". wrappedSheetBase() is the part from this file. */
function wrappedSheet() {
  const r = wrappedSheetBase();
  if (typeof adPlainSheet === "function") adPlainSheet(); /* addon.js: a sheet for sharing has the standard look */
  return r;
}
function wrappedSheetBase() {
  const c = C(),
    w = wrapped(c, todayISO()),
    yr = todayISO().slice(0, 4),
    ms = c.moves.filter(m => m.d.slice(0, 4) === yr),
    paid = ms.filter(m => m.t === "paid").reduce((a, m) => a + m.amt, 0),
    extra = ms.filter(m => m.t === "extra").reduce((a, m) => a + m.amt, 0);
  sheet(
    () =>
      head("Your year so far", w.year) +
      `<div class="grid2">
 <div class="tile"><div class="tiny muted">Own minus owe</div><div class="big">${signed(w.nwChange)}</div></div><div class="tile"><div class="tiny muted">Debt paid off</div><div class="big">${money(Math.max(w.debtPaid, paid))}</div></div>
 <div class="tile"><div class="tiny muted">Extra money brought in</div><div class="big">${money(extra)}</div></div><div class="tile"><div class="tiny muted">Eras climbed</div><div class="big">${w.eras}</div></div>
 <div class="tile"><div class="tiny muted">Days you showed up</div><div class="big">${w.days}</div></div><div class="tile"><div class="tiny muted">Payday rounds</div><div class="big">${w.paydays}</div></div>
 <div class="tile"><div class="tiny muted">Skills learned</div><div class="big">${w.skills}</div></div><div class="tile"><div class="tiny muted">Badges earned</div><div class="big">${w.badges}</div></div></div>
 <button class="ghost wide" data-a="sharewrap">Make a share card · no dollar amounts</button>
 ${w.feeling ? `<div class="banner small">Most days, money felt: <b>${esc(w.feeling)}</b>.</div>` : ""}<div class="tiny muted">${c.demo ? "Sample history, so you can see how this fills in." : "This fills in as you play."}</div><button class="primary wide" data-a="close">Close</button>`
  );
}

/* THE COACH VIEW.
   coachSheet() opens the full sheet. It calls each part by name. Each part opens the sheet again with one more block at the top.
   coachSheetBase() is the part from this file. */
function coachSheet() {
  coachSheetBase();
  if (typeof coachSheetForks === "function") coachSheetForks(); /* fork.js: the fork load of each person */
  if (typeof coachSheetAudit === "function") coachSheetAudit(); /* csp.js: the money audit score of each person */
}
function coachSheetBase() {
  const t = todayISO();
  sheet(
    () =>
      head("Coach view", "Session prep") +
      G.chars
        .map(c => {
          const d = derive(c);
          refreshDup(c, d);
          const cs = conditions(c, d, t).filter(x => x.t === "debuff" || x.t === "warn"),
            uf = unfinished(c, d),
            path = candidates(c, d, t).slice(0, 3),
            last = c.hist[c.hist.length - 1],
            rec = c.diary.filter(x => daysBetween(x.d, t) <= 14),
            hard = rec.filter(x => x.feel === "Stressed" || x.feel === "Tight").length,
            mm = monthMoves(c, t.slice(0, 7)),
            sp = sharpPct(c);
          const ag = [];
          if (sp < 100)
            ag.push(
              "Numbers are " +
                sp +
                "% real. Still guesses: " +
                sharpList(c)
                  .filter(k => !isSharp(c, k))
                  .map(k => SHARP_Q[k].toLowerCase())
                  .join(", ")
            );
          if (d.pending) ag.push("Confirm " + eraN(d.rawEra) + " with real balances");
          cs.slice(0, 3).forEach(x => ag.push(x.n + ": " + x.d));
          if (uf.list.length)
            ag.push(uf.list.length + " unfinished step" + (uf.list.length === 1 ? "" : "s") + " from earlier eras");
          if (G.coachDiary && hard >= 3)
            ag.push("Money felt tight or stressed on " + hard + " of the last " + rec.length + " logged days");
          path.forEach((p, i) => ag.push("Path step " + (i + 1) + ": " + p.title));
          return `<div class="card stack"><div class="row between"><h3>${esc(c.name)}</h3><span class="pill ${d.realm === "Underground" ? "under" : "surface"}">${d.realm}</span></div>
 <div class="small">${eraN(d.era)} (era ${d.era}) · ${esc(chapterOf(c))} · ${esc(c.work)}${d.varies ? " · income varies" : ""}${c.home === "With family" ? " · lives with family" : ""}</div>
 <div class="grid2"><div class="tile"><div class="tiny muted">Own minus owe</div><b>${money(d.nw)}</b></div><div class="tile"><div class="tiny muted">Freedom date</div><b>${d.etaAge === null ? "Not yet" : "Age " + d.etaAge}</b></div><div class="tile"><div class="tiny muted">Runway</div><b>${mo(c.months)} of ${mo(d.target)} mo</b></div><div class="tile"><div class="tiny muted">This month's moves</div><b>${signed(mm.delta)} (${mm.n})</b></div></div>
 <div class="tile"><div class="small"><b>Agenda</b></div>${ag.map((a, k) => `<div class="small">${k + 1}. ${esc(a)}</div>`).join("")}</div>
 <div class="tiny muted">Last update: ${last ? nice(last.d) + (last.verified ? " (real numbers)" : " (not verified)") : "none"} · Streak ${c.streak} · Payday rounds ${c.paydays.length} · Skills ${d.skillsDone} · Muscles ${d.mus}/${MUSCLES.length}</div>
 ${
   G.coachDiary
     ? `<div class="tiny muted">Recent feelings: ${
         rec
           .slice(-7)
           .map(x => esc(x.feel))
           .join(", ") || "none logged"
       }</div>`
     : `<div class="tiny muted">Diary hidden from coach view.</div>`
 }</div>`;
        })
        .join("") +
      `<div class="card"><div class="row between"><div><b>Show diary to coach</b><div class="tiny muted">The player decides.</div></div><div class="seg"><button class="${G.coachDiary ? "" : "on"}" data-a="cdiary" data-v="0">No</button><button class="${G.coachDiary ? "on" : ""}" data-a="cdiary" data-v="1">Yes</button></div></div></div><div class="tiny muted">For now this works on the same phone. To see someone's game on your phone, have them copy it from "Save or move my game" and send you the text.</div>`
  );
}

/* peopleSheet() opens the sheet "People".
   profiles.js has the present sheet (profOpen). The lines below it run only while the page loads, before profiles.js is there. */
function peopleSheet() {
  if (typeof profOpen === "function") return profOpen();
  sheet(
    () =>
      head("People in this game", G.demo ? "Sample characters" : "Your household") +
      `<div class="stack">${G.chars
        .map((c, i) => {
          const d = derive(c);
          return `<div class="row between tile"><span class="small"><b>${esc(c.name)}</b><div class="tiny muted">${eraN(d.era)} · ${d.realm}</div></span>${i === G.active ? `<span class="tiny muted">Playing now</span>` : `<button class="ghost slim" data-a="switch" data-v="${i}">Play as</button>`}</div>`;
        })
        .join("")}</div>` +
      (G.demo
        ? `<button class="primary wide" data-a="start">Now let's do you</button>`
        : q(
            "Who you combine money with",
            chipsRow("share", ["No one", "A partner", "More than one partner", "Family"], G.house.share, "gh")
          ) +
          `<button class="primary wide" data-a="addperson">Add a person</button><div class="tiny muted">Each person gets their own character. The household shows up on Home once there are two or more.</div>`)
  );
}
function shareSheet() {
  sheet(
    () =>
      head("Share", "Scan to open the game") +
      `<div class="qr">${window.QR_SVG || ""}</div><div class="small muted">${esc(window.QR_URL || "")}</div><div class="tiny muted">The page is private until you share it from its page on claude.ai. Do that first, or the code opens a locked page.</div><button class="primary wide" data-a="close">Close</button>`
  );
}
function backupSheet() {
  W = { kind: "backup", o: { imp: "" }, msg: "" };
  sheet(
    () =>
      head("Save or move my game", "Copy and paste") +
      `<div class="field"><label class="small" for="exp">Your game as text</label><textarea id="exp" readonly rows="4">${esc(JSON.stringify(G))}</textarea></div><button class="primary wide" data-a="copy">Copy my game</button>${W.msg ? `<div class="small" style="color:var(--good)">${W.msg}</div>` : ""}<details class="math"${W.o.imp || W.err ? " open" : ""}><summary>Load a game someone copied for you</summary><div class="stack" style="gap:8px;padding:8px 10px"><div class="field"><label class="small" for="imp">Paste the copied text here</label><textarea id="imp" data-k="imp" rows="4" placeholder="Paste the copied text">${esc(W.o.imp)}</textarea></div>${W.err ? `<div class="err">${W.err}</div>` : ""}<button class="ghost wide" data-a="import">Load this game</button><div class="tiny muted">Loading replaces the game on this phone.</div></div></details>`
  );
}
function flagSheet() {
  const where = tab + (tab === "map" && MP.r ? " › " + MP.r + (MP.t ? " › " + MP.t : "") : "");
  sheet(
    () =>
      head("Flag this screen", where) +
      `<div class="small muted">One tap. Then tell Claude about it in chat.</div><div class="stack">${["Confusing", "Looks wrong", "Something is missing", "Love this"].map(k => `<button class="rowbtn" data-a="flagsave" data-k="${esc(where)}" data-v="${k}"><span>${k}</span></button>`).join("")}</div>`
  );
}

/* ledger line editor */
const SEC = {
  incs: ["take", "Money coming in", "n", INC_KINDS, "incKinds"],
  cashes: ["cash", "Cash", "c", ["Checking", "Savings", "Cash at home", "Other cash"], null],
  invs: ["inv", "Investments", "v", INV_K, null],
  debts: ["debt", "What you owe", "d", DEBT_KINDS.map(x => x[0]), "debtKinds"],
};
SEC.spends = ["cat", "Money going out", "s", SPEND_K, null];
function rowEdit(sec, i) {
  const c = C();
  W = { kind: "row", sec, i, pad: null, o: moneyO(c) };
  sheet(() => {
    const w = W,
      o = w.o;
    if (sec === "low" || sec === "moveOut")
      return (
        head("Money", sec === "low" ? "Money in, in a low month" : "Extra it would cost to move out") +
        numq(sec, sec === "low" ? "What lands in a low month" : "Rent, food and bills you'd take on", "spend", {
          help: sec === "moveOut" ? "This keeps your freedom number honest while family covers some costs." : "",
        }) +
        `<button class="primary wide go" data-a="rowsave">Save this number</button>`
      );
    const S = SEC[sec],
      x = o[sec][i];
    return (
      head("Money · " + S[1], esc(x.k)) +
      numq(
        S[2] + ":" + i,
        sec === "incs"
          ? "What lands from this in a typical month"
          : sec === "debts"
            ? "What you owe on it today"
            : sec === "spends"
              ? "What you spend on this in a month"
              : "What's in it today",
        S[0],
        { help: sec === "spends" ? SPEND_ONE[x.k] : "" }
      ) +
      (sec === "incs" && typeof incFreqEd === "function" ? incFreqEd(x.k) : "") +
      (sec === "debts"
        ? q(
            "What rate does it charge a year?",
            `<div class="chips">${APR_BANDS.concat(["No interest"])
              .map(
                b =>
                  `<button class="chip ${x.apr === b ? "on" : ""}" data-a="dapr" data-k="${i}" data-v="${b}">${b}</button>`
              )
              .join("")}</div>`,
            "It's called the APR. It's on your statement. 8% or more counts as expensive debt." +
              (x.apr && x.apr !== "?"
                ? ""
                : " Right now the game is treating this one as " + (x.high ? "8% or more." : "under 8%.")) +
              (x.rate != null && bandOf(x.rate) === x.apr ? " You entered " + x.rate + "%." : "")
          ) + ratePad()
        : "") +
      (sec === "cashes" && /Savings/.test(x.k)
        ? q(
            "Does it pay about 4% interest a year, or more?",
            `<div class="chips">${["Yes", "No", "I'll find out"].map(b => `<button class="chip ${x.hy === b ? "on" : ""}" data-a="dhy" data-k="${i}" data-v="${b}">${b}</button>`).join("")}</div>`,
            "That's called a high-yield savings account." + (x.apy != null ? " You entered " + x.apy + "%." : "")
          ) + ratePad()
        : "") +
      `<button class="primary wide go" data-a="rowsave">${x.s ? "Save" : "Save as a real number"}</button>${sec === "spends" ? "" : `<button class="ghost wide" data-a="rowdel">Remove this from my list</button>`}<div class="tiny muted"><b>Where to find this:</b> ${SHARP_FIND[S[0] === "cat" ? "spend" : S[0]]}</div>`
    );
  });
}
function rowAdd(sec) {
  const c = C(),
    S = SEC[sec],
    have = c[sec].map(x => x.k),
    opts = S[3].filter(k => !have.includes(k));
  W = { kind: "rowadd", sec };
  sheet(
    () =>
      head("Money · " + S[1], "Add one") +
      `<div class="stack">${opts.map(k => `<button class="rowbtn" data-a="rowaddk" data-k="${sec}" data-v="${k}"><span>${k}</span><span class="caret">›</span></button>`).join("") || `<div class="small muted">You've added every kind.</div>`}</div>`
  );
}

/* ---------- render ---------- */
let SEEN = {},
  SEENKEY = "";
/* DRAW THE SCREEN.
   render() is the full function. It calls each part by name.
   renderBase() is the part from this file: the top bar, the open tab, and the tab bar. */
function render() {
  const wel = typeof renderUxStart === "function" ? renderUxStart() : false; /* ux.js: a new player stays on Home */
  /* planner.js: tidy the plan. On the tab "plan", it also draws the screen and returns true. */
  const drawn = typeof renderPlan === "function" ? renderPlan() : false;
  if (!drawn) renderBase();
  if (typeof renderPlanBars === "function") renderPlanBars(); /* planner.js: the top bar and the tab bar */
  if (typeof renderUxEnd === "function") renderUxEnd(wel); /* ux.js: the page marks, the tab bar, the mark "Saved" */
  if (typeof renderDep === "function") renderDep(); /* dep.js: the line "this changed that" */
  if (typeof tkChipSafe === "function") tkChipSafe(); /* testkit.js: the chip of a test task */
}
function renderBase() {
  applyLook();
  const c = C();
  D = derive(c);
  refreshDup(c, D);
  const acc =
      typeof getComputedStyle === "function" && document.body
        ? (getComputedStyle(document.body).getPropertyValue("--a1") || "").trim() || "#2046d4"
        : "#2046d4",
    el = $("#app"),
    qa = el && el.querySelectorAll ? q => Array.prototype.slice.call(el.querySelectorAll(q)) : null,
    sy = typeof scrollY === "number" ? scrollY : 0;
  el.innerHTML =
    `<div class="topbar"><span class="grp"><button class="ghost slim" data-a="glossary">Glossary</button><button class="ghost slim" data-a="themes">Theme</button></span><button class="ghost slim safebtn" data-a="safe">Safe to spend?</button></div>` +
    (typeof profStrip === "function" ? profStrip() : "") +
    (tab === "home"
      ? home()
      : tab === "map"
        ? typeof UX_ON !== "undefined" && UX_ON
          ? nextTab()
          : mapTab()
        : tab === "play"
          ? playTab()
          : tab === "money"
            ? moneyTab()
            : tab === "goals" && typeof UX_ON !== "undefined" && UX_ON
              ? goalsTab()
              : meTab());
  if (qa && !SH) {
    const key = tab + "|" + G.active + "|" + c.name,
      same = key === SEENKEY,
      now = {};
    qa("[data-fid]").forEach(n => {
      const y = n.getBoundingClientRect().top + sy,
        o = SEEN[n.dataset.fid];
      now[n.dataset.fid] = { y, t: n.textContent };
      if (!same || !o) return;
      if (n.dataset.fmove) {
        const dy = o.y - y;
        if (Math.abs(dy) > 6 && n.animate)
          n.animate(
            [
              { transform: "translateY(" + dy + "px)", background: acc },
              { transform: "none", background: "transparent" },
            ],
            { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)" }
          );
      } else if (o.t !== n.textContent) n.classList.add("flash");
    });
    SEEN = now;
    SEENKEY = key;
  }
  const t = todayISO(),
    dot = c.lastDaily !== t || (c.payKnown && t >= c.payNext);
  $("#tabs").innerHTML = [
    ["home", "Home"],
    ["map", "Skills"],
    ["log", "+ Log"],
    ["play", "Check in"],
    ["money", "Money"],
    ["me", "Me"],
  ]
    .map(x =>
      x[0] === "log"
        ? `<button class="logtab" data-a="flow" data-v="">${x[1]}</button>`
        : `<button class="${tab === x[0] ? "on" : ""}" data-a="tab" data-v="${x[0]}">${x[1]}${x[0] === "play" && dot ? `<span class="dot"></span>` : ""}</button>`
    )
    .join("");
  if (typeof UX_ON !== "undefined" && UX_ON) $("#tabs").innerHTML = uxTabs(dot);
}
/* GO TO A TAB.
   go(t) is the full function. It calls each part by name. goBase(t) is the part from this file. */
function go(t) {
  const prev = tab;
  if (typeof goUxStart === "function") goUxStart(t, prev); /* ux.js: keep the scroll position and the open sheet */
  if (typeof goNav === "function") goNav(t); /* planner.js: record the tab for the button Back */
  goBase(t);
  if (typeof goUxEnd === "function") goUxEnd(t, prev); /* ux.js: the browser history, the scroll position */
}
function goBase(t) {
  tab = t;
  closeSheet();
  render();
  if (typeof scrollTo === "function") scrollTo(0, 0);
}
function openBest() {
  const bm = bestMove(C(), D, todayISO());
  if (bm.kind === "node") {
    closeSheet();
    nodeSheet(bm.id);
  } else if (bm.kind === "skill") {
    closeSheet();
    skillSheet(bm.id);
  } else {
    MP = { r: null, t: null };
    go("map");
  }
}
/* afterSharp(c) runs after the player makes one number real. afterSharpBase(c) is the part from this file. */
function afterSharp(c) {
  /* ask2.js: the sheet "Done" after one small question */
  if (typeof afterSharpAsk === "function" && afterSharpAsk(c)) return;
  return afterSharpBase(c);
}
function afterSharpBase(c) {
  const n = sharpNext(c, todayISO());
  if (!c.placed && sharpPct(c) >= 100) {
    c.placed = true;
    c.base = { d: todayISO(), nw: Math.round(derive(c).nw) };
    settle(c, null);
    save();
    render();
    if (creditList(c).length) creditSheet();
    else
      celebrate(
        "Your numbers are real",
        ["Era confirmed: " + eraName(D)],
        "From here, eras move up on real numbers in your monthly session."
      );
  } else if (n) openSharp(n);
  else {
    closeSheet();
    render();
  }
}

const ACT = {
  tab: t => go(t.dataset.v),
  close: () => {
    closeSheet();
    render();
    if (MQ.length) openMove(MQ.shift());
    else if (MSUM.length) moveSummary();
  },
  info: t => infoSheet(t.dataset.k),
  start: () => openSetup(G.demo ? "new" : "edit"),
  edit: () => openSetup("edit"),
  addperson: () => openSetup("add"),
  nextsample: () => {
    G.active = (G.active + 1) % G.chars.length;
    save();
    render();
  },
  switch: t => {
    G.active = +t.dataset.v;
    save();
    closeSheet();
    go("home");
  },
  find: () => findSheet(),
  coach: () => coachSheet(),
  people: () => peopleSheet(),
  share: () => shareSheet(),
  backup: () => backupSheet(),
  wrapped: () => wrappedSheet(),
  flag: () => flagSheet(),
  best: () => openBest(),
  daily: () => openDaily(),
  month: () => openMonth(),
  payday: t => openPayday(t.dataset.v === "practice"),
  paidtoday: () => {
    const c = C();
    c.payNext = todayISO();
    c.payKnown = true;
    save();
    render();
    openPayday(false);
  },
  cross: t => crossSheet(+t.dataset.v),
  unf: () => {
    openUnf = true;
    go("home");
  },
  node: t => nodeSheet(t.dataset.v),
  skill: t => skillSheet(t.dataset.v),
  park: t => {
    C().park[t.dataset.v] = todayISO();
    save();
    closeSheet();
    render();
  },
  unpark: t => {
    delete C().park[t.dataset.v];
    save();
    render();
  },
  mode: t => {
    mapMode = t.dataset.v;
    render();
  },
  gamer: t => {
    G.gamer = t.dataset.v === "1";
    save();
    render();
  },
  cdiary: t => {
    G.coachDiary = t.dataset.v === "1";
    save();
    drawSheet();
  },
  gh: t => {
    G.house[t.dataset.k] = t.dataset.v;
    save();
    drawSheet();
    render();
  },
  mp: t => {
    const l = t.dataset.l,
      id = t.dataset.id;
    if (l === "root") MP = { r: null, t: null };
    else if (l === "r") MP = { r: id, t: null };
    else if (l === "t") MP = { r: MP.r, t: id };
    else if (l === "jump") MP = { r: TREES[id].r, t: id };
    if (tab !== "map") {
      tab = "map";
      closeSheet();
    }
    render();
    if (typeof scrollTo === "function") scrollTo(0, 0);
  },
  plant: t => {
    const c = C(),
      id = t.dataset.v;
    if (!c.garden.includes(id)) {
      c.garden.push(id);
      if (c.compost > 0) {
        c.compost--;
        c.boost[id] = true;
      }
    }
    save();
    render();
  },
  wither: t => {
    const c = C(),
      id = t.dataset.v;
    c.garden = c.garden.filter(x => x !== id);
    c.compost++;
    delete c.boost[id];
    save();
    render();
  },
  bandall: t => {
    const c = C(),
      p = t.dataset.v.split(":"),
      b = +p[1],
      per = treeSize(p[0]) / 5;
    for (let k = 0; k < per; k++) {
      const id = p[0] + ":" + (b * per + k);
      if (!skillDone(c, id)) c.skills[id] = todayISO();
    }
    const got = settle(c, null);
    save();
    render();
    if (got.length) celebrate("Credit where it's due", got, null);
  },
  skilldone: t => {
    const c = C(),
      id = t.dataset.v,
      tr = id.split(":")[0];
    c.skills[id] = todayISO();
    c.saved = c.saved.filter(x => x !== id);
    const fin = treeDone(c, tr) >= treeSize(tr);
    if (fin) c.garden = c.garden.filter(x => x !== tr);
    const got = settle(c, null);
    save();
    render();
    celebrate(skillOf(id)[0], [fin ? "Tree finished" : null].concat(got), "Skill learned.");
  },
  skillundo: t => {
    delete C().skills[t.dataset.v];
    save();
    render();
    drawSheet();
  },
  savelater: t => {
    const c = C(),
      id = t.dataset.v;
    c.saved = c.saved.includes(id) ? c.saved.filter(x => x !== id) : c.saved.concat(id);
    save();
    render();
    drawSheet();
  },
  nudgeoff: () => {
    if (W) W.nudge = false;
    drawSheet();
  },
  rankup: t => {
    const c = C(),
      id = t.dataset.v,
      n = NODES.find(x => x.id === id),
      pr = D.realm;
    c.nodes[id] = Math.min(n.r, rank(id) + 1);
    D = derive(c);
    const done = rank(id) >= n.r;
    if (done) c.plate = c.plate.filter(x => x !== id);
    const got = settle(c, pr);
    save();
    render();
    if (done) celebrate(n.n, [n.w].concat(got), "Step done.");
    else drawSheet();
  },
  undo: t => {
    const c = C(),
      id = t.dataset.v;
    c.nodes[id] = Math.max(0, (c.nodes[id] || 0) - 1);
    save();
    render();
    drawSheet();
  },
  muscle: t => {
    const c = C(),
      i = t.dataset.v;
    if (c.muscles[i]) delete c.muscles[i];
    else c.muscles[i] = todayISO();
    const got = settle(c, null);
    save();
    render();
    if (got.length) celebrate("Muscle trained", got, null);
  },
  cset: t => {
    C()[t.dataset.k] = t.dataset.v;
    save();
    render();
  },
  csetn: t => {
    C()[t.dataset.k] = +t.dataset.v;
    save();
    render();
  },
  chapset: t => {
    C().chapter = t.dataset.v || null;
    save();
    closeSheet();
    render();
  },
  set: t => {
    if (!W) return;
    W.o[t.dataset.k] = t.dataset.v;
    W.err = false;
    drawSheet();
  },
  setn: t => {
    if (!W) return;
    W.o[t.dataset.k] = +t.dataset.v;
    drawSheet();
  },
  tog: t => {
    if (!W) return;
    const a = W.o[t.dataset.k],
      v = t.dataset.v;
    W.o[t.dataset.k] = a.includes(v) ? a.filter(x => x !== v) : a.concat(v);
    drawSheet();
  },
  togb: t => {
    W.o[t.dataset.k] = !W.o[t.dataset.k];
    drawSheet();
  },
  agedec: t => {
    W.o.ageDec = t.dataset.v;
    W.o.age = null;
    drawSheet();
  },
  padopen: t => {
    W.pad = t.dataset.k;
    W.fresh = true;
    drawSheet();
  },
  padclose: () => {
    W.pad = null;
    drawSheet();
  },
  rng: t => {
    const k = t.dataset.k;
    padSet(k, +t.dataset.v);
    W.t = W.t || {};
    W.t[k] = true;
    if (W.kind === "sharp" && W.q === "spend") {
      ACT.sharpdone();
      return;
    }
    drawSheet();
  },
  key: t => {
    const k = t.dataset.k,
      x = t.dataset.v;
    let v = W.fresh ? 0 : padGet(k) || 0;
    W.fresh = false;
    if (x === "del") v = Math.floor(v / 10);
    else if (x === "clr") v = 0;
    else {
      const n = Number(String(v) + x);
      if (n <= 99999999) v = n;
    }
    padSet(k, v);
    W.t = W.t || {};
    W.t[k] = true;
    W.err = false;
    drawSheet();
  },
  dhigh: t => {
    W.o.debts[+t.dataset.k].high = t.dataset.v === "1";
    drawSheet();
  },
  sharp: t => openSharp(t.dataset.v),
  sharpskip: () => {
    const c = C();
    c.skip[W.q] = todayISO();
    save();
    const n = sharpNext(c, todayISO());
    render();
    if (n) openSharp(n);
    else closeSheet();
  },
  sharpdone: () => {
    const w = W,
      c = C(),
      o = w.o,
      k = w.q,
      pr = D.realm;
    if ((k === "match" && !o.match) || (k === "tax" && !o.tax)) {
      w.err = true;
      drawSheet();
      return;
    }
    if (k === "take") {
      c.incs = o.incs;
      c.incs.forEach(x => (x.s = true));
      c.low = o.low;
      c.sharp.low = true;
    } else if (k === "spend") {
      o.spends[w.i].s = true;
      if (w.i < o.spends.length - 1) {
        w.i++;
        w.pad = null;
        drawSheet();
        return;
      }
      c.spends = o.spends;
      c.spends.forEach(x => (x.s = true));
    } else if (k === "cash") {
      c.cashes = o.cashes;
      c.cashes.forEach(x => (x.s = true));
    } else if (k === "inv") {
      c.invs = o.invs;
      c.invs.forEach(x => (x.s = true));
    } else if (k === "debt") {
      c.debts = o.debts;
      c.debts.forEach(x => (x.s = true));
    } else if (k === "match") {
      c.match =
        o.match === "Yes, and I get all of it" ? "yes" : o.match === "My job has no match" ? "no match offered" : "no";
      c.sharp.match = true;
    } else {
      c.tax = o.tax === "All of them are full" ? "yes" : o.tax === "I put in some" ? "some" : "no";
      c.sharp.tax = true;
    }
    afterMoney(c, pr, false);
    render();
    afterSharp(c);
  },
  creditsave: () => {
    const c = C();
    W.o.credit.forEach(id => {
      if (id[0] === "m") c.muscles[id.slice(1)] = todayISO();
      else c.nodes[id] = nodeMax(id);
    });
    const got = settle(c, null);
    save();
    render();
    celebrate(
      "Your numbers are real",
      ["Era confirmed: " + eraName(D)].concat(got.slice(0, 3)),
      "From here, eras move up on real numbers in your monthly session."
    );
  },
  wback: () => {
    W.step--;
    drawSheet();
  },
  wnext: () => {
    const w = W;
    if (w.kind === "setup") {
      if (!SETUP[w.step].req(w)) {
        w.err = true;
        drawSheet();
        return;
      }
      w.err = false;
      if (w.step === SETUP.length - 1) finishSetup();
      else {
        w.step++;
        drawSheet();
      }
    } else if (w.kind === "month") {
      if (w.step === 1) finishMonth();
      else {
        w.step++;
        w.pad = null;
        drawSheet();
      }
    } else if (w.kind === "pay") {
      if (w.step === 3) finishPay();
      else {
        w.step++;
        w.pad = null;
        drawSheet();
      }
    }
  },
  fset: t => {
    const k = t.dataset.k,
      v = t.dataset.v;
    W.o[k] = k === "age" ? +v : v;
    W.step++;
    drawSheet();
  },
  dlock: () => {
    W.step = 1;
    W.o.actual = W.o.guess;
    W.pad = "actual";
    W.fresh = true;
    drawSheet();
  },
  dskip: () => {
    W.step = 2;
    W.pad = null;
    drawSheet();
  },
  dreveal: () => {
    const o = W.o,
      a = o.actual;
    o.acc =
      a === 0 && o.guess === 0 ? 100 : Math.max(0, Math.round(100 - (Math.abs(o.guess - a) / Math.max(a, 1)) * 100));
    C().calib.push(o.acc);
    markDay(C());
    save();
    W.step = 2;
    W.pad = null;
    drawSheet();
  },
  dsave: () => {
    const o = W.o,
      c = C();
    if (!o.feel) {
      W.err = true;
      drawSheet();
      return;
    }
    c.spoons = o.spoons;
    c.slots = o.spoons <= 2 ? 3 : 5;
    c.diary.push({ d: todayISO(), feel: o.feel, note: o.note });
    markDay(c);
    const got = settle(c, null),
      acc = o.acc,
      mv = o.mv.slice(),
      feel = o.feel;
    save();
    render();
    if (mv.length) {
      MQ = mv;
      MSUM = [];
      openMove(MQ.shift());
    } else
      celebrate(
        "Today is logged",
        [
          acc !== null ? "Guess: " + acc + "% accurate" : null,
          "Streak: " + c.streak + " day" + (c.streak === 1 ? "" : "s"),
        ].concat(got),
        feel === "Stressed" || feel === "Tight" ? "Tough day. Showing up anyway is the skill." : null
      );
  },
  move: t => {
    const v = t.dataset.v;
    closeSheet();
    MQ = [];
    MSUM = [];
    openMove(v && MOVE_T[v] ? v : null);
  },
  mvtype: t => {
    const c = C();
    W.o.t = t.dataset.v;
    const rs = moveRows(c, W.o.t);
    if (rs.length === 1) W.o.row = rs[0].key;
    drawSheet();
  },
  mvsave: () => {
    const w = W,
      o = w.o,
      c = C(),
      pr = D.realm;
    if (!o.row) {
      w.err = "Tap which one first.";
      drawSheet();
      return;
    }
    if (!(o.amt > 0)) {
      w.err = "Tap in an amount first.";
      drawSheet();
      return;
    }
    const m = { d: todayISO(), t: o.t, amt: o.amt, row: o.row };
    applyMove(c, m);
    const got = afterMoney(c, pr, false);
    MSUM.push(m);
    MSUM.got = (MSUM.got || []).concat(got);
    render();
    if (MQ.length) openMove(MQ.shift());
    else moveSummary();
  },
  rowedit: t => rowEdit(t.dataset.k, +t.dataset.v),
  rowadd: t => rowAdd(t.dataset.v),
  rowaddk: t => {
    const c = C(),
      sec = t.dataset.k,
      k = t.dataset.v,
      S = SEC[sec],
      dk = DEBT_KINDS.find(x => x[0] === k);
    c[sec].push(sec === "debts" ? { k, amt: 0, high: dk ? dk[2] : false, s: false, was: 0 } : { k, amt: 0, s: false });
    if (S[4] && !c[S[4]].includes(k)) c[S[4]].push(k);
    afterMoney(c, D.realm, false);
    render();
    rowEdit(sec, c[sec].length - 1);
  },
  rowsave: () => {
    const w = W,
      c = C(),
      o = w.o,
      pr = D.realm,
      sec = w.sec;
    if (sec === "spend") {
      c.spend = Math.max(100, o.spend);
      c.sharp.spend = true;
    } else if (sec === "low") {
      c.low = o.low;
      c.sharp.low = true;
    } else if (sec === "moveOut") c.moveOut = o.moveOut;
    else {
      const x = o[sec][w.i];
      x.s = true;
      c[sec][w.i] = x;
    }
    const got = afterMoney(c, pr, false);
    closeSheet();
    render();
    if (!c.placed && sharpPct(c) >= 100) afterSharp(c);
    else if (got.length) celebrate("Updated", got, "Your numbers are updated everywhere.");
  },
  rowdel: () => {
    const w = W,
      c = C(),
      S = SEC[w.sec],
      k = c[w.sec][w.i].k;
    c[w.sec].splice(w.i, 1);
    if (S[4]) c[S[4]] = c[S[4]].filter(x => x !== k);
    afterMoney(c, D.realm, false);
    closeSheet();
    render();
  },
  padd: t => {
    const o = W.o,
      b = t.dataset.v,
      tot = BUCKETS.reduce((a, x) => a + (o.pick[x] || 0), 0);
    if (tot < 100) o.pick[b] = (o.pick[b] || 0) + 25;
    W.err = false;
    drawSheet();
  },
  pclear: () => {
    W.o.pick = {};
    drawSheet();
  },
  plock: () => {
    const o = W.o,
      tot = BUCKETS.reduce((a, x) => a + (o.pick[x] || 0), 0);
    if (tot < 100) {
      W.err = true;
      drawSheet();
      return;
    }
    o.locked = true;
    drawSheet();
  },
  pquiz: t => {
    W.o.choice = +t.dataset.v;
    drawSheet();
  },
  pmus: () => {
    W.o.mdone = !W.o.mdone;
    drawSheet();
  },
  crosssave: () => {
    const w = W,
      c = C();
    if (!w.o.pick) {
      w.err = true;
      drawSheet();
      return;
    }
    c["cross" + w.n] = w.o.pick;
    if (w.n === 7 && !c.cross6) c.cross6 = "Kept going to Coast";
    c.happy = w.o.happy || c.happy;
    save();
    render();
    celebrate("Path chosen", [w.o.pick], "You can change your mind any time.");
  },
  copy: () => {
    const txt = JSON.stringify(G);
    const ok = () => {
        if (W) {
          W.msg = "Copied. Paste it somewhere safe.";
          drawSheet();
        }
      },
      no = () => {
        if (W) {
          W.msg = "Couldn't copy on its own. Press and hold the text above to copy it.";
          drawSheet();
        }
      };
    try {
      navigator.clipboard.writeText(txt).then(ok, no);
    } catch (e) {
      no();
    }
  },
  import: () => {
    try {
      const g = JSON.parse(W.o.imp);
      if (!g || !Array.isArray(g.chars) || !g.chars.length || typeof g.chars[0].age !== "number") throw 0;
      g.chars = g.chars.map(c => {
        const n = migrate(c);
        if (!n.led) {
          n.debts = n.debts || [];
          rowsFromNumbers(n);
          n.placed = true;
        }
        return n;
      });
      G = Object.assign(fresh(), g);
      G.active = Math.min(G.active || 0, G.chars.length - 1);
      save();
      closeSheet();
      go("home");
    } catch (e) {
      W.err = "That doesn't look like a copied game. Copy the whole text and try again.";
      drawSheet();
    }
  },
  flagsave: t => {
    G.flags.push({ d: todayISO(), where: t.dataset.k, kind: t.dataset.v });
    save();
    closeSheet();
    render();
  },
  reset: () => {
    G = Object.assign(fresh(), { look: G.look, voice: G.voice, plain: G.plain });
    save();
    MP = { r: null, t: null };
    go("home");
  },
};
/* catches: one quick follow-up so the game records what actually happened */
function catchSheet(id, after) {
  const k = NODE_CATCH[id];
  W = { kind: "catch", id, after };
  sheet(
    () =>
      head("One quick thing", esc(nodeTitle(id))) +
      q(
        k.q,
        `<div class="stack">${k.opts.map(o => `<button class="rowbtn" data-a="caught" data-v="${o}"><span>${o}</span><span class="caret">›</span></button>`).join("")}</div>`,
        k.h || "So the game remembers what actually happened."
      ) +
      `<button class="ghost wide" data-a="caught" data-v="">Skip this</button>`
  );
}
const WIN_Q = [
  "No, it's a habit or a setup",
  "Yes, one-time money",
  "Yes, a lower bill every month",
  "Yes, more income every month",
];
function winSheet(id, after) {
  W = { kind: "win", id, after, pad: "amt", fresh: true, o: { kind: null, amt: 0 } };
  sheet(() => {
    const w = W,
      o = w.o;
    if (!o.kind)
      return (
        head("One quick thing", esc(skillOf(id)[0])) +
        q(
          "Did this put money in your pocket?",
          `<div class="stack">${WIN_Q.map(x => `<button class="rowbtn" data-a="winkind" data-v="${x}"><span>${x}</span><span class="caret">›</span></button>`).join("")}</div>`,
          "The game keeps a running total of what your skills earned you."
        )
      );
    return (
      head("One quick thing", esc(skillOf(id)[0])) +
      numq("amt", o.kind === WIN_Q[1] ? "About how much, one time?" : "About how much a month?", "") +
      `<button class="primary wide go" data-a="winsave">Save it</button><button class="ghost wide" data-a="winskip">Not sure, skip</button>`
    );
  });
}
function winsOf(c) {
  const o = { once: 0, month: 0, n: 0 };
  (c.wins || []).forEach(x => {
    o.n++;
    if (x.kind === "once") o.once += x.amt;
    else o.month += x.amt;
  });
  return o;
}
const progLine = (a, b) =>
  a.e === b.e && b.total ? "On the way to " + b.n + ": " + a.pct + "% → " + b.pct + "%" : null;
Object.assign(ACT, {
  themes: () => {
    go("me");
  },
  theme: t => {
    G.look = t.dataset.v;
    G.voice = t.dataset.v;
    save();
    render();
  },
  look: t => {
    const v = VC();
    G.look = t.dataset.v;
    G.voice = v;
    save();
    render();
  },
  voice: t => {
    const l = LK();
    G.voice = t.dataset.v;
    G.look = l;
    save();
    render();
  },
  detail: t => openDetail(t.dataset.v || null),
  dans: t => {
    const w = W,
      c = C(),
      v = t.dataset.v,
      key = w.ks[w.i],
      p = key.split(":"),
      i = +p[1],
      pr = D.realm;
    if (p[0] === "apr") {
      const x = c.debts[i];
      if (v === "I'll find out") {
        x.apr = "?";
        c.skip[key] = todayISO();
      } else {
        x.apr = v;
        x.high = !(v === "Under 8%" || v === "No interest");
      }
    } else if (p[0] === "hy") c.cashes[i].hy = v;
    else c.prot[p[1]] = v;
    const got = afterMoney(c, pr, false);
    render();
    if (w.i < w.ks.length - 1) {
      w.i++;
      drawSheet();
    } else {
      const lv = depthLevel(c);
      if (w.ks.length === 1 && lv <= w.lv0 && !got.length) {
        closeSheet();
        render();
      } else
        celebrate(
          lv > w.lv0 ? "Level " + lv + " complete" : "Saved",
          [lv > w.lv0 ? "Your picture: Level " + w.lv0 + " → Level " + lv + " of 5" : null].concat(got),
          "Your numbers are updated everywhere.",
          lv > w.lv0 ? "L" + lv : "✓"
        );
    }
  },
  dapr: t => {
    const x = W.o.debts[+t.dataset.k],
      v = t.dataset.v;
    x.apr = v;
    x.high = !(v === "Under 8%" || v === "No interest");
    drawSheet();
  },
  dhy: t => {
    W.o.cashes[+t.dataset.k].hy = t.dataset.v;
    drawSheet();
  },
  rowsave: () => {
    const w = W,
      c = C(),
      o = w.o,
      pr = D.realm,
      sec = w.sec;
    if (sec === "low") {
      c.low = o.low;
      c.sharp.low = true;
    } else if (sec === "moveOut") c.moveOut = o.moveOut;
    else {
      const x = o[sec][w.i];
      x.s = true;
      c[sec][w.i] = x;
    }
    const got = afterMoney(c, pr, false);
    closeSheet();
    render();
    if (!c.placed && sharpPct(c) >= 100) afterSharp(c);
    else if (got.length) celebrate("Updated", got, "Your numbers are updated everywhere.");
  },
  rankup: t => {
    const c = C(),
      id = t.dataset.v,
      n = NODES.find(x => x.id === id),
      pr = D.realm,
      p0 = eraProg(c, D);
    c.nodes[id] = Math.min(n.r, rank(id) + 1);
    D = derive(c);
    const done = rank(id) >= n.r;
    if (done) c.plate = c.plate.filter(x => x !== id);
    const got = settle(c, pr);
    save();
    render();
    if (!done) {
      drawSheet();
      return;
    }
    const fin = v => {
      const p1 = eraProg(C(), D),
        up = p1.e === p0.e ? p1.pct - p0.pct : 0;
      celebrate(
        n.n,
        [n.w, progLine(p0, p1), v ? "Noted: " + v : null].concat(got),
        "Step done.",
        up > 0 ? "+" + up + "%" : "✓"
      );
    };
    if (NODE_CATCH[id]) catchSheet(id, fin);
    else fin();
  },
  caught: t => {
    const w = W,
      c = C(),
      v = t.dataset.v,
      k = NODE_CATCH[w.id];
    if (v) {
      c.caught[k.key] = v;
      if (k.key === "hysa") {
        const r = c.cashes.find(x => /Savings/.test(x.k));
        if (r) r.hy = "Yes";
      }
      if (k.key === "score" && ["740 to 799", "800 or more"].includes(v)) c.nodes.cd_740 = 1;
      save();
    }
    w.after(v);
  },
  skilldone: t => {
    const c = C(),
      id = t.dataset.v,
      tr = id.split(":")[0],
      z = treeSize(tr),
      b0 = treeDone(c, tr);
    c.skills[id] = todayISO();
    c.saved = c.saved.filter(x => x !== id);
    const b1 = treeDone(c, tr),
      fin = b1 >= z;
    if (fin) c.garden = c.garden.filter(x => x !== tr);
    const got = settle(c, null);
    save();
    render();
    winSheet(id, wl =>
      celebrate(
        skillOf(id)[0],
        [trackN(tr) + ": " + b0 + " → " + b1 + " of " + z + " done", fin ? "Track finished" : null, wl].concat(got),
        "Skill learned.",
        "+" + Math.max(1, Math.round(((b1 - b0) / z) * 100)) + "%"
      )
    );
  },
  winkind: t => {
    const w = W;
    if (t.dataset.v === WIN_Q[0]) {
      w.after(null);
      return;
    }
    w.o.kind = t.dataset.v;
    drawSheet();
  },
  winskip: () => W.after(null),
  winsave: () => {
    const w = W,
      o = w.o,
      c = C();
    if (!(o.amt > 0)) {
      w.after(null);
      return;
    }
    const once = o.kind === WIN_Q[1];
    c.wins.push({ d: todayISO(), id: w.id, kind: once ? "once" : "month", amt: o.amt });
    save();
    const s = winsOf(c);
    w.after(
      "Worth " +
        money(o.amt) +
        (once ? " one time" : " a month") +
        ". Skills so far: " +
        money(s.once) +
        " one-time, " +
        money(s.month) +
        " a month"
    );
  },
  popen: t => {
    W.o.open = W.o.open === t.dataset.v ? null : t.dataset.v;
    W.pad = null;
    drawSheet();
  },
  pset: t => {
    const o = W.o,
      b = t.dataset.k,
      m = payMath(o),
      cap = m.rem + (o.alloc[b] || 0);
    o.alloc[b] = t.dataset.v === "rest" ? cap : Math.min(Math.round((m.free * +t.dataset.v) / 100), cap);
    W.err = false;
    W.pad = null;
    const m2 = payMath(o);
    o.open = m2.rem > 0 ? o.ord.find(x => x !== b && !o.alloc[x]) || null : null;
    drawSheet();
  },
  pclear: () => {
    const o = W.o;
    o.alloc = {};
    o.open = o.ord[0];
    W.pad = null;
    drawSheet();
  },
  pplan: () => {
    const o = W.o;
    o.alloc = planAmounts(o);
    ACT.plock();
  },
  plock: () => {
    const o = W.o,
      m = payMath(o);
    if (!(m.placed > 0)) {
      W.err = true;
      drawSheet();
      return;
    }
    if (m.rem > 0) o.alloc.Fun = (o.alloc.Fun || 0) + m.rem;
    o.score = payScore(payPicks(o), payPlan(o).split);
    o.locked = true;
    o.open = null;
    W.pad = null;
    drawSheet();
  },
  set: t => {
    if (!W) return;
    W.o[t.dataset.k] = t.dataset.v;
    W.err = false;
    if (W.kind === "sharp" && (W.q === "match" || W.q === "tax")) {
      ACT.sharpdone();
      return;
    }
    drawSheet();
  },
  pmoved: t => {
    const o = W.o,
      c = C(),
      pr = D.realm;
    o.moved = t.dataset.v === "1";
    if (o.moved) {
      payTargets(c, o).forEach(x => {
        const m = { d: todayISO(), t: x.t, amt: x.amt, row: x.row };
        applyMove(c, m);
        const r = rowsOf(c, x.row.split(":")[0])[+x.row.split(":")[1]];
        o.done.push(
          (x.t === "paid" ? "Paid " + money(x.amt) + " off " : "Put " + money(x.amt) + " into ") +
            x.k +
            ". Now " +
            money(r.amt) +
            "."
        );
      });
      if ((o.alloc.Invest || 0) > 0 && !c.invs.length)
        o.done.push(
          "No investment account is listed yet, so the " +
            money(o.alloc.Invest) +
            " wasn't recorded. Add one under Money."
        );
      afterMoney(c, pr, false);
      render();
    }
    drawSheet();
  },
  dreveal: () => {
    const o = W.o,
      a = o.actual,
      c = C(),
      pr = D.realm;
    o.acc =
      a === 0 && o.guess === 0 ? 100 : Math.max(0, Math.round(100 - (Math.abs(o.guess - a) / Math.max(a, 1)) * 100));
    c.calib.push(o.acc);
    markDay(c);
    const r = c.placed ? c.cashes.find(x => x.k === "Checking") : null;
    if (r && r.amt !== a) {
      o.was = r.amt;
      r.amt = a;
      r.s = true;
      afterMoney(c, pr, false);
      render();
    } else save();
    W.step = 2;
    W.pad = null;
    drawSheet();
  },
});
/* ---------- v7: fixes from the first live test ---------- */
const OPT_DESC = {
  Student: "School is your main thing right now.",
  "First job": "Your first real job, a year or two in.",
  "A few jobs or gigs": "You work, but it's a mix of jobs, shifts or gigs. Past a first job, not settled yet.",
  Established: "A few years into steady work.",
  "Between jobs": "Not working right now, or looking.",
  "Self-employed": "You run your own thing and pay yourself.",
  Retired: "Done working, at any age.",
  "I rent": "You pay rent, even if it's to family.",
  "I own": "You own it, with or without a mortgage.",
  "No cost": "Someone else covers your housing, like family or a partner.",
  "Single by choice": "Not looking, and happy that way.",
  "Single, seeking": "Open to meeting someone.",
  Dating: "Seeing someone. Money is still separate.",
  Partnered: "Committed, not married.",
  Married: "Legally married.",
  None: "No one counts on your money but you.",
  Planning: "Kids are on the way or in the plan.",
  Kids: "You're raising kids now.",
  "Supporting a parent": "You help pay for a parent or another relative.",
  Pets: "Animals that count on you. They cost real money.",
  Daily: "You get paid the same day you work.",
  "It varies": "No set schedule.",
};
const missing = (w, k) => w.err && (!w.o[k] || (Array.isArray(w.o[k]) && !w.o[k].length));
/* a setup question: tap selects right away, the meaning shows under it, and a skipped one lights up */
function qs(w, k, label, opts, help) {
  const cur = w.o[k] || "";
  return `<div class="field ${missing(w, k) ? "miss" : ""}"><div class="small">${label}${missing(w, k) ? ` <b style="color:var(--bad)">· still needs an answer</b>` : ""}</div>${chipsRow(k, opts, cur)}${OPT_DESC[cur] ? `<div class="tile small"><b>${cur}:</b> ${OPT_DESC[cur]}</div>` : help ? `<div class="tiny muted">${help}</div>` : ""}</div>`;
}
function qm(w, k, label, opts) {
  return `<div class="field ${missing(w, k) ? "miss" : ""}"><div class="small">${label}${missing(w, k) ? ` <b style="color:var(--bad)">· still needs an answer</b>` : ""}</div>${multiRow(k, opts, w.o[k])}</div>`;
}
SETUP[1].b = w =>
  qs(
    w,
    "work",
    "What's your work right now?",
    ["Student", "First job", "A few jobs or gigs", "Established", "Between jobs", "Self-employed", "Retired"],
    "Tap the closest one. You'll see what it means."
  ) +
  qm(w, "incKinds", "Where does your money come from? Tap all that fit", INC_KINDS) +
  qs(w, "payFreq", "How often does money come in?", [
    "Daily",
    "Weekly",
    "Every 2 weeks",
    "Twice a month",
    "Monthly",
    "It varies",
  ]) +
  qs(w, "steady", "Is it about the same each time?", ["Steady", "Changes month to month"]);
SETUP[2].b = w =>
  qs(w, "homeQ", "Where do you live?", Object.keys(HOMEMAP), "Rent, own, or no cost to you.") +
  qm(w, "live", "Who lives there with you? Tap all that fit", [
    "On my own",
    "Roommates",
    "A partner",
    "Kids",
    "Parents or family",
  ]);
SETUP[3].b = w =>
  qs(w, "rel", "Relationship", ["Single by choice", "Single, seeking", "Dating", "Partnered", "Married"]) +
  qs(w, "deps", "Does anyone rely on you for money?", ["None", "Planning", "Kids", "Supporting a parent", "Pets"]) +
  qs(
    w,
    "share",
    "Do you combine money with anyone?",
    ["No one", "A partner", "More than one partner", "Family"],
    "Splitting rent or bills with a roommate doesn't count. This is about shared accounts or shared goals."
  );
SETUP[6].b = w =>
  qs(w, "can1k", "A $1,000 surprise bill lands today. Could you pay it without borrowing?", ["Yes", "No"]) +
  qs(w, "cover", "If money stopped coming in, how long could you cover your bills?", Object.keys(COVER)) +
  qs(w, "invest", "Do you put money into investments?", ["No", "Sometimes", "Every month"]);
ACCT_HELP["Cash at home"] = "Bills and coins you keep on hand.";
/* paid by the shift: the game does the multiplying */
function shiftPanel() {
  const w = W,
    sh = w.shift,
    o = w.o;
  if (!sh)
    return `<button class="ghost wide" data-a="shopen">Paid by the shift or the gig? Let the game do the math</button>`;
  const ok = sh.n && sh.per,
    tot = ok ? sh.n * sh.per : 0;
  return `<div class="numopen stack"><div class="row between"><b>Shift math</b><button class="ghost slim" data-a="shclose">Close this</button></div>${o.incs.length > 1 ? q("Which one?", `<div class="chips">${o.incs.map((x, i) => `<button class="chip ${sh.row === i ? "on" : ""}" data-a="shset" data-k="row" data-v="${i}">${esc(x.k)}</button>`).join("")}</div>`) : ""}
 ${q("How many shifts or gigs in a typical month?", `<div class="chips">${[1, 2, 4, 6, 8, 10, 12, 15, 20, 25].map(n => `<button class="chip ${sh.n === n ? "on" : ""}" data-a="shset" data-k="n" data-v="${n}">${n}</button>`).join("")}</div>`)}
 ${q("About how much do you take home for each one?", `<div class="chips">${[25, 50, 75, 100, 125, 150, 175, 200, 250, 300].map(n => `<button class="chip ${sh.per === n ? "on" : ""}" data-a="shset" data-k="per" data-v="${n}">$${n}</button>`).join("")}</div>`)}
 ${ok ? `<button class="primary wide go" data-a="shuse">${sh.n} x ${money(sh.per)} = ${money(tot)} a month. Use it</button>` : `<div class="tiny muted">Tap one in each row and the game multiplies.</div>`}</div>`;
}
/* cash flow: log money in, money spent, a debt payment, or a move between accounts */
const FLOW_T = { in: "Money came in", out: "I spent money", pay: "I paid a debt", xfer: "I moved money" };
RANGES.flow = [
  [10, "$10"],
  [20, "$20"],
  [50, "$50"],
  [100, "$100"],
  [200, "$200"],
  [500, "$500"],
  [1000, "$1,000"],
];
function flowOpts(c, kinds) {
  const o = [];
  kinds.forEach(kd =>
    rowsOf(c, kd).forEach((x, i) => {
      if (kd !== "debt" || x.amt > 0 || kinds.length === 1) o.push([kd + ":" + i, x.k]);
    })
  );
  return o;
}
function openFlow(t) {
  const c = C(),
    o = { t: t || null, amt: 0, from: null, to: null, cat: null, src: null };
  W = { kind: "flow", pad: null, o };
  flowDefaults();
  sheet(flowSheet);
}
function flowDefaults() {
  const c = C(),
    o = W.o,
    one = a => (a.length === 1 ? a[0][0] : null),
    cash = flowOpts(c, ["cash"]);
  if (o.t === "in") {
    o.to = o.to || one(cash);
  }
  if (o.t === "pay") {
    o.from = o.from || one(cash);
    o.to = o.to || one(flowOpts(c, ["debt"]).filter(x => flowRow(c, x[0]).amt > 0));
  }
}
/* THE SHEET "LOG MONEY".
   flowSheet() makes the full sheet. flowSheetBase() is the part from this file. */
function flowSheet() {
  let h = flowSheetBase();
  /* ux.js: a plain title, the mark on a question with no answer, "I got paid" */
  if (typeof flowSheetLog === "function") h = flowSheetLog(h);
  return h;
}
function flowSheetBase() {
  const w = W,
    o = w.o,
    c = C(),
    pk = (k, opts) =>
      `<div class="chips">${opts.map(x => `<button class="chip ${o[k] === x[0] ? "on" : ""}" data-a="fset" data-k="${k}" data-v="${x[0]}">${esc(x[1])}</button>`).join("")}</div>`;
  if (!o.t)
    return (
      head("Cash flow", "What happened?") +
      `<div class="stack">${Object.keys(FLOW_T)
        .map(
          k =>
            `<button class="rowbtn" data-a="ftype" data-v="${k}"><span>${FLOW_T[k]}</span><span class="caret">›</span></button>`
        )
        .join(
          ""
        )}</div><div class="tiny muted">Every one you log updates the accounts it touches, everywhere in the game.</div>`
    );
  const cash = flowOpts(c, ["cash"]),
    all = flowOpts(c, ["cash", "inv"]),
    debts = flowOpts(c, ["debt"]).filter(x => flowRow(c, x[0]).amt > 0),
    cards = flowOpts(c, ["debt"]).filter(x => /card/i.test(x[1]));
  let b = "";
  if (o.t === "in")
    b =
      q("Where did it come from?", pk("src", c.incs.map(x => [x.k, x.k]).concat([["Other", "Something else"]]))) +
      q("Where did it land?", pk("to", all));
  else if (o.t === "out")
    b =
      q(
        "What was it for?",
        pk(
          "cat",
          SPEND_K.map(k => [k, k])
        )
      ) +
      q(
        "How did you pay?",
        pk("from", cash.concat(cards)),
        cards.length ? "Paying with a card adds to what you owe on it." : ""
      );
  else if (o.t === "pay")
    b =
      (debts.length
        ? q("Which debt?", pk("to", debts))
        : `<div class="banner small">You have no debts listed. Add one under Money first.</div>`) +
      q("Paid from", pk("from", cash));
  else
    b =
      q("From", pk("from", all)) +
      q(
        "To",
        pk(
          "to",
          all.filter(x => x[0] !== o.from)
        )
      );
  return (
    head("Cash flow", FLOW_T[o.t]) +
    b +
    numq("amt", "How much?", "flow") +
    (w.err ? `<div class="err">${w.err}</div>` : "") +
    `<button class="primary wide go" data-a="fsave">Log it</button><button class="ghost wide" data-a="ftype" data-v="">Back one</button>`
  );
}
function unna() {
  const c = C(),
    ids = Object.keys(c.na || {}).filter(id => c.na[id]);
  return ids.length
    ? `<details><summary>Doesn't apply to me (${ids.length})</summary><div class="inner stack">${ids.map(id => `<button class="rowbtn" data-a="unna" data-v="${id}"><span>${esc(id.includes(":") ? skillOf(id)[0] : nodeTitle(id))}</span><span class="tiny muted">Tap to bring back</span></button>`).join("")}</div></details>`
    : "";
}
const tagLink = tag =>
  esc(tag).replace(/toward (.+)$/, (m, n) => {
    const i = ERAS.findIndex(e => e["n"] === n);
    return i < 0
      ? m
      : `toward <button class="linkish" data-a="info" data-k="era:${i}">${eraT(i)} (what's that?)</button>`;
  });
Object.assign(ACT, {
  set: t => {
    if (!W) return;
    const k = t.dataset.k,
      v = t.dataset.v;
    if (W.kind === "sharp" && W.q === "match" && v === "I'm not sure") {
      ACT.sharpskip();
      return;
    }
    W.o[k] = v;
    W.err = false;
    if (W.kind === "sharp" && (W.q === "match" || W.q === "tax")) {
      ACT.sharpdone();
      return;
    }
    drawSheet();
  },
  sback: () => {
    const w = W;
    if (w.i > 0) {
      w.i--;
      w.pad = null;
      drawSheet();
    }
  },
  dback: () => {
    const w = W;
    if (w.i > 0) {
      w.i--;
      drawSheet();
    }
  },
  shopen: () => {
    W.shift = { row: 0, n: null, per: null };
    drawSheet();
  },
  shclose: () => {
    W.shift = null;
    drawSheet();
  },
  shset: t => {
    W.shift[t.dataset.k] = +t.dataset.v;
    drawSheet();
  },
  shuse: () => {
    const w = W,
      sh = w.shift,
      k = "n:" + sh.row;
    padSet(k, sh.n * sh.per);
    w.t = w.t || {};
    w.t[k] = true;
    w.shift = null;
    drawSheet();
  },
  already: t => {
    const c = C(),
      id = t.dataset.v,
      pr = D.realm;
    if (id.includes(":")) {
      c.skills[id] = todayISO();
      c.saved = c.saved.filter(x => x !== id);
    } else {
      c.nodes[id] = nodeMax(id);
      c.plate = c.plate.filter(x => x !== id);
    }
    settle(c, pr);
    save();
    closeSheet();
    render();
  },
  na: t => {
    const c = C(),
      id = t.dataset.v;
    c.na[id] = true;
    c.plate = c.plate.filter(x => x !== id);
    c.saved = c.saved.filter(x => x !== id);
    settle(c, D.realm);
    save();
    closeSheet();
    render();
  },
  unna: t => {
    const c = C();
    delete c.na[t.dataset.v];
    save();
    render();
  },
  cred3: t => {
    const o = W.o,
      id = t.dataset.v;
    if (o.credit.includes(id)) {
      o.credit = o.credit.filter(x => x !== id);
      o.cna.push(id);
    } else if (o.cna.includes(id)) o.cna = o.cna.filter(x => x !== id);
    else o.credit.push(id);
    drawSheet();
  },
  creditsave: () => {
    const c = C();
    W.o.credit.forEach(id => {
      if (id[0] === "m") c.muscles[id.slice(1)] = todayISO();
      else c.nodes[id] = nodeMax(id);
    });
    (W.o.cna || []).forEach(id => {
      c.na[id] = true;
    });
    const got = settle(c, null);
    save();
    render();
    celebrate(
      "Your numbers are real",
      ["Era confirmed: " + eraName(D)].concat(got.slice(0, 3)),
      "From here, eras move up on real numbers in your monthly session."
    );
  },
  flow: t => openFlow(t.dataset.v || null),
  ftype: t => {
    W.o.t = t.dataset.v || null;
    W.err = null;
    W.pad = null;
    flowDefaults();
    drawSheet();
  },
  fset: t => {
    W.o[t.dataset.k] = t.dataset.v;
    W.err = null;
    drawSheet();
  },
  fsave: () => {
    const w = W,
      o = w.o,
      c = C(),
      pr = D.realm,
      need = o.t === "in" ? ["to"] : o.t === "out" ? ["cat", "from"] : ["from", "to"];
    if (need.some(k => !o[k])) {
      w.err = "Tap an answer in each row first.";
      drawSheet();
      return;
    }
    if (!(o.amt > 0)) {
      w.err = "Tap or type how much.";
      drawSheet();
      return;
    }
    const m = applyFlow(c, { d: todayISO(), t: o.t, amt: o.amt, from: o.from, to: o.to, cat: o.cat, src: o.src }),
      got = afterMoney(c, pr, false);
    render();
    const fr = flowRow(c, o.from),
      to = flowRow(c, o.to),
      lines = [moveLine(m)];
    if (fr) lines.push(fr.k + " is now " + money(fr.amt));
    if (to) lines.push(to.k + " is now " + money(to.amt));
    celebrate(
      "Logged",
      lines.concat(got),
      m.delta ? "Own minus owe moved " + signed(m.delta) + "." : "Money moved, and your total stayed the same."
    );
  },
});

/* ---------- v8: time frames, schedules, one cash flow system, themed step names ---------- */
const STEP_T = {
  fae: {
    cd_list: "Name every bargain you're bound by",
    cd_auto: "Enchant the tithes to pay themselves",
    cd_method: "Choose which bargain to break first",
    cd_stop: "Cage your cards",
    cd_apr: "Renegotiate the bargain",
    cd_first: "Break your first bargain",
    cd_gone: "Every cruel bargain broken",
    cd_full: "Leave no debt past moonrise",
    cd_740: "Earn the courts' trust",
    sf_buffer: "Keep a little glamour in reserve",
    sf_little: "Hide away your first thousand",
    sf_hysa: "Plant your gold where it grows",
    sf_deduct: "Know the price of every ward",
    sf_bige: "Raise the Stone Keep",
    sf_renters: "Ward your home",
    sf_disab: "Ward your own two hands",
    sf_term: "A promise for those you'd leave behind",
    sf_benef: "Name your heirs",
  },
  coven: {
    cd_list: "Name everyone you owe blood to",
    cd_auto: "Let the dues pay themselves at dusk",
    cd_method: "Choose which debt to drain first",
    cd_stop: "Seal the cards in the crypt",
    cd_apr: "Ask the lender to loosen its bite",
    cd_first: "Drive a stake through your first debt",
    cd_gone: "Every bloodsucking debt gone",
    cd_full: "Leave nothing unpaid by dawn",
    cd_740: "A name the old houses trust",
    sf_buffer: "Keep a few drops in reserve",
    sf_little: "Bury your first thousand",
    sf_hysa: "A vault that feeds itself",
    sf_deduct: "Know what each misfortune costs",
    sf_bige: "Raise the Manor Walls",
    sf_renters: "Guard the manor",
    sf_disab: "Guard your strength",
    sf_term: "Provide for your mortals",
    sf_benef: "Name who inherits the estate",
  },
  tabletop: {
    cd_list: "Map every monster and its damage",
    cd_auto: "Hire a henchman to pay the minimums",
    cd_method: "Pick your battle order",
    cd_stop: "Sheathe the cards",
    cd_apr: "Roll persuasion on the lender",
    cd_first: "Slay your first debt",
    cd_gone: "Clear the dungeon of 8%+ debt",
    cd_full: "Pay the tavern tab in full",
    cd_740: "Reputation: Honored (740+)",
    sf_buffer: "Keep a healing potion in checking",
    sf_little: "Stash 1,000 gold",
    sf_hysa: "Open a vault that pays interest",
    sf_deduct: "Know every trap's damage",
    sf_bige: "Fill the Keep's treasury",
    sf_renters: "Insure your base",
    sf_disab: "Armor for your income",
    sf_term: "A resurrection fund for the party",
    sf_benef: "Name who gets your loot",
  },
  north: {
    cd_list: "Count every debt and its bite",
    cd_auto: "Set the dues to pay themselves",
    cd_method: "Choose which debt falls first",
    cd_stop: "Sheathe the cards for winter",
    cd_apr: "Bargain with the moneylender",
    cd_first: "Burn your first debt",
    cd_gone: "Every hungry debt burned",
    cd_full: "Settle up at every moon",
    cd_740: "A name known in every hall",
    sf_buffer: "Keep dry wood by the door",
    sf_little: "Lay in your first thousand",
    sf_hysa: "A storehouse that fills itself",
    sf_deduct: "Know what each storm costs",
    sf_bige: "Fill the Stone Hall for winter",
    sf_renters: "Shield the longhouse",
    sf_disab: "Shield your working hands",
    sf_term: "Provide for your kin",
    sf_benef: "Name who holds the hall after you",
  },
};
const BTN_T = {
  fae: { doit: "Accept", notyet: "Another season" },
  coven: { doit: "Tonight", notyet: "Another night" },
  tabletop: { doit: "Accept quest", notyet: "Later" },
  north: { doit: "Take it up", notyet: "Not yet" },
};
const stepThemed = id => {
  if (id && id.includes(":")) {
    const p = id.split(":"),
      T = typeof SKILL_T !== "undefined" && SKILL_T[VC()];
    return T && T[p[0]] ? T[p[0]][+p[1]] || null : null;
  }
  return (STEP_T[VC()] || {})[id] || null;
};
const stepHTML = (id, plain) => {
  const t = stepThemed(id);
  return t ? `${esc(t)}<div class="tiny muted" style="font-weight:400">${esc(plain)}</div>` : esc(plain);
};
const BT = (k, plain) => (BTN_T[VC()] || {})[k] || plain;
let PH = null,
  PMORE = null;
const flowSign = m =>
  ["pay", "out", "paid", "cost"].includes(m.t) ? -m.amt : ["in", "extra"].includes(m.t) ? m.amt : 0;
function monthFlow(c, ym) {
  const o = { inn: 0, out: 0, debt: 0, n: 0 };
  c.moves
    .filter(m => m.d.slice(0, 7) === ym)
    .forEach(m => {
      o.n++;
      if (m.t === "in" || m.t === "extra") o.inn += m.amt;
      else if (m.t === "out" || m.t === "cost") o.out += m.amt;
      else if (m.t === "pay" || m.t === "paid") o.debt += m.amt;
    });
  return o;
}
/* path, split by how long things take */
function pathCard(c, d, t, ns, real, sec) {
  const all = candidates(c, d, t),
    hz = p => EFF_HZ[p.eff] || "month",
    due = routineDue(c, t),
    cnt = {};
  HZ.forEach(h => {
    cnt[h[0]] = all.filter(p => hz(p) === h[0]).length;
  });
  const ex = todayExtras(c, t);
  cnt.today += due.length + ex.length;
  const ph = PH && cnt[PH] !== undefined && (cnt[PH] || PH === "today") ? PH : (HZ.find(h => cnt[h[0]]) || HZ[0])[0],
    H = HZ.find(h => h[0] === ph),
    full = all.filter(p => hz(p) === ph),
    list = full.slice(0, PMORE === ph ? 8 : 3);
  return `<div class="card" ${sec || ""}><div class="row between"><h3>${VT("path", "Your path")}</h3>${ib("term:eff")}</div><div class="tiny muted">${real ? "" : "Built on guesses for now. "}Split by how long things take.</div>
 <div class="chips" style="margin-top:8px">${HZ.map(h => `<button class="chip ${ph === h[0] ? "on" : ""}" data-a="hz" data-v="${h[0]}">${h[1]}</button>`).join("")}</div><div class="tiny muted" style="margin-top:6px">${H[2]} In order. Start at 1.</div>
 <div class="stack" style="margin-top:8px">${ph === "today" ? due.map(r => `<div class="pathrow" data-fid="p:${r.id}" data-fmove="1"><div class="num">!</div><div class="grow"><b>${esc(routineLabel(c, r))}</b><div class="tiny muted">On your schedule · ${EVERY[r.every].toLowerCase()} · due ${nice(r.next)}</div><div class="row wrap" style="margin-top:6px"><button class="primary slim" data-a="rdo" data-v="${r.id}">${r.auto ? "Yes, it happened" : "Did it"}</button><button class="ghost slim" data-a="rskip" data-v="${r.id}">Skip this time</button></div></div></div>`).join("") + ex.map(x => `<div class="pathrow" data-fid="p:${x.id}" data-fmove="1"><div class="num">!</div><div class="grow"><b>${esc(x.t)}</b><div class="tiny muted">${esc(x.d)}</div><div class="row wrap" style="margin-top:6px"><button class="ghost slim" data-a="${x.a}" data-v="${x.id}">${x.l}</button></div></div></div>`).join("") : ""}
 ${list.length ? list.map((p, i) => `<div class="pathrow" data-fid="p:${p.id}" data-fmove="1"><div class="num">${i + 1}</div><div class="grow"><b>${stepHTML(p.id, p.title)}</b><div class="tiny muted">${EFFT[p.eff]} · ${tagLink(p.tag)}</div><div class="row wrap" style="margin-top:6px"><button class="${ns.best && ns.id === p.id ? "primary" : "ghost"} slim" data-a="${p.kind === "node" ? "node" : "skill"}" data-v="${p.id}">${BT("doit", "Do it")}</button>${p.kind === "node" && AUTO.includes(p.id) ? "" : `<button class="ghost slim" data-a="already" data-v="${p.id}">${BT("already", "Already done")}</button>`}<button class="ghost slim" data-a="park" data-v="${p.id}">${BT("notyet", "Not yet")}</button></div></div></div>`).join("") : ph === "today" && (due.length || ex.length) ? "" : `<div class="small muted">Nothing in this time frame right now. Try the next one.</div>`}</div>
 ${full.length > list.length ? `<button class="ghost slim" style="margin-top:8px" data-a="pmore" data-v="${ph}">Show ${Math.min(5, full.length - list.length)} more</button>` : ""}${ph === "today" ? `<button class="ghost slim" style="margin-top:8px" data-a="rnew">Add something that repeats, like a debt payment</button>` : ""}</div>`;
}
/* schedules */
const START_OPTS = [
  ["0", "Today"],
  ["1", "Tomorrow"],
  ["d1", "The 1st"],
  ["d15", "The 15th"],
  ["7", "In a week"],
];
function startDate(k) {
  const t = todayISO();
  if (k[0] !== "d") return addDays(t, +k);
  const day = +k.slice(1),
    d = parseISO(t);
  if (d.getDate() > day) d.setMonth(d.getMonth() + 1, day);
  else d.setDate(day);
  return iso(d);
}
function openRoutine(pre) {
  const c = C();
  W = {
    kind: "rt",
    pad: null,
    o: Object.assign({ t: null, from: null, to: null, amt: 0, every: null, start: null, auto: null }, pre || {}),
  };
  rtDefaults();
  sheet(routineSheet);
}
function rtDefaults() {
  const c = C(),
    o = W.o,
    cash = flowOpts(c, ["cash"]),
    debts = flowOpts(c, ["debt"]).filter(x => flowRow(c, x[0]).amt > 0);
  if (!o.from && cash.length === 1) o.from = cash[0][0];
  if (o.t === "pay" && !o.to && debts.length === 1) o.to = debts[0][0];
}
function routineSheet() {
  const w = W,
    o = w.o,
    c = C(),
    pk = (k, opts) =>
      `<div class="chips">${opts.map(x => `<button class="chip ${o[k] === x[0] ? "on" : ""}" data-a="rset" data-k="${k}" data-v="${x[0]}">${esc(x[1])}</button>`).join("")}</div>`;
  const cash = flowOpts(c, ["cash"]),
    all = flowOpts(c, ["cash", "inv"]),
    debts = flowOpts(c, ["debt"]).filter(x => flowRow(c, x[0]).amt > 0);
  let b = q(
    "What repeats?",
    pk("t", [
      ["pay", "A debt payment"],
      ["xfer", "Money into savings or investing"],
    ])
  );
  if (o.t === "pay")
    b +=
      (debts.length
        ? q("Which debt?", pk("to", debts))
        : `<div class="banner small">You have no debts listed. Add one under Money first.</div>`) +
      q("Paid from", pk("from", cash));
  if (o.t === "xfer")
    b +=
      q("From", pk("from", cash)) +
      q(
        "Into",
        pk(
          "to",
          all.filter(x => x[0] !== o.from)
        ),
        all.length < 2 ? "You only have one account listed. Add a savings account under Money first." : ""
      );
  if (o.t)
    b +=
      numq("amt", "How much each time?", "flow") +
      q(
        "How often?",
        pk(
          "every",
          Object.keys(EVERY).map(k => [k, EVERY[k]])
        )
      ) +
      q("When is the next one?", pk("start", START_OPTS)) +
      q(
        "Does your bank do it on its own?",
        pk("auto", [
          ["1", "Yes, it's automatic"],
          ["0", "No, I do it by hand"],
        ]),
        "Automatic is better. Most bank apps let you set a repeating payment or transfer. Set it up once there, and the game just asks you to confirm it went through."
      );
  return (
    head("Schedule", "Something that repeats") +
    b +
    (w.err ? `<div class="err">${w.err}</div>` : "") +
    (o.t ? `<button class="primary wide go" data-a="rsave">Set this schedule</button>` : "") +
    `<div class="tiny muted">On the day, it shows up under Today with one button that updates your accounts. The game can only remind you when you open it.</div>`
  );
}
function schedCard(c) {
  const rs = c.routines || [];
  return `<div class="card"><div class="row between"><h3>Schedules</h3><span class="tiny muted">${rs.length ? rs.length + " set" : "none yet"}</span></div><div class="small muted">Payments and transfers that repeat. On the day, they land in Today on your path.</div><div class="stack" style="margin-top:8px">${rs.map(r => `<div class="row between"><span class="small"><b>${esc(routineLabel(c, r))}</b><div class="tiny muted">${EVERY[r.every]} · next ${nice(r.next)}${r.auto ? " · automatic" : ""}</div></span><button class="ghost slim" data-a="rdel" data-v="${r.id}">Remove</button></div>`).join("")}<button class="ghost slim" data-a="rnew">Add a schedule</button></div></div>`;
}
function doRoutine(id, skip) {
  const c = C(),
    r = c.routines.find(x => x.id === id),
    pr = D.realm;
  if (!r) return;
  const t = todayISO();
  let lines = [],
    got = [];
  if (!skip) {
    const m = applyFlow(c, { d: t, t: r.t, amt: r.amt, from: r.from, to: r.to });
    got = afterMoney(c, pr, false);
    const fr = flowRow(c, r.from),
      to = flowRow(c, r.to);
    lines = [moveLine(m)];
    if (fr) lines.push(fr.k + " is now " + money(fr.amt));
    if (to) lines.push(to.k + " is now " + money(to.amt));
  }
  let n = nextDue(r.next, r.every);
  while (n <= t) n = nextDue(n, r.every);
  r.next = n;
  save();
  render();
  if (!skip)
    celebrate(
      "Logged",
      lines.concat(["Next one: " + nice(r.next)]).concat(got),
      r.t === "pay" ? "You owe " + money(r.amt) + " less." : "Right on schedule."
    );
}
function openMove(t) {
  const c = C(),
    two = flowOpts(c, ["cash", "inv"]).length > 1;
  openFlow({ paid: "pay", extra: "in", saved: two ? "xfer" : "in", cost: "out" }[t] || null);
}
Object.assign(ACT, {
  hz: t => {
    PH = t.dataset.v;
    PMORE = null;
    render();
  },
  pmore: t => {
    PMORE = t.dataset.v;
    render();
  },
  rnew: () => openRoutine(),
  rset: t => {
    const k = t.dataset.k,
      v = t.dataset.v;
    W.o[k] = k === "auto" ? v === "1" : v;
    W.err = null;
    if (k === "t") {
      W.o.to = null;
      rtDefaults();
    }
    drawSheet();
  },
  rsave: () => {
    const o = W.o,
      c = C();
    if (!o.t || !o.from || !o.to || !o.every || !o.start || o.auto === null) {
      W.err = "Tap an answer in each row first.";
      drawSheet();
      return;
    }
    if (!(o.amt > 0)) {
      W.err = "Tap or type how much.";
      drawSheet();
      return;
    }
    const r = {
      id: "r" + Date.now() + Math.floor(Math.random() * 1000),
      t: o.t,
      from: o.from,
      to: o.to,
      amt: o.amt,
      every: o.every,
      next: startDate(o.start),
      auto: o.auto,
    };
    c.routines.push(r);
    save();
    closeSheet();
    render();
    celebrate(
      "Schedule set",
      [routineLabel(c, r), EVERY[r.every], "Next one: " + nice(r.next)],
      "It lands in Today on your path when it's due."
    );
  },
  rdo: t => doRoutine(t.dataset.v, false),
  rskip: t => doRoutine(t.dataset.v, true),
  rdel: t => {
    const c = C();
    c.routines = c.routines.filter(x => x.id !== t.dataset.v);
    save();
    render();
  },
  fire: t => {
    G.fire = t.dataset.v === "1";
    save();
    render();
  },
  flow: t => {
    MQ = [];
    MSUM = [];
    openFlow(t.dataset.v || null);
  },
  move: t => {
    const v = t.dataset.v;
    closeSheet();
    MQ = [];
    MSUM = [];
    openMove(v && MOVE_T[v] ? v : null);
  },
  fsave: () => {
    const w = W,
      o = w.o,
      c = C(),
      pr = D.realm,
      need = o.t === "in" ? ["to"] : o.t === "out" ? ["cat", "from"] : ["from", "to"];
    if (need.some(k => !o[k])) {
      w.err = "Tap an answer in each row first.";
      drawSheet();
      return;
    }
    if (!(o.amt > 0)) {
      w.err = "Tap or type how much.";
      drawSheet();
      return;
    }
    const m = applyFlow(c, { d: todayISO(), t: o.t, amt: o.amt, from: o.from, to: o.to, cat: o.cat, src: o.src }),
      got = afterMoney(c, pr, false);
    render();
    if (MQ.length || MSUM.length) {
      MSUM.push(m);
      MSUM.got = (MSUM.got || []).concat(got);
      if (MQ.length) openMove(MQ.shift());
      else moveSummary();
      return;
    }
    const fr = flowRow(c, o.from),
      to = flowRow(c, o.to),
      lines = [moveLine(m)];
    if (fr) lines.push(fr.k + " is now " + money(fr.amt));
    if (to) lines.push(to.k + " is now " + money(to.amt));
    celebrate(
      "Logged",
      lines.concat(got),
      o.t === "pay"
        ? "You owe " + money(m.amt) + " less, and your cash is " + money(m.amt) + " lower."
        : o.t === "xfer"
          ? "Money moved. Your total stayed the same."
          : o.t === "in"
            ? "Money in."
            : "Money out."
    );
  },
});

/* ---------- v9: exact rates, month statement, calmer buttons ---------- */
const bandOf = r =>
  r <= 0 ? "No interest" : r < 8 ? "Under 8%" : r < 15 ? "8% to 15%" : r <= 25 ? "15% to 25%" : "Over 25%";
function ratePad() {
  const w = W;
  if (!w.rp) return `<button class="ghost wide" data-a="ropen">Type the exact rate instead</button>`;
  return `<div class="numopen"><div style="font-size:26px;font-weight:700">${w.rs || "0"}%</div><div class="pad">${["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map(x => `<button class="key" data-a="rkey" data-v="${x}">${x === "del" ? "Delete" : x}</button>`).join("")}</div><button class="primary wide go" style="margin-top:8px" data-a="ruse">Use ${w.rs || "0"}% a year</button></div>`;
}
function monthStatement(c) {
  const t = todayISO(),
    mf = monthFlow(c, t.slice(0, 7)),
    now = rsum(c.cashes) + c.inv,
    out = mf.out + mf.debt,
    start = now - mf.inn + out;
  return `<div class="card"><div class="row between"><h3>This month</h3><span class="tiny muted">from what you logged</span></div><div class="stack" style="gap:4px;margin-top:6px"><div class="row between small"><span>Had at the start of the month</span><b>${money(start)}</b></div><div class="row between small"><span>Came in</span><b style="color:var(--good)">+${money(mf.inn)}</b></div><div class="row between small"><span>Went out, debt payments included</span><b style="color:var(--bad)">-${money(out)}</b></div><div class="row between"><b>Have now</b><b class="big" data-fid="v:have">${money(now)}</b></div></div><div class="tiny muted" style="margin-top:4px">Cash plus investments. Moving money between your own accounts doesn't change it.</div></div>`;
}
Object.assign(ACT, {
  ropen: () => {
    W.rp = true;
    W.rs = "";
    drawSheet();
  },
  rkey: t => {
    const x = t.dataset.v;
    let r = W.rs || "";
    if (x === "del") r = r.slice(0, -1);
    else if (x === ".") {
      if (!r.includes(".")) r = (r || "0") + ".";
    } else {
      const n = r + x;
      if (parseFloat(n) < 100 && !/\.\d{3}/.test(n)) r = n;
    }
    W.rs = r;
    drawSheet();
  },
  ruse: () => {
    const w = W,
      r = parseFloat(w.rs || "0") || 0,
      c = C();
    if (w.kind === "detail") {
      const p = w.ks[w.i].split(":"),
        i = +p[1];
      w.rp = false;
      if (p[0] === "apr") {
        c.debts[i].rate = r;
        ACT.dans({ dataset: { v: bandOf(r) } });
      } else {
        c.cashes[i].apy = r;
        ACT.dans({ dataset: { v: r >= 4 ? "Yes" : "No" } });
      }
      return;
    }
    const x = w.o[w.sec][w.i];
    if (w.sec === "debts") {
      x.rate = r;
      x.apr = bandOf(r);
      x.high = r >= 8;
    } else {
      x.apy = r;
      x.hy = r >= 4 ? "Yes" : "No";
    }
    w.rp = false;
    drawSheet();
  },
});
/* glossary: every word the game uses, one tap away from any screen */
function glossaryList() {
  const out = [],
    seen = {};
  const put = (t, d) => {
    const k = t.toLowerCase();
    if (!seen[k] && d) {
      seen[k] = 1;
      out.push([t, d]);
    }
  };
  ERAS.forEach((e, i) =>
    put(
      VO().eras ? EP(i) + " (" + VO().eras[i] + ")" : EP(i),
      "Era " + i + " of 9. " + e.one + " To get here: " + e.gate + "."
    )
  );
  Object.keys(GLOSS).forEach(k => {
    if (adKey(k)) put(GLOSS[k][0], GLOSS[k][1]);
  });
  Object.keys(GLOSSARY).forEach(k => put(k, GLOSSARY[k]));
  put("Underground", "You owe more than you own. The first job is getting back to zero.");
  put("Surface", "You own more than you owe.");
  put(
    "Level 1 to 5",
    "Each area of money has five levels, from the basics to expert. Finish most of a level and you move up."
  );
  put("Time frames", "Your path is split by how long things take: today, this week, this month, this year.");
  put("Schedule", "Something that repeats, like a debt payment. On the day it's due it shows up under Today.");
  put("Cash flow", "Money coming in and money going out. Logging it keeps your account balances right.");
  return out.sort((a, b) => (a[0].toLowerCase() < b[0].toLowerCase() ? -1 : 1));
}
function glossarySheet() {
  const ls = glossaryList();
  let last = "";
  return (
    head("Glossary", "Every word, in plain English") +
    `<div class="small muted">${ls.length} words, A to Z. If something on a screen isn't here, tap "Something looks wrong" and tell us.</div>` +
    ls
      .map(x => {
        const L = x[0][0].toUpperCase(),
          h = L !== last ? `<div class="eyebrow" style="margin-top:8px">${L}</div>` : "";
        last = L;
        return h + `<div class="tile small"><b>${esc(x[0])}</b><div>${esc(x[1])}</div></div>`;
      })
      .join("")
  );
}
ACT.glossary = () => {
  W = null;
  sheet(glossarySheet);
};
/* ---------- v10: statements, role model and rival, rearrangeable Home, seasonal lists, themed tracks ---------- */
const TRACK_IDS = [
  "main-path",
  "portfolio-design",
  "tax-strategy",
  "real-estate",
  "income-career",
  "side-hustles",
  "entrepreneurship",
  "credit-cards",
  "deals-smart-buying",
  "cash-safety-net",
  "debt-leverage",
  "alternatives-speculation",
  "insurance-protection",
  "geo-arbitrage-location",
  "health-longevity",
  "family-generational-wealth",
  "withdrawal-decumulation",
  "knowledge",
  "financial-ops-tooling",
  "money-psychology",
  "time-capital",
  "social-capital",
  "pre-retirement-design",
  "storms-windfalls",
  "the-long-game",
];
const TRACK_T = {
  fae: [
    "The Growing Grove",
    "The Weaver's Loom",
    "Keeping the Tithe Small",
    "Hearth and Holdings",
    "Rising at Court",
    "Moonlight Trades",
    "A Court of Your Own",
    "Favors and Tokens",
    "The Clever Market",
    "The Hidden Spring",
    "Breaking Bargains",
    "Wild Magic",
    "Wards and Charms",
    "Choosing Your Realm",
    "The Body's Keeping",
    "Bloodline and Hearth",
    "Harvest Seasons",
    "The Library",
    "The Steward's Ledger",
    "The Mirror Within",
    "The Hourglass",
    "Allies and Kin",
    "The Next Season",
    "Tempests and Treasure",
    "The Long Road",
  ],
  coven: [
    "The Slow Feed",
    "The Collection",
    "Keeping the Taxman Out",
    "Estates and Manors",
    "Rising in the House",
    "Night Work",
    "A House of Your Own",
    "Marks of Trust",
    "The Shrewd Purchase",
    "The Blood Reserve",
    "Breaking Chains",
    "Dangerous Games",
    "Protections",
    "Choosing Your Haunt",
    "The Undying Body",
    "Bloodline",
    "Living on the Vault",
    "Old Knowledge",
    "The Ledger",
    "The Mind's Hunger",
    "Eternity's Hours",
    "The Coven",
    "After the Long Night",
    "Storms and Fortunes",
    "Forever",
  ],
  tabletop: [
    "Main Quest: Investing",
    "Party Composition",
    "Outwitting the Tax Collector",
    "Strongholds",
    "Class Leveling",
    "Side Quests",
    "Founding a Guild",
    "Reputation and Tokens",
    "The Bazaar",
    "The Potion Stash",
    "Slaying Debt",
    "The Wild Magic Table",
    "Armor and Wards",
    "Choosing Your Map",
    "Constitution",
    "The Family Campaign",
    "Living off the Hoard",
    "The Wizard's Library",
    "Inventory Management",
    "Wisdom Saves",
    "Action Economy",
    "The Party",
    "The Epilogue",
    "Random Encounters",
    "The Long Campaign",
  ],
  north: [
    "The Growing Herd",
    "Balancing the Storehouse",
    "The King's Due",
    "Land and Hall",
    "Rising in the Hold",
    "Winter Crafts",
    "Your Own Longship",
    "Name and Oath",
    "The Trading Post",
    "The Winter Store",
    "Burning Debts",
    "Raids and Gambles",
    "The Shield Wall",
    "Choosing Your Shore",
    "Body of Iron",
    "Kin and Bloodline",
    "Living off the Store",
    "Runes and Lore",
    "The Steward's Tally",
    "The Inner Hearth",
    "Daylight Hours",
    "Shield-Kin",
    "The Next Season",
    "Storms and Spoils",
    "The Long Saga",
  ],
};
function trackN(t) {
  const plain = SKILLS[t]["name"],
    th = TRACK_T[VC()],
    i = TRACK_IDS.indexOf(t);
  return th && i >= 0 ? th[i] + " · " + plain : plain;
}
/* Home sections the player can reorder or hide */
const DASH = [
  ["path", "Your path"],
  ["era", "Your era"],
  ["free", "Free to spend"],
  ["tiles", "Since you started, and this month"],
  ["bars", "Runway and protection"],
  ["watch", "Watch out for"],
  ["going", "Going for you"],
  ["levels", "Levels by area"],
  ["house", "Your household"],
  ["unfinished", "Unfinished business"],
];
function dashOrder() {
  const o = ((G.dash && G.dash.order) || []).filter(k => DASH.some(x => x[0] === k));
  DASH.forEach(x => {
    if (!o.includes(x[0])) o.push(x[0]);
  });
  return o;
}
function ds(id, hide) {
  const i = dashOrder().indexOf(id),
    off = hide || (G.dash && G.dash.off && G.dash.off[id]);
  return `data-sec="${id}" style="order:${10 + i}${off ? ";display:none" : ""}"`;
}
function dashSheet() {
  const o = dashOrder(),
    off = (G.dash && G.dash.off) || {};
  return (
    head("Home", "Rearrange this screen") +
    `<div class="small muted">Move things up or down, or hide what you don't use. Your next step always stays on top.</div><div class="stack">${o.map((k, i) => `<div class="tile row between" style="${off[k] ? "opacity:.5" : ""}"><b class="small">${DASH.find(x => x[0] === k)[1]}</b><span class="row"><button class="ghost slim" data-a="dashmv" data-k="${k}" data-v="-1" ${i === 0 ? "disabled" : ""}>Up</button><button class="ghost slim" data-a="dashmv" data-k="${k}" data-v="1" ${i === o.length - 1 ? "disabled" : ""}>Down</button><button class="ghost slim" data-a="dashtog" data-k="${k}">${off[k] ? "Show" : "Hide"}</button></span></div>`).join("")}</div><button class="ghost wide" data-a="dashreset">Put it back the way it was</button>`
  );
}
/* extra Today items: seasonal lists and the monthly investment check-in */
function todayExtras(c, t) {
  const out = seasonItems(c, t).map(x => ({ id: x.id, t: x.t, d: x.s + " · " + x.d, a: "sdone", l: "Done" }));
  if (invDue(c, t))
    out.push({
      id: "inv",
      t: "Update your investment balances",
      d: "Once a month. The game can't look up prices, so open your accounts and enter what each one is worth today.",
      a: "invupd",
      l: "Update now",
    });
  return out;
}
/* statements */
function stRow(a, b, cls) {
  return `<div class="row between small"><span>${a}</span><b class="${cls || ""}">${b}</b></div>`;
}
function statementSheet(kind, ym) {
  const c = C(),
    d = D,
    t = todayISO(),
    cash = rsum(c.cashes);
  ym = ym || t.slice(0, 7);
  let b = "";
  if (kind === "nw") {
    const base = c.base || c.hist[0];
    b = `<div class="tile stack" style="gap:4px"><div class="eyebrow">What you have</div>${c.cashes.map(x => stRow(esc(x.k), money(x.amt), x.s ? "" : "guess")).join("")}${c.invs.map(x => stRow(esc(x.k), money(x.amt), x.s ? "" : "guess")).join("")}${stRow("<b>Total you have</b>", money(cash + c.inv))}</div>
  <div class="tile stack" style="gap:4px"><div class="eyebrow">What you owe</div>${c.debts.length ? c.debts.map(x => stRow(esc(x.k) + (x.rate != null && x.rate > 0 ? " · " + x.rate + "%" : ""), money(x.amt), x.s ? "" : "guess")).join("") : `<div class="small muted">Nothing.</div>`}${stRow("<b>Total you owe</b>", money(c.debt))}</div>
  <div class="tile">${stRow("<b>What you have, minus what you owe</b>", `<span class="big">${money(d.nw)}</span>`)}${base ? `<div class="tiny muted" style="margin-top:4px">On ${nice(base.d)} it was ${money(base.nw)}. That's a change of ${signed(Math.round(d.nw - base.nw))}.</div>` : ""}</div><div class="tiny muted">Faded numbers are guesses that aren't exact yet yet.</div>`;
  } else if (kind === "cf") {
    const ms = c.moves.filter(m => m.d.slice(0, 7) === ym),
      grp = (f, key) => {
        const o = {};
        ms.filter(f).forEach(m => {
          const k = key(m) || "Other";
          o[k] = (o[k] || 0) + m.amt;
        });
        return o;
      },
      inn = grp(
        m => m.t === "in" || m.t === "extra",
        m => m.src
      ),
      out = grp(
        m => m.t === "out" || m.t === "cost",
        m => m.cat
      ),
      pay = grp(
        m => m.t === "pay" || m.t === "paid",
        m => m.k
      ),
      mv = grp(
        m => m.t === "xfer" || m.t === "saved",
        m => m.k
      ),
      sum = o => Object.keys(o).reduce((a, k) => a + o[k], 0),
      blk = (title, o, sign) =>
        `<div class="tile stack" style="gap:4px"><div class="eyebrow">${title}</div>${
          Object.keys(o).length
            ? Object.keys(o)
                .map(k => stRow(esc(k), sign + money(o[k])))
                .join("")
            : `<div class="small muted">Nothing logged.</div>`
        }${stRow("<b>Total</b>", sign + money(sum(o)))}</div>`;
    const pm = (() => {
        const dd = parseISO(ym + "-01");
        dd.setMonth(dd.getMonth() - 1);
        return iso(dd).slice(0, 7);
      })(),
      cur = t.slice(0, 7);
    b =
      `<div class="chips">${[
        cur,
        (() => {
          const dd = parseISO(cur + "-01");
          dd.setMonth(dd.getMonth() - 1);
          return iso(dd).slice(0, 7);
        })(),
      ]
        .map(
          (m, i) =>
            `<button class="chip ${ym === m ? "on" : ""}" data-a="stmt" data-v="cf" data-k="${m}">${i === 0 ? "This month" : "Last month"}</button>`
        )
        .join("")}</div>` +
      blk("Money in", inn, "+") +
      blk("Money out", out, "-") +
      blk("Paid on debt", pay, "-") +
      blk("Moved between your accounts", mv, "") +
      `<div class="tile">${stRow("<b>In, minus out and debt payments</b>", `<span class="big">${signed(sum(inn) - sum(out) - sum(pay))}</span>`)}</div><div class="tiny muted">Built from what you logged with the Log money button. ${ms.length} entries.</div>`;
  } else {
    const tot = c.inv;
    b = c.invs.length
      ? `<div class="tile stack" style="gap:6px"><div class="eyebrow">Your investments</div>${c.invs.map(x => `<div><div class="row between small"><span>${esc(x.k)}</span><b class="${x.s ? "" : "guess"}">${money(x.amt)}</b></div>${bar(tot ? (x.amt / tot) * 100 : 0)}<div class="tiny muted">${tot ? Math.round((x.amt / tot) * 100) : 0}% of your investments</div></div>`).join("")}${stRow("<b>Total</b>", money(tot))}</div><div class="tile small">${c.invUpd ? "Balances last updated " + nice(c.invUpd) + "." : "Balances haven't been updated yet."} The game can't look up live prices, so it asks you to update these once a month.<button class="ghost wide" style="margin-top:8px" data-a="invupd">Update balances now</button></div><div class="tile small">Put in this month: <b>${money(c.moves.filter(m => m.d.slice(0, 7) === t.slice(0, 7) && (m.t === "xfer" || m.t === "in" || m.t === "saved") && c.invs.some(x => x.k === m.k)).reduce((a, m) => a + m.amt, 0))}</b></div>`
      : `<div class="banner small">No investment accounts listed yet. Add one under Money.</div>`;
  }
  return (
    head("Statement", kind === "nw" ? "What you have and what you owe" : kind === "cf" ? "Cash flow" : "Investments") +
    `<div class="tiny muted">${kind === "cf" ? "" : "As of " + nice(t)}</div>` +
    b
  );
}
function statementsCard() {
  return `<div class="card"><h3>Statements</h3><div class="small muted">The same three reports a business keeps, for your own money.</div><div class="stack" style="margin-top:8px">${[
    ["nw", "What you have and what you owe", "Also called a net worth statement"],
    ["cf", "Cash flow", "Money in and money out, by month"],
    ["inv", "Investments", "What you hold and how it's split"],
  ]
    .map(
      x =>
        `<button class="rowbtn" data-a="stmt" data-v="${x[0]}"><span>${x[1]}<div class="tiny muted">${x[2]}</div></span><span class="caret">›</span></button>`
    )
    .join("")}</div></div>`;
}
/* role model and rival */
function rivalCard(c, d) {
  const t = todayISO(),
    rm = roleModel(c),
    key = c.rival || "normal",
    rs = rivalState(c, d, t, key),
    bm = bestMove(c, d, t);
  return `<div class="card"><div class="row between"><h3>Role model and rival</h3></div><div class="tile" style="margin-top:8px"><div class="eyebrow">Role model · someone to aim at</div><div class="small" style="margin-top:4px">Someone your age who did every step on time since 22 would have about <b>${money(rm.nw)}</b> saved and ${rm.cushion} months of cushion. Nobody is this person. It's a direction, not a score.</div>${bm && bm.title ? `<div class="small" style="margin-top:6px">The next thing they'd do that you haven't: <b>${esc(bm.title)}</b></div>` : ""}</div>
 <div class="tile" style="margin-top:8px"><div class="eyebrow">Rival · someone you can catch</div><div class="small" style="margin-top:4px">A made-up person who started the same day you did, from the same spot. Pick how hard they are.</div><div class="chips" style="margin-top:6px">${Object.keys(
   RIVALS
 )
   .map(k => `<button class="chip ${key === k ? "on" : ""}" data-a="rival" data-v="${k}">${RIVALS[k].n}</button>`)
   .join("")}</div><div class="small" style="margin-top:6px"><b>${rs.R.n}.</b> ${rs.R.d}</div>
 ${c.placed || G.demo ? `<div class="grid2" style="margin-top:8px"><div class="tile"><div class="tiny muted">You, in ${rs.days} day${rs.days === 1 ? "" : "s"}</div><div class="big">${signed(rs.you)}</div></div><div class="tile"><div class="tiny muted">${rs.R.n.split(" ")[1]}</div><div class="big">${signed(rs.them)}</div></div></div><div class="small" style="margin-top:6px">${rs.days < 7 ? "It's early. Check back in a week or two." : rs.gap >= 0 ? "You're ahead by " + money(rs.gap) + "." : "You're behind by " + money(-rs.gap) + ". One good month closes most of that."}</div>` : `<div class="tiny muted" style="margin-top:6px">The race starts once your numbers are close.</div>`}</div></div>`;
}
Object.assign(ACT, {
  stmt: t => {
    const k = t.dataset.v,
      ym = t.dataset.k;
    W = null;
    sheet(() => statementSheet(k, ym));
  },
  invupd: () => {
    const c = C();
    c.invUpd = todayISO();
    save();
    closeSheet();
    render();
    if (c.invs.length) openSharp("inv");
  },
  sdone: t => {
    const c = C();
    c.season[t.dataset.v] = true;
    save();
    render();
  },
  rival: t => {
    C().rival = t.dataset.v;
    save();
    render();
  },
  dash: () => {
    W = null;
    sheet(dashSheet);
  },
  dashmv: t => {
    const o = dashOrder(),
      k = t.dataset.k,
      i = o.indexOf(k),
      j = i + +t.dataset.v;
    if (j < 0 || j >= o.length) return;
    o.splice(i, 1);
    o.splice(j, 0, k);
    G.dash = Object.assign({ off: {} }, G.dash, { order: o });
    save();
    render();
    drawSheet();
  },
  dashtog: t => {
    G.dash = Object.assign({ order: dashOrder(), off: {} }, G.dash);
    G.dash.off = Object.assign({}, G.dash.off);
    G.dash.off[t.dataset.k] = !G.dash.off[t.dataset.k];
    save();
    render();
    drawSheet();
  },
  dashreset: () => {
    delete G.dash;
    save();
    render();
    drawSheet();
  },
});

/* ---------- v11: the money type test (nine types, 27 statements, original wording) ---------- */
const MTYPES = [
  {
    n: "The Careful One",
    s: "You do things properly and on time.",
    w: "Waiting for the perfect plan can keep you from starting.",
    m: "Pick good enough, automate it, and let it run.",
  },
  {
    n: "The Giver",
    s: "People can count on you.",
    w: "You can give away your own safety.",
    m: "Pay yourself first. Then give on purpose from what's left.",
  },
  {
    n: "The Achiever",
    s: "Goals pull you forward.",
    w: "Spending to look successful can undo real progress.",
    m: "Track percent toward your own goal and mute other people's numbers.",
  },
  {
    n: "The Original",
    s: "You know what matters to you.",
    w: "Your mood can do your spending for you.",
    m: "Build your plan around what you love, with one rule for bad days.",
  },
  {
    n: "The Researcher",
    s: "You understand before you act.",
    w: "Research can quietly replace action.",
    m: "Give every money decision a deadline.",
  },
  {
    n: "The Guardian",
    s: "You're ready when things go wrong.",
    w: "Too much cash, and too much worry.",
    m: "Write down your number for safe enough, then invest past it.",
  },
  {
    n: "The Adventurer",
    s: "You know how to enjoy money.",
    w: "Later never gets funded.",
    m: "Automate saving first, then spend the rest freely.",
  },
  {
    n: "The Boss",
    s: "You take charge and act.",
    w: "Big bets, and going it alone.",
    m: "Cap your bold bets in writing and let one person check your plan.",
  },
  {
    n: "The Peacekeeper",
    s: "You keep things calm and fair.",
    w: "Avoiding it means it doesn't get done.",
    m: "Set a short monthly money date and automate the rest.",
  },
];
const MQ_S = [
  [
    "I feel uneasy until my money is handled the right way.",
    "A money mistake bothers me for days.",
    "I'd rather follow the rules than cut a corner to save.",
  ],
  [
    "I spend on other people more easily than on myself.",
    "I find it hard to say no when someone needs money.",
    "Being generous is a big part of who I am.",
  ],
  [
    "I want my money to show that I'm doing well.",
    "I compare where I am with people my age.",
    "Hitting a number feels better than what the number buys.",
  ],
  [
    "What I buy says something about who I am.",
    "A standard budget feels like it wasn't made for me.",
    "My mood changes how I spend.",
  ],
  [
    "I research for a long time before I buy or invest.",
    "I'd rather need less than earn more.",
    "I keep my money details to myself.",
  ],
  [
    "I think about what could go wrong before what could go right.",
    "I feel safer with more cash than the experts say I need.",
    "I double-check advice, even from people I trust.",
  ],
  [
    "I'd rather pay for an experience now than save for later.",
    "Limits on my spending make me restless.",
    "I get excited about a new money idea, then move on fast.",
  ],
  [
    "I want to be the one making the money decisions.",
    "I'm comfortable making big bets.",
    "I'd rather owe no one anything.",
  ],
  [
    "I avoid money talks that might cause tension.",
    "I go along with what others want to spend on.",
    "I put off money tasks until I have to do them.",
  ],
];
/* 27 statements, mixed so no two from the same type sit together */
const MQ_ORDER = (() => {
  const o = [];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) o.push([(i * 4 + r * 2) % 9, r]);
  return o;
})();
const MQ_SCALE = [
  ["0", "Not me"],
  ["1", "A little"],
  ["2", "Mostly"],
  ["3", "Very me"],
];
function mtypeScore(ans) {
  const sc = Array(9).fill(0);
  MQ_ORDER.forEach((q, i) => {
    sc[q[0]] += +(ans[i] || 0);
  });
  const idx = sc.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  return { sc, top: idx[0][1], second: idx[1][1] };
}
function openMtype() {
  W = { kind: "mt", page: 0, o: { ans: {} } };
  sheet(mtypeSheet);
}
function mtypeSheet() {
  const w = W,
    p = w.page,
    qs = [0, 1, 2].map(k => p * 3 + k);
  return (
    head("Money type · " + (p + 1) + " of 9", "How true is this of you?") +
    `<div>${bar((p / 9) * 100)}</div><div class="tiny muted">Go with your first reaction. There are no right answers.</div>` +
    qs
      .map(i => {
        const m = MQ_ORDER[i];
        return q(
          `<b>${MQ_S[m[0]][m[1]]}</b>`,
          `<div class="chips">${MQ_SCALE.map(s => `<button class="chip ${w.o.ans[i] === s[0] ? "on" : ""}" data-a="mtans" data-k="${i}" data-v="${s[0]}">${s[1]}</button>`).join("")}</div>`
        );
      })
      .join("") +
    (w.err ? `<div class="err">Tap an answer for each one. The one still open needs yours.</div>` : "") +
    `<div class="row between">${p > 0 ? `<button class="ghost" data-a="mtback">Back one</button>` : "<span></span>"}<button class="${qs.every(i => w.o.ans[i] !== undefined) ? "primary go" : "ghost"}" data-a="mtnext">${p === 8 ? "See my type" : "Next: page " + (p + 2) + " of 9"}</button></div>`
  );
}
function mtypeCard(c) {
  const r = c.mtype;
  if (!r)
    return `<div class="card"><h3>Your money type</h3><div class="small muted">27 quick statements, about 4 minutes, all taps. You get your type, what it's good at, what to watch for, and your best first move.</div><button class="primary wide" style="margin-top:8px" data-a="mtype">Take the test</button></div>`;
  const T1 = MTYPES[r.top],
    T2 = MTYPES[r.second];
  return `<div class="card"><div class="row between"><h3>Your money type</h3><button class="ghost slim" data-a="mtype">Retake</button></div><h2 style="margin-top:6px">${T1.n}</h2><div class="small muted">with a side of ${T2.n}</div><div class="tile small" style="margin-top:8px"><b>What you're good at:</b> ${T1.s}</div><div class="tile small" style="margin-top:6px"><b>Watch for:</b> ${T1.w}</div><div class="tile small" style="margin-top:6px"><b>Your best move:</b> ${T1.m}</div><div class="tile small" style="margin-top:6px"><b>From your second type:</b> ${T2.w} ${T2.m}</div><div class="tiny muted" style="margin-top:6px">This is a mirror, not a diagnosis. Nine types, written for this game.</div></div>`;
}
Object.assign(ACT, {
  mtype: () => openMtype(),
  mtans: t => {
    W.o.ans[+t.dataset.k] = t.dataset.v;
    W.err = false;
    drawSheet();
  },
  mtback: () => {
    if (W.page > 0) {
      W.page--;
      W.err = false;
      drawSheet();
    }
  },
  mtnext: () => {
    const w = W,
      qs = [0, 1, 2].map(k => w.page * 3 + k);
    if (!qs.every(i => w.o.ans[i] !== undefined)) {
      w.err = true;
      drawSheet();
      return;
    }
    w.err = false;
    if (w.page < 8) {
      w.page++;
      drawSheet();
      return;
    }
    const c = C(),
      r = mtypeScore(w.o.ans);
    c.mtype = { top: r.top, second: r.second, d: todayISO() };
    save();
    render();
    celebrate(
      MTYPES[r.top].n,
      ["Good at: " + MTYPES[r.top].s, "Watch for: " + MTYPES[r.top].w, "Best move: " + MTYPES[r.top].m],
      "With a side of " + MTYPES[r.second].n + ". It's saved on your Me screen."
    );
  },
});

/* ===== v13: time is the currency. Goals with countdowns, the time ledger, "is it safe to spend this?", and the panel fixes ===== */
const EDU =
  "Education and practice, not personal financial advice. Rules and limits change. Numbers last checked " +
  LASTCHECK +
  ".";
const cents = n => (n > 0 && n < 0.005 ? "under 1¢" : (n < 0 ? "-" : "") + "$" + Math.abs(n).toFixed(2));
const mathBox = lines =>
  `<details class="math"><summary>Show the math</summary><div class="inner tiny stack" style="gap:4px">${lines
    .filter(Boolean)
    .map(l => `<div>${esc(l)}</div>`)
    .join("")}</div></details>`;
const onoff = (a, on) =>
  `<div class="seg"><button class="${on ? "" : "on"}" data-a="${a}" data-v="0">Off</button><button class="${on ? "on" : ""}" data-a="${a}" data-v="1">On</button></div>`;
Object.assign(GLOSS, {
  goals: [
    "Someday list",
    "The things you want your money to do one day. Place one in an era and the game shows how far away it is. Every money choice moves that date closer or further.",
  ],
  wage: [
    "Your money's hourly wage",
    "What your investments earn in an average hour, while you do anything else. It's what you have invested, times 7% a year, divided by the 8,760 hours in a year.",
  ],
  keep: [
    "What you keep",
    "The share of the money coming in that you don't spend. Some call it your savings rate. It's the number that sets how long you have to work.",
  ],
  big3: [
    "The big three",
    "Home, getting around and food. For most people they're more than half of all spending, so one good decision here beats a hundred small ones.",
  ],
  safe: [
    "Is it safe to spend this?",
    "A quick check against your free-to-spend, your cushion, your bills and your goals. It never just says no. It tells you what the spend would move.",
  ],
  tprice: [
    "What your hours are worth to you",
    "Your own price for an hour, worked out from which trades you'd take. It's different for family time, rest, chores, travel and work.",
  ],
  lever: ["Your biggest lever", "The one thing that would move your money the most right now. The game puts it first."],
});
DASH.splice(3, 0, ["goals", "Someday list"], ["rate", "What you keep"]);

/* gentle mode softens the first era */
function eraOne(d) {
  return C().gentle && d.era === 0
    ? "This is the start. One small step at a time, at your pace."
    : d.era === 0 && d.realm === "Surface"
      ? "You own more than you owe, but there's no cushion yet."
      : ERAS[d.era].one;
}
function eraName(d) {
  return C().gentle && d.era === 0
    ? "Getting Started"
    : d.era === 0 && d.realm === "Surface"
      ? "Ground Floor"
      : eraN(d.era);
}
function eraHead(d) {
  return C().gentle && d.era === 0
    ? "Getting Started"
    : d.era === 0 && d.realm === "Surface"
      ? "Ground Floor"
      : VO().eras
        ? `${eraT(d.era)}<div class="tiny muted" style="font-family:var(--body);text-transform:none;letter-spacing:0">${EP(d.era)}</div>`
        : EP(d.era);
}

/* sheets redraw with motion: any number that changed lights up */
let SSEEN = {},
  SFN = null;
function drawSheetBase() {
  const el = $("#ov");
  if (!SH) {
    el.innerHTML = "";
    SFN = null;
    SSEEN = {};
    return;
  }
  const old = el.querySelector ? el.querySelector(".sheet") : null,
    sc = old ? old.scrollTop : 0;
  const foot =
    (W && (W.kind === "skill" || W.kind === "node")) || SH === glossarySheet
      ? `<div class="tiny muted">${EDU}</div>`
      : "";
  el.innerHTML = `<div class="overlay"><div class="sheet stack">${SH()}${foot}</div></div>`;
  const nw = el.querySelector ? el.querySelector(".sheet") : null;
  if (nw) nw.scrollTop = sc;
  if (nw && nw.querySelectorAll) {
    const now = {},
      same = SFN === SH;
    Array.prototype.slice.call(nw.querySelectorAll("[data-fid]")).forEach(n => {
      const k = n.dataset.fid;
      now[k] = n.textContent;
      if (same && SSEEN[k] != null && SSEEN[k] !== n.textContent && n.classList) n.classList.add("flash");
    });
    SSEEN = now;
    SFN = SH;
  }
  if (D) refreshDup(C(), D);
}

/* celebrate, now with a tough-love note when asked for, and a share card */
let CEL_NOTE = null,
  LASTWIN = null;
/* celebrate() opens the full sheet "Done". celebrateBase() is the part from this file. */
function celebrate(title, lines, sub, medal) {
  if (typeof celebrateBuzz === "function") celebrateBuzz(); /* ux.js: a short vibration on a phone */
  return celebrateBase(title, lines, sub, medal);
}
function celebrateBase(title, lines, sub, medal) {
  W = null;
  const note = CEL_NOTE;
  CEL_NOTE = null;
  LASTWIN = { title, lines: lines.filter(Boolean) };
  sheet(() => {
    const ns = nextStep(C(), D),
      bm = C().placed || G.demo ? bestMove(C(), D, todayISO()) : null;
    return `<div class="levelup pop"><div class="eyebrow">${V("done", "Done")}</div><div class="medal">${medal || "✓"}</div><h2>${esc(title)}</h2>${VO().praise ? `<div class="small" style="margin:6px 0"><i>${pick(VO().praise, title.length + lines.length)}</i></div>` : ""}${sub ? `<div class="small muted" style="margin:6px 0">${esc(sub)}</div>` : ""}<div class="stack" style="margin:10px 0;align-items:center">${(() => {
      const ls = lines.filter(Boolean),
        sh = ls.slice(0, 4);
      return (
        sh.map(l => `<span class="pill buff" style="white-space:normal">${esc(l)}</span>`).join("") +
        (ls.length > 4
          ? `<span class="tiny muted">and ${ls.length - 4} more badge${ls.length - 4 === 1 ? "" : "s"}, saved under Me</span>`
          : "")
      );
    })()}</div>${note ? `<div class="banner small" style="text-align:left;margin-bottom:10px">${esc(note)}</div>` : ""}<div class="tile" style="text-align:left;margin-bottom:10px"><div class="tiny muted">${V("upnext", "Up next")}</div><b>${esc(ns.t)}</b>${bm && !ns.best && bm.title ? `<div class="tiny muted" style="margin-top:6px">Now number 1 on your path</div><b>${esc(bm.title)}</b>` : ""}</div><button class="primary wide go" data-a="close">${V("go", "Keep going")}</button><button class="ghost wide slim" style="margin-top:8px" data-a="sharewin">Make a share card</button></div>`;
  });
}
/* shareCard() opens the full share card. shareCardBase() is the part from this file. */
function shareCard(title, lines) {
  const r = shareCardBase(title, lines);
  if (typeof adPlainSheet === "function") adPlainSheet(); /* addon.js: a sheet for sharing has the standard look */
  return r;
}
function shareCardBase(title, lines) {
  const safe = (lines || []).filter(l => l && !/\$/.test(l)).slice(0, 4),
    txt =
      [title]
        .concat(safe)
        .map(l => String(l).replace(/[.!?]+$/, ""))
        .join(". ") + ". SLAM the Game: your money, one small step at a time.";
  W = { kind: "share", o: { txt }, copied: false };
  sheet(
    () =>
      head("Share card", "Screenshot this") +
      `<div class="levelup sharecard"><div class="eyebrow">SLAM the Game</div><div class="medal">✓</div><h2>${esc(title)}</h2>${safe.map(l => `<div class="small">${esc(l)}</div>`).join("")}<div class="tiny" style="margin-top:12px;opacity:.85">Your money, one small step at a time. Free.</div></div><div class="tiny muted">Take a screenshot to post it. Dollar amounts never go on a share card.</div><div class="tile small">${esc(txt)}</div><button class="primary wide" data-a="copyshare">${W && W.copied ? "Copied ✓" : "Copy the words"}</button><button class="ghost wide" data-a="close">Done</button>`
  );
}
function timeBadges(c, d, got) {
  const tl = timeLedger(c, d);
  if (!c.placed || !tl.rm || !(c.inv > 0)) return;
  [
    [tl.wage > 0 && tl.rw && tl.minsDay >= 1, "tw1", "Your money does a minute of your job every day"],
    [tl.wage > 0 && tl.rw && tl.minsDay >= 60, "tw60", "Your money does an hour of your job every day"],
    [tl.covers >= 1, "twpay", "Your money earns a whole paycheck"],
    [tl.cross && tl.rw, "twx", "Crossover: your money out-earns you by the hour"],
  ].forEach(x => {
    if (x[0]) {
      const b = addBadge(c, x[1], x[2]);
      if (b) got.push(b);
    }
  });
}

/* ---- Someday list: goals with countdowns ---- */
const gid = () => "g" + Date.now().toString(36) + Math.floor(Math.random() * 1e4);
const curGoal = () => C().goals.find(x => x.id === W.id);
const whenMonth = at => {
  const dt = new Date();
  dt.setDate(1);
  dt.setMonth(dt.getMonth() + Math.round(at));
  return dt.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};
function eraWhen(c, d, sim, e) {
  if (e <= d.era) return "You're here";
  const at = sim.eraAt[e];
  return at == null
    ? "Not on the calendar yet"
    : at <= 0
      ? "Ready when its steps are done"
      : "About " + fmtDur(at) + " away";
}
function goalInfo(c, d, g, sim, simAll) {
  const placed = g.era != null,
    s = placed ? sim : simAll,
    at = s.goalAt[g.id],
    fit = at != null && c.age + at / 12 <= c.death,
    real = !!g.s && (c.placed || G.demo);
  if (!fit) return { fit: false, blk: goalBlock(c, g, s), real, placed, s };
  return { fit: true, at, real, placed, s, txt: at <= 0 ? "Ready now" : fmtDur(at) + " away" };
}
function goalsCard(c, d, sec) {
  const gs = (c.goals || []).filter(g => !g.done),
    sim = goalSim(c),
    simAll = goalSim(c, { all: true }),
    real = c.placed || G.demo,
    sh = Math.round((c.goalShare == null ? 0.5 : c.goalShare) * 100);
  const row = g => {
    const gi = goalInfo(c, d, g, sim, simAll);
    return `<button class="rowbtn" data-a="goal" data-v="${g.id}"><span><b>${esc(g.n)}</b><div class="tiny muted"><span class="${g.s ? "" : "guess"}">${money(g.cost)}</span>${g.s ? "" : " guess"} · ${gi.placed ? eraT(g.era) + dlNote(c, g, sim) : "Someday, not placed"}</div></span><b class="${gi.real ? "" : "guess"}" style="text-align:right" data-fid="g:${g.id}">${gi.fit ? (gi.placed ? gi.txt : gi.at <= 0 ? "Ready now" : "About " + fmtDur(gi.at) + " if you start now") : "Roadblock: " + BLOCKS[gi.blk][0]}</b></button>`;
  };
  const eras = [];
  for (let e = d.era + 1; e <= 8; e++)
    eras.push(
      `<div class="row between small"><span>${eraN(e)}</span><b class="${real ? "" : "guess"}" style="text-align:right" data-fid="e:${e}">${eraWhen(c, d, sim, e)}</b></div>`
    );
  return `<div class="card" ${sec || ""}><div class="row between"><h3>Someday list</h3>${ib("term:goals")}</div>${gs.length ? `<div class="tiny muted">Every money choice moves these dates.</div><div class="stack" style="margin-top:6px">${gs.map(row).join("")}</div>` : `<div class="small muted">A trip, a home, a wedding, quitting your job. Add one and the game shows how far away it is.</div>`}<button class="${gs.length ? "ghost" : "primary"} wide" style="margin-top:8px" data-a="gadd">+ Add a goal</button>
 ${eras.length ? `<details style="margin-top:8px"><summary>When each era arrives</summary><div class="inner stack">${eras.join("")}<div class="tiny muted">At today's pace${real ? "" : ", from guesses"}. It moves every time your numbers do.</div>${gs.some(g => g.era != null) ? `<div class="small" style="margin-top:4px">Share of your leftover money that goes to goals</div><div class="chips">${[25, 50, 75, 100].map(p => `<button class="chip ${sh === p ? "on" : ""}" data-a="gshare" data-v="${p}">${p}%</button>`).join("")}</div>` : ""}${mathBox(["Money left over each month: " + money(sim.M) + " (what comes in minus what goes out).", "It goes to your first $1,000, then debt charging 8% or more, then your full emergency fund, then investing.", "Goals you've placed take " + sh + "% of it once their era arrives. The rest keeps following the eras.", "Debt is counted at about 22% a year and investments at 7% a year after inflation. Those are long-run averages, not promises."])}</div></details>` : ""}</div>`;
}
function eraPick(c, d, g, act) {
  const hint = Math.max(d.era, Math.min(8, goalEraHint(g.k))),
    near = [],
    far = [],
    cut = Math.max(hint, d.era + 1, g.era || 0);
  for (let e = d.era; e <= 8; e++) {
    const tmp = Object.assign({}, c, {
        goals: (c.goals || []).filter(x => x.id !== g.id).concat([Object.assign({}, g, { era: e, done: false })]),
      }),
      s = goalSim(tmp),
      at = s.goalAt[g.id],
      ok = at != null && c.age + at / 12 <= c.death;
    (e <= cut ? near : far).push(
      `<button class="rowbtn ${g.era === e ? "sel" : ""}" data-a="${act}" data-v="${e}"><span><b>${e === d.era ? "Now" : "After " + eraT(e)}</b>${e === hint ? ` <span class="pill info">Suggested</span>` : ""}<div class="tiny muted">${e === d.era ? "Start saving for it right away" : "Saving starts once you reach " + EP(e) + ". " + eraWhen(c, d, s, e) + "."}</div></span><b style="text-align:right">${ok ? (at <= 0 ? "Ready now" : fmtDur(at)) : "Doesn't fit yet"}</b></button>`
    );
  }
  return (
    `<div class="row between tiny muted"><span>Start saving for it</span><span>Goal arrives in</span></div>` +
    near.join("") +
    (far.length
      ? `<details><summary>Later eras (${far.length})</summary><div class="inner stack">${far.join("")}</div></details>`
      : "") +
    `<div class="tiny muted">Suggested puts it after the steps that protect you. It's your call.</div>`
  );
}
function openGoalAdd() {
  W = { kind: "gadd", step: 0, pad: null, o: { k: null, n: "", cost: 0, s: false } };
  sheet(goalAddSheet);
}
function goalAddSheet() {
  const w = W,
    o = w.o,
    c = C(),
    d = D;
  if (w.t && w.t.cost) o.s = true;
  if (w.step === 0)
    return (
      head("Someday list · 1 of 3", "What's the goal?") +
      `<div class="stack">${GOAL_K.map(k => `<button class="rowbtn" data-a="gkind" data-v="${k[0]}"><span><b>${k[0]}</b><div class="tiny muted">${GOAL_ONE[k[0]]}</div></span><span class="caret">›</span></button>`).join("")}</div>`
    );
  if (w.step === 1)
    return (
      head("Someday list · 2 of 3", "About how much?") +
      `<div class="small muted">${esc(o.k)}. Tap the closest price. A guess is fine.</div><div class="val ${o.s ? "" : "guess"}" data-fid="ga:cost">${money(o.cost)}${o.s ? "" : ` <span class="tiny muted">guess</span>`}</div><div class="chips">${goalAmts(
        c,
        o.k
      )
        .map(
          v =>
            `<button class="chip ${o.s && o.cost === v ? "on" : ""}" data-a="gamt" data-v="${v}">${money(v)}</button>`
        )
        .join(
          ""
        )}</div>${w.pad === "cost" ? keypad("cost") + `<button class="ghost slim" data-a="padclose">Done typing</button>` : `<button class="ghost slim" data-a="padopen" data-k="cost">Type the exact amount instead</button>`}
  <details class="math"${o.n || o.by ? " open" : ""}><summary>Add a name or a date. You can skip this</summary><div class="stack" style="gap:8px;padding:8px 10px"><div class="field"><label class="small" for="gn">Give it a name</label><input type="text" id="gn" data-k="n" maxlength="18" value="${esc(o.n)}" placeholder="${esc(o.k)}"></div>
  <div class="small">Need it by a certain time?</div><div class="chips">${[
    ["No date", 0],
    ["6 months", 6],
    ["1 year", 12],
    ["18 months", 18],
    ["2 years", 24],
    ["3 years", 36],
  ]
    .map(x => `<button class="chip ${(o.by || 0) === x[1] ? "on" : ""}" data-a="gby" data-v="${x[1]}">${x[0]}</button>`)
    .join("")}</div></div></details>
  <div class="row between"><button class="ghost" data-a="gstep" data-v="-1">Back one</button><button class="primary go" data-a="gstep" data-v="1">Next step</button></div>`
    );
  const g = { id: "new", k: o.k, cost: Math.max(1, o.cost), fund: 0, era: undefined };
  return (
    head("Someday list · 3 of 3", "When in your journey?") +
    `<div class="small muted">One tap puts it in an era. You can move it any time.</div><div class="stack">${eraPick(c, d, g, "gplace")}</div><button class="ghost wide" data-a="gplace" data-v="">Leave it in Someday for now</button><button class="ghost wide" data-a="gstep" data-v="-1">Back one</button>`
  );
}
function goalSheet(id) {
  W = { kind: "goal", id, pad: null, ed: null, o: { cost: 0 } };
  sheet(goalView);
}
function goalView() {
  const w = W,
    c = C(),
    d = D,
    g = c.goals.find(x => x.id === w.id);
  if (!g) return head("Someday list", "Removed") + `<button class="primary wide" data-a="close">Close</button>`;
  const sim = goalSim(c),
    simAll = goalSim(c, { all: true }),
    gi = goalInfo(c, d, g, sim, simAll),
    sh = Math.round(gi.s.share * 100),
    pf = Math.min(100, Math.round(((g.fund || 0) / Math.max(1, g.cost)) * 100));
  let b = head("Someday list", esc(g.n));
  if (gi.fit)
    b += `<div class="levelup" style="padding:14px"><div class="tiny muted">${gi.placed ? "Countdown" : "If you started saving for it today"}</div><div class="big ${gi.real ? "" : "guess"}" style="font-size:28px" data-fid="gv:eta">${gi.txt}</div><div class="tiny muted">${gi.at > 0 ? "Around " + whenMonth(gi.at) + ". " : ""}${gi.real ? "" : "Faded because it leans on guesses. "}${gi.placed ? "" : "It isn't placed in an era yet, so it isn't on the calendar."}</div></div>`;
  else {
    const bk = gi.blk;
    b += `<div class="tile"><div class="tiny muted">The roadblock</div><h3 data-fid="gv:blk">${BLOCKS[bk][0]}</h3><div class="small">${BLOCKS[bk][1]}${bk === "time" && gi.placed && g.era > d.era ? " It's waiting behind " + EP(g.era) + ". " + eraWhen(c, d, sim, g.era) + "." : bk === "money" && sim.M <= 0 ? " Right now " + (sim.M < 0 ? money(-sim.M) + " more goes out than comes in each month." : "nothing is left over each month.") : ""}</div><div class="small muted" style="margin-top:6px"><b>First move:</b> ${BLOCK_STEP[bk]}</div>
  ${
    w.ed === "blk"
      ? `<div class="small" style="margin-top:8px">What's really in the way?</div><div class="stack" style="margin-top:6px">${Object.keys(
          BLOCKS
        )
          .map(
            k =>
              `<button class="rowbtn ${bk === k ? "sel" : ""}" data-a="gblk" data-v="${k}"><span><b>${BLOCKS[k][0]}</b><div class="tiny muted">${BLOCKS[k][1]}</div></span></button>`
          )
          .join(
            ""
          )}</div>${g.blk ? `<button class="ghost wide slim" style="margin-top:8px" data-a="gblk" data-v="">Let the game decide</button>` : ""}`
      : `<button class="ghost wide" style="margin-top:8px" data-a="ged" data-v="blk">Is this really it?</button>`
  }</div>`;
  }
  b += deadlineBlock(c, g, gi.s);
  if (typeof seasonBlock === "function") b += seasonBlock(c, g, gi.s);
  b += `<div class="row between numrow"><span class="small">Price${g.s ? "" : `<div class="tiny muted">Guess</div>`}</span><span class="row"><b class="${g.s ? "" : "guess"}" data-fid="gv:cost">${money(g.cost)}</b><button class="ghost slim" data-a="ged" data-v="cost">${g.s ? "Change" : "Make it real"}</button></span></div>`;
  if (w.ed === "cost")
    b += `<div class="chips">${goalAmts(c, g.k)
      .map(
        v => `<button class="chip ${g.s && g.cost === v ? "on" : ""}" data-a="gcost" data-v="${v}">${money(v)}</button>`
      )
      .join(
        ""
      )}</div>${w.pad === "cost" ? `<div class="val">${money(w.o.cost)}</div>` + keypad("cost") + `<button class="primary wide" data-a="gcost" data-v="">Use ${money(w.o.cost)}</button>` : `<button class="ghost slim" data-a="padopen" data-k="cost">Type the exact amount instead</button>`}`;
  b += `<div><div class="row between small"><span>Saved for it so far</span><span>${money(g.fund || 0)} of ${money(g.cost)}</span></div>${bar(pf)}<div class="tiny muted" style="margin-top:4px">Send it money in the payday round. Its date moves as you do.</div></div>
 <details ${gi.placed ? "" : "open"}><summary>${gi.placed ? "In " + eraT(g.era) + " · move it" : "Place it in an era"}</summary><div class="inner stack">${eraPick(c, d, g, "gmove")}${gi.placed ? `<button class="ghost wide" data-a="gmove" data-v="">Back to Someday</button>` : ""}</div></details>
 ${mathBox(["Money left over each month: " + money(gi.s.M) + ".", "Placed goals take " + sh + "% of it once their era arrives, in the order they're placed.", "This one needs " + money(Math.max(0, g.cost - (g.fund || 0))) + " more (" + money(g.cost) + " minus " + money(g.fund || 0) + " saved).", gi.fit && gi.at > 0 ? "That works out to " + fmtDur(gi.at) + " from today." : null])}
 <button class="primary wide" data-a="close">Done</button><div class="row wrap"><button class="ghost slim" data-a="gdone">I did this goal</button><button class="ghost slim" data-a="gdel">Remove it</button></div>`;
  return b;
}

/* ---- time ledger ---- */
const TP_M = {
  family: "in your pocket instead",
  rest: "in your pocket instead",
  chores: "in your pocket, and you do them yourself",
  commute: "in your pocket, same trip as now",
  work: "for working one extra 4-hour shift",
};
function buyRows(c, tl) {
  const tp = c.tp;
  return BUYBACK.map(b => {
    const p = tp[b.k],
      worth = p >= b.cost,
      sl = worth ? shiftLine(timeShift(c, { monthly: b.cost * b.hrs })) : null;
    return `<div class="tile small"><b>${b.n}: about ${money(b.cost)} an hour.</b> Your ${TP_N[b.k].toLowerCase()} hours are worth about ${money(p)} to you. ${worth ? (c.high === "yes" ? "With debt charging 8% or more, most people wait on this. Your call." : "Worth buying back? Your call.") : "By your own numbers you'd rather keep the money."}<div class="tiny muted">About ${money(b.cost * b.hrs)} a month for ${b.hrs} hours back.${sl ? " It also means " + sl + "." : ""}</div></div>`;
  }).join("");
}
function tpBlock(c, tl) {
  if (!c.tp)
    return `<div class="tile" style="margin-top:8px"><b>What your hours are worth to you</b> ${ib("term:tprice")}<div class="small muted">10 quick either-or choices. No typing. You get your own price for an hour of family time, rest, chores, travel and work.</div><button class="primary wide" style="margin-top:8px" data-a="tp">Find my time prices</button></div>`;
  return `<details style="margin-top:8px"><summary>What your hours are worth to you</summary><div class="inner stack">${tpResults(c, tl)}<button class="ghost wide slim" data-a="tp">Answer the 10 choices again</button></div></details>`;
}
function tpResults(c, tl) {
  const tp = c.tp;
  return (
    TP_Q.map(
      q => `<div class="row between small"><span>${TP_N[q.k]}</span><b>${money(tp[q.k])} an hour</b></div>`
    ).join("") +
    mathBox([
      "Each price comes from two either-or choices about the same block of time.",
      "Say yes to the time over the bigger amount, and your price is above it. Say yes to the money at the smaller amount, and it's below.",
      "The price is the middle of the range you landed in, divided by the hours in the block.",
    ]) +
    (tl.wage > 0
      ? `<div class="banner small">${tp.work > tl.wage ? "You'd only pick up an extra shift above about " + money(tp.work) + " an hour, and your work pays about " + cents(tl.wage) + ". More hours at this rate isn't your move. A higher rate is." : "Your work pays about " + cents(tl.wage) + " an hour, more than your price for an extra hour (" + money(tp.work) + "). Picking up hours is a fair trade for you right now."}</div>`
      : "") +
    `<div class="small" style="margin-top:4px"><b>Time you could buy back</b></div>${buyRows(c, tl)}<div class="tile small"><b>Living 20 minutes closer to work</b> gives back about 14 hours a month. By your numbers that's worth up to about ${money(tp.commute * 14)} a month more in rent.</div><div class="tiny muted">Suggestions only. Service prices are guesses for the US and yours may differ.</div>`
  );
}
function ledgerCard(c, d) {
  const tl = timeLedger(c, d),
    mins = tl.minsDay,
    job =
      tl.wage > 0 && c.inv > 0
        ? mins >= 60
          ? "about " + Math.round(mins / 6) / 10 + " hours"
          : mins >= 1
            ? "about " + Math.round(mins) + " minute" + (Math.round(mins) === 1 ? "" : "s")
            : "a few seconds"
        : null;
  return `<div class="card"><div class="row between"><h3>What your money earns you</h3>${ib("term:wage")}</div>
 <div class="grid2" style="margin-top:6px"><div class="tile"><div class="tiny muted">Your money's hourly wage</div><div class="big ${tl.rm ? "" : "guess"}" data-fid="v:mw">${cents(tl.mw)}</div><div class="tiny muted">an hour, even while you sleep</div></div>
 <div class="tile"><div class="tiny muted">Your real hourly wage</div>${tl.wage > 0 ? `<div class="big ${tl.rw ? "" : "guess"}" data-fid="v:wage">${cents(tl.wage)}</div><div class="tiny muted">an hour of take-home, counting travel${tl.rw ? "" : " · guess"}</div>` : `<div class="big">None</div><div class="tiny muted">You're not working for pay right now.</div>`}</div></div>
 ${tl.wage > 0 ? `<button class="${tl.h.s ? "ghost" : "primary"} wide slim" style="margin-top:8px" data-a="hrs">${tl.h.s ? "Change my hours" : "Make my wage real · 2 taps"}</button>` : ""}
 ${tl.cross ? `<div class="banner small" style="margin-top:8px"><b>Crossover.</b> Your money now earns more in an hour than you do.</div>` : job ? `<div class="small" style="margin-top:8px">Right now your money does <b data-fid="v:mins">${job}</b> of your job for you, every day.${tl.covers >= 0.01 ? " That's " + Math.round(tl.covers * 100) + "% of a paycheck earned without you." : ""}</div>${bar(Math.min(100, (tl.mw / tl.wage) * 100))}<div class="tiny muted">The bar fills when your money out-earns you, hour for hour. That's the crossover.</div>` : tl.wage > 0 ? `<div class="small muted" style="margin-top:8px">Nothing invested yet, so this meter hasn't started. The first dollar starts it.</div>` : ""}
 ${tl.dc > 0 ? (c.gentle ? `<details style="margin-top:8px"><summary>What your debt costs, when you're ready</summary><div class="inner">` : "") + `<div class="tile" style="margin-top:8px"><div class="tiny muted">What your debt costs</div><div class="big ${tl.rd ? "" : "guess"}" data-fid="v:dc">${cents(tl.dc)} an hour</div><div class="tiny muted">Even while you sleep${tl.rd ? "" : " · a guess until your rates are exact"}. It's a meter, not a verdict. Every extra payment slows it down.</div></div>` + (c.gentle ? `</div></details>` : "") : ""}
 ${mathBox(["Your money: " + money(c.inv) + " invested × 7% a year ÷ 8,760 hours in a year = " + cents(tl.mw) + " an hour.", tl.wage > 0 ? "You: " + money(c.take) + " a month take-home × 12 ÷ 52 weeks ÷ " + tl.wk + " hours (" + tl.h.w + " working + " + tl.h.cm + " getting there) = " + cents(tl.wage) + " an hour." : null, tl.crossInv ? "The crossover needs about " + money(tl.crossInv) + " invested: your hourly wage × 8,760 ÷ 7%." : null, tl.dc > 0 ? "Debt: each balance × its yearly rate, added up (" + money(tl.dy) + " a year) ÷ 8,760 hours = " + cents(tl.dc) + " an hour." : null, "7% a year is a long-run average after inflation, not a promise."])}
 ${tpBlock(c, tl)}</div>`;
}
function hrsSheet() {
  const c = C(),
    h = c.hrs || {},
    tl = timeLedger(c, D),
    ch = (k, vals) =>
      `<div class="chips">${vals.map(v => `<button class="chip ${h[k] === v ? "on" : ""}" data-a="hset" data-k="${k}" data-v="${v}">${v}</button>`).join("")}</div>`;
  return (
    head("Your real hourly wage", "Two taps") +
    q("Hours you work in a normal week", ch("w", [10, 20, 30, 40, 50, 60])) +
    q(
      "Hours a week getting to work and back",
      ch("cm", [0, 2, 4, 6, 8, 10, 15]),
      "Both directions, the whole week. Working from home is 0."
    ) +
    `<div class="tile"><div class="tiny muted">Your real hourly wage</div><div class="big ${tl.rw ? "" : "guess"}" data-fid="hs:w">${cents(tl.wage)} an hour</div><div class="tiny muted">${tl.h.s ? "" : "A guess until you tap both. "}Take-home pay divided by every hour the job takes.</div></div>${mathBox([money(c.take) + " a month × 12 ÷ 52 weeks = " + money((c.take * 12) / 52) + " a week.", "÷ " + tl.wk + " hours (" + tl.h.w + " working + " + tl.h.cm + " getting there) = " + cents(tl.wage) + " an hour."])}<button class="primary wide" data-a="close">Done</button>`
  );
}
function openTp() {
  W = { kind: "tp", i: 0, o: { ans: [] } };
  sheet(tpSheet);
}
function tpSheet() {
  const w = W,
    i = w.i,
    c = C();
  if (i >= 10)
    return (
      head("What your hours are worth", "Your time prices") +
      `<div class="small muted">Your own price for an hour, by what the hour is for.</div><div class="stack">${tpResults(c, timeLedger(c, D))}</div><button class="primary wide go" data-a="close">Done</button>`
    );
  const a = tpAsk(i, w.o.ans);
  return (
    head("What your hours are worth · " + (i + 1) + " of 10", "Which would you take?") +
    bar(i * 10) +
    `<div class="choice2"><button class="pickbig" data-a="tpa" data-v="money"><div class="big">${money(a.amt)}</div><div class="tiny muted">${TP_M[a.q.k]}</div></button><button class="pickbig" data-a="tpa" data-v="time"><b>${a.q.t}</b><div class="tiny muted">${a.q.h} hours</div></button></div><div class="tiny muted" style="text-align:center">Tap one, or swipe toward it. No right answer. Go with your gut.</div>${i > 0 ? `<button class="ghost wide" data-a="tpback">Back one</button>` : ""}`
  );
}

/* ---- "Is it safe to spend this?" ---- */
const LAMP = { green: "Go", yellow: "Go, with a trade", red: "It costs something real" };
function openSafe(pre) {
  W = { kind: "safe", pad: null, o: { amt: pre || 0, mode: "once" } };
  sheet(safeSheet);
}
/* THE SHEET "IS IT SAFE TO SPEND THIS?".
   safeSheet() makes the full sheet. safeSheetBase() is the part from this file. */
function safeSheet() {
  let h = safeSheetBase();
  if (typeof safeSheetFree === "function") h = safeSheetFree(h); /* ux.js: the tile "Free to spend" */
  return h;
}
function safeSheetBase() {
  const w = W,
    o = w.o,
    c = C(),
    d = D,
    r = o.amt > 0 ? safeSpend(c, d, o.amt, o.mode === "month", todayISO()) : null;
  return (
    head("Before you spend", "Is it safe to spend this?") +
    `<div class="chips">${[20, 50, 100, 250, 500, 1000].map(v => `<button class="chip ${o.amt === v && w.pad !== "amt" ? "on" : ""}" data-a="safeamt" data-v="${v}">${money(v)}</button>`).join("")}<button class="chip ${w.pad === "amt" ? "on" : ""}" data-a="padopen" data-k="amt">Type an amount</button></div>${w.pad === "amt" ? `<div class="val">${money(o.amt)}</div>` + keypad("amt") + `<button class="ghost slim" data-a="padclose">Done typing</button>` : ""}
 <div class="seg" style="align-self:flex-start"><button class="${o.mode === "once" ? "on" : ""}" data-a="safemode" data-v="once">One time</button><button class="${o.mode === "month" ? "on" : ""}" data-a="safemode" data-v="month">Every month</button></div>
 ${r ? `<div class="verdict ${r.light} pop"><div class="row"><span class="lamp ${r.light}"></span><b class="tiny">${LAMP[r.light]}</b></div><h2 style="margin:6px 0">${esc(r.head)}</h2>${r.lines.map(l => `<div class="small" style="margin-top:4px">${esc(l)}</div>`).join("")}${r.alt ? `<div class="banner small" style="margin-top:8px">${esc(r.alt)}</div>` : ""}${r.real ? "" : `<div class="tiny muted" style="margin-top:8px">This leans on guesses. <button class="linkish" data-a="sharp" data-v="${isSharp(c, "take") ? "spend" : "take"}">Make your numbers real</button> and it gets exact.</div>`}</div>${mathBox(r.math)}${o.mode === "once" ? `<button class="primary wide" data-a="safelog">I'm spending it · log it</button>` : ""}` : `<div class="small muted">Tap an amount. The answer is never just no. It tells you what the spend would move.</div>`}
 <button class="ghost wide" data-a="close">Close</button>`
  );
}
function freeCard(c, d, sec) {
  const fs = freeToSpend(c, d);
  return `<div class="card" ${sec || ""}><div class="row between"><span class="tiny muted">Free to spend</span>${ib("term:free")}</div><div class="row between"><div><div class="big ${fs.real ? "" : "guess"}" data-fid="v:free">${money(fs.week)} a week</div><div class="tiny muted">for food, fun and everything else${fs.real ? "" : " · guess"}</div></div>${fs.real ? "" : `<button class="ghost slim" data-a="sharp" data-v="${isSharp(c, "take") ? "spend" : "take"}">Make it real</button>`}</div>
 <div class="tiny muted" style="margin-top:6px">${money(fs.in)} in, minus ${money(fs.bills)} for bills, minus ${money(fs.goal)} for your goals, leaves ${money(fs.free)} a month.${fs.short ? " Right now about " + money(fs.short) + " more goes out than comes in." : ""}</div><button class="ghost wide slim" style="margin-top:8px" data-a="safe">Is it safe to spend this?</button></div>`;
}

/* ---- payday: goals join the split, and dates move live ---- */
let GB = {};
function setPayBuckets(c) {
  BUCKETS.length = 4;
  GB = {};
  (c.goals || [])
    .filter(g => !g.done && g.era != null && (g.fund || 0) < g.cost)
    .forEach(g => {
      let b = "Goal: " + g.n,
        n = 2;
      while (GB[b]) b = "Goal: " + g.n + " " + n++;
      GB[b] = g.id;
      BUCKETS.push(b);
    });
}
function bucketOne(b) {
  if (BUCKET_ONE[b]) return BUCKET_ONE[b];
  const g = C().goals.find(x => x.id === GB[b]);
  return g
    ? money(g.fund || 0) +
        " of " +
        money(g.cost) +
        " saved · " +
        (g.era > D.era ? "planned for " + EP(g.era) : "on your Someday list")
    : "";
}
function allocClone(c, al) {
  const x = clone(Object.assign({}, c, { hist: [], moves: [], diary: [] }));
  let a = al["Extra on debt"] || 0;
  x.debts
    .slice()
    .sort((p, q) => (q.high ? 1 : 0) - (p.high ? 1 : 0))
    .forEach(r => {
      const u = Math.min(a, r.amt);
      r.amt -= u;
      a -= u;
    });
  const cu = al.Cushion || 0;
  if (cu && x.cashes.length) {
    let i = x.cashes.findIndex(r => /Savings/.test(r.k));
    if (i < 0) i = 0;
    x.cashes[i].amt += cu;
  }
  const iv = al.Invest || 0;
  if (iv && x.invs.length) x.invs[0].amt += iv;
  Object.keys(GB).forEach(b => {
    const g = x.goals.find(z => z.id === GB[b]);
    if (g && al[b]) g.fund = (g.fund || 0) + al[b];
  });
  syncAll(x);
  return x;
}
function routerPanel(o) {
  const c = C(),
    d = D,
    gs = Object.keys(GB),
    m = payMath(o);
  if (!gs.length || m.free <= 0) return "";
  const base = goalSim(allocClone(c, planAmounts(o))),
    any = m.placed > 0,
    now = any ? goalSim(allocClone(c, o.alloc)) : base;
  const row = (lab, a, b, fid) => {
    const dl = a != null && b != null ? b - a : null,
      ch = any && dl !== null && Math.abs(dl) > 0.03;
    return `<div class="row between small"><span>${esc(lab)}</span><span style="text-align:right"><b data-fid="${fid}">${b == null ? "Not on the calendar" : b <= 0 ? "Ready now" : fmtDur(b) + " away"}</b>${ch ? `<div class="tiny ${dl < 0 ? "good" : "bad"}">${fmtDur(Math.abs(dl))} ${dl < 0 ? "sooner" : "later"} than the plan</div>` : any && a != null && b == null ? `<div class="tiny bad">off the calendar with this split</div>` : ""}</span></div>`;
  };
  let rows = gs.map(b => row(b.replace(/^Goal: /, ""), base.goalAt[GB[b]], now.goalAt[GB[b]], "rt:" + GB[b])).join("");
  for (let e = d.era + 1; e <= 8; e++)
    if (base.eraAt[e] != null && base.eraAt[e] > 0) {
      rows += row(EP(e) + " era", base.eraAt[e], now.eraAt[e], "rt:e");
      break;
    }
  return `<div class="tile stack" style="gap:6px"><div class="tiny muted">Your dates, live. They move as you split this paycheck.</div>${rows}</div>`;
}
function goalPlan(plan) {
  const c = C(),
    ks = Object.keys(plan.split),
    b = Object.keys(GB).find(k => {
      const g = c.goals.find(x => x.id === GB[k]);
      return g && g.era <= D.era;
    });
  if (b && ks.length === 1 && ks[0] === "Invest") {
    const sh = Math.round((c.goalShare == null ? 0.5 : c.goalShare) * 100);
    if (sh > 0) {
      plan.split = sh >= 100 ? { [b]: 100 } : { [b]: sh, Invest: 100 - sh };
      plan.why =
        "Your foundation is set. " + sh + "% goes to " + b.replace(/^Goal: /, "") + ", the rest to future you.";
    }
  }
  return plan;
}

/* ---- panel fixes on Home, Money and Me ---- */
function freeAt(c, opt) {
  const d = derive(c);
  if (d.era >= 8) return 0;
  const at = goalSim(c, opt).eraAt[8];
  return at == null ? null : at;
}
function leverCard(c, d) {
  const cn = constraint(c, d);
  if (!cn || !(c.placed || G.demo)) return "";
  return `<div class="card"><div class="row between"><div class="eyebrow">Your biggest lever</div>${ib("term:lever")}</div><h3 style="margin:4px 0">${cn.t}</h3><div class="small muted">${cn.d}</div>${cn.k === "income" ? `<div class="tiny muted" style="margin-top:6px">So one earning step leads your path each day.</div><button class="ghost wide slim" style="margin-top:8px" data-a="mp" data-l="r" data-id="earn">See the earning skills</button>` : `<button class="ghost wide slim" style="margin-top:8px" data-a="tab" data-v="money">See what goes out</button>`}</div>`;
}
function rateTile(c, d, sec) {
  if (c.work === "Retired") return drawdownCard(c, d, sec);
  const k = keepRate(c),
    real = isSharp(c, "take") && isSharp(c, "spend"),
    f1 = freeAt(c),
    f2 = freeAt(c, { monthly: -c.take * 0.05 }),
    cut = f1 != null && f2 != null ? f1 - f2 : 0;
  return `<div class="tile" ${sec || ""}><div class="row between"><span class="tiny muted">What you keep</span>${ib("term:keep")}</div><div class="big ${real ? "" : "guess"}" data-fid="v:keep">${k.pct > 0 ? k.pct + "% of what comes in" : k.pct === 0 ? "Nothing yet" : Math.abs(k.pct) + "% more goes out than comes in"}</div><div class="tiny muted">${k.pct > 0 ? (f1 == null ? "" : f1 <= 0 ? "At this rate work is already optional. " : "Keep this up and work becomes optional in about " + fmtDur(f1) + ". ") + (cut > 0.5 ? "Keep 5% more and it's " + fmtDur(cut) + " sooner." : "") : "The first goal is a gap between in and out. Any gap."}${k.own !== null ? " Home costs you nothing right now. Paying your own way (about " + money(c.moveOut) + " a month) you'd keep " + (k.own > 0 ? k.own + "%" : "nothing") + ", so use this window." : ""}</div>${mathBox(["Comes in each month: " + money(c.take) + ". Goes out: " + money(c.spend) + ". Kept: " + money(c.take - c.spend) + ".", "Kept ÷ comes in = " + k.pct + "%.", "Work is optional when investments reach 25 times a year of spending (" + money(d.fi) + ")." + (c.home === "With family" ? " That counts " + money(c.moveOut) + " a month for when you pay for your own place." : ""), ssNote(c), "Investments are assumed to grow 7% a year after inflation. A long-run average, not a promise."])}</div>`;
}
function big3Card(c) {
  if (!c.spends.length) return "";
  const b = bigThree(c),
    real = isSharp(c, "spend"),
    sl = shiftLine(timeShift(c, { monthly: -100 }));
  return `<div class="card stack"><div class="row between"><h3>The big three</h3>${ib("term:big3")}</div><div class="small muted">Home, getting around and food take <b class="${real ? "" : "guess"}">${b.pct}%</b> of what comes in. The biggest is ${b.top.k.toLowerCase()}.</div>${b.rows.map(r => `<div><div class="row between small"><span>${r.k}</span><span class="${real ? "" : "guess"}">${money(r.amt)} · ${r.pct}%</span></div>${bar(r.pct)}</div>`).join("")}<div class="small">Every <b>$100 a month</b> you spend takes about <b>$30,000</b> invested to cover for good.${sl ? " Trim $100 a month here and " + sl + "." : ""}</div>${mathBox(["$100 a month is $1,200 a year.", "$1,200 ÷ 4% = $30,000. At 4% a year, $30,000 invested can pay out $1,200 a year for good.", "The 4% figure comes from research on 30-year retirements in US history. It's a rule of thumb, not a promise."])}</div>`;
}
function toneCard(c) {
  return `<div class="card stack"><div class="tiny muted">How the game talks to you</div><div class="row between"><div><b>Gentle mode</b><div class="tiny muted">Starts with one small win, saves the hard numbers for last, and softens the labels.</div></div>${onoff("gentle", !!c.gentle)}</div><div class="row between"><div><b>Tough love</b><div class="tiny muted">When you log spending, it shows what that money would have grown to, and what date it moved.</div></div>${onoff("tough", !!G.tough)}</div></div>`;
}
function toughLine(o) {
  const c = C();
  if (!G.tough || o.t !== "out" || !(o.amt > 0) || !["Food", "Fun and everything else"].includes(o.cat)) return null;
  const sl = shiftLine(timeShift(c, { once: o.amt }));
  return (
    "Tough love: " +
    money(o.amt) +
    " today is about " +
    money(futureCost(o.amt, 30)) +
    " in 30 years." +
    (sl ? " And " + sl + "." : "")
  );
}
const GWINS = [
  ["Open your bank app and look at one balance", "That's the whole task. Looking counts."],
  ["Find one thing you pay for every month", "Say its price out loud. Nothing else."],
  ["Put any amount somewhere you won't touch it", "Even one dollar. It's the direction that matters."],
];
function gwinSheet() {
  W = { kind: "gwin", o: { pick: null } };
  sheet(() => {
    const o = W.o;
    return (
      head("Before any numbers", "One small win first") +
      `<div class="small muted">Pick one. Do it now if you can. It takes about a minute.</div><div class="stack">${GWINS.map((g, i) => `<button class="rowbtn ${o.pick === i ? "sel" : ""}" data-a="gwpick" data-v="${i}"><span><b>${g[0]}</b><div class="tiny muted">${g[1]}</div></span><b>${o.pick === i ? "This one" : ""}</b></button>`).join("")}</div>${o.pick !== null ? `<button class="primary wide go" data-a="gwdone">I did it</button>` : ""}<button class="ghost wide" data-a="gwskip">Skip this and show me the game</button>`
    );
  });
}
OPT_DESC["Mostly fine"] = "Good. The game runs at normal speed.";
OPT_DESC["A bit stressed"] = "That's most people. One step at a time.";
OPT_DESC["I'd rather not look"] =
  "Got it. The game starts with one small win and saves the hard numbers for last. You can switch this off under Me.";
(b0 => {
  SETUP[6].b = w =>
    b0(w) +
    qs(w, "ssq", "Should the game count Social Security in your plan?", [
      "Yes, at three quarters, to be careful",
      "Yes, in full",
      "No, leave it out",
    ]) +
    qs(w, "feel0", "When you think about your money, what's closest? (optional)", [
      "Mostly fine",
      "A bit stressed",
      "I'd rather not look",
    ]);
})(SETUP[6].b);
OPT_DESC["Yes, at three quarters, to be careful"] = "The game estimates it from what you earn and counts 75% of it.";
OPT_DESC["Yes, in full"] = "Counts all of it.";
OPT_DESC["No, leave it out"] = "Your dates will look later. Many early-retirement planners do this to be safe.";

(() => {
  const plock = ACT.plock,
    pmoved = ACT.pmoved,
    fsave = ACT.fsave;
  Object.assign(ACT, {
    safe: () => openSafe(),
    safeamt: t => {
      W.o.amt = +t.dataset.v;
      W.pad = null;
      drawSheet();
    },
    safemode: t => {
      W.o.mode = t.dataset.v;
      drawSheet();
    },
    safelog: () => {
      const a = W.o.amt;
      openFlow("out");
      W.o.amt = a;
      W.t = { amt: true };
      drawSheet();
    },
    gadd: () => openGoalAdd(),
    gkind: t => {
      const o = W.o;
      o.k = t.dataset.v;
      o.cost = goalTypical(C(), o.k);
      o.s = false;
      W.t = {};
      W.step = 1;
      drawSheet();
    },
    gamt: t => {
      W.o.cost = +t.dataset.v;
      W.o.s = true;
      W.pad = null;
      drawSheet();
    },
    gstep: t => {
      W.step = Math.max(0, W.step + +t.dataset.v);
      W.pad = null;
      drawSheet();
    },
    gplace: t => {
      const o = W.o,
        c = C(),
        v = t.dataset.v,
        g = {
          id: gid(),
          k: o.k,
          n: (String(o.n || "").trim() || o.k).slice(0, 18),
          cost: Math.max(1, o.cost),
          s: !!o.s,
          era: v === "" ? null : +v,
          fund: 0,
          blk: null,
          d: todayISO(),
        };
      c.goals.push(g);
      save();
      render();
      goalSheet(g.id);
    },
    goal: t => goalSheet(t.dataset.v),
    ged: t => {
      W.ed = W.ed === t.dataset.v ? null : t.dataset.v;
      W.pad = null;
      if (W.ed === "cost") W.o.cost = curGoal().cost;
      drawSheet();
    },
    gcost: t => {
      const g = curGoal();
      g.cost = Math.max(1, t.dataset.v ? +t.dataset.v : W.o.cost);
      g.s = true;
      W.ed = null;
      W.pad = null;
      save();
      render();
      drawSheet();
    },
    gblk: t => {
      const g = curGoal();
      g.blk = t.dataset.v || null;
      W.ed = null;
      save();
      render();
      drawSheet();
    },
    gmove: t => {
      const g = curGoal();
      g.era = t.dataset.v === "" ? null : +t.dataset.v;
      save();
      render();
      drawSheet();
    },
    gdone: () => {
      const c = C(),
        g = curGoal();
      g.done = todayISO();
      const got = settle(c, null);
      save();
      render();
      celebrate(
        g.n + ": done",
        ["A Someday goal, crossed off"].concat(got.slice(0, 2)),
        "You decided what your money was for, and then it did it.",
        "★"
      );
    },
    gdel: () => {
      const c = C(),
        id = W.id;
      c.goals = c.goals.filter(x => x.id !== id);
      save();
      closeSheet();
      render();
    },
    gshare: t => {
      C().goalShare = +t.dataset.v / 100;
      save();
      render();
    },
    hrs: () => {
      W = { kind: "hrs" };
      sheet(hrsSheet);
    },
    hset: t => {
      const c = C();
      c.hrs = c.hrs || { w: null, cm: null, s: false };
      c.hrs[t.dataset.k] = +t.dataset.v;
      c.hrs.s = c.hrs.w != null && c.hrs.cm != null;
      const got = settle(c, null);
      save();
      render();
      drawSheet();
    },
    tp: () => openTp(),
    tpa: t => {
      const w = W;
      w.o.ans[w.i] = t.dataset.v;
      w.i++;
      if (w.i >= 10) {
        const c = C();
        c.tp = tpAll(w.o.ans);
        c.tpa = w.o.ans.slice();
        save();
        render();
      }
      drawSheet();
    },
    tpback: () => {
      W.i = Math.max(0, W.i - 1);
      drawSheet();
    },
    gentle: t => {
      const c = C();
      c.gentle = t.dataset.v === "1";
      if (c.gentle) G.tough = false;
      save();
      render();
    },
    tough: t => {
      G.tough = t.dataset.v === "1";
      if (G.tough) C().gentle = false;
      save();
      render();
    },
    gwin: () => gwinSheet(),
    gwpick: t => {
      W.o.pick = +t.dataset.v;
      drawSheet();
    },
    gwdone: () => {
      const c = C();
      c.gwin = todayISO();
      markDay(c);
      save();
      render();
      celebrate(
        "First win",
        ["You looked. Most people never do."],
        "Every step in this game works like that one. Small, and then done."
      );
    },
    gwskip: () => {
      C().gwin = "skip";
      save();
      closeSheet();
      render();
    },
    sharewin: () => {
      if (LASTWIN) shareCard(LASTWIN.title, LASTWIN.lines);
    },
    sharewrap: () => {
      const c = C(),
        w = wrapped(c, todayISO());
      shareCard("My " + w.year + " with money", [
        w.days + " days I showed up",
        w.paydays + " payday rounds played",
        w.skills + " skills learned",
        w.eras > 0 ? w.eras + " era" + (w.eras === 1 ? "" : "s") + " climbed" : w.badges + " badges earned",
      ]);
    },
    copyshare: () => {
      const txt = W.o.txt;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt);
      } catch (e) {
        report(e, "ui.js: copyshare");
      }
      W.copied = true;
      drawSheet();
    },
    plock: () => {
      plock();
    },
    pmoved: t => {
      pmoved(t);
      const o = W.o,
        c = C();
      if (o.moved && !o.gfund) {
        o.gfund = true;
        Object.keys(GB).forEach(b => {
          const a = o.alloc[b] || 0,
            g = c.goals.find(x => x.id === GB[b]);
          if (a > 0 && g) {
            g.fund = (g.fund || 0) + a;
            o.done.push(
              "Put " +
                money(a) +
                " toward " +
                g.n +
                ". " +
                money(g.fund) +
                " of " +
                money(g.cost) +
                " saved" +
                (g.fund >= g.cost ? ". Fully funded." : ".")
            );
          }
        });
        save();
        render();
        drawSheet();
      }
    },
    fsave: () => {
      CEL_NOTE = W && W.o ? toughLine(W.o) : null;
      fsave();
      if (SH === flowSheet) CEL_NOTE = null;
    },
  });
})();
if (typeof document !== "undefined") {
  let tx = null;
  document.addEventListener(
    "touchstart",
    e => {
      tx = W && W.kind === "tp" && e.touches && e.touches[0] ? e.touches[0].clientX : null;
    },
    { passive: true }
  );
  document.addEventListener(
    "touchend",
    e => {
      if (tx === null || !W || W.kind !== "tp" || W.i >= 10) return;
      const x = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : tx,
        dx = x - tx;
      tx = null;
      if (Math.abs(dx) > 70) ACT.tpa({ dataset: { v: dx < 0 ? "money" : "time" } });
    },
    { passive: true }
  );
}

/* ===== v14: survival, the questions that make your dates exact, moves, shapes, mentors, the money machine, drawdown, tax buckets ===== */
Object.assign(GLOSS, {
  moves: [
    "Try a move",
    "A big choice, run on your own numbers before you make it. Nothing changes in the game until you do it for real.",
  ],
  shape: [
    "Your shape",
    "The same life can be shaped different ways: steady all the way, a hard sprint then easing off, seasons of work and time off, or flexible work you'd never need to quit. Each one trades something.",
  ],
  machine: [
    "Your money machine",
    "Things you own that pay you, against debts that charge you. The goal is for the first to outgrow the second, then outgrow your bills. Every $30,000 invested can pay about $100 a month for good.",
  ],
  ss: [
    "Social Security in your plan",
    "A guess from what you earn now, assuming you keep working to your planned age. The game counts three quarters of it unless you change that. Your real number is on your statement at ssa.gov.",
  ],
  draw: [
    "Your paycheck from savings",
    "What you take from savings each year, as a share of what's there. Around 4% a year has held up through most of history.",
  ],
  bridge: [
    "The bridge",
    "The years between when you stop working and 59 and a half, when retirement accounts open up without a penalty.",
  ],
  survive: ["Closing the gap", "When more goes out than comes in, that's the only job. Either number can move."],
});
const ageWord = m => (m == null ? "Not on the calendar yet" : m <= 0 ? "Now" : "Age " + Math.round(C().age + m / 12));
function ssNote(c) {
  const p = passives(c);
  return p.full > 0
    ? p.sh > 0
      ? "Counts Social Security at " +
        Math.round(p.sh * 100) +
        "% of a rough " +
        money(p.full) +
        " a month from 67" +
        (p.pen ? ", and a pension of " + money(p.pen.amt) + " from " + p.pen.age : "") +
        ". Change it under Make it exact."
      : "Social Security is left out, as you asked."
    : p.pen
      ? "Counts a pension of " + money(p.pen.amt) + " a month from " + p.pen.age + "."
      : null;
}
function survivalCard(c, d) {
  const s = survival(c, d);
  if (!s || !(c.placed || G.demo)) return "";
  return `<div class="card"><div class="row between"><div class="eyebrow">First things first</div>${ib("term:survive")}</div><h3 style="margin:4px 0">Close a ${money(s.short)} gap</h3><div class="small muted">About ${money(s.short)} more goes out than comes in each month. ${d.cash > 0 ? "Your cash covers that for about " + fmtDur(s.runway) + "." : "No cash is covering it, so it's landing on debt."} Nothing else can move until this does, and it can be fixed.</div>
 <div class="tile small" style="margin-top:8px"><b>Either one closes it</b><div>${money(s.short)} less going out${s.big ? ". Your biggest line is " + s.big.k.toLowerCase() + ", at " + money(s.big.amt) : ""}.</div><div>Or ${money(s.short)} more coming in${s.hoursWk ? ", about " + Math.max(1, Math.ceil(s.hoursWk)) + " more hours a week at your pay" : ""}.</div>${s.fixed ? `<div class="tiny muted">The ${money(s.fixed)} you send or give stays off the table.</div>` : ""}</div>
 <div class="row wrap" style="margin-top:8px"><button class="primary slim" data-a="moves">Try a move</button><button class="ghost slim" data-a="tab" data-v="money">See what goes out</button></div></div>`;
}
function lifeCard(c) {
  if (!(c.placed || G.demo) || G.demo) return "";
  const n = lifeQs(c).length;
  return n
    ? `<button class="rowbtn" data-a="life"><span><b>Make your dates exact</b><div class="tiny muted">${n} quick tap${n === 1 ? "" : "s"}. Each one only shows up because of an earlier answer.</div></span><span class="caret">›</span></button>`
    : "";
}
function lifeSheet() {
  const c = C(),
    w = W,
    qs = lifeQs(c),
    q = w.edit ? LIFE.find(x => x.id === w.edit) : qs[0],
    ans = lifeAnswered(c);
  let b = head("Make it exact", q ? esc(q.q) : "All caught up");
  if (w.moved) b += `<div class="banner small pop">${esc(w.moved)}</div>`;
  if (q)
    b += `${q.h ? `<div class="small muted">${esc(q.h)}</div>` : ""}<div class="stack">${q.o.map((o, i) => `<button class="rowbtn" data-a="lifeans" data-k="${q.id}" data-v="${i}"><b>${esc(o[0])}</b><span class="caret">›</span></button>`).join("")}</div><button class="ghost wide" data-a="lifeskip" data-k="${q.id}">Skip this one</button><div class="tiny muted">${w.edit ? "" : qs.length + " left. "}A guess is fine. You can change any answer later.</div>`;
  else
    b += `<div class="small muted">Nothing else to ask right now. New questions only show up when your answers call for them.</div>`;
  if (ans.length)
    b += `<details><summary>What you've told the game (${ans.length})</summary><div class="inner stack">${ans.map(a => `<div class="row between small"><span>${esc(a.q)}<div class="tiny muted">${esc(String(c.x.done[a.id]))}</div></span><button class="ghost slim" data-a="lifeedit" data-k="${a.id}">Change</button></div>`).join("")}</div></details>`;
  return b + `<button class="${q ? "ghost" : "primary"} wide" data-a="close">Done</button>`;
}
/* moves, shapes, mentors */
const durS = m => (m >= 24 ? Math.round(m / 1.2) / 10 + " years" : fmtDur(m));
function moveShort(r) {
  return r.on != null
    ? "On the calendar"
    : r.free != null && Math.abs(r.free) > 0.5
      ? durS(Math.abs(r.free)) + (r.free > 0 ? " sooner" : " later")
      : r.nx && r.nx.by != null && Math.abs(r.nx.by) > 0.05
        ? durS(Math.abs(r.nx.by)) + (r.nx.by > 0 ? " sooner" : " later")
        : r.dm > 0
          ? "+" + money(r.dm) + " a month"
          : "No change yet";
}
function moveLines(r) {
  const o = [];
  if (r.on != null)
    o.push("Work becomes optional. It wasn't on the calendar before. Now: about " + fmtDur(r.on) + " away.");
  else if (r.free != null && Math.abs(r.free) > 0.5)
    o.push("Work becomes optional " + fmtDur(Math.abs(r.free)) + (r.free > 0 ? " sooner." : " later."));
  if (r.nx && r.nx.by != null && Math.abs(r.nx.by) > 0.05)
    o.push(eraN(r.nx.e) + " arrives " + fmtDur(Math.abs(r.nx.by)) + (r.nx.by > 0 ? " sooner." : " later."));
  else if (r.nx && r.nx.on != null) o.push(eraN(r.nx.e) + " goes on the calendar, about " + fmtDur(r.nx.on) + " away.");
  if (r.gl && r.gl.by != null)
    o.push(r.gl.n + " moves " + (r.gl.by > 0 ? "closer by " : "back ") + fmtDur(Math.abs(r.gl.by)) + ".");
  else if (r.gl && r.gl.on != null) o.push(r.gl.n + " goes on the calendar.");
  if (Math.abs(r.dm) >= 1)
    o.push((r.dm > 0 ? money(r.dm) + " more" : money(-r.dm) + " less") + " left over each month.");
  if (!o.length) o.push("This one doesn't move your dates yet.");
  return o;
}
function movesCard(c, d) {
  if (!(c.placed || G.demo)) return "";
  const ms = movesFor(c),
    t = ms[0],
    sh = (c.x || {}).shape,
    pin = ((c.x || {}).pins || [])[0],
    pm = pin && ms.find(r => r.id === pin);
  if (!t) return "";
  const r = pm || t;
  return `<button class="rowbtn" data-a="moves"><span><b>${pm ? "Your move: " + esc(r.mv.n) : "Try a move"}</b><div class="tiny muted">${pm ? "" : esc(r.mv.n) + ": "}${moveShort(r).toLowerCase()}${sh ? " · your shape: " + esc((SHAPE_N[sh] || sh).toLowerCase()) : ""}</div></span><span class="caret">›</span></button>`;
}
const SHAPE_N = { steady: "Steady", sprint: "Sprint, then ease off", seasons: "Seasons", flex: "Flexible work" };
/* THE SHEET "MOVES".
   movesSheet() makes the full sheet. It calls each part by name. movesSheetBase() is the part from this file. */
function movesSheet() {
  let h = movesSheetBase();
  if (typeof movesSheetCompare === "function") h = movesSheetCompare(h); /* compare.js: the button "side by side" */
  /* drills.js: the note "one-way door" in the open move */
  if (typeof movesSheetDoor === "function") h = movesSheetDoor(h);
  return h;
}
function movesSheetBase() {
  const c = C(),
    d = D,
    w = W,
    ms = movesFor(c),
    pins = c.x.pins || [],
    tabs = [["moves", "Moves"]].concat(c.work !== "Retired" && c.work !== "Student" ? [["shapes", "Shapes"]] : [], [
      ["mentors", "People"],
    ]);
  let b =
    head("What if", w.tab === "shapes" ? "Pick your shape" : w.tab === "mentors" ? "People who did it" : "Try a move") +
    `<div class="seg">${tabs.map(t => `<button class="${w.tab === t[0] ? "on" : ""}" data-a="mvtab" data-v="${t[0]}">${t[1]}</button>`).join("")}</div>`;
  const detail = r =>
    `<div class="tile stack" style="gap:6px"><div class="small">${esc(r.mv.d)}</div>${moveLines(r)
      .map(l => `<div class="small"><b>${esc(l)}</b></div>`)
      .join("")}${(() => {
      const who = MENTORS.filter(m => m.moves.includes(r.id)).map(m => m.n);
      return who.length
        ? `<div class="tiny muted">People known for a move like this: ${esc(who.join(", "))}.</div>`
        : "";
    })()}${mathBox(["The game copies your numbers, makes this one change, and runs the same month-by-month plan again.", "Left over each month goes from " + money(c.take - c.spend) + " to " + money(c.take - c.spend + r.dm) + ".", ssNote(c), "Investments are assumed to grow 7% a year after inflation. A long-run average, not a promise."])}<button class="${pins.includes(r.id) ? "ghost" : "primary"} wide slim" data-a="mvpin" data-v="${r.id}">${pins.includes(r.id) ? "Unpin this move" : "Pin this as my move"}</button></div>`;
  if (w.tab === "moves")
    b +=
      `<div class="small muted">Each one is run on your numbers, biggest first. Nothing changes until you do it for real.</div>` +
      (ms.length
        ? ms
            .map(
              r =>
                `<button class="rowbtn ${w.open === r.id ? "sel" : ""}" data-a="mvopen" data-v="${r.id}"><span><b>${esc(r.mv.n)}</b>${pins.includes(r.id) ? ` <span class="pill info">Pinned</span>` : ""}</span><b class="rside ${r.mv.cost || (r.free != null && r.free < 0) ? "bad" : "good"}" data-fid="mv:${r.id}">${moveShort(r)}</b></button>${w.open === r.id ? detail(r) : ""}`
            )
            .join("")
        : `<div class="small muted">No moves fit your situation yet.</div>`);
  if (w.tab === "shapes") {
    const sh = shapes(c);
    b +=
      `<div class="small muted">The same life, shaped four ways. None is the right one. Which trade would you make?</div>` +
      sh
        .map(
          s =>
            `<button class="rowbtn ${c.x.shape === s.id ? "sel" : ""}" data-a="shape" data-v="${s.id}"><span><b>${s.n}</b>${c.x.shape === s.id ? ` <span class="pill info">Yours</span>` : ""}<div class="tiny muted">${esc(s.d)}</div><div class="tiny">The trade: ${esc(s.cost)}</div></span><span class="rside"><b data-fid="sh:${s.id}">${s.id === "sprint" ? (s.yrs == null ? "Not yet" : s.yrs <= 0 ? "Now" : durS(s.yrs * 12)) : s.age == null ? "Not yet" : "Age " + s.age}</b><div class="tiny muted">${s.id === "sprint" ? (s.yrs == null ? "not at today's income" : s.yrs <= 0 ? "you could ease off already" : "of sprint, then ease off") : s.age == null ? "not on the calendar" : "work is optional"}</div></span></button>`
        )
        .join("") +
      mathBox([
        "Steady: today's left-over money, every month, until your investments can pay your bills.",
        "Sprint: live on half until your investments, left alone to grow, reach that number by " +
          c.ret +
          ". After that, work only has to cover the bills.",
        "Seasons: three years on, six months off. That's like earning one sixth less.",
        "Flexible work: $1,500 a month from work you'd choose anyway, so your investments only have to cover the rest.",
        ssNote(c),
      ]);
  }
  if (w.tab === "mentors")
    b +=
      `<div class="small muted">Real people who have told their stories in public. They aren't part of this game. The dates below come from your numbers, not theirs.</div>` +
      MENTORS.map(m => {
        const open = w.open === m.id,
          rows = m.moves.map(id => ms.find(r => r.id === id)).filter(Boolean);
        return `<button class="rowbtn ${open ? "sel" : ""}" data-a="mvopen" data-v="${m.id}"><span><b>${esc(m.n)}</b><div class="tiny muted">${esc(m.line)}</div></span><span class="caret">${open ? "⌃" : "›"}</span></button>${open ? `<div class="tile stack" style="gap:6px"><div class="small"><b>What to borrow:</b> ${esc(m.lesson)}</div>${rows.length ? `<div class="tiny muted">A move like theirs, on your numbers</div>` + rows.map(r => `<div class="row between small"><span>${esc(r.mv.n)}</span><b class="${r.mv.cost ? "bad" : "good"}">${moveShort(r)}</b></div>`).join("") : `<div class="tiny muted">Their kind of move doesn't fit your situation right now.</div>`}</div>` : ""}`;
      }).join("");
  return b + `<button class="ghost wide" data-a="close">Close</button>`;
}
/* the Rich Dad picture: what pays you against what charges you */
function machineCard(c, d) {
  const tl = timeLedger(c, d),
    pays = (c.inv * SWR) / 12,
    costs = tl.dy / 12,
    h = netWorthHome(c, d),
    mx = Math.max(pays, costs, 1),
    gap = pays - costs;
  return `<div class="card stack"><div class="row between"><h3>Your money machine</h3>${ib("term:machine")}</div><div class="small muted">What you own that pays you, against what you owe that charges you.</div>
 <div class="grid2"><div class="tile"><div class="tiny muted">What you own can pay you</div><div class="big good ${tl.rm ? "" : "guess"}" data-fid="v:pays">+${money(pays)}</div><div class="tiny muted">a month, for good</div>${bar((pays / mx) * 100)}</div><div class="tile"><div class="tiny muted">What you owe charges you</div><div class="big bad ${tl.rd ? "" : "guess"}" data-fid="v:costs">-${money(costs)}</div><div class="tiny muted">a month in interest</div>${bar((costs / mx) * 100)}</div></div>
 <div class="small">${gap >= 0 ? (pays > 0 ? `Your money can pay you ${money(gap)} a month more than your debts take. That's a second paycheck, and it grows.` : "Nothing is pulling against you. The first dollar invested starts the machine.") : `Right now your debts take ${money(-gap)} a month more than your money makes. Every dollar of debt paid tips it back.`} Every <b>$30,000</b> invested can pay about <b>$100 a month</b> for good.</div>
 ${h ? `<div class="tile small"><b>Your home:</b> worth about ${money(h.eq + ((c.x.home || {}).bal || 0))}, with ${money((c.x.home || {}).bal || 0)} left to pay. That's ${money(h.eq)} that's yours. It counts in what you have (${money(h.nw)} in all), but it doesn't pay you while you live in it.</div>` : ""}
 ${mathBox(["Pays you: " + money(c.inv) + " invested × 4% a year ÷ 12 = " + money(pays) + " a month. 4% is what history says you can take and not run out.", "Charges you: each debt × its yearly rate, added up, ÷ 12 = " + money(costs) + " a month.", "$30,000 × 4% = $1,200 a year = $100 a month."])}
 <button class="ghost wide slim" data-a="grow">Watch a monthly amount grow</button></div>`;
}
function growSheet() {
  const o = W.o,
    n = o.yrs,
    pts = [],
    put = [];
  let v = 0;
  for (let y = 0; y <= n; y++) {
    pts.push(v);
    put.push(o.amt * 12 * y);
    for (let m = 0; m < 12; m++) v = v * (1 + R / 12) + o.amt;
  }
  const mx = Math.max(1, pts[n]),
    X = i => 10 + (300 * i) / n,
    Y = x => 150 - (135 * x) / mx,
    path = a => a.map((x, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(x).toFixed(1)).join(" ");
  return (
    head("Watch it grow", "Two taps, one picture") +
    q(
      "How much goes in each month?",
      `<div class="chips">${[50, 100, 200, 500, 1000].map(a => `<button class="chip ${o.amt === a ? "on" : ""}" data-a="growset" data-k="amt" data-v="${a}">${money(a)}</button>`).join("")}</div>`
    ) +
    q(
      "For how many years?",
      `<div class="chips">${[10, 20, 30, 40].map(a => `<button class="chip ${o.yrs === a ? "on" : ""}" data-a="growset" data-k="yrs" data-v="${a}">${a} years</button>`).join("")}</div>`
    ) +
    `
 <svg viewBox="0 0 320 160" style="width:100%;height:auto;border:1px solid var(--line);border-radius:12px;background:var(--panel2)"><path d="${path(pts)} L310 150 L10 150 Z" fill="rgba(var(--glow),.35)"/><path d="${path(pts)}" fill="none" stroke="var(--a3)" stroke-width="3"/><path d="${path(put)}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4"/></svg>
 <div class="grid2"><div class="tile"><div class="tiny muted">You put in (dashed line)</div><div class="big" data-fid="gr:put">${money(put[n])}</div></div><div class="tile"><div class="tiny muted">It grows to</div><div class="big good" data-fid="gr:tot">${money(pts[n])}</div></div></div>
 <div class="small">The growth did ${money(pts[n] - put[n])} of the work. That much invested can pay about <b>${money((pts[n] * SWR) / 12)} a month</b> for good.</div>${mathBox(["Grows 7% a year after inflation, added monthly. That's a long-run average for a broad stock fund, not a promise. Some years are down a lot.", "Everything is in today's dollars."])}<button class="primary wide" data-a="close">Done</button>`
  );
}
function drawdownCard(c, d, sec) {
  const dd = drawdown(c, d);
  return `<div class="tile" ${sec || ""}><div class="row between"><span class="tiny muted">Your paycheck from savings</span>${ib("term:draw")}</div><div class="row"><span class="lamp ${dd.light}"></span><div class="big" data-fid="v:draw">${dd.gap > 0 ? Math.round(dd.rate * 1000) / 10 + "% a year" : "Savings untouched"}</div></div><div class="tiny muted">${dd.gap > 0 ? `${money(c.take)} comes in and ${money(c.spend)} goes out, so ${money(dd.gap)} a month comes from savings. ${dd.toAge ? "At that pace they last to about age " + dd.toAge + "." : "At that pace they should outlast you."} Around 4% a year, ${money(dd.safe)} a month for you, has held up through most of history.` : "Your income covers your spending, so your savings aren't being drawn down."}</div>${mathBox([money(dd.gap) + " a month × 12 ÷ " + money(c.inv) + " in savings = " + Math.round(dd.rate * 1000) / 10 + "% a year.", "How long it lasts assumes the rest grows 4% a year after inflation. That's cautious on purpose."])}</div>`;
}
function taxCard(c, d) {
  if (!c.invs.length) return "";
  const s = txSplit(c),
    br = bridge(c, d),
    tot = Math.max(1, c.inv);
  return `<details><summary>Tax buckets${br ? " and the early bridge" : ""}</summary><div class="inner stack"><div class="small muted">Which kind of account each one is. It decides when you can reach the money and whether it's taxed.</div>${c.invs.map((r, i) => `<div class="row between small"><span>${esc(r.k)}<div class="tiny muted">${TX_N[txOf(r)]}</div></span><span class="row"><b>${money(r.amt)}</b><button class="ghost slim" data-a="txset" data-v="${i}">Switch type</button></span></div>`).join("")}
 ${["pre", "roth", "tax", "hsa"]
   .filter(k => s[k] > 0)
   .map(
     k =>
       `<div><div class="row between tiny"><span>${TX_N[k]}</span><span>${Math.round((s[k] / tot) * 100)}%</span></div>${bar((s[k] / tot) * 100)}</div>`
   )
   .join("")}
 ${br ? `<div class="tile small"><b>The bridge.</b> You plan to stop at ${br.stop}. Retirement accounts open up at 59 and a half, so about ${money(br.need)} has to cover the ${Math.round(br.yrs * 10) / 10} years in between. About ${money(br.reach)} sits where you can reach it. ${br.short > 0 ? "Short by about " + money(br.short) + "." : "That's covered."}<div class="tiny muted" style="margin-top:4px">People bridge this with a regular account, Roth money, or special withdrawal rules. This one is a conversation with a tax pro.</div></div>` : ""}</div></details>`;
}
function dlNote(c, g, sim) {
  const n = goalNeed(c, g, sim);
  return !n ? "" : n.ok ? " · on time" : " · needs " + money(n.need) + " a month to make the date";
}
function deadlineBlock(c, g, sim) {
  const n = goalNeed(c, g, sim),
    w = W,
    M = Math.max(0, sim.M),
    pc = n && n.shareNeed != null ? Math.ceil(n.shareNeed * 20) * 5 : null;
  return `<div class="tile stack" style="gap:6px"><div class="row between small"><span><b>Needed by</b></span><span>${g.byDate ? parseISO(g.byDate).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "No date set"}</span></div>${n ? (n.ok ? `<div class="small good">On time${n.late != null && n.late < -0.5 ? ", with about " + fmtDur(-n.late) + " to spare" : ""}.</div>` : `<div class="small">To make the date it needs <b>${money(n.need)} a month</b>. It's getting ${money(n.have)}${n.late != null ? ", so it lands about " + fmtDur(n.late) + " late" : ""}.</div>${pc != null && pc <= 100 ? `<button class="primary wide slim" data-a="gshare2" data-v="${pc}">Send ${pc}% of what's left over to goals</button>` : `<div class="small muted">That's more than the ${money(M)} left over each month. Move the date, shrink the price, or try a move.</div><button class="ghost wide slim" data-a="moves">Try a move</button>`}`) : ""}
 <div class="chips">${[
   ["No date", 0],
   ["6 months", 6],
   ["1 year", 12],
   ["18 months", 18],
   ["2 years", 24],
   ["3 years", 36],
   ["5 years", 60],
 ]
   .map(x => `<button class="chip" data-a="gbyset" data-v="${x[1]}">${x[0]}</button>`)
   .join("")}</div></div>`;
}
(() => {
  const pmoved = ACT.pmoved,
    gplace = ACT.gplace;
  Object.assign(ACT, {
    life: () => {
      W = { kind: "life", edit: null, moved: null };
      sheet(lifeSheet);
    },
    lifeans: t => {
      const c = C(),
        pr = D.realm,
        f0 = freeAt(c);
      lifeSet(c, t.dataset.k, +t.dataset.v);
      afterMoney(c, pr, false);
      render();
      const f1 = freeAt(C());
      W.edit = null;
      W.moved =
        f0 == null && f1 != null
          ? "Work-optional is on the calendar now: about " + fmtDur(f1) + " away."
          : f0 != null && f1 != null && Math.abs(f0 - f1) > 0.5
            ? "That moved work-optional " +
              fmtDur(Math.abs(f0 - f1)) +
              (f1 < f0 ? " closer." : " further out. Better to know.")
            : "Saved. Your dates are a little truer now.";
      drawSheet();
    },
    lifeskip: t => {
      const c = C();
      c.x.skip = c.x.skip || {};
      c.x.skip[t.dataset.k] = true;
      W.edit = null;
      W.moved = null;
      save();
      render();
      drawSheet();
    },
    lifeedit: t => {
      W.edit = t.dataset.k;
      W.moved = null;
      drawSheet();
    },
    moves: () => {
      W = { kind: "moves", tab: "moves", open: null };
      sheet(movesSheet);
    },
    mvtab: t => {
      W.tab = t.dataset.v;
      W.open = null;
      drawSheet();
    },
    mvopen: t => {
      W.open = W.open === t.dataset.v ? null : t.dataset.v;
      drawSheet();
    },
    mvpin: t => {
      const c = C(),
        id = t.dataset.v;
      c.x.pins = (c.x.pins || []).includes(id) ? [] : [id];
      save();
      render();
      drawSheet();
    },
    shape: t => {
      const c = C();
      c.x.shape = c.x.shape === t.dataset.v ? null : t.dataset.v;
      save();
      render();
      drawSheet();
    },
    grow: () => {
      W = { kind: "grow", o: { amt: 200, yrs: 30 } };
      sheet(growSheet);
    },
    growset: t => {
      W.o[t.dataset.k] = +t.dataset.v;
      drawSheet();
    },
    txset: t => {
      const c = C(),
        r = c.invs[+t.dataset.v],
        ord = ["pre", "roth", "tax", "hsa"];
      if (r) {
        r.tx = ord[(ord.indexOf(txOf(r)) + 1) % 4];
        save();
        render();
      }
    },
    gby: t => {
      W.o.by = +t.dataset.v;
      drawSheet();
    },
    gbyset: t => {
      const g = curGoal(),
        v = +t.dataset.v;
      g.byDate = v ? addDays(todayISO(), Math.round(v * 30.44)) : null;
      save();
      render();
      drawSheet();
    },
    gshare2: t => {
      C().goalShare = +t.dataset.v / 100;
      save();
      render();
      drawSheet();
    },
    gplace: t => {
      const by = W.o.by;
      gplace(t);
      if (by && W && W.kind === "goal") {
        const g = curGoal();
        if (g) {
          g.byDate = addDays(todayISO(), Math.round(by * 30.44));
          save();
          render();
          drawSheet();
        }
      }
    },
    pmoved: t => {
      pmoved(t);
      const o = W.o,
        c = C(),
        m = payMath(o);
      if (o.moved && !o.taxed && m.tax > 0 && c.led) {
        o.taxed = true;
        let r = c.cashes.find(x => x.hold);
        if (!r) {
          r = { k: "Tax money set aside", amt: 0, s: true, hold: true };
          c.cashes.push(r);
        }
        r.amt += m.tax;
        o.done.push("Set aside " + money(m.tax) + " for taxes. " + money(r.amt) + " held. It isn't counted as yours.");
        save();
        render();
        drawSheet();
      }
    },
  });
})();

if (typeof document !== "undefined") {
  document.addEventListener("input", e => {
    const el = e.target;
    if (el.dataset && el.dataset.k && W) W.o[el.dataset.k] = el.value;
  });
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-a]");
    if (!t || t.disabled) return;
    const f = ACT[t.dataset.a];
    if (f) f(t);
  });
  document.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("g[data-a]")) {
      e.preventDefault();
      ACT[e.target.dataset.a](e.target);
    }
  });
  render();
}
