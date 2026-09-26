import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  glow = false,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-white dark:bg-[#101010] border border-slate-200/90 dark:border-white/[0.08] text-slate-900 dark:text-[#F5F5F5] rounded-2xl shadow-card p-5 sm:p-6 transition-all duration-250',
          hoverable &&
            'hover:shadow-elevated hover:border-slate-300 dark:hover:border-white/[0.16] hover:-translate-y-0.5',
          glow &&
            'border-[#FF5A1F]/30 dark:border-[#FF5A1F]/40 shadow-[0_0_25px_rgba(255,90,31,0.15)]',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
