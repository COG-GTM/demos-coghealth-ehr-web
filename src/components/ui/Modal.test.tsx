import { render, screen, fireEvent } from '@testing-library/react';
import { Modal, ConfirmDialog, AlertDialog } from './Modal';

describe('Modal', () => {
  it('renders nothing when not open', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={jest.fn()} title="Test">Content</Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and content when open', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Modal">
        Modal Content
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Test">Content</Modal>
    );
    const closeBtn = container.querySelector('button');
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Test">Content</Modal>
    );
    const backdrop = container.querySelector('.bg-black\\/50');
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">Content</Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders footer when provided', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test" footer={<button>Save</button>}>
        Content
      </Modal>
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('sets body overflow hidden when open', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test">Content</Modal>
    );
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body overflow when unmounted', () => {
    const { unmount } = render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test">Content</Modal>
    );
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('ConfirmDialog', () => {
  it('renders message text', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm"
        message="Are you sure?"
      />
    );
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('renders default button text', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm"
        message="Sure?"
      />
    );
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders custom button text', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm Delete"
        message="Delete this?"
        confirmText="Delete"
        cancelText="Keep"
      />
    );
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  it('calls onConfirm and onClose when confirm button clicked', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Confirm"
        message="Sure?"
      />
    );
    fireEvent.click(screen.getByText('OK'));
    expect(onConfirm).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when cancel button clicked', () => {
    const onClose = jest.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={jest.fn()}
        title="Confirm"
        message="Sure?"
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('AlertDialog', () => {
  it('renders title and message', () => {
    render(
      <AlertDialog
        isOpen={true}
        onClose={jest.fn()}
        title="Alert"
        message="Something happened"
      />
    );
    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByText('Something happened')).toBeInTheDocument();
  });

  it('renders OK button', () => {
    render(
      <AlertDialog
        isOpen={true}
        onClose={jest.fn()}
        title="Alert"
        message="Info"
      />
    );
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('calls onClose when OK is clicked', () => {
    const onClose = jest.fn();
    render(
      <AlertDialog
        isOpen={true}
        onClose={onClose}
        title="Alert"
        message="Info"
      />
    );
    fireEvent.click(screen.getByText('OK'));
    expect(onClose).toHaveBeenCalled();
  });

  it('applies info background color by default', () => {
    render(
      <AlertDialog
        isOpen={true}
        onClose={jest.fn()}
        title="Alert"
        message="Info message"
      />
    );
    const msgContainer = screen.getByText('Info message').parentElement;
    expect(msgContainer).toHaveStyle({ background: '#cce5ff' });
  });

  it('applies error background color', () => {
    render(
      <AlertDialog
        isOpen={true}
        onClose={jest.fn()}
        title="Error"
        message="Error message"
        type="error"
      />
    );
    const msgContainer = screen.getByText('Error message').parentElement;
    expect(msgContainer).toHaveStyle({ background: '#f8d7da' });
  });

  it('applies success background color', () => {
    render(
      <AlertDialog
        isOpen={true}
        onClose={jest.fn()}
        title="Success"
        message="Success message"
        type="success"
      />
    );
    const msgContainer = screen.getByText('Success message').parentElement;
    expect(msgContainer).toHaveStyle({ background: '#d4edda' });
  });

  it('applies warning background color', () => {
    render(
      <AlertDialog
        isOpen={true}
        onClose={jest.fn()}
        title="Warning"
        message="Warning message"
        type="warning"
      />
    );
    const msgContainer = screen.getByText('Warning message').parentElement;
    expect(msgContainer).toHaveStyle({ background: '#fff3cd' });
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AlertDialog
        isOpen={false}
        onClose={jest.fn()}
        title="Alert"
        message="Hidden"
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
