// SPDX-License-Identifier: AGPL-3.0-only
// The money-control map (batch 55, Phase 5 real lives wave 2). Pure: no DOM.
//
// For each account, card, loan and paycheck in this client's name (or that this client is on): who is on it, who can
// see it, who can move money out, who can freeze or close it, and where its statements and login go. Built for
// clients in relationships where money is used for control, and for adult and cash workers whose accounts get
// closed. Private by design: the map is this client's alone. It never shows in a partner's view, in Client view
// unless the client it belongs to is the one looking, or in anything shared (js/privacy.js controlSeen strips every
// field here and program.control from those views), and the workbook leaves it out (each field is sheet: { skip }).
//
// The taps (record values, js/registry/fields.js):
//   ctlOn     who else is on it, each with a role: { Partner: 'Authorized user' }; {} is "nobody else"
//   ctlMail   where its statements go: Me (your own email), Shared (a shared email or mail at home), a person, Other
//   ctlLogin  who has the app or website login: Me (only you), Shared, a person, Other, None (no login yet)
//   ctlSees, ctlMoves, ctlStops   the grid's three columns as answered: lists of Me, a person, Other (and Bank for
//             Can stop). Blank: read from the rest (who owns it, who is on it, the statements and the login), shown as
//             read, never as an answer.
// A person is one of peopleOf(doc) (the household's adults, read through the one accessor), Other is someone outside
// the household (a parent, an ex, a manager), Bank is the bank, card issuer, platform or employer.
import { modeOf, ownerOf, adultsOf } from '../registry/couples.js';
import { bankAccounts, landsInOf } from './firedrill.js';

export const CONTROL_KEYS = ['ctlOn', 'ctlMail', 'ctlLogin', 'ctlSees', 'ctlMoves', 'ctlStops'];
export const ROLES = { account: ['Joint owner', 'Authorized user'], card: ['Joint owner', 'Authorized user', 'Cosigner'], loan: ['Joint borrower', 'Cosigner'], income: ['Payee'] };
const CASH_BANK = ['Checking', 'Savings', 'High-yield savings (often online)', 'Money market', 'CD'];
const MOVE_ROLES = ['Joint owner', 'Authorized user', 'Payee'];
const STOP_ROLES = ['Joint owner', 'Cosigner'];

// The household's adults: this client first, then each other adult. The one place the map reads people from.
// Batch 49's adultsOf: this client, the partner, and any adult past two (P3 to P7) in the plan.
export const peopleOf = doc => adultsOf(doc).map(a => ({ id: a.id, name: a.name }));
export const controlState = doc => doc?.program?.control || {};
export function setControl(store, patch, label = 'Money control') { store.setIn('program', ['control'], { ...controlState(store.doc), ...patch }, label); }

const kindOfRow = r => (r.kind === 'income' ? 'income' : r.kind === 'account' ? 'account' : r.type === 'Credit card' ? 'card' : 'loan');
const answered = r => CONTROL_KEYS.some(k => r.values?.[k] != null);
// A list's words: "You", "Dana", "Someone else", "The bank"; joined "Dana and someone else".
export function whoWords(list, doc, row = null) {
  const names = Object.fromEntries(peopleOf(doc).map(p => [p.id, p.name]));
  const bank = !row ? 'The bank' : row.kind === 'income' ? (row.platform ? 'The platform' : 'The payer') : row.type === 'Payment app' ? 'The app' : row.kind === 'account' && !CASH_BANK.includes(row.type) ? 'The firm' : row.kind === 'card' ? 'The card issuer' : 'The bank';
  const w = id => (id === 'Me' ? 'You' : id === 'Other' ? 'Someone else' : id === 'Bank' ? bank : names[id] ?? id);
  return list.map(w);
}
const joinWords = ws => (ws.length > 1 ? `${ws.slice(0, -1).join(', ')} and ${ws.at(-1)}` : ws[0] ?? '');
// Names in a sentence: "Someone else" and "The bank" start lower case unless they open it.
const named = (ids, doc, row, start = true) => joinWords(whoWords(ids, doc, row).map((w, i) => ((!start || i > 0) && /^(Someone|The) /.test(w) ? w[0].toLowerCase() + w.slice(1) : w)));

// Who an answer about statements or a login reaches: Shared is every adult in the household; None is nobody.
function reachOf(v, adults) {
  if (v == null) return null;
  if (v === 'Shared') return adults;
  if (v === 'None') return [];
  return [v];
}

// One row of the map: the facts, the three columns (each answered or read) and the one calm line, if any.
export function controlRow(doc, r, { accounts = bankAccounts(doc) } = {}) {
  const mode = modeOf(doc.profile), adults = peopleOf(doc).map(p => p.id);
  const kind = kindOfRow(r), v = r.values || {};
  const owner = ownerOf(r, mode);
  // A joint row's owners: the adults it is shared among (batch 49's Shared among), else everyone in the plan.
  const owners = owner === 'Joint' ? (Array.isArray(v.splitAmong) && v.splitAmong.length ? adults.filter(a => v.splitAmong.includes(a)) : adults) : [owner];
  const on = v.ctlOn && typeof v.ctlOn === 'object' ? v.ctlOn : null;
  const onIds = Object.keys(on || {}).filter(k => on[k]);
  const mail = reachOf(v.ctlMail, adults), login = reachOf(v.ctlLogin, adults);
  const platform = kind === 'income' && (r.type === 'Platform' || !!v.platform);
  const lands = kind === 'income' ? landsInOf(r, accounts) : null;
  const landsRec = lands ? (doc.records || []).find(x => x.id === lands.id) : null;
  const landsOwner = landsRec ? ownerOf(landsRec, mode) : null;

  const set = (...lists) => [...new Set(lists.flat().filter(Boolean))];
  // Sees: the owners and everyone on it, plus wherever the statements and the login go; an owner the statements and the
  // login both leave out does not see it.
  let sees = set(owners, onIds, mail ?? [], login ?? []);
  if (mail && login) sees = sees.filter(x => !owners.includes(x) || onIds.includes(x) || mail.includes(x) || login.includes(x));
  // Moves: the owners, a joint owner or authorized user (on a card, charging is moving money out), and whoever has the
  // login (on an account or a paycheck: a login moves money or changes where pay lands). A loan holds nothing to move.
  const moveOn = onIds.filter(x => MOVE_ROLES.includes(on[x]));
  const payee = kind === 'income' ? onIds.filter(x => on[x] === 'Payee') : [];
  const moves = kind === 'loan' ? null
    : kind === 'card' ? set(owners, moveOn)
      : kind === 'income' ? set(payee.length ? payee : owners, login ?? [])
        : set(owners, moveOn, login ?? []);
  // Can stop: the bank (or the platform, the payer), any owner (one owner of a joint account can close it), a joint
  // owner or a cosigner; on a paycheck, whoever has the login or owns the account it lands in; 'From partner' money,
  // the partner. A loan has nothing to freeze.
  const stops = kind === 'loan' ? null
    : kind === 'income' ? set(['Bank'], login ?? [], payee, landsOwner && landsOwner !== 'Joint' ? [landsOwner] : landsOwner === 'Joint' ? adults : [], r.type === 'From partner' ? ['Partner'] : [])
      : set(['Bank'], owners, onIds.filter(x => STOP_ROLES.includes(on[x])));
  // A column not tapped is worked out from the row's other answers; with nothing on the row answered yet it is only
  // read from who owns it (read: true, shown faded, never as an answer).
  const rank = x => (x === 'Me' ? 0 : x === 'Bank' ? 9 : x === 'Other' ? 8 : 1);
  const order = list => [...list].sort((a, b) => rank(a) - rank(b));
  const col = (key, readList) => (Array.isArray(v[key]) ? { list: order(v[key]), read: false } : readList == null ? null : { list: order(readList), read: !answered(r) });
  const S = col('ctlSees', sees), M = kind === 'loan' && !Array.isArray(v.ctlMoves) ? null : col('ctlMoves', moves ?? []), T = kind === 'loan' && !Array.isArray(v.ctlStops) ? null : col('ctlStops', stops ?? []);
  const others = c => (c ? c.list.filter(x => x !== 'Me' && x !== 'Bank') : []);
  const row = { id: r.id, kind, type: r.type, name: r.name || r.type || 'Untitled', owner, balance: kind === 'income' ? null : v.balance ?? null, platform,
    on: on ?? {}, onAsked: on != null, mail: v.ctlMail ?? null, login: v.ctlLogin ?? null, sees: S, moves: M, stops: T, answered: answered(r),
    landsIn: lands ? { id: lands.id, name: lands.name, owner: landsOwner } : null, folded: !!r.folded };
  row.line = lineOf(doc, row, { others, accounts });
  row.yours = !row.line;
  return row;
}

// The one calm line where control sits with someone other than this client (no verdict words). null: all yours.
function lineOf(doc, row, { others }) {
  const N = ids => named(ids, doc, row), n = ids => named(ids, doc, row, false);
  const sO = others(row.sees), mO = others(row.moves), tO = others(row.stops);
  const meSees = !!row.sees?.list.includes('Me'), meMoves = !!row.moves?.list.includes('Me');
  if (row.kind === 'income') {
    const lo = row.landsIn?.owner;
    if (lo && lo !== 'Me' && lo !== 'Joint') return `This pay lands in an account in ${n([lo])}'s name.`;
    const payee = Object.keys(row.on).filter(k => row.on[k] === 'Payee' && k !== 'Me');
    if (payee.length) return `This is paid to ${n(payee)}, not to you.`;
    if (mO.length) return `${N(mO)} can change where this pay lands.`;
    if (row.landsIn) {
      const acct = (doc.records || []).find(x => x.id === row.landsIn.id);
      const there = acct ? controlRow(doc, acct) : null;
      const am = there ? others(there.moves) : [];
      if (am.length) return `${N(am)} can move this pay once it lands.`;
    }
    if (tO.length) return `${N(tO)} can stop this pay.`;
    if (row.platform) return 'The platform can close the account and hold what it owes you.';
    return null;
  }
  if (row.kind === 'loan') {
    // A loan in two names: a missed payment lands on both credit reports. A loan in this client's name alone, with
    // someone else on it (a cosigner), only says who sees it.
    const withWho = row.owner === 'Joint' ? peopleOf(doc).map(p => p.id).filter(x => x !== 'Me') : row.owner !== 'Me' ? [row.owner] : [];
    if (withWho.length) return `Your name is on this loan with ${n(withWho)}: a missed payment shows on your credit too.`;
    return sO.length ? `${N(sO)} can see this.` : null;
  }
  if (row.kind === 'card' && row.owner !== 'Me' && row.owner !== 'Joint') return `This card is in ${n([row.owner])}'s name: ${N([row.owner])} can take you off it.`;
  if (mO.length && !meSees) return row.kind === 'card' ? `${N(mO)} can charge on this card and you cannot see it.` : `${N(mO)} can move all of this and you cannot see it.`;
  if (mO.length && row.moves && !meMoves) return `${N(mO)} can move this money and you cannot.`;
  if (mO.length) return row.kind === 'card' ? (row.owner === 'Me' ? `${N(mO)} can charge on this card, and the balance is yours.` : `${N(mO)} can charge on this card too.`) : `${N(mO)} can move all of this too.`;
  if (tO.length) return row.kind === 'card' ? `${N(tO)} can close this card.` : `${N(tO)} can close this account.`;
  if (sO.length) return `${N(sO)} can see this.`;
  return null;
}

// The rows on the map: every account, card, loan and paycheck in this client's name or joint, and any other person's
// that this client is on (an authorized user, a cosigner) or that this client's pay lands in. In order: accounts, cards,
// loans, pay.
export function controlMap(doc) {
  const mode = modeOf(doc.profile), recs = (doc.records || []).filter(r => r.status !== 'Not for me');
  const accounts = bankAccounts(doc);
  const mine = r => ['Me', 'Joint'].includes(ownerOf(r, mode)) || !!r.values?.ctlOn?.Me;
  const incomes = recs.filter(r => r.kind === 'income' && ['Me', 'Joint'].includes(ownerOf(r, mode)));
  const landIds = new Set(incomes.map(r => landsInOf(r, accounts)?.id).filter(Boolean));
  const pick = recs.filter(r => (r.kind === 'account' && (mine(r) || landIds.has(r.id))) || (r.kind === 'debt' && mine(r)));
  const order = { account: 0, card: 1, loan: 2, income: 3 };
  const rows = [...pick, ...incomes].map(r => controlRow(doc, r, { accounts })).sort((a, b) => order[a.kind] - order[b.kind]);
  const lines = rows.filter(r => r.line);
  return { rows, lines, answered: rows.filter(r => r.answered).length, people: peopleOf(doc), couple: peopleOf(doc).length > 1,
    checklist: checklistOf(doc, rows) };
}

// What to set up: an account in your own name only, your own login, statements to your own email, a card in your own
// name for credit history. Each is ready from the answers (an owner tag, or one person in the household, counts as
// an answer), looks ready when only read, or ticked by the coach (program.control.checks).
export function checklistOf(doc, rows) {
  const ticks = controlState(doc).checks || {}, recs = new Map((doc.records || []).map(r => [r.id, r]));
  const solo = peopleOf(doc).length === 1;
  const ownerFact = row => solo || recs.get(row.id)?.owner === 'Me'; // an Owner tag, or nobody else in the household
  const onlyMe = c => !!c && c.list.every(x => x === 'Me' || x === 'Bank');
  // In your own name only: a bank account owned by this client, nobody else on it, only this client sees and moves it.
  // Ready once the owner is a fact and "who else is on it" is answered; read only, it looks ready.
  const own = rows.filter(r => r.kind === 'account' && CASH_BANK.includes(r.type) && r.owner === 'Me' && !Object.keys(r.on).length && onlyMe(r.moves) && onlyMe(r.sees));
  const ownReady = own.filter(r => ownerFact(r) && r.onAsked);
  const cards = rows.filter(r => r.kind === 'card' && r.owner === 'Me');
  const item = (id, label, how, ready, likely = null) => {
    const t = ticks[id];
    return { id, label, how, state: ready ? 'ready' : t ? 'ticked' : likely ? 'likely' : 'open', from: (ready ?? likely)?.name ?? null, at: t?.at ?? null, done: !!ready || !!t };
  };
  const items = [
    item('own', 'An account in your own name only', 'A checking or savings account nobody else is on, so money for today is always yours to reach.', ownReady[0] ?? null, own[0] ?? null),
    item('login', 'Your own login', 'A login only you know on that account\'s app or website, so nobody else can move money or change where pay lands.', own.find(r => r.login === 'Me') ?? null),
    item('email', 'Statements to your own email', 'Statements and alerts to an email only you read, so every move shows up where you see it.', own.find(r => r.mail === 'Me') ?? null),
    item('card', 'A card in your own name', 'A credit card in your name alone builds your own credit history, which a lease, a loan or a new account reads.', cards.find(ownerFact) ?? null, cards[0] ?? null),
  ];
  return { items, ready: items.filter(i => i.done).length };
}
