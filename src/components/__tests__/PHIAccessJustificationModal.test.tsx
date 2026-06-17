import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PHIAccessJustificationModal } from '../PHIAccessJustificationModal';

// Mock auditService
const mockLogPHIAccessJustification = vi.fn();
vi.mock('../../services/auditService', () => ({
  logPHIAccessJustification: (...args: unknown[]) => mockLogPHIAccessJustification(...args),
}));

describe('PHIAccessJustificationModal', () => {
  const defaultProps = {
    isOpen: true,
    patientId: 'P001',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all justification options', () => {
    render(<PHIAccessJustificationModal {...defaultProps} />);

    expect(screen.getByLabelText('Treatment')).toBeInTheDocument();
    expect(screen.getByLabelText('Payment')).toBeInTheDocument();
    expect(screen.getByLabelText('Healthcare Operations')).toBeInTheDocument();
    expect(screen.getByLabelText('Patient Request')).toBeInTheDocument();
    expect(screen.getByLabelText('Emergency Access Override')).toBeInTheDocument();
    expect(screen.getByLabelText('Other')).toBeInTheDocument();
  });

  it('renders Confirm Access and Cancel buttons', () => {
    render(<PHIAccessJustificationModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Confirm Access' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('Confirm Access is disabled when no reason selected', () => {
    render(<PHIAccessJustificationModal {...defaultProps} />);

    const confirmButton = screen.getByRole('button', { name: 'Confirm Access' });
    expect(confirmButton).toBeDisabled();
  });

  it('selecting a reason enables the Confirm button', async () => {
    const user = userEvent.setup();
    render(<PHIAccessJustificationModal {...defaultProps} />);

    await user.click(screen.getByLabelText('Treatment'));
    expect(screen.getByRole('button', { name: 'Confirm Access' })).not.toBeDisabled();
  });

  it('clicking Confirm calls logPHIAccessJustification and onConfirm', async () => {
    const user = userEvent.setup();
    render(<PHIAccessJustificationModal {...defaultProps} />);

    await user.click(screen.getByLabelText('Treatment'));
    await user.click(screen.getByRole('button', { name: 'Confirm Access' }));

    expect(mockLogPHIAccessJustification).toHaveBeenCalledWith(
      'P001',
      'Treatment',
      undefined
    );
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('clicking Cancel calls onCancel without logging', async () => {
    const user = userEvent.setup();
    render(<PHIAccessJustificationModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockLogPHIAccessJustification).not.toHaveBeenCalled();
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('selecting Other shows the free-text field', async () => {
    const user = userEvent.setup();
    render(<PHIAccessJustificationModal {...defaultProps} />);

    await user.click(screen.getByLabelText('Other'));

    expect(screen.getByPlaceholderText(/Provide a detailed justification/i)).toBeInTheDocument();
  });

  it('Other with empty text keeps Confirm disabled', async () => {
    const user = userEvent.setup();
    render(<PHIAccessJustificationModal {...defaultProps} />);

    await user.click(screen.getByLabelText('Other'));
    expect(screen.getByRole('button', { name: 'Confirm Access' })).toBeDisabled();
  });

  it('Other with text enables Confirm and logs with details', async () => {
    const user = userEvent.setup();
    render(<PHIAccessJustificationModal {...defaultProps} />);

    await user.click(screen.getByLabelText('Other'));
    await user.type(
      screen.getByPlaceholderText(/Provide a detailed justification/i),
      'Research enrollment'
    );
    await user.click(screen.getByRole('button', { name: 'Confirm Access' }));

    expect(mockLogPHIAccessJustification).toHaveBeenCalledWith(
      'P001',
      'Other',
      'Research enrollment'
    );
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('selecting Emergency Access Override shows warning', async () => {
    const user = userEvent.setup();
    render(<PHIAccessJustificationModal {...defaultProps} />);

    await user.click(screen.getByLabelText('Emergency Access Override'));

    expect(screen.getByText(/Emergency Access Warning/)).toBeInTheDocument();
    expect(screen.getByText(/flagged for mandatory review/i)).toBeInTheDocument();
  });

  it('non-emergency reasons do not show emergency warning', async () => {
    const user = userEvent.setup();
    render(<PHIAccessJustificationModal {...defaultProps} />);

    await user.click(screen.getByLabelText('Treatment'));

    expect(screen.queryByText(/Emergency Access Warning/)).not.toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<PHIAccessJustificationModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('PHI Access Justification Required')).not.toBeInTheDocument();
  });

  it('renders the HIPAA minimum necessary standard notice', () => {
    render(<PHIAccessJustificationModal {...defaultProps} />);

    expect(screen.getByText(/HIPAA Minimum Necessary Standard/)).toBeInTheDocument();
  });

  it('Emergency confirm logs with correct reason', async () => {
    const user = userEvent.setup();
    render(<PHIAccessJustificationModal {...defaultProps} />);

    await user.click(screen.getByLabelText('Emergency Access Override'));
    await user.click(screen.getByRole('button', { name: 'Confirm Access' }));

    expect(mockLogPHIAccessJustification).toHaveBeenCalledWith(
      'P001',
      'Emergency Access Override',
      undefined
    );
  });

  it('switching from Other to Treatment hides the text field', async () => {
    const user = userEvent.setup();
    render(<PHIAccessJustificationModal {...defaultProps} />);

    await user.click(screen.getByLabelText('Other'));
    expect(screen.getByPlaceholderText(/Provide a detailed justification/i)).toBeInTheDocument();

    await user.click(screen.getByLabelText('Treatment'));
    expect(screen.queryByPlaceholderText(/Provide a detailed justification/i)).not.toBeInTheDocument();
  });
});
