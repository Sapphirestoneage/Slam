// SPDX-License-Identifier: AGPL-3.0-only
// Your own path (run Not built, groups 1 to 5, Part 6): the dated resource lists, rules in plain words and phone
// numbers the pages show. Every entry names where it was read and the day it was checked. All were found by web search
// on the organization's or the agency's own site on Nov 25 2026; the pages could not be opened from the build (the
// network here blocks them), so each says "found by search". A phone number appears only when the organization's own
// page gives it. A list is shown with its "Checked on" date, and the pages say to confirm before relying on it.
// The fees themselves are in data/reference-2026.json (idChangeNY, adoptionCredit), each on the assumptions list.

export const OP_CHECKED = '2026-11-25';
export const OP_CHECKED_WORDS = 'Nov 25 2026';

// Help paying for transition care
export const OP_CARE_HELP = [
  { name: 'Point of Pride, Annual Trans Surgery Fund', what: 'Grants toward gender-affirming surgery in the US, paid to the surgeon. One application window a year (Nov 1 to Nov 30 in 2026); funds surgery on or after March 1 of the next year.', where: 'pointofpride.org/annual-transgender-surgery-fund' },
  { name: 'Jim Collins Foundation', what: 'Grants toward gender-affirming surgery: one fund covers the whole surgical fee, a matching fund covers half. Volunteer-run; check the site for when it is open.', where: 'jimcollinsfoundation.org' },
  { name: 'Trans Lifeline, Microgrants', what: 'Small grants to change a name or gender marker on US documents, and US immigration documents. Also an ID Change Library by state.', where: 'translifeline.org/microgrants' },
];

// New York first: who sets each step of a name and gender marker change, and what their own pages say
export const OP_PAPERS_RULES = [
  { key: 'court', who: 'New York courts', said: 'An adult files a petition for a name change, a sex designation change, or both. NYC Civil Court charges $65; Supreme and County Courts charge $210 for the index number. A fee waiver can be asked for. Since Sept 23 2024 the papers are sealed when filed.', where: 'nycourts.gov: Name and/or Sex Designation Change; CourtHelp, Name Change Basics' },
  { key: 'publish', who: 'New York State law', said: 'The Gender Recognition Act (S.4402-B, signed 2021) ended the rule that a name change be printed in a newspaper.', where: 'governor.ny.gov, Governor Signs the Gender Recognition Act; nysenate.gov, S4402B (2021)' },
  { key: 'birth', who: 'NY State Department of Health (born in NY, outside NYC)', said: 'No fee to change the gender on a birth certificate, X included, for anyone 17 or older (forms DOH-5305 and DOH-5303). One certified copy is free; more cost $30 each. The original is sealed.', where: 'health.ny.gov/vital_records/gender_designation_corrections.htm' },
  { key: 'birthNyc', who: 'NYC Health Department (born in NYC)', said: 'Its own pages differ: one lists a gender change among corrections at no cost, its application form shows a $40 processing fee. Check with NYC before you send it, and type what they tell you.', where: 'nyc.gov: Application for Gender Marker Change; NYC311, Birth Certificate Change' },
  { key: 'dmv', who: 'NY DMV', said: 'A gender change, M, F or X, online or with form MV-44 at an office. The fee to amend a license or permit is $12.50; a non-driver ID, $5.00. An Enhanced or REAL ID usually needs a visit.', where: 'dmv.ny.gov: Change Information on DMV Photo Documents; Driver License Fees and Refunds' },
  { key: 'ssa', who: 'Social Security', said: 'A new card with a new legal name is free, with the court order. Since a 2025 instruction (EM-25014), Social Security no longer changes the sex field on its records.', where: 'ssa.gov: When you need to update your record or card; POMS EM-25014' },
  { key: 'passport', who: 'US Department of State', said: 'A name change within a year of the passport\'s issue date uses Form DS-5504, no fee. Later, Form DS-82 ($130 for a book). A first passport, Form DS-11, is $130 plus $35 at the place you apply. On the sex marker: the Department\'s page says that under Executive Order 14168 (Jan 20 2025) it issues only M or F, matching sex at birth, and no X; that on Nov 6 2025 the Supreme Court stayed the court order in Orr v. Trump that had paused this; and that the case goes on in the lower courts. This can change, so check the page on the day you apply.', where: 'travel.state.gov: Passport Fees; Change or Correct a Passport; Sex Markers in Passports' },
];

// Health plans and transition care
export const OP_PLAN_RULES = [
  { who: 'NY Department of Financial Services', said: 'Health plans bought in New York may not leave out care for gender transition as a group, and must cover what is medically necessary for it, with a right to appeal a no. This covers plans from New York insurers; a self-funded employer plan (many large employers) is outside these rules.', where: 'dfs.ny.gov: Transgender New Yorkers, What You Need to Know to Get Care; Insurance Circular Letter No. 13 (2020)' },
  { who: 'Human Rights Campaign, Corporate Equality Index 2026', said: 'Its list for an inclusive plan: no blanket exclusion, and the same access to hormones, surgery, mental health care, visits and labs, and short-term leave, written in the plan documents.', where: 'reports.hrc.org/corporate-equality-index-2026' },
];

// Family building
export const OP_FAMILY_RULES = [
  { who: 'NY Department of Financial Services', said: 'Since Jan 1 2020, large group plans (over 100 workers) from New York insurers cover three cycles of IVF and the drugs for it, and plans cover fertility preservation when treatment may cause infertility. Since 2020 the state says coverage cannot depend on sexual orientation or gender identity.', where: 'dfs.ny.gov: FAQ, Health Insurance Coverage for Infertility, Fertility Preservation, and Surrogacy' },
  { who: 'IRS', said: 'The adoption credit for 2026: up to $17,670 of qualified expenses for each child, up to $5,120 of it refundable. It shrinks between $265,080 and $305,080 of modified AGI. Expenses an employer paid back do not count.', where: 'irs.gov: 2026 Instructions for Form 8839; Rev. Proc. 2025-32 (IRB 2025-45)' },
];

// The papers that let chosen family decide and inherit
export const OP_KIN_RULES = [
  { who: 'New York courts', said: 'With no will, New York law gives what you leave to a spouse and children, then parents, then brothers and sisters, then their children. A partner you are not married to, and friends, are not on that list.', where: 'nycourts.gov: CourtHelp, Intestacy, When There Is No Will' },
  { who: 'NY State Department of Health', said: 'The Health Care Proxy form is free. Two witnesses 18 or older sign it; the person you name cannot be one of them.', where: 'health.ny.gov/professionals/patients/health_care_proxy' },
  { who: 'US Department of Health and Human Services', said: 'A doctor may share your health information with anyone you name in a signed written authorization, and with the person who holds your health care proxy.', where: 'hhs.gov: HIPAA, Personal Representatives; Guidance on sharing with patients\' loved ones' },
  { who: 'New York law', said: 'A power of attorney for money uses New York\'s statutory short form (General Obligations Law 5-1513). A lawyer can tell you what it needs to be valid today.', where: 'nysenate.gov: General Obligations Law 5-1513 and the 2020 and 2021 bills' },
];

// Leaning on family money: the rules that matter
export const OP_OWN_RULES = [
  { key: 'health', who: 'HealthCare.gov', said: 'You can usually stay on a parent\'s job-based plan until 26, whether or not you live with them or are their tax dependent. Turning 26 opens a window to get your own.', where: 'healthcare.gov/young-adults/children-under-26' },
  { key: 'health', who: 'NY Department of Financial Services', said: 'In New York, an insurer must send claim letters to another address or by another way when you say that sending them home could put you in danger.', where: 'dfs.ny.gov: Confidentiality for Victims of Domestic Violence' },
  { key: 'school', who: 'Federal Student Aid', said: 'The FAFSA lets a student who left home because of an abusive or threatening home, or who is estranged from their parents, apply without parent information. The school asks for proof, such as a talk with its aid office or a letter from a counselor or lawyer. A parent who will not help is not enough on its own.', where: 'studentaid.gov: Reporting Parent Information; the 2026-27 FAFSA form' },
];

// People to talk to, now. Only numbers from each organization's own page.
export const OP_TALK = [
  { name: 'Trans Lifeline', what: 'Peer support by and for trans people.', phone: 'Call or text (877) 565-8860 in the US', where: 'translifeline.org/contact' },
  { name: 'The Trevor Project', what: 'For LGBTQ+ young people, any time, free.', phone: 'Call 1-866-488-7386, or text START to 678678', where: 'thetrevorproject.org/get-help' },
  { name: '988 Suicide and Crisis Lifeline', what: 'For anyone. The LGBTQ+ youth option ("press 3") ended on July 17 2025 (SAMHSA); The Trevor Project is the direct line for that now.', phone: 'Call or text 988', where: 'samhsa.gov, SAMHSA Statement on 988 Press 3 Option' },
];

// Care later in life
export const OP_AGE_RULES = [
  { who: 'Medicare', said: 'Original Medicare does not pay for custodial care (help bathing, dressing, eating) when that is the only care you need. Short skilled care after a hospital stay can be covered. For long-term care, Medicare points to Medicaid (if you qualify in your state) or long-term care insurance.', where: 'medicare.gov: Long-Term Care; Nursing Homes' },
  { who: 'SAGE', what: 'The national organization for LGBTQ+ elders and their caregivers: a caregiving resource page, care management in New York City and South Florida, and SAGECare, a list by state of care providers trained for LGBTQ+ elders. SAGE\'s national elder hotline closed in 2023; its own notice says so.', said: '', where: 'sageusa.org/resources/caregiving; sageusa.care' },
];
