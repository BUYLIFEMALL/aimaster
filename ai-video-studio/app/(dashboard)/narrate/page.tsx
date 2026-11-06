import { NarrateStudio } from "@/components/clip/NarrateStudio";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// V2(2026-11-06) 해설 교차편집
export default function NarratePage() {
  return <NarrateStudio />;
}
