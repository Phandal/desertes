import Handlebars from 'handlebars';
import { PassThrough, Readable, Writable } from 'stream';
import type { ElementRule, Template, Repetition, Serializer, SegmentRule, CloseSegmentRule } from './types.js';
import * as util from './util.js';

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

export class Serializer_0_0_1 implements Serializer {
  readonly version = '0.0.1';
  template: Template | undefined;

  constructor() {
    util.setupLogger();
    util.registerHelpers();
  }

  public async serialize(stream: PassThrough, today: string, input: Record<string, unknown>, template: Template): Promise<Readable> {
    this.template = template;
    this.serializeSegments(this.template.rules, today, input, stream);
    stream.end();
    return stream;
  }

  private _serializeSegments(segments: SegmentRule[] | undefined, today: string, input: Record<string, unknown>, stream: Writable): Thunk<number> {
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

          const filterExpression = this.filterFactory(repetition.filter);
          const parentInput = repetitionObject !== undefined ? this.getParentInput(repetition.property, input) : undefined;

          for (let i = 0; i < repetitionCount; ++i) {
            const input = Array.isArray(repetitionObject) ? repetitionObject[i] : undefined;
            if (input !== undefined && typeof input === 'object') {
              input._PARENT = parentInput;
            }

            if (filterExpression(input) === '') { continue; }; // Allow for filtering in the template

            if (segment.container) {
              segmentCount += this.serializeSegments(segment.children, today, input, stream);
            } else {
              this.serializeElements(segment.elements, input, segment.trim, stream);
              segmentCount += this.serializeSegments(segment.children, today, input, stream);
              segmentCount += this.updateSegmentCount(segment);
              this.serializeCloseRule(segment.closeRule, input, segmentCount, stream);
            }
          }
        } else if (segment.filter) {
          const new_input = structuredClone(input);
          const filter = segment.filter;
          const filterExpression = this.filterFactory(filter.expression);
          const filterObject = input[filter.property];
          let filteredObject = filterObject;
          const parentInput = filterObject !== undefined ? this.getParentInput(filter.property, input) : undefined;

          if (Array.isArray(filterObject)) {
            filteredObject = filterObject.filter((filterField) => {
              if (filterField !== undefined && typeof filterField === 'object') {
                filterField._PARENT = parentInput;
              }
              return filterExpression(filterField) !== '';
            });
          }

          new_input[filter.property] = filteredObject;

          if (segment.container) {
            segmentCount += this.serializeSegments(segment.children, today, new_input, stream);
          } else {
            this.serializeElements(segment.elements, new_input, segment.trim, stream);
            segmentCount += this.serializeSegments(segment.children, today, new_input, stream);
            segmentCount += this.updateSegmentCount(segment);
            this.serializeCloseRule(segment.closeRule, new_input, segmentCount, stream);
          }
        } else if (segment.ignore) {
          const filterExpression = this.filterFactory(segment.ignore);

          if (filterExpression(input) !== '') {
            if (segment.container) {
              segmentCount += this.serializeSegments(segment.children, today, input, stream);
            } else {
              this.serializeElements(segment.elements, input, segment.trim, stream);
              segmentCount += this.serializeSegments(segment.children, today, input, stream);
              segmentCount += this.updateSegmentCount(segment);
              this.serializeCloseRule(segment.closeRule, input, segmentCount, stream);
            }
          }
        } else {
          if (segment.container) {
            segmentCount += this.serializeSegments(segment.children, today, input, stream);
          } else {
            this.serializeElements(segment.elements, input, segment.trim, stream);
            segmentCount += this.serializeSegments(segment.children, today, input, stream);
            segmentCount += this.updateSegmentCount(segment);
            this.serializeCloseRule(segment.closeRule, input, segmentCount, stream);
          }
        }
      }

      return segmentCount;
    };
  }

  private serializeSegments = this.trampoline<number>(this._serializeSegments);

  private serializeCloseRule(closeRule: CloseSegmentRule | undefined, input: Record<string, unknown>, segmentCount: number, stream: Writable): void {
    if (!closeRule) {
      return;
    }

    const newInput = structuredClone(input);
    newInput['_segment_count'] = segmentCount;
    this.serializeElements(closeRule.elements, newInput, closeRule.trim, stream);
  }

  private serializeElements(elementRules: ElementRule[], input: Record<string, unknown>, trim: boolean | undefined, stream: Writable): void {
    const elements: string[] = [];
    elementRules.forEach((element) => {
      const compile = Handlebars.compile(element.value);
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

  private filterFactory(filterExpression?: string): FilterFunction {
    if (!filterExpression) {
      return NoOpFilter;
    }

    const compile = Handlebars.compile(filterExpression);

    return (input: unknown) => {
      return compile(input);
    };
  }

  private getParentInput(key: string, { ...props }: Record<string, unknown>): unknown {
    return { ...props, [key]: undefined };
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
