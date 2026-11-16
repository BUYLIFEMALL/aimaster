"use client";

import { useActionState, useState, useTransition, useEffect } from "react";
import { ProductPreviewButton } from "@/components/products/ProductPreviewButton";
import {
  checkCoupangAffiliateLink,
  COUPANG_LINK_MESSAGES,
  extractCoupaNgUrl,
  parseCoupangShareCode,
  type ParsedCoupangShare,
} from "@/lib/affiliate-clients/coupangLinks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  searchCoupangMultiSourceAction,
  registerCoupangProductsBulkAction,
  registerCoupangProductAction,
  importCoupangBlogTagAction,
  type RegisterProductState,
} from "@/lib/actions/products";
import type { CoupangProduct } from "@/lib/affiliate-clients/coupangApi";
import type { CoupangCandidate } from "@/lib/coupang/productSelection";
import {
  COUPANG_CATEGORY_OPTIONS,
  COUPANG_PL_BRAND_OPTIONS,
  DEFAULT_COUPANG_PRODUCT_SEARCH_SETTINGS,
  type CoupangProductSearchSettings,
} from "@/lib/coupang/catalog";

const initialState: RegisterProductState = {};
const BULK_LIMIT = 30;

// 2026-11-16 v1.88: threads-auto(MIT, bd2fec7) 쿠팡 상품 검색 창을 옮김 — 여러 키워드·골드박스·카테고리 베스트·쿠팡 PL을
// 합쳐 불러오고, 이미 등록한 상품은 빼고, 여러 개를 체크해 한 번에 등록한다. 「API 키 없이 직접 등록」은 예전 그대로.
export function CoupangProductForm({
  initialKeyword,
}: {
  initialKeyword?: string;
}) {
  const [settings, setSettings] = useState<CoupangProductSearchSettings>({
    ...DEFAULT_COUPANG_PRODUCT_SEARCH_SETTINGS,
    keywords: initialKeyword ?? "",
  });
  const [results, setResults] = useState<CoupangCandidate[]>([]);
  const [excludedCount, setExcludedCount] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, startSearching] = useTransition();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [isBulkSaving, startBulkSaving] = useTransition();
  const [selected, setSelected] = useState<CoupangProduct | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualInfo, setManualInfo] = useState<ParsedCoupangShare | null>(null);
  const [isLookingUp, startLookup] = useTransition();
  const [state, formAction, isPending] = useActionState(registerCoupangProductAction, initialState);

  const set = <K extends keyof CoupangProductSearchSettings>(key: K, value: CoupangProductSearchSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const runSearch = (next: CoupangProductSearchSettings) => {
    setSearchError(null);
    setBulkMessage(null);
    setWarnings([]);
    startSearching(async () => {
      const result = await searchCoupangMultiSourceAction({ ...next });
      setWarnings(result.warnings ?? []);
      if (result.error) {
        setSearchError(result.error);
        setResults([]);
        return;
      }
      setResults(result.results ?? []);
      setExcludedCount(result.excludedCount ?? 0);
      setChecked(new Set());
    });
  };

  useEffect(() => {
    if (initialKeyword && initialKeyword.trim()) {
      runSearch({ ...DEFAULT_COUPANG_PRODUCT_SEARCH_SETTINGS, keywords: initialKeyword.trim() });
    }
    // 처음 들어올 때 한 번만 — runSearch는 매번 새로 만들어지므로 의존성에서 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKeyword]);

  const handleSearch = () => runSearch(settings);

  const toggleChecked = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < BULK_LIMIT) next.add(key);
      return next;
    });

  const firstBatch = results.slice(0, BULK_LIMIT);
  const allChecked = firstBatch.length > 0 && firstBatch.every((r) => checked.has(r.sourceKey));
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(firstBatch.map((r) => r.sourceKey)));

  const handleBulkRegister = () => {
    const items = results
      .filter((r) => checked.has(r.sourceKey))
      .map((r) => ({ sourceKey: r.sourceKey, productName: r.productName, productUrl: r.productUrl, imageUrl: r.productImage, price: r.productPrice }));
    if (!items.length) return;
    setBulkMessage(null);
    startBulkSaving(async () => {
      const res = await registerCoupangProductsBulkAction(items);
      if (res.error) {
        setBulkMessage(`⚠️ ${res.error}`);
        return;
      }
      const done = new Set(items.map((i) => i.sourceKey));
      setResults((prev) => prev.filter((r) => !done.has(r.sourceKey)));
      setChecked(new Set());
      setBulkMessage(
        `✅ ${res.inserted ?? 0}개를 등록했습니다.${res.skipped ? ` (이미 등록됐거나 링크가 맞지 않아 ${res.skipped}개는 건너뜀)` : ""}`,
      );
    });
  };

  const sourceBadges = (c: CoupangCandidate) =>
    [
      c.isGoldBox && "골드박스",
      c.isCategoryBest && "카테고리 베스트",
      c.isCoupangPl && "쿠팡 PL",
      c.isRocketFresh && "로켓프레시",
      c.isRocket && "로켓배송",
    ].filter(Boolean) as string[];

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
    setSelected({
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
        <span className="font-semibold text-red-600">10회 호출제한</span>이 있습니다(키워드 1개 = 1회).
        <br />
        쿠팡 검색 API는 <span className="font-semibold text-red-600">쿠팡파트너스 매출 15만원</span> 달성 후 생성 가능합니다.
      </p>

      <div className="space-y-3 rounded-lg border border-neutral-200 p-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <input type="checkbox" checked={settings.keywordSearchIncluded} onChange={(e) => set("keywordSearchIncluded", e.target.checked)} />
          키워드 검색
        </label>
        <div className="flex gap-2">
          <Input
            value={settings.keywords}
            onChange={(e) => set("keywords", e.target.value)}
            placeholder="여러 개는 쉼표로 (예: 무선 이어폰, 캠핑 의자) — 최대 10개"
            aria-label="쿠팡 검색 키워드"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
          />
          <Button type="button" variant="secondary" onClick={handleSearch} disabled={isSearching} className="shrink-0 whitespace-nowrap">
            {isSearching ? "불러오는 중..." : "상품 불러오기"}
          </Button>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.goldBoxIncluded} onChange={(e) => set("goldBoxIncluded", e.target.checked)} />
            골드박스 특가
          </label>
          <div className="flex min-w-0 items-center gap-2">
            <label className="flex shrink-0 items-center gap-2 whitespace-nowrap">
              <input type="checkbox" checked={settings.categoryBestIncluded} onChange={(e) => set("categoryBestIncluded", e.target.checked)} />
              카테고리 베스트
            </label>
            <select
              aria-label="카테고리 베스트 카테고리"
              value={settings.categoryId}
              onChange={(e) => set("categoryId", e.target.value as CoupangProductSearchSettings["categoryId"])}
              className="min-w-0 flex-1 rounded border border-neutral-300 bg-white px-1 py-1 text-xs text-neutral-900"
            >
              <option value="ALL">전체(19개)</option>
              {COUPANG_CATEGORY_OPTIONS.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <label className="flex shrink-0 items-center gap-2 whitespace-nowrap">
              <input type="checkbox" checked={settings.coupangPlIncluded} onChange={(e) => set("coupangPlIncluded", e.target.checked)} />
              쿠팡 PL
            </label>
            <select
              aria-label="쿠팡 PL 브랜드"
              value={settings.coupangPlBrandId}
              onChange={(e) => set("coupangPlBrandId", e.target.value as CoupangProductSearchSettings["coupangPlBrandId"])}
              className="min-w-0 flex-1 rounded border border-neutral-300 bg-white px-1 py-1 text-xs text-neutral-900"
            >
              <option value="ALL">전체 브랜드</option>
              {COUPANG_PL_BRAND_OPTIONS.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.rocketOnly} onChange={(e) => set("rocketOnly", e.target.checked)} />
            🚀 로켓배송만
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.rocketFreshOnly} onChange={(e) => set("rocketFreshOnly", e.target.checked)} />
            🥬 로켓프레시 중심
          </label>
        </div>
        <p className="text-[11px] text-neutral-500">
          이미 등록한 상품은 결과에서 자동으로 빠집니다. 여러 경로를 고르면 결과를 합치고 겹치는 상품은 하나로 묶습니다.
        </p>
      </div>
      {searchError && <p className="text-xs text-red-600">{searchError}</p>}
      {warnings.length > 0 && (
        <ul className="space-y-0.5 text-xs text-amber-700">
          {warnings.map((w) => (
            <li key={w}>⚠️ 일부 경로 실패 — {w}</li>
          ))}
        </ul>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-neutral-900">
              새 후보 {results.length}개
              {excludedCount > 0 && <span className="font-normal text-neutral-500"> · 이미 등록한 {excludedCount}개 제외</span>}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 whitespace-nowrap text-xs text-neutral-700">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                {results.length > BULK_LIMIT ? `앞 ${BULK_LIMIT}개 선택` : "전체 선택"}
              </label>
              <Button type="button" onClick={handleBulkRegister} disabled={isBulkSaving || checked.size === 0} className="whitespace-nowrap">
                {isBulkSaving ? "등록 중..." : `선택한 ${checked.size}개 등록`}
              </Button>
            </div>
          </div>
          {bulkMessage && <p className="text-xs text-neutral-700">{bulkMessage}</p>}
          <ul className="space-y-2">
            {results.map((product) => (
              <li
                key={product.sourceKey}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  checked.has(product.sourceKey) ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
                }`}
              >
                <input
                  type="checkbox"
                  aria-label={`${product.productName} 선택`}
                  checked={checked.has(product.sourceKey)}
                  onChange={() => toggleChecked(product.sourceKey)}
                  className="shrink-0"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.productImage}
                  alt={product.productName}
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 shrink-0 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-neutral-900">{product.productName}</p>
                  <p className="text-xs text-neutral-500">{product.productPrice.toLocaleString()}원</p>
                  {sourceBadges(product).length > 0 && (
                    <p className="mt-0.5 flex flex-wrap gap-1">
                      {sourceBadges(product).map((b) => (
                        <span key={b} className="whitespace-nowrap rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          {b}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                {/* Plain product page, not productUrl (the member's affiliate link), so previews aren't counted as clicks. */}
                <ProductPreviewButton url={`https://www.coupang.com/vp/products/${product.productId}`} />
              </li>
            ))}
          </ul>
        </div>
      )}

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

      {selected && (
        <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-3">
          <p className="text-sm font-medium text-neutral-900">선택한 상품: {selected.productName}</p>
          <input type="hidden" name="productName" value={selected.productName} />
          <input type="hidden" name="imageUrl" value={selected.productImage} />
          <input type="hidden" name="productUrl" value={selected.productUrl} />
          <input type="hidden" name="price" value={selected.productPrice} />
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending || !selected}
        className="disabled:!bg-neutral-900 disabled:!text-white disabled:!opacity-100"
      >
        {isPending ? "등록 중..." : selected ? "이 상품으로 등록" : "직접 등록할 링크를 먼저 확인해주세요"}
      </Button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="text-xs text-green-600">등록되었습니다.</p>}
    </form>
  );
}
