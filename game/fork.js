/* ===== fork.js: Fork Theory. A fork is anything poking you right now: a bill, a call you are dodging, being hungry. Small ones add up, and one more small one can be the one that tips you over. This file: (1) the fork check: tap what is poking you, give each one a size, pick the biggest; (2) the exchange rate game: how many small forks your biggest one is worth to you; (3) a slim meter on Home: your load next to your own limit; (4) quick pulls: one to three things under five minutes that take a fork out; (5) at the limit the game backs off: one thing on Next Steps, nothing pulsing; (6) a line for the coach; (7) a dated history for the year view and "since last time". It also replaces the old "how did today go, 1 to 5" question and sets how many steps the game hands you. State: c.x.fk = {f:[{k,s}], big, rate, rateFor, lim, limOk, pulls:{id:{st,d}}, hist:[{d,l,lim,big}], at}. Nothing here is a score to beat. ===== */
const FK_LIST = [
  ["bill", "A new bill"],
  ["debt", "Debt or collections calls"],
  ["job", "Job hunt"],
  ["work", "Work stress"],
  ["car", "Car problem"],
  ["home", "Housing or roommate stuff"],
  ["fam", "Family stuff"],
  ["health", "A health thing"],
  ["fight", "A money fight"],
  ["due", "A deadline"],
  ["tired", "Tired"],
  ["hungry", "Hungry"],
];
const FK_MORE = [
  ["legal", "A legal thing"],
  ["school", "School"],
  ["tax", "Taxes"],
  ["kid", "Kid stuff"],
  ["pet", "Pet stuff"],
  ["move", "Moving"],
  ["tech", "Phone or computer broke"],
  ["wait", "Waiting on someone"],
  ["mess", "A mess at home"],
  ["alone", "Feeling alone"],
];
const FK_SIZE = [
  [1, "Escargot fork", "Tiny. It nags, but you can leave it for now."],
  [3, "Dinner fork", "Real. It is on your mind most days."],
  [10, "Pitchfork", "Huge. Hard to think about anything else."],
];
const FK_SEQ = [3, 6, 10, 15, 20];
var FKX = { open: false, prev: null };
const fkName = k => {
  const r = FK_LIST.concat(FK_MORE).find(x => x[0] === k);
  return r ? r[1] : k;
};
const fkSizeName = s => (FK_SIZE.find(x => x[0] === s) || FK_SIZE[1])[1];
function fkX(c) {
  c.x = c.x || {};
  const x = (c.x.fk = c.x.fk || {});
  x.f = x.f || [];
  x.pulls = x.pulls || {};
  x.hist = x.hist || [];
  if (!x.lim) x.lim = 10;
  return x;
}
const fkHas = c => !!(c && c.x && c.x.fk && c.x.fk.at);
/* your own exchange rate sets what the biggest fork weighs, and nothing else can weigh more than the biggest */
function fkPts(x, f) {
  const cal = x.rate && x.rateFor === x.big && x.f.find(q => q.k === x.big);
  return !cal ? f.s || 1 : f.k === x.big ? x.rate : Math.min(f.s || 1, x.rate);
}
function fkLoad(c) {
  const x = fkX(c);
  return x.f.reduce((t, f) => t + fkPts(x, f), 0);
}
const fkRatio = c => fkLoad(c) / fkX(c).lim;
const fkFull = c => fkHas(c) && fkX(c).f.length > 0 && fkRatio(c) >= 1;
const fkPct = c => Math.max(1, Math.min(100, Math.round(fkRatio(c) * 100)));
/* the old 1-to-5 day score and the number of steps the game hands out both come from the load now */
function fkSpoons(c) {
  const r = fkRatio(c);
  return r >= 1 ? 1 : r >= 0.7 ? 2 : r >= 0.4 ? 3 : r >= 0.15 ? 4 : 5;
}
function fkCommit(c) {
  const x = fkX(c),
    t = todayISO();
  x.at = t;
  if (x.big && !x.f.find(f => f.k === x.big)) x.big = null;
  if (!x.big && x.f.length) x.big = x.f.slice().sort((a, b) => b.s - a.s)[0].k;
  c.spoons = fkSpoons(c);
  c.slots = fkRatio(c) >= 0.7 ? 3 : 5;
  const e = { d: t, l: fkLoad(c), lim: x.lim, big: x.big || null },
    i = x.hist.findIndex(h => h.d === t);
  if (i >= 0) x.hist[i] = e;
  else x.hist.push(e);
  if (x.hist.length > 400) x.hist = x.hist.slice(-400);
  save();
}
/* ---------- quick pulls ---------- */
const FK_PULL = {
  bill: ["Turn on autopay for one bill", "Two minutes in that bill's app, and it stops needing you every month."],
  debt: [
    "Let the next collections call go to voicemail, and write down who called",
    "You are not ignoring it. You are choosing when to deal with it.",
  ],
  job: [
    "Text one person and ask if they have heard of anything",
    "One text. It keeps the hunt moving without a whole application.",
  ],
  work: ["Take a 5-minute break away from your screen", "Stand up, get water, look out a window."],
  car: ["Text one shop for a quote", "Just the quote. Deciding comes later."],
  home: ["Send the one message you have been putting off", "Two lines is enough."],
  fam: ["Text someone back", "Short counts."],
  health: ["Book the appointment. Only the booking", "The visit is a different day's fork."],
  fight: ["Text one calm line: can we talk about it tomorrow?", "It parks the fight instead of carrying it."],
  due: ["Do the first two minutes of it", "Open it and write one line. Starting is most of the weight."],
  tired: ["Take a 5-minute break", "Eyes closed counts."],
  hungry: ["Eat something", "Anything. Decisions come out better after food."],
  legal: ["Put the papers in one place", "One folder, one pile. That is the whole step."],
  school: ["Write down the next due date", "Only the date."],
  tax: ["Find last year's return and leave it where you can see it", "Finding it is the step."],
  kid: ["Text one person who can help this week", "A ride, an hour, a meal."],
  pet: ["Call or text the vet for a time", "Only the booking."],
  move: ["Pack or toss five things", "Five. Then stop."],
  tech: ["Back up your photos, or book the repair", "Whichever is faster."],
  wait: ["Send one nudge to the person you are waiting on", "A short one."],
  mess: ["Clear one surface", "One counter or one chair."],
  alone: ["Text one person you like", "Even a meme counts."],
};
function fkPullList(c) {
  const x = fkX(c),
    t = todayISO(),
    out = [],
    seen = {},
    done = id => x.pulls[id] && x.pulls[id].d === t;
  const add = (id, k, ti, why) => {
    if (seen[k] || done(id)) return;
    seen[k] = 1;
    out.push({ id, k, t: ti, why });
  }; /* one pull per fork: the first one not already answered today */
  x.f
    .slice()
    .sort((a, b) => fkPts(x, b) - fkPts(x, a))
    .forEach(f => {
      if (f.k === "debt") {
        const sm = (c.debts || []).filter(d => d.amt > 0 && d.amt <= 200).sort((a, b) => a.amt - b.amt)[0];
        if (sm)
          add(
            "pay:" + sm.k,
            f.k,
            "Pay off " + sm.k + " (" + money(sm.amt) + ")",
            "A small balance gone is one less thing calling you."
          );
      }
      if (f.k === "bill" && ((c.x.subs && c.x.subs.length) || (c.spends || []).some(s => /subscri/i.test(s.k))))
        add("sub", f.k, "Cancel one subscription you forgot about", "A bill that never comes back.");
      const p = FK_PULL[f.k];
      if (p) add("p:" + f.k, f.k, p[0], p[1]);
    });
  return out.slice(0, 3);
}
function fkPullCard(c, p, quiet) {
  return `<div class="tile stack fkpull" style="gap:6px"><b>${esc(p.t)}</b><div class="tiny muted">${esc(p.why)} Under 5 minutes. For: ${esc(fkName(p.k))}.</div><div class="row" style="gap:6px"><button class="${quiet ? "ghost" : "primary"} slim" style="flex:1" data-a="fkpull" data-k="${esc(p.id)}" data-l="${esc(p.k)}" data-v="done">Done</button><button class="ghost slim" style="flex:1" data-a="fkpull" data-k="${esc(p.id)}" data-l="${esc(p.k)}" data-v="na">Doesn't apply</button><button class="ghost slim" style="flex:1" data-a="fkpull" data-k="${esc(p.id)}" data-l="${esc(p.k)}" data-v="later">Later</button></div></div>`;
}
function fkPullBlock(c, pulls) {
  if (!pulls.length) return "";
  const more = pulls.length - 1;
  return (
    `<div class="small"><b>Quick pull</b> <button class="term" data-a="info" data-k="gloss:pull">i</button></div>` +
    fkPullCard(c, pulls[0]) +
    (more > 0
      ? FKX.all
        ? pulls
            .slice(1)
            .map(p => fkPullCard(c, p, true))
            .join("")
        : `<button class="ghost wide slim" data-a="fkall">Show ${more} more</button>`
      : "")
  );
}
/* ---------- the meter ---------- */
function fkBar(c) {
  const p = fkPct(c),
    hot = fkRatio(c) >= 0.7,
    was = FKX.prev;
  FKX.prev = p;
  return `<div class="fkbar" role="img" aria-label="${p}% of your limit"><i class="${hot ? "hot" : ""}${was != null && was > p ? " drop" : ""}" style="width:${p}%;--w0:${was != null ? was : p}%"></i></div>`;
}
function fkHomeRow(c) {
  if (G.demo || !c) return "";
  if (!fkHas(c))
    return `<button class="rowbtn homerow fkrow" data-a="fork"><span><b>What is poking you today?</b><div class="tiny muted">A 30-second fork check. The game hands you less on a heavy day.</div></span><span class="fkgo">Check</span></button>`;
  const x = fkX(c),
    l = fkLoad(c),
    r = fkRatio(c),
    word = !x.f.length
      ? "Nothing poking you right now"
      : r >= 1
        ? "You're full right now"
        : r >= 0.7
          ? "Getting full"
          : "Room to spare";
  let h = `<button class="rowbtn homerow fkrow" data-a="fkopen" aria-expanded="${FKX.open}"><span style="flex:1;min-width:0"><span class="row between"><b>Forks</b><span class="tiny ${r >= 0.7 ? "fkhot" : "muted"}">${word}</span></span>${fkBar(c)}</span><span class="fkgo">${FKX.open ? "Hide" : "Show"}</span></button>`;
  if (!FKX.open) return h;
  const pulls = r >= 0.7 ? fkPullList(c) : [];
  return (
    h +
    `<div class="tile stack homerow fkmore" style="gap:8px"><div class="row between small"><span>${l} of ${x.lim} points ${`<button class="term" data-a="info" data-k="gloss:forkmeter">i</button>`}</span><span class="muted">${fkPct(c)}% of your limit</span></div>
  ${x.f.length ? `<div class="stack" style="gap:4px">${x.f.map(f => `<div class="row between small" style="align-items:flex-start;gap:8px"><span style="flex:1;min-width:0">${esc(fkName(f.k))}${f.k === x.big ? ` <span class="pill">Biggest</span>` : ""}</span><span class="muted" style="white-space:nowrap">${esc(fkSizeName(f.s))}, ${fkPts(x, f) !== f.s ? "counts as " + fkPts(x, f) : fkPts(x, f) + (fkPts(x, f) === 1 ? " point" : " points")}</span></div>`).join("")}</div>` : `<div class="small muted">No forks picked. That is allowed.</div>`}
  ${fkPullBlock(c, pulls)}
  <div class="small">Your limit ${`<button class="term" data-a="info" data-k="gloss:forklimit">i</button>`}<div class="tiny muted">How much you can carry before everything feels like too much. Only you know. It is not a score.</div></div>
  <div class="row" style="gap:6px"><button class="ghost slim" style="flex:1" data-a="fklim" data-v="-1">Lower</button><button class="${x.limOk ? "primary" : "ghost"} slim" style="flex:1" data-a="fklim" data-v="0">About right</button><button class="ghost slim" style="flex:1" data-a="fklim" data-v="1">Higher</button></div>
  <button class="ghost wide slim" data-a="fork">Check my forks again</button></div>`
  );
}
/* ---------- the fork check, one layer at a time ---------- */
function fkChips(list, x) {
  return `<div class="chips">${list
    .map(r => {
      const on = !!x.f.find(f => f.k === r[0]);
      return `<button class="chip ${on ? "on" : ""}" data-a="fktog" data-v="${r[0]}" aria-pressed="${on}">${esc(r[1])}${on ? " ✕" : ""}</button>`;
    })
    .join("")}</div>`;
}
function fkSheet() {
  const c = C(),
    x = fkX(c),
    w = W,
    st = String(w.step || "pick"),
    I = k => `<button class="term" data-a="info" data-k="gloss:${k}">i</button>`;
  if (st === "pick") {
    const extra = x.f.some(f => FK_MORE.find(m => m[0] === f.k)) || w.more;
    return (
      head("Fork check · step 1 of 3", "What is poking you right now? " + I("forks")) +
      `<div class="small muted">Tap every one that fits. Tap it again to take it off.</div>${fkChips(FK_LIST, x)}<button class="chip ${extra ? "on" : ""}" data-a="fkmore" aria-expanded="${!!extra}">Something else</button>${extra ? fkChips(FK_MORE, x) : ""}
  <div class="tiny muted">Why: on a day with a lot of forks, the game hands you smaller steps. Next: you give each one a size.</div><button class="primary wide" data-a="fknext">${x.f.length ? "Next: size them (" + x.f.length + ")" : "Nothing is poking me right now"}</button>`
    );
  }
  if (st.indexOf("size:") === 0) {
    const i = +st.slice(5),
      f = x.f[i];
    if (!f) {
      w.step = "big";
      return fkSheet();
    }
    return (
      head("Fork check · step 2 of 3", "How big is this one? " + I("forksize")) +
      `<div class="tile row between"><b>${esc(fkName(f.k))}</b><span class="tiny muted">Fork ${i + 1} of ${x.f.length}</span></div>${FK_SIZE.map(s => `<button class="rowbtn ${f.sz && f.s === s[0] ? "on" : ""}" data-a="fksize" data-v="${s[0]}"><span><b>${s[1]}</b><div class="tiny muted">${s[2]}</div></span><span class="tiny">${s[0]} ${s[0] === 1 ? "point" : "points"}</span></button>`).join("")}<div class="tiny muted">Tap one and the next fork comes up. A guess is fine. You can change it any time.</div>`
    );
  }
  if (st === "big")
    return (
      head("Fork check · step 3 of 3", "Which one is your biggest fork? " + I("forkbig")) +
      `<div class="small muted">The one that would feel best to have gone. Tap one.</div>${x.f.map(f => `<button class="rowbtn ${x.big === f.k && w.picked ? "on" : ""}" data-a="fkbig" data-v="${f.k}"><span><b>${esc(fkName(f.k))}</b><div class="tiny muted">${esc(fkSizeName(f.s))}</div></span><span class="tiny">Pick</span></button>`).join("")}`
    );
  if (st.indexOf("game:") === 0) {
    const n = FK_SEQ[+st.slice(5)];
    return (
      head("Fork exchange rate " + I("forkrate"), "Would you rather...") +
      `<div class="small muted">Your biggest fork is <b>${esc(fkName(x.big))}</b>. This finds out how heavy it is to you.</div><div class="fktwo"><button class="rowbtn fkopt" data-a="fkpick" data-v="small"><span><b>Deal with ${n} small forks</b><div class="tiny muted">${n} little things, like ${n} texts you owe people</div></span></button><div class="tiny muted" style="text-align:center">or</div><button class="rowbtn fkopt" data-a="fkpick" data-v="big"><span><b>Deal with your biggest fork</b><div class="tiny muted">${esc(fkName(x.big))}, and it is done</div></span></button></div><div class="tiny muted">There is no right answer. The game keeps asking with a different number until your answer flips.</div>`
    );
  }
  if (st === "rate")
    return (
      head("Fork exchange rate", "Your biggest fork = about " + x.rate + " small ones") +
      `<div class="tile small">That means <b>${esc(fkName(x.big))}</b> takes up about ${x.rate} of your ${x.lim} points all by itself. On days it is around, small steps will feel harder than they look, and that is the fork, not you.</div><div class="small"><b>Does this feel right?</b></div><div class="row" style="gap:8px"><button class="primary" style="flex:1" data-a="fkyes">Yes, that fits</button><button class="ghost" style="flex:1" data-a="fkredo">Redo it</button></div>`
    );
  const l = fkLoad(c),
    r = fkRatio(c),
    pulls = r >= 0.7 ? fkPullList(c) : [];
  return (
    head("Fork check", "Here is your load right now") +
    `<div class="tile stack" style="gap:6px"><div class="row between small"><span>${l} of ${x.lim} points</span><span class="${r >= 0.7 ? "fkhot" : "muted"}">${!x.f.length ? "Nothing poking you" : r >= 1 ? "You're full right now" : r >= 0.7 ? "Getting full" : "Room to spare"}</span></div>${fkBar(c)}<div class="tiny muted">${r >= 1 ? "Everything else can wait. The game shows you one small thing and nothing more until this drops." : r >= 0.7 ? "The game will hand you smaller steps today." : "Today can take a normal step."}</div></div>
  ${fkPullBlock(c, pulls)}
  <button class="primary wide" data-a="close">Save and close</button><button class="ghost wide slim" data-a="fkagain">Change my forks</button>`
  );
}
function fkAfterBig(c) {
  const x = fkX(c);
  if (x.f.length > 1 && x.rateFor !== x.big) {
    W.step = "game:0";
    return;
  }
  W.step = "done";
}
Object.assign(ACT, {
  fork: () => {
    const c = C();
    fkX(c);
    FKX.all = false;
    W = { kind: "fork", step: "pick" };
    sheet(fkSheet);
  },
  fkagain: () => {
    W = { kind: "fork", step: "pick" };
    sheet(fkSheet);
  },
  fkmore: () => {
    W.more = !W.more;
    drawSheet();
  },
  fkall: () => {
    FKX.all = true;
    render();
    if (SH) drawSheet();
  },
  fktog: t => {
    const c = C(),
      x = fkX(c),
      k = t.dataset.v,
      i = x.f.findIndex(f => f.k === k);
    if (i >= 0) x.f.splice(i, 1);
    else x.f.push({ k, s: 3 });
    fkCommit(c);
    drawSheet();
  },
  fknext: () => {
    const c = C(),
      x = fkX(c);
    fkCommit(c);
    W.step = x.f.length ? "size:0" : "done";
    drawSheet();
  },
  fksize: t => {
    const c = C(),
      x = fkX(c),
      i = +String(W.step).slice(5),
      f = x.f[i];
    if (!f) return;
    f.s = +t.dataset.v;
    f.sz = true;
    fkCommit(c);
    if (i + 1 < x.f.length) W.step = "size:" + (i + 1);
    else if (x.f.length === 1) {
      x.big = x.f[0].k;
      fkCommit(c);
      W.step = "done";
    } else W.step = "big";
    drawSheet();
  },
  fkbig: t => {
    const c = C(),
      x = fkX(c);
    x.big = t.dataset.v;
    W.picked = true;
    fkCommit(c);
    fkAfterBig(c);
    drawSheet();
  },
  fkpick: t => {
    const c = C(),
      x = fkX(c),
      i = +String(W.step).slice(5),
      n = FK_SEQ[i];
    if (t.dataset.v === "big") {
      x.rate = i === 0 ? 2 : Math.round((FK_SEQ[i - 1] + n) / 2);
      x.rateFor = x.big;
      fkCommit(c);
      W.step = "rate";
    } else if (i + 1 < FK_SEQ.length) W.step = "game:" + (i + 1);
    else {
      x.rate = 25;
      x.rateFor = x.big;
      fkCommit(c);
      W.step = "rate";
    }
    drawSheet();
  },
  fkyes: () => {
    W.step = "done";
    drawSheet();
  },
  fkredo: () => {
    const x = fkX(C());
    x.rate = null;
    x.rateFor = null;
    W.step = "game:0";
    drawSheet();
  },
  fklim: t => {
    const c = C(),
      x = fkX(c),
      v = +t.dataset.v;
    if (v) x.lim = Math.max(4, Math.min(30, x.lim + v * 2));
    x.limOk = true;
    fkCommit(c);
    render();
    if (SH) drawSheet();
  },
  fkopen: () => {
    FKX.open = !FKX.open;
    if (typeof tab !== "undefined" && tab !== "home") {
      FKX.open = true;
      go("home");
    } else render();
  },
  fkpull: t => {
    const c = C(),
      x = fkX(c),
      id = t.dataset.k,
      k = t.dataset.l,
      v = t.dataset.v;
    x.pulls[id] = { st: v, d: todayISO() };
    if (v === "done") {
      const i = x.f.findIndex(f => f.k === k);
      if (i >= 0) {
        const f = x.f[i];
        const gone = k === "hungry" || k === "tired" || f.s <= 1;
        if (gone) x.f.splice(i, 1);
        else f.s = f.s >= 10 ? 3 : 1;
        if (x.rateFor === k) {
          if (gone) {
            x.rate = null;
            x.rateFor = null;
          } else x.rate = Math.max(f.s, Math.round(x.rate / 2));
        }
      }
      c.moves = c.moves || [];
      c.moves.push({ d: todayISO(), t: "Pulled a fork: " + fkName(k), amt: 0 });
      fkCommit(c);
      celebrate("A little lighter", [
        "One fork pulled. That is the 1% better kind of move.",
        "Your load is down to " + fkLoad(c) + " of " + fkX(c).lim + ".",
      ]);
      return;
    }
    fkCommit(c);
    render();
    if (SH) drawSheet();
  },
});
/* ---------- where it shows up ---------- */
/* Part of home() in ui.js. Adds the row for the fork check. It also sets the page mark "fkfull" when the player is at the limit. */
function homeForkRow(h) {
  try {
    const c = C();
    if (typeof document !== "undefined" && document.body && document.body.classList)
      document.body.classList.toggle("fkfull", !!(c && !G.demo && fkFull(c)));
    const row = fkHomeRow(c);
    if (row && !/Nothing here needs you/.test(h)) h = homeRowAdd(h, row);
  } catch (e) {}
  return h;
}
(() => {
  /* at the limit the game backs off: one thing, and a plain line */
  const _ns = nextStep;
  nextStep = function (c, d) {
    try {
      if (c && !G.demo && fkFull(c)) {
        const p = fkPullList(c)[0];
        return {
          t: p ? p.t : "Rest. Nothing is due from you here",
          s: "Everything else can wait. You're full right now.",
          a: "fkopen",
          l: "Open my forks",
        };
      }
    } catch (e) {}
    return _ns(c, d);
  };
  const _pt = planTab;
  planTab = function () {
    const c = C();
    if (G.demo || !fkFull(c)) return _pt();
    const p = fkPullList(c)[0];
    return (
      (typeof tabHead === "function" ? tabHead() : "") +
      `<div class="stack"><div class="tile stack" style="gap:6px"><div class="row between small"><b>Forks</b><span class="fkhot">You're full right now</span></div>${fkBar(c)}</div>${p ? fkPullCard(c, p) : `<div class="tile small">Nothing to do here today.</div>`}<div class="tile small"><b>Everything else can wait.</b> You're full right now. Your other steps are safe and come back when your load drops.</div><button class="ghost wide slim" data-a="fork">Check my forks again</button></div>`
    );
  };
  /* the daily check-in asks about forks instead of a 1-to-5 score */
  const FK_Q = q;
  q = function (label, inner, help) {
    if (typeof label === "string" && label.indexOf("How well did you do with money today") === 0) {
      const c = C(),
        has = fkHas(c) && fkX(c).at === todayISO();
      return `<div class="tile stack" style="gap:6px"><div class="row between small"><b>What is poking you today?</b><span class="muted">${has ? fkLoad(c) + " of " + fkX(c).lim + " points" : "Not checked today"}</span></div>${has ? fkBar(c) : ""}<button class="${has ? "ghost" : "primary"} wide slim" data-a="fork">${has ? "Change my forks" : "Do the 30-second fork check"}</button><div class="tiny muted">This sets how big a step the game hands you next.</div></div>`;
    }
    return FK_Q(label, inner, help);
  };
  const _ds = ACT.dsave;
  ACT.dsave = t => {
    try {
      if (W && W.o && fkHas(C())) W.o.spoons = fkSpoons(C());
    } catch (e) {}
    return _ds(t);
  };
  /* coach view: each person's load and biggest fork */
  const _cs = coachSheet;
  coachSheet = function () {
    _cs();
    const f = SH;
    if (typeof f !== "function") return;
    const hd = head("Coach view", "Session prep");
    sheet(() => {
      const h = f(),
        rows = G.chars
          .filter(c => fkHas(c))
          .map(c => {
            const x = fkX(c);
            return `<div class="row between small"><span><b>${esc(c.name)}</b>${x.big ? ": biggest is " + esc(fkName(x.big)) : ""}</span><span class="${fkRatio(c) >= 0.7 ? "fkhot" : "muted"}">${fkLoad(c)} of ${x.lim}</span></div>`;
          })
          .join("");
      return rows && h.indexOf(hd) === 0
        ? hd +
            `<div class="tile stack" style="gap:4px"><div class="tiny muted">Fork load, from each person's last fork check</div>${rows}</div>` +
            h.slice(hd.length)
        : h;
    });
  };
  /* since last time, and the year view */
  const fkThen = (c, d) => {
    const hs = fkX(c).hist.filter(h => h.d <= d);
    return hs.length ? hs[hs.length - 1] : null;
  };
  if (typeof bkSheet === "function") {
    const _bk = bkSheet;
    bkSheet = function () {
      let h = _bk();
      try {
        const c = C(),
          w = c.x && c.x.wb,
          then = w && w.pb && w.pb.d ? fkThen(c, w.pb.d) : null;
        if (then && fkHas(c)) {
          const now = fkLoad(c),
            line = `<div class="tile small"><b>Forks:</b> ${then.l} of ${then.lim} then, ${now} of ${fkX(c).lim} now. ${now < then.l ? "Lighter." : now > then.l ? "Heavier right now, so the game is handing you less." : "About the same."}</div>`,
            k = h.lastIndexOf("<button");
          h = k >= 0 ? h.slice(0, k) + line + h.slice(k) : h + line;
        }
      } catch (e) {}
      return h;
    };
  }
  if (typeof reviewSheet === "function") {
    const _rv = reviewSheet;
    reviewSheet = function () {
      let h = _rv();
      try {
        const c = C(),
          hs = fkX(c).hist.filter(x => daysBetween(x.d, todayISO()) <= 366);
        if (hs.length >= 2 && !(W && W.step)) {
          const ls = hs.map(x => x.l),
            line = `<div class="tile small"><b>Your forks this year:</b> lightest ${Math.min.apply(null, ls)}, heaviest ${Math.max.apply(null, ls)}, now ${fkLoad(c)}. ${hs.length} fork checks.</div>`,
            k = h.lastIndexOf("<button");
          h = k >= 0 ? h.slice(0, k) + line + h.slice(k) : h + line;
        }
      } catch (e) {}
      return h;
    };
  }
})();
Object.assign(GLOSS, {
  forks: [
    "Forks",
    "A fork is anything poking you right now: a bill, a call you are dodging, being hungry. Small ones add up, and one more small one can be the one that tips you over. Pulling even one out makes room. Fork Theory comes from a Tumblr post by jenroses, building on Christine Miserandino's Spoon Theory.",
  ],
  forksize: [
    "Fork sizes",
    "Escargot fork: tiny, 1 point. Dinner fork: real, 3 points. Pitchfork: huge, 10 points. A guess is fine.",
  ],
  forkbig: [
    "Your biggest fork",
    "The one that would feel best to have gone. The game uses it to work out your exchange rate.",
  ],
  forkrate: [
    "Fork exchange rate",
    "How many small forks your biggest one is worth to you. If you would rather handle 6 small things than the big one, the big one weighs more than 6. The game uses your answer, not a rule.",
  ],
  forkmeter: [
    "Fork meter",
    "Your forks added up, next to your own limit. It is not a score. It tells the game how big a step to hand you.",
  ],
  forklimit: [
    "Your limit",
    "How much you can carry before everything feels like too much. It starts at 10 points. Nudge it until it feels true.",
  ],
  pull: [
    "Quick pull",
    "Something under 5 minutes that takes one fork out, or makes it smaller. When you are near your limit, pulling one is the whole job.",
  ],
});
if (typeof NV_INFO !== "undefined") {
  NV_INFO.fork = [
    "Fork check",
    "Tap what is poking you today, give each one a size, and pick the biggest.",
    "The game uses it to hand you smaller steps on a heavy day.",
  ];
  GLOSS.scr_fork = [NV_INFO.fork[0], NV_INFO.fork[1] + " " + NV_INFO.fork[2]];
}
if (typeof MENU !== "undefined")
  MENU.push(["Fork check", "fork", "act", "What is poking you today, and how much room you have left"]);
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
