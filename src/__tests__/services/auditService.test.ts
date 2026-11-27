import {
  logAuditEvent,
  getAuditLog,
  clearAuditLog,
  getPatientAccessLog,
  logPatientAccess,
  logLogout,
} from '../../services/auditService';
import type { AuditEvent } from '../../services/auditService';

describe('auditService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('logAuditEvent', () => {
    test('writes a valid AuditEvent object to localStorage key coghealth_audit_log', () => {
      logAuditEvent('LOGIN');

      const raw = localStorage.getItem('coghealth_audit_log');
      expect(raw).not.toBeNull();

      const log: AuditEvent[] = JSON.parse(raw!);
      expect(log).toHaveLength(1);
      expect(log[0].eventType).toBe('LOGIN');
    });

    test('includes id, timestamp, eventType, userId, and sessionId fields', () => {
      logAuditEvent('LOGIN');

      const log: AuditEvent[] = JSON.parse(localStorage.getItem('coghealth_audit_log')!);
      const event = log[0];

      expect(event.id).toBeDefined();
      expect(typeof event.id).toBe('string');
      expect(event.timestamp).toBeDefined();
      expect(typeof event.timestamp).toBe('string');
      expect(event.eventType).toBe('LOGIN');
      expect(event.userId).toBeDefined();
      expect(typeof event.userId).toBe('string');
      expect(event.sessionId).toBeDefined();
      expect(typeof event.sessionId).toBe('string');
    });
  });

  describe('getAuditLog', () => {
    test('returns entries previously written by logAuditEvent', () => {
      logAuditEvent('LOGIN');
      logAuditEvent('LOGOUT');

      const log = getAuditLog();

      expect(log).toHaveLength(2);
      expect(log[0].eventType).toBe('LOGOUT');
      expect(log[1].eventType).toBe('LOGIN');
    });

    test('returns [] when localStorage is empty', () => {
      const log = getAuditLog();
      expect(log).toEqual([]);
    });
  });

  describe('accumulation and ordering', () => {
    test('multiple logAuditEvent calls accumulate entries (most recent first)', () => {
      logAuditEvent('LOGIN');
      logAuditEvent('PATIENT_ACCESS', { patientId: '1' });
      logAuditEvent('LOGOUT');

      const log = getAuditLog();

      expect(log).toHaveLength(3);
      expect(log[0].eventType).toBe('LOGOUT');
      expect(log[1].eventType).toBe('PATIENT_ACCESS');
      expect(log[2].eventType).toBe('LOGIN');
    });
  });

  describe('max entries cap', () => {
    test('log is capped at 1000 entries', () => {
      for (let i = 0; i < 1001; i++) {
        logAuditEvent('LOGIN');
      }

      const log = getAuditLog();
      expect(log).toHaveLength(1000);
    });
  });

  describe('clearAuditLog', () => {
    test('removes all entries', () => {
      logAuditEvent('LOGIN');
      logAuditEvent('LOGOUT');

      expect(getAuditLog()).toHaveLength(2);

      clearAuditLog();

      expect(getAuditLog()).toEqual([]);
    });
  });

  describe('getPatientAccessLog', () => {
    test('returns only events with matching patientId and eventType PATIENT_ACCESS', () => {
      logAuditEvent('PATIENT_ACCESS', { patientId: 'patient-1' });
      logAuditEvent('PATIENT_ACCESS', { patientId: 'patient-2' });
      logAuditEvent('PHI_VIEW', { patientId: 'patient-1' });
      logAuditEvent('PATIENT_ACCESS', { patientId: 'patient-1' });

      const log = getPatientAccessLog('patient-1');

      expect(log).toHaveLength(2);
      log.forEach(event => {
        expect(event.patientId).toBe('patient-1');
        expect(event.eventType).toBe('PATIENT_ACCESS');
      });
    });
  });

  describe('logPatientAccess', () => {
    test('creates a PATIENT_ACCESS event with correct patientId, mrn, and name', () => {
      logPatientAccess('patient-1', 'MRN001', 'John Doe');

      const log = getAuditLog();

      expect(log).toHaveLength(1);
      expect(log[0].eventType).toBe('PATIENT_ACCESS');
      expect(log[0].patientId).toBe('patient-1');
      expect(log[0].patientMrn).toBe('MRN001');
      expect(log[0].patientName).toBe('John Doe');
    });
  });

  describe('logLogout', () => {
    test('logLogout("timeout") creates a SESSION_TIMEOUT event', () => {
      logLogout('timeout');

      const log = getAuditLog();

      expect(log).toHaveLength(1);
      expect(log[0].eventType).toBe('SESSION_TIMEOUT');
    });

    test('logLogout("manual") creates a LOGOUT event', () => {
      logLogout('manual');

      const log = getAuditLog();

      expect(log).toHaveLength(1);
      expect(log[0].eventType).toBe('LOGOUT');
    });
  });
});
