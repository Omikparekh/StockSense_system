import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'light';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none';

  const variants = {
    // Primary: Cinematic Orange Accent with Soft Glow
    primary:
      'bg-[#FF5A1F] hover:bg-[#FF6A2A] text-slate-950 font-bold shadow-[0_0_20px_rgba(255,90,31,0.22)] hover:shadow-[0_0_30px_rgba(255,90,31,0.35)] hover:-translate-y-0.5 focus:ring-[#FF5A1F]',
    
    // Secondary: Dark Charcoal Surface with Thin Low-Contrast Border
    secondary:
      'bg-[#151515] hover:bg-[#1A1A1A] text-white border border-white/[0.08] hover:border-white/[0.16] shadow-sm hover:-translate-y-0.5 focus:ring-slate-400',
    
    // Outline: Minimal Border
    outline:
      'border border-slate-300 dark:border-white/[0.1] bg-transparent hover:bg-slate-100 dark:hover:bg-white/[0.05] text-slate-800 dark:text-slate-200 hover:-translate-y-0.5 focus:ring-[#FF5A1F]',
    
    // Ghost: Transparent with Subtle Hover
    ghost:
      'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white focus:ring-slate-400',
    
    // Danger: Semantic Red for critical actions
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm hover:shadow-[0_0_20px_rgba(225,29,72,0.25)] hover:-translate-y-0.5 focus:ring-rose-500',
    
    // Light: Premium High-Contrast White Surface
    light:
      'bg-white text-slate-950 font-bold hover:bg-slate-100 border border-slate-200 shadow-sm hover:-translate-y-0.5 focus:ring-slate-400',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg',
    md: 'text-xs sm:text-sm px-4 py-2 gap-2 rounded-xl',
    lg: 'text-sm sm:text-base px-5 py-2.5 gap-2.5 rounded-xl font-bold',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
};
