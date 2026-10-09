import { type ReactNode, type RefObject, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
  role?: 'dialog' | 'alertdialog';
  describedById?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

const widthClasses = {
  sm: 'w-80',
  md: 'w-[480px]',
  lg: 'w-[640px]',
  xl: 'w-[800px]',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const openModalStack: symbol[] = [];

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  width = 'md',
  footer,
  role = 'dialog',
  describedById,
  initialFocusRef,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const modalToken = Symbol('modal');
    openModalStack.push(modalToken);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog) {
      const target = initialFocusRef?.current
        ?? dialog.querySelector<HTMLElement>('[data-autofocus]')
        ?? getFocusable(dialog).find(el => !el.hasAttribute('data-modal-close'))
        ?? dialog;
      target.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (openModalStack[openModalStack.length - 1] !== modalToken) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = getFocusable(dialogRef.current);
      if (focusable.length === 0) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !dialogRef.current.contains(active);
      if (e.shiftKey && (active === first || active === dialogRef.current || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      openModalStack.splice(openModalStack.indexOf(modalToken), 1);
      if (openModalStack.length === 0) document.body.style.overflow = '';
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, initialFocusRef]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedById}
        tabIndex={-1}
        className={`relative ${widthClasses[width]} max-h-[90vh] flex flex-col focus:outline-none`}
        style={{ fontFamily: 'Tahoma, sans-serif' }}
      >
        {/* Window frame */}
        <div className="bg-white border-2 border-gray-400 shadow-lg flex flex-col" style={{ boxShadow: '2px 2px 8px rgba(0,0,0,0.3)' }}>
          {/* Title bar */}
          <div 
            className="flex items-center justify-between px-2 py-1"
            style={{ background: 'linear-gradient(to bottom, #6699cc 0%, #336699 100%)' }}
          >
            <span id={titleId} className="text-white font-semibold text-[11px]">{title}</span>
            <button 
              type="button"
              onClick={onClose}
              aria-label="Close"
              data-modal-close
              className="w-5 h-5 flex items-center justify-center text-white hover:bg-white/20"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto p-3 bg-[#ece9d8]">
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="px-3 py-2 bg-[#ece9d8] border-t border-gray-400 flex justify-end space-x-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

export function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onCancel,
  title, 
  message, 
  confirmText = 'OK',
  cancelText = 'Cancel',
  type = 'info'
}: ConfirmDialogProps) {
  const messageId = useId();
  const focusCancel = type === 'danger';
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width="sm"
      role="alertdialog"
      describedById={messageId}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel ?? onClose}
            className="ehr-button px-4"
            data-autofocus={focusCancel ? true : undefined}
          >
            {cancelText}
          </button>
          <button 
            type="button"
            data-autofocus={focusCancel ? undefined : true}
            onClick={() => { onConfirm(); onClose(); }} 
            className={`ehr-button px-4 ${type === 'danger' ? '' : 'ehr-button-primary'}`}
            style={type === 'danger' ? { background: 'linear-gradient(to bottom, #e87458 0%, #c84030 100%)', color: 'white', border: '1px solid #a02010' } : undefined}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p id={messageId} className="text-[11px] text-gray-700">{message}</p>
    </Modal>
  );
}

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export function AlertDialog({ isOpen, onClose, title, message, type = 'info' }: AlertDialogProps) {
  const bgColors = {
    info: '#cce5ff',
    success: '#d4edda',
    warning: '#fff3cd',
    error: '#f8d7da',
  };
  const messageId = useId();
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width="sm"
      role="alertdialog"
      describedById={messageId}
      footer={
        <button type="button" data-autofocus onClick={onClose} className="ehr-button ehr-button-primary px-6">
          OK
        </button>
      }
    >
      <div className="p-2 border border-gray-400" style={{ background: bgColors[type] }}>
        <p id={messageId} className="text-[11px]">{message}</p>
      </div>
    </Modal>
  );
}
