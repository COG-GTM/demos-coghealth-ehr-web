import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SettingsPage from '../SettingsPage'

const renderSettings = () =>
  render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  )

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders settings page with tab buttons', () => {
    renderSettings()
    const buttons = screen.getAllByRole('button')
    const buttonTexts = buttons.map(b => b.textContent)
    expect(buttonTexts.some(t => t?.includes('Profile'))).toBe(true)
    expect(buttonTexts.some(t => t?.includes('Notifications'))).toBe(true)
    expect(buttonTexts.some(t => t?.includes('Security'))).toBe(true)
    expect(buttonTexts.some(t => t?.includes('Appearance'))).toBe(true)
  })

  it('displays user profile fields', () => {
    renderSettings()
    expect(screen.getByDisplayValue('Sarah')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Anderson')).toBeInTheDocument()
  })

  it('switches to Notifications tab', async () => {
    const user = userEvent.setup()
    renderSettings()

    const notifButton = screen.getAllByRole('button').find(b => b.textContent?.includes('Notifications'))!
    await user.click(notifButton)
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)
    })
  })

  it('switches to Security tab', async () => {
    const user = userEvent.setup()
    renderSettings()

    const secButton = screen.getAllByRole('button').find(b => b.textContent?.includes('Security'))!
    await user.click(secButton)
    await waitFor(() => {
      expect(screen.getByText('Security Settings')).toBeInTheDocument()
    })
  })

  it('switches to Appearance tab', async () => {
    const user = userEvent.setup()
    renderSettings()

    const appButton = screen.getAllByRole('button').find(b => b.textContent?.includes('Appearance'))!
    await user.click(appButton)
    await waitFor(() => {
      expect(screen.getByText(/Theme/i)).toBeInTheDocument()
    })
  })

  it('shows Save Changes button', () => {
    renderSettings()
    const saveButton = screen.getAllByRole('button').find(b => b.textContent?.includes('Save'))
    expect(saveButton).toBeDefined()
  })

  it('updates profile fields when typing', async () => {
    const user = userEvent.setup()
    renderSettings()

    const firstNameInput = screen.getByDisplayValue('Sarah')
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Jane')
    expect(firstNameInput).toHaveValue('Jane')
  })

  it('saves settings when Save Changes is clicked', async () => {
    const user = userEvent.setup()
    renderSettings()

    const saveButton = screen.getAllByRole('button').find(b => b.textContent?.includes('Save'))!
    await user.click(saveButton)
    await waitFor(() => {
      const savedButton = screen.getAllByRole('button').find(b => b.textContent?.includes('Saved'))
      expect(savedButton).toBeDefined()
    })
  })
})
