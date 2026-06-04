import Handlebars from 'handlebars';
import * as xml from 'xmlbuilder2';
import * as dateFns from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import * as jp from 'jsonpath';
import { PassThrough, Readable, Writable } from 'stream';
import type {
  ElementRule,
  Template,
  Repetition,
  Serializer,
  SegmentRule,
  CloseSegmentRule,
  XMLTemplate,
  X12Template,
  XMLRule,
  XMLSource,
  XMLDateSource,
} from './types.js';
import * as util from './util.js';
import {
  XMLBuilderCB,
  XMLBuilderCBCreateOptions,
} from 'xmlbuilder2/lib/interfaces.js';
import { AssertionError } from 'assert';

type FilterFunction = (input: unknown) => string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TrampolineFunction<K> = (...args: any[]) => Thunk<K>;
type Thunk<K> = K | (() => Thunk<K>);

const NoOpFilter: FilterFunction = (_input: unknown) => {
  return 'true';
};

export class SerializerFactory {
  static serializers: Record<string, Serializer> = {};

  static registerSerializer(serializer: Serializer): void {
    this.serializers[serializer.version] = serializer;
  }

  static getSerializer(version: string): Serializer {
    const serializer = this.serializers[version];

    if (!serializer) {
      throw this.InvalidVersionError(version);
    }

    return serializer;
  }

  static InvalidVersionError(version: string): Error {
    return new Error(`invalid serializer version from template '${version}'`);
  }
}

/* #### XML Serialzier and utility functions #### */
export class XMLSerializer_0_0_1 implements Serializer {
  readonly version = 'xml_0.0.1';
  template: XMLTemplate | undefined;

  constructor() {
    util.setupLogger();
    util.registerHelpers();
  }

  public serialize(
    stream: PassThrough,
    today: string,
    input: Record<string, unknown>,
    template: Template,
  ): Promise<Readable> {
    return new Promise((resolve, reject) => {
      if (!this.isValidTemplate(template)) {
        throw new Error('invalid template');
      }

      this.template = template;
      const options: XMLBuilderCBCreateOptions = {
        data: (chunk: string): void => {
          stream.write(chunk);
        },
        end: (): void => {
          stream.end();
          resolve(stream);
        },
        keepNullNodes: false,
        keepNullAttributes: false,
        format: 'xml',
        prettyPrint: true,
        allowEmptyTags: true,
      };
      const document = xml.createCB(options);
      document.dec({
        version: '1.0',
        encoding: template.document.encoding,
      });

      this.createElement(template.document.root, document, input, today);
      document.end();
    });
  }

  private createElement(
    config: XMLRule,
    root: XMLBuilderCB,
    context: Record<string, unknown>,
    today: string,
  ): XMLBuilderCB {
    if (typeof context === 'object') {
      context.__TODAY = today;
    }

    const children = config.children || [];
    let text = '';
    if ('source' in config && config.source) {
      text = this.expandSource(config.source, context);
    } else if ('text' in config && config.text) {
      text = config.text;
    }

    if (config.required || text) {
      const element = root.ele(config.name, config.attributes);

      if (text) {
        if (config.length) {
          const padding = config.length.padding || ' ';
          const align = config.length.align || 'left';

          text = text.substring(0, config.length.max);

          if (text.length < config.length.min) {
            switch (align) {
              case 'left':
                text = text.padEnd(config.length.min, padding);
                break;
              case 'right':
                text = text.padStart(config.length.min, padding);
            }
          }
        }
        element.txt(text);
      }

      if (config.context) {
        const contexts = jp.query(context, config.context);
        for (const context of contexts) {
          this.expandChildren(children, element, context, today);
        }
      } else {
        this.expandChildren(children, element, context, today);
      }

      element.up();
    }

    return root;
  }

  private expandChildren(children: XMLRule[], element: XMLBuilderCB, context: Record<string, unknown>, today: string): void {
    for (const child of children) {
      this.createElement(child, element, context, today);
    }
  }

  private expandSource(
    source: XMLSource,
    context: Record<string, unknown>,
  ): string {
    if (typeof source === 'object') {
      switch (source.kind) {
        case 'date':
          return this.sourceDate(source, context);
        case 'number':
          return this.sourceNumber(source, context);
        default:
          throw new Error(`unknown source kind '${source.kind}'`);
      }
    }

    return jp.value(context, source);
  }

  private sourceDate(
    source: XMLDateSource,
    context: Record<string, unknown>,
  ): string {
    let d;
    try {
      if (!source.input) {
        throw new AssertionError({ message: 'input cannot be undefined in date source' });
      }
      d = this.parseDate(jp.value(context, source.input), source.inFormat);
    } catch (err) {
      if (err instanceof AssertionError) {
        d = this.parseDate(source.input, source.inFormat);
      } else {
        throw err;
      }
    }

    return dateFns.format(d, source.outFormat);
  }

  private parseDate(
    input: string | undefined,
    format: string | undefined,
  ): UTCDate {
    const now = new UTCDate();

    if (input === undefined || typeof input !== 'string') {
      return now;
    }

    if (format === undefined || typeof input !== 'string') {
      return new UTCDate(input);
    }

    return dateFns.parse(input, format, now);
  }

  private sourceNumber(
    source: XMLNumberSource,
    context: Record<string, unknown>,
  ): string {
    let d: string;
    try {
      d = jp.value(context, source.input);
    } catch (err) {
      if (err instanceof AssertionError) {
        d = source.input;
      } else {
        throw err;
      }
    }

    d = Number(d).toFixed(source.precision);

    return source.dot ? d : d.replaceAll('.', '');
  }

  private isValidTemplate(template: Template): template is XMLTemplate {
    return !('rules' in template);
  }
}

/* #### Normal Serialzier and utility functions #### */
export class Serializer_0_0_1 implements Serializer {
  readonly version = '0.0.1';
  template: X12Template | undefined;

  constructor() {
    util.setupLogger();
    util.registerHelpers();
  }

  public async serialize(
    stream: PassThrough,
    today: string,
    input: Record<string, unknown>,
    template: Template,
  ): Promise<Readable> {
    if (!this.isTemplateValid(template)) {
      throw new Error('invalid template');
    }

    this.template = template;
    this.serializeSegments(this.template.rules, today, input, stream);
    stream.end();
    return stream;
  }

  private isTemplateValid(template: Template): template is X12Template {
    return 'rules' in template;
  }

  private _countSegments(
    segments: SegmentRule[] | undefined,
    today: string,
    input: Record<string, unknown>,
  ): Thunk<number> {
    if (!segments) {
      return 0;
    }

    if (typeof input === 'object') {
      input.__TODAY = today;
    }

    return (): number => {
      let segmentCount = 0;
      for (const segment of segments) {
        if (segment.repetition) {
          const repetition: Repetition = segment.repetition;
          const repetitionObject = input[repetition.property];
          const repetitionCount = Array.isArray(repetitionObject)
            ? repetitionObject.length
            : 1; // Note the serialization should take place even if the input is undefined

          const filterExpression = this.filterFactory(repetition.filter);
          const parentInput =
            repetitionObject !== undefined ? input : undefined;

          for (let i = 0; i < repetitionCount; ++i) {
            const input = Array.isArray(repetitionObject)
              ? repetitionObject[i]
              : undefined;
            if (input !== undefined && typeof input === 'object') {
              input._PARENT = parentInput;
            }

            if (filterExpression(input) === '') {
              continue;
            } // Allow for filtering in the template

            if (segment.container) {
              segmentCount += this.countSegments(
                segment.children,
                today,
                input,
              );
            } else {
              segmentCount += this.countSegments(
                segment.children,
                today,
                input,
              );
              segmentCount += this.updateSegmentCount(segment);
            }
          }
        } else if (segment.filter) {
          const filter = segment.filter;
          const filterExpression = this.filterFactory(filter.expression);
          const originalFilterObject = input[filter.property];
          let filteredObject = originalFilterObject;
          const parentInput =
            originalFilterObject !== undefined ? input : undefined;

          if (Array.isArray(originalFilterObject)) {
            filteredObject = originalFilterObject.filter((filterField) => {
              if (
                filterField !== undefined &&
                typeof filterField === 'object'
              ) {
                filterField._PARENT = parentInput;
              }
              return filterExpression(filterField) !== '';
            });
          }

          input[filter.property] = filteredObject;

          if (segment.container) {
            segmentCount += this.countSegments(segment.children, today, input);
          } else {
            segmentCount += this.countSegments(segment.children, today, input);
            segmentCount += this.updateSegmentCount(segment);
          }
          input[filter.property] = originalFilterObject;
        } else if (segment.ignore) {
          const filterExpression = this.filterFactory(segment.ignore);

          if (filterExpression(input) !== '') {
            if (segment.container) {
              segmentCount += this.countSegments(
                segment.children,
                today,
                input,
              );
            } else {
              segmentCount += this.countSegments(
                segment.children,
                today,
                input,
              );
              segmentCount += this.updateSegmentCount(segment);
            }
          }
        } else {
          if (segment.container) {
            segmentCount += this.countSegments(segment.children, today, input);
          } else {
            segmentCount += this.countSegments(segment.children, today, input);
            segmentCount += this.updateSegmentCount(segment);
          }
        }
      }

      return segmentCount;
    };
  }

  private countSegments = this.trampoline<number>(this._countSegments);

  private _serializeSegments(
    segments: SegmentRule[] | undefined,
    today: string,
    input: Record<string, unknown>,
    stream: Writable,
  ): Thunk<void> {
    if (!segments) {
      return;
    }

    if (typeof input === 'object') {
      input.__TODAY = today;
    }

    return (): void => {
      const segmentCount = this.countSegments(segments, today, input, stream);
      for (const segment of segments) {
        if (segment.repetition) {
          const repetition: Repetition = segment.repetition;
          const repetitionObject = input[repetition.property];
          const repetitionCount = Array.isArray(repetitionObject)
            ? repetitionObject.length
            : 1; // Note the serialization should take place even if the input is undefined

          const filterExpression = this.filterFactory(repetition.filter);
          const parentInput =
            repetitionObject !== undefined ? input : undefined;

          for (let i = 0; i < repetitionCount; ++i) {
            const input = Array.isArray(repetitionObject)
              ? repetitionObject[i]
              : undefined;
            if (input !== undefined && typeof input === 'object') {
              input._PARENT = parentInput;
            }

            if (filterExpression(input) === '') {
              continue;
            } // Allow for filtering in the template

            if (segment.container) {
              this.serializeSegments(segment.children, today, input, stream);
            } else {
              this.serializeElements(
                segment.elements,
                input,
                segment.trim,
                segmentCount,
                stream,
              );
              this.serializeSegments(segment.children, today, input, stream);
              this.serializeCloseRule(
                segment.closeRule,
                input,
                segmentCount,
                stream,
              );
            }
          }
        } else if (segment.filter) {
          const filter = segment.filter;
          const filterExpression = this.filterFactory(filter.expression);
          const originalFilterObject = input[filter.property];
          let filteredObject = originalFilterObject;
          const parentInput =
            originalFilterObject !== undefined ? input : undefined;

          if (Array.isArray(originalFilterObject)) {
            filteredObject = originalFilterObject.filter((filterField) => {
              if (
                filterField !== undefined &&
                typeof filterField === 'object'
              ) {
                filterField._PARENT = parentInput;
              }
              return filterExpression(filterField) !== '';
            });
          }

          input[filter.property] = filteredObject;

          if (segment.container) {
            this.serializeSegments(segment.children, today, input, stream);
          } else {
            this.serializeElements(
              segment.elements,
              input,
              segment.trim,
              segmentCount,
              stream,
            );
            this.serializeSegments(segment.children, today, input, stream);
            this.serializeCloseRule(
              segment.closeRule,
              input,
              segmentCount,
              stream,
            );
          }
          input[filter.property] = originalFilterObject;
        } else if (segment.ignore) {
          const filterExpression = this.filterFactory(segment.ignore);

          if (filterExpression(input) !== '') {
            if (segment.container) {
              this.serializeSegments(segment.children, today, input, stream);
            } else {
              this.serializeElements(
                segment.elements,
                input,
                segment.trim,
                segmentCount,
                stream,
              );
              this.serializeSegments(segment.children, today, input, stream);
              this.serializeCloseRule(
                segment.closeRule,
                input,
                segmentCount,
                stream,
              );
            }
          }
        } else {
          if (segment.container) {
            this.serializeSegments(segment.children, today, input, stream);
          } else {
            this.serializeElements(
              segment.elements,
              input,
              segment.trim,
              segmentCount,
              stream,
            );
            this.serializeSegments(segment.children, today, input, stream);
            this.serializeCloseRule(
              segment.closeRule,
              input,
              segmentCount,
              stream,
            );
          }
        }
      }
    };
  }

  private serializeSegments = this.trampoline<void>(this._serializeSegments);

  private serializeCloseRule(
    closeRule: CloseSegmentRule | undefined,
    input: Record<string, unknown>,
    segmentCount: number,
    stream: Writable,
  ): void {
    if (!closeRule) {
      return;
    }
    this.serializeElements(
      closeRule.elements,
      input,
      closeRule.trim,
      segmentCount,
      stream,
    );
  }

  private serializeElements(
    elementRules: ElementRule[],
    input: Record<string, unknown>,
    trim: boolean | undefined,
    segmentCount: number,
    stream: Writable,
  ): void {
    const elements: string[] = [];

    if (typeof input === 'object') {
      input['_segment_count'] = segmentCount;
    }

    elementRules.forEach((element) => {
      const compile = Handlebars.compile(element.value);
      const output = util.postCompileAttributes(
        element.attributes,
        compile(input),
        input,
      );
      elements.push(output);
    });

    let output = '';
    // Trim empty elements
    if (trim) {
      let encounteredNonEmptyElement = false;
      output = elements
        .reverse()
        .reduce((acc: string[], element: string) => {
          if (element.length === 0 && !encounteredNonEmptyElement) {
            return acc;
          }

          acc.push(element);
          encounteredNonEmptyElement = true;
          return acc;
        }, [])
        .reverse()
        .join(this.template?.elementSeparator || '')
        .concat(this.template?.segmentSeparator || '');
    } else {
      output = elements
        .join(this.template?.elementSeparator || '')
        .concat(this.template?.segmentSeparator || '');
    }

    stream.write(output);
  }

  private updateSegmentCount(segment: SegmentRule): number {
    if (!segment.container && segment.closeRule) {
      return 2;
    } else {
      return 1;
    }
  }

  private filterFactory(filterExpression?: string): FilterFunction {
    if (!filterExpression) {
      return NoOpFilter;
    }

    const compile = Handlebars.compile(filterExpression);

    return (input: unknown) => {
      return compile(input);
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private trampoline<K>(fn: TrampolineFunction<K>): (...args: any[]) => K {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args: any[]): K => {
      let result = fn.call(this, ...args);

      while (typeof result === 'function') {
        result = (result as () => Thunk<K>)();
      }

      return result;
    };
  }
}
