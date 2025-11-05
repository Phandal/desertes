import type { HardCoded, Rule, WhenRule, Applicator, ApplicatorResult, ParsedRecord, WhenRuleEqualOptions, WhenRuleNotEqualOptions, WhenRuleAndOptions, WhenRuleOrOptions } from '../types.js';

export function isWhenRule(rule: Rule): rule is WhenRule {
  return 'when' in rule;
}

export function when(rule: WhenRule): Applicator {
  return (records: ParsedRecord[]): ApplicatorResult => {
    const applicator = createWhenApplicator(rule);
    return applicator(records);
  };
}

export function createWhenApplicator(rule: WhenRule): Applicator {
  if (isStringMapper(rule.mergeInto.output)) {
    return stringMapper(rule.when, rule.mergeInto.output);
  } else if (isObjectMapper(rule.mergeInto.output)) {
    return objectMapper(rule.when, rule.mergeInto.output);
  }

  throw new Error(`Unknown merge output format: ${JSON.stringify(rule.mergeInto)}`);
}

export function isStringMapper(output: Rule['mergeInto']['output']): output is string {
  return typeof output === 'string';
}

export function isObjectMapper(output: Rule['mergeInto']['output']): output is Record<string, string | HardCoded> {
  return typeof output === 'object';
}

export function evaluateWhen(when: WhenRule['when'], record: ParsedRecord): boolean {

  if (isWhenAnd(when)) {
    for (const condition of when.and) {
      if (!evaluateWhen(condition, record)) {
        return false;
      }
    }
    return true;
  } else if (isWhenOr(when)) {
    for (const condition of when.or) {
      if (evaluateWhen(condition, record)) {
        return true;
      }
    }
    return false;
  } else if (isWhenEqual(when)) {
    return record[when.field] === when.equals;
  } else if (isWhenNotEqual(when)) {
    return record[when.field] !== when.notequals;
  }

  throw new Error(`Unknown when comparison: ${JSON.stringify(when)}`);
}

export function isWhenAnd(when: WhenRule['when']): when is WhenRuleAndOptions {
  return 'and' in when;
}

export function isWhenOr(when: WhenRule['when']): when is WhenRuleOrOptions {
  return 'or' in when;
}

export function isWhenEqual(when: WhenRule['when']): when is WhenRuleEqualOptions {
  return 'equals' in when;
}

export function isWhenNotEqual(when: WhenRule['when']): when is WhenRuleNotEqualOptions {
  return 'notequals' in when;
}

export function stringMapper(when: WhenRule['when'], output: string): Applicator {
  return (records: ParsedRecord[]): ApplicatorResult => {
    let result = null;
    for (const record of records) {
      if (evaluateWhen(when, record)) {
        const value = record[output];

        if (value !== undefined && value !== '') {
          result = record[output];
        }
      }
    }
    return result;
  };
}

export function objectMapper(when: WhenRule['when'], output: Record<string, string | HardCoded>): Applicator {
  return (records: ParsedRecord[]): ApplicatorResult => {
    const results: Record<string, string>[] = [];
    for (const record of records) {
      if (evaluateWhen(when, record)) {
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(output)) {
          if (typeof value === 'object') {
            result[key] = value._value;
          } else {
            result[key] = record[value];
          }
        }
        results.push(result);
      }
    }
    if (results.length !== 0) {
      return results;
    }
    return null;
  };
}

