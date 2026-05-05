import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { LoadingOverlay } from './LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders loading text when isLoading is true', () => {
    render(<LoadingOverlay isLoading={true} text="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('renders default text when no text prop provided', () => {
    render(<LoadingOverlay isLoading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('does not render when isLoading is false', () => {
    const { container } = render(<LoadingOverlay isLoading={false} />);
    expect(container.firstChild).toBeNull();
  });
});
