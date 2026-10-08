import { DEFAULT_COLLECTOR_CATEGORIES, type CollectorCategory } from "@/types/collector";

// User-created content classifications, NOT account-specific Naver blog menus.
export const CONTENT_CATEGORIES_KEY = "nba_collector_categories";
export const CONTENT_CATEGORIES_EVENT = "nba-content-categories-changed";

export function readContentCategories(storage: Pick<Storage, "getItem">): CollectorCategory[] {
  try {
    const raw = storage.getItem(CONTENT_CATEGORIES_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Preserve custom names, order and an intentionally empty list.
        return parsed.filter((item): item is CollectorCategory =>
          item !== null && typeof item === "object" &&
          typeof item.id === "string" && typeof item.name === "string" &&
          item.id.length > 0 && item.name.trim().length > 0
        );
      }
    }
  } catch {
    // Invalid/unavailable storage must not overwrite the existing saved value.
  }
  return DEFAULT_COLLECTOR_CATEGORIES.map((item) => ({ ...item }));
}

export function writeContentCategories(storage: Pick<Storage, "setItem">, categories: CollectorCategory[]) {
  storage.setItem(CONTENT_CATEGORIES_KEY, JSON.stringify(categories));
}
