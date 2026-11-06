// SPDX-License-Identifier: AGPL-3.0-only
// Batch 13 (item 1): one caret header for every section on every screen. A clear caret button with the section's
// title; closed, the header shows a one-line summary ("Accommodation · $1,000 of $2,305 typical · 2 lines") and the
// body is hidden. The core section of a screen starts open, the rest start closed (DESIGN.md rule 9).
// Which sections are open is a view setting, not the client's money, so it is kept per client in this browser
// (localStorage, read and written inside try/catch, in memory when storage is blocked). It never goes into the client
// file, the undo stack, the change log, the export or the workbook, and a caret click is never an undo step.
import { h, clear, icon } from './dom.js';

const KEY = 'slam.sections';
let client = '_';
let mem = {};
const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return mem; } };
const write = all => { mem = all; try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage blocked: kept for this tab */ } };
export function setSectionClient(id) { client = id || '_'; }
export function sectionOpen(id, dflt = false) { const v = read()[client]?.[id]; return typeof v === 'boolean' ? v : dflt; }
export function rememberSection(id, open) { const all = read(); (all[client] ??= {})[id] = !!open; write(all); }

// Open or close one section element (made by sec or secWrap), and remember it.
export function setSection(el, open, { remember = true } = {}) {
  if (!el?.classList?.contains('sec')) return;
  el.classList.toggle('sec-closed', !open);
  const btn = el.querySelector('.sec-caret');
  if (btn) { btn.setAttribute('aria-expanded', String(open)); btn.querySelector('.sec-chev')?.replaceChildren(icon(open ? 'down' : 'right')); }
  if (open && el._secBuild) { const build = el._secBuild; el._secBuild = null; const body = el.querySelector(':scope > .sec-body'); if (body) clear(body, build()); }
  if (remember && el.dataset.sec) rememberSection(el.dataset.sec, open);
  el._secOnToggle?.(open);
}
// Every closed section around an element opens (Show me, Fix it and Find land on a box that is inside one).
export function openAround(el) {
  let n = 0;
  for (let p = el?.closest?.('.sec.sec-closed'); p; p = p.parentElement?.closest('.sec.sec-closed')) { setSection(p, true); n++; }
  return n;
}
// Open all / Close all for the screen (the shell puts the two small links at the top when a screen has two or more).
export function setAllSections(root, open) { for (const el of root.querySelectorAll('.sec[data-sec]')) setSection(el, open); }

// The caret button: a bordered chevron box and the title, inside the heading (a heading may hold a button, not the
// other way round).
// Batch 18: the caret carries data-focus sec:<id>, so Find and Show me can land on a section (and open it) by name.
export function caretButton(title, open, tip, id = null) {
  const b = h('button.sec-caret', { type: 'button', 'aria-expanded': String(open), title: tip || null, 'data-focus': id ? `sec:${id}` : null },
    h('span.sec-chev', { 'aria-hidden': 'true' }, icon(open ? 'down' : 'right')), h('span.sec-title-text', {}, title));
  b.onclick = () => { const el = b.closest('.sec'); setSection(el, el.classList.contains('sec-closed')); };
  return b;
}
const sumEl = summary => (summary ? h('span.sec-sum', { title: typeof summary === 'string' ? summary : null }, summary) : null);

// A new section: sec('budget:joy', { title: 'Joy by category', summary: '3 rated' }, ...kids). kids may be one function
// (built the first time the section opens: heavy cards stay unbuilt while closed).
export function sec(id, { title, summary = null, open = false, area = null, extra = [], tip = null, card = false, level = 'h2' } = {}, ...kids) {
  const isOpen = sectionOpen(id, open);
  const lazy = kids.length === 1 && typeof kids[0] === 'function';
  const head = h('div.section-title.sec-head', {}, h(level, {}, caretButton(title, isOpen, tip, id)), sumEl(summary), h('span.spacer'), ...[extra].flat());
  const body = h(`div.sec-body${card ? '.card' : ''}`, {}, lazy ? (isOpen ? kids[0]() : null) : kids);
  const el = h(`section.section.sec${area ? `.area-${area}` : ''}${isOpen ? '' : '.sec-closed'}`, { 'data-sec': id }, head, body);
  if (lazy && !isOpen) el._secBuild = kids[0];
  return el;
}

// Turn a section someone else built into a caret section. el: the section; head: its header row (default: its
// .section-title); the heading inside it becomes the caret button. Everything in el but the header hides when closed.
export function secWrap(el, id, { summary = null, open = false, head = null, tip = null } = {}) {
  if (!el?.querySelector) return el;
  const hd = head ?? el.querySelector(':scope > .section-title');
  const hx = hd?.querySelector('h1, h2, h3');
  if (!hd || !hx) return el;
  const isOpen = sectionOpen(id, open);
  const title = [...hx.childNodes];
  hx.replaceChildren(caretButton('', isOpen, tip, id)); // batch 37: data-focus sec:<id>, so Find can land on a wrapped section too
  hx.querySelector('.sec-title-text').append(...title);
  hd.classList.add('sec-head');
  if (summary) hx.after(sumEl(summary));
  if (hd.parentElement !== el) hd.parentElement.classList.add('sec-head-host');
  el.classList.add('sec');
  el.classList.toggle('sec-closed', !isOpen);
  el.dataset.sec = id;
  return el;
}

// A card whose first header row (a .section-title or a .row-line) holds its title: the title becomes the caret.
export const secCard = (el, id, opt = {}) => (el ? secWrap(el, id, { head: el.querySelector(':scope > .section-title, :scope > .row-line:has(h1, h2, h3), :scope > .sec-title-row'), ...opt }) : el);

// The shell's small "Open all · Close all" links, for a screen with two or more sections.
export function sectionTools(root) {
  const n = root.querySelectorAll('.sec[data-sec]').length;
  if (n < 2) return null;
  const link = (text, open) => h('button.link-btn', { type: 'button', onclick: () => setAllSections(root, open) }, text);
  return h('div.sec-all.no-print', { role: 'group', 'aria-label': 'Sections on this screen' }, link('Open all', true), h('span.muted', { 'aria-hidden': 'true' }, '·'), link('Close all', false));
}
