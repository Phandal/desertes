import Handlebars from 'handlebars';
import { ElementRuleAttribute } from './types.js';
import {
  format as datefnsFormat,
  parse as datefnsParse,
  sub as datefnsSub,
} from 'date-fns';

export function postCompileAttributes(attrs: ElementRuleAttribute | undefined, input: string): string {
  if (!attrs) {
    return input;
  }
  let output = input;

  if (attrs.length) {
    output = lengthAttribute(output, attrs.length);
  }

  return output;
}

export function lengthAttribute(input: string, attr: ElementRuleAttribute['length']): string {
  const max = attr.max;
  const min = attr.min;
  const padding = attr.padding || ' ';

  if (max < min) {
    return input;
  }
  let output = input;

  if (output.length > max) {
    output = output.substring(0, max);
  }

  if (output.length < min) {
    output = output.padEnd(min, padding);
  }

  return output;
}

export function setupLogger(): void {
  Handlebars.logger.log = (_level, obj): void => console.log({ msg: `Handlebars Log: ${obj}` });
}

export function registerHelpers(): void {
  Handlebars.registerHelper('dateFormat', function (format: string, input?: string, inputFormat?: string | unknown): Handlebars.SafeString {
    if (typeof input === 'string' && input.length === 0) {
      return new Handlebars.SafeString('');
    } else {
      const dateStr = createValidDate(input, inputFormat);
      return new Handlebars.SafeString(datefnsFormat(dateStr, format));
    }
  });

  Handlebars.registerHelper('dateCompare', function (key: string, operator: string, input: string, options: Handlebars.HelperOptions): string {
    let result;
    const ad = getDateFromKey(key);
    const bd = new Date(input);

    switch (operator) {
      case '==':
        result = ad === bd;
        break;
      case '!=':
        result = ad !== bd;
        break;
      case '<=':
        result = ad <= bd;
        break;
      case '>=':
        result = ad >= bd;
        break;
      case '<':
        result = ad < bd;
        break;
      case '>':
        result = ad > bd;
        break;
      default:
        throw new Error(`invalid date compare operator: ${operator}`);
    }

    if (result) {
      //@ts-expect-error: no-implicit-any
      return options.fn(this);
    } else {
      //@ts-expect-error: no-implicit-any
      return options.inverse(this);
    }
  });

  Handlebars.registerHelper('compare', function (a: string, operator: string, b: string, options: Handlebars.HelperOptions): string {
    let result;

    switch (operator) {
      case '==':
        result = a === b;
        break;
      case '!=':
        result = a !== b;
        break;

      case '>=':
        result = a >= b;
        break;
      case '<=':
        result = a <= b;
        break;
      default:
        throw new Error(`invalid operator: ${operator}`);
    }

    if (result) {
      // console.log(JSON.stringify({ f: 'fn', a, b }));
      //@ts-expect-error: no-implicit-any
      return options.fn(this);
    } else {
      // console.log(JSON.stringify({ f: 'inverse', a, b }));
      //@ts-expect-error: no-implicit-any
      return options.inverse(this);
    }
  });

  Handlebars.registerHelper('replace', function (match: string, replace: string, d: string): string {
    if (typeof d !== 'string') {
      return d;
    }

    const reg = RegExp(match);
    return d.replace(reg, replace);
  });

  Handlebars.registerHelper('replaceAll', function (match: string, replace: string, d: string): string {
    if (typeof d !== 'string') {
      return d;
    }

    const reg = RegExp(match, 'g');
    return d.replaceAll(reg, replace);
  });

  Handlebars.registerHelper('match', function (val: string, ...arr: unknown[]): string {
    const idx = arr.indexOf(val);

    return idx < 0 ? '' : arr[idx] as string;
  });

  Handlebars.registerHelper('matchArray', function (val: string, arr: string[]): string {
    const idx = arr.indexOf(val);

    return idx < 0 ? '' : arr[idx];
  });

  Handlebars.registerHelper('length', function (options: Handlebars.HelperOptions): string {
    //@ts-expect-error: no-implicit-any
    return options.fn(this).length.toString();
  });

  Handlebars.registerHelper('ssnFormat', function (key: string, ssn?: string): string {
    if (typeof ssn !== 'string') {
      return '';
    }

    const { first, second, third } = parseSSN(ssn);
    switch (key) {
      case 'dash':
        return `${first}-${second}-${third}`;
      case 'nodash':
        return `${first}${second}${third}`;
      default:
        throw new Error(`invalid ssn format key '${key}'`);
    }
  });
}

function getDateFromKey(key: string): Date {
  switch (key) {
    case 'lastweek':
      return datefnsSub(new Date(), {
        weeks: 1,
      });
    case 'yesterday':
      return datefnsSub(new Date(), {
        days: 1,
      });
    default:
      throw new Error(`invalid date compare key: ${key}`);
  }
}

function createValidDate(input?: string, inputFormat?: string | unknown): Date {
  if (input === undefined || typeof input !== 'string') {
    return new Date();
  }

  if (inputFormat === undefined || typeof inputFormat !== 'string') {
    return new Date(input);
  }
  return datefnsParse(input, inputFormat, new Date());
}

function parseSSN(ssn: string): { first: string, second: string, third: string } {
  if (ssn.length === 9) {
    return {
      first: ssn.substring(0, 3),
      second: ssn.substring(3, 5),
      third: ssn.substring(5, 9),
    };
  } else if (ssn.length === 11 && ssn.charAt(3) === '-' && ssn.charAt(6) === '-') {
    return {
      first: ssn.substring(0, 3),
      second: ssn.substring(4, 6),
      third: ssn.substring(7, 11),
    };
  } else {
    throw new Error(`invalid ssn format '${ssn.replaceAll(/[a-zA-Z0-9]/g, 'X')}'`);
  }
}
