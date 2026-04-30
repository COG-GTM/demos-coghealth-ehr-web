import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingOverlay } from '../LoadingOverlay'

describe('LoadingOverlay', () => {
  it('renders when isLoading is true', () => {
    render(<LoadingOverlay isLoading={true} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('does not render when isLoading is false', () => {
    render(<LoadingOverlay isLoading={false} />)
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('displays custom text', () => {
    render(<LoadingOverlay isLoading={true} text="Saving data..." />)
    expect(screen.getByText('Saving data...')).toBeInTheDocument()
  })

  it('renders an SVG hourglass animation', () => {
    const { container } = render(<LoadingOverlay isLoading={true} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})
