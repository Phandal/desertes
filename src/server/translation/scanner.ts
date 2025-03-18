interface Scanner {
  scan: () => Token[]
  nextToken: () => Token | null;
}

export enum TokenType {
  Element,
  Element_Separator,
  Segment_Separator,
  Component_Separator,
  Repetition_Separator,
};

export class Token {
  type: TokenType;
  value: string;

  constructor(type: TokenType, value: string) {
    this.type = type;
    this.value = value;
  }

  getValue(): string {
    return this.value;
  }
}

export type X12ScannerOptions = {
  elementSeparator: string;
  segmentSeparator: string;
  componentSeparator: string;
  repetitionSeparator?: string;
  input: string;
};

export class X12Scanner implements Scanner {
  private readonly elementSep: string;
  private readonly segmentSep: string;
  private readonly componentSep: string;
  private readonly repetitionSep?: string;
  private readonly input: string;
  private componentSeperatorParsed: boolean = false;
  private tokens: Token[] = [];
  private inputPos: number = 0;
  private tokenPos: number = 0;

  constructor(opt: X12ScannerOptions) {
    this.elementSep = opt.elementSeparator;
    this.segmentSep = opt.segmentSeparator;
    this.componentSep = opt.componentSeparator;
    this.repetitionSep = opt.repetitionSeparator;
    this.input = opt.input;
  }

  scan(): Token[] {
    while (this.inputPos < this.input.length) {
      this.tokens.push(this.scan_token());
    }
    return this.tokens;
  }

  nextToken(): Token | null {
    if (this.tokenPos >= this.tokens.length) {
      return null;
    }

    return this.tokens[this.tokenPos++];
  }

  private scan_token(): Token {
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
      } else {
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

  private advance(num: number = 1): void {
    this.inputPos = this.inputPos + num;
  }

  private matchSeparator(separator?: string): boolean {
    if (!separator) { return false; };

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

  private isSeparator(): boolean {
    return this.matchSeparator(this.elementSep)
      || this.matchSeparator(this.segmentSep)
      || this.matchSeparator(this.componentSep)
      || this.matchSeparator(this.repetitionSep);
  }

  private consumeSeparator(separator?: string): void {
    this.advance(separator?.length);
  }

  private consumeElement(): Token {
    let elementValue: string = '';

    while (this.inputPos < this.input.length) {
      const char = this.input[this.inputPos];

      if (!this.isSeparator()) {
        elementValue += char;
        this.advance();
      } else {
        break;
      }
    }

    return new Token(TokenType.Element, elementValue);
  }
}
