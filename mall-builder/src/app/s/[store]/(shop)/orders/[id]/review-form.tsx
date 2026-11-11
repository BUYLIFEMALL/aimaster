import { MAX_REVIEW_BODY, stars } from "@/lib/reviews";
import { removeReviewAction, writeReviewAction } from "@/lib/review-actions";
import type { MyReview } from "@/lib/store";
import DeleteButton from "@/app/s/[store]/admin/categories/delete-button";

// 주문 상세 품목 아래 후기 쓰기(D13) — 배송 완료·구매 확정 품목만 보인다. 이미 쓴 후기는 고치기·지우기
export default function ReviewForm({ slug, orderId, orderItemId, review }: { slug: string; orderId: string; orderItemId: string; review: MyReview | null }) {
  return (
    <details className="mt-2 rounded bg-gray-50 px-3 py-2 text-sm" data-review-form>
      <summary className="cursor-pointer">
        {review ? <>내 후기 <span className="text-amber-500">{stars(review.rating)}</span> · 고치기</> : "후기 쓰기"}
      </summary>
      <form action={writeReviewAction.bind(null, slug, orderId, orderItemId)} className="mt-2 space-y-2">
        <label className="block">
          <span className="text-xs text-gray-500">별점</span>
          <select name="rating" defaultValue={review?.rating ?? 5} className="mt-0.5 rounded border px-2 py-1.5">
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{stars(n)} {n}점</option>)}
          </select>
        </label>
        <textarea name="body" defaultValue={review?.body ?? ""} required minLength={5} maxLength={MAX_REVIEW_BODY} rows={3} placeholder="상품은 어떠셨나요? (5자 이상)" className="w-full rounded border px-2 py-1.5" />
        <div className="flex items-center justify-between">
          {review ? <DeleteButton name="내 후기" noun="후기" message="이 후기를 지울까요?" action={removeReviewAction.bind(null, slug, `/s/${slug}/orders/${orderId}`, review.id)} /> : <span />}
          <button className="min-h-10 rounded bg-gray-900 px-4 text-white">{review ? "후기 고치기" : "후기 남기기"}</button>
        </div>
      </form>
      {review?.reply && <p className="mt-2 text-gray-600"><b className="text-xs text-gray-500">운영자 답글</b> · {review.reply}</p>}
    </details>
  );
}
