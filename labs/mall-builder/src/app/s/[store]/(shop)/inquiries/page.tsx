import Link from "next/link";
import { getMyCustomer, getMyInquiries, getMyOrders, getStoreBySlug, requireUser } from "@/lib/store";
import { formatDateTime } from "@/lib/orders";
import { INQUIRY_KIND_LABEL, MAX_INQUIRY_BODY, MAX_INQUIRY_TITLE } from "@/lib/reviews";
import { editInquiryAction, removeInquiryAction, writeInquiryAction } from "@/lib/review-actions";
import DeleteButton from "@/app/s/[store]/admin/categories/delete-button";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 손님 1:1 문의(D13) — 늘 비밀글. 상품 문의도 여기서 함께 보인다
export default async function InquiriesPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg } = await searchParams;
  const base = `/s/${slug}`;
  const back = `${base}/inquiries`;
  const user = await requireUser(back);
  const store = await getStoreBySlug(slug);
  const customer = await getMyCustomer(store.id, user.id);
  if (!customer) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">이 몰에 먼저 가입해 주세요</h1>
        <p className="mt-2 text-sm text-gray-600">문의는 이 몰에 가입한 손님만 남길 수 있습니다.</p>
        <Link href={`${base}/join`} className="mt-4 inline-block rounded bg-gray-900 px-4 py-2 text-sm text-white">이 몰 가입하기</Link>
      </main>
    );
  }
  const [inquiries, orders] = await Promise.all([getMyInquiries(store.id, user.id), getMyOrders(store.id, user.id)]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">1:1 문의</h1>
        <Link href={`${base}/my`} className="text-sm underline">마이페이지</Link>
      </div>
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-inquiry-error>{error}</p>}
      {ok && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700" data-inquiry-ok>{msg || "처리했습니다."}</p>}

      <form action={writeInquiryAction.bind(null, slug, store.id, "personal", null, back)} className="mt-4 space-y-2 rounded border p-3" data-new-inquiry>
        <h2 className="text-sm font-semibold">새 문의 <span className="font-normal text-gray-500">(나와 운영자만 볼 수 있습니다)</span></h2>
        <select name="order_id" className="w-full rounded border px-2 py-1.5 text-sm">
          <option value="">관련 주문 없음</option>
          {orders.map((o) => <option key={o.id} value={o.id}>{o.order_no} · {o.first_item}{o.item_count > 1 ? ` 외 ${o.item_count - 1}` : ""}</option>)}
        </select>
        <input name="title" required maxLength={MAX_INQUIRY_TITLE} placeholder="문의 제목" className="w-full rounded border px-2 py-1.5 text-sm" />
        <textarea name="body" required maxLength={MAX_INQUIRY_BODY} rows={4} placeholder="문의 내용" className="w-full rounded border px-2 py-1.5 text-sm" />
        <div className="text-right"><button className="min-h-10 rounded bg-gray-900 px-4 text-sm text-white">문의 남기기</button></div>
      </form>

      <h2 className="mt-8 text-sm font-semibold">내 문의 ({inquiries.length})</h2>
      {inquiries.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">아직 남긴 문의가 없습니다.</p>
      ) : (
        <ul className="mt-2 divide-y rounded border text-sm" data-my-inquiries>
          {inquiries.map((q) => (
            <li key={q.id} className="px-3 py-3">
              <p className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 text-xs ${q.answer ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>{q.answer ? "답변 완료" : "답변 대기"}</span>
                <span className="text-xs text-gray-500">{INQUIRY_KIND_LABEL[q.kind]}</span>
                <span className="font-medium">{q.title}</span>
                <span className="text-xs text-gray-400">{formatDateTime(q.created_at)}</span>
              </p>
              <p className="mt-1 whitespace-pre-line text-gray-700">{q.body}</p>
              {q.answer ? (
                <p className="mt-2 rounded bg-gray-50 px-3 py-2" data-my-answer>
                  <b className="text-xs text-gray-500">운영자 답변{q.answered_at && ` · ${formatDateTime(q.answered_at)}`}</b>
                  <span className="mt-1 block whitespace-pre-line">{q.answer}</span>
                </p>
              ) : (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-500">고치기</summary>
                  <form action={editInquiryAction.bind(null, slug, back, q.id)} className="mt-2 space-y-2">
                    <input name="title" defaultValue={q.title} required maxLength={MAX_INQUIRY_TITLE} className="w-full rounded border px-2 py-1.5" />
                    <textarea name="body" defaultValue={q.body} required maxLength={MAX_INQUIRY_BODY} rows={3} className="w-full rounded border px-2 py-1.5" />
                    <div className="text-right"><button className="rounded border px-3 py-1 text-xs">고치기 저장</button></div>
                  </form>
                </details>
              )}
              <div className="mt-2"><DeleteButton name={q.title} noun="문의" action={removeInquiryAction.bind(null, slug, back, q.id)} /></div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
