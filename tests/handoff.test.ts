import {
  type HandoffEntry,
  buildHandoffReport,
  canAccept,
  getHandoffStatus,
  getIpassChecks,
  sortBySeverity,
  summarizeUnit,
} from '../src/utils/handoff';

const base = (overrides: Partial<HandoffEntry> = {}): HandoffEntry => ({
  patientId: 1,
  patientName: 'Smith, John',
  mrn: 'MRN001234',
  bed: '4W-412',
  age: 59,
  sex: 'M',
  codeStatus: 'Full Code',
  severity: 'watcher',
  summary: '',
  actions: [],
  contingencies: [],
  receiver: '',
  synthesis: '',
  ...overrides,
});

const complete = (overrides: Partial<HandoffEntry> = {}) =>
  base({
    summary: 'AKI with hyperkalemia, treated with insulin/D50.',
    actions: [{ id: 'a', text: 'Repeat K at 22:00', done: false }],
    contingencies: [{ id: 'c', ifCondition: 'K > 6', thenAction: 'Page nephrology' }],
    receiver: 'Dr. Park',
    synthesis: 'Watch K, repeat at 22, page renal if > 6.',
    ...overrides,
  });

describe('I-PASS handoff logic', () => {
  test('empty draft is missing P, A, S and synthesis', () => {
    const missing = getIpassChecks(base()).filter(c => !c.complete).map(c => c.key);
    expect(missing).toEqual(['P', 'A', 'S', 'S2']);
    expect(getHandoffStatus(base())).toBe('draft');
    expect(canAccept(base())).toBe(false);
  });

  test('contingency plan is optional for stable patients only', () => {
    const noPlan = complete({ contingencies: [] });
    expect(canAccept(noPlan)).toBe(false);
    expect(canAccept({ ...noPlan, severity: 'stable' })).toBe(true);
  });

  test('half-filled contingency does not count', () => {
    const e = complete({ contingencies: [{ id: 'c', ifCondition: 'K > 6', thenAction: '  ' }] });
    expect(getIpassChecks(e).find(c => c.key === 'S')!.complete).toBe(false);
  });

  test('sender-complete entry is ready; acceptance requires synthesis', () => {
    const e = complete({ receiver: '', synthesis: '' });
    expect(getHandoffStatus(e)).toBe('ready');
    expect(canAccept(e)).toBe(false);
    expect(canAccept(complete())).toBe(true);
    expect(getHandoffStatus(complete({ acceptedAt: '19:00' }))).toBe('accepted');
    expect(canAccept(complete({ acceptedAt: '19:00' }))).toBe(false);
  });

  test('sorts unstable first, then by bed', () => {
    const list = [
      base({ patientId: 1, bed: '4W-402', severity: 'stable' }),
      base({ patientId: 2, bed: '4W-418', severity: 'unstable' }),
      base({ patientId: 3, bed: '4W-405', severity: 'watcher' }),
      base({ patientId: 4, bed: '4W-412', severity: 'unstable' }),
    ];
    expect(sortBySeverity(list).map(e => e.patientId)).toEqual([4, 2, 3, 1]);
  });

  test('summarizes unit counts and open actions', () => {
    const list = [
      complete({ severity: 'unstable' }),
      complete({ patientId: 2, severity: 'stable', acceptedAt: '18:00', actions: [{ id: 'x', text: 'done', done: true }] }),
    ];
    expect(summarizeUnit(list)).toEqual({ unstable: 1, watcher: 0, stable: 1, accepted: 1, openActions: 1 });
  });

  test('report lists every I-PASS section and flags pending synthesis', () => {
    const text = buildHandoffReport([complete({ severity: 'unstable' })], 'Dr. Anderson', '4 West', new Date('2026-01-01T19:00:00'));
    expect(text).toContain('I-PASS SHIFT HANDOFF - 4 West');
    expect(text).toContain('Illness severity: UNSTABLE');
    expect(text).toContain('[ ] Repeat K at 22:00');
    expect(text).toContain('IF K > 6 -> THEN Page nephrology');
    expect(text).toContain('Synthesis: PENDING');
  });
});
