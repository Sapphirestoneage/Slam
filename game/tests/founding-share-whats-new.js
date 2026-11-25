/* ============================================================================
   SLAM the Game, test: tests/founding-share-whats-new.js
   PURPOSE     Examine the Founding Testers (the mark and the one-time card come only from the answer of
               the database), the personal share link (?ref=code), the patch notes ("What's new"), the
               admin section, and the database file read as text (the grants, the row rules, the limit
               of 50).
   INPUT       The game scripts, loaded by harness.cjs. The sample game. A stand-in for the account.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/founding.js, data/patchnotes.js, account/supa.js
               (suRef, suRefKeep), account/foundadmin.js, admin.html,
               supabase/migrations/20261125190000_founding_and_referrals.sql.
   ========================================================================= */
{
  const fs = require("fs"),
    crypto = require("crypto"),
    vm = require("vm"),
    G0 = G,
    tab0 = tab,
    supa0 = Object.assign({}, SUPA),
    ls0 = global.localStorage,
    UID = "3f2b8c1e-5a4d-4e6f-9a7b-0c1d2e3f4a5b",
    OTHER = "99999999-aaaa-4bbb-8ccc-dddddddddddd",
    store = {};
  global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)) };
  const real = () => {
    G = fresh();
    const c = newChar({ name: "Dana", age: 31 });
    c.demo = false;
    applyTypical(c);
    G.chars = [c];
    G.demo = false;
    G.active = 0;
    tab = "home";
    render();
  };

  /* 1. THE SHARE CODE */
  const sha = s => crypto.createHash("sha256").update(s).digest("hex");
  chk(
    "the SHA-256 of the game is the real one",
    ["", "abc", UID, "x".repeat(200)].every(s => fdSha256(s) === sha(s))
  );
  chk("the share code is the first 8 letters of the SHA-256 of the account id", fdCode(UID) === sha(UID).slice(0, 8));
  chk("the share code is not the account id and not a piece of it", !UID.replace(/-/g, "").includes(fdCode(UID)));
  chk("no account, no code", fdCode("") === "" && fdCode(null) === "");
  chk(
    "the link has the code and nothing else",
    fdLink("abcd1234", "https://x.test/game/") === "https://x.test/game/?ref=abcd1234" &&
      fdLink("", "https://x.test/game/") === "https://x.test/game/"
  );

  /* 2. THE CODE A PERSON ARRIVES WITH */
  chk("a code is letters and digits only", suRefClean(" AbCd1234 ") === "abcd1234" && suRefClean("a b") === "");
  chk(
    "a code cannot carry a script, a money number with a sign, or an address",
    ["<script>", "$5,000", "a@b.co", "abc", "x".repeat(40)].every(s => suRefClean(s) === "")
  );
  chk("?ref=code is kept on the device", suRefKeep("?ref=abcd1234&x=1") === "abcd1234" && suRef() === "abcd1234");
  suRefKeep("?ref=zzzz9999");
  chk("the first code stays", suRef() === "abcd1234", suRef());
  chk("a link with no code changes nothing", suRefKeep("?as=someone") === "" && suRef() === "abcd1234");
  const supa = fs.readFileSync(GAME_DIR + "account/supa.js", "utf8");
  chk(
    "the code is read when the page loads, before the sign-in screen",
    supa.indexOf("suRefKeep(location.search)") > 0 &&
      supa.indexOf("suRefKeep(location.search)") < supa.indexOf("function suGate")
  );
  chk("the sign-up keeps the code with the account", /suRef\(\) \? \{ data: \{ ref: suRef\(\) \} \} : \{\}/.test(supa));

  /* 3. BEFORE THE DATABASE FILE RUNS: no mark, no card, and the game works */
  real();
  let calls = [],
    answer = { error: { message: "function setup_finished does not exist" }, data: null };
  Object.assign(SUPA, {
    on: true,
    uid: UID,
    as: null,
    ready: Promise.resolve(),
    sb: {
      rpc: (n, a) => {
        calls.push([n, a]);
        return Promise.resolve(answer);
      },
    },
  });
  FD.tried = FD.busy = FD.wait = false;
  const markIn = h => /Founding Tester/.test(h),
    cardIn = h => /one of the first 50/.test(h);
  render();
  chk("with no answer from the database, Home has no card", !cardIn(app()) && clean(app()));
  go("me");
  chk("with no answer from the database, Me has no mark", !markIn(app()));
  X("people");
  chk("with no answer from the database, People has no mark", !markIn(ov()));
  X("close");
  X("fdshare");
  chk(
    "the share sheet works all the same, with the code made on the device",
    ov().includes("?ref=" + fdCode(UID)) && /Copy my link/.test(ov()) && !markIn(ov()) && clean(ov())
  );
  chk("the share sheet says there are no rewards", /No rewards yet/.test(ov()));
  chk(
    "the share sheet carries no money number",
    !/\$\s?\d/.test(ov().replace(/<[^>]+>/g, " ")),
    ov()
      .replace(/<[^>]+>/g, " ")
      .match(/\$\s?\d+/)
  );
  const nav0 = global.navigator;
  let copied = "";
  Object.defineProperty(global, "navigator", {
    value: { clipboard: { writeText: t => ((copied = t), Promise.resolve()) } },
    configurable: true,
    writable: true,
  });
  X("fdcopy");
  chk(
    "Copy my link copies the link and says Copied",
    /Copied/.test(ov()) && copied.endsWith("?ref=" + fdCode(UID)),
    copied
  );
  chk("a device with no share sheet gets no share button", !/data-a="fdnative"/.test(ov()));
  let sent = null;
  navigator.share = o => ((sent = o), Promise.resolve());
  X("fdshare");
  chk("a device with a share sheet gets the button", /data-a="fdnative"/.test(ov()));
  X("fdnative");
  chk(
    "the share sheet of the device gets the link, and no money number",
    sent && sent.url.endsWith("?ref=" + fdCode(UID)) && !/\$|\d{3}/.test(sent.title + sent.text),
    JSON.stringify(sent)
  );
  navigator.clipboard.writeText = () => {
    throw new Error("no clipboard here");
  };
  X("fdshare");
  X("fdcopy");
  chk(
    "a device that cannot copy says how to copy by hand",
    /Press and hold the link/.test(ov()) && !/Copied/.test(ov())
  );
  Object.defineProperty(global, "navigator", { value: nav0, configurable: true, writable: true });
  X("close");
  go("home");

  setTimeout(() => {
    chk(
      "the game asked the database one time, with the code the person arrived with",
      calls.length === 1 && calls[0][0] === "setup_finished" && calls[0][1].ref === "abcd1234",
      JSON.stringify(calls)
    );
    chk("a refusal leaves no row, and the game waits", !G.fd || !G.fd.row, JSON.stringify(G.fd));
    chk("the game does not ask again on the same visit", (render(), calls.length === 1));
    chk("still no card after the refusal", !cardIn(app()));

    /* 4. AFTER THE DATABASE FILE RUNS: number 7 of 50 */
    answer = {
      error: null,
      data: { at: "2026-11-30T10:00:00Z", no: 7, code: fdCode(UID), ref: "abcd1234", limit: 50 },
    };
    FD.tried = false;
    calls = [];
    render();
    setTimeout(() => {
      chk(
        "the answer of the database is kept with the account id",
        G.fd.row && G.fd.row.no === 7 && G.fd.row.u === UID
      );
      chk(
        "Home shows the card, in the words of the brief",
        app().includes("You're one of the first 50.") &&
          app().includes("Want a free 20-minute walkthrough with Eli?") &&
          /data-a="fdmail"/.test(app()) &&
          /data-a="fdnot"[^>]*>Not now</.test(app()) &&
          clean(app()),
        junk(app())
      );
      render();
      chk("the game asks the database one time only", calls.length === 1, calls.length);
      go("me");
      chk(
        "Me shows the mark next to the name",
        /<h1>Dana <span[^>]*><span class="pill okp">Founding Tester/.test(app())
      );
      X("people");
      chk("People shows the mark", markIn(ov()) && clean(ov()));
      X("close");
      W = { kind: "reveal", i: 6 };
      sheet(rvSheet);
      chk("the character sheet shows the mark", markIn(ov()) && /No dollar amounts on this sheet/.test(ov()));
      X("close");
      const m = fdMailto(),
        q = new URLSearchParams(m.split("?")[1]);
      chk(
        "the button opens an email draft to Eli, with a short subject and a body",
        m.startsWith("mailto:stresslessaboutmoney@gmail.com?") &&
          q.get("subject").length < 60 &&
          /20-minute walkthrough/.test(q.get("body")) &&
          !/\$\d/.test(q.get("body"))
      );
      chk(
        "the game sends no email by itself",
        !/fetch\(|XMLHttpRequest|sendBeacon/.test(fs.readFileSync(GAME_DIR + "features/founding.js", "utf8"))
      );
      go("home");
      X("fdnot");
      chk("Not now closes the card", !cardIn(app()) && G.fd.card === "no");
      render();
      go("me");
      go("home");
      chk("the card stays closed", !cardIn(app()));
      go("me");
      chk("the mark stays after Not now", markIn(app()));
      G.fd.card = null;
      go("home");
      chk("the card is back for the next check", cardIn(app()));
      X("fdmail");
      chk("Email Eli closes the card too: it shows one time", !cardIn(app()) && G.fd.card === "mail");
      X("fdshare");
      chk("the share sheet keeps a way to the walkthrough", /data-a="fdmail"/.test(ov()) && markIn(ov()));
      X("close");

      /* 5. NEVER FROM A GUESS */
      G.fd.card = null;
      G.fd.row.no = 51;
      go("home");
      chk("a number over 50 gives no card and no mark", !cardIn(app()) && fdNo() === 0);
      G.fd.row.no = null;
      chk("an account after the first 50 has no mark", fdNo() === 0 && (go("me"), !markIn(app())));
      G.fd.row.no = 7;
      SUPA.uid = OTHER;
      FD.tried = true;
      go("home");
      chk("a game loaded into a different account shows no card", !cardIn(app()) && fdNo() === 0);
      go("me");
      chk("a game loaded into a different account shows no mark", !markIn(app()));
      SUPA.uid = UID;
      SUPA.as = OTHER;
      go("home");
      chk("the admin inside the game of a person does not get the card", !cardIn(app()));
      SUPA.as = null;
      SUPA.on = false;
      go("me");
      chk("with no account (the demo, no connection) there is no mark", !markIn(app()));
      X("fdshare");
      chk(
        "with no account the share sheet gives the plain link and says how to get a personal one",
        !/\?ref=/.test(ov()) && /Copy the link/.test(ov()) && /Sign in on the website/.test(ov()) && clean(ov())
      );
      X("close");
      FD.tried = false;
      calls = [];
      G = fresh();
      render();
      chk("the sample game never asks the database", calls.length === 0 && !cardIn(app()));

      /* 6. WHAT'S NEW */
      const L = pnSorted(PATCH_NOTES);
      chk("the patch notes have entries", L.length >= 8, L.length);
      chk(
        "each entry has a date, a title and a few short lines",
        PATCH_NOTES.every(
          e =>
            /^\d{4}-\d{2}-\d{2}$/.test(e.d) &&
            e.t &&
            e.t.length <= 60 &&
            Array.isArray(e.l) &&
            e.l.length >= 1 &&
            e.l.length <= 5 &&
            e.l.every(x => typeof x === "string" && x.length <= 200)
        )
      );
      chk(
        "the newest entry is first",
        L.every((e, i) => i === 0 || L[i - 1].d >= e.d)
      );
      chk("for one date, the later entry of the file is first", L[0] === PATCH_NOTES[PATCH_NOTES.length - 1]);
      chk(
        "a new entry goes at the end of the file: the file is in date order",
        PATCH_NOTES.every((e, i) => i === 0 || PATCH_NOTES[i - 1].d <= e.d)
      );
      const words = PATCH_NOTES.map(e => e.t + " " + e.l.join(" ")).join(" ");
      chk(
        "plain words: no file names, no jargon, and never bug, broken or failed",
        !/\.(js|html|sql|md|json)\b|\bbug|broken|failed|mistake|off track|\bbehind\b|Supabase|database|migration|\bAPI\b|commit|refactor/i.test(
          words
        ),
        (words.match(
          /\.(js|html|sql|md|json)\b|\bbug|broken|failed|mistake|off track|\bbehind\b|Supabase|database|migration|\bAPI\b|commit|refactor/i
        ) || [])[0]
      );
      chk("no em dash and no money number in the notes", !/—/.test(words) && !/\$\d/.test(words));
      chk(
        "the first entries cover what landed since Nov 23",
        ["Galaxy", "Ten more tools", "card vault", "coaches", "FI destinations", "Recalculating", "Coming soon"].every(
          k => PATCH_NOTES.some(e => e.t.includes(k))
        )
      );
      chk("the date reads in plain words", pnDay("2026-11-25") === "Nov 25, 2026" && pnDay("soon") === "");
      chk(
        "the Menu has What's new and Share SLAM",
        ["whatsnew", "fdshare"].every(a => MENU.some(m => m[1] === a))
      );
      X("menu");
      chk("the Menu shows both rows as ready", /What's new/.test(ov()) && /Share SLAM/.test(ov()));
      X("close");
      X("whatsnew");
      chk(
        "What's new opens on the three newest entries",
        (ov().match(/class="tile stack"/g) || []).length === 3 && ov().includes(esc(L[0].t)) && clean(ov()),
        junk(ov())
      );
      chk("the older entries are one tap away", /data-a="pnall"[^>]*>Show older updates \(\d+\)/.test(ov()));
      X("pnall");
      chk("Show older updates shows each entry", (ov().match(/class="tile stack"/g) || []).length === L.length);
      X("close");
      /* the web app reads the same file as a module: the list must be on the global object */
      const box = {};
      vm.runInNewContext(fs.readFileSync(GAME_DIR + "data/patchnotes.js", "utf8"), box);
      chk(
        "the web app can read the same list",
        Array.isArray(box.PATCH_NOTES) && box.PATCH_NOTES.length === PATCH_NOTES.length
      );
      chk(
        "CONTRIBUTING.md tells each run to add one entry at the end",
        /patchnotes\.js/.test(fs.readFileSync(GAME_DIR + "../CONTRIBUTING.md", "utf8"))
      );

      /* 7. THE ADMIN SECTION */
      const page = fs.readFileSync(GAME_DIR + "admin.html", "utf8"),
        ctx = { report: () => {}, esc: s => String(s == null ? "" : s).replace(/[&<>"]/g, "") };
      vm.createContext(ctx);
      vm.runInContext(
        fs.readFileSync(GAME_DIR + "account/foundadmin.js", "utf8") +
          ";this.FA=FA;this.faHTML=faHTML;this.faJoinRows=faJoinRows;this.faLoad=faLoad;",
        ctx
      );
      chk(
        "the admin page loads the section and draws it",
        /account\/foundadmin\.js\?v=[0-9a-f]{8}/.test(page) && page.includes("faHTML()") && page.includes("faLoad(sb)")
      );
      chk(
        "before the database file runs, the section says that it waits and names the file",
        /<details/.test(ctx.faHTML()) &&
          !/<details[^>]* open/.test(ctx.faHTML()) &&
          /waits for the database file/.test(ctx.faHTML()) &&
          ctx.faHTML().includes("20261125190000_founding_and_referrals.sql")
      );
      ctx.FA.data = {
        limit: 50,
        count: 2,
        finished: 3,
        founders: [
          { no: 2, at: "2026-11-30T11:00:00Z", email: "b@example.com" },
          { no: 1, at: "2026-11-30T10:00:00Z", email: "a@example.com" },
        ],
        joined: [
          { at: "2026-11-30T11:00:00Z", code: "aaaa1111", email: "b@example.com", through: "a@example.com" },
          { at: "2026-12-01T09:00:00Z", code: "zzzz0000", email: "c@example.com", through: null },
        ],
      };
      const ah = ctx.faHTML();
      chk("the section title has the live count", /<summary>Founding Testers: 2 of 50<\/summary>/.test(ah));
      chk("the section is collapsed", !/<details[^>]* open/.test(ah));
      chk(
        "who joined through whom, the newest first",
        ctx.faJoinRows(ctx.FA.data)[0].who === "c@example.com" &&
          ah.indexOf("c@example.com joined through the code zzzz0000") > 0 &&
          ah.indexOf("c@example.com joined through") < ah.indexOf("b@example.com joined through a@example.com")
      );
      chk("the admin section says there are no rewards", /no rewards/i.test(ah));

      /* 8. THE DATABASE FILE, READ AS TEXT */
      const sql = fs.readFileSync(
          GAME_DIR + "../supabase/migrations/20261125190000_founding_and_referrals.sql",
          "utf8"
        ),
        fns = sql.split(/create or replace function public\./).slice(1),
        body = n => (fns.find(f => f.startsWith(n + "(")) || "").split(/\$\$;?/)[1] || "",
        headOf = n => (fns.find(f => f.startsWith(n + "(")) || "").split("$$")[0];
      chk("the file says that it is not applied", /^-- NOT APPLIED\./m.test(sql));
      chk(
        "the file is safe to run two times",
        /create table if not exists public\.account_setup/.test(sql) &&
          !/create function|create policy if|^create policy (?!"a person reads their own setup row")/m.test(sql) &&
          /drop policy if exists "a person reads their own setup row" on public\.account_setup;/.test(sql) &&
          !/\bdrop table|\btruncate\b|delete from/i.test(sql)
      );
      chk(
        "one row for each account, and the row goes when the account goes",
        /user_id uuid primary key references auth\.users \(id\) on delete cascade/.test(sql)
      );
      chk(
        "the table holds: when setup was finished, the founding number, the share code, the arrival code",
        [
          "finished_at timestamptz not null default now()",
          "founding_no int",
          "share_code text not null unique",
          "arrived_with text",
        ].every(c => sql.includes(c))
      );
      chk(
        "the founding number is 1 to 50 and no two accounts share one",
        /founding_no int unique check \(founding_no between 1 and 50\)/.test(sql)
      );
      chk("the row rules are on", /alter table public\.account_setup enable row level security;/.test(sql));
      chk(
        "the rights are given by name: all are taken away, then only SELECT for a signed-in account",
        /revoke all on public\.account_setup from public, anon, authenticated;\s*grant select on public\.account_setup to authenticated;/.test(
          sql
        ) && (sql.match(/grant [a-z, ]+ on public\.account_setup/g) || []).length === 1
      );
      chk("a visitor with no sign-in gets nothing", !/\bto anon\b|to public\b/.test(sql));
      const pols = sql.match(/create policy [^;]+;/g) || [];
      chk(
        "one row rule: a person reads only their own row, and the app cannot write a row",
        pols.length === 1 && /for select to authenticated\s+using \(user_id = auth\.uid\(\)\)/.test(pols[0]),
        pols.join(" | ")
      );
      chk(
        "each function runs with the rights of its owner and a fixed search path, or needs none",
        ["setup_finished", "admin_founding"].every(n => /security definer set search_path = public/.test(headOf(n))) &&
          /set search_path = public/.test(headOf("share_code_of"))
      );
      chk(
        "each function is closed to a visitor, and open to a signed-in account by name",
        ["setup_finished(text)", "admin_founding()"].every(
          f =>
            sql.includes(`revoke all on function public.${f} from public, anon;`) &&
            sql.includes(`grant execute on function public.${f} to authenticated;`)
        ) && sql.includes("revoke all on function public.share_code_of(uuid, int) from public, anon, authenticated;")
      );
      chk(
        "the admin function checks is_admin() before it does anything",
        /^\s*begin\s+if not is_admin\(\) then raise exception 'admin only'; end if;/.test(body("admin_founding"))
      );
      chk(
        "emails are only in the admin function",
        !/email/.test(body("setup_finished")) && /email/.test(body("admin_founding"))
      );
      const sf = body("setup_finished");
      chk("setup_finished needs a sign-in", /if me is null then raise exception/.test(sf));
      chk(
        "no race: the function takes a lock before it counts, and looks again after the lock",
        sf.indexOf("pg_advisory_xact_lock(") > 0 &&
          sf.indexOf("pg_advisory_xact_lock(") < sf.indexOf("generate_series(1, 50)") &&
          (sf.match(/select \* into r from account_setup where user_id = me;/g) || []).length === 2
      );
      chk(
        "the next number is the smallest free one from 1 to 50, and nothing after that",
        /select min\(n\) into num from generate_series\(1, 50\) n\s+where not exists \(select 1 from account_setup a where a\.founding_no = n\);/.test(
          sf
        )
      );
      chk(
        "the limit is 50 in each place",
        !/generate_series\(1, (?!50\))/.test(sql) && !/between 1 and (?!50\))/.test(sql) && FD_LIMIT === 50
      );
      chk(
        "a second call changes nothing: the insert is only for an account with no row",
        /if not found then[\s\S]+insert into account_setup/.test(sf)
      );
      chk("the admin account takes no number", /if is_admin\(\) then\s+num := null;/.test(sf));
      chk("a person's own link does not count", /if came = code then came := null; end if;/.test(sf));
      chk(
        "the arrival code is letters and digits only, from the call or from the sign-up",
        sf.includes("raw_user_meta_data ->> 'ref'") && sf.includes("came !~ '^[a-z0-9]{4,32}$'")
      );
      chk(
        "the database makes the same share code as the game",
        /substr\(encode\(sha256\(convert_to\(u::text, 'UTF8'\)\), 'hex'\), 1, least\(greatest\(n, 8\), 32\)\)/.test(sql)
      );
      chk(
        "the game calls the function by its name, and the admin page too",
        fs.readFileSync(GAME_DIR + "features/founding.js", "utf8").includes('rpc("setup_finished"') &&
          fs.readFileSync(GAME_DIR + "account/foundadmin.js", "utf8").includes('rpc("admin_founding")')
      );
      chk(
        "the built list has the three rows",
        ["Founding Testers", "Share SLAM", "What's new"].every(k =>
          WB.some(r => r[1].includes(k) && r[2] === "b" && r[3]())
        )
      );

      /* put the game state back */
      Object.keys(SUPA).forEach(k => delete SUPA[k]);
      Object.assign(SUPA, supa0);
      FD.tried = FD.busy = FD.wait = false;
      global.localStorage = ls0;
      G = G0;
      tab = tab0;
      render();
    }, 20);
  }, 20);
}
