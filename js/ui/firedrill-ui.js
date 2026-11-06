// SPDX-License-Identifier: AGPL-3.0-only
// Net worth › Fire drill (batch 44, Phase 4 Track 2): if a bank froze an account today, with no notice. Calm by
// design (Monarch's accounts view, YNAB's "what does this money need to do"): one card with the account picked by a
// tap and three numbers, then caret sections, all closed: the next 30 days, what can still be reached, the order to
// pay in, the backup plan and stranded money. The math is js/math/firedrill.js (M9F); this file shows it and saves taps
// (program.fireDrill, an income row's Lands in, a card's limit).
import { h } from './dom.js';
import * as S from './staples.js';
import { sec } from './sections.js';
import { money } from '../format.js';
import { fireDrillOf, backupPlanOf, fireDrillState, setFireDrill, landsInOf, bankAccounts } from '../math/firedrill.js';

const head = (title, sub) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null));
const SUB = 'If a bank froze an account today: what you could still reach, the order to pay in, and the backup plan';
const day = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const dates = list => (list.length > 3 ? `${day(list[0])} to ${day(list.at(-1))}, ${list.length} times` : list.map(day).join(', '));
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const todayIso = ctx => ctx.now().toISOString().slice(0, 10);

export function fireDrillScreen(app, ctx) {
  const doc = ctx.store.doc;
  if (doc.settings?.phase4 !== true) {
    return [head('Bank fire drill'), h('div.card', {}, h('div.empty.center', {}, h('span.title', {}, 'The fire drill is a Phase 4 preview, off for this client'),
      S.button('Turn it on', { kind: 'primary', onClick: () => ctx.store.setDoc('settings', { phase4: true }) }), h('span.muted.small', {}, 'Coach tools › Session has the same switch')))];
  }
  if (!bankAccounts(doc).length) {
    return [head('Bank fire drill', SUB), h('div.card', {}, h('div.empty.center', {}, h('span.title', {}, 'Add a checking or savings account first'),
      h('span.muted', {}, 'The drill reads where the paycheck lands and what each account holds.'),
      S.button('Go to Assets', { kind: 'primary', iconName: 'right', onClick: () => app.go('#/net-worth/assets') })))];
  }
  const D = fireDrillOf(doc, ctx.ref, { now: ctx.now() });
  const B = backupPlanOf(doc, ctx.ref, D, { now: ctx.now() });
  return [head('Bank fire drill', SUB), hero(app, ctx, D, B), nextDays(ctx, D), reach(app, ctx, D), payOrderSec(ctx, D), backupSec(ctx, B), strandedSec(ctx, B)];
}

// ---------- The card on top: the account, by a tap, and three numbers ----------
// QUESTIONS 366: with only a gut number the must-pay part is all the spending; one tap to Budget splits it out.
const GUT_WORDS = 'All your spending, since the needs are not split out yet';
const splitButton = app => S.button('Split it on Budget', { size: 'small', iconName: 'right', tip: 'Budget lines split the needs (housing, food, getting to work) from the rest', onClick: () => app.go('#/cash-flow/budget') });
// QUESTIONS 388, 389: until each account and card with no bank set is answered, the days read two ways in one calm
// line, and the card asks Same bank / Another bank for each one as a tap. A name that sounds like an online bank starts
// on Another bank as the likely answer (dashed, not pressed): it still counts as not answered until tapped.
const GENERIC = /^(savings|checking|money market|cd|savings or hysa)$/i;
const nameIn = n => (GENERIC.test(n) ? n.toLowerCase() : n);
const listOf = names => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0] ?? '');
const dayWords = n => plural(n, 'day');
export function bankTap(ctx, D, x) {
  const a = D.account, fd = fireDrillState(ctx.store.doc);
  const seg = S.toggle([['same', 'Same bank'], ['other', 'Another bank']], x.answer, v => setFireDrill(ctx.store, { sameBank: { ...(fd.sameBank || {}), [`${a.id}:${x.id}`]: v === 'same' ? true : v === 'other' ? false : undefined } }, 'Fire drill: same bank'),
    { label: `${x.name}: which bank`, clearable: true, key: `fd:bank:${x.id}` });
  if (x.answer == null && x.likely === 'other') {
    const b = seg.children[1];
    b.classList.add('likely');
    b.title = 'Likely: the name sounds like an online bank. Tap to say so';
  }
  return seg;
}
function askRows(ctx, D) {
  if (!D.asks?.length) return null;
  const a = D.account;
  return h('div.fd-ask', {},
    h('p.small.fd-ask-q', {}, `At the same bank as ${a.name}? Banks often freeze every account and card a person has there.`),
    h('div.fd-list', {}, D.asks.map(x => h('div.fd-row', { 'data-ask': x.id },
      h('span.fd-name', {}, x.name, h('span.muted.small', {}, x.answer == null && x.likely === 'other' ? ' · sounds like an online bank' : x.kind === 'card' && !/card/i.test(x.name) ? ' · card' : x.forTaxes ? ' · for taxes' : '')),
      bankTap(ctx, D, x),
      h('strong.fd-amt', {}, x.kind === 'card' ? (x.limit != null ? `${money(x.limit)} limit` : '–') : money(x.balance ?? 0))))));
}
function hero(app, ctx, D, B) {
  const a = D.account, u = D.unreachable, r = D.reachable, c = D.cover, R = D.readings;
  const two = R && R.differ && c.cash != null;
  const pick = S.tapPick(D.accounts.map(x => [x.id, x.id === D.defaultId ? `${x.name} (paycheck)` : x.name]), a.id,
    v => setFireDrill(ctx.store, { account: v ?? null }, 'Fire drill: account'), { label: 'Which account froze', clearable: false });
  const tile = (label, big, small, focus = null) => h('div.fd-tile', {}, h('span.label', {}, label), h('strong.fd-big', focus ? { 'data-focus': focus } : {}, big), small ? h('span.muted.small', {}, small) : null);
  const assumed = u.sameBank.filter(x => x.assumed), assumedTotal = assumed.reduce((t, x) => t + (x.balance ?? 0), 0);
  const known = u.sameBankTotal - assumedTotal;
  const outSmall = [`${money(u.balance)} in ${a.name}`, known ? `${money(known)} at the same bank` : null,
    assumedTotal ? `${money(assumedTotal)} if ${listOf(assumed.map(x => nameIn(x.name)))} ${assumed.length > 1 ? 'are' : 'is'} at this bank` : null,
    u.paychecks ? `${money(u.paychecks)} of pay landing there` : null].filter(Boolean).join(' + ');
  const places = r.accounts.filter(x => (x.balance ?? 0) > 0);
  const elsewhere = two ? `${listOf(R.names.map(nameIn))} ${R.names.length > 1 ? 'are' : 'is'} elsewhere` : null;
  const reachSmall = [places.length ? places.map(x => x.name).join(', ') : u.sameBank.length && !two ? 'Nothing outside this bank yet' : !two ? 'Nothing outside this account yet' : null,
    two && R.elsewhere.reach !== r.cash ? `${money(R.elsewhere.reach)} if ${elsewhere}` : null].filter(Boolean).join(' · ');
  const atWords = R?.pending.length > 1 ? 'if they are all at this bank' : R ? `if ${nameIn(R.pending[0].name)} is at this bank` : '';
  const days = c.cash == null ? h('span.muted', {}, 'Needs spending')
    : two ? h('span.fd-two', {}, S.mathButton(D.result, `${dayWords(c.cash)} ${atWords}`), h('span.muted', {}, ' · '), S.mathButton(R.elsewhere.result, `${dayWords(R.elsewhere.days)} if ${elsewhere}`))
      : S.mathButton(D.result, c.cash === 0 ? '0 days' : `About ${plural(c.cash, 'day')}`);
  return h('div.card.fd-hero', {},
    h('h2.fd-q', {}, 'If this account froze today'),
    pick,
    askRows(ctx, D),
    h('div.fd-tiles', {},
      tile('Out of reach for now', money(u.total), outSmall),
      tile('You can still reach', money(r.cash), reachSmall || null),
      h(`div.fd-tile${two ? '.fd-tile-two' : ''}`, {}, h('span.label', {}, 'Covers the must-pay bills'), h(`strong.fd-big${two ? '.fd-big-two' : ''}`, { 'data-focus': 'firedrill' }, days),
        !two && c.withCard != null && c.withCard > c.cash ? h('span.muted.small', {}, `About ${plural(c.withCard, 'day')} with the card's room`) : null,
        D.must?.source === 'gut' ? h('span.muted.small', {}, GUT_WORDS) : h('span.muted.small', {}, 'Housing, utilities, food, getting to work and childcare, health, minimums'),
        D.must?.source === 'gut' ? h('span.fd-split', {}, splitButton(app)) : null)),
    B.risk ? h('p.fd-note.muted.small', {}, 'Banks and payment apps sometimes close accounts tied to adult work, platform payouts or a lot of cash deposits, often with little notice. A plan made ahead of time turns that day into a hassle instead of a scramble.') : null);
}

// ---------- The next 30 days ----------
function nextDays(ctx, D) {
  const a = D.account;
  const list = (rows, empty) => (rows.length ? h('div.fd-list', {}, rows.map(r => h('div.fd-row', {},
    h('span.fd-name', {}, r.name, r.hold ? h('span.muted.small', {}, ` · lands ${r.hold} days after it is earned`) : null),
    h('span.muted.small.fd-when', {}, r.spread ? `${dates(r.dates)}, spread through the month` : `${dates(r.dates)}${r.guessDate ? ' (day guessed)' : ''}`),
    h('strong.fd-amt', {}, money(r.total))))) : h('p.muted.small', {}, empty));
  const incomes = ctx.store.doc.records.filter(r => r.kind === 'income' && r.status !== 'Not for me');
  const banks = D.accounts;
  const where = banks.length > 1 && incomes.length ? h('div.fd-where', {}, h('h3', {}, 'Where each paycheck lands'),
    incomes.map(r => h('div.fd-row.fd-row-pick', {}, h('span.fd-name', {}, r.name || r.type),
      S.tapPick(banks.map(b => [b.id, b.name]), landsInOf(r, banks)?.id ?? null, v => ctx.store.update(r.id, { landsIn: v }), { label: `Where ${r.name || r.type} lands`, clearable: false })))) : null;
  return sec('drill:days', { title: `The next ${D.days} days`, summary: `${plural(D.incoming.length, 'paycheck')} ${D.incoming.length === 1 ? 'lands' : 'land'} there, ${plural(D.outgoing.length, 'bill')} ${D.outgoing.length === 1 ? 'draws' : 'draw'} from it`, card: true },
    h('h3', {}, `Lands in ${a.name}`), list(D.incoming, `No pay lands in ${a.name} from ${day(D.window.from)} to ${day(D.window.to)}.`),
    D.nextPaycheck ? h('p.muted.small', {}, `The next one: ${D.nextPaycheck.name}, ${money(D.nextPaycheck.amount)} on ${day(D.nextPaycheck.date)}. Pay sent to a closed account usually goes back to the payer, and changing where pay lands can take a pay cycle or two.`) : null,
    h('h3', {}, `Would not go through from ${a.name}`), list(D.outgoing, `Nothing draws from ${a.name} in these ${D.days} days.`),
    where);
}

// ---------- What can still be reached ----------
function reach(app, ctx, D) {
  const a = D.account, r = D.reachable, fd = fireDrillState(ctx.store.doc);
  const said = (o, v) => setFireDrill(ctx.store, { sameBank: { ...(fd.sameBank || {}), [`${a.id}:${o.id}`]: v } }, 'Fire drill: same bank');
  // QUESTIONS 367, 388: an account with no bank set reads as at the same bank (out of reach) until it is answered; the
  // card on top shows the other reading beside it. A payment app is never a bank's.
  const ask = id => D.asks.find(x => x.id === id);
  const bankPick = o => (o.from === 'app' ? h('span.tag.plain', {}, 'Payment app, not a bank')
    : o.bank && a.bank ? h('span.tag.plain', {}, o.same ? 'Same bank, may freeze too' : o.bankName ?? 'Another bank') // both banks known (Institutions)
      : ask(o.id) ? bankTap(ctx, D, ask(o.id))
        : S.toggle([['same', 'Same bank'], ['other', 'Another bank']], o.known ? (o.same ? 'same' : 'other') : null, v => said(o, v === 'same' ? true : v === 'other' ? false : undefined), { label: `${o.name}: which bank`, clearable: true }));
  const others = [...D.others, ...D.unreachable.sameBank.map(o => ({ ...o, same: true }))];
  const acctRows = others.map(o => h('div.fd-row', {}, h('span.fd-name', {}, o.name, o.forTaxes ? h('span.muted.small', {}, ' · set aside for taxes, not counted') : o.assumed ? h('span.muted.small', {}, ' · read as the same bank until answered') : null),
    bankPick({ ...o, same: o.same ?? false }), h('strong.fd-amt', {}, money(o.balance ?? 0))));
  const handRows = r.accounts.filter(x => x.inHand).map(o => h('div.fd-row', {}, h('span.fd-name', {}, o.name), h('span.muted.small', {}, 'In hand'), h('strong.fd-amt', {}, money(o.balance ?? 0))));
  const cardRows = r.cards.map(c => h('div.fd-row', {}, h('span.fd-name', {}, c.name, h('span.muted.small', {}, c.assumed ? ' · bank not answered yet, read as the same bank' : c.same ? ' · same bank, may close too' : ' · room on the card')),
    c.limit == null ? S.moneyInput(null, v => ctx.store.update(c.id, { limit: v }), { hint: 'Add limit', cents: false, width: 132, key: `${c.id}:limit` }) : h('span.muted.small', {}, `${money(c.limit)} limit, ${money(c.balance)} used`),
    h('strong.fd-amt', {}, c.room == null ? '–' : money(c.room))));
  const asks = others.some(o => !(o.bank && a.bank) && o.from !== 'app');
  return sec('drill:reach', { title: 'What you could still reach', summary: `${money(r.cash)} of cash${r.cardRoom ? ` and ${money(r.cardRoom)} on a card` : ''}`, card: true },
    asks ? h('p.muted.small', {}, `Is it at the same bank as ${a.name}? A bank closing an account often freezes every account that person has there, so until each is answered the days read both ways on the card above.`) : null,
    acctRows.length || handRows.length ? h('div.fd-list', {}, acctRows, handRows) : h('p.muted.small', {}, `Every dollar is in ${a.name}. The backup plan below starts a second place.`),
    cardRows.length ? [h('h3', {}, 'Cards'), h('div.fd-list', {}, cardRows)] : null,
    D.must ? h('div.row-line.fd-must', {}, h('span.small', {}, 'Must-pay bills: ', S.mathButton({ id: 'M9F', value: D.must.monthly, needs: [], text: D.must.text }, `${money(D.must.monthly)} a month`),
      D.must.source === 'gut' ? h('span.muted', {}, `: ${GUT_WORDS.toLowerCase()}`) : null), D.must.source === 'gut' ? splitButton(app) : null) : null);
}

// ---------- The order to pay in ----------
function payOrderSec(ctx, D) {
  const tiers = D.order.length ? D.order : [];
  const labelOf = id => (ctx.ref.fireDrill?.order || []).find(o => o.id === id);
  let last = null;
  const rows = tiers.flatMap(r => {
    const t = labelOf(r.tier);
    const headRow = r.tier !== last ? h('h3.fd-tier', {}, t?.label ?? r.tier) : null;
    last = r.tier;
    const how = r.short > 0 ? h('span.small.fd-how', {}, `${money(r.short)} not covered yet. Call first: ${t?.call ?? ''}`)
      : r.fromCard > 0 ? h('span.muted.small.fd-how', {}, r.fromCash > 0 ? `${money(r.fromCash)} from what you can reach, ${money(r.fromCard)} on the card` : 'On the backup card')
        : h('span.muted.small.fd-how', {}, 'From what you can reach');
    return [headRow, h('div.fd-row', {}, h('span.fd-name', {}, r.name, h('span.muted.small', {}, ` · ${r.times > 1 ? `from ${day(r.date)}` : day(r.date)}${r.guessDate ? ' (day guessed)' : ''}`)), how, h('strong.fd-amt', {}, money(r.amount)))];
  });
  const covered = !D.shortTiers.length;
  const src = ctx.ref.fireDrill?.source ?? '';
  return sec('drill:order', { title: 'If not everything can be paid', summary: covered ? 'What you can reach pays all of it, in this order' : 'Housing first, then utilities, food, getting to work and childcare, health, minimums', card: true,
    tip: `The order to pay in, from CFPB and nonprofit credit counselors: what a missed bill takes away, and whether it can be undone. ${src}` },
  h('p.muted.small', {}, `The next ${D.days} days, paid in this order from ${money(D.pool)}: the cash you can still reach${D.reachable.comingIn ? ' and pay landing somewhere else' : ''}. Bills on a card that still works are left out.`),
  rows.length ? h('div.fd-list', {}, rows) : h('p.muted.small', {}, 'Nothing is due in these days.'));
}

// ---------- The backup plan ----------
function tick(ctx, part, id, on) {
  const fd = fireDrillState(ctx.store.doc), cur = { ...(fd[part] || {}) };
  if (on) cur[id] = { at: todayIso(ctx) }; else delete cur[id];
  setFireDrill(ctx.store, { [part]: cur }, on ? 'Fire drill: checked' : 'Fire drill: unchecked');
}
function backupSec(ctx, B) {
  const fd = fireDrillState(ctx.store.doc);
  const rows = B.items.map(it => h('div.fd-check', {},
    it.auto ? h('span.fd-ok', {}, h('span.tag.plain', {}, 'Ready'), h('span', {}, it.label)) : it.id === 'payrollForm' ? h('span.fd-name', {}, it.label) : S.checkbox(it.label, it.done, v => tick(ctx, 'checks', it.id, v)),
    it.auto ? h('span.muted.small', {}, `From your numbers: ${it.auto}`) : null,
    it.id === 'payrollForm' ? S.tapPick(it.picks.map(p => [p, p]), it.pick, v => setFireDrill(ctx.store, { checks: { ...(fd.checks || {}), payrollForm: v ? { pick: v, at: todayIso(ctx) } : undefined } }, 'Fire drill: payroll form'), { label: 'Where the payroll form lives' }) : null,
    h('span.muted.small', {}, it.how)));
  return sec('drill:backup', { title: 'The backup plan', summary: `${B.ready} of ${B.items.length} ready`, card: true }, h('div.fd-checks', {}, rows));
}

// ---------- Stranded money ----------
// QUESTIONS 368: a workplace plan's one tap, Current job or Old job; Current job takes it off this list.
export function planJobToggle(ctx, id, value, name) {
  return S.toggle(['Current job', 'Old job'], value ?? null, v => {
    ctx.store.update(id, { planJob: v });
    if (v === 'Current job') S.toast(`${name}: from the current job, so it is off Stranded money.`, { undo: () => ctx.store.undo() });
  }, { label: `${name}: current job or an old one`, clearable: true, key: `${id}:planJob` });
}
function strandedSec(ctx, B) {
  const rows = B.stranded.map(s => h('div.fd-check', {},
    h(`div.fd-row.fd-row-top${s.kind === 'plan' ? '.fd-row-plan' : ''}`, {}, S.checkbox(s.label, s.done, v => tick(ctx, 'stranded', s.id, v)), s.kind === 'plan' ? planJobToggle(ctx, s.recId, s.job, s.label.split(':')[0]) : null, s.amount != null ? h('strong.fd-amt', {}, money(s.amount)) : h('span')),
    h('span.muted.small', {}, s.how),
    s.url ? h('a.small.fd-link', { href: s.url, target: '_blank', rel: 'noopener' }, `Open ${s.site}`) : null,
    s.done && s.at ? h('span.muted.small', {}, `Checked ${day(s.at)}`) : null));
  return sec('drill:stranded', { title: 'Stranded money', summary: `${B.checked} of ${B.stranded.length} checked`, card: true,
    tip: 'Money a platform holds back, payment app balances, plans from old jobs and unclaimed property: each one ticked once it is checked' }, h('div.fd-checks', {}, rows));
}
