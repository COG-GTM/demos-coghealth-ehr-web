import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import LabResultsPage from './LabResultsPage';

describe('LabResultsPage', () => {
  it('renders without crashing', () => {
    render(<LabResultsPage />);
    expect(screen.getByText('Laboratory Results')).toBeInTheDocument();
  });

  it('basic structure renders', () => {
    render(<LabResultsPage />);
    expect(screen.getByText(/Basic Metabolic Panel/)).toBeInTheDocument();
  });
});
