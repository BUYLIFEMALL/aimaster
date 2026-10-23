"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check, KeyRound, Loader2, ShieldCheck, ExternalLink } from "lucide-react";

// 루트 AIMaster platform_guides: "Google Gemini API 키 발급받기" (LLM AI)
const GEMINI_GUIDE_ID = "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

export function ApiKeySettings() {
  const [masked, setMasked] = useState<string | null | undefined>(undefined);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/user-key")
      .then((r) => r.json())
      .then((d) => setMasked(d.hasKey ? d.maskedKey : null))
      .catch(() => setMasked(null));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return setMsg({ ok: false, text: "API 키를 입력해 주세요." });
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/user-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: input.trim() }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg({ ok: false, text: d.error ?? "저장하지 못했습니다." });
      setMasked(d.maskedKey);
      setInput("");
      setMsg({ ok: true, text: "Gemini API 키를 성공적으로 저장했습니다." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. API 키 등록 카드 */}
      <section className="rounded-3xl border border-slate-800 bg-[#131926] p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-2 text-base font-bold text-slate-100">
          <KeyRound size={18} className="text-amber-400" />
          Google Gemini API 키 등록
        </div>
        
        <div className="mb-5 flex items-center gap-2.5 text-xs">
          <span className={`size-2.5 rounded-full ${masked ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-slate-600"}`} />
          {masked === undefined ? (
            <span className="text-slate-500">키 등록 상태 확인 중...</span>
          ) : masked ? (
            <span className="text-slate-300">
              현재 등록됨: <code className="ml-1 rounded-md border border-slate-700 bg-[#182030] px-2 py-0.5 font-mono text-amber-400">{masked}</code>
            </span>
          ) : (
            <span className="text-slate-400">등록된 API 키가 없습니다. 아래에 본인 키를 등록해 주세요.</span>
          )}
        </div>

        <form onSubmit={save} className="flex flex-col gap-2.5 sm:flex-row">
          <input
            type="password"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="AIza... 로 시작하는 본인 Google Gemini API 키"
            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#182030] px-4 py-2.5 font-mono text-xs text-slate-100 placeholder-slate-500 outline-none transition focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition hover:from-amber-400 hover:to-amber-500 disabled:opacity-50"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            <span>{masked ? "키 교체하기" : "키 저장하기"}</span>
          </button>
        </form>

        {msg && (
          <p className={`mt-3 text-xs font-medium ${msg.ok ? "text-emerald-400" : "text-rose-400"}`}>
            {msg.text}
          </p>
        )}

        <div className="mt-5 rounded-2xl border border-slate-800/80 bg-[#0e131f] p-3 text-[11px] leading-relaxed text-slate-400">
          <div className="flex items-start gap-2">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-amber-400" />
            <span>
              키는 서버에서 회원님 본인 요청 시에만 안전하게 사용되며, 화면에는 앞뒤 일부만 마스킹 처리되어 표시됩니다. 운영자나 타인의 키로 폴백하지 않습니다.
            </span>
          </div>
        </div>
      </section>

      {/* 2. 연동 매뉴얼 가이드 카드 */}
      <section className="rounded-3xl border border-slate-800 bg-[#131926] p-6 shadow-xl">
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-100">
          <BookOpen size={18} className="text-amber-400" />
          📖 Google Gemini API 키 발급 가이드
        </h2>
        <p className="mb-4 text-xs text-slate-400 leading-relaxed">
          Google AI Studio에서 무료로 API 키를 즉시 발급받아 연동할 수 있습니다. 팝업 창을 띄워 단계별로 쉽게 따라 하실 수 있습니다.
        </p>
        <button
          type="button"
          onClick={() => window.open(`${MAIN_SITE_URL}/guides/${GEMINI_GUIDE_ID}`, "platform-guide-popup", "width=720,height=860,scrollbars=yes,resizable=yes")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#182030] px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-[#202b40]"
        >
          <span>발급 매뉴얼 팝업 열기</span>
          <ExternalLink size={13} className="text-amber-400" />
        </button>
      </section>
    </div>
  );
}
