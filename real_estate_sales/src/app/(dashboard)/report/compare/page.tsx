import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { formatWon } from "@/lib/format";
import { diffPct } from "@/lib/realestate/report";
import type { ReportSnapshot } from "@/components/report/ReportBody";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// B3 여러 곳 나란히 비교(2026-11-03): 저장한 리포트 2~4개를 저장 때 숫자로만 비교(공공 API 다시 안 부름)
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
type Row = { id: string; title: string; report: ReportSnapshot; asking_price: number | null; created_at: string };
const MAX = 4;

const pct = (v: number | null) => (v === null ? "-" : `${v > 0 ? "+" : ""}${v}%`);

const LINES: { label: string; value: (r: Row) => string }[] = [
  { label: "유형 · 기간", value: (r) => `${r.report.type ?? "모름"} · ${r.report.months}개월` },
  { label: "매매 건수", value: (r) => `${r.report.sale.count}건` },
  { label: "매매 중간값", value: (r) => formatWon(r.report.sale.median) },
  { label: "가장 최근 거래", value: (r) => formatWon(r.report.sale.latest?.amount) },
  { label: "전세 중간값", value: (r) => (r.report.jeonse.count ? formatWon(r.report.jeonse.median) : "-") },
  { label: "전세가율", value: (r) => (r.report.jeonseRatio !== null ? `${r.report.jeonseRatio}%` : "-") },
  { label: "공시가격", value: (r) => (r.report.assessedPrice === "대상 아님" ? "대상 아님" : r.report.assessedPrice ? formatWon(r.report.assessedPrice / 10000) : "-") },
  { label: "내 호가", value: (r) => (r.asking_price ? formatWon(r.asking_price) : "-") },
  { label: "호가 − 매매 중간값", value: (r) => (r.asking_price ? pct(diffPct(r.asking_price, r.report.sale.median)) : "-") },
  { label: "건물 나이", value: (r) => (r.report.building?.ageYears != null ? `${r.report.building.ageYears}년 차` : "-") },
  { label: "용적률 · 건폐율", value: (r) => `${r.report.building?.floorAreaRatio ?? "-"}% · ${r.report.building?.coverageRatio ?? "-"}%` },
  { label: "주차 (세대당)", value: (r) => (r.report.building?.parking ? `${r.report.building.parking}대${r.report.building.households ? ` (${(r.report.building.parking / r.report.building.households).toFixed(2)})` : ""}` : "-") },
  { label: "용도지역", value: (r) => r.report.land?.zones.join(", ") || "-" },
  { label: "공시지가 (원/㎡)", value: (r) => (r.report.land?.pricePerM2 ? r.report.land.pricePerM2.toLocaleString("ko-KR") : "-") },
];

export default async function CompareReportsPage({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  const user = await requireProgramAccess();
  const sp = await searchParams;
  const ids = [...new Set((Array.isArray(sp.id) ? sp.id : sp.id ? [sp.id] : []).filter((x) => /^[0-9a-f-]{36}$/i.test(x)))].slice(0, MAX);
  const db = (await createClient()) as unknown as SupabaseLike;
  const { data } = ids.length
    ? await db.from("real_estate_saved_reports").select("id, title, report, asking_price, created_at").eq("user_id", user.id).in("id", ids)
    : { data: [] };
  const rows = ids.map((id) => ((data ?? []) as Row[]).find((r) => r.id === id)).filter(Boolean) as Row[];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <Link href="/report/saved" className="inline-flex min-h-[40px] items-center text-sm text-mx-muted hover:text-mx-text print:hidden">← 저장한 리포트</Link>
      <h1 className="text-2xl font-black text-mx-text">⚖️ 나란히 비교</h1>
      {rows.length < 2 ? (
        <p className="mx-card p-5 text-sm text-mx-muted">저장한 리포트에서 2~{MAX}개를 고른 뒤 「⚖️ 나란히 비교」를 누르세요.</p>
      ) : (
        <>
          <p className="text-sm text-mx-muted">저장할 때의 숫자로 비교해요. 기간·유형이 다르면 같은 기준이 아닐 수 있어요.</p>
          <div className="mx-card overflow-x-auto p-0">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-mx-border">
                  <th className="sticky left-0 bg-mx-surface p-3 text-left text-xs font-medium text-mx-muted">항목</th>
                  {rows.map((r) => (
                    <th key={r.id} className="p-3 text-left align-top font-bold text-mx-text">
                      <Link href={`/report/saved/${r.id}`} className="hover:text-mx-link">{r.title}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LINES.map((line) => (
                  <tr key={line.label} className="border-b border-mx-border last:border-0">
                    <th className="sticky left-0 bg-mx-surface p-3 text-left text-xs font-medium text-mx-muted">{line.label}</th>
                    {rows.map((r) => (
                      <td key={r.id} className="p-3 tabular-nums text-mx-text">{line.value(r)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-mx-muted">※ 공공 자료 참고용 비교예요. 투자 판단과 책임은 본인에게 있어요.</p>
        </>
      )}
    </div>
  );
}
