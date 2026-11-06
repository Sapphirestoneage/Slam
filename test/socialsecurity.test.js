// Social Security (Batch 56, M9J, js/math/socialsecurity.js) and what the projection does with it (M9P): each figure
// worked out by hand from SSA's rules (the reference data cites each page), then the engine's use of it for the four
// households reworked by hand (Lena and Marco, Tom, Maya, Priya and Dev), each partner's own stop age, go-go, slow-go
// and no-go spending, the trust fund switch and the FI test net of guaranteed income.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importFile } from '../js/records.js';
import { fullRetirementMonths, piaOf, claimFactor, spousalFactor, aimeFromPay, benefitOf, householdBenefits } from '../js/math/socialsecurity.js';
import { project, peopleOf } from '../js/math/projection.js';
import { RULES } from '../js/registry/assumptions.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const ss = ref.socialSecurity;
const now = new Date('2026-11-05T12:00:00.000Z');
const load = id => { const r = importFile(readFileSync(new URL(`../fixtures/personas/${id}.json`, import.meta.url), 'utf8')); return r.doc ?? r; };
const near = (a, b, tol = 0.005) => Math.abs(a - b) <= tol;
const widths = { Gut: RULES.rangeIncomeGut, Estimate: RULES.rangeIncomeEstimate };
const wageBase = ref.tax.socialSecurityWageBase;

test('full retirement age by birth year (SSA): 66 for 1943 to 1954, two months a year more to 67 from 1960', () => {
  assert.deepEqual([1937, 1938, 1942, 1943, 1954, 1955, 1959, 1960, 1996].map(y => fullRetirementMonths(y, ss)), [780, 782, 790, 792, 792, 794, 802, 804, 804]);
});

test('the PIA formula with the 2026 bend points ($1,286 and $7,749): 90%, 32%, 15%', () => {
  assert.ok(near(piaOf(1000, ss), 900));
  assert.ok(near(piaOf(5000, ss), 0.9 * 1286 + 0.32 * (5000 - 1286)), '$1,157.40 + $1,188.48 = $2,345.88');
  assert.ok(near(piaOf(10000, ss), 1157.4 + 0.32 * 6463 + 0.15 * 2251), '$1,157.40 + $2,068.16 + $337.65 = $3,563.21');
  assert.equal(piaOf(0, ss), 0);
});

test('claiming early or late: 70% at 62 and 124% at 70 for a full retirement age of 67; a spouse 32.5% of the PIA at 62', () => {
  assert.ok(near(claimFactor(744, 804, ss), 0.70, 1e-9), '60 months early: 36 x 5/9% + 24 x 5/12% = 30% off');
  assert.ok(near(claimFactor(768, 804, ss), 0.80, 1e-9), '36 months early: 20% off');
  assert.ok(near(claimFactor(840, 804, ss), 1.24, 1e-9), '36 months late: 8% a year');
  assert.ok(near(claimFactor(900, 804, ss), 1.24, 1e-9), 'no credits past 70');
  assert.ok(near(0.5 * spousalFactor(744, 804, ss), 0.325, 1e-9), 'SSA: as low as 32.5% at 62');
  assert.equal(spousalFactor(840, 804, ss), 1, 'no credits for a spouse who waits');
});

test('the estimate from pay: today\'s gross every year from 22 to the stop age, capped at the wage base, best 35', () => {
  assert.deepEqual(aimeFromPay({ grossYear: 200000, stopAge: 50 }, ss, wageBase), { aime: 184500 * 28 / 35 / 12, years: 28, yearly: 184500 });
  assert.equal(aimeFromPay({ grossYear: 60000, stopAge: 65 }, ss, wageBase).aime, 5000, '43 years, so the best 35 are all $60,000: $5,000 a month');
  const b = benefitOf({ key: 'Me', bornIndex: 1996 * 12 + 7, stopAge: 65, gross: 60000 }, ss, { wageBase, widths });
  assert.equal(b.source, 'estimate'); assert.equal(b.level, 'Gut');
  assert.ok(near(b.pia, 2345.88)); assert.ok(near(b.low, piaOf(4000, ss)) && near(b.high, piaOf(6000, ss)), 'a Gut range: AIME 20% either way');
  const typed = benefitOf({ key: 'Me', bornIndex: 1996 * 12 + 7, stopAge: 65, gross: 60000, ssBenefit: 2000, ssLevel: 'Estimate', ssClaimAge: 62 }, ss, { wageBase, widths });
  assert.equal(typed.source, 'statement');
  assert.ok(near(typed.low, 1900) && near(typed.high, 2100), 'Estimate: 5% either way');
  assert.ok(near(typed.own, 1400), 'claimed at 62: 70%');
  assert.equal(benefitOf({ key: 'Me', bornIndex: 1996 * 12, stopAge: 65, gross: 60000, ssBenefit: 2000 }, ss, { wageBase, widths }).level, 'Know it', 'a typed number with no level reads Know it');
});

test('a couple: the spousal top-up from the later claim, a survivor keeping the larger (at least 82.5% of an early claimer\'s PIA), the trust fund cut', () => {
  const A = { key: 'Me', bornIndex: 1960 * 12, stopAge: 65, ssBenefit: 3000, endIndex: 1960 * 12 + 1080 };
  const B = { key: 'Partner', bornIndex: 1962 * 12, stopAge: 65, ssBenefit: 600, ssClaimAge: 62, endIndex: 1962 * 12 + 1080 };
  const H = householdBenefits([A, B], ss, { wageBase, widths });
  const [a, b] = H.people;
  assert.ok(near(b.own, 420), 'her own at 62: 70% of $600');
  assert.equal(b.spousalIndex, a.claimIndex, 'the top-up waits for his claim (Jan 2027)');
  // The top-up: half his $3,000 less her $600 = $900. It starts when he claims at 67 (Jan 2027); she is 65 then (born
  // 1962), 24 months before her 67.
  assert.ok(near(b.spousal, 900 * (1 - 24 * ss.spousalFirst36)), `the top-up reduced for 24 months early: ${b.spousal}`);
  assert.ok(near(H.at(b.claimIndex), 420), 'from her claim: her own only');
  assert.ok(near(H.at(a.claimIndex), 3000 + 420 + b.spousal), 'from his: his, hers and her top-up');
  assert.ok(near(H.at(A.endIndex), Math.max(420, 3000)), 'he reaches Plan to age: she keeps his $3,000');
  const early = householdBenefits([{ ...A, ssClaimAge: 62 }, B], ss, { wageBase, widths });
  assert.ok(near(early.at(A.endIndex), 0.825 * 3000), 'he claimed at 62 ($2,100): she gets 82.5% of his PIA, $2,475');
  const cut = householdBenefits([A, B], ss, { wageBase, widths, trustCut: true });
  assert.equal(cut.at(2033 * 12 + 11), H.at(2033 * 12 + 11), 'Dec 2033 in full');
  assert.ok(near(cut.at(2034 * 12), 0.83 * H.at(2034 * 12)), 'from Jan 2034, 83% (the 2026 Trustees Report)');
});

// ---------- In the projection ----------
test('Lena and Marco by hand: the benefits from 67 and the money now lasts (it ran out at 73 without them)', () => {
  const doc = load('aca-couple');
  const P = project(doc, ref, { now }), N = project(doc, ref, { now, socialSecurity: false });
  assert.equal(N.lastsToAge, 73, 'without Social Security: work stops at 65 and the money runs out at Lena\'s 73');
  assert.equal(P.lastsToAge, null, 'with it, to Plan to age');
  const [lena, marco] = P.socialSecurity.people;
  assert.deepEqual([lena.source, lena.level, lena.pia, lena.claimYm], ['statement', 'Know it', 2140, '2054-09'], 'Lena: born Sep 1987, 67 in Sep 2054');
  assert.deepEqual([marco.source, marco.level, marco.pia, marco.claimYm], ['statement', 'Estimate', 1890, '2053-01'], 'Marco: born 1986 (no month: January), 67 in Jan 2053');
  assert.equal(lena.spousal + marco.spousal, 0, 'half of either PIA is below the other\'s own');
  // Plan year 27 runs Nov 2052 to Oct 2053: Marco's $1,890 from Jan 2053, 10 months. Year 28 (Nov 2053 to Oct 2054):
  // 12 x $1,890 + Lena's $2,140 in Sep and Oct 2054.
  assert.ok(near(P.years[26].socialSecurity, 10 * 1890));
  assert.ok(near(P.years[27].socialSecurity, 12 * 1890 + 2 * 2140));
  assert.ok(near(P.years[29].socialSecurity, 12 * 4030));
  assert.ok(P.flags.some(f => f.kind === 'ssStart' && f.person === 'Partner' && f.ym === '2053-01'));
  // Each stops at their own 65 (Marco Jan 2051, Lena Sep 2052); between the two, Lena's take-home alone is short and
  // is drawn for (cash first), never left uncovered.
  assert.deepEqual(P.flags.filter(f => f.kind === 'stop').map(f => [f.person, f.ym]), [['Partner', '2051-01'], ['Me', '2052-09']]);
  assert.equal(P.shortfallYears.length, 0);
  // Trust fund switch: 83% from 2034, so 0.83 x $4,030 a month in year 30.
  const cut = load('aca-couple'); cut.assumptions = { ...cut.assumptions, ssTrustCut: 1 };
  assert.ok(near(project(cut, ref, { now }).years[29].socialSecurity, 12 * 4030 * 0.83, 0.01));
});

test('each partner\'s own stop age (QUESTIONS 406), and the benefits move the age the money lasts to', () => {
  const doc = load('aca-couple');
  doc.assumptions = { ...doc.assumptions, retireAge: 62, partnerRetireAge: 60 };
  assert.deepEqual(peopleOf(doc, ref, now).map(p => p.stopAge), [62, 60]);
  const P = project(doc, ref, { now }), N = project(doc, ref, { now, socialSecurity: false });
  assert.deepEqual(P.flags.filter(f => f.kind === 'stop').map(f => [f.person, f.ym, f.age]), [['Partner', '2046-01', 60], ['Me', '2049-09', 62]]);
  assert.equal(N.lastsToAge, 66, 'stopping at 62 and 60 with nothing coming in: runs out at Lena\'s 66');
  assert.equal(P.lastsToAge, 68, 'with Marco\'s benefit from Jan 2053 and Lena\'s from Sep 2054: at 68');
  const same = load('aca-couple');
  assert.deepEqual(peopleOf(same, ref, now).map(p => p.stopAge), [65, 65], 'blank: the partner stops at the client\'s age (their own birthday)');
});

test('Tom, Maya, and Priya and Dev by hand: the benefit rows, and the money lasts', () => {
  const T = project(load('tom'), ref, { now });
  const t = T.socialSecurity.people[0];
  assert.deepEqual([t.source, t.pia, t.own, t.claimYm], ['statement', 3612, 3612, '2055-06'], 'Tom: off his statement, at 67 in June 2055');
  // Plan year 29 (Nov 2054 to Oct 2055): June to October, 5 months.
  assert.ok(near(T.years[28].socialSecurity, 5 * 3612));
  assert.equal(T.lastsToAge, null, 'his debts are gone by 59 and his draw is $1,773 a month; $3,612 from 67 more than covers it');
  const M = project(load('maya'), ref, { now }), m = M.socialSecurity.people[0];
  // Maya, the earnings estimate: take-home $5,200 is $86,024 gross a year (M10), 35 years from 22 to 65: AIME $7,168.67,
  // PIA $1,157.40 + 0.32 x ($7,168.67 - $1,286) = $3,039.85, at 67 in Aug 2063.
  assert.equal(m.source, 'estimate'); assert.equal(m.level, 'Gut');
  assert.ok(near(m.pia, 1157.4 + 0.32 * (86024.3 / 12 - 1286), 1), `Maya's estimate ${m.pia}`);
  assert.equal(m.claimYm, '2063-08');
  assert.equal(M.lastsToAge, null);
  const C = project(load('couple-joint'), ref, { now });
  const [priya, dev] = C.socialSecurity.people;
  assert.deepEqual([priya.pia, dev.pia, dev.spousal], [3280, 640, 1000], 'Dev: half of $3,280 less his own $640, at his full retirement age');
  assert.deepEqual([dev.claimYm, dev.spousalYm, priya.claimYm], ['2057-01', '2058-02', '2058-02'], 'his own from 67, the top-up once Priya claims');
  // Plan year 31 (Nov 2056 to Oct 2057): Dev's $640 from Jan, 10 months. Year 32: 3 months of $640, then 9 of $4,920.
  assert.ok(near(C.years[30].socialSecurity, 6400)); assert.ok(near(C.years[31].socialSecurity, 1920 + 9 * 4920));
  assert.equal(C.lastsToAge, null);
  assert.ok(C.flags.some(f => f.kind === 'ssSpousal' && f.person === 'Partner' && f.ym === '2058-02'));
});

test('parity: the today mode never counts Social Security, and the benefits never move a date in year 1', () => {
  for (const id of ['maya', 'tom', 'aca-couple', 'couple-joint']) {
    const T = project(load(id), ref, { now, mode: 'today' });
    assert.equal(T.socialSecurity.on, false);
    assert.ok(T.years.every(y => y.socialSecurity === 0));
    const P = project(load(id), ref, { now });
    assert.ok(P.months.every(mo => mo.socialSecurity === 0), `${id}: nobody claims in the next 12 months`);
  }
});

test('one person\'s view counts only their own benefit', () => {
  const doc = load('couple-separate');
  const V = project(doc, ref, { now, person: 'Me' });
  assert.deepEqual(V.socialSecurity.people.map(p => p.counted), [true, false]);
  const me = V.socialSecurity.people[0];
  assert.ok(near(V.years[40].socialSecurity, 12 * me.own, 0.01), 'only Jordan\'s');
});

test('go-go, slow-go and no-go: off by default; on, spending other than debt payments times 85% from 75 and 75% from 85', () => {
  assert.ok(project(load('tom'), ref, { now }).years.every(y => y.phaseCut === 0), 'off: spending stays flat');
  const doc = load('tom'); // a fresh copy: a run is cached per input version
  doc.assumptions = { ...doc.assumptions, spendingPhases: 1 };
  const P = project(doc, ref, { now });
  // Tom's $6,500 holds $4,250 of loan payments, so $2,250 a month is living spending. Plan year 45 (Nov 2070 to Oct
  // 2071, ages 82 and 83): 15% of $2,250 x 12 = $4,050. Year 50 (ages 87 and 88): 25%, $6,750.
  assert.ok(near(P.years[44].phaseCut, 4050)); assert.ok(near(P.years[49].phaseCut, 6750));
  assert.ok(P.years.slice(0, 12).every(y => y.phaseCut === 0), 'nothing while he works');
  assert.ok(P.years[44].phaseCut > 0 && P.years.at(-1).end.netWorth > project(load('tom'), ref, { now }).years.at(-1).end.netWorth);
});

test('the FI test net of guaranteed income (an option, off by default)', () => {
  const doc = load('tom');
  const P = project(doc, ref, { now }), F = project(doc, ref, { now, fiNet: true });
  assert.equal(P.fiMonths, 129, 'off: as M53');
  // The FI number less $3,612 x 12 / 4% = $1,950,000 - $1,083,600 = $866,400, plus the months still to bridge before
  // the claim (month 343) at $3,612 each: FI in month 114, with 229 months to bridge.
  assert.equal(F.fiMonths, 114);
  assert.ok(near(F.fiTarget, 866400 + 229 * 3612, 0.01), `the net FI number at FI: ${F.fiTarget}`);
  assert.equal(P.fiTarget, 1950000);
  assert.equal(project(doc, ref, { now, fiNet: true, mode: 'today' }).fiMonths, 129, 'the today mode keeps M53');
});
