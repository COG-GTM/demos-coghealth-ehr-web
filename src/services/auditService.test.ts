import {
  logAuditEvent,
  getAuditLog,
  clearAuditLog,
  getPatientAccessLog,
  logPatientAccess,
  logPatientSearch,
  logPHIView,
  logPrint,
  logPrescription,
  logOrder,
  logLogout,
} from './auditService';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  sessionStorageMock.clear();
  jest.clearAllMocks();
});

describe('auditService', () => {
  describe('logAuditEvent', () => {
    it('creates an event and stores it in localStorage', () => {
      logAuditEvent('LOGIN');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'coghealth_audit_log',
        expect.any(String)
      );
      const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(stored).toHaveLength(1);
      expect(stored[0].eventType).toBe('LOGIN');
      expect(stored[0].userId).toBe('USR001');
      expect(stored[0].userName).toBe('Dr. Sarah Anderson');
      expect(stored[0].success).toBe(true);
    });

    it('stores optional fields when provided', () => {
      logAuditEvent('PATIENT_ACCESS', {
        patientId: 'P1',
        patientMrn: 'MRN001',
        patientName: 'Smith, John',
        action: 'Opened chart',
        success: false,
      });
      const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(stored[0].patientId).toBe('P1');
      expect(stored[0].patientMrn).toBe('MRN001');
      expect(stored[0].success).toBe(false);
    });
  });

  describe('getAuditLog', () => {
    it('returns parsed events from localStorage', () => {
      const events = [{ id: '1', eventType: 'LOGIN', timestamp: new Date().toISOString() }];
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(events));
      const result = getAuditLog();
      expect(result).toEqual(events);
    });

    it('returns empty array when no log exists', () => {
      localStorageMock.getItem.mockReturnValueOnce(null as unknown as string);
      expect(getAuditLog()).toEqual([]);
    });

    it('handles corrupted localStorage gracefully (returns [])', () => {
      localStorageMock.getItem.mockReturnValueOnce('not valid json{{{');
      expect(getAuditLog()).toEqual([]);
    });
  });

  describe('clearAuditLog', () => {
    it('removes the key from localStorage', () => {
      clearAuditLog();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('coghealth_audit_log');
    });
  });

  describe('getPatientAccessLog', () => {
    it('filters by patientId and PATIENT_ACCESS type', () => {
      const events = [
        { id: '1', eventType: 'PATIENT_ACCESS', patientId: 'P1' },
        { id: '2', eventType: 'PATIENT_ACCESS', patientId: 'P2' },
        { id: '3', eventType: 'LOGIN', patientId: 'P1' },
      ];
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(events));
      const result = getPatientAccessLog('P1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('logPatientAccess', () => {
    it('creates a PATIENT_ACCESS event with correct fields', () => {
      logPatientAccess('P1', 'MRN001', 'Smith, John');
      const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(stored[0].eventType).toBe('PATIENT_ACCESS');
      expect(stored[0].patientId).toBe('P1');
      expect(stored[0].patientMrn).toBe('MRN001');
      expect(stored[0].patientName).toBe('Smith, John');
      expect(stored[0].action).toBe('Opened patient chart');
    });
  });

  describe('logPatientSearch', () => {
    it('creates a PATIENT_SEARCH event with query details', () => {
      logPatientSearch('smith', 5);
      const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(stored[0].eventType).toBe('PATIENT_SEARCH');
      expect(stored[0].details).toBe('Query: "smith" - 5 results');
    });
  });

  describe('logPHIView', () => {
    it('creates a PHI_VIEW event', () => {
      logPHIView('P1', 'Lab', 'L1');
      const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(stored[0].eventType).toBe('PHI_VIEW');
      expect(stored[0].patientId).toBe('P1');
      expect(stored[0].resourceType).toBe('Lab');
    });
  });

  describe('logPrint', () => {
    it('creates a PHI_PRINT event', () => {
      logPrint('P1', 'Summary');
      const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(stored[0].eventType).toBe('PHI_PRINT');
      expect(stored[0].action).toBe('Print initiated');
    });
  });

  describe('logPrescription', () => {
    it('creates a PRESCRIPTION_CREATE event', () => {
      logPrescription('P1', 'Metformin');
      const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(stored[0].eventType).toBe('PRESCRIPTION_CREATE');
      expect(stored[0].details).toBe('Metformin');
    });
  });

  describe('logOrder', () => {
    it('creates an ORDER_CREATE event', () => {
      logOrder('P1', 'Lab', 'BMP Panel');
      const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(stored[0].eventType).toBe('ORDER_CREATE');
      expect(stored[0].resourceType).toBe('Lab');
      expect(stored[0].details).toBe('BMP Panel');
    });
  });

  describe('logLogout', () => {
    it('creates a LOGOUT event for manual logout', () => {
      logLogout('manual');
      const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(stored[0].eventType).toBe('LOGOUT');
      expect(stored[0].action).toBe('User logged out');
    });

    it('creates a SESSION_TIMEOUT event for timeout', () => {
      logLogout('timeout');
      const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(stored[0].eventType).toBe('SESSION_TIMEOUT');
      expect(stored[0].action).toBe('Session timed out');
    });
  });

  describe('log truncation', () => {
    it('truncates at MAX_LOG_ENTRIES (1000)', () => {
      const bigLog = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        eventType: 'LOGIN',
        timestamp: new Date().toISOString(),
      }));
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(bigLog));

      logAuditEvent('LOGIN');

      const stored = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(stored).toHaveLength(1000);
      expect(stored[0].eventType).toBe('LOGIN');
    });
  });
});
