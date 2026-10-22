"use client";

import { useState } from "react";

export interface CsvRow { group: string; related: string; relevance: number | null; longtail: string }

// CSV 한 칸: 쉼표·따옴표·줄바꿈이 있으면 따옴표로 감싼다
const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** 결과를 엑셀·구글 시트에서 바로 열리는 CSV로 내려받는다(UTF-8 BOM으로 한글 깨짐 방지, 서버 호출 없음) */
export function CsvButton({ rows, fileName }: { rows: CsvRow[]; fileName: string }) {
  const [done, setDone] = useState(false);

  function download() {
    const lines = [["구분", "연관 키워드", "관련도(%)", "롱테일 키워드"], ...rows.map((r) => [r.group, r.related, r.relevance === null ? "" : String(r.relevance), r.longtail])];
    const csv = "﻿" + lines.map((l) => l.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDone(true); setTimeout(() => setDone(false), 1800);
  }

  return (
    <button type="button" onClick={download} disabled={rows.length === 0} className="mx-btn-ghost px-3 text-xs" aria-live="polite">
      {done ? "✅ 내려받음" : "⬇️ CSV 내려받기"}
    </button>
  );
}
