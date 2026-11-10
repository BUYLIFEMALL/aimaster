"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DRAFT_MODELS, DEFAULT_DRAFT_MODEL, LENGTHS } from "@/lib/draft/models";

export function WriteForm({ hasKey, connected }: { hasKey: boolean; connected: { wordpress: boolean; blogger: boolean } }) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [refUrls, setRefUrls] = useState("");
  const [memo, setMemo] = useState("");
  const [platform, setPlatform] = useState<"wordpress" | "blogger">(connected.wordpress || !connected.blogger ? "wordpress" : "blogger");
  const [language, setLanguage] = useState<"ko" | "en">("ko");
  const [length, setLength] = useState<keyof typeof LENGTHS>("normal");
  const [model, setModel] = useState<string>(DEFAULT_DRAFT_MODEL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; needKey?: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    const res = await fetch("/api/posts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, keywords, refUrls: refUrls.split(/\s+/).filter(Boolean), memo, platform, language, length, model }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setBusy(false);
      setError({ text: data.error ?? "원고를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.", needKey: data.code === "need_key" });
      return;
    }
    router.push(`/posts/${data.id}${data.skippedReferences?.length ? "?skipped=1" : ""}`);
  }

  const field = "mt-1 w-full rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2.5 text-sm outline-none focus:border-[color:var(--wp)]";
  const label = "block text-xs font-extrabold text-[color:var(--muted)]";
  const chip = (on: boolean) => `rounded-xl border-2 px-3 py-2 text-sm font-bold ${on ? "border-[color:var(--launch)] bg-green-50" : "border-[color:var(--border)] bg-white"}`;

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="lp-card space-y-4">
        {!hasKey && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">🔑 원고를 만들려면 본인 Anthropic(Claude) API 키가 필요합니다. <a href="https://www.buylife.xyz/api-settings" target="_blank" rel="noreferrer" className="font-bold underline">AIMaster 키 등록</a>에서 한 번만 넣어 주세요.</p>
        )}
        <label className={label}>주제 *
          <input className={field} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 초보자를 위한 겨울 캠핑 장비 준비" maxLength={200} required />
        </label>
        <label className={label}>검색 키워드(쉼표로 구분, 최대 8개)
          <input className={field} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="겨울 캠핑, 캠핑 장비, 동계 캠핑 준비물" />
        </label>
        <label className={label}>참고 주소(선택, 최대 3개 · 줄바꿈으로 구분)
          <textarea className={`${field} h-20`} value={refUrls} onChange={(e) => setRefUrls(e.target.value)} placeholder="https://..." />
        </label>
        <label className={label}>내 메모(선택 · 꼭 넣을 관점·경험)
          <textarea className={`${field} h-24`} value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={1000} placeholder="예: 작년 12월 강원도에서 직접 써 본 난로 이야기를 넣어 주세요." />
        </label>
      </div>

      <div className="lp-card space-y-4">
        <div>
          <p className={label}>어느 블로그용인가요</p>
          <div className="mt-1 flex gap-2">
            <button type="button" className={chip(platform === "wordpress")} onClick={() => setPlatform("wordpress")}>🅦 워드프레스{connected.wordpress ? "" : " (연결 전)"}</button>
            <button type="button" className={chip(platform === "blogger")} onClick={() => setPlatform("blogger")}>🅑 구글 블로그{connected.blogger ? "" : " (연결 전)"}</button>
          </div>
        </div>
        <div>
          <p className={label}>글 언어</p>
          <div className="mt-1 flex gap-2">
            <button type="button" className={chip(language === "ko")} onClick={() => setLanguage("ko")}>한국어</button>
            <button type="button" className={chip(language === "en")} onClick={() => setLanguage("en")}>English</button>
          </div>
        </div>
        <label className={label}>분량
          <select className={field} value={length} onChange={(e) => setLength(e.target.value as keyof typeof LENGTHS)}>
            {Object.entries(LENGTHS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label className={label}>원고 AI(본인 키 사용)
          <select className={field} value={model} onChange={(e) => setModel(e.target.value)}>
            {DRAFT_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <span className="mt-1 block font-normal">{DRAFT_MODELS.find((m) => m.id === model)?.note}</span>
        </label>
        <button type="submit" disabled={busy || !hasKey} className="lp-btn w-full disabled:opacity-50">{busy ? "원고 만드는 중… (1~3분)" : "✍️ 원고 만들기"}</button>
        {busy && <p className="text-xs text-[color:var(--muted)]">창을 닫지 마세요. 끝나면 편집 화면으로 넘어갑니다. 다시 누르지 않아도 됩니다.</p>}
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">⚠️ {error.text}
            {error.needKey && <> <a href="https://www.buylife.xyz/api-settings" target="_blank" rel="noreferrer" className="underline">키 등록하러 가기</a></>}
          </p>
        )}
      </div>
    </form>
  );
}
