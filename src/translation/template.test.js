import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import { loadSchemaHTTPS, validateSchema } from '#translation/template.js';
class FetchMock {
    responseBody = '';
    status = 200;
    shouldFail = false;
    setResponse(response) {
        this.responseBody = response;
        return this;
    }
    setStatus(status) {
        this.status = status;
        return this;
    }
    fail() {
        this.shouldFail = true;
        return this;
    }
    reset() {
        this.responseBody = '';
        this.status = 200;
        this.shouldFail = false;
    }
    async execute() {
        if (this.shouldFail) {
            this.reset();
            throw new Error('failed to make http request');
        }
        else {
            const body = this.responseBody;
            const status = this.status;
            this.reset();
            return new Response(body, { status });
        }
    }
}
;
let oldFetch;
let fetchMock;
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
        const template = { '$schema': 'localhost' };
        const got = await validateSchema(template, { loadSchema: async () => { return {}; } });
        const want = { valid: true, template: template };
        assert.deepEqual(got, want);
    });
    it('should be invalid if the template is missing the "$schema" property', async () => {
        const template = {};
        const got = await validateSchema(template, { loadSchema: async () => { return {}; } });
        assert.deepEqual(got.valid, false);
        if (!got.valid) {
            assert(got.errors.length > 0);
        }
    });
    it('should be invalid if the template does not match the schema', async () => {
        const template = { name: 'test' };
        const got = await validateSchema(template, { loadSchema: async () => { return { required: ['test'] }; } });
        assert.deepEqual(got.valid, false);
        if (!got.valid) {
            assert(got.errors.length > 0);
        }
    });
});
