import { describe, it } from 'node:test';
import assert from 'node:assert';
import { set } from 'date-fns';

import { convert, createDeferralRecord, createDemographicRecord, formatSSN } from './converter.js';
import { DeductionRecord, DemographicRecord, Member } from './types.js';
import { UTCDate } from '@date-fns/utc';

const member: Member = {
  ssn: '333-22-4444',
  effectiveDate: set(new UTCDate('11-05-2025'), { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }).toISOString(),
  deferrals: [
    {
      kind: '401K',
      earningsList: 'earning',
      amount: '$100',
    },
    {
      kind: 'Roth',
      earningsList: 'earning',
      percent: '%2',
    },
  ],
  demographic: {
    addr1: 'addr1',
    addr2: undefined,
    city: 'city',
    state: 'st',
    zip: '00000',
  },
};

describe('formatSSN', () => {
  it('parses an ssn', () => {
    const ssns = [
      '333224444',
      '333-22-4444',
    ];

    const want = '333-22-4444';

    for (const ssn of ssns) {
      assert.deepEqual(formatSSN(ssn), want);
    }
  });

  it('fails with invalid ssn', () => {
    const ssn = '4444-22-333';
    assert.throws(() => formatSSN(ssn));
  });
});

describe('createUploadRecords', () => {
  it('creates demographic records', () => {
    const got = createDemographicRecord(member);
    const want: DemographicRecord = {
      ssn: '333-22-4444',
      addr1: 'addr1',
      addr2: '',
      city: 'city',
      state: 'st',
      zip: '00000',
    };

    assert.deepEqual(got, want);
  });

  it('creates deferral amount records', () => {
    const got = createDeferralRecord(member, member.deferrals[0]);
    const want: DeductionRecord = {
      ssn: '333-22-4444',
      effectiveDate: '2025-11-05T00:00:00.000Z',
      code: '401K',
      earningsList: 'earning',
      amount: 100,
    };

    assert.deepEqual(got, want);
  });

  it('creates deferral percent records', () => {
    const got = createDeferralRecord(member, member.deferrals[1]);
    const want: DeductionRecord = {
      ssn: '333-22-4444',
      effectiveDate: '2025-11-05T00:00:00.000Z',
      earningsList: 'earning',
      code: 'Roth',
      percent: 0.02,
    };

    assert.deepEqual(got, want);
  });
});

describe('convert', () => {
  it('converts members to upload records', () => {
    const got = convert([member]);
    const want = [
      {
        ssn: '333-22-4444',
        addr1: 'addr1',
        addr2: '',
        city: 'city',
        state: 'st',
        zip: '00000',
      },
      {
        ssn: '333-22-4444',
        effectiveDate: '2025-11-05T00:00:00.000Z',
        earningsList: 'earning',
        code: '401K',
        amount: 100,
      },
      {
        ssn: '333-22-4444',
        effectiveDate: '2025-11-05T00:00:00.000Z',
        earningsList: 'earning',
        code: 'Roth',
        percent: 0.02,
      },
    ];

    assert.deepEqual(got, want);
  });
});
