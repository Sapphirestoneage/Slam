// SPDX-License-Identifier: AGPL-3.0-only
// Plain-language tooltips (B8): watches the page and gives every label, header and title that names a jargon term a
// dotted underline and a tooltip. Tapping one shows the same words (touch screens have no hover).
import { h } from './dom.js';
import { termIn } from '../glossary.js';
import { popover } from './staples.js';

const PLACES = '.label, th, h2, h3, .gate-label, .fold, .metric .label, .seg button, .caret, .subtab, .card strong, .metric a';
function decorate(root) {
  for (const el of root.querySelectorAll(PLACES)) {
    if (el.dataset.tipDone || el.closest('.math-pop, .pop')) continue;
    el.dataset.tipDone = '1';
    const text = el.childNodes.length === 1 && el.firstChild.nodeType === 3 ? el.textContent.trim() : el.textContent.trim().split('\n')[0];
    const hit = termIn(text);
    if (!hit) continue;
    if (el.title) { el.title = `${el.title}. ${hit.term}: ${hit.tip}`; continue; } // a link keeps what it does, and says what the term means
    el.title = `${hit.term}: ${hit.tip}`;
    if (el.tagName !== 'BUTTON') el.classList.add('has-tip');
  }
}
export function startTips(root = document.body) {
  let queued = false;
  const run = () => { queued = false; decorate(root); };
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(run); } }).observe(root, { childList: true, subtree: true });
  root.addEventListener('click', e => {
    const el = e.target.closest?.('.has-tip');
    if (!el || e.target.closest('button, input, select, a')) return;
    const [term, ...rest] = el.title.split(': ');
    popover(el, h('div.stack.tip-pop', { style: { gap: '4px' } }, h('strong', {}, term), h('span', {}, rest.join(': '))), { width: 300 });
  });
  run();
}
