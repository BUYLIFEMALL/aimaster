"use client";

import React, { useState } from "react";
import { KeyRound, X, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { AppSettings, saveStoredSettings } from "@/lib/storage";
import { ScheduleSettings } from "./ScheduleSettings";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  hasKey: boolean;
  onSaveSettings: (newSettings: AppSettings) => void;
  onKeySaved: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  hasKey,
  onSaveSettings,
  onKeySaved,
}: SettingsModalProps) {
  // 키 입력칸은 비워 두고(원문은 서버에만), 새 키를 넣을 때만 서버로 보낸다(v1.27)
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [textModel, setTextModel] = useState(settings.textModel || "gemini-2.5-flash");
  const [imageModel, setImageModel] = useState(settings.imageModel || "nano-banana-2");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!keyInput.trim()) {
      setTestStatus("error");
      setTestMessage("API 키를 먼저 입력해주세요.");
      return;
    }

    setTestStatus("testing");
    setTestMessage("Gemini API 연결 테스트 중...");

    try {
      // 키 확인은 서버가 한다(키를 브라우저에서 Google로 직접 보내지 않음, 저장하지 않음)
      const res = await fetch("/api/user/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyInput.trim(), test: true }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || `HTTP ${res.status}`);
      }

      setTestStatus("success");
      setTestMessage("Gemini API 키가 정상 확인되었습니다! (연동 성공)");
    } catch (e: any) {
      setTestStatus("error");
      setTestMessage(e.message || "연결에 실패했습니다. 키를 다시 확인해주세요.");
    }
  };

  const handleSave = async () => {
    const trimmedKey = keyInput.trim();
    // 모델 선택만 이 브라우저에 저장(키는 저장하지 않음)
    const updated: AppSettings = { textModel, imageModel };
    saveStoredSettings(updated);
    onSaveSettings(updated);

    // 새 키를 입력했으면 서버 DB(user_api_keys, 회원 본인)에만 저장
    if (trimmedKey) {
      setSaving(true);
      try {
        const res = await fetch("/api/user/key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: trimmedKey }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData?.error || `HTTP ${res.status}`);
        }
        onKeySaved();
        setKeyInput("");
      } catch (e: any) {
        setTestStatus("error");
        setTestMessage(`키 저장에 실패했습니다: ${e.message || "알 수 없는 오류"}`);
        return;
      } finally {
        setSaving(false);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#121620] rounded-2xl shadow-2xl border border-[#232b3e] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232b3e] bg-[#181d2a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">API 키 등록 · 모델 설정</h3>
              <p className="text-[11px] text-slate-400">본인 계정의 AI API 키를 안전하게 격리 보관합니다.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-[#232b3e] hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          {/* Top Rule Notice */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>최상위 절대 불변 규칙 안내</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed font-medium">
              모든 사용자는 본인의 Google Gemini API 키를 직접 연동하여 사용합니다. 입력하신 키는 회원님 본인 계정의 서버 저장소(다른 AIMaster 프로그램과 공용)에만 보관되고, 브라우저에는 남기지 않습니다. AI 호출도 서버가 본인 키로 대신 합니다.
            </p>
          </div>

          {/* Gemini API Key Input */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-200">
              Google Gemini API 키 <span className="text-rose-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={hasKey ? "등록됨 — 바꿀 때만 새 키 입력" : "AIzaSy..."}
                className="flex-1 px-3 py-2 border border-[#232b3e] rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-[#0a0d14] text-slate-100 placeholder:text-slate-500 font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testStatus === "testing"}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer"
              >
                {testStatus === "testing" ? "검증 중..." : "키 테스트"}
              </button>
            </div>
            {testStatus === "success" && (
              <p className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{testMessage}</span>
              </p>
            )}
            {testStatus === "error" && (
              <p className="flex items-center gap-1 text-[11px] text-rose-400 font-semibold mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{testMessage}</span>
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              키가 없으신 경우 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-semibold">Google AI Studio</a>에서 무료 발급받으실 수 있습니다.
            </p>
          </div>

          {/* Text Model Selection */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-200">시나리오 및 콘티 텍스트 모델</label>
            <select
              value={textModel}
              onChange={(e) => setTextModel(e.target.value as any)}
              className="w-full px-3 py-2 border border-[#232b3e] rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-[#0a0d14] text-slate-100"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (추천: 빠른 속도와 높은 창의력)</option>
              <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (초경량 초고속)</option>
            </select>
          </div>

          {/* Image Model Selection */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-200">웹툰 이미지 생성 모델</label>
            <select
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value as any)}
              className="w-full px-3 py-2 border border-[#232b3e] rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-[#0a0d14] text-slate-100"
            >
              <option value="nano-banana-2">Nano Banana 2 (정식 gemini-nano-banana-2.1 고품질 웹툰 렌더링)</option>
              <option value="pollinations-flux">Flux Comic Engine (무료 대체 렌더러)</option>
            </select>
          </div>
        </div>

        {/* ⏰ 예약 발행(v1.16) — 실행 방식 선택 + cron-job.org 키 한 줄(지침 docs/SCHEDULER_POLICY.md) */}
        <ScheduleSettings />

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-[#232b3e] bg-[#181d2a]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#232b3e] hover:bg-[#232b3e] text-slate-300 font-bold rounded-xl transition cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            {saving ? "저장 중..." : "설정 저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
