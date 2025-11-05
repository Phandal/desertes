import { isTakeRule, take } from './takeapplicator.js';
import { isWhenRule, when } from './whenapplicator.js';
import type { Applicator, Rule } from '../types.js';

export function createApplicator(rule: Rule): Applicator {
  if (isTakeRule(rule)) {
    return take(rule);
  } else if (isWhenRule(rule)) {
    return when(rule);
  }

  throw new Error(`Unknown rule: ${JSON.stringify(rule)}`);
}

