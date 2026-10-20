class MemoryStorage {
  private store = new Map<string, string>();
  failingKeys = new Set<string>();
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  setItem(key: string, value: string) {
    if (this.failingKeys.has(key)) throw new Error('QuotaExceededError');
    this.store.set(key, String(value));
  }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

const localStorageMock = new MemoryStorage();
const dispatched: string[] = [];
Object.assign(globalThis, {
  localStorage: localStorageMock,
  sessionStorage: new MemoryStorage(),
  window: {
    dispatchEvent: (event: Event) => { dispatched.push(event.type); return true; },
    addEventListener: () => {},
    removeEventListener: () => {},
  },
});

import {
  acknowledgeLabPanel,
  defaultLabPanels,
  getLabAcknowledgments,
  getUnacknowledgedCriticalPanels,
  hasCriticalResult,
  MAX_ACKNOWLEDGMENT_NOTE_LENGTH,
} from '../src/services/labService';
import { getAuditLog } from '../src/services/auditService';

const bmp = defaultLabPanels.find(p => p.id === 1)!;
const cardiac = defaultLabPanels.find(p => p.id === 3)!;
const lipid = defaultLabPanels.find(p => p.id === 4)!;

describe('labService acknowledgments', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.failingKeys.clear();
    dispatched.length = 0;
  });

  it('identifies panels with critical results', () => {
    expect(hasCriticalResult(bmp)).toBe(true);
    expect(hasCriticalResult(cardiac)).toBe(true);
    expect(hasCriticalResult(lipid)).toBe(false);
  });

  it('persists the acknowledgment with user, time and note', () => {
    const ack = acknowledgeLabPanel(bmp, '  Called patient, repeat BMP ordered  ');
    expect(ack).toMatchObject({
      panelId: 1,
      acknowledgedBy: 'Dr. Sarah Anderson',
      acknowledgedById: 'USR001',
      note: 'Called patient, repeat BMP ordered',
    });
    expect(Number.isNaN(Date.parse(ack.acknowledgedAt))).toBe(false);
    expect(getLabAcknowledgments()[1]).toEqual(ack);
    expect(dispatched).toEqual(['coghealth:lab-acknowledgments-changed']);
  });

  it('allows an empty note and caps long notes', () => {
    expect(acknowledgeLabPanel(bmp).note).toBe('');
    const long = 'x'.repeat(MAX_ACKNOWLEDGMENT_NOTE_LENGTH + 50);
    expect(acknowledgeLabPanel(cardiac, long).note).toHaveLength(MAX_ACKNOWLEDGMENT_NOTE_LENGTH);
  });

  it('writes a LAB_ACKNOWLEDGE audit entry for every acknowledgment', () => {
    acknowledgeLabPanel(bmp, 'Called patient');
    acknowledgeLabPanel(cardiac);
    const entries = getAuditLog().filter(e => e.eventType === 'LAB_ACKNOWLEDGE');
    expect(entries).toHaveLength(2);
    const bmpEntry = entries.find(e => e.resourceId === '1')!;
    expect(bmpEntry).toMatchObject({
      userName: 'Dr. Sarah Anderson',
      patientMrn: 'MRN001234',
      resourceType: 'LabPanel',
      success: true,
    });
    expect(bmpEntry.details).toContain('Potassium 6.8 mEq/L');
    expect(bmpEntry.details).toContain('Creatinine 3.2 mg/dL');
    expect(bmpEntry.details).toContain('Note: Called patient');
  });

  it('does not re-acknowledge or re-audit an already acknowledged panel', () => {
    const first = acknowledgeLabPanel(bmp, 'first');
    const second = acknowledgeLabPanel(bmp, 'second');
    expect(second).toEqual(first);
    expect(getAuditLog().filter(e => e.eventType === 'LAB_ACKNOWLEDGE')).toHaveLength(1);
  });

  it('rejects panels without critical results', () => {
    expect(() => acknowledgeLabPanel(lipid)).toThrow();
    expect(getLabAcknowledgments()).toEqual({});
  });

  it('rolls back the acknowledgment when the audit write fails', () => {
    acknowledgeLabPanel(cardiac, 'kept');
    localStorageMock.failingKeys.add('coghealth_audit_log');
    expect(() => acknowledgeLabPanel(bmp, 'lost')).toThrow();
    const acks = getLabAcknowledgments();
    expect(acks[1]).toBeUndefined();
    expect(acks[3]?.note).toBe('kept');
  });

  it('writes no audit entry when the acknowledgment cannot be saved', () => {
    localStorageMock.failingKeys.add('coghealth_lab_acknowledgments');
    expect(() => acknowledgeLabPanel(bmp)).toThrow();
    expect(getAuditLog()).toHaveLength(0);
  });

  it('lists only unacknowledged critical panels', () => {
    const before = getUnacknowledgedCriticalPanels(defaultLabPanels, getLabAcknowledgments());
    expect(before.map(p => p.id)).toEqual([1, 3]);
    acknowledgeLabPanel(bmp);
    const after = getUnacknowledgedCriticalPanels(defaultLabPanels, getLabAcknowledgments());
    expect(after.map(p => p.id)).toEqual([3]);
  });

  it('treats corrupt storage as no acknowledgments', () => {
    localStorageMock.setItem('coghealth_lab_acknowledgments', '{not json');
    expect(getLabAcknowledgments()).toEqual({});
    localStorageMock.setItem('coghealth_lab_acknowledgments', '[1,2]');
    expect(getLabAcknowledgments()).toEqual({});
  });
});
