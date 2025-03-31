import Handlebars from 'handlebars';
import { Logger } from '#util/logger.js';
import { ElementRuleAttribute } from './types.js';
import * as dateFns from 'date-fns';
import { UTCDate } from '@date-fns/utc';

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
  const logger = new Logger(process.stdout, 'DEBUG');
  Handlebars.logger.log = (_level, obj): void => console.log({ msg: `Handlebars Log: ${obj}` });
}

export function registerHelpers(): void {
  Handlebars.registerHelper('dateFormat', function (format: string, input?: string, inputFormat?: string | unknown): Handlebars.SafeString {
    if (typeof input === 'string' && input.length === 0) {
      return new Handlebars.SafeString('');
    } else {
      const dateStr = createValidDate(input, inputFormat);
      return new Handlebars.SafeString(dateFns.format(dateStr, format));
    }
  });

  Handlebars.registerHelper('dateCompare', function (key: string, operator: string, input: string, options: Handlebars.HelperOptions): string {
    let result;
    const ad = getDateFromKey(key);
    const bd = new UTCDate(input);

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

  Handlebars.registerHelper('getDate', function (mode: string, period: string, unit: string): string {

    if (!isMode(mode)) { throw new Error(`invalid mode '${mode}'`); }
    if (!isPeriod(period)) { throw new Error(`invalid period '${period}'`); }
    if (!isUnit(unit)) { throw new Error(`invalid unit '${unit}'`); }

    switch (mode) {
      case 'start':
        return dateFns.format(getDateStart(period, unit), 'MM/dd/yyyy');
      case 'end':
        return dateFns.format(getDateEnd(period, unit), 'MM/dd/yyyy');
    }
  });

  Handlebars.registerHelper('numberFormat', function (preference: string, precision: string, input: string): string {
    if (!input) { return ''; }

    const numberInput = Number(input);
    const numberPrecision = Math.trunc(Number(precision));

    if (!isDotPreference(preference)) { throw new Error(`invalid dot preference '${preference}'`); }
    if (isNaN(numberPrecision)) { throw new Error(`could not convert precision to number '${precision}'`); }
    if (!isPrecision(numberPrecision)) { throw new Error(`invalid dot precision. Must be between 0 and 20 inclusive '${precision}'`); }
    if (isNaN(numberInput)) { throw new Error(`could not convert value to number '${input}'`); }

    const formattedNumber = numberInput.toFixed(numberPrecision).toString();

    return preference === 'dot' ?
      formattedNumber
      :
      formattedNumber.replaceAll('.', '');
  });
}

type DotPreference = 'dot' | 'nodot';
type Precision = number;

function isDotPreference(preference: string): preference is DotPreference {
  return preference === 'dot' || preference === 'nodot';
}

function isPrecision(precision: number): precision is Precision {
  return precision >= 0 && precision <= 20;
}

type Mode = 'start' | 'end';
type Period = 'next' | 'current' | 'previous';
type Unit = 'week' | 'month' | 'year';

function isMode(modeString: string): modeString is Mode {
  return (modeString === 'start' || modeString === 'end');
}
function isPeriod(periodString: string): periodString is Period {
  return (periodString === 'previous' || periodString === 'current' || periodString === 'next');
}

function isUnit(unitString: string): unitString is Unit {
  return (unitString === 'week' || unitString === 'month' || unitString === 'year');
}

function getDateStart(period: Period, unit: Unit): Date {
  switch (period) {
    case 'next':
      return getDateStartNext(unit);
    case 'current':
      return getDateStartCurrent(unit);
    case 'previous':
      return getDateStartPrevious(unit);
  }
}

function getDateEnd(period: Period, unit: Unit): Date {
  switch (period) {
    case 'next':
      return getDateEndNext(unit);
    case 'current':
      return getDateEndCurrent(unit);
    case 'previous':
      return getDateEndPrevious(unit);
  }
}

function getDateStartNext(unit: Unit): Date {
  const now = new UTCDate();
  switch (unit) {
    case 'week':
      return dateFns.startOfWeek(dateFns.addWeeks(now, 1));
    case 'month':
      return dateFns.startOfMonth(dateFns.addMonths(now, 1));
    case 'year':
      return dateFns.startOfYear(dateFns.addYears(now, 1));
  }
}

function getDateStartCurrent(unit: Unit): Date {
  const now = new UTCDate();
  switch (unit) {
    case 'week':
      return dateFns.startOfWeek(now);
    case 'month':
      return dateFns.startOfMonth(now);
    case 'year':
      return dateFns.startOfYear(now);
  }
}

function getDateStartPrevious(unit: Unit): Date {
  const now = new UTCDate();
  switch (unit) {
    case 'week':
      return dateFns.startOfWeek(dateFns.subWeeks(now, 1));
    case 'month':
      return dateFns.startOfMonth(dateFns.subMonths(now, 1));
    case 'year':
      return dateFns.startOfYear(dateFns.subYears(now, 1));
  }
}

function getDateEndNext(unit: Unit): Date {
  const now = new UTCDate();
  switch (unit) {
    case 'week':
      return dateFns.endOfWeek(dateFns.addWeeks(now, 1));
    case 'month':
      return dateFns.endOfMonth(dateFns.addMonths(now, 1));
    case 'year':
      return dateFns.endOfYear(dateFns.addYears(now, 1));
  }
}

function getDateEndCurrent(unit: Unit): Date {
  const now = new UTCDate();
  switch (unit) {
    case 'week':
      return dateFns.endOfWeek(now);
    case 'month':
      return dateFns.endOfMonth(now);
    case 'year':
      return dateFns.endOfYear(now);
  }
}

function getDateEndPrevious(unit: Unit): Date {
  const now = new UTCDate();
  switch (unit) {
    case 'week':
      return dateFns.endOfWeek(dateFns.subWeeks(now, 1));
    case 'month':
      return dateFns.endOfMonth(dateFns.subMonths(now, 1));
    case 'year':
      return dateFns.endOfYear(dateFns.subYears(now, 1));
  }
}

function getDateFromKey(key: string): Date {
  switch (key) {
    case 'lastweek':
      return dateFns.sub(new UTCDate(), {
        weeks: 1,
      });
    case 'yesterday':
      return dateFns.sub(new UTCDate(), {
        days: 1,
      });
    default:
      throw new Error(`invalid date compare key: ${key}`);
  }
}

function createValidDate(input?: string, inputFormat?: string | unknown): Date {
  if (input === undefined || typeof input !== 'string') {
    return new UTCDate();
  }

  if (inputFormat === undefined || typeof inputFormat !== 'string') {
    return new UTCDate(input);
  }
  return dateFns.parse(input, inputFormat, new UTCDate());
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
