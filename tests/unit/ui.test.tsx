import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Badge from '../../src/components/ui/Badge';
import Button from '../../src/components/ui/Button';
import Card, { CardHeader } from '../../src/components/ui/Card';
import Input from '../../src/components/ui/Input';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies variant-specific styling', () => {
    render(<Badge variant="danger">Critical</Badge>);
    const badge = screen.getByText('Critical');
    expect(badge).toHaveStyle({ background: '#ffcccc' });
  });
});

describe('Button', () => {
  it('renders children and handles clicks', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and unclickable while loading', async () => {
    const onClick = jest.fn();
    render(<Button loading onClick={onClick}>Submit</Button>);
    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('respects the disabled prop', () => {
    render(<Button disabled>Nope</Button>);
    expect(screen.getByRole('button', { name: 'Nope' })).toBeDisabled();
  });
});

describe('Card', () => {
  it('renders children', () => {
    render(<Card>panel body</Card>);
    expect(screen.getByText('panel body')).toBeInTheDocument();
  });

  it('renders a header with title, subtitle and action', () => {
    render(
      <CardHeader
        title="Vitals"
        subtitle="last 24h"
        action={<button>refresh</button>}
      />
    );
    expect(screen.getByText('Vitals')).toBeInTheDocument();
    expect(screen.getByText('last 24h')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'refresh' })).toBeInTheDocument();
  });
});

describe('Input', () => {
  it('associates the label with the input via a derived id', () => {
    render(<Input label="First Name" />);
    const input = screen.getByLabelText('First Name');
    expect(input).toHaveAttribute('id', 'first-name');
  });

  it('shows an error message and hides helper text when errored', () => {
    render(<Input label="Email" error="Required" helperText="we never share it" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.queryByText('we never share it')).not.toBeInTheDocument();
  });

  it('accepts typed input', async () => {
    render(<Input label="MRN" />);
    const input = screen.getByLabelText('MRN');
    await userEvent.type(input, 'MRN001234');
    expect(input).toHaveValue('MRN001234');
  });
});
