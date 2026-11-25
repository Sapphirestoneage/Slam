/* ============================================================================
   SLAM the Game, test: tests/addon-sealed-files.js
   PURPOSE     Examine the sealed add-on files (x1.json, x2.json). Part 1: a sealed file shows no
               readable word, opens to nothing with a made-up key, and is named in no file that a new
               account loads; the database rules give a key only to an account with permission or to the
               admin; a new account (a stand-in database with no permission) gets no add-on in the menu,
               the glossary, the themes or the built list. Part 2: each sealed file opens to its exact
               source, and a wrong key opens nothing.
   INPUT       The game scripts, loaded by harness.cjs in the order of index.html. The sealed files in
               game/. For part 2: the private folder with the add-on source.
   OUTPUT      One result for each chk() call. The harness prints each failed check.
   DEPENDS ON  tests/harness.cjs. Examines: account/addon.js, x1.json, x2.json.
   RULES       The add-on source is private. It is not in this repository. Part 2 runs only when the
               private folder exists. Set the environment variable SLAM_PACKS_DIR to its path.
               With no folder, part 2 prints SKIP and part 1 runs alone.
   ========================================================================= */
{
  const fs = require("fs"),
    packs = (process.env.SLAM_PACKS_DIR || "/home/claude/packs").replace(/\/?$/, "/");

  // Part 1. Each sealed file in game/ shows no readable word (three words of four letters or more in a row).
  fs.readdirSync(GAME_DIR)
    .filter(f => /^x\d+\.json$/.test(f))
    .sort()
    .forEach(f => {
      const j = JSON.parse(fs.readFileSync(GAME_DIR + f, "utf8"));
      chk(
        "the sealed file shows no readable word: " + f,
        !/[A-Za-z]{4,} [A-Za-z]{4,} [A-Za-z]{4,}/.test(Buffer.from(j.d, "base64").toString("latin1"))
      );
    });

  // Part 1b. With no key from the database a sealed file opens to nothing, and it has one field only (no title in clear).
  const sealed = fs
    .readdirSync(GAME_DIR)
    .filter(f => /^x\d+\.json$/.test(f))
    .sort();
  sealed.forEach(f => {
    const j = JSON.parse(fs.readFileSync(GAME_DIR + f, "utf8"));
    chk("the sealed file has one field, the sealed text: " + f, Object.keys(j).join() === "d");
    chk(
      "a made-up key opens nothing: " + f,
      [0, 1, 2].every(i => adOpen(j.d, { k: String(i).repeat(64), n: String(i).repeat(24), h: i }) === null)
    );
  });

  // Part 1c. No file that a new account loads names a sealed file. The name of the file comes from the database,
  // with the key, and only for an account with permission.
  const idx = fs.readFileSync(GAME_DIR + "index.html", "utf8"),
    loaded = idx.match(/<script src="([a-z0-9\/-]+\.js)/g).map(x => x.split('"')[1]);
  chk(
    "no script of the game and no page names a sealed file",
    ["index.html", "privacy.html", "sw.js", "manifest.json"]
      .concat(loaded)
      .every(f => !/\bx\d+\.json/.test(fs.readFileSync(GAME_DIR + f, "utf8"))),
    loaded.filter(f => /\bx\d+\.json/.test(fs.readFileSync(GAME_DIR + f, "utf8"))).join()
  );

  // Part 1d. The database rules, read as text: the key of an add-on goes only to an account with permission or to
  // the admin, and only the admin gives permission.
  const rules = fs.readFileSync(GAME_DIR + "../docs/game-addons.sql", "utf8"),
    later = fs.readFileSync(GAME_DIR + "../supabase/migrations/20261124170000_roles_audit_coach.sql", "utf8"),
    lastOf = (t, re) => (t.match(re) || []).pop() || "";
  chk(
    "the last row rule on the add-on keys: the admin, or an account with permission",
    /using \(is_admin\(\) or exists \(select 1 from player_entitlements e where e\.user_id = auth\.uid\(\) and e\.pack = content_packs\.pack\)\)/.test(
      lastOf(rules, /create policy "read entitled packs" on content_packs[^;]*;/g)
    )
  );
  chk(
    "the add-on keys have one row rule, for reading, and no right for an account that is not signed in",
    (rules.match(/create policy "[^"]*" on content_packs for (\w+)/g) || []).every(x => / for select$/.test(x)) &&
      /grant select on content_packs to authenticated;/.test(rules) &&
      !/grant [^;]* on [^;]*content_packs[^;]* to [^;]*anon/.test(rules + later)
  );
  chk(
    "only the admin adds or removes a permission",
    /create policy "admin grants" on player_entitlements for insert to authenticated with check \(is_admin\(\)\);/.test(
      rules
    ) &&
      /create policy "admin revokes" on player_entitlements for delete to authenticated using \(is_admin\(\)\);/.test(
        rules
      ) &&
      !/create policy "[^"]*" on player_entitlements for update/.test(rules + later)
  );
  const setPack = (rules + later).split(/create or replace function (?:public\.)?admin_set_pack\(/).slice(1);
  chk(
    "admin_set_pack stops an account that is not the admin, in each version of the function",
    setPack.length === 2 &&
      setPack.every(x => {
        const stop = x.indexOf("if not is_admin() then raise exception 'admin only'; end if;"),
          write = x.indexOf("insert into player_entitlements");
        return stop > 0 && stop < write;
      })
  );
  chk(
    "the one-time yes of a person changes only that person's own row",
    /update player_entitlements set confirmed_at = now\(\) where user_id = auth\.uid\(\) and pack = p and confirmed_at is null/.test(
      rules
    )
  );
  chk("the database files hold no add-on row", !/insert into (public\.)?content_packs/.test(rules + later));

  // Part 1e. A new account, with a stand-in for the database that gives no permission and no key: the game asks,
  // gets nothing, fetches no sealed file, and nothing in the menu, the glossary, the themes or the built list
  // belongs to an add-on.
  (async () => {
    const asked = [],
      fetched = [],
      wasFetch = global.fetch,
      was = { on: SUPA.on, sb: SUPA.sb, uid: SUPA.uid };
    global.fetch = async u => {
      fetched.push(String(u));
      throw new Error("no fetch in this test");
    };
    SUPA.on = true;
    SUPA.uid = "new-account";
    SUPA.sb = {
      rpc: async n => (asked.push("rpc " + n), { data: false, error: null }),
      from: t => ({ select: async () => (asked.push("select " + t), { data: [], error: null }) }),
    };
    ADX.st = "loading";
    await adStartWeb();
    chk(
      "a new account asks the database for its add-ons",
      asked.join() === "rpc is_admin,select content_packs",
      asked.join()
    );
    chk("with no permission it fetches no sealed file", fetched.length === 0, fetched.join());
    chk(
      "no add-on is in the game, and the account is not the owner",
      Object.keys(ADX.has).length === 0 && ADX.own === false
    );
    chk(
      "no menu line belongs to an add-on",
      MENU.every(m => !m[4])
    );
    chk("no glossary word belongs to an add-on", Object.keys(ADX.gl).length === 0);
    chk(
      "no theme belongs to an add-on",
      Object.keys(THEMES).every(k => !THEMES[k].pk)
    );
    chk(
      "no row of the built list belongs to an add-on",
      WB.every(r => !r.pk)
    );
    X("menu");
    const menu = ov();
    X("close");
    X("glossary");
    const gloss = ov();
    X("close");
    X("built");
    const built = ov();
    X("close");
    chk(
      "the menu, the glossary and the built list draw, and none shows the word add-on",
      [menu, gloss, built].every(h => h.length > 200 && !/add-?on/i.test(h))
    );
    chk("a player sees no Add-ons card: only the owner has it", adCard() === "");
    ADX.test = true;
    chk(
      "the test switch of the browser console turns on nothing, because there is nothing to turn on",
      adOn("any") === false
    );
    ADX.test = false;
    global.fetch = wasFetch;
    Object.assign(SUPA, was);
  })().catch(e => chk("part 1e ran to its end", false, e && e.stack));

  // Part 2. With the private folder: each sealed file opens to its exact source, and a wrong key opens nothing.
  if (!fs.existsSync(packs + "vault.json")) skip("part 2 needs the private add-on folder (SLAM_PACKS_DIR)");
  else {
    const V = JSON.parse(fs.readFileSync(packs + "vault.json", "utf8"));
    Object.keys(V).forEach(id => {
      const x = V[id],
        j = JSON.parse(fs.readFileSync(GAME_DIR + x.f, "utf8")),
        src = fs.readFileSync(packs + id + ".src.js", "utf8");
      chk("the sealed file opens to the exact source: " + x.f, adOpen(j.d, x) === src);
      chk(
        "a wrong key opens nothing: " + x.f,
        adOpen(j.d, Object.assign({}, x, { k: x.k.replace(/^../, x.k.slice(0, 2) === "00" ? "01" : "00") })) === null
      );
    });
  }
}
