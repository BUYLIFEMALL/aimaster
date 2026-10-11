"use client";

import { useCallback, useEffect, useState } from "react";
import { Key, CheckCircle2, AlertCircle, Trash2, ShieldCheck } from "lucide-react";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";

type KeyState = Record<string, { registered: boolean; maskedKey?: string }>;

interface KeyCardProps {
  provider: string;
  title: string;
  description: string;
  placeholder: string;
  required?: boolean;
  keys: KeyState;
  submitting: boolean;
  onSave: (provider: string, apiKey: string) => void;
  onDelete: (provider: string) => void;
}

function KeyCard({ provider, title, description, placeholder, required, keys, submitting, onSave, onDelete }: KeyCardProps) {
  const [value, setValue] = useState("");
  const registered = keys[provider]?.registered;

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            {title} {required && <span className="text-xs font-semibold text-red-600">(필수)</span>}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
        {registered ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> 연동 완료
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" /> 미등록
          </span>
        )}
      </div>

      {registered && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-gray-500">현재 등록된 키</span>
            <div className="truncate font-mono text-sm font-bold text-gray-800" title={keys[provider].maskedKey}>
              {keys[provider].maskedKey}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDelete(provider)}
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> 키 삭제
          </button>
        </div>
      )}

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(provider, value);
          setValue("");
        }}
      >
        <label className="block text-xs font-bold text-gray-700">{registered ? "새로운 API 키로 변경 등록" : "API 키 입력"}</label>
        <div className="flex gap-2">
          <input
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 font-mono text-sm text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
          />
          <button
            type="submit"
            disabled={submitting || !value.trim()}
            className="shrink-0 whitespace-nowrap rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? "저장 중..." : provider === "youtube_api_key" ? "검증 및 저장" : "저장"}
          </button>
        </div>
        {provider === "youtube_api_key" && <p className="text-[11px] text-gray-500">* 저장하기 전에 YouTube 공식 서버로 키가 유효한지 확인합니다.</p>}
      </form>
    </div>
  );
}

// 연동 매뉴얼: 루트 AIMaster `platform_guides` 게시글 ID
const GUIDES = [
  { guideId: "72d39d06-a7ca-4ab0-8327-f9bb085ac394", label: "YouTube Data API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키 발급받기" },
];

export default function SettingsPage() {
  const [keys, setKeys] = useState<KeyState>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/api-keys");
      const data = await res.json();
      if (res.ok && data.keys) setKeys(data.keys);
      else if (!res.ok) setMessage({ type: "error", text: data.error || "키 목록을 불러오지 못했습니다." });
    } catch {
      setMessage({ type: "error", text: "키 목록을 불러오지 못했습니다." });
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleSave = async (provider: string, apiKey: string) => {
    if (!apiKey.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "API 키 등록에 실패했습니다." });
        return;
      }
      setMessage({ type: "success", text: "API 키가 안전하게 저장되었습니다." });
      fetchKeys();
    } catch {
      setMessage({ type: "error", text: "오류가 발생했습니다. 잠시 뒤 다시 시도해주세요." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (provider: string) => {
    if (!confirm("정말 이 API 키를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/settings/api-keys?provider=${provider}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ type: "success", text: "API 키가 삭제되었습니다." });
        fetchKeys();
      }
    } catch {
      setMessage({ type: "error", text: "삭제하지 못했습니다." });
    }
  };

  const common = { keys, submitting, onSave: handleSave, onDelete: handleDelete };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-red-100 p-1.5 text-red-600">
            <Key className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-bold text-gray-900">API키등록·플랫폼연동</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          이 프로그램은 회원님 본인의 API 키로만 동작합니다. 운영자나 다른 회원의 키는 사용되지 않으며, 키는 본인 계정에만 저장됩니다.
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-sm ${
            message.type === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-800" : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />}
          <span>{message.text}</span>
        </div>
      )}

      <KeyCard
        provider="youtube_api_key"
        title="YouTube Data API v3 키"
        required
        description="채널·키워드 분석에 사용합니다. 매일 10,000유닛이 무료로 제공됩니다."
        placeholder="AIzaSy... 로 시작하는 API 키를 붙여넣으세요"
        {...common}
      />

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <span>아래 AI 키는 AI 분석(영상 요약·경쟁 전략·성장 과정·채널 진단)에 쓰입니다. 세 가지 중 하나만 등록해도 되며, Gemini는 영상 요약 때 영상을 직접 보고 분석합니다.</span>
        </p>
      </div>

      <KeyCard provider="gemini" title="Google Gemini API 키" description="AI 분석용 (선택) · 영상을 직접 보고 요약" placeholder="AIzaSy... 로 시작하는 Gemini API 키" {...common} />
      <KeyCard provider="openai" title="OpenAI API 키" description="AI 분석 기능용 (선택)" placeholder="sk-... 로 시작하는 OpenAI API 키" {...common} />
      <KeyCard provider="anthropic" title="Anthropic Claude API 키" description="AI 분석 기능용 (선택)" placeholder="sk-ant-... 로 시작하는 Claude API 키" {...common} />

      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-bold text-neutral-900">📖 연동 매뉴얼</h2>
        <p className="text-xs text-neutral-500">키 발급 방법을 팝업 창으로 보면서 따라 할 수 있습니다.</p>
        <div className="flex flex-wrap gap-2">
          {GUIDES.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
        </div>
      </div>
    </div>
  );
}
