import { FreeToolsBoard } from "@/components/freeTools/FreeToolsBoard";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function FreeToolsPage() {
  return (
    <>
      <div className="page-heading">
        <div className="bp-tags">
          <span className="fe-badge">🛒 쇼핑몰 사진 준비</span>
          <span className="fe-badge leaf">브라우저에서 처리 · 0원</span>
        </div>
        <h1>🧰 무료 이미지 도구</h1>
        <p className="bp-intro">
          상품 사진의 <strong>배경을 지우고</strong>, 후기·택배 사진의 <strong>얼굴을 가리고</strong>, 긴 사진을 <strong>여러 조각으로 나눕니다</strong>. API 키 없이 내 PC 브라우저에서 처리하며 사진은 외부 서버로 전송되지 않습니다.
        </p>
      </div>
      <FreeToolsBoard />
    </>
  );
}
