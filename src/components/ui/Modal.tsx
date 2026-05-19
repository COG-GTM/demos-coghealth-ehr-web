import { type ReactNode, useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative ${widthClasses[width]} max-h-[90vh] flex flex-col animate-fadeIn`}>
        <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#ebebeb]">
          {/* Title bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#ebebeb]">
            <h2 className="text-lg font-bold text-[#222222]">{title}</h2>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f7f7f7] text-[#717171] hover:text-[#222222] transition-colors"
            >
              <X className="w-4 h-4" />
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
          <button onClick={onClose} className="ehr-button px-5 py-2.5 rounded-lg">
            {cancelText}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }} 
            className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
              type === 'danger' 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'ehr-button ehr-button-primary'
            }`}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <div className="flex items-start space-x-3">
        {type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />}
        {type === 'danger' && <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
        {type === 'info' && <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />}
        <p className="text-sm text-[#484848] leading-relaxed">{message}</p>
      </div>
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
  const config = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: <Info className="w-5 h-5 text-blue-500" /> },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: <AlertTriangle className="w-5 h-5 text-amber-500" /> },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: <AlertCircle className="w-5 h-5 text-red-500" /> },
  };
  const c = config[type];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width="sm"
      footer={
        <button onClick={onClose} className="ehr-button ehr-button-primary px-8 py-2.5 rounded-lg">
          OK
        </button>
      }
    >
      <div className={`flex items-start space-x-3 p-4 rounded-xl ${c.bg} border ${c.border}`}>
        <div className="flex-shrink-0 mt-0.5">{c.icon}</div>
        <p className={`text-sm leading-relaxed ${c.text}`}>{message}</p>
      </div>
    </Modal>
  );
}
