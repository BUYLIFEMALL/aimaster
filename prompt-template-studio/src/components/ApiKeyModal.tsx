"use client";

import { useState } from "react";
import { X, Key, Shield, ExternalLink, Check, AlertCircle } from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  maskedKey?: string | null;
  onSaveKey: (key: string) => Promise<boolean>;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  maskedKey,
  onSaveKey,
}: ApiKeyModalProps) {
  const [inputKey, setInputKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) {
      setMessage({ type: "error", text: "API 키를 입력해주세요." });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const success = await onSaveKey(inputKey.trim());
    setIsSaving(false);

    if (success) {
      setMessage({ type: "success", text: "Gemini API 키가 성공적으로 저장되었습니다." });
      setInputKey("");
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1200);
    } else {
      setMessage({ type: "error", text: "키 저장 중 오류가 발생했습니다. 다시 시도해주세요." });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                Google Gemini API 키 연동
              </h3>
              <p className="text-[11px] text-slate-500">본인 계정의 키로 독립 운영됩니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 space-y-5">
          {/* 현재 등록 상태 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  maskedKey ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-slate-300"
                }`}
              />
              <div>
                <p className="text-xs font-semibold text-slate-700">현재 연동 상태</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {maskedKey ? maskedKey : "등록된 API 키 없음"}
                </p>
              </div>
            </div>
            {maskedKey && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                연동됨
              </span>
            )}
          </div>

          {/* 입력 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Google Gemini API Key 등록 / 변경
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {message.type === "success" ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? "저장 중..." : "API 키 저장 및 연동하기"}
            </button>
          </form>

          {/* 안내 및 외부 링크 */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-start gap-2 text-[11px] text-slate-500">
              <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <p>
                등록하신 API 키는 암호화되어 안전하게 보관되며, 본인의 프롬프트 실행 및 자동 채우기에만 사용됩니다.
              </p>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline pt-1"
            >
              <span>Google AI Studio에서 무료 API 키 발급받기</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
