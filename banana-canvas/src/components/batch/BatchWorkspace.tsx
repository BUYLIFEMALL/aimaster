"use client";

import { useState } from "react";
import { ProductBatchBoard } from "./ProductBatchBoard";
import { BatchPhotoBoard } from "./BatchPhotoBoard";
import { Sparkles, Image as ImageIcon, ShoppingBag } from "lucide-react";

export function BatchWorkspace() {
  const [activeTab, setActiveTab] = useState<"product" | "legacy">("product");

  return (
    <>
      <div className="page-heading" style={{ marginBottom: 20 }}>
        <div className="bp-tags" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <span className="fe-badge" style={{ background: "#FACC15", color: "#1C1917", fontWeight: 800 }}>
            🛒 이커머스 메이커 셀링 도우미 연계
          </span>
          <span className="fe-badge soft">0원 로컬 브라우저 초고속 연산</span>
          <span className="fe-badge leaf">촬영 정보·위치 정보 자동 제거</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#1C1917", letterSpacing: "-0.02em" }}>
              {activeTab === "product" ? "🛍️ 상품 대표사진 일괄 합성" : "🖼️ 일반 사진 일괄 손질"}
            </h1>
            <p className="bp-intro" style={{ marginTop: 6, fontSize: 13, color: "#78716C", maxWidth: 800 }}>
              {activeTab === "product" ? (
                <>
                  상품코드(SKU)별로 <strong>메인 컷과 서브 컷을 1:1 매칭</strong>하거나 <strong>공용 뱃지를 전체 상품에 일괄 합성</strong>합니다. 가공된 1000×1000 대표사진은 <strong>상세페이지 및 마켓 등록기로 즉시 반환</strong>할 수 있습니다.
                </>
              ) : (
                <>
                  상품 사진 여러 장의 <strong>세로 높이를 맞추고</strong>, <strong>로고·문자 워터마크</strong>를 같은 자리에 넣고, <strong>촬영 정보·위치 정보</strong>를 지워 한 번에 받습니다. 사진은 외부 서버로 전송되지 않습니다.
                </>
              )}
            </p>
          </div>

          {/* 작업 모드 전환 탭 */}
          <div
            style={{
              display: "flex",
              background: "#F3EFEA",
              padding: 4,
              borderRadius: 12,
              border: "1.5px solid #1C1917",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("product")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                border: "none",
                background: activeTab === "product" ? "#FACC15" : "transparent",
                color: "#1C1917",
                boxShadow: activeTab === "product" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <ShoppingBag size={15} />
              상품 대표사진 일괄 합성 (P1/P2)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("legacy")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                border: "none",
                background: activeTab === "legacy" ? "#FACC15" : "transparent",
                color: "#1C1917",
                boxShadow: activeTab === "legacy" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <ImageIcon size={15} />
              일반 사진 일괄 손질
            </button>
          </div>
        </div>
      </div>

      {activeTab === "product" ? <ProductBatchBoard /> : <BatchPhotoBoard />}
    </>
  );
}
