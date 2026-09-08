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
    default: 'ehr-badge-default',
    success: 'ehr-badge-success',
    warning: 'ehr-badge-warning',
    danger: 'ehr-badge-danger',
    info: 'ehr-badge-info',
  };

  return (
    <span 
      className={`inline-flex items-center text-[10px] px-1.5 py-0.5 font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
