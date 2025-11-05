export function isWhenRule(rule) {
    return 'when' in rule;
}
export function when(rule) {
    return (records) => {
        const applicator = createWhenApplicator(rule);
        return applicator(records);
    };
}
export function createWhenApplicator(rule) {
    if (isStringMapper(rule.mergeInto.output)) {
        return stringMapper(rule.when, rule.mergeInto.output);
    }
    else if (isObjectMapper(rule.mergeInto.output)) {
        return objectMapper(rule.when, rule.mergeInto.output);
    }
    throw new Error(`Unknown merge output format: ${JSON.stringify(rule.mergeInto)}`);
}
export function isStringMapper(output) {
    return typeof output === 'string';
}
export function isObjectMapper(output) {
    return typeof output === 'object';
}
export function evaluateWhen(when, record) {
    if (isWhenAnd(when)) {
        for (const condition of when.and) {
            if (!evaluateWhen(condition, record)) {
                return false;
            }
        }
        return true;
    }
    else if (isWhenOr(when)) {
        for (const condition of when.or) {
            if (evaluateWhen(condition, record)) {
                return true;
            }
        }
        return false;
    }
    else if (isWhenEqual(when)) {
        return record[when.field] === when.equals;
    }
    else if (isWhenNotEqual(when)) {
        return record[when.field] !== when.notequals;
    }
    throw new Error(`Unknown when comparison: ${JSON.stringify(when)}`);
}
export function isWhenAnd(when) {
    return 'and' in when;
}
export function isWhenOr(when) {
    return 'or' in when;
}
export function isWhenEqual(when) {
    return 'equals' in when;
}
export function isWhenNotEqual(when) {
    return 'notequals' in when;
}
export function stringMapper(when, output) {
    return (records) => {
        let result = null;
        for (const record of records) {
            if (evaluateWhen(when, record)) {
                const value = record[output];
                if (value !== undefined && value !== '') {
                    result = record[output];
                }
            }
        }
        return result;
    };
}
export function objectMapper(when, output) {
    return (records) => {
        const results = [];
        for (const record of records) {
            if (evaluateWhen(when, record)) {
                const result = {};
                for (const [key, value] of Object.entries(output)) {
                    if (typeof value === 'object') {
                        result[key] = value._value;
                    }
                    else {
                        result[key] = record[value];
                    }
                }
                results.push(result);
            }
        }
        if (results.length !== 0) {
            return results;
        }
        return null;
    };
}
