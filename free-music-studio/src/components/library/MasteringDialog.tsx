"use client";

// 마스터링 설정 창 — 원본 boks-music `src/App.tsx`(MIT, © 2026 boksajang)의 마스터링 창(목표 음량·피크 상한·성격, 기본값 채움)을 옮김(2026-11-06).
// 실제 처리는 회원 PC 엔진(ffmpeg)이 대기열에서 하고, 결과는 「제목 (마스터링)」 새 곡으로 기록된다.
import { useState } from "react";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { MASTER_CHARACTER_LABEL, MASTER_DEFAULTS, MASTER_LUFS_LABEL, type MasterOptions } from "@/lib/engine";

const PEAKS: MasterOptions["truePeak"][] = [-2, -1, -0.5, 0];

export function MasteringDialog({ title, onClose, onStart }: { title: string; onClose: () => void; onStart: (o: MasterOptions) => Promise<void> }) {
  const [o, setO] = useState<MasterOptions>(MASTER_DEFAULTS);
  const [busy, setBusy] = useState(false);
  const sel = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-400 focus:outline-hidden";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div role="dialog" aria-label="마스터링" onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-700 bg-[#0a0f1d] p-5 shadow-2xl">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-emerald-300" />
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-100">마스터링 — {title}</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="block space-y-1 text-[11px] font-semibold text-slate-300">
          목표 음량
          <select value={o.targetLufs} onChange={(e) => setO({ ...o, targetLufs: Number(e.target.value) as MasterOptions["targetLufs"] })} className={sel}>
            {([-14, -12, -10, -8] as const).map((v) => (
              <option key={v} value={v}>
                {MASTER_LUFS_LABEL[v]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-[11px] font-semibold text-slate-300">
          최대 피크(True Peak)
          <select value={o.truePeak} onChange={(e) => setO({ ...o, truePeak: Number(e.target.value) as MasterOptions["truePeak"] })} className={sel}>
            {PEAKS.map((v) => (
              <option key={v} value={v}>
                {v} dBTP{v === -1 ? " · 기본(음원 사이트 권장)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-[11px] font-semibold text-slate-300">
          소리 성격
          <select value={o.character} onChange={(e) => setO({ ...o, character: e.target.value as MasterOptions["character"] })} className={sel}>
            {(Object.keys(MASTER_CHARACTER_LABEL) as MasterOptions["character"][]).map((v) => (
              <option key={v} value={v}>
                {MASTER_CHARACTER_LABEL[v]}
              </option>
            ))}
          </select>
        </label>
        <p className="rounded-lg bg-slate-950/60 p-3 text-[11px] leading-relaxed text-slate-400">
          내 PC 엔진이 음량을 두 번 재서 목표에 맞추고, 피크가 상한을 넘지 않는지 다시 확인한 뒤 24bit WAV 새 곡으로 저장합니다. 원곡은 그대로 두며, 그래픽카드를 쓰지 않아 곡 길이에 따라 1~2분 걸립니다.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-xs text-slate-400 hover:text-slate-200">
            취소
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onStart(o);
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} 대기열에 넣기
          </button>
        </div>
      </div>
    </div>
  );
}
