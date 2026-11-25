/* ============================================================================
   SLAM the Game, test: tests/report-a-bug-or-idea.js
   PURPOSE     Examine Report a bug or idea: the button on each tab, each sheet, the welcome screen and the
               sign-in screen; what a report carries (names, never a money number); the list on the device
               and the honest line "Saved on this device" while the table is absent; the sending when the
               table exists; the note "You reported this. It's fixed." one time; the old flags still
               readable; the admin Reports inbox; and the database file: the rights and the rows rules.
   INPUT       The game scripts, loaded by harness.cjs. account/adminmore.js, loaded here, because only
               admin.html loads it. The database file as text. A stand-in for fetch: no network.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: core/reportcore.js, features/fbreport.js, account/adminmore.js,
               account/supa.js, screens/ui.js, screens/planner.js, admin.html,
               supabase/migrations/20261125190000_reports.sql.
   ========================================================================= */
{
  const fs = require("fs"),
    vm = require("vm"),
    read = f => fs.readFileSync(GAME_DIR + f, "utf8");
  vm.runInThisContext(read("account/adminmore.js"), { filename: "account/adminmore.js" });
  const R0 = r => Object.assign({ s: true }, r),
    me = Object.assign(newChar(), {
      name: "Rep",
      led: true,
      placed: true,
      age: 30,
      ret: 60,
      take: 5000,
      spend: 4000,
      incs: [R0({ k: "A main job", amt: 5000 })],
      spends: [R0({ k: "Home", amt: 4000 })],
      cashes: [R0({ k: "Checking", amt: 3000 })],
      invs: [],
      debts: [],
    });
  G.demo = false;
  G.tourSeen = true;
  G.chars.push(me);
  G.active = G.chars.length - 1;
  syncAll(me);
  save();
  go("home");

  /* THE BUTTON */
  const top = () => els["#app .topbar"].innerHTML;
  const BTN = /<button type="button" class="rp-btn rp-open[^"]*" data-a="flag">Report<\/button>/;
  ["home", "plan", "money", "map", "me"].forEach(t => {
    go(t);
    chk(
      "the tab " + t + " has one Report button, in the top bar",
      (top().match(/data-a="flag"/g) || []).length === 1 && BTN.test(top()) && !app().includes('data-a="flag"')
    );
  });
  chk(
    "the old button 'Flag this screen' is gone from the tabs",
    !app().includes("Flag this screen") && flagBtn() === ""
  );
  go("home");
  ["safe", "glossary", "menu", "quest", "built"].forEach(a => {
    X(a);
    chk(
      "the sheet " + a + " ends with the Report button",
      /<div class="rp-sheetrow"><button[^>]*data-a="flag">Report<\/button><\/div><\/div><\/div>$/.test(ov()),
      ov().slice(-120)
    );
    X("close");
  });
  chk("the welcome screen has the button", BTN.test(welcome()));
  const supa = read("account/supa.js");
  chk(
    "the sign-in screen has the button",
    /class="su-rep"><button type="button" class="rp-btn rp-open" data-a="flag">Report<\/button>/.test(supa)
  );
  X("menu");
  chk(
    "the menu says Report a bug or idea, not Flag this screen",
    ov().includes("Report a bug or idea") && !ov().includes("Flag this screen")
  );
  X("close");
  chk(
    "the button is a real button: a border, 44 pixels, and never the filled primary",
    /\.rp-btn\{[^}]*min-height:44px;min-width:44px[^}]*border:2px solid[^}]*background:transparent/.test(RP_CSS)
  );
  chk("the three types are Bug, Idea and Confusing", RP_TYPES.map(t => t[1]).join() === "Bug,Idea,Confusing");

  /* WHAT A REPORT CARRIES */
  go("money");
  chk("the screen name of a tab", fbScreen() === "money");
  go("home");
  X("safe");
  chk("the screen name of a sheet is the tab and the sheet", fbScreen() === "home > safe", fbScreen());
  FB.taps = [];
  ["tab", "safe", "flag", "glossary", "close"].forEach(fbTap);
  chk(
    "the last 3 taps, and the tap on Report is not one of them",
    FB.taps.join() === "safe,glossary,close",
    FB.taps.join()
  );
  const facts = fbFacts(),
    row = rpMake(
      Object.assign({}, facts, {
        type: "confusing",
        note: "  I owe $4,000 and I am lost  ",
        ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        width: 390,
        version: "game-1a2b3c4d",
      })
    );
  X("close");
  chk(
    "a report has the screen, the taps, the device, the width, the browser and the version",
    row.screen === "home > safe" &&
      row.taps.length === 3 &&
      row.device === "phone, iOS" &&
      row.width === 390 &&
      row.browser === "Safari 17" &&
      row.version === "game-1a2b3c4d" &&
      row.app === "game"
  );
  chk("the note is the person's own words", row.note === "I owe $4,000 and I am lost");
  const auto = JSON.stringify(Object.assign({}, row, { note: "", id: "", made_at: "" }));
  chk("nothing the game adds by itself holds a money number of the profile", !/5000|4000|3000|\$/.test(auto), auto);
  chk(
    "a name cannot carry a dollar sign, and a button label loses its digits",
    rpName("pay $4,000 now") === "pay 4 000 now" &&
      rpLabel("$1,250 a month") === "a month" &&
      rpLabel("Use 15%") === "Use"
  );
  chk("no type, no report", rpMake({ type: "rant" }) === null);
  chk("the note has a cap", rpMake({ type: "bug", note: "x".repeat(5000) }).note.length === RP_NOTE_MAX);
  chk(
    "a picture is kept only when it is a small picture as text",
    rpShotOk("data:image/jpeg;base64,AAAA") &&
      !rpShotOk("data:image/jpeg;base64," + "A".repeat(RP_SHOT_MAX)) &&
      !rpShotOk("https://x.org/a.png") &&
      rpMake({ type: "bug", shot: "javascript:alert(1)" }).shot === null
  );
  chk(
    "nothing takes a picture of the screen by itself",
    !/getDisplayMedia|html2canvas|captureStream/.test(read("core/reportcore.js") + read("features/fbreport.js")) &&
      /type: "file"/.test(read("core/reportcore.js"))
  );
  chk(
    "the app version is one code from the script stamps, and it changes with any stamp",
    /^game-[0-9a-f]{8}$/.test(rpVersion(["a.js?1", "b.js?2"])) &&
      rpVersion(["a.js?1", "b.js?2"]) === rpVersion(["b.js?2", "a.js?1"]) &&
      rpVersion(["a.js?1", "b.js?3"]) !== rpVersion(["a.js?1", "b.js?2"]) &&
      rpVersion([]) === ""
  );
  chk(
    "the device is read from the browser",
    rpDevice(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      412
    ).device === "phone, Android" &&
      rpDevice(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        1280
      ).browser === "Edge 120" &&
      rpDevice(
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        820
      ).device === "tablet, iOS"
  );

  /* ON THE DEVICE, AND THE SENDING */
  const store = {},
    LS = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = v) };
  global.localStorage = LS;
  FB.q = null;
  const calls = [],
    net = (status, body) => ({
      url: "https://db.test",
      key: "pub",
      token: null,
      uid: null,
      fetch: (u, o) => (
        calls.push({ u, o }),
        Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(body || {}) })
      ),
    });
  (async () => {
    const s1 = await fbSendNow({ type: "bug", note: "first" }, net(404, { code: "PGRST205" }));
    chk(
      "before the database file has run, a report stays on the device",
      s1 === "wait" && rpPending(rpLoad(LS)).length === 1 && rpLoad(LS)[0].state === "saved"
    );
    chk(
      "and the sheet says so honestly",
      RP_SAID.saved.startsWith("Saved on this device") && !/sent/i.test(RP_SAID.saved.split(".")[0])
    );
    go("me");
    chk(
      "Me lists the report as Saved on this device",
      /Your reports \(1\)/.test(app()) && app().includes("Saved on this device"),
      ""
    );
    G.flags.push({ d: "2026-11-01", where: "home", kind: "Confusing" });
    go("me");
    chk(
      "an old flag is still readable next to it",
      /Your reports \(2\)/.test(app()) && /home · <b>Confusing<\/b> · Flagged/.test(app())
    );
    G.flags.pop();
    const s2 = await fbSendNow(
      { type: "idea", note: "second" },
      { url: "https://db.test", key: "pub", fetch: () => Promise.reject(new Error("offline")) }
    );
    chk("with no network it stays on the device too", s2 === "offline" && rpPending(rpLoad(LS)).length === 2);
    calls.length = 0;
    const s3 = await fbFlushNow(net(201));
    chk(
      "when the table exists, the reports that waited send themselves, the oldest first",
      s3 === "sent" &&
        calls.length === 2 &&
        JSON.parse(calls[0].o.body).note === "first" &&
        rpPending(rpLoad(LS)).length === 0
    );
    chk(
      "a visitor sends with the public key only, and asks for nothing back",
      calls[0].u === "https://db.test/rest/v1/reports" &&
        calls[0].o.headers.Authorization === "Bearer pub" &&
        calls[0].o.headers.Prefer === "return=minimal" &&
        calls[0].o.method === "POST"
    );
    chk(
      "the row sent has no owner, no status: the database sets them",
      !("owner" in JSON.parse(calls[0].o.body)) && !("status" in JSON.parse(calls[0].o.body))
    );
    go("me");
    chk("Me now says Sent", app().includes("· Sent</div>") && !app().includes("Saved on this device"));
    calls.length = 0;
    const cfgA = Object.assign(net(409), { token: "jwt-a", uid: "u-a" });
    chk(
      "a signed-in account sends as itself, and a report sent twice counts as sent",
      (await rpSend(rpMake({ type: "bug" }), cfgA)) === "sent" && calls[0].o.headers.Authorization === "Bearer jwt-a"
    );
    chk(
      "a refusal keeps it on the device",
      (await rpSend(rpMake({ type: "bug" }), net(403, { code: "42501" }))) === "later" &&
        (await rpSend(rpMake({ type: "bug" }), {})) === "wait"
    );
    let q = [];
    for (let i = 0; i < 30; i++)
      q = rpQueueAdd(q, rpMake({ type: "bug", id: "id" + i, shot: "data:image/jpeg;base64,AAAA" }));
    chk(
      "the device keeps at most 20 reports and 3 pictures",
      q.length === RP_KEEP && q.filter(x => x.row.shot).length === RP_SHOT_KEEP && q[0].row.id === "id29"
    );
    chk(
      "a sent report drops its picture on the device",
      rpQueueSent(q, "id29")[0].row.shot === null && rpQueueSent(q, "id29")[0].state === "sent"
    );
    const full = {
      getItem: () => null,
      setItem: (k, v) => {
        if (v.includes("base64")) throw new Error("full");
        store.full = v;
      },
    };
    chk(
      "when the device has no room, the list is kept without the pictures",
      rpKeep(full, q).every(x => !x.row.shot) && store.full.includes("id29")
    );

    /* MARK FIXED: THE NOTE IN THE GAME */
    go("home");
    chk("before the migration there is no note", !app().includes(RP_SAID.fixed));
    chk("with nobody signed in, nothing is asked", (await rpFixedFetch(net(200, []))).length === 0);
    calls.length = 0;
    const fx = await rpFixedFetch({
      url: "https://db.test",
      key: "pub",
      token: "jwt-a",
      uid: "u-a",
      fetch: (u, o) => (
        calls.push({ u, o }),
        Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: "r1", type: "bug", screen: "home > safe" }]) })
      ),
    });
    chk(
      "a signed-in account asks for its own fixed reports",
      fx.length === 1 &&
        /status=eq\.fixed&owner=eq\.u-a/.test(calls[0].u) &&
        calls[0].o.headers.Authorization === "Bearer jwt-a"
    );
    FB.fixed = fx;
    G.rpTold = [];
    go("home");
    chk(
      "the note is on Home, in these words",
      app().includes("You reported this. It&#39;s fixed.") || app().includes("You reported this. It's fixed."),
      ""
    );
    chk("it names the type and the screen", /Bug on home &gt; safe|Bug on home > safe/.test(app()));
    X("fbgot");
    chk(
      "one time: after Got it the note is gone, and stays gone",
      !app().includes("rp-fixed") && G.rpTold.includes("r1") && (go("money"), go("home"), !app().includes("rp-fixed"))
    );
    SUPA.as = "someone";
    G.rpTold = [];
    go("home");
    chk("the admin inside a person's game does not use up their note", !app().includes("rp-fixed"));
    SUPA.as = null;
    G.rpTold = ["r1"];

    /* THE ADMIN OPENS THE GAME AT THAT SCREEN */
    chk(
      "the link of a report opens the game of the person at the screen",
      rpOpenHref({ app: "game", owner: "u-a", screen: "money > debts" }) === "./?as=u-a&at=money%20%3E%20debts" &&
        rpOpenHref({ app: "game", owner: null, screen: "home" }) === "" &&
        rpOpenHref({ app: "web", screen: "afford.html" }) === "../afford.html" &&
        rpOpenHref({ app: "web", screen: "javascript:x" }) === ""
    );
    go("home");
    const got = fbAtGo("money > safe");
    chk(
      "the game goes to the tab and opens the sheet",
      tab === "money" && got === "money > safe" && W && W.kind === "safe",
      got
    );
    X("close");
    chk(
      "a screen name that is not known opens nothing odd",
      fbAtGo("nowhere > constructor") === "nowhere" && fbAtGo("sign-in") === "sign-in"
    );
    go("home");

    /* THE ADMIN INBOX */
    global.esc = global.esc || (s => String(s == null ? "" : s));
    global.S = { data: { users: [{ id: "u-a", email: "a@x.org" }] } };
    AM.reports = null;
    chk(
      "before the database file has run, the inbox says that it waits for it",
      /Reports inbox/.test(amReportsHTML()) &&
        amReportsHTML().includes("waits for the database file of 2026-11-25") &&
        amReportsHTML().includes(RP_FILE)
    );
    AM.reports = [
      {
        id: "1",
        made_at: "2026-11-25T10:00:00Z",
        owner: "u-a",
        type: "bug",
        note: "It froze",
        app: "game",
        screen: "money > debts",
        taps: ["tab", "debts", "dbset"],
        width: 390,
        device: "phone, iOS",
        browser: "Safari 17",
        version: "game-1a2b3c4d",
        has_shot: true,
        status: "open",
      },
      {
        id: "2",
        made_at: "2026-11-25T12:00:00Z",
        owner: null,
        type: "idea",
        note: "",
        app: "web",
        screen: "afford.html",
        taps: [],
        width: 1280,
        device: "computer, Mac",
        browser: "Chrome 120",
        version: "web-2026-11-25",
        has_shot: false,
        status: "open",
      },
      {
        id: "3",
        made_at: "2026-11-24T09:00:00Z",
        owner: "u-a",
        type: "confusing",
        note: "",
        app: "game",
        screen: "home",
        taps: [],
        width: 390,
        device: "",
        browser: "",
        version: "",
        has_shot: false,
        status: "fixed",
      },
    ];
    const ih = amReportsHTML();
    chk(
      "the newest first",
      rpInbox(AM.reports, "all", false)
        .map(r => r.id)
        .join() === "2,1,3" && ih.indexOf('data-rp="2"') < ih.indexOf('data-rp="1"')
    );
    chk(
      "the fixed ones are hidden until asked for",
      !ih.includes('data-rp="3"') && ih.includes("Show the fixed ones too") && ih.includes("2 open")
    );
    chk(
      "a filter by type, with counts",
      ["All 3", "Bug 1", "Idea 1", "Confusing 1"].every(t => ih.includes(t)) &&
        rpInbox(AM.reports, "bug", true).length === 1
    );
    chk(
      "each report shows who, where, the taps, the device and the version",
      ih.includes("a@x.org") &&
        (ih.includes("money > debts") || ih.includes("money &gt; debts")) &&
        ih.includes("tab, debts, dbset") &&
        ih.includes("phone, iOS") &&
        ih.includes("game-1a2b3c4d") &&
        ih.includes("A visitor, not signed in")
    );
    chk(
      "the buttons: open their game at this screen, Mark Fixed, show the picture",
      ih.includes("Open their game at this screen") &&
        ih.includes('data-a="amrpfix" data-id="1" data-v="fixed">Mark Fixed') &&
        ih.includes("Show the picture") &&
        ih.includes('href="../afford.html"')
    );
    chk(
      "the inbox is collapsed, clean, and says what Mark Fixed does",
      /^<details class="card" style="padding:0 14px"><summary>/.test(ih) &&
        clean(ih) &&
        ih.includes("You reported this. It's fixed."),
      junk(ih)
    );
    const ups = [],
      sb = {
        from: () => ({ update: v => ({ eq: (k, id) => (ups.push({ v, id }), Promise.resolve({ error: null })) }) }),
      };
    await amClick({ dataset: { a: "amrpfix", id: "1", v: "fixed" } }, sb);
    chk(
      "Mark Fixed writes the status and the time, and says who gets the note",
      ups[0].id === "1" &&
        ups[0].v.status === "fixed" &&
        !!ups[0].v.fixed_at &&
        AM.reports[0].status === "fixed" &&
        /They see one note/.test(AM.rpMsg)
    );
    await amClick({ dataset: { a: "amrpfix", id: "1", v: "open" } }, sb);
    chk(
      "and it can be undone",
      ups[1].v.status === "open" && ups[1].v.fixed_at === null && AM.reports[0].status === "open"
    );
    await amClick({ dataset: { a: "amrpf", v: "idea" } }, sb);
    chk(
      "a tap on a filter keeps the section open",
      AM.rpType === "idea" && /<details[^>]* open/.test(amReportsHTML()) && !amReportsHTML().includes('data-rp="1"')
    );
    const admin = read("admin.html");
    chk(
      "the admin page loads the core before adminmore.js",
      admin.indexOf("core/reportcore.js") > 0 &&
        admin.indexOf("core/reportcore.js") < admin.indexOf("account/adminmore.js")
    );

    /* THE DATABASE FILE */
    const sql = fs.readFileSync(GAME_DIR + "../supabase/migrations/" + RP_FILE, "utf8");
    chk(
      "the file says NOT APPLIED and that it is safe to run two times",
      /^-- NOT APPLIED\./m.test(sql) && /safe to run two times/.test(sql)
    );
    chk(
      "safe to run two times: if not exists, drop policy if exists, create or replace",
      /create table if not exists public\.reports/.test(sql) &&
        (sql.match(/create policy/g) || []).length === (sql.match(/drop policy if exists/g) || []).length &&
        /drop trigger if exists reports_guard/.test(sql) &&
        !/create function/.test(sql.replace(/create or replace function/g, ""))
    );
    chk("row level security is on", /alter table public\.reports enable row level security;/.test(sql));
    chk("the rights start from nothing", /revoke all on public\.reports from public, anon, authenticated;/.test(sql));
    chk(
      "a visitor and an account can add, with the report columns only",
      /grant insert \(id, made_at, type, note, app, screen, taps, width, device, browser, version, shot\)\s+on public\.reports to anon, authenticated;/.test(
        sql
      )
    );
    chk(
      "only a signed-in account can read",
      /grant select on public\.reports to authenticated;/.test(sql) && !/grant select[^;]*anon/.test(sql)
    );
    chk(
      "a change touches status and fixed_at only, and nobody deletes",
      /grant update \(status, fixed_at\) on public\.reports to authenticated;/.test(sql) &&
        !/grant[^;]*delete/.test(sql) &&
        !/grant update on/.test(sql) &&
        !/grant all/.test(sql)
    );
    chk(
      "a visitor adds a row with no owner",
      /for insert to anon\s+with check \(owner is null and status = 'open' and fixed_at is null\)/.test(sql)
    );
    chk(
      "an account adds its own row",
      /for insert to authenticated\s+with check \(owner = auth\.uid\(\) and status = 'open' and fixed_at is null\)/.test(
        sql
      )
    );
    chk(
      "a person reads only their own rows, the admin reads all",
      /for select to authenticated\s+using \(owner = auth\.uid\(\) or is_admin\(\)\)/.test(sql)
    );
    chk(
      "only the admin marks a report fixed",
      /for update to authenticated\s+using \(is_admin\(\)\) with check \(is_admin\(\)\)/.test(sql)
    );
    chk(
      "no rows rule is open to all",
      !/using \(true\)|with check \(true\)/.test(sql) && (sql.match(/create policy/g) || []).length === 4
    );
    chk(
      "the caps of the database match the caps of the game",
      sql.includes("char_length(note) <= " + RP_NOTE_MAX) &&
        sql.includes("char_length(shot) <= " + RP_SHOT_MAX) &&
        sql.includes("jsonb_array_length(taps) <= " + RP_TAPS) &&
        /type in \('bug', 'idea', 'confusing'\)/.test(sql)
    );
    chk(
      "a ceiling on how many, and the guard function is closed to the API",
      /reports_guard\(\)/.test(sql) &&
        /revoke all on function public\.reports_guard\(\) from public, anon, authenticated;/.test(sql)
    );
    chk(
      "the file creates no storage bucket and holds no key",
      !/storage\.|bucket\b(?! \(|\.)/.test(sql.replace(/no storage bucket/g, "")) && !/sb_|eyJ/.test(sql)
    );

    /* THE LIST OF WHAT'S BUILT, AND THE WORDS */
    const wb = WB.find(r => /Report a bug or idea/.test(r[1]));
    chk(
      "What's built has the row, and its probe passes",
      !!wb && wb[2] === "p" && typeof wb[3] === "function" && wb[3]() === true
    );
    const said = [
      RP_CSS,
      ...Object.values(RP_SAID),
      ...RP_TYPES.flat(),
      read("features/fbreport.js"),
      read("core/reportcore.js"),
      ih,
    ].join(" ");
    chk(
      "no em dash, no blame word and no red in the words",
      said.indexOf(String.fromCharCode(8212)) < 0 &&
        !/mistake|failed|behind|off.track/i.test(said) &&
        !/#f00|#ff0000|\bred\b/i.test(RP_CSS)
    );
  })().catch(e => chk("the test ran to its end", false, String(e && e.stack)));
}
