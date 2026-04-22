import { type ReactNode, useEffect, useRef } from 'react';
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

let nextModalId = 0;
const openModalIds = new Set<number>();

export function Modal({ isOpen, onClose, title, children, width = 'md', footer }: ModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const id = nextModalId++;
    openModalIds.add(id);

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && Math.max(...openModalIds) === id) {
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      openModalIds.delete(id);
      document.removeEventListener('keydown', handleEscape);
      if (openModalIds.size === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative ${widthClasses[width]} max-h-[90vh] flex flex-col`} style={{ fontFamily: 'Tahoma, sans-serif' }}>
        {/* Window frame */}
        <div className="bg-white border-2 border-gray-400 shadow-lg flex flex-col" style={{ boxShadow: '2px 2px 8px rgba(0,0,0,0.3)' }}>
          {/* Title bar */}
          <div 
            className="flex items-center justify-between px-2 py-1"
            style={{ background: 'linear-gradient(to bottom, #6699cc 0%, #336699 100%)' }}
          >
            <span className="text-white font-semibold text-[11px]">{title}</span>
            <button 
              onClick={onClose}
              className="w-5 h-5 flex items-center justify-center text-white hover:bg-white/20"
            >
              <X className="w-3.5 h-3.5" />
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
            style={type === 'danger' ? { background: 'linear-gradient(to bottom, #e87458 0%, #c84030 100%)', color: 'white', border: '1px solid #a02010' } : undefined}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p className="text-[11px] text-gray-700 whitespace-pre-line">{message}</p>
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
      <div className="p-2 border border-gray-400" style={{ background: bgColors[type] }}>
        <p className="text-[11px]">{message}</p>
      </div>
    </Modal>
  );
}
