import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('fires onClick handler', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled').closest('button')).toBeDisabled();
  });

  it('is disabled when loading prop is true', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByText('Loading').closest('button')).toBeDisabled();
  });

  it('shows spinner icon when loading', () => {
    const { container } = render(<Button loading>Loading</Button>);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('applies primary variant class by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByText('Primary').closest('button');
    expect(btn?.className).toContain('ehr-button-primary');
  });

  it('does not apply primary class for secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByText('Secondary').closest('button');
    expect(btn?.className).not.toContain('ehr-button-primary');
  });

  it('applies danger styles for danger variant', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByText('Delete').closest('button');
    expect(btn).toHaveStyle({ color: 'rgb(255, 255, 255)' });
  });

  it('applies ghost styles for ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByText('Ghost').closest('button');
    expect(btn).toHaveStyle({ background: 'transparent' });
  });

  it('forwards ref to button element', () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>Ref Test</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('applies additional className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const btn = screen.getByText('Custom').closest('button');
    expect(btn?.className).toContain('custom-class');
  });
});
