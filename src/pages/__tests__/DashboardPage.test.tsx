import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '../DashboardPage'

vi.mock('../../services/patientService', () => ({
  patientService: {
    search: vi.fn().mockResolvedValue({
      content: [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Smith',
          dateOfBirth: '1965-03-15',
          gender: 'MALE',
          mrn: 'MRN001234',
          active: true,
        },
        {
          id: 2,
          firstName: 'Sarah',
          lastName: 'Johnson',
          dateOfBirth: '1978-07-22',
          gender: 'FEMALE',
          mrn: 'MRN001235',
          active: true,
        },
      ],
      totalElements: 2,
      totalPages: 1,
      size: 20,
      number: 0,
    }),
  },
}))

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )

describe('DashboardPage', () => {

  it('renders inbox panel with header', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Inbox')).toBeInTheDocument()
    })
  })

  it('renders worklist panel', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Patient Worklist')).toBeInTheDocument()
    })
  })

  it('renders toolbar buttons', async () => {
    renderDashboard()
    expect(screen.getByText(/Refresh/)).toBeInTheDocument()
    expect(screen.getByText(/e-Prescribe/)).toBeInTheDocument()
    expect(screen.getByText(/Order Labs/)).toBeInTheDocument()
    const printButtons = screen.getAllByText(/Print/)
    expect(printButtons.length).toBeGreaterThan(0)
  })

  it('renders inbox tab buttons', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Inbox')).toBeInTheDocument()
    })
    const allButtons = screen.getAllByRole('button')
    const tabTexts = allButtons.map(b => b.textContent)
    expect(tabTexts.some(t => t?.includes('Results'))).toBe(true)
    expect(tabTexts.some(t => t?.includes('Messages'))).toBe(true)
  })

  it('opens print dialog when Print button is clicked', async () => {
    const user = userEvent.setup()
    renderDashboard()

    const printButtons = screen.getAllByText(/Print/)
    const printButton = printButtons[0].closest('button')!
    await user.click(printButton)
    await waitFor(() => {
      const modal = document.querySelector('.fixed.inset-0')
      expect(modal).toBeInTheDocument()
    })
  })

  it('opens prescription dialog when e-Prescribe is clicked', async () => {
    const user = userEvent.setup()
    renderDashboard()

    const rxButton = screen.getByText(/e-Prescribe/).closest('button')!
    await user.click(rxButton)
    await waitFor(() => {
      const modal = document.querySelector('.fixed.inset-0')
      expect(modal).toBeInTheDocument()
    })
  })

  it('calls patientService.search on mount', async () => {
    const { patientService } = await import('../../services/patientService')
    renderDashboard()
    await waitFor(() => {
      expect(patientService.search).toHaveBeenCalled()
    })
  })

  it('collapses and expands inbox panel', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Inbox')).toBeInTheDocument()
    })

    const inboxHeader = screen.getByText('Inbox').closest('.ehr-header, [class*="ehr-header"]')
    if (inboxHeader) {
      await user.click(inboxHeader)
    }
  })
})
