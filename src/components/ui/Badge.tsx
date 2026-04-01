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
    default: { background: '#f7f7f7', border: 'none', color: '#717171', borderRadius: '24px' },
    success: { background: '#f0fdf4', border: 'none', color: '#15803d', borderRadius: '24px' },
    warning: { background: '#fffbeb', border: 'none', color: '#92400e', borderRadius: '24px' },
    danger: { background: '#fff1f2', border: 'none', color: '#FF385C', borderRadius: '24px' },
    info: { background: '#eff6ff', border: 'none', color: '#1e40af', borderRadius: '24px' },
  };

  return (
    <span 
      className={`inline-flex items-center text-xs px-3 py-1 font-medium ${className}`}
      style={variants[variant]}
    >
      {children}
    </span>
  );
}
