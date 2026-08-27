"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/Textarea";
import type { DetailPageSummary } from "@/lib/detailPages";

interface EnrichmentFieldsProps {
  detailPages: DetailPageSummary[];
  onDetailPageSelect?: (page: DetailPageSummary | null) => void;
}

// 상품 등록 폼(쿠팡/알리익스프레스/네이버 공통) 안에 이어붙여서 쓰는 "상품정보 직접
// 입력(선택)" 섹션. 여기 값이 하나라도 채워지면 서버 액션에서 input_mode가 자동으로
// "manual"이 되어, 캡션 생성 시 이 내용까지 AI 프롬프트에 반영된다. 비워두면 URL/링크
// 기반 최소 정보(input_mode="url")만 쓰인다 — 두 방식은 어느 쪽을 골라도 제휴 링크
// 등록 절차 자체와는 무관한 별개의 축이다.
export function EnrichmentFields({ detailPages, onDetailPageSelect }: EnrichmentFieldsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
      >
        {open ? "▾" : "▸"} 상품정보 직접 입력 (선택 — 캡션 품질을 높이고 싶을 때)
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {detailPages.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">
                기존 상세페이지에서 가져오기 (선택)
              </label>
              <select
                name="detailPageId"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700"
                onChange={(e) => {
                  const page = detailPages.find((p) => p.id === e.target.value) ?? null;
                  onDetailPageSelect?.(page);
                }}
                defaultValue=""
              >
                <option value="">선택 안 함</option>
                {detailPages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.product_name} ({page.template})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-neutral-400">
                &quot;상세페이지 자동화(15P)&quot;로 만든 페이지의 내용을 캡션 생성 참고자료로
                가져옵니다.
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">상품 설명 (선택)</label>
            <Textarea name="description" rows={3} placeholder="상품의 특징이나 장점을 자유롭게 적어주세요." />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              핵심 셀링포인트 (선택, 한 줄에 하나씩)
            </label>
            <Textarea
              name="keySellingPoints"
              rows={3}
              placeholder={"예: 24시간 로켓배송\n1+1 한정 특가\n누적 판매 10만개"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
