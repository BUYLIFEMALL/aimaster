import Link from "next/link";
import { getMyCustomer, getStoreBySlug, requireUser } from "@/lib/store";
import { getMyResellerApplication, getMyResellerSummary } from "@/lib/reseller-store";
import { RESELLER_APPLY_STATUS_LABEL, resellerApplyOpen } from "@/lib/reseller-apply";
import { cancelResellerApplyAction } from "@/lib/reseller-actions";
import { formatDateTime } from "@/lib/orders";
import PendingButton from "@/app/pending-button";
import ResellerApplyForm from "./apply-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// M1-4(0071) 리셀러 신청 — 이 몰 회원이 홍보 채널·정산 계좌·서류를 내면 몰 대표가 승인(코드 자동, 추가 수수료율 함께)
export default async function ResellerApplyPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const notice = await searchParams;
  const user = await requireUser(`/s/${slug}/reseller/apply`);
  const store = await getStoreBySlug(slug);
  const customer = await getMyCustomer(store.id, user.id);
  const [reseller, mine] = await Promise.all([customer ? getMyResellerSummary(store.id) : null, getMyResellerApplication(store.id, user.id)]);
  const open = resellerApplyOpen(store.modules);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8" data-reseller-apply>
      <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
        <Link href={`/s/${store.slug}`}>← {store.name}</Link>
        <span className="truncate">{user.email}</span>
      </div>
      <h1 className="mt-2 text-2xl font-bold">🤝 리셀러 신청</h1>
      <p className="mt-1 text-sm text-gray-600">
        승인되면 나만의 리셀러 링크가 생깁니다. 그 링크로 들어온 손님이 산 상품이 구매 확정되면 상품마다 정해진 리셀러 수수료가 쌓이고, 본사가 공급사 대신 지급합니다.
        블로그·인스타·카페 등 홍보할 채널과 정산받을 계좌를 적어 주세요.
      </p>
      {notice.error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{notice.error}</p>}
      {notice.ok && <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{notice.msg || "처리했습니다."}</p>}
      <div className="mt-5">
        {reseller?.active ? (
          <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            이미 이 몰의 리셀러입니다(코드 <b className="font-mono">{reseller.code}</b>). <Link href={`/s/${store.slug}/my#reseller`} className="underline">마이페이지에서 내 링크 보기</Link>
          </p>
        ) : !customer ? (
          <p className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">
            먼저 이 몰에 회원가입해 주세요. <Link href={`/s/${store.slug}/join`} className="text-blue-700 underline">회원가입하기 →</Link>
          </p>
        ) : mine?.status === "pending" ? (
          <div className="rounded border p-4 text-sm" data-apply-pending>
            <p><b>{mine.name}</b> · {RESELLER_APPLY_STATUS_LABEL.pending} <span className="text-xs text-gray-500">({formatDateTime(mine.created_at)} 신청)</span></p>
            <p className="mt-1 text-xs text-gray-500">몰 운영자가 확인하면 마이페이지에 「🤝 리셀러」가 생깁니다.</p>
            <form action={cancelResellerApplyAction.bind(null, store.slug, mine.id)} className="mt-2">
              <PendingButton pendingText="취소하는 중…" className="min-h-10 rounded border px-3 py-1.5 text-xs">신청 취소</PendingButton>
            </form>
          </div>
        ) : !open ? (
          <p className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-600">지금은 이 몰에서 리셀러 신청을 받지 않습니다. 몰 운영자에게 문의해 주세요.</p>
        ) : (
          <>
            {mine?.status === "rejected" && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">지난 신청이 반려됐습니다: {mine.note} — 고쳐서 다시 신청할 수 있습니다.</p>}
            <ResellerApplyForm storeId={store.id} userId={user.id} defaults={{ name: customer.name ?? "", phone: customer.phone ?? "" }} />
          </>
        )}
      </div>
    </main>
  );
}
