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
    <div className="space-y-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-100">
            {title} {required && <span className="text-xs font-semibold text-pink-400">(필수 연동)</span>}
          </h2>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        {registered ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> 연동 완료
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/40 px-3 py-1 text-xs font-bold text-amber-300">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400" /> 미등록
          </span>
        )}
      </div>

      {registered && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400">현재 등록된 키</span>
            <div className="truncate font-mono text-sm font-bold text-cyan-300" title={keys[provider].maskedKey}>
              {keys[provider].maskedKey}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDelete(provider)}
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-900/50"
          >
            <Trash2 className="h-3.5 w-3.5" /> 키 삭제
          </button>
        </div>
      )}

      <form
        className="space-y-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(provider, value);
          setValue("");
        }}
      >
        <label className="block text-xs font-semibold text-slate-300">
          {registered ? "새로운 API 키로 변경 등록" : "API 키 입력"}
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-xl border border-slate-700/60 bg-slate-950/80 px-4 py-2.5 font-mono text-xs text-slate-100 placeholder-slate-500 transition-all focus:border-cyan-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-400"
          />
          <button
            type="submit"
            disabled={submitting || !value.trim()}
            className="shrink-0 whitespace-nowrap rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:brightness-110 disabled:opacity-40"
          >
            {submitting ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </form>
    </div>
  );
}

// 연동 매뉴얼: 루트 AIMaster `platform_guides` 게시글 ID
const GUIDES = [{ guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" }];

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
      setMessage({ type: "success", text: "API 키가 안전하게 암호화되어 저장되었습니다." });
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
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0a0f1d] via-[#0d1424] to-[#070b14] p-6 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="rounded-xl border border-pink-500/30 bg-pink-500/10 p-2 text-pink-400">
            <Key className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">API 키 연동 및 보안 콘솔</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              이 프로그램은 회원님 본인의 Google Gemini API 키로만 동작합니다. 키는 회원님 본인 계정에만 암호화되어 격리 보관됩니다.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2.5 rounded-xl p-4 text-xs font-semibold ${
            message.type === "success"
              ? "border border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
              : "border border-rose-500/30 bg-rose-950/40 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <KeyCard
        provider="gemini"
        title="Google Gemini API 키"
        required
        description="가사·스토리보드 기획(Gemini 2.5), 장면 비주얼(나노바나나), 시네마틱 영상(Gemini Omni Flash) 생성 엔진에 모두 사용됩니다."
        placeholder="AIzaSy... 로 시작하는 본인 Gemini API 키 입력"
        {...common}
      />

      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-200">
        <p className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span className="leading-relaxed">
            Google Gemini 영상 생성 기능은 결제가 연결된(Pay-as-you-go) Google Cloud 프로젝트 키에서만 실행 가능합니다.
            영상 생성 길이에 따라 초당 약 $0.05가 회원님 계정에 직접 청구되며, 장면 제작 화면에서 예상 비용을 사전에 확인하실 수 있습니다.
          </span>
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-6 shadow-xl">
        <h2 className="text-sm font-bold text-slate-200">📖 연동 가이드 및 매뉴얼</h2>
        <p className="text-xs text-slate-400">
          Google AI Studio에서 API 키를 발급받는 단계별 튜토리얼을 팝업 창으로 확인하실 수 있습니다.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {GUIDES.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
        </div>
      </div>
    </div>
  );
}
