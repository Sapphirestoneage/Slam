// SPDX-License-Identifier: AGPL-3.0-only
// Comparing with peers (run Finish everything partly built, Part 9, Nov 26 2026; M8N). ONE engine for the peers screen
// of both apps (peers.html and the game's Menu, You and people like you) and for Quest mode's Where you rank (qsRank in
// js/math/quest.js calls peNetWorth). Pure, and with no import on purpose, so tools/game_peers_build.mjs copies it word
// for word into game/core/peers.js with the rows it reads. Every name starts with pe or PE_ (the game has one global
// scope). Empty is not zero: a missing input gives ready: false, never a number from a guess of 0.
//
// The caller hands in the priors data (data/priors-2026.json, or the game's PE_PRIORS: the same rows) and its own
// numbers: net worth, the savings rate, the journey's stages, all from its own engines. Nothing here makes a money
// number of its own: it places a number the app already has next to a dated, published one.
//   peNetWorth   net worth next to the middle household of your age (SCF 2025), and the quarter of all households
//   peSaving     your savings rate next to the whole country's personal saving rate (BEA, dated)
//   peIncome     your household's pay before taxes next to the middle household's (Census, 2025)
//   pePatterns   "people like you": plain lines from the published shares at your age where a table has it
//   peNext       the next milestone on the journey (the stages of js/math/trip.js, TP_STAGES, read by tpJourney)
//   PE_NOT_YET   the lines with no dated table reachable yet: said so on screen, never a guess

// SLAM's own rule (Eli to confirm, QUESTIONS): "about the middle" is within 10% of the published middle.
export const PE_RULES = { near: 0.1 };
export const PE_WORDS = { below: 'below the middle', near: 'about the middle', above: 'above the middle' };
export const PE_QUARTERS = ['Under the 25th', '25th to the middle', 'Middle to the 75th', 'Over the 75th'];
// What has no dated official table reachable from here yet (QUESTIONS, run Finish everything partly built, Part 9).
export const PE_NOT_YET = {
  savingByAge: 'Savings rate by age: not yet. No dated official table by age could be reached; the line above is the whole country.',
  incomeByAge: 'Income by age and its percentiles: not yet. The Census table by age of householder (HINC-02) could not be reached and dated from here; the line above is all households.',
  netWorthPct: 'Net worth percentiles by age: not yet. The SCF report gives the middle and the average for each age group, and the 25th, 75th and 90th only for all households.',
};

const peHas = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const peNum = v => (peHas(v) ? Number(v) : null);
const peMoney0 = v => `${v < 0 ? '-' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
const pePct = (v, dp = 0) => `${(Math.round(v * 100 * 10 ** dp) / 10 ** dp).toFixed(dp)}%`;
const peInBand = (r, age) => !!r.ages && age !== null && (r.ages[0] == null || age >= r.ages[0]) && (r.ages[1] == null || age <= r.ages[1]);

// The row of a field for an age: the age band's row where the table has one, else the row for everyone (no ages, no
// household, no place). { row, byAge }, or null when the data has neither.
export function peRow(rows = [], field, age = null) {
  const a = peNum(age), list = (rows || []).filter(r => r.field === field && r.household == null && r.place == null);
  const band = a === null ? null : list.find(r => peInBand(r, a));
  if (band) return { row: band, byAge: true };
  const all = list.find(r => !r.ages);
  return all ? { row: all, byAge: false } : null;
}
// The source of a row, in the words the screen shows: who published it, the table, the year, the date it came out.
export function peSource(data = {}, row = null) {
  if (!row) return null;
  const S = (data && data.sources && data.sources[row.source]) || {};
  const name = S.name || row.source, by = S.publisher || null;
  const when = row.period || row.year || null;
  return { id: row.source, name, publisher: by, table: row.table || null, year: row.year || null, period: row.period || null, released: S.released || null, link: row.link || S.link || null,
    line: `${by ? `${by}, ` : ''}${name}${row.table ? `: ${row.table}` : ''}${when ? ` (${when}${S.released ? `, released ${S.released}` : ''})` : ''}` };
}
// Below, about or above a published middle. near: the share either side that counts as about the middle.
export function peWhere(value, middle, near = PE_RULES.near) {
  const v = peNum(value), m = peNum(middle);
  if (v === null || m === null || m <= 0) return null;
  return v < m * (1 - near) ? 'below' : v > m * (1 + near) ? 'above' : 'near';
}

// ---------- net worth next to the middle household of your age ----------
// x: { nw, age, rows (the netWorth rows of the priors data), near }. The quarter is among all households (the SCF's
// 25th, middle and 75th; over the 90th is said too), since the report gives no percentiles by age.
export function peNetWorth(x = {}, money = peMoney0) {
  const rows = (x.rows || []).filter(r => r.field === 'netWorth'), age = peNum(x.age), nw = peNum(x.nw), near = peHas(x.near) ? Number(x.near) : PE_RULES.near;
  const band = age === null ? null : rows.find(r => peInBand(r, age)) || null;
  const all = rows.find(r => !r.ages && r.p25 != null && r.p75 != null) || null;
  if (!band || nw === null) return { ready: false, band, all, needs: [band ? null : 'your age', nw === null ? 'your net worth' : null].filter(Boolean) };
  const m = band.median, where = peWhere(nw, m, near);
  const quarter = !all ? null : nw < all.p25 ? 1 : nw < all.median ? 2 : nw < all.p75 ? 3 : 4;
  const top10 = !!all && all.p90 != null && nw >= all.p90;
  const line = `The middle of ${band.who} has ${money(m)} of net worth. Yours is ${money(nw)}: ${PE_WORDS[where]}.`;
  const math = [`SCF 2025, ${band.who}: median ${money(m)}${band.mean != null ? `, average ${money(band.mean)}` : ''}`, `About the middle: within ${pePct(near)} of it (${money(m * (1 - near))} to ${money(m * (1 + near))})`,
    all ? `All households: 25th ${money(all.p25)}, middle ${money(all.median)}, 75th ${money(all.p75)}${all.p90 != null ? `, 90th ${money(all.p90)}` : ''}` : null].filter(Boolean);
  return { ready: true, band, median: m, mean: band.mean ?? null, where, ratio: m > 0 ? nw / m : null, all, quarter, top10, quarterWords: quarter ? `${PE_QUARTERS[quarter - 1]} of all households` : null, line, math };
}

// ---------- your savings rate next to the whole country's ----------
// x: { rate (the caller's own savings rate: kept over take-home, as a share), data }. The BEA personal saving rate is
// the whole country's saving over income after taxes, one month, every age together: a different measure, said so.
export function peSaving(x = {}) {
  const P = peRow((x.data || {}).rows, 'savingRate', null), r = peNum(x.rate);
  const row = P ? P.row : null;
  if (!row || row.share == null) return { ready: false, yours: r, row: null, notYet: PE_NOT_YET.savingByAge };
  if (r === null) return { ready: false, yours: null, row, country: row.share, source: peSource(x.data, row), needs: ['what comes in and what you spend a month'], notYet: PE_NOT_YET.savingByAge };
  const line = r < 0 ? `This month more goes out than comes in. Across the country, people kept ${pePct(row.share, 1)} of their income after taxes in ${row.period}.`
    : `You keep ${pePct(r)} of what comes in. Across the country, people kept ${pePct(row.share, 1)} of their income after taxes in ${row.period}.`;
  return { ready: true, yours: r, country: row.share, period: row.period, gap: r - row.share, row, line, source: peSource(x.data, row), notYet: PE_NOT_YET.savingByAge,
    math: [`Yours: what you keep a month / what comes in a month = ${pePct(r)}`, `${row.who}: ${pePct(row.share, 1)}, ${row.table}`, 'The country\'s rate counts everyone together, of every age and income, so it is a different measure from one household\'s.'] };
}

// ---------- your household's pay next to the middle household's ----------
// x: { gross (the household's pay in a year, before taxes: the person's own tap), data, near }.
export function peIncome(x = {}, money = peMoney0) {
  const P = peRow((x.data || {}).rows, 'income', null), g = peNum(x.gross), near = peHas(x.near) ? Number(x.near) : PE_RULES.near;
  const row = P ? P.row : null;
  if (!row || row.median == null) return { ready: false, row: null, notYet: PE_NOT_YET.incomeByAge };
  if (g === null) return { ready: false, row, middle: row.median, source: peSource(x.data, row), needs: ['your household\'s pay in a year, before taxes'], notYet: PE_NOT_YET.incomeByAge };
  const where = peWhere(g, row.median, near);
  return { ready: true, gross: g, middle: row.median, where, ratio: g / row.median, row, source: peSource(x.data, row), notYet: PE_NOT_YET.incomeByAge,
    line: `The middle household in the U.S. had ${money(row.median)} a year before taxes in ${row.year}. Yours is ${money(g)}: ${PE_WORDS[where]}.`,
    math: [`Census, ${row.table}: ${money(row.median)}`, `About the middle: within ${pePct(near)} of it (${money(row.median * (1 - near))} to ${money(row.median * (1 + near))})`, `Yours: ${money(g)} / ${money(row.median)} = ${Math.round((g / row.median) * 100) / 100} times the middle`] };
}

// ---------- "people like you": plain lines from the published shares ----------
// Each line is a share or a middle from a dated table, at your age where the table has an age split. No verdict: what
// is common, never what you should be. Returns [{ id, text, byAge, source }], in a fixed order.
export function pePatterns(x = {}, money = peMoney0) {
  const data = x.data || {}, rows = data.rows || [], age = peNum(x.age), out = [];
  const add = (id, P, text) => { if (P && text) out.push({ id, text, byAge: P.byAge, source: peSource(data, P.row) }); };
  const c4 = peRow(rows, 'cover400', age);
  add('cover400', c4, c4 && c4.row.share != null ? `About ${pePct(c4.row.share)} of ${c4.row.who} would cover a $400 surprise with cash or its equal.` : null);
  const e3 = peRow(rows, 'emergency3mo', age);
  add('emergency3mo', e3, e3 && e3.row.share != null ? `About ${pePct(e3.row.share)} of ${e3.row.who} have three months of expenses set aside.` : null);
  const nw = age === null ? null : peRow(rows, 'netWorth', age);
  if (nw && nw.byAge && nw.row.mean != null && nw.row.median > 0) {
    const times = Math.round((nw.row.mean / nw.row.median) * 10) / 10;
    add('average', nw, `For ${nw.row.who}, the average net worth (${money(nw.row.mean)}) is about ${times} times the middle (${money(nw.row.median)}): a few households with a lot pull the average up, so the middle is the closer comparison.`);
  }
  const among = (id, field, words) => {
    const P = peRow(rows, field, null);
    if (P && P.row.share != null && P.row.median != null) add(id, P, words(pePct(P.row.share), money(P.row.median)));
  };
  among('retirement', 'retirement', (s, m) => `About ${s} of households have a retirement account. Among them, the middle holds ${m}.`);
  among('card', 'card', (s, m) => `About ${s} of households carry a card balance after the last payment. Among them, the middle owes ${m}.`);
  among('studentLoans', 'studentLoans', (s, m) => `About ${s} of households owe on student loans. Among them, the middle owes ${m}.`);
  among('cash', 'cash', (s, m) => `About ${s} of households have a checking or savings account. Among them, the middle holds ${m} across those accounts.`);
  return out;
}

// ---------- the next milestone on the journey ----------
// J: what tpJourney (js/math/trip.js) returns: { stages, here, unknown }. The stages are TP_STAGES.
export function peNext(J = {}, money = peMoney0) {
  const S = (J && J.stages) || [], here = J ? J.here : null;
  if (here === null || here === undefined || !S.length) return { ready: false, needs: (J && J.unknown) || [] };
  const done = S.slice(0, here).map(s => s.name);
  if (here >= S.length) return { ready: true, past: true, done, line: 'You are past every stage of the journey: work is optional.' };
  const s = S[here], m = s.months;
  const left = s.measure === 'debt' ? `${money(s.left)} of costly debt to go` : `${money(s.left)} to go`;
  const when = m == null ? '' : `, about ${m} ${m === 1 ? 'month' : 'months'}${s.est ? ' at what you save a month, before growth' : ' on your plan'}`;
  return { ready: true, past: false, id: s.id, name: s.name, what: s.what, left: s.left, months: m, est: !!s.est, pct: s.pct, done,
    line: `Next: ${s.name} (${s.what.charAt(0).toLowerCase()}${s.what.slice(1)}). ${left}${when}.` };
}
