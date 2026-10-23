import React from 'react';
import { Button } from './Button';
import { ArrowUpRight } from './Icons';

export interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  onLaunch?: () => void;
  onViewCode?: () => void;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '', onLaunch, onViewCode }) => {
  return (
    <div className={`bg-white rounded-xl shadow-xs border border-slate-200 transition-all duration-200 hover:shadow-md hover:border-blue-400 ${className}`}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <div className="flex items-center gap-1">
            {onViewCode && (
              <Button
                variant="ghost"
                onClick={onViewCode}
                className="!p-1.5 h-auto text-xs text-slate-500 hover:text-blue-600 font-mono"
                title="TSX 코드 보기"
              >
                &lt;/&gt;
              </Button>
            )}
            {onLaunch && (
              <Button
                variant="ghost"
                onClick={onLaunch}
                className="!p-1.5 h-auto text-slate-400 hover:text-blue-600"
                aria-label={`${title} 인터랙티브 데모 실행`}
                title="인터랙티브 데모 실행"
              >
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="text-slate-700">
          {children}
        </div>
      </div>
    </div>
  );
};
