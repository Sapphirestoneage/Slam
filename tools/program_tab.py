# SPDX-License-Identifier: AGPL-3.0-only
"""Write the spec's Program tab from js/registry/program.js, so the spec and the code say the same thing.

  python3 tools/program_tab.py
  python3 tools/xlsx_to_csv.py

Rewrites the Program tab of spec/SLAM Build Spec.xlsx (sessions and their checklists, levels, weights, pace, unlocks,
confidence, and the Home layout). test/program.test.js checks spec/csv/Program.csv against the registry.
"""
import json
import subprocess
from copy import copy
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "spec" / "SLAM Build Spec.xlsx"
TAB = "Program"

READ = """
import { LEVELS, WEIGHTS, PACE, UNLOCKS, CONFIDENCE, FI_RANGE, SESSIONS, MONEY_DATES, REVIEW, AGENDA, HOMEWORK_STATUSES } from './js/registry/program.js';
import { AREAS, RATINGS, THRESHOLDS, PAYOFF, FOO_ORDER } from './js/registry/scorecard.js';
import { ORDER, STEP_WORDS, PREREQS, CONDITIONS } from './js/registry/foo.js';
import { STEPS, MARKERS, LADDER } from './js/registry/ladder.js';
import { MODES, PERSONS, ONE_PERSON_TYPES } from './js/registry/couples.js';
import { METHODS, SUGGEST } from './js/registry/debt.js';
import { JOY, CONFIDENCE as CONF_MEASURE } from './js/registry/joy.js';
const prereqs = Object.fromEntries(Object.entries(PREREQS).map(([k, p]) => [k, { ...p, conditions: (p.conditions || []).map(c => CONDITIONS[c].label) }]));
console.log(JSON.stringify({ LEVELS, WEIGHTS, PACE, UNLOCKS, CONFIDENCE, FI_RANGE, SESSIONS, MONEY_DATES, REVIEW, AGENDA, HOMEWORK_STATUSES, SCORE: { AREAS: AREAS.map(a => ({ ...a, fooWhen: a.fooWhen ? 'moves with the facts' : null })), RATINGS, THRESHOLDS, PAYOFF, FOO_ORDER }, FOO: { ORDER, STEP_WORDS, PREREQS: prereqs }, LADDER: { STEPS, MARKERS, LADDER }, COUPLES: { MODES, PERSONS, ONE_PERSON_TYPES }, DEBT: { METHODS, SUGGEST }, JOY, CONF: CONF_MEASURE }));
"""
RULE_WORDS = {
    "cashFlow": "The headline savings rate: Strong at or over strong, OK at or over ok, else Hole; a negative surplus is a Hole",
    "emergency": "The cash layers: Hole until little e is full ($1,000 or the highest deductible, whichever is smaller); OK with little e full; Strong with big e full or strongMonths of spending (answer 132)",
    "debt": "Heavy debt (cards, payday, personal, medical, BNPL, or any APR at or over the heavy line) is a Hole; low-rate debt with payments over dti of gross is OK; else Strong (no debt per About you is Strong)",
    "credit": "Cards used over utilizationHole (30%) is a Hole; a score under ok is a Hole; a score at or over strong is Strong; else OK; no score stays unrated (answer 132)",
    "retirement": "Match left on the table is a Hole; 401(k), HSA and after-tax retirement saving at or over strongPct of gross is Strong; some is OK; none while employed is a Hole",
    "investing": "What goes into investments a month at or over strongPct of take-home is Strong; something invested or going in is OK; nothing with a take-home known is a Hole",
    "taxes": "No rule: the coach rates it after a look at Taxes",
    "protection": "No health coverage (or no life or disability with dependents) is a Hole; a missing or Not sure coverage is OK; all in place is Strong; no coverage rows stays unrated",
    "income": "Between jobs is a Hole; steady income is Strong; varies or unpredictable is OK; no take-home or no stability answer stays unrated",
    "goals": "count short-term and count long-term goals complete is Strong; any goal is OK; none is a Hole",
    "mindset": "The latest money feeling: at or over strong is Strong, at or under hole is a Hole, between is OK; none stays unrated",
}
PAYOFF_WORDS = {
    "cashFlow": "The gap to the ok savings rate: ok times take-home minus the surplus, times 12",
    "emergency": "The gap to months of spending, carried on a card at the typical card APR",
    "debt": "Interest a year on the heavy debt (balance times APR, added up)",
    "credit": "aprPoints more APR on every debt balance",
    "retirement": "The match left on the table a year, plus (with nothing going in) the tax saved by putting targetPct of gross away before tax at the marginal rate",
    "investing": "Cash above the emergency target plus a surplus not invested, a year, grown at the real return",
    "taxes": "No rule: the coach types a payoff", "protection": "No rule: the coach types a payoff", "income": "No rule: the coach types a payoff",
    "goals": "No rule: the coach types a payoff", "mindset": "No rule: the coach types a payoff",
}
LEVEL_WORDS = {
    "Missing": "Nothing typed (or parked with I'll find it later)",
    "Gut": "A guess: a starter line, Not sure, or the gut spending number",
    "Rough": "Marked Roughly",
    "Estimate": "Typed and Know it",
    "Actual": "Confirmed: a month of actuals on a Budget line, a balance from a statement or the bank, or locked by the coach",
}
WEIGHT_WORDS = {
    "income": "Each income row's take-home", "debtBalance": "Each debt's balance", "debtApr": "Each debt's APR",
    "account": "Each account's balance", "thing": "Each home, car or other thing's value",
    "gut": "The gut spending number, standing in for the categories until the lines are the source",
    "draftt": "Each DRAFTT category of Budget lines (the average of its lines' levels)", "otherLines": "The other Budget lines, as one item",
    "age": "Age (About you)", "areas": "What you have today (About you)",
}
HOME = [
    ("One nav row", "The five tabs (Home, Net worth, Cash flow, Plan, Report). Home has no sub-tab row; About you is a link in the strip and shows the bar with the way back"),
    ("Session strip", "Client name, About you, 'Session N of 12 · name', Next session date, client status; Start session (the one main button) switches the session on: Next step, End session, minutes left, Show all fields"),
    ("Path", "Twelve nodes, done ones ticked, the current one outlined; a node opens its checklist. Auto items tick from the numbers; the rest are checkboxes; placeholder sessions can be renamed and their checklists edited"),
    ("Picture bar", "Picture N% with Ahead, On track or Catch up and the pace sentence; By section opens one bar per section"),
    ("Next small things", "Three cards: +X%, the number, its level now and the step; a button opens the exact field"),
    ("Money in one line", "Net worth, monthly surplus, savings rate, and the FI date locked (with the plain reason) or unlocked (with a confidence label)"),
    ("Hidden when empty", "Payday, open items, the cash dip, runway, Day 0 vs now and net worth over time show only when they have something to say"),
    ("More menu", "Undo, redo, Add anything and the parking lot sit behind one labeled More button in the top bar"),
    ("End session", "Saves the snapshot (Day 0 the first time, End of session N after), the homework, the one-pager, the next date and a backup; then Send summary"),
]


def main():
    cfg = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", READ], cwd=ROOT))
    wb = openpyxl.load_workbook(SPEC)
    head_src = wb["Math"]["A2"]
    title_src = wb["Math"]["A1"]
    body_src = wb["Math"]["A3"]
    if TAB in wb.sheetnames:
        del wb[TAB]
    ws = wb.create_sheet(TAB, index=wb.sheetnames.index("Math") + 1)
    rows = []

    def title(text):
        rows.append(("title", [text]))

    def head(*cells):
        rows.append(("head", list(cells)))

    def row(*cells):
        rows.append(("body", list(cells)))

    title("Program: the 12 sessions, every number's level, the Picture %, the pace, what unlocks when, and the Scorecard (Phase 3, Nov 5 2026)")
    head("Section", "Item", "Detail", "Notes")
    row("Sessions", "", "Each client has a 12-session program. A session's checklist ticks itself from the data where it can (auto); the rest are checkboxes. Done when every item is ticked.", "js/registry/program.js SESSIONS; js/program.js autoChecks")
    for i, s in enumerate(cfg["SESSIONS"], 1):
        items = "; ".join(f"{it['label']} ({'auto' if it.get('auto') else 'manual'})" for it in s["items"])
        if s.get("itemsWhenClear"):
            items += "; once no hole is left: " + "; ".join(f"{it['label']} ({'auto' if it.get('auto') else 'manual'})" for it in s["itemsWhenClear"])
        note = "Placeholder: the name and checklist can be edited on Home" if s.get("placeholder") else "Pulls the top hole on the Scorecard when it starts" if s.get("hole") else ""
        row("Sessions", f"S{i} {s['name']}", items, note)
    row("Levels", "", "Each number has a level, in points. The Picture % is the weighted average of every number's level.", "M73; js/registry/program.js LEVELS")
    for k, v in cfg["LEVELS"].items():
        row("Levels", k, str(v), LEVEL_WORDS[k])
    row("Weights", "", "Big items count more. A missing big thing (no income row yet) is one item at Missing, so an empty client reads 0%.", "js/registry/program.js WEIGHTS")
    for k, v in cfg["WEIGHTS"].items():
        row("Weights", k, str(v), WEIGHT_WORDS[k])
    row("Pace", "", "The Picture % expected by the end of each session; later sessions hold the session 3 mark. Ahead: at or past this session's mark. On track: within the margin of what was due by now. Catch up: below it.", "js/registry/program.js PACE")
    for n in range(1, len(cfg["SESSIONS"]) + 1):
        row("Pace", f"S{n}", f"{cfg['PACE']['expected'].get(str(n), cfg['PACE']['hold'])}%", "")
    row("Pace", "Margin", f"{cfg['PACE']['margin']} points", "")
    row("Unlocks", "", "A calculator shows locked, with a plain reason ('Unlocks when spending reaches Estimate (2 of 5 there)'), until every item in each group is at or above the level.", "js/registry/program.js UNLOCKS")
    for k, u in cfg["UNLOCKS"].items():
        row("Unlocks", u["label"], "; ".join(f"{n['label']} (every {n['group']} item at {n['min']}+)" for n in u["needs"]), "")
    row("Confidence", "", f"Once unlocked: High at a weighted input level of {cfg['CONFIDENCE']['high']} or more, Medium at {cfg['CONFIDENCE']['medium']} or more, else Low; any input older than the aged-check days drops it one step. Shown instead of the Guess tag.", "js/registry/program.js CONFIDENCE")
    row("Snapshots", "", "Ending a session saves a snapshot with the key numbers and the Picture %: Day 0 the first time, End of session N after. They live in the client file, so they export and import with it.", "js/program.js endSession")
    for k, v in HOME:
        row("Home", k, v, "")
    row("Home", "After intake", "Once session 3 is done the progress bar reads 'X of 11 areas Strong or OK (Day 0: Y)'; the top holes show; a filled hole shows before and after with the FI days gained; the next chapter opens when no hole is left; the Game plan session takes next-year notes, a yearly review date and the monthly money date", "js/program.js afterIntake, filledHoles")
    row("Home", "Money date cadences", "; ".join(cfg["MONEY_DATES"]), "js/registry/program.js MONEY_DATES")
    # The scorecard (batch 2).
    sc = cfg["SCORE"]
    row("Scorecard", "", "Eleven areas, each Strong, OK or Hole. A rule suggests the rating from the data where it can; the coach can override any rating with a reason. Add or rename an area in js/registry/scorecard.js.", "M74; js/math/scorecard.js; Plan › Scorecard")
    for a in sc["AREAS"]:
        row("Scorecard", a["name"], RULE_WORDS[a["id"]], f"FOO step {a['foo']}; the usual effort {a['effort']} h; {a['route']}")
    for area, t in sc["THRESHOLDS"].items():
        for k, v in t.items():
            row("Thresholds", f"{area} {k}", str(v), "")
    row("Holes", "", "Each hole shows its payoff (dollars a year, hours of work, FI days: the $ / Hours / FI days view), an effort in hours (the usual, editable per client), and the best-return score = payoff over effort. Ranked: holes before the client's current FOO step first, then by score. 'How we got this' shows the math behind a caret. Strong areas show as slim rows.", "js/math/scorecard.js")
    for a in sc["AREAS"]:
        row("Holes", f"{a['name']} payoff", PAYOFF_WORDS[a["id"]], "; ".join(f"{k} {v}" for k, v in sc["PAYOFF"].get(a["id"], {}).items()))
    row("Holes", "Ranking", "FOO order " + ", ".join(sc["FOO_ORDER"]) + "; parked holes last (Park it, with an optional note; unpark any time); a hole with no payoff last before them, with an Add payoff button; then holes before the client's step first, then by best return, then by payoff (answers 133, 136)", "")
    row("Holes", "The next chapter", "Opens on Home once no open hole is left (a parked hole does not block); unrated areas show a nudge: Rate Taxes to be sure (answer 137)", "")
    # The area-to-FOO mapping (answer 135).
    for a in sc["AREAS"]:
        row("FOO mapping", a["name"], f"Step {a['foo']}: {a['fooWords']}" + (" (moves with the facts)" if a.get("fooWhen") else ""), "")
    # SLAM's own FOO and its prerequisites (batch 3).
    foo = cfg["FOO"]
    row("FOO", "", "SLAM's own order of operations. A step can declare a prerequisite step (reached first: every step before it that counts is done) and conditions on the numbers. A locked step shows a lock and its plain reason, is never where you are, and never counts as a hole. Unlock anyway needs a note (kept on the session record) and shows the cost in FI days a year, coach only.", "js/registry/foo.js; js/math/foo.js")
    for sid in foo["ORDER"]:
        p = foo["PREREQS"].get(sid)
        pre = "" if not p else (f"after step {p['after']}" if p.get("after") else "no step first") + (f"; needs {' and '.join(p['conditions'])}" if p.get("conditions") else "") + f". Lock text: {p['label']}"
        row("FOO", f"Step {sid}", foo["STEP_WORDS"][sid], pre)
    # The agenda, homework and the review gate (batch 3).
    row("Agenda", "", "One panel per session: Must do (the session's checklist, ticking itself from the numbers wherever they change), Going over (what the coach adds), a quick note on any item, and a link on any item to a page or field, a homework item, a parking-lot question or a Scorecard hole (Open jumps there; Back to where we were returns). Editable on Home before the session; a slim docked bar on every tab while the session runs, collapsed to Session N · X of Y done. Coach only; never blocks navigation.", "js/program.js agendaOf; js/ui/agenda-ui.js")
    row("Agenda", "Suggested for today", "Each with a + button: carried-over items, homework the client says is done, open parking-lot questions, the top hole, and numbers older than staleDays (" + str(cfg["AGENDA"]["staleDays"]) + " days)", "")
    row("Agenda", "End session", "Each open item: Carry over (suggested next session) or Make homework; then the review gate; then the snapshot. The agenda and its notes are kept as the session recap.", "")
    row("Homework", "", "Statuses: " + ", ".join(cfg["HOMEWORK_STATUSES"]) + ". The coach sets Client says done for now (Coach tools › Lists); a client-side I did this can set it later (by: client). Confirm or Back to To do in the review gate. Homework made from an agenda item lives in the client file (doc.program.homework) beside the parked numbers.", "js/homework.js; js/program.js setHomeworkStatus")
    row("Review", "", "The gate before a session ends (End session, Move to next session) and at the start of the Revisit session: the stage's key numbers with their value and level, Looks right (locks to Actual) or Edit; homework the client says is done with Confirm or Back to To do; Move on anyway with an optional note kept on the session record; the snapshot after.", "js/program.js reviewOf; js/ui/review-ui.js")
    for sid, groups in cfg["REVIEW"]["groups"].items():
        row("Review", sid, "Key numbers: " + ", ".join(groups), "")
    row("Review", "Other sessions", "Key numbers: " + ", ".join(cfg["REVIEW"]["fallback"]), "")
    row("FI date", "", "Unlocks once income, spending (a gut number is enough) and an invested balance are in; locked with the plain reason only while one is missing. Shown by confidence: Low as a year range (spending " + str(int(cfg["FI_RANGE"]["Low"] * 100)) + "% lower to higher), Medium as a narrower range or a year (" + str(int(cfg["FI_RANGE"]["Medium"] * 100)) + "%), High as a month. Line 1 is the path assumed (Invest your surplus, on unless turned off); line 2 the other path when it differs (answers 122, 123).", "js/math/picture.js fiWordsOf; js/math/fi.js fiRangeOf")

    # The ladder (overnight F1).
    lad = cfg["LADDER"]
    row("Ladder", "", "Two kinds of milestone. Steps are actions in a fixed order that follows SLAM's FOO; a step that does not apply (no match offered, no heavy debt) is left out. Markers are reached whenever the math gets there and slot in between the steps by their actual or projected date. Home shows the next step as a big bar with how far along and the projected month, the next marker as a small line, and the whole ladder closed, with Day 0 as a small marker. Copy frames progress as a win.", "M75; js/registry/ladder.js; js/math/ladder.js; Home")
    for s in lad["STEPS"]:
        row("Ladder", f"Step: {s['name']}", s["what"], f"FOO step {s['foo']}" + (f"; only when {s['applies']}" if s.get("applies") else ""))
    for k in lad["MARKERS"]:
        row("Ladder", f"Marker: {k['name']}", k["what"], "Label editable per client (program.ladder.fatLabel)" if k.get("editable") else "")
    row("Ladder", "Heavy debt by quarters", ", ".join(f"{int(x * 100)}%" for x in lad["LADDER"]["heavyShares"]) + " of the heavy debt at Day 0 (today's when there is no Day 0 yet) paid down", "Heavy = cards, payday, personal, medical, BNPL, or any APR at or over the heavy line (QUESTIONS: heavy vs all consumer debt)")

    # The cash layers (overnight A9): one definition, used by FOO steps 1 and 4, the Scorecard and the ladder.
    row("Cash layers", "", "Cash fills the buckets in order: the Buffer (bufferWeeks of spending, so checking never bounces), little e ($1,000 or the highest deductible, whichever is smaller), any income gap within 12 months, then big e (the Rule of 5: bigEMonths of spending, FAT first, then DRAFTT, then full). A dip (an emergency paid from cash) comes out of the Buffer first, then little e, then big e last; refilling runs the other way. Each dip is recorded with its date, amount, the layers it came from and what each had left. History: a stacked area over the snapshots, dips marked, with the number of dips, the deepest dip (layer, % left, month) and months to refill. One account with virtual layers, or one account per layer.", "M68; js/math/layers.js; Net worth › Assets › Cash layers")
    row("Cash layers", "Scorecard: Emergency fund", "Hole until little e is full; OK with little e full; Strong with big e full", "js/math/scorecard.js")
    # Debt payoff methods (overnight F3).
    db = cfg["DEBT"]
    row("Debt payoff", "", "Each method is its own calculator on Plan › Debt payoff (M34), with the same extra a month. A suggestion comes from the client's stress and is never forced: a money feeling at or under " + str(db["SUGGEST"]["lowFeeling"]) + " of 10, or any debt rated " + str(db["SUGGEST"]["debtStress"]) + "+ for stress, points to Snowball (Return on Hassle once hassle scores are typed); a feeling at or over " + str(db["SUGGEST"]["highFeeling"]) + " points to Avalanche; otherwise Avalanche. The Debt hole on the Scorecard links here.", "js/registry/debt.js; js/math/debt.js ORDERS")
    for m in db["METHODS"]:
        row("Debt payoff", m["name"], m["words"], "Default" if m.get("default") else "")
    # The Joy number (overnight F4).
    jy, cf = cfg["JOY"], cfg["CONF"]
    row("Confidence and Joy", "", f"Two numbers, asked together on Home at the start of every session in one small prompt, one answer per person in a couple, kept per session, stored in every snapshot, charted from Day 0 on Home as a slim pair, and rows on Day 0 vs now (answer 164). Confidence (the meta measure, the old money feeling): '{cf['question']}' ({cf['min']} {cf['low'].lower()} to {cf['max']} {cf['high'].lower()}); it rates the Mindset area and drives the debt method suggestion. Joy (the local measure): '{jy['question']}' ({jy['min']} {jy['low'].lower()} to {jy['max']} {jy['high'].lower()}); it pairs with the category joy ratings on the Budget. An older file's money feeling imports as Confidence.", "js/registry/joy.js; js/program.js setMeasure, measureOf, measureHistory")
    # Captured now for later (overnight F6).
    row("Captured", "", "Data kept in the client file for a later Wrapped or Kanban, with the least UI: a dated joy rating (1 to 5) per spending category (Budget › Joy by category); a Trip tag on Budget lines and calendar entries; an income type on each income row (Salary, Side hustle, Windfall, Other; blank reads from the row's type); and a change log on every edit with the field, the old and new value, who (Coach, or Client when Client view is on) and the time. All of it exports and imports with the file; the Captured tab of the workbook lists it.", "js/capture.js; js/records.js _log; Report › History › Change log")
    # Phase 4 starts (overnight H and I).
    row("Phase 4", "Three statements", "Report › Statements: the net worth statement (balance sheet), the income and spending statement (accrual) and the cash flow statement (cash basis), this period against the last, tied out. The income and cash flow statements show as $, hours of life energy or FI days; the Statements tab of the workbook carries them as formulas.", "js/math/statements.js; js/ui/statements-ui.js; the Statements tab")
    row("Phase 4", "Calendar low line", "Cash flow › Calendar flags a day under the low line; the line is the Buffer layer's target (two weeks of spending) unless one is typed. Home shows the first such day.", "js/month.js balances; js/ui/spending-ui.js bufferLine")
    row("Phase 4", "Statement upload (CSV)", "Cash flow › Month end › Import a bank statement: name the bank, pick the file, confirm which column is which (kept per bank), review each row with its Budget line (suggested from rules learned on earlier imports), duplicates left out; Import keeps each transaction and puts money out on its line's month as an actual, so the line counts as Actual. PDF is a stub with its reason on the button.", "js/import/csv.js")
    row("Phase 4", "Current vs Proposed", "Plan › Current vs Proposed (M76): Proposed is a copy the coach edits (spending a month, the debt order, the retire-by age, whether the surplus is invested, extra to debt). Side by side: the FI date, the savings rate, net worth in 5 and 10 years, the next step and the next marker, with the difference in the money view ($, hours, FI days). Every result opens How we got this, the steps with the inputs used. Make Proposed the plan writes the choices onto the file in one undoable step. The Proposed tab of the workbook carries both sides and the steps.", "js/math/proposed.js; js/ui/plan-ui.js scenariosScreen")
    row("Phase 4", "FOO path and month close", "Plan › FOO shows the path graphic (each step as a stop, you-are-here, locked steps with their reason, the dated stops). Cash flow › Month end closes a month (balances confirmed, the statements tied out, a snapshot kept) and shows the streak: months closed in a row, one grace month allowed inside a run (M77).", "js/ui/foo-ui.js; js/month.js closeStreak")
    # Couples (overnight F2).
    cp = cfg["COUPLES"]
    row("Couples", "", "Every income row, account, debt, goal and homework item carries an Owner tag: " + ", ".join(cp["PERSONS"]) + " (shown as the two first names, or Person A and Person B until typed). A retirement or health account is always one person's: " + ", ".join(cp["ONE_PERSON_TYPES"]) + ". The household mode on About you sets Solo or couple, the default person view on Net worth and Cash flow, and the filing status assumed until one is typed. Switching modes keeps every row and tag.", "js/registry/couples.js; js/couples.js setHouseholdMode; Net worth and Cash flow strips")
    for name, m in cp["MODES"].items():
        row("Couples", f"Mode: {name}", m["words"], f"couple {'yes' if m['couple'] else 'no'}; default view {'together' if m['view'] == 'all' else 'this client'}; filing status never from the mode (answer 155); new accounts {'Joint' if m['merged'] else 'one person'}")

    for r, (kind, cells) in enumerate(rows, 1):
        src = {"title": title_src, "head": head_src, "body": body_src}[kind]
        for c, v in enumerate(cells, 1):
            cell = ws.cell(row=r, column=c, value=v)
            cell.font = copy(src.font)
            cell.fill = copy(src.fill)
            cell.alignment = copy(src.alignment)
            cell.border = copy(src.border)
        if kind in ("title", "head"):
            for c in range(len(cells) + 1, 5):
                ws.cell(row=r, column=c).fill = copy(src.fill)
    for col, w in zip("ABCD", (14, 30, 90, 50)):
        ws.column_dimensions[col].width = w
    ws.freeze_panes = "A3"
    wb.save(SPEC)
    print(f"{TAB}: {len(rows)} rows")


if __name__ == "__main__":
    main()
