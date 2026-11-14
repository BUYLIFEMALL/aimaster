import { getCertUrl, getStaffStore } from "@/lib/store";
import { getPendingSupplierProducts, getSupplierApplications, getSupplierShippingMap, getSuppliers, getSupplyConfig } from "@/lib/supplier-store";
import {
  decideSupplierApplyAction,
  saveSupplySettingsAction,
  setSupplierApplyOpenAction,
  setSupplierHqRateAction,
  setSupplierShippingAction,
  updateSupplierAction,
} from "@/lib/supplier-actions";
import { supplierApplyOpen } from "@/lib/supplier-apply";
import SupplierShippingForm, { supplierShippingSummary } from "../../supplier/shipping-form";
import { createClient } from "@/lib/supabase/server";
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
  const [suppliers, pending, shipMap, supply, apps] = await Promise.all([
    getSuppliers(store.id),
    getPendingSupplierProducts(store.id),
    getSupplierShippingMap(store.id),
    getSupplyConfig(store.id),
    getSupplierApplications(store.id),
  ]);
  // T1(0060) 승인 대기 상품의 옵션 요약(개수·추가 공급가 범위)
  const optSummary = new Map<string, { n: number; min: number; max: number }>();
  if (pending.length) {
    const { data: vs } = await (await createClient()).from("mall_builder_variant_supply").select("product_id, extra_supply").in("product_id", pending.map((p) => p.id));
    for (const r of vs ?? []) {
      const k = r.product_id as string;
      const x = Number(r.extra_supply);
      const o = optSummary.get(k) ?? { n: 0, min: x, max: x };
      optSummary.set(k, { n: o.n + 1, min: Math.min(o.min, x), max: Math.max(o.max, x) });
    }
  }
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));
  const applyOpen = supplierApplyOpen(store.modules);
  const pendingApps = apps.filter((a) => a.status === "pending");
  const certUrls = new Map(await Promise.all(pendingApps.map(async (a) => [a.id, await getCertUrl(a.cert_path)] as const)));
  const live = suppliers.filter((s) => s.status !== "revoked");
  const revoked = suppliers.filter((s) => s.status === "revoked");

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/suppliers">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
      <h2 className="text-lg font-semibold">🏭 공급사</h2>
      <p className="mt-1 text-sm text-gray-600">다른 회사 상품을 이 몰에서 함께 팔 때 씁니다. 공급사는 자기 화면에서 상품을 올리고(운영자 승인 뒤 판매), 자기 품목 주문만 보고 발송합니다. 정산은 구매 확정된 품목의 공급가 기준입니다.</p>
      {/* M1-1(0068) 공급가 방식·본사 판매수수료율 — 공급가 = 판매가 × (1 − 본사율 − 리셀러율) */}
      <section className="mt-4 rounded-lg border p-4 text-sm" data-supply-settings>
        <h3 className="font-semibold">💰 공급가 방식·본사 판매수수료</h3>
        <form action={saveSupplySettingsAction.bind(null, store.slug, store.id)} className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1"><input type="radio" name="supply_mode" value="rate" defaultChecked={supply.mode === "rate"} /> 수수료율 자동(공급사가 판매가·리셀러율 입력)</label>
          <label className="flex items-center gap-1"><input type="radio" name="supply_mode" value="manual" defaultChecked={supply.mode === "manual"} /> 공급가 직접 입력(옛 방식)</label>
          <label className="flex items-center gap-1">몰 기본 본사율 <input name="hq_rate" inputMode="decimal" defaultValue={supply.hqRate} className="w-16 rounded border px-2 py-1.5" />%</label>
          <button className="min-h-10 rounded border px-3 py-1.5">저장</button>
        </form>
        <p className="mt-2 text-xs text-gray-500">수수료율 자동이면 공급가 = 판매가 × (1 − 본사 판매수수료율 − 리셀러 판매수수료율). 리셀러 수수료는 리셀러 링크로 팔린 주문에만 본사가 대신 지급하고, 링크 없이 팔리면 본사 몫입니다. 공급사별 본사율은 아래 각 공급사에서 바꿉니다.</p>
      </section>
      {/* M1-0(0070) 공급사 입점 신청 — 받기 켜기/끄기, 대기 신청 승인(본사율 함께)·반려 */}
      <section className="mt-4 rounded-lg border p-4 text-sm" data-supplier-applications>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">📝 입점 신청 <b className={pendingApps.length ? "text-red-700" : ""}>{pendingApps.length}</b></h3>
          <span className={`rounded px-1.5 text-xs ${applyOpen ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{applyOpen ? "신청 받는 중" : "신청 안 받음"}</span>
          <span className="text-xs text-gray-500">신청 주소: /s/{store.slug}/supplier/apply</span>
          <form action={setSupplierApplyOpenAction.bind(null, store.slug, store.id, !applyOpen)} className="ml-auto">
            <button className="min-h-10 rounded border px-3 py-1.5 text-xs">{applyOpen ? "신청 그만 받기" : "입점 신청 받기"}</button>
          </form>
        </div>
        {pendingApps.length === 0 ? (
          <p className="mt-1 text-xs text-gray-500">확인할 입점 신청이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {pendingApps.map((a) => (
              <li key={a.id} className="rounded border p-3" data-supplier-app>
                <p><b>{a.company}</b> <span className="text-xs text-gray-500">· 사업자 {a.biz_no} · {formatDateTime(a.created_at)} 신청</span></p>
                <p className="mt-0.5 text-xs text-gray-600">대표 {a.ceo_name || "—"} · 담당 {a.contact_name || "—"} · {a.phone || "—"} · {a.email} · 분야 {a.category || "—"}</p>
                {a.intro && <p className="mt-0.5 text-xs text-gray-500">「{a.intro}」</p>}
                {certUrls.get(a.id) && <a href={certUrls.get(a.id)!} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-blue-700 underline">사업자등록증 보기(10분)</a>}
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <form action={decideSupplierApplyAction.bind(null, store.slug, a.id, "approve")} className="flex flex-wrap items-center gap-2 text-xs">
                    <label>본사 판매수수료 <input name="hq_rate" inputMode="decimal" placeholder={`기본 ${supply.hqRate}`} className="w-16 rounded border px-2 py-1.5" />%</label>
                    <button className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-white">입점 승인</button>
                  </form>
                  <form action={decideSupplierApplyAction.bind(null, store.slug, a.id, "reject")} className="flex items-center gap-2 text-xs">
                    <input name="note" maxLength={300} placeholder="반려 사유(신청자에게 보임)" className="rounded border px-2 py-1.5" />
                    <button className="min-h-10 rounded border border-red-300 px-3 py-1.5 text-red-700">반려</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <PendingProducts slug={store.slug} products={pending} supplierName={supplierName} optSummary={optSummary} />
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
                {s.status !== "invited" && supply.mode === "rate" && (
                  <form action={setSupplierHqRateAction.bind(null, store.slug, s.id)} className="mt-2 flex flex-wrap items-center gap-2 text-xs" data-supplier-hq-rate>
                    <span>본사 판매수수료</span>
                    <input name="hq_rate" inputMode="decimal" defaultValue={s.hq_fee_rate ?? ""} placeholder={`기본 ${supply.hqRate}`} className="w-16 rounded border px-2 py-1" />%
                    <button className="rounded border px-2 py-1">저장</button>
                    <span className="text-gray-500">{s.hq_fee_rate == null ? `몰 기본 ${supply.hqRate}% 적용 중` : "이 공급사만 따로 적용 중"}</span>
                  </form>
                )}
                {s.status !== "invited" && (
                  <details className="mt-2" data-supplier-shipping-admin>
                    <summary className="cursor-pointer text-xs text-gray-600">🚚 배송비: {supplierShippingSummary(shipMap.get(s.id))}</summary>
                    <div className="mt-2"><SupplierShippingForm compact action={setSupplierShippingAction.bind(null, store.slug, s.id)} current={shipMap.get(s.id) ?? null} /></div>
                  </details>
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
