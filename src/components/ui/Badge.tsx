import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({ 
  children, 
  variant = 'default', 
  className = '' 
}: BadgeProps) {
  const variants = {
    default: { background: 'var(--ehr-badge-default-bg)', border: '1px solid #999', color: 'var(--ehr-badge-default-text)' },
    success: { background: 'var(--ehr-badge-success-bg)', border: '1px solid #28a745', color: 'var(--ehr-badge-success-text)' },
    warning: { background: 'var(--ehr-badge-warning-bg)', border: '1px solid #cc9900', color: 'var(--ehr-badge-warning-text)' },
    danger: { background: 'var(--ehr-badge-danger-bg)', border: '1px solid #cc0000', color: 'var(--ehr-badge-danger-text)' },
    info: { background: 'var(--ehr-badge-info-bg)', border: '1px solid #0066cc', color: 'var(--ehr-badge-info-text)' },
  };

  return (
    <span 
      className={`inline-flex items-center text-[10px] px-1.5 py-0.5 font-medium ${className}`}
      style={variants[variant]}
    >
      {children}
    </span>
  );
}
