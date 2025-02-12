/**
  * @typedef {Object} MakeEditorOptions
  * @prop {boolean} [readonly]
  * @prop {string} [mode]
  */

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

  editor.setTheme('ace/theme/twilight');
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

const templateEditor = makeLSPEditor('template-editor', {});
const inputEditor = makeEditor('input-editor', {});
const outputEditor = makeEditor('output-editor', { readonly: true, mode: 'ace/mode/text' });

templateEditor.setValue(JSON.stringify({ "$schema": "http://localhost:3000/template" }, null, 2));

const translateButton = /** @type {HTMLButtonElement} */(document.getElementById('translate'));
translateButton.addEventListener('click', async () => {
  const template = JSON.parse(templateEditor.getValue() || "{}")
  const job = JSON.parse(inputEditor.getValue() || "{}");

  const input = {
    members: job.data || [],
    referenceIdentifier: job.referenceIdentifier || 1,
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
})

window.addEventListener('beforeunload', function(e) {
  e.preventDefault();
});
