import { Config } from './types.js';

export function validate(tmpl: string): Config | Error {
  try {
    const config = JSON.parse(tmpl);
    if (isConfig(config)) {
      return config;
    }

    throw new Error('invalid inbound config');
  } catch (err: unknown) {
    if (err instanceof Error) {
      return err;
    } else {
      return new Error('inbound template validation error');
    }
  }
}

export function isConfig(config: unknown): config is Config {
  return (
    config !== null &&
    typeof config === 'object' &&
    'parser' in config &&
    typeof config.parser === 'object' &&
    'assembler' in config &&
    typeof config.assembler === 'object'
  );
}
