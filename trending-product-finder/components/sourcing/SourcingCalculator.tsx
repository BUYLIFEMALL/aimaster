"use client";
// v1.10: 800줄짜리 한 파일을 나눴다(동작·화면은 그대로).
//  - lib/sourcingResults.ts: 채널 정의·검색결과 형식·결과 전체 마진 계산·CSV(순수 함수, 단위 테스트 있음)
//  - components/sourcing/sourcingFetchers.ts: 채널별 검색(서버 액션) 호출과 결과 형식 맞추기
//  - components/sourcing/SourcingResults.tsx: 결과 위 도구(CSV·프로모션 필터)와 채널별 결과 목록
//  - components/sourcing/MarginCalculatorPanel.tsx: 💰 마진 계산기
// 이 파일은 상태(선택 채널·검색어·결과·선택 상품·계산기 입력)와 화면 배치만 맡는다.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSourcingProductAction } from "@/lib/actions/savedProducts";
import {
  buildResultMarginRows,
  defaultsFor,
  EMPTY_RESULTS,
  PLATFORMS,
  promoMatchKeys,
  resultRowsToCsv,
  SELLING_MULTIPLIER,
  type NormalizedProduct,
  type Platform,
  type PlatformResults,
} from "@/lib/sourcingResults";
import { FETCHERS } from "./sourcingFetchers";
import { PlatformResultList, ResultTools } from "./SourcingResults";
import { MarginCalculatorPanel, costFieldsFrom, INITIAL_MARGIN_FORM, type MarginForm } from "./MarginCalculatorPanel";

interface SourcingCalculatorProps {
  initialKeyword?: string;
  /** 회원이 이미 API 키를 등록해둔 채널 — 검색 체크박스 기본 선택값으로 쓴다 */
  registeredPlatforms?: Platform[];
}

export function SourcingCalculator({ initialKeyword, registeredPlatforms }: SourcingCalculatorProps) {
  const router = useRouter();
  // 토글(단일 선택) 대신 체크박스로 여러 채널을 동시에 선택해서, 검색 한 번으로
  // 알리익스프레스/도매매/11번가 결과를 채널별로 나눠 보고 그 안에서 상품을 고를 수 있게 한다.
  // 기본 선택값은 회원이 이미 API 키를 등록해둔 채널 — 없으면 기존처럼 알리익스프레스만 선택.
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(
    new Set<Platform>(registeredPlatforms && registeredPlatforms.length > 0 ? registeredPlatforms : ["aliexpress"]),
  );
  const [keyword, setKeyword] = useState(initialKeyword ?? "");
  const [isSearching, setIsSearching] = useState(false);
  // Phase 14 — 저장 직후 버튼을 "⭐ 저장됨"으로 바꿔주기 위한 로컬 표시용 상태(진짜 저장
  // 여부는 서버의 sourcing_saved_products가 진실 공급원). 새로 검색하면 초기화된다.
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [results, setResults] = useState<PlatformResults>(EMPTY_RESULTS);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  // 계산기 입력값 — 상품을 고르면 원가/추천판매가를 자동으로 채우고, 나머지 값은 계속 자유롭게 조정 가능.
  const [form, setForm] = useState<MarginForm>(INITIAL_MARGIN_FORM);

  function togglePlatform(p: Platform) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size === 1) return prev; // 최소 1개는 선택되어 있어야 한다
        next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!keyword.trim() || selectedPlatforms.size === 0) return;
    setIsSearching(true);
    try {
      const targets = Array.from(selectedPlatforms);
      const entries = await Promise.all(targets.map(async (p) => [p, await FETCHERS[p](keyword.trim())] as const));
      const next: PlatformResults = { ...EMPTY_RESULTS };
      for (const [p, r] of entries) next[p] = r;
      setResults(next);
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelect(product: NormalizedProduct) {
    setSelectedTitle(product.title);
    setSelectedImage(product.imageUrl || null);
    setSelectedPlatform(product.platform);
    // 이전에 직접 수정했던 값이 남아있지 않도록, 상품을 새로 선택할 때마다
    // 나머지 비용 항목도 전부 (선택한 상품의 채널에 맞는) 기본값으로 되돌려서 다시 채운다.
    setForm((prev) => ({
      ...prev,
      ...(product.priceKrw
        ? { sourcePrice: String(product.priceKrw), sellingPrice: String(Math.round(product.priceKrw * SELLING_MULTIPLIER)) }
        : {}),
      ...costFieldsFrom(defaultsFor(product.platform)),
    }));
  }

  async function handleSaveProduct(product: NormalizedProduct) {
    const savedKey = `${product.platform}:${product.key}`;
    setSavingKey(savedKey);
    try {
      const formData = new FormData();
      formData.set("keyword", keyword.trim());
      formData.set("platform", product.platform);
      formData.set("productKey", product.key);
      formData.set("title", product.title);
      formData.set("detailUrl", product.detailUrl);
      if (product.priceKrw != null) formData.set("priceKrw", String(product.priceKrw));
      const result = await saveSourcingProductAction(formData);
      if (!result.error) {
        setSavedKeys((prev) => new Set(prev).add(savedKey));
        router.refresh();
      }
    } finally {
      setSavingKey(null);
    }
  }

  function handleReset() {
    // 선택 정보만 지우면 값은 이미 수정 가능한 상태라 버튼이 의미가 없어진다.
    // "직접입력"이 실제로 다른 동작을 하도록 자동 채워졌던 원가/판매가도 함께 비운다.
    setSelectedTitle(null);
    setSelectedImage(null);
    setSelectedPlatform(null);
    setForm((prev) => ({ ...prev, sourcePrice: "", sellingPrice: "" }));
  }

  const resultMarginRows = useMemo(() => buildResultMarginRows(results), [results]);

  // 프로모션 키워드(공동구매/할인/이벤트 등) + 마진율 조건을 동시에 만족하는 상품만
  // 골라서 보고 싶을 때 쓰는 필터. 키워드만으로는 "홍보할 가치가 있는지"를 보장 못 한다는
  // 피드백에 따라 마진율 하한을 함께 걸도록 설계함(2026-09-03).
  const [promoFilterEnabled, setPromoFilterEnabled] = useState(false);
  const [minMarginPct, setMinMarginPct] = useState("20");
  const promoFilteredKeys = useMemo(() => promoMatchKeys(resultMarginRows, minMarginPct), [resultMarginRows, minMarginPct]);

  function handleDownloadResultsCsv() {
    if (resultMarginRows.length === 0) return;
    const blob = new Blob([resultRowsToCsv(resultMarginRows, keyword)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `상품소싱_${keyword || "검색결과"}_마진계산_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* 소싱 채널 선택 — 중복 선택 가능, 선택한 채널 결과를 한 번에 나눠서 보여준다 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {PLATFORMS.map((p) => {
          const checked = selectedPlatforms.has(p.value);
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => togglePlatform(p.value)}
              aria-pressed={checked}
              className={`flex items-start gap-2 rounded-2xl border p-3 text-left transition-colors ${
                checked ? "border-mx-primary/40 bg-mx-primary/10" : "border-mx-border bg-mx-surface hover:border-mx-primary"
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  checked ? "border-mx-primary/40 bg-mx-primary text-white" : "border-mx-border bg-mx-surface"
                }`}
              >
                {checked && "✓"}
              </span>
              <span>
                <p className={`text-sm font-bold ${checked ? "text-mx-link" : "text-mx-text"}`}>{p.label}</p>
                <p className="mt-0.5 text-xs text-mx-muted">{p.description}</p>
              </span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 bg-mx-surface border border-mx-border rounded-2xl p-4">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="소싱 원가를 비교할 키워드 (예: 무선청소기) — 검색 없이 아래 계산기만 바로 써도 됩니다"
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="rounded-lg bg-mx-primary px-5 py-2 text-sm font-bold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
        >
          {isSearching ? "검색 중..." : "검색"}
        </button>
      </form>

      <ResultTools
        keyword={keyword}
        rowCount={resultMarginRows.length}
        onDownloadCsv={handleDownloadResultsCsv}
        promoFilterEnabled={promoFilterEnabled}
        onTogglePromo={() => setPromoFilterEnabled((v) => !v)}
        minMarginPct={minMarginPct}
        onMinMarginChange={setMinMarginPct}
        promoMatchCount={promoFilteredKeys.size}
      />

      {/* 채널별 검색 결과 — 선택한 채널마다 구분해서 보여주고, 그 안에서 상품을 고른다 */}
      {PLATFORMS.filter((p) => selectedPlatforms.has(p.value) && results[p.value]).map((p) => (
        <PlatformResultList
          key={p.value}
          label={p.label}
          result={results[p.value]!}
          promoFilterEnabled={promoFilterEnabled}
          promoFilteredKeys={promoFilteredKeys}
          minMarginPct={minMarginPct}
          selectedTitle={selectedTitle}
          selectedPlatform={selectedPlatform}
          savedKeys={savedKeys}
          savingKey={savingKey}
          onSave={handleSaveProduct}
          onSelect={handleSelect}
        />
      ))}

      <MarginCalculatorPanel
        form={form}
        onChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
        selectedTitle={selectedTitle}
        selectedImage={selectedImage}
        selectedPlatform={selectedPlatform}
        onReset={handleReset}
      />
    </div>
  );
}
