import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Card, { CardHeader } from '../Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies ehr-panel class', () => {
    const { container } = render(<Card>Content</Card>)
    expect(container.firstChild).toHaveClass('ehr-panel')
  })

  it('applies medium padding by default', () => {
    const { container } = render(<Card>Content</Card>)
    expect(container.firstChild).toHaveClass('p-3')
  })

  it('applies no padding when specified', () => {
    const { container } = render(<Card padding="none">Content</Card>)
    expect(container.firstChild).not.toHaveClass('p-2')
    expect(container.firstChild).not.toHaveClass('p-3')
    expect(container.firstChild).not.toHaveClass('p-4')
  })

  it('applies small padding', () => {
    const { container } = render(<Card padding="sm">Content</Card>)
    expect(container.firstChild).toHaveClass('p-2')
  })

  it('applies large padding', () => {
    const { container } = render(<Card padding="lg">Content</Card>)
    expect(container.firstChild).toHaveClass('p-4')
  })

  it('merges custom className', () => {
    const { container } = render(<Card className="custom">Content</Card>)
    expect(container.firstChild).toHaveClass('custom')
    expect(container.firstChild).toHaveClass('ehr-panel')
  })
})

describe('CardHeader', () => {
  it('renders title', () => {
    render(<CardHeader title="Test Title" />)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<CardHeader title="Title" subtitle="Subtitle text" />)
    expect(screen.getByText('Subtitle text')).toBeInTheDocument()
  })

  it('does not render subtitle when not provided', () => {
    const { container } = render(<CardHeader title="Title" />)
    const spans = container.querySelectorAll('span')
    expect(spans).toHaveLength(1)
  })

  it('renders action when provided', () => {
    render(<CardHeader title="Title" action={<button>Action</button>} />)
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })

  it('applies ehr-header class', () => {
    const { container } = render(<CardHeader title="Title" />)
    expect(container.firstChild).toHaveClass('ehr-header')
  })
})
