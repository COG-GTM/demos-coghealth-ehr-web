/**
 * Unit tests for Dashboard logic
 * Tests data transformation, filtering, sorting, and state management
 */

// Types matching the DashboardPage interfaces
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

interface Patient {
  id?: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
  mrn?: string;
}

type InboxTab = 'all' | 'results' | 'messages' | 'rxRefills' | 'orders' | 'cosign';
type InboxPriority = 'all' | 'critical' | 'high' | 'normal';
type InboxReadFilter = 'all' | 'unread' | 'read';
type WorklistFilter = 'all' | 'inpatient' | 'outpatient' | 'critical';
type WorklistSort = 'name' | 'location' | 'status' | 'time';

// ---- Extracted logic functions matching DashboardPage ----

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
      cmp = (order[a.status] || 5) - (order[b.status] || 5);
    }
    return worklistSortAsc ? cmp : -cmp;
  });
  return patients;
}

function markAsRead(items: InboxItem[], itemId: number): InboxItem[] {
  return items.map(item => item.id === itemId ? { ...item, read: true } : item);
}

function toggleFlag(items: InboxItem[], itemId: number): InboxItem[] {
  return items.map(item => item.id === itemId ? { ...item, flagged: !item.flagged } : item);
}

function markAllAsRead(items: InboxItem[]): InboxItem[] {
  return items.map(item => ({ ...item, read: true }));
}

// ---- Test Data ----

const mockPatients: Patient[] = [
  { id: 1, firstName: 'John', lastName: 'Smith', dateOfBirth: '1965-03-15', gender: 'MALE', mrn: 'MRN001234' },
  { id: 2, firstName: 'Sarah', lastName: 'Johnson', dateOfBirth: '1978-07-22', gender: 'FEMALE', mrn: 'MRN001235' },
  { id: 3, firstName: 'Michael', lastName: 'Williams', dateOfBirth: '1952-11-08', gender: 'MALE', mrn: 'MRN001236' },
  { id: 4, firstName: 'Emily', lastName: 'Brown', dateOfBirth: '1989-04-30', gender: 'FEMALE', mrn: 'MRN001237' },
  { id: 5, firstName: 'Robert', lastName: 'Davis', dateOfBirth: '1945-08-20', gender: 'MALE', mrn: 'MRN001238' },
  { id: 6, firstName: 'Maria', lastName: 'Martinez', dateOfBirth: '1970-12-05', gender: 'FEMALE', mrn: 'MRN001240' },
];

// ---- Tests ----

describe('Dashboard Data Transformations', () => {
  describe('mapPatientToWorklist', () => {
    test('should transform patient to worklist format with correct name', () => {
      const result = mapPatientToWorklist(mockPatients[0], 0);
      expect(result.name).toBe('Smith, John');
    });

    test('should calculate age from date of birth', () => {
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

    test('should use patient id', () => {
      const result = mapPatientToWorklist(mockPatients[0], 0);
      expect(result.id).toBe(1);
    });

    test('should use index as fallback id', () => {
      const patientNoId = { ...mockPatients[0], id: undefined };
      const result = mapPatientToWorklist(patientNoId, 5);
      expect(result.id).toBe(5);
    });

    test('should assign MRN from patient', () => {
      const result = mapPatientToWorklist(mockPatients[0], 0);
      expect(result.mrn).toBe('MRN001234');
    });

    test('should assign location based on index', () => {
      const locations = ['Clinic 2B', 'Med-Surg 4W', 'CCU', 'Med-Surg 3E'];
      for (let i = 0; i < 4; i++) {
        const result = mapPatientToWorklist(mockPatients[i], i);
        expect(result.location).toBe(locations[i % locations.length]);
      }
    });

    test('should assign status based on index', () => {
      const statuses = ['waiting', 'roomed', 'in-progress', 'ready-discharge', 'critical'];
      for (let i = 0; i < 5; i++) {
        const result = mapPatientToWorklist(mockPatients[i % mockPatients.length], i);
        expect(result.status).toBe(statuses[i % statuses.length]);
      }
    });

    test('should assign appointment time based on index', () => {
      const result0 = mapPatientToWorklist(mockPatients[0], 0);
      expect(result0.appointmentTime).toBe('9:00 AM');
      const result1 = mapPatientToWorklist(mockPatients[1], 1);
      expect(result1.appointmentTime).toBe('10:30 AM');
    });

    test('should set attending provider as Dr. Smith', () => {
      const result = mapPatientToWorklist(mockPatients[0], 0);
      expect(result.attendingProvider).toBe('Dr. Smith');
    });

    test('should initialize with empty alerts and flags', () => {
      const result = mapPatientToWorklist(mockPatients[0], 0);
      expect(result.alerts).toEqual([]);
      expect(result.flags).toEqual([]);
    });
  });

  describe('mapPatientToInbox', () => {
    test('should transform patient to inbox format with correct name', () => {
      const result = mapPatientToInbox(mockPatients[0], 0);
      expect(result.patientName).toBe('Smith, John');
    });

    test('should assign type based on index cycling through types', () => {
      const types = ['lab', 'imaging', 'message', 'refill', 'order', 'cosign'];
      for (let i = 0; i < 6; i++) {
        const result = mapPatientToInbox(mockPatients[i % mockPatients.length], i);
        expect(result.type).toBe(types[i % types.length]);
      }
    });

    test('should assign priority based on index', () => {
      const priorities = ['critical', 'high', 'normal', 'low'];
      for (let i = 0; i < 4; i++) {
        const result = mapPatientToInbox(mockPatients[i], i);
        expect(result.priority).toBe(priorities[i % priorities.length]);
      }
    });

    test('should mark items with index > 3 as read', () => {
      const readItem = mapPatientToInbox(mockPatients[4], 4);
      expect(readItem.read).toBe(true);
      const unreadItem = mapPatientToInbox(mockPatients[0], 0);
      expect(unreadItem.read).toBe(false);
    });

    test('should flag items with index < 2', () => {
      const flagged = mapPatientToInbox(mockPatients[0], 0);
      expect(flagged.flagged).toBe(true);
      const unflagged = mapPatientToInbox(mockPatients[2], 2);
      expect(unflagged.flagged).toBe(false);
    });

    test('should set title based on type', () => {
      const result = mapPatientToInbox(mockPatients[0], 0);
      expect(result.title).toBe('LAB Result');
    });

    test('should set timestamp based on index', () => {
      const result = mapPatientToInbox(mockPatients[0], 0);
      expect(result.timestamp).toBe('1 hr ago');
      const result3 = mapPatientToInbox(mockPatients[2], 2);
      expect(result3.timestamp).toBe('3 hr ago');
    });

    test('should set MRN from patient', () => {
      const result = mapPatientToInbox(mockPatients[0], 0);
      expect(result.patientMrn).toBe('MRN001234');
    });
  });
});

describe('Inbox Filtering Logic', () => {
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

    test('should count unread cosign items (cosign + consult)', () => {
      const counts = computeInboxCounts(inboxItems);
      const expected = inboxItems.filter(i => !i.read && (i.type === 'cosign' || i.type === 'consult')).length;
      expect(counts.cosign).toBe(expected);
    });
  });

  describe('filterInbox by tab', () => {
    test('should return all items when tab is all', () => {
      const result = filterInbox(inboxItems, 'all', 'all', 'all');
      expect(result.length).toBe(inboxItems.length);
    });

    test('should filter to results (lab + imaging) only', () => {
      const result = filterInbox(inboxItems, 'results', 'all', 'all');
      expect(result.every(i => i.type === 'lab' || i.type === 'imaging')).toBe(true);
    });

    test('should filter to messages only', () => {
      const result = filterInbox(inboxItems, 'messages', 'all', 'all');
      expect(result.every(i => i.type === 'message')).toBe(true);
    });

    test('should filter to rx refills only', () => {
      const result = filterInbox(inboxItems, 'rxRefills', 'all', 'all');
      expect(result.every(i => i.type === 'refill')).toBe(true);
    });

    test('should filter to orders only', () => {
      const result = filterInbox(inboxItems, 'orders', 'all', 'all');
      expect(result.every(i => i.type === 'order')).toBe(true);
    });

    test('should filter to cosign (cosign + consult) only', () => {
      const result = filterInbox(inboxItems, 'cosign', 'all', 'all');
      expect(result.every(i => i.type === 'cosign' || i.type === 'consult')).toBe(true);
    });
  });

  describe('filterInbox by priority', () => {
    test('should filter to critical only', () => {
      const result = filterInbox(inboxItems, 'all', 'critical', 'all');
      expect(result.every(i => i.priority === 'critical')).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should filter to high only', () => {
      const result = filterInbox(inboxItems, 'all', 'high', 'all');
      expect(result.every(i => i.priority === 'high')).toBe(true);
    });

    test('should filter to normal only', () => {
      const result = filterInbox(inboxItems, 'all', 'normal', 'all');
      expect(result.every(i => i.priority === 'normal')).toBe(true);
    });
  });

  describe('filterInbox by read status', () => {
    test('should filter to unread only', () => {
      const result = filterInbox(inboxItems, 'all', 'all', 'unread');
      expect(result.every(i => !i.read)).toBe(true);
    });

    test('should filter to read only', () => {
      const result = filterInbox(inboxItems, 'all', 'all', 'read');
      expect(result.every(i => i.read)).toBe(true);
    });
  });

  describe('filterInbox with combined filters', () => {
    test('should filter by tab AND priority', () => {
      const result = filterInbox(inboxItems, 'results', 'critical', 'all');
      expect(result.every(i => (i.type === 'lab' || i.type === 'imaging') && i.priority === 'critical')).toBe(true);
    });

    test('should filter by tab AND read status', () => {
      const result = filterInbox(inboxItems, 'results', 'all', 'unread');
      expect(result.every(i => (i.type === 'lab' || i.type === 'imaging') && !i.read)).toBe(true);
    });

    test('should filter by all three criteria', () => {
      const result = filterInbox(inboxItems, 'all', 'critical', 'unread');
      expect(result.every(i => i.priority === 'critical' && !i.read)).toBe(true);
    });
  });
});

describe('Worklist Filtering and Sorting', () => {
  let worklistPatients: WorklistPatient[];

  beforeEach(() => {
    worklistPatients = mockPatients.map((p, i) => mapPatientToWorklist(p, i));
  });

  describe('filterWorklist by type', () => {
    test('should return all patients when filter is all', () => {
      const result = filterWorklist(worklistPatients, 'all', 'status', true);
      expect(result.length).toBe(worklistPatients.length);
    });

    test('should filter to outpatient (has appointmentTime)', () => {
      const result = filterWorklist(worklistPatients, 'outpatient', 'status', true);
      expect(result.every(p => !!p.appointmentTime)).toBe(true);
    });

    test('should filter to inpatient (has room)', () => {
      // Add room to some patients for testing
      const patientsWithRooms = worklistPatients.map((p, i) => 
        i < 3 ? { ...p, room: `Room ${100 + i}` } : p
      );
      const result = filterWorklist(patientsWithRooms, 'inpatient', 'status', true);
      expect(result.every(p => !!p.room)).toBe(true);
      expect(result.length).toBe(3);
    });

    test('should filter to critical status', () => {
      const result = filterWorklist(worklistPatients, 'critical', 'status', true);
      expect(result.every(p => p.status === 'critical')).toBe(true);
    });
  });

  describe('filterWorklist sorting', () => {
    test('should sort by name ascending', () => {
      const result = filterWorklist(worklistPatients, 'all', 'name', true);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].name.localeCompare(result[i - 1].name)).toBeGreaterThanOrEqual(0);
      }
    });

    test('should sort by name descending', () => {
      const result = filterWorklist(worklistPatients, 'all', 'name', false);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].name.localeCompare(result[i - 1].name)).toBeLessThanOrEqual(0);
      }
    });

    test('should sort by status with critical first when ascending', () => {
      const result = filterWorklist(worklistPatients, 'all', 'status', true);
      const statusOrder: Record<string, number> = { critical: 0, 'in-progress': 1, roomed: 2, waiting: 3, 'ready-discharge': 4 };
      for (let i = 1; i < result.length; i++) {
        expect((statusOrder[result[i].status] || 5)).toBeGreaterThanOrEqual(statusOrder[result[i - 1].status] || 5);
      }
    });
  });
});

describe('Inbox State Management', () => {
  let inboxItems: InboxItem[];

  beforeEach(() => {
    inboxItems = mockPatients.map((p, i) => mapPatientToInbox(p, i));
  });

  describe('markAsRead', () => {
    test('should mark specific item as read', () => {
      const unreadItem = inboxItems.find(i => !i.read);
      expect(unreadItem).toBeDefined();
      const result = markAsRead(inboxItems, unreadItem!.id);
      const updated = result.find(i => i.id === unreadItem!.id);
      expect(updated!.read).toBe(true);
    });

    test('should not modify other items', () => {
      const targetId = inboxItems[0].id;
      const result = markAsRead(inboxItems, targetId);
      const otherItems = result.filter(i => i.id !== targetId);
      const originalOtherItems = inboxItems.filter(i => i.id !== targetId);
      expect(otherItems).toEqual(originalOtherItems);
    });

    test('should return new array (immutability)', () => {
      const result = markAsRead(inboxItems, inboxItems[0].id);
      expect(result).not.toBe(inboxItems);
    });
  });

  describe('toggleFlag', () => {
    test('should toggle flag on unflagged item', () => {
      const unflaggedItem = inboxItems.find(i => !i.flagged);
      expect(unflaggedItem).toBeDefined();
      const result = toggleFlag(inboxItems, unflaggedItem!.id);
      const updated = result.find(i => i.id === unflaggedItem!.id);
      expect(updated!.flagged).toBe(true);
    });

    test('should toggle flag off flagged item', () => {
      const flaggedItem = inboxItems.find(i => i.flagged);
      expect(flaggedItem).toBeDefined();
      const result = toggleFlag(inboxItems, flaggedItem!.id);
      const updated = result.find(i => i.id === flaggedItem!.id);
      expect(updated!.flagged).toBe(false);
    });

    test('should not modify other items', () => {
      const targetId = inboxItems[0].id;
      const result = toggleFlag(inboxItems, targetId);
      const otherItems = result.filter(i => i.id !== targetId);
      const originalOtherItems = inboxItems.filter(i => i.id !== targetId);
      expect(otherItems).toEqual(originalOtherItems);
    });
  });

  describe('markAllAsRead', () => {
    test('should mark all items as read', () => {
      const result = markAllAsRead(inboxItems);
      expect(result.every(i => i.read)).toBe(true);
    });

    test('should not modify other properties', () => {
      const result = markAllAsRead(inboxItems);
      for (let i = 0; i < result.length; i++) {
        expect(result[i].id).toBe(inboxItems[i].id);
        expect(result[i].type).toBe(inboxItems[i].type);
        expect(result[i].priority).toBe(inboxItems[i].priority);
        expect(result[i].patientName).toBe(inboxItems[i].patientName);
        expect(result[i].flagged).toBe(inboxItems[i].flagged);
      }
    });

    test('should return new array (immutability)', () => {
      const result = markAllAsRead(inboxItems);
      expect(result).not.toBe(inboxItems);
    });
  });
});

describe('Edge Cases', () => {
  test('should handle empty inbox items', () => {
    const counts = computeInboxCounts([]);
    expect(counts.all).toBe(0);
    expect(counts.results).toBe(0);
    expect(counts.messages).toBe(0);
  });

  test('should handle filtering empty inbox', () => {
    const result = filterInbox([], 'results', 'critical', 'unread');
    expect(result).toEqual([]);
  });

  test('should handle filtering empty worklist', () => {
    const result = filterWorklist([], 'all', 'status', true);
    expect(result).toEqual([]);
  });

  test('should handle patient with no id', () => {
    const patient: Patient = { firstName: 'Test', lastName: 'User', dateOfBirth: '1990-01-01' };
    const result = mapPatientToWorklist(patient, 7);
    expect(result.id).toBe(7);
    expect(result.mrn).toBe('');
  });

  test('should handle patient with OTHER gender', () => {
    const patient: Patient = { firstName: 'Test', lastName: 'User', dateOfBirth: '1990-01-01', gender: 'OTHER' };
    const result = mapPatientToWorklist(patient, 0);
    expect(result.gender).toBe('O');
  });

  test('should handle marking non-existent item as read', () => {
    const items = mockPatients.map((p, i) => mapPatientToInbox(p, i));
    const result = markAsRead(items, 99999);
    expect(result).toEqual(items);
  });
});
