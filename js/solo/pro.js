// SPDX-License-Identifier: AGPL-3.0-only
// For a coach or planner: your card, the plans people share with you, and a one-page summary to print. The math and the
// list live in js/pro.js; this page only shows them. Invites and syncing need sign-in (or practice mode).
import { h } from '../ui/dom.js';
import { newHousehold } from '../records.js';
import { pack, unpack } from '../start/link.js';
import { newAccount, switchTo, removeSpace, deviceAdapter } from '../accounts.js';
import { cloudConfig, cloudOf } from '../cloud.js';
import { pullAll, stampKey } from '../sync.js';
import { money, btn } from './shell.js';
import { cardOf, setCard, addClient, stampCard, rosterOf, practiceOf, summaryOf } from '../pro.js';

const $ = id => document.getElementById(id), device = deviceAdapter();
const ref = await fetch('data/reference-2026.json').then(r => r.json()), cloud = cloudOf(await cloudConfig());
const ui = { note: null, edit: false, sheet: null }, SEEN = id => `slam.pro.seen.${id}`;
const num = k => { try { return Number(localStorage.getItem(k) || 0); } catch { return 0; } };
const box = (id, label, value, help, attrs = {}) => h('div.st-box', {}, h('label', { for: id }, label), h('div.in', {}, h('input', { id, type: 'text', value: value ?? '', autocomplete: 'off', ...attrs })), help ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, help) : null);
let pulled = false;

async function draw() {
  if (cloud?.signedIn() && !pulled) { try { if (!device.loadAccount()) device.saveAccount(newAccount((cloud.email() || 'Me').split('@')[0])); await pullAll(device, cloud); } catch { ui.note = 'Could not reach the server just now. This list is what this device last saw.'; } pulled = true; }
  let acct = device.loadAccount();
  const docs = {}, stamps = {}, seen = {};
  for (const s of acct?.spaces || []) { const p = device.loadSpace(s.id); try { docs[s.id] = p ? await unpack(p) : null; } catch { docs[s.id] = null; } stamps[s.id] = num(stampKey(s.id)); seen[s.id] = num(SEEN(s.id)); }
  const rows = rosterOf(acct, docs, ref, { stamps, seen }), T = practiceOf(rows), card = cardOf(acct?.pro);
  const put = async (a, id = null, doc = null) => { device.saveAccount(a); if (id && doc) { const p = await pack(doc); device.saveSpace(id, p); look(id); if (cloud?.signedIn()) { try { await cloud.saveSpace(id, p); localStorage.setItem(stampKey(id), String(Date.now())); look(id); } catch { ui.note = 'Saved on this device. It will sync when the server is reachable.'; } } }
    if (cloud?.signedIn()) { try { await cloud.saveAccount(a); } catch { /* next time */ } } draw(); };
  const end = t => (/[?.!]$/.test(t) ? t : `${t}.`);
  const look = id => { try { localStorage.setItem(SEEN(id), String(Date.now())); } catch { /* not kept */ } };
  $('step').textContent = rows.length ? `${rows.length} ${rows.length === 1 ? 'plan' : 'plans'}` : '';

  // one page to print
  if (ui.sheet && docs[ui.sheet]) { const S = summaryOf(docs[ui.sheet], ref), name = rows.find(r => r.id === ui.sheet)?.name ?? S.name;
    return $('main').replaceChildren(
      h('div.st-row.st-noprint', {}, btn('Back to the list', () => { ui.sheet = null; draw(); }, 'slim'), btn('Print or save as a PDF', () => window.print(), 'primary')),
      h('div.st-card.st-sheet', {}, h('div.st-eyebrow', {}, card ? [card.name, card.firm].filter(Boolean).join(', ') : 'Stress Less About Money'), h('h1', { style: { margin: '0 0 2px' } }, name), h('p.st-small', { style: { margin: 0 } }, `As of ${S.on}. ${S.done} of ${S.of} steps done. ${S.next ? end(`Next: ${S.next}`) : ''}`),
        h('dl.st-sheetlines', {}, S.lines.map(l => [h('dt', {}, l.label), h('dd', {}, l.value == null ? h('span.st-soft', {}, 'Not answered yet') : h('strong', {}, l.money ? money(l.value) : l.value), l.amount != null ? h('span.st-small', {}, ` ${money(l.amount)} ${l.id === 'debt' ? 'owed' : 'on hand'}.`) : null, l.note ? h('div.st-small', {}, l.note) : null)])),
        S.open.length ? h('p.st-small', {}, `Still open: ${S.open.join(', ')}.`) : null,
        h('p.st-small.st-soft', { style: { marginBottom: 0 } }, 'Every number here comes from the answers in the plan, using the same math as the plan\'s own pages. It is a picture for a conversation, not tax, legal or investment advice.'))); }

  const cardCard = !card || ui.edit
    ? h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, 'Your card'), h('p.st-small', {}, 'Your name goes on each client plan and on the printed page, with a button to book a time with you.'),
        h('div.st-procard', {}, box('pname', 'Your name', card?.name, null, { autocomplete: 'name' }), box('pfirm', 'Practice name', card?.firm, 'Leave empty if it is just you.'), box('plink', 'Booking link', card?.link, 'A full address starting with https.', { inputmode: 'url' })),
        h('div.st-row', { style: { marginTop: '10px' } }, btn('Save my card', () => { const raw = { name: $('pname').value, firm: $('pfirm').value, link: $('plink').value }, next = cardOf(raw); if (!next) { ui.note = 'Add your name to save the card.'; return draw(); }
          ui.note = raw.link.trim() && !next.link ? 'Saved without the booking link: it needs to start with https.' : null; ui.edit = false; put(setCard(acct ?? newAccount(next.name), raw)); }, 'primary'), card ? btn('Never mind', () => { ui.edit = false; draw(); }, 'slim text') : null))
    : h('div.st-card', {}, h('div.st-eyebrow', {}, 'Your card'), h('h2', { style: { margin: '0 0 4px' } }, [card.name, card.firm].filter(Boolean).join(', ')), h('p.st-small', { style: { margin: '0 0 8px' } }, card.link ? `Clients book a time at ${card.link}` : 'No booking link yet.'), h('div.st-row', {}, btn('Change it', () => { ui.edit = true; draw(); }, 'slim')));

  const invite = r => (cloud?.signedIn() ? btn('Copy an invite', async () => { const url = `${location.origin}${location.pathname.replace(/pro\.html$/, 'one.html')}#/join/${r.id}`; try { await navigator.clipboard.writeText(url); ui.note = `Invite for ${r.name} copied. When they open it and sign in, you both see the same plan.`; } catch { ui.note = url; } draw(); }, 'slim') : null);
  const list = !card ? null : h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, 'Client plans'),
    rows.length ? h('p.st-small', {}, `${T.clients} ${T.clients === 1 ? 'plan' : 'plans'}. ${T.changed} changed since you last looked. ${T.notStarted} not started.`) : h('p.st-small', {}, 'Add a plan for each client. You both fill in the same one, from your own phones.'),
    h('ul.st-roster', {}, rows.map(r => h('li', { 'data-row': r.id }, h('div.st-rosterhead', {}, h('strong', {}, r.name), r.changed ? h('span.st-booktag', {}, 'Changed') : null, h('span.st-small', {}, r.empty ? 'Not started' : `${r.done} of ${r.of} done. ${r.next ? end(`Next: ${r.next.title}`) : ''}`)),
      h('div.st-row', {}, btn('Open', () => { look(r.id); device.saveAccount(switchTo(acct, r.id)); location.href = 'one.html'; }, 'slim primary'), btn('One page', () => { look(r.id); ui.sheet = r.id; draw(); }, 'slim'), invite(r),
        r.carded ? null : btn('Add my card', () => put(acct, r.id, stampCard(docs[r.id] ?? newHousehold({ name: r.name }), card)), 'slim'), btn(ui.rm === r.id ? 'Tap again to take it off my list' : 'Remove', () => { if (ui.rm === r.id) { ui.rm = null; put(removeSpace(acct, r.id)); } else { ui.rm = r.id; draw(); } }, 'slim text'))))),
    h('div.st-signin', { style: { marginTop: '10px' } }, h('div.st-box', {}, h('div.in', {}, h('input', { id: 'cname', type: 'text', placeholder: 'Client name or initials', 'aria-label': 'Client name or initials', autocomplete: 'off' }))), btn('Add a client plan', async () => { const a = addClient(acct, $('cname').value), sp = a.spaces.find(s => s.id === a.active); put({ ...a, active: acct.active }, sp.id, stampCard(newHousehold({ name: sp.name }), card)); }, rows.length ? '' : 'primary')),
    cloud?.signedIn() ? null : h('p.st-small.st-soft', { style: { margin: '8px 0 0' } }, cloud ? 'Sign in on the front page to send invites and keep these in step across devices.' : 'Inviting a client needs sign-in, which turns on when the server is connected. ', cloud ? null : h('a', { href: 'one.html?practice' }, 'Try it in practice mode'), cloud ? null : '.'));

  $('main').replaceChildren(
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'For coaches and planners'), h('h1', {}, 'Your clients, one list'), h('p', { style: { marginBottom: 0 } }, 'Each client fills in their own plan on their phone. You see where each one is, what changed, and print one page for the meeting.')),
    ui.note ? h('p.st-note', { role: 'status' }, ui.note) : null, list, cardCard,
    h('div.st-row', {}, h('a.st-btn.slim', { href: 'one.html' }, 'Back to the front page')));
}
draw();
