"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatWon, priceToOfficialPct } from "@/lib/format";

export interface ListingRow {
  matchId: string;
  status: string;
  id: string;
  name: string;
  sgg: string;
  dong: string;
  contractDate: string | null;
  area: number | null;
  floor: string | null;
  price: number | null; // 만원
  official: number | null; // 원
}

type Sort = "recent" | "price" | "area" | "ratio";
type View = "table" | "grid";

const STATUS: Record<string, { label: string; chip: string }> = {
  new: { label: "새 실거래", chip: "mx-chip-amber" },
  notified: { label: "알림 보냄", chip: "mx-chip-blue" },
  analyzed: { label: "분석 완료", chip: "mx-chip-green" },
};

// 실거래 목록 — 단지명 검색 · 자치구 필터 · 정렬 · 표/카드 전환 (스마트 매트릭스 스타일)
export function ListingMatrix({ rows }: { rows: ListingRow[] }) {
  const [query, setQuery] = useState("");
  const [sgg, setSgg] = useState("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [view, setView] = useState<View>("table");

  const districts = useMemo(() => Array.from(new Set(rows.map((r) => r.sgg))).sort(), [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => (sgg === "all" || r.sgg === sgg) && (!q || `${r.name} ${r.dong}`.toLowerCase().includes(q)));
    const ratio = (r: ListingRow) => priceToOfficialPct(r.price, r.official) ?? -1;
    if (sort === "price") return [...list].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    if (sort === "area") return [...list].sort((a, b) => (b.area ?? 0) - (a.area ?? 0));
    if (sort === "ratio") return [...list].sort((a, b) => ratio(b) - ratio(a));
    return list;
  }, [rows, query, sgg, sort]);

  return (
    <div className="mx-card p-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔎 단지명·동 검색"
          aria-label="단지명·동 검색"
          className="mx-input min-h-[40px] py-2 text-sm lg:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          {districts.length > 1 && (
            <select value={sgg} onChange={(e) => setSgg(e.target.value)} aria-label="자치구" className="mx-input min-h-[40px] w-auto py-2 text-sm">
              <option value="all">모든 자치구</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="정렬" className="mx-input min-h-[40px] w-auto py-2 text-sm">
            <option value="recent">최근 수집순</option>
            <option value="price">거래가 높은순</option>
            <option value="area">전용면적 큰순</option>
            <option value="ratio">공시가 대비 높은순</option>
          </select>
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

      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-mx-muted">조건에 맞는 실거래가 없습니다.</p>
      ) : view === "table" ? (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="mx-table min-w-[820px]">
            <thead>
              <tr>
                <th>단지</th>
                <th>지역</th>
                <th>계약일</th>
                <th className="text-right">전용</th>
                <th className="text-right">층</th>
                <th className="text-right">거래가</th>
                <th className="text-right">공시가</th>
                <th className="text-right">공시가 대비</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const pct = priceToOfficialPct(r.price, r.official);
                const st = STATUS[r.status] ?? { label: r.status, chip: "mx-chip" };
                return (
                  <tr key={r.matchId}>
                    <td className="font-semibold">
                      <Link href={`/listings/${r.id}`} className="hover:text-mx-link">
                        {r.name}
                      </Link>
                    </td>
                    <td className="text-mx-muted">
                      {r.sgg} {r.dong}
                    </td>
                    <td className="whitespace-nowrap text-mx-muted">{r.contractDate ?? "-"}</td>
                    <td className="text-right tabular-nums">{r.area ?? "-"}㎡</td>
                    <td className="text-right tabular-nums">{r.floor ?? "-"}</td>
                    <td className="text-right font-bold tabular-nums text-mx-link">{formatWon(r.price)}</td>
                    <td className="text-right tabular-nums text-mx-muted">{r.official ? formatWon(r.official / 10000) : "-"}</td>
                    <td className="text-right tabular-nums">{pct !== null ? `${pct}%` : "-"}</td>
                    <td>
                      <span className={st.chip}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => {
            const pct = priceToOfficialPct(r.price, r.official);
            const st = STATUS[r.status] ?? { label: r.status, chip: "mx-chip" };
            return (
              <Link key={r.matchId} href={`/listings/${r.id}`} className="mx-card block p-4 transition-colors hover:border-mx-primary">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-mx-muted">
                    {r.sgg} {r.dong}
                  </span>
                  <span className={st.chip}>{st.label}</span>
                </div>
                <p className="mt-1 truncate font-bold text-mx-text">{r.name}</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-mx-link">{formatWon(r.price)}</p>
                <p className="mt-1 text-xs text-mx-muted">
                  전용 {r.area ?? "-"}㎡ · {r.floor ?? "-"}층 · {r.contractDate ?? "-"}
                  {pct !== null && ` · 공시가 대비 ${pct}%`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
