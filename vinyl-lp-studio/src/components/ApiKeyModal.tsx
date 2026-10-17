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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#141620] border border-[#272b3f] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-200">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#272b3f] bg-[#0c0d12]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm md:text-base">
                Google Gemini API 키 연동
              </h3>
              <p className="text-[11px] text-slate-400">본인 계정의 키로 독립 운영됩니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1b1e2c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 space-y-5">
          {/* 현재 등록 상태 */}
          <div className="p-3.5 rounded-xl bg-[#0c0d12] border border-[#272b3f] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  maskedKey ? "bg-emerald-400 ring-4 ring-emerald-500/20" : "bg-slate-600"
                }`}
              />
              <div>
                <p className="text-xs font-semibold text-slate-300">현재 연동 상태</p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {maskedKey ? maskedKey : "등록된 API 키 없음"}
                </p>
              </div>
            </div>
            {maskedKey && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                연동됨
              </span>
            )}
          </div>

          {/* 입력 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                새 Gemini API 키 등록 / 변경
              </label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 bg-[#0c0d12] border border-[#272b3f] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono"
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  message.type === "success"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
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
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? "저장 및 검증 중..." : "API 키 저장 및 연동"}
            </button>
          </form>

          {/* 안내 배너 */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>개인 API 키 보안 안내</span>
            </div>
            <p className="text-amber-200/80">
              등록된 키는 본인 계정에만 암호화되어 보관되며, Google Gemini AI 이미지 생성 및 스타일에만 직접 사용됩니다.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-amber-400 font-bold hover:underline pt-0.5"
            >
              Google AI Studio에서 무료 API 키 발급받기
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
