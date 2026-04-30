import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SchedulePage from '../SchedulePage'

const renderSchedule = () =>
  render(
    <MemoryRouter>
      <SchedulePage />
    </MemoryRouter>
  )

describe('SchedulePage', () => {
  it('renders schedule page', () => {
    renderSchedule()
    expect(screen.getByText(/New Appt/)).toBeInTheDocument()
  })

  it('renders appointment entries in the schedule', () => {
    renderSchedule()
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBeGreaterThan(0)
  })

  it('renders new appointment button', () => {
    renderSchedule()
    expect(screen.getByText(/New Appt/)).toBeInTheDocument()
  })

  it('renders view filter buttons', () => {
    renderSchedule()
    const buttons = screen.getAllByRole('button')
    const buttonTexts = buttons.map(b => b.textContent)
    expect(buttonTexts.some(t => t?.includes('All'))).toBe(true)
  })

  it('opens new appointment dialog', async () => {
    const user = userEvent.setup()
    renderSchedule()

    await user.click(screen.getByText(/New Appt/).closest('button')!)
    const modal = document.querySelector('.fixed.inset-0')
    expect(modal).toBeInTheDocument()
  })
})
