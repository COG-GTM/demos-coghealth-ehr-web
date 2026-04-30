import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Input from '../Input'

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<Input label="First Name" />)
    expect(screen.getByLabelText('First Name')).toBeInTheDocument()
  })

  it('generates id from label', () => {
    render(<Input label="First Name" />)
    const input = screen.getByLabelText('First Name')
    expect(input.id).toBe('first-name')
  })

  it('uses provided id over generated one', () => {
    render(<Input label="Name" id="custom-id" />)
    const input = screen.getByLabelText('Name')
    expect(input.id).toBe('custom-id')
  })

  it('displays error message', () => {
    render(<Input error="Required field" />)
    expect(screen.getByText('Required field')).toBeInTheDocument()
  })

  it('applies error border class when error is present', () => {
    render(<Input error="Required" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input.className).toContain('border-red-500')
  })

  it('displays helper text when no error', () => {
    render(<Input helperText="Enter your full name" />)
    expect(screen.getByText('Enter your full name')).toBeInTheDocument()
  })

  it('does not display helper text when error is present', () => {
    render(<Input error="Required" helperText="Enter your full name" />)
    expect(screen.queryByText('Enter your full name')).not.toBeInTheDocument()
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('handles user typing', async () => {
    const user = userEvent.setup()
    render(<Input placeholder="Type here" />)
    const input = screen.getByPlaceholderText('Type here')

    await user.type(input, 'Hello')
    expect(input).toHaveValue('Hello')
  })

  it('calls onChange when typing', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()
    render(<Input onChange={handleChange} placeholder="Type" />)

    await user.type(screen.getByPlaceholderText('Type'), 'A')
    expect(handleChange).toHaveBeenCalled()
  })

  it('forwards ref to input element', () => {
    const ref = vi.fn()
    render(<Input ref={ref} />)
    expect(ref).toHaveBeenCalled()
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLInputElement)
  })

  it('merges custom className', () => {
    render(<Input className="custom-input" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input.className).toContain('custom-input')
    expect(input.className).toContain('ehr-input')
  })
})
