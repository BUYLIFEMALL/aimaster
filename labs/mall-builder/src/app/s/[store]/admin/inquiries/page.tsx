import Link from "next/link";
import { getStaffStore, getStoreInquiries } from "@/lib/store";
import { formatDateTime } from "@/lib/orders";
import { INQUIRY_KIND_LABEL, MAX_ANSWER } from "@/lib/reviews";
import { answerInquiryAction } from "@/lib/review-actions";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 운영자 문의 관리(D13) — 상품 문의·1:1 문의에 답변·숨기기. 답변 안 한 것이 위에 온다
export default async function AdminInquiriesPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/inquiries`);
  if (!staff) return <NoPermission />;
  const all = await getStoreInquiries(store.id);
  const list = [...all.filter((q) => !q.answer), ...all.filter((q) => q.answer)];
  const waiting = all.filter((q) => !q.answer).length;

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/inquiries">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
      <h2 className="text-sm font-semibold">문의 ({all.length}) · 답변 대기 <b className={waiting ? "text-red-700" : ""}>{waiting}</b></h2>
      {all.length === 0 && <p className="mt-2 text-sm text-gray-500">아직 문의가 없습니다.</p>}
      <ul className="mt-2 divide-y rounded border text-sm" data-admin-inquiries>
        {list.map((q) => (
          <li key={q.id} className={`px-3 py-3 ${q.is_hidden ? "bg-gray-50 text-gray-500" : ""}`}>
            <p className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-1.5 text-xs ${q.answer ? "bg-gray-900 text-white" : "bg-red-50 text-red-700"}`}>{q.answer ? "답변 완료" : "답변 대기"}</span>
              <span className="text-xs text-gray-500">{INQUIRY_KIND_LABEL[q.kind]}{q.is_secret && " 🔒"}</span>
              <span className="font-medium">{q.title}</span>
              <span>{q.customer?.name ?? "손님"}{q.customer?.phone && ` · ${q.customer.phone}`}</span>
              <span className="text-xs text-gray-400">{formatDateTime(q.created_at)}</span>
              {q.is_hidden && <span className="rounded bg-gray-200 px-1.5 text-xs">숨김</span>}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {q.product_id && q.product && <Link href={`/s/${store.slug}/p/${q.product_id}#inquiries`} className="underline">{q.product.name}</Link>}
              {q.order_id && q.order && <> · <Link href={`/s/${store.slug}/admin/orders/${q.order_id}`} className="underline">주문 {q.order.order_no}</Link></>}
            </p>
            <p className="mt-1 whitespace-pre-line">{q.body}</p>
            <form action={answerInquiryAction.bind(null, store.slug, q.id)} className="mt-2 flex flex-wrap items-end gap-2">
              <textarea name="answer" defaultValue={q.answer ?? ""} maxLength={MAX_ANSWER} rows={3} placeholder="답변(비우면 답변 지움)" className="min-w-0 flex-1 rounded border px-2 py-1.5" />
              {q.kind === "product" && <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="hidden" defaultChecked={q.is_hidden} /> 상품 화면에서 숨김</label>}
              <button className="rounded bg-gray-900 px-3 py-1.5 text-xs text-white">{q.answer ? "답변 고치기" : "답변 달기"}</button>
            </form>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
