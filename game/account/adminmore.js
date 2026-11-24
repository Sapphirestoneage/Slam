/* ============================================================================
   SLAM the Game: account/adminmore.js
   PURPOSE     Three more sections of the admin page (admin.html): the audit log (who did what to
               whom, the newest first), the health view (sign-ups, accounts with no saved game, failed
               saves), and "Download everything" (one backup file).
   INPUT       The Supabase client of the admin page (sb). The database functions admin_audit_list,
               admin_health and admin_backup (supabase/migrations/20261124170000_roles_audit_coach.sql).
   OUTPUT      Functions: amAction, amAuditRows, amHealthRows, amLoad, amHTML, amClick.
   DEPENDS ON  core/report.js. admin.html gives sb, esc and day, and calls amLoad, amHTML and amClick.
               Only admin.html loads this file.
   RULES       Each section is collapsed until the admin opens it. The database checks is_admin()
               again for each function. Before the database file has run, each section says so.
   ========================================================================= */
const AM = { audit: null, health: null, ready: false, msg: "" };
const AM_ACT = {
  open_game: "Opened the game of",
  view_roster: "Looked at the roster",
  assign_quest: "Assigned a quest to",
  session_note: "Wrote a session note about",
  invite: "Invited",
  export: "Exported the roster",
  reset_password: "Sent a password link to",
  coach_on: "Made a coach of",
  coach_off: "Took the coach role from",
  pack_on: "Turned on an add-on for",
  pack_off: "Turned off an add-on for",
  account_confirm: "Confirmed the email of",
  account_block: "Blocked",
  account_unblock: "Unblocked",
  account_delete: "Deleted the account of",
  backup: "Downloaded everything",
};
/* An action of the log in plain words. */
function amAction(a) {
  return AM_ACT[a] || String(a || "").replace(/_/g, " ");
}
/* The lines of the log, the newest first: [when, who, what]. */
function amAuditRows(list) {
  return (list || [])
    .slice()
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .map(r => ({
      at: r.at,
      who: (r.actor_email || "someone") + (r.role ? " (" + r.role + ")" : ""),
      what: amAction(r.action) + (r.target_email ? " " + r.target_email : "") + (r.note ? ": " + r.note : ""),
    }));
}
/* The numbers of the health view: [label, value]. */
function amHealthRows(h) {
  if (!h) return [];
  return [
    ["Accounts", h.accounts],
    ["With a confirmed email", h.confirmed],
    ["New in the last 7 days", h.signups7],
    ["New in the last 30 days", h.signups30],
    ["With a saved game", h.with_game],
    ["With no saved game yet", h.no_game],
    ["Failed saves in the last 7 days", h.fails7],
  ];
}
async function amLoad(sb) {
  try {
    const a = await sb.rpc("admin_audit_list", { n: 200 }),
      h = await sb.rpc("admin_health");
    AM.ready = !a.error && !h.error;
    AM.audit = a.error ? null : a.data || [];
    AM.health = h.error ? null : h.data;
  } catch (e) {
    report(e, "adminmore.js: amLoad");
    AM.ready = false;
  }
}
function amHTML() {
  const wait = `<p class="muted">This part waits for the database file of 2026-11-24 (supabase/migrations). Run it one time in the Supabase SQL Editor.</p>`,
    A = amAuditRows(AM.audit),
    H = AM.health;
  return (
    `<details class="card" style="padding:0 14px"><summary>Health${H && H.fails7 ? ` <span class="pill" style="border-color:#ffb648;color:#ffb648">${H.fails7} failed ${H.fails7 === 1 ? "save" : "saves"}</span>` : ""}</summary><div class="tools">${
      H
        ? `<div class="nums">${amHealthRows(H)
            .map(r => `<span>${esc(r[0])} <b>${esc(r[1])}</b></span>`)
            .join(
              ""
            )}</div><p class="muted">Last save by anyone: ${H.last_save ? new Date(H.last_save).toLocaleString() : "never"}.</p>${
            (H.fails || []).length
              ? `<p><b>Failed saves, the newest first</b></p><ul>${H.fails.map(f => `<li><span class="muted">${new Date(f.at).toLocaleString()}</span> ${esc(f.email || "someone")}: ${esc(f.msg)}</li>`).join("")}</ul>`
              : `<p class="muted">No failed saves on record.</p>`
          }`
        : wait
    }</div></details>` +
    `<details class="card" style="padding:0 14px"><summary>Audit log${AM.audit ? ` <span class="pill">${A.length}</span>` : ""}</summary><div class="tools">${
      AM.audit
        ? A.length
          ? `<p class="muted">Each admin action, and each time a coach or the admin opened the game of another person. The newest first.</p><ul>${A.map(r => `<li><span class="muted">${new Date(r.at).toLocaleString()}</span> ${esc(r.who)}: ${esc(r.what)}</li>`).join("")}</ul>`
          : `<p class="muted">Nothing in the log yet.</p>`
        : wait
    }</div></details>` +
    `<details class="card" style="padding:0 14px"><summary>Backup</summary><div class="tools"><button class="wide" data-a="ambackup">Download everything</button><p class="muted">One file with each account, each saved game, the coach notes, the card library and the audit log. Keep it somewhere private: it holds real money numbers.</p>${AM.msg ? `<p class="ok">${esc(AM.msg)}</p>` : ""}</div></details>`
  );
}
async function amClick(t, sb) {
  if (t.dataset.a !== "ambackup") return;
  const r = await sb.rpc("admin_backup");
  if (r.error || !r.data) {
    AM.msg = "The backup did not come back. It waits for the database file of 2026-11-24.";
    return;
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 1)], { type: "application/json" })),
    a = document.createElement("a");
  a.href = url;
  a.download = "slam-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  AM.msg = "Saved. " + (r.data.accounts || []).length + " accounts and " + (r.data.games || []).length + " game rows.";
}
