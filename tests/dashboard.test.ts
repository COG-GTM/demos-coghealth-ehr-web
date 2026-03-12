/**
 * Unit tests for DashboardPage business logic
 * Tests filtering, sorting, mapping, and state management functions
 */

// ---- Types (mirrored from DashboardPage for testability) ----

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

// ---- Functions extracted from DashboardPage ----

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

function filterInbox(
  items: InboxItem[],
  tab: InboxTab,
  priority: InboxPriority,
  readFilter: InboxReadFilter
): InboxItem[] {
  let filtered = items;
  if (tab !== 'all') {
    if (tab === 'results') filtered = filtered.filter(i => i.type === 'lab' || i.type === 'imaging');
    else if (tab === 'messages') filtered = filtered.filter(i => i.type === 'message');
    else if (tab === 'rxRefills') filtered = filtered.filter(i => i.type === 'refill');
    else if (tab === 'orders') filtered = filtered.filter(i => i.type === 'order');
    else if (tab === 'cosign') filtered = filtered.filter(i => i.type === 'cosign' || i.type === 'consult');
  }
  if (priority !== 'all') {
    filtered = filtered.filter(i => i.priority === priority);
  }
  if (readFilter === 'unread') {
    filtered = filtered.filter(i => !i.read);
  } else if (readFilter === 'read') {
    filtered = filtered.filter(i => i.read);
  }
  return filtered;
}

function filterWorklist(
  patients: WorklistPatient[],
  filter: WorklistFilter
): WorklistPatient[] {
  return patients.filter(patient => {
    if (filter === 'all') return true;
    if (filter === 'inpatient') return !!patient.room;
    if (filter === 'outpatient') return !!patient.appointmentTime;
    if (filter === 'critical') return patient.status === 'critical';
    return true;
  });
}

function sortWorklist(
  patients: WorklistPatient[],
  sort: WorklistSort,
  ascending: boolean
): WorklistPatient[] {
  const sorted = [...patients];
  sorted.sort((a, b) => {
    let cmp = 0;
    if (sort === 'name') cmp = a.name.localeCompare(b.name);
    else if (sort === 'location') cmp = (a.room || a.appointmentTime || '').localeCompare(b.room || b.appointmentTime || '');
    else if (sort === 'status') {
      const order: Record<string, number> = { critical: 0, 'in-progress': 1, roomed: 2, waiting: 3, 'ready-discharge': 4 };
      cmp = (order[a.status] || 5) - (order[b.status] || 5);
    }
    return ascending ? cmp : -cmp;
  });
  return sorted;
}

function computeInboxCounts(items: InboxItem[]) {
  return {
    all: items.filter(i => !i.read).length,
    results: items.filter(i => !i.read && (i.type === 'lab' || i.type === 'imaging')).length,
    messages: items.filter(i => !i.read && i.type === 'message').length,
    rxRefills: items.filter(i => !i.read && i.type === 'refill').length,
    orders: items.filter(i => !i.read && i.type === 'order').length,
    cosign: items.filter(i => !i.read && (i.type === 'cosign' || i.type === 'consult')).length,
  };
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

function togglePanel(expandedPanels: Record<string, boolean>, panel: string): Record<string, boolean> {
  return { ...expandedPanels, [panel]: !expandedPanels[panel] };
}

// ---- Test Data ----

const testPatients: Patient[] = [
  { id: 1, firstName: 'John', lastName: 'Smith', dateOfBirth: '1965-03-15', gender: 'MALE', mrn: 'MRN001234' },
  { id: 2, firstName: 'Sarah', lastName: 'Johnson', dateOfBirth: '1978-07-22', gender: 'FEMALE', mrn: 'MRN001235' },
  { id: 3, firstName: 'Michael', lastName: 'Williams', dateOfBirth: '1952-11-08', gender: 'MALE', mrn: 'MRN001236' },
  { id: 4, firstName: 'Emily', lastName: 'Brown', dateOfBirth: '1989-04-30', gender: 'FEMALE', mrn: 'MRN001237' },
  { id: 5, firstName: 'Robert', lastName: 'Davis', dateOfBirth: '1945-08-20', gender: 'MALE', mrn: 'MRN001238' },
  { id: 6, firstName: 'Maria', lastName: 'Martinez', dateOfBirth: '1970-12-05', gender: 'FEMALE', mrn: 'MRN001240' },
];

// ---- Tests ----

describe('Dashboard Data Mapping', () => {
  describe('mapPatientToWorklist', () => {
    test('should map patient name to "LastName, FirstName" format', () => {
      const result = mapPatientToWorklist(testPatients[0], 0);
      expect(result.name).toBe('Smith, John');
    });

    test('should map patient MRN correctly', () => {
      const result = mapPatientToWorklist(testPatients[0], 0);
      expect(result.mrn).toBe('MRN001234');
    });

    test('should calculate age from date of birth', () => {
      const result = mapPatientToWorklist(testPatients[0], 0);
      expect(result.age).toBeGreaterThan(50);
      expect(result.age).toBeLessThan(70);
    });

    test('should map gender correctly', () => {
      const male = mapPatientToWorklist(testPatients[0], 0);
      expect(male.gender).toBe('M');
      const female = mapPatientToWorklist(testPatients[1], 1);
      expect(female.gender).toBe('F');
    });

    test('should cycle through statuses based on index', () => {
      const statuses = testPatients.map((p, i) => mapPatientToWorklist(p, i).status);
      expect(statuses[0]).toBe('waiting');
      expect(statuses[1]).toBe('roomed');
      expect(statuses[2]).toBe('in-progress');
      expect(statuses[3]).toBe('ready-discharge');
      expect(statuses[4]).toBe('critical');
    });

    test('should assign attending provider as Dr. Smith', () => {
      const result = mapPatientToWorklist(testPatients[0], 0);
      expect(result.attendingProvider).toBe('Dr. Smith');
    });

    test('should cycle through locations based on index', () => {
      const locations = testPatients.map((p, i) => mapPatientToWorklist(p, i).location);
      expect(locations[0]).toBe('Clinic 2B');
      expect(locations[1]).toBe('Med-Surg 4W');
      expect(locations[2]).toBe('CCU');
      expect(locations[3]).toBe('Med-Surg 3E');
    });

    test('should use patient id when available, otherwise index', () => {
      const withId = mapPatientToWorklist(testPatients[0], 0);
      expect(withId.id).toBe(1);
      const withoutId = mapPatientToWorklist({ ...testPatients[0], id: undefined }, 5);
      expect(withoutId.id).toBe(5);
    });

    test('should generate appointment times based on index', () => {
      const result0 = mapPatientToWorklist(testPatients[0], 0);
      expect(result0.appointmentTime).toBe('9:00 AM');
      const result1 = mapPatientToWorklist(testPatients[1], 1);
      expect(result1.appointmentTime).toBe('10:30 AM');
    });
  });

  describe('mapPatientToInbox', () => {
    test('should map patient name to "LastName, FirstName" format', () => {
      const result = mapPatientToInbox(testPatients[0], 0);
      expect(result.patientName).toBe('Smith, John');
    });

    test('should cycle through types based on index', () => {
      const types = testPatients.map((p, i) => mapPatientToInbox(p, i).type);
      expect(types[0]).toBe('lab');
      expect(types[1]).toBe('imaging');
      expect(types[2]).toBe('message');
      expect(types[3]).toBe('refill');
      expect(types[4]).toBe('order');
      expect(types[5]).toBe('cosign');
    });

    test('should cycle through priorities based on index', () => {
      const priorities = testPatients.map((p, i) => mapPatientToInbox(p, i).priority);
      expect(priorities[0]).toBe('critical');
      expect(priorities[1]).toBe('high');
      expect(priorities[2]).toBe('normal');
      expect(priorities[3]).toBe('low');
    });

    test('should mark items with index > 3 as read', () => {
      const items = testPatients.map((p, i) => mapPatientToInbox(p, i));
      expect(items[0].read).toBe(false);
      expect(items[3].read).toBe(false);
      expect(items[4].read).toBe(true);
      expect(items[5].read).toBe(true);
    });

    test('should flag items with index < 2', () => {
      const items = testPatients.map((p, i) => mapPatientToInbox(p, i));
      expect(items[0].flagged).toBe(true);
      expect(items[1].flagged).toBe(true);
      expect(items[2].flagged).toBe(false);
    });

    test('should generate title from type', () => {
      const result = mapPatientToInbox(testPatients[0], 0);
      expect(result.title).toBe('LAB Result');
    });

    test('should generate timestamp based on index', () => {
      const result = mapPatientToInbox(testPatients[0], 0);
      expect(result.timestamp).toBe('1 hr ago');
      const result2 = mapPatientToInbox(testPatients[2], 2);
      expect(result2.timestamp).toBe('3 hr ago');
    });
  });
});

describe('Inbox Filtering', () => {
  let inboxItems: InboxItem[];

  beforeEach(() => {
    inboxItems = testPatients.map((p, i) => mapPatientToInbox(p, i));
  });

  describe('Tab filtering', () => {
    test('should return all items when tab is "all"', () => {
      const result = filterInbox(inboxItems, 'all', 'all', 'all');
      expect(result.length).toBe(inboxItems.length);
    });

    test('should filter to lab and imaging results when tab is "results"', () => {
      const result = filterInbox(inboxItems, 'results', 'all', 'all');
      expect(result.every(i => i.type === 'lab' || i.type === 'imaging')).toBe(true);
      expect(result.length).toBe(2);
    });

    test('should filter to messages when tab is "messages"', () => {
      const result = filterInbox(inboxItems, 'messages', 'all', 'all');
      expect(result.every(i => i.type === 'message')).toBe(true);
      expect(result.length).toBe(1);
    });

    test('should filter to refills when tab is "rxRefills"', () => {
      const result = filterInbox(inboxItems, 'rxRefills', 'all', 'all');
      expect(result.every(i => i.type === 'refill')).toBe(true);
      expect(result.length).toBe(1);
    });

    test('should filter to orders when tab is "orders"', () => {
      const result = filterInbox(inboxItems, 'orders', 'all', 'all');
      expect(result.every(i => i.type === 'order')).toBe(true);
      expect(result.length).toBe(1);
    });

    test('should filter to cosign/consult when tab is "cosign"', () => {
      const result = filterInbox(inboxItems, 'cosign', 'all', 'all');
      expect(result.every(i => i.type === 'cosign' || i.type === 'consult')).toBe(true);
      expect(result.length).toBe(1);
    });
  });

  describe('Priority filtering', () => {
    test('should return all items when priority is "all"', () => {
      const result = filterInbox(inboxItems, 'all', 'all', 'all');
      expect(result.length).toBe(inboxItems.length);
    });

    test('should filter to critical items only', () => {
      const result = filterInbox(inboxItems, 'all', 'critical', 'all');
      expect(result.every(i => i.priority === 'critical')).toBe(true);
    });

    test('should filter to high priority items only', () => {
      const result = filterInbox(inboxItems, 'all', 'high', 'all');
      expect(result.every(i => i.priority === 'high')).toBe(true);
    });

    test('should filter to normal priority items only', () => {
      const result = filterInbox(inboxItems, 'all', 'normal', 'all');
      expect(result.every(i => i.priority === 'normal')).toBe(true);
    });
  });

  describe('Read status filtering', () => {
    test('should return all items when readFilter is "all"', () => {
      const result = filterInbox(inboxItems, 'all', 'all', 'all');
      expect(result.length).toBe(inboxItems.length);
    });

    test('should return only unread items', () => {
      const result = filterInbox(inboxItems, 'all', 'all', 'unread');
      expect(result.every(i => !i.read)).toBe(true);
      expect(result.length).toBe(4);
    });

    test('should return only read items', () => {
      const result = filterInbox(inboxItems, 'all', 'all', 'read');
      expect(result.every(i => i.read)).toBe(true);
      expect(result.length).toBe(2);
    });
  });

  describe('Combined filtering', () => {
    test('should apply tab and priority filters together', () => {
      const result = filterInbox(inboxItems, 'results', 'critical', 'all');
      expect(result.every(i => (i.type === 'lab' || i.type === 'imaging') && i.priority === 'critical')).toBe(true);
    });

    test('should apply tab, priority, and read filters together', () => {
      const result = filterInbox(inboxItems, 'all', 'critical', 'unread');
      expect(result.every(i => i.priority === 'critical' && !i.read)).toBe(true);
    });

    test('should return empty array when no items match all filters', () => {
      const result = filterInbox(inboxItems, 'messages', 'critical', 'read');
      expect(result.length).toBe(0);
    });
  });
});

describe('Inbox Counts', () => {
  test('should count unread items correctly', () => {
    const items = testPatients.map((p, i) => mapPatientToInbox(p, i));
    const counts = computeInboxCounts(items);
    expect(counts.all).toBe(4); // index 0-3 are unread
  });

  test('should count unread results (lab + imaging) correctly', () => {
    const items = testPatients.map((p, i) => mapPatientToInbox(p, i));
    const counts = computeInboxCounts(items);
    expect(counts.results).toBe(2); // lab (index 0) + imaging (index 1), both unread
  });

  test('should count unread messages correctly', () => {
    const items = testPatients.map((p, i) => mapPatientToInbox(p, i));
    const counts = computeInboxCounts(items);
    expect(counts.messages).toBe(1); // message (index 2), unread
  });

  test('should count unread rx refills correctly', () => {
    const items = testPatients.map((p, i) => mapPatientToInbox(p, i));
    const counts = computeInboxCounts(items);
    expect(counts.rxRefills).toBe(1); // refill (index 3), unread
  });

  test('should update counts when items are marked as read', () => {
    let items = testPatients.map((p, i) => mapPatientToInbox(p, i));
    items = markAsRead(items, 1); // mark first item as read
    const counts = computeInboxCounts(items);
    expect(counts.all).toBe(3);
    expect(counts.results).toBe(1);
  });

  test('should return zero counts when all items are read', () => {
    let items = testPatients.map((p, i) => mapPatientToInbox(p, i));
    items = markAllAsRead(items);
    const counts = computeInboxCounts(items);
    expect(counts.all).toBe(0);
    expect(counts.results).toBe(0);
    expect(counts.messages).toBe(0);
    expect(counts.rxRefills).toBe(0);
    expect(counts.orders).toBe(0);
    expect(counts.cosign).toBe(0);
  });
});

describe('Inbox Actions', () => {
  let inboxItems: InboxItem[];

  beforeEach(() => {
    inboxItems = testPatients.map((p, i) => mapPatientToInbox(p, i));
  });

  describe('markAsRead', () => {
    test('should mark a specific item as read', () => {
      const result = markAsRead(inboxItems, 1);
      expect(result.find(i => i.id === 1)?.read).toBe(true);
    });

    test('should not modify other items', () => {
      const result = markAsRead(inboxItems, 1);
      const otherItems = result.filter(i => i.id !== 1);
      otherItems.forEach((item) => {
        const original = inboxItems.find(i => i.id === item.id);
        expect(item.read).toBe(original?.read);
      });
    });

    test('should return new array (immutability)', () => {
      const result = markAsRead(inboxItems, 1);
      expect(result).not.toBe(inboxItems);
    });
  });

  describe('toggleFlag', () => {
    test('should toggle flag from true to false', () => {
      expect(inboxItems[0].flagged).toBe(true);
      const result = toggleFlag(inboxItems, 1);
      expect(result.find(i => i.id === 1)?.flagged).toBe(false);
    });

    test('should toggle flag from false to true', () => {
      expect(inboxItems[2].flagged).toBe(false);
      const result = toggleFlag(inboxItems, 3);
      expect(result.find(i => i.id === 3)?.flagged).toBe(true);
    });

    test('should not modify other items', () => {
      const result = toggleFlag(inboxItems, 1);
      const otherItems = result.filter(i => i.id !== 1);
      otherItems.forEach((item) => {
        const original = inboxItems.find(i => i.id === item.id);
        expect(item.flagged).toBe(original?.flagged);
      });
    });
  });

  describe('markAllAsRead', () => {
    test('should mark all items as read', () => {
      const result = markAllAsRead(inboxItems);
      expect(result.every(i => i.read)).toBe(true);
    });

    test('should preserve other properties', () => {
      const result = markAllAsRead(inboxItems);
      result.forEach((item, idx) => {
        expect(item.id).toBe(inboxItems[idx].id);
        expect(item.type).toBe(inboxItems[idx].type);
        expect(item.priority).toBe(inboxItems[idx].priority);
        expect(item.flagged).toBe(inboxItems[idx].flagged);
      });
    });
  });
});

describe('Worklist Filtering', () => {
  let worklistPatients: WorklistPatient[];

  beforeEach(() => {
    worklistPatients = testPatients.map((p, i) => mapPatientToWorklist(p, i));
  });

  test('should return all patients when filter is "all"', () => {
    const result = filterWorklist(worklistPatients, 'all');
    expect(result.length).toBe(worklistPatients.length);
  });

  test('should filter to inpatient (patients with room)', () => {
    // Add rooms to some patients
    worklistPatients[0].room = '201A';
    worklistPatients[2].room = '305B';
    const result = filterWorklist(worklistPatients, 'inpatient');
    expect(result.length).toBe(2);
    expect(result.every(p => !!p.room)).toBe(true);
  });

  test('should filter to outpatient (patients with appointmentTime)', () => {
    const result = filterWorklist(worklistPatients, 'outpatient');
    expect(result.every(p => !!p.appointmentTime)).toBe(true);
  });

  test('should filter to critical status patients', () => {
    const result = filterWorklist(worklistPatients, 'critical');
    expect(result.every(p => p.status === 'critical')).toBe(true);
    expect(result.length).toBe(1); // only index 4 is critical
  });
});

describe('Worklist Sorting', () => {
  let worklistPatients: WorklistPatient[];

  beforeEach(() => {
    worklistPatients = testPatients.map((p, i) => mapPatientToWorklist(p, i));
  });

  test('should sort by name ascending', () => {
    const result = sortWorklist(worklistPatients, 'name', true);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].name.localeCompare(result[i].name)).toBeLessThanOrEqual(0);
    }
  });

  test('should sort by name descending', () => {
    const result = sortWorklist(worklistPatients, 'name', false);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].name.localeCompare(result[i].name)).toBeGreaterThanOrEqual(0);
    }
  });

  test('should sort by status ascending', () => {
    const result = sortWorklist(worklistPatients, 'status', true);
    // Verify that all patients are present
    expect(result.length).toBe(worklistPatients.length);
    // 'in-progress' (order 1) should come before 'waiting' (order 3)
    const ipIdx = result.findIndex(p => p.status === 'in-progress');
    const waitIdx = result.findIndex(p => p.status === 'waiting');
    expect(ipIdx).toBeLessThan(waitIdx);
  });

  test('should sort by status descending', () => {
    const result = sortWorklist(worklistPatients, 'status', false);
    // 'waiting' should come before 'in-progress' in descending
    const waitIdx = result.findIndex(p => p.status === 'waiting');
    const ipIdx = result.findIndex(p => p.status === 'in-progress');
    expect(waitIdx).toBeLessThan(ipIdx);
  });

  test('should not mutate original array', () => {
    const originalOrder = worklistPatients.map(p => p.id);
    sortWorklist(worklistPatients, 'name', true);
    expect(worklistPatients.map(p => p.id)).toEqual(originalOrder);
  });
});

describe('Panel Expand/Collapse', () => {
  test('should toggle panel from expanded to collapsed', () => {
    const panels = { inbox: true, worklist: true };
    const result = togglePanel(panels, 'inbox');
    expect(result.inbox).toBe(false);
    expect(result.worklist).toBe(true);
  });

  test('should toggle panel from collapsed to expanded', () => {
    const panels = { inbox: false, worklist: true };
    const result = togglePanel(panels, 'inbox');
    expect(result.inbox).toBe(true);
  });

  test('should not mutate original object', () => {
    const panels = { inbox: true, worklist: true };
    const result = togglePanel(panels, 'inbox');
    expect(panels.inbox).toBe(true); // original unchanged
    expect(result).not.toBe(panels);
  });

  test('should handle multiple panels independently', () => {
    let panels: Record<string, boolean> = { inbox: true, worklist: true, unsigned: true, orders: true };
    panels = togglePanel(panels, 'inbox');
    panels = togglePanel(panels, 'worklist');
    expect(panels.inbox).toBe(false);
    expect(panels.worklist).toBe(false);
    expect(panels.unsigned).toBe(true);
    expect(panels.orders).toBe(true);
  });

  test('should add new panel key if not present', () => {
    const panels: Record<string, boolean> = { inbox: true };
    const result = togglePanel(panels, 'newPanel');
    expect(result.newPanel).toBe(true); // undefined becomes true (toggled from falsy)
  });
});
