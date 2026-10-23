"use client";

// v1.25 곡 파형 그림 — 소리 크기 막대(SVG)와 선택적으로 장면이 바뀌는 시각(세로선)·장면 번호. 서버·AI 비용 없음.
import { computePeaks } from "@/lib/music/waveform";

export const WAVE_BUCKETS = 160;

/** 곡 파일을 회원 브라우저에서 풀어 파형 값을 만든다(실패하면 null) */
export async function decodePeaks(blob: Blob, buckets = WAVE_BUCKETS): Promise<number[] | null> {
  try {
    const audio = await new OfflineAudioContext(1, 1, 22050).decodeAudioData(await blob.arrayBuffer());
    return computePeaks(audio.getChannelData(0), buckets);
  } catch {
    return null;
  }
}

export function Waveform({ peaks, duration, marks = [], label }: { peaks: number[]; duration: number | null; marks?: number[]; label?: string }) {
  const n = peaks.length || 1;
  const H = 48;
  const okMarks = duration && duration > 0 ? marks.filter((t) => t > 0 && t < duration) : [];
  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${n} ${H}`} preserveAspectRatio="none" className="h-12 w-full rounded-lg bg-slate-950/70" role="img" aria-label={label ?? "곡 파형"}>
        {peaks.map((p, i) => {
          const h = Math.max(1, p * (H - 4));
          return <rect key={i} x={i + 0.15} y={(H - h) / 2} width={0.7} height={h} className="fill-cyan-400/70" />;
        })}
        {okMarks.map((t, i) => {
          const x = (t / (duration as number)) * n;
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={0} y2={H} className="stroke-pink-400" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
      </svg>
      {okMarks.length > 0 && (
        <figcaption className="text-[11px] text-slate-400">
          분홍 세로선 = 장면이 바뀌는 시각({okMarks.map((t) => `${t.toFixed(1)}초`).join(" · ")})
        </figcaption>
      )}
    </figure>
  );
}
