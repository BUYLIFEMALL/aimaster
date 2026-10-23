"use client";

import { useState } from "react";
import {
  X,
  Download,
  Upload,
  HardDriveDownload,
  Check,
  AlertCircle,
  FileCode2,
} from "lucide-react";
import { PromptTemplate } from "@/types/prompt";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: PromptTemplate[];
  onImportPrompts: (imported: PromptTemplate[], overwrite: boolean) => void;
}

export function BackupModal({
  isOpen,
  onClose,
  prompts,
  onImportPrompts,
}: BackupModalProps) {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [overwriteMode, setOverwriteMode] = useState(false);

  if (!isOpen) return null;

  // 전체 JSON 내보내기
  const handleExportJson = () => {
    const dataStr = JSON.stringify(prompts, null, 2);
    const blob = new Blob([dataStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Prompt_Library_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // JSON 가져오기 파일 업로드
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          throw new Error("올바른 프롬프트 목록 배열 형식이 아닙니다.");
        }

        onImportPrompts(parsed, overwriteMode);
        setImportStatus(`성공적으로 ${parsed.length}개의 프롬프트를 불러왔습니다!`);
        setTimeout(() => {
          onClose();
          setImportStatus(null);
        }, 1500);
      } catch (err: any) {
        setImportStatus(`가져오기 실패: ${err.message || "유효한 JSON 파일이 아닙니다."}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <HardDriveDownload size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                라이브러리 백업 및 복원
              </h2>
              <p className="text-[11px] text-slate-500">
                나만의 소중한 프롬프트 자산을 안전하게 보관하세요
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-5">
          {/* 1. JSON 내보내기 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 size={16} className="text-blue-600" />
                <h3 className="text-xs font-black text-slate-900">
                  전체 라이브러리 백업 (JSON)
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                현재 {prompts.length}개 보관 중
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              현재 보관된 모든 프롬프트 템플릿과 카테고리를 표준 JSON 파일로 다운로드합니다.
            </p>
            <button
              type="button"
              onClick={handleExportJson}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Download size={14} />
              <span>JSON 백업 파일 다운로드</span>
            </button>
          </div>

          {/* 2. JSON 가져오기 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center gap-2">
              <Upload size={16} className="text-emerald-600" />
              <h3 className="text-xs font-black text-slate-900">
                백업 파일 가져오기 (복원)
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              이전에 백업한 JSON 파일을 업로드하여 라이브러리에 복원합니다.
            </p>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
              <input
                type="checkbox"
                checked={overwriteMode}
                onChange={(e) => setOverwriteMode(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>기존 목록을 지우고 덮어쓰기 (체크 해제 시 기존 목록에 병합)</span>
            </label>

            <label className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer">
              <Upload size={14} />
              <span>백업 JSON 파일 선택하기</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* 상태 메시지 */}
          {importStatus && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 flex items-center gap-2">
              <Check size={14} />
              <span>{importStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
