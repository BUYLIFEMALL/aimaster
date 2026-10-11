"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Cpu,
  Image as ImageIcon,
  ShieldCheck,
} from "lucide-react";
import { AppSettings, getStoredSettings, saveStoredSettings } from "@/lib/storage";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: AppSettings) => void;
}

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [replicateKey, setReplicateKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [textModel, setTextModel] = useState<"gemini-flash-latest" | "gemini-flash-lite-latest">("gemini-flash-latest");
  const [imageModel, setImageModel] = useState<"nano-banana-2" | "nano-banana-2-lite">("nano-banana-2");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const s = getStoredSettings();
      setApiKey(s.geminiApiKey);
      setOpenaiKey(s.openaiApiKey ?? "");
      setAnthropicKey(s.anthropicApiKey ?? "");
      setReplicateKey(s.replicateApiKey ?? "");
      setTextModel(s.textModel);
      setImageModel(s.imageModel);
      setTestStatus("idle");
      setTestMessage("");
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestStatus("error");
      setTestMessage("Gemini API 키를 먼저 입력해주세요.");
      return;
    }

    setTestStatus("testing");
    setTestMessage("Gemini API 서버와 연결 확인 중...");

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`,
        { method: "GET" }
      );
      if (res.ok) {
        setTestStatus("success");
        setTestMessage("Gemini API 연결에 성공했습니다! (정상 작동 확인)");
      } else {
        const errData = await res.json().catch(() => ({}));
        setTestStatus("error");
        setTestMessage(
          errData?.error?.message || "유효하지 않은 API 키이거나 권한이 없습니다."
        );
      }
    } catch (e: unknown) {
      setTestStatus("error");
      setTestMessage(
        e instanceof Error ? e.message : "네트워크 연결 오류가 발생했습니다."
      );
    }
  };

  const handleSave = () => {
    // 모델 선택 등 다른 저장값은 그대로 두고 키·기존 모델 선택만 갱신한다
    const nextSettings: AppSettings = {
      ...getStoredSettings(),
      geminiApiKey: apiKey.trim(),
      openaiApiKey: openaiKey.trim(),
      anthropicApiKey: anthropicKey.trim(),
      replicateApiKey: replicateKey.trim(),
      textModel,
      imageModel,
    };
    saveStoredSettings(nextSettings);
    setSavedSuccess(true);
    if (onSaved) onSaved(nextSettings);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleDeleteKey = () => {
    setApiKey("");
    const nextSettings: AppSettings = {
      ...getStoredSettings(),
      geminiApiKey: "",
      textModel,
      imageModel,
    };
    saveStoredSettings(nextSettings);
    setTestStatus("idle");
    setTestMessage("");
    if (onSaved) onSaved(nextSettings);
  };

  const hasSavedKey = Boolean(apiKey.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                환경설정 (API 키 및 AI 모델)
              </h2>
              <p className="text-xs text-slate-500">
                개인 계정 API 키 연동 및 작업 엔진 설정
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Banner */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <span className="font-semibold text-emerald-950">
                100% 완전 독립 다이렉트 수집기 내장:
              </span>{" "}
              네이버 상위 블로그 본문 수집(PostView) 및 최신 언론사 뉴스는 자체 실시간 다이렉트 수집기 및 Google News RSS 파이프라인이 내장되어 있어 별도의 유료 검색 API 키 없이 무료로 즉시 작동합니다.
            </div>
          </div>

          {/* Section 1: Gemini API Key */}
          <div className="p-5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Google Gemini API 키 설정
                </h3>
              </div>
              {hasSavedKey ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  로컬 저장 키 활성화됨
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  키 미등록 (무료 발급 필요)
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              본인의 Google AI Studio API 키를 등록하면 안전하게 브라우저 로컬(localStorage)에 저장되어 모든 글 생성 및 키워드 분석에 우선 적용됩니다.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-slate-700">Gemini API 키 입력</label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium hover:underline"
                >
                  무료 API 키 발급받기
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testStatus === "testing"}
                className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs"
              >
                {testStatus === "testing" ? "연결 확인 중..." : "연결 테스트"}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                로컬에 저장
              </button>
              {hasSavedKey && (
                <button
                  type="button"
                  onClick={handleDeleteKey}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition ml-auto flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  키 삭제
                </button>
              )}
            </div>

            {testStatus === "success" && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{testMessage}</span>
              </div>
            )}
            {testStatus === "error" && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{testMessage}</span>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-slate-100/70 rounded-lg text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">안전한 로컬 격리 보관:</span>{" "}
                입력하신 API 키는 외부 서버 데이터베이스로 전송되지 않으며, 사용자 본인의 브라우저(localStorage)에만 안전하게 보관되어 AI 요청 시 직접 사용됩니다.
              </div>
            </div>
          </div>

          {/* Section 1-2: 추가 AI 키 (선택) — GPT·Claude 글 생성, GPT Image·FLUX·Z-Image 이미지 */}
          <div className="p-5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">추가 AI 키 (선택)</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              글 생성에 GPT·Claude를, 이미지 생성에 GPT Image·FLUX·Z-Image를 쓰고 싶을 때만 등록하세요. 선택한 모델의 공급사 키만 사용하며, 키가 없으면 다른 공급사로 자동 전환하지 않고 안내만 합니다. 주제 추천·키워드 분석은 기존대로 Gemini 키를 씁니다.
            </p>
            {([
              ["OpenAI API 키 (GPT 글 · GPT Image)", openaiKey, setOpenaiKey, "sk-...", "https://platform.openai.com/api-keys"],
              ["Anthropic API 키 (Claude 글)", anthropicKey, setAnthropicKey, "sk-ant-...", "https://console.anthropic.com/settings/keys"],
              ["Replicate API 키 (FLUX 2.0 · Z-Image)", replicateKey, setReplicateKey, "r8_...", "https://replicate.com/account/api-tokens"],
            ] as const).map(([label, value, setter, placeholder, link]) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-700">{label}</label>
                  <a href={link} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium hover:underline">
                    키 발급받기
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type={showKey ? "text" : "password"}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            ))}
            <p className="text-[11px] text-slate-500">
              키는 이 브라우저(localStorage)에만 저장됩니다. 다만 Replicate(FLUX·Z-Image)는 브라우저에서 직접 호출할 수 없어, 이미지를 만드는 순간에만 키가 AIMaster 서버를 거쳐 전달되며 서버에는 저장하지 않습니다. 입력 후 아래 [로컬에 저장]을 눌러주세요.
            </p>
          </div>

          {/* Section 2: Text Model Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  텍스트 및 분석 모델 선택
                </h3>
              </div>
              <span className="text-[11px] text-indigo-600 font-semibold">기본 엔진</span>
            </div>
            <p className="text-xs text-slate-500">
              블로그 본문 작성, SEO 키워드 추출, 핫플레이스 분석, 인터랙티브 요소 추천에 사용할 모델을 선택합니다.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTextModel("gemini-flash-latest")}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  textModel === "gemini-flash-latest"
                    ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">
                    gemini-flash-latest
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-md">
                    추천
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  최신 플래시 모델 · 정밀 서술 & 심층 분석
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTextModel("gemini-flash-lite-latest")}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  textModel === "gemini-flash-lite-latest"
                    ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">
                    gemini-flash-lite-latest
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-md">
                    초고속
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  초고속 경량화 모델 · 빠른 탐색 & 경제적
                </p>
              </button>
            </div>
          </div>

          {/* Section 3: Image Model Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  AI 이미지 생성 모델 선택
                </h3>
              </div>
              <span className="text-[11px] text-purple-600 font-semibold">이미지 엔진</span>
            </div>
            <p className="text-xs text-slate-500">
              블로그 포스트의 대표 썸네일 및 본문 서브 이미지를 생성할 엔진을 선택합니다.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setImageModel("nano-banana-2")}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  imageModel === "nano-banana-2"
                    ? "border-purple-600 bg-purple-50/50 ring-2 ring-purple-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">
                    Nano Banana 2
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded-md">
                    고화질
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Nano Banana 2 (gemini-3.1-flash-image) 정밀 고화질 이미지 엔진
                </p>
              </button>

              <button
                type="button"
                onClick={() => setImageModel("nano-banana-2-lite")}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  imageModel === "nano-banana-2-lite"
                    ? "border-purple-600 bg-purple-50/50 ring-2 ring-purple-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">
                    Nano Banana 2 Lite
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-md">
                    초고속
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Nano Banana 2 Lite 초고속 경량 이미지 엔진
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <p className="text-xs text-slate-500">
            선택된 모델 및 저장된 API 키는 브라우저 로컬 저장소에 즉시 반영됩니다.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-xs"
            >
              {savedSuccess ? "저장 완료!" : "완료"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
