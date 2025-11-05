export function isSetMerge(mergeInto) {
    return (mergeInto.operation === 'set');
}
export function set(mergeInto) {
    return (member, result) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let current = member;
        const pathParts = mergeInto.path === '' ? [] : mergeInto.path.split('.');
        for (let i = 0; i < pathParts.length - 1; ++i) {
            if (typeof current !== 'object') {
                throw new Error(`could not find path in member '${mergeInto.path}'`);
            }
            current = current[pathParts[i]];
        }
        if (typeof current !== 'object') {
            throw new Error(`could not find path in member '${mergeInto.path}'`);
        }
        current[pathParts[pathParts.length - 1]] = result;
        return member;
    };
}
