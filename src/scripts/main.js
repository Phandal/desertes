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
function makeLSPEditor(id, options = { readonly: false, mode: 'ace/mode/json' }) {
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

const templateEditor = makeLSPEditor('template-editor', { mode: 'ace/mode/json' });
const inputEditor = makeEditor('input-editor', { mode: 'ace/mode/json' });
const outputEditor = makeEditor('output-editor', { readonly: true });

templateEditor.setValue(JSON.stringify({ "$schema": "http://localhost:3000/template" }, null, 2));

const button = /** @type {HTMLButtonElement} */(document.getElementById('translate'));
button.addEventListener('click', async () => {
  const template = JSON.parse(templateEditor.getValue() || "{}")
  const job = JSON.parse(inputEditor.getValue() || "{}");

  const input = {
    members: job.members || [],
    referenceIdentifier: job.referenceIdentifier || 1,
  };

  outputEditor.setValue(JSON.stringify({ template, input }, null, 2));
});

window.addEventListener('beforeunload', function(e) {
  e.preventDefault();
});
