"use client";

import React, { useState, useEffect } from "react";
import { Key, CheckCircle, AlertTriangle, ExternalLink, X, Loader2 } from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
}

export default function ApiKeyModal({ isOpen, onClose, onKeySaved }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentKey();
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const fetchCurrentKey = async () => {
    try {
      const res = await fetch("/api/user-key");
      const data = await res.json();
      if (data.hasKey) {
        setHasKey(true);
        setMaskedKey(data.maskedKey);
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError("API 키를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/user-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "API 키 검증 및 저장에 실패했습니다.");
        return;
      }

      setHasKey(true);
      setMaskedKey(data.maskedKey);
      setSuccessMsg("Google Gemini API 키가 성공적으로 검증 및 저장되었습니다.");
      setApiKey("");
      if (onKeySaved) onKeySaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "네트워크 오류가 발생했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#0a0e19] rounded-2xl shadow-2xl border border-[#1a2333] w-full max-w-md overflow-hidden text-slate-100">
        {/* 모달 헤더 */}
        <div className="px-5 py-4 border-b border-[#1a2333] flex items-center justify-between bg-[#080d19]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] flex items-center justify-center font-bold">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Google Gemini API 키 연동</h2>
              <p className="text-[11px] text-slate-400">회원 본인 키 직접 등록 (운영자 키 폴백 없음)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-5 space-y-4 text-xs">
          {/* 현재 상태 배지 */}
          {hasKey && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-emerald-300">본인 API 키 연동 완료</div>
                  <div className="text-[11px] text-emerald-400 font-mono mt-0.5">{maskedKey}</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                정상 연동
              </span>
            </div>
          )}

          {/* 키 발급 안내 */}
          <div className="p-3.5 bg-[#060911] rounded-xl border border-[#1a2333] space-y-2">
            <div className="font-semibold text-slate-200 flex items-center justify-between">
              <span>Google AI Studio에서 무료 발급</span>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[#00f0ff] hover:underline inline-flex items-center gap-1 font-bold text-[11px]"
              >
                발급받기 <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              • Gemini 2.5 Flash 멀티모달 오디오 분석을 위해 회원 본인의 API 키가 필요합니다.
              <br />
              • 개인 키는 브라우저 및 안전한 Supabase DB에 보관되며 회원 본인의 오디오 분석에만 사용됩니다.
            </p>
          </div>

          {/* 키 입력 폼 */}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                {hasKey ? "새 API 키로 변경하기" : "API 키 입력"}
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#1a2333] rounded-xl text-xs focus:outline-hidden focus:border-[#00f0ff] font-mono bg-[#060911] text-white placeholder-slate-600 transition"
              />
            </div>

            {error && (
              <div className="p-2.5 bg-red-950/40 border border-red-500/40 rounded-lg flex items-start gap-2 text-red-300 text-[11px]">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-start gap-2 text-emerald-300 text-[11px]">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !apiKey.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#00f0ff] to-[#7000ff] hover:opacity-95 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.2)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>키 검증 및 저장 중...</span>
                </>
              ) : (
                <span>API 키 유효성 검사 및 저장</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
