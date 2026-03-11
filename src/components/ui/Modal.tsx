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
      <div className={`relative ${widthClasses[width]} max-h-[90vh] flex flex-col`} style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}>
        {/* Modal card */}
        <div className="bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden" style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.15)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#ebebeb]">
            <span className="text-[#222222] font-bold text-base">{title}</span>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f7f7f7] transition-colors"
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
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-[#dddddd] rounded-lg text-sm font-medium text-[#222222] hover:bg-[#f7f7f7] transition-colors">
            {cancelText}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }} 
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              type === 'danger' 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-[#FF385C] text-white hover:bg-[#e31c5f]'
            }`}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p className="text-sm text-[#717171]">{message}</p>
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
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
  };
  const style = styles[type];
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width="sm"
      footer={
        <button onClick={onClose} className="px-6 py-2.5 bg-[#222222] text-white text-sm font-medium rounded-lg hover:bg-[#000000] transition-colors">
          OK
        </button>
      }
    >
      <div className={`p-4 rounded-xl border ${style.bg} ${style.border}`}>
        <p className={`text-sm ${style.text}`}>{message}</p>
      </div>
    </Modal>
  );
}
