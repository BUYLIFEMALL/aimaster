"use client";

import { useEffect, useRef, useState } from "react";

// 2026-11-18 T-07: 완료 작업의 엑셀 앞부분을 표로 미리 본다. 누를 때만 한 번 불러온다(자동 요청 없음).
type Preview = { headers: string[]; rows: string[][]; totalRows: number; truncatedRows: boolean; truncatedCols: boolean };
type State = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; data: Preview };

export function JobPreview({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function load() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/preview`, { cache: "no-store", signal: controller.signal });
      const body = await res.json().catch(() => ({}));
      if (controller.signal.aborted) return;
      if (!res.ok) {
        setState({ kind: "error", message: typeof body.error === "string" ? body.error : "미리보기를 불러오지 못했습니다." });
        return;
      }
      setState({ kind: "ready", data: body as Preview });
    } catch {
      if (!controller.signal.aborted) setState({ kind: "error", message: "미리보기를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && (state.kind === "idle" || state.kind === "error")) void load();
  }

  return (
    <div className="basis-full">
      <button type="button" onClick={toggle} className="text-xs font-semibold text-mx-link hover:underline" aria-expanded={open}>
        {open ? "▲ 표 미리보기 닫기" : "▼ 표 미리보기"}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-mx-border bg-mx-bg p-2">
          {state.kind === "loading" && <p className="p-2 text-xs text-mx-muted">불러오는 중…</p>}
          {state.kind === "error" && (
            <p className="p-2 text-xs text-mx-danger">
              {state.message}{" "}
              <button type="button" onClick={() => void load()} className="underline">
                다시 시도
              </button>
            </p>
          )}
          {state.kind === "ready" && state.data.rows.length === 0 && (
            <p className="p-2 text-xs text-mx-muted">엑셀에 머리글만 있고 수집된 행이 없습니다.</p>
          )}
          {state.kind === "ready" && state.data.rows.length > 0 && (
            <>
              <div className="max-h-80 overflow-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-mx-surface">
                    <tr>
                      {state.data.headers.map((h, i) => (
                        <th key={i} className="whitespace-nowrap border-b border-mx-border px-2 py-1.5 font-semibold text-mx-text">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.rows.map((row, ri) => (
                      <tr key={ri} className="border-b border-mx-border/60">
                        {row.map((cell, ci) => (
                          <td key={ci} className="max-w-xs truncate px-2 py-1 text-mx-muted" title={cell}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1.5 px-1 text-[11px] text-mx-muted">
                전체 {state.data.totalRows.toLocaleString("ko-KR")}행 중 앞 {state.data.rows.length}행
                {state.data.truncatedCols ? " · 앞쪽 열만" : ""}
                {state.data.truncatedRows || state.data.truncatedCols ? " — 전체는 「엑셀 다운로드」로 확인하세요." : ""}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
