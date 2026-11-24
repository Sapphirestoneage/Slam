/* ============================================================================
   SLAM the Game, test: tests/roles-coach-admin.js
   PURPOSE     Examine the hats (Player, Coach, Admin), the coach page, the new sections of the admin
               page, the sign-up line, coach mode on by default, and the database file: each admin
               function checks is_admin(), the two role functions are closed to an account that is not
               signed in, and the audit log cannot be written from the app.
   INPUT       The game scripts, loaded by harness.cjs. account/coachpage.js and account/adminmore.js,
               loaded here, because only coach.html and admin.html load them. The database file as
               text. No database: the test does not sign in.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/roles.js, account/coachpage.js,
               account/adminmore.js, account/supa.js, coach.html, admin.html,
               supabase/migrations/20261124170000_roles_audit_coach.sql.
   ========================================================================= */
{
  const fs = require("fs"),
    vm = require("vm"),
    read = f => fs.readFileSync(GAME_DIR + f, "utf8"),
    near = (a, b) => Math.abs(a - b) < 1e-9;
  ["account/coachpage.js", "account/adminmore.js"].forEach(f => vm.runInThisContext(read(f), { filename: f }));

  /* THE HATS */
  chk(
    "a player with no role has one hat, so there is nothing to switch",
    roRoles({}).length === 1 && roHatsHTML("player", {}, false) === ""
  );
  chk(
    "a coach sees Player and Coach",
    roRoles({ coach: true })
      .map(h => h[0])
      .join() === "player,coach"
  );
  chk(
    "the admin sees all three",
    roRoles({ coach: true, admin: true })
      .map(h => h[0])
      .join() === "player,coach,admin"
  );
  const hb = roHatsHTML("player", { coach: true }, false),
    hl = roHatsHTML("coach", { coach: true, admin: true }, true);
  chk(
    "in the game the control is buttons, and the hat of this page is marked",
    hb.includes("Switch hat") &&
      hb.includes('data-a="hat"') &&
      hb.includes('data-v="coach"') &&
      !hb.includes("Admin") &&
      /class="on"[^>]*data-v="player"/.test(hb)
  );
  chk(
    "on a page the control is links to the three pages",
    hl.includes('href="./coach.html"') &&
      hl.includes('href="./admin.html"') &&
      hl.includes('href="./"') &&
      /class="hat on" href="\.\/coach\.html"/.test(hl)
  );
  ROLES.coach = false;
  ROLES.admin = false;
  X("menu");
  chk("the menu of a player has no hat control", !ov().includes("Switch hat"));
  X("close");
  ROLES.coach = true;
  X("menu");
  chk(
    "the menu of a coach has it, above the rows",
    ov().includes("Switch hat") && ov().indexOf("Switch hat") < ov().indexOf("menurow") && typeof ACT.hat === "function"
  );
  X("close");
  ROLES.coach = false;

  /* SIGN-UP AND COACH MODE */
  const supa = read("account/supa.js");
  chk(
    "sign-up has the plain line about the app owner",
    supa.includes("The owner of this app can view accounts for safety and support.")
  );
  chk("coach mode is on by default in the app", SUPA.share === true && /Coach mode is on/.test(supa));
  chk(
    "a coach can open only a game that is shared, and each open writes a line in the log",
    /eq\("share_with_coach", true\)/.test(supa) && supa.includes('rpc("audit_write", { act: "open_game"')
  );
  chk("the note in the client's game says who made the change", supa.includes('e.by === "coach" ? "Your coach"'));

  /* THE DATABASE FILE */
  const sql = fs.readFileSync(GAME_DIR + "../supabase/migrations/20261124170000_roles_audit_coach.sql", "utf8"),
    fns = sql.split(/create or replace function public\./).slice(1),
    body = n => (fns.find(f => f.startsWith(n + "(")) || "").split(/\$\$;?/)[1] || "";
  const admins = fns.map(f => f.split("(")[0]).filter(n => /^admin_/.test(n));
  chk(
    "the file has the admin functions",
    ["admin_set_coach", "admin_set_pack", "admin_account", "admin_audit_list", "admin_health", "admin_backup"].every(
      n => admins.includes(n)
    ),
    admins.join()
  );
  chk(
    "each admin function checks is_admin() before it does anything",
    admins.every(n => /^\s*begin\s+if not is_admin\(\) then raise exception 'admin only'; end if;/.test(body(n))),
    admins
      .filter(n => !/^\s*begin\s+if not is_admin\(\) then raise exception 'admin only'; end if;/.test(body(n)))
      .join()
  );
  chk(
    "each admin action writes a line in the log",
    ["admin_set_coach", "admin_set_pack", "admin_account", "admin_backup"].every(n =>
      /perform audit_row\(/.test(body(n))
    )
  );
  chk(
    "is_admin() and is_coach() are closed to an account that is not signed in",
    /revoke execute on function public\.is_admin\(\) from public, anon;/.test(sql) &&
      /revoke execute on function public\.is_coach\(\) from public, anon;/.test(sql)
  );
  chk(
    "no function of the file is open to anon",
    !/grant execute on function [^;]* to [^;]*anon/.test(sql) &&
      fns.every(f => new RegExp("revoke all on function public\\." + f.split("(")[0] + "\\(").test(sql)),
    fns
      .map(f => f.split("(")[0])
      .filter(n => !new RegExp("revoke all on function public\\." + n + "\\(").test(sql))
      .join()
  );
  chk(
    "coach mode on by default in the database",
    /alter table public\.games alter column share_with_coach set default true;/.test(sql)
  );
  chk(
    "the audit log has who, action, target and when, and the app cannot read or write the table",
    ["actor", "action", "target", "at timestamptz"].every(k => sql.includes(k)) &&
      /revoke all on public\.admin_audit from public, anon, authenticated;/.test(sql) &&
      !/create policy [^;]* on public\.admin_audit/.test(sql)
  );
  chk(
    "the app's writer is for a coach or the admin, and for known actions only",
    /if not \(is_admin\(\) or is_coach\(\)\) then raise exception/.test(body("audit_write")) &&
      /act not in \('open_game'/.test(body("audit_write"))
  );
  chk(
    "a coach's notes: the coach's own rows, and the admin can read",
    /coach = auth\.uid\(\) and is_coach\(\)\) or is_admin\(\)/.test(sql)
  );
  chk("the file says that it is not applied", /NOT APPLIED/.test(sql));

  /* THE COACH PAGE: values */
  const R0 = r => Object.assign({ s: true }, r),
    ch = Object.assign(newChar(), {
      name: "Cal",
      led: true,
      placed: true,
      take: 4000,
      spend: 4300,
      incs: [R0({ k: "A main job", amt: 4000 })],
      spends: [R0({ k: "Home", amt: 4300 })],
      cashes: [R0({ k: "Checking", amt: 2150 })],
      invs: [R0({ k: "IRA or Roth IRA", amt: 10000 })],
      debts: [R0({ k: "Credit card balance", amt: 3000, high: true, rate: 24, pay: 90 })],
      x: {
        plan: [
          { id: "a", t: "One", st: "done" },
          { id: "b", t: "Two", st: "todo" },
        ],
      },
    }),
    game = { chars: [ch], active: 0 },
    rows = cpPack(game, 1000),
    asRows = rows.map(r => ({
      name: r.name,
      data: r.data,
      updated_at: "2026-11-01T00:00:00Z",
      share_with_coach: true,
    }));
  chk(
    "a game packs into pieces and one row that counts them",
    rows[rows.length - 1].name === "slam_meta" &&
      rows[rows.length - 1].data.n === rows.length - 1 &&
      rows[rows.length - 1].data.len === JSON.stringify(game).length
  );
  const back = cpGame(asRows);
  chk(
    "and the pieces go back together",
    !!back && JSON.stringify(back.g) === JSON.stringify(game) && back.share === true
  );
  chk("a game with a missing piece is not read", cpGame(asRows.filter(r => r.name !== "slam_part_0")) === null);
  const big = { chars: [], pad: "x".repeat(CP_PART * 2 + 5) };
  chk(
    "a big game takes more pieces, the same size as the game's own save",
    cpPack(big, 1).length === 4 && CP_PART === CL_PART
  );
  /* by hand: cash 2,150 + invested 10,000 - owed 3,000 = 9,150. 4,000 - 4,300 = -300. 2,150 / 4,300 = 0.5 months. */
  const n = cpNums(ch);
  chk(
    "the four numbers: net worth, left each month, cushion, costly debt",
    n.worth === 9150 && n.left === -300 && near(n.cushion, 0.5) && n.costly === 3000 && n.era === derive(ch).era,
    JSON.stringify(n)
  );
  const cl = cpClient("o1", back);
  chk("one client of the roster", cl.names === "Cal" && cl.people[0].done === 1 && cl.people[0].open === 1);
  const now = new Date("2026-11-24T00:00:00Z").getTime(),
    fl = cpFlags(cl, now, null);
  chk(
    "flags: quiet for 23 days, spending over pay, under one month of cushion",
    fl.length === 3 && /Quiet for 23 days/.test(fl[0]) && /over pay by \$300/.test(fl[1]) && /cushion/.test(fl[2]),
    fl.join(" | ")
  );
  const snap = cpSnap(cl);
  chk("with no earlier look, there is nothing to compare", /First look/.test(cpDiff(null, cl)[0]));
  chk("with no change, it says so", /No change/.test(cpDiff(snap, cl)[0]));
  ch.debts[0].amt = 3600;
  ch.x.plan[1].st = "done";
  const cl2 = cpClient("o1", { g: game, at: "2026-11-20T00:00:00Z" }),
    df = cpDiff(snap, cl2);
  chk(
    "what changed since last time, in plain lines",
    df.some(l => /net worth down \$600/.test(l)) &&
      df.some(l => /costly debt up \$600/.test(l)) &&
      df.some(l => /1 more steps done/.test(l)),
    df.join(" | ")
  );
  chk(
    "costly debt that went up is a flag",
    cpFlags(cl2, now, snap).some(f => /costly debt is up by \$600/.test(f))
  );
  const task = cpAssign(game, 0, CP_QUESTS[0], "2026-11-24", 5000);
  chk(
    "a quest goes into the client's Next Steps, marked as from the coach",
    !!task &&
      ch.x.plan.includes(task) &&
      task.s === "From your coach" &&
      task.st === "todo" &&
      game.coachEdit.by === "coach" &&
      game.savedAt === 5000
  );
  chk("the same quest is not added two times", cpAssign(game, 0, CP_QUESTS[0], "2026-11-24", 6000) === null);
  chk("10 quest templates, each with a time", CP_QUESTS.length === 10 && CP_QUESTS.every(q => q.t && q.mins > 0));
  const csv = cpCsv([cl2], now).split("\n");
  chk(
    "the export has a header and one row for each person",
    csv.length === 2 && csv[0].startsWith("Client,Last active,Era,Net worth") && csv[1].startsWith("Cal,2026-11-20,")
  );
  const inv = cpInvite("a.b@example.com", "https://example.org/game/");
  chk(
    "the invite is an email for the coach's own mail app, with the link and the default",
    inv.startsWith("mailto:a.b%40example.com?subject=") &&
      decodeURIComponent(inv).includes("https://example.org/game/") &&
      decodeURIComponent(inv).includes("Coach mode is on by default")
  );
  /* the client's own game shows the quest */
  const n0 = G.chars.length;
  G.demo = false;
  G.chars.push(ch);
  G.active = n0;
  save();
  go("plan");
  chk(
    "in the client's game the quest shows on Next Steps",
    app().includes(esc(CP_QUESTS[0].t)) && app().includes("From your coach")
  );
  G.chars.length = n0;
  G.active = 0;
  save();

  /* THE ADMIN PAGE: the new sections */
  const A = amAuditRows([
    { at: "2026-11-01T10:00:00Z", actor_email: "a@x.org", role: "admin", action: "coach_on", target_email: "c@x.org" },
    { at: "2026-11-03T10:00:00Z", actor_email: "c@x.org", role: "coach", action: "open_game", target_email: "p@x.org" },
  ]);
  chk(
    "the audit log: the newest first, who, what, to whom",
    A[0].who === "c@x.org (coach)" &&
      A[0].what === "Opened the game of p@x.org" &&
      A[1].what === "Made a coach of c@x.org"
  );
  chk(
    "the health view has sign-ups and failed saves",
    amHealthRows({ accounts: 2, signups7: 1, fails7: 3 }).some(r => r[0].includes("7 days") && r[1] === 1) &&
      amHealthRows({ fails7: 3 }).some(r => /Failed saves/.test(r[0]) && r[1] === 3)
  );
  const esc0 = global.esc;
  AM.audit = null;
  AM.health = null;
  const h0 = amHTML();
  chk(
    "before the database file has run, each section says so",
    (h0.match(/waits for the database file/g) || []).length === 2 && h0.includes("Download everything")
  );
  AM.audit = [
    { at: "2026-11-03T10:00:00Z", actor_email: "c@x.org", role: "coach", action: "open_game", target_email: "p@x.org" },
  ];
  AM.health = {
    accounts: 2,
    confirmed: 2,
    signups7: 1,
    signups30: 2,
    with_game: 1,
    no_game: 1,
    fails7: 1,
    fails: [{ at: "2026-11-03T10:00:00Z", email: "p@x.org", msg: "permission denied" }],
    last_save: null,
  };
  const h1 = amHTML();
  chk(
    "the three sections are collapsed, and a failed save shows in amber",
    (h1.match(/<details class="card"/g) || []).length === 3 &&
      !/<details[^>]* open/.test(h1) &&
      h1.includes("#ffb648") &&
      h1.includes("permission denied") &&
      h1.includes("Opened the game of p@x.org")
  );

  /* THE PAGES */
  const coach = read("coach.html"),
    admin = read("admin.html"),
    cp = read("account/coachpage.js"),
    all = [coach, admin, cp, read("account/adminmore.js"), read("account/roles.js"), sql].join("");
  chk(
    "the coach page loads its scripts and uses the same login",
    ["account/supa.js", "account/roles.js", "account/coachpage.js", "core/engine.js"].every(f => coach.includes(f)) &&
      coach.includes("SUPA_URL,SUPA_KEY")
  );
  chk(
    "the coach page has each part",
    [
      "Open game",
      "Assign a quest",
      "Session notes",
      "Invite a client by email",
      "Export to a sheet",
      "What changed since last time",
      "Needs attention",
      "Mark as seen",
    ].every(t => cp.includes(t))
  );
  chk(
    "a visible way back on both pages",
    cp.includes("Back to the game") && admin.includes("‹ Back to the game") && admin.includes('roHatsHTML("admin"')
  );
  chk(
    "inputs have visible borders on the coach page",
    /input,select,textarea\{[^}]*border:2px solid var\(--line\)/.test(coach)
  );
  chk(
    "the admin page has Health, the Audit log and Download everything",
    admin.includes("account/adminmore.js") && admin.includes("amHTML()") && admin.includes("amLoad(sb)")
  );
  chk(
    "no em dash and no en dash in the new files",
    !new RegExp("[" + String.fromCharCode(0x2014, 0x2013) + "]").test(all)
  );
  chk("amber for attention, and no red", cp.includes("pill amber") && !/#ff4d6a|#f00\b|color:red/i.test(coach + cp));
  void esc0;
}
