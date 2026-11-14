import Link from "next/link";
import { getProductInquiries, getProductReviews } from "@/lib/store";
import { formatDateTime } from "@/lib/orders";
import { MAX_INQUIRY_BODY, MAX_INQUIRY_TITLE, stars } from "@/lib/reviews";
import { removeInquiryAction, writeInquiryAction } from "@/lib/review-actions";
import DeleteButton from "@/app/s/[store]/admin/categories/delete-button";

// 상품 상세 아래 후기·문의(D13) — 106번 네오 모던 B2B 커머스 스튜디오 스타일 리뉴얼
export default async function ProductBoards({
  slug, storeId, productId, loggedIn, isCustomer,
}: { slug: string; storeId: string; productId: string; loggedIn: boolean; isCustomer: boolean }) {
  const [reviews, inquiries] = await Promise.all([getProductReviews(productId), getProductInquiries(productId)]);
  const base = `/s/${slug}`;
  const back = `${base}/p/${productId}`;

  return (
    <div className="space-y-12">
      {/* 구매 후기 섹션 */}
      <section className="scroll-mt-24 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs" id="reviews" data-reviews>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-50 text-amber-500 text-sm">⭐</span>
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                구매 후기 <span className="text-slate-400 font-bold ml-1">({reviews.count})</span>
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              실제 배송이 완료된 주문의 「주문 내역」에서 후기를 작성하실 수 있습니다.
            </p>
          </div>

          {reviews.average != null && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 px-4 py-2 self-start sm:self-auto">
              <span className="text-amber-500 text-base">{stars(reviews.average)}</span>
              <span className="text-lg font-black text-amber-900">{reviews.average.toFixed(1)}</span>
              <span className="text-xs text-amber-700/80 font-medium">/ 5.0</span>
            </div>
          )}
        </div>

        {reviews.items.length === 0 ? (
          <div className="py-12 text-center">
            <span className="text-3xl">📝</span>
            <p className="mt-2 text-sm font-medium text-slate-500">아직 등록된 구매 후기가 없습니다.</p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {reviews.items.map((r) => (
              <li key={r.id} className="py-5" data-review>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold text-sm tracking-widest">{stars(r.rating)}</span>
                    <span className="font-bold text-xs text-slate-900">
                      {r.author}
                      {r.mine && (
                        <span className="ml-1.5 rounded-md bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">
                          내 후기
                        </span>
                      )}
                    </span>
                    {r.option && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        선택: {r.option}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{formatDateTime(r.created_at)}</span>
                </div>

                <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-slate-700">{r.body}</p>

                {r.reply && (
                  <div className="mt-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 p-4" data-review-reply>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                      <span>💬</span>
                      <span>판매자 공식 답변</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-700">{r.reply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 상품 문의 섹션 */}
      <section className="scroll-mt-24 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs" id="inquiries" data-inquiries>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-sm">💬</span>
            <h2 className="text-lg font-black tracking-tight text-slate-900">
              상품 문의 <span className="text-slate-400 font-bold ml-1">({inquiries.count})</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            상품 규격, 대량 견적, 배송 일정에 대해 궁금한 점을 문의하세요.
          </p>
        </div>

        {/* 문의 작성 폼 */}
        <div className="mt-6">
          {isCustomer ? (
            <form action={writeInquiryAction.bind(null, slug, storeId, "product", productId, back)} className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 sm:p-5 space-y-3" data-inquiry-form>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span>✏️</span>
                <span>새 문의 남기기</span>
              </h3>
              <input
                name="title"
                required
                maxLength={MAX_INQUIRY_TITLE}
                placeholder="문의 제목 (예: 대량 주문 시 납기 일정 문의)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden"
              />
              <textarea
                name="body"
                required
                maxLength={MAX_INQUIRY_BODY}
                rows={3}
                placeholder="궁금한 내용을 상세히 적어 주시면 판매자가 확인 후 답변드립니다."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden leading-relaxed"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input type="checkbox" name="secret" className="rounded border-slate-300 text-blue-600" />
                  <span>🔒 비밀글 설정 (작성자와 상점 운영자만 열람)</span>
                </label>
                <button className="btn-3d-dark px-4 py-2 text-xs font-bold">
                  문의 등록하기
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 flex items-center justify-between gap-3">
              <span>
                {loggedIn
                  ? "문의는 이 쇼핑몰에 가입한 고객 회원만 작성하실 수 있습니다."
                  : "로그인하신 후에 상품 문의를 작성하실 수 있습니다."}
              </span>
              {loggedIn ? (
                <Link href={`${base}/join`} className="btn-3d-blue px-3 py-1.5 text-xs">
                  쇼핑몰 회원가입
                </Link>
              ) : (
                <Link href={`/login?next=${encodeURIComponent(back)}`} className="btn-3d-blue px-3 py-1.5 text-xs">
                  로그인하기
                </Link>
              )}
            </div>
          )}
        </div>

        {/* 문의 목록 */}
        {inquiries.items.length === 0 ? (
          <div className="py-10 text-center">
            <span className="text-3xl">❓</span>
            <p className="mt-2 text-sm font-medium text-slate-500">등록된 상품 문의가 없습니다.</p>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-slate-100">
            {inquiries.items.map((q) => (
              <li key={q.id} className="py-4 sm:py-5" data-inquiry>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        q.answered
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {q.answered ? "답변 완료" : "답변 대기"}
                    </span>
                    {q.is_secret && <span className="text-xs" title="비밀글">🔒</span>}
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">{q.title}</h4>
                    <span className="text-[11px] text-slate-400">
                      {q.author}
                      {q.mine && (
                        <span className="ml-1 rounded bg-slate-100 px-1 py-0.2 text-[10px] text-slate-600">
                          내 문의
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{formatDateTime(q.created_at)}</span>
                </div>

                {q.body != null && (
                  <p className="mt-2 whitespace-pre-line text-xs sm:text-sm leading-relaxed text-slate-700 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    {q.body}
                  </p>
                )}

                {q.answer && (
                  <div className="mt-3 rounded-2xl bg-blue-50/70 border border-blue-100 p-4" data-inquiry-answer>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                      <span>답변</span>
                      <span>판매자 공식 답변</span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-700">{q.answer}</p>
                  </div>
                )}

                {q.mine && (
                  <div className="mt-2 text-right">
                    <DeleteButton name={q.title} noun="문의" action={removeInquiryAction.bind(null, slug, back, q.id)} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
