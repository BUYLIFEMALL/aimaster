import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  if (phone.length < 8) return phone;
  return `${phone.slice(0, 3)}-****-${phone.slice(-4)}`;
}

const CHANNEL_LABEL: Record<string, string> = {
  brand: "브랜드메시지",
  alimtalk: "알림톡",
  email: "이메일",
};

/**
 * "📤 메시지 발송"(lib/actions/broadcastSend.ts)으로 보낸 메시지의 결과를 조회하는
 * 전용 페이지 — crm-google-form의 "접수 내역"처럼 좌측 메뉴로 분리했다. 리포트 자동
 * 발송(kakao_reports.kakao_sent_at 등)은 리포트 상세 화면에서 이미 볼 수 있어서 여기
 * 대상이 아니다 — 이 화면은 수동으로 보낸 자유 메시지만 기록한다.
 */
export default async function BroadcastLogPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("kakao_broadcast_send_log")
    .select("id, recipient_label, recipient_phone, recipient_email, message, ok, error, channel, fallback_email, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">발송 내역</h1>
      <p className="mb-6 text-sm text-neutral-600">
        "수신자 목록"에서 보낸 메시지의 발송 결과입니다. 최근 200건까지 표시됩니다.
      </p>

      <div className="space-y-2">
        {(logs ?? []).length === 0 && (
          <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            아직 발송 내역이 없습니다.
          </p>
        )}
        {(logs ?? []).map((log) => (
          <div key={log.id} className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-neutral-900">
                {log.recipient_label ? `${log.recipient_label} ` : ""}
                <span className="font-normal text-neutral-500">{maskPhone(log.recipient_phone) ?? log.recipient_email ?? "-"}</span>
              </p>
              <div className="flex shrink-0 items-center gap-1">
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                  {CHANNEL_LABEL[log.channel] ?? log.channel}
                  {log.fallback_email ? "→이메일 대체" : ""}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    log.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {log.ok ? "성공" : "실패"}
                </span>
              </div>
            </div>
            <p className="whitespace-pre-line text-sm text-neutral-700">{log.message}</p>
            {!log.ok && log.error && <p className="mt-1 text-xs text-red-600">사유: {log.error}</p>}
            <p className="mt-2 text-xs text-neutral-400">{new Date(log.created_at).toLocaleString("ko-KR")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
