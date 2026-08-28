"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EnrichmentFields } from "./EnrichmentFields";
import { registerAliexpressProductAction, type RegisterProductState } from "@/lib/actions/products";
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
  const [state, formAction, isPending] = useActionState(registerAliexpressProductAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {mode === "analyze" && <EnrichmentFields detailPages={detailPages} />}

      {mode !== "analyze" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">상품명</label>
          <Input name="productName" placeholder="상품명을 입력하세요" required />
        </div>
      )}
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
  );
}
