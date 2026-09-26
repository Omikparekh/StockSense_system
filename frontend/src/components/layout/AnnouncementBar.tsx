import React, { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

interface AnnouncementBarProps {
  onLearnMore?: () => void;
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ onLearnMore }) => {
  const [isVisible, setIsVisible] = useState(() => {
    try {
      return localStorage.getItem('stocksense_announcement_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem('stocksense_announcement_dismissed', 'true');
    } catch {}
  };

  return (
    <div className="relative z-50 bg-[#040404] border-b border-white/[0.06] text-xs py-1.5 px-4 text-[#A5A5A5] flex items-center justify-between transition-all duration-300">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-center gap-2 sm:gap-2.5 text-center text-[11px] sm:text-xs">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FF5A1F]/10 text-[#FF8A4C] border border-[#FF5A1F]/25 font-bold uppercase tracking-widest text-[9px] shadow-2xs">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5A1F] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF5A1F]" />
          </span>
          AI Telemetry
        </span>

        <span className="text-[#F5F5F5] font-medium hidden sm:inline tracking-tight">
          Autonomous Multi-Warehouse Stock Balancing & Real-Time Rupee (₹) Valuation Active.
        </span>
        <span className="text-[#F5F5F5] font-medium sm:hidden tracking-tight">
          StockSense AI & Live Rupee (₹) Valuation Active.
        </span>

        {onLearnMore && (
          <button
            onClick={onLearnMore}
            className="group inline-flex items-center gap-1 text-[#FF8A4C] hover:text-[#FF6A2A] font-semibold transition-all ml-1"
          >
            <span className="group-hover:underline">Telemetry</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      <button
        onClick={handleDismiss}
        className="text-[#707070] hover:text-[#F5F5F5] p-1 rounded-md hover:bg-white/[0.06] transition-colors text-xs ml-2 shrink-0"
        aria-label="Dismiss announcement"
        title="Dismiss announcement"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

