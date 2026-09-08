import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', loading, children, disabled, ...props }, ref) => {
    const variantClasses = {
      primary: 'ehr-button ehr-button-primary',
      secondary: 'ehr-button',
      danger: 'ehr-button ehr-button-danger',
      ghost: 'ehr-button ehr-button-ghost',
    };
    const baseClass = variantClasses[variant];

    return (
      <button
        ref={ref}
        className={`${baseClass} ${className}`}
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
