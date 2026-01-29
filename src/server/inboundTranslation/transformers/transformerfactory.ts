import { isDateFormatTransformer, dateFormat } from './dateformattransformer.js';
import { isPercentFormatTransformer, percentFormat } from './percentformattransformer.js';
import { noOp } from './nooptransformer.js';
import type { Transformer, Rule } from '../types.js';

export function createTransformer(mergeOptions: Rule['mergeInto']): Transformer {
  if (isDateFormatTransformer(mergeOptions.transform)) {
    return dateFormat(mergeOptions.transform);
  } else if (isPercentFormatTransformer(mergeOptions.transform)) {
    return percentFormat(mergeOptions.transform);
  } else {
    return noOp;
  }
}
