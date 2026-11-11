import Link from "next/link";
import { getStaffStore, getStoreReviews } from "@/lib/store";
import { formatDateTime } from "@/lib/orders";
import { MAX_REPLY, stars } from "@/lib/reviews";
import { moderateReviewAction } from "@/lib/review-actions";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 운영자 후기 관리(D13) — 답글·숨기기. 손님 화면에는 숨긴 후기가 안 보인다
export default async function AdminReviewsPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/reviews`);
  if (!staff) return <NoPermission />;
  const reviews = await getStoreReviews(store.id);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/reviews">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
      <h2 className="text-sm font-semibold">후기 ({reviews.length})</h2>
      {reviews.length === 0 && <p className="mt-2 text-sm text-gray-500">아직 후기가 없습니다. 손님이 배송 완료된 주문에서 후기를 쓰면 여기에 보입니다.</p>}
      <ul className="mt-2 divide-y rounded border text-sm" data-admin-reviews>
        {reviews.map((r) => (
          <li key={r.id} className={`px-3 py-3 ${r.is_hidden ? "bg-gray-50 text-gray-500" : ""}`}>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-amber-500">{stars(r.rating)}</span>
              <Link href={`/s/${store.slug}/p/${r.product_id}#reviews`} className="font-medium underline">{r.product?.name ?? "(상품 없음)"}</Link>
              <span>{r.customer?.name ?? "손님"}</span>
              <span className="text-xs text-gray-400">{formatDateTime(r.created_at)}</span>
              {r.is_hidden && <span className="rounded bg-gray-200 px-1.5 text-xs">숨김</span>}
            </p>
            <p className="mt-1 whitespace-pre-line">{r.body}</p>
            <form action={moderateReviewAction.bind(null, store.slug, r.id)} className="mt-2 flex flex-wrap items-end gap-2">
              <textarea name="reply" defaultValue={r.reply ?? ""} maxLength={MAX_REPLY} rows={2} placeholder="답글(비우면 답글 지움)" className="min-w-0 flex-1 rounded border px-2 py-1.5" />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="hidden" defaultChecked={r.is_hidden} /> 손님에게 숨김</label>
              <button className="rounded bg-gray-900 px-3 py-1.5 text-xs text-white">저장</button>
            </form>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
