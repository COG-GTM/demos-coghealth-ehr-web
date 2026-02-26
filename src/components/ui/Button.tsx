import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantClasses = {
  primary: 'bg-[#5e6ad2] border-[#5e6ad2] text-white hover:bg-[#4f5bc0]',
  secondary: 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300',
  danger: 'bg-red-500 border-red-500 text-white hover:bg-red-600',
  ghost: 'bg-transparent border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center px-4 py-1.5 text-[13px] font-medium rounded-md border transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
