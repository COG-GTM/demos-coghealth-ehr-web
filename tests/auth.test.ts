import { installSessionStorageMock } from './mocks/sessionStorage';

installSessionStorageMock();

import { patientService } from '../src/services/patientService';
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
  MissingAuthTokenError,
  UnauthorizedError,
  UNAUTHORIZED_EVENT,
} from '../src/services/authToken';

function jwt(expiresInSeconds: number): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: 'provider1', exp: Math.floor(Date.now() / 1000) + expiresInSeconds })
  ).toString('base64');
  return `header.${payload}.signature`;
}

const VALID_TOKEN = jwt(3600);

function mockFetch(response: Partial<Response> & { status: number }) {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: response.status >= 200 && response.status < 300,
    statusText: 'mocked',
    json: async () => ({}),
    ...response,
  });
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
  return fetchMock;
}

function headersOf(fetchMock: jest.Mock): Record<string, string> {
  return fetchMock.mock.calls[0][1].headers as Record<string, string>;
}

describe('PHI requests carry authentication', () => {
  beforeEach(() => {
    clearAuthToken();
    jest.resetAllMocks();
  });

  test('patient read attaches a bearer token', async () => {
    setAuthToken(VALID_TOKEN);
    const fetchMock = mockFetch({ status: 200 });

    await patientService.getById(1);

    expect(headersOf(fetchMock).Authorization).toBe(`Bearer ${VALID_TOKEN}`);
  });

  test('patient search attaches a bearer token', async () => {
    setAuthToken(VALID_TOKEN);
    const fetchMock = mockFetch({ status: 200 });

    await patientService.search('smith');

    expect(headersOf(fetchMock).Authorization).toBe(`Bearer ${VALID_TOKEN}`);
  });

  test('patient create attaches a bearer token', async () => {
    setAuthToken(VALID_TOKEN);
    const fetchMock = mockFetch({ status: 200 });

    await patientService.create({ mrn: 'MRN001234' });

    expect(headersOf(fetchMock).Authorization).toBe(`Bearer ${VALID_TOKEN}`);
  });

  test('unauthenticated PHI request is never sent to the network', async () => {
    const fetchMock = mockFetch({ status: 200 });

    await expect(patientService.getById(1)).rejects.toBeInstanceOf(MissingAuthTokenError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejected credentials clear the stored session token', async () => {
    setAuthToken(VALID_TOKEN);
    mockFetch({ status: 401 });

    await expect(patientService.getByMrn('MRN001234')).rejects.toBeInstanceOf(UnauthorizedError);
    expect(getAuthToken()).toBeNull();
  });

  test('an expired or malformed token is not treated as a session', async () => {
    const fetchMock = mockFetch({ status: 200 });

    setAuthToken(jwt(-60));
    await expect(patientService.getById(1)).rejects.toBeInstanceOf(MissingAuthTokenError);

    setAuthToken('not-a-jwt');
    await expect(patientService.getById(1)).rejects.toBeInstanceOf(MissingAuthTokenError);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('the session ends at token expiry without any further request', () => {
    jest.useFakeTimers();
    const listener = jest.fn();
    const fakeWindow = new EventTarget();
    Object.defineProperty(globalThis, 'window', {
      value: fakeWindow,
      configurable: true,
      writable: true,
    });
    fakeWindow.addEventListener(UNAUTHORIZED_EVENT, listener);

    try {
      setAuthToken(jwt(60));
      jest.advanceTimersByTime(60_000);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(getAuthToken()).toBeNull();

      // A delay past setTimeout's 32-bit limit must re-arm, not fire at once.
      listener.mockClear();
      setAuthToken(jwt(60 * 24 * 3600));
      jest.advanceTimersByTime(2_147_483_647);
      expect(listener).not.toHaveBeenCalled();
    } finally {
      fakeWindow.removeEventListener(UNAUTHORIZED_EVENT, listener);
      delete (globalThis as { window?: unknown }).window;
      jest.useRealTimers();
    }
  });

  test('clearing the token notifies the app so the session UI closes', () => {
    const listener = jest.fn();
    const fakeWindow = new EventTarget();
    Object.defineProperty(globalThis, 'window', {
      value: fakeWindow,
      configurable: true,
      writable: true,
    });
    fakeWindow.addEventListener(UNAUTHORIZED_EVENT, listener);

    try {
      setAuthToken(VALID_TOKEN);
      clearAuthToken();
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      fakeWindow.removeEventListener(UNAUTHORIZED_EVENT, listener);
      delete (globalThis as { window?: unknown }).window;
    }
  });
});
