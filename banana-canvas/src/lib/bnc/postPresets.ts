// 공용 기준 코드 「post-presets」(2026-10-22 등록) — 게시처 규격 이름·크기와 크기로 규격 고르기. 순수 코드(가져오는 파일 없음)
// 기준(여기만 고침): image-convert-studio/src/lib/imageTools/postPresets.ts → 사본: emotion-writer/src/lib/studio/postPresets.ts, four-cut-comics/src/lib/comic/postPresets.ts
// 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 규격 이름(id)은 변환 스튜디오 `?preset=` 값이라 바꾸면 보내는 쪽 링크도 같이 바뀐다.

export interface PostPreset { id: string; label: string; width: number; height: number }

export const POST_PRESETS: readonly PostPreset[] = [
  { id: "insta-feed", label: "인스타 피드 1:1", width: 1080, height: 1080 },
  { id: "insta-portrait", label: "인스타 세로 4:5", width: 1080, height: 1350 },
  { id: "story", label: "스토리·릴스 9:16", width: 1080, height: 1920 },
  { id: "youtube-thumb", label: "유튜브 썸네일 16:9", width: 1280, height: 720 },
  { id: "share-og", label: "블로그·카톡 공유 1200×630", width: 1200, height: 630 },
  { id: "store-product", label: "스마트스토어 상품 1:1", width: 1000, height: 1000 },
];

export function presetById(id: string | null | undefined): PostPreset | null {
  return POST_PRESETS.find((p) => p.id === id) ?? null;
}

/** 크기 비율이 아래 규격과 ±3% 안이면 그 규격 이름(「형식 바꾸기」 ?preset=), 아니면 빈 문자열 */
const MATCH_ORDER = ["insta-feed", "insta-portrait", "story", "youtube-thumb"] as const;
export function presetIdForSize(width?: number, height?: number): string {
  if (!width || !height) return "";
  const r = width / height;
  for (const id of MATCH_ORDER) {
    const p = presetById(id)!;
    const v = p.width / p.height;
    if (Math.abs(r - v) / v < 0.03) return id;
  }
  return "";
}
