"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EnrichmentFields } from "./EnrichmentFields";
import {
  registerAliexpressProductAction,
  registerAliexpressManualLinkAction,
  type RegisterProductState,
} from "@/lib/actions/products";
import type { DetailPageSummary } from "@/lib/detailPages";
import type { RegistrationMode } from "./PlatformTabs";

const initialState: RegisterProductState = {};

export function AliexpressProductForm({
  detailPages,
  mode,
}: {
  detailPages: DetailPageSummary[];
  mode: RegistrationMode;
}) {
  const [analyzeProductName, setAnalyzeProductName] = useState("");
  const [state, formAction, isPending] = useActionState(registerAliexpressProductAction, initialState);
  const [manualName, setManualName] = useState("");
  const [manualState, manualFormAction, isManualPending] = useActionState(
    registerAliexpressManualLinkAction,
    initialState,
  );

  const nameField =
    mode === "analyze" ? (
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
    );

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        {nameField}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">알리익스프레스 상품 URL</label>
          <Input name="productUrl" type="url" placeholder="https://www.aliexpress.com/item/..." required />
          <p className="mt-1 text-[11px] text-neutral-400">
            붙여넣으면 알리익스프레스 Affiliate API로 제휴 링크가 자동 생성됩니다.
          </p>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "등록 중..." : "제휴 링크 자동 생성 후 등록"}
        </Button>
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        {state.success && <p className="text-xs text-green-600">등록되었습니다.</p>}
      </form>

      <form
        action={manualFormAction}
        className="space-y-2 rounded-lg border border-dashed border-neutral-300 p-3"
      >
        <p className="text-xs font-medium text-neutral-700">알리익스프레스 제휴 링크 직접 입력(API키 등록X)</p>
        <p className="text-xs text-neutral-500">
          알리익스프레스 어필리에이트 사이트에서 직접 발급받은 본인 제휴 링크를 붙여넣어주세요.
        </p>
        <Input
          name="productName"
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          placeholder="상품명"
          required
        />
        <Input name="affiliateUrl" type="url" placeholder="https://s.click.aliexpress.com/..." required />
        <Button type="submit" variant="muted" disabled={isManualPending}>
          {isManualPending ? "등록 중..." : "이 링크로 등록"}
        </Button>
        {manualState.error && <p className="text-xs text-red-600">{manualState.error}</p>}
        {manualState.success && <p className="text-xs text-green-600">등록되었습니다.</p>}
      </form>
    </div>
  );
}
