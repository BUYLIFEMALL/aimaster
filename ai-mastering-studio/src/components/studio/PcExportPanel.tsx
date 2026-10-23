"use client";

// v1.14 「⚡ 내 PC로 저장」 — 마스터된 WAV를 회원 PC ffmpeg(AIMaster 내 PC 고속 변환)로 MP3·AAC·FLAC·WAV24로 저장 + 스트리밍 기준 음량 맞춤.
// 확장·실행기·ffmpeg가 없거나 옛 판이면 이유별 안내만 하고, 기존 WAV 내려받기는 그대로 쓴다. 파일은 PC 밖으로 나가지 않는다.
import { useEffect, useState } from "react";
import { Download, Loader2, RefreshCw, Zap } from "lucide-react";
import { PC_RENDERER_GUIDE_URL, detectPcRenderer, runPcJob, type PcRendererStatus } from "@/lib/pcRenderer";
import { PC_AUDIO_FORMATS, STREAMING_TARGET, audioReport, buildAudioCommand, withExt, type PcAudioFormat, type PcAudioReport } from "@/lib/pcAudio";

const fmt = (v: number | null, unit: string) => (v === null ? "-" : `${v.toFixed(1)} ${unit}`);

export function PcExportPanel({ blob, fileName, duration, sampleRate, disabled }: { blob: Blob; fileName: string; duration?: number; sampleRate?: number; disabled?: boolean }) {
  const [status, setStatus] = useState<PcRendererStatus | "checking">("checking");
  const [format, setFormat] = useState<PcAudioFormat>("mp3");
  const [normalize, setNormalize] = useState(true);
  const [busy, setBusy] = useState<number | null>(null); // 진행률 0~1
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ url: string; name: string; report: PcAudioReport; normalized: boolean } | null>(null);

  const check = () => { setStatus("checking"); void detectPcRenderer("audio").then(setStatus); };
  useEffect(check, []);
  useEffect(() => { setDone((d) => { if (d) URL.revokeObjectURL(d.url); return null; }); setError(""); }, [blob]);
  useEffect(() => () => { if (done) URL.revokeObjectURL(done.url); }, [done]);

  const run = async () => {
    const f = PC_AUDIO_FORMATS.find((x) => x.value === format)!;
    const cmd = buildAudioCommand({ format, sampleRate: sampleRate === 48000 ? 48000 : 44100, normalize, duration });
    if (!cmd) return;
    setBusy(0); setError("");
    try {
      const { bytes, info } = await runPcJob(blob, cmd as { type: string }, { onUploaded: (r) => setBusy(r * 0.1), onProgress: (r) => setBusy(0.1 + r * 0.9) });
      const out = new Blob([bytes as BlobPart], { type: f.mime });
      const name = withExt(fileName, f.ext);
      setDone((d) => { if (d) URL.revokeObjectURL(d.url); return { url: URL.createObjectURL(out), name, report: audioReport(info), normalized: normalize }; });
    } catch (e) {
      setError(e instanceof Error ? e.message : "내 PC 변환에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const guide = <a href={PC_RENDERER_GUIDE_URL} target="_blank" rel="noreferrer" className="text-[#00f0ff] underline">설치 방법</a>;

  return (
    <section className="rounded-2xl border border-[#1e293b] bg-[#0d121f] p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-100"><Zap size={15} className="text-amber-300" aria-hidden="true" /> 내 PC로 저장 (MP3·AAC·FLAC·WAV24, 무료)</h3>
        <button type="button" onClick={check} disabled={status === "checking" || busy !== null} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[#1e293b] px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 disabled:opacity-40">
          <RefreshCw size={12} aria-hidden="true" /> 다시 확인
        </button>
      </div>

      {status === "checking" ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-400"><Loader2 size={13} className="animate-spin" aria-hidden="true" /> 내 PC 변환 도구를 확인하는 중…</p>
      ) : status.kind !== "ready" ? (
        <p className="text-xs leading-relaxed text-slate-400">
          {status.kind === "none" && <>크롬·엣지에 「AIMaster 내 PC 고속 변환」 확장을 설치하면 내 PC의 ffmpeg로 MP3·AAC·FLAC 저장과 스트리밍 기준 음량 맞춤을 무료로 할 수 있어요. {guide}</>}
          {status.kind === "no-host" && <>확장은 있지만 PC 실행기가 설치되지 않았습니다. {guide}을 따라 실행기를 설치한 뒤 「다시 확인」을 눌러 주세요.</>}
          {status.kind === "no-ffmpeg" && <>실행기는 있지만 PC에 ffmpeg가 없습니다. {guide}의 ffmpeg 설치 절을 따라 주세요.</>}
          {status.kind === "old" && <>PC 실행기가 옛 판이라 소리 저장을 모릅니다. {guide}에서 실행기를 다시 받아 설치해 주세요(GIF 변환은 그대로 됩니다).</>}
          {" "}지금은 위의 WAV 내려받기를 써 주세요.
        </p>
      ) : (
        <div className="space-y-2.5">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="저장 형식">
            {PC_AUDIO_FORMATS.map((f) => (
              <button key={f.value} type="button" role="radio" aria-checked={format === f.value} disabled={busy !== null} onClick={() => setFormat(f.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${format === f.value ? "border-[#00f0ff] bg-[#00f0ff]/10 text-[#00f0ff]" : "border-[#1e293b] text-slate-300 hover:border-[#334155]"}`}>
                {f.label}
              </button>
            ))}
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={normalize} disabled={busy !== null} onChange={(e) => setNormalize(e.target.checked)} className="mt-0.5" />
            <span>유튜브·스트리밍 기준 음량으로 맞추기(통합 -{STREAMING_TARGET.lufs} LUFS, 최대 -{STREAMING_TARGET.tp} dBTP) — 플랫폼이 소리를 줄이거나 키우지 않게 합니다.</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void run()} disabled={disabled || busy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">
              {busy !== null ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Zap size={14} aria-hidden="true" />}
              {busy !== null ? `내 PC에서 만드는 중 ${Math.round(busy * 100)}%` : "내 PC로 만들기"}
            </button>
            <span className="text-[11px] text-slate-500">{status.os === "mac" ? "맥" : status.os === "windows" ? "윈도우" : "PC"} · ffmpeg {status.ffmpegVersion}</span>
          </div>
          {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
          {done && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-2.5 text-xs text-slate-200">
              <a href={done.url} download={done.name} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 font-bold text-emerald-200 hover:bg-emerald-500/30">
                <Download size={13} aria-hidden="true" /> {done.name}
              </a>
              <span>
                음량 {fmt(done.report.inputI, "LUFS")} · 최대 {fmt(done.report.inputTP, "dBTP")}
                {done.normalized && done.report.outputI !== null ? <> → <b className="text-emerald-200">{fmt(done.report.outputI, "LUFS")} · 최대 {fmt(done.report.outputTP, "dBTP")}</b></> : null}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
