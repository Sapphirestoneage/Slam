// SPDX-License-Identifier: AGPL-3.0-only
// Save a file the app made (the spreadsheet, the backup) to the person's computer (batch 7, item 1). On the site a
// hidden link with a download name does it. Inside a claude.ai artifact the sandbox refuses that link, so the page
// hands the file to the artifact's own download door (the "downloads" capability, declared when the artifact is
// published); the viewer sees a confirmation and may decline. One function, so the two save spots never drift.
// Resolves 'saved', 'declined' (the viewer said no) or 'unavailable' (no door here; the link was tried instead).
export async function saveFile(blob, filename) {
  const door = await downloadsDoor();
  if (door) {
    try { await door.save({ filename, data: blob }); return 'saved'; } catch (e) {
      if (e?.code === 'declined') return 'declined';
      // Any other refusal: fall through to the link, which is the best the page can do.
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  return door ? 'unavailable' : 'saved';
}
// The artifact runtime's download namespace, or null on the site (window.claude is only there inside an artifact).
async function downloadsDoor() {
  try { return typeof window !== 'undefined' && window.claude?.use ? await window.claude.use('downloads') : null; } catch { return null; }
}
// What to tell the person after a save: the toast text, by outcome.
export const saveWords = (result, what) => (result === 'declined' ? `${what} not saved: the download was declined.` : result === 'unavailable' ? `${what} could not be saved here. Open the site to download it.` : null);
