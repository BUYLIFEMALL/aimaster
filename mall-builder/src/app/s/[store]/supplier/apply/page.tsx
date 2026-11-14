import Link from "next/link";
import { getSupplierContext, SupplierShell } from "../supplier-shell";
import { getMySupplierApplication } from "@/lib/supplier-store";
import { SUPPLIER_APPLY_STATUS_LABEL, supplierApplyOpen } from "@/lib/supplier-apply";
import { cancelSupplierApplyAction } from "@/lib/supplier-actions";
import { formatDateTime } from "@/lib/orders";
import PendingButton from "@/app/pending-button";
import SupplierApplyForm from "./apply-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// M1-0(0070) 공급사 입점 신청 — 로그인 회원이 회사 정보·사업자등록증을 내면 본사가 승인(본사 판매수수료율도 그때 정함)
export default async function SupplierApplyPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const notice = await searchParams;
  const { user, store, me } = await getSupplierContext(slug, `/s/${slug}/supplier/apply`);
  const mine = me ? null : await getMySupplierApplication(store.id, user.id);
  const open = supplierApplyOpen(store.modules);
  return (
    <SupplierShell slug={store.slug} storeName={store.name} email={user.email ?? ""} active="/apply" notice={notice}>
      <h2 className="text-lg font-semibold">🏭 공급사 입점 신청</h2>
      <p className="mt-1 text-sm text-gray-600">
        상품을 등록하면 본사가 판매·노출·결제·정산을 맡고, 리셀러가 제휴 링크로 함께 팝니다. 공급사는 상품을 올릴 때 판매가와 리셀러 판매수수료율을 정하고,
        팔리면 판매가에서 본사 판매수수료와 리셀러 수수료를 뺀 공급가를 정산받습니다.
      </p>
      <div className="mt-4" data-supplier-apply>
        {me ? (
          <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            이미 이 몰의 공급사입니다. <Link href={`/s/${store.slug}/supplier`} className="underline">공급사 화면으로 가기</Link>
          </p>
        ) : mine?.status === "pending" ? (
          <div className="rounded border p-4 text-sm" data-apply-pending>
            <p>
              <b>{mine.company}</b> · {SUPPLIER_APPLY_STATUS_LABEL.pending} <span className="text-xs text-gray-500">({formatDateTime(mine.created_at)} 신청)</span>
            </p>
            <p className="mt-1 text-xs text-gray-500">본사가 확인하면 이 계정으로 공급사 화면을 쓸 수 있습니다.</p>
            <form action={cancelSupplierApplyAction.bind(null, store.slug, mine.id)} className="mt-2">
              <PendingButton pendingText="취소하는 중…" className="min-h-10 rounded border px-3 py-1.5 text-xs">신청 취소</PendingButton>
            </form>
          </div>
        ) : !open ? (
          <p className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-600">지금은 이 몰에서 입점 신청을 받지 않습니다. 몰 운영자에게 문의해 주세요.</p>
        ) : (
          <>
            {mine?.status === "rejected" && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">지난 신청이 반려됐습니다: {mine.note} — 고쳐서 다시 신청할 수 있습니다.</p>}
            <SupplierApplyForm storeId={store.id} userId={user.id} />
          </>
        )}
      </div>
    </SupplierShell>
  );
}
