"use client";

import React, { useState } from "react";
import { currentTextModel, textModelGroups, textModelProvider, TEXT_PROVIDER_LABEL, type TextProvider } from "@/lib/textModels";
import { KeyRound, X, CheckCircle2, AlertCircle, Sparkles, ExternalLink, Loader2 } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  /** v1.15: 플랫폼별 본인 키 등록 여부(OpenAI·Claude 키 값은 화면에 오지 않음) */
  keyStatus: Record<TextProvider, boolean>;
  onProviderKeySaved: (provider: TextProvider) => void;
}

// OpenAI·Claude 키 발급 주소(Gemini는 아래 기존 링크)
const KEY_ISSUE_URL: Record<"openai" | "anthropic", string> = {
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
};

export function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  selectedModel,
  onSelectModel,
  keyStatus,
  onProviderKeySaved,
}: SettingsModalProps) {
  const [inputKey, setInputKey] = useState(apiKey || "");
  const [model, setModel] = useState(currentTextModel(selectedModel));
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [otherKey, setOtherKey] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const provider = textModelProvider(model);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!inputKey.trim()) {
      setTestStatus("error");
      setTestMessage("API 키를 먼저 입력해주세요.");
      return;
    }

    setTestStatus("testing");
    setTestMessage("Gemini API 연결 확인 중...");

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${provider === "gemini" ? model : "gemini-3.8-flash"}:generateContent?key=${inputKey.trim()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Hello, reply with OK" }] }],
          }),
        }
      );

      if (res.ok) {
        setTestStatus("success");
        setTestMessage("Gemini API 연결 성공! 유효한 키입니다.");
      } else {
        const err = await res.text();
        setTestStatus("error");
        setTestMessage(`연결 실패 (${res.status}): ${err.slice(0, 100)}`);
      }
    } catch (e: any) {
      setTestStatus("error");
      setTestMessage(e.message || "연결 테스트 실패");
    }
  };

  const handleSave = async () => {
    setSaveError("");
    const trimmed = inputKey.trim();
    const other = otherKey.trim();

    // OpenAI·Claude 키는 본인 계정(공용 user_api_keys)에만 저장한다 — 브라우저에는 남기지 않음.
    if (provider !== "gemini" && other) {
      setIsSaving(true);
      try {
        const res = await fetch("/api/user/key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, apiKey: other }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaveError(data?.error || "키 저장에 실패했습니다.");
          return;
        }
        onProviderKeySaved(provider);
        setOtherKey("");
      } catch {
        setSaveError("키 저장에 실패했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      } finally {
        setIsSaving(false);
      }
    }

    onSaveApiKey(trimmed);
    onSelectModel(model);
    localStorage.setItem("ebook_studio_gemini_model", model);

    if (trimmed) {
      localStorage.setItem("ebook_studio_gemini_api_key", trimmed);

      // 서버 DB 동기화
      fetch("/api/user/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "gemini", apiKey: trimmed }),
      })
        .then((res) => {
          if (res.ok) onProviderKeySaved("gemini");
        })
        .catch((e) => console.warn("Failed to sync key to server:", e));
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
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

        {/* 본문 */}
        <div className="p-6 space-y-5">
          {/* AI 모델 선택 — OpenAI → Claude → Gemini 순 (v1.15) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              AI 집필 & 목차 생성 모델
            </label>
            <select
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setSaveError("");
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              {textModelGroups().map((g) => (
                <optgroup key={g.provider} label={g.label}>
                  {g.models.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              고른 모델 플랫폼의 본인 API 키로 호출합니다. 표지 이미지는 Gemini 키를 씁니다.
            </p>
          </div>

          {provider !== "gemini" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  {TEXT_PROVIDER_LABEL[provider]} API Key
                </label>
                <a
                  href={KEY_ISSUE_URL[provider]}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>키 발급받기</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border font-medium ${
                  keyStatus[provider]
                    ? "text-emerald-600 bg-emerald-50/80 border-emerald-200/60"
                    : "text-amber-700 bg-amber-50/80 border-amber-200/60"
                }`}
              >
                {keyStatus[provider] ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{keyStatus[provider] ? "본인 키 등록됨 — 바꾸려면 아래에 새 키를 입력하세요." : "아직 등록된 본인 키가 없습니다."}</span>
              </div>
              <input
                type="password"
                value={otherKey}
                onChange={(e) => {
                  setOtherKey(e.target.value);
                  setSaveError("");
                }}
                placeholder={provider === "openai" ? "sk-..." : "sk-ant-..."}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                * 이 키는 본인 계정에만 저장되며(메인 사이트 「API 키 설정」과 같은 곳) 브라우저에는 남기지 않습니다.
              </p>
            </div>
          )}

          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Google Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>무료 키 발급받기</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                setTestStatus("idle");
              }}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              * 입력하신 API 키는 브라우저 로컬 저장소 및 본인 계정에만 안전하게 보관되며 외부로 유출되지 않습니다.
            </p>
          </div>

          {/* 연결 테스트 버튼 */}
          <div>
            <button
              type="button"
              onClick={handleTestKey}
              disabled={testStatus === "testing" || !inputKey.trim()}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {testStatus === "testing" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                  <span>연결 확인 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>API 키 연결 테스트</span>
                </>
              )}
            </button>

            {testStatus === "success" && (
              <div className="mt-2.5 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50/80 px-3 py-2 rounded-lg border border-emerald-200/60 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{testMessage}</span>
              </div>
            )}
            {testStatus === "error" && (
              <div className="mt-2.5 flex items-center gap-2 text-xs text-rose-600 bg-rose-50/80 px-3 py-2 rounded-lg border border-rose-200/60 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{testMessage}</span>
              </div>
            )}
          </div>
        </div>

        {saveError && (
          <div className="mx-6 mb-3 flex items-center gap-2 text-xs text-rose-600 bg-rose-50/80 px-3 py-2 rounded-lg border border-rose-200/60 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* 모달 푸터 */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 transition disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "설정 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
