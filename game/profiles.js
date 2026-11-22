/* ===== profiles.js: flip between people. A household (money combined) or people you coach (kept apart). All of it lives on this device. ===== */
function profStrip() {
  if (G.demo || G.chars.length < 2) return "";
  const c = C(),
    n = G.chars.length;
  return `<div class="profstrip"><button class="ghost slim" data-a="pflip" data-v="-1" aria-label="Previous person">‹</button><button class="profname" data-a="people"><b>${esc(c.name)}</b><span class="tiny">${G.coach ? "Coaching · " : ""}${G.active + 1} of ${n} ▾</span></button><button class="ghost slim" data-a="pflip" data-v="1" aria-label="Next person">›</button></div>`;
}
function profInfo(c) {
  const d = derive(c);
  let step = "";
  try {
    step = (nextStep(c, d) || {}).t || "";
  } catch (e) {}
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
/* THE SHEET "PEOPLE".
   profSheet() makes the full sheet. It calls each part by name, in the load order of the files.
   profSheetBase() is the part from this file. */
function profSheet() {
  let h = profSheetBase();
  if (typeof profSheetHandoff === "function")
    h = profSheetHandoff(h); /* moneylog.js: send or add a person with a code */
  if (typeof profSheetFair === "function") h = profSheetFair(h); /* fair.js: the row "Sharing costs fairly" */
  if (typeof profSheetHouse === "function") h = profSheetHouse(h); /* house.js: the row "Our household" */
  if (typeof profSheetAddon === "function") h = profSheetAddon(h); /* addon.js: the card for the add-ons */
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
  /* everyone first, one slim row each, so nobody is below the fold. Settings sit under More. */
  return (
    head("Profiles", "Who are you looking at?") +
    `<div class="tiny muted">${n} ${n === 1 ? "person" : "people"}. Tap a name to switch.</div><div class="stack" style="gap:6px">${G.chars.map((c, i) => profRow(c, i)).join("")}</div>${typeof SUPA !== "undefined" && SUPA && SUPA.on ? `<div class="row" style="gap:8px"><button class="primary" style="flex:1" data-a="addperson">Add a person</button><button class="ghost" style="flex:1" data-a="suout">Sign out</button></div><div class="tiny muted">Signed in as ${esc(SUPA.email || "")}. Your game is saved before you sign out.</div>` : `<button class="primary wide" data-a="addperson">Add a person</button>`}${G.coach && n > 1 ? `<button class="ghost wide slim" data-a="coach">See everyone on one screen</button>` : ""}` +
    (w.more
      ? `<div class="tile stack" style="gap:8px"><div class="small">These people are:</div><div class="seg"><button class="${G.coach ? "" : "on"}" data-a="pmode" data-v="house">My household</button><button class="${G.coach ? "on" : ""}" data-a="pmode" data-v="coach">People I coach</button></div><div class="tiny muted">${G.coach ? "Each person's money stays separate. Nothing is added together." : "Money can be looked at together on Home once there are two or more."}</div>${G.coach ? "" : q("Who you combine money with", chipsRow("share", ["No one", "A partner", "More than one partner", "Family"], G.house.share, "gh"))}${n > 1 ? `<div class="small">Remove someone:</div><div class="chips">${G.chars.map((c, i) => `<button class="ghost slim" data-a="prm" data-v="${i}">Remove ${esc(c.name)}</button>`).join("")}</div>` : ""}<div class="tiny muted">Everyone is saved to your account, so they show up on your other devices too.</div></div><button class="ghost wide slim" data-a="profmore">Fewer options</button>`
      : `<button class="ghost wide slim" data-a="profmore">More options</button>`)
  );
}
function profRow(c, i) {
  const p = profInfo(c),
    on = i === G.active;
  return `<button class="rowbtn prow ${on ? "on" : ""}" data-a="switch" data-v="${i}"><span class="ava2">${esc(
    String(c.name || "?")
      .trim()
      .charAt(0)
      .toUpperCase()
  )}</span><span class="pn"><b>${esc(c.name)}</b><div class="tiny muted">${p.fog != null ? p.fog + "% clear · " : ""}${p.placed ? "Next: " + esc(p.step || "nothing waiting") : "Not started yet"}</div></span><span class="pill ${on ? "okp" : ""}">${on ? "Here now" : "Open ›"}</span></button>`;
}
function peopleSheet() {
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
  profmore: () => {
    if (W) {
      W.more = !W.more;
      drawSheet();
    }
  },
  prm: t => {
    W.rm = +t.dataset.v;
    drawSheet();
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
