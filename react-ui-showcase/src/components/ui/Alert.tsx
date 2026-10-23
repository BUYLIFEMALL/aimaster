import React from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle } from './Icons';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  variant?: AlertVariant;
  message: string;
}

const variantConfig = {
  info: {
    bg: 'bg-blue-50 border border-blue-200',
    text: 'text-blue-800',
    icon: <Info className="h-5 w-5 text-blue-600" />,
  },
  success: {
    bg: 'bg-emerald-50 border border-emerald-200',
    text: 'text-emerald-800',
    icon: <CheckCircle className="h-5 w-5 text-emerald-600" />,
  },
  warning: {
    bg: 'bg-amber-50 border border-amber-200',
    text: 'text-amber-800',
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
  },
  danger: {
    bg: 'bg-rose-50 border border-rose-200',
    text: 'text-rose-800',
    icon: <XCircle className="h-5 w-5 text-rose-600" />,
  },
};

export const Alert: React.FC<AlertProps> = ({ variant = 'info', message }) => {
  const config = variantConfig[variant];
  return (
    <div className={`rounded-lg p-3.5 ${config.bg}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="ml-3">
          <p className={`text-sm font-medium leading-relaxed ${config.text}`}>{message}</p>
        </div>
      </div>
    </div>
  );
};
