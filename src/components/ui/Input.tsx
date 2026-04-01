import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="ehr-label block mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`ehr-input w-full ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-[#FF385C]">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-xs text-[#b0b0b0]">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
