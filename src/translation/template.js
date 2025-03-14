import { Ajv } from 'ajv';
/**
  * Validates the template against its schema
  */
export async function validateSchema(template, options) {
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
    const ajv = new Ajv(options);
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
export async function loadSchemaHTTPS(uri) {
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
