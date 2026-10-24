"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { BLOG_PERSONAS } from "@/types/persona";
import { QUICK_CUSTOM_PERSONA_ID, QUICK_START_KEY, quickKeywords, type QuickSuggestion } from "@/lib/quickMode";

// E-3 간편 모드: 주제 → 키워드·화자 추천 → 기존 작성 화면에서 원고·이미지 자동 생성(새 생성 엔진 없음).
export default function QuickModePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [imageCount, setImageCount] = useState(2);
  const [engine, setEngine] = useState<{ provider: string; model: string } | null>(null);
  const [status, setStatus] = useState<{ accounts: number | null; keys: string[] | null }>({ accounts: null, keys: null });
  const [suggestion, setSuggestion] = useState<QuickSuggestion | null>(null);
  const [personaId, setPersonaId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needKey, setNeedKey] = useState(false);

  useEffect(() => {
    fetch("/api/accounts", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))
      .then((d) => setStatus((s) => ({ ...s, accounts: Array.isArray(d?.accounts) ? d.accounts.length : 0 }))).catch(() => setStatus((s) => ({ ...s, accounts: 0 })));
    fetch("/api/keys", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))
      .then((d) => setStatus((s) => ({ ...s, keys: Array.isArray(d?.registered) ? d.registered : [] }))).catch(() => setStatus((s) => ({ ...s, keys: [] })));
    fetch("/api/generation-preferences", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const p = d?.preferences;
        if (p?.textProvider && p?.textModel) setEngine({ provider: p.textProvider, model: p.textModel });
        if (p?.imageCount) setImageCount(Math.min(5, Math.max(1, Number(p.imageCount) || 2)));
      }).catch(() => {});
  }, []);

  const hasAiKey = status.keys?.some((k) => ["openai", "anthropic", "gemini"].includes(k));
  const ready = status.accounts !== null && status.keys !== null && status.accounts > 0 && hasAiKey;

  const suggest = async () => {
    if (busy) return;
    setBusy(true); setError(null); setNeedKey(false);
    try {
      const res = await fetch("/api/quick/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, engine: engine ?? undefined }) });
      const data = await res.json();
      if (!res.ok) { if (data.needKey) setNeedKey(true); throw new Error(data.error || "추천을 받지 못했습니다."); }
      setSuggestion(data.suggestion);
      setPersonaId(data.suggestion.persona.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "추천을 받지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    if (!suggestion) return;
    const preset = BLOG_PERSONAS.find((p) => p.id === personaId);
    const persona = preset ? { id: preset.id, name: "", desc: "" } : suggestion.persona;
    try {
      sessionStorage.setItem(QUICK_START_KEY, JSON.stringify({ topic: topic.trim(), keywords: quickKeywords(suggestion), category: suggestion.category, purpose: suggestion.purpose, persona, imageCount, at: Date.now() }));
    } catch {
      setError("브라우저 저장 공간을 쓸 수 없어 이어서 만들 수 없습니다. 콘텐츠 생성 화면에서 직접 만들어 주세요.");
      return;
    }
    router.push("/?quick=1");
  };

  const setSub = (i: number, v: string) => suggestion && setSuggestion({ ...suggestion, subKeywords: suggestion.subKeywords.map((s, j) => (j === i ? v : s)) });
  const customPersona = suggestion?.persona.id === QUICK_CUSTOM_PERSONA_ID ? suggestion.persona : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">간편 모드</span>
          <span className="text-xs text-neutral-500">주제 하나로 원고·이미지까지</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mt-1">주제만 적으면 바로 만들기</h1>
        <p className="text-xs text-neutral-500 mt-0.5">AI가 키워드와 화자를 추천하고, 콘텐츠 생성 화면의 같은 단계(기획·작성·윤문 → 이미지 → 보관함 저장)를 자동으로 이어서 실행합니다. 세부 조건을 직접 정하려면 <Link href="/" className="font-bold text-emerald-700 underline">콘텐츠 생성</Link>을 쓰세요.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <StatusCard label="발행할 블로그" ok={(status.accounts ?? 0) > 0} loading={status.accounts === null} okText={`${status.accounts}개 등록`} failText="블로그 등록 필요" href="/accounts" />
        <StatusCard label="AI 본인 키" ok={Boolean(hasAiKey)} loading={status.keys === null} okText="등록됨" failText="키 등록 필요" href="/settings" />
        <StatusCard label="크롬 확장" ok loading={false} okText="입력할 때 확인" failText="" href="/guide" />
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs space-y-4">
        <label className="block">
          <span className="text-sm font-bold text-neutral-900">① 어떤 글을 쓸까요?</span>
          <textarea value={topic} onChange={(e) => { setTopic(e.target.value); setSuggestion(null); }} maxLength={300} rows={2}
            placeholder="예: 초등학생 아이와 가기 좋은 경기도 실내 체험관" className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none" />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-neutral-700">이미지
            <select value={imageCount} onChange={(e) => setImageCount(Number(e.target.value))} className="ml-2 rounded-lg border border-neutral-300 px-2 py-1 text-sm">
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}장</option>)}
            </select>
          </label>
          <button type="button" onClick={suggest} disabled={busy || topic.trim().length < 2 || !ready}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
            {busy ? <Loader2 size={15} className="animate-spin" /> : suggestion ? <RefreshCw size={15} /> : <Zap size={15} />}
            {suggestion ? "다시 추천받기" : "② 키워드·화자 추천받기"}
          </button>
        </div>
        {!ready && status.accounts !== null && status.keys !== null && <p className="text-xs text-rose-600">발행할 블로그와 AI 본인 키를 먼저 등록해 주세요(위 카드를 누르면 등록 화면으로 갑니다).</p>}
        {error && <p className="flex items-start gap-1.5 text-xs text-rose-600"><AlertCircle size={14} className="mt-0.5 shrink-0" />{error}{needKey && <Link href="/settings" className="font-bold underline">키 등록하기</Link>}</p>}
      </section>

      {suggestion && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-2xs space-y-4">
          <p className="text-sm font-bold text-neutral-900">③ 추천을 확인하고 필요하면 고치세요</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="핵심 키워드" value={suggestion.mainKeyword} onChange={(v) => setSuggestion({ ...suggestion, mainKeyword: v })} max={40} />
            <Field label="카테고리" value={suggestion.category} onChange={(v) => setSuggestion({ ...suggestion, category: v })} max={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-neutral-600">보조 키워드</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {suggestion.subKeywords.map((s, i) => (
                <input key={i} value={s} maxLength={40} onChange={(e) => setSub(i, e.target.value)} className="w-40 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs" />
              ))}
            </div>
          </div>
          <Field label="글 목적" value={suggestion.purpose} onChange={(v) => setSuggestion({ ...suggestion, purpose: v })} max={200} />
          <div>
            <span className="text-xs font-bold text-neutral-600">화자(페르소나) — 바꾸려면 고르세요</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {customPersona && (
                <button type="button" onClick={() => setPersonaId(QUICK_CUSTOM_PERSONA_ID)} title={customPersona.desc}
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${personaId === QUICK_CUSTOM_PERSONA_ID ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 bg-white text-neutral-700"}`}>✨ {customPersona.name}</button>
              )}
              {BLOG_PERSONAS.map((p) => (
                <button key={p.id} type="button" onClick={() => setPersonaId(p.id)} title={p.tagline}
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${personaId === p.id ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 bg-white text-neutral-700"}`}>{p.emoji} {p.name}</button>
              ))}
            </div>
            {personaId === QUICK_CUSTOM_PERSONA_ID && customPersona && <p className="mt-1 text-[11px] text-neutral-500">{customPersona.desc}</p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <p className="text-[11px] text-neutral-500">본인 AI 키로 원고 1편과 이미지 {imageCount}장을 만들고 보관함에 저장합니다. 네이버 입력·발행은 결과 화면에서 직접 누릅니다.</p>
            <button type="button" onClick={start} disabled={!suggestion.mainKeyword.trim()}
              className="sm:ml-auto inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">
              <Zap size={15} /> ④ 글과 이미지 만들기
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, value, onChange, max }: { label: string; value: string; onChange: (v: string) => void; max: number }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-neutral-600">{label}</span>
      <input value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm" />
    </label>
  );
}

function StatusCard({ label, ok, loading, okText, failText, href }: { label: string; ok: boolean; loading: boolean; okText: string; failText: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs hover:bg-neutral-50">
      {loading ? <Loader2 size={15} className="animate-spin text-neutral-400" /> : ok ? <CheckCircle2 size={15} className="text-emerald-600" /> : <AlertCircle size={15} className="text-rose-500" />}
      <span className="font-bold text-neutral-800">{label}</span>
      <span className={`ml-auto ${ok ? "text-neutral-500" : "text-rose-600 font-bold"}`}>{loading ? "확인 중" : ok ? okText : failText}</span>
    </Link>
  );
}
