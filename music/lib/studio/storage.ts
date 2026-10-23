import { EMPTY_DRAFT, type Store } from "./config";
import { validateStore } from "./validation";
export function storageKey(userId: string) {
  if (!userId) throw new Error("회원 확인이 필요합니다.");
  return `aimaster:suno-music-studio:v1:${userId}`;
}
export function blankStore(): Store {
  return {
    schema: 1,
    draft: structuredClone(EMPTY_DRAFT),
    saved: [],
    styles: [],
  };
}
export function mergeBackup(current: Store, incoming: unknown): Store {
  const safe = validateStore(incoming);
  const existing = new Set(current.saved.map((i) => i.id));
  const saved = [
    ...current.saved,
    ...safe.saved.filter((i) => !existing.has(i.id)),
  ];
  if (saved.length > 100)
    throw new Error("보관함은 100개까지입니다. 먼저 JSON으로 백업해 주세요.");
  const styleIds = new Set(current.styles.map((s) => s.id));
  const styles = [
    ...current.styles,
    ...safe.styles.filter((s) => !styleIds.has(s.id)),
  ];
  if (styles.length > 100)
    throw new Error(
      "내 Style은 100개까지입니다. 기존 자료를 JSON으로 백업해 주세요.",
    );
  return { schema: 1, draft: safe.draft, saved, styles };
}
export function missingTracks<T extends { lyrics: string }>(tracks: T[]) {
  return tracks.filter((t) => !t.lyrics.trim());
}
