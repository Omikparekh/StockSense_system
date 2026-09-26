import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`relative inline-flex items-center justify-center h-9 ${
        showLabel ? 'px-3 gap-2' : 'w-9'
      } rounded-xl bg-black/[0.03] dark:bg-[#121212] hover:bg-black/[0.06] dark:hover:bg-[#171717] border border-black/[0.08] dark:border-white/[0.1] hover:border-[#FF5A1F]/30 text-[#707070] dark:text-[#A5A5A5] hover:text-[#111111] dark:hover:text-[#F5F5F5] transition-all duration-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/20 ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transform transition-transform duration-300 rotate-0 scale-100" />
        ) : (
          <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300 transform transition-transform duration-300 rotate-0 scale-100" />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-semibold whitespace-nowrap">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
};
