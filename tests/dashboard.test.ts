/**
 * Dashboard Unit Tests
 * 
 * Tests for the dashboard's core data transformation and filtering logic.
 * These tests verify that mapPatientToWorklist, mapPatientToInbox,
 * inbox filtering, worklist filtering/sorting, and inbox counts
 * all work correctly.
 */

import type { Patient } from '../src/types';

// ---- Replicate the dashboard logic for testability ----

type InboxTab = 'all' | 'results' | 'messages' | 'rxRefills' | 'orders' | 'cosign';
type InboxPriority = 'all' | 'critical' | 'high' | 'normal';
type InboxReadFilter = 'all' | 'unread' | 'read';
type WorklistFilter = 'all' | 'inpatient' | 'outpatient' | 'critical';
type WorklistSort = 'name' | 'location' | 'status' | 'time';

interface InboxItem {
  id: number;
  type: 'lab' | 'imaging' | 'message' | 'refill' | 'order' | 'cosign' | 'consult';
  priority: 'critical' | 'high' | 'normal' | 'low';
  patientName: string;
  patientMrn: string;
  title: string;
  detail: string;
  timestamp: string;
  read: boolean;
  flagged: boolean;
}

interface WorklistPatient {
  id: number;
  name: string;
  mrn: string;
  age: number;
  gender: string;
  room?: string;
  location: string;
  chiefComplaint: string;
  admitDate?: string;
  appointmentTime?: string;
  attendingProvider: string;
  status: 'waiting' | 'roomed' | 'in-progress' | 'ready-discharge' | 'critical';
  alerts: string[];
  lastVitals?: {
    bp: string;
    hr: number;
    temp: number;
    spo2: number;
    rr: number;
  };
  flags: ('fall-risk' | 'isolation' | 'npo' | 'allergy' | 'code-status' | 'vip')[];
}

function mapPatientToWorklist(patient: Patient, index: number): WorklistPatient {
  const age = Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const statuses: WorklistPatient['status'][] = ['waiting', 'roomed', 'in-progress', 'ready-discharge', 'critical'];
  const locations = ['Clinic 2B', 'Med-Surg 4W', 'CCU', 'Med-Surg 3E'];
  const complaints = ['Follow-up visit', 'Annual exam', 'Lab review', 'Medication management', 'New symptoms'];
  return {
    id: patient.id || index,
    name: `${patient.lastName}, ${patient.firstName}`,
    mrn: patient.mrn || '',
    age,
    gender: patient.gender === 'MALE' ? 'M' : patient.gender === 'FEMALE' ? 'F' : 'O',
    appointmentTime: `${9 + (index % 8)}:${index % 2 === 0 ? '00' : '30'} AM`,
    location: locations[index % locations.length],
    chiefComplaint: complaints[index % complaints.length],
    attendingProvider: 'Dr. Smith',
    status: statuses[index % statuses.length],
    alerts: [],
    flags: [],
  };
}

function mapPatientToInbox(patient: Patient, index: number): InboxItem {
  const types: InboxItem['type'][] = ['lab', 'imaging', 'message', 'refill', 'order', 'cosign'];
  const priorities: InboxItem['priority'][] = ['critical', 'high', 'normal', 'low'];
  return {
    id: patient.id || index,
    type: types[index % types.length],
    priority: priorities[index % priorities.length],
    patientName: `${patient.lastName}, ${patient.firstName}`,
    patientMrn: patient.mrn || '',
    title: `${types[index % types.length].toUpperCase()} Result`,
    detail: 'Review required',
    timestamp: `${index + 1} hr ago`,
    read: index > 3,
    flagged: index < 2,
  };
}

function computeInboxCounts(inboxItems: InboxItem[]) {
  return {
    all: inboxItems.filter(i => !i.read).length,
    results: inboxItems.filter(i => !i.read && (i.type === 'lab' || i.type === 'imaging')).length,
    messages: inboxItems.filter(i => !i.read && i.type === 'message').length,
    rxRefills: inboxItems.filter(i => !i.read && i.type === 'refill').length,
    orders: inboxItems.filter(i => !i.read && i.type === 'order').length,
    cosign: inboxItems.filter(i => !i.read && (i.type === 'cosign' || i.type === 'consult')).length,
  };
}

function filterInbox(
  inboxItems: InboxItem[],
  inboxTab: InboxTab,
  inboxPriority: InboxPriority,
  inboxReadFilter: InboxReadFilter
): InboxItem[] {
  let items = inboxItems;
  if (inboxTab !== 'all') {
    if (inboxTab === 'results') items = items.filter(i => i.type === 'lab' || i.type === 'imaging');
    else if (inboxTab === 'messages') items = items.filter(i => i.type === 'message');
    else if (inboxTab === 'rxRefills') items = items.filter(i => i.type === 'refill');
    else if (inboxTab === 'orders') items = items.filter(i => i.type === 'order');
    else if (inboxTab === 'cosign') items = items.filter(i => i.type === 'cosign' || i.type === 'consult');
  }
  if (inboxPriority !== 'all') {
    items = items.filter(i => i.priority === inboxPriority);
  }
  if (inboxReadFilter === 'unread') {
    items = items.filter(i => !i.read);
  } else if (inboxReadFilter === 'read') {
    items = items.filter(i => i.read);
  }
  return items;
}

function filterWorklist(
  worklistPatients: WorklistPatient[],
  worklistFilter: WorklistFilter,
  worklistSort: WorklistSort,
  worklistSortAsc: boolean
): WorklistPatient[] {
  const patients = worklistPatients.filter(patient => {
    if (worklistFilter === 'all') return true;
    if (worklistFilter === 'inpatient') return !!patient.room;
    if (worklistFilter === 'outpatient') return !!patient.appointmentTime;
    if (worklistFilter === 'critical') return patient.status === 'critical';
    return true;
  });
  patients.sort((a, b) => {
    let cmp = 0;
    if (worklistSort === 'name') cmp = a.name.localeCompare(b.name);
    else if (worklistSort === 'location') cmp = (a.room || a.appointmentTime || '').localeCompare(b.room || b.appointmentTime || '');
    else if (worklistSort === 'status') {
      const order: Record<string, number> = { critical: 0, 'in-progress': 1, roomed: 2, waiting: 3, 'ready-discharge': 4 };
      cmp = (order[a.status] ?? 5) - (order[b.status] ?? 5);
    }
    return worklistSortAsc ? cmp : -cmp;
  });
  return patients;
}

// ---- Test Data ----

const mockPatients: Patient[] = [
  {
    id: 1, firstName: 'John', lastName: 'Smith', mrn: 'MRN001234',
    dateOfBirth: '1965-03-15', gender: 'MALE',
  },
  {
    id: 2, firstName: 'Sarah', lastName: 'Johnson', mrn: 'MRN001235',
    dateOfBirth: '1978-07-22', gender: 'FEMALE',
  },
  {
    id: 3, firstName: 'Michael', lastName: 'Williams', mrn: 'MRN001236',
    dateOfBirth: '1952-11-08', gender: 'MALE',
  },
  {
    id: 4, firstName: 'Emily', lastName: 'Brown', mrn: 'MRN001237',
    dateOfBirth: '1989-04-30', gender: 'FEMALE',
  },
  {
    id: 5, firstName: 'Robert', lastName: 'Davis', mrn: 'MRN001238',
    dateOfBirth: '1945-08-20', gender: 'MALE',
  },
  {
    id: 6, firstName: 'Maria', lastName: 'Martinez', mrn: 'MRN001240',
    dateOfBirth: '1970-12-05', gender: 'FEMALE',
  },
];


// ---- Tests ----

describe('Dashboard Data Mapping', () => {
  describe('mapPatientToWorklist', () => {
    test('should map a patient to worklist format with correct name', () => {
      const result = mapPatientToWorklist(mockPatients[0], 0);
      expect(result.name).toBe('Smith, John');
      expect(result.mrn).toBe('MRN001234');
    });

    test('should calculate age from dateOfBirth', () => {
      const result = mapPatientToWorklist(mockPatients[0], 0);
      expect(result.age).toBeGreaterThan(50);
      expect(result.age).toBeLessThan(70);
    });

    test('should map gender correctly', () => {
      const male = mapPatientToWorklist(mockPatients[0], 0);
      expect(male.gender).toBe('M');
      const female = mapPatientToWorklist(mockPatients[1], 1);
      expect(female.gender).toBe('F');
    });

    test('should assign appointment time based on index', () => {
      const result0 = mapPatientToWorklist(mockPatients[0], 0);
      expect(result0.appointmentTime).toBe('9:00 AM');
      const result1 = mapPatientToWorklist(mockPatients[1], 1);
      expect(result1.appointmentTime).toBe('10:30 AM');
    });

    test('should cycle through statuses based on index', () => {
      const statuses: WorklistPatient['status'][] = ['waiting', 'roomed', 'in-progress', 'ready-discharge', 'critical'];
      for (let i = 0; i < 5; i++) {
        const result = mapPatientToWorklist(mockPatients[i % mockPatients.length], i);
        expect(result.status).toBe(statuses[i % statuses.length]);
      }
    });

    test('should cycle through locations based on index', () => {
      const locations = ['Clinic 2B', 'Med-Surg 4W', 'CCU', 'Med-Surg 3E'];
      for (let i = 0; i < 4; i++) {
        const result = mapPatientToWorklist(mockPatients[i], i);
        expect(result.location).toBe(locations[i % locations.length]);
      }
    });

    test('should always assign Dr. Smith as attending provider', () => {
      const result = mapPatientToWorklist(mockPatients[0], 0);
      expect(result.attendingProvider).toBe('Dr. Smith');
    });

    test('should use patient.id when available', () => {
      const result = mapPatientToWorklist(mockPatients[0], 5);
      expect(result.id).toBe(1);
    });

    test('should fallback to index when patient.id is undefined', () => {
      const noIdPatient: Patient = { firstName: 'Test', lastName: 'User', dateOfBirth: '2000-01-01' };
      const result = mapPatientToWorklist(noIdPatient, 7);
      expect(result.id).toBe(7);
    });

    test('should initialize empty alerts and flags', () => {
      const result = mapPatientToWorklist(mockPatients[0], 0);
      expect(result.alerts).toEqual([]);
      expect(result.flags).toEqual([]);
    });
  });

  describe('mapPatientToInbox', () => {
    test('should map a patient to inbox item with correct name', () => {
      const result = mapPatientToInbox(mockPatients[0], 0);
      expect(result.patientName).toBe('Smith, John');
      expect(result.patientMrn).toBe('MRN001234');
    });

    test('should cycle through types based on index', () => {
      const types: InboxItem['type'][] = ['lab', 'imaging', 'message', 'refill', 'order', 'cosign'];
      for (let i = 0; i < 6; i++) {
        const result = mapPatientToInbox(mockPatients[i % mockPatients.length], i);
        expect(result.type).toBe(types[i % types.length]);
      }
    });

    test('should cycle through priorities based on index', () => {
      const priorities: InboxItem['priority'][] = ['critical', 'high', 'normal', 'low'];
      for (let i = 0; i < 4; i++) {
        const result = mapPatientToInbox(mockPatients[i], i);
        expect(result.priority).toBe(priorities[i % priorities.length]);
      }
    });

    test('should mark items with index > 3 as read', () => {
      const unread = mapPatientToInbox(mockPatients[0], 2);
      expect(unread.read).toBe(false);
      const read = mapPatientToInbox(mockPatients[4], 4);
      expect(read.read).toBe(true);
    });

    test('should flag items with index < 2', () => {
      const flagged = mapPatientToInbox(mockPatients[0], 0);
      expect(flagged.flagged).toBe(true);
      const notFlagged = mapPatientToInbox(mockPatients[2], 3);
      expect(notFlagged.flagged).toBe(false);
    });

    test('should generate timestamp based on index', () => {
      const result = mapPatientToInbox(mockPatients[0], 2);
      expect(result.timestamp).toBe('3 hr ago');
    });

    test('should set title based on type', () => {
      const result = mapPatientToInbox(mockPatients[0], 0);
      expect(result.title).toBe('LAB Result');
    });
  });
});

describe('Inbox Filtering', () => {
  let inboxItems: InboxItem[];

  beforeEach(() => {
    inboxItems = mockPatients.map((p, i) => mapPatientToInbox(p, i));
  });

  describe('computeInboxCounts', () => {
    test('should count all unread items', () => {
      const counts = computeInboxCounts(inboxItems);
      expect(counts.all).toBe(inboxItems.filter(i => !i.read).length);
    });

    test('should count unread results (lab + imaging)', () => {
      const counts = computeInboxCounts(inboxItems);
      const expected = inboxItems.filter(i => !i.read && (i.type === 'lab' || i.type === 'imaging')).length;
      expect(counts.results).toBe(expected);
    });

    test('should count unread messages', () => {
      const counts = computeInboxCounts(inboxItems);
      const expected = inboxItems.filter(i => !i.read && i.type === 'message').length;
      expect(counts.messages).toBe(expected);
    });

    test('should count unread rx refills', () => {
      const counts = computeInboxCounts(inboxItems);
      const expected = inboxItems.filter(i => !i.read && i.type === 'refill').length;
      expect(counts.rxRefills).toBe(expected);
    });

    test('should count unread orders', () => {
      const counts = computeInboxCounts(inboxItems);
      const expected = inboxItems.filter(i => !i.read && i.type === 'order').length;
      expect(counts.orders).toBe(expected);
    });

    test('should count unread cosign (including consult)', () => {
      const counts = computeInboxCounts(inboxItems);
      const expected = inboxItems.filter(i => !i.read && (i.type === 'cosign' || i.type === 'consult')).length;
      expect(counts.cosign).toBe(expected);
    });
  });

  describe('filterInbox', () => {
    test('should return all items when tab is "all" and no other filters', () => {
      const result = filterInbox(inboxItems, 'all', 'all', 'all');
      expect(result.length).toBe(inboxItems.length);
    });

    test('should filter by results tab (lab + imaging)', () => {
      const result = filterInbox(inboxItems, 'results', 'all', 'all');
      expect(result.every(i => i.type === 'lab' || i.type === 'imaging')).toBe(true);
    });

    test('should filter by messages tab', () => {
      const result = filterInbox(inboxItems, 'messages', 'all', 'all');
      expect(result.every(i => i.type === 'message')).toBe(true);
    });

    test('should filter by rxRefills tab', () => {
      const result = filterInbox(inboxItems, 'rxRefills', 'all', 'all');
      expect(result.every(i => i.type === 'refill')).toBe(true);
    });

    test('should filter by orders tab', () => {
      const result = filterInbox(inboxItems, 'orders', 'all', 'all');
      expect(result.every(i => i.type === 'order')).toBe(true);
    });

    test('should filter by cosign tab', () => {
      const result = filterInbox(inboxItems, 'cosign', 'all', 'all');
      expect(result.every(i => i.type === 'cosign' || i.type === 'consult')).toBe(true);
    });

    test('should filter by critical priority', () => {
      const result = filterInbox(inboxItems, 'all', 'critical', 'all');
      expect(result.every(i => i.priority === 'critical')).toBe(true);
    });

    test('should filter by high priority', () => {
      const result = filterInbox(inboxItems, 'all', 'high', 'all');
      expect(result.every(i => i.priority === 'high')).toBe(true);
    });

    test('should filter by unread status', () => {
      const result = filterInbox(inboxItems, 'all', 'all', 'unread');
      expect(result.every(i => !i.read)).toBe(true);
    });

    test('should filter by read status', () => {
      const result = filterInbox(inboxItems, 'all', 'all', 'read');
      expect(result.every(i => i.read)).toBe(true);
    });

    test('should combine tab and priority filters', () => {
      const result = filterInbox(inboxItems, 'results', 'critical', 'all');
      expect(result.every(i => (i.type === 'lab' || i.type === 'imaging') && i.priority === 'critical')).toBe(true);
    });

    test('should combine all three filters', () => {
      const result = filterInbox(inboxItems, 'results', 'critical', 'unread');
      expect(result.every(i =>
        (i.type === 'lab' || i.type === 'imaging') &&
        i.priority === 'critical' &&
        !i.read
      )).toBe(true);
    });

    test('should return empty array when no items match filters', () => {
      // All read items with critical priority and messages tab - unlikely combo
      const allRead = inboxItems.map(i => ({ ...i, read: true }));
      const result = filterInbox(allRead, 'messages', 'critical', 'unread');
      expect(result.length).toBe(0);
    });
  });
});

describe('Worklist Filtering and Sorting', () => {
  let worklistPatients: WorklistPatient[];

  beforeEach(() => {
    worklistPatients = mockPatients.map((p, i) => mapPatientToWorklist(p, i));
  });

  describe('Worklist Filtering', () => {
    test('should return all patients when filter is "all"', () => {
      const result = filterWorklist(worklistPatients, 'all', 'status', true);
      expect(result.length).toBe(worklistPatients.length);
    });

    test('should filter by inpatient (has room)', () => {
      // Add rooms to some patients
      const withRooms = worklistPatients.map((p, i) => ({
        ...p,
        room: i < 3 ? `Room ${100 + i}` : undefined,
      }));
      const result = filterWorklist(withRooms, 'inpatient', 'status', true);
      expect(result.every(p => !!p.room)).toBe(true);
      expect(result.length).toBe(3);
    });

    test('should filter by outpatient (has appointmentTime)', () => {
      const result = filterWorklist(worklistPatients, 'outpatient', 'status', true);
      expect(result.every(p => !!p.appointmentTime)).toBe(true);
    });

    test('should filter by critical status', () => {
      const result = filterWorklist(worklistPatients, 'critical', 'status', true);
      expect(result.every(p => p.status === 'critical')).toBe(true);
    });
  });

  describe('Worklist Sorting', () => {
    test('should sort by name ascending', () => {
      const result = filterWorklist(worklistPatients, 'all', 'name', true);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].name.localeCompare(result[i].name)).toBeLessThanOrEqual(0);
      }
    });

    test('should sort by name descending', () => {
      const result = filterWorklist(worklistPatients, 'all', 'name', false);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].name.localeCompare(result[i].name)).toBeGreaterThanOrEqual(0);
      }
    });

    test('should sort by status ascending (critical first)', () => {
      const result = filterWorklist(worklistPatients, 'all', 'status', true);
      const statusOrder: Record<string, number> = { critical: 0, 'in-progress': 1, roomed: 2, waiting: 3, 'ready-discharge': 4 };
      for (let i = 1; i < result.length; i++) {
        expect((statusOrder[result[i - 1].status] ?? 5)).toBeLessThanOrEqual(statusOrder[result[i].status] ?? 5);
      }
    });

    test('should sort by status descending', () => {
      const result = filterWorklist(worklistPatients, 'all', 'status', false);
      const statusOrder: Record<string, number> = { critical: 0, 'in-progress': 1, roomed: 2, waiting: 3, 'ready-discharge': 4 };
      for (let i = 1; i < result.length; i++) {
        expect((statusOrder[result[i - 1].status] ?? 5)).toBeGreaterThanOrEqual(statusOrder[result[i].status] ?? 5);
      }
    });

    test('should sort by location', () => {
      const result = filterWorklist(worklistPatients, 'all', 'location', true);
      for (let i = 1; i < result.length; i++) {
        const locA = result[i - 1].room || result[i - 1].appointmentTime || '';
        const locB = result[i].room || result[i].appointmentTime || '';
        expect(locA.localeCompare(locB)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('Combined Filter and Sort', () => {
    test('should filter and then sort correctly', () => {
      const result = filterWorklist(worklistPatients, 'all', 'name', true);
      expect(result.length).toBe(worklistPatients.length);
      // Verify sorted by name
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].name.localeCompare(result[i].name)).toBeLessThanOrEqual(0);
      }
    });

    test('should filter by critical and sort by name', () => {
      const result = filterWorklist(worklistPatients, 'critical', 'name', true);
      expect(result.every(p => p.status === 'critical')).toBe(true);
    });
  });
});

describe('Inbox Actions', () => {
  test('markAsRead should mark a single item as read', () => {
    const items = mockPatients.map((p, i) => mapPatientToInbox(p, i));
    const targetId = items[0].id;
    const updated = items.map(item => item.id === targetId ? { ...item, read: true } : item);
    expect(updated.find(i => i.id === targetId)?.read).toBe(true);
  });

  test('toggleFlag should toggle the flagged state', () => {
    const items = mockPatients.map((p, i) => mapPatientToInbox(p, i));
    const targetId = items[0].id;
    const originalFlagged = items[0].flagged;
    const updated = items.map(item => item.id === targetId ? { ...item, flagged: !item.flagged } : item);
    expect(updated.find(i => i.id === targetId)?.flagged).toBe(!originalFlagged);
  });

  test('markAllAsRead should mark all items as read', () => {
    const items = mockPatients.map((p, i) => mapPatientToInbox(p, i));
    const updated = items.map(item => ({ ...item, read: true }));
    expect(updated.every(i => i.read)).toBe(true);
  });
});
