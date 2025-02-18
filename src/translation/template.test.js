"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const template_1 = require("./template");
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
            console.log('here');
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
(0, node_test_1.describe)('loadSchema', () => {
    (0, node_test_1.before)(() => {
        oldFetch = global.fetch;
        fetchMock = new FetchMock();
        global.fetch = fetchMock.execute.bind(fetchMock);
    });
    (0, node_test_1.after)(() => {
        global.fetch = oldFetch;
    });
    (0, node_test_1.it)('should return a schema like object', async () => {
        fetchMock.setResponse('{}');
        const schema = await (0, template_1.loadSchemaHTTPS)('localhost');
        node_assert_1.default.deepEqual(schema, {});
    });
    (0, node_test_1.it)('should throw if the request failed', async () => {
        fetchMock.fail();
        node_assert_1.default.rejects(async () => (0, template_1.loadSchemaHTTPS)('localhost'), { name: 'Error', message: 'failed to make http request' });
    });
    (0, node_test_1.it)('should throw if the request was not successful', async () => {
        fetchMock.setStatus(400);
        node_assert_1.default.rejects(async () => (0, template_1.loadSchemaHTTPS)('localhost'), { name: 'Error', message: 'schema loading error: 400' });
    });
    (0, node_test_1.it)('should throw if a JSON object was not returned', async () => {
        fetchMock.setResponse('');
        node_assert_1.default.rejects(async () => (0, template_1.loadSchemaHTTPS)('localhost'), { name: 'Error', message: 'schema parsing error: Unexpected end of JSON input' });
    });
});
(0, node_test_1.describe)('validateSchema', () => {
    (0, node_test_1.it)('should return a valid response when it works', async () => {
        const template = { '$schema': 'localhost' };
        const got = await (0, template_1.validateSchema)(template, { loadSchema: async () => { return {}; } });
        const want = { valid: true, template: template };
        node_assert_1.default.deepEqual(got, want);
    });
    (0, node_test_1.it)('should be invalid if the template is missing the "$schema" property', async () => {
        const template = {};
        const got = await (0, template_1.validateSchema)(template, { loadSchema: async () => { return {}; } });
        node_assert_1.default.deepEqual(got.valid, false);
        if (!got.valid) {
            (0, node_assert_1.default)(got.errors.length > 0);
        }
    });
    (0, node_test_1.it)('should be invalid if the template does not match the schema', async () => {
        const template = { name: 'test' };
        const got = await (0, template_1.validateSchema)(template, { loadSchema: async () => { return { required: ['test'] }; } });
        node_assert_1.default.deepEqual(got.valid, false);
        if (!got.valid) {
            (0, node_assert_1.default)(got.errors.length > 0);
        }
    });
});
