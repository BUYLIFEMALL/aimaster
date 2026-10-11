"use client";

import React, { useState } from "react";
import { X, Key, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4 text-indigo-600">
          <Key className="w-6 h-6" />
          <h2 className="text-lg font-bold text-slate-900">Google Gemini API 설정</h2>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          유튜브 A/B 전략 분석과 16:9 고화질 썸네일 생성을 위해 <strong>사용자 본인의 Google Gemini API 키</strong>가 필요합니다.
          입력하신 키는 서버로 전송되지 않고 브라우저의 <strong>localStorage</strong>에만 안전하게 보관됩니다.
        </p>

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
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
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>키가 없으신가요?</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1"
            >
              Google AI Studio에서 발급받기
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Test Status feedback */}
          {testStatus === "success" && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>API 키가 정상적으로 연결되었습니다!</span>
            </div>
          )}

          {testStatus === "error" && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="break-all">{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={handleTest}
            disabled={isTesting || !inputKey.trim()}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            연결 테스트
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}
