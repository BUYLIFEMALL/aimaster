"use client";

import { useCallback, useEffect, useState } from "react";
import { Key, CheckCircle2, AlertCircle, Trash2, ShieldCheck, KeyRound } from "lucide-react";
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

function KeyCard({
  provider,
  title,
  description,
  placeholder,
  required,
  keys,
  submitting,
  onSave,
  onDelete,
}: KeyCardProps) {
  const [value, setValue] = useState("");
  const registered = keys[provider]?.registered;

  return (
    <div className="space-y-4 rounded-2xl border border-[#222d42] bg-[#131824] p-6 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-white">
            {title}{" "}
            {required && <span className="text-xs font-semibold text-rose-400">(필수)</span>}
          </h2>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">{description}</p>
        </div>
        {registered ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> 연동 완료
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
            <AlertCircle className="h-3.5 w-3.5" /> 미등록
          </span>
        )}
      </div>

      {registered && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#222d42] bg-[#0c0f17] p-3.5">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400">현재 등록된 키</span>
            <div className="truncate font-mono text-sm font-bold text-cyan-300" title={keys[provider].maskedKey}>
              {keys[provider].maskedKey}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDelete(provider)}
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-rose-900/40 bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 hover:text-white transition-colors"
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
        <label className="block text-xs font-bold text-slate-300">
          {registered ? "새로운 API 키로 변경 등록" : "API 키 입력"}
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-xl border border-[#222d42] bg-[#0c0f17] px-3.5 py-2.5 font-mono text-sm text-[#f8fafc] placeholder-slate-500 focus:border-cyan-500 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20"
          />
          <button
            type="submit"
            disabled={submitting || !value.trim()}
            className="shrink-0 whitespace-nowrap rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-500 hover:to-violet-500 disabled:opacity-50 transition-all"
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

// 연동 매뉴얼: 루트 AIMaster `platform_guides` 게시글 ID
const GUIDES = [
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
      <div className="rounded-2xl border border-[#222d42] bg-[#131824] p-6 shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-violet-600 text-white shadow-xs">
            <KeyRound className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-extrabold text-white tracking-tight">API키등록·플랫폼연동</h1>
        </div>
        <p className="mt-2 text-xs md:text-sm text-slate-400 leading-relaxed">
          이 프로그램은 회원님 본인의 API 키로만 동작합니다. 운영자나 다른 회원의 키는 사용되지 않으며, 키는 본인 계정에만 암호화 저장됩니다.
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2.5 rounded-xl p-4 text-xs md:text-sm ${
            message.type === "success"
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border border-rose-900/40 bg-rose-950/30 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <KeyCard
        provider="gemini"
        title="Google Gemini API 키"
        required
        description="이미지 분석·프롬프트 보정에 쓸 수 있고, 3단계 결과 테스트(이미지 생성)에는 이 키가 꼭 필요합니다."
        placeholder="AIzaSy... 로 시작하는 Gemini API 키"
        {...common}
      />

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4 text-xs text-cyan-200">
        <p className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <span className="leading-relaxed">
            이미지 분석과 프롬프트 보정은 Gemini·OpenAI·Claude 중 등록된 AI 어느 것으로든 가능합니다(모두 이미지 입력을 지원하는 모델 제공). 3단계 이미지 생성 테스트는 Gemini 키로 작동합니다.
          </span>
        </p>
      </div>

      <KeyCard
        provider="openai"
        title="OpenAI API 키"
        description="이미지 분석·프롬프트 보정용 (선택)"
        placeholder="sk-... 로 시작하는 OpenAI API 키"
        {...common}
      />
      <KeyCard
        provider="anthropic"
        title="Anthropic Claude API 키"
        description="이미지 분석·프롬프트 보정용 (선택)"
        placeholder="sk-ant-... 로 시작하는 Claude API 키"
        {...common}
      />

      <div className="space-y-3 rounded-2xl border border-[#222d42] bg-[#131824] p-6 shadow-lg">
        <h2 className="text-sm font-bold text-white">📖 연동 매뉴얼</h2>
        <p className="text-xs text-slate-400">키 발급 방법을 팝업 창으로 보면서 차근차근 따라 하실 수 있습니다.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {GUIDES.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
        </div>
      </div>
    </div>
  );
}
