import { render, screen, fireEvent } from '@testing-library/react';
import Input from './Input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Input label="First Name" />);
    expect(screen.getByText('First Name')).toBeInTheDocument();
  });

  it('generates id from label text', () => {
    render(<Input label="First Name" />);
    const input = screen.getByLabelText('First Name');
    expect(input.id).toBe('first-name');
  });

  it('uses provided id over generated one', () => {
    render(<Input label="Name" id="custom-id" />);
    const input = screen.getByLabelText('Name');
    expect(input.id).toBe('custom-id');
  });

  it('displays error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('applies error border class when error exists', () => {
    render(<Input error="Error" data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input.className).toContain('border-red-500');
  });

  it('displays helper text when no error', () => {
    render(<Input helperText="Enter your full name" />);
    expect(screen.getByText('Enter your full name')).toBeInTheDocument();
  });

  it('hides helper text when error is present', () => {
    render(<Input error="Required" helperText="Enter your full name" />);
    expect(screen.queryByText('Enter your full name')).not.toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('handles onChange events', () => {
    const onChange = jest.fn();
    render(<Input onChange={onChange} placeholder="type here" />);
    fireEvent.change(screen.getByPlaceholderText('type here'), { target: { value: 'test' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('forwards ref to input element', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('applies additional className', () => {
    render(<Input className="custom" data-testid="input" />);
    expect(screen.getByTestId('input').className).toContain('custom');
  });
});
