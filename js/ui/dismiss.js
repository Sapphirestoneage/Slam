// One way to close things (fix pass item 2): a click outside, or Escape, closes popovers, row More panels and
// More carets. Each opener registers what it opened here; there are no per-component listeners.
// Rules: a click inside the thing (or on what opened it) keeps it; a click inside a popover keeps the panels
// under it (a pick from a box opened inside a panel); one open per group (one row More per list);
// nothing closes while you are typing inside it. No DOM import, so the Node tests can drive it.

const OPEN = new Set();
const typing = el => !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable === true ||
  (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'range'].includes(el.type)));
const inside = (entry, node) => !!node && (entry.el?.contains?.(node) || entry.anchor?.contains?.(node));
// Gone: it was on the page and a redraw took it off (a fresh copy registers itself). Never-attached ones wait.
const gone = entry => {
  if (entry.el?.isConnected !== false) { entry.seen = true; return false; }
  return entry.seen === true;
};

function close(entry) { OPEN.delete(entry); entry.close(); }
function prune() { for (const e of [...OPEN]) if (gone(e)) OPEN.delete(e); }

// Register something that is now open. Returns a function to call when it closes some other way.
// entry: { el, anchor?, close, group?, pop? }  pop: a popover (a box over the page), closed before panels on Escape.
export function opened(entry) {
  prune();
  if (entry.group) for (const e of [...OPEN]) if (e.group === entry.group && e !== entry) close(e);
  OPEN.add(entry);
  return () => OPEN.delete(entry);
}
export const openCount = () => { prune(); return OPEN.size; };
export function closeAll() { for (const e of [...OPEN]) close(e); }

// Was focus in a text box inside an open panel? Asked when the press starts, before the box loses focus
// (losing it saves the box, which can redraw the panel).
export const typingInPanel = active => typing(active) && [...OPEN].some(e => !e.pop && e.el?.contains?.(active));
// A click landed on target. typed: the press started while typing inside a panel; that click only ends the
// typing, so the panel stays (the next click away closes it). Returns how many closed.
export function clickedAt(target, { typed = false } = {}) {
  prune();
  const inPop = [...OPEN].some(e => e.pop && inside(e, target));
  let n = 0;
  for (const e of [...OPEN]) {
    if (inside(e, target)) continue;
    if (!e.pop && (inPop || typed)) continue;
    close(e); n++;
  }
  return n;
}
// Escape: the popover first (it sits on top); with none open, every panel you are not typing in.
export function escapeFrom(active) {
  prune();
  const pops = [...OPEN].filter(e => e.pop);
  const list = pops.length ? pops : [...OPEN].filter(e => !(typing(active) && e.el?.contains?.(active)));
  list.forEach(close);
  return list.length;
}

// The page wiring: one capture listener each, so it runs before the clicked button's own handler. A panel that
// closes above the click must not move what you clicked, so the window scroll makes up the difference.
export function install(doc, win) {
  let typed = false;
  doc.addEventListener('mousedown', () => { typed = typingInPanel(doc.activeElement); }, true);
  doc.addEventListener('click', e => {
    const was = typed; typed = false;
    if (e.target?.closest?.('.toast')) return;
    const before = e.target?.getBoundingClientRect?.().top;
    if (clickedAt(e.target, { typed: was }) && before !== undefined && e.target.isConnected) {
      const d = e.target.getBoundingClientRect().top - before;
      if (Math.abs(d) > 1) win.scrollTo({ top: win.scrollY + d, behavior: 'instant' });
    }
  }, true);
  doc.addEventListener('keydown', e => { if (e.key === 'Escape') escapeFrom(doc.activeElement); });
}
