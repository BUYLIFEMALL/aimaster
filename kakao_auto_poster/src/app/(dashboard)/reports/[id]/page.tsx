import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { SendKakaoButton } from "@/components/reports/SendKakaoButton";
import { ReportEditor } from "@/components/reports/ReportEditor";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireProgramAccess();
  const { id } = await params;
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("kakao_reports")
    .select("id, topic_id, title, summary, content, kakao_sent_at, kakao_send_error, telegram_review_status, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!report) notFound();

  const [{ data: topic }, { data: profile }, { data: solapiAccount }, { data: kakaoAccount }] = await Promise.all([
    supabase.from("kakao_topics").select("topic_name").eq("id", report.topic_id).maybeSingle(),
    supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle(),
    supabase.from("user_solapi_accounts").select("kakao_pf_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_kakao_accounts").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  // 카카오 로그인(무료) 또는 SOLAPI(카카오 채널) 둘 중 하나만 연동돼 있어도 발송 가능하다 —
  // lib/kakaoSend.ts가 카카오 로그인을 우선 사용하고 없으면 SOLAPI로 자동 전환한다.
  const canSendKakao = Boolean(kakaoAccount) || Boolean(profile?.phone && solapiAccount?.kakao_pf_id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/reports" className="mb-4 inline-block text-sm text-neutral-500 hover:text-neutral-900">
        ← 리포트 목록
      </Link>

      <div className="rounded-2xl border-2 border-neutral-300 bg-white p-6 shadow-sm">
        {topic && <p className="mb-2 text-xs font-medium text-yellow-700">📌 {topic.topic_name}</p>}
        <p className="mb-2 text-xs text-neutral-400">{new Date(report.created_at).toLocaleString("ko-KR")}</p>

        <div className="mb-6 rounded-lg bg-yellow-50 p-4">
          <p className="mb-1 text-xs font-bold text-yellow-800">💬 카카오톡 발송 요약</p>
          <p className="whitespace-pre-line text-sm text-neutral-700">{report.summary}</p>
        </div>

        <ReportEditor reportId={report.id} userId={user.id} title={report.title} content={report.content} />

        <div className="border-t border-neutral-200 pt-4">
          {report.telegram_review_status === "pending" && (
            <p className="mb-2 text-xs text-blue-600">
              📮 텔레그램으로 검토 요청을 보냈습니다. 텔레그램에서 발행 여부를 결정하거나, 아래에서 바로 발송할 수 있습니다.
            </p>
          )}
          {report.telegram_review_status === "rejected" && !report.kakao_sent_at && (
            <p className="mb-2 text-xs text-neutral-500">❌ 텔레그램에서 발행 안 함으로 처리됐습니다. 필요하면 아래에서 다시 발송할 수 있습니다.</p>
          )}
          {report.kakao_sent_at && (
            <p className="mb-2 text-xs text-green-600">
              ✓ {new Date(report.kakao_sent_at).toLocaleString("ko-KR")}에 카카오톡으로 발송됨
            </p>
          )}
          {report.kakao_send_error && !report.kakao_sent_at && (
            <p className="mb-2 text-xs text-red-600">직전 발송 실패: {report.kakao_send_error}</p>
          )}

          {canSendKakao ? (
            <SendKakaoButton reportId={report.id} />
          ) : (
            <p className="text-xs text-neutral-500">
              카카오톡으로 발송하려면{" "}
              <Link href="/settings" className="font-medium text-blue-600 hover:underline">
                설정 페이지
              </Link>
              에서 카카오 로그인(무료, 추천)으로 연동하거나 카카오 채널(SOLAPI)을 연동하고
              AIMaster 프로필에 전화번호를 등록해주세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
