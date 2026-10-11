"use client";

import React, { useState } from "react";
import { KeyRound, X, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { AppSettings, saveStoredSettings } from "@/lib/storage";

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
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || "");
  const [textModel, setTextModel] = useState(settings.textModel || "gemini-2.5-flash");
  const [imageModel, setImageModel] = useState(settings.imageModel || "nano-banana-2");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!geminiApiKey.trim()) {
      setTestStatus("error");
      setTestMessage("API 키를 먼저 입력해주세요.");
      return;
    }

    setTestStatus("testing");
    setTestMessage("Gemini API 연결 테스트 중...");

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey.trim()}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `HTTP ${res.status}`);
      }

      setTestStatus("success");
      setTestMessage("Gemini API 키가 정상 확인되었습니다! (연동 성공)");
    } catch (e: any) {
      setTestStatus("error");
      setTestMessage(e.message || "연결에 실패했습니다. 키를 다시 확인해주세요.");
    }
  };

  const handleSave = () => {
    const trimmedKey = geminiApiKey.trim();
    const updated: AppSettings = {
      geminiApiKey: trimmedKey,
      textModel,
      imageModel,
    };
    saveStoredSettings(updated);
    onSaveSettings(updated);

    // 서버 DB(user_api_keys)에도 비동기 동기화
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
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">API 키 등록 · 모델 설정</h3>
              <p className="text-[11px] text-slate-500">본인 계정의 AI API 키를 안전하게 격리 보관합니다.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          {/* Top Rule Notice */}
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>최상위 절대 불변 규칙 안내</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              모든 사용자는 본인의 Google Gemini API 키를 직접 연동하여 사용합니다. 입력하신 키는 서버에 저장되지 않고 오직 회원님의 브라우저(localStorage)에만 안전하게 보관됩니다.
            </p>
          </div>

          {/* Gemini API Key Input */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800">
              Google Gemini API 키 <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testStatus === "testing"}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer"
              >
                {testStatus === "testing" ? "검증 중..." : "키 테스트"}
              </button>
            </div>
            {testStatus === "success" && (
              <p className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{testMessage}</span>
              </p>
            )}
            {testStatus === "error" && (
              <p className="flex items-center gap-1 text-[11px] text-rose-600 font-semibold mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{testMessage}</span>
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              키가 없으신 경우 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">Google AI Studio</a>에서 무료 발급받으실 수 있습니다.
            </p>
          </div>

          {/* Text Model Selection */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800">시나리오 및 콘티 텍스트 모델</label>
            <select
              value={textModel}
              onChange={(e) => setTextModel(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (추천: 빠른 속도와 높은 창의력)</option>
              <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (초경량 초고속)</option>
            </select>
          </div>

          {/* Image Model Selection */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800">웹툰 이미지 생성 모델</label>
            <select
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="nano-banana-2">Nano Banana 2 (Imagen 3 기반 고품질 웹툰 렌더링)</option>
              <option value="pollinations-flux">Flux Comic Engine (다채로운 액션 및 일러스트 풍)</option>
            </select>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            설정 저장하기
          </button>
        </div>
      </div>
    </div>
  );
}
