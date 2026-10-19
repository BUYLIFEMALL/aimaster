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
    <div className="space-y-4 rounded-2xl border border-[#262c3d] bg-[#161922] p-6 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-100">
            {title} {required && <span className="text-xs font-semibold text-rose-400">(필수)</span>}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">{description}</p>
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
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#262c3d] bg-[#0d0f17] p-3">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400">현재 등록된 키</span>
            <div className="truncate font-mono text-sm font-bold text-slate-200" title={keys[provider].maskedKey}>
              {keys[provider].maskedKey}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDelete(provider)}
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
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
        <label className="block text-xs font-bold text-slate-300">{registered ? "새로운 API 키로 변경 등록" : "API 키 입력"}</label>
        <div className="flex gap-2">
          <input
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-xl border border-[#262c3d] bg-[#0d0f17] px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder-slate-500 focus:border-rose-500/50 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
          />
          <button
            type="submit"
            disabled={submitting || !value.trim()}
            className="shrink-0 whitespace-nowrap rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

// 연동 매뉴얼: 루트 AIMaster `platform_guides` 게시글 ID(2026-10-19 이 프로그램과 함께 등록)
const GUIDES = [
  { guideId: "38d1ac20-15f8-47d9-877b-bbaca2f88dd7", label: "Upstage API 키 발급받기" },
  { guideId: "e02892df-9ac8-48ac-821f-c51e238ca1ab", label: "Tavily 웹 검색 API 키 발급받기" },
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
      <div className="rounded-2xl border border-[#262c3d] bg-[#161922] p-6 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-rose-400">
            <Key className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-100">API키등록·플랫폼연동</h1>
            <p className="mt-1 text-xs text-slate-400">
              이 프로그램은 회원님 본인의 API 키로만 동작합니다. 운영자나 다른 회원의 키는 사용되지 않습니다. 키는 본인 계정에만 저장되며, 한 번 등록하면 같은 키를 쓰는 AIMaster의 다른 프로그램에서도 다시 등록하지 않고 쓸 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-sm ${
            message.type === "success" ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" /> : <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />}
          <span>{message.text}</span>
        </div>
      )}

      <KeyCard
        provider="upstage"
        title="Upstage API 키"
        required
        description="답변 생성(Solar), 문서 임베딩, PDF·문서 읽기에 꼭 필요합니다."
        placeholder="up_... 로 시작하는 Upstage API 키"
        {...common}
      />

      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-xs text-indigo-300">
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
          <span>Tavily 키가 있으면 최신 정보가 필요한 질문을 웹에서 찾아 답하고 출처 링크를 보여 줍니다. 없어도 챗봇과 내 문서 검색은 그대로 쓸 수 있습니다.</span>
        </p>
      </div>

      <KeyCard provider="tavily" title="Tavily API 키" description="최신 정보 웹 검색용 (선택)" placeholder="tvly-... 로 시작하는 Tavily API 키" {...common} />

      <div className="space-y-3 rounded-2xl border border-[#262c3d] bg-[#161922] p-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-200">📖 연동 매뉴얼</h2>
        <p className="text-xs text-slate-400">키 발급 방법을 팝업 창으로 보면서 차례대로 따라 할 수 있습니다.</p>
        <div className="flex flex-wrap gap-2">
          {GUIDES.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
        </div>
      </div>
    </div>
  );
}
