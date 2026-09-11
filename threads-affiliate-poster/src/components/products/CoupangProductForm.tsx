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
import type { RegistrationMode } from "./PlatformTabs";

const initialState: RegisterProductState = {};

export function CoupangProductForm({
  detailPages,
  mode,
  initialKeyword,
}: {
  detailPages: DetailPageSummary[];
  mode: RegistrationMode;
  initialKeyword?: string;
}) {
  const [keyword, setKeyword] = useState(initialKeyword ?? "");
  const [results, setResults] = useState<CoupangProduct[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, startSearching] = useTransition();
  const [selected, setSelected] = useState<CoupangProduct | null>(null);
  const [analyzeProductName, setAnalyzeProductName] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(registerCoupangProductAction, initialState);

  const handleSelect = (product: CoupangProduct) => {
    setSelected(product);
    setAnalyzeProductName(product.productName);
  };

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

  const handleUseManualUrl = () => {
    setManualError(null);
    if (!manualUrl.trim()) {
      setManualError("쿠팡 상품 URL을 입력해주세요.");
      return;
    }
    handleSelect({
      productId: -Date.now(),
      productName: manualName.trim() || "상품명 미입력",
      productImage: "",
      productPrice: 0,
      productUrl: manualUrl.trim(),
      isRocket: false,
      isFreeShipping: false,
    });
  };

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-xs text-neutral-500">
        쿠팡파트너스 검색 <span className="font-semibold text-red-600">API</span>는 시간당{" "}
        <span className="font-semibold text-red-600">10회 호출제한</span>이 있습니다.
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

      <div className="space-y-2 rounded-lg border border-dashed border-neutral-300 p-3">
        <p className="text-xs font-medium text-neutral-700">또는 쿠팡 상품 URL 직접 입력</p>
        <Input
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          placeholder="상품명 (선택)"
        />
        <Input
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          placeholder="https://www.coupang.com/vp/products/..."
        />
        <Button type="button" variant="secondary" onClick={handleUseManualUrl}>
          이 URL로 사용하기
        </Button>
        {manualError && <p className="text-xs text-red-600">{manualError}</p>}
      </div>

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((product) => (
            <li
              key={product.productId}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                selected?.productId === product.productId
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.productImage} alt={product.productName} className="h-14 w-14 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-neutral-900">{product.productName}</p>
                <p className="text-xs text-neutral-500">{product.productPrice.toLocaleString()}원</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => handleSelect(product)}>
                {selected?.productId === product.productId ? "선택됨" : "선택"}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-3">
          <p className="text-sm font-medium text-neutral-900">선택한 상품: {selected.productName}</p>
          {mode !== "analyze" && (
            <>
              <input type="hidden" name="productName" value={selected.productName} />
              <input type="hidden" name="imageUrl" value={selected.productImage} />
            </>
          )}
          <input type="hidden" name="productUrl" value={selected.productUrl} />
          <input type="hidden" name="price" value={selected.productPrice} />
          {/* 검색 결과로 선택한 상품은 productId가 실제 쿠팡 productId(양수)이고,
              이미 본인 키로 추적되는 제휴 링크(link.coupang.com/re/AFFSDP...)를
              받은 상태다. "URL 직접 입력"은 productId를 -Date.now()로 채워
              음수가 되므로, 이때만 서버에서 딥링크 변환을 수행하도록 구분한다. */}
          <input type="hidden" name="skipDeeplink" value={selected.productId >= 0 ? "1" : "0"} />
        </div>
      )}

      {mode === "analyze" && (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">상품명</label>
            <Input
              name="productName"
              placeholder="상품명을 입력하거나, 아래 이미지 분석 결과로 자동 채워보세요."
              value={analyzeProductName}
              onChange={(e) => setAnalyzeProductName(e.target.value)}
              required
            />
          </div>
          <EnrichmentFields
            detailPages={detailPages}
            productName={analyzeProductName}
            onProductNameSuggested={setAnalyzeProductName}
            initialImageUrl={selected?.productImage}
          />
        </>
      )}

      <Button type="submit" disabled={isPending || !selected}>
        {isPending ? "등록 중..." : selected ? "이 상품으로 등록 (딥링크 자동 생성)" : "먼저 상품을 검색·선택해주세요"}
      </Button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="text-xs text-green-600">등록되었습니다.</p>}
    </form>
  );
}
