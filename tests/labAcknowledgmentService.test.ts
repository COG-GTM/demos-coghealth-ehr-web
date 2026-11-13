import {
  acknowledgePanel,
  clearAcknowledgments,
  getAcknowledgment,
  getAcknowledgments,
  getUnacknowledgedCriticalPanels,
  hasCriticalResult,
  isUnacknowledgedCritical,
  CURRENT_USER_NAME,
} from '../src/services/labAcknowledgmentService';
import { getAuditLog, clearAuditLog } from '../src/services/auditService';
import type { LabPanel } from '../src/types';

class MemoryStorage implements Storage {
  private store: Record<string, string> = {};
  get length() { return Object.keys(this.store).length; }
  clear() { this.store = {}; }
  getItem(key: string) { return key in this.store ? this.store[key] : null; }
  key(index: number) { return Object.keys(this.store)[index] ?? null; }
  removeItem(key: string) { delete this.store[key]; }
  setItem(key: string, value: string) { this.store[key] = value; }
}

const baseResult = { unit: 'mEq/L', referenceRange: '3.5-5.0', collectedAt: '', resultedAt: '', orderedBy: '', performingLab: '' };

const criticalPanel: LabPanel = {
  id: 1,
  panelName: 'BMP',
  patientName: 'Smith, John',
  patientMrn: 'MRN001234',
  collectedAt: '',
  resultedAt: '',
  status: 'final',
  results: [
    { id: 1, testName: 'Sodium', value: '138', status: 'normal', ...baseResult },
    { id: 2, testName: 'Potassium', value: '6.8', status: 'critical', ...baseResult },
  ],
};

const normalPanel: LabPanel = {
  ...criticalPanel,
  id: 2,
  panelName: 'Lipid Panel',
  results: [{ id: 3, testName: 'LDL', value: '165', status: 'abnormal', ...baseResult }],
};

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: new MemoryStorage(), configurable: true });
  clearAcknowledgments();
  clearAuditLog();
});

describe('labAcknowledgmentService', () => {
  test('hasCriticalResult detects critical panels only', () => {
    expect(hasCriticalResult(criticalPanel)).toBe(true);
    expect(hasCriticalResult(normalPanel)).toBe(false);
  });

  test('acknowledgePanel persists acknowledgment with user, time and note', () => {
    const ack = acknowledgePanel(criticalPanel, '  Called patient  ');

    expect(ack.panelId).toBe(1);
    expect(ack.acknowledgedBy).toBe(CURRENT_USER_NAME);
    expect(ack.note).toBe('Called patient');
    expect(new Date(ack.acknowledgedAt).getTime()).not.toBeNaN();

    expect(getAcknowledgment(1)).toEqual(ack);
    expect(getAcknowledgments()).toEqual({ 1: ack });
  });

  test('acknowledgePanel writes an audit log entry', () => {
    acknowledgePanel(criticalPanel, 'Repeat ordered');

    const log = getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0].eventType).toBe('LAB_RESULT_ACKNOWLEDGE');
    expect(log[0].resourceType).toBe('LabPanel');
    expect(log[0].resourceId).toBe('1');
    expect(log[0].patientMrn).toBe('MRN001234');
    expect(log[0].details).toBe('BMP: Potassium 6.8 mEq/L | Note: Repeat ordered');
  });

  test('audit details omit note suffix when note is empty', () => {
    acknowledgePanel(criticalPanel, '');
    expect(getAuditLog()[0].details).toBe('BMP: Potassium 6.8 mEq/L');
  });

  test('isUnacknowledgedCritical and getUnacknowledgedCriticalPanels exclude acknowledged panels', () => {
    const panels = [criticalPanel, normalPanel];
    expect(getUnacknowledgedCriticalPanels(panels)).toEqual([criticalPanel]);
    expect(isUnacknowledgedCritical(criticalPanel, getAcknowledgments())).toBe(true);
    expect(isUnacknowledgedCritical(normalPanel, getAcknowledgments())).toBe(false);

    acknowledgePanel(criticalPanel, '');

    expect(getUnacknowledgedCriticalPanels(panels)).toEqual([]);
    expect(isUnacknowledgedCritical(criticalPanel, getAcknowledgments())).toBe(false);
  });

  test('getAcknowledgments returns empty object on corrupt storage', () => {
    localStorage.setItem('coghealth_lab_acknowledgments', '{not json');
    expect(getAcknowledgments()).toEqual({});
  });

  test.each(['null', '[]', '"str"', '42'])('getAcknowledgments returns empty object for non-object JSON %s', (raw) => {
    localStorage.setItem('coghealth_lab_acknowledgments', raw);
    expect(getAcknowledgments()).toEqual({});
  });

  test('getAcknowledgments drops malformed or mismatched records', () => {
    const good = acknowledgePanel(criticalPanel, '');
    localStorage.setItem('coghealth_lab_acknowledgments', JSON.stringify({
      1: good,
      2: { panelId: 2, acknowledgedBy: 'x' },
      3: { ...good, panelId: 99 },
      4: null,
    }));
    expect(getAcknowledgments()).toEqual({ 1: good });
  });

  test('acknowledgment is invalidated when critical results change', () => {
    acknowledgePanel(criticalPanel, '');
    expect(isUnacknowledgedCritical(criticalPanel, getAcknowledgments())).toBe(false);

    const amended: LabPanel = {
      ...criticalPanel,
      results: [
        ...criticalPanel.results,
        { id: 3, testName: 'Creatinine', value: '3.2', status: 'critical', ...baseResult },
      ],
    };
    expect(isUnacknowledgedCritical(amended, getAcknowledgments())).toBe(true);
    expect(getUnacknowledgedCriticalPanels([amended])).toEqual([amended]);

    const changedValue: LabPanel = {
      ...criticalPanel,
      results: [{ id: 2, testName: 'Potassium', value: '7.1', status: 'critical', ...baseResult }],
    };
    expect(isUnacknowledgedCritical(changedValue, getAcknowledgments())).toBe(true);
  });

  test('acknowledgment is not persisted when the audit write fails', () => {
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key: string, value: string) => {
      if (key === 'coghealth_audit_log') throw new Error('quota');
      original(key, value);
    };

    expect(() => acknowledgePanel(criticalPanel, 'note')).toThrow('quota');
    expect(getAcknowledgments()).toEqual({});
    expect(getAuditLog()).toEqual([]);
  });
});
