import ImageUploader from "../../admin/products/image-uploader";
import { saveSupplierProductAction } from "@/lib/supplier-actions";
import type { SupplierProduct } from "@/lib/supplier-store";

// D35 공급사 상품 입력 — 처음 올릴 때만 희망 판매가(그 뒤 판매가는 운영자가 정함). 재고만 바꾸면 재승인 없음
export default function SupplierProductForm({ slug, storeId, supplierId, product }: { slug: string; storeId: string; supplierId: string; product: SupplierProduct | null }) {
  const p = product;
  return (
    <form action={saveSupplierProductAction.bind(null, slug, p?.id ?? null)} className="space-y-4 text-sm" data-supplier-product-form>
      <label className="block">
        <span className="font-medium">상품 이름 *</span>
        <input name="name" required maxLength={100} defaultValue={p?.name ?? ""} className="mt-1 w-full rounded border px-2 py-2" />
      </label>
      <label className="block">
        <span className="font-medium">한 줄 소개</span>
        <input name="summary" maxLength={200} defaultValue={p?.summary ?? ""} className="mt-1 w-full rounded border px-2 py-2" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="font-medium">공급가(몰에 넘기는 값) *</span>
          <input name="supply_price" required inputMode="numeric" defaultValue={p?.supply_price ?? ""} className="mt-1 w-full rounded border px-2 py-2" />
        </label>
        {p ? (
          <div>
            <span className="font-medium">판매가</span>
            <p className="mt-1 rounded bg-gray-50 px-2 py-2 text-gray-600">{p.base_price.toLocaleString("ko-KR")}원 · 몰 운영자가 정합니다</p>
          </div>
        ) : (
          <label className="block">
            <span className="font-medium">희망 판매가 *</span>
            <input name="base_price" required inputMode="numeric" className="mt-1 w-full rounded border px-2 py-2" />
            <span className="mt-1 block text-xs text-gray-500">공급가 이상. 최종 판매가는 운영자가 승인할 때 정합니다.</span>
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1"><input type="radio" name="tax_type" value="taxable" defaultChecked={(p?.tax_type ?? "taxable") === "taxable"} /> 과세</label>
        <label className="flex items-center gap-1"><input type="radio" name="tax_type" value="exempt" defaultChecked={p?.tax_type === "exempt"} /> 면세</label>
        <label className="flex items-center gap-1"><input type="checkbox" name="stock_on" defaultChecked={p?.stock_mode === "product"} /> 재고 관리</label>
        <input name="stock" inputMode="numeric" defaultValue={p?.stock ?? 0} aria-label="재고 수량" className="w-24 rounded border px-2 py-1.5" />
        <span className="text-xs text-gray-500">개 (재고만 바꾸면 다시 승인받지 않습니다)</span>
      </div>
      <div>
        <span className="font-medium">사진</span>
        <div className="mt-1"><ImageUploader storeId={storeId} initial={p?.images ?? []} folder={`${storeId}/supplier/${supplierId}`} /></div>
      </div>
      <label className="block">
        <span className="font-medium">상세 설명</span>
        <textarea name="description" rows={8} maxLength={20000} defaultValue={p?.description ?? ""} className="mt-1 w-full rounded border px-2 py-2" />
      </label>
      {p && p.approval === "approved" && <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">이름·설명·공급가·사진을 바꾸면 운영자가 다시 확인할 때까지 손님에게 보이지 않습니다.</p>}
      {!p && <p className="rounded bg-gray-50 px-3 py-2 text-xs text-gray-600">색상·사이즈 같은 옵션은 상품을 올린 뒤 「내 상품」에서 이 상품을 열어 넣을 수 있습니다(옵션마다 추가 공급가·재고).</p>}
      <button className="min-h-11 rounded bg-gray-900 px-5 py-2.5 text-white">{p ? "저장" : "올리고 승인 요청"}</button>
    </form>
  );
}
