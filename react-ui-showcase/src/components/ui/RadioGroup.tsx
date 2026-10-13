import React from 'react';

export interface RadioOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  selectedValue: string;
  onChange: (value: string) => void;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ name, options, selectedValue, onChange }) => {
  return (
    <fieldset>
      <div className="space-y-3">
        {options.map((option) => (
          <label
            key={option.value}
            htmlFor={`${name}-${option.value}`}
            className={`flex items-center text-sm font-medium cursor-pointer ${
              option.disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <input
              id={`${name}-${option.value}`}
              name={name}
              type="radio"
              value={option.value}
              checked={selectedValue === option.value}
              onChange={(e) => onChange(e.target.value)}
              disabled={option.disabled}
              className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
            />
            <span className="ml-2.5">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};
