// 주문 알림 기록 목록(운영자 화면 전용) — 받는 번호는 뒤 4자리, 메일은 앞 두 글자만 보인다
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/orders";
import { headers } from "next/headers";
import { fillSite, kindLabel, maskEmail, maskPhone, NOTIFY_STATUS_LABEL } from "@/lib/notify";

type Row = {
  id: string;
  kind: string;
  channel: string;
  to_phone: string;
  to_email: string;
  body: string;
  status: string;
  error: string;
  created_at: string;
  sent_at: string | null;
};

export async function loadNotifyLog(storeId: string, orderId?: string, limit = 20): Promise<Row[]> {
  const supabase = await createClient();
  let q = supabase
    .from("mall_builder_notifications")
    .select("id, kind, channel, to_phone, to_email, body, status, error, created_at, sent_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (orderId) q = q.eq("order_id", orderId);
  const { data } = await q;
  // 재입고 문구의 {{site}}는 발송 순간 실제 주소로 바뀐다(D16) — 기록 화면도 지금 접속 주소로 보여 준다
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : "";
  return ((data ?? []) as Row[]).map((r) => (origin ? { ...r, body: fillSite(r.body, origin) } : r));
}

const STATUS_COLOR: Record<string, string> = { sent: "text-green-700", failed: "text-red-600", unknown: "text-amber-700", expired: "text-gray-500" };

export default function NotifyLog({ rows, empty }: { rows: Row[]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-gray-500">{empty}</p>;
  return (
    <ul className="divide-y border-y text-sm" data-notify-log>
      {rows.map((r) => (
        <li key={r.id} className="py-2">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="text-gray-500">{formatDateTime(r.sent_at ?? r.created_at)}</span>
            <span className="rounded bg-gray-100 px-1.5 text-xs">{r.channel === "email" ? "메일" : "문자"}</span>
            <span>{kindLabel(r.kind)}</span>
            <span className="text-gray-500">{r.channel === "email" ? maskEmail(r.to_email) : maskPhone(r.to_phone)}</span>
            <b className={STATUS_COLOR[r.status] ?? ""}>{NOTIFY_STATUS_LABEL[r.status] ?? r.status}</b>
            {r.error && <span className="text-red-600">— {r.error}</span>}
          </div>
          <p className="mt-0.5 break-words text-gray-600">{r.body}</p>
        </li>
      ))}
    </ul>
  );
}
