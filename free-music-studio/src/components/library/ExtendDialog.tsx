"use client";

// 끝 이어 만들기(엔진 0.8.3, 2026-11-10 주인님 「뒷부분을 연장해서 만들수 없나」) — 길이 상한에 닿아 끝이 잘린 곡을
// ACE-Step 부분 수정으로 30·60·90초 이어 그린 새 곡으로 저장한다(원곡은 그대로).
import { useState } from "react";
import { FastForward, X } from "lucide-react";
import { EXTEND_SECONDS, lastLyricSection } from "@/lib/engine";

type Seconds = (typeof EXTEND_SECONDS)[number];

export function ExtendDialog({
  title,
  style,
  lyrics,
  durationSec,
  onClose,
  onStart,
}: {
  title: string;
  style: string;
  lyrics: string;
  durationSec: number;
  onClose: () => void;
  onStart: (o: { seconds: Seconds; style_prompt: string; lyrics: string }) => Promise<void>;
}) {
  const [seconds, setSeconds] = useState<Seconds>(60);
  const [styleText, setStyleText] = useState(style ?? "");
  const [text, setText] = useState(() => lastLyricSection(lyrics));
  const [busy, setBusy] = useState(false);
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  const field = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-hidden placeholder:text-slate-600 focus:border-emerald-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div role="dialog" aria-label="끝 이어 만들기" onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-2xl border border-slate-700 bg-[#0a0f1d] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
          <FastForward className="h-4 w-4 text-emerald-300" />
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-100">끝 이어 만들기 — {title}</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-xs text-slate-300">
          <p className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 leading-relaxed text-slate-400">
            곡이 정해진 길이에 닿아 끝이 잘렸을 때 씁니다. 원곡 끝 10초 전부터 이어서 다시 만들어, 잘린 부분을 마저 부르고 자연스럽게 끝맺은 새 곡을 저장합니다. 원곡은 그대로 남습니다. 내 PC 음악 엔진(ACE-Step)으로 만들어 비용이 없습니다.
          </p>

          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-200">이어 붙일 길이</p>
            <div className="flex gap-2">
              {EXTEND_SECONDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeconds(s)}
                  className={`flex-1 rounded-lg border px-3 py-2 font-semibold ${seconds === s ? "border-emerald-400 bg-emerald-950/50 text-emerald-200" : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600"}`}
                >
                  {s}초
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              지금 {mmss(durationSec)} → 약 {mmss(durationSec + seconds)}. 더 길게 하려면 이어 만든 곡을 한 번 더 이어 만들면 됩니다.
            </p>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-200">스타일</span>
            <input value={styleText} onChange={(e) => setStyleText(e.target.value)} maxLength={1000} className={field} placeholder="원곡 스타일 그대로 두기를 권합니다" />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-200">이어서 부를 가사 (선택)</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1500}
              className={`${field} min-h-[120px] leading-relaxed`}
              placeholder={"비워 두면 연주로 끝맺습니다.\n[Outro]\n마지막으로 부를 가사"}
            />
            <span className="block text-[11px] text-slate-500">원곡의 마지막 구간을 미리 넣어 두었습니다. 잘린 곳부터 부를 가사만 남기고, 끝맺는 한두 줄을 더하면 좋습니다.</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-xs text-slate-300 hover:bg-slate-800">
            취소
          </button>
          <button
            type="button"
            disabled={busy || !styleText.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onStart({ seconds, style_prompt: styleText.trim(), lyrics: text });
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
          >
            {busy ? "넣는 중…" : "대기열에 넣기"}
          </button>
        </div>
      </div>
    </div>
  );
}
