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
      <div className="bg-[#181818] border border-[#272727] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-white">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#272727] bg-[#141414]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-900/40 text-[#ff0000] flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm md:text-base">
                Google Gemini API 키 연동
              </h3>
              <p className="text-[11px] text-[#aaaaaa]">본인 계정의 키로 독립 운영됩니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#aaaaaa] hover:text-white hover:bg-[#272727] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 space-y-5">
          {/* 현재 등록 상태 */}
          <div className="p-3.5 rounded-xl bg-[#212121] border border-[#272727] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  maskedKey ? "bg-emerald-400 ring-4 ring-emerald-950" : "bg-[#555555]"
                }`}
              />
              <div>
                <p className="text-xs font-semibold text-white">현재 연동 상태</p>
                <p className="text-[11px] text-[#aaaaaa] font-mono mt-0.5">
                  {maskedKey ? maskedKey : "등록된 API 키 없음"}
                </p>
              </div>
            </div>
            {maskedKey && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-900/40">
                연동됨
              </span>
            )}
          </div>

          {/* 입력 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#aaaaaa] mb-1.5">
                새 Gemini API 키 등록 / 변경
              </label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 bg-[#121212] border border-[#272727] rounded-xl text-xs text-white placeholder:text-[#555555] focus:outline-hidden focus:border-[#ff0000] transition-all font-mono"
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  message.type === "success"
                    ? "bg-emerald-950/50 text-emerald-300 border border-emerald-900/40"
                    : "bg-rose-950/50 text-rose-300 border border-rose-900/40"
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
              className="w-full py-2.5 px-4 bg-[#ff0000] hover:bg-[#cc0000] text-white rounded-xl text-xs font-bold shadow-md shadow-red-950 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? "저장 및 검증 중..." : "API 키 저장 및 연동"}
            </button>
          </form>

          {/* 안내 배너 */}
          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/30 text-[11px] text-[#f1f1f1] space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-[#ff4e45]">
              <Shield className="w-3.5 h-3.5 text-[#ff0000]" />
              <span>개인 API 키 보안 원칙</span>
            </div>
            <p className="text-[#aaaaaa]">
              등록된 키는 회원 본인 브라우저와 격리 DB에 안전하게 암호화되어 보관되며, AI 배경 생성 시에만 직접 호출됩니다.
            </p>
            <p className="text-[#aaaaaa]">
              💳 키 발급은 무료지만, 배경 이미지를 생성할 때마다 Google 이미지 모델 요금이 본인 Google 계정에 부과될 수 있습니다.{" "}
              <a href="https://ai.google.dev/gemini-api/docs/pricing" target="_blank" rel="noreferrer" className="text-[#ff4e45] font-bold hover:underline">공식 가격표</a>에서 확인해 주세요.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[#ff4e45] font-bold hover:underline pt-0.5"
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
