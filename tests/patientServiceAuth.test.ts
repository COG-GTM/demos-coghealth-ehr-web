import { patientService } from '../src/services/patientService';
import {
  AUTH_SESSION_KEY,
  AuthenticationRequiredError,
  UNAUTHORIZED_EVENT,
  clearSession,
  getSession,
  setSession,
} from '../src/services/authService';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
  key(index: number) { return Array.from(this.data.keys())[index] ?? null; }
  get length() { return this.data.size; }
}

const session = {
  token: 'test.jwt.token',
  tokenType: 'Bearer',
  user: { username: 'sanderson', displayName: 'Dr. Sarah Anderson', role: 'Provider' },
};

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `status ${status}`,
    json: async () => body,
  } as Response;
}

describe('patient PHI requests require authentication', () => {
  let fetchMock: jest.Mock;
  let dispatched: string[];

  beforeEach(() => {
    (globalThis as unknown as { sessionStorage: Storage }).sessionStorage =
      new MemoryStorage() as unknown as Storage;
    dispatched = [];
    (globalThis as unknown as { window: Window }).window = {
      dispatchEvent: (event: Event) => { dispatched.push(event.type); return true; },
    } as unknown as Window;
    fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { id: 1 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    clearSession();
  });

  it('attaches a bearer token to every PHI request', async () => {
    setSession(session);

    await patientService.getById(1);
    await patientService.getByMrn('MRN001234');
    await patientService.search('smith');
    await patientService.create({ firstName: 'John' });
    await patientService.update(1, { firstName: 'John' });

    expect(fetchMock).toHaveBeenCalledTimes(5);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers.Authorization).toBe('Bearer test.jwt.token');
    }
  });

  it('refuses to issue PHI requests when there is no session', async () => {
    await expect(patientService.search('smith')).rejects.toBeInstanceOf(AuthenticationRequiredError);
    await expect(patientService.getById(1)).rejects.toBeInstanceOf(AuthenticationRequiredError);
    await expect(patientService.create({ firstName: 'John' })).rejects.toBeInstanceOf(
      AuthenticationRequiredError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clears the session and signals the app when the API rejects the token', async () => {
    setSession(session);
    fetchMock.mockResolvedValueOnce(jsonResponse(401, {}));

    await expect(patientService.getById(1)).rejects.toBeInstanceOf(AuthenticationRequiredError);
    expect(getSession()).toBeNull();
    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
    expect(dispatched).toEqual([UNAUTHORIZED_EVENT]);
  });
});
