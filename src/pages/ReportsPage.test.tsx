import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import ReportsPage from './ReportsPage';

describe('ReportsPage', () => {
  it('renders without crashing', () => {
    render(<ReportsPage />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('basic structure renders', () => {
    render(<ReportsPage />);
    expect(screen.getByText('Clinical Reports')).toBeInTheDocument();
    expect(screen.getByText('Operational Reports')).toBeInTheDocument();
    expect(screen.getByText('Financial Reports')).toBeInTheDocument();
    expect(screen.getByText('Compliance Reports')).toBeInTheDocument();
  });
});
