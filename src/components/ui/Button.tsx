import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', loading, children, disabled, ...props }, ref) => {
    const baseClass = variant === 'primary' ? 'ehr-button ehr-button-primary' : 'ehr-button';
    
    const dangerStyle = variant === 'danger' ? {
      background: '#FF385C',
      color: 'white',
      border: 'none',
      borderRadius: '24px'
    } : undefined;

    const ghostStyle = variant === 'ghost' ? {
      background: 'transparent',
      border: '1px solid transparent'
    } : undefined;

    return (
      <button
        ref={ref}
        className={`${baseClass} ${className}`}
        style={dangerStyle || ghostStyle}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
