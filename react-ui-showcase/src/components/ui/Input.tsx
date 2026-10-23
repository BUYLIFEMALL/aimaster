import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input: React.FC<InputProps> = ({ error, className = '', ...props }) => {
  const baseClasses = "block w-full rounded-lg shadow-xs sm:text-sm px-3.5 py-2.5 transition-colors";
  const borderClasses = error 
    ? "border border-red-500 text-red-700 bg-red-50/30 placeholder-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none"
    : "border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none";
  const disabledClasses = "disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed";
  
  return (
    <div className="w-full">
      <input
        className={`${baseClasses} ${borderClasses} ${disabledClasses} ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
};
