/* ============================================================================
   SLAM the Game, test: tests/graduate-page.js
   PURPOSE     Examine the Graduate page (run CC-1, item 20): three kinds of professional, one line
               each on when you need one, an "i" on each term, names that are marked as placeholders
               until the owner adds one, no name of a real person or firm, no link that pays, and the
               row of the menu.
   INPUT       The game scripts, loaded by harness.cjs. The sample game.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: features/graduate.js.
   ========================================================================= */
{
  const G0 = G;
  G = clone(G0);
  X("gradpage");
  let h = ov();
  const txt = h.replace(/<[^>]+>/g, " ");
  chk(
    "three kinds, in the order of the brief",
    GRAD_TYPES.map(T => T.id).join() === "cpa,estate,cfp" && (h.match(/data-grad="/g) || []).length === 3
  );
  chk(
    "each kind has one line on when you need one",
    GRAD_TYPES.every(T => /^You need one when /.test(T.when) && T.when.split(". ").length === 1)
  );
  chk(
    "each term has an i",
    ["gradcpa", "gradestate", "gradcfp"].every(k => h.includes("term:" + k) && GLOSS[k])
  );
  chk(
    "the names are behind one tap, closed",
    (h.match(/<details class="math"><summary>What to ask, and names/g) || []).length === 3
  );
  chk(
    "no name yet: each slot is marked Placeholder",
    (h.match(/data-gradph=/g) || []).length === 3 * GRAD_SLOTS &&
      (h.match(/>Placeholder</g) || []).length === 3 * GRAD_SLOTS
  );
  chk(
    "the owner's lists are empty: no person or firm is made up",
    Object.keys(GRAD_NAMES).join() === "cpa,estate,cfp" && Object.values(GRAD_NAMES).every(a => a.length === 0)
  );
  chk("the page says the names are placeholders", /The names are placeholders for now/.test(txt));
  chk("no link leaves the page while the lists are empty", !/<a /.test(h));
  chk("it says no one pays to be listed", /No one pays to be on this page/.test(txt));
  chk("one filled button", (h.match(/class="primary/g) || []).length === 1);
  chk("no verdict word and no defect", !/\b(mistake|failed|behind|off track)\b/i.test(txt) && clean(h), junk(h));
  X("close");
  GRAD_NAMES.cpa.push({ name: "Made-up Tax Help", place: "Online", link: "https://example.org/" });
  X("gradpage");
  h = ov();
  chk(
    "a name the owner adds shows, with its place and a plain link",
    /<b>Made-up Tax Help<\/b>/.test(h) &&
      /Online/.test(h) &&
      /href="https:\/\/example\.org\/"[^>]*rel="noopener"/.test(h)
  );
  chk(
    "the other kinds keep their placeholders",
    (h.match(/data-gradph=/g) || []).length === 2 * GRAD_SLOTS && !/The names are placeholders for now/.test(h)
  );
  GRAD_NAMES.cpa.length = 0;
  X("close");
  const rows = menuItems().map(m => m[1]);
  chk(
    "the menu has the row, for a player",
    rows.includes("gradpage") && menuGroups(menuItems()).some(g => g.items.some(m => m[1] === "gradpage"))
  );
  G = G0;
}
