import { set } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { DeductionRecord, Deferral, DemographicRecord, Member, UploadRecord } from './types.js';

export function convert(members: Member[]): UploadRecord[] {
  const uploadRecords: UploadRecord[] = [];

  for (const member of members) {
    member.ssn = formatSSN(member.ssn);
    const date = member.effectiveDate ? new UTCDate(member.effectiveDate) : new UTCDate();
    member.effectiveDate = set(date, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }).toISOString();

    if (member.demographic.city) {
      uploadRecords.push(createDemographicRecord(member));
    }

    for (const deferral of member.deferrals) {
      uploadRecords.push(createDeferralRecord(member, deferral));
    }
  }

  return uploadRecords;
}

export function formatSSN(ssn: string): string {
  if (ssn.length === 9) {
    return `${ssn.substring(0, 3)}-${ssn.substring(3, 5)}-${ssn.substring(5, 9)}`;
  }

  else if (ssn.length === 11 && ssn.charAt(3) === '-' && ssn.charAt(6) === '-') {
    return ssn;
  }

  throw new Error(`invalid ssn format '${ssn.replaceAll(/[a-zA-Z0-9]/g, 'X')}'`);
}

export function createDemographicRecord(member: Member): DemographicRecord {
  return {
    ssn: member.ssn,
    addr1: member.demographic.addr1 ?? '',
    addr2: member.demographic.addr2 ?? '',
    city: member.demographic.city ?? '',
    state: member.demographic.state ?? '',
    zip: member.demographic.zip ?? '',
  };
}

export function createDeferralRecord(member: Member, deferral: Deferral): DeductionRecord {
  if ('amount' in deferral) {
    return {
      ssn: member.ssn,
      effectiveDate: member.effectiveDate,
      code: deferral.kind,
      amount: Number(deferral.amount.replaceAll(/[$%,]/g, '')),
    };
  }

  if ('percent' in deferral) {
    const percent = deferral.percent.includes('%') ? Number(deferral.percent.replaceAll('%', '')) / 100 : Number(deferral.percent);
    return {
      ssn: member.ssn,
      effectiveDate: member.effectiveDate,
      code: deferral.kind,
      percent,
    };
  }

  throw new Error(`invalid deferral: ${JSON.stringify(deferral)} `);
}
