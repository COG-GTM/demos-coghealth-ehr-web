import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AuditEvent } from '../auditService';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock navigator.sendBeacon
const mockSendBeacon = vi.fn();
vi.stubGlobal('navigator', { ...navigator, sendBeacon: mockSendBeacon });

// Mock import.meta.env
vi.stubEnv('VITE_API_URL', 'http://localhost:8080/api');

import {
  enqueueAuditEvent,
  flushQueue,
  startAuditQueue,
  stopAuditQueue,
  getQueueLength,
} from '../auditQueue';

function createMockEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: `test-${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: 'LOGIN',
    userId: 'USR001',
    userName: 'Test User',
    userRole: 'Physician',
    ipAddress: '127.0.0.1',
    sessionId: 'sess-123',
    success: true,
    ...overrides,
  };
}

describe('auditQueue', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockSendBeacon.mockClear();
    sessionStorage.clear();
    // Drain any queued events
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    stopAuditQueue();
  });

  describe('enqueueAuditEvent', () => {
    it('adds events to the queue', () => {
      const initialLength = getQueueLength();
      enqueueAuditEvent(createMockEvent());
      expect(getQueueLength()).toBe(initialLength + 1);
    });
  });

  describe('flushQueue', () => {
    it('sends queued events via HTTP POST', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      enqueueAuditEvent(createMockEvent({ eventType: 'LOGIN' }));
      await flushQueue();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/audit');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      const body = JSON.parse(options.body);
      expect(body.events).toHaveLength(1);
      expect(body.events[0].eventType).toBe('LOGIN');
    });

    it('does nothing when queue is empty', async () => {
      // drain first
      await flushQueue();
      mockFetch.mockClear();
      await flushQueue();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('includes Authorization header when token is in sessionStorage', async () => {
      sessionStorage.setItem('coghealth_auth_token', 'test-token-123');
      mockFetch.mockResolvedValueOnce({ ok: true });
      enqueueAuditEvent(createMockEvent());
      await flushQueue();

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Authorization']).toBe('Bearer test-token-123');
    });

    it('retries on failure and re-queues on final failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      enqueueAuditEvent(createMockEvent());
      const lengthBefore = getQueueLength();
      await flushQueue();

      // After all retries fail, events should be re-queued
      expect(getQueueLength()).toBe(lengthBefore);
    });

    it('retries and succeeds on second attempt', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true });

      enqueueAuditEvent(createMockEvent());
      await flushQueue();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      // Should be drained after successful retry
    });
  });

  describe('startAuditQueue / stopAuditQueue', () => {
    it('can start and stop without errors', () => {
      expect(() => startAuditQueue()).not.toThrow();
      expect(() => stopAuditQueue()).not.toThrow();
    });

    it('calling start twice is idempotent', () => {
      startAuditQueue();
      startAuditQueue();
      stopAuditQueue();
    });
  });
});
