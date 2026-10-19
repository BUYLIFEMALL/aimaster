"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AudioWaveform, Download, Loader2, Sparkles, Trash2, Upload, Wand2, X, SlidersHorizontal, Cpu, Layers, BookOpen, KeyRound } from "lucide-react";
import JSZip from "jszip";
import { DEFAULT_PARAMS, PRESETS, clampParams, type MasteringParams, type Preset } from "@/lib/mastering/params";
import { DEFAULT_TEXT_MODEL, TEXT_MODELS } from "@/lib/mastering/models";
import { encodeWav16, masteredFileName, measure, uniqueNames, type Levels } from "@/lib/mastering/dsp";
import { bufferChannels, masterAudio, toAudioBuffer } from "@/lib/mastering/engine";
import { Rack } from "./Rack";
import { Waveform } from "./Waveform";

const MAX_TRACKS = 20;
const MAX_FILE_BYTES = 150 * 1024 * 1024;
const MODEL_KEY = "ams_text_model_v1";

type Status = "decoding" | "ready" | "processing" | "done" | "error";
interface Track {
  id: string;
  file: File;
  status: Status;
  original: AudioBuffer | null;
  originalUrl: string;
  originalLevels: Levels | null;
  mastered: AudioBuffer | null;
  masteredUrl: string | null;
  masteredBlob: Blob | null;
  masteredLevels: Levels | null;
  doneParams: string | null; // 처리에 쓴 설정(JSON) — 설정이 바뀌면 "다시 처리" 안내
  error?: string;
}

const STATUS_LABEL: Record<Status, string> = { decoding: "읽는 중", ready: "대기", processing: "처리 중", done: "완료", error: "오류" };
const fmtDb = (v: number) => (v <= -100 ? "-∞" : v.toFixed(1)) + " dB";

export function MasteringStudio() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [params, setParams] = useState<MasteringParams>(DEFAULT_PARAMS);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  // AI 설정 제안
  const [textModel, setTextModel] = useState(DEFAULT_TEXT_MODEL);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<{ text: string; needKey?: boolean } | null>(null);
  const [aiExplain, setAiExplain] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const tracksRef = useRef<Track[]>([]);
  tracksRef.current = tracks;
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      const m = localStorage.getItem(MODEL_KEY);
      if (m && TEXT_MODELS.some((x) => x.id === m)) setTextModel(m);
    } catch { /* 저장소를 못 써도 동작에는 영향 없음 */ }
    return () => {
      tracksRef.current.forEach((t) => {
        URL.revokeObjectURL(t.originalUrl);
        if (t.masteredUrl) URL.revokeObjectURL(t.masteredUrl);
      });
    };
  }, []);

  const active = useMemo(() => tracks.find((t) => t.id === activeId) ?? null, [tracks, activeId]);
  const paramsJson = JSON.stringify(params);
  const anyDone = tracks.some((t) => t.status === "done" && t.masteredBlob);
  const patchTrack = useCallback((id: string, patch: Partial<Track>) => setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))), []);

  const addFiles = useCallback(async (files: File[]) => {
    setError(null);
    const room = MAX_TRACKS - tracksRef.current.length;
    const ok = files.filter((f) => f.size <= MAX_FILE_BYTES);
    if (ok.length < files.length) setError(`파일 하나는 ${MAX_FILE_BYTES / 1024 / 1024}MB 이하여야 합니다. 큰 파일은 건너뛰었습니다.`);
    const picked = ok.slice(0, Math.max(0, room));
    if (ok.length > picked.length) setError(`트랙은 최대 ${MAX_TRACKS}개까지 올릴 수 있습니다.`);
    if (!picked.length) return;
    const fresh: Track[] = picked.map((file) => ({
      id: Math.random().toString(36).slice(2, 10), file, status: "decoding", original: null, originalUrl: URL.createObjectURL(file), originalLevels: null,
      mastered: null, masteredUrl: null, masteredBlob: null, masteredLevels: null, doneParams: null,
    }));
    setTracks((prev) => [...prev, ...fresh]);
    setActiveId((cur) => cur ?? fresh[0].id);
    ctxRef.current ??= new AudioContext();
    for (const t of fresh) {
      try {
        const buf = await ctxRef.current.decodeAudioData(await t.file.arrayBuffer());
        patchTrack(t.id, { original: buf, status: "ready", originalLevels: measure(bufferChannels(buf)) });
      } catch {
        patchTrack(t.id, { status: "error", error: "오디오를 읽지 못했습니다. 손상되었거나 지원하지 않는 형식일 수 있습니다." });
      }
    }
  }, [patchTrack]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    if (busy) return;
    const files = Array.from(e.dataTransfer.files).filter((f) => /\.(wav|wave)$/i.test(f.name) || f.type.startsWith("audio/"));
    if (files.length) void addFiles(files);
  }

  function removeTrack(id: string) {
    setTracks((prev) => {
      const t = prev.find((x) => x.id === id);
      if (t) {
        URL.revokeObjectURL(t.originalUrl);
        if (t.masteredUrl) URL.revokeObjectURL(t.masteredUrl);
      }
      const next = prev.filter((x) => x.id !== id);
      setActiveId((cur) => (cur === id ? next[0]?.id ?? null : cur));
      return next;
    });
  }

  function clearProject() {
    if (!confirm("올린 트랙과 처리 결과를 모두 지웁니다. 계속할까요?")) return;
    tracks.forEach((t) => {
      URL.revokeObjectURL(t.originalUrl);
      if (t.masteredUrl) URL.revokeObjectURL(t.masteredUrl);
    });
    setTracks([]);
    setActiveId(null);
    setParams(DEFAULT_PARAMS);
    setActiveLabel(null);
    setAiExplain(null);
  }

  function applyPreset(p: Preset) {
    setParams(clampParams(p.params));
    setActiveLabel(p.name);
    setAiExplain(null);
  }

  async function runAi() {
    if (!aiPrompt.trim()) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai-preset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: aiPrompt, textModel }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setAiError({ text: d.error ?? "AI 요청에 실패했습니다.", needKey: !!d.needKey });
      setParams(clampParams(d.params));
      setActiveLabel("AI 로직");
      setAiExplain(d.explanation || null);
    } catch {
      setAiError({ text: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      setAiBusy(false);
    }
  }

  async function processAll() {
    setBusy(true);
    setError(null);
    const snapshot = params;
    const snapshotJson = JSON.stringify(snapshot);
    try {
      for (const t of tracksRef.current) {
        if (!t.original) continue;
        patchTrack(t.id, { status: "processing" });
        await new Promise((r) => setTimeout(r, 30)); // 화면이 "처리 중"으로 바뀔 시간
        try {
          const out = await masterAudio(t.original, snapshot);
          const blob = new Blob([encodeWav16(out.channels, out.sampleRate) as BlobPart], { type: "audio/wav" });
          if (t.masteredUrl) URL.revokeObjectURL(t.masteredUrl);
          patchTrack(t.id, {
            status: "done", mastered: toAudioBuffer(out), masteredBlob: blob, masteredUrl: URL.createObjectURL(blob),
            masteredLevels: measure(out.channels), doneParams: snapshotJson, error: undefined,
          });
        } catch {
          patchTrack(t.id, { status: "error", error: "마스터링 처리 중 오류가 발생했습니다. 다른 설정으로 다시 시도해 주세요." });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function downloadZip() {
    const done = tracks.filter((t) => t.status === "done" && t.masteredBlob);
    if (!done.length) return;
    setZipping(true);
    setError(null);
    try {
      const zip = new JSZip();
      const names = uniqueNames(done.map((t) => masteredFileName(t.file.name)));
      done.forEach((t, i) => zip.file(names[i], t.masteredBlob!));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const d = new Date();
      a.download = `mastered_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      setError("ZIP 파일을 만들지 못했습니다.");
    } finally {
      setZipping(false);
    }
  }

  const stale = !!active && active.status === "done" && active.doneParams !== paramsJson;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* 사이버 네온 마스터링 콘솔 히어로 배너 */}
      <div className="studio-hero">
        <div className="studio-hero-title">
          <AudioWaveform size={26} className="text-[#00f0ff]" />
          <span>Cyber Neon Audio Mastering Console</span>
        </div>
        <p className="studio-hero-desc">
          WAV 음원을 브라우저 안에서 고성능 Web Audio DSP로 무손실 마스터링하고, 원하는 소리를 AI로 제안받아 프로페셔널 사운드로 완성합니다. 오디오는 서버로 전송되지 않고 안전하게 처리됩니다.
        </p>
        <div className="studio-hero-badges">
          <span className="badge-tag cyan"><Sparkles size={12} /> v1.10 MASTER CONSOLE</span>
          <span className="badge-tag purple"><Layers size={12} /> 12종 프로페셔널 사운드 프로필</span>
          <span className="badge-tag amber"><SlidersHorizontal size={12} /> 5대 하드웨어 마스터링 랙</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Link href="/guide" className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition">
            <BookOpen size={14} /> 📖 연동 & 사용 매뉴얼 보기
          </Link>
          <Link href="/settings" className="inline-flex items-center gap-2 rounded-xl border border-[#1e293b] bg-[#131b2e] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-[#1a243d] transition">
            <KeyRound size={14} /> 🔑 API 키 설정
          </Link>
        </div>
      </div>

      {/* 3대 핵심 KPI 지표 카드 */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap cyan">
            <Layers size={20} />
          </div>
          <div className="kpi-content">
            <strong>12종 사운드 프로필</strong>
            <small>스트리밍 · 클럽 · 펀치 · 테이프 · 시네마틱</small>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap purple">
            <SlidersHorizontal size={20} />
          </div>
          <div className="kpi-content">
            <strong>5대 정밀 아날로그 랙</strong>
            <small>3밴드 EQ · 새추레이션 · 컴프 · 이미저 · 리미터</small>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap amber">
            <Cpu size={20} />
          </div>
          <div className="kpi-content">
            <strong>무손실 브라우저 렌더</strong>
            <small>서버 업로드 없는 100% 안전한 Web Audio 엔진</small>
          </div>
        </div>
      </div>

      {/* ① 업로드 */}
      <section
        id="upload"
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-6 transition ${drag ? "border-[#00f0ff] bg-[#00f0ff]/5" : "border-[#1e293b] bg-[#0d121f]"}`}
      >
        <input ref={fileRef} type="file" accept=".wav,.wave,audio/wav,audio/x-wav,audio/*" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) void addFiles(f); }} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00f0ff]/15 text-[#00f0ff]"><Upload size={22} /></div>
            <div>
              <p className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00f0ff] text-[#060911] text-xs font-black">1</span>
                마스터 WAV 올리기
              </p>
              <p className="text-xs text-slate-400 mt-0.5">44.1kHz/16bit 이상 고음질 WAV를 끌어다 놓거나 선택하세요 (최대 {MAX_TRACKS}곡, 파일당 {MAX_FILE_BYTES / 1024 / 1024}MB).</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={busy || zipping} onClick={() => fileRef.current?.click()} className="rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0284c7] px-4 py-2 text-sm font-extrabold text-[#060911] hover:brightness-110 disabled:opacity-60 transition shadow-sm">파일 선택</button>
            {tracks.length > 0 && <button type="button" disabled={busy || zipping} onClick={clearProject} className="inline-flex items-center gap-1.5 rounded-xl border border-[#1e293b] bg-[#131b2e] px-3 py-2 text-sm text-slate-300 hover:bg-[#1a243d] disabled:opacity-60 transition"><Trash2 size={14} />초기화</button>}
          </div>
        </div>
        {tracks.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t) => (
              <li key={t.id}>
                <div role="button" tabIndex={0} onClick={() => setActiveId(t.id)} onKeyDown={(e) => e.key === "Enter" && setActiveId(t.id)} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${t.id === activeId ? "border-[#00f0ff] bg-[#00f0ff]/10" : "border-[#1e293b] bg-[#131b2e] hover:border-[#334155]"}`}>
                  <AudioWaveform size={16} className={`shrink-0 ${t.id === activeId ? "text-[#00f0ff]" : "text-slate-400"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-200" title={t.file.name}>{t.file.name}</span>
                    <span className={`text-[11px] ${t.status === "error" ? "text-rose-400" : t.status === "done" ? "text-emerald-400" : "text-slate-400"}`}>
                      {STATUS_LABEL[t.status]}{t.status === "done" && t.doneParams !== paramsJson ? " · 설정 변경됨" : ""}
                    </span>
                  </span>
                  {(t.status === "processing" || t.status === "decoding") && <Loader2 size={14} className="animate-spin text-[#00f0ff]" />}
                  <button type="button" aria-label="트랙 삭제" disabled={busy} onClick={(e) => { e.stopPropagation(); removeTrack(t.id); }} className="rounded p-1 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-40"><X size={14} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 비교 */}
      {active && (
        <section className="grid gap-4 lg:grid-cols-2">
          <TrackCard title="입력 신호 (Original)" buffer={active.original} url={active.originalUrl} levels={active.originalLevels} color="#38bdf8" />
          {active.status === "error" ? (
            <div className="flex items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">{active.error}</div>
          ) : active.masteredUrl ? (
            <TrackCard title="마스터된 신호 (Mastered)" buffer={active.mastered} url={active.masteredUrl} levels={active.masteredLevels} color="#a855f7" badge={stale ? "설정이 바뀌었습니다 — 다시 처리하세요" : "Mastered"} download={{ href: active.masteredUrl, name: masteredFileName(active.file.name) }} />
          ) : (
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-[#1e293b] bg-[#0d121f] text-sm text-slate-400 p-6 text-center">
              {active.status === "processing" ? "처리 중..." : "아직 처리하지 않았습니다. 설정을 고른 뒤 ‘전체 일괄 처리’를 누르세요."}
            </div>
          )}
        </section>
      )}

      {/* ② 사운드 프로필 */}
      <section id="rack" className="rounded-2xl border border-[#1e293b] bg-[#0d121f] p-5">
        <h2 className="mb-1 text-sm font-bold text-slate-100 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8b5cf6] text-white text-xs font-black">2</span>
          사운드 프로필 (12종 Presets)
        </h2>
        <p className="mb-4 text-xs text-slate-400">프리셋을 누르면 아래 마스터링 랙의 값이 최적화됩니다.{activeLabel && <> 현재 적용: <b className="text-[#00f0ff]">{activeLabel}</b></>}</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" disabled={busy} onClick={() => applyPreset(p)} className={`rounded-xl border p-3.5 text-left transition disabled:opacity-60 ${activeLabel === p.name ? "border-[#00f0ff] bg-[#00f0ff]/10 shadow-sm" : "border-[#1e293b] bg-[#131b2e] hover:border-[#38bdf8]/50"}`}>
              <p className="text-sm font-bold text-slate-200">{p.name}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">{p.en}</p>
              <p className="mt-1 text-[11px] leading-snug text-slate-400">{p.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* AI 로직 생성기 */}
      <section className="space-y-3 rounded-2xl border border-[#1e293b] bg-[#0d121f] p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100"><Wand2 size={16} className="text-[#00f0ff]" />AI 로직 생성기 (AI Tuning Engineer)</h2>
        <p className="text-xs text-slate-400">원하는 소리를 한국어로 적으면 AI 엔지니어가 설정값을 제안합니다. 회원님 본인의 API 키로 독립 호출됩니다.</p>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <select value={textModel} onChange={(e) => { setTextModel(e.target.value); try { localStorage.setItem(MODEL_KEY, e.target.value); } catch { /* 무시 */ } }} className="rounded-xl border border-[#1e293b] bg-[#131b2e] px-3 py-2 text-sm text-slate-200 sm:w-64 focus:outline-hidden focus:border-[#00f0ff]">
            {TEXT_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value.slice(0, 400))} rows={2} placeholder="예: 선명한 고음과 깊은 저음 펀치감이 있는 현대적인 K-Pop 사운드" className="min-w-0 flex-1 rounded-xl border border-[#1e293b] bg-[#131b2e] px-3 py-2 text-sm text-slate-200 focus:outline-hidden focus:border-[#00f0ff]" />
          <button type="button" onClick={runAi} disabled={aiBusy || !aiPrompt.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] px-4 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60 transition shrink-0">
            {aiBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}AI 제안 요청
          </button>
        </div>
        {aiError && (
          <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-sm text-rose-300">
            {aiError.text} {aiError.needKey && <Link href="/settings" className="font-bold underline text-rose-200">키 등록하러 가기</Link>}
          </p>
        )}
        {aiExplain && <p className="rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/20 px-3.5 py-2 text-sm text-[#00f0ff]">“{aiExplain}”</p>}
      </section>

      {/* 정밀 마스터링 랙 */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-[#38bdf8]" />
          정밀 마스터링 랙 (Analog Hardware Rack)
        </h2>
        <Rack params={params} onChange={(p) => { setParams(p); setActiveLabel(null); }} disabled={busy} />
      </section>

      {/* ③ 처리·저장 */}
      <section id="render" className="sticky bottom-4 z-10 rounded-2xl border border-[#1e293b] bg-[#0d121f]/95 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <button type="button" onClick={processAll} disabled={busy || zipping || !tracks.some((t) => t.original)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00f0ff] via-[#0284c7] to-[#8b5cf6] px-5 py-3 text-sm font-extrabold text-[#060911] hover:brightness-110 disabled:opacity-50 transition shadow-lg">
            {busy ? <><Loader2 size={16} className="animate-spin" />일괄 처리 중...</> : "③ 전체 일괄 처리 (Render All)"}
          </button>
          <button type="button" onClick={downloadZip} disabled={busy || zipping || !anyDone} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#1e293b] bg-[#131b2e] px-5 py-3 text-sm font-bold text-slate-200 hover:bg-[#1a243d] disabled:opacity-50 transition">
            {zipping ? <><Loader2 size={16} className="animate-spin" />압축 중...</> : <><Download size={16} />전체 다운로드 (ZIP)</>}
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-rose-400">{error}</p>}
      </section>
    </div>
  );
}

function TrackCard({ title, buffer, url, levels, color, badge, download }: { title: string; buffer: AudioBuffer | null; url: string; levels: Levels | null; color: string; badge?: string; download?: { href: string; name: string } }) {
  return (
    <div className="space-y-3 rounded-2xl border border-[#1e293b] bg-[#0d121f] p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-100">{title}</h3>
        <div className="flex items-center gap-2">
          {badge && <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge === "Mastered" ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`}>{badge}</span>}
          {download && (
            <a href={download.href} download={download.name} className="inline-flex items-center gap-1 rounded-lg border border-[#1e293b] bg-[#131b2e] px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-[#1a243d] transition"><Download size={13} />WAV 저장</a>
          )}
        </div>
      </div>
      <Waveform buffer={buffer} color={color} />
      {levels && (
        <p className="flex gap-4 font-mono text-[11px] text-slate-400">
          <span>피크 {fmtDb(levels.peakDb)}</span>
          <span>평균(RMS) {fmtDb(levels.rmsDb)}</span>
        </p>
      )}
      <audio controls src={url} className="w-full" />
    </div>
  );
}

