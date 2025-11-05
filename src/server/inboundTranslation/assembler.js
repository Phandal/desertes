import { createApplicator } from './applicators/applicatorfactory.js';
import { createMerger } from './mergers/mergerfactory.js';
export function assemble(config, records) {
    const assembled = [];
    const grouped = groupBy(config.groupBy, records);
    for (const [_, groupedRecords] of Object.entries(grouped)) {
        const member = merge(config.rules, groupedRecords);
        assembled.push(member);
    }
    return assembled;
}
export function groupBy(key, records) {
    const grouped = {};
    for (const record of records) {
        const keyValue = record[key];
        if (keyValue === '' || keyValue === undefined)
            continue;
        if (grouped[keyValue] !== undefined) {
            grouped[keyValue].push(record);
        }
        else {
            grouped[keyValue] = [record];
        }
    }
    return grouped;
}
export function merge(rules, records) {
    let member = createMember();
    for (const rule of rules) {
        const applicator = createApplicator(rule);
        const result = applicator(records);
        // This means the rule did not apply to the record
        if (result === null) {
            continue;
        }
        const merger = createMerger(rule);
        member = merger(member, result);
    }
    return member;
}
export function createMember() {
    return {
        ssn: '',
        effectiveDate: '',
        demographic: {},
        deferrals: [],
    };
}
