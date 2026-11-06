// SPDX-License-Identifier: AGPL-3.0-only
// Plain-language tooltips (B8): watches the page and gives every label, header and title that names a jargon term a
// dotted underline and a tooltip. Tapping one shows the same words (touch screens have no hover).
import { h } from './dom.js';
import { termIn, GLOSSARY, PLAIN, PLAIN_ON } from '../glossary.js';
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
// Batch 37: on Home, Goals, Transitions and Debt payoff, the first time each of Eli's terms shows in plain view it is
// paired with its plain meaning, "big e (job-loss fund)", and keeps its hover tip. Controls (buttons, chips, boxes) and
// popovers are left as they are; a term already paired where it can be seen is not paired again.
const SKIP = 'button, input, select, textarea, option, label.seg, .seg, .pop, svg, script, style, .term-pair, [aria-hidden="true"], .sr';
export function pairTerms(main, hash = location.hash) {
  if (!main || !PLAIN_ON.some(r => hash === r || hash.startsWith(`${r}?`) || hash.startsWith(`${r}/`))) return 0;
  let made = 0;
  for (const p of PLAIN) {
    const walk = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, { acceptNode: n => (!p.re.test(n.nodeValue) || n.parentElement?.closest(SKIP) || n.parentElement?.checkVisibility?.() === false ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const node = walk.nextNode();
    if (!node) continue;
    // The pair goes with the first mention in reading order: a pair made before an earlier line appeared moves up.
    const seen = [...main.querySelectorAll(`.term-pair[data-term="${p.term}"]`)].filter(el => el.checkVisibility?.() !== false);
    if (seen.some(el => el.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    for (const el of seen) el.replaceWith(document.createTextNode(el.firstChild.textContent));
    const m = node.nodeValue.match(p.re), at = m.index, end = at + m[0].length;
    const tip = GLOSSARY[p.term];
    const pair = h('span.term-pair', { 'data-term': p.term }, h(`span${tip ? '.has-tip' : ''}`, tip ? { title: `${p.term}: ${tip}` } : {}, m[0]), ` (${p.plain})`);
    const rest = node.splitText(at); rest.nodeValue = rest.nodeValue.slice(end - at);
    node.parentNode.insertBefore(pair, rest);
    made++;
  }
  return made;
}
export function startTips(root = document.body) {
  let queued = false;
  const run = () => { queued = false; decorate(root); pairTerms(root.querySelector('main')); };
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(run); } }).observe(root, { childList: true, subtree: true });
  root.addEventListener('click', e => {
    const el = e.target.closest?.('.has-tip');
    if (!el || e.target.closest('button, input, select, a')) return;
    const [term, ...rest] = el.title.split(': ');
    popover(el, h('div.stack.tip-pop', { style: { gap: '4px' } }, h('strong', {}, term), h('span', {}, rest.join(': '))), { width: 300 });
  });
  run();
}
