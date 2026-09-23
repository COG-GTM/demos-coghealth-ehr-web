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
    default: { background: 'var(--ehr-panel-alt)', border: '1px solid var(--ehr-border)', color: 'var(--ehr-text-muted)' },
    success: { background: 'var(--ehr-alert-success-bg)', border: '1px solid #28a745', color: 'var(--ehr-alert-success-fg)' },
    warning: { background: 'var(--ehr-alert-warning-bg)', border: '1px solid #cc9900', color: 'var(--ehr-alert-warning-fg)' },
    danger: { background: 'var(--ehr-alert-critical-bg)', border: '1px solid #cc0000', color: 'var(--ehr-alert-critical-fg)' },
    info: { background: 'var(--ehr-alert-info-bg)', border: '1px solid #0066cc', color: 'var(--ehr-alert-info-fg)' },
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
