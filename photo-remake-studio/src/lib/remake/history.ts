"use client";
import type { RemakeResult } from "./types";
export interface SavedResult { id: string; title: string; result: RemakeResult }
function open(userId: string): Promise<IDBDatabase> {
  if (!/^[a-f0-9-]{36}$/i.test(userId)) return Promise.reject(new Error("로그인 계정을 확인해 주세요."));
  return new Promise((resolve, reject) => { const r = indexedDB.open(`photo-remake-studio:${userId}`, 1); r.onupgradeneeded = () => r.result.createObjectStore("results", { keyPath: "id" }); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(new Error("브라우저 보관함을 열지 못했습니다.")); });
}
export async function listSaved(userId: string): Promise<SavedResult[]> {
  const db = await open(userId);
  return new Promise((resolve, reject) => { const t = db.transaction("results", "readonly"); const r = t.objectStore("results").getAll(); t.oncomplete = () => { db.close(); resolve((r.result as SavedResult[]).sort((a, b) => b.result.createdAt - a.result.createdAt)); }; t.onerror = t.onabort = () => { db.close(); reject(new Error("보관함을 읽지 못했습니다.")); }; });
}
export async function saveLocal(userId: string, item: SavedResult) {
  const db = await open(userId);
  return new Promise<void>((resolve, reject) => { const t = db.transaction("results", "readwrite"); const s = t.objectStore("results"); s.put(item); const all = s.getAll(); all.onsuccess = () => { const items = (all.result as SavedResult[]).sort((a, b) => b.result.createdAt - a.result.createdAt); for (const extra of items.slice(20)) s.delete(extra.id); }; t.oncomplete = () => { db.close(); resolve(); }; t.onerror = t.onabort = () => { db.close(); reject(new Error("저장 공간이 부족하거나 보관하지 못했습니다. 이미지를 먼저 다운로드해 주세요.")); }; });
}
export async function removeLocal(userId: string, id: string) {
  const db = await open(userId);
  return new Promise<void>((resolve, reject) => { const t = db.transaction("results", "readwrite"); t.objectStore("results").delete(id); t.oncomplete = () => { db.close(); resolve(); }; t.onerror = t.onabort = () => { db.close(); reject(new Error("보관한 작품을 삭제하지 못했습니다.")); }; });
}
