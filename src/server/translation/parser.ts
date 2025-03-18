import {
	type Token,
	TokenType,
	X12Scanner,
	type X12ScannerOptions,
} from './scanner.js';

export class Document {
	segments: Segment[];
	private segmentPosition: number;

	constructor() {
		this.segments = [];
		this.segmentPosition = 0;
	}

	processSegment(segment: Segment): Document {
		this.segments.push(segment);
		return this;
	}

	nextSegment(): Segment | null {
		if (!this.hasNextSegment()) {
			return null;
		}

		return this.segments[this.segmentPosition++];
	}

	hasNextSegment(): boolean {
		return this.segmentPosition < this.segments.length;
	}

	tags(): string[] {
		return this.segments.map((segment) => segment.tag);
	}
}

export class Segment {
	tag: string;
	elements: Element[];
	private elementPosition: number;

	constructor() {
		this.tag = '';
		this.elements = [];
		this.elementPosition = 0;
	}

	processElement(token: Token): Segment {
		const value = token.getValue();

		if (this.tag === '') {
			this.tag = value;
		}
		this.elements.push(new Element(value));

		return this;
	}

	nextElement(): Element | null {
		if (this.elementPosition >= this.elements.length) {
			return null;
		}

		return this.elements[this.elementPosition++];
	}
}

export class Element {
	value: string;

	constructor(value: string) {
		this.value = value;
	}
}

export type X12ParserOptions = X12ScannerOptions;

export class X12Parser {
	scanner: X12Scanner;
	document;

	constructor(opts: X12ParserOptions) {
		this.scanner = new X12Scanner(opts);
		this.document = new Document();
	}

	parse(): Document {
		this.scanner.scan();

		let currentSegment = new Segment();

		while (true) {
			const token = this.scanner.nextToken();
			if (!token) {
				break;
			}

			switch (token.type) {
				case TokenType.Element_Separator:
					break;
				case TokenType.Segment_Separator:
					this.document.processSegment(currentSegment);
					currentSegment = new Segment();
					break;
				case TokenType.Component_Separator:
					break; // TODO: not quite sure what to do with these exactly
				case TokenType.Repetition_Separator:
					break; // TODO: not quite sure what to do with these exactly
				case TokenType.Element:
					currentSegment.processElement(token);
					break;
				default:
					throw Error('unrecognized token'); // TODO: find a better error solution
			}
		}

		return this.document;
	}
}
