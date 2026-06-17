import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setCurrentUser, clearCurrentUser } from '../authContext';

// Mock the auditQueue so we can capture events without real HTTP
const mockEnqueue = vi.fn();
vi.mock('../auditQueue', () => ({
  enqueueAuditEvent: (event: unknown) => mockEnqueue(event),
}));

// Import after mocks are set up
import {
  logAuditEvent,
  logPatientAccess,
  logPatientSearch,
  logPHIView,
  logPrint,
  logPrescription,
  logOrder,
  logLogout,
  logLogin,
  logFailedLogin,
  logPHIAccessJustification,
} from '../auditService';
import type { AuditEvent } from '../auditService';

function getLastEvent(): AuditEvent {
  return mockEnqueue.mock.calls[mockEnqueue.mock.calls.length - 1][0];
}

describe('auditService', () => {
  beforeEach(() => {
    mockEnqueue.mockClear();
    clearCurrentUser();
    sessionStorage.clear();
  });

  describe('logAuditEvent', () => {
    it('sends event to audit queue (not localStorage)', () => {
      logAuditEvent('LOGIN', { action: 'test' });
      expect(mockEnqueue).toHaveBeenCalledTimes(1);
      // Verify localStorage was NOT used
      expect(localStorage.getItem('coghealth_audit_log')).toBeNull();
    });

    it('populates user identity from auth context', () => {
      setCurrentUser({
        userId: 'USR999',
        userName: 'Dr. Context',
        userRole: 'Nurse',
        ipAddress: '172.16.0.1',
      });
      logAuditEvent('LOGIN', {});
      const event = getLastEvent();
      expect(event.userId).toBe('USR999');
      expect(event.userName).toBe('Dr. Context');
      expect(event.userRole).toBe('Nurse');
      expect(event.ipAddress).toBe('172.16.0.1');
    });

    it('uses unknown user when no auth context is set', () => {
      logAuditEvent('LOGIN', {});
      const event = getLastEvent();
      expect(event.userId).toBe('UNKNOWN');
      expect(event.userName).toBe('Unknown User');
    });

    it('generates unique ids and timestamps', () => {
      logAuditEvent('LOGIN', {});
      logAuditEvent('LOGOUT', {});
      const e1 = mockEnqueue.mock.calls[0][0];
      const e2 = mockEnqueue.mock.calls[1][0];
      expect(e1.id).not.toBe(e2.id);
      expect(e1.timestamp).toBeDefined();
    });

    it('creates persistent session id', () => {
      logAuditEvent('LOGIN', {});
      const e1 = getLastEvent();
      logAuditEvent('LOGOUT', {});
      const e2 = getLastEvent();
      expect(e1.sessionId).toBe(e2.sessionId);
      expect(e1.sessionId).toBeTruthy();
    });

    it('defaults success to true', () => {
      logAuditEvent('LOGIN', {});
      expect(getLastEvent().success).toBe(true);
    });

    it('allows overriding success to false', () => {
      logAuditEvent('FAILED_LOGIN', { success: false });
      expect(getLastEvent().success).toBe(false);
    });
  });

  describe('helper functions produce correct event types', () => {
    it('logPatientAccess → PATIENT_ACCESS', () => {
      logPatientAccess('P001', 'MRN123', 'Smith, John');
      const event = getLastEvent();
      expect(event.eventType).toBe('PATIENT_ACCESS');
      expect(event.patientId).toBe('P001');
      expect(event.patientMrn).toBe('MRN123');
      expect(event.patientName).toBe('Smith, John');
    });

    it('logPatientSearch → PATIENT_SEARCH', () => {
      logPatientSearch('smith', 5);
      const event = getLastEvent();
      expect(event.eventType).toBe('PATIENT_SEARCH');
      expect(event.details).toContain('smith');
      expect(event.details).toContain('5 results');
    });

    it('logPHIView → PHI_VIEW', () => {
      logPHIView('P001', 'labs', 'lab-panel-1');
      const event = getLastEvent();
      expect(event.eventType).toBe('PHI_VIEW');
      expect(event.patientId).toBe('P001');
      expect(event.resourceType).toBe('labs');
      expect(event.resourceId).toBe('lab-panel-1');
    });

    it('logPrint → PHI_PRINT', () => {
      logPrint('P001', 'Patient Chart');
      const event = getLastEvent();
      expect(event.eventType).toBe('PHI_PRINT');
      expect(event.patientId).toBe('P001');
      expect(event.resourceType).toBe('Patient Chart');
    });

    it('logPrescription → PRESCRIPTION_CREATE', () => {
      logPrescription('P001', 'Metformin 500mg');
      const event = getLastEvent();
      expect(event.eventType).toBe('PRESCRIPTION_CREATE');
      expect(event.details).toBe('Metformin 500mg');
    });

    it('logOrder → ORDER_CREATE', () => {
      logOrder('P001', 'LAB', 'CBC, BMP');
      const event = getLastEvent();
      expect(event.eventType).toBe('ORDER_CREATE');
      expect(event.resourceType).toBe('LAB');
      expect(event.details).toBe('CBC, BMP');
    });

    it('logLogout manual → LOGOUT', () => {
      logLogout('manual');
      expect(getLastEvent().eventType).toBe('LOGOUT');
    });

    it('logLogout timeout → SESSION_TIMEOUT', () => {
      logLogout('timeout');
      expect(getLastEvent().eventType).toBe('SESSION_TIMEOUT');
    });

    it('logLogin → LOGIN', () => {
      logLogin();
      const event = getLastEvent();
      expect(event.eventType).toBe('LOGIN');
      expect(event.action).toBe('User logged in');
    });

    it('logFailedLogin → FAILED_LOGIN with success=false', () => {
      logFailedLogin('baduser@example.com');
      const event = getLastEvent();
      expect(event.eventType).toBe('FAILED_LOGIN');
      expect(event.success).toBe(false);
      expect(event.details).toContain('baduser@example.com');
    });

    it('logFailedLogin without userId', () => {
      logFailedLogin();
      const event = getLastEvent();
      expect(event.eventType).toBe('FAILED_LOGIN');
      expect(event.details).toBeUndefined();
    });

    it('logPHIAccessJustification → PHI_ACCESS_JUSTIFIED', () => {
      logPHIAccessJustification('P001', 'Treatment');
      const event = getLastEvent();
      expect(event.eventType).toBe('PHI_ACCESS_JUSTIFIED');
      expect(event.patientId).toBe('P001');
      expect(event.details).toBe('Treatment');
    });

    it('logPHIAccessJustification with details', () => {
      logPHIAccessJustification('P001', 'Other', 'Research study enrollment');
      const event = getLastEvent();
      expect(event.details).toBe('Other: Research study enrollment');
    });
  });

  describe('tamper resistance', () => {
    it('clearAuditLog is not exported', async () => {
      const mod = await import('../auditService');
      expect('clearAuditLog' in mod).toBe(false);
    });

    it('getAuditLog is not exported', async () => {
      const mod = await import('../auditService');
      expect('getAuditLog' in mod).toBe(false);
    });
  });
});
