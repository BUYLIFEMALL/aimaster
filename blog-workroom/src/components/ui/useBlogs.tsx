"use client";
import { useCallback, useEffect, useState } from "react";
import { listItems, type Item } from "./api";
import type { BlogData } from "@/lib/types";

const KEY = "blog-workroom.blog";

/** 등록 블로그 목록 + 현재 선택(다른 화면에서도 같은 블로그를 기본으로 쓴다) */
export function useBlogs() {
  const [blogs, setBlogs] = useState<Item<BlogData>[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      const list = await listItems<BlogData>("blog");
      setBlogs(list);
      setSelectedId((cur) => {
        const saved = cur ?? (typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null);
        return list.find((b) => b.id === saved)?.id ?? list[0]?.id ?? null;
      });
    } catch (e) { setError(e instanceof Error ? e.message : "블로그 목록을 불러오지 못했습니다."); setBlogs([]); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const select = (id: string | null) => { setSelectedId(id); if (id) window.localStorage.setItem(KEY, id); };
  const selected = blogs?.find((b) => b.id === selectedId) ?? null;
  const replace = (item: Item<BlogData>) => setBlogs((p) => (p ? (p.some((b) => b.id === item.id) ? p.map((b) => (b.id === item.id ? item : b)) : [item, ...p]) : [item]));
  return { blogs, selected, select, reload, replace, error };
}

export function BlogPicker({ blogs, selected, onSelect }: { blogs: Item<BlogData>[] | null; selected: Item<BlogData> | null; onSelect: (id: string) => void }) {
  if (blogs === null) return <p className="muted">불러오는 중…</p>;
  if (!blogs.length) return <div className="notice warning">등록된 블로그가 없습니다. <a href="/style" style={{ textDecoration: "underline" }}>① 내 블로그 스타일</a>에서 블로그를 먼저 등록하면 내 문체·주제에 맞춰 진행됩니다.</div>;
  return (
    <label>기준 블로그
      <select value={selected?.id ?? ""} onChange={(e) => onSelect(e.target.value)}>
        {blogs.map((b) => <option key={b.id} value={b.id}>{b.data.name}{b.data.approved ? " · 스타일 승인됨" : b.data.style ? " · 승인 대기" : " · 분석 전"}</option>)}
      </select>
    </label>
  );
}
