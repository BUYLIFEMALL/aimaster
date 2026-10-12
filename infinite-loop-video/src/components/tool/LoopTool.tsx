"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Repeat, Scissors, UploadCloud, Wand2 } from "lucide-react";
import { buildMatrix, findLoops, qualityLabel, refinePair, type LoopCandidate } from "@/lib/loop/analysis";
import { extractFeatures, renderLoop } from "@/lib/loop/browser";
import { MAX_CROSSFADE, MIN_CROSSFADE, normalize, totalLength, type LoopMode, type OutFormat } from "@/lib/loop/plan";

const SAMPLE_FPS = 8;
const MAX_ANALYZE_SEC = 60;
const MAX_BYTES = 200 * 1024 * 1024;
const MODES: { id: LoopMode; name: string; desc: string }[] = [
  { id: "smart", name: "스마트 루프", desc: "가장 닮은 구간을 찾아 부드럽게 이어 붙입니다 (권장)" },
  { id: "overlap", name: "강제 오버랩", desc: "분석 없이 영상 전체의 끝과 처음을 1초 겹칩니다" },
  { id: "bounce", name: "바운스", desc: "앞으로 갔다가 거꾸로 돌아오는 반복입니다" },
];
const LEVEL_COLOR = { excellent: "text-emerald-600", good: "text-emerald-600", fair: "text-amber-600", poor: "text-rose-600" } as const;
const fmt = (s: number) => `${s.toFixed(2)}초`;

export function LoopTool() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [hasAudio, setHasAudio] = useState(false);
  const [mode, setMode] = useState<LoopMode>("smart");
  const [minLen, setMinLen] = useState(1);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [crossfade, setCrossfade] = useState(0.6);
  const [repeat, setRepeat] = useState(5);
  const [format, setFormat] = useState<OutFormat>("mp4");
  const [status, setStatus] = useState("");
  const [ratio, setRatio] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cands, setCands] = useState<LoopCandidate[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [curve, setCurve] = useState<number[]>([]);
  const [result, setResult] = useState<{ url: string; size: number; ext: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const matrixRef = useRef<Float32Array[] | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  const params = useMemo(
    () => ({ mode, start, end, crossfade, repeat, duration, hasAudio, format }),
    [mode, start, end, crossfade, repeat, duration, hasAudio, format]
  );
  const norm = normalize(params);
  const total = format === "gif" ? norm.mode === "bounce" ? (norm.end - norm.start) * 2 : norm.end - norm.start - norm.crossfade : totalLength(params);

  function pickFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("video/")) { setError("동영상 파일만 올릴 수 있습니다."); return; }
    if (f.size > MAX_BYTES) { setError("파일이 너무 큽니다. 200MB 이하(권장 50MB 이하)로 올려 주세요."); return; }
    setError(""); setResult(null); setCands([]); setScore(null); setCurve([]); matrixRef.current = null;
    if (url) URL.revokeObjectURL(url);
    setFile(f); setUrl(URL.createObjectURL(f));
  }

  async function onLoaded() {
    const v = videoRef.current;
    if (!v) return;
    // 녹화 파일(MediaRecorder)은 길이 정보가 비어 있어 Infinity로 나온다 — 끝으로 한 번 이동해 실제 길이를 알아낸다
    if (!Number.isFinite(v.duration)) {
      await new Promise<void>((resolve) => {
        const done = () => { v.removeEventListener("durationchange", done); resolve(); };
        v.addEventListener("durationchange", done);
        v.currentTime = 1e101;
        setTimeout(resolve, 3000);
      });
      v.currentTime = 0;
    }
    const d = v.duration;
    if (!Number.isFinite(d) || d <= 0) { setError("영상 길이를 읽지 못했습니다. 다른 파일로 시도해 주세요."); return; }
    setDuration(d); setStart(0); setEnd(+d.toFixed(2));
    // 소리 트랙이 있는지 확인
    const anyV = v as HTMLVideoElement & { mozHasAudio?: boolean; webkitAudioDecodedByteCount?: number; audioTracks?: { length: number } };
    setHasAudio(anyV.audioTracks ? anyV.audioTracks.length > 0 : anyV.mozHasAudio ?? true);
  }

  async function analyze() {
    const v = videoRef.current;
    if (!v || !duration) return;
    setBusy(true); setError(""); cancelRef.current = false; setResult(null);
    try {
      v.pause();
      const span = Math.min(duration, MAX_ANALYZE_SEC);
      const n = Math.max(2, Math.floor(span * SAMPLE_FPS));
      const times = Array.from({ length: n }, (_, i) => (i / SAMPLE_FPS));
      setStatus("프레임을 꼼꼼히 살펴보는 중"); setRatio(0);
      const feats = await extractFeatures(v, times, (d, t) => setRatio(d / t), () => cancelRef.current);
      setStatus("가장 닮은 구간을 찾는 중"); setRatio(undefined);
      await new Promise((r) => setTimeout(r, 0));
      const m = buildMatrix(feats);
      matrixRef.current = m;
      const found = findLoops(m, SAMPLE_FPS, minLen, 30);
      if (!found.length) { setError("조건에 맞는 구간을 찾지 못했습니다. 최소 루프 길이를 줄여 보세요."); return; }
      setCands(found);
      await applyCandidate(found[0]);
    } catch (e) {
      if ((e as Error).message !== "cancelled") setError("분석 중 문제가 발생했습니다. 다른 영상으로 다시 시도해 주세요.");
    } finally { setBusy(false); setStatus(""); setRatio(undefined); }
  }

  async function applyCandidate(c: LoopCandidate) {
    const v = videoRef.current!;
    // 경계 ±0.35초를 30fps로 다시 훑어 가장 매끄러운 프레임으로 보정
    setStatus("경계를 정밀하게 맞추는 중"); setRatio(undefined);
    const s0 = c.start / SAMPLE_FPS, e0 = c.end / SAMPLE_FPS;
    const win = (t: number) => {
      const lo = Math.max(0, t - 0.35), hi = Math.min(duration, t + 0.35);
      const ts: number[] = []; for (let x = lo; x <= hi; x += 1 / 30) ts.push(x);
      return ts;
    };
    const wa = win(s0), wb = win(e0);
    try {
      const [fa, fb] = [await extractFeatures(v, wa), await extractFeatures(v, wb)];
      const best = refinePair(fa, fb);
      let s = wa[best.a], e = wb[best.b];
      if (e - s < minLen * 0.9) { s = s0; e = e0; }
      setStart(+s.toFixed(2)); setEnd(+e.toFixed(2)); setScore(best.score);
    } catch { setStart(+s0.toFixed(2)); setEnd(+e0.toFixed(2)); setScore(c.score); }
    drawCurve(c.start);
    v.currentTime = s0;
  }

  function drawCurve(startFrame: number) {
    const m = matrixRef.current;
    if (m) setCurve(Array.from(m[startFrame] ?? []));
  }

  async function onRender() {
    if (!file) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const r = await renderLoop(file, params, (msg, ra) => { setStatus(msg); setRatio(ra); });
      setResult({ url: URL.createObjectURL(r.blob), size: r.blob.size, ext: r.ext });
    } catch (e) {
      setError((e as Error).message || "렌더링에 실패했습니다.");
    } finally { setBusy(false); setStatus(""); setRatio(undefined); }
  }

  const q = score !== null ? qualityLabel(score) : null;
  const showSegment = mode !== "overlap";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 text-base font-bold text-neutral-900">1. 영상 올리기</h2>
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0] ?? null); }}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center hover:border-blue-400"
        >
          <UploadCloud className="text-neutral-400" />
          <span className="text-sm font-medium text-neutral-700">{file ? file.name : "동영상을 끌어다 놓거나 눌러서 선택하세요"}</span>
          <span className="text-xs text-neutral-500">50MB 이하, 30초 미만 영상을 권장합니다 · 영상은 서버로 전송되지 않고 이 기기 안에서만 처리됩니다</span>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
        </label>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      </section>

      {url && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-base font-bold text-neutral-900">2. 루프 방식과 구간</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <video ref={videoRef} src={url} controls muted playsInline onLoadedMetadata={onLoaded}
                onTimeUpdate={(e) => { const v = e.currentTarget; if (showSegment && end > start && v.currentTime >= end) v.currentTime = start; }}
                className="w-full rounded-xl bg-black" />
              <p className="mt-1 text-xs text-neutral-500">미리보기는 선택한 구간만 반복합니다 (크로스페이드는 만든 결과에서 확인).</p>
              {curve.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium text-neutral-600">시작 프레임과의 유사도 (높을수록 닮음)</p>
                  <svg viewBox="0 0 300 60" className="h-16 w-full rounded-lg border border-neutral-200 bg-neutral-50">
                    <polyline fill="none" stroke="#2563eb" strokeWidth="1.5"
                      points={curve.map((v, i) => `${(i / Math.max(1, curve.length - 1)) * 300},${58 - Math.max(0, (v - 0.5) / 0.5) * 56}`).join(" ")} />
                    {duration > 0 && <line x1={(end / Math.min(duration, MAX_ANALYZE_SEC)) * 300} x2={(end / Math.min(duration, MAX_ANALYZE_SEC)) * 300} y1="0" y2="60" stroke="#e11d48" strokeWidth="1.5" />}
                  </svg>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                {MODES.map((m) => (
                  <label key={m.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${mode === m.id ? "border-blue-500 bg-blue-50" : "border-neutral-200 hover:bg-neutral-50"}`}>
                    <input type="radio" name="mode" checked={mode === m.id} onChange={() => setMode(m.id)} className="mt-1" />
                    <span><span className="block text-sm font-bold text-neutral-900">{m.name}</span><span className="text-xs text-neutral-500">{m.desc}</span></span>
                  </label>
                ))}
              </div>

              {mode === "smart" && (
                <div className="space-y-3 rounded-xl bg-neutral-50 p-3">
                  <label className="block text-xs font-medium text-neutral-700">최소 루프 길이 {minLen.toFixed(1)}초
                    <input type="range" min={0.5} max={Math.max(1, Math.min(30, duration / 2))} step={0.1} value={minLen} onChange={(e) => setMinLen(+e.target.value)} className="w-full" />
                  </label>
                  <button onClick={analyze} disabled={busy || !duration} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />} 최적 루프 자동 찾기
                  </button>
                  {cands.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {cands.map((c, i) => (
                        <button key={i} disabled={busy} onClick={() => applyCandidate(c)} className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs hover:bg-neutral-100">
                          후보 {i + 1} · {(c.score * 100).toFixed(0)}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {showSegment && (
                <div className="space-y-2 rounded-xl bg-neutral-50 p-3">
                  <p className="flex items-center gap-1 text-xs font-bold text-neutral-700"><Scissors size={13} /> 시작·종료 미세 조정 (0.01초)</p>
                  <label className="block text-xs text-neutral-600">시작 {fmt(start)}
                    <input type="range" min={0} max={Math.max(0, duration)} step={0.01} value={start} onChange={(e) => { const v = +e.target.value; setStart(v); if (videoRef.current) videoRef.current.currentTime = v; }} className="w-full" />
                  </label>
                  <label className="block text-xs text-neutral-600">종료 {fmt(end)}
                    <input type="range" min={0} max={Math.max(0, duration)} step={0.01} value={end} onChange={(e) => setEnd(+e.target.value)} className="w-full" />
                  </label>
                  <p className="text-xs text-neutral-500">구간 길이 {fmt(Math.max(0, end - start))}</p>
                </div>
              )}

              {mode === "smart" && (
                <label className="block text-xs font-medium text-neutral-700">크로스페이드 길이 {crossfade.toFixed(1)}초
                  <input type="range" min={MIN_CROSSFADE} max={MAX_CROSSFADE} step={0.1} value={crossfade} onChange={(e) => setCrossfade(+e.target.value)} className="w-full" />
                </label>
              )}

              {q && mode === "smart" && (
                <p className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                  루프 자연스러움 <b className={LEVEL_COLOR[q.level]}>{((score ?? 0) * 100).toFixed(0)}점 · {q.label}</b>
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {url && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-base font-bold text-neutral-900">3. 내보내기</h2>
          <div className="flex flex-wrap items-end gap-5">
            <label className="text-xs font-medium text-neutral-700">반복 횟수 (1~200)
              <input type="number" min={1} max={200} value={repeat} disabled={format === "gif"} onChange={(e) => setRepeat(+e.target.value || 1)} className="mt-1 block w-24 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
            </label>
            <div className="text-xs font-medium text-neutral-700">형식
              <div className="mt-1 flex gap-1">
                {(["mp4", "webm", "gif"] as OutFormat[]).map((f) => (
                  <button key={f} onClick={() => setFormat(f)} className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${format === f ? "border-blue-600 bg-blue-600 text-white" : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}>{f.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              {format === "gif" ? "GIF는 재생기에서 무한 반복되어 1회분만 저장하며 소리는 들어가지 않습니다" : hasAudio ? "소리가 있는 영상은 소리도 함께 이어집니다" : "예상 총 재생 시간"} · 총 {total.toFixed(1)}초
            </p>
            <button onClick={onRender} disabled={busy || !duration} className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Repeat size={16} />} 무한루프 만들기
            </button>
          </div>
          {busy && status && (
            <div className="mt-4">
              <p className="text-sm text-neutral-700">{status}{ratio !== undefined ? ` ${Math.round(ratio * 100)}%` : "…"}</p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-blue-600 transition-all" style={{ width: `${Math.round((ratio ?? 0.05) * 100)}%` }} /></div>
              <button onClick={() => { cancelRef.current = true; }} className="mt-2 text-xs text-neutral-500 underline">분석 취소</button>
            </div>
          )}
          {result && (
            <div className="mt-5 space-y-3">
              {result.ext === "gif" ? <img src={result.url} alt="결과 GIF" className="max-h-96 rounded-xl border border-neutral-200" />
                : <video src={result.url} controls loop muted playsInline className="max-h-96 rounded-xl bg-black" />}
              <a href={result.url} download={`infinite-loop.${result.ext}`} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                <Download size={16} /> 다운로드 ({(result.size / 1024 / 1024).toFixed(1)}MB)
              </a>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
