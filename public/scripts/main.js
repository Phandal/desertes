/**
  * @typedef {Object} MakeEditorOptions
  * @prop {boolean} [readonly]
  * @prop {string} [mode]
  */

const BaseTemplate = `
{
  "$schema": "http://localhost:3000/template"
}
`;
const ExampleJobInput =
  `{
  "documentNumber": 3,
  "data": [
    {
      "Employee": true,
      "Benefit Plans": [
          {
              "Benefit Plan Name": "LegalShield/IDShield",
              "Member Benefit Begin Date": "2025-01-01",
              "Member Benefit End Date": "9999-12-31",
              "Relationship Code": "Self",
              "Coverage Name": "Waived",
              "Benefit Plan Policy Number": "",
              "Benefit Plan Provider Name": "",
              "Vendor": "LegalShield/IDShield",
              "Benefit Type": "Other (01)",
              "EOI Provider Name": "",
              "Benefit Plan Effective From": "01/01/2025",
              "Benefit Plan Effective To": "12/31/9999"
          }
      ],
      "Subscriber Type": "Subscriber",
      "Reference ID": 1111111111,
      "Employee ID": "990",
      "First Name of Member": "first_name",
      "Middle Initial of Member": "middle_name",
      "Last Name of Member": "last_name",
      "Suffix of Member": "",
      "Members Date of Birth": "03/25/1982",
      "SSN of Member": "XXX-XX-XXXX",
      "SSN of Individual": "XXX-XX-XXXX",
      "Insured Party Telephone Number": "320 222 2222",
      "Member Email Address": "email@example.com",
      "Subscribers Address Line 1": "3333 33th ST N",
      "Subscribers Address Line 2": "",
      "Subscribers City": "Brooklyn Park",
      "Subscribers State": "MN",
      "Subscribers Zip Code": "55443",
      "Subscribers Country Code": "US",
      "Member Hire Date": "03/06/2023",
      "Member Termination Date": "",
      "Member Rehire Date": "",
      "Member Paid Hourly": false,
      "Member Pay Frequency": "Bi-Weekly",
      "Member Deceased": false,
      "Member Employment Status": "Active",
      "Members Marital Status": "Married",
      "Member Handicapped": "No",
      "Members Gender": "F",
      "Student Status": "N",
      "Life Event Change": ""
    },
    {
      "Employee": true,
      "Benefit Plans": [
          {
              "Benefit Plan Name": "LegalShield/IDShield",
              "Member Benefit Begin Date": "2025-01-01",
              "Member Benefit End Date": "9999-12-31",
              "Relationship Code": "Self",
              "Coverage Name": "Waived",
              "Benefit Plan Policy Number": "",
              "Benefit Plan Provider Name": "",
              "Vendor": "LegalShield/IDShield",
              "Benefit Type": "Other (01)",
              "EOI Provider Name": "",
              "Benefit Plan Effective From": "01/01/2025",
              "Benefit Plan Effective To": "12/31/9999"
          }
      ],
      "Subscriber Type": "Subscriber",
      "Reference ID": 1111111111,
      "Employee ID": "990",
      "First Name of Member": "first_name",
      "Middle Initial of Member": "middle_name",
      "Last Name of Member": "last_name",
      "Suffix of Member": "",
      "Members Date of Birth": "03/25/1982",
      "SSN of Member": "XXX-XX-XXXX",
      "SSN of Individual": "XXX-XX-XXXX",
      "Insured Party Telephone Number": "320 222 2222",
      "Member Email Address": "email@example.com",
      "Subscribers Address Line 1": "3333 33th ST N",
      "Subscribers Address Line 2": "",
      "Subscribers City": "Brooklyn Park",
      "Subscribers State": "MN",
      "Subscribers Zip Code": "55443",
      "Subscribers Country Code": "US",
      "Member Hire Date": "03/06/2023",
      "Member Termination Date": "",
      "Member Rehire Date": "",
      "Member Paid Hourly": false,
      "Member Pay Frequency": "Bi-Weekly",
      "Member Deceased": false,
      "Member Employment Status": "Active",
      "Members Marital Status": "Married",
      "Member Handicapped": "No",
      "Members Gender": "F",
      "Student Status": "N",
      "Life Event Change": ""
    }
  ]
}`;

// Load the language_tools extension
ace.require('ace/ext/language_tools');

/**
  * Setup up an ACE editor
  * @param {string} id - id of the element to make into an Editor
  * @param {MakeEditorOptions} options - options for the created Editor
  * @returns {AceAjax.Editor}
  */
function makeEditor(id, options) {
  const editor = ace.edit(id);
  const session = editor.session;

  editor.setTheme('ace/theme/monokai');
  editor.setReadOnly(options.readonly !== undefined ? options.readonly : false);

  session.setMode(options.mode ? options.mode : 'ace/mode/json');
  session.setUseSoftTabs(true);
  session.setTabSize(2);

  return editor;
}

/**
  * Setup an ACE editor with LSP support
  * @param {string} id - the id of the elemtn to make into an Editor
  * @param {MakeEditorOptions} options - options for the created Editor
  * @returns {AceAjax.Editor}
  */
function makeLSPEditor(id, options) {
  const editor = makeEditor(id, options);

  // Enable autocompletion
  editor.setOptions({
    enableSnippets: true,
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true
  });

  // Setup LSP provider
  const provider = LanguageProvider.fromCdn('https://www.unpkg.com/ace-linters@latest/build/');
  provider.registerEditor(editor);

  return editor;
}

let vimEditMethod = false;
const templateEditor = makeLSPEditor('template-editor', {});
const inputEditor = makeEditor('input-editor', {});
const outputEditor = makeEditor('output-editor', { readonly: true, mode: 'ace/mode/text' });
const editableEditors = [templateEditor, inputEditor];

templateEditor.setValue(BaseTemplate);
inputEditor.setValue(ExampleJobInput);

const translateButton = /** @type {HTMLButtonElement} */(document.getElementById('translate'));
translateButton.addEventListener('click', async () => {
  const template = JSON.parse(templateEditor.getValue() || "{}")
  const job = JSON.parse(inputEditor.getValue() || "{}");

  const input = {
    members: job.data || [],
    referenceIdentifier: job.documentNumber || 1,
  };

  const response = await fetch('/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template, input }) })
  const body = await response.text();
  outputEditor.setValue(body);
});

const saveButton = /** @type {HTMLButtonElement} */(document.getElementById('save'));
saveButton.addEventListener('click', () => {
  const templateBlob = new Blob([templateEditor.getValue()], { type: 'application/json' });
  const url = (URL.createObjectURL(templateBlob));

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'template.json')
  link.click();
});

const switchEditMethodButton = /** @type {HTMLButtonElement} */(document.getElementById('switch'));
switchEditMethodButton.addEventListener('click', () => {
  editableEditors.forEach((editor) => {
    if (vimEditMethod) {
      editor.setKeyboardHandler('');
    } else {
      editor.setKeyboardHandler('ace/keyboard/vim');
    }
  });
  vimEditMethod = !vimEditMethod;
});

const clearButton = /** @type {HTMLButtonElement} */(document.getElementById('clear'));
clearButton.addEventListener('click', () => {
  outputEditor.setValue('');
});

window.addEventListener('beforeunload', function(e) {
  e.preventDefault();
});
