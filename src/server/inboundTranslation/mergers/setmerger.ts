import type { ApplicatorResult, Merger, Rule, SetMerge, Member } from '../types.js';

export function isSetMerge(mergeInto: Rule['mergeInto']): mergeInto is SetMerge {
  return (mergeInto.operation === 'set');
}

export function set(mergeInto: SetMerge): Merger {
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
    current[pathParts[pathParts.length - 1]] = result;

    return member;
  };
}
