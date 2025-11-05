import Handlebars from 'handlebars';
import { ElementRuleAttribute, LengthAttribute } from './types.js';
import * as dateFns from 'date-fns';
import { UTCDate } from '@date-fns/utc';

export function postCompileAttributes(attrs: ElementRuleAttribute | undefined, input: string, compileInput: Record<string, unknown>): string {
  if (!attrs) {
    return input;
  }
  let output = input;

  if (attrs.length) {
    output = lengthAttribute(output, attrs.length, attrs.quoted, compileInput);
  }

  if (attrs.quoted) {
    output = quoteAttribute(output);
  }

  return output;
}

export function lengthAttribute(input: string, attr: LengthAttribute, quoted: boolean | undefined, compileInput: Record<string, unknown>): string {
  const max = quoted ? attr.max - 2 : attr.max; // Making room for double quotes
  const min = attr.min;
  const align = attr.align || 'left';

  // Setup Padding with a default of ' '
  let padding;
  if (attr.padding) {
    const paddingCompiler = Handlebars.compile(attr.padding);
    padding = paddingCompiler(compileInput);
  }
  if (padding === '') {
    padding = ' ';
  }

  if (max < min) {
    return input;
  }
  let output = input;

  if (output.length > max) {
    output = output.substring(0, max);
  }

  if (output.length < min) {
    if (align === 'left') {
      output = output.padEnd(min, padding);
    } else {
      output = output.padStart(min, padding);
    }
  }

  return output;
}

export function quoteAttribute(input: string): string {
  return `"${input}"`;
}

export function setupLogger(): void {
  Handlebars.logger.log = (_level, obj): void => console.log({ msg: `Handlebars Log: ${obj}` });
}

export function registerHelpers(): void {
  Handlebars.registerHelper('dateFormat', function (format: string, input?: string, inputFormat?: string | unknown): string {
    if (typeof input === 'string' && input.length === 0) {
      return '';
    } else {
      const dateStr = createValidDate(input, inputFormat);
      return dateFns.format(dateStr, format);
    }
  });

  Handlebars.registerHelper('dateCompare', function (key: string, operator: string, input: string, options: Handlebars.HelperOptions): string {
    let result;
    const ad = getDateFromKey(key);
    const bd = new UTCDate(input);

    // console.log(`${ad} | ${bd}`);

    switch (operator) {
      case '==':
        result = (dateFns.compareAsc(ad, bd) === 0);
        break;
      case '!=':
        result = (dateFns.compareAsc(ad, bd) !== 0);
        break;
      case '<=':
        result = (dateFns.compareAsc(ad, bd) <= 0);
        break;
      case '>=':
        result = (dateFns.compareAsc(ad, bd) >= 0);
        break;
      case '<':
        result = (dateFns.compareAsc(ad, bd) < 0);
        break;
      case '>':
        result = (dateFns.compareAsc(ad, bd) > 0);
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

  Handlebars.registerHelper('getDate', function (mode: string, period: string, unit: string, input?: string, inputFormat?: string): string {

    if (!isMode(mode)) { throw new Error(`invalid mode '${mode}'`); }
    if (!isPeriod(period)) { throw new Error(`invalid period '${period}'`); }
    if (!isUnit(unit)) { throw new Error(`invalid unit '${unit}'`); }
    if (typeof input === 'string' && input.length === 0) {
      return '';
    }

    const dateStr = createValidDate(input, inputFormat);

    switch (mode) {
      case 'start':
        return dateFns.format(getDateStart(period, unit, dateStr), 'MM/dd/yyyy');
      case 'end':
        return dateFns.format(getDateEnd(period, unit, dateStr), 'MM/dd/yyyy');
    }
  });

  Handlebars.registerHelper('getDayOfMonth', function (day: string, input?: string, inputFormat?: string): string {
    const dayIndex = Number(day);

    if (isNaN(dayIndex) || dayIndex <= 0 || dayIndex > 31) {
      throw new Error(`invalid dayOfMonth index '${day}'`);
    }

    const dateStr = createValidDate(input, inputFormat);
    return dateFns.format(dateFns.setDate(dateStr, dayIndex), 'MM/dd/yyyy');
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Handlebars.registerHelper('sum', function (arr: any, property?: string): number {
    if (!Handlebars.Utils.isArray(arr)) {
      throw new Error(`cannot reduce non array object`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loopObject = <any[]>arr;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return loopObject.reduce((acc: number, obj: any) => {
      let value = Number(obj);
      if (typeof property === 'string' && typeof obj === 'object') {
        value = Number(obj[property]);
      }

      if (isNaN(value) || value === undefined || value === null) {
        return acc;
      } else {
        return acc + value;
      }
    }, 0);
  });

  Handlebars.registerHelper('add', function (a: string, b: string): number {
    const aNum = getValidNumberOrZero(a);
    const bNum = getValidNumberOrZero(b);

    return aNum + bNum;
  });

  Handlebars.registerHelper('sub', function (a: string, b: string): number {
    const aNum = getValidNumberOrZero(a);
    const bNum = getValidNumberOrZero(b);

    return aNum - bNum;
  });

  Handlebars.registerHelper('mul', function (a: string, b: string): number {
    const aNum = getValidNumberOrZero(a);
    const bNum = getValidNumberOrZero(b);

    return aNum * bNum;
  });

  Handlebars.registerHelper('div', function (a: string, b: string): number {
    const aNum = getValidNumberOrZero(a);
    const bNum = getValidNumberOrZero(b);
    if (bNum === 0) {
      return 0;
    }

    return aNum / bNum;
  });

  Handlebars.registerHelper('and', function (a: unknown, b: unknown): boolean {
    return (!!a && !!b);
  });

  Handlebars.registerHelper('or', function (a: unknown, b: unknown): boolean {
    return (!!a || !!b);
  });

  Handlebars.registerHelper('not', function (a: unknown): boolean {
    return (!a);
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
type Unit = 'week' | 'month' | 'year' | 'day';

function isMode(modeString: string): modeString is Mode {
  return (modeString === 'start' || modeString === 'end');
}
function isPeriod(periodString: string): periodString is Period {
  return (periodString === 'previous' || periodString === 'current' || periodString === 'next');
}

function isUnit(unitString: string): unitString is Unit {
  return (unitString === 'week' || unitString === 'month' || unitString === 'year' || unitString === 'day');
}

function getDateStart(period: Period, unit: Unit, input: Date): Date {
  switch (period) {
    case 'next':
      return getDateStartNext(unit, input);
    case 'current':
      return getDateStartCurrent(unit, input);
    case 'previous':
      return getDateStartPrevious(unit, input);
  }
}

function getDateEnd(period: Period, unit: Unit, input: Date): Date {
  switch (period) {
    case 'next':
      return getDateEndNext(unit, input);
    case 'current':
      return getDateEndCurrent(unit, input);
    case 'previous':
      return getDateEndPrevious(unit, input);
  }
}

function getDateStartNext(unit: Unit, input: Date): Date {
  switch (unit) {
    case 'week':
      return dateFns.startOfWeek(dateFns.addWeeks(input, 1));
    case 'month':
      return dateFns.startOfMonth(dateFns.addMonths(input, 1));
    case 'year':
      return dateFns.startOfYear(dateFns.addYears(input, 1));
    case 'day':
      return dateFns.startOfDay(dateFns.addDays(input, 1));
  }
}

function getDateStartCurrent(unit: Unit, input: Date): Date {
  switch (unit) {
    case 'week':
      return dateFns.startOfWeek(input);
    case 'month':
      return dateFns.startOfMonth(input);
    case 'year':
      return dateFns.startOfYear(input);
    case 'day':
      return dateFns.startOfDay(input);
  }
}

function getDateStartPrevious(unit: Unit, input: Date): Date {
  switch (unit) {
    case 'week':
      return dateFns.startOfWeek(dateFns.subWeeks(input, 1));
    case 'month':
      return dateFns.startOfMonth(dateFns.subMonths(input, 1));
    case 'year':
      return dateFns.startOfYear(dateFns.subYears(input, 1));
    case 'day':
      return dateFns.startOfDay(dateFns.subDays(input, 1));
  }
}

function getDateEndNext(unit: Unit, input: Date): Date {
  switch (unit) {
    case 'week':
      return dateFns.endOfWeek(dateFns.addWeeks(input, 1));
    case 'month':
      return dateFns.endOfMonth(dateFns.addMonths(input, 1));
    case 'year':
      return dateFns.endOfYear(dateFns.addYears(input, 1));
    case 'day':
      return dateFns.endOfDay(dateFns.addDays(input, 1));
  }
}

function getDateEndCurrent(unit: Unit, input: Date): Date {
  switch (unit) {
    case 'week':
      return dateFns.endOfWeek(input);
    case 'month':
      return dateFns.endOfMonth(input);
    case 'year':
      return dateFns.endOfYear(input);
    case 'day':
      return dateFns.endOfDay(input);
  }
}

function getDateEndPrevious(unit: Unit, input: Date): Date {
  switch (unit) {
    case 'week':
      return dateFns.endOfWeek(dateFns.subWeeks(input, 1));
    case 'month':
      return dateFns.endOfMonth(dateFns.subMonths(input, 1));
    case 'year':
      return dateFns.endOfYear(dateFns.subYears(input, 1));
    case 'day':
      return dateFns.endOfDay(dateFns.subDays(input, 1));
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
    case 'today':
      return new UTCDate();
    default:
      return new UTCDate(key);
    // throw new Error(`invalid date compare key: ${key}`);
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

export function getValidNumberOrZero(a: unknown): number {
  const testNum = Number(a);

  if (isNaN(testNum) || testNum === undefined || testNum === null) {
    return 0;
  } else {
    return testNum;
  }
}
