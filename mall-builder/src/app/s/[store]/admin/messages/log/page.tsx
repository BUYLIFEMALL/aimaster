import Link from "next/link";
import { getStaffStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import NotifyLog from "@/app/notify-log";
import { headers } from "next/headers";
import { NOTIFY_STATUS_LABEL, fillSite } from "@/lib/notify";
import { LOG_PAGE_SIZE, LOG_STATUSES, applyMessageLogFilters, messageLogHref, parseMessageLogQuery } from "@/lib/messages";
import { AdminShell, NoPermission } from "../../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// M2-12a 발송 내역 — 자동 알림과 직접 보낸 메시지를 한 곳에서 기간·통로·상태로 찾는다(받는 번호·메일은 가려서 보임)
export default async function MessageLogPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { store: slug } = await params;
  const f = parseMessageLogQuery(await searchParams);
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/messages/log`);
  if (!staff) return <NoPermission />;
  const supabase = await createClient();
  const query = supabase
    .from("mall_builder_notifications")
    .select("id, kind, channel, to_phone, to_email, body, status, error, created_at, sent_at", { count: "exact" })
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .range((f.page - 1) * LOG_PAGE_SIZE, f.page * LOG_PAGE_SIZE - 1);
  const { data, count } = await applyMessageLogFilters(query, f);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : "";
  const rows = ((data ?? []) as Parameters<typeof NotifyLog>[0]["rows"]).map((r) => (origin ? { ...r, body: fillSite(r.body, origin) } : r));
  const total = count ?? rows.length;
  const pages = Math.max(1, Math.ceil(total / LOG_PAGE_SIZE));
  const base = `/s/${store.slug}/admin/messages/log`;
  const narrowed = Boolean(f.channel || f.status || f.source || f.from || f.to);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/messages/log">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold">발송 내역</h1>
        <Link href={`/s/${store.slug}/admin/messages`} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">메시지 보내기</Link>
      </div>
      <form method="get" action={base} className="mt-3 flex flex-wrap items-end gap-2 text-sm" data-log-search>
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">종류</span>
          <select name="source" defaultValue={f.source ?? ""} className="rounded border px-2 py-1.5">
            <option value="">전체</option>
            <option value="manual">직접 보낸 메시지</option>
            <option value="auto">자동 알림</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">통로</span>
          <select name="channel" defaultValue={f.channel ?? ""} className="rounded border px-2 py-1.5">
            <option value="">전체</option>
            <option value="sms">문자</option>
            <option value="email">메일</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">결과</span>
          <select name="status" defaultValue={f.status ?? ""} className="rounded border px-2 py-1.5">
            <option value="">전체</option>
            {LOG_STATUSES.map((s) => (
              <option key={s} value={s}>{NOTIFY_STATUS_LABEL[s] ?? s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">시작일</span>
          <input type="date" name="from" defaultValue={f.from ?? ""} className="rounded border px-2 py-1" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">종료일</span>
          <input type="date" name="to" defaultValue={f.to ?? ""} className="rounded border px-2 py-1" />
        </label>
        <button className="rounded bg-gray-900 px-3 py-1.5 text-white">찾기</button>
        {narrowed && <Link href={base} className="py-1.5 text-gray-500 underline">조건 지우기</Link>}
      </form>
      <p className="mt-2 text-sm text-gray-600" data-log-found>{narrowed ? `찾은 기록 ${total.toLocaleString("ko-KR")}건` : `기록 ${total.toLocaleString("ko-KR")}건`}</p>
      <div className="mt-2">
        <NotifyLog rows={rows} empty="조건에 맞는 발송 기록이 없습니다." />
      </div>
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-2 text-sm" data-log-pages>
          {f.page > 1 ? <Link href={messageLogHref(base, f, { page: f.page - 1 })} className="rounded bg-gray-100 px-3 py-1.5">‹ 이전</Link> : <span className="px-3 py-1.5 text-gray-300">‹ 이전</span>}
          <span className="text-gray-600">{f.page} / {pages}</span>
          {f.page < pages ? <Link href={messageLogHref(base, f, { page: f.page + 1 })} className="rounded bg-gray-100 px-3 py-1.5">다음 ›</Link> : <span className="px-3 py-1.5 text-gray-300">다음 ›</span>}
        </nav>
      )}
    </AdminShell>
  );
}
