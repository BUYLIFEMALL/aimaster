"use client";

import { useActionState, useState } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import { MAX_GROUPS, buildVariants, splitValues, validateGroups, type OptionGroup, type Variant } from "@/lib/options";
import { formatWon } from "@/lib/products";
import { rateSupply } from "@/lib/supplier";
import { saveOptionsAction, saveSupplierOptionsAction, type OptionsState } from "./options-actions";

type GroupDraft = { name: string; values: string };
const initial: OptionsState = { saved: false, error: null };

export default function OptionsEditor({
  slug,
  productId,
  basePrice,
  stockByOption,
  initialGroups,
  initialVariants,
  mode = "admin",
  saleRate = null,
}: {
  slug: string;
  productId: string;
  basePrice: number;
  stockByOption: boolean;
  initialGroups: OptionGroup[];
  initialVariants: Variant[];
  /** supplier = 공급사 화면(0060): 추가금 칸이 「추가 공급가」, 판매가는 운영사가 승인 때 정함 */
  mode?: "admin" | "supplier";
  /** M3-S1(0091): 수수료율 몰의 공급사 화면 — 추가금 칸이 「추가 판매가」(그대로 유저 판매 추가금), 내 공급가는 두 율로 계산해 보여 줌 */
  saleRate?: { hqRate: number; resellerRate: number } | null;
}) {
  const supplier = mode === "supplier";
  const sale = supplier && !!saleRate;
  const extraLabel = sale ? "추가 판매가" : supplier ? "추가 공급가" : "추가금";
  const [state, formAction, pending] = useActionState((supplier ? saveSupplierOptionsAction : saveOptionsAction).bind(null, slug, productId), initial);
  const [groups, setGroups] = useState<GroupDraft[]>(initialGroups.map((g) => ({ name: g.name, values: g.values.join(", ") })));
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [note, setNote] = useState("");

  const parsed: OptionGroup[] = groups
    .map((g) => ({ name: g.name.trim(), values: splitValues(g.values) }))
    .filter((g) => g.name || g.values.length);
  const groupError = validateGroups(parsed);
  const outdated = !groupError && buildVariants(parsed, variants).map((v) => v.key).join("|") !== variants.map((v) => v.key).join("|");

  function rebuild() {
    if (groupError) return setNote(groupError);
    setNote("");
    setVariants(buildVariants(parsed, variants));
  }
  const setVariant = (i: number, patch: Partial<Variant>) => setVariants((prev) => prev.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  return (
    <form onSubmit={noResetSubmit(formAction)} className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">옵션</h3>
      <p className="text-xs text-gray-500">
        예: 옵션 이름 「색상」, 값 「빨강, 파랑」. 최대 {MAX_GROUPS}단, 조합 300개까지. 값을 고친 뒤 「조합 만들기」를 누르면 기존 조합의 추가금·재고는 그대로 남습니다.
      </p>
      <input
        type="hidden"
        name="options"
        value={JSON.stringify({ groups, variants: variants.map(({ key, extra_price, stock, sku, is_active }) => ({ key, extra_price, stock, sku, is_active })), sale })}
      />

      <div className="space-y-2">
        {groups.map((g, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <input
              value={g.name}
              onChange={(e) => setGroups((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              placeholder={`옵션 ${i + 1} 이름 (예: 색상)`}
              maxLength={20}
              className="w-40 rounded border px-2 py-1 text-sm"
            />
            <input
              value={g.values}
              onChange={(e) => setGroups((prev) => prev.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))}
              placeholder="값을 쉼표로 (예: 빨강, 파랑)"
              className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
            />
            <button type="button" onClick={() => setGroups((prev) => prev.filter((_, j) => j !== i))} className="rounded border px-2 py-1 text-xs text-red-700">
              빼기
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          {groups.length < MAX_GROUPS && (
            <button type="button" onClick={() => setGroups((prev) => [...prev, { name: "", values: "" }])} className="rounded border px-3 py-1 text-sm">
              + 옵션 추가
            </button>
          )}
          <button type="button" onClick={rebuild} className="rounded border border-gray-900 px-3 py-1 text-sm">
            조합 만들기
          </button>
        </div>
        {(note || groupError) && groups.length > 0 && <p className="text-xs text-red-600">{note || groupError}</p>}
        {outdated && <p className="text-xs text-amber-700">옵션을 바꿨습니다. 「조합 만들기」를 눌러 조합 목록을 맞춘 뒤 저장해 주세요.</p>}
      </div>

      {variants.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-1">조합</th>
                <th>{extraLabel}(원)</th>
                {(!supplier || sale) && <th>판매가</th>}
                {sale && <th>내 공급가</th>}
                <th>재고{stockByOption ? "" : " (수량 관리 시)"}</th>
                <th>품번</th>
                <th>사용</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => (
                <tr key={v.key} className="border-t">
                  <td className="py-1 pr-2">{v.key}</td>
                  <td>
                    <input type="number" min={supplier ? 0 : undefined} value={v.extra_price} onChange={(e) => setVariant(i, { extra_price: supplier ? Math.max(0, Math.trunc(Number(e.target.value) || 0)) : Math.trunc(Number(e.target.value) || 0) })} aria-label={`${v.key} ${extraLabel}`} className="w-24 rounded border px-1 py-0.5" />
                  </td>
                  {(!supplier || sale) && <td className="whitespace-nowrap pr-2 text-gray-500">{formatWon(basePrice + v.extra_price)}</td>}
                  {sale && saleRate && <td className="whitespace-nowrap pr-2 text-emerald-700">{formatWon(rateSupply(basePrice, saleRate.hqRate, saleRate.resellerRate) + rateSupply(v.extra_price, saleRate.hqRate, saleRate.resellerRate))}</td>}
                  <td>
                    <input type="number" min={0} value={v.stock} disabled={!stockByOption} onChange={(e) => setVariant(i, { stock: Math.max(0, Math.trunc(Number(e.target.value) || 0)) })} className="w-20 rounded border px-1 py-0.5 disabled:bg-gray-50" />
                  </td>
                  <td>
                    <input value={v.sku} maxLength={50} onChange={(e) => setVariant(i, { sku: e.target.value })} className="w-28 rounded border px-1 py-0.5" />
                  </td>
                  <td>
                    <input type="checkbox" checked={v.is_active} onChange={(e) => setVariant(i, { is_active: e.target.checked })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!stockByOption && <p className="mt-1 text-xs text-gray-500">조합별 재고를 쓰려면 위 상품 정보에서 {supplier ? "「재고 관리」를 켜고" : "재고를 「수량 관리」로 바꿔"} 저장하세요.</p>}
        </div>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.saved && <p className="text-sm text-green-700">{state.message ?? "옵션을 저장했습니다."}</p>}
      {sale && saleRate && <p className="text-xs text-gray-500">추가 판매가는 유저가 그 옵션을 고를 때 판매가에 더해지는 금액입니다. 내 공급가는 상품과 같은 본사 {saleRate.hqRate}% · 리셀러 {saleRate.resellerRate}%를 빼서 계산합니다(원 단위 버림).</p>}
      {supplier && <p className="text-xs text-gray-500">옵션 구성이나 {extraLabel}를 바꾸면 운영사가 다시 확인할 때까지 유저에게 보이지 않습니다. 재고·품번·사용 여부만 바꾸면 그대로 판매됩니다.</p>}
      <button disabled={pending || outdated || (!!groupError && groups.length > 0)} className="min-h-11 rounded bg-gray-900 px-4 text-sm text-white disabled:opacity-50">
        {pending ? "저장 중…" : "옵션 저장"}
      </button>
    </form>
  );
}
