import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

const widthClasses = {
  sm: 'w-96',
  md: 'w-[520px]',
  lg: 'w-[680px]',
  xl: 'w-[840px]',
};

export function Modal({ isOpen, onClose, title, children, width = 'md', footer }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ${widthClasses[width]} max-h-[90vh] flex flex-col animate-fade-in`}>
        <div className="bg-white rounded-xl shadow-xl flex flex-col overflow-hidden border border-gray-200">
          {/* Title bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <span className="text-gray-900 font-semibold text-[15px]">{title}</span>
            <button 
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto p-5">
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2.5">
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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width="sm"
      footer={
        <>
          <button onClick={onClose} className="ehr-button px-5 py-1.5">
            {cancelText}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }} 
            className={`ehr-button px-5 py-1.5 ${type === 'danger' ? '' : 'ehr-button-primary'}`}
            style={type === 'danger' ? { background: '#ef4444', color: 'white', border: '1px solid #ef4444', borderRadius: '6px' } : undefined}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
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
  const styles = {
    info: 'bg-blue-50 border-blue-100 text-blue-800',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    warning: 'bg-amber-50 border-amber-100 text-amber-800',
    error: 'bg-red-50 border-red-100 text-red-800',
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width="sm"
      footer={
        <button onClick={onClose} className="ehr-button ehr-button-primary px-6 py-1.5">
          OK
        </button>
      }
    >
      <div className={`p-3.5 rounded-lg border ${styles[type]}`}>
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}
