"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check, KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { PROVIDER_LABELS, type Provider } from "@/lib/mastering/models";

// 루트 AIMaster platform_guides (LLM AI 카테고리)
const GUIDES: { provider: Provider; id: string; label: string }[] = [
  { provider: "gemini", id: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
];
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

type KeyState = Record<Provider, { registered: boolean; maskedKey?: string }>;
const PLACEHOLDER: Record<Provider, string> = { gemini: "AIza... 로 시작하는 본인 키", openai: "sk-... 로 시작하는 본인 키", anthropic: "sk-ant-... 로 시작하는 본인 키" };
const DESC: Record<Provider, string> = {
  gemini: "텍스트(제목·프롬프트·가사·설명글)와 썸네일 이미지 모두 사용할 수 있습니다.",
  openai: "AI 로직 생성기를 OpenAI 모델로 쓸 때 사용합니다. 선택 사항입니다.",
  anthropic: "텍스트 생성(제목·프롬프트·가사·설명글)에 사용합니다. 선택 사항이며 이미지는 만들지 못합니다.",
};

export function ApiKeySettings() {
  const [keys, setKeys] = useState<KeyState | null>(null);

  useEffect(() => {
    fetch("/api/user-key").then((r) => r.json()).then((d) => setKeys(d.keys ?? null)).catch(() => setKeys(null));
  }, []);

  return (
    <div className="space-y-6">
      {(["gemini", "openai", "anthropic"] as Provider[]).map((p) => (
        <ProviderCard key={p} provider={p} state={keys?.[p]} loading={keys === null} onChange={(s) => setKeys((k) => (k ? { ...k, [p]: s } : k))} />
      ))}

      <section className="rounded-2xl border border-[#1e293b] bg-[#0d121f] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-100">
          <BookOpen size={18} className="text-[#00f0ff]" />
          📖 연동 매뉴얼
        </h2>
        <div className="flex flex-wrap gap-2">
          {GUIDES.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => window.open(`${MAIN_SITE_URL}/guides/${g.id}`, "platform-guide-popup", "width=720,height=860,scrollbars=yes,resizable=yes")}
              className="rounded-xl border border-[#1e293b] bg-[#131b2e] px-4 py-2 text-sm font-bold text-slate-200 hover:bg-[#1a243d] transition"
            >
              {g.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">설정 화면 옆에 팝업으로 열어 두고 그대로 따라 하실 수 있습니다. OpenAI·Claude 키는 각 서비스의 API 콘솔(platform.openai.com, console.anthropic.com)에서 발급합니다.</p>
      </section>
    </div>
  );
}

function ProviderCard({ provider, state, loading, onChange }: { provider: Provider; state?: { registered: boolean; maskedKey?: string }; loading: boolean; onChange: (s: { registered: boolean; maskedKey?: string }) => void }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return setMsg({ ok: false, text: "API 키를 입력해 주세요." });
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/user-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey: input.trim() }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg({ ok: false, text: d.error ?? "저장하지 못했습니다." });
      onChange({ registered: true, maskedKey: d.maskedKey });
      setInput("");
      setMsg({ ok: true, text: `${PROVIDER_LABELS[provider]} API 키를 저장했습니다.` });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/user-key?provider=${provider}`, { method: "DELETE" });
      if (!res.ok) return setMsg({ ok: false, text: "삭제하지 못했습니다." });
      onChange({ registered: false });
      setMsg({ ok: true, text: "키를 삭제했습니다." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#1e293b] bg-[#0d121f] p-5">
      <div className="mb-1 flex items-center gap-2 text-base font-bold text-slate-100">
        <KeyRound size={18} className="text-amber-500" />
        {PROVIDER_LABELS[provider]} API 키{provider !== "gemini" && <span className="text-xs font-normal text-slate-400">(선택)</span>}
      </div>
      <p className="mb-3 text-xs text-slate-400">{DESC[provider]}</p>
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-300">
        <span className={`size-2 rounded-full ${state?.registered ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-slate-600"}`} />
        {loading ? "확인 중..." : state?.registered ? <>등록됨 <code className="rounded bg-[#131b2e] border border-[#1e293b] px-1.5 py-0.5 text-xs text-[#00f0ff]">{state.maskedKey}</code></> : "등록된 키가 없습니다."}
      </div>
      <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          autoComplete="off"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={PLACEHOLDER[provider]}
          className="min-w-0 flex-1 rounded-xl border border-[#1e293b] bg-[#131b2e] px-3.5 py-2 font-mono text-sm text-slate-200 outline-none focus:border-[#00f0ff]"
        />
        <button type="submit" disabled={busy} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0284c7] px-5 py-2 text-sm font-extrabold text-[#060911] hover:brightness-110 disabled:opacity-60 transition shadow-sm">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {state?.registered ? "키 교체" : "키 저장"}
        </button>
        {state?.registered && (
          <button type="button" onClick={remove} disabled={busy} className="flex items-center justify-center gap-1.5 rounded-xl border border-[#1e293b] bg-[#131b2e] px-3.5 py-2 text-sm text-rose-400 hover:bg-rose-500/10 disabled:opacity-60 transition">
            <Trash2 size={14} /> 삭제
          </button>
        )}
      </form>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-400" : "text-rose-400"}`}>{msg.text}</p>}
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#00f0ff]" />
        키는 서버에서 회원님 본인 요청에만 사용되며 화면에는 앞뒤 일부만 표시됩니다. 키가 없으면 다른 회원이나 운영자의 키로 대신 처리하지 않습니다.
      </p>
    </section>
  );
}
