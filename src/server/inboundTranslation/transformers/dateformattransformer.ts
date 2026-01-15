import { ApplicatorResult, DateFormatTransformer, Transformer } from '../types.js';
import * as dateFns from 'date-fns';
import { UTCDate } from '@date-fns/utc';

export function isDateFormatTransformer(t: unknown): t is DateFormatTransformer {
  return (
    !!t &&
    typeof t === 'object' &&
    'dateFormat' in t &&
    !!t.dateFormat &&
    typeof t.dateFormat === 'object' &&
    'inFormat' in t.dateFormat &&
    'outFormat' in t.dateFormat
  );
}

export function dateFormat(options: DateFormatTransformer): Transformer {
  return (result: ApplicatorResult): ApplicatorResult => {
    if (typeof result === 'string') {
      return dateFns.format(dateFns.parse(result, options.dateFormat.inFormat, new UTCDate()), options.dateFormat.outFormat);
    }

    throw new Error(`Cannot dateFormat non-string value: ${JSON.stringify(result)}`);
  };
}
