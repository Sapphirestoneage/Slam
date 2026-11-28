/* ============================================================================
   SLAM the Game: data/toollib.js
   PURPOSE     Data only. The standalone tool pages of the web app (the pages at the top of the
               repository), for the menu group "Tool library" (Batch B, phase 5): the address of each
               page, its name, and its group. No logic.
   INPUT       Nothing.
   OUTPUT      Constants: TOOL_LIB_GROUPS (id, name), TOOL_LIB (page, name, group id), TOOL_LIB_SKIP (the
               pages that are not a tool for a player, each with the reason), TOOL_LIB_HELD (how many
               pages are held out because they belong to an add-on: a count, no names).
   DEPENDS ON  Nothing. features/firstweek.js draws the group.
   RULES       GENERATED FILE. Do not edit it. The groups and names are those of the web app's front door
               (js/solo/hub.js) and of SOLO in js/solo.js. tools/game_toollib_build.mjs makes it. Add a
               page to the front door, then run the tool. game/tests/first-week.js fails when a page at
               the top of the repository is in neither list.
   SOURCE-HASH  d9e63303620e91c5
   ========================================================================= */
const TOOL_LIB_GROUPS = [["path","The path, one thing at a time"],["explore","Bigger tools"],["small","Small calculators"],["quick","Quick calculators"],["frameworks","Frameworks"],["gig","Working for yourself"],["family","Family money"],["estate","Estate and marriage"],["hard","Hard moments"]];
const TOOL_LIB = [
  ["first.html","What is my first move?","path"],
  ["end.html","Start at the finish line","path"],
  ["quiz.html","How do I handle money?","path"],
  ["debt.html","When am I debt free?","path"],
  ["runway.html","How long would my money last?","path"],
  ["skills.html","Where am I on the skill tree?","path"],
  ["return.html","Read my papers","explore"],
  ["cards.html","Is this card right for me?","explore"],
  ["drills.html","Money fire drills","explore"],
  ["ladder.html","If the pay stopped","explore"],
  ["trip.html","What does this trip really cost?","explore"],
  ["peers.html","You and people like you, private","explore"],
  ["invest.html","Your investments, all together","explore"],
  ["habit.html","What does this habit cost?","explore"],
  ["loan.html","What does this loan really cost?","explore"],
  ["aliyah.html","US vs Israel: what does the move do to my money?","explore"],
  ["afford.html","Can I afford it?","explore"],
  ["cost.html","What is my debt really costing me?","explore"],
  ["student.html","Which student loan plan costs least?","explore"],
  ["career.html","Does this course or degree pay back?","explore"],
  ["giving.html","Giving: what it costs and how to plan it","explore"],
  ["years.html","Working years in my savings rate","small"],
  ["coast.html","Could I stop saving?","small"],
  ["dollar.html","What is a dollar worth later?","small"],
  ["car.html","Does this car fit?","small"],
  ["home.html","How much home fits?","small"],
  ["worth.html","Where should my net worth be?","small"],
  ["wage.html","What do I really earn an hour?","small"],
  ["split.html","How does my month split?","small"],
  ["glance.html","My month at a glance","quick"],
  ["hysa.html","A high-yield savings account","quick"],
  ["dca.html","All at once, or a little each month?","quick"],
  ["timemachine.html","Starting at 22 or 32","quick"],
  ["waiting.html","What waiting to start costs","quick"],
  ["cutinvest.html","Cut it, or invest it?","quick"],
  ["consolidate.html","One loan for my debts?","quick"],
  ["w4.html","Refund or owe: my W-4","quick"],
  ["jobless.html","Unemployment and my runway","quick"],
  ["leave.html","Leave my job or start a business","quick"],
  ["apartment.html","My first apartment","quick"],
  ["roommates.html","Splitting the rent","quick"],
  ["kids.html","A child, year by year","quick"],
  ["pet.html","What a pet costs","quick"],
  ["inflation.html","My own inflation rate","quick"],
  ["peruse.html","Cost per use","quick"],
  ["worthit.html","Is it worth it, or was it?","quick"],
  ["hassle.html","Worth the hassle?","quick"],
  ["warranty.html","Is this warranty worth it?","quick"],
  ["swan.html","How much cash lets me sleep?","frameworks"],
  ["trust.html","Should I trust this advice?","frameworks"],
  ["peak.html","When should my net worth peak?","frameworks"],
  ["zerotax.html","$0 federal tax in early retirement","frameworks"],
  ["earned.html","Every dollar I have earned","frameworks"],
  ["freelance.html","The least I can charge","gig"],
  ["setaside.html","The tax in each payment","gig"],
  ["invoices.html","Who still owes me?","gig"],
  ["gigretire.html","Solo 401(k), SEP or IRA","gig"],
  ["gigapps.html","Do my apps add up?","gig"],
  ["profitfirst.html","Profit First for side income","gig"],
  ["sandwich.html","Money to my parents and kids at once","family"],
  ["boomerang.html","Living at home: what it saves","family"],
  ["tuition.html","Kids and tuition: childcare, school, a 529","family"],
  ["untangle.html","Untangling what you shared","hard"],
  ["roomexit.html","A roommate is moving out","hard"],
  ["grief.html","After a death: the first 90 days","hard"],
  ["widowed.html","When your partner has died","hard"],
  ["medicalbills.html","Medical bills: words to use","hard"],
  ["sayno.html","Saying no to lending money","hard"],
  ["crisis.html","After a fire, a flood or an eviction","hard"],
  ["safety.html","A money plan, kept private","hard"],
  ["heirs.html","What would my people receive?","estate"],
  ["married.html","Married or partners?","estate"],
];
const TOOL_LIB_SKIP = {"index.html":"the web app itself, not one tool","start.html":"the whole plan of the web app: a second home for the same numbers the game keeps","pro.html":"for coaches and planners; a player never sees a coach feature","staples.html":"a page of example numbers for the owner, not a tool"};
const TOOL_LIB_HELD = 11;
