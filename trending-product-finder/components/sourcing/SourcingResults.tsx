"use client";
// v1.10: SourcingCalculator에서 분리 — 검색결과 위 도구(CSV 다운로드·프로모션 필터)와 채널별 검색결과 목록. 화면은 이전과 같다.
import { matchedPromoKeyword } from "@/lib/promoKeywords";
import type { NormalizedProduct, Platform, PlatformResult } from "@/lib/sourcingResults";

interface ToolsProps {
  keyword: string;
  rowCount: number;
  onDownloadCsv: () => void;
  promoFilterEnabled: boolean;
  onTogglePromo: () => void;
  minMarginPct: string;
  onMinMarginChange: (v: string) => void;
  promoMatchCount: number;
}

export function ResultTools({ keyword, rowCount, onDownloadCsv, promoFilterEnabled, onTogglePromo, minMarginPct, onMinMarginChange, promoMatchCount }: ToolsProps) {
  if (rowCount === 0) return null;
  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-mx-success/30 bg-mx-success/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[#a7f3d0]">📊 &quot;{keyword}&quot; 검색결과 {rowCount}건 마진 계산 완료</p>
          <p className="mt-0.5 text-xs text-mx-success">
            지금 검색된 상품 전체를 마진율 순으로 정리했습니다(추천판매가는 원가×2.5 기준 추정치). 엑셀에서 비교해보세요.
          </p>
        </div>
        <button
          type="button"
          onClick={onDownloadCsv}
          className="shrink-0 rounded-lg bg-[#047857] px-4 py-2 text-sm font-bold text-white hover:bg-[#059669]"
        >
          📥 검색결과 전체 CSV 다운로드
        </button>
      </div>

      <div className="rounded-2xl border-2 border-mx-danger/30 bg-mx-danger/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-[#fecdd3]">🎯 프로모션 상품만 골라보기</p>
            <p className="mt-0.5 text-xs text-mx-danger">
              상품명에 공동구매/할인/이벤트 등 문구가 있으면서, 설정 마진율 조건을 넘는 상품만 걸러줍니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onTogglePromo}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold text-white transition-colors ${
              promoFilterEnabled ? "bg-mx-primary hover:bg-[#1d4ed8]" : "bg-mx-danger hover:bg-[#e11d48]"
            }`}
          >
            {promoFilterEnabled ? "ON" : "OFF"}
          </button>
        </div>
        {promoFilterEnabled && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-mx-danger">최소 마진율</span>
            <input type="number" value={minMarginPct} onChange={(e) => onMinMarginChange(e.target.value)} className="input-sm w-20 text-xs" />
            <span className="text-[11px] text-mx-danger">% 이상</span>
            <span className="ml-2 rounded-full bg-mx-danger/10 px-2.5 py-1 text-[11px] font-bold text-mx-danger">
              조건 만족 {promoMatchCount}건
            </span>
          </div>
        )}
      </div>
    </>
  );
}

interface ListProps {
  label: string;
  result: PlatformResult;
  promoFilterEnabled: boolean;
  promoFilteredKeys: Set<string>;
  minMarginPct: string;
  selectedTitle: string | null;
  selectedPlatform: Platform | null;
  savedKeys: Set<string>;
  savingKey: string | null;
  onSave: (product: NormalizedProduct) => void;
  onSelect: (product: NormalizedProduct) => void;
}

/** 한 채널의 검색결과 — 그 안에서 상품을 고르거나 관심상품으로 저장한다 */
export function PlatformResultList({ label, result, promoFilterEnabled, promoFilteredKeys, minMarginPct, selectedTitle, selectedPlatform, savedKeys, savingKey, onSave, onSelect }: ListProps) {
  return (
    <div className="space-y-3 rounded-2xl border-2 border-mx-border bg-mx-surface p-4">
      <p className="text-base font-extrabold text-mx-text">{label} 검색결과</p>
      {result.translatedKeyword && (
        <p className="text-xs text-mx-muted">
          알리익스프레스는 한글 검색어를 잘 인식하지 못해, 실제 검색어를{" "}
          <span className="font-semibold text-mx-muted">&quot;{result.translatedKeyword}&quot;</span>(영어)로
          자동 번역해서 검색했습니다.
        </p>
      )}
      {result.warning && <p className="text-xs text-mx-accent bg-mx-accent/10 rounded-lg px-3 py-2">⚠️ {result.warning}</p>}
      {result.error && <p className="text-sm text-mx-danger bg-mx-danger/10 rounded-lg px-3 py-2">{result.error}</p>}
      {!result.error && result.products.length === 0 && (
        <p className="text-sm text-mx-muted">검색된 상품이 없습니다. 다른 키워드로 시도해보세요.</p>
      )}
      {promoFilterEnabled && result.products.length > 0 && !result.products.some((prod) => promoFilteredKeys.has(`${prod.platform}:${prod.key}`)) && (
        <p className="text-sm text-mx-muted">조건(프로모션 문구 + 마진율 {minMarginPct}% 이상)을 만족하는 상품이 없습니다.</p>
      )}
      {result.products
        .filter((prod) => !promoFilterEnabled || promoFilteredKeys.has(`${prod.platform}:${prod.key}`))
        .map((prod) => {
          const isSelected = selectedTitle === prod.title && selectedPlatform === prod.platform;
          const promoKeyword = matchedPromoKeyword(prod.title);
          const savedKey = `${prod.platform}:${prod.key}`;
          const isSaved = savedKeys.has(savedKey);
          const isSaving = savingKey === savedKey;
          return (
            <div
              key={prod.key}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 ${
                isSelected ? "border-mx-primary/40 bg-mx-primary/10" : "border-mx-border bg-mx-raised"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {prod.imageUrl && <img src={prod.imageUrl} alt={prod.title} className="h-14 w-14 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-mx-text">
                  {promoKeyword && (
                    <span className="mr-1 shrink-0 rounded-full bg-mx-danger/10 px-2 py-0.5 text-[10px] font-bold text-mx-danger">
                      🎯 {promoKeyword}
                    </span>
                  )}
                  {prod.title}
                </p>
                <p className="text-xs text-mx-muted">
                  {prod.priceKrw ? `${prod.priceKrw.toLocaleString()}원` : "가격 정보 없음"}
                  {prod.metaText && ` · ${prod.metaText}`}
                </p>
              </div>
              {prod.detailUrl && (
                <a
                  href={prod.detailUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-lg bg-[#047857] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#059669]"
                >
                  🔗 상품 링크
                </a>
              )}
              <button
                type="button"
                onClick={() => onSave(prod)}
                disabled={isSaved || isSaving}
                title="가격/품절 변화가 있을 때만 알림을 받습니다"
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-70 ${
                  isSaved ? "bg-mx-accent/10 text-mx-accent" : "bg-mx-surface text-mx-accent border border-mx-accent/30 hover:bg-mx-accent/20"
                }`}
              >
                {isSaving ? "저장 중..." : isSaved ? "⭐ 저장됨" : "⭐ 관심상품 저장"}
              </button>
              <button
                type="button"
                onClick={() => onSelect(prod)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${
                  isSelected ? "bg-mx-success/10 text-mx-success" : "bg-mx-primary text-white hover:bg-[#1d4ed8]"
                }`}
              >
                {isSelected ? "✅ 선택됨" : "상품 선택"}
              </button>
            </div>
          );
        })}
    </div>
  );
}
