// SPDX-License-Identifier: AGPL-3.0-only
// Builds tools/intake/SLAMIntake.gs from the intake registry (js/registry/intake.js):
//   node tools/intake/build-form.mjs          writes the file
//   node tools/intake/build-form.mjs --check  exits 1 when the file is out of date (test/intake.test.js does this too)
// The .gs is one Google Apps Script file: the form as data, plus createSlamIntake(), which makes the Google Form with
// its sections and branching and links a responses Sheet. Each question is keyed by its exact title, which is also
// the column header in the responses CSV; js/intake.js reads the columns back through the same registry.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { INTAKE, SECTIONS } from '../../js/registry/intake.js';

const OUT = fileURLToPath(new URL('./SLAMIntake.gs', import.meta.url));

// The form as plain data: sections in order, each with its questions and where it goes next.
export function formData() {
  return {
    title: INTAKE.title, description: INTAKE.description, confirmation: INTAKE.confirmation, sheetName: INTAKE.sheetName,
    sections: SECTIONS.map(s => ({
      id: s.id, title: s.title, help: s.help ?? '', next: s.next,
      questions: s.questions.map(q => {
        const branches = q.choices?.some(c => c.goto);
        return {
          id: q.id, type: q.type, title: q.title, help: q.help ?? '', required: !!(q.required || branches), other: !!q.other,
          ...(q.choices ? { choices: q.choices.map(c => (branches ? [c.label, c.goto ?? s.next] : [c.label])) } : {}), // a branching question names every choice's section
          ...(q.rows ? { rows: q.rows.map(([, label]) => label), columns: q.columns.map(([label]) => label) } : {}),
        };
      }),
    })),
  };
}

export function buildScript() {
  const data = JSON.stringify(formData(), null, 1).replace(/\n\s*/g, ' ').replace(/\[ /g, '[').replace(/ \]/g, ']').replace(/\{ /g, '{').replace(/ \}/g, '}');
  return `// SLAM: before our first session (the pre-session intake form). Made by tools/intake/build-form.mjs; do not edit by hand.
//
// How to run it:
// 1. Go to script.google.com and click New project.
// 2. Delete what is in the editor, paste this whole file in, and click Save.
// 3. Pick createSlamIntake in the function menu at the top and click Run. Allow access when Google asks (it needs
//    Forms and Sheets, in your own Drive).
// 4. Open View, Logs (or Execution log): it shows the link to send clients, the link to edit the form, and the
//    responses Sheet.
// To bring answers into SLAM: open the responses Sheet, File, Download, Comma-separated values (.csv). Then in SLAM,
// Coach tools, Data, Import intake (CSV).
// Question titles are how SLAM finds each answer. If you reword one in Google Forms, the import shows that question
// under "SLAM could not place"; ask for the new wording to be added to SLAM (js/registry/intake.js, aka).

var SLAM_FORM = ${data};

function createSlamIntake() {
  var F = SLAM_FORM;
  var form = FormApp.create(F.title);
  form.setDescription(F.description)
    .setConfirmationMessage(F.confirmation)
    .setProgressBar(true)
    .setCollectEmail(false)
    .setAllowResponseEdits(false)
    .setLimitOneResponsePerUser(false)
    .setShowLinkToRespondAgain(false);

  // Pass 1: one page break per section after the first (the first section is the top of the form).
  var pages = {};
  var breaks = [];
  var choiceItems = [];
  F.sections.forEach(function (s, i) {
    if (i > 0) {
      var pb = form.addPageBreakItem().setTitle(s.title).setHelpText(s.help || '');
      pages[s.id] = pb;
      breaks.push(pb);
    }
    s.questions.forEach(function (q) {
      var item = addQuestion(form, q);
      if (q.choices && q.choices.some(function (c) { return c.length > 1; })) choiceItems.push({ q: q, item: item });
    });
  });

  // Pass 2: branching. A tap that goes somewhere else ("Go to section based on answer").
  choiceItems.forEach(function (x) {
    x.item.setChoices(x.q.choices.map(function (c) {
      if (c.length < 2) return x.item.createChoice(c[0]);
      return c[1] === 'submit' ? x.item.createChoice(c[0], FormApp.PageNavigationType.SUBMIT) : x.item.createChoice(c[0], pages[c[1]]);
    }));
  });
  // Pass 3: where each section goes when no answer sends it elsewhere (set on the page break that follows it).
  F.sections.forEach(function (s, i) {
    var after = breaks[i]; // the page break that starts section i + 1
    if (!after) return;
    if (s.next === 'submit') after.setGoToPage(FormApp.PageNavigationType.SUBMIT);
    else if (pages[s.next] && pages[s.next] !== after) after.setGoToPage(pages[s.next]);
  });

  var sheet = SpreadsheetApp.create(F.sheetName);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
  Logger.log('Send clients this link: ' + form.getPublishedUrl());
  Logger.log('Edit the form here: ' + form.getEditUrl());
  Logger.log('Responses Sheet: ' + sheet.getUrl());
  return form.getPublishedUrl();
}

function addQuestion(form, q) {
  var item;
  if (q.type === 'text' || q.type === 'number') {
    item = form.addTextItem();
    if (q.type === 'number') {
      item.setValidation(FormApp.createTextValidation()
        .setHelpText('Numbers only, like 2400 or 2,400.')
        .requireTextMatchesPattern('^ *[$]? *[0-9][0-9,]*([.][0-9]{1,2})? *$')
        .build());
    }
  } else if (q.type === 'paragraph') {
    item = form.addParagraphTextItem();
  } else if (q.type === 'choice') {
    item = form.addMultipleChoiceItem();
    item.setChoiceValues(q.choices.map(function (c) { return c[0]; }));
  } else if (q.type === 'checkbox') {
    item = form.addCheckboxItem();
    item.setChoiceValues(q.choices.map(function (c) { return c[0]; }));
    if (q.other) item.showOtherOption(true);
  } else if (q.type === 'list') {
    item = form.addListItem();
    item.setChoiceValues(q.choices.map(function (c) { return c[0]; }));
  } else if (q.type === 'grid') {
    item = form.addGridItem();
    item.setRows(q.rows).setColumns(q.columns);
  } else {
    throw new Error('Unknown question type ' + q.type + ' for ' + q.id);
  }
  item.setTitle(q.title);
  if (q.help) item.setHelpText(q.help);
  if (q.required) item.setRequired(true);
  return item;
}
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = buildScript();
  if (process.argv.includes('--check')) {
    const now = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (now !== text) { console.error('tools/intake/SLAMIntake.gs is out of date: node tools/intake/build-form.mjs'); process.exit(1); }
    console.log('SLAMIntake.gs is current.');
  } else {
    writeFileSync(OUT, text);
    console.log(`Wrote ${OUT}`);
  }
}
