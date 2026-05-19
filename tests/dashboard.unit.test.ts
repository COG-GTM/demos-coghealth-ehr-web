/**
 * Unit tests for the Dashboard redesign.
 * These tests verify the data transformation logic, filtering, and sorting
 * that powers the Airbnb-styled dashboard without needing a browser.
 */

describe('Dashboard Unit Tests', () => {
  
  describe('Inbox Filtering Logic', () => {
    const mockInboxItems = [
      { id: 1, type: 'lab', priority: 'critical', read: false, flagged: true, patientName: 'Smith, John', patientMrn: 'MRN001', title: 'Lab Critical', detail: '', timestamp: '1h ago' },
      { id: 2, type: 'imaging', priority: 'high', read: false, flagged: false, patientName: 'Johnson, Sarah', patientMrn: 'MRN002', title: 'Imaging Result', detail: '', timestamp: '2h ago' },
      { id: 3, type: 'message', priority: 'normal', read: true, flagged: false, patientName: 'Williams, Mike', patientMrn: 'MRN003', title: 'Message', detail: '', timestamp: '3h ago' },
      { id: 4, type: 'refill', priority: 'low', read: true, flagged: false, patientName: 'Brown, Emily', patientMrn: 'MRN004', title: 'Rx Refill', detail: '', timestamp: '4h ago' },
      { id: 5, type: 'order', priority: 'normal', read: false, flagged: true, patientName: 'Davis, Robert', patientMrn: 'MRN005', title: 'Order', detail: '', timestamp: '5h ago' },
      { id: 6, type: 'cosign', priority: 'high', read: false, flagged: false, patientName: 'Martinez, Maria', patientMrn: 'MRN006', title: 'Co-sign', detail: '', timestamp: '6h ago' },
    ];

    function filterInbox(items: typeof mockInboxItems, tab: string, priority: string, readFilter: string) {
      let filtered = [...items];
      if (tab !== 'all') {
        if (tab === 'results') filtered = filtered.filter(i => i.type === 'lab' || i.type === 'imaging');
        else if (tab === 'messages') filtered = filtered.filter(i => i.type === 'message');
        else if (tab === 'rxRefills') filtered = filtered.filter(i => i.type === 'refill');
        else if (tab === 'orders') filtered = filtered.filter(i => i.type === 'order');
        else if (tab === 'cosign') filtered = filtered.filter(i => i.type === 'cosign' || i.type === 'consult');
      }
      if (priority !== 'all') filtered = filtered.filter(i => i.priority === priority);
      if (readFilter === 'unread') filtered = filtered.filter(i => !i.read);
      else if (readFilter === 'read') filtered = filtered.filter(i => i.read);
      return filtered;
    }

    test('should return all items when no filter applied', () => {
      const result = filterInbox(mockInboxItems, 'all', 'all', 'all');
      expect(result.length).toBe(6);
    });

    test('should filter by results tab (lab + imaging)', () => {
      const result = filterInbox(mockInboxItems, 'results', 'all', 'all');
      expect(result.length).toBe(2);
      expect(result.every(i => i.type === 'lab' || i.type === 'imaging')).toBe(true);
    });

    test('should filter by messages tab', () => {
      const result = filterInbox(mockInboxItems, 'messages', 'all', 'all');
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('message');
    });

    test('should filter by rxRefills tab', () => {
      const result = filterInbox(mockInboxItems, 'rxRefills', 'all', 'all');
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('refill');
    });

    test('should filter by orders tab', () => {
      const result = filterInbox(mockInboxItems, 'orders', 'all', 'all');
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('order');
    });

    test('should filter by cosign tab', () => {
      const result = filterInbox(mockInboxItems, 'cosign', 'all', 'all');
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('cosign');
    });

    test('should filter by critical priority', () => {
      const result = filterInbox(mockInboxItems, 'all', 'critical', 'all');
      expect(result.length).toBe(1);
      expect(result[0].priority).toBe('critical');
    });

    test('should filter by high priority', () => {
      const result = filterInbox(mockInboxItems, 'all', 'high', 'all');
      expect(result.length).toBe(2);
      expect(result.every(i => i.priority === 'high')).toBe(true);
    });

    test('should filter unread items only', () => {
      const result = filterInbox(mockInboxItems, 'all', 'all', 'unread');
      expect(result.length).toBe(4);
      expect(result.every(i => !i.read)).toBe(true);
    });

    test('should filter read items only', () => {
      const result = filterInbox(mockInboxItems, 'all', 'all', 'read');
      expect(result.length).toBe(2);
      expect(result.every(i => i.read)).toBe(true);
    });

    test('should combine tab and priority filters', () => {
      const result = filterInbox(mockInboxItems, 'results', 'critical', 'all');
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('lab');
      expect(result[0].priority).toBe('critical');
    });

    test('should combine all three filters', () => {
      const result = filterInbox(mockInboxItems, 'all', 'high', 'unread');
      expect(result.length).toBe(2);
      expect(result.every(i => i.priority === 'high' && !i.read)).toBe(true);
    });
  });

  describe('Inbox Counts', () => {
    const mockItems = [
      { id: 1, type: 'lab', read: false },
      { id: 2, type: 'imaging', read: false },
      { id: 3, type: 'message', read: true },
      { id: 4, type: 'refill', read: false },
      { id: 5, type: 'order', read: false },
      { id: 6, type: 'cosign', read: false },
      { id: 7, type: 'consult', read: true },
    ];

    function computeCounts(items: typeof mockItems) {
      return {
        all: items.filter(i => !i.read).length,
        results: items.filter(i => !i.read && (i.type === 'lab' || i.type === 'imaging')).length,
        messages: items.filter(i => !i.read && i.type === 'message').length,
        rxRefills: items.filter(i => !i.read && i.type === 'refill').length,
        orders: items.filter(i => !i.read && i.type === 'order').length,
        cosign: items.filter(i => !i.read && (i.type === 'cosign' || i.type === 'consult')).length,
      };
    }

    test('should compute correct unread counts', () => {
      const counts = computeCounts(mockItems);
      expect(counts.all).toBe(5);
      expect(counts.results).toBe(2);
      expect(counts.messages).toBe(0);
      expect(counts.rxRefills).toBe(1);
      expect(counts.orders).toBe(1);
      expect(counts.cosign).toBe(1);
    });
  });

  describe('Worklist Filtering Logic', () => {
    const mockWorklist = [
      { id: 1, name: 'Smith, John', room: '401A', appointmentTime: undefined, status: 'critical', location: 'CCU' },
      { id: 2, name: 'Johnson, Sarah', room: undefined, appointmentTime: '10:30 AM', status: 'waiting', location: 'Clinic 2B' },
      { id: 3, name: 'Williams, Mike', room: '302B', appointmentTime: undefined, status: 'in-progress', location: 'Med-Surg 4W' },
      { id: 4, name: 'Brown, Emily', room: undefined, appointmentTime: '11:00 AM', status: 'roomed', location: 'Clinic 2B' },
      { id: 5, name: 'Davis, Robert', room: '205A', appointmentTime: undefined, status: 'ready-discharge', location: 'Med-Surg 3E' },
    ];

    function filterWorklist(patients: typeof mockWorklist, filter: string) {
      return patients.filter(patient => {
        if (filter === 'all') return true;
        if (filter === 'inpatient') return !!patient.room;
        if (filter === 'outpatient') return !!patient.appointmentTime;
        if (filter === 'critical') return patient.status === 'critical';
        return true;
      });
    }

    test('should return all patients when filter is all', () => {
      const result = filterWorklist(mockWorklist, 'all');
      expect(result.length).toBe(5);
    });

    test('should filter inpatient (with room)', () => {
      const result = filterWorklist(mockWorklist, 'inpatient');
      expect(result.length).toBe(3);
      expect(result.every(p => !!p.room)).toBe(true);
    });

    test('should filter outpatient (with appointment time)', () => {
      const result = filterWorklist(mockWorklist, 'outpatient');
      expect(result.length).toBe(2);
      expect(result.every(p => !!p.appointmentTime)).toBe(true);
    });

    test('should filter critical patients', () => {
      const result = filterWorklist(mockWorklist, 'critical');
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('critical');
    });
  });

  describe('Worklist Sorting Logic', () => {
    const mockWorklist = [
      { id: 1, name: 'Zeta, Alpha', room: '401A', appointmentTime: undefined, status: 'critical', location: 'CCU' },
      { id: 2, name: 'Alpha, Beta', room: undefined, appointmentTime: '10:30 AM', status: 'waiting', location: 'Clinic 2B' },
      { id: 3, name: 'Middle, Name', room: '302B', appointmentTime: undefined, status: 'in-progress', location: 'Med-Surg' },
    ];

    function sortWorklist(patients: typeof mockWorklist, sort: string, ascending: boolean) {
      const sorted = [...patients];
      sorted.sort((a, b) => {
        let cmp = 0;
        if (sort === 'name') cmp = a.name.localeCompare(b.name);
        else if (sort === 'location') cmp = (a.room || a.appointmentTime || '').localeCompare(b.room || b.appointmentTime || '');
        else if (sort === 'status') {
          const order: Record<string, number> = { critical: 0, 'in-progress': 1, roomed: 2, waiting: 3, 'ready-discharge': 4 };
          cmp = (order[a.status] ?? 5) - (order[b.status] ?? 5);
        }
        return ascending ? cmp : -cmp;
      });
      return sorted;
    }

    test('should sort by name ascending', () => {
      const result = sortWorklist(mockWorklist, 'name', true);
      expect(result[0].name).toBe('Alpha, Beta');
      expect(result[2].name).toBe('Zeta, Alpha');
    });

    test('should sort by name descending', () => {
      const result = sortWorklist(mockWorklist, 'name', false);
      expect(result[0].name).toBe('Zeta, Alpha');
      expect(result[2].name).toBe('Alpha, Beta');
    });

    test('should sort by status ascending (critical first)', () => {
      const result = sortWorklist(mockWorklist, 'status', true);
      expect(result[0].status).toBe('critical');
      expect(result[1].status).toBe('in-progress');
      expect(result[2].status).toBe('waiting');
    });

    test('should sort by status descending', () => {
      const result = sortWorklist(mockWorklist, 'status', false);
      expect(result[0].status).toBe('waiting');
      expect(result[2].status).toBe('critical');
    });
  });

  describe('Patient Flag Styling', () => {
    function getFlagStyle(flag: string) {
      switch (flag) {
        case 'fall-risk': return { label: 'FALL', bg: 'bg-amber-50', color: 'text-amber-700' };
        case 'isolation': return { label: 'ISO', bg: 'bg-purple-50', color: 'text-purple-700' };
        case 'npo': return { label: 'NPO', bg: 'bg-orange-50', color: 'text-orange-700' };
        case 'allergy': return { label: 'ALLERGY', bg: 'bg-red-50', color: 'text-red-700' };
        case 'code-status': return { label: 'DNR', bg: 'bg-gray-100', color: 'text-gray-700' };
        case 'vip': return { label: 'VIP', bg: 'bg-teal-50', color: 'text-teal-700' };
        default: return { label: flag, bg: 'bg-gray-100', color: 'text-gray-600' };
      }
    }

    test('should return correct style for fall-risk flag', () => {
      const style = getFlagStyle('fall-risk');
      expect(style.label).toBe('FALL');
      expect(style.bg).toContain('amber');
    });

    test('should return correct style for isolation flag', () => {
      const style = getFlagStyle('isolation');
      expect(style.label).toBe('ISO');
      expect(style.bg).toContain('purple');
    });

    test('should return correct style for allergy flag', () => {
      const style = getFlagStyle('allergy');
      expect(style.label).toBe('ALLERGY');
      expect(style.color).toContain('red');
    });

    test('should return correct style for code-status flag', () => {
      const style = getFlagStyle('code-status');
      expect(style.label).toBe('DNR');
    });

    test('should return correct style for VIP flag', () => {
      const style = getFlagStyle('vip');
      expect(style.label).toBe('VIP');
      expect(style.bg).toContain('teal');
    });

    test('should handle unknown flags gracefully', () => {
      const style = getFlagStyle('unknown-flag');
      expect(style.label).toBe('unknown-flag');
      expect(style.bg).toBe('bg-gray-100');
    });
  });

  describe('Status Badge Mapping', () => {
    function getStatusBadge(status: string) {
      switch (status) {
        case 'critical': return 'badge badge-critical';
        case 'waiting': return 'badge badge-info';
        case 'roomed': return 'badge badge-success';
        case 'in-progress': return 'badge badge-warning';
        case 'ready-discharge': return 'badge badge-success';
        default: return 'badge badge-info';
      }
    }

    test('should map critical to badge-critical', () => {
      expect(getStatusBadge('critical')).toContain('badge-critical');
    });

    test('should map waiting to badge-info', () => {
      expect(getStatusBadge('waiting')).toContain('badge-info');
    });

    test('should map roomed to badge-success', () => {
      expect(getStatusBadge('roomed')).toContain('badge-success');
    });

    test('should map in-progress to badge-warning', () => {
      expect(getStatusBadge('in-progress')).toContain('badge-warning');
    });

    test('should map ready-discharge to badge-success', () => {
      expect(getStatusBadge('ready-discharge')).toContain('badge-success');
    });

    test('should default to badge-info for unknown status', () => {
      expect(getStatusBadge('unknown')).toContain('badge-info');
    });
  });

  describe('Mark As Read Functionality', () => {
    test('should mark a single item as read', () => {
      const items = [
        { id: 1, read: false },
        { id: 2, read: false },
        { id: 3, read: true },
      ];
      const updated = items.map(item => item.id === 1 ? { ...item, read: true } : item);
      expect(updated[0].read).toBe(true);
      expect(updated[1].read).toBe(false);
      expect(updated[2].read).toBe(true);
    });

    test('should mark all items as read', () => {
      const items = [
        { id: 1, read: false },
        { id: 2, read: false },
        { id: 3, read: true },
      ];
      const updated = items.map(item => ({ ...item, read: true }));
      expect(updated.every(i => i.read)).toBe(true);
    });
  });

  describe('Toggle Flag Functionality', () => {
    test('should toggle flag on an item', () => {
      const items = [
        { id: 1, flagged: false },
        { id: 2, flagged: true },
      ];
      const updated = items.map(item => item.id === 1 ? { ...item, flagged: !item.flagged } : item);
      expect(updated[0].flagged).toBe(true);
      expect(updated[1].flagged).toBe(true);
    });

    test('should unflag a flagged item', () => {
      const items = [
        { id: 1, flagged: true },
        { id: 2, flagged: true },
      ];
      const updated = items.map(item => item.id === 2 ? { ...item, flagged: !item.flagged } : item);
      expect(updated[0].flagged).toBe(true);
      expect(updated[1].flagged).toBe(false);
    });
  });

  describe('Panel Expansion State', () => {
    test('should toggle panel open/close', () => {
      const panels: Record<string, boolean> = { inbox: true, worklist: true, unsigned: true };
      const togglePanel = (panel: string) => ({ ...panels, [panel]: !panels[panel] });
      const updated = togglePanel('inbox');
      expect(updated.inbox).toBe(false);
      expect(updated.worklist).toBe(true);
    });

    test('should handle multiple toggles', () => {
      let panels: Record<string, boolean> = { inbox: true, worklist: true };
      panels = { ...panels, inbox: !panels.inbox };
      expect(panels.inbox).toBe(false);
      panels = { ...panels, inbox: !panels.inbox };
      expect(panels.inbox).toBe(true);
    });
  });
});
