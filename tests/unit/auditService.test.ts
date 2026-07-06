import {
  logAuditEvent,
  getAuditLog,
  clearAuditLog,
  getPatientAccessLog,
  logPatientAccess,
  logPatientSearch,
  logLogout,
} from '../../src/services/auditService';

describe('auditService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('starts with an empty audit log', () => {
    expect(getAuditLog()).toEqual([]);
  });

  it('records an audit event with default fields', () => {
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
    expect(log[0].id).toBeTruthy();
    expect(log[0].timestamp).toBeTruthy();
  });

  it('prepends newer events (most recent first)', () => {
    logAuditEvent('LOGIN');
    logAuditEvent('LOGOUT');
    const log = getAuditLog();
    expect(log.map((e) => e.eventType)).toEqual(['LOGOUT', 'LOGIN']);
  });

  it('reuses a single session id across events', () => {
    logAuditEvent('LOGIN');
    logAuditEvent('PHI_VIEW');
    const [second, first] = getAuditLog();
    expect(first.sessionId).toBe(second.sessionId);
    expect(sessionStorage.getItem('coghealth_session_id')).toBe(first.sessionId);
  });

  it('honors an explicit success=false flag', () => {
    logAuditEvent('FAILED_LOGIN', { success: false, details: 'bad password' });
    const [event] = getAuditLog();
    expect(event.success).toBe(false);
    expect(event.details).toBe('bad password');
  });

  it('clears the audit log', () => {
    logAuditEvent('LOGIN');
    expect(getAuditLog()).toHaveLength(1);
    clearAuditLog();
    expect(getAuditLog()).toEqual([]);
  });

  it('returns an empty array when stored data is corrupt', () => {
    localStorage.setItem('coghealth_audit_log', 'not-json');
    expect(getAuditLog()).toEqual([]);
  });

  it('logs patient access and filters by patient id and event type', () => {
    logPatientAccess('P1', 'MRN001', 'John Smith');
    logPatientAccess('P2', 'MRN002', 'Jane Doe');
    logPHISearchNoise();

    const p1 = getPatientAccessLog('P1');
    expect(p1).toHaveLength(1);
    expect(p1[0]).toMatchObject({
      patientId: 'P1',
      patientMrn: 'MRN001',
      patientName: 'John Smith',
      eventType: 'PATIENT_ACCESS',
    });
  });

  it('records patient search metadata', () => {
    logPatientSearch('smith', 3);
    const [event] = getAuditLog();
    expect(event.eventType).toBe('PATIENT_SEARCH');
    expect(event.details).toContain('smith');
    expect(event.details).toContain('3 results');
  });

  it('maps a timeout logout to SESSION_TIMEOUT', () => {
    logLogout('timeout');
    expect(getAuditLog()[0].eventType).toBe('SESSION_TIMEOUT');
    logLogout('manual');
    expect(getAuditLog()[0].eventType).toBe('LOGOUT');
  });
});

// Adds a non-PATIENT_ACCESS event for the same patient to prove filtering excludes it.
function logPHISearchNoise() {
  logAuditEvent('PHI_VIEW', { patientId: 'P1', resourceType: 'LabResult' });
}
