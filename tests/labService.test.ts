class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.get(key) ?? null; }
  setItem(key: string, value: string) { this.store.set(key, value); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

Object.assign(globalThis, { localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage() });

import {
  acknowledgeLabPanel,
  defaultLabPanels,
  getCriticalResults,
  getLabAcknowledgments,
  getUnacknowledgedCriticalPanels,
  hasCriticalResult,
} from '../src/services/labService';
import { getAuditLog } from '../src/services/auditService';

const bmp = defaultLabPanels.find(p => p.id === 1)!;
const lipid = defaultLabPanels.find(p => p.id === 4)!;

describe('labService acknowledgments', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test('identifies panels with critical results', () => {
    expect(hasCriticalResult(bmp)).toBe(true);
    expect(hasCriticalResult(lipid)).toBe(false);
    expect(getCriticalResults(bmp).map(r => r.testName)).toEqual(['Potassium', 'Creatinine']);
  });

  test('acknowledging persists the user, time and note', () => {
    const ack = acknowledgeLabPanel(bmp, '  Repeat BMP ordered  ');

    expect(ack).toMatchObject({ panelId: 1, acknowledgedBy: 'Dr. Sarah Anderson', note: 'Repeat BMP ordered' });
    expect(Number.isNaN(Date.parse(ack.acknowledgedAt))).toBe(false);
    expect(getLabAcknowledgments()[1]).toEqual(ack);
  });

  test('blank note is omitted', () => {
    expect(acknowledgeLabPanel(bmp, '   ').note).toBeUndefined();
  });

  test('writes an audit log entry for each acknowledgment', () => {
    acknowledgeLabPanel(bmp, 'Called patient');

    const [entry] = getAuditLog();
    expect(entry).toMatchObject({
      eventType: 'LAB_ACKNOWLEDGE',
      userName: 'Dr. Sarah Anderson',
      patientMrn: 'MRN001234',
      resourceType: 'LabPanel',
      resourceId: '1',
    });
    expect(entry.details).toContain('Potassium 6.8 mEq/L');
    expect(entry.details).toContain('Called patient');
  });

  test('unacknowledged critical panels exclude acknowledged ones', () => {
    const before = getUnacknowledgedCriticalPanels(defaultLabPanels, getLabAcknowledgments()).map(p => p.id);
    expect(before).toEqual([1, 3]);

    acknowledgeLabPanel(bmp, '');

    const after = getUnacknowledgedCriticalPanels(defaultLabPanels, getLabAcknowledgments()).map(p => p.id);
    expect(after).toEqual([3]);
  });

  test('rolls back the acknowledgment if the audit write fails', () => {
    const realSetItem = localStorage.setItem.bind(localStorage);
    const spy = jest.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
      if (key === 'coghealth_audit_log') throw new Error('QuotaExceededError');
      realSetItem(key, value);
    });

    expect(() => acknowledgeLabPanel(bmp, 'note')).toThrow('QuotaExceededError');
    expect(getLabAcknowledgments()[1]).toBeUndefined();
    expect(getAuditLog().filter(e => e.eventType === 'LAB_ACKNOWLEDGE')).toHaveLength(0);
    spy.mockRestore();
  });
});
