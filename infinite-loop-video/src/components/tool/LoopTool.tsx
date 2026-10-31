"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CircleHelp,
  Download,
  Loader2,
  Repeat,
  Scissors,
  UploadCloud,
  Wand2,
  Zap,
  Sparkles,
  Layers,
  Activity,
  CheckCircle2
} from "lucide-react";
import { buildMatrix, findLoops, qualityLabel, refinePair, type LoopCandidate } from "@/lib/loop/analysis";
import { extractFeatures, renderLoop } from "@/lib/loop/browser";
import { MAX_CROSSFADE, MIN_CROSSFADE, normalize, totalLength, type LoopMode, type OutFormat } from "@/lib/loop/plan";
import { detectPcRenderer, PC_RENDERER_GUIDE_URL, runPcJob, type PcRendererStatus } from "@/lib/pcRenderer";

const SAMPLE_FPS = 8;
const MAX_ANALYZE_SEC = 60;
const MAX_BYTES = 200 * 1024 * 1024;
const MODES: { id: LoopMode; name: string; desc: string }[] = [
  { id: "smart", name: "스마트 시임리스 루프", desc: "앞뒤 프레임의 시각적 일치점(SSIM)을 찾아 가장 매끄럽게 연결합니다 (강력 추천)" },
  { id: "overlap", name: "오버랩 디졸브 모드", desc: "분석 없이 영상 전체의 끝 0.6초를 앞 프레임과 자연스럽게 겹쳐 녹여냅니다" },
  { id: "bounce", name: "핑퐁 리버스 바운스", desc: "정방향 후 역방향으로 되돌아와 어떤 영상이든 100% 끊김 없는 루프를 만듭니다" },
];
const LEVEL_COLOR = {
  excellent: "text-emerald-700 bg-emerald-50 border-emerald-200",
  good: "text-emerald-700 bg-emerald-50 border-emerald-200",
  fair: "text-amber-800 bg-amber-50 border-amber-200",
  poor: "text-red-700 bg-red-50 border-red-200"
} as const;

const fmt = (s: number) => `${s.toFixed(2)}초`;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

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
  const [result, setResult] = useState<{ url: string; size: number; ext: string; engine: "pc" | "browser"; seconds: number } | null>(null);

  const [pc, setPc] = useState<PcRendererStatus | null>(null);
  const [usePc, setUsePc] = useState(true);
  const [notice, setNotice] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const matrixRef = useRef<Float32Array[] | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);
  useEffect(() => { detectPcRenderer("loop").then(setPc).catch(() => setPc({ kind: "none" })); }, []);

  const params = useMemo(
    () => ({ mode, start, end, crossfade, repeat, duration, hasAudio, format }),
    [mode, start, end, crossfade, repeat, duration, hasAudio, format]
  );
  const norm = normalize(params);
  const total = format === "gif" ? (norm.mode === "bounce" ? (norm.end - norm.start) * 2 : norm.end - norm.start - norm.crossfade) : totalLength(params);

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
      setStatus("프레임을 나노 단위로 꼼꼼히 탐색하는 중"); setRatio(0);
      const feats = await extractFeatures(v, times, (d, t) => setRatio(d / t), () => cancelRef.current);
      setStatus("최적의 시임리스 일치 구간(SSIM)을 분석하는 중"); setRatio(undefined);
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
    setStatus("연결 경계를 정밀하게 맞추는 중"); setRatio(undefined);
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
    setBusy(true); setError(""); setResult(null); setNotice("");
    const t0 = performance.now();
    const secs = () => Math.round((performance.now() - t0) / 100) / 10;
    try {
      if (pc?.kind === "ready" && usePc) {
        try {
          const n = normalize(params);
          setStatus("내 PC 고속 렌더러로 영상 전송 중"); setRatio(0);
          const r = await runPcJob(file, { type: "loop", mode: n.mode, start: r3(n.start), end: r3(n.end), crossfade: r3(n.crossfade), repeat: n.repeat, format: n.format, duration: r3(n.duration) }, {
            onUploaded: (ra) => setRatio(ra),
            onProgress: (ra) => { setStatus("내 PC 하드웨어 가속으로 만드는 중"); setRatio(ra); },
          });
          const ext = String(r.info.ext ?? n.format);
          const mime = ext === "gif" ? "image/gif" : ext === "webm" ? "video/webm" : "video/mp4";
          const blob = new Blob([r.bytes as BlobPart], { type: mime });
          setResult({ url: URL.createObjectURL(blob), size: blob.size, ext, engine: "pc", seconds: secs() });
          return;
        } catch (e) {
          setNotice(`내 PC 변환이 일시 중단되어 브라우저 렌더러로 전환합니다(${(e as Error).message || "알 수 없는 오류"}).`);
        }
      }
      const r = await renderLoop(file, params, (msg, ra) => { setStatus(msg); setRatio(ra); });
      setResult({ url: URL.createObjectURL(r.blob), size: r.blob.size, ext: r.ext, engine: "browser", seconds: secs() });
    } catch (e) {
      setError((e as Error).message || "렌더링에 실패했습니다.");
    } finally { setBusy(false); setStatus(""); setRatio(undefined); }
  }

  const q = score !== null ? qualityLabel(score) : null;
  const showSegment = mode !== "overlap";

  return (
    <div className="space-y-6">
      {/* 1. 영상 소스 업로드 영역 (스튜디오 클린 슬레이트 NLE 랩 톤앤매너) */}
      <section className="lv-card">
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0] ?? null); }}
          className="mx-auto flex max-w-2xl cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center hover:border-amber-500 hover:bg-amber-50/20 transition-all"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-slate-200 text-amber-600 shadow-xs">
            <UploadCloud size={32} />
          </span>
          <span className="mt-2 text-xl font-black text-slate-900">
            {file ? file.name : "루프 제작용 비디오 업로드"}
          </span>
          <span className="text-sm font-medium text-slate-600">
            동영상 파일을 마우스로 끌어다 놓거나 클릭하여 선택하세요.
          </span>
          <span className="text-xs text-slate-500">
            MP4, WebM 지원 (최대 200MB, 5~30초 미만 세로 영상 권장) · 100% 기기 로컬 처리로 서버 유출 제로
          </span>
          
          <span className="mt-3 btn-3d-amber">
            📁 비디오 파일 선택
          </span>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
        </label>
        
        {error && (
          <p className="mt-3.5 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        {/* 3단계 파이프라인 카드 */}
        <div className="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-3">
          {[
            [UploadCloud, "1. 영상 업로드", "5~20초 분량의 숏폼 세로 영상을 선택합니다."],
            [Wand2, "2. SSIM 정밀 분석", "시작과 끝이 완벽 일치하는 나노 프레임을 찾습니다."],
            [Download, "3. 무한루프 완성", "끝없는 시청 지속률의 고화질 비디오를 다운로드합니다."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof UploadCloud;
            return (
              <div key={t as string} className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-4.5 text-center shadow-2xs">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-600 mb-2">
                  <I size={18} />
                </span>
                <p className="text-sm font-extrabold text-slate-900">{t as string}</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{d as string}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-center">
          <Link
            href="/guide"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <CircleHelp size={14} className="text-amber-600" />
            <span>숏폼 크리에이터를 위한 무한루프 공식 가이드북 열기</span>
          </Link>
        </div>
      </section>

      {/* 2. 비디오 뷰파인더 및 NLE 타임라인 정밀 분석 콘솔 */}
      {url && (
        <section className="lv-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Activity size={18} className="text-amber-600" />
              <span>2. 뷰파인더 모니터 및 타임라인 정합 설정</span>
            </h2>
            <span className="text-xs font-bold text-slate-500">
              전체 길이: {fmt(duration)} {hasAudio && "· 오디오 트랙 감지됨"}
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Video Preview & Similarity Waveform */}
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 shadow-md">
                <video
                  ref={videoRef}
                  src={url}
                  controls
                  muted
                  playsInline
                  onLoadedMetadata={onLoaded}
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget;
                    if (showSegment && end > start && v.currentTime >= end) v.currentTime = start;
                  }}
                  className="aspect-square w-full object-contain"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                * 뷰파인더 미리보기는 선택한 루프 구간(시작~끝)만 자동 반복합니다.
              </p>

              {/* 유사도 곡선 HUD (NLE 파형 그래프) */}
              {curve.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-600" />
                      <span>프레임 모션 벡터 일치도 곡선 (높을수록 무결점 연결)</span>
                    </span>
                    <span className="text-[11px] text-amber-700 font-extrabold">
                      현재 연결점: {fmt(end)}
                    </span>
                  </div>
                  <svg viewBox="0 0 300 60" className="h-16 w-full rounded-lg border border-slate-200 bg-white">
                    <polyline
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2"
                      points={curve.map((v, i) => `${(i / Math.max(1, curve.length - 1)) * 300},${58 - Math.max(0, (v - 0.5) / 0.5) * 56}`).join(" ")}
                    />
                    {duration > 0 && (
                      <line
                        x1={(end / Math.min(duration, MAX_ANALYZE_SEC)) * 300}
                        x2={(end / Math.min(duration, MAX_ANALYZE_SEC)) * 300}
                        y1="0"
                        y2="60"
                        stroke="#2563eb"
                        strokeWidth="2"
                        strokeDasharray="3 2"
                      />
                    )}
                  </svg>
                </div>
              )}
            </div>

            {/* Right: Loop Algorithm & Precision Timeline */}
            <div className="space-y-4">
              {/* 루프 모드 라디오 */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  루프 연결 방식
                </span>
                {MODES.map((m) => (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-all ${
                      mode === m.id
                        ? "border-amber-500 bg-amber-50/60 shadow-2xs"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === m.id}
                      onChange={() => setMode(m.id)}
                      className="mt-1 accent-amber-600"
                    />
                    <div>
                      <span className="block text-sm font-black text-slate-900">{m.name}</span>
                      <span className="text-xs text-slate-600 leading-snug mt-0.5 block">{m.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* 스마트 루프 자동 탐색기 */}
              {mode === "smart" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      최소 루프 길이 설정: <span className="text-amber-700 font-black">{minLen.toFixed(1)}초</span>
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">최대 30초 내 탐색</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={Math.max(1, Math.min(30, duration / 2))}
                    step={0.1}
                    value={minLen}
                    onChange={(e) => setMinLen(+e.target.value)}
                    className="w-full accent-amber-600"
                  />

                  <div className="pt-1 flex items-center justify-between">
                    <button
                      onClick={analyze}
                      disabled={busy || !duration}
                      className="btn-3d-amber py-2 text-xs"
                    >
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                      <span>최적 루프 자동 탐색</span>
                    </button>
                    {score !== null && (
                      <span className="text-xs font-extrabold text-amber-800">
                        SSIM 일치율: {((score ?? 0) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>

                  {cands.length > 1 && (
                    <div className="pt-2 border-t border-amber-200/60">
                      <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                        추천 루프 후보 프리셋:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cands.map((c, i) => (
                          <button
                            key={i}
                            disabled={busy}
                            onClick={() => applyCandidate(c)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-amber-500 hover:bg-amber-50 transition-colors shadow-2xs"
                          >
                            후보 {i + 1} ({(c.score * 100).toFixed(0)}%)
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 구간 미세 조정 슬라이더 */}
              {showSegment && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Scissors size={14} className="text-amber-600" />
                    <span>루프 시작·종료 프레임 미세 조정 (0.01초 단위)</span>
                  </p>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>시작 프레임 트리밍</span>
                      <span className="font-bold text-slate-900">{fmt(start)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, duration)}
                      step={0.01}
                      value={start}
                      onChange={(e) => {
                        const v = +e.target.value;
                        setStart(v);
                        if (videoRef.current) videoRef.current.currentTime = v;
                      }}
                      className="w-full accent-amber-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>종료 프레임 트리밍</span>
                      <span className="font-bold text-slate-900">{fmt(end)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, duration)}
                      step={0.01}
                      value={end}
                      onChange={(e) => setEnd(+e.target.value)}
                      className="w-full accent-amber-600"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs font-bold">
                    <span className="text-slate-500">순수 1회 루프 재생 시간</span>
                    <span className="text-amber-700">{fmt(Math.max(0, end - start))}</span>
                  </div>
                </div>
              )}

              {/* 크로스페이드 트랜지션 슬라이더 */}
              {mode === "smart" && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-bold text-slate-800">
                    <span>트랜지션 블렌딩 시간 (Crossfade)</span>
                    <span className="text-amber-700">{crossfade.toFixed(1)}초</span>
                  </div>
                  <input
                    type="range"
                    min={MIN_CROSSFADE}
                    max={MAX_CROSSFADE}
                    step={0.1}
                    value={crossfade}
                    onChange={(e) => setCrossfade(+e.target.value)}
                    className="w-full accent-amber-600"
                  />
                  <p className="text-[11px] text-slate-500">
                    권장 0.4초 ~ 0.8초: 앞뒤 영상이 부드럽게 겹쳐져 끊김이 사라집니다.
                  </p>
                </div>
              )}

              {q && mode === "smart" && (
                <div className={`rounded-xl border px-3.5 py-2.5 text-xs font-bold flex items-center justify-between ${LEVEL_COLOR[q.level]}`}>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={15} />
                    <span>루프 자연스러움 품질 지수</span>
                  </span>
                  <span>{((score ?? 0) * 100).toFixed(0)}점 · {q.label}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 3. 내보내기 및 렌더링 콘솔 */}
      {url && (
        <section id="render" className="lv-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Zap size={18} className="text-amber-600" />
              <span>3. 9:16 쇼츠 렌더링 및 다운로드</span>
            </h2>
            <span className="text-xs font-bold text-slate-500">
              GPU 가속 지원
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-5">
            {/* 반복 횟수 */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                무한 반복 횟수 (1~200회)
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={repeat}
                disabled={format === "gif"}
                onChange={(e) => setRepeat(+e.target.value || 1)}
                className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900 bg-white shadow-2xs focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            {/* 출력 포맷 */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                출력 포맷 선택
              </label>
              <div className="flex gap-1.5">
                {(["mp4", "webm", "gif"] as OutFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-extrabold transition-all ${
                      format === f
                        ? "border-amber-500 bg-amber-500 text-white shadow-2xs"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* 예상 재생 시간 */}
            <div className="flex-1 min-w-[200px]">
              <div className="text-xs text-slate-500 font-medium">
                {format === "gif"
                  ? "GIF는 이미지 뷰어에서 자동 무한 반복되므로 1회분만 저장됩니다 (음소거)."
                  : hasAudio
                  ? "영상 속 배경음악과 오디오도 루프 곡선에 맞춰 끊김 없이 이어집니다."
                  : "선택한 반복 횟수 기준 예상 총 런타임"}
              </div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                총 예상 시간: <span className="text-amber-600">{total.toFixed(1)}초</span>
              </div>
            </div>

            {/* 3D 엠보싱 렌더링 실행 버튼 */}
            <button
              onClick={onRender}
              disabled={busy || !duration}
              className="btn-3d-amber text-sm px-6 py-2.5"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Repeat size={16} />}
              <span>무한루프 비디오 렌더링</span>
            </button>
          </div>

          {/* PC 렌더러 / 브라우저 가속 감지 안내 */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            {pc?.kind === "ready" ? (
              <label className="inline-flex items-center gap-2 font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={usePc}
                  onChange={(e) => setUsePc(e.target.checked)}
                  className="accent-amber-600"
                />
                <Zap size={14} className="text-amber-600" aria-hidden="true" />
                <span>내 PC 고속 렌더러 활성화됨</span>
                <span className="text-slate-500 font-normal">
                  ({pc.os === "mac" ? "맥" : pc.os === "windows" ? "윈도우" : "PC"} · ffmpeg {pc.ffmpegVersion})
                </span>
              </label>
            ) : (
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Zap size={14} className="text-amber-600" aria-hidden="true" />
                <span>브라우저 내장 WebAssembly 엔진 가속으로 안전하게 렌더링합니다.</span>
              </span>
            )}
          </div>

          {notice && (
            <p role="status" className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800">
              {notice}
            </p>
          )}

          {/* 진행 상태 프로그레스 바 */}
          {busy && status && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>{status}</span>
                <span>{ratio !== undefined ? `${Math.round(ratio * 100)}%` : "진행 중…"}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-blue-600 transition-all duration-200"
                  style={{ width: `${Math.round((ratio ?? 0.05) * 100)}%` }}
                />
              </div>
              <button
                onClick={() => { cancelRef.current = true; }}
                className="text-xs text-slate-500 hover:text-red-600 underline cursor-pointer"
              >
                렌더링 취소
              </button>
            </div>
          )}

          {/* 완성된 결과물 뷰파인더 & 3D 다운로드 버튼 */}
          {result && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>무한루프 영상 제작 완료!</span>
                </h3>
                <span className="text-xs font-bold text-emerald-800">
                  {result.engine === "pc" ? "⚡ 내 PC 고속 렌더" : "브라우저 렌더"} · {result.seconds}초 소요
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="max-w-[280px] w-full rounded-xl overflow-hidden bg-black shadow-md">
                  {result.ext === "gif" ? (
                    <img src={result.url} alt="완성 루프 GIF" className="w-full object-contain" />
                  ) : (
                    <video
                      src={result.url}
                      controls
                      loop
                      autoPlay
                      muted
                      playsInline
                      className="w-full object-contain"
                    />
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <p className="text-xs font-medium text-slate-700 leading-relaxed">
                    선택하신 구간이 끊김 없이 매끄럽게 연결되었습니다. 아래 3D 다운로드 버튼을 눌러 소장하거나 유튜브 쇼츠 / 틱톡 / 인스타 릴스에 바로 업로드하세요.
                  </p>

                  <a
                    href={result.url}
                    download={`infinite-loop-${Date.now()}.${result.ext}`}
                    className="btn-3d-blue py-3 px-6 text-sm"
                  >
                    <Download size={16} />
                    <span>완성 영상 다운로드 ({(result.size / 1024 / 1024).toFixed(1)}MB)</span>
                  </a>

                  <p className="text-[11px] text-slate-500">
                    파일 형식: {result.ext.toUpperCase()} · 크기: {(result.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
