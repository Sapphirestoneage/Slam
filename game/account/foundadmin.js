/* ============================================================================
   SLAM the Game: account/foundadmin.js
   PURPOSE     One more section of the admin page (admin.html): "Founding Testers: N of 50" (the live
               count of the first 50 accounts that finished setup) and "Who joined through whom" (each
               person who arrived with a share link, the newest first).
   INPUT       The Supabase client of the admin page (sb). The database function admin_founding
               (supabase/migrations/20261125190000_founding_and_referrals.sql).
   OUTPUT      Functions: faJoinRows, faFounderRows, faLoad, faHTML.
   DEPENDS ON  core/report.js. admin.html gives sb and esc, and calls faLoad and faHTML.
               Only admin.html loads this file.
   RULES       The section is collapsed until the admin opens it. The database checks is_admin() again.
               Before the database file has run, the section says so. The page shows no share reward,
               because there is none.
   ========================================================================= */
const FA = { data: null };
/* Who joined through whom, the newest first: [when, who, through]. */
function faJoinRows(d) {
  return ((d && d.joined) || [])
    .slice()
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .map(r => ({
      at: r.at,
      who: r.email || "someone",
      through: r.through ? r.through : "the code " + (r.code || "") + " (no account has this code yet)",
    }));
}
/* The Founding Testers, by number: [number, who, when]. */
function faFounderRows(d) {
  return ((d && d.founders) || [])
    .slice()
    .sort((a, b) => a.no - b.no)
    .map(r => ({ no: r.no, who: r.email || "someone", at: r.at }));
}
async function faLoad(sb) {
  try {
    const r = await sb.rpc("admin_founding");
    FA.data = r.error || !r.data ? null : r.data;
  } catch (e) {
    report(e, "foundadmin.js: faLoad");
    FA.data = null;
  }
}
function faHTML() {
  const d = FA.data,
    when = t => (t ? new Date(t).toLocaleDateString() : "");
  if (!d)
    return `<details class="card" style="padding:0 14px"><summary>Founding Testers</summary><div class="tools"><p class="muted">This part waits for the database file of 2026-11-25 (supabase/migrations/20261125190000_founding_and_referrals.sql). Run it one time in the Supabase SQL Editor. Until then the game shows no mark and no card, and it keeps the code each person arrived with on their device.</p></div></details>`;
  const F = faFounderRows(d),
    J = faJoinRows(d),
    lim = d.limit || 50;
  return `<details class="card" style="padding:0 14px"><summary>Founding Testers: ${esc(d.count)} of ${esc(lim)}</summary><div class="tools"><p class="muted">The first ${esc(lim)} accounts that finish setup get the mark. ${esc(d.finished)} ${d.finished === 1 ? "account has" : "accounts have"} finished setup so far. The admin account takes no number.</p>${
    F.length
      ? `<ul>${F.map(r => `<li><b>${esc(r.no)}</b> ${esc(r.who)} <span class="muted">${esc(when(r.at))}</span></li>`).join("")}</ul>`
      : `<p class="muted">No Founding Tester yet.</p>`
  }<p><b>Who joined through whom, the newest first</b></p>${
    J.length
      ? `<ul>${J.map(r => `<li><span class="muted">${esc(when(r.at))}</span> ${esc(r.who)} joined through ${esc(r.through)}</li>`).join("")}</ul>`
      : `<p class="muted">Nobody has joined through a share link yet.</p>`
  }<p class="muted">There are no rewards for sharing yet. This list is only for you.</p></div></details>`;
}
