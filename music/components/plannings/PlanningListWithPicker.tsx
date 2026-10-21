"use client";

import { useState } from "react";
import Link from "next/link";
import type { PlanningStatus } from "@/types/database.types";
import { buildChapters, buildCsv, type ExportSong } from "@/lib/songListExport";

// v1.30 기획 목록에서 여러 기획의 완성 곡(곡마다 첫 변주)을 골라 YOUTUBE 플레이리스트 자동화로 넘긴다.
// 기획 상세의 「플레이리스트 영상 만들기 →」(v1.26)와 같은 주소 형식 — 그쪽은 미리 선택만 하고 회원이 「선택한 곡 추가」(최대 20곡).
const PLAYLIST_URL = "https://playlist-channel-studio.buylife.xyz/video";
const MAX_SONGS = 20;

export interface PickerSong {
  id: string; // 완성 곡마다 첫 변주 번호
  title: string;
  mode: string;
  durationSeconds: number | null;
  style: string | null;
}

export interface PlanningRow {
  id: string;
  title: string | null;
  song_description: string;
  status: PlanningStatus;
  songs: PickerSong[];
}

const STATUS_BADGE: Record<PlanningStatus, { label: string; className: string }> = {
  draft: { label: "초안", className: "bg-[#20202e] text-zinc-400 border border-[#2b2b3d]" },
  planned: { label: "기획 완료", className: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  generating: { label: "생성 중...", className: "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse" },
  completed: { label: "완료", className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  error: { label: "오류", className: "bg-rose-500/15 text-rose-400 border border-rose-500/30" },
};

export function PlanningListWithPicker({ plannings }: { plannings: PlanningRow[] }) {
  const [picked, setPicked] = useState<string[]>([]); // 고른 순서대로
  const [copied, setCopied] = useState(false);
  // v1.40(D-68-03): 고른 순서대로 곡을 모아 플레이리스트로 넘기고, 같은 목록을 CSV·목차로도 내보낸다.
  const exportSongs: (ExportSong & { id: string })[] = plannings
    .filter((p) => picked.includes(p.id))
    .sort((a, b) => picked.indexOf(a.id) - picked.indexOf(b.id))
    .flatMap((p) => p.songs.map((s) => ({ ...s, planningTitle: p.title ?? "제목 없음" })));
  const songIds = exportSongs.map((s) => s.id);
  const sending = songIds.slice(0, MAX_SONGS);
  const withSongs = plannings.filter((p) => p.songs.length > 0).length;

  function downloadCsv() {
    const blob = new Blob([buildCsv(exportSongs)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `곡목록-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyChapters() {
    try {
      await navigator.clipboard.writeText(buildChapters(exportSongs));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="space-y-3">
      {withSongs > 0 && (
        <p className="text-[11px] text-zinc-500">
          🎞️ 곡이 완성된 기획 왼쪽 칸을 체크하면 여러 기획의 곡을 한 번에 YOUTUBE 플레이리스트 자동화로 넘길 수 있습니다(고른 순서대로, 최대 {MAX_SONGS}곡).
        </p>
      )}
      {plannings.map((planning) => {
        const badge = STATUS_BADGE[planning.status];
        const can = planning.songs.length > 0;
        const on = picked.includes(planning.id);
        return (
          <div key={planning.id} className="flex items-stretch gap-2">
            <label
              className={`flex w-10 shrink-0 items-center justify-center rounded-2xl border transition-all ${
                can ? (on ? "border-red-500/60 bg-red-950/40 cursor-pointer" : "border-[#272732] bg-[#14141b] cursor-pointer hover:border-red-500/40") : "border-transparent opacity-30"
              }`}
              title={can ? `완성 곡 ${planning.songs.length}개 — 플레이리스트로 넘길 기획으로 고르기` : "완성된 곡이 없어 고를 수 없습니다"}
            >
              <input type="checkbox" className="h-4 w-4 accent-red-500" checked={on} disabled={!can} onChange={() => toggle(planning.id)} aria-label={`${planning.title ?? "기획"} 고르기`} />
            </label>
            <Link
              href={`/plannings/${planning.id}`}
              className="group relative block min-w-0 flex-1 rounded-2xl border border-[#272732] bg-[#14141b] p-4 sm:p-5 shadow-lg shadow-black/30 hover:border-orange-500/50 hover:bg-[#181824] transition-all duration-200 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-sm sm:text-base text-zinc-100 group-hover:text-orange-400 transition-colors truncate">
                      {planning.title ?? "(제목 생성 전)"}
                    </p>
                    {can && <span className="shrink-0 text-[10px] text-zinc-500">곡 {planning.songs.length}</span>}
                  </div>
                  <p className="text-xs text-zinc-400 truncate leading-relaxed">{planning.song_description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badge.className}`}>{badge.label}</span>
                  <span className="text-zinc-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all text-xs font-bold">→</span>
                </div>
              </div>
            </Link>
          </div>
        );
      })}

      {picked.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/40 bg-[#1a0f12]/95 px-4 py-3 shadow-xl shadow-black/50 backdrop-blur-md">
          <span className="text-xs font-bold text-red-100">
            기획 {picked.length}개 · 곡 {songIds.length}개{songIds.length > MAX_SONGS ? ` (플레이리스트에는 앞의 ${MAX_SONGS}곡만 넘깁니다 · 내보내기는 전부)` : ""}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPicked([])} className="text-[11px] text-zinc-400 hover:text-white">선택 해제</button>
            <button
              type="button"
              onClick={copyChapters}
              title="「0:00 곡 제목」 목차 — 유튜브 설명란에 붙여 넣기"
              className="rounded-full border border-red-500/40 px-3 py-2 text-[11px] font-bold text-red-100 hover:bg-red-500/10"
            >
              {copied ? "✅ 복사됨" : "📋 영상 설명용 목차 복사"}
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              title="순서·제목·길이·시작 시각·스타일·권장 파일명(CSV, 엑셀에서 열림)"
              className="rounded-full border border-red-500/40 px-3 py-2 text-[11px] font-bold text-red-100 hover:bg-red-500/10"
            >
              ⬇ 곡 목록 CSV
            </button>
            <a
              href={`${PLAYLIST_URL}?suno=${sending.join(",")}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500"
            >
              🎞️ 플레이리스트 영상 만들기 →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
