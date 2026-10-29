"use client";

import { useState, useTransition } from "react";
import { checkCategoryAction, type CategoryCheckResult } from "@/lib/actions/wing";

/** 상품명 → 쿠팡 카테고리 추천 → 그 카테고리의 필수 항목(메타)을 읽어 보여 준다. 쿠팡에 아무것도 만들지 않는다. */
export function CategoryCheck({ saved }: { saved: boolean }) {
  const [name, setName] = useState("");
  const [result, setResult] = useState<CategoryCheckResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 남성 노트북 백팩 15.6인치 방수"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button type="button" disabled={!saved || pending || !name.trim()} onClick={() => start(async () => setResult(await checkCategoryAction(name)))}
          className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50">
          {pending ? "쿠팡에 묻는 중…" : "🗂 카테고리 확인"}
        </button>
      </div>

      {result && !result.ok && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-900">❌ {result.error}</div>}
      {result?.ok && (
        <div className="space-y-2 rounded-xl border border-teal-200 bg-teal-50 p-3.5 text-[13px] text-teal-900">
          {result.predict.ok ? (
            <p className="font-bold">✅ 추천 카테고리: {result.predict.name} <span className="font-mono text-xs">#{result.predict.code}</span></p>
          ) : (
            <p className="font-bold">⚠ 추천을 받지 못했습니다({result.predict.reason}) {result.predict.comment}</p>
          )}
          {result.metaError && <p className="text-rose-800">메타 조회 실패: {result.metaError}</p>}
          {result.meta && (
            <>
              <p>
                옵션 없는 단일 상품 {result.meta.singleAllowed ? "가능" : "불가"} · 속성 {result.meta.attributes.length}개(필수 {result.meta.attributes.filter((a) => a.required).length}) ·
                고시 상품군 {result.meta.notices.length}개 · 구비서류 {result.meta.documents.length}개 · 인증 {result.meta.certifications.length}개
              </p>
              {result.meta.attributes.filter((a) => a.required).length > 0 && (
                <p className="text-xs">필수 속성: {result.meta.attributes.filter((a) => a.required).map((a) => `${a.name}${a.purchase ? "(구매옵션)" : ""}${a.basicUnit ? `[${a.basicUnit}]` : ""}`).join(", ")}</p>
              )}
              <p className="text-xs">고시 상품군: {result.meta.notices.map((n) => n.category).join(", ") || "없음"}</p>
              <p className="text-[11px] text-slate-600">응답 속성 칸 이름(값 목록 확인용): {result.rawAttrKeys.join(", ") || "속성 없음"}</p>
              {result.rawSample && <pre className="whitespace-pre-wrap break-all rounded bg-white/70 p-2 text-[11px] text-slate-700">{result.rawSample}</pre>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
