import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { ReportBody, type ReportSnapshot } from "@/components/report/ReportBody";
import { AiSummaryButton, AskingView, PrintButton } from "@/components/report/ReportActions";
import { deleteSavedReportAction } from "@/lib/actions/reports";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// B2 저장한 주소 리포트 한 건(2026-11-03): 저장 때 숫자·호가 + 🧠 AI 총평(회원 본인 Claude 키) + 인쇄·삭제
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
type Row = { id: string; source: string; source_id: string | null; title: string; subtitle: string | null; report: ReportSnapshot; asking_price: number | null; ai_summary: string | null; ai_model: string | null; created_at: string };

export default async function SavedReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireProgramAccess();
  const { id } = await params;
  const db = (await createClient()) as unknown as SupabaseLike;
  const { data } = await db
    .from("real_estate_saved_reports")
    .select("id, source, source_id, title, subtitle, report, asking_price, ai_summary, ai_model, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) notFound();
  const row = data as Row;
  const r = row.report;
  const saved = new Date(row.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "long", timeStyle: "short" });
  const live = row.source_id ? `/report?${row.source === "onsite" ? "onsite" : "listing"}=${row.source_id}` : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link href="/report/saved" className="inline-flex min-h-[40px] items-center text-sm text-mx-muted hover:text-mx-text print:hidden">← 저장한 리포트</Link>
      <div className="rounded-2xl border border-mx-border bg-gradient-to-br from-[#172554] via-mx-surface to-mx-surface p-5">
        <span className="mx-chip-blue mb-2">💾 저장한 주소 리포트</span>
        <h1 className="text-2xl font-black text-mx-text">{row.title}</h1>
        {row.subtitle && <p className="mt-1 text-sm text-mx-muted">{row.subtitle}</p>}
        <p className="mt-1 text-xs text-mx-muted">저장: {saved} · 국토부 실거래·전월세 최근 {r.months}개월{r.type ? ` · ${r.type}` : ""} 기준(저장 때 숫자)</p>
      </div>

      <div className="mx-card space-y-4 p-5">
        <AskingView asking={row.asking_price} saleMedian={r.sale.median} latest={r.sale.latest?.amount ?? null} assessed={typeof r.assessedPrice === "number" ? r.assessedPrice / 10000 : null} months={r.months} />
        <div>
          <h2 className="mx-section-title">🧠 AI 총평</h2>
          {row.ai_summary ? (
            <>
              <div className="whitespace-pre-wrap rounded-xl bg-mx-raised p-4 text-sm leading-relaxed text-mx-text">{row.ai_summary}</div>
              <p className="mt-1 text-[11px] text-mx-muted">AI({row.ai_model ?? "Claude"})가 위 숫자만 읽고 쓴 참고 글이에요. 투자 판단은 본인 책임이에요.</p>
            </>
          ) : (
            <p className="text-sm text-mx-muted">아직 없어요.</p>
          )}
          <div className="mt-3">
            <AiSummaryButton id={row.id} hasSummary={Boolean(row.ai_summary)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <PrintButton />
          {live && <Link href={live} className="mx-btn-ghost inline-flex min-h-[44px] items-center px-4 text-sm">🔄 지금 숫자로 다시 보기</Link>}
          <form action={deleteSavedReportAction}>
            <input type="hidden" name="id" value={row.id} />
            <button type="submit" className="mx-btn-danger min-h-[44px] px-4 text-sm">🗑 삭제</button>
          </form>
        </div>
      </div>

      <ReportBody r={r} />
    </div>
  );
}
