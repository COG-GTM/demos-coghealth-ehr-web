import { isCriticalLabFlag, labResultFlag, problemPriorityFlag } from '../src/utils/clinicalFlags';

describe('problemPriorityFlag', () => {
  it.each([
    ['high', 'H', 'High priority'],
    ['medium', 'M', 'Medium priority'],
    ['low', 'L', 'Low priority'],
    [' High ', 'H', 'High priority'],
  ])('maps %p to a text code and label', (priority, code, label) => {
    expect(problemPriorityFlag(priority)).toEqual({ code, label });
  });

  it.each(['unknown', 'constructor', '__proto__', 'toString'])('falls back to low priority for %p', (priority) => {
    expect(problemPriorityFlag(priority)).toEqual({ code: 'L', label: 'Low priority' });
  });
});

describe('labResultFlag', () => {
  it.each([
    ['High', 'H', 'High'],
    ['Low', 'L', 'Low'],
    ['Critical', 'C', 'Critical'],
    ['Critical High', 'HH', 'Critical high'],
    ['Critical Low', 'LL', 'Critical low'],
    ['Abnormal', 'A', 'Abnormal'],
  ])('flags %p results with text', (status, code, label) => {
    expect(labResultFlag(status)).toEqual({ code, label });
  });

  it.each(['Normal', '', 'Pending', 'constructor', '__proto__', 'hasOwnProperty'])('returns no flag for %p', (status) => {
    expect(labResultFlag(status)).toBeNull();
  });

  it('identifies critical flags', () => {
    expect(isCriticalLabFlag(labResultFlag('Critical High'))).toBe(true);
    expect(isCriticalLabFlag(labResultFlag('High'))).toBe(false);
    expect(isCriticalLabFlag(null)).toBe(false);
  });
});
