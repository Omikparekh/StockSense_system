import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type BadgeVariant =
  | 'draft'
  | 'waiting'
  | 'ready'
  | 'done'
  | 'cancelled'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'ai'
  | 'accent';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  dot = false,
  className,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, { badge: string; dot: string }> = {
    // Semantic Ready: Indigo / Tech Blue
    ready: {
      badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
      dot: 'bg-indigo-400',
    },
    // Semantic Waiting: Amber
    waiting: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
      dot: 'bg-amber-400',
    },
    // Semantic Done: Emerald
    done: {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
      dot: 'bg-emerald-400',
    },
    // Semantic Success: Emerald
    success: {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
      dot: 'bg-emerald-400',
    },
    // Semantic Warning: Amber
    warning: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
      dot: 'bg-amber-400',
    },
    // Semantic Danger: Rose
    danger: {
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
      dot: 'bg-rose-400',
    },
    // Semantic Cancelled: Rose
    cancelled: {
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
      dot: 'bg-rose-400',
    },
    // Semantic Info: Sky
    info: {
      badge: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
      dot: 'bg-sky-400',
    },
    // Neutral: Charcoal / Slate
    neutral: {
      badge: 'bg-white/[0.04] text-[#A5A5A5] border-white/[0.08]',
      dot: 'bg-[#707070]',
    },
    // Draft: Low Contrast
    draft: {
      badge: 'bg-white/[0.04] text-[#A5A5A5] border-white/[0.08]',
      dot: 'bg-[#707070]',
    },
    // AI / Accent: Controlled Orange
    ai: {
      badge: 'bg-[#FF5A1F]/15 text-[#FF8A4C] border-[#FF5A1F]/30 shadow-[0_0_12px_rgba(255,90,31,0.15)]',
      dot: 'bg-[#FF5A1F] animate-pulse',
    },
    accent: {
      badge: 'bg-[#FF5A1F]/15 text-[#FF8A4C] border-[#FF5A1F]/30',
      dot: 'bg-[#FF5A1F]',
    },
  };

  const current = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border select-none transition-colors duration-150',
          current.badge,
          className
        )
      )}
      {...props}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', current.dot)} />}
      {children}
    </span>
  );
};
