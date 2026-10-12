"use client";

import React, { useState, useEffect } from "react";
import { Key, CheckCircle, AlertTriangle, ExternalLink, X, Loader2 } from "lucide-react";
import { ApiKeyValidationResult } from "@/lib/gemini";

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
  const [diagnostics, setDiagnostics] = useState<ApiKeyValidationResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentKey();
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
    setDiagnostics(null);

    try {
      const res = await fetch("/api/user-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "API 키 검증 및 저장에 실패했습니다.");
        if (data.diagnostics) setDiagnostics(data.diagnostics);
        return;
      }

      setHasKey(true);
      setMaskedKey(data.maskedKey);
      setDiagnostics(data.diagnostics);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* 모달 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Google Gemini API 키 연동</h2>
              <p className="text-[11px] text-slate-500">회원 본인 키 직접 등록 (운영자 키 폴백 없음)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-5 space-y-4 text-xs">
          {/* 현재 상태 배지 */}
          {hasKey && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200/60 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-emerald-900">본인 API 키 연동 완료</div>
                  <div className="text-[11px] text-emerald-700 font-mono mt-0.5">{maskedKey}</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                정상
              </span>
            </div>
          )}

          {/* 키 발급 안내 */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="font-semibold text-slate-800 flex items-center justify-between">
              <span>Google AI Studio에서 무료 발급</span>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-amber-600 hover:text-amber-700 inline-flex items-center gap-1 font-bold text-[11px]"
              >
                발급받기 <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              • Gemini 2.5 Flash / 3.1 Flash Image 기반의 초고해상도 이미지 생성을 위해 본인 API 키가 필요합니다.
              <br />
              • 개인 키는 암호화되어 본인 계정에만 안전하게 적용됩니다.
            </p>
          </div>

          {/* 키 입력 폼 */}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                {hasKey ? "새 API 키로 변경하기" : "API 키 입력"}
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono bg-white"
              />
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-[11px]">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* 3단계 기능 진단 결과 */}
            {diagnostics && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px]">
                <div className="font-semibold text-slate-800">🔍 API 키 기능 진단 결과</div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <div
                    className={`p-2 rounded-lg text-center ${
                      diagnostics.canGenerateText
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    <div className="font-bold">텍스트 분석</div>
                    <div className="text-[10px]">{diagnostics.canGenerateText ? "지원됨" : "실패"}</div>
                  </div>

                  <div
                    className={`p-2 rounded-lg text-center ${
                      diagnostics.canGenerateStandard
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    <div className="font-bold">표준 이미지</div>
                    <div className="text-[10px]">
                      {diagnostics.canGenerateStandard ? "지원됨 (1K)" : "미지원"}
                    </div>
                  </div>

                  <div
                    className={`p-2 rounded-lg text-center ${
                      diagnostics.canGeneratePro
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <div className="font-bold">Pro 이미지</div>
                    <div className="text-[10px]">{diagnostics.canGeneratePro ? "지원됨 (2K/4K)" : "미지원"}</div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !apiKey.trim()}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
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
