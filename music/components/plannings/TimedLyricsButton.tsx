"use client";

import { useState } from "react";
import { getTimedLyricsAction, type TimedLyricsState } from "@/lib/actions/timedLyrics";

// 타임스탬프 가사(2026-10-21 Suno V6 1차 기능). 곡 카드에서 Suno 단어별 시간을 받아 미리 보고 LRC·SRT 자막으로 내려받는다.
function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

function save(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function TimedLyricsButton({ variantId, title }: { variantId: string; title: string }) {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<TimedLyricsState | null>(null);
  const [open, setOpen] = useState(false);
  const safeName = title.replace(/[\\/:*?"<>|]/g, "").slice(0, 60) || "lyrics";

  async function load() {
    if (state?.lines) {
      setOpen((v) => !v);
      return;
    }
    setBusy(true);
    try {
      const res = await getTimedLyricsAction(variantId);
      setState(res);
      setOpen(true);
    } catch {
      setState({ error: "시간 가사를 받지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={load}
        disabled={busy}
        className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#2d2d3e] bg-[#20202e] text-zinc-300 hover:text-white hover:border-orange-500/40 hover:bg-[#28283a] disabled:opacity-50 transition-all flex items-center gap-1"
      >
        <span>🎤</span>
        <span>{busy ? "가사 시간 받는 중..." : "가사 타이밍(LRC·SRT)"}</span>
      </button>
      {open && state && (
        <div className="basis-full space-y-2 rounded-xl border border-[#2a2a3c] bg-[#101018] p-3">
          {state.error || state.needsApiKey ? (
            <p className="text-[11px] text-rose-300">
              ⚠️ {state.needsApiKey ? "Suno(sunoapi.org) API 키를 [API 키 등록 · 플랫폼 연동]에서 먼저 등록해 주세요." : state.error}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-zinc-300">🎤 가사 타이밍 {state.lines?.length}줄</p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => state.lrc && save(state.lrc, `${safeName}.lrc`)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500"
                  >
                    ⬇ LRC
                  </button>
                  <button
                    type="button"
                    onClick={() => state.srt && save(state.srt, `${safeName}.srt`)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500"
                  >
                    ⬇ SRT 자막
                  </button>
                </div>
              </div>
              <ol className="max-h-48 overflow-y-auto space-y-0.5 text-[11px] text-zinc-400">
                {state.lines?.map((l) => (
                  <li key={l.id}>
                    <span className="text-orange-400 font-mono mr-2">{fmt(l.start)}</span>
                    {l.text}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </>
  );
}
