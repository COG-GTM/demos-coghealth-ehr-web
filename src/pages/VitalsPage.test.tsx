import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import VitalsPage from './VitalsPage';

describe('VitalsPage', () => {
  it('renders without crashing', () => {
    render(<VitalsPage />);
    expect(screen.getByText('Vital Signs Flowsheet')).toBeInTheDocument();
  });

  it('basic structure renders', () => {
    render(<VitalsPage />);
    expect(screen.getByText(/Smith, John/)).toBeInTheDocument();
    expect(screen.getByText(/MRN001234/)).toBeInTheDocument();
  });
});
