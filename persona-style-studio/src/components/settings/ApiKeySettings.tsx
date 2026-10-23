"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check, KeyRound, Loader2, ShieldCheck } from "lucide-react";

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
      setMsg({ ok: true, text: "Gemini API 키를 저장했습니다." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2 text-base font-bold text-neutral-900">
          <KeyRound size={18} className="text-amber-600" />
          Google Gemini API 키
        </div>
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className={`size-2 rounded-full ${masked ? "bg-emerald-500" : "bg-neutral-300"}`} />
          {masked === undefined ? "확인 중..." : masked ? <>등록됨 <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">{masked}</code></> : "등록된 키가 없습니다."}
        </div>
        <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="AIza... 로 시작하는 본인 키"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm outline-none focus:border-violet-600"
          />
          <button type="submit" disabled={busy} className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {masked ? "키 교체" : "키 저장"}
          </button>
        </form>
        {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>}
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-neutral-500">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          키는 서버에서 회원님 본인 요청에만 사용되며 화면에는 앞뒤 일부만 표시됩니다. 키가 없으면 다른 회원이나 운영자의 키로 대신 처리하지 않습니다.
        </p>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-neutral-900">
          <BookOpen size={18} className="text-violet-700" />
          📖 연동 매뉴얼
        </h2>
        <button
          type="button"
          onClick={() => window.open(`${MAIN_SITE_URL}/guides/${GEMINI_GUIDE_ID}`, "platform-guide-popup", "width=720,height=860,scrollbars=yes,resizable=yes")}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
        >
          Google Gemini API 키 발급받기
        </button>
        <p className="mt-2 text-xs text-neutral-500">설정 화면 옆에 팝업으로 열어 두고 그대로 따라 하실 수 있습니다.</p>
      </section>
    </div>
  );
}
