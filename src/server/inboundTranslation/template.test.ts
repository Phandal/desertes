import { describe, it } from 'node:test';
import assert from 'node:assert';

import { isConfig, validate } from './template.js';

describe('isConfig', () => {
  it('isConfig works', () => {
    const cfg = {
      parser: {},
      assembler: {},
    };

    assert(isConfig(cfg) === true);
  });

  it('isConfig false is not config', () => {
    const cfgs = [
      {},
      {
        parser: '',
        assembler: '',
      },
      {
        parser: '',
      },
      {
        assembler: '',
      },
      '',
    ];

    for (const cfg of cfgs) {
      assert(isConfig(cfg) === false);
    }
  });
});

describe('validate', () => {
  it('validates', () => {
    const cfg = {
      parser: {},
      assembler: {},
    };
    const got = validate(JSON.stringify(cfg));

    assert.deepEqual(got, cfg);
  });

  it('fails for invalid json', () => {
    const cfg = 'test';
    const got = validate(cfg);

    assert(got instanceof Error);
  });
});
