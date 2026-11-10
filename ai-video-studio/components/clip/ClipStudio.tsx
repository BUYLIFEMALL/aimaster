"use client";

// v1.27(V1) 긴 영상 → 쇼츠: 회원 본인 영상 → 소리만 뽑아 본인 키로 받아쓰기(v1.31 모델 선택: Gemini·Whisper) → AI 구간 고르기(본인 키) → 회원이 고침
// → 영상 합치기(브라우저 렌더)로 넘겨 세로 MP4. 영상은 서버에 올리지 않는다. 플랜 docs/PLAN_20261106_V1_LONG_TO_SHORTS.md
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Scissors, Sparkles, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_CLIP_S, MAX_SOURCE_S, MIN_CLIP_S, buildPieces, cleanSegments, encodeWav, findSilences, piecesSeconds, toEdl, toSrt,
  type Pick, type Seg, type Silence,
} from "@/lib/clip/clipPlan";
import { setClipHandoff } from "@/lib/clip/handoff";
import { TranscribeModelPicker, useTranscribeModel } from "@/components/clip/TranscribeModelPicker";

const BUCKET_NAME = "ai-video-studio";
const MAX_FILE_BYTES = 200 * 1024 * 1024;
const RATE = 16000;
const smallBtn = "inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-sky-500/60 disabled:cursor-not-allowed disabled:opacity-50";
const mainBtn = "inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50";
const sec = (n: number) => `${Math.round(n * 10) / 10}초`;
const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/** 영상 파일에서 16kHz 모노 소리 — 이 브라우저 안에서만(decodeAudioData가 컨텍스트 주파수로 바꿔 준다) */
async function extractMono(file: File): Promise<{ samples: Float32Array; duration: number }> {
  const ctx = new OfflineAudioContext(1, 1, RATE);
  let buf: AudioBuffer;
  try {
    buf = await ctx.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error("이 영상에서 소리를 읽지 못했습니다. 소리가 있는 MP4(H.264·AAC) 영상으로 다시 시도해 주세요.");
  }
  const samples = new Float32Array(buf.length);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < ch.length; i++) samples[i] += ch[i] / buf.numberOfChannels;
  }
  return { samples, duration: buf.duration };
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "요청에 실패했습니다. 잠시 뒤 다시 시도해 주세요.");
  return j as T;
}

export function ClipStudio() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const tm = useTranscribeModel();
  const [videoUrl, setVideoUrl] = useState("");
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [segs, setSegs] = useState<Seg[]>([]);
  const [silences, setSilences] = useState<Silence[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [model, setModel] = useState("");
  const [range, setRange] = useState<{ first: number; last: number } | null>(null);
  const [removeSilence, setRemoveSilence] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopAt = useRef<number | null>(null);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const pieces = useMemo(() => (range && segs.length ? buildPieces(segs, range.first, range.last, removeSilence) : []), [range, segs, removeSilence]);
  const rawLen = range ? segs[range.last].end - segs[range.first].start : 0;

  function onFile(f: File | undefined) {
    setError("");
    if (!f) return;
    if (!f.type.startsWith("video/")) return setError("영상 파일(MP4·MOV·WEBM)만 넣을 수 있습니다.");
    if (f.size > MAX_FILE_BYTES) return setError("200MB가 넘는 영상은 넣을 수 없습니다.");
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setSegs([]); setPicks([]); setRange(null); setSilences([]);
  }

  async function analyze() {
    if (!file) return;
    setError("");
    try {
      setBusy("영상에서 소리를 뽑는 중…(내 PC에서)");
      const { samples, duration } = await extractMono(file);
      if (duration > MAX_SOURCE_S + 1) throw new Error(`영상이 ${clock(duration)}입니다. 10분 이하 영상을 넣어 주세요.`);
      const sil = findSilences(samples, RATE);
      setSilences(sil);
      setBusy("소리를 올리는 중…(받아쓰기 뒤 바로 지웁니다)");
      const up = await postJson<{ path: string; token: string }>("/api/clip/upload");
      const wav = new Blob([encodeWav(samples, RATE) as BlobPart], { type: "audio/wav" });
      const { error: upErr } = await createClient().storage.from(BUCKET_NAME).uploadToSignedUrl(up.path, up.token, wav, { contentType: "audio/wav" });
      if (upErr) throw new Error("소리를 올리지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      setBusy(`말소리를 받아쓰는 중…(${clock(duration)} 분량, 보통 10초~1분)`);
      const tr = await postJson<{ segments: Seg[] }>("/api/clip/transcribe", { path: up.path, model: tm.model });
      const clean = cleanSegments(tr.segments, sil);
      if (clean.length < 2) throw new Error("받아쓴 문장이 너무 적습니다. 말소리가 있는 영상인지 확인해 주세요.");
      setSegs(clean);
      await pick(clean);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석하지 못했습니다.");
    } finally {
      setBusy("");
    }
  }

  async function pick(list = segs) {
    setError("");
    setBusy("AI가 쇼츠 구간을 고르는 중…");
    try {
      const r = await postJson<{ picks: Pick[]; model: string }>("/api/clip/pick", { segments: list });
      setPicks(r.picks); setModel(r.model);
      if (r.picks[0]) setRange({ first: r.picks[0].first, last: r.picks[0].last });
    } catch (e) {
      setError(e instanceof Error ? e.message : "구간을 고르지 못했습니다.");
    } finally {
      setBusy("");
    }
  }

  function preview() {
    const v = videoRef.current;
    if (!v || !range) return;
    v.currentTime = segs[range.first].start;
    stopAt.current = segs[range.last].end + 0.3;
    void v.play();
  }

  // v1.28(V2) 자막(SRT)·컷 목록(EDL) 내려받기 — 손편집 도구로 넘기는 출구
  function download(kind: "srt" | "edl") {
    const base = (file?.name ?? "shorts").replace(/\.[^.]+$/, "");
    const text = kind === "srt" ? toSrt(pieces) : toEdl(pieces.map((p) => ({ name: file?.name ?? "video.mp4", start: p.start, end: p.end })), `${base} 쇼츠`);
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}-쇼츠.${kind}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function toEdit() {
    if (!file || !pieces.length) return;
    setClipHandoff({ file, name: file.name, pieces });
    router.push("/edit?from=clip");
  }

  const setFirst = (v: number) => setRange((r) => (r ? { first: v, last: Math.max(v, r.last) } : r));
  const setLast = (v: number) => setRange((r) => (r ? { first: Math.min(v, r.first), last: v } : r));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><Scissors className="h-6 w-6 text-sky-300" aria-hidden="true" /> 긴 영상 → 쇼츠</h1>
        <p className="text-sm text-zinc-400">내가 찍은 긴 영상(10분 이하)을 넣으면 말소리를 받아써서 AI가 쇼츠로 쓸 구간을 골라 드립니다. 구간을 고친 뒤 영상 합치기에서 세로 MP4로 만듭니다. 영상은 서버에 올리지 않습니다.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      {busy && <p role="status" className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {busy}</p>}

      <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="text-sm font-bold text-white">1. 영상 넣기</h2>
        <label className={smallBtn}>
          <Upload className="h-3.5 w-3.5" aria-hidden="true" /> 영상 고르기
          <input type="file" accept="video/*" hidden disabled={!!busy} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {file && <span className="ml-2 text-xs text-zinc-400">{file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB</span>}
        {videoUrl && (
          <video ref={videoRef} src={videoUrl} controls className="max-h-72 w-full rounded-xl bg-black"
            onTimeUpdate={(e) => { if (stopAt.current !== null && e.currentTarget.currentTime >= stopAt.current) { e.currentTarget.pause(); stopAt.current = null; } }} />
        )}
        <label className="flex items-start gap-2 text-xs text-zinc-300">
          <input type="checkbox" className="mt-0.5" checked={rights} onChange={(e) => setRights(e.target.checked)} />
          내가 직접 찍었거나 쓸 권리가 있는 영상입니다. 다른 사람의 영상은 넣지 않습니다.
        </label>
        <TranscribeModelPicker model={tm.model} setModel={tm.setModel} registered={tm.registered} disabled={!!busy} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={mainBtn} disabled={!file || !rights || !!busy} onClick={() => void analyze()}><Sparkles className="h-4 w-4" aria-hidden="true" /> 받아쓰고 구간 고르기</button>
          <span className="text-[11px] text-zinc-500">위에서 고른 모델의 본인 키로 받아쓰기 + 본인 AI 키로 구간 고르기 1회(몇 원)</span>
        </div>
      </section>

      {segs.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-white">2. 쇼츠 구간 고르기 <span className="font-normal text-zinc-500">— {MIN_CLIP_S}~{MAX_CLIP_S}초{model ? ` · ${model}` : ""}</span></h2>
            <button type="button" className={smallBtn} disabled={!!busy} onClick={() => void pick()}>AI로 다시 고르기</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {picks.map((p, i) => (
              <button key={i} type="button" onClick={() => setRange({ first: p.first, last: p.last })}
                className={`rounded-xl border p-3 text-left text-xs ${range?.first === p.first && range?.last === p.last ? "border-sky-400 bg-sky-500/10" : "border-zinc-700 hover:border-sky-500/50"}`}>
                <div className="flex items-center justify-between gap-2"><strong className="text-sm text-white">{p.title || `구간 ${i + 1}`}</strong><span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-bold text-sky-200">{p.score}점</span></div>
                <div className="mt-1 text-zinc-400">{clock(segs[p.first].start)}~{clock(segs[p.last].end)} · {sec(segs[p.last].end - segs[p.first].start)}</div>
                {p.reason && <p className="mt-1 text-zinc-300">{p.reason}</p>}
              </button>
            ))}
          </div>
          {range && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                <label>시작 문장 <select className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-1" value={range.first} onChange={(e) => setFirst(Number(e.target.value))}>{segs.map((s, i) => <option key={i} value={i}>{clock(s.start)} {s.text.slice(0, 18)}</option>)}</select></label>
                <label>끝 문장 <select className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-1" value={range.last} onChange={(e) => setLast(Number(e.target.value))}>{segs.map((s, i) => <option key={i} value={i}>{clock(s.end)} {s.text.slice(0, 18)}</option>)}</select></label>
                <button type="button" className={smallBtn} onClick={preview}>▶ 원본에서 들어 보기</button>
              </div>
              {(rawLen < MIN_CLIP_S || rawLen > MAX_CLIP_S) && <p className="text-xs text-amber-300">지금 구간은 {sec(rawLen)}입니다. 쇼츠는 {MIN_CLIP_S}~{MAX_CLIP_S}초를 권합니다(그대로 만들 수는 있습니다).</p>}
              <ol className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs">
                {segs.map((s, i) => (
                  <li key={i} className={`flex gap-2 rounded px-1.5 py-1 ${i >= range.first && i <= range.last ? "bg-sky-500/10 text-zinc-100" : "text-zinc-500"}`}>
                    <span className="shrink-0 font-mono">{clock(s.start)}</span><span>{s.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      {pieces.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="text-sm font-bold text-white">3. 만들기</h2>
          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input type="checkbox" checked={removeSilence} onChange={(e) => setRemoveSilence(e.target.checked)} />
            말 사이 긴 무음 줄이기(1.2초 넘는 무음을 0.3초로) {silences.length > 0 && <span className="text-zinc-500">· 영상 전체 무음 {silences.length}곳</span>}
          </label>
          <p className="text-xs text-zinc-400">완성 길이 약 {sec(piecesSeconds(pieces))} · 장면 {pieces.length}개 · 자막은 문장 단위(세로 9:16, 원본 소리 그대로)</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={mainBtn} disabled={!!busy} onClick={toEdit}><Scissors className="h-4 w-4" aria-hidden="true" /> 영상 합치기에서 세로 MP4 만들기</button>
            <button type="button" className={smallBtn} onClick={() => download("srt")}><Download className="h-3.5 w-3.5" aria-hidden="true" /> 자막 파일(SRT)</button>
            <button type="button" className={smallBtn} title="프리미어·다빈치 리졸브에서 가져오면 컷이 맞춰집니다(원본 영상을 같은 폴더에). 캡컷은 SRT 자막만 가져올 수 있습니다." onClick={() => download("edl")}><Download className="h-3.5 w-3.5" aria-hidden="true" /> 컷 목록(EDL)</button>
          </div>
          <p className="text-[11px] text-zinc-500">영상 합치기 화면에서 자막 모양·배경음악을 바꾸고 「MP4 만들기」를 누르면 됩니다. 새로고침하면 넘긴 영상이 사라지니 이 탭에서 이어서 해 주세요.</p>
        </section>
      )}
    </div>
  );
}
