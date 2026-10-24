"use client";

// v1.14 「⚡ 내 PC로 저장」 — 이 곡을 회원 PC ffmpeg(AIMaster 내 PC 고속 변환)로 MP3·AAC·FLAC·WAV24로 저장 + 스트리밍 기준 음량 맞춤.
// 공용 기준 코드 사본 pc-renderer-client(@/lib/pcRenderer)·pc-audio-command(@/lib/pcAudio) 사용. 로드맵 docs/analysis-pc-renderer-20261024/ROADMAP.md 5단계.
// 곡 파일은 브라우저가 받아 PC 실행기로만 넘긴다(서버 저장·AI 호출 없음). 확장·실행기가 없으면 설치 안내.
import { useEffect, useState } from "react";
import { Download, Loader2, Zap } from "lucide-react";
import { PC_RENDERER_GUIDE_URL, detectPcRenderer, runPcJob, type PcRendererStatus } from "@/lib/pcRenderer";
import { PC_AUDIO_FORMATS, STREAMING_TARGET, audioReport, buildAudioCommand, type PcAudioFormat, type PcAudioReport } from "@/lib/pcAudio";

const fmt = (v: number | null, unit: string) => (v === null ? "-" : `${v.toFixed(1)} ${unit}`);
const safeName = (s: string) => (s.replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "song");

export function PcSaveButton({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<PcRendererStatus | "checking">("checking");
  const [format, setFormat] = useState<PcAudioFormat>("mp3");
  const [normalize, setNormalize] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ url: string; name: string; report: PcAudioReport; normalized: boolean } | null>(null);

  useEffect(() => { if (open && status === "checking") void detectPcRenderer("audio").then(setStatus); }, [open, status]);
  useEffect(() => () => { if (done) URL.revokeObjectURL(done.url); }, [done]);

  const run = async () => {
    const f = PC_AUDIO_FORMATS.find((x) => x.value === format)!;
    setBusy(0); setError("");
    let source: Blob;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      source = await res.blob();
    } catch {
      setBusy(null);
      setError("곡 파일을 받지 못했습니다. 화면을 새로고침한 뒤 다시 시도해 주세요(재생 주소는 1시간 동안만 열립니다).");
      return;
    }
    const cmd = buildAudioCommand({ format, sampleRate: 44100, normalize });
    try {
      const { bytes, info } = await runPcJob(source, cmd as { type: string }, { onUploaded: (r) => setBusy(r * 0.15), onProgress: (r) => setBusy(0.15 + r * 0.85) });
      const out = new Blob([bytes as BlobPart], { type: f.mime });
      setDone((d) => { if (d) URL.revokeObjectURL(d.url); return { url: URL.createObjectURL(out), name: `${safeName(title)}.${f.ext}`, report: audioReport(info), normalized: normalize }; });
    } catch (e) {
      setError(e instanceof Error ? e.message : "내 PC 변환에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const guide = <a href={PC_RENDERER_GUIDE_URL} target="_blank" rel="noreferrer" className="text-violet-300 underline">설치 방법</a>;

  return (
    <div className={open ? "w-full" : ""}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-amber-300 hover:underline">
        <Zap className="h-3.5 w-3.5" aria-hidden="true" /> 내 PC로 저장(MP3·FLAC)
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-300">
          {status === "checking" ? (
            <p className="flex items-center gap-1.5 text-zinc-400"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> 내 PC 변환 도구를 확인하는 중…</p>
          ) : status.kind !== "ready" ? (
            <p className="leading-relaxed text-zinc-400">
              {status.kind === "none" && <>크롬·엣지에 「AIMaster 내 PC 고속 변환」 확장을 설치하면 내 PC의 ffmpeg로 MP3·FLAC 저장과 스트리밍 기준 음량 맞춤을 무료로 할 수 있어요. {guide}</>}
              {status.kind === "no-host" && <>확장은 있지만 PC 실행기가 없습니다. {guide}을 따라 설치한 뒤 다시 열어 주세요.</>}
              {status.kind === "no-ffmpeg" && <>PC에 ffmpeg가 없습니다. {guide}의 ffmpeg 설치 절을 따라 주세요.</>}
              {status.kind === "old" && <>PC 실행기가 옛 판이라 소리 저장을 모릅니다. {guide}에서 실행기를 다시 받아 주세요.</>}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="저장 형식">
                {PC_AUDIO_FORMATS.map((f) => (
                  <button key={f.value} type="button" role="radio" aria-checked={format === f.value} disabled={busy !== null} onClick={() => setFormat(f.value)}
                    className={`rounded-lg border px-2.5 py-1 transition ${format === f.value ? "border-violet-400 bg-violet-500/15 text-violet-200" : "border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={normalize} disabled={busy !== null} onChange={(e) => setNormalize(e.target.checked)} className="mt-0.5" />
                <span>유튜브·스트리밍 기준 음량으로 맞추기(-{STREAMING_TARGET.lufs} LUFS, 최대 -{STREAMING_TARGET.tp} dBTP)</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void run()} disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 font-bold text-zinc-950 disabled:opacity-50">
                  {busy !== null ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Zap className="h-3.5 w-3.5" aria-hidden="true" />}
                  {busy !== null ? `만드는 중 ${Math.round(busy * 100)}%` : "내 PC로 만들기"}
                </button>
                <span className="text-[11px] text-zinc-500">{status.os === "mac" ? "맥" : status.os === "windows" ? "윈도우" : "PC"} · ffmpeg {status.ffmpegVersion}</span>
              </div>
            </>
          )}
          {error && <p role="alert" className="text-red-300">{error}</p>}
          {done && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2">
              <a href={done.url} download={done.name} className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2.5 py-1 font-bold text-emerald-200 hover:bg-emerald-500/30">
                <Download className="h-3.5 w-3.5" aria-hidden="true" /> {done.name}
              </a>
              <span>음량 {fmt(done.report.inputI, "LUFS")}{done.normalized && done.report.outputI !== null ? <> → <b className="text-emerald-200">{fmt(done.report.outputI, "LUFS")} · 최대 {fmt(done.report.outputTP, "dBTP")}</b></> : null}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
