/* ============================================================================
   SLAM the Game, test: tests/sync-no-change-lost.js
   PURPOSE     Examine the sync between two devices and a coach. Each person has a stamp of the last
               real change. When two copies of a game meet, the later copy of each person wins, and no
               open task is lost. A save that fails is sent again.
   INPUT       The game scripts, loaded by harness.cjs. Sample profiles. No database.
   OUTPUT      One result for each chk() call.
   DEPENDS ON  tests/harness.cjs. Examines: account/cloud.js (clSig, clStampPeople, clMergePerson,
               clMergeChars, clSendNow), account/coachpage.js (cpAssign).
   ========================================================================= */
{
  const fs = require("fs"),
    n0 = G.chars.length,
    demo0 = G.demo,
    task = (id, t, st) => ({
      id,
      t,
      s: "",
      a: "",
      v: "",
      mins: 5,
      when: "2026-11-24",
      slot: "Any",
      st: st || "todo",
      made: "2026-11-24",
    }),
    mk = (name, o) =>
      Object.assign(newChar(), { name, led: true, placed: true, take: 4000, spend: 3000, x: { plan: [] } }, o || {}),
    copy = c => JSON.parse(JSON.stringify(c));
  require("vm").runInThisContext(fs.readFileSync(GAME_DIR + "account/coachpage.js", "utf8"), {
    filename: "account/coachpage.js",
  });
  G.demo = false;
  G.chars.push(mk("Ann"), mk("Ben"));
  G.active = n0;
  clSigAll();
  /* THE STAMP */
  const ann = G.chars[n0],
    ben = G.chars[n0 + 1];
  save();
  chk("a save with no change does not stamp a person", ann.mod == null && ben.mod == null);
  ann.take = 4500;
  save();
  chk(
    "a real change stamps that person, and only that person",
    ann.mod > 0 && ben.mod == null,
    JSON.stringify([ann.mod, ben.mod])
  );
  const m1 = ann.mod;
  save();
  chk("the next save with no change keeps the stamp", ann.mod === m1);
  chk("the stamp is not part of what is compared", clSig(ann) === clSig(Object.assign(copy(ann), { mod: 1 })));

  /* ONE PERSON, TWO COPIES */
  const phone = mk("Cy", { take: 5000, mod: 200, x: { plan: [task("p1", "A task from the phone")] } }),
    cloud = mk("Cy", {
      take: 4000,
      mod: 100,
      x: { plan: [task("c1", "A quest from the coach"), task("c2", "An old task", "done")] },
    });
  let m = clMergePerson(phone, cloud);
  chk("the later copy of a person wins", m.take === 5000);
  chk(
    "and gets the open tasks of the other copy",
    m.x.plan.map(p => p.id).join() === "p1,c1",
    m.x.plan.map(p => p.id).join()
  );
  chk("a task that is done on the other copy is not brought back", !m.x.plan.some(p => p.id === "c2"));
  m = clMergePerson(
    mk("Cy", { take: 5000, mod: 100, x: { plan: [task("p1", "Phone")] } }),
    mk("Cy", { take: 4000, mod: 300, x: { plan: [task("c1", "Coach")] } })
  );
  chk(
    "when the account has the later copy, it wins, and the phone's open task stays",
    m.take === 4000 && m.x.plan.map(p => p.id).join() === "c1,p1"
  );
  chk("two copies that are the same need no merge", clMergePerson(mk("Cy", { mod: 5 }), mk("Cy", { mod: 5 })) === null);
  chk(
    "the same task on both sides is not added two times",
    clMergePerson(
      mk("Cy", { mod: 9, x: { plan: [task("t", "T")] } }),
      mk("Cy", { mod: 1, x: { plan: [task("t", "T")] } })
    ) === null
  );

  /* THE CASE OF THE QUESTION: the client changed a number with no internet. The coach then assigned a quest. */
  const before = mk("Dee", { take: 4000, mod: 100 }),
    onPhone = Object.assign(copy(before), { take: 4200, mod: 500 }) /* a change on the phone, not sent yet */,
    account = { chars: [copy(before)] };
  cpAssign(account, 0, CP_QUESTS[1], "2026-11-24", 900); /* later, the coach adds a quest in the account */
  chk(
    "a quest from the coach does not move the stamp of the person",
    account.chars[0].mod === 100 && account.savedAt === 900
  );
  /* the phone comes back: the account is newer as a whole, so the phone takes it, then puts its own people in */
  const pulled = { chars: account.chars.map(c => Object.assign(newChar(), copy(c))), gone: [] },
    n = clMergeChars(pulled, { chars: [onPhone] });
  chk(
    "the phone's number is kept and the coach's quest is there: nothing is lost",
    n === 1 && pulled.chars[0].take === 4200 && pulled.chars[0].x.plan.some(p => p.t === CP_QUESTS[1].t),
    JSON.stringify([n, pulled.chars[0].take, pulled.chars[0].x.plan.length])
  );
  /* the other way: the phone is newer as a whole, and merges the account in */
  const local = { chars: [Object.assign(newChar(), copy(onPhone))], gone: [] };
  clMergeChars(local, account);
  chk(
    "the same result when the phone is the newer side",
    local.chars[0].take === 4200 && local.chars[0].x.plan.some(p => p.t === CP_QUESTS[1].t)
  );
  /* a person that only one side has is still added */
  const both = { chars: [mk("Eve")], gone: [] };
  chk(
    "a person that only the account has is added",
    clMergeChars(both, { chars: [mk("Eve"), mk("Flo")] }) === 1 && both.chars.length === 2
  );
  chk(
    "a person who was removed stays removed",
    clMergeChars({ chars: [mk("Eve")], gone: ["Flo"] }, { chars: [mk("Flo")] }) === 0
  );

  /* NO SAVE IS DROPPED */
  const src = fs.readFileSync(GAME_DIR + "account/cloud.js", "utf8");
  chk("a save that fails is sent again", /CLOUD\.retry = setTimeout\(clPush, 15000\)/.test(src));
  chk(
    "a waiting save is sent at once when the page hides or closes, and when the internet is back",
    /else clSendNow\(\)/.test(src) && /"pagehide", \(\) => clSendNow\(\)/.test(src) && /"online"/.test(src)
  );
  chk("with no account, send-now does nothing", clSendNow() === undefined);
  chk(
    "after a merge, the people are taken as seen, so two devices do not send to each other without end",
    /clMergeChars\(G, \{ chars: mine \}\);\s*clSigAll\(\);/.test(src)
  );
  G.chars.length = n0;
  G.active = 0;
  G.demo = demo0;
  clSigAll();
  save();
}
