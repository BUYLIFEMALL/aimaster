"use client";

import { useState } from "react";
import { buildChapters, buildCsv, type ExportSong } from "@/lib/songListExport";

// D-68-03(v1.40 기획 목록 → v1.42 기획 상세·리믹스 결과에도): 곡 목록을 영상 설명용 목차로 복사하거나 CSV로 내려받는다.
// 화면 안에서만 만들고 서버에 저장하지 않는다. 키·Suno 작업 번호·저장소 주소는 넣지 않는다(lib/songListExport.ts).
export function SongListExport({
  songs,
  fileLabel = "곡목록",
  className = "",
}: {
  songs: ExportSong[];
  fileLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  if (songs.length === 0) return null;

  function downloadCsv() {
    const blob = new Blob([buildCsv(songs)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileLabel.replace(/[\\/:*?"<>|]/g, "_")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyChapters() {
    try {
      await navigator.clipboard.writeText(buildChapters(songs));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const button = `rounded-full border px-3 py-2 text-[11px] font-bold transition-colors ${className}`;
  return (
    <>
      <button type="button" onClick={copyChapters} title="「0:00 곡 제목」 목차 — 유튜브 설명란에 붙여 넣기" className={button}>
        {copied ? "✅ 복사됨" : "📋 영상 설명용 목차 복사"}
      </button>
      <button type="button" onClick={downloadCsv} title="순서·제목·길이·시작 시각·스타일·권장 파일명(CSV, 엑셀에서 열림)" className={button}>
        ⬇ 곡 목록 CSV
      </button>
    </>
  );
}
