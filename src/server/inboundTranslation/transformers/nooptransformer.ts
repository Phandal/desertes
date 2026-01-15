import { ApplicatorResult } from '../types.js';

export function noOp(result: ApplicatorResult): ApplicatorResult {
  return result;
}
