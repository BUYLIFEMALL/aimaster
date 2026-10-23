"use client";

import { useEffect, useState } from "react";
import { usePeaks } from "./usePeaks";
import { Pause, Play } from "lucide-react";
import { usePlayer, type Track } from "./PlayerProvider";
import { Waveform } from "./Waveform";
import { styleOf } from "@/lib/providerStyle";

// v1.11 곡 카드 안의 한 곡 — 재생 버튼 + 파형 막대. 아래 미니 플레이어로 재생하고, 플레이어가 없으면 기존 재생기를 보여 준다.
export function TrackRow({ track }: { track: Track }) {
  const p = usePlayer();
  const register = p?.register;
  useEffect(() => (register ? register(track) : undefined), [register, track.key, track.url]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = p?.current?.key === track.key;
  // v1.12 한 번 재생한 곡만 실제 소리 막대를 계산(곡 파일을 한 번 더 받음)
  const [played, setPlayed] = useState(false);
  useEffect(() => { if (mine) setPlayed(true); }, [mine]);
  const peaks = usePeaks(track.key, track.url, played, 36);
  if (!p) return <audio controls preload="none" src={track.url} className="w-full" />;
  const on = mine && p.playing;
  const st = styleOf(track.provider);
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-2.5 py-2 transition-colors ${mine ? "border-cyan-400/30 bg-cyan-400/5" : "border-zinc-800 bg-zinc-950/60"}`}>
      <button type="button" onClick={() => p.toggle(track)} aria-label={on ? `${track.title} 일시정지` : `${track.title} 재생`}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors ${on ? "bg-cyan-500 hover:bg-cyan-400" : "bg-violet-500 hover:bg-violet-400"}`}>
        {on ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="ml-0.5 h-4 w-4" aria-hidden="true" />}
      </button>
      <Waveform seed={track.key} color={on ? "bg-cyan-400" : st.bar} active={on} peaks={peaks}
        progress={mine && p.duration > 0 ? p.time / p.duration : peaks ? 1 : 0} />
    </div>
  );
}
