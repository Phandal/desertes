export function validate(tmpl) {
    try {
        const config = JSON.parse(tmpl);
        if (isConfig(config)) {
            return config;
        }
        throw new Error('invalid inbound config');
    }
    catch (err) {
        if (err instanceof Error) {
            return err;
        }
        else {
            return new Error('inbound template validation error');
        }
    }
}
export function isConfig(config) {
    return (config !== null &&
        typeof config === 'object' &&
        'parser' in config &&
        typeof config.parser === 'object' &&
        'assembler' in config &&
        typeof config.assembler === 'object');
}
