import { render, screen } from '@testing-library/react';
import { LoadingOverlay } from './LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders nothing when isLoading is false', () => {
    const { container } = render(<LoadingOverlay isLoading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders overlay when isLoading is true', () => {
    render(<LoadingOverlay isLoading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays default loading text', () => {
    render(<LoadingOverlay isLoading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays custom loading text', () => {
    render(<LoadingOverlay isLoading={true} text="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('renders SVG hourglass animation', () => {
    const { container } = render(<LoadingOverlay isLoading={true} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
