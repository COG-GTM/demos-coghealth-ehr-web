import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ReportsPage from '../ReportsPage'

const renderReports = () =>
  render(
    <MemoryRouter>
      <ReportsPage />
    </MemoryRouter>
  )

describe('ReportsPage', () => {
  it('renders reports table', () => {
    renderReports()
    expect(screen.getByText('Daily Patient Census')).toBeInTheDocument()
    expect(screen.getByText('Provider Productivity')).toBeInTheDocument()
  })

  it('renders category filter', () => {
    renderReports()
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
  })

  it('filters reports by category', async () => {
    const user = userEvent.setup()
    renderReports()

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'clinical')

    await waitFor(() => {
      expect(screen.getByText('Medication Reconciliation')).toBeInTheDocument()
      expect(screen.getByText('Lab Results Pending Review')).toBeInTheDocument()
    })
  })

  it('shows run buttons for reports', () => {
    renderReports()
    const runButtons = screen.getAllByRole('button')
    const hasRun = runButtons.some(b => b.textContent?.includes('Run'))
    expect(hasRun).toBe(true)
  })

  it('opens alert dialog when running a report', async () => {
    const user = userEvent.setup()
    renderReports()

    const runButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes('Run'))
    if (runButtons.length > 0) {
      await user.click(runButtons[0])
      await waitFor(() => {
        const modal = document.querySelector('.fixed.inset-0')
        expect(modal).toBeInTheDocument()
      })
    }
  })

  it('renders dashboard metrics section', () => {
    renderReports()
    expect(screen.getByText("Today's Summary")).toBeInTheDocument()
  })
})
