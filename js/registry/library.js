// SPDX-License-Identifier: AGPL-3.0-only
// The library's first slice (batch 26, Phase 4, docs/engines/library.md): the skill order beside the FOO. Each FOO
// step carries three skills to learn and one thing to unlearn. The words and the maps live here; js/math/library.js
// picks, orders and ticks; js/ui/library-ui.js shows them on Plan › FOO and Home.
//   The skills     data/library/skills.json (the FI Skill Tree's 625, by Eli with Jonathan Mendonsa) and
//                  data/library/app-skills.json (the older app's 40, with data proofs), by tags.foo.
//   The unlearn    data/library/unlearn.json (SLAM's own: popular advice that fits one stage and not another).
//   The order      the client's tilt (profile.identity.tilt, batch 25) when there is one (one skill per tree first, so
//                  the three are three different things), then the band, the leverage tier (S, A, B, C), the level.
//   Done           an app skill whose proof reads "leveled when the household shows it: <field>" ticks itself when
//                  SLAM sees the fact (PROOF_FACTS); every other skill gets a one-tap Done kept in profile.library.
//   SLAM's rule    data/library/slam-rules.json (batch 36, QUESTIONS 313): where a skill's words disagree with a SLAM
//                  rule, the card shows SLAM's rule in one line and keeps the skill's own words in the tip.
//   Phase 4        the blocks show only while Phase 4 previews are on (settings.phase4, QUESTIONS 307).

// The proof text an app skill carries when the data can show it (data/library/app-skills.json).
export const PROOF_PREFIX = 'leveled when the household shows it: ';

// Each proof field, read against SLAM's own numbers (js/math/library.js FACT_READS does the reading). words is what the
// hover tip says ticks it. A field with no SLAM fact yet is in UNMAPPED with why, and gets the one-tap Done instead.
export const PROOF_FACTS = {
  grossAnnualIncome: { words: 'an income on Income (its gross, typed or worked out from take-home)', reads: 'metrics inputs.grossAnnual' },
  capturingFullMatch: { words: 'a match on file and enough going in to get all of it (FOO step 2 done with a match)', reads: 'the 401(k) match tiers on Income and FOO step 2 (M69)' },
  totalDebt: { words: 'every debt with a balance and an APR that is not a guess (or no debt on file)', reads: 'debt rows: balance, APR and its Not sure flag' },
  cashSavings: { words: 'little e full', reads: 'the cash layers (M68): little e' },
  marginalRate: { words: 'an income on file and a filing status picked, so the next dollar\'s tax rate is known (M14)', reads: 'metrics inputs.grossAnnual and profile.filingStatus' },
  monthlyExpenses: { words: 'spending read from the Budget\'s lines, not a gut number', reads: 'metrics inputs.spendingSource' },
  oopMax: { words: 'a health plan on Protection with its out-of-pocket max', reads: 'a Health coverage row: oopMax' },
  termLife: { words: 'a life policy on Protection marked Have it, with its coverage amount', reads: 'a Life coverage row: have and coverage' },
  retireAge: { words: 'an FI age or a retire-by age set (not the 65 SLAM assumes)', reads: 'assumptions.fiAge or assumptions.retireAge' },
  rebalanceBand: { words: 'a target allocation turned on for an account', reads: 'an account row: targetOn' },
  // Batch 36 (QUESTIONS 310): the two that had no SLAM fact.
  swanTarget: { words: 'a sleep-at-night number on Net worth › Assets › Cash layers', reads: 'profile.sleepAtNight (the older app\'s SWAN target)' },
  rerankCut: { words: 'a Keep or Try to cut answer on every repeating charge you can cut (the Bills list on Cash flow › Calendar, or Looking for savings on a Budget line)', reads: 'the Bills list (js/month.js recurringBills): every item that can be cut has a decision' },
};
export const UNMAPPED = {}; // batch 36: every proof field now has a SLAM fact

// The same skill in both sets (by meaning): the app skill stands in, since its proof can tick itself, and it borrows its
// twin's words (description, does, fits), leverage tier and tree; the twin is left out so a step never shows it twice.
export const TWINS = {
  'capture-the-match': 'main-path-capture-the-full-401-k-match',
  'starter-fund': 'cash-safety-net-build-the-1k-shield',
  'name-your-debt': 'debt-leverage-inventory-every-debt',
  'know-your-bracket': 'tax-strategy-read-marginal-brackets',
  'know-your-market': 'income-career-know-your-market-rate',
  'term-life': 'insurance-protection-buy-term-life-if-depended-on',
  'ask-for-the-raise': 'income-career-make-the-raise-ask',
  'backdoor-roth': 'main-path-execute-the-backdoor-roth',
  'roth-conversion-ladder': 'main-path-design-the-roth-conversion-ladder',
};

// An app skill's tree, read as one of the 25 library trees for the tilt (the six app trees are not in the letters'
// ranking). By the skill's Scorecard area, with the ledger tree read as Financial Ops (it is the tracking tree).
export const TILT_TREE_BY_AREA = {
  cashFlow: 'deals-smart-buying', emergency: 'cash-safety-net', retirement: 'main-path', taxes: 'tax-strategy', protection: 'insurance-protection',
  income: 'income-career', investing: 'portfolio-design', goals: 'family-generational-wealth', debt: 'debt-leverage', credit: 'credit-cards', mindset: 'money-psychology',
};
export const TILT_TREE_BY_APP_TREE = { ledger: 'financial-ops-tooling' };
// The older app's appliesWhen situations, read from SLAM's work situation (About you).
export const SITUATIONS = { 'Employed (W-2)': 'employed', 'Self-employed': 'selfEmployed', Mixed: 'mixed', 'Between jobs': 'between', Student: 'student', Retired: 'retired' };
export const LEVERAGE_ORDER = { S: 0, A: 1, B: 2, C: 3 }; // an app skill has no leverage tier: it sorts with B

// The words on the screens.
export const WORDS = {
  block: 'Learn and unlearn',
  learn: 'Learn',
  unlearn: 'Unlearn',
  home: 'Learn next',
  done: 'Done',
  undo: 'Not done yet',
  selfTick: 'Ticks itself',
  notYet: 'Not yet',
  past: 'From an earlier step',
  credit: 'Skills from the FI Skill Tree, by Eli Saperstein with Jonathan Mendonsa. The unlearn line is SLAM\'s own.',
  empty: 'Every skill for this step is done.',
  slamTip: 'The FI Skill Tree says', // batch 36: the skill's own words, kept in the tip under SLAM's rule
};
