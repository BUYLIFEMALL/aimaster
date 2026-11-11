import Link from "next/link";
import { getProductInquiries, getProductReviews } from "@/lib/store";
import { formatDateTime } from "@/lib/orders";
import { MAX_INQUIRY_BODY, MAX_INQUIRY_TITLE, stars } from "@/lib/reviews";
import { removeInquiryAction, writeInquiryAction } from "@/lib/review-actions";
import DeleteButton from "@/app/s/[store]/admin/categories/delete-button";

// 상품 상세 아래 후기·문의(D13) — 목록은 이름을 가리고 비밀글을 가려 주는 DB 함수로 읽는다
export default async function ProductBoards({
  slug, storeId, productId, loggedIn, isCustomer,
}: { slug: string; storeId: string; productId: string; loggedIn: boolean; isCustomer: boolean }) {
  const [reviews, inquiries] = await Promise.all([getProductReviews(productId), getProductInquiries(productId)]);
  const base = `/s/${slug}`;
  const back = `${base}/p/${productId}`;

  return (
    <>
      <section className="mt-12 border-t pt-8" id="reviews" data-reviews>
        <h2 className="mb-1 font-semibold">
          구매 후기 <span className="text-gray-500">({reviews.count})</span>
          {reviews.average != null && <span className="ml-2 text-amber-500">{stars(reviews.average)} {reviews.average.toFixed(1)}</span>}
        </h2>
        <p className="mb-4 text-xs text-gray-500">후기는 배송 완료된 주문의 「주문 내역」에서 쓸 수 있습니다.</p>
        {reviews.items.length === 0 ? (
          <p className="text-sm text-gray-500">아직 후기가 없습니다.</p>
        ) : (
          <ul className="divide-y border-y text-sm">
            {reviews.items.map((r) => (
              <li key={r.id} className="py-3" data-review>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-amber-500">{stars(r.rating)}</span>
                  <span className="text-gray-700">{r.author}{r.mine && <span className="ml-1 rounded bg-gray-100 px-1 text-xs">내 후기</span>}</span>
                  {r.option && <span className="text-xs text-gray-400">{r.option}</span>}
                  <span className="text-xs text-gray-400">{formatDateTime(r.created_at)}</span>
                </p>
                <p className="mt-1 whitespace-pre-line">{r.body}</p>
                {r.reply && (
                  <p className="mt-2 rounded bg-gray-50 px-3 py-2 text-gray-700" data-review-reply>
                    <b className="text-xs text-gray-500">운영자 답글</b> · {r.reply}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 border-t pt-8" id="inquiries" data-inquiries>
        <h2 className="mb-4 font-semibold">상품 문의 <span className="text-gray-500">({inquiries.count})</span></h2>
        {isCustomer ? (
          <form action={writeInquiryAction.bind(null, slug, storeId, "product", productId, back)} className="mb-6 space-y-2 rounded border p-3" data-inquiry-form>
            <input name="title" required maxLength={MAX_INQUIRY_TITLE} placeholder="문의 제목" className="w-full rounded border px-2 py-1.5 text-sm" />
            <textarea name="body" required maxLength={MAX_INQUIRY_BODY} rows={3} placeholder="궁금한 점을 적어 주세요" className="w-full rounded border px-2 py-1.5 text-sm" />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="secret" /> 비밀글(나와 운영자만 봄)</label>
              <button className="min-h-10 rounded bg-gray-900 px-4 text-sm text-white">문의 남기기</button>
            </div>
          </form>
        ) : (
          <p className="mb-6 rounded bg-gray-50 px-3 py-2 text-sm text-gray-600">
            {loggedIn ? <>문의는 이 몰에 가입한 손님만 남길 수 있습니다. <Link href={`${base}/join`} className="underline">이 몰 가입하기</Link></>
              : <><Link href={`/login?next=${encodeURIComponent(back)}`} className="underline">로그인</Link> 뒤에 문의를 남길 수 있습니다.</>}
          </p>
        )}
        {inquiries.items.length === 0 ? (
          <p className="text-sm text-gray-500">아직 문의가 없습니다.</p>
        ) : (
          <ul className="divide-y border-y text-sm">
            {inquiries.items.map((q) => (
              <li key={q.id} className="py-3" data-inquiry>
                <p className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-1.5 text-xs ${q.answered ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>{q.answered ? "답변 완료" : "답변 대기"}</span>
                  {q.is_secret && <span className="text-xs text-gray-400">🔒</span>}
                  <span className="font-medium">{q.title}</span>
                  <span className="text-gray-500">{q.author}{q.mine && <span className="ml-1 rounded bg-gray-100 px-1 text-xs">내 문의</span>}</span>
                  <span className="text-xs text-gray-400">{formatDateTime(q.created_at)}</span>
                </p>
                {q.body != null && <p className="mt-1 whitespace-pre-line">{q.body}</p>}
                {q.answer && (
                  <p className="mt-2 rounded bg-gray-50 px-3 py-2 text-gray-700" data-inquiry-answer>
                    <b className="text-xs text-gray-500">운영자 답변</b> · <span className="whitespace-pre-line">{q.answer}</span>
                  </p>
                )}
                {q.mine && <div className="mt-2"><DeleteButton name={q.title} noun="문의" action={removeInquiryAction.bind(null, slug, back, q.id)} /></div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
