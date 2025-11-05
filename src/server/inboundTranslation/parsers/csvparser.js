import Papa from 'papaparse';
export function csvParser(config) {
    return async (input) => {
        const results = Papa.parse(input, { delimiter: config.delimiter, skipFirstNLines: config.skipLines, header: false, skipEmptyLines: true });
        if (results.errors.length !== 0) {
            throw new Error('Failed to parse csv file.');
        }
        return results.data.map((result) => {
            const record = {};
            for (const field of config.fields) {
                let data = result[field.index];
                if (config.trim) {
                    data = data?.trim();
                }
                record[field.name] = data ?? '';
            }
            return record;
        });
    };
}
