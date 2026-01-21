import { forwardRef, ChangeEvent } from 'react';
import { motion } from 'framer-motion';

export type InputType = 'text' | 'number' | 'password' | 'email' | 'url';

export interface InputProps {
  label?: string;
  error?: string;
  type?: InputType;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  id?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      type = 'text',
      fullWidth = false,
      className = '',
      disabled = false,
      placeholder = '',
      value,
      onChange,
      name,
      id,
      required = false,
      min,
      max,
      step,
    },
    ref
  ) => {
    const baseStyles = 'rounded-lg bg-[#111722] border transition-all duration-200 text-white placeholder-gray-500';

    const borderStyles = error
      ? 'border-red-500 focus:ring-2 focus:ring-red-500/50'
      : 'border-[#232f48] focus:border-[#135bec] focus:ring-2 focus:ring-[#135bec]/50';

    const paddingStyles = 'px-4 py-2';

    const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

    const widthStyle = fullWidth ? 'w-full' : '';

    const inputClassName = `${baseStyles} ${borderStyles} ${paddingStyles} ${disabledStyles} ${widthStyle} ${className}`.trim();

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <motion.input
          ref={ref}
          type={type}
          className={inputClassName}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          name={name}
          id={id}
          required={required}
          min={min}
          max={max}
          step={step}
          whileFocus={disabled ? undefined : { scale: 1.01 }}
          transition={{ duration: 0.15 }}
        />
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
