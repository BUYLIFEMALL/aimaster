import React, { useState } from 'react';

export interface TabItem {
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultIndex?: number;
  onChange?: (index: number) => void;
}

export const Tabs: React.FC<TabsProps> = ({ items, defaultIndex = 0, onChange }) => {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  const handleTabClick = (index: number) => {
    setActiveIndex(index);
    if (onChange) onChange(index);
  };

  return (
    <div>
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-1.5 overflow-x-auto" aria-label="Tabs">
          {items.map((item, index) => {
            const isActive = activeIndex === index;
            return (
              <button
                key={item.label}
                onClick={() => handleTabClick(index)}
                className={`whitespace-nowrap flex items-center py-2.5 px-3.5 rounded-t-lg border-b-2 font-medium text-xs sm:text-sm transition-all cursor-pointer
                  ${
                    isActive
                      ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="mt-4">
        {items[activeIndex] && items[activeIndex].content}
      </div>
    </div>
  );
};
