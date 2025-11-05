import { isPushMerge, push } from './pushmerger.js';
import { isSetMerge, set } from './setmerger.js';
export function createMerger(rule) {
    if (isPushMerge(rule.mergeInto)) {
        return push(rule.mergeInto);
    }
    if (isSetMerge(rule.mergeInto)) {
        return set(rule.mergeInto);
    }
    throw new Error(`Unknown merge operation: ${JSON.stringify(rule.mergeInto)}`);
}
