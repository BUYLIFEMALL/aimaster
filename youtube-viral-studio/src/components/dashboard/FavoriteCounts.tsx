"use client";
import { useFavorites } from '@/components/favorites/FavoritesProvider';
export function FavoriteCounts() {
  const store = useFavorites();
  if (!store || store.loading) return <span>불러오는 중…</span>;
  if (store.error) return <span>조회 실패</span>;
  return <span className="tabular-nums">영상 {store.records.filter(r=>r.item_type==='video').length} · 채널 {store.records.filter(r=>r.item_type==='channel').length}</span>;
}
