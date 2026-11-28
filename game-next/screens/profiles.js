/* ============================================================================
   SLAM the Game: screens/profiles.js
   PURPOSE     More than one person in one game: a household (the money is combined) or the persons that
               a coach helps (the money is apart). The sheet "People" is here: it only switches people.
               The card "Your people" of the Me tab holds the rest (run 16, D12).
   INPUT       The game: G.active, G.chars, G.coach, G.demo, G.house. The open sheet (W.kind): people.
               The taps of the player (the actions in OUTPUT).
   OUTPUT      7 functions. Parts of functions in other files: profOpen, meTabPeople (meTab in ui.js).
               Actions (ACT): pflip, pmode, pname, ppmore, prm, prmno, prmyes.
   DEPENDS ON  core/report.js, account/supa.js, core/engine.js, core/engine2.js, screens/ui.js.
   USES LATER  Names from files that the browser loads later. Behind a typeof test, thus safe while the
               page loads: screens/planner.js, features/moneylog.js, features/fair.js,
               features/house.js, account/addon.js.
   ========================================================================= */
/* profStrip() made a strip of buttons to go from one person to the next.
   planner.js has the name button in the top bar. That button is the only switch now, and the strip is empty.
   The lines below it run only while the page loads, before planner.js is there. */
function profStrip() {
  if (typeof topbarHTML === "function") return "";
  if (G.demo || G.chars.length < 2) return "";
  const c = C(),
    n = G.chars.length;
  return `<div class="profstrip"><button class="ghost slim" data-a="pflip" data-v="-1" aria-label="Previous person"><i class=chevl aria-hidden=true></i></button><button class="profname" data-a="people"><b>${esc(c.name)}</b><span class="tiny">${G.coach ? "Coaching · " : ""}${G.active + 1} of ${n} ▾</span></button><button class="ghost slim" data-a="pflip" data-v="1" aria-label="Next person"><i class=chev aria-hidden=true></i></button></div>`;
}
function profInfo(c) {
  const d = derive(c);
  let step = "";
  try {
    step = (nextStep(c, d) || {}).t || "";
  } catch (e) {
    report(e, "profiles.js: profInfo");
  }
  const last = c.hist && c.hist.length ? c.hist[c.hist.length - 1].d : null;
  return {
    era: eraN(d.era),
    realm: d.realm,
    fog: typeof fogPct === "function" ? fogPct(c, d) : null,
    step,
    last,
    placed: !!c.placed,
  };
}
/* THE SHEET "PEOPLE" (run 16, D11 to D17). It only switches people: one row for each person, Add a person, Sign
   out. Household, Sharing costs fairly, Kids mode, Your guild and what "More options" held are on the Me tab
   (meTabPeople). profSheet() makes the full sheet. It calls each part by name, in the load order of the files.
   profSheetBase() is the part from this file. */
function profSheet() {
  let h = profSheetBase();
  if (typeof profSheetAddon === "function") h = profSheetAddon(h); /* addon.js: the card for the add-ons */
  if (typeof profSheetFounding === "function") h = profSheetFounding(h); /* founding.js: the mark "Founding Tester" */
  return h;
}
function profSheetBase() {
  const w = W,
    n = G.chars.length;
  if (w.rm != null && G.chars[w.rm])
    return (
      head("Profiles", "Remove " + esc(G.chars[w.rm].name) + "?") +
      `<div class="tile small">This deletes ${esc(G.chars[w.rm].name)}'s game from this device. It can't be undone. Make a backup first if you might want it back.</div><button class="ghost wide" data-a="backup">Make a backup first</button><button class="primary wide" data-a="prmno">Keep ${esc(G.chars[w.rm].name)}</button><button class="ghost wide slim" data-a="prmyes">Yes, remove</button>`
    );
  if (G.demo)
    return (
      head("Profiles", "Sample characters") +
      `<div class="small muted">These are samples to explore. Start a real one and you can add as many people as you like.</div><div class="stack" style="gap:6px">${G.chars.map((c, i) => profRow(c, i)).join("")}</div><button class="primary wide" data-a="start">Now let's do you</button>`
    );
  /* everyone, one slim row each, so nobody is below the fold */
  return (
    head("Profiles", "Who are you looking at?") +
    `<div class="tiny muted" data-fid="pr:help">${n === 1 ? PROF_ONE : n + " people. Tap a name to switch."}</div><div class="stack" style="gap:6px">${G.chars.map((c, i) => profRow(c, i)).join("")}</div>${typeof SUPA !== "undefined" && SUPA && SUPA.on && SUPA.uid ? `<div class="row" style="gap:8px"><button class="primary" style="flex:1" data-a="addperson">Add a person</button><button class="ghost prout" data-a="suout">Sign out</button></div><div class="tiny muted">Signed in as ${esc(SUPA.email || "")}. Your game is saved before you sign out.</div>` : `<button class="primary wide" data-a="addperson">Add a person</button>`}`
  );
}
/* The helper line of the sheet with one person. */
const PROF_ONE = "Add a person to switch between people.";
/* One person of the sheet: the first letter of the name, the name, how much of setup is done, and the next step
   (it wraps to two lines). The person on screen has a check mark and plain words, not a pill. */
function profRow(c, i) {
  const p = profInfo(c),
    on = i === G.active;
  return `<button class="rowbtn prow ${on ? "on" : ""}" data-a="switch" data-v="${i}"${on ? ' aria-current="true"' : ""}><span class="ava2">${esc(
    String(c.name || "?")
      .trim()
      .charAt(0)
      .toUpperCase()
  )}</span><span class="pn"><b>${esc(c.name)}</b><div class="tiny muted">${p.fog != null ? p.fog + "% of setup done · " : ""}${p.placed ? "Next: " + esc(p.step || "nothing waiting") : "Not started yet"}</div></span>${on ? `<span class="tiny muted prhere">✓ Here now</span>` : `<span class="tiny prgo">Open <i class=chev aria-hidden=true></i></span>`}</button>`;
}
/* Part of meTab() in ui.js (run 16, D12). The card "Your people": what the sheet "People" held besides the switch.
   The rows Our household, Sharing costs fairly, Kids mode and Your guild come from their own files. "People
   settings" holds what "More options" held: household or people I coach, who you combine money with, remove
   someone, send or add a person with a code, and a way to change the name. */
function meTabPeople(h) {
  try {
    if (G.demo) return h;
    const n = G.chars.length;
    let rows = "";
    if (typeof mePeopleHouse === "function") rows = mePeopleHouse(rows); /* house.js: the row "Our household" */
    if (typeof mePeopleFair === "function") rows = mePeopleFair(rows); /* fair.js: the row "Sharing costs fairly" */
    if (typeof mePeopleKids === "function") rows = mePeopleKids(rows); /* kids.js: the row "Kids mode" */
    if (typeof mePeopleGuild === "function") rows = mePeopleGuild(rows); /* guild.js: the row "Your guild" */
    if (G.coach && n > 1) rows += `<button class="ghost wide slim" data-a="coach">See everyone on one screen</button>`;
    let set = `<div class="small">These people are:</div><div class="seg"><button class="${G.coach ? "" : "on"}" data-a="pmode" data-v="house">My household</button><button class="${G.coach ? "on" : ""}" data-a="pmode" data-v="coach">People I coach</button></div><div class="tiny muted">${G.coach ? "Each person's money stays separate. Nothing is added together." : "Money can be looked at together on Home once there are two or more."}</div>${G.coach ? "" : q("Who you combine money with", chipsRow("share", ["No one", "A partner", "More than one partner", "Family"], G.house.share, "gh"))}<button class="ghost wide slim" data-a="pname">Change my name</button>${n > 1 ? `<div class="small">Remove someone:</div><div class="chips">${G.chars.map((c, i) => `<button class="ghost slim" data-a="prm" data-v="${i}">Remove ${esc(c.name)}</button>`).join("")}</div>` : ""}`;
    if (typeof mePeopleHandoff === "function") set = mePeopleHandoff(set); /* moneylog.js: a person with a code */
    set += `<div class="tiny muted">Everyone is saved to your account, so they show up on your other devices too.</div>`;
    const card = `<div class="card stack mepeople" data-fid="me:people" style="gap:8px"><div class="tiny muted">Your people</div>${rows}<button class="ghost wide slim" data-a="ppmore" aria-expanded="${W_PEOPLE.open ? "true" : "false"}">${W_PEOPLE.open ? "Hide people settings" : "People settings"}</button>${W_PEOPLE.open ? `<div class="tile stack" style="gap:8px">${set}</div>` : ""}</div>`,
      at = '<div class="card row between"><span><b>Beginner or Expert</b>'; /* ux.js: the card above the fold */
    return h.indexOf(at) >= 0 ? h.replace(at, () => card + at) : h + card;
  } catch (e) {
    report(e, "profiles.js: meTabPeople");
    return h;
  }
}
/* "People settings" on the Me tab: closed until the player opens it. It stays open while the tab is drawn again. */
const W_PEOPLE = { open: false };
/* Part of peopleSheet() in ui.js. Opens the sheet "People" of this file. */
function profOpen() {
  W = { kind: "people", rm: null };
  sheet(profSheet);
}
Object.assign(ACT, {
  pflip: t => {
    const n = G.chars.length;
    G.active = (G.active + +t.dataset.v + n) % n;
    save();
    if (SH) closeSheet();
    render();
    if (typeof scrollTo === "function") scrollTo(0, 0);
  },
  pmode: t => {
    G.coach = t.dataset.v === "coach";
    save();
    render();
    drawSheet();
  },
  ppmore: () => {
    W_PEOPLE.open = !W_PEOPLE.open;
    render();
  },
  /* Remove someone (Me, People settings): the sheet "People" asks first */
  prm: t => {
    if (!W || W.kind !== "people") profOpen();
    W.rm = +t.dataset.v;
    drawSheet();
  },
  /* Change my name (Me, People settings): "Change my answers" opens at its last page, where the name is */
  pname: () => {
    openSetup("edit");
    if (W && W.kind === "setup") {
      W.step = 6;
      drawSheet();
    }
  },
  prmno: () => {
    W.rm = null;
    drawSheet();
  },
  prmyes: () => {
    const i = W.rm;
    if (G.chars.length > 1 && G.chars[i]) {
      G.chars.splice(i, 1);
      if (G.active >= G.chars.length) G.active = G.chars.length - 1;
      else if (G.active > i) G.active--;
    }
    W.rm = null;
    save();
    render();
    drawSheet();
  },
});
if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) render();
