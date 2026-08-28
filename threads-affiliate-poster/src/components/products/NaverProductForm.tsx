"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EnrichmentFields } from "./EnrichmentFields";
import { registerNaverProductAction, type RegisterProductState } from "@/lib/actions/products";
import type { DetailPageSummary } from "@/lib/detailPages";
import type { RegistrationMode } from "./PlatformTabs";

const initialState: RegisterProductState = {};

export function NaverProductForm({
  detailPages,
  mode,
}: {
  detailPages: DetailPageSummary[];
  mode: RegistrationMode;
}) {
  const [analyzeProductName, setAnalyzeProductName] = useState("");
  const [state, formAction, isPending] = useActionState(registerNaverProductAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-xs text-neutral-500">
        네이버 브랜드커넥트는 공식 API가 없어, 브랜드커넥트 사이트에서 직접 발급받은 링크를
        붙여넣어야 합니다.
      </p>

      {mode === "analyze" ? (
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
          />
        </>
      ) : (
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">상품명</label>
          <Input name="productName" placeholder="상품명을 입력하세요" required />
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          네이버 브랜드커넥트 링크
        </label>
        <Input name="affiliateUrl" type="url" placeholder="https://..." required />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "등록 중..." : "이 링크로 등록"}
      </Button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="text-xs text-green-600">등록되었습니다.</p>}
    </form>
  );
}
