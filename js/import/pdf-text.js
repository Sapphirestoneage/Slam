// SPDX-License-Identifier: AGPL-3.0-only
// The text of a PDF, read in the browser (vendor/pdfjs). The file never leaves the device. Returns pages of pieces
// { str, x, y, w }: printed text, plus the value typed into each form field at the field's own spot.
export async function pdfPages(buffer, { max = 6 } = {}) {
  const lib = await import('../../vendor/pdfjs/pdf.min.mjs');
  lib.GlobalWorkerOptions.workerSrc = new URL('../../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
  const doc = await lib.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, disableFontFace: true }).promise, pages = [];
  for (let n = 1; n <= Math.min(max, doc.numPages); n++) {
    const page = await doc.getPage(n), text = await page.getTextContent(), notes = await page.getAnnotations().catch(() => []);
    const items = text.items.filter(i => i.str != null).map(i => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width ?? 0 }));
    for (const a of notes) if (a.subtype === 'Widget' && typeof a.fieldValue === 'string' && a.fieldValue.trim() && a.rect) items.push({ str: a.fieldValue, x: a.rect[0], y: a.rect[1] + 2, w: a.rect[2] - a.rect[0] });
    pages.push(items);
  }
  return pages;
}
