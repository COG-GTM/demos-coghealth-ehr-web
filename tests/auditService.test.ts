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
  type AuditEvent,
} from '../src/services/auditService';

const AUDIT_LOG_KEY = 'coghealth_audit_log';
const SESSION_ID_KEY = 'coghealth_session_id';

class StorageMock {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return key in this.store ? this.store[key] : null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

let localStorageMock: StorageMock;
let sessionStorageMock: StorageMock;

beforeEach(() => {
  localStorageMock = new StorageMock();
  sessionStorageMock = new StorageMock();
  const g = global as unknown as { localStorage: StorageMock; sessionStorage: StorageMock };
  g.localStorage = localStorageMock;
  g.sessionStorage = sessionStorageMock;
});

describe('logAuditEvent / getAuditLog', () => {
  it('persists an event with default success=true and standard user fields', () => {
    logAuditEvent('LOGIN');

    const log = getAuditLog();
    expect(log).toHaveLength(1);
    const event = log[0];
    expect(event.eventType).toBe('LOGIN');
    expect(event.success).toBe(true);
    expect(event.userId).toBe('USR001');
    expect(event.userName).toBe('Dr. Sarah Anderson');
    expect(event.userRole).toBe('Physician');
    expect(event.ipAddress).toBe('192.168.1.100');
    expect(typeof event.id).toBe('string');
    expect(typeof event.timestamp).toBe('string');
    expect(typeof event.sessionId).toBe('string');
  });

  it('respects an explicit success=false and passes through options', () => {
    logAuditEvent('FAILED_LOGIN', {
      patientId: 'P1',
      patientMrn: 'MRN1',
      patientName: 'John Doe',
      resourceType: 'Note',
      resourceId: 'R1',
      action: 'tried',
      details: 'bad password',
      success: false,
    });

    const event = getAuditLog()[0];
    expect(event.success).toBe(false);
    expect(event.patientId).toBe('P1');
    expect(event.patientMrn).toBe('MRN1');
    expect(event.patientName).toBe('John Doe');
    expect(event.resourceType).toBe('Note');
    expect(event.resourceId).toBe('R1');
    expect(event.action).toBe('tried');
    expect(event.details).toBe('bad password');
  });

  it('prepends new events so the most recent is first', () => {
    logAuditEvent('LOGIN');
    logAuditEvent('LOGOUT');

    const log = getAuditLog();
    expect(log).toHaveLength(2);
    expect(log[0].eventType).toBe('LOGOUT');
    expect(log[1].eventType).toBe('LOGIN');
  });

  it('reuses a cached session id across events', () => {
    logAuditEvent('LOGIN');
    logAuditEvent('LOGOUT');

    const log = getAuditLog();
    expect(log[0].sessionId).toBe(log[1].sessionId);
    expect(sessionStorageMock.getItem(SESSION_ID_KEY)).toBe(log[0].sessionId);
  });

  it('caps the stored log at 1000 entries', () => {
    const big: AuditEvent[] = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i),
      timestamp: 'ts',
      eventType: 'LOGIN',
      userId: 'u',
      userName: 'n',
      userRole: 'r',
      ipAddress: 'ip',
      sessionId: 's',
      success: true,
    }));
    localStorageMock.setItem(AUDIT_LOG_KEY, JSON.stringify(big));

    logAuditEvent('PHI_VIEW');

    const log = getAuditLog();
    expect(log).toHaveLength(1000);
    expect(log[0].eventType).toBe('PHI_VIEW');
  });

  it('returns an empty array when no log exists', () => {
    expect(getAuditLog()).toEqual([]);
  });

  it('returns an empty array when the stored log is corrupt JSON', () => {
    localStorageMock.setItem(AUDIT_LOG_KEY, '{not valid json');
    expect(getAuditLog()).toEqual([]);
  });
});

describe('clearAuditLog', () => {
  it('removes the audit log from storage', () => {
    logAuditEvent('LOGIN');
    expect(getAuditLog()).toHaveLength(1);

    clearAuditLog();
    expect(getAuditLog()).toEqual([]);
    expect(localStorageMock.getItem(AUDIT_LOG_KEY)).toBeNull();
  });
});

describe('getPatientAccessLog', () => {
  it('filters to PATIENT_ACCESS events for the given patient', () => {
    logPatientAccess('P1', 'MRN1', 'Alice');
    logPatientAccess('P2', 'MRN2', 'Bob');
    logPHIView('P1', 'Note', 'N1'); // not PATIENT_ACCESS, should be excluded

    const result = getPatientAccessLog('P1');
    expect(result).toHaveLength(1);
    expect(result[0].patientId).toBe('P1');
    expect(result[0].eventType).toBe('PATIENT_ACCESS');
  });
});

describe('convenience loggers', () => {
  it('logPatientAccess records a PATIENT_ACCESS event', () => {
    logPatientAccess('P1', 'MRN1', 'Alice');
    const e = getAuditLog()[0];
    expect(e.eventType).toBe('PATIENT_ACCESS');
    expect(e.patientId).toBe('P1');
    expect(e.patientMrn).toBe('MRN1');
    expect(e.patientName).toBe('Alice');
    expect(e.action).toBe('Opened patient chart');
  });

  it('logPatientSearch records query and result count', () => {
    logPatientSearch('diabetes', 3);
    const e = getAuditLog()[0];
    expect(e.eventType).toBe('PATIENT_SEARCH');
    expect(e.action).toBe('Patient search');
    expect(e.details).toBe('Query: "diabetes" - 3 results');
  });

  it('logPHIView records the resource viewed', () => {
    logPHIView('P1', 'LabResult', 'L9');
    const e = getAuditLog()[0];
    expect(e.eventType).toBe('PHI_VIEW');
    expect(e.patientId).toBe('P1');
    expect(e.resourceType).toBe('LabResult');
    expect(e.resourceId).toBe('L9');
    expect(e.action).toBe('Viewed LabResult');
  });

  it('logPrint records a PHI_PRINT event with optional args', () => {
    logPrint('P1', 'Summary');
    const e = getAuditLog()[0];
    expect(e.eventType).toBe('PHI_PRINT');
    expect(e.patientId).toBe('P1');
    expect(e.resourceType).toBe('Summary');
    expect(e.action).toBe('Print initiated');
  });

  it('logPrint works with no arguments', () => {
    logPrint();
    const e = getAuditLog()[0];
    expect(e.eventType).toBe('PHI_PRINT');
    expect(e.patientId).toBeUndefined();
    expect(e.resourceType).toBeUndefined();
  });

  it('logPrescription records the medication', () => {
    logPrescription('P1', 'Amoxicillin 500mg');
    const e = getAuditLog()[0];
    expect(e.eventType).toBe('PRESCRIPTION_CREATE');
    expect(e.patientId).toBe('P1');
    expect(e.action).toBe('Prescription created');
    expect(e.details).toBe('Amoxicillin 500mg');
  });

  it('logOrder records order type and details', () => {
    logOrder('P1', 'Lab', 'CBC panel');
    const e = getAuditLog()[0];
    expect(e.eventType).toBe('ORDER_CREATE');
    expect(e.patientId).toBe('P1');
    expect(e.resourceType).toBe('Lab');
    expect(e.action).toBe('Order created');
    expect(e.details).toBe('CBC panel');
  });

  it('logLogout defaults to a manual LOGOUT event', () => {
    logLogout();
    const e = getAuditLog()[0];
    expect(e.eventType).toBe('LOGOUT');
    expect(e.action).toBe('User logged out');
  });

  it('logLogout records a SESSION_TIMEOUT event when timed out', () => {
    logLogout('timeout');
    const e = getAuditLog()[0];
    expect(e.eventType).toBe('SESSION_TIMEOUT');
    expect(e.action).toBe('Session timed out');
  });
});
