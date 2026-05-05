import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../services/patientService');
jest.mock('../services/auditService');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import PatientChartPage from './PatientChartPage';
import { patientService } from '../services/patientService';
import { logPatientAccess } from '../services/auditService';

const mockedPatientService = patientService as jest.Mocked<typeof patientService>;
const mockedLogPatientAccess = logPatientAccess as jest.Mock;

const testPatient = {
  id: 1,
  mrn: 'MRN001234',
  firstName: 'John',
  lastName: 'Smith',
  dateOfBirth: '1965-03-15',
  gender: 'MALE' as const,
  phoneMobile: '(555) 123-4567',
  email: 'john.smith@email.com',
  active: true,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/patients/1']}>
      <Routes>
        <Route path="/patients/:id" element={<PatientChartPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedPatientService.getById.mockResolvedValue(testPatient);
});

async function waitForLoad() {
  await waitFor(() => {
    expect(screen.queryByText('Loading patient...')).not.toBeInTheDocument();
  });
}

describe('PatientChartPage', () => {
  it('renders loading state when patient data is being fetched', () => {
    mockedPatientService.getById.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Loading patient...')).toBeInTheDocument();
  });

  it('fetches patient by ID from URL params on mount', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockedPatientService.getById).toHaveBeenCalledWith(1);
    });
  });

  it('calls logPatientAccess after successful patient fetch', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockedLogPatientAccess).toHaveBeenCalledWith('1', 'MRN001234', 'Smith, John');
    });
  });

  it('displays PatientBanner with patient info', async () => {
    renderPage();
    await waitForLoad();
    const names = screen.getAllByText(/Smith, John/);
    expect(names.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('MRN001234')).toBeInTheDocument();
  });

  it('shows Summary tab by default with Problems, Medications, Allergies panels', async () => {
    renderPage();
    await waitForLoad();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText(/Active Problems/)).toBeInTheDocument();
    // "Medications" text may appear multiple times (tab + panel)
    const medsTexts = screen.getAllByText(/Medications/);
    expect(medsTexts.length).toBeGreaterThanOrEqual(1);
    const allergiesTexts = screen.getAllByText(/Allergies/);
    expect(allergiesTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('tab switching works - click Encounters tab', async () => {
    renderPage();
    await waitForLoad();
    const encountersTab = screen.getByRole('button', { name: /Encounters/ });
    fireEvent.click(encountersTab);
    await waitFor(() => {
      expect(screen.getByText(/Coming soon/)).toBeInTheDocument();
    });
  });

  it('collapsible panels toggle correctly', async () => {
    renderPage();
    await waitForLoad();
    expect(screen.getByText('Type 2 Diabetes Mellitus')).toBeInTheDocument();
    const problemsHeader = screen.getByText(/Active Problems/);
    const clickable = problemsHeader.closest('[class*="cursor-pointer"]') || problemsHeader.closest('.ehr-header');
    if (clickable) {
      fireEvent.click(clickable);
      await waitFor(() => {
        expect(screen.queryByText('Type 2 Diabetes Mellitus')).not.toBeInTheDocument();
      });
    }
  });

  it('toolbar Print button opens print dialog', async () => {
    renderPage();
    await waitForLoad();
    const toolbar = document.querySelector('.ehr-toolbar');
    const printBtn = within(toolbar as HTMLElement).getByRole('button', { name: /Print/i });
    fireEvent.click(printBtn);
    await waitFor(() => {
      expect(screen.getByText('Print Patient Chart')).toBeInTheDocument();
    });
  });

  it('toolbar e-Prescribe button opens dialog', async () => {
    renderPage();
    await waitForLoad();
    const toolbar = document.querySelector('.ehr-toolbar');
    const rxBtn = within(toolbar as HTMLElement).getByText('e-Prescribe');
    fireEvent.click(rxBtn);
    await waitFor(() => {
      expect(screen.getByText('e-Prescribe Medication')).toBeInTheDocument();
    });
  });

  it('toolbar Order Labs button opens dialog', async () => {
    renderPage();
    await waitForLoad();
    const toolbar = document.querySelector('.ehr-toolbar');
    const labBtn = within(toolbar as HTMLElement).getByText('Order Labs');
    fireEvent.click(labBtn);
    await waitFor(() => {
      expect(screen.getByText('Order Laboratory Tests')).toBeInTheDocument();
    });
  });
});
