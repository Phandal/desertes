import { ApplicatorResult, PercentFormatTransformer, Transformer } from '#inboundTranslation/types.js';

export function isPercentFormatTransformer(t: unknown): t is PercentFormatTransformer {
  return (
    !!t &&
    typeof t === 'object' &&
    'percentFormat' in t &&
    !!t.percentFormat &&
    typeof t.percentFormat === 'object' &&
    'inFormat' in t.percentFormat
  );
}

export function percentFormat(options: PercentFormatTransformer): Transformer {
  return (result: ApplicatorResult): ApplicatorResult => {
    if (result === null) {
      throw invalidValue(result);
    }

    if (Array.isArray(result) && options.property !== undefined) {
      const property = options.property;
      return result.map((res) => {
        res[property] = _percentFormat(res[property], options);
        return res;
      });
    } else {
      return _percentFormat(result as string, options);
    }
  };
};

function _percentFormat(val: string, options: PercentFormatTransformer): string {
  let ret = Number(val);

  if (typeof val !== 'string' || val === '' || isNaN(ret)) {
    throw invalidValue(val);
  }

  if (ret === 0) {
    ret = 0; // We just need to skip over if the number is already 0
  } else if (options.percentFormat.inFormat === 'percent') {
    ret = ret / 100;
  }

  return ret.toString();
}

function invalidValue(result: ApplicatorResult): Error {
  return new Error(`Cannot percentFormat non-number value: ${JSON.stringify(result)}`);
}
