import { ClipStudio } from "@/components/clip/ClipStudio";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.27(V1) 긴 영상 → 쇼츠
export default function ClipPage() {
  return <ClipStudio />;
}
