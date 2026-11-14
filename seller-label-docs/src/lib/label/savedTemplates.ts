// 「💾 내 라벨 틀」 — 이름 붙여 저장한 라벨 설정 목록(순수 함수). 저장 위치는 이 PC 브라우저(localStorage)뿐이다.
import type { LabelSheet } from "./layout";
import type { LabelTemplate } from "./template";

export const SAVED_LIMIT = 20;
export const NAME_MAX = 30;

export interface SavedLabel {
  name: string;
  savedAt: string;
  sheetId: string;
  custom: LabelSheet;
  template: LabelTemplate;
  dx: number;
  dy: number;
}

export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}

/** 같은 이름이면 덮어쓰고, 새로 저장한 것이 맨 위. 20개를 넘으면 오래된 것부터 뺀다. */
export function upsertSaved(list: SavedLabel[], entry: SavedLabel): SavedLabel[] {
  const name = cleanName(entry.name);
  if (!name) return list;
  return [{ ...entry, name }, ...list.filter((s) => s.name !== name)].slice(0, SAVED_LIMIT);
}

export function removeSaved(list: SavedLabel[], name: string): SavedLabel[] {
  return list.filter((s) => s.name !== name);
}

/** 브라우저 저장값이 망가졌거나 옛 모양이어도 화면이 깨지지 않게 걸러 낸다. */
export function sanitizeSavedList(raw: unknown): SavedLabel[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is SavedLabel => !!s && typeof s === "object" && typeof (s as SavedLabel).name === "string" && !!(s as SavedLabel).template && !!(s as SavedLabel).custom)
    .slice(0, SAVED_LIMIT);
}
