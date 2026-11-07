"use client";

// 앨범 목록(v1.35) — DB 기록 + 이 PC 엔진의 앨범 그림을 합쳐 읽고, 작은 그림 주소를 만든다(다 쓰면 놓아 줌).
import { useCallback, useEffect, useRef, useState } from "react";
import { useEngine } from "@/components/engine/useEngine";
import { fetchAlbumImage, hasAlbums, listAlbumImages } from "@/lib/engine";
import { mergeAlbums, type Album } from "@/lib/albums";

export type AlbumItem = ReturnType<typeof mergeAlbums>[number];

export function useAlbums() {
  const engine = useEngine(10000);
  const ok = engine.paired && hasAlbums(engine.status);
  const [rows, setRows] = useState<Album[]>([]);
  const [pcIds, setPcIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const urls = useRef<Record<string, string>>({});

  const reload = useCallback(async () => {
    setError("");
    const res = await fetch("/api/albums").catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) setRows(data?.albums ?? []);
    else setError(data?.error || "앨범 목록을 읽지 못했습니다.");
    if (ok) {
      const ids = await listAlbumImages().catch(() => null);
      setPcIds(ids);
      // 새로 생긴(또는 바뀐) 그림만 다시 받는다 — 바뀐 그림은 forget()으로 먼저 지운다
      for (const id of ids ?? []) {
        if (urls.current[id]) continue;
        const blob = await fetchAlbumImage(id).catch(() => null);
        if (blob) urls.current[id] = URL.createObjectURL(blob);
      }
      setThumbs({ ...urls.current });
    } else setPcIds(null);
    setLoading(false);
  }, [ok]);

  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(() => () => Object.values(urls.current).forEach((u) => URL.revokeObjectURL(u)), []);

  /** 그림을 바꾸거나 지운 앨범의 작은 그림을 버린다(다음 reload에서 다시 받음) */
  const forget = (id: string) => {
    if (urls.current[id]) URL.revokeObjectURL(urls.current[id]);
    delete urls.current[id];
  };

  return { engine, ok, albums: mergeAlbums(rows, pcIds), thumbs, loading, error, reload, forget };
}
