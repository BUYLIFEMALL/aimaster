"use client";

import { useActionState } from "react";
import { PRICE_VISIBILITY_LABEL, PRODUCT_STATUS, VISIBILITY_LABEL, discountRate, parseWon, type ProductImage } from "@/lib/products";
import type { CategoryNode } from "@/lib/categories";
import { saveProductAction, type ProductFormState } from "./actions";
import ImageUploader from "./image-uploader";

export type ProductFormValues = {
  name: string;
  summary: string;
  description: string;
  base_price: string;
  list_price: string;
  cost: string;
  tax_type: string;
  status: string;
  stock_mode: string;
  stock: string;
  images: ProductImage[];
  category_ids: string[];
  shipping_policy_id: string;
  visibility: string;
  price_visibility: string;
  grade_prices: Record<string, string>; // 등급 id → "8000" 또는 "15%"
};

const initial: ProductFormState = { saved: false, error: null, errors: {} };

export default function ProductForm({
  slug,
  storeId,
  productId,
  values,
  categories,
  savedNotice,
  shippingPolicies,
  grades,
}: {
  slug: string;
  storeId: string;
  productId: string | null;
  values: ProductFormValues;
  categories: CategoryNode[];
  savedNotice: boolean;
  shippingPolicies: { id: string; name: string; is_default: boolean }[];
  grades: { id: string; name: string; is_business: boolean }[];
}) {
  const [state, formAction, pending] = useActionState(saveProductAction.bind(null, slug, productId), initial);
  // 오류로 돌아오면 제출한 값을, 아니면 받은 값을 보여 준다
  const v = state.values
    ? {
        ...values,
        ...(state.values as Partial<ProductFormValues>),
        category_ids: (state.values.category_ids as string[]) ?? values.category_ids,
        grade_prices: values.grade_prices,
      }
    : values;
  const e = state.errors;
  const rate = discountRate(parseWon(v.base_price) ?? 0, parseWon(v.list_price));

  const field = (name: keyof ProductFormValues, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="text-sm">{label}</span>
      <input name={name} defaultValue={String(v[name] ?? "")} className="mt-1 w-full rounded border px-3 py-2" {...props} />
      {e[name as keyof typeof e] && <span className="text-xs text-red-600">{e[name as keyof typeof e]}</span>}
    </label>
  );

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-semibold">기본 정보</legend>
        {field("name", "상품 이름 *", { maxLength: 100, required: true })}
        {field("summary", "한 줄 소개", { maxLength: 200, placeholder: "목록에 상품명 아래로 보이는 짧은 소개" })}
        <label className="block">
          <span className="text-sm">상세 설명</span>
          <textarea name="description" defaultValue={v.description} rows={6} maxLength={20000} className="mt-1 w-full rounded border px-3 py-2" placeholder="상품 상세 화면에 보이는 설명(줄바꿈 그대로 표시)" />
          {e.description && <span className="text-xs text-red-600">{e.description}</span>}
        </label>
      </fieldset>

      <fieldset className="rounded-lg border p-4">
        <legend className="px-1 text-sm font-semibold">사진</legend>
        <ImageUploader storeId={storeId} initial={v.images} />
        {e.images && <span className="text-xs text-red-600">{e.images}</span>}
      </fieldset>

      <fieldset className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
        <legend className="px-1 text-sm font-semibold">가격</legend>
        {field("base_price", "판매가(원) *", { inputMode: "numeric", required: true, placeholder: "47000" })}
        {field("list_price", "정가(원)", { inputMode: "numeric", placeholder: "할인 전 가격" })}
        {field("cost", "원가(원) — 운영자만 보임", { inputMode: "numeric" })}
        <p className="text-xs text-gray-500 sm:col-span-3">
          {rate > 0 ? `손님 화면에 정가 대비 ${rate}% 할인으로 표시됩니다.` : "정가를 판매가보다 높게 넣으면 할인율이 표시됩니다."}
        </p>
        <div className="space-y-2 sm:col-span-3" data-grade-prices>
          <p className="text-sm">등급별 가격 <span className="text-xs text-gray-500">— 금액(예: 42000) 또는 할인율(예: 10%). 비우면 판매가. 옵션 추가금은 그대로 더해집니다.</span></p>
          <div className="grid gap-2 sm:grid-cols-3">
            {grades.map((g) => (
              <label key={g.id} className="block">
                <span className="text-xs text-gray-500">{g.name}{g.is_business ? " (승인 사업자)" : ""}</span>
                <input
                  name={`grade_price_${g.id}`}
                  defaultValue={String((state.values?.[`grade_price_${g.id}`] as string | undefined) ?? v.grade_prices[g.id] ?? "")}
                  placeholder="판매가"
                  className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm"
                />
              </label>
            ))}
          </div>
          {state.gradeError && <p className="text-xs text-red-600">{state.gradeError}</p>}
        </div>
        <label className="block">
          <span className="text-sm">과세</span>
          <select name="tax_type" defaultValue={v.tax_type} className="mt-1 w-full rounded border px-3 py-2">
            <option value="taxable">과세 상품</option>
            <option value="exempt">면세 상품</option>
          </select>
        </label>
      </fieldset>

      <fieldset className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
        <legend className="px-1 text-sm font-semibold">판매·재고</legend>
        <label className="block">
          <span className="text-sm">판매 상태</span>
          <select name="status" defaultValue={v.status} className="mt-1 w-full rounded border px-3 py-2">
            {Object.entries(PRODUCT_STATUS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm">재고</span>
          <select name="stock_mode" defaultValue={v.stock_mode} className="mt-1 w-full rounded border px-3 py-2">
            <option value="none">관리 안 함(무제한)</option>
            <option value="product">수량 관리</option>
          </select>
        </label>
        {field("stock", "재고 수량", { inputMode: "numeric", placeholder: "수량 관리일 때만" })}
        <label className="block sm:col-span-3">
          <span className="text-sm">배송비 정책</span>
          <select name="shipping_policy_id" defaultValue={v.shipping_policy_id} className="mt-1 w-full rounded border px-3 py-2">
            <option value="">몰 기본 정책 사용{shippingPolicies.find((p) => p.is_default) ? ` (${shippingPolicies.find((p) => p.is_default)!.name})` : " (정책 없음 — 무료)"}</option>
            {shippingPolicies.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <p className="text-xs text-gray-500 sm:col-span-3">손님 화면에는 「판매 중」과 「품절」 상품만 보입니다. 「준비 중」·「숨김」은 운영자만 봅니다.</p>
      </fieldset>

      <fieldset className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold">공개 범위(B2B)</legend>
        <label className="block">
          <span className="text-sm">상품 보이기</span>
          <select name="visibility" defaultValue={v.visibility} className="mt-1 w-full rounded border px-3 py-2">
            {Object.entries(VISIBILITY_LABEL).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm">가격 공개</span>
          <select name="price_visibility" defaultValue={v.price_visibility} className="mt-1 w-full rounded border px-3 py-2">
            {Object.entries(PRICE_VISIBILITY_LABEL).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset className="rounded-lg border p-4">
        <legend className="px-1 text-sm font-semibold">카테고리(여러 개 선택 가능)</legend>
        {categories.length === 0 ? (
          <p className="text-sm text-gray-500">카테고리가 없습니다. 「카테고리」 메뉴에서 먼저 만들어 주세요.</p>
        ) : (
          <ul className="space-y-1">
            {categories.map((c) => (
              <li key={c.id} style={{ paddingLeft: `${(c.depth - 1) * 1.25}rem` }}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="category_ids" value={c.id} defaultChecked={v.category_ids.includes(c.id)} />
                  {c.name}
                  {!c.is_visible && <span className="text-xs text-gray-400">(숨김)</span>}
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {(state.saved || (savedNotice && !state.error && !state.values)) && <p className="text-sm text-green-700">저장했습니다.</p>}
      <button disabled={pending} className="min-h-11 w-full rounded bg-gray-900 py-2 text-white disabled:opacity-50 sm:w-40">
        {pending ? "저장 중…" : productId ? "저장" : "상품 등록"}
      </button>
    </form>
  );
}
