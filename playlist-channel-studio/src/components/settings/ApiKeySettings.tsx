"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check, KeyRound, Loader2, ShieldCheck, Trash2, ExternalLink } from "lucide-react";
import { PROVIDER_LABELS, type Provider } from "@/lib/playlist/types";

// 루트 AIMaster platform_guides (LLM AI 카테고리)
const GUIDES: { provider: Provider; id: string; label: string }[] = [
  { provider: "gemini", id: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
];
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

type KeyState = Record<Provider, { registered: boolean; maskedKey?: string }>;
const PLACEHOLDER: Record<Provider, string> = {
  gemini: "AIza... 로 시작하는 본인 키",
  openai: "sk-... 로 시작하는 본인 키",
  anthropic: "sk-ant-... 로 시작하는 본인 키",
};
const DESC: Record<Provider, string> = {
  gemini: "텍스트(제목·프롬프트·가사·설명글)와 썸네일 이미지 모두 사용할 수 있습니다.",
  openai: "텍스트 생성과 gpt-image-1 썸네일에 사용합니다. 선택 사항입니다.",
  anthropic: "텍스트 생성(제목·프롬프트·가사·설명글)에 사용합니다. 선택 사항이며 이미지는 만들지 못합니다.",
};

// 4대 공식 플랫폼 키 발급 및 가입 2단 퀵액션 버튼 메타데이터
const PROVIDER_ACTION_MAP: Record<
  Provider,
  {
    createKeyUrl: string;
    createKeyLabel: string;
    signupUrl: string;
    signupLabel: string;
  }
> = {
  gemini: {
    createKeyUrl: "https://aistudio.google.com/app/apikey",
    createKeyLabel: "Google AI Studio 키 발급 바로가기",
    signupUrl: "https://aistudio.google.com/",
    signupLabel: "Google AI Studio 가입",
  },
  openai: {
    createKeyUrl: "https://platform.openai.com/api-keys",
    createKeyLabel: "OpenAI 키 발급 바로가기",
    signupUrl: "https://platform.openai.com/signup",
    signupLabel: "OpenAI 가입",
  },
  anthropic: {
    createKeyUrl: "https://console.anthropic.com/settings/keys",
    createKeyLabel: "Claude 키 발급 바로가기",
    signupUrl: "https://console.anthropic.com/",
    signupLabel: "Anthropic 가입",
  },
};

export function ApiKeySettings() {
  const [keys, setKeys] = useState<KeyState | null>(null);

  useEffect(() => {
    fetch("/api/user-key")
      .then((r) => r.json())
      .then((d) => setKeys(d.keys ?? null))
      .catch(() => setKeys(null));
  }, []);

  return (
    <div className="space-y-5">
      {(["gemini", "openai", "anthropic"] as Provider[]).map((p) => (
        <ProviderCard
          key={p}
          provider={p}
          state={keys?.[p]}
          loading={keys === null}
          onChange={(s) => setKeys((k) => (k ? { ...k, [p]: s } : k))}
        />
      ))}

      {/* YouTube Data API & Google Cloud 가이드 섹션 */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#0d1322] p-5 shadow-sm">
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-white">
          <span className="text-red-500">▶</span>
          <span>YouTube 공식 API & Google Cloud 연동 바로가기</span>
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          완성된 1080p 플레이리스트 영상을 내 유튜브 채널에 바로 업로드하려면 Google Cloud 콘솔에서 YouTube Data API v3를 활성화할 수 있습니다.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noreferrer"
            className="btn-create-key"
          >
            <span>🔑</span>
            <span>Google Cloud API 키 콘솔 바로가기</span>
            <span className="text-[10px]">↗</span>
          </a>
          <a
            href="https://console.cloud.google.com/"
            target="_blank"
            rel="noreferrer"
            className="btn-platform-signup"
          >
            <span>🌐</span>
            <span>Google Cloud 시작하기</span>
            <span className="text-[10px]">↗</span>
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800/80 bg-[#0d1322] p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-white">
          <BookOpen size={18} className="text-cyan-400" />
          📖 연동 매뉴얼
        </h2>
        <div className="flex flex-wrap gap-2">
          {GUIDES.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() =>
                window.open(
                  `${MAIN_SITE_URL}/guides/${g.id}`,
                  "platform-guide-popup",
                  "width=720,height=860,scrollbars=yes,resizable=yes"
                )
              }
              className="btn-create-key"
            >
              <span>🔑</span>
              <span>{g.label}</span>
              <span className="text-[10px]">↗</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          설정 화면 옆에 팝업으로 열어 두고 그대로 따라 하실 수 있습니다. OpenAI·Claude 키는 각 서비스의 API 콘솔(platform.openai.com, console.anthropic.com)에서 발급합니다.
        </p>
      </section>
    </div>
  );
}

function ProviderCard({
  provider,
  state,
  loading,
  onChange,
}: {
  provider: Provider;
  state?: { registered: boolean; maskedKey?: string };
  loading: boolean;
  onChange: (s: { registered: boolean; maskedKey?: string }) => void;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const actionMeta = PROVIDER_ACTION_MAP[provider];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return setMsg({ ok: false, text: "API 키를 입력해 주세요." });
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/user-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: input.trim() }),
      });
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
    <section className="rounded-2xl border border-slate-800/80 bg-[#0d1322] p-5 shadow-sm hover:border-slate-700 transition-colors">
      <div className="mb-1 flex items-center gap-2 text-base font-bold text-white">
        <KeyRound size={18} className="text-amber-400" />
        {PROVIDER_LABELS[provider]} API 키
        {provider !== "gemini" && <span className="text-xs font-normal text-slate-400">(선택)</span>}
      </div>
      <p className="mb-3 text-xs text-slate-400">{DESC[provider]}</p>
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-300">
        <span
          className={`size-2 rounded-full ${
            state?.registered ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-slate-600"
          }`}
        />
        {loading ? (
          "확인 중..."
        ) : state?.registered ? (
          <>
            등록됨{" "}
            <code className="rounded border border-slate-700 bg-[#060911] px-1.5 py-0.5 text-xs text-cyan-300 font-mono">
              {state.maskedKey}
            </code>
          </>
        ) : (
          "등록된 키가 없습니다."
        )}
      </div>

      <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row mb-3">
        <input
          type="password"
          autoComplete="off"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={PLACEHOLDER[provider]}
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#131b2e] px-3.5 py-2 font-mono text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="btn-3d-cyan px-5 py-2.5 text-xs sm:text-sm"
        >
          {busy ? <Loader2 size={16} className="animate-spin text-slate-950" /> : <Check size={16} />}
          {state?.registered ? "키 교체" : "키 저장"}
        </button>
        {state?.registered && (
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-900/60 bg-rose-950/20 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-950/40 hover:border-rose-700 transition-colors"
          >
            <Trash2 size={14} /> 삭제
          </button>
        )}
      </form>

      {/* 2단 퀵액션 버튼 세트 (키 발급 바로가기 + 플랫폼 회원가입) */}
      {actionMeta && (
        <div className="mt-3 rounded-xl bg-cyan-950/20 border border-cyan-800/40 px-3.5 py-2.5 flex flex-wrap items-center gap-2">
          <a
            href={actionMeta.createKeyUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-create-key"
          >
            <span>🔑</span>
            <span>{actionMeta.createKeyLabel}</span>
            <span className="text-[10px]">↗</span>
          </a>
          <a
            href={actionMeta.signupUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-platform-signup"
          >
            <span>🌐</span>
            <span>{actionMeta.signupLabel}</span>
            <span className="text-[10px]">↗</span>
          </a>
        </div>
      )}

      {msg && (
        <p className={`mt-2.5 text-xs font-semibold ${msg.ok ? "text-emerald-400" : "text-rose-400"}`}>
          {msg.ok ? "✨ " : "⚠️ "}
          {msg.text}
        </p>
      )}
    </section>
  );
}
