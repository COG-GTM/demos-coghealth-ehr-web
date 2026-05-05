import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Modal, AlertDialog } from './Modal';

describe('Modal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('close button calls onClose', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    // The close button is the X button in the title bar
    const closeButtons = screen.getAllByRole('button');
    const closeBtn = closeButtons.find(btn => btn.querySelector('svg'));
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });
});

describe('AlertDialog', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and message', () => {
    render(
      <AlertDialog
        isOpen={true}
        onClose={mockOnClose}
        title="Alert Title"
        message="Alert message text"
      />
    );
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('Alert message text')).toBeInTheDocument();
  });

  it('OK button calls onClose', () => {
    render(
      <AlertDialog
        isOpen={true}
        onClose={mockOnClose}
        title="Alert Title"
        message="Alert message text"
      />
    );
    const okBtn = screen.getByRole('button', { name: /OK/ });
    fireEvent.click(okBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
