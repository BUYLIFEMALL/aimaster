"use client";
// /batch 두 모드 전환 — 「🖼 사진 일괄 손질」(기존, 그대로) / 「🛍 상품 대표사진 합성」(메이커 P1·P2, 2026-11-13).
// 주소에 ?mode=product가 있으면(상세페이지에서 열린 경우 포함) 상품 합성으로 시작한다.
import { useEffect, useState } from "react";
import { BatchPhotoBoard } from "./BatchPhotoBoard";
import { ProductCompositeBoard } from "./ProductCompositeBoard";

export function BatchModes() {
  const [mode, setMode] = useState<"photo" | "product">("photo");
  useEffect(() => { if (new URLSearchParams(window.location.search).get("mode") === "product") setMode("product"); }, []);
  return (
    <>
      <div className="bp-seg c2" role="tablist" aria-label="일괄 작업 종류" style={{ maxWidth: 520, marginBottom: 12 }}>
        <button type="button" role="tab" aria-selected={mode === "photo"} className={mode === "photo" ? "on" : undefined} onClick={() => setMode("photo")}>🖼 사진 일괄 손질</button>
        <button type="button" role="tab" aria-selected={mode === "product"} className={mode === "product" ? "on" : undefined} onClick={() => setMode("product")}>🛍 상품 대표사진 합성</button>
      </div>
      {mode === "photo" ? <BatchPhotoBoard /> : <ProductCompositeBoard />}
    </>
  );
}
