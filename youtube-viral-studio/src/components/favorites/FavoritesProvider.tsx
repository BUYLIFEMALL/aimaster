'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FAVORITE_TTL_MS, isFreshFavorite, type FavoriteKind, type FavoriteRecord } from '@/lib/favorites';
import type { YouTubeVideoItem, YouTubeChannelItem } from '@/lib/youtube/types';

type Store = { userId: string; records: FavoriteRecord[]; loading: boolean; error: string | null; pending: Set<string>; reload: () => Promise<void>; has: (type: FavoriteKind, id: string) => boolean; toggle: (type: FavoriteKind, item: YouTubeVideoItem | YouTubeChannelItem) => Promise<void> };
const Context = createContext<Store | null>(null);
export const useFavorites = () => useContext(Context);

export function FavoritesProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [records,setRecords] = useState<FavoriteRecord[]>([]), [loading,setLoading] = useState(true), [error,setError] = useState<string | null>(null), [pending,setPending] = useState<Set<string>>(new Set());
  const [clockOffset,setClockOffset] = useState(0);
  const active = useRef(true), locked = useRef(new Set<string>()), serial = useRef(0);
  const reload = useCallback(async () => {
    const ticket = ++serial.current;
    try {
      const res = await fetch('/api/favorites', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || '보관함을 불러오지 못했습니다.');
      if (active.current && ticket === serial.current) { const serverTime = Date.parse(data.serverNow); const offset = Number.isFinite(serverTime) ? serverTime - Date.now() : 0; setClockOffset(offset); setRecords((data.favorites as FavoriteRecord[]).filter(r => isFreshFavorite(r,Date.now()+offset))); setError(null); }
    } catch(e) { if(active.current && ticket === serial.current) setError(e instanceof Error ? e.message : '보관함 조회 실패'); }
    finally { if(active.current && ticket === serial.current) setLoading(false); }
  },[]);
  useEffect(() => { active.current = true; void reload(); const refresh = () => { if(document.visibilityState === 'visible') void reload(); }; document.addEventListener('visibilitychange',refresh); return () => { active.current = false; ++serial.current; document.removeEventListener('visibilitychange',refresh); }; },[userId,reload]);
  useEffect(() => {
    if (!records.length) return;
    const next = Math.min(...records.map(r => Date.parse(r.created_at) + FAVORITE_TTL_MS));
    const timer = setTimeout(() => setRecords(rows => rows.filter(r => isFreshFavorite(r,Date.now()+clockOffset))), Math.max(1, Math.min(next - Date.now() - clockOffset + 1, 2147483647)));
    return () => clearTimeout(timer);
  },[records,clockOffset]);
  const toggle = useCallback(async(type: FavoriteKind, item: YouTubeVideoItem | YouTubeChannelItem) => {
    const key = type + ':' + item.id;
    if(loading || error || locked.current.has(key)) return;
    locked.current.add(key); setPending(new Set(locked.current));
    try {
      const saved = records.some(r => r.item_type === type && r.item_id === item.id && isFreshFavorite(r,Date.now()+clockOffset));
      const res = await fetch('/api/favorites', { method: saved ? 'DELETE' : 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(saved ? { type, id:item.id } : { type, item }) });
      const data = await res.json(); if(!res.ok) throw Error(data.error || '보관함 변경 실패');
      await reload();
    } catch(e) { if(active.current) setError(e instanceof Error ? e.message : '보관함 변경 실패'); }
    finally { locked.current.delete(key); if(active.current) setPending(new Set(locked.current)); }
  },[records,loading,error,reload,clockOffset]);
  const store = useMemo(() => ({ userId,records,loading,error,pending,reload,toggle,has:(type:FavoriteKind,id:string) => records.some(r=>r.item_type===type&&r.item_id===id&&isFreshFavorite(r,Date.now()+clockOffset)) }),[userId,records,loading,error,pending,reload,toggle,clockOffset]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}

export function FavoritesNotice() {
  const store = useFavorites();
  return store?.error ? <div role="alert" className="mb-4 rounded-xl border border-yt-red/40 bg-yt-surface p-3 text-sm text-yt-danger">{store.error} <button className="underline" onClick={()=>void store.reload()}>보관함 다시 불러오기</button></div> : null;
}
