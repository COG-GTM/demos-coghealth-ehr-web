/**
 * Unit tests for Dashboard logic
 * Tests filtering, sorting, mapping, and state management functions
 * extracted from DashboardPage.tsx
 */

// ============================================================
// Types (mirroring DashboardPage.tsx interfaces)
// ============================================================

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

// ============================================================
// Pure functions extracted from DashboardPage for testing
// ============================================================

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

function filterAndSortWorklist(
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

function getStatusStyle(status: string): string {
  switch (status) {
    case 'critical': return 'bg-red-50 text-red-700 border border-red-200';
    case 'waiting': return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'roomed': return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'in-progress': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'ready-discharge': return 'bg-purple-50 text-purple-700 border border-purple-200';
    default: return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
}

function getFlagStyle(flag: string): { label: string; bg: string; color: string } {
  switch (flag) {
    case 'fall-risk': return { label: 'FALL', bg: 'bg-amber-50', color: 'text-amber-700' };
    case 'isolation': return { label: 'ISO', bg: 'bg-blue-50', color: 'text-blue-700' };
    case 'npo': return { label: 'NPO', bg: 'bg-orange-50', color: 'text-orange-700' };
    case 'allergy': return { label: 'ALLERGY', bg: 'bg-red-50', color: 'text-red-700' };
    case 'code-status': return { label: 'DNR', bg: 'bg-gray-100', color: 'text-gray-700' };
    case 'vip': return { label: 'VIP', bg: 'bg-purple-50', color: 'text-purple-700' };
    default: return { label: flag, bg: 'bg-gray-50', color: 'text-gray-600' };
  }
}

function getPriorityStyle(priority: string): string {
  switch (priority) {
    case 'critical': return 'text-red-500';
    case 'high': return 'text-amber-500';
    case 'normal': return 'text-emerald-500';
    case 'low': return 'text-gray-400';
    default: return 'text-gray-400';
  }
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

function togglePanel(panels: Record<string, boolean>, panel: string): Record<string, boolean> {
  return { ...panels, [panel]: !panels[panel] };
}

// ============================================================
// Test Data Fixtures
// ============================================================

function createInboxItems(): InboxItem[] {
  return [
    { id: 1, type: 'lab', priority: 'critical', patientName: 'Smith, John', patientMrn: 'MRN001', title: 'CBC Results', detail: 'Critical value', timestamp: '1 hr ago', read: false, flagged: true },
    { id: 2, type: 'imaging', priority: 'high', patientName: 'Johnson, Sarah', patientMrn: 'MRN002', title: 'CT Scan', detail: 'Abnormal finding', timestamp: '2 hr ago', read: false, flagged: true },
    { id: 3, type: 'message', priority: 'normal', patientName: 'Williams, Mike', patientMrn: 'MRN003', title: 'Patient Message', detail: 'Follow up question', timestamp: '3 hr ago', read: false, flagged: false },
    { id: 4, type: 'refill', priority: 'normal', patientName: 'Brown, Emily', patientMrn: 'MRN004', title: 'Rx Refill', detail: 'Lisinopril 10mg', timestamp: '4 hr ago', read: false, flagged: false },
    { id: 5, type: 'order', priority: 'high', patientName: 'Davis, Robert', patientMrn: 'MRN005', title: 'Lab Order', detail: 'BMP pending', timestamp: '5 hr ago', read: true, flagged: false },
    { id: 6, type: 'cosign', priority: 'normal', patientName: 'Martinez, Maria', patientMrn: 'MRN006', title: 'Co-Sign Note', detail: 'Progress note', timestamp: '6 hr ago', read: true, flagged: false },
    { id: 7, type: 'consult', priority: 'low', patientName: 'Taylor, James', patientMrn: 'MRN007', title: 'Consult Request', detail: 'Cardiology consult', timestamp: '7 hr ago', read: true, flagged: false },
    { id: 8, type: 'lab', priority: 'normal', patientName: 'Anderson, Lisa', patientMrn: 'MRN008', title: 'Lipid Panel', detail: 'Normal results', timestamp: '8 hr ago', read: true, flagged: false },
  ];
}

function createWorklistPatients(): WorklistPatient[] {
  return [
    { id: 1, name: 'Smith, John', mrn: 'MRN001', age: 65, gender: 'M', room: '304B', location: 'Med-Surg 3E', chiefComplaint: 'Chest pain', admitDate: '01/15/2024', attendingProvider: 'Dr. Smith', status: 'critical', alerts: ['Fall risk'], flags: ['fall-risk'], lastVitals: { bp: '180/95', hr: 110, temp: 101.2, spo2: 92, rr: 22 } },
    { id: 2, name: 'Johnson, Sarah', mrn: 'MRN002', age: 45, gender: 'F', appointmentTime: '10:30 AM', location: 'Clinic 2B', chiefComplaint: 'Follow-up visit', attendingProvider: 'Dr. Anderson', status: 'waiting', alerts: [], flags: [] },
    { id: 3, name: 'Williams, Mike', mrn: 'MRN003', age: 72, gender: 'M', room: '512A', location: 'CCU', chiefComplaint: 'Heart failure', admitDate: '01/16/2024', attendingProvider: 'Dr. Smith', status: 'in-progress', alerts: ['Isolation'], flags: ['isolation', 'npo'] },
    { id: 4, name: 'Brown, Emily', mrn: 'MRN004', age: 35, gender: 'F', appointmentTime: '11:00 AM', location: 'Clinic 2B', chiefComplaint: 'Annual exam', attendingProvider: 'Dr. Anderson', status: 'roomed', alerts: [], flags: ['allergy'] },
    { id: 5, name: 'Davis, Robert', mrn: 'MRN005', age: 80, gender: 'M', room: '218C', location: 'Med-Surg 4W', chiefComplaint: 'Pneumonia', admitDate: '01/17/2024', attendingProvider: 'Dr. Smith', status: 'ready-discharge', alerts: [], flags: ['fall-risk', 'code-status'] },
    { id: 6, name: 'Martinez, Maria', mrn: 'MRN006', age: 55, gender: 'F', appointmentTime: '2:00 PM', location: 'Clinic 2B', chiefComplaint: 'Diabetes management', attendingProvider: 'Dr. Anderson', status: 'waiting', alerts: [], flags: ['vip'] },
  ];
}

// ============================================================
// Tests
// ============================================================

describe('Dashboard Unit Tests', () => {

  // --------------------------------------------------------
  // Inbox Filtering
  // --------------------------------------------------------
  describe('Inbox Filtering', () => {
    let items: InboxItem[];

    beforeEach(() => {
      items = createInboxItems();
    });

    test('should return all items when no filters applied', () => {
      const result = filterInbox(items, 'all', 'all', 'all');
      expect(result).toHaveLength(8);
    });

    test('should filter by results tab (lab + imaging)', () => {
      const result = filterInbox(items, 'results', 'all', 'all');
      expect(result.every(i => i.type === 'lab' || i.type === 'imaging')).toBe(true);
      expect(result).toHaveLength(3); // 2 lab + 1 imaging
    });

    test('should filter by messages tab', () => {
      const result = filterInbox(items, 'messages', 'all', 'all');
      expect(result.every(i => i.type === 'message')).toBe(true);
      expect(result).toHaveLength(1);
    });

    test('should filter by rxRefills tab', () => {
      const result = filterInbox(items, 'rxRefills', 'all', 'all');
      expect(result.every(i => i.type === 'refill')).toBe(true);
      expect(result).toHaveLength(1);
    });

    test('should filter by orders tab', () => {
      const result = filterInbox(items, 'orders', 'all', 'all');
      expect(result.every(i => i.type === 'order')).toBe(true);
      expect(result).toHaveLength(1);
    });

    test('should filter by cosign tab (cosign + consult)', () => {
      const result = filterInbox(items, 'cosign', 'all', 'all');
      expect(result.every(i => i.type === 'cosign' || i.type === 'consult')).toBe(true);
      expect(result).toHaveLength(2);
    });

    test('should filter by critical priority', () => {
      const result = filterInbox(items, 'all', 'critical', 'all');
      expect(result.every(i => i.priority === 'critical')).toBe(true);
      expect(result).toHaveLength(1);
    });

    test('should filter by high priority', () => {
      const result = filterInbox(items, 'all', 'high', 'all');
      expect(result.every(i => i.priority === 'high')).toBe(true);
      expect(result).toHaveLength(2);
    });

    test('should filter by normal priority', () => {
      const result = filterInbox(items, 'all', 'normal', 'all');
      expect(result.every(i => i.priority === 'normal')).toBe(true);
      expect(result).toHaveLength(4);
    });

    test('should filter by unread status', () => {
      const result = filterInbox(items, 'all', 'all', 'unread');
      expect(result.every(i => !i.read)).toBe(true);
      expect(result).toHaveLength(4);
    });

    test('should filter by read status', () => {
      const result = filterInbox(items, 'all', 'all', 'read');
      expect(result.every(i => i.read)).toBe(true);
      expect(result).toHaveLength(4);
    });

    test('should combine tab and priority filters', () => {
      const result = filterInbox(items, 'results', 'critical', 'all');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('lab');
      expect(result[0].priority).toBe('critical');
    });

    test('should combine tab, priority, and read filters', () => {
      const result = filterInbox(items, 'results', 'all', 'unread');
      expect(result).toHaveLength(2); // lab critical unread + imaging high unread
      expect(result.every(i => (i.type === 'lab' || i.type === 'imaging') && !i.read)).toBe(true);
    });

    test('should return empty when no items match combined filters', () => {
      const result = filterInbox(items, 'messages', 'critical', 'all');
      expect(result).toHaveLength(0);
    });
  });

  // --------------------------------------------------------
  // Inbox Counts
  // --------------------------------------------------------
  describe('Inbox Counts', () => {
    test('should compute correct unread counts', () => {
      const items = createInboxItems();
      const counts = computeInboxCounts(items);
      expect(counts.all).toBe(4); // 4 unread items
      expect(counts.results).toBe(2); // lab + imaging unread
      expect(counts.messages).toBe(1); // 1 message unread
      expect(counts.rxRefills).toBe(1); // 1 refill unread
      expect(counts.orders).toBe(0); // order is read
      expect(counts.cosign).toBe(0); // cosign/consult are read
    });

    test('should return all zeros when all items read', () => {
      const items = createInboxItems().map(i => ({ ...i, read: true }));
      const counts = computeInboxCounts(items);
      expect(counts.all).toBe(0);
      expect(counts.results).toBe(0);
      expect(counts.messages).toBe(0);
      expect(counts.rxRefills).toBe(0);
      expect(counts.orders).toBe(0);
      expect(counts.cosign).toBe(0);
    });

    test('should count all when none read', () => {
      const items = createInboxItems().map(i => ({ ...i, read: false }));
      const counts = computeInboxCounts(items);
      expect(counts.all).toBe(8);
    });

    test('should handle empty inbox', () => {
      const counts = computeInboxCounts([]);
      expect(counts.all).toBe(0);
      expect(counts.results).toBe(0);
    });
  });

  // --------------------------------------------------------
  // Worklist Filtering & Sorting
  // --------------------------------------------------------
  describe('Worklist Filtering & Sorting', () => {
    let patients: WorklistPatient[];

    beforeEach(() => {
      patients = createWorklistPatients();
    });

    test('should return all patients when filter is all', () => {
      const result = filterAndSortWorklist(patients, 'all', 'status', true);
      expect(result).toHaveLength(6);
    });

    test('should filter inpatient (has room)', () => {
      const result = filterAndSortWorklist(patients, 'inpatient', 'status', true);
      expect(result.every(p => !!p.room)).toBe(true);
      expect(result).toHaveLength(3); // Smith, Williams, Davis
    });

    test('should filter outpatient (has appointmentTime)', () => {
      const result = filterAndSortWorklist(patients, 'outpatient', 'status', true);
      expect(result.every(p => !!p.appointmentTime)).toBe(true);
      expect(result).toHaveLength(3); // Johnson, Brown, Martinez
    });

    test('should filter critical patients', () => {
      const result = filterAndSortWorklist(patients, 'critical', 'status', true);
      expect(result.every(p => p.status === 'critical')).toBe(true);
      expect(result).toHaveLength(1); // Smith
    });

    test('should sort by name ascending', () => {
      const result = filterAndSortWorklist(patients, 'all', 'name', true);
      expect(result[0].name).toBe('Brown, Emily');
      expect(result[result.length - 1].name).toBe('Williams, Mike');
    });

    test('should sort by name descending', () => {
      const result = filterAndSortWorklist(patients, 'all', 'name', false);
      expect(result[0].name).toBe('Williams, Mike');
      expect(result[result.length - 1].name).toBe('Brown, Emily');
    });

    test('should sort by status (critical first ascending)', () => {
      const result = filterAndSortWorklist(patients, 'all', 'status', true);
      // Verify ordering: critical < in-progress < roomed < waiting < ready-discharge
      const statusOrder: Record<string, number> = { critical: 0, 'in-progress': 1, roomed: 2, waiting: 3, 'ready-discharge': 4 };
      for (let i = 1; i < result.length; i++) {
        expect((statusOrder[result[i].status] ?? 5)).toBeGreaterThanOrEqual(statusOrder[result[i-1].status] ?? 5);
      }
    });

    test('should sort by status descending (ready-discharge first)', () => {
      const result = filterAndSortWorklist(patients, 'all', 'status', false);
      // Verify descending ordering
      const statusOrder: Record<string, number> = { critical: 0, 'in-progress': 1, roomed: 2, waiting: 3, 'ready-discharge': 4 };
      for (let i = 1; i < result.length; i++) {
        expect((statusOrder[result[i].status] ?? 5)).toBeLessThanOrEqual(statusOrder[result[i-1].status] ?? 5);
      }
    });

    test('should handle empty worklist', () => {
      const result = filterAndSortWorklist([], 'all', 'status', true);
      expect(result).toHaveLength(0);
    });

    test('should combine filter and sort', () => {
      const result = filterAndSortWorklist(patients, 'inpatient', 'name', true);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Davis, Robert');
      expect(result[1].name).toBe('Smith, John');
      expect(result[2].name).toBe('Williams, Mike');
    });
  });

  // --------------------------------------------------------
  // Status & Style Functions
  // --------------------------------------------------------
  describe('Status Style Functions', () => {
    test('getStatusStyle returns correct classes for each status', () => {
      expect(getStatusStyle('critical')).toContain('bg-red-50');
      expect(getStatusStyle('critical')).toContain('text-red-700');
      expect(getStatusStyle('waiting')).toContain('bg-amber-50');
      expect(getStatusStyle('roomed')).toContain('bg-blue-50');
      expect(getStatusStyle('in-progress')).toContain('bg-emerald-50');
      expect(getStatusStyle('ready-discharge')).toContain('bg-purple-50');
      expect(getStatusStyle('unknown')).toContain('bg-gray-50');
    });

    test('getFlagStyle returns correct labels and colors', () => {
      expect(getFlagStyle('fall-risk')).toEqual({ label: 'FALL', bg: 'bg-amber-50', color: 'text-amber-700' });
      expect(getFlagStyle('isolation')).toEqual({ label: 'ISO', bg: 'bg-blue-50', color: 'text-blue-700' });
      expect(getFlagStyle('npo')).toEqual({ label: 'NPO', bg: 'bg-orange-50', color: 'text-orange-700' });
      expect(getFlagStyle('allergy')).toEqual({ label: 'ALLERGY', bg: 'bg-red-50', color: 'text-red-700' });
      expect(getFlagStyle('code-status')).toEqual({ label: 'DNR', bg: 'bg-gray-100', color: 'text-gray-700' });
      expect(getFlagStyle('vip')).toEqual({ label: 'VIP', bg: 'bg-purple-50', color: 'text-purple-700' });
      expect(getFlagStyle('custom-flag').label).toBe('custom-flag');
    });

    test('getPriorityStyle returns correct classes', () => {
      expect(getPriorityStyle('critical')).toBe('text-red-500');
      expect(getPriorityStyle('high')).toBe('text-amber-500');
      expect(getPriorityStyle('normal')).toBe('text-emerald-500');
      expect(getPriorityStyle('low')).toBe('text-gray-400');
      expect(getPriorityStyle('unknown')).toBe('text-gray-400');
    });
  });

  // --------------------------------------------------------
  // Inbox State Management
  // --------------------------------------------------------
  describe('Inbox State Management', () => {
    let items: InboxItem[];

    beforeEach(() => {
      items = createInboxItems();
    });

    test('markAsRead should mark specific item as read', () => {
      const result = markAsRead(items, 1);
      expect(result.find(i => i.id === 1)?.read).toBe(true);
      // Other items unchanged
      expect(result.find(i => i.id === 3)?.read).toBe(false);
    });

    test('markAsRead should not affect already-read items', () => {
      const result = markAsRead(items, 5); // item 5 already read
      expect(result.find(i => i.id === 5)?.read).toBe(true);
    });

    test('markAsRead with non-existent ID should not change any item', () => {
      const result = markAsRead(items, 999);
      expect(result).toEqual(items);
    });

    test('toggleFlag should toggle flagged state', () => {
      // Item 1 starts flagged=true
      const result1 = toggleFlag(items, 1);
      expect(result1.find(i => i.id === 1)?.flagged).toBe(false);

      // Toggle back
      const result2 = toggleFlag(result1, 1);
      expect(result2.find(i => i.id === 1)?.flagged).toBe(true);
    });

    test('toggleFlag should flag an unflagged item', () => {
      // Item 3 starts flagged=false
      const result = toggleFlag(items, 3);
      expect(result.find(i => i.id === 3)?.flagged).toBe(true);
    });

    test('markAllAsRead should mark all items as read', () => {
      const result = markAllAsRead(items);
      expect(result.every(i => i.read)).toBe(true);
    });

    test('markAllAsRead should not change other properties', () => {
      const result = markAllAsRead(items);
      expect(result[0].flagged).toBe(items[0].flagged);
      expect(result[0].patientName).toBe(items[0].patientName);
    });
  });

  // --------------------------------------------------------
  // Panel State Management
  // --------------------------------------------------------
  describe('Panel State Management', () => {
    test('togglePanel should expand a collapsed panel', () => {
      const panels = { inbox: true, worklist: true, unsigned: false, orders: true, schedule: true };
      const result = togglePanel(panels, 'unsigned');
      expect(result.unsigned).toBe(true);
    });

    test('togglePanel should collapse an expanded panel', () => {
      const panels = { inbox: true, worklist: true, unsigned: true, orders: true, schedule: true };
      const result = togglePanel(panels, 'inbox');
      expect(result.inbox).toBe(false);
    });

    test('togglePanel should not affect other panels', () => {
      const panels = { inbox: true, worklist: true, unsigned: true, orders: true, schedule: true };
      const result = togglePanel(panels, 'inbox');
      expect(result.worklist).toBe(true);
      expect(result.unsigned).toBe(true);
      expect(result.orders).toBe(true);
      expect(result.schedule).toBe(true);
    });

    test('togglePanel should handle new panel names', () => {
      const panels = { inbox: true };
      const result = togglePanel(panels, 'newPanel');
      expect(result.newPanel).toBe(true); // !undefined = true
    });
  });

  // --------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------
  describe('Edge Cases', () => {
    test('should handle inbox with single item', () => {
      const singleItem: InboxItem[] = [createInboxItems()[0]];
      const result = filterInbox(singleItem, 'all', 'all', 'all');
      expect(result).toHaveLength(1);
    });

    test('should handle worklist with all same status', () => {
      const patients = createWorklistPatients().map(p => ({ ...p, status: 'waiting' as const }));
      const result = filterAndSortWorklist(patients, 'all', 'status', true);
      expect(result).toHaveLength(6);
    });

    test('should handle worklist sort by location with mixed room/appointment', () => {
      const patients = createWorklistPatients();
      const result = filterAndSortWorklist(patients, 'all', 'location', true);
      expect(result).toHaveLength(6);
      // Should not throw
    });

    test('markAsRead should return new array (immutability)', () => {
      const original = createInboxItems();
      const result = markAsRead(original, 1);
      expect(result).not.toBe(original);
      expect(original.find(i => i.id === 1)?.read).toBe(false); // original unchanged
    });

    test('toggleFlag should return new array (immutability)', () => {
      const original = createInboxItems();
      const result = toggleFlag(original, 1);
      expect(result).not.toBe(original);
      expect(original.find(i => i.id === 1)?.flagged).toBe(true); // original unchanged
    });

    test('markAllAsRead should return new array (immutability)', () => {
      const original = createInboxItems();
      const result = markAllAsRead(original);
      expect(result).not.toBe(original);
    });
  });
});
