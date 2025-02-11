"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSchema = validateSchema;
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
