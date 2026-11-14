import { BatchWorkspace } from "@/components/batch/BatchWorkspace";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata = {
  title: "상품 대표사진 일괄 합성 & 사진 일괄 손질 | AI 바나나 캔버스",
  description: "상품코드(SKU)별 메인·서브 사진 1:1 합성 및 1000x1000 규격화, 워터마크·높이 맞춤 브라우저 로컬 일괄 처리 도구",
};

export default function BatchPage() {
  return <BatchWorkspace />;
}
