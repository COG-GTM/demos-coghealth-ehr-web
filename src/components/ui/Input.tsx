import { type InputHTMLAttributes, forwardRef, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      label,
      error,
      helperText,
      id,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const showHelper = !!helperText && !error;

    const describedBy =
      [ariaDescribedBy, error ? errorId : undefined, showHelper ? helperId : undefined]
        .filter(Boolean)
        .join(' ') || undefined;

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
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={describedBy}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-[10px] text-red-600">
            {error}
          </p>
        )}
        {showHelper && (
          <p id={helperId} className="mt-1 text-[10px] text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
