import * as monaco from 'monaco-editor';

export function makeEditor(
	div: HTMLDivElement,
	o: { readOnly?: boolean; language: 'json' | 'text' },
): monaco.editor.IStandaloneCodeEditor {
	const editor = monaco.editor.create(div, {
		language: o.language,
		wordBasedSuggestions: 'currentDocument',
		automaticLayout: true,
		readOnly: o.readOnly,
		theme: 'vs-dark',
		minimap: {
			enabled: false,
		},
		stickyScroll: {
			enabled: false,
		},
	});

	return editor;
}
