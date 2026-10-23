import React from 'react';

export interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute bottom-full mb-2 w-max max-w-xs left-1/2 -translate-x-1/2 
        invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50
        bg-slate-900 text-white text-xs font-medium rounded-md px-2.5 py-1.5 shadow-md">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900"></div>
      </div>
    </div>
  );
};
