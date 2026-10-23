import React from 'react';

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onChange, disabled = false }) => {
  const id = `checkbox-${label.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}`;
  return (
    <label
      htmlFor={id}
      className={`flex items-center text-sm font-medium cursor-pointer ${
        disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:text-slate-900'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
      />
      <span className="ml-2.5">{label}</span>
    </label>
  );
};
