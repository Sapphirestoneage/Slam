// SPDX-License-Identifier: AGPL-3.0-only
// Batch 30: the card library on Net worth › Credit cards. "Which card is it?" on each card row (a few letters, one
// tap: name, issuer, annual fee and rewards type fill in, all still editable; the APR stays the client's own), the
// "What your cards give you" section (rewards, credits and benefits with Use it / Don't taps, and whether a card with
// a fee gives back more than the fee), and the one-line notes on benefits a paid line may be doubling up.
// The views only show what js/math/cards.js returns.
import { h, icon } from './dom.js';
import * as S from './staples.js';
import { secWrap } from './sections.js';
import { cardLibrary, loadCardLibrary, libraryCardOf } from '../cardlib.js';
import { searchCards, issuerName, cardsPicture } from '../math/cards.js';
import { institutionsOf, addInstitution } from '../institutions.js';
import { money } from '../format.js';

const KIND = { 'Cash back': 'Cash back', Points: 'Points', Miles: 'Miles', None: 'None' };
// QUESTIONS 280: the cards not rechecked on Nov 6 (verified: unverified) say so beside their name in coach view and stay
// out of client view (the search, the held card's details and the closed line).
const NOT_RECHECKED = 'not rechecked yet';
const unchecked = c => c?.verified === 'unverified';
const clientView = () => typeof document !== 'undefined' && document.documentElement.dataset.clientView === 'on';
const recheckTag = c => (unchecked(c) ? h('span.tag.plain.coach-only.recheck-tag', { title: `From mid 2026, not read again on the issuer's page. To check: ${(c.unverified || []).join('; ')}` }, NOT_RECHECKED) : null);
const cardRows = ctx => ctx.visible(r => r.kind === 'debt' && r.type === 'Credit card');
// Start loading the library as soon as Credit cards draws; redraw once it is in.
const ensure = ctx => { if (!cardLibrary()) loadCardLibrary(() => ctx.refresh?.()); return cardLibrary(); };

// One tap fills the row from the library card. The nickname is replaced only when it was blank, the type name or an
// earlier library card's name; the issuer becomes the row's institution (made once, then reused).
export function pickCard(ctx, r, card) {
  const prev = libraryCardOf(r);
  const plain = !r.name || r.name === 'Credit card' || (prev && r.name === prev.name);
  ctx.store.transaction(`Card: ${card.name}`, () => {
    const issuer = issuerName(card);
    const inst = issuer ? institutionsOf(ctx.store.doc).find(i => i.name.toLowerCase() === issuer.toLowerCase()) ?? addInstitution(ctx.store, { name: issuer, kind: 'Bank' }) : null;
    ctx.store.update(r.id, { ...(plain ? { name: card.name } : {}), cardId: card.id, annualFee: card.annualFee ?? 0, rewards: KIND[card.rewards?.kind] ?? null, ...(inst ? { institutionId: inst.id } : {}) });
  });
  S.toast(`${issuerName(card)} ${card.name} picked. Its rewards and benefits are under What your cards give you.`, { undo: () => ctx.store.undo() });
}

// The search box in a popover: type a few letters of the issuer or the card, tap the card.
function openPicker(ctx, r, anchor) {
  const lib = ensure(ctx);
  const input = h('input', { placeholder: 'Type a few letters: sapph, venture, double', 'aria-label': 'Search the card library', autocomplete: 'off' });
  const list = h('div.stack.card-results', { style: { gap: '6px' } });
  const draw = () => {
    if (!lib) { list.replaceChildren(h('span.muted.small', {}, 'Loading the card library...')); return; }
    const found = searchCards(clientView() ? lib.cards.filter(c => !unchecked(c)) : lib.cards, input.value, { limit: 7 });
    list.replaceChildren(...(input.value.trim() ? (found.length ? found.map(c => h('button.btn.small.card-result', { type: 'button', onclick: () => { S.closePop(); pickCard(ctx, r, c); } },
      h('strong', {}, `${issuerName(c)} ${c.name}`), h('span.muted', {}, ` · ${c.annualFee ? `${money(c.annualFee)} fee` : 'no fee'}${c.secured ? ' · secured' : ''}`), recheckTag(c))) : [h('span.muted.small', {}, 'Not in the library. Type the name in the box and pick the issuer.')])
      : [h('span.muted.small', {}, `${lib.cards.length} cards from the biggest issuers, store and secured cards.`)]));
  };
  input.oninput = draw;
  input.onkeydown = e => { if (e.key === 'Enter') { const first = list.querySelector('.card-result'); if (first) { e.preventDefault(); first.click(); } } };
  S.popover(anchor, h('div.stack', { style: { gap: '8px' } }, h('h3', {}, 'Which card is it?'), h('label.field', { style: { width: '100%' } }, input), list,
    libraryCardOf(r) ? h('div.row-line', {}, h('button.btn.small', { type: 'button', onclick: () => { S.closePop(); ctx.store.update(r.id, { cardId: null }); } }, 'Not from the library')) : null), { width: 340 });
  draw();
  setTimeout(() => input.focus());
  if (!lib) loadCardLibrary(() => draw());
}
// The small link on a card row (and the button in its Details and in What your cards give you).
export function cardPickLink(ctx, r, { asButton = false } = {}) {
  ensure(ctx);
  const card = libraryCardOf(r);
  const b = asButton
    ? h('button.btn.small', { type: 'button', 'data-focus': `${r.id}:cardId` }, card ? 'Change card' : [icon('search'), ' Which card is it?'])
    : h('button.inst-link', { type: 'button', 'data-focus': `${r.id}:cardId`, 'aria-label': `Which card is it: ${r.name || 'card'}`, title: 'Pick it from the card library: fills the name, issuer, fee and rewards' }, icon('search'), ' Which card is it?');
  b.onclick = () => openPicker(ctx, r, b);
  return b;
}

const useTap = (ctx, r, key, label) => {
  const uses = r.values.cardUse || {};
  return S.toggle([['Use', 'Use it'], ['Dont', "Don't"]], uses[key] ?? null, v => ctx.store.update(r.id, { cardUse: { ...uses, [key]: v } }), { label: `${label}: use it or not`, clearable: true });
};
// One held card: the fee check line, the rewards, each credit and each benefit with its tap.
function heldCard(ctx, r, held, lib) {
  const c = held.card, chk = held.check;
  const rewardRow = h('div.card-give-row', {}, h('span.stack', { style: { gap: '2px' } }, h('strong', {}, 'Rewards'), h('span.muted.small', {}, c.rewards.words), c.rewards.note ? h('span.muted.small', {}, c.rewards.note) : null),
    chk.rewards?.spend ? h('span.num.card-give-amt', { title: 'On your Budget\'s everyday lines (dining, groceries, gas, transit, streaming and the rest), if they go on this card' }, `${money(chk.rewards.value)}/yr`)
      : h('span.muted.small.card-give-amt', { title: 'Counted from the Budget\'s lines (dining, groceries, gas, transit, streaming...). With only a gut number there is nothing to count yet' }, 'Needs Budget lines'),
    c.annualFee ? useTap(ctx, r, 'rewards', 'Rewards on your Budget spending') : h('span'));
  const creditRows = (c.credits || []).map(x => h('div.card-give-row', {}, h('span.stack', { style: { gap: '2px' } }, h('strong', {}, x.name), h('span.muted.small', {}, x.words)),
    h('span.num.card-give-amt', {}, x.value ? `${money(x.value)}/yr` : ''), useTap(ctx, r, x.id, x.name)));
  const benefitRows = Object.entries(c.benefits || {}).map(([k, v]) => h('div.card-give-row', {}, h('span.stack', { style: { gap: '2px' } }, h('strong', {}, lib.benefitKinds[k] ?? k), h('span.muted.small', {}, typeof v === 'string' ? v : v.words)),
    h('span'), useTap(ctx, r, `b:${k}`, lib.benefitKinds[k] ?? k)));
  const facts = [c.annualFee ? `${money(c.annualFee)} annual fee` : 'No annual fee', c.apr ? `typical APR ${c.apr[0]}% to ${c.apr[1]}% (the APR box is yours)` : c.aprNote, c.foreignFee === 0 ? 'no foreign fee' : c.foreignFee ? `${+(c.foreignFee * 100).toFixed(1)}% foreign fee` : null, c.secured ? 'secured' : null].filter(Boolean).join(' · ');
  const checked = c.verified === 'issuer' ? 'Checked on the issuer\'s page' : c.verified === 'secondary' ? 'Checked on a review site' : null;
  return h(`div.card-give${unchecked(c) ? '.coach-only' : ''}`, { 'data-card': r.id },
    h('div.row-line', { style: { gap: '8px', flexWrap: 'wrap' } }, h('h3.card-give-name', {}, held.label), recheckTag(c), h('span.spacer'), cardPickLink(ctx, r, { asButton: true })),
    h('p.muted.small', { style: { margin: '2px 0 6px' } }, facts, ' · ', h('a', { href: c.source, target: '_blank', rel: 'noopener', title: checked ? `${checked} on ${c.checked}` : `Not rechecked yet. To check: ${(c.unverified || []).join('; ')}` }, checked ? `${checked} ${c.checked}` : 'Source')),
    chk.noFee ? null : h('p.fee-check', { style: { margin: '0 0 4px' }, title: chk.text }, h('strong', {}, chk.line), chk.asked ? h('span.muted.small', {}, ` Tap Use it on the credits you use (${chk.asked} not tapped yet).`) : null),
    chk.plainLine ? h('p.muted.small', { style: { margin: '0 0 6px' } }, chk.plainLine) : null,
    h('div.stack.card-give-list', { style: { gap: '6px' } }, rewardRow, creditRows.length ? h('span.label', {}, 'Credits') : null, ...creditRows, benefitRows.length ? h('span.label', {}, 'Benefits') : null, ...benefitRows));
}

// What your cards give you: closed by default; the closed line says each fee card's answer.
export function cardsGiveSection(ctx) {
  const rows = cardRows(ctx);
  if (!rows.length) return null;
  const lib = ensure(ctx);
  const m = ctx.metrics();
  const P = lib ? cardsPicture({ cardRows: rows, lines: m.inputs.lines, coverage: ctx.visible(x => x.kind === 'coverage'), library: lib, rate: m.hourly, assumptions: ctx.store.doc.assumptions, freq: m.inputs.payFrequency }) : null;
  const held = P?.held || [];
  const unpicked = rows.filter(r => !held.some(x => x.id === r.id));
  const shownHeld = clientView() ? held.filter(x => !unchecked(x.card)) : held; // QUESTIONS 280
  const fees = shownHeld.filter(x => !x.check.noFee && x.check.line);
  const summary = !lib ? 'Loading the card library' : fees.length ? fees.map(x => `${x.card.name}: ${x.check.line.replace(/\.$/, '')}`).join(' · ')
    : shownHeld.length ? `${shownHeld.map(x => x.card.name).join(', ')}: rewards, credits and benefits` : 'Pick each card to see its rewards and benefits';
  const body = () => h('div.card', {}, held.map(x => heldCard(ctx, rows.find(r => r.id === x.id), x, lib)),
    unpicked.length ? h('div.stack', { style: { gap: '6px', marginTop: held.length ? '12px' : 0 } }, unpicked.map(r => h('div.row-line', { style: { gap: '8px' } }, h('span', {}, r.name || 'Card'), cardPickLink(ctx, r, { asButton: true })))) : null);
  return secWrap(h('section.section.area-debt.cards-give', {}, h('div.section-title', {}, h('h2', {}, 'What your cards give you')), body()), 'cards:give', { summary });
}

// Benefits you may be paying for twice: one line each, always in view under the cards.
export function doubledNotes(ctx) {
  const lib = ensure(ctx);
  const rows = cardRows(ctx);
  if (!lib || !rows.length) return null;
  const m = ctx.metrics();
  const P = cardsPicture({ cardRows: rows, lines: m.inputs.lines, coverage: ctx.visible(x => x.kind === 'coverage'), library: lib, freq: m.inputs.payFrequency });
  if (!P?.doubled.length) return null;
  return h('div.stack.doubled-notes', { style: { gap: '4px', margin: '4px 0 12px' } }, P.doubled.map(d => h(`p.note-line${unchecked(P.held.find(x => x.id === d.cardId)?.card) ? '.coach-only' : ''}`, { style: { margin: 0 }, title: P.held.find(x => x.id === d.cardId)?.card.benefits[d.kind]?.words ?? P.held.find(x => x.id === d.cardId)?.card.benefits[d.kind] ?? null }, icon('info'), ' ', d.text,
    d.lineId ? h('button.link-btn', { type: 'button', style: { marginLeft: '6px' }, onclick: () => { location.hash = ctx.store.get(d.lineId)?.kind === 'coverage' ? '#/net-worth/protection' : '#/cash-flow/budget'; } }, 'See the line') : null)));
}
