/* ============================================================================
   SLAM the Game: core/peers.js
   PURPOSE     Comparing with peers (run Finish everything partly built, Part 9): net worth next to the
               middle household of your age, your savings rate next to the country's, your pay next to
               the middle household's, "people like you" lines from the published shares, and the next
               milestone of the journey. The sheet "You and people like you" (features/peers.js) and
               Quest mode's rank (core/quest.js, qsRank) use it.
   INPUT       Numbers only. No profile, no screen.
   OUTPUT      Constants: PE_RULES, PE_WORDS, PE_QUARTERS, PE_NOT_YET, PE_PRIORS. Functions: peRow,
               peSource, peWhere, peNetWorth, peSaving, peIncome, pePatterns, peNext.
   DEPENDS ON  Nothing.
   RULES       GENERATED FILE. Do not edit it. The source is js/math/peers.js of the main SLAM app, with
               the rows of data/priors-2026.json. To change a rule or a row, change the source, then run:
               node tools/game_peers_build.mjs. The tests fail when this copy is stale.
               Prettier does not format this file (.prettierignore).
   ========================================================================= */
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
const PE_RULES = { near: 0.1 };
const PE_WORDS = { below: 'below the middle', near: 'about the middle', above: 'above the middle' };
const PE_QUARTERS = ['Under the 25th', '25th to the middle', 'Middle to the 75th', 'Over the 75th'];
// What has no dated official table reachable from here yet (QUESTIONS, run Finish everything partly built, Part 9).
const PE_NOT_YET = {
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
function peRow(rows = [], field, age = null) {
  const a = peNum(age), list = (rows || []).filter(r => r.field === field && r.household == null && r.place == null);
  const band = a === null ? null : list.find(r => peInBand(r, a));
  if (band) return { row: band, byAge: true };
  const all = list.find(r => !r.ages);
  return all ? { row: all, byAge: false } : null;
}
// The source of a row, in the words the screen shows: who published it, the table, the year, the date it came out.
function peSource(data = {}, row = null) {
  if (!row) return null;
  const S = (data && data.sources && data.sources[row.source]) || {};
  const name = S.name || row.source, by = S.publisher || null;
  const when = row.period || row.year || null;
  return { id: row.source, name, publisher: by, table: row.table || null, year: row.year || null, period: row.period || null, released: S.released || null, link: row.link || S.link || null,
    line: `${by ? `${by}, ` : ''}${name}${row.table ? `: ${row.table}` : ''}${when ? ` (${when}${S.released ? `, released ${S.released}` : ''})` : ''}` };
}
// Below, about or above a published middle. near: the share either side that counts as about the middle.
function peWhere(value, middle, near = PE_RULES.near) {
  const v = peNum(value), m = peNum(middle);
  if (v === null || m === null || m <= 0) return null;
  return v < m * (1 - near) ? 'below' : v > m * (1 + near) ? 'above' : 'near';
}

// ---------- net worth next to the middle household of your age ----------
// x: { nw, age, rows (the netWorth rows of the priors data), near }. The quarter is among all households (the SCF's
// 25th, middle and 75th; over the 90th is said too), since the report gives no percentiles by age.
function peNetWorth(x = {}, money = peMoney0) {
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
function peSaving(x = {}) {
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
function peIncome(x = {}, money = peMoney0) {
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
function pePatterns(x = {}, money = peMoney0) {
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
function peNext(J = {}, money = peMoney0) {
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
// The rows of data/priors-2026.json the peers screen reads, with their sources.
const PE_PRIORS = {"asOf":"2026-11-06","sources":{"scf2025":{"name":"Survey of Consumer Finances 2025: Changes in U.S. Family Finances from 2022 to 2025","publisher":"Federal Reserve Board","link":"https://www.federalreserve.gov/publications/files/scf26.pdf","released":"2026-10-09"},"shed2025":{"name":"Survey of Household Economics and Decisionmaking (survey of October 2025), data tables","publisher":"Federal Reserve Board","link":"https://www.federalreserve.gov/consumerscommunities/sheddataviz/","released":"2026-05"},"p60289":{"name":"Income in the United States: 2025 (P60-289), highlights","publisher":"U.S. Census Bureau","link":"https://www.census.gov/library/publications/2026/demo/p60-289.html","released":"2026-09"},"bea202609":{"name":"Personal Income and Outlays, September 2026 (news release)","publisher":"Bureau of Economic Analysis","link":"https://www.bea.gov/news/2026/personal-income-and-outlays-september-2026","released":"2026-10-29","read":"read through a web search on Nov 26 2026 (bea.gov was not reachable from the session); the October 2026 release was not checked"}},"rows":[{"field":"netWorth","band":"under 35","ages":[null,34],"who":"households under 35","median":33000,"mean":135400,"unit":"balance","source":"scf2025","table":"Table 2 (p. 12), family net worth by age of head","link":"https://www.federalreserve.gov/publications/files/scf26.pdf","year":2025},{"field":"netWorth","band":"35 to 44","ages":[35,44],"who":"households 35 to 44","median":155600,"mean":681900,"unit":"balance","source":"scf2025","table":"Table 2 (p. 12), family net worth by age of head","link":"https://www.federalreserve.gov/publications/files/scf26.pdf","year":2025},{"field":"netWorth","band":"45 to 54","ages":[45,54],"who":"households 45 to 54","median":253700,"mean":1244500,"unit":"balance","source":"scf2025","table":"Table 2 (p. 12), family net worth by age of head","link":"https://www.federalreserve.gov/publications/files/scf26.pdf","year":2025},{"field":"netWorth","band":"55 to 64","ages":[55,64],"who":"households 55 to 64","median":411900,"mean":1878000,"unit":"balance","source":"scf2025","table":"Table 2 (p. 12), family net worth by age of head","link":"https://www.federalreserve.gov/publications/files/scf26.pdf","year":2025},{"field":"netWorth","band":"65 to 74","ages":[65,74],"who":"households 65 to 74","median":431300,"mean":1897600,"unit":"balance","source":"scf2025","table":"Table 2 (p. 12), family net worth by age of head","link":"https://www.federalreserve.gov/publications/files/scf26.pdf","year":2025},{"field":"netWorth","band":"75 and over","ages":[75,null],"who":"households 75 and over","median":504900,"mean":1962200,"unit":"balance","source":"scf2025","table":"Table 2 (p. 12), family net worth by age of head","link":"https://www.federalreserve.gov/publications/files/scf26.pdf","year":2025},{"field":"cash","band":"all ages","ages":null,"who":"households","share":0.987,"median":8200,"mean":62900,"among":"the 98.7% with a checking, savings or money market account","unit":"balance","source":"scf2025","table":"Table 3 (p. 15), transaction accounts","link":"https://www.federalreserve.gov/publications/files/scf26.pdf","year":2025},{"field":"card","band":"all ages","ages":null,"who":"households with a card balance","share":0.447,"median":3100,"mean":8000,"among":"the 44.7% carrying a balance after the last payment","unit":"balance","source":"scf2025","table":"Table 4 (p. 25), credit card balances","link":"https://www.federalreserve.gov/publications/files/scf26.pdf","year":2025},{"field":"studentLoans","band":"all ages","ages":null,"who":"households with student loans","share":0.2,"median":25600,"mean":43000,"among":"the 20.0% with education debt","unit":"balance","source":"scf2025","table":"Table 4 (p. 25), education installment loans","link":"https://www.federalreserve.gov/publications/files/scf26.pdf","year":2025},{"field":"cover400","band":"all adults","ages":null,"who":"adults","share":0.63,"unit":"share","source":"shed2025","table":"Unexpected expenses: would cover a $400 emergency expense with cash or its equivalent","link":"https://www.federalreserve.gov/consumerscommunities/sheddataviz/unexpectedexpenses-table.html","year":2025},{"field":"emergency3mo","band":"all adults","ages":null,"who":"adults","share":0.55,"unit":"share","source":"shed2025","table":"Emergency savings: adults who have 3 months of emergency savings","link":"https://www.federalreserve.gov/consumerscommunities/sheddataviz/emergency-savings-table.html","year":2025},{"field":"cover400","band":"18 to 29","ages":[18,29],"who":"18 to 29 year olds","share":0.45,"unit":"share","source":"shed2025","table":"Unexpected expenses: would cover a $400 emergency expense with cash or its equivalent","link":"https://www.federalreserve.gov/consumerscommunities/sheddataviz/unexpectedexpenses-table.html","year":2025},{"field":"emergency3mo","band":"18 to 29","ages":[18,29],"who":"18 to 29 year olds","share":0.37,"unit":"share","source":"shed2025","table":"Emergency savings: adults who have 3 months of emergency savings","link":"https://www.federalreserve.gov/consumerscommunities/sheddataviz/emergency-savings-table.html","year":2025},{"field":"cover400","band":"30 to 44","ages":[30,44],"who":"30 to 44 year olds","share":0.57,"unit":"share","source":"shed2025","table":"Unexpected expenses: would cover a $400 emergency expense with cash or its equivalent","link":"https://www.federalreserve.gov/consumerscommunities/sheddataviz/unexpectedexpenses-table.html","year":2025},{"field":"emergency3mo","band":"30 to 44","ages":[30,44],"who":"30 to 44 year olds","share":0.49,"unit":"share","source":"shed2025","table":"Emergency savings: adults who have 3 months of emergency savings","link":"https://www.federalreserve.gov/consumerscommunities/sheddataviz/emergency-savings-table.html","year":2025},{"field":"cover400","band":"45 to 59","ages":[45,59],"who":"45 to 59 year olds","share":0.66,"unit":"share","source":"shed2025","table":"Unexpected expenses: would cover a $400 emergency expense with cash or its equivalent","link":"https://www.federalreserve.gov/consumerscommunities/sheddataviz/unexpectedexpenses-table.html","year":2025},{"field":"emergency3mo","band":"45 to 59","ages":[45,59],"who":"45 to 59 year olds","share":0.55,"unit":"share","source":"shed2025","table":"Emergency savings: adults who have 3 months of emergency savings","link":"https://www.federalreserve.gov/consumerscommunities/sheddataviz/emergency-savings-table.html","year":2025},{"field":"cover400","band":"60 and over","ages":[60,null],"who":"adults 60 and over","share":0.78,"unit":"share","source":"shed2025","table":"Unexpected expenses: would cover a $400 emergency expense with cash or its equivalent","link":"https://www.federalreserve.gov/consumerscommunities/sheddataviz/unexpectedexpenses-table.html","year":2025},{"field":"emergency3mo","band":"60 and over","ages":[60,null],"who":"adults 60 and over","share":0.71,"unit":"share","source":"shed2025","table":"Emergency savings: adults who have 3 months of emergency savings","link":"https://www.federalreserve.gov/consumerscommunities/sheddataviz/emergency-savings-table.html","year":2025},{"field":"retirement","band":"all ages","ages":null,"who":"households with a retirement account","share":0.549,"median":106000,"among":"the 54.9% with a retirement account","unit":"balance","source":"scf2025","table":"Table 3 (p. 15), retirement accounts","link":"https://www.federalreserve.gov/publications/files/scf26.pdf","year":2025},{"field":"netWorth","band":"all ages","ages":null,"who":"households","median":215900,"p25":27900,"p75":812800,"p90":2539200,"unit":"balance","source":"scf2025","table":"Table A.2 (p. 48), net worth percentiles; median and mean from the press release","link":"https://www.federalreserve.gov/publications/files/scf26.pdf","year":2025},{"field":"income","band":"all ages","ages":null,"who":"households","median":87460,"unit":"year","source":"p60289","table":"Median household income, 2025 (all households, gross, in 2025 dollars)","link":"https://www.census.gov/library/publications/2026/demo/p60-289.html","year":2025,"among":"all households"},{"field":"savingRate","band":"all ages","ages":null,"who":"The whole country","share":0.038,"unit":"rate","source":"bea202609","table":"personal saving as a percentage of disposable personal income","link":"https://www.bea.gov/news/2026/personal-income-and-outlays-september-2026","year":2026,"period":"September 2026"}]};
