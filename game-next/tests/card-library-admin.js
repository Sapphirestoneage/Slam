/* ============================================================================
   SLAM the Game, test: tests/card-library-admin.js
   PURPOSE     Examine the card template (data/cardtemplate.js) and "Add a card" of the admin page
               (account/cardadmin.js): a clean record, empty is not zero, what a card still needs, the
               switches, the merge of added cards into the library, each path of the form, the form
               itself, and save, hide and remove against a stand-in for the database.
   INPUT       The game scripts, loaded by harness.cjs. account/cardadmin.js, loaded here, because
               only admin.html loads it. A stand-in for the database client (sb).
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: data/cardtemplate.js, account/cardadmin.js, admin.html,
               docs/game-addons.sql.
   ========================================================================= */
{
  const fs = require("fs"),
    T = window.CARD_TEMPLATE,
    U = CARDS2026.units;
  /* ---------- the template ---------- */
  chk(
    "the template has switches, categories and credit bands, each with a label",
    T.toggles.length >= 15 &&
      T.toggles.every(t => t.k && t.l && t.g) &&
      new Set(T.toggles.map(t => t.k)).size === T.toggles.length &&
      T.cats.length >= 10 &&
      T.bands.length >= 3
  );
  chk(
    "the id comes from the bank and the name",
    cardSlug("Chase", "Sapphire Preferred®") === "chase-sapphire-preferred"
  );
  const blank = cardClean({ bank: " Test Bank ", n: "Plain Card" });
  chk("empty is not zero: an empty fee stays empty", blank.fee === null && blank.amt === null && blank.spend === null);
  chk("a typed zero is zero", cardClean({ fee: "0" }).fee === 0 && cardClean({ fee: "$1,250" }).fee === 1250);
  chk("texts are trimmed and the id is made", blank.bank === "Test Bank" && blank.id === "test-bank-plain-card");
  const need0 = cardCheck({}, U);
  chk(
    "an empty card says what it needs, in plain words",
    need0.includes("The bank") &&
      need0.includes("The name of the card") &&
      need0.some(n => n.startsWith("The yearly fee")) &&
      need0.some(n => n.startsWith("Where you read this")) &&
      need0.includes("The date you looked at it")
  );
  const good = {
    bank: "Test Bank",
    n: "Everything Card",
    network: "Visa",
    fee: "95",
    amt: "60000",
    unit: "ur",
    spend: "4000",
    months: "3",
    min: "good",
    has: { lounge: true, rental: true, nothing: true },
    hasWords: { rental: " Primary cover ", lounge: "" },
    earn: {
      base: "1",
      rates: [
        { cat: "dining", x: "3" },
        { cat: "nowhere", x: 9 },
        { cat: "gas", x: "" },
      ],
      words: "3x dining",
    },
    credits: [
      { name: "Hotel credit", value: "100", words: "A year" },
      { name: "", value: 5 },
    ],
    unique: [{ label: "Companion pass", words: "A second ticket", value: "" }, {}],
    source: "The page of the bank",
    checked: "2026-11-23",
  };
  const G1 = cardClean(good);
  chk("a full card needs nothing more", cardCheck(good, U).length === 0, cardCheck(good, U).join());
  chk(
    "a switch that is not in the template is dropped, and an empty detail is not kept",
    G1.has.lounge &&
      G1.has.rental &&
      !("nothing" in G1.has) &&
      G1.hasWords.rental === "Primary cover" &&
      !("lounge" in G1.hasWords)
  );
  chk(
    "earn rates: only real categories with a number",
    G1.earn.rates.length === 1 && G1.earn.rates[0].cat === "dining" && G1.earn.rates[0].x === 3 && G1.earn.base === 1
  );
  chk(
    "empty rows of credits and unique things are dropped",
    G1.credits.length === 1 && G1.credits[0].value === 100 && G1.unique.length === 1 && !("value" in G1.unique[0])
  );
  chk(
    "an offer with no spending named is not ready",
    cardCheck(Object.assign({}, good, { spend: "" }), U).some(n => n.startsWith("The spending"))
  );
  chk(
    "a date in a different form is not ready",
    cardCheck(Object.assign({}, good, { checked: "Nov 23" }), U).includes("The date you looked at it")
  );
  chk(
    "a kind of points that the library does not have is not ready",
    cardCheck(Object.assign({}, good, { unit: "moon" }), U).includes("The kind of points")
  );
  chk(
    "the switches that are on, with label and detail",
    cardToggles(G1)
      .map(t => t.k)
      .join() === "lounge,rental" && cardToggles(G1)[1].words === "Primary cover"
  );
  chk(
    "the old keys biz and upTo follow their switches",
    cardClean({ has: { biz: true, upTo: true } }).biz === 1 && cardToggles({ biz: 1 }).some(t => t.k === "biz")
  );
  const base = [
      { id: "a", n: 1 },
      { id: "b", n: 1 },
    ],
    merged = cardMerge(base, [
      { id: "b", n: 2 },
      { id: "c", n: 2 },
      { id: "a", hidden: true },
    ]);
  chk(
    "merge: a new card is added, the same id replaces, hidden removes, the order stays",
    merged.map(c => c.id + c.n).join() === "b2,c2"
  );
  chk("merge with nothing added is the file", cardMerge(base, []).length === 2 && cardMerge(base, null).length === 2);
  /* ---------- the admin form ---------- */
  require("vm").runInThisContext(fs.readFileSync(GAME_DIR + "account/cardadmin.js", "utf8"), {
    filename: "account/cardadmin.js",
  });
  const db = { rows: [], calls: [], fail: false },
    table = () => ({
      select: () => ({ order: async () => (db.fail ? { error: { message: "no table" } } : { data: db.rows.slice() }) }),
      upsert: async r => {
        db.calls.push(["upsert", r.id]);
        db.rows = db.rows.filter(x => x.id !== r.id).concat([r]);
        return {};
      },
      delete: () => ({
        eq: async (k, v) => {
          db.calls.push(["delete", v]);
          db.rows = db.rows.filter(x => x.id !== v);
          return {};
        },
      }),
    });
  globalThis.sb = { from: t => (db.calls.push(["from", t]), table()) };
  globalThis.draw = () => {};
  const d = caDraft(null);
  caSet(d, "bank", "Test Bank");
  caSet(d, "n", "Form Card");
  caSet(d, "fee", "0");
  caSet(d, "has.lounge", "1");
  caSet(d, "words.lounge", "Two visits a year");
  caSet(d, "rate.dining", "4");
  caSet(d, "rate.gas", "2");
  caSet(d, "rate.gas", "");
  caSet(d, "earn.base", "1.5");
  caSet(d, "credits.0.name", "Dining credit");
  caSet(d, "credits.0.value", "120");
  caSet(d, "unique.0.label", "A thing only this card has");
  caSet(d, "unique.0.words", "In plain words");
  const D1 = cardClean(d);
  chk(
    "each path of the form reaches the card",
    D1.bank === "Test Bank" &&
      D1.fee === 0 &&
      D1.has.lounge &&
      D1.hasWords.lounge === "Two visits a year" &&
      D1.earn.rates.length === 1 &&
      D1.earn.rates[0].x === 4 &&
      D1.earn.base === 1.5 &&
      D1.credits[0].value === 120 &&
      D1.unique[0].label === "A thing only this card has"
  );
  caSet(d, "has.lounge", "0");
  chk("a switch can go off again", !cardClean(d).has.lounge);
  /* limits and picks */
  caSet(d, "cap.dining", "6000");
  caSet(d, "per.dining", "year");
  caSet(d, "then.dining", "1");
  caSet(d, "rate.dining", "6");
  d.earn.picks.push({ from: [] });
  caSet(d, "picks.0.x", "5");
  caSet(d, "picks.0.count", "1");
  caSet(d, "pickfrom.0.gas", "1");
  caSet(d, "pickfrom.0.travel", "1");
  caSet(d, "pickfrom.0.travel", "0");
  caSet(d, "pickfrom.0.groceries", "1");
  caSet(d, "picks.0.cap", "500");
  caSet(d, "picks.0.per", "month");
  const D2 = cardClean(d),
    r0 = D2.earn.rates[0],
    k0 = D2.earn.picks[0];
  chk(
    "a limit on a rate is kept as numbers, and a new rate keeps the limit",
    r0.cat === "dining" && r0.x === 6 && r0.cap === 6000 && r0.per === "year" && r0.then === 1
  );
  chk(
    "a pick: the rate, how many, the list, and its limit",
    k0.x === 5 && k0.count === 1 && k0.from.join() === "gas,groceries" && k0.cap === 500 && k0.per === "month"
  );
  const E1 = cardEarnYear(D2, { dining: 800, gas: 600, groceries: 100 }, 1000);
  chk(
    "what the card earns in a year: the limit, the pick on the bigger category, the base on the rest",
    E1.rows.find(r => r.cat === "dining").earned === 6000 * 6 + 3600 * 1 &&
      E1.rows.find(r => r.cat === "gas").earned === 6000 * 5 + 1200 * 1.5 &&
      E1.rows.find(r => r.cat === "groceries").earned === 1200 * 1.5 &&
      E1.rows.find(r => r.cat === "").earned === 12000 * 1.5 &&
      E1.sum === E1.rows.reduce((t, r) => t + r.earned, 0),
    JSON.stringify(E1)
  );
  chk(
    "a rate with no limit has no limit keys",
    !("cap" in cardClean({ earn: { rates: [{ cat: "gas", x: 2, cap: "" }] } }).earn.rates[0])
  );
  caSet(d, "rate.hotel", "7");
  caSet(d, "brand.hotel", " Hilton ");
  chk(
    "the brand of a hotel rate is kept",
    cardClean(d).brand.hotel === "Hilton" &&
      caFormHTML(d).includes('data-f="brand.hotel"') &&
      !caFormHTML(d).includes('data-f="brand.airline"')
  );
  /* a shared limit: 5% on two categories, on the first $25,000 a year together */
  const sh = cardClean({
      earn: {
        base: 1,
        rates: [
          { cat: "phone", x: 5, cap: 25000, per: "year", share: "a" },
          { cat: "online", x: 5, cap: 25000, per: "year", share: "a" },
          { cat: "gas", x: 2 },
        ],
      },
    }),
    alone = cardClean({
      earn: {
        base: 1,
        rates: [
          { cat: "phone", x: 5, cap: 25000 },
          { cat: "online", x: 5, cap: 25000 },
        ],
      },
    }),
    big = { phone: 20000 / 12, online: 20000 / 12, gas: 100 },
    near = (a, b) => Math.abs(a - b) < 1e-6;
  chk("the letter of a shared limit is kept", sh.earn.rates[0].share === "A" && !("share" in sh.earn.rates[2]));
  chk(
    "a shared limit counts one time for the rates together",
    near(cardEarnYear(sh, big, 0).sum, 25000 * 5 + 15000 * 1 + 1200 * 2) &&
      near(cardEarnYear(alone, big, 0).sum, 40000 * 5 + 1200 * 1)
  );
  chk(
    "under the shared limit, nothing changes",
    near(cardEarnYear(sh, { phone: 500, online: 500 }, 0).sum, cardEarnYear(alone, { phone: 500, online: 500 }, 0).sum)
  );
  caSet(d, "share.dining", "b");
  chk(
    "the form has the box for a shared limit, and it reaches the card",
    caFormHTML(d).includes('data-f="share.dining"') &&
      cardClean(d).earn.rates.find(r => r.cat === "dining").share === "B"
  );
  const form2 = caFormHTML(d);
  chk(
    "the form shows the limit of a category that has a rate, and the pick with its list",
    form2.includes('data-f="cap.dining"') &&
      form2.includes('data-f="per.dining"') &&
      !form2.includes('data-f="cap.transit"') &&
      form2.includes('data-f="picks.0.x"') &&
      form2.includes('data-a="capick" data-k="0" data-c="gas" data-v="0"') &&
      form2.includes('data-a="capick" data-k="0" data-c="travel" data-v="1"') &&
      clean(form2),
    junk(form2)
  );
  const form = caFormHTML(d);
  chk(
    "the form: each switch, each category, the unique list, and where it comes from",
    T.toggles.every(t => form.includes('data-k="' + t.k + '"')) &&
      T.cats.every(c => form.includes('data-f="rate.' + c[0] + '"')) &&
      form.includes("What is unique") &&
      form.includes('data-f="unique.0.words"') &&
      form.includes('data-f="source"') &&
      form.includes('data-f="checked"') &&
      clean(form),
    junk(form)
  );
  chk(
    "each field has its label above it",
    (form.match(/<label for=/g) || []).length === (form.match(/<(input|select) id=/g) || []).length
  );
  chk(
    "the form says what is still needed",
    form.includes("Still needed before you can save") && caNeeds(d).length === 2
  );
  chk(
    "the detail of a switch shows only when the switch is on",
    !form.includes('data-f="words.lounge"') && caFormHTML(caSet(d, "has.rental", "1")).includes('data-f="words.rental"')
  );
  (async () => {
    await caLoad();
    chk(
      "with no saved card, the section shows the count of the file and the button",
      CA.ready &&
        !CA.missing &&
        caHTML().includes(CARDS2026.offers.length + " cards come with the game") &&
        caHTML().includes('data-a="canew"')
    );
    CA.edit = d;
    await caClick({ dataset: { a: "casave" } });
    chk("a card that still needs something is not saved", !db.calls.some(c => c[0] === "upsert") && CA.edit === d);
    caSet(d, "source", "The page of the bank");
    caSet(d, "checked", "2026-11-23");
    await caClick({ dataset: { a: "casave" } });
    chk(
      "a ready card is saved to the table card_library, as a clean record",
      db.calls.some(c => c[0] === "from" && c[1] === "card_library") &&
        db.rows.length === 1 &&
        db.rows[0].id === "test-bank-form-card" &&
        db.rows[0].data.fee === 0 &&
        CA.edit === null &&
        CA.msg.startsWith("Saved")
    );
    chk("the list shows it as added by the admin", caRows()[0].kind === "new" && caHTML().includes("Added by you"));
    await caClick({ dataset: { a: "cahide", k: "test-bank-form-card" } });
    chk(
      "Hide marks the card hidden, and the library leaves it out",
      db.rows[0].data.hidden === true &&
        caRows()[0].kind === "hidden" &&
        cardMerge(
          CARDS2026.offers,
          db.rows.map(r => r.data)
        ).every(c => c.id !== "test-bank-form-card")
    );
    await caClick({ dataset: { a: "cahide", k: "test-bank-form-card" } });
    chk(
      "Show brings it back",
      !db.rows[0].data.hidden &&
        cardMerge(
          CARDS2026.offers,
          db.rows.map(r => r.data)
        ).some(c => c.id === "test-bank-form-card")
    );
    /* change a card of the file: the id stays */
    const first = CARDS2026.offers[0];
    caInput({ dataset: { f: "@from" }, value: first.id });
    chk(
      "start from a card of the library: the draft is a copy, and the file is not changed",
      CA.edit && CA.edit.n === first.n && CA.was === first.id && CA.edit !== first
    );
    caSet(CA.edit, "n", first.n + " Plus");
    caSet(CA.edit, "source", "The page of the bank");
    await caClick({ dataset: { a: "casave" } });
    const rep = db.rows.find(r => r.id === first.id);
    chk(
      "a changed card keeps its id, so it replaces the card of the file",
      rep &&
        rep.data.n === first.n + " Plus" &&
        caRows().find(r => r.id === first.id).kind === "replaces" &&
        CARDS2026.offers[0].n === first.n
    );
    await caClick({ dataset: { a: "caask", k: first.id } });
    chk("Remove asks one time first", caHTML().includes("Yes, remove") && db.rows.length === 2);
    await caClick({ dataset: { a: "cadel", k: first.id } });
    chk(
      "after Yes, the row is gone and the card of the file is back",
      db.rows.length === 1 &&
        cardMerge(
          CARDS2026.offers,
          db.rows.map(r => r.data)
        ).find(c => c.id === first.id).n === first.n
    );
    db.fail = true;
    await caLoad();
    chk(
      "a database with no table says what to do, and the page still works",
      CA.missing && caHTML().includes("docs/game-addons.sql") && !caHTML().includes('data-a="canew"')
    );
    const page = fs.readFileSync(GAME_DIR + "admin.html", "utf8"),
      sql = fs.readFileSync(GAME_DIR + "../docs/game-addons.sql", "utf8");
    chk(
      "admin.html loads the template, the library and the form, and calls each part",
      /data\/cardtemplate\.js/.test(page) &&
        /data\/cards2026\.js/.test(page) &&
        /account\/cardadmin\.js/.test(page) &&
        page.includes("caHTML()") &&
        page.includes("caLoad()") &&
        page.includes("caClick(t)") &&
        page.includes("caInput(")
    );
    chk(
      "the database: everyone reads, only the admin writes",
      /create table if not exists card_library/.test(sql) &&
        /for select to anon, authenticated using \(true\)/.test(sql) &&
        (sql.match(/on card_library for (insert|update|delete)[^;]*is_admin\(\)/g) || []).length === 3
    );
  })();
}
