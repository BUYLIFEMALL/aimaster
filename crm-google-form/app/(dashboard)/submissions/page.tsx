import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  received: "접수됨",
  notified: "알림 발송 완료",
  failed: "알림 발송 실패",
};

const STATUS_STYLES: Record<string, string> = {
  received: "bg-gray-100 text-gray-600",
  notified: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">접수 내역</h1>
        <p className="text-sm text-gray-500">
          연결된 구글폼에 새 응답이 들어올 때마다 여기 자동으로 쌓입니다. 최근 100건까지 표시됩니다.
        </p>
      </div>

      <div className="space-y-3">
        {(submissions ?? []).map((s) => {
          const sourceName = sourceNameById.get(s.form_source_id);
          return (
            <div key={s.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-bold text-gray-900">{s.name ?? "이름 미매핑"}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABELS[s.status] ?? s.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {sourceName ?? "폼"} · {s.phone ?? "연락처 미매핑"} · {s.email ?? "이메일 미매핑"}
              </p>
              <p className="text-xs text-gray-400 mt-1">{new Date(s.created_at).toLocaleString("ko-KR")}</p>
              {s.status === "failed" && s.error_message && (
                <p className="mt-1 text-xs text-red-600">{s.error_message}</p>
              )}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-semibold text-blue-600">원본 응답 전체 보기</summary>
                <div className="mt-2 space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                  {Object.entries((s.raw_values as Record<string, string>) ?? {}).map(([q, a]) => (
                    <p key={q}>
                      <span className="font-semibold text-gray-800">{q}</span> : {a}
                    </p>
                  ))}
                </div>
              </details>
            </div>
          );
        })}
        {(submissions ?? []).length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">아직 접수된 신청이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
