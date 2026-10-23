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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-mx-border bg-mx-surface shadow-xl">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-mx-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#78350f]/60 text-[#fde68a]">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-mx-text">🔑 API키등록·플랫폼연동</h3>
              <p className="text-xs text-mx-muted">
                회원님 본인 Gemini 키로만 동작합니다 (운영자 키 대신 사용 없음)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-mx-muted hover:bg-mx-raised hover:text-mx-text"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 space-y-5">
          {/* 1. API 키 입력 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-mx-text">
                Google Gemini API 키
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-mx-link hover:underline"
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
              className="mx-input font-mono text-sm"
            />
            <p className="text-xs text-mx-muted">
              * 입력하신 키는 이 브라우저와 회원님 계정(본인만 조회)에 저장됩니다.
            </p>
          </div>

          {/* 2. AI 모델 선택 */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-mx-text">
              AI 분석 모델
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mx-input text-sm"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (권장, 초고속 구조화 추출)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (안정적 표준 모델)</option>
            </select>
          </div>

          {/* 3. 연결 테스트 버튼 & 상태 */}
          <div className="space-y-2 border-t border-mx-border pt-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={testStatus === "testing" || !apiKey.trim()}
              className="mx-btn-ghost w-full"
            >
              {testStatus === "testing" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-mx-link" />
                  <span>연결 테스트 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-mx-accent" />
                  <span>API 키 연결 테스트</span>
                </>
              )}
            </button>

            {testStatus === "success" && (
              <div className="flex items-center gap-2 rounded-xl bg-[#064e3b]/60 p-2.5 text-sm font-medium text-[#a7f3d0]">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-mx-success" />
                <span>{testMessage}</span>
              </div>
            )}
            {testStatus === "error" && (
              <div className="flex items-center gap-2 rounded-xl bg-[#4c0519]/50 p-2.5 text-sm font-medium text-[#fecdd3]">
                <AlertCircle className="h-4 w-4 shrink-0 text-mx-danger" />
                <span>{testMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex items-center justify-end gap-2 border-t border-mx-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="mx-btn-ghost"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="mx-btn-primary"
          >
            설정 저장
          </button>
        </div>
      </div>
    </div>
  );
}
