import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MedicationsPage from '../MedicationsPage'

const renderMedications = () =>
  render(
    <MemoryRouter>
      <MedicationsPage />
    </MemoryRouter>
  )

describe('MedicationsPage', () => {
  it('renders medications page with toolbar', () => {
    renderMedications()
    expect(screen.getByText(/New Rx/)).toBeInTheDocument()
  })

  it('renders medication table with entries', () => {
    renderMedications()
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBeGreaterThan(1)
  })

  it('renders filter buttons', () => {
    renderMedications()
    const buttons = screen.getAllByRole('button')
    const buttonTexts = buttons.map(b => b.textContent)
    expect(buttonTexts.some(t => t?.includes('All'))).toBe(true)
    expect(buttonTexts.some(t => t?.includes('Active'))).toBe(true)
  })

  it('opens prescription dialog when New Rx is clicked', async () => {
    const user = userEvent.setup()
    renderMedications()

    await user.click(screen.getByText(/New Rx/).closest('button')!)
    await waitFor(() => {
      const modal = document.querySelector('.fixed.inset-0')
      expect(modal).toBeInTheDocument()
    })
  })

  it('selects a medication row', async () => {
    const user = userEvent.setup()
    renderMedications()

    const rows = screen.getAllByRole('row')
    if (rows.length > 1) {
      await user.click(rows[1])
    }
  })
})
