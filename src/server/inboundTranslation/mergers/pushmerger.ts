import type { ApplicatorResult, Merger, Rule, PushMerge, Member } from '../types.js';

export function isPushMerge(mergeInto: Rule['mergeInto']): mergeInto is PushMerge {
  return (mergeInto.operation === 'push');
}

export function push(mergeInto: PushMerge): Merger {
  return (member: Member, result: ApplicatorResult): Member => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = member;
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
    } else {
      current[finalPath].push(result);
    }
    return member;
  };
}

