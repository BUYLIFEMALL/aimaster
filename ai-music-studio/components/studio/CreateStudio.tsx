"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, KeyRound, Loader2, Mic, Music2, Sparkles, Wand2 } from "lucide-react";
import { MAX_COMPARE, MODELS, PROVIDERS, clampDuration, validateForModel, type MusicModel } from "@/lib/providers/catalog";
import type { ClientGeneration } from "@/lib/generationTypes";
import { GenerationCard } from "./GenerationCard";

const GENRES = ["K-Pop", "발라드", "R&B", "힙합", "록", "시티팝", "로파이", "EDM", "재즈", "어쿠스틱", "트로트", "시네마틱"];
const MOODS = ["잔잔한", "신나는", "몽환적인", "슬픈", "희망찬", "긴장감 있는", "따뜻한", "웅장한"];
const LANGUAGES = [
  { value: "auto", label: "설명과 같은 언어" },
  { value: "Korean", label: "한국어" },
  { value: "English", label: "영어" },
  { value: "Japanese", label: "일본어" },
  { value: "Chinese", label: "중국어" },
  { value: "Spanish", label: "스페인어" },
];

type Mode = "single" | "compare";

function ModelCard({ model, selected, disabledReason, hasKey, onToggle, multi }: {
  model: MusicModel;
  selected: boolean;
  disabledReason: string | null;
  hasKey: boolean | null;
  onToggle: () => void;
  multi: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      data-model={model.key}
      className={`flex h-full flex-col gap-2 rounded-2xl border p-3.5 text-left transition-all ${
        selected ? "border-violet-500/60 bg-violet-500/10 ring-1 ring-violet-500/30" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
      } ${disabledReason ? "opacity-85" : ""}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-sm font-bold text-white">{model.name}</span>
          <span className="block text-xs text-zinc-400">{PROVIDERS[model.provider].name}</span>
        </span>
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center ${multi ? "rounded-md" : "rounded-full"} border ${selected ? "border-violet-400 bg-violet-500 text-white" : "border-zinc-600"}`}>
          {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
        </span>
      </span>
      {model.badge && <span className="w-fit rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-bold text-violet-200">{model.badge}</span>}
      <span className="text-sm leading-relaxed text-zinc-200">{model.description}</span>
      <span className="mt-auto flex flex-wrap gap-1.5 text-xs font-medium">
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300">{model.vocals ? "🎤 보컬·연주" : "🎹 연주곡 전용"}</span>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300">⏱ {model.durationControl ? `최대 ${Math.round(model.maxDurationS / 60 * 10) / 10}분` : model.maxDurationS <= 30 ? "30초" : "길이 자동"}</span>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300">💰 {model.costNote}</span>
        {model.outputs > 1 && <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300">한 번에 {model.outputs}곡</span>}
        {hasKey === false && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300">🔑 키 필요</span>}
      </span>
      <span className="text-xs leading-snug text-zinc-400">상업 이용: {model.commercial}</span>
    </button>
  );
}

export function CreateStudio({ mode }: { mode: Mode }) {
  const multi = mode === "compare";
  const [selected, setSelected] = useState<string[]>(multi ? ["gemini:lyria-3.5", "elevenlabs:music_v2_5"] : ["gemini:lyria-3.5"]);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [language, setLanguage] = useState("auto");
  const [durationS, setDurationS] = useState(120);
  const [registered, setRegistered] = useState<Set<string> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [writingLyrics, setWritingLyrics] = useState(false);
  const [error, setError] = useState<{ text: string; keys?: boolean } | null>(null);
  const [results, setResults] = useState<ClientGeneration[]>([]);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/keys", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRegistered(new Set<string>(d.registered ?? [])))
      .catch(() => setRegistered(new Set()));
  }, []);

  const chosen = useMemo(() => selected.map((k) => MODELS.find((m) => m.key === k)).filter((m): m is MusicModel => !!m), [selected]);
  const hasKey = (m: MusicModel) => (registered ? registered.has(PROVIDERS[m.provider].keyProvider) : null);
  const problems = chosen.map((m) => validateForModel(m, { instrumental, lyrics })).filter((p): p is string => !!p);
  const anyDuration = chosen.some((m) => m.durationControl);
  const maxDuration = Math.max(30, ...chosen.filter((m) => m.durationControl).map((m) => m.maxDurationS));
  const totalCost = chosen.reduce((sum, m) => sum + m.estCostUsd(clampDuration(m, durationS)), 0);

  function toggle(key: string) {
    setError(null);
    if (!multi) return setSelected([key]);
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : prev.length >= MAX_COMPARE ? prev : [...prev, key]));
  }

  function addTag(tag: string) {
    setPrompt((p) => (p.includes(tag) ? p : p.trim() ? `${p.trim()}, ${tag}` : tag));
  }

  const poll = useCallback((ids: string[]) => {
    if (pollRef.current) clearTimeout(pollRef.current);
    pollRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/generations?ids=${ids.join(",")}`, { cache: "no-store" });
        const data = await res.json();
        if (res.ok && Array.isArray(data.generations)) {
          const fresh = data.generations as ClientGeneration[];
          setResults((prev) => prev.map((r) => fresh.find((f) => f.id === r.id) ?? r));
          if (fresh.some((g) => g.status === "running")) poll(ids);
          return;
        }
      } catch {
        /* 일시 오류는 다음 확인 때 다시 */
      }
      poll(ids);
    }, 6000);
  }, []);

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  async function writeLyrics() {
    setError(null);
    if (prompt.trim().length < 2) return setError({ text: "곡 설명을 먼저 적어 주세요." });
    setWritingLyrics(true);
    try {
      const res = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, language, durationS }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error || "가사를 만들지 못했습니다."), { keys: !!data.missingKeys });
      setLyrics(data.lyrics ?? "");
      if (!title && data.title) setTitle(data.title);
      setInstrumental(false);
    } catch (e) {
      setError({ text: e instanceof Error ? e.message : "가사를 만들지 못했습니다.", keys: (e as { keys?: boolean }).keys });
    } finally {
      setWritingLyrics(false);
    }
  }

  async function submit() {
    setError(null);
    if (!chosen.length) return setError({ text: multi ? "비교할 모델을 2~3개 골라 주세요." : "모델을 골라 주세요." });
    if (multi && chosen.length < 2) return setError({ text: "비교하려면 모델을 2개 이상 골라 주세요." });
    if (prompt.trim().length < 2) return setError({ text: "곡 설명(장르·분위기)을 적어 주세요." });
    if (problems.length) return setError({ text: problems[0] });
    setSubmitting(true);
    try {
      const res = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models: selected, prompt, title, lyrics, instrumental, language, durationS }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error || "생성을 시작하지 못했습니다."), { keys: !!data.missingKeys });
      const gens = data.generations as ClientGeneration[];
      setResults(gens);
      if (gens.some((g) => g.status === "running")) poll(gens.map((g) => g.id));
      setTimeout(() => document.getElementById("studio-results")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      setError({ text: e instanceof Error ? e.message : "생성을 시작하지 못했습니다.", keys: (e as { keys?: boolean }).keys });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-1 border-b border-zinc-800/80 pb-6">
        <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white">{multi ? "⚖️ 모델 비교" : "🎵 음악 만들기"}</h1>
        <p className="text-sm text-zinc-300">
          {multi
            ? "같은 곡 설명과 가사를 최대 3개 모델에 한 번에 보내, 결과를 나란히 들어 보고 마음에 드는 곡을 고릅니다."
            : "Google Lyria·ElevenLabs·Suno·MiniMax·Stable Audio 중 하나를 골라 노래나 배경음악을 만듭니다."}
        </p>
      </div>

      {/* 1단계 모델 */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-200">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-xs text-white">1</span>
          {multi ? `비교할 모델 고르기 (${chosen.length}/${MAX_COMPARE})` : "모델 고르기"}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MODELS.map((m) => (
            <ModelCard key={m.key} model={m} multi={multi} selected={selected.includes(m.key)} hasKey={hasKey(m)}
              disabledReason={validateForModel(m, { instrumental, lyrics })} onToggle={() => toggle(m.key)} />
          ))}
        </div>
      </section>

      {/* 2단계 곡 설명 */}
      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-200">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-xs text-white">2</span>
          곡 설명·가사
        </h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="보컬 여부">
          <button type="button" onClick={() => setInstrumental(false)} aria-pressed={!instrumental}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold ${!instrumental ? "border-violet-500/50 bg-violet-500/15 text-violet-200" : "border-zinc-700 text-zinc-400"}`}>
            <Mic className="h-3.5 w-3.5" aria-hidden="true" /> 보컬곡(노래)
          </button>
          <button type="button" onClick={() => setInstrumental(true)} aria-pressed={instrumental}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold ${instrumental ? "border-violet-500/50 bg-violet-500/15 text-violet-200" : "border-zinc-700 text-zinc-400"}`}>
            <Music2 className="h-3.5 w-3.5" aria-hidden="true" /> 연주곡(배경음악)
          </button>
        </div>

        <div className="space-y-2">
          <label htmlFor="prompt" className="block text-xs font-semibold text-zinc-300">곡 설명 (장르·분위기·악기·용도)</label>
          <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} maxLength={2000}
            placeholder="예: 비 오는 밤 창가에서 듣는 잔잔한 피아노 발라드, 여성 보컬, 따뜻하고 서정적인 분위기"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none" />
          <div className="flex flex-wrap gap-1.5">
            {[...GENRES, ...MOODS].map((t) => (
              <button key={t} type="button" onClick={() => addTag(t)} className="whitespace-nowrap rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-400 hover:border-violet-500/40 hover:text-violet-200">
                + {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <label htmlFor="title" className="block text-xs font-semibold text-zinc-300">제목 (선택)</label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="비우면 설명으로 표시"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="language" className="block text-xs font-semibold text-zinc-300">가사 언어</label>
            <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none">
              {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="duration" className="block text-xs font-semibold text-zinc-300">
              길이 {anyDuration ? `· ${Math.floor(durationS / 60)}분 ${durationS % 60}초` : "· 고른 모델이 정함"}
            </label>
            <input id="duration" type="range" min={10} max={maxDuration} step={5} value={Math.min(durationS, maxDuration)} disabled={!anyDuration}
              onChange={(e) => setDurationS(Number(e.target.value))} className="h-6 w-full accent-violet-500 disabled:opacity-40" />
          </div>
        </div>

        {!instrumental && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="lyrics" className="text-xs font-semibold text-zinc-300">가사 ([Verse]·[Chorus] 구간 표시 권장)</label>
              <button type="button" onClick={writeLyrics} disabled={writingLyrics}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-200 hover:bg-violet-500/20 disabled:opacity-60">
                {writingLyrics ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />}
                {writingLyrics ? "가사 쓰는 중…" : "AI 가사 쓰기"}
              </button>
            </div>
            <textarea id="lyrics" value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={8} maxLength={5000}
              placeholder={"[Verse 1]\n창밖에 내리는 빗소리에\n...\n\n[Chorus]\n..."}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none" />
            <p className="text-[11px] text-zinc-500">비워 두면 Lyria·ElevenLabs·MiniMax 2.6은 설명으로 알아서 부릅니다. Suno·ACE-Step·MiniMax 2.5는 가사가 필요합니다. AI 가사 쓰기는 본인 Gemini(또는 OpenAI) 키를 씁니다.</p>
          </div>
        )}
      </section>

      {/* 3단계 만들기 */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs leading-relaxed text-zinc-300">
            <p className="font-bold text-white">
              {chosen.length ? chosen.map((m) => m.name).join(" · ") : "모델을 골라 주세요"}
            </p>
            <p>예상 비용 약 <strong className="text-violet-200">${totalCost.toFixed(2)}</strong> — 회원 본인 계정에 청구됩니다(공개 가격 기준 대략값).</p>
          </div>
          <button type="button" onClick={submit} disabled={submitting}
            className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-violet-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-violet-500/20 hover:bg-violet-400 disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            {submitting ? "요청 보내는 중…" : multi ? `${chosen.length}개 모델로 비교 생성` : "음악 만들기"}
          </button>
        </div>
        {problems.length > 0 && !error && <p className="text-xs text-amber-300">⚠️ {problems[0]}</p>}
        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error.text}</span>
            {error.keys && (
              <Link href="/settings" className="flex items-center gap-1 whitespace-nowrap font-bold text-violet-200 underline">
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> 키 등록하러 가기
              </Link>
            )}
          </div>
        )}
      </section>

      {results.length > 0 && (
        <section id="studio-results" className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-200">{multi ? "비교 결과 — 나란히 들어 보세요" : "결과"}</h2>
          <div className={`grid grid-cols-1 gap-4 ${results.length > 1 ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}>
            {results.map((g) => (
              <GenerationCard key={g.id} gen={g} onDeleted={(id) => setResults((prev) => prev.filter((r) => r.id !== id))} />
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            완성된 곡은 <Link href="/library" className="text-violet-300 underline">내 보관함</Link>에 30일 동안 보관됩니다.
          </p>
        </section>
      )}
    </div>
  );
}
