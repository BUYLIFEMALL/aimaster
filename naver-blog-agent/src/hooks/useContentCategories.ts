"use client";

import { useCallback, useEffect, useState } from "react";
import type { CollectorCategory } from "@/types/collector";
import { CONTENT_CATEGORIES_KEY, CONTENT_CATEGORIES_EVENT, readContentCategories, writeContentCategories } from "@/lib/contentCategories";

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
    refresh();
    window.addEventListener(CONTENT_CATEGORIES_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(CONTENT_CATEGORIES_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const saveCategories = useCallback((updated: CollectorCategory[]) => {
    try {
      writeContentCategories(window.localStorage, updated);
      window.dispatchEvent(new Event(CONTENT_CATEGORIES_EVENT));
      return true;
    } catch (error) {
      console.error("Failed to save content categories:", error);
      return false;
    }
  }, []);

  return { categories, loaded, saveCategories };
}
