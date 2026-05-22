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
} from '../../src/services/auditService';

const mockLocalStorage: Record<string, string> = {};
const mockSessionStorage: Record<string, string> = {};

beforeEach(() => {
  Object.keys(mockLocalStorage).forEach((k) => delete mockLocalStorage[k]);
  Object.keys(mockSessionStorage).forEach((k) => delete mockSessionStorage[k]);

  Object.defineProperty(global, 'localStorage', {
    value: {
      getItem: (key: string) => mockLocalStorage[key] ?? null,
      setItem: (key: string, val: string) => { mockLocalStorage[key] = val; },
      removeItem: (key: string) => { delete mockLocalStorage[key]; },
    },
    writable: true,
  });

  Object.defineProperty(global, 'sessionStorage', {
    value: {
      getItem: (key: string) => mockSessionStorage[key] ?? null,
      setItem: (key: string, val: string) => { mockSessionStorage[key] = val; },
      removeItem: (key: string) => { delete mockSessionStorage[key]; },
    },
    writable: true,
  });
});

describe('auditService', () => {
  describe('logAuditEvent', () => {
    it('stores an event in localStorage', () => {
      logAuditEvent('LOGIN');

      const log = getAuditLog();
      expect(log.length).toBe(1);
      expect(log[0].eventType).toBe('LOGIN');
    });

    it('sets default fields on event', () => {
      logAuditEvent('LOGIN');

      const log = getAuditLog();
      expect(log[0].userId).toBe('USR001');
      expect(log[0].userName).toBe('Dr. Sarah Anderson');
      expect(log[0].userRole).toBe('Physician');
      expect(log[0].success).toBe(true);
    });

    it('allows overriding success field', () => {
      logAuditEvent('FAILED_LOGIN', { success: false });

      const log = getAuditLog();
      expect(log[0].success).toBe(false);
    });

    it('sets optional patient fields', () => {
      logAuditEvent('PATIENT_ACCESS', {
        patientId: 'P001',
        patientMrn: 'MRN001',
        patientName: 'John Doe',
      });

      const log = getAuditLog();
      expect(log[0].patientId).toBe('P001');
      expect(log[0].patientMrn).toBe('MRN001');
      expect(log[0].patientName).toBe('John Doe');
    });

    it('creates a session ID on first call', () => {
      logAuditEvent('LOGIN');

      expect(mockSessionStorage['coghealth_session_id']).toBeDefined();
      const log = getAuditLog();
      expect(log[0].sessionId).toBe(mockSessionStorage['coghealth_session_id']);
    });

    it('reuses session ID across calls', () => {
      logAuditEvent('LOGIN');
      logAuditEvent('PATIENT_ACCESS');

      const log = getAuditLog();
      expect(log[0].sessionId).toBe(log[1].sessionId);
    });

    it('prepends new events (most recent first)', () => {
      logAuditEvent('LOGIN');
      logAuditEvent('PATIENT_ACCESS');

      const log = getAuditLog();
      expect(log[0].eventType).toBe('PATIENT_ACCESS');
      expect(log[1].eventType).toBe('LOGIN');
    });

    it('enforces max 1000 entries', () => {
      for (let i = 0; i < 1005; i++) {
        logAuditEvent('PATIENT_ACCESS');
      }

      const log = getAuditLog();
      expect(log.length).toBe(1000);
    });
  });

  describe('getAuditLog', () => {
    it('returns empty array when no log exists', () => {
      expect(getAuditLog()).toEqual([]);
    });

    it('returns empty array on invalid JSON', () => {
      mockLocalStorage['coghealth_audit_log'] = 'not-json';
      expect(getAuditLog()).toEqual([]);
    });
  });

  describe('clearAuditLog', () => {
    it('removes all log entries', () => {
      logAuditEvent('LOGIN');
      expect(getAuditLog().length).toBe(1);

      clearAuditLog();
      expect(getAuditLog()).toEqual([]);
    });
  });

  describe('getPatientAccessLog', () => {
    it('filters events by patientId and PATIENT_ACCESS type', () => {
      logAuditEvent('PATIENT_ACCESS', { patientId: 'P001' });
      logAuditEvent('PATIENT_ACCESS', { patientId: 'P002' });
      logAuditEvent('PHI_VIEW', { patientId: 'P001' });

      const result = getPatientAccessLog('P001');
      expect(result.length).toBe(1);
      expect(result[0].patientId).toBe('P001');
    });
  });

  describe('logPatientAccess', () => {
    it('logs PATIENT_ACCESS event with patient details', () => {
      logPatientAccess('P001', 'MRN001', 'John Doe');

      const log = getAuditLog();
      expect(log[0].eventType).toBe('PATIENT_ACCESS');
      expect(log[0].patientId).toBe('P001');
      expect(log[0].patientMrn).toBe('MRN001');
      expect(log[0].action).toBe('Opened patient chart');
    });
  });

  describe('logPatientSearch', () => {
    it('logs PATIENT_SEARCH with query details', () => {
      logPatientSearch('John', 5);

      const log = getAuditLog();
      expect(log[0].eventType).toBe('PATIENT_SEARCH');
      expect(log[0].details).toContain('John');
      expect(log[0].details).toContain('5 results');
    });
  });

  describe('logPHIView', () => {
    it('logs PHI_VIEW event', () => {
      logPHIView('P001', 'Lab Result', 'LAB123');

      const log = getAuditLog();
      expect(log[0].eventType).toBe('PHI_VIEW');
      expect(log[0].resourceType).toBe('Lab Result');
      expect(log[0].resourceId).toBe('LAB123');
    });
  });

  describe('logPrint', () => {
    it('logs PHI_PRINT event', () => {
      logPrint('P001', 'Discharge Summary');

      const log = getAuditLog();
      expect(log[0].eventType).toBe('PHI_PRINT');
      expect(log[0].resourceType).toBe('Discharge Summary');
    });
  });

  describe('logPrescription', () => {
    it('logs PRESCRIPTION_CREATE event', () => {
      logPrescription('P001', 'Amoxicillin 500mg');

      const log = getAuditLog();
      expect(log[0].eventType).toBe('PRESCRIPTION_CREATE');
      expect(log[0].details).toBe('Amoxicillin 500mg');
    });
  });

  describe('logOrder', () => {
    it('logs ORDER_CREATE event', () => {
      logOrder('P001', 'Lab', 'CBC with Differential');

      const log = getAuditLog();
      expect(log[0].eventType).toBe('ORDER_CREATE');
      expect(log[0].resourceType).toBe('Lab');
      expect(log[0].details).toBe('CBC with Differential');
    });
  });

  describe('logLogout', () => {
    it('logs LOGOUT for manual logout', () => {
      logLogout('manual');

      const log = getAuditLog();
      expect(log[0].eventType).toBe('LOGOUT');
      expect(log[0].action).toBe('User logged out');
    });

    it('logs SESSION_TIMEOUT for timeout', () => {
      logLogout('timeout');

      const log = getAuditLog();
      expect(log[0].eventType).toBe('SESSION_TIMEOUT');
      expect(log[0].action).toBe('Session timed out');
    });

    it('defaults to manual logout', () => {
      logLogout();

      const log = getAuditLog();
      expect(log[0].eventType).toBe('LOGOUT');
    });
  });
});
