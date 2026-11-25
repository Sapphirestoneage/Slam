/* ============================================================================
   SLAM the Game: account/adminmore.js
   PURPOSE     Four more sections of the admin page (admin.html): the Reports inbox (each bug, idea
               and confusing screen that a person reported, the newest first), the audit log (who did
               what to whom, the newest first), the health view (sign-ups, accounts with no saved game,
               failed saves), and "Download everything" (one backup file).
   INPUT       The Supabase client of the admin page (sb). The database functions admin_audit_list,
               admin_health and admin_backup (supabase/migrations/20261124170000_roles_audit_coach.sql).
               The table reports (supabase/migrations/20261125190000_reports.sql).
   OUTPUT      Functions: amAction, amAuditRows, amHealthRows, amLoad, amHTML, amClick, amReportsHTML,
               amReportWho, amReportClick.
   DEPENDS ON  core/report.js, core/reportcore.js (the rows of the inbox). admin.html gives sb, esc, day
               and S (the accounts), and calls amLoad, amHTML and amClick.
               Only admin.html loads this file.
   RULES       Each section is collapsed until the admin opens it. The database checks is_admin()
               again for each function. Before the database file has run, each section says so.
   ========================================================================= */
const AM = {
  audit: null,
  health: null,
  ready: false,
  msg: "",
  reports: null,
  rpType: "all",
  rpAll: false,
  rpOpen: false,
  rpMsg: "",
  shots: {},
};
const AM_RP_COLS = "id,made_at,owner,type,note,app,screen,taps,width,device,browser,version,has_shot,status,fixed_at";
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
    const r = await sb.from("reports").select(AM_RP_COLS).order("made_at", { ascending: false }).limit(300);
    AM.reports = r.error ? null : r.data || [];
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
    amReportsHTML() +
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
/* Who made a report: the email of the account, from the list of the admin page. */
function amReportWho(r, users) {
  if (!r.owner) return "A visitor, not signed in";
  const u = (users || []).find(x => x.id === r.owner);
  return u ? u.email : "An account that is gone";
}
/* The section "Reports inbox": the newest first, a filter by type, open the game at that screen, Mark Fixed. */
function amReportsHTML() {
  const users = typeof S !== "undefined" && S.data && S.data.users ? S.data.users : [],
    wait = `<p class="muted">This part waits for the database file of 2026-11-25 (supabase/migrations/${RP_FILE}). Run it one time in the Supabase SQL Editor. Until then, each report stays on the device of the person who made it, and sends itself after.</p>`;
  if (!AM.reports)
    return `<details class="card" style="padding:0 14px"><summary>Reports inbox</summary><div class="tools">${wait}</div></details>`;
  const c = rpCounts(AM.reports),
    rows = rpInbox(AM.reports, AM.rpType, !AM.rpAll),
    f = (k, n) =>
      `<button class="${AM.rpType === k ? "on" : ""}" data-a="amrpf" data-v="${k}" aria-pressed="${AM.rpType === k}">${n} ${c[k]}</button>`;
  return `<details class="card" style="padding:0 14px"${AM.rpOpen ? " open" : ""}><summary>Reports inbox${c.open ? ` <span class="pill" style="border-color:#ffb648;color:#ffb648">${c.open} open</span>` : ` <span class="pill">${c.all}</span>`}</summary><div class="tools">
  <p class="muted">Each report a person sent with the Report button, the newest first. A report holds the screen, the last 3 taps, the device and the app version. It holds no money numbers.</p>
  <div class="seg" style="flex-wrap:wrap" role="group" aria-label="Filter by type">${f("all", "All")}${f("bug", "Bug")}${f("idea", "Idea")}${f("confusing", "Confusing")}</div>
  <button class="wide" data-a="amrpall">${AM.rpAll ? "Hide the fixed ones" : "Show the fixed ones too"}</button>
  ${AM.rpMsg ? `<p class="ok">${esc(AM.rpMsg)}</p>` : ""}
  ${
    rows.length
      ? rows
          .map(r => {
            const href = rpOpenHref(r),
              shot = AM.shots[r.id];
            return `<div class="who" data-rp="${esc(r.id)}"><div class="row" style="margin-top:0"><b>${esc(rpTypeLabel(r.type))}</b><span class="pill">${r.status === "fixed" ? "Fixed" : "Open"}</span><span class="muted">${new Date(r.made_at).toLocaleString()}</span></div>
            <p>${esc(amReportWho(r, users))}, on <b>${esc(r.screen || "a screen")}</b> (${r.app === "web" ? "the web app" : "the game"})</p>
            ${r.note ? `<p style="white-space:pre-wrap">${esc(r.note)}</p>` : `<p class="muted">No note.</p>`}
            <p class="muted">Last taps: ${esc((r.taps || []).join(", ") || "none")}. ${esc(r.device || "Device not known")}, ${esc(r.width || "?")} wide, ${esc(r.browser || "browser not known")}. Version ${esc(r.version || "not known")}.</p>
            ${shot ? `<img src="${esc(shot)}" alt="The picture sent with this report" style="max-width:100%;border:1px solid var(--line);border-radius:8px">` : ""}
            <div class="row">${r.has_shot && !shot ? `<button data-a="amrpshot" data-id="${esc(r.id)}">Show the picture</button>` : ""}${
              href && r.app !== "web"
                ? `<button data-a="amrpopen" data-id="${esc(r.id)}">Open their game at this screen</button>`
                : href
                  ? `<a class="btn" href="${esc(href)}">Open that page</a>`
                  : ""
            }<button data-a="amrpfix" data-id="${esc(r.id)}" data-v="${r.status === "fixed" ? "open" : "fixed"}">${r.status === "fixed" ? "Mark open again" : "Mark Fixed"}</button></div>
            ${r.status !== "fixed" && r.owner ? `<p class="muted">Mark Fixed shows them one note in their game: "${esc(RP_SAID.fixed)}"</p>` : ""}</div>`;
          })
          .join("")
      : `<p class="muted">${c.all ? "Nothing here with this filter." : "No reports yet."}</p>`
  }</div></details>`;
}
async function amReportClick(t, sb) {
  const a = t.dataset.a,
    r = (AM.reports || []).find(x => x.id === t.dataset.id);
  AM.rpOpen = true;
  AM.rpMsg = "";
  if (a === "amrpf") AM.rpType = t.dataset.v;
  else if (a === "amrpall") AM.rpAll = !AM.rpAll;
  else if (a === "amrpshot" && r) {
    const q = await sb.from("reports").select("shot").eq("id", r.id).limit(1);
    if (!q.error && q.data && q.data[0] && rpShotOk(q.data[0].shot)) AM.shots[r.id] = q.data[0].shot;
    else AM.rpMsg = "The picture did not come back. Try again.";
  } else if (a === "amrpfix" && r) {
    const fixed = t.dataset.v === "fixed",
      q = await sb
        .from("reports")
        .update({ status: fixed ? "fixed" : "open", fixed_at: fixed ? new Date().toISOString() : null })
        .eq("id", r.id);
    if (q.error) AM.rpMsg = "That did not save. Try again.";
    else {
      r.status = fixed ? "fixed" : "open";
      AM.rpMsg = fixed
        ? r.owner
          ? "Marked Fixed. They see one note the next time they open their game."
          : "Marked Fixed. This one came with no account, so there is nobody to tell."
        : "Open again.";
    }
  } else if (a === "amrpopen" && r && r.owner) {
    const u = typeof S !== "undefined" && S.data && S.data.users ? S.data.users.find(x => x.id === r.owner) : null;
    try {
      sessionStorage.setItem("su_as", r.owner);
      sessionStorage.setItem("su_as_n", u ? u.email : "");
      sessionStorage.setItem("rp_at", r.screen || "");
    } catch (e) {
      report(e, "adminmore.js: amReportClick");
    }
    location.href = rpOpenHref(r);
  }
}
async function amClick(t, sb) {
  if (/^amrp/.test(t.dataset.a)) return amReportClick(t, sb);
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
