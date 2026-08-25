import { Page, HTTPRequest } from 'puppeteer';

export interface MockPatient {
  id: number;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  active: boolean;
  deceased?: boolean;
  allergies?: string[];
}

export const mockPatients: MockPatient[] = [
  { id: 1, firstName: 'John', lastName: 'Smith', mrn: 'MRN001234', dateOfBirth: '1965-03-15', gender: 'MALE', phone: '555-0101', email: 'john.smith@example.com', active: true, allergies: ['Penicillin'] },
  { id: 2, firstName: 'Sarah', lastName: 'Johnson', mrn: 'MRN001235', dateOfBirth: '1978-07-22', gender: 'FEMALE', phone: '555-0102', email: 'sarah.johnson@example.com', active: true },
  { id: 3, firstName: 'Michael', lastName: 'Williams', mrn: 'MRN001236', dateOfBirth: '1952-11-08', gender: 'MALE', phone: '555-0103', email: 'michael.williams@example.com', active: true },
  { id: 4, firstName: 'Emily', lastName: 'Brown', mrn: 'MRN001237', dateOfBirth: '1989-04-30', gender: 'FEMALE', phone: '555-0104', email: 'emily.brown@example.com', active: true },
  { id: 5, firstName: 'Robert', lastName: 'Davis', mrn: 'MRN001238', dateOfBirth: '1945-08-20', gender: 'MALE', phone: '555-0105', email: 'robert.davis@example.com', active: false },
  { id: 6, firstName: 'Maria', lastName: 'Martinez', mrn: 'MRN001240', dateOfBirth: '1970-12-05', gender: 'FEMALE', phone: '555-0106', email: 'maria.martinez@example.com', active: true },
  { id: 7, firstName: 'Ana', lastName: 'Garcia', mrn: 'MRN001241', dateOfBirth: '1982-02-14', gender: 'FEMALE', phone: '555-0107', email: 'ana.garcia@example.com', active: true },
  { id: 8, firstName: 'David', lastName: 'Wilson', mrn: 'MRN001242', dateOfBirth: '1961-09-10', gender: 'MALE', phone: '555-0108', email: 'david.wilson@example.com', active: false, deceased: true },
  { id: 9, firstName: 'Linda', lastName: 'Taylor', mrn: 'MRN001243', dateOfBirth: '1975-06-18', gender: 'FEMALE', phone: '555-0109', email: 'linda.taylor@example.com', active: true },
  { id: 10, firstName: 'James', lastName: 'Anderson', mrn: 'MRN001244', dateOfBirth: '1958-01-26', gender: 'MALE', phone: '555-0110', email: 'james.anderson@example.com', active: true },
  { id: 11, firstName: 'Patricia', lastName: 'Thomas', mrn: 'MRN001245', dateOfBirth: '1969-10-02', gender: 'FEMALE', phone: '555-0111', email: 'patricia.thomas@example.com', active: true },
  { id: 12, firstName: 'Thomas', lastName: 'Moore', mrn: 'MRN001246', dateOfBirth: '1949-05-12', gender: 'MALE', phone: '555-0112', email: 'thomas.moore@example.com', active: true },
];

export interface MockApiController {
  setFailure: (failure: boolean) => void;
  dispose: () => void;
}

function jsonResponse(body: unknown, status = 200): Parameters<HTTPRequest['respond']>[0] {
  return {
    status,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body),
  };
}

export async function installMockApi(page: Page): Promise<MockApiController> {
  let failure = false;
  await page.setRequestInterception(true);

  const handler = async (request: HTTPRequest) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://localhost:8080' || !url.pathname.startsWith('/api/')) {
      await request.continue();
      return;
    }
    if (request.method() === 'OPTIONS') {
      await request.respond({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:5173',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
      return;
    }
    if (failure) {
      await request.respond(jsonResponse({ message: 'Mock API failure' }, 500));
      return;
    }

    if (url.pathname === '/api/v1/patients/search') {
      const query = (url.searchParams.get('q') || '').toLowerCase();
      const content = mockPatients.filter((patient) =>
        `${patient.firstName} ${patient.lastName} ${patient.lastName}, ${patient.firstName} ${patient.mrn} ${patient.dateOfBirth} ${patient.phone}`
          .toLowerCase()
          .includes(query),
      );
      await request.respond(jsonResponse({
        content,
        totalElements: content.length,
        totalPages: content.length ? 1 : 0,
        size: Number(url.searchParams.get('size') || 20),
        number: Number(url.searchParams.get('page') || 0),
      }));
      return;
    }

    const patientMatch = url.pathname.match(/^\/api\/v1\/patients\/(\d+)$/);
    if (patientMatch) {
      const patient = mockPatients.find((item) => item.id === Number(patientMatch[1]));
      await request.respond(patient ? jsonResponse(patient) : jsonResponse({ message: 'Not found' }, 404));
      return;
    }

    await request.continue();
  };

  page.on('request', handler);
  return {
    setFailure: (value: boolean) => { failure = value; },
    dispose: () => {
      page.off('request', handler);
      void page.setRequestInterception(false);
    },
  };
}
