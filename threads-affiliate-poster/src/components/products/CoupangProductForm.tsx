"use client";

import { useActionState, useState, useTransition, useEffect } from "react";
import { ProductPreviewButton } from "@/components/products/ProductPreviewButton";
import {
  checkCoupangAffiliateLink,
  COUPANG_LINK_MESSAGES,
  extractCoupaNgUrl,
  parseCoupangShareCode,
  type ParsedCoupangShare,
} from "@/lib/coupang/links";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EnrichmentFields } from "./EnrichmentFields";
import {
  searchCoupangProductsAction,
  registerCoupangProductAction,
  importCoupangBlogTagAction,
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
  const [manualInfo, setManualInfo] = useState<ParsedCoupangShare | null>(null);
  const [isLookingUp, startLookup] = useTransition();
  const [state, formAction, isPending] = useActionState(registerCoupangProductAction, initialState);

  useEffect(() => {
    if (initialKeyword && initialKeyword.trim()) {
      setSearchError(null);
      startSearching(async () => {
        const result = await searchCoupangProductsAction(initialKeyword.trim());
        if (result.error) {
          setSearchError(result.error);
          setResults([]);
          return;
        }
        setResults(result.results ?? []);
      });
    }
  }, [initialKeyword]);

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

  // The manual field takes a short URL or the "블로그용 태그" <a><img> code: the server takes link/name
  // from it and cuts the product photo out of the banner. The "일반태그" iframe (coupa.ng) can't be read
  // from servers, so it gets a message asking for the blog tag instead.
  const applyPastedCode = (value: string) => {
    setManualInfo(null);
    setManualError(null);
    if (!value.includes("<")) return;
    if (extractCoupaNgUrl(value) && !/<a\b/i.test(value)) {
      setManualError(COUPANG_LINK_MESSAGES.widget_url);
      return;
    }
    const parsed = parseCoupangShareCode(value);
    if (!parsed) return;
    if (parsed.name) setManualName((prev) => prev.trim() || parsed.name!);
    startLookup(async () => {
      const info = await importCoupangBlogTagAction(value);
      if (info.error || !info.url) {
        setManualError(info.error ?? "붙여넣은 코드를 읽지 못했습니다.");
        return;
      }
      setManualInfo({ url: info.url, name: info.name, imageUrl: info.imageUrl });
    });
  };

  const handleUseManualUrl = () => {
    setManualError(null);
    if (!manualUrl.trim()) {
      setManualError("쿠팡 상품 URL을 입력해주세요.");
      return;
    }
    const parsed = manualInfo ?? parseCoupangShareCode(manualUrl);
    if (!parsed) {
      setManualError("붙여넣은 내용에서 링크를 찾지 못했습니다.");
      return;
    }
    const linkCheck = checkCoupangAffiliateLink(parsed.url);
    if (!linkCheck.ok) {
      setManualError(COUPANG_LINK_MESSAGES[linkCheck.reason]);
      return;
    }
    handleSelect({
      productId: -Date.now(),
      productName: manualName.trim() || parsed.name || "상품명 미입력",
      productImage: parsed.imageUrl ?? "",
      productPrice: 0,
      productUrl: parsed.url,
      isRocket: false,
      isFreeShipping: false,
    });
  };

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-xs text-neutral-500">
        쿠팡파트너스 검색 <span className="font-semibold text-red-600">API</span>는 시간당{" "}
        <span className="font-semibold text-red-600">10회 호출제한</span>이 있습니다.
        <br />
        쿠팡 검색 API는 <span className="font-semibold text-red-600">쿠팡파트너스 매출 15만원</span> 달성 후 생성 가능합니다.
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
        <p className="text-sm font-bold text-neutral-900">🛒 쿠팡 API키가 없는 경우 직접 등록방법</p>
        <p className="text-xs text-neutral-500">
          쿠팡파트너스의 제휴링크로 상품을 등록할 수 있습니다. 사진·상품명까지 자동으로 채워집니다.
        </p>
        <ol className="space-y-1.5 rounded-md bg-amber-50 p-3 text-xs leading-relaxed text-neutral-800">
          <li>
            <b>1단계.</b>{" "}
            <a
              href="https://partners.coupang.com/#affiliate/ws/link"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-700 underline"
            >
              쿠팡파트너스 링크 생성 화면
            </a>
            에서 등록할 상품을 찾아 <b>[링크 생성]</b>을 누릅니다.
          </li>
          <li>
            <b>2단계.</b> 화면 아래 <b>[이미지 + 텍스트]</b> 영역의 HTML에서 <b>&quot;블로그용 태그&quot;</b>를 선택합니다.
          </li>
          <li>
            <b>3단계.</b> <b>[HTML 복사]</b> 버튼을 누릅니다.
          </li>
          <li>
            <b>4단계.</b> 복사한 코드를 아래 <b>링크 입력칸</b>에 붙여넣으면 상품명·사진은 자동 채워집니다.
          </li>
          <li>
            <b>5단계.</b> <b>[이 링크로 등록]</b>을 누르면 끝!
          </li>
          <li className="pt-1 text-[11px] text-neutral-500">
            ※ 일반 쿠팡 쇼핑 주소(coupang.com/vp/products/…)는 등록되지 않습니다.
          </li>
        </ol>
        <Input
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          placeholder="상품명 (선택 — HTML 코드를 넣으면 자동 입력)"
        />
        <Input
          value={manualUrl}
          onChange={(e) => {
            setManualUrl(e.target.value);
            applyPastedCode(e.target.value);
          }}
          placeholder='<a href="https://link.coupang.com/a/..."><img ...></a>'
        />
        {isLookingUp && <p className="text-xs text-neutral-500">코드에서 상품 사진을 만드는 중...</p>}
        {manualInfo && (
          <div className="flex items-center gap-2 text-xs text-neutral-600">
            {manualInfo.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={manualInfo.imageUrl} alt="" referrerPolicy="no-referrer" className="h-12 w-12 rounded border object-cover" />
            )}
            <span>
              ✅ 확인됨: {manualInfo.name ?? "상품명 없음"}
              {!manualInfo.imageUrl && " (사진은 없음 — 블로그용 태그 코드를 넣으면 사진도 가져옵니다)"}
            </span>
          </div>
        )}
        <Button type="button" variant="muted" onClick={handleUseManualUrl}>
          이 링크로 등록
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
              {/* Plain product page, not productUrl (the member's affiliate link), so previews aren't counted as clicks. */}
              <ProductPreviewButton url={`https://www.coupang.com/vp/products/${product.productId}`} />
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

      <Button
        type="submit"
        disabled={isPending || !selected}
        className="disabled:!bg-neutral-900 disabled:!text-white disabled:!opacity-100"
      >
        {isPending ? "등록 중..." : selected ? "이 상품으로 등록" : "먼저 상품을 검색·선택해주세요"}
      </Button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="text-xs text-green-600">등록되었습니다.</p>}
    </form>
  );
}
