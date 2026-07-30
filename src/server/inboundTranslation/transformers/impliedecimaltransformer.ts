import { ApplicatorResult, ImpliedDecimalTransformer, Transformer } from '#inboundTranslation/types.js';

export function isImpliedDecimalTransformer(t: unknown): t is ImpliedDecimalTransformer {
  return (
    !!t &&
    typeof t === 'object' &&
    'impliedDecimal' in t &&
    !!t.impliedDecimal &&
    typeof t.impliedDecimal === 'object' &&
    'places' in t.impliedDecimal
  );
}

export function impliedDecimal(options: ImpliedDecimalTransformer): Transformer {
  return (result: ApplicatorResult): ApplicatorResult => {
    if (result === null) {
      throw invalidValue(result);
    }

    if (Array.isArray(result) && options.impliedDecimal.property !== undefined) {
      const property = options.impliedDecimal.property;
      return result.map((res) => {
        res[property] = _impliedDecimal(res[property], options);
        return res;
      });
    } else {
      return _impliedDecimal(result as string, options);
    }
  };
};

function _impliedDecimal(val: string, options: ImpliedDecimalTransformer): string {
  const ret = Number(val);

  if (typeof val !== 'string' || val === '' || isNaN(ret)) {
    throw invalidValue(val);
  }

  return String(ret / 10 ** options.impliedDecimal.places);
}

function invalidValue(result: ApplicatorResult): Error {
  return new Error(`Cannot impliedDecimal non-number value: ${JSON.stringify(result)}`);
}
