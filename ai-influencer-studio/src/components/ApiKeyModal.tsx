"use client";

import { useState } from "react";
import { X, Key, Shield, ExternalLink, Check, AlertCircle } from "lucide-react";
import { ScheduleSettings } from "./ScheduleSettings";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-if-surface border border-if-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-if-border bg-if-raised">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-if-text text-sm md:text-base">
                Google Gemini API 키 설정
              </h3>
              <p className="text-[11px] text-if-muted">회원 본인 키 직접 등록 및 연동</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-if-muted hover:text-if-text hover:bg-if-raised transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 본문 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 최상위 규칙 안내 박스 */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <span>최상위 불변 보안 규칙</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-300">
              AIMaster의 모든 AI 기능은 <strong>사용자 본인의 개인 API 키</strong>로만 안전하게 동작합니다. 운영자나 타인의 키로 대신 처리하지 않으며, 등록하신 키는 본인 계정에만 암호화되어 공유 연동됩니다.
            </p>
          </div>

          {/* 현재 등록 상태 */}
          {maskedKey && (
            <div className="p-3 rounded-lg bg-if-raised border border-if-border flex items-center justify-between text-xs">
              <span className="text-if-muted font-medium">현재 등록된 키:</span>
              <span className="font-mono text-emerald-400 font-semibold">{maskedKey}</span>
            </div>
          )}

          {/* 키 입력창 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-if-text">
              새로운 Gemini API 키 입력
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-if-border text-if-text text-xs focus:outline-hidden focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-mono"
            />
          </div>

          {/* 메시지 알림 */}
          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                  : "bg-rose-500/10 text-rose-300 border border-rose-500/40"
              }`}
            >
              {message.type === "success" ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* 키 발급 안내 링크 */}
          <div className="pt-1 flex items-center justify-between text-[11px] text-if-muted">
            <span>아직 키가 없으신가요?</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 font-semibold hover:underline inline-flex items-center gap-1"
            >
              Google AI Studio 무료 발급
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* 하단 버튼 */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-if-muted hover:bg-if-raised transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-sm shadow-pink-500/20 disabled:opacity-50 transition-all"
            >
              {isSaving ? "저장 중..." : "API 키 저장"}
            </button>
          </div>
        </form>

        {/* ⏰ 예약 발행(v1.15) — 실행 방식 선택 + cron-job.org 키 한 줄(지침 docs/SCHEDULER_POLICY.md) */}
        <ScheduleSettings />
      </div>
    </div>
  );
}
