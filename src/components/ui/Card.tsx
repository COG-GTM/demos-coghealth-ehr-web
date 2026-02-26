import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
      <div className="flex items-center space-x-2">
        <span className="text-[14px] font-semibold text-gray-900">{title}</span>
        {subtitle && <span className="text-xs text-gray-400 font-medium">{subtitle}</span>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
