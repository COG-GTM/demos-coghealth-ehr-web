import type { AuditEvent } from './auditService';

const FLUSH_INTERVAL_MS = 10_000;
const MAX_BATCH_SIZE = 50;
const MAX_RETRY_ATTEMPTS = 3;
const AUDIT_ENDPOINT = '/api/audit';

const queue: AuditEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let isFlushing = false;
let visibilityHandler: (() => void) | null = null;

function getAuditUrl(): string {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  const root = base.replace(/\/api\/?$/, '');
  return `${root}${AUDIT_ENDPOINT}`;
}

function getAuthToken(): string | null {
  return sessionStorage.getItem('coghealth_auth_token');
}

async function sendBatch(batch: AuditEvent[], attempt = 1): Promise<boolean> {
  try {
    const url = getAuditUrl();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events: batch }),
    });

    if (!response.ok) {
      throw new Error(`Audit POST failed: ${response.status}`);
    }
    return true;
  } catch (error) {
    if (attempt < MAX_RETRY_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendBatch(batch, attempt + 1);
    }
    console.warn('[AuditQueue] Failed to flush audit events after retries:', error);
    return false;
  }
}

export function enqueueAuditEvent(event: AuditEvent): void {
  queue.push(event);
  if (queue.length >= MAX_BATCH_SIZE) {
    void flushQueue();
  }
}

export async function flushQueue(): Promise<void> {
  if (isFlushing || queue.length === 0) return;

  isFlushing = true;
  const batch = queue.splice(0, MAX_BATCH_SIZE);

  const success = await sendBatch(batch);
  if (!success) {
    queue.unshift(...batch);
  }
  isFlushing = false;
}

function flushOnUnload(): void {
  if (queue.length === 0) return;
  const batch = queue.splice(0);
  const url = getAuditUrl();
  const blob = new Blob(
    [JSON.stringify({ events: batch })],
    { type: 'application/json' }
  );
  navigator.sendBeacon(url, blob);
}

export function startAuditQueue(): void {
  if (flushTimer !== null) return;
  flushTimer = setInterval(() => void flushQueue(), FLUSH_INTERVAL_MS);
  window.addEventListener('beforeunload', flushOnUnload);
  visibilityHandler = () => {
    if (document.visibilityState === 'hidden') {
      void flushQueue();
    }
  };
  window.addEventListener('visibilitychange', visibilityHandler);
}

export function stopAuditQueue(): void {
  if (flushTimer !== null) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  window.removeEventListener('beforeunload', flushOnUnload);
  if (visibilityHandler) {
    window.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
}

/**
 * Synchronously flush all queued events using sendBeacon.
 * Use this before page unload or reload to ensure events are delivered.
 */
export function flushQueueSync(): void {
  if (queue.length === 0) return;
  const batch = queue.splice(0);
  const url = getAuditUrl();
  const blob = new Blob(
    [JSON.stringify({ events: batch })],
    { type: 'application/json' }
  );
  navigator.sendBeacon(url, blob);
}

export function getQueueLength(): number {
  return queue.length;
}
