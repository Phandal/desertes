import { csvParser } from './csvparser.js';
export function createParser(config) {
    switch (config.kind) {
        case 'csv':
            return csvParser(config);
        default:
            throw new Error('Unsupported parser type: ' + config.kind);
    }
}
