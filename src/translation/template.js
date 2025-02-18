"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSchema = validateSchema;
exports.loadSchemaHTTPS = loadSchemaHTTPS;
const ajv_1 = require("ajv");
/**
  * Validates the template against its schema
  */
async function validateSchema(template, options) {
    if (template['$schema'] === undefined) {
        return {
            valid: false,
            errors: [
                {
                    instancePath: '/',
                    schemaPath: '#/required',
                    keyword: 'required',
                    params: { missingProperty: '$schema' },
                    message: 'must have required property $schema',
                },
            ],
        };
    }
    const ajv = new ajv_1.Ajv(options);
    const validate = await ajv.compileAsync({ $ref: template['$schema'] });
    const valid = validate(template);
    if (valid) {
        return {
            valid: true,
            template: template,
        };
    }
    else {
        return {
            valid: false,
            errors: validate.errors || [],
        };
    }
}
/**
 * Load a schema object from a public http endpoint
*/
async function loadSchemaHTTPS(uri) {
    const res = await fetch(uri, { method: 'GET' });
    if (!res.ok) {
        throw new Error(`schema loading error: ${res.status}`);
    }
    let body;
    try {
        body = await res.json();
    }
    catch (err) {
        let message = 'unknown error';
        if (err instanceof Error) {
            message = err.message;
        }
        throw new Error(`schema parsing error: ${message}`);
    }
    return body;
}
