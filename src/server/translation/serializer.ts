import * as xml from 'xmlbuilder2';
import { PassThrough, Readable, Writable } from 'stream';
import type { ElementRule, Template, Repetition, Serializer, SegmentRule, CloseSegmentRule, XMLTemplate, X12Template, XMLRule, XMLLength, XMLSimpleRule, XMLComplexRule } from './types.js';
import * as util from './util.js';
import { XMLBuilderCB, XMLBuilderCBCreateOptions } from 'xmlbuilder2/lib/interfaces.js';

type FilterFunction = (input: unknown) => string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TrampolineFunction<K> = (...args: any[]) => Thunk<K>;
type Thunk<K> = K | (() => Thunk<K>);

const NoOpFilter: FilterFunction = (_input: unknown) => { return 'true'; };

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
  };
}

/* #### XML Serialzier and utility functions #### */
export class XMLSerializer_0_0_1 implements Serializer {
  readonly version = 'xml_0.0.1';
  template: XMLTemplate | undefined;

  constructor() {
    util.setupLogger();
    util.registerHelpers();
  }

  public serialize(stream: PassThrough, today: string, input: Record<string, unknown>, template: Template): Promise<Readable> {
    return new Promise<Readable>((resolve) => {
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

  private createElement(config: XMLRule, root: XMLBuilderCB, context: Record<string, unknown>, today: string): XMLBuilderCB {

    if (config.repetition) {
      const repetition: Repetition = config.repetition;
      const repetitionObject = context[repetition.property];
      const repetitionCount = Array.isArray(repetitionObject) ? repetitionObject.length : 1;

      const filterExpression = filterFactory(repetition.filter);
      const parentInput = repetitionObject !== undefined ? context : undefined;

      for (let i = 0; i < repetitionCount; ++i) {
        const ctx = Array.isArray(repetitionObject) ? repetitionObject[i] : undefined;
        if (ctx !== undefined && typeof ctx === 'object') {
          ctx._PARENT = parentInput;
        }

        if (filterExpression(ctx) === '') { continue; };

        if (config.children) {
          this.createComplexElement(config, root, ctx, today);
        } else {
          this.createSimpleElement(config, root, ctx);
        }
      }
    } else if (config.ignore) {
      const filterExpression = filterFactory(config.ignore);

      if (filterExpression(context) !== '') {
        if (config.children) {
          this.createComplexElement(config, root, context, today);
        } else {
          this.createSimpleElement(config, root, context);
        }
      }
    } else {
      if (config.children) {
        this.createComplexElement(config, root, context, today);
      } else {
        this.createSimpleElement(config, root, context);
      }
    }
    return root;
  }

  private createSimpleElement(config: XMLSimpleRule, root: XMLBuilderCB, context: Record<string, unknown>): void {
    const compile = util.compileTemplate(config.value);
    const text = compile(context);

    if (!config.required && !text) {
      return;
    }

    root.ele(config.name, config.attributes).txt(this.expandLength(text, config.length)).up();
  }

  private createComplexElement(config: XMLComplexRule, root: XMLBuilderCB, context: Record<string, unknown>, today: string): void {
    const element = root.ele(config.name, config.attributes);
    this.expandChildren(config.children, element, context, today);
    element.up();
  }

  private expandLength(text: string, lengthConfig: XMLLength | undefined): string {
    if (!lengthConfig) {
      return text;
    }

    const padding = lengthConfig.padding || ' ';
    const align = lengthConfig.align || 'right';

    text = text.substring(0, lengthConfig.max);

    if (text.length < lengthConfig.min) {
      switch (align) {
        case 'left':
          text = text.padEnd(lengthConfig.min, padding);
          break;
        case 'right':
          text = text.padStart(lengthConfig.min, padding);
          break;
      }
    }

    return text;
  }

  private expandChildren(children: XMLRule[], element: XMLBuilderCB, context: Record<string, unknown>, today: string): void {
    for (const child of children) {
      this.createElement(child, element, context, today);
    }
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

  public async serialize(stream: PassThrough, today: string, input: Record<string, unknown>, template: Template): Promise<Readable> {
    if (!this.isTemplateValid(template)) {
      throw new Error('invalid template');
    }

    this.template = template;
    this.serializeSegments(this.template.rules, today, input, stream);
    stream.end();
    return stream;
  }

  private isTemplateValid(template: Template): template is X12Template {
    return ('rules' in template);

  }

  private _countSegments(segments: SegmentRule[] | undefined, today: string, input: Record<string, unknown>): Thunk<number> {
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
          const repetitionCount = Array.isArray(repetitionObject) ? repetitionObject.length : 1;// Note the serialization should take place even if the input is undefined

          const filterExpression = filterFactory(repetition.filter);
          const parentInput = repetitionObject !== undefined ? input : undefined;

          for (let i = 0; i < repetitionCount; ++i) {
            const input = Array.isArray(repetitionObject) ? repetitionObject[i] : undefined;
            if (input !== undefined && typeof input === 'object') {
              input._PARENT = parentInput;
            }

            if (filterExpression(input) === '') { continue; }; // Allow for filtering in the template

            if (segment.container) {
              segmentCount += this.countSegments(segment.children, today, input);
            } else {
              segmentCount += this.countSegments(segment.children, today, input);
              segmentCount += this.updateSegmentCount(segment);
            }
          }
        } else if (segment.filter) {
          const filter = segment.filter;
          const filterExpression = filterFactory(filter.expression);
          const originalFilterObject = input[filter.property];
          let filteredObject = originalFilterObject;
          const parentInput = originalFilterObject !== undefined ? input : undefined;

          if (Array.isArray(originalFilterObject)) {
            filteredObject = originalFilterObject.filter((filterField) => {
              if (filterField !== undefined && typeof filterField === 'object') {
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
          const filterExpression = filterFactory(segment.ignore);

          if (filterExpression(input) !== '') {
            if (segment.container) {
              segmentCount += this.countSegments(segment.children, today, input);
            } else {
              segmentCount += this.countSegments(segment.children, today, input);
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

  private _serializeSegments(segments: SegmentRule[] | undefined, today: string, input: Record<string, unknown>, stream: Writable): Thunk<void> {
    if (!segments) {
      return;
    }

    if (typeof input === 'object') {
      input.__TODAY = today;
    }

    return (): void => {
      // countSegments walks the entire subtree, and _serializeSegments runs at every
      // recursion level and every repetition iteration. The count is only ever consumed
      // as `_segment_count` (the SE trailer), so only pay for it on levels that actually
      // reference it — otherwise it is recomputed redundantly for every employee/plan.
      const segmentCount = this.levelReferencesSegmentCount(segments)
        ? this.countSegments(segments, today, input, stream)
        : 0;
      for (const segment of segments) {
        if (segment.repetition) {
          const repetition: Repetition = segment.repetition;
          const repetitionObject = input[repetition.property];
          const repetitionCount = Array.isArray(repetitionObject) ? repetitionObject.length : 1;// Note the serialization should take place even if the input is undefined

          const filterExpression = filterFactory(repetition.filter);
          const parentInput = repetitionObject !== undefined ? input : undefined;

          for (let i = 0; i < repetitionCount; ++i) {
            const input = Array.isArray(repetitionObject) ? repetitionObject[i] : undefined;
            if (input !== undefined && typeof input === 'object') {
              input._PARENT = parentInput;
            }

            if (filterExpression(input) === '') { continue; }; // Allow for filtering in the template

            if (segment.container) {
              this.serializeSegments(segment.children, today, input, stream);
            } else {
              this.serializeElements(segment.elements, input, segment.trim, segmentCount, stream);
              this.serializeSegments(segment.children, today, input, stream);
              this.serializeCloseRule(segment.closeRule, input, segmentCount, stream);
            }
          }
        } else if (segment.filter) {
          const filter = segment.filter;
          const filterExpression = filterFactory(filter.expression);
          const originalFilterObject = input[filter.property];
          let filteredObject = originalFilterObject;
          const parentInput = originalFilterObject !== undefined ? input : undefined;

          if (Array.isArray(originalFilterObject)) {
            filteredObject = originalFilterObject.filter((filterField) => {
              if (filterField !== undefined && typeof filterField === 'object') {
                filterField._PARENT = parentInput;
              }
              return filterExpression(filterField) !== '';
            });
          }

          input[filter.property] = filteredObject;

          if (segment.container) {
            this.serializeSegments(segment.children, today, input, stream);
          } else {
            this.serializeElements(segment.elements, input, segment.trim, segmentCount, stream);
            this.serializeSegments(segment.children, today, input, stream);
            this.serializeCloseRule(segment.closeRule, input, segmentCount, stream);
          }
          input[filter.property] = originalFilterObject;
        } else if (segment.ignore) {
          const filterExpression = filterFactory(segment.ignore);

          if (filterExpression(input) !== '') {
            if (segment.container) {
              this.serializeSegments(segment.children, today, input, stream);
            } else {
              this.serializeElements(segment.elements, input, segment.trim, segmentCount, stream);
              this.serializeSegments(segment.children, today, input, stream);
              this.serializeCloseRule(segment.closeRule, input, segmentCount, stream);
            }
          }
        } else {
          if (segment.container) {
            this.serializeSegments(segment.children, today, input, stream);
          } else {
            this.serializeElements(segment.elements, input, segment.trim, segmentCount, stream);
            this.serializeSegments(segment.children, today, input, stream);
            this.serializeCloseRule(segment.closeRule, input, segmentCount, stream);
          }
        }
      }
    };
  }

  private serializeSegments = this.trampoline<void>(this._serializeSegments);

  private segmentCountUsageCache = new WeakMap<SegmentRule[], boolean>();

  // A level needs its segment count computed only if one of its own segments (or their
  // close rules) interpolates `_segment_count`. The rule tree is static, so the answer is
  // cached by the segments-array reference — which is stable across every repetition pass.
  private levelReferencesSegmentCount(segments: SegmentRule[]): boolean {
    const cached = this.segmentCountUsageCache.get(segments);
    if (cached !== undefined) {
      return cached;
    }

    const referencesSegmentCount = (elements: ElementRule[] | undefined): boolean =>
      elements?.some((element) => element.value.includes('_segment_count')) ?? false;

    const result = segments.some((segment) => {
      if (segment.container) {
        return false;
      }
      return referencesSegmentCount(segment.elements) || referencesSegmentCount(segment.closeRule?.elements);
    });

    this.segmentCountUsageCache.set(segments, result);
    return result;
  }

  private serializeCloseRule(closeRule: CloseSegmentRule | undefined, input: Record<string, unknown>, segmentCount: number, stream: Writable): void {
    if (!closeRule) {
      return;
    }
    this.serializeElements(closeRule.elements, input, closeRule.trim, segmentCount, stream);
  }

  private serializeElements(elementRules: ElementRule[], input: Record<string, unknown>, trim: boolean | undefined, segmentCount: number, stream: Writable): void {
    const elements: string[] = [];

    if (typeof input === 'object') {
      input['_segment_count'] = segmentCount;
    }

    elementRules.forEach((element) => {
      const compile = util.compileTemplate(element.value);
      const output = util.postCompileAttributes(element.attributes, compile(input), input);
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

function filterFactory(filterExpression?: string): FilterFunction {
  if (!filterExpression) {
    return NoOpFilter;
  }

  const compile = util.compileTemplate(filterExpression);

  return (input: unknown) => {
    return compile(input);
  };
}

