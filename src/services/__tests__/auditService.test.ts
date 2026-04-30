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
} from '../auditService';

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

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  sessionStorageMock.clear();
  jest.clearAllMocks();
});

describe('auditService', () => {
  describe('logAuditEvent', () => {
    it('should create an audit event with default fields', () => {
      logAuditEvent('LOGIN');

      const log = getAuditLog();
      expect(log).toHaveLength(1);
      expect(log[0].eventType).toBe('LOGIN');
      expect(log[0].userId).toBe('USR001');
      expect(log[0].userName).toBe('Dr. Sarah Anderson');
      expect(log[0].userRole).toBe('Physician');
      expect(log[0].ipAddress).toBe('192.168.1.100');
      expect(log[0].success).toBe(true);
      expect(log[0].id).toBeDefined();
      expect(log[0].timestamp).toBeDefined();
      expect(log[0].sessionId).toBeDefined();
    });

    it('should include optional fields when provided', () => {
      logAuditEvent('PATIENT_ACCESS', {
        patientId: 'P001',
        patientMrn: 'MRN001',
        patientName: 'John Doe',
        resourceType: 'Chart',
        resourceId: 'R001',
        action: 'Opened chart',
        details: 'Full chart view',
        success: false,
      });

      const log = getAuditLog();
      expect(log[0].patientId).toBe('P001');
      expect(log[0].patientMrn).toBe('MRN001');
      expect(log[0].patientName).toBe('John Doe');
      expect(log[0].resourceType).toBe('Chart');
      expect(log[0].resourceId).toBe('R001');
      expect(log[0].action).toBe('Opened chart');
      expect(log[0].details).toBe('Full chart view');
      expect(log[0].success).toBe(false);
    });

    it('should prepend new events (most recent first)', () => {
      logAuditEvent('LOGIN');
      logAuditEvent('PATIENT_ACCESS');

      const log = getAuditLog();
      expect(log).toHaveLength(2);
      expect(log[0].eventType).toBe('PATIENT_ACCESS');
      expect(log[1].eventType).toBe('LOGIN');
    });

    it('should truncate log at MAX_LOG_ENTRIES (1000)', () => {
      for (let i = 0; i < 1005; i++) {
        logAuditEvent('LOGIN');
      }

      const log = getAuditLog();
      expect(log).toHaveLength(1000);
    });

    it('should persist session ID across calls', () => {
      logAuditEvent('LOGIN');
      logAuditEvent('LOGOUT');

      const log = getAuditLog();
      expect(log[0].sessionId).toBe(log[1].sessionId);
    });
  });

  describe('getAuditLog', () => {
    it('should return empty array when no events logged', () => {
      expect(getAuditLog()).toEqual([]);
    });

    it('should return empty array when localStorage contains invalid JSON', () => {
      localStorageMock.setItem('coghealth_audit_log', 'invalid-json');
      expect(getAuditLog()).toEqual([]);
    });
  });

  describe('clearAuditLog', () => {
    it('should remove all audit events', () => {
      logAuditEvent('LOGIN');
      expect(getAuditLog()).toHaveLength(1);

      clearAuditLog();
      expect(getAuditLog()).toEqual([]);
    });
  });

  describe('getPatientAccessLog', () => {
    it('should filter events by patient ID and PATIENT_ACCESS type', () => {
      logAuditEvent('PATIENT_ACCESS', { patientId: 'P001' });
      logAuditEvent('PATIENT_ACCESS', { patientId: 'P002' });
      logAuditEvent('PHI_VIEW', { patientId: 'P001' });

      const accessLog = getPatientAccessLog('P001');
      expect(accessLog).toHaveLength(1);
      expect(accessLog[0].patientId).toBe('P001');
      expect(accessLog[0].eventType).toBe('PATIENT_ACCESS');
    });

    it('should return empty array when no matching access events', () => {
      logAuditEvent('LOGIN');
      expect(getPatientAccessLog('P999')).toEqual([]);
    });
  });

  describe('convenience functions', () => {
    it('logPatientAccess should log PATIENT_ACCESS with patient details', () => {
      logPatientAccess('P001', 'MRN001', 'John Doe');

      const log = getAuditLog();
      expect(log[0].eventType).toBe('PATIENT_ACCESS');
      expect(log[0].patientId).toBe('P001');
      expect(log[0].patientMrn).toBe('MRN001');
      expect(log[0].patientName).toBe('John Doe');
      expect(log[0].action).toBe('Opened patient chart');
    });

    it('logPatientSearch should log PATIENT_SEARCH with query details', () => {
      logPatientSearch('Smith', 5);

      const log = getAuditLog();
      expect(log[0].eventType).toBe('PATIENT_SEARCH');
      expect(log[0].action).toBe('Patient search');
      expect(log[0].details).toBe('Query: "Smith" - 5 results');
    });

    it('logPHIView should log PHI_VIEW with resource info', () => {
      logPHIView('P001', 'LabResult', 'LR001');

      const log = getAuditLog();
      expect(log[0].eventType).toBe('PHI_VIEW');
      expect(log[0].patientId).toBe('P001');
      expect(log[0].resourceType).toBe('LabResult');
      expect(log[0].resourceId).toBe('LR001');
      expect(log[0].action).toBe('Viewed LabResult');
    });

    it('logPrint should log PHI_PRINT event', () => {
      logPrint('P001', 'Prescription');

      const log = getAuditLog();
      expect(log[0].eventType).toBe('PHI_PRINT');
      expect(log[0].patientId).toBe('P001');
      expect(log[0].resourceType).toBe('Prescription');
      expect(log[0].action).toBe('Print initiated');
    });

    it('logPrescription should log PRESCRIPTION_CREATE event', () => {
      logPrescription('P001', 'Lisinopril 10mg');

      const log = getAuditLog();
      expect(log[0].eventType).toBe('PRESCRIPTION_CREATE');
      expect(log[0].patientId).toBe('P001');
      expect(log[0].details).toBe('Lisinopril 10mg');
    });

    it('logOrder should log ORDER_CREATE event', () => {
      logOrder('P001', 'Lab', 'CBC with Differential');

      const log = getAuditLog();
      expect(log[0].eventType).toBe('ORDER_CREATE');
      expect(log[0].patientId).toBe('P001');
      expect(log[0].resourceType).toBe('Lab');
      expect(log[0].details).toBe('CBC with Differential');
    });

    it('logLogout should log LOGOUT for manual logout', () => {
      logLogout('manual');

      const log = getAuditLog();
      expect(log[0].eventType).toBe('LOGOUT');
      expect(log[0].action).toBe('User logged out');
    });

    it('logLogout should log SESSION_TIMEOUT for timeout', () => {
      logLogout('timeout');

      const log = getAuditLog();
      expect(log[0].eventType).toBe('SESSION_TIMEOUT');
      expect(log[0].action).toBe('Session timed out');
    });

    it('logLogout should default to manual', () => {
      logLogout();

      const log = getAuditLog();
      expect(log[0].eventType).toBe('LOGOUT');
    });
  });
});
