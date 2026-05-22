import { render, screen } from '@testing-library/react';
import Badge from './Badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies default variant styles', () => {
    render(<Badge>Default</Badge>);
    const el = screen.getByText('Default');
    expect(el).toHaveStyle({ background: '#e8e8e8', color: '#333' });
  });

  it('applies success variant styles', () => {
    render(<Badge variant="success">Success</Badge>);
    const el = screen.getByText('Success');
    expect(el).toHaveStyle({ background: '#d4edda', color: '#155724' });
  });

  it('applies warning variant styles', () => {
    render(<Badge variant="warning">Warning</Badge>);
    const el = screen.getByText('Warning');
    expect(el).toHaveStyle({ background: '#fff3cd', color: '#664d00' });
  });

  it('applies danger variant styles', () => {
    render(<Badge variant="danger">Danger</Badge>);
    const el = screen.getByText('Danger');
    expect(el).toHaveStyle({ background: '#ffcccc', color: '#990000' });
  });

  it('applies info variant styles', () => {
    render(<Badge variant="info">Info</Badge>);
    const el = screen.getByText('Info');
    expect(el).toHaveStyle({ background: '#cce5ff', color: '#004085' });
  });

  it('applies additional className', () => {
    render(<Badge className="extra-class">Test</Badge>);
    const el = screen.getByText('Test');
    expect(el.className).toContain('extra-class');
  });
});
