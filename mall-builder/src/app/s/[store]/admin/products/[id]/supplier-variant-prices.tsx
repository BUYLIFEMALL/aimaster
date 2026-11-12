import { setVariantPricesAction } from "@/lib/supplier-actions";
import { formatWon } from "@/lib/products";
import type { Variant } from "@/lib/options";
import PendingButton from "@/app/pending-button";

// T1(0060) 운영자: 공급사 상품 옵션별 판매 추가금. 처음 값 = 추가 공급가 × (판매가 / 공급가). 판매가가 공급가보다 낮으면 저장되지 않음
export default function SupplierVariantPrices({
  slug,
  productId,
  basePrice,
  supplyPrice,
  variants,
}: {
  slug: string;
  productId: string;
  basePrice: number;
  supplyPrice: number;
  variants: (Variant & { id: string; extra_supply: number })[];
}) {
  return (
    <section className="space-y-3 rounded-lg border p-4" data-supplier-variant-prices>
      <h3 className="font-semibold">옵션별 판매가 (공급사 상품)</h3>
      {variants.length === 0 ? (
        <p className="text-sm text-gray-500">공급사가 옵션을 넣지 않은 상품입니다.</p>
      ) : (
        <form action={setVariantPricesAction.bind(null, slug, productId)} className="space-y-3">
          <p className="text-xs text-gray-500">공급사가 적은 추가 공급가를 보고 손님 판매 추가금을 정합니다. 처음 값은 이 상품의 마진 비율을 따른 금액입니다.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="py-1">조합</th>
                  <th>공급가</th>
                  <th>판매 추가금(원)</th>
                  <th>판매가</th>
                  <th>재고</th>
                  <th>사용</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id} className="border-t">
                    <td className="py-1 pr-2">{v.key}</td>
                    <td className="whitespace-nowrap pr-2 text-gray-600">{formatWon(supplyPrice + v.extra_supply)}{v.extra_supply ? <span className="text-xs text-gray-400"> (+{v.extra_supply.toLocaleString("ko-KR")})</span> : null}</td>
                    <td><input name={`p:${v.key}`} inputMode="numeric" defaultValue={v.extra_price} aria-label={`${v.key} 판매 추가금`} className="w-24 rounded border px-1 py-0.5" /></td>
                    <td className="whitespace-nowrap pr-2 text-gray-500">{formatWon(basePrice + v.extra_price)}</td>
                    <td className="text-gray-600">{v.stock}</td>
                    <td className="text-gray-600">{v.is_active ? "판매" : "멈춤"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PendingButton pendingText="저장 중…" className="min-h-11 rounded bg-gray-900 px-4 text-sm text-white">판매 추가금 저장</PendingButton>
        </form>
      )}
    </section>
  );
}
