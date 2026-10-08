"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { ProductPreviewButton } from "@/components/products/ProductPreviewButton";
import { Button } from "@/components/ui/Button";
import {
  browseTossProductsAction,
  fetchTossCategoriesAction,
  registerTossProductAction,
  type RegisterProductState,
} from "@/lib/actions/products";
import type { TossProduct, TossCategory } from "@/lib/toss/client";

const initialState: RegisterProductState = {};

type BrowseMode = "best" | "category" | "today";

const BROWSE_TABS: { value: BrowseMode; label: string }[] = [
  { value: "best", label: "🔥 베스트 상품" },
  { value: "category", label: "🗂️ 카테고리별" },
  { value: "today", label: "⏰ 오늘의 특가" },
];

export function TossProductForm() {
  const [browseMode, setBrowseMode] = useState<BrowseMode>("best");
  const [categories, setCategories] = useState<TossCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [products, setProducts] = useState<TossProduct[]>([]);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [isBrowsing, startBrowsing] = useTransition();
  const [selected, setSelected] = useState<TossProduct | null>(null);
  const [state, formAction, isPending] = useActionState(registerTossProductAction, initialState);

  // 카테고리 탭을 처음 열 때 카테고리 목록을 한 번만 불러온다.
  useEffect(() => {
    if (browseMode !== "category" || categories.length > 0) return;
    startBrowsing(async () => {
      const result = await fetchTossCategoriesAction();
      if (result.error) {
        setBrowseError(result.error);
        return;
      }
      setCategories(result.categories ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browseMode]);

  const handleBrowse = (targetMode: BrowseMode, targetCategoryId?: string) => {
    setBrowseError(null);
    setProducts([]);
    if (targetMode === "category" && !targetCategoryId) return;
    startBrowsing(async () => {
      const result = await browseTossProductsAction(targetMode, targetCategoryId);
      if (result.error) {
        setBrowseError(result.error);
        return;
      }
      setProducts(result.products ?? []);
    });
  };

  const handleTabClick = (targetMode: BrowseMode) => {
    setBrowseMode(targetMode);
    setSelected(null);
    if (targetMode !== "category") {
      handleBrowse(targetMode);
    } else {
      setProducts([]);
    }
  };

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    setSelected(null);
    handleBrowse("category", id);
  };

  const handleSelect = (product: TossProduct) => {
    setSelected(product);
  };

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-xs text-neutral-500">
        토스쇼핑 쉐어링크는 키워드 검색을 지원하지 않아, 베스트 상품·카테고리별·오늘의 특가
        목록에서 상품을 골라 등록합니다.
      </p>

      <div className="flex gap-2">
        {BROWSE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleTabClick(tab.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              browseMode === tab.value ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {browseMode === "category" && (
        <select
          value={categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">카테고리를 선택해주세요</option>
          {categories.map((c) => (
            <option key={c.categoryId} value={c.categoryId}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {isBrowsing && <p className="text-xs text-neutral-400">불러오는 중...</p>}
      {browseError && <p className="text-xs text-red-600">{browseError}</p>}

      {products.length > 0 && (
        <ul className="space-y-2">
          {products.map((product) => {
            const key = `${product.tacaId}-${product.tacaItemId ?? ""}`;
            const isSelected = selected && `${selected.tacaId}-${selected.tacaItemId ?? ""}` === key;
            return (
              <li
                key={key}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  isSelected ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
                }`}
              >
                {product.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt={product.productName} className="h-14 w-14 rounded object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-neutral-900">{product.productName}</p>
                  <p className="text-xs text-neutral-500">
                    {product.price != null ? `${product.price.toLocaleString()}원` : "가격 정보 없음"}
                  </p>
                </div>
                {/* List items often lack productUrl; the plain page toss.shopping/t/{tacaItemId} opens without the share key. */}
                <ProductPreviewButton
                  url={product.productUrl ?? (product.tacaItemId ? `https://toss.shopping/t/${product.tacaItemId}` : null)}
                />
                <Button type="button" variant="secondary" onClick={() => handleSelect(product)}>
                  {isSelected ? "선택됨" : "선택"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-3">
          <p className="text-sm font-medium text-neutral-900">선택한 상품: {selected.productName}</p>
          <input type="hidden" name="productName" value={selected.productName} />
          <input type="hidden" name="imageUrl" value={selected.imageUrl ?? ""} />
          <input type="hidden" name="tacaId" value={selected.tacaId} />
          {selected.tacaItemId != null && <input type="hidden" name="tacaItemId" value={selected.tacaItemId} />}
          <input type="hidden" name="price" value={selected.price ?? ""} />
        </div>
      )}


      <Button
        type="submit"
        disabled={isPending || !selected}
        className="disabled:!bg-neutral-900 disabled:!text-white disabled:!opacity-100"
      >
        {isPending ? "등록 중..." : selected ? "이 상품으로 등록 (쉐어링크 자동 발급)" : "먼저 상품을 선택해주세요"}
      </Button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="text-xs text-green-600">등록되었습니다.</p>}
    </form>
  );
}
