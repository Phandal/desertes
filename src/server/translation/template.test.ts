import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import { loadSchemaHTTPS, validateSchema } from './template.js';

class FetchMock {
  private responseBody = '';
  private status = 200;
  private shouldFail = false;

  public setResponse(response: string): FetchMock {
    this.responseBody = response;
    return this;
  }

  public setStatus(status: number): FetchMock {
    this.status = status;
    return this;
  }

  public fail(): FetchMock {
    this.shouldFail = true;
    return this;
  }

  public reset(): void {
    this.responseBody = '';
    this.status = 200;
    this.shouldFail = false;
  }

  public async execute(): Promise<Response> {
    if (this.shouldFail) {
      this.reset();
      throw new Error('failed to make http request');
    } else {
      const body = this.responseBody;
      const status = this.status;
      this.reset();
      return new Response(body, { status });
    }
  }
};

let oldFetch: typeof global.fetch;
let fetchMock: FetchMock;

describe('loadSchema', () => {
  before(() => {
    oldFetch = global.fetch;
    fetchMock = new FetchMock();
    global.fetch = fetchMock.execute.bind(fetchMock);
  });

  after(() => {
    global.fetch = oldFetch;
  });

  it('should return a schema like object', async () => {
    fetchMock.setResponse('{}');
    const schema = await loadSchemaHTTPS('localhost');

    assert.deepEqual(schema, {});
  });

  it('should throw if the request failed', async () => {
    fetchMock.fail();

    assert.rejects(async () => loadSchemaHTTPS('localhost'), { name: 'Error', message: 'failed to make http request' });
  });

  it('should throw if the request was not successful', async () => {
    fetchMock.setStatus(400);

    assert.rejects(async () => loadSchemaHTTPS('localhost'), { name: 'Error', message: 'schema loading error: 400' });
  });

  it('should throw if a JSON object was not returned', async () => {
    fetchMock.setResponse('');

    assert.rejects(async () => loadSchemaHTTPS('localhost'), { name: 'Error', message: 'schema parsing error: Unexpected end of JSON input' });
  });
});

describe('validateSchema', () => {
  it('should return a valid response when it works', async () => {
    const template = JSON.stringify({ '$schema': 'localhost' });

    const got = await validateSchema(template, { loadSchema: async () => { return {}; } });
    const want = { valid: true, template: { $schema: 'localhost' } };

    assert.deepEqual(got, want);
  });

  it('should be invalid if the template is missing the "$schema" property', async () => {
    const template = JSON.stringify({});

    const got = await validateSchema(template, { loadSchema: async () => { return {}; } });
    if (got instanceof Error) {
      assert.fail('failed fetch');
    }

    assert.deepEqual(got.valid, false);
    if (!got.valid) {
      assert(got.errors.length > 0);
    }
  });

  it('should be invalid if the template does not match the schema', async () => {
    const template = JSON.stringify({ name: 'test' });

    const got = await validateSchema(template, { loadSchema: async () => { return { required: ['test'] }; } });
    if (got instanceof Error) {
      assert.fail('failed fetch');
    }

    assert.deepEqual(got.valid, false);
    if (!got.valid) {
      assert(got.errors.length > 0);
    }
  });

  it('should return an error when the fetch fails', async () => {
    const template = JSON.stringify({ '$schema': 'localhost' });

    const got = await validateSchema(template, { loadSchema: async () => { throw new Error('mock failed fetch'); } });
    const want = new Error('failed to fetch schema definition from \'localhost\': mock failed fetch');

    assert(got instanceof Error);
    assert.deepEqual(got, want);
  });
});
