"use client";

// V2 해설 교차편집(2026-11-06): 내 해설 녹음 1개 + 내 촬영본 여러 개 → 해설을 본인 OpenAI 키로 받아쓰기 → 문장마다 촬영본을 번갈아 배치
// → 영상 합치기(브라우저 렌더)로 넘겨 해설이 깔린 세로 MP4. 영상·녹음은 서버에 올리지 않는다(소리만 잠깐, 받아쓰기 뒤 삭제).
// 플랜 docs/PLAN_20261106_V2_V5_OWN_CONTENT.md §2. 받아쓰기·소리 뽑기는 V1(ClipStudio)과 같은 길을 쓴다.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Sparkles, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cleanSegments, encodeWav, findSilences, type Seg } from "@/lib/clip/clipPlan";
import { MAX_FOOTAGE, MAX_NARRATION_S, MAX_SCENES, crossCutSeconds, limitSegs, planCrossCut } from "@/lib/clip/crossCut";
import { setClipHandoff } from "@/lib/clip/handoff";

const BUCKET_NAME = "ai-video-studio";
const MAX_FILE_BYTES = 200 * 1024 * 1024;
const RATE = 16000;
const smallBtn = "inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-sky-500/60 disabled:cursor-not-allowed disabled:opacity-50";
const mainBtn = "inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50";
const sec = (n: number) => `${Math.round(n * 10) / 10}초`;
const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

type Footage = { file: File; url: string; duration: number };

/** 녹음·영상 파일에서 16kHz 모노 소리 — 이 브라우저 안에서만 */
async function extractMono(file: File): Promise<{ samples: Float32Array; duration: number }> {
  const ctx = new OfflineAudioContext(1, 1, RATE);
  let buf: AudioBuffer;
  try {
    buf = await ctx.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error("이 파일에서 소리를 읽지 못했습니다. MP3·M4A·WAV 녹음이나 소리가 있는 MP4로 다시 시도해 주세요.");
  }
  const samples = new Float32Array(buf.length);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < ch.length; i++) samples[i] += ch[i] / buf.numberOfChannels;
  }
  return { samples, duration: buf.duration };
}

function readDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    const timer = setTimeout(() => resolve(0), 8000);
    v.onloadedmetadata = () => { clearTimeout(timer); resolve(Number.isFinite(v.duration) ? v.duration : 0); };
    v.onerror = () => { clearTimeout(timer); resolve(0); };
    v.src = url;
  });
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "요청에 실패했습니다. 잠시 뒤 다시 시도해 주세요.");
  return j as T;
}

export function NarrateStudio() {
  const router = useRouter();
  const [narration, setNarration] = useState<File | null>(null);
  const [narrationUrl, setNarrationUrl] = useState("");
  const [footage, setFootage] = useState<Footage[]>([]);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [segs, setSegs] = useState<Seg[]>([]);
  const [order, setOrder] = useState<number[]>([]);

  useEffect(() => () => { if (narrationUrl) URL.revokeObjectURL(narrationUrl); }, [narrationUrl]);
  useEffect(() => () => { footage.forEach((f) => URL.revokeObjectURL(f.url)); }, [footage]);

  const scenes = useMemo(() => planCrossCut(segs, footage.map((f) => f.duration), order), [segs, footage, order]);

  function onNarration(f: File | undefined) {
    setError("");
    if (!f) return;
    if (!f.type.startsWith("audio/") && !f.type.startsWith("video/")) return setError("녹음 파일(MP3·M4A·WAV)이나 소리가 있는 영상(MP4)만 넣을 수 있습니다.");
    if (f.size > MAX_FILE_BYTES) return setError("200MB가 넘는 파일은 넣을 수 없습니다.");
    setNarration(f);
    setNarrationUrl(URL.createObjectURL(f));
    setSegs([]); setOrder([]);
  }

  async function addFootage(files: FileList | null) {
    setError("");
    if (!files?.length) return;
    const next: Footage[] = [];
    for (const f of Array.from(files)) {
      if (footage.length + next.length >= MAX_FOOTAGE) { setError(`촬영본은 ${MAX_FOOTAGE}개까지 넣을 수 있습니다.`); break; }
      if (!f.type.startsWith("video/")) { setError(`「${f.name}」은 영상 파일이 아니라 넣지 않았습니다.`); continue; }
      if (f.size > MAX_FILE_BYTES) { setError(`「${f.name}」은 200MB가 넘어 넣지 않았습니다.`); continue; }
      const url = URL.createObjectURL(f);
      const duration = await readDuration(url);
      if (!duration) { URL.revokeObjectURL(url); setError(`「${f.name}」의 길이를 읽지 못해 넣지 않았습니다(MP4·MOV·WEBM).`); continue; }
      next.push({ file: f, url, duration });
    }
    if (next.length) setFootage((cur) => [...cur, ...next]);
  }

  function removeFootage(i: number) {
    setFootage((cur) => { URL.revokeObjectURL(cur[i].url); return cur.filter((_, j) => j !== i); });
    setOrder([]);
  }

  async function analyze() {
    if (!narration || footage.length < 2) return;
    setError("");
    try {
      setBusy("실행 기록을 남기는 중…");
      await postJson("/api/clip/rights", { tool: "narration-cut", fileName: narration.name, rights: true });
      setBusy("해설에서 소리를 뽑는 중…(내 PC에서)");
      const { samples, duration } = await extractMono(narration);
      if (duration > MAX_NARRATION_S + 1) throw new Error(`해설이 ${clock(duration)}입니다. 3분 이하 녹음을 넣어 주세요(영상 합치기 상한).`);
      const sil = findSilences(samples, RATE);
      setBusy("소리를 올리는 중…(받아쓰기 뒤 바로 지웁니다)");
      const up = await postJson<{ path: string; token: string }>("/api/clip/upload");
      const wav = new Blob([encodeWav(samples, RATE) as BlobPart], { type: "audio/wav" });
      const { error: upErr } = await createClient().storage.from(BUCKET_NAME).uploadToSignedUrl(up.path, up.token, wav, { contentType: "audio/wav" });
      if (upErr) throw new Error("소리를 올리지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      setBusy(`해설을 받아쓰는 중…(${clock(duration)} 분량, 보통 10초~1분)`);
      const tr = await postJson<{ segments: Seg[] }>("/api/clip/transcribe", { path: up.path });
      const clean = limitSegs(cleanSegments(tr.segments, sil));
      if (!clean.length) throw new Error("받아쓴 문장이 없습니다. 말소리가 있는 녹음인지 확인해 주세요.");
      setSegs(clean);
      setOrder([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석하지 못했습니다.");
    } finally {
      setBusy("");
    }
  }

  function setSceneFile(i: number, file: number) {
    setOrder((cur) => {
      const next = scenes.map((s, j) => (cur[j] ?? s.file));
      next[i] = file;
      return next;
    });
  }

  function toEdit() {
    if (!narration || !scenes.length) return;
    setClipHandoff({ kind: "narrate", narration, footage: footage.map((f) => f.file), scenes });
    router.push("/edit?from=clip");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white"><Mic className="h-6 w-6 text-sky-300" aria-hidden="true" /> 해설 교차편집</h1>
        <p className="text-sm text-zinc-400">내가 녹음한 해설 한 개와 내가 찍은 촬영본 여러 개를 넣으면, 해설을 받아써서 문장마다 촬영본을 번갈아 보여 주는 영상으로 배치해 드립니다. 해설은 그대로 깔리고 자막은 문장입니다. 파일은 서버에 올리지 않습니다.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      {busy && <p role="status" className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {busy}</p>}

      <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="text-sm font-bold text-white">1. 해설 녹음 넣기 <span className="font-normal text-zinc-500">— 3분 이하, 말소리만 있는 녹음이 좋습니다</span></h2>
        <label className={smallBtn}>
          <Upload className="h-3.5 w-3.5" aria-hidden="true" /> 녹음 파일 고르기
          <input type="file" accept="audio/*,video/*" hidden disabled={!!busy} onChange={(e) => { onNarration(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {narration && <span className="ml-2 text-xs text-zinc-400">{narration.name} · {(narration.size / 1024 / 1024).toFixed(1)}MB</span>}
        {narrationUrl && <audio src={narrationUrl} controls className="w-full" />}
      </section>

      <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="text-sm font-bold text-white">2. 촬영본 넣기 <span className="font-normal text-zinc-500">— 2~{MAX_FOOTAGE}개, 문장마다 번갈아 나옵니다</span></h2>
        <label className={smallBtn}>
          <Upload className="h-3.5 w-3.5" aria-hidden="true" /> 영상 여러 개 고르기
          <input type="file" accept="video/*" multiple hidden disabled={!!busy} onChange={(e) => { void addFootage(e.target.files); e.target.value = ""; }} />
        </label>
        {footage.length > 0 && (
          <ol className="grid gap-2 sm:grid-cols-2">
            {footage.map((f, i) => (
              <li key={f.url} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200">
                <video src={f.url} muted playsInline className="h-14 w-10 shrink-0 rounded bg-black object-cover" />
                <span className="min-w-0 flex-1"><b className="text-sky-300">{i + 1}</b> · <span className="truncate">{f.file.name}</span> · {sec(f.duration)}</span>
                <button type="button" aria-label={`${i + 1}번 촬영본 빼기`} disabled={!!busy} onClick={() => removeFootage(i)} className="rounded-lg p-1 text-zinc-400 hover:text-rose-300 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ol>
        )}
        <label className="flex items-start gap-2 text-xs text-zinc-300">
          <input type="checkbox" className="mt-0.5" checked={rights} onChange={(e) => setRights(e.target.checked)} />
          해설과 촬영본 모두 제가 만들었거나 쓸 권리가 있는 것입니다. 다른 사람의 녹음·영상은 넣지 않습니다. (실행할 때마다 파일 이름과 시각이 내 기록으로 남고 30일 뒤 지워집니다)
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={mainBtn} disabled={!narration || footage.length < 2 || !rights || !!busy} onClick={() => void analyze()}><Sparkles className="h-4 w-4" aria-hidden="true" /> 받아쓰고 컷 배치하기</button>
          <span className="text-[11px] text-zinc-500">본인 OpenAI 키로 받아쓰기(3분 약 25원). 다른 AI 호출은 없습니다.</span>
        </div>
      </section>

      {scenes.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="text-sm font-bold text-white">3. 컷 배치 확인 <span className="font-normal text-zinc-500">— 장면 {scenes.length}개 · 약 {sec(crossCutSeconds(scenes))}{segs.length >= MAX_SCENES ? ` · 문장이 많아 ${MAX_SCENES}개로 합쳤습니다` : ""}</span></h2>
          <ol className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs">
            {scenes.map((s, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded px-1.5 py-1 text-zinc-100">
                <span className="shrink-0 font-mono text-zinc-500">{clock(s.at)}</span>
                <select className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-sky-200" value={s.file} disabled={!!busy} onChange={(e) => setSceneFile(i, Number(e.target.value))} aria-label={`${i + 1}번 장면 촬영본`}>
                  {footage.map((f, j) => <option key={f.url} value={j}>촬영본 {j + 1}</option>)}
                </select>
                <span className="shrink-0 text-zinc-500">{sec(s.seconds)}{s.hold > 0 ? " · 반복" : ""}</span>
                <span className="min-w-0 flex-1">{s.caption}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={mainBtn} disabled={!!busy} onClick={toEdit}><Mic className="h-4 w-4" aria-hidden="true" /> 영상 합치기에서 세로 MP4 만들기</button>
          </div>
          <p className="text-[11px] text-zinc-500">영상 합치기 화면에 촬영본 장면과 해설(소리 칸, 음량 100%)이 들어갑니다. 자막 모양·비율을 바꾸고 「MP4 만들기」를 누르면 됩니다. 새로고침하면 넘긴 파일이 사라지니 이 탭에서 이어서 해 주세요.</p>
        </section>
      )}
    </div>
  );
}
