import { render, screen } from '@testing-library/react';
import Card, { CardHeader } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('applies medium padding by default', () => {
    const { container } = render(<Card>Test</Card>);
    const card = container.firstElementChild;
    expect(card?.className).toContain('p-3');
  });

  it('applies no padding when padding="none"', () => {
    const { container } = render(<Card padding="none">Test</Card>);
    const card = container.firstElementChild;
    expect(card?.className).not.toContain('p-2');
    expect(card?.className).not.toContain('p-3');
    expect(card?.className).not.toContain('p-4');
  });

  it('applies small padding', () => {
    const { container } = render(<Card padding="sm">Test</Card>);
    const card = container.firstElementChild;
    expect(card?.className).toContain('p-2');
  });

  it('applies large padding', () => {
    const { container } = render(<Card padding="lg">Test</Card>);
    const card = container.firstElementChild;
    expect(card?.className).toContain('p-4');
  });

  it('applies ehr-panel class', () => {
    const { container } = render(<Card>Test</Card>);
    const card = container.firstElementChild;
    expect(card?.className).toContain('ehr-panel');
  });

  it('applies additional className', () => {
    const { container } = render(<Card className="extra">Test</Card>);
    const card = container.firstElementChild;
    expect(card?.className).toContain('extra');
  });
});

describe('CardHeader', () => {
  it('renders title', () => {
    render(<CardHeader title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<CardHeader title="Title" subtitle="Subtitle text" />);
    expect(screen.getByText('Subtitle text')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(<CardHeader title="Title" />);
    const spans = container.querySelectorAll('span');
    expect(spans).toHaveLength(1);
  });

  it('renders action when provided', () => {
    render(<CardHeader title="Title" action={<button>Action</button>} />);
    expect(screen.getByText('Action')).toBeInTheDocument();
  });
});
