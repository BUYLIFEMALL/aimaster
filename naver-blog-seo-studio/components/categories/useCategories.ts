"use client";

// 카테고리 목록을 한 곳에서 들고, 글 작성 탭·맛집 탭·보관함이 같은 목록을 보게 한다(서버 = 회원별 DB).
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_CATEGORIES, sanitizeCategories, type BlogCategory } from "@/lib/categories";

let cache: BlogCategory[] | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<(list: BlogCategory[]) => void>();

function publish(list: BlogCategory[]) {
  cache = list;
  listeners.forEach((fn) => fn(list));
}

async function loadFromServer() {
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        const data = (await res.json()) as { categories?: unknown };
        if (res.ok) {
          const list = sanitizeCategories(data.categories);
          publish(list.length ? list : DEFAULT_CATEGORIES);
        }
      } catch {
        /* 불러오지 못하면 기본 목록을 그대로 쓴다 */
      } finally {
        inflight = null;
      }
    })();
  }
  await inflight;
}

export function useCategories() {
  const [categories, setCategories] = useState<BlogCategory[]>(cache ?? DEFAULT_CATEGORIES);
  const [loaded, setLoaded] = useState(cache !== null);

  useEffect(() => {
    listeners.add(setCategories);
    if (cache === null) void loadFromServer().then(() => setLoaded(true));
    return () => {
      listeners.delete(setCategories);
    };
  }, []);

  /** 목록 전체를 저장한다. 실패하면 오류 문구를 돌려준다(성공은 null). */
  const saveCategories = useCallback(async (next: BlogCategory[]): Promise<string | null> => {
    const list = sanitizeCategories(next);
    if (list.length === 0) return "카테고리가 최소 1개는 있어야 합니다.";
    try {
      const res = await fetch("/api/categories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories: list }) });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) return data?.error || "카테고리를 저장하지 못했습니다.";
      publish(list);
      return null;
    } catch {
      return "카테고리를 저장하지 못했습니다. 네트워크를 확인해주세요.";
    }
  }, []);

  return { categories, loaded, saveCategories };
}
