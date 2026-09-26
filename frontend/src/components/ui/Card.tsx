import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-white border border-slate-200/80 rounded-xl shadow-card p-5 transition-all duration-200',
          hoverable && 'hover:shadow-elevated hover:border-slate-300',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
