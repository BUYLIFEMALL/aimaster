"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SeedActions } from "@/components/seeds/SeedActions";
import { ENGINE_LABEL, SeedRow, type SeedRowData } from "@/components/seeds/SeedRow";
import { formatDateTime } from "@/lib/format";

type EngineFilter = "all" | "naver" | "google";
type View = "table" | "grid";

// 씨드 키워드 목록 — 검색·검색엔진 필터 + 표/카드 보기 전환 (스마트 매트릭스 스타일)
export function SeedMatrix({ seeds }: { seeds: SeedRowData[] }) {
  const [query, setQuery] = useState("");
  const [engine, setEngine] = useState<EngineFilter>("all");
  const [view, setView] = useState<View>("table");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return seeds.filter(
      (s) => (engine === "all" || s.engine === engine) && (!q || s.keyword.toLowerCase().includes(q)),
    );
  }, [seeds, query, engine]);

  const lastRunLabel = (s: SeedRowData) => (s.lastRunAt ? `마지막 ${formatDateTime(s.lastRunAt)}` : "아직 실행 전");

  return (
    <div className="mx-card p-4">
      {/* 검색·필터 바 */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔎 키워드 검색"
          className="input-sm md:max-w-xs"
          aria-label="키워드 검색"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-mx-border p-0.5">
            {(["all", "naver", "google"] as const).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEngine(e)}
                className={`mx-toggle ${engine === e ? "mx-toggle-active" : ""}`}
              >
                {e === "all" ? "전체" : ENGINE_LABEL[e]}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-mx-border p-0.5">
            <button type="button" onClick={() => setView("table")} className={`mx-toggle ${view === "table" ? "mx-toggle-active" : ""}`}>
              ☰ 표
            </button>
            <button type="button" onClick={() => setView("grid")} className={`mx-toggle ${view === "grid" ? "mx-toggle-active" : ""}`}>
              ▦ 카드
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-mx-muted">조건에 맞는 키워드가 없습니다.</p>
      ) : view === "table" ? (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="mx-table min-w-[640px]">
            <thead>
              <tr>
                <th>키워드</th>
                <th>검색엔진</th>
                <th className="text-right">실행</th>
                <th>마지막 실행</th>
                <th className="text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold">
                    <Link href={`/seeds/${s.id}`} className="hover:text-[#93c5fd]">
                      {s.keyword}
                    </Link>
                  </td>
                  <td>
                    <span className={s.engine === "naver" ? "mx-chip-green" : "mx-chip-blue"}>{ENGINE_LABEL[s.engine]}</span>
                  </td>
                  <td className="text-right tabular-nums">{s.runCount}회</td>
                  <td className="text-mx-muted">{s.lastRunAt ? formatDateTime(s.lastRunAt) : "—"}</td>
                  <td>
                    <SeedActions seedId={s.id} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <SeedRow key={s.id} seed={s} lastRunLabel={lastRunLabel(s)} />
          ))}
        </div>
      )}
    </div>
  );
}
