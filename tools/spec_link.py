# SPDX-License-Identifier: AGPL-3.0-only
"""Link the spec's Fields tab to the code, row by row, so nothing drifts.

  node tools/registry_fields.mjs > /tmp/fields.json
  python3 tools/spec_link.py /tmp/fields.json
  python3 tools/xlsx_to_csv.py

Adds a "SLAM id" column to the Fields tab of spec/SLAM Build Spec.xlsx and fills it, for a row that has none yet,
from LINKS below (--relink writes LINKS over it). Then adds a row (the next F number) for every registry field that no row names yet. A SLAM id is one
or more of these, separated by "; ":
  debt.balance                 a field in js/registry/fields.js (area.key)
  type:debt:Credit card        a record type (one of an area's types)
  kind:coverage                a record kind
  line:Rent                    a starter Budget line (Reference data, spendingPresets)
  math:M14                     a Math tab row
  assumption:fiAge             a client assumption;  ref:presets.pace  a Reference data value
  app:session                  data kept in the app (NOT_IN_SHEET in js/registry/fields.js)
  notyet: why                  in the spec, not built yet (listed in SPEC-DRIFT.md)
test/coverage.test.js fails the run when a row names nothing that exists, a Now row has no SLAM id, or a field has no row.
"""
import json
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "spec" / "SLAM Build Spec.xlsx"
COL = "SLAM id"
RELINK = "--relink" in sys.argv  # write LINKS over what the spec has (only while first linking it)

DEBT = lambda t: f"type:debt:{t}; debt.name; debt.balance; debt.apr; debt.payment"
LINKS = {
    "F001": "profile.firstName", "F002": "profile.lastName", "F003": "profile.birthMonth; profile.birthYear; profile.age",
    "F004": "profile.state; profile.nyc", "F005": "profile.household; profile.client.couple", "F006": "profile.partnerName",
    "F007": "profile.partnerBirthYear", "F008": "profile.dependents; profile.kidAges", "F009": "profile.workSituation",
    "F010": "profile.hasCar; profile.hasPets", "F011": "profile.incomeStability", "F012": "profile.housing", "F013": "profile.roommates",
    "F014": "profile.healthCoverage", "F015": "profile.areas.cash; profile.areas.investments; profile.areas.real; profile.areas.debt; profile.noneOfThese",
    "F016": "profile.counts", "F017": "profile.email; profile.phone",
    "F019": "kind:income; income.amount; income.basis", "F020": "income.payFrequency; income.payDay; income.payDays; income.nextPayday",
    "F021": "income.gross", "F022": "income.name", "F023": "income.incomeType", "F024": "income.bonus; income.bonusMonth", "F025": "income.raisePct",
    "F026": "income.contributionPct; income.k401Paycheck", "F027": "income.premium", "F028": "income.hsaFsa", "F029": "income.otherPretax",
    "F030": "income.hasMatch; income.matchPct; income.matchCapPct; assets.matchTiers", "F031": "income.vesting; assets.vestingSchedule; assets.vestYears",
    "F032": "type:income:Side hustle", "F033": "type:income:Partner job", "F034": "type:income:Unemployment; type:income:Benefits",
    "F035": "app:spending.calendar", "F036": "taxes.filingStatus; taxes.w4Status; taxes.w4Extra",
    "F037": "taxes.lastYearTax; taxes.lastYearAmount; profile.taxHistory", "F038": "taxes.quarterlyPaid",
    "F039": "notyet: itemized deductions (the standard deduction is used)", "F040": "math:M14", "F041": "math:M11",
    "F043": "kind:spending; spending.includesDebtPayments; spending.pass", "F044": "line:Rent", "F045": "line:Electric, gas, water", "F046": "line:Electric, gas, water",
    "F047": "line:Electric, gas, water", "F048": "line:Internet", "F049": "line:Renters insurance", "F050": "line:Groceries",
    "F051": "line:Dining out and takeout", "F052": "line:Coffee and snacks", "F053": "line:Car insurance", "F054": "line:Gas or charging",
    "F055": "line:Car maintenance and registration", "F056": "line:Car maintenance and registration", "F057": "line:Tolls and parking",
    "F058": "line:Tolls and parking", "F059": "notyet: no starter line for car wash and supplies (one line can be added)", "F060": "line:Transit",
    "F061": "line:Uber and Lyft", "F062": "line:Therapy", "F063": "line:Doctor and dental copays; line:Prescriptions", "F064": "line:Phone",
    "F065": "line:Streaming; line:Music; line:Apps and cloud storage; line:Amazon Prime and memberships; line:News and magazines",
    "F066": "line:Other wants", "F067": "line:Travel", "F068": "line:Gifts and holidays; line:Charity and giving",
    "F069": "notyet: no starter line for money sent to family", "F070": "line:Kids and childcare",
    "F071": "notyet: one Kids and childcare starter line for now", "F072": "notyet: one Kids and childcare starter line for now",
    "F073": "notyet: one Kids and childcare starter line for now", "F074": "notyet: one Kids and childcare starter line for now",
    "F075": "notyet: one Kids and childcare starter line for now", "F076": "notyet: one Kids and childcare starter line for now",
    "F077": "notyet: one Kids and childcare starter line for now", "F078": "type:assets:529", "F079": "line:Pets",
    "F080": "notyet: one Pets starter line for now", "F081": "notyet: one Pets starter line for now", "F082": "notyet: one Pets starter line for now",
    "F083": "notyet: one Pets starter line for now", "F084": "notyet: one Pets starter line for now", "F085": "notyet: one Pets starter line for now",
    "F086": "line:Courses and books", "F087": "spending.whoPays", "F088": "spending.coveredBy; spending.takeover",
    "F089": "notyet: a part of a bill someone else covers (today it is all of it or none)",
    "F090": "spending.splitBy; profile.splitWith; profile.shared.rent; profile.shared.utilities; profile.shared.internet; profile.shared.renters; profile.shared.groceries; profile.shared.household",
    "F091": "spending.myShare; spending.amountIs; profile.billsGivenAs", "F092": "spending.whoPays",
    "F093": "notyet: a reimbursed amount on a line", "F094": "math:M22", "F095": "profile.hasCar", "F096": "profile.hasPets",
    "F097": "spending.per; spending.amountType; spending.low; spending.high; spending.timing; spending.dueDay", "F098": "months.actual; months.estimate",
    "F099": "notyet: a happiness rating per line (Bedazzle marks joy lines)",
    "F104": DEBT("Credit card"), "F105": "debt.balance", "F106": "debt.apr", "F107": "debt.payment", "F108": "debt.minimum; debt.extra",
    "F109": "debt.promoApr; debt.promoEnd", "F110": "debt.dueDay; debt.statementDay; debt.autopay", "F111": "debt.limit", "F112": "debt.use",
    "F113": "debt.bonus; debt.bonusSpend; debt.bonusBy; debt.rewards", "F114": "debt.opened", "F115": "notyet: a card library to prefill benefits",
    "F116": "debt.annualFee", "F117": DEBT("Student loan"), "F118": "debt.balance", "F119": "debt.apr", "F120": "debt.payment", "F121": "debt.federal",
    "F122": "debt.servicer", "F123": "debt.plan", "F124": "type:debt:Student loan", "F125": "debt.pslf; debt.forgiveness", "F126": "debt.forbearance",
    "F127": DEBT("Car loan"), "F128": "debt.balance", "F129": "debt.apr", "F130": "debt.payment", "F131": "debt.monthsLeft",
    "F132": DEBT("Mortgage"), "F133": "debt.balance", "F134": "debt.apr", "F135": "debt.payment", "F136": "debt.rateType", "F137": "debt.yearsLeft",
    "F138": DEBT("Personal loan"), "F139": "debt.balance", "F140": "debt.apr", "F141": "debt.payment", "F142": "debt.monthsLeft",
    "F143": DEBT("Medical"), "F144": "debt.balance", "F145": "debt.apr", "F146": "debt.payment", "F147": "debt.collections",
    "F148": DEBT("Family or friend"), "F149": "debt.balance", "F150": "debt.apr", "F151": "debt.payment", "F152": "debt.terms",
    "F153": DEBT("Buy now, pay later"), "F154": "debt.balance", "F155": "debt.apr", "F156": "debt.payment", "F157": "debt.paymentsLeft",
    "F158": DEBT("Payday or cash advance"), "F159": "debt.balance", "F160": "debt.apr", "F161": "debt.payment", "F162": "debt.fee; debt.periods; math:M33",
    "F163": DEBT("Tax debt"), "F164": "debt.balance", "F165": "debt.apr", "F166": "debt.payment", "F167": "debt.taxPlan",
    "F168": DEBT("401(k) loan"), "F169": "debt.balance", "F170": "debt.apr", "F171": "debt.payment", "F172": "notyet: the note that a 401(k) loan is due if you leave the job",
    "F173": DEBT("Business"), "F174": "debt.balance", "F175": "debt.apr", "F176": "debt.payment", "F177": "debt.guaranteed",
    "F178": "debt.stress", "F179": "math:M31", "F180": "math:M32", "F181": "math:M36", "F182": "math:M35", "F183": "math:M34; profile.settings.debtOrder",
    "F184": "type:assets:Checking; assets.balance; assets.group", "F185": "type:assets:Savings or HYSA", "F186": "assets.institution",
    "F187": "assets.apy; assets.yieldKind", "F188": "assets.purpose", "F189": "kind:account", "F190": "assets.balance; assets.asOf", "F191": "assets.institution",
    "F192": "assets.contribution; assets.contributionPer; assets.salaryPct; assets.payFrequency; assets.contributionsYtd; assets.contributionsToDate",
    "F193": "assets.taxType; assets.pretaxBalance; assets.rothBalance; assets.rothSplitBy; assets.rothPct; assets.rothPerPaycheck",
    "F194": "assets.allocation; assets.target; assets.targetOn", "F195": "assets.positions", "F196": "assets.fees; assets.accountFee",
    "F197": "assets.costBasis", "F198": "assets.rothBasis; assets.rothLog", "F199": "assets.hsaInvested; assets.hsaCash; assets.hsaStyle",
    "F200": "assets.unvested", "F201": "assets.beneficiary", "F202": "type:assets:Car; kind:asset; assets.value", "F203": "assets.purchasePrice",
    "F204": "type:assets:Home; assets.financed", "F205": "assets.purchasePrice; assets.purchased", "F206": "assets.propertyTax; assets.homeInsurance; assets.hoa",
    "F207": "type:assets:Other property; type:assets:Valuables; type:assets:Business", "F208": "type:assets:Money owed to you",
    "F211": "math:M41", "F212": "math:M40", "F213": "math:M62", "F214": "assumption:fiAge", "F215": "assumption:retireAge",
    "F216": "assumption:realReturn", "F217": "assumption:inflation", "F218": "assumption:withdrawalRate", "F219": "ref:presets.pace",
    "F220": "notyet: a real or nominal dollars switch (inflation is kept for it)", "F221": "ref:defaults.lifeExpectancy",
    "F222": "notyet: Social Security", "F223": "assumption:retirementSpending", "F225": "math:M51", "F226": "math:M54",
    "F227": "math:M52; assumption:partTimeIncome", "F228": "math:M50", "F230": "math:M34",
    "F231": "kind:milestone; goals.name; goals.mode; goals.date; goals.condition", "F232": "math:M43",
    "F236": "app:session", "F237": "app:session", "F238": "app:session", "F239": "profile.later; profile.laterDue",
    "F240": "app:session", "F241": "app:session", "F242": "app:session", "F243": "app:session",
    "F244": "notyet: a next check date for rough or aged numbers", "F245": "profile.whyNow", "F246": "profile.worry; profile.goalWords",
    "F247": "app:session", "F248": "app:parking", "F249": "profile.moneyStyle", "F250": "profile.splitMine; profile.jointAccounts",
    "F251": "profile.variable.last12; profile.variable.typical; profile.variable.lowest", "F252": "profile.variable.setAside",
    "F253": "profile.variable.months", "F254": "kind:benefit; income.what; income.how; income.using", "F255": "income.equity; profile.equityPay",
    "F256": "profile.credit.score; profile.credit.source; profile.credit.checked", "F257": "debt.payChoice",
    "F258": "kind:coverage; protection.name; protection.have; protection.amount; protection.per; protection.paidFrom; protection.paidFromJob",
    "F259": "protection.coverage; protection.employer; protection.deductible; protection.deductibleOut; protection.oopMax; protection.oopMaxOut",
    "F260": "spending.irregular; spending.monthDue; spending.timesYear; spending.costEach; spending.trip",
    "F261": "kind:event; goals.month; goals.day; goals.amount", "F262": "kind:entry; calendar.direction", "F263": "kind:win; calendar.date",
    "F264": "; ".join(f"{a}.{k}" for a in ["income", "debt", "assets", "protection", "spending", "calendar", "goals"] for k in ["notes", "privateNote"]),
    "F265": "app:session",
}

AREA = {"profile": "Profile", "income": "Income", "debt": "Debt", "assets": "Assets", "protection": "Protection", "taxes": "Taxes",
        "spending": "Needs", "calendar": "Needs", "goals": "Goals", "gaps": "Assets", "backups": "Assets", "months": "Needs"}
LIVES = {"profile": "Home › About you", "income": "Cash flow › Income", "debt": "Net worth › Debt", "assets": "Net worth › Assets",
         "protection": "Net worth › Protection", "taxes": "Cash flow › Taxes", "spending": "Cash flow › Budget", "calendar": "Cash flow › Calendar",
         "goals": "Plan › Goals", "gaps": "Net worth › Assets", "backups": "Net worth › Assets", "months": "Cash flow › Budget"}
DATA = {"money": "money", "pct": "percent", "date": "date", "month": "date", "day": "whole number", "number": "whole number",
        "text": "text", "list": "text", "choice": "choice", "yesno": "choice"}


def main():
    fields = json.loads(Path(sys.argv[1]).read_text())
    wb = openpyxl.load_workbook(SPEC)
    ws = wb["Fields"]
    head = [c.value for c in ws[2]]
    if COL not in head:
        ws.cell(row=2, column=len(head) + 1, value=COL)
        head.append(COL)
    col = {h: i + 1 for i, h in enumerate(head)}
    named, last, filled = set(), 0, 0
    for r in range(3, ws.max_row + 1):
        fid = ws.cell(row=r, column=col["ID"]).value
        if not fid or not str(fid).startswith("F"):
            continue
        last = max(last, int(str(fid)[1:]))
        cell = ws.cell(row=r, column=col[COL])
        if fid in LINKS and (not cell.value or RELINK):
            cell.value = LINKS[fid]
            filled += 1
        for t in str(cell.value or "").split(";"):
            named.add(t.strip())
    added = 0
    for f in fields:
        if f["id"] in named:
            continue
        last += 1
        r = ws.max_row + 1
        row = {"ID": f"F{last:03d}", "Build status": "Built", "Area": AREA[f["area"]], "Secondary area": f["tab"], "Field": f["label"],
               "Layer": "Secondary", "Scope": "Now", "Lives on (screen)": LIVES[f["area"]], "Data type": DATA[f["type"]], COL: f["id"],
               "Notes / references": "Added from the code (js/registry/fields.js)" + ("" if f["sheet"] == "column" else f"; stays in the app: {f['sheet']}")}
        for k, v in row.items():
            ws.cell(row=r, column=col[k], value=v)
        added += 1
    wb.save(SPEC)
    print(f"Filled {filled} SLAM ids, added {added} rows (last F{last:03d}).")


if __name__ == "__main__":
    main()
