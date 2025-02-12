"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.X12Scanner = exports.Token = exports.TokenType = void 0;
var TokenType;
(function (TokenType) {
    TokenType[TokenType["Element"] = 0] = "Element";
    TokenType[TokenType["Element_Separator"] = 1] = "Element_Separator";
    TokenType[TokenType["Segment_Separator"] = 2] = "Segment_Separator";
    TokenType[TokenType["Component_Separator"] = 3] = "Component_Separator";
    TokenType[TokenType["Repetition_Separator"] = 4] = "Repetition_Separator";
})(TokenType || (exports.TokenType = TokenType = {}));
;
class Token {
    type;
    value;
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
    getValue() {
        return this.value;
    }
}
exports.Token = Token;
class X12Scanner {
    elementSep;
    segmentSep;
    componentSep;
    repetitionSep;
    input;
    componentSeperatorParsed = false;
    tokens = [];
    inputPos = 0;
    tokenPos = 0;
    constructor(opt) {
        this.elementSep = opt.elementSeparator;
        this.segmentSep = opt.segmentSeparator;
        this.componentSep = opt.componentSeparator;
        this.repetitionSep = opt.repetitionSeparator;
        this.input = opt.input;
    }
    scan() {
        while (this.inputPos < this.input.length) {
            this.tokens.push(this.scan_token());
        }
        return this.tokens;
    }
    nextToken() {
        if (this.tokenPos >= this.tokens.length) {
            return null;
        }
        return this.tokens[this.tokenPos++];
    }
    scan_token() {
        if (this.matchSeparator(this.elementSep)) {
            this.consumeSeparator(this.elementSep);
            return new Token(TokenType.Element_Separator, '');
        }
        if (this.matchSeparator(this.segmentSep)) {
            this.consumeSeparator(this.segmentSep);
            return new Token(TokenType.Segment_Separator, '');
        }
        if (this.matchSeparator(this.componentSep)) {
            this.consumeSeparator(this.componentSep);
            if (this.componentSeperatorParsed) {
                return new Token(TokenType.Component_Separator, '');
            }
            else {
                this.componentSeperatorParsed = true;
                return new Token(TokenType.Element, this.componentSep);
            }
        }
        if (this.matchSeparator(this.repetitionSep)) {
            this.consumeSeparator(this.repetitionSep);
            return new Token(TokenType.Repetition_Separator, '');
        }
        const element = this.consumeElement();
        return element;
    }
    advance(num = 1) {
        this.inputPos = this.inputPos + num;
    }
    matchSeparator(separator) {
        if (!separator) {
            return false;
        }
        ;
        for (let i = 0; i < separator.length; ++i) {
            if (this.inputPos + i > this.input.length) {
                return false;
            }
            if (this.input[this.inputPos + i] !== separator[i]) {
                return false;
            }
        }
        return true;
    }
    isSeparator() {
        return this.matchSeparator(this.elementSep)
            || this.matchSeparator(this.segmentSep)
            || this.matchSeparator(this.componentSep)
            || this.matchSeparator(this.repetitionSep);
    }
    consumeSeparator(separator) {
        this.advance(separator?.length);
    }
    consumeElement() {
        let elementValue = '';
        while (this.inputPos < this.input.length) {
            const char = this.input[this.inputPos];
            if (!this.isSeparator()) {
                elementValue += char;
                this.advance();
            }
            else {
                break;
            }
        }
        return new Token(TokenType.Element, elementValue);
    }
}
exports.X12Scanner = X12Scanner;
