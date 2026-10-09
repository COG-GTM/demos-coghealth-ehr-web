import { type ReactNode, type RefObject, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  getFocusableElements,
  getTrapTarget,
  hideBackground,
  isTopmostDialog,
  registerOpenDialog,
} from './dialogFocus';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
  role?: 'dialog' | 'alertdialog';
  describedBy?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

const widthClasses = {
  sm: 'w-80',
  md: 'w-[480px]',
  lg: 'w-[640px]',
  xl: 'w-[800px]',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  width = 'md',
  footer,
  role = 'dialog',
  describedBy,
  initialFocusRef,
}: ModalProps) {
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const dialog = dialogRef.current;
    if (!isOpen || !overlay || !dialog) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unregister = registerOpenDialog(dialog);
    const restoreBackground = hideBackground(overlay);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const initialTarget =
      initialFocusRef?.current ??
      getFocusableElements(contentRef.current)[0] ??
      getFocusableElements(footerRef.current)[0] ??
      dialog;
    initialTarget.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTopmostDialog(dialog)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = getFocusableElements(dialog);
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const target = getTrapTarget(focusables, active, e.shiftKey);
      if (focusables.length === 0) {
        e.preventDefault();
        dialog.focus();
      } else if (target) {
        e.preventDefault();
        target.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      unregister();
      restoreBackground();
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isOpen, initialFocusRef]);

  if (!isOpen) return null;

  const modal = (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`relative ${widthClasses[width]} max-h-[90vh] flex flex-col outline-none`}
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
              className="w-5 h-5 flex items-center justify-center text-white hover:bg-white/20"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          
          {/* Content */}
          <div ref={contentRef} className="flex-1 overflow-auto p-3 bg-[#ece9d8]">
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div ref={footerRef} className="px-3 py-2 bg-[#ece9d8] border-t border-gray-400 flex justify-end space-x-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
  title, 
  message, 
  confirmText = 'OK',
  cancelText = 'Cancel',
  type = 'info'
}: ConfirmDialogProps) {
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width="sm"
      role="alertdialog"
      describedBy={messageId}
      initialFocusRef={type === 'danger' ? cancelRef : confirmRef}
      footer={
        <>
          <button ref={cancelRef} type="button" onClick={onClose} className="ehr-button px-4">
            {cancelText}
          </button>
          <button 
            ref={confirmRef}
            type="button"
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
  const messageId = useId();
  const okRef = useRef<HTMLButtonElement>(null);
  const bgColors = {
    info: '#cce5ff',
    success: '#d4edda',
    warning: '#fff3cd',
    error: '#f8d7da',
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width="sm"
      role="alertdialog"
      describedBy={messageId}
      initialFocusRef={okRef}
      footer={
        <button ref={okRef} type="button" onClick={onClose} className="ehr-button ehr-button-primary px-6">
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
