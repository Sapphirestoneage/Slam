/* ============================================================================
   SLAM the Game: features/guild.js
   PURPOSE     People, inside the profiles of this game (run Not built, groups 1 to 5, Part 10b). (1) A guild:
               the people of this game (a household, or the people a coach helps) who each turn on "Join the
               guild" and pick what the others may see. Private by default: nothing shows until a person turns
               it on, and no number of money is ever shared (only the era, the steps done this month, the day
               streak and the latest win, each one a switch). No public feed. (2) Mentors who finished: a
               member who finished a whole skill track can offer to be asked about it; the others see "Ask
               them" on that track. (3) The monthly group money date: one day of the month, an order of five
               prompts to tap through together, and the next date.
   INPUT       G.chars, G.coach, G.demo, G.guild (the name and the date), c.x.gd of each profile (the switches).
   OUTPUT      Functions: gdX, gdMembers, gdView, gdFinished, gdMentors, gdMentorPart, gdNext, gdDateSteps,
               mePeopleGuild, gdSheet, gdDateSheet. Parts of functions in other files: mePeopleGuild
               (meTabPeople in profiles.js), gdMentorPart (skillSheetBase in ui.js). Named functions Home can
               call later: gdNext (the next money date), gdMembers. Actions (ACT): guild, gdjoin, gdshow,
               gdmentor, gdname, gdday, gddate, gdstep, gdheld. Menu: "Your guild".
   DEPENDS ON  core/report.js, core/play.js (plNextMonthly), core/engine.js (derive, nextSkill, treeSize),
               screens/ui.js (esc, head, sheet, onoff, nextStep, eraN, trackN), screens/dash.js (the kit),
               screens/profiles.js (meTabPeople).
   RULES       Sharing between accounts needs the tables of supabase/migrations/20261126120000_guilds.sql,
               which is NOT APPLIED. Until Eli applies it, a guild is the people of this one game.
   ========================================================================= */
const GD_SHOW = [
  ["era", "My era", "The name of the stage you are at"],
  ["steps", "Steps done this month", "A count, no names"],
  ["streak", "My day streak", "Days in a row you checked in"],
  ["win", "My latest win", "The name of the last step you finished"],
  ["next", "My next turn", "The one next step the game gives you"],
];
function gdX(c) {
  c.x = c.x || {};
  return (c.x.gd = c.x.gd || { on: false, show: {}, mentor: false });
}
function gdG() {
  return (G.guild = G.guild || { name: "", day: null, held: [], step: 0 });
}
/* The people who joined. Home can call this later. */
function gdMembers() {
  if (G.demo) return [];
  return (G.chars || []).filter(c => c && c.x && c.x.gd && c.x.gd.on);
}
/* What one member lets the others see. Only the switches that are on; never a money number. */
function gdView(c) {
  const X = gdX(c),
    S = X.show || {},
    t = todayISO().slice(0, 7),
    out = { name: c.name || "Someone", c };
  try {
    const d = derive(c);
    if (S.era) out.era = eraN(d.era);
    if (S.steps) out.steps = Object.keys(c.skills || {}).filter(k => String(c.skills[k]).slice(0, 7) === t).length;
    if (S.streak) out.streak = c.streak || 0;
    if (S.win) {
      const last = Object.keys(c.skills || {})
        .filter(k => typeof c.skills[k] === "string")
        .sort((a, b) => (c.skills[a] < c.skills[b] ? 1 : -1))[0];
      out.win = last ? SKILLS[last.split(":")[0]].skills[+last.split(":")[1]][0] : null;
    }
    if (S.next) out.next = (nextStep(c, d) || {}).t || null;
  } catch (e) {
    report(e, "guild.js: gdView");
  }
  return out;
}
/* The skill tracks a profile finished, every step done. */
function gdFinished(c) {
  if (typeof TREES === "undefined" || typeof SKILLS === "undefined") return [];
  return Object.keys(TREES).filter(t => SKILLS[t] && nextSkill(c, t) < 0);
}
/* The mentors: members who offered, with the tracks they finished. me: leave this person out. */
function gdMentors(me) {
  return gdMembers()
    .filter(c => c !== me && gdX(c).mentor)
    .map(c => ({ c, name: c.name || "Someone", tracks: gdFinished(c) }))
    .filter(m => m.tracks.length);
}
/* Part of skillSheetBase() in ui.js: on a track a guild mentor finished, who to ask. */
function gdMentorPart(c, id) {
  try {
    if (!gdX(c).on) return "";
    const t = id.split(":")[0],
      M = gdMentors(c).filter(m => m.tracks.includes(t));
    if (!M.length) return "";
    return `<div class="tile small" data-fid="gd:ask">Ask ${esc(M.map(m => m.name).join(" or "))}: ${M.length === 1 ? "they" : "each"} finished ${esc(trackN(t))} and offered to help in your guild.</div>`;
  } catch (e) {
    report(e, "guild.js: gdMentorPart");
    return "";
  }
}
/* The next group money date. Home can call this later. null: no day picked yet. */
function gdNext() {
  const g = gdG();
  return g.day ? plNextMonthly(todayISO(), g.day, (g.held || []).slice(-1)[0] === todayISO()) : null;
}
/* The five prompts of the date, filled with what each member shares. */
function gdDateSteps() {
  const V = gdMembers().map(gdView),
    M = gdMentors(null);
  return [
    {
      t: "One win each",
      l: V.map(v => v.name + ": " + (v.win ? v.win : "say one thing that went well this month")),
    },
    {
      t: "The guild this month",
      l: V.map(
        v =>
          v.name +
          (v.steps != null
            ? ": " + v.steps + (v.steps === 1 ? " step" : " steps") + " done"
            : ": share what you worked on") +
          (v.streak != null ? ", a " + v.streak + "-day streak" : "")
      ),
    },
    {
      t: "One next turn each",
      l: V.map(v => v.name + ": " + (v.next ? v.next : "pick one thing before next time")),
    },
    {
      t: "Ask the people who finished",
      l: M.length
        ? M.map(m => m.name + " finished " + m.tracks.map(trackN).join(", "))
        : ["No one has offered yet. When someone finishes a whole track, they can offer to be asked."],
    },
    /* hhold.js: the talk points of Same question, when there are any */
    typeof hxDateStep === "function" ? hxDateStep() : null,
    { t: "Set the next one, and end with something nice", l: ["The next date is the same day next month."] },
  ].filter(Boolean);
}
/* Part of profSheet() in profiles.js: the row of the guild. */
function mePeopleGuild(h) {
  if (G.demo || (G.chars || []).length < 2) return h;
  const n = gdMembers().length;
  return (
    h +
    `<button class="rowbtn" data-a="guild"><span><b>Your guild</b><div class="tiny muted">${n ? n + " joined. " : ""}A private group of the people in this game, and a monthly money date</div></span><span class="caret"><i class=chev aria-hidden=true></i></span></button>`
  );
}
function gdSheet() {
  const c = C(),
    X = gdX(c),
    g = gdG(),
    V = gdMembers().map(gdView),
    nx = gdNext(),
    fin = gdFinished(c),
    few = G.demo || (G.chars || []).length < 2;
  if (few)
    return (
      head("People", "Your guild") +
      `<div class="tile small">A guild is the people in this game. Add another person first: a partner, a kid or someone you help. Sharing with other accounts comes later.</div><button class="primary wide" data-a="addperson">Add another person</button><button class="ghost wide slim" data-a="close">Done</button>`
    );
  const me = dkCard(
    "You in the guild",
    `<div class="row between" style="gap:8px"><span class="small"><b>Join the guild</b><div class="tiny muted">${G.coach ? "Turn this on only with " + esc(c.name) + "'s yes." : "Off until you turn it on. No money number is ever shared."}</div></span>${onoff("gdjoin", X.on)}</div>` +
      (X.on
        ? `<div class="small" style="margin-top:6px">What the others in the guild may see</div>${GD_SHOW.map(s => `<div class="row between" style="gap:8px"><span class="small">${esc(s[1])}<div class="tiny muted">${esc(s[2])}</div></span><button class="chip ${X.show[s[0]] ? "on" : ""}" data-a="gdshow" data-v="${s[0]}">${X.show[s[0]] ? "Shown" : "Hidden"}</button></div>`).join("")}` +
          (fin.length
            ? `<div class="row between" style="gap:8px;margin-top:6px"><span class="small"><b>Be asked about what you finished</b><div class="tiny muted">You finished ${esc(fin.map(trackN).join(", "))}.</div></span>${onoff("gdmentor", X.mentor)}</div>`
            : `<div class="tiny muted" style="margin-top:6px">Finish a whole skill track and you can offer to be asked about it.</div>`)
        : "")
  );
  const group = dkCard(
    g.name ? g.name : "The guild",
    (V.length
      ? `<div class="stack" style="gap:6px">${V.map(v => `<div class="tile stack" style="gap:2px" data-fid="gd:m"><b class="small">${esc(v.name)}</b><div class="tiny muted">${[v.era, v.steps != null ? v.steps + " steps this month" : null, v.streak != null ? v.streak + "-day streak" : null, v.win ? "Latest win: " + v.win : null].filter(Boolean).map(esc).join(" · ") || "Shares nothing yet"}</div></div>`).join("")}</div>`
      : `<div class="small">No one has joined yet.</div>`) +
      `<div class="field"><label class="small" for="gdname">The guild's name</label><input id="gdname" type="text" maxlength="40" value="${esc(g.name || "")}" placeholder="For example: The Tuesday table"><div class="tiny muted">Only the people in this game see it.</div></div><button class="ghost wide slim" data-a="gdname">Keep the name</button>`,
    { right: dkPill(V.length + " joined") }
  );
  const date = dkCard(
    "The monthly money date",
    `<div class="small">${nx ? "Next one: " + esc(nice(nx)) + (nx === todayISO() ? " (today)" : "") : "Pick a day of the month."}</div>` +
      `<div class="chips">${[1, 5, 10, 15, 20, 25].map(d => `<button class="chip ${g.day === d ? "on" : ""}" data-a="gdday" data-v="${d}">The ${d}${d === 1 ? "st" : "th"}</button>`).join("")}</div>` +
      (V.length ? `<button class="primary wide" data-a="gddate">Start the money date</button>` : "") +
      `<div class="tiny muted">${(g.held || []).length ? "Held " + g.held.length + (g.held.length === 1 ? " time" : " times") + "." : ""} About 20 minutes, together, five prompts.</div>`
  );
  return (
    head("People", "Your guild") +
    dkCaption("Private to the people in this game. No public feed.") +
    me +
    group +
    date +
    `<button class="ghost wide slim" data-a="close">Done</button>`
  );
}
function gdDateSheet() {
  const L = gdDateSteps(),
    i = Math.min((W && W.step) || 0, L.length - 1),
    s = L[i],
    last = i === L.length - 1;
  return (
    head("Your guild", "The money date") +
    dkProgress(Math.round(((i + 1) / L.length) * 100), { text: "Prompt " + (i + 1) + " of " + L.length }) +
    dkCard(
      s.t,
      `<div class="stack" style="gap:4px">${s.l.map(x => `<div class="small">${esc(x)}</div>`).join("")}</div>`
    ) +
    (last
      ? `<button class="primary wide" data-a="gdheld">We held it. Set the next one</button>`
      : `<button class="primary wide" data-a="gdstep" data-v="${i + 1}">Next prompt</button>`) +
    (i ? `<button class="ghost wide slim" data-a="gdstep" data-v="${i - 1}">Back one</button>` : "")
  );
}
Object.assign(ACT, {
  guild: () => {
    W = { kind: "guild" };
    sheet(gdSheet);
  },
  gdjoin: t => {
    const X = gdX(C());
    X.on = t.dataset.v === "1";
    if (!X.on) X.mentor = false;
    save();
    drawSheet();
  },
  gdshow: t => {
    const X = gdX(C());
    X.show = X.show || {};
    X.show[t.dataset.v] = !X.show[t.dataset.v];
    save();
    drawSheet();
  },
  gdmentor: t => {
    const X = gdX(C());
    X.mentor = t.dataset.v === "1" && X.on;
    save();
    drawSheet();
  },
  gdname: () => {
    const el = typeof document !== "undefined" && document.getElementById ? document.getElementById("gdname") : null;
    gdG().name = el ? String(el.value || "").slice(0, 40) : gdG().name;
    save();
    drawSheet();
  },
  gdday: t => {
    gdG().day = +t.dataset.v;
    save();
    drawSheet();
  },
  gddate: () => {
    W = { kind: "gddate", step: 0 };
    sheet(gdDateSheet);
  },
  gdstep: t => {
    if (W && W.kind === "gddate") W.step = Math.max(0, +t.dataset.v);
    drawSheet();
  },
  gdheld: () => {
    const g = gdG();
    g.held = (g.held || []).concat(todayISO());
    if (!g.day) g.day = Math.min(28, +todayISO().slice(8, 10));
    save();
    W = { kind: "guild" };
    sheet(gdSheet);
  },
});
if (typeof MENU !== "undefined")
  MENU.push([
    "Your guild",
    "guild",
    "act",
    "A private group of the people in this game, mentors who finished, and a monthly money date",
  ]);
