// SPDX-License-Identifier: AGPL-3.0-only
// The front door: every module as a card you can tap, in order, each carrying its answers to the next. With an account
// (kept on this device until the server is connected) it shows what is done and what carrying answers forward saved.
import { h } from '../ui/dom.js';
import { Store, newHousehold } from '../records.js';
import { pack, unpack } from '../start/link.js';
import { SOLO, soloProgress, carryUrl, SECONDS_EACH } from '../solo.js';
import { progressOf } from '../journey.js';
import { newAccount, activeSpace, addShared, switchTo, removeSpace, joinShared, deviceAdapter } from '../accounts.js';
import { cloudConfig, cloudOf, sessionFromHash } from '../cloud.js';
import { pullAll, stampKey } from '../sync.js';

const $ = id => document.getElementById(id), device = deviceAdapter();
const btn = (label, onClick, kind = '') => h(`button.st-btn${kind ? '.' + kind.split(' ').join('.') : ''}`, { type: 'button', onClick }, label);
const ref = await fetch('data/reference-2026.json').then(r => r.json()), cloud = cloudOf(await cloudConfig());
const HERE = '#/d/', JOIN = '#/join/';
const ui = { sentTo: null, note: null, busy: false };
// Coming back from the sign-in email: the session rides in the address. Take it, then tidy the address.
if (cloud) { const s = sessionFromHash(location.hash); if (s) { const ok = await cloud.takeSession(s); history.replaceState(null, '', location.pathname); ui.note = ok ? null : 'That sign-in link did not work. Ask for a new one.'; } }
// A link to a shared plan: remember it until signed in, then join.
if (location.hash.startsWith(JOIN)) { try { localStorage.setItem('slam.join', location.hash.slice(JOIN.length)); } catch { /* shown below */ } history.replaceState(null, '', location.pathname); }
let synced = false;
async function sync() {
  if (!cloud?.signedIn()) return;
  try {
    if (!device.loadAccount()) device.saveAccount(newAccount((cloud.email() || 'Me').split('@')[0]));
    await pullAll(device, cloud);
    const want = (() => { try { return localStorage.getItem('slam.join'); } catch { return null; } })();
    if (want) { await cloud.joinSpace(want); const a = joinShared(device.loadAccount(), { id: want, name: 'Ours', members: [] }); device.saveAccount(a); await cloud.saveAccount(a); localStorage.removeItem('slam.join'); await pullAll(device, cloud); ui.note = 'You are in. This is the plan you share.'; }
    synced = true;
  } catch { ui.note = 'Could not reach the server just now. Your answers are safe on this device and will sync next time.'; }
}

async function draw() {
  if (cloud?.signedIn() && !synced) await sync();
  let acct = device.loadAccount(); const space = activeSpace(acct);
  let doc = null, packed = null;
  if (location.hash.startsWith(HERE)) { packed = location.hash.slice(HERE.length); try { doc = await unpack(packed); } catch { doc = null; packed = null; } }
  if (!doc && space) { packed = device.loadSpace(space.id); if (packed) { try { doc = await unpack(packed); } catch { doc = null; packed = null; } } }
  const store = new Store(doc ?? newHousehold({ name: 'My plan' }));
  const P = soloProgress(store.doc, ref, { planDone: (() => { try { return progressOf(store.doc, ref).done && store.doc.profile?.birthYear != null; } catch { return false; } })() });
  const save = async a => { device.saveAccount(a); const sp = activeSpace(a);
    if (packed && !device.loadSpace(sp.id) && a.spaces.length === 1) device.saveSpace(sp.id, packed);
    if (sp.kind === 'shared' && !device.loadSpace(sp.id)) device.saveSpace(sp.id, await pack(newHousehold({ name: 'Our plan' }))); // a shared plan exists from the start, so the other person can join it
    if (cloud?.signedIn()) { try { await cloud.saveAccount(a); const local = device.loadSpace(sp.id); if (local) { await cloud.saveSpace(sp.id, local); localStorage.setItem(stampKey(sp.id), String(Date.now())); } } catch { ui.note = 'Saved on this device. It will sync when the server is reachable.'; } }
    history.replaceState(null, '', location.pathname); draw(); };
  // signing in: an email with a link (and a code, for when the link opens on another device)
  const signIn = () => { if (!cloud) return null; if (cloud.signedIn()) return h('p.st-small', { style: { margin: '8px 0 0' } }, `Signed in as ${cloud.email() ?? 'you'}. Your plans sync to any device you sign in on. `, btn('Sign out', () => { cloud.signOut(); synced = false; draw(); }, 'slim text'));
    const email = h('input', { type: 'email', id: 'email', autocomplete: 'email', inputmode: 'email', placeholder: 'you@example.com', 'aria-label': 'Your email', value: ui.sentTo ?? '' }), code = h('input', { type: 'text', id: 'code', inputmode: 'numeric', autocomplete: 'one-time-code', placeholder: '6-digit code', 'aria-label': 'The code from the email' });
    return h('div.st-field', {}, h('div.st-flabel', {}, 'Sign in to sync across devices'), h('div.st-signin', {}, h('div.st-box', {}, h('div.in', {}, email)), btn(ui.sentTo ? 'Send it again' : 'Email me a sign-in link', async () => { const v = email.value.trim(); if (!/^\S+@\S+\.\S+$/.test(v)) { ui.note = 'That email does not look complete.'; return draw(); } const ok = await cloud.sendLink(v, `${location.origin}${location.pathname}`).catch(() => false); ui.sentTo = ok ? v : null; ui.note = ok ? null : 'The email could not be sent just now. Try again in a minute.'; draw(); }, ui.sentTo ? 'slim' : 'primary')),
      ui.sentTo ? h('div', { style: { marginTop: '8px' } }, h('p.st-small', { style: { margin: '0 0 6px' } }, `Sent to ${ui.sentTo}. Tap the link in it on this device, or type the code from the same email.`), h('div.st-signin', {}, h('div.st-box', {}, h('div.in', {}, code)), btn('Sign in', async () => { const ok = await cloud.verifyCode(ui.sentTo, code.value).catch(() => false); if (ok) { ui.sentTo = null; ui.note = null; synced = false; } else ui.note = 'That code did not match. Check the newest email.'; draw(); }, 'primary'))) : h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'No password. We email you a link each time.')); };
  const invite = sp => (cloud?.signedIn() && sp?.kind === 'shared' ? btn('Copy an invite for my person', async () => { const url = `${location.origin}${location.pathname}${JOIN}${sp.id}`; try { await navigator.clipboard.writeText(url); ui.note = 'Invite copied. When they open it and sign in, you both see and edit the same plan.'; } catch { ui.note = url; } draw(); }, 'slim') : null);
  $('step').textContent = `${P.done} of ${P.of} done`;
  const href = s => (packed ? carryUrl(s.id, packed) : s.page);
  const word = s => (s.done ? 'Done' : s.started ? 'Started' : s.needs && s.ready ? `${s.ready} of ${s.needs} answers already in` : 'Start');
  const accountCard = !acct
    ? h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, 'Keep your place'), h('p.st-small', {}, 'Make an account on this device and every step remembers where you left off, shows what is done, and counts what you did not have to type twice. No email, no password.'),
        h('div.st-row', {}, btn('Make my account', () => save(newAccount('Me')), cloud ? '' : 'primary'), cloud ? null : h('span.st-small.st-soft', {}, 'Sign-in across devices comes when the server is connected.')), signIn(), ui.note ? h('p.st-note', { role: 'status' }, ui.note) : null)
    : h('div.st-card', {}, h('div.st-eyebrow', {}, 'Your account, on this device'), h('h2', { style: { margin: '0 0 6px' } }, `${P.done} of ${P.of} done`),
        h('div.st-pips', { 'aria-hidden': 'true' }, P.steps.map(s => h(`i${s.done ? '.on' : ''}`))),
        h('p', { style: { fontWeight: 700, margin: '8px 0' } }, P.reused ? `${P.answers} answers on file, used again ${P.reused} ${P.reused === 1 ? 'time' : 'times'} across the steps. That is about ${P.minutesSaved < 1 ? `${P.reused * SECONDS_EACH} seconds` : `${P.minutesSaved} ${P.minutesSaved === 1 ? 'minute' : 'minutes'}`} of finding and typing you did not repeat.` : 'Each answer you give is used again by the steps after it. The count shows here.'),
        h('div.st-field', {}, h('div.st-flabel', {}, 'Whose plan'), h('div.st-chips', {}, acct.spaces.map(s => h('button.st-chip', { type: 'button', 'aria-pressed': s.id === acct.active ? 'true' : 'false', onClick: () => save(switchTo(acct, s.id)) }, s.kind === 'mine' ? 'Mine' : s.kind === 'extra' ? s.name : 'Ours')),
          acct.spaces.some(s => s.kind === 'shared') ? null : h('button.st-chip', { type: 'button', 'aria-pressed': 'false', onClick: () => save(addShared(acct)) }, '+ One we share'))),
        space?.kind === 'shared' ? h('div', {}, h('p.st-small', {}, cloud?.signedIn() ? 'A shared plan is one set of numbers you both fill in. Invite your person and it stays in step on both phones.' : 'A shared plan is one set of numbers you both fill in. Sign in below to invite your person, or send it with "Copy my link" on any step.'), h('div.st-row', {}, invite(space), btn('Remove the shared one', () => save(removeSpace(acct, space.id)), 'slim text'))) : space?.kind === 'extra' ? h('p.st-small', {}, 'This is what was on this device before you signed in. ', btn('Remove it', () => save(removeSpace(acct, space.id)), 'slim text')) : null,
        signIn(), ui.note ? h('p.st-note', { role: 'status' }, ui.note) : null,
        cloud?.signedIn() ? null : h('div.st-row', {}, btn('Forget this device', () => { device.signOut(); draw(); }, 'slim text')));
  $('main').replaceChildren(
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Stress Less About Money'), h('h1', {}, 'One thing at a time'), h('p', { style: { marginBottom: 0 } }, 'Each module is one question, answered properly, in a few minutes. Your answers ride along to the next one, so nothing is typed twice. Start anywhere.')),
    acct ? accountCard : null,
    h('ol.st-hub', {}, P.steps.map((s, i) => h('li', {}, h(`a.st-hubcard${s.done ? '.done' : ''}${P.next?.id === s.id ? '.st-pulse' : ''}`, { href: href(s) }, h('span.st-hubnum', { 'aria-hidden': 'true' }, s.done ? '✓' : i + 1), h('span', {}, h('strong', {}, s.title), h('small', {}, s.blurb)), h(`span.st-hubword${s.done ? '.ok' : ''}`, {}, word(s)))))),
    acct ? null : accountCard,
    h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, 'More to explore'), h('p.st-small', {}, 'Inside the whole plan: fire drills to practice a hard month, a map of everything, a money meeting for two, and twenty what-if tools.'), h('div.st-row', {}, h('a.st-btn.slim', { href: href(SOLO.at(-1)) }, 'Open the whole plan'))));
  $('foot').replaceChildren(h('p.st-small', {}, 'Education, not advice. Nothing is uploaded: your answers stay in your browser and in the link you choose to share.'));
}
draw();
