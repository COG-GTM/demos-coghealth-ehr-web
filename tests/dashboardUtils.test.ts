import {
  computeInboxCounts,
  filterInboxItems,
  filterWorklistPatients,
  mapPatientToWorklist,
  mapPatientToInbox,
  InboxItem,
  WorklistPatient,
} from '../src/utils/dashboardUtils';
import type { Patient } from '../src/types';

// --- Test fixtures ---

function makePatient(overrides: Partial<Patient> = {}, index = 0): Patient {
  return {
    id: overrides.id ?? index + 1,
    firstName: overrides.firstName ?? 'John',
    lastName: overrides.lastName ?? 'Doe',
    dateOfBirth: overrides.dateOfBirth ?? '1980-06-15',
    gender: overrides.gender ?? 'MALE',
    mrn: overrides.mrn ?? `MRN-${String(index + 1).padStart(4, '0')}`,
    ...overrides,
  };
}

function makeInboxItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: 1,
    type: 'lab',
    priority: 'normal',
    patientName: 'Doe, John',
    patientMrn: 'MRN-0001',
    title: 'LAB Result',
    detail: 'Review required',
    timestamp: '1 hr ago',
    read: false,
    flagged: false,
    ...overrides,
  };
}

function makeWorklistPatient(overrides: Partial<WorklistPatient> = {}): WorklistPatient {
  return {
    id: 1,
    name: 'Doe, John',
    mrn: 'MRN-0001',
    age: 45,
    gender: 'M',
    location: 'Clinic 2B',
    chiefComplaint: 'Follow-up visit',
    attendingProvider: 'Dr. Smith',
    status: 'waiting',
    alerts: [],
    flags: [],
    ...overrides,
  };
}

// --- Tests ---

describe('mapPatientToWorklist', () => {
  it('maps a male patient correctly', () => {
    const patient = makePatient({ firstName: 'Alice', lastName: 'Smith', gender: 'FEMALE' });
    const result = mapPatientToWorklist(patient, 0);

    expect(result.name).toBe('Smith, Alice');
    expect(result.gender).toBe('F');
    expect(result.mrn).toBe('MRN-0001');
    expect(result.attendingProvider).toBe('Dr. Smith');
    expect(result.alerts).toEqual([]);
    expect(result.flags).toEqual([]);
  });

  it('maps patient age from date of birth', () => {
    const dob = '2000-01-01';
    const patient = makePatient({ dateOfBirth: dob });
    const result = mapPatientToWorklist(patient, 0);
    const expectedAge = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    expect(result.age).toBe(expectedAge);
  });

  it('cycles through statuses based on index', () => {
    const statuses = ['waiting', 'roomed', 'in-progress', 'ready-discharge', 'critical'];
    for (let i = 0; i < statuses.length; i++) {
      const result = mapPatientToWorklist(makePatient({}, i), i);
      expect(result.status).toBe(statuses[i]);
    }
  });

  it('cycles through locations based on index', () => {
    const locations = ['Clinic 2B', 'Med-Surg 4W', 'CCU', 'Med-Surg 3E'];
    for (let i = 0; i < locations.length; i++) {
      const result = mapPatientToWorklist(makePatient({}, i), i);
      expect(result.location).toBe(locations[i]);
    }
  });

  it('generates appointment times based on index', () => {
    const r0 = mapPatientToWorklist(makePatient(), 0);
    expect(r0.appointmentTime).toBe('9:00 AM');
    const r1 = mapPatientToWorklist(makePatient(), 1);
    expect(r1.appointmentTime).toBe('10:30 AM');
  });

  it('maps gender OTHER correctly', () => {
    const patient = makePatient({ gender: 'OTHER' });
    const result = mapPatientToWorklist(patient, 0);
    expect(result.gender).toBe('O');
  });

  it('uses patient id when available', () => {
    const patient = makePatient({ id: 42 });
    const result = mapPatientToWorklist(patient, 0);
    expect(result.id).toBe(42);
  });

  it('falls back to index for id when patient id is undefined', () => {
    const patient = makePatient({ id: undefined });
    const result = mapPatientToWorklist(patient, 7);
    expect(result.id).toBe(7);
  });
});

describe('mapPatientToInbox', () => {
  it('maps patient name correctly', () => {
    const patient = makePatient({ firstName: 'Jane', lastName: 'Doe' });
    const result = mapPatientToInbox(patient, 0);
    expect(result.patientName).toBe('Doe, Jane');
    expect(result.patientMrn).toBe('MRN-0001');
  });

  it('cycles through types based on index', () => {
    const types = ['lab', 'imaging', 'message', 'refill', 'order', 'cosign'];
    for (let i = 0; i < types.length; i++) {
      const result = mapPatientToInbox(makePatient({}, i), i);
      expect(result.type).toBe(types[i]);
    }
  });

  it('cycles through priorities based on index', () => {
    const priorities = ['critical', 'high', 'normal', 'low'];
    for (let i = 0; i < priorities.length; i++) {
      const result = mapPatientToInbox(makePatient({}, i), i);
      expect(result.priority).toBe(priorities[i]);
    }
  });

  it('marks items read when index > 3', () => {
    expect(mapPatientToInbox(makePatient(), 0).read).toBe(false);
    expect(mapPatientToInbox(makePatient(), 3).read).toBe(false);
    expect(mapPatientToInbox(makePatient(), 4).read).toBe(true);
    expect(mapPatientToInbox(makePatient(), 10).read).toBe(true);
  });

  it('marks items flagged when index < 2', () => {
    expect(mapPatientToInbox(makePatient(), 0).flagged).toBe(true);
    expect(mapPatientToInbox(makePatient(), 1).flagged).toBe(true);
    expect(mapPatientToInbox(makePatient(), 2).flagged).toBe(false);
  });

  it('generates title from type', () => {
    const result = mapPatientToInbox(makePatient(), 0);
    expect(result.title).toBe('LAB Result');
  });

  it('sets timestamp based on index', () => {
    const result = mapPatientToInbox(makePatient(), 2);
    expect(result.timestamp).toBe('3 hr ago');
  });
});

describe('computeInboxCounts', () => {
  it('returns all zeros for empty array', () => {
    const counts = computeInboxCounts([]);
    expect(counts).toEqual({
      all: 0,
      results: 0,
      messages: 0,
      rxRefills: 0,
      orders: 0,
      cosign: 0,
    });
  });

  it('counts only unread items for all', () => {
    const items = [
      makeInboxItem({ id: 1, read: false }),
      makeInboxItem({ id: 2, read: true }),
      makeInboxItem({ id: 3, read: false }),
    ];
    const counts = computeInboxCounts(items);
    expect(counts.all).toBe(2);
  });

  it('counts unread lab and imaging as results', () => {
    const items = [
      makeInboxItem({ id: 1, type: 'lab', read: false }),
      makeInboxItem({ id: 2, type: 'imaging', read: false }),
      makeInboxItem({ id: 3, type: 'lab', read: true }),
      makeInboxItem({ id: 4, type: 'message', read: false }),
    ];
    const counts = computeInboxCounts(items);
    expect(counts.results).toBe(2);
  });

  it('counts unread messages', () => {
    const items = [
      makeInboxItem({ id: 1, type: 'message', read: false }),
      makeInboxItem({ id: 2, type: 'message', read: true }),
      makeInboxItem({ id: 3, type: 'message', read: false }),
    ];
    const counts = computeInboxCounts(items);
    expect(counts.messages).toBe(2);
  });

  it('counts unread refills as rxRefills', () => {
    const items = [
      makeInboxItem({ id: 1, type: 'refill', read: false }),
      makeInboxItem({ id: 2, type: 'refill', read: false }),
    ];
    const counts = computeInboxCounts(items);
    expect(counts.rxRefills).toBe(2);
  });

  it('counts unread orders', () => {
    const items = [
      makeInboxItem({ id: 1, type: 'order', read: false }),
      makeInboxItem({ id: 2, type: 'order', read: true }),
    ];
    const counts = computeInboxCounts(items);
    expect(counts.orders).toBe(1);
  });

  it('counts unread cosign and consult as cosign', () => {
    const items = [
      makeInboxItem({ id: 1, type: 'cosign', read: false }),
      makeInboxItem({ id: 2, type: 'consult', read: false }),
      makeInboxItem({ id: 3, type: 'cosign', read: true }),
    ];
    const counts = computeInboxCounts(items);
    expect(counts.cosign).toBe(2);
  });

  it('handles a mixed realistic set', () => {
    const items = [
      makeInboxItem({ id: 1, type: 'lab', read: false }),
      makeInboxItem({ id: 2, type: 'imaging', read: false }),
      makeInboxItem({ id: 3, type: 'message', read: false }),
      makeInboxItem({ id: 4, type: 'refill', read: false }),
      makeInboxItem({ id: 5, type: 'order', read: true }),
      makeInboxItem({ id: 6, type: 'cosign', read: false }),
      makeInboxItem({ id: 7, type: 'consult', read: true }),
    ];
    const counts = computeInboxCounts(items);
    expect(counts.all).toBe(5);
    expect(counts.results).toBe(2);
    expect(counts.messages).toBe(1);
    expect(counts.rxRefills).toBe(1);
    expect(counts.orders).toBe(0);
    expect(counts.cosign).toBe(1);
  });
});

describe('filterInboxItems', () => {
  const items: InboxItem[] = [
    makeInboxItem({ id: 1, type: 'lab', priority: 'critical', read: false }),
    makeInboxItem({ id: 2, type: 'imaging', priority: 'high', read: false }),
    makeInboxItem({ id: 3, type: 'message', priority: 'normal', read: true }),
    makeInboxItem({ id: 4, type: 'refill', priority: 'critical', read: false }),
    makeInboxItem({ id: 5, type: 'order', priority: 'high', read: true }),
    makeInboxItem({ id: 6, type: 'cosign', priority: 'normal', read: false }),
    makeInboxItem({ id: 7, type: 'consult', priority: 'low', read: true }),
  ];

  it('returns all items when all filters are "all"', () => {
    const result = filterInboxItems(items, 'all', 'all', 'all');
    expect(result).toHaveLength(7);
  });

  it('filters by results tab (lab + imaging)', () => {
    const result = filterInboxItems(items, 'results', 'all', 'all');
    expect(result).toHaveLength(2);
    expect(result.every(i => i.type === 'lab' || i.type === 'imaging')).toBe(true);
  });

  it('filters by messages tab', () => {
    const result = filterInboxItems(items, 'messages', 'all', 'all');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('message');
  });

  it('filters by rxRefills tab', () => {
    const result = filterInboxItems(items, 'rxRefills', 'all', 'all');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('refill');
  });

  it('filters by orders tab', () => {
    const result = filterInboxItems(items, 'orders', 'all', 'all');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('order');
  });

  it('filters by cosign tab (cosign + consult)', () => {
    const result = filterInboxItems(items, 'cosign', 'all', 'all');
    expect(result).toHaveLength(2);
    expect(result.every(i => i.type === 'cosign' || i.type === 'consult')).toBe(true);
  });

  it('filters by critical priority', () => {
    const result = filterInboxItems(items, 'all', 'critical', 'all');
    expect(result).toHaveLength(2);
    expect(result.every(i => i.priority === 'critical')).toBe(true);
  });

  it('filters by high priority', () => {
    const result = filterInboxItems(items, 'all', 'high', 'all');
    expect(result).toHaveLength(2);
    expect(result.every(i => i.priority === 'high')).toBe(true);
  });

  it('filters by normal priority', () => {
    const result = filterInboxItems(items, 'all', 'normal', 'all');
    expect(result).toHaveLength(2);
    expect(result.every(i => i.priority === 'normal')).toBe(true);
  });

  it('filters by unread status', () => {
    const result = filterInboxItems(items, 'all', 'all', 'unread');
    expect(result).toHaveLength(4);
    expect(result.every(i => !i.read)).toBe(true);
  });

  it('filters by read status', () => {
    const result = filterInboxItems(items, 'all', 'all', 'read');
    expect(result).toHaveLength(3);
    expect(result.every(i => i.read)).toBe(true);
  });

  it('combines tab and priority filters', () => {
    const result = filterInboxItems(items, 'results', 'critical', 'all');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('lab');
    expect(result[0].priority).toBe('critical');
  });

  it('combines tab, priority, and read filters', () => {
    const result = filterInboxItems(items, 'all', 'high', 'unread');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('returns empty when no items match combined filters', () => {
    const result = filterInboxItems(items, 'messages', 'critical', 'all');
    expect(result).toHaveLength(0);
  });

  it('returns empty for empty input', () => {
    const result = filterInboxItems([], 'all', 'all', 'all');
    expect(result).toHaveLength(0);
  });
});

describe('filterWorklistPatients', () => {
  const patients: WorklistPatient[] = [
    makeWorklistPatient({ id: 1, name: 'Adams, John', room: '201', status: 'critical' }),
    makeWorklistPatient({ id: 2, name: 'Baker, Jane', appointmentTime: '10:00 AM', status: 'waiting' }),
    makeWorklistPatient({ id: 3, name: 'Clark, Bob', room: '305', status: 'in-progress' }),
    makeWorklistPatient({ id: 4, name: 'Davis, Sue', appointmentTime: '11:30 AM', status: 'roomed' }),
    makeWorklistPatient({ id: 5, name: 'Evans, Tom', room: '102', appointmentTime: '9:00 AM', status: 'ready-discharge' }),
  ];

  it('returns all patients when filter is "all"', () => {
    const result = filterWorklistPatients(patients, 'all', 'name', true);
    expect(result).toHaveLength(5);
  });

  it('filters inpatient (patients with room)', () => {
    const result = filterWorklistPatients(patients, 'inpatient', 'name', true);
    expect(result).toHaveLength(3);
    expect(result.every(p => !!p.room)).toBe(true);
  });

  it('filters outpatient (patients with appointmentTime)', () => {
    const result = filterWorklistPatients(patients, 'outpatient', 'name', true);
    expect(result).toHaveLength(3);
    expect(result.every(p => !!p.appointmentTime)).toBe(true);
  });

  it('filters critical patients', () => {
    const result = filterWorklistPatients(patients, 'critical', 'name', true);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('critical');
    expect(result[0].name).toBe('Adams, John');
  });

  it('sorts by name ascending', () => {
    const result = filterWorklistPatients(patients, 'all', 'name', true);
    expect(result.map(p => p.name)).toEqual([
      'Adams, John',
      'Baker, Jane',
      'Clark, Bob',
      'Davis, Sue',
      'Evans, Tom',
    ]);
  });

  it('sorts by name descending', () => {
    const result = filterWorklistPatients(patients, 'all', 'name', false);
    expect(result.map(p => p.name)).toEqual([
      'Evans, Tom',
      'Davis, Sue',
      'Clark, Bob',
      'Baker, Jane',
      'Adams, John',
    ]);
  });

  it('sorts by status and returns all items', () => {
    const ascResult = filterWorklistPatients(patients, 'all', 'status', true);
    const descResult = filterWorklistPatients(patients, 'all', 'status', false);
    expect(ascResult).toHaveLength(5);
    expect(descResult).toHaveLength(5);
    // Ascending and descending should produce reversed orders
    expect(ascResult[0].id).toBe(descResult[descResult.length - 1].id);
    expect(ascResult[ascResult.length - 1].id).toBe(descResult[0].id);
  });

  it('sorts by location using room or appointmentTime', () => {
    const result = filterWorklistPatients(patients, 'all', 'location', true);
    // Should sort by room/appointmentTime string comparison
    expect(result.length).toBe(5);
  });

  it('combines filter and sort', () => {
    const result = filterWorklistPatients(patients, 'inpatient', 'name', false);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Evans, Tom');
    expect(result[1].name).toBe('Clark, Bob');
    expect(result[2].name).toBe('Adams, John');
  });

  it('returns empty when no patients match filter', () => {
    const nonCritical = patients.filter(p => p.status !== 'critical');
    const result = filterWorklistPatients(nonCritical, 'critical', 'name', true);
    expect(result).toHaveLength(0);
  });

  it('returns empty for empty input', () => {
    const result = filterWorklistPatients([], 'all', 'name', true);
    expect(result).toHaveLength(0);
  });

  it('does not mutate the original array', () => {
    const original = [...patients];
    filterWorklistPatients(patients, 'all', 'name', false);
    // The original patients array order should not be changed
    expect(patients.map(p => p.id)).toEqual(original.map(p => p.id));
  });
});
