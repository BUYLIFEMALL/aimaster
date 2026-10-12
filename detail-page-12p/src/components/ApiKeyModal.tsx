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
                Google Gemini API 키 설정
              </h3>
              <p className="text-xs text-slate-500">본인 계정의 API 키를 연동합니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 바디 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 현재 등록 상태 */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                현재 연동 상태
              </span>
              <p className="text-sm font-medium text-slate-800 font-mono">
                {maskedKey ? maskedKey : "등록된 키 없음"}
              </p>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
                maskedKey
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {maskedKey ? (
                <>
                  <Check className="w-3 h-3" /> 연동됨
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3" /> 키 필요
                </>
              )}
            </span>
          </div>

          {/* 입력 필드 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex justify-between">
              <span>새 Gemini API 키 입력</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 font-normal"
              >
                무료 키 발급받기 <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono"
            />
          </div>

          {/* 보안 및 최상위 규칙 안내 */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex gap-2.5 text-xs text-blue-800 leading-relaxed">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">본인 API 키 연동 원칙</p>
              입력하신 API 키는 회원님의 고유 암호화 세션에 안전하게 저장되며, 12단 상세페이지 생성 및 이미지 렌더링에만 직접 호출됩니다.
            </div>
          </div>

          {/* 알림 메시지 */}
          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
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

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              닫기
            </button>
            <button
              type="submit"
              disabled={isSaving || !inputKey.trim()}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              {isSaving ? "저장 중..." : "API 키 저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
