import React from 'react';

export interface ProgressBarProps {
  progress: number; // 0 to 100
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
      <div
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${clampedProgress}%` }}
      ></div>
    </div>
  );
};
