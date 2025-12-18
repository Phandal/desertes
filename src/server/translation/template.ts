import { Ajv } from 'ajv';
import { AnySchemaObject, CurrentOptions, ErrorObject } from 'ajv/dist/core.js';

export type ValidationResponse<T> = PassValidationResponse<T> | FailValidationResponse;

type PassValidationResponse<T> = {
  valid: true;
  template: T;
};

type FailValidationResponse = {
  valid: false;
  errors: ErrorObject[];
};

/**
  * Validates the template against its schema
  */
export async function validateSchema<T>(tmplStr: string, options: CurrentOptions): Promise<ValidationResponse<T> | Error> {
  let template;

  try {
    template = JSON.parse(tmplStr);

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
        template: template as T,
      };
    } else {
      return {
        valid: false,
        errors: validate.errors || [],
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return new Error(`failed to fetch schema definition from '${template['$schema']}': ${message}`);
  }
}

/**
 * Load a schema object from a public http endpoint
*/
export async function loadSchemaHTTPS(uri: string): Promise<AnySchemaObject> {
  const res = await fetch(uri, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`schema loading error: ${res.status}`);
  }

  let body;
  try {
    body = <AnySchemaObject>await res.json();
  } catch (err) {
    let message = 'unknown error';
    if (err instanceof Error) {
      message = err.message;
    }
    throw new Error(`schema parsing error: ${message}`);
  }

  return body;
}
