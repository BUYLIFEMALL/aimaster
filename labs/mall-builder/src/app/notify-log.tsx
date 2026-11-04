// 주문 알림 기록 목록(운영자 화면 전용) — 받는 번호는 뒤 4자리만 보인다
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/orders";
import { maskPhone, NOTIFY_KIND_LABEL, NOTIFY_STATUS_LABEL } from "@/lib/notify";

type Row = { id: string; kind: string; to_phone: string; body: string; status: string; error: string; created_at: string; sent_at: string | null };

export async function loadNotifyLog(storeId: string, orderId?: string, limit = 20): Promise<Row[]> {
  const supabase = await createClient();
  let q = supabase
    .from("mall_builder_notifications")
    .select("id, kind, to_phone, body, status, error, created_at, sent_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (orderId) q = q.eq("order_id", orderId);
  const { data } = await q;
  return (data ?? []) as Row[];
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
            <span>{NOTIFY_KIND_LABEL[r.kind] ?? r.kind}</span>
            <span className="text-gray-500">{maskPhone(r.to_phone)}</span>
            <b className={STATUS_COLOR[r.status] ?? ""}>{NOTIFY_STATUS_LABEL[r.status] ?? r.status}</b>
            {r.error && <span className="text-red-600">— {r.error}</span>}
          </div>
          <p className="mt-0.5 break-words text-gray-600">{r.body}</p>
        </li>
      ))}
    </ul>
  );
}
