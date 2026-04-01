import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div className={`ehr-panel ${paddings[padding]} ${className}`}>
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
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#ebebeb]">
      <div>
        <span className="text-sm font-semibold text-[#222222]">{title}</span>
        {subtitle && <span className="text-xs ml-2 text-[#717171]">{subtitle}</span>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
