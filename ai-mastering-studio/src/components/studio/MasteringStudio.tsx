"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AudioWaveform, Download, Loader2, Sparkles, Trash2, Upload, Wand2, X } from "lucide-react";
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
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">마스터링</h1>
        <p className="mt-1 text-sm text-neutral-500">WAV를 올리고 프리셋이나 AI 설정을 고른 뒤 처리하세요. 오디오는 서버로 전송되지 않고 이 브라우저 안에서만 처리됩니다.</p>
      </div>

      {/* ① 업로드 */}
      <section
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-5 transition ${drag ? "border-indigo-500 bg-indigo-50" : "border-neutral-300 bg-white"}`}
      >
        <input ref={fileRef} type="file" accept=".wav,.wave,audio/wav,audio/x-wav,audio/*" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) void addFiles(f); }} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Upload size={20} /></div>
            <div>
              <p className="text-sm font-bold text-neutral-900">① 마스터 WAV 올리기</p>
              <p className="text-xs text-neutral-500">44.1kHz/16bit 이상 고음질 WAV를 끌어다 놓거나 선택하세요. 여러 곡을 한 번에 처리할 수 있습니다(최대 {MAX_TRACKS}곡, 파일당 {MAX_FILE_BYTES / 1024 / 1024}MB).</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={busy || zipping} onClick={() => fileRef.current?.click()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">파일 선택</button>
            {tracks.length > 0 && <button type="button" disabled={busy || zipping} onClick={clearProject} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-60"><Trash2 size={14} />초기화</button>}
          </div>
        </div>
        {tracks.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t) => (
              <li key={t.id}>
                <div role="button" tabIndex={0} onClick={() => setActiveId(t.id)} onKeyDown={(e) => e.key === "Enter" && setActiveId(t.id)} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left ${t.id === activeId ? "border-indigo-500 bg-indigo-50" : "border-neutral-200 bg-white hover:bg-neutral-50"}`}>
                  <AudioWaveform size={16} className="shrink-0 text-neutral-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-900" title={t.file.name}>{t.file.name}</span>
                    <span className={`text-[11px] ${t.status === "error" ? "text-rose-600" : t.status === "done" ? "text-emerald-600" : "text-neutral-400"}`}>
                      {STATUS_LABEL[t.status]}{t.status === "done" && t.doneParams !== paramsJson ? " · 설정 변경됨" : ""}
                    </span>
                  </span>
                  {(t.status === "processing" || t.status === "decoding") && <Loader2 size={14} className="animate-spin text-indigo-600" />}
                  <button type="button" aria-label="트랙 삭제" disabled={busy} onClick={(e) => { e.stopPropagation(); removeTrack(t.id); }} className="rounded p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"><X size={14} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 비교 */}
      {active && (
        <section className="grid gap-4 lg:grid-cols-2">
          <TrackCard title="입력 신호" buffer={active.original} url={active.originalUrl} levels={active.originalLevels} color="#60a5fa" />
          {active.status === "error" ? (
            <div className="flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{active.error}</div>
          ) : active.masteredUrl ? (
            <TrackCard title="마스터된 신호" buffer={active.mastered} url={active.masteredUrl} levels={active.masteredLevels} color="#8b5cf6" badge={stale ? "설정이 바뀌었습니다 — 다시 처리하세요" : "Mastered"} download={{ href: active.masteredUrl, name: masteredFileName(active.file.name) }} />
          ) : (
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white text-sm text-neutral-400">
              {active.status === "processing" ? "처리 중..." : "아직 처리하지 않았습니다. 설정을 고른 뒤 ‘전체 일괄 처리’를 누르세요."}
            </div>
          )}
        </section>
      )}

      {/* ② 사운드 프로필 */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-bold text-neutral-900">② 사운드 프로필</h2>
        <p className="mb-3 text-xs text-neutral-500">프리셋을 누르면 아래 마스터링 랙의 값이 바뀝니다.{activeLabel && <> 현재: <b className="text-indigo-700">{activeLabel}</b></>}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" disabled={busy} onClick={() => applyPreset(p)} className={`rounded-xl border p-3 text-left transition disabled:opacity-60 ${activeLabel === p.name ? "border-indigo-600 bg-indigo-50" : "border-neutral-200 hover:border-indigo-300"}`}>
              <p className="text-sm font-bold text-neutral-900">{p.name}</p>
              <p className="text-[10px] uppercase tracking-wide text-neutral-400">{p.en}</p>
              <p className="mt-1 text-[11px] leading-snug text-neutral-500">{p.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* AI 로직 생성기 */}
      <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900"><Wand2 size={16} className="text-indigo-600" />AI 로직 생성기</h2>
        <p className="text-xs text-neutral-500">원하는 소리를 글로 적으면 AI 엔지니어가 설정값을 제안합니다. 회원님 본인의 API 키로 호출됩니다.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={textModel} onChange={(e) => { setTextModel(e.target.value); try { localStorage.setItem(MODEL_KEY, e.target.value); } catch { /* 무시 */ } }} className="rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-sm text-neutral-900 sm:w-64">
            {TEXT_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value.slice(0, 400))} rows={2} placeholder="예: 선명한 고음과 깊은 저음 펀치감이 있는 현대적인 K-Pop 사운드" className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900" />
          <button type="button" onClick={runAi} disabled={aiBusy || !aiPrompt.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
            {aiBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}AI 엔지니어에게 문의
          </button>
        </div>
        {aiError && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {aiError.text} {aiError.needKey && <Link href="/settings" className="font-bold underline">키 등록하러 가기</Link>}
          </p>
        )}
        {aiExplain && <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">“{aiExplain}”</p>}
      </section>

      {/* 정밀 마스터링 랙 */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-neutral-900">정밀 마스터링 랙</h2>
        <Rack params={params} onChange={(p) => { setParams(p); setActiveLabel(null); }} disabled={busy} />
      </section>

      {/* ③ 처리·저장 */}
      <section className="sticky bottom-0 z-10 -mx-1 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={processAll} disabled={busy || zipping || !tracks.some((t) => t.original)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
            {busy ? <><Loader2 size={16} className="animate-spin" />일괄 처리 중...</> : "③ 전체 일괄 처리"}
          </button>
          <button type="button" onClick={downloadZip} disabled={busy || zipping || !anyDone} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
            {zipping ? <><Loader2 size={16} className="animate-spin" />압축 중...</> : <><Download size={16} />전체 다운로드 (ZIP)</>}
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
      </section>
    </div>
  );
}

function TrackCard({ title, buffer, url, levels, color, badge, download }: { title: string; buffer: AudioBuffer | null; url: string; levels: Levels | null; color: string; badge?: string; download?: { href: string; name: string } }) {
  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-neutral-900">{title}</h3>
        <div className="flex items-center gap-2">
          {badge && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badge === "Mastered" ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-800"}`}>{badge}</span>}
          {download && (
            <a href={download.href} download={download.name} className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"><Download size={13} />WAV 저장</a>
          )}
        </div>
      </div>
      <Waveform buffer={buffer} color={color} />
      {levels && (
        <p className="flex gap-4 font-mono text-[11px] text-neutral-500">
          <span>피크 {fmtDb(levels.peakDb)}</span>
          <span>평균(RMS) {fmtDb(levels.rmsDb)}</span>
        </p>
      )}
      <audio controls src={url} className="w-full" />
    </div>
  );
}
