// ExcelJS for the browser, from jsDelivr, pinned to an exact version (no build step). Loaded the first time a
// spreadsheet is made or read, then kept.
import { EXCELJS_URL } from './excel.js';

let loading = null;
export function loadExcelJS() {
  if (globalThis.ExcelJS) return Promise.resolve(globalThis.ExcelJS);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = EXCELJS_URL;
    s.async = true;
    s.onload = () => (globalThis.ExcelJS ? resolve(globalThis.ExcelJS) : reject(new Error('The spreadsheet tool did not load.')));
    s.onerror = () => { loading = null; reject(new Error('The spreadsheet tool could not load. Check the connection and try again.')); };
    document.head.append(s);
  });
  return loading;
}
