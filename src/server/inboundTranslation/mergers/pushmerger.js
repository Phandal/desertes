export function isPushMerge(mergeInto) {
    return (mergeInto.operation === 'push');
}
export function push(mergeInto) {
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
        const finalPath = pathParts[pathParts.length - 1];
        if (!Array.isArray(current[finalPath])) {
            throw new Error(`can not push to non array member property '${mergeInto.path}'`);
        }
        if (Array.isArray(result)) {
            current[finalPath].push(...result);
        }
        else {
            current[finalPath].push(result);
        }
        return member;
    };
}
