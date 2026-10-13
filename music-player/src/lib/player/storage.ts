"use client";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { DEFAULT_SETTINGS, type PlayerSettings, type TrackMeta } from "./types";
import { normalizeGains } from "./eq";

interface BlobRecord { id: string; blob: Blob; cover: Blob | null }

interface PlayerDB extends DBSchema {
  tracks: { key: string; value: TrackMeta };
  blobs: { key: string; value: BlobRecord };
  settings: { key: string; value: PlayerSettings };
}

export type PlayerStore = IDBPDatabase<PlayerDB>;

/** 회원별로 데이터베이스를 분리한다(같은 브라우저를 여러 회원이 써도 섞이지 않음) */
export async function openStore(userId: string): Promise<PlayerStore> {
  return openDB<PlayerDB>(`music-player-${userId}`, 1, {
    upgrade(db) {
      db.createObjectStore("tracks", { keyPath: "id" });
      db.createObjectStore("blobs", { keyPath: "id" });
      db.createObjectStore("settings");
    },
  });
}

export async function listTracks(db: PlayerStore): Promise<TrackMeta[]> {
  const rows = await db.getAll("tracks");
  return rows.sort((a, b) => a.addedAt - b.addedAt);
}

export async function putTrack(db: PlayerStore, meta: TrackMeta, blob: Blob, cover: Blob | null): Promise<void> {
  const tx = db.transaction(["tracks", "blobs"], "readwrite");
  await tx.objectStore("blobs").put({ id: meta.id, blob, cover });
  await tx.objectStore("tracks").put(meta);
  await tx.done;
}

export async function getBlob(db: PlayerStore, id: string): Promise<Blob | null> {
  return (await db.get("blobs", id))?.blob ?? null;
}

export async function getCover(db: PlayerStore, id: string): Promise<Blob | null> {
  return (await db.get("blobs", id))?.cover ?? null;
}

export async function deleteTracks(db: PlayerStore, ids: string[]): Promise<void> {
  const tx = db.transaction(["tracks", "blobs"], "readwrite");
  for (const id of ids) {
    await tx.objectStore("tracks").delete(id);
    await tx.objectStore("blobs").delete(id);
  }
  await tx.done;
}

export async function clearAll(db: PlayerStore): Promise<void> {
  const tx = db.transaction(["tracks", "blobs"], "readwrite");
  await tx.objectStore("tracks").clear();
  await tx.objectStore("blobs").clear();
  await tx.done;
}

/** 저장된 설정을 읽는다. 값이 깨졌거나 없으면 기본값으로 채운다 */
export function sanitizeSettings(raw: unknown): PlayerSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<PlayerSettings>;
  const d = DEFAULT_SETTINGS;
  const num = (v: unknown, lo: number, hi: number, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
  };
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);
  return {
    volume: num(r.volume, 0, 1, d.volume),
    muted: !!r.muted,
    repeat: oneOf(r.repeat, ["none", "one", "all"] as const, d.repeat),
    shuffle: !!r.shuffle,
    rate: num(r.rate, 0.5, 2, d.rate),
    eqGains: normalizeGains(r.eqGains),
    preamp: num(r.preamp, -12, 12, 0),
    visualizerMode: oneOf(r.visualizerMode, ["bars", "wave", "line", "circle", "dots"] as const, d.visualizerMode),
    showVisualizer: r.showVisualizer === undefined ? d.showVisualizer : !!r.showVisualizer,
    sortKey: oneOf(r.sortKey, ["name", "artist", "duration", "added"] as const, d.sortKey),
    sortDir: oneOf(r.sortDir, ["asc", "desc"] as const, d.sortDir),
    currentId: typeof r.currentId === "string" ? r.currentId : null,
    customPresets: Array.isArray(r.customPresets)
      ? r.customPresets
          .filter((p) => p && typeof p.name === "string")
          .slice(0, 12)
          .map((p) => ({ name: String(p.name).slice(0, 20), gains: normalizeGains(p.gains) }))
      : [],
  };
}

export async function loadSettings(db: PlayerStore): Promise<PlayerSettings> {
  return sanitizeSettings(await db.get("settings", "main"));
}

export async function saveSettings(db: PlayerStore, s: PlayerSettings): Promise<void> {
  await db.put("settings", s, "main");
}

export async function estimateUsage(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    if (e && typeof e.usage === "number" && typeof e.quota === "number") return { usage: e.usage, quota: e.quota };
  } catch {
    /* 지원하지 않는 브라우저 */
  }
  return null;
}
