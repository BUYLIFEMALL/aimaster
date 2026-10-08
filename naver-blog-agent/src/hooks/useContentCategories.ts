"use client";

import { useCallback, useEffect, useState } from "react";
import type { CollectorCategory } from "@/types/collector";
import { CONTENT_CATEGORIES_KEY, CONTENT_CATEGORIES_EVENT, readContentCategories, writeContentCategories } from "@/lib/contentCategories";
import { SYNC_DONE_PREFIX, mergeCategories, pullCategories, pushCategories } from "@/lib/serverSync";

const DONE_KEY = SYNC_DONE_PREFIX + "categories";

// 서버(회원별 DB)가 기준, 브라우저 저장소는 캐시. 이 브라우저에서 처음 연결할 때만 로컬 분류를 서버에 합쳐 올린다.
async function syncWithServer(cancelled: () => boolean) {
  const server = await pullCategories();
  if (server === null || cancelled()) return;
  const storage = window.localStorage;
  let raw: string | null = null;
  let done = false;
  try {
    raw = storage.getItem(CONTENT_CATEGORIES_KEY);
    done = storage.getItem(DONE_KEY) === "1";
  } catch {}
  const local = raw !== null ? readContentCategories(storage) : [];

  if (server.length === 0) {
    // 서버에 아직 없음: 이 브라우저에 직접 저장한 분류가 있으면 한 번 올린다(없으면 기본 분류 그대로).
    if (!done && raw !== null && !(await pushCategories(local))) return;
  } else {
    const next = mergeCategories(server, local, !done);
    if (!done && next.length > server.length && !(await pushCategories(next))) return;
    if (cancelled()) return;
    writeContentCategories(storage, next);
    window.dispatchEvent(new Event(CONTENT_CATEGORIES_EVENT));
  }
  try {
    storage.setItem(DONE_KEY, "1");
  } catch {}
}

export function useContentCategories() {
  const [categories, setCategories] = useState<CollectorCategory[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setCategories(readContentCategories(window.localStorage));
      setLoaded(true);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === CONTENT_CATEGORIES_KEY || event.key === null) refresh();
    };
    let stopped = false;
    refresh();
    void syncWithServer(() => stopped).catch(() => {});
    window.addEventListener(CONTENT_CATEGORIES_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      stopped = true;
      window.removeEventListener(CONTENT_CATEGORIES_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const saveCategories = useCallback((updated: CollectorCategory[]) => {
    try {
      writeContentCategories(window.localStorage, updated);
      window.dispatchEvent(new Event(CONTENT_CATEGORIES_EVENT));
      void pushCategories(updated).catch(() => {});
      return true;
    } catch (error) {
      console.error("Failed to save content categories:", error);
      return false;
    }
  }, []);

  return { categories, loaded, saveCategories };
}
