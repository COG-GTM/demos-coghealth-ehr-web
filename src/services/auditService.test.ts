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

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

beforeEach(() => {
  mockLocalStorage.clear();
  mockSessionStorage.clear();
  jest.clearAllMocks();
});

describe('auditService', () => {
  describe('logAuditEvent', () => {
    it('creates an audit event with required fields', () => {
      logAuditEvent('LOGIN');
      const log = getAuditLog();

      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({
        eventType: 'LOGIN',
        userId: 'USR001',
        userName: 'Dr. Sarah Anderson',
        userRole: 'Physician',
        success: true,
      });
      expect(log[0].id).toBeDefined();
      expect(log[0].timestamp).toBeDefined();
      expect(log[0].sessionId).toBeDefined();
    });

    it('includes optional fields when provided', () => {
      logAuditEvent('PATIENT_ACCESS', {
        patientId: 'P001',
        patientMrn: 'MRN001',
        patientName: 'John Smith',
        resourceType: 'chart',
        resourceId: 'R001',
        action: 'Opened chart',
        details: 'Full chart view',
        success: false,
      });

      const log = getAuditLog();
      expect(log[0]).toMatchObject({
        eventType: 'PATIENT_ACCESS',
        patientId: 'P001',
        patientMrn: 'MRN001',
        patientName: 'John Smith',
        resourceType: 'chart',
        resourceId: 'R001',
        action: 'Opened chart',
        details: 'Full chart view',
        success: false,
      });
    });

    it('prepends new events to the beginning of the log', () => {
      logAuditEvent('LOGIN');
      logAuditEvent('LOGOUT');

      const log = getAuditLog();
      expect(log).toHaveLength(2);
      expect(log[0].eventType).toBe('LOGOUT');
      expect(log[1].eventType).toBe('LOGIN');
    });

    it('limits log to MAX_LOG_ENTRIES (1000)', () => {
      for (let i = 0; i < 1005; i++) {
        logAuditEvent('LOGIN');
      }
      const log = getAuditLog();
      expect(log).toHaveLength(1000);
    });
  });

  describe('getAuditLog', () => {
    it('returns empty array when no log exists', () => {
      expect(getAuditLog()).toEqual([]);
    });

    it('returns empty array when localStorage has invalid JSON', () => {
      mockLocalStorage.setItem('coghealth_audit_log', 'invalid-json');
      expect(getAuditLog()).toEqual([]);
    });
  });

  describe('clearAuditLog', () => {
    it('removes the audit log from localStorage', () => {
      logAuditEvent('LOGIN');
      expect(getAuditLog()).toHaveLength(1);

      clearAuditLog();
      expect(getAuditLog()).toEqual([]);
    });
  });

  describe('getPatientAccessLog', () => {
    it('filters events by patient ID and PATIENT_ACCESS type', () => {
      logAuditEvent('PATIENT_ACCESS', { patientId: 'P001' });
      logAuditEvent('PHI_VIEW', { patientId: 'P001' });
      logAuditEvent('PATIENT_ACCESS', { patientId: 'P002' });

      const accessLog = getPatientAccessLog('P001');
      expect(accessLog).toHaveLength(1);
      expect(accessLog[0].patientId).toBe('P001');
      expect(accessLog[0].eventType).toBe('PATIENT_ACCESS');
    });

    it('returns empty array when no matching events exist', () => {
      expect(getPatientAccessLog('P999')).toEqual([]);
    });
  });

  describe('convenience logging functions', () => {
    it('logPatientAccess creates a PATIENT_ACCESS event', () => {
      logPatientAccess('P001', 'MRN001', 'John Smith');
      const log = getAuditLog();

      expect(log[0]).toMatchObject({
        eventType: 'PATIENT_ACCESS',
        patientId: 'P001',
        patientMrn: 'MRN001',
        patientName: 'John Smith',
        action: 'Opened patient chart',
      });
    });

    it('logPatientSearch creates a PATIENT_SEARCH event with query details', () => {
      logPatientSearch('smith', 3);
      const log = getAuditLog();

      expect(log[0]).toMatchObject({
        eventType: 'PATIENT_SEARCH',
        action: 'Patient search',
        details: 'Query: "smith" - 3 results',
      });
    });

    it('logPHIView creates a PHI_VIEW event', () => {
      logPHIView('P001', 'lab_result', 'LR001');
      const log = getAuditLog();

      expect(log[0]).toMatchObject({
        eventType: 'PHI_VIEW',
        patientId: 'P001',
        resourceType: 'lab_result',
        resourceId: 'LR001',
        action: 'Viewed lab_result',
      });
    });

    it('logPrint creates a PHI_PRINT event', () => {
      logPrint('P001', 'Chart Summary');
      const log = getAuditLog();

      expect(log[0]).toMatchObject({
        eventType: 'PHI_PRINT',
        patientId: 'P001',
        resourceType: 'Chart Summary',
        action: 'Print initiated',
      });
    });

    it('logPrint works without optional params', () => {
      logPrint();
      const log = getAuditLog();
      expect(log[0].eventType).toBe('PHI_PRINT');
    });

    it('logPrescription creates a PRESCRIPTION_CREATE event', () => {
      logPrescription('P001', 'Lisinopril 10mg');
      const log = getAuditLog();

      expect(log[0]).toMatchObject({
        eventType: 'PRESCRIPTION_CREATE',
        patientId: 'P001',
        action: 'Prescription created',
        details: 'Lisinopril 10mg',
      });
    });

    it('logOrder creates an ORDER_CREATE event', () => {
      logOrder('P001', 'Lab', 'CBC with differential');
      const log = getAuditLog();

      expect(log[0]).toMatchObject({
        eventType: 'ORDER_CREATE',
        patientId: 'P001',
        resourceType: 'Lab',
        action: 'Order created',
        details: 'CBC with differential',
      });
    });

    it('logLogout creates a LOGOUT event for manual logout', () => {
      logLogout('manual');
      const log = getAuditLog();

      expect(log[0]).toMatchObject({
        eventType: 'LOGOUT',
        action: 'User logged out',
      });
    });

    it('logLogout creates a SESSION_TIMEOUT event for timeout', () => {
      logLogout('timeout');
      const log = getAuditLog();

      expect(log[0]).toMatchObject({
        eventType: 'SESSION_TIMEOUT',
        action: 'Session timed out',
      });
    });

    it('logLogout defaults to manual', () => {
      logLogout();
      const log = getAuditLog();
      expect(log[0].eventType).toBe('LOGOUT');
    });
  });

  describe('session management', () => {
    it('generates and persists a session ID', () => {
      logAuditEvent('LOGIN');
      const log = getAuditLog();
      const sessionId = log[0].sessionId;

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');

      logAuditEvent('PATIENT_ACCESS');
      const log2 = getAuditLog();
      expect(log2[0].sessionId).toBe(sessionId);
    });
  });
});
