/* ============================================================================
   SLAM the Game: features/home.js
   PURPOSE     Put the game on the home screen of the phone or the laptop (website only). When the
               device can install the game with one tap, the button does that. When it cannot (iPhone,
               some browsers), the sheet shows the 2 or 3 taps for the player. After the player opens
               the game from the home screen, the game does not mention this again.
   INPUT       The game: G.demo, G.hsDone, G.hsLater. The open sheet (W.kind): hs. The taps of the
               player (the actions in OUTPUT).
   OUTPUT      4 functions. Actions (ACT): hsopen, hsgo, hslater. Menu: "Put SLAM on my home screen".
   DEPENDS ON  core/report.js, account/supa.js, screens/ui.js, screens/planner.js, features/house.js.
   ========================================================================= */
const HS = { evt: null };
function hsInstalled() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  } catch (e) {
    return false;
  }
}
function hsDevice() {
  const u = navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(u) ? "ios" : /Android/i.test(u) ? "android" : "computer";
}
if (typeof SUPA !== "undefined" && SUPA.on) {
  try {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("sw.js").catch(e => report(e, "home.js: page load (1)"));
  } catch (e) {
    report(e, "home.js: page load (2)");
  }
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    HS.evt = e;
  });
  window.addEventListener("appinstalled", () => {
    HS.evt = null;
    G.hsDone = true;
    try {
      save();
    } catch (e) {
      report(e, "home.js: on appinstalled");
    }
  });
  window.addEventListener("load", () => {
    try {
      if (hsInstalled()) return;
      MENU.splice(Math.min(3, MENU.length), 0, [
        "Put SLAM on my home screen",
        "hsopen",
        "act",
        "Opens like an app, already signed in",
      ]);
      Object.assign(ACT, {
        hsopen: () => {
          W = { kind: "hs", msg: "" };
          sheet(hsInstallSheet);
        },
        hsgo: async () => {
          if (!HS.evt) {
            W.manual = true;
            drawSheet();
            return;
          }
          HS.evt.prompt();
          try {
            const r = await HS.evt.userChoice;
            if (r && r.outcome === "accepted") {
              G.hsDone = true;
              save();
              W.msg = "Done. Look for the SLAM icon on your home screen.";
              HS.evt = null;
            }
          } catch (e) {
            report(e, "home.js: hsgo");
          }
          drawSheet();
        },
        hslater: () => {
          G.hsLater = Date.now();
          try {
            save();
          } catch (e) {
            report(e, "home.js: hslater");
          }
          closeSheet();
        },
      });
      /* one gentle offer, a few seconds after signing in, on phones only, never twice in a week */
      if (hsDevice() !== "computer" && !G.hsDone && !(G.hsLater && Date.now() - G.hsLater < 7 * 864e5))
        setTimeout(() => {
          if (!SH && !hsInstalled() && !G.demo) {
            W = { kind: "hs", msg: "", offer: true };
            sheet(hsInstallSheet);
          }
        }, 6000);
    } catch (e) {
      report(e, "home.js: on load");
    }
  });
}
function hsSteps() {
  const d = hsDevice();
  if (d === "ios")
    return [
      ["Tap the Share button", "The square with an arrow pointing up, at the bottom of Safari."],
      ["Tap Add to Home Screen", "Scroll down the list a little if you don't see it."],
      ["Tap Add", "Top right corner."],
    ];
  if (d === "android")
    return [
      ["Tap the three dots ⋮", "Top right corner of Chrome."],
      ["Tap Add to Home screen", "Sometimes it says Install app."],
      ["Tap Add or Install", ""],
    ];
  return [
    ["Look at the right end of the address bar", "There's a small screen icon with an arrow, called Install."],
    [
      "Click it, then click Install",
      "No icon? Click the three dots ⋮, then Cast, save and share, then Install page as app.",
    ],
  ];
}
/* The sheet "Put SLAM on your home screen". Before 2026-11-23 this function had the name hsSheet, the same
   name as the sheet "Our household" in house.js (KNOWN-WEAK.md, A8, repaired). */
function hsInstallSheet() {
  const steps = hsSteps(),
    one = !!HS.evt && !W.manual;
  return (
    head(W.offer ? "Quick tip" : "Home screen", "Put SLAM on your home screen") +
    `<div class="small muted">It opens like an app, full screen, and you stay signed in. No app store needed.</div>` +
    (W.msg
      ? `<div class="small" style="color:var(--good)">${W.msg}</div>`
      : one
        ? `<button class="primary wide" data-a="hsgo">Add it now</button>`
        : `<div class="stack">${steps.map((s, i) => `<div class="tile small row" style="gap:10px;align-items:flex-start"><span class="pill">${i + 1}</span><span><b>${s[0]}</b>${s[1] ? `<div class="tiny muted">${s[1]}</div>` : ""}</span></div>`).join("")}</div>`) +
    (W.offer && !W.msg ? `<button class="ghost wide slim" data-a="hslater">Not now</button>` : "") +
    `<div class="tiny muted">You can always find this later in Menu.</div>`
  );
}
