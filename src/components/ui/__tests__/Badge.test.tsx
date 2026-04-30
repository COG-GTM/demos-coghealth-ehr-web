import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Badge from '../Badge'

describe('Badge', () => {
  it('renders with children text', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies default variant styles', () => {
    render(<Badge>Default</Badge>)
    const badge = screen.getByText('Default')
    expect(badge).toHaveStyle({ background: '#e8e8e8' })
  })

  it('applies success variant styles', () => {
    render(<Badge variant="success">Success</Badge>)
    const badge = screen.getByText('Success')
    expect(badge).toHaveStyle({ background: '#d4edda', color: '#155724' })
  })

  it('applies warning variant styles', () => {
    render(<Badge variant="warning">Warning</Badge>)
    const badge = screen.getByText('Warning')
    expect(badge).toHaveStyle({ background: '#fff3cd' })
  })

  it('applies danger variant styles', () => {
    render(<Badge variant="danger">Critical</Badge>)
    const badge = screen.getByText('Critical')
    expect(badge).toHaveStyle({ background: '#ffcccc', color: '#990000' })
  })

  it('applies info variant styles', () => {
    render(<Badge variant="info">Info</Badge>)
    const badge = screen.getByText('Info')
    expect(badge).toHaveStyle({ background: '#cce5ff' })
  })

  it('merges custom className', () => {
    render(<Badge className="ml-2">Custom</Badge>)
    const badge = screen.getByText('Custom')
    expect(badge.className).toContain('ml-2')
  })

  it('renders as a span element', () => {
    render(<Badge>Span</Badge>)
    const badge = screen.getByText('Span')
    expect(badge.tagName).toBe('SPAN')
  })
})
