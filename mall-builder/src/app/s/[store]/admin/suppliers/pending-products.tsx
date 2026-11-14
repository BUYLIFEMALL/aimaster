import Link from "next/link";
import { reviewSupplierProductAction } from "@/lib/supplier-actions";
import type { SupplierProduct } from "@/lib/supplier-store";
import { formatWon } from "@/lib/products";
import { formatDateTime } from "@/lib/orders";

// D35 운영자: 승인 대기 공급사 상품 — 판매가를 정해 승인(바로 판매 선택) 또는 사유를 적어 반려
export default function PendingProducts({
  slug,
  products,
  supplierName,
  optSummary,
}: {
  slug: string;
  products: SupplierProduct[];
  supplierName: Map<string, string>;
  optSummary?: Map<string, { n: number; min: number; max: number }>;
}) {
  return (
    <section id="pending" className="mt-6 scroll-mt-4" data-pending-products>
      <h3 className="text-sm font-semibold">승인 대기 상품 <b className={products.length ? "text-red-700" : ""}>{products.length}</b></h3>
      {products.length === 0 ? (
        <p className="mt-1 text-sm text-gray-500">확인할 공급사 상품이 없습니다.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {products.map((p) => (
            <li key={p.id} className="rounded border p-3 text-sm" data-pending-row>
              <div className="flex gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded border bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.images?.[0] && <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">{supplierName.get(p.supplier_id) ?? "공급사"} · {formatDateTime(p.updated_at)} 요청</p>
                  <Link href={`/s/${slug}/admin/products/${p.id}`} className="font-medium underline">{p.name}</Link>
                  <p className="mt-0.5 text-xs text-gray-600">공급가 <b>{formatWon(p.supply_price)}</b>{p.hq_rate != null && ` (본사 ${p.hq_rate}% · 리셀러 ${p.reseller_rate}% 자동 계산 — 판매가를 바꾸면 같은 비율로 다시 계산)`} · 지금 판매가(처음엔 희망 판매가) {formatWon(p.base_price)} · {p.tax_type === "exempt" ? "면세" : "과세"} · 재고 {p.stock_mode === "product" ? `${p.stock}개` : "관리 안 함"}</p>
                  {p.summary && <p className="mt-0.5 text-xs text-gray-500">{p.summary}</p>}
                  {optSummary?.get(p.id) && (
                    <p className="mt-0.5 text-xs text-blue-700" data-pending-options>
                      옵션 {optSummary.get(p.id)!.n}개 · 추가 공급가{" "}
                      {optSummary.get(p.id)!.min === optSummary.get(p.id)!.max
                        ? formatWon(optSummary.get(p.id)!.min)
                        : `${formatWon(optSummary.get(p.id)!.min)}~${formatWon(optSummary.get(p.id)!.max)}`}{" "}
                      — 판매 추가금은 마진 비율로 미리 채워져 있고, 상품 화면에서 고칠 수 있습니다.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <form action={reviewSupplierProductAction.bind(null, slug, p.id, "approve")} className="flex flex-wrap items-center gap-2" data-approve-form>
                  <label className="text-xs">판매가 <input name="base_price" inputMode="numeric" defaultValue={p.base_price} className="w-28 rounded border px-2 py-1.5" /></label>
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="on_sale" defaultChecked /> 바로 판매</label>
                  <button className="min-h-10 rounded bg-gray-900 px-3 py-1.5 text-xs text-white" data-approve>승인</button>
                </form>
                <form action={reviewSupplierProductAction.bind(null, slug, p.id, "reject")} className="flex items-center gap-2" data-reject-form>
                  <input name="note" maxLength={300} placeholder="반려 사유(공급사에게 보임)" className="rounded border px-2 py-1.5 text-xs" />
                  <button className="min-h-10 rounded border border-red-300 px-3 py-1.5 text-xs text-red-700" data-reject>반려</button>
                </form>
              </div>
              <p className="mt-1 text-xs text-gray-400">카테고리·배송비·노출 범위는 승인 뒤 「상품」 수정 화면에서 정할 수 있습니다.</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
