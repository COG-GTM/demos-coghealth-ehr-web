const testPatients = [
  {
    id: 1,
    mrn: 'MRN001234',
    firstName: 'John',
    lastName: 'Smith',
    dateOfBirth: '1965-03-15',
    gender: 'MALE' as const,
    phoneMobile: '(555) 123-4567',
    email: 'john.smith@email.com',
    active: true,
  },
  {
    id: 2,
    mrn: 'MRN001235',
    firstName: 'Sarah',
    lastName: 'Johnson',
    dateOfBirth: '1978-07-22',
    gender: 'FEMALE' as const,
    phoneMobile: '(555) 234-5678',
    email: 'sarah.j@email.com',
    active: true,
  },
  {
    id: 3,
    mrn: 'MRN001236',
    firstName: 'Michael',
    lastName: 'Williams',
    dateOfBirth: '1952-11-08',
    gender: 'MALE' as const,
    phoneMobile: '(555) 345-6789',
    active: true,
  },
];

export const patientService = {
  search: jest.fn().mockResolvedValue({
    content: testPatients,
    totalElements: 3,
    totalPages: 1,
    size: 20,
    number: 0,
  }),
  getById: jest.fn().mockResolvedValue(testPatients[0]),
  getByMrn: jest.fn().mockResolvedValue(testPatients[0]),
  create: jest.fn().mockResolvedValue(testPatients[0]),
  update: jest.fn().mockResolvedValue(testPatients[0]),
};
