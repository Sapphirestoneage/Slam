/* ============================================================================
   SLAM the Game: features/lockset.js
   PURPOSE     The settings sheet of App lock and passkeys (run Not built, groups 1 to 5, Part 10b): set a PIN
               by taps (twice, to be sure), add this device's own lock where the browser has it, pick when it
               locks again, lock now, or turn it off. The passkey card says plainly that passkeys are off
               until Eli switches them on.
   INPUT       account/lock.js (lkRead and the rest). The open sheet (W.kind): lock.
   OUTPUT      Functions: lsetSheet. Actions (ACT): lock, lkpin, lkbio, lkafter, lkoff, lknow, lkpk. Menu: "App
               lock".
   DEPENDS ON  core/report.js, account/lock.js, screens/ui.js (head, sheet, drawSheet), screens/dash.js.
   RULES       The PIN is only kept as a salted SHA-256 (lock.js). Nothing of the lock goes into the saved game.
   ========================================================================= */
function lsetSheet() {
  const w = W,
    o = lkRead(),
    st = (w.pin = w.pin || { a: "", b: "", step: o.pin ? "" : "a" }),
    typing = st.step === "a" || st.step === "b",
    cur = typing ? st[st.step] : "",
    pad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "ok"];
  const pinCard = dkCard(
    "A PIN",
    typing
      ? `<div class="small">${st.step === "a" ? "Tap a PIN of 4 to 6 digits." : "Tap the same PIN again."}</div><div class="lkdots" aria-live="polite">${"●".repeat(cur.length)}${"○".repeat(Math.max(0, 4 - cur.length))}</div><div class="lkpad">${pad.map(k => `<button class="lkkey" data-a="lkpin" data-v="${k}" ${k === "ok" && cur.length < 4 ? 'disabled aria-label="OK, after 4 digits"' : ""}>${k === "del" ? "⌫" : k === "ok" ? "OK" : k}</button>`).join("")}</div>${w.msg ? `<div class="tiny muted">${esc(w.msg)}</div>` : ""}`
      : `<div class="small" data-fid="lk:on">${o.pin ? "A PIN is set." : "No PIN yet."}</div><button class="ghost wide slim" data-a="lkpin" data-v="new">${o.pin ? "Change the PIN" : "Set a PIN"}</button>`,
    { cap: "Taps only. The PIN itself is never kept, only a scrambled copy of it." }
  );
  const bioCard = dkCard(
    "This device's own lock",
    w.bio === false
      ? `<div class="small">This browser has no fingerprint, face or device PIN check for web pages.</div>`
      : o.bio
        ? `<div class="small">On: fingerprint, face or the device PIN unlocks SLAM here.</div><button class="ghost wide slim" data-a="lkbio" data-v="off">Stop using it</button>`
        : `<button class="ghost wide" data-a="lkbio" data-v="on">Use fingerprint, face or the device PIN</button><div class="tiny muted">Where the browser has it. A PIN is set first, so you always have a way in.</div>`
  );
  const when = dkCard(
    "When it locks",
    `<div class="chips">${[
      [0, "Each time it opens"],
      [1, "After 1 minute away"],
      [5, "After 5 minutes"],
      [15, "After 15 minutes"],
    ]
      .map(
        x =>
          `<button class="chip ${(o.after || 0) === x[0] ? "on" : ""}" data-a="lkafter" data-v="${x[0]}">${x[1]}</button>`
      )
      .join("")}</div>` +
      (o.on
        ? `<button class="ghost wide" data-a="lknow">Lock now</button><button class="ghost wide slim" data-a="lkoff">Turn the lock off</button>`
        : "")
  );
  const pk = dkCard(
    "Sign in with a passkey",
    `<button class="ghost wide" data-a="lkpk" ${PASSKEY_READY ? "" : 'disabled aria-describedby="pkwhy"'}>Add a passkey to my account</button><div class="tiny muted" id="pkwhy">${PASSKEY_READY ? "Your fingerprint or face signs you in on this device, in place of the password." : "Coming soon: Eli switches passkeys on in the sign-in service first, so nobody gets locked out while it is tested."}</div>${w.pkmsg ? `<div class="tiny muted">${esc(w.pkmsg)}</div>` : ""}`
  );
  return (
    head("Settings", "App lock") +
    dkCaption(
      "For a shared phone or laptop. It hides the game on this device. It does not scramble what the browser keeps."
    ) +
    dkStatRow([dkTile("Lock", o.on ? "On" : "Off"), dkTile("Ways in", String((o.pin ? 1 : 0) + (o.bio ? 1 : 0)))]) +
    pinCard +
    (o.pin ? bioCard + when : "") +
    pk +
    `<button class="ghost wide slim" data-a="close">Done</button>`
  );
}
Object.assign(ACT, {
  lock: () => {
    W = { kind: "lock" };
    sheet(lsetSheet);
    lkHasBio().then(ok => {
      if (W && W.kind === "lock" && !ok) {
        W.bio = false;
        drawSheet();
      }
    });
  },
  lkpin: t => {
    const w = W,
      k = t.dataset.v;
    if (!w || w.kind !== "lock") return;
    const st = (w.pin = w.pin || { a: "", b: "", step: "a" });
    w.msg = "";
    if (k === "new") {
      w.pin = { a: "", b: "", step: "a" };
      return drawSheet();
    }
    if (st.step !== "a" && st.step !== "b") return;
    if (k === "del") st[st.step] = st[st.step].slice(0, -1);
    else if (k === "ok") {
      if (st[st.step].length < 4) return;
      if (st.step === "a") st.step = "b";
      else if (st.a !== st.b) {
        w.pin = { a: "", b: "", step: "a" };
        w.msg = "The two did not match. Tap a PIN again.";
      } else {
        const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join(
            ""
          ),
          pin = st.a;
        w.pin = { a: "", b: "", step: "" };
        return lkHash(pin, salt).then(hash => {
          lkWrite(Object.assign(lkRead(), { on: true, pin: { salt, hash } }));
          drawSheet();
        });
      }
    } else if (st[st.step].length < 6) st[st.step] += k;
    drawSheet();
  },
  lkbio: t => {
    if (t.dataset.v === "off") {
      const o = lkRead();
      delete o.bio;
      lkWrite(o);
      return drawSheet();
    }
    lkBioMake()
      .then(id => {
        if (id) lkWrite(Object.assign(lkRead(), { bio: { id } }));
        drawSheet();
      })
      .catch(e => {
        report(e, "lockset.js: lkbio");
        if (W) W.msg = "The device did not add its lock. The PIN still works.";
        drawSheet();
      });
  },
  lkafter: t => {
    lkWrite(Object.assign(lkRead(), { after: +t.dataset.v }));
    drawSheet();
  },
  lkoff: () => {
    lkWrite({ on: false, after: 0 });
    if (W) W.pin = null;
    drawSheet();
  },
  lknow: () => {
    closeSheet();
    lkShow();
  },
  lkpk: () => {
    lkPasskeyAdd().then(r => {
      if (W && W.kind === "lock") {
        W.pkmsg = r.ok ? "Added. Next time, sign in with your passkey." : r.why;
        drawSheet();
      }
    });
  },
});
if (typeof MENU !== "undefined")
  MENU.push(["App lock", "lock", "act", "A PIN or this device's lock each time the game opens"]);
