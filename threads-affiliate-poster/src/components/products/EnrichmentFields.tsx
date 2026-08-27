"use client";

import { useRef, useState, useTransition } from "react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { analyzeProductImagesAction } from "@/lib/actions/products";
import type { DetailPageSummary } from "@/lib/detailPages";

interface EnrichmentFieldsProps {
  detailPages: DetailPageSummary[];
  onDetailPageSelect?: (page: DetailPageSummary | null) => void;
}

// "상품 및 상세페이지 분석" 모드에서 쓰는 입력 섹션. 이 필드가 채워지면 서버 액션에서
// input_mode가 자동으로 "manual"이 되어, 캡션 생성 시 이 내용까지 AI 프롬프트에 반영된다.
// (2026-08-28 개편) 예전에는 "URL 입력" 폼 안에 접힌 상태로 숨어있는 선택 항목이었는데,
// 찾기 어렵다는 피드백을 받아 PlatformTabs의 최상단 모드 토글("🔗 링크로 등록" /
// "🔍 상품·상세페이지 분석으로 등록")로 분리했다 — 이 컴포넌트는 이제 "분석" 모드를
// 선택했을 때만 렌더링되고, 접혀있지 않고 항상 펼쳐진 상태로 보인다.
//
// "상품/상세페이지 이미지로 소구점 자동 분석" — auto-detail-page(상세페이지 자동화)가
// 업로드된 이미지를 보고 콘텐츠를 만드는 방식을 참고해서 추가한 기능이다. 이미지 파일을
// 선택하고 분석 버튼을 누르면, 이 필드가 속한 <form>의 현재 상품명까지 함께 서버로 보내
// AI가 설명/핵심 셀링포인트를 제안해준다 — 결과는 자동 저장되지 않고 아래 입력칸에
// 채워지기만 하므로, 사용자가 검토·수정 후 등록 버튼을 눌러야 반영된다.
export function EnrichmentFields({ detailPages, onDetailPageSelect }: EnrichmentFieldsProps) {
  const [description, setDescription] = useState("");
  const [keySellingPoints, setKeySellingPoints] = useState("");
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isAnalyzing, startAnalyzing] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAnalyze() {
    setAnalyzeError(null);
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      setAnalyzeError("분석할 이미지를 1장 이상 선택해주세요.");
      return;
    }

    const form = containerRef.current?.closest("form");
    const productName = form ? String(new FormData(form).get("productName") ?? "") : "";

    const payload = new FormData();
    Array.from(files).forEach((file) => payload.append("images", file));
    payload.set("productName", productName);
    payload.set("existingDescription", description);

    startAnalyzing(async () => {
      const res = await analyzeProductImagesAction(payload);
      if (res.error || !res.result) {
        setAnalyzeError(res.error ?? "분석에 실패했습니다.");
        return;
      }
      setDescription(res.result.description);
      setKeySellingPoints(res.result.keySellingPoints.join("\n"));
    });
  }

  return (
    <div ref={containerRef} className="space-y-3 rounded-lg border border-neutral-300 bg-white p-4">
      <h3 className="text-sm font-semibold text-neutral-900">🔍 상품 및 상세페이지 분석</h3>
      <p className="text-xs text-neutral-500">
        이미지를 올리고 분석하거나, 아래에 직접 상품 설명을 입력해주세요. 여기 입력한 내용은
        게시글 캡션을 만들 때 AI가 참고합니다.
      </p>

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

      <div className="rounded-lg bg-neutral-50 p-3">
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          상품/상세페이지 이미지 업로드
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="block w-full text-xs text-neutral-600 file:mr-2 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
        />
        <div className="mt-2 flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? "분석 중..." : "🔍 이미지로 소구점 분석하기"}
          </Button>
          <p className="text-[11px] text-neutral-400">OpenAI 키 필요 · 결과는 검토 후 저장됩니다</p>
        </div>
        {analyzeError && <p className="mt-1 text-xs text-red-600">{analyzeError}</p>}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">상품 설명</label>
        <Textarea
          name="description"
          rows={3}
          placeholder="상품의 특징이나 장점을 자유롭게 적어주세요."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          핵심 셀링포인트 (한 줄에 하나씩)
        </label>
        <Textarea
          name="keySellingPoints"
          rows={3}
          placeholder={"예: 24시간 로켓배송\n1+1 한정 특가\n누적 판매 10만개"}
          value={keySellingPoints}
          onChange={(e) => setKeySellingPoints(e.target.value)}
        />
      </div>
    </div>
  );
}
