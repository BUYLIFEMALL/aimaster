"use client";

import React, { useState } from "react";
import { X, Key, CheckCircle, AlertCircle, Loader2, ExternalLink, ShieldCheck } from "lucide-react";
import { testGeminiConnection } from "@/lib/gemini";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export default function ApiKeyModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}: ApiKeyModalProps) {
  const [inputKey, setInputKey] = useState(apiKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!inputKey.trim()) {
      setTestStatus("error");
      setErrorMessage("API 키를 먼저 입력해주세요.");
      return;
    }

    setIsTesting(true);
    setTestStatus("idle");
    setErrorMessage("");

    try {
      await testGeminiConnection(inputKey);
      setTestStatus("success");
    } catch (err: any) {
      setTestStatus("error");
      setErrorMessage(err.message || "연결 테스트 실패");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveApiKey(inputKey.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#131824] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#222d42] relative text-[#f8fafc]">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#182030] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Google Gemini API 설정</h2>
            <p className="text-[11px] text-amber-400 font-medium">회원 본인 키 직접 등록 원칙</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed bg-[#0c0f17] p-3 rounded-xl border border-[#222d42]">
          유튜브 3대 A/B 전략 분석과 16:9 고화질 썸네일 생성을 위해 <strong>사용자 본인의 Google Gemini API 키</strong>가 필요합니다.
          입력하신 키는 브라우저 로컬 저장소에 안전하게 보관됩니다.
        </p>

        <div className="space-y-3.5 mb-5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Gemini API Key
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                setTestStatus("idle");
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-[#182030] border border-[#2e3b55] rounded-xl text-white placeholder-slate-500 focus:border-red-500 outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
            <span>키가 없으신가요?</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 font-semibold hover:underline inline-flex items-center gap-1"
            >
              Google AI Studio에서 무료 발급
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Test Status feedback */}
          {testStatus === "success" && (
            <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>API 키가 정상적으로 연결되었습니다!</span>
            </div>
          )}

          {testStatus === "error" && (
            <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="break-all">{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#222d42]">
          <button
            onClick={handleTest}
            disabled={isTesting || !inputKey.trim()}
            className="px-4 py-2.5 text-xs font-semibold text-slate-300 bg-[#182030] hover:bg-[#222d42] border border-[#222d42] rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            연결 테스트
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 rounded-xl transition-all shadow-md shadow-red-500/20"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}
