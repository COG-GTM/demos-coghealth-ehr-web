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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative ${widthClasses[width]} max-h-[90vh] flex flex-col`} style={{ fontFamily: "'Nunito', system-ui, -apple-system, sans-serif" }}>
        {/* Window frame */}
        <div className="bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden" style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.15)' }}>
          {/* Title bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
            <span className="text-[#222222] font-bold text-base">{title}</span>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors"
            >
              <X className="w-4 h-4 text-[#717171]" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto p-6 bg-white">
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#EBEBEB] flex justify-end space-x-3">
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
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-[#DDDDDD] rounded-full text-sm font-semibold text-[#222222] hover:border-[#222222] transition-all">
            {cancelText}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }} 
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${type === 'danger' ? 'bg-[#C01048] text-white hover:bg-[#A00D3A]' : 'bg-[#FF385C] text-white hover:bg-[#E31C5F]'}`}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p className="text-sm text-[#484848]">{message}</p>
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
    info: '#EFF8FF',
    success: '#F0FFF4',
    warning: '#FFF8ED',
    error: '#FFF1F0',
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width="sm"
      footer={
        <button onClick={onClose} className="px-6 py-2.5 bg-[#FF385C] text-white rounded-full text-sm font-semibold hover:bg-[#E31C5F] transition-all">
          OK
        </button>
      }
    >
      <div className="p-4 rounded-xl" style={{ background: bgColors[type] }}>
        <p className="text-sm text-[#484848]">{message}</p>
      </div>
    </Modal>
  );
}
