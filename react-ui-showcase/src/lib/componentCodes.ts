export interface ComponentCodeItem {
  id: string;
  name: string;
  category: string;
  description: string;
  code: string;
  usage: string;
}

export const COMPONENT_CODES: Record<string, ComponentCodeItem> = {
  button: {
    id: "button",
    name: "Button",
    category: "입력 및 액션",
    description: "5가지 스타일(기본, 보조, 외곽선, 위험, 고스트)과 로딩/비활성화 상태를 지원하는 버튼 컴포넌트",
    code: `import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const baseClasses = "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none px-4 py-2 cursor-pointer";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm focus:ring-slate-900",
  secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 focus:ring-slate-400",
  outline: "border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-400",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm focus:ring-red-500",
  ghost: "hover:bg-slate-100 text-slate-700 focus:ring-slate-400",
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', children, ...props }) => {
  return (
    <button className={\`\${baseClasses} \${variantClasses[variant]} \${className}\`} {...props}>
      {children}
    </button>
  );
};`,
    usage: `<Button variant="primary">기본 버튼</Button>
<Button variant="secondary">보조 버튼</Button>
<Button variant="outline">외곽선 버튼</Button>
<Button variant="danger">위험 버튼</Button>`
  },

  input: {
    id: "input",
    name: "Input",
    category: "입력 및 폼",
    description: "실시간 에러 메시지 검증과 비활성화 상태를 내장한 반응형 텍스트 필드",
    code: `import React from 'react';

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
      <input className={\`\${baseClasses} \${borderClasses} \${disabledClasses} \${className}\`} {...props} />
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
};`,
    usage: `<Input placeholder="이메일 입력" value={email} onChange={e => setEmail(e.target.value)} />
<Input placeholder="필수 입력" error="이 필드는 필수입니다." />`
  },

  tabs: {
    id: "tabs",
    name: "Tabs",
    category: "내비게이션",
    description: "아이콘과 배지를 결합할 수 있는 수평 탭 전환 네비게이션 컨트롤러",
    code: `import React, { useState } from 'react';

export interface TabItem {
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultIndex?: number;
}

export const Tabs: React.FC<TabsProps> = ({ items, defaultIndex = 0 }) => {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  return (
    <div>
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-1.5 overflow-x-auto" aria-label="Tabs">
          {items.map((item, index) => (
            <button
              key={item.label}
              onClick={() => setActiveIndex(index)}
              className={\`whitespace-nowrap flex items-center py-2.5 px-3.5 rounded-t-lg border-b-2 font-medium text-xs sm:text-sm transition-all cursor-pointer \${
                activeIndex === index
                  ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }\`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-4">{items[activeIndex]?.content}</div>
    </div>
  );
};`,
    usage: `<Tabs items={[
  { label: '프로필', content: <div>프로필 내용</div> },
  { label: '설정', content: <div>설정 내용</div> }
]} />`
  },

  select: {
    id: "select",
    name: "Select / Dropdown",
    category: "선택 컨트롤",
    description: "네이티브 접근성을 유지하면서 모던 스타일 화살표 SVG를 내장한 드롭다운",
    code: `import React from 'react';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({ options, className = '', ...props }) => {
  return (
    <div className="relative w-full">
      <select
        className={\`appearance-none w-full bg-white border border-slate-300 rounded-lg py-2.5 pl-3.5 pr-10 text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors cursor-pointer \${className}\`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
        <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  );
};`,
    usage: `<Select options={[
  { label: '옵션 A', value: 'a' },
  { label: '옵션 B', value: 'b' }
]} />`
  },

  radio: {
    id: "radio",
    name: "RadioGroup",
    category: "선택 컨트롤",
    description: "비활성화 상태 및 고유 name을 지원하는 단일 선택 라디오 그룹",
    code: `import React from 'react';

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
            htmlFor={\`\${name}-\${option.value}\`}
            className={\`flex items-center text-sm font-medium cursor-pointer \${
              option.disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:text-slate-900'
            }\`}
          >
            <input
              id={\`\${name}-\${option.value}\`}
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
};`,
    usage: `<RadioGroup
  name="theme"
  options={[{ label: '라이트', value: 'light' }, { label: '다크', value: 'dark' }]}
  selectedValue={theme}
  onChange={setTheme}
/>`
  },

  checkbox: {
    id: "checkbox",
    name: "Checkbox & Toggle",
    category: "선택 컨트롤",
    description: "다중 선택 체크박스 및 부드러운 스위치 토글 컴포넌트",
    code: `import React from 'react';

export const Checkbox: React.FC<{ label: string; checked: boolean; onChange: (c: boolean) => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center text-sm font-medium cursor-pointer text-slate-700">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
    <span className="ml-2.5">{label}</span>
  </label>
);

export const Toggle: React.FC<{ label: string; enabled: boolean; onChange: (e: boolean) => void }> = ({ label, enabled, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <button type="button" onClick={() => onChange(!enabled)} className={\`\${enabled ? 'bg-blue-600' : 'bg-slate-300'} relative inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200\`}>
      <span className={\`\${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-xs transition duration-200\`} />
    </button>
  </div>
);`,
    usage: `<Checkbox label="이용약관 동의" checked={agree} onChange={setAgree} />
<Toggle label="알림 켜기" enabled={push} onChange={setPush} />`
  },

  slider: {
    id: "slider",
    name: "Slider & ProgressBar",
    category: "데이터 표시 및 조작",
    description: "실시간 그라디언트 트랙 색상 연동 슬라이더 및 수치 클램핑 진행 바",
    code: `import React from 'react';

export const Slider: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <input
    type="range"
    min={0}
    max={100}
    value={value}
    onChange={e => onChange(Number(e.target.value))}
    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
    style={{ background: \`linear-gradient(to right, #2563eb 0%, #2563eb \${value}%, #e2e8f0 \${value}%, #e2e8f0 100%)\` }}
  />
);

export const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: \`\${Math.min(100, Math.max(0, progress))}%\` }} />
  </div>
);`,
    usage: `<Slider value={volume} onChange={setVolume} />
<ProgressBar progress={volume} />`
  },

  alert: {
    id: "alert",
    name: "Alert",
    category: "피드백 및 알림",
    description: "4대 상태(정보, 성공, 경고, 위험)별 전용 색상 및 아이콘이 내장된 알림 배너",
    code: `import React from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle } from './Icons';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export const Alert: React.FC<{ variant?: AlertVariant; message: string }> = ({ variant = 'info', message }) => {
  const config = {
    info: { bg: 'bg-blue-50 border border-blue-200', text: 'text-blue-800', icon: <Info className="h-5 w-5 text-blue-600" /> },
    success: { bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-800', icon: <CheckCircle className="h-5 w-5 text-emerald-600" /> },
    warning: { bg: 'bg-amber-50 border border-amber-200', text: 'text-amber-800', icon: <AlertTriangle className="h-5 w-5 text-amber-600" /> },
    danger: { bg: 'bg-rose-50 border border-rose-200', text: 'text-rose-800', icon: <XCircle className="h-5 w-5 text-rose-600" /> },
  }[variant];

  return (
    <div className={\`rounded-lg p-3.5 \${config.bg}\`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <p className={\`ml-3 text-sm font-medium leading-relaxed \${config.text}\`}>{message}</p>
      </div>
    </div>
  );
};`,
    usage: `<Alert variant="success" message="작업이 성공적으로 저장되었습니다." />
<Alert variant="danger" message="오류가 발생했습니다." />`
  },

  modal: {
    id: "modal",
    name: "Modal & Popover",
    category: "오버레이 및 팝업",
    description: "ESC 닫기, 배경 클릭 닫기, 바디 스크롤 방지 및 포털 렌더링을 지원하는 모달",
    code: `import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XCircle } from './Icons';

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = 'auto'; window.removeEventListener('keydown', onKey); };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-center items-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600"><XCircle className="h-5 w-5" /></button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};`,
    usage: `<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="확인">
  <p>정말로 작업을 진행하시겠습니까?</p>
</Modal>`
  },

  tooltip: {
    id: "tooltip",
    name: "Tooltip",
    category: "오버레이 및 팝업",
    description: "말풍선 꼬리 화살표와 호버 페이드인 애니메이션을 제공하는 툴팁",
    code: `import React from 'react';

export const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
  <div className="relative group inline-block">
    {children}
    <div className="absolute bottom-full mb-2 w-max max-w-xs left-1/2 -translate-x-1/2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 bg-slate-900 text-white text-xs font-medium rounded-md px-2.5 py-1.5 shadow-md">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900"></div>
    </div>
  </div>
);`,
    usage: `<Tooltip text="문서 저장">
  <button>저장</button>
</Tooltip>`
  }
};
