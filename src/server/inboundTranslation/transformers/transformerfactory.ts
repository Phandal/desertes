import { isDateFormatTransformer, dateFormat } from './dateformattransformer.js';
import { noOp } from './nooptransformer.js';
import type { Transformer, Rule } from '../types.js';

export function createTransformer(mergeOptions: Rule['mergeInto']): Transformer {
  if (isDateFormatTransformer(mergeOptions.transform)) {
    return dateFormat(mergeOptions.transform);
  } else {
    return noOp;
  }
}
