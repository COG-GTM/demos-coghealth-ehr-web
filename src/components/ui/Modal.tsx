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
  sm: 'w-80',
  md: 'w-[480px]',
  lg: 'w-[640px]',
  xl: 'w-[800px]',
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
      <div className={`relative ${widthClasses[width]} max-h-[90vh] flex flex-col`} style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div className="bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#ebebeb]">
            <span className="text-[#222222] font-semibold text-base">{title}</span>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-[#f7f7f7] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-[#717171]" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-[#ebebeb] flex justify-end space-x-3">
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
          <button onClick={onClose} className="ehr-button px-4">
            {cancelText}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }} 
            className={`ehr-button px-4 ${type === 'danger' ? '' : 'ehr-button-primary'}`}
            style={type === 'danger' ? { background: '#FF385C', color: 'white', border: 'none', borderRadius: '24px' } : undefined}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p className="text-sm text-[#717171] leading-relaxed">{message}</p>
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
    info: '#eff6ff',
    success: '#f0fdf4',
    warning: '#fffbeb',
    error: '#fff1f2',
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width="sm"
      footer={
        <button onClick={onClose} className="ehr-button ehr-button-primary px-6">
          OK
        </button>
      }
    >
      <div className="p-4 rounded-xl" style={{ background: bgColors[type] }}>
        <p className="text-sm text-[#222222] leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}
