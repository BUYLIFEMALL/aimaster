"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EnrichmentFields } from "./EnrichmentFields";
import {
  searchCoupangProductsAction,
  registerCoupangProductAction,
  type RegisterProductState,
} from "@/lib/actions/products";
import type { CoupangProduct } from "@/lib/coupang/client";
import type { DetailPageSummary } from "@/lib/detailPages";

const initialState: RegisterProductState = {};

export function CoupangProductForm({ detailPages }: { detailPages: DetailPageSummary[] }) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<CoupangProduct[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, startSearching] = useTransition();
  const [selected, setSelected] = useState<CoupangProduct | null>(null);
  const [state, formAction, isPending] = useActionState(registerCoupangProductAction, initialState);

  const handleSearch = () => {
    if (!keyword.trim()) return;
    setSearchError(null);
    startSearching(async () => {
      const result = await searchCoupangProductsAction(keyword);
      if (result.error) {
        setSearchError(result.error);
        setResults([]);
        return;
      }
      setResults(result.results ?? []);
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">
        쿠팡파트너스 검색 API는 시간당 호출 횟수 제한이 있습니다. 필요한 만큼만 검색해주세요.
      </p>
      <div className="flex gap-2">
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="검색할 상품 키워드 (예: 무선 이어폰)"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
        />
        <Button type="button" variant="secondary" onClick={handleSearch} disabled={isSearching}>
          {isSearching ? "검색 중..." : "검색"}
        </Button>
      </div>
      {searchError && <p className="text-xs text-red-600">{searchError}</p>}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((product) => (
            <li
              key={product.productId}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.productImage} alt={product.productName} className="h-14 w-14 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-neutral-900">{product.productName}</p>
                <p className="text-xs text-neutral-500">{product.productPrice.toLocaleString()}원</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setSelected(product)}>
                선택
              </Button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <form action={formAction} className="space-y-3 rounded-lg border border-neutral-300 bg-neutral-50 p-4">
          <p className="text-sm font-medium text-neutral-900">선택한 상품: {selected.productName}</p>
          <input type="hidden" name="productName" value={selected.productName} />
          <input type="hidden" name="productUrl" value={selected.productUrl} />
          <input type="hidden" name="price" value={selected.productPrice} />
          <input type="hidden" name="imageUrl" value={selected.productImage} />

          <EnrichmentFields detailPages={detailPages} />

          <Button type="submit" disabled={isPending}>
            {isPending ? "등록 중..." : "이 상품으로 등록 (딥링크 자동 생성)"}
          </Button>
          {state.error && <p className="text-xs text-red-600">{state.error}</p>}
          {state.success && <p className="text-xs text-green-600">등록되었습니다.</p>}
        </form>
      )}
    </div>
  );
}
