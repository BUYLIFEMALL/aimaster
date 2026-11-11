import { getStaffStore } from "@/lib/store";
import { getPendingSupplierProducts, getSuppliers } from "@/lib/supplier-store";
import { updateSupplierAction } from "@/lib/supplier-actions";
import { SUPPLIER_STATUS_LABEL, inviteAlive, nextStatuses } from "@/lib/supplier";
import { formatDateTime } from "@/lib/orders";
import { AdminShell, NoPermission } from "../admin-shell";
import SupplierInviteForm from "./invite-form";
import ReinviteButton from "./reinvite-button";
import { setSupplierAutoAction } from "@/lib/grade-actions";
import PendingProducts from "./pending-products";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const BADGE: Record<string, string> = {
  invited: "bg-amber-50 text-amber-800",
  active: "bg-emerald-50 text-emerald-800",
  paused: "bg-gray-100 text-gray-600",
  revoked: "bg-gray-100 text-gray-400",
};

// D34 입점형 마켓플레이스 — 운영자 「공급사」: 초대(이메일 → 수락), 정보·상태(입점 중/쉬는 중) 관리. 상품 권한 직원과 대표
export default async function AdminSuppliersPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/suppliers`);
  if (!staff) return <NoPermission />;
  const [suppliers, pending] = await Promise.all([getSuppliers(store.id), getPendingSupplierProducts(store.id)]);
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));
  const live = suppliers.filter((s) => s.status !== "revoked");
  const revoked = suppliers.filter((s) => s.status === "revoked");

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/suppliers">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
      <h2 className="text-lg font-semibold">🏭 공급사</h2>
      <p className="mt-1 text-sm text-gray-600">다른 회사 상품을 이 몰에서 함께 팔 때 씁니다. 공급사는 자기 화면에서 상품을 올리고(운영자 승인 뒤 판매), 자기 품목 주문만 보고 발송합니다. 정산은 구매 확정된 품목의 공급가 기준입니다.</p>
      <PendingProducts slug={store.slug} products={pending} supplierName={supplierName} />
      <div className="mt-6"><SupplierInviteForm slug={store.slug} /></div>

      <section className="mt-6">
        <h3 className="text-sm font-semibold">공급사 {live.length}곳</h3>
        {live.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">아직 초대한 공급사가 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-3" data-supplier-list>
            {live.map((s) => (
              <li key={s.id} className="rounded border p-3 text-sm" data-supplier-row>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-1.5 text-xs ${BADGE[s.status]}`} data-supplier-status>{SUPPLIER_STATUS_LABEL[s.status]}</span>
                  <b>{s.name}</b>
                  <span className="text-xs text-gray-500">{s.email}</span>
                  <span className="ml-auto text-xs text-gray-400">
                    {s.accepted_at ? `${formatDateTime(s.accepted_at)} 입점` : s.invite_expires_at ? `링크 ${formatDateTime(s.invite_expires_at)}까지${inviteAlive(s) ? "" : " (기간 지남)"}` : ""}
                  </span>
                </div>
                {s.status === "invited" && <div className="mt-2"><ReinviteButton slug={store.slug} supplierId={s.id} /></div>}
                {s.status !== "invited" && (
                  <form action={setSupplierAutoAction.bind(null, store.slug, s.id, !s.auto_approve)} className="mt-2 flex items-center gap-2 text-xs" data-supplier-auto>
                    <span className={`rounded px-1.5 ${s.auto_approve ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{s.auto_approve ? "바로 판매" : "승인 후 판매"}</span>
                    <button className="rounded border px-2 py-1">{s.auto_approve ? "승인 후 판매로 바꾸기" : "바로 판매로 바꾸기"}</button>
                  </form>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-600">정보·상태 고치기</summary>
                  <form action={updateSupplierAction.bind(null, store.slug, s.id)} className="mt-2 grid gap-2 text-xs sm:grid-cols-2" data-supplier-edit>
                    <input name="name" required maxLength={60} defaultValue={s.name} aria-label="공급사 이름" className="rounded border px-2 py-1.5" />
                    <input name="biz_no" maxLength={20} defaultValue={s.biz_no} placeholder="사업자등록번호" className="rounded border px-2 py-1.5" />
                    <input name="contact_name" maxLength={30} defaultValue={s.contact_name} placeholder="담당자" className="rounded border px-2 py-1.5" />
                    <input name="phone" maxLength={30} defaultValue={s.phone} placeholder="연락처" className="rounded border px-2 py-1.5" />
                    <input name="memo" maxLength={300} defaultValue={s.memo} placeholder="운영자 메모" className="rounded border px-2 py-1.5 sm:col-span-2" />
                    <select name="status" defaultValue={s.status} aria-label="상태" className="rounded border px-2 py-1.5">
                      {nextStatuses(s.status).map((v) => (
                        <option key={v} value={v}>{v === "revoked" ? "초대 거두기" : v === "paused" ? "쉬는 중(상품 판매·새 주문 멈춤)" : SUPPLIER_STATUS_LABEL[v]}</option>
                      ))}
                    </select>
                    <button className="min-h-10 rounded border px-3 py-1.5">저장</button>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      {revoked.length > 0 && (
        <details className="mt-6 text-sm">
          <summary className="cursor-pointer text-gray-600">초대를 거둔 공급사 {revoked.length}곳</summary>
          <ul className="mt-1 space-y-0.5 text-xs text-gray-500">
            {revoked.map((s) => <li key={s.id}>{s.name} · {s.email} · {formatDateTime(s.created_at)} 초대</li>)}
          </ul>
        </details>
      )}
    </AdminShell>
  );
}
