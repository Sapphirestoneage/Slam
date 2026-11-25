/* ============================================================================
   SLAM the Game: account/roles.js
   PURPOSE     Roles and hats. One login has up to three hats: Player (the game), Coach (coach.html)
               and Admin (admin.html). The control "switch hat" shows only the hats that the account
               has. This file also writes the lines of the audit log and reports a failed save. The
               game, the coach page and the admin page all load it.
   INPUT       SUPA (account/supa.js): on, sb, uid. The database functions my_roles, is_admin,
               is_coach, audit_write and the table save_failures
               (supabase/migrations/20261124170000_roles_audit_coach.sql).
   OUTPUT      Functions: roRoles, roHatsHTML, roAudit, roSaveFail, roLoad, menuSheetHats, roCan, roMenuOk,
               roGuardTo. Actions
               (ACT), in the game only: hat. State: ROLES.
   DEPENDS ON  core/report.js, account/supa.js.
   RULES       The database decides who is a coach or the admin. This file only decides what to show.
               A page for a role that the account does not have shows nothing and can change nothing.
               When the database functions are not there yet, each call fails quietly and the game
               works as before.
   ========================================================================= */
const ROLES = { admin: false, coach: false, known: false };
const RO_HATS = [
  ["player", "Player", "./"],
  ["coach", "Coach", "./coach.html"],
  ["admin", "Admin", "./admin.html"],
];
/* The menu rows that belong to a role. A player never sees them (UX pass, phase 2). */
const RO_ONLY = { session: "coach", built: "admin", testkit: "admin" };
/* Can an account with roles r use a part for the role "need"? The admin has each role. */
function roCan(need, r) {
  r = r || ROLES;
  if (!need || need === "player") return true;
  if (need === "coach") return !!(r.coach || r.admin);
  return need === "admin" ? !!r.admin : false;
}
/* Can the account see the menu row with this action? */
function roMenuOk(act, r) {
  return roCan(RO_ONLY[act], r);
}
/* The route guard of the coach page and the admin page: null when the account has the role, else the
   address of Home. The page goes there at once. */
function roGuardTo(need, r) {
  return roCan(need, r) ? null : "./";
}
/* The hats of an account: Player always, Coach and Admin when the account has the role. */
function roRoles(r) {
  r = r || ROLES;
  return RO_HATS.filter(h => h[0] === "player" || r[h[0]]);
}
/* The control "switch hat". With one hat only, there is nothing to switch, and it shows nothing.
   cur is the hat of this page. link is true on the coach page and the admin page (plain links). */
function roHatsHTML(cur, r, link) {
  const hats = roRoles(r);
  if (hats.length < 2) return "";
  return `<div class="hats" role="group" aria-label="Switch hat"><span class="tiny muted hatlbl">Switch hat</span><span class="seg">${hats
    .map(h =>
      link
        ? `<a class="hat ${h[0] === cur ? "on" : ""}" href="${h[2]}" ${h[0] === cur ? 'aria-current="page"' : ""}>${h[1]}</a>`
        : `<button class="${h[0] === cur ? "on" : ""}" data-a="hat" data-v="${h[0]}" ${h[0] === cur ? 'aria-current="page"' : ""}>${h[1]}</button>`
    )
    .join("")}</span></div>`;
}
/* Ask the database which roles this account has. sb is a Supabase client. */
async function roLoad(sb) {
  try {
    let r = await sb.rpc("my_roles");
    if (r.error || !r.data) {
      /* before the migration: the two older functions */
      const a = await sb.rpc("is_admin"),
        c = await sb.rpc("is_coach");
      r = { data: { admin: a.data === true, coach: c.data === true } };
    }
    ROLES.admin = !!r.data.admin;
    ROLES.coach = !!r.data.coach;
    ROLES.known = true;
  } catch (e) {
    report(e, "roles.js: roLoad");
  }
  return ROLES;
}
/* One line in the audit log. It never stops the action that called it. */
async function roAudit(sb, act, target, note) {
  try {
    const r = await sb.rpc("audit_write", { act, tgt: target || null, nt: note || null });
    return !r.error;
  } catch (e) {
    report(e, "roles.js: roAudit");
    return false;
  }
}
/* Tell the admin that a save to the account failed. One line for each kind of failure in a visit. */
const RO_FAIL = {};
function roSaveFail(e) {
  try {
    const msg = String((e && (e.message || e.code)) || e || "unknown").slice(0, 200);
    if (RO_FAIL[msg] || typeof SUPA === "undefined" || !SUPA.on || !SUPA.sb || !SUPA.uid) return;
    RO_FAIL[msg] = 1;
    SUPA.sb
      .from("save_failures")
      .insert({ user_id: SUPA.me || SUPA.uid, msg })
      .then(
        () => {},
        () => {}
      );
  } catch (x) {
    report(x, "roles.js: roSaveFail");
  }
}
/* Part of menuSheet() in planner.js. The control "switch hat" at the top of the menu, for a coach or the admin. */
function menuSheetHats(h) {
  const hats = roHatsHTML("player", ROLES, false);
  if (!hats) return h;
  const i = h.indexOf('<div class="stack">');
  return i >= 0 ? h.slice(0, i) + hats + h.slice(i) : hats + h;
}
/* In the game: load the roles after sign-in, and wire the action. */
(function () {
  if (typeof window === "undefined" || typeof SUPA === "undefined" || !SUPA.on || !SUPA.ready) return;
  SUPA.ready.then(() => {
    if (SUPA.uid) roLoad(SUPA.sb);
  });
})();
if (typeof ACT !== "undefined")
  Object.assign(ACT, {
    hat: t => {
      const h = RO_HATS.find(x => x[0] === t.dataset.v);
      if (h && h[0] !== "player" && typeof location !== "undefined") location.href = h[2];
    },
  });
