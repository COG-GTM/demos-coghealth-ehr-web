import { describe, it, expect, beforeEach } from 'vitest';
import { getCurrentUser, setCurrentUser, clearCurrentUser } from '../authContext';

describe('authContext', () => {
  beforeEach(() => {
    clearCurrentUser();
  });

  it('returns default unknown user when no user is set', () => {
    const user = getCurrentUser();
    expect(user.userId).toBe('UNKNOWN');
    expect(user.userName).toBe('Unknown User');
    expect(user.userRole).toBe('Unknown');
    expect(user.ipAddress).toBe('unknown');
  });

  it('returns the set user after setCurrentUser', () => {
    setCurrentUser({
      userId: 'USR042',
      userName: 'Dr. Test',
      userRole: 'Physician',
      ipAddress: '10.0.0.1',
    });
    const user = getCurrentUser();
    expect(user.userId).toBe('USR042');
    expect(user.userName).toBe('Dr. Test');
    expect(user.userRole).toBe('Physician');
    expect(user.ipAddress).toBe('10.0.0.1');
  });

  it('returns unknown user after clearCurrentUser', () => {
    setCurrentUser({
      userId: 'USR042',
      userName: 'Dr. Test',
      userRole: 'Physician',
      ipAddress: '10.0.0.1',
    });
    clearCurrentUser();
    const user = getCurrentUser();
    expect(user.userId).toBe('UNKNOWN');
  });
});
