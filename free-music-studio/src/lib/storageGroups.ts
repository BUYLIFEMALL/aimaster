// 「모델 저장 공간」 표를 묶음으로 나눠 보이기(2026-11-07 주인님 「음악용 모델과 이미지 모델을 그룹으로 구분해서 보여줘」).
// 엔진이 보내는 항목 번호(engine/src/storage.mjs·main.mjs의 id)만 보고 나눈다 — 엔진은 고치지 않는다.

export type StorageGroup = "music" | "tools" | "image" | "cache";

export const STORAGE_GROUPS: { key: StorageGroup; title: string; desc: string }[] = [
  { key: "music", title: "🎵 음악 모델", desc: "노래·연주곡을 만드는 엔진과 모델" },
  { key: "tools", title: "🎛 음악 편집 도구", desc: "Stem 분리·가사 자동 맞추기" },
  { key: "image", title: "🖼 그림 모델", desc: "내 PC 앨범 그림 — 그림 모델 폴더에 따로 있습니다" },
  { key: "cache", title: "📦 설치·보관 파일", desc: "지워도 다음에 필요할 때 다시 만들어집니다" },
];

const TOOL_IDS = new Set(["py:stems-cuda", "py:stems-cpu", "py:stems-models", "py:lyrics-cuda", "py:lyrics-cpu", "py:lyrics-models", "py:vocal-cache"]);
const CACHE_IDS = new Set(["uv-cache", "uv-cache-old", "mp3-cache"]);

/** 항목 번호 → 묶음. 모르는 새 항목은 음악 모델로(이 프로그램의 기본) */
export function storageGroupOf(id: string): StorageGroup {
  if (id === "py:image-sdcpp" || id.startsWith("py:image-")) return "image";
  if (TOOL_IDS.has(id)) return "tools";
  if (CACHE_IDS.has(id)) return "cache";
  return "music";
}

/** 묶음 순서대로, 묶음 안은 큰 것부터. 빈 묶음은 뺀다 */
export function groupStorageItems<T extends { id: string; bytes: number }>(items: T[]) {
  return STORAGE_GROUPS.map((g) => {
    const list = items.filter((it) => storageGroupOf(it.id) === g.key).sort((a, b) => b.bytes - a.bytes);
    return { ...g, items: list, bytes: list.reduce((n, it) => n + it.bytes, 0) };
  }).filter((g) => g.items.length > 0);
}
