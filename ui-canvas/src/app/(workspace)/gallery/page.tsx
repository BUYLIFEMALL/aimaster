import "./gallery.css";
import { requireProgramAccess } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { GalleryView } from "@/components/gallery/GalleryView";

// 「🧩 컴포넌트 갤러리」(2026-10-21 병합 D — 옛 AI 웹 UI 제작 자동화 화면을 옮김)
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireProgramAccess();
  const [{ tab }, apiKey] = await Promise.all([searchParams, getUserGeminiApiKey(user.id)]);
  return <GalleryView initialTab={tab} hasApiKey={!!apiKey} />;
}
