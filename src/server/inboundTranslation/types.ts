export type ApplicatorResult = string | Record<string, string>[] | null;

export type Applicator = (records: ParsedRecord[]) => ApplicatorResult;

export type Transformer = (result: ApplicatorResult) => ApplicatorResult;

export type Merger = (member: Member, result: ApplicatorResult) => Member;

export type Config = {
  $schema: string;
  parser: ParserConfig;
  assembler: AssemblerConfig;
}

export type Member = {
  ssn: string;
  effectiveDate: string;
  demographic: Demographic;
  deferrals: Deferral[];
}

export type Demographic = {
  addr1?: string;
  addr2?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export type Deferral = AmountDeferral | PercentDeferral

export type AmountDeferral = {
  kind: string;
  earningsList: string;
  amount: string;
}

export type PercentDeferral = {
  kind: string;
  earningsList: string;
  percent: string;
}

export type ParsedRecord = { [name: string]: string };

export type Parser = (input: string) => Promise<ParsedRecord[]>;

export type ParserConfig = CSVParserConfig;

export type CSVParserConfig = {
  kind: 'csv';
  delimiter: string;
  skipLines: number;
  trim: boolean;
  fields: Array<{ name: string, index: number }>;
}

export type AssemblerConfig = {
  groupBy: string;
  rules: Rule[];
}

export type Rule = TakeRule | WhenRule;

export type TakeRule = {
  take: TakeRuleOptions;
  mergeInto: (SetMerge);
}

export type TakeRuleOptions = {
  sequence: 'first' | 'last';
}

export type WhenRule = {
  when: WhenRuleOptions;
  mergeInto: (PushMerge | SetMerge);
}

export type WhenRuleOptions = WhenRuleNotEqualOptions | WhenRuleEqualOptions | WhenRuleAndOptions | WhenRuleOrOptions;

export type WhenRuleAndOptions = {
  and: WhenRuleOptions[];
}

export type WhenRuleOrOptions = {
  or: WhenRuleOptions[];
}

export type WhenRuleNotEqualOptions = {
  field: string;
  notequals: string;
}

export type WhenRuleEqualOptions = {
  field: string;
  equals: string;
}

export type HardCoded = { _value: string };

export type PushMergeOutput = string | Record<string, string | HardCoded>;

export type PushMerge = {
  path: string;
  operation: 'push';
  output: PushMergeOutput;
  transform?: TransformerOptions;
}

export type SetMerge = {
  path: string;
  operation: 'set';
  output: string;
  transform?: TransformerOptions;
}

export type TransformerOptions = DateFormatTransformer;

export type DateFormatTransformer = {
  dateFormat: DateFormatTransformerOptions;
};

export type DateFormatTransformerOptions = {
  inFormat: string;
  outFormat: string;
}

export type UploadRecord = DeductionRecord | DemographicRecord;

export type DeductionRecord = {
  ssn: string; // With Dashes e.g. 000-00-0000
  code: string; // Client specific, code must be chosen in the config
  effectiveDate: string; // ISO String 2025-10-10T00:00:00.000Z 
  earningsList: string;
} & (DeductionAmountRecord | DeductionPercentRecord)

export type DeductionAmountRecord = {
  amount: number; // Can be float
}

export type DeductionPercentRecord = {
  percent: number; // Format: 15% = 0.15
}

export type DemographicRecord = {
  ssn: string; // With Dashes e.g. 000-00-0000
  addr1: string;
  addr2: string;
  city: string;
  state: string;
  zip: string;
}
