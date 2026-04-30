import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal, ConfirmDialog, AlertDialog } from '../Modal'

describe('Modal', () => {
  it('renders when open', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    )
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Hidden Modal">
        <p>Hidden content</p>
      </Modal>
    )
    expect(screen.queryByText('Hidden Modal')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <Modal isOpen={true} onClose={onClose} title="Closable">
        <p>Content</p>
      </Modal>
    )

    const closeButtons = screen.getAllByRole('button')
    await user.click(closeButtons[0])
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Backdrop">
        <p>Content</p>
      </Modal>
    )

    const backdrop = container.querySelector('.bg-black\\/50')
    if (backdrop) {
      await user.click(backdrop)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <Modal isOpen={true} onClose={onClose} title="Escapable">
        <p>Content</p>
      </Modal>
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('renders footer when provided', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="With Footer" footer={<button>Save</button>}>
        <p>Content</p>
      </Modal>
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})

describe('ConfirmDialog', () => {
  it('renders with title and message', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm Action"
        message="Are you sure?"
      />
    )
    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('renders OK and Cancel buttons by default', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm"
        message="Sure?"
      />
    )
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('uses custom button text', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete"
        message="Delete this?"
        confirmText="Yes, Delete"
        cancelText="No, Keep"
      />
    )
    expect(screen.getByRole('button', { name: 'Yes, Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No, Keep' })).toBeInTheDocument()
  })

  it('calls onConfirm and onClose when confirm button is clicked', async () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Confirm"
        message="Sure?"
      />
    )

    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(onConfirm).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when cancel button is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Confirm"
        message="Sure?"
      />
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('AlertDialog', () => {
  it('renders with title and message', () => {
    render(
      <AlertDialog
        isOpen={true}
        onClose={vi.fn()}
        title="Alert"
        message="Something happened"
      />
    )
    expect(screen.getByText('Alert')).toBeInTheDocument()
    expect(screen.getByText('Something happened')).toBeInTheDocument()
  })

  it('renders OK button', () => {
    render(
      <AlertDialog
        isOpen={true}
        onClose={vi.fn()}
        title="Info"
        message="Note this"
      />
    )
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument()
  })

  it('applies info background by default', () => {
    render(
      <AlertDialog
        isOpen={true}
        onClose={vi.fn()}
        title="Info"
        message="Info message"
      />
    )
    const messageBox = screen.getByText('Info message').closest('div')
    expect(messageBox).toHaveStyle({ background: '#cce5ff' })
  })

  it('applies error background', () => {
    render(
      <AlertDialog
        isOpen={true}
        onClose={vi.fn()}
        title="Error"
        message="Error occurred"
        type="error"
      />
    )
    const messageBox = screen.getByText('Error occurred').closest('div')
    expect(messageBox).toHaveStyle({ background: '#f8d7da' })
  })

  it('calls onClose when OK is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <AlertDialog
        isOpen={true}
        onClose={onClose}
        title="Info"
        message="Note"
      />
    )

    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(onClose).toHaveBeenCalled()
  })
})
