import { Readable } from 'node:stream';

export type Template = {
  $schema: string;
  name: string;
  version: '0.0.1';
  elementSeparator: string;
  segmentSeparator: string;
  componentSeparator: string;
  repetitionSeparator: string;
  rules: SegmentRule[];
};

export type Repetition = {
  property: string;
  filter?: string;
}

export type Filter = {
  property: string;
  expression: string;
}

export type SegmentRule = StandardSegmentRule | ContainerSegmentRule;

export type StandardSegmentRule = {
  name: string;
  container: false;
  trim?: boolean;
  numberOfRowsToSkip?: number;
  repetition?: Repetition;
  ignore?: string;
  filter?: Filter;
  elements: ElementRule[];
  children: SegmentRule[];
  closeRule?: CloseSegmentRule;
};

export type ContainerSegmentRule = {
  name: string;
  container: true;
  numberOfRowsToSkip?: number;
  repetition?: Repetition;
  ignore?: string;
  filter?: Filter;
  children: SegmentRule[];
};

export type CloseSegmentRule = Pick<StandardSegmentRule, 'name' | 'elements' | 'trim'>;

export type ElementRule = {
  name: string;
  value: string;
  attributes?: ElementRuleAttribute;
};

export type ElementRuleAttribute = {
  length: LengthAttribute
}

export type LengthAttribute = {
  min: number;
  max: number;
  padding?: string;
}

export interface Serializer<T extends Record<string, unknown>> {
  input: T;
  template: Template;
  serialize: () => Promise<Readable>;
}

export interface Deserializer {
  input: string;
  template: Template;
  deserialize: () => EDIObject;
}

export type EDISegment = { [key: string]: string | number | boolean | undefined | EDIObject | EDIObject[] };
export type EDIObject = Record<string, EDISegment[]>;

export type SegmentNode = StandardSegmentNode | ContainerSegmentNode;

export type StandardSegmentNode = {
  name: string;
  isContainer: false;
  iterations?: number[];
  elements: ElementNode;
  children?: SegmentNode;
  nextSibling?: SegmentNode;
};

export type ContainerSegmentNode = Pick<StandardSegmentNode, 'name' | 'children' | 'nextSibling'> & { isContainer: true };

export type ElementNode = {
  name: string;
  value: string;
  nextElement?: ElementNode;
};

