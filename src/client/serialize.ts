import "./style.css";

import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

window.MonacoEnvironment = {
  getWorker: async (_workerId: string, label: string) => {
    switch (label) {
      case 'json':
        return new jsonWorker();
      default:
        return new editorWorker();
    }
  },
}

// @ts-expect-error
monaco.languages.json.jsonDefaults.diagnosticsOptions.enableSchemaRequest = true;

const json = {
  $schema: "https://storageukgreadyedi.blob.core.windows.net/schema-files/template.json"
}

monaco.editor.create(document.getElementById('editor')!, {
  value: JSON.stringify(json, null, 2),
  language: 'json',
  wordBasedSuggestions: 'currentDocument',
  automaticLayout: true,
  theme: 'vs-dark'
});
