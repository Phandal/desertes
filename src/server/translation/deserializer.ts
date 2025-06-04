import Handlebars from 'handlebars';
import * as util from './util.js';
import { Document, Element, Segment, X12Parser } from './parser.js';
import { ContainerSegmentRule, Deserializer, EDIObject, EDISegment, ElementRule, SegmentRule, StandardSegmentRule, Template } from './types.js';

export class DeserializerFactory {
  static deserializers: Record<string, Deserializer> = {};

  static registerDeserializer(deserializer: Deserializer): void {
    this.deserializers[deserializer.version] = deserializer;
  }

  static getDeserializer(version: string): Deserializer {
    const deserializer = this.deserializers[version];

    if (!deserializer) {
      throw this.InvalidVersionError(version);
    }

    return deserializer;
  }

  static InvalidVersionError(version: string): Error {
    return new Error(`invalid deserializer version from template '${version}'`);
  };
}

export class Deserializer_0_0_1 implements Deserializer {
  readonly version = '0.0.1';
  private tree: Document | undefined = undefined;

  constructor() {
    util.setupLogger();
    util.registerHelpers();
  }

  deserialize(template: Template, input: string): EDIObject {
    const parser = new X12Parser({
      elementSeparator: template.elementSeparator,
      segmentSeparator: template.segmentSeparator,
      componentSeparator: template.componentSeparator,
      repetitionSeparator: template.repetitionSeparator,
      input: input,
    });

    this.tree = parser.parse();

    let obj: EDIObject = {};
    let currentRowCount = 0;

    while (this.tree.hasNextSegment()) {
      for (const rule of template.rules) {
        if (rule.numberOfRowsToSkip && rule.numberOfRowsToSkip > currentRowCount) {
          // Advance the tree to skip the row
          this.tree.nextSegment();
          ++currentRowCount;
          continue;
        }
        obj = this.deserializeSegment(obj, this.tree.nextSegment(), rule);
      }
    }

    return obj;
  }

  private deserializeSegment(obj: EDIObject, segment: Segment | null, rule: SegmentRule): EDIObject {
    if (!segment) {
      return obj;
    }

    if (!rule.container) {
      obj = this.deserializeStandardSegment(obj, segment, rule);
    } else {
      obj = this.deserializeContainerSegment(obj, segment, rule);
    }

    return obj;
  }

  private deserializeStandardSegment(obj: EDIObject, segment: Segment, standardRule: StandardSegmentRule): EDIObject {
    let tempSeg: EDISegment = {};
    for (const element of standardRule.elements) {
      const value = this.deserializeElement(segment.nextElement(), element);
      tempSeg[element.name] = value;
    }

    const childObj: EDIObject = {};

    if (standardRule.children) {
      for (const child of standardRule.children) {
        if (!this.tree?.hasNextSegment()) { break; }
        let segNode = this.tree.nextSegment();
        this.deserializeSegment(childObj, segNode, child);
        tempSeg = this.addChildSegment(tempSeg, childObj);
        segNode = this.tree?.nextSegment();
      }
    }

    obj = this.addSegment(obj, standardRule.name, tempSeg);
    return obj;
  }

  private deserializeContainerSegment(obj: EDIObject, segment: Segment, containerRule: ContainerSegmentRule): EDIObject {
    let tempSeg: EDISegment = {};
    const container: EDIObject[] = [];
    let segNode: Segment | null | undefined = segment;

    for (const child of containerRule.children) {
      if (!segNode) { break; };

      container.push(this.deserializeSegment({}, segNode, child));
      segNode = this.tree?.nextSegment();
    }

    tempSeg = this.addContainer(tempSeg, container);
    obj = this.addSegment(obj, containerRule.name, tempSeg);
    return obj;
  }

  private deserializeElement(element: Element | null, rule: ElementRule): string | undefined {
    if (element === null) {
      return undefined;
    }

    const compileInput = { _v: element.value };
    const compile = Handlebars.compile(rule.value);
    const input = compile(compileInput);
    return util.postCompileAttributes(rule.attributes, input, compileInput);
  }

  private addSegment(obj: EDIObject, header: string, seg: EDISegment): EDIObject {
    if (obj[header]) {
      obj[header].push(seg);
    } else {
      obj[header] = [seg];
    }

    return obj;
  }

  private addChildSegment(seg: EDISegment, childSeg: EDIObject): EDISegment {
    Object.assign(seg, childSeg);

    return seg;
  }

  private addContainer(seg: EDISegment, container: EDIObject[]): EDISegment {
    container.forEach((ediObject) => {
      seg = this.addChildSegment(seg, ediObject);
    });

    return seg;
  }
}
