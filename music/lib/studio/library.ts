import type { SavedItem, SavedStyle, Store } from "./config";

// 정밀 기획 스튜디오 보관함 서버 동기화 도우미(2026-10-21 병합 M1).
// 옛 앱은 Store 전체를 브라우저에만 저장했다. 여기서는 작성 중 초안(draft)만 브라우저에 두고,
// 보관함(saved)·내 Style(styles)은 서버 표(music_studio_projects·music_studio_styles)에 저장한다.
// 화면은 그대로 Store를 고치고, 바뀐 항목만 골라 서버에 올린다.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 서버 표의 id는 uuid라서, 옛 백업에서 들어온 uuid가 아닌 ID는 새로 바꾼다. */
export function ensureUuidIds(store: Store): Store {
  const fix = <T extends { id: string }>(items: T[]) =>
    items.some((i) => !UUID_RE.test(i.id))
      ? items.map((i) => (UUID_RE.test(i.id) ? i : { ...i, id: crypto.randomUUID() }))
      : items;
  const saved = fix(store.saved);
  const styles = fix(store.styles);
  return saved === store.saved && styles === store.styles ? store : { ...store, saved, styles };
}

export interface LibrarySnapshot {
  saved: Map<string, string>;
  styles: Map<string, string>;
}

export function snapshot(store: Pick<Store, "saved" | "styles">): LibrarySnapshot {
  return {
    saved: new Map(store.saved.map((i) => [i.id, JSON.stringify(i)])),
    styles: new Map(store.styles.map((s) => [s.id, JSON.stringify(s)])),
  };
}

export interface LibraryChanges {
  upsertSaved: SavedItem[];
  deleteSaved: string[];
  upsertStyles: SavedStyle[];
  deleteStyles: string[];
}

export function diffLibrary(prev: LibrarySnapshot, store: Pick<Store, "saved" | "styles">): LibraryChanges {
  const next = snapshot(store);
  return {
    upsertSaved: store.saved.filter((i) => prev.saved.get(i.id) !== next.saved.get(i.id)),
    deleteSaved: Array.from(prev.saved.keys()).filter((id) => !next.saved.has(id)),
    upsertStyles: store.styles.filter((s) => prev.styles.get(s.id) !== next.styles.get(s.id)),
    deleteStyles: Array.from(prev.styles.keys()).filter((id) => !next.styles.has(id)),
  };
}

export function hasChanges(c: LibraryChanges): boolean {
  return c.upsertSaved.length + c.deleteSaved.length + c.upsertStyles.length + c.deleteStyles.length > 0;
}

/** 요청 한 번의 크기를 서버 한도(LIBRARY_MAX_BYTES) 안으로 나눈다. 항목 하나는 검사 한도상 이보다 작다. */
export const LIBRARY_MAX_BYTES = 2_000_000;
export function chunkChanges(c: LibraryChanges, budget = LIBRARY_MAX_BYTES - 50_000): LibraryChanges[] {
  const out: LibraryChanges[] = [];
  let cur: LibraryChanges = { upsertSaved: [], deleteSaved: [...c.deleteSaved], upsertStyles: [...c.upsertStyles], deleteStyles: [...c.deleteStyles] };
  let size = JSON.stringify(cur).length;
  for (const item of c.upsertSaved) {
    const n = JSON.stringify(item).length + 1;
    if (size + n > budget && cur.upsertSaved.length) {
      out.push(cur);
      cur = { upsertSaved: [], deleteSaved: [], upsertStyles: [], deleteStyles: [] };
      size = JSON.stringify(cur).length;
    }
    cur.upsertSaved.push(item);
    size += n;
  }
  out.push(cur);
  return out;
}
