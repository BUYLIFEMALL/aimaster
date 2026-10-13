"use client";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { DEFAULT_SETTINGS, type ClothingItem, type ImageState, type UserSettings } from "./types";

export interface SavedLook { id: string; createdAt: number; image: ImageState }

interface LookDB extends DBSchema {
  wardrobe: { key: string; value: ClothingItem & { addedAt: number } };
  looks: { key: string; value: SavedLook };
  settings: { key: string; value: UserSettings };
}
export type LookStore = IDBPDatabase<LookDB>;

export const MAX_WARDROBE = 80;
export const MAX_LOOKS = 12;

/** 회원별로 분리된 브라우저 저장소(사진·옷장·룩은 서버로 보내지 않는다) */
export function openStore(userId: string): Promise<LookStore> {
  return openDB<LookDB>(`ai-fashion-style-${userId}`, 1, {
    upgrade(db) {
      db.createObjectStore("wardrobe", { keyPath: "id" });
      db.createObjectStore("looks", { keyPath: "id" });
      db.createObjectStore("settings");
    },
  });
}

export async function loadWardrobe(db: LookStore): Promise<ClothingItem[]> {
  const rows = await db.getAll("wardrobe");
  return rows.sort((a, b) => a.addedAt - b.addedAt).map(({ addedAt: _a, ...item }) => { void _a; return item; });
}

export async function saveWardrobeItem(db: LookStore, item: ClothingItem): Promise<void> {
  await db.put("wardrobe", { ...item, addedAt: Date.now() });
}

export async function deleteWardrobeItem(db: LookStore, id: string): Promise<void> {
  await db.delete("wardrobe", id);
}

export async function loadLooks(db: LookStore): Promise<SavedLook[]> {
  return (await db.getAll("looks")).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveLook(db: LookStore, look: SavedLook): Promise<void> {
  await db.put("looks", look);
  const all = await loadLooks(db);
  for (const old of all.slice(MAX_LOOKS)) await db.delete("looks", old.id);
}

export async function deleteLook(db: LookStore, id: string): Promise<void> {
  await db.delete("looks", id);
}

export function sanitizeSettings(raw: unknown): UserSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<UserSettings>;
  const d = DEFAULT_SETTINGS;
  return {
    lang: r.lang === "en" ? "en" : d.lang,
    model: r.model === "pro" ? "pro" : d.model,
    editMode: r.editMode === "replace" ? "replace" : d.editMode,
    background: r.background === "match" ? "match" : d.background,
    consent: !!r.consent,
  };
}

export async function loadSettings(db: LookStore): Promise<UserSettings> {
  return sanitizeSettings(await db.get("settings", "main"));
}

export async function saveSettings(db: LookStore, s: UserSettings): Promise<void> {
  await db.put("settings", s, "main");
}
