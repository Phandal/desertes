"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.X12Parser = exports.Element = exports.Segment = exports.Document = void 0;
const scanner_js_1 = require("#translation/scanner.js");
class Document {
    segments;
    segmentPosition;
    constructor() {
        this.segments = [];
        this.segmentPosition = 0;
    }
    processSegment(segment) {
        this.segments.push(segment);
        return this;
    }
    nextSegment() {
        if (!this.hasNextSegment()) {
            return null;
        }
        return this.segments[this.segmentPosition++];
    }
    hasNextSegment() {
        return this.segmentPosition < this.segments.length;
    }
    tags() {
        return this.segments.map((segment) => segment.tag);
    }
}
exports.Document = Document;
class Segment {
    tag;
    elements;
    elementPosition;
    constructor() {
        this.tag = '';
        this.elements = [];
        this.elementPosition = 0;
    }
    processElement(token) {
        const value = token.getValue();
        if (this.tag === '') {
            this.tag = value;
        }
        this.elements.push(new Element(value));
        return this;
    }
    nextElement() {
        if (this.elementPosition >= this.elements.length) {
            return null;
        }
        return this.elements[this.elementPosition++];
    }
}
exports.Segment = Segment;
class Element {
    value;
    constructor(value) {
        this.value = value;
    }
}
exports.Element = Element;
class X12Parser {
    scanner;
    document;
    constructor(opts) {
        this.scanner = new scanner_js_1.X12Scanner(opts);
        this.document = new Document();
    }
    parse() {
        this.scanner.scan();
        let currentSegment = new Segment();
        while (true) {
            const token = this.scanner.nextToken();
            if (!token) {
                break;
            }
            switch (token.type) {
                case scanner_js_1.TokenType.Element_Separator:
                    break;
                case scanner_js_1.TokenType.Segment_Separator:
                    this.document.processSegment(currentSegment);
                    currentSegment = new Segment();
                    break;
                case scanner_js_1.TokenType.Component_Separator:
                    break; // TODO: not quite sure what to do with these exactly
                case scanner_js_1.TokenType.Repetition_Separator:
                    break; // TODO: not quite sure what to do with these exactly
                case scanner_js_1.TokenType.Element:
                    currentSegment.processElement(token);
                    break;
                default:
                    throw Error('unrecognized token'); // TODO: find a better error solution
            }
        }
        return this.document;
    }
}
exports.X12Parser = X12Parser;
