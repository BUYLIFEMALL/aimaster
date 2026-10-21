"use client";

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Copy, Check, Code2 } from 'lucide-react';
import { COMPONENT_CODES, ComponentCodeItem } from '@/lib/gallery/componentCodes';

interface CodeViewerModalProps {
  componentId: string | null;
  onClose: () => void;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({ componentId, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'component' | 'usage'>('component');

  if (!componentId) return null;
  const item: ComponentCodeItem | undefined = COMPONENT_CODES[componentId];
  if (!item) return null;

  const codeToCopy = activeTab === 'component' ? item.code : item.usage;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={!!componentId} onClose={onClose} title={`${item.name} TSX 소스 코드`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setActiveTab('component')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'component' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              컴포넌트 정의
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'usage' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              사용 예시 (Usage)
            </button>
          </div>

          <Button
            variant="outline"
            onClick={handleCopy}
            className="!px-3 !py-1 text-xs flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>코드 복사</span>
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-slate-500">{item.description}</p>

        <div className="relative rounded-xl bg-slate-900 p-4 overflow-x-auto text-xs font-mono text-slate-200 custom-scrollbar max-h-96">
          <pre>{codeToCopy}</pre>
        </div>
      </div>
    </Modal>
  );
};
