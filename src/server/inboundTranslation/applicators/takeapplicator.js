export function isTakeRule(rule) {
    return 'take' in rule;
}
export function take(rule) {
    return (records) => {
        let recordsCopy = records;
        switch (rule.take.sequence) {
            case 'first':
                break;
            case 'last':
                recordsCopy = records.toReversed();
                break;
        }
        for (const record of recordsCopy) {
            const value = record[rule.mergeInto.output];
            if (value !== undefined && value !== '') {
                return value;
            }
        }
        return null;
    };
}
