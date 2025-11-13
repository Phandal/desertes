import './style.css';
import { makeEditor } from './util';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

// Setting things on the window object
window.MonacoEnvironment = {
  getWorker: async (_workerId: string, label: string) => {
    switch (label) {
      case 'json':
        return new jsonWorker();
      default:
        return new editorWorker();
    }
  },
};
// @ts-expect-error
monaco.languages.json.jsonDefaults.diagnosticsOptions.enableSchemaRequest = true;

window.addEventListener('beforeunload', (e) => {
  e.preventDefault();
});

const json = `{
  "$schema": "https://storageukgreadyedi.blob.core.windows.net/schema-files/inboundtemplate.json",
}` as const;

let Filename = 'template.json';
const templateEditorDiv = <HTMLDivElement>(
  document.querySelector('div#template-editor')
);
const inputEditorDiv = <HTMLDivElement>(
  document.querySelector('div#input-editor')
);
const outputEditorDiv = <HTMLDivElement>(
  document.querySelector('div#output-editor')
);
const assembleButton = <HTMLButtonElement>(
  document.querySelector('button#assemble')
);
const deserializeButton = <HTMLButtonElement>(
  document.querySelector('button#deserialize')
);
const clearButton = <HTMLButtonElement>document.querySelector('button#clear');
const saveButton = <HTMLButtonElement>document.querySelector('button#save');
const fileInput = <HTMLInputElement>document.querySelector('input#load');

const templateEditor = makeEditor(templateEditorDiv, { language: 'json' });
const inputEditor = makeEditor(inputEditorDiv, { language: 'text' });
const outputEditor = makeEditor(outputEditorDiv, {
  readOnly: true,
  language: 'json',
});

templateEditor.setValue(json);

assembleButton.addEventListener('click', async () => {
  try {
    const template = JSON.parse(templateEditor.getValue() || '{}');
    const deserializerInput = inputEditor.getValue();

    const response = await fetch('/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'deserialize',
        onlyAssemble: true,
        template,
        deserializerInput,
      }),
    });
    const body = await response.text();
    outputEditor.setValue(body);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'unexpected client side error';
    outputEditor.setValue(message);
  }
});

deserializeButton.addEventListener('click', async () => {
  try {
    const template = JSON.parse(templateEditor.getValue() || '{}');
    const deserializerInput = inputEditor.getValue();

    const response = await fetch('/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'deserialize',
        onlyAssemble: false,
        template,
        deserializerInput,
      }),
    });
    const body = await response.text();
    outputEditor.setValue(body);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'unexpected client side error';
    outputEditor.setValue(message);
  }
});

clearButton.addEventListener('click', () => {
  outputEditor.setValue('');
});

saveButton.addEventListener('click', () => {
  const templateBlob = new Blob([templateEditor.getValue()], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(templateBlob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', Filename);
  link.click();
  link.remove();
});

fileInput.addEventListener('change', (e) => {
  const files = (<HTMLInputElement>e.target).files;
  if (!files || files.length === 0) return;

  const file = files[0];
  Filename = file.name;

  const reader = new FileReader();

  reader.onload = (e) => {
    if (!e.target) return;
    const fileContent = e.target.result || '';

    templateEditor.setValue(fileContent.toString());
  };

  reader.onerror = (e) => {
    outputEditor.setValue(`Error reading file: ${e}`);
  };

  reader.readAsText(file);
});
