import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={twMerge(
            clsx(
              'w-full px-3.5 py-2 text-sm bg-white dark:bg-[#0E0E0E] border rounded-xl transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600',
              'focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-[#0E0E0E]',
              error
                ? 'border-rose-400 dark:border-rose-500/70 focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-900/30 text-rose-900 dark:text-rose-200'
                : 'border-slate-300 dark:border-white/[0.09] focus:border-brand-500 focus:ring-brand-500/20 text-slate-900 dark:text-slate-100',
              className
            )
          )}
          {...props}
        />
        {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
