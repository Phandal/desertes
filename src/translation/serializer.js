import Handlebars from 'handlebars';
import { PassThrough } from 'stream';
import { format as datefnsFormat, parse as datefnsParse, sub as datefnsSub, } from 'date-fns';
const NoOpFilter = (_input) => { return 'true'; };
export class X12Serializer {
  input;
  template;
  constructor(input, template) {
    this.input = input;
    this.template = template;
    this.registerHelpers();
  }
  async serialize() {
    const stream = new PassThrough();
    await this.startSerializationStream(stream);
    return stream;
  }
  startSerializationStream(stream) {
    return new Promise((resolve, reject) => {
      try {
        this.serializeSegments(this.template.rules, this.input, stream);
        stream.end();
        resolve();
      }
      catch (err) {
        reject(err);
      }
    });
  }
  _serializeSegments(segments, input, stream) {
    if (!segments) {
      return 0;
    }
    return () => {
      let segmentCount = 0;
      for (const segment of segments) {
        if (segment.repetition) {
          const repetition = segment.repetition;
          const repetitionObject = input[repetition.property];
          const repetitionCount = Array.isArray(repetitionObject) ? repetitionObject.length : 1; // Note the serialization should take place even if the input is undefined
          const filterExpression = this.filterFactory(repetition.filter);
          for (let i = 0; i < repetitionCount; ++i) {
            const input = Array.isArray(repetitionObject) ? repetitionObject[i] : undefined;
            if (filterExpression(input) === '') {
              continue;
            }
            ; // Allow for filtering in the template
            if (segment.container) {
              segmentCount += this.serializeSegments(segment.children, input, stream);
            }
            else {
              this.serializeElements(segment.elements, input, segment.trim, stream);
              segmentCount += this.serializeSegments(segment.children, input, stream);
              this.serializeCloseRule(segment.closeRule, input, segmentCount, stream);
              segmentCount += this.updateSegmentCount(segment);
            }
          }
        }
        else if (segment.filter) {
          const new_input = structuredClone(input);
          const filter = segment.filter;
          const filterExpression = this.filterFactory(filter.expression);
          const filterObject = input[filter.property];
          let filteredObject = filterObject;
          if (Array.isArray(filterObject)) {
            filteredObject = filterObject.filter((filterField) => {
              return filterExpression(filterField) !== '';
            });
          }
          //@ts-expect-error: cannot assign to generic T
          new_input[filter.property] = filteredObject;
          if (segment.container) {
            segmentCount += this.serializeSegments(segment.children, new_input, stream);
          }
          else {
            this.serializeElements(segment.elements, new_input, segment.trim, stream);
            segmentCount += this.serializeSegments(segment.children, new_input, stream);
            this.serializeCloseRule(segment.closeRule, new_input, segmentCount, stream);
            segmentCount += this.updateSegmentCount(segment);
          }
        }
        else if (segment.ignore) {
          const filterExpression = this.filterFactory(segment.ignore);
          if (filterExpression(input) !== '') {
            if (segment.container) {
              segmentCount += this.serializeSegments(segment.children, input, stream);
            }
            else {
              this.serializeElements(segment.elements, input, segment.trim, stream);
              segmentCount += this.serializeSegments(segment.children, input, stream);
              this.serializeCloseRule(segment.closeRule, input, segmentCount, stream);
              segmentCount += this.updateSegmentCount(segment);
            }
          }
        }
        else {
          if (segment.container) {
            segmentCount += this.serializeSegments(segment.children, input, stream);
          }
          else {
            this.serializeElements(segment.elements, input, segment.trim, stream);
            segmentCount += this.serializeSegments(segment.children, input, stream);
            this.serializeCloseRule(segment.closeRule, input, segmentCount, stream);
            segmentCount += this.updateSegmentCount(segment);
          }
        }
      }
      return segmentCount;
    };
  }
  serializeSegments = this.trampoline(this._serializeSegments);
  serializeCloseRule(closeRule, input, segmentCount, stream) {
    if (!closeRule) {
      return;
    }
    const newInput = structuredClone(input);
    //@ts-expect-error: cannot assign to generic T
    newInput['_segment_count'] = segmentCount;
    this.serializeElements(closeRule.elements, newInput, closeRule.trim, stream);
  }
  serializeElements(elementRules, input, trim, stream) {
    const elements = [];
    elementRules.forEach((element) => {
      const compile = Handlebars.compile(element.value);
      const output = this.postCompileAttributes(element.attributes, compile(input));
      elements.push(output);
    });
    let output = '';
    // Trim empty elements
    if (trim) {
      let encounteredNonEmptyElement = false;
      output = elements
        .reverse()
        .reduce((acc, element) => {
          if (element.length === 0 && !encounteredNonEmptyElement) {
            return acc;
          }
          acc.push(element);
          encounteredNonEmptyElement = true;
          return acc;
        }, [])
        .reverse()
        .join(this.template.elementSeparator)
        .concat(this.template.segmentSeparator);
    }
    else {
      output = elements
        .join(this.template.elementSeparator)
        .concat(this.template.segmentSeparator);
    }
    stream.write(output);
  }
  updateSegmentCount(segment) {
    if (!segment.container && segment.closeRule) {
      return 2;
    }
    else {
      return 1;
    }
  }
  postCompileAttributes(attrs, input) {
    if (!attrs) {
      return input;
    }
    let output = input;
    if (attrs.length) {
      output = this.lengthAttribute(output, attrs.length);
    }
    return output;
  }
  lengthAttribute(input, attr) {
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
  filterFactory(filterExpression) {
    if (!filterExpression) {
      return NoOpFilter;
    }
    const compile = Handlebars.compile(filterExpression);
    return (input) => {
      return compile(input);
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trampoline(fn) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args) => {
      let result = fn.call(this, ...args);
      while (typeof result === 'function') {
        result = result();
      }
      return result;
    };
  }
  registerHelpers() {
    Handlebars.registerHelper('dateFormat', function(format, input, inputFormat) {
      if (typeof input === 'string' && input.length === 0) {
        return new Handlebars.SafeString('');
      }
      else {
        const dateStr = createValidDate(input, inputFormat);
        return new Handlebars.SafeString(datefnsFormat(dateStr, format));
      }
    });
    Handlebars.registerHelper('dateCompare', function(key, operator, input, options) {
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
      }
      else {
        //@ts-expect-error: no-implicit-any
        return options.inverse(this);
      }
    });
    Handlebars.registerHelper('compare', function(a, operator, b, options) {
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
      }
      else {
        // console.log(JSON.stringify({ f: 'inverse', a, b }));
        //@ts-expect-error: no-implicit-any
        return options.inverse(this);
      }
    });
    Handlebars.registerHelper('replace', function(match, replace, d) {
      if (typeof d !== 'string') {
        return d;
      }
      const reg = RegExp(match);
      return d.replace(reg, replace);
    });
    Handlebars.registerHelper('replaceAll', function(match, replace, d) {
      if (typeof d !== 'string') {
        return d;
      }
      const reg = RegExp(match, 'g');
      return d.replaceAll(reg, replace);
    });
    Handlebars.registerHelper('match', function(val, ...arr) {
      const idx = arr.indexOf(val);
      return idx < 0 ? '' : arr[idx];
    });
    Handlebars.registerHelper('matchArray', function(val, arr) {
      const idx = arr.indexOf(val);
      return idx < 0 ? '' : arr[idx];
    });
    Handlebars.registerHelper('length', function(options) {
      //@ts-expect-error: no-implicit-any
      return options.fn(this).length.toString();
    });
    Handlebars.registerHelper('ssnFormat', function(key, ssn) {
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
}
function getDateFromKey(key) {
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
function createValidDate(input, inputFormat) {
  if (input === undefined || typeof input !== 'string') {
    return new Date();
  }
  if (inputFormat === undefined || typeof inputFormat !== 'string') {
    return new Date(input);
  }
  return datefnsParse(input, inputFormat, new Date());
}
function parseSSN(ssn) {
  if (ssn.length === 9) {
    return {
      first: ssn.substring(0, 3),
      second: ssn.substring(3, 5),
      third: ssn.substring(5, 9),
    };
  }
  else if (ssn.length === 11 && ssn.charAt(3) === '-' && ssn.charAt(6) === '-') {
    return {
      first: ssn.substring(0, 3),
      second: ssn.substring(4, 6),
      third: ssn.substring(7, 11),
    };
  }
  else {
    throw new Error(`invalid ssn format '${ssn.replaceAll(/[a-zA-Z0-9]/g, 'X')}'`);
  }
}
