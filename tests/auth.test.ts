import { installSessionStorageMock } from './mocks/sessionStorage';

installSessionStorageMock();

import { patientService } from '../src/services/patientService';
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
  MissingAuthTokenError,
  UnauthorizedError,
} from '../src/services/authToken';

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
    setAuthToken('test-token');
    const fetchMock = mockFetch({ status: 200 });

    await patientService.getById(1);

    expect(headersOf(fetchMock).Authorization).toBe('Bearer test-token');
  });

  test('patient search attaches a bearer token', async () => {
    setAuthToken('test-token');
    const fetchMock = mockFetch({ status: 200 });

    await patientService.search('smith');

    expect(headersOf(fetchMock).Authorization).toBe('Bearer test-token');
  });

  test('patient create attaches a bearer token', async () => {
    setAuthToken('test-token');
    const fetchMock = mockFetch({ status: 200 });

    await patientService.create({ mrn: 'MRN001234' });

    expect(headersOf(fetchMock).Authorization).toBe('Bearer test-token');
  });

  test('unauthenticated PHI request is never sent to the network', async () => {
    const fetchMock = mockFetch({ status: 200 });

    await expect(patientService.getById(1)).rejects.toBeInstanceOf(MissingAuthTokenError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejected credentials clear the stored session token', async () => {
    setAuthToken('expired-token');
    mockFetch({ status: 401 });

    await expect(patientService.getByMrn('MRN001234')).rejects.toBeInstanceOf(UnauthorizedError);
    expect(getAuthToken()).toBeNull();
  });
});
