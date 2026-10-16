import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/layout/PageHero";
import { KpiCard, KpiGrid } from "@/components/dashboard/KpiCard";
import { SubmissionMatrix, type SubmissionRow } from "@/components/submissions/SubmissionMatrix";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SubmissionsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: submissions }, { data: sources }] = await Promise.all([
    supabase
      .from("crm_submissions")
      .select("id, form_source_id, name, phone, email, status, error_message, raw_values, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("crm_form_sources").select("id, name").eq("user_id", user.id),
  ]);

  const sourceNameById = new Map((sources ?? []).map((s) => [s.id, s.name]));
  const rows: SubmissionRow[] = (submissions ?? []).map((s) => ({
    id: s.id,
    sourceName: sourceNameById.get(s.form_source_id) ?? "폼",
    name: s.name,
    phone: s.phone,
    email: s.email,
    status: s.status,
    errorMessage: s.error_message,
    rawValues: (s.raw_values as Record<string, string>) ?? {},
    createdAt: s.created_at,
  }));
  const count = (st: string) => rows.filter((r) => r.status === st).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        badge="📥 STEP 2 · 접수 내역"
        title="접수 내역"
        description="연결된 구글폼에 새 응답이 들어올 때마다 여기 자동으로 쌓입니다. 최근 100건까지 표시됩니다."
        tip="발송 실패 행에는 실패 이유가 함께 보여요. 대부분 발송 계정 미연결·필드 매핑 오류입니다."
      />

      <KpiGrid>
        <KpiCard icon="📥" label="표시된 접수" value={rows.length} hint="최근 100건 기준" />
        <KpiCard icon="✅" label="발송 완료" value={count("notified")} tone="green" />
        <KpiCard icon="⏳" label="접수만 됨" value={count("received")} tone="muted" />
        <KpiCard icon="⚠️" label="발송 실패" value={count("failed")} tone="amber" />
      </KpiGrid>

      {rows.length === 0 ? (
        <div className="mx-card py-16 text-center">
          <p className="text-5xl">📭</p>
          <p className="mt-4 text-sm text-mx-muted">아직 접수된 신청이 없습니다. 구글폼에 테스트 응답을 1건 보내 보세요.</p>
        </div>
      ) : (
        <SubmissionMatrix rows={rows} sources={(sources ?? []).map((s) => s.name)} />
      )}
    </div>
  );
}
