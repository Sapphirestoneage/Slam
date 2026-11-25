/* ============================================================================
   SLAM the Game: features/rings.js
   PURPOSE     The Rings theme (run "Money sins", Part 3): dark comedy in a cheeky hell with seven
               rings, one original ruler for each money sin. The look and the voice are one theme in
               THEMES (screens/ui.js); this file adds what only the Rings say: the ruler of the
               player's main pull is the boss of the boss fights, check-ins read as "the fine print",
               defenses as "wards", Recalculating as "the escape route", and virtues climb the
               player out ring by ring. It roasts the sin, never the player.
   INPUT       The profile (c.x.qz.sins, through features/sins.js), the theme picked (VC()).
   OUTPUT      rgOn, RG_VOICE (the add-on hook), rgVoice, rgT, rgRings, rgBoss, rgBossPart, rgReadPart,
               rgTryRow. Parts of functions in other files: rgBossPart (bossSheet in games2.js),
               rgReadPart and rgTryRow (snSheet in sins.js), rgT (snCheckSheet and sngFix in sins.js,
               rcgCard and rcgRow in recalc.js). Actions (ACT): rgleave.
   DEPENDS ON  core/report.js, core/sins.js (snRings, snBoss, snRingWords: the words are in the sins
               skin, data/quizskins.js), screens/ui.js (VC, THEMES, esc), screens/dash.js (the kit),
               features/sins.js (sngRead, sngSeen, sngHist), account/gate.js (adOn, adThemeOff).
   RULES       No money number is made here, and none is changed. The ruler shows only where the read
               may show (sngSeen: the owner, or a coach once the player turned "Show my read" on).
               An add-on may bring a second voice (RG_VOICE); its words are never in this repository.
   ========================================================================= */
/* Is the Rings voice on? The theme is off until a player picks it in the theme picker. */
function rgOn() {
  try {
    return typeof VC === "function" && VC() === "rings";
  } catch (e) {
    report(e, "rings.js: rgOn");
    return false;
  }
}
/* The add-on hook: an add-on pushes { pk, words: { key: text }, rulers: { sinId: { roast, taunt, beat } } }.
   It is used only while that add-on is on for the person at the screen (adOn). With none, the default voice. */
var RG_VOICE = [];
function rgVoice() {
  try {
    if (typeof adOn !== "function") return null;
    return RG_VOICE.find(v => v && v.pk && adOn(v.pk)) || null;
  } catch (e) {
    report(e, "rings.js: rgVoice");
    return null;
  }
}
/* A themed word with the plain word next to it, as text. With the Rings off: the plain word only. */
function rgT(key, plain) {
  if (!rgOn()) return plain;
  const w = snRingWords(qzSkin("sins"), rgVoice())[key];
  return w ? w + " (" + plain + ")" : plain;
}
/* The rings of a profile, from its read and its history of takes. */
function rgRings(c) {
  const R = sngRead(c),
    sn = Object.assign({}, R.st.sn || {}, { hist: sngHist(c) });
  return snRings(R.def, R.read, sn, rgVoice());
}
function rgBoss(c) {
  const R = sngRead(c);
  return snBoss(R.def, R.read, rgVoice());
}
/* Part of bossSheet() in games2.js. With the Rings on, the ruler of the main pull stands over the bosses. */
function rgBossPart(c) {
  try {
    if (!rgOn() || !sngSeen(c)) return "";
    const B = rgBoss(c);
    if (!B) return "";
    const K = rgRings(c);
    return dkCard(
      "Your ruler (the boss of your main pull)",
      `<h2 style="margin:4px 0" data-fid="rg:boss">${esc(B.name)}</h2><div class="tiny muted">Ruler of ${esc(B.ring)}. Main pull: ${esc(B.sinName)}.</div>` +
        `<div class="small">${esc(B.roast)}</div><div class="small muted">It says: "${esc(B.taunt)}"</div>` +
        (B.hold != null
          ? bar(B.hold, "hp") +
            `<div class="tiny muted">${esc(B.holdLine)} The bar is its hit points, like a debt's balance.</div>`
          : "") +
        `<div class="small">${esc(B.line)} ${K ? esc(K.climbed + " of " + K.of + " rings climbed.") : ""}</div>` +
        (B.ward
          ? `<div class="tile small"><b>${esc(rgT("ward", "Test the fix"))}: ${esc(B.ward)}.</b> ${esc(B.beat)}</div>`
          : "") +
        `<button class="ghost wide slim" data-a="sins">See the climb on your money read</button>`,
      { right: dkPill(B.level + " · " + B.word) }
    );
  } catch (e) {
    report(e, "rings.js: rgBossPart");
    return "";
  }
}
/* Part of snSheet() in sins.js. With the Rings on: the climb out, ring by ring, with the ruler of each ring. */
function rgReadPart(c, mine) {
  if (!rgOn()) return "";
  const K = rgRings(c);
  if (!K) return "";
  const W2 = snRingWords(qzSkin("sins"), rgVoice()),
    ladder = K.rings
      .slice()
      .reverse()
      .map(r => {
        const here = K.on && K.on.n === r.n,
          past = K.rings.indexOf(r) < K.climbed;
        return `<div class="row between" style="gap:8px"><span class="small">${here ? "<b>" : ""}Ring ${r.n}: ${esc(r.ruler.ring)}${here ? " (you are here)</b>" : ""}<div class="tiny muted">${esc(r.ruler.name)}, ruler of ${esc(r.ruler.sinName)}</div></span>${past ? dkPill("Climbed") : ""}</div>`;
      })
      .join("");
  return dkCard(
    rgT("climb", "Your progress"),
    `<div class="small">${esc(W2.intro)}</div><div class="small"><b>${esc(K.head)}</b></div><div class="small">${esc(K.now)}</div>` +
      dkProgress(Math.round((K.climbed / K.of) * 100), { text: K.climbed + " of " + K.of + " rings climbed" }) +
      (K.steps.length
        ? `<div class="stack" style="gap:4px">${K.steps.map(s => `<div class="small">${esc(s.line)}</div>`).join("")}</div>`
        : "") +
      `<details class="math"><summary>The seven rings, top to bottom</summary><div class="inner stack" style="gap:6px">${ladder}<div class="tiny muted">Your main pull is the bottom ring. The order above it is your own read: the quieter a pull, the closer its ring is to the way out.</div></div></details>` +
      `<button class="ghost wide" data-a="boss">Face your ruler in the boss fights</button>` +
      (mine
        ? `<button class="ghost wide slim" data-a="rgleave">Leave the Rings (back to the plain look)</button>`
        : ""),
    { right: dkPill(K.level + " · " + K.word) }
  );
}
/* Part of snSheet() in sins.js. With the Rings off: one slim row that says the theme exists. Not shown when
   the theme is off by default for this person (account/gate.js, adThemeOff). */
function rgTryRow(mine) {
  if (rgOn() || !mine || (typeof adThemeOff === "function" && adThemeOff("rings"))) return "";
  return `<button class="rowbtn" data-a="themes"><span style="min-width:0"><b>See your read as the Rings</b><div class="tiny muted">A theme: seven rings, a ruler for each sin, and you escaping. Pick it under Theme.</div></span><span class="caret">›</span></button>`;
}
Object.assign(ACT, {
  rgleave: () => {
    G.look = "sapphire";
    G.voice = "sapphire";
    save();
    render();
    if (typeof ACT.sins === "function") ACT.sins();
  },
});
