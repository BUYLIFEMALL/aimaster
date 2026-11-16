import Link from "next/link";
import { getStaffStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/orders";
import { applyCustomerFilters, customerListHref, parseCustomerListQuery } from "@/lib/customer-list";
import { isUuid } from "@/lib/product-list";
import { AdminShell, NoPermission } from "../admin-shell";
import { sendMessageAction } from "./actions";
import MessageForm from "./message-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// M2-12a 운영사 메시지 보내기 — 유저 한 명(?customer=)·주문 한 건(?order=)·유저 목록 조건(M2-8과 같은 주소 조건, 없으면 전체 유저)
export default async function MessagesPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { store: slug } = await params;
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/messages`);
  if (!staff) return <NoPermission />;
  const supabase = await createClient();

  // 받는 사람
  let target: { kind: "customer"; customerId: string } | { kind: "order"; orderId: string } | { kind: "filter"; filter: string };
  let targetLabel: string;
  let backHref: string;
  const customerId = one("customer");
  const orderId = one("order");
  if (isUuid(customerId)) {
    const { data } = await supabase.from("mall_builder_store_customers").select("id, name, marketing_agree").eq("store_id", store.id).eq("id", customerId).maybeSingle();
    if (!data) return <AdminShell slug={store.slug} storeName={store.name} active="/messages"><p className="text-sm text-gray-500">유저를 찾을 수 없습니다.</p></AdminShell>;
    target = { kind: "customer", customerId };
    targetLabel = `유저 ${data.name} 한 명${data.marketing_agree ? "" : " (광고 수신 미동의)"}`;
    backHref = `/s/${store.slug}/admin/customers/${customerId}`;
  } else if (isUuid(orderId)) {
    const { data } = await supabase.from("mall_builder_orders").select("id, order_no").eq("store_id", store.id).eq("id", orderId).maybeSingle();
    if (!data) return <AdminShell slug={store.slug} storeName={store.name} active="/messages"><p className="text-sm text-gray-500">주문을 찾을 수 없습니다.</p></AdminShell>;
    target = { kind: "order", orderId };
    targetLabel = `주문 ${data.order_no}의 받는 분(문자)·주문자(메일)`;
    backHref = `/s/${store.slug}/admin/orders/${orderId}`;
  } else {
    const f = { ...parseCustomerListQuery(sp), page: 1 };
    const filter = customerListHref("", f, {}).replace(/^\?/, "");
    const countOf = async (agreeOnly: boolean): Promise<number> => {
      let q = supabase.from("mall_builder_store_customers").select("id", { count: "exact", head: true }).eq("store_id", store.id);
      if (agreeOnly) q = q.eq("marketing_agree", true);
      const { count } = await applyCustomerFilters(q, f);
      return count ?? 0;
    };
    const [count, agreed] = await Promise.all([countOf(false), countOf(true)]);
    target = { kind: "filter", filter };
    targetLabel = `${filter ? "유저 목록 조건에 맞는" : "전체"} 유저 ${count.toLocaleString("ko-KR")}명 (광고 수신 동의 ${agreed.toLocaleString("ko-KR")}명)`;
    backHref = `/s/${store.slug}/admin/customers${filter ? `?${filter}` : ""}`;
  }

  const [{ data: ns }, { data: sched }, { data: campaigns }] = await Promise.all([
    supabase.from("mall_builder_store_notify_settings").select("sender_phone, email_from, optout_text, bulk_once, bulk_day").eq("store_id", store.id).maybeSingle(),
    supabase.from("mall_builder_store_schedulers").select("job_id, paused").eq("store_id", store.id).maybeSingle(),
    supabase.from("mall_builder_campaigns").select("id, channel, is_ad, subject, body, target_count, queued_count, skipped, created_at").eq("store_id", store.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const connected = Boolean(sched?.job_id) && !sched?.paused;
  const base = `/s/${store.slug}/admin/messages`;

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/messages">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold">메시지 보내기</h1>
        <div className="flex gap-2 text-sm">
          <Link href={`${base}/log`} className="rounded border px-3 py-1.5 hover:bg-gray-50">발송 내역</Link>
          <Link href={`${base}/settings`} className="rounded border px-3 py-1.5 hover:bg-gray-50">메시지 설정</Link>
        </div>
      </div>

      <ul className="mt-3 space-y-1 rounded border bg-gray-50 px-3 py-2 text-xs text-gray-600" data-message-ready>
        <li>{connected ? "✅" : "⚠"} 예약 실행(cron-job.org) {connected ? "연결됨 — 1분마다 차례로 보냅니다" : "연결 안 됨 — 쇼핑몰 정보 화면 「입금 기한 자동 취소」에서 cron-job.org를 먼저 연결해 주세요"}</li>
        <li>{ns?.sender_phone ? "✅" : "⚠"} 문자: 발신번호 {ns?.sender_phone ? "등록됨" : "없음(쇼핑몰 정보 → 「주문 알림(문자)」에서 솔라피 키·발신번호 등록)"}</li>
        <li>{ns?.email_from ? "✅" : "⚠"} 메일: 보내는 주소 {ns?.email_from ? "등록됨" : "없음(쇼핑몰 정보 → 「주문 알림(메일)」에서 Resend 키·주소 등록)"}</li>
        <li>{ns?.optout_text ? "✅" : "⚠"} 광고 수신 거부 안내 {ns?.optout_text ? `「${ns.optout_text}」` : "없음 — 광고를 보내려면 「메시지 설정」에서 적어 주세요"}</li>
        <li>· 한 번 {(ns?.bulk_once ?? 1000).toLocaleString("ko-KR")}명 · 하루 {(ns?.bulk_day ?? 3000).toLocaleString("ko-KR")}명까지 · 문자·메일 요금은 운영사 본인 솔라피·Resend 계정에서 나갑니다</li>
      </ul>

      <section className="mt-4 rounded-lg border p-4">
        <p className="text-sm">
          받는 사람: <b data-message-target>{targetLabel}</b>{" "}
          <Link href={backHref} className="text-xs text-blue-700 underline">{target.kind === "filter" ? "유저 목록에서 조건 바꾸기" : "돌아가기"}</Link>
        </p>
        <div className="mt-3">
          <MessageForm action={sendMessageAction.bind(null, store.slug)} target={target} storeName={store.name} optout={ns?.optout_text ?? ""} allowAd={target.kind !== "order"} />
        </div>
      </section>

      <h2 className="mt-8 text-sm font-bold">최근 보낸 메시지</h2>
      {(campaigns ?? []).length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">아직 보낸 메시지가 없습니다.</p>
      ) : (
        <ul className="mt-2 divide-y rounded border text-sm" data-campaigns>
          {(campaigns ?? []).map((c) => {
            const sk = (c.skipped ?? {}) as { no_agree?: number; no_contact?: number };
            return (
              <li key={c.id as string} className="px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                  <span>{formatDateTime(c.created_at as string)}</span>
                  <span className="rounded bg-gray-100 px-1.5">{c.channel === "email" ? "메일" : "문자"}</span>
                  {c.is_ad && <span className="rounded bg-amber-100 px-1.5 text-amber-800">광고</span>}
                  <span>{(c.queued_count as number).toLocaleString("ko-KR")}명</span>
                  {(sk.no_agree ?? 0) + (sk.no_contact ?? 0) > 0 && <span>(제외 {(sk.no_agree ?? 0) + (sk.no_contact ?? 0)}명)</span>}
                </div>
                <p className="mt-0.5 truncate">{(c.subject as string) || (c.body as string)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
