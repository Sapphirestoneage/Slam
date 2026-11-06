// SPDX-License-Identifier: AGPL-3.0-only
// Net worth › Money control (batch 55, Phase 5 real lives wave 2): who can see, move and stop each account, card, loan
// and paycheck. Calm by design (Monarch's accounts view, YNAB's plain table): one card with the lines where control
// sits with someone else, then two closed sections: the grid (Sees / Moves / Can stop, a Details button per row with
// the taps) and What to set up. Private by design: js/privacy.js removes it from a partner's view, from Client view
// unless its own client is looking, and from anything shared; the shell then shows no sub-tab and no Find result.
// The math is js/math/control.js; this file shows it and saves taps (the ctl* values on each row, program.control).
import { h } from './dom.js';
import * as S from './staples.js';
import { sec } from './sections.js';
import { money } from '../format.js';
import { controlMap, controlState, setControl, whoWords, ROLES, peopleOf } from '../math/control.js';

const head = (title, sub) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null));
const SUB = 'Who can see each account, card, loan and paycheck, who can move money out, and who can freeze or close it';
const PRIVATE = 'Private: only you and your coach see this. It never shows in a partner\'s view, on the one-pager or in anything shared.';
const READ_TIP = 'Read from who owns it, who is on it, and where its statements and login go. Open Details to say';
const KIND_HEAD = { account: 'Accounts', card: 'Cards', loan: 'Loans', income: 'Pay' };
const todayIso = ctx => ctx.now().toISOString().slice(0, 10);
const FIRST_ROLE = { account: 'Joint owner', card: 'Authorized user', loan: 'Cosigner', income: 'Payee' }; // the usual role, one tap to change
const open = new Set(); // rows whose Details are open: kept across a redraw, so a tap never closes them

export function controlScreen(app, ctx) {
  const doc = ctx.store.doc;
  if (doc.settings?.phase4 !== true) {
    return [head('Money control'), h('div.card', {}, h('div.empty.center', {}, h('span.title', {}, 'The money-control map is a Phase 4 preview, off for this client'),
      S.button('Turn it on', { kind: 'primary', onClick: () => ctx.store.setDoc('settings', { phase4: true }) }), h('span.muted.small', {}, 'Coach tools › Session has the same switch')))];
  }
  const M = controlMap(doc);
  if (!M.rows.length) {
    return [head('Money control', SUB), h('div.card', {}, h('div.empty.center', {}, h('span.title', {}, 'Add an account, a card or a paycheck first'),
      h('span.muted', {}, 'The map reads who owns each one.'), S.button('Go to Assets', { kind: 'primary', iconName: 'right', onClick: () => app.go('#/net-worth/assets') })))];
  }
  return [head('Money control', SUB), hero(M), gridSec(ctx, M), setupSec(ctx, M)];
}

// ---------- The card on top: one calm line per row where someone else can see, move or stop it ----------
function hero(M) {
  const read = M.rows.some(r => !r.answered);
  return h('div.card.mc-hero', {},
    h('h2.mc-q', { 'data-focus': 'moneycontrol' }, M.lines.length ? 'Where someone else has a hand in your money' : 'All yours'),
    M.lines.length ? h('div.mc-lines', {}, M.lines.map(r => h('div.mc-line', { 'data-row': r.id }, h('strong.mc-line-name', {}, r.name), h('span', {}, r.line))))
      : h('p.small.mc-none', {}, `Only you can see and move ${M.rows.length === 1 ? 'it' : `each of these ${M.rows.length}`}.${read ? ' Read from who owns each one until its Details are answered.' : ''}`),
    h('p.muted.small.mc-private', { title: 'Who sees this: you and your coach' }, PRIVATE));
}

// ---------- The grid ----------
function cell(doc, r, c, label) {
  if (!c) return h('span.mc-cell.mc-na.muted', { title: 'Nothing to move or freeze on a loan' }, h('span.mc-lab', {}, `${label}: `), '–');
  const words = whoWords(c.list, doc, r).map((w, i) => (i > 0 && /^(Someone|The) /.test(w) ? w[0].toLowerCase() + w.slice(1) : w)).join(', ') || 'Nobody';
  return h(`span.mc-cell${c.read ? '.mc-read' : ''}`, c.read ? { title: READ_TIP } : {}, h('span.mc-lab', {}, `${label}: `), words);
}
function rowSub(doc, r) {
  const names = Object.fromEntries(peopleOf(doc).map(p => [p.id, p.name]));
  const whose = r.owner === 'Joint' ? 'Joint' : r.owner === 'Me' ? null : `In ${names[r.owner] ?? r.owner}'s name`;
  const kind = r.kind === 'income' ? 'Pay' : r.kind === 'card' ? 'Card' : r.type;
  return [kind, whose, r.balance != null ? money(r.balance) : null].filter(Boolean).join(' · ');
}
function gridSec(ctx, M) {
  const doc = ctx.store.doc;
  let last = null;
  const rows = M.rows.flatMap(r => {
    const top = r.kind !== last ? h('h3.mc-kind', {}, KIND_HEAD[r.kind]) : null;
    last = r.kind;
    const isOpen = open.has(r.id);
    const btn = S.button('Details', { size: 'small', iconName: isOpen ? 'down' : 'right', onClick: () => { if (open.has(r.id)) open.delete(r.id); else open.add(r.id); document.dispatchEvent(new CustomEvent('slam:rerender')); } });
    btn.setAttribute('aria-expanded', String(isOpen));
    btn.classList.add('mc-details');
    return [top, h(`div.mc-row${isOpen ? '.mc-open' : ''}`, { 'data-row': r.id },
      h('span.mc-name', {}, h('strong', {}, r.name), h('span.muted.small', {}, rowSub(doc, r))),
      cell(doc, r, r.sees, 'Sees it'), cell(doc, r, r.moves, 'Can move money out'), cell(doc, r, r.stops, 'Can freeze or close it'), btn),
    isOpen ? details(ctx, r) : null];
  });
  return sec('control:map', { title: 'Who sees, moves and can stop each one', summary: `${M.rows.length} ${M.rows.length === 1 ? 'row' : 'rows'}, ${M.answered} answered`, card: true,
    tip: 'Faded words are read from who owns each row; Details has the taps' },
  M.rows.some(r => !r.answered) ? h('p.muted.small', {}, 'Faded: read from who owns it, nothing on that row answered yet. Details has the taps.') : null,
  h('div.mc-grid', {}, h('div.mc-row.mc-head', { 'aria-hidden': 'true' }, h('span'), h('span.label', {}, 'Sees it'), h('span.label', {}, 'Can move money out'), h('span.label', {}, 'Can freeze or close it'), h('span')), rows));
}

// ---------- One row's taps ----------
// A tap row of several picks (each one on or off). read: the list the map reads while it is not answered, shown as
// the likely picks (dashed, not pressed); the first tap turns it into an answer.
function multi(options, value, read, onChange, label) {
  const cur = value ?? null;
  return h('div.picks.tap-pick.mc-multi', { role: 'group', 'aria-label': label }, options.map(([v, text]) => {
    const on = cur ? cur.includes(v) : false;
    const b = h('button.pick', { type: 'button', 'aria-pressed': String(on), onclick: () => {
      const base = cur ?? read ?? [];
      onChange(base.includes(v) ? base.filter(x => x !== v) : [...base, v]);
    } }, text);
    if (!cur && read?.includes(v)) { b.classList.add('likely'); b.title = 'Read from who owns it. Tap to answer'; }
    return b;
  }));
}
function details(ctx, r) {
  const doc = ctx.store.doc, people = peopleOf(doc);
  const up = patch => ctx.store.update(r.id, patch);
  const name = id => whoWords([id], doc, r)[0];
  const others = r.owner === 'Joint' ? [] : people.filter(p => p.id !== r.owner); // a joint row's adults all own it
  const onOpts = [...others.map(p => [p.id, p.id === 'Me' ? 'You' : p.name]), ['Other', 'Someone else']];
  const on = r.onAsked ? r.on : null;
  const roles = ROLES[r.kind];
  const onRow = h('div.mc-tap', {}, h('span.label', {}, r.kind === 'income' ? 'Paid to someone else' : 'Who else is on it'),
    h('div.picks.tap-pick', { role: 'group', 'aria-label': `${r.name}: who else is on it` },
      h('button.pick', { type: 'button', 'aria-pressed': String(!!on && !Object.keys(on).length), onclick: () => ctx.store.update(r.id, { ctlOn: {} }) }, 'Nobody else'),
      onOpts.map(([v, text]) => h('button.pick', { type: 'button', 'aria-pressed': String(!!on?.[v]), onclick: () => {
        const next = { ...(on || {}) };
        if (next[v]) delete next[v]; else next[v] = FIRST_ROLE[r.kind];
        ctx.store.update(r.id, { ctlOn: next });
      } }, text))),
    ...(roles.length > 1 ? Object.keys(on || {}).map(who => h('div.mc-role', {}, h('span.small', {}, `${name(who)} is`),
      S.toggle(roles, on[who], v => up({ ctlOn: { ...on, [who]: v ?? roles[0] } }), { label: `${name(who)} on ${r.name}: as what` }))) : []));
  const partnerOpts = people.filter(p => p.id !== 'Me');
  const income = r.kind === 'income';
  const mail = h('div.mc-tap', {}, h('span.label', {}, income ? 'Pay stubs go to' : 'Statements go to'),
    S.tapPick([['Me', 'Your own email'], ['Shared', 'A shared email or mail at home'], ...partnerOpts.map(p => [p.id, `${p.name}'s email`]), ['Other', 'Someone else']], r.mail, v => up({ ctlMail: v }), { label: `${r.name}: where its statements go` }));
  const login = h('div.mc-tap', {}, h('span.label', {}, income ? 'The payroll or platform login' : 'The app or website login'),
    S.tapPick([['Me', 'Only you'], ['Shared', 'A shared login'], ...partnerOpts.map(p => [p.id, `Only ${p.name}`]), ['Other', 'Someone else'], ['None', 'No login yet']], r.login, v => up({ ctlLogin: v }), { label: `${r.name}: who has the login` }));
  const who = [...people.map(p => [p.id, p.id === 'Me' ? 'You' : p.name]), ['Other', 'Someone else']];
  const col = (key, c, label, extra = []) => h('div.mc-tap', {}, h('span.label', {}, label),
    multi([...who, ...extra], c && !c.read ? c.list : null, c?.read ? c.list : null, v => ctx.store.update(r.id, { [key]: v }), `${r.name}: ${label.toLowerCase()}`));
  const bank = [['Bank', whoWords(['Bank'], doc, r)[0]]];
  return h('div.mc-detail', { 'data-detail': r.id },
    onRow, r.kind === 'loan' ? null : login, mail,
    col('ctlSees', r.sees, 'Sees it'),
    r.kind === 'loan' ? null : col('ctlMoves', r.moves, income ? 'Can change where it lands' : r.kind === 'card' ? 'Can charge on it' : 'Can move money out'),
    r.kind === 'loan' ? null : col('ctlStops', r.stops, income ? 'Can stop it' : 'Can freeze or close it', bank));
}

// ---------- What to set up ----------
function setupSec(ctx, M) {
  const C = M.checklist, fd = controlState(ctx.store.doc);
  const tick = (id, on) => { const cur = { ...(fd.checks || {}) }; if (on) cur[id] = { at: todayIso(ctx) }; else delete cur[id]; setControl(ctx.store, { checks: cur }, on ? 'Money control: checked' : 'Money control: unchecked'); };
  const rows = C.items.map(it => h('div.mc-check', {},
    it.state === 'ready' ? h('span.mc-ok', {}, h('span.tag.plain', {}, 'Ready'), h('span', {}, it.label)) : S.checkbox(it.label, it.done, v => tick(it.id, v)),
    it.state === 'ready' ? h('span.muted.small', {}, `From your answers: ${it.from}`) : it.state === 'likely' ? h('span.muted.small', { title: READ_TIP }, `Looks ready: ${it.from}, read from who owns it. Its Details say for sure.`) : null,
    h('span.muted.small', {}, it.how)));
  return sec('control:setup', { title: 'What to set up', summary: `${C.ready} of ${C.items.length} ready`, card: true,
    tip: 'Four things that keep money for today in your own hands' }, h('div.mc-checks', {}, rows));
}
