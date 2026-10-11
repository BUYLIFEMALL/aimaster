"use client";

import React, { useState } from "react";
import { KeyRound, X, CheckCircle2, AlertCircle, Sparkles, ExternalLink, Loader2 } from "lucide-react";
import { AppSettings } from "@/lib/types";
import { saveStoredSettings } from "@/lib/storage";
import { testGeminiConnection } from "@/lib/gemini";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || "");
  const [model, setModel] = useState(settings.geminiModel || "gemini-2.5-flash");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestStatus("error");
      setTestMessage("API 키를 먼저 입력해주세요.");
      return;
    }

    setTestStatus("testing");
    setTestMessage("Gemini API 연결 확인 중...");

    try {
      await testGeminiConnection(apiKey.trim());
      setTestStatus("success");
      setTestMessage("Gemini API 연결 성공! 유효한 키입니다.");
    } catch (e: any) {
      setTestStatus("error");
      setTestMessage(e.message || "연결 테스트 실패");
    }
  };

  const handleSave = () => {
    const trimmedKey = apiKey.trim();
    const updated: AppSettings = {
      geminiApiKey: trimmedKey,
      geminiModel: model,
    };
    saveStoredSettings(updated);
    onSaveSettings(updated);

    // 서버 DB(user_api_keys) 동기화
    if (trimmedKey) {
      fetch("/api/user/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmedKey }),
      }).catch((e) => console.warn("Failed to sync key to server:", e));
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">API 키 & 환경설정</h3>
              <p className="text-[11px] text-slate-500">
                사용자 개인 API 키 격리 보관 원칙 준수
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 space-y-5">
          {/* 1. API 키 입력 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Google Gemini API 키
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-medium"
              >
                <span>무료 키 발급받기</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-indigo-500/10 transition-all"
            />
            <p className="text-[11px] text-slate-400">
              * 입력하신 API 키는 브라우저 로컬스토리지에 격리 보관되며 안전하게 보호됩니다.
            </p>
          </div>

          {/* 2. AI 모델 선택 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              AI 분석 모델
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-indigo-500/10 transition-all"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (권장, 초고속 구조화 추출)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (안정적 표준 모델)</option>
            </select>
          </div>

          {/* 3. 연결 테스트 버튼 & 상태 */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={testStatus === "testing" || !apiKey.trim()}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {testStatus === "testing" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>연결 테스트 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>API 키 연결 테스트</span>
                </>
              )}
            </button>

            {testStatus === "success" && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{testMessage}</span>
              </div>
            )}
            {testStatus === "error" && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{testMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 shadow-sm transition-all cursor-pointer"
          >
            설정 저장
          </button>
        </div>
      </div>
    </div>
  );
}
