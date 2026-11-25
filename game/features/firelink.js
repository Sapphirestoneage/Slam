/* ============================================================================
   SLAM the Game: features/firelink.js
   PURPOSE     The button "Start from a blank FIRE sheet": one small function for each place that shows it
               (the Export entry of the game, the Export entry of the web app, a landing screen).
               It links to the copy link of Eli's Google Sheets template. Google asks the person to make
               a copy. No sign-in to SLAM is necessary.
   INPUT       Optional class names: { button, line }.
   OUTPUT      Functions: fireBlankButton. Constants: FIRE_BLANK_URL, FIRE_EXPORT_WORDS.
               The same three, as one object, for a page that loads this file as a module:
               globalThis.SLAM_FIRE_LINK (js/sheet/fire.js of the web app reads it).
   DEPENDS ON  Nothing. This file has no top-level name from a different file, thus it runs as a classic
               script (the game) and as a module (the web app).
   RULES       The label says that the sheet is simple and stands alone, and that the export of the app is
               the full plan. The link opens in a new tab.
   ========================================================================= */
const FIRE_BLANK_URL = "https://docs.google.com/spreadsheets/d/1HZBHzEeDgQRmGcqwzaXW1jgd2N3SPSddZkhS7svZhHY/copy";
const FIRE_EXPORT_WORDS = {
  xlsx: "Download for Excel or Google Sheets (.xlsx)",
  sheetsHelp:
    'Open in Google Sheets: go to sheets.google.com and open a blank sheet. Then File, Import, Upload, and choose the file. Pick "Replace spreadsheet".',
  blank: "Start from a blank FIRE sheet",
  blankLine:
    "A simple sheet that stands alone, in Google Sheets. Google asks you to make your own copy. No SLAM account needed. The export here is your full plan.",
};
/* The button with its line, as HTML. o.button and o.line are the class names of the place that shows it. */
function fireBlankButton(o) {
  o = o || {};
  return (
    `<a class="${o.button || "ghost slim"}" data-fire-blank="1" href="${FIRE_BLANK_URL}" target="_blank" rel="noopener">${FIRE_EXPORT_WORDS.blank}</a>` +
    `<div class="${o.line || "tiny muted"}">${FIRE_EXPORT_WORDS.blankLine}</div>`
  );
}
if (typeof globalThis !== "undefined")
  globalThis.SLAM_FIRE_LINK = { url: FIRE_BLANK_URL, words: FIRE_EXPORT_WORDS, button: fireBlankButton };
