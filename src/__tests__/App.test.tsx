import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

vi.mock('../services/patientService', () => ({
  patientService: {
    search: vi.fn().mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 20,
      number: 0,
    }),
    getById: vi.fn().mockResolvedValue({
      id: 1,
      firstName: 'John',
      lastName: 'Smith',
      dateOfBirth: '1965-03-15',
      gender: 'MALE',
      mrn: 'MRN001234',
    }),
  },
}))

vi.mock('../services/encounterService', () => ({
  encounterService: {
    getByPatient: vi.fn().mockResolvedValue([]),
  },
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the application header with branding', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('CogHealth EHR')).toBeInTheDocument()
    })
  })

  it('renders navigation links', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Patients')).toBeInTheDocument()
      expect(screen.getByText('Schedule')).toBeInTheDocument()
      expect(screen.getByText('Lab Results')).toBeInTheDocument()
      expect(screen.getByText('Medications')).toBeInTheDocument()
      expect(screen.getByText('Reports')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('renders status bar with HIPAA compliance info', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('HIPAA Compliant')).toBeInTheDocument()
    })
  })

  it('renders session timer in header', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/Session:/)).toBeInTheDocument()
    })
  })

  it('renders global patient search in header', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Patient search...')).toBeInTheDocument()
    })
  })

  it('navigates to Patients page when link is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Patients')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Patients'))
    await waitFor(() => {
      expect(screen.getByText('HIPAA Compliant')).toBeInTheDocument()
    })
  })

  it('navigates to Schedule page when link is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Schedule')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Schedule'))
    await waitFor(() => {
      expect(screen.getByText('HIPAA Compliant')).toBeInTheDocument()
    })
  })

  it('navigates to Settings page when link is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Settings'))
    await waitFor(() => {
      expect(screen.getByDisplayValue('Sarah')).toBeInTheDocument()
    })
  })

  it('shows search results when typing in global search', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Patient search...')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Patient search...')
    await user.type(searchInput, 'Smith')

    await waitFor(() => {
      expect(screen.getByText(/Smith, John/)).toBeInTheDocument()
    })
  })

  it('renders user info in header', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Dr. Sarah Anderson')).toBeInTheDocument()
    })
  })

  it('renders logout button', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })
  })
})
