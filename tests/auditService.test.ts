const mockPost = jest.fn().mockResolvedValue(undefined);
const mockGet = jest.fn().mockResolvedValue([]);

jest.mock('../src/services/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

class MemoryStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return key in this.store ? this.store[key] : null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  get keys(): string[] {
    return Object.keys(this.store);
  }
}

type AuditModule = Record<string, ((...args: unknown[]) => unknown) | undefined>;

const LEGACY_KEY = 'coghealth_audit_log';

function loadAuditService(storage: MemoryStorage): AuditModule {
  const globals = globalThis as unknown as { localStorage: MemoryStorage; sessionStorage: MemoryStorage };
  globals.localStorage = storage;
  globals.sessionStorage = new MemoryStorage();
  let mod: AuditModule = {};
  jest.isolateModules(() => {
    mod = jest.requireActual('../src/services/auditService') as AuditModule;
  });
  return mod;
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('auditService', () => {
  let storage: MemoryStorage;
  let audit: AuditModule;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new MemoryStorage();
    audit = loadAuditService(storage);
  });

  test('purges any legacy client-side audit log on load', () => {
    const dirty = new MemoryStorage();
    dirty.setItem(LEGACY_KEY, JSON.stringify([{ patientMrn: 'MRN123' }]));
    loadAuditService(dirty);
    expect(dirty.getItem(LEGACY_KEY)).toBeNull();
  });

  test('sends audit events to the server instead of storing them in the browser', async () => {
    audit.logAuditEvent?.('PHI_VIEW', {
      patientId: '42',
      resourceType: 'Lab Result',
      resourceId: '7',
    });
    await flush();

    expect(mockPost).toHaveBeenCalledWith('/audit/events', expect.objectContaining({
      eventType: 'PHI_VIEW',
      patientId: '42',
      resourceType: 'Lab Result',
      resourceId: '7',
      success: true,
    }));
    expect(storage.keys).toHaveLength(0);
  });

  test('never attributes events to a hardcoded identity or source IP', async () => {
    audit.logAuditEvent?.('LOGOUT', { action: 'User logged out' });
    await flush();

    const payload = mockPost.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('userId');
    expect(payload).not.toHaveProperty('userName');
    expect(payload).not.toHaveProperty('userRole');
    expect(payload).not.toHaveProperty('ipAddress');
    expect(JSON.stringify(payload)).not.toMatch(/USR001|Sarah Anderson|192\.168\.1\.100/);
  });

  test('does not transmit or persist patient MRN or name for chart access', async () => {
    audit.logPatientAccess?.('42', 'MRN123', 'Doe, Jane');
    await flush();

    const payload = mockPost.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('patientMrn');
    expect(payload).not.toHaveProperty('patientName');
    expect(JSON.stringify(storage)).not.toMatch(/MRN123|Doe, Jane/);
    expect(storage.keys).toHaveLength(0);
  });

  test('does not expose a client-side way to read or wipe the audit trail', () => {
    expect(audit.clearAuditLog).toBeUndefined();
    expect(audit.getAuditLog).toBeUndefined();
  });

  test('reads the patient access log from the server', async () => {
    await audit.getPatientAccessLog?.('42');
    expect(mockGet).toHaveBeenCalledWith('/audit/events', {
      patientId: '42',
      eventType: 'PATIENT_ACCESS',
    });
  });
});
