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
    default: {
      background: 'var(--ehr-surface-sunken)',
      border: '1px solid var(--ehr-border)',
      color: 'var(--ehr-text)',
    },
    success: {
      background: 'var(--ehr-alert-success-bg)',
      border: '1px solid var(--ehr-alert-success-border)',
      color: 'var(--ehr-alert-success-text)',
    },
    warning: {
      background: 'var(--ehr-alert-warning-bg)',
      border: '1px solid var(--ehr-alert-warning-border)',
      color: 'var(--ehr-alert-warning-text)',
    },
    danger: {
      background: 'var(--ehr-alert-critical-bg)',
      border: '1px solid var(--ehr-alert-critical-border)',
      color: 'var(--ehr-alert-critical-text)',
    },
    info: {
      background: 'var(--ehr-alert-info-bg)',
      border: '1px solid var(--ehr-alert-info-border)',
      color: 'var(--ehr-alert-info-text)',
    },
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
