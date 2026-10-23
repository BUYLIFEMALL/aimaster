"use client";

import { useState } from "react";
import { SongListExport } from "@/components/SongListExport";

// v1.43(2026-10-22, D-68-03 후속): 기획 상세에서 곡마다 넣을 버전(#1·#2)을 고르거나 빼고,
// 고른 결과로 플레이리스트 링크(v1.26)와 목차·CSV 내보내기(v1.42)를 함께 만든다. 화면 안에서만 고르고 저장하지 않는다.
const PLAYLIST_URL = "https://playlist-channel-studio.buylife.xyz/video";
const MAX_PLAYLIST = 20;

export interface ExportTrack {
  id: string;
  label: string; // 「🔁 연장본 · 제목」처럼 화면 구분용
  title: string;
  mode: string;
  style: string | null;
  variants: { id: string; durationSeconds: number | null }[];
}

function clock(sec: number | null): string {
  if (sec == null) return "";
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function PlanningExportPicker({ planningTitle, tracks }: { planningTitle: string; tracks: ExportTrack[] }) {
  const [choice, setChoice] = useState<Record<string, number>>({}); // 곡 id → 변주 순서, -1 = 빼기 (없으면 #1)
  if (tracks.length === 0) return null;

  const chosen = tracks
    .map((t) => ({ t, i: choice[t.id] ?? 0 }))
    .filter(({ t, i }) => i >= 0 && t.variants[i]);
  const songs = chosen.map(({ t, i }) => ({
    planningTitle,
    title: t.title,
    mode: t.mode,
    durationSeconds: t.variants[i].durationSeconds,
    style: t.style,
  }));
  const playlistIds = chosen.map(({ t, i }) => t.variants[i].id).slice(0, MAX_PLAYLIST);

  const chip = (on: boolean) =>
    `rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
      on ? "border-orange-500/60 bg-orange-500/15 text-orange-300" : "border-[#2d2d3e] text-zinc-400 hover:text-zinc-200"
    }`;

  return (
    <div className="space-y-3 rounded-2xl border border-[#272732] bg-[#14141b] p-4">
      <p className="text-xs font-bold text-zinc-200">🎞️ 플레이리스트·곡 목록에 넣을 버전 고르기</p>
      <div className="space-y-1.5">
        {tracks.map((t) => {
          const cur = choice[t.id] ?? 0;
          return (
            <div key={t.id} className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 min-w-0 flex-1 truncate text-[11px] text-zinc-300">{t.label}</span>
              {t.variants.map((v, i) => (
                <button key={v.id} type="button" className={chip(cur === i)} onClick={() => setChoice((c) => ({ ...c, [t.id]: i }))}>
                  #{i + 1} {clock(v.durationSeconds)}
                </button>
              ))}
              <button type="button" className={chip(cur === -1)} onClick={() => setChoice((c) => ({ ...c, [t.id]: -1 }))}>
                빼기
              </button>
            </div>
          );
        })}
      </div>
      {songs.length > 0 ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#23232f] pt-3">
          <span className="mr-auto text-[11px] text-zinc-500">
            고른 곡 {songs.length}개{songs.length > MAX_PLAYLIST ? ` (플레이리스트에는 앞 ${MAX_PLAYLIST}곡)` : ""}
          </span>
          <SongListExport songs={songs} fileLabel={planningTitle} className="border-[#2d2d3e] text-zinc-300 hover:border-orange-500/40 hover:text-orange-300" />
          <a
            href={`${PLAYLIST_URL}?suno=${playlistIds.join(",")}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-red-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-red-500"
          >
            🎞️ 플레이리스트 영상 만들기 →
          </a>
        </div>
      ) : (
        <p className="border-t border-[#23232f] pt-3 text-[11px] text-zinc-500">모든 곡을 뺐습니다. 넣을 버전을 하나 이상 골라 주세요.</p>
      )}
    </div>
  );
}
