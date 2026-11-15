import { requireProgramAccess } from "@/lib/access";
import ProductVideoStudio from "@/components/ProductVideoStudio";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.30 🛍 상품 사진 영상(메이커 v0.3.3 후속 M2) — 사진 → MP4·상세페이지 WebP, 브라우저 안에서만 처리
export default async function ProductVideoPage() {
  await requireProgramAccess();
  return <ProductVideoStudio />;
}
